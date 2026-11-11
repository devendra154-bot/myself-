import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import { config, checkConfig, LANGUAGES } from "./config.js";
import * as store from "./store.js";
import { agents, calls, campaigns } from "./store.js";
import { providers } from "./telephony/index.js";
import { startOutboundCall, updateStatus, finalise, newCall } from "./calls.js";
import { createCampaign, startScheduler, stats } from "./campaigns.js";
import { CallSession } from "./session.js";
import { buildAgent } from "./builder.js";
import { listVoices } from "./speech.js";
import { inWindow, maskPhone } from "./time.js";
import { plansSummary } from "./billing.js";

const here = path.dirname(fileURLToPath(import.meta.url));
store.load();
for (const cmp of campaigns.all()) for (const c of cmp.contacts) if (c.status === "active") c.status = "pending";

const app = express();
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.json({ limit: "5mb" }));

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// CORS for the dashboard / website calling the API from another origin.
app.use((req, res, next) => {
  res.set("access-control-allow-origin", "*");
  res.set("access-control-allow-headers", "authorization, content-type, x-devinventor-lead-secret");
  res.set("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, missingConfig: checkConfig() }));
app.use("/dashboard", express.static(path.join(here, "../public")));
app.get("/", (req, res) => res.redirect("/dashboard/"));

// ---------------- provider webhooks ----------------
function callFromQuery(req) {
  const call = calls.get(req.query.callId);
  return call && safeEqual(call.token, req.query.t) ? call : null;
}

app.post("/voice/:provider/status", wrap(async (req, res) => {
  const p = providers[req.params.provider];
  const call = p && callFromQuery(req);
  if (!call) return res.sendStatus(403);
  await updateStatus(call, p.parseStatus(req.body, req.query));
  res.sendStatus(200);
}));

// Plivo asks this URL what to do once the outbound call is answered.
app.post("/voice/plivo/answer", (req, res) => {
  const call = callFromQuery(req);
  if (!call) return res.sendStatus(403);
  if (req.body.CallUUID) calls.update(call.id, { providerCallId: req.body.CallUUID });
  const { contentType, body } = providers.plivo.answer(call.id, call.token);
  res.type(contentType).send(body);
});

app.post("/voice/plivo/transfer", (req, res) => {
  if (!safeEqual(req.query.s, config.inboundSecret)) return res.sendStatus(403);
  res.type("text/xml").send(providers.plivo.transferXml(req.query.to));
});

// Inbound calls: point your number's "answer URL" here:
//   POST {PUBLIC_URL}/voice/twilio/inbound?agent=<slug>&s=<INBOUND_SECRET>
app.post("/voice/:provider/inbound", (req, res) => {
  const p = providers[req.params.provider];
  if (!p || !safeEqual(req.query.s, config.inboundSecret)) return res.sendStatus(403);
  const agent = agents.get(req.query.agent) || agents.all()[0];
  if (!agent) return res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  const info = p.parseInbound(req.body);
  const call = newCall({ agent, phone: info.from, direction: "inbound", source: "inbound", provider: p.name });
  calls.update(call.id, { providerCallId: info.providerCallId, status: "ringing" });
  const { contentType, body } = p.answer(call.id, call.token);
  res.type(contentType).send(body);
});

// Lead intake: send a lead, get a call within seconds.
//   POST /lead-intake/<agent-slug>   header X-DevInventor-Lead-Secret: <agent lead secret>
//   { "phone": "+9198xxxxxx10", "name": "Rahul", ...any other fields }
app.post("/lead-intake/:slug", wrap(async (req, res) => {
  const agent = agents.get(req.params.slug);
  if (!agent || !safeEqual(req.get("x-devinventor-lead-secret"), agent.leadSecret)) return res.status(403).json({ error: "Unknown agent or wrong secret" });
  const { phone, name, ...vars } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone is required" });
  if (!inWindow()) {
    // Outside calling hours: queue it as a one-contact campaign that runs in the next window.
    const cmp = createCampaign({ agentId: agent.id, name: `Lead ${name || maskPhone(String(phone))}`, contacts: [{ phone, name, vars }], concurrency: 1 });
    campaigns.update(cmp.id, { status: "running", source: "lead-intake" });
    return res.status(202).json({ queued: true, campaignId: cmp.id, message: "Outside calling hours; will call in the next window" });
  }
  const call = await startOutboundCall({ agentId: agent.id, phone, name, vars, source: "lead-intake" });
  res.status(202).json({ callId: call.id, status: call.status });
}));

// ---------------- admin API ----------------
const admin = express.Router();
admin.use((req, res, next) => {
  const t = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!config.adminToken || !safeEqual(t, config.adminToken)) return res.status(401).json({ error: "Unauthorized" });
  next();
});

const publicAgent = (a) => ({ ...a, leadIntakeUrl: `${config.publicUrl}/lead-intake/${a.slug}`, inboundUrl: `${config.publicUrl}/voice/${config.telephony}/inbound?agent=${a.slug}&s=${config.inboundSecret}` });
const publicCall = (c) => { const { token, ...rest } = c; return rest; };
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "agent";

admin.get("/status", (req, res) => res.json({ missingConfig: checkConfig(), provider: config.telephony, callerId: config.callerId, languages: LANGUAGES, plans: plansSummary(), inCallingHours: inWindow(), activeCalls: calls.active().length }));
admin.get("/voices", wrap(async (req, res) => res.json(await listVoices())));

admin.get("/agents", (req, res) => res.json(agents.all().map(publicAgent)));
admin.post("/agents/build", wrap(async (req, res) => {
  const { description, business, language } = req.body || {};
  if (!description) return res.status(400).json({ error: "description is required" });
  res.json(await buildAgent({ description, business, language }));
}));
admin.post("/agents", (req, res) => {
  const b = req.body || {};
  for (const k of ["business", "persona", "goal"]) if (!b[k]) return res.status(400).json({ error: `${k} is required` });
  let slug = slugify(b.slug || b.name || b.business);
  while (agents.get(slug)) slug += "-" + crypto.randomBytes(2).toString("hex");
  const a = agents.add({
    id: store.id("agt"), slug, name: b.name || b.business, business: b.business, persona: b.persona, gender: b.gender || "female",
    plan: config.plans[b.plan] ? b.plan : "standard",
    language: LANGUAGES[b.language] ? b.language : "hi", voiceId: b.voiceId || "", goal: b.goal, instructions: b.instructions || "",
    openingLine: b.openingLine || "", fieldsToCollect: b.fieldsToCollect || [], transferNumber: b.transferNumber || "",
    outcomeWebhook: b.outcomeWebhook || "", leadSecret: store.token(), createdAt: new Date().toISOString(),
  });
  res.status(201).json(publicAgent(a));
});
admin.patch("/agents/:id", (req, res) => {
  const allowed = ["plan", "name", "business", "persona", "gender", "language", "voiceId", "goal", "instructions", "openingLine", "fieldsToCollect", "transferNumber", "outcomeWebhook"];
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  if ("plan" in patch && !config.plans[patch.plan]) return res.status(400).json({ error: "plan must be basic, standard or premium" });
  const a = agents.update(req.params.id, patch);
  a ? res.json(publicAgent(a)) : res.sendStatus(404);
});
admin.delete("/agents/:id", (req, res) => res.sendStatus(agents.remove(req.params.id) ? 204 : 404));
admin.post("/agents/:id/call", wrap(async (req, res) => {
  const { phone, name, ignoreWindow } = req.body || {};
  const call = await startOutboundCall({ agentId: req.params.id, phone, name, source: "dashboard", ignoreWindow: !!ignoreWindow });
  res.status(202).json(publicCall(call));
}));

admin.get("/calls", (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 100);
  const list = calls.all().filter((c) => !req.query.campaignId || c.campaignId === req.query.campaignId);
  res.json(list.slice(-limit).reverse().map(({ transcript, token, ...c }) => ({ ...c, turns: transcript.length })));
});
// Totals for a period: minutes, what customers owe, estimated cost and margin.
admin.get("/billing", (req, res) => {
  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 30 * 864e5);
  const t = { since: since.toISOString(), calls: 0, connected: 0, minutes: 0, price: 0, estCost: 0, margin: 0, byPlan: {} };
  for (const c of calls.all()) {
    if (!c.billing || new Date(c.createdAt) < since) continue;
    const b = c.billing;
    t.calls++;
    if (b.seconds) t.connected++;
    t.minutes += b.seconds / 60; t.price += b.price; t.estCost += b.estCost; t.margin += b.margin;
    const p = (t.byPlan[b.plan] ||= { minutes: 0, price: 0, estCost: 0 });
    p.minutes += b.seconds / 60; p.price += b.price; p.estCost += b.estCost;
  }
  const r = (n) => Math.round(n * 100) / 100;
  for (const k of ["minutes", "price", "estCost", "margin"]) t[k] = r(t[k]);
  for (const p of Object.values(t.byPlan)) for (const k in p) p[k] = r(p[k]);
  res.json(t);
});
admin.get("/calls/:id", (req, res) => { const c = calls.get(req.params.id); c ? res.json(publicCall(c)) : res.sendStatus(404); });

