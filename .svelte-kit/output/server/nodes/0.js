import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.BtfFf8Q1.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/CJdaaa5S.js","_app/immutable/chunks/CoS3lE0R.js","_app/immutable/chunks/BiWaX3KG.js","_app/immutable/chunks/BKYKkfB3.js","_app/immutable/chunks/DePP_VVu.js","_app/immutable/chunks/qq2QtYx8.js","_app/immutable/chunks/CFjaniJo.js","_app/immutable/chunks/DPLS2WXH.js","_app/immutable/chunks/NndvLG7u.js","_app/immutable/chunks/B5PATZA1.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/DJ_iecmg.js"];
export const stylesheets = ["_app/immutable/assets/0.YlVrKIAj.css"];
export const fonts = [];
