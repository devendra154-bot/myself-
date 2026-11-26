#!/usr/bin/env node
// Chat with your WhatsApp bot in the terminal before going live. Nothing is sent on WhatsApp.
//   node scripts/wa-chat.js                      (server on http://localhost:3000, ADMIN_TOKEN from .env)
//   SERVER=https://your-app.onrender.com ADMIN_TOKEN=xxx node scripts/wa-chat.js
import "dotenv/config";
import readline from "node:readline";

const server = (process.env.SERVER || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
const token = process.env.ADMIN_TOKEN;
if (!token) { console.error("Set ADMIN_TOKEN (in .env or the command line)."); process.exit(1); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const history = [];
console.log(`\nTalking to the WhatsApp bot at ${server}. Type a message as a customer.\nCommands: /new (start over), /quit\n`);

rl.setPrompt("👤 You: ");
rl.prompt();
// Lines are queued, so pasting several messages at once works too.
for await (const line of rl) {
  const text = line.trim();
  if (text === "/quit") break;
  if (text === "/new") { history.length = 0; console.log("— new conversation —\n"); rl.prompt(); continue; }
  if (!text) { rl.prompt(); continue; }
  if (!process.stdin.isTTY) console.log(text);
  history.push({ role: "customer", text });
  try {
    const res = await fetch(`${server}/api/whatsapp/simulate`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(r.error || `Server said ${res.status}`);
    history.push({ role: "bot", text: r.reply });
    console.log(`\n🤖 Bot: ${r.reply}`);
    console.log(`   [${r.category}${r.escalate ? ` · 🔔 would alert you (${r.urgency}): ${r.reason}` : ""}]\n`);
  } catch (err) {
    history.pop();
    console.log(`   ⚠️  ${err.cause?.code === "ECONNREFUSED" ? `Can't reach ${server}. Is the server running (npm start)?` : err.message}\n`);
  }
  rl.prompt();
}
rl.close();
