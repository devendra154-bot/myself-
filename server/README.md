# DevInventor Voice: AI telecaller backend

This server makes and answers real phone calls. An AI telecaller speaks Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi or English.

```
Caller's phone ⇄ Plivo / Twilio ⇄ this server ⇄ ElevenLabs or Sarvam AI (hears + speaks)
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
- **WhatsApp bot:** answers your WhatsApp Business number 24/7 and alerts you when a human is needed (see below).
- **Compliance:** calls only between 09:00 and 21:00 IST, honours "don't call me again" (never calls that number again), and the AI says it is an AI if asked.

## What you need (accounts and keys)

| Service | Why | Where |
|---|---|---|
| **Plivo** (recommended for India) or **Twilio** | Phone numbers and calling | plivo.com / twilio.com |
| **Anthropic API key** | Claude, the conversation brain | console.anthropic.com |
| **ElevenLabs** or **Sarvam AI** API key | Voices and speech recognition | elevenlabs.io / sarvam.ai |
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

## WhatsApp auto-reply bot

The same server can answer your WhatsApp Business number 24/7 using the official Meta WhatsApp Cloud API.

```
Customer ⇄ WhatsApp ⇄ Meta ⇄ /whatsapp/webhook ⇄ Claude (reads whatsapp-knowledge.md)
                                       │
                         needs a human? ▼
               alert to your personal WhatsApp + email + webhook
```

**What it does**

- Replies in friendly English to project inquiries, Notes users, telecaller clients, Instagram followers and personal contacts. Answers come from `whatsapp-knowledge.md`.
- If someone writes 3 messages quickly, it waits a moment and sends one answer.
- **Escalates** when a person must act: orders, final quotes, payments, complaints, "talk to a human", urgent personal messages or authorities, photos and voice notes it can't read. The customer is told you'll reply, and you get an alert on WhatsApp, by email and on the outcome webhook.
- **You answer from your own phone.** Swipe-reply to an alert and your text goes to the customer from the business number. The bot then stays quiet in that chat, and their new messages are forwarded to you.
- **Owner commands** (send to the bot from a number in `ESCALATION_WHATSAPP`):
  - `#reply 9876543210 message`
  - `#pause 9876543210`
  - `#resume 9876543210`
  - `#chats`
  - `#bot` (shows whether auto-reply is on)
- **Safety:** checks Meta's signature on every webhook, ignores duplicate deliveries, never asks for OTPs or bank details, admits it's an AI if asked, and stops replying after 20 replies an hour to one chat (bot loops, spam).

**Change what it knows:** edit `whatsapp-knowledge.md` (prices, services, links, FAQs). It's re-read on the next message, so no restart is needed. This repo is public, so don't put secrets in it.

### Try it before going live

```bash
npm start                      # in one terminal
node scripts/wa-chat.js        # in another: chat as a customer, nothing is sent
```

The client shows each reply, its category and whether it would alert you. To test the deployed server instead:

```bash
SERVER=https://<your-app>.onrender.com ADMIN_TOKEN=<token> node scripts/wa-chat.js
```

### Set up on Meta (about 30 minutes)

1. **Create the app.** Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create app**, choose the WhatsApp / business use case, and link your Meta Business account.
2. **Add your number.** Go to **WhatsApp → API Setup → Add phone number**, then verify it by SMS or call.
   - A number registered on the API can't stay on the normal WhatsApp or WhatsApp Business app.
   - Back up the chats, then delete the WhatsApp account on the phone (**Settings → Account → Delete account**) before adding the number.
   - Some WhatsApp providers now offer "coexistence" (app and API on one number). If you need to keep the app, ask about that before deleting.
   - Meta's free test number is fine for a first trial.
