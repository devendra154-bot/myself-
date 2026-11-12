# 📡 Ultrasonic Sensor (HC-SR04): Self Introduction & Uses

60-second, 9:16 vertical (1080×1920), 2D cinematic cartoon video. The HC-SR04 introduces itself with a natural **English voice-over** (no captions).

- **`ultrasonic-sensor.mp4`**: the finished video
- **`index.html`**: the same animation, playable in a browser
- `assets/reference-hc-sr04.jpg`: the reference photo the character is based on

| Chapter | Content |
|---|---|
| 1 Introduction | Spotlight, power-on, the sensor opens its eyes and waves. Transmitter and receiver are labelled |
| 2 How I Work | 40 kHz waves go out, echo back from an object, with a distance ruler and timer. Bat cameo |
| 3 The Formula | Distance = (Speed × Time) ÷ 2, 343 m/s, "go and back" animation |
| 4 My Specs | Range 2 cm–4 m, 5 V, pins VCC/Trig/Echo/GND light up, Arduino |
| 5 Where I Work | Parking sensor, robot, water tank, smart stick for the blind, smart dustbin |
| 6 Finale | Thumbs-up, ripples, confetti, end title |

The mouth is lip-synced to the voice. Sonar pings and the music bed are timed from `assets/timeline.json`.

## Voice
Generated with **Kokoro-82M** (`am_puck` male voice), an offline neural TTS model. `build_audio.py` synthesises each line separately and fits the whole script into exactly 60 s.

```
pip install kokoro-onnx soundfile
# put kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases) in models/
python3 build_audio.py --engine kokoro --voice am_puck    # or af_heart, am_michael, af_bella ...
python3 build_audio.py --engine elevenlabs --voice <id>   # needs ElevenLabs credits
python3 build_audio.py --engine files                     # your own recordings: models/lines/01.wav ...
node render.js                                            # -> ultrasonic-sensor.mp4
```
Edit the lines in `scenes.json`. Keep each scene's line count, because the animation is keyed to it.
