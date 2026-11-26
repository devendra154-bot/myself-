# AI photo reader for DevInventor Notes (Supabase)

`functions/read-notes/index.ts` reads photos of notes with **Sarvam Vision**:
handwriting, two-column pages, formulas such as MnO₂ and Zn²⁺. The website
sends the photo here, and the Sarvam key stays secret inside Supabase.

Without this function, the Notes site still works and uses the free in-browser
reader, which struggles with handwriting and columns.

## Deploy (about 5 minutes, all in the browser)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and choose your project (or create a free one).
2. **Edge Functions → Deploy a new function → Via Editor.**
3. Name it `read-notes`. Delete the sample code, paste all of `functions/read-notes/index.ts`, then click **Deploy**.
4. **Edge Functions → Secrets → Add new secret.** Name it `SARVAM_API_KEY` and paste your Sarvam key as the value. Save.
5. Open the `read-notes` function's **Details** (or Settings) and turn **off** "Enforce JWT verification". The website calls it without a Supabase login.
6. Copy the function URL. It looks like `https://<project-ref>.supabase.co/functions/v1/read-notes`.
7. In this repository, edit `notes/config.js` and set:
   ```js
   visionEndpoint: "https://<project-ref>.supabase.co/functions/v1/read-notes",
   ```
   Commit it, and the site uses the AI reader within a minute.

## Optional secrets

| Secret | Default | What it does |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://devendra154-bot.github.io` | Websites allowed to use the reader (comma separated) |
| `PER_IP_PER_HOUR` | `15` | Photos one person can send in an hour |
| `PAGES_PER_DAY` | `300` | Total photos per day, so your Sarvam credits can't run out |

The limits are counted per running copy of the function. They stop casual
overuse, not a determined attacker. Keep an eye on usage in your Sarvam dashboard.

## Cost

Each photo is one page of Sarvam Document Intelligence. Check the current
price on Sarvam's pricing page. Supabase's free plan includes 500,000 function
calls a month.

---

## తెలుగులో

1. supabase.com/dashboard లో మీ project తెరవండి.
2. **Edge Functions → Deploy a new function → Via Editor** నొక్కండి.
3. పేరు `read-notes` అని పెట్టండి. `functions/read-notes/index.ts` లోని code మొత్తం paste చేసి **Deploy** నొక్కండి.
4. **Edge Functions → Secrets** లో `SARVAM_API_KEY` అనే పేరుతో మీ Sarvam key పెట్టండి.
5. Function settings లో **"Enforce JWT verification"** ని **off** చేయండి.
6. Function URL copy చేసి నాకు పంపండి. Website కి నేను connect చేస్తాను.
