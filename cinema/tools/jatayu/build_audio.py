import json,subprocess,numpy as np,wave,sys,os
OUT=sys.argv[1]; os.makedirs(OUT+'/aud',exist_ok=True)
SR=44100
VO={'narrator':['-v','mb-en1','-s','140','-p','45'],'sita':['-v','mb-us1','-s','150','-p','75'],
    'ravana':['-v','mb-us3','-s','128','-p','22'],'jatayu':['-v','mb-us2','-s','135','-p','30']}
def load(f):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','s16le','-'])
    return np.frombuffer(raw,np.int16).astype(np.float64)/32768
sc=json.load(open(os.path.dirname(__file__)+'/lines.json'))
t=0; scenes=[]; voice_cues=[]
for i,s in enumerate(sc):
    cur=0.6; ls=[]
    for j,(who,txt) in enumerate(s['lines']):
        f=f'{OUT}/aud/s{i}_{j}.wav'; subprocess.run(['espeak-ng',*VO[who],'-w',f,txt],check=True)
        a=load(f); d=len(a)/SR
        if who=='ravana': # deeper, echoing villain voice
            a=a+0.35*np.concatenate([np.zeros(int(.09*SR)),a])[:len(a)]
        ls.append({'who':who,'text':txt,'start':cur,'end':cur+d}); voice_cues.append((a,t+cur)); cur+=d+0.3
    dur=max(s['min'],cur+0.9); scenes.append({'start':t,'dur':dur,'lines':ls}); t+=dur
total=t
N=int(total*SR)+SR
voice=np.zeros(N); fx=np.zeros(N); mus=np.zeros(N)
for a,st in voice_cues: i=int(st*SR); voice[i:i+len(a)]+=a[:N-i]
voice*=0.9/np.abs(voice).max()
rng=np.random.default_rng(3)
def add(buf,sig,st,g=1):
    i=int(st*SR); 
    if i>=N: return
    n=min(len(sig),N-i); buf[i:i+n]+=sig[:n]*g
def tone(f0,f1,d,shape='sin',decay=4):
    n=int(d*SR); x=np.arange(n)/SR; f=np.linspace(f0,f1,n); ph=2*np.pi*np.cumsum(f)/SR
    w=np.sin(ph) if shape=='sin' else np.sign(np.sin(ph))*.5
    return w*np.exp(-x*decay)*np.minimum(1,x/.01)
def noise(d,smooth=1,decay=3):
    n=int(d*SR); w=rng.standard_normal(n)
    if smooth>1: w=np.convolve(w,np.ones(smooth)/smooth,'same')
    x=np.arange(n)/SR; return w*np.exp(-x*decay)*np.minimum(1,x/.02)
def screech(d=1.2):
    n=int(d*SR); x=np.arange(n)/SR; f=2200-900*x/d+120*np.sin(2*np.pi*28*x)
    s=np.sin(2*np.pi*np.cumsum(f)/SR+3*np.sin(2*np.pi*600*x))
    return s*np.minimum(1,x/.05)*np.exp(-x*2)*0.5+noise(d,3,2)[:n]*0.15
def clang():
    c=sum(tone(f,f*0.99,1.2,decay=5)*a for f,a in [(1230,.5),(1870,.35),(2730,.25),(3410,.2)]); z=noise(.15,1,25)*.6; c[:len(z)]+=z; return c
def whoosh(d=.7):
    n=int(d*SR); w=np.convolve(rng.standard_normal(n),np.ones(12)/12,'same'); x=np.arange(n)/SR; return w*np.sin(np.pi*x/d)**2*1.2
def drum(f=60):
    d=tone(f*1.8,f,.6,decay=7); z=noise(.08,4,30)*.3; d[:len(z)]+=z; return d
S=scenes
# whooshes for chariot, screeches, battle clangs, wing slash, fall
add(fx,whoosh(2.5),S[0]['start']+0.5,.5)
add(fx,screech(1.4),S[2]['start']+0.4,.6)
if S[2]['lines'][-1]['who']=='jatayu': add(fx,screech(1.0),S[2]['start']+S[2]['lines'][-1]['start']-0.2,.4)
for k in range(5):
    tt=S[3]['start']+1.2+2.4*k
    if tt<S[3]['start']+S[3]['dur']: add(fx,clang(),tt,.55); add(fx,whoosh(.5),tt-.4,.6); add(fx,drum(55),tt,.8)
hit=S[4]['start']+S[4]['dur']*.45
add(fx,whoosh(.6),hit-.5,.9); add(fx,clang(),hit,.8); add(fx,noise(1.2,2,3),hit,.5); add(fx,screech(1.8),hit+.05,.7); add(fx,drum(40),hit,1.2)
add(fx,(lambda a,b:(a[:min(len(a),len(b))]*.25+b[:min(len(a),len(b))]*.6))(tone(900,150,S[5]['dur']*.75,decay=.6),whoosh(S[5]['dur']*.75)),S[5]['start'],1)
# music: tanpura-like drone + war drums
x=np.arange(N)/SR
drone=sum(np.sin(2*np.pi*f*x+np.sin(2*np.pi*.2*x*(k+1)))*a for k,(f,a) in enumerate([(110,.5),(165,.35),(220,.3),(55,.4)]))
dg=np.full(N,.5); bs,be=S[3]['start'],S[4]['start']+S[4]['dur']; dg[int(bs*SR):int(be*SR)]=1.0; dg[int(S[6]['start']*SR):]=.7
dg=np.convolve(dg,np.ones(SR)/SR,'same'); mus+=drone*dg*.25
beat=0.0
while beat<S[5]['start']:
    inten=1.0 if bs<=beat<be else .45
    add(mus,drum(65),beat,.9*inten)
    if bs<=beat<be: add(mus,drum(90),beat+.25,.5)
    beat+=0.5 if bs<=beat<be else 1.0
# sad flute-ish melody at the end
notes=[440,392,349,330,294,330,349,330]
for k,f in enumerate(notes):
    st=S[5]['start']+S[5]['dur']*.5+k*.9
    n=int(1.1*SR); xx=np.arange(n)/SR; add(mus,np.sin(2*np.pi*f*xx+.3*np.sin(2*np.pi*5*xx))*np.sin(np.pi*xx/1.1),st,.35)
mus/=np.abs(mus).max(); fx/=max(1e-6,np.abs(fx).max())
mix=voice+mus*.22+fx*.45
mix*=0.95/np.abs(mix).max()
w=wave.open(OUT+'/soundtrack.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close()
json.dump({'scenes':scenes,'total':total,'fps':30},open(OUT+'/timeline.json','w'))
print('total %.1f'%total,[round(s['dur'],1) for s in scenes])
