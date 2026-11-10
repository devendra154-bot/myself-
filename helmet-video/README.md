# 🪖 Talking Helmet – Telugu Road-Safety Reel (45s, 9:16)

Everything for the "హెల్మెట్ ధరించండి – మీ ప్రాణాలను కాపాడుకోండి!" video: hooks, Kling prompts, A/B hook versions, captions and cover thumbnails.

```
helmet-video/
├── README.md                     ← this file (hooks, prompts, captions)
├── thumbnails/                   ← ready-to-upload covers, 1080×1920
│   ├── Thumbnail_A_phone_cover.png
│   ├── Thumbnail_B_hairstyle.png
│   └── Thumbnail_C_amma.png
└── tools/
    ├── render-thumbnails.js      ← re-renders the covers (Playwright + Chromium)
    ├── frames/                   ← frames taken from the reference clip
    └── fonts/                    ← Ramabhadra, Noto Sans Telugu, Anton (SIL OFL)
```

---

## 1. Viral hooks (first 0–3 seconds)

The original Scene 1 opens with a greeting ("హాయ్ ఫ్రెండ్స్!"), which is where viewers swipe away. Put the hook first and the greeting after it.

**Curiosity**
1. నేను రోజూ మీ బైక్ మీదే కూర్చుంటా... కానీ మీ తల మీదకి ఎప్పుడూ రాను. ఎందుకు?
2. ఆగండి! ఈ వీడియో స్కిప్ చేస్తే... మీ తల సేఫ్ కాకపోవచ్చు!
3. POV: మీ హెల్మెట్‌కి నోరు వస్తే... 😳
4. హాయ్! నేను మాట్లాడే హెల్మెట్‌ని... మీకు ఒక సీక్రెట్ చెప్తా 😉

**Witty / relatable**
5. ⭐ మీ ఫోన్‌కి ₹500 కవర్ వేస్తారు... మరి మీ తలకి?
6. ⭐ హెయిర్‌స్టైల్ పాడవుతుందని నన్ను పెట్టుకోవట్లేదా? తలకే దెబ్బ తగిలితే హెయిర్‌స్టైల్ ఎవరికి చూపిస్తావ్?
7. అన్నా... హెల్మెట్ పట్టుకొని వెళ్తున్నావా? పెట్టుకొని వెళ్తున్నావా?
8. మీ బైక్ మిర్రర్‌కి నేను అలంకారం కాదు బాస్!
9. నేను అలిగాను! 😤 ఎందుకో తెలుసా?

**Emotional**
10. ⭐ పోలీసులకి భయపడి నన్ను పెట్టుకోకండి... మీ అమ్మ కోసం పెట్టుకోండి.
11. ఒక్క సెకను... ఇంట్లో మీకోసం ఎవరైనా ఎదురుచూస్తున్నారా?
12. 'పక్క వీధికే కదా' అనుకుంటున్నారా? ప్రమాదం దూరం చూసి రాదు.

**Fact / challenge**
13. నన్ను పెట్టుకోవడానికి 5 సెకన్లు చాలు... మీకు ఆ టైం కూడా లేదా?
14. WHO ప్రకారం, హెల్మెట్ సరిగ్గా పెట్టుకుంటే తలకి తీవ్ర గాయాల రిస్క్ దాదాపు 70% తగ్గుతుంది! *(WHO: ~69% fewer head injuries, ~42% fewer deaths)*
15. మీ గ్యాంగ్‌లో హెల్మెట్ పెట్టుకోనివాడు ఒకడు ఉంటాడు... వాడికి ఈ వీడియో పంపండి! 👉

---

## 2. Kling prompts (7 clips = 45s)

**Settings for every clip:** Kling 2.x, Professional mode · Image-to-Video · 9:16 · Creativity/Relevance 0.6 · native audio **off** (add the Telugu voice with Kling **Lip Sync**).

**Negative prompt (every clip):**
```
blood, gore, crash, injury, realistic human skin on helmet shell, distorted face, melting visor, extra hands, arms attached to helmet, extra fingers, text, watermark, logo, brand name, flicker, morphing, blurry face, horizontal frame
```

**Before you start:** use a frame from the reference clip as the helmet start frame (Clips 1, 2, 4, 7). Generate one rider image in Kling Image and use **Elements** (helmet + rider) for Clips 3, 5, 6:
```
3D Pixar-style cartoon render, young Telugu man around 25, friendly face, short black hair, light mustache, blue checked shirt, dark jeans, standing beside a black commuter motorcycle, Indian city street, golden hour, full body, 9:16
```

