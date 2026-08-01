import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './auth';

describe('password hashing', () => {
  it('round-trips a password', () => {
    const hash = hashPassword('s3cret!');
    expect(hash).toContain(':');
    expect(verifyPassword('s3cret!', hash)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const hash = hashPassword('right-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces unique hashes for the same password', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('rejects a malformed stored hash', () => {
    expect(verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
  });
});
