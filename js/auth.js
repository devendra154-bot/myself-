// Simple browser-based login (accounts are saved in this browser).
// Good for a static site / GitHub Pages. For multi-device accounts, connect a backend
// such as Firebase Authentication later.

// ---- Safe storage: falls back to memory if the browser blocks localStorage ----
const Store = (() => {
  const mem = {};
  let ls = null;
  try { const t = "__di_t"; localStorage.setItem(t, "1"); localStorage.removeItem(t); ls = localStorage; } catch (_) {}
  return {
    get(k) { try { return JSON.parse((ls ? ls.getItem(k) : mem[k]) || "null"); } catch (_) { return null; } },
    set(k, v) { const s = JSON.stringify(v); try { ls ? ls.setItem(k, s) : (mem[k] = s); } catch (_) { mem[k] = s; } },
    del(k) { try { ls && ls.removeItem(k); } catch (_) {} delete mem[k]; },
  };
})();

// ---- Automatic WhatsApp alert to the site owner (CallMeBot) ----
function notifyOwner(text) {
  const C = DEVINVENTOR_CONFIG;
  if (!C.callmebotApiKey) return;
  const url = "https://api.callmebot.com/whatsapp.php?phone=" + C.whatsappNumber +
    "&apikey=" + encodeURIComponent(C.callmebotApiKey) + "&text=" + encodeURIComponent(text);
  try { fetch(url, { mode: "no-cors", keepalive: true }).catch(() => { new Image().src = url; }); }
  catch (_) { try { new Image().src = url; } catch (_) {} }
}

const Auth = (() => {
  const USERS_KEY = "di_users", SESSION_KEY = "di_session";

  // SHA-256 when available (HTTPS); simple fallback hash otherwise (e.g. plain http)
  async function hash(text) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (_) {}
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
    }
    return "f" + ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16));
  }
  const users = () => Store.get(USERS_KEY) || {};
  const cleanPhone = p => String(p || "").replace(/[^\d]/g, "").slice(-10);

  async function signup({ name, email, phone, password }) {
    name = (name || "").trim(); email = (email || "").trim().toLowerCase(); phone = cleanPhone(phone);
    if (!name) throw new Error("Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Please enter a valid email.");
    if (phone.length !== 10) throw new Error("Please enter a valid 10-digit mobile number.");
    if ((password || "").length < 6) throw new Error("Password must be at least 6 characters.");
    const all = users();
    if (all[email]) throw new Error("This email is already registered. Please use Login.");
    all[email] = { name, email, phone, pass: await hash(email + ":" + password) };
    Store.set(USERS_KEY, all);
    startSession(all[email]);
    notifyOwner(`🆕 *New sign-up – DevInventor*\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nTime: ${new Date().toLocaleString("en-IN")}`);
  }

  async function login({ email, password }) {
    email = (email || "").trim().toLowerCase();
    const u = users()[email];
    if (!u) throw new Error("No account found with this email on this device. Please Sign up first.");
    if (u.pass !== await hash(email + ":" + password)) throw new Error("Wrong password. Please try again.");
    startSession(u);
    notifyOwner(`🔐 *Customer login – DevInventor*\nName: ${u.name}\nPhone: ${u.phone}\nEmail: ${u.email}\nTime: ${new Date().toLocaleString("en-IN")}`);
  }

  const startSession = u => Store.set(SESSION_KEY, { name: u.name, email: u.email, phone: u.phone });
  const current = () => Store.get(SESSION_KEY);
  function logout() { Store.del(SESSION_KEY); location.reload(); }

  return { signup, login, logout, current };
})();

// Update nav on every page
document.addEventListener("DOMContentLoaded", () => {
  const C = DEVINVENTOR_CONFIG;
  const slot = document.getElementById("nav-auth");
  if (slot) {
    const u = Auth.current();
    if (u) {
      slot.innerHTML = `<span class="hello">Hi, ${u.name.split(" ")[0].replace(/[<>&"]/g, "")}</span>
        <button class="btn btn-small btn-ghost" id="logoutBtn">Logout</button>`;
      document.getElementById("logoutBtn").onclick = Auth.logout;
    } else {
      slot.innerHTML = `<a class="btn btn-small" href="request.html">Login</a>`;
    }
  }
  const toggle = document.getElementById("navToggle");
  if (toggle) toggle.onclick = () => document.querySelector(".nav-links").classList.toggle("open");
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  document.querySelectorAll("[data-wa-link]").forEach(el => el.href = "https://wa.me/" + C.whatsappNumber);
  document.querySelectorAll("[data-email]").forEach(el => { el.textContent = C.contactEmail; el.href = "mailto:" + C.contactEmail; });
  document.querySelectorAll("[data-insta]").forEach(el => { el.href = "https://instagram.com/" + C.instagram; if (!el.children.length) el.textContent = "@" + C.instagram; });
  document.querySelectorAll("[data-phone]").forEach(el => el.textContent = C.contactPhone);
});
