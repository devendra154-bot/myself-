// DevInventor Notes: AI photo reader (Supabase Edge Function).
//
// The website sends a photo of notes; this function asks Sarvam Vision (Document
// Intelligence) to read it and returns the text. The Sarvam key stays here as a
// secret, never in the website.
//
// Deploy: see supabase/README.md. Secrets: SARVAM_API_KEY (required),
// ALLOWED_ORIGINS, PER_IP_PER_HOUR, PAGES_PER_DAY (optional).

const env = (k: string, d = "") => (globalThis as any).Deno?.env.get(k) ?? (globalThis as any).process?.env[k] ?? d;
const SARVAM = "https://api.sarvam.ai";
const MAX_BYTES = 6 * 1024 * 1024;

// Limits are counted per running instance: good enough to stop accidental or casual overuse.
const hits = new Map<string, number[]>();
let day = "", pagesToday = 0;

function cors(origin: string | null) {
  const allowed = env("ALLOWED_ORIGINS", "https://devendra154-bot.github.io").split(",").map((s: string) => s.trim());
  const ok = !!origin && allowed.includes(origin);
  return {
    ok,
    headers: {
      "access-control-allow-origin": ok ? origin! : allowed[0],
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
      "vary": "origin",
    },
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

function overLimit(ip: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; pagesToday = 0; }
  if (pagesToday >= Number(env("PAGES_PER_DAY", "300"))) return "The photo reader has reached today's limit. Please try again tomorrow.";
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (list.length >= Number(env("PER_IP_PER_HOUR", "15"))) return "Too many photos in one hour. Please wait a little and try again.";
  list.push(now);
  hits.set(ip, list);
  pagesToday++;
  return "";
}

/** Sarvam Vision: start a parse job, wait for it, return the page text in reading order. */
export async function readWithSarvam(image: Blob, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = env("SARVAM_API_KEY");
  const h = { "api-subscription-key": key };
  const form = new FormData();
  form.append("file", image, "notes.jpg");
  form.append("language", "en-IN");
  form.append("content_type", "mixed");
  const start = await fetchImpl(`${SARVAM}/doc-ai/v1/job/parse`, { method: "POST", headers: h, body: form });
  const job = await start.json().catch(() => ({}));
  if (!start.ok || !job.job_id) throw new Error(`Sarvam didn't start the job (${start.status}): ${JSON.stringify(job).slice(0, 200)}`);

  const deadline = Date.now() + 80_000;
  let status = job.status;
  while (!["completed", "partially_completed", "failed", "rejected"].includes(status)) {
    if (Date.now() > deadline) throw new Error("Sarvam took too long to read this photo.");
    await new Promise((r) => setTimeout(r, 1500));
    const s = await fetchImpl(`${SARVAM}/doc-ai/v1/job/${job.job_id}/status`, { headers: h });
    status = (await s.json().catch(() => ({}))).status;
  }
  if (status === "failed" || status === "rejected") throw new Error(`Sarvam could not read this photo (${status}).`);

  const r = await fetchImpl(`${SARVAM}/doc-ai/v1/job/${job.job_id}/results`, { headers: { ...h, "accept-encoding": "gzip" } });
  const data = await r.json();
  const pages = (data.documents || []).flatMap((d: any) => d.pages || []).sort((a: any, b: any) => a.page_num - b.page_num);
  return pages
    .map((p: any) => (p.blocks || []).sort((a: any, b: any) => a.reading_order - b.reading_order).map((b: any) => String(b.text || "").trim()).filter(Boolean).join("\n\n"))
    .join("\n\n")
    .trim();
}

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const { ok, headers } = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405, headers);
  if (!ok) return json({ error: "This reader only works on the DevInventor Notes website." }, 403, headers);
  if (!env("SARVAM_API_KEY")) return json({ error: "The photo reader isn't set up yet (missing SARVAM_API_KEY)." }, 500, headers);

  let file: File | null = null;
  try { file = (await req.formData()).get("file") as File | null; } catch { /* not multipart */ }
  if (!file || typeof file === "string") return json({ error: "Send the photo as 'file'." }, 400, headers);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return json({ error: "Send a JPG or PNG photo." }, 400, headers);
  if (file.size > MAX_BYTES) return json({ error: "Photo is too large (max 6 MB)." }, 413, headers);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const limit = overLimit(ip);
  if (limit) return json({ error: limit }, 429, headers);

  try {
    const text = await readWithSarvam(file, fetchImpl);
    return json({ text }, 200, headers);
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message || "Couldn't read this photo." }, 502, headers);
  }
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve((req: Request) => handle(req));
