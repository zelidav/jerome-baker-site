"""Live-site audit: every page at desktop + phone width. Errors, broken requests, overflow, weight, timing, head tags."""
import json, sys, time
from playwright.sync_api import sync_playwright

import sys as _s; BASE = _s.argv[2] if len(_s.argv) > 2 else 'https://jeromebaker.cannacrypted.com/'
CREW = ['torch', 'major-tom-tom', 'chomps', 'enlightened-ed', 'baker-bot', 'honey-pot', 'two-can', 'crude', 'gray', 'mama-cobra',
        'lil-lucky', 'public-enemy', 'jack', 'dillo', 'shellby', 'cy', 'the-spinners', 'peeper', 'mr-x', 'the-grin']
PAGES = ['', 'shop/', 'crew/', 'crew/match/', 'comics/', 'travel/'] + [f'crew/{c}/' for c in CREW]
VIEWS = {'desktop': dict(width=1440, height=900), 'phone': dict(width=390, height=844, is_mobile=True, device_scale_factor=3, has_touch=True)}

out = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for vname, v in VIEWS.items():
        vp = {k: v[k] for k in ('width', 'height')}
        ctx = b.new_context(viewport=vp, is_mobile=v.get('is_mobile', False), device_scale_factor=v.get('device_scale_factor', 1),
                            has_touch=v.get('has_touch', False))
        # the site's 21+ age gate (if any) and the comics gate are click-throughs; measure first view as a visitor sees it
        for path in PAGES:
            pg = ctx.new_page()
            errs, bad, sizes = [], [], {}
            pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)[:200]))
            def onresp(r):
                if r.status >= 400:
                    bad.append(f'{r.status} {r.url[:120]}')
            pg.on('response', onresp)
            pg.on('requestfailed', lambda r: bad.append(f'FAILED {r.url[:120]} {r.failure}'))
            t0 = time.time()
            try:
                pg.goto(BASE + path + '?audit=' + str(int(t0)), wait_until='load', timeout=45000)
            except Exception as e:
                errs.append('GOTO ' + str(e)[:150])
            pg.wait_for_timeout(1500)
            m = pg.evaluate('''() => {
              const nav = performance.getEntriesByType('navigation')[0] || {};
              const res = performance.getEntriesByType('resource');
              let bytes = nav.transferSize || 0, imgs = 0, imgBytes = 0, big = [];
              for (const r of res) { bytes += r.transferSize || 0; if (r.initiatorType === 'img' || /\\.(webp|png|jpe?g|gif|svg)/.test(r.name)) { imgs++; imgBytes += r.transferSize || 0; }
                if ((r.transferSize || 0) > 150000) big.push([Math.round(r.transferSize/1024) + 'KB', r.name.replace(location.origin, '')]); }
              const lcp = (window.__lcp || 0);
              const d = document.documentElement;
              return { ttfb: Math.round(nav.responseStart || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0),
                kb: Math.round(bytes / 1024), reqs: res.length + 1, imgs, imgKB: Math.round(imgBytes / 1024), big,
                overflow: d.scrollWidth > d.clientWidth + 1 ? d.scrollWidth - d.clientWidth : 0,
                title: document.title, desc: !!document.querySelector('meta[name=description]'), og: !!document.querySelector('meta[property="og:image"]'),
                icon: !!document.querySelector('link[rel=icon]'), h1: document.querySelectorAll('h1').length,
                imgNoAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
                navLinks: [...document.querySelectorAll('header nav a')].map(a => a.textContent.trim()).filter(Boolean),
                lazyMissing: [...document.images].filter(i => i.getBoundingClientRect().top > innerHeight * 1.5 && i.loading !== 'lazy').length };
            }''')
            # LCP via PerformanceObserver buffered
            lcp = pg.evaluate('''() => new Promise(r => { let v = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) v = e.startTime; }).observe({type:'largest-contentful-paint', buffered:true}); } catch(e){}; setTimeout(() => r(Math.round(v)), 300); })''')
            m.update(view=vname, path='/' + path, lcp=lcp, errs=errs[:6], bad=bad[:8])
            out.append(m)
            print(f"{vname:7} /{path:24} load {m['load']:5}ms lcp {lcp:5}ms {m['kb']:6}KB {m['reqs']:3}req ovf {m['overflow']} errs {len(errs)} bad {len(bad)}", flush=True)
            pg.close()
        ctx.close()
    b.close()
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else 'crawl.json', 'w'), indent=1)
