import { a5 as head } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("x1i5gj", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dashboard · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell formal-dashboard"><div class="breadcrumb svelte-x1i5gj">Faculty workspace <span class="svelte-x1i5gj">/</span> Dashboard</div> <section class="formal-header svelte-x1i5gj"><div><div class="eyebrow">Faculty reporting system</div><h1 class="svelte-x1i5gj">Dashboard</h1><p class="svelte-x1i5gj">Reporting overview for Faculty member, Department of Computer Science and Engineering.</p></div><div class="header-meta svelte-x1i5gj"><span>Academic year</span><strong class="svelte-x1i5gj">2026–27</strong></div></section> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-panel svelte-x1i5gj"><span class="spinner svelte-x1i5gj"></span><span>Loading dashboard…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
