"""Build the Glass Showcase data from the jbglass app.

Live data (names, prices, status, copy, buy links) comes from /api/gallery on every run.
Images come from cutouts made once per piece (~/code/jbsite-work/glass/cutouts.py). A piece is only
published once it has a cutout in assets/glass/, so a new piece in the app waits for its cutout.

Writes js/glass-data.js and assets/glass/<id>.webp (1000px tall), <id>_t.webp (440px tall) and
<id>_z.webp (the cutout at full photo resolution, for the zoom loupe)."""
import json, os, re, sys, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import shopify  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'glass'
CUTS = Path(os.path.expanduser('~/code/jbsite-work/glass/cut'))
# the color and sparkle treatment on every glass photo (tools/glass_fx.py, "C2 Rim", picked 2026-11-04).
# The cutouts stay as they are; set False and rebuild to go back to the plain cutouts.
GLASS_FX = True
import glass_fx  # noqa: E402
_FX_MARK = OUT / '.fx'
_FX_WANT = glass_fx.VERSION if GLASS_FX else 'off'
FX_STALE = (_FX_MARK.read_text().strip() if _FX_MARK.exists() else 'off') != _FX_WANT  # treatment changed: redo every image
HOST = 'https://jbcustomer.cannacrypted.com'
SKIP_CATS = ('Drop Merch', 'Display Fixtures')
# extra photos for the zoom strip (scale shot, collar, then marble closeups; the first one is also the tile's flip photo): assets/glass/hires/, from the 2019 giant-bong
# studio shoot. Written by jbsite-work/glass/giant/giant_hires.py.
_GP = Path(__file__).resolve().parent / 'giant_photos.json'
EXTRA_PHOTOS = json.loads(_GP.read_text(encoding='utf-8')) if _GP.exists() else {}
# David 2026-11-03: our inventory sells through our own checkout (jbcustomer /buy), except Everyday Steeze, which
# stays with JB's Shopify store. So our Steeze records are left off and the Shopify Steeze listings show instead,
# and Shopify listings for things we stock ourselves (Skeeter kit, Nug Jug jars) are left off.
OWN_CATS_ON_SHOPIFY = ('Everyday Steeze',)
SHOPIFY_SKIP = ('skeeter', 'nug jug')  # Nug Jug = our Large / Small Storage Jars
# made in runs, not one of one: their tile says In stock instead of 1 of 1 (each Keiki is handmade and different, so not them)
STANDARD_CATS = ('Classic Clearboy', 'Skeeters')

# shelves, in page order: (key, title, line, match)
SHELVES = [
    ('giant', 'Giant bongs', 'Four feet of glass and up, pulled by a team of fifteen. One of each, ever.', lambda p: p['shape_code'] == 'GBG'),
    ('le', 'Limited Edition', 'The crown pieces. Wig-wag, millies, knuckles and marbles, worked at the bench and signed off as one of one.', lambda p: p['series'] == 'Limited Edition' and p['category'] == 'Signature Glass'),
    ('og', 'Original Series', 'The fifteen-inch Baker silhouette that started it. Fumed bulb, straight tube, built to hit and built to last.', lambda p: p['series'] == 'Original Series'),
    ('second', 'Second Life', 'Worked tubes rebuilt into cork-top jars. Each one was something else first.', lambda p: p['category'] == 'Second Life Series'),
    ('studio', 'Studio one-offs', 'Rigs, calumets and showpieces off the bench, sold straight from the studio store.', None),
    ('creatures', 'Spirit Creatures', 'Little sea animals worked in clear and color, each one numbered. Turtles, whales, octopus, starfish.', None),
    ('daily', 'Everyday glass', 'The pieces you actually reach for. Beakers, tubes, jars, Clearboys and the Skeeter lunch boxes.', lambda p: True),
    ('kit', 'Bowls, stems and kit', 'The parts that keep a piece working. Bowls, downstems, tips, trays and the fix-it kit.', None),
]
SHELF_KEYS = [k for k, *_ in SHELVES]


def shopify_shelf(p):
    t = p['title'].lower()
    if 'spirit creature' in t:
        return 'creatures'
    if re.search(r'evo |steeze|nug jug|dipper', t):
        return 'daily'
    if float(p['variants'][0]['price']) >= 300:
        return 'studio'
    return 'kit'


def shopify_pieces():
    """Glass for sale on the jeromebaker.com Shopify store. Ordering happens there (cart link to Shopify checkout)."""
    out, missing = [], []
    for p in shopify.pull():
        if shopify.is_merch(p) or any(k in p['title'].lower() for k in SHOPIFY_SKIP):
            continue
        pid = f"SHP-{p['id']}"
        img = make_images(pid)
        if not img:
            missing.append(f"{p['title']} ({pid})")
            continue
        vs = shopify.variants(p)
        shelf = shopify_shelf(p)
        one = shelf in ('studio', 'creatures')
        opt = shopify.options(p)
        out.append({
            'id': pid, 'name': shopify.short_name(p['title']), 'shelf': shelf,
            'series': 'Studio store', 'shape': p['product_type'] if p['product_type'] not in ('', 'Glass') else '',
            'price': min(v[2] for v in vs), 'status': 'available', 'online': True, 'shop': 'shopify',
            'edition': '1 of 1' if one else '', 'inches': None,
            'desc': shopify.clean(p['body_html'])[:900],
            'buy': shopify.cart(vs[0][0]), 'verify': shopify.page_url(p),
            'opt': opt[0]['name'] if opt else '',
            'variants': [[v[0], ' / '.join(x for x in v[3].values() if x) or v[1], v[2]] for v in vs] if opt else [],
            'photos': [shopify.img_url(im['src'], 2400) for im in p['images'][:8]],
            **img})
    return out, missing
