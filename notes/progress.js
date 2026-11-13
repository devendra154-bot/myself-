/* DevInventor Notes: chapter-wise learning progress (stored only in this browser). */
(function (root) {
  "use strict";
  const KEY = "dvn_progress";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const slug = (t) => String(t || "notes").toLowerCase().replace(/[^a-z0-9ఀ-౿]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "notes";

  function get(title) {
    const all = read();
    return { title, read: false, revised: false, quizBest: null, quizAttempts: 0, cardsKnown: 0, cardsTotal: 0, ...(all[slug(title)] || {}) };
  }

  function update(title, patch) {
    const all = read();
    const k = slug(title);
    all[k] = { ...get(title), ...patch, title, updatedAt: Date.now() };
    write(all);
    return all[k];
  }

  function recordQuiz(title, pct) {
    const p = get(title);
    return update(title, { quizAttempts: p.quizAttempts + 1, quizBest: Math.max(p.quizBest ?? 0, pct), lastQuiz: pct });
  }

  /** 0-100 score: read 20, cards 30, quiz 30, revised 20. */
  function score(p) {
    const cards = p.cardsTotal ? (p.cardsKnown / p.cardsTotal) * 30 : 0;
    return Math.round((p.read ? 20 : 0) + cards + ((p.quizBest ?? 0) / 100) * 30 + (p.revised ? 20 : 0));
  }

  const all = () => Object.values(read()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const reset = () => write({});

  root.NotesProgress = { get, update, recordQuiz, score, all, reset };
})(window);
