import { a6 as head, e as escape_html, a7 as ensure_array_like, a as attr_class } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let reports = [];
    let selected = null;
    head("floxyk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Review queue · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell review-shell"><header class="topbar"><a class="brand" href="/">FR<span>·</span>S</a><div class="topbar-user">HOD workspace <span class="avatar warm">HOD</span></div></header><div class="eyebrow">Review workspace · Weekly reports</div><div class="page-heading"><div><h1>Review queue</h1><p>Review submitted weekly reports for the assigned department.</p></div><span class="period-chip">${escape_html(reports.length)} report${escape_html(reports.length === 1 ? "" : "s")}</span></div><div class="review-layout svelte-floxyk"><section class="queue svelte-floxyk"><div class="queue-heading svelte-floxyk">Reports requiring attention</div>`);
    if (!reports.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="queue-empty svelte-floxyk">No submitted reports are available yet.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array = ensure_array_like(reports);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let report = each_array[$$index];
      $$renderer2.push(`<button${attr_class("svelte-floxyk", void 0, { "chosen": selected?.id === report.id })}><span><strong class="svelte-floxyk">${escape_html(report.faculty_name)}</strong><small class="svelte-floxyk">${escape_html(report.period_label)} · Updated ${escape_html(new Date(report.updated_at).toLocaleDateString())}</small></span><span${attr_class(
        `status ${report.status === "SUBMITTED" ? "submitted" : report.status === "APPROVED" ? "approved" : "changes"}`,
        "svelte-floxyk"
      )}>${escape_html(report.status === "CHANGES_REQUIRED" ? "Changes required" : report.status[0] + report.status.slice(1).toLowerCase())}</span></button>`);
    }
    $$renderer2.push(`<!--]--></section>`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></main>`);
  });
}
export {
  _page as default
};
