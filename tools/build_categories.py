"""Builds the 13 glass category pages the redirects land on: /glass/<slug>/index.html.

Each page is the real Glass showcase (same shelves, tiles, bench, zoom, hit), filtered to the pieces in that category,
with its own title, description, canonical, H1, intro, breadcrumb and JSON-LD, plus a plain HTML list of the pieces
that crawlers read before the script draws the shelves. Membership comes from the data in js/glass-data.js (shelf and
piece names), so a piece is never invented, only grouped. Run:  python tools/build_categories.py
Then it runs the site scrub over what it wrote (bong and pipe keep real spelling in title, description, h1, alt, JSON-LD)."""
import json, re, sys
from html import escape as esc
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import scrub  # noqa: E402

HOST = 'https://jeromebaker.com'
data = (ROOT / 'js' / 'glass-data.js').read_text(encoding='utf-8')
D = json.loads(data[data.index('{'):data.rindex('}') + 1])
P = D['pieces']
BY = {p['id']: p for p in P}


def shelf(*keys):
    return [p['id'] for p in P if p['shelf'] in keys]


def named(*names):
    out = []
    for n in names:
        hit = [p['id'] for p in P if p['name'].strip() == n.strip()]
        assert hit, n
        out += hit
    return out


def ends(*tails):
    out = []
    for t in tails:
        hit = [p['id'] for p in P if p['id'].endswith(t)]
        assert hit, t
        out += hit
    return out


