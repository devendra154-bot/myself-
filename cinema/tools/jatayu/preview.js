const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setContent('<canvas id=c width=720 height=1280></canvas>');
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/art.js', 'utf8') });
  const shots = await p.evaluate(() => { const c = document.getElementById('c'), ctx = c.getContext('2d'), A = JatayuArt.make(ctx); const out = [];
    [[0, 3, 7], [1, 5, 9], [2, 6, 8], [3, 2.2, 9], [4, 4.2, 8], [5, 3, 8], [6, 5, 8], [1, 2, 9]].forEach(([i, t, d]) => { A.scenes[i](t, d); out.push(c.toDataURL('image/png').slice(22)); }); return out; });
  shots.forEach((s, i) => fs.writeFileSync(process.argv[2] + `/j${i}.png`, Buffer.from(s, 'base64')));
  console.log(errs); await b.close();
})();
