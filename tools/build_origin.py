"""Build the whole-source images the crew pages zoom into (assets/origin/), with the NSFW parts taped over.

The crew pages open with "Where <name> comes from": the WHOLE box, booth wall or collage, then a zoom into the
spot the character came from (tools/crew_data.py ORIGIN). This script makes those whole images web-sized and
covers everything that is not safe for work with a pixelated patch and a CENSORED tape strip, in the same style
as the tape already printed on the box. Every cover is listed in COVERS below, so it is easy to audit.

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

# name: (source file, output width, webp quality)
IMAGES = {
    "box": (os.path.join(ROOT, "assets", "img", "box.webp"), 1500, 82),   # the box, front (already partly taped)
    "box-back": (os.path.join(SRC, "boxback.png"), 2400, 70),            # the back of the box
    "box-cut": (os.path.join(SRC, "shot1.png"), 1796, 80),               # a closer cut of the box collage
    "booth": (os.path.join(SRC, "booth.png"), 2400, 70),                 # booth side panel, 114x81 in
    "wall": (os.path.join(SRC, "wall.png"), 3600, 68),                   # the wide booth panel
    "c2018": (os.path.join(SRC, "shot2.png"), 2390, 84),                 # 2018 JB Cannabis Collection collage
}

# Covers, in OUTPUT pixels: (x0, y0, x1, y1, tape label, what is under it). Reviewed by eye, region by region.
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


def build(name):
    path, width, q = IMAGES[name]
    if not os.path.exists(path):
        sys.exit(f"{name}: source missing at {path}")
    im = Image.open(path).convert("RGB")
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    for k, (x0, y0, x1, y1, label, _why) in enumerate(COVERS[name]):
        cover(im, k, x0, y0, x1, y1, label)
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
        print(f"assets/origin/{name}.webp {size[0]}x{size[1]}, {len(COVERS[name])} covers")
    mr_x_steps()
    print("assets/origin/mrx-sketch.webp, mrx-poster.webp")


if __name__ == "__main__":
    main()
