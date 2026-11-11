// "Build my employee": turn a one-line description into a full agent config.
import { z } from "zod";
import { jsonCall } from "./claude.js";
import { LANGUAGES } from "./config.js";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short internal name, e.g. EMI reminders" },
    persona: { type: "string", description: "Indian first name for the telecaller" },
    gender: { type: "string", enum: ["female", "male"] },
    goal: { type: "string", description: "What a successful call achieves, one or two sentences" },
    instructions: { type: "string", description: "Call flow, key facts to use, objection handling, what not to say" },
    opening_line: { type: "string", description: "First sentence spoken, in the call language and its native script" },
    fields_to_collect: { type: "array", items: { type: "string" } },
  },
  required: ["name", "persona", "gender", "goal", "instructions", "opening_line", "fields_to_collect"],
  additionalProperties: false,
};
const zodSchema = z.object({
  name: z.string(), persona: z.string(), gender: z.enum(["female", "male"]), goal: z.string(),
  instructions: z.string(), opening_line: z.string(), fields_to_collect: z.array(z.string()),
});

export async function buildAgent({ description, business, language = "hi" }) {
  const lang = LANGUAGES[language]?.name || "Hindi";
  const out = await jsonCall({
    system: "You design AI phone telecallers for Indian businesses. Write practical, specific call scripts. Never invent prices, offers or facts the business did not give: leave placeholders like [price] in the instructions for the owner to fill in.",
    prompt: `Business name: ${business || "(not given)"}\nCall language: ${lang}\nWhat the telecaller should do:\n${description}`,
    schema,
    zodSchema,
  });
  return {
    name: out.name,
    persona: out.persona,
    gender: out.gender,
    goal: out.goal,
    instructions: out.instructions,
    openingLine: out.opening_line,
    fieldsToCollect: out.fields_to_collect,
  };
}
