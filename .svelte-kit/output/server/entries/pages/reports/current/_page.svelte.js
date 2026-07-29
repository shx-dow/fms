import { ab as head, e as escape_html, i as attr, b as ensure_array_like, h as attr_class, ad as attr_style, ac as stringify, f as derived } from "../../../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let activeSection = "teaching";
    let savedAt = "Saved just now";
    let saveError = "";
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
    let scheduled = derived(() => teaching.reduce((sum, item) => sum + Number(item.scheduled || 0), 0));
    let conducted = derived(() => teaching.reduce((sum, item) => sum + Number(item.conducted || 0), 0));
    let deliveryRate = derived(() => scheduled() ? Math.round(conducted() / scheduled() * 100) : 0);
    let hasValidTeaching = derived(() => teaching.some((item) => item.courseCode?.trim() && item.courseName?.trim()));
    let teachingValid = derived(() => teaching.every((item) => {
      if (!item.courseCode?.trim() && !item.courseName?.trim()) return true;
      return Number(item.conducted ?? 0) <= Number(item.scheduled ?? 0);
    }));
    let completion = derived(() => Math.min(100, Math.round((hasValidTeaching() ? 40 : 0) + (hasValidTeaching() && scheduled() > 0 ? 20 : 0) + (weeklySummary?.trim() ? 30 : 0) + (hasValidTeaching() && teachingValid() && weeklySummary?.trim() ? 10 : 0))));
    let isReadonly = derived(() => false);
    const fileName = (n) => n.length > 40 ? n.slice(0, 37) + "…" : n;
    async function saveDraft(_event, status = "DRAFT") {
      if (saving) return false;
      saving = true;
      savedAt = "Saving…";
      const response = await fetch("/api/reports", {
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
      const d = await response.json().catch(() => ({}));
      saveError = response.ok ? "" : d.error ?? "Save failed";
      savedAt = response.ok ? "Saved" : "Save failed";
      saving = false;
      return response.ok;
    }
    head("1ezplda", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Current weekly report · Faculty Reporting System</title>`);
      });
    });
    $$renderer2.push(`<main class="shell app-shell editor-shell"><header class="topbar"><a class="brand" href="/">FR<span>·</span>S</a> <div class="topbar-user">${escape_html(data.user?.name ?? "User")} <span class="avatar">${escape_html((data.user?.name ?? "U").slice(0, 1))}</span></div></header> <div class="editor-head"><div><div class="eyebrow">Faculty portal · ${escape_html(periodLabel)}</div> <h1>Faculty weekly report</h1> <p>${escape_html(isReadonly() ? "This report is locked and cannot be edited." : "Record this week's teaching activity. Research, duties and appraisal are managed separately.")}</p></div> <div class="editor-actions">`);
    if (!isReadonly()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="save-note"><i></i>${escape_html(savedAt)}</span> <a class="quiet"${attr("href", `/api/reports/${stringify(reportId)}/pdf`)} target="_blank">Export PDF</a> <a class="quiet" href="/api/reports/current/export">Export CSV</a> <button class="quiet">${escape_html("Preview")}</button> <button class="submit"${attr("disabled", saving, true)}>Submit report <span>→</span></button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (isReadonly()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="locked-banner" role="status"><strong>Report ${escape_html("approved")}.</strong> <span>${escape_html("This weekly report has been approved. No further action is needed.")}</span> <a href="/dashboard">Back to dashboard →</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
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
    $$renderer2.push(`<!--]--> `);
    if (reviews.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<details class="review-history-details svelte-1ezplda"><summary class="svelte-1ezplda">Review history (${escape_html(reviews.length)})</summary> <!--[-->`);
      const each_array = ensure_array_like(reviews);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let rv = each_array[$$index];
        $$renderer2.push(`<div class="review-history-entry svelte-1ezplda"><span${attr_class(`rh-status ${rv.decision === "APPROVED" ? "rh-approved" : "rh-changes"}`, "svelte-1ezplda")}>${escape_html(rv.decision === "APPROVED" ? "Approved" : "Changes requested")}</span> <div class="rh-body svelte-1ezplda"><strong class="svelte-1ezplda">${escape_html(rv.reviewer_name)}</strong> <span class="rh-date svelte-1ezplda">${escape_html(new Date(rv.created_at).toLocaleString())}</span> `);
        if (rv.remarks) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<p class="rh-remarks svelte-1ezplda">${escape_html(rv.remarks)}</p>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]--></details>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="editor-layout"><nav class="section-nav" aria-label="Report sections"><div class="completion"><div><span>Report completion</span><strong>${escape_html(completion())}%</strong></div> <div class="track"><i${attr_style(`width:${stringify(completion())}%`)}></i></div></div> <!--[-->`);
    const each_array_1 = ensure_array_like([
      {
        id: "teaching",
        label: "Teaching & delivery",
        count: teaching.length
      },
      {
        id: "summary",
        label: "Weekly summary",
        count: 0
      },
      {
        id: "additional",
        label: "Evidence & records",
        count: attachments.length
      }
    ]);
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let section = each_array_1[index];
      $$renderer2.push(`<button${attr_class("", void 0, { "active": activeSection === section.id })}><span class="nav-number">0${escape_html(index + 1)}</span> <span>${escape_html(section.label)}</span> `);
      if (section.count) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<em>${escape_html(section.count)}</em>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--> <div class="scope-note svelte-1ezplda">Research, institutional duties, outreach and appraisal are not part of the weekly submission.</div></nav> <section class="form-area">`);
    if (isReadonly()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="preview-paper"><div class="paper-kicker">Faculty weekly report · ${escape_html(periodLabel)}</div> <div class="paper-status svelte-1ezplda">${escape_html("Approved")}</div> <h2>Faculty member</h2> <p class="paper-meta">${escape_html(data.user?.name ?? "Faculty")} · Department of Computer Science and Engineering</p> <h3>Teaching &amp; academic delivery</h3> `);
      const each_array_2 = ensure_array_like(teaching);
      if (each_array_2.length !== 0) {
        $$renderer2.push("<!--[-->");
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let item = each_array_2[$$index_2];
          $$renderer2.push(`<div class="paper-row"><strong>${escape_html(item.courseCode || "Untitled course")}</strong> <span>${escape_html(item.courseName || "Course name pending")}</span> <span>${escape_html(item.conducted)} / ${escape_html(item.scheduled)} classes · ${escape_html(item.syllabusCompletion)}% syllabus</span></div>`);
        }
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="empty-section svelte-1ezplda">No teaching records.</p>`);
      }
      $$renderer2.push(`<!--]--> <h3>Weekly summary</h3> <div class="summary-block svelte-1ezplda">${escape_html("No summary entered.")}</div></article>`);
    } else {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`<div class="section-intro"><div><div class="eyebrow">Section 01</div> <h2>Teaching &amp; academic delivery</h2> <p>Add every course or class group covered during this week.</p></div> <span class="metric-pill">${escape_html(deliveryRate())}% delivery rate</span></div> <div class="record-list"><!--[-->`);
      const each_array_4 = ensure_array_like(teaching);
      for (let index = 0, $$length = each_array_4.length; index < $$length; index++) {
        let item = each_array_4[index];
        $$renderer2.push(`<article class="record"><div class="record-top"><span class="record-index">Course ${escape_html(index + 1)}</span> `);
        if (teaching.length > 1) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="remove">Remove</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="field-grid"><label>Course code<input${attr("value", item.courseCode)} placeholder="CSE-301"/></label> <label>Course name<input${attr("value", item.courseName)} placeholder="Database Management Systems"/></label> <label>Program / level<input${attr("value", item.programLevel)} placeholder="B.Tech · III Year"/></label> <label>Class type`);
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
        $$renderer2.push(`</label></div> <div class="number-grid"><label>Total scheduled<input type="number" min="0"${attr("value", item.scheduled)} placeholder="0"/></label> <label>Classes taken<input type="number" min="0"${attr("value", item.conducted)} placeholder="0"/></label> <label>Classes missed<input type="number" min="0"${attr("value", item.missed)} placeholder="0"/></label> <label>Syllabus completion %<input type="number" min="0" max="100"${attr("value", item.syllabusCompletion)} placeholder="0"/></label></div> <label>Action taken for missed classes<input${attr("value", item.missedAction)} placeholder="e.g. Makeup class scheduled"/></label></article>`);
      }
      $$renderer2.push(`<!--]--> <button class="add-record">+ Add another course</button></div>`);
    }
    $$renderer2.push(`<!--]--></section></div> `);
    if (!isReadonly()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="evidence-panel"><div><strong>Supporting evidence</strong> <p>${escape_html(attachments.length)} file${escape_html(attachments.length === 1 ? "" : "s")} attached${escape_html(attachments.length ? ` · ${attachments.map((a) => fileName(a.filename)).join(", ")}` : "")}.</p></div> <div class="panel-mini-actions"><button class="quiet">Manage files</button></div></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></main>`);
  });
}
export {
  _page as default
};
