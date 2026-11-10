# 🪖 హెల్మెట్ ధరించండి – Talking Helmet Road-Safety Video

45-second, 9:16 vertical (1080×1920), 2D cartoon video in which a cute helmet talks to the viewer in Telugu.

- **`helmet-safety.mp4`** — the finished video
- **`index.html`** — the same animation, playable in a browser (`/helmet-video/` on the site)

| Scene | Content |
|---|---|
| 1 హెల్మెట్ పరిచయం | Helmet pops in, waves, introduces itself |
| 2 నిర్లక్ష్యం | Rider walks to the bike leaving the helmet on the seat. Worried helmet, ⚠ warning |
| 3 హెల్మెట్ ప్రాముఖ్యత | Helmet drops onto the head, strap buckles "క్లిక్!", ✔ సురక్షితం |
| 4 కుటుంబం | Rider arrives home safely, family waves, hearts float |
| 5 ముగింపు | Thumbs-up, confetti, final tagline |

The mouth is lip-synced to the voice track's loudness, and Telugu subtitles are timed to the dialogue.

## Voice
The current voice is an **offline espeak-ng Telugu guide voice**, which sounds robotic. It is there so the timing and lip-sync work.
To use a real voice artist or ElevenLabs recording:

1. Record one 45 s file in which each scene's line starts at the scene time in `assets/timeline.json`. Save it as `assets/voice.wav`.
2. `python3 build_audio.py --keep-voice` re-syncs the mouth and subtitles and remixes the music.
3. `node render.js` re-renders `helmet-safety.mp4`.

## Rebuild from scratch
Needs `espeak-ng`, `ffmpeg`, `fonts-noto-core` (Noto Sans Telugu), Node + Playwright.

```
python3 build_audio.py      # voice + music + timeline (edit dialogue in scenes.json)
node render.js              # render MP4
node render.js --preview 3 20 40   # preview stills in ./preview
```
