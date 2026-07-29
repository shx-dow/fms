import { a5 as head } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("1gjcsm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Reporting periods · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb svelte-1gjcsm">Administration <span class="svelte-1gjcsm">/</span> Reporting periods</div><div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Reporting periods</h1><p>Configure the weekly reporting window and submission deadline.</p></div></div>`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-panel svelte-1gjcsm"><span class="spinner svelte-1gjcsm"></span><span>Loading periods…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
