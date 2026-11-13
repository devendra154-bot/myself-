/* DevInventor Notes: verified circuit diagrams.
 * Every diagram is drawn from fixed, hand-checked coordinates with standard
 * symbols (IEEE/IS style): resistor zig-zag, diode triangle -> bar (anode -> cathode),
 * Zener bent bar, battery long plate = +, BJT emitter arrow (NPN out, PNP in).
 * Nothing here is generated randomly.
 */
(function (root) {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

  /** Drawing kit bound to one colour theme. */
  function kit(o) {
    const ink = o.ink, acc = o.accent, cur = o.current, font = o.font;
    const sw = 2.2;
    let out = "";
    const add = (s) => (out += s);

    // local coordinates along a segment: a = distance along, b = sideways
    const seg = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      return { L, P: (a, b = 0) => [x1 + ux * a - uy * b, y1 + uy * a + ux * b], ang: Math.atan2(dy, dx) };
    };
    const pts = (arr) => arr.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
    const line = (arr, color = ink, w = sw, extra = "") => add(`<polyline points="${pts(arr)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`);

    /** Text: supports subscripts written as V_Z or V_{TH}. */
    const text = (x, y, s, { size = 15, color = ink, anchor = "middle", weight = 500, italic = false } = {}) => {
      const html = esc(s).replace(/_\{([^}]+)\}|_([A-Za-z0-9]+)/g, (m, a, b) => `<tspan font-size="${Math.round(size * 0.72)}" dy="4">${a || b}</tspan><tspan dy="-4">​</tspan>`);
      add(`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" ${italic ? 'font-style="italic"' : ""} fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${html}</text>`);
    };

    const arrowHead = (x, y, ang, color = cur, size = 9) => {
      const a1 = ang + Math.PI - 0.42, a2 = ang + Math.PI + 0.42;
      add(`<polygon points="${pts([[x, y], [x + size * Math.cos(a1), y + size * Math.sin(a1)], [x + size * Math.cos(a2), y + size * Math.sin(a2)]])}" fill="${color}"/>`);
    };

    const k = {
      get svg() { return out; },
      wire: (...p) => line(p),
      dot: (x, y) => add(`<circle cx="${x}" cy="${y}" r="4" fill="${ink}"/>`),
      terminal: (x, y, label, side = "right") => {
        add(`<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="${ink}" stroke-width="${sw}"/>`);
        if (label) text(x + (side === "right" ? 16 : side === "left" ? -16 : 0), y + (side === "top" ? -16 : side === "bottom" ? 18 : 0), label, { weight: 700 });
      },
      text,
      /** A wire crossing another without connecting (small hop). */
      hop: (x, y1, y2, cy) => { add(`<path d="M${x},${y1} L${x},${cy - 7} A7,7 0 0 1 ${x},${cy + 7} L${x},${y2}" fill="none" stroke="${ink}" stroke-width="${sw}"/>`); },

      resistor(x1, y1, x2, y2, label, { side = -1, value, variable = false } = {}) {
        const s = seg(x1, y1, x2, y2), c = s.L / 2, zw = 46, a0 = c - zw / 2;
        const p = [s.P(0), s.P(a0)];
        for (let i = 0; i < 6; i++) p.push(s.P(a0 + (i + 0.5) * (zw / 6), i % 2 ? 9 : -9));
        p.push(s.P(a0 + zw), s.P(s.L));
        line(p);
        if (variable) { const [ax, ay] = s.P(c - 26, 16), [bx, by] = s.P(c + 26, -16); line([[ax, ay], [bx, by]]); arrowHead(bx, by, Math.atan2(by - ay, bx - ax), ink); }
        const [lx, ly] = s.P(c, side * 26);
        if (label) text(lx, ly - (value ? 8 : 0), label, { weight: 700 });
        if (value) text(lx, ly + 10, value, { size: 13, color: "#6b6b78" });
      },

      /** Diode from anode (x1,y1) to cathode (x2,y2). */
      diode(x1, y1, x2, y2, label, { zener = false, side = -1 } = {}) {
        const s = seg(x1, y1, x2, y2), c = s.L / 2;
        line([s.P(0), s.P(c - 11)]);
        line([s.P(c + 11), s.P(s.L)]);
        add(`<polygon points="${pts([s.P(c - 11, -12), s.P(c - 11, 12), s.P(c + 11, 0)])}" fill="${ink}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>`);
        if (zener) line([s.P(c + 5, 15), s.P(c + 11, 12), s.P(c + 11, -12), s.P(c + 17, -15)]);
        else line([s.P(c + 11, -12), s.P(c + 11, 12)]);
        if (label) { const [lx, ly] = s.P(c, side * 28); text(lx, ly, label, { weight: 700 }); }
      },

      /** Battery / DC source from + terminal (x1,y1) to − terminal (x2,y2). Long plate is +. */
      battery(x1, y1, x2, y2, label, { side = -1, value } = {}) {
        const s = seg(x1, y1, x2, y2), c = s.L / 2;
        line([s.P(0), s.P(c - 5)]);
        line([s.P(c + 5), s.P(s.L)]);
        line([s.P(c - 5, -18), s.P(c - 5, 18)], ink, 2.6);
        line([s.P(c + 5, -9), s.P(c + 5, 9)], ink, 5);
        const [px, py] = s.P(c - 18, -side * 22), [mx, my] = s.P(c + 18, -side * 22);
        text(px, py, "+", { size: 17, weight: 700, color: "#c0392b" });
        text(mx, my, "−", { size: 19, weight: 700, color: "#1f4e9c" });
        if (label) { const [lx, ly] = s.P(c, side * 40); text(lx, ly - (value ? 8 : 0), label, { weight: 700 }); if (value) text(lx, ly + 10, value, { size: 13, color: "#6b6b78" }); }
      },

      acSource(cx, cy, r = 22, label = "AC") {
        add(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${ink}" stroke-width="${sw}"/>`);
        add(`<path d="M${cx - 12},${cy} C${cx - 8},${cy - 14} ${cx - 2},${cy - 14} ${cx},${cy} S${cx + 8},${cy + 14} ${cx + 12},${cy}" fill="none" stroke="${ink}" stroke-width="${sw}"/>`);
        if (label) text(cx - r - 12, cy, label, { anchor: "end", weight: 700 });
      },

      /** Independent current source, arrow up or down. */
      currentSource(cx, cy, dir = "up", label, value) {
        const r = 22;
        add(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${ink}" stroke-width="${sw}"/>`);
        const d = dir === "up" ? -1 : 1;
        line([[cx, cy - d * 12], [cx, cy + d * 10]]);
        arrowHead(cx, cy + d * 13, d * Math.PI / 2, ink, 10);
        if (label) { text(cx - r - 12, cy - (value ? 8 : 0), label, { anchor: "end", weight: 700 }); if (value) text(cx - r - 12, cy + 10, value, { anchor: "end", size: 13, color: "#6b6b78" }); }
      },

      ground(x, y) { line([[x, y], [x, y + 10]]); line([[x - 14, y + 10], [x + 14, y + 10]]); line([[x - 9, y + 16], [x + 9, y + 16]]); line([[x - 4, y + 22], [x + 4, y + 22]]); },

      /** Conventional current arrow along a wire with label. */
      current(x1, y1, x2, y2, label, { side = -1 } = {}) {
        const s = seg(x1, y1, x2, y2);
        line([s.P(0), s.P(s.L)], cur, 2);
        arrowHead(x2, y2, s.ang, cur, 10);
        const vertical = Math.abs(Math.sin(s.ang)) > 0.9;
        const [lx, ly] = s.P(s.L / 2, side * (vertical ? 9 : 15));
        const anchor = vertical ? (lx > x1 ? "start" : "end") : "middle";
        if (label) text(lx, ly, label, { color: cur, weight: 700, size: 14, anchor });
      },

      /** + and − marks across a component, e.g. a voltage drop. */
      polarity(xp, yp, xm, ym, label, lx, ly) {
        text(xp, yp, "+", { size: 17, weight: 700, color: "#c0392b" });
        text(xm, ym, "−", { size: 19, weight: 700, color: "#1f4e9c" });
        if (label) text(lx, ly, label, { weight: 700, color: acc });
      },

      /** Transformer: primary at x (terminals top/bottom), secondary returned. Optional centre tap. */
      transformer(x, yTop, yBot, { centerTap = false, label } = {}) {
        const n = 4, lead = 14, h = yBot - yTop - 2 * lead, r = h / (2 * n);
        const coil = (xx, sweep) => {
          let d = `M${xx},${yTop} L${xx},${yTop + lead}`;
          for (let i = 0; i < n; i++) d += ` A${r},${r} 0 0 ${sweep} ${xx},${yTop + lead + (i + 1) * 2 * r}`;
          d += ` L${xx},${yBot}`;
          add(`<path d="${d}" fill="none" stroke="${ink}" stroke-width="${sw}"/>`);
        };
        const x2 = x + 2 * r + 22;
        coil(x, 1);
        coil(x2, 0);
        line([[x + r + 7, yTop + 6], [x + r + 7, yBot - 6]]);
        line([[x + r + 13, yTop + 6], [x + r + 13, yBot - 6]]);
        if (label) text((x + x2) / 2, yBot + 22, label, { size: 13, color: "#6b6b78" });
        return { x2, mid: (yTop + yBot) / 2, r, centerTap };
      },

      /** BJT. Returns terminal points B, C, E. NPN: emitter arrow points out; PNP: points in. */
      bjt(cx, cy, type = "npn", { labels = true } = {}) {
        add(`<circle cx="${cx}" cy="${cy}" r="32" fill="none" stroke="${ink}" stroke-width="1.6"/>`);
        const B = [cx - 44, cy], C = [cx + 14, cy - 52], E = [cx + 14, cy + 52];
        line([B, [cx - 12, cy]]);
        line([[cx - 12, cy - 20], [cx - 12, cy + 20]], ink, 4);
        line([[cx - 12, cy - 9], [cx + 14, cy - 27], C]);
        line([[cx - 12, cy + 9], [cx + 14, cy + 27], E]);
        const ang = Math.atan2(27 - 9, 26);
        if (type === "npn") arrowHead(cx + 12, cy + 25.6, ang, ink, 12);
        else arrowHead(cx - 6, cy + 13, ang + Math.PI, ink, 12);
        if (labels) { text(B[0] + 8, cy - 14, "B", { weight: 700, size: 14 }); text(C[0] + 14, C[1] + 10, "C", { weight: 700, size: 14 }); text(E[0] + 14, E[1] - 10, "E", { weight: 700, size: 14 }); }
        return { B, C, E };
      },

      /** Small waveform plot. fn(t) returns -1..1 over t in [0, 2 periods]. */
      wave(x, y, w, h, fn, label, { periods = 2, axisLabel = "t" } = {}) {
        line([[x, y + h / 2], [x + w + 8, y + h / 2]], "#9aa0ad", 1.4);
        arrowHead(x + w + 12, y + h / 2, 0, "#9aa0ad", 8);
        line([[x, y + h + 4], [x, y - 6]], "#9aa0ad", 1.4);
        arrowHead(x, y - 10, -Math.PI / 2, "#9aa0ad", 8);
        const p = [];
        for (let i = 0; i <= 160; i++) { const t = (i / 160) * periods; p.push([x + (i / 160) * w, y + h / 2 - fn(t) * (h / 2 - 4)]); }
        line(p, acc, 2.4);
        if (label) text(x - 10, y + 6, label, { anchor: "end", size: 13, weight: 700 });
        text(x + w + 14, y + h / 2 + 14, axisLabel, { size: 12, color: "#6b6b78" });
      },

      box(x, y, w, h, fill, stroke = ink, extra = "") { add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`); },
      raw: add,
      arrowHead,
      line,
    };
    return k;
  }

  const sine = (t) => Math.sin(2 * Math.PI * t);
  const half = (t) => Math.max(0, sine(t));
  const full = (t) => Math.abs(sine(t));

  // ---------- diagram templates (fixed coordinates, checked) ----------
  const D = {};

  D.pn_bias = { title: "PN junction diode: forward and reverse bias", w: 760, h: 340, draw(k) {
    const panel = (x0, forward) => {
      const dep = forward ? 14 : 34;
      const pL = x0 + 70, pR = x0 + 160, nR = pR + dep + 90;
      k.box(pL, 70, 90, 70, "#fde8e8");
      k.box(pR, 70, dep, 70, "#eef0f4", undefined, 'stroke-dasharray="4 3"');
      k.box(pR + dep, 70, 90, 70, "#e3ecfb");
      k.text(pL + 45, 105, "P", { size: 24, weight: 800 });
      k.text(pR + dep + 45, 105, "N", { size: 24, weight: 800 });
      k.text((pR + pR + dep) / 2, 58, forward ? "narrow" : "wide", { size: 12, color: "#6b6b78" });
      k.text((pR + pR + dep) / 2, 46, "depletion", { size: 12, color: "#6b6b78" });
      // P side wire down to battery; N side wire down to resistor
      k.wire([pL, 105], [x0 + 30, 105], [x0 + 30, 250], [x0 + 80, 250]);
      k.wire([nR, 105], [nR + 30, 105], [nR + 30, 250], [x0 + 250, 250]);
      if (forward) k.battery(x0 + 80, 250, x0 + 150, 250, "", { side: 1 });        // + on the P side
      else k.battery(x0 + 150, 250, x0 + 80, 250, "", { side: 1 });                // + on the N side
      k.text(x0 + 115, 284, "V", { weight: 700 });
      k.wire([x0 + 150, 250], [x0 + 170, 250]);
      k.resistor(x0 + 170, 250, x0 + 250, 250, "R", { side: 1 });
      if (forward) {
        k.current(x0 + 14, 210, x0 + 14, 150, "I", { side: -1 });
        k.text(x0 + 175, 306, "P to +, N to −: current flows", { size: 13 });
        k.text(x0 + 175, 322, "(after ≈ 0.7 V for silicon)", { size: 12, color: "#6b6b78" });
      } else {
        k.text(x0 + 175, 306, "P to −, N to +: almost no current", { size: 13 });
        k.text(x0 + 175, 322, "(only tiny leakage current I₀)", { size: 12, color: "#6b6b78" });
      }
      k.text(x0 + 170, 22, forward ? "Forward bias" : "Reverse bias", { size: 17, weight: 800, color: forward ? "#1f9d6b" : "#c0392b" });
    };
    panel(10, true);
    panel(390, false);
  } };

  D.diode_vi = { title: "PN junction diode: symbol and V-I characteristics", w: 640, h: 360, draw(k) {
    // symbol
    k.diode(30, 50, 210, 50, "", {});
    k.text(30, 74, "Anode (A)", { size: 12, anchor: "start" });
    k.text(210, 74, "Cathode (K)", { size: 12, anchor: "end" });
    k.text(120, 22, "Symbol", { weight: 700, size: 14 });
    // axes: origin
    const ox = 360, oy = 210;
    k.line([[160, oy], [600, oy]], "#4b5563", 1.8); k.arrowHead(606, oy, 0, "#4b5563", 9);
    k.line([[ox, 340], [ox, 60]], "#4b5563", 1.8); k.arrowHead(ox, 54, -Math.PI / 2, "#4b5563", 9);
    k.text(600, oy + 18, "V_F (volts)", { size: 12, anchor: "end" });
    k.text(180, oy - 14, "V_R", { size: 12, anchor: "start" });
    k.text(ox + 8, 64, "I_F (mA)", { size: 12, anchor: "start" });
    k.text(ox + 8, 334, "I_R (µA)", { size: 12, anchor: "start" });
    // forward curve: flat until knee, then steep
    const f = [];
    for (let v = 0; v <= 1; v += 0.005) { const x = ox + v * 200; const i = 0.6 * (Math.exp(v * 7.6) - 1); if (i > 150) break; f.push([x, oy - i]); }
    k.line(f, "#7a50dc", 2.6);
    k.line([[ox + 140, oy], [ox + 140, oy - 10]], "#4b5563", 1.2);
    k.text(ox + 140, oy + 16, "0.7 V", { size: 12 });
    k.text(ox + 150, 96, "Knee voltage", { size: 12, anchor: "start", color: "#7a50dc" });
    k.text(ox + 150, 112, "Si ≈ 0.7 V, Ge ≈ 0.3 V", { size: 12, anchor: "start", color: "#6b6b78" });
    // reverse: small constant current then breakdown
    const r = [[ox, oy], [ox - 150, oy + 12], [ox - 150, oy + 12]];
    k.line([[ox, oy], [ox - 140, oy + 10], [ox - 150, oy + 16], [ox - 156, oy + 120]], "#7a50dc", 2.6);
    k.text(ox - 74, oy + 40, "reverse saturation current I₀", { size: 12, color: "#6b6b78" });
    k.text(ox - 166, oy + 70, "Breakdown", { size: 12, anchor: "end", color: "#c0392b" });
    k.text(ox - 166, oy + 86, "at V_{BR}", { size: 12, anchor: "end", color: "#c0392b" });
    k.text(ox + 60, oy + 50, "Forward: current rises sharply", { size: 12, anchor: "start" });
    k.text(ox + 60, oy + 66, "after the knee voltage", { size: 12, anchor: "start" });
    void r;
  } };

  D.zener_reg = { title: "Zener diode as a voltage regulator", w: 640, h: 320, draw(k) {
    k.battery(70, 80, 70, 240, "V_{in}", { side: -1 });
    k.wire([70, 80], [70, 60], [140, 60]);
    k.resistor(140, 60, 240, 60, "R_S", { side: -1 });
    k.wire([240, 60], [330, 60]);
    k.dot(330, 60);
    k.wire([330, 60], [330, 110]);
    k.diode(330, 210, 330, 110, "D_Z", { zener: true, side: 1 });   // anode bottom, cathode top: reverse biased
    k.wire([330, 210], [330, 260]);
    k.wire([330, 60], [480, 60], [480, 110]);
    k.resistor(480, 110, 480, 210, "R_L", { side: 1 });
    k.wire([480, 210], [480, 260]);
    k.wire([70, 240], [70, 260], [480, 260]);
    k.dot(330, 260);
    k.current(255, 40, 300, 40, "I_S", { side: -1 });
    k.current(392, 120, 392, 170, "I_Z", { side: -1 });
    k.current(510, 120, 510, 170, "I_L", { side: -1 });
    k.polarity(300, 96, 300, 228, "V_Z", 284, 162);
    k.polarity(560, 96, 560, 228, "V_o = V_Z", 590, 162);
    k.text(320, 300, "Zener is reverse biased (cathode to +). V_o stays ≈ V_Z while I_Z > I_{Z(min)}.", { size: 13 });
  } };

  const rectifierSource = (k, label) => {
    k.acSource(50, 165, 22, "");
    k.text(50, 205, "AC mains", { size: 12, color: "#6b6b78" });
    k.wire([50, 143], [50, 80], [110, 80]);
    k.wire([50, 187], [50, 250], [110, 250]);
    return k.transformer(110, 80, 250, { label });
  };

  D.hwr = { title: "Half-wave rectifier", w: 780, h: 320, draw(k) {
    const t = rectifierSource(k, "Step-down transformer");
    const x2 = t.x2;
    k.wire([x2, 80], [230, 80]);
    k.diode(230, 80, 310, 80, "D", { side: -1 });
    k.wire([310, 80], [400, 80], [400, 115]);
    k.resistor(400, 115, 400, 215, "R_L", { side: -1 });
    k.wire([400, 215], [400, 250], [x2, 250]);
    k.current(330, 62, 380, 62, "I", { side: -1 });
    k.polarity(436, 108, 436, 222, "V_o", 456, 165);
    k.text(x2 + 6, 165, "V_s", { anchor: "start", size: 13, weight: 700 });
    k.wave(520, 50, 220, 90, sine, "V_s", { axisLabel: "t" });
    k.wave(520, 180, 220, 90, half, "V_o", { axisLabel: "t" });
    k.text(630, 300, "Diode conducts only in the positive half cycle", { size: 12, color: "#6b6b78" });
  } };

  D.fwr_ct = { title: "Centre-tapped full-wave rectifier", w: 800, h: 340, draw(k) {
    const t = rectifierSource(k, "Centre-tapped transformer");
    const x2 = t.x2, ct = t.mid;
    k.wire([x2, 80], [230, 80]);
    k.diode(230, 80, 310, 80, "D_1", { side: -1 });
    k.wire([310, 80], [360, 80], [360, 250], [310, 250]);
    k.diode(230, 250, 310, 250, "D_2", { side: 1 });
    k.wire([x2, 250], [230, 250]);
    k.dot(360, ct);
    k.wire([x2, ct], [210, ct]);
    k.dot(x2, ct);
    k.resistor(210, ct, 330, ct, "R_L", { side: -1 });
    k.wire([330, ct], [360, ct]);
    k.text(x2 - 10, ct + 22, "CT", { size: 12, weight: 700, anchor: "end" });
    k.current(320, ct + 24, 230, ct + 24, "I_L", { side: -1 });
    k.polarity(340, ct - 26, 200, ct - 26, "V_o", 270, ct - 48);
    k.wave(530, 60, 220, 90, sine, "V_s", {});
    k.wave(530, 200, 220, 90, full, "V_o", {});
    k.text(640, 320, "D₁ conducts in +ve half, D₂ in −ve half", { size: 12, color: "#6b6b78" });
  } };

  D.bridge = { title: "Bridge rectifier", w: 820, h: 350, draw(k) {
    const t = rectifierSource(k, "Transformer");
    const x2 = t.x2;
    const T = [330, 100], R = [420, 175], B = [330, 250], L = [240, 175];
    const edge = (a, b, label, side) => {
      // shorten so the diode sits in the middle of each arm
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const a2 = [a[0] + dx * 0.16, a[1] + dy * 0.16], b2 = [a[0] + dx * 0.84, a[1] + dy * 0.84];
      k.wire(a, a2); k.wire(b2, b);
      k.diode(a2[0], a2[1], b2[0], b2[1], label, { side });
    };
    edge(T, R, "D_1", -1);  // anode T, cathode R
    edge(B, R, "D_3", 1);   // anode B, cathode R
    edge(L, B, "D_2", -1);  // anode L, cathode B
    edge(L, T, "D_4", 1);   // anode L, cathode T
    [T, R, B, L].forEach((p) => k.dot(p[0], p[1]));
    k.wire([x2, 80], [330, 80], T);
    k.wire([x2, 250], [300, 250], B);
    // output: R is +, L is −
    k.wire(R, [560, 175], [560, 200]);
    k.resistor(560, 200, 560, 290, "R_L", { side: -1 });
    k.wire([560, 290], [560, 310], [240, 310]);
    k.wire(L, [240, 238]);
    k.hop(240, 238, 310, 250);
    k.polarity(590, 196, 590, 296, "V_o", 612, 246);
    k.text(430, 160, "+", { size: 16, weight: 700, color: "#c0392b" });
    k.text(222, 160, "−", { size: 18, weight: 700, color: "#1f4e9c" });
    k.text(660, 40, "+ve half: D₁, D₂ conduct", { size: 12, anchor: "start" });
    k.text(660, 60, "−ve half: D₃, D₄ conduct", { size: 12, anchor: "start" });
    k.wave(670, 110, 120, 70, full, "V_o", {});
    k.text(650, 230, "Current through R_L flows", { size: 12, anchor: "start", color: "#6b6b78" });
    k.text(650, 246, "the same way in both halves", { size: 12, anchor: "start", color: "#6b6b78" });
  } };

  const bjtBias = (k, type) => {
    const npn = type === "npn";
    const { B, C, E } = k.bjt(430, 170, type);
    // base circuit
    k.wire(B, [370, 170]);
    k.resistor(290, 170, 370, 170, "R_B", { side: -1 });
    k.wire([290, 170], [260, 170], [260, 190]);
    if (npn) k.battery(260, 190, 260, 260, "V_{BB}", { side: -1 }); else k.battery(260, 260, 260, 190, "V_{BB}", { side: -1 });
    k.wire([260, 260], [260, 290], [580, 290]);
    k.wire(E, [444, 290]);
    k.dot(444, 290);
    // collector circuit
    k.wire(C, [444, 110]);
    k.resistor(444, 110, 444, 40, "R_C", { side: 1 });
    k.wire([444, 40], [444, 26], [580, 26], [580, 120]);
    if (npn) k.battery(580, 120, 580, 200, "V_{CC}", { side: 1 }); else k.battery(580, 200, 580, 120, "V_{CC}", { side: 1 });
    k.wire([580, 200], [580, 290]);
    k.ground(444, 296);
    // currents (conventional)
    if (npn) {
      k.current(262, 152, 286, 152, "I_B", { side: -1 });
      k.current(424, 55, 424, 95, "I_C", { side: 1 });
      k.current(462, 238, 462, 266, "I_E", { side: 1 });
    } else {
      k.current(286, 152, 262, 152, "I_B", { side: 1 });
      k.current(424, 95, 424, 55, "I_C", { side: -1 });
      k.current(462, 266, 462, 238, "I_E", { side: 1 });
    }
  };

  const bjtSymbol = (k, type) => {
    const npn = type === "npn";
    const { B, C, E } = k.bjt(110, 170, type);
    k.text(B[0] - 6, B[1], "Base", { anchor: "end", size: 13 });
    k.text(C[0] + 6, C[1] - 12, "Collector", { anchor: "start", size: 13 });
    k.text(E[0] + 6, E[1] + 14, "Emitter", { anchor: "start", size: 13 });
    k.text(110, 30, npn ? "NPN symbol" : "PNP symbol", { weight: 800, size: 15 });
    k.text(110, 270, npn ? "Arrow points OUT of emitter" : "Arrow points IN to emitter", { size: 12, color: "#6b6b78" });
    k.text(110, 300, npn ? "I_E = I_B + I_C" : "I_E = I_B + I_C", { size: 13, weight: 700 });
  };

  D.npn = { title: "NPN transistor: symbol and common-emitter biasing", w: 660, h: 350, draw(k) {
    bjtSymbol(k, "npn");
    bjtBias(k, "npn");
    k.text(430, 338, "Active region: B-E forward biased, C-B reverse biased", { size: 12, color: "#6b6b78" });
  } };

  D.pnp = { title: "PNP transistor: symbol and common-emitter biasing", w: 660, h: 350, draw(k) {
    bjtSymbol(k, "pnp");
    bjtBias(k, "pnp");
    k.text(430, 338, "Supplies reversed: base and collector are negative w.r.t. emitter", { size: 12, color: "#6b6b78" });
  } };

  D.vdiv = { title: "Voltage divider", w: 560, h: 320, draw(k) {
    k.battery(80, 90, 80, 230, "V_{in}", { side: -1, value: "12 V" });
    k.wire([80, 90], [80, 50], [280, 50], [280, 70]);
    k.resistor(280, 70, 280, 150, "R_1", { side: 1, value: "10 kΩ" });
    k.wire([280, 150], [280, 170]);
    k.dot(280, 160);
    k.resistor(280, 170, 280, 250, "R_2", { side: 1, value: "5 kΩ" });
    k.wire([280, 250], [280, 270], [80, 270], [80, 230]);
    k.wire([280, 160], [430, 160]); k.terminal(430, 160);
    k.wire([280, 270], [430, 270]); k.terminal(430, 270);
    k.dot(280, 270);
    k.polarity(450, 160, 450, 270, "V_{out}", 470, 215);
    k.current(140, 34, 220, 34, "I", { side: -1 });
    k.text(280, 306, "V_out = V_in × R₂ / (R₁ + R₂) = 12 × 5 / 15 = 4 V", { size: 13, weight: 600 });
  } };

  D.idiv = { title: "Current divider", w: 560, h: 320, draw(k) {
    k.currentSource(80, 160, "up", "I", "6 mA");
    k.wire([80, 138], [80, 50], [400, 50]);
    k.wire([80, 182], [80, 270], [400, 270]);
    k.dot(240, 50); k.dot(240, 270);
    k.wire([240, 50], [240, 110]); k.resistor(240, 110, 240, 210, "R_1", { side: 1, value: "1 kΩ" }); k.wire([240, 210], [240, 270]);
    k.wire([400, 50], [400, 110]); k.resistor(400, 110, 400, 210, "R_2", { side: 1, value: "2 kΩ" }); k.wire([400, 210], [400, 270]);
    k.current(130, 34, 200, 34, "I", { side: -1 });
    k.current(270, 120, 270, 170, "I_1", { side: -1 });
    k.current(430, 120, 430, 170, "I_2", { side: -1 });
    k.text(280, 300, "I₁ = I × R₂/(R₁+R₂) = 4 mA,  I₂ = I × R₁/(R₁+R₂) = 2 mA", { size: 13, weight: 600 });
  } };

  D.kcl = { title: "Kirchhoff's Current Law (KCL)", w: 560, h: 320, draw(k) {
    const cx = 280, cy = 150;
    k.wire([90, cy], [470, cy]); k.wire([cx, 30], [cx, 270]);
    k.dot(cx, cy);
    k.text(cx + 18, cy - 16, "Node", { size: 13, weight: 700, anchor: "start" });
    k.current(120, cy - 18, 200, cy - 18, "I_1 = 5 A", { side: -1 });
    k.current(cx - 18, 50, cx - 18, 110, "I_2 = 3 A", { side: 1 });
    k.current(360, cy - 18, 440, cy - 18, "I_3 = 6 A", { side: -1 });
    k.current(cx + 18, 190, cx + 18, 250, "I_4 = 2 A", { side: -1 });
    k.text(cx, 300, "Σ I entering = Σ I leaving:  I₁ + I₂ = I₃ + I₄  →  5 + 3 = 6 + 2", { size: 13, weight: 600 });
  } };

  D.kvl = { title: "Kirchhoff's Voltage Law (KVL)", w: 560, h: 330, draw(k) {
    k.battery(90, 100, 90, 220, "V", { side: -1, value: "12 V" });
    k.wire([90, 100], [90, 60], [190, 60]);
    k.resistor(190, 60, 310, 60, "R_1", { side: -1, value: "2 Ω" });
    k.wire([310, 60], [420, 60], [420, 100]);
    k.resistor(420, 100, 420, 220, "R_2", { side: 1, value: "4 Ω" });
    k.wire([420, 220], [420, 260], [90, 260], [90, 220]);
    k.polarity(196, 84, 304, 84, "V_1 = 4 V", 250, 104);
    k.polarity(396, 106, 396, 214, "V_2 = 8 V", 345, 128);
    // loop direction
    k.raw(`<path d="M220,180 A42,42 0 1 1 262,222" fill="none" stroke="#e0567a" stroke-width="2"/>`);
    k.arrowHead(258, 222, Math.PI, "#e0567a", 10);
    k.text(258, 178, "I = 2 A", { size: 13, weight: 700, color: "#e0567a" });
    k.text(280, 300, "Σ V around a closed loop = 0:  V − V₁ − V₂ = 12 − 4 − 8 = 0", { size: 13, weight: 600 });
  } };

  const theveninOriginal = (k, x0, { load = true, short = false } = {}) => {
    x0 += 50;
    k.battery(x0 + 30, 110, x0 + 30, 230, "", { side: -1 });
    k.text(x0 + 30 - 44, 170, "12 V", { size: 13, weight: 700, anchor: "end" });
    k.wire([x0 + 30, 110], [x0 + 30, 70], [x0 + 60, 70]);
    k.resistor(x0 + 60, 70, x0 + 150, 70, "R_1", { side: -1, value: "6 Ω" });
    k.wire([x0 + 150, 70], [x0 + 230, 70]);
    k.dot(x0 + 180, 70);
    k.wire([x0 + 180, 70], [x0 + 180, 115]);
    k.resistor(x0 + 180, 115, x0 + 180, 205, "R_2", { side: -1, value: "3 Ω" });
    k.wire([x0 + 180, 205], [x0 + 180, 260]);
    k.wire([x0 + 30, 230], [x0 + 30, 260], [x0 + 230, 260]);
    k.dot(x0 + 180, 260);
    k.terminal(x0 + 230, 70, "A", short ? "top" : "right"); k.terminal(x0 + 230, 260, "B", short ? "bottom" : "right");
    if (short) { k.wire([x0 + 236, 70], [x0 + 262, 70], [x0 + 262, 260], [x0 + 236, 260]); k.current(x0 + 280, 130, x0 + 280, 190, "I_{SC}", { side: -1 }); }
    if (load) k.text(x0 + 130, 300, "Find the equivalent seen from A–B", { size: 12, color: "#6b6b78" });
  };

  D.thevenin = { title: "Thevenin's theorem", w: 860, h: 330, draw(k) {
    theveninOriginal(k, 20);
    k.text(400, 165, "⇒", { size: 34, weight: 700, color: "#7a50dc" });
    const x = 540;
    k.battery(x + 30, 110, x + 30, 230, "", { side: -1 });
    k.text(x + 30 - 44, 170, "V_{TH} = 4 V", { size: 13, weight: 700, anchor: "end" });
    k.wire([x + 30, 110], [x + 30, 70], [x + 60, 70]);
    k.resistor(x + 60, 70, x + 160, 70, "R_{TH}", { side: -1, value: "2 Ω" });
    k.wire([x + 160, 70], [x + 230, 70]); k.terminal(x + 230, 70, "A", "top");
    k.wire([x + 30, 230], [x + 30, 260], [x + 230, 260]); k.terminal(x + 230, 260, "B", "bottom");
    k.wire([x + 235, 70], [x + 290, 70], [x + 290, 115]);
    k.resistor(x + 290, 115, x + 290, 215, "R_L", { side: 1, value: "2 Ω" });
    k.wire([x + 290, 215], [x + 290, 260], [x + 235, 260]);
    k.text(x + 150, 300, "V_TH = 12×3/(6+3) = 4 V,  R_TH = 6∥3 = 2 Ω,  I_L = 4/(2+2) = 1 A", { size: 12, weight: 600 });
  } };

  D.norton = { title: "Norton's theorem", w: 860, h: 330, draw(k) {
    theveninOriginal(k, 20, { load: false, short: true });
    k.text(180, 304, "A–B shorted: I_SC = 12/6 = 2 A", { size: 12, color: "#6b6b78" });
    k.text(410, 165, "⇒", { size: 34, weight: 700, color: "#7a50dc" });
    const x = 520;
    k.currentSource(x + 40, 165, "up", "I_N", "2 A");
    k.wire([x + 40, 143], [x + 40, 70], [x + 260, 70]);
    k.wire([x + 40, 187], [x + 40, 260], [x + 260, 260]);
    k.dot(x + 140, 70); k.dot(x + 140, 260);
    k.wire([x + 140, 70], [x + 140, 115]); k.resistor(x + 140, 115, x + 140, 215, "R_N", { side: -1, value: "2 Ω" }); k.wire([x + 140, 215], [x + 140, 260]);
    k.wire([x + 260, 70], [x + 260, 115]); k.resistor(x + 260, 115, x + 260, 215, "R_L", { side: -1, value: "2 Ω" }); k.wire([x + 260, 215], [x + 260, 260]);
    k.text(x + 150, 300, "R_N = R_TH = 2 Ω,  I_L = 2 × 2/(2+2) = 1 A", { size: 12, weight: 600 });
  } };

  D.superposition = { title: "Superposition theorem", w: 640, h: 330, draw(k) {
    k.battery(70, 110, 70, 230, "", {});
    k.text(26, 170, "V_1", { weight: 700, anchor: "end" }); k.text(26, 188, "10 V", { size: 12, anchor: "end", color: "#6b6b78" });
    k.wire([70, 110], [70, 70], [110, 70]);
    k.resistor(110, 70, 210, 70, "R_1", { side: -1, value: "5 Ω" });
    k.wire([210, 70], [400, 70]);
    k.dot(300, 70); k.text(300, 50, "A", { weight: 800 });
    k.resistor(400, 70, 500, 70, "R_2", { side: -1, value: "5 Ω" });
    k.wire([500, 70], [550, 70], [550, 110]);
    k.battery(550, 110, 550, 230, "", { side: 1 });
    k.text(600, 170, "V_2", { weight: 700, anchor: "start" }); k.text(600, 188, "5 V", { size: 12, anchor: "start", color: "#6b6b78" });
    k.wire([300, 70], [300, 115]); k.resistor(300, 115, 300, 215, "R_3", { side: 1, value: "10 Ω" }); k.wire([300, 215], [300, 260]);
    k.wire([70, 230], [70, 260], [550, 260], [550, 230]);
    k.dot(300, 260);
    k.current(330, 125, 330, 175, "I_3", { side: -1 });
    k.text(320, 300, "V₁ alone: V_A = 4 V,  V₂ alone: V_A = 2 V  →  V_A = 6 V,  I₃ = 0.6 A", { size: 12, weight: 600 });
  } };

  D.maxpower = { title: "Maximum power transfer theorem", w: 720, h: 330, draw(k) {
    k.raw('<g transform="translate(40,0)">');
    k.battery(60, 110, 60, 230, "", {});
    k.text(16, 170, "V_{TH}", { weight: 700, anchor: "end" });
    k.wire([60, 110], [60, 70], [90, 70]);
    k.resistor(90, 70, 190, 70, "R_{TH}", { side: -1 });
    k.wire([190, 70], [270, 70], [270, 115]);
    k.resistor(270, 115, 270, 215, "R_L", { side: 1, variable: true });
    k.wire([270, 215], [270, 260], [60, 260], [60, 230]);
    k.current(210, 52, 250, 52, "I", { side: -1 });
    k.raw("</g>");
    // P vs RL curve
    const ox = 420, oy = 260, w = 260, h = 180;
    k.line([[ox, oy], [ox + w + 10, oy]], "#4b5563", 1.6); k.arrowHead(ox + w + 14, oy, 0, "#4b5563", 8);
    k.line([[ox, oy], [ox, oy - h - 10]], "#4b5563", 1.6); k.arrowHead(ox, oy - h - 14, -Math.PI / 2, "#4b5563", 8);
    const p = [];
    for (let i = 1; i <= 120; i++) { const rl = (i / 120) * 4; const P = rl / ((1 + rl) ** 2) * 4; p.push([ox + (rl / 4) * w, oy - P * h]); }
    k.line(p, "#7a50dc", 2.6);
    k.line([[ox + w / 4, oy], [ox + w / 4, oy - h]], "#e0567a", 1.4, 'stroke-dasharray="5 4"');
    k.text(ox + w / 4, oy + 16, "R_L = R_TH", { size: 12, weight: 700, color: "#e0567a" });
    k.text(ox + w / 4 + 8, oy - h - 4, "P_max", { size: 12, weight: 700, anchor: "start" });
    k.text(ox + w, oy + 16, "R_L", { size: 12, anchor: "end" });
    k.text(ox - 8, oy - h, "P", { size: 12, anchor: "end" });
    k.text(350, 306, "P_max = V_TH² / (4 R_TH) when R_L = R_TH (efficiency 50%)", { size: 13, weight: 600 });
  } };

  /**
   * Render a diagram to an SVG string.
   * @param {string} id
   * @param {{ink?:string, accent?:string, current?:string, background?:string}} opts
   */
  function render(id, opts = {}) {
    const d = D[id];
    if (!d) return "";
    const o = { ink: "#1f2937", accent: "#7a50dc", current: "#1f9d6b", background: "#ffffff", font: "Inter, Arial, sans-serif", ...opts };
    const k = kit(o);
    d.draw(k);
    const bg = o.background === "none" ? "" : `<rect width="100%" height="100%" fill="${o.background}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.w} ${d.h}" width="${d.w}" height="${d.h}" role="img" aria-label="${esc(d.title)}">${bg}${k.svg}</svg>`;
  }

  root.NotesCircuits = { render, list: () => Object.entries(D).map(([id, d]) => ({ id, title: d.title, w: d.w, h: d.h })) };
})(window);
