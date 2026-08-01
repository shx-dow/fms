import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      $lib: `${root}src/lib`,
      '$env/dynamic/private': `${root}src/test/env-dynamic-private.ts`,
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: [`${root}src/test/setup.ts`],
  },
});
