"""Live merch feed: everything for sale on www.jeromebaker.shop, written as shop-feed.json for js/shop-feed.js.

Printify publishes to that one Shopify store; this reads it (new products, prices, descriptions, sold-out variants)
and the shop page merges it over the built js/shop-data.js with no rebuild and no deploy. Run by
.github/workflows/shop-feed.yml every 15 minutes, which commits the result to the `shop-feed` data branch.

    python tools/shop_feed.py OUTDIR

Reads the store through the Storefront API when SHOPIFY_JBSHOP_KEY and SECRET are set (the read-only app on the
store; the key and secret swap for a 24 hour token on every run). Without them it falls back to the public
/products.json, which Shopify may refuse from busy addresses (403/429).
Nothing here writes to the store.
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_shop  # noqa: E402  (importing no longer runs the scrub pass)
import crew_data  # noqa: E402
import scrub  # noqa: E402
import shopify  # noqa: E402

SHOP = 'ac535d.myshopify.com'
STORE = shopify.STORE2
# on the store but with nothing behind them in Printify (no way to print or ship them), so the site does not list them
NOT_SELLABLE = {'womenssmoking-slacks', 'soho-baker-beach-towel', 'tote-bag-aop', 'smoking-dress',
                'bed-time-baker-womens-satin-pajamas', 'jbd-jerome-baker-designs-small-cell-phone-wallet'}

QUERY = '''query($after:String){products(first:50,after:$after){pageInfo{hasNextPage endCursor} nodes{
 id handle title descriptionHtml vendor productType tags options{name values}
 images(first:6){nodes{url}}
 variants(first:100){nodes{id title availableForSale price{amount} selectedOptions{name value}}}}}}'''


def num(gid):
    return int(gid.rsplit('/', 1)[1])


def pull_storefront(key, secret):
    body = urllib.parse.urlencode({'grant_type': 'client_credentials', 'client_id': key, 'client_secret': secret}).encode()
    tok = json.load(urllib.request.urlopen(urllib.request.Request(f'https://{SHOP}/admin/oauth/access_token', data=body, headers={'User-Agent': shopify.UA}), timeout=60))['access_token']
    out, after = [], None
    while True:
        req = urllib.request.Request(f'https://{SHOP}/api/2025-01/graphql.json', data=json.dumps({'query': QUERY, 'variables': {'after': after}}).encode(),
                                     headers={'Shopify-Storefront-Private-Token': tok, 'Content-Type': 'application/json', 'User-Agent': shopify.UA})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        if d.get('errors') or not d.get('data'):
            raise RuntimeError(f"storefront query failed: {d.get('errors')}")
        page = d['data']['products']
        for n in page['nodes']:
            names = [o['name'] for o in n['options']]
            out.append(dict(
                id=num(n['id']), handle=n['handle'], title=n['title'], body_html=n['descriptionHtml'], vendor=n['vendor'],
                product_type=n['productType'], tags=n['tags'], options=[dict(name=o['name'], values=o['values']) for o in n['options']],
                images=[dict(src=i['url']) for i in n['images']['nodes']],
                variants=[dict(id=num(v['id']), title=v['title'], price=v['price']['amount'], available=v['availableForSale'],
                               **{f'option{i + 1}': next((o['value'] for o in v['selectedOptions'] if o['name'] == nm), None) for i, nm in enumerate(names)})
                          for v in n['variants']['nodes']]))
        if not page['pageInfo']['hasNextPage']:
            return out
        after = page['pageInfo']['endCursor']


def items_from(products):
    worn = {pid: c['slug'] for c in crew_data.CREW for pid in c['wear']}
    out = []
    for x in products:
        if x['handle'] in NOT_SELLABLE or not x['images'] or not any(v['available'] for v in x['variants']):
            continue
        if any(k in x['title'].lower() for k in shopify.SKIP_TITLES):
            continue
        key = (x['product_type'] + ' ' + x['title'] + ' ' + ' '.join(x['tags'][:3])).lower()
        import re
        cat = next((c for rx, c in build_shop.SHOPIFY_CATS if re.search(rx, key)), 'Studio Store')
        vs = shopify.variants(x)
        opts = [o for o in x['options'] if o['name'] != 'Title' or len(o['values']) > 1]
        attrs = []
        for o in opts:
            vals = []
            for v in vs:
                val = v[3].get(o['name'])
                if val and val not in vals:
                    vals.append(val)
            if len(vals) > 1:  # a one-value option ("One size", a single colour) is noise, not a choice
                attrs.append(dict(name='Amount' if o['name'] == 'Title' else o['name'], src=o['name'], key='', terms=[[v, v.lower()] for v in vals]))
        it = dict(
            id=x['id'], name=scrub.prose(shopify.short_name(x['title'])), slug='shp-' + x['handle'], url=shopify.page_url(x, STORE),
            price=min(v[2] for v in vs), cats=[cat, 'Studio Store'], imgs=[i['src'] for i in x['images'][:build_shop.MAX_IMGS]], inStock=True,
            type='variable' if attrs else 'simple', desc=scrub.prose(shopify.clean(x['body_html'])[:1200]), attrs=attrs,
            variations=[[v[0], {a['name']: v[3].get(a['src']) for a in attrs}] for v in vs], shop='shopify', store=STORE)
        it['crew'] = build_shop.crew_for(it, worn)
        out.append(it)
    return out


def main(outdir):
    key, secret = os.environ.get('SHOPIFY_JBSHOP_KEY'), os.environ.get('SHOPIFY_JBSHOP_SECRET')
    products = pull_storefront(key, secret) if key and secret else shopify.pull(STORE)
    items = items_from(products)
    if len(items) < 5:  # a half-empty read must never wipe the shop: leave the last good feed in place
        sys.exit(f'only {len(items)} products came back; not writing the feed')
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, 'shop-feed.json')
    old = {}
    if os.path.exists(path):
        try:
            old = json.load(open(path, encoding='utf-8'))
        except ValueError:
            pass
    feed = dict(store=STORE, items=items)
    if {k: v for k, v in old.items() if k != 'updated'} != feed:
        feed['updated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(items)} products in the feed')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'shop-feed-out')
