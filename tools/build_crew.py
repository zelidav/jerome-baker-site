"""Build the JB Crew pages from tools/crew_data.py.

Personas come from tools/crew_personas.py and are checked here; a bad one stops the build.
Writes js/crew-data.js, crew/index.html, crew/<slug>/index.html, crew/match/index.html, a redirect page at
crew/<old-slug>/index.html for every renamed crew member (crew_data.RENAMED), and fills the
<!-- CREW --> and <!-- SHOP --> blocks in index.html. Run from anywhere:
    python tools/build_crew.py
"""
import html, json, os, re, sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from crew_data import CREW, MERCH, SHOP, RENAMED, ORIGIN, ORIGIN_SOURCES, MR_X_STEPS  # noqa: E402
from crew_personas import PERSONAS, AXES, brief  # noqa: E402

e = html.escape
TILTS = ["-3deg", "2deg", "-1deg", "3deg", "-2deg", "1.5deg"]
CARD_BG = ["#FFF100", "#FFFFFF", "#05B48F", "#FDB514", "#F1F1F1", "#DA2342"]
WEARER = {m: c for c in CREW for m in c["wear"]}
# heading glitch per crew page (css/glitch.css), cycled so neighbours never match
GLITCH = ["8bit", "text", "psycho", "clip", "hello"]
BY_SLUG = {c["slug"]: c for c in CREW}
# persona fields every crew member must have; `vice` is comic-only and never reaches the site
PERSONA_FIELDS = ["type", "from_", "backstory", "shop_job", "vice", "voice", "loves", "hates", "vibes_with", "friends", "beef", "axes"]
PUBLIC_FIELDS = ["type", "from_", "backstory", "shop_job", "voice", "loves", "hates", "vibes_with", "friends", "beef", "axes"]


def check_personas():
    """Fail the build loudly if any crew member is missing a persona or has a bad one."""
    errs = []
    for c in CREW:
        p = PERSONAS.get(c["slug"])
        if p is None:
            errs.append(f"{c['slug']}: no persona in crew_personas.py")
            continue
        for f in PERSONA_FIELDS:
            if f not in p or (p[f] in (None, "", []) and f not in ("friends", "beef")):
                errs.append(f"{c['slug']}: missing or empty '{f}'")
        for f in ("friends", "beef"):
            for s in p.get(f, []):
                if s not in BY_SLUG:
                    errs.append(f"{c['slug']}: {f} '{s}' is not a crew slug")
                elif s == c["slug"]:
                    errs.append(f"{c['slug']}: lists itself in {f}")
        ax = p.get("axes") or {}
        if sorted(ax) != sorted(AXES):
            errs.append(f"{c['slug']}: axes must be exactly {AXES}, got {sorted(ax)}")
        for k, v in ax.items():
            if not isinstance(v, (int, float)) or isinstance(v, bool) or not -2 <= v <= 2:
                errs.append(f"{c['slug']}: axis {k}={v!r} is outside -2..2")
    for s in PERSONAS:
        if s not in BY_SLUG:
            errs.append(f"{s}: persona has no crew member in crew_data.py")
    vecs = {}
    for c in CREW:
        p = PERSONAS.get(c["slug"]) or {}
        v = tuple((p.get("axes") or {}).get(a) for a in AXES)
        if v in vecs:
            errs.append(f"{c['slug']}: same axes as {vecs[v]}, Find your crew can never tell them apart")
        vecs[v] = c["slug"]
    if errs:
        sys.exit("crew personas are broken:\n  " + "\n  ".join(errs))


def merch_card(mid, up, i, worn=True):
    name, price, slug = MERCH[mid]
    who = WEARER.get(mid)
    badge = (f'<img class="worn" src="{up}assets/crew/{who["img"]}_s.webp" alt="" loading="lazy">' if worn and who else "")
    return (f'<a class="mcard" href="{up}shop/#p={slug}" style="--bg:{CARD_BG[i % 6]};--tilt:{TILTS[i % 6]}">'
            f'{badge}<span class="pic"><img src="{up}assets/merch/{mid}.webp" alt="{e(name)}" loading="lazy" decoding="async"></span>'
            f'<span class="meta"><span><h3>{e(name)}</h3><span class="go">SHOP IT →</span></span><span class="pr">${price}</span></span></a>')


