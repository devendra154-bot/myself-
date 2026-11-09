// Simple browser-based login (accounts are saved in this browser's localStorage).
// Good for a static site / GitHub Pages. For multi-device accounts, connect a backend
// such as Firebase Authentication later.
const Auth = (() => {
  const USERS_KEY = "di_users";
  const SESSION_KEY = "di_session";

  async function hash(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const users = () => JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  const saveUsers = u => localStorage.setItem(USERS_KEY, JSON.stringify(u));

  async function signup({ name, email, phone, password }) {
    email = email.trim().toLowerCase();
    const all = users();
    if (all[email]) throw new Error("An account with this email already exists. Please log in.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    all[email] = { name: name.trim(), email, phone: phone.trim(), pass: await hash(email + ":" + password) };
    saveUsers(all);
    startSession(all[email]);
  }

  async function login({ email, password }) {
    email = email.trim().toLowerCase();
    const u = users()[email];
    if (!u || u.pass !== await hash(email + ":" + password)) throw new Error("Wrong email or password.");
    startSession(u);
  }

  function startSession(u) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name: u.name, email: u.email, phone: u.phone }));
  }
  const current = () => JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  function logout() { localStorage.removeItem(SESSION_KEY); location.href = "index.html"; }

  function requireLogin() {
    if (!current()) location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop());
  }

  return { signup, login, logout, current, requireLogin };
})();

// Update nav on every page
document.addEventListener("DOMContentLoaded", () => {
  const slot = document.getElementById("nav-auth");
  if (!slot) return;
  const u = Auth.current();
  if (u) {
    slot.innerHTML = `<span class="hello">Hi, ${u.name.split(" ")[0].replace(/[<>&"]/g, "")}</span>
      <button class="btn btn-small btn-ghost" id="logoutBtn">Logout</button>`;
    document.getElementById("logoutBtn").onclick = Auth.logout;
  } else {
    slot.innerHTML = `<a class="btn btn-small" href="login.html">Login</a>`;
  }
  const toggle = document.getElementById("navToggle");
  if (toggle) toggle.onclick = () => document.querySelector(".nav-links").classList.toggle("open");
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  document.querySelectorAll("[data-wa-link]").forEach(el => el.href = "https://wa.me/" + DEVINVENTOR_CONFIG.whatsappNumber);
  document.querySelectorAll("[data-email]").forEach(el => { el.textContent = DEVINVENTOR_CONFIG.contactEmail; el.href = "mailto:" + DEVINVENTOR_CONFIG.contactEmail; });
  document.querySelectorAll("[data-phone]").forEach(el => el.textContent = DEVINVENTOR_CONFIG.contactPhone);
});
