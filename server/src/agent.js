// The live conversation: turns what the caller said into what the AI telecaller
// says next, calling tools (save details, WhatsApp, booking, transfer, hang up) mid-call.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { client, baseParams } from "./claude.js";
import { LANGUAGES, config } from "./config.js";

const SCRIPTS = { hi: "Devanagari", mr: "Devanagari", te: "Telugu", ta: "Tamil", kn: "Kannada", ml: "Malayalam", en: "Latin" };

export function systemPrompt(agent) {
  const lang = LANGUAGES[agent.language]?.name || "Hindi";
  const script = SCRIPTS[agent.language] || "Devanagari";
  const fields = (agent.fieldsToCollect || []).map((f) => `- ${f}`).join("\n") || "- (none in particular)";
  return `You are ${agent.persona}, a phone telecaller for ${agent.business}. You are on a live phone call.

# Goal of this call
${agent.goal}

# What you know and how to behave
${agent.instructions || "(no extra instructions)"}

# Information to collect (save each item with save_details as soon as you learn it)
${fields}

# How to speak
- Speak ${lang}, the way people in India really talk: mix in common English words (budget, location, site visit, EMI) where that is natural.
- Write ${lang} words in ${script} script and English words in English. Your text is read aloud by a voice engine, so never use markdown, lists, emojis, brackets or abbreviations.
- Keep every reply to one or two short sentences, then let the caller talk. Ask one question at a time.
- Say numbers, prices, dates and times the way a person would say them aloud.
- If the caller speaks a different language, switch to their language.
- Be warm and polite, never pushy. If they are busy, offer to call back and use schedule_callback.
- Only state facts given above. If you don't know something, say the team will share it, and save it as a note.
- If asked whether you are a human, say honestly that you are an AI assistant calling for ${agent.business}.
- If they ask not to be called again, apologise, confirm, then end the call with do_not_call set to true.
- When the goal is done or the caller wants to leave, say a short goodbye and call end_call in the same reply.

Messages in square brackets are notes from the phone system, not words the caller said.`;
}

const tools = (agent) => {
  const list = [
    {
      name: "save_details",
      description: "Save information the caller gave (for the lead record and CRM). Call it as soon as you learn something useful.",
      input_schema: {
        type: "object",
        properties: {
          details: {
            type: "array",
            items: {
              type: "object",
              properties: { field: { type: "string", description: "Short field name, e.g. budget" }, value: { type: "string" } },
              required: ["field", "value"],
            },
          },
        },
        required: ["details"],
      },
    },
    {
      name: "book_appointment",
      description: "Book a visit, demo, test drive or appointment once the caller has agreed to a time.",
      input_schema: {
        type: "object",
        properties: {
          when: { type: "string", description: "Date and time in ISO 8601 with +05:30 offset" },
          what: { type: "string", description: "e.g. Site visit at Sector 150" },
          notes: { type: "string" },
        },
        required: ["when", "what"],
      },
    },
    {
      name: "schedule_callback",
      description: "Schedule a call back when the caller is busy or asks to be called later.",
      input_schema: {
        type: "object",
        properties: { when: { type: "string", description: "ISO 8601 with +05:30 offset" }, reason: { type: "string" } },
        required: ["when"],
      },
    },
    {
      name: "end_call",
      description: "Hang up after your goodbye has been spoken. Put the goodbye text in the same reply.",
      input_schema: {
        type: "object",
        properties: {
          reason: { type: "string" },
          do_not_call: { type: "boolean", description: "True if the caller asked never to be called again" },
        },
        required: ["reason"],
      },
    },
  ];
  if (config.whatsapp.token || agent.outcomeWebhook || config.outcomeWebhook) {
    list.push({
      name: "send_whatsapp",
      description: "Send a WhatsApp message to the caller right now (location, brochure link, details). Tell them you have sent it.",
      input_schema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    });
  }
  if (agent.transferNumber) {
    list.push({
      name: "transfer_call",
      description: "Connect the caller to a human on the team. Use when they ask for a person or need something you cannot handle. Say you are connecting them first.",
      input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
    });
  }
  return list.map((t) => ({ ...t, eager_input_streaming: true }));
};

