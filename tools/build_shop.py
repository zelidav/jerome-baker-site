"""Ritual Merch: pull the live jeromebakerny.com merch catalog and rebuild the shop data.

Run `python tools/build_shop.py`. It reads the public WooCommerce Store API, keeps the merch
categories (the same set the live /shop/ page lists), downloads up to 4 images per product into
assets/shop/, and writes js/shop-data.js. Checkout still happens on jeromebakerny.com: the page
builds an add-to-cart link with the chosen variation.

Product copy: merch whose store description is blank or a flat store template gets the site's own Jerome Baker
copy from tools/shop_copy.py, applied after the pull so a rebuild keeps it. The stores are never written to.
Re-apply that copy to the js/shop-data.js on disk without pulling anything:  python tools/build_shop.py --copy-only

Every product gets a crew member. If a crew member already wears that exact product (crew_data.py
`wear`), they get it; otherwise it goes to the crew member who fits that kind of thing.
"""
import html, io, json, os, re, sys, time, urllib.error, urllib.request, concurrent.futures as cf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import crew_data  # noqa: E402
import shopify  # noqa: E402
import shop_copy  # noqa: E402

API = 'https://jeromebakerny.com/wp-json/wc/store/v1/products?per_page=100&page={}'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
IMG_DIR = os.path.join(ROOT, 'assets', 'shop')
MAX_IMGS = 4
IMG_W = 900
THUMB_W = 480

# The live /shop/ sidebar. Kaleidoscope Collab is greyed out there and its items are not in the grid.
TREE = [
    ('Accessories', ['Bags & Backpacks', 'Hats', 'Stickers']),
    ('Footwear', ['Flip Flops', 'Men’s Sneakers', 'Women’s Sneakers']),
    ('Tops', ['Hoodies & Sweatshirts', 'Polos', 'T-Shirts']),
    ('Loungewear', ['Pajamas, Dresses & Slacks']),
    ('Art & Home', ['Prints & Paintings', 'Home & Kitchen', 'Gift Cards']),
    ('Collections', ['JB Signature', 'NY Drop 1', 'Studio Store']),
]
# jeromebaker.com Shopify product type / title -> the categories above (first match wins)
SHOPIFY_CATS = [
    (r'gift card', 'Gift Cards'),
    (r'sticker|decal', 'Stickers'),
    (r'pajama|dress|slacks', 'Pajamas, Dresses & Slacks'),
    (r'towel|pillow|banner|pint|mug', 'Home & Kitchen'),
    (r'wallet|backpack', 'Bags & Backpacks'),
    (r'painting|poster|still life|further|adrenochrome', 'Prints & Paintings'),
    (r'rug|bento|lunchbox|decor', 'Home & Kitchen'),
    (r'hat|cap', 'Hats'),
    (r'hood|sweatshirt', 'Hoodies & Sweatshirts'),
    (r'tote|bag', 'Bags & Backpacks'),
    (r'sneaker|shoe', 'Men’s Sneakers'),
    (r'tee|t-shirt|tank|sleeve', 'T-Shirts'),
]
MERCH_CATS = {c for top, kids in TREE for c in [top, *kids]}
HIDDEN_CATS = {'Kaleidoscope Collab'}

# The live "Featured products" carousel, in order
FEATURED = [7570, 7472, 7431, 7399, 7206, 1298, 252, 'Men’s High Top – NY Drop 1- Hybrid Style Graphic']

