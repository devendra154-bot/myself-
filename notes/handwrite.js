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

  /** Turn text into styled lines: [{ kind: "h1"|"h2"|"p"|"li"|"blank", text }] */
  function parseBlocks(text) {
    return String(text || "").replace(/\r/g, "").split("\n").map((raw) => {
      const l = raw.trimEnd();
      if (!l.trim()) return { kind: "blank", text: "" };
      if (/^#\s+/.test(l)) return { kind: "h1", text: l.replace(/^#\s+/, "") };
      if (/^#{2,6}\s+/.test(l)) return { kind: "h2", text: l.replace(/^#{2,6}\s+/, "") };
      if (/^\s*([-*•]|\d{1,2}[.)])\s+/.test(l)) {
        const num = l.match(/^\s*(\d{1,2}[.)])/);
        return { kind: "li", marker: num ? num[1] : "•", text: l.replace(/^\s*([-*•]|\d{1,2}[.)])\s+/, "") };
      }
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

    /** Draw one word with a little natural wobble; returns its width. */
    const drawWord = (word, x, baseline, f, color) => {
      pageUsed = true;
      const scale = 1 + (rand() - 0.5) * 0.08 * m;
      ctx.save();
      ctx.font = f.css;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.86 + rand() * 0.14;
      ctx.translate(x, baseline + (rand() - 0.5) * 6 * m);
      ctx.rotate((rand() - 0.5) * 0.045 * m);
      ctx.scale(scale, scale);
      ctx.fillText(word, 0, 0);
      const w = ctx.measureText(word).width * scale;
      ctx.restore();
      return w;
    };

    const space = () => (size * 0.32) * (1 + (rand() - 0.5) * 0.5 * m);

    for (const block of parseBlocks(text)) {
      if (block.kind === "blank") { nextLine(); continue; }
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
      const lineStartX = layout.left + indent;
      const isHead = block.kind === "h1" || block.kind === "h2";
      let curStart = x, lastSpace = 0, lineWords = 0;
      for (const word of block.text.split(/\s+/).filter(Boolean)) {
        ctx.font = f.css;
        const w = ctx.measureText(word).width * 1.04;
        if (lineWords > 0 && x + w > layout.right) {
          if (isHead) underline(curStart, x - lastSpace, y, color);
          nextLine();
          x = lineStartX + (rand() - 0.5) * 6 * m;
          curStart = x;
          lineWords = 0;
        }
        const drawn = drawWord(word, x, y - 7, f, color);
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
