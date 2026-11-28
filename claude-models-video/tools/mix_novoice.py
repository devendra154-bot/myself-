import numpy as np, wave
def rd(f):
    w=wave.open(f); return np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768, w.getframerate()
m,sr=rd('audio/music.wav'); s,_=rd('audio/sfx.wav')
def grms(x):
    b=int(0.4*sr); bl=np.array([np.sqrt((x[i:i+b]**2).mean()) for i in range(0,len(x)-b,b)]); bl=bl[bl>1e-4]; return np.sqrt((bl**2).mean())
s*=0.5*grms(m)/grms(s)
if np.abs(s).max()>0.7*np.abs(m).max(): s*=0.7*np.abs(m).max()/np.abs(s).max()
print(f"sfx vs music {20*np.log10(grms(s)/grms(m)):+.1f} dB")
mix=m+s; mix/=max(1,np.abs(mix).max())
w=wave.open('audio/mix.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((mix*32767).astype(np.int16).tobytes())
