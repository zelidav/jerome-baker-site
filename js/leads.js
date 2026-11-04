/* Lead forms on /join/ (B2C) and /wholesale/ (B2B).
 * Delivery is the JB app's /api/leads (jbd-glass): the lead is saved in the app's lead list first, then emailed to
 * David through Resend, so an email outage never loses one. Every submission carries lead_type (b2c|b2b),
 * source_page, utm_*, referrer and an ISO timestamp for the CRM module.
 * Markup: <form class="lform" data-lead="b2c|b2b" data-subject="..."> inside a wrapper that also holds .thanks.
 */
(function () {
  var ENDPOINT = "https://jbcustomer.cannacrypted.com/api/leads";

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
      // the app's field names
      if (data.contact_name && !data.name) data.name = data.contact_name;
      if (data.license_number && !data.license_no) data.license_no = data.license_number;

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Sending…";
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok ? j : Promise.reject(j.error || r.status); }); })
        .then(function () {
          box.classList.add("sent");
          var t = box.querySelector(".thanks");
          if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); t.scrollIntoView({ block: "center", behavior: "smooth" }); }
        })
        .catch(function (why) {
          btn.disabled = false;
          btn.textContent = label;
          if (err) err.textContent = (typeof why === "string" && why) ? why : "That didn't go through. Try again, or email sales@jeromebakerny.com.";
        });
    });
  });
})();
