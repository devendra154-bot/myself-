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

  /** Google Drive or direct PDF link → { embed, open }. Drive files must be shared "Anyone with the link". */
  function pdfLinks(url) {
    if (!url) return null;
    // PDFs uploaded from the admin page live on this website (courses/files/…): no Drive, no permission.
    if (!/^https?:\/\//i.test(url)) {
      if (!/^courses\/files\/[\w.-]+$/.test(url)) return null;
      const abs = new URL(url, location.href).href;
      const phone = matchMedia("(pointer:coarse)").matches || innerWidth < 900;
      // Phones can't show PDFs inside a page, so they use Google's viewer (needs the public address).
      return { embed: phone && location.protocol.startsWith("http") ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(abs)}` : abs, open: abs };
    }
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
    if (m) return { embed: `https://drive.google.com/file/d/${m[1]}/preview`, open: `https://drive.google.com/file/d/${m[1]}/view` };
    if (/\.pdf(\?|#|$)/i.test(url)) return { embed: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`, open: url };
    return { embed: null, open: url };
  }

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
      const formulas = l.notes && !l.pdf && E.formulaList ? E.formulaList(l.notes) : [];
      const pdf = pdfLinks(l.pdf);
      const imgs = (l.images || []).filter((u) => /^courses\/files\/[\w.-]+$/.test(u) || /^https:\/\//.test(u));
      const key = `${c.id}/${l.id}`;
      const idx = lessons.indexOf(l);
      $("#lessonBox", view).innerHTML = `
        <div class="lesson-top"><h3>${esc(l.title)}</h3><span class="muted small">${formulas.length ? `🧮 ${formulas.length} formula${formulas.length === 1 ? "" : "s"}` : ""}</span></div>
        ${pdf ? `
          ${pdf.embed ? `<div class="pdf-frame"><iframe src="${esc(pdf.embed)}" title="${esc(l.title)} (PDF)" loading="lazy" allow="fullscreen" allowfullscreen></iframe></div>` : ""}
          <div class="pdf-bar">
            <a class="btn sm" href="${esc(pdf.open)}" target="_blank" rel="noopener">⤢ Full screen / Open PDF</a>
            <span class="muted small">PDF not showing? Tap <b>Full screen / Open PDF</b>.</span>
          </div>` : ""}
        ${imgs.length ? `<div class="page-photos">${imgs.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="page-photo"><img src="${esc(u)}" alt="${esc(l.title)}: page ${i + 1}" loading="lazy"><span>Page ${i + 1} of ${imgs.length} · tap to zoom</span></a>`).join("")}</div>` : ""}
        ${l.notes ? `
          <div class="lesson-actions">
            <span class="muted small">${pdf ? "Optional study tools:" : ""}</span>
            <button class="btn ${pdf ? "btn-ghost" : ""} sm" data-a="study">📋 Summary</button>
            <button class="btn btn-ghost sm" data-a="quiz">✅ Quiz</button>
            <button class="btn btn-ghost sm" data-a="cards">🃏 Flashcards</button>
            <button class="btn btn-ghost sm" data-a="hand">✍️ Handwritten notes</button>
          </div>
          ${pdf ? `<details class="lesson-text"><summary>📝 Text version</summary><div class="lesson-body">${F.notes(l.notes)}</div></details>` : `<div class="lesson-body">${F.notes(l.notes)}</div>`}` : ""}
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
