import { ab as head } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("2pp8mk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>My reports · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-panel svelte-2pp8mk"><span class="spinner svelte-2pp8mk"></span><span>Loading reports…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
