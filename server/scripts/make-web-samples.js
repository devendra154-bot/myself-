#!/usr/bin/env node
// Make the voice samples played on the website's "Build your employee" section
// (ai/voices/*.mp3) with real Sarvam AI voices. Needs SARVAM_API_KEY.
//   node scripts/make-web-samples.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../ai/voices");
export const WEB_VOICES = [
  { id: "priya", name: "Priya", gender: "female" },
  { id: "kavya", name: "Kavya", gender: "female" },
  { id: "shubh", name: "Shubh", gender: "male" },
  { id: "rahul", name: "Rahul", gender: "male" },
];
const SAMPLE = {
  hi: { female: "नमस्ते! मैं DevInventor की ओर से बात कर रही हूँ। क्या आपके पास दो मिनट हैं?", male: "नमस्ते! मैं DevInventor की ओर से बात कर रहा हूँ। क्या आपके पास दो मिनट हैं?" },
  te: "నమస్కారం! నేను DevInventor నుండి మాట్లాడుతున్నాను. మీకు రెండు నిమిషాలు ఉన్నాయా?",
  ta: "வணக்கம்! நான் DevInventor-இலிருந்து பேசுகிறேன். உங்களுக்கு இரண்டு நிமிடம் இருக்கிறதா?",
  kn: "ನಮಸ್ಕಾರ! ನಾನು DevInventor ಇಂದ ಮಾತಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮಗೆ ಎರಡು ನಿಮಿಷ ಇದೆಯಾ?",
  ml: "നമസ്കാരം! ഞാൻ DevInventor-ൽ നിന്നാണ് വിളിക്കുന്നത്. രണ്ട് മിനിറ്റ് സംസാരിക്കാമോ?",
  mr: "नमस्कार! मी DevInventor मधून बोलत आहे. तुमच्याकडे दोन मिनिटं आहेत का?",
  en: "Hello! I'm calling from DevInventor. Do you have two minutes?",
};

fs.mkdirSync(out, { recursive: true });
const jobs = Object.keys(SAMPLE).flatMap((lang) => WEB_VOICES.map((v) => ({ lang, v })));
let done = 0;
await Promise.all(jobs.map(async ({ lang, v }, i) => {
  await new Promise((r) => setTimeout(r, i * 200)); // stay under rate limits
  const text = typeof SAMPLE[lang] === "string" ? SAMPLE[lang] : SAMPLE[lang][v.gender];
  const res = await fetch(`${config.sarvam.baseUrl}/text-to-speech/stream`, {
    method: "POST",
    headers: { "api-subscription-key": config.sarvam.apiKey, "content-type": "application/json" },
    body: JSON.stringify({ text, language_code: `${lang}-IN`, model: config.sarvam.ttsModel, speaker: v.id, speech_sample_rate: 24000, output_audio_codec: "mp3", output_audio_bitrate: "64k" }),
  });
  if (!res.ok) throw new Error(`${lang}/${v.id}: Sarvam ${res.status} ${await res.text()}`);
  fs.writeFileSync(path.join(out, `${lang}-${v.id}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${++done}/${jobs.length} ${lang}-${v.id}.mp3`);
}));
