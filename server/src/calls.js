// Starting calls and tracking their status from provider webhooks.
import { calls, agents, id, token } from "./store.js";
import { telephony } from "./telephony/index.js";
import { inWindow, normalisePhone } from "./time.js";
import { finishCall } from "./postcall.js";

const TERMINAL = ["completed", "busy", "no-answer", "failed"];
const listeners = new Set();
export const onCallFinished = (fn) => listeners.add(fn);

export function newCall({ agent, phone, name, vars, direction = "outbound", source = "api", campaignId, contactIndex, provider }) {
  return calls.add({
    id: id("call"),
    token: token(),
    agentId: agent.id,
    direction,
    provider: provider || telephony().name,
    phone,
    name: name || "",
    vars: vars || {},
    source,
    campaignId: campaignId || null,
    contactIndex: contactIndex ?? null,
    status: "queued",
    createdAt: new Date().toISOString(),
    transcript: [],
    fields: {},
  });
}

export async function startOutboundCall({ agentId, phone, name, vars, source, campaignId, contactIndex, ignoreWindow = false }) {
  const agent = agents.get(agentId);
  if (!agent) throw new Error("Agent not found");
  const to = normalisePhone(phone);
  if (!to) throw new Error(`Invalid phone number: ${phone}`);
  if (!ignoreWindow && !inWindow()) throw new Error("Outside calling hours");
  if (calls.all().some((c) => c.phone === to && c.doNotCall)) throw new Error("This number asked not to be called");

  const call = newCall({ agent, phone: to, name, vars, source, campaignId, contactIndex });
  try {
    const providerCallId = await telephony().dial({ to, callId: call.id, token: call.token });
    calls.update(call.id, { providerCallId, status: "dialing" });
  } catch (err) {
    calls.update(call.id, { status: "failed", error: err.message });
    await finalise(call);
    throw err;
  }
  return call;
}

/** Provider status webhook. */
export async function updateStatus(call, { providerCallId, status, durationSec }) {
  if (providerCallId && call.provider === "plivo") call.providerCallId = providerCallId;
  if (durationSec !== undefined) call.durationSec = durationSec;
  if (!status || call.status === "completed" && status !== "completed") return calls.update(call.id, {});
  // The media session marks the call completed itself; only take terminal states from here.
  if (TERMINAL.includes(status)) {
    calls.update(call.id, { status: call.answeredAt ? "completed" : status, endedAt: call.endedAt || new Date().toISOString() });
    if (!call.sessionActive) await finalise(call);
  } else if (!["in-progress", "completed"].includes(call.status)) {
    calls.update(call.id, { status });
  }
}

export async function finalise(call) {
  if (call.finalised) return;
  call.finalised = true;
  calls.update(call.id, {});
  const agent = agents.get(call.agentId);
  if (agent) await finishCall(call, agent);
  for (const fn of listeners) {
    try { await fn(call); } catch (err) { console.error("call listener failed:", err); }
  }
}
