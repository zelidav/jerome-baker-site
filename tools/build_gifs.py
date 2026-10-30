"""Build a downloadable GIF loop for every JB Crew member: assets/gifs/<slug>.gif, 480x480.

The eight humanoids are animated from their pose frames (made with ~/code/jbsite-work/anim/gen_frames.py):
walk in, light up, hit, exhale a cloud, coughing fit, dizzy, explode in smoke. The other twelve are sticker
loops: zoom-punch in, wobble with smoke rings, RGB glitch, flames with screen shake, spin out.
Frames live outside the repo, so run this locally after new poses or characters:  python tools/build_gifs.py [slug ...]"""
import math, os, random, sys
import importlib.util
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.expanduser('~/code/jbsite-work')
FRAMES = os.path.join(WORK, 'anim', 'cut')
HIRES = os.path.join(WORK, 'hires')
OUT = os.path.join(ROOT, 'assets', 'gifs')
S = 480
MS = 80

spec = importlib.util.spec_from_file_location('crew_data', os.path.join(ROOT, 'tools', 'crew_data.py'))
cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)
HUMANOID = {'lion', 'chimp', 'bot', 'alien', 'devil', 'gorilla', 'pumpkin', 'cy'}
# the poses came out of the generator at different sizes; these keep a character the same size frame to frame
SCALE = {'stand': 1, 'walk1': .93, 'walk2': .93, 'walk3': .95, 'lean': .92, 'hit': .9, 'exhale': 1.0, 'cough': .8,
         'pose': 1.02, 'dizzy': .86, 'hop': .9, 'carry': 1.08, 'reach': .8, 'stroke1': .98, 'stroke2': .98, 'punch': .8}