### Clip 1 – Hook · 0–5s · 5s · start frame: helmet
```
A glossy candy-apple-red cartoon motorcycle helmet with a cute animated face behind its tinted visor, big brown expressive eyes, thick eyebrows, and two small floating red glove hands, hangs by its strap on a scooter mirror on a busy Indian city street. It looks bored, then its eyes widen in surprise with a round "O" mouth. It pops off the mirror, flies toward the camera and points one glove finger straight at the viewer with a playful accusing grin. The camera does a fast push-in from medium shot to extreme close-up. Blurred buildings and traffic bokeh behind it, warm golden-hour light, glossy specular highlights. 3D Pixar-style animation, cinematic, shallow depth of field.
```
Camera: Zoom In (6) · Lip sync: **మీ ఫోన్‌కి ₹500 కవర్ వేస్తారు... మరి మీ తలకి?!** · Text: మీ తలకి కవర్? 🤔

### Clip 2 – Introduction · 5–10s · 5s · start frame: helmet (wink)
```
The glossy red cartoon helmet with an animated face behind its visor floats at the center of the frame on a busy Indian city street, bobbing gently. It gives a cheeky wink and waves one small red glove hand, then its expression turns sincere and serious, eyebrows lowered, and it places a glove hand on its chest while talking. The camera slowly orbits 15 degrees to the right in a medium close-up. Warm golden-hour backlight, blurred buildings and traffic bokeh. 3D Pixar-style animation, cinematic, expressive face.
```
Camera: Pan Right (3) · Lip sync: **హాయ్ ఫ్రెండ్స్! నేను మీ హెల్మెట్‌ని. నేను అలంకారం కోసం కాదు... మీ ప్రాణాల కోసం!**

### Clip 3 – Negligence · 10–15s · 5s · Elements: helmet + rider
```
A cartoon young Indian man in a blue checked shirt walks up to his black motorcycle on a sunny Indian street, casually hangs the glossy red cartoon helmet on the side mirror without wearing it, and sits on the bike. The red helmet, hanging on the mirror, turns its animated face toward the camera with a shocked expression, both small glove hands on its cheeks, then crosses its arms and frowns, sulking. The shot starts wide on the man, then the camera quickly zooms in on the helmet's reaction. Bright daylight, 3D Pixar-style animation, comedic timing.
```
Camera: Zoom In (5) · Lip sync: **ఒక్కసారి ఆలోచించండి! నన్ను వదిలేసి వెళ్తున్నారా?**

### Clip 4 – Warning · 15–20s · 5s · start frame: helmet
```
The glossy red cartoon helmet with an animated face behind its visor floats in front of a blurred Indian city street. The street darkens slightly, a cool blue rim light outlines the helmet, and background traffic moves in slow motion. The helmet looks serious and concerned and slowly wags one glove finger as if saying no. The camera slowly pushes in from a slightly low angle. Moody dramatic lighting, cinematic, 3D Pixar-style animation, no crash, no injury.
```
Camera: Zoom In (3) + Tilt Up (2) · Lip sync: **మీ చిన్న నిర్లక్ష్యం... మీ జీవితాన్నే ప్రమాదంలో పడేయవచ్చు!**

### Clip 5 – Wearing it right · 20–30s · 10s · Elements: helmet + rider
```
The cartoon young Indian man in a blue checked shirt smiles, takes the glossy red helmet off the motorcycle mirror and puts it on his head. Close-up of his hands fastening the chin strap buckle with a firm click. Once he wears it, friendly glowing cartoon eyes appear on the outside of the visor and the helmet smiles happily. A soft golden protective shield ripple passes over the helmet shell. The camera moves from a medium shot to a macro close-up of the buckle, then to a low-angle hero shot of him on the motorcycle giving a thumbs up. Bright daylight, Indian city street, 3D Pixar-style animation, cinematic.
```
Voiceover (no lip sync): **నన్ను సరిగ్గా ధరించి, పట్టీ బిగించండి. ప్రమాదంలో మీ తలకి నేనే రక్షణ!** · Text: ✅ పట్టీ బిగించండి!

