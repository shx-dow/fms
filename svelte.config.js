import 'dotenv/config';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Origins allowed to POST alongside the request's own origin. A trusted intranet
 * deployment behind Windows/WSL port forwarding can list its extra hostnames here
 * instead of disabling the origin check outright.
 */
const trustedOrigins = (process.env.CSRF_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csrf: { trustedOrigins }
  }
};

export default config;
