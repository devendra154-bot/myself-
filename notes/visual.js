/* DevInventor Notes: visual learning (mind map, flowchart, flashcards, quiz). */
(function (root) {
  "use strict";

  const COLORS = ["#7a50dc", "#e0567a", "#1f9d6b", "#e08a1e", "#2f7fd8", "#c04fc0", "#14958f", "#8a6d1f"];
  const FONT = "Inter, Arial, sans-serif";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const measureCtx = document.createElement("canvas").getContext("2d");
  const textW = (t, px, weight = 500) => { measureCtx.font = `${weight} ${px}px ${FONT}`; return measureCtx.measureText(t).width; };

  function wrap(text, px, maxW, weight) {
    const out = [];
    let line = "";
    for (const w of String(text).split(/\s+/)) {
      const t = line ? line + " " + w : w;
      if (line && textW(t, px, weight) > maxW) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function textBlock(lines, cx, cy, px, color, weight = 500) {
    const lh = px * 1.3;
    const y0 = cy - ((lines.length - 1) * lh) / 2;
    return lines.map((l, i) => `<text x="${cx}" y="${y0 + i * lh}" font-family="${FONT}" font-size="${px}" font-weight="${weight}" fill="${color}" text-anchor="middle" dominant-baseline="middle">${esc(l)}</text>`).join("");
  }

  // ---------- mind map: root in the middle, branches left and right ----------
  function mindmapSVG(map, { oneSide = false } = {}) {
    const childH = 46, gapBranch = 24, branchW = 180, childMaxW = 200, colGap = 44;
    const sides = [[], []];
    map.branches.forEach((b, i) => sides[oneSide ? 0 : i % 2].push({ ...b, color: COLORS[i % COLORS.length] }));
    const blockH = (b) => Math.max(1, b.children.length) * childH;
    const sideH = (arr) => arr.reduce((a, b) => a + blockH(b) + gapBranch, -gapBranch);
    const H = Math.max(360, sideH(sides[0]), sideH(sides[1])) + 80;
    const rootLines = wrap(map.root, 22, 200, 700);
    const half = childMaxW + colGap + branchW + colGap + 120;
    const W = oneSide ? half + 140 : 2 * half;
    const cx = oneSide ? 125 : W / 2, cy = H / 2;
    let out = "";

    sides.forEach((arr, side) => {
      const dir = side === 0 ? 1 : -1;
      const bx = cx + dir * (120 + colGap + branchW / 2);
      const kx = cx + dir * (120 + colGap + branchW + colGap);
      let y = cy - sideH(arr) / 2;
      for (const b of arr) {
        const h = blockH(b);
        const by = y + h / 2;
        out += `<path d="M${cx + dir * 110},${cy} C${cx + dir * 150},${cy} ${bx - dir * (branchW / 2 + 40)},${by} ${bx - dir * branchW / 2},${by}" stroke="${b.color}" stroke-width="3" fill="none" opacity=".7"/>`;
        const bl = wrap(b.label, 15, branchW - 24, 700).slice(0, 2);
        out += `<rect x="${bx - branchW / 2}" y="${by - 24}" width="${branchW}" height="48" rx="14" fill="${b.color}"/>` + textBlock(bl, bx, by, 15, "#fff", 700);
        b.children.forEach((c, i) => {
          const ky = y + childH * i + childH / 2;
          const lines = wrap(c, 13, childMaxW - 16, 500).slice(0, 2);
          const tw = Math.min(childMaxW, Math.max(...lines.map((l) => textW(l, 13))) + 20);
          const rx = dir === 1 ? kx : kx - tw;
          out += `<path d="M${bx + dir * branchW / 2},${by} C${bx + dir * (branchW / 2 + 30)},${by} ${(dir === 1 ? rx : rx + tw) - dir * 30},${ky} ${dir === 1 ? rx : rx + tw},${ky}" stroke="${b.color}" stroke-width="1.6" fill="none" opacity=".55"/>`;
          out += `<rect x="${rx}" y="${ky - 19}" width="${tw}" height="38" rx="10" fill="#fff" stroke="${b.color}" stroke-opacity=".45"/>` + textBlock(lines, rx + tw / 2, ky, 13, "#22222a");
        });
        y += h + gapBranch;
      }
    });
    out += `<ellipse cx="${cx}" cy="${cy}" rx="112" ry="${Math.max(44, rootLines.length * 16 + 20)}" fill="#1b1031"/>` + textBlock(rootLines, cx, cy, 22, "#fff", 700);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fcfcfd"/>${out}</svg>`;
  }

  // ---------- flowchart: start -> steps -> end ----------
  function flowchartSVG(flow) {
    const W = 640, boxW = 460, px = 16, gap = 40;
    let y = 30, out = "";
    const node = (lines, kind, color) => {
      const h = Math.max(52, lines.length * px * 1.35 + 26);
      const x = (W - boxW) / 2;
      if (kind === "oval") out += `<rect x="${W / 2 - 110}" y="${y}" width="220" height="${h}" rx="${h / 2}" fill="${color}"/>` + textBlock(lines, W / 2, y + h / 2, px, "#fff", 700);
      else out += `<rect x="${x}" y="${y}" width="${boxW}" height="${h}" rx="12" fill="#fff" stroke="${color}" stroke-width="2.5"/>` + textBlock(lines, W / 2, y + h / 2, px, "#22222a");
      y += h;
    };
    const arrow = () => {
      out += `<line x1="${W / 2}" y1="${y + 4}" x2="${W / 2}" y2="${y + gap - 10}" stroke="#7a50dc" stroke-width="2.5"/><path d="M${W / 2 - 7},${y + gap - 14} L${W / 2},${y + gap - 2} L${W / 2 + 7},${y + gap - 14} Z" fill="#7a50dc"/>`;
      y += gap;
    };
    node(wrap(flow.title || "Start", px, 200, 700), "oval", "#1b1031");
    flow.steps.forEach((s, i) => {
      arrow();
      node(wrap(`${i + 1}. ${s}`, px, boxW - 40), "box", COLORS[i % COLORS.length]);
    });
    arrow();
    node(["End"], "oval", "#1f9d6b");
    const H = y + 30;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fcfcfd"/>${out}</svg>`;
  }

  /** Download an SVG string as a PNG (2x for sharpness). */
  function downloadSVGasPNG(svg, name) {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width * 2; c.height = img.height * 2;
      const ctx = c.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    };
    img.src = url;
  }

  // ---------- flashcards ----------
  function flashcardsUI(el, cards, opts = {}) {
    let i = 0, known = new Set();
    const draw = () => {
      if (!cards.length) { el.innerHTML = `<p class="empty">No flashcards found. Notes with definitions (“X is …”, “X: …”) work best.</p>`; return; }
      const c = cards[i];
      el.innerHTML = `
        <div class="fc-top"><span>Card ${i + 1} of ${cards.length}</span><span>${known.size} known</span></div>
        <button class="flashcard" aria-label="Flip card"><div class="fc-inner">
          <div class="fc-face fc-front"><small>Term</small><b>${esc(c.front)}</b><em>Tap to flip</em></div>
          <div class="fc-face fc-back"><small>Meaning</small><p>${esc(c.back)}</p></div>
        </div></button>
        <div class="fc-actions">
          <button class="btn btn-ghost" data-a="prev">← Prev</button>
          <button class="btn btn-ghost" data-a="again">Still learning</button>
          <button class="btn" data-a="know">I know it ✓</button>
          <button class="btn btn-ghost" data-a="next">Next →</button>
        </div>`;
      el.querySelector(".flashcard").onclick = (e) => e.currentTarget.classList.toggle("flipped");
      el.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
        const a = b.dataset.a;
        if (a === "know") known.add(i);
        if (a === "again") known.delete(i);
        if (a === "know" || a === "again") opts.onChange?.(known.size, cards.length);
        i = a === "prev" ? (i - 1 + cards.length) % cards.length : (i + 1) % cards.length;
        draw();
      }));
    };
    draw();
  }

  // ---------- quiz ----------
  function quizUI(el, questions) {
    if (!questions.length) { el.innerHTML = `<p class="empty">Not enough content for a quiz. Add more notes (at least a few definitions or key points).</p>`; return; }
    let i = 0, score = 0, answered = false;
    const draw = () => {
      if (i >= questions.length) {
        const pct = Math.round((score / questions.length) * 100);
        el.innerHTML = `<div class="quiz-done"><b>${score} / ${questions.length}</b><p>${pct >= 80 ? "Excellent! You're exam ready. 🎉" : pct >= 50 ? "Good. Revise the ones you missed and try again." : "Keep going: read the summary once more, then retry."}</p><button class="btn" data-a="retry">Try again</button></div>`;
        el.querySelector("[data-a=retry]").onclick = () => { i = 0; score = 0; draw(); };
        return;
      }
      const q = questions[i];
      answered = false;
      el.innerHTML = `
        <div class="fc-top"><span>Question ${i + 1} of ${questions.length}</span><span>Score ${score}</span></div>
        <div class="quiz-q">${esc(q.question).replace(/\n/g, "<br>")}</div>
        <div class="quiz-opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><span>${"ABCD"[k]}</span>${esc(o)}</button>`).join("")}</div>
        <div class="quiz-foot"><button class="btn" data-a="next" disabled>Next →</button></div>`;
      el.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        if (answered) return;
        answered = true;
        const k = +b.dataset.k;
        if (k === q.answer) score++;
        el.querySelectorAll(".opt").forEach((x) => {
          const kk = +x.dataset.k;
          x.classList.add(kk === q.answer ? "right" : kk === k ? "wrong" : "dim");
        });
        el.querySelector("[data-a=next]").disabled = false;
      }));
      el.querySelector("[data-a=next]").onclick = () => { i++; draw(); };
    };
    draw();
  }

  root.NotesVisual = { mindmapSVG, flowchartSVG, downloadSVGasPNG, flashcardsUI, quizUI };
})(window);
