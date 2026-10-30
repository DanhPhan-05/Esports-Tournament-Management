import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middlewares/auth.js';
import { authorize } from '../src/middlewares/authorize.js';

process.env.COOKIE_SECRET = 'test-cookie-secret-long-enough';
const { default: app } = await import('../src/app.js');

test('health and CSRF endpoints return expected shape', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const csrf = await fetch(`${base}/api/csrf`);
    assert.equal(csrf.status, 200);
    const token = (await csrf.json()).csrfToken;
    assert.ok(token.length > 30);
    const cookies = csrf.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    assert.match(cookies, /csrf_session=/);
    assert.match(cookies, /etm\.csrf=/);
    const missing = await fetch(`${base}/api/missing`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
    const unsafe = await fetch(`${base}/api/missing`, { method: 'POST' });
    assert.equal(unsafe.status, 403);
    assert.equal((await unsafe.json()).error.code, 'INVALID_CSRF');
    const valid = await fetch(`${base}/api/missing`, { method: 'POST', headers: { cookie: cookies, 'x-csrf-token': token } });
    assert.equal(valid.status, 404);
  } finally { server.close(); }
});

test('JWT guard and role authorization', () => {
  process.env.JWT_SECRET = 'test-secret-long-enough';
  const token = jwt.sign({ sub: 'account-1', role: 'Administrator' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  const req = { get: () => `Bearer ${token}`, cookies: {} };
  let error;
  requireAuth(req, null, (value) => { error = value; });
  assert.equal(error, undefined);
  assert.deepEqual(req.user, { id: 'account-1', role: 'Administrator' });
  authorize('Administrator')(req, null, (value) => { error = value; });
  assert.equal(error, undefined);
  authorize('Customer')(req, null, (value) => { error = value; });
  assert.equal(error.status, 403);
});
