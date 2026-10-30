"""One-off: the round-4 gift basket for Find your crew (nano-banana, style from crew art), cut out to assets/quiz/basket.webp."""
import os, time, urllib.request
import replicate
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.expanduser('~/code/jbsite-work/quiz')
os.makedirs(WORK, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'assets', 'quiz'), exist_ok=True)
PROMPT = ('Images 1 and 2 are style references only (do not draw these characters). Draw ONE object: a big wicker gift basket '
          'wrapped in clear cellophane with a huge red bow on top and a paper gift tag hanging off the handle that reads exactly '
          '"TO: YOU  FROM: THE CREW  NOT FOR SALE". The basket is overflowing with cartoon party favors, every one different and easy to tell apart: '
          'three rolled joints, a small glass dab rig, a pile of brown mushrooms, a sheet of acid blotter paper with a tiny smiley print, '
          'a handful of colorful gummy bears, a scatter of plain pills, a little zip baggie of white powder, a few silver whipped-cream chargers, '
          'a forty-ounce bottle in a brown paper bag, a bottle of purple cough syrup, and one mystery zip baggie with a question mark on it. '
          'No brand names, no logos, no prices, no labels except the gift tag. Same hand-inked vintage psychedelic sticker style as the references: '
          'bold black ink outlines, halftone shading, saturated colors. Centered, pure flat white background, no border, no shadow.')


def save(url, path):
    with urllib.request.urlopen(str(url)) as r, open(path, 'wb') as f:
        f.write(r.read())


def retry(fn):
    for i in range(8):
        try:
            return fn()
        except Exception as e:
            print('retry', i, repr(e)[:120], flush=True)
            time.sleep(10 * (i + 1))
    raise RuntimeError('gave up')


raw, cut = os.path.join(WORK, 'basket.png'), os.path.join(WORK, 'basket_cut.png')
if not os.path.exists(raw):
    refs = retry(lambda: [replicate.files.create(file=open(os.path.join(ROOT, 'assets', 'crew', f), 'rb')).urls['get'] for f in ('lion_m.webp', 'bear_m.webp')])
    out = retry(lambda: replicate.run('google/nano-banana', input={'prompt': PROMPT, 'image_input': refs, 'output_format': 'png', 'aspect_ratio': '1:1'}))
    open(raw, 'wb').write(out.read() if hasattr(out, 'read') else out[0].read())
if not os.path.exists(cut):
    out = retry(lambda: replicate.run('men1scus/birefnet:f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7', input={'image': open(raw, 'rb')}))
    save(out, cut)
im = Image.open(cut).convert('RGBA')
im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
im.thumbnail((900, 900))
im.save(os.path.join(ROOT, 'assets', 'quiz', 'basket.webp'), 'WEBP', quality=84)
print('basket', im.size)
