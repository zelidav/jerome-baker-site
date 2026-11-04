"""The glass photo treatment David picked on 2026-11-04 ("C2 Rim", from jbsite-work/glass/enhance/sparkle_clear.py).

Sparkle that keeps clear glass clear:
  - local contrast on brightness only (CLAHE), and a vibrance lift that favors the dull areas; no black-point drop
  - see-through glass (low saturation, fairly light) is never made darker than it is in the photo, so a clear tube
    keeps reading as glass on a light backdrop instead of glass shot on black
  - highlights already in the photo bloom a little, inside the glass only (no halo on the background)
  - a thin rim on the silhouette, darkened from the glass's own color, the way a real tube shows its edge
The cutouts in jbsite-work/glass/cut stay untouched: turn GLASS_FX off in build_glass.py and rebuild to undo."""
import numpy as np
import cv2
from PIL import Image, ImageFilter

VERSION = 'c2-2026-11-04'
_W = np.array([.299, .587, .114], np.float32)


def _split(im):
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    return a[..., :3], a[..., 3:]


def _join(rgb, a):
    rgb = np.clip(rgb, 0, 1)
    return Image.fromarray((np.concatenate([rgb, a], -1) * 255).round().astype(np.uint8), 'RGBA')


def _luma(rgb):
    return (rgb * _W).sum(-1, keepdims=True)


def _sat(rgb):
    return rgb.max(-1, keepdims=True) - rgb.min(-1, keepdims=True)


def _clahe(rgb, clip):
    lab = cv2.cvtColor((np.clip(rgb, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
    lab[..., 0] = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8)).apply(lab[..., 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) / 255


def _vibrance(rgb, amt):
    lum = _luma(rgb)
    return lum + (rgb - lum) * (1 + amt * (1 - _sat(rgb)))


def _protect(x, base):
    w = np.clip((base.max(-1, keepdims=True) - .85) / .15, 0, 1)
    return x * (1 - w) + (base * .5 + x * .5) * w


def apply(im):
    """RGBA cutout in, treated RGBA out (same size, same alpha)."""
    rgb, a = _split(im)
    x = _vibrance(_clahe(rgb, 1.3), .5)
    s, l = _sat(rgb), _luma(rgb)
    clear = np.clip((.28 - s) / .2, 0, 1) * np.clip((l - .35) / .3, 0, 1)
    x = x + np.maximum(l - _luma(x), 0) * clear
    x = _protect(x, rgb)
    # light sharpening (PIL unsharp on the color only)
    sharp = _join(x, a).convert('RGB').filter(ImageFilter.UnsharpMask(1.3, 60, 3))
    x = np.asarray(sharp).astype(np.float32) / 255
    # sparkle from the highlights that are already there, kept inside the glass
    lum = _luma(x)[..., 0]
    bright = (np.clip((lum - .8) / .2, 0, 1) ** 1.6) * a[..., 0]
    rad = max(3, int(min(lum.shape) * .006))
    g1 = cv2.GaussianBlur(bright, (0, 0), rad)[..., None]
    g2 = cv2.GaussianBlur(bright, (0, 0), rad * 4)[..., None]
    x = x + (1 - x) * (g1 * .6 + g2 * .2) * a
    x = x + np.clip((lum[..., None] - .9) / .1, 0, 1) * .08
    # the rim
    al = (a[..., 0] * 255).astype(np.uint8)
    k = max(2, int(min(al.shape) * .0025))
    inner = cv2.erode(al, np.ones((k * 2 + 1, k * 2 + 1), np.uint8)).astype(np.float32) / 255
    rim = cv2.GaussianBlur(np.clip(a[..., 0] - inner, 0, 1), (0, 0), k * .6)[..., None] * a
    tint = cv2.GaussianBlur(np.clip(x, 0, 1), (0, 0), k * 3) * .45
    x = x * (1 - rim * .55) + tint * rim * .55
    return _join(x, a)
