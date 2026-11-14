import json, numpy as np, librosa, subprocess, re
SR=16000; HOP=160
tl=json.load(open('timeline.json')); L=tl['lines']
# reference: TTS lines concatenated with 0.3s gaps
ref=[]; bounds=[]; t=0
for l in L:
    y,_=librosa.load(l['file'],sr=SR); bounds.append((t,t+len(y)/SR)); ref.append(y); ref.append(np.zeros(int(.3*SR))); t+=len(y)/SR+.3
ref=np.concatenate(ref)
usr,_=librosa.load('../up/rec.wav',sr=SR,mono=True)
def feat(y):
    m=librosa.feature.mfcc(y=y,sr=SR,n_mfcc=20,hop_length=HOP,n_fft=512)[1:]
    m=(m-m.mean(1,keepdims=True))/(m.std(1,keepdims=True)+1e-6)
    e=librosa.feature.rms(y=y,hop_length=HOP,frame_length=512)[0]; e=np.log(e+1e-4); e=(e-e.mean())/e.std()
    return np.vstack([m,e[None,:m.shape[1]]*2])
R=feat(ref); U=feat(usr)
D,wp=librosa.sequence.dtw(X=R,Y=U,metric='cosine',step_sizes_sigma=np.array([[1,1],[0,1],[1,0]]),weights_mul=np.array([1,1.5,1.5]))
wp=wp[::-1]
def r2u(tr):
    f=int(tr*SR/HOP); idx=np.searchsorted(wp[:,0],f); idx=min(idx,len(wp)-1); return wp[idx,1]*HOP/SR
# silence map of user audio
out=subprocess.run(['ffmpeg','-i','../up/rec.wav','-af','silencedetect=noise=-35dB:d=0.3','-f','null','-'],capture_output=True,text=True).stderr
ss=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]; se=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
onsets=[0.0]+se; offsets=ss+[len(usr)/SR]
res=[]
for (a,b),l in zip(bounds,L):
    ua,ub=r2u(a),r2u(b)
    sa=min(onsets,key=lambda x:abs(x-ua)); sb=min(offsets,key=lambda x:abs(x-ub))
    res.append(dict(i=l['i'],raw=(round(ua,2),round(ub,2)),snap=(round(sa,2),round(sb,2)),tts=round(b-a,2),cap=l['cap'][:45]))
for r in res: print(r)
json.dump(res,open('align.json','w'))
