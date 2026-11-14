import json,os,asyncio,time,subprocess,numpy as np,librosa,edge_tts
from script import LINES; from v1lines import V1
P=os.environ.get('HTTPS_PROXY'); SR=16000; HOP=160
os.makedirs('vo1',exist_ok=True)
def tts(text,f):
    if os.path.exists(f) and os.path.getsize(f)>1000: return
    for a in range(5):
        try: asyncio.run(edge_tts.Communicate(text,"te-IN-MohanNeural",rate="+10%",proxy=P).save(f)); return
        except Exception as e: time.sleep(2**a)
for k,(sc,te,cap) in V1.items(): tts(te,f'vo1/{k:02d}.mp3')
def load(f):
    y,_=librosa.load(f,sr=SR); y,_=librosa.effects.trim(y,top_db=35); return y
v3=[load(f'vo/{i:02d}t.wav') for i in range(len(LINES))]
v1=[load(f'vo1/{i:02d}.mp3') if i in V1 else v3[i] for i in range(len(LINES))]
def seq(lines):
    out=[];b=[];t=0
    for y in lines: b.append((t,t+len(y)/SR)); out+= [y,np.zeros(int(.25*SR))]; t+=len(y)/SR+.25
    return np.concatenate(out),b
def feat(y):
    m=librosa.feature.mfcc(y=y,sr=SR,n_mfcc=20,hop_length=HOP,n_fft=512)[1:]
    return (m-m.mean(1,keepdims=True))/(m.std(1,keepdims=True)+1e-6)
usr,_=librosa.load('../up/rec.wav',sr=SR)
U=feat(usr)
res={}
for name,lines in [('v3',v3),('v1',v1)]:
    y,b=seq(lines); R=feat(y)
    D,wp=librosa.sequence.dtw(X=R,Y=U,metric='cosine'); wp=wp[::-1]
    C=librosa.sequence.dtw(X=R,Y=U,metric='cosine',backtrack=False)
    # per-line local cost along path
    from scipy.spatial.distance import cdist
    per=[]
    for (a,bb) in b:
        fa,fb=int(a*SR/HOP),int(bb*SR/HOP); sel=wp[(wp[:,0]>=fa)&(wp[:,0]<fb)]
        c=np.mean([1-np.dot(R[:,i],U[:,j])/(np.linalg.norm(R[:,i])*np.linalg.norm(U[:,j])+1e-9) for i,j in sel])
        per.append((round(float(c),3),round(sel[0,1]*HOP/SR,2),round(sel[-1,1]*HOP/SR,2)))
    res[name]=dict(total=float(D[-1,-1]/len(wp)),per=per)
    print(name,'total',round(res[name]['total'],4))
for i in range(len(LINES)):
    print(i, 'v3',res['v3']['per'][i],' v1',res['v1']['per'][i], '*' if i in V1 else '')
json.dump(res,open('cmp.json','w'))