### Clip 6 – Family · 30–40s · 10s · Elements: helmet + rider
```
At golden-hour sunset, the cartoon young Indian man wearing the glossy red helmet rides his black motorcycle slowly through the gate of a cozy Indian home with a colorful rangoli at the doorstep. He parks and takes off the helmet. His mother in a saree, his wife and a little daughter run out smiling; the daughter jumps into his arms for a hug. The red helmet in his hand shows its cute animated face behind the visor again and smiles warmly with happy teary eyes. Wide tracking shot of the arrival, then medium shot of the hug, ending on a close-up of the smiling helmet. Warm emotional lighting, 3D Pixar-style animation, heartwarming.
```
Voiceover, lip sync on the last 3s: **మీ కోసం ఇంట్లో మీ కుటుంబం ఎదురుచూస్తోంది. వారి ఆనందం కోసం... నన్ను తప్పకుండా ధరించండి!**

### Clip 7 – Ending · 40–45s · 5s · start frame: helmet (optional end frame: thumbs-up)
```
The glossy red cartoon helmet with an animated face behind its visor floats proudly at the center of a busy Indian city street at golden hour. It smiles confidently, gives a big thumbs up with one red glove hand, a bright star sparkle glints on its shell, then it points at the viewer with a big grin. The camera slowly pushes in to a close-up and holds. Warm cinematic light, traffic bokeh, 3D Pixar-style animation, joyful and energetic.
```
Camera: Zoom In (3) · Lip sync: **గుర్తుంచుకోండి ఫ్రెండ్స్! హెల్మెట్ ధరించండి... మీ ప్రాణాలను కాపాడుకోండి!** · Text: హెల్మెట్ పెట్టుకోని ఫ్రెండ్‌కి షేర్ చేయండి 👉

> A 5s clip fits about 10–12 Telugu words. Record the full voice as one track, then cut it per clip.

---

## 3. Clip 1 A/B versions

Only the first 5 seconds change; Clips 2–7 stay the same.

| | Hook | Angle |
|---|---|---|
| **A** | మీ ఫోన్‌కి ₹500 కవర్ వేస్తారు... మరి మీ తలకి?! | Witty (Clip 1 above) |
| **B** | హెయిర్‌స్టైల్ పాడవుతుందా? తలకే దెబ్బ తగిలితే... స్టైల్ ఎవరికి చూపిస్తావ్? | Funny roast |
| **C** | పోలీసులకి భయపడి కాదు... మీ అమ్మ కోసం నన్ను పెట్టుకోండి. | Emotional |

### Version B – Hairstyle · 5s · Elements: helmet + rider
```
On a sunny Indian city street, the cartoon young Indian man in a blue checked shirt leans toward his black motorcycle's side mirror and proudly styles his hair with his fingers, admiring himself. The glossy candy-apple-red cartoon helmet with a cute animated face behind its tinted visor and two small floating red glove hands hangs on the same mirror. It rolls its big brown eyes in an exaggerated way, then pops up into the frame beside his reflection, raises one eyebrow and gives a sassy, unimpressed look straight at the camera while talking. The camera starts on a medium over-the-shoulder shot of the mirror, then quickly pushes in to a close-up of the helmet's face. Bright daylight, traffic bokeh, 3D Pixar-style animation, comedic timing, expressive face.
```
Camera: Zoom In (5) · Text: హెయిర్‌స్టైల్ > ప్రాణం? 🤨

### Version C – For your mom · 5s · start frame: helmet
```
Soft morning light at the doorway of a cozy Indian home with a colorful rangoli on the floor. The glossy candy-apple-red cartoon helmet with a cute animated face behind its tinted visor and two small floating red glove hands floats in the foreground. In the softly blurred background, a cartoon Indian mother in a cotton saree stands at the door holding a steel tiffin box and waves gently. The helmet first gives a small dismissive wave of one glove hand, then its expression softens. It turns to look back at the mother with warm, slightly teary eyes, then turns to the camera and speaks sincerely. Slow push-in from medium shot to close-up, shallow depth of field, warm golden tones, 3D Pixar-style animation, emotional and heartfelt.
```
Camera: Zoom In (2) · Text: మీ అమ్మ ఎదురుచూస్తోంది ❤️ · Use the same mother in Clip 6.

**Running the test:** export 3 videos that differ only in the first 5s, with the same caption. Post the extras as Instagram **Trial Reels** (or on different days, same time, on Shorts). After 48 hours compare the 3-second hold rate, then watch time and shares.

---

## 4. Captions

