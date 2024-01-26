const https = require('https');

// This function was mostly AI generated. It required some coaxing.
// I had to fix some bugs too.
// https://chat.openai.com/share/9b5600d9-69e1-4654-8475-f340179e6192

exports.handler = async (event) => {
  // Extract the URL from the event object, and check it's well formed.
  const userUrl = parseUserURL(event.url);
  if (userUrl == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid URL' }),
    };
  }

  try {
    const response = await headRequest(userUrl);
    const vulnStatus = checkClickjackingVulnerability(response.headers);

    return {
      statusCode: 200,
      body: JSON.stringify({ vulnStatus }),
    };
  } catch (error) {
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
      hostname: parsed.hostname,
      path: parsed.pathname,
    };
  } catch (_) {
    return null;
  }
}

function headRequest(userUrl) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: userUrl.hostname,
      path: userUrl.path,
      method: 'HEAD',
      headers: {
        // People getting abuse from us will be able to contact us.
        'User-Agent': 'Social Minefield Clickjacking Checker'
      },
    }, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

function checkClickjackingVulnerability(headers) {
  const xFrameOptions = headers['x-frame-options'];
  // Technically this function can report some false positives. If a user is
  // using multiple CSPs, as per:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#multiple_content_security_policies
  // The successive policies can make the conditions stricter, but the headers
  // dictionary I don't believe supports it.
  const contentSecurityPolicy = headers['content-security-policy'];

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
      const frameAncestorsValues = frameAncestorsDirective
        .split(' ')
        .slice(1);
      // It's safe if they specify at least one thing, and all of them aren't
      // permissive.
      if (frameAncestorsValues.length === 0) {
        return { status: 'unsafe', allowedList: null };
      }

      if (frameAncestorsValues.every((schema) => schema === "'none'")) {
        return { status: 'safe', allowedList: [] };
      }
      if (frameAncestorsValues.every((schema) => schema === "'none'" || schema === "'self'")) {
        return { status: 'safe', allowedList: [{ sameorigin: true }] };
      }

      // These are easy cases.
      const triviallySafe = frameAncestorsValues.every((schema) =>
        schema === "'none'" || schema === "'self'"
      );

      // TODO: The rest of them.
      // 

      // frameAncestorsValues.map((schema) => 
      //   schema === "'none'"
      // // TODO:
      // for (let value of frameAncestorsValues) {
      //   if (value.includes('*')
      //   if (value === '*' || (value.includes('*') && !isSubdomainWildcard(value))) {
      //     return true;
      //   }
      // }
    }
  }

  return { status: 'unsafe', allowedList: null };
}

function isSubdomainWildcard(value) {
  const pattern = /^https?:\/\/\*\.[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
  return pattern.test(value);
}
