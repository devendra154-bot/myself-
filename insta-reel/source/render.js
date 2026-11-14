const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
const [mode,a,b,out,handle]=process.argv.slice(2);
(async()=>{
 const tl=fs.readFileSync('timeline.json','utf8');
 fs.writeFileSync('page.html',fs.readFileSync(process.env.SRC||'index.html','utf8').replace('__TIMELINE__',tl));
 const br=await chromium.launch();const pg=await br.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 pg.on('pageerror',e=>console.error('PAGEERR',e.message));
 await pg.goto('file://'+process.cwd()+'/page.html?h='+encodeURIComponent(handle||'@your_handle'));
 await pg.waitForFunction('window.READY');await pg.evaluate(()=>document.fonts.ready);
 if(mode==='stills'){for(const t of a.split(',')){await pg.evaluate(t=>seek(t),+t);await pg.waitForTimeout(50);await pg.screenshot({path:`still_${t}.jpg`,type:'jpeg',quality:80});}}
 else{const fps=30,f0=+a,f1=+b;
  const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',out]);
  for(let f=f0;f<f1;f++){await pg.evaluate(t=>seek(t),f/fps);const buf=await pg.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(f%300==0)console.log(out,f);}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));}
 await br.close();})();
