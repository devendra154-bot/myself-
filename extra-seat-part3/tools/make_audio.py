"""Build the timeline, lip-sync envelope, music, SFX and final audio mix for The Extra Seat - Part 3.

Usage: python3 make_audio.py <vo_dir_with_wavs_and_durs.json> <out_dir>
Writes: <out_dir>/timeline.json  (line start/end times + per-frame mouth envelope, used by scene.html)
        <out_dir>/mix.wav        (voice + music + sfx, 48 kHz stereo, 60 s)
All music and SFX are synthesised here (no third-party samples)."""
import json, sys, os
import numpy as np
import scipy.io.wavfile as wavio
from scipy.signal import butter, sosfilt

SR, DUR, FPS = 48000, 60.0, 24
vo_dir, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
lines = json.load(open(f"{vo_dir}/durs.json"))

# ---- timeline: silence before each line (first one is absolute) ----
gap = {"v02": 1.6, "v03": .35, "v04": .45, "v05": .35, "v06": .5, "v07": .05,
       "v08": .3, "v09": .35, "v10": .3, "v11": .8, "v12": .4}
t = 0.0
for L in lines:
    t = gap[L["id"]] if L["id"] == "v02" else t + gap[L["id"]]
    L["start"] = round(t, 3)
    t += L["dur"]
    L["end"] = round(t, 3)
print("last line ends at", lines[-1]["end"])

N = int(SR * DUR)
voice = np.zeros(N)
env = np.zeros(int(DUR * FPS) + 1)  # mouth openness per video frame
who = [""] * len(env)
for L in lines:
    sr, y = wavio.read(f"{vo_dir}/{L['id']}.wav")
    y = y.astype(np.float64) / 32768.0
    if y.ndim > 1:
        y = y.mean(axis=1)
    s = int(L["start"] * SR)
    voice[s:s + len(y)] += y[: N - s]
    hop = SR // FPS
    for i in range(0, len(y), hop):
        f = int(round(L["start"] * FPS)) + i // hop
        if f < len(env):
            env[f] = max(env[f], np.sqrt(np.mean(y[i:i + hop] ** 2)))
            who[f] = L["who"]
env = np.clip(env / (np.percentile(env[env > 0], 95) + 1e-9), 0, 1)
voice *= 0.85 / (np.abs(voice).max() + 1e-9)

tl = {"fps": FPS, "duration": DUR,
      "lines": [{k: L[k] for k in ("id", "who", "te", "start", "end")} for L in lines],
      "mouth": [round(float(v), 3) for v in env], "speaker": who}
json.dump(tl, open(f"{out}/timeline.json", "w"), ensure_ascii=False)

S = {L["id"]: L["start"] for L in lines}
E = {L["id"]: L["end"] for L in lines}
rng = np.random.default_rng(3)
tt = np.arange(N) / SR

def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)

def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)

def ramp(a, b, fade=1.0):
    """0..1 envelope that is 1 between a and b seconds, with linear fades."""
    return np.clip(np.minimum((tt - a) / fade + 1, (b - tt) / fade + 1), 0, 1)

# ---- music: soft piano + pad, sad in A minor, turning warm in C major at the reunion ----
def note_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def piano(n, dur, vel):
    k = np.arange(int(dur * SR)) / SR
    f = note_hz(n)
    y = sum((0.6 / h) * np.sin(2 * np.pi * f * h * k) * np.exp(-k * (1.6 + h * 0.9)) for h in range(1, 6))
    return y * vel * np.minimum(1, k / 0.004)

music = np.zeros(N)
pad = np.zeros(N)
bpm = 72
beat = 60 / bpm
sad = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]        # Am F C G
warm = [[53, 57, 60], [55, 59, 62], [48, 52, 55, 59], [57, 60, 64]]   # F G Cmaj7 Am
turn = S["v09"] - 0.2
bar = 0
pos = 0.3
while pos < DUR:
    prog = warm if pos >= turn else sad
    ch = prog[bar % 4]
    vel = 0.20 if pos < turn else 0.26
    pattern = [0, 1, 2, 1, 2, 1] if pos < turn else [0, 1, 2, 3 % len(ch), 2, 1]
    for i, idx in enumerate(pattern):
        st = pos + i * beat / 2
        n = ch[idx % len(ch)] + 12
        y = piano(n, 2.2, vel * (1.0 if i == 0 else 0.7))
        s = int(st * SR)
        if s < N:
            music[s:s + len(y)] += y[: N - s]
    # bass note + pad chord for the bar
    s0, s1 = int(pos * SR), min(N, int((pos + 3 * beat) * SR))
    k = np.arange(s1 - s0) / SR
    b = piano(ch[0] - 12, 3 * beat, 0.35)
    music[s0:s0 + len(b)] += b[: N - s0]
    for n in ch:
        f = note_hz(n)
        pad[s0:s1] += 0.05 * (np.sin(2 * np.pi * f * k) + 0.4 * np.sin(2 * np.pi * f * 2.003 * k))
    pos += 3 * beat
    bar += 1
