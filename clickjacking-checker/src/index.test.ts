import { describe, test } from 'node:test';
import * as assert from 'node:assert';

import {
  handler,
  checkClickjackingVulnerability,
  isPermissiveSchemeSource,
  headRequest,
  isPermissiveHostSource,
} from './index.js';

const getAPIOutput = async (url: string) => {
  const result = await handler(
    { url },
    // Ignore supplying the other arguments, we don't use them.
    undefined as any,
    undefined as any,
  );
  return {
    statusCode: result.statusCode,
    json: JSON.parse(result.body),
  };
};

describe('API Handler', () => {
  // Check that we can query the API via the exports fine.
  test('Access', async () => {
    const x = await getAPIOutput('https://www.google.com');
    assert.deepStrictEqual(x?.json?.vulnStatus?.status, 'safe');
  });
});

describe('checkClickjackingVulnerability', () => {
  test('Trivial case', async () => {
    const res = checkClickjackingVulnerability({
      xFrameOptions: null,
      contentSecurityPolicy: null,
    });
    assert.deepStrictEqual(res.status, 'unsafe');
    assert.deepStrictEqual(res.missingPolicy, true);
  });

  test('x-frame-options self', async () => {
    const res = checkClickjackingVulnerability({
      xFrameOptions: 'sameorigin',
      contentSecurityPolicy: null,
    });
    assert.deepStrictEqual(res.status, 'safe');
    assert.deepStrictEqual(res.safeSourcesAllowed, [{ sameorigin: true }]);
  });
  test('x-frame-options none', async () => {
    const res = checkClickjackingVulnerability({
      xFrameOptions: 'deny',
      contentSecurityPolicy: null,
    });
    assert.deepStrictEqual(res.status, 'safe');
    assert.deepStrictEqual(res.safeSourcesAllowed, []);
  });
});

describe('headRequest', () => {
  // Technically this test can fail if your internet is slow, or no network
  // access. But we're assuming it's fine.
  test('example.com default timeout', async () => {
    const res = await headRequest(
      { origin: 'https://example.com', path: '/' },
    );
    assert.notStrictEqual(res, 'timeout');
  });
  test('example.com strict timeout hit', async () => {
    const res = await headRequest(
      { origin: 'https://example.com', path: '/' },
      // I really don't expect example.com to respond that quickly :)
      /* limitMs */ 5,
    );
    assert.strictEqual(res, 'timeout');
  });
});

