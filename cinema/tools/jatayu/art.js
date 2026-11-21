/* "Jatayu's Last Flight" — vertical (720x1280) cartoon short. Ravana is a cartoon of the viewer (curly hair, glasses). */
(() => {
  const W = 720, H = 1280;
  function make(ctx) {
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
    const lerp = (a, b, k) => a + (b - a) * k;
    const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); };
    const ell = (x, y, rx, ry, rot, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill(); };
    const rr = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
    const text = (s, x, y, size, c, a = 1, font = "Georgia, serif", weight = "bold", stroke) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (stroke) { ctx.lineWidth = size / 7; ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
      ctx.fillStyle = c; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
    };

    /* ---------- backgrounds ---------- */
    function sky(t, mood = 0) { // mood 0 sunset, 1 battle red
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mood ? "#3a1020" : "#2a3c7a"); g.addColorStop(.45, mood ? "#a0302a" : "#e0785a"); g.addColorStop(.75, mood ? "#e07030" : "#ffc070"); g.addColorStop(1, mood ? "#f0a050" : "#ffe0a0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const sg = ctx.createRadialGradient(520, 760, 10, 520, 760, 420); sg.addColorStop(0, "rgba(255,250,210,.95)"); sg.addColorStop(.15, "rgba(255,230,150,.6)"); sg.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    const cloudsSeed = Array.from({ length: 14 }, (_, i) => [Math.random() * 1.4, i / 14, 50 + Math.random() * 70, .3 + Math.random() * .7]);
    function clouds(t, speed = 60, layer = 0, alpha = .9) {
      cloudsSeed.forEach(([x, y, r, d], i) => {
        if (i % 2 !== layer) return;
        const X = ((x * W * 1.4 - t * speed * d) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * .2;
        const Y = layer ? 120 + y * 700 : 980 + (y * 7 % 1) * 260;
        const R = layer ? r * .8 : r * 1.1;
        ctx.globalAlpha = alpha * (layer ? .55 : .8);
        ctx.fillStyle = "#fff1e6"; ctx.beginPath();
        [[0, 0, 1], [-.75, .25, .65], [.8, .25, .7], [.3, -.35, .7], [-.35, -.25, .6]].forEach(([dx, dy, k]) => { ctx.moveTo(X + dx * R + R * k, Y + dy * R); ctx.arc(X + dx * R, Y + dy * R, R * k, 0, 7); });
        ctx.fill();
        ctx.fillStyle = "rgba(190,110,90,.35)"; ctx.beginPath(); ctx.ellipse(X, Y + R * .5, R * 1.35, R * .22, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    function speedLines(t, a = .25) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; for (let i = 0; i < 24; i++) { const y = (i * 97 + t * 900) % H, x = (i * 173) % W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 80 + (i % 4) * 30); ctx.stroke(); } }

    /* ---------- flying chariot (Pushpaka) ---------- */
    function chariot(x, y, s, t, damaged = 0) {
      ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 8 * s); ctx.scale(s, s); ctx.rotate(Math.sin(t * 1.3) * .02 + damaged * .08);
      if (!damaged) { ell(0, -120, 90, 110, 0, "#e8a838"); ell(-25, -140, 25, 60, 0, "rgba(255,240,180,.5)"); poly([[-14, -225], [0, -275], [14, -225]], "#f5c542"); }
      for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; ctx.save(); ctx.rotate(a + Math.PI / 2); poly([[0, 0], [-34, -70], [0, -150], [34, -70]], i % 2 ? "#e8a838" : "#f5c542"); ctx.restore(); }
      ell(0, 0, 230, 46, 0, "#c88a2a"); ell(0, -8, 220, 36, 0, "#f0c050");
      for (let i = -4; i <= 4; i++) circ(i * 48, 6, 7, "#b3122e");
      ctx.strokeStyle = "#8a5a1a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-200, -40); ctx.lineTo(200, -40); ctx.stroke();
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 48, -40); ctx.lineTo(i * 48, -10); ctx.stroke(); }

      // fire trail
      for (let i = 0; i < 6; i++) circ(-240 - i * 22, Math.random() * 10 - 5, 16 - i * 2.4, `rgba(255,${160 + i * 15},60,${.5 - i * .07})`);
      ctx.restore();
    }

    /* ---------- Ravana (cartoon of the viewer) ---------- */
    const SKIN = "#c98f6a", HAIR = "#241612";
    function face(x, y, r, o = {}) {
      // curly hair (back)
      for (let i = 0; i < 16; i++) { const a = Math.PI * (1.02 + i / 15 * .96); circ(x + Math.cos(a) * r * .98, y - r * .1 + Math.sin(a) * r * 1.0, r * .3, HAIR); }
      ell(x, y + r * .05, r * .86, r, 0, SKIN);
      ell(x - r * .86, y + r * .1, r * .13, r * .2, 0, SKIN); ell(x + r * .86, y + r * .1, r * .13, r * .2, 0, SKIN);
      // curly hair (top / fringe)
      for (let i = 0; i < 11; i++) { const px = x - r * .75 + i * r * .15; circ(px, y - r * .72 - Math.sin(i * 1.7) * r * .06, r * .24, HAIR); circ(px + r * .07, y - r * .95, r * .22, HAIR); }
      ctx.strokeStyle = "#3a2018"; ctx.lineWidth = r * .06; ctx.lineCap = "round"; [[-1], [1]].forEach(([d]) => { for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + d * (r * .5 + k * r * .12), y - r * .62, r * .06, 0, 7); ctx.stroke(); } });
      // eyebrows (angry for Ravana)
      ctx.strokeStyle = HAIR; ctx.lineWidth = r * .1;
      ctx.beginPath(); ctx.moveTo(x - r * .62, y - r * .32); ctx.lineTo(x - r * .14, y - r * (o.angry ? .2 : .3)); ctx.moveTo(x + r * .62, y - r * .32); ctx.lineTo(x + r * .14, y - r * (o.angry ? .2 : .3)); ctx.stroke();
      // eyes
      circ(x - r * .36, y - r * .08, r * .1, "#fff"); circ(x + r * .36, y - r * .08, r * .1, "#fff");
      circ(x - r * .34, y - r * .07, r * .06, "#4a5a50"); circ(x + r * .38, y - r * .07, r * .06, "#4a5a50");
      // rectangular glasses
      ctx.strokeStyle = "#151515"; ctx.lineWidth = r * .06; ctx.lineJoin = "round";
      ctx.strokeRect(x - r * .64, y - r * .25, r * .52, r * .36); ctx.strokeRect(x + r * .12, y - r * .25, r * .52, r * .36);
      ctx.beginPath(); ctx.moveTo(x - r * .12, y - r * .2); ctx.lineTo(x + r * .12, y - r * .2); ctx.moveTo(x - r * .12, y - r * .12); ctx.quadraticCurveTo(x, y - r * .18, x + r * .12, y - r * .12);
      ctx.moveTo(x - r * .64, y - r * .2); ctx.lineTo(x - r * .86, y - r * .14); ctx.moveTo(x + r * .64, y - r * .2); ctx.lineTo(x + r * .86, y - r * .14); ctx.stroke();
      // tilak, nose, mustache, mouth
      rr(x - r * .05, y - r * .58, r * .1, r * .2, r * .05, "#c0182e");
      ctx.strokeStyle = "#9a6040"; ctx.lineWidth = r * .05; ctx.beginPath(); ctx.moveTo(x, y + r * .05); ctx.lineTo(x - r * .06, y + r * .3); ctx.lineTo(x + r * .06, y + r * .32); ctx.stroke();
      ctx.globalAlpha = .55; ell(x, y + r * .44, r * .3, r * .06, 0, "#3a2018"); ctx.globalAlpha = 1;
      if (o.laugh) { ctx.fillStyle = "#5a1010"; ctx.beginPath(); ctx.ellipse(x, y + r * .6, r * .28, r * .12 + r * .1 * Math.abs(Math.sin(o.t * 14)), 0, 0, Math.PI); ctx.fill(); rr(x - r * .22, y + r * .58, r * .44, r * .07, r * .02, "#fff"); }
      else { ctx.strokeStyle = "#8a3a30"; ctx.lineWidth = r * .07; ctx.beginPath(); ctx.moveTo(x - r * .22, y + r * .62); ctx.quadraticCurveTo(x, y + r * (o.angry ? .55 : .68), x + r * .22, y + r * .62); ctx.stroke(); }
      // crown
      const cy = y - r * 1.05;
      poly([[x - r * .7, cy + r * .2], [x - r * .62, cy - r * .35], [x - r * .35, cy - r * .1], [x, cy - r * .62], [x + r * .35, cy - r * .1], [x + r * .62, cy - r * .35], [x + r * .7, cy + r * .2]], "#f5c542");
      rr(x - r * .72, cy + r * .08, r * 1.44, r * .2, r * .05, "#d9a12a");
      circ(x, cy - r * .2, r * .1, "#b3122e"); circ(x - r * .4, cy + r * .02, r * .06, "#1d8a5a"); circ(x + r * .4, cy + r * .02, r * .06, "#1d8a5a");
    }
    function ravana(x, y, s, t, o = {}) { // (x,y) = feet
      ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
      // legs + dhoti
      poly([[-60, -230], [60, -230], [72, -40], [10, -40], [0, -150], [-10, -40], [-72, -40]], "#7a1020");
      rr(-70, -45, 56, 45, 10, "#5a3a1a"); rr(14, -45, 56, 45, 10, "#5a3a1a");
      // body: navy tunic (like the hoodie) + golden armour
      rr(-80, -420, 160, 200, 40, "#1c2240");
      poly([[-70, -410], [70, -410], [55, -290], [0, -260], [-55, -290]], "#d9a12a");
      ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, -400 + k * 30, 40 - k * 8, .2, Math.PI - .2); ctx.stroke(); }
      circ(0, -335, 14, "#b3122e"); rr(-82, -240, 164, 22, 8, "#f5c542");
      // hoodie strings nod
      ctx.strokeStyle = "#cfcfcf"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-22, -415); ctx.lineTo(-24, -360); ctx.moveTo(22, -415); ctx.lineTo(24, -360); ctx.stroke();
      // cape
      ctx.globalCompositeOperation = "destination-over"; poly([[-80, -410], [80, -410], [130 + Math.sin(t * 5) * 15, -60], [-130 + Math.sin(t * 5 + 1) * 15, -60]], "#5a0a16"); ctx.globalCompositeOperation = "source-over";
      // arms
      const sw = o.swing ?? -.3;
      ctx.lineCap = "round";
      const arm = (sx, a, len) => { ctx.strokeStyle = "#1c2240"; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(sx, -395); const ex = sx + Math.sin(a) * len, ey = -395 + Math.cos(a) * len; ctx.lineTo(ex, ey); ctx.stroke(); circ(ex, ey, 18, SKIN); rr(ex - 20, ey - 30, 40, 14, 6, "#f5c542"); return [ex, ey]; };
      if (o.point) arm(-80, -1.6, 120); else arm(-80, -.35 + Math.sin(t * 2) * .08, 120);
      const [hx, hy] = arm(80, Math.PI - .4 + sw, 120);
      // sword
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.PI + .4 - sw);
      rr(-6, -10, 12, 40, 4, "#5a3a1a"); rr(-30, -18, 60, 10, 4, "#f5c542");
      poly([[-9, -18], [9, -18], [6, -210], [0, -235], [-6, -210]], "#fff3c0");
      ctx.globalAlpha = .5; poly([[0, -18], [9, -18], [6, -210], [0, -235]], "#ffd34d"); ctx.globalAlpha = 1;
      if (o.glint) { ctx.globalAlpha = o.glint; circ(0, -200, 30, "rgba(255,255,220,.8)"); ctx.globalAlpha = 1; }
      ctx.restore();
      // ten heads: 4 on the left, 5 on the right, + main
      if (!o.oneHead) {
        const side = [[-1, 1], [-1, 2], [-1, 3], [-1, 4], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]];
        side.sort((a, b) => b[1] - a[1]).forEach(([d, k]) => {
          const r = 58 - k * 6, bob = Math.sin(t * (o.laugh ? 9 : 2) + k * 1.3 + d) * (o.laugh ? 8 : 3);
          face(d * (62 + k * 66), -500 + k * 8 + bob, r, { angry: o.angry, laugh: o.laugh, t: t + k });
        });
      }
      face(0, -510 + (o.laugh ? Math.sin(t * 9) * 5 : 0), 78, { angry: o.angry, laugh: o.laugh, t });
      ctx.restore();
    }

    /* ---------- Sita ---------- */
    function sita(x, y, s, t, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ell(0, -250, 46, 80, 0, "#140c0a");
      poly([[-45, -210], [45, -210], [70, 0], [-70, 0]], "#e8761e");
      poly([[-45, -210], [10, -210], [60, -40], [40, 0], [-20, -150]], "#f5c542");
      rr(-38, -290, 76, 95, 22, "#e8761e");
      ctx.strokeStyle = "#e8761e"; ctx.lineWidth = 20; ctx.lineCap = "round";
      const up = o.reach ? Math.sin(t * 6) * .25 : 0;
      ctx.beginPath(); ctx.moveTo(-34, -275); ctx.lineTo(-90, -360 + up * 60); ctx.moveTo(34, -275); ctx.lineTo(90, -360 - up * 60); ctx.stroke();
      circ(-90, -360 + up * 60, 12, "#d9a07a"); circ(90, -360 - up * 60, 12, "#d9a07a");
      circ(0, -330, 40, "#d9a07a");
      ctx.fillStyle = "#140c0a"; ctx.beginPath(); ctx.arc(0, -340, 42, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      circ(0, -350, 4, "#c0182e"); circ(-14, -330, 4, "#111"); circ(14, -330, 4, "#111");
      ctx.strokeStyle = "#7a3020"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -305, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      if (o.tears) { circ(-16, -318 + (t * 40 % 30), 3.5, "#9ad0ff"); circ(16, -318 + ((t * 40 + 15) % 30), 3.5, "#9ad0ff"); }
      ctx.restore();
    }

    /* ---------- Jatayu ---------- */
    function wing(side, flap, cut, s) {
      ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap);
      const len = cut ? .45 : 1;
      poly([[0, -20], [260 * len, -120 * len], [330 * len, -60 * len], [310 * len, 10], [0, 40]], "#6a3a1a");
      for (let i = 0; i < (cut ? 3 : 7); i++) { const fx = 120 + i * 32, fy = -60 + i * 18; ctx.save(); ctx.translate(fx * len + (cut ? 0 : 0), fy * len + 30); ctx.rotate(.5 + i * .08); ell(0, 40, 16, 70, 0, i % 2 ? "#4a2510" : "#5a2e14"); ctx.restore(); }
      poly([[0, -10], [200 * len, -90 * len], [240 * len, -40 * len], [0, 20]], "#c08040");
      if (cut) { circ(150, -55, 18, "#b3122e"); }
      ctx.restore();
    }
    function jatayu(x, y, s, t, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s); ctx.rotate(o.rot || 0);
      const flap = o.flap ?? Math.sin(t * 7) * .55;
      wing(-1, flap, false, s); wing(1, flap, o.cut, s);
      ell(0, 30, 70, 110, 0, "#5a2e14"); ell(0, 10, 50, 80, 0, "#7a4420");
      // talons
      ctx.strokeStyle = "#e8b030"; ctx.lineWidth = 9; ctx.lineCap = "round"; const g = o.grab ? .6 : 0;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 25, 120); ctx.lineTo(d * 30, 165); for (let k = -1; k <= 1; k++) { ctx.moveTo(d * 30, 165); ctx.lineTo(d * 30 + k * 18, 195 - g * 10); } ctx.stroke(); }
      // white ruff + head
      ell(0, -80, 62, 40, 0, "#f2ebe0"); for (let i = 0; i < 9; i++) circ(-56 + i * 14, -62, 14, "#e8e0d2");
      circ(0, -130, 40, "#8a8a92"); ell(0, -150, 34, 22, 0, "#a8a8b0");
      circ(-15, -138, 9, "#fff"); circ(15, -138, 9, "#fff"); circ(-14, -137, 5, "#b3122e"); circ(16, -137, 5, "#b3122e");
      ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, -156); ctx.lineTo(-6, -146); ctx.moveTo(30, -156); ctx.lineTo(6, -146); ctx.stroke();
      poly([[-16, -118], [16, -118], [12, -90], [0, -70], [-6, -92]], "#f0c040"); poly([[0, -70], [-10, -82], [-2, -92]], "#c08a20");
      if (o.cry) { ctx.fillStyle = "#5a1010"; ctx.beginPath(); ctx.moveTo(-10, -104); ctx.lineTo(10, -104); ctx.lineTo(0, -88); ctx.fill(); }
      ctx.restore();
    }

    /* ---------- particles / fx ---------- */
    const feathers = Array.from({ length: 40 }, () => [Math.random(), Math.random(), Math.random() * 6, .5 + Math.random()]);
    function featherBurst(cx, cy, t, n = 40, spread = 500) {
      feathers.slice(0, n).forEach(([a, b, r, sp]) => {
        const ang = a * Math.PI * 2, d = t * spread * sp, x = cx + Math.cos(ang) * d + Math.sin(t * 3 + r) * 20, y = cy + Math.sin(ang) * d + t * t * 60;
        ctx.save(); ctx.translate(x, y); ctx.rotate(r + t * 4 * sp); ctx.globalAlpha = Math.max(0, 1 - t / 3); ell(0, 0, 7, 22, 0, b > .5 ? "#6a3a1a" : "#c08040"); ctx.restore();
      }); ctx.globalAlpha = 1;
    }
    function flash(a, c = "255,255,240") { if (a > 0) { ctx.fillStyle = `rgba(${c},${Math.min(1, a)})`; ctx.fillRect(0, 0, W, H); } }
    function shake(t, amt) { ctx.translate(Math.sin(t * 61) * amt, Math.cos(t * 47) * amt); }
    function vignette() { const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }

    /* ---------- scenes: f(t, dur) ---------- */
    const scenes = [
      (t, d) => { // 0: title — chariot over the clouds
        sky(t); clouds(t, 30, 1, .8);
        const x = lerp(-250, W + 250, t / d);
        chariot(x, 640, .9, t);
        clouds(t, 90, 0);
        text("JATAYU'S", W / 2, 230, 92, "#f5c542", ease((t - .4) / 1) , "Georgia, serif", "bold", "#3a1408");
        text("LAST FLIGHT", W / 2, 330, 72, "#fff3d0", ease((t - .9) / 1), "Georgia, serif", "bold", "#3a1408");
        text("A Ramayana story", W / 2, 400, 30, "#fff", ease((t - 1.6) / 1), "Georgia, serif", "italic");
      },
      (t, d, info = {}) => { // 1: on the chariot — Ravana laughs, Sita cries
        sky(t); clouds(t, 160, 1, .7); speedLines(t, .18);
        ctx.save(); ctx.translate(0, 0);
        chariot(W / 2, 1180, 2.1, t);
        sita(170, 1100, 1.05, t, { reach: true, tears: true });
        ravana(470, 1130, .95, t, { laugh: t > (info.ravana ?? d * .45), swing: -.3 });
        ctx.restore();
        clouds(t, 260, 0, .5);
      },
      (t, d, info = {}) => { // 2: Jatayu appears from the sun
        sky(t); clouds(t, 40, 1);
        const k = ease(t / (d * .7)), x = lerp(560, 360, k), y = lerp(760, 560, k), s = lerp(.2, 1.15, k);
        const g = ctx.createRadialGradient(x, y, 10, x, y, 300); g.addColorStop(0, `rgba(255,250,220,${.8 * (1 - k)})`); g.addColorStop(1, "rgba(255,250,220,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        jatayu(x, y, s, t, { cry: t > (info.jatayu ?? d * .55) });
        clouds(t, 120, 0, .6);
        if (t > (info.jatayu ?? d * .55)) text("STOP, RAVANA!", W / 2, 1000, 64, "#fff", ease((t - (info.jatayu ?? d * .55)) * 3), "Impact, Arial Black, sans-serif", "bold", "#7a1020");
      },
      (t, d) => { // 3: battle
        sky(t, 1); ctx.save(); shake(t, 5);
        clouds(t, 220, 1, .6); speedLines(t, .25);
        chariot(W / 2, 1200, 2, t, ease((t - d * .5) * 2));
        const cyc = (t % 2.4) / 2.4, dive = Math.sin(cyc * Math.PI);
        ravana(430, 1150, .9, t, { angry: true, swing: Math.sin(t * 5) * 1.1 - .2, glint: Math.max(0, Math.sin(t * 5)) * .6 });
        jatayu(lerp(170, 300, dive), lerp(380, 640, dive), .95, t, { grab: dive > .7, flap: Math.sin(t * 12) * .6, rot: -.2 + dive * .3 });
        if (dive > .85) { featherBurst(320, 680, (cyc - .4) * 3, 14, 260); flash((dive - .85) * 4, "255,220,150"); }
        ctx.restore(); clouds(t, 320, 0, .4); vignette();
      },
      (t, d) => { // 4: the sword strikes the wing
        sky(t, 1); clouds(t, 80, 1, .6);
        const hit = d * .45, after = t - hit;
        ctx.save(); if (after > 0 && after < .6) shake(t, 14 * (1 - after / .6));
        ravana(430, 1210, 1.05, t, { angry: true, swing: after < 0 ? lerp(-.3, -1.4, ease(t / hit)) : 1.4, glint: after < 0 ? ease(t / hit) : 0, oneHead: false });
        jatayu(230 + (after > 0 ? Math.min(after, 3) * 30 : 0), 520 + (after > 0 ? Math.min(after, 3) ** 2 * 45 : 0), 1, t, { cut: after > 0, cry: after > 0, flap: after > 0 ? .9 : Math.sin(t * 10) * .6, rot: after > 0 ? after * .8 : 0 });
        if (after > 0) { featherBurst(360, 520, after, 40, 380); flash(1 - after * 2.5); }
        ctx.restore(); vignette();
      },
      (t, d) => { // 5: Jatayu falls, chariot flies away
        sky(t, 1); clouds(t, 30, 1, .7);
        chariot(lerp(W / 2, W + 300, ease(t / d)), lerp(300, 150, t / d), lerp(.6, .35, t / d), t, 1);
        const fy = lerp(380, 1500, ease(t / (d * .75)));
        clouds(t * 4, 120, 0, .8);
        jatayu(W / 2 - 60, fy, .7, t, { cut: true, rot: t * 2.2, flap: .9 });
        featherBurst(W / 2 - 60, fy - 200, (t % 2) + .3, 12, 120);
        if (t > d * .7) { ctx.fillStyle = `rgba(0,0,0,${ease((t - d * .7) / (d * .3)) * .6})`; ctx.fillRect(0, 0, W, H); }
      },
      (t, d) => { // 6: end card
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a0a08"); g.addColorStop(1, "#3a1408"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = ease(t / 1.5) * .9; jatayu(W / 2, 470, .65, t, { flap: Math.sin(t * 1.5) * .3 }); ctx.globalAlpha = 1;
        text("Jatayu gave his life", W / 2, 760, 46, "#f5c542", ease((t - .8) / 1.2));
        text("protecting Sita.", W / 2, 820, 46, "#f5c542", ease((t - 1.3) / 1.2));
        text("The bravest heart in the sky.", W / 2, 900, 32, "#eee", ease((t - 2.2) / 1.2), "Georgia, serif", "italic");
        text("STARRING", W / 2, 1040, 22, "#aaa", ease((t - 3.2) / 1), "system-ui, sans-serif", "600");
        text("YOU as Ravana", W / 2, 1080, 34, "#fff", ease((t - 3.4) / 1), "Georgia, serif", "bold");
        text("DevInventor Mini Cinema", W / 2, 1200, 22, "#888", ease((t - 4) / 1), "system-ui, sans-serif", "normal");
      },
    ];

    const COLORS = { narrator: "#ffffff", sita: "#ffb070", ravana: "#ff6a6a", jatayu: "#9ad0ff" };
    const NAMES = { sita: "SITA", ravana: "RAVANA", jatayu: "JATAYU" };
    function subtitle(line) {
      if (!line) return;
      ctx.font = "600 34px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const words = line.text.split(" "), lines = []; let cur = "";
      words.forEach(w => { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > 620) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur);
      const y0 = H - 120 - (lines.length - 1) * 46;
      if (NAMES[line.who]) text(NAMES[line.who], W / 2, y0 - 50, 24, COLORS[line.who], 1, "system-ui, sans-serif", "800", "#000");
      ctx.font = "600 34px system-ui, sans-serif";
      lines.forEach((l, k) => { const w = ctx.measureText(l).width + 30; rr(W / 2 - w / 2, y0 + k * 46 - 22, w, 44, 8, "rgba(0,0,0,.65)"); ctx.fillStyle = COLORS[line.who]; ctx.fillText(l, W / 2, y0 + k * 46 + 1); });
    }
    return { scenes, subtitle, flash, vignette };
  }
  window.JatayuArt = { make, W, H };
})();
