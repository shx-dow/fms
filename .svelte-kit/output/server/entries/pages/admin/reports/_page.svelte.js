import { a5 as head } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("floxyk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Review queue · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell review-shell">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-panel svelte-floxyk"><span class="spinner svelte-floxyk"></span><span>Loading review queue…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