// Check that null is returned for things that aren't schemes, and that for
// anything that is a valid scheme, return that it's permissive.
describe('isPermissiveSchemeSource', () => {
  test('https: matches', async () => {
    const res = isPermissiveSchemeSource('https:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https:/ no match', async () => {
    // This is not a scheme.
    const res = isPermissiveSchemeSource('https:/');
    assert.deepStrictEqual(res, null);
  });
  test('empty no match', async () => {
    // This is not a scheme.
    const res = isPermissiveSchemeSource('');
    assert.deepStrictEqual(res, null);
  });
  test('http: matches', async () => {
    const res = isPermissiveSchemeSource('http:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https://google.com invalid', async () => {
    const res = isPermissiveSchemeSource('https://google.com');
    assert.deepStrictEqual(res, null);
  });
  test('https:/google.com invalid', async () => {
    const res = isPermissiveSchemeSource('https:/google.com');
    assert.deepStrictEqual(res, null);
  });
  test('https://google invalid', async () => {
    const res = isPermissiveSchemeSource('https://google');
    assert.deepStrictEqual(res, null);
  });
  test('https:// invalid', async () => {
    const res = isPermissiveSchemeSource('https://');
    assert.deepStrictEqual(res, null);
  });
  test('https invalid', async () => {
    const res = isPermissiveSchemeSource('https');
    assert.deepStrictEqual(res, null);
  });
  test('https://* invalid', async () => {
    const res = isPermissiveSchemeSource('https://*');
    assert.deepStrictEqual(res, null);
  });
  test('foo: permissive match', async () => {
    const res = isPermissiveSchemeSource('foo:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
});

describe('isPermissiveHostSource', () => {
  test('https: no matches', async () => {
    const res = isPermissiveHostSource('https:');
    assert.deepStrictEqual(res, null);
  });
  test('https:/ no match', async () => {
    const res = isPermissiveHostSource('https:/');
    assert.deepStrictEqual(res, null);
  });
  test('empty no match', async () => {
    const res = isPermissiveHostSource('');
    assert.deepStrictEqual(res, null);
  });
  test('http: no match', async () => {
    const res = isPermissiveHostSource('http:');
    assert.deepStrictEqual(res, null);
  });
  test('https://google.com good', async () => {
    const res = isPermissiveHostSource('https://google.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });
  test('https:/google.com no match', async () => {
    const res = isPermissiveHostSource('https:/google.com');
    assert.deepStrictEqual(res, null);
  });
  test('https://google good', async () => {
    const res = isPermissiveHostSource('https://google');
    assert.deepStrictEqual(res, { isPermissive: false });
  });
  test('https:// no match', async () => {
    const res = isPermissiveHostSource('https://');
    assert.deepStrictEqual(res, null);
  });
  test('https good', async () => {
    const res = isPermissiveHostSource('https');
    assert.deepStrictEqual(res, { isPermissive: false });
  });
  test('https://* bad', async () => {
    const res = isPermissiveHostSource('https://*');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('foo://* bad', async () => {
    const res = isPermissiveHostSource('foo://*');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('foo://*.com bad', async () => {
    const res = isPermissiveHostSource('foo://*.com');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https://*.com bad', async () => {
    const res = isPermissiveHostSource('https://*.com');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https://*.example.com good', async () => {
    // It's good, because it's not a public suffix.
    const res = isPermissiveHostSource('https://*.example.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // Test cases for different schemes
  test('ftp://example.com allowed scheme', async () => {
    const res = isPermissiveHostSource('ftp://example.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('mailto:example@example.com not a valid host source', async () => {
    const res = isPermissiveHostSource('mailto:example@example.com');
    assert.deepStrictEqual(res, null);
  });

  // Test cases for port inclusion
  test('https://example.com:8080 good with port', async () => {
    const res = isPermissiveHostSource('https://example.com:8080');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://*.example.com:8080 good with port and wildcard', async () => {
    const res = isPermissiveHostSource('https://*.example.com:8080');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // Test cases for invalid paths
  test('https://example.com/invalid|path no match due to invalid path', async () => {
    const res = isPermissiveHostSource('https://example.com/invalid|path');
    assert.deepStrictEqual(res, null);
  });

  // Test cases for edge cases and specific scenarios
  test('https://.example.com no match due to leading dot', async () => {
    const res = isPermissiveHostSource('https://.example.com');
    assert.deepStrictEqual(res, null);
  });

  test('https://example..com no match due to consecutive dots', async () => {
    const res = isPermissiveHostSource('https://example..com');
    assert.deepStrictEqual(res, null);
  });

  // XXX: Note that the spec for host-source is both too permissive and too
  // strict. Some domains which are not valid (such as leading hyphens) are
  // considered valid. Oh well!
  // https://w3c.github.io/webappsec-csp/#framework-directive-source-list
  test('https://-example.com is good, due to bug in CSP specification', async () => {
    const res = isPermissiveHostSource('https://-example.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // XXX: Likewise, trailing hyphens are allowed (but probably shouldn't be).
  test('https://example.com- is good, due to bug in CSP specification', async () => {
    const res = isPermissiveHostSource('https://example.com-');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://*. no match due to incomplete wildcard domain', async () => {
    const res = isPermissiveHostSource('https://*.');
    assert.deepStrictEqual(res, null);
  });

  test('https://example.* no match due to wildcard in TLD', async () => {
    const res = isPermissiveHostSource('https://example.*');
    assert.deepStrictEqual(res, null);
  });

  test('https://sub.example.com valid subdomain', async () => {
    const res = isPermissiveHostSource('https://sub.example.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://*.sub.example.com valid wildcard subdomain', async () => {
    const res = isPermissiveHostSource('https://*.sub.example.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://*.sub.example.com. valid wildcard subdomain', async () => {
    const res = isPermissiveHostSource('https://*.sub.example.com.');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // Test cases for valid paths
  test('https://example.com/ good with path', async () => {
    const res = isPermissiveHostSource('https://example.com/');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://example.com/valid/path/ good with valid path', async () => {
    const res = isPermissiveHostSource('https://example.com/valid/path/');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // URL.canParse(host, path) and URL.canParse(`${host}${path}`) actually
  // disagree here. I think this might be firefox bug? I would assume this is a
  // valid URL.
  test('https://example.com// invalid path', async () => {
    const res = isPermissiveHostSource('https://example.com//');
    assert.deepStrictEqual(res, null);
  });

  test('https://example.com/valid/path/with/query?param=value invalid due to query parameters', async () => {
    const res = isPermissiveHostSource('https://example.com/valid/path/with/query?param=value');
    assert.deepStrictEqual(res, null);
  });

  // Again, don't shoot the messenger, it's a spec issue ;)
  test('https://123.456.78.90 invalid IP address as host is good', async () => {
    const res = isPermissiveHostSource('https://123.456.78.90');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://123.456.78.90 valid IP address as host is good', async () => {
    const res = isPermissiveHostSource('https://123.233.78.90');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  test('https://xn--n3h.com valid punycode domain', async () => {
    const res = isPermissiveHostSource('https://xn--n3h.com');
    assert.deepStrictEqual(res, { isPermissive: false });
  });

  // Test case for explicitly allowed schemes
  test('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ== not a valid host source', async () => {
    const res = isPermissiveHostSource('data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==');
    assert.deepStrictEqual(res, null);
  });

  // Test cases for specific invalid characters in host
  test('https://example.com/with space no match due to space in path', async () => {
    // XXX: This isn't possible from our endpoint, due to use splitting
    // directive values by spaces.
    const res = isPermissiveHostSource('https://example.com/with space');
    assert.deepStrictEqual(res, null);
  });

  test('https://exa$mple.com no match due to special character in host', async () => {
    const res = isPermissiveHostSource('https://exa$mple.com');
    assert.deepStrictEqual(res, null);
  });

  // More nuanced wildcard scenarios
  test('https://*.co.uk too permissive due to public suffix', async () => {
    const res = isPermissiveHostSource('https://*.co.uk');
    // If it's a wild card of a public suffix, it's too permissive.
    assert.deepStrictEqual(res, { isPermissive: true });
  });

  test('https://*.air-traffic-control.aero too permissive due to public suffix', async () => {
    const res = isPermissiveHostSource('https://*.air-traffic-control.aero');
    // If it's a wild card of a public suffix, it's too permissive.
    assert.deepStrictEqual(res, { isPermissive: true });
  });
});
