

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.DAl5RId8.js","_app/immutable/chunks/BwpxttFb.js","_app/immutable/chunks/DfOrqLGW.js","_app/immutable/chunks/DBCRp3jW.js"];
export const stylesheets = [];
export const fonts = [];
