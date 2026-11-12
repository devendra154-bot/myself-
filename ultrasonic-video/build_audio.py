"""Build the English voice-over, music bed, sonar pings and assets/timeline.json.

The video is fitted to exactly `duration` seconds (scenes.json). Each line is
synthesised separately, so the animation knows exactly when every line starts.

Voice engines (natural voices only for the final video):
  --engine elevenlabs   ElevenLabs API (needs credits). --voice <voice_id>
  --engine kokoro       Kokoro-82M, offline neural TTS. Needs
                        models/kokoro-v1.0.onnx and models/voices-v1.0.bin
                        (github.com/thewh1teagle/kokoro-onnx releases) and
                        `pip install kokoro-onnx`. --voice e.g. am_puck, af_heart
  --engine files        Your own recordings: models/lines/01.wav, 02.wav, ...
                        one file per line, in scenes.json order.
  --engine espeak       Robotic placeholder, for timing tests only.
"""
import argparse, json, os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A, M = os.path.join(HERE, "assets"), os.path.join(HERE, "models")
SR = 44100
cfg = json.load(open(os.path.join(HERE, "scenes.json")))
FPS, DUR = cfg["fps"], cfg["duration"]
PING_PERIOD = 1.6  # must match index.html
MIN_GAP, MIN_LEAD, MIN_TAIL = 0.22, 0.35, 0.35


def read_wav(p):
    with wave.open(p) as w:
        sr, n, ch, sw = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
    x = (np.frombuffer(raw, np.int16).astype(np.float32) / 32768) if sw == 2 else np.frombuffer(raw, np.int32).astype(np.float32) / 2 ** 31
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    if sr != SR: x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    return x.astype(np.float32)


def write_wav(p, x):
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def to_wav(src, speed=1.0):
    out = os.path.join(A, "_line.wav")
    af = "aresample=44100" + (f",atempo={speed:.3f}" if abs(speed - 1) > 1e-3 else "")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af, "-ac", "1", out], check=True)
    x = read_wav(out); os.remove(out)
    nz = np.where(np.abs(x) > 0.008)[0]
    return x[max(0, nz[0] - 400): nz[-1] + 2000] if len(nz) else x


class Engine:
    def __init__(self, name, voice):
        self.name, self.voice = name, voice
        if name == "kokoro":
            from kokoro_onnx import Kokoro
            self.k = Kokoro(os.path.join(M, "kokoro-v1.0.onnx"), os.path.join(M, "voices-v1.0.bin"))
            self.voice = voice or "am_puck"

    def say(self, text, idx, speed):
        tmp = os.path.join(A, "_tts")
        if self.name == "elevenlabs":
            import urllib.request
            body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
                               "voice_settings": {"stability": .45, "similarity_boost": .8, "style": .35, "speed": min(1.2, speed)}}).encode()
            req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice or 'TX3LPaxmHKxFdv7VOQHJ'}?output_format=mp3_44100_128",
                                         data=body, headers={"Content-Type": "application/json", "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "proxy")})
            open(tmp + ".mp3", "wb").write(urllib.request.urlopen(req).read())
            return to_wav(tmp + ".mp3", speed / min(1.2, speed))
        if self.name == "kokoro":
            import soundfile as sf
            audio, sr = self.k.create(text, voice=self.voice, speed=speed, lang="en-us")
            sf.write(tmp + ".wav", audio, sr)
            return to_wav(tmp + ".wav")
        if self.name == "files":
            return to_wav(os.path.join(M, "lines", f"{idx + 1:02d}.wav"), speed)
        subprocess.run(["espeak-ng", "-v", "en-us", "-s", str(int(165 * speed)), "-w", tmp + ".wav", text], check=True)
        return to_wav(tmp + ".wav")


def pad_tone(freqs, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    s = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .3 * t) * .4) + .3 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    return (s * env * amp / len(freqs)).astype(np.float32)


def music(dur):
    n = int(dur * SR); out = np.zeros(n, np.float32)
    mid = lambda m: 440 * 2 ** ((m - 69) / 12)
    prog = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71]]
    bar, t, i = 4.0, 0.0, 0
    while t < dur:
        ch = prog[i % 4]; k = int(t * SR)
        for seg in (pad_tone([mid(m) for m in ch], bar + 1.2, .16), pad_tone([mid(ch[0] - 12)], bar + .6, .2)):
            out[k:k + len(seg)] += seg[: max(0, n - k)]
        for j in range(8):
            kk = int((t + j * bar / 8) * SR); ts = np.arange(SR) / SR
            p = (np.sin(2 * np.pi * mid(ch[[0, 1, 2, 3, 2, 1, 2, 3][j]] + 12) * ts) * np.exp(-ts * 6) * .07).astype(np.float32)
            out[kk:kk + SR] += p[: max(0, n - kk)]
        t += bar; i += 1
    f = np.ones(n, np.float32); f[:2 * SR] = np.linspace(0, 1, 2 * SR); f[-int(2.5 * SR):] = np.linspace(1, 0, int(2.5 * SR))
    return out * f


