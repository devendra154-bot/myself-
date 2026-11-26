/* DevInventor Notes: read text from PDF, Word, text files and photos (OCR), in the browser.
 * Photos: fixes phone rotation (EXIF), detects sideways/upside-down pages, removes shadows,
 * resizes huge camera images, and refuses to insert unreadable "garbage" text.
 */
(function (root) {
  "use strict";

  const loaded = {};
  const loadScript = (src) => (loaded[src] ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { delete loaded[src]; reject(new Error("Couldn't download a reading tool. Check your internet connection and try again.")); };
    document.head.appendChild(s);
  }));

  // ---------- PDF / Word / text ----------
  async function readPDF(file, progress) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const pdfjs = root.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      progress?.(p / doc.numPages, `Reading page ${p} of ${doc.numPages}…`);
      const content = await (await doc.getPage(p)).getTextContent();
      let lastY = null, line = "";
      const lines = [];
      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ""; }
        line += item.str + (item.hasEOL ? "\n" : "");
        lastY = y;
      }
      lines.push(line.trim());
      pages.push(lines.join("\n"));
    }
    const text = pages.join("\n\n");
    if (!text.trim()) throw new Error("This PDF is scanned (it has no text inside). Take photos of the pages and upload them instead.");
    return text;
  }

  async function readDOCX(file) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    return (await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }

  // ---------- photo preparation ----------
  /** Decode with the phone's rotation applied (EXIF), resize to an OCR-friendly size. */
  async function loadPhoto(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch {
      src = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("This photo couldn't be opened. Try a JPG or PNG photo.")); img.src = URL.createObjectURL(file); });
    }
    const w0 = src.width, h0 = src.height;
    const long = Math.max(w0, h0);
    const scale = long > 2400 ? 2400 / long : long < 1400 ? 1400 / long : 1;
    const c = document.createElement("canvas");
    c.width = Math.round(w0 * scale);
    c.height = Math.round(h0 * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  /** Grayscale + shadow removal (divide by blurred background) + contrast stretch. */
  function cleanPhoto(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const gray = new Float32Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

    // background = heavily blurred small copy (paper colour incl. shadows)
    const sw = Math.max(8, Math.round(w / 24)), sh = Math.max(8, Math.round(h / 24));
    const small = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      // take the brightest-ish value in each cell so ink doesn't darken the background
      let best = 0;
      const x0 = Math.floor((x * w) / sw), x1 = Math.floor(((x + 1) * w) / sw), y0 = Math.floor((y * h) / sh), y1 = Math.floor(((y + 1) * h) / sh);
      for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) { const v = gray[yy * w + xx]; if (v > best) best = v; }
      small[y * sw + x] = best;
    }
    const blur = (a) => {
      const o = new Float32Array(a.length);
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        let s = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < sh && xx >= 0 && xx < sw) { s += a[yy * sw + xx]; n++; } }
        o[y * sw + x] = s / n;
      }
      return o;
    };
    const bg = blur(blur(small));
    const bgAt = (x, y) => {
      const fx = Math.min(sw - 1.001, Math.max(0, (x / w) * sw - 0.5)), fy = Math.min(sh - 1.001, Math.max(0, (y / h) * sh - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
      const i = y0 * sw + x0;
      return (bg[i] * (1 - ax) + bg[i + 1] * ax) * (1 - ay) + (bg[i + sw] * (1 - ax) + bg[i + sw + 1] * ax) * ay;
    };
    const norm = new Float32Array(w * h);
    const hist = new Uint32Array(256);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = y * w + x;
      const v = Math.min(255, (gray[j] / Math.max(30, bgAt(x, y))) * 235);
      norm[j] = v;
      hist[v | 0]++;
    }
    // contrast stretch between the 1st and 99th percentile
    const total = w * h;
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > total * 0.01) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > total * 0.01) { hi = v; break; } }
    const range = Math.max(40, hi - lo);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const v = Math.max(0, Math.min(255, ((norm[j] - lo) / range) * 255));
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  function rotate(canvas, deg) {
    if (!deg) return canvas;
    const c = document.createElement("canvas");
    const swap = deg % 180 !== 0;
    c.width = swap ? canvas.height : canvas.width;
    c.height = swap ? canvas.width : canvas.height;
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return c;
  }

  function shrink(canvas, long = 1100) {
    const s = Math.min(1, long / Math.max(canvas.width, canvas.height));
    if (s === 1) return canvas;
    const c = document.createElement("canvas");
    c.width = Math.round(canvas.width * s);
    c.height = Math.round(canvas.height * s);
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c;
  }

  /** Share of tokens that look like real words (a quick "is this garbage?" check). */
  function wordQuality(text) {
    const tokens = String(text).split(/\s+/).filter((t) => t.length > 1);
    if (tokens.length < 3) return 0;
    const good = tokens.filter((t) => /^[("'“]?[A-Za-z][a-z]*(?:['’][a-z]+)?[.,;:!?)"'”]*$/.test(t) && /[aeiouy]/i.test(t) || /^[A-Z0-9]{1,5}[.,:)]*$/.test(t) || /[=+→²]/.test(t));
    return good.length / tokens.length;
  }

  /** Remove junk lines and join lines broken by the camera's line wrap. */
  function tidy(text) {
    const lines = String(text).replace(/\r/g, "").replace(/-\n(?=[a-z])/g, "").split("\n").map((l) => l.trim());
    const keep = lines.filter((l) => !l || ((l.match(/[A-Za-z0-9]/g) || []).length >= Math.max(2, l.length * 0.5)));
    const out = [];
    for (const l of keep) {
      const prev = out[out.length - 1];
      if (l && prev && !/[.:;?!)]$/.test(prev) && /^[a-z(]/.test(l) && prev.length > 25) out[out.length - 1] = prev + " " + l;
      else out.push(l);
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }


  /**
   * Fix common photo-reading (OCR) mistakes in study notes and add structure the
   * handwriting maker understands (# heading, ## sub-heading, - point).
   * Conservative: formula fixes only touch lines that contain "=".
   */
  function fixNotes(text) {
    const BULLET = /^\s*(?:[«»•·▪■□◦○●*+©®¢°¬>~]|[eo](?=\s+[A-Z]))\s+/;
    let first = true;
    return String(text).split("\n").map((raw) => {
      let l = raw.trim();
      if (!l) return "";
      // a short first line like "Transistors" is the page title
      if (first) {
        first = false;
        if (/^[A-Z][\w'’()&,-]*(\s+[\w'’()&,-]+){0,4}$/.test(l) && l.length <= 50 && !/^\d/.test(l)) return "# " + l;
      }
      // bullet glyphs the reader gets wrong → "- "
      if (BULLET.test(l)) l = "- " + l.replace(BULLET, "");
      const words = l.replace(/^[-#]\s*/, "").split(/\s+/);
      const letters = l.replace(/[^A-Za-z]/g, "");
      // headings
      if (/^(unit|chapter|module|lesson|part)\s*[-–:.]?\s*[0-9IVX]+\b/i.test(l) && l.length <= 80 && !/[.]$/.test(l)) return "# " + l;
      if (letters.length >= 6 && letters === letters.toUpperCase() && words.length >= 2 && words.length <= 8 && !/[=.]$/.test(l) && !l.includes("=")) return "# " + l;
      if (/^\d{1,2}(\.\d{1,2})+\.?\s+[A-Z]/.test(l) && l.length <= 70 && !/[.:]$/.test(l) && !l.includes("=")) return "## " + l;
      // formulas
      if (l.includes("=")) {
        l = l
          .replace(/(^|:\s*)1(?=\s*=)/g, "$1I")                     // "1 = …" → "I = …" (a lone 1 is never the left side)
          .replace(/(^|[\s=(+\-−/×:[|])1(?=[A-Z])/g, "$1I")        // 1C → IC, 1B → IB
          .replace(/(^|[\s=(+\-−/×:])1(?=\s*[x×]\s*[A-Za-z(])/g, "$1I") // =1xR → =I×R
          .replace(/([x×]\s*)1(?=\s*($|[=)+\-−/,]))/g, "$1I")         // V x1= → V×I=
          .replace(/(?<=[A-Za-z0-9)\]])\s*[xX]\s*(?=[A-Z(])/g, " × ")  // V x I → V × I
          .replace(/(?<=[A-Za-z0-9)])\s*[[|]\s*(?=[A-Za-z0-9(])/g, " / ") // IC [IB → IC / IB
          .replace(/\s~\s?(?=\d+(\.\d+)?\s*[A-Za-zΩ%°µ])/g, " ≈ ")     // ~ 26 mV → ≈ 26 mV
          .replace(/\s~\s?(?=\d+\s*\))/g, " − ")                         // (… ~ 1) → (… − 1)
          .replace(/\s*=\s*/g, " = ")
          .replace(/\s{2,}/g, " ");
      }
      // AC — DC → AC → DC (short capital words on both sides of a long dash)
      l = l.replace(/\b([A-Z]{1,5})\s+[—–]\s+([A-Z]{1,5})\b/g, "$1 → $2");
      return l;
    })
      // photos put gaps between most lines: keep a blank line only before headings
      .filter((l, i, a) => l || (a[i + 1] || "").startsWith("#"))
      .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  let workerP = null;
  async function getWorker(progress) {
    await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
    if (!workerP) {
      workerP = root.Tesseract.createWorker("eng", 1, {
        logger: (m) => { if (m.status === "recognizing text") getWorker.onProgress?.(m.progress); },
      }).then(async (w) => { await w.setParameters({ preserve_interword_spaces: "1" }); return w; })
        .catch((e) => { workerP = null; throw new Error("Couldn't start the photo reader. Check your internet connection and try again."); });
    }
    return workerP;
  }

  /**
   * Read one photo. Returns { text, confidence, quality, rotated }.
   * Tries the right rotation automatically when the first read looks wrong.
   */
  async function readPhoto(file, progress) {
    progress?.(0.03, "Loading the photo reader (first time only, about 10 MB)…");
    const worker = await getWorker();
    progress?.(0.1, "Preparing the photo…");
    const base = cleanPhoto(await loadPhoto(file));

    // 1) quick look at small copies to find the right way up
    progress?.(0.15, "Checking which way up the page is…");
    getWorker.onProgress = null;
    const test = async (deg) => { const { data } = await worker.recognize(shrink(rotate(base, deg))); return { deg, conf: data.confidence, q: wordQuality(data.text) }; };
    let best = await test(0);
    if (best.conf < 70 || best.q < 0.6) {
      for (const deg of [90, 270, 180]) {
        const r = await test(deg);
        if (r.conf * (0.5 + r.q) > best.conf * (0.5 + best.q)) best = r;
        if (best.conf >= 75 && best.q >= 0.7) break;
      }
    }

    // 2) full-quality read in the best direction
    getWorker.onProgress = (p) => progress?.(0.3 + p * 0.68, `Reading text from photo… ${Math.round(p * 100)}%`);
    const { data } = await worker.recognize(rotate(base, best.deg));
    getWorker.onProgress = null;
    const text = fixNotes(tidy(data.text));
    return { text, confidence: Math.round(data.confidence), quality: wordQuality(text), rotated: best.deg };
  }

  /**
   * Read any supported file. Returns { text, warning? }.
   * Throws a friendly Error when nothing usable could be read.
   */
  async function read(file, progress) {
    if (!file) throw new Error("No file selected.");
    if (file.size > 30 * 1024 * 1024) throw new Error("File is too big (max 30 MB).");
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf") || file.type === "application/pdf") return { text: await readPDF(file, progress) };
    if (name.endsWith(".docx")) return { text: await readDOCX(file) };
    if (name.endsWith(".doc")) throw new Error("Old .doc files aren't supported. Save it as .docx or PDF and try again.");
    if (/\.(txt|md)$/.test(name) || file.type.startsWith("text/")) return { text: await file.text() };
    if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|bmp)$/.test(name)) {
      if (/heic|heif/.test(file.type + name)) throw new Error("HEIC photos aren't supported by browsers. On iPhone: Settings → Camera → Formats → Most Compatible, or share the photo as JPG.");
      const r = await readPhoto(file, progress);
      const nWords = r.text.split(/\s+/).filter((t) => /[A-Za-z]{2,}/.test(t)).length;
      if (nWords < 4 || r.quality < 0.3 || r.confidence < 35 || (nWords < 15 && r.confidence < 65)) {
        throw new Error("Couldn't read this photo clearly. Tips: good light, no shadow, hold the phone flat above the page, fill the screen with the text, and keep it in focus. Printed text works best.");
      }
      const warning = r.confidence < 65 || r.quality < 0.65
        ? "Some words may be wrong (photo not very clear). Please check the text before using it."
        : "Text read from photo. Please check it for mistakes.";
      return { text: r.text, warning, confidence: r.confidence, rotated: r.rotated };
    }
    throw new Error("Unsupported file. Use PDF, Word (.docx), TXT or a photo (JPG/PNG).");
  }

  root.NotesReaders = { read, readPhoto, loadScript, fixNotes, _tidy: tidy, _quality: wordQuality };
})(window);
