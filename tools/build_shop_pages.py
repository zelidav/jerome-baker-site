"""Static, crawlable pages for the shop: one /shop/<slug>/ page per product, one /shop/<category>/ page per category,
a browse-all link list on /shop/, and netlify/shop-redirects.txt (old /products/<handle> URLs -> the new pages).

Why: the shop used to be one URL with a modal, so no product could rank, be shared with its own card, or get a rich
result. These pages carry their own title, description, H1, canonical, Open Graph, Product JSON-LD and breadcrumbs,
and the grid cards are real links to them.

Data: js/shop-data.js (built by tools/build_shop.py) with the live merch feed laid over it, the same rule
js/shop-feed.js applies in the browser: www.jeromebaker.shop items come from the feed, older copies of them go.
Feed: the shop-feed branch (raw.githubusercontent.com), or a local file:  python tools/build_shop_pages.py [feed.json]

Search-rank rule (tools/scrub.py): <title>, meta description, <h1>, image alt and JSON-LD keep the real spelling of
bong, pipe, dab and bowl; body text and og:/twitter: text stay swapped. This script builds each zone with
scrub.seo()/scrub.prose() and then runs the finished page through scrub.html(), which must change nothing.

Idempotent. After the Dec 8 cutover set ASSET_HOST to HOST so og:image of site-hosted photos points at jeromebaker.com.
"""
import html as _html
import json, shutil
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scrub  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
HOST = 'https://jeromebaker.com'  # canonical host
ASSET_HOST = 'https://jeromebaker.cannacrypted.com'  # where site-hosted photos resolve today (flip to HOST at cutover)
FEED = 'https://raw.githubusercontent.com/zelidav/jerome-baker-site/shop-feed/shop-feed.json'
SHOP_STORE = 'https://www.jeromebaker.shop'
NOT_SELLABLE = {'shp-' + h for h in ('womenssmoking-slacks', 'soho-baker-beach-towel', 'tote-bag-aop', 'smoking-dress',
                                     'bed-time-baker-womens-satin-pajamas', 'jbd-jerome-baker-designs-small-cell-phone-wallet', 'bucket-hat-aop', 'mesh-cap', 'two-tier-bento-box')}
SIZE_ORDER = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', 'S/M', 'L/XL']
RESERVED = {'index', 'css', 'js', 'assets'}
CATPATH = {}  # category name -> URL segment (set in main, after product paths are known)
NL = chr(10)
esc = lambda s: _html.escape(str(s), quote=True)  # noqa: E731


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', re.sub(r'[’\']', '', s.lower())).strip('-')


def load():
    src = (ROOT / 'js' / 'shop-data.js').read_text(encoding='utf-8')
    head = 'window.JBShop = '
    data = json.loads(src[src.index(head) + len(head):src.rindex(';')])
    feed = None
    try:
        arg = sys.argv[1] if len(sys.argv) > 1 else None
        raw = Path(arg).read_bytes() if arg else urllib.request.urlopen(FEED, timeout=30).read()
        feed = json.loads(raw.decode('utf-8'))
    except Exception as e:  # noqa: BLE001  (the built data alone is a fine fallback)
        print('feed not used:', e)
    items = data['items']
    if feed and len(feed.get('items', [])) >= 5:
        fresh = feed['items']
        have = {p['id'] for p in fresh}
        is_shop = lambda p: p.get('shop') == 'shopify' and p.get('store') == SHOP_STORE  # noqa: E731
        items = [p for p in items if not is_shop(p) and p['id'] not in have] + fresh
    shop = [p for p in items if p.get('shop') == 'shopify' and p.get('store') == SHOP_STORE]
    norm = lambda s: re.sub(r'[^a-z0-9]+', '', s.lower())  # noqa: E731
    slugs, names = {p['slug'] for p in shop}, {norm(p['name']) for p in shop}
    kept = []
    for p in items:
        if p.get('shop') == 'shopify':
            if p['slug'] in NOT_SELLABLE:
                continue
            if p not in shop and (p['slug'] in slugs or norm(p['name']) in names):
                continue
        kept.append(p)
    data['items'] = [p for p in kept if valid(p)]
    dropped = len(kept) - len(data['items'])
    if dropped:
        print(f'skipped {dropped} item(s) that failed validation')
    return data


HTTPS = re.compile(r'^https://[^\s"<>]+$')
SAFE_SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
LOCAL_IMG = re.compile(r'^assets/[\w./-]+$')