def ping():
    t = np.arange(int(.5 * SR)) / SR
    return (np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 9) * .22 + np.sin(2 * np.pi * 3700 * t) * np.exp(-t * 14) * .06).astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=["elevenlabs", "kokoro", "files", "espeak"])
    ap.add_argument("--voice")
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()
    eng = Engine(a.engine, a.voice)
    scenes = cfg["scenes"]
    texts = [l for s in scenes for l in s["lines"]]
    nlines, nsc = len(texts), len(scenes)
    fixed = MIN_LEAD * nsc + MIN_TAIL * nsc + MIN_GAP * (nlines - nsc) + 0.8  # +0.8 end hold
    speed = a.speed
    for _ in range(8):
        clips = [eng.say(t, i, speed) for i, t in enumerate(texts)]
        speech = sum(len(c) for c in clips) / SR
        print(f"speed {speed:.2f}: speech {speech:.1f}s + pauses {fixed:.1f}s = {speech + fixed:.1f}s (target {DUR}s)")
        if speech + fixed <= DUR: break
        speed *= (speech + fixed) / DUR * 1.01
    else:
        raise SystemExit("Script too long for the duration; shorten scenes.json")
    spare = DUR - speech - fixed
    # distribute spare time: more breathing room at scene boundaries
    gap = MIN_GAP + spare * .45 / max(1, nlines - nsc)
    lead = MIN_LEAD + spare * .3 / nsc
    tail = MIN_TAIL + spare * .25 / nsc

    voice = np.zeros(DUR * SR, np.float32); meta = []; t = 0.0; ci = 0
    for sc in scenes:
        st = t; t += lead; lines = []
        for j, txt in enumerate(sc["lines"]):
            x = clips[ci]; ci += 1
            k = int(t * SR); voice[k:k + len(x)] += x[: len(voice) - k]
            lines.append({"start": round(t, 3), "dur": round(len(x) / SR, 3), "text": txt})
            t += len(x) / SR + (gap if j < len(sc["lines"]) - 1 else 0)
        t += tail
        meta.append({"id": sc["id"], "title": sc["title"], "start": round(st, 3), "end": round(t, 3), "lines": lines})
    meta[-1]["end"] = DUR
    voice = voice / np.abs(voice).max() * .9
    write_wav(os.path.join(A, "voice.wav"), voice)

    hop = SR // FPS
    env = np.array([np.sqrt(np.mean(voice[f * hop:(f + 1) * hop] ** 2)) for f in range(DUR * FPS)])
    loud = env[env > .01]
    env = np.convolve(np.clip(env / (np.percentile(loud, 90) if len(loud) else 1), 0, 1), [.25, .5, .25], "same")
    duck = 1 - .6 * np.clip(np.repeat(env, hop) * 2, 0, 1)
    duck = np.pad(duck, (0, max(0, len(voice) - len(duck))), constant_values=1)[: len(voice)].astype(np.float32)
    fx = np.zeros_like(voice); s2 = meta[1]; pt = s2["start"] + .3
    while pt < s2["end"] - .4:
        k = int(pt * SR); p = ping(); fx[k:k + len(p)] += p[: len(fx) - k]; pt += PING_PERIOD
    mix = voice + music(DUR) * duck * .5 + fx
    mix /= max(1, np.abs(mix).max() / .95)
    write_wav(os.path.join(A, "_mix.wav"), mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(A, "_mix.wav"), "-b:a", "160k", os.path.join(A, "audio.m4a")], check=True)
    os.remove(os.path.join(A, "_mix.wav"))
    for f in ("_tts.wav", "_tts.mp3"):
        if os.path.exists(os.path.join(A, f)): os.remove(os.path.join(A, f))
    json.dump({"fps": FPS, "duration": DUR, "pingPeriod": PING_PERIOD, "engine": a.engine, "scenes": meta,
               "mouth": [round(float(v), 3) for v in env]}, open(os.path.join(A, "timeline.json"), "w"), indent=0)
    for m in meta: print(m["id"], m["title"], m["start"], "->", m["end"])


if __name__ == "__main__":
    main()
