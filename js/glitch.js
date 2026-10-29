/* Marks a page's headings for its glitch look (body[data-glitch], styles in css/glitch.css).
   The pseudo-element layers copy the text from data-text, so each glitched piece has to be a leaf:
   loose text in a heading gets its own span, and styled spans glitch on their own. */
(() => {
  const look = document.body.dataset.glitch;
  if (!look) return;
  if (look === '8bit' && !document.querySelector('link[href*="Silkscreen"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap';
    document.head.appendChild(l);
  }
  const SEL = 'h1, h2, .wall-title';
  // skip text other scripts rewrite (ids, live regions) and anything inside dialogs
  const skip = (el) => el.id || el.closest('[aria-live], dialog, .tt-copy');
  const mark = (el) => {
    if (el.classList.contains('glt') || !el.textContent.trim()) return;
    el.classList.add('glt');
    el.dataset.text = el.textContent;
    el.style.setProperty('--gd', (-Math.random() * 6).toFixed(2) + 's');
  };
  document.querySelectorAll(SEL).forEach((h) => {
    if (skip(h)) return;
    [...h.childNodes].forEach((n) => {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const s = document.createElement('span');
        s.textContent = n.textContent;
        n.replaceWith(s);
        mark(s);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.children.length && !skip(n)) {
        mark(n);
      }
    });
  });
})();
