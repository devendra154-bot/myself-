// Plivo adapter: REST calls + Audio Streams (bidirectional mu-law over WebSocket).
// Plivo sells Indian numbers and supports DLT-compliant calling.
import { config } from "../config.js";

const api = () => `${process.env.PLIVO_API_BASE || "https://api.plivo.com"}/v1/Account/${config.plivo.authId}`;
const auth = () => "Basic " + Buffer.from(`${config.plivo.authId}:${config.plivo.authToken}`).toString("base64");
const xml = (s) => String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
const digits = (n) => String(n).replace(/[^\d]/g, "");

async function request(method, path, body) {
  const res = await fetch(api() + path, {
    method,
    headers: { authorization: auth(), "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Plivo ${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

export const name = "plivo";

export async function dial({ to, callId, token }) {
  const q = `callId=${callId}&t=${token}`;
  const data = await request("POST", "/Call/", {
    from: digits(config.callerId),
    to: digits(to),
    answer_url: `${config.publicUrl}/voice/plivo/answer?${q}`,
    answer_method: "POST",
    ring_url: `${config.publicUrl}/voice/plivo/status?${q}&event=ringing`,
    hangup_url: `${config.publicUrl}/voice/plivo/status?${q}`,
    hangup_method: "POST",
    ring_timeout: 30,
  });
  return data.request_uuid; // replaced by the real CallUUID once answered
}

export async function hangup(providerCallId) {
  await request("DELETE", `/Call/${providerCallId}/`);
}

export async function transfer(providerCallId, number) {
  const url = `${config.publicUrl}/voice/plivo/transfer?to=${encodeURIComponent(number)}&s=${encodeURIComponent(config.inboundSecret)}`;
  await request("POST", `/Call/${providerCallId}/`, { legs: "aleg", aleg_url: url, aleg_method: "POST" });
}

export function transferXml(number) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xml(digits(config.callerId))}"><Number>${xml(digits(number))}</Number></Dial></Response>`;
}

export function answer(callId, token) {
  const wss = config.publicUrl.replace(/^http/, "ws") + `/media/plivo?callId=${callId}&t=${token}`;
  return {
    contentType: "text/xml",
    body: `<?xml version="1.0" encoding="UTF-8"?><Response><Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">${xml(wss)}</Stream></Response>`,
  };
}

export function parseInbound(body) {
  return { providerCallId: body.CallUUID, from: "+" + digits(body.From), to: "+" + digits(body.To) };
}

const STATUS = { ringing: "ringing", "in-progress": "in-progress", completed: "completed", busy: "busy", "no-answer": "no-answer", timeout: "no-answer", failed: "failed", cancel: "failed" };
export function parseStatus(body, query = {}) {
  const raw = query.event === "ringing" ? "ringing" : body.CallStatus;
  return {
    providerCallId: body.CallUUID,
    status: STATUS[raw] || raw,
    durationSec: body.Duration ? Number(body.Duration) : undefined,
  };
}

// Plivo webhooks are protected by the per-call token in the URL (see routes).
export function verify() {
  return true;
}

// ---- Audio stream protocol ----
export function parseMessage(raw) {
  const m = JSON.parse(raw);
  switch (m.event) {
    case "start":
      return { type: "start", streamId: m.start?.streamId, providerCallId: m.start?.callId };
    case "media":
      return { type: "media", audio: Buffer.from(m.media.payload, "base64") };
    case "stop":
      return { type: "stop" };
    default:
      return null;
  }
}

export function sendAudio(ws, streamId, mulaw) {
  ws.send(JSON.stringify({ event: "playAudio", media: { contentType: "audio/x-mulaw", sampleRate: 8000, payload: mulaw.toString("base64") } }));
}

export function clearAudio(ws, streamId) {
  ws.send(JSON.stringify({ event: "clearAudio", streamId }));
}
