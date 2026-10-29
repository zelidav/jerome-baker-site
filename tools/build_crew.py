"""Build the JB Crew pages from tools/crew_data.py.

Writes js/crew-data.js, crew/index.html, crew/<slug>/index.html, and fills the
<!-- CREW --> and <!-- SHOP --> blocks in index.html. Run from anywhere:
    python tools/build_crew.py
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from crew_data import CREW, MERCH, SHOP  # noqa: E402

e = html.escape
TILTS = ["-3deg", "2deg", "-1deg", "3deg", "-2deg", "1.5deg"]
CARD_BG = ["#FFF100", "#FFFFFF", "#05B48F", "#FDB514", "#F1F1F1", "#DA2342"]
WEARER = {m: c for c in CREW for m in c["wear"]}
# heading glitch per crew page (css/glitch.css), cycled so neighbours never match
GLITCH = ["8bit", "text", "psycho", "clip", "hello"]


def merch_card(mid, up, i, worn=True):
    name, price, slug = MERCH[mid]
    who = WEARER.get(mid)
    badge = (f'<img class="worn" src="{up}assets/crew/{who["img"]}.webp" alt="" loading="lazy">' if worn and who else "")
    return (f'<a class="mcard" href="{up}shop/#p={slug}" style="--bg:{CARD_BG[i % 6]};--tilt:{TILTS[i % 6]}">'
            f'{badge}<span class="pic"><img src="{up}assets/merch/{mid}.webp" alt="{e(name)}" loading="lazy" decoding="async"></span>'
            f'<span class="meta"><span><h3>{e(name)}</h3><span class="go">SHOP IT →</span></span><span class="pr">${price}</span></span></a>')


def pin(c, up, i):
    return (f'<a class="pin" href="{up}crew/{c["slug"]}/" style="--tilt:{TILTS[i % 6]}">'
            f'<img src="{up}assets/crew/{c["img"]}.webp" alt="{e(c["name"])}, {e(c["doing"])}" loading="lazy" decoding="async">'
            f'<span class="tape">{e(c["name"])}<small>{e(c["title"])}</small></span></a>')


def head(title, desc, up, extra=""):
    return f"""<!doctype html>
<html lang="en" data-base="{up}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#2A3B8E">
<link rel="icon" href="{up}favicon.ico" sizes="any">
<link rel="icon" href="{up}assets/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{up}assets/icons/apple-touch-icon.png">
<link rel="manifest" href="{up}site.webmanifest">
<meta property="og:image" content="https://jeromebaker.cannacrypted.com/assets/icons/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{up}css/site.css">
<link rel="stylesheet" href="{up}css/crew.css">
<link rel="stylesheet" href="{up}css/glitch.css">
{extra}</head>
"""


def topbar(up):
    return (f'<header class="topbar pad"><a href="{up}" aria-label="Jerome Baker home"><img src="{up}assets/img/jb-mark.webp" alt="Jerome Baker" width="90" height="69"></a>'
            f'<nav aria-label="Main"><a href="{up}#glass">Glass</a> <a href="{up}shop/">Ritual merch</a> <a href="{up}crew/">The JB Crew</a> <a href="{up}travel/" style="color:#FFF100">Travel guide</a></nav></header>')


def scripts(up, weird=False):
    return (f'<script src="{up}js/crew-data.js"></script>\n<script src="{up}js/crew.js" defer></script>\n'
            f'<script src="{up}js/glitch.js" defer></script>\n'
            + (f'<script src="{up}js/weird.js" defer></script>\n' if weird else ""))


FOOT = '<footer class="pad" style="background:#0A0A0A;color:#BDBDBD;padding-top:40px;padding-bottom:calc(80px + env(safe-area-inset-bottom));font-size:14px">© 2026 Jerome Baker Designs. Adults 21+ only. The crew is fictional. The merch is real.</footer>'


def crew_page(c, i):
    up = "../../"
    prev, nxt = CREW[i - 1], CREW[(i + 1) % len(CREW)]
    words = c["name"].split()
    rots = ["-3deg", "2deg", "-1deg", "3deg"]
    name = "".join(f'<span style="--r:{rots[k % 4]}">{e(w)}</span>' for k, w in enumerate(words))
    cards = "".join(merch_card(m, up, k, worn=False) for k, m in enumerate(c["wear"]))
    return head(f'{c["name"]}. The JB Crew', f'{c["name"]}: {c["doing"]} Wearing real Jerome Baker merch.', up) + f"""<body data-weird="{c['weird']}" data-crew-self="{c['slug']}" data-crew-count="5" data-glitch="{GLITCH[i % len(GLITCH)]}">
