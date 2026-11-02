# Making the site buyable: crew promos and the e-commerce plan

*Jerome Baker national site (jeromebaker.cannacrypted.com), November 2026. Branch `studio/crew-promos`, test mode.*

## The goal

People come to this site for the crew, the comics and the glass, not with a shopping list. So the site has to turn attention into purchases on its own: a buy button always within reach, and small, true, well-timed reasons to buy now. Everything here follows one rule: **every urgency or discount claim is real**. Fake timers and invented stock convert once and cost the brand afterward, and the FTC treats them as deceptive "dark patterns".

## What shipped in this branch

### 1. Crew promos

A crew member walks in from the edge of the screen holding a hand-lettered sign or a golden ticket. Tapping the code copies it and saves it to a small gold ticket stub in the corner, where it stays until it expires.

| Offer | Who holds it | Deal | Who gets it |
|---|---|---|---|
| **Golden ticket** | Torch, Mama Cobra, Mouthy, Crude or Big Bill | 15%, 20% or 25% off glass (giant bongs excluded), good for 48h | Earned: 3+ visits, or 8+ minutes on site. At most once every 3 days |
| **Merch unlocks glass** | Beamer (the alien) | 10% off glass with any merch order. "Up to $4,000 off The Alien" (10% of $40,000) | Anyone, at most every 6h |
| **Crew pick** | The character whose page or outfit you're looking at | 15% off the item they're wearing, good for 24h | Anyone, at most every 2h |

**When it shows:** up to 3 offers per visit, at least 60 seconds apart, each type once. They appear at the moments a shopper is about to drift off or leave:
- **Attention slips:** they were tapping and scrolling, then nothing for 12 seconds (15 on desktop)
- **Heading out:** a fast scroll back toward the top after reading down the page
- **Exit intent (desktop):** the mouse leaves toward the tabs or the back button
- **Came back:** they switched tabs for 10+ seconds and returned
- **Hesitating:** 20 seconds on one product without moving on

**What keeps it from being annoying:** never in the first 30 seconds of a visit. One tap to dismiss. Two dismissals in a row turn offers off for the rest of the visit. No offers on the Travel Guide or the comics, or while a viewer or lightbox is open.

**Files:** `js/promo.js`, `css/promo.css`, and a loader at the end of `js/dock.js` (the dock is on every page, so promos reach every page with no rebuild).

