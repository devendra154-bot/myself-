// WhatsApp auto-reply bot (Meta WhatsApp Cloud API + Claude).
//
// Customer writes -> Meta POSTs /whatsapp/webhook -> Claude writes a reply from
// whatsapp-knowledge.md -> reply is sent. When a message needs a human (payment,
// complaint, custom quote, "talk to a person"...), a summary goes to the owner's
// WhatsApp, email and webhook. The owner answers by swipe-replying to the alert,
// or with #commands, and the customer gets it from the business number.
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { chats, waAlerts } from "./store.js";
import { client, baseParams } from "./claude.js";
import { postWebhook } from "./actions.js";
import { normalisePhone, localNow } from "./time.js";

const MAX_TEXT = 4000; // WhatsApp limit is 4096
const HISTORY = 20; // messages of history sent to Claude
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const RE_ENGAGEMENT_ERRORS = new Set([131047, 131026, 470]);
const CATEGORIES = ["project_inquiry", "student", "telecaller_client", "instagram", "personal", "other"];
const LABELS = {
  project_inquiry: "IoT / embedded project", student: "Student (Notes)", telecaller_client: "AI telecaller client",
  instagram: "Instagram follower", personal: "Personal contact", other: "Other",
};

// ---------------- webhook parsing ----------------

/** Meta signs each webhook with your app secret. Without a secret set, checks are skipped. */
export function verifySignature(rawBody, header) {
  if (!config.whatsapp.appSecret) return true;
  if (!rawBody || !header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", config.whatsapp.appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function messageText(m) {
  switch (m.type) {
    case "text": return m.text?.body || "";
    case "button": return m.button?.text || "";
    case "interactive": return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "";
    case "image": case "video": case "document":
      return m[m.type]?.caption ? `${m[m.type].caption} [sent a ${m.type}]` : `[sent a ${m.type} with no caption]`;
    case "audio": return m.audio?.voice ? "[sent a voice note]" : "[sent an audio file]";
    case "location": return `[shared a location: ${m.location?.name || ""} ${m.location?.latitude},${m.location?.longitude}]`.replace(/\s+/g, " ");
    case "contacts": return "[shared a contact card]";
    case "sticker": return "[sent a sticker]";
    case "reaction": return null; // emoji reactions need no reply
    default: return `[sent an unsupported ${m.type || "message"}]`;
  }
}

/** Incoming customer messages in a webhook payload (status updates are ignored). */
export function parseWebhook(body) {
  const out = [];
  for (const entry of body?.entry || []) for (const change of entry.changes || []) {
    const v = change.value || {};
    if (config.whatsapp.phoneNumberId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== config.whatsapp.phoneNumberId) continue;
    const names = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name || ""]));
    for (const m of v.messages || []) {
      const text = messageText(m);
      if (text === null) continue;
      out.push({ id: m.id, from: normalisePhone("+" + m.from), name: names[m.from] || "", type: m.type, text: text.trim(), contextId: m.context?.id || null, at: new Date(Number(m.timestamp) * 1000 || Date.now()).toISOString() });
    }
  }
  return out.filter((m) => m.from && m.id);
}

// ---------------- sending ----------------