pad = lp(pad, 1800)
music = music + pad
# swell at reunion / hug, gentle fade at the very end
music *= 0.75 + 0.35 * ramp(S["v10"], 58, 2.5)
music *= np.clip((DUR - tt) / 2.0, 0, 1) * np.clip(tt / 0.8, 0, 1)

# ---- SFX ----
sfx = np.zeros(N)
rain_noise = bp(rng.standard_normal(N), 900, 7000) * 0.9 + lp(rng.standard_normal(N), 400) * 0.6
rain_amt = 0.35 * ramp(0, S["v04"], 1.5) + 0.35 * ramp(S["v04"], S["v11"] - 0.2, 1.0)
rain_amt *= 1 - 0.6 * ramp(S["v02"] + 2.6, S["v04"], 0.3)   # muffled inside bus
rain_amt = np.maximum(rain_amt, 0.25 * ramp(S["v04"], S["v04"] + 3.0, 0.3))
sfx += rain_noise * rain_amt * 0.22

def add(y, at, g=1.0):
    s = int(at * SR)
    if 0 <= s < N:
        sfx[s:s + len(y)] += g * y[: N - s]

# thunder at the "last day" exterior
k = np.arange(int(4.0 * SR)) / SR
thunder = lp(rng.standard_normal(len(k)), 160, 4) * np.exp(-k * 1.1) * (1 - np.exp(-k * 30))
thunder += lp(rng.standard_normal(len(k)), 900) * np.exp(-k * 6) * 0.4
add(thunder / np.abs(thunder).max(), S["v04"] - 0.15, 0.55)
# engine rumble as the bus is about to leave
k = np.arange(int(4.5 * SR)) / SR
eng = (np.sin(2 * np.pi * 38 * k) + 0.5 * np.sin(2 * np.pi * 76 * k + np.sin(2 * np.pi * 7 * k))) * lp(rng.standard_normal(len(k)), 200) * 2
eng *= np.minimum(1, k / 0.4) * np.clip((4.5 - k) / 1.0, 0, 1)
add(eng / np.abs(eng).max(), S["v06"] - 0.3, 0.22)
# two short horn honks
for h in (0.0, 0.45):
    k = np.arange(int(0.32 * SR)) / SR
    horn = np.sign(np.sin(2 * np.pi * 415 * k)) * 0.5 + np.sign(np.sin(2 * np.pi * 523 * k)) * 0.5
    horn = lp(horn, 2500) * np.minimum(1, k / 0.02) * np.clip((0.32 - k) / 0.05, 0, 1)
    add(horn, S["v06"] + 0.5 + h, 0.12)
# splashy running footsteps
for i in range(14):
    k = np.arange(int(0.18 * SR)) / SR
    step = bp(rng.standard_normal(len(k)), 300, 3000) * np.exp(-k * 28)
    add(step, S["v06"] + 1.6 + i * 0.27, 0.35 * min(1, 0.3 + i / 10))
# chalk wipe / cloth swishes
for i in range(4):
    k = np.arange(int(0.35 * SR)) / SR
    sw = bp(rng.standard_normal(len(k)), 1500, 6000) * np.sin(np.pi * k / 0.35)
    add(sw, S["v05"] + 0.4 + i * 0.5, 0.18)
    add(sw, S["v11"] + 0.6 + i * 0.4, 0.15)
# soft chime as the girl sits
for j, n in enumerate([84, 88, 91]):
    add(piano(n, 2.5, 0.25), S["v11"] + 1.8 + j * 0.12)

# ---- mix: music and SFX sit at about half the voice level, ducked under speech ----
speech_env = np.convolve(np.abs(voice), np.ones(SR // 10) / (SR // 10), mode="same")
duck = 1 - 0.35 * np.clip(speech_env / (speech_env.max() * 0.25 + 1e-9), 0, 1)
bed = (music / (np.abs(music).max() + 1e-9) * 0.42 + sfx * 0.9) * duck
L = voice + bed * 0.98
R = voice + bed * 1.02
mix = np.stack([L, R], axis=1)
mix *= 0.95 / np.abs(mix).max()
wavio.write(f"{out}/mix.wav", SR, (mix * 32767).astype(np.int16))
print("wrote", out)
