"""Builds dev/brand/index.html, the brand book for the new Jerome Baker site (the look the site already has).
Reads the tokens from css/site.css and the cast from js/crew-data.js, so the book cannot drift from the site.
dev/ is left out of the Netlify build, so this page never ships. Run: python tools/build_brand_book.py"""
import html as _h
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
esc = lambda s: _h.escape(str(s), quote=True)  # noqa: E731
NL = chr(10)

css = (ROOT / 'css' / 'site.css').read_text(encoding='utf-8')
root = re.search(r':root\{([^}]*)\}', css).group(1)
tok = dict(re.findall(r'--([a-z]+):([^;]+);?', root))
src = (ROOT / 'js' / 'crew-data.js').read_text(encoding='utf-8')
crew, _ = json.JSONDecoder().raw_decode(src[src.index('['):])
by = {c['slug']: c for c in crew}

PALETTE = [
    ('blue', 'Jerome blue', 'Headlines on light, prices, links, the grounded colour.'),
    ('red', 'Baker red', 'Torch, sale-free emphasis, active states, the loud accent.'),
    ('yellow', 'Hot yellow', 'Buttons, highlights, focus rings, text on ink.'),
    ('ink', 'Ink', 'All type on light, every border, every hard shadow.'),
    ('gray', 'Paper gray', 'Page ground behind white cards.'),
    ('white', 'White', 'Cards, photo grounds.'),
    ('teal', 'Teal', 'Secondary accent for variety in the cast and charts.'),
    ('gold', 'Gold', 'Awards, signatures, anything "one of one".'),
]
LUM = lambda h: sum(int(h[i:i + 2], 16) * w for i, w in ((1, .299), (3, .587), (5, .114)))  # noqa: E731


def swatch(k, name, use):
    v = tok[k].strip()
    fg = '#0A0A0A' if LUM(v) > 150 else '#fff'
    return (f'<div class="sw" style="background:{v};color:{fg}"><b>{esc(name)}</b><code>{esc(v)}</code><span>{esc(use)}</span></div>')


def card(c):
    rel = lambda ks: ', '.join(esc(by[k]['name']) for k in ks if k in by) or 'none'  # noqa: E731
    return (f'<article class="ch" style="--c:{esc(c["color"])}" id="{esc(c["slug"])}"><img src="../../assets/crew/{esc(c["img"])}_m.webp" alt="{esc(c["name"])}, {esc(c["title"].lower())}" loading="lazy">'
            f'<div><h3>{esc(c["name"])}</h3><p class="t">{esc(c["title"])} <i>{esc(c["type"])}</i></p>'
            f'<p><b>From</b> {esc(c["from"])}</p><p><b>Voice</b> {esc(c["voice"])}</p>'
            f'<p><b>Loves</b> {esc(c["loves"])}</p><p><b>Hates</b> {esc(c["hates"])}</p>'
            f'<p><b>Friends</b> {rel(c["friends"])} &nbsp; <b>Beef</b> {rel(c["beef"])}</p></div></article>')


