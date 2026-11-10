"""Social kit for The Hot Shop: swipe slides for an Instagram / Facebook carousel, plus a share page per issue.

For every issue in comics/hotshop/issues.js this writes:
  comics/hotshop/slides/<slug>-1.jpg ... -6.jpg   1080x1350 (4:5): a cover, the four lettered panels, a closing card
  comics/i/<n>/index.html                         a tiny page with this issue's title and strip as the link preview
                                                  (Facebook and X ignore #issue-n), which forwards to comics/#issue-<n>

Panels are drawn from the panel art (comics/hotshop/<slug>-<k>.webp) with the caption, sound effect and lines lettered
on, so a slide reads on its own without the site. Needs Pillow and Node (to read issues.js).
    python tools/build_comic_slides.py
"""
import html, json, os, re, subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HS = os.path.join(ROOT, 'comics', 'hotshop')
OUT = os.path.join(HS, 'slides')
SITE = 'https://jeromebaker.cannacrypted.com/'
W, H, FR = 1080, 1350, 22
YEL, INK, RED, BLUE, WHITE = (255, 241, 0), (10, 10, 10), (218, 35, 66), (42, 59, 142), (255, 255, 255)
F = 'C:/Windows/Fonts/'
def font(name, size):
    for p in (F + name, '/usr/share/fonts/truetype/msttcorefonts/' + name, '/Library/Fonts/' + name):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()
BLACK = lambda s: font('ariblk.ttf', s)
BOLD = lambda s: font('arialbd.ttf', s)
MONO = lambda s: font('consolab.ttf', s)
IMPACT = lambda s: font('impact.ttf', s)

def clean(t):
    return html.unescape(re.sub(r'<[^>]+>', '', t or '')).strip()

def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines

def text_block(d, xy, text, f, width, fill, gap=1.22):
    x, y = xy
    for ln in wrap(d, text, f, width):
        d.text((x, y), ln, font=f, fill=fill)
        y += int(f.size * gap)
    return y

def block_h(d, text, f, width, gap=1.22):
    return len(wrap(d, text, f, width)) * int(f.size * gap)

def frame():
    im = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W - 1, H - 1), outline=YEL, width=FR)
    return im, d

def cover_fit(src, w, h, focus_y=0.42):
    s = max(w / src.width, h / src.height)
    r = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    x = (r.width - w) // 2
    y = max(0, min(r.height - h, int(r.height * focus_y - h / 2)))
    return r.crop((x, y, x + w, y + h))

def panel_slide(s, k, p):
    im, d = frame()
    inner = W - 2 * FR
    cap, sfx = clean(p.get('cap')), clean(p.get('sfx'))
    count = clean(s.get('count')) if k == 0 else ''
    # caption band
    cf = BLACK(38)
    cap_w = inner - 60 - (200 if sfx else 0)
    ch = (block_h(d, cap, cf, cap_w) if cap else 0) + (58 if count else 0)
    band = max(110, ch + 54) if (cap or count or sfx) else 0
    y0 = FR
    if band:
        d.rectangle((FR, y0, W - FR - 1, y0 + band), fill=YEL)
        d.line((FR, y0 + band, W - FR, y0 + band), fill=INK, width=5)
        ty = y0 + 26
        if count:
            cfnt = MONO(26)
            tw = d.textlength(count, font=cfnt)
            d.rectangle((FR + 28, ty, FR + 28 + tw + 24, ty + 44), fill=RED)
            d.text((FR + 40, ty + 7), count, font=cfnt, fill=WHITE)
            ty += 58
        if cap:
            text_block(d, (FR + 30, ty), cap, cf, cap_w, INK)
        if sfx:
            sf = IMPACT(64)
            sw = d.textlength(sfx, font=sf)
            sx, sy = W - FR - 30 - sw, y0 + band / 2 - 38
            for dx, dy in ((4, 4), (3, 3), (2, 2)):
                d.text((sx + dx, sy + dy), sfx, font=sf, fill=INK)
            d.text((sx, sy), sfx, font=sf, fill=RED)
    # the art, filling the rest
    ay = y0 + band + (5 if band else 0)
    art = Image.open(os.path.join(HS, p['img'])).convert('RGB')
    ah = H - FR - ay
    im.paste(cover_fit(art, inner, ah), (FR, ay))
    # the lines, in a white box over the bottom of the art
    lines = [(clean(l.get('who')) + (f" ({clean(l['role'])})" if l.get('role') else ''), clean(l.get('t'))) for l in p.get('lines') or []]
    if lines:
        bw = inner - 64
        nf, tf = MONO(26), BOLD(38)
        hh = sum(34 + block_h(d, t, tf, bw - 48) + 14 for _, t in lines) + 30
        bx0, by1 = FR + 32, H - FR - 32
        by0 = by1 - hh
        sh = Image.new('L', (W, H), 0)
        ImageDraw.Draw(sh).rounded_rectangle((bx0 + 8, by0 + 10, bx0 + bw + 8, by1 + 10), 18, fill=150)
        im.paste(INK, (0, 0), sh.filter(ImageFilter.GaussianBlur(6)))
        d.rounded_rectangle((bx0, by0, bx0 + bw, by1), 18, fill=WHITE, outline=INK, width=4)
        y = by0 + 22
        for who, t in lines:
            d.text((bx0 + 24, y), who.upper(), font=nf, fill=RED)
            y = text_block(d, (bx0 + 24, y + 34), t, tf, bw - 48, INK) + 14
    # folio
    d.text((W - FR - 120, FR + band + 18 if band else FR + 18), f'{k + 1}/4', font=MONO(24), fill=WHITE if not band else INK)
    return im

