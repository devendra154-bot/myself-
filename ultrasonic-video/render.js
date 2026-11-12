// Renders index.html frame-by-frame with Playwright and muxes with assets/audio.m4a.
// Usage: node render.js            -> ultrasonic-sensor.mp4
//        node render.js --preview 1.5 12 22 31 41   -> preview PNGs in ./preview
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');

const DIR = __dirname;
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.m4a': 'audio/mp4', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/index.html?render`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  const tl = JSON.parse(fs.readFileSync(path.join(DIR, 'assets/timeline.json')));
  const grab = async t => {
    const b64 = await page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', .93).split(',')[1]; }, t);
    return Buffer.from(b64, 'base64');
  };

  const pi = process.argv.indexOf('--preview');
  if (pi > 0) {
    fs.mkdirSync(path.join(DIR, 'preview'), { recursive: true });
    for (const t of process.argv.slice(pi + 1).map(Number)) fs.writeFileSync(path.join(DIR, 'preview', `t${t}.jpg`), await grab(t));
  } else {
    const out = path.join(DIR, 'ultrasonic-sensor.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(tl.fps), '-c:v', 'mjpeg', '-i', '-',
      '-i', path.join(DIR, 'assets/audio.m4a'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = tl.duration * tl.fps;
    for (let f = 0; f < n; f++) {
      const buf = await grab(f / tl.fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${n}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', out);
  }
  await browser.close(); server.close();
})();
