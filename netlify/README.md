# Netlify package for the new Jerome Baker site

Everything here is built and tested without touching DNS. Two modes, one switch.

| Mode | What jeromebaker.com serves | When |
|---|---|---|
| `lander` | The "Pick your Jerome" page at `/`. Every other URL 302s to the old store, untouched. | Phase 1, while we verify |
| `cutover` | The new site at `/` with Semi's 1,724 one-hop 301s (`_redirects.cutover`, his v2 file, unedited). | Phase 2, target Tue Dec 8 |

## Files

- `lander/index.html` the choice page. The two button URLs live in one `JB_LANDER` block at the bottom of the file.
- `_redirects.lander` host rule plus a 302 catch-all to the old store. `__OLD_HOST__` is filled in at build time.
- `_redirects.cutover` Semi's `jb-redirects-v2.txt`, byte for byte (1,724 rules).
- `_headers` security headers and long cache on assets.
- `build.sh` builds `dist/`. `MODE=lander OLD_HOST=<host> bash netlify/build.sh` or `MODE=cutover bash netlify/build.sh`.
- `../netlify.toml` build command, publish dir, default env (`MODE=lander`, `OLD_HOST=jeromebaker.com`, preview only).
- `tools/check.py` the checker (see below). `tools/dns_snapshot.py` read-only DNS backup.

## Setup on Netlify (Semi)

1. New site from Git, repo `zelidav/jerome-baker-site`, branch `main`. Build settings come from `netlify.toml`.
2. First deploy is a lander preview on the `*.netlify.app` URL. DNS is not involved.
3. GA4: put the measurement ID in the snippet marked in `lander/index.html`, and in the new site's head before cutover. The lander already fires a `lander_choice` event (`new` or `old`) if `gtag` exists, so we can see which way people go.
4. Run the checker against the preview (below). Fix or flag anything it prints.
5. Do not add `jeromebaker.com` as a custom domain until the DNS steps below.

## The checker

```
python netlify/tools/check.py all https://<preview>.netlify.app
```

- `redirects`: for every exact rule in `_redirects.cutover` it checks the status code, the exact target, and that the target itself answers 200 (so nothing is two hops or a 404). Plus a sample of each pattern rule. Run it on a build made with `MODE=cutover`.
- `links`: crawls the key pages (home, glass, shop, crew, wholesale, contact, story, tour, travel, comics, privacy, terms, returns) and checks every internal link and image answers 200. Shopping pages are tagged in the output.
- Exits 1 on any failure and writes `tools/last-report.txt`. Cutover does not happen while it fails.
- Run against the live new site today: 13 pages, 180 internal links and assets, all good. The one 503 it hit on `/crew/dr-squint/` was a blip, three retries returned 200.
- The redirect check has been run against a mock server built from the rules (1,695 exact rules plus patterns). It has not run against real Netlify yet. That is the first thing to do on the preview.

## Phase 1: lander live (DNS change, needs David's yes)

Prerequisite: the old store must answer on a hostname other than the root, because the root now points at Netlify. Shopify can do this in Settings, Domains (make `shop.jeromebaker.com` or similar the primary, keep the myshopify address as a fallback). Set `OLD_HOST` to that host and rebuild.

1. `python netlify/tools/dns_snapshot.py jeromebaker.com netlify/dns-backups/` and commit the file. Read-only.
2. Move the old store to its new host. Click through cart and checkout on that host. Run the checker's shopping pages by hand.
3. Add `jeromebaker.com` and `www` to the Netlify site, then change the GoDaddy A/CNAME records Netlify gives you.
4. Check: `/` shows the lander, `/products/anything` lands on the old store, "Stick w the old one" works, "Experience the new JB site" works.

## Rollback (minutes)

1. In GoDaddy, put back the records from the snapshot JSON (the A and CNAME for `@` and `www`). TTL is the only wait.
2. If the old store host was changed, point Shopify's primary domain back to `jeromebaker.com`.
3. Lander mode keeps all old URLs as 302s, so Google has not been told anything permanent. Cutover mode uses 301s, so rolling back after Dec 8 means deleting the rules and waiting out cache. That is why we run lander first.

## Phase 2: cutover

1. `MODE=cutover`, deploy, run `check.py all` on the preview. Must be clean.
2. Semi's open items on staging must be done first: `/glass/bongs/`, `/glass/tubes/`, `/faq/`, `/news/`, the 143 piece pages, `robots.txt`, `sitemap.xml`, the 404 page, canonical and JSON-LD on home. His redirects point at these.
3. Snapshot DNS again, then switch. Re-run the checker against `https://jeromebaker.com`.

## Notes for the redirect file

- `shop.jeromebaker.com` is referenced by `/my-account/*`. It must exist and be checkout-only, noindex, no robots disallow (Semi's call, agreed).
- The two catch-alls (`/products/*` and `/collections/*` to `/glass/`) are 301s. Any product that still sells and is not listed lands on the glass page. Semi is confirming the 39 products with the client.
- No `/shop` rule on purpose (Semi): the host adds the slash and an explicit rule can loop.