**Shared caption during the A/B test (all versions):**
```
మీ హెల్మెట్‌కి నోరు వస్తే... మీకు ఏం చెబుతుంది? 🪖👀
చివరి వరకు చూడండి ❤️

హెల్మెట్ పెట్టుకోని ఆ ఒక్క ఫ్రెండ్‌ని ట్యాగ్ చేయండి 👇

#HelmetSafety #RoadSafety #హెల్మెట్_ధరించండి #TeluguReels #Telugu #Hyderabad #Telangana #AndhraPradesh #SafeRide #3DAnimation
```

**A – Phone cover**
```
ఫోన్‌కి కవర్ ✅
బైక్‌కి కవర్ ✅
మరి మీ తలకి? ❌🤔

₹500 ఫోన్‌ని కాపాడుకుంటాం... కానీ మన ప్రాణాన్ని? 🪖
హెల్మెట్ పెట్టుకోని ఫ్రెండ్‌కి ఈ వీడియో పంపండి 👇

#HelmetSafety #RoadSafety #హెల్మెట్_ధరించండి #TeluguReels #Telugu #SafeRide
```
Shorts title: `Phone కి Cover ఉంది... మరి తలకి? 🪖 Talking Helmet | Telugu Road Safety #shorts`
Pinned comment: `మీ ఫోన్ కవర్ ఖరీదు ఎంత? 👇 కామెంట్ చేయండి 😄`

**B – Hairstyle**
```
హెయిర్‌స్టైల్ పాడవుతుందని హెల్మెట్ వదిలేస్తున్నారా? 😏
హెల్మెట్ ఇచ్చిన రిప్లై చూడండి 🔥🪖

స్టైల్ కంటే సేఫ్టీ ముఖ్యం బాస్!
మీ గ్యాంగ్‌లో హెయిర్‌స్టైల్ కింగ్‌ని ట్యాగ్ చేయండి 😂👇

#HelmetSafety #RoadSafety #హెల్మెట్_ధరించండి #TeluguReels #TeluguComedy #SafeRide
```
Shorts title: `Hairstyle కోసం Helmet వదిలేస్తే... 😏🪖 Helmet Roast | Telugu #shorts`
Pinned comment: `మీ గ్యాంగ్‌లో హెయిర్‌స్టైల్ కింగ్ ఎవరు? ట్యాగ్ చేయండి 😂👇`

**C – Amma**
```
పోలీసుల కోసం కాదు... అమ్మ కోసం ❤️

మీరు ఇంటికి వచ్చేదాకా ఎవరో ఒకరు గుమ్మం దగ్గర ఎదురుచూస్తుంటారు 🏠
వాళ్ల కోసం... ప్రతి రైడ్‌లో హెల్మెట్ పెట్టుకోండి 🪖

ఈ వీడియోని మీ ఫ్యామిలీ గ్రూప్‌లో షేర్ చేయండి 🙏

#HelmetSafety #RoadSafety #హెల్మెట్_ధరించండి #Amma #TeluguReels #Telugu #SafeRide
```
Shorts title: `Police కోసం కాదు... అమ్మ కోసం ❤️🪖 Helmet Safety Telugu #shorts`
Pinned comment: `మీరు ఇంటికి వచ్చేదాకా ఎవరు ఎదురుచూస్తారు? ❤️👇`

**Posting:** 7–9 PM or 12–2 PM IST, same slot for every test version; pin the comment within 10 minutes.

---

## 5. Thumbnails

| File | Pill | Big text | Frame |
|---|---|---|---|
| `Thumbnail_A_phone_cover.png` | ₹500 ఫోన్ కవర్ ✅ | తలకి కవర్? 🤔 | 2.2s – grin + pointing |
| `Thumbnail_B_hairstyle.png` | స్టైల్ ముఖ్యమా? 😏 | హెయిర్‌స్టైల్ > ప్రాణం? 🤨 | 2.7s – unimpressed eyes |
| `Thumbnail_C_amma.png` | పోలీసుల కోసం కాదు... | అమ్మ కోసం ❤️ | 9.3s – warm smile + thumbs-up |

All text sits inside the center 1080×1440 area so Instagram's 3:4 grid doesn't cut it.

B and C use stand-in frames from the reference clip. Once the Kling clips exist, swap in better frames and re-render:

```bash
# put new frames in helmet-video/tools/frames/ (or edit `frame:` in the script), then:
node helmet-video/tools/render-thumbnails.js
```

Needs Node with `playwright` and Chromium installed. Fonts are bundled in `tools/fonts/` (SIL Open Font License).