def pin(c, up, i):
    return (f'<a class="pin" href="{up}crew/{c["slug"]}/" style="--tilt:{TILTS[i % 6]}">'
            f'<img src="{up}assets/crew/{c["img"]}_m.webp" alt="{e(c["name"])}, {e(c["doing"])}" loading="lazy" decoding="async">'
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
            f'<nav aria-label="Main"><a href="{up}glass/">Glass</a> <a href="{up}shop/">Ritual merch</a> <a href="{up}crew/">The JB Crew</a> <a href="{up}crew/match/">Find your crew</a> <a href="{up}comics/">The Hot Shop</a> <a href="{up}#made">The story</a> <a href="{up}travel/" style="color:#FFF100">Travel guide</a> <a href="{up}wholesale/">Wholesale</a></nav></header>')


def scripts(up, weird=False):
    return (f'<script src="{up}js/crew-data.js"></script>\n<script src="{up}js/crew.js" defer></script>\n'
            f'<script src="{up}js/glitch.js" defer></script>\n<script src="{up}js/dock.js" defer></script>\n'
            # character pages also get the holo sample (js/holo/sample.js, off on the live site)
            + (f'<script src="{up}js/holo/sample.js" defer></script>\n<script src="{up}js/weird.js" defer></script>\n' if weird else ""))


CREW_NOTE = "The crew is fictional. The merch is real."


def site_footer(up, note=CREW_NOTE):
    """The one footer for home, crew pages and comics (the shop keeps its own contact-heavy one).
    index.html, comics/ and glass/ get it through their <!-- FOOT --> markers."""
    links = [("glass/", "Glass"), ("shop/", "Ritual merch"), ("crew/", "The JB Crew"), ("crew/match/", "Find your crew"),
             ("comics/", "The Hot Shop"), ("#made", "The story"), ("travel/", "Travel guide"), ("join/", "Join the JB fam")]
    nav = "".join(f'<li><a href="{up}{h}">{t}</a></li>' for h, t in links)
    return (f'<footer class="site-foot pad"><div class="sf-cols">'
            f'<img src="{up}assets/cut/tealjbd.webp" alt="JBD" width="200" height="122" loading="lazy" class="sf-mark">'
            f'<div><b>Say hi</b><a href="mailto:info@jeromebakerny.com">info@jeromebakerny.com</a>'
            f'<b>Wholesale</b><a href="{up}wholesale/">Stores and the NY program</a><a href="mailto:sales@jeromebakerny.com">sales@jeromebakerny.com</a></div>'
            f'<div><b>Explore</b><ul>{nav}</ul></div>'
            f'<div><b>Follow</b><a href="https://www.instagram.com/jerome_baker" target="_blank" rel="noopener">@jerome_baker</a>'
            f'<b>Find the glass</b><a href="https://jeromebaker.com/" target="_blank" rel="noopener">jeromebaker.com</a>'
            f'<b>Shop merch</b><a href="{up}shop/">Ritual merch</a></div></div>'
            f'<p class="sf-legal">© 2026 Jerome Baker Designs. Adults 21+ only. {note}</p></footer>')


def mate(slug, up, k):
    m = BY_SLUG[slug]
    return (f'<a class="mate" href="{up}crew/{slug}/" style="--tilt:{TILTS[k % 6]}">'
            f'<img src="{up}assets/crew/{m["img"]}_s.webp" alt="" loading="lazy" decoding="async"><span>{e(m["name"])}</span></a>')


def who_block(c, up):
    p = PERSONAS[c["slug"]]
    friends = "".join(mate(s, up, k) for k, s in enumerate(p["friends"])) or '<p class="none">Nobody yet.</p>'
    beef = "".join(mate(s, up, k + 3) for k, s in enumerate(p["beef"])) or '<p class="none">Gets along with everyone. Suspicious.</p>'
    return f"""<section class="who pad dots" aria-label="Who they are">
<div class="wrap">
<p class="who-tag">Who they are</p>
<h2 class="display who-type"><span>{e(p['type'])}</span></h2>
<p class="who-from"><span>From</span> {e(p['from_'])}</p>
<div class="who-grid">
<div class="who-story"><h3>The backstory</h3><p>{e(p['backstory'])}</p><p class="who-job"><b>At the Hot Shop:</b> {e(p['shop_job'])}</p></div>
<div class="who-vibe"><h3>Vibes with</h3><p>{e(p['vibes_with'])}</p></div>
<div class="who-love"><h3>Loves</h3><p>{e(p['loves'])}</p></div>
<div class="who-hate"><h3>Hates</h3><p>{e(p['hates'])}</p></div>
</div>
<div class="who-rel">
<div><h3>Crew friends</h3><div class="mates">{friends}</div></div>
<div><h3>Beef with</h3><div class="mates beef">{beef}</div></div>
</div>
</div>
</section>
"""


