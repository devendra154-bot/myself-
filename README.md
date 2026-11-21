# DevInventor

Website for **DevInventor** – custom embedded systems & IoT project services.

## Features
- **Home page** – services, how it works, pricing, contact, floating WhatsApp button
- **Login / Sign up** – built into the project page; customers must log in before submitting a project
- **Project request form** – customer details, project category, board, connectivity, deliverables, sensors, description, budget, deadline (drafts auto-save)
- **Private coupon codes** – stored only as SHA-256 hashes in `js/config.js` (the code itself is never in the site)
- **Payment info** – shows the PhonePe number (9618705747); payment is arranged after the quote on WhatsApp
- **Send by WhatsApp** – all details are formatted and opened in WhatsApp to your number with one tap

## Automatic WhatsApp alerts to the owner
Every customer **sign-up, login and project request** sends an automatic WhatsApp message to the owner's number (via the free CallMeBot API). One-time setup:
1. Save **+34 644 66 32 62** in your phone contacts.
2. From your WhatsApp (9618428273) send it: `I allow callmebot to send me messages`
3. Paste the API key you receive into `callmebotApiKey` in `js/config.js`.

## Setup (required)
Edit `js/config.js`:
```js
whatsappNumber: "919618428273", // your WhatsApp: country code + number, digits only
phonepeNumber: "9618705747",    // PhonePe number shown to customers
contactEmail: "...", contactPhone: "...",
```

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Host free on GitHub Pages
Repo **Settings → Pages → Deploy from branch** → pick your branch and `/ (root)`.

## Notes
- Login is browser-based (accounts are stored in the visitor's browser via localStorage). It works on static hosting with no server; for accounts that work across devices, connect Firebase Authentication or a backend later.

## Mini Cinema (`/cinema/`)
A mini cinema in the browser: pick a film (built-in 1-minute animated short, your own video file, or a YouTube / .mp4 link), choose a seat, and the lights dim and curtains open. Seat position changes the screen size and angle, the room glows with the film's colours, and there are lights, popcorn and fullscreen controls (keys: Space, L, P, F, Esc). No server or login needed.

### Voice Studio (`/cinema/studio.html`)
Narrate the 10-part film **"The Last Ticket"**. For each part you can hear an AI voice (the browser's built-in voices, Indian English listed first, with speed and pitch controls) or record your own voice with the microphone. You can also edit the words, including writing them in Telugu or Hindi. Recordings stay in your browser (IndexedDB). Then press **Premiere** to watch it in the Mini Cinema with animated scenes, subtitles and music.
