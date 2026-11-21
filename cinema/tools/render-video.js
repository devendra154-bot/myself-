const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const TL = JSON.parse(fs.readFileSync('timeline.json'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=1280 height=720></canvas>');
  await p.addScriptTag({ content: fs.readFileSync('' + __dirname + '/../story.js', 'utf8') });
  await p.evaluate(tl => {
    const c = document.getElementById('c'), ctx = c.getContext('2d'), A = Story.art(ctx);
    const end = tl.parts[9].start + tl.parts[9].dur;
    window.frame = T => {
      if (T >= end) A.endCard(T - end);
      else {
        let i = 0; while (i < 9 && T >= tl.parts[i + 1].start) i++;
        const P = tl.parts[i], t = T - P.start;
        A.scenes[i](t); A.titleCard(i, t);
        let sub = ""; for (const s of P.sents) if (t >= s.start - .05 && t < s.end + .3) sub = s.text;
        A.subtitle(sub);
        if (i === 0 && T < 4.5) { const a = Math.min(1, T / 1, (4.5 - T) / 1); ctx.globalAlpha = a * .55; ctx.fillStyle = '#000'; ctx.fillRect(0, 250, 1280, 180); ctx.globalAlpha = a;
          ctx.fillStyle = '#f5c542'; ctx.font = 'bold 96px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('THE LAST TICKET', 640, 320);
          ctx.fillStyle = '#eee'; ctx.font = '28px Georgia, serif'; ctx.fillText('a DevInventor Mini Cinema film', 640, 395); ctx.globalAlpha = 1; }
        // fade through black at part boundaries
        const d = Math.min(t, P.dur - t); if (d < .35) { ctx.fillStyle = `rgba(0,0,0,${1 - d / .35})`; ctx.fillRect(0, 0, 1280, 720); }
      }
      A.grain();
      const fin = tl.total - T; if (fin < 1.5) { ctx.fillStyle = `rgba(0,0,0,${1 - fin / 1.5})`; ctx.fillRect(0, 0, 1280, 720); }
      return c.toDataURL('image/jpeg', .9).slice(23);
    };
  }, TL);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-', '-i', 'soundtrack.wav',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', 'The_Last_Ticket.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.floor(TL.total * TL.fps);
  for (let f = 0; f < total; f += 48) {
    const batch = await p.evaluate(([f0, n, fps]) => { const out = []; for (let k = 0; k < n; k++) out.push(frame((f0 + k) / fps)); return out; }, [f, Math.min(48, total - f), TL.fps]);
    for (const s of batch) if (!ff.stdin.write(Buffer.from(s, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 960 === 0) console.log('frame', f, '/', total);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done');
})();
