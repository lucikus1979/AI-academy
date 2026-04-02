import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../chat.js';

function createMockReq({ method = 'GET', headers = {}, body = null } = {}) {
  return { method, headers, body };
}

function createMockRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

test('OPTIONS /api/chat returns 200 (CORS preflight)', async () => {
  const req = createMockReq({ method: 'OPTIONS' });
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.ended, true);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('GET /api/chat returns 405', async () => {
  const req = createMockReq({ method: 'GET' });
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.payload, { error: 'Method not allowed. Use POST.' });
});

test('POST /api/chat without token returns auth error', async () => {
  const req = createMockReq({
    method: 'POST',
    headers: {},
    body: {
      messages: [{ role: 'user', content: 'Hello' }],
      role: 'FDE',
      dayNumber: 11
    }
  });
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload?.error, 'Unauthorized');
  assert.match(res.payload?.message || '', /Missing authorization token/i);
});
