import fetch, { AbortError } from 'node-fetch';
import type { Handler } from 'aws-lambda';
import { parse as parseSuffix } from 'tldts';

// I initially started this with output from ChatGPT, but it wasn't particularly
// good at very specific details about the CSP contexts.
// https://chat.openai.com/share/9b5600d9-69e1-4654-8475-f340179e6192
const timeoutSeconds = 25;

export const handler: Handler = async (event): Promise<
  { statusCode: number; body: string; }
> => {
  // Extract the URL from the event object, and check it's well formed.
  const userUrl = parseUserURL(event.url);
  if (userUrl == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid URL.' }),
    };
  }

  try {
    const response = await headRequest(userUrl);
    if (response === 'timeout') {
      return {
        statusCode: 504,
        body: JSON.stringify({
          error: 'Request timed out, please try again later',
        }),
      };
    }
    const xFrameOptions = response.headers.get('x-frame-options');
    const contentSecurityPolicy = response.headers.get(
      'content-security-policy',
    );
    const vulnStatus = checkClickjackingVulnerability({
      xFrameOptions,
      contentSecurityPolicy,
    });

    if (vulnStatus.status === 'unknown') {
      // Static assert.
      vulnStatus satisfies { error: string };
      return {
        statusCode: 400,
        body: JSON.stringify({ vulnStatus }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ vulnStatus }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred' }),
    };
  }
};

