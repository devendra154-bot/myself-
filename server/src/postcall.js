// After a call: Claude writes the summary and outcome, then it goes to your webhook / CRM.
import { z } from "zod";
import { jsonCall, modelFor } from "./claude.js";
import { addClaudeUsage, priceCall } from "./billing.js";
import { calls } from "./store.js";
import { postWebhook } from "./actions.js";

export const OUTCOMES = ["interested", "booked", "callback", "not_interested", "do_not_call", "wrong_number", "voicemail", "no_answer", "busy", "failed", "completed"];

const schema = {
  type: "object",
  properties: {
    outcome: { type: "string", enum: OUTCOMES },
    summary: { type: "string", description: "Two or three sentences in English for the sales team" },
    details: {
      type: "array",
      items: { type: "object", properties: { field: { type: "string" }, value: { type: "string" } }, required: ["field", "value"], additionalProperties: false },
    },
    callback_at: { type: ["string", "null"], description: "ISO 8601 with +05:30 if a call back was agreed, else null" },
  },
  required: ["outcome", "summary", "details", "callback_at"],
  additionalProperties: false,
};
const zodSchema = z.object({
  outcome: z.enum(OUTCOMES),
  summary: z.string(),
  details: z.array(z.object({ field: z.string(), value: z.string() })),
  callback_at: z.string().nullable(),
});

export async function finishCall(call, agent) {
  const spoke = call.transcript.some((t) => t.role === "caller");
  if (!spoke && !call.outcome) {
    const status = call.status;
    calls.update(call.id, {
      outcome: status === "busy" ? "busy" : status === "failed" ? "failed" : call.answeredAt ? "voicemail" : "no_answer",
      summary: call.answeredAt ? "Call connected but the person did not speak." : "Call was not answered.",
    });
  } else if (spoke) {
    try {
      const transcript = call.transcript.map((t) => `${t.role === "agent" ? agent.persona : "Caller"}: ${t.text}`).join("\n");
      const result = await jsonCall({
        system: "You review phone calls made by an AI telecaller and fill in the CRM record. Be factual; use only what was said.",
        prompt: `Business: ${agent.business}\nGoal: ${agent.goal}\nFields wanted: ${(agent.fieldsToCollect || []).join(", ") || "any useful details"}\n` +
          `Booking made: ${call.booking ? JSON.stringify(call.booking) : "none"}\nCaller asked not to be called: ${call.doNotCall ? "yes" : "no"}\n\nTranscript:\n${transcript}`,
        schema,
        zodSchema,
        model: modelFor(agent),
        effort: "low",
        onUsage: (model, usage) => addClaudeUsage(call, model, usage),
      });
      const fields = { ...call.fields };
      for (const d of result.details) if (!(d.field in fields)) fields[d.field] = d.value;
      calls.update(call.id, {
        outcome: call.doNotCall ? "do_not_call" : call.booking ? "booked" : result.outcome,
        summary: result.summary,
        fields,
        callbackAt: call.callbackAt || result.callback_at || null,
      });
    } catch (err) {
      console.error(`[${call.id}] summary failed:`, err.message);
      calls.update(call.id, { outcome: call.booking ? "booked" : "completed", summary: "Summary unavailable." });
    }
  }

  calls.update(call.id, { billing: priceCall(call, agent) });

  try {
    await postWebhook(agent, {
      event: "call.completed",
      call: {
        id: call.id, direction: call.direction, phone: call.phone, name: call.name, outcome: call.outcome,
        summary: call.summary, fields: call.fields, booking: call.booking || null, callbackAt: call.callbackAt || null,
        durationSec: call.durationSec, billing: call.billing, startedAt: call.createdAt, endedAt: call.endedAt, campaignId: call.campaignId || null,
        source: call.source, transcript: call.transcript,
      },
    });
  } catch (err) {
    console.error(`[${call.id}] outcome webhook failed:`, err.message);
  }
  return call;
}
