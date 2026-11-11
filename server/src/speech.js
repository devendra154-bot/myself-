// ElevenLabs speech-to-text (Scribe) and text-to-speech (streamed as 8 kHz mu-law,
// the format phone networks use, so no conversion is needed).
import { config } from "./config.js";
import { pcm16ToWav } from "./audio.js";

const base = () => `${config.elevenlabs.baseUrl}/v1`;

export async function transcribe(pcm16, languageCode) {
  const form = new FormData();
  form.append("model_id", config.elevenlabs.sttModel);
  if (languageCode) form.append("language_code", languageCode);
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([pcm16ToWav(pcm16)], { type: "audio/wav" }), "speech.wav");

  const res = await fetch(`${base()}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.text || "").trim();
}

/**
 * Stream speech for `text`. Calls onAudio(Buffer mu-law) as chunks arrive.
 * Pass an AbortSignal to stop early (caller interrupted).
 */
export async function speak(text, { voiceId, languageCode, signal, onAudio }) {
  const voice = voiceId || config.elevenlabs.defaultVoiceId;
  if (!voice) throw new Error("No ElevenLabs voice set: add ELEVENLABS_VOICE_ID or a voice on the agent");
  const url = `${base()}/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=ulaw_8000&optimize_streaming_latency=3`;
  const body = { text, model_id: config.elevenlabs.ttsModel };
  if (languageCode && config.elevenlabs.ttsModel.includes("flash")) body.language_code = languageCode;

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  let bytes = 0;
  for await (const chunk of res.body) {
    if (signal?.aborted) break;
    const buf = Buffer.from(chunk);
    bytes += buf.length;
    onAudio(buf);
  }
  return bytes; // 8000 bytes = 1 second of audio
}

export async function listVoices() {
  const res = await fetch(`${base()}/voices`, { headers: { "xi-api-key": config.elevenlabs.apiKey } });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name, labels: v.labels || {} }));
}
