"""Pre-render the "Take <name> with you" share kit for every crew member.

For each crew member in tools/crew_data.py this writes:
  assets/gifs/<slug>.mp4                 H.264 / yuv420p / faststart, 720x900 (4:5), the GIF looped to ~7-10 s
                                         on a band of the crew colour. Instagram, TikTok and Facebook take video, not GIF.
  assets/crew/avatar/<slug>-320.png      320x320 avatar / icon: the cutout centred on the crew colour
  assets/crew/sticker/<slug>.png         the transparent sticker as PNG (iPhone opens and posts PNG, not WebP)

Needs Pillow and ffmpeg on PATH. Re-run after changing a GIF or a crew cutout:
    python tools/build_share.py            # everything
    python tools/build_share.py torch      # just one (or a few) slugs
    python tools/build_share.py --no-video # just the avatar and sticker PNGs
    python tools/build_share.py --locate   # print where each box-art sprite sits on assets/img/box.webp
                                           # (needs opencv-python; results go in crew_data.BOX_SPOTS by hand)
"""
import os, subprocess, sys, tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from crew_data import CREW  # noqa: E402

VIDEO_W, VIDEO_H = 720, 900          # 4:5, both even
TARGET_SECONDS = 7.5                  # loop the GIF until the clip is about this long (min 2 loops)
MAX_MP4 = 1_500_000
FONT = next((f for f in (r"C:\Windows\Fonts\impact.ttf", "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
                         "/Library/Fonts/Impact.ttf") if os.path.exists(f)), None)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(size):
    return ImageFont.truetype(FONT, size) if FONT else ImageFont.load_default(size)


def gif_seconds(path):
    im = Image.open(path)
    ms = 0
    for i in range(im.n_frames):
        im.seek(i)
        ms += im.info.get("duration", 100) or 100
    return ms / 1000


def frame_overlay(c, path):
    """The 720x900 frame around the GIF: crew colour, name band on top, site on the bottom. Transparent where the GIF goes."""
    col = hex_rgb(c["color"])
    im = Image.new("RGBA", (VIDEO_W, VIDEO_H), col + (255,))
    d = ImageDraw.Draw(im)
    top = (VIDEO_H - VIDEO_W) // 2
    d.rectangle([0, top, VIDEO_W, top + VIDEO_W], fill=(0, 0, 0, 0))
    ink = (10, 10, 10) if sum(col) > 420 else (255, 255, 255)
    f1, f2 = font(44), font(26)
    t1 = f"THE JB CREW · {c['name'].upper()}"
    w = d.textlength(t1, font=f1)
    d.text(((VIDEO_W - w) / 2, (top - 44) / 2 - 4), t1, font=f1, fill=ink)
    t2 = "JEROMEBAKER.CANNACRYPTED.COM"
    w = d.textlength(t2, font=f2)
    d.text(((VIDEO_W - w) / 2, top + VIDEO_W + (top - 26) / 2 - 4), t2, font=f2, fill=ink)
    im.save(path)


