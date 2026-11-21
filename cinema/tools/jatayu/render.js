// Usage: node render.js <workdir-with-timeline.json-and-soundtrack.wav> <out.mp4>
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const DIR = process.argv[2], OUT = process.argv[3];
const TL = JSON.parse(fs.readFileSync(DIR + '/timeline.json'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=720 height=1280></canvas>');
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/art.js', 'utf8') });
  await p.evaluate(tl => {
    const c = document.getElementById('c'), ctx = c.getContext('2d'), A = JatayuArt.make(ctx);
    window.frame = T => {
      let i = 0; while (i < tl.scenes.length - 1 && T >= tl.scenes[i + 1].start) i++;
      const S = tl.scenes[i], t = T - S.start, info = {};
      S.lines.forEach(l => { if (info[l.who] === undefined) info[l.who] = l.start; });
      ctx.save(); A.scenes[i](t, S.dur, info); ctx.restore();
      let line = null; for (const l of S.lines) if (t >= l.start - .05 && t < l.end + .35) line = l;
      if (i < tl.scenes.length - 1) A.subtitle(line); else if (line && t < 0) A.subtitle(line);
      const d = Math.min(t, S.dur - t); if (d < .25 && T > .3) { ctx.fillStyle = `rgba(0,0,0,${1 - d / .25})`; ctx.fillRect(0, 0, 720, 1280); }
      if (T < .6) { ctx.fillStyle = `rgba(0,0,0,${1 - T / .6})`; ctx.fillRect(0, 0, 720, 1280); }
      const fin = tl.total - T; if (fin < 1.2) { ctx.fillStyle = `rgba(0,0,0,${1 - fin / 1.2})`; ctx.fillRect(0, 0, 720, 1280); }
      return c.toDataURL('image/jpeg', .9).slice(23);
    };
  }, TL);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-', '-i', DIR + '/soundtrack.wav',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.floor(TL.total * TL.fps);
  for (let f = 0; f < total; f += 60) {
    const batch = await p.evaluate(([f0, n, fps]) => { const o = []; for (let k = 0; k < n; k++) o.push(frame((f0 + k) / fps)); return o; }, [f, Math.min(60, total - f), TL.fps]);
    for (const s of batch) if (!ff.stdin.write(Buffer.from(s, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', total, 'frames');
})();
