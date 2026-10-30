/* Find your crew. Four questions nudge six axes (see tools/crew_personas.py), then the visitor
   gets the crew member closest to them. Needs window.JB_CREW (js/crew-data.js).
   The scoring core is plain functions so tools can brute-force it under node. */
(function (root) {
  const AXES = ['chaos', 'crew', 'night', 'new', 'hands', 'roam'];

  // Each answer nudges a few axes, -2..2. An axis is the average of every nudge it got.
  // kind: 'scale' renders as a slider over the answers in order, 'basket' as a pile of things to grab.
  const QUESTIONS = [
    { q: 'On a scale of 1 to 10, how high are you right now?', kind: 'scale', a: [
      { t: 'Sober. Judging everyone in this chat', n: { chaos: -2, night: -2, new: -2, hands: 1, roam: -1 } },
      { t: 'Licked a gummy. Regretting it already', n: { chaos: -2, night: -1, crew: 2, hands: -1, new: -1, roam: 1 } },
      { t: "One hit. Telling everybody it's hitting", n: { crew: 1, chaos: -2, hands: -1, night: -1, roam: 1 } },
      { t: 'Mellow. The fridge and I are talking again', n: { roam: -2, hands: 1, night: 1, chaos: -1 } },
      { t: 'Laughing at a traffic cone', n: { chaos: 1, crew: 2, roam: 1, new: 1 } },
      { t: "Googled 'how long does a high last.' Twice", n: { chaos: 1, hands: -2, new: 1, night: -1 } },
      { t: 'One with the couch. The couch is winning', n: { roam: -2, night: 1, crew: -1, chaos: -2, hands: 1 } },
      { t: 'Arguing with the dog. Losing', n: { chaos: 1, crew: -1, night: 1, roam: -1 } },
      { t: 'Met God. She was mid', n: { new: 2, chaos: 1, night: 2, crew: -1 } },
      { t: 'Left my body. It took the car', n: { chaos: 1, roam: 2, new: 2, night: 1, hands: 1 } }
    ] },
    { q: 'What crime are your friends sure you will do time for?', a: [
      { t: 'Arson. You "just wanted to see it go up"', n: { chaos: 1, hands: 1, night: 1, crew: -1 } },
      { t: "Insurance fraud. You've faked a neck brace before", n: { hands: -1, chaos: -1, crew: -1, new: -2, roam: -1 } },
      { t: "Grand theft forklift. You didn't need it. You wanted it", n: { roam: 2, chaos: 1, hands: 1, night: -1 } },
      { t: 'Public nudity at a funeral. Respectfully', n: { crew: 2, night: 1, chaos: 1, new: 1, roam: 1, hands: -1 } },
      { t: 'Running a cockroach racing ring out of the basement', n: { night: 2, crew: 1, roam: -2, hands: -1, new: -1 } },
      { t: 'Smuggling frogs across a border. In your pants', n: { roam: 2, new: 1, crew: -2, night: -1 } },
      { t: 'Stealing a priceless painting to hang over the toilet', n: { new: -2, hands: 1, night: 1, crew: -1, roam: -1 } },
      { t: 'Starting a cult. You charge a cover', n: { crew: 2, hands: -2, new: 1, chaos: -1 } }
    ] },
    { q: "Freak scale. Be honest, nobody's watching. (We're watching.)", kind: 'scale', a: [
      { t: 'Missionary. Lights off. Socks on. Done by the commercial break', n: { chaos: -2, new: -1, night: -2, hands: 2 } },
      { t: 'Lights on. Eye contact. Practically an animal', n: { chaos: -1, new: -1, crew: 1 } },
      { t: 'Handcuffs from a gas station. Lost the key in ten minutes', n: { chaos: 1, new: 1, roam: 1, hands: 1, night: -1 } },
      { t: 'The neighbors know your name, and they say it the way you do', n: { night: 2, crew: 2, chaos: 2, roam: 1, hands: -1 } },
      { t: 'Owns a sex swing. And a stud finder for it', n: { hands: 2, new: 1, roam: -1, night: -1, chaos: -1 } },
      { t: 'Banned from two hot tubs and a bowling alley', n: { roam: 2, chaos: 1, crew: 1, new: -1 } },
      { t: "There's a clown costume in your closet, and it isn't for parties", n: { chaos: 2, new: 1, night: 1, crew: -1, roam: -1 } }
    ] },
    { q: 'The crew left you a gift basket. Grab one thing.', kind: 'basket', a: [
      { t: 'A fat joint. Classic. Coward', i: 'J', n: { crew: 2, roam: -1, new: -2, chaos: -1 } },
      { t: 'The dab rig. You brought your own torch', i: 'D', n: { new: 1, hands: 1, chaos: 1 } },
      { t: 'The mushrooms. See you in six hours', i: 'M', n: { roam: 2, new: 2, crew: -1, hands: 1 } },
      { t: 'The acid sheet. All twenty smiley faces', i: 'A', n: { new: 1, chaos: 2, night: 1 } },
      { t: "The rainbow brownie. Nobody knows what's in it", i: 'B', n: { crew: 2, chaos: 1, roam: -2 } },
      { t: 'The gummy bears. The whole bag. "It\'s not hitting"', i: 'G', n: { roam: -2, night: 1, chaos: -1, new: -1 } },
      { t: 'The pills. Unmarked. Bold', i: 'P', n: { chaos: 1, crew: -1, hands: -1, roam: 1 } },
      { t: "The baggie of white powder. It's baking soda. Probably", i: 'X', n: { night: 2, chaos: 1, new: 1, hands: -2 } },
      { t: 'The whippets. Squeaky voice, zero regrets', i: 'W', n: { chaos: 1, hands: -2, new: -2, night: -1 } },
      { t: 'The purple cough syrup. Everything in slow motion', i: 'S', n: { night: 1, roam: -2, chaos: -1, new: -1, crew: -1 } },
      { t: "The mystery baggie. You don't ask questions", i: '?', n: { night: 1, chaos: 1, crew: -1, roam: 1 } }
    ] }
  ];

  // Averages land near the middle, so they get stretched back out to the -2..2 the crew lives on.
  // 2 keeps the twenty matches roughly even across every possible answer set (tools: brute force).
  const STRETCH = 2;
  const clamp = (x) => Math.max(-2, Math.min(2, x));

  // answers: array of answer indexes, one per question
  const score = (answers) => {
    const sum = {}, cnt = {};
    AXES.forEach((k) => { sum[k] = 0; cnt[k] = 0; });
    answers.forEach((ai, qi) => {
      const n = QUESTIONS[qi] && QUESTIONS[qi].a[ai] && QUESTIONS[qi].a[ai].n;
      if (!n) return;
      for (const k in n) { sum[k] += n[k]; cnt[k] += 1; }
    });
    const v = {};
    AXES.forEach((k) => { v[k] = cnt[k] ? clamp(STRETCH * sum[k] / cnt[k]) : 0; });
    return v;
  };

  const dist = (a, b) => Math.sqrt(AXES.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0));
  // Ties go to the crew member with the stronger personality (bigger total lean), then crew order.
  const lean = (c) => AXES.reduce((s, k) => s + Math.abs(c.axes[k]), 0);
  const rank = (v, crew) => crew
    .map((c, i) => ({ c, i, d: dist(v, c.axes) }))
    .sort((x, y) => (x.d - y.d) || (lean(y.c) - lean(x.c)) || (x.i - y.i));

  const MAXD = Math.sqrt(AXES.length * 16);
  const pct = (d) => Math.max(1, Math.round(100 * (1 - d / MAXD)));

  const core = { AXES, QUESTIONS, score, rank, dist, pct };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }
  root.JBMatch = core;

  // ---------------------------------------------------------------- page
  const crew = root.JB_CREW;
  const stage = document.getElementById('stage');
  if (!crew || !stage) return;
  const base = document.documentElement.dataset.base || '';
  const bySlug = Object.fromEntries(crew.map((c) => [c.slug, c]));
  const COLORS = ['#FFF100', '#FFFFFF', '#05B48F', '#FDB514'];
  const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg'];
  const reduce = root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') el.style.cssText = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach((x) => { if (x != null && x !== false) el.append(x.nodeType ? x : String(x)); });
    return el;
  };
  const img = (c, cls) => h('img', { class: cls || '', src: base + 'assets/crew/' + c.img + '_m.webp', alt: '', width: 400, height: 400, decoding: 'async' });

  let answers = [];

  const swap = (node, focusSel) => {
    stage.replaceChildren(node);
    const f = focusSel && stage.querySelector(focusSel);
    if (f) f.focus({ preventScroll: true });
    if (!reduce) stage.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  };

  const showQuestion = (qi) => {
    const Q = QUESTIONS[qi];
    const bar = h('div', { class: 'mx-bar', 'aria-hidden': 'true' },
      QUESTIONS.map((_, k) => h('span', { class: k < qi ? 'done' : k === qi ? 'now' : '' })));
    const pick = (ai) => { answers[qi] = ai; answers.length = qi + 1; qi + 1 < QUESTIONS.length ? showQuestion(qi + 1) : finish(); };
    let body;
    if (Q.kind === 'scale') {
      // a slider over the answers, with the caption for wherever it sits
      const start = answers[qi] != null ? answers[qi] : Math.floor((Q.a.length - 1) / 2);
      const cap = h('p', { class: 'mx-scap', 'aria-hidden': 'true' });
      const num = h('span', { class: 'mx-snum', 'aria-hidden': 'true' });
      const range = h('input', { type: 'range', class: 'mx-range', min: 0, max: Q.a.length - 1, step: 1, value: start, 'aria-label': Q.q });
      const paint = () => {
        const i = Number(range.value);
        num.textContent = Q.a.length === 10 ? i + 1 : '';
        cap.textContent = Q.a[i].t;
        range.setAttribute('aria-valuetext', Q.a[i].t);
        range.style.setProperty('--p', (100 * i / (Q.a.length - 1)) + '%');
      };
      range.addEventListener('input', paint);
      paint();
      body = h('div', { class: 'mx-scale' },
        h('div', { class: 'mx-sread' }, num, cap),
        range,
        h('div', { class: 'mx-ends', 'aria-hidden': 'true' }, h('span', null, Q.a[0].t), h('span', null, Q.a[Q.a.length - 1].t)),
        h('button', { type: 'button', class: 'btn btn-red mx-lock', onclick: () => pick(Number(range.value)) }, 'Lock it in'));
    } else {
      const basket = Q.kind === 'basket';
      const art = basket ? h('img', { class: 'mx-basket-art', src: base + 'assets/quiz/basket.webp', alt: 'A gift basket from the crew, wrapped in cellophane, stuffed with joints, a dab rig, mushrooms, acid, a rainbow brownie, gummy bears, pills, a baggie of white powder, whippets, cough syrup and a mystery baggie. The tag says not for sale.', width: 684, height: 900, decoding: 'async' }) : null;
      body = h('div', { class: 'mx-opts' + (basket ? ' mx-basket' : ''), role: 'group', 'aria-label': Q.q }, Q.a.map((a, ai) => h('button', {
        type: 'button', class: 'mx-opt' + (answers[qi] === ai ? ' picked' : ''),
        style: `--bg:${COLORS[ai % 4]};--tilt:${TILTS[(ai + qi) % 4]}`,
        onclick: () => pick(ai)
      }, h('span', { class: 'mx-key', 'aria-hidden': 'true' }, basket ? a.i : String(ai + 1)), a.t)));
      if (art) body = h('div', { class: 'mx-basket-wrap' }, art, body);
    }
    const card = h('div', { class: 'mx-card mx-q' },
      h('p', { class: 'mx-count' }, `Question ${qi + 1} of ${QUESTIONS.length}`),
      bar,
      h('h2', { class: 'mx-qh', tabindex: '-1' }, Q.q),
      body,
      qi > 0 ? h('button', { type: 'button', class: 'mx-back', onclick: () => showQuestion(qi - 1) }, '← Back') : null);
    swap(card, qi === 0 && !answers.length ? null : '.mx-qh');
  };

  const finish = () => {
    const v = score(answers);
    const ranked = rank(v, crew);
    const top = ranked[0].c;
    try { history.replaceState(null, '', '#' + top.slug); } catch (e) { location.hash = top.slug; }
    // remember it was yours, so a reload shows your result and not the shared view
    try { sessionStorage.setItem('jbMatch', JSON.stringify({ slug: top.slug, answers })); } catch (e) {}
    showResult(top, v, ranked, false);
  };

  // phrases for the axes two people share
  const SAME = {
    chaos: ['you both bring the chaos', 'you both keep it chill'],
    crew: ['you both run with a pack', 'you both do your own thing'],
    night: ["you're both night owls", "you're both up with the sun"],
    new: ['you both chase the new thing', 'you both stay old school'],
    hands: ['you both make things with your hands', "you'd both rather talk it out"],
    roam: ["you both can't sit still", 'you both love being home']
  };
  const why = (c, v) => {
    // closest axes where you lean the same way, strongest leans first
    const shared = AXES
      .filter((k) => c.axes[k] !== 0 && Math.sign(v[k]) === Math.sign(c.axes[k]) && Math.abs(v[k]) >= 0.3)
      .sort((a, b) => (Math.abs(v[a] - c.axes[a]) - Math.abs(v[b] - c.axes[b])) || (Math.abs(c.axes[b]) - Math.abs(c.axes[a])))
      .slice(0, 2)
      .map((k) => SAME[k][c.axes[k] > 0 ? 0 : 1]);
    if (!shared.length) return `You and ${c.name} meet right in the middle on almost everything, which is rarer than it sounds.`;
    return `You and ${c.name}? ${shared.length === 2 ? shared[0] + ', and ' + shared[1] : shared[0]}.`.replace('? y', '? Y');
  };

  const merchCard = (m, k) => h('a', {
    class: 'mcard', href: base + 'shop/#p=' + encodeURIComponent(m.slug),
    style: `--bg:${['#FFF100', '#FFFFFF', '#05B48F'][k % 3]};--tilt:${TILTS[k % 4]}`
  },
  h('span', { class: 'pic' }, h('img', { src: base + 'assets/merch/' + m.id + '.webp', alt: m.name, loading: 'lazy', decoding: 'async' })),
  h('span', { class: 'meta' }, h('span', null, h('h3', null, m.name), h('span', { class: 'go' }, 'SHOP IT →')), h('span', { class: 'pr' }, '$' + m.price)));

  const toast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  };

  const share = async (c) => {
    const url = location.href.split('#')[0] + '#' + c.slug;
    const text = `My JB Crew match is ${c.name}, ${c.type.toLowerCase()}. Who's yours?`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Find your crew. Jerome Baker', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied. Send it to your crew.'); return; } catch (e) {}
    const field = h('input', { class: 'mx-link', value: url, readonly: '', 'aria-label': 'Link to your match' });
    stage.querySelector('.mx-acts').after(field);
    field.select();
    toast('Copy the link below.');
  };

  const showResult = (c, v, ranked, shared) => {
    const vec = v || c.axes;
    const list = ranked || rank(c.axes, crew);
    const runners = list.filter((r) => r.c.slug !== c.slug).slice(0, 2);
    const topD = v ? list[0].d : 0;
    const words = c.name.split(' ');
    const rots = ['-3deg', '2deg', '-1deg', '3deg'];
    const card = h('div', { class: 'mx-result', style: `--cc:${c.color}` },
      h('div', { class: 'mx-hero' },
        h('div', { class: 'mx-art' }, img(c, 'bob')),
        h('div', { class: 'mx-copy' },
          h('p', { class: 'mx-tagline' }, shared ? 'Somebody matched with' : 'Your crew is'),
          h('h2', { class: 'mx-name', tabindex: '-1' }, words.map((w, k) => h('span', { style: `--r:${rots[k % 4]}` }, w))),
          h('p', { class: 'mx-type' }, c.type),
          h('p', { class: 'mx-from' }, h('span', null, 'From'), ' ' + c.from),
          v ? h('p', { class: 'mx-pct' }, pct(topD) + '% match') : null,
          h('div', { class: 'mx-why' },
            h('p', null, shared ? `${c.name} is ${c.type.toLowerCase()}. Take the quiz and see if you two vibe.` : why(c, vec)),
            h('p', { class: 'mx-vibes' }, h('b', null, 'Vibes with: '), c.vibes_with)),
          h('div', { class: 'mx-acts' },
            h('a', { class: 'btn btn-yellow', href: base + 'crew/' + c.slug + '/' }, 'Meet ' + c.name),
            h('button', { type: 'button', class: 'btn btn-ink', onclick: () => share(c) }, 'Share'),
            h('button', { type: 'button', class: 'btn btn-red', onclick: retake }, shared ? 'Find your crew' : 'Retake the quiz')))),
      c.wear && c.wear.length ? h('div', { class: 'mx-wear' },
        h('h3', { class: 'display' }, 'What ' + c.name + ' wears. Real gear, shipping now.'),
        h('div', { class: 'merch-grid' }, c.wear.map(merchCard))) : null,
      h('div', { class: 'mx-runners' },
        h('h3', { class: 'display' }, shared ? 'Close to ' + c.name : 'Also your people'),
        h('div', { class: 'mx-run' }, runners.map((r, k) => h('a', { class: 'pin', href: base + 'crew/' + r.c.slug + '/', style: `--tilt:${TILTS[k + 1]}` },
          img(r.c),
          h('span', { class: 'tape' }, r.c.name, h('small', null, r.c.type + (v ? ' · ' + pct(r.d) + '%' : ''))))))));
    swap(card, '.mx-name');
    const top = stage.getBoundingClientRect().top + scrollY - 90;
    if (scrollY > top) scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };

  // the questions are about getting high and getting weird, so adults only, asked once per visit
  let grown = false;
  try { grown = sessionStorage.getItem('jbMatch21') === '1'; } catch (e) {}
  const intro = () => {
    answers = [];
    if (grown) { showQuestion(0); return; }
    swap(h('div', { class: 'mx-card mx-gate' },
      h('h2', { class: 'mx-qh', tabindex: '-1' }, 'Four questions. Do not let your mom take this quiz.'),
      h('p', null, 'How high you are, what you will get arrested for, how much of a freak you are, and what you grab out of the gift basket. Adults 21 and up. Lie if you want. We can tell.'),
      h('div', { class: 'mx-acts' },
        h('button', { type: 'button', class: 'btn btn-red', onclick: () => { grown = true; try { sessionStorage.setItem('jbMatch21', '1'); } catch (e) {} showQuestion(0); } }, "I'm 21+. Ask me"),
        h('a', { class: 'btn btn-ink', href: base + 'crew/' }, 'Just show me the crew'))), null);
  };
  const retake = () => {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    answers = [];
    if (!grown) { intro(); return; }
    showQuestion(0);
    stage.querySelector('.mx-qh').focus({ preventScroll: true });
    const top = stage.getBoundingClientRect().top + scrollY - 90;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };

  const route = () => {
    const slug = decodeURIComponent(location.hash.slice(1));
    let mine = null;
    try { mine = JSON.parse(sessionStorage.getItem('jbMatch') || 'null'); } catch (e) {}
    if (bySlug[slug] && mine && mine.slug === slug && Array.isArray(mine.answers) && mine.answers.length === QUESTIONS.length) {
      answers = mine.answers;
      const v = score(answers);
      showResult(bySlug[slug], v, rank(v, crew), false);
    } else if (bySlug[slug]) showResult(bySlug[slug], null, null, true);
    else intro();
  };
  // 1-9 picks an answer
  addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|TEXTAREA)$/.test((ev.target && ev.target.tagName) || '')) return;
    const k = '123456789'.indexOf(ev.key) + 1;
    const opts = stage.querySelectorAll('.mx-opt');
    if (k && opts[k - 1]) { ev.preventDefault(); opts[k - 1].click(); }
  });
  addEventListener('hashchange', route);
  route();
})(typeof window !== 'undefined' ? window : globalThis);
