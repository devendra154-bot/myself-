"""Generate one wav per script line. Usage: python3 tts_te.py <out_dir> [part=rateDelta ...]"""
import sys, os, asyncio, subprocess, certifi
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"   # agent proxy CA
import edge_tts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script_te import SCENES, VOICES
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
DELTA = {int(k): int(v) for k, v in (a.split("=") for a in sys.argv[2:])}   # extra rate % per part
def addrate(r, d): return f"{int(r.rstrip('%')) + d:+d}%"
async def one(sid, i, spk, text, part):
    rate, pitch, fx = VOICES[spk]; rate = addrate(rate, DELTA.get(part, 0))
    raw = f"{OUT}/{sid}_{i:02d}.mp3"
    await edge_tts.Communicate(text, "te-IN-ShrutiNeural", rate=rate, pitch=pitch).save(raw)
    af = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    if fx == "ghost": af += ",aecho=0.8:0.85:110|240:0.45|0.28,apad=pad_dur=0.4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-ar", "44100", "-ac", "1", f"{OUT}/{sid}_{i:02d}.wav"], check=True)
    os.remove(raw)
async def main():
    only = os.environ.get("PARTS")
    for s in SCENES:
        if only and str(s["part"]) not in only.split(","): continue
        for i, (spk, text) in enumerate(s["lines"]):
            for t in range(5):
                try: await one(s["id"], i, spk, text, s["part"]); break
                except Exception as e: print("retry", s["id"], i, e); await asyncio.sleep(2)
asyncio.run(main())