### 2. "Get the fit" bundles and price anchoring
Every crew page now has a **Get the fit** box under "What <name> is wearing", with three real bundles at today's prices:
- **Just the piece**: the main item they wear, full price.
- **The fit** (flagged as the character's pick): their outfit plus the missing piece (a hat, or a tee), **15% off**. The best value per item, so it's the obvious choice.
- **Full fit**: The fit plus shoes (or a backpack), **12% off**.

The "separately" price is the real sum of today's prices, so no fake "was" prices. Savings show in dollars. On a phone the pick is listed first.

**Anchoring:** the merch page's featured rail now runs from most expensive to least ($92 board shorts and $89 high-tops first, $22 crop top last), so the first prices people see set the reference point. The glass page already does this, with the giant bongs first and each shelf sorted high to low.

**Why it works:** a three-tier choice where the middle tier is clearly the best value moves people from one item to a basket, and it's honest because every tier is real and buyable. The rules we follow: anchor with a real item, never a fake "was" price, never a decoy you can't actually buy.

Files: `js/fit.js`, `css/fit.css` (loaded from `js/dock.js` on crew pages only), and the featured sort in `tools/build_shop.py`.

### 3. Test mode
Codes start with `TEST-` and say "not valid at checkout yet". Nothing touches the Woo store or the glass checkout. Every action is logged (`promo_shown`, `promo_claimed`, `promo_dismissed`, `promo_copied`, with page, character and trigger) so we can measure it once analytics is chosen.

## Why it's built this way

**Architecture**
- **One script, loaded by the dock.** Every page already loads the dock, so promos reach the whole site without touching 30+ generated pages. The comics never load the dock, and the Travel Guide is excluded in code.
- **Nothing on the server yet.** Visit counting and timing live in the visitor's browser (no personal data). That keeps test mode completely separate from real money. At go-live only one thing changes: the code comes from the glass app (single-use, expiring, one per email) instead of being made on the page.
- **Live numbers, not hard-coded.** "Up to $4,000 off" is computed from The Alien's current price and status, and the line disappears if the piece sells.
- **Designed to be measured.** Each offer type and character gets its own code prefix and event, so we can see which character actually sells.

**Buying logic, and the research behind it**
- **Earned beats sprayed.** Blanket sitewide sales teach people to wait. The golden ticket is earned by coming back, so it reads as luck and a reward for loyalty, not a markdown.
- **Timing at the moment of drift.** An offer that arrives while someone is engaged interrupts them. Arriving when attention slips or they're leaving catches people who were about to go anyway. We never raise the discount when they try to leave: research on deal timing says that teaches people to fake leaving.
- **Cross-selling up the price ladder.** "Merch unlocks glass" uses a $35 tee to get people to the $550–$40,000 glass, and the item they want is framed as the reward. Framing the wanted item as the gift has lifted sales by up to 78% in field studies (Liu et al. 2022, *IJRM*). The condition comes before the reward ("with any merch order → 10% off").
- **Dollars for big tickets, percent for small.** For prices above $100, shoppers respond more to dollar amounts than to percentages (González 2016, *J. Business Research*). That's why the glass offer leads with "$4,000" and the tee offer with "15%".
- **Short, stated deadlines (24–72h), no fake countdowns.** Online deadlines mainly drive return visits (Hmurovic 2022, *JMR*), and that's what the ticket stub is for: it brings people back. One-of-one glass is real scarcity, so we never need fake scarcity.
- **The characters are the salespeople.** The crew already wears the merch, and "Torch's pick: the hoodie he's wearing" connects the story to a product with one tap. It also keeps offers in the brand's voice instead of a generic popup.
- **Phone first.** On a phone the card is a compact sign above the bottom menu, never a full-screen takeover, and it's easy to dismiss. This follows Google's interstitial guidance and standard popup good practice.

## How to review it

**On the live site:** promos and bundles are hidden from normal visitors while codes are TEST codes. Open any page with `?promo=on` once (e.g. https://jeromebaker.cannacrypted.com/crew/torch/?promo=on) and that browser sees them from then on. `?promo=off` turns them back off. The price-anchored merch row is live for everyone.


The preview is in the **Site Studio**: https://jb-site-studio-804083036164.us-east1.run.app. Sign in, open **Changes → "Crew promos"**, then **OPEN FULL PREVIEW ↗**. At the end of the preview address, add:
- `?promo=golden` for the golden ticket
- `?promo=glass` for Beamer's "up to $4,000 off The Alien"
- `?promo=crew` for a crew pick (on a crew page it's that character, e.g. `crew/torch/?promo=crew`)

To see the real timing, open any page without `?promo=`. Scroll and tap around for at least 30 seconds, then stop touching it for 12 seconds. Note: the Studio preview runs in a locked-down sandbox, so copy-to-clipboard and remembering visits don't work there. Use the `?promo=` links to see each offer.

Code: https://github.com/zelidav/jerome-baker-site/compare/main...studio/crew-promos

## Before this goes live (needs Dopestr's help in places)
1. **Real codes:** minted by the glass app, single-use, expiring, one per email, and mirrored to native Woo coupons so they work in the Woo coupon box too.
2. **Glass checkout:** today it refuses discount codes on one-of-one pieces, and all art glass and giant bongs are one of one. That rule has to change for glass offers.
3. **Apply a code from a link:** neither checkout can take a code from a URL yet. On Woo (Dopestr) this is a small addition. Until then the code is copied for the shopper.
4. **Bundles:** a Woo coupon per bundle that only applies when every piece is in the cart (product restrictions + minimum quantity), or a real bundle product.
5. **Glass with merch:** needs a Woo order notification that issues the glass code after a real merch order.
6. **Analytics:** pick a tool and swap out the console log.

## What's next on the buyable plan
- **Holo cloth on phones:** grab handles on the page (the page scrolls everywhere else), plus a full-screen viewer with spin, pinch-zoom and the buy bar inside it.
- **Sticky buy bar** on phone product views (price, size, Add to bag) and **"Shop the look"** under every crew image.
- **A real bag:** collect items on this site and hand the whole bag to Woo checkout at once, instead of leaving the site on every add. This is likely the single biggest gain, and it needs a multi-item add from Dopestr.
- **Glass pages:** the price under the image, slow-motion or video of each piece (for hand-made goods, video lifted willingness to pay 79% in Roggeveen et al. 2015, *J. Marketing*), and a few "Sold" pieces left visible as proof.
