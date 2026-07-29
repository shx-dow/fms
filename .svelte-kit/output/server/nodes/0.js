import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.Ah7qnTUk.js","_app/immutable/chunks/BwpxttFb.js","_app/immutable/chunks/DfOrqLGW.js","_app/immutable/chunks/CoJRVpV3.js","_app/immutable/chunks/QNJ5kBQP.js","_app/immutable/chunks/CaZpg5yG.js","_app/immutable/chunks/BmWK4-wS.js","_app/immutable/chunks/CUkHuqbE.js","_app/immutable/chunks/DTT9CE4u.js"];
export const stylesheets = ["_app/immutable/assets/0.Dx9UlJbc.css"];
export const fonts = [];
