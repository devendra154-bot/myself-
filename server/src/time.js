import { config } from "./config.js";

/** Minutes since midnight in the business timezone. */
export function localMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: config.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour").value);
  const m = Number(parts.find((p) => p.type === "minute").value);
  return h * 60 + m;
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Window is clipped to the legal calling window (default 09:00-21:00). */
export function inWindow(window = config.callingWindow, date = new Date()) {
  const start = Math.max(toMin(window.start), toMin(config.callingWindow.start));
  const end = Math.min(toMin(window.end), toMin(config.callingWindow.end));
  const now = localMinutes(date);
  return now >= start && now < end;
}

export function localNow() {
  return new Intl.DateTimeFormat("en-IN", { timeZone: config.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date());
}

/** Normalise an Indian or international number to E.164. */
export function normalisePhone(raw) {
  let d = String(raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return /^\+\d{8,15}$/.test(d) ? d : null;
  d = d.replace(/^0+/, "");
  if (d.length === 10) return "+91" + d;
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  return d.length >= 8 && d.length <= 15 ? "+" + d : null;
}

export const maskPhone = (p) => (p ? p.slice(0, 6) + "•••••" + p.slice(-3) : "");
