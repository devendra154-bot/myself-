import numpy as np, json, subprocess, wave
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR=48000; tl=json.load(open("timeline.json")); T=tl["total"]; N=int(T*SR)
t=np.arange(N)/SR
def note(m): return 440*2**((m-69)/12)
# cinematic pad: Am - F - C - G, 4s each chord
chords=[[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64]]
pad=np.zeros(N)
seg=4.0
for k in range(int(T/seg)+1):
    s=int(k*seg*SR); e=min(N,int((k+1)*seg*SR)+SR)
    if s>=N: break
    tt=np.arange(e-s)/SR
    env=np.minimum(1,tt/1.2)*np.exp(-np.maximum(0,tt-seg)/0.6)
    for m in chords[k%4]:
        f=note(m)
        w=np.sin(2*np.pi*f*tt)+0.5*np.sin(2*np.pi*f*1.003*tt)+0.25*np.sin(2*np.pi*2*f*tt)
        pad[s:e]+=w*env*0.05
    # bass
    pad[s:e]+=np.sin(2*np.pi*note(chords[k%4][0]-12)*tt)*env*0.09
b,a=butter(2,1800/(SR/2)); pad=lfilter(b,a,pad)*0.8
# arpeggio pluck, 16th notes at 92bpm
step=60/92/4; k=0; x=0.0
while x<T-1:
    ch=chords[int(x/seg)%4]; m=ch[[0,1,2,3,2,1,3,2][k%8]]+12
    i=int(x*SR); L=int(0.4*SR); n=min(L,N-i); tt=np.arange(n)/SR
    f=note(m); pl=(np.sign(np.sin(2*np.pi*f*tt))*0.3+np.sin(2*np.pi*f*tt))*np.exp(-tt*9)
    pad[i:i+n]+=pl*0.028; x+=step; k+=1
# beat at 100bpm: kick on beats, hat offbeats, starts after hook
beat=60/92; drums=np.zeros(N)
kl=int(0.35*SR); kt=np.arange(kl)/SR
kick=np.sin(2*np.pi*(45+90*np.exp(-kt*28))*kt)*np.exp(-kt*9)
hl=int(0.06*SR); hat=np.random.randn(hl)*np.exp(-np.arange(hl)/SR*70)
bh,ah=butter(2,7000/(SR/2),'high'); hat=lfilter(bh,ah,hat)
first_h1=[l for l in tl["lines"] if l["scene"]=="h1"][0]["start"]
x=first_h1
while x<T-2.5:
    i=int(x*SR); n=min(kl,N-i); drums[i:i+n]+=kick[:n]*0.45
    j=int((x+beat/2)*SR); n=min(hl,N-j); 
    if n>0: drums[j:j+n]+=hat[:n]*0.12
    x+=beat
# whooshes + impact at scene changes
sfx=np.zeros(N); prev=None
for l in tl["lines"]:
    if l["scene"]!=prev:
        st=l["start"]-0.45 if prev else 0.05
        wl=int(0.5*SR); wt=np.arange(wl)/SR
        noise=np.random.randn(wl)
        bw,aw=butter(2,[300/(SR/2),3000/(SR/2)],'band'); noise=lfilter(bw,aw,noise)
        env=np.sin(np.pi*wt/0.5)**2
        i=max(0,int(st*SR)); n=min(wl,N-i); sfx[i:i+n]+=noise[:n]*env[:n]*0.35
        # sub hit
        hi=int(l["start"]*SR)-int(0.05*SR); hl2=int(0.6*SR); ht=np.arange(hl2)/SR
        hit=np.sin(2*np.pi*(40+40*np.exp(-ht*15))*ht)*np.exp(-ht*5)
        n=min(hl2,N-hi); sfx[hi:hi+n]+=hit[:n]*0.4
    prev=l["scene"]
# voice
voice=np.zeros(N)
for l in tl["lines"]:
    sr,d=wavfile.read(l["file"]); d=d.astype(np.float32)
    if d.ndim>1: d=d.mean(1)
    d/=32768; i=int(l["start"]*SR); n=min(len(d),N-i); voice[i:i+n]+=d[:n]
voice=voice/np.max(np.abs(voice))*0.9
# ducking
env=np.convolve(np.abs(voice),np.ones(4800)/4800,'same'); duck=1-0.55*np.clip(env*8,0,1)
fade=np.minimum(1,t/1.5)*np.minimum(1,(T-t)/2.0)
music=(pad+drums)*duck*fade
wavfile.write("music.wav",SR,(np.clip(music+sfx*fade,-1,1)*32767).astype(np.int16))
wavfile.write("voice.wav",SR,(voice*32767).astype(np.int16))
