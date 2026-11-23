# 🚌 The Extra Seat – Part 3 (ముగింపు) · 60s · 9:16 · Telugu

**Video:** `The_Extra_Seat_Part3_Telugu_9x16.mp4` (1080×1920, 24 fps, 60.0 s, H.264 + AAC, about −13.5 LUFS)

2D cartoon short with a cinematic look and a Telugu voiceover, music and sound effects. Telugu captions are burned in. Every frame is drawn by code (`tools/scene.html`), so there's no third-party artwork.

## Story
For ten years, conductor **Ramulu Thatha** has kept one seat on the 6 PM village bus empty, with "శ్రీను కోసం" written on it in chalk, for his son **Srinu**, who left for the city. On Thatha's last working day it's pouring with rain, and as the bus is about to leave, Srinu comes running with his little daughter. The chalk gets wiped off, the granddaughter takes the extra seat, and the bus drives off into a sunset after the rain.

## Shot list
| Time | Shot | Voiceover |
|---|---|---|
| 0:00 | Dusk village, bus arrives, title card | పది సంవత్సరాలుగా, సాయంత్రం ఆరు గంటల బస్సులో, ఒక సీటు ఎప్పుడూ ఖాళీగానే ఉంటుంది. |
| 0:04 | Inside the bus: the glowing empty seat | ″ |
| 0:07 | Thatha holds Srinu's old photo | కండక్టర్ రాములు తాతయ్య, ఆ సీటును ఎవ్వరికీ ఇవ్వడు. అది పట్నం వెళ్ళిన తన కొడుకు శ్రీను కోసం. |
| 0:15 | Storm, lightning, "చివరి రోజు" | ఈ రోజు, తాతయ్య ఉద్యోగంలో చివరి రోజు. బయట వర్షం. లోపల, అదే ఖాళీ సీటు. |
| 0:21 | Cloth wipes the seat, then a tear | ఎప్పటిలాగే, తాతయ్య ఆ సీటును తుడిచాడు. కానీ ఈసారి, ఆయన కళ్ళలో ఆశ తగ్గింది. |
| 0:29 | Rear-door view, a runner in the rain | బస్సు కదలబోతుండగా, ఎవరో పరుగెత్తుకుంటూ వస్తున్నారు! · **శ్రీను:** నాన్నా! ఆగండి! |
| 0:35 | At the door: Srinu with the girl | అది శ్రీను. తన చేతిలో, ఒక చిన్న పాప. |
| 0:38 | Two-shot, ending in a hug | **శ్రీను:** నాన్నా, ఆ సీటు ఇంకా నా కోసమే ఉందా? · **తాతయ్య:** పదేళ్లుగా ఈ సీటు ఖాళీగా లేదురా. నా ఆశతో నిండి ఉంది. |
| 0:47 | Chalk wiped, the granddaughter sits, everyone claps | ఆ రోజు, ఆ ఎక్స్ట్రా సీటులో, తాతయ్య మనవరాలు కూర్చుంది. |
| 0:53 | Sunset and rainbow, bus drives away, end card | కొన్ని సీట్లు ఖాళీగా కనిపిస్తాయి. కానీ అవి ప్రేమతో నిండి ఉంటాయి. |

## Rebuilding
```
cd tools
python3 make_vo.py vo_lines.json /tmp/vo                 # Telugu TTS: facebook/mms-tts-tel (CPU)
# pitch/tempo per character (see the chat log): narrator tempo 1.05, son pitch 1.05, father pitch 0.88
python3 make_audio.py /tmp/vo2 /tmp/build                # timeline.json, lip-sync, music, SFX, mix.wav
node render.js /tmp/build/timeline.json /tmp/build/mix.wav out.mp4
```
To swap in your own (better) voice recording, replace the WAVs in the vo folder, keeping the same file names, and re-run the last two steps. Shot timings and mouth movement follow the new audio automatically.

**Voice licence note:** the TTS model `facebook/mms-tts-tel` is licensed **CC BY-NC 4.0** (non-commercial). For a monetised channel, re-voice with your own recording or a commercial TTS. Fonts are SIL OFL; music and SFX are synthesised in `make_audio.py`.
