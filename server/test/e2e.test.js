// End-to-end call test with fake Claude, ElevenLabs and Twilio servers.
// Runs a whole phone call through the real server: dial -> media stream ->
// greeting -> caller speaks -> reply + end_call -> hangup -> summary -> webhook.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const listen = (srv) => new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readBody = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });

function sse(res, blocks, stopReason) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  send("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 0 } } });
  blocks.forEach((b, index) => {
    if (b.type === "text") {
      send("content_block_start", { index, content_block: { type: "text", text: "" } });
      for (const part of b.text.match(/.{1,12}/gsu)) send("content_block_delta", { index, delta: { type: "text_delta", text: part } });
    } else {
      send("content_block_start", { index, content_block: { type: "tool_use", id: b.id, name: b.name, input: {} } });
      send("content_block_delta", { index, delta: { type: "input_json_delta", partial_json: JSON.stringify(b.input) } });
    }
    send("content_block_stop", { index });
  });
  send("message_delta", { delta: { stop_reason: stopReason }, usage: { output_tokens: 20 } });
  send("message_stop", {});
  res.end();
}

test("a full outbound call", { timeout: 60000 }, async (t) => {
  const log = { claude: [], hangups: 0, webhook: null, tts: [] };

  const mock = http.createServer(async (req, res) => {
    const body = await readBody(req);
    const url = req.url;
    if (url.startsWith("/v1/messages")) {
      const b = JSON.parse(body);
      log.claude.push(b);
      if (!b.stream) {
        res.setHeader("content-type", "application/json");
        return res.end(JSON.stringify({
          id: "msg_s", type: "message", role: "assistant", model: b.model, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 },
          content: [{ type: "text", text: JSON.stringify({ outcome: "interested", summary: "Rahul is interested in a 2BHK.", details: [{ field: "budget", value: "90 lakh" }], callback_at: null }) }],
        }));
      }
      const lastUser = b.messages.filter((m) => m.role === "user").at(-1);
      const text = typeof lastUser.content === "string" ? lastUser.content : "";
      if (text.startsWith("[Call connected")) return sse(res, [{ type: "text", text: "नमस्ते राहुल जी! मैं Meera, Nest Realty से। क्या आप दो मिनट बात कर सकते हैं?" }], "end_turn");
      if (Array.isArray(lastUser.content)) return sse(res, [], "end_turn");
      return sse(res, [
        { type: "text", text: "बहुत बढ़िया, धन्यवाद! " },
        { type: "tool_use", id: "tu_1", name: "save_details", input: { details: [{ field: "interest", value: "yes" }] } },
        { type: "tool_use", id: "tu_2", name: "end_call", input: { reason: "done" } },
      ], "tool_use");
    }
    if (url.startsWith("/v1/speech-to-text")) return res.end(JSON.stringify({ text: "हाँ जी, बोलिए" }));
    if (url.startsWith("/v1/text-to-speech")) {
      log.tts.push(JSON.parse(body).text);
      res.writeHead(200, { "content-type": "audio/basic" });
      return res.end(Buffer.alloc(800, 0xff)); // 0.1 s of silence
    }
    if (url.endsWith("/Calls.json")) return res.end(JSON.stringify({ sid: "CA123" }));
    if (url.includes("/Calls/CA123.json")) { log.hangups++; return res.end("{}"); }
    if (url === "/hook") { log.webhook = JSON.parse(body); return res.end("ok"); }
    res.writeHead(404).end();
  });
  const mockPort = await listen(mock);
  t.after(() => mock.close());

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dv-"));
  const port = 3900 + Math.floor(Math.random() * 90);
  const base = `http://127.0.0.1:${mockPort}`;
  const server = spawn(process.execPath, ["src/index.js"], {
    env: {
      ...process.env, CLAUDE_EFFORT: "low", CLAUDE_MODEL: "claude-opus-5-5", CLAUDE_SPEED: "", PORT: String(port), PUBLIC_URL: `http://127.0.0.1:${port}`, ADMIN_TOKEN: "admin", INBOUND_SECRET: "in",
      DATA_FILE: path.join(dir, "db.json"), ANTHROPIC_API_KEY: "test", ANTHROPIC_BASE_URL: base,
      ELEVENLABS_API_KEY: "test", ELEVENLABS_BASE_URL: base, ELEVENLABS_VOICE_ID: "v1",
      TELEPHONY_PROVIDER: "twilio", TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "tok", TWILIO_API_BASE: base,
      CALLER_ID: "+918000000000", OUTCOME_WEBHOOK_URL: `${base}/hook`, CALL_WINDOW_START: "00:00", CALL_WINDOW_END: "23:59",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  server.stdout.on("data", (d) => (out += d));
  server.stderr.on("data", (d) => (out += d));
  t.after(() => server.kill());
  for (let i = 0; i < 50 && !out.includes("voice server on"); i++) await sleep(100);

  const api = (p, opts = {}) => fetch(`http://127.0.0.1:${port}/api${p}`, { ...opts, headers: { authorization: "Bearer admin", "content-type": "application/json" } }).then((r) => r.json());
  const agent = await api("/agents", { method: "POST", body: JSON.stringify({ business: "Nest Realty", persona: "Meera", goal: "Book a site visit", language: "hi", plan: "premium", fieldsToCollect: ["budget"] }) });
  assert.equal(agent.slug, "nest-realty");

  const call = await api(`/agents/${agent.id}/call`, { method: "POST", body: JSON.stringify({ phone: "9876543210", name: "Rahul" }) });
  assert.equal(call.phone, "+919876543210");
  assert.equal(call.status, "dialing");

  await sleep(400);
  const token = JSON.parse(fs.readFileSync(path.join(dir, "db.json"), "utf8")).calls[0].token;

  // Twilio connects the media stream once the person answers.
  const ws = new WebSocket(`ws://127.0.0.1:${port}/media/twilio`);
  const received = [];
  ws.on("message", (m) => received.push(JSON.parse(m)));
  await new Promise((r) => ws.on("open", r));
  ws.send(JSON.stringify({ event: "connected" }));
  ws.send(JSON.stringify({ event: "start", start: { streamSid: "MZ1", callSid: "CA123", customParameters: { callId: call.id, t: token } } }));

  const frame = (loud) => {
    const b = Buffer.alloc(160);
    for (let i = 0; i < 160; i++) b[i] = loud ? (i % 2 ? 0x00 : 0x80) : 0xff;
    return JSON.stringify({ event: "media", media: { track: "inbound", payload: b.toString("base64") } });
  };
  const sendFrames = async (n, loud) => { for (let i = 0; i < n; i++) { ws.send(frame(loud)); await sleep(20); } };

  // Wait for the greeting audio, let it finish playing, then the caller speaks.
  for (let i = 0; i < 50 && !received.some((m) => m.event === "media"); i++) await sleep(100);
  assert.ok(received.some((m) => m.event === "media" && m.streamSid === "MZ1"), "agent greeting audio was sent");
  await sendFrames(40, false);
  await sendFrames(30, true); // 600 ms of speech
  await sendFrames(60, false); // 1.2 s of silence ends the utterance

  for (let i = 0; i < 80 && log.hangups === 0; i++) await sleep(100);
  assert.equal(log.hangups, 1, "agent hung up after end_call\n" + out);
  ws.close();

  for (let i = 0; i < 80 && !log.webhook; i++) await sleep(100);
  assert.ok(log.webhook, "outcome webhook was sent\n" + out);
  const done = log.webhook.call;
  assert.equal(done.outcome, "interested", out);
  assert.equal(done.fields.interest, "yes");
  assert.equal(done.fields.budget, "90 lakh");
  // Greeting is spoken sentence by sentence (3), then the caller, then the reply.
  assert.deepEqual(done.transcript.map((x) => x.role), ["agent", "agent", "agent", "caller", "agent"]);
  assert.equal(done.transcript[3].text, "हाँ जी, बोलिए");

  // Billing: premium plan at ₹8/min, connected for a few seconds.
  assert.equal(done.billing.plan, "premium");
  assert.equal(done.billing.ratePerMin, 8);
  assert.ok(done.billing.seconds >= 1 && done.billing.price > 0, JSON.stringify(done.billing));
  assert.ok(done.billing.estCostBreakdown.ai > 0 && done.billing.estCostBreakdown.voice > 0);

  // Claude requests used the right settings.
  const first = log.claude[0];
  assert.equal(first.model, "claude-opus-5-5");
  assert.equal(first.fallbacks, "default");
  assert.equal(first.output_config.effort, "low");
  assert.ok(first.tools.every((tl) => tl.eager_input_streaming === true));
  assert.ok(log.tts[0].startsWith("नमस्ते राहुल जी!"));
});
