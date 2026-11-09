# DevInventor

Website for **DevInventor** – custom embedded systems & IoT project services.

## Features
- **Home page** – services, how it works, pricing, contact, floating WhatsApp button
- **Login / Sign up** – built into the project page; customers must log in before submitting a project
- **Project request form** – customer details, project category, board, connectivity, deliverables, sensors, description, budget, deadline (drafts auto-save)
- **PhonePe / UPI payment** – booking advance via "Pay with PhonePe" button (opens the PhonePe app on mobile), or any UPI app; customer enters the UTR/transaction ID
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
upiId: "yourname@ybl",          // your PhonePe UPI ID
advanceOptions: [499, 999, 1999, 4999],
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
- Payments go directly to your UPI ID. Verify the UTR ID in your PhonePe app before starting work. The official PhonePe Payment Gateway (automatic confirmation) needs a PhonePe Business merchant account and a server.
