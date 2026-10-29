# Jerome Baker site concept

Static concept for the national Jerome Baker site: glass, streetwear, the JB Crew and the Travel Guide.

- `index.html`: home. The glass wall (buying switched off for now), real streetwear that links to jeromebakerny.com, the JB Crew, the story, and the Travel Guide teaser.
- `travel/`: The Jerome Baker Travel Guide, a trip companion for the big screen. It explains itself, the words dissolve, and then it keeps evolving and getting stranger the longer it runs. `F` toggles full screen, `Space` pauses. Add `?go` to skip the prompt (kiosks, booth screens).
- `shop/`: Ritual Merch, the rebuild of jeromebakerny.com/shop/. Hero, featured rail, the full merch collection with category, price, search and sort, and a product view with size/colour picking that drops the exact variation into the jeromebakerny.com cart. Every product has a crew member who wears it. Rebuild the catalog with `python tools/build_shop.py` (pulls the live WooCommerce Store API and the photos into `assets/shop/`).
- `crew/`: the JB Crew. Twenty characters off the booth wall and box art, wearing real JB merch. Each has a page with its own weird behaviour (`js/weird.js`). They also float around every page (`js/crew.js`), bump into each other and talk.

## Editing the crew

Edit `tools/crew_data.py`, then run `python tools/build_crew.py`. It rewrites `crew/`, `js/crew-data.js` and the crew and shop blocks in `index.html`.

## Giving the crew a brain

Lines are canned for now. To hook up a model, set `JBCrew.brain` before or after `js/crew.js` loads:

```js
JBCrew.brain = async (who, ctx) => { /* ctx.kind: hello | bump | reply | chat, ctx.with, ctx.said */ return 'text'; };
```

No build step for the site itself. Every path is relative, so it runs from GitHub Pages, any static host, or a local folder.
