const assert = require('node:assert/strict');

async function load(modulePath) {
  return import(modulePath);
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

async function callGet(routeModule) {
  return parseResponse(await routeModule.GET());
}

async function callPost(routeModule, body) {
  const response = await routeModule.POST(
    new Request('http://localhost/api/mission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
  );

  return parseResponse(response);
}

module.exports = {
  assert,
  load,
  callGet,
  callPost,
  parseResponse,
};
