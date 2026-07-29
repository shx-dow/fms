import { a6 as head, e as escape_html, a7 as ensure_array_like } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let notifications = [];
    const title = (action) => ({
      REPORT_SAVED: "Report draft saved",
      REPORT_SUBMITTED: "Report submitted",
      APPROVED: "Report approved",
      CHANGES_REQUIRED: "Changes requested",
      REPORT_REOPENED: "Report reopened"
    })[action] ?? action.replaceAll("_", " ");
    head("1ce0uvz", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Notifications · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb">Faculty workspace <span>/</span> Notifications</div><div class="page-heading"><div><div class="eyebrow">Faculty reporting system</div><h1>Notifications</h1><p>Recent activity from your reporting workspace.</p></div><span class="period-chip">${escape_html(notifications.length)} event${escape_html(notifications.length === 1 ? "" : "s")}</span></div><section class="notice-list svelte-1ce0uvz">`);
    if (!notifications.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty-notifications svelte-1ce0uvz"><strong class="svelte-1ce0uvz">No notifications yet.</strong><p>Report saves, submissions and review decisions will appear here.</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array = ensure_array_like(notifications);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let notification = each_array[$$index];
      $$renderer2.push(`<article class="notice svelte-1ce0uvz"><span class="notice-dot svelte-1ce0uvz"></span><div><strong class="svelte-1ce0uvz">${escape_html(title(notification.action))}</strong><p class="svelte-1ce0uvz">Reference: ${escape_html(notification.entity_id)}</p><small class="svelte-1ce0uvz">${escape_html(new Date(notification.created_at).toLocaleString())}</small></div>`);
      if (notification.action === "REPORT_SUBMITTED") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<a href="/reports" class="svelte-1ce0uvz">View reports →</a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></article>`);
    }
    $$renderer2.push(`<!--]--></section></main>`);
  });
}
export {
  _page as default
};
