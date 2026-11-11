import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

export const client = new Anthropic(); // reads ANTHROPIC_API_KEY

/** The Claude model for an agent's plan. */
export function modelFor(agent) {
  return (config.plans[agent?.plan] || config.plans.premium).model;
}

/**
 * Shared request settings. On models that support it, server-side fallbacks are
 * on: if the main model declines a request, the API retries it on a fallback
 * model inside the same call instead of leaving the caller in silence.
 */
export function baseParams({ effort, model } = {}) {
  const m = model || config.claude.model;
  const p = { model: m, output_config: { effort: effort || config.claude.effort } };
  if (!m.includes("haiku")) {
    p.betas = ["server-side-fallback-2026-07-01"];
    p.fallbacks = "default";
  }
  if (config.claude.speed === "fast" && m.includes("opus-5-5")) p.speed = "fast";
  return p;
}

/** Estimated cost in INR of one response's token usage. */
export function claudeCostInr(model, usage) {
  const rates = config.costs.claude[model] || config.costs.claude["claude-opus-5-5"];
  const [inp, out, cacheRead] = rates;
  const usd =
    ((usage.input_tokens || 0) * inp +
      (usage.cache_creation_input_tokens || 0) * inp * 1.25 +
      (usage.cache_read_input_tokens || 0) * cacheRead +
      (usage.output_tokens || 0) * out) / 1e6;
  return usd * config.costs.usdToInr;
}

/** One structured-output call: returns the parsed JSON object validated by `zodSchema`. */
export async function jsonCall({ system, prompt, schema, zodSchema, effort = "medium", model, onUsage }) {
  const base = baseParams({ effort, model });
  const message = await client.beta.messages.create({
    ...base,
    output_config: { ...base.output_config, format: { type: "json_schema", schema } },
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  onUsage?.(message.model, message.usage);
  if (message.stop_reason === "refusal") throw new Error("The model declined this request");
  if (message.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens)");
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return zodSchema.parse(JSON.parse(text));
}