def match_cta(up, name=None):
    q = f"Is {e(name)} your crew?" if name else "Which one is your crew?"
    return (f'<section class="find-cta pad"><div class="wrap"><p class="display">{q}</p>'
            f'<p>Four quick questions. One crew member who gets you.</p>'
            f'<a class="btn btn-yellow" href="{up}crew/match/">Find your crew</a></div></section>\n')


def _size(rel):
    """Natural size of an image under assets/, so small sources are never blown up past 2x."""
    with Image.open(os.path.join(ROOT, "assets", rel)) as im:
        return im.size


KICK = {"box": "Straight off the box", "booth": "Off the booth wall", "collage": "Off the 2018 collage"}


def _check_origin():
    errs = []
    for c in CREW:
        o = ORIGIN.get(c["slug"])
        if not o:
            errs.append(f"{c['slug']}: no ORIGIN entry in crew_data.py")
            continue
        src, spot, words = o
        if src not in ORIGIN_SOURCES:
            errs.append(f"{c['slug']}: unknown origin source {src!r}")
        elif not os.path.exists(os.path.join(ROOT, "assets", ORIGIN_SOURCES[src]["img"])):
            errs.append(f"{c['slug']}: {ORIGIN_SOURCES[src]['img']} missing. Run python tools/build_origin.py")
        if len(spot) != 4 or spot[0] + spot[2] > 100.5 or spot[1] + spot[3] > 100.5 or not words:
            errs.append(f"{c['slug']}: bad origin spot {spot}")
    for rel, _ in MR_X_STEPS:
        if not os.path.exists(os.path.join(ROOT, "assets", rel)):
            errs.append(f"Mr. X step {rel} missing")
    if errs:
        sys.exit("crew origins are broken:\n  " + "\n  ".join(errs))


def origin_block(c, up):
    """Where they come from, right under the hero: the WHOLE piece of source art (box, booth wall, collage),
    then a smooth zoom into the character's spot (js/crew-kit.js), with a see-the-whole-thing toggle.
    Mr. X also gets his sketch -> mark -> character evolution."""
    src, spot, words = ORIGIN[c["slug"]]
    S, n = ORIGIN_SOURCES[src], e(c["name"])
    w, h = _size(S["img"])
    x, y, sw, sh = spot
    copy = " ".join(e(t.format(name=c["name"])) for t in S["copy"])
    steps = ""
    if c["slug"] == "mr-x":
        def step(k, rel, cap):
            if rel.endswith(".svg"):
                dim = 'width="300" height="285"'
            else:
                iw, ih = _size(rel)
                dim = f'width="{iw}" height="{ih}"'
            arrow = '<span class="og-arrow" aria-hidden="true">→</span>' if k else ""
            return (f'{arrow}<figure class="og-step"><span class="og-step-pic"><img src="{up}assets/{rel}" alt="" {dim} loading="lazy" decoding="async"></span>'
                    f'<figcaption><b>{k + 1}.</b> {e(cap)}</figcaption></figure>')
        steps = (f'<div class="og-evo"><h3>From a sketch to the mark to Mr. X</h3>'
                 f'<p>Mr. X started as a page of sketches: two bongs crossed into an X, drawn five different ways. '
                 f'If you know JB, you know that X. It became our crossed-bongs mark, and then the mark grew a face.</p>'
                 f'<div class="og-steps">' + "".join(step(k, rel, cap) for k, (rel, cap) in enumerate(MR_X_STEPS)) + '</div></div>')
    return (f'<section class="og pad" id="origin" aria-labelledby="ogT" data-kind="{S["kind"]}">'
            f'<div class="wrap og-in">'
            f'<div class="og-copy"><p class="og-kick">{KICK[S["kind"]]}</p>'
            f'<h2 id="ogT" class="display">Where {n} comes from</h2>'
            f'<p class="og-what">{e(S["title"])}</p>'
            f'<p class="og-txt">{copy}</p>'
            f'<p class="og-spot"><b>Find {n}:</b> {e(words)}</p></div>'
            f'<figure class="og-view">'
            f'<div class="og-frame" id="ogFrame" data-spot="{x},{y},{sw},{sh}" style="--ar:{w}/{h};--fa:{min(2, max(4 / 3, w / h)):.3f};--fa-m:{min(1.6, max(1, w / h)):.3f}">'
            f'<div class="og-stage" id="ogStage">'
            f'<img src="{up}assets/{S["img"]}" alt="{e(S["alt"])}. {n} is marked: {e(words)}" width="{w}" height="{h}" decoding="async">'
            f'<span class="og-mark" style="left:{x}%;top:{y}%;width:{sw}%;height:{sh}%"><span class="og-tag">{n}</span></span>'
            f'</div></div>'
            f'<figcaption class="og-bar"><button type="button" class="og-tog" id="ogTog" aria-pressed="false" '
            f'data-in="Zoom in on {n}" data-out="See the whole thing">Zoom in on {n}</button>'
            f'<span class="og-cap">{e(S["title"])}.' + (' The not-safe-for-work bits are taped over.' if S.get("taped", True) else ' Tap the art to zoom.') + '</span></figcaption>'
            f'</figure>{steps}</div></section>\n')


