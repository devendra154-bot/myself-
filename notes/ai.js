/* DevInventor Notes: optional "Smart AI" (off by default).
 * Uses the student's OWN Google Gemini API key (free tier available at
 * aistudio.google.com). The key is stored only in this browser. Notes are sent
 * to Google only when the student turns this on and presses an AI button.
 */
(function (root) {
  "use strict";
  const KEY = "dvn_ai";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

  const settings = () => ({ enabled: false, key: "", model: "gemini-2.5-flash", ...read() });
  const save = (patch) => write({ ...settings(), ...patch });
  const ready = () => { const s = settings(); return s.enabled && s.key.length > 20; };

  const RULES = `You are an expert engineering lecturer for Indian B.Tech and diploma students (JNTU/AICTE syllabus).
Rules:
- Be technically accurate. Use standard textbook formulas and correct units.
- Use only the facts in the student's notes plus well-established textbook knowledge. If unsure, say so.
- Never draw or describe circuit diagrams with ASCII art. If a diagram is needed write exactly one line: [[diagram: name of circuit]].
- Format with Markdown: # title, ## headings, - bullet points, numbered steps, and formulas on their own line starting with "= ".
- Keep answers exam-oriented: definition, key points, working, formulas, example, conclusion as the marks require.`;

  async function generate(prompt, { maxTokens = 2048 } = {}) {
    const s = settings();
    if (!ready()) throw new Error("Smart AI is off. Turn it on in Settings and add your free Gemini key.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`;
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": s.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: RULES }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
        }),
      });
    } catch {
      throw new Error("Couldn't reach Google AI. Check your internet connection.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || res.statusText;
      if (res.status === 400 && /api key/i.test(msg)) throw new Error("Your Gemini key looks wrong. Check it in Settings.");
      if (res.status === 429) throw new Error("Free AI limit reached for now. Try again in a minute.");
      if (res.status === 404) throw new Error(`Model "${s.model}" not found. Change the model name in Settings.`);
      throw new Error("AI error: " + msg);
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("The AI returned an empty answer. Try again.");
    return text;
  }

  const clip = (t, n = 24000) => (t.length > n ? t.slice(0, n) + "\n…(notes truncated for AI)" : t);

  const tasks = {
    simpleNotes: (notes, length) => generate(`Rewrite these notes as ${length} exam notes in very simple English that a weak student can understand. Keep every important fact, definition and formula. Add one simple real-life example per main topic.\n\nNOTES:\n${clip(notes)}`, { maxTokens: length === "detailed" ? 4096 : 2048 }),
    telugu: (notes) => generate(`Explain these notes in simple Telugu (తెలుగు) for an engineering student. Keep technical terms and formulas in English (for example "forward bias", "V = IR") inside Telugu sentences, the way Telugu lecturers teach. Use headings and bullet points.\n\nNOTES:\n${clip(notes)}`, { maxTokens: 4096 }),
    examAnswer: (notes, question, marks, lang) => generate(`Write a ${marks}-mark university exam answer for: "${question}".
Length guide: 2 marks = 3–4 lines; 5 marks = definition + 5 points + formula; 8 marks = definition, points, working steps, formulas, example; 10 marks = all of that plus advantages, disadvantages, applications and conclusion.
${lang === "te" ? "Write the answer in simple Telugu, keeping technical terms and formulas in English." : "Write in simple, clear English."}
Use the student's notes below as the main source.\n\nNOTES:\n${clip(notes)}`, { maxTokens: marks >= 8 ? 4096 : 1500 }),
  };

  root.NotesAI = { settings, save, ready, generate, tasks };
})(window);
