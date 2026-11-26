// Speech for live calls: speech-to-text (hearing the caller) and text-to-speech
// (the AI's voice), streamed as 8 kHz mu-law, the format phone networks use.
// Two providers, picked with VOICE_PROVIDER: "elevenlabs" (default) or "sarvam".
import { config } from "./config.js";
import { pcm16ToWav, upsample2x } from "./audio.js";

const sarvamOn = () => config.voiceProvider === "sarvam";

/** Caller's speech (16-bit PCM, 8 kHz) -> text. `languageCode` is the agent's language, e.g. "te". */
export const transcribe = (pcm16, languageCode) => (sarvamOn() ? sarvamTranscribe : elevenTranscribe)(pcm16, languageCode);

/**
 * Stream speech for `text`. Calls onAudio(Buffer mu-law) as chunks arrive.
 * Pass an AbortSignal to stop early (caller interrupted). Returns bytes sent (8000 = 1 second).
 */
export const speak = (text, opts) => (sarvamOn() ? sarvamSpeak : elevenSpeak)(text, opts);

/** Voices to choose from on the dashboard. */
export const listVoices = () => (sarvamOn() ? sarvamVoices() : elevenVoices());

/** Copies mu-law chunks to onAudio, skipping a WAV header if the stream starts with one. */
async function pipeMulaw(body, signal, onAudio) {
  let bytes = 0, head = Buffer.alloc(0), headerDone = false;
  const emit = (buf) => { if (buf.length) { bytes += buf.length; onAudio(buf); } };
  for await (const chunk of body) {
    if (signal?.aborted) break;
    let buf = Buffer.from(chunk);
    if (!headerDone) {
      head = Buffer.concat([head, buf]);
      if (head.length < 4) continue;
      if (head.toString("ascii", 0, 4) !== "RIFF") { headerDone = true; emit(head); continue; }
      const d = head.indexOf("data");
      if (d < 0 || head.length < d + 8) continue; // wait for the whole header
      headerDone = true;
      buf = head.subarray(d + 8);
    }
    emit(buf);
  }
  if (!headerDone && head.length && head.toString("ascii", 0, 4) !== "RIFF") emit(head);
  return bytes;
}

// ---------------- ElevenLabs ----------------

const elBase = () => `${config.elevenlabs.baseUrl}/v1`;

async function elevenTranscribe(pcm16, languageCode) {
  const form = new FormData();
  form.append("model_id", config.elevenlabs.sttModel);
  if (languageCode) form.append("language_code", languageCode);
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([pcm16ToWav(pcm16)], { type: "audio/wav" }), "speech.wav");

  const res = await fetch(`${elBase()}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.text || "").trim();
}

async function elevenSpeak(text, { voiceId, languageCode, signal, onAudio }) {
  const voice = voiceId || config.elevenlabs.defaultVoiceId;
  if (!voice) throw new Error("No ElevenLabs voice set: add ELEVENLABS_VOICE_ID or a voice on the agent");
  const url = `${elBase()}/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=ulaw_8000&optimize_streaming_latency=3`;
  const body = { text, model_id: config.elevenlabs.ttsModel };
  if (languageCode && config.elevenlabs.ttsModel.includes("flash")) body.language_code = languageCode;

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  return pipeMulaw(res.body, signal, onAudio);
}

async function elevenVoices() {
  const res = await fetch(`${elBase()}/voices`, { headers: { "xi-api-key": config.elevenlabs.apiKey } });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name, labels: v.labels || {} }));
}

// ---------------- Sarvam AI ----------------

// The 37 voices of bulbul:v3 (any of them can speak all 11 languages).
export const SARVAM_V3_SPEAKERS = ["shubh", "aditya", "ritu", "priya", "neha", "rahul", "pooja", "rohan", "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun", "manan", "sumit", "roopa", "kabir", "aayan", "ashutosh", "advait", "anand", "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani", "mohit", "kavitha", "rehan", "soham", "rupali"];

/** Agent language ("te") -> Sarvam BCP-47 code ("te-IN"). */
const sarvamLang = (code) => (code ? `${code}-IN` : "unknown");

/**
 * Pick a speaker valid for the chosen model. Agents made for ElevenLabs store
 * ElevenLabs voice ids, which Sarvam would reject, so those fall back to the default.
 */
export function sarvamSpeaker(voiceId) {
  const s = config.sarvam;
  const persona = (v) => /^[a-z]+_[a-z]+_[a-z_]+$/.test(v || "");
  if (s.ttsModel.startsWith("bulbul:v3")) {
    if (SARVAM_V3_SPEAKERS.includes(voiceId)) return voiceId;
    return SARVAM_V3_SPEAKERS.includes(s.defaultSpeaker) ? s.defaultSpeaker : undefined;
  }
  // bulbul:v4-flash uses persona voices like "simran_en_customer"
  if (persona(voiceId)) return voiceId;
  return persona(s.defaultSpeaker) ? s.defaultSpeaker : undefined; // undefined = Sarvam's default
}

async function sarvamTranscribe(pcm16, languageCode) {
  const s = config.sarvam;
  const form = new FormData();
  form.append("model", s.sttModel);
  if (s.sttMode) form.append("mode", s.sttMode);
  form.append("language_code", sarvamLang(languageCode));
  // Sarvam works best with 16 kHz audio; phone audio is 8 kHz.
  form.append("file", new Blob([pcm16ToWav(upsample2x(pcm16), 16000)], { type: "audio/wav" }), "speech.wav");

  const res = await fetch(`${s.baseUrl}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": s.apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`Sarvam STT ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.transcript || "").trim();
}

async function sarvamSpeak(text, { voiceId, languageCode, signal, onAudio }) {
  const s = config.sarvam;
  const body = {
    text: text.slice(0, 3500),
    language_code: languageCode ? `${languageCode}-IN` : "en-IN",
    model: s.ttsModel,
    speech_sample_rate: 8000,
    output_audio_codec: "mulaw",
    pace: s.pace,
  };
  const speaker = sarvamSpeaker(voiceId);
  if (speaker) body.speaker = speaker;

  const res = await fetch(`${s.baseUrl}/text-to-speech/stream`, {
    method: "POST",
    headers: { "api-subscription-key": s.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`Sarvam TTS ${res.status}: ${await res.text()}`);
  return pipeMulaw(res.body, signal, onAudio);
}

async function sarvamVoices() {
  if (!config.sarvam.ttsModel.startsWith("bulbul:v3")) return []; // v4-flash personas: set SARVAM_SPEAKER
  return SARVAM_V3_SPEAKERS.map((id) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), labels: { provider: "Sarvam" } }));
}
