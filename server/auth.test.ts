import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  hashPassword,
  parseCookies,
  verifyPassword,
  verifySessionToken,
} from './auth';

test('hashPassword and verifyPassword validate matching passwords and reject wrong ones', () => {
  const hash = hashPassword('StrongIndustrialPass#2026');
  assert.ok(hash.includes(':'));
  assert.equal(verifyPassword('StrongIndustrialPass#2026', hash), true);
  assert.equal(verifyPassword('WrongPassword', hash), false);
});

test('createSessionToken and verifySessionToken roundtrip and reject tampering', () => {
  const secret = 'test-secret-key-at-least-32-characters-long';
  const token = createSessionToken(
    {
      id: 'admin-1',
      email: 'admin@example-realty.com',
      name: 'Agency Admin',
      role: 'Owner',
    },
    secret
  );

  const decoded = verifySessionToken(token, secret);
  assert.equal(decoded?.email, 'admin@example-realty.com');
  assert.equal(decoded?.role, 'Owner');

  // Tamper signature
  const tampered = `${token.slice(0, -2)}xx`;
  assert.equal(verifySessionToken(tampered, secret), null);

  // Wrong secret
  assert.equal(verifySessionToken(token, 'different-secret'), null);

  // Expired token
  const expired = createSessionToken(
    {
      id: 'admin-1',
      email: 'admin@example-realty.com',
      name: 'Agency Admin',
      role: 'Owner',
    },
    secret,
    -1000
  );
  assert.equal(verifySessionToken(expired, secret), null);
});

test('parseCookies extracts named session cookies safely', () => {
  const cookies = parseCookies('foo=bar; sk_agency_session=abc.123; theme=slate');
  assert.equal(cookies.foo, 'bar');
  assert.equal(cookies.sk_agency_session, 'abc.123');
  assert.equal(cookies.theme, 'slate');
});
