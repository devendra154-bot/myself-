/* DevInventor Notes: admin course editor.
 * Builds courses/courses.json. Publishing = pasting it into GitHub, which only the
 * repository owner can do; the email screen just keeps students out of the editor.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CFG = window.NOTES_CONFIG || {};
  const E = window.NotesEngine, F = window.NotesFormat;
  const esc = F.esc;
  const ADMIN = String(CFG.adminEmail || "").toLowerCase();
  const DRAFT = "dvn_admin_draft";
  const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: (k) => { try { localStorage.removeItem(k); } catch {} },
  };

  // ---------- sign in (keeps students out of the editor; GitHub protects publishing) ----------
  const signedIn = () => { try { return sessionStorage.getItem("dvn_admin") === ADMIN; } catch { return false; } };
  function showEditor() {
    $("#gate").hidden = true;
    $("#editor").hidden = false;
    $("#who").textContent = ADMIN;
    $("#signOut").hidden = false;
    load();
  }
  $("#gateForm").onsubmit = (e) => {
    e.preventDefault();
    const v = $("#email").value.trim().toLowerCase();
    if (v && v === ADMIN) { try { sessionStorage.setItem("dvn_admin", v); } catch {} showEditor(); }
    else { $("#gateErr").hidden = false; $("#gateErr").textContent = "This email is not the admin for this website."; }
  };
  $("#signOut").onclick = () => { try { sessionStorage.removeItem("dvn_admin"); } catch {} location.reload(); };

  // ---------- data ----------
  let data = { updated: "", courses: [] };
  let sel = 0;
  let published = "";
  const slug = (t) => String(t || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "item";
  const uniq = (base, taken) => { let id = base, n = 2; while (taken.has(id)) id = `${base}-${n++}`; taken.add(id); return id; };
  const save = () => store.set(DRAFT, JSON.stringify({ savedAt: Date.now(), data }));

  async function load() {
    try {
      const r = await fetch(`courses/courses.json?v=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
    } catch {
      data = { updated: "", courses: [] };
      toast("Couldn't load the published courses. Starting empty.");
    }
    data.courses ||= [];
    published = JSON.stringify(data.courses);
    const raw = store.get(DRAFT);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (JSON.stringify(d.data.courses) !== published) {
          $("#banner").innerHTML = `<div class="banner">📝 You have unpublished changes from ${new Date(d.savedAt).toLocaleString("en-IN")}. <button class="btn sm" id="keepDraft">Continue editing them</button><button class="btn btn-ghost sm" id="dropDraft">Discard</button></div>`;
          $("#keepDraft").onclick = () => { data = d.data; $("#banner").innerHTML = ""; render(); };
          $("#dropDraft").onclick = () => { store.del(DRAFT); $("#banner").innerHTML = ""; };
        }
      } catch {}
    }
    const gh = `https://github.com/${CFG.repo}/edit/${CFG.branch || "main"}/${CFG.coursesPath}`;
    $("#openGh").href = gh;
    render();
  }

  // ---------- render ----------
  function render() {
    renderList();
    renderForm();
  }

  function renderList() {
    $("#clist").innerHTML = data.courses.length
      ? data.courses.map((c, i) => `<button class="ci ${i === sel ? "on" : ""}" data-i="${i}">${esc(c.title || "Untitled course")}<small>${esc(c.subject || "")} · ${c.units.reduce((a, u) => a + u.lessons.length, 0)} lessons</small></button>`).join("")
      : `<p class="muted small">No courses yet. Click <b>+ New</b>.</p>`;
    $$(".ci").forEach((b) => (b.onclick = () => { sel = +b.dataset.i; render(); }));
  }

  function renderForm() {
    const box = $("#form");
    const c = data.courses[sel];
    if (!c) { box.innerHTML = `<p class="empty">Create a course with <b>+ New</b>.</p>`; return; }
    box.innerHTML = `
      <div class="row between"><h2 style="font-size:20px">Edit course</h2><button class="btn btn-ghost sm" data-act="delCourse" style="color:var(--bad)">Delete course</button></div>
      <label class="field">Course title<input data-k="title" value="${esc(c.title)}" placeholder="e.g. Basic Electronics"></label>
      <div class="row" style="gap:12px;flex-wrap:wrap">
        <label class="field" style="flex:1;min-width:200px">Subject<input data-k="subject" list="subjects" value="${esc(c.subject || "")}" placeholder="Electronics, Physics, Chemistry…"></label>
      </div>
      <datalist id="subjects"><option>Electronics</option><option>Physics</option><option>Chemistry</option><option>Electrical</option><option>Computer Science</option><option>Mechanical</option><option>Civil</option><option>Biology</option></datalist>
      <label class="field">Short description<input data-k="description" value="${esc(c.description || "")}" placeholder="What students will learn"></label>
      <div id="units">${c.units.map((u, ui) => unitHTML(u, ui, c.units.length)).join("")}</div>
      <button class="btn btn-ghost" data-act="addUnit" style="margin-top:16px">+ Add unit</button>`;
    bindForm(box, c);
  }

  function unitHTML(u, ui, n) {
    return `<div class="unit-card" data-ui="${ui}">
      <div class="row"><input class="field-in" data-uk="title" value="${esc(u.title)}" placeholder="Unit title, e.g. Unit 1: DC Circuits" style="border:1px solid var(--line);border-radius:10px;padding:9px 12px">
        <button class="mini" data-act="unitUp" ${ui ? "" : "disabled"} title="Move up">↑</button><button class="mini" data-act="unitDown" ${ui < n - 1 ? "" : "disabled"} title="Move down">↓</button><button class="mini del" data-act="delUnit" title="Delete unit">✕</button></div>
      ${u.lessons.map((l, li) => lessonHTML(l, li, u.lessons.length)).join("")}
      <button class="btn btn-ghost sm" data-act="addLesson" style="margin-top:10px">+ Add lesson</button>
    </div>`;
  }

  function lessonHTML(l, li, n) {
    return `<div class="lesson-card" data-li="${li}">
      <div class="row" style="flex-wrap:nowrap"><input data-lk="title" value="${esc(l.title)}" placeholder="Lesson title" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-weight:600">
        <button class="mini" data-act="lessonUp" ${li ? "" : "disabled"} title="Move up">↑</button><button class="mini" data-act="lessonDown" ${li < n - 1 ? "" : "disabled"} title="Move down">↓</button><button class="mini del" data-act="delLesson" title="Delete lesson">✕</button></div>
      <label class="field">Notes
        <textarea data-lk="notes" placeholder="Paste or type the lesson notes…">${esc(l.notes)}</textarea></label>
      <p class="help">Tips: <code># Heading</code> · <code>- point</code> · put each formula on its own line, e.g. <code>Ohm's law: V = IR</code>, <code>v² = u² + 2as</code>, <code>2H2 + O2 → 2H2O</code>. Use <code>^2</code> for powers and <code>_</code> for subscripts.</p>
      <label class="field">PDF link for students (optional)<input data-lk="pdf" value="${esc(l.pdf || "")}" placeholder="https://… (Google Drive link set to 'Anyone with the link', or a GitHub file link)"></label>
      <div class="row between"><span class="stats" data-stats>${stats(l.notes)}</span><span class="row"><label class="btn btn-ghost sm" style="cursor:pointer">📎 Upload PDF / Word / photos<input type="file" accept=".pdf,.docx,.txt,.md,image/*" multiple hidden data-act="upload"></label><button class="btn btn-ghost sm" data-act="preview">Preview</button></span></div>
      <div class="preview" data-preview hidden></div>
    </div>`;
  }

  function stats(notes) {
    const words = (String(notes).match(/\S+/g) || []).length;
    const f = E.formulaList ? E.formulaList(notes).length : 0;
    const q = words >= 40 ? E.quiz(notes, 10).length : 0;
    return `${words} words · <b>${f} formula${f === 1 ? "" : "s"}</b> found · ${q ? `${q} quiz questions` : "add more text for a quiz (40+ words)"}`;
  }

  function bindForm(box, c) {
    $$("[data-k]", box).forEach((inp) => inp.addEventListener("input", () => { c[inp.dataset.k] = inp.value; save(); renderList(); }));
    $$(".unit-card", box).forEach((uc) => {
      const u = c.units[+uc.dataset.ui];
      $("[data-uk=title]", uc).addEventListener("input", (e) => { u.title = e.target.value; save(); });
      $$(".lesson-card", uc).forEach((lc) => {
        const l = u.lessons[+lc.dataset.li];
        $("[data-lk=title]", lc).addEventListener("input", (e) => { l.title = e.target.value; save(); });
        const ta = $("[data-lk=notes]", lc);
        let t;
        ta.addEventListener("input", () => {
          l.notes = ta.value;
          save();
          clearTimeout(t);
          t = setTimeout(() => { $("[data-stats]", lc).innerHTML = stats(l.notes); const p = $("[data-preview]", lc); if (!p.hidden) p.innerHTML = F.notes(l.notes); }, 400);
        });
        $("[data-act=preview]", lc).onclick = () => { const p = $("[data-preview]", lc); p.hidden = !p.hidden; p.innerHTML = F.notes(l.notes); };
        $("[data-lk=pdf]", lc).addEventListener("input", (e) => { l.pdf = e.target.value.trim(); save(); });
        $("[data-act=upload]", lc).onchange = async (e) => {
          const files = [...e.target.files];
          const st = $("[data-stats]", lc);
          let added = 0;
          for (let i = 0; i < files.length; i++) {
            const tag = files.length > 1 ? `(${i + 1}/${files.length}) ` : "";
            try {
              const r = await window.NotesReaders.read(files[i], (p, t) => (st.textContent = `${tag}${t}`));
              ta.value = (ta.value.trim() ? ta.value.trim() + "\n\n" : "") + E.clean(r.text);
              ta.dispatchEvent(new Event("input"));
              added++;
              if (r.warning && /may be wrong/.test(r.warning)) toast(r.warning);
            } catch (err) { toast(`${tag}${err.message}`); }
          }
          e.target.value = "";
          st.innerHTML = stats(l.notes);
          if (added) toast(`Text added from ${added} file${added > 1 ? "s" : ""}. Check it, then publish.`);
        };
        const move = (d) => { const i = +lc.dataset.li; [u.lessons[i], u.lessons[i + d]] = [u.lessons[i + d], u.lessons[i]]; save(); renderForm(); };
        $("[data-act=lessonUp]", lc).onclick = () => move(-1);
        $("[data-act=lessonDown]", lc).onclick = () => move(1);
        $("[data-act=delLesson]", lc).onclick = () => { if (confirm(`Delete lesson "${l.title || "Untitled"}"?`)) { u.lessons.splice(+lc.dataset.li, 1); save(); render(); } };
      });
      $("[data-act=addLesson]", uc).onclick = () => { u.lessons.push({ id: "", title: "", notes: "" }); save(); renderForm(); $$(".lesson-card", $(`.unit-card[data-ui="${uc.dataset.ui}"]`)).pop()?.querySelector("input")?.focus(); };
      const moveU = (d) => { const i = +uc.dataset.ui; [c.units[i], c.units[i + d]] = [c.units[i + d], c.units[i]]; save(); renderForm(); };
      $("[data-act=unitUp]", uc).onclick = () => moveU(-1);
      $("[data-act=unitDown]", uc).onclick = () => moveU(1);
      $("[data-act=delUnit]", uc).onclick = () => { if (confirm(`Delete "${u.title || "this unit"}" and all its lessons?`)) { c.units.splice(+uc.dataset.ui, 1); save(); render(); } };
    });
    $("[data-act=addUnit]", box).onclick = () => { c.units.push({ title: `Unit ${c.units.length + 1}: `, lessons: [{ id: "", title: "", notes: "" }] }); save(); renderForm(); };
    $("[data-act=delCourse]", box).onclick = () => { if (confirm(`Delete the course "${c.title || "Untitled"}"?`)) { data.courses.splice(sel, 1); sel = Math.max(0, sel - 1); save(); render(); } };
  }

  $("#newCourse").onclick = () => {
    data.courses.push({ id: "", title: "New course", subject: "", description: "", units: [{ title: "Unit 1: ", lessons: [{ id: "", title: "", notes: "" }] }] });
    sel = data.courses.length - 1;
    save();
    render();
    $("[data-k=title]")?.select();
  };

  // ---------- publish ----------
  /** Validate, give stable ids (kept if they exist, so students' progress stays), and return JSON text. */
  function build() {
    const errors = [];
    const courseIds = new Set();
    const courses = data.courses.map((c, ci) => {
      if (!c.title.trim()) errors.push(`Course ${ci + 1} has no title.`);
      const id = c.id && !courseIds.has(c.id) ? (courseIds.add(c.id), c.id) : uniq(slug(c.title), courseIds);
      const lessonIds = new Set();
      const units = c.units.map((u, ui) => {
        if (!u.title.trim()) errors.push(`"${c.title}": unit ${ui + 1} has no title.`);
        return {
          title: u.title.trim(),
          lessons: u.lessons.map((l, li) => {
            if (!l.title.trim()) errors.push(`"${c.title}" → ${u.title || "unit " + (ui + 1)}: lesson ${li + 1} has no title.`);
            if (!l.notes.trim() && !(l.pdf || "").trim()) errors.push(`"${c.title}" → "${l.title || "lesson " + (li + 1)}" has no notes or PDF link.`);
            const lid = l.id && !lessonIds.has(l.id) ? (lessonIds.add(l.id), l.id) : uniq(slug(l.title), lessonIds);
            l.id = lid;
            const pdf = (l.pdf || "").trim();
            if (pdf && !/^https?:\/\//i.test(pdf)) errors.push(`"${l.title || "lesson " + (li + 1)}": the PDF link must start with https://`);
            return pdf ? { id: lid, title: l.title.trim(), notes: l.notes.trim(), pdf } : { id: lid, title: l.title.trim(), notes: l.notes.trim() };
          }),
        };
      });
      c.id = id;
      return { id, title: c.title.trim(), subject: (c.subject || "").trim(), description: (c.description || "").trim(), units };
    });
    return { errors, json: JSON.stringify({ updated: new Date().toISOString().slice(0, 10), courses }, null, 1) + "\n" };
  }

  const ready = () => {
    const { errors, json } = build();
    const pe = $("#pubErr");
    pe.hidden = !errors.length;
    pe.innerHTML = errors.slice(0, 6).map(esc).join("<br>");
    save();
    return errors.length ? null : json;
  };

  $("#copyJson").onclick = async () => {
    const json = ready();
    if (!json) return toast("Fix the items in red first");
    try { await navigator.clipboard.writeText(json); toast("Copied! Now open GitHub and paste."); }
    catch { const ta = document.createElement("textarea"); ta.value = json; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Copied! Now open GitHub and paste."); }
  };
  $("#download").onclick = () => {
    const json = ready();
    if (!json) return toast("Fix the items in red first");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = "courses.json";
    document.body.appendChild(a); a.click(); a.remove();
  };

  addEventListener("beforeunload", (e) => { if (JSON.stringify(data.courses) !== published && store.get(DRAFT)) { e.preventDefault(); e.returnValue = ""; } });

  if (signedIn()) showEditor();
})();