def valid(p):
    """Anything that becomes a URL path, link or image address must look like one: the feed comes from outside this repo."""
    try:
        path = re.sub(r'^shp-', '', p['slug']) if p.get('shop') == 'shopify' else p['slug']
        return bool(SAFE_SLUG.match(path) and HTTPS.match(p['url']) and isinstance(p['id'], int) and isinstance(p['price'], (int, float))
                    and p['imgs'] and all(isinstance(i, str) and (HTTPS.match(i) or LOCAL_IMG.match(i)) for i in p['imgs']))
    except (KeyError, TypeError):
        return False


PATHS_FILE = ROOT / 'tools' / 'shop-paths.json'
PATHS = {}  # product slug -> URL segment. FROZEN once assigned (committed), so renaming a product never moves its URL


def legacy_path(p):
    return re.sub(r'^shp-', '', p['slug']) if p.get('shop') == 'shopify' else p['slug']


def path_of(p):
    return PATHS[p['slug']]


def assign_paths(items):
    """Shopify products get a clean URL from their current (real-spelling) title; existing assignments never change."""
    if PATHS_FILE.exists():
        PATHS.update(json.loads(PATHS_FILE.read_text(encoding='utf-8')))
    taken = set(PATHS.values()) | RESERVED
    for p in items:
        if p['slug'] in PATHS:
            continue
        base = slugify(scrub.seo(p['name']).translate(scrub.SEO_UNSWAP)) if p.get('shop') == 'shopify' else p['slug']
        seg, i = base, 2
        while seg in taken:
            seg = f'{base}-{i}'
            i += 1
        PATHS[p['slug']] = seg
        taken.add(seg)
    PATHS_FILE.write_text(json.dumps(dict(sorted(PATHS.items())), indent=1) + NL, encoding='utf-8', newline='')
    (ROOT / 'js' / 'shop-paths.js').write_text('window.JBShopPaths=' + json.dumps({p['slug']: PATHS[p['slug']] for p in items}, separators=(',', ':')) + ';' + NL, encoding='utf-8', newline='')


def money(n):
    return '$' + (str(int(n)) if float(n).is_integer() else f'{n:.2f}')


def img_abs(src, w=None):
    if src.startswith('http'):
        return src + (f'?width={w}' if w and 'cdn.shopify.com' in src else '')
    return f'{ASSET_HOST}/{src}'


def img_rel(src, up, w=None):
    if src.startswith('http'):
        return src + (f'?width={w}' if w and 'cdn.shopify.com' in src else '')
    return up + src


def sorted_terms(a):
    vals = [t[0] for t in a['terms']]
    if all(v in SIZE_ORDER for v in vals):
        vals.sort(key=SIZE_ORDER.index)
    return vals


def chrome():
    """Header block and footer of /shop/, re-based for pages one level deeper."""
    page = (ROOT / 'shop' / 'index.html').read_text(encoding='utf-8')
    top = page[page.index('<div class="ticker"'):page.index('<main id="main">')]
    foot = page[page.index('<div class="strip torn'):page.index('<dialog')]
    out = []
    for blk in (top, foot):
        blk = re.sub(r'(href|src)="\.\./', r'\1="../../', blk)
        blk = blk.replace('href="./"', 'href="../"')
        blk = re.sub(r'href="(#[^"]*)"', r'href="../\1"', blk)
        out.append(blk)
    return out


HEAD = '''<!doctype html>
<html lang="en" data-base="../../">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#2A3B8E">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="{ogtype}">
<meta property="og:site_name" content="Jerome Baker">
<meta property="og:url" content="{canon}">
<meta property="og:title" content="{ogtitle}">
<meta property="og:description" content="{ogdesc}">
<meta property="og:image" content="{ogimg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{ogtitle}">
<meta name="twitter:description" content="{ogdesc}">
<meta name="twitter:image" content="{ogimg}">
<link rel="icon" href="../../favicon.ico" sizes="any">
<link rel="icon" href="../../assets/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../../assets/icons/apple-touch-icon.png">
<link rel="manifest" href="../../site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/site.css">
<link rel="stylesheet" href="../../css/crew.css">
<link rel="stylesheet" href="../../css/glitch.css">
<link rel="stylesheet" href="../../css/shop.css">
<link rel="stylesheet" href="../../css/shop-page.css">
<link rel="stylesheet" href="../../css/antics.css">
{ld}<script defer src="/js/analytics.js"></script>
</head>
<body data-crew-count="4" data-glitch="clip">
<a class="skip" href="#main">Skip to content</a>
<div class="page" id="page">
'''

