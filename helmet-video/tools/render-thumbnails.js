const { chromium } = require('playwright');
const path = require('path');
// Renders the 3 A/B cover thumbnails (1080x1920) with headless Chromium.
// Usage (from repo root):  node helmet-video/tools/render-thumbnails.js
// Swap a frame: replace the file in tools/frames/ (or edit `frame:` below) and re-run.
const fs = require('fs');
const T = __dirname;                                  // helmet-video/tools
const OUT = path.join(T, '..', 'thumbnails');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'thumbs-'));
const fontCss = `
@font-face{font-family:Rama;src:url(file://${T}/fonts/ramabhadra-telugu-400-normal.woff2)}
@font-face{font-family:NotoTe;font-weight:900;src:url(file://${T}/fonts/noto-sans-telugu-telugu-900-normal.woff2)}
@font-face{font-family:NotoTe;font-weight:900;src:url(file://${T}/fonts/noto-sans-telugu-latin-900-normal.woff2);unicode-range:U+0000-00FF,U+20B9}
@font-face{font-family:Anton;src:url(file://${T}/fonts/anton-latin-400-normal.woff2)}`;
const versions = [
  { id: 'A_phone_cover', frame: 'f_2.2.jpg', tag: 'A',
    top: `<span class="pill">₹500 ఫోన్ కవర్ ✅</span>`,
    main: `తలకి కవర్? <span class="emo">🤔</span>`, mainSize: 168 },
  { id: 'B_hairstyle', frame: 'f_2.7.jpg', tag: 'B',
    top: `<span class="pill">స్టైల్ ముఖ్యమా? 😏</span>`,
    main: `హెయిర్‌స్టైల్<br><span class="gt">&gt;</span> ప్రాణం? <span class="emo">🤨</span>`, mainSize: 140 },
  { id: 'C_amma', frame: 'f_9.3.jpg', tag: 'C',
    top: `<span class="pill">పోలీసుల కోసం కాదు...</span>`,
    main: `అమ్మ కోసం <span class="emo">❤️</span>`, mainSize: 176, warm: true },
];
const html = v => `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;position:relative;background:#111}
.bg{position:absolute;inset:-60px;background:url(file://${T}/frames/${v.frame}) center/cover;filter:blur(38px) brightness(.55) saturate(1.2)}
.fg{position:absolute;left:50%;top:560px;width:1080px;height:1920px;transform:translateX(-50%) scale(.72);transform-origin:top center;
  background:url(file://${T}/frames/${v.frame}) center/cover;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 18%,#000 100%),linear-gradient(to right,transparent 0,#000 8%,#000 92%,transparent 100%);
  -webkit-mask-composite:source-in;mask-composite:intersect}
.shade{position:absolute;left:0;right:0;top:0;height:900px;background:linear-gradient(to bottom,rgba(0,0,0,.72),rgba(0,0,0,0))}
${v.warm ? '.warm{position:absolute;inset:0;background:radial-gradient(circle at 50% 62%,rgba(255,170,60,.22),transparent 60%);mix-blend-mode:screen}' : ''}
.txt{position:absolute;left:50px;right:50px;top:262px;text-align:center}
.pill{display:inline-block;font-family:NotoTe,sans-serif;font-weight:900;font-size:54px;color:#fff;background:#E1141E;padding:10px 34px 16px;border-radius:60px;
  box-shadow:0 8px 24px rgba(0,0,0,.45);border:4px solid #fff}
.main{margin-top:26px;font-family:Rama,NotoTe,sans-serif;font-size:${v.mainSize}px;line-height:1.32;color:#FFD400;
  -webkit-text-stroke:18px #000;paint-order:stroke fill;text-shadow:0 10px 0 #000,0 18px 30px rgba(0,0,0,.6)}
.gt{font-family:Anton,sans-serif;color:#fff}
.emo{-webkit-text-stroke:0;font-size:.82em;vertical-align:.04em}
.brand{position:absolute;left:0;right:0;top:1560px;text-align:center}
.brand span{font-family:NotoTe,sans-serif;font-weight:900;font-size:44px;color:#fff;background:rgba(0,0,0,.55);padding:8px 28px 14px;border-radius:14px}
</style></head><body>
<div class="bg"></div><div class="fg"></div><div class="shade"></div>${v.warm ? '<div class="warm"></div>' : ''}
<div class="txt">${v.top}<div class="main">${v.main}</div></div>

</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const v of versions) {
    const f = path.join(TMP, `${v.id}.html`); fs.writeFileSync(f, html(v)); await p.goto(`file://${f}`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const out = path.join(OUT, `Thumbnail_${v.id}.png`);
    await p.screenshot({ path: out });
    console.log(out);
  }
  await b.close();
})();
