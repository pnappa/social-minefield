import https from 'https';
import fetch from 'node-fetch';

// This function was mostly AI generated. It required some coaxing.
// I had to fix some bugs too.
// https://chat.openai.com/share/9b5600d9-69e1-4654-8475-f340179e6192
const timeoutSeconds = 25;

export const handler = async (event) => {
  // Extract the URL from the event object, and check it's well formed.
  const userUrl = parseUserURL(event.url);
  if (userUrl == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid URL.' }),
    };
  }

  try {
    // Whilst the lambda will have a 30s timeout, we fail at 25 seconds here,
    // to make sure we'll more than likely be able to response why we failed.
    // I wholly expect people will try to slow-loris us, but concurrent
    // execution and the captcha should deal with that.
    const response = await Promise.race([
      new Promise((resolve, reject) => {
        setTimeout(resolve, timeoutSeconds*1000, 'timeout');
      }),
      headRequest(userUrl),
    ]);
    if (response === 'timeout') {
      return {
        statusCode: 504,
        body: JSON.stringify({ error: 'Request timed out, please try again later' });
      };
    }
    const xFrameOptions = response.headers.get('x-frame-options');
    const contentSecurityPolicy = response.headers.get('content-security-policy');
    const vulnStatus = checkClickjackingVulnerability({
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
      body: JSON.stringify({ error: 'An internal error occurred' }),
    };
  }
};

function parseUserURL(inputURL) {
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

async function headRequest(userURL) {
  const res = await fetch(`${userURL.origin}${userURL.path}`, {
    method: 'HEAD',
    headers: {
      // People getting abuse from us will be able to contact us.
      'User-Agent': 'Social Minefield Clickjacking Checker'
    },
  });

  return {
    statusCode: res.status,
    headers: res.headers,
  }
}

// Returns 
//  | { status: 'unsafe', missingPolicy: true }
//  | { error: 'Malformed frame-ancestors Content Security Policy.' }
//  | {
//      status: 'safe',
//      safeSourcesAllowed: (
//       | { sameorigin: true }
//       | { source: 'https://cool.com' }
//      )[]
//    }
//  | {
//      status: 'unsafe',
//      dangerousSourcesAllowed: { permissiveAddress: 'https://*' }[],
//      // Same as the safe's safeSourcesAllowed.
//      safeSourcesAllowed: { sameorigin: true }[],
//    }
export function checkClickjackingVulnerability({
  xFrameOptions,
  contentSecurityPolicy,
}) {
  // Technically this function can report some false positives. If a user is
  // using multiple CSPs, as per:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#multiple_content_security_policies
  // The successive policies can make the conditions stricter, but the headers
  // dictionary I don't believe supports it.

  // Check X-Frame-Options
  if (xFrameOptions) {
    const fmt = xFrameOptions.toLowerCase().trim();
    if (fmt === 'deny') {
      return {
        status: 'safe',
        // Return where it's allowed to be hosted.
        allowedList: [],
      };
    }
    if (fmt === 'sameorigin') {
      return {
        status: 'safe',
        allowedList: [{ sameorigin: true }],
      };
    }
  }

  // Check Content-Security-Policy for frame-ancestors directive
  if (contentSecurityPolicy) {
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

      let frameAncestors = frameAncestorsDirective
        .split(' ')
        .slice(1);
      // It's safe if they specify at least one thing, and all of them aren't
      // permissive.
      if (frameAncestors.length === 0) {
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
      // TODO: Should this just be a backus-naur parser?

      // Check if there's exactly one definition of none.
      const isNone = (e) => e === "'none'";
      if (frameAncestors.length === 1 && isNone(frameAncestors[0])) {
        return { status: 'safe', allowedList: [] };
      }
      if (frameAncestors.some(isNone)) {
        return { status: 'unsafe', 
      }
      // The policies are additive, so ignore the considered 'none's.
      frameAncestors = frameAncestors.filter((schema) => !isNone(schema));

      // Everything left is self?
      const isSelf = (e) => e === "'self'";
      if (frameAncestors.every(isSelf)) {
        return { status: 'safe', allowedList: [{ sameorigin: true }] };
      }
      frameAncestors = frameAncestors.filter((schema) => !isSelf(schema));

      // Otherwise we need to check for restrictive host-sources and
      // scheme-sources.
      // Referring to the spec, we see that 
      // If theres's 

      // These are easy cases.
      const triviallySafe = frameAncestors.every((schema) =>
        schema === "'none'" || schema === "'self'"
      );

      // TODO: The rest of them.
      // Specifically, we probably should make it return false if there's
      // some forms of "*", "https://*", "https://*.com", or whatever.
      // Theoretically we should also check the public suffix list.
      // If we do use that, then perhaps let's cache the PSL?

      // frameAncestors.map((schema) => 
      //   schema === "'none'"
      // // TODO:
      // for (let value of frameAncestors) {
      //   if (value.includes('*')
      //   if (value === '*' || (value.includes('*') && !isSubdomainWildcard(value))) {
      //     return true;
      //   }
      // }
    }
  }

  return { status: 'unsafe', missingPolicy: true };
}

function isSubdomainWildcard(value) {
  const pattern = /^https?:\/\/\*\.[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
  return pattern.test(value);
}
