import { ab as head, e as escape_html } from "../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let notifications = [];
    head("1ce0uvz", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Notifications · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell"><div class="breadcrumb">Faculty workspace <span>/</span> Notifications</div> <div class="page-heading"><div><div class="eyebrow">Faculty reporting system</div> <h1>Notifications</h1> <p>Recent activity from your reporting workspace.</p></div> <div class="notification-actions svelte-1ce0uvz"><span class="period-chip">${escape_html(notifications.length)} event${escape_html(notifications.length === 1 ? "" : "s")}</span>`);
    if (notifications.some((n) => !n.is_read)) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="mark-all svelte-1ce0uvz">Mark all as read</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> <section class="notice-list svelte-1ce0uvz">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty-notifications svelte-1ce0uvz"><strong class="svelte-1ce0uvz">Loading…</strong></div>`);
    }
    $$renderer2.push(`<!--]--></section></main>`);
  });
}
export {
  _page as default
};
