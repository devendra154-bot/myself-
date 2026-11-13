/* DevInventor Notes: dashboard app (routing, views, wiring). */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = window.NotesEngine, V = window.NotesVisual, H = window.NotesHandwrite;
  const L = window.NotesLibrary, X = window.NotesExam, P = window.NotesProgress, AI = window.NotesAI;
  const esc0 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const esc = esc0;
  const store = {
    get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const toast = (msg, ms = 2800) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), ms);
  };

  // ---------------- icons (stroke icons, 24px grid) ----------------
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17h.01"/>',
    check: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>',
    map: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5" r="2"/><circle cx="19.5" cy="5" r="2"/><circle cx="4.5" cy="19" r="2"/><circle cx="19.5" cy="19" r="2"/><path d="M6 6.5 9.8 10M18 6.5 14.2 10M6 17.5l3.8-3.5M18 17.5l-3.8-3.5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M10 10h4v4h-4z"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  };
  const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

  const VIEWS = [
    { id: "home", label: "Home", icon: "home", sub: "Your exam prep dashboard" },
    { id: "notes", label: "Exam notes", icon: "file", sub: "Summaries, definitions, formulas, important questions", chapters: true },
    { id: "ask", label: "Ask & answers", icon: "chat", sub: "2, 5, 8 and 10-mark answers", chapters: true },
    { id: "exam", label: "Quiz & exam", icon: "check", sub: "Practice or timed exam with report", chapters: true },
    { id: "visual", label: "Mind maps", icon: "map", sub: "Mind maps, flowcharts, chapter breakdown", chapters: true },
    { id: "library", label: "Topic library", icon: "cpu", sub: "Verified 2/5/8/10-mark answers (English + తెలుగు)" },
    { id: "revise", label: "Quick revision", icon: "zap", sub: "Revision cards, formula sheet, flashcards", chapters: true },
    { id: "handwrite", label: "Handwritten", icon: "pen", sub: "Realistic handwritten A4 pages (PDF / PNG)" },
    { id: "progress", label: "Progress", icon: "chart", sub: "Chapter-wise learning progress" },
  ];
  const TABS = ["home", "notes", "library", "exam", "revise"];

  // ---------------- state ----------------
  const state = {
    notes: store.get("dvn_notes", ""),
    chapter: -1,
    length: store.get("dvn_len", "medium"),
    lang: "en",
    stopExam: null,
  };
  const cache = {};
  const wordCount = (t = state.notes) => (t.trim().match(/\S+/g) || []).length;
  const MIN_WORDS = 40;

  function chapters() {
    if (!state.notes.trim()) return [];
    if (cache.chText !== state.notes) { cache.chText = state.notes; cache.ch = E.chapters(state.notes); }
    return cache.ch;
  }
  const currentText = () => { const ch = chapters(); return state.chapter >= 0 && ch[state.chapter] ? ch[state.chapter].text : state.notes; };
  function summary(text = currentText(), length = state.length) {
    const k = length + "|" + text;
    if (cache.sumKey !== k) { cache.sumKey = k; cache.sum = wordCount(text) >= MIN_WORDS ? E.summarize(text, length) : null; }
    return cache.sum;
  }
  const currentTitle = () => {
    const ch = chapters();
    if (state.chapter >= 0 && ch[state.chapter]) return ch[state.chapter].title;
    const s = summary(state.notes, "short");
    return s ? s.title : "My notes";
  };
  /** Library topics mentioned in the notes. */
  const HIT_KEYS = { pn_diode: /pn junction|p-n junction/, zener: /zener/, hwr: /half[- ]wave/, fwr_ct: /cent(re|er)[- ]tap/, bridge: /bridge rectifier/, npn: /\bnpn\b/, pnp: /\bpnp\b/, vdiv: /voltage divi/, idiv: /current divi/, kcl: /\bkcl\b|kirchhoff'?s? current/, kvl: /\bkvl\b|kirchhoff'?s? voltage/, thevenin: /thevenin|thévenin/, norton: /norton/, superposition: /superposition/, maxpower: /maximum power/ };
  /** Library topics mentioned in the notes. */
  const libraryHits = (text = state.notes) => { const t = text.toLowerCase(); return L.topics.filter((tp) => HIT_KEYS[tp.id]?.test(t)); };

  // ---------------- shared UI helpers ----------------
  const marksBadge = (m) => `<span class="marks m${m}">${m}M</span>`;

  /** Zoom (+/−/fit, ctrl+wheel), drag-to-pan and download for any [data-zoom] block. */
  function bindZoom(root) {
    $$("[data-zoom]", root).forEach((fig) => {
      const stage = $(".stage", fig);
      const svg = $("svg", stage);
      if (!svg) return;
      const natural = svg.viewBox.baseVal.width || svg.width.baseVal.value;
      let z = 1;
      const fitW = () => Math.max(260, stage.clientWidth - 2);
      const apply = () => { svg.style.width = `${Math.round(fitW() * z)}px`; svg.style.maxWidth = "none"; svg.style.height = "auto"; };
      const isMap = fig.classList.contains("map-wrap");
      if (isMap) z = natural > fitW() ? Math.max(1, (0.7 * natural) / fitW()) : natural / fitW();
      else z = Math.min(1, (natural * 1.1) / fitW());
      apply();
      const set = (nz) => { z = Math.max(0.4, Math.min(4, nz)); apply(); };
      $$("[data-z]", fig).forEach((b) => (b.onclick = () => {
        const a = b.dataset.z;
        if (a === "in") set(z * 1.25);
        else if (a === "out") set(z / 1.25);
        else if (a === "fit") set(isMap ? 1 : Math.min(1, (natural * 1.1) / fitW()));
        else if (a === "real") set(natural / fitW());
        else if (a === "png") V.downloadSVGasPNG(svg.outerHTML.replace(/style="[^"]*"/, ""), `${fig.dataset.zoom}.png`);
        else if (a === "svg") H.downloadURL(URL.createObjectURL(new Blob([svg.outerHTML.replace(/style="[^"]*"/, "")], { type: "image/svg+xml" })), `${fig.dataset.zoom}.svg`);
      }));
      stage.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); set(z * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
      let drag = null;
      stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; stage.classList.add("drag"); });
      addEventListener("pointermove", (e) => { if (!drag) return; stage.scrollLeft = drag.l - (e.clientX - drag.x); stage.scrollTop = drag.t - (e.clientY - drag.y); });
      addEventListener("pointerup", () => { drag = null; stage.classList.remove("drag"); });
    });
  }

  /** Small safe Markdown renderer for AI output. */
  function md(text) {
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of esc(text).split("\n")) {
      const l = raw.trim();
      let m;
      if (!l) { close(); continue; }
      if ((m = l.match(/^\[\[diagram:\s*(.+?)\]\]$/i))) {
        close();
        continue; // diagrams are not shown
      }
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { close(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
      if ((m = l.match(/^=\s+(.*)/))) { close(); html += `<code class="f">${m[1]}</code>`; continue; }
      if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; continue; }
      close();
      html += `<p>${inline(l)}</p>`;
    }
    close();
    return html;
  }

  /** Verified library answer → HTML. */
  function libAnswerHTML(a, lang) {
    const te = lang === "te" ? ' class="te"' : "";
    const esc = (s) => L.sub(esc0(s));
    return a.blocks.map((b) => {
      let body = "";
      if (b.type === "p") body = `<p${te}>${esc(b.data)}</p>`;
      else if (b.type === "list") body = `<ul${te}>${b.data.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      else if (b.type === "steps") body = `<ol${te}>${b.data.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
      else if (b.type === "formula") body = b.data.map((f) => `<code class="f">${esc(f)}</code>`).join("");
      else if (b.type === "example") body = `<div class="box example"><p${te}><b>Q.</b> ${esc(b.data.q)}</p>${b.data.steps.map((s) => `<code class="f">${esc(s)}</code>`).join("")}</div>`;
      return `<div class="blk"><h4${te}>${esc(b.heading)}</h4>${body}</div>`;
    }).join("");
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast("Couldn't copy. Select the text and copy it manually."); }
  }

  function sendToHandwriting(text) {
    store.set("dvn_hw", text);
    state.hwAuto = true;
    location.hash = "#handwrite";
  }

  const needNotes = (what = "this") => `<div class="empty-state"><b>Add your notes first</b><p>Paste or upload your notes in <b>Exam notes</b> to use ${what}, or try the verified circuit library.</p><div class="row" style="justify-content:center"><a class="btn btn-brand" href="#notes">${icon("upload")} Add notes</a><a class="btn btn-ghost" href="#library">${icon("cpu")} Topic library</a></div></div>`;

  // ---------------- views ----------------
  const views = {};

  // HOME
  views.home = (el) => {
    const ch = chapters();
    const prog = P.all();
    const avg = prog.length ? Math.round(prog.reduce((a, p) => a + P.score(p), 0) / prog.length) : 0;
    const quizzes = prog.reduce((a, p) => a + (p.quizAttempts || 0), 0);
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const featured = ["zener", "bridge", "npn", "thevenin"].map((id) => L.get(id));
    el.innerHTML = `
      <div class="hello">
        <div><h2>${greet}! Ready to <span>score</span>?</h2><p>Exam notes, verified answers, quizzes and handwritten notes. Free, private and made for engineering students.</p></div>
        <a class="btn btn-brand big" href="#notes">${icon("upload")} ${state.notes.trim() ? "Open my notes" : "Add my notes"}</a>
      </div>
      <div class="grid g4">
        <a class="card action" href="#notes"><span class="ico">${icon("file")}</span><b>Exam notes</b><p>Short, medium or detailed notes with formulas and important questions.</p></a>
        <a class="card action" href="#library"><span class="ico">${icon("cpu")}</span><b>Topic library</b><p>15 verified ECE topics with 2/5/8/10-mark answers, formulas and examples in English &amp; తెలుగు.</p></a>
        <a class="card action" href="#exam"><span class="ico">${icon("check")}</span><b>Quiz &amp; exam</b><p>MCQs with explanations, timer, exam mode and a performance report.</p></a>
        <a class="card action" href="#handwrite"><span class="ico">${icon("pen")}</span><b>Handwritten notes</b><p>Turn any answer into realistic handwritten A4 pages: PDF or PNG.</p></a>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card">
          <div class="card-h"><h3>Your notes</h3><a class="btn btn-ghost sm" href="#progress">Progress</a></div>
          ${state.notes.trim() ? `
            <p><b>${esc(currentTitle())}</b></p>
            <p class="muted small">${wordCount()} words · ${ch.length} chapter${ch.length === 1 ? "" : "s"}</p>
            <div class="stat-row" style="margin-top:14px"><div class="stat"><b>${avg}%</b><span>Avg progress</span></div><div class="stat"><b>${quizzes}</b><span>Quizzes taken</span></div><div class="stat"><b>${prog.filter((p) => p.revised).length}</b><span>Chapters revised</span></div></div>
            <div class="row" style="margin-top:16px"><a class="btn sm" href="#revise">${icon("zap")} Quick revision</a><a class="btn btn-ghost sm" href="#exam">Take a quiz</a></div>`
          : `<p class="muted">No notes yet. Upload a PDF, Word file or photo, or paste your class notes.</p><div class="row" style="margin-top:14px"><a class="btn sm" href="#notes">Add notes</a><button class="btn btn-ghost sm" id="homeSample">Try sample notes</button></div>`}
        </div>
        <div class="card">
          <div class="card-h"><h3>Popular verified topics</h3><a class="btn btn-ghost sm" href="#library">See all 15</a></div>
          <div class="grid g2">${featured.map((t) => `<a class="topic card" href="#library/${t.id}"><b>${esc(t.title)}</b><small class="te">${esc(t.title_te)}</small><small>${esc(t.unit)}</small></a>`).join("")}</div>
        </div>
      </div>
      <div class="trust-line"><span>🔒 Notes never leave your device</span><span>✓ Library answers checked by hand</span><span>₹0, no login</span><span>${AI.ready() ? "✨ Smart AI on" : "✨ Optional Smart AI (your free key)"}</span></div>`;
    const s = $("#homeSample", el);
    if (s) s.onclick = () => { setNotes(window.SAMPLE_NOTES); location.hash = "#notes"; };
  };

  // NOTES
  function setNotes(text) {
    state.notes = text;
    state.chapter = -1;
    store.set("dvn_notes", text);
    refreshChapterPick();
  }

  views.notes = (el) => {
    el.innerHTML = `
      <div class="split">
        <div class="card sticky">
          <div class="card-h"><h3>Your notes</h3><span class="muted small" id="wc">${wordCount()} words</span></div>
          <label class="drop" id="drop"><input type="file" id="file" accept=".pdf,.docx,.txt,.md,image/*" hidden><span class="ico">${icon("upload")}</span><span><b>Upload PDF, Word, text or photo</b><small>or drag and drop · read on your device</small></span></label>
          <div class="progress" id="progress" hidden><div class="progress-bar"><i id="progressBar"></i></div><span id="progressText">Reading…</span></div>
          <textarea id="notes" placeholder="Paste your notes here…&#10;&#10;Tip: put headings (Unit 1, Chapter 2…) on their own lines and start points with - or 1. for the best results.">${esc(state.notes)}</textarea>
          <div class="row"><button class="btn btn-ghost sm" id="sample">Try sample notes</button><button class="btn btn-ghost sm" id="clear">Clear</button></div>
        </div>
        <div class="card">
          <div class="row between">
            <div class="seg" id="len">${["short", "medium", "detailed"].map((l) => `<button data-v="${l}" class="${state.length === l ? "on" : ""}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>
            <div class="seg" id="mode"><button data-v="en" class="on">English</button><button data-v="simple">Simple English ✨</button><button data-v="te">తెలుగు ✨</button></div>
          </div>
          <div id="out"></div>
        </div>
      </div>`;
    const ta = $("#notes", el);
    let t;
    ta.addEventListener("input", () => {
      $("#wc", el).textContent = `${wordCount(ta.value)} words`;
      clearTimeout(t);
      t = setTimeout(() => { setNotes(ta.value); renderOut(); }, 450);
    });
    $("#sample", el).onclick = () => { ta.value = window.SAMPLE_NOTES; setNotes(ta.value); $("#wc", el).textContent = `${wordCount()} words`; renderOut(); toast("Sample loaded: Operating Systems, CPU Scheduling"); };
    $("#clear", el).onclick = () => { ta.value = ""; setNotes(""); $("#wc", el).textContent = "0 words"; renderOut(); };
    bindUpload(el, (text) => { ta.value = ta.value.trim() ? ta.value.trim() + "\n\n" + text : text; setNotes(ta.value); $("#wc", el).textContent = `${wordCount()} words`; renderOut(); });
    $$("#len button", el).forEach((b) => (b.onclick = () => { state.length = b.dataset.v; store.set("dvn_len", state.length); $$("#len button", el).forEach((x) => x.classList.toggle("on", x === b)); renderOut(); }));
    let mode = "en";
    $$("#mode button", el).forEach((b) => (b.onclick = () => { mode = b.dataset.v; $$("#mode button", el).forEach((x) => x.classList.toggle("on", x === b)); renderOut(); }));

    async function renderOut() {
      const out = $("#out", el);
      const text = currentText();
      if (wordCount(text) < MIN_WORDS) {
        out.innerHTML = wordCount(text) ? `<div class="empty-state"><b>Add a little more</b><p>${wordCount(text)} words so far. At least ${MIN_WORDS} are needed for useful notes.</p></div>` : `<div class="empty-state"><b>Your exam notes appear here</b><p>Paste or upload notes on the left, or tap <b>Try sample notes</b>.</p></div>`;
        return;
      }
      if (mode !== "en") return renderAI(out, text, mode);
      const s = summary(text);
      if (!s) return;
      P.update(currentTitle(), { read: true });
      const hits = libraryHits(text);
      const qs = s.examQuestions.map((q) => ({ ...q, marks: /^What is/.test(q.q) ? 8 : q.marks }));
      out.innerHTML = `
        <div class="row between" style="margin-top:16px"><span class="muted small">📄 ${s.stats.words} → ${s.stats.summaryWords} words · <b style="color:var(--ok)">${s.stats.saved}% shorter</b></span>
          <div class="row"><button class="btn btn-ghost sm" id="cp">${icon("copy")} Copy</button><button class="btn sm" id="hw">${icon("pen")} Handwritten</button></div></div>
        ${hits.length ? `<div class="box def"><h4>✓ Verified answers for topics in your notes</h4><div class="chips">${hits.map((h) => `<a class="chip on" href="#library/${h.id}">${esc(h.title)}</a>`).join("")}</div></div>` : ""}
        <h3 class="out-title">${esc(s.title)}</h3>
        ${s.sections.map((sec) => `<div class="sum-sec">${sec.title && E.topicOf(sec.title) !== s.title ? `<h4>${esc(sec.title)}</h4>` : ""}<ul>${sec.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("")}
        ${s.definitions.length ? `<div class="box def"><h4>📌 Definitions</h4><dl>${s.definitions.map((d) => `<dt>${esc(d.term)}</dt><dd>${esc(d.definition)}.</dd>`).join("")}</dl></div>` : ""}
        ${s.formulas.length ? `<div class="box formula"><h4>🧮 Formulas</h4>${s.formulas.map((f) => `<code class="f">${esc(f)}</code>`).join("")}</div>` : ""}
        ${s.examples.length ? `<div class="box example"><h4>💡 Examples</h4><ul>${s.examples.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${s.keyTerms.length ? `<div class="box"><h4>🔑 Key terms</h4><div class="chips">${s.keyTerms.map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</div></div>` : ""}
        ${qs.length ? `<div class="box exam"><h4>🎯 Important &amp; expected questions</h4><ul class="q-list">${qs.map((q) => `<li><button class="link-btn" data-q="${esc(q.q)}" data-m="${q.marks}">${esc(q.q)}</button>${marksBadge(q.marks)}</li>`).join("")}</ul><p class="muted small">Tap a question for a ready answer.</p></div>` : ""}
        <div class="ai-note">${icon("spark")}<span>These notes pick the most important sentences from your notes and don't add anything new. ${AI.ready() ? "Use <b>Simple English ✨</b> or <b>తెలుగు ✨</b> for AI explanations." : 'For simple-English rewrites and Telugu, turn on <a href="#" data-open-settings>Smart AI</a> (free with your own key).'}</span></div>`;
      $("#cp", out).onclick = () => copy(E.summaryToText(s));
      $("#hw", out).onclick = () => sendToHandwriting(E.summaryToText(s));
      $$("[data-q]", out).forEach((b) => (b.onclick = () => { state.askQ = b.dataset.q; state.askM = +b.dataset.m; location.hash = "#ask"; }));
      bindSettingsLinks(out);
    }

    async function renderAI(out, text, mode) {
      if (!AI.ready()) {
        out.innerHTML = `<div class="empty-state"><b>${mode === "te" ? "తెలుగు explanations" : "Simple-English notes"} use Smart AI</b><p>Smart AI is free with your own Google Gemini key, which stays on your device. The 15 verified library topics already have Telugu answers without AI.</p><div class="row" style="justify-content:center"><button class="btn btn-brand" data-open-settings>Turn on Smart AI</button><a class="btn btn-ghost" href="#library">తెలుగు library</a></div></div>`;
        bindSettingsLinks(out);
        return;
      }
      const key = mode + "|" + state.length + "|" + text;
      if (cache.aiKey === key && cache.ai) return showAI(out, cache.ai, mode);
      out.innerHTML = `<div style="padding:24px 0"><span class="spinner"></span> <span class="muted">Smart AI is writing your ${mode === "te" ? "Telugu explanation" : "notes"}…</span><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div>`;
      try {
        const res = mode === "te" ? await AI.tasks.telugu(text) : await AI.tasks.simpleNotes(text, state.length);
        cache.aiKey = key; cache.ai = res;
        if (location.hash.startsWith("#notes")) showAI(out, res, mode);
      } catch (err) {
        out.innerHTML = `<div class="empty-state"><b>Smart AI couldn't answer</b><p>${esc(err.message)}</p><button class="btn btn-ghost" data-open-settings>Check settings</button></div>`;
        bindSettingsLinks(out);
      }
    }
    function showAI(out, res, mode) {
      out.innerHTML = `<div class="row between" style="margin-top:16px"><span class="badge info">✨ Smart AI · check important facts with your textbook</span><div class="row"><button class="btn btn-ghost sm" id="cp">${icon("copy")} Copy</button><button class="btn sm" id="hw">${icon("pen")} Handwritten</button></div></div><div class="md ${mode === "te" ? "te" : ""}" style="margin-top:10px">${md(res)}</div>`;
      $("#cp", out).onclick = () => copy(res);
      $("#hw", out).onclick = () => sendToHandwriting(res);
      bindZoom(out);
    }
    renderOut();
  };

  // ASK
  views.ask = (el) => {
    const marks = state.askM || 5;
    el.innerHTML = `
      <div class="card">
        <form class="ask-bar" id="askForm">
          <input id="q" placeholder="e.g. Explain the working of a bridge rectifier" value="${esc(state.askQ || "")}" autocomplete="off" aria-label="Your question">
          <button class="btn btn-brand">Answer</button>
        </form>
        <div class="row between" style="margin-top:12px">
          <div class="seg" id="marks">${[2, 5, 8, 10].map((m) => `<button type="button" data-v="${m}" class="${m === marks ? "on" : ""}">${m} marks</button>`).join("")}</div>
          <div class="seg" id="lang"><button type="button" data-v="en" class="${state.lang === "en" ? "on" : ""}">English</button><button type="button" data-v="te" class="${state.lang === "te" ? "on" : ""}">తెలుగు</button></div>
        </div>
        <div class="row" style="margin-top:12px"><span class="muted small">Try:</span>${["Explain Zener diode as voltage regulator", "State and explain Thevenin's theorem", "Working of NPN transistor", "Explain KVL with example"].map((q) => `<button type="button" class="chip" data-try="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      </div>
      <div class="card ans" id="ans" hidden></div>`;
    let m = marks;
    $$("#marks button", el).forEach((b) => (b.onclick = () => { m = +b.dataset.v; $$("#marks button", el).forEach((x) => x.classList.toggle("on", x === b)); if ($("#q", el).value.trim()) answer(); }));
    $$("#lang button", el).forEach((b) => (b.onclick = () => { state.lang = b.dataset.v; $$("#lang button", el).forEach((x) => x.classList.toggle("on", x === b)); if ($("#q", el).value.trim()) answer(); }));
    $$("[data-try]", el).forEach((b) => (b.onclick = () => { $("#q", el).value = b.dataset.try; answer(); }));
    $("#askForm", el).onsubmit = (e) => { e.preventDefault(); answer(); };

    function answer() {
      const q = $("#q", el).value.trim();
      const box = $("#ans", el);
      if (!q) { $("#q", el).focus(); return; }
      state.askQ = q; state.askM = m;
      box.hidden = false;
      const topic = L.match(q);
      let text = "";
      if (topic) {
        const a = L.answer(topic, m, state.lang);
        text = L.answerText(a);
        box.innerHTML = `
          <div class="ans-head"><div><h3 class="${state.lang === "te" ? "te" : ""}">${esc(a.title)}</h3><span class="badge ok">✓ Verified answer</span></div><span class="marks m${m}">${m} marks</span></div>
          ${libAnswerHTML(a, state.lang)}
          ${m >= 8 ? '<p class="tip">💡 In the exam: draw the diagram neatly with a pencil, label every part, and underline the formulas.</p>' : ""}`;
      } else if (wordCount(currentText()) >= MIN_WORDS) {
        const a = E.answer(currentText(), q, m);
        if (!a || !a.found) {
          box.innerHTML = `<div class="empty-state"><b>Not found in your notes</b><p>Try the exact term from your syllabus, add the chapter that covers it${AI.ready() ? ", or ask Smart AI below." : "."}</p></div>`;
        } else {
          text = `# ${q}\n${a.intro}\n${a.points.map((p) => `- ${p}`).join("\n")}`;
          box.innerHTML = `
            <div class="ans-head"><div><h3>${esc(q)}</h3><span class="badge">From your notes${a.section ? `: ${esc(a.section)}` : ""}</span></div><span class="marks m${m}">${m} marks</span></div>
            <div class="blk"><p>${esc(a.intro)}</p>${a.points.length ? `<ul>${a.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}</div>
            ${state.lang === "te" ? '<p class="tip">తెలుగు for your own notes needs Smart AI. The verified library topics have Telugu built in.</p>' : ""}
            ${m >= 8 ? '<p class="tip">💡 For 8–10 marks add a neat diagram, an example and a one-line conclusion.</p>' : ""}`;
        }
      } else {
        box.innerHTML = `<div class="empty-state"><b>This topic isn't in the verified library yet</b><p>Add your notes in <b>Exam notes</b> to get answers from them${AI.ready() ? ", or use Smart AI below" : ""}.</p><a class="btn btn-ghost" href="#library">Browse the topic library</a></div>`;
      }
      box.insertAdjacentHTML("beforeend", `
        <div class="row" style="margin-top:16px">
          ${text ? `<button class="btn btn-ghost sm" id="acp">${icon("copy")} Copy</button><button class="btn sm" id="ahw">${icon("pen")} Handwritten (full answer)</button>` : ""}
          ${AI.ready() ? `<button class="btn btn-ghost sm" id="aai">${icon("spark")} ${topic ? "Ask Smart AI too" : "Write with Smart AI"}</button>` : `<button class="btn btn-ghost sm" data-open-settings>${icon("spark")} Smart AI answers</button>`}
        </div><div id="aiOut"></div>`);
      if (text) { $("#acp", box).onclick = () => copy(text); $("#ahw", box).onclick = () => sendToHandwriting(text); }
      const ai = $("#aai", box);
      if (ai) ai.onclick = async () => {
        const o = $("#aiOut", box);
        o.innerHTML = `<p style="margin-top:14px"><span class="spinner"></span> <span class="muted">Writing a ${m}-mark answer…</span></p>`;
        try {
          const res = await AI.tasks.examAnswer(currentText() || "(no notes, use textbook knowledge)", q, m, state.lang);
          o.innerHTML = `<div class="box"><span class="badge info">✨ Smart AI · check facts with your textbook</span><div class="md ${state.lang === "te" ? "te" : ""}" style="margin-top:8px">${md(res)}</div><div class="row" style="margin-top:10px"><button class="btn sm" id="aihw">${icon("pen")} Handwritten</button></div></div>`;
          $("#aihw", o).onclick = () => sendToHandwriting(res);
          bindZoom(o);
        } catch (err) { o.innerHTML = `<p class="tip">${esc(err.message)}</p>`; }
      };
      bindSettingsLinks(box);
      bindZoom(box);
    }
    if (state.askQ) answer();
  };

  // EXAM
  views.exam = (el) => {
    const hasNotes = wordCount(currentText()) >= MIN_WORDS;
    let src = state.examSrc || (hasNotes ? "notes" : "library");
    const picked = new Set(state.examTopics || L.topics.map((t) => t.id));
    el.innerHTML = `
      <div class="card">
        <div class="row between">
          <div class="seg" id="src"><button data-v="notes" class="${src === "notes" ? "on" : ""}">From my notes</button><button data-v="library" class="${src === "library" ? "on" : ""}">Topic library</button></div>
          <span class="muted small" id="srcInfo"></span>
        </div>
        <div id="topicPick" style="margin-top:12px"></div>
      </div>
      <div class="card" id="examBox" style="margin-top:16px"></div>`;
    const build = () => {
      if (state.stopExam) state.stopExam();
      const box = $("#examBox", el);
      const tp = $("#topicPick", el);
      if (src === "notes") {
        tp.innerHTML = "";
        if (!hasNotes) { box.innerHTML = needNotes("quizzes from your notes"); $("#srcInfo", el).textContent = ""; return; }
        const bank = E.quiz(currentText(), 30).map((q) => ({ ...q, topic: currentTitle() }));
        $("#srcInfo", el).textContent = `${bank.length} questions from “${currentTitle()}”`;
        state.stopExam = X.mount(box, bank, { title: currentTitle(), onFinish: (pct) => P.recordQuiz(currentTitle(), pct) });
      } else {
        tp.innerHTML = `<div class="chips">${L.topics.map((t) => `<button class="chip ${picked.has(t.id) ? "on" : ""}" data-t="${t.id}">${esc(t.title)}</button>`).join("")}</div>`;
        $$("[data-t]", tp).forEach((b) => (b.onclick = () => { picked.has(b.dataset.t) ? picked.delete(b.dataset.t) : picked.add(b.dataset.t); state.examTopics = [...picked]; build(); }));
        const bank = L.topics.filter((t) => picked.has(t.id)).flatMap((t) => t.mcq.map((q) => ({ ...q, topic: t.title, tid: t.id })));
        $("#srcInfo", el).textContent = `${bank.length} verified questions`;
        state.stopExam = X.mount(box, bank, {
          title: picked.size === 1 ? L.get([...picked][0]).title : "Topic library quiz",
          onFinish: (pct) => { [...picked].forEach((id) => P.recordQuiz("lib:" + L.get(id).title, pct)); },
        });
      }
    };
    $$("#src button", el).forEach((b) => (b.onclick = () => { src = state.examSrc = b.dataset.v; $$("#src button", el).forEach((x) => x.classList.toggle("on", x === b)); build(); }));
    build();
  };

  // VISUAL
  views.visual = (el) => {
    const text = currentText();
    if (wordCount(text) < MIN_WORDS) { el.innerHTML = `<div class="card">${needNotes("mind maps")}</div>`; return; }
    let tab = state.visTab || "map";
    el.innerHTML = `
      <div class="card">
        <div class="row between"><div class="seg" id="vt"><button data-v="map">Mind map</button><button data-v="flow">Flowchart</button><button data-v="chapters">Chapter breakdown</button></div>
        <div class="map-tools" id="tools"></div></div>
        <div id="vis" style="margin-top:14px"></div>
      </div>`;
    const draw = () => {
      $$("#vt button", el).forEach((b) => b.classList.toggle("on", b.dataset.v === tab));
      const vis = $("#vis", el), tools = $("#tools", el);
      tools.innerHTML = "";
      if (tab === "chapters") {
        const ch = chapters();
        vis.innerHTML = `<div class="grid g2">${ch.map((c, i) => {
          const s = E.summarize(c.text, "short");
          const secs = s ? s.sections.filter((x) => x.title).map((x) => x.title) : [];
          return `<div class="card"><div class="card-h"><h3>${esc(c.title)}</h3><span class="badge">${(c.text.match(/\S+/g) || []).length} words</span></div>
            ${secs.length ? `<ul class="sum-sec" style="padding-left:18px">${secs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted small">${s ? esc(s.keyTerms.slice(0, 6).join(" · ")) : ""}</p>`}
            <div class="row" style="margin-top:12px"><button class="btn sm" data-ch="${i}" data-go="map">Mind map</button><button class="btn btn-ghost sm" data-ch="${i}" data-go="notes">Notes</button></div></div>`;
        }).join("")}</div>`;
        $$("[data-ch]", vis).forEach((b) => (b.onclick = () => { state.chapter = chapters().length > 1 ? +b.dataset.ch : -1; refreshChapterPick(); if (b.dataset.go === "map") { tab = state.visTab = "map"; draw(); } else location.hash = "#notes"; }));
        return;
      }
      const svg = tab === "map" ? (() => { const m = E.mindmap(text); return m && m.branches.length ? V.mindmapSVG(m, { oneSide: innerWidth < 900 }) : ""; })() : (() => { const f = E.flowchart(text); return f ? V.flowchartSVG(f) : ""; })();
      if (!svg) {
        vis.innerHTML = `<div class="empty-state"><b>${tab === "map" ? "Not enough topics for a mind map" : "No steps found"}</b><p>${tab === "map" ? "Add headings (each on its own line) to your notes." : "Flowcharts are made from numbered steps (1. 2. 3.) or sentences starting with First / Then / Next / Finally."}</p></div>`;
        return;
      }
      vis.innerHTML = `<div class="map-wrap" data-zoom="${tab === "map" ? "mind-map" : "flowchart"}">
        <div class="row" style="padding:8px;border-bottom:1px solid var(--line)"><button class="btn btn-ghost sm" data-z="out" aria-label="Zoom out">−</button><button class="btn btn-ghost sm" data-z="in" aria-label="Zoom in">+</button><button class="btn btn-ghost sm" data-z="fit">Fit</button><button class="btn btn-ghost sm" data-z="png">${icon("download")} PNG</button><button class="btn btn-ghost sm" data-z="svg">SVG</button><span class="muted small">Drag to move · Ctrl + scroll to zoom</span></div>
        <div class="stage"><div>${svg}</div></div></div>`;
      bindZoom(vis);
    };
    $$("#vt button", el).forEach((b) => (b.onclick = () => { tab = state.visTab = b.dataset.v; draw(); }));
    draw();
  };

  // LIBRARY
  views.library = (el, arg) => {
    if (arg && L.get(arg)) return topicView(el, L.get(arg));
    const units = [...new Set(L.topics.map((t) => t.unit))];
    el.innerHTML = `
      <div class="lib-head"><div><p class="muted">Hand-checked answers for core ECE/EEE topics, written for 2, 5, 8 and 10 marks with formulas and worked examples, in English and తెలుగు.</p></div>
      <input id="libq" placeholder="Search topics… (e.g. rectifier, zener, KVL)" style="max-width:320px" aria-label="Search topics"></div>
      <div id="libList"></div>`;
    const list = (q = "") => {
      const ql = q.toLowerCase();
      $("#libList", el).innerHTML = units.map((u) => {
        const ts = L.topics.filter((t) => t.unit === u && (!ql || (t.title + " " + t.title_te + " " + t.en.definition).toLowerCase().includes(ql)));
        if (!ts.length) return "";
        return `<h3 class="unit-h">${esc(u)}</h3><div class="grid g4">${ts.map((t) => {
          const p = P.get("lib:" + t.title);
          return `<a class="card topic" href="#library/${t.id}"><b>${esc(t.title)}</b><small>${esc(t.en.definition.split(". ")[0].replace(/\.$/, ""))}.</small><small class="te">${esc(t.title_te)}</small>${p.read || p.quizBest !== null ? `<small>✓ ${p.read ? "Studied" : ""}${p.quizBest !== null ? ` · Quiz ${p.quizBest}%` : ""}</small>` : ""}</a>`;
        }).join("")}</div>`;
      }).join("") || `<div class="empty-state"><b>No topics match</b><p>The library covers diodes, rectifiers, transistors, circuit laws and network theorems.</p></div>`;
    };
    $("#libq", el).addEventListener("input", (e) => list(e.target.value));
    list();
  };

  function topicView(el, t) {
    let marks = state.libMarks || 10, lang = state.libLang || "en";
    $("#viewTitle").textContent = t.title;
    P.update("lib:" + t.title, { read: true });
    el.innerHTML = `
      <p><a href="#library" class="small">← All topics</a></p>
      <div class="card" style="margin-top:10px">
        <div class="lib-head">
          <div><h2 style="font-size:24px;letter-spacing:-.02em">${esc(t.title)}</h2><p class="te muted">${esc(t.title_te)} · ${esc(t.unit)}</p></div>
          <div class="row"><div class="seg" id="tl"><button data-v="en">English</button><button data-v="te">తెలుగు</button></div></div>
        </div>
        <div class="row between"><div class="seg" id="tm">${[2, 5, 8, 10].map((m) => `<button data-v="${m}">${m} marks</button>`).join("")}</div>
          <div class="row"><button class="btn btn-ghost sm" id="tq">${icon("check")} Quiz this topic</button><button class="btn btn-ghost sm" id="tc">${icon("copy")} Copy</button><button class="btn sm" id="th">${icon("pen")} Handwritten</button></div></div>
        <div class="ans" id="ta"></div>
      </div>`;
    const draw = () => {
      $$("#tm button", el).forEach((b) => b.classList.toggle("on", +b.dataset.v === marks));
      $$("#tl button", el).forEach((b) => b.classList.toggle("on", b.dataset.v === lang));
      const a = L.answer(t, marks, lang);
      $("#ta", el).innerHTML = libAnswerHTML(a, lang);
      $("#tc", el).onclick = () => copy(L.answerText(a));
      $("#th", el).onclick = () => sendToHandwriting(L.answerText(a));
    };
    $$("#tm button", el).forEach((b) => (b.onclick = () => { marks = state.libMarks = +b.dataset.v; draw(); }));
    $$("#tl button", el).forEach((b) => (b.onclick = () => { lang = state.libLang = b.dataset.v; draw(); }));
    $("#tq", el).onclick = () => { state.examSrc = "library"; state.examTopics = [t.id]; location.hash = "#exam"; };
    draw();
  }

  // REVISE
  views.revise = (el) => {
    let tab = state.revTab || "quick";
    const hasNotes = wordCount(currentText()) >= MIN_WORDS;
    el.innerHTML = `
      <div class="card"><div class="row between"><div class="seg" id="rt"><button data-v="quick">Quick revision</button><button data-v="formulas">Formula sheet</button><button data-v="cards">Flashcards</button><button data-v="questions">Important questions</button></div></div>
      <div id="rv" style="margin-top:16px"></div></div>`;
    const draw = () => {
      $$("#rt button", el).forEach((b) => b.classList.toggle("on", b.dataset.v === tab));
      const rv = $("#rv", el);
      const title = currentTitle();
      if (tab === "quick") {
        if (!hasNotes) { rv.innerHTML = needNotes("quick revision"); return; }
        const s = summary(currentText(), "short");
        const cards = s.sections.map((sec) => ({ title: sec.title || s.title, points: sec.points }));
        if (s.definitions.length) cards.push({ title: "Definitions", points: s.definitions.map((d) => `${d.term}: ${d.definition}.`) });
        if (s.formulas.length) cards.push({ title: "Formulas", points: s.formulas, formula: true });
        let i = 0;
        const show = () => {
          const c = cards[i];
          rv.innerHTML = `<div class="rev-card"><div class="fc-top"><span>Card ${i + 1} of ${cards.length}</span><span>${esc(s.title)}</span></div>
            <div class="rev-body"><h3 style="font-size:20px;margin-bottom:10px">${esc(c.title)}</h3>${c.formula ? c.points.map((f) => `<code class="f">${esc(f)}</code>`).join("") : `<ul class="sum-sec" style="padding-left:20px">${c.points.map((p) => `<li style="font-size:16px;margin:8px 0">${esc(p)}</li>`).join("")}</ul>`}</div>
            <div class="bar" style="margin-top:14px"><i style="width:${((i + 1) / cards.length) * 100}%"></i></div>
            <div class="rev-nav"><button class="btn btn-ghost" id="rp" ${i ? "" : "disabled"}>← Prev</button>${i < cards.length - 1 ? '<button class="btn" id="rn">Next →</button>' : '<button class="btn btn-brand" id="rd">✓ Mark chapter revised</button>'}</div></div>`;
          $("#rp", rv).onclick = () => { i--; show(); };
          const n = $("#rn", rv); if (n) n.onclick = () => { i++; show(); };
          const d = $("#rd", rv); if (d) d.onclick = () => { P.update(title, { revised: true }); toast("Chapter marked as revised ✓"); d.disabled = true; d.textContent = "✓ Revised"; };
        };
        show();
      } else if (tab === "formulas") {
        const s = hasNotes ? summary(currentText(), "detailed") : null;
        const libF = L.topics.map((t) => ({ t, f: t.en.formulas }));
        const text = ["# Formula sheet", ...(s && s.formulas.length ? ["## From my notes", ...s.formulas.map((f) => `= ${f}`)] : []), ...libF.flatMap(({ t, f }) => [`## ${t.title}`, ...f.map((x) => `= ${x}`)])].join("\n");
        rv.innerHTML = `<div class="row between"><p class="muted small">All formulas in one place. Print it or turn it into handwritten notes.</p><div class="row"><button class="btn btn-ghost sm" id="fc">${icon("copy")} Copy</button><button class="btn sm" id="fh">${icon("pen")} Handwritten</button></div></div>
          ${s && s.formulas.length ? `<div class="box formula"><h4>From my notes: ${esc(title)}</h4>${s.formulas.map((f) => `<code class="f">${esc(f)}</code>`).join("")}</div>` : ""}
          <div class="grid g2" style="margin-top:16px">${libF.map(({ t, f }) => `<div class="box"><h4><a href="#library/${t.id}">${esc(t.title)}</a> <span class="badge ok">verified</span></h4>${f.map((x) => `<code class="f">${esc(x)}</code>`).join("")}</div>`).join("")}</div>`;
        $("#fc", rv).onclick = () => copy(text);
        $("#fh", rv).onclick = () => sendToHandwriting(text);
      } else if (tab === "cards") {
        let src = state.cardSrc || (hasNotes ? "notes" : "library");
        rv.innerHTML = `<div class="seg" id="cs"><button data-v="notes" class="${src === "notes" ? "on" : ""}">My notes</button><button data-v="library" class="${src === "library" ? "on" : ""}">Topic library</button></div><div id="cardsOut" style="margin-top:14px;max-width:640px"></div>`;
        const go = () => {
          const out = $("#cardsOut", rv);
          if (src === "notes" && !hasNotes) { out.innerHTML = needNotes("flashcards"); return; }
          const cards = src === "notes" ? E.flashcards(currentText()) : L.topics.flatMap((t) => [{ front: t.title, back: t.en.definition }, ...t.en.formulas.slice(0, 1).map((f) => ({ front: `${t.title}: key formula`, back: f }))]);
          V.flashcardsUI(out, cards, { onChange: (known, total) => P.update(src === "notes" ? title : "lib:Flashcards", { cardsKnown: known, cardsTotal: total }) });
        };
        $$("#cs button", rv).forEach((b) => (b.onclick = () => { src = state.cardSrc = b.dataset.v; $$("#cs button", rv).forEach((x) => x.classList.toggle("on", x === b)); go(); }));
        go();
      } else {
        const s = hasNotes ? summary(currentText(), "detailed") : null;
        const fromNotes = s ? s.examQuestions.map((q) => ({ ...q, marks: /^What is/.test(q.q) ? 8 : q.marks })) : [];
        const fromLib = L.topics.flatMap((t) => [
          { q: `Define ${t.title.replace(/ \(.*\)/, "")}.`, marks: 2 },
          { q: `Explain ${t.title} with a neat diagram.`, marks: 10 },
        ]);
        const groups = [2, 5, 8, 10].map((m) => ({ m, items: [...fromNotes.filter((q) => q.marks === m).map((q) => ({ ...q, src: "notes" })), ...fromLib.filter((q) => q.marks === m).map((q) => ({ ...q, src: "lib" }))] })).filter((g) => g.items.length);
        rv.innerHTML = groups.map((g) => `<div class="box ${g.m >= 8 ? "exam" : ""}"><h4>${marksBadge(g.m)} ${g.m}-mark questions</h4><ul class="q-list">${g.items.map((q) => `<li><button class="link-btn" data-q="${esc(q.q)}" data-m="${g.m}">${esc(q.q)}</button><span class="badge ${q.src === "lib" ? "ok" : ""}">${q.src === "lib" ? "verified" : "my notes"}</span></li>`).join("")}</ul></div>`).join("");
        $$("[data-q]", rv).forEach((b) => (b.onclick = () => { state.askQ = b.dataset.q; state.askM = +b.dataset.m; location.hash = "#ask"; }));
      }
    };
    $$("#rt button", el).forEach((b) => (b.onclick = () => { tab = state.revTab = b.dataset.v; draw(); }));
    draw();
  };

  // HANDWRITE
  views.handwrite = (el) => {
    const saved = store.get("dvn_hw", "");
    el.innerHTML = `
      <div class="split">
        <div class="card hw-controls sticky">
          <label class="lbl">Text <small class="muted"># heading · ## sub · - point · = formula · | table |</small></label>
          <textarea id="hwText" style="min-height:200px" placeholder="# Zener diode&#10;## Definition&#10;A Zener diode works in reverse breakdown…&#10;= I_Z = I_S − I_L">${esc(saved)}</textarea>
          <div class="row" style="margin-top:8px"><button class="btn btn-ghost sm" id="hwTable">+ Table</button></div>
          <div class="two">
            <div><label class="lbl">Handwriting</label><select id="hwFont">${Object.entries(H.FONTS).map(([k, v]) => `<option value="${esc(k)}">${esc(v.label)}</option>`).join("")}</select></div>
            <div><label class="lbl">Paper</label><select id="hwPaper"><option value="ruled">Ruled notebook</option><option value="assignment">Assignment sheet</option><option value="plain">Plain white</option><option value="grid">Grid</option></select></div>
          </div>
          <div class="two">
            <div><label class="lbl">Ink</label><select id="hwInk"><option value="blue">Blue</option><option value="black">Black</option><option value="dark blue">Dark blue</option><option value="green">Green</option></select></div>
            <div><label class="lbl">Headings</label><select id="hwHead"><option value="red">Red ink</option><option value="same">Same ink</option></select></div>
          </div>
          <label class="lbl">Text size <output id="sizeVal">36</output></label><input type="range" id="hwSize" min="26" max="50" value="36">
          <label class="lbl">Line spacing <output id="spaceVal">1.00</output></label><input type="range" id="hwSpace" min="0.9" max="1.5" step="0.05" value="1">
          <label class="lbl">Natural messiness <output id="messVal">50%</output></label><input type="range" id="hwMess" min="0" max="1" step="0.05" value="0.5">
          <button class="btn btn-brand big" style="width:100%;margin-top:16px" id="hwMake">${icon("pen")} Make handwritten notes</button>
          <div class="row" style="margin-top:8px"><button class="btn sm" style="flex:1" id="hwPdf" disabled>${icon("download")} PDF</button><button class="btn btn-ghost sm" style="flex:1" id="hwPng" disabled>${icon("download")} PNG pages</button></div>
          <p class="muted small" style="margin-top:10px">For your own revision. Check your college rules before submitting handwritten-style pages.</p>
        </div>
        <div class="card hw-preview" id="hwPreview"><div class="empty-state"><b>Your handwritten pages appear here</b><p>The complete text is written, nothing is shortened. Long answers continue on the next page.</p></div></div>
      </div>`;
    const ta = $("#hwText", el);
    ta.addEventListener("input", () => store.set("dvn_hw", ta.value));
    $("#hwTable", el).onclick = () => { ta.value += `${ta.value && !ta.value.endsWith("\n") ? "\n" : ""}| Parameter | Half-wave | Full-wave |\n| V_dc | V_m/π | 2V_m/π |\n| Ripple factor | 1.21 | 0.482 |\n| Efficiency | 40.6 % | 81.2 % |\n`; store.set("dvn_hw", ta.value); };
    const bindOut = (id, out, fmt) => { const i = $(id, el), o = $(out, el); const set = () => (o.textContent = fmt(i.value)); i.addEventListener("input", set); set(); };
    bindOut("#hwSize", "#sizeVal", (v) => v);
    bindOut("#hwSpace", "#spaceVal", (v) => Number(v).toFixed(2));
    bindOut("#hwMess", "#messVal", (v) => `${Math.round(v * 100)}%`);
    let pages = [];
    const make = async () => {
      const text = ta.value.trim();
      if (!text) { ta.focus(); return toast("Type something or send an answer here first"); }
      const btn = $("#hwMake", el);
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Writing…`;
      try {
        pages = await H.render(text, { font: $("#hwFont", el).value, paper: $("#hwPaper", el).value, ink: $("#hwInk", el).value, headingInk: $("#hwHead", el).value, size: +$("#hwSize", el).value, spacing: +$("#hwSpace", el).value, messiness: +$("#hwMess", el).value });
        const prev = $("#hwPreview", el);
        prev.innerHTML = `<div class="pages-head"><b>${pages.length} page${pages.length > 1 ? "s" : ""}</b><span class="muted small">A4 · ready to print</span></div>`;
        pages.forEach((c, i) => { const w = document.createElement("div"); w.className = "page"; c.setAttribute("aria-label", `Handwritten page ${i + 1}`); w.appendChild(c); prev.appendChild(w); });
        $("#hwPdf", el).disabled = $("#hwPng", el).disabled = false;
        if (innerWidth < 1100) prev.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) { toast(err.message || "Something went wrong"); }
      finally { btn.disabled = false; btn.innerHTML = `${icon("pen")} Make handwritten notes`; }
    };
    $("#hwMake", el).onclick = make;
    ["#hwFont", "#hwPaper", "#hwInk", "#hwHead", "#hwSize", "#hwSpace", "#hwMess"].forEach((id) => $(id, el).addEventListener("change", () => { if (pages.length) make(); }));
    $("#hwPdf", el).onclick = async (e) => { e.currentTarget.disabled = true; try { await H.downloadPDF(pages, "devinventor-notes.pdf"); } catch (err) { toast(err.message); } finally { $("#hwPdf", el).disabled = false; } };
    $("#hwPng", el).onclick = () => { H.downloadPNGs(pages, "devinventor-notes"); toast(pages.length > 1 ? `Downloading ${pages.length} images…` : "Downloading image…"); };
    if (state.hwAuto && saved) { state.hwAuto = false; make(); }
  };

  // PROGRESS
  views.progress = (el) => {
    const ch = chapters();
    const notesRows = ch.map((c) => P.get(c.title));
    const others = P.all().filter((p) => !p.title.startsWith("lib:") && !ch.some((c) => c.title === p.title));
    const lib = L.topics.map((t) => ({ t, p: P.get("lib:" + t.title) }));
    const row = (p, label, href) => {
      const sc = P.score(p);
      return `<div class="prog-row"><div><b>${href ? `<a href="${href}">${esc(label)}</a>` : esc(label)}</b><div class="checks"><span class="chip ${p.read ? "on" : ""}">${p.read ? "✓" : "○"} Studied</span><span class="chip ${p.quizBest !== null ? "on" : ""}">Quiz ${p.quizBest !== null ? p.quizBest + "%" : "—"}</span>${p.cardsTotal ? `<span class="chip on">Cards ${p.cardsKnown}/${p.cardsTotal}</span>` : ""}<span class="chip ${p.revised ? "on" : ""}">${p.revised ? "✓" : "○"} Revised</span></div></div><div class="bar"><i style="width:${sc}%"></i></div><div class="pct">${sc}%</div></div>`;
    };
    el.innerHTML = `
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>My chapters</h3><a class="btn btn-ghost sm" href="#notes">Notes</a></div>
          ${ch.length ? ch.map((c, i) => row(notesRows[i], c.title)).join("") : `<p class="muted">Add notes to track chapter-wise progress.</p>`}
          ${others.length ? `<h4 class="unit-h">Earlier notes</h4>${others.map((p) => row(p, p.title)).join("")}` : ""}
        </div>
        <div class="card"><div class="card-h"><h3>Topic library</h3><span class="badge ok">${lib.filter((x) => x.p.read).length}/${lib.length} studied</span></div>
          ${lib.map(({ t, p }) => row(p, t.title, `#library/${t.id}`)).join("")}
        </div>
      </div>
      <p class="muted small" style="margin-top:14px">Score = studied 20% + flashcards 30% + best quiz 30% + revised 20%. Saved only on this device. <button class="link-btn" id="resetP">Reset progress</button></p>`;
    $("#resetP", el).onclick = () => { if (confirm("Reset all progress?")) { P.reset(); render(); } };
  };

  // ---------------- file upload ----------------
  function bindUpload(el, onText) {
    const progress = (pct, text) => {
      $("#progress", el).hidden = pct === null;
      if (pct !== null) { $("#progressBar", el).style.width = `${Math.round(pct * 100)}%`; $("#progressText", el).textContent = text; }
    };
    async function readPDF(file) {
      await H.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      const pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let p = 1; p <= doc.numPages; p++) {
        progress(p / doc.numPages, `Reading page ${p} of ${doc.numPages}…`);
        const content = await (await doc.getPage(p)).getTextContent();
        let lastY = null, line = "";
        const lines = [];
        for (const item of content.items) {
          const y = Math.round(item.transform[5]);
          if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ""; }
          line += item.str + (item.hasEOL ? "\n" : "");
          lastY = y;
        }
        lines.push(line.trim());
        pages.push(lines.join("\n"));
      }
      if (!pages.join("").trim()) throw new Error("This PDF has no text layer (it's scanned). Upload screenshots as photos instead.");
      return pages.join("\n\n");
    }
    async function readDOCX(file) {
      await H.loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
      return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    }
    async function readImage(file) {
      progress(0.02, "Loading the photo reader (first time only, ~10 MB)…");
      await H.loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      const { data } = await window.Tesseract.recognize(file, "eng", { logger: (m) => { if (m.status === "recognizing text") progress(m.progress, `Reading text from photo… ${Math.round(m.progress * 100)}%`); } });
      return data.text;
    }
    async function handle(file) {
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) return toast("File is too big (max 25 MB).");
      const name = file.name.toLowerCase();
      try {
        progress(0.05, `Opening ${file.name}…`);
        let text;
        if (name.endsWith(".pdf") || file.type === "application/pdf") text = await readPDF(file);
        else if (name.endsWith(".docx")) text = await readDOCX(file);
        else if (file.type.startsWith("image/")) text = await readImage(file);
        else if (/\.(txt|md)$/.test(name) || file.type.startsWith("text/")) text = await file.text();
        else if (name.endsWith(".doc")) throw new Error("Old .doc files aren't supported. Save as .docx or PDF and try again.");
        else throw new Error("Unsupported file. Use PDF, DOCX, TXT or a photo.");
        text = E.clean(text);
        if (!text) throw new Error("No text found in this file.");
        onText(text);
        toast(file.type.startsWith("image/") ? "Text read from photo. Please check it for mistakes." : `Added text from ${file.name}`);
      } catch (err) {
        toast(err.message || "Could not read this file.", 4000);
      } finally {
        progress(null);
        $("#file", el).value = "";
      }
    }
    $("#file", el).onchange = (e) => handle(e.target.files[0]);
    const drop = $("#drop", el);
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => handle(e.dataTransfer.files[0]));
  }

  // ---------------- chrome: nav, theme, settings, chapters ----------------
  $("#nav").innerHTML = VIEWS.map((v, i) => `${i === 6 ? '<div class="sep"></div>' : ""}<a href="#${v.id}" data-v="${v.id}">${icon(v.icon)}<span>${v.label}</span></a>`).join("");
  $("#tabbar").innerHTML = TABS.map((id) => { const v = VIEWS.find((x) => x.id === id); return `<a href="#${id}" data-v="${id}">${icon(v.icon)}<span>${v.label.split(" ")[0]}</span></a>`; }).join("");
  $("#menuBtn").innerHTML = icon("menu");
  $("#settingsBtn").innerHTML = icon("gear");
  const setThemeIcon = () => ($("#themeBtn").innerHTML = icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon"));
  setThemeIcon();
  $("#themeBtn").onclick = () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    store.set("dvn_theme", t);
    setThemeIcon();
  };
  $("#menuBtn").onclick = () => $("#side").classList.toggle("open");
  $$("#nav a").forEach((a) => a.addEventListener("click", () => $("#side").classList.remove("open")));
  document.addEventListener("click", (e) => { if (innerWidth <= 860 && !e.target.closest("#side") && !e.target.closest("#menuBtn")) $("#side").classList.remove("open"); });

  function refreshAIPill() {
    const on = AI.ready();
    $("#aiPill").classList.toggle("on", on);
    $("#aiPillText").textContent = on ? "Smart AI on" : "Smart AI off";
  }
  function openSettings() {
    const s = AI.settings();
    $("#aiEnabled").checked = s.enabled;
    $("#aiKey").value = s.key;
    $("#aiModel").value = s.model;
    $("#settings").showModal();
  }
  function bindSettingsLinks(root) { $$("[data-open-settings]", root).forEach((b) => (b.onclick = (e) => { e.preventDefault(); openSettings(); })); }
  $("#settingsBtn").onclick = openSettings;
  $("#aiPill").onclick = openSettings;
  $("#saveSettings").onclick = () => {
    AI.save({ enabled: $("#aiEnabled").checked, key: $("#aiKey").value.trim(), model: $("#aiModel").value.trim() || "gemini-2.5-flash" });
    refreshAIPill();
    if ($("#aiEnabled").checked && $("#aiKey").value.trim().length < 20) toast("Add your Gemini key to use Smart AI");
    else toast("Settings saved");
    setTimeout(render, 50);
  };
  $("#clearData").onclick = () => {
    if (!confirm("Delete your notes, progress and settings from this browser?")) return;
    try { Object.keys(localStorage).filter((k) => k.startsWith("dvn_")).forEach((k) => localStorage.removeItem(k)); } catch {}
    state.notes = ""; state.chapter = -1;
    $("#settings").close();
    refreshAIPill(); refreshChapterPick(); render();
    toast("All your data was deleted from this browser");
  };

  function refreshChapterPick() {
    const ch = chapters();
    const sel = $("#chapter");
    sel.innerHTML = `<option value="-1">All chapters</option>` + ch.map((c, i) => `<option value="${i}">${esc(c.title)}</option>`).join("");
    sel.value = String(state.chapter);
    const view = VIEWS.find((v) => v.id === route().view);
    $("#chapterPick").hidden = !(view?.chapters && ch.length > 1);
  }
  $("#chapter").onchange = (e) => { state.chapter = +e.target.value; render(); };

  // ---------------- router ----------------
  const route = () => { const [view, arg] = (location.hash.slice(1) || "home").split("/"); return { view: VIEWS.some((v) => v.id === view) ? view : "home", arg }; };
  function render() {
    const { view, arg } = route();
    if (state.stopExam) { state.stopExam(); state.stopExam = null; }
    const v = VIEWS.find((x) => x.id === view);
    $("#viewTitle").textContent = v.label;
    $("#viewSub").textContent = v.sub;
    document.title = `${v.label} · DevInventor Notes`;
    $$("#nav a, #tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.v === view));
    refreshChapterPick();
    const el = $("#view");
    el.style.animation = "none"; void el.offsetHeight; el.style.animation = "";
    try {
      views[view](el, arg);
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="card empty-state"><b>Something went wrong</b><p>${esc(err.message)}</p><a class="btn btn-ghost" href="#home">Go home</a></div>`;
    }
    bindSettingsLinks(el);
    scrollTo(0, 0);
  }
  addEventListener("hashchange", render);
  refreshAIPill();
  render();
})();
