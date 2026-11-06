/* Reach us, every page (css/contact.css; loaded by js/dock.js so no page needs rebuilding):
   1. the top menu gets a Contact link and the social icons
   2. on desktop the menu bar slides away while you scroll down and comes back the moment you scroll up
   3. a back-to-top button in the bottom-right corner once you're a screen or so down
   4. every footer opens with a "Reach us" band: the phone number big, the general inbox, the socials, and a
      customer-service form. The form goes into the JB app's lead list (jbd-glass /api/leads, the same flow as the
      feedback button and the join/wholesale forms): saved first, then emailed to David. */
(() => {
  if (window.JBContact) return;
  window.JBContact = true;
  const base = document.documentElement.dataset.base || '';
  const ENDPOINT = 'https://jbcustomer.cannacrypted.com/api/leads';
  const PHONE = '+15162291334', PHONE_TXT = '516-229-1334', EMAIL = 'info@jeromebakerny.com';
  const ICON = {
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/></svg>',
    yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    ph: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.6 4.4-2.1 1.4a12 12 0 0 0 6.1 6.1l1.4-2.1L21 14.4v3A2.6 2.6 0 0 1 18.4 20 15.4 15.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3z" fill="currentColor"/></svg>',
    em: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 6.5l8.5 7 8.5-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  };
  const SOCIAL = [
    ['ig', 'Instagram', '@jerome_baker', 'https://www.instagram.com/jerome_baker'],
    ['ig', 'Instagram, JB New York', '@jeromebakerny', 'https://www.instagram.com/jeromebakerny'],
    ['yt', 'YouTube', 'YouTube', 'https://www.youtube.com/channel/UCht08a4Veo4ktA5x4kDvaFQ'],
  ];
  const ext = 'target="_blank" rel="noopener"';

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'css/contact.css';
  document.head.appendChild(css);

  const foot = document.querySelector('footer.site-foot, footer.sfoot');
  const contactHref = foot ? '#contact' : base + '#contact';

  // ---------- 1. Contact + socials in the top menu ----------
  const head = document.querySelector('header.top, header.topbar');
  const nav = head && head.querySelector('nav[aria-label="Main"]');
  if (nav && !nav.querySelector('.nav-contact')) {
    const a = document.createElement('a');
    a.href = contactHref;
    a.className = 'nav-contact';
    a.textContent = 'Contact';
    const list = nav.querySelector('ul');
    if (list) {
      const li = document.createElement('li');
      li.append(a);
      const cta = [...list.children].find((x) => x.querySelector('.btn, .cartbtn'));
      list.insertBefore(li, cta || null);
    } else {
      const cta = nav.querySelector('.btn, .cartbtn');
      nav.insertBefore(a, cta || null);
      nav.insertBefore(document.createTextNode(' '), a);
    }
  }
  if (head && !head.querySelector('.hdr-social')) {
    const s = document.createElement('div');
    s.className = 'hdr-social';
    s.innerHTML = SOCIAL.filter((x) => x[2] !== '@jeromebakerny')
      .map(([k, label, , url]) => `<a href="${url}" ${ext} aria-label="Jerome Baker on ${label}">${ICON[k]}</a>`).join('');
    head.append(s);
  }

  // ---------- 2. the menu bar hides on the way down, shows on the way up (desktop) ----------
  const desk = matchMedia('(min-width: 901px)');
  if (head) {
    const root = document.documentElement;
    let lastY = scrollY, hidden = false, queued = false;
    const visH = () => head.offsetHeight + (head.querySelector(':scope > .hdr-tear') ? 26 : 0);
    const set = (h) => {
      if (h === hidden) return;
      hidden = h;
      head.classList.toggle('hdr-away', h);
      root.classList.toggle('hdr-hidden', h);
      root.style.setProperty('--hdrv', h ? '0px' : visH() + 'px');
    };
    root.style.setProperty('--hdrv', visH() + 'px');
    const tick = () => {
      queued = false;
      const y = scrollY, d = y - lastY;
      if (!desk.matches || y < visH() + 40) set(false);
      else if (d > 6) { if (!head.matches(':hover, :focus-within') && !document.querySelector('.mega-panel:not([hidden]), .mm-panel:not([hidden])')) set(true); }
      else if (d < -6) set(false);
      if (Math.abs(d) > 6 || y < 4) lastY = y;
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
    addEventListener('resize', () => { if (!hidden) root.style.setProperty('--hdrv', visH() + 'px'); });
    addEventListener('load', () => { if (!hidden) root.style.setProperty('--hdrv', visH() + 'px'); });
    head.addEventListener('focusin', () => set(false));
  }

  // ---------- 3. back to top ----------
  if (!/\/travel\//.test(location.pathname)) {
    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'jb-top';
    up.setAttribute('aria-label', 'Back to top');
    up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-7 7h4.5v7h5v-7H19z" fill="currentColor"/></svg>';
    document.body.append(up);
    let shown = false;
    const check = () => { const s = scrollY > innerHeight * 1.2; if (s !== shown) { shown = s; up.classList.toggle('on', s); } };
    addEventListener('scroll', check, { passive: true });
    check();
    up.addEventListener('click', () => {
      scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const skip = document.querySelector('header a');
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  // ---------- 4. "Reach us" at the top of every footer ----------
  if (!foot || document.getElementById('contact')) return;
  const band = document.createElement('section');
  band.id = 'contact';
  band.className = 'reach';
  band.setAttribute('aria-label', 'Contact Jerome Baker');
  band.innerHTML = `<div class="reach-in">
<div class="reach-say">
<b class="reach-k">Reach us</b>
<a class="reach-phone" href="tel:${PHONE}">${ICON.ph}<span>${PHONE_TXT}</span></a>
<a class="reach-mail" href="mailto:${EMAIL}">${ICON.em}<span>${EMAIL}</span></a>
<div class="reach-social">${SOCIAL.map(([k, label, handle, url]) => `<a href="${url}" ${ext} aria-label="${label}">${ICON[k]}<span>${handle}</span></a>`).join('')}</div>
</div>
<form class="reach-form" novalidate>
<b class="reach-k">Customer service</b>
<p class="reach-lede">An order, a piece, a question. Send it here and a real person gets back to you.</p>
<div class="reach-row"><label>Name<input name="name" autocomplete="name" maxlength="120" required></label>
<label>Email<input name="email" type="email" autocomplete="email" maxlength="160" required></label></div>
<div class="reach-row"><label>Phone <i>(optional)</i><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
<label>About<select name="topic"><option>An order</option><option>A glass piece</option><option>Merch</option><option>Wholesale</option><option>Something else</option></select></label></div>
<label>Message<textarea name="message" rows="4" maxlength="4000" required></textarea></label>
<input name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" class="reach-hp">
<div class="reach-go"><button class="btn btn-red" type="submit">Send it</button><p class="reach-err" role="alert"></p></div>
<p class="reach-thanks" tabindex="-1" hidden>Got it. Someone from JB will get back to you soon.</p>
</form></div>`;
  foot.prepend(band);

  const form = band.querySelector('form'), err = band.querySelector('.reach-err'), btn = form.querySelector('button');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    if (fd.get('_honey')) return;
    const name = String(fd.get('name') || '').trim(), email = String(fd.get('email') || '').trim(), msg = String(fd.get('message') || '').trim();
    if (!name) return (err.textContent = 'Add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (err.textContent = 'That email address does not look right.');
    if (!msg) return (err.textContent = 'Add a message.');
    const topic = String(fd.get('topic') || '');
    const data = {
      lead_type: 'feedback', // the app's lead list; feedback is the type that takes a free-form message
      kind: 'customer-service',
      name, email, phone: String(fd.get('phone') || '').trim(), topic,
      message: `Customer service (${topic}) from ${name} <${email}>${fd.get('phone') ? ', ' + fd.get('phone') : ''}:\n\n${msg}`,
      source_page: location.origin + location.pathname,
      referrer: document.referrer || '',
      submitted_at: new Date().toISOString(),
    };
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Sending…';
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then((r) => r.json().catch(() => ({})).then((j) => (r.ok && j.ok ? j : Promise.reject(j.error || r.status))))
      .then(() => {
        form.querySelectorAll('.reach-row, label, .reach-go, .reach-lede').forEach((x) => (x.hidden = true));
        const t = form.querySelector('.reach-thanks');
        t.hidden = false;
        t.focus({ preventScroll: true });
      })
      .catch((why) => {
        btn.disabled = false;
        btn.textContent = label;
        err.textContent = typeof why === 'string' && why ? why : `That didn't go through. Call ${PHONE_TXT} or email ${EMAIL}.`;
      });
  });
})();