# nominal height in inches, for the size line in the piece view
HEIGHT = {'GBG': 44, 'LEB': 15, 'OSB': 15, 'SPC': 15, 'CUJ': 7, 'BKR': 12, 'STR': 12, 'JRL': 5, 'JRS': 3}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (jb-site build)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def make_images(pid):
    """Trim the cutout to the glass, save two sizes, and find the mouthpiece and the base."""
    from PIL import Image
    full, thumb, zoom = OUT / f'{pid}.webp', OUT / f'{pid}_t.webp', OUT / f'{pid}_z.webp'
    src = CUTS / f'{pid}.png'
    if not zoom.exists() or FX_STALE or (src.exists() and src.stat().st_mtime > zoom.stat().st_mtime):
        if not src.exists():
            return None
        im = Image.open(src).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
        im = im.crop(a.getbbox())
        if GLASS_FX:
            im = glass_fx.apply(im)
        for path, h in ((full, 1000), (thumb, 440)):
            w = round(im.width * h / im.height)
            im.resize((w, h), Image.LANCZOS).save(path, 'WEBP', quality=82, method=6)
        im.save(zoom, 'WEBP', quality=84, method=4)  # never upscaled: the loupe shows real pixels
    im = Image.open(thumb)
    a = im.getchannel('A')
    w, h = im.size
    px = a.load()

    def span(y):
        xs = [x for x in range(w) if px[x, y] > 128]
        return (xs[0], xs[-1]) if xs else None

    top = next((s for s in (span(y) for y in range(0, h // 10)) if s), (0, w))
    widest, wy = 0, h - 1
    for y in range(int(h * .6), h):
        s = span(y)
        if s and s[1] - s[0] > widest:
            widest, wy = s[1] - s[0], y
    base = span(wy) or (0, w)
    r = lambda v: round(v, 3)
    from PIL import Image as _I
    zw, zh = _I.open(zoom).size
    return {'w': w, 'h': h, 'zw': zw, 'zh': zh, 'mouth': [r((top[0] + top[1]) / 2 / w), 0.01],
            'base': [r((base[0] + base[1]) / 2 / w), r(wy / h)], 'bw': r(widest / w)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    gallery = json.loads(get(HOST + '/api/gallery'))
    pieces, missing = [], []
    for p in gallery:
        if not p.get('has_image') or (p.get('category') or '').startswith(SKIP_CATS + OWN_CATS_ON_SHOPIFY):
            continue
        pid = p['provenance_id']
        img = make_images(pid)
        if not img:
            missing.append(f"{p['name']} ({pid})")
            continue
        shelf = next(k for k, _, _, match in SHELVES if match and match(p))
        status = {'available': 'available', 'sold': 'sold'}.get(p['status'], 'collected')
        pieces.append({
            'id': pid, 'name': p['name'], 'shelf': shelf, 'series': p.get('series') or '', 'shape': p.get('shape') or '',
            'price': p.get('price') or 0, 'status': status, 'online': bool(p.get('online_sale')),
            'edition': p.get('edition') or '', 'standard': (p.get('category') or '').startswith(STANDARD_CATS),
            'inches': HEIGHT.get(p.get('shape_code') or ''),
            'desc': (p.get('description') or '').strip(),
            'buy': f'{HOST}/buy/{pid}', 'verify': f'{HOST}/c/piece/{pid}?prov=1', **img})
        if pid in EXTRA_PHOTOS:
            pieces[-1]['photos'] = EXTRA_PHOTOS[pid]
            pieces[-1]['flip'] = EXTRA_PHOTOS[pid][0]['src']  # the tile's second look: our own photo, not the app's
    shop, shop_missing = shopify_pieces()
    pieces += shop
    missing += shop_missing
    order = {k: i for i, (k, *_) in enumerate(SHELVES)}
    rank = {'available': 0, 'sold': 1, 'collected': 2}
    pieces.sort(key=lambda x: (order[x['shelf']], rank[x['status']], -x['price'], x['name']))
    shelves = [{'key': k, 'title': t, 'line': l} for k, t, l, _ in SHELVES if any(x['shelf'] == k for x in pieces)]
    data = {'shelves': shelves, 'pieces': pieces}
    (ROOT / 'js' / 'glass-data.js').write_text(
        '/* generated by tools/build_glass.py from the jbglass app. Do not edit by hand. */\n'
        'window.JB_GLASS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    _FX_MARK.write_text(_FX_WANT)
    print(f'{len(pieces)} pieces on {len(shelves)} shelves')
    if missing:
        print('waiting for a cutout (run jbsite-work/glass/cutouts.py):', ', '.join(missing), file=sys.stderr)


if __name__ == '__main__':
    main()

# site rule: flaggable words get number/symbol swaps (b0ng, p!pe, sm0ke...). See tools/scrub.py.
import scrub as _scrub  # noqa: E402
_scrub.main()