# kind of product -> crew slugs who fit it (first match wins)
KINDS = [
    ('high top', ['big-bill', 'speedbump', 'chomps', 'lunar-larry', 'mr-x']),
    ('flip', ['ocho', 'beamer']),
    ('board short', ['crude']),
    ('bikini', ['crude', 'ocho']),
    ('towel', ['ocho', 'crude']),
    ('legging', ['gutterball', 'speedbump']),
    ('crop top', ['gutterball']),
    ('backpack', ['dj-rivets', 'lookie-lou']),
    ('reversible bucket', ['mama-cobra', 'lunar-larry']),
    ('bucket hat', ['sticky-ricky', 'lookie-lou']),
    ('hat', ['the-zone-outs', 'big-bill']),
    ('hoodie', ['torch', 'big-stitch']),
    ('polo', ['mouthy', 'lil-lucky', 'sticky-ricky']),
    ('mug', ['sticky-ricky', 'gourdo']),
    ('bottle', ['beamer', 'dj-rivets']),
    ('tee', ['dj-rivets', 'beamer', 'dr-squint', 'gourdo', 'mr-x']),
]


def get(url, accept='application/json', tries=6):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == tries - 1:
                raise
            time.sleep(5 * 2 ** n)  # the live host rate-limits; back off


def clean(s):
    return html.unescape(re.sub(r'<[^>]+>', ' ', s or '')).replace('\xa0', ' ').strip()


def pull():
    out, page = [], 1
    while True:
        batch = json.loads(get(API.format(page)))
        if not batch:
            return out
        out += batch
        page += 1


def crew_for(p, worn):
    if p['id'] in worn:
        return worn[p['id']]
    name = p['name'].lower()
    for key, slugs in KINDS:
        if key in name:
            return slugs[p['id'] % len(slugs)]
    return 'torch'


def save_img(src, dest):
    """Full photo (product view) plus a 480px _t thumbnail (cards)."""
    thumb = dest[:-5] + '_t.webp'
    if os.path.exists(dest) and os.path.exists(thumb):
        return
    if os.path.exists(dest):
        im = Image.open(dest)
    else:
        im = Image.open(io.BytesIO(get(src, 'image/*')))
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        if im.width > IMG_W:
            im = im.resize((IMG_W, round(im.height * IMG_W / im.width)), Image.LANCZOS)
        im.save(dest, 'WEBP', quality=80, method=6)
    t = im.copy()
    t.thumbnail((THUMB_W, THUMB_W), Image.LANCZOS)
    t.save(thumb, 'WEBP', quality=76, method=6)


