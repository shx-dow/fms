import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.oEI1MxYD.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/xRLw6aK5.js","_app/immutable/chunks/CEoBl3oe.js"];
export const stylesheets = [];
export const fonts = [];
