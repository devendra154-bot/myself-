"""Telugu voice-over (espeak-ng guide voice), cinematic music bed, sonar pings,
and timeline.json (scene + per-line timing, mouth envelope).

To use a real recording: save it as assets/voice.wav (same timing as
timeline.json) and run with --keep-voice.
"""
import json, subprocess, sys, wave, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
SR = 44100
cfg = json.load(open(os.path.join(HERE, "scenes.json")))
FPS = cfg["fps"]
SPEED = 170          # espeak words per minute
GAP, LEAD, TAIL = 0.35, 0.7, 0.8
PING_PERIOD = 1.6    # must match index.html (scene 2 wave emission)


def read_wav(p):
    with wave.open(p) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    if sr != SR: x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    return x


def write_wav(p, x):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def tts(text):
    raw, out = os.path.join(A, "_raw.wav"), os.path.join(A, "_tts.wav")
    subprocess.run(["espeak-ng", "-v", "te", "-s", str(SPEED), "-p", "62", "-a", "180", "-w", raw, text], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    "aresample=44100,highpass=f=90,equalizer=f=2800:t=q:w=1:g=3,"
                    "acompressor=threshold=-18dB:ratio=3,aecho=0.8:0.45:30:0.1", "-ac", "1", out], check=True)
    x = read_wav(out); os.remove(raw); os.remove(out)
    nz = np.where(np.abs(x) > 0.01)[0]
    return x[nz[0]:nz[-1] + 1] if len(nz) else x


def pad_tone(freqs, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    s = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .3 * t) * .4) + .3 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    return (s * env * amp / len(freqs)).astype(np.float32)


def music(dur):
    n = int(dur * SR); out = np.zeros(n, np.float32)
    mid = lambda m: 440 * 2 ** ((m - 69) / 12)
    prog = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71]]  # Am F C G
    bar = 4.0; t = 0.0; i = 0
    while t < dur:
        ch = prog[i % 4]
        seg = pad_tone([mid(m) for m in ch], bar + 1.2, .16)
        k = int(t * SR); out[k:k + len(seg)] += seg[: max(0, n - k)]
        bass = pad_tone([mid(ch[0] - 12)], bar + .6, .2)
        out[k:k + len(bass)] += bass[: max(0, n - k)]
        # soft arpeggio pluck
        for j in range(8):
            tt = t + j * bar / 8; kk = int(tt * SR)
            m = ch[[0, 1, 2, 3, 2, 1, 2, 3][j]] + 12
            ln = int(1.0 * SR); ts = np.arange(ln) / SR
            p = np.sin(2 * np.pi * mid(m) * ts) * np.exp(-ts * 6) * .07
            out[kk:kk + ln] += p[: max(0, n - kk)].astype(np.float32)
        t += bar; i += 1
    f = np.ones(n, np.float32); f[:int(2 * SR)] = np.linspace(0, 1, int(2 * SR)); f[-int(2.5 * SR):] = np.linspace(1, 0, int(2.5 * SR))
    return out * f


def ping(dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 9) * .22 + np.sin(2 * np.pi * 3700 * t) * np.exp(-t * 14) * .06).astype(np.float32)


def main():
    keep = "--keep-voice" in sys.argv
    scenes, meta = cfg["scenes"], []
    if keep:
        old = json.load(open(os.path.join(A, "timeline.json")))
        meta, DUR = old["scenes"], old["duration"]
        voice = read_wav(os.path.join(A, "voice.wav"))
        voice = np.pad(voice, (0, max(0, int(DUR * SR) - len(voice))))[: int(DUR * SR)]
    else:
        clips, t = [], 0.0
        for sc in scenes:
            st = t; t += LEAD; lines = []
            for ln in sc["lines"]:
                x = tts(ln["te"]); clips.append((t, x))
                lines.append({"start": round(t, 3), "dur": round(len(x) / SR, 3), "en": ln["en"], "te": ln["te"]})
                t += len(x) / SR + GAP
            t += TAIL - GAP
            meta.append({"id": sc["id"], "title": sc["title"], "start": round(st, 3), "end": round(t, 3), "lines": lines})
        DUR = int(np.ceil(t + 0.5)); meta[-1]["end"] = DUR
        voice = np.zeros(int(DUR * SR), np.float32)
        for st, x in clips:
            k = int(st * SR); voice[k:k + len(x)] += x
        voice = voice / np.abs(voice).max() * .9
        write_wav(os.path.join(A, "voice.wav"), voice)
        for m in meta: print(m["id"], m["start"], m["end"], len(m["lines"]))

    hop = SR // FPS; nf = DUR * FPS
    env = np.array([np.sqrt(np.mean(voice[f * hop:(f + 1) * hop] ** 2)) for f in range(nf)])
    loud = env[env > .01]
    env = np.convolve(np.clip(env / (np.percentile(loud, 90) if len(loud) else 1), 0, 1), [.25, .5, .25], "same")

    duck = 1 - .6 * np.clip(np.repeat(env, hop) * 2, 0, 1)
    duck = np.pad(duck, (0, max(0, len(voice) - len(duck))), constant_values=1)[: len(voice)].astype(np.float32)
    fx = np.zeros_like(voice)
    s2 = next(m for m in meta if m["id"] == 2)
    pt = s2["start"] + .3
    while pt < s2["end"] - .4:
        k = int(pt * SR); p = ping(); fx[k:k + len(p)] += p[: len(fx) - k]; pt += PING_PERIOD
    mix = voice + music(DUR) * duck * .55 + fx
    mix /= max(1, np.abs(mix).max() / .95)
    write_wav(os.path.join(A, "_mix.wav"), mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(A, "_mix.wav"), "-b:a", "160k",
                    os.path.join(A, "audio.m4a")], check=True)
    os.remove(os.path.join(A, "_mix.wav"))
    json.dump({"fps": FPS, "duration": DUR, "pingPeriod": PING_PERIOD, "scenes": meta,
               "mouth": [round(float(v), 3) for v in env]}, open(os.path.join(A, "timeline.json"), "w"), ensure_ascii=False)
    print("duration", DUR, "s")


if __name__ == "__main__":
    main()
