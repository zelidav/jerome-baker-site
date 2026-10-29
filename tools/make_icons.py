"""Build favicons, home-screen icons and the link-preview image from the JB mark.

Run: python tools/make_icons.py   (writes into assets/icons/)
"""
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
BLUE = (42, 59, 142, 255)  # --blue, #2A3B8E
INK = (10, 10, 10, 255)

mark = Image.open(ROOT / "assets/img/jb-mark.webp").convert("RGBA")


def fit(img, box):
    """Scale to fit inside box, aspect ratio kept (never distort the logo)."""
    s = min(box[0] / img.width, box[1] / img.height)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def tile(size, pad, bg):
    """Mark centered on a solid square: iOS paints transparent icons black."""
    canvas = Image.new("RGBA", (size, size), bg)
    m = fit(mark, (size * (1 - 2 * pad), size * (1 - 2 * pad)))
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


def bare(size, pad=0.04):
    """Transparent square for browser-tab favicons."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    m = fit(mark, (size * (1 - 2 * pad), size * (1 - 2 * pad)))
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


bare(32).save(OUT / "favicon-32.png")
bare(16).save(OUT / "favicon-16.png")
bare(256).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
tile(180, 0.12, BLUE).convert("RGB").save(OUT / "apple-touch-icon.png")
tile(192, 0.12, BLUE).save(OUT / "icon-192.png")
tile(512, 0.12, BLUE).save(OUT / "icon-512.png")
tile(512, 0.22, BLUE).save(OUT / "icon-maskable-512.png")  # safe zone for Android masks
tile(512, 0.22, INK).save(OUT / "icon-trip-512.png")
tile(192, 0.22, INK).save(OUT / "icon-trip-192.png")
tile(180, 0.12, INK).convert("RGB").save(OUT / "apple-touch-icon-trip.png")

# Link preview 1200x630: box collage, centered blue panel with the mark.
W, H = 1200, 630
box = Image.open(ROOT / "assets/img/box.webp").convert("RGBA")
s = max(W / box.width, H / box.height)
box = box.resize((round(box.width * s), round(box.height * s)), Image.LANCZOS)
og = box.crop(((box.width - W) // 2, (box.height - H) // 2, (box.width - W) // 2 + W, (box.height - H) // 2 + H))
m = fit(mark, (560, 430))
shadow = Image.new("RGBA", og.size, (0, 0, 0, 0))
mx, my = (W - m.width) // 2, (H - m.height) // 2
shadow.paste((0, 0, 0, 200), (mx + 14, my + 16), m)
og.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6)))
og.alpha_composite(m, (mx, my))
og.convert("RGB").save(OUT / "og.jpg", quality=86)
print("wrote", sorted(p.name for p in OUT.iterdir()))
