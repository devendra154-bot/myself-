"""Build the voice + music track and the lip-sync timeline.

Voice: espeak-ng Telugu guide voice (offline). Replace assets/voice.wav with a
professional recording / ElevenLabs output and re-run with --keep-voice to
re-sync the mouth to the new audio.
"""
import json, subprocess, sys, wave, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
SR = 44100
cfg = json.load(open(os.path.join(HERE, "scenes.json")))
FPS, DUR = cfg["fps"], cfg["duration"]
LEAD = 0.45  # seconds of silence at the start of each scene


def read_wav(path):
    with wave.open(path) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    if sr != SR:  # simple linear resample
        t = np.arange(int(len(x) * SR / sr)) * sr / SR
        x = np.interp(t, np.arange(len(x)), x)
    return x


def tts(text, speed, out):
    tmp = out + ".raw.wav"
    subprocess.run(["espeak-ng", "-v", "te", "-s", str(speed), "-p", "72", "-a", "180",
                    "-w", tmp, text], check=True)
    # brighten / warm the robotic voice a bit
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af",
                    "aresample=44100,highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,"
                    "acompressor=threshold=-18dB:ratio=3,aecho=0.8:0.5:25:0.12",
                    "-ac", "1", out], check=True)
    os.remove(tmp)
    return read_wav(out)


def music():
    """Cheerful, quiet plucked pentatonic loop (pure numpy synthesis)."""
    t_total = int(DUR * SR)
    out = np.zeros(t_total, np.float32)
    bpm = 104
    beat = 60 / bpm
    chords = [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]]  # C Am F G
    def pluck(freq, dur, amp):
        n = int(dur * SR)
        tt = np.arange(n) / SR
        env = np.exp(-tt * 5.5) * np.minimum(1, tt * 200)
        s = (np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt)
             + 0.12 * np.sin(6 * np.pi * freq * tt))
        return (s * env * amp).astype(np.float32)
    mid = lambda m: 440 * 2 ** ((m - 69) / 12)
    step = 0
    t = 0.0
    while t < DUR:
        ch = chords[(step // 8) % 4]
        note = ch[[0, 1, 2, 1, 0, 2, 1, 2][step % 8]] + 12
        p = pluck(mid(note), beat * 1.6, 0.18)
        i = int(t * SR)
        out[i:i + len(p)] += p[: max(0, t_total - i)]
        if step % 4 == 0:  # bass
            b = pluck(mid(ch[0] - 12), beat * 3, 0.22)
            out[i:i + len(b)] += b[: max(0, t_total - i)]
        step += 1
        t += beat / 2
    fade = np.ones(t_total, np.float32)
    nf = int(1.5 * SR)
    fade[-nf:] = np.linspace(1, 0, nf)
    fade[: int(0.5 * SR)] = np.linspace(0, 1, int(0.5 * SR))
    return out * fade


def main():
    keep = "--keep-voice" in sys.argv
    voice_path = os.path.join(A, "voice.wav")
    scenes = cfg["scenes"]
    meta = []
    if keep:
        # Use an existing voice.wav and the scene boundaries already in timeline.json
        voice = read_wav(voice_path)[: int(DUR * SR)]
        voice = np.pad(voice, (0, int(DUR * SR) - len(voice)))
        old = {s["id"]: s for s in json.load(open(os.path.join(A, "timeline.json")))["scenes"]}
        for sc in scenes:
            st, en = old[sc["id"]]["start"], old[sc["id"]]["end"]
            seg = voice[int(st * SR): int(en * SR)]
            nz = np.where(np.abs(seg) > 0.02)[0]
            vs = st + (nz[0] / SR if len(nz) else LEAD)
            vd = (nz[-1] - nz[0]) / SR if len(nz) else en - st
            meta.append({"id": sc["id"], "start": st, "end": en,
                         "voiceStart": round(vs, 3), "voiceDur": round(vd, 3)})
    else:
        # One uniform speaking speed for every scene, as slow as fits in DUR.
        tail = 0.35
        for speed in range(165, 300, 6):
            clips = [tts(sc["text"], speed, os.path.join(A, f"_s{sc['id']}.wav")) for sc in scenes]
            need = sum(len(c) / SR + LEAD + tail for c in clips)
            print(f"speed {speed}: {need:.2f}s needed")
            if need <= DUR - 0.3:
                break
        for sc in scenes:
            os.remove(os.path.join(A, f"_s{sc['id']}.wav"))
        spare = (DUR - need) / len(scenes)
        voice = np.zeros(int(DUR * SR), np.float32)
        t = 0.0
        for sc, x in zip(scenes, clips):
            length = len(x) / SR + LEAD + tail + spare
            vs = t + LEAD + spare / 2
            i = int(vs * SR)
            voice[i:i + len(x)] += x[: len(voice) - i]
            end = DUR if sc is scenes[-1] else t + length
            meta.append({"id": sc["id"], "start": round(t, 3), "end": round(end, 3),
                         "voiceStart": round(vs, 3), "voiceDur": round(len(x) / SR, 3)})
            t += length
        voice = voice / (np.abs(voice).max() or 1) * 0.9
        with wave.open(voice_path, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((voice * 32767).astype(np.int16).tobytes())

    # mouth-open envelope per video frame
    hop = SR // FPS
    n = DUR * FPS
    env = np.array([np.sqrt(np.mean(voice[f * hop:(f + 1) * hop] ** 2)) for f in range(n)])
    loud = env[env > 0.01]
    env = np.clip(env / (np.percentile(loud, 90) if len(loud) else 1), 0, 1)
    env = np.convolve(env, [0.25, 0.5, 0.25], mode="same")

    # music, ducked under the voice
    duck = 1 - 0.65 * np.clip(np.repeat(env, hop) * 2, 0, 1)
    duck = np.pad(duck, (0, max(0, len(voice) - len(duck))), constant_values=1)[: len(voice)]
    mix = voice + music() * duck.astype(np.float32) * 0.6
    mix = mix / max(1.0, np.abs(mix).max() / 0.95)
    with wave.open(os.path.join(A, "mix.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(A, "mix.wav"),
                    "-b:a", "160k", os.path.join(A, "audio.m4a")], check=True)
    os.remove(os.path.join(A, "mix.wav"))

    for m, sc in zip(meta, scenes):
        m.update(title=sc["title"], text=sc["text"])
        print(m["id"], m["start"], m["end"], m["voiceStart"], m["voiceDur"])
    json.dump({"fps": FPS, "duration": DUR, "scenes": meta,
               "mouth": [round(float(v), 3) for v in env]},
              open(os.path.join(A, "timeline.json"), "w"), ensure_ascii=False)
    print("wrote assets/timeline.json, assets/audio.m4a")


if __name__ == "__main__":
    main()
