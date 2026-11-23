"""Generate the pure-Telugu voice-over, one clip per line, with a voice per character.
Usage: python3 voice.py <vo_dir>   -> <vo_dir>/<scene>_<n>.wav
"""
import sys, os, ssl, asyncio, subprocess
import edge_tts, edge_tts.communicate as ec

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES

CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(CA):  # trust the sandbox proxy CA when present
    ec._SSL_CTX = ssl.create_default_context(cafile=CA)

# speaker -> (voice, rate, pitch, ffmpeg filter)
VOICES = {
    "N": ("te-IN-MohanNeural", "-6%", "-4Hz", "acompressor=threshold=-18dB:ratio=3,volume=1.1"),
    "M": ("te-IN-MohanNeural", "-12%", "-14Hz", "acompressor=threshold=-18dB:ratio=3,volume=1.1"),
    "R": ("te-IN-ShrutiNeural", "+0%", "+8Hz", "acompressor=threshold=-18dB:ratio=3,volume=1.1"),
    "A": ("te-IN-ShrutiNeural", "+6%", "+38Hz", "acompressor=threshold=-18dB:ratio=3,volume=1.1"),
    "G": ("te-IN-ShrutiNeural", "-25%", "+22Hz", "aecho=0.8:0.7:120|260:0.45|0.3,volume=1.3"),
}

VO = sys.argv[1]
os.makedirs(VO, exist_ok=True)

async def one(sid, n, spk, text):
    mp3, wav = f"{VO}/{sid}_{n}.mp3", f"{VO}/{sid}_{n}.wav"
    if os.path.exists(wav):
        return
    voice, rate, pitch, af = VOICES[spk]
    for attempt in range(5):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(mp3)
            break
        except Exception as e:
            print("retry", sid, n, e); await asyncio.sleep(2 * (attempt + 1))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-af", af,
                    "-ar", "44100", "-ac", "1", "-sample_fmt", "s16", wav], check=True)
    os.remove(mp3)

async def main():
    sem = asyncio.Semaphore(4)
    async def guarded(*a):
        async with sem:
            await one(*a)
    await asyncio.gather(*(guarded(s["id"], n, spk, t) for s in SCENES for n, (spk, t) in enumerate(s["segs"])))
    print("voice clips done")

asyncio.run(main())