EVO = [p['id'] for p in P if p['name'].startswith('EVO ')]
CATS = [
    dict(slug='bongs', words=('Hand-blown', 'bongs', 'since 1991.'), title='Jerome Baker Bongs: Hand-Blown Glass Bongs',
         desc='Every Jerome Baker bong, hand-blown and one of one: giant bongs, Limited Edition and Original Series Baker Classics, each with its provenance on file.',
         lede='Four-foot giants, Limited Edition crown pieces and the fifteen-inch Original Series that started it. Every bong is hand-blown and registered with its own ID before it leaves the studio.',
         ids=shelf('giant', 'le', 'og'), drop=named('Planet Nugg NY Official Launch ')),
    dict(slug='studio', words=('Studio', 'one-offs', 'off the bench.'), title='Jerome Baker Studio Glass: One-of-One Showpieces',
         desc='Rigs, bubblers, beakers and showpieces off the Jerome Baker studio bench, sold straight from the studio store. One of one.',
         lede='Rigs, bubblers and showpieces off the bench, from Jason Harris and the glass artists who work with the studio. Each one is the only one, and checkout and shipping happen on jeromebaker.com.',
         ids=shelf('studio')),
    dict(slug='dab-rigs', words=('Dab', 'rigs', 'that look the part.'), title='Jerome Baker Dab Rigs: Stained Glass and Studio Rigs',
         desc='Jerome Baker dab rigs, handmade in the USA. The Stained Glass rigs and the opal-set Ethereal Harvest.',
         lede='Rigs made for dabbing, handmade in the USA. The Stained Glass pair carry the colors of church windows, and Ethereal Harvest is set with scattered opals.',
         ids=named('Ethereal Harvest', 'Iridium Illusion', 'Mystique Mirage'), only=['SHP-8948052295917', 'SHP-8948012941549', 'SHP-8320563609837']),
    dict(slug='accessories', words=('Accessories', 'for your', 'glass.'), title='Jerome Baker Glass Accessories: Bowls, Downstems and Kits',
         desc='Bowls, downstems, rolling tips, trays, pendants and the fix-it kit. The parts that keep a Jerome Baker piece working.',
         lede='The parts that keep a piece working, and a few things to carry with it. Bowls, downstems, rolling tips, trays, pendants and the fix-it kit.',
         ids=shelf('kit') + named('JBD Little Dipper Dip Device', 'Pumpkin Spice Pendant')),
    dict(slug='tommy-chong', words=('The Chong', 'bong', 'pieces.'), title='The Chong Bong by Jerome Baker',
         desc='The Limited Edition Chong Bong and its design prototype Patient Zero, one of one, from Jerome Baker.',
         lede='A worked portrait millie set at the joint, wig-wag bands at the crown and a reversal swirl on the base. The Limited Edition Chong B0ng and the one-of-one prototype that came before it.',
         ids=named('The Chong B0ng', 'Patient Zero')),
    dict(slug='calumets', words=('Calumets', 'from the', 'old school.'), title='Jerome Baker Calumets: Hand-Crafted Hammer Pipes',
         desc='Jerome Baker calumets, hand-crafted hammer-style pipes out of Eugene, Oregon glass history. Dusk Dreamer, one of one.',
         lede='Hand-crafted hammers that hark back to where it all started, Eugene, Oregon. Dusk Dreamer is the calumet in the studio store right now.',
         ids=named('Dusk Dreamer')),
    dict(slug='limited-edition', words=('Limited', 'Edition', 'crown pieces.'), title='Jerome Baker Limited Edition Glass',
         desc='The Limited Edition Series: wig-wag, millies, knuckles and marbles worked at the bench and signed off as one of one.',
         lede='The crown pieces. Wig-wag, millies, knuckles and marbles, worked at the bench and signed off as one of one. Sold pieces stay on the shelf so you can see where they went.',
         ids=shelf('le')),
    dict(slug='original-series', words=('Original', 'Series', 'Bakers.'), title='Jerome Baker Original Series Bongs',
         desc='The fifteen-inch Baker silhouette that started it: fumed bulb, straight tube, built to hit and built to last. Original Series, one of one.',
         lede='The fifteen-inch Baker silhouette that started it. Fumed bulb, straight tube, built to hit and built to last. Twenty-two pieces, each the only one.',
         ids=shelf('og')),
    dict(slug='everyday', words=('Everyday', 'glass', 'you reach for.'), title='Jerome Baker Everyday Glass: Beakers, Tubes and Jars',
         desc='Everyday Jerome Baker glass: EVO beakers and straights, Everyday Steeze bowls, collectible jars, Clearboys and Skeeter lunch boxes.',
         lede='The pieces you actually reach for. EVO beakers and straights, Everyday Steeze, jars, Clearboys and the Skeeter lunch boxes.',
         ids=shelf('daily')),
    dict(slug='spirit-creatures', words=('Spirit', 'Creatures', 'one by one.'), title='Jerome Baker Spirit Creatures: Handmade Glass Sea Animals',
         desc='Little sea animals worked in clear and color, each one numbered: turtles, whales, octopus, starfish and dolphins. Handmade glass by Jerome Baker.',
         lede='Little sea animals worked in clear and color, each one numbered. Turtles, whales, octopus, starfish.',
         ids=shelf('creatures')),
    dict(slug='tubes', words=('Tubes,', 'beakers', 'and straights.'), title='Jerome Baker Glass Tubes: EVO Beakers and Straights',
         desc='Jerome Baker glass tubes: EVO beakers and straights in 38mm by 12 and 16 inches, plus the Cactus Mirage and Iridium Illusion beakers.',
         lede='Straight tubes and beaker bases in 38mm, twelve and sixteen inches, in blue and red. Plus two studio beakers from the EHLE x JBD collab.',
         ids=EVO + named('Cactus Mirage') + ends('176365')),
    dict(slug='pipes', words=('Pipes', 'from', 'Maui.'), title='Jerome Baker Pipes: Jason Harris Maui Originals',
         desc='Hand pipes made by Jason Harris in his Maui studio, every marble fumed and encased in molten clear glass. One of one.',
         lede='Hand pipes Jason makes in his Maui studio. Every marble is fumed, then encased in molten clear glass and folded, so the color moves through bands of changing iridescence.',
         ids=shelf('maui') + named('Planet Nugg NY Official Launch ')),
    dict(slug='second-life', words=('Second', 'Life', 'jars.'), title='Jerome Baker Second Life Jars: Cork-Top Glass Jars',
         desc='Worked tubes rebuilt into cork-top jars. Each Second Life jar was something else first, and each one is one of one.',
         lede='Worked tubes rebuilt into cork-top jars. Each one was something else first.',
         ids=shelf('second')),
]


