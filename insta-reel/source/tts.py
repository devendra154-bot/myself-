import subprocess, json, os
from script import LINES
os.makedirs("vo", exist_ok=True)
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
t=0.6; out=[]; prev=None; files=[]
for i,(sc,te,cap) in enumerate(LINES):
    if prev and sc!=prev: t+=0.45
    f=f"vo/{i:02d}.wav"
    subprocess.run(["espeak-ng","-v","te","-s","158","-p","42","-a","170","-w",f,te],check=True)
    # trim silence
    g=f"vo/{i:02d}t.wav"
    subprocess.run(["ffmpeg","-v","error","-y","-i",f,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse","-ar","48000",g],check=True)
    d=dur(g); out.append(dict(i=i,scene=sc,cap=cap,start=round(t,3),end=round(t+d,3),file=g))
    t+=d+0.28; prev=sc
total=t+2.2
json.dump(dict(lines=out,total=round(total,3)),open("timeline.json","w"),indent=1)
print("total",total)