STYLE = """
:root{--blue:%(blue)s;--red:%(red)s;--yellow:%(yellow)s;--ink:%(ink)s;--gray:%(gray)s;--white:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--gray);color:var(--ink);font:16px/1.55 Montserrat,Helvetica,Arial,sans-serif}
.w{max-width:1180px;margin:0 auto;padding:0 20px}
header.top{background:var(--ink);color:var(--yellow);padding:56px 0 40px}
header.top h1{margin:0;font:900 clamp(44px,9vw,120px)/.88 Montserrat,sans-serif;letter-spacing:-.03em}
header.top p{color:#fff;max-width:60ch;font-size:18px}
nav{background:var(--yellow);border-block:3px solid var(--ink);position:sticky;top:0;z-index:5}
nav .w{display:flex;gap:6px 18px;flex-wrap:wrap;padding:10px 20px}nav a{font:700 12px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);text-decoration:none}
nav a:hover{text-decoration:underline}
section{padding:56px 0;border-bottom:3px solid var(--ink)}
h2{font:900 clamp(30px,5vw,56px)/1 Montserrat,sans-serif;letter-spacing:-.02em;margin:0 0 8px}
h2+p.lede{font-size:18px;max-width:62ch;margin:0 0 28px}
h3{margin:0 0 4px;font:900 20px Montserrat,sans-serif}
.grid{display:grid;gap:22px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.sw{padding:18px;min-height:150px;border:3px solid var(--ink);box-shadow:6px 6px 0 var(--ink);display:flex;flex-direction:column;gap:4px}
.sw code{font:700 13px ui-monospace,monospace}.sw span{font-size:13px;margin-top:auto}
.box{background:#fff;border:3px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:20px}
.do,.dont{padding:14px 16px;border:3px solid var(--ink);background:#fff}.do{border-left:12px solid var(--blue)}.dont{border-left:12px solid var(--red)}
.btn{display:inline-block;padding:14px 22px;background:var(--yellow);border:3px solid var(--ink);box-shadow:5px 5px 0 var(--ink);font:900 15px Montserrat,sans-serif;color:var(--ink);text-decoration:none;text-transform:uppercase}
.cast{display:grid;gap:22px;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
.ch{display:flex;gap:14px;background:#fff;border:3px solid var(--ink);box-shadow:6px 6px 0 var(--c,var(--ink));padding:14px}
.ch img{width:112px;height:112px;object-fit:contain;flex:none;background:var(--gray);border:2px solid var(--ink)}
.ch p{margin:0 0 4px;font-size:14px;line-height:1.4}.ch .t{font-weight:700}.ch .t i{display:block;font-weight:400}
.ch b{font:700 10px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;margin-right:4px}
pre,code.k{font:13px ui-monospace,monospace}
.two{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.big{font:900 clamp(32px,6vw,72px)/.95 Montserrat,sans-serif;letter-spacing:-.02em}
.mono{font:700 12px ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}
.logo{background:#fff;border:3px solid var(--ink);padding:24px;display:grid;place-items:center;min-height:180px}.logo img{max-height:140px;width:auto}
"""

lion = by.get('torch')
HTML = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Jerome Baker brand book, the new site</title>
<style>{STYLE % {k: tok[k].strip() for k in ('blue', 'red', 'yellow', 'ink', 'gray')}}</style></head><body>
<header class="top"><div class="w"><p class="mono">Brand book / the new site / v0.1 draft</p><h1>Jerome Baker.<br>Hand made. Loud.</h1>
<p>The look the website already has, written down so everyone builds it the same way: colour, type, the hard-shadow card, the voice, and the {len(crew)} characters who live on it. This is separate from the New York book. Draft for David to mark up.</p></div></header>
<nav><div class="w"><a href="#idea">Idea</a><a href="#colour">Colour</a><a href="#type">Type</a><a href="#ui">Components</a><a href="#marks">Marks</a><a href="#cast">Characters</a><a href="#voice">Voice</a><a href="#motion">Motion</a><a href="#rules">Rules</a><a href="#open">Open</a></div></nav>

<section id="idea"><div class="w"><h2>The idea</h2><p class="lede">A glass studio that never grew up. The chaos is the wrapper, the buy path is boring: collage, stickers, characters and noise around the edges, a plain fast cart in the middle.</p>
<div class="two"><div class="box"><h3>Three words</h3><p class="big">Loud. Crafted. Funny.</p></div>
<div class="box"><h3>What it is not</h3><p>Not dark-luxury, not cannabis-leaf kitsch, not a template storefront. Bright, printed, a little dangerous, always made by hand.</p></div></div></div></section>

<section id="colour"><div class="w"><h2>Colour</h2><p class="lede">Pulled straight from <code class="k">css/site.css</code>. Ink does the borders and the type; the three brights do the shouting; paper and white give the cards somewhere to sit.</p>
<div class="grid">{''.join(swatch(*p) for p in PALETTE)}</div>
<div class="two" style="margin-top:28px"><div class="do"><b>Do</b> text in ink on light, yellow on ink, white on blue or red. Colour changes by band, not inside a paragraph.</div>
<div class="dont"><b>Don't</b> put red on blue, yellow text on white, or a gradient anywhere. Never tint a logo.</div></div></div></section>

<section id="type"><div class="w"><h2>Type</h2><p class="lede">Display is Nexa Heavy (Montserrat Black is the fallback in the CSS). Body is Montserrat. Labels, prices and tags are JetBrains Mono, small, tracked wide, upper case.</p>
<div class="two"><div class="box"><p class="mono">Display / 900 / -0.02em</p><p class="big">One of one. Including me.</p></div>
<div class="box"><p class="mono">Mono label / 11-13px / .16em</p><p class="mono" style="font-size:13px">Hot shop / Maui / Est. 1991</p><p>Body copy is Montserrat 16 to 18px on a 1.5 line, never narrower than 60 characters and never wider than 70.</p></div></div></div></section>

