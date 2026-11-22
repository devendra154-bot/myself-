"""Builds the audio for "Jatayu's Last Flight" (Remotion version).
1. Natural voices for every line with Edge TTS (skips files that already exist).
2. A timeline: each scene lasts as long as its narration (audio drives the video).
3. A music + sound-effects bed for the whole film, including the 8 s cinematic intro.
Outputs go to public/jatayu/ and src/jatayu/timeline.json.
Run from the video/ folder:  python3 scripts/jatayu_audio.py
"""
import json, subprocess, sys, wave, os
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "jatayu"; OUT.mkdir(parents=True, exist_ok=True)
SAY = [sys.executable, str(ROOT / "scripts" / "edge_say.py")]
INTRO, FPS, SR = 8.0, 30, 44100
VOICES = {
    "narrator": ["--voice", "en-IN-PrabhatNeural", "--rate=-4%"],
    "sita":     ["--voice", "en-IN-NeerjaExpressiveNeural", "--pitch=+6Hz"],
    "ravana":   ["--voice", "en-IN-PrabhatNeural", "--pitch=-14Hz", "--rate=-12%"],
    "jatayu":   ["--voice", "hi-IN-MadhurNeural", "--pitch=-6Hz"],
}
SCENES = [
    {"min": 6, "lines": [["narrator", "High above the clouds, Ravana's golden flying chariot raced towards Lanka."]]},
    {"min": 9, "lines": [["narrator", "Inside, he held Sita captive."], ["sita", "Help! Someone, please save me!"], ["ravana", "Ha ha ha! No one can stop Ravana!"]]},
    {"min": 7, "lines": [["narrator", "But the mighty bird Jatayu, friend of King Dasharatha, heard her cry."], ["jatayu", "Stop, Ravana! Let her go!"]]},
    {"min": 9.6, "lines": [["narrator", "Jatayu attacked with his claws and wings, and broke Ravana's chariot."], ["ravana", "You foolish old bird!"]]},
    {"min": 6, "lines": [["narrator", "Then Ravana raised his sword, and cut Jatayu's wing."]]},
    {"min": 8, "lines": [["narrator", "Jatayu fell to the earth, and Ravana flew away with Sita."], ["narrator", "But brave Jatayu held on to life, to tell Rama the truth."]]},
    {"min": 7.5, "lines": [["narrator", "Jatayu gave his life protecting Sita. The bravest heart in the sky."]]},
]

def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)]))
def load(f):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"])
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768

# 1-2. voices + timeline
t = INTRO; scenes = []
for i, s in enumerate(SCENES):
    cur = 0.6; lines = []
    for j, (who, text) in enumerate(s["lines"]):
        f = OUT / f"s{i}_{j}_{who}.mp3"
        if not f.exists() or f.stat().st_size == 0:
            subprocess.run(SAY + VOICES[who] + ["--text", text, "--write-media", str(f)], check=True)
        d = dur(f)
        lines.append({"who": who, "text": text, "file": f"jatayu/{f.name}", "start": round(cur, 3), "end": round(cur + d, 3)})
        print(f"  scene {i} {who:8s} {d:5.2f}s  {text}")
        cur += d + 0.35
    d = max(s["min"], cur + 0.9)
    scenes.append({"start": round(t, 3), "dur": round(d, 3), "lines": lines}); t += d
total = t
(ROOT / "src" / "jatayu" / "timeline.json").write_text(json.dumps({"fps": FPS, "intro": INTRO, "total": round(total, 3), "scenes": scenes}, indent=1))

# 3. music + sound effects bed
N = int(total * SR) + SR
rng = np.random.default_rng(3)
mus = np.zeros(N); fx = np.zeros(N)
def add(buf, sig, st, g=1.0):
    i = int(st * SR)
    if i >= N: return
    n = min(len(sig), N - i); buf[i:i + n] += sig[:n] * g
def tone(f0, f1, d, decay=4):
    n = int(d * SR); x = np.arange(n) / SR; f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * decay) * np.minimum(1, x / .01)
def noise(d, smooth=1, decay=3):
    n = int(d * SR); w = rng.standard_normal(n)
    if smooth > 1: w = np.convolve(w, np.ones(smooth) / smooth, "same")
    x = np.arange(n) / SR; return w * np.exp(-x * decay) * np.minimum(1, x / .02)
def mixn(*sigs):
    n = max(len(s) for s in sigs); o = np.zeros(n)
    for s in sigs: o[:len(s)] += s
    return o
