import { g as getContext, a as attributes, c as clsx, b as ensure_array_like, d as element, f as derived, s as spread_props, h as attr_class, e as escape_html, i as attr } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
import "clsx";
/**
 * @file
 * @license @lucide/svelte v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
/**
 * @file
 * @license @lucide/svelte v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};
/**
 * @file
 * @license @lucide/svelte v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LucideContext = Symbol("lucide-context");
const getLucideContext = () => getContext(LucideContext);
function Icon($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const globalProps = getLucideContext() ?? {};
    const {
      name,
      color = globalProps.color ?? "currentColor",
      size = globalProps.size ?? 24,
      strokeWidth = globalProps.strokeWidth ?? 2,
      absoluteStrokeWidth = globalProps.absoluteStrokeWidth ?? false,
      iconNode = [],
      children,
      $$slots,
      $$events,
      ...props
    } = $$props;
    const calculatedStrokeWidth = derived(() => absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth);
    $$renderer2.push(`<svg${attributes(
      {
        ...defaultAttributes,
        ...!children && !hasA11yProp(props) && { "aria-hidden": "true" },
        ...props,
        width: size,
        height: size,
        stroke: color,
        "stroke-width": calculatedStrokeWidth(),
        class: clsx([
          "lucide-icon lucide",
          globalProps.class,
          name && `lucide-${name}`,
          props.class
        ])
      },
      void 0,
      void 0,
      void 0,
      3
    )}><!--[-->`);
    const each_array = ensure_array_like(iconNode);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [tag, attrs] = each_array[$$index];
      element($$renderer2, tag, () => {
        $$renderer2.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
      });
    }
    $$renderer2.push(`<!--]-->`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></svg>`);
  });
}
function Layout_dashboard($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      { "width": "7", "height": "9", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "14", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "9", "x": "14", "y": "12", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "3", "y": "16", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([{ name: "layout-dashboard" }, props, { iconNode }]));
}
function File_text($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { "d": "M10 9H8" }],
    ["path", { "d": "M16 13H8" }],
    ["path", { "d": "M16 17H8" }]
  ];
  Icon($$renderer, spread_props([{ name: "file-text" }, props, { iconNode }]));
}
function Calendar_days($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M8 2v4" }],
    ["path", { "d": "M16 2v4" }],
    [
      "rect",
      { "width": "18", "height": "18", "x": "3", "y": "4", "rx": "2" }
    ],
    ["path", { "d": "M3 10h18" }],
    ["path", { "d": "M8 14h.01" }],
    ["path", { "d": "M12 14h.01" }],
    ["path", { "d": "M16 14h.01" }],
    ["path", { "d": "M8 18h.01" }],
    ["path", { "d": "M12 18h.01" }],
    ["path", { "d": "M16 18h.01" }]
  ];
  Icon($$renderer, spread_props([{ name: "calendar-days" }, props, { iconNode }]));
}
function Building_2($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M10 12h4" }],
    ["path", { "d": "M10 8h4" }],
    ["path", { "d": "M14 21v-3a2 2 0 0 0-4 0v3" }],
    [
      "path",
      {
        "d": "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
      }
    ],
    ["path", { "d": "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }]
  ];
  Icon($$renderer, spread_props([{ name: "building-2" }, props, { iconNode }]));
}
function Users($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([{ name: "users" }, props, { iconNode }]));
}
function Git_branch($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M15 6a9 9 0 0 0-9 9V3" }],
    ["circle", { "cx": "18", "cy": "6", "r": "3" }],
    ["circle", { "cx": "6", "cy": "18", "r": "3" }]
  ];
  Icon($$renderer, spread_props([{ name: "git-branch" }, props, { iconNode }]));
}
function Clipboard_check($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      {
        "width": "8",
        "height": "4",
        "x": "8",
        "y": "2",
        "rx": "1",
        "ry": "1"
      }
    ],
    [
      "path",
      {
        "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
      }
    ],
    ["path", { "d": "m9 14 2 2 4-4" }]
  ];
  Icon($$renderer, spread_props([{ name: "clipboard-check" }, props, { iconNode }]));
}
function Cog($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M11 10.27 7 3.34" }],
    ["path", { "d": "m11 13.73-4 6.93" }],
    ["path", { "d": "M12 22v-2" }],
    ["path", { "d": "M12 2v2" }],
    ["path", { "d": "M14 12h8" }],
    ["path", { "d": "m17 20.66-1-1.73" }],
    ["path", { "d": "m17 3.34-1 1.73" }],
    ["path", { "d": "M2 12h2" }],
    ["path", { "d": "m20.66 17-1.73-1" }],
    ["path", { "d": "m20.66 7-1.73 1" }],
    ["path", { "d": "m3.34 17 1.73-1" }],
    ["path", { "d": "m3.34 7 1.73 1" }],
    ["circle", { "cx": "12", "cy": "12", "r": "2" }],
    ["circle", { "cx": "12", "cy": "12", "r": "8" }]
  ];
  Icon($$renderer, spread_props([{ name: "cog" }, props, { iconNode }]));
}
function Rotate_ccw_clock($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      { "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }
    ],
    ["path", { "d": "M3 3v5h5" }],
    ["path", { "d": "M12 7v5l4 2" }]
  ];
  Icon($$renderer, spread_props([{ name: "rotate-ccw-clock" }, props, { iconNode }]));
}
function Panel_left_close($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }
    ],
    ["path", { "d": "M9 3v18" }],
    ["path", { "d": "m16 15-3-3 3-3" }]
  ];
  Icon($$renderer, spread_props([{ name: "panel-left-close" }, props, { iconNode }]));
}
function Bell($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M10.268 21a2 2 0 0 0 3.464 0" }],
    [
      "path",
      {
        "d": "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
      }
    ]
  ];
  Icon($$renderer, spread_props([{ name: "bell" }, props, { iconNode }]));
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, children } = $$props;
    let sidebarCollapsed = false;
    const user = derived(() => data.user);
    const roleLabel = derived(() => user()?.role === "ADMIN" ? "Administrator" : user()?.role === "HOD" ? "HOD" : "Faculty");
    const avatarLetter = derived(() => user()?.name?.charAt(0)?.toUpperCase() ?? "U");
    if (page.url.pathname === "/login" || page.url.pathname.includes("/print")) {
      $$renderer2.push("<!--[0-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div${attr_class("app-frame svelte-12qhfyh", void 0, { "sidebar-collapsed": sidebarCollapsed })}><aside class="app-sidebar svelte-12qhfyh"><a class="institution-brand" href="/dashboard"><span class="crest">I</span><span><strong>ICFAI University</strong><small>Faculty Reporting · Jaipur</small></span></a> <div class="sidebar-body"><div class="sidebar-label">Workspace</div> <nav class="sidebar-nav"><a href="/dashboard"${attr_class("", void 0, { "active": page.url.pathname === "/dashboard" })}>`);
      Layout_dashboard($$renderer2, { size: 18 });
      $$renderer2.push(`<!----><span class="nav-label">Dashboard</span></a> <a href="/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/reports") })}>`);
      File_text($$renderer2, { size: 18 });
      $$renderer2.push(`<!----><span class="nav-label">My reports</span></a> <a href="/calendar"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/calendar") })}>`);
      Calendar_days($$renderer2, { size: 18 });
      $$renderer2.push(`<!----><span class="nav-label">Report calendar</span></a></nav> `);
      if (user()?.role === "HOD" || user()?.role === "ADMIN") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="sidebar-label sidebar-label-admin">Administration</div> <nav class="sidebar-nav"><a href="/admin"${attr_class("", void 0, { "active": page.url.pathname === "/admin" })}>`);
        Building_2($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Department overview</span></a> <a href="/admin/faculty"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/faculty") })}>`);
        Users($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Faculty directory</span></a> <a href="/admin/departments"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/departments") })}>`);
        Git_branch($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Departments</span></a> <a href="/admin/reports"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/reports") })}>`);
        Clipboard_check($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Review queue</span></a> <a href="/admin/settings"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/settings") })}>`);
        Cog($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Reporting periods</span></a> <a href="/admin/audit"${attr_class("", void 0, { "active": page.url.pathname.startsWith("/admin/audit") })}>`);
        Rotate_ccw_clock($$renderer2, { size: 18 });
        $$renderer2.push(`<!----><span class="nav-label">Audit history</span></a></nav>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="sidebar-footer"><div class="sidebar-user"><span class="sidebar-user-avatar">${escape_html(avatarLetter())}</span> <span class="sidebar-user-info"><strong>${escape_html(user()?.name ?? "User")}</strong><small>${escape_html(roleLabel())}${escape_html(user()?.role === "FACULTY" ? "" : " · " + (user()?.role === "HOD" ? user()?.departmentId : "All departments"))}</small></span></div> <a class="logout-link" href="/logout">Sign out</a></div> <button class="sidebar-toggle svelte-12qhfyh"${attr("aria-label", "Collapse sidebar")}>`);
      {
        $$renderer2.push("<!--[-1-->");
        Panel_left_close($$renderer2, { size: 16 });
      }
      $$renderer2.push(`<!--]--></button></aside> <div class="app-main svelte-12qhfyh"><div class="notif-corner svelte-12qhfyh"><button class="notif-btn svelte-12qhfyh" aria-label="Notifications">`);
      Bell($$renderer2, { size: 20 });
      $$renderer2.push(`<!----> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