LABEL = {'bongs': 'Bongs', 'studio': 'Studio one-offs', 'dab-rigs': 'Dab rigs', 'accessories': 'Accessories', 'tommy-chong': 'The Chong Bong',
         'calumets': 'Calumets', 'limited-edition': 'Limited Edition', 'original-series': 'Original Series', 'everyday': 'Everyday glass',
         'spirit-creatures': 'Spirit Creatures', 'tubes': 'Tubes', 'pipes': 'Pipes', 'second-life': 'Second Life'}
MARK = '<!--catlinks-->'
CATCSS = '.catlinks{padding:28px clamp(16px,4vw,48px);background:#0A0A0A;color:#fff;font-weight:700;line-height:2.2}.catlinks b{font:700 12px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--yellow);margin-right:10px}.catlinks a{display:inline-block;margin:0 10px 0 0;padding:2px 12px;border:2px solid var(--yellow);color:#fff;text-decoration:none}.catlinks a:hover{background:var(--yellow);color:#0A0A0A}'


def catlinks(prefix, skip=None):
    li = ''.join(f'<a href="{prefix}{k}/">{v}</a> ' for k, v in LABEL.items() if k != skip)
    return (MARK + '<nav class="catlinks" aria-label="Browse the glass by type"><b>Browse by type</b> ' + li + '</nav>' + MARK)


def piece_rows(ids):
    out = []
    for i in ids:
        p = BY[i]
        status = {'available': 'Available', 'sold': 'Sold', 'collected': 'In a collection'}.get(p['status'], p['status'])
        price = f"${p['price']:,.0f}"
        out.append(f'<li><a href="#p={esc(p["id"])}"><b>{esc(p["name"])}</b></a> {esc(p.get("series") or "")}, {price}, {status}.</li>')
    return '\n'.join(out)


def sort_ids(ids):
    return sorted(dict.fromkeys(ids), key=lambda i: ({'available': 0, 'sold': 1, 'collected': 2}.get(BY[i]['status'], 3), -BY[i]['price']))


tpl = (ROOT / 'glass' / 'index.html').read_text(encoding='utf-8')
LD_SEP = '</head>'