def screech(d=1.2):
    n = int(d * SR); x = np.arange(n) / SR; f = 2200 - 900 * x / d + 120 * np.sin(2 * np.pi * 28 * x)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * 600 * x))
    return mixn(s * np.minimum(1, x / .05) * np.exp(-x * 2) * .5, noise(d, 3, 2) * .15)
def clang(): return mixn(*[tone(f, f * .99, 1.2, 5) * a for f, a in [(1230, .5), (1870, .35), (2730, .25), (3410, .2)]], noise(.15, 1, 25) * .6)
def whoosh(d=.7):
    n = int(d * SR); w = np.convolve(rng.standard_normal(n), np.ones(12) / 12, "same"); x = np.arange(n) / SR
    return w * np.sin(np.pi * x / d) ** 2 * 1.2
def drum(f=60): return mixn(tone(f * 1.8, f, .6, 7), noise(.08, 4, 30) * .3)
def boom(): return mixn(tone(90, 30, 3.5, 1.2) * 1.4, noise(1.5, 30, 2) * .4)
def riser(d):
    n = int(d * SR); x = np.arange(n) / SR
    return mixn(np.sin(2 * np.pi * np.cumsum(np.linspace(200, 900, n)) / SR) * (x / d) ** 2 * .3, np.convolve(rng.standard_normal(n), np.ones(8) / 8, "same") * (x / d) ** 3 * .5)

S = scenes
# intro: riser into a boom on the title reveal (frame 95 = 3.17 s), shimmer after
add(fx, riser(3.1), 0.1, .7); add(fx, boom(), 95 / FPS, 1.0); add(fx, whoosh(1.2), 95 / FPS - .6, .5)
add(fx, whoosh(2.5), S[0]["start"] + .5, .5)
add(fx, screech(1.4), S[2]["start"] + .4, .6)
jl = [l for l in S[2]["lines"] if l["who"] == "jatayu"]
if jl: add(fx, screech(1.0), S[2]["start"] + jl[0]["start"] - .2, .4)
for k in range(5):
    tt = S[3]["start"] + 1.2 + 2.4 * k
    if tt < S[3]["start"] + S[3]["dur"]: add(fx, clang(), tt, .55); add(fx, whoosh(.5), tt - .4, .6); add(fx, drum(55), tt, .8)
hit = S[4]["start"] + S[4]["dur"] * .45
add(fx, whoosh(.6), hit - .5, .9); add(fx, clang(), hit, .8); add(fx, noise(1.2, 2, 3), hit, .5); add(fx, screech(1.8), hit + .05, .7); add(fx, boom(), hit, .9)
fall = S[5]["dur"] * .75
add(fx, mixn(tone(900, 150, fall, .6) * .25, whoosh(fall) * .6), S[5]["start"], 1)
add(fx, boom(), S[6]["start"], .5)
# music: tanpura-style drone + war drums in the battle + a sad melody at the end
x = np.arange(N) / SR
drone = sum(np.sin(2 * np.pi * f * x + np.sin(2 * np.pi * .2 * x * (k + 1))) * a for k, (f, a) in enumerate([(110, .5), (165, .35), (220, .3), (55, .4)]))
dg = np.full(N, .5); bs, be = S[3]["start"], S[4]["start"] + S[4]["dur"]
dg[:int(INTRO * SR)] = .8; dg[int(bs * SR):int(be * SR)] = 1.0; dg[int(S[6]["start"] * SR):] = .7
dg = np.convolve(dg, np.ones(SR) / SR, "same"); mus += drone * dg * .25
beat = INTRO
while beat < S[5]["start"]:
    battle = bs <= beat < be
    add(mus, drum(65), beat, .9 if battle else .4)
    if battle: add(mus, drum(90), beat + .25, .5)
    beat += .5 if battle else 1.0
for k, f in enumerate([440, 392, 349, 330, 294, 330, 349, 330, 294, 262]):
    st = S[5]["start"] + S[5]["dur"] * .5 + k * .9; n = int(1.1 * SR); xx = np.arange(n) / SR
    add(mus, np.sin(2 * np.pi * f * xx + .3 * np.sin(2 * np.pi * 5 * xx)) * np.sin(np.pi * xx / 1.1), st, .35)
mus /= np.abs(mus).max(); fx /= np.abs(fx).max()
bed = mus * .32 + fx * .55
fade = int(1.5 * SR); bed[-fade:] *= np.linspace(1, 0, fade)
bed *= .9 / np.abs(bed).max()
w = wave.open(str(OUT / "bed.wav"), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((bed * 32767).astype(np.int16).tobytes()); w.close()
print(f"total {total:.1f}s ({round(total * FPS)} frames)")
