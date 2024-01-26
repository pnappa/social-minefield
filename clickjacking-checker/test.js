const test = require('node:test');
const assert = require('node:assert');

const { handler } = require('./');

const getAPIOutput = async (url) => {
  return await handler({
    url,
  });
};

test('access', async (t) => {
  try {
    const x = await getAPIOutput('https://google.com');
    assert.strictEqual(x?.vulnStatus?.status, 'safe');
  } finally {
    return false;
  }
});
