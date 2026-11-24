/* DevInventor Notes: courses for students (Course → Units → Lessons).
 * Courses are read from courses/courses.json, which the admin publishes from admin.html.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const F = window.NotesFormat, E = window.NotesEngine;
  const esc = F.esc;
  const view = $("#coursesView");
  if (!view) return;

  const SUBJECT_ICON = { electronics: "⚡", physics: "🧲", chemistry: "🧪", mathematics: "📐", maths: "📐", computer: "💻", electrical: "🔌", mechanical: "⚙️", civil: "🏗️", biology: "🧬" };
  const iconFor = (subject = "") => SUBJECT_ICON[Object.keys(SUBJECT_ICON).find((k) => subject.toLowerCase().includes(k))] || "📘";
  const lessonCount = (c) => c.units.reduce((a, u) => a + u.lessons.length, 0);
  const done = (() => { try { return new Set(JSON.parse(localStorage.getItem("dvn_lessons_done") || "[]")); } catch { return new Set(); } })();
  const saveDone = () => { try { localStorage.setItem("dvn_lessons_done", JSON.stringify([...done])); } catch {} };

  let data = { courses: [] };

  function list() {
    if (!data.courses.length) {
      view.innerHTML = `<p class="empty">📚 Courses are coming soon. Meanwhile, upload your own notes or photos below to make summaries, quizzes and handwritten notes.</p>`;
      return;
    }
    view.innerHTML = `<div class="course-grid">${data.courses.map((c) => {
      const total = lessonCount(c);
      const finished = c.units.flatMap((u) => u.lessons).filter((l) => done.has(`${c.id}/${l.id}`)).length;
      return `<button class="course-card" data-c="${esc(c.id)}">
        <span class="course-ico">${iconFor(c.subject)}</span>
        <span class="course-sub">${esc(c.subject || "Course")}</span>
        <b>${esc(c.title)}</b>
        <span class="muted small">${esc(c.description || "")}</span>
        <span class="course-meta">${c.units.length} unit${c.units.length === 1 ? "" : "s"} · ${total} lesson${total === 1 ? "" : "s"}${finished ? ` · ✓ ${finished} done` : ""}</span>
        <span class="course-bar"><i style="width:${total ? (finished / total) * 100 : 0}%"></i></span>
      </button>`;
    }).join("")}</div>`;
    $$("[data-c]", view).forEach((b) => (b.onclick = () => course(b.dataset.c)));
  }

  function course(id, openLesson) {
    const c = data.courses.find((x) => x.id === id);
    if (!c) return list();
    view.innerHTML = `
      <div class="course-head">
        <button class="btn btn-ghost sm" data-back>← All courses</button>
        <div><span class="course-sub">${iconFor(c.subject)} ${esc(c.subject || "")}</span><h3>${esc(c.title)}</h3><p class="muted small">${esc(c.description || "")}</p></div>
      </div>
      <div class="course-layout">
        <nav class="unit-list">${c.units.map((u, ui) => `
          <div class="unit"><h4>${esc(u.title)}</h4>
            ${u.lessons.map((l) => `<button class="lesson-btn" data-l="${esc(l.id)}">${done.has(`${c.id}/${l.id}`) ? "✓" : "○"} ${esc(l.title)}</button>`).join("") || '<p class="muted small">No lessons yet.</p>'}
          </div>`).join("")}</nav>
        <article class="lesson" id="lessonBox"><p class="empty">Choose a lesson to start.</p></article>
      </div>`;
    $("[data-back]", view).onclick = list;
    const lessons = c.units.flatMap((u) => u.lessons);
    const open = (lid) => {
      const l = lessons.find((x) => x.id === lid);
      if (!l) return;
      $$(".lesson-btn", view).forEach((b) => b.classList.toggle("on", b.dataset.l === lid));
      const formulas = E.formulaList ? E.formulaList(l.notes) : [];
      const key = `${c.id}/${l.id}`;
      const idx = lessons.indexOf(l);
      $("#lessonBox", view).innerHTML = `
        <div class="lesson-top"><h3>${esc(l.title)}</h3><span class="muted small">${formulas.length ? `🧮 ${formulas.length} formula${formulas.length === 1 ? "" : "s"}` : ""}</span></div>
        <div class="lesson-actions">
          <button class="btn sm" data-a="study">📋 Summary &amp; tools</button>
          <button class="btn btn-ghost sm" data-a="quiz">✅ Quiz</button>
          <button class="btn btn-ghost sm" data-a="cards">🃏 Flashcards</button>
          <button class="btn btn-ghost sm" data-a="hand">✍️ Handwritten (full lesson)</button>
          ${l.pdf && /^https?:\/\//i.test(l.pdf) ? `<a class="btn btn-ghost sm" href="${esc(l.pdf)}" target="_blank" rel="noopener">📄 Open PDF</a>` : ""}
        </div>
        <div class="lesson-body">${l.notes ? F.notes(l.notes) : `<p class="muted">This lesson is a PDF. Tap <b>Open PDF</b> to read it.</p>`}</div>
        <div class="lesson-foot">
          <button class="btn btn-ghost sm" data-a="prev" ${idx ? "" : "disabled"}>← Previous</button>
          <button class="btn ${done.has(key) ? "btn-ghost" : ""} sm" data-a="done">${done.has(key) ? "✓ Completed" : "Mark as completed"}</button>
          <button class="btn btn-ghost sm" data-a="next" ${idx < lessons.length - 1 ? "" : "disabled"}>Next →</button>
        </div>`;
      const box = $("#lessonBox", view);
      const act = (a, fn) => { const b = $(`[data-a=${a}]`, box); if (b) b.onclick = fn; };
      act("study", () => window.NotesApp.loadNotes(l.notes, "summary"));
      act("quiz", () => window.NotesApp.loadNotes(l.notes, "quiz"));
      act("cards", () => window.NotesApp.loadNotes(l.notes, "cards"));
      act("hand", () => window.NotesApp.handwrite(l.notes));
      act("prev", () => open(lessons[idx - 1].id));
      act("next", () => open(lessons[idx + 1].id));
      act("done", () => {
        done.has(key) ? done.delete(key) : done.add(key);
        saveDone();
        course(c.id, l.id);
      });
      if (innerWidth < 900) box.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    $$(".lesson-btn", view).forEach((b) => (b.onclick = () => open(b.dataset.l)));
    if (openLesson) open(openLesson);
    else if (lessons[0] && innerWidth >= 900) open(lessons[0].id);
  }

  fetch(`courses/courses.json?v=${Date.now()}`, { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => {
      data = { courses: (d.courses || []).filter((c) => c && c.id && c.title && Array.isArray(c.units)) };
      list();
    })
    .catch(() => { view.innerHTML = `<p class="empty">Couldn't load courses right now. Please check your internet connection and refresh.</p>`; });
})();
