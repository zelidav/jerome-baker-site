/* Lead forms on /join/ (B2C) and /wholesale/ (B2B).
 * Delivery is FormSubmit for now, the same short-term route the site's feedback button uses (js/feedback.js), so
 * there is no backend to deploy. Every submission carries the fields a future CRM module in the jbd-glass app needs
 * to ingest it as-is: lead_type (b2c|b2b), source_page, utm_*, referrer and an ISO timestamp.
 * Later: point ENDPOINT at a jbd-glass /api/leads route and keep the same field names.
 * Markup: <form class="lform" data-lead="b2c|b2b" data-subject="..."> inside a wrapper that also holds .thanks.
 */
(function () {
  var LEADS_TO = "david@canismajorpartners.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + LEADS_TO;

  var q = new URLSearchParams(location.search);
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  // keep the first-touch utm tags for the visit, so a person who browses before signing up still carries them
  try {
    UTM.forEach(function (k) { if (q.get(k) && !sessionStorage.getItem("jb-" + k)) sessionStorage.setItem("jb-" + k, q.get(k)); });
  } catch (e) { /* storage blocked */ }
  var utm = function (k) { try { return q.get(k) || sessionStorage.getItem("jb-" + k) || ""; } catch (e) { return q.get(k) || ""; } };

  document.querySelectorAll("form.lform[data-lead]").forEach(function (form) {
    var box = form.closest(".lwrap") || form.parentElement;
    var err = form.querySelector(".err");
    var btn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (err) err.textContent = "";
      if (!form.reportValidity()) return;
      var fd = new FormData(form);
      if (fd.get("_honey")) return; // a bot filled the hidden field
      var data = {};
      fd.forEach(function (v, k) {
        if (k === "_honey") return;
        data[k] = data[k] ? data[k] + ", " + v : v; // checkbox groups become one comma list
      });
      data.lead_type = form.dataset.lead;
      data.source_page = location.origin + location.pathname;
      UTM.forEach(function (k) { data[k] = utm(k); });
      data.referrer = document.referrer || "";
      data.submitted_at = new Date().toISOString();
      data._subject = form.dataset.subject + (data.business_name ? ": " + data.business_name : data.first_name ? ": " + data.first_name : "");
      data._template = "table";
      data._captcha = "false";
      if (data.email) data._replyto = data.email;

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Sending…";
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.ok ? r.json().catch(function () { return {}; }) : Promise.reject(r.status); })
        .then(function () {
          box.classList.add("sent");
          var t = box.querySelector(".thanks");
          if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); t.scrollIntoView({ block: "center", behavior: "smooth" }); }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = label;
          if (err) err.textContent = "That didn't go through. Try again, or email sales@jeromebakerny.com.";
        });
    });
  });
})();
