/* ================= PUPPET RIG ================= */
const PW=561,PH=1000,SC=PH/1791;
document.getElementById('pupScale').style.transform=`scale(${SC})`;
const POS=document.getElementById('pupPos'),ACT=document.getElementById('pupAct'),FLIP=document.getElementById('pupFlip'),HEAD=document.getElementById('headG');
HEAD.style.transformOrigin=`${490-330}px ${342-40}px`;
// mouth shapes (head-local coords), drawn in his cartoon style
const MX=474-330,MY=309-40;
function mouthSVG(o){const ry=3+o*15,w=30+o*4;
 const outer=`M${-w} -4 Q0 -2 ${w} -7 Q${w*.6} ${ry*1.6} 0 ${ry*1.7} Q${-w*.6} ${ry*1.6} ${-w} -4Z`;
 return `<svg class="mouth" style="left:${MX-50}px;top:${MY-40}px" width="100" height="80" viewBox="-50 -40 100 80"><g transform="rotate(-6)">${o<.1?`<path d="M${-w} -2 Q0 10 ${w} -6" fill="none" stroke="#3a1d12" stroke-width="4.5" stroke-linecap="round"/>`:`<defs><clipPath id="mc${Math.round(o*100)}"><path d="${outer}"/></clipPath></defs><path d="${outer}" fill="#3a1410" stroke="#2a0f0a" stroke-width="2.5"/><g clip-path="url(#mc${Math.round(o*100)})"><rect x="${-w}" y="-10" width="${2*w}" height="${8+o*3}" fill="#fff"/><ellipse cx="0" cy="${ry*1.6}" rx="${w*.55}" ry="${4+o*6}" fill="#d9535a"/></g>`}</g></svg>`;}
const MO=document.getElementById('mouths');const shapes=[0,.28,.58,.92].map(o=>add(MO,mouthSVG(o)));
// discrete lip-sync: choose shape per frame from voice loudness
(function(){const n=Math.ceil(T*30);const sel=[];for(let f=0;f<n;f++){const e=TALK[f]||0;sel.push(e<.12?0:e<.38?1:e<.68?2:3);}
 shapes.forEach((sh,si)=>{const kf=sel.map((v,f)=>({opacity:v===si?1:0,offset:f/(n-1),easing:'steps(1,end)'}));A(sh,kf,0,n/30,'linear','both');});})();
// head motion: talking nods + gentle tilt (10 fps keys)
(function(){const n=Math.ceil(T*10);const kf=[];for(let i=0;i<n;i++){const t=i/10;const e=TALK[Math.round(t*30)]||0;
 const rot=2.2*Math.sin(t*2.6)+e*3.2*Math.sin(t*9.5);const ty=-e*7;kf.push({transform:`translateY(${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`,offset:i/(n-1)});}
 A(HEAD,kf,0,n/10,'linear','both');})();
// body: breathing + talk bounce (additive on ACT)
A(ACT,[{transform:'scale(1,1)'},{transform:'scale(1.006,1.014)'},{transform:'scale(1,1)'}],0,2.6,'ease-in-out','none',{iterations:Math.ceil(T/2.6),composite:'add'});
(function(){const n=Math.ceil(T*10);const kf=[];for(let i=0;i<n;i++){const e=TALK[Math.round(i*3)]||0;kf.push({transform:`translateY(${(-e*8).toFixed(1)}px)`,offset:i/(n-1)});}A(ACT,kf,0,n/10,'linear','none',{composite:'add'});})();
// stage positions per scene
const XL=-30,XR=1080-PW+30,XC=(1080-PW)/2;
const plan={hook:[XL,1.1,1],s1:[XR,1,-1],s2:[XL,1,1],s3:[XR,1,-1],tip:[XL,1,1],cta:[XR,1,-1],follow:[XL,1.08,1]};
let prev=null;
order.forEach((k,i)=>{const [x,k2,fl]=plan[k];const s=sc[k];
 if(!prev){ // walk-in entrance
  A(POS,[{transform:`translate(-700px,0) scale(${k2})`},{transform:`translate(${x}px,0) scale(${k2})`}],.1,1.1,E.out);
  const kf=[];for(let j=0;j<=8;j++)kf.push({transform:`translateY(${j%2?-26:0}px) rotate(${j%2?2:-2}deg)`});A(ACT,kf,.1,1.1,'linear','none',{composite:'add'});
  A(FLIP,[{transform:`scaleX(${fl})`},{transform:`scaleX(${fl})`}],0,.1,'linear','forwards');
 }else{ // hop to new spot, turning mid-air
  const t0=s.start-.5,[px,pk,pf]=prev;
  A(POS,[{transform:`translate(${px}px,0) scale(${pk})`},{transform:`translate(${x}px,0) scale(${k2})`}],t0,.6,E.io,'forwards');
  A(ACT,[{transform:'translateY(0) scale(1,1)'},{transform:'translateY(14px) scale(1.06,.92)',offset:.15},{transform:'translateY(-170px) scale(.96,1.05)',offset:.5},{transform:'translateY(10px) scale(1.06,.93)',offset:.88},{transform:'translateY(0) scale(1,1)'}],t0,.65,'ease-in-out','none',{composite:'add'});
  if(pf!==fl)A(FLIP,[{transform:`scaleX(${pf})`},{transform:`scaleX(${fl})`}],t0+.2,.25,E.io,'forwards');
 }
 prev=[x,k2,fl];});
