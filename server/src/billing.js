// Price (what the customer pays) and estimated cost (what you pay) for each call.
import { config } from "./config.js";
import { claudeCostInr } from "./claude.js";

const round2 = (n) => Math.round(n * 100) / 100;

export function emptyUsage() {
  return { claudeInr: 0, ttsChars: 0, sttSeconds: 0 };
}

export function addClaudeUsage(call, model, usage) {
  call.usage ||= emptyUsage();
  call.usage.claudeInr += claudeCostInr(model, usage || {});
}

/** Connected seconds: from the provider if known, else from our own timestamps. */
export function talkSeconds(call) {
  if (call.durationSec && call.answeredAt) return call.durationSec;
  if (!call.answeredAt) return 0;
  const end = call.endedAt ? new Date(call.endedAt) : new Date();
  return Math.max(0, Math.round((end - new Date(call.answeredAt)) / 1000));
}

export function priceCall(call, agent) {
  const plan = config.plans[agent?.plan] || config.plans.premium;
  const seconds = talkSeconds(call);
  const minutes = seconds / 60;
  const u = call.usage || emptyUsage();
  const c = config.costs;
  const cost = {
    phone: minutes * c.phonePerMinInr,
    voice: (u.ttsChars / 1000) * c.ttsUsdPer1kChars * c.usdToInr,
    listening: (u.sttSeconds / 3600) * c.sttUsdPerHour * c.usdToInr,
    ai: u.claudeInr,
  };
  const totalCost = Object.values(cost).reduce((a, b) => a + b, 0);
  const price = minutes * plan.pricePerMin;
  return {
    plan: agent?.plan || "premium",
    seconds,
    ratePerMin: plan.pricePerMin,
    price: round2(price),
    estCost: round2(totalCost),
    estCostBreakdown: Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, round2(v)])),
    margin: round2(price - totalCost),
  };
}

export function plansSummary() {
  return Object.fromEntries(Object.entries(config.plans).map(([k, p]) => [k, { name: p.name, pricePerMin: p.pricePerMin, model: p.model }]));
}
