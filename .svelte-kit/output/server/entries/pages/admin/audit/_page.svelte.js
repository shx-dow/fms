import { ab as head, e as escape_html } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let events = [];
    head("5hb2v4", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Audit history · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell"><header class="dash-header svelte-5hb2v4"><div><h1 class="svelte-5hb2v4">Audit history</h1> <span class="dash-period svelte-5hb2v4">${escape_html(events.length)} event${escape_html(events.length === 1 ? "" : "s")}</span></div></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="dash-loading svelte-5hb2v4"><span class="spinner svelte-5hb2v4"></span><span>Loading…</span></div>`);
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
