"""Render 'The Extra Seat: Part 2' as a 9:16 horror short with Tenglish voice-over.
Usage: python3 render.py <vo_dir> <work_dir> <out.mp4>
"""
import sys, os, math, random, subprocess, wave
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES

W, H, FPS, SR = 1080, 1920, 24, 44100
LEAD = 0.35
VO, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(WORK, exist_ok=True)
FB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FX = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FS = "/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"
FSB = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
font = lambda p, s: ImageFont.truetype(p, s)

def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()

# ---------------------------------------------------------------- timeline
TL, t = [], 0.0
for s in SCENES:
    vd = wav_dur(f"{VO}/{s['id']}.wav")
    d = LEAD + vd + s["pause"]
    TL.append(dict(s, start=t, vo=vd, dur=d))
    t += d
TOTAL = t

# ---------------------------------------------------------------- drawing helpers
BW, BH = int(W * 1.12), int(H * 1.12)

def grad(top, bot, w=BW, h=BH):
    a = np.linspace(0, 1, h)[:, None, None]
    img = np.array(top)[None, None] * (1 - a) + np.array(bot)[None, None] * a
    return Image.fromarray(np.repeat(img, w, 1).astype(np.uint8))

def glow(img, cx, cy, r, color, k=1.0):
    y, x = np.ogrid[:img.height, :img.width]
    d = np.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * r * r)))[..., None] * k
    a = np.asarray(img).astype(np.float32) + d * np.array(color, np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def layer(img, fn, blur=0):
    L = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(L))
    if blur:
        L = L.filter(ImageFilter.GaussianBlur(blur))
    out = img.convert("RGBA"); out.alpha_composite(L)
    return out.convert("RGB")

def person(d, x, y, s, col, kind="child", ribbon=False):
    """Simple silhouette standing with feet at (x,y), height ~ s."""
    hr = s * 0.09
    if kind == "old":
        d.ellipse([x - hr, y - s, x + hr, y - s + 2 * hr], fill=col)           # head
        d.ellipse([x + hr * 0.4, y - s - hr * 0.2, x + hr * 1.3, y - s + hr * 0.8], fill=col)  # bun
        d.polygon([(x - s * .13, y - s * .80), (x + s * .13, y - s * .80), (x + s * .26, y), (x - s * .26, y)], fill=col)
    else:
        d.ellipse([x - hr, y - s, x + hr, y - s + 2 * hr], fill=col)
        d.polygon([(x - s * .12, y - s * .80), (x + s * .12, y - s * .80), (x + s * .16, y - s * .38), (x - s * .16, y - s * .38)], fill=col)
        d.rectangle([x - s * .11, y - s * .40, x - s * .03, y], fill=col)
        d.rectangle([x + s * .03, y - s * .40, x + s * .11, y], fill=col)
        if ribbon:
            d.polygon([(x + hr * .6, y - s + hr * .4), (x + hr * 2.0, y - s - hr * .2), (x + hr * 1.8, y - s + hr * 1.2)], fill=(60, 110, 200, 230))

def van_interior(img, mood="blue", wet=None, boy=False):
    cx, vy = BW // 2, int(BH * 0.40)
    def fn(d):
        # side windows
        for side in (-1, 1):
            for i in range(4):
                z0, z1 = 1 / (1 + i * .9), 1 / (1 + (i + 1) * .9 - .25)
                xa, xb = cx + side * 620 * z0, cx + side * 620 * z1
                ya0, ya1 = vy - 420 * z0, vy - 60 * z0
                yb0, yb1 = vy - 420 * z1, vy - 60 * z1
                c = (120, 150, 190, 90) if mood == "blue" else (90, 120, 160, 70)
                d.polygon([(xa, ya0), (xb, yb0), (xb, yb1), (xa, ya1)], fill=c)
        # seats: rows receding
        for i in range(5, -1, -1):
            z = .78 / (1 + i * .62)
            for side in (-1, 1):
                x0 = cx + side * 70 * z; x1 = cx + side * 520 * z
                top, bot = vy - 110 * z, vy + 330 * z
                l, r = min(x0, x1), max(x0, x1)
                sc = (int(40 + 25 * z), int(30 + 15 * z), int(34 + 15 * z), 255)
                d.rounded_rectangle([l, top, r, bot], radius=int(40 * z), fill=sc)
                d.rounded_rectangle([l + 10 * z, top + 14 * z, r - 10 * z, top + 120 * z], radius=int(30 * z), fill=(sc[0] + 18, sc[1] + 10, sc[2] + 10, 255))
        # floor aisle
        d.polygon([(cx - 80, BH), (cx + 80, BH), (cx + 15, vy + 60), (cx - 15, vy + 60)], fill=(18, 18, 24, 200))
    img = layer(img, fn, blur=2)
    if wet:
        x, y, r = wet
        img = layer(img, lambda d: d.ellipse([x - r, y - r * .32, x + r, y + r * .32], fill=(140, 190, 230, 120)), blur=6)
        img = glow(img, x, y, r * .7, (40, 70, 90), .8)
    if boy:
        img = layer(img, lambda d: person(d, cx + 300, int(BH * .78), 620, (150, 190, 210, 26)), blur=14)
    return img

