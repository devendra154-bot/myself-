(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WHATSAPP = "919618428273";

  const LANGS = [
    { key: "hi", native: "हिन्दी", name: "Hindi", code: "hi-IN", hello: "नमस्ते" },
    { key: "te", native: "తెలుగు", name: "Telugu", code: "te-IN", hello: "నమస్కారం" },
    { key: "ta", native: "தமிழ்", name: "Tamil", code: "ta-IN", hello: "வணக்கம்" },
    { key: "kn", native: "ಕನ್ನಡ", name: "Kannada", code: "kn-IN", hello: "ನಮಸ್ಕಾರ" },
    { key: "ml", native: "മലയാളം", name: "Malayalam", code: "ml-IN", hello: "നമസ്കാരം" },
    { key: "mr", native: "मराठी", name: "Marathi", code: "mr-IN", hello: "नमस्कार" },
    { key: "en", native: "English", name: "English", code: "en-IN", hello: "Hello" },
  ];

  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove("show"), 2800);
  };

  /* ---------- scroll progress + reveal ---------- */
  const prog = $("#progress");
  addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (scrollY / h) * 100 + "%";
  }, { passive: true });
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  const observe = () => $$(".reveal:not(.in)").forEach((el) => io.observe(el));
  observe();

  /* ---------- nav ---------- */
  $("#burger").onclick = () => $("#navLinks").classList.toggle("open");
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    if (a.dataset.tab) setEmp(+a.dataset.tab);
  }));
  $("#yr").textContent = new Date().getFullYear();
  if (window.DEVINVENTOR_API) {
    const dash = window.DEVINVENTOR_API.replace(/\/$/, "") + "/dashboard/";
    $$("a.signin, .nav-right a.btn-brand, .cta-btns a.btn-white").forEach((a) => (a.href = dash));
  }

  /* ---------- hero greeting ---------- */
  let gi = 0;
  setInterval(() => {
    const g = $("#greet");
    g.style.opacity = 0;
    setTimeout(() => { gi = (gi + 1) % LANGS.length; g.textContent = LANGS[gi].hello; g.style.opacity = 1; }, 300);
  }, 2200);

  /* ---------- builder ---------- */
  let builderLang = LANGS[0];
  const langMenu = $("#langMenu");
  langMenu.innerHTML = LANGS.map((l, i) => `<button data-i="${i}">${l.name} <span style="color:#a0a0ac">· ${l.native}</span></button>`).join("");
  $("#langBtn").onclick = (e) => { e.stopPropagation(); langMenu.classList.toggle("open"); };
  langMenu.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    builderLang = LANGS[+b.dataset.i];
    $("#langBtn").firstChild.textContent = builderLang.name + " ";
    langMenu.classList.remove("open");
  };
  document.addEventListener("click", () => langMenu.classList.remove("open"));

  const task = $("#task");
  const examples = [
    "e.g. Remind customers whose EMI is due this week, and note who promises to pay.",
    "e.g. Call policies renewing this month and ask who wants to renew.",
    "e.g. Call every new property lead and book a site visit.",
  ];
  let ei = 0, ci = 0, del = false;
  (function type() {
    const s = examples[ei];
    if (!del) { ci++; if (ci > s.length) { del = true; return setTimeout(type, 1800); } }
    else { ci -= 2; if (ci <= 3) { del = false; ei = (ei + 1) % examples.length; ci = 3; } }
    task.placeholder = s.slice(0, ci);
    setTimeout(type, del ? 18 : 40);
  })();

  $$(".chip").forEach((c) => c.onclick = () => { task.value = c.dataset.t; task.focus(); });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  $("#voiceBtn").onclick = () => {
    if (!SR) return toast("Voice input isn't supported in this browser. Try Chrome.");
    const btn = $("#voiceBtn");
    if (rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = builderLang.code;
    rec.interimResults = true;
    const base = task.value ? task.value + " " : "";
    rec.onresult = (e) => { task.value = base + [...e.results].map((r) => r[0].transcript).join(" "); };
    rec.onend = () => { btn.classList.remove("rec"); rec = null; };
    rec.onerror = () => toast("Couldn't hear you. Please allow microphone access.");
    btn.classList.add("rec");
    rec.start();
    toast(`Listening in ${builderLang.name}…`);
  };

  $("#buildBtn").onclick = () => {
    const t = task.value.trim();
    if (!t) { task.focus(); return toast("Tell us what your AI telecaller should do first."); }
    const msg = `Hi DevInventor! I want to build an AI telecaller.\n\nLanguage: ${builderLang.name}\nTask: ${t}`;
    open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  /* ---------- tabs helper ---------- */
  const makeTabs = (el, onPick) => {
    el.innerHTML = LANGS.map((l, i) => `<button class="${i ? "" : "active"}" data-i="${i}">${l.native}</button>`).join("");
    el.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      $$("button", el).forEach((x) => x.classList.toggle("active", x === b));
      onPick(LANGS[+b.dataset.i]);
    };
  };

  /* ---------- how it works: live call demo ---------- */
  const SCRIPTS = {
    hi: [
      ["ai", "नमस्ते अमन जी! मैं Meera, Nest Realty से। आपने Sector 150 के 2BHK के लिए enquiry की थी। दो मिनट बात कर सकते हैं?"],
      ["user", "हाँ जी, बोलिए।", 0],
      ["ai", "रहने के लिए देख रहे हैं, या investment के लिए?"],
      ["user", "रहने के लिए। Budget लगभग 90 लाख है।", 1, 2],
      ["ai", "बढ़िया। इस Saturday 11 बजे site visit रख दूँ? Location मैं WhatsApp कर देती हूँ।"],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "हाँ, कर दीजिए।", 3],
    ],
    te: [
      ["ai", "నమస్కారం అమన్ గారు! నేను Meera, Nest Realty నుండి. మీరు Sector 150 లో 2BHK కోసం enquiry చేశారు. రెండు నిమిషాలు మాట్లాడగలరా?"],
      ["user", "అవును, చెప్పండి.", 0],
      ["ai", "ఉండటానికా, లేక investment కోసమా?"],
      ["user", "ఉండటానికి. Budget సుమారు 90 లక్షలు.", 1, 2],
      ["ai", "చాలా బాగుంది. ఈ Saturday 11 గంటలకు site visit పెట్టనా? Location WhatsApp చేస్తాను."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "సరే, పంపండి.", 3],
    ],
    ta: [
      ["ai", "வணக்கம் அமன்! நான் Meera, Nest Realty-இலிருந்து. Sector 150 2BHK பற்றி enquiry செய்தீர்கள். இரண்டு நிமிடம் பேசலாமா?"],
      ["user", "ஆமாம், சொல்லுங்கள்.", 0],
      ["ai", "குடியிருக்கவா, investment-க்கா?"],
      ["user", "குடியிருக்க. Budget சுமார் 90 லட்சம்.", 1, 2],
      ["ai", "அருமை. இந்த Saturday 11 மணிக்கு site visit வைக்கலாமா? Location WhatsApp-ல் அனுப்புகிறேன்."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "சரி, அனுப்புங்கள்.", 3],
    ],
    kn: [
      ["ai", "ನಮಸ್ಕಾರ ಅಮನ್ ಅವರೇ! ನಾನು Meera, Nest Realty ಇಂದ. Sector 150 2BHK ಬಗ್ಗೆ enquiry ಮಾಡಿದ್ದೀರಿ. ಎರಡು ನಿಮಿಷ ಮಾತಾಡಬಹುದಾ?"],
      ["user", "ಹೌದು, ಹೇಳಿ.", 0],
      ["ai", "ವಾಸಕ್ಕಾ, investment ಗಾ?"],
      ["user", "ವಾಸಕ್ಕೆ. Budget ಸುಮಾರು 90 ಲಕ್ಷ.", 1, 2],
      ["ai", "ಒಳ್ಳೆಯದು. ಈ Saturday 11 ಗಂಟೆಗೆ site visit ಇಡಲಾ? Location WhatsApp ಮಾಡುತ್ತೇನೆ."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "ಸರಿ, ಕಳುಹಿಸಿ.", 3],
    ],
    ml: [
      ["ai", "നമസ്കാരം അമൻ! ഞാൻ Meera, Nest Realty-യിൽ നിന്ന്. Sector 150 2BHK-ക്ക് enquiry ചെയ്തിരുന്നു. രണ്ട് മിനിറ്റ് സംസാരിക്കാമോ?"],
      ["user", "ശരി, പറയൂ.", 0],
      ["ai", "താമസിക്കാനാണോ, investment-നാണോ?"],
      ["user", "താമസിക്കാൻ. Budget ഏകദേശം 90 ലക്ഷം.", 1, 2],
      ["ai", "നല്ലത്. ഈ Saturday 11 മണിക്ക് site visit വെക്കട്ടെ? Location WhatsApp ചെയ്യാം."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "ശരി, അയക്കൂ.", 3],
    ],
    mr: [
      ["ai", "नमस्कार अमनजी! मी Meera, Nest Realty मधून. तुम्ही Sector 150 मधील 2BHK साठी enquiry केली होती. दोन मिनिटं बोलू शकतो का?"],
      ["user", "हो, बोला.", 0],
      ["ai", "राहण्यासाठी बघताय की investment साठी?"],
      ["user", "राहण्यासाठी. Budget साधारण 90 लाख.", 1, 2],
      ["ai", "छान. या Saturday 11 वाजता site visit ठेवू का? Location मी WhatsApp करते."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "हो, करा.", 3],
    ],
    en: [
      ["ai", "Hi Aman! This is Meera from Nest Realty. You enquired about a 2BHK in Sector 150. Do you have two minutes?"],
      ["user", "Yes, go ahead.", 0],
      ["ai", "Are you looking to live there, or as an investment?"],
      ["user", "To live in. Budget is around 90 lakh.", 1, 2],
      ["ai", "Great. Shall I book a site visit this Saturday at 11? I'll WhatsApp you the location."],
      ["sys", "📍 Location sent on WhatsApp"],
      ["user", "Yes, please.", 3],
    ],
  };
  const chat = $("#chat"), fields = $$(".fields p"), integ = $$(".integr>div");
  const fieldVals = fields.map((f) => f.textContent);
  let demoTimers = [], clock = null;
  const runDemo = (lang) => {
    demoTimers.forEach(clearTimeout); demoTimers = []; clearInterval(clock);
    chat.innerHTML = "";
    fields.forEach((f) => { f.textContent = "Listening…"; f.className = "wait"; });
    integ.forEach((d, i) => { d.classList.remove("on"); $("small", d).textContent = i ? "After the call" : "Waiting"; });
    $("#summary").textContent = "Summary is written the moment the call ends.";
    $("#summary").classList.remove("done");
    $("#langTag").textContent = lang.key === "en" ? "English" : `${lang.name} + English`;
    const status = $("#callStatus"); status.classList.remove("done");
    let sec = 0;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    clock = setInterval(() => { sec++; $("#callTime").textContent = fmt(sec); status.innerHTML = `<em></em> On call · ${fmt(sec)}`; }, 1000);
    let t = 600;
    SCRIPTS[lang.key].forEach(([who, text, ...f]) => {
      demoTimers.push(setTimeout(() => {
        const m = document.createElement("div");
        m.className = "msg " + who; m.textContent = text; chat.appendChild(m);
        const fits = () => [...chat.children].reduce((h, c) => h + c.offsetHeight + 8, 0) <= chat.clientHeight;
        while (!fits() && chat.children.length > 1) chat.firstChild.remove();
        f.forEach((n) => { fields[n].textContent = fieldVals[n]; fields[n].className = "got"; });
        if (who === "sys") { integ[0].classList.add("on"); $("small", integ[0]).textContent = "Location sent mid-call"; }
      }, t));
      t += who === "ai" ? 3200 : 2000;
    });
    demoTimers.push(setTimeout(() => {
      clearInterval(clock);
      status.classList.add("done"); status.innerHTML = "<em></em> Site visit booked";
      $("#summary").textContent = "Wants a 2BHK in Sector 150, Noida to live in, around ₹90L. Site visit booked for Saturday 11 AM; location sent on WhatsApp.";
      $("#summary").classList.add("done");
      integ[1].classList.add("on"); $("small", integ[1]).textContent = "Row added";
      integ[2].classList.add("on"); $("small", integ[2]).textContent = "Lead updated";
    }, t));
    demoTimers.push(setTimeout(() => runDemo(lang), t + 6000));
  };
  let demoLang = LANGS[0], demoStarted = false;
  makeTabs($("#howTabs"), (l) => { demoLang = l; runDemo(l); });
  new IntersectionObserver((es, o) => {
    if (es[0].isIntersecting && !demoStarted) { demoStarted = true; runDemo(demoLang); o.disconnect(); }
  }, { threshold: 0.3 }).observe($(".how-grid"));

  /* ---------- voices ---------- */
  const VOICES = [
    ["Loans & insurance", "1:10", "Screens eligibility and chases documents", "Sneha", "P02", "Outbound"],
    ["Real estate", "1:10", "Qualifies a property lead and books a site visit", "Neha", "P01", "Outbound"],
    ["Coaching", "1:12", "Explains batches and fees, books a demo class", "Ankit", "P09", "Outbound"],
    ["Hospitals", "1:12", "Answers a patient and books an appointment", "Pooja", "P02", "Inbound"],
    ["Car dealership", "1:09", "Follows up an enquiry and books a test drive", "Rahul", "P07", "Outbound"],
    ["E-commerce", "1:07", "Confirms a cash-on-delivery order", "Kavya", "P06", "Outbound"],
    ["Restaurants", "1:11", "Takes a table or party booking", "Riya", "P06", "Inbound"],
    ["Recruitment", "1:00", "Screens a candidate's notice period and salary", "Vishal", "P09", "Outbound"],
  ];
  const SAMPLE = {
    hi: "नमस्ते! मैं DevInventor की ओर से बात कर रही हूँ। क्या आपके पास दो मिनट हैं?",
    te: "నమస్కారం! నేను DevInventor నుండి మాట్లాడుతున్నాను. మీకు రెండు నిమిషాలు ఉన్నాయా?",
    ta: "வணக்கம்! நான் DevInventor-இலிருந்து பேசுகிறேன். உங்களுக்கு இரண்டு நிமிடம் இருக்கிறதா?",
    kn: "ನಮಸ್ಕಾರ! ನಾನು DevInventor ಇಂದ ಮಾತಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮಗೆ ಎರಡು ನಿಮಿಷ ಇದೆಯಾ?",
    ml: "നമസ്കാരം! ഞാൻ DevInventor-ൽ നിന്നാണ് വിളിക്കുന്നത്. രണ്ട് മിനിറ്റ് സംസാരിക്കാമോ?",
    mr: "नमस्कार! मी DevInventor मधून बोलत आहे. तुमच्याकडे दोन मिनिटं आहेत का?",
    en: "Hello! I'm calling from DevInventor. Do you have two minutes?",
  };
  let voiceLang = LANGS[0], playing = null, waveTimer = null;
  const grid = $("#voiceGrid");
  const stopPlay = () => {
    if (window.speechSynthesis) speechSynthesis.cancel();
    clearInterval(waveTimer);
    if (playing) { playing.classList.remove("playing"); $(".pbtn", playing).textContent = "▶"; $$(".wave i", playing).forEach((i) => i.classList.remove("p")); }
    playing = null;
  };
  const renderVoices = () => {
    stopPlay();
    grid.innerHTML = VOICES.map(([ind, dur, desc, name, id, dir], n) => {
      const bars = Array.from({ length: 40 }, (_, i) => `<i style="height:${20 + Math.abs(Math.sin(i * 1.7 + n) * 70) + (i * 37 % 13)}%"></i>`).join("");
      return `<div class="vcard reveal" data-n="${n}">
        <div class="vtop"><span>${ind}</span><span>${dur}</span></div>
        <h5>${desc}</h5>
        <div class="vmeta"><span class="vav">${name[0]}</span>${name}<em>· Voice ${id}</em><span class="vdir">✆ ${dir}</span></div>
        <div class="vplay"><button class="pbtn" aria-label="Play ${name}">▶</button><div class="wave">${bars}</div></div>
      </div>`;
    }).join("");
    observe();
  };
  grid.onclick = (e) => {
    const b = e.target.closest(".pbtn"); if (!b) return;
    const card = b.closest(".vcard");
    if (playing === card) return stopPlay();
    stopPlay();
    playing = card; card.classList.add("playing"); b.textContent = "❚❚";
    const bars = $$(".wave i", card); let k = 0;
    waveTimer = setInterval(() => { if (k < bars.length) bars[k++].classList.add("p"); else stopPlay(); }, 90);
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(SAMPLE[voiceLang.key]);
      u.lang = voiceLang.code; u.rate = 0.95;
      const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(voiceLang.code.slice(0, 2)));
      if (v) u.voice = v;
      u.onend = () => { if (playing === card) stopPlay(); };
      speechSynthesis.speak(u);
    }
  };
  makeTabs($("#voiceTabs"), (l) => { voiceLang = l; renderVoices(); });
  renderVoices();

  /* ---------- same employee ---------- */
  const EMP = [
    { h: "A new lead comes in. She calls within 30 seconds.", li: ["Connects Meta ads, website forms and Sheets", "Qualifies, books and sends details mid-call", "Summary and outcome in your CRM"], link: "Explore instant leads",
      panel: `<h4>New lead · Meta ad</h4><p class="cmeta">Priya Sharma · +91 99••• ••482 · Pune</p>
        <div class="row"><span>Lead received</span><span>10:42:05</span></div><div class="bar"><i style="width:100%;background:var(--brand-500)"></i></div>
        <div class="row"><span>AI telecaller dialling</span><span>10:42:28</span></div><div class="bar"><i style="width:100%;background:var(--ok)"></i></div>
        <div class="stats"><div class="stat"><small><i style="background:var(--ok)"></i>Time to call</small><b>23s</b></div><div class="stat"><small><i style="background:var(--info)"></i>Outcome</small><b style="font-size:17px">Demo booked</b></div></div>` },
    { h: "Hand over the list. Get back the interested ones.", li: ["As many calls at once as you have channels", "Calling hours, pacing and auto-retry", "Edit settings while it's running"], link: "Explore bulk campaigns",
      panel: `<div style="display:flex;justify-content:space-between;align-items:start;gap:10px"><div><h4>Festive offer · past enquiries</h4><p class="cmeta">1,240 contacts · 10:00–19:00 · Hindi + English</p></div><span class="tag">12 calls at a time</span></div>
        <div class="row"><span><b>768</b> of 1,240 called</span><span>~43 min left</span></div>
        <div class="bar"><i style="width:8%;background:var(--ok)"></i><i style="width:11%;background:var(--info)"></i><i style="width:17%;background:#d4d4dc"></i><i style="width:26%;background:#ecdcb4"></i></div>
        <div class="stats">
          <div class="stat"><small><i style="background:var(--ok)"></i>Interested</small><b>96</b><em>13%</em></div>
          <div class="stat"><small><i style="background:var(--info)"></i>Call back</small><b>141</b><em>18%</em></div>
          <div class="stat"><small><i style="background:#c9c9d1"></i>Not interested</small><b>212</b><em>28%</em></div>
          <div class="stat"><small><i style="background:#e6c98a"></i>No answer · retrying</small><b>319</b><em>42%</em></div>
        </div>` },
    { h: "Every call to your number, answered. Day and night.", li: ["Answers in your customer's language", "Books appointments and takes orders", "Transfers to your team when needed"], link: "Explore inbound",
      panel: `<div style="display:flex;justify-content:space-between;align-items:start"><div><h4>Incoming · +91 80••• ••100</h4><p class="cmeta">Today · 24/7 line · Telugu + English</p></div><span class="tag">Live</span></div>
        <div class="stats">
          <div class="stat"><small><i style="background:var(--ok)"></i>Answered</small><b>184</b><em>100%</em></div>
          <div class="stat"><small><i style="background:var(--info)"></i>Appointments</small><b>57</b><em>31%</em></div>
          <div class="stat"><small><i style="background:var(--brand-500)"></i>Transferred</small><b>12</b><em>7%</em></div>
          <div class="stat"><small><i style="background:#e6c98a"></i>After hours</small><b>43</b><em>23%</em></div>
        </div>` },
  ];
  const empTabs = $$("#empTabs button");
  const setEmp = (i) => {
    empTabs.forEach((b, j) => b.classList.toggle("active", i === j));
    const d = EMP[i], body = $("#empBody");
    body.style.animation = "none"; body.offsetHeight; body.style.animation = "";
    body.innerHTML = `<div><h3>${d.h}</h3><ul>${d.li.map((x) => `<li>${x}</li>`).join("")}</ul><a href="#build" class="link">${d.link} →</a></div>
      <div class="panel"><div class="panel-bar"><i></i><i></i><i></i><span class="logo sm">DEVINVENT<span>O</span>R</span><span class="slash">/</span><span>${["Leads", "Campaigns", "Inbound"][i]}</span><span class="status-dot done"><em></em> Running</span></div><div class="panel-body camp">${d.panel}</div></div>`;
  };
  empTabs.forEach((b, i) => b.onclick = () => setEmp(i));
  setEmp(1);
})();
