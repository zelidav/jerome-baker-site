# Plan: drop Shopify and Woo, run our own cart and checkout (Shippo for shipping)

Draft 2026-11-28. Nothing here is built yet. Goal: one catalog, one cart, one checkout we own, a two-step cart that lets us measure abandonment, Printify for print-on-demand, Shippo for anything we ship ourselves.

## What exists today

| Piece | Today | Replaced by |
|---|---|---|
| Print-on-demand merch | Printify shops -> Shopify (`www.jeromebaker.shop`, old `shop.jeromebaker.com`) | Our catalog + Printify **orders API** (Printify makes and ships, gives tracking) |
| NY stocked merch | WooCommerce `jeromebakerny.com` (93 items) | Our catalog + **Shippo** labels from JB inventory |
| Cart and card | Shopify and Woo checkouts | Our two-step checkout + the card gateway already built for Made in Xiaolin (Echelon/EPSG) |
| Product data | Shopify and Woo feeds | One products table (the site's `shop-data` shape, plus stock, weight, Printify ids) |

Real volume to size this against: the two Printify shops together have 55 orders ever (37 in the last 12 months), none in the last 30 days. The Shopify-side revenue is not readable with the apps we hold (see the report note below).

## Architecture

- **Where it runs:** extend the existing Cloud Run + Cloud SQL app family (the Made in Xiaolin store already does catalog, card checkout, Resend email). Do not start a new stack.
- **Tables:** `products`, `variants` (price, stock, weight, printify_variant_id), `carts`, `checkouts`, `orders`, `shipments`, `events`.
- **Pages:** the static product pages we just built stay (SEO). Add-to-cart writes a cart cookie id; `/cart/` and `/checkout/` are the only dynamic pages.
- **Tax:** NY clothing under $110 is exempt, other items and other states are not. Pick one engine before launch (Stripe Tax, TaxJar or a rate table). This is the biggest thing Shopify does for us silently.
- **Processor:** card data goes only to the gateway's hosted fields. We never see or store card numbers. Glass and paraphernalia need a processor that accepts them; Echelon is the one already approved for the cannabis-adjacent brands.

## Two-step cart (abandonment you can measure)

1. **Cart.** Items, quantity, shipping estimate. Event `cart_viewed`.
2. **Step 1, your details.** Email, name, shipping address, phone. On submit the server creates a `checkouts` row (`status=started`, cart snapshot, email, UTM source) *before any card field is shown*. Event `info_submitted`.
3. **Step 2, payment.** Shipping method and total shown, card in the gateway's hosted fields. Event `payment_started`. Success sets `status=paid` and creates the order. Event `paid`.
4. **Abandoned** = `started` with no `paid` after 60 minutes. A daily dashboard shows the funnel (cart -> info -> payment -> paid), count and value of abandoned checkouts, by device and source.
5. **Recovery email** is a separate switch, off by default. It sends only to people who ticked a clear consent box in step 1, from raise/orders mail on our domain, with no cannabis claims. Nothing sends without David's yes on the copy.

## Fulfilment

- **Printify items:** on `paid`, call Printify `POST /shops/{id}/orders.json` (needs one API-type Printify shop; we create a new "manual/API" shop and move the 55 products by recreating them). Printify ships and returns tracking; we email it.
- **Stocked items (NY merch, glass):** on `paid`, call Shippo to buy the label (rates at checkout come from Shippo; account is on sales@jeromebakerny.com, Starter tier caps at 30 labels a month, so upgrade or use the live token path).
- **Mixed carts:** split into two shipments, show both in the order email.

## Phases

| # | Phase | What ships | Rough size |
|---|---|---|---|
| 0 | Dec 8 cutover as planned | New site live, merch still checks out on Shopify (`www.jeromebaker.shop`) | no new build |
| 1 | Data | One products table, imported from Printify + Woo, Shopify handles kept for redirects | 2-3 days |
| 2 | Cart + step 1 + event table | Working cart, info step, `checkouts` rows, funnel dashboard (no payments yet, "coming soon" at step 2) | 3-4 days |
| 3 | Payment + orders + tax | Step 2 with gateway, order records, confirmation emails, tax engine | 4-6 days |
| 4 | Fulfilment | Printify orders API, Shippo labels, tracking emails, refunds | 4-5 days |
| 5 | Parallel run | Own checkout for NY stocked merch first (Woo retired), then Printify merch; Shopify left up as fallback | 1-2 weeks of real orders |
| 6 | Retire | Shopify and Woo stores switched off after 30 clean days | |

Recommendation: do **not** try this before Dec 8. Cut over the site as planned, then build phases 1 to 3 and run them in parallel with Shopify for NY merch.

## Decisions needed from David

1. **Glass.** Does the old Shopify store (`shop.jeromebaker.com`, the $3M DTC history) also move onto this, or only merch? Glass needs serial/piece handling and the provenance app, so it is a bigger job than merch.
2. **Tax engine** choice and who files returns.
3. **Processor** confirmation for merch that touches paraphernalia (Echelon only?).
4. **Recovery emails:** yes or no, and who approves copy.
5. **Shippo plan:** stay on Starter (30 labels a month) or upgrade.

## Cheap interim step

Shopify already records abandoned checkouts (Admin, Orders, Abandoned checkouts) and the two-step capture on our own cart can be built in phase 2 without touching payments, so abandonment measurement can start before the payment build is done.
