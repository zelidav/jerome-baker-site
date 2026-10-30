"""Functional checks on the live site. Prints PASS/FAIL per check."""
import re, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'https://jeromebaker.cannacrypted.com/'
STUDIO = 'https://jb-site-studio-804083036164.us-east1.run.app/'
results = []


def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))

    # ---- home
    pg.goto(BASE + '?f=1', wait_until='load'); pg.wait_for_timeout(1500)
    check('home: floating crew present', pg.locator('.floater').count() > 0, str(pg.locator('.floater').count()))
    check('home: glitch headings marked', pg.locator('.glt').count() > 0, str(pg.locator('.glt').count()))
    check('home: merch cards link into shop', pg.locator('a.mcard[href*="shop/#p="]').count() >= 10, str(pg.locator('a.mcard[href*="shop/#p="]').count()))
    check('home: Find your crew button', pg.locator('a[href*="crew/match"]').count() > 0)
    # crew click-through: freeze a floater, hover, click
    box = pg.evaluate("() => { const b = JBCrew.bodies[0]; b.hover = true; const r = b.el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2, slug: b.who.slug}; }")
    pg.mouse.move(box['x'], box['y']); pg.wait_for_timeout(700); pg.mouse.click(box['x'], box['y']); pg.wait_for_timeout(1500)
    check('home: clicking a floating crew member opens their page', f"/crew/{box['slug']}/" in pg.url, pg.url)

    # ---- shop
    pg.goto(BASE + 'shop/?f=1', wait_until='load'); pg.wait_for_timeout(1500)
    check('shop: featured rail has 8', pg.locator('#rail .pcard').count() == 8, str(pg.locator('#rail .pcard').count()))
    total = pg.locator('#grid .pcard').count()
    check('shop: full grid renders', total >= 80, str(total))
    pg.click('#cats button[data-cat="Footwear"]'); pg.wait_for_timeout(300)
    fw = pg.locator('#grid .pcard').count()
    check('shop: Footwear filter narrows', 0 < fw < total, f'{fw} of {total}')
    pg.fill('#q', 'flip'); pg.wait_for_timeout(300)
    check('shop: search within category', 0 < pg.locator('#grid .pcard').count() <= fw, str(pg.locator('#grid .pcard').count()))
    pg.click('#clear'); pg.select_option('#sort', 'price-asc'); pg.wait_for_timeout(300)
    prices = [float(t.replace('$', '')) for t in pg.locator('#grid .pcard .pr').all_inner_texts()]
    check('shop: price sort ascending', prices == sorted(prices) and len(prices) == total, f'{prices[:3]}...')
    pg.goto(BASE + 'shop/#p=hybrid-bong-polo', wait_until='load'); pg.wait_for_timeout(1500)
    check('shop: product deep link opens dialog', pg.locator('dialog#pd[open]').count() == 1)
    check('shop: buy disabled until options picked', pg.get_attribute('#pdBuy', 'aria-disabled') == 'true')
    pg.click('#pd .chips button:text-is("Black")'); pg.click('#pd .chips button:text-is("L")')
    href = pg.get_attribute('#pdBuy', 'href') or ''
    check('shop: add-to-cart link carries the exact variation', bool(re.search(r'add-to-cart=720&quantity=1&variation_id=\d+&attribute_pa_color=black&attribute_pa_size=l', href)), href[-90:])
    check('shop: recommended products', pg.locator('.pd-rec .pcard').count() >= 2)
    check('shop: worn-by crew link', pg.locator('.wornby[href*="crew/"]').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('shop: Escape closes dialog', pg.locator('dialog#pd[open]').count() == 0)
    pg.goto(BASE + 'shop/#cat=footwear', wait_until='load'); pg.wait_for_timeout(1200)
    check('shop: #cat deep link filters', pg.locator('#grid .pcard').count() == fw, str(pg.locator('#grid .pcard').count()))

    # ---- crew wall + a crew page
    pg.goto(BASE + 'crew/?f=1', wait_until='load'); pg.wait_for_timeout(800)
    check('crew wall: 20 pins', pg.locator('.pinboard .pin').count() == 20, str(pg.locator('.pinboard .pin').count()))
    pg.goto(BASE + 'crew/cy/?f=1', wait_until='load'); pg.wait_for_timeout(800)
    txt = pg.inner_text('body')
    check('crew page: who-they-are block', 'Brooklyn' in txt, '')
    check('crew page: merch links into shop', pg.locator('a[href*="shop/#p="]').count() >= 1)
    check('crew page: rap sheet + talk', 'Rap sheet' in txt)

    # ---- find your crew
    pg.goto(BASE + 'crew/match/?f=1', wait_until='load'); pg.wait_for_timeout(1000)
    check('quiz: 21+ card first', pg.locator('.mx-gate').count() == 1)
    pg.click("text=I'm 21+. Ask me"); pg.wait_for_timeout(250)
    for i in range(8):
        if pg.locator('.mx-result').count():
            break
        if pg.locator('.mx-range').count():   # slider rounds: move it, then lock it in
            pg.locator('.mx-range').focus(); pg.keyboard.press('ArrowRight')
            pg.click('.mx-lock')
        elif pg.locator('.mx-opt').count():
            pg.locator('.mx-opt').nth(i % pg.locator('.mx-opt').count()).click()
        pg.wait_for_timeout(250)
    body = pg.inner_text('main')
    check('quiz: reaches a result', 'your crew is' in body.lower(), body[:80].replace('\n', ' '))
    check('quiz: result shows merch links', pg.locator('a[href*="shop/#p="]').count() >= 1)
    pg.goto(BASE + 'crew/match/#gray', wait_until='load'); pg.wait_for_timeout(1000)
    check('quiz: shared #slug link shows that result', 'Gray' in pg.inner_text('main'))

    # ---- glass
    pg.goto(BASE + 'glass/', wait_until='load'); pg.wait_for_timeout(1200)
    n = pg.locator('.tile').count()
    check('glass: store grid renders', n >= 40 and pg.locator('.aisle').count() >= 4, str(n))
    check('glass: real prices', pg.locator('.tile .t-price').first.inner_text().startswith('$'))
    pg.click('#priceSeg button[data-p="0-100"]'); pg.wait_for_timeout(200)
    cheap = pg.evaluate("[...document.querySelectorAll('.tile:not([hidden])')].every(e => JB_GLASS.pieces.find(p => p.id === e.dataset.id).price < 100)")
    check('glass: price filter', cheap and pg.locator('.tile:not([hidden])').count() > 0)
    pg.click('#priceSeg button[data-p="all"]'); pg.wait_for_timeout(200)
    pg.locator('#s-le .tile').nth(1).hover(); pg.wait_for_timeout(900)
    check('glass: hover smokes', pg.evaluate("!!document.querySelector('.tile.lit')"))
    pg.goto(BASE + 'glass/#p=JBD-5BE3DA25CD0F', wait_until='load'); pg.wait_for_timeout(1200)
    check('glass: deep link opens the piece', pg.locator('#bench[open]').count() == 1 and 'Nazarre' in pg.locator('#bName').inner_text())
    hb = pg.locator('#bHit').bounding_box()
    pg.mouse.move(hb['x'] + 20, hb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1500)
    lvl = float(pg.evaluate("getComputedStyle(document.querySelector('#bFill')).getPropertyValue('--lvl')") or 0)
    pg.mouse.up(); pg.wait_for_timeout(400)
    check('glass: hold fills the glass', lvl > .3, f'{lvl:.2f}')
    buy = pg.locator('#bBuy').get_attribute('href') or ''
    check('glass: buy goes to the provenance checkout', buy.startswith('https://jbcustomer.cannacrypted.com/buy/JBD-5BE3DA25CD0F'), buy)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('glass: closing clears the link', pg.evaluate('location.hash') == '')
    pg.goto(BASE, wait_until='load')
    check('home: glass cards link to pieces', pg.locator('#glass a[href^="glass/#p="]').count() >= 10)

    # ---- comics
    pg.goto(BASE + 'comics/?f=1', wait_until='load'); pg.wait_for_timeout(1000)
    check('comics: 21+ gate shown, strips not loaded', pg.locator('#gate:not([hidden])').count() == 1 and pg.locator('.pn').count() == 0)
    check('comics: no floating crew', pg.locator('.floater').count() == 0)
    pg.click('#gateYes'); pg.wait_for_timeout(1000)
    check('comics: 6 strips (Origins 1-3, #1-#3), 24 panels', pg.locator('.hs-strip').count() == 6 and pg.locator('.pn').count() == 24)
    check("comics: who's who cast cards", pg.locator('.who-card').count() >= 10)
    check('comics: motion hotspots', pg.locator('.pn .fire').count() >= 6, str(pg.locator('.pn .fire').count()))
    pg.locator('#issue-3').scroll_into_view_if_needed(); pg.wait_for_timeout(800)
    check('comics: motion runs on visible panels', pg.locator('#issue-3 .pn.live').count() >= 1)
    ok = all(pg.evaluate(f"() => fetch('hotshop/hot-shop-0{n}-strip.jpg', {{method:'HEAD'}}).then(r => r.ok)") for n in (1, 2, 3))
    check('comics: strip downloads exist', ok)

    # ---- travel
    pg.goto(BASE + 'travel/?f=1', wait_until='load'); pg.wait_for_timeout(1500)
    check('travel: loads with start prompt', pg.locator('button, a').filter(has_text=re.compile('full screen|stay', re.I)).count() >= 1)

    # ---- studio
    r = pg.request.get(STUDIO + 'guide'); check('studio: guide page', r.status == 200, str(r.status))
    r = pg.request.get(STUDIO + 'api/me'); check('studio: API needs login', r.status == 401, str(r.status))
    r = pg.request.get(STUDIO + 'p/main/'); check('studio: unsigned previews refused', r.status in (401, 404), str(r.status))

    check('no uncaught JS errors across the run', not errs, '; '.join(errs[:3]))
    b.close()

print(f"\n{sum(1 for r in results if r[0])}/{len(results)} passed")
