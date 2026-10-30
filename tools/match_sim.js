// Brute-forces every answer combination of Find your crew (js/match.js) and prints how often
// each crew member comes out on top. Run after changing questions or personas:
//   python tools/build_crew.py && node tools/match_sim.js
const path = require('path'), fs = require('fs'), vm = require('vm');
const repo = path.join(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'js/crew-data.js'), 'utf8'), ctx);
const crew = ctx.window.JB_CREW;
const M = require(path.join(repo, 'js/match.js'));
const sizes = M.QUESTIONS.map((q) => q.a.length);
const top = Object.fromEntries(crew.map((c) => [c.slug, 0]));
const best = {};          // an answer path that lands on each member, closest first
const idx = sizes.map(() => 0);
let total = 0;
for (;;) {
  const r = M.rank(M.score(idx), crew);
  const s = r[0].c.slug;
  top[s]++; total++;
  if (!best[s] || r[0].d < best[s].d) best[s] = { d: r[0].d, path: idx.map((i) => i + 1).join('-') };
  let k = 0;
  while (k < idx.length && ++idx[k] === sizes[k]) { idx[k] = 0; k++; }
  if (k === idx.length) break;
}
console.log(`${total} answer combinations`);
Object.entries(top).sort((a, b) => b[1] - a[1]).forEach(([s, n]) =>
  console.log(s.padEnd(16), String(n).padStart(6), (100 * n / total).toFixed(1).padStart(5) + '%', '  e.g.', best[s] ? best[s].path : '-'));
const never = Object.keys(top).filter((s) => !top[s]);
if (never.length) { console.error('NEVER WIN: ' + never.join(', ')); process.exit(1); }
