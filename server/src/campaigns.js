// Bulk campaigns: work through a contact list with N calls at a time,
// inside calling hours, retrying busy / unanswered numbers.
import { campaigns, calls, id } from "./store.js";
import { startOutboundCall, onCallFinished } from "./calls.js";
import { inWindow, normalisePhone } from "./time.js";

const RETRY_OUTCOMES = ["no_answer", "busy", "failed", "voicemail"];

export function parseContacts(input) {
  if (Array.isArray(input)) return input;
  const lines = String(input || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l) => l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  let header = split(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => /phone|mobile|number|name/.test(h));
  if (!hasHeader) header = ["phone", "name"];
  return lines.slice(hasHeader ? 1 : 0).map((l) => {
    const cols = split(l);
    const row = Object.fromEntries(header.map((h, i) => [h, cols[i] || ""]));
    const phone = row.phone || row.mobile || row.number || row["phone number"] || cols[0];
    const { phone: _p, mobile: _m, number: _n, name, ...vars } = row;
    return { phone, name: name || "", vars };
  });
}

export function createCampaign({ agentId, name, contacts, concurrency = 5, window, maxAttempts = 3, retryMinutes = 120 }) {
  const seen = new Set();
  const list = [];
  for (const c of parseContacts(contacts)) {
    const phone = normalisePhone(c.phone);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    list.push({ phone, name: c.name || "", vars: c.vars || {}, status: "pending", attempts: 0, nextAttemptAt: null, outcome: null, callIds: [] });
  }
  if (!list.length) throw new Error("No valid phone numbers in the list");
  return campaigns.add({
    id: id("cmp"),
    agentId,
    name: name || `Campaign ${new Date().toLocaleDateString("en-IN")}`,
    status: "paused",
    concurrency: Math.max(1, Math.min(50, Number(concurrency) || 5)),
    window: window || { start: "10:00", end: "19:00" },
    maxAttempts: Math.max(1, Math.min(5, Number(maxAttempts) || 3)),
    retryMinutes: Math.max(10, Number(retryMinutes) || 120),
    contacts: list,
    createdAt: new Date().toISOString(),
  });
}

export function stats(cmp) {
  const s = { total: cmp.contacts.length, called: 0, interested: 0, callback: 0, not_interested: 0, retrying: 0, pending: 0, active: 0 };
  for (const c of cmp.contacts) {
    if (c.attempts > 0) s.called++;
    if (c.status === "active") s.active++;
    else if (c.status === "pending") (c.attempts ? s.retrying++ : s.pending++);
    if (["interested", "booked"].includes(c.outcome)) s.interested++;
    else if (c.outcome === "callback") s.callback++;
    else if (["not_interested", "do_not_call", "wrong_number"].includes(c.outcome)) s.not_interested++;
  }
  return s;
}

async function tick() {
  for (const cmp of campaigns.all()) {
    if (cmp.status !== "running" || !inWindow(cmp.window)) continue;
    let active = cmp.contacts.filter((c) => c.status === "active").length;
    const now = Date.now();
    for (let i = 0; i < cmp.contacts.length && active < cmp.concurrency; i++) {
      const c = cmp.contacts[i];
      if (c.status !== "pending" || (c.nextAttemptAt && new Date(c.nextAttemptAt).getTime() > now)) continue;
      c.status = "active";
      c.attempts++;
      active++;
      try {
        const call = await startOutboundCall({ agentId: cmp.agentId, phone: c.phone, name: c.name, vars: c.vars, source: "campaign", campaignId: cmp.id, contactIndex: i });
        c.callIds.push(call.id);
      } catch (err) {
        c.status = "done";
        c.outcome = "failed";
        c.error = err.message;
        active--;
      }
      campaigns.update(cmp.id, {});
    }
    if (cmp.contacts.every((c) => c.status === "done")) campaigns.update(cmp.id, { status: "finished", finishedAt: new Date().toISOString() });
  }
}

onCallFinished((call) => {
  if (!call.campaignId) return;
  const cmp = campaigns.get(call.campaignId);
  const c = cmp?.contacts[call.contactIndex];
  if (!c) return;
  c.outcome = call.outcome;
  if (RETRY_OUTCOMES.includes(call.outcome) && c.attempts < cmp.maxAttempts) {
    c.status = "pending";
    c.nextAttemptAt = new Date(Date.now() + cmp.retryMinutes * 60000).toISOString();
  } else if (call.outcome === "callback" && call.callbackAt && c.attempts < cmp.maxAttempts + 1) {
    c.status = "pending";
    c.nextAttemptAt = new Date(call.callbackAt).toISOString();
  } else {
    c.status = "done";
  }
  campaigns.update(cmp.id, {});
});

export function startScheduler() {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try { await tick(); } catch (err) { console.error("campaign tick failed:", err); } finally { running = false; }
  }, 5000);
}

export function activeCallsFor(cmpId) {
  return calls.active().filter((c) => c.campaignId === cmpId).length;
}
