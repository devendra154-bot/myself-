// WhatsApp bot end-to-end: real server, fake Meta Graph API, Claude and Resend.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const listen = (srv) => new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readBody = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c).toString())); });
const until = async (fn, ms = 5000) => { for (let i = 0; i < ms / 50; i++) { if (fn()) return true; await sleep(50); } return false; };

const BOT_ID = "1111";
const CUSTOMER = "919800000001";
const OWNER = "919800000099";
const OWNER2 = "919800000098"; // hasn't messaged the bot in 24 h -> needs a template
const SECRET = "app-secret";

test("WhatsApp bot", { timeout: 60000 }, async (t) => {
  const log = { graph: [], claude: [], emails: [], hooks: [] };
  let wamid = 0, claudeDown = false;

  const mock = http.createServer(async (req, res) => {
    const raw = await readBody(req);
    res.setHeader("content-type", "application/json");
    if (req.url === `/graph/${BOT_ID}/messages`) {
      const b = JSON.parse(raw);
      log.graph.push(b);
      if (b.status === "read") return res.end(JSON.stringify({ success: true }));
      if ([OWNER2, "919800000005"].includes(b.to) && b.type === "text" && !/^Use|hello/.test(b.text.body)) { res.statusCode = 400; return res.end(JSON.stringify({ error: { code: 131047, message: "Re-engagement message" } })); }
      return res.end(JSON.stringify({ messages: [{ id: `wamid.${++wamid}` }] }));
    }
    if (req.url.startsWith("/v1/messages")) {
      const b = JSON.parse(raw);
      log.claude.push(b);
      if (claudeDown) { res.statusCode = 400; return res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "boom" } })); }
      const last = b.messages.at(-1).content;
      const pay = /pay|confirm/i.test(last);
      const out = pay
        ? { reply: "Thanks! I've passed this to the team, they'll confirm shortly.", category: "project_inquiry", escalate: true, urgency: "normal", reason: "Wants to confirm and pay", summary: "Ravi wants a smart irrigation project." }
        : { reply: "Hi! A *student mini project* starts at ₹1,999.", category: "project_inquiry", escalate: false, urgency: "low", reason: "", summary: "Asked mini project price." };
      return res.end(JSON.stringify({ id: "m", type: "message", role: "assistant", model: b.model, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: JSON.stringify(out) }] }));
    }
    if (req.url === "/resend/emails") { log.emails.push(JSON.parse(raw)); return res.end(JSON.stringify({ id: "e1" })); }
    if (req.url === "/hook") { log.hooks.push(JSON.parse(raw)); return res.end("{}"); }
    res.statusCode = 404; res.end("{}");
  });
  const mockPort = await listen(mock);
  t.after(() => mock.close());
  const base = `http://127.0.0.1:${mockPort}`;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wa-"));
  const port = 4000 + Math.floor(Math.random() * 900);
  const server = spawn(process.execPath, ["src/index.js"], {
    env: {
      ...process.env, PORT: String(port), PUBLIC_URL: `http://127.0.0.1:${port}`, ADMIN_TOKEN: "admin", INBOUND_SECRET: "in",
      DATA_FILE: path.join(dir, "db.json"), ANTHROPIC_API_KEY: "test", ANTHROPIC_BASE_URL: base, CLAUDE_SPEED: "",
      WHATSAPP_TOKEN: "tok", WHATSAPP_PHONE_NUMBER_ID: BOT_ID, WHATSAPP_API_BASE: `${base}/graph`, WHATSAPP_VERIFY_TOKEN: "verify-me",
      WHATSAPP_APP_SECRET: SECRET, WHATSAPP_WAIT_MS: "300", WHATSAPP_BOT: "on", ESCALATION_WHATSAPP: `+${OWNER}, ${OWNER2.slice(2)}`, WHATSAPP_ESCALATION_TEMPLATE: "owner_alert",
      RESEND_API_KEY: "re", RESEND_API_BASE: `${base}/resend`, ESCALATION_EMAIL: "owner@example.com", OUTCOME_WEBHOOK_URL: `${base}/hook`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  server.stdout.on("data", (d) => (out += d));
  server.stderr.on("data", (d) => (out += d));
  t.after(() => server.kill());
  assert.ok(await until(() => out.includes("voice server on")), out);
  assert.match(out, /WhatsApp bot ready/);

  const url = `http://127.0.0.1:${port}`;
  const sign = (s) => "sha256=" + crypto.createHmac("sha256", SECRET).update(s).digest("hex");
  let n = 0;
  const hook = (from, msg, name = "Ravi") => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {
      metadata: { phone_number_id: BOT_ID }, contacts: [{ wa_id: from, profile: { name } }],
      messages: [{ id: msg.id || `in.${++n}`, from, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", ...msg }],
    } }] }] });
    return fetch(`${url}/whatsapp/webhook`, { method: "POST", body, headers: { "content-type": "application/json", "x-hub-signature-256": sign(body) } });
  };
  const sentTo = (to) => log.graph.filter((g) => g.to === to && g.type === "text");
  const api = (p, opts = {}) => fetch(`${url}/api${p}`, { ...opts, headers: { authorization: "Bearer admin", "content-type": "application/json" } });

  // 1. Meta's webhook check
  assert.equal(await (await fetch(`${url}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`)).text(), "42");
  assert.equal((await fetch(`${url}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42`)).status, 403);

  // 2. Forged webhook is rejected
  const forged = await fetch(`${url}/whatsapp/webhook`, { method: "POST", body: "{}", headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=00" } });
  assert.equal(forged.status, 401);

  // 3. Simple question -> AI answer, no alert
  assert.equal((await hook(CUSTOMER, { id: "q1", text: { body: "Hi, price of mini project?" } })).status, 200);
  assert.ok(await until(() => sentTo(CUSTOMER).length === 1), out);
  assert.match(sentTo(CUSTOMER)[0].text.body, /₹1,999/);
  assert.ok(log.graph.some((g) => g.status === "read" && g.message_id === "q1"), "marked as read");
  const sys = log.claude[0].system;
  assert.match(sys, /DevInventor/);
  assert.match(sys, /₹1,999/, "knowledge file is in the prompt");
  assert.equal(log.claude[0].model, "claude-sonnet-5-5");
  assert.equal(log.claude[0].messages[0].role, "user");
  assert.match(log.claude[0].messages[0].content, /Ravi/);
  assert.equal(sentTo(OWNER).length, 0);

  // 4. Meta retries the same message -> no second reply
  await hook(CUSTOMER, { id: "q1", text: { body: "Hi, price of mini project?" } });
  await sleep(400);
  assert.equal(sentTo(CUSTOMER).length, 1);

  // 5. Needs a human -> reply + alert to owners (template fallback for OWNER2), email and webhook
  await hook(CUSTOMER, { text: { body: "I want to confirm and pay for the irrigation project" } });
  assert.ok(await until(() => sentTo(OWNER).length === 1 && log.emails.length === 1), out);
  assert.equal(sentTo(CUSTOMER).length, 2);
  const alert = sentTo(OWNER)[0].text.body;
  assert.match(alert, /Needs you/);
  assert.match(alert, /Wants to confirm and pay/);
  assert.match(alert, /#reply \+919800000001/);
  const tpl = log.graph.find((g) => g.to === OWNER2 && g.type === "template");
  assert.ok(tpl, "template sent to owner outside 24h window");
  assert.equal(tpl.template.name, "owner_alert");
  assert.match(log.emails[0].subject, /Ravi/);
  assert.deepEqual(log.emails[0].to, ["owner@example.com"]);
  assert.equal(log.hooks.at(-1).event, "whatsapp.escalation");
  // Claude got the whole conversation, alternating turns
  const msgs = log.claude.at(-1).messages;
  assert.deepEqual(msgs.map((m) => m.role), ["user", "assistant", "user"]);

  // 6. Owner swipe-replies to the alert -> customer gets it, bot paused for that chat
  let ctx;
  await until(() => {
    try { const db = JSON.parse(fs.readFileSync(path.join(dir, "db.json"), "utf8")); ctx = Object.keys(db.waAlerts).find((k) => db.waAlerts[k] === "+" + CUSTOMER); } catch { /* not saved yet */ }
    return ctx;
  });
  assert.ok(ctx, "alert id remembered");
  const before = sentTo(CUSTOMER).length;
  await hook(OWNER, { text: { body: "Hi Ravi, total is ₹6,500. I'll send the UPI details." }, context: { id: ctx } }, "Owner");
  assert.ok(await until(() => sentTo(CUSTOMER).length === before + 1), out);
  assert.match(sentTo(CUSTOMER).at(-1).text.body, /₹6,500/);
  assert.ok(await until(() => sentTo(OWNER).some((g) => /Sent to Ravi/.test(g.text.body))));
  let chat = await api(`/whatsapp/chats/${CUSTOMER}`).then((r) => r.json());
  assert.equal(chat.status, "human");
  assert.equal(chat.messages.at(-1).role, "owner");

  // 7. While paused, customer messages are forwarded to the owner and Claude is not called
  const claudeCalls = log.claude.length;
  await hook(CUSTOMER, { text: { body: "ok sir thanks" } });
  assert.ok(await until(() => sentTo(OWNER).some((g) => /ok sir thanks/.test(g.text.body))), out);
  assert.equal(log.claude.length, claudeCalls);

  // 8. #resume hands the chat back to the bot; #chats lists it; unknown text gets help
  await hook(OWNER, { text: { body: "#resume 9800000001" } }, "Owner");
  assert.ok(await until(() => sentTo(OWNER).some((g) => /replying to Ravi again/.test(g.text.body))), out);
  chat = await api(`/whatsapp/chats/${CUSTOMER}`).then((r) => r.json());
  assert.equal(chat.status, "bot");
  await hook(OWNER, { text: { body: "#chats" } }, "Owner");
  assert.ok(await until(() => sentTo(OWNER).some((g) => /Recent chats/.test(g.text.body))));
  await hook(OWNER, { text: { body: "hello?" } }, "Owner");
  assert.ok(await until(() => sentTo(OWNER).some((g) => /Bot commands/.test(g.text.body))));
  // #reply command
  await hook(OWNER, { text: { body: "#reply +91 98000 00001 Parts ordered today." } }, "Owner");
  assert.ok(await until(() => sentTo(CUSTOMER).some((g) => /Parts ordered today/.test(g.text.body))), out);

  // 9. Claude fails -> polite fallback reply and an alert
  await hook(OWNER, { text: { body: "#resume 9800000001" } }, "Owner");
  await sleep(300);
  claudeDown = true;
  const other = "919800000002";
  await hook(other, { text: { body: "Is anyone there?" } }, "Sita");
  assert.ok(await until(() => sentTo(other).length === 1), out);
  assert.match(sentTo(other)[0].text.body, /reply to you shortly/);
  assert.ok(await until(() => sentTo(OWNER).some((g) => /Sita/.test(g.text.body) && /could not answer/.test(g.text.body))), out);
  claudeDown = false;

  // 10. Status-only webhooks and reactions are ignored
  const statusBody = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: BOT_ID }, statuses: [{ id: "wamid.1", status: "delivered" }] } }] }] });
  assert.equal((await fetch(`${url}/whatsapp/webhook`, { method: "POST", body: statusBody, headers: { "content-type": "application/json", "x-hub-signature-256": sign(statusBody) } })).status, 200);
  const g0 = log.graph.length;
  await hook(other, { type: "reaction", reaction: { emoji: "👍", message_id: "wamid.1" } }, "Sita");
  await sleep(400);
  assert.equal(log.graph.length, g0);

  // 11. Photos without captions still get a reply
  await hook("919800000003", { type: "image", image: { id: "img1" } }, "Kiran");
  assert.ok(await until(() => sentTo("919800000003").length === 1), out);
  assert.match(log.claude.at(-1).messages.at(-1).content, /sent a image with no caption|sent an image/);

  // 12. Three quick messages get ONE reply that sees all three
  const burst = "919800000004";
  const c0 = log.claude.length;
  await hook(burst, { text: { body: "hi" } }, "Anu");
  await hook(burst, { text: { body: "price?" } }, "Anu");
  await hook(burst, { text: { body: "for mini project" } }, "Anu");
  assert.ok(await until(() => sentTo(burst).length === 1), out);
  await sleep(800);
  assert.equal(sentTo(burst).length, 1, "only one reply");
  assert.equal(log.claude.length, c0 + 1);
  assert.match(log.claude.at(-1).messages.at(-1).content, /hi\nprice\?\nfor mini project/);

  // 13. Owner replies to someone whose 24-hour window has closed -> clear explanation
  const late = "919800000005"; // the mock rejects plain text to this number with 131047
  await hook(late, { text: { body: "hello" } }, "Late");
  assert.ok(await until(() => log.graph.some((g) => g.to === late)), out);
  const r13 = await api(`/whatsapp/chats/${late}/reply`, { method: "POST", body: JSON.stringify({ text: "hi" }) }).then((r) => r.json());
  assert.match(r13.error, /24 hours/);

  // 14. Admin API: list chats and simulate without sending
  const list = await api("/whatsapp/chats").then((r) => r.json());
  assert.ok(list.length >= 3 && list[0].last);
  const g1 = log.graph.length;
  const sim = await api("/whatsapp/simulate", { method: "POST", body: JSON.stringify({ messages: [{ role: "customer", text: "price?" }] }) }).then((r) => r.json());
  assert.match(sim.reply, /₹1,999/);
  assert.equal(log.graph.length, g1, "simulate sends nothing");
  const status = await api("/whatsapp/status").then((r) => r.json());
  assert.deepEqual(status.missingConfig, []);
});