def build(c):
    ids = c.get('only') or c['ids']
    ids = [i for i in dict.fromkeys(ids) if i not in c.get('drop', [])]
    assert ids, c['slug']
    ids = sort_ids(ids)
    hero = BY[ids[0]]
    html = tpl
    # one level deeper than /glass/
    html = html.replace('data-base="../"', 'data-base="../../"')
    html = re.sub(r'(href|src|content)="\.\./', r'\1="../../', html)
    html = html.replace('href="./"', 'href="../"')
    # head
    url = f'{HOST}/glass/{c["slug"]}/'
    html = re.sub(r'<title>.*?</title>', f'<title>{esc(c["title"])}</title>', html, 1, re.S)
    html = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(c["desc"])}">', html, 1)
    html = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(c["title"])}">', html, 1)
    html = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(c["desc"])}">', html, 1)
    html = re.sub(r'<link rel="preload" as="image" href="[^"]*">', f'<link rel="preload" as="image" href="../../assets/glass/{hero["id"]}.webp">', html, 1)
    crumbs = [("Home", HOST + "/"), ("Glass", HOST + "/glass/"), (c['words'][1] if False else c['title'].split(':')[0], url)]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "name": c['title'], "description": c['desc'], "url": url,
         "isPartOf": {"@type": "WebSite", "name": "Jerome Baker", "url": HOST + "/"},
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(ids), "itemListElement": [
             {"@type": "ListItem", "position": n + 1, "name": BY[i]['name'], "url": f"{url}#p={i}"} for n, i in enumerate(ids)]}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": n + 1, "name": nm, "item": u} for n, (nm, u) in enumerate(crumbs)]}]}
    css = ('<style>.ghero h1{font-size:clamp(30px,4.4vw,62px)}.crumbs{margin:0 0 14px;font:700 12px/1.2 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:#fff}'
           '.crumbs a{color:var(--yellow)}.catlinks{padding:28px clamp(16px,4vw,48px);background:#0A0A0A;color:#fff;font-weight:700;line-height:2.2}.catlinks b{font:700 12px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--yellow);margin-right:10px}.catlinks a{display:inline-block;margin:0 10px 0 0;padding:2px 12px;border:2px solid var(--yellow);color:#fff;text-decoration:none}.catlinks a:hover{background:var(--yellow);color:#0A0A0A}.seo-list{max-width:900px;margin:0 auto;padding:24px;color:#fff;list-style:none}</style>' + chr(10))
    head_add = (css + f'<link rel="canonical" href="{url}">' + chr(10) + '<meta name="robots" content="index,follow">' + chr(10)
                + f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' + chr(10))
    html = html.replace(LD_SEP, head_add + LD_SEP, 1)
    # hero copy
    a, b, d = c['words']
    crumb = f'<nav class="crumbs" aria-label="Breadcrumb"><a href="../../">Home</a> / <a href="../">Glass</a> / {esc(c["title"].split(":")[0].replace("Jerome Baker ", ""))}</nav>' + chr(10)
    html = re.sub(r'<h1>.*?</h1>', crumb + f'<h1>\n<span style="background:#FFF100;color:#0A0A0A;rotate:-2deg">{esc(a)}</span>\n<span style="background:#FFFFFF;color:#2A3B8E;rotate:1.5deg">{esc(b)}</span>\n<span style="background:#DA2342;color:#FFFFFF;rotate:-1deg">{esc(d)}</span>\n</h1>', html, 1, re.S)
    html = re.sub(r'<p class="lede">.*?</p>', f'<p class="lede">{esc(c["lede"])}</p>', html, count=1, flags=re.S)
    html = re.sub(r'<img src="\.\./\.\./assets/glass/JBD-30A28BA0570D\.webp" alt="[^"]*" width="\d+" height="\d+"', lambda m: f'<img src="../../assets/glass/{hero["id"]}.webp" alt="{esc(hero["name"])}, {esc(hero.get("shape") or "glass")} by Jerome Baker" width="{hero["w"]}" height="{hero["h"]}"', html, 1)
    html = html.replace('aria-label="Open The Alien"', f'aria-label="Open {esc(hero["name"])}"')
    # crawlable list, replaced by the shelves when the script runs
    html = html.replace('<div id="aisles"></div>', f'<div id="aisles"><ul class="seo-list">\n{piece_rows(ids)}\n</ul></div>', 1)
    html = html.replace('<section class="promise pad">', catlinks('../', c['slug']) + '<section class="promise pad">', 1)
    # filter the data to this category before glass.js draws
    flt = ('<script>(function(){var ids=' + json.dumps(ids) + ';var F=window.JBGlassFeed;var r=F?F.ready:Promise.resolve();'
           'var done=r.then(function(){var D=window.JB_GLASS,by={},k={};D.pieces.forEach(function(p){by[p.id]=p});'
           'D.pieces=ids.map(function(i){return by[i]}).filter(Boolean);D.pieces.forEach(function(p){k[p.shelf]=1});'
           'D.shelves=D.shelves.filter(function(s){return k[s.key]})});if(F)F.ready=done;else window.JBGlassFeed={ready:done};})();</script>\n')
    html = html.replace('<script src="../../js/anim-data.js">', flt + '<script src="../../js/anim-data.js">', 1)
    return scrub.html(html), ids


def main():
    sm = []
    for c in CATS:
        out, ids = build(c)
        d = ROOT / 'glass' / c['slug']
        d.mkdir(exist_ok=True)
        (d / 'index.html').write_text(out, encoding='utf-8', newline='\n')
        print(f"{c['slug']:18} {len(ids):3} pieces")
        sm.append(c['slug'])
    g = ROOT / 'glass' / 'index.html'
    gh = g.read_text(encoding='utf-8')
    block = catlinks('', None)
    if MARK in gh:
        gh = re.sub(re.escape(MARK) + '.*?' + re.escape(MARK), lambda m: block, gh, count=1, flags=re.S)
    else:
        gh = gh.replace('<section class="promise pad">', block + '<section class="promise pad">', 1)
    if '.catlinks{' not in gh:
        gh = gh.replace('</head>', '<style>' + CATCSS + '</style>' + chr(10) + '</head>', 1)
    g.write_text(scrub.html(gh), encoding='utf-8', newline='')
    (HERE / 'categories.json').write_text(json.dumps(sm), encoding='utf-8')


if __name__ == '__main__':
    main()