def cover_slide(s):
    im, d = frame()
    art = Image.open(os.path.join(HS, s['panels'][0]['img'])).convert('RGB')
    bg = cover_fit(art, W - 2 * FR, H - 2 * FR, .4).filter(ImageFilter.GaussianBlur(2))
    bg = Image.blend(bg, Image.new('RGB', bg.size, BLUE), .55)
    im.paste(bg, (FR, FR))
    d = ImageDraw.Draw(im)
    x = FR + 56
    d.rectangle((x - 14, 120, x + 610, 250), fill=YEL)
    d.text((x, 128), 'THE HOT SHOP', font=IMPACT(108), fill=INK)
    lab = clean(s.get('label') or '#' + str(s['n']))
    lf = MONO(34)
    d.rectangle((x - 14, 290, x + d.textlength(lab.upper(), font=lf) + 20, 346), fill=RED)
    d.text((x + 3, 299), lab.upper(), font=lf, fill=WHITE)
    y = text_block(d, (x, 390), clean(s['title']), BLACK(84), W - 2 * x, WHITE, 1.08)
    y = text_block(d, (x, y + 30), clean(s.get('blurb')), BOLD(38), W - 2 * x - 40, WHITE, 1.3)
    d.rectangle((x - 14, H - 210, x + 330, H - 150), fill=INK)
    d.text((x, H - 200), 'SWIPE  →', font=MONO(38), fill=YEL)
    d.text((x, H - 120), 'Adults 21+. A cartoon, not advice.', font=BOLD(30), fill=WHITE)
    return im

def end_slide(s):
    im, d = frame()
    d.rectangle((FR, FR, W - FR - 1, H - FR - 1), fill=YEL)
    mark = Image.open(os.path.join(ROOT, 'assets', 'img', 'jb-mark.webp')).convert('RGBA')
    mark.thumbnail((620, 480))
    im.paste(mark, ((W - mark.width) // 2, 170), mark)
    d = ImageDraw.Draw(im)
    y = 170 + mark.height + 60
    for t, f, c in (('MORE FROM THE HOT SHOP', BLACK(56), INK), ('jeromebaker.cannacrypted.com/comics', BOLD(40), BLUE),
                    ('@jerome_baker', MONO(40), RED)):
        tw = d.textlength(t, font=f)
        d.text(((W - tw) / 2, y), t, font=f, fill=c)
        y += int(f.size * 1.6)
    t = 'Adults 21+. None of these people are real and none of this is advice.'
    for ln in wrap(d, t, BOLD(28), W - 220):
        tw = d.textlength(ln, font=BOLD(28)); d.text(((W - tw) / 2, H - 190 + (0 if ln.startswith('Adults') else 38)), ln, font=BOLD(28), fill=INK)
    return im

SHARE_PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">
<link rel="canonical" href="{dest_abs}">
<meta http-equiv="refresh" content="0; url={dest}">
<script>location.replace({dest_js})</script>
</head><body><p><a href="{dest}">{title}</a></p></body></html>
"""

def main():
    js = subprocess.run(['node', '-e', "global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.HOTSHOP))",
                         os.path.join(HS, 'issues.js')], capture_output=True, text=True, check=True).stdout
    issues = json.loads(js)
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for s in issues:
        slides = [cover_slide(s)] + [panel_slide(s, k, p) for k, p in enumerate(s['panels'][:4])] + [end_slide(s)]
        names = []
        for i, im in enumerate(slides, 1):
            fn = f"{s['slug']}-{i}.jpg"
            im.save(os.path.join(OUT, fn), quality=80, optimize=True, progressive=True)
            names.append(fn)
        manifest[str(s['n'])] = names
        # share page with this issue's own link preview
        n = str(s['n'])
        title = f"The Hot Shop {clean(s.get('label') or '#' + n)}: {clean(s['title'])}"
        page_dir = os.path.join(ROOT, 'comics', 'i', n)
        os.makedirs(page_dir, exist_ok=True)
        dest = f'../../#issue-{n}'
        open(os.path.join(page_dir, 'index.html'), 'w', encoding='utf-8').write(SHARE_PAGE.format(
            title=html.escape(title), desc=html.escape(clean(s.get('blurb')) + ' Adults 21+.'),
            img=f"{SITE}comics/hotshop/{s['slug']}-strip.jpg", url=f'{SITE}comics/i/{n}/',
            dest=dest, dest_abs=f'{SITE}comics/#issue-{n}', dest_js=json.dumps(dest)))
        print(s['slug'], len(names), 'slides')
    open(os.path.join(OUT, 'slides.js'), 'w', encoding='utf-8').write(
        '/* written by tools/build_comic_slides.py */\nwindow.HOTSHOP_SLIDES = ' + json.dumps(manifest) + ';\n')

if __name__ == '__main__':
    main()