3. **Copy the Phone number ID** from API Setup into `WHATSAPP_PHONE_NUMBER_ID`.
4. **Create a permanent token.** In **Business Settings → Users → System users**, add a system user, give it the app and your WhatsApp account, then **Generate token** with `whatsapp_business_messaging` and `whatsapp_business_management`. Put it in `WHATSAPP_TOKEN`. The token on the API Setup page expires in 24 hours.
5. **Copy the App secret.** **App settings → Basic → App secret** goes into `WHATSAPP_APP_SECRET`.
6. **Connect the webhook.** In **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://<your-app>.onrender.com/whatsapp/webhook`
   - Verify token: the value of `WHATSAPP_VERIFY_TOKEN` (Render generates one; copy it from the Environment tab)
   - Click **Verify and save**, then **Manage** and subscribe to **messages**.
7. **Set up alerts.**
   - `ESCALATION_WHATSAPP`: your personal number, which must be different from the bot's number.
   - `ESCALATION_EMAIL` and `RESEND_API_KEY`: optional email alerts.
   - `BOT_OWNER_NAME`: the name the bot uses for you.
8. **Optional: alerts after 24 hours of silence.** WhatsApp only lets a business send free text to someone who messaged it in the last 24 hours, and that includes you. Either message the bot once a day, or set up a template:
   - In **WhatsApp Manager → Message templates**, create a *Utility* template named `owner_alert` with the body `New WhatsApp message needs you: {{1}}`.
   - Set `WHATSAPP_ESCALATION_TEMPLATE=owner_alert`.
   - Email alerts work without any of this.
9. **Go live.** Finish Meta business verification and display-name approval, and switch the app to **Live**.
10. **Test it.** Message the number from another phone. `GET /health` and `GET /api/whatsapp/status` list any missing settings.

**Cost:**
- Replies within 24 hours of a customer's message are free on the Cloud API.
- Template messages are charged per message.
- Each AI reply costs a little Claude usage. Sonnet is the default; set `WHATSAPP_MODEL=claude-haiku-5-5` for cheaper replies.
- Check Meta's current pricing page for exact rates.