function parseUserURL(inputURL: string) {
  try {
    const parsed = new URL(inputURL);
    // Ignore the port, and query strings etc. If people are gonna be making me
    // ping external systems, I'd rather not have data associated with it.
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
      headers: Awaited<ReturnType<typeof fetch>>['headers']
    }
  | 'timeout'
> {
  const controller = new AbortController();
  // Whilst the lambda will have a 30s timeout, we fail at 25 seconds here,
  // to make sure we'll more than likely be able to respond why we failed.
  // I wholly expect people will try to slow-loris us, but concurrent
  // execution and the captcha should deal with that.
  const timeout = setTimeout(
    () => { controller.abort(); },
    limitMs ?? (timeoutSeconds * 1000),
  );

  try {
    const res = await fetch(`${userURL.origin}${userURL.path}`, {
      method: 'HEAD',
      headers: {
        // People getting abuse from us will be able to contact us.
        'User-Agent': 'Social Minefield Clickjacking Checker'
      },
      signal: controller.signal,
    });

    return {
      statusCode: res.status,
      headers: res.headers,
    };
  } catch (e) {
    if (e instanceof AbortError) {
      return 'timeout';
    }
    throw e;
  } finally {
    // Whilst we don't need to do this, we should because it means the process
    // can close as there's no pending promises (it makes tests finish faster).
    clearTimeout(timeout);
  }
}

type NonEmptyArray<T> = [T, ...T[]];
function isNonEmptyArray<T>(e: T[]): e is NonEmptyArray<typeof e[number]> {
  return e.length > 0;
}

const isValidPath = (e: string): boolean => {
  try {
    const x = new URL(e, 'https://example.com');
    return true;
  } catch {
    return false;
  }
}

// Null if not a scheme.
export const isPermissiveSchemeSource = (e: string): { isPermissive: true; } | null => {
  // As per https://w3c.github.io/webappsec-csp/#grammardef-scheme-source and
  // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1 , these are
  // case-insenstive, but we'll convert to lowercase.
  const potentialSchemeSource = e.toLowerCase();

  // All valid schemes are considered too permissive. For example, `https:`
  // allows every single https site. Not good!
  if (/^[a-z][a-z0-9\+\-\.]*:$/.test(potentialSchemeSource)) {
    // Clickjacking only really applies to these schemes.
    if (
      potentialSchemeSource === 'https:' ||
      potentialSchemeSource === 'http:'
    ) {
      return { isPermissive: true };
    }
    return { isPermissive: true };
  }
  return null;
}

const isValidHost = (e: string): boolean => {
  try {
    const x = new URL(`https://${e}/`);
    return true;
  } catch {
    return false;
  }
}

// Null if not a scheme.
export const isPermissiveHostSource = (e: string): { isPermissive: boolean } | null => {
  // As per https://w3c.github.io/webappsec-csp/#grammardef-host-source
  // Whilst URLs are case-sensitive (at least the path component is), we're
  // not really caring about where the path is.
  const source = e.toLowerCase();

  // First, we parse the host source into constituent parts.
  // [ scheme-part "://" ] host-part [ ":" port-part ] [ path-part ]
  const groups =
    source.match(
    /^(?<scheme>[a-z][a-z0-9\+\-\.]*:\/\/)?(?<host>\*|(\*\.)?[a-z0-9\-\.]+)(?<port>:[0-9]+)?(?<path>\/[a-z0-9\-\.\_\~\!\$\&\'\(\)\*\+\,\;\=\:\@\%]*\/)?$/,
  )?.groups;

  // Not a valid host.
  if (!groups) return null;

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
    if (groups.host === '*') {
      // Everything wildcard is way too permissive.
      return { isPermissive: true };
    } 

    // Otherwise, make sure it's not a dot.
    if (groups.host === '.') {
      return null;
    }

    // TODO: Should we assert it is 0-9a-z-?
    return { isPermissive: false };
  }

  // groups.host.length >= 2
  // Things like "*example.com" are not valid.
  let host = groups.host;
  if (host[0] === '*' && host[1] !== '.') {
    return null;
  }

  if (host[0] === '*' && host[1] === '.') {
    // Omit the wild card, as we need to check that the host is valid, again
    // using the native URL parsing, so remove the part that isn't a valid
    // regular hostname.
    host = host.slice(2);
  }

  if (!isValidHost(host)) {
    return null;
  }

  // We need to check what the OG host was. If it's not got a wildcard, it's
  // safe.
  if (groups.host.indexOf('*') === -1) {
    return { isPermissive: false };
  }

  // If there's a wildcard, and it's a public suffix, it's not safe.
  const parsed = parseSuffix(host);
  if (parsed.publicSuffix === host) {
    return { isPermissive: true };
  }

  // Otherwise, it's fine.
  return { isPermissive: false };
}

type SafeSourcesAllowedList = (
 | { sameorigin: true }
 | { source: string }
)[]
export function checkClickjackingVulnerability({
  xFrameOptions,
  contentSecurityPolicy,
}: {
  xFrameOptions: string | null | undefined;
  contentSecurityPolicy: string | null | undefined;
}):
  | { status: 'unsafe'; missingPolicy: true }
  | {
      error: 'Malformed frame-ancestors Content Security Policy.'
      status: 'unknown';
      missingPolicy: false;
    }
  | {
      status: 'safe';
      safeSourcesAllowed: SafeSourcesAllowedList;
      missingPolicy: false;
    }
  | {
      status: 'unsafe';
      dangerousSourcesAllowed: { permissiveAddress: string }[];
      // Same as the safe's safeSourcesAllowed.
      safeSourcesAllowed: SafeSourcesAllowedList;
      missingPolicy: false;
    }
    {
  // Technically this function can report some false positives. If a user is
  // using multiple CSPs, as per:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#multiple_content_security_policies
  // The successive policies can make the conditions stricter, but the headers
  // dictionary I don't believe supports it.

  // Check X-Frame-Options
  if (xFrameOptions != null) {
    const fmt = xFrameOptions.toLowerCase().trim();
    if (fmt === 'deny') {
      return {
        status: 'safe',
        // Return where it's allowed to be hosted.
        safeSourcesAllowed: [], missingPolicy: false,
      };
    }
    if (fmt === 'sameorigin') {
      return {
        status: 'safe',
        safeSourcesAllowed: [{ sameorigin: true }], missingPolicy: false,
      };
    }
  }

  // Check Content-Security-Policy for frame-ancestors directive
  if (contentSecurityPolicy != null) {
    const cspDirectives = contentSecurityPolicy
      .toLowerCase()
      .split(';')
      .map(d => d.trim());
    const frameAncestorsDirective = cspDirectives
      .find(d => d.startsWith('frame-ancestors'));

    if (frameAncestorsDirective) {
      // Source directives for CSP are additive. That means, we need to check
      // there's at least one policy, and that none of them are wildly
      // permissive.
      // It's possible to specify things like '*', or https://*.com, which are
      // too permissive to stop clickjacking attacks.
      // So, we go through and filter until we don't have any non-permissive
      // statements. If we have some remaining at the end, we consider it
      // potentially unsafe.
      // Documentation can be found here:
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors

      let frameAncestors = frameAncestorsDirective.split(' ').slice(1);
      if (!isNonEmptyArray(frameAncestors)) {
        return { status: 'unsafe', missingPolicy: true };
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
        return { status: 'safe', safeSourcesAllowed: [], missingPolicy: false };
      }
      if (frameAncestors.some(isNone)) {
        return {
          status: 'unknown',
          error: 'Malformed frame-ancestors Content Security Policy.', missingPolicy: false,
        };
      }
      // The policies are additive, so ignore the considered 'none's.
      frameAncestors = frameAncestors.filter((schema) => !isNone(schema));

      // Everything left is self?
      const isSelf = (e: string) => e === "'self'";
      if (frameAncestors.every(isSelf)) {
        return { status: 'safe', safeSourcesAllowed: [{ sameorigin: true }], missingPolicy: false };
      }
      frameAncestors = frameAncestors.filter((schema) => !isSelf(schema));

      // Otherwise we need to check for restrictive host-sources and
      // scheme-sources.
      // TODO: Call isPermissiveSchemeSource and isPermissiveHostSource.
    }
  }

  return { status: 'unsafe', missingPolicy: true };
}