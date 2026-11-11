# DevInventor Voice: AI telecaller backend

This server makes and answers real phone calls. An AI telecaller speaks Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi or English.

```
Caller's phone ⇄ Plivo / Twilio ⇄ this server ⇄ ElevenLabs (hears + speaks)
                                       ⇅
                                    Claude (thinks, decides, uses tools)
```

## What it does

- **Instant leads:** send a lead to `/lead-intake/<agent>` and it is called within seconds. Outside calling hours, it is called when the next window opens.
- **Bulk campaigns:** upload a CSV. The server makes N calls at a time within your calling hours, retries busy and unanswered numbers, and honours callback times.
- **Inbound:** point your number at the server and the AI answers 24/7.
- **Mid-call actions:** saves lead details, books appointments, schedules callbacks, sends WhatsApp messages, transfers to a human and hangs up politely.
- **After each call:** Claude writes a summary and an outcome (interested, booked, callback, not interested…). The server POSTs it to your webhook, which can feed a CRM, Google Sheets, Pabbly or Zapier.
- **Dashboard** at `/dashboard`: create AI employees from a one-line description, make test calls, run campaigns and read transcripts.
- **Compliance:** calls only between 09:00 and 21:00 IST, honours "don't call me again" (never calls that number again), and the AI says it is an AI if asked.

## What you need (accounts and keys)

| Service | Why | Where |
|---|---|---|
| **Plivo** (recommended for India) or **Twilio** | Phone numbers and calling | plivo.com / twilio.com |
| **Anthropic API key** | Claude, the conversation brain | console.anthropic.com |
| **ElevenLabs API key** | Voices and speech recognition | elevenlabs.io |
| **Hosting with HTTPS** | Phone providers must reach your server | Render, Railway or any VPS |

**India telecom rules.** For outbound calls to Indian numbers you need:

- a business number from your provider, with KYC done
- DLT registration (entity and caller ID)
- calls kept to the allowed hours

Promotional calls to numbers on the DND list are not allowed. Plivo and Twilio support teams can guide you through DLT.

## Run it on your computer

```bash
cd server
cp .env.example .env      # fill in your keys
npm install
npm test                  # runs a full simulated call with fake services
npm start                 # http://localhost:3000/dashboard
```

For real calls on your computer, providers must be able to reach it. Use a tunnel such as `ngrok http 3000` or `cloudflared`, and set `PUBLIC_URL` to the tunnel's https address.

## Deploy (Render)

1. Push this repo to GitHub (already done).
2. On render.com: **New → Blueprint →** pick this repo. It reads `render.yaml`.
3. Fill in the secret values it asks for: `PUBLIC_URL` (your Render URL), `CALLER_ID`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` and your Plivo or Twilio keys.
4. Open `https://<your-app>.onrender.com/dashboard` and sign in with the `ADMIN_TOKEN` that Render generated (Environment tab).

The Starter plan or higher is needed: the free plan sleeps, and a sleeping server misses calls.

## First call in 5 minutes

1. **Dashboard → New employee.** Describe it ("Call new property leads, ask budget and book a site visit"). Click **Write it for me**, check the script, add your real prices and facts, pick a voice, then **Save**.
2. Click **Test call** and enter your own number. Your phone rings.
3. **Connect leads** shows the lead-intake URL and secret for Meta Lead Ads (via Pabbly/Zapier), website forms and Google Sheets.
4. **Campaigns → New campaign.** Upload a CSV with a `phone` column (plus `name` and any extra columns; the AI can use them), then start it.

### Inbound calls

In the Plivo or Twilio console, set your number's answer URL (POST) to the **Inbound URL** shown under *Connect leads*:

```
https://<your-app>/voice/plivo/inbound?agent=<agent-slug>&s=<INBOUND_SECRET>
```

### Lead intake API

```bash
curl -X POST https://<your-app>/lead-intake/<agent-slug> \
  -H "X-DevInventor-Lead-Secret: <secret from dashboard>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","name":"Rahul","project":"Sector 150"}'
# → 202 {"callId":"call_…","status":"dialing"}
```

Extra fields (`project` in this example) are passed to the AI as lead details.

### Outcome webhook

Set `OUTCOME_WEBHOOK_URL`, or a webhook per employee, to receive this after every call:

```json
{ "event": "call.completed",
  "call": { "phone": "+9198…", "outcome": "booked", "summary": "…",
            "fields": { "budget": "90 lakh" }, "booking": { "when": "…", "what": "Site visit" },
            "callbackAt": null, "transcript": [ … ] } }
```

If WhatsApp Cloud API keys aren't set, `send_whatsapp` actions go to the same webhook as `{"event":"whatsapp.send","to":…,"message":…}`. Your Pabbly or Zapier flow can send them from there.

## Tuning

- **Faster replies:** `CLAUDE_EFFORT=low` (default). `CLAUDE_SPEED=fast` is faster again but costs twice as much. `ELEVENLABS_TTS_MODEL=eleven_flash_v2_5` is the fastest voice model.
- **Better Telugu, Kannada, Malayalam or Marathi pronunciation:** try `ELEVENLABS_TTS_MODEL=eleven_v3` or an Indian voice from the ElevenLabs voice library.
- **Interruptions:** `VAD_BARGE_IN_MS` sets how long the caller must talk over the AI before it stops (default 250 ms). On noisy lines, raise `VAD_THRESHOLD`.
- **Cost per minute (rough):** phone line + ElevenLabs voice and recognition + Claude. Check each provider's pricing page before setting your own price per minute.

## Project layout

```
src/index.js         HTTP routes, webhooks, media WebSocket
src/session.js       one live call: audio in/out, turn-taking, barge-in, silence handling
src/agent.js         Claude conversation + mid-call tools
src/speech.js        ElevenLabs speech-to-text and text-to-speech (8 kHz mu-law)
src/audio.js         mu-law decoding, WAV, voice activity detection
src/telephony/       Twilio and Plivo adapters
src/calls.js         start calls, provider status updates
src/campaigns.js     bulk calling scheduler with retries
src/postcall.js      summary, outcome, webhook
src/builder.js       "Build my employee" from a description
public/index.html    dashboard
```

Data is kept in `data/db.json`. That is fine for one server. Move to Postgres before running several servers.
