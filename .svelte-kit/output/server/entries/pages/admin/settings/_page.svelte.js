import { a6 as head, a8 as attr } from "../../../../chunks/index.js";
function _page($$renderer) {
  let kind = "Monthly";
  let deadline = "31";
  let year = "2026";
  head("1gjcsm", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Reporting periods · Faculty Reporting System</title>`);
    });
  });
  $$renderer.push(`<main class="shell app-shell"><header class="topbar"><a class="brand" href="/">FR<span>·</span>S</a><div class="topbar-user">Admin workspace <span class="avatar warm">AD</span></div></header><div class="eyebrow">Administration · Configuration</div><div class="page-heading"><div><h1>Reporting periods</h1><p>Configure the period faculty see in their reporting workspace.</p></div></div>`);
  {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--><section class="settings-panel svelte-1gjcsm"><div class="setting-head svelte-1gjcsm"><div><h2 class="svelte-1gjcsm">Current period</h2><p class="svelte-1gjcsm">July 2026 is open for faculty submissions.</p></div><span class="status submitted svelte-1gjcsm">Open</span></div><div class="settings-grid svelte-1gjcsm"><label class="svelte-1gjcsm">Period type`);
  $$renderer.select(
    { value: kind, class: "" },
    ($$renderer2) => {
      $$renderer2.option({}, ($$renderer3) => {
        $$renderer3.push(`Monthly`);
      });
      $$renderer2.option({}, ($$renderer3) => {
        $$renderer3.push(`Weekly`);
      });
    },
    "svelte-1gjcsm"
  );
  $$renderer.push(`</label><label class="svelte-1gjcsm">Year<input${attr("value", year)} class="svelte-1gjcsm"/></label><label class="svelte-1gjcsm">Deadline day<input type="number" min="1" max="31"${attr("value", deadline)} class="svelte-1gjcsm"/></label></div><div class="settings-actions svelte-1gjcsm"><button class="quiet svelte-1gjcsm">Reset</button><button class="approve svelte-1gjcsm">Save settings</button></div></section><section class="period-history svelte-1gjcsm"><h2 class="svelte-1gjcsm">Recent periods</h2><div class="svelte-1gjcsm"><span>June 2026</span><span class="status approved svelte-1gjcsm">Closed · 42 reports</span></div><div class="svelte-1gjcsm"><span>May 2026</span><span class="status approved svelte-1gjcsm">Closed · 42 reports</span></div></section></main>`);
}
export {
  _page as default
};
