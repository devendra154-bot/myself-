/* DevInventor Notes: page logic (inputs, tools, handwriting). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = window.NotesEngine, V = window.NotesVisual, H = window.NotesHandwrite, F = window.NotesFormat;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  const toast = (msg, ms = 2600) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), ms);
  };

  $("#yr").textContent = new Date().getFullYear();
  $("#burger").onclick = () => $("#navLinks").classList.toggle("open");
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    if (a.dataset.tool) openTool(a.dataset.tool);
  }));

  // ---------------- notes input ----------------
  const notes = $("#notes");
  const MIN_WORDS = 40;
  const wordCount = () => (notes.value.trim().match(/\S+/g) || []).length;
  const updateCount = () => { $("#wordCount").textContent = `${wordCount()} words`; };

  notes.value = store.get("dvn_notes") || "";
  updateCount();
  let debounce;
  notes.addEventListener("input", () => {
    updateCount();
    store.set("dvn_notes", notes.value);
    clearTimeout(debounce);
    debounce = setTimeout(refresh, 500);
  });
  $("#sample").onclick = () => { notes.value = window.SAMPLE_NOTES; notes.dispatchEvent(new Event("input")); refresh(); toast("Sample notes loaded: Operating Systems, CPU Scheduling"); };
  $("#clear").onclick = () => { notes.value = ""; notes.dispatchEvent(new Event("input")); refresh(); };

  // ---------------- file upload ----------------
  const progress = (pct, text) => {
    $("#progress").hidden = pct === null;
    if (pct !== null) { $("#progressBar").style.width = `${Math.round(pct * 100)}%`; $("#progressText").textContent = text; }
  };

  /** Read one or more files (PDF, Word, text, photos) and add their text to the notes. */
  async function handleFiles(fileList) {
    const files = [...(fileList || [])].filter(Boolean);
    if (!files.length) return;
    const parts = [];
    let lastWarning = "";
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const label = files.length > 1 ? `(${i + 1}/${files.length}) ` : "";
      const isPhoto = /^image\//.test(file.type) || /\.(jpe?g|png|webp|bmp)$/i.test(file.name || "");
      const photo = isPhoto ? rememberPhoto(file) : null;
      try {
        progress(0.02, `${label}Opening ${file.name || "photo"}…`);
        const r = await window.NotesReaders.read(file, (p, t) => progress(p, label + t));
        const text = E.clean(r.text);
        if (!text) throw new Error("No text found in this file.");
        if (photo) photo.lines = r.lines || [];
        parts.push(text);
        if (r.warning) lastWarning = r.warning;
      } catch (err) {
        failed++;
        toast(isPhoto
          ? `${label}No readable text in this photo. If it's a diagram, tap it under "✂️ Photo has a diagram?" to add it to your handwritten notes.`
          : `${label}${err.message || "Could not read this file."}`, 7000);
        if (files.length > 1) await new Promise((res) => setTimeout(res, 1500));
      }
    }
    progress(null);
    $("#file").value = "";
    $("#camera").value = "";
    if (!parts.length) return;
    const add = parts.join("\n\n");
    notes.value = notes.value.trim() ? notes.value.trim() + "\n\n" + add : add;
    notes.dispatchEvent(new Event("input"));
    refresh();
    const n = parts.length;
    toast(failed ? `Added text from ${n} of ${files.length} files.` : lastWarning || (n > 1 ? `Added text from ${n} files.` : "Text added."), 5000);
  }

  $("#file").onchange = (e) => handleFiles(e.target.files);
  $("#camera").onchange = (e) => handleFiles(e.target.files);
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

  // ---------------- diagrams (cropped from photos, drawn into handwritten notes) ----------------
  const diagrams = []; // index + 1 = number used in "[diagram N]"
  const photos = [];   // recent uploaded photos: { file, url }

  /** Open the crop dialog for a photo. Resolves to a canvas (the cropped diagram) or null. */
  function cropPhoto(file) {
    return new Promise(async (resolve) => {
      let bmp;
      try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
      catch { toast("This photo couldn't be opened. Use a JPG or PNG photo."); return resolve(null); }
      const box = $("#cropper"), cv = $("#cropCanvas"), cx = cv.getContext("2d");
      const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      let sel = null, start = null;
      const draw = () => {
        cx.drawImage(bmp, 0, 0, cv.width, cv.height);
        if (!sel) return;
        cx.fillStyle = "rgba(0,0,0,.5)";
        cx.beginPath(); cx.rect(0, 0, cv.width, cv.height); cx.rect(sel.x, sel.y, sel.w, sel.h); cx.fill("evenodd");
        cx.strokeStyle = "#8c66e4"; cx.lineWidth = Math.max(3, cv.width / 300); cx.setLineDash([12, 8]);
        cx.strokeRect(sel.x, sel.y, sel.w, sel.h); cx.setLineDash([]);
      };
      const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; };
      cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); start = pt(e); sel = null; draw(); };
      cv.onpointermove = (e) => {
        if (!start) return;
        const q = pt(e);
        sel = { x: Math.max(0, Math.min(start.x, q.x)), y: Math.max(0, Math.min(start.y, q.y)), w: Math.abs(q.x - start.x), h: Math.abs(q.y - start.y) };
        sel.w = Math.min(sel.w, cv.width - sel.x); sel.h = Math.min(sel.h, cv.height - sel.y);
        draw();
      };
      cv.onpointerup = () => { start = null; $("#cropOk").disabled = !(sel && sel.w > 20 && sel.h > 20); };
      const finish = (area) => {
        box.hidden = true;
        document.body.style.overflow = "";
        if (!area) return resolve(null);
        const out = document.createElement("canvas");
        const ok = Math.min(1, 1600 / Math.max(area.w / k, area.h / k));
        out.width = Math.round((area.w / k) * ok); out.height = Math.round((area.h / k) * ok);
        out.getContext("2d").drawImage(bmp, area.x / k, area.y / k, area.w / k, area.h / k, 0, 0, out.width, out.height);
        out.area = { x0: area.x / cv.width, y0: area.y / cv.height, x1: (area.x + area.w) / cv.width, y1: (area.y + area.h) / cv.height };
        resolve(out);
      };
      $("#cropOk").disabled = true;
      $("#cropOk").onclick = () => finish(sel);
      $("#cropWhole").onclick = () => finish({ x: 0, y: 0, w: cv.width, h: cv.height });
      $("#cropCancel").onclick = () => finish(null);
      box.hidden = false;
      document.body.style.overflow = "hidden";
      draw();
    });
  }

  /** Put "[diagram N]" on its own line at the cursor (or the end) of a textarea. */
  function insertMarker(ta, n) {
    const v = ta.value, at = document.activeElement === ta ? ta.selectionEnd : v.length;
    const before = v.slice(0, at).replace(/[ \t]*$/, ""), after = v.slice(at).replace(/^[ \t]*/, "");
    const mark = `[diagram ${n}]`;
    ta.value = (before ? before.replace(/\n*$/, "\n") : "") + mark + (after ? "\n" + after.replace(/^\n*/, "") : "");
    ta.dispatchEvent(new Event("input"));
  }

  function renderDiagrams() {
    const list = $("#hwDgList");
    list.innerHTML = "";
    diagrams.forEach((d, i) => {
      if (!d) return;
      const item = document.createElement("div");
      item.className = "dg-item";
      const th = document.createElement("canvas");
      const k = 172 / Math.max(d.width, d.height);
      th.width = Math.max(1, Math.round(d.width * k)); th.height = Math.max(1, Math.round(d.height * k));
      th.getContext("2d").drawImage(d, 0, 0, th.width, th.height);
      item.append(th);
      item.insertAdjacentHTML("beforeend", `<span>[diagram ${i + 1}]</span><button title="Remove diagram ${i + 1}" aria-label="Remove diagram ${i + 1}">✕</button>`);
      $("button", item).onclick = () => {
        diagrams[i] = null;
        const re = new RegExp(`^\\s*\\[diagram ${i + 1}\\]\\s*\\n?`, "gim");
        hwText.value = hwText.value.replace(re, ""); store.set("dvn_hw", hwText.value);
        notes.value = notes.value.replace(re, "");
        renderDiagrams();
        if (pages.length) makeHandwriting();
      };
      list.append(item);
    });
  }

  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
  /**
   * Put the diagram where it was in the photo: text lines read from inside the cropped
   * area (labels such as "R = 10 Ω") are removed, and the marker goes in their place,
   * or after the last line above the diagram.
   */
  function placeInNotes(n, area, ocrLines) {
    const mark = `[diagram ${n}]`;
    const textLines = notes.value.split("\n");
    const find = (ocr) => {
      const k = norm(ocr);
      if (k.length < 2) return -1;
      return textLines.findIndex((t, i) => !used.has(i) && norm(t.replace(/^[#\-\s]+/, "")) && (norm(t).includes(k) || (k.includes(norm(t)) && norm(t).length >= 3)));
    };
    const used = new Set();
    const cx = (l) => (l.x0 + l.x1) / 2, cy = (l) => (l.y0 + l.y1) / 2;
    const inside = ocrLines.filter((l) => cx(l) > area.x0 && cx(l) < area.x1 && cy(l) > area.y0 && cy(l) < area.y1);
    const removed = [];
    for (const l of inside) { const i = find(l.text); if (i >= 0) { used.add(i); removed.push(i); } }
    let at;
    if (removed.length) at = Math.min(...removed);
    else {
      const above = ocrLines.filter((l) => l.y1 <= area.y0 + 0.01).sort((a, b) => b.y1 - a.y1);
      at = textLines.length;
      for (const l of above) { const i = find(l.text); if (i >= 0) { at = i + 1; break; } }
    }
    const out = [];
    textLines.forEach((t, i) => { if (i === at) out.push(mark); if (!used.has(i)) out.push(t); });
    if (at >= textLines.length) out.push(mark);
    notes.value = out.join("\n").replace(/\n{3,}/g, "\n\n");
    notes.dispatchEvent(new Event("input"));
    return removed.length;
  }

  async function addDiagramFrom(file, target, photo) {
    const c = await cropPhoto(file);
    if (!c) return;
    diagrams.push(c);
    if (target === notes && photo && photo.lines && photo.lines.length) placeInNotes(diagrams.length, c.area, photo.lines);
    else insertMarker(target, diagrams.length);
    renderDiagrams();
    toast(target === notes
      ? `Diagram ${diagrams.length} added ✓ Use "✍️ Full notes" to write it with your notes.`
      : `Diagram ${diagrams.length} added ✓ Press "Make handwritten notes".`, 4000);
  }

  function rememberPhoto(file) {
    const photo = { file, url: URL.createObjectURL(file), lines: [] };
    photos.push(photo);
    while (photos.length > 8) URL.revokeObjectURL(photos.shift().url);
    $("#photoDg").hidden = false;
    $("#photoDgList").innerHTML = photos.map((p, i) => `<button data-p="${i}" title="Crop a diagram from this photo"><img src="${p.url}" alt="Uploaded photo ${i + 1}"></button>`).join("");
    $$("#photoDgList button").forEach((b) => (b.onclick = () => addDiagramFrom(photos[+b.dataset.p].file, notes, photos[+b.dataset.p])));
    return photo;
  }

  // ---------------- tools ----------------
  let tool = "summary";
  let length = "medium";
  let lastSummary = null, lastMapSVG = "", lastFlowSVG = "";

  function openTool(name) {
    tool = name;
    $$("#toolTabs button").forEach((b) => b.classList.toggle("active", b.dataset.tool === name));
    $$(".tool").forEach((p) => (p.hidden = p.dataset.panel !== name));
    refresh();
  }
  $$("#toolTabs button").forEach((b) => (b.onclick = () => openTool(b.dataset.tool)));
  $$("#length button").forEach((b) => (b.onclick = () => {
    length = b.dataset.v;
    $$("#length button").forEach((x) => x.classList.toggle("active", x === b));
    refresh();
  }));

  const needMore = (el) => {
    const n = wordCount();
    el.innerHTML = n === 0
      ? `<p class="empty">Add your notes on the left (or tap <b>Try sample notes</b>) to start.</p>`
      : `<p class="empty">Add a bit more. You have ${n} words, and at least ${MIN_WORDS} are needed for useful results.</p>`;
  };

  function refresh() {
    const text = notes.value;
    const enough = wordCount() >= MIN_WORDS;
    if (tool === "summary") return renderSummary(enough, text);
    if (tool === "ask") return enough ? null : needMore($("#askOut"));
    if (tool === "mindmap") {
      const el = $("#mapOut");
      if (!enough) return needMore(el);
      const map = E.mindmap(text);
      lastMapSVG = map && map.branches.length ? V.mindmapSVG(map, { oneSide: el.clientWidth < 900 }) : "";
      el.innerHTML = lastMapSVG || `<p class="empty">Couldn't find enough topics. Add headings (each on its own line) to your notes.</p>`;
      return;
    }
    if (tool === "flow") {
      const el = $("#flowOut");
      if (!enough) return needMore(el);
      const flow = E.flowchart(text);
      lastFlowSVG = flow ? V.flowchartSVG(flow) : "";
      el.innerHTML = lastFlowSVG || `<p class="empty">No steps found. Flowcharts are made from numbered steps (1. 2. 3.) or sentences starting with “First / Then / Next / Finally”.</p>`;
      return;
    }
    if (tool === "cards") return enough ? V.flashcardsUI($("#cardsOut"), E.flashcards(text)) : needMore($("#cardsOut"));
    if (tool === "quiz") return enough ? V.quizUI($("#quizOut"), E.quiz(text)) : needMore($("#quizOut"));
  }

  function renderSummary(enough, text) {
    const el = $("#summaryOut");
    if (!enough) { lastSummary = null; return needMore(el); }
    const s = (lastSummary = E.summarize(text, length));
    if (!s) return needMore(el);
    const marks = (m) => `<span class="marks m${m}">${m}M</span>`;
    el.innerHTML = `
      <div class="sum-stats"><span>📄 ${s.stats.words} words → ${s.stats.summaryWords} words</span><span class="good">${s.stats.saved}% shorter</span></div>
      <h3 class="sum-title">${esc(s.title)}</h3>
      ${s.sections.map((sec) => `<div class="sum-sec">${sec.title && sec.title.toLowerCase() !== s.title.toLowerCase() && !sec.title.toLowerCase().endsWith(s.title.toLowerCase()) ? `<h4>${esc(sec.title)}</h4>` : ""}<ul>${sec.points.map((p) => (E.isFormula(p) ? `<li class="f-li">${F.formula(p)}</li>` : `<li>${esc(p)}</li>`)).join("")}</ul></div>`).join("")}
      ${s.definitions.length ? `<div class="box def"><h4>📌 Definitions</h4><dl>${s.definitions.map((d) => `<dt>${esc(d.term)}</dt><dd>${esc(d.definition)}.</dd>`).join("")}</dl></div>` : ""}
      ${s.formulas.length ? `<div class="box formula"><h4>🧮 Formulas</h4>${s.formulas.map((f) => `<code>${F.formula(f)}</code>`).join("")}</div>` : ""}
      ${s.keyTerms.length ? `<div class="box"><h4>🔑 Key terms</h4><div class="chips">${s.keyTerms.map((k) => `<span>${esc(k)}</span>`).join("")}</div></div>` : ""}
      ${s.examQuestions.length ? `<div class="box exam"><h4>🎯 Likely exam questions</h4><ol>${s.examQuestions.map((q) => `<li><button class="link-btn" data-q="${esc(q.q)}" data-m="${q.marks}">${esc(q.q)}</button> ${marks(q.marks)}</li>`).join("")}</ol><p class="muted small">Tap a question to get an answer from your notes.</p></div>` : ""}`;
    $$("[data-q]", el).forEach((b) => (b.onclick = () => {
      $("#question").value = b.dataset.q;
      $("#marks").value = b.dataset.m;
      openTool("ask");
      ask();
    }));
  }

  function ask() {
    const q = $("#question").value.trim();
    const el = $("#askOut");
    if (wordCount() < MIN_WORDS) return needMore(el);
    if (!q) { $("#question").focus(); return; }
    const marks = +$("#marks").value;
    const a = E.answer(notes.value, q, marks);
    if (!a || !a.found) {
      el.innerHTML = `<p class="empty">This isn't in your notes. Try different words (e.g. the exact term from your syllabus), or add the chapter that covers it.</p>`;
      return;
    }
    el.innerHTML = `
      <div class="answer">
        <div class="ans-head"><b>${esc(q)}</b><span class="marks m${marks}">${marks} marks</span></div>
        ${a.section ? `<p class="muted small">From your notes: <b>${esc(a.section)}</b></p>` : ""}
        <p class="ans-intro">${esc(a.intro)}</p>
        ${a.points.length ? `<ul>${a.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${marks >= 10 ? `<p class="tip">💡 For 10 marks: add a neat diagram, an example, and a one-line conclusion.</p>` : marks >= 5 ? `<p class="tip">💡 For 5 marks: underline key terms and add an example if you can.</p>` : ""}
        <div class="row"><button class="btn btn-ghost sm" id="ansCopy">Copy</button><button class="btn sm" id="ansHand">✍️ Make handwritten</button></div>
      </div>`;
    const text = `# ${q}\n${a.intro}\n${a.points.map((p) => `- ${p}`).join("\n")}`;
    $("#ansCopy").onclick = () => copy(text);
    $("#ansHand").onclick = () => sendToHandwriting(text);
  }
  $("#askForm").onsubmit = (e) => { e.preventDefault(); ask(); };

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast("Couldn't copy. Select the text and copy it manually."); }
  }
  $("#copySummary").onclick = () => (lastSummary ? copy(E.summaryToText(lastSummary)) : toast("Add notes first"));
  $("#toHandFull").onclick = () => (notes.value.trim() ? sendToHandwriting(notes.value.trim()) : toast("Add notes first"));
  $("#toHand").onclick = () => (lastSummary ? sendToHandwriting(E.summaryToText(lastSummary)) : toast("Add notes first"));
  $("#dlMap").onclick = () => (lastMapSVG ? V.downloadSVGasPNG(lastMapSVG, "mind-map.png") : toast("Nothing to download yet"));
  $("#dlFlow").onclick = () => (lastFlowSVG ? V.downloadSVGasPNG(lastFlowSVG, "flowchart.png") : toast("Nothing to download yet"));

  // ---------------- handwriting ----------------
  const hwText = $("#hwText");
  hwText.value = store.get("dvn_hw") || "";
  hwText.addEventListener("input", () => store.set("dvn_hw", hwText.value));
  $("#hwFont").innerHTML = Object.entries(H.FONTS).map(([k, v]) => `<option value="${esc(k)}" style="font-family:'${esc(k)}'">${esc(v.label)}</option>`).join("");
  const bindOut = (id, out, fmt) => { const i = $(id); const o = $(out); const set = () => (o.textContent = fmt(i.value)); i.addEventListener("input", set); set(); };
  bindOut("#hwSize", "#sizeVal", (v) => v);
  bindOut("#hwSpace", "#spaceVal", (v) => Number(v).toFixed(2));
  bindOut("#hwMess", "#messVal", (v) => `${Math.round(v * 100)}%`);

  let pages = [];
  async function makeHandwriting() {
    const text = hwText.value.trim();
    if (!text) { hwText.focus(); return toast("Type something or send your summary here first"); }
    const btn = $("#hwMake");
    btn.disabled = true;
    btn.textContent = "Writing…";
    try {
      pages = await H.render(text, {
        font: $("#hwFont").value, paper: $("#hwPaper").value, ink: $("#hwInk").value, headingInk: $("#hwHead").value,
        size: +$("#hwSize").value, spacing: +$("#hwSpace").value, messiness: +$("#hwMess").value,
        images: diagrams, diagramStyle: $("#hwDgStyle").value,
      });
      const prev = $("#hwPreview");
      prev.innerHTML = `<div class="pages-head"><b>${pages.length} page${pages.length > 1 ? "s" : ""}</b><span class="muted small">A4 · ready to print</span></div>`;
      pages.forEach((c, i) => {
        const wrap = document.createElement("div");
        wrap.className = "page";
        c.setAttribute("aria-label", `Handwritten page ${i + 1}`);
        wrap.appendChild(c);
        prev.appendChild(wrap);
      });
      $("#hwPdf").disabled = $("#hwPng").disabled = false;
      if (innerWidth < 900) prev.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast(err.message || "Something went wrong");
    } finally {
      btn.disabled = false;
      btn.textContent = "✍️ Make handwritten notes";
    }
  }
  $("#hwMake").onclick = makeHandwriting;
  $("#hwDgFile").onchange = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    for (const f of files) await addDiagramFrom(f, hwText);
  };
  ["#hwFont", "#hwPaper", "#hwInk", "#hwHead", "#hwSize", "#hwSpace", "#hwMess", "#hwDgStyle"].forEach((id) =>
    $(id).addEventListener("change", () => { if (pages.length) makeHandwriting(); }));

  $("#hwPdf").onclick = async () => {
    const b = $("#hwPdf");
    b.disabled = true;
    try { await H.downloadPDF(pages, "handwritten-notes.pdf"); } catch (err) { toast(err.message); } finally { b.disabled = false; }
  };
  $("#hwPng").onclick = () => { H.downloadPNGs(pages); toast(pages.length > 1 ? `Downloading ${pages.length} images…` : "Downloading image…"); };

  function sendToHandwriting(text) {
    hwText.value = text;
    store.set("dvn_hw", text);
    $("#handwrite").scrollIntoView({ behavior: "smooth" });
    makeHandwriting();
  }

  /** Used by the courses section. */
  window.NotesApp = {
    loadNotes(text, tool = "summary") {
      notes.value = text;
      notes.dispatchEvent(new Event("input"));
      openTool(tool);
      $("#study").scrollIntoView({ behavior: "smooth" });
    },
    handwrite: (text) => sendToHandwriting(text),
    toast,
  };

  refresh();
})();
