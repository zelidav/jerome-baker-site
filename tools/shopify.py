"""The jeromebaker.com Shopify store: everything it has for sale, sorted into what goes on The Glass and what goes
on Ritual Merch. Read by build_glass.py and build_shop.py; nothing here writes files.

Shopify items check out on jeromebaker.com through a cart link (jeromebaker.com/cart/<variant id>:<qty>), which
drops the buyer straight into Shopify checkout. The WooCommerce merch keeps checking out on jeromebakerny.com.

Only items with at least one variant for sale and at least one photo are pulled."""
import html, json, re, time, urllib.error, urllib.request

STORE = 'https://jeromebaker.com'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
# not ours to sell on the brand site
SKIP_TITLES = ('rise energy shot', 'proof of ownership', 'case of skeeter', 'tb05')
MERCH_TYPES = {'hats', 't-shirt', 'hoodie', 'tank top', 'long-sleeve', 'bags', 'shoes', 'poster', 'home decor', 'gift card', 'accessories'}
MERCH_VENDORS = {'printify', 'the kind group'}


def get(url, accept='application/json', tries=5):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 430, 503) or n == tries - 1:
                raise
            time.sleep(4 * 2 ** n)


def clean(s):
    s = re.sub(r'<(br|/p|/li|/h\d)[^>]*>', '\n', s or '', flags=re.I)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)).replace('\xa0', ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    return re.sub(r'\s*\n\s*', '\n', s).strip()


# hand-picked names where the store title is a search-engine sentence
NAMES = [
    ('embroidered snapback hat - rosin', 'ROSIN Snapback Hat'),
    ('stoned - by jeromebaker', 'STONED Snapback Cap'),
    ("camouflage trucker hat with 'terps'", 'TERPS Camo Trucker Hat'),
    ('old school jbd logo unisex softstyle', 'Old School JBD Logo Tee'),
    ('jeromasaurus jbd', 'Jeromasaurus Long Sleeve Tee'),
]


def short_name(t):
    """Print-on-demand titles are written for search engines ("BAKER Snapback Hat – Stylish Embroidered Cap for..."):
    keep the part before the first dash."""
    t = re.sub(r'\s+', ' ', html.unescape(t)).strip()
    for k, v in NAMES:
        if t.lower().startswith(k):
            return v
    t = re.split(r'\s+[-–—|]\s+|\s+�\s+', t)[0]
    return t.strip()


def img_url(src, w):
    return src + ('&' if '?' in src else '?') + f'width={w}'


def pull():
    out, page = [], 1
    while True:
        batch = json.loads(get(f'{STORE}/products.json?limit=250&page={page}'))['products']
        if not batch:
            break
        out += batch
        page += 1
        time.sleep(1)
    return [p for p in out if p['images'] and any(v['available'] for v in p['variants'])
            and not any(k in p['title'].lower() for k in SKIP_TITLES)]


def is_merch(p):
    t = p['product_type'].lower()
    title = p['title'].lower()
    return (p['vendor'].lower() in MERCH_VENDORS or t in MERCH_TYPES or 't-shirt' in title
            or 'painting' in [x.lower() for x in p['tags']] or 'lunchbox' in title)


def options(p):
    """Options that matter to the buyer ("Title" is Shopify's placeholder for a product with no choices)."""
    return [o for o in p['options'] if len(o['values']) > 1]


def variants(p):
    """Variants for sale: [id, title, price, {option name: value}]."""
    names = [o['name'] for o in p['options']]
    out = []
    for v in p['variants']:
        if not v['available']:
            continue
        vals = {n: v.get(f'option{i + 1}') for i, n in enumerate(names)
                if n != 'Title' or len(p['options'][i]['values']) > 1}
        out.append([v['id'], v['title'], float(v['price']), vals])
    return out


def cart(variant_id, qty=1):
    return f'{STORE}/cart/{variant_id}:{qty}'


def page_url(p):
    return f"{STORE}/products/{p['handle']}"
