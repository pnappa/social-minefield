import test from 'node:test';
import * as assert from 'node:assert';

import { handler, checkClickjackingVulnerability } from './index.js';

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

// Check that we can query the API via the exports fine.
test('API handler access', async (t) => {
  const x = await getAPIOutput('https://www.google.com');
  assert.strictEqual(x?.json?.vulnStatus?.status, 'safe');
});

test('checkClickjackingVulnerability trivial case', async (t) => {
  const res = checkClickjackingVulnerability({
    xFrameOptions: null,
    contentSecurityPolicy: null,
  });
  assert.strictEqual(res.status, 'unsafe');
  assert.strictEqual(res.missingPolicy, true);
});

test('checkClickjackingVulnerability x-frame-options self', async (t) => {
  const res = checkClickjackingVulnerability({
    xFrameOptions: 'sameorigin',
    contentSecurityPolicy: null,
  });
  assert.strictEqual(res.status, 'safe');
  assert.deepStrictEqual(res.safeSourcesAllowed, [{ sameorigin: true }]);
});
