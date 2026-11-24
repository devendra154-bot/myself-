/* DevInventor Notes: display helpers for formulas and lesson text (HTML). */
(function (root) {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const isChem = (t) => /→|⟶|⇌|->/.test(t) && !/=/.test(t) && /[A-Z]/.test(t);

  /** Formula text → HTML with superscripts (x^2, x^{n}), subscripts (V_Z) and chemistry subscripts (H2O → H₂O). */
  function formula(text) {
    let h = esc(text);
    h = h.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>").replace(/\^([A-Za-z0-9+\-−]+)/g, "<sup>$1</sup>");
    h = h.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>").replace(/_([A-Za-z0-9]+(?:\([a-z]+\))?)/g, "<sub>$1</sub>");
    if (isChem(text)) h = h.replace(/([A-Za-z)\]])(\d+)/g, "$1<sub>$2</sub>");
    return h;
  }

  /** Lesson / notes text → readable HTML. Formulas are highlighted. */
  function notes(text) {
    const E = root.NotesEngine;
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of String(text || "").replace(/\r/g, "").split("\n")) {
      const l = raw.trim();
      let m;
      if (!l) { close(); continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { close(); const n = Math.min(4, m[1].length + 2); html += `<h${n}>${esc(m[2])}</h${n}>`; continue; }
      const bullet = l.match(/^([-*•]|\d{1,2}[.)])\s+(.*)/);
      const body = bullet ? bullet[2] : l.replace(/^=\s+/, "");
      if (/^=\s+/.test(l) || (E && E.isFormula && E.isFormula(body))) { close(); html += `<div class="formula-line">${formula(body)}</div>`; continue; }
      if (bullet) {
        const kind = /\d/.test(bullet[1]) ? "ol" : "ul";
        if (list !== kind) { close(); html += `<${kind}>`; list = kind; }
        html += `<li>${esc(body)}</li>`;
        continue;
      }
      close();
      html += `<p>${esc(l)}</p>`;
    }
    close();
    return html;
  }

  root.NotesFormat = { esc, formula, notes, isChem };
})(window);
