"""Live glass feed: new pieces added in the JB app reach the site's Glass page with no rebuild and no deploy.

Run by .github/workflows/glass-feed.yml every 15 minutes. Pulls /api/gallery, takes the pieces that have a cutout_url
(the maker flow's transparent cutout) and are not already in js/glass-data.js, makes the same three images
build_glass makes (same glass_fx treatment), and writes to an output folder (the `glass-feed` data branch):

  glass-feed.json   {img, shelf_order, shelves, pieces: [...same fields build_glass emits, + img, model], status: {id: {status, price}}, src, fx}
  assets/glass/     <id>.webp, <id>_t.webp, <id>_z.webp

The site (js/glass-feed.js) reads glass-feed.json from raw.githubusercontent.com and merges it into window.JB_GLASS.
Every gallery piece's current status and price ride along in `status`, so a sale or price change shows with no rebuild.
(JSON, not a .js file: raw.githubusercontent.com serves text/plain + nosniff, which browsers refuse as a script.)

  python tools/glass_feed.py <out_dir> [--site <dir with js/glass-data.js>] [--extra gallery_items.json] [--host URL]
"""
import argparse, json, re, sys, time, urllib.error, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_glass as bg  # noqa: E402
import glass_fx  # noqa: E402
import scrub  # noqa: E402

RAW = 'https://raw.githubusercontent.com/zelidav/jerome-baker-site/glass-feed/'
UA = 'Mozilla/5.0 (jb-site glass feed)'


def fetch(url, tries=5):
    """GET with polite 429/503 handling: honor Retry-After, else back off 4s, 8s, 16s..."""
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or n == tries - 1:
                raise
            try:
                wait = min(120, int(e.headers.get('Retry-After', '')))
            except ValueError:
                wait = 4 * 2 ** n
            print(f'{e.code} from {url}, waiting {wait}s', file=sys.stderr)
            time.sleep(wait)


def site_ids(site):
    """Provenance ids already published in main's js/glass-data.js."""
    txt = (Path(site) / 'js' / 'glass-data.js').read_text(encoding='utf-8')
    head = 'window.JB_GLASS = '
    data = json.loads(txt[txt.index(head) + len(head):].rstrip().rstrip(';'))
    return {p['id'] for p in data['pieces']}


def shelf_of(p):
    """build_glass's SHELVES, matched on the gallery item (the app already folds list_category into `category`).
    Anything that can't be matched goes on the most general shelf."""
    for k, _, _, match in bg.SHELVES:
        try:
            if match and match(p):
                return k
        except (KeyError, TypeError):
            continue
    return 'daily'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--site', default=str(bg.ROOT))
    ap.add_argument('--extra', help='JSON list of extra gallery items (testing)')
    ap.add_argument('--host', default=bg.HOST)
    a = ap.parse_args()
    out = Path(a.out)
    d = out / 'assets' / 'glass'
    d.mkdir(parents=True, exist_ok=True)

    gallery = json.loads(fetch(a.host + '/api/gallery'))
    if a.extra:
        gallery += json.loads(Path(a.extra).read_text(encoding='utf-8'))
    have = site_ids(a.site)

    prev = {}
    feed_path = out / 'glass-feed.json'
    if feed_path.exists():
        try:
            prev = json.loads(feed_path.read_text(encoding='utf-8'))
        except ValueError:
            prev = {}
    prev_src = prev.get('src', {}) if prev.get('fx') == glass_fx.VERSION else {}  # treatment changed: redo every image
    prev_pieces = {p['id']: p for p in prev.get('pieces', [])}

    status, pieces, src = {}, [], {}
    for g in gallery:
        pid = g.get('provenance_id')
        if not pid:
            continue
        st = {'available': 'available', 'sold': 'sold'}.get(g.get('status'), 'collected')
        status[pid] = {'status': st, 'price': g.get('price') or 0}
        if (not g.get('cutout_url') or pid in have or g.get('is_grouped')
                or (g.get('category') or '').startswith(bg.SKIP_CATS + bg.OWN_CATS_ON_SHOPIFY)):
            continue
        keep = prev_src.get(pid) == g['cutout_url'] and pid in prev_pieces and (d / f'{pid}_z.webp').exists()
        if keep:
            img = {k: prev_pieces[pid][k] for k in ('w', 'h', 'zw', 'zh', 'mouth', 'base', 'bw')}
        else:
            tmp = out / f'.{pid}.cutout'
            try:
                tmp.write_bytes(fetch(g['cutout_url']))
                img = bg.make_images(pid, src=tmp, out=d)
            except Exception as e:  # one bad cutout must not stop the others
                print(f'skip {pid}: {e}', file=sys.stderr)
                continue
            finally:
                tmp.unlink(missing_ok=True)
        if not img:
            continue
        piece = bg.gallery_piece(g, img)
        piece['shelf'] = shelf_of(g)
        piece.pop('flip', None)
        if not bg.smokable(piece):
            piece['smoke'] = False
        for k in ('name', 'desc', 'series', 'shape', 'edition'):  # the site's flaggable-word rule
            piece[k] = scrub.prose(piece[k])
        piece['img'] = RAW + 'assets/glass/'
        piece['model'] = g.get('model_url') or ''
        pieces.append(piece)
        src[pid] = g['cutout_url']

    order = {k: i for i, (k, *_) in enumerate(bg.SHELVES)}
    rank = {'available': 0, 'sold': 1, 'collected': 2}
    pieces.sort(key=lambda x: (order[x['shelf']], rank[x['status']], -x['price'], x['name']))
    shelves = [{'key': k, 'title': scrub.prose(t), 'line': scrub.prose(l)} for k, t, l, _ in bg.SHELVES if any(x['shelf'] == k for x in pieces)]
    feed = {'fx': glass_fx.VERSION, 'img': RAW + 'assets/glass/', 'shelf_order': list(order), 'shelves': shelves,
            'pieces': pieces, 'status': status, 'src': src}
    feed_path.write_text(json.dumps(feed, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    # drop images of pieces that left the feed (e.g. they were hand-cut into main)
    live = {p['id'] for p in pieces}
    for f in d.glob('*.webp'):
        if re.sub(r'(_t|_z)?\.webp$', '', f.name) not in live:
            f.unlink()
    print(f'{len(pieces)} feed pieces, {len(status)} statuses')


if __name__ == '__main__':
    main()
