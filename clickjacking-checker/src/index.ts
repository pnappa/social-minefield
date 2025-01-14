import fetch, { AbortError, FetchError } from "node-fetch";
import type { Handler } from "aws-lambda";
import { parse as parseSuffix } from "tldts";

// I initially started this with output from ChatGPT, but it wasn't particularly
// good at very specific details about the CSP contexts.
// https://chat.openai.com/share/9b5600d9-69e1-4654-8475-f340179e6192
const timeoutSeconds = 25;

export const handler: Handler = async (
  event,
): Promise<{ statusCode: number; body: string }> => {
  const inputBody = event.body;
  let inputURL: string;
  try {
    inputURL = JSON.parse(inputBody).url;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid input" }),
    };
  }
  // Extract the URL from the event object, and check it's well formed.
  const userUrl = parseUserURL(inputURL);
  if (userUrl == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid URL." }),
    };
  }

  try {
    const response = await headRequest(userUrl);
    if (response === "timeout") {
      return {
        statusCode: 504,
        body: JSON.stringify({
          error: "Request timed out, please try again later",
        }),
      };
    } else if (response === "failed-to-fetch") {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to query provided website. Is the website valid?",
        }),
      };
    }
    const xFrameOptions = response.headers.get("x-frame-options");
    const contentSecurityPolicy = response.headers.get(
      "content-security-policy",
    );
    const vulnStatus = checkClickjackingVulnerability({
      url: `${userUrl.origin}${userUrl.path}`,
      xFrameOptions,
      contentSecurityPolicy,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ vulnStatus }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal error occurred" }),
    };
  }
};

function parseUserURL(inputURL: string) {
  // Ignore the port, and query strings etc. If people are gonna be making me
  // ping external systems, I'd rather not have data associated with it.
  try {
    const parsed = new URL(inputURL);
    return {
      origin: parsed.origin,
      path: parsed.pathname,
    };
  } catch (_) {
    void 0;
  }
  try {
    // Also attempt to do assuming they don't provide a protocol.
    const parsed = new URL(`https://${inputURL}`);
    return {
      origin: parsed.origin,
      path: parsed.pathname,
    };
  } catch (_) {
    return null;
  }
}

// Returns 'timeout' if the timeout threshold has been exceeded.
export async function headRequest(
  userURL: { origin: string; path: string },
  // Limit in milliseconds.
  limitMs?: number,
): Promise<
  | {
      statusCode: number;
      headers: Awaited<ReturnType<typeof fetch>>["headers"];
    }
  | "timeout"
  | "failed-to-fetch"
> {
  const controller = new AbortController();
  // Whilst the lambda will have a 30s timeout, we fail at 25 seconds here,
  // to make sure we'll more than likely be able to respond why we failed.
  // I wholly expect people will try to slow-loris us, but concurrent
  // execution and the captcha should deal with that.
  const timeout = setTimeout(
    () => {
      controller.abort();
    },
    limitMs ?? timeoutSeconds * 1000,
  );

  try {
    const res = await fetch(`${userURL.origin}${userURL.path}`, {
      method: "HEAD",
      headers: {
        // People getting abuse from us will be able to contact us.
        "User-Agent": "Social Minefield Clickjacking Checker",
      },
      signal: controller.signal,
    });

    return {
      statusCode: res.status,
      headers: res.headers,
    };
  } catch (e) {
    if (e instanceof AbortError) {
      return "timeout";
    }
    // Usually the website doesn't exist, or something else.
    if (e instanceof FetchError) {
      return "failed-to-fetch";
    }
    // TODO: Handle TypeError [ERR_INVALID_URL]: Invalid URL
    if (e instanceof TypeError) {
      console.log(e);
    }
    throw e;
  } finally {
    // Whilst we don't need to do this, we should because it means the process
    // can close as there's no pending promises (it makes tests finish faster).
    clearTimeout(timeout);
  }
}

type NonEmptyArray<T> = [T, ...T[]];
function isNonEmptyArray<T>(e: T[]): e is NonEmptyArray<(typeof e)[number]> {
  return e.length > 0;
}