// Tool inputs are validated before running: with eager input streaming the API
// no longer validates them for us.
const INPUTS = {
  save_details: z.object({ details: z.array(z.object({ field: z.string(), value: z.string() })) }),
  book_appointment: z.object({ when: z.string(), what: z.string(), notes: z.string().optional() }),
  schedule_callback: z.object({ when: z.string(), reason: z.string().optional() }),
  end_call: z.object({ reason: z.string(), do_not_call: z.boolean().optional() }),
  send_whatsapp: z.object({ message: z.string().min(1) }),
  transfer_call: z.object({ reason: z.string() }),
};

/** Splits streamed text into speakable sentences. */
class SentenceSplitter {
  constructor(onSentence) { this.buf = ""; this.onSentence = onSentence; }
  push(text) {
    this.buf += text;
    let m;
    while ((m = this.buf.match(/^([\s\S]*?[.!?।॥](?:["')\]]*)|[\s\S]*?\n)\s+/))) {
      this.emit(m[1]);
      this.buf = this.buf.slice(m[0].length);
    }
    if (this.buf.length > 160) {
      const cut = this.buf.lastIndexOf(",", 160);
      if (cut > 40) { this.emit(this.buf.slice(0, cut + 1)); this.buf = this.buf.slice(cut + 1); }
    }
  }
  flush() { this.emit(this.buf); this.buf = ""; }
  emit(s) { const t = s.replace(/[*_#`]/g, "").trim(); if (t) this.onSentence(t); }
}

export class Conversation {
  /**
   * @param agent agent config
   * @param handlers { onSentence(text), runTool(name, input) => Promise<string> }
   */
  constructor(agent, handlers) {
    this.agent = agent;
    this.handlers = handlers;
    this.system = [{ type: "text", text: systemPrompt(agent), cache_control: { type: "ephemeral" } }];
    this.tools = tools(agent);
    /** @type {Anthropic.Beta.BetaMessageParam[]} */
    this.messages = [];
  }

  /** Run one caller turn. Resolves with the text the agent said. */
  async turn(userText) {
    this.messages.push({ role: "user", content: userText });
    let said = "";
    let jsonRetries = 0;

    for (let step = 0; step < 5; step++) {
      const splitter = new SentenceSplitter((s) => { said += (said ? " " : "") + s; this.handlers.onSentence(s); });
      const stream = client.beta.messages.stream({
        ...baseParams(),
        max_tokens: 4096,
        system: this.system,
        tools: this.tools,
        messages: this.messages,
      });
      stream.on("text", (delta) => splitter.push(delta));

      let message;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
        continue; // a tool input could not be parsed: re-issue the turn
      }
      splitter.flush();

      if (message.stop_reason === "refusal") break;
      // Always keep the full assistant content (thinking blocks included) unchanged.
      this.messages.push({ role: "assistant", content: message.content });

      const toolUses = message.content.filter((b) => b.type === "tool_use");
      if (!toolUses.length || message.stop_reason !== "tool_use") break;

      const results = await Promise.all(toolUses.map(async (tu) => {
        const schema = INPUTS[tu.name];
        const parsed = schema?.safeParse(tu.input);
        if (!parsed?.success) {
          return { type: "tool_result", tool_use_id: tu.id, is_error: true, content: JSON.stringify({ INVALID_JSON: JSON.stringify(tu.input) }) };
        }
        try {
          const out = await this.handlers.runTool(tu.name, parsed.data);
          return { type: "tool_result", tool_use_id: tu.id, content: out || "done" };
        } catch (err) {
          return { type: "tool_result", tool_use_id: tu.id, is_error: true, content: String(err.message || err) };
        }
      }));
      this.messages.push({ role: "user", content: results });

      // After end_call / transfer_call there is nothing more to say.
      if (toolUses.some((t) => t.name === "end_call" || t.name === "transfer_call")) break;
    }
    return said;
  }
}
