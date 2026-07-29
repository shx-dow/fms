import { s as slot, a as attr_class } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    if (page.url.pathname === "/login" || page.url.pathname.includes("/print")) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="app-frame"><aside class="app-sidebar"><a class="institution-brand" href="/dashboard"><span class="crest">U</span><span><strong>University</strong><small>Faculty Reporting</small></span></a> <div class="sidebar-label">Workspace</div> <nav class="sidebar-nav"><a href="/dashboard"${attr_class("", void 0, { "active": page.url.pathname === "/dashboard" })}><span>▦</span>Dashboard</a> <a href="/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/reports") })}><span>▤</span>My reports</a> <a href="/notifications"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/notifications") })}><span>◌</span>Notifications <b>3</b></a></nav> <div class="sidebar-label sidebar-label-admin">Administration</div> <nav class="sidebar-nav"><a href="/admin"${attr_class("", void 0, { "active": page.url.pathname === "/admin" })}><span>◈</span>Department overview</a> <a href="/admin/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/reports") })}><span>☷</span>Review queue</a> <a href="/admin/settings"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/settings") })}><span>⚙</span>Reporting periods</a> <a href="/admin/audit"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/audit") })}><span>≡</span>Audit history</a></nav> <div class="sidebar-footer"><div class="security-note"><span>●</span><div><strong>Internal system</strong><small>University network</small></div></div><a class="logout-link" href="/logout">Sign out</a></div></aside> <div class="app-main"><div class="mobile-bar"><a class="institution-brand" href="/dashboard"><span class="crest">U</span><strong>Faculty Reporting</strong></a><a href="/logout">Sign out</a></div><!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
