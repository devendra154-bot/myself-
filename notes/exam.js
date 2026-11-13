/* DevInventor Notes: quiz + exam mode (timer, marks, review, report, practice again). */
(function (root) {
  "use strict";
  const esc0 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const esc = (s) => (root.NotesLibrary ? root.NotesLibrary.sub(esc0(s)) : esc0(s));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  /**
   * @param {HTMLElement} el
   * @param {Array<{question:string, options:string[], answer:number, explain?:string, topic?:string}>} bank
   * @param {{title?:string, onFinish?:(pct:number)=>void}} opts
   */
  function mount(el, bank, opts = {}) {
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };

    if (!bank.length) {
      el.innerHTML = `<div class="empty-state"><b>Not enough content for a quiz</b><p>Add more notes (a few definitions or key points), or pick topics from the verified library.</p></div>`;
      return stop;
    }

    // ---------- setup ----------
    const setup = () => {
      stop();
      el.innerHTML = `
        <div class="exam-setup">
          <div class="exam-hero"><b>${esc(opts.title || "Quiz")}</b><span>${bank.length} questions available</span></div>
          <div class="form-grid">
            <label>Mode
              <div class="seg" data-k="mode"><button data-v="practice" class="on">Practice</button><button data-v="exam">Exam</button></div>
              <small>Practice shows the answer after each question. Exam shows results at the end.</small>
            </label>
            <label>Questions
              <select data-k="count">${[5, 10, 15, 20, 30].filter((n) => n <= Math.max(5, bank.length)).map((n) => `<option ${n === Math.min(10, bank.length) ? "selected" : ""}>${Math.min(n, bank.length)}</option>`).join("")}</select>
            </label>
            <label>Timer
              <select data-k="time"><option value="0">No timer</option><option value="5">5 min</option><option value="10" selected>10 min</option><option value="15">15 min</option><option value="30">30 min</option></select>
            </label>
            <label>Marking
              <select data-k="neg"><option value="0">+1 correct, 0 wrong</option><option value="0.25">+1 correct, −0.25 wrong</option></select>
            </label>
          </div>
          <button class="btn btn-brand big" data-a="start">Start ▸</button>
        </div>`;
      const cfg = { mode: "practice" };
      el.querySelectorAll(".seg[data-k=mode] button").forEach((b) => (b.onclick = () => {
        cfg.mode = b.dataset.v;
        el.querySelectorAll(".seg[data-k=mode] button").forEach((x) => x.classList.toggle("on", x === b));
      }));
      el.querySelector("[data-a=start]").onclick = () => {
        cfg.count = +el.querySelector("[data-k=count]").value;
        cfg.time = +el.querySelector("[data-k=time]").value;
        cfg.neg = +el.querySelector("[data-k=neg]").value;
        const qs = [...bank].sort(() => Math.random() - 0.5).slice(0, cfg.count);
        run(qs, cfg);
      };
    };

    // ---------- run ----------
    const run = (qs, cfg) => {
      stop();
      const answers = new Array(qs.length).fill(null);
      let i = 0;
      const started = Date.now();
      let left = cfg.time * 60;

      const finish = () => {
        stop();
        report(qs, answers, cfg, Math.round((Date.now() - started) / 1000));
      };

      if (cfg.time) {
        timer = setInterval(() => {
          left--;
          const t = el.querySelector(".exam-timer");
          if (t) { t.textContent = "⏱ " + fmt(left); t.classList.toggle("low", left <= 60); }
          if (left <= 0) finish();
        }, 1000);
      }

      const draw = () => {
        const q = qs[i];
        const chosen = answers[i];
        const reveal = cfg.mode === "practice" && chosen !== null;
        el.innerHTML = `
          <div class="exam-top">
            <span class="muted">Question ${i + 1} / ${qs.length}${q.topic ? ` · ${esc(q.topic)}` : ""}</span>
            ${cfg.time ? `<span class="exam-timer">⏱ ${fmt(left)}</span>` : ""}
          </div>
          <div class="exam-bar"><i style="width:${((i + 1) / qs.length) * 100}%"></i></div>
          <div class="quiz-q">${esc(q.question).replace(/\n/g, "<br>")}</div>
          <div class="quiz-opts">${q.options.map((o, k) => {
            let cls = "";
            if (reveal) cls = k === q.answer ? "right" : k === chosen ? "wrong" : "dim";
            else if (k === chosen) cls = "picked";
            return `<button class="opt ${cls}" data-k="${k}"><span>${"ABCD"[k]}</span>${esc(o)}</button>`;
          }).join("")}</div>
          ${reveal ? `<div class="explain ${chosen === q.answer ? "ok" : "bad"}"><b>${chosen === q.answer ? "✓ Correct" : "✗ Incorrect"}</b> ${q.explain ? esc(q.explain) : `Answer: ${esc(q.options[q.answer])}`}</div>` : ""}
          ${cfg.mode === "exam" ? `<div class="palette">${qs.map((_, k) => `<button data-p="${k}" class="${k === i ? "cur" : ""} ${answers[k] !== null ? "done" : ""}">${k + 1}</button>`).join("")}</div>` : ""}
          <div class="exam-nav">
            <button class="btn btn-ghost" data-a="prev" ${i === 0 ? "disabled" : ""}>← Prev</button>
            ${i < qs.length - 1 ? `<button class="btn" data-a="next" ${cfg.mode === "practice" && chosen === null ? "disabled" : ""}>Next →</button>` : ""}
            ${(cfg.mode === "exam" || i === qs.length - 1) ? `<button class="btn btn-dark" data-a="submit" ${cfg.mode === "practice" && chosen === null ? "disabled" : ""}>Submit</button>` : ""}
          </div>`;
        el.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
          if (cfg.mode === "practice" && answers[i] !== null) return;
          answers[i] = +b.dataset.k;
          draw();
        }));
        el.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { i = +b.dataset.p; draw(); }));
        const nav = (a, fn) => { const b = el.querySelector(`[data-a=${a}]`); if (b) b.onclick = fn; };
        nav("prev", () => { i--; draw(); });
        nav("next", () => { i++; draw(); });
        nav("submit", () => {
          const skipped = answers.filter((a) => a === null).length;
          if (cfg.mode === "exam" && skipped && !el.querySelector(".confirm")) {
            el.querySelector(".exam-nav").insertAdjacentHTML("afterend", `<div class="confirm">${skipped} question(s) not answered. <button class="btn btn-dark sm" data-a="really">Submit anyway</button></div>`);
            el.querySelector("[data-a=really]").onclick = finish;
            return;
          }
          finish();
        });
      };
      draw();
    };

    // ---------- report ----------
    const report = (qs, answers, cfg, secs) => {
      let correct = 0, wrong = 0, skipped = 0;
      qs.forEach((q, k) => { if (answers[k] === null) skipped++; else if (answers[k] === q.answer) correct++; else wrong++; });
      const marks = Math.max(0, correct - wrong * cfg.neg);
      const pct = Math.round((marks / qs.length) * 100);
      const grade = pct >= 90 ? "A+" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "Needs practice";
      const weak = {};
      qs.forEach((q, k) => { if (answers[k] !== q.answer && q.topic) weak[q.topic] = (weak[q.topic] || 0) + 1; });
      opts.onFinish?.(pct);
      el.innerHTML = `
        <div class="report">
          <div class="report-score">
            <div class="ring" style="--p:${pct}"><b>${pct}%</b><small>${esc(grade)}</small></div>
            <div class="report-stats">
              <div><b>${marks % 1 ? marks.toFixed(2) : marks} / ${qs.length}</b><span>Marks</span></div>
              <div class="ok"><b>${correct}</b><span>Correct</span></div>
              <div class="bad"><b>${wrong}</b><span>Wrong</span></div>
              <div><b>${skipped}</b><span>Skipped</span></div>
              <div><b>${fmt(secs)}</b><span>Time</span></div>
            </div>
          </div>
          <p class="report-msg">${pct >= 75 ? "Excellent! You're exam ready. Keep revising formulas." : pct >= 40 ? "Good effort. Revise the questions you missed and try again." : "Read the summary and flashcards once more, then retry."}</p>
          ${Object.keys(weak).length ? `<p class="muted small">Revise these topics: <b>${Object.keys(weak).map(esc).join(", ")}</b></p>` : ""}
          <div class="row">
            <button class="btn btn-brand" data-a="again">Practice again</button>
            ${wrong + skipped ? `<button class="btn" data-a="wrong">Retry wrong only (${wrong + skipped})</button>` : ""}
            <button class="btn btn-ghost" data-a="new">New quiz</button>
          </div>
          <h4 class="review-h">Answer review</h4>
          <ol class="review">${qs.map((q, k) => {
            const a = answers[k];
            const ok = a === q.answer;
            return `<li class="${a === null ? "skip" : ok ? "ok" : "bad"}">
              <div class="rq">${esc(q.question).replace(/\n/g, "<br>")}</div>
              <div class="ra">${a === null ? "Not answered" : `Your answer: <b>${esc(q.options[a])}</b> ${ok ? "✓" : "✗"}`}${ok ? "" : ` · Correct: <b>${esc(q.options[q.answer])}</b>`}</div>
              ${q.explain ? `<div class="rx">${esc(q.explain)}</div>` : ""}
            </li>`;
          }).join("")}</ol>
        </div>`;
      el.querySelector("[data-a=again]").onclick = () => run([...qs].sort(() => Math.random() - 0.5), cfg);
      const w = el.querySelector("[data-a=wrong]");
      if (w) w.onclick = () => run(qs.filter((q, k) => answers[k] !== q.answer), cfg);
      el.querySelector("[data-a=new]").onclick = setup;
    };

    setup();
    return stop;
  }

  root.NotesExam = { mount };
})(window);
