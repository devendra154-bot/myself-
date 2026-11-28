import numpy as np, json, wave
sr=48000; J=json.load(open('timing.json')); T=J['N']/30; n=int(T*sr); t=np.arange(n)/sr
LT={l['id']:l for l in J['lines']}; F=lambda s: round(s*30)
S=dict(C=F(LT['s1']['t1'])-92,D=F(LT['s2']['t0'])-6,E=F(LT['s3']['t0'])-5,Fo=F(LT['s4']['t0'])-5,G=F(LT['s5']['t0'])-5,Hc=F(LT['s6']['t0'])-5,I=F(LT['s7']['t0'])-5)
rng=np.random.default_rng(3)
def env(L,a=0.005,r=0.2):
    k=np.arange(L)/sr; return np.minimum(1,k/a)*np.exp(-k/r)
def put(buf,x,at):
    i=int(at*sr)
    if i<0: x=x[-i:]; i=0
    j=min(len(buf),i+len(x))
    if i<len(buf) and j>i: buf[i:j]+=x[:j-i]
mid=lambda f: 440*2**((f-69)/12)
# ---------- music: 100 bpm, Am F C G ----------
bpm=100; beat=60/bpm; mus=np.zeros(n)
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
bar=beat*4
for b in range(int(T/bar)+1):
    ch=chords[b%4]; t0=b*bar
    L=int(bar*sr); k=np.arange(L)/sr
    pad=sum(np.sin(2*np.pi*mid(m)*k+0.3*np.sin(2*np.pi*0.5*k))+0.5*np.sin(2*np.pi*mid(m)*2.003*k) for m in ch)
    pad*=np.minimum(1,k/0.4)*np.minimum(1,(bar-k)/0.3)*0.05
    put(mus,pad,t0)
    # bass
    for q in range(4):
        L2=int(beat*sr*0.9); k2=np.arange(L2)/sr
        bs=np.sin(2*np.pi*mid(ch[0]-24)*k2)+0.3*np.sign(np.sin(2*np.pi*mid(ch[0]-24)*k2))
        put(mus,bs*env(L2,0.005,0.25)*0.12,t0+q*beat)
    # arp 16ths
    for q in range(16):
        m=ch[q%3]+12+(12 if q%8>=6 else 0); L3=int(beat/4*sr*1.5); k3=np.arange(L3)/sr
        ar=(np.sin(2*np.pi*mid(m)*k3)+0.4*np.sin(2*np.pi*mid(m)*3*k3))*env(L3,0.002,0.09)*0.045
        put(mus,ar,t0+q*beat/4)
    # drums
    for q in range(4):
        L4=int(0.3*sr); k4=np.arange(L4)/sr
        kick=np.sin(2*np.pi*(50+90*np.exp(-k4*30))*k4)*env(L4,0.001,0.12)*0.35
        put(mus,kick,t0+q*beat)
        hat=rng.standard_normal(int(0.05*sr)); hat=np.diff(hat,prepend=0)*env(len(hat),0.001,0.015)*0.05
        put(mus,hat,t0+q*beat+beat/2)
        if q%2==1:
            sn=rng.standard_normal(int(0.2*sr))*env(int(0.2*sr),0.001,0.06)*0.12; put(mus,sn,t0+q*beat)
# intro fade-in, gentle outro
mus*=np.minimum(1,t/1.5); mus*=np.where(t>T-2.0,np.maximum(0,(T-t)/2.0),1)
# ---------- sfx ----------
sfx=np.zeros(n)
def whoosh(at,dur=0.6,up=True,g=0.5):
    L=int(dur*sr); k=np.arange(L)/sr; x=rng.standard_normal(L)
    # moving bandpass approximated by one-pole lowpass with varying coeff
    fc=np.linspace(300,4000,L) if up else np.linspace(4000,300,L); a=np.exp(-2*np.pi*fc/sr); y=np.zeros(L); s=0
    for i in range(L): s=a[i]*s+(1-a[i])*x[i]; y[i]=s
    sh=np.sin(np.pi*k/dur)**2; put(sfx,y*sh*g*4,at-dur*0.6)
