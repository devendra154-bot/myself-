/* DevInventor Notes: study engine.
 * Runs fully in the browser (no server, no AI cost). Extractive: it finds and
 * organises the most important sentences instead of rewriting them.
 * Built so an AI engine can replace these functions later (see config.js).
 */
(function (root) {
  "use strict";

  const STOP = new Set(("a an the and or but if then else of to in on at by for with from as is are was were be been being this that these those it its it's into than also can could may might will would shall should must do does did done not no nor so such there their they them we our you your he she his her i me my which who whom whose what when where why how all any each few more most other some only own same too very just about above below between both during before after again further once here up down out off over under per via etc e.g i.e eg ie using used use one two three called known").split(" "));

  const ABBR = /\b(e\.g|i\.e|etc|vs|fig|eq|dr|mr|mrs|ms|no|approx|resp|max|min|avg|sec|ch|ref|st|pvt|ltd)\.$/i;

  // ---------- text cleanup ----------
  function clean(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/^\s*\[(?:diagram|figure|image)\s*\d+\]\s*$/gim, "") // diagram markers are for handwriting only
      .replace(/[ \t]+/g, " ")
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/-\n(?=[a-z])/g, "") // words broken across lines in PDFs
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // ---------- formulas & equations (physics, chemistry, electronics…) ----------
  const REL = /(=|≈|≅|∝|≤|≥|→|⟶|⇌|⇄|->)/;
  const PROSE = /\b(is|are|was|were|the|which|that|where|when|states|gives|called|known|means|because|then|this|these|for|and|if|with)\b/i;
  const MATHY = /[A-Za-z)\]][²³⁴ⁿ]|[A-Za-z)\]]\s*\^|√|[A-Za-z)\]]\s*[+\-−×*/÷]\s*[A-Za-z0-9(√½]|[0-9)\]]\s*[+×*/÷]\s*[A-Za-z(]/;
  const longWords = (l) => (l.match(/[A-Za-z]{4,}/g) || []).filter((w) => !/^(sin|cos|tan|cot|sec|log|exp|sqrt)$/i.test(w));

  /** Is this whole line a formula / equation (not a sentence)? e.g. V = IR, a+b², 2H2 + O2 → 2H2O */
  function isFormula(line) {
    let l = String(line || "").trim().replace(/^([-*•]|\d{1,2}[.)])\s+/, "");
    const named = l.match(/^([A-Za-z][^:=→]{1,80}):\s*(.+)$/);
    if (named) l = named[2];
    if (!l || l.length > 160 || !/[A-Za-z0-9]/.test(l)) return false;
    // "Rectifiers convert AC → DC." is a sentence: ends with a full stop, plain words before the arrow, no + or chemical formula
    const arrow = l.match(/^(.*?)(→|⟶|->)/);
    if (arrow && /\.$/.test(l) && !/[=≈≤≥∝]/.test(l) && arrow[1].trim().split(/\s+/).length >= 2 && !/[+\d()]/.test(arrow[1])) return false;
    if (REL.test(l)) return !PROSE.test(l) && longWords(l).length <= 8 && !/[.?!]\s+[A-Z][a-z]/.test(l);
    return MATHY.test(l) && longWords(l).length <= 1;
  }

  /** Formulas written inside a sentence: "The ideal gas equation is PV = nRT, where …" → "PV = nRT" */
  function inlineFormulas(sentence) {
    const out = [];
    const re = /(=|≈|∝|→|⟶|⇌)/g;
    let m;
    while ((m = re.exec(sentence))) {
      const left = sentence.slice(0, m.index).trim().split(/\s+/);
      const lt = [];
      for (let i = left.length - 1; i >= 0 && lt.length < 5; i--) {
        const w = left[i];
        if (/^[A-Za-zΔΣλμρσθωαβγπη0-9(½][\w²³⁴⁻⁺′'()/^.+\-−×*½]*$/.test(w) && !/^[a-z]{4,}$/.test(w) && !/^(is|are|the|of|and|was|by|as|so|be|or)$/i.test(w)) lt.unshift(w);
        else if (/^[+\-−×*/]$/.test(w)) lt.unshift(w);
        else break;
      }
      const right = sentence.slice(m.index + m[0].length).split(/,|;|\.\s|\.$|\s(?:where|when|which|and the|in which|for|is|are)\s/)[0].trim();
      if (lt.length && right && right.length < 90 && /[A-Za-z0-9]/.test(right)) out.push(`${lt.join(" ")} ${m[0]} ${right}`.replace(/[.,]$/, ""));
    }
    return out;
  }

  /** Short description for a formula from its own line ("Ohm's law: V = IR") or the sentence before it. */
  function formulaContext(prevText) {
    if (!prevText) return "";
    const t = prevText.replace(/\.$/, "");
    const m = t.match(/^(?:the\s+)?(.{2,60}?)\s+(?:is|are|states|relates|gives|shows|represents|can be written)\b/i);
    return (m ? m[1] : t).trim();
  }

  const isBullet = (l) => /^\s*([-*•●▪◦]|\d{1,2}[.)]|[a-z][.)]|\(?[ivx]{1,4}\)|step\s*\d+)/i.test(l);
  function isHeading(line, next) {
    const l = line.trim();
    if (!l || l.length > 70) return false;
    if (isFormula(l) || REL.test(l)) return false; // formula / equation, not a heading
    if (/^#{1,6}\s/.test(l)) return true;
    if (/^(unit|chapter|module|section|topic|part)\s*[-:\dIVX]/i.test(l)) return true;
    if (/[.?!,;]$/.test(l)) return false;
    if (/:$/.test(l) && l.split(" ").length <= 8) return true;
    const words = l.split(/\s+/);
    if (words.length > 9) return false;
    if (l === l.toUpperCase() && /[A-Z]/.test(l) && words.length <= 8) return true;
    if (/^\d+(\.\d+)*\s+[A-Z]/.test(l) && words.length <= 8) return true;
    const caps = words.filter((w) => /^[A-Z(]/.test(w)).length;
    return caps / words.length >= 0.6 && (!next || next.trim().length > l.length);
  }
  const stripHeading = (l) => l.trim().replace(/^#{1,6}\s*/, "").replace(/:$/, "").trim();
  const stripBullet = (l) => l.trim().replace(/^([-*•●▪◦]|\d{1,2}[.)]|[a-z][.)]|\(?[ivx]{1,4}\)|step\s*\d+[:.)-]?)\s*/i, "").trim();

  function splitSentences(par) {
    const out = [];
    let buf = "";
    const parts = par.split(/(?<=[.?!])\s+(?=[A-Z0-9("'])/);
    for (const p of parts) {
      buf = buf ? buf + " " + p : p;
      if (ABBR.test(buf.trim())) continue;
      out.push(buf.trim());
      buf = "";
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter((s) => s.length > 2);
  }

  const words = (s) => (s.toLowerCase().match(/[a-z][a-z0-9+#'-]*[a-z0-9+#]|[a-z]/g) || []);
  const contentWords = (s) => words(s).filter((w) => w.length > 2 && !STOP.has(w));
  const stem = (w) => w.replace(/(ies)$/, "y").replace(/(sses|ses|xes)$/, (m) => m.slice(0, -2)).replace(/([^s])s$/, "$1").replace(/(ing|ed)$/, "");

  /** Parse notes into sections of sentences, keeping bullet points and order. */
  function parse(text) {
    const lines = clean(text).split("\n");
    const sections = [];
    let cur = { title: "", items: [] };
    const push = () => { if (cur.items.length || cur.title) sections.push(cur); };
    let para = [];
    let order = 0;
    const flushPara = () => {
      if (!para.length) return;
      for (const s of splitSentences(para.join(" "))) cur.items.push({ text: s, bullet: false, order: order++ });
      para = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) { flushPara(); continue; }
      if (!isBullet(line) && isHeading(line, lines[i + 1])) {
        flushPara(); push();
        cur = { title: stripHeading(line), items: [] };
        continue;
      }
      if (isFormula(line)) {
        flushPara();
        cur.items.push({ text: line.trim().replace(/^([-*•]|\d{1,2}[.)])\s+/, ""), bullet: true, formula: true, order: order++ });
        continue;
      }
      if (REL.test(line) && !isBullet(line)) {
        // a sentence and a formula on one line ("Power is … used. P = VI"): keep them separate, don't merge with the next line
        flushPara();
        for (const piece of splitSentences(line.trim())) cur.items.push({ text: piece, bullet: false, formula: isFormula(piece), order: order++ });
        continue;
      }
      if (isBullet(line)) {
        flushPara();
        const t = stripBullet(line);
        if (t) cur.items.push({ text: t, bullet: true, step: /^\s*(\d{1,2}[.)]|step\s*\d+)/i.test(line), order: order++ });
        continue;
      }
      para.push(line.trim());
    }
    flushPara(); push();
    return sections.filter((s) => s.items.length || s.title);
  }

  // ---------- scoring ----------
  const DEF_RE = /^(?:an?\s+|the\s+)?([A-Za-z][\w\s()\/+-]{1,48}?)\s+(?:is|are|refers to|is defined as|are defined as|means|is called|is known as|can be defined as|is a term for)\s+(.{8,})$/i;
  const COLON_DEF = /^([A-Z][\w\s()\/+-]{1,40}?)\s*[:–—-]\s+(.{8,})$/;
  const CUE = /\b(important|key|main|defined|definition|types? of|advantages?|disadvantages?|applications?|features?|characteristics?|difference|differs?|purpose|used (?:to|for)|consists? of|classified|principle|law|theorem|formula|function|role|benefits?|limitations?|steps?|process|example)\b/i;

  function termFrequencies(sections) {
    const tf = new Map();
    for (const sec of sections) {
      for (const it of sec.items) for (const w of contentWords(it.text)) { const k = stem(w); tf.set(k, (tf.get(k) || 0) + 1); }
      for (const w of contentWords(sec.title)) { const k = stem(w); tf.set(k, (tf.get(k) || 0) + 3); }
    }
    return tf;
  }

  function scoreSentences(sections) {
    const tf = termFrequencies(sections);
    const max = Math.max(1, ...tf.values());
    const all = [];
    sections.forEach((sec, si) => {
      const titleWords = new Set(contentWords(sec.title).map(stem));
      sec.items.forEach((it, idx) => {
        const cw = contentWords(it.text);
        if (it.formula || isFormula(it.text)) { it.formula = true; it.score = 2; it.section = si; all.push(it); return; }
        if (!cw.length) { it.score = 0; return; }
        let s = cw.reduce((a, w) => a + (tf.get(stem(w)) || 0) / max, 0) / Math.sqrt(cw.length);
        if (DEF_RE.test(it.text) || COLON_DEF.test(it.text)) s += 0.9;
        if (CUE.test(it.text)) s += 0.35;
        if (/[=≈∝→]|\d/.test(it.text)) s += 0.15;
        if (cw.some((w) => titleWords.has(stem(w)))) s += 0.3;
        if (idx === 0) s += 0.35;
        if (it.bullet) s += 0.15;
        const len = it.text.split(/\s+/).length;
        if (len < 4) s *= 0.5;
        if (len > 45) s *= 0.75;
        it.score = s;
        it.section = si;
        all.push(it);
      });
    });
    return { all, tf };
  }

  // ---------- extraction ----------
  function keyTerms(sections, tf, n = 12) {
    // Prefer multi-word technical phrases (bigrams/trigrams) that repeat, then single words.
    const phrases = new Map();
    for (const sec of sections) {
      for (const it of [{ text: sec.title }, ...sec.items]) {
        const tokens = it.text.split(/[^A-Za-z0-9+#-]+/).filter(Boolean);
        for (let size = 2; size <= 3; size++) {
          for (let i = 0; i + size <= tokens.length; i++) {
            const g = tokens.slice(i, i + size);
            if (g.some((w) => STOP.has(w.toLowerCase()) || w.length < 2) || g.every((w) => /^\d+$/.test(w))) continue;
            const key = g.join(" ").toLowerCase();
            const e = phrases.get(key) || { text: g.join(" "), n: 0 };
            e.n++;
            if (/^[A-Z]/.test(g[0])) e.text = g.join(" ");
            phrases.set(key, e);
          }
        }
      }
    }
    const multi = [...phrases.values()].filter((p) => p.n >= 2).sort((a, b) => b.n * b.text.length - a.n * a.text.length);
    const chosen = [];
    for (const p of multi) {
      if (chosen.some((c) => c.toLowerCase().includes(p.text.toLowerCase()) || p.text.toLowerCase().includes(c.toLowerCase()))) continue;
      chosen.push(p.text);
      if (chosen.length >= Math.ceil(n / 2)) break;
    }
    const acronyms = new Set();
    for (const sec of sections) for (const it of sec.items) for (const m of it.text.match(/\b[A-Z]{2,6}s?\b/g) || []) acronyms.add(m);
    const singles = [...tf.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).filter((w) => w.length > 3);
    for (const a of acronyms) if (chosen.length < n && !chosen.some((c) => c.includes(a))) chosen.push(a);
    for (const w of singles) {
      if (chosen.length >= n) break;
      if (!chosen.some((c) => c.toLowerCase().includes(w))) chosen.push(w);
    }
    return chosen.slice(0, n);
  }

  function definitions(sections) {
    const out = [];
    const seen = new Set();
    for (const sec of sections) {
      for (const it of sec.items) {
        const m = it.text.match(DEF_RE) || it.text.match(COLON_DEF);
        if (!m) continue;
        let term = m[1].trim().replace(/^(an?|the)\s+/i, "");
        if (term.split(/\s+/).length > 6 || /^(it|this|that|they|these|there|which|he|she)$/i.test(term)) continue;
        if (/^(an?|the|this|it|if|when|while|repeat|otherwise|however|each|every|then|so|also|here|now|all|some|most|many)\b/i.test(term)) continue;
        if (it.step || it.formula) continue;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        let def = m[2].trim().replace(/\.$/, "");
        out.push({ term: term.charAt(0).toUpperCase() + term.slice(1), definition: def, sentence: it.text });
      }
    }
    return out;
  }

  /** All formulas in the notes: [{ expr, name, context, source }] (deduplicated). */
  function formulaList(sections) {
    const out = [];
    const seen = new Set();
    /** "P = 12 × 2 = 24 W" or "12 / 6 = 2 A" are worked calculations, not formulas. */
    const isCalc = (e) => {
      const letters = (e.match(/[A-Za-zα-ωΑ-Ωρη]/g) || []).length;
      const digits = (e.match(/\d/g) || []).length;
      if (/=/.test(e) && !/[A-Za-zα-ωΑ-ΩΣΔρη]/.test(e.split("=")[0])) return true;
      return (e.match(/=/g) || []).length >= 2 && digits > 0 || (digits > 0 && letters <= 1 && /=/.test(e)) || /\b(resistors?|gives?|the|in)\b/i.test(e);
    };
    const add = (expr, name, context, source, inline) => {
      const e = expr.replace(/\s+/g, " ").trim();
      if (isCalc(e) && (inline || (e.match(/=/g) || []).length >= 2)) return;
      const k = e.replace(/\s/g, "").toLowerCase();
      if (!e || seen.has(k)) return;
      seen.add(k);
      out.push({ expr: e, name: (name || "").trim(), context: (context || "").trim(), source });
    };
    for (const sec of sections) {
      sec.items.forEach((it, idx) => {
        if (it.formula || isFormula(it.text)) {
          const named = it.text.match(/^([A-Za-z][^:=→]{1,80}):\s*(.+)$/);
          const prev = sec.items.slice(0, idx).reverse().find((p) => !p.formula && !isFormula(p.text));
          const prevUsed = prev && sec.items.slice(sec.items.indexOf(prev) + 1, idx).some((p) => p.formula || isFormula(p.text));
          const ctx = prev && !prevUsed ? formulaContext(prev.text) : topicOf(sec.title);
          add(named ? named[2].replace(/\.$/, "") : it.text.replace(/\.$/, ""), named ? named[1] : "", ctx, it.text);
        } else {
          for (const e of inlineFormulas(it.text)) add(e, "", formulaContext(it.text.split(/\s(?:is|=)\s/)[0]), it.text, true);
        }
      });
    }
    return out.slice(0, 40);
  }

  function formulas(sections) {
    return formulaList(sections).map((f) => (f.name ? `${f.name}: ${f.expr}` : f.expr));
  }

  const topicOf = (t) => String(t || "").replace(/^(unit|chapter|module|section|topic|part)\s*[-:\dIVX.]*\s*[:.-]?\s*/i, "").replace(/^\d+(\.\d+)*\s+/, "").trim() || t;
  const GENERIC = /^(formulas?|definitions?|introduction|summary|conclusion|notes?|key (terms|points)|examples?|exercises?|questions?|references?)$/i;

  function examQuestions(sections, defs, terms) {
    const qs = [];
    const add = (q, marks) => { if (!qs.some((x) => x.q === q)) qs.push({ q, marks }); };
    defs.slice(0, 3).forEach((d) => add(`Define ${d.term}.`, 2));
    for (const sec of sections) {
      const t = topicOf(sec.title);
      if (!t || GENERIC.test(t)) continue;
      const lt = t.toLowerCase();
      if (/^(advantages?|disadvantages?|merits?|benefits?)\s+of\s+/.test(lt)) { add(`Explain the ${t.toLowerCase()}.`, 5); continue; }
      if (/^steps?\s+(of|in|for)\s+/.test(lt)) { add(`Explain the ${t.toLowerCase()} with a neat diagram.`, 10); continue; }
      const joined = sec.items.map((i) => i.text).join(" ").toLowerCase();
      if (/^types?\b|classif|kinds/.test(lt)) add(`Explain the types of ${t.replace(/^types? of\s*/i, "")} with examples.`, 10);
      if (/disadvantage/.test(joined) || (/advantage|merit|benefit/.test(joined) && /limitation|drawback|disadvantage/.test(joined))) add(`List the advantages and disadvantages of ${t}.`, 5);
      if (/\b(steps?|procedure|algorithm|working|process of)\b/.test(lt)) add(`Explain the working / steps of ${t} with a neat diagram.`, 10);
      if (/differ|\bvs\b|versus|compar/.test(lt)) add(`Differentiate between the concepts in "${t}".`, 5);
      add(`Write short notes on ${t}.`, 5);
    }
    if (defs.length >= 2) add(`Differentiate between ${defs[0].term} and ${defs[1].term}.`, 5);
    terms.slice(0, 3).forEach((k) => add(`What is ${k}? Explain its importance.`, 5));
    return qs.slice(0, 12);
  }

  const shortPhrase = (s, max = 7, useTerm = true) => {
    const m = useTerm && (s.match(DEF_RE) || s.match(COLON_DEF));
    let t = m && m[1].split(/\s+/).length <= 6 && !/^(it|this|that|they|these|there|if|when|repeat|unit|chapter|module)\b/i.test(m[1]) ? m[1] : s;
    t = t.replace(/\(.*?\)/g, "").replace(/[.,;:]+$/, "").trim();
    const w = t.split(/\s+/);
    return w.length > max ? w.slice(0, max).join(" ") + "…" : t;
  };

  // ---------- public API ----------
  /**
   * @param {string} text  the notes
   * @param {"short"|"medium"|"detailed"} length
   */
  function summarize(text, length = "medium") {
    const sections = parse(text);
    if (!sections.length) return null;
    const { all, tf } = scoreSentences(sections);
    const ratio = { short: 0.2, medium: 0.35, detailed: 0.55 }[length] || 0.35;
    const totalWords = all.reduce((a, s) => a + s.text.split(/\s+/).length, 0);

    const outSections = sections.map((sec) => {
      const items = sec.items.filter((i) => i.score > 0);
      const keep = Math.max(1, Math.min(items.length, Math.round(items.length * ratio + (length === "short" ? 0.4 : 0.8))));
      const chosen = new Set([...items].filter((i) => !i.formula).sort((a, b) => b.score - a.score).slice(0, keep));
      items.filter((i) => i.formula).forEach((i) => chosen.add(i));
      const top = [...chosen].sort((a, b) => a.order - b.order);
      return { title: sec.title, points: top.map((i) => i.text) };
    }).filter((s) => s.points.length);

    const defs = definitions(sections);
    const terms = keyTerms(sections, tf);
    const summaryWords = outSections.reduce((a, s) => a + s.points.join(" ").split(/\s+/).length, 0);
    return {
      title: topicOf(sections.find((s) => s.title)?.title) || terms[0] || "Notes",
      sections: outSections,
      keyTerms: terms,
      definitions: defs,
      formulas: formulas(sections),
      examQuestions: examQuestions(sections, defs, terms),
      stats: { words: totalWords, summaryWords, saved: totalWords ? Math.max(0, Math.round((1 - summaryWords / totalWords) * 100)) : 0 },
    };
  }

  /** Summary as plain text, ready for the handwriting converter. */
  function summaryToText(sum) {
    if (!sum) return "";
    const out = [`# ${sum.title}`];
    for (const s of sum.sections) {
      if (s.title && topicOf(s.title) !== sum.title) out.push("", `## ${s.title}`);
      for (const p of s.points) out.push(`- ${p}`);
    }
    if (sum.definitions.length) { out.push("", "## Definitions"); sum.definitions.forEach((d) => out.push(`- ${d.term}: ${d.definition}.`)); }
    if (sum.formulas.length) { out.push("", "## Formulas"); sum.formulas.forEach((f) => out.push(`- ${f}`)); }
    if (sum.keyTerms.length) out.push("", "## Key terms", sum.keyTerms.join(", "));
    return out.join("\n");
  }

  // ---------- Q&A (search in the student's notes, BM25) ----------
  function answer(text, question, marks = 5) {
    const sections = parse(text);
    const docs = [];
    sections.forEach((sec) => sec.items.forEach((it) => docs.push({ text: it.text, section: sec.title, order: it.order })));
    if (!docs.length) return null;
    const qWords = contentWords(question).map(stem).filter((w) => !["explain", "define", "describe", "write", "short", "note", "list", "discus", "mention", "state", "give", "brief", "detail"].includes(w));
    if (!qWords.length) return { found: false, points: [] };

    const N = docs.length;
    const dl = docs.map((d) => contentWords(d.text).map(stem));
    const avg = dl.reduce((a, d) => a + d.length, 0) / N || 1;
    const df = new Map();
    dl.forEach((d) => new Set(d).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    const k1 = 1.4, b = 0.75;
    const scored = docs.map((d, i) => {
      let s = 0;
      for (const q of qWords) {
        const f = dl[i].filter((w) => w === q).length;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(q) || 0) + 0.5) / ((df.get(q) || 0) + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl[i].length / avg));
      }
      const secWords = contentWords(d.section).map(stem);
      if (qWords.some((q) => secWords.includes(q))) s += 0.8;
      if (/^(what|define|meaning)/i.test(question.trim()) && (DEF_RE.test(d.text) || COLON_DEF.test(d.text))) s *= 1.6;
      return { ...d, score: s };
    }).filter((d) => d.score > 0);

    if (!scored.length) return { found: false, points: [] };
    const nPoints = marks <= 2 ? 2 : marks <= 5 ? 5 : 9;
    const best = scored.sort((a, b) => b.score - a.score);
    const topic = best[0].section;
    let topDocs = best.slice(0, nPoints);
    if (topDocs.length < nPoints) {
      for (const d of docs) {
        if (topDocs.length >= nPoints) break;
        if (d.section === topic && !topDocs.some((x) => x.text === d.text)) topDocs.push(d);
      }
    }
    const top = topDocs.sort((a, b) => a.order - b.order);
    return {
      found: true,
      confidence: Math.min(100, Math.round(best[0].score * 18)),
      intro: best[0].text,
      points: top.map((d) => d.text).filter((t) => t !== best[0].text),
      section: topic,
      marks,
    };
  }

  // ---------- visual learning ----------
  function flashcards(text) {
    const sections = parse(text);
    const cards = definitions(sections).map((d) => ({ front: d.term, back: d.definition }));
    if (cards.length < 6) {
      const { all } = scoreSentences(sections);
      const sum = summarize(text, "detailed");
      for (const term of sum ? sum.keyTerms : []) {
        if (cards.length >= 15) break;
        if (cards.some((c) => c.front.toLowerCase() === term.toLowerCase())) continue;
        const s = all.filter((x) => x.text.toLowerCase().includes(term.toLowerCase())).sort((a, b) => b.score - a.score)[0];
        if (s) cards.push({ front: term, back: s.text });
      }
    }
    for (const fo of formulaList(sections)) {
      if (cards.length >= 40) break;
      cards.push({ front: fo.name || fo.context || "Complete the formula", back: fo.expr });
    }
    return cards.slice(0, 40);
  }

  function shuffle(a, seed = 7) {
    const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /** Plausible wrong versions of a formula (swapped symbols, operators, powers, fractions, coefficients). */
  function formulaDistractors(expr, others) {
    const out = new Set();
    const chem = /→|⟶|⇌|->/.test(expr) && !/=/.test(expr) && /[A-Z]/.test(expr);
    if (chem) {
      const addC = (x) => { const t = x.replace(/\s+/g, " ").trim(); if (t.replace(/\s/g, "") !== expr.replace(/\s/g, "")) out.add(t); };
      const [arrow] = expr.match(/→|⟶|⇌|->/);
      const [lhs, rhs] = expr.split(arrow).map((x) => x.trim());
      const L = lhs.split(/\s*\+\s*/), R = rhs.split(/\s*\+\s*/);
      addC(`${rhs} ${arrow} ${lhs}`);                                                     // reversed
      const bump = (sp) => { const m = sp.match(/^(\d+)(.*)$/); return m ? (m[1] === "2" ? m[2] : String(+m[1] + 1) + m[2]) : "2" + sp; };
      addC(`${[bump(L[0]), ...L.slice(1)].join(" + ")} ${arrow} ${rhs}`);                  // wrong coefficient
      addC(`${lhs} ${arrow} ${[bump(R[0]), ...R.slice(1)].join(" + ")}`);
      if (R.length > 1) addC(`${lhs} ${arrow} ${R.slice(0, -1).join(" + ")}`);              // missing product
      if (L.length > 1) addC(`${L.slice(0, -1).join(" + ")} ${arrow} ${rhs}`);              // missing reactant
      return [...out];
    }
    const relM = expr.match(REL);
    const add = (x) => { const t = x.replace(/\s+/g, " ").trim(); if (t && t.replace(/\s/g, "") !== expr.replace(/\s/g, "")) out.add(t); };
    if (relM) {
      const [lhs, rhs] = [expr.slice(0, relM.index), expr.slice(relM.index + relM[0].length)];
      // swap a variable on the left with one on the right (V = IR → I = VR)
      const lv = lhs.match(/[A-Za-zΔρλμσθωαβγη]/), rv = rhs.match(/[A-Za-zΔρλμσθωαβγη]/);
      if (lv && rv && lv[0] !== rv[0]) add(lhs.replace(lv[0], "§").replace(/§/, rv[0]) + relM[0] + rhs.replace(rv[0], lv[0]));
      if (/\//.test(rhs)) add(lhs + relM[0] + rhs.replace(/([\wρλμσθΔ²³()]+)\s*\/\s*([\wρλμσθΔ²³()]+)/, "$2/$1"));
    }
    if (/[+]/.test(expr)) add(expr.replace(/\+(?![^+]*\+)/, "−"));
    if (/[−-]\s*[A-Za-z0-9(]/.test(expr.replace(/->/g, ""))) add(expr.replace(/[−-](?=\s*[A-Za-z0-9(])/, "+"));
    if (/²/.test(expr)) { add(expr.replace("²", "")); add(expr.replace("²", "³")); }
    else if (/[A-Za-z]/.test(expr)) add(expr.replace(/([A-Za-z]\d*)(?![\s\S]*[A-Za-z])/, "$1²"));
    if (/½/.test(expr)) add(expr.replace("½", "2"));
    if (/\b\d+[A-Z]/.test(expr)) add(expr.replace(/\b(\d+)(?=[A-Z])/, (m) => String(+m + 1)));
    if (/→|⟶|->/.test(expr) && /\b[A-Z]/.test(expr)) add(expr.replace(/(→|⟶|->)\s*(\d*)/, (m, a) => `${a} `));
    for (const o of others) if (out.size < 6) add(o);
    return [...out];
  }

  function formulaQuestions(sections, seedStart = 101) {
    const list = formulaList(sections);
    const qs = [];
    let seed = seedStart;
    for (const f of list) {
      const others = list.filter((x) => x !== f).map((x) => x.expr);
      const wrong = shuffle(formulaDistractors(f.expr, others), seed++).slice(0, 3);
      if (wrong.length < 3) continue;
      const options = shuffle([f.expr, ...wrong], seed++);
      const chem = /→|⟶|⇌|->/.test(f.expr) && !/=/.test(f.expr) && /[A-Z]/.test(f.expr);
      const label = f.name || f.context;
      const question = label
        ? `Which ${chem ? "equation" : "formula"} is correct for: ${label}?`
        : `Which of these ${chem ? "equations" : "formulas"} is written correctly (from your notes)?`;
      qs.push({ type: "formula", question, options, answer: options.indexOf(f.expr), explain: `From your notes: ${f.source}` });
    }
    return qs;
  }

  function quiz(text, n = 10) {
    const sections = parse(text);
    const defs = definitions(sections);
    const sum = summarize(text, "detailed");
    if (!sum) return [];
    const seenT = new Set();
    const terms = [...defs.map((d) => d.term), ...sum.keyTerms].filter((t) => { const k = t.toLowerCase(); if (seenT.has(k) || t.length > 40) return false; seenT.add(k); return true; });
    const qs = [];
    let seed = 11;
    // MCQs from definitions: "Which term means: ...?"
    for (const d of defs) {
      const wrong = shuffle(terms.filter((t) => t.toLowerCase() !== d.term.toLowerCase()), seed++).slice(0, 3);
      if (wrong.length < 2) continue;
      const options = shuffle([d.term, ...wrong], seed++);
      qs.push({ type: "mcq", question: `Which term matches this definition?\n“${d.definition}”`, options, answer: options.indexOf(d.term) });
    }
    // Fill in the blanks from important sentences that contain a key term.
    const { all } = scoreSentences(sections);
    for (const s of [...all].sort((a, b) => b.score - a.score)) {
      if (qs.length >= n * 2) break;
      const term = terms.find((t) => t.length > 2 && new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s.text));
      if (!term || s.text.length > 220) continue;
      if (qs.some((q) => q.source === s.text)) continue;
      const blanked = s.text.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "_____");
      const wrong = shuffle(terms.filter((t) => t.toLowerCase() !== term.toLowerCase()), seed++).slice(0, 3);
      if (wrong.length >= 2) {
        const options = shuffle([term, ...wrong], seed++);
        qs.push({ type: "blank", question: `Fill in the blank:\n${blanked}`, options, answer: options.indexOf(term), source: s.text });
      }
    }
    const fq = formulaQuestions(sections);
    const nf = Math.min(fq.length, Math.max(fq.length ? 2 : 0, Math.round(n * 0.4)));
    const mixed = [...shuffle(fq, 5).slice(0, nf), ...shuffle(qs, 3).slice(0, n - nf)];
    return shuffle(mixed, 9).slice(0, n).map(({ source, ...q }) => q);
  }

  function mindmap(text) {
    const sum = summarize(text, "medium");
    if (!sum) return null;
    const rootTitle = topicOf(sum.title);
    let branches = sum.sections.filter((s) => s.title).map((s) => ({
      label: topicOf(s.title) === sum.title ? "Overview" : shortPhrase(topicOf(s.title), 5, false),
      children: s.points.slice(0, 4).map((p) => shortPhrase(p)).filter((c, i, a) => c.length > 2 && a.indexOf(c) === i),
    }));
    if (branches.length < 2) {
      // No headings: build branches from key terms and the sentences that mention them.
      const sections = parse(text);
      const { all } = scoreSentences(sections);
      branches = sum.keyTerms.slice(0, 6).map((t) => ({
        label: t,
        children: all.filter((s) => s.text.toLowerCase().includes(t.toLowerCase())).sort((a, b) => b.score - a.score).slice(0, 3).map((s) => shortPhrase(s.text)),
      }));
    }
    return { root: shortPhrase(rootTitle, 5, false), branches: branches.slice(0, 8) };
  }

  function flowchart(text) {
    const sections = parse(text);
    // 1) explicit numbered steps (largest run)
    let best = [], bestTitle = "";
    for (const sec of sections) {
      let run = [];
      const close = () => { if (run.length > best.length) { best = run; bestTitle = sec.title; } run = []; };
      for (const it of sec.items) { if (it.step) run.push(it.text); else if (run.length) close(); }
      close();
    }
    if (best.length >= 2) return { title: topicOf(bestTitle) || "Steps", steps: best.slice(0, 12).map((s) => shortPhrase(s, 14, false)) };
    // 2) sequence words in sentences
    const seq = [];
    for (const sec of sections) for (const it of sec.items) if (/^(first(ly)?|second(ly)?|third(ly)?|then|next|after(wards| that)?|finally|lastly|initially|step)\b/i.test(it.text)) seq.push(shortPhrase(it.text, 14, false));
    if (seq.length >= 2) return { title: "Process", steps: seq.slice(0, 12) };
    return null;
  }

  const api = { clean, parse, summarize, summaryToText, answer, flashcards, quiz, mindmap, flowchart, isFormula, formulaList: (t) => formulaList(parse(t)) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NotesEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
