"""SEO plumbing for the cutover: canonical on every indexable page, JSON-LD on the home page, sitemap.xml, robots.txt, 404.html.

Canonical host is https://jeromebaker.com (Semi's migration brief), so the staging copies point at the real thing.
Pages that already say noindex (crew cards, comics strips, holo, dev) are left alone and kept out of the sitemap.
Idempotent: run it any time.   python tools/build_seo.py"""
import json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = 'https://jeromebaker.com'
SKIP = ('dist/', 'node_modules/', 'dev/', 'netlify/', 'assets/', 'tools/', 'holo/')
NL = chr(10)

pages = []
for p in sorted(ROOT.rglob('index.html')):
    rel = p.relative_to(ROOT).as_posix()
    if rel.startswith(SKIP):
        continue
    pages.append((rel, p))


def url_of(rel):
    d = rel[:-len('index.html')]
    return HOST + '/' + d


def lastmod(rel):
    r = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel], cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip() or None


ORG = {"@context": "https://schema.org", "@graph": [
    {"@type": "Organization", "@id": HOST + "/#org", "name": "Jerome Baker Designs", "alternateName": "Jerome Baker", "url": HOST + "/",
     "logo": HOST + "/assets/icons/apple-touch-icon.png", "foundingDate": "1991", "founder": {"@type": "Person", "name": "Jason Harris"},
     "description": "Hand-blown glass pulled by Jason Harris since 1991, one of one with its provenance on file, and the streetwear that rides with it.",
     "sameAs": ["https://www.instagram.com/jerome_baker"]},
    {"@type": "WebSite", "@id": HOST + "/#site", "name": "Jerome Baker", "url": HOST + "/", "publisher": {"@id": HOST + "/#org"}}]}

sitemap = []
done = 0
for rel, p in pages:
    html = p.read_text(encoding='utf-8')
    if 'noindex' in html:
        continue
    add = ''
    if 'rel="canonical"' not in html:
        add += f'<link rel="canonical" href="{url_of(rel)}">' + NL
    if rel == 'index.html' and 'application/ld+json' not in html:
        add += '<script type="application/ld+json">' + json.dumps(ORG, ensure_ascii=False) + '</script>' + NL
    if add:
        html = html.replace('</head>', add + '</head>', 1)
        p.write_text(html, encoding='utf-8', newline='')
        done += 1
    sitemap.append((url_of(rel), lastmod(rel)))

xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u, d in sitemap:
    xml.append('  <url><loc>' + u + '</loc>' + (f'<lastmod>{d}</lastmod>' if d else '') + '</url>')
xml.append('</urlset>')
(ROOT / 'sitemap.xml').write_text(NL.join(xml) + NL, encoding='utf-8', newline='')
(ROOT / 'robots.txt').write_text('User-agent: *' + NL + 'Allow: /' + NL + 'Disallow: /dev/' + NL + NL + 'Sitemap: ' + HOST + '/sitemap.xml' + NL, encoding='utf-8', newline='')

NOT_FOUND = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found. Jerome Baker</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#2A3B8E">
<link rel="icon" href="/favicon.ico" sizes="any">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;0,800;0,900;1,900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
:root{--blue:#2A3B8E;--red:#DA2342;--yellow:#FFF100;--ink:#0A0A0A}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:var(--blue);color:#fff;font-family:Montserrat,Helvetica,Arial,sans-serif;display:grid;place-items:center;text-align:center;padding:24px}
img{width:110px;height:auto;margin:0 auto 16px;display:block;rotate:-4deg;filter:drop-shadow(5px 6px 0 var(--ink))}
.k{font:700 13px "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--yellow);margin:0}
h1{margin:12px 0 0;display:flex;flex-wrap:wrap;gap:8px 12px;justify-content:center;font-weight:900;font-size:clamp(36px,8vw,92px);line-height:.95;letter-spacing:-.02em}
h1 span{padding:2px 14px;display:inline-block}
h1 .a{background:var(--yellow);color:var(--ink);rotate:-2deg}h1 .b{background:#fff;color:var(--blue);font-style:italic;rotate:1.5deg}h1 .c{background:var(--red);rotate:-1deg}
p{max-width:46ch;margin:22px auto 0;font-weight:600;line-height:1.5}
nav{margin-top:26px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
nav a{background:var(--yellow);color:var(--ink);border:3px solid var(--ink);box-shadow:5px 5px 0 var(--red);padding:12px 20px;font-weight:900;text-decoration:none}
nav a:hover{translate:-2px -2px}
</style>
</head>
<body>
<main>
<img src="/assets/img/jb-mark.webp" alt="Jerome Baker" width="110" height="85">
<p class="k">404</p>
<h1><span class="a">This one</span><span class="b">got</span><span class="c">away.</span></h1>
<p>The page you wanted is not here. Pieces move, links change, and a few old URLs from 1998 are still hanging around the internet looking for us.</p>
<nav aria-label="Where to next"><a href="/">Home</a><a href="/glass/">The glass</a><a href="/shop/">Ritual merch</a><a href="/story/tour/">The way back</a></nav>
</main>
</body>
</html>
'''
(ROOT / '404.html').write_text(NOT_FOUND, encoding='utf-8', newline='')
print(f'canonical/JSON-LD added to {done} pages; sitemap has {len(sitemap)} urls; wrote robots.txt and 404.html')
