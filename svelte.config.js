import 'dotenv/config';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // Allow a trusted intranet deployment to opt out when Windows/WSL
    // forwarding rewrites the Host header independently of browser Origin.
    csrf: { checkOrigin: process.env.CSRF_CHECK_ORIGIN !== 'false' }
  }
};

export default config;