**Admin API** (Bearer `ADMIN_TOKEN`):
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/chats`
- `GET /api/whatsapp/chats/:phone`
- `POST /api/whatsapp/chats/:phone/reply` with `{"text":"…"}`
- `POST /api/whatsapp/chats/:phone/pause`
- `POST /api/whatsapp/chats/:phone/resume`
- `POST /api/whatsapp/simulate`

## Pricing plans

Each AI employee is on one plan. Customers pay per connected minute, billed per second. Unanswered calls are free. Prices exclude GST.

| Plan | Price / min | Claude model | Good for |
|---|---|---|---|
| Basic | ₹4.5 | Claude Haiku 5.5 | Reminders, confirmations, COD checks |
| Standard | ₹6 | Claude Sonnet 5.5 | Lead qualification, support, bookings |
| Premium | ₹8 | Claude Opus 5.5 | Loans, insurance, complex or high-value sales |

The phone line and voice are the same on every plan; only the "brain" changes. With the default cost settings, a typical minute (AI speaking about half the time) costs you about:

| Plan | Phone | Voice | Listening | AI | Est. cost | Margin |
|---|---|---|---|---|---|---|
| Basic | ₹0.60 | ₹1.98 | ₹0.29 | ₹0.05 | **₹2.92** | ₹1.58 |
| Standard | ₹0.60 | ₹1.98 | ₹0.29 | ~₹1.00 | **₹3.87** | ₹2.13 |
| Premium | ₹0.60 | ₹1.98 | ₹0.29 | ~₹2.30 | **₹5.17** | ₹2.83 |

These are estimates. A pricier ElevenLabs plan, long calls or a talkative AI cost more. Watch the real margin on the dashboard for the first weeks and adjust prices if needed.

Change prices or models with `PRICE_BASIC`, `PRICE_STANDARD`, `PRICE_PREMIUM`, `CLAUDE_MODEL_BASIC`, `CLAUDE_MODEL_STANDARD` and `CLAUDE_MODEL`.

Every finished call stores `billing`: seconds, rate, price, estimated cost by part, and margin. The dashboard's Calls page shows each call's charge and 30-day totals, and the outcome webhook includes it. Set the `COST_*` values to the rates on your invoices so the margin is accurate.

## Voice provider: ElevenLabs or Sarvam AI

Set `VOICE_PROVIDER` to choose who hears the caller and speaks the AI's replies. You need only one key.

| | ElevenLabs (`elevenlabs`, default) | Sarvam AI (`sarvam`) |
|---|---|---|
| Hearing | Scribe | Saaras v4 (`codemix` mode keeps English words in English, good for Hinglish and Tenglish) |
| Voice | Any ElevenLabs voice or clone | Bulbul: 37 Indian voices on `bulbul:v3`, or 200+ persona voices on `bulbul:v4-flash` |
| Languages | Many | Built for Indian languages: Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi and Indian English |
| Key setting | `ELEVENLABS_API_KEY` | `SARVAM_API_KEY` |

**Switch to Sarvam:**
1. Set `VOICE_PROVIDER=sarvam` and `SARVAM_API_KEY`.
2. Optionally pick a voice with `SARVAM_SPEAKER`, for example `priya`, `kavya`, `rahul` or `kavitha`, and a speed with `SARVAM_PACE`.
3. Restart the server.

The dashboard's voice list then shows Sarvam voices. Agents that still hold an ElevenLabs voice id use the default Sarvam voice until you pick one.

**Hear it before calling anyone:**

```bash
node scripts/voice-check.js                     # Telugu sample
node scripts/voice-check.js hi                  # Hindi sample
node scripts/voice-check.js en "Hello!" priya   # your own text and voice
```

It speaks the sentence through your provider and saves a phone-quality `voice-check-*.wav` for you to play. Then it transcribes the audio back and shows how fast both steps were.

**Costs:** set `COST_TTS_USD_PER_1K_CHARS` and `COST_STT_USD_PER_HOUR` to your provider's rates (from its pricing page or invoice) so the per-call margin on the dashboard stays accurate.

## Tuning

- **Faster replies:** `CLAUDE_EFFORT=low` (default). `CLAUDE_SPEED=fast` is faster again but costs twice as much. `ELEVENLABS_TTS_MODEL=eleven_flash_v2_5` is the fastest voice model.
- **Better Telugu, Kannada, Malayalam or Marathi pronunciation:** try `ELEVENLABS_TTS_MODEL=eleven_v3` or an Indian voice from the ElevenLabs voice library.
- **Interruptions:** `VAD_BARGE_IN_MS` sets how long the caller must talk over the AI before it stops (default 250 ms). On noisy lines, raise `VAD_THRESHOLD`.
- **Lower your cost:** speech is the biggest cost. Shorter replies (already the default) and cheaper voice providers help most. Buying phone minutes in bulk lowers the line cost.

## Project layout

```
src/index.js         HTTP routes, webhooks, media WebSocket
src/session.js       one live call: audio in/out, turn-taking, barge-in, silence handling
src/agent.js         Claude conversation + mid-call tools
src/speech.js        speech-to-text and text-to-speech, ElevenLabs or Sarvam AI (8 kHz mu-law)
scripts/voice-check.js  test your voice provider with a real sentence
src/audio.js         mu-law decoding, WAV, voice activity detection
src/telephony/       Twilio and Plivo adapters
src/calls.js         start calls, provider status updates
src/campaigns.js     bulk calling scheduler with retries
src/postcall.js      summary, outcome, webhook
src/builder.js       "Build my employee" from a description
src/whatsapp.js      WhatsApp auto-reply bot, escalation alerts, owner commands
whatsapp-knowledge.md what the WhatsApp bot knows (edit this)
scripts/wa-chat.js   chat with the WhatsApp bot in your terminal
public/index.html    dashboard
```

Data is kept in `data/db.json`. That is fine for one server. Move to Postgres before running several servers.
