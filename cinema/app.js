/* DevInventor Mini Cinema — all in the browser, no server needed. */
(() => {
  const $ = id => document.getElementById(id);
  const ROWS = "ABCDEF", COLS = 10;
  const state = { kind: new URLSearchParams(location.search).get("film") === "story" ? "story" : "demo", file: null, url: "", seat: null };

  /* ---------------- ticket booth ---------------- */
  // Seats: some are "taken" (same pattern each day so it feels real)
  const seed = new Date().toDateString().split("").reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7);
  let rnd = seed; const rand = () => (rnd = (rnd * 1103515245 + 12345) >>> 0) / 4294967296;
  const seatsEl = $("seats");
  [...ROWS].forEach((r, ri) => {
    const row = document.createElement("div"); row.className = "seat-row";
    row.innerHTML = `<span class="lbl">${r}</span>`;
    for (let c = 1; c <= COLS; c++) {
      if (c === 6) row.insertAdjacentHTML("beforeend", '<span class="aisle"></span>');
      const b = document.createElement("button");
      b.className = "seat"; b.title = r + c; b.dataset.seat = r + c;
      b.dataset.row = ri; b.dataset.col = c;
      if (rand() < 0.28) { b.classList.add("taken"); b.disabled = true; }
      row.appendChild(b);
    }
    seatsEl.appendChild(row);
  });
  seatsEl.addEventListener("click", e => {
    const b = e.target.closest("button.seat"); if (!b) return;
    seatsEl.querySelectorAll(".mine").forEach(s => s.classList.remove("mine"));
    b.classList.add("mine");
    state.seat = { name: b.dataset.seat, row: +b.dataset.row, col: +b.dataset.col };
    $("tSeat").textContent = state.seat.name;
    const where = state.seat.row < 2 ? "front — huge screen!" : state.seat.row < 4 ? "middle — the best view" : "back — relaxed view";
    $("seatNote").textContent = `Seat ${state.seat.name}: ${where}`;
    refresh();
  });

  const films = $("films");
  films.addEventListener("click", e => {
    const f = e.target.closest(".film"); if (!f) return;
    films.querySelectorAll(".film").forEach(x => x.classList.remove("selected"));
    f.classList.add("selected");
    state.kind = f.dataset.kind;
    $("urlBox").hidden = state.kind !== "url";
    if (state.kind === "file") $("fileInput").click();
    if (state.kind === "url") $("urlInput").focus();
    refresh();
  });
  $("fileInput").addEventListener("change", e => { state.file = e.target.files[0] || null; refresh(); });
  $("urlInput").addEventListener("input", e => { state.url = e.target.value.trim(); refresh(); });

  function filmTitle() {
    if (state.kind === "demo") return "The Little Projector";
    if (state.kind === "story") return "The Last Ticket";
    if (state.kind === "file") return state.file ? state.file.name : null;
    if (state.kind === "url") return state.url ? (ytId(state.url) ? "YouTube video" : state.url.split("/").pop().split("?")[0] || "Video link") : null;
  }
  function refresh() {
    const t = filmTitle();
    $("tFilm").textContent = t ? (t.length > 26 ? t.slice(0, 24) + "…" : t) : "—";
    $("filmNote").innerHTML = t ? `Selected: <b>${escapeHtml(t)}</b>` :
      state.kind === "file" ? "Choose a video file from your device." : "Paste a YouTube or .mp4 link above.";
    $("enterBtn").disabled = !(t && state.seat);
  }
  const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function ytId(u) {
    const m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  /* ---------------- theater ---------------- */
  const video = $("video"), yt = $("yt"), canvas = $("demoCanvas"), wrap = $("screenWrap"), hall = $("hall");
  let mode = null, curtainsOpen = false, film = null;

  // audience heads in front of you (rows in front of your seat)
  function buildRows() {
    const rows = $("rows"); rows.innerHTML = "";
    const inFront = state.seat ? state.seat.row : 3;
    for (let i = 0; i < Math.min(inFront, 3); i++) {
      const r = document.createElement("div"); r.className = "r";
      const size = 34 + i * 16;
      for (let c = 0; c < 14 - i * 2; c++) {
        const h = document.createElement("div"); h.className = "h";
        const filled = rand() < 0.6;
        h.style.cssText = `width:${size}px;height:${size * 1.1}px;opacity:${filled ? 1 : 0};margin:0 ${size * 0.35}px`;
        r.appendChild(h);
      }
      rows.appendChild(r);
    }
  }

  function setPerspective() {
    const s = state.seat || { row: 3, col: 5 };
    const scale = 1.0 - s.row * 0.07;                 // front rows: bigger screen
    const shift = (5.5 - s.col) * 1.2;                 // side seats: screen slightly off-centre
    wrap.style.setProperty("--scale", scale.toFixed(2));
    wrap.style.setProperty("--shift", shift.toFixed(1) + "vw");
  }

  $("enterBtn").addEventListener("click", enter);
  function enter() {
    $("booth").classList.remove("active"); $("theater").classList.add("active");
    setPerspective(); buildRows();
    wrap.classList.remove("open"); hall.classList.remove("dark"); curtainsOpen = false;
    [canvas, video, yt].forEach(el => el.classList.remove("on"));
    $("seek").disabled = false; $("playBtn").disabled = false;

    if (state.kind === "demo" || state.kind === "story") { mode = "canvas"; film = state.kind === "demo" ? demo : story; film.reset(); film.draw(); canvas.classList.add("on"); }
    else if (state.kind === "file") { mode = "video"; video.src = URL.createObjectURL(state.file); video.classList.add("on"); }
    else {
      const id = ytId(state.url);
      if (id) {
        mode = "yt"; yt.classList.add("on");
        yt.dataset.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
        $("seek").disabled = true; $("playBtn").disabled = true;
      } else { mode = "video"; video.src = state.url; video.classList.add("on"); }
    }
    toast(`Welcome to Hall 1 · Seat ${state.seat.name} · show starts in 3…`);
    setTimeout(startShow, 1800);
    poke();
  }

  function startShow() {
    hall.classList.add("dark");
    setTimeout(() => { wrap.classList.add("open"); curtainsOpen = true; }, 900);
    setTimeout(() => {
      if (mode === "yt") { yt.src = yt.dataset.src; toast("Use the YouTube controls on screen to play / pause"); }
      else play();
    }, 3200);
  }

  function play() {
    if (mode === "canvas") film.play();
    else if (mode === "video") video.play().catch(() => toast("Tap ▶ to start the film"));
    hall.classList.add("dark");
  }
  function pause() {
    if (mode === "canvas") film.pause();
    else if (mode === "video") video.pause();
  }
  const isPlaying = () => mode === "canvas" ? film.playing : mode === "video" ? !video.paused : false;
  function togglePlay() { if (mode === "yt") return; isPlaying() ? pause() : play(); }

  $("playBtn").onclick = togglePlay;
  $("vol").oninput = e => { video.volume = +e.target.value; demo.setVolume(+e.target.value); story.setVolume(+e.target.value); };
  $("seek").oninput = e => {
    const f = e.target.value / 1000;
    if (mode === "canvas") film.seek(f * film.duration);
    else if (mode === "video" && video.duration) video.currentTime = f * video.duration;
  };
  $("lightsBtn").onclick = () => { hall.classList.toggle("dark"); toast(hall.classList.contains("dark") ? "Lights dimmed" : "Lights on"); };
  $("popBtn").onclick = popcorn;
  $("fsBtn").onclick = () => document.fullscreenElement ? document.exitFullscreen() : $("theater").requestFullscreen?.();
  $("exitBtn").onclick = leave;
  video.addEventListener("ended", ending);
  video.addEventListener("error", () => { if (mode === "video") toast("Couldn't load this video — try another file or link"); });

  function leave() {
    pause(); yt.src = "about:blank";
    if (video.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
    video.removeAttribute("src"); video.load();
    if (document.fullscreenElement) document.exitFullscreen();
    $("theater").classList.remove("active"); $("booth").classList.add("active");
  }
  function ending() {
    wrap.classList.remove("open"); hall.classList.remove("dark");
    toast("🎬 The End — thanks for watching!");
  }

  // UI tick: time, seek bar, ambient glow, play icon
  const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const tiny = document.createElement("canvas"); tiny.width = 4; tiny.height = 2;
  const tctx = tiny.getContext("2d", { willReadFrequently: true });
  let glowFail = false, lastGlow = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    if (!$("theater").classList.contains("active")) return;
    let cur = 0, dur = 0;
    if (mode === "canvas") { cur = film.time(); dur = film.duration; }
    else if (mode === "video") { cur = video.currentTime; dur = video.duration; }
    $("time").textContent = mode === "canvas" && film.label ? film.label() : `${fmt(cur)} / ${fmt(dur)}`;
    if (dur && document.activeElement !== $("seek")) $("seek").value = (cur / dur) * 1000;
    $("playBtn").textContent = isPlaying() ? "❚❚" : "▶";

    if (t - lastGlow > 150) {
      lastGlow = t;
      const glow = $("glow");
      if (!curtainsOpen) { glow.style.background = "#311"; return; }
      if (mode === "yt" || glowFail) { glow.style.background = "radial-gradient(#4a5a9a,#1a1a40)"; return; }
      try {
        const src = mode === "canvas" ? canvas : video;
        if (mode === "video" && video.readyState < 2) return;
        tctx.drawImage(src, 0, 0, 4, 2);
        const d = tctx.getImageData(0, 0, 4, 2).data;
        const px = i => `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        glow.style.background = `linear-gradient(90deg,${px(16)},${px(20)},${px(24)},${px(28)})`;
      } catch { glowFail = true; }   // cross-origin video: can't read pixels
    }
  }
  requestAnimationFrame(tick);

  // auto-hide controls
  let idleTimer;
  function poke() {
    $("theater").classList.remove("idle"); clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (isPlaying()) $("theater").classList.add("idle"); }, 2500);
  }
  ["mousemove", "touchstart", "keydown"].forEach(ev => document.addEventListener(ev, poke));
  $("screen").addEventListener("click", togglePlay);

  document.addEventListener("keydown", e => {
    if (!$("theater").classList.contains("active") || e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); togglePlay(); }
    else if (k === "f") $("fsBtn").click();
    else if (k === "l") $("lightsBtn").click();
    else if (k === "p") popcorn();
    else if (k === "escape" && !document.fullscreenElement) leave();
  });

  function popcorn() {
    const layer = $("popLayer");
    for (let i = 0; i < 14; i++) {
      const k = document.createElement("span"); k.className = "kernel"; k.textContent = "🍿";
      k.style.left = (85 + Math.random() * 8) + "%"; k.style.top = "88%";
      k.style.setProperty("--dx", (-120 - Math.random() * 260) + "px");
      k.style.setProperty("--dy", (-120 - Math.random() * 300) + "px");
      k.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      k.style.animationDelay = (i * 0.05) + "s";
      layer.appendChild(k); setTimeout(() => k.remove(), 2200);
    }
    demo.crunch();
  }

  let toastT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); }

  /* ---------------- built-in short film (canvas + Web Audio) ---------------- */
  const demo = (() => {
    const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    const duration = 60;
    let playing = false, startAt = 0, offset = 0, ac = null, master = null, vol = 0.8, musicTimer = null, lastBeep = -1;
    const stars = Array.from({ length: 160 }, () => [Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.8 + .3, Math.random() * 6]);

    const time = () => playing ? Math.min(duration, offset + (performance.now() - startAt) / 1000) : offset;

    function audio() {
      if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); master = ac.createGain(); master.gain.value = vol * 0.25; master.connect(ac.destination); }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function tone(freq, len, type = "sine", gain = 1, when = 0) {
      const a = audio(); if (!a) return;
      const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + when;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + len);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + len + .05);
    }
    // gentle looping melody (C major pentatonic)
    const melody = [523, 659, 784, 659, 587, 523, 440, 523, 659, 784, 880, 784, 659, 587, 523, 392];
    let step = 0;
    function music() {
      const t = time(); if (!playing || t < 6 || t > duration - 2) return;
      tone(melody[step % melody.length], .5, "triangle", .5);
      if (step % 4 === 0) tone(melody[step % melody.length] / 4, 1.6, "sine", .6);
      step++;
    }

    function play() {
      if (time() >= duration) offset = 0;
      audio(); playing = true; startAt = performance.now();
      clearInterval(musicTimer); musicTimer = setInterval(music, 380);
      loop();
    }
    function pause() { offset = time(); playing = false; clearInterval(musicTimer); }
    function seek(t) { offset = Math.max(0, Math.min(duration, t)); startAt = performance.now(); lastBeep = -1; draw(); }
    function reset() { pause(); offset = 0; lastBeep = -1; step = 0; }
    function loop() {
      if (!playing) return;
      draw();
      if (time() >= duration) { pause(); ending(); return; }
      requestAnimationFrame(loop);
    }

    function grain(t) {
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .08})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      if (Math.random() < .3) { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(Math.random() * W, 0, 1.5, H); }
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.6)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    function text(s, x, y, size, color = "#fff", alpha = 1) {
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.fillStyle = color;
      ctx.font = `bold ${size}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s, x, y); ctx.globalAlpha = 1;
    }
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

    // Scene 1 (0-6s): classic countdown leader
    function leader(t) {
      const n = 5 - Math.floor(t), f = t % 1;
      ctx.fillStyle = "#cfc6b0"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#222"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.fillStyle = "rgba(60,50,40,.5)"; ctx.beginPath(); ctx.moveTo(W / 2, H / 2);
      ctx.arc(W / 2, H / 2, 600, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.fill();
      ctx.lineWidth = 8; [260, 220].forEach(r => { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); });
      if (n > 0) text(String(n), W / 2, H / 2 + 10, 300, "#111");
      if (playing && n > 0 && n !== lastBeep && f < .1) { lastBeep = n; tone(1000, .15, "sine", .6); }
    }
    // Scene 2 (6-24s): night sky, a little projector wakes up
    function night(t) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0a2a"); g.addColorStop(1, "#2a1a4a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars.forEach(([x, y, r, p]) => { ctx.globalAlpha = .5 + .5 * Math.sin(t * 2 + p); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.arc(1130, 230, 55, 0, 7); ctx.fill();
      ctx.fillStyle = "#0a0a2a"; ctx.beginPath(); ctx.arc(1152, 216, 50, 0, 7); ctx.fill();
      hills("#140d2a", 520, 40, t * 5); hills("#1d1236", 580, 30, t * 12);
      projector(t, 400, 470, t - 6);
      text("Once upon a night…", W / 2, 100, 54, "#ffe9a6", ease((t - 7) / 1.5) - ease((t - 12) / 1.5));
      text("…a little projector dreamed of the movies.", W / 2, 100, 44, "#ffe9a6", ease((t - 13) / 1.5) - ease((t - 21) / 1.5));
    }
    function hills(color, base, amp, off) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin((x + off) / 140) * amp + Math.sin((x + off) / 53) * amp * .3);
      ctx.lineTo(W, H); ctx.fill();
    }
    function projector(t, x, y, local) {
      const bob = Math.sin(t * 3) * 6;
      ctx.save(); ctx.translate(x, y + bob);
      // light beam
      const on = ease((local - 3) / 2);
      if (on > 0) {
        const bg = ctx.createLinearGradient(80, 0, 800, 0); bg.addColorStop(0, `rgba(255,240,180,${.55 * on})`); bg.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(95, -15); ctx.lineTo(820, -200 - 30 * Math.sin(t)); ctx.lineTo(820, 160); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#c33"; ctx.fillRect(-70, -45, 150, 90);                 // body
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(-35, -75, 36, 0, 7); ctx.arc(45, -75, 36, 0, 7); ctx.fill(); // reels
      ctx.strokeStyle = "#888"; ctx.lineWidth = 4;
      [[-35, -75], [45, -75]].forEach(([cx, cy]) => { for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.09; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); ctx.stroke(); } });
      ctx.fillStyle = "#222"; ctx.fillRect(80, -20, 22, 40);                 // lens
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-20, -5, 12, 0, 7); ctx.arc(30, -5, 12, 0, 7); ctx.fill(); // eyes
      const blink = (t % 4) < .15 ? .2 : 1;
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(-16, -5, 5, 6 * blink, 0, 0, 7); ctx.ellipse(34, -5, 5, 6 * blink, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(5, 15, 14, .2, Math.PI - .2); ctx.stroke(); // smile
      ctx.fillStyle = "#555"; ctx.fillRect(-55, 45, 12, 30); ctx.fillRect(55, 45, 12, 30); // legs
      ctx.restore();
    }
    // Scene 3 (24-44s): the projector's film — a sunrise with a flying rocket
    function dream(t) {
      const local = t - 24, sun = ease(local / 10);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `hsl(${220 - sun * 20},60%,${20 + sun * 45}%)`); g.addColorStop(1, `hsl(${30 + sun * 10},90%,${40 + sun * 25}%)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd34d"; ctx.beginPath(); ctx.arc(W / 2, 620 - sun * 380, 110, 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) { const cx = ((i * 330 + local * 40) % (W + 300)) - 150; cloud(cx, 120 + (i % 3) * 70); }
      hills("#2e7d4f", 560, 35, local * 30); hills("#1f5e3a", 620, 25, local * 60);
      // rocket
      const rx = -100 + ((local - 4) / 14) * (W + 200), ry = 380 - Math.sin((local - 4) / 14 * Math.PI) * 220;
      if (local > 4 && local < 18) {
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(-Math.cos((local - 4) / 14 * Math.PI) * .5);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},0,${.8 - i * .1})`; ctx.beginPath(); ctx.arc(-50 - i * 12, Math.random() * 8 - 4, 12 - i, 0, 7); ctx.fill(); }
        ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(-40, -22); ctx.lineTo(-40, 22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#b3122e"; ctx.beginPath(); ctx.moveTo(-40, -22); ctx.lineTo(-58, -36); ctx.lineTo(-30, -16); ctx.fill(); ctx.beginPath(); ctx.moveTo(-40, 22); ctx.lineTo(-58, 36); ctx.lineTo(-30, 16); ctx.fill();
        ctx.fillStyle = "#3a7bd5"; ctx.beginPath(); ctx.arc(10, 0, 9, 0, 7); ctx.fill();
        ctx.restore();
      }
      text("Every night it shows a new dream…", W / 2, 640, 46, "#fff", ease((local - 1) / 1.5) - ease((local - 8) / 1.5));
      text("…to anyone with a ticket and a seat.", W / 2, 640, 46, "#fff", ease((local - 10) / 1.5) - ease((local - 18) / 1.5));
    }
    function cloud(x, y) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); [[0, 0, 40], [40, -15, 50], [90, 0, 40], [45, 15, 40]].forEach(([dx, dy, r]) => ctx.arc(x + dx, y + dy, r, 0, 7)); ctx.fill(); }
    // Scene 4 (44-60s): credits / The End
    function credits(t) {
      const local = t - 44;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      stars.forEach(([x, y, r]) => { ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(x, y * 1.4, r, r); });
      text("The End", W / 2, H / 2 - 40, 130, "#f5c542", ease(local / 2));
      text("A DevInventor Mini Cinema short", W / 2, H / 2 + 70, 34, "#ddd", ease((local - 2) / 2));
      text("Now go pick your own film 🎬", W / 2, H / 2 + 125, 30, "#aaa", ease((local - 5) / 2));
    }

    function draw() {
      const t = time();
      if (t < 6) leader(t); else if (t < 24) night(t); else if (t < 44) dream(t); else credits(t);
      // short cross-fades between scenes
      [6, 24, 44].forEach(b => { const d = Math.abs(t - b); if (d < .5) { ctx.fillStyle = `rgba(0,0,0,${1 - d * 2})`; ctx.fillRect(0, 0, W, H); } });
      grain(t);
    }
    function setVolume(v) { vol = v; if (master) master.gain.value = v * 0.25; }
    function crunch() { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 300, .06, "square", .3, i * .07); }

    return { play, pause, seek, reset, draw, time, setVolume, crunch, duration, get playing() { return playing; } };
  })();

  const story = window.Story.Player(canvas, { onEnd: ending });
  if (state.kind === "story") { films.querySelectorAll(".film").forEach(x => x.classList.toggle("selected", x.dataset.kind === "story")); }
  refresh();
})();