admin.get("/campaigns", (req, res) => res.json(campaigns.all().map(({ contacts, ...c }) => ({ ...c, stats: stats({ contacts }) }))));
admin.get("/campaigns/:id", (req, res) => { const c = campaigns.get(req.params.id); c ? res.json({ ...c, stats: stats(c) }) : res.sendStatus(404); });
admin.post("/campaigns", (req, res) => {
  const b = req.body || {};
  if (!agents.get(b.agentId)) return res.status(400).json({ error: "agentId is required" });
  const cmp = createCampaign({ ...b, agentId: agents.get(b.agentId).id });
  res.status(201).json({ ...cmp, stats: stats(cmp) });
});
admin.post("/campaigns/:id/:action", (req, res) => {
  const status = { start: "running", pause: "paused", stop: "stopped" }[req.params.action];
  const c = status && campaigns.update(req.params.id, { status });
  c ? res.json({ id: c.id, status: c.status }) : res.sendStatus(404);
});

app.use("/api", admin);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || "Error" });
});

// ---------------- media streams (live audio) ----------------
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/media\/(twilio|plivo)$/);
  if (!m) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => handleMedia(ws, providers[m[1]], url.searchParams));
});

function handleMedia(ws, provider, params) {
  let session = null;
  const early = [];
  ws.on("message", (raw) => {
    let msg;
    try { msg = provider.parseMessage(raw.toString()); } catch { return; }
    if (!msg) return;
    if (msg.type === "start") {
      const callId = msg.callId || params.get("callId");
      const t = msg.token || params.get("t");
      const call = calls.get(callId);
      if (!call || !safeEqual(call.token, t)) return ws.close();
      const agent = agents.get(call.agentId);
      if (!agent) return ws.close();
      if (msg.providerCallId && !call.providerCallId) call.providerCallId = msg.providerCallId;
      calls.update(call.id, { sessionActive: true });
      session = new CallSession({
        call, agent, provider, ws, streamId: msg.streamId,
        onEnd: (c) => {
          calls.update(c.id, { sessionActive: false });
          setTimeout(() => finalise(c), 3000); // let the final status webhook (duration) arrive
        },
      });
      session.start().catch((err) => console.error("session start failed:", err));
      for (const a of early.splice(0)) session.onMedia(a);
    } else if (msg.type === "media") {
      session ? session.onMedia(msg.audio) : early.length < 50 && early.push(msg.audio);
    } else if (msg.type === "stop") {
      session?.stop();
    }
  });
  ws.on("close", () => session?.stop());
  ws.on("error", (err) => console.error("media socket error:", err.message));
}

startScheduler();
server.listen(config.port, () => {
  const missing = checkConfig();
  console.log(`DevInventor voice server on :${config.port} (provider: ${config.telephony})`);
  if (missing.length) console.warn("Missing settings:", missing.join(", "));
});

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { store.flush(); process.exit(0); });
