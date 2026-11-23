// Render The Extra Seat - Part 3 to MP4.
// Usage: node render.js <timeline.json> <mix.wav> <out.mp4> [--stills t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [tlPath, mixPath, outPath] = process.argv.slice(2);
  const stillsArg = process.argv.indexOf('--stills');
  const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  const scenes = await page.evaluate(t => window.init(t), tl);
  console.log('scenes', JSON.stringify(scenes));
  const grab = async t => {
    const b64 = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('cv').toDataURL('image/jpeg', 0.93).split(',')[1]; }, t);
    return Buffer.from(b64, 'base64');
  };
  if (stillsArg > 0) {
    const ts = process.argv[stillsArg + 1].split(',').map(Number);
    fs.mkdirSync(outPath, { recursive: true });
    for (const t of ts) fs.writeFileSync(path.join(outPath, `still_${t.toFixed(2)}.jpg`), await grab(t));
    await browser.close(); return;
  }
  const fps = tl.fps, n = Math.round(tl.duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', mixPath, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < n; f++) {
    const buf = await grab(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(`frame ${f}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', outPath);
})();
