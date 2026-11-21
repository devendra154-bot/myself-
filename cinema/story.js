/* "The Last Ticket" — a 10-part narrated film for the Mini Cinema.
   Exposes window.Story = { parts, store, art(ctx), Player(canvas, opts) } */
(() => {
  const W = 1280, H = 720;

  /* ---------------- the story (10 parts) ---------------- */
  const parts = [
    { title: "Rain on the Old Sign", text: "Rain falls on the faded sign of Lakshmi Talkies. Inside, Ravi, the old projectionist, dusts two hundred empty seats, one by one. He has worked here for fifty years. Tonight, like most nights, nobody comes." },
    { title: "The Notice", text: "The owner, Mister Rao, nails a paper to the door. Closing forever, this Sunday. People watch films on their phones now, he says sadly. That night, Ravi whispers to the old projector. Only one more week, old friend." },
    { title: "The Girl Outside", text: "Every evening, ten year old Meena sells tea outside the cinema with her mother. She has never been inside. She presses her face against the glass door, staring at the posters of heroes and dancers. Ravi notices her." },
    { title: "The Last Ticket", text: "How much is a ticket? Meena asks shyly, holding out two small coins. It is not enough. Ravi opens his ticket book. Only one ticket is left. He tears it out and gives it to her. For you, free. The show starts at seven." },
    { title: "A Show for One", text: "At seven, Meena sits alone in seat D7. The lights dim. The red curtains slowly open. The projector clicks and hums, and a beam of light cuts through the dark. The screen is bigger than her whole house." },
    { title: "Magic on the Screen", text: "Heroes sing, dance and fight across the screen. Meena laughs, gasps and claps, all alone. Up in the booth, Ravi is not watching the film. He is watching her face, and he remembers being a little boy in this same hall, sixty years ago." },
    { title: "As Big as the Sky", text: "Meena runs home through the rain, shouting. Amma! The screen is as big as the sky! She tells her friends, the shopkeeper, and the bus driver. Everyone laughs. But everyone is curious." },
    { title: "One by One", text: "The next night, Meena brings her mother. The night after, five friends come. Then their parents, and their grandparents. Every evening, Ravi sees more faces at the door. And Meena makes a plan." },
    { title: "Sunday", text: "On closing day, Ravi walks in, ready to switch off the lights forever. And he stops. Every seat is full. Meena stands on the stage with a banner. Save Lakshmi Talkies. The whole village has saved the cinema, ten rupees at a time." },
    { title: "The Light Goes On", text: "With shaking hands, Ravi starts the projector. The beam of light fills the screen, and the whole hall cheers. Beside him, Meena learns to thread the film reel, the next keeper of the light. A cinema does not die when the film ends. It dies when no one is left to share it." },
  ];

  /* ---------------- storage: settings (localStorage) + recordings (IndexedDB) ---------------- */
  const KEY = "mc_story_voice";
  const store = {
    settings() {
      const d = { voiceURI: "", rate: 0.95, pitch: 1, useRecordings: true, texts: parts.map(p => p.text) };
      try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); return { ...d, ...s, texts: d.texts.map((t, i) => (s.texts && s.texts[i]) || t) }; }
      catch { return d; }
    },
    save(s) { localStorage.setItem(KEY, JSON.stringify(s)); },
    _db: null,
    db() {
      if (this._db) return this._db;
      this._db = new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error("no indexedDB"));
        const r = indexedDB.open("mc_studio", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("rec");
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return this._db;
    },
    async tx(mode, fn) {
      const db = await this.db();
      return new Promise((res, rej) => { const t = db.transaction("rec", mode); const q = fn(t.objectStore("rec")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); });
    },
    getRec(i) { return this.tx("readonly", s => s.get(i)).catch(() => null); },
    putRec(i, blob) { return this.tx("readwrite", s => s.put(blob, i)); },
    delRec(i) { return this.tx("readwrite", s => s.delete(i)); },
  };

  /* ---------------- art ---------------- */
  function art(ctx) {
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
    const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const rr = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
    const text = (s, x, y, size, c = "#fff", a = 1, font = "Georgia, serif", weight = "bold") => {
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = c; ctx.font = `${weight} ${size}px ${font}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
    };
    const grad = (stops, y0 = 0, y1 = H) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };
    const sky = stops => { ctx.fillStyle = grad(stops); ctx.fillRect(0, 0, W, H); };
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const drops = Array.from({ length: 220 }, () => [Math.random() * W, Math.random() * H, 10 + Math.random() * 14]);
    function rain(t, a = .45) {
      ctx.strokeStyle = `rgba(190,210,255,${a})`; ctx.lineWidth = 1.5; ctx.beginPath();
      drops.forEach(([x, y, l]) => { const yy = (y + t * 900 * (l / 18)) % H, xx = (x - t * 120) % W; const X = xx < 0 ? xx + W : xx; ctx.moveTo(X, yy); ctx.lineTo(X - 4, yy + l); });
      ctx.stroke();
    }

    // a person; (x,y) = feet. o: {kind:'ravi'|'meena'|'mother'|'rao'|'villager', mood, walk, arms:'down'|'up'|'clap'|'hold'|'face', t, shirt}
    function person(x, y, s, o = {}) {
      const t = o.t || 0, kid = o.kind === "meena";
      ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
      const skin = o.skin || (o.kind === "rao" ? "#b97a4e" : o.kind === "ravi" ? "#a8714a" : "#c78b5e");
      const shirt = o.shirt || { ravi: "#e8e2d0", meena: "#e0457b", mother: "#2e8b57", rao: "#5a4a8a", villager: "#c0703a" }[o.kind] || "#888";
      const w = o.walk ? Math.sin(t * 12) * 14 : 0;
      // legs / skirt
      if (kid || o.kind === "mother") {
        ctx.fillStyle = kid ? "#f3c623" : "#1f6b43";
        ctx.beginPath(); ctx.moveTo(-18, -95); ctx.lineTo(18, -95); ctx.lineTo(26, kid ? -40 : -5); ctx.lineTo(-26, kid ? -40 : -5); ctx.fill();
        if (kid) { ctx.fillStyle = skin; ctx.fillRect(-12 + w * .5, -40, 8, 40); ctx.fillRect(4 - w * .5, -40, 8, 40); }
      } else {
        ctx.fillStyle = o.kind === "ravi" ? "#f2efe6" : "#333";
        ctx.save(); ctx.translate(-8, -60); ctx.rotate(w / 60); ctx.fillRect(-6, 0, 12, 60); ctx.restore();
        ctx.save(); ctx.translate(8, -60); ctx.rotate(-w / 60); ctx.fillRect(-6, 0, 12, 60); ctx.restore();
      }
      // body
      rr(-22, -135, 44, 80, 14, shirt);
      if (o.kind === "mother") { ctx.fillStyle = "#e6b422"; ctx.beginPath(); ctx.moveTo(-22, -130); ctx.lineTo(22, -60); ctx.lineTo(10, -60); ctx.lineTo(-22, -110); ctx.fill(); }
      // arms
      ctx.strokeStyle = shirt; ctx.lineWidth = 11; ctx.lineCap = "round";
      const arm = (side, ang, len = 50) => {
        const sx = side * 20, sy = -125; ctx.strokeStyle = shirt; ctx.beginPath(); ctx.moveTo(sx, sy);
        const ex = sx + Math.sin(ang) * len * side, ey = sy + Math.cos(ang) * len; ctx.lineTo(ex, ey); ctx.stroke(); circ(ex, ey, 6, skin); return [ex, ey];
      };
      const a = o.arms || "down";
      if (a === "down") { arm(-1, .15 + w / 80); arm(1, .15 - w / 80); }
      else if (a === "up") { arm(-1, 2.6 + Math.sin(t * 6) * .2); arm(1, 2.6 + Math.cos(t * 6) * .2); }
      else if (a === "clap") { const c = Math.abs(Math.sin(t * 7)); arm(-1, 2.0 - c * .5, 40); arm(1, 2.0 - c * .5, 40); }
      else if (a === "hold") { arm(-1, 2.9, 55); arm(1, 2.9, 55); }
      else if (a === "front") { arm(-1, 1.3, 45); arm(1, 1.3, 45); }
      else if (a === "face") { arm(-1, .15); arm(1, 2.75, 42); }
      else if (a === "broom") { const sw = Math.sin(t * 3) * .4; arm(-1, .9 + sw, 45); arm(1, .7 + sw, 45);
        ctx.strokeStyle = "#7a5a2a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, -140); ctx.lineTo(30 + sw * 40, 0); ctx.stroke(); rr(15 + sw * 40, -8, 34, 10, 3, "#c9a24a"); }
      // head
      const hy = -160; circ(0, hy, 24, skin);
      if (o.kind === "ravi") { ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.arc(0, hy - 4, 25, Math.PI * .95, Math.PI * 2.05); ctx.lineTo(25, hy + 4); ctx.arc(0, hy - 2, 21, Math.PI * 2, Math.PI, true); ctx.fill();
        ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.strokeRect(-15, hy - 4, 11, 8); ctx.strokeRect(4, hy - 4, 11, 8); ctx.beginPath(); ctx.moveTo(-4, hy); ctx.lineTo(4, hy); ctx.stroke();
        rr(-10, hy + 8, 20, 4, 2, "#ddd"); }
      if (o.kind === "rao") { circ(-23, hy - 6, 8, "#555"); circ(23, hy - 6, 8, "#555"); rr(-12, hy + 7, 24, 5, 3, "#222"); }
      if (o.kind === "meena") { ctx.fillStyle = "#1a1010"; ctx.beginPath(); ctx.arc(0, hy - 3, 25, Math.PI, 0); ctx.fill();
        circ(-28, hy + 6, 9, "#1a1010"); circ(28, hy + 6, 9, "#1a1010"); circ(-27, hy - 4, 5, "#e0457b"); circ(27, hy - 4, 5, "#e0457b"); }
      if (o.kind === "mother") { ctx.fillStyle = "#1a1010"; ctx.beginPath(); ctx.arc(0, hy - 3, 25, Math.PI, 0); ctx.fill(); circ(0, hy - 28, 10, "#1a1010"); circ(0, hy - 6, 3, "#c0392b"); }
      if (o.kind === "villager") { ctx.fillStyle = "#2a1a10"; ctx.beginPath(); ctx.arc(0, hy - 3, 25, Math.PI, 0); ctx.fill(); }
      // face
      if (o.kind !== "ravi") { circ(-8, hy, 2.6, "#111"); circ(8, hy, 2.6, "#111"); } else { circ(-9, hy, 2, "#111"); circ(9, hy, 2, "#111"); }
      ctx.strokeStyle = "#5a2a1a"; ctx.lineWidth = 2.2; ctx.beginPath();
      if (o.mood === "sad") ctx.arc(0, hy + 18, 7, Math.PI * 1.2, Math.PI * 1.8); else if (o.mood === "wow") { circ(0, hy + 11, 4, "#5a2a1a"); } else ctx.arc(0, hy + 8, 8, .25, Math.PI - .25);
      ctx.stroke();
      ctx.restore();
    }

    function cinemaFront(cx, base, s, signOn, t) {
      ctx.save(); ctx.translate(cx, base); ctx.scale(s, s);
      rr(-360, -440, 720, 440, 4, "#7d5f45");
      ctx.fillStyle = "#6a503a"; ctx.beginPath(); ctx.moveTo(-120, -440); ctx.lineTo(0, -520); ctx.lineTo(120, -440); ctx.fill();
      for (let i = -3; i <= 3; i++) rr(i * 100 - 6, -440, 12, 440, 2, "#6e543d");
      // sign
      rr(-250, -400, 500, 90, 10, "#2a0f14");
      ctx.strokeStyle = "#f5c542"; ctx.lineWidth = 4; ctx.strokeRect(-246, -396, 492, 82);
      const flick = signOn * (Math.sin(t * 23) > -0.7 ? 1 : .25);
      for (let i = 0; i < 22; i++) { circ(-235 + i * 22.4, -392, 4, flick > .5 ? "#ffe9a6" : "#5a4a2a"); circ(-235 + i * 22.4, -318, 4, flick > .5 ? "#ffe9a6" : "#5a4a2a"); }
      text("LAKSHMI TALKIES", 0, -355, 52, flick > .5 ? "#f5c542" : "#6a5a3a");
      // posters
      [[-300, "#b3122e"], [190, "#1d5fa8"]].forEach(([px, c]) => { rr(px, -280, 110, 160, 4, "#f2e6c8"); rr(px + 6, -274, 98, 148, 3, c); circ(px + 55, -225, 18, "#f2c6a0"); rr(px + 35, -205, 40, 60, 8, "#222"); text("HERO", px + 55, -140, 18, "#ffe9a6"); });
      // doors
      rr(-130, -260, 260, 260, 4, "#3a2a20");
      for (const dx of [-122, 4]) { const g = ctx.createLinearGradient(dx, -250, dx + 118, -10); g.addColorStop(0, "#ffd98a"); g.addColorStop(1, "#7a5a30"); ctx.fillStyle = g; ctx.fillRect(dx, -250, 118, 244); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.moveTo(dx + 20, -250); ctx.lineTo(dx + 50, -250); ctx.lineTo(dx + 10, -6); ctx.lineTo(dx, -6); ctx.fill(); }
      rr(-180, -8, 360, 14, 2, "#5a5050");
      ctx.restore();
    }

    function bwFilm(t, x, y, w, h, color) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      const f = 0.85 + Math.random() * .15;
      ctx.fillStyle = color ? `hsl(${(t * 20) % 360},55%,${45 * f}%)` : `rgb(${150 * f},${150 * f},${145 * f})`; ctx.fillRect(x, y, w, h);
      const fg = color ? "#1a1030" : "#1a1a1a";
      ctx.fillStyle = color ? "rgba(255,240,180,.5)" : "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.arc(x + w * .78, y + h * .25, h * .12, 0, 7); ctx.fill();
      ctx.fillStyle = fg; ctx.fillRect(x, y + h * .82, w, h * .18);
      for (let k = 0; k < 2; k++) { // dancers
        const dx = x + w * (.35 + k * .3) + Math.sin(t * 2 + k * 3) * w * .08, dy = y + h * .82, sc = h / 300, jump = Math.abs(Math.sin(t * 4 + k)) * 18 * sc;
        ctx.save(); ctx.translate(dx, dy - jump); ctx.scale(sc, sc); ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineWidth = 10; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, -150, 18, 0, 7); ctx.fill(); ctx.fillRect(-14, -130, 28, 70);
        const a = Math.sin(t * 6 + k * 2);
        ctx.beginPath(); ctx.moveTo(-12, -125); ctx.lineTo(-45, -150 + a * 40); ctx.moveTo(12, -125); ctx.lineTo(45, -150 - a * 40);
        ctx.moveTo(-8, -62); ctx.lineTo(-25 - a * 15, 0); ctx.moveTo(8, -62); ctx.lineTo(25 + a * 15, 0); ctx.stroke(); ctx.restore();
      }
      for (let i = 0; i < 3; i++) if (Math.random() < .4) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x + Math.random() * w, y, 1.5, h); }
      ctx.restore();
    }

    // hall seen from the back. filled(r,c) -> null | 'meena' | 'head'
    function hall(t, o) {
      const lit = o.houseLights ?? .15;
      sky(["#2a0e18", "#12060b"]);
      const sx = 330, sy = 70, sw = 620, sh = 300;
      rr(sx - 30, sy - 40, sw + 60, sh + 70, 6, "#3a1520");
      if (o.screen) o.screen(sx, sy, sw, sh); else { ctx.fillStyle = "#d8d4cc"; ctx.fillRect(sx, sy, sw, sh); }
      const c = o.curtain ?? 1; // 1 = open
      ctx.fillStyle = "#8d0e25";
      for (const side of [0, 1]) { const cw = sw / 2 * (1 - c * .92) + 18; const x0 = side ? sx + sw + 18 - cw : sx - 18;
        ctx.fillRect(x0, sy - 30, cw, sh + 50); ctx.fillStyle = "rgba(0,0,0,.2)"; for (let i = 0; i < cw; i += 18) ctx.fillRect(x0 + i, sy - 30, 6, sh + 50); ctx.fillStyle = "#8d0e25"; }
      rr(sx - 40, sy - 44, sw + 80, 26, 6, "#6e0a1c");
      if (o.stage) o.stage(sx, sy, sw, sh);
      if (o.beam) { const g = ctx.createLinearGradient(0, H, 0, sy); g.addColorStop(0, "rgba(255,245,200,0)"); g.addColorStop(1, `rgba(255,245,200,${.18 * o.beam})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(620, H + 40); ctx.lineTo(660, H + 40); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx, sy); ctx.lineTo(sx, sy + sh); ctx.fill();
        for (let i = 0; i < 30; i++) { const px = (i * 97 + t * 15) % sw + sx, py = sy + sh + ((i * 53 + t * 8) % (H - sy - sh)); circ(px, py, 1.3, `rgba(255,255,230,${.3 * o.beam})`); } }
      // rows (back of seats, perspective)
      const ROWS = 6;
      for (let r = 0; r < ROWS; r++) {
        const k = r / (ROWS - 1), y = 430 + k * 250, size = 26 + k * 34, n = 16 - Math.round(k * 6), gap = size * 1.25, x0 = W / 2 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) {
          const x = x0 + i * gap;
          const who = o.filled ? o.filled(r, i, n) : null;
          if (who) {
            const bob = o.cheer ? Math.abs(Math.sin(t * 6 + i + r)) * size * .25 : 0;
            if (who === "meena") { circ(x, y - size * .55 - bob, size * .5, "#1a1010"); circ(x - size * .55, y - size * .45 - bob, size * .2, "#1a1010"); circ(x + size * .55, y - size * .45 - bob, size * .2, "#1a1010"); circ(x - size * .5, y - size * .62 - bob, size * .1, "#e0457b"); circ(x + size * .5, y - size * .62 - bob, size * .1, "#e0457b"); }
            else { const hc = ["#1a1010", "#2a1a10", "#3a2a20", "#ddd", "#111"][(r * 7 + i * 3) % 5]; circ(x, y - size * .55 - bob, size * .46, hc);
              if (o.cheer && (r + i) % 3 === 0) { ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = size * .14; ctx.beginPath(); ctx.moveTo(x - size * .4, y - size * .4); ctx.lineTo(x - size * .6, y - size * 1.2 - bob); ctx.stroke(); } }
          }
          rr(x - size * .55, y - size * .3, size * 1.1, size * .9, size * .2, `rgb(${70 + lit * 60},${18 + lit * 30},${30 + lit * 30})`);
        }
      }
      if (lit > .3) { ctx.fillStyle = `rgba(255,220,150,${(lit - .3) * .15})`; ctx.fillRect(0, 0, W, H); }
    }

    // projection booth, looking out of the window at the hall
    function booth(t, withMeena) {
      sky(["#1c1210", "#0c0806"]);
      rr(560, 120, 640, 330, 8, "#05030a");
      bwFilm(t, 760, 170, 360, 200, withMeena);
      ctx.fillStyle = "rgba(255,245,200,.12)"; ctx.beginPath(); ctx.moveTo(470, 300); ctx.lineTo(760, 170); ctx.lineTo(760, 370); ctx.fill();
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) circ(600 + i * 50 + (r % 2) * 25, 430 - r * 22, 12, "#120a08");
      ctx.strokeStyle = "#3a2a20"; ctx.lineWidth = 14; ctx.strokeRect(560, 120, 640, 330);
      // projector
      ctx.save(); ctx.translate(380, 330);
      rr(-80, -50, 170, 100, 10, "#4a4a52"); rr(90, -20, 30, 40, 4, "#222"); circ(118, 0, 10, "#fff6c8");
      for (const [cx, cy] of [[-40, -95], [50, -95]]) { circ(cx, cy, 45, "#2a2a2e"); ctx.strokeStyle = "#888"; ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.09; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38); ctx.stroke(); } circ(cx, cy, 6, "#aaa"); }
      ctx.strokeStyle = "#222"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, -50); ctx.lineTo(-40, -140); ctx.moveTo(50, -50); ctx.lineTo(50, -140); ctx.stroke();
      ctx.fillStyle = "#3a3a40"; ctx.fillRect(-60, 50, 20, 200); ctx.fillRect(50, 50, 20, 200);
      ctx.restore();
      person(240, 780, 2.2, { kind: "ravi", t, arms: withMeena ? "front" : "down" });
      if (withMeena) person(470, 760, 1.6, { kind: "meena", t, arms: "front", mood: "wow" });
      const fl = .06 + Math.random() * .04; ctx.fillStyle = `rgba(255,240,190,${fl})`; ctx.fillRect(0, 0, W, H);
    }

    function village(t, scroll) {
      sky(["#20304f", "#4a3a5f", "#7a5a6a"]);
      for (let i = -1; i < 9; i++) { const x = ((i * 170 - scroll * .5) % 1530 + 1530) % 1530 - 170;
        const hh = 140 + (i * 37 % 60), col = ["#8a5a4a", "#5a6a8a", "#9a7a4a", "#6a8a6a"][((i % 4) + 4) % 4];
        rr(x, 520 - hh, 150, hh, 2, col); ctx.fillStyle = "#3a2a2a"; ctx.beginPath(); ctx.moveTo(x - 10, 520 - hh); ctx.lineTo(x + 75, 470 - hh); ctx.lineTo(x + 160, 520 - hh); ctx.fill();
        rr(x + 25, 540 - hh, 30, 30, 2, "#ffd98a"); rr(x + 95, 540 - hh, 30, 30, 2, "#ffd98a"); rr(x + 60, 450, 32, 70, 2, "#3a2a20"); }
      ctx.fillStyle = "#2a2a35"; ctx.fillRect(0, 520, W, H - 520);
      ctx.fillStyle = "rgba(255,220,150,.08)"; for (let i = 0; i < 8; i++) ctx.fillRect(((i * 200 - scroll) % W + W) % W, 560 + (i % 3) * 40, 120, 6);
    }

    function bubble(x, y, s) {
      ctx.font = "bold 34px Georgia, serif"; const w = ctx.measureText(s).width + 40;
      rr(x - w / 2, y - 40, w, 64, 20, "#fff"); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(x - 10, y + 22); ctx.lineTo(x + 10, y + 22); ctx.lineTo(x - 20, y + 50); ctx.fill();
      text(s, x, y - 8, 34, "#222");
    }

    /* scenes: (t = seconds since the part began) */
    const scenes = [
      t => { // 1 rain on the old sign
        sky(["#0b1024", "#1b1a33", "#2a2238"]);
        for (let i = 0; i < 10; i++) rr(i * 140 - 20, 300 - (i * 53 % 90), 120, 400, 2, "#141428");
        cinemaFront(640, 640, 1.05, 1, t);
        ctx.fillStyle = "#1a1a24"; ctx.fillRect(0, 640, W, 80);
        ctx.fillStyle = "rgba(245,197,66,.12)"; ctx.fillRect(390, 650, 500, 40);
        person(640, 636, .8, { kind: "ravi", t, arms: "broom" });
        rain(t);
      },
      t => { // 2 the notice
        sky(["#3a2a1a", "#2a1c10"]);
        const shake = t < 1.6 ? Math.sin(t * 40) * 3 * (1.6 - t) : 0;
        ctx.save(); ctx.translate(shake, 0);
        rr(340, 0, 600, 720, 0, "#5a3a22"); for (let i = 0; i < 6; i++) rr(350 + i * 100, 0, 6, 720, 0, "#4a2e1a");
        ctx.save(); ctx.translate(640, 250); ctx.rotate(-.04); rr(-170, -150, 340, 300, 4, "#f4ecd6");
        text("NOTICE", 0, -95, 52, "#b3122e"); text("Closing forever", 0, -20, 38, "#222"); text("this Sunday", 0, 30, 38, "#222"); text("— Management", 40, 100, 22, "#555", 1, "Georgia, serif", "italic");
        circ(0, -135, 6, "#777"); ctx.restore(); ctx.restore();
        person(200, 980, 2.4, { kind: "rao", t, arms: t < 1.6 ? "up" : "down", mood: "sad" });
        person(1090, 980, 2.4, { kind: "ravi", t, arms: "face", mood: "sad", flip: true });
      },
      t => { // 3 the girl outside
        sky(["#3a2a5a", "#c0606a", "#f0a060"]);
        cinemaFront(760, 640, .95, .7, t);
        ctx.fillStyle = "#3a3038"; ctx.fillRect(0, 640, W, 80);
        rr(60, 520, 220, 18, 3, "#6a4a2a"); rr(80, 538, 12, 100, 0, "#5a3a1a"); rr(250, 538, 12, 100, 0, "#5a3a1a");
        rr(110, 470, 50, 50, 10, "#aaa"); rr(155, 485, 22, 8, 3, "#999");
        for (let i = 0; i < 4; i++) { const y = 460 - ((t * 30 + i * 25) % 100); circ(135 + Math.sin(t * 2 + i) * 8, y, 8 + i * 2, `rgba(255,255,255,${.4 - ((t * 30 + i * 25) % 100) / 300})`); }
        [200, 225].forEach(x => rr(x, 500, 16, 20, 3, "#f2efe6"));
        person(170, 640, 1, { kind: "mother", t });
        const lean = Math.sin(t * 1.5) * 2;
        person(700 + lean, 632, .95, { kind: "meena", t, arms: "front", mood: "wow" });
        if (t > 6) person(830, 632, .9, { kind: "ravi", t, flip: true });
      },
      t => { // 4 the last ticket
        sky(["#3a2416", "#22140b"]);
        rr(0, 300, W, 420, 0, "#6a4424");
        // book
        rr(420, 330, 260, 160, 6, "#c9b48a"); for (let i = 0; i < 5; i++) rr(424 + i, 334 + i, 252, 152, 6, i % 2 ? "#e9dcb8" : "#d9cca8");
        const tear = ease((t - 4) / 2), tx = 430 + tear * 330, ty = 340 - tear * 70;
        ctx.save(); ctx.translate(tx + 120, ty + 70); ctx.rotate(tear * .18);
        rr(-120, -70, 240, 140, 8, "#f6ead0"); ctx.strokeStyle = "#b3122e"; ctx.lineWidth = 4; ctx.strokeRect(-110, -60, 220, 120);
        text("LAKSHMI TALKIES", 0, -32, 22, "#b3122e"); text("ADMIT ONE", 0, 8, 34, "#222"); text("No. 0200 · 7:00 PM", 0, 42, 16, "#555", 1, "Courier New, monospace");
        ctx.restore();
        // Ravi's hand (left) and Meena's hand with coins (right)
        ctx.strokeStyle = "#e8e2d0"; ctx.lineWidth = 46; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-40, 620); ctx.lineTo(300 + tear * 330, 480 - tear * 60); ctx.stroke(); circ(310 + tear * 330, 475 - tear * 60, 30, "#a8714a");
        const reach = ease((t - 6) / 2);
        ctx.strokeStyle = "#e0457b"; ctx.beginPath(); ctx.moveTo(1320, 640); ctx.lineTo(1020 - reach * 40, 540); ctx.stroke(); circ(1000 - reach * 40, 535, 28, "#c78b5e");
        circ(990 - reach * 40, 515, 11, "#d4a017"); circ(1012 - reach * 40, 520, 11, "#c0c0c0");
        if (t < 4) text("“How much is a ticket?”", W / 2, 140, 46, "#ffe9a6", ease(t - .5));
        else text("“For you, free.”", W / 2, 140, 46, "#ffe9a6", ease(t - 6));
      },
      t => { // 5 a show for one
        const c = ease((t - 2) / 4);
        hall(t, { houseLights: .6 - ease((t - .5) / 2) * .5, curtain: c, beam: c, screen: (x, y, w, h) => c > .05 ? bwFilm(t, x, y, w, h) : (ctx.fillStyle = "#222", ctx.fillRect(x, y, w, h)),
          filled: (r, i, n) => r === 3 && i === Math.floor(n / 2) ? "meena" : null });
      },
      t => { // 6 magic on the screen
        if (t < 9) {
          sky(["#050308", "#000"]);
          bwFilm(t, 90, 30, 1100, 520);
          ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(0, 0, W, H);
          ctx.save(); ctx.translate(640, 760);
          circ(0, -150, 70, "#0a0606"); circ(-80, -130, 26, "#0a0606"); circ(80, -130, 26, "#0a0606");
          rr(-110, -90, 220, 200, 50, "#0a0606");
          const c = Math.abs(Math.sin(t * 7)) * 40; circ(-60 + c, -190, 20, "#120a0a"); circ(60 - c, -190, 20, "#120a0a");
          ctx.restore();
        } else booth(t, false);
      },
      t => { // 7 as big as the sky
        const sc = t * 160; village(t, sc);
        person(380, 620, 1.1, { kind: "villager", t, shirt: "#3a6ab0", arms: "front" });
        person(1080, 620, 1.1, { kind: "villager", t, shirt: "#a03a3a", flip: true });
        const x = 140 + ((t * 120) % 1100);
        person(x, 650, 1.15, { kind: "meena", t, walk: true, arms: "up", mood: "wow" });
        circ(x - 30, 655, 10 + Math.abs(Math.sin(t * 12)) * 8, "rgba(180,200,255,.35)");
        if (t < 8) bubble(Math.min(Math.max(x, 280), 1000), 330, "Amma! As big as the sky!");
        rain(t, .35);
      },
      t => { // 8 one by one
        const order = []; seed = 42; for (let r = 0; r < 6; r++) for (let i = 0; i < 16; i++) order.push([r, i, rnd()]);
        order.sort((a, b) => a[2] - b[2]);
        const count = Math.floor(ease(t / 16) * order.length * .85) + 1, set = new Set(order.slice(0, count).map(([r, i]) => r + ":" + i));
        hall(t, { houseLights: .25, beam: 1, screen: (x, y, w, h) => bwFilm(t, x, y, w, h), filled: (r, i, n) => r === 3 && i === Math.floor(n / 2) ? "meena" : set.has(r + ":" + i) ? "head" : null });
        const night = 1 + Math.min(6, Math.floor(t / 2.8));
        rr(W - 220, 24, 180, 60, 30, "rgba(0,0,0,.6)"); text(`Night ${night}`, W - 130, 55, 32, "#f5c542");
      },
      t => { // 9 sunday
        hall(t, { houseLights: .8, curtain: 0, beam: 0, filled: () => "head",
          stage: (x, y, w, h) => {
            person(640, y + h + 20, 1.1, { kind: "meena", t, arms: "hold" });
            const by = y + h - 210; rr(410, by, 460, 70, 6, "#fff8e0"); ctx.strokeStyle = "#b3122e"; ctx.lineWidth = 4; ctx.strokeRect(416, by + 6, 448, 58);
            text("SAVE LAKSHMI TALKIES", 640, by + 36, 28, "#b3122e");
          } });
        for (let i = 0; i < 26; i++) { const y = ((t * 140 + i * 97) % 760) - 40, x = (i * 151) % W; circ(x, y, 8, i % 2 ? "#d4a017" : "#c0c0c0"); }
        person(1150, 1000, 2.6, { kind: "ravi", t, arms: "face", mood: "wow", flip: true });
      },
      t => { // 10 the light goes on
        if (t < 8) hall(t, { houseLights: .1, beam: ease(t / 2), cheer: true, screen: (x, y, w, h) => bwFilm(t, x, y, w, h, true), filled: () => "head" });
        else booth(t, true);
      },
    ];

    function endCard(t) {
      sky(["#000", "#000"]);
      text("A cinema does not die when the film ends.", W / 2, 250, 40, "#eee", ease(t / 1.5), "Georgia, serif", "italic");
      text("It dies when no one is left to share it.", W / 2, 310, 40, "#eee", ease((t - 1) / 1.5), "Georgia, serif", "italic");
      text("THE END", W / 2, 440, 96, "#f5c542", ease((t - 2.5) / 1.5));
      text("The Last Ticket · a DevInventor Mini Cinema film", W / 2, 540, 26, "#aaa", ease((t - 3.5) / 1.5), "system-ui, sans-serif", "normal");
    }

    function titleCard(i, t) {
      const a = ease(t / .6) - ease((t - 3) / .8); if (a <= 0) return;
      ctx.globalAlpha = a; rr(30, 24, 460, 64, 32, "rgba(0,0,0,.6)"); ctx.globalAlpha = 1;
      text(`Part ${i + 1} · ${parts[i].title}`, 260, 57, 28, "#f5c542", a);
    }

    function subtitle(s) {
      if (!s) return;
      ctx.font = "600 30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const words = s.split(" "), lines = []; let line = "";
      words.forEach(w => { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > 1060) { lines.push(line); line = w; } else line = test; });
      lines.push(line);
      const y0 = H - 30 - lines.length * 40;
      lines.forEach((l, k) => { const w = ctx.measureText(l).width + 28; rr(W / 2 - w / 2, y0 + k * 40 - 18, w, 38, 6, "rgba(0,0,0,.7)"); ctx.fillStyle = "#fff"; ctx.fillText(l, W / 2, y0 + k * 40 + 1); });
    }

    function grain() {
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    return { scenes, endCard, titleCard, subtitle, grain };
  }

  /* ---------------- player ---------------- */
  const sentences = s => (s.match(/[^.!?]+[.!?]*/g) || [s]).map(x => x.trim()).filter(Boolean);
  const est = (s, rate) => Math.max(1.6, s.split(/\s+/).length / (2.6 * rate)) + .25;

  function Player(canvas, opts = {}) {
    const ctx = canvas.getContext("2d"), A = art(ctx), synth = window.speechSynthesis;
    let S = store.settings(), recs = [];
    let idx = 0, local = 0, resumedAt = 0, playing = false, ended = false;
    let narr = null;       // {sents, si, siStart, done, doneAt, audio, total}
    let vol = 0.8, ac = null, master = null, musicTimer = null, step = 0;
    const END = 10, END_LEN = 7;

    const now = () => playing ? local + (performance.now() - resumedAt) / 1000 : local;
    const voice = () => { const vs = synth ? synth.getVoices() : []; return vs.find(v => v.voiceURI === S.voiceURI) || vs.find(v => /en-IN/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0]; };

    async function load() {
      S = store.settings();
      recs = await Promise.all(parts.map((_, i) => S.useRecordings ? store.getRec(i) : null));
    }

    function music() {
      if (!playing || idx >= END) return;
      const notes = [262, 330, 392, 330, 294, 262, 220, 262];
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime, f = notes[step++ % notes.length] * (idx >= 8 ? 1.5 : 1);
      o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.35, t0 + .05); g.gain.exponentialRampToValueAtTime(.001, t0 + 1.4);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 1.5);
    }
    function audioOn() {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!ac) { ac = new AC(); master = ac.createGain(); master.connect(ac.destination); }
      master.gain.value = vol * .06; if (ac.state === "suspended") ac.resume();
      clearInterval(musicTimer); musicTimer = setInterval(music, 700);
    }

    function stopNarration() {
      if (synth) synth.cancel();
      if (narr && narr.audio) { narr.audio.pause(); }
    }

    function startPart(i) {
      stopNarration(); idx = i; local = 0; resumedAt = performance.now(); ended = false;
      if (i >= END) { narr = null; return; }
      const text = S.texts[i] || parts[i].text, sents = sentences(text);
      narr = { sents, si: 0, siStart: 0, done: false, doneAt: 0, total: sents.reduce((a, s) => a + est(s, S.rate), 0) };
      if (recs[i]) {
        const a = new Audio(URL.createObjectURL(recs[i])); a.volume = vol; narr.audio = a;
        a.onloadedmetadata = () => { if (isFinite(a.duration)) narr.total = a.duration; };
        a.onended = () => finish(); a.onerror = () => { narr.audio = null; speak(); };
        if (playing) a.play().catch(() => { narr.audio = null; speak(); });
      } else if (playing) speak();
    }
    function finish() { if (narr && !narr.done) { narr.done = true; narr.doneAt = now(); } }
    function speak() {
      if (!narr) return;
      if (!synth || !voice()) { narr.fallback = true; narr.siStart = now(); return; } // timer-driven if no voices
      narr.siStart = now();
      const s = narr.sents[narr.si], u = new SpeechSynthesisUtterance(s), myIdx = idx, mySi = narr.si;
      u.voice = voice(); u.lang = u.voice.lang; u.rate = S.rate; u.pitch = S.pitch; u.volume = vol;
      u.onend = () => { if (!playing || idx !== myIdx || !narr || narr.si !== mySi) return; nextSentence(); };
      narr.watch = now() + est(s, S.rate) * 2 + 3;
      synth.speak(u);
    }
    function nextSentence() {
      narr.si++;
      if (narr.si >= narr.sents.length) { narr.si = narr.sents.length - 1; finish(); } else speak();
    }

    function update() {
      const t = now();
      if (!playing) return;
      if (idx >= END) { if (t > END_LEN) { pause(); ended = true; opts.onEnd && opts.onEnd(); } return; }
      if (narr && !narr.done && !narr.audio) {
        const s = narr.sents[narr.si];
        if (narr.fallback && t - narr.siStart > est(s, S.rate)) { narr.si++; narr.siStart = t; if (narr.si >= narr.sents.length) { narr.si--; finish(); } }
        else if (!narr.fallback && narr.watch && t > narr.watch) { if (synth) synth.cancel(); nextSentence(); }  // safety if onend never fires
      }
      if (narr && narr.done && t - narr.doneAt > 1.6) startPart(idx + 1);
    }

    function currentSubtitle() {
      if (!narr) return "";
      if (narr.audio) { const d = narr.audio.duration || narr.total, f = d ? narr.audio.currentTime / d : 0; let acc = 0, tot = narr.sents.reduce((a, s) => a + s.length, 0);
        for (const s of narr.sents) { acc += s.length; if (f <= acc / tot) return s; } return narr.sents[narr.sents.length - 1]; }
      return narr.done && now() - narr.doneAt > 1 ? "" : narr.sents[narr.si];
    }

    function draw() {
      update();
      const t = now();
      if (idx >= END) A.endCard(t);
      else { A.scenes[idx](t); A.titleCard(idx, t); A.subtitle(currentSubtitle()); }
      A.grain();
    }

    function pause() { local = now(); playing = false; clearInterval(musicTimer); if (synth) synth.cancel(); if (narr && narr.audio) narr.audio.pause(); }

    let raf = 0;
    function loop() { draw(); if (playing) raf = requestAnimationFrame(loop); }

    return {
      duration: END,
      get playing() { return playing; },
      async play() {
        if (ended || (idx >= END && now() > END_LEN)) { idx = 0; ended = false; }
        await load();
        audioOn(); playing = true; resumedAt = performance.now();
        if (!narr && idx < END) startPart(idx);
        else if (narr && !narr.done) {
          if (narr.audio) narr.audio.play().catch(() => {});
          else { local = narr.siStart; resumedAt = performance.now(); speak(); }    // restart the current sentence
        }
        cancelAnimationFrame(raf); loop();
      },
      pause,
      seek(t) { const i = Math.max(0, Math.min(END - 1, Math.floor(t))); startPart(i); draw(); },
      reset() { pause(); idx = 0; narr = null; local = 0; ended = false; },
      draw,
      time() { if (idx >= END) return END - .01; if (!narr) return idx; const f = narr.audio ? (narr.audio.currentTime / (narr.audio.duration || narr.total || 1)) : Math.min(.98, now() / (narr.total || 1)); return idx + Math.min(.98, f || 0); },
      label() { return idx >= END ? "The End" : `Part ${idx + 1} / 10`; },
      setVolume(v) { vol = v; if (master) master.gain.value = v * .06; if (narr && narr.audio) narr.audio.volume = v; },
      crunch() {},
    };
  }

  window.Story = { parts, store, art, Player };
})();