<section id="ui"><div class="w"><h2>Components</h2><p class="lede">One move repeated everywhere: a 3px ink border and a hard offset shadow with no blur. Cards lift a couple of pixels on hover. The shadow colour can carry a character's colour.</p>
<div class="two"><div class="box"><h3>Card</h3><p>3px border, 6px 6px 0 shadow, white ground, 10 to 20px padding.</p></div>
<div class="box"><h3>Button</h3><p><a class="btn" href="#ui">Add to cart</a></p><p>Yellow, ink border, 5px shadow, upper case 900. Hit area at least 44px.</p></div></div>
<p style="margin-top:22px"><b>Buy path stays boring.</b> Cart, checkout, age gate, buy box and product photos are static, fast and conventional. Product photos sit on white and are never distorted or recoloured.</p></div></section>

<section id="marks"><div class="w"><h2>Marks and art</h2><p class="lede">The JB mark and the crossed mark are the only logos. Use them as supplied, on white, paper, ink or yellow, with clear space equal to the mark's height.</p>
<div class="two"><div class="logo"><img src="../../assets/img/jb-mark.webp" alt="Jerome Baker mark"></div><div class="logo"><img src="../../assets/img/jb-crossed.svg" alt="Jerome Baker crossed mark"></div></div>
<p style="margin-top:20px"><b>Never</b> stretch, rotate, outline, shadow, or merge a logo over a busy pattern. Bags and merch: clean logo on the panel, pattern on the body. Pattern art lives in <code class="k">assets/img/jb-pattern.webp</code>.</p></div></section>

<section id="cast"><div class="w"><h2>The characters</h2><p class="lede">{len(crew)} of them, led by {esc(lion['name']) if lion else 'Torch'}, {esc(lion['title'].lower()) if lion else ''}. Each has a colour, a voice, a hometown, friends and beef. They wear real JB merch on the site and talk to visitors in one or two short lines. They are cartoons: never real people, never selling cannabis, never quoting prices. Source of truth: <code class="k">tools/crew_data.py</code> and <code class="k">tools/crew_personas.py</code>.</p>
<div class="cast">{''.join(card(c) for c in crew)}</div></div></section>

<section id="voice"><div class="w"><h2>Voice</h2><p class="lede">Short sentences, dry, specific. The house voice is Torch's: never explains twice, says "hand made" like a threat, never says awesome.</p>
<div class="two"><div class="do"><b>Sounds like</b> "Hood down. Fire code." / "One of one. Including me." / real numbers, real places, real years.</div>
<div class="dont"><b>Never sounds like</b> "elevate your sesh", "game-changing", "premium experience", or anything an agency would write.</div></div>
<p style="margin-top:22px"><b>Search-rank spelling.</b> Visible copy uses swapped characters for flagged words (b0ng, B@ked); the real spelling stays in the page title, meta description, H1, image alt and structured data. The build checks it: <code class="k">python tools/scrub.py --check</code>.</p></div></section>

<section id="motion"><div class="w"><h2>Motion</h2><p class="lede">Bob, jig, spin, marquee: slow loops on characters and stickers, transform and opacity only. Everything stops under prefers-reduced-motion. Nothing animates the buy box.</p></div></section>

<section id="rules"><div class="w"><h2>House rules</h2>
<div class="two"><div class="do"><b>Do</b> match each partner collab to the partner's colours; keep every card to one idea; show product in real environments; label AI-made people as AI.</div>
<div class="dont"><b>Don't</b> use trademarked names for products; show glass or smoking imagery in Meta ads; put prices or claims on cannabis; copy another brand's characters or art.</div></div></div></section>

<section id="open"><div class="w"><h2>Open for David</h2><ol>
<li>Is Nexa licensed for the web? (Parked for now, Montserrat Black is the fallback.)</li>
<li>Should teal and gold stay in the core palette or sit with the characters only?</li>
<li>Logo clear space and minimum sizes need a real test, then a rule.</li>
<li>Print and packaging pages (jars, boxes, hats) still to add.</li>
<li>Where to publish it: gated like the NY book, or internal only.</li></ol></div></section>
</body></html>
"""
out = ROOT / 'dev' / 'brand' / 'index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(HTML, encoding='utf-8', newline='')
print(f'wrote {out.relative_to(ROOT)}: {len(crew)} characters, {len(PALETTE)} colours')