def font(size):
    for f in ('impact.ttf', 'C:/Windows/Fonts/impact.ttf', '/usr/share/fonts/truetype/msttcorefonts/Impact.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def background(c):
    """Brand ground: the character's color, a halftone, the JB mark faint in the middle, name on a tilted tag."""
    col = hexrgb(c['color'])
    if sum(col) < 60:
        col = (42, 59, 142)
    bg = Image.new('RGB', (S, S), col)
    d = ImageDraw.Draw(bg)
    dark = tuple(max(0, v - 38) for v in col)
    for y in range(0, S, 14):
        for x in range((y // 14) % 2 * 7, S, 14):
            r = 2.6 * (0.4 + y / S)
            d.ellipse((x - r, y - r, x + r, y + r), fill=dark)
    mark = Image.open(os.path.join(ROOT, 'assets', 'img', 'jb-mark.webp')).convert('RGBA')
    mark.thumbnail((300, 300))
    a = mark.getchannel('A').point(lambda v: v * 0.13)
    white = Image.new('RGBA', mark.size, (255, 255, 255, 255)); white.putalpha(a)
    bg.paste(white, ((S - mark.width) // 2, (S - mark.height) // 2 - 20), white)
    tag = Image.new('RGBA', (S, 80), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    f = font(40)
    w = td.textlength(c['name'].upper(), font=f)
    td.rectangle((10, 8, 34 + w, 66), fill=(10, 10, 10))
    td.rectangle((4, 2, 28 + w, 60), fill=(255, 241, 0))
    td.text((16, 6), c['name'].upper(), font=f, fill=(10, 10, 10))
    tag = tag.rotate(4, resample=Image.BICUBIC, expand=False)
    bg.paste(tag, (6, 8), tag)
    d.text((S - 172, S - 30), 'JEROME BAKER', font=font(22), fill=(255, 255, 255))
    return bg


PUFF = None


def puff_sprite():
    global PUFF
    if PUFF is None:
        im = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        rnd = random.Random(7)
        for _ in range(7):
            x, y, r = rnd.uniform(50, 110), rnd.uniform(50, 110), rnd.uniform(22, 40)
            d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 150))
        PUFF = im.filter(ImageFilter.GaussianBlur(9))
    return PUFF


def smoke(canvas, puffs):
    """puffs: (x, y, size, alpha 0..1)"""
    for x, y, s, a in puffs:
        if s < 4 or a <= 0:
            continue
        p = puff_sprite().resize((int(s), int(s)))
        if a < 1:
            p.putalpha(p.getchannel('A').point(lambda v: int(v * a)))
        canvas.alpha_composite(p, (int(x - s / 2), int(y - s / 2)))


def comic(canvas, text, x, y, size, rot):
    t = Image.new('RGBA', (size * len(text), int(size * 1.5)), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.text((8, 4), text, font=font(size), fill=(255, 241, 0), stroke_width=max(3, size // 12), stroke_fill=(10, 10, 10))
    t = t.crop(t.getbbox()).rotate(rot, expand=True, resample=Image.BICUBIC)
    canvas.alpha_composite(t, (int(x - t.width / 2), int(y - t.height / 2)))


def star(d, cx, cy, r, fill):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill, outline=(10, 10, 10))


def pose(img, name, h):
    p = os.path.join(FRAMES, f'{img}_{name}.png')
    im = Image.open(p).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    hh = int(h * SCALE.get(name, 1))
    return im.resize((max(1, int(im.width * hh / im.height)), hh), Image.LANCZOS)


def humanoid(c):
    img, base = c['img'], background(c)
    H, FLOOR = 340, 452
    cache = {}
    get = lambda n: cache.setdefault(n, pose(img, n, H))
    rnd = random.Random(c['slug'])
    frames = []

    def shot(name, x, dx=0, dy=0, puffs=(), text=None, stars=None, alpha=1.0, extra=None):
        cv = base.convert('RGBA')
        im = get(name)
        if alpha < 1:
            im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
        cv.alpha_composite(im, (int(x - im.width / 2 + dx), int(FLOOR - im.height + dy)))
        if stars:
            d = ImageDraw.Draw(cv)
            cx, cy, t = stars
            for k in range(4):
                a = t + k * math.pi / 2
                star(d, cx + 70 * math.cos(a), cy + 22 * math.sin(a), 13, (255, 241, 0))
        smoke(cv, puffs)
        if text:
            comic(cv, *text)
        if extra:
            extra(cv)
        frames.append(cv.convert('RGB'))

    # where the mouth is in each pose (fraction of the frame, measured off Torch; the others share the poses)
    MOUTH = {'exhale': (.32, .8), 'cough': (.28, .66)}
    mouth = lambda name, x: (x + get(name).width * MOUTH[name][0], FLOOR - get(name).height * MOUTH[name][1])
    # walk in
    cyc = ['walk1', 'walk3', 'walk2', 'walk3']
    for i in range(10):
        shot(cyc[i % 4], -110 + i * 34)
    X = 230
    shot('lean', X)
    # light it and pull: smoke curls off the lighter, then out of the mouth
    for i in range(8):
        mx, my = X + 40, FLOOR - get('hit').height * .42
        shot('hit', X, puffs=[(mx + rnd.uniform(-6, 6), my - 30 - j * 26, 26 + j * 12, .7 - j * .12) for j in range(min(5, i + 1))])
    # exhale a cloud that keeps growing
    for i in range(7):
        mx, my = mouth('exhale', X)
        cloud = [(mx + 40 + j * 28 + i * 10, my - 20 - j * 18 - i * 6, 60 + i * 34 + j * 10, .95) for j in range(4)]
        shot('exhale', X, puffs=cloud)
    # coughing fit
    words = ['COUGH!', 'HACK!', 'KOFF!', 'HRRK!']
    for i in range(10):
        mx, my = mouth('cough', X)
        jit = rnd.uniform(-7, 7), rnd.uniform(-5, 5)
        shot('cough', X, *jit, puffs=[(mx + 30 + i * 6, my - i * 4, 70 + i * 8, .8 - i * .05)],
             text=(words[(i // 3) % 4], 360 + rnd.uniform(-20, 20), 130 + rnd.uniform(-20, 20), 54, rnd.uniform(-14, 14)) if i % 3 != 2 else None)
    # dizzy
    for i in range(7):
        im = get('dizzy')
        shot('dizzy', X, stars=(X + 10, FLOOR - im.height + 18, i * .6))
    # explode into smoke, then the stage clears for the loop
    for i in range(8):
        k = (i + 1) / 8
        burst = [(X + math.cos(a) * 170 * k, 300 + math.sin(a) * 140 * k, 120 + 260 * k, 1.0) for a in [j * math.pi / 4 for j in range(8)]]
        burst.append((X, 300, 200 + 380 * k, 1.0))
        shot('dizzy', X, alpha=max(0, 1 - k * 1.6), puffs=burst, text=('POOF!', S / 2, S / 2, 92, -8) if 2 <= i <= 5 else None)
    for i in range(4):
        cv = base.convert('RGBA')
        smoke(cv, [(S / 2, 300, 600, 1 - (i + 1) / 4)])
        frames.append(cv.convert('RGB'))
    return frames


def sticker(c):
    base = background(c)
    src = os.path.join(HIRES, f"{c['slug']}_cutout.png")
    im = Image.open(src if os.path.exists(src) else os.path.join(ROOT, 'assets', 'crew', c['img'] + '_m.webp')).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    im.thumbnail((300, 300), Image.LANCZOS)
    rnd = random.Random(c['slug'])
    frames = []
    cx, cy = S / 2, S / 2 + 30

    def put(cv, scale=1.0, rot=0.0, dx=0, dy=0, a=1.0, img=None):
        s = (img or im)
        if scale != 1 or rot:
            s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.BICUBIC).rotate(rot, expand=True, resample=Image.BICUBIC)
        if a < 1:
            s = s.copy(); s.putalpha(s.getchannel('A').point(lambda v: int(v * a)))
        cv.alpha_composite(s, (int(cx - s.width / 2 + dx), int(cy - s.height / 2 + dy)))

    # zoom-punch in
    for k in (0.15, 0.55, 1.3, 1.15, 0.95, 1.0):
        cv = base.convert('RGBA'); put(cv, k, rnd.uniform(-8, 8))
        if k >= 1.15:
            comic(cv, rnd.choice(['BAM!', 'WHAM!', 'POW!']), 360, 110, 66, -10)
        frames.append(cv.convert('RGB'))
    # wobble, blowing smoke rings
    for i in range(10):
        cv = base.convert('RGBA'); put(cv, 1.0, 12 * math.sin(i * .9))
        d = ImageDraw.Draw(cv)
        for j in range(3):
            t = (i + j * 3) % 10 / 10
            rw, rh = 30 + 90 * t, 12 + 30 * t
            ox, oy = cx + 60 + 40 * t, cy - 160 - 120 * t
            d.ellipse((ox - rw, oy - rh, ox + rw, oy + rh), outline=(255, 255, 255, int(255 * (1 - t))), width=6)
        frames.append(cv.convert('RGB'))
    # RGB glitch with slice shifts
    for i in range(6):
        cv = base.convert('RGBA'); put(cv)
        rgb = cv.convert('RGB'); r, g, b = rgb.split()
        o = 6 + i * 2
        r = ImageChops.offset(r, o, 0); b = ImageChops.offset(b, -o, rnd.randint(-3, 3))
        g2 = Image.merge('RGB', (r, g, b))
        for _ in range(4):
            y0 = rnd.randint(0, S - 40); h = rnd.randint(8, 40); sh = rnd.randint(-40, 40)
            strip = g2.crop((0, y0, S, y0 + h)); g2.paste(ImageChops.offset(strip, sh, 0), (0, y0))
        frames.append(g2)
    # flames and screen shake
    for i in range(10):
        cv = base.convert('RGBA')
        d = ImageDraw.Draw(cv)
        for j in range(9):
            fx = 60 + j * 46 + rnd.uniform(-8, 8); fh = rnd.uniform(70, 150)
            d.polygon([(fx - 26, S), (fx, S - fh), (fx + 26, S)], fill=(218, 35, 66))
            d.polygon([(fx - 15, S), (fx + rnd.uniform(-4, 4), S - fh * .62), (fx + 15, S)], fill=(253, 181, 20))
            d.polygon([(fx - 7, S), (fx, S - fh * .3), (fx + 7, S)], fill=(255, 241, 0))
        put(cv, 1.0, rnd.uniform(-4, 4), rnd.uniform(-12, 12), rnd.uniform(-12, 12))
        if i in (3, 4, 5):
            comic(cv, 'HOT!', 380, 120, 70, 8)
        frames.append(cv.convert('RGB'))
    # spin out
    for i in range(8):
        k = (i + 1) / 8
        cv = base.convert('RGBA'); put(cv, max(.05, 1 - k), 90 * i, a=1 - k * .6)
        smoke(cv, [(cx, cy, 80 + 300 * k, k)])
        frames.append(cv.convert('RGB'))
    for i in range(3):
        cv = base.convert('RGBA'); smoke(cv, [(cx, cy, 380, 1 - (i + 1) / 3)]); frames.append(cv.convert('RGB'))
    return frames


def save(frames, path):
    pal = [f.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=MS, loop=0, optimize=True, disposal=1)


def main(only):
    os.makedirs(OUT, exist_ok=True)
    for c in cd.CREW:
        if only and c['slug'] not in only:
            continue
        hum = c['img'] in HUMANOID and os.path.exists(os.path.join(FRAMES, f"{c['img']}_stand.png"))
        frames = humanoid(c) if hum else sticker(c)
        path = os.path.join(OUT, c['slug'] + '.gif')
        save(frames, path)
        print(f"{c['slug']:16} {'animated' if hum else 'sticker':8} {len(frames)} frames  {os.path.getsize(path) // 1024} KB")


if __name__ == '__main__':
    main(set(sys.argv[1:]))
