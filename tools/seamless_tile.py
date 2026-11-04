"""Make assets/img/box-tile.webp: box.webp with its edges cross-faded so it repeats without a seam (the hero and
the sticker wall tile it; box.webp itself stays as-is for the holo cloth). Usage: python tools/seamless_tile.py"""
import numpy as np
from PIL import Image

B = 140  # px of overlap blended on each axis


def wrap(a, axis):
    n = a.shape[axis] - B
    body = np.take(a, range(B, n), axis=axis)
    head = np.take(a, range(0, B), axis=axis)          # the start of the image...
    tail = np.take(a, range(n, n + B), axis=axis)      # ...faded in from the end, so the end runs straight into it
    w = np.linspace(0, 1, B).reshape([-1 if i == axis else 1 for i in range(a.ndim)])
    w = w * w * (3 - 2 * w)
    return np.concatenate([tail * (1 - w) + head * w, body], axis=axis)


img = np.asarray(Image.open('assets/img/box.webp').convert('RGB')).astype(np.float32)
out = wrap(wrap(img, 0), 1)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save('assets/img/box-tile.webp', quality=82, method=6)
print(out.shape)
