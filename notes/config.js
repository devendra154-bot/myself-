// DevInventor Notes settings.
// Everything works for free in the browser today. When you are ready to add real
// AI summaries, put your AI server address here and the app can use it.
window.NOTES_CONFIG = {
  aiEndpoint: "",
  // Admin who posts courses (see admin.html). Publishing itself needs this account's GitHub login.
  adminEmail: "2465devendra@gmail.com",
  // Where courses.json lives on GitHub (used by the admin page's "Save to GitHub" button).
  repo: "devendra154-bot/myself-",
  branch: "main",
  coursesPath: "notes/courses/courses.json",
};
