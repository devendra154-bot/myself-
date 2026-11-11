// Side effects the AI telecaller can trigger: WhatsApp messages and outcome webhooks.
import { config } from "./config.js";

export async function sendWhatsApp(to, message, agent) {
  if (config.whatsapp.token && config.whatsapp.phoneNumberId) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.whatsapp.token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body: message } }),
    });
    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
    return "WhatsApp message sent";
  }
  // No WhatsApp API configured: hand it to the webhook (Pabbly/Zapier can send it).
  await postWebhook(agent, { event: "whatsapp.send", to, message });
  return "WhatsApp message queued";
}

export async function postWebhook(agent, payload) {
  const url = agent?.outcomeWebhook || config.outcomeWebhook;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "devinventor-voice" },
    body: JSON.stringify({ ...payload, agent: agent ? { id: agent.id, slug: agent.slug, name: agent.name } : undefined, sentAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
  return true;
}
