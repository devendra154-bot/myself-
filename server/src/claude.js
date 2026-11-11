import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

export const client = new Anthropic(); // reads ANTHROPIC_API_KEY

/**
 * Shared request settings. Server-side fallbacks are on: if the main model
 * declines a request, the API retries it on a fallback model inside the same
 * call instead of leaving the caller in silence.
 */
export function baseParams({ effort } = {}) {
  const p = {
    model: config.claude.model,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: effort || config.claude.effort },
  };
  if (config.claude.speed === "fast") p.speed = "fast";
  return p;
}

/** One structured-output call: returns the parsed JSON object validated by `zodSchema`. */
export async function jsonCall({ system, prompt, schema, zodSchema, effort = "medium" }) {
  const base = baseParams({ effort });
  const message = await client.beta.messages.create({
    ...base,
    output_config: { ...base.output_config, format: { type: "json_schema", schema } },
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (message.stop_reason === "refusal") throw new Error("The model declined this request");
  if (message.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens)");
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return zodSchema.parse(JSON.parse(text));
}