TAIL = '''</div>
<script src="../../js/crew-data.js"></script>
<script src="../../js/crew.js" defer></script>
{extra}<script src="../../js/dock.js" defer></script>
<script src="../../js/feedback.js" defer></script>
</body>
</html>
'''


def ld_tag(obj):
    # feed text is untrusted: no </script> or <!-- can end the block early
    body = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    body = body.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return '<script type="application/ld+json">' + body + '</script>' + NL


def card_html(p, up):
    return (f'<a class="pp-card" href="{up}{esc(path_of(p))}/"><img src="{esc(img_rel(p["imgs"][0], up + "../", 480))}" alt="{esc(scrub.seo(p["name"]))}" '
            f'width="240" height="240" loading="lazy" decoding="async"><b>{esc(p["name"])}</b><span>{money(p["price"])}</span></a>')


def product_page(p, data, top, foot, by_cat, twin=''):
    slug = path_of(p)
    canon = f'{HOST}/shop/{slug}/'
    name_seo, name_body = scrub.seo(p['name']), p['name']
    desc = re.sub(r'\s+', ' ', p.get('desc') or '').strip()
    short = desc if len(desc) <= 155 else desc[:152].rsplit(' ', 1)[0] + '...'
    meta_desc = scrub.seo(f'{p["name"]}. {short or "Jerome Baker ritual merch."} {money(p["price"])}. Jerome Baker, since 1991.')
    cat = next((c for c in p['cats'] if c not in ('Studio Store', 'Collections')), p['cats'][0])
    store_name = re.sub(r'^https://(www\.)?', '', p.get('store') or data['store']) if p.get('shop') == 'shopify' else 'jeromebakerny.com'
    imgs = p['imgs']
    ogimg = img_abs(imgs[0], 1200)
    crew = data['crew'].get(p.get('crew'))
    attrs = p['attrs']
    in_stock = p.get('inStock', True)
    offer = {'@type': 'Offer', 'priceCurrency': 'USD', 'price': f'{p["price"]:.2f}', 'url': canon, 'itemCondition': 'https://schema.org/NewCondition',
             'availability': 'https://schema.org/InStock' if in_stock else 'https://schema.org/OutOfStock'}
    prices = len(p['variations'])
    if prices > 1:
        offer = {'@type': 'AggregateOffer', 'priceCurrency': 'USD', 'lowPrice': f'{p["price"]:.2f}', 'offerCount': prices, 'url': canon,
                 'availability': offer['availability']}
    product = {'@context': 'https://schema.org', '@type': 'Product', 'name': p['name'], 'image': [img_abs(i, 1200) for i in imgs[:6]],
               'description': desc[:500] or p['name'], 'sku': str(p['id']), 'brand': {'@type': 'Brand', 'name': 'Jerome Baker'}, 'url': canon,
               'category': cat, 'offers': offer}
    crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOST + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Ritual Merch', 'item': HOST + '/shop/'},
        {'@type': 'ListItem', 'position': 3, 'name': cat, 'item': f'{HOST}/shop/{CATPATH[cat]}/'},
        {'@type': 'ListItem', 'position': 4, 'name': p['name'], 'item': canon}]}
    head = HEAD.format(title=esc(f'{name_seo}{twin}. Ritual Merch. Jerome Baker'), desc=esc(meta_desc), canon=canon, ogtype='product',
                       ogtitle=esc(scrub.prose(f'{p["name"]}. Jerome Baker')), ogdesc=esc(scrub.prose(short or 'Jerome Baker ritual merch. #ForgedInRitual')),
                       ogimg=esc(ogimg), ld=ld_tag(product) + ld_tag(crumbs))
    data_pp = json.dumps({'id': p['id'], 'shop': p.get('shop', 'woo'), 'store': p.get('store') or data['store'], 'wooStore': data['store'],
                          'attrs': attrs, 'variations': p['variations'], 'inStock': in_stock, 'url': p['url']}, ensure_ascii=False, separators=(',', ':'))
    opts = ''
    for a in attrs:
        chips = ''.join(f'<button type="button" class="pp-chip" data-val="{esc(v)}" aria-pressed="false">{esc(v)}</button>' for v in sorted_terms(a))
        opts += f'<fieldset class="pp-opt" data-attr="{esc(a["name"])}"><legend>{esc(a["name"])}</legend><div class="pp-chips">{chips}</div></fieldset>' + NL
    thumbs = ''
    if len(imgs) > 1:
        thumbs = '<div class="pp-thumbs">' + ''.join(
            f'<button type="button" data-src="{esc(img_rel(s, "../../", 900))}" aria-label="Photo {i + 1}"{" aria-current=true" if not i else ""}>'
            f'<img src="{esc(img_rel(s, "../../", 200))}" alt="{esc(name_seo)}, photo {i + 1}" width="64" height="64" loading="lazy"></button>' for i, s in enumerate(imgs)) + '</div>'
    worn = ''
    if crew:
        worn = (f'<a class="pp-worn" href="../../crew/{esc(p["crew"])}/" style="--wc:{esc(crew["color"])}"><img src="../../assets/crew/{esc(crew["img"])}_s.webp" alt="" '
                f'width="56" height="56" loading="lazy"><span><small>WORN BY</small><b>{esc(crew["name"])}</b></span></a>')
    same = [q for q in by_cat.get(cat, []) if q is not p][:4]
    related = ''
    if same:
        related = '<section class="pp-rel" aria-labelledby="ppRel"><h2 id="ppRel">More ' + esc(cat) + '</h2><div class="pp-cards">' + ''.join(card_html(q, '../') for q in same) + '</div></section>'
    sold = '' if in_stock else '<p class="pp-sold">This one sold out. Told you.</p>'
    body = f'''<main id="main" class="pp-main pad">
<nav class="pp-crumb" aria-label="Breadcrumb"><a href="../../">Home</a> / <a href="../">Ritual Merch</a> / <a href="../{CATPATH[cat]}/">{esc(cat)}</a> / <span aria-current="page">{esc(name_body)}</span></nav>
<article class="pp" id="pp" data-pp="{esc(data_pp)}">
<div class="pp-gal"><div class="pp-big"><img id="ppImg" src="{esc(img_rel(imgs[0], "../../", 900))}" alt="{esc(name_seo)}" width="900" height="900" decoding="async" fetchpriority="high"></div>{thumbs}</div>
<div class="pp-info">
<h1>{esc(name_seo)}</h1>
<p class="pp-price" id="ppPrice">{('From ' if prices > 1 else '') + money(p['price'])}</p>
{sold}<div class="pp-opts">{opts}</div>
<div class="pp-buyrow"><div class="pp-qty"><button type="button" id="ppMinus" aria-label="Less">&minus;</button><output id="ppQty">1</output><button type="button" id="ppPlus" aria-label="More">+</button></div>
<a class="btn btn-red" id="ppBuy" href="{esc(p['url'])}" target="_blank" rel="noopener"{' aria-disabled="true"' if not in_stock else ''}>{'Buy now' if in_stock else 'Gone forever'}</a></div>
<p class="pp-note" id="ppNote">Checkout and shipping happen on <a href="{esc(p['url'])}" target="_blank" rel="noopener">{esc(store_name)}</a>. <a href="../../returns/">Returns and refunds</a>.</p>
{worn}
<div class="pp-desc">{''.join('<p>' + esc(x) + '</p>' for x in re.split(r'\n+', (p.get('desc') or '').strip()) if x.strip())}</div>
</div>
</article>
{related}
</main>
'''
    page = head + top + body + foot + TAIL.format(extra='<script src="../../js/shop-page.js" defer></script>' + NL)
    return page


