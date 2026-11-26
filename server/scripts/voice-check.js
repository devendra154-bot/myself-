#!/usr/bin/env node
// Check your voice provider with real API calls: speak a sentence, save it, then transcribe it back.
//   node scripts/voice-check.js                 (uses VOICE_PROVIDER and keys from .env)
//   node scripts/voice-check.js hi "नमस्ते, मैं आपकी कैसे मदद कर सकती हूँ?"
//   node scripts/voice-check.js en "Hello, this is a test call." priya
import fs from "node:fs";
import { config } from "../src/config.js";
import { speak, transcribe } from "../src/speech.js";
import { mulawToPcm16 } from "../src/audio.js";

const SAMPLES = {
  te: "నమస్కారం! నేను DevInventor నుండి మాట్లాడుతున్నాను. మీకు రెండు నిమిషాలు సమయం ఉందా?",
  hi: "नमस्ते! मैं DevInventor से बात कर रही हूँ। क्या आपके पास दो मिनट हैं?",
  en: "Hello! I'm calling from DevInventor. Do you have two minutes?",
};
const [lang = "te", text = SAMPLES[lang] || SAMPLES.en, voice = ""] = process.argv.slice(2);

console.log(`Provider: ${config.voiceProvider} · language: ${lang}${voice ? ` · voice: ${voice}` : ""}`);
console.log(`Speaking: ${text}`);
const chunks = [];
const t0 = Date.now();
let first = 0;
await speak(text, { voiceId: voice, languageCode: lang, onAudio: (c) => { first ||= Date.now() - t0; chunks.push(c); } });
const mulaw = Buffer.concat(chunks);
if (!mulaw.length) throw new Error("No audio came back");
console.log(`✓ Voice: ${(mulaw.length / 8000).toFixed(1)} s of phone audio, first sound after ${first} ms`);

// Save as a playable WAV (mu-law, 8 kHz) so you can hear what callers will hear.
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + mulaw.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(7, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(8000, 24);
h.writeUInt32LE(8000, 28); h.writeUInt16LE(1, 32); h.writeUInt16LE(8, 34); h.write("data", 36); h.writeUInt32LE(mulaw.length, 40);
const file = `voice-check-${config.voiceProvider}-${lang}.wav`;
fs.writeFileSync(file, Buffer.concat([h, mulaw]));
console.log(`✓ Saved ${file}: play it to hear the phone-quality voice`);

const t1 = Date.now();
const heard = await transcribe(mulawToPcm16(mulaw), lang);
console.log(`✓ Hearing (${Date.now() - t1} ms): ${heard || "(nothing recognised)"}`);
