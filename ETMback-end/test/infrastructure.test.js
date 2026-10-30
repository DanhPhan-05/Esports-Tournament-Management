import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { requireAuth } from '../src/middlewares/auth.js';
import { authorize } from '../src/middlewares/authorize.js';

test('health and CSRF endpoints return expected shape', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const csrf = await fetch(`${base}/api/csrf`);
    assert.equal(csrf.status, 200);
    assert.match((await csrf.json()).csrfToken, /^[a-f0-9]{64}$/);
    assert.match(csrf.headers.get('set-cookie'), /csrf_token=/);
    const missing = await fetch(`${base}/api/missing`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
    const unsafe = await fetch(`${base}/api/missing`, { method: 'POST' });
    assert.equal(unsafe.status, 403);
    assert.equal((await unsafe.json()).error.code, 'INVALID_CSRF');
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
