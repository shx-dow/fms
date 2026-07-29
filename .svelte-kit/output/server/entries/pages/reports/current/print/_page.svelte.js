import { ab as head, e as escape_html, b as ensure_array_like } from "../../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const r = data.report;
    head("10p4tb2", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Printable faculty report · ${escape_html(r.period_label)}</title>`);
      });
    });
    $$renderer2.push(`<main class="print-page svelte-10p4tb2"><header class="svelte-10p4tb2"><div class="kicker svelte-10p4tb2">Faculty Reporting System</div> <h1 class="svelte-10p4tb2">Faculty Weekly Report</h1> <p class="svelte-10p4tb2">Reporting period: ${escape_html(r.period_label)}</p> <div class="person svelte-10p4tb2"><span class="svelte-10p4tb2"><b class="svelte-10p4tb2">Faculty</b> ${escape_html(r.faculty_name ?? "Faculty member")}</span><span class="svelte-10p4tb2"><b class="svelte-10p4tb2">Department</b> Computer Science and Engineering</span><span class="svelte-10p4tb2"><b class="svelte-10p4tb2">Status</b> ${escape_html(r.status)}</span><span class="svelte-10p4tb2"><b class="svelte-10p4tb2">Submitted</b> ${escape_html(r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "Not submitted")}</span><span class="svelte-10p4tb2"><b class="svelte-10p4tb2">Completion</b> ${escape_html(r.completion ?? 0)}%</span></div></header> <section class="svelte-10p4tb2"><h2 class="svelte-10p4tb2">1. Teaching &amp; academic delivery</h2> `);
    if (data.teaching.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<table class="svelte-10p4tb2"><thead><tr><th class="svelte-10p4tb2">Course</th><th class="svelte-10p4tb2">Program</th><th class="svelte-10p4tb2">Type</th><th class="svelte-10p4tb2">Scheduled</th><th class="svelte-10p4tb2">Taken</th><th class="svelte-10p4tb2">Missed</th><th class="svelte-10p4tb2">Action</th><th class="svelte-10p4tb2">Syllabus</th></tr></thead><tbody><!--[-->`);
      const each_array = ensure_array_like(data.teaching);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-10p4tb2">${escape_html(item.course_code)} · ${escape_html(item.course_name)}</td><td class="svelte-10p4tb2">${escape_html(item.program_level)}</td><td class="svelte-10p4tb2">${escape_html(item.class_type)}</td><td class="svelte-10p4tb2">${escape_html(item.scheduled)}</td><td class="svelte-10p4tb2">${escape_html(item.conducted)}</td><td class="svelte-10p4tb2">${escape_html(item.missed)}</td><td class="svelte-10p4tb2">${escape_html(item.missed_action || "—")}</td><td class="svelte-10p4tb2">${escape_html(item.syllabus_completion ?? 0)}%</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="svelte-10p4tb2">No teaching records entered.</p>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="svelte-10p4tb2"><h2 class="svelte-10p4tb2">2. Weekly summary</h2> <div class="summary-box svelte-10p4tb2">${escape_html(r.summary || "No weekly summary entered.")}</div></section> `);
    if (data.reviews.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="svelte-10p4tb2"><h2 class="svelte-10p4tb2">3. Review history</h2> <!--[-->`);
      const each_array_1 = ensure_array_like(data.reviews);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let rv = each_array_1[$$index_1];
        $$renderer2.push(`<div class="review-line svelte-10p4tb2"><span class="rv-decision svelte-10p4tb2">${escape_html(rv.decision)}</span><strong>${escape_html(rv.reviewer_name)}</strong><span>· ${escape_html(new Date(rv.created_at).toLocaleDateString())}</span>`);
        if (rv.remarks) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="svelte-10p4tb2">${escape_html(rv.remarks)}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <footer class="svelte-10p4tb2">Generated from Faculty Reporting System · ${escape_html(r.period_label)} · ${escape_html((/* @__PURE__ */ new Date()).toLocaleDateString())}</footer></main>`);
  });
}
export {
  _page as default
};
