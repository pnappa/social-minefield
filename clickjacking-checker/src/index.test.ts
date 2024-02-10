import { describe, test } from 'node:test';
import * as assert from 'node:assert';

import {
  handler,
  checkClickjackingVulnerability,
  isPermissiveSchemeSource,
  headRequest,
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
  test('Access', async (t) => {
    const x = await getAPIOutput('https://www.google.com');
    assert.deepStrictEqual(x?.json?.vulnStatus?.status, 'safe');
  });
});

describe('checkClickjackingVulnerability', () => {
  test('Trivial case', async (t) => {
    const res = checkClickjackingVulnerability({
      xFrameOptions: null,
      contentSecurityPolicy: null,
    });
    assert.deepStrictEqual(res.status, 'unsafe');
    assert.deepStrictEqual(res.missingPolicy, true);
  });

  test('x-frame-options self', async (t) => {
    const res = checkClickjackingVulnerability({
      xFrameOptions: 'sameorigin',
      contentSecurityPolicy: null,
    });
    assert.deepStrictEqual(res.status, 'safe');
    assert.deepStrictEqual(res.safeSourcesAllowed, [{ sameorigin: true }]);
  });
  test('x-frame-options none', async (t) => {
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
  test('example.com default timeout', async (t) => {
    const res = await headRequest(
      { origin: 'https://example.com', path: '/' },
    );
    assert.notStrictEqual(res, 'timeout');
  });
  test('example.com strict timeout hit', async (t) => {
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
  test('https: matches', async (t) => {
    const res = isPermissiveSchemeSource('https:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https:/ no match', async (t) => {
    // This is not a scheme.
    const res = isPermissiveSchemeSource('https:/');
    assert.deepStrictEqual(res, null);
  });
  test('empty no match', async (t) => {
    // This is not a scheme.
    const res = isPermissiveSchemeSource('');
    assert.deepStrictEqual(res, null);
  });
  test('http: matches', async (t) => {
    const res = isPermissiveSchemeSource('http:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
  test('https://google.com invalid', async (t) => {
    const res = isPermissiveSchemeSource('https://google.com');
    assert.deepStrictEqual(res, null);
  });
  test('https:/google.com invalid', async (t) => {
    const res = isPermissiveSchemeSource('https:/google.com');
    assert.deepStrictEqual(res, null);
  });
  test('https://google invalid', async (t) => {
    const res = isPermissiveSchemeSource('https://');
    assert.deepStrictEqual(res, null);
  });
  test('https:// invalid', async (t) => {
    const res = isPermissiveSchemeSource('https://');
    assert.deepStrictEqual(res, null);
  });
  test('https invalid', async (t) => {
    const res = isPermissiveSchemeSource('https://');
    assert.deepStrictEqual(res, null);
  });
  test('https://* invalid', async (t) => {
    const res = isPermissiveSchemeSource('https://*');
    assert.deepStrictEqual(res, null);
  });
  test('foo: permissive match', async (t) => {
    const res = isPermissiveSchemeSource('foo:');
    assert.deepStrictEqual(res, { isPermissive: true });
  });
});
