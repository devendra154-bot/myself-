// Twilio adapter: REST calls + Media Streams (bidirectional mu-law over WebSocket).
import crypto from "node:crypto";
import { config } from "../config.js";

const api = () => `${process.env.TWILIO_API_BASE || "https://api.twilio.com"}/2010-04-01/Accounts/${config.twilio.accountSid}`;
const auth = () => "Basic " + Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString("base64");
const xml = (s) => String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

async function post(path, params) {
  const res = await fetch(api() + path, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

export const name = "twilio";

function streamTwiml(callId, token) {
  const wss = config.publicUrl.replace(/^http/, "ws") + "/media/twilio";
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${xml(wss)}">` +
    `<Parameter name="callId" value="${xml(callId)}"/><Parameter name="t" value="${xml(token)}"/>` +
    `</Stream></Connect></Response>`;
}

export async function dial({ to, callId, token }) {
  const params = new URLSearchParams({
    To: to,
    From: config.callerId,
    Twiml: streamTwiml(callId, token),
    StatusCallback: `${config.publicUrl}/voice/twilio/status?callId=${callId}&t=${token}`,
    StatusCallbackMethod: "POST",
    Timeout: "30",
  });
  for (const e of ["initiated", "ringing", "answered", "completed"]) params.append("StatusCallbackEvent", e);
  const data = await post("/Calls.json", params);
  return data.sid;
}

export async function hangup(providerCallId) {
  await post(`/Calls/${providerCallId}.json`, new URLSearchParams({ Status: "completed" }));
}

export async function transfer(providerCallId, number) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xml(config.callerId)}">${xml(number)}</Dial></Response>`;
  await post(`/Calls/${providerCallId}.json`, new URLSearchParams({ Twiml: twiml }));
}

/** XML response for an answered call (used for inbound calls). */
export function answer(callId, token) {
  return { contentType: "text/xml", body: streamTwiml(callId, token) };
}

export function parseInbound(body) {
  return { providerCallId: body.CallSid, from: body.From, to: body.To };
}

const STATUS = { queued: "dialing", initiated: "dialing", ringing: "ringing", "in-progress": "in-progress", answered: "in-progress", completed: "completed", busy: "busy", "no-answer": "no-answer", failed: "failed", canceled: "failed" };
export function parseStatus(body) {
  return {
    providerCallId: body.CallSid,
    status: STATUS[body.CallStatus] || body.CallStatus,
    durationSec: body.CallDuration ? Number(body.CallDuration) : undefined,
  };
}

/** Verify X-Twilio-Signature so nobody can fake webhooks. */
export function verify(req) {
  const sig = req.get("x-twilio-signature");
  if (!sig) return false;
  const url = config.publicUrl + req.originalUrl;
  const params = req.body || {};
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", config.twilio.authToken).update(data).digest("base64");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Media stream protocol ----
export function parseMessage(raw) {
  const m = JSON.parse(raw);
  switch (m.event) {
    case "start":
      return { type: "start", streamId: m.start.streamSid, providerCallId: m.start.callSid, callId: m.start.customParameters?.callId, token: m.start.customParameters?.t };
    case "media":
      return m.media.track && m.media.track !== "inbound" ? null : { type: "media", audio: Buffer.from(m.media.payload, "base64") };
    case "stop":
      return { type: "stop" };
    default:
      return null;
  }
}

export function sendAudio(ws, streamId, mulaw) {
  ws.send(JSON.stringify({ event: "media", streamSid: streamId, media: { payload: mulaw.toString("base64") } }));
}

export function clearAudio(ws, streamId) {
  ws.send(JSON.stringify({ event: "clear", streamSid: streamId }));
}