def build_mp4(c):
    gif = os.path.join(ROOT, "assets", "gifs", f"{c['slug']}.gif")
    out = os.path.join(ROOT, "assets", "gifs", f"{c['slug']}.mp4")
    if not os.path.exists(gif):
        print(f"  {c['slug']}: no GIF, skipping the MP4")
        return None
    dur = gif_seconds(gif)
    loops = max(2, round(TARGET_SECONDS / dur))
    top = (VIDEO_H - VIDEO_W) // 2
    with tempfile.TemporaryDirectory() as tmp:
        ov = os.path.join(tmp, "frame.png")
        frame_overlay(c, ov)
        for crf in (24, 27, 30, 33):
            cmd = ["ffmpeg", "-y", "-v", "error", "-stream_loop", str(loops - 1), "-i", gif, "-i", ov,
                   "-filter_complex",
                   f"[0:v]fps=25,scale={VIDEO_W}:{VIDEO_W}:flags=lanczos,format=rgb24[g];"
                   f"color=c={c['color']}:s={VIDEO_W}x{VIDEO_H}:r=25[bg];"
                   f"[bg][g]overlay=0:{top}:shortest=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]",
                   "-map", "[v]", "-an", "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-preset", "slow",
                   "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
            subprocess.run(cmd, check=True)
            if os.path.getsize(out) <= MAX_MP4:
                break
    size = os.path.getsize(out)
    if size > MAX_MP4:
        sys.exit(f"{out} is {size} bytes even at crf 33")
    return size, loops * dur


def build_avatar(c):
    src = Image.open(os.path.join(ROOT, "assets", "crew", f"{c['img']}.webp")).convert("RGBA")
    src = src.crop(src.getchannel("A").getbbox())
    S, pad = 960, 0.07                     # draw big, then shrink, for clean edges
    col = hex_rgb(c["color"])
    im = Image.new("RGBA", (S, S), col + (255,))
    d = ImageDraw.Draw(im)
    light = tuple(min(255, int(v + (255 - v) * 0.22)) for v in col)
    m = int(S * 0.06)
    d.ellipse([m, m, S - m, S - m], fill=light + (255,))
    box = int(S * (1 - 2 * pad))
    k = min(box / src.width, box / src.height)
    art = src.resize((max(1, int(src.width * k)), max(1, int(src.height * k))), Image.LANCZOS)
    im.alpha_composite(art, ((S - art.width) // 2, (S - art.height) // 2))
    out = os.path.join(ROOT, "assets", "crew", "avatar", f"{c['slug']}-320.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = im.resize((320, 320), Image.LANCZOS).convert("RGB")
    im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
    return os.path.getsize(out)


def build_sticker(c):
    src = Image.open(os.path.join(ROOT, "assets", "crew", f"{c['img']}.webp")).convert("RGBA")
    out = os.path.join(ROOT, "assets", "crew", "sticker", f"{c['slug']}.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    # 256-colour palette PNG with full alpha: a third of the size of truecolour, same look at sticker size
    src.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(out, optimize=True)
    return os.path.getsize(out)


def locate():
    """Find each box-art sprite (assets/spr/) on the whole box (assets/img/box.webp). Prints % boxes."""
    import cv2
    import numpy as np
    B = cv2.cvtColor(np.array(Image.open(os.path.join(ROOT, "assets", "img", "box.webp")).convert("RGB")), cv2.COLOR_RGB2GRAY)
    H, W = B.shape
    for c in CREW:
        if not c["ref"].startswith("spr/") or c["src"].get("box"):
            continue
        T = cv2.cvtColor(np.array(Image.open(os.path.join(ROOT, "assets", c["ref"])).convert("RGB")), cv2.COLOR_RGB2GRAY)
        best = None
        for s in np.arange(0.15, 0.5, 0.01):
            t = cv2.resize(T, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            r = cv2.matchTemplate(B, t, cv2.TM_CCOEFF_NORMED)
            _, mx, _, loc = cv2.minMaxLoc(r)
            if not best or mx > best[0]:
                best = (mx, loc, t.shape)
        mx, (x, y), (h, w) = best
        print(f'    "{c["slug"]}": [{100 * x / W:.1f}, {100 * y / H:.1f}, {100 * w / W:.1f}, {100 * h / H:.1f}],  # match {mx:.2f}')


def main(args):
    if "--locate" in args:
        return locate()
    want = set(a for a in args if not a.startswith("-"))
    total = 0
    for c in CREW:
        if want and c["slug"] not in want:
            continue
        mp4 = None if "--no-video" in args else build_mp4(c)
        av, st = build_avatar(c), build_sticker(c)
        total += av + st + (mp4[0] if mp4 else 0)
        print(f"  {c['slug']:15} mp4 {mp4[0] / 1e3 if mp4 else 0:7.0f} kB ({mp4[1] if mp4 else 0:4.1f} s)   avatar {av / 1e3:5.0f} kB   sticker {st / 1e3:5.0f} kB")
    print(f"share kit: {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main(sys.argv[1:])