def gif_block(c, up):
    """Take them with you: the share kit. Video for Instagram/TikTok, plus GIF, MP4, avatar and sticker downloads.
    The MP4, avatar and sticker are pre-rendered by tools/build_share.py."""
    slug, n = c["slug"], e(c["name"])
    files = dict(gif=f"assets/gifs/{slug}.gif", mp4=f"assets/gifs/{slug}.mp4",
                 avatar=f"assets/crew/avatar/{slug}-320.png", sticker=f"assets/crew/sticker/{slug}.png")
    missing = [f for f in files.values() if not os.path.exists(os.path.join(ROOT, f))]
    if missing:
        sys.exit(f"{slug}: share kit files missing ({', '.join(missing)}). Run python tools/build_share.py")
    names = dict(gif=f"{slug}-jerome-baker.gif", mp4=f"{slug}-jerome-baker.mp4", avatar=f"{slug}-avatar.png", sticker=f"{slug}-sticker.png")
    thumb = {"avatar": f'<img src="{up}{files["avatar"]}" alt="" width="110" height="110" loading="lazy" decoding="async">',
             "sticker": f'<img class="kit-stk" src="{up}assets/crew/{c["img"]}_s.webp" alt="" width="110" height="110" loading="lazy" decoding="async">'}
    dl = lambda k, label, kind: (f'<a class="kit-dl kit-{k}" href="{up}{files[k]}" download="{names[k]}" type="{kind}">'
                                 f'{thumb.get(k, "")}<b>{label}</b><small>{e(names[k])}</small></a>')
    return (f'<section class="gif kit pad" id="kit" data-sticker="{up}{files["sticker"]}" data-sticker-name="{names["sticker"]}">'
            f'<div class="wrap gif-in">'
            f'<img src="{up}{files["gif"]}" alt="{n}, animated" width="480" height="480" loading="lazy" decoding="async">'
            f'<div><h2 class="display">Take {n} with you.</h2>'
            f'<p>A loop of {n} doing what {n} does. Post it, put it in the group chat, make it your icon.</p>'
            f'<div class="gif-acts"><button type="button" class="btn btn-yellow kit-share" id="kitShare" '
            f'data-mp4="{up}{files["mp4"]}" data-name="{names["mp4"]}">Share to Instagram / TikTok</button></div>'
            f'<p class="gif-note" id="gifNote" role="status" aria-live="polite"></p>'
            f'<p class="kit-h">Download</p><div class="kit-row">'
            + dl("gif", "GIF", "image/gif") + dl("mp4", "Video (MP4)", "video/mp4")
            + dl("avatar", "Avatar PNG", "image/png") + dl("sticker", "Sticker PNG", "image/png")
            + f'</div><p class="kit-how">On iPhone: Share, then <b>Save Video</b> puts it in Photos. Instagram and TikTok take the video, not the GIF.</p>'
            f'</div></div></section>\n')


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
<p class="cp-from"><a href="#origin">{e(KICK[ORIGIN_SOURCES[ORIGIN[c['slug']][0]]['kind']])}. See where {e(c['name'])} comes from ↓</a></p>
<div class="say"><span class="line" id="line">{e(c['lines'][0])}</span><button type="button" class="btn btn-ink" id="more">Say more</button></div>
</div>
</section>
{origin_block(c, up)}{who_block(c, up)}<section class="sheet pad">
<div class="wrap grid">
<div class="rap"><h2>Rap sheet</h2><dl>
<dt>Name</dt><dd>{e(c['name'])}</dd>
<dt>Currently</dt><dd>{e(c['doing'])}</dd>
<dt>Known for</dt><dd>{e(c['known'])}</dd>
<dt>Weakness</dt><dd>{e(c['weakness'])}</dd>
<dt>Wearing</dt><dd>{e(', '.join(MERCH[m][0] for m in c['wear']))}</dd>
</dl></div>
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
{gif_block(c, up)}{match_cta(up, c['name'])}<nav class="crew-nav pad" aria-label="More crew">
<a href="../{prev['slug']}/"><img src="{up}assets/crew/{prev['img']}_s.webp" alt="" loading="lazy">← {e(prev['name'])}</a>
<a href="../">The whole crew</a>
<a href="../{nxt['slug']}/">{e(nxt['name'])} →<img src="{up}assets/crew/{nxt['img']}_s.webp" alt="" loading="lazy"></a>
</nav>
</main>
{site_footer(up)}
</div>
{scripts(up, weird=True)}<script src="{up}js/crew-kit.js" defer></script>
<script>
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
    return head("The JB Crew. Jerome Baker", "Twenty characters off the Jerome Baker box art, in real JB merch, doing weird things.", up) + f"""<body data-crew-count="8" data-glitch="psycho">
<a class="skip" href="#main">Skip to content</a>
<div class="page">
{topbar(up)}
<main id="main">
<section class="crew pad">
<div class="wrap">
<h1 class="display" style="margin:0;font-size:clamp(64px,11vw,170px);line-height:.85;letter-spacing:-.03em;rotate:-2deg;text-shadow:6px 6px 0 #0A0A0A">The JB<br><span style="color:#FFF100">Crew.</span></h1>
<p class="lede">Twenty lunatics off the box art and the old posters. They got dressed in real JB merch and stopped taking direction. Now they float around the site doing whatever they want. Grab one and throw it. Tap one and it talks back. Every one of them has a page and a rap sheet.</p>
<p class="find-inline"><a class="btn btn-yellow" href="../crew/match/">Find your crew</a><span>Four questions. We match you to the one who gets you.</span></p>
<div class="pinboard">{pins}</div>
</div>
</section>
{match_cta(up)}</main>
{site_footer(up)}
</div>
{scripts(up)}</body>
</html>
"""


