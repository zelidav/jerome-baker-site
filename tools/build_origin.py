"""Build the whole-source images the crew pages zoom into (assets/origin/), with the NSFW parts taped over.

The crew pages open with "Where <name> comes from": the WHOLE box, booth wall or collage, then a zoom into the
spot the character came from (tools/crew_data.py ORIGIN). This script makes those whole images web-sized and
covers everything that is not safe for work with a pixelated patch and a CENSORED tape strip, in the same style
as the tape already printed on the box, and blurs third-party characters and brand marks (McDonald's, Disney, MAD,
the Simpsons, the Grateful Dead...). Every cover is listed in COVERS and every blur in BLURS, so it is easy to audit.

Inputs live outside the repo (they are huge): the 4000px renders in ~/code/jbsite-work/sources/ (made from
~/Downloads/BAKER_BACK.pdf, Jerome-Baker-Trade-Show-Booth-Side-Panel-2-114x81.pdf and panel.pdf) plus
assets/img/box.webp. Run once after changing a cover:
    python tools/build_origin.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser("~/code/jbsite-work/sources")
OUT = os.path.join(ROOT, "assets", "origin")
FONT = "C:/Windows/Fonts/impact.ttf" if os.path.exists("C:/Windows/Fonts/impact.ttf") else None

# name: (source file, width the COVERS/BLURS coordinates are written in, output width, webp quality)
# Output widths keep each file around 300-400KB; the page never zooms past ~1.6x the file's own pixels.
IMAGES = {
    "box": (os.path.join(ROOT, "assets", "img", "box.webp"), 1500, 1500, 72),   # the box, front (already partly taped)
    "box-back": (os.path.join(SRC, "boxback.png"), 2400, 1600, 60),            # the back of the box
    "box-cut": (os.path.join(SRC, "shot1.png"), 1796, 1500, 66),               # a closer cut of the box collage
    "booth": (os.path.join(SRC, "booth.png"), 2400, 1700, 56),                 # booth side panel, 114x81 in
    "wall": (os.path.join(SRC, "wall.png"), 3600, 2700, 56),                   # the wide booth panel
    "c2018": (os.path.join(SRC, "shot2.png"), 2390, 2390, 74),                 # 2018 JB Cannabis Collection collage
}

# Third-party characters, mascots and brand marks: blurred (no tape; the tape means NSFW). Same coordinate space
# as COVERS. (x0, y0, x1, y1, what is under it)
BLURS = {
    "box": [
        (1150, 0, 1305, 140, "Obey Giant-style propaganda face (Shepard Fairey)"),
    ],
    "box-back": [
        (0, 1450, 445, 1840, "McDonald's characters: Hamburglar, Grimace, Ronald, Mayor McCheese, Birdie"),
        (590, 1560, 860, 1840, "Mickey Mouse (Disney), Sorcerer's Apprentice"),
        (1395, 1235, 1636, 1425, "Alfred E. Neuman (MAD Magazine)"),
        (470, 1440, 615, 1665, "Uncle Duke (Doonesbury)"),
        (500, 1250, 775, 1445, "Freak Brothers-style comic characters (Gilbert Shelton)"),
        (1700, 60, 1925, 350, "Rupert Bear (Rupert Finds Gipsy Granny comic)"),
        (2002, 1330, 2115, 1462, "R. Crumb comic character carrying records (head, kept clear of Lunar Larry)"),
        (1900, 1462, 2115, 1840, "R. Crumb comic character carrying records (body)"),
        (1900, 815, 1995, 965, "Nike swoosh parody (Just Dab It)"),
    ],
    "box-cut": [
        (1440, 1365, 1796, 1722, "The Simpsons-style gnome"),
        (640, 370, 905, 710, "Grateful Dead skull and roses"),
    ],
    "booth": [],
    "wall": [
        (1350, 140, 1600, 375, "Grateful Dead skeleton and roses art on the Trails poster"),
        (2005, 125, 2265, 425, "Grateful Dead Steal Your Face skull on the Stonerdays poster"),
    ],
    "c2018": [
        (5, 330, 272, 525, "Disney-style comic characters (Air Pirates-style mice, pigs, bears, cats)"),
        (840, 238, 1005, 470, "King Kong (title lettering and the gorilla)"),
        (1650, 360, 1800, 600, "Donald Duck and other cartoon characters"),
        (1705, 28, 1802, 162, "Campbell's soup can parody"),
        (2108, 228, 2302, 572, "Felix the Cat and other cartoon cats"),
        (1080, 0, 1142, 52, "Rupert Bear comic panel"),
        (1092, 266, 1202, 332, "Freak Brothers-style comic characters"),
        (0, 12, 36, 72, "Nike swoosh parody (Just Dab It)"),
        (1262, 238, 1302, 292, "Nike swoosh parody (Just Dab It)"),
    ],
}

# NSFW covers, in the coordinate width above: (x0, y0, x1, y1, tape label, what is under it). Reviewed by eye, region by region.
COVERS = {
    "box": [
        (50, 135, 195, 268, "CENSORED", "pink pin-up, top left: topless"),
        (952, 208, 1042, 296, "NSFW", "pulp couple, woman in lingerie"),
    ],
    "box-back": [
        (330, 160, 840, 600, "CENSORED", "two blue nude women, top left"),
        (680, 850, 1082, 1100, "CENSORED", "nude couple in the yin-yang circle (OH BAKER!)"),
        (835, 625, 1042, 925, "CENSORED", "nude male torso, black and white"),
        (1120, 545, 1345, 812, "CENSORED", "topless woman (A Parents Guide to Drug Abuse)"),
        (1670, 810, 1925, 945, "NSFW", "topless woman with rifle"),
        (2180, 390, 2400, 780, "CENSORED", "nude woman with harp, right edge"),
        (2045, 740, 2400, 885, "CENSORED", "blue reclining nude"),
        (55, 1135, 525, 1485, "CENSORED", "explicit comic sex scene"),
        (300, 1560, 470, 1760, "NSFW", "topless burger-head pin-up"),
        (410, 1600, 615, 1840, "CENSORED", "topless woman, pink"),
        (1105, 1118, 1425, 1345, "CENSORED", "topless racial caricature (Fingerlickin Good)"),
        (930, 1690, 1010, 1790, "NSFW", "small nude statue"),
        (2005, 1100, 2330, 1565, "CENSORED", "topless hippie women (hippie youth)"),
        (1700, 1700, 1905, 1840, "NSFW", "pin-up cleavage, bottom"),
    ],
    "box-cut": [
        (0, 200, 245, 400, "NSFW", "space pin-up in eyeball bra, left edge"),
    ],
    "booth": [
        (840, 1300, 945, 1392, "NSFW", "nude ship figurehead (line drawing)"),
    ],
    "wall": [],
    "c2018": [
        (35, 0, 155, 62, "NSFW", "blue reclining nude, top left"),
        (355, 45, 505, 205, "CENSORED", "topless racial caricature"),
        (300, 195, 362, 272, "NSFW", "small topless woman in an arch"),
        (598, 0, 805, 172, "CENSORED", "two blue nude women"),
        (645, 340, 802, 590, "CENSORED", "redhead's body (Dr. Squint's head stays visible above)"),
        (888, 138, 964, 210, "NSFW", "topless woman, small"),
        (1048, 212, 1127, 278, "NSFW", "topless woman with rifle, small"),
        (1168, 215, 1295, 268, "NSFW", "blue reclining nude"),
        (1195, 40, 1272, 262, "NSFW", "nude woman with harp"),
        (1396, 140, 1554, 306, "CENSORED", "topless racial caricature"),
        (1888, 88, 1995, 255, "CENSORED", "nude woman, arms up (See!)"),
        (1868, 398, 2026, 600, "CENSORED", "topless woman at the table"),
    ],
}

TAPES = [("#FFF100", "#0A0A0A"), ("#DA2342", "#FFFFFF"), ("#2A3B8E", "#FFF100")]


def font(size):
    return ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default()


def cover(im, k, x0, y0, x1, y1, label):
    """Pixelate the region hard, then lay a tilted tape strip across it."""
    w, h = x1 - x0, y1 - y0
    block = max(6, min(w, h) // 5)
    patch = im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(block / 3))
    patch = patch.resize((max(1, w // block), max(1, h // block)), Image.BILINEAR).resize((w, h), Image.NEAREST)
    im.paste(patch, (x0, y0))
    bg, fg = TAPES[k % len(TAPES)]
    th = max(18, int(min(w, h) * 0.42))
    f = font(int(th * 0.7))
    text = (" " + label + " ") * 6
    tw = int((w * w + h * h) ** 0.5) + th
    strip = Image.new("RGBA", (tw, th), bg)
    d = ImageDraw.Draw(strip)
    d.rectangle((0, 0, tw - 1, th - 1), outline="#0A0A0A", width=max(2, th // 12))
    tb = d.textbbox((0, 0), text, font=f)
    d.text(((tw - (tb[2] - tb[0])) / 2, (th - (tb[3] - tb[1])) / 2 - tb[1]), text, font=f, fill=fg)
    ang = (-1) ** k * (8 + (k * 7) % 14)
    strip = strip.rotate(ang, expand=True, resample=Image.BICUBIC)
    # keep the tape inside the patch so it reads as a sticker on that spot, not across the whole collage
    mask = Image.new("L", strip.size, 0)
    cx, cy = strip.width // 2, strip.height // 2
    ImageDraw.Draw(mask).rectangle((cx - w // 2 - th // 3, cy - h // 2 - th // 3, cx + w // 2 + th // 3, cy + h // 2 + th // 3), fill=255)
    alpha = Image.composite(strip.getchannel("A"), Image.new("L", strip.size, 0), mask)
    strip.putalpha(alpha)
    im.paste(strip, (x0 + w // 2 - cx, y0 + h // 2 - cy), strip)


def blur(im, x0, y0, x1, y1):
    """A heavy blur with soft edges, so the character is unreadable but the collage still reads as one piece."""
    w, h = x1 - x0, y1 - y0
    r = max(10, min(w, h) // 5)
    patch = im.crop((x0, y0, x1, y1)).resize((max(1, w // 6), max(1, h // 6)), Image.BILINEAR)
    patch = patch.filter(ImageFilter.GaussianBlur(max(2, r / 6))).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(r / 3))
    mask = Image.new("L", (w, h), 0)
    f = max(3, min(w, h) // 10)
    # soft edges inside the image, hard where the box touches the image's own edge
    l, t = (0 if x0 <= 0 else f // 3), (0 if y0 <= 0 else f // 3)
    rr, b = (w if x1 >= im.width else w - f // 3), (h if y1 >= im.height else h - f // 3)
    ImageDraw.Draw(mask).rounded_rectangle((l, t, rr, b), radius=f, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(f / 4))
    if l == 0 or t == 0 or rr == w or b == h:  # re-fill the edge rows the blur softened
        d = ImageDraw.Draw(mask)
        if l == 0: d.rectangle((0, t + f, f // 3, b - f), fill=255)
        if t == 0: d.rectangle((l + f, 0, rr - f, f // 3), fill=255)
        if rr == w: d.rectangle((w - f // 3, t + f, w, b - f), fill=255)
        if b == h: d.rectangle((l + f, h - f // 3, rr - f, h), fill=255)
    im.paste(patch, (x0, y0), mask)


def build(name):
    path, cw, width, q = IMAGES[name]
    if not os.path.exists(path):
        sys.exit(f"{name}: source missing at {path}")
    im = Image.open(path).convert("RGB")
    if im.width != cw:
        im = im.resize((cw, round(im.height * cw / im.width)), Image.LANCZOS)
    for x0, y0, x1, y1, _why in BLURS[name]:
        blur(im, x0, y0, x1, y1)
    for k, (x0, y0, x1, y1, label, _why) in enumerate(COVERS[name]):
        cover(im, k, x0, y0, x1, y1, label)
    if width != cw:
        im = im.resize((width, round(im.height * width / cw)), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=q, method=6)
    return im.size


def mr_x_steps():
    """Mr. X's evolution: the sketch sheet's number 5, then the crossed-b0ngs mark on the Jerome Baker poster."""
    w = Image.open(os.path.join(SRC, "wall.png")).convert("RGB")
    for name, box, width in (("mrx-sketch", (3440, 690, 3925, 1215), 640), ("mrx-poster", (4415, 200, 4880, 755), 520)):
        c = w.crop(box)
        c = c.resize((width, round(c.height * width / c.width)), Image.LANCZOS)
        c.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=84, method=6)


def main():
    for name in IMAGES:
        size = build(name)
        kb = os.path.getsize(os.path.join(OUT, f"{name}.webp")) // 1024
        print(f"assets/origin/{name}.webp {size[0]}x{size[1]} {kb}KB, {len(COVERS[name])} NSFW covers, {len(BLURS[name])} blurs")
    mr_x_steps()
    print("assets/origin/mrx-sketch.webp, mrx-poster.webp")


if __name__ == "__main__":
    main()
