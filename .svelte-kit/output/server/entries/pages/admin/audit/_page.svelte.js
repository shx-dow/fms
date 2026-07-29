import { a5 as head, e as escape_html } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let events = [];
    head("5hb2v4", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Audit history · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb svelte-5hb2v4">Administration <span class="svelte-5hb2v4">/</span> Audit history</div><div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Audit history</h1><p>Important report and authorization actions recorded by the system.</p></div><span class="period-chip">${escape_html(events.length)} event${escape_html(events.length === 1 ? "" : "s")}</span></div>`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading-panel svelte-5hb2v4"><span class="spinner svelte-5hb2v4"></span><span>Loading audit history…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
