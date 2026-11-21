(() => {
  const { parts, store, art } = window.Story;
  const $ = id => document.getElementById(id);
  const synth = window.speechSynthesis;
  let S = store.settings();
  const save = () => store.save(S);

  /* ---- narrator settings ---- */
  function fillVoices() {
    const vs = synth ? synth.getVoices() : [];
    const sel = $("voiceSel");
    if (!vs.length) { sel.innerHTML = "<option>Default voice</option>"; $("voiceNote").textContent = synth ? "Loading voices… (if none appear, your browser has no built-in voices; you can still record your own)" : "This browser has no speech voices. Record your own voice for each part instead."; return; }
    const pref = v => (/en-IN/i.test(v.lang) ? 0 : /^en/i.test(v.lang) ? 1 : /^(te|hi)/i.test(v.lang) ? 2 : 3);
    const sorted = [...vs].sort((a, b) => pref(a) - pref(b) || a.name.localeCompare(b.name));
    sel.innerHTML = sorted.map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`).join("");
    if (!S.voiceURI || !vs.some(v => v.voiceURI === S.voiceURI)) S.voiceURI = sorted[0].voiceURI;
    sel.value = S.voiceURI;
    $("voiceNote").textContent = `${vs.length} voices on this device. Indian English voices are listed first.`;
  }
  fillVoices(); if (synth) synth.onvoiceschanged = fillVoices;
  $("voiceSel").onchange = e => { S.voiceURI = e.target.value; save(); };
  const bindRange = (id, key) => { const el = $(id), out = $(id + "Out"); el.value = S[key]; out.textContent = (+S[key]).toFixed(2); el.oninput = () => { S[key] = +el.value; out.textContent = (+el.value).toFixed(2); save(); }; };
  bindRange("rate", "rate"); bindRange("pitch", "pitch");
  $("useRec").checked = S.useRecordings; $("useRec").onchange = e => { S.useRecordings = e.target.checked; save(); };
  $("resetTexts").onclick = () => { if (!confirm("Reset all 10 parts to the original story text?")) return; S.texts = parts.map(p => p.text); save(); render(); };

  /* ---- AI preview ---- */
  let speakingBtn = null;
  function preview(i, btn) {
    if (!synth) return alert("No speech voices in this browser. Try Chrome, or record your own voice.");
    const was = speakingBtn === btn; synth.cancel(); stopAudio();
    if (speakingBtn) speakingBtn.textContent = "🔊 Hear AI voice"; speakingBtn = null;
    if (was) return;
    const u = new SpeechSynthesisUtterance(S.texts[i]);
    const v = synth.getVoices().find(v => v.voiceURI === S.voiceURI); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = S.rate; u.pitch = S.pitch;
    u.onend = u.onerror = () => { if (speakingBtn === btn) { btn.textContent = "🔊 Hear AI voice"; speakingBtn = null; } };
    btn.textContent = "⏹ Stop"; speakingBtn = btn; synth.speak(u);
  }

  /* ---- recording ---- */
  let rec = null, recIdx = -1, chunks = [], audio = null;
  const stopAudio = () => { if (audio) { audio.pause(); audio = null; } };
  async function toggleRecord(i) {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return alert("Recording isn't supported in this browser. Try Chrome or Edge.");
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { return alert("Microphone permission was blocked. Allow the mic for this site and try again."); }
    synth && synth.cancel(); stopAudio();
    chunks = []; recIdx = i; rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      rec = null; recIdx = -1;
      if (blob.size > 1000) { await store.putRec(i, blob); S.useRecordings = true; $("useRec").checked = true; save(); }
      render();
    };
    rec.start(); render();
  }
  async function playRec(i, btn) {
    stopAudio(); synth && synth.cancel();
    const b = await store.getRec(i); if (!b) return;
    audio = new Audio(URL.createObjectURL(b)); btn.textContent = "⏹ Stop";
    const a = audio; a.onended = () => { btn.textContent = "▶ My recording"; };
    btn.onclick = () => { a.pause(); btn.textContent = "▶ My recording"; btn.onclick = () => playRec(i, btn); };
    a.play();
  }

  /* ---- parts list ---- */
  async function render() {
    const list = $("partsList");
    const recs = await Promise.all(parts.map((_, i) => store.getRec(i)));
    list.innerHTML = "";
    parts.forEach((p, i) => {
      const card = document.createElement("article"); card.className = "part";
      const recording = recIdx === i;
      card.innerHTML = `
        <canvas width="1280" height="720"></canvas>
        <div>
          <h3><small>Part ${i + 1}</small>${p.title}</h3>
          <textarea>${S.texts[i].replace(/</g, "&lt;")}</textarea>
          <div class="tools">
            <button class="ai">🔊 Hear AI voice</button>
            <button class="rec ${recording ? "on" : ""}" ${rec && !recording ? "disabled" : ""}>${recording ? "⏹ Stop recording" : recs[i] ? "🎙️ Re-record" : "🎙️ Record my voice"}</button>
            <button class="play" ${recs[i] ? "" : "disabled"}>▶ My recording</button>
            <button class="del" ${recs[i] ? "" : "disabled"}>🗑</button>
            <span class="badge ${recs[i] && S.useRecordings ? "" : "ai"}">${recs[i] && S.useRecordings ? "Film uses: your voice" : "Film uses: AI voice"}</span>
          </div>
        </div>`;
      const ctx = card.querySelector("canvas").getContext("2d"), A = art(ctx);
      A.scenes[i](i === 5 || i === 9 ? 3 : 7); A.titleCard(i, 1); A.grain();
      card.querySelector("textarea").oninput = e => { S.texts[i] = e.target.value; save(); };
      card.querySelector(".ai").onclick = e => preview(i, e.currentTarget);
      card.querySelector(".rec").onclick = () => toggleRecord(i);
      const pb = card.querySelector(".play"); pb.onclick = () => playRec(i, pb);
      card.querySelector(".del").onclick = async () => { if (confirm(`Delete your recording for part ${i + 1}?`)) { await store.delRec(i); render(); } };
      list.appendChild(card);
    });
  }
  render();
})();
