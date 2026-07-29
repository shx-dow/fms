import { a5 as head } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head("2pp8mk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Reports · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb svelte-2pp8mk">Faculty workspace <span class="svelte-2pp8mk">/</span> Reports</div><div class="page-heading"><div><div class="eyebrow">Faculty portal</div><h1>Report history</h1><p>Draft, submit and revisit your activity reports.</p></div><a class="button" href="/reports/current">Open current report <span>→</span></a></div>`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-state svelte-2pp8mk"><span class="spinner svelte-2pp8mk"></span><span>Loading reports…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