async function graph(body) {
  const w = config.whatsapp;
  if (!w.token || !w.phoneNumberId) throw Object.assign(new Error("WhatsApp is not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)"), { code: "not_configured" });
  const res = await fetch(`${w.apiBase}/${w.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${w.token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`WhatsApp ${res.status}: ${data.error?.message || "error"}`), { code: data.error?.code, status: res.status });
  return data;
}

const waId = (phone) => phone.replace(/^\+/, "");

export async function sendText(to, text, { replyTo } = {}) {
  const body = { to: waId(to), type: "text", text: { body: String(text).slice(0, MAX_TEXT), preview_url: true } };
  if (replyTo) body.context = { message_id: replyTo };
  const data = await graph(body);
  return data.messages?.[0]?.id || null;
}

async function sendTemplate(to, name, params) {
  const data = await graph({
    to: waId(to), type: "template",
    template: { name, language: { code: config.whatsapp.templateLanguage }, components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: String(t).replace(/\s+/g, " ").slice(0, 900) })) }] },
  });
  return data.messages?.[0]?.id || null;
}

/** Blue ticks + "typing…" while Claude thinks. Failures here don't matter. */
async function markRead(messageId) {
  try { await graph({ status: "read", message_id: messageId, typing_indicator: { type: "text" } }); } catch { /* ignore */ }
}

async function sendEmail(subject, text) {
  const e = config.email;
  if (!e.resendKey || !e.to.length) return false;
  const res = await fetch(`${e.apiBase}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${e.resendKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: e.from, to: e.to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email ${res.status}: ${await res.text()}`);
  return true;
}

// ---------------- the AI reply ----------------

let knowledgeCache = { mtime: 0, text: "" };
function knowledge() {
  try {
    const st = fs.statSync(config.whatsapp.knowledgeFile);
    if (st.mtimeMs !== knowledgeCache.mtime) knowledgeCache = { mtime: st.mtimeMs, text: fs.readFileSync(config.whatsapp.knowledgeFile, "utf8") };
  } catch {
    knowledgeCache = { mtime: 0, text: "" };
  }
  return knowledgeCache.text;
}

function systemPrompt() {
  return `You are the WhatsApp assistant for DevInventor, replying on behalf of ${config.whatsapp.ownerName}.
Current time: ${localNow()}.

## How to reply
- Always reply in simple, friendly English, even if the customer writes in another language. If they don't understand English, keep sentences very short.
- WhatsApp style: short (usually 1–5 lines), warm, no long essays. Use *bold* for key words, and at most 1–2 emojis.
- Answer only from the business information below and general knowledge. Never invent prices, dates, discounts, availability or promises that are not written below.
- If someone asks whether they are talking to a bot, say honestly that you're an AI assistant and a human can take over.
- Never ask for or accept passwords, OTPs, card numbers or bank details.
- First message from someone new: greet them and answer their question directly (don't make them wait for a menu).

## When to escalate (set escalate = true)
Escalate when a human must act or decide:
- They want to place an order, confirm a project, negotiate or get a final quote, or make or confirm a payment.
- Complaints, refunds, delays, something broken, angry or upset customers.
- They ask for a human / call / meeting, or ask something personal for ${config.whatsapp.ownerName}.
- Urgent or important messages from personal contacts, family or authorities (college, government, bank, police, office).
- You cannot answer from the information below, or they sent a photo, voice note or file you cannot read.
When you escalate, still reply to the customer: tell them you've passed it to ${config.whatsapp.ownerName}, who will reply soon, and ask for any detail that would help (name, project details, deadline).
Do not escalate simple questions you can answer (what the Notes site does, starting prices, how to submit a project, the free prompts list...).

## Business information
${knowledge() || "(No business information file found. Answer generally and escalate anything specific.)"}`;
}

const replySchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "category", "escalate", "urgency", "reason", "summary"],
  properties: {
    reply: { type: "string", description: "The WhatsApp message to send to the customer." },
    category: { type: "string", enum: CATEGORIES },
    escalate: { type: "boolean", description: "true if a human needs to see this conversation." },
    urgency: { type: "string", enum: ["low", "normal", "high"] },
    reason: { type: "string", description: "Why a human is needed (empty if escalate is false)." },
    summary: { type: "string", description: "One or two sentences: who this is and what they want." },
  },
};
const replyZod = z.object({
  reply: z.string().min(1), category: z.enum(CATEGORIES), escalate: z.boolean(),
  urgency: z.enum(["low", "normal", "high"]), reason: z.string(), summary: z.string(),
});

/** Turn the chat history into alternating user/assistant messages for Claude. */
export function toClaudeMessages(messages) {
  const out = [];
  for (const m of messages.slice(-HISTORY)) {
    const role = m.role === "customer" ? "user" : "assistant";
    const text = m.role === "owner" ? `[${config.whatsapp.ownerName} replied personally] ${m.text}` : m.text;
    if (out.at(-1)?.role === role) out.at(-1).content += "\n" + text;
    else out.push({ role, content: text });
  }
  while (out[0]?.role === "assistant") out.shift();
  if (out.at(-1)?.role !== "user") out.push({ role: "user", content: "[No new message. Reply only if something is still unanswered.]" });
  return out;
}

export async function aiReply(chat) {
  const w = config.whatsapp;
  const base = baseParams({ model: w.model, effort: w.effort });
  const who = `[Customer: ${chat.name || "unknown name"}, ${chat.phone}${chat.category ? `, earlier category: ${chat.category}` : ""}]`;
  const msgs = toClaudeMessages(chat.messages);
  msgs[0] = { ...msgs[0], content: `${who}\n${msgs[0].content}` };
  const message = await client.beta.messages.create({
    ...base,
    output_config: { ...base.output_config, format: { type: "json_schema", schema: replySchema } },
    max_tokens: 4000,
    system: systemPrompt(),
    messages: msgs,
  });
  if (message.stop_reason === "refusal") throw new Error("The model declined this message");
  if (message.stop_reason === "max_tokens") throw new Error("Reply was cut off");
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return replyZod.parse(JSON.parse(text));
}

// ---------------- conversation handling ----------------

const seen = new Set();
const isOwner = (phone) => config.whatsapp.escalateTo.some((o) => normalisePhone(o) === phone);
const now = () => new Date().toISOString();
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function getChat(phone, name) {
  let chat = chats.get(phone);
  if (!chat) chat = chats.add({ phone, name: name || "", status: "bot", category: null, messages: [], escalations: [], createdAt: now() });
  else if (name && name !== chat.name) chats.update(phone, { name });
  return chat;
}

function addMessage(chat, m) {
  chat.messages.push({ at: now(), ...m });
  if (chat.messages.length > 300) chat.messages.splice(0, chat.messages.length - 300);
  chats.update(chat.phone, { updatedAt: now() });
}

const repliesLastHour = (chat) => chat.messages.filter((m) => m.role === "bot" && Date.now() - Date.parse(m.at) < 3600e3).length;

/** Send an alert about a chat to every owner (WhatsApp), email and webhook. */
export async function notifyOwners(chat, info) {
  const last = [...chat.messages].reverse().find((m) => m.role === "customer");
  const who = `${chat.name || "Unknown"} (${chat.phone})`;
  const alert = [
    `🔔 *Needs you*${info.urgency === "high" ? " · URGENT" : ""}`,
    `*From:* ${who}`,
    `*Type:* ${LABELS[info.category] || "Other"}`,
    info.reason ? `*Why:* ${info.reason}` : null,
    info.summary ? `*Summary:* ${info.summary}` : null,
    last ? `*Last message:* "${short(last.text, 300)}"` : null,
    "",
    "↩️ Swipe-reply to this message to answer them, or send:",
    `#reply ${chat.phone} your message`,
  ].filter((x) => x !== null).join("\n");
  const results = [];
  for (const owner of config.whatsapp.escalateTo) {
    const to = normalisePhone(owner);
    if (!to) continue;
    try {
      const id = await sendText(to, alert);
      if (id) waAlerts.set(id, chat.phone);
      results.push({ to, via: "whatsapp", ok: true });
    } catch (err) {
      // Outside the 24-hour window WhatsApp only allows approved templates.
      if (RE_ENGAGEMENT_ERRORS.has(err.code) && config.whatsapp.escalationTemplate) {
        try {
          const id = await sendTemplate(to, config.whatsapp.escalationTemplate, [`${who}: ${info.reason || info.summary || "new message"}`]);
          if (id) waAlerts.set(id, chat.phone);
          results.push({ to, via: "template", ok: true });
          continue;
        } catch (err2) { err = err2; }
      }
      console.error(`WhatsApp alert to ${to} failed:`, err.message);
      results.push({ to, via: "whatsapp", ok: false, error: err.message });
    }
  }
  try {
    const transcript = chat.messages.slice(-15).map((m) => `${m.role === "customer" ? chat.name || "Customer" : m.role === "owner" ? "You" : "Bot"}: ${m.text}`).join("\n");
    if (await sendEmail(`${info.urgency === "high" ? "URGENT: " : ""}WhatsApp: ${who} – ${info.reason || "needs you"}`, `${alert}\n\n--- Recent chat ---\n${transcript}`)) results.push({ via: "email", ok: true });
  } catch (err) {
    console.error("Escalation email failed:", err.message);
    results.push({ via: "email", ok: false, error: err.message });
  }
  try {
    if (await postWebhook(null, { event: "whatsapp.escalation", phone: chat.phone, name: chat.name, ...info, lastMessage: last?.text })) results.push({ via: "webhook", ok: true });
  } catch (err) {
    results.push({ via: "webhook", ok: false, error: err.message });
  }
  chat.escalations.push({ at: now(), ...info, results });
  chats.update(chat.phone, { lastAlertAt: now() });
  return results;
}

function shouldAlert(chat, info) {
  if (info.urgency === "high") return true;
  return !chat.lastAlertAt || Date.now() - Date.parse(chat.lastAlertAt) > ALERT_COOLDOWN_MS;
}

/** Handle one incoming message. Returns what happened (used by tests and the dashboard). */
export async function handleIncoming(msg) {
  if (seen.has(msg.id)) return { skipped: "duplicate" };
  seen.add(msg.id);
  if (seen.size > 5000) seen.delete(seen.values().next().value);

  if (isOwner(msg.from)) return handleOwner(msg);

  const chat = getChat(msg.from, msg.name);
  addMessage(chat, { role: "customer", text: msg.text, type: msg.type, waId: msg.id });

  // You've taken over this chat: just pass the message on to you.
  if (chat.status === "human") {
    await forwardToOwners(chat, msg.text);
    return { forwarded: true };
  }
  if (config.whatsapp.bot === "off") {
    if (shouldAlert(chat, {})) await notifyOwners(chat, { category: chat.category || "other", urgency: "normal", reason: "Auto-reply is off", summary: "" });
    return { botOff: true };
  }
  if (repliesLastHour(chat) >= config.whatsapp.maxRepliesPerHour) {
    if (!chat.rateLimitedAt || Date.now() - Date.parse(chat.rateLimitedAt) > 3600e3) {
      chats.update(chat.phone, { rateLimitedAt: now() });
      await notifyOwners(chat, { category: chat.category || "other", urgency: "normal", reason: `Bot paused: over ${config.whatsapp.maxRepliesPerHour} replies in an hour (maybe another bot or spam)`, summary: "" });
    }
    return { rateLimited: true };
  }

  markRead(msg.id);
  return queueReply(chat.phone);
}

// One reply job at a time per chat. Messages that arrive while a reply is being
// written are answered together in the next job.
const queues = new Map();
function queueReply(phone) {
  const job = (queues.get(phone) || Promise.resolve()).then(() => respond(phone)).catch((err) => { console.error("WhatsApp reply job failed:", err); return { error: err.message }; });
  queues.set(phone, job);
  job.finally(() => { if (queues.get(phone) === job) queues.delete(phone); });
  return job;
}

async function respond(phone) {
  if (config.whatsapp.waitMs > 0) await new Promise((r) => setTimeout(r, config.whatsapp.waitMs));
  const chat = chats.get(phone);
  if (!chat || chat.status === "human") return { skipped: "paused" };
  if (chat.messages.at(-1)?.role !== "customer") return { skipped: "already answered" };

  let info;
  try {
    info = await aiReply(chat);
  } catch (err) {
    console.error("WhatsApp AI reply failed:", err.message);
    info = { reply: `Thanks for your message! 🙏 ${cap(config.whatsapp.ownerName)} will reply to you shortly.`, category: chat.category || "other", escalate: true, urgency: "normal", reason: `Bot could not answer (${short(err.message, 80)})`, summary: "" };
  }
  // The owner may have taken over while Claude was thinking.
  if (chats.get(phone)?.status === "human") return { skipped: "paused" };

  let sent = null, sendError = null;
  try { sent = await sendText(chat.phone, info.reply); } catch (err) { sendError = err.message; console.error("WhatsApp reply failed:", err.message); }
  addMessage(chat, { role: "bot", text: info.reply, waId: sent, error: sendError || undefined });
  chats.update(chat.phone, { category: info.category });

  let alerted = false;
  if ((info.escalate || sendError) && shouldAlert(chat, info)) {
    await notifyOwners(chat, sendError ? { ...info, urgency: "high", reason: `Reply could not be sent: ${sendError}` } : info);
    alerted = true;
  }
  return { reply: info.reply, category: info.category, escalate: info.escalate, alerted, sendError };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function forwardToOwners(chat, text) {
  for (const owner of config.whatsapp.escalateTo) {
    const to = normalisePhone(owner);
    try {
      const id = await sendText(to, `💬 *${chat.name || chat.phone}* (${chat.phone}):\n${short(text, 1500)}\n\n↩️ Swipe-reply to answer.`);
      if (id) waAlerts.set(id, chat.phone);
    } catch (err) {
      console.error(`Forward to ${to} failed:`, err.message);
    }
  }
}

// ---------------- owner commands ----------------

const HELP = `🤖 *Bot commands*
↩️ Swipe-reply to any alert to answer that customer.
#reply <number> <message>: send a message as the business (pauses the bot for that chat)
#pause <number>: you take over, bot stops replying to them
#resume <number>: bot replies again
#chats: recent conversations
#bot on / #bot off: check the bot's on/off status`;

/** Reply to a customer as the business. Pauses the bot for that chat. */
export async function ownerReply(phone, text) {
  const chat = chats.get(phone);
  if (!chat) throw new Error(`No chat with ${phone}`);
  let id;
  try {
    id = await sendText(phone, text);
  } catch (err) {
    if (RE_ENGAGEMENT_ERRORS.has(err.code)) throw new Error(`${chat.name || phone} last wrote more than 24 hours ago, so WhatsApp only allows approved template messages. Call them, or wait for them to message again.`);
    throw err;
  }
  addMessage(chat, { role: "owner", text, waId: id });
  chats.update(phone, { status: "human", pausedAt: now() });
  return id;
}

export function setStatus(phone, status) {
  const chat = chats.get(phone);
  if (!chat) return null;
  return chats.update(phone, { status, ...(status === "bot" ? { rateLimitedAt: null } : { pausedAt: now() }) });
}

async function handleOwner(msg) {
  const say = (t) => sendText(msg.from, t).catch((err) => console.error("Owner reply failed:", err.message));
  const text = msg.text.trim();

  // Swipe-reply to an alert -> goes to that customer.
  const target = msg.contextId && waAlerts.get(msg.contextId);
  if (target && !text.startsWith("#")) {
    try {
      await ownerReply(target, text);
      await say(`✅ Sent to ${chats.get(target)?.name || target}. Bot paused for this chat; send #resume ${target} to hand it back.`);
      return { ownerReply: target };
    } catch (err) {
      await say(`❌ Could not send: ${err.message}`);
      return { error: err.message };
    }
  }

  const m = text.match(/^#(\w+)\s*(.*)$/s);
  if (!m) { await say(HELP); return { help: true }; }
  const [, cmd, rest] = m;
  const numMatch = rest.match(/^(\+?[\d\s-]{10,16})(?:\s+|$)([\s\S]*)$/);
  const phone = numMatch && normalisePhone(numMatch[1].replace(/\s|-/g, ""));
  const body = numMatch ? numMatch[2].trim() : "";

  switch (cmd.toLowerCase()) {
    case "reply":
      if (!phone || !body) { await say("Use: #reply 9876543210 your message"); return { error: "usage" }; }
      try {
        await ownerReply(phone, body);
        await say(`✅ Sent to ${chats.get(phone)?.name || phone}. Bot paused for this chat; send #resume ${phone} to hand it back.`);
        return { ownerReply: phone };
      } catch (err) { await say(`❌ ${err.message}`); return { error: err.message }; }
    case "pause":
    case "resume": {
      if (!phone) { await say(`Use: #${cmd} 9876543210`); return { error: "usage" }; }
      const c = setStatus(phone, cmd === "pause" ? "human" : "bot");
      await say(c ? (cmd === "pause" ? `⏸ Bot paused for ${c.name || phone}. Their messages will be forwarded to you.` : `▶️ Bot is replying to ${c.name || phone} again.`) : `No chat with ${phone}`);
      return { [cmd]: phone };
    }
    case "chats": {
      const list = [...chats.all()].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 8);
      await say(list.length ? "🗂 *Recent chats*\n" + list.map((c) => `${c.status === "human" ? "⏸" : "🤖"} ${c.name || "?"} ${c.phone} · ${LABELS[c.category] || "new"}\n   "${short(c.messages.at(-1)?.text || "", 60)}"`).join("\n") : "No chats yet.");
      return { chats: list.length };
    }
    case "bot":
      await say(`Auto-reply is *${config.whatsapp.bot === "off" ? "OFF" : "ON"}*. To change it, set WHATSAPP_BOT=on/off in your server settings. To stop it for one person, use #pause <number>.`);
      return { bot: config.whatsapp.bot };
    default:
      await say(HELP);
      return { help: true };
  }
}