// helpers to place effects relative to the puppet
function pupState(k){const [x,k2,fl]=plan[k];return {x,k:k2,fl};}
function headXY(k){const p=pupState(k);const hx=(p.fl>0?490:1005-490)*SC*p.k;return [p.x+hx,470+PH-(PH-(40+20)*SC)*p.k];}
function lean(t,k,d=.9){const p=pupState(k);A(ACT,[{transform:'rotate(0)'},{transform:`rotate(${p.fl*4}deg)`,offset:.3},{transform:`rotate(${p.fl*4}deg)`,offset:.7},{transform:'rotate(0)'}],t,d,'ease-in-out','none',{composite:'add'});}
function jump(t){A(ACT,[{transform:'translateY(0) scale(1,1)'},{transform:'translateY(10px) scale(1.05,.94)',offset:.15},{transform:'translateY(-110px) scale(.97,1.04)',offset:.5},{transform:'translateY(8px) scale(1.05,.95)',offset:.85},{transform:'translateY(0) scale(1,1)'}],t,.6,'ease-in-out','none',{composite:'add'});}
function nod(t){A(HEAD,[{transform:'rotate(0)'},{transform:'rotate(6deg) translateY(6px)'},{transform:'rotate(-2deg)'},{transform:'rotate(5deg) translateY(4px)'},{transform:'rotate(0)'}],t,.7,'ease-in-out','none',{composite:'add'});}
const handSVG=`<svg width="270" height="198" viewBox="0 0 150 110"><path d="M8 52 Q8 34 26 34 H86 Q100 34 100 46 Q100 56 88 56 H70 M86 56 Q98 58 96 70 Q94 80 82 80 M82 80 Q92 82 90 92 Q88 102 76 102 H40 Q8 102 8 70 Z" fill="#dd8c61" stroke="#7a3f22" stroke-width="5" stroke-linejoin="round"/><path d="M86 34 H140 Q148 34 148 44 Q148 54 140 54 H96" fill="#dd8c61" stroke="#7a3f22" stroke-width="5" stroke-linejoin="round"/><path d="M0 60 H14" stroke="#efe6db" stroke-width="26"/></svg>`;
function point(t,k,y=800,dur=1.6){const p=pupState(k);const right=p.fl>0;const x=right?p.x+420*p.k:p.x+140-270;
 const h=add(FX,`<div class="abs" style="left:${x}px;top:${y}px;transform-origin:50% 50%">${handSVG}</div>`);
 const sx=right?1:-1;A(h,[{opacity:0,transform:`scaleX(${sx}) translateX(-80px) scale(.5)`},{opacity:1,transform:`scaleX(${sx}) translateX(20px) scale(1)`,offset:.2},{transform:`scaleX(${sx}) translateX(0) scale(1)`,offset:.35},{transform:`scaleX(${sx}) translateX(22px) scale(1)`,offset:.5},{transform:`scaleX(${sx}) translateX(0) scale(1)`,offset:.65},{opacity:1,transform:`scaleX(${sx}) translateX(10px) scale(1)`,offset:.85},{opacity:0,transform:`scaleX(${sx}) translateX(-60px) scale(.6)`}],t,dur,'ease-in-out','both');}
function popAbove(t,k,txt,col='#ff7a45',dur=1.4){const [hx,hy]=headXY(k);const e=add(FX,`<div class="abs" style="left:${hx-50}px;top:${hy-150}px;width:100px;height:100px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Inter Display';font-weight:900;font-size:66px;box-shadow:0 8px 0 rgba(31,42,68,.2)">${txt}</div>`);
 A(e,[{opacity:0,transform:'translateY(30px) scale(.3)'},{opacity:1,transform:'translateY(0) scale(1.1)',offset:.2},{opacity:1,transform:'translateY(-6px) scale(1)',offset:.8},{opacity:0,transform:'translateY(-30px) scale(.8)'}],t,dur,'ease-out','both');}