def match_page():
    up = "../../"
    return head("Find your crew. The JB Crew", "Four questions, adults only. How high you are, your likeliest crime, your freak scale and your pick from the basket. We match you to the JB Crew member who fits.", up,
                f'<link rel="stylesheet" href="{up}css/match.css">\n') + f"""<body data-crew-count="2" data-glitch="hello">
<a class="skip" href="#main">Skip to content</a>
<div class="page">
{topbar(up)}
<main id="main">
<section class="mx pad dots">
<img class="mx-st s1" src="{up}assets/crew/lion_s.webp" alt="" aria-hidden="true" width="160" height="160">
<img class="mx-st s2" src="{up}assets/crew/cobra_s.webp" alt="" aria-hidden="true" width="150" height="150">
<img class="mx-st s3" src="{up}assets/crew/bot_s.webp" alt="" aria-hidden="true" width="140" height="140">
<div class="wrap">
<h1 class="display mx-h"><span>Find your</span><br><span class="y">crew.</span></h1>
<p class="mx-lede">Twenty lunatics off the Jerome Baker box art. One of them is basically you. Four questions, no wrong answers, a few wrong people.</p>
<div class="mx-stage" id="stage">
<noscript><p class="mx-card">Find your crew needs JavaScript. You can still <a href="../">meet the whole crew</a>.</p></noscript>
</div>
</div>
</section>
</main>
{site_footer(up)}
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
{scripts(up)}<script src="{up}js/match.js" defer></script>
</body>
</html>
"""


