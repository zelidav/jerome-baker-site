/* Site-wide feedback button.
 * Drop-in: <script src="js/feedback.js" defer></script> (relative path per page)
 * On send it emails the feedback plus exactly where the person was on the site
 * (page, tab, section in view, element under the screen centre, scroll position,
 * selected text, device). Delivery is the JB app's /api/leads (saved to the lead
 * list, then emailed through Resend); ENDPOINT below.
 */
(function () {
  if (window.__jbFeedback) return;
  window.__jbFeedback = true;

  // the JB app's lead list (jbd-glass /api/leads): saved first, then emailed to David through Resend
  var ENDPOINT = "https://jbcustomer.cannacrypted.com/api/leads";

  function txt(el, n) {
    if (!el) return "";
    var s = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return s.length > (n || 120) ? s.slice(0, n || 120) + "…" : s;
  }

  function describe(el) {
    if (!el || el === document.body) return "";
    var parts = [];
    for (var i = 0; el && el !== document.body && i < 4; i++, el = el.parentElement) {
      var p = el.tagName.toLowerCase();
      if (el.id) { p += "#" + el.id; parts.unshift(p); break; }
      if (el.classList && el.classList.length) p += "." + Array.prototype.slice.call(el.classList, 0, 2).join(".");
      parts.unshift(p);
    }
    return parts.join(" > ");
  }

  // The last heading at or above the middle of the screen = the section they're reading.
  function sectionInView() {
    var mid = window.innerHeight / 2, best = null;
    var hs = document.querySelectorAll("h1,h2,h3,h4");
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.closest("#jbfb-root") || !h.offsetParent) continue;
      if (h.getBoundingClientRect().top <= mid) best = h; else break;
    }
    return best ? txt(best, 100) : "";
  }

  function capture() {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var center = document.elementFromPoint(cx, cy);
    var card = center && center.closest ? center.closest(".card,[data-id],section,article,tr") : null;
    var tab = document.querySelector(".tab.active");
    var docH = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    var sel = "";
    try { sel = String(window.getSelection() || "").trim().slice(0, 500); } catch (e) {}
    var sec = sectionInView(), anchor = "";
    for (var a = center; a && a !== document.body; a = a.parentElement) { if (a.id) { anchor = a.id; break; } }
    var base = location.origin + location.pathname + location.search;
    var link = sec ? base + "#:~:text=" + encodeURIComponent(sec.slice(0, 60).replace(/…$/, ""))
                   : base + (anchor ? "#" + anchor : location.hash);
    return {
      "Jump to the spot": link,
      "Page URL": location.href,
      "Page title": document.title,
      "Active tab": tab ? txt(tab.firstChild && tab.firstChild.nodeType === 3 ? { textContent: tab.firstChild.textContent } : tab, 80) : "",
      "Section in view": sec,
      "Element at screen centre": describe(center),
      "Block at screen centre": card ? txt(card.querySelector("h1,h2,h3,h4,.name,strong") || card, 140) : "",
      "Selected text": sel,
      "Scroll": Math.round(window.scrollY) + "px (" + Math.round(100 * window.scrollY / docH) + "% down)",
      "Viewport": window.innerWidth + "x" + window.innerHeight + " @" + (window.devicePixelRatio || 1) + "x",
      "Device": navigator.userAgent,
      "Referrer": document.referrer || "",
      "Local time": new Date().toString()
    };
  }

  var css = "" +
    "#jbfb-root{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    "#jbfb-root *{box-sizing:border-box;font-family:inherit}" +
    "#jbfb-btn{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:76;" +
      "min-height:44px;padding:0 14px;border:3px solid #111;border-radius:0;background:#fff;color:#111;font-size:13px;font-weight:800;" +
      "cursor:pointer;box-shadow:4px 4px 0 #111}" +
    "#jbfb-btn:hover{background:#FFF100}" +
    "body.has-dock #jbfb-btn{bottom:calc(92px + env(safe-area-inset-bottom))}" +
    "body.has-dock #jbfb-panel{bottom:calc(148px + env(safe-area-inset-bottom))}" +
    "#jbfb-panel{position:fixed;right:16px;bottom:68px;z-index:77;max-height:calc(100vh - 170px);overflow:auto;width:min(360px,calc(100vw - 32px));" +
      "background:#fff;color:#111;border:3px solid #111;border-radius:0;padding:14px;box-shadow:6px 6px 0 #111;display:none}" +
    "#jbfb-panel.open{display:block}" +
    "#jbfb-panel h4{margin:0 0 4px;color:#111;font-size:15px;font-weight:800}" +
    "#jbfb-where{font-size:12px;color:#555;margin:0 0 8px;line-height:1.4;word-break:break-word}" +
    "#jbfb-panel textarea,#jbfb-panel input{width:100%;font-size:16px;padding:9px 10px;border:1px solid #ccc;border-radius:8px;" +
      "color:#111;background:#fff;margin:0 0 8px;display:block}" +
    "#jbfb-panel textarea{min-height:110px;resize:vertical}" +
    "#jbfb-row{display:flex;gap:8px;justify-content:flex-end;align-items:center}" +
    "#jbfb-row button{border:0;border-radius:8px;padding:9px 14px;font-size:14px;font-weight:700;cursor:pointer}" +
    "#jbfb-cancel{background:#eee;color:#111}#jbfb-send{background:#2A3B8E;color:#fff}" +
    "#jbfb-send:disabled{opacity:.6;cursor:default}" +
    "#jbfb-mic{background:#fff;color:#111;border:2px solid #111 !important;padding:7px 12px !important;display:flex;align-items:center;gap:6px}" +
    "#jbfb-mic.on{background:#DA2342;color:#fff;border-color:#DA2342 !important;animation:jbfbpulse 1.2s ease-in-out infinite}" +
    "@keyframes jbfbpulse{50%{box-shadow:0 0 0 6px rgba(218,35,66,.25)}}" +
    "@media (prefers-reduced-motion:reduce){#jbfb-mic.on{animation:none}}" +
    "#jbfb-msg{font-size:13px;margin-right:auto;color:#555}#jbfb-msg.err{color:#B3122C}#jbfb-msg.ok{color:#1a7f37}" +
    "@media print{#jbfb-root{display:none}}";

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function init() {
    var style = el("style", {}, css);
    var root = el("div", { id: "jbfb-root" });
    var btn = el("button", { id: "jbfb-btn", type: "button", "aria-label": "Send feedback" }, "💬 Feedback");
    var panel = el("div", { id: "jbfb-panel", role: "dialog", "aria-label": "Send feedback" },
      "<h4>Send feedback</h4>" +
      "<div id='jbfb-where'></div>" +
      "<textarea id='jbfb-text' placeholder='What should change here?' maxlength='5000'></textarea>" +
      "<input id='jbfb-name' type='text' placeholder='Your name (optional)' maxlength='120'>" +
      "<div id='jbfb-row'><span id='jbfb-msg'></span>" +
      "<button id='jbfb-mic' type='button' aria-pressed='false' aria-label='Talk instead of typing' hidden>🎤 Talk</button>" +
      "<button id='jbfb-cancel' type='button'>Cancel</button>" +
      "<button id='jbfb-send' type='button'>Send</button></div>");
    root.appendChild(panel); root.appendChild(btn);
    document.head.appendChild(style); document.body.appendChild(root);

    var $ = function (id) { return document.getElementById(id); };
    var where = null;
    try { $("jbfb-name").value = localStorage.getItem("jbfb.name") || ""; } catch (e) {}

    function open() {
      where = capture(); // snapshot BEFORE the panel covers anything
      var loc = [where["Page title"], where["Active tab"], where["Section in view"]].filter(Boolean).join(" › ");
      $("jbfb-where").textContent = "📍 " + (loc || location.pathname) + " (we'll include where you are)";
      $("jbfb-msg").textContent = ""; $("jbfb-msg").className = "";
      panel.classList.add("open");
      $("jbfb-text").focus();
    }
    function close() { stopMic(); panel.classList.remove("open"); }

    // Talk instead of typing: the browser's own speech-to-text (Chrome, Edge, Safari, Android, iPhone).
    // Words land in the box as you speak; tap again to stop. Hidden where the browser can't do it (Firefox).
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false, baseText = "";
    var mic = $("jbfb-mic");
    function stopMic() { if (rec && listening) { try { rec.stop(); } catch (e) {} } }
    function setMic(on) {
      listening = on; mic.classList.toggle("on", on); mic.setAttribute("aria-pressed", on ? "true" : "false");
      mic.textContent = on ? "■ Stop" : "🎤 Talk";
    }
    if (SR) {
      mic.hidden = false;
      mic.addEventListener("click", function () {
        if (listening) { stopMic(); return; }
        rec = new SR();
        rec.lang = document.documentElement.lang || navigator.language || "en-US";
        // Android Chrome repeats words in continuous mode, so there it takes one sentence per tap
        rec.continuous = !/Android/i.test(navigator.userAgent); rec.interimResults = true;
        var ta = $("jbfb-text");
        baseText = ta.value.replace(/\s+$/, ""); if (baseText) baseText += " ";
        rec.onresult = function (e) {
          var fin = "", live = "";
          for (var i = 0; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) fin += t; else live += t;
          }
          ta.value = baseText + (fin + live).replace(/^\s+/, "");
          ta.scrollTop = ta.scrollHeight;
        };
        rec.onerror = function (e) {
          var m = $("jbfb-msg");
          if (e.error === "not-allowed" || e.error === "service-not-allowed") { m.textContent = "Mic is blocked. Allow it in the browser, or type."; m.className = "err"; }
          else if (e.error === "no-speech") { m.textContent = "Didn't hear anything."; m.className = "err"; }
        };
        rec.onend = function () { setMic(false); var m = $("jbfb-msg"); if (m.textContent === "Listening…") m.textContent = ""; };
        try { rec.start(); setMic(true); $("jbfb-msg").textContent = "Listening…"; $("jbfb-msg").className = ""; }
        catch (err) { setMic(false); }
      });
    }

    btn.addEventListener("click", function () { panel.classList.contains("open") ? close() : open(); });
    // Keep the text selection if they highlighted something before clicking.
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    $("jbfb-cancel").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    $("jbfb-send").addEventListener("click", function () {
      stopMic();
      var msg = $("jbfb-text").value.trim(), name = $("jbfb-name").value.trim();
      var m = $("jbfb-msg");
      if (!msg) { m.textContent = "Type or talk first."; m.className = "err"; return; }
      try { localStorage.setItem("jbfb.name", name); } catch (e) {}
      // where it was left goes into the message too, so the email says exactly which spot
      var spot = [];
      for (var k in where) if (where[k]) spot.push(k + ": " + where[k]);
      var payload = {
        lead_type: "feedback",
        name: name || "(anonymous)",
        message: msg + (spot.length ? "\n\n" + spot.join("\n") : ""),
        source_page: location.href,
        where: where
      };
      var send = $("jbfb-send");
      send.disabled = true; m.textContent = "Sending…"; m.className = "";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error(res.j.error || "send failed");
          m.textContent = "Thanks! Sent."; m.className = "ok";
          $("jbfb-text").value = "";
          setTimeout(close, 1400);
        })
        .catch(function () {
          m.textContent = "Couldn't send. Try again in a moment."; m.className = "err";
        })
        .then(function () { send.disabled = false; });
    });
  }

  // after the first screen is drawn, when the browser is idle
  var later = function () { ("requestIdleCallback" in window) ? requestIdleCallback(init, { timeout: 3000 }) : setTimeout(init, 400); };
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
})();
