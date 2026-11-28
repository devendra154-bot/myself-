import numpy as np,wave,json
L=json.load(open('script.json'));sr=48000;segs=[]
for l in L:
    w=wave.open(f"audio/lines/{l['id']}.wav");x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
    env=np.convolve(np.abs(x),np.ones(480)/480,'same');idx=np.where(env>0.01)[0]
    x=x[max(0,idx[0]-int(.04*sr)):idx[-1]+int(.08*sr)]
    env=np.convolve(np.abs(x),np.ones(480)/480,'same');q=env<0.006;out=[];i=0;n=len(x)
    while i<n:
        j=i
        while j<n and q[j]==q[i]: j+=1
        seg=x[i:j]
        if q[i] and len(seg)>int(.45*sr): seg=seg[:int(.32*sr)]
        out.append(seg);i=j
    segs.append(np.concatenate(out))
speech=sum(len(s) for s in segs)/sr;lead,tail=0.45,0.8
gap=(60-lead-tail-speech)/(len(segs)-1);print('speech',round(speech,2),'gap',round(gap,3))
gap=max(0.2,min(gap,0.6))
parts=[np.zeros(int(lead*sr),np.float32)];t=lead;tl=[]
for l,s in zip(L,segs):
    tl.append({'id':l['id'],'who':l['who'],'t0':round(t,3),'t1':round(t+len(s)/sr,3),'sub':l['sub']})
    parts+=[s,np.zeros(int(gap*sr),np.float32)];t+=len(s)/sr+gap
v=np.concatenate(parts);T=60.0
v=np.concatenate([v,np.zeros(max(0,int(T*sr)-len(v)),np.float32)])[:int(T*sr)]
w=wave.open('audio/voice.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(v,-1,1)*32767).astype(np.int16).tobytes())
fps=30;N=int(T*fps);env=np.array([np.sqrt((v[int(k*sr/fps):int((k+1)*sr/fps)]**2).mean()) for k in range(N)])
env=np.clip(env/np.percentile(env[env>0.005],90),0,1.2)
# subtitle timing: split each line's time by syllable-ish char counts of sub chunks
subs=[]
for e in tl:
    w_=[len(s.replace(' ','')) for s in e['sub']];tot=sum(w_);a=e['t0']
    for s,c in zip(e['sub'],w_):
        b=a+(e['t1']-e['t0'])*c/tot;subs.append({'t0':round(a,3),'t1':round(b,3),'text':s,'who':e['who']});a=b
json.dump({'N':N,'lines':tl,'subs':subs,'env':[round(float(x),3) for x in env]},open('timing.json','w'),ensure_ascii=False)
for e in tl: print(e['id'],e['who'],e['t0'],e['t1'])
print('end of speech',tl[-1]['t1'])
# snap subtitle boundaries to detected pauses
fr=np.array([np.sqrt((v[int(k*sr/100):int((k+1)*sr/100)]**2).mean()) for k in range(int(T*100))])
sil=fr<0.008;gaps=[];k=0
while k<len(sil):
    if sil[k]:
        j=k
        while j<len(sil) and sil[j]: j+=1
        if j-k>=10: gaps.append((k+j)/200)
        k=j
    else: k+=1
gaps=np.array(gaps)
for e in tl:
    ch=[s for s in subs if e['t0']<=s['t0']<e['t1']-1e-3]
    for a,b in zip(ch[:-1],ch[1:]):
        c=gaps[(gaps>e['t0'])&(gaps<e['t1'])]
        if len(c):
            g=c[np.argmin(abs(c-a['t1']))]
            if abs(g-a['t1'])<1.0 and g-a['t0']>0.9 and b['t1']-g>0.9: a['t1']=b['t0']=round(float(g),3)
J=json.load(open('timing.json'));J['subs']=subs;json.dump(J,open('timing.json','w'),ensure_ascii=False)
for s in subs: print(s['t0'],s['t1'],s['text'])
