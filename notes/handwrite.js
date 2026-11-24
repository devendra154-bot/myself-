/* DevInventor Notes: text -> realistic handwritten A4 pages (canvas), PNG and PDF export.
 * Supports: # heading, ## sub-heading, - bullets, 1. steps, = formula lines,
 * | tables |, Q: question lines and [[diagram:id]] (verified circuit diagrams).
 * The complete text is always written: nothing is shortened.
 */
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
      for (let y = layout.top; y < h - 40; y += layout.lineH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
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

  /** Parse text into blocks. Tables are grouped; diagrams are separate blocks. */
  function parseBlocks(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trimEnd();
      const t = l.trim();
      if (!t) { out.push({ kind: "blank" }); continue; }
      const dg = t.match(/^\[\[diagram:([a-z0-9_]+)\]\]$/i);
      if (dg) { out.push({ kind: "diagram", id: dg[1] }); continue; }
      if (/^\|.*\|$/.test(t)) {
        const rows = [];
        while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
          const cells = lines[i].trim().slice(1, -1).split("|").map((c) => c.trim());
          if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
          i++;
        }
        i--;
        out.push({ kind: "table", rows });
        continue;
      }
      if (/^#\s+/.test(t)) { out.push({ kind: "h1", text: t.replace(/^#\s+/, "") }); continue; }
      if (/^#{2,6}\s+/.test(t)) { out.push({ kind: "h2", text: t.replace(/^#{2,6}\s+/, "") }); continue; }
      if (/^=\s+/.test(t)) { out.push({ kind: "formula", text: t.replace(/^=\s+/, "") }); continue; }
      if (/^Q[:.]\s*/i.test(t)) { out.push({ kind: "q", text: t }); continue; }
      if (/^([-*•]|\d{1,2}[.)])\s+/.test(t)) {
        const num = t.match(/^(\d{1,2}[.)])/);
        out.push({ kind: "li", marker: num ? num[1] : "•", text: t.replace(/^([-*•]|\d{1,2}[.)])\s+/, "") });
        continue;
      }
      out.push({ kind: "p", text: t });
    }
    return out;
  }

  function loadSVG(svg) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("diagram failed")); };
      img.src = url;
    });
  }

  /**
   * Render text to handwritten pages.
   * @returns {Promise<HTMLCanvasElement[]>}
   */
  async function render(text, opts = {}) {
    const o = { font: "Caveat", ink: "blue", headingInk: "red", paper: "ruled", size: 36, spacing: 1, messiness: 0.5, seed: 42, ...opts };
    const fontInfo = FONTS[o.font] || FONTS.Caveat;
    const size = Math.round(o.size * fontInfo.scale);
    if (document.fonts) {
      await Promise.all([document.fonts.load(`${size}px "${o.font}"`), document.fonts.load(`bold ${size}px "${o.font}"`)]).catch(() => {});
    }
    const lineH = Math.round(o.size * 1.65 * o.spacing);
    const layout = { lineH, top: o.paper === "assignment" ? 230 : 150, left: o.paper === "plain" ? 110 : 150, right: PAGE.w - 90, bottom: PAGE.h - 90 };
    const ink = INKS[o.ink] || o.ink;
    const headInk = o.headingInk === "red" ? "#b3261e" : ink;
    const rand = rng(o.seed);
    const m = Math.max(0, Math.min(1, o.messiness));
    const blocks = parseBlocks(text);

    // Pre-load diagrams drawn in the pen colour.
    const diagrams = {};
    if (root.NotesCircuits) {
      for (const b of blocks) {
        if (b.kind !== "diagram" || diagrams[b.id]) continue;
        const svg = root.NotesCircuits.render(b.id, { ink, accent: ink, current: ink, background: "none", font: `'${o.font}', 'Comic Sans MS', cursive` });
        if (svg) diagrams[b.id] = await loadSVG(svg).catch(() => null);
      }
    }

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
    const ensureSpace = (needed) => { if (y + needed > layout.bottom + lineH) newPage(); };

    const fontFor = (kind) => {
      const s = kind === "h1" ? size * 1.3 : kind === "h2" ? size * 1.12 : size;
      const bold = kind === "h1" || kind === "h2" || kind === "q";
      return { px: s, css: `${bold ? "bold " : ""}${Math.round(s)}px "${o.font}", cursive` };
    };

    /** Split "V_TH" / "I_{Z(min)}" into normal and subscript pieces. */
    const pieces = (word) => {
      const out = [];
      const re = /_\{([^}]+)\}|_([A-Za-z0-9]+(?:\([a-z]+\))?)/g;
      let last = 0, mm;
      while ((mm = re.exec(word))) {
        if (mm.index > last) out.push({ t: word.slice(last, mm.index) });
        out.push({ t: mm[1] || mm[2], sub: true });
        last = re.lastIndex;
      }
      if (last < word.length) out.push({ t: word.slice(last) });
      return out.length ? out : [{ t: word }];
    };
    const subFont = (css) => css.replace(/(\d+)px/, (_, n) => Math.round(n * 0.68) + "px");
    const measureWord = (word, f) => pieces(word).reduce((w, p) => { ctx.font = p.sub ? subFont(f.css) : f.css; return w + ctx.measureText(p.t).width; }, 0);

    const drawWord = (word, x, baseline, f, color) => {
      pageUsed = true;
      const scale = 1 + (rand() - 0.5) * 0.08 * m;
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.86 + rand() * 0.14;
      ctx.translate(x, baseline + (rand() - 0.5) * 6 * m);
      ctx.rotate((rand() - 0.5) * 0.045 * m);
      ctx.scale(scale, scale);
      let w = 0;
      for (const p of pieces(word)) {
        ctx.font = p.sub ? subFont(f.css) : f.css;
        ctx.fillText(p.t, w, p.sub ? f.px * 0.22 : 0);
        w += ctx.measureText(p.t).width;
      }
      ctx.restore();
      return w * scale;
    };
    const space = () => size * 0.32 * (1 + (rand() - 0.5) * 0.5 * m);

    function underline(x1, x2, baseY, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.globalAlpha = 0.75; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      const yy = baseY - lineH * 0.08;
      ctx.beginPath();
      ctx.moveTo(x1, yy + (rand() - 0.5) * 3 * m);
      ctx.quadraticCurveTo((x1 + x2) / 2, yy + (rand() - 0.5) * 6 * m, x2, yy + (rand() - 0.5) * 3 * m);
      ctx.stroke();
      ctx.restore();
    }

    function highlight(x1, x2, baseY) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 226, 92, 0.38)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x1 - 8, baseY - size * 0.95, x2 - x1 + 16, size * 1.15, 6) : ctx.rect(x1 - 8, baseY - size * 0.95, x2 - x1 + 16, size * 1.15);
      ctx.fill();
      ctx.restore();
    }

    /** Write wrapped words starting at x; returns nothing. Handles headings/formulas decoration. */
    function writeWords(words, startX, lineStartX, f, color, deco) {
      let x = startX, curStart = x, lastSpace = 0, lineWords = 0;
      const lineMarks = [];
      for (const word of words) {
        ctx.font = f.css;
        const w = measureWord(word, f) * 1.04;
        if (lineWords > 0 && x + w > layout.right) {
          if (deco === "underline") underline(curStart, x - lastSpace, y, color);
          nextLine();
          x = lineStartX + (rand() - 0.5) * 6 * m;
          curStart = x;
          lineWords = 0;
        }
        if (deco === "highlight" && lineWords === 0) {
          // measure this visual line first, then highlight behind it
          let lw = 0, n = 0;
          ctx.font = f.css;
          const rest = words.slice(words.indexOf(word));
          for (const ww of rest) { const ww2 = measureWord(ww, f) * 1.04 + size * 0.32; if (x + lw + ww2 > layout.right && n) break; lw += ww2; n++; }
          highlight(x, x + lw - size * 0.32, y - 7);
        }
        const drawn = drawWord(word, x, y - 7, f, color);
        lastSpace = space();
        x += drawn + lastSpace;
        lineWords++;
      }
      if (deco === "underline" && lineWords) underline(curStart, x - lastSpace, y, color);
      void lineMarks;
    }

    for (const block of blocks) {
      if (block.kind === "blank") { nextLine(); continue; }

      if (block.kind === "diagram") {
        const img = diagrams[block.id];
        if (!img) continue;
        const maxW = layout.right - layout.left;
        const scale = Math.min(maxW / img.width, 1.35);
        const w = img.width * scale, h = img.height * scale;
        const linesNeeded = Math.ceil((h + 20) / lineH);
        ensureSpace(linesNeeded * lineH);
        const top = y - lineH + 12;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, layout.left + (maxW - w) / 2, top, w, h);
        ctx.restore();
        pageUsed = true;
        for (let i = 0; i < linesNeeded; i++) nextLine();
        continue;
      }

      if (block.kind === "table") {
        const f = fontFor("p");
        const tf = { px: f.px * 0.85, css: `${Math.round(f.px * 0.85)}px "${o.font}", cursive` };
        const hf = { px: tf.px, css: `bold ${Math.round(tf.px)}px "${o.font}", cursive` };
        const cols = Math.max(...block.rows.map((r) => r.length));
        const colW = (layout.right - layout.left) / cols;
        ctx.font = tf.css;
        const wrapCell = (txt, font) => {
          ctx.font = font.css;
          const out = []; let line = "";
          for (const w of String(txt).split(/\s+/)) { const t = line ? line + " " + w : w; if (line && ctx.measureText(t).width > colW - 20) { out.push(line); line = w; } else line = t; }
          if (line) out.push(line);
          return out.length ? out : [""];
        };
        block.rows.forEach((row, ri) => {
          const font = ri === 0 ? hf : tf;
          const cells = Array.from({ length: cols }, (_, ci) => wrapCell(row[ci] || "", font));
          const rowLines = Math.max(...cells.map((c) => c.length));
          ensureSpace(rowLines * lineH);
          const rowTop = y - lineH + 4;
          for (let li = 0; li < rowLines; li++) {
            cells.forEach((c, ci) => { if (c[li]) drawWord(c[li], layout.left + ci * colW + 10, y - 7, font, ri === 0 ? headInk : ink); });
            if (li < rowLines - 1) nextLine();
          }
          const rowBottom = y + 4;
          ctx.save();
          ctx.strokeStyle = ink; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
          ctx.strokeRect(layout.left, rowTop, colW * cols, rowBottom - rowTop);
          for (let ci = 1; ci < cols; ci++) { ctx.beginPath(); ctx.moveTo(layout.left + ci * colW, rowTop); ctx.lineTo(layout.left + ci * colW, rowBottom); ctx.stroke(); }
          ctx.restore();
          nextLine();
        });
        continue;
      }

      const f = fontFor(block.kind);
      const isHead = block.kind === "h1" || block.kind === "h2";
      const color = isHead ? headInk : ink;
      if (block.kind === "h1" && y > layout.top) nextLine();
      let indent = 0;
      let x = layout.left + (rand() - 0.5) * 8 * m;
      if (block.kind === "li") {
        const markerW = drawWord(block.marker === "•" ? "•" : block.marker, x + 4, y - 7, f, ink);
        indent = Math.max(markerW + size * 0.45, size * 0.9);
        x += indent;
      }
      if (block.kind === "formula") { indent = size * 1.2; x += indent; }
      writeWords(block.text.split(/\s+/).filter(Boolean), x, layout.left + indent, f, color, isHead ? "underline" : block.kind === "formula" ? "highlight" : null);
      nextLine();
    }

    if (!pageUsed && pages.length > 1) pages.pop();
    return pages;
  }

  // ---------- export ----------
  function downloadURL(url, name) {
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
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
      s.onerror = () => { delete loaded[src]; reject(new Error("Could not load a required tool. Check your internet connection and try again.")); };
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

  root.NotesHandwrite = { render, downloadPNGs, downloadPDF, downloadURL, loadScript, FONTS, INKS, PAPERS, parseBlocks };
})(window);