def category_page(cat, items, top, foot):
    slug = CATPATH[cat]
    canon = f'{HOST}/shop/{slug}/'
    n = len(items)
    intro = f'{cat} from Jerome Baker, {n} piece{"s" if n != 1 else ""} of ritual merch. Small runs. Once it is gone, it is gone.'
    crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOST + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Ritual Merch', 'item': HOST + '/shop/'},
        {'@type': 'ListItem', 'position': 3, 'name': cat, 'item': canon}]}
    itemlist = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': f'Jerome Baker {cat}',
                'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f'{HOST}/shop/{path_of(p)}/', 'name': p['name']} for i, p in enumerate(items)]}
    ogimg = img_abs(items[0]['imgs'][0], 1200)
    head = HEAD.format(title=esc(scrub.seo(f'{cat}. Ritual Merch. Jerome Baker')), desc=esc(scrub.seo(intro)), canon=canon, ogtype='website',
                       ogtitle=esc(scrub.prose(f'{cat}. Jerome Baker')), ogdesc=esc(scrub.prose(intro)), ogimg=esc(ogimg), ld=ld_tag(itemlist) + ld_tag(crumbs))
    body = f'''<main id="main" class="pp-main pad">
<nav class="pp-crumb" aria-label="Breadcrumb"><a href="../../">Home</a> / <a href="../">Ritual Merch</a> / <span aria-current="page">{esc(cat)}</span></nav>
<h1 class="pp-cath">{esc(scrub.seo(cat))}</h1>
<p class="pp-intro">{esc(intro)}</p>
<div class="pp-cards pp-cards-lg">{''.join(card_html(p, '../') for p in items)}</div>
</main>
'''
    return head + top + body + foot + TAIL.format(extra='')