<a class="skip" href="#main">Skip to content</a>
<div class="page">
{topbar(up)}
<main id="main">
<section class="cp-hero pad dots" style="--cc:{c['color']}">
<div class="art"><img class="bob" src="{up}assets/crew/{c['img']}.webp" alt="{e(c['name'])}: {e(c['doing'])}" width="560" height="560"></div>
<div class="copy">
<p class="cp-title">The JB Crew · No. {i + 1:02d}</p>
<h1 class="cp-name">{name}</h1>
<p class="cp-title" style="background:#FFF100;color:#0A0A0A">{e(c['title'])}</p>
<p class="cp-bio">{e(c['bio'])}</p>
<div class="say"><span class="line" id="line">{e(c['lines'][0])}</span><button type="button" class="btn btn-ink" id="more">Say more</button></div>
</div>
</section>
<section class="sheet pad">
<div class="wrap grid">
<div class="rap"><h2>Rap sheet</h2><dl>
<dt>Name</dt><dd>{e(c['name'])}</dd>
<dt>Currently</dt><dd>{e(c['doing'])}</dd>
<dt>Known for</dt><dd>{e(c['known'])}</dd>
<dt>Weakness</dt><dd>{e(c['weakness'])}</dd>
<dt>Wearing</dt><dd>{e(', '.join(MERCH[m][0] for m in c['wear']))}</dd>
</dl></div>
<figure class="before"><img src="{up}assets/{c['ref']}" alt="{e(c['name'])} before the merch, on the original Jerome Baker art" loading="lazy"><p>BEFORE THE MERCH</p></figure>
</div>
</section>
<section class="wearing pad"><div class="wrap">
<h2 class="display">What {e(c['name'])}<br>is wearing.</h2>
<div class="merch-grid">{cards}</div>
<p style="margin:32px 0 0;font-weight:700">Real gear, shipping now. <a href="{up}shop/">Shop all Ritual Merch →</a></p>
</div></section>
<section class="talk pad"><div class="wrap">
<h2 class="display" style="margin:0;font-size:clamp(36px,5vw,64px)">Talk to {e(c['name'])}.</h2>
<p style="margin:10px 0 0;color:#BDBDBD">They only know a few lines right now. They're working on it.</p>
<form id="talk"><input id="msg" type="text" maxlength="200" placeholder="Say something to {e(c['name'])}" aria-label="Your message" autocomplete="off"><button class="btn btn-yellow" type="submit">Send</button></form>
<div class="log" id="log" aria-live="polite"></div>
</div></section>
<nav class="crew-nav pad" aria-label="More crew">
<a href="../{prev['slug']}/"><img src="{up}assets/crew/{prev['img']}.webp" alt="" loading="lazy">← {e(prev['name'])}</a>
<a href="../">The whole crew</a>
<a href="../{nxt['slug']}/">{e(nxt['name'])} →<img src="{up}assets/crew/{nxt['img']}.webp" alt="" loading="lazy"></a>
</nav>
</main>
{FOOT}
</div>
{scripts(up, weird=True)}<script>
(() => {{
  const me = window.JB_CREW.find((x) => x.slug === {json.dumps(c['slug'])});
  const line = document.getElementById('line');
  let k = 0;
  document.getElementById('more').addEventListener('click', () => {{ k = (k + 1) % me.lines.length; line.textContent = me.lines[k]; }});
  const log = document.getElementById('log'), msg = document.getElementById('msg');
  const add = (t, who) => {{ const p = document.createElement('p'); p.textContent = t; if (who) p.className = 'them'; log.appendChild(p); }};
  document.getElementById('talk').addEventListener('submit', async (ev) => {{
    ev.preventDefault();
    const said = msg.value.trim(); if (!said) return;
    add(said); msg.value = '';
    const brain = (window.JBCrew && window.JBCrew.brain) || (async () => me.lines[Math.floor(Math.random() * me.lines.length)]);
    add(me.name + ': ' + await brain(me, {{ kind: 'chat', said, page: location.pathname }}), true);
  }});
}})();
</script>
</body>
</html>
"""


def crew_index():
    up = "../"
    pins = "".join(pin(c, up, i) for i, c in enumerate(CREW))
    return head("The JB Crew. Jerome Baker", "Twenty characters off the Jerome Baker wall, in real JB merch, doing weird things.", up) + f"""<body data-crew-count="8" data-glitch="psycho">
<a class="skip" href="#main">Skip to content</a>
<div class="page">
{topbar(up)}
<main id="main">
<section class="crew pad">
<div class="wrap">
<h1 class="display" style="margin:0;font-size:clamp(64px,11vw,170px);line-height:.85;letter-spacing:-.03em;rotate:-2deg;text-shadow:6px 6px 0 #0A0A0A">The JB<br><span style="color:#FFF100">Crew.</span></h1>
<p class="lede">They came off the booth wall, the box art and the old posters. They got dressed in real JB merch. Now they float around the site doing whatever they want. Grab one. Throw it. Tap one to say hi. Every crew member has a page, and every page is weird in its own way.</p>
<div class="pinboard">{pins}</div>
</div>
</section>
</main>
{FOOT}
</div>
{scripts(up)}</body>
</html>
"""


def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def main():
    data = [{k: c[k] for k in ("slug", "img", "name", "title", "doing", "lines", "color")} for c in CREW]
    write("js/crew-data.js", "// Generated by tools/build_crew.py. Edit tools/crew_data.py instead.\nwindow.JB_CREW = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    write("crew/index.html", crew_index())
    for i, c in enumerate(CREW):
        write(f"crew/{c['slug']}/index.html", crew_page(c, i))
    idx = os.path.join(ROOT, "index.html")
    s = open(idx, encoding="utf-8").read()
    pins = "".join(pin(c, "", i) for i, c in enumerate(CREW))
    shop = "".join(merch_card(m, "", i) for i, m in enumerate(SHOP))
    s = re.sub(r"<!-- CREW -->.*?<!-- /CREW -->", lambda m: f"<!-- CREW -->{pins}<!-- /CREW -->", s, flags=re.S)
    s = re.sub(r"<!-- SHOP -->.*?<!-- /SHOP -->", lambda m: f"<!-- SHOP -->{shop}<!-- /SHOP -->", s, flags=re.S)
    write("index.html", s)
    print(f"built {len(CREW)} crew pages, {len(SHOP)} shop cards")


if __name__ == "__main__":
    main()