# ---------------------------------------------------------------- scene backgrounds
def bg(v):
    random.seed(hash(v) & 0xffff)
    if v in ("title", "end"):
        img = grad((4, 4, 8), (10, 6, 8))
        if v == "end":
            img = layer(img, lambda d: d.rectangle([BW / 2 - 28, BH * .62, BW / 2 + 28, BH * .74], fill=(220, 210, 190, 255)), blur=1)
            img = glow(img, BW / 2, BH * .60, 90, (255, 160, 60), 1.3)
            img = layer(img, lambda d: d.ellipse([BW / 2 - 14, BH * .585, BW / 2 + 14, BH * .618], fill=(255, 230, 170, 255)), blur=3)
        return img
    if v == "bridge":
        img = grad((8, 14, 30), (4, 8, 14))
        img = glow(img, BW * .75, BH * .18, 70, (200, 210, 230), 1.0)
        def fn(d):
            d.rectangle([0, BH * .62, BW, BH], fill=(10, 20, 34, 255))
            for i in range(40):
                y = BH * .62 + i * 18; d.line([(random.random() * BW, y), (random.random() * BW, y)], fill=(60, 80, 110, 60), width=2)
            d.polygon([(0, BH * .50), (BW * .40, BH * .50), (BW * .44, BH * .54), (BW * .38, BH * .53), (0, BH * .53)], fill=(6, 6, 10, 255))
            d.polygon([(BW * .62, BH * .51), (BW, BH * .50), (BW, BH * .53), (BW * .58, BH * .54)], fill=(6, 6, 10, 255))
            for px in (BW * .15, BW * .85):
                d.rectangle([px - 18, BH * .53, px + 18, BH * .66], fill=(6, 6, 10, 255))
            d.polygon([(BW * .47, BH * .58), (BW * .53, BH * .60), (BW * .50, BH * .66)], fill=(6, 6, 10, 255))
            d.rounded_rectangle([BW * .12, BH * .445, BW * .34, BH * .50], radius=18, fill=(20, 18, 16, 255))
        img = layer(img, fn, blur=1)
        img = glow(img, BW * .345, BH * .48, 60, (255, 220, 150), .9)
        return img
    if v in ("van_calm", "van_wet", "van_count", "van_whisper"):
        top = (60, 78, 100) if v in ("van_calm", "van_count") else (20, 30, 45)
        img = grad(top, (8, 8, 12))
        return van_interior(img, wet=(BW // 2 + 95, int(BH * .40) - 30, 45) if v == "van_wet" else None)
    if v in ("wet_close", "wet_beside"):
        img = grad((22, 26, 34), (6, 6, 8))
        def fn(d):
            d.rounded_rectangle([BW * .08, BH * .30, BW * .92, BH * .78], radius=80, fill=(52, 34, 38, 255))
            for i in range(6):
                x = BW * (.18 + i * .13); d.line([(x, BH * .33), (x, BH * .75)], fill=(40, 26, 30, 255), width=6)
        img = layer(img, fn, blur=3)
        img = layer(img, lambda d: d.ellipse([BW * .22, BH * .48, BW * .80, BH * .64], fill=(110, 160, 200, 110)), blur=12)
        img = glow(img, BW * .5, BH * .55, 150, (40, 70, 95), 1.0)
        if v == "wet_beside":
            img = layer(img, lambda d: [d.ellipse([BW * (.2 + .1 * i) - 30, BH * (.82 + .02 * (i % 2)) - 12, BW * (.2 + .1 * i) + 30, BH * (.82 + .02 * (i % 2)) + 12], fill=(100, 150, 190, 90)) for i in range(7)], blur=6)
        return img
    if v in ("window_night", "window_fog", "fog_message"):
        img = grad((6, 10, 22), (2, 3, 8))
        img = glow(img, BW * .5, BH * .40, 380, (40, 60, 90), 1.0)
        def fn(d):
            d.rectangle([BW * .14, BH * .16, BW * .86, BH * .66], outline=(30, 28, 30, 255), width=40)
            d.line([(BW * .5, BH * .16), (BW * .5, BH * .66)], fill=(30, 28, 30, 255), width=24)
            d.line([(BW * .14, BH * .41), (BW * .86, BH * .41)], fill=(30, 28, 30, 255), width=24)
            if v == "window_night":
                d.rectangle([BW * .10, BH * .12, BW * .62, BH * .72], fill=(30, 16, 22, 245))
            else:
                d.polygon([(BW * .02, BH * .10), (BW * .17, BH * .10), (BW * .12, BH * .74), (BW * .02, BH * .74)], fill=(30, 16, 22, 255))
            d.rectangle([BW * .08, BH * .66, BW * .92, BH * .70], fill=(26, 22, 22, 255))
        img = layer(img, fn, blur=2)
        if v != "window_night":
            img = layer(img, lambda d: d.rectangle([BW * .17, BH * .18, BW * .83, BH * .64], fill=(170, 185, 200, 70)), blur=20)
        return img
    if v == "library":
        img = grad((20, 14, 10), (6, 4, 4))
        def fn(d):
            for row in range(5):
                y = BH * (.08 + row * .11)
                d.rectangle([0, y + 120, BW, y + 136], fill=(40, 26, 18, 255))
                x = 20
                while x < BW:
                    w = random.randint(26, 60); hgt = random.randint(80, 118)
                    c = random.choice([(70, 30, 26), (40, 50, 40), (60, 50, 30), (30, 34, 54)])
                    d.rectangle([x, y + 120 - hgt, x + w, y + 120], fill=c + (255,)); x += w + 4
            d.rectangle([0, BH * .66, BW, BH], fill=(36, 22, 14, 255))
            d.polygon([(BW * .2, BH * .70), (BW * .78, BH * .69), (BW * .84, BH * .82), (BW * .16, BH * .83)], fill=(200, 185, 150, 255))
            for i in range(9):
                d.line([(BW * .24, BH * (.72 + i * .012)), (BW * .78, BH * (.715 + i * .012))], fill=(90, 80, 70, 255), width=5)
        img = layer(img, fn, blur=1)
        return glow(img, BW * .8, BH * .62, 260, (180, 120, 50), 1.0)
    if v == "newspaper":
        img = grad((190, 172, 132), (150, 130, 95))
        def fn(d):
            d.text((BW * .5, BH * .17), "THE COLONY TIMES", font=font(FSB, 92), fill=(30, 26, 22, 255), anchor="mm")
            d.line([(BW * .08, BH * .21), (BW * .92, BH * .21)], fill=(40, 34, 28, 255), width=6)
            d.text((BW * .5, BH * .235), "Tuesday, 1994", font=font(FS, 44), fill=(50, 44, 36, 255), anchor="mm")
            d.text((BW * .5, BH * .29), "SCHOOL BUS FALLS", font=font(FSB, 104), fill=(25, 20, 18, 255), anchor="mm")
            d.text((BW * .5, BH * .345), "FROM OLD BRIDGE", font=font(FSB, 104), fill=(25, 20, 18, 255), anchor="mm")
            d.rectangle([BW * .22, BH * .39, BW * .78, BH * .64], fill=(90, 80, 64, 255))
            person(d, BW * .5, BH * .64, BH * .22, (40, 34, 28, 255), ribbon=True)
            d.text((BW * .5, BH * .665), "Lakshmi, age 8.", font=font(FS, 50), fill=(30, 26, 22, 255), anchor="mm")
            d.text((BW * .5, BH * .69), "Survived by her mother, of Lake Road.", font=font(FS, 40), fill=(40, 34, 28, 255), anchor="mm")
            for i in range(10):
                y = BH * (.72 + i * .02)
                d.line([(BW * .08, y), (BW * (.92 - random.random() * .2), y)], fill=(90, 80, 62, 255), width=8)
        img = layer(img, fn)
        a = np.asarray(img).astype(np.float32)
        a *= (0.85 + 0.15 * np.random.rand(*a.shape[:2], 1))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
    if v in ("lake_house", "lamp_out"):
        img = grad((36, 30, 54), (10, 10, 18)) if v == "lake_house" else grad((26, 20, 30), (10, 8, 12))
        def fn(d):
            d.rectangle([0, BH * .62, BW, BH], fill=(14, 18, 28, 255))
            d.polygon([(BW * .45, BH), (BW * .62, BH), (BW * .54, BH * .62), (BW * .50, BH * .62)], fill=(30, 26, 26, 255))
            d.polygon([(BW * .28, BH * .62), (BW * .28, BH * .44), (BW * .50, BH * .32), (BW * .74, BH * .43), (BW * .72, BH * .62)], fill=(12, 10, 12, 255))
            d.polygon([(BW * .62, BH * .37), (BW * .68, BH * .36), (BW * .70, BH * .40)], fill=(36, 30, 54, 255))
            d.rectangle([BW * .45, BH * .48, BW * .55, BH * .55], fill=(40, 30, 20, 255) if v == "lake_house" else (14, 12, 14, 255))
            for i in range(14):
                x = random.random() * BW; d.line([(x, BH * .62), (x + 14, BH * .45 - random.random() * 120)], fill=(8, 10, 10, 255), width=4)
        img = layer(img, fn, blur=1)
        if v == "lake_house":
            img = glow(img, BW * .50, BH * .515, 70, (255, 170, 70), 1.4)
            img = glow(img, BW * .50, BH * .70, 90, (120, 80, 40), .5)
        else:
            img = layer(img, lambda d: [d.ellipse([BW * .5 - 30 + 20 * math.sin(i), BH * (.47 - i * .03) - 30, BW * .5 + 30 + 20 * math.sin(i), BH * (.47 - i * .03) + 30], fill=(160, 160, 170, 30)) for i in range(8)], blur=18)
        return img
    if v in ("old_woman", "old_woman_close", "porch_wind", "porch_dark", "embrace"):
        dark = v == "porch_dark"
        img = grad((24, 20, 28) if not dark else (10, 10, 16), (8, 6, 8))
        sc = 1.35 if v == "old_woman_close" else 1.0
        def fn(d):
            d.rectangle([0, BH * .66, BW, BH], fill=(30, 22, 18, 255))
            for i in range(10):
                d.line([(0, BH * (.68 + i * .03)), (BW, BH * (.68 + i * .03))], fill=(20, 14, 12, 255), width=4)
            for i in range(3):
                d.rectangle([BW * .15 - i * 40, BH * (.62 + i * .02), BW * .85 + i * 40, BH * (.64 + i * .02)], fill=(44, 32, 26, 255))
            d.rectangle([BW * .82, BH * .20, BW * .95, BH * .46], fill=(30, 24, 20, 255))
            if v in ("old_woman", "old_woman_close"):
                person(d, BW * .45, BH * .63 + (sc - 1) * 400, BH * .30 * sc, (8, 6, 8, 255), kind="old")
                rx, ry = BW * .45, BH * .55 + (sc - 1) * 300
                d.line([(rx - 40 * sc, ry), (rx + 50 * sc, ry + 20 * sc)], fill=(60, 100, 190, 255), width=int(14 * sc))
            if v == "embrace":
                person(d, BW * .42, BH * .64, BH * .32, (8, 6, 8, 255), kind="old")
                d.line([(BW * .42, BH * .43), (BW * .56, BH * .47)], fill=(8, 6, 8, 255), width=26)
            if v == "porch_wind":
                person(d, BW * .30, BH * .64, BH * .30, (8, 6, 8, 255), kind="old")
        img = layer(img, fn, blur=1)
        if v == "embrace":
            img = layer(img, lambda d: person(d, BW * .56, BH * .64, BH * .20, (200, 220, 255, 60), ribbon=True), blur=12)
            img = glow(img, BW * .56, BH * .52, 120, (60, 70, 90), .9)
        img = glow(img, BW * .885, BH * .33, 90, (255, 160, 60), .25 if dark else 1.2)
        return img
    if v == "walk_home":
        img = grad((120, 70, 70), (30, 20, 30))
        img = glow(img, BW * .5, BH * .48, 200, (255, 150, 80), .8)
        def fn(d):
            for i in range(6):
                x = i * BW / 5 - 60; hh = random.randint(200, 360)
                d.rectangle([x, BH * .55 - hh, x + 170, BH * .55], fill=(26, 18, 24, 255))
                d.polygon([(x - 10, BH * .55 - hh), (x + 85, BH * .55 - hh - 80), (x + 180, BH * .55 - hh)], fill=(26, 18, 24, 255))
            d.polygon([(0, BH), (BW, BH), (BW * .56, BH * .55), (BW * .44, BH * .55)], fill=(40, 30, 34, 255))
            person(d, BW * .45, BH * .80, BH * .30, (10, 6, 10, 255))
            person(d, BW * .56, BH * .80, BH * .22, (10, 6, 10, 255))
            d.line([(BW * .47, BH * .64), (BW * .54, BH * .66)], fill=(10, 6, 10, 255), width=12)
        return layer(img, fn, blur=1)
    return grad((10, 10, 14), (2, 2, 4))

# ---------------------------------------------------------------- overlays
rng = np.random.default_rng(7)
def make_fog():
    n = rng.random((60, 34)).astype(np.float32)
    f = Image.fromarray((n * 255).astype(np.uint8)).resize((W * 2, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))
    return np.asarray(f).astype(np.float32) / 255.0
FOG = None
GRAIN = None
yy, xx = np.ogrid[:H, :W]
VIG = (1 - 0.75 * np.clip((((xx - W / 2) / (W * .62)) ** 2 + ((yy - H / 2) / (H * .62)) ** 2), 0, 1))[..., None].astype(np.float32)

def wrap(text, f, maxw):
    out = []
    for para in text.split("\n"):
        line = ""
        for w in para.split(" "):
            t = (line + " " + w).strip()
            if f.getlength(t) <= maxw: line = t
            else:
                if line: out.append(line)
                line = w
        out.append(line)
    return out

def caption_img(text, center=False, big=False):
    f = font(FX if big else FB, 96 if big else 52)
    lines = wrap(text, f, W - 140)
    lh = int(f.size * 1.3)
    L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    y0 = (H - lh * len(lines)) // 2 if center else int(H * .78) - lh * len(lines) // 2
    if not center:
        d.rounded_rectangle([50, y0 - 30, W - 50, y0 + lh * len(lines) + 20], radius=30, fill=(0, 0, 0, 120))
    for i, ln in enumerate(lines):
        y = y0 + i * lh
        col = (235, 60, 50, 255) if big and i == 0 else (245, 240, 230, 255)
        d.text((W // 2 + 3, y + 3), ln, font=f, fill=(0, 0, 0, 220), anchor="ma")
        d.text((W // 2, y), ln, font=f, fill=col, anchor="ma")
    return L

FLICKER = {"lake_house", "old_woman", "old_woman_close", "porch_wind", "porch_dark", "library", "end", "embrace"}
DRIPS = {"van_wet", "wet_close", "wet_beside"}
FOGGY = {"title", "bridge", "window_fog", "fog_message", "lake_house", "porch_wind", "porch_dark", "lamp_out", "embrace", "end", "wet_beside", "van_whisper"}

def render_scene(i):
    global FOG, GRAIN
    if FOG is None:
        FOG = make_fog(); GRAIN = [rng.normal(0, 9, (H, W, 1)).astype(np.float32) for _ in range(6)]
    sc = TL[i]; v = sc["visual"]
    base = bg(v)
    n = int(round(sc["dur"] * FPS))
    out = f"{WORK}/{sc['id']}.mp4"
    chunks = sc["caption"].split("|")
    special = v in ("title", "end")
    weights = np.array([len(c) for c in chunks], float); cum = np.concatenate([[0], np.cumsum(weights / weights.sum())])
    caps = [caption_img(c, center=special, big=v in ("title", "end")) for c in chunks]
    zoom_in = i % 2 == 0
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    dx0, dx1, dy0, dy1 = (.55, .63, .40, .58) if v == "van_wet" else (.30, .70, .60, .95)
    drops = [[random.uniform(dx0, dx1) * W, random.uniform(0, 1), random.uniform(.6, 1.4)] for _ in range(6 if v == "van_wet" else 10)]
    for k in range(n):
        tt = k / FPS; u = k / max(n - 1, 1)
        z = 1.0 + 0.08 * (u if zoom_in else 1 - u)
        cw, ch = int(BW / z / 1.12 * 1.0), int(BH / z / 1.12)
        cw, ch = int(W * 1.12 / z), int(H * 1.12 / z)
        ox, oy = (BW - cw) // 2, (BH - ch) // 2 + int(20 * math.sin(u * math.pi))
        fr = base.crop((ox, oy, ox + cw, oy + ch)).resize((W, H), Image.BILINEAR)
        if v == "fog_message":
            txt = "Naa peru Lakshmi.\nNannu intiki\nteesukellu."
            reveal = min(1, max(0, (tt - LEAD) / max(sc["vo"], 1)))
            m = Image.new("L", (W, H), 0); dm = ImageDraw.Draw(m)
            nch = int(len(txt) * reveal)
            dm.multiline_text((W // 2, int(H * .40)), txt[:nch], font=font(FS, 92), fill=255, anchor="mm", align="center", spacing=30)
            m = m.filter(ImageFilter.GaussianBlur(3))
            dark = Image.new("RGB", (W, H), (10, 16, 30))
            fr = Image.composite(dark, fr, m)
            # dripping trails under letters
        if v in DRIPS:
            dd = ImageDraw.Draw(fr)
            for dr in drops:
                y = ((dr[1] + tt * dr[2] * .35) % 1.0)
                yy0 = H * (dy0 + (dy1 - dy0) * y)
                dd.ellipse([dr[0] - 5, yy0 - 12, dr[0] + 5, yy0 + 7], fill=(160, 200, 230))
        a = np.asarray(fr).astype(np.float32)
        if v in FOGGY:
            off = int((tt * 30 + i * 200) % W)
            fog = FOG[:, off:off + W][..., None]
            a = a * (1 - .30 * fog) + 150 * .30 * fog * (0.5 if v not in ("window_fog", "fog_message") else 1.0)
        bright = 1.0
        if v in FLICKER:
            bright = 0.92 + 0.08 * math.sin(tt * 13) * math.sin(tt * 3.7)
            if v == "porch_dark" and random.random() < .08: bright = 0.55
            if v == "porch_wind" and tt > sc["vo"] * .5 and random.random() < .1: bright = 0.6
        if v == "lamp_out":
            bright = 1.0 if tt < LEAD + .6 else max(0.55, 1 - (tt - LEAD - .6) * 2)
        if v == "wet_beside" and tt > sc["dur"] - 1.6 and (k // 3) % 4 == 0:
            a = np.asarray(layer(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), lambda d: person(d, W * .62, H * .80, 900, (180, 210, 230, 70)), blur=10)).astype(np.float32)
        a = a * bright * VIG + GRAIN[k % 6]
        # fade in/out
        fa = min(1, tt / .35, (sc["dur"] - tt) / .35)
        a *= max(0, fa)
        fr = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        ct = (tt - LEAD) / sc["vo"] if sc["vo"] else 0
        ci = int(np.clip(np.searchsorted(cum, ct, side="right") - 1, 0, len(chunks) - 1))
        if special or tt >= LEAD * .5:
            fr.paste(caps[ci], (0, 0), caps[ci])
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    return out

# ---------------------------------------------------------------- audio
def synth_audio():
    N = int(TOTAL * SR) + SR
    t = np.arange(N) / SR
    voice = np.zeros(N, np.float32); music = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
    r = np.random.default_rng(3)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * t / 11)
    music += (0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.4 * t + np.sin(t * .3)) + 0.18 * np.sin(2 * np.pi * 110.5 * t)) * lfo
    noise = r.standard_normal(N).astype(np.float32)
    k = np.ones(400) / 400
    music += 0.6 * np.convolve(noise, k, "same") * 6
    music += 0.05 * np.sin(2 * np.pi * 659 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 23)) ** 8   # distant music-box tone
    def add(buf, at, sig, g=1.0):
        a = int(at * SR); b = min(N, a + len(sig))
        if 0 <= a < N: buf[a:b] += sig[:b - a] * g
    def env(n, atk=.01, rel=.3):
        e = np.ones(n); A = int(atk * SR); R = int(rel * SR)
        e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R) if R < n else 1
        return e
    def drip():
        n = int(.18 * SR); tt = np.arange(n) / SR
        f = 1400 * np.exp(-tt * 12) + 500
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)
    def knock():
        n = int(.25 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 180 * tt) + .5 * r.standard_normal(n) * np.exp(-tt * 80)) * np.exp(-tt * 30)
    def windn(d):
        n = int(d * SR); w = np.convolve(r.standard_normal(n), np.ones(60) / 60, "same") * 4
        return w * np.sin(np.linspace(0, np.pi, n)) ** 2 * (0.7 + 0.3 * np.sin(np.linspace(0, 9, n)))
    def step():
        n = int(.3 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 70 * tt) * 1.2 + np.convolve(r.standard_normal(n), np.ones(20) / 20, "same") * 2 * np.exp(-tt * 10)) * np.exp(-tt * 14)
    def sting(soft=False):
        n = int(3.5 * SR); tt = np.arange(n) / SR
        s = (np.sin(2 * np.pi * 40 * tt) + .6 * np.sin(2 * np.pi * 233 * tt) + .5 * np.sin(2 * np.pi * 247 * tt) + .3 * np.sin(2 * np.pi * 311 * tt)) * np.exp(-tt * 1.2)
        s[:200] *= np.linspace(0, 1, 200)
        return s * (.45 if soft else 1.0)
    def chime():
        n = int(4 * SR); tt = np.arange(n) / SR
        return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (1.2 + j * .4)) for j, f in enumerate([523, 659, 784, 1046])) * .35
    def whoosh():
        n = int(1.6 * SR); w = np.convolve(r.standard_normal(n), np.ones(15) / 15, "same") * 3
        return w * np.sin(np.linspace(0, np.pi, n)) ** 3
    def crickets(d):
        n = int(d * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * 4200 * tt) * (np.sin(2 * np.pi * 30 * tt) > .6) * (np.sin(2 * np.pi * .9 * tt) > 0) * .12
    def rise(d):
        n = int(d * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * (60 + 40 * tt / d) * tt) * (tt / d) ** 2 * 1.2
    for sc in TL:
        s0, vs = sc["start"], sc["start"] + LEAD
        with wave.open(f"{VO}/{sc['id']}.wav") as wf_:
            w = np.frombuffer(wf_.readframes(wf_.getnframes()), np.int16).astype(np.float32) / 32768
        add(voice, vs, w)
        for fx in sc["sfx"]:
            if fx == "drips":
                for x in np.arange(s0 + .3, s0 + sc["dur"], 0.75): add(sfx, x + r.random() * .3, drip(), .35)
            elif fx == "taps":
                e = vs + sc["vo"]
                for x in (e - 2.5, e - 1.6, e - .7, e + 0.2): add(sfx, x, knock(), .9)
            elif fx == "wind": add(sfx, s0, windn(sc["dur"]), .5)
            elif fx == "footsteps":
                for j in range(5): add(sfx, vs + sc["vo"] - 2.6 + j * .62, step(), .8)
            elif fx == "sting": add(sfx, s0 + (sc["dur"] - 2.2 if sc["id"] == "s22" else .1), sting(), .5)
            elif fx == "sting_soft": add(sfx, vs + sc["vo"] - 1.5, sting(True), .5)
            elif fx == "chime": add(sfx, vs + sc["vo"] * .5, chime(), .4)
            elif fx == "whoosh": add(sfx, s0, whoosh(), .6)
            elif fx == "crickets": add(sfx, s0, crickets(sc["dur"]), 1)
            elif fx == "blowout": add(sfx, vs + .5, whoosh()[: int(.5 * SR)], .8)
            elif fx == "drone_rise": add(sfx, s0, rise(sc["dur"]), .5)
    def norm(x, peak): return x / (np.abs(x).max() + 1e-9) * peak
    voice = norm(voice, .92)
    music = norm(music, .10)
    sfx = norm(sfx, .40)
    duck = np.convolve((np.abs(voice) > .02).astype(np.float32), np.ones(SR // 4) / (SR // 4), "same")
    mix = voice + music * (1 - .5 * np.clip(duck, 0, 1)) + sfx
    fade = int(2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
    mix = np.clip(mix, -1, 1)
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(f"{WORK}/mix.wav", "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())

if __name__ == "__main__":
    only = os.environ.get("ONLY")
    idx = [int(x) for x in only.split(",")] if only else list(range(len(TL)))
    print(f"total {TOTAL:.1f}s, scenes {len(TL)}")
    if not only: synth_audio()
    with Pool(4) as pool:
        segs = pool.map(render_scene, idx)
    if only: sys.exit(0)
    with open(f"{WORK}/list.txt", "w") as f:
        for s in segs: f.write(f"file '{s}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{WORK}/list.txt", "-i", f"{WORK}/mix.wav",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], check=True)
    print("done", OUT)