def browse_block(items, cats):
    lis = lambda xs: ''.join(f'<li><a href="{x[1]}">{esc(x[0])}</a></li>' for x in xs)  # noqa: E731
    cat_links = [(c, f'{CATPATH[c]}/') for c in cats]
    prod_links = sorted(((p['name'], f'{path_of(p)}/') for p in items), key=lambda x: x[0].lower())
    return ('<!--PRODUCTS-->' + NL + '<section class="pad" aria-labelledby="browseAll"><div class="wrap"><h2 id="browseAll">Browse every piece</h2>'
            '<ul class="pp-browse pp-browse-cats">' + lis(cat_links) + '</ul><ul class="pp-browse">' + lis(prod_links) + '</ul></div></section>' + NL + '<!--/PRODUCTS-->')


def main():
    data = load()
    items = data['items']
    assign_paths(items)
    taken = set()
    for p in items:
        s = path_of(p)
        if s in taken or s in RESERVED:
            sys.exit(f'duplicate or reserved page path: {s}')
        taken.add(s)
    by_cat = {}
    for p in items:
        for c in p['cats']:
            by_cat.setdefault(c, []).append(p)
    cats = [c for c, v in sorted(by_cat.items(), key=lambda kv: (-len(kv[1]), kv[0])) if v]
    for c in cats:
        seg = slugify(c)
        if seg in taken or seg in RESERVED:  # a product already owns that URL (Flip Flops): the category gets a suffix
            seg += '-collection'
        if seg in taken:
            sys.exit(f'category path collides with a product: {c}')
        CATPATH[c] = seg
    top, foot = chrome()
    shop_dir = ROOT / 'shop'
    n = 0
    # products that share a name (generic Printify titles, NY Drop spelling twins) would share a <title>: tell them apart there
    groups = {}
    for p in items:
        groups.setdefault(re.sub(r'[^a-z0-9]+', '', p['name'].lower()), []).append(p)
    twin = {}
    for g in groups.values():
        if len(g) > 1:
            for i, p in enumerate(g):
                opts = ', '.join(sorted_terms(p['attrs'][0])[:3]) if p['attrs'] else ''
                alt = {q['id']: ', '.join(sorted_terms(q['attrs'][0])[:3]) if q['attrs'] else '' for q in g}
                twin[p['id']] = f' ({opts})' if opts and list(alt.values()).count(opts) == 1 else f' (No. {i + 1})'
    keep = {path_of(p) for p in items}
    for p in items:  # generated pages left under their old handle-based URL
        old = legacy_path(p)
        if old not in keep and (shop_dir / old / 'index.html').exists() and old not in CATPATH.values():
            shutil.rmtree(shop_dir / old)
    for p in items:
        out = shop_dir / path_of(p) / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(scrub.html(product_page(p, data, top, foot, by_cat, twin.get(p['id'], ''))), encoding='utf-8', newline='')
        n += 1
    for c in cats:
        out = shop_dir / CATPATH[c] / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(scrub.html(category_page(c, by_cat[c], top, foot)), encoding='utf-8', newline='')
    # browse-all list on /shop/ (real links for crawlers and for people without JS)
    idx = shop_dir / 'index.html'
    src = idx.read_text(encoding='utf-8')
    block = browse_block(items, cats)
    if '<!--PRODUCTS-->' in src:
        src = re.sub(r'<!--PRODUCTS-->.*?<!--/PRODUCTS-->', lambda m: block, src, flags=re.S)
    else:
        src = src.replace('<div class="strip torn', block + NL + '<div class="strip torn', 1)
    idx.write_text(src, encoding='utf-8', newline='')
    # old Shopify URLs -> the new pages (paste above the catch-alls in netlify/_redirects.cutover)
    lines = ['# old shop product URLs -> new product pages. Generated by tools/build_shop_pages.py; first match wins, so keep these above /products/*']
    for p in items:
        if p.get('shop') == 'shopify':
            lines.append(f'/products/{re.sub(r"^shp-", "", p["slug"])} /shop/{path_of(p)}/ 302')
    (ROOT / 'netlify' / 'shop-redirects.txt').write_text(NL.join(lines) + NL, encoding='utf-8', newline='')
    print(f'{n} product pages, {len(cats)} category pages, {len(lines) - 1} redirects')


if __name__ == '__main__':
    main()
