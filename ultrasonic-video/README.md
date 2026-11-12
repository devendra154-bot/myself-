# 📡 Ultrasonic Sensor (HC-SR04): Self Introduction & Uses

93-second, 9:16 vertical (1080×1920), 2D cinematic cartoon video. The HC-SR04 introduces itself with a **Telugu voice-over** and **English captions**.

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

The mouth is lip-synced to the voice. Captions, sonar pings, and the music bed are timed from `assets/timeline.json`.

## Voice
The current voice is an **offline espeak-ng Telugu guide voice**, which sounds robotic. To use a real voice artist or ElevenLabs recording:
1. Record the Telugu lines from `scenes.json` so that each line starts at its `start` time in `assets/timeline.json`. Save the recording as `assets/voice.wav`.
2. Run `python3 build_audio.py --keep-voice`, then `node render.js`.

## Rebuild
Needs `espeak-ng`, `ffmpeg`, `fonts-noto-core`, Node + Playwright.
```
python3 build_audio.py     # edit dialogue/captions in scenes.json first
node render.js             # -> ultrasonic-sensor.mp4
node render.js --preview 5 30 60   # stills in ./preview
```
