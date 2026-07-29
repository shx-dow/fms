import { a6 as head, e as escape_html, a7 as ensure_array_like, ab as bind_props } from "../../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let data = $$props["data"];
    head("10p4tb2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Printable faculty report · ${escape_html(data.report.period_label)}</title>`);
      });
    });
    $$renderer2.push(`<main class="print-page svelte-10p4tb2"><header class="svelte-10p4tb2"><div class="kicker svelte-10p4tb2">Faculty Reporting System</div><h1 class="svelte-10p4tb2">Faculty Weekly Report</h1><p class="svelte-10p4tb2">Reporting period: ${escape_html(data.report.period_label)}</p><div class="person svelte-10p4tb2"><span><b class="svelte-10p4tb2">Faculty role</b> Faculty member</span><span><b class="svelte-10p4tb2">Department</b> Assigned department</span><span><b class="svelte-10p4tb2">Report status</b> ${escape_html(data.report.status)}</span></div></header><section class="svelte-10p4tb2"><h2 class="svelte-10p4tb2">1. Teaching &amp; academic delivery</h2><table class="svelte-10p4tb2"><thead><tr><th class="svelte-10p4tb2">Course</th><th class="svelte-10p4tb2">Program / level</th><th class="svelte-10p4tb2">Scheduled</th><th class="svelte-10p4tb2">Taken</th><th class="svelte-10p4tb2">Missed</th><th class="svelte-10p4tb2">Syllabus</th></tr></thead><tbody>`);
    if (data.teaching.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(data.teaching);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-10p4tb2">${escape_html(item.course_code)} · ${escape_html(item.course_name)}</td><td class="svelte-10p4tb2">${escape_html(item.program_level)}</td><td class="svelte-10p4tb2">${escape_html(item.scheduled)}</td><td class="svelte-10p4tb2">${escape_html(item.conducted)}</td><td class="svelte-10p4tb2">${escape_html(item.missed)}</td><td class="svelte-10p4tb2">${escape_html(item.syllabus_completion ?? 0)}%</td></tr>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<tr><td colspan="6" class="svelte-10p4tb2">No teaching records entered.</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></section><section class="svelte-10p4tb2"><h2 class="svelte-10p4tb2">2. Weekly summary</h2><p class="svelte-10p4tb2">${escape_html(data.report.summary || "No weekly summary entered.")}</p></section><footer class="svelte-10p4tb2">Generated from Faculty Reporting System · ${escape_html(data.report.period_label)}</footer></main>`);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
