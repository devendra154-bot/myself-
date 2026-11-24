/* DevInventor Notes: page logic (inputs, tools, handwriting). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = window.NotesEngine, V = window.NotesVisual, H = window.NotesHandwrite;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 2600);
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

  async function readPDF(file) {
    await H.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      progress(p / doc.numPages, `Reading page ${p} of ${doc.numPages}…`);
      const content = await (await doc.getPage(p)).getTextContent();
      // Rebuild lines from text positions so headings and points stay on their own lines.
      let lastY = null, line = "", lines = [];
      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ""; }
        line += item.str + (item.hasEOL ? "\n" : "");
        lastY = y;
      }
      lines.push(line.trim());
      pages.push(lines.join("\n"));
    }
    if (!pages.join("").trim()) throw new Error("This PDF has no text layer (it is scanned). Take screenshots and upload them as photos instead.");
    return pages.join("\n\n");
  }

  async function readDOCX(file) {
    await H.loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const res = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }

  async function readImage(file) {
    progress(0.02, "Loading the photo reader (first time only, ~10 MB)…");
    await H.loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
    const { data } = await window.Tesseract.recognize(file, "eng", {
      logger: (m) => { if (m.status === "recognizing text") progress(m.progress, `Reading text from photo… ${Math.round(m.progress * 100)}%`); },
    });
    return data.text;
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return toast("File is too big (max 25 MB).");
    const name = file.name.toLowerCase();
    try {
      progress(0.05, `Opening ${file.name}…`);
      let text;
      if (name.endsWith(".pdf") || file.type === "application/pdf") text = await readPDF(file);
      else if (name.endsWith(".docx")) text = await readDOCX(file);
      else if (file.type.startsWith("image/")) text = await readImage(file);
      else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) text = await file.text();
      else if (name.endsWith(".doc")) throw new Error("Old .doc files aren't supported. Save it as .docx or PDF and try again.");
      else throw new Error("Unsupported file. Use PDF, DOCX, TXT or a photo.");
      text = E.clean(text);
      if (!text) throw new Error("No text found in this file.");
      notes.value = notes.value.trim() ? notes.value.trim() + "\n\n" + text : text;
      notes.dispatchEvent(new Event("input"));
      refresh();
      toast(file.type.startsWith("image/") ? "Text read from photo. Please check it for mistakes." : `Added text from ${file.name}`);
    } catch (err) {
      toast(err.message || "Could not read this file.");
    } finally {
      progress(null);
      $("#file").value = "";
    }
  }

  $("#file").onchange = (e) => handleFile(e.target.files[0]);
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

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
      ${s.sections.map((sec) => `<div class="sum-sec">${sec.title && sec.title.toLowerCase() !== s.title.toLowerCase() && !sec.title.toLowerCase().endsWith(s.title.toLowerCase()) ? `<h4>${esc(sec.title)}</h4>` : ""}<ul>${sec.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("")}
      ${s.definitions.length ? `<div class="box def"><h4>📌 Definitions</h4><dl>${s.definitions.map((d) => `<dt>${esc(d.term)}</dt><dd>${esc(d.definition)}.</dd>`).join("")}</dl></div>` : ""}
      ${s.formulas.length ? `<div class="box formula"><h4>🧮 Formulas</h4>${s.formulas.map((f) => `<code>${esc(f)}</code>`).join("")}</div>` : ""}
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
  ["#hwFont", "#hwPaper", "#hwInk", "#hwHead", "#hwSize", "#hwSpace", "#hwMess"].forEach((id) =>
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

  refresh();
})();