def redirect_page(old, new):
    """A tiny page left at an old crew URL so links from before a rename still land."""
    url = f"https://jeromebaker.cannacrypted.com/crew/{new}/"
    name = e(BY_SLUG[new]["name"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name}. The JB Crew</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{url}">
<meta http-equiv="refresh" content="0; url=../{new}/">
<script>location.replace('../{new}/' + location.search + location.hash);</script>
</head>
<body style="font-family:sans-serif;background:#2A3B8E;color:#fff;padding:24px"><p>{name} has a new page. <a href="../{new}/" style="color:#FFF100">Go there</a>.</p></body>
</html>
"""


def write(path, text):
    # site-wide feedback button (js/feedback.js) on every generated page
    if path.endswith(".html") and "site-foot" in text and "js/feedback.js" not in text:
        up = "../" * path.replace("\\", "/").count("/")
        text = text.replace("</body>", f'<script src="{up}js/feedback.js" defer></script>\n</body>', 1)
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def fill_footer(s, up, note):
    if "<!-- FOOT -->" not in s:
        raise SystemExit("missing <!-- FOOT --> markers")
    return re.sub(r"<!-- FOOT -->.*?<!-- /FOOT -->", lambda m: f"<!-- FOOT -->{site_footer(up, note)}<!-- /FOOT -->", s, flags=re.S)


def main():
    check_personas()
    _check_origin()
    data = []
    for c in CREW:
        d = {k: c[k] for k in ("slug", "img", "name", "title", "doing", "lines", "color")}
        p = PERSONAS[c["slug"]]
        for f in PUBLIC_FIELDS:
            d["from" if f == "from_" else f] = p[f]
        d["axes"] = {a: p["axes"][a] for a in AXES}
        d["brief"] = brief(c["slug"], c)
        d["wear"] = [dict(id=m, name=MERCH[m][0], price=MERCH[m][1], slug=MERCH[m][2]) for m in c["wear"]]
        data.append(d)
    write("js/crew-data.js", "// Generated by tools/build_crew.py. Edit tools/crew_data.py and tools/crew_personas.py instead.\nwindow.JB_CREW = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
          + "window.JB_AXES = " + json.dumps(AXES) + ";\n"
          + "// old crew slug -> new, so Find your crew links from before a rename (#old-slug) still resolve\n"
          + "window.JB_RENAMED = " + json.dumps(RENAMED) + ";\n")
    write("crew/index.html", crew_index())
    write("crew/match/index.html", match_page())
    for i, c in enumerate(CREW):
        write(f"crew/{c['slug']}/index.html", crew_page(c, i))
    for old, new in RENAMED.items():
        if old in BY_SLUG or new not in BY_SLUG:
            sys.exit(f"RENAMED {old} -> {new}: the old slug is still live or the new one is unknown")
        write(f"crew/{old}/index.html", redirect_page(old, new))
    idx = os.path.join(ROOT, "index.html")
    s = open(idx, encoding="utf-8").read()
    pins = "".join(pin(c, "", i) for i, c in enumerate(CREW))
    shop = "".join(merch_card(m, "", i) for i, m in enumerate(SHOP))
    s = re.sub(r"<!-- CREW -->.*?<!-- /CREW -->", lambda m: f"<!-- CREW -->{pins}<!-- /CREW -->", s, flags=re.S)
    s = re.sub(r"<!-- SHOP -->.*?<!-- /SHOP -->", lambda m: f"<!-- SHOP -->{shop}<!-- /SHOP -->", s, flags=re.S)
    s = fill_footer(s, "", "Glass ships from the studio with its provenance record. Streetwear ships from Ritual Merch.")
    write("index.html", s)
    cp = os.path.join(ROOT, "comics", "index.html")
    if os.path.exists(cp):
        write("comics/index.html", fill_footer(open(cp, encoding="utf-8").read(), "../",
              "The Hot Shop is fiction. Nobody should do any of this. Hot glass burns."))
    gp = os.path.join(ROOT, "glass", "index.html")
    if os.path.exists(gp):
        write("glass/index.html", fill_footer(open(gp, encoding="utf-8").read(), "../",
              "Every piece is one of one. Prices and availability come live from the studio."))
    print(f"built {len(CREW)} crew pages, {len(RENAMED)} old-slug redirects, crew/match/, {len(SHOP)} shop cards")


if __name__ == "__main__":
    main()

# site rule: flaggable words get number/symbol swaps (b0ng, p!pe, sm0ke...). See tools/scrub.py.
import scrub as _scrub  # noqa: E402
_scrub.main()
