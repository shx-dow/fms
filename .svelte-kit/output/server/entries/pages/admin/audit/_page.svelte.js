import { a6 as head, a7 as ensure_array_like, e as escape_html } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let events = [];
    head("5hb2v4", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Audit history · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb">Administration <span>/</span> Audit history</div><div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Audit history</h1><p>Important report and authorization actions recorded by the system.</p></div></div><section class="audit-panel svelte-5hb2v4"><table class="svelte-5hb2v4"><thead><tr><th class="svelte-5hb2v4">Time</th><th class="svelte-5hb2v4">Actor</th><th class="svelte-5hb2v4">Action</th><th class="svelte-5hb2v4">Entity</th><th class="svelte-5hb2v4">Reference</th></tr></thead><tbody>`);
    if (!events.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<tr><td colspan="5" class="svelte-5hb2v4">No audit events have been recorded.</td></tr>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array = ensure_array_like(events);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let event = each_array[$$index];
      $$renderer2.push(`<tr><td class="svelte-5hb2v4">${escape_html(new Date(event.created_at).toLocaleString())}</td><td class="svelte-5hb2v4">${escape_html(event.actor_name ?? "System")}</td><td class="svelte-5hb2v4"><span class="audit-action svelte-5hb2v4">${escape_html(event.action)}</span></td><td class="svelte-5hb2v4">${escape_html(event.entity_type)}</td><td class="svelte-5hb2v4">${escape_html(event.entity_id)}</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></section></main>`);
  });
}
export {
  _page as default
};
