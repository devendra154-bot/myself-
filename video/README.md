# DevInventor Video (Remotion)

Cinematic videos written as React code with [Remotion](https://www.remotion.dev).

## Setup
```bash
cd video
npm install
npm run studio     # opens Remotion Studio in the browser: preview and edit live
npm run render     # renders out/CinematicIntro.mp4 (1920x1080)
npm run render:all # also renders the vertical 1080x1920 version for Reels/Shorts
```
Natural voices (Microsoft Edge, free): `python3 scripts/edge_say.py --voice en-IN-PrabhatNeural --text "..." --write-media out.mp3`.
Indian voices: en-IN-PrabhatNeural, en-IN-NeerjaNeural, te-IN-MohanNeural, te-IN-ShrutiNeural, hi-IN-MadhurNeural, hi-IN-SwaraNeural.
The script sends the text to Microsoft's online voice service. Install with `pip install edge-tts`.

If Remotion can't download its own browser, point it at an installed Chrome:
`REMOTION_BROWSER=/path/to/chrome npm run render`.

## What's inside
- `src/CinematicIntro.tsx`: a movie-style title intro with letterbox bars, a slow camera push-in,
  light rays, floating dust, an anamorphic lens flare, film grain and a vignette.
  Change the text with props: `presents`, `title`, `tagline`.
- `src/Root.tsx`: the compositions (wide 16:9 and vertical 9:16).

## License note
Remotion is free for individuals and companies with up to 3 employees.
Larger companies need a paid company license (see remotion.dev/license).

## Jatayu's Last Flight (Remotion version)
A vertical 1080x1920 Ramayana short with a cinematic intro, natural Indian voices, music and sound effects.
```bash
python3 scripts/jatayu_audio.py                     # voices (Edge TTS) + timeline + music/SFX bed
npx remotion render JatayuFilm out/Jatayus_Last_Flight_HD.mp4
```
- `scripts/jatayu_audio.py`: the script, voices per character, and the sound design. Scene lengths follow the narration.
- `src/jatayu/JatayuFilm.tsx`: intro, scenes, subtitles, god-rays, grain, camera push-in, audio.
- `src/jatayu/art.js`: the character and scene drawings (Ravana is a cartoon of the creator).