// Null if not a scheme.
export const isPermissiveSchemeSource = (
  e: string,
): { isPermissive: true } | null => {
  // As per https://w3c.github.io/webappsec-csp/#grammardef-scheme-source and
  // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1 , these are
  // case-insenstive, but we'll convert to lowercase.
  const potentialSchemeSource = e.toLowerCase();

  // All valid schemes are considered too permissive. For example, `https:`
  // allows every single https site. Not good!
  if (/^[a-z][a-z0-9+\-.]*:$/.test(potentialSchemeSource)) {
    // Clickjacking only really applies to these schemes.
    if (
      potentialSchemeSource === "https:" ||
      potentialSchemeSource === "http:"
    ) {
      return { isPermissive: true };
    }
    // But for the rest, we still indicate that they're too permissive.
    // TODO: Should this be the case? I don't really have a horse in the race,
    //       but keeping this up to date with what schemes are supported and
    //       embeddable within a browser context, with implicit authorisation is
    //       not a tractable task for mere old Patrick. :)
    return { isPermissive: true };
  }
  return null;
};

// Null if not a scheme.
export const isPermissiveHostSource = (
  e: string,
): { isPermissive: boolean } | null => {
  // As per https://w3c.github.io/webappsec-csp/#grammardef-host-source
  // Whilst URLs are case-sensitive (at least the path component is), we're
  // not really caring about where the path is.
  const source = e.toLowerCase();

  // First, we parse the host source into constituent parts.
  // [ scheme-part "://" ] host-part [ ":" port-part ] [ path-part ]
  // Note that I've omitted ; and , from path-part, as CSP omits those.
  // https://w3c.github.io/webappsec-csp/#framework-directive-source-list
  const groups = source.match(
    /^(?<scheme>[a-z][a-z0-9+\-.]*:\/\/)?(?<host>\*|(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*[.]?)(?<port>:[0-9]+)?(?<path>\/[a-z0-9\-._~!$&'()*+=:@%/]*)?$/,
  )?.groups;

  // Not a valid host-source.
  if (!groups) return null;

  const isValidPath = (e: string): boolean => {
    try {
      const x = new URL(e, "https://example.com");
      void x;
      return true;
    } catch {
      return false;
    }
  };

  // Process the path more. We're lenient in the regex.
  // Path is easy to further validate, we lean on URL.
  if (groups.path != null && !isValidPath(groups.path)) {
    return null;
  }

  // I don't believe this is possible, but let's satisify Typescript.
  if (groups.host == null) {
    return null;
  }

  // Process the hostPart more. We're lenient in the regex.
  if (groups.host.length === 0) {
    // Shouldn't be possible to reach, but may as well.
    return null;
  }

  if (groups.host.length === 1) {
    // Check for valid wildcard.
    if (groups.host === "*") {
      // Everything wildcard is way too permissive.
      return { isPermissive: true };
    }

    // Otherwise, make sure it's not a dot.
    if (groups.host === ".") {
      return null;
    }

    return { isPermissive: false };
  }

  // groups.host.length >= 2
  // Things like "*example.com" are not valid.
  let host = groups.host;
  if (host[0] === "*" && host[1] !== ".") {
    return null;
  }

  if (host[0] === "*" && host[1] === ".") {
    // Omit the wild card, as we need to check that the host is valid, again
    // using the native URL parsing, so remove the part that isn't a valid
    // regular hostname.
    host = host.slice(2);
  }

  // We need to check what the OG host was. If it's not got a wildcard, it's
  // safe.
  if (groups.host.indexOf("*") === -1) {
    return { isPermissive: false };
  }

  // If there's a wildcard, and it's a public suffix, it's not safe.
  const parsed = parseSuffix(host);
  if (parsed.publicSuffix === host) {
    return { isPermissive: true };
  }

  // Otherwise, it's fine.
  return { isPermissive: false };
};

type SafeSourcesAllowedList = ({ sameorigin: true } | { source: string })[];
type DangerousSourcesAllowedList = { permissiveAddress: string }[];
// TODO: We should probably also return the detected xframeoptions and CSP? UX
//       for presenting what we found.
export function checkClickjackingVulnerability({
  url,
  xFrameOptions,
  contentSecurityPolicy,
}: {
  url: string;
  xFrameOptions: string | null | undefined;
  contentSecurityPolicy: string | null | undefined;
}):
  | { status: "unsafe"; missingPolicy: true; url: string; }
  | {
      status: "safe";
      safeSourcesAllowed: SafeSourcesAllowedList;
      // If it's not a well formed host, literal, or scheme, it gets ignored.
      // It's a good idea to indicate when this happens.
      ignoredSources: string[];
      missingPolicy: false;
      url: string;
    }
  | {
      status: "unsafe";
      dangerousSourcesAllowed: DangerousSourcesAllowedList;
      // Same as the safe's safeSourcesAllowed.
      safeSourcesAllowed: SafeSourcesAllowedList;
      ignoredSources: string[];
      missingPolicy: false;
      url: string;
    } {
  // Technically this function can report some false positives. If a user is
  // using multiple CSPs, as per:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#multiple_content_security_policies
  // The successive policies can make the conditions stricter, but the headers
  // dictionary I don't believe supports it.

  const cspDirectives = contentSecurityPolicy
    ?.toLowerCase()
    .split(";")
    .map(
      // Replace leading & trailing ASCII whitespace. .trim() is too lenient.
      // https://github.com/helmetjs/content-security-policy-parser/pull/12
      (d) => d.replace(/^[\t\n\f\r ]+/, "").replace(/[\t\n\f\r ]+$/, ""),
    );
  const frameAncestorsDirective = cspDirectives?.find(
    // Must be a well-formed directive key. Either an empty list following, or
    // it must be the directive followed by some whitespace and everything else
    // in the string is ASCII.
    (d) => d.match(/^frame-ancestors[\t\n\f\r ]*([\t\n\f\r ][\x00-\x7F]*)?$/),
  );
  // Only look at x-frame-options if there's no frame-ancestors key in the CSP
  // list. Even an invalid frame-ancestors value will result in x-frame-options
  // being ignored! See 6.4.2.2:
  // https://w3c.github.io/webappsec-csp/#frame-ancestors-and-frame-options
  const xFrameOptionsObsoleted = frameAncestorsDirective != null;
  if (!xFrameOptionsObsoleted && xFrameOptions != null) {
    const fmt = xFrameOptions.toLowerCase().trim();
    if (fmt === "deny") {
      return {
        status: "safe",
        // Return where it's allowed to be hosted.
        safeSourcesAllowed: [],
        missingPolicy: false,
        ignoredSources: [],
        url,
      };
    }
    if (fmt === "sameorigin") {
      return {
        status: "safe",
        safeSourcesAllowed: [{ sameorigin: true }],
        missingPolicy: false,
        ignoredSources: [],
        url,
      };
    }
  }

  // Check Content-Security-Policy for frame-ancestors directive
  // We must only split by ASCII whitespace, follows the parsing spec here:
  // https://w3c.github.io/webappsec-csp/#framework-infrastructure
  const processedFADirective = frameAncestorsDirective?.split(/[\t\n\f\r ]+/g);
  if (
    processedFADirective != null &&
    processedFADirective[0] === "frame-ancestors"
  ) {
    // Source directives for CSP are additive. That means, we need to check
    // there's at least one policy, and that none of them are wildly permissive.
    // It's possible to specify things like '*', or https://*.com, which are
    // too permissive to stop clickjacking attacks.
    // Documentation can be found here:
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
    // But the _real_ information can be found in the w3c spec. :)

    let frameAncestors = processedFADirective.slice(1);
    // Keep track of malformed sources.
    const ignoredSources: string[] = [];

    // Empty policy? It's considered equivalent to 'none'. Thus, safe.
    // https://w3c.github.io/webappsec-csp/#match-url-to-source-list
    if (!isNonEmptyArray(frameAncestors)) {
      return {
        status: "safe",
        safeSourcesAllowed: [],
        missingPolicy: false,
        ignoredSources,
        url,
      };
    }

    // As per the spec (https://w3c.github.io/webappsec-csp/#directive-frame-ancestors),
    // the grammar for specifying frame-ancestors is:
    // ancestors       = (ancestor-source ...ancestor-source) | "'none'"
    // ancestor-source = scheme-source | host-source | "'self'"
    // Interestingly, Google's CSP evaluator gets this grammar wrong, and
    // validates `frame-ancestors https://*.com 'none'` as a valid policy,
    // despite 'none' only being allowed on its own.
    // https://csp-evaluator.withgoogle.com/

    // Check if there's exactly one definition of none.
    const isNone = (e: string) => e === "'none'";
    if (frameAncestors.length === 1 && isNone(frameAncestors[0])) {
      return {
        status: "safe",
        safeSourcesAllowed: [],
        missingPolicy: false,
        ignoredSources,
        url,
      };
    }

    // If there's anything in addition to 'none', we ignore the 'none'. See
    // 6.7.2.6: https://w3c.github.io/webappsec-csp/#match-url-to-source-list
    if (frameAncestors.some(isNone)) {
      ignoredSources.push("'none'");
    }
    frameAncestors = frameAncestors.filter((e) => !isNone(e));

    // Keep track of what's safe & unsafe, so we can include in the return
    // value.
    const safeSourcesList: SafeSourcesAllowedList = [];
    const unsafeSourcesList: DangerousSourcesAllowedList = [];

    const isSelf = (e: string) => e === "'self'";
    if (frameAncestors.some(isSelf)) {
      safeSourcesList.push({ sameorigin: true });
    }
    // Everything left is self?
    if (frameAncestors.every(isSelf)) {
      return {
        status: "safe",
        safeSourcesAllowed: safeSourcesList,
        missingPolicy: false,
        ignoredSources,
        url,
      };
    }
    frameAncestors = frameAncestors.filter((schema) => !isSelf(schema));

    // Otherwise we need to check for restrictive host-sources and
    // scheme-sources.

    // First, the scheme sources.
    const schemeSources: [
      ReturnType<typeof isPermissiveSchemeSource>,
      string,
    ][] = frameAncestors.map((e) => [isPermissiveSchemeSource(e), e]);
    // Filter out any matching sources.
    frameAncestors = schemeSources
      .filter(([match]) => match == null)
      .map(([, e]) => e);

    // Which schemes are safe?
    const safeSchemeSources: SafeSourcesAllowedList = schemeSources
      // Be defensive against refactors.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .filter(([match]) => match != null && !match.isPermissive)
      .map(([, e]) => ({ source: e }));
    safeSourcesList.push(...safeSchemeSources);

    // Which are unsafe?
    const unsafeSchemeSources: DangerousSourcesAllowedList = schemeSources
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .filter(([match]) => match != null && match.isPermissive)
      .map(([, e]) => ({ permissiveAddress: e }));
    unsafeSourcesList.push(...unsafeSchemeSources);

    // Finally, the host sources.
    const hostSources: [ReturnType<typeof isPermissiveHostSource>, string][] =
      frameAncestors.map((e) => [isPermissiveHostSource(e), e]);
    // Filter out any matching sources.
    frameAncestors = hostSources
      .filter(([match]) => match == null)
      .map(([, e]) => e);

    const safeHostSources: SafeSourcesAllowedList = hostSources
      .filter(([match]) => match != null && !match.isPermissive)
      .map(([, e]) => ({ source: e }));
    safeSourcesList.push(...safeHostSources);
    const unsafeHostSources: DangerousSourcesAllowedList = hostSources
      .filter(([match]) => match != null && match.isPermissive)
      .map(([, e]) => ({ permissiveAddress: e }));
    unsafeSourcesList.push(...unsafeHostSources);

    // If there's remaining content in the frameAncestors source list, it
    // means they are malformed, and thus can be ignored. They can be ignored
    // as it's not possible for a host to match them. We return these as a
    // courtesy.
    ignoredSources.push(...frameAncestors);

    if (unsafeSourcesList.length > 0) {
      return {
        status: "unsafe",
        dangerousSourcesAllowed: unsafeSourcesList,
        safeSourcesAllowed: safeSourcesList,
        ignoredSources,
        missingPolicy: false,
        url,
      };
    }

    return {
      status: "safe",
      safeSourcesAllowed: safeSourcesList,
      ignoredSources,
      missingPolicy: false,
      url,
    };
  }

  return { status: "unsafe", missingPolicy: true, url };
}
