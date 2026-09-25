import { describe, expect, it } from 'vitest';
import { seedAllowed } from './local-db';

const ENV_KEYS = ['NODE_ENV', 'ALLOW_PRODUCTION_SEED'] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => void) {
  const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const key of ENV_KEYS) delete process.env[key];
    for (const [key, value] of saved) {
      if (value !== undefined) process.env[key] = value;
    }
  }
}

describe('seedAllowed', () => {
  it('allows seeding outside production', () => {
    withEnv({ NODE_ENV: 'development' }, () => expect(seedAllowed()).toBe(true));
    withEnv({ NODE_ENV: 'test' }, () => expect(seedAllowed()).toBe(true));
    withEnv({}, () => expect(seedAllowed()).toBe(true));
  });

  it('refuses seeding in production by default', () => {
    withEnv({ NODE_ENV: 'production' }, () => expect(seedAllowed()).toBe(false));
  });

  it('allows an explicit production bootstrap opt-in', () => {
    withEnv({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: '1' }, () => expect(seedAllowed()).toBe(true));
  });

  it('treats any other opt-in value as not allowed', () => {
    withEnv({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' }, () => expect(seedAllowed()).toBe(false));
    withEnv({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'yes' }, () => expect(seedAllowed()).toBe(false));
  });
});
