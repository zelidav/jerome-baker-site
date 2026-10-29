"""Ritual Merch: pull the live jeromebakerny.com merch catalog and rebuild the shop data.

Run `python tools/build_shop.py`. It reads the public WooCommerce Store API, keeps the merch
categories (the same set the live /shop/ page lists), downloads up to 4 images per product into
assets/shop/, and writes js/shop-data.js. Checkout still happens on jeromebakerny.com: the page
builds an add-to-cart link with the chosen variation.

Every product gets a crew member. If a crew member already wears that exact product (crew_data.py
`wear`), they get it; otherwise it goes to the crew member who fits that kind of thing.
"""
import html, io, json, os, re, sys, time, urllib.error, urllib.request, concurrent.futures as cf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import crew_data  # noqa: E402

API = 'https://jeromebakerny.com/wp-json/wc/store/v1/products?per_page=100&page={}'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
IMG_DIR = os.path.join(ROOT, 'assets', 'shop')
MAX_IMGS = 4
IMG_W = 900

# The live /shop/ sidebar. Kaleidoscope Collab is greyed out there and its items are not in the grid.
TREE = [
    ('Accessories', ['Bags & Backpacks', 'Hats']),
    ('Footwear', ['Flip Flops', 'Men’s Sneakers', 'Women’s Sneakers']),
    ('Tops', ['Hoodies & Sweatshirts', 'Polos', 'T-Shirts']),
    ('Collections', ['JB Signature', 'NY Drop 1']),
]
MERCH_CATS = {c for top, kids in TREE for c in [top, *kids]}
HIDDEN_CATS = {'Kaleidoscope Collab'}

# The live "Featured products" carousel, in order
FEATURED = [7570, 7472, 7431, 7399, 7206, 1298, 252, 'Men’s High Top – NY Drop 1- Hybrid Style Graphic']

# kind of product -> crew slugs who fit it (first match wins)
KINDS = [
    ('high top', ['two-can', 'shellby', 'chomps', 'major-tom-tom', 'mr-x']),
    ('flip', ['enlightened-ed', 'gray']),
    ('board short', ['crude']),
    ('bikini', ['crude', 'enlightened-ed']),
    ('towel', ['enlightened-ed', 'crude']),
    ('legging', ['dillo', 'shellby']),
    ('crop top', ['dillo']),
    ('backpack', ['baker-bot', 'peeper']),
    ('reversible bucket', ['mama-cobra', 'major-tom-tom']),
    ('bucket hat', ['honey-pot', 'peeper']),
    ('hat', ['the-spinners', 'two-can']),
    ('hoodie', ['torch', 'public-enemy']),
    ('polo', ['the-grin', 'lil-lucky', 'honey-pot']),
    ('mug', ['honey-pot', 'jack']),
    ('bottle', ['gray', 'baker-bot']),
    ('tee', ['baker-bot', 'gray', 'cy', 'jack', 'mr-x']),
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
    if os.path.exists(dest):
        return
    im = Image.open(io.BytesIO(get(src, 'image/*')))
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if im.width > IMG_W:
        im = im.resize((IMG_W, round(im.height * IMG_W / im.width)), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=80, method=6)


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

    for it in items:
        it['crew'] = crew_for(it, worn)
    names = {it['name']: it['id'] for it in items}
    featured = [f if isinstance(f, int) else names.get(f) for f in FEATURED]
    featured = [f for f in featured if any(it['id'] == f for it in items)]

    with cf.ThreadPoolExecutor(2) as ex:
        for f in cf.as_completed([ex.submit(save_img, s, d) for s, d in jobs]):
            f.result()

    data = dict(store='https://jeromebakerny.com', tree=TREE, featured=featured, crew=crew, items=items)
    with open(os.path.join(ROOT, 'js', 'shop-data.js'), 'w', encoding='utf-8') as f:
        f.write('/* Built by tools/build_shop.py from the live jeromebakerny.com catalog. Do not edit by hand. */\n')
        f.write('window.JBShop = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{len(items)} products, {len(jobs)} images, featured {len(featured)}')


if __name__ == '__main__':
    main()