def shopify_items(jobs):
    """Merch for sale on the jeromebaker.com Shopify store. These check out on jeromebaker.com through a Shopify
    cart link; the WooCommerce items keep checking out on jeromebakerny.com."""
    out = []
    main = shopify.pull()
    seen = {x['handle'] for x in main} | {shopify.short_name(x['title']).lower() for x in main}
    # jeromebaker.shop is all merch; anything it shares with jeromebaker.com is listed once, from .com
    extra = [x for x in shopify.pull(shopify.STORE2)
             if x['handle'] not in seen and shopify.short_name(x['title']).lower() not in seen]
    for store, x in [(shopify.STORE, x) for x in main] + [(shopify.STORE2, x) for x in extra]:
        if store == shopify.STORE and not shopify.is_merch(x):
            continue
        key = (x['product_type'] + ' ' + x['title'] + ' ' + ' '.join(x['tags'][:3])).lower()
        cat = next((c for rx, c in SHOPIFY_CATS if re.search(rx, key)), 'Studio Store')
        imgs = []
        for n, im in enumerate(x['images'][:MAX_IMGS]):
            rel = f"assets/shop/shp{x['id']}_{n}.webp"
            jobs.append((shopify.img_url(im['src'], 1400), os.path.join(ROOT, rel)))
            imgs.append(rel)
        vs = shopify.variants(x)
        opts = [o for o in x['options'] if o['name'] != 'Title' or len(o['values']) > 1]
        attrs = []
        for o in opts:
            vals = []
            for v in vs:
                val = v[3].get(o['name'])
                if val and val not in vals:
                    vals.append(val)
            if len(vals) > 1 or len(opts) > 1:
                attrs.append(dict(name='Amount' if o['name'] == 'Title' else o['name'], src=o['name'], key='', terms=[[v, v.lower()] for v in vals]))
        out.append(dict(
            id=x['id'], name=shopify.short_name(x['title']), slug='shp-' + x['handle'], url=shopify.page_url(x, store),
            price=min(v[2] for v in vs), cats=[cat, 'Studio Store'], imgs=imgs, inStock=True, type='variable' if attrs else 'simple',
            desc=shopify.clean(x['body_html'])[:1200], attrs=attrs,
            variations=[[v[0], {a['name']: v[3].get(a['src']) for a in attrs}] for v in vs], shop='shopify', store=store,
        ))
    return out


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    raw = pull()
    worn = {pid: c['slug'] for c in crew_data.CREW for pid in c['wear']}
    crew = {c['slug']: dict(name=c['name'], img=c['img'], color=c['color']) for c in crew_data.CREW}

    items, jobs = [], []
    for x in raw:
        cats = [html.unescape(c['name']) for c in x['categories']]
        if not set(cats) & MERCH_CATS or set(cats) & HIDDEN_CATS:
            continue
        imgs = []
        for n, im in enumerate(x['images'][:MAX_IMGS]):
            rel = f"assets/shop/{x['id']}_{n}.webp"
            jobs.append((im['src'], os.path.join(ROOT, rel)))
            imgs.append(rel)
        attrs = [dict(name=a['name'], key='attribute_' + (a['taxonomy'] or re.sub(r'[^a-z0-9]+', '-', a['name'].lower())),
                      terms=[[t['name'], t['slug']] for t in a['terms']])
                 for a in x['attributes'] if a.get('has_variations')]
        variations = [[v['id'], {va['name']: va['value'] for va in v['attributes']}] for v in x.get('variations', [])]
        items.append(dict(
            id=x['id'], name=clean(x['name']), slug=x['slug'], url=x['permalink'],
            price=int(x['prices']['price']) / 10 ** x['prices']['currency_minor_unit'],
            cats=cats, imgs=imgs, inStock=x['is_in_stock'], type=x['type'],
            desc=clean(x.get('description') or x.get('short_description')),
            attrs=attrs, variations=variations,
        ))

    items += shopify_items(jobs)
    for it in items:
        it['crew'] = crew_for(it, worn)
    copied = shop_copy.apply(items)
    names = {it['name']: it['id'] for it in items}
    featured = [f if isinstance(f, int) else names.get(f) for f in FEATURED]
    featured = [f for f in featured if any(it['id'] == f for it in items)]
    # most expensive first: the first prices people see set the anchor for the rest
    featured.sort(key=lambda f: -next(it['price'] for it in items if it['id'] == f))

    with cf.ThreadPoolExecutor(2) as ex:
        for f in cf.as_completed([ex.submit(save_img, s, d) for s, d in jobs]):
            f.result()

    write(dict(store='https://jeromebakerny.com', tree=TREE, featured=featured, crew=crew, items=items))
    print(f'{len(items)} products, {len(jobs)} images, featured {len(featured)}, site copy on {copied}')


DATA = os.path.join(ROOT, 'js', 'shop-data.js')


def write(data):
    with open(DATA, 'w', encoding='utf-8') as f:
        f.write('/* Built by tools/build_shop.py from the live jeromebakerny.com catalog. Do not edit by hand. */\n')
        f.write('window.JBShop = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')


def copy_only():
    """Re-apply tools/shop_copy.py to the shop data already on disk, without pulling anything."""
    src = open(DATA, encoding='utf-8').read()
    head = 'window.JBShop = '
    data = json.loads(src[src.index(head) + len(head):src.rindex(';')])
    n = shop_copy.apply(data['items'])
    write(data)
    print(f"site copy on {n} of {len(data['items'])} products")


if __name__ == '__main__':
    copy_only() if '--copy-only' in sys.argv else main()

# site rule: flaggable words get number/symbol swaps (b0ng, p!pe, sm0ke...). See tools/scrub.py.
import scrub as _scrub  # noqa: E402
_scrub.main()
