import { a6 as head, e as escape_html, a9 as attr_style, a7 as ensure_array_like, a as attr_class, a8 as attr, aa as stringify } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let scheduled, conducted, deliveryRate, completion;
    let activeSection = "teaching";
    let savedAt = "Saved just now";
    let saveError = "";
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
    async function saveDraft(_event, status = "DRAFT") {
      savedAt = "Saving…";
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportId,
          teaching,
          summary: weeklySummary,
          completion,
          status
        })
      });
      const data = await response.json().catch(() => ({}));
      saveError = response.ok ? "" : data.error ?? "Save failed";
      savedAt = response.ok ? "Saved to local database" : "Save failed";
      return response.ok;
    }
    scheduled = teaching.reduce((sum, item) => sum + Number(item.scheduled || 0), 0);
    conducted = teaching.reduce((sum, item) => sum + Number(item.conducted || 0), 0);
    deliveryRate = scheduled ? Math.round(conducted / scheduled * 100) : 0;
    completion = Math.min(100, Math.round((teaching.some((item) => item.courseCode && item.courseName) ? 45 : 15) + (scheduled > 0 ? 25 : 0) + 0));
    head("1ezplda", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Current weekly report · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell editor-shell"><header class="topbar"><a class="brand" href="/">FR<span>·</span>S</a><div class="topbar-user">Faculty member <span class="avatar">F</span></div></header> <div class="editor-head"><div><div class="eyebrow">Faculty portal · Week of 27 July 2026</div><h1>Faculty weekly report</h1><p>Record this week’s teaching activity. Research, duties and appraisal are managed separately.</p></div><div class="editor-actions"><span class="save-note"><i></i>${escape_html(savedAt)}</span><a class="quiet" href="/api/reports/current/export">Export CSV</a><button class="quiet">${escape_html("Preview")}</button><button class="submit">Submit report <span>→</span></button></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if (saveError) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="save-error" role="alert">${escape_html(saveError)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="editor-layout"><nav class="section-nav" aria-label="Report sections"><div class="completion"><div><span>Report completion</span><strong>${escape_html(completion)}%</strong></div><div class="track"><i${attr_style(`width:${stringify(completion)}%`)}></i></div></div><!--[-->`);
    const each_array = ensure_array_like([
      {
        id: "teaching",
        label: "Teaching & delivery",
        count: teaching.length
      },
      {
        id: "summary",
        label: "Weekly summary",
        count: 0
      }
    ]);
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let section = each_array[index];
      $$renderer2.push(`<button${attr_class("", void 0, { "active": activeSection === section.id })}><span class="nav-number">0${escape_html(index + 1)}</span><span>${escape_html(section.label)}</span>`);
      if (section.count) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<em>${escape_html(section.count)}</em>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--><div class="scope-note svelte-1ezplda">Research, institutional duties, outreach and appraisal are not part of the weekly submission.</div></nav> <section class="form-area">`);
    {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="section-intro"><div><div class="eyebrow">Section 01</div><h2>Teaching &amp; academic delivery</h2><p>Add every course or class group covered during this week.</p></div><span class="metric-pill">${escape_html(deliveryRate)}% delivery rate</span></div><div class="record-list"><!--[-->`);
      const each_array_2 = ensure_array_like(teaching);
      for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
        let item = each_array_2[index];
        $$renderer2.push(`<article class="record"><div class="record-top"><span class="record-index">Course ${escape_html(index + 1)}</span>`);
        if (teaching.length > 1) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="remove">Remove</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div><div class="field-grid"><label>Course code<input${attr("value", item.courseCode)} placeholder="CSE-301"/></label><label>Course name<input${attr("value", item.courseName)} placeholder="Database Management Systems"/></label><label>Program / level<input${attr("value", item.programLevel)} placeholder="B.Tech · III Year"/></label><label>Class type`);
        $$renderer2.select({ value: item.classType, onchange: saveDraft }, ($$renderer3) => {
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
        });
        $$renderer2.push(`</label></div><div class="number-grid"><label>Total scheduled<input type="number" min="0"${attr("value", item.scheduled)}/></label><label>Classes taken<input type="number" min="0"${attr("value", item.conducted)}/></label><label>Classes missed<input type="number" min="0"${attr("value", item.missed)}/></label><label>Syllabus completion %<input type="number" min="0" max="100"${attr("value", item.syllabusCompletion)}/></label></div><label>Action taken for missed classes<input${attr("value", item.missedAction)} placeholder="Optional"/></label></article>`);
      }
      $$renderer2.push(`<!--]--></div><button class="add-record">+ Add another course</button>`);
    }
    $$renderer2.push(`<!--]--></section></div> <section class="evidence-panel"><div><strong>Supporting evidence</strong><p>Optional PDF, PNG, or JPEG files up to 10 MB.</p></div><label${attr_class("upload-control", void 0, { "disabled": false })}>Upload file<input${attr("disabled", false, true)} type="file" accept="application/pdf,image/png,image/jpeg"/></label>`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section></main>`);
  });
}
export {
  _page as default
};
