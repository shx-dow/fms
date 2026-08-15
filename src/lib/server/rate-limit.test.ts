import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('rate limiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.consume('ip-1')).toBe(true);
    expect(limiter.consume('ip-1')).toBe(true);
    expect(limiter.consume('ip-1')).toBe(true);
  });

  it('rejects once the limit is exceeded and tracks IPs separately', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(limiter.consume('ip-1')).toBe(true);
    expect(limiter.consume('ip-1')).toBe(true);
    expect(limiter.consume('ip-1')).toBe(false);
    expect(limiter.consume('ip-2')).toBe(true);
  });

  it('resets the window after it expires', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.consume('ip-1')).toBe(true);
    expect(limiter.consume('ip-1')).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(limiter.consume('ip-1')).toBe(true);
    vi.useRealTimers();
  });

  it('clears the count for a key on reset', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.consume('ip-1');
    expect(limiter.consume('ip-1')).toBe(false);
    limiter.reset('ip-1');
    expect(limiter.consume('ip-1')).toBe(true);
  });
});
