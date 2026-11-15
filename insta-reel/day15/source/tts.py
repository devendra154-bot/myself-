import subprocess, json, os, asyncio, time, edge_tts
PROXY=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
from script import LINES
os.makedirs("vo", exist_ok=True)
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
t=0.6; out=[]; prev=None; files=[]
for i,(sc,te,cap) in enumerate(LINES):
    if prev and sc!=prev: t+=0.5
    f=f"vo/{i:02d}.wav"
    mp=f"vo/{i:02d}.mp3"
    for attempt in range(4):
        try:
            asyncio.run(edge_tts.Communicate(te,"te-IN-MohanNeural",rate="+10%",pitch="+2Hz",proxy=PROXY).save(mp)); break
        except Exception as ex:
            print("retry",i,ex); time.sleep(2**attempt)
    subprocess.run(["ffmpeg","-v","error","-y","-i",mp,f],check=True)
    # trim silence
    g=f"vo/{i:02d}t.wav"
    subprocess.run(["ffmpeg","-v","error","-y","-i",f,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse","-ar","48000",g],check=True)
    d=dur(g); out.append(dict(i=i,scene=sc,cap=cap,start=round(t,3),end=round(t+d,3),file=g))
    t+=d+0.22; prev=sc
total=t+2.2
json.dump(dict(lines=out,total=round(total,3)),open("timeline.json","w"),indent=1)
print("total",total)
