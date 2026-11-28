import numpy as np, wave
def rd(f):
    w=wave.open(f); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768; return x,w.getframerate()
v,sr=rd('audio/voice.wav'); m,_=rd('audio/music.wav'); s,_=rd('audio/sfx.wav')
n=len(v); m=m[:n]; s=s[:n]
def grms(x):
    b=int(0.4*sr); bl=np.array([np.sqrt((x[i:i+b]**2).mean()) for i in range(0,len(x)-b,b)]); bl=bl[bl>1e-4]
    g=bl[bl>bl.max()*10**(-40/20)]; g=g[20*np.log10(g)>20*np.log10(np.sqrt((g**2).mean()))-10]; return np.sqrt((g**2).mean())
V=grms(v); m*=0.5*V/grms(m); s*=0.5*V/grms(s)
cap=0.7*np.abs(v).max()
if np.abs(s).max()>cap: s*=cap/np.abs(s).max()
db=lambda a,b: 20*np.log10(grms(a)/grms(b))
print(f"music vs voice {db(m,v):+.1f} dB, sfx vs voice {db(s,v):+.1f} dB, sfx peak/voice peak {np.abs(s).max()/np.abs(v).max():.2f}")
mix=v+m+s
w=wave.open('audio/mix.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(mix/max(1,np.abs(mix).max()),-1,1)*32767).astype(np.int16).tobytes())