def chime(at,f0,g=0.25,dec=0.6):
    L=int(dec*3*sr);k=np.arange(L)/sr
    x=sum(a*np.sin(2*np.pi*f0*h*k) for h,a in [(1,1),(2.01,0.4),(3.98,0.2)])*env(L,0.002,dec)
    put(sfx,x*g,at)
def blip(at,f=1200,g=0.12,d=0.05):
    L=int(d*sr);k=np.arange(L)/sr; put(sfx,np.sin(2*np.pi*f*k)*env(L,0.001,d/3)*g,at)
def click(at,g=0.08):
    L=int(0.015*sr); x=rng.standard_normal(L)*env(L,0.0005,0.004); put(sfx,x*g,at)
def boom(at,g=0.5):
    L=int(1.2*sr);k=np.arange(L)/sr; put(sfx,np.sin(2*np.pi*(40+60*np.exp(-k*8))*k)*env(L,0.002,0.4)*g,at)
def riser(at,dur=1.5,g=0.25):
    L=int(dur*sr);k=np.arange(L)/sr; f=200*np.exp(np.log(8)*k/dur); ph=2*np.cumsum(np.pi*f/sr)
    put(sfx,(np.sin(ph)*0.5+rng.standard_normal(L)*0.15)*(k/dur)**2*g,at-dur)
# intro shimmer
riser(0.9,1.0,0.12); chime(0.4,880,0.15,1.0)
whoosh(100/30+0.3,0.8,True,0.25)
chime((S['C']+40)/30-0.2,1046,0.12) # title in? (title panel at B+35)
chime((100+35)/30,784,0.18,0.8)
for i in range(4): chime((S['C']+20+i*12)/30,[523,659,784,1046][i],0.2,0.5); blip((S['C']+20+i*12)/30,1600,0.08)
for c in ['D','E','Fo','G','Hc','I']: whoosh(S[c]/30,0.55,True,0.45); boom(S[c]/30,0.18)
# haiku dash + cards
whoosh(S['D']/30+0.6,0.9,False,0.5)
for k in range(40): blip(S['D']/30+1.2+k*0.14,1400+(k%5)*180,0.05,0.04)
chime((S['D']+40)/30,1318,0.12)
# sonnet typing
for k in range(110): click((S['E']+66)/30+k*0.036+rng.random()*0.01,0.06)
chime((S['E']+186)/30,1568,0.12,0.4)
# opus nodes + gears
for k in range(22): blip((S['Fo']+k*4)/30,700+k*30,0.05,0.06)
for k in range(int((S['G']-S['Fo'])/30*6)): click(S['Fo']/30+0.5+k/6,0.05)
boom((S['Fo']+3)/30,0.25)
# fable timeline nodes
span=(S['Hc']-S['G']-45)/30
for k in range(8): chime((S['G']+15)/30+span*k/7,880*2**(k/12*2),0.12,0.4)
# comparison reveals
s6=LT['s6']; u=lambda x: s6['t0']+(x-36.62)/(50.54-36.62)*(s6['t1']-s6['t0'])
for x in [36.62,39.23,41.6]: chime(u(x),1046,0.14,0.4)
for k,x in enumerate([44.69,45.45,46.12,46.9]): blip(u(x)+0.2,600+k*200,0.12,0.12)
chime(u(47.65),1318,0.15,0.6)
s7=LT['s7']; v=lambda x: s7['t0']+(x-50.74)/(59.57-50.74)*(s7['t1']-s7['t0'])
for k,x in enumerate([50.74,52.15,53.49,55.4]): chime(v(x)+0.2,[523,659,784,1046][k],0.15,0.5)
riser(s7['t1']-2.8,1.2,0.2); chime(s7['t1']-2.8,1046,0.2,1.2); chime(s7['t1']-2.8,1568,0.12,1.2)
def wr(fn,x):
    w=wave.open(fn,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes())
wr('audio/music.wav',mus/np.abs(mus).max()*0.8); wr('audio/sfx.wav',sfx/np.abs(sfx).max()*0.8)
print(S)
