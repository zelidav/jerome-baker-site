"""Instagram feed for the site (contact page "Follow the torch"), via the Instagram API with Instagram Login.

Run by .github/workflows/ig-feed.yml every 6 hours. Reads the long-lived token from IG_TOKEN (a GitHub Actions secret;
the token never goes in the repo, which is public), refreshes it so it doesn't lapse, pulls the latest posts and writes
them into OUT (a checkout of the `ig-feed` data branch):
    OUT/feed.json            [{id, caption, permalink, timestamp, type, img}]  newest first, 12 posts
    OUT/media/<id>.jpg       a 640px copy of each post's picture (Instagram's own image links expire after a few days)
The site reads both from raw.githubusercontent.com, so a new post shows up without a site deploy.

    IG_TOKEN=... python tools/ig_feed.py OUT_DIR
"""
import io, json, os, sys, urllib.parse, urllib.request

from PIL import Image

API = 'https://graph.instagram.com'
N = 12

def get(path, **q):
    url = f'{API}/{path}?{urllib.parse.urlencode(q)}'
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'replace')[:400]
        # never echo the token: the URL carries it, so report only the path and Instagram's error
        sys.exit(f'Instagram API {path} failed: HTTP {e.code} {body}')

def main(out):
    tok = os.environ.get('IG_TOKEN', '').strip()
    if not tok:
        sys.exit('IG_TOKEN is not set')
    # keep the 60-day token alive (allowed once it is at least 24 hours old; a fresh one just returns as-is)
    try:
        r = get('refresh_access_token', grant_type='ig_refresh_token', access_token=tok)
        print('token refreshed, expires in', r.get('expires_in'), 'seconds')
    except SystemExit as e:
        print('token refresh skipped:', str(e)[:200])
    me = get('me', fields='username', access_token=tok)
    data = get('me/media', fields='id,caption,media_type,media_url,thumbnail_url,permalink,timestamp', limit=N, access_token=tok).get('data', [])
    os.makedirs(os.path.join(out, 'media'), exist_ok=True)
    feed, keep = [], set()
    for m in data[:N]:
        src = m.get('thumbnail_url') if m.get('media_type') == 'VIDEO' else m.get('media_url')
        if not src:
            continue
        fn = f"{m['id']}.jpg"
        path = os.path.join(out, 'media', fn)
        if not os.path.exists(path):
            with urllib.request.urlopen(src, timeout=60) as r:
                im = Image.open(io.BytesIO(r.read())).convert('RGB')
            im.thumbnail((640, 640))
            im.save(path, quality=82, optimize=True, progressive=True)
        keep.add(fn)
        feed.append({'id': m['id'], 'caption': (m.get('caption') or '')[:300], 'permalink': m['permalink'],
                     'timestamp': m.get('timestamp'), 'type': m.get('media_type'), 'img': 'media/' + fn})
    if not feed:
        sys.exit('Instagram returned no posts; leaving the last feed in place')
    for fn in os.listdir(os.path.join(out, 'media')):
        if fn not in keep:
            os.remove(os.path.join(out, 'media', fn))
    json.dump({'username': me.get('username'), 'posts': feed}, open(os.path.join(out, 'feed.json'), 'w', encoding='utf-8'), indent=1)
    print('wrote', len(feed), 'posts for @' + str(me.get('username')))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'ig-out')
