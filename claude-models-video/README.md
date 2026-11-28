# Claude AI Models — 60s vertical explainer (Tanglish)

- `claude_models_telugu_1080x1920.mp4`: 60 s, 9:16, 30 fps, H.264 + AAC. Music, SFX and Tanglish subtitles; no narration yet.
- `voiceover_script.md`: the 7 lines (s1–s7) to record. Once the clips exist, the video is re-timed to them.
- `qa_sheet.jpg`: one still every 5 s.
- `tools/`: three.js scene (`web/main.js`), Playwright renderer, synth music/SFX, mixer, encode script.

Specs shown on screen (official Claude API table): all four models have a 1M context window and 128K max output.
Prices per 1M tokens (input / output): Haiku 5.5 $0.10 / $0.50 (prompts up to 100K tokens), Sonnet 5.5 $2 / $10, Opus 5.5 $4 / $20, Fable 5.2 $8 / $40.

Rebuild: `npm i three@0.160.0`, serve the folder on :8765, `node render.mjs frames 0-1799`, then `bash finish.sh`.
