/* DevInventor Notes: text -> realistic handwritten pages (canvas), PNG and PDF export. */
(function (root) {
  "use strict";

  const PAGE = { w: 1240, h: 1754 }; // A4 at 150 dpi

  const FONTS = {
    "Caveat": { label: "Neat (Caveat)", scale: 1.15 },
    "Kalam": { label: "Student (Kalam)", scale: 0.95 },
    "Patrick Hand": { label: "Clear print (Patrick Hand)", scale: 1.0 },
    "Indie Flower": { label: "Round (Indie Flower)", scale: 0.95 },
    "Shadows Into Light": { label: "Quick (Shadows Into Light)", scale: 1.0 },
    "Gochi Hand": { label: "Bold (Gochi Hand)", scale: 1.0 },
    "Homemade Apple": { label: "Cursive (Homemade Apple)", scale: 0.78 },
  };
  const INKS = { blue: "#1d3d8f", black: "#1f1f24", "dark blue": "#0f2a66", green: "#1e6b3a" };
  const PAPERS = ["ruled", "plain", "grid", "assignment"];

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function drawPaper(ctx, paper, layout, pageNo) {
    const { w, h } = PAGE;
    ctx.fillStyle = paper === "plain" ? "#ffffff" : "#fffef8";
    ctx.fillRect(0, 0, w, h);
    if (paper === "ruled" || paper === "assignment") {
      ctx.strokeStyle = "#bcd2ec";
      ctx.lineWidth = 2;
      for (let y = layout.top; y < h - 40; y += layout.lineH) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = "#e7a3a3";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(layout.left - 26, 0); ctx.lineTo(layout.left - 26, h); ctx.stroke();
      if (paper === "assignment") {
        ctx.beginPath(); ctx.moveTo(layout.left - 34, 0); ctx.lineTo(layout.left - 34, h); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, layout.top - layout.lineH * 2); ctx.lineTo(w, layout.top - layout.lineH * 2); ctx.stroke();
        ctx.fillStyle = "#9aa3b2";
        ctx.font = "24px Arial, sans-serif";
        ctx.fillText(`Page No. ${pageNo}`, w - 230, layout.top - layout.lineH * 2 - 22);
        ctx.fillText("Date: ____________", layout.left, layout.top - layout.lineH * 2 - 22);
      }
    } else if (paper === "grid") {
      ctx.strokeStyle = "#dfe6ef";
      ctx.lineWidth = 1.5;
      const g = layout.lineH / 2;
      for (let x = 0; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = layout.top % g; y < h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
  }

  /**
   * A photo of a diagram → the same diagram drawn in pen: paper and shadows removed,
   * lines kept in the chosen ink, transparent elsewhere so the notebook lines show through.
   */
  function penSketch(src, inkHex) {
    const k = Math.min(1, 1600 / Math.max(src.width, src.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (root.NotesReaders && root.NotesReaders.cleanPhoto) root.NotesReaders.cleanPhoto(c); // grayscale, shadows removed, white paper
    const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
    const hex = String(inkHex).replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      const a = Math.max(0, Math.min(1, (1 - v - 0.22) / 0.38));
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(a * 235);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** Turn text into styled lines: [{ kind: "h1"|"h2"|"p"|"li"|"blank", text }] */
  function parseBlocks(text) {
    return String(text || "").replace(/\r/g, "").split("\n").map((raw) => {
      const l = raw.trimEnd();
      if (!l.trim()) return { kind: "blank", text: "" };
      const dg = l.trim().match(/^\[(?:diagram|figure|image)\s*(\d+)\]$/i);
      if (dg) return { kind: "img", n: +dg[1], text: "" };
      if (/^#\s+/.test(l)) return { kind: "h1", text: l.replace(/^#\s+/, "") };
      if (/^#{2,6}\s+/.test(l)) return { kind: "h2", text: l.replace(/^#{2,6}\s+/, "") };
      const isF = root.NotesEngine && root.NotesEngine.isFormula;
      if (/^=\s+/.test(l.trim())) return { kind: "formula", text: l.trim().replace(/^=\s+/, "") };
      if (/^\s*([-*•]|\d{1,2}[.)])\s+/.test(l)) {
        const num = l.match(/^\s*(\d{1,2}[.)])/);
        const t = l.replace(/^\s*([-*•]|\d{1,2}[.)])\s+/, "");
        if (isF && isF(t)) return { kind: "formula", text: t };
        return { kind: "li", marker: num ? num[1] : "•", text: t };
      }
      if (isF && isF(l)) return { kind: "formula", text: l.trim() };
      return { kind: "p", text: l.trim() };
    });
  }

  /**
   * Render text to handwritten pages.
   * @returns {Promise<HTMLCanvasElement[]>}
   */
  async function render(text, opts = {}) {
    const o = {
      font: "Caveat", ink: "blue", headingInk: "red", paper: "ruled", size: 36, spacing: 1, messiness: 0.5, seed: 42,
      ...opts,
    };
    const fontInfo = FONTS[o.font] || FONTS.Caveat;
    const size = Math.round(o.size * fontInfo.scale);
    if (document.fonts) {
      await Promise.all([document.fonts.load(`${size}px "${o.font}"`), document.fonts.load(`bold ${size}px "${o.font}"`)]).catch(() => {});
    }
    const lineH = Math.round(o.size * 1.65 * o.spacing);
    const layout = {
      lineH,
      top: o.paper === "assignment" ? 230 : 150,
      left: o.paper === "plain" ? 110 : 150,
      right: PAGE.w - 90,
      bottom: PAGE.h - 90,
    };
    const ink = INKS[o.ink] || o.ink;
    const headInk = o.headingInk === "red" ? "#b3261e" : ink;
    const rand = rng(o.seed);
    const m = Math.max(0, Math.min(1, o.messiness));

    const pages = [];
    let ctx, y, pageUsed = false;
    const newPage = () => {
      const c = document.createElement("canvas");
      c.width = PAGE.w; c.height = PAGE.h;
      ctx = c.getContext("2d");
      drawPaper(ctx, o.paper, layout, pages.length + 1);
      pages.push(c);
      y = layout.top;
      pageUsed = false;
    };
    newPage();
    const nextLine = () => { y += lineH; if (y > layout.bottom) newPage(); };

    const fontFor = (kind) => {
      const s = kind === "h1" ? size * 1.3 : kind === "h2" ? size * 1.12 : size;
      return { px: s, css: `${kind === "h1" || kind === "h2" ? "bold " : ""}${Math.round(s)}px "${o.font}", cursive` };
    };

    /** Split a word into normal / superscript / subscript pieces. chem = write H2O as H₂O. */
    const pieces = (word, chem) => {
      const out = [];
      const re = chem
        ? /\^\{([^}]+)\}|\^([A-Za-z0-9+\-−]+)|_\{([^}]+)\}|_([A-Za-z0-9]+)|(?<=[A-Za-z)\]])(\d+)/g
        : /\^\{([^}]+)\}|\^([A-Za-z0-9+\-−]+)|_\{([^}]+)\}|_([A-Za-z0-9]+(?:\([a-z]+\))?)/g;
      let last = 0, mm;
      while ((mm = re.exec(word))) {
        if (mm.index > last) out.push({ t: word.slice(last, mm.index) });
        if (mm[1] || mm[2]) out.push({ t: mm[1] || mm[2], sup: true });
        else out.push({ t: mm[3] || mm[4] || mm[5], sub: true });
        last = re.lastIndex;
      }
      if (last < word.length) out.push({ t: word.slice(last) });
      return out.length ? out : [{ t: word }];
    };
    const smallFont = (css) => css.replace(/(\d+)px/, (_, n) => Math.round(n * 0.68) + "px");
    const measureWord = (word, f, chem) => pieces(word, chem).reduce((w, p) => { ctx.font = p.sup || p.sub ? smallFont(f.css) : f.css; return w + ctx.measureText(p.t).width; }, 0);

    /** Draw one word with a little natural wobble; returns its width. */
    const drawWord = (word, x, baseline, f, color, chem = false) => {
      pageUsed = true;
      const scale = 1 + (rand() - 0.5) * 0.08 * m;
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.86 + rand() * 0.14;
      ctx.translate(x, baseline + (rand() - 0.5) * 6 * m);
      ctx.rotate((rand() - 0.5) * 0.045 * m);
      ctx.scale(scale, scale);
      let w = 0;
      for (const p of pieces(word, chem)) {
        ctx.font = p.sup || p.sub ? smallFont(f.css) : f.css;
        ctx.fillText(p.t, w, p.sup ? -f.px * 0.38 : p.sub ? f.px * 0.22 : 0);
        w += ctx.measureText(p.t).width;
      }
      ctx.restore();
      return w * scale;
    };

    /** Yellow highlighter stroke behind a formula line. */
    const highlight = (x1, x2, baseY) => {
      ctx.save();
      ctx.fillStyle = "rgba(255, 224, 80, 0.38)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x1 - 10, baseY - size * 1.02, x2 - x1 + 20, size * 1.25, 8);
      else ctx.rect(x1 - 10, baseY - size * 1.02, x2 - x1 + 20, size * 1.25);
      ctx.fill();
      ctx.restore();
    };

    const space = () => (size * 0.32) * (1 + (rand() - 0.5) * 0.5 * m);

    const images = o.images || [];
    const drawDiagram = (src) => {
      const art = o.diagramStyle === "photo" ? src : penSketch(src, ink);
      const maxW = layout.right - layout.left - 20, maxH = (layout.bottom - layout.top) * 0.55;
      const k = Math.min(maxW / art.width, maxH / art.height);
      const w = art.width * k, h = art.height * k;
      const lines = Math.ceil((h + lineH * 0.5) / lineH);
      if (pageUsed && y - lineH + lines * lineH > layout.bottom) newPage();
      const top = y - lineH * 0.8, x = layout.left + (maxW - w) / 2;
      ctx.save();
      ctx.translate(x + w / 2, top + h / 2);
      ctx.rotate((rand() - 0.5) * 0.02 * m);
      if (o.diagramStyle === "photo") {
        ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
        ctx.fillStyle = "#fff"; ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16);
        ctx.shadowColor = "transparent";
      }
      ctx.drawImage(art, -w / 2, -h / 2, w, h);
      ctx.restore();
      pageUsed = true;
      y += (lines - 1) * lineH;
      nextLine();
    };

    for (const block of parseBlocks(text)) {
      if (block.kind === "blank") { nextLine(); continue; }
      if (block.kind === "img") { if (images[block.n - 1]) drawDiagram(images[block.n - 1]); continue; }
      const f = fontFor(block.kind);
      const color = block.kind === "h1" || block.kind === "h2" ? headInk : ink;
      ctx.font = f.css;
      let indent = 0;
      let x = layout.left + (rand() - 0.5) * 8 * m;
      if (block.kind === "h1" && y > layout.top) nextLine(); // breathing room before big headings
      if (block.kind === "li") {
        const markerW = drawWord(block.marker === "•" ? "•" : block.marker, x + 4, y - 7, f, ink);
        indent = Math.max(markerW + size * 0.45, size * 0.9);
        x += indent;
      }
      const isFormula = block.kind === "formula";
      const chem = isFormula && /→|⟶|⇌|->/.test(block.text) && !/=/.test(block.text);
      if (isFormula) { indent = size * 1.2; x += indent; }
      const lineStartX = layout.left + indent;
      const isHead = block.kind === "h1" || block.kind === "h2";
      let curStart = x, lastSpace = 0, lineWords = 0;
      const words = block.text.split(/\s+/).filter(Boolean);
      const highlightLine = (from) => {
        if (!isFormula) return;
        let lw = 0;
        for (let k = from; k < words.length; k++) { const ww = measureWord(words[k], f, chem) * 1.04 + size * 0.32; if (x + lw + ww > layout.right && k > from) break; lw += ww; }
        highlight(x, x + lw - size * 0.32, y - 7);
      };
      highlightLine(0);
      for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        const w = measureWord(word, f, chem) * 1.04;
        if (lineWords > 0 && x + w > layout.right) {
          if (isHead) underline(curStart, x - lastSpace, y, color);
          nextLine();
          x = lineStartX + (rand() - 0.5) * 6 * m;
          curStart = x;
          lineWords = 0;
          highlightLine(wi);
        }
        const drawn = drawWord(word, x, y - 7, f, color, chem);
        lastSpace = space();
        x += drawn + lastSpace;
        lineWords++;
      }
      if (isHead && lineWords) underline(curStart, x - lastSpace, y, color);
      nextLine();
    }

    if (!pageUsed && pages.length > 1) pages.pop();

    function underline(x1, x2, baseY, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      const yy = baseY - lineH * 0.08;
      ctx.beginPath();
      ctx.moveTo(x1, yy + (rand() - 0.5) * 3 * m);
      ctx.quadraticCurveTo((x1 + x2) / 2, yy + (rand() - 0.5) * 6 * m, x2, yy + (rand() - 0.5) * 3 * m);
      ctx.stroke();
      ctx.restore();
    }

    return pages;
  }

  // ---------- export ----------
  function downloadURL(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPNGs(pages, base = "handwritten-notes") {
    pages.forEach((c, i) => setTimeout(() => downloadURL(c.toDataURL("image/png"), `${base}-page-${i + 1}.png`), i * 350));
  }

  const loaded = {};
  function loadScript(src) {
    return (loaded[src] ||= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { delete loaded[src]; reject(new Error("Could not load " + src + ". Check your internet connection.")); };
      document.head.appendChild(s);
    }));
  }

  async function downloadPDF(pages, name = "handwritten-notes.pdf") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pages.forEach((c, i) => {
      if (i) pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297);
    });
    pdf.save(name);
  }

  const api = { render, downloadPNGs, downloadPDF, loadScript, FONTS, INKS, PAPERS, parseBlocks };
  root.NotesHandwrite = api;
})(window);
