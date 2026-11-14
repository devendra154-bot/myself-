import json,re,subprocess,numpy as np
from scipy.io import wavfile
from script import LINES; from v1lines import V1
cmp=json.load(open('cmp.json'))['v1']['per']
SRC='../up/rec.wav'
# 1. clean audio first (denoise, hp, gentle comp) at 48k mono
subprocess.run(['ffmpeg','-v','error','-y','-i',SRC,'-af','highpass=f=85,afftdn=nf=-28,equalizer=f=200:t=q:w=1:g=1.5,equalizer=f=4000:t=q:w=1.2:g=2,deesser,acompressor=threshold=-20dB:ratio=3:attack=5:release=90','-ar','48000','-ac','1','user_clean.wav'],check=True)
sr,y=wavfile.read('user_clean.wav'); y=y.astype(np.float32)/32768
out=subprocess.run(['ffmpeg','-i','user_clean.wav','-af','silencedetect=noise=-38dB:d=0.3','-f','null','-'],capture_output=True,text=True).stderr
ss=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]; se=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
dur=len(y)/sr
# speech segments
segs=[];cur=0.0
for a,b in zip(ss,se+[dur]):
    if a>cur+0.05: segs.append((cur,a))
    cur=b
if cur<dur-0.05: segs.append((cur,dur))
segs=[(max(0,a-0.08),min(dur,b+0.12)) for a,b in segs if b-a>0.12]
# 2. rebuild audio with capped gaps
LEAD=0.6; MAXGAP=0.5
pieces=[np.zeros(int(LEAD*sr))]; mp=[]; t=LEAD; prev_end=None
for a,b in segs:
    if prev_end is not None:
        g=min(a-prev_end,MAXGAP); g=max(g,0); pieces.append(np.zeros(int(g*sr))); t+=g
    seg=y[int(a*sr):int(b*sr)].copy(); n=len(seg); f=min(int(.02*sr),n//2)
    seg[:f]*=np.linspace(0,1,f); seg[-f:]*=np.linspace(1,0,f)
    mp.append((a,b,t)); pieces.append(seg); t+=n/sr; prev_end=b
voice=np.concatenate(pieces)
def m(x):
    for a,b,t0 in mp:
        if x<a: return t0
        if x<=b: return t0+(x-a)
    a,b,t0=mp[-1]; return t0+(b-a)
# 3. line times from DTW, snapped to segment edges
starts=[s[0] for s in segs]; ends=[s[1] for s in segs]
lines=[]
for i,(sc,te,cap) in enumerate(LINES):
    if i in V1: sc,te,cap=V1[i]
    c,ra,rb=cmp[i]
    sa=min(starts,key=lambda x:abs(x-ra)); sb=min(ends,key=lambda x:abs(x-rb))
    a=sa if abs(sa-ra)<0.45 else ra; b=sb if abs(sb-rb)<0.45 else rb
    lines.append(dict(i=i,scene=sc,cap=cap,te=te,start=round(m(a),3),end=round(m(b),3)))
for k in range(1,len(lines)):
    if lines[k]['start']<lines[k-1]['end']: lines[k]['start']=lines[k-1]['end']
total=t+2.4
wavfile.write('voice.wav',sr,(np.clip(voice/np.max(np.abs(voice))*0.9,-1,1)*32767).astype(np.int16))
json.dump(dict(lines=[{**l,'file':None} for l in lines],total=round(total,3),user=True),open('timeline.json','w'),indent=1)
print('orig',round(dur,2),'new voice',round(t,2),'total',round(total,2))
for l in lines: print(l['i'],l['scene'],l['start'],l['end'],l['cap'][:50])
