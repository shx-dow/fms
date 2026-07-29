import { ab as head, e as escape_html } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let reports = [];
    head("floxyk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Review queue · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell"><header class="dash-header svelte-floxyk"><div><h1 class="svelte-floxyk">Review queue</h1> <span class="dash-period svelte-floxyk">${escape_html(reports.length)} report${escape_html(reports.length === 1 ? "" : "s")}</span></div> <div class="dash-actions svelte-floxyk"><a class="act-link svelte-floxyk" href="/api/reviews?format=csv" target="_blank">CSV</a> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="dash-loading svelte-floxyk"><span class="spinner svelte-floxyk"></span><span>Loading…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
