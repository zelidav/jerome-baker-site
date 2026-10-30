"""Hyperreal crew frames for js/real.js. Made once in ~/code/jbsite-work/real (gen_real.py: Flux Kontext from the
sticker art, BiRefNet cutouts); this trims them and writes assets/real/<img>/<pose>.webp, 520px tall."""
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(os.path.expanduser('~/code/jbsite-work/real/cut'))
OUT = ROOT / 'assets' / 'real'
H = 520


def main():
    n = 0
    for src in sorted(SRC.glob('*.png')):
        img, pose = src.stem.rsplit('_', 1)
        out = OUT / img / f'{pose}.webp'
        if out.exists() and out.stat().st_mtime > src.stat().st_mtime:
            continue
        im = Image.open(src).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, 'WEBP', quality=80, method=3)
        n += 1
    print(n, 'frames written')


if __name__ == '__main__':
    main()
