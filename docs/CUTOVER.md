# Cutover plan: new Jerome Baker site

Living doc. Update the status column and the log at the bottom every time something moves. Target: **Tue Dec 8, 2026**.
Nothing in the DNS or Shopify column happens without David's yes. See `netlify/README.md` for the mechanics of the two modes.

Status: `done` / `open` / `blocked` / `David` (waiting on David) / `later` (after cutover)

## 1. Code that has to be merged first (in this order)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | PR #107 shop dedupe (`audit/shop-data-dupes`) | open | Merge first. Hides stale and non-sellable copies |
| 2 | Retarget PR #110 (shop pages, SEO) to `main`, merge | open | Generated pages, clean URLs frozen in `tools/shop-paths.json`, JSON-LD escaping and feed validation |
| 3 | PR #108 shop mobile fixes, PR #109 alt text and returns link | open | Independent of the others |
| 4 | Semi's open staging items: `/glass/bongs/`, `/glass/tubes/`, `/faq/`, `/news/`, 143 piece pages, `robots.txt`, `sitemap.xml`, 404, canonical and JSON-LD on home | open | His 1,724 redirects point at these. Checker must pass |

## 2. Shop (merch) before cutover

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Printify titles and copy cleaned (33 titles, 5 descriptions) | done | Live on www.jeromebaker.shop. Backup in the session scratchpad (`inc_backup_pre_rename.json`) |
| 2 | OG Tee prices | done | Re-published variants 2026-11-28; live price now $55 (was $25.73) |
| 3 | Out-of-stock products (Bucket Hat x2, Mesh Cap, Bento Box) | David | Printify can't edit them. Decide: hide or restock |
| 4 | Two Printify shops merged | open | NOT merged as of 2026-11-28: Printify still has 'Jerome Baker Designs, Inc' (55 products, ac535d.myshopify.com, behind www.jeromebaker.shop) and the old 'Jerome Baker Designs' (25 products, jerome-baker-designs.myshopify.com, behind shop.jeromebaker.com). All 25 old titles also exist in Inc. Printify has no transfer API; the old shop stays only as the checkout-only host until cutover |
| 5 | Thin-margin stickers ($5, $10) | later | Prices left alone |
| 6 | `ASSET_HOST` in `tools/build_shop_pages.py` flipped from `jeromebaker.cannacrypted.com` to `https://jeromebaker.com` | open | Then rebuild pages, rerun `scrub.py --check` and the link check |
| 7 | `build_shop.py` reads the .shop store only | open | Drop the old shop.jeromebaker.com source |
| 8 | Paste `netlify/shop-redirects.txt` above the `/products/*` and `/collections/*` catch-alls in `netlify/_redirects.cutover`; change 302 to 301 | open | First match wins, so order matters |
| 9 | Netlify build hook: I create it through the API (vault `netlify`); David adds it as the GitHub repo secret `NETLIFY_BUILD_HOOK` | open | My GitHub token can't set Actions secrets. Until then the 15-minute feed updates the live grid only; static pages refresh on each deploy |
| 10 | Local cart and checkout handoff | later | Not started |

## 3. Netlify and DNS (David's yes needed for every step)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Phase 1 lander live (jeromebaker.com to Netlify, old store on `shop.jeromebaker.com`) | blocked | Needs Shopify primary-domain change and David's yes. Run `netlify/tools/dns_snapshot.py` first and commit it |
| 2 | `MODE=cutover` build, deploy preview, `check.py all` clean | open | The redirect check has only run against a mock so far |
| 3 | `shop.jeromebaker.com` exists, checkout-only, noindex, no robots disallow | open | `/my-account/*` redirects depend on it |
| 4 | GA4 measurement ID in new site head and lander | David | Snippet is marked in `lander/index.html` |
| 5 | Snapshot DNS again, switch, rerun checker on `https://jeromebaker.com` | David | Rollback is in `netlify/README.md` (minutes; 301s take longer to unwind) |
| 6 | Jason's Shopify access | David | |

## 4. Content and brand

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Brand book for the new site (characters, look as shown on the site) | open | The existing book at brand.cannacrypted.com is for NY, not this. Draft in progress |
| 2 | Sasha reply draft | David | Needs David's approval before sending |
| 3 | Semi confirming the 39 products with the client | blocked | Decides what the `/products/*` catch-all hits |

## 5. Day-of checklist

1. All PRs in section 1 merged, `main` builds in `cutover` mode.
2. `python tools/scrub.py --check` is 0 files, link check 0 broken, `build_seo.py` leaves robots/404 as intended.
3. `check.py all` clean on the preview URL.
4. David says go. Snapshot DNS, switch, rerun checker live.
5. Watch Search Console and the 404 log for 48 hours. Submit the new sitemap.

## Log

- 2026-11-27: plan created. Shop copy and titles fixed in Printify, pages and clean URLs pushed to PR #110, feed validation added after the security review.
- 2026-11-28: OG Tee price fixed ($55 live). Stores found NOT merged; see section 2 item 4.
