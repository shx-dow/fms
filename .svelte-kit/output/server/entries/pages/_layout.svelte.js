import { a as attr_class, e as escape_html, d as derived } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, children } = $$props;
    const user = derived(() => data.user);
    const roleLabel = derived(() => user()?.role === "ADMIN" ? "Administrator" : user()?.role === "HOD" ? "HOD" : "Faculty");
    const avatarLetter = derived(() => user()?.name?.charAt(0)?.toUpperCase() ?? "U");
    if (page.url.pathname === "/login" || page.url.pathname.includes("/print")) {
      $$renderer2.push("<!--[0-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="app-frame"><aside class="app-sidebar"><a class="institution-brand" href="/dashboard"><span class="crest">U</span><span><strong>University</strong><small>Faculty Reporting</small></span></a> <div class="sidebar-label">Workspace</div> <nav class="sidebar-nav"><a href="/dashboard"${attr_class("", void 0, { "active": page.url.pathname === "/dashboard" })}><span>▦</span>Dashboard</a> <a href="/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/reports") })}><span>▤</span>My reports</a> <a href="/calendar"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/calendar") })}><span>▦</span>Report calendar</a> <a href="/notifications"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/notifications") })}><span>◌</span>Notifications `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></a></nav> `);
      if (user()?.role === "HOD" || user()?.role === "ADMIN") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="sidebar-label sidebar-label-admin">Administration</div> <nav class="sidebar-nav"><a href="/admin"${attr_class("", void 0, { "active": page.url.pathname === "/admin" })}><span>◈</span>Department overview</a> <a href="/admin/faculty"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/faculty") })}><span>♙</span>Faculty directory</a> <a href="/admin/departments"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/departments") })}><span>▥</span>Departments</a> <a href="/admin/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/reports") })}><span>☷</span>Review queue</a> <a href="/admin/settings"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/settings") })}><span>⚙</span>Reporting periods</a> <a href="/admin/audit"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/audit") })}><span>≡</span>Audit history</a></nav>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="sidebar-footer"><a class="sidebar-user" href="/dashboard"><span class="sidebar-user-avatar">${escape_html(avatarLetter())}</span> <span class="sidebar-user-info"><strong>${escape_html(user()?.name ?? "User")}</strong><small>${escape_html(roleLabel())}${escape_html(user()?.role === "FACULTY" ? "" : " · " + (user()?.role === "HOD" ? user()?.departmentId : "All departments"))}</small></span></a> <a class="logout-link" href="/logout"><span>→</span>Sign out</a></div></aside> <div class="app-main"><div class="mobile-bar"><a class="institution-brand" href="/dashboard"><span class="crest">U</span><strong>Faculty Reporting</strong></a><a href="/logout">Sign out</a></div>`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
