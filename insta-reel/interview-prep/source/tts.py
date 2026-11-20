import subprocess, json, os, asyncio, time, edge_tts
from script import LINES, M
P=os.environ.get('HTTPS_PROXY'); os.makedirs("vo",exist_ok=True)
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
def say(text,voice,mp):
    for a in range(5):
        try: asyncio.run(edge_tts.Communicate(text,voice,rate="+10%",proxy=P).save(mp)); return
        except Exception: time.sleep(2**a)
    raise SystemExit("tts failed "+mp)
def trim(src,dst):
    subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse","-ar","48000","-ac","1",dst],check=True)
t=0.6; out=[]; prev=None
for i,(sc,te,cap) in enumerate(LINES):
    if prev and sc!=prev: t+=0.5
    parts=te if isinstance(te,list) else [(M,te)]
    segs=[]
    for k,(v,tx) in enumerate(parts):
        mp=f"vo/{i:02d}_{k}.mp3"; say(tx,v,mp); w=f"vo/{i:02d}_{k}.wav"; trim(mp,w); segs.append(w)
    g=f"vo/{i:02d}t.wav"
    if len(segs)==1: os.replace(segs[0],g)
    else:
        subprocess.run(["ffmpeg","-v","error","-y","-i",segs[0],"-f","lavfi","-t","0.35","-i","anullsrc=r=48000:cl=mono","-i",segs[1],"-filter_complex","[0][1][2]concat=n=3:v=0:a=1",g],check=True)
    d=dur(g); out.append(dict(i=i,scene=sc,cap=cap,start=round(t,3),end=round(t+d,3),file=g)); t+=d+0.22; prev=sc
json.dump(dict(lines=out,total=round(t+2.2,3)),open("timeline.json","w"),indent=1)
print("total",round(t+2.2,2))
for l in out: print(l['i'],l['scene'],l['start'],l['end'])
