"""Share-preview cards (1200x630 JPG) for each crew member, so a link to /crew/<slug>/ previews that character
in iMessage, texts, Facebook and X instead of the generic site card. Plain brand ground (no collage words a link
scanner could read), the character's art, their name and title.

Run after a crew change (build_crew.py points og:image at these):   python tools/og_cards.py
Fonts are read from the local Windows font folder (Nexa Black, Montserrat Black); the JPGs are committed."""
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import crew_data  # noqa: E402
import scrub  # noqa: E402

OUT = ROOT / 'assets' / 'og'
FONTS = Path(os.path.expanduser('~/AppData/Local/Microsoft/Windows/Fonts'))
W, H = 1200, 630
BLUE, YELLOW, RED, WHITE = (42, 59, 142), (255, 241, 0), (236, 31, 40), (255, 255, 255)


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + ([cur] if cur else [])


def card(c):
    im = Image.new('RGB', (W, H), BLUE)
    d = ImageDraw.Draw(im)
    # a diagonal band in the character's colour behind the art
    accent = c.get('color') or '#EC1F28'
    d.polygon([(640, 0), (W, 0), (W, H), (520, H)], fill=accent)
    art = Image.open(ROOT / 'assets' / 'crew' / f"{c['img']}.webp").convert('RGBA')
    art = art.crop(art.getchannel('A').getbbox())
    k = min(590 / art.height, 560 / art.width)
    art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
    im.paste(art, (W - 40 - art.width + (560 - art.width) // 2 * 0, H - art.height - 20), art)
    mark = Image.open(ROOT / 'assets' / 'img' / 'jb-mark.webp').convert('RGBA')
    mark = mark.resize((round(mark.width * 96 / mark.height), 96), Image.LANCZOS)
    im.paste(mark, (56, 48), mark)
    name = scrub.prose(c['name'])
    fn = font('Nexa-Black.otf', 92)
    lines = wrap(d, name, fn, 560)
    if len(lines) > 2:
        fn = font('Nexa-Black.otf', 70); lines = wrap(d, name, fn, 560)
    y = 190
    for ln in lines:
        d.text((56, y), ln, font=fn, fill=WHITE)
        y += fn.size + 6
    title = scrub.prose(c.get('title') or '')
    ft = font('Montserrat-Black.ttf', 36)
    for ln in wrap(d, title, ft, 470)[:3]:
        y += 4
        d.text((56, y), ln, font=ft, fill=YELLOW)
        y += ft.size
    d.text((56, H - 74), 'THE JB CREW', font=font('Montserrat-Black.ttf', 30), fill=WHITE)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for c in crew_data.CREW:
        card(c).save(OUT / f"crew-{c['slug']}.jpg", 'JPEG', quality=86, optimize=True, progressive=True)
    print(f'{len(crew_data.CREW)} crew cards in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
