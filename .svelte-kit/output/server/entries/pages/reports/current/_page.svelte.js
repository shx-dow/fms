import { ab as head, e as escape_html, b as attr_class, i as attr, ae as attr_style, ad as stringify, a as ensure_array_like, d as derived } from "../../../../chunks/index.js";
import { o as onDestroy, s as show } from "../../../../chunks/toast.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let activeSection = "teaching";
    let savedAt = "";
    let saveTimer;
    let periodLabel = "Current week";
    let reportId = "";
    let teaching = [
      {
        courseCode: "",
        courseName: "",
        programLevel: "",
        classType: "Lecture",
        scheduled: 0,
        conducted: 0,
        missed: 0,
        missedAction: "",
        syllabusCompletion: 0
      }
    ];
    let weeklySummary = "";
    let saving = false;
    let reviews = [];
    let attachments = [];
    let scheduled = derived(() => teaching.reduce((s, i) => s + Number(i.scheduled || 0), 0));
    let conducted = derived(() => teaching.reduce((s, i) => s + Number(i.conducted || 0), 0));
    let deliveryRate = derived(() => scheduled() ? Math.round(conducted() / scheduled() * 100) : 0);
    let hasValidTeaching = derived(() => teaching.some((i) => i.courseCode?.trim() && i.courseName?.trim()));
    let teachingValid = derived(() => teaching.every((i) => {
      if (!i.courseCode?.trim() && !i.courseName?.trim()) return true;
      return Number(i.conducted ?? 0) <= Number(i.scheduled ?? 0);
    }));
    let completion = derived(() => Math.min(100, Math.round((hasValidTeaching() ? 40 : 0) + (hasValidTeaching() && scheduled() > 0 ? 20 : 0) + (weeklySummary?.trim() ? 30 : 0) + (hasValidTeaching() && teachingValid() && weeklySummary?.trim() ? 10 : 0))));
    let isReadonly = derived(() => false);
    let statusClass = derived(() => "draft");
    let statusLabel = derived(() => "Draft");
    onDestroy(() => clearTimeout(saveTimer));
    function flashSaved() {
      clearTimeout(saveTimer);
      savedAt = "Saved";
      saveTimer = setTimeout(
        () => {
          savedAt = "";
        },
        2e3
      );
    }
    async function saveDraft(_e, status = "DRAFT") {
      if (saving) return false;
      saving = true;
      clearTimeout(saveTimer);
      savedAt = "Saving...";
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportId,
          teaching,
          summary: weeklySummary,
          completion: completion(),
          status
        })
      });
      const d = await res.json().catch(() => ({}));
      saving = false;
      if (!res.ok) {
        show(d.error ?? "Save failed", "err");
        return false;
      }
      if (res.ok) flashSaved();
      else savedAt = "Save failed";
      return res.ok;
    }
    head("1ezplda", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Report · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell svelte-1ezplda">`);
    if (isReadonly()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="state-banner locked svelte-1ezplda"><strong>Report ${escape_html("approved")}.</strong> <span>${escape_html("No further action needed.")}</span> <a href="/dashboard" class="svelte-1ezplda">Back to dashboard →</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <header class="editor-head svelte-1ezplda"><div class="editor-head-left svelte-1ezplda"><h1 class="svelte-1ezplda">Report</h1> <span class="head-period svelte-1ezplda">${escape_html(periodLabel)}</span> <span${attr_class(`status-pill ${statusClass()}`, "svelte-1ezplda")}>${escape_html(statusLabel())} · ${escape_html(completion())}%</span></div> <div class="editor-actions svelte-1ezplda"><span class="save-note svelte-1ezplda">${escape_html(savedAt)}</span> <a class="act-link svelte-1ezplda"${attr("href", `/api/reports/${stringify(reportId)}/pdf`)} target="_blank">PDF</a> <a class="act-link svelte-1ezplda" href="/api/reports/current/export">CSV</a> `);
    if (!isReadonly()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="act-link svelte-1ezplda">${escape_html("Preview")}</button> <button class="act-submit svelte-1ezplda"${attr("disabled", saving, true)}>Submit →</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></header> <div class="progress-track svelte-1ezplda"><i${attr_style(`width:${stringify(completion())}%`)} class="svelte-1ezplda"></i></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (reviews.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<details class="review-box svelte-1ezplda"><summary class="svelte-1ezplda">Review history (${escape_html(reviews.length)})</summary> <!--[-->`);
      const each_array = ensure_array_like(reviews);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let rv = each_array[$$index];
        $$renderer2.push(`<div class="review-row svelte-1ezplda"><span${attr_class("review-pill svelte-1ezplda", void 0, {
          "rv-ok": rv.decision === "APPROVED",
          "rv-chg": rv.decision === "CHANGES_REQUIRED"
        })}>${escape_html(rv.decision === "APPROVED" ? "Approved" : "Changes")}</span> <div class="review-body svelte-1ezplda"><strong class="svelte-1ezplda">${escape_html(rv.reviewer_name)}</strong> <span class="review-date svelte-1ezplda">${escape_html(new Date(rv.created_at).toLocaleString())}</span> `);
        if (rv.remarks) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="svelte-1ezplda">${escape_html(rv.remarks)}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]--></details>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="editor-layout svelte-1ezplda"><nav class="section-nav svelte-1ezplda"><button${attr_class("svelte-1ezplda", void 0, { "active": activeSection === "teaching" })}><span class="sn-num svelte-1ezplda">01</span> Teaching &amp; delivery <span class="sn-count svelte-1ezplda">${escape_html(teaching.length)}</span></button> <button${attr_class("svelte-1ezplda", void 0, { "active": activeSection === "summary" })}><span class="sn-num svelte-1ezplda">02</span> Weekly summary <span class="sn-count svelte-1ezplda">${escape_html("0")}</span></button> <button${attr_class("svelte-1ezplda", void 0, { "active": activeSection === "additional" })}><span class="sn-num svelte-1ezplda">03</span> Evidence &amp; records <span class="sn-count svelte-1ezplda">${escape_html(attachments.length)}</span></button></nav> <section class="form-area svelte-1ezplda">`);
    if (isReadonly()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="preview-paper svelte-1ezplda"><div class="preview-kicker svelte-1ezplda">Faculty weekly report · ${escape_html(periodLabel)}</div> <h2 class="svelte-1ezplda">Teaching &amp; academic delivery</h2> `);
      const each_array_1 = ensure_array_like(teaching);
      if (each_array_1.length !== 0) {
        $$renderer2.push("<!--[-->");
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let item = each_array_1[$$index_1];
          $$renderer2.push(`<div class="preview-row svelte-1ezplda"><strong class="svelte-1ezplda">${escape_html(item.courseCode || "Untitled")}</strong> <span>${escape_html(item.courseName || "Course name pending")}</span> <span class="preview-stat svelte-1ezplda">${escape_html(item.conducted)} / ${escape_html(item.scheduled)} classes · ${escape_html(item.syllabusCompletion)}% syllabus</span></div>`);
        }
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="empty svelte-1ezplda">No teaching records.</p>`);
      }
      $$renderer2.push(`<!--]--> <h2 class="svelte-1ezplda">Weekly summary</h2> <div class="preview-text svelte-1ezplda">${escape_html("No summary entered.")}</div></div>`);
    } else {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`<div class="section-top svelte-1ezplda"><h2 class="svelte-1ezplda">Teaching &amp; academic delivery</h2> <span class="metric-badge svelte-1ezplda">${escape_html(deliveryRate())}% delivery</span></div> <div class="course-list svelte-1ezplda"><!--[-->`);
      const each_array_3 = ensure_array_like(teaching);
      for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
        let item = each_array_3[i];
        $$renderer2.push(`<div class="course-card svelte-1ezplda"><div class="course-head svelte-1ezplda"><strong class="svelte-1ezplda">Course ${escape_html(i + 1)}</strong> `);
        if (teaching.length > 1) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="act-remove svelte-1ezplda">Remove</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="field-grid svelte-1ezplda"><label class="svelte-1ezplda">Course code<input${attr("value", item.courseCode)} placeholder="CSE-301" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Course name<input${attr("value", item.courseName)} placeholder="Database Management Systems" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Program / level<input${attr("value", item.programLevel)} placeholder="B.Tech · III Year" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Class type`);
        $$renderer2.select(
          { value: item.classType, onchange: saveDraft, class: "" },
          ($$renderer3) => {
            $$renderer3.option({}, ($$renderer4) => {
              $$renderer4.push(`Lecture`);
            });
            $$renderer3.option({}, ($$renderer4) => {
              $$renderer4.push(`Lab`);
            });
            $$renderer3.option({}, ($$renderer4) => {
              $$renderer4.push(`Tutorial`);
            });
            $$renderer3.option({}, ($$renderer4) => {
              $$renderer4.push(`Seminar`);
            });
          },
          "svelte-1ezplda"
        );
        $$renderer2.push(`</label></div> <div class="number-grid svelte-1ezplda"><label class="svelte-1ezplda">Scheduled<input type="number" min="0"${attr("value", item.scheduled)} placeholder="0" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Conducted<input type="number" min="0"${attr("value", item.conducted)} placeholder="0" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Missed<input type="number" min="0"${attr("value", item.missed)} placeholder="0" class="svelte-1ezplda"/></label> <label class="svelte-1ezplda">Syllabus %<input type="number" min="0" max="100"${attr("value", item.syllabusCompletion)} placeholder="0" class="svelte-1ezplda"/></label></div> <label class="missed-label svelte-1ezplda">Action taken for missed classes<input${attr("value", item.missedAction)} placeholder="e.g. Makeup class scheduled" class="svelte-1ezplda"/></label></div>`);
      }
      $$renderer2.push(`<!--]--> <button class="act-add svelte-1ezplda">+ Add course</button></div>`);
    }
    $$renderer2.push(`<!--]--></section></div></main>`);
  });
}
export {
  _page as default
};
