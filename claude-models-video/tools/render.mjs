import { chromium } from 'playwright';
import fs from 'fs';
const [,, outDir, spec, port='8765'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
let frames = [];
for (const part of spec.split(',')) { const [a, b] = part.split('-').map(Number); if (b === undefined) frames.push(a); else for (let i = a; i <= b; i++) frames.push(i); }
if (process.env.RESUME) frames = frames.filter(f => !fs.existsSync(`${outDir}/f${String(f).padStart(4,'0')}.jpg`));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
page.on('pageerror', e => { console.log('PAGEERR', e.message); process.exit(1); });
await page.goto(`http://localhost:${port}/web/index.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const t0 = Date.now(); let n = 0;
for (const f of frames) {
  const url = await page.evaluate((f) => window.renderFrame(f), f);
  fs.writeFileSync(`${outDir}/f${String(f).padStart(4,'0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  n++; if (n % 20 === 0 || n === frames.length) console.log(`done ${n}/${frames.length} f${f} ${((Date.now()-t0)/n/1000).toFixed(2)}s/f`);
}
await browser.close();
