import "dotenv/config";

const env = (name, fallback = "") => (process.env[name] ?? fallback).trim();
const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== "" ? v : fallback;
};

export const config = {
  port: num("PORT", 3000),
  // Public HTTPS base URL of this server, e.g. https://devinventor-voice.onrender.com
  publicUrl: env("PUBLIC_URL").replace(/\/$/, ""),
  adminToken: env("ADMIN_TOKEN"),
  inboundSecret: env("INBOUND_SECRET"),
  dataFile: env("DATA_FILE", "./data/db.json"),
  timezone: env("TIMEZONE", "Asia/Kolkata"),
  // TRAI: promotional calls only between 09:00 and 21:00.
  callingWindow: { start: env("CALL_WINDOW_START", "09:00"), end: env("CALL_WINDOW_END", "21:00") },

  telephony: env("TELEPHONY_PROVIDER", "twilio"), // "twilio" | "plivo"
  callerId: env("CALLER_ID"), // your business number in E.164, e.g. +918045671234

  twilio: { accountSid: env("TWILIO_ACCOUNT_SID"), authToken: env("TWILIO_AUTH_TOKEN") },
  plivo: { authId: env("PLIVO_AUTH_ID"), authToken: env("PLIVO_AUTH_TOKEN") },

  // What you charge customers, per connected minute (billed per second), excluding GST.
  // Each plan uses a different Claude model; the voice and phone line are the same.
  plans: {
    basic: { name: "Basic", pricePerMin: num("PRICE_BASIC", 4.5), model: env("CLAUDE_MODEL_BASIC", "claude-haiku-5-5") },
    standard: { name: "Standard", pricePerMin: num("PRICE_STANDARD", 6), model: env("CLAUDE_MODEL_STANDARD", "claude-sonnet-5-5") },
    premium: { name: "Premium", pricePerMin: num("PRICE_PREMIUM", 8), model: env("CLAUDE_MODEL", "claude-opus-5-5") },
  },

  // Your own costs, used to estimate cost and margin per call. Defaults are rough
  // estimates: replace them with the rates on your invoices.
  costs: {
    usdToInr: num("USD_INR", 88),
    phonePerMinInr: num("COST_PHONE_PER_MIN_INR", 0.6),
    ttsUsdPer1kChars: num("COST_TTS_USD_PER_1K_CHARS", 0.05),
    sttUsdPerHour: num("COST_STT_USD_PER_HOUR", 0.4),
    // USD per million tokens: input, output, cache read
    claude: {
      "claude-opus-5-5": [4, 20, 0.2],
      "claude-sonnet-5-5": [2, 10, 0.1],
      "claude-haiku-5-5": [0.1, 0.5, 0.01],
    },
  },

  claude: {
    model: env("CLAUDE_MODEL", "claude-opus-5-5"),
    // Phone calls need quick replies; "low" keeps latency down. Raise if quality needs it.
    effort: env("CLAUDE_EFFORT", "low"),
    // "fast" costs 2x but replies faster. Leave empty for standard speed.
    speed: env("CLAUDE_SPEED"),
  },

  elevenlabs: {
    apiKey: env("ELEVENLABS_API_KEY"),
    baseUrl: env("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").replace(/\/$/, ""),
    ttsModel: env("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5"),
    sttModel: env("ELEVENLABS_STT_MODEL", "scribe_v1"),
    defaultVoiceId: env("ELEVENLABS_VOICE_ID"),
  },

  whatsapp: {
    // Optional: WhatsApp Cloud API (Meta) for sending messages mid-call.
    token: env("WHATSAPP_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
  },

  // Optional: every finished call's outcome is POSTed here (Zapier, Pabbly, your CRM, Google Apps Script…)
  outcomeWebhook: env("OUTCOME_WEBHOOK_URL"),

  vad: {
    threshold: num("VAD_THRESHOLD", 600), // RMS level counted as speech
    endSilenceMs: num("VAD_END_SILENCE_MS", 700),
    bargeInMs: num("VAD_BARGE_IN_MS", 250),
  },
};

export function checkConfig() {
  const missing = [];
  if (!config.publicUrl) missing.push("PUBLIC_URL");
  if (!config.adminToken) missing.push("ADMIN_TOKEN");
  if (!config.inboundSecret) missing.push("INBOUND_SECRET");
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!config.elevenlabs.apiKey) missing.push("ELEVENLABS_API_KEY");
  if (!config.callerId) missing.push("CALLER_ID");
  if (config.telephony === "twilio" && !(config.twilio.accountSid && config.twilio.authToken))
    missing.push("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN");
  if (config.telephony === "plivo" && !(config.plivo.authId && config.plivo.authToken))
    missing.push("PLIVO_AUTH_ID / PLIVO_AUTH_TOKEN");
  return missing;
}

export const LANGUAGES = {
  hi: { name: "Hindi", stt: "hi" },
  te: { name: "Telugu", stt: "te" },
  ta: { name: "Tamil", stt: "ta" },
  kn: { name: "Kannada", stt: "kn" },
  ml: { name: "Malayalam", stt: "ml" },
  mr: { name: "Marathi", stt: "mr" },
  en: { name: "English", stt: "en" },
};
