"""Render 'అదనపు సీటు — మూడవ భాగం' as a 9:16 2D cartoon with pure-Telugu voices.
Usage: python3 render.py <vo_dir> <work_dir> <out.mp4>
       ONLY=s02,s20 python3 render.py ...   (re-render some scenes only)
       STILLS=1 python3 render.py ...       (one still per scene -> work/stills.png)
"""
import sys, os, math, random, subprocess, wave, json
from functools import lru_cache
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from script import SCENES

W, H, FPS, SR = 1080, 1920, 24, 44100
K = 2                       # supersampling for backgrounds and sprites
LEAD, GAP = 0.35, 0.25
VO, WORK, OUT = sys.argv[1], os.path.abspath(sys.argv[2]), sys.argv[3]
os.makedirs(WORK, exist_ok=True)

FONTS = os.path.join(HERE, "..", "helmet-video", "tools", "fonts")
F_TEL = os.path.join(FONTS, "noto-sans-telugu-telugu-900-normal.woff2")
F_TITLE = os.path.join(FONTS, "ramabhadra-telugu-400-normal.woff2")
F_LAT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
OL = (34, 24, 34)           # cartoon outline colour

@lru_cache(None)
def font(p, s):
    return ImageFont.truetype(p, s)

# ================================================================ timeline
def wav_load(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

TL, t = [], 0.0
for s in SCENES:
    cur, segs = LEAD, []
    for n, (spk, text) in enumerate(s["segs"]):
        a = wav_load(f"{VO}/{s['id']}_{n}.wav")
        d = len(a) / SR
        hop = SR // FPS
        rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2) + 1e-12) for i in range(0, len(a), hop)])
        segs.append(dict(spk=spk, text=text, t0=cur, dur=d, rms=rms / (rms.max() + 1e-9)))
        cur += d + GAP
    dur = cur - GAP + s["pause"]
    TL.append(dict(s, start=t, dur=dur, seg=segs))
    t += dur
TOTAL = t
SPK_CHAR = {"R": "riya", "A": "arjun", "M": "mohan", "G": "ravi"}
SPK_NAME = {"R": "రియా", "A": "అర్జున్", "M": "మోహన్ మావయ్య", "G": "రవి"}
SPK_COL = {"R": (236, 72, 120), "A": (40, 150, 230), "M": (200, 130, 30), "G": (90, 190, 230)}

# ================================================================ mixed Telugu / Latin text
def is_tel(ch):
    return "ఀ" <= ch <= "౿" or ch in "‌‍"

def runs(text):
    out = []
    for ch in text:
        k = is_tel(ch)
        if out and out[-1][0] == k: out[-1][1] += ch
        else: out.append([k, ch])
    return out

def tw(text, size, tfont=F_TEL):
    return sum(font(tfont if k else F_LAT, size if k else int(size * .9)).getlength(r) for k, r in runs(text))

def draw_text(d, x, y, text, size, fill, tfont=F_TEL, stroke=0, sfill=OL, anchor="m"):
    """draw mixed text; x is centre (anchor m) or left (anchor l); y is the middle"""
    wdt = tw(text, size, tfont)
    cx = x - wdt / 2 if anchor == "m" else x
    for k, r in runs(text):
        f = font(tfont if k else F_LAT, size if k else int(size * .9))
        d.text((cx, y), r, font=f, fill=fill, anchor="lm", stroke_width=stroke, stroke_fill=sfill)
        cx += f.getlength(r)

def wrap(text, size, maxw, tfont=F_TEL):
    lines, line = [], ""
    for w_ in text.split(" "):
        tt = (line + " " + w_).strip()
        if tw(tt, size, tfont) <= maxw: line = tt
        else:
            if line: lines.append(line)
            line = w_
    lines.append(line)
    return lines

# ================================================================ characters
CH = {
    "riya":  dict(kid=1, skin=(204, 146, 102), hair=(34, 22, 24), style="braids", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="skirt", tie=(46, 84, 176)),
    "arjun": dict(kid=1, skin=(192, 132, 90), hair=(28, 20, 20), style="short", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="shorts"),
    "ravi":  dict(kid=1, skin=(192, 134, 94), hair=(26, 22, 30), style="wet", shirt=(60, 122, 222), bottom=(52, 54, 70), btype="shorts", badge=1, whistle=1),
    "mohan": dict(kid=0, skin=(176, 116, 76), hair=(200, 200, 204), style="bald", shirt=(196, 166, 104), bottom=(76, 66, 56), btype="pants", stache=(210, 210, 214)),
    "ymohan": dict(kid=0, skin=(180, 120, 80), hair=(30, 24, 24), style="short", shirt=(196, 166, 104), bottom=(76, 66, 56), btype="pants", stache=(30, 24, 24)),
    "kid1":  dict(kid=1, skin=(214, 160, 116), hair=(40, 26, 20), style="braids", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="skirt", tie=(200, 60, 60)),
    "kid2":  dict(kid=1, skin=(170, 112, 76), hair=(20, 16, 16), style="short", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="shorts"),
    "kid3":  dict(kid=1, skin=(196, 140, 98), hair=(50, 30, 22), style="bob", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="skirt", tie=(46, 84, 176)),
    "kid4":  dict(kid=1, skin=(184, 124, 84), hair=(24, 18, 18), style="short", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="shorts"),
    "kid5":  dict(kid=1, skin=(208, 150, 108), hair=(30, 20, 20), style="bob", shirt=(250, 250, 246), bottom=(46, 84, 176), btype="skirt", tie=(46, 84, 176)),
}
# arm pose offsets for the right arm, relative to the shoulder: (elbow dx, dy, hand dx, dy)
ARM = {"down": (3, 13, 3, 24), "lap": (4, 15, -7, 25), "point": (14, -3, 28, -9), "cover": (6, 13, -8, -9),
       "hug": (12, 1, 22, -9), "wave": (10, -7, 12, -23), "hold": (4, 15, -6, 11), "wheel": (6, 11, -2, 19)}
POSE = {"down": ("down", "down"), "lap": ("lap", "lap"), "point": ("lap", "point"), "cover": ("cover", "cover"),
        "hug": ("hug", "hug"), "wave": ("down", "wave"), "hold": ("hold", "hold"), "wheel": ("wheel", "wheel"),
        "pointstand": ("down", "point")}

@lru_cache(maxsize=400)
def sprite(who, pose="down", expr="neutral", mouth=0, blink=False, h=560, seated=False, look=0, ghost=False, flip=False):
    """returns (RGBA image, {anchor name: (x, y)}) at final scale; h = standing height in px"""
    c = CH[who]; kid = c["kid"]
    px = h / 100 * K
    img = Image.new("RGBA", (int(120 * px), int(112 * px)), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    X = lambda u: (u + 10) * px
    Y = lambda u: (u + 6) * px
    lw = max(2, int(1.0 * px))
    def E(cx, cy, rx, ry, fill, ol=True):
        d.ellipse([X(cx - rx), Y(cy - ry), X(cx + rx), Y(cy + ry)], fill=fill, outline=OL if ol else None, width=lw)
    def R(x0, y0, x1, y1, fill, r=3, ol=True):
        d.rounded_rectangle([X(x0), Y(y0), X(x1), Y(y1)], radius=r * px, fill=fill, outline=OL if ol else None, width=lw)
    def P(pts, fill, ol=True):
        d.polygon([(X(a), Y(b)) for a, b in pts], fill=fill, outline=OL if ol else None, width=lw if ol else 0)
    def L(pts, fill, wu):
        d.line([(X(a), Y(b)) for a, b in pts], fill=fill, width=int(wu * px), joint="curve")
    def limb(a, b, col, wu):
        L([a, b], OL, wu + 2 * lw / px); L([a, b], col, wu)
        for p in (a, b): E(p[0], p[1], wu / 2, wu / 2, col, ol=False)

    if kid: hx, hy, r, tt, tb, tw_, hip, aw = 50, 20, 15, 35, 64, 15, 64, 7
    else:   hx, hy, r, tt, tb, tw_, hip, aw = 50, 13, 11, 25, 58, 17, 58, 8
    sk, bo = c["skin"], c["bottom"]
    # ---- legs
    if seated:
        lap0 = hip - 2
        knee = lap0 + 10
        for sx in (-1, 1):
            limb((50 + sx * 6, knee), (50 + sx * 6, knee + 17), sk, 6.5)
            R(50 + sx * 6 - 5, knee + 16, 50 + sx * 6 + 5, knee + 21, (30, 26, 30), r=2)
        if c["btype"] == "pants":
            for sx in (-1, 1): limb((50 + sx * 6, knee - 2), (50 + sx * 6, knee + 15), bo, 8)
        R(50 - tw_ - 3, lap0, 50 + tw_ + 3, knee + (3 if c["btype"] == "skirt" else 1), bo, r=5)
        anchors = {"seat": (X(50), Y(knee))}
    else:
        for sx in (-1, 1):
            col = bo if c["btype"] == "pants" else sk
            limb((50 + sx * 6, hip + 8), (50 + sx * 6, 96), col, 7.5)
            R(50 + sx * 6 - 6 + sx * 1.5, 94, 50 + sx * 6 + 6 + sx * 1.5, 100, (30, 26, 30), r=2.5)
        if c["btype"] == "skirt": P([(50 - tw_ - 1, hip - 2), (50 + tw_ + 1, hip - 2), (50 + tw_ + 6, hip + 15), (50 - tw_ - 6, hip + 15)], bo)
        elif c["btype"] == "shorts": R(50 - tw_ - 1, hip - 2, 50 + tw_ + 1, hip + 12, bo, r=3)
        else: R(50 - tw_ - 1, hip - 2, 50 + tw_ + 1, hip + 6, bo, r=3)
        anchors = {"feet": (X(50), Y(100))}
    # ---- torso
    R(hx - 3, tt - 4, hx + 3, tt + 2, sk, r=1)                                      # neck
    P([(50 - tw_, tt + 1), (50 + tw_, tt + 1), (50 + tw_ + 1.5, tb), (50 - tw_ - 1.5, tb)], c["shirt"])
    P([(50 - 5, tt), (50, tt + 5), (50 + 5, tt)], c["shirt"])                         # collar
    if c.get("tie"): P([(49, tt + 4), (51, tt + 4), (52.5, tt + 16), (50, tt + 19), (47.5, tt + 16)], c["tie"])
    if not kid: [E(50, tt + 9 + 8 * i, .9, .9, (90, 70, 40), ol=False) for i in range(3)]
    if c.get("badge"):
        E(58, tt + 10, 4.6, 4.6, (246, 206, 60))
        draw_text(d, X(58), Y(tt + 10), "ర", int(6.5 * px), (170, 30, 30))
    if c.get("whistle"):
        L([(46, tt + 1), (44, tt + 12)], (90, 90, 96), .8); R(41, tt + 11, 47, tt + 15, (200, 200, 210), r=1.5)
    # ---- head
    if c["style"] in ("braids", "short", "wet", "bob"):
        E(hx, hy - 1, r + 1.5, r + 1.5, c["hair"])                                     # back hair
    if c["style"] == "bob": R(hx - r - 2, hy - 4, hx + r + 2, hy + r * .7, c["hair"], r=6)
    for sx in (-1, 1): E(hx + sx * r * .98, hy + 2, r * .25, r * .3, sk)                # ears
    E(hx, hy, r, r, sk)                                                                # face
    hc = c["hair"]
    if c["style"] in ("braids", "short", "wet", "bob"):
        d.chord([X(hx - r - .5), Y(hy - r - 1.6), X(hx + r + .5), Y(hy + r * .15)], 180, 360, fill=hc, outline=OL, width=lw)
    if c["style"] == "short":
        for i in range(5): P([(hx - r * .8 + i * r * .4, hy - r * .55), (hx - r * .6 + i * r * .4, hy - r * 1.25), (hx - r * .4 + i * r * .4, hy - r * .55)], hc, ol=False)
    if c["style"] == "wet":
        for i in range(6): L([(hx - r * .7 + i * r * .28, hy - r * .5), (hx - r * .75 + i * r * .28, hy - r * .15 - (i % 2) * 2)], hc, 1.6)
        E(hx + r * .55, hy - r * .02, .9, 1.4, (140, 200, 255), ol=False)
    if c["style"] == "braids":
        for sx in (-1, 1):
            for j in range(4): E(hx + sx * (r + .5), hy + 4 + j * 4.2, 2.8, 2.6, hc)
            P([(hx + sx * (r + .5), hy + 21), (hx + sx * (r + 4), hy + 19), (hx + sx * (r + 4), hy + 24)], (220, 50, 70))
            P([(hx + sx * (r + .5), hy + 21), (hx + sx * (r - 3), hy + 19), (hx + sx * (r - 3), hy + 24)], (220, 50, 70))
    if c["style"] == "bald":
        for sx in (-1, 1): E(hx + sx * r * .88, hy - r * .2, r * .22, r * .38, hc)
        E(hx - r * .35, hy - r * .62, r * .22, r * .1, (220, 170, 130), ol=False)
    # ---- face
    big = expr in ("scared", "shock")
    for sx in (-1, 1):
        ex, ey = hx + sx * r * .38, hy + r * .08
        if blink and expr != "shock":
            d.arc([X(ex - r * .2), Y(ey - r * .12), X(ex + r * .2), Y(ey + r * .16)], 20, 160, fill=OL, width=lw)
        elif expr == "happy" and mouth == 0:
            d.arc([X(ex - r * .2), Y(ey - r * .05), X(ex + r * .2), Y(ey + r * .3)], 200, 340, fill=OL, width=int(lw * 1.4))
        else:
            ry = r * (.32 if big else .25); rx = r * (.23 if big else .19)
            E(ex, ey, rx, ry, (255, 255, 255))
            pr = r * (.08 if big else .11)
            E(ex + look * r * .08, ey + r * .03, pr, pr, (30, 20, 24), ol=False)
            E(ex + look * r * .08 - pr * .4, ey - pr * .3, pr * .35, pr * .35, (255, 255, 255), ol=False)
            if expr == "cry":
                d.chord([X(ex - rx - .3), Y(ey - ry - .3), X(ex + rx + .3), Y(ey + ry * .1)], 180, 360, fill=sk, outline=OL, width=lw)
        # brows
        by = hy - r * (.42 if big else .3)
        if expr in ("sad", "cry"): L([(ex - sx * r * .2, by + r * .06), (ex + sx * r * .2, by - r * .08)], OL, 1.3)  # inner ends up
        elif expr == "shout": L([(ex - sx * r * .2, by + r * .1), (ex + sx * r * .2, by - r * .04)], OL, 1.5)
        else: d.arc([X(ex - r * .2), Y(by - r * .05), X(ex + r * .2), Y(by + r * .15)], 200, 340, fill=OL, width=int(lw * 1.3))
        if expr == "cry":
            for k_ in range(2): E(ex + sx * r * .05, ey + r * (.4 + k_ * .32), .9, 1.4, (120, 190, 255), ol=False)
        if kid and expr not in ("scared", "shock"): E(hx + sx * r * .62, hy + r * .42, r * .16, r * .09, (240, 130, 130), ol=False)
    d.arc([X(hx - r * .1), Y(hy + r * .22), X(hx + r * .1), Y(hy + r * .38)], 0, 180, fill=OL, width=lw)  # nose
    my = hy + r * .58
    if c.get("stache"):
        my = hy + r * .7
        P([(hx - r * .45, hy + r * .55), (hx, hy + r * .42), (hx + r * .45, hy + r * .55), (hx + r * .3, hy + r * .62), (hx, hy + r * .54), (hx - r * .3, hy + r * .62)], c["stache"])
    if expr == "shout": mouth = max(mouth, 1) + 1
    if expr == "shock": mouth = max(mouth, 2)
    if mouth:
        mw = r * (.22 if mouth == 1 else .3); mh = r * (.12 if mouth == 1 else .26)
        E(hx, my + mh * .5, mw, mh, (120, 30, 40))
        E(hx, my + mh * 1.0, mw * .55, mh * .35, (230, 110, 110), ol=False)
    elif expr == "happy":
        d.arc([X(hx - r * .3), Y(my - r * .2), X(hx + r * .3), Y(my + r * .22)], 15, 165, fill=OL, width=int(lw * 1.4))
    elif expr in ("sad", "cry"):
        d.arc([X(hx - r * .22), Y(my + r * .02), X(hx + r * .22), Y(my + r * .3)], 200, 340, fill=OL, width=int(lw * 1.4))
    elif expr == "scared":
        E(hx, my + r * .08, r * .1, r * .13, (120, 30, 40))
    else:
        L([(hx - r * .16, my + r * .08), (hx + r * .16, my + r * .06)], OL, 1.2)
    # ---- arms (after head so 'cover' hands sit over the mouth)
    sy = tt + 4; sc = 1.0 if kid else 1.1
    for side, pn in zip((-1, 1), POSE[pose]):
        ex_, ey_, hx_, hy_ = ARM[pn]
        sh = (50 + side * (tw_ - 1), sy)
        el = (sh[0] + side * ex_ * sc, sh[1] + ey_ * sc)
        hd = (sh[0] + side * hx_ * sc, sh[1] + hy_ * sc)
        limb(sh, el, c["shirt"], aw); limb(el, hd, sk, aw * .8); E(hd[0], hd[1], aw * .62, aw * .62, sk)
    if pose == "hold":
        R(36, sy + 5, 64, sy + 21, (244, 236, 214), r=1)
        for i in range(4): L([(39, sy + 9 + i * 3), (61, sy + 9 + i * 3)], (120, 110, 100), .6)
        for hxp in (sy + 15,): [E(50 + sd * 9, hxp, aw * .62, aw * .62, sk) for sd in (-1, 1)]
    anchors["head"] = (X(hx), Y(hy))
    img = img.resize((img.width // K, img.height // K), Image.LANCZOS)
    anchors = {k_: (v[0] / K, v[1] / K) for k_, v in anchors.items()}
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        anchors = {k_: (img.width - v[0], v[1]) for k_, v in anchors.items()}
    if ghost:
        a = np.asarray(img).astype(np.float32)
        lum = a[..., :3].mean(2, keepdims=True)
        a[..., :3] = a[..., :3] * .35 + (lum * .5 + np.array([120, 175, 230])) * .65
        a[..., 3] *= .62
        g = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        glow_l = Image.new("RGBA", g.size, (0, 0, 0, 0))
        al = g.split()[3].point(lambda v: min(255, v * 2)).filter(ImageFilter.GaussianBlur(int(h * .035)))
        glow_l.putalpha(al.point(lambda v: v * .7)); glow_l = Image.composite(Image.new("RGBA", g.size, (150, 210, 255, 255)), glow_l, al)
        glow_l.putalpha(al.point(lambda v: int(v * .55)))
        glow_l.alpha_composite(g); img = glow_l
    return img, anchors

# ================================================================ drawing helpers for backgrounds (2x)
class Pen:
    def __init__(self, w=W, h=H, bg=(0, 0, 0, 0)):
        self.img = Image.new("RGBA", (w * K, h * K), bg); self.d = ImageDraw.Draw(self.img)
    def r(self, x0, y0, x1, y1, fill, rad=0, ol=OL, w=5):
        self.d.rounded_rectangle([x0 * K, y0 * K, x1 * K, y1 * K], radius=rad * K, fill=fill, outline=ol, width=w * K if ol else 0)
    def e(self, x0, y0, x1, y1, fill, ol=OL, w=5):
        self.d.ellipse([x0 * K, y0 * K, x1 * K, y1 * K], fill=fill, outline=ol, width=w * K if ol else 0)
    def p(self, pts, fill, ol=OL, w=5):
        self.d.polygon([(a * K, b * K) for a, b in pts], fill=fill, outline=ol, width=w * K if ol else 0)
    def l(self, pts, fill, w=5):
        self.d.line([(a * K, b * K) for a, b in pts], fill=fill, width=w * K, joint="curve")
    def t(self, x, y, text, size, fill, tfont=F_TEL, anchor="m", stroke=0):
        draw_text(self.d, x * K, y * K, text, size * K, fill, tfont, stroke * K, anchor=anchor)
    def out(self):
        return self.img.resize((self.img.width // K, self.img.height // K), Image.LANCZOS)

def vgrad(top, bot, w=W, h=H):
    a = np.linspace(0, 1, h)[:, None, None]
    g = np.array(top, np.float32)[None, None] * (1 - a) + np.array(bot, np.float32)[None, None] * a
    return Image.fromarray(np.repeat(g, w, 1).astype(np.uint8)).convert("RGBA")

def tint(img, mul):
    a = np.asarray(img).astype(np.float32)
    a[..., :3] *= np.array(mul, np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

TINTS = {"day": (1, 1, 1), "morning": (1.05, 1.0, .95), "dusk": (1.0, .78, .72), "night": (.42, .48, .72), "dark": (.32, .36, .58)}

def glow(img, cx, cy, rad, col, k=1.0):
    y, x = np.ogrid[:img.height, :img.width]
    g = np.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * rad * rad)))[..., None] * k
    a = np.asarray(img).astype(np.float32)
    a[..., :3] += g * np.array(col, np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def note_shape(pen, x, y, s, col):
    pen.e(x - s, y - s * .7, x + s, y + s * .7, col, w=3)
    pen.l([(x + s * .9, y), (x + s * .9, y - s * 3.2)], OL, 4)
    pen.p([(x + s * .9, y - s * 3.2), (x + s * 2.2, y - s * 2.5), (x + s * .9, y - s * 2.2)], col, w=3)

# ---------------------------------------------------------------- scenery strip seen through van windows
WIN_Y0, WIN_Y1 = 560, 980
@lru_cache(None)
def scenery(kind):
    SW = 2400; hgt = WIN_Y1 - WIN_Y0
    sky = {"day": ((120, 190, 245), (200, 230, 250)), "morning": ((150, 200, 245), (250, 230, 200)),
           "dusk": ((90, 70, 140), (250, 150, 100)), "night": ((14, 18, 48), (40, 44, 90)), "lake": ((90, 70, 140), (250, 150, 100))}[kind]
    pen = Pen(SW, hgt); pen.img.paste(vgrad(sky[0], sky[1], SW * K, hgt * K), (0, 0))
    rnd = random.Random(kind)
    if kind == "lake":
        pen.e(SW * .3, hgt * .35, SW * .3 + 220, hgt * .35 + 220, (255, 200, 120), ol=None)
        pen.r(0, hgt * .58, SW, hgt, (60, 60, 120), ol=None)
        for i in range(40):
            y = hgt * .62 + rnd.random() * hgt * .36; x = rnd.random() * SW
            pen.l([(x, y), (x + rnd.randint(40, 160), y)], (250, 170, 120), 4)
        for i in range(0, SW, 140): pen.e(i, hgt * .45, i + 200, hgt * .66, (40, 50, 50), ol=None)
        return pen.out()
    if kind == "night":
        for i in range(60): x, y = rnd.random() * SW, rnd.random() * hgt * .5; pen.e(x, y, x + 5, y + 5, (230, 230, 255), ol=None)
        pen.e(SW * .6, 40, SW * .6 + 110, 150, (240, 240, 220), ol=None)
    else:
        for i in range(8):
            x, y = rnd.random() * SW, 30 + rnd.random() * 90
            for j in range(3): pen.e(x + j * 50, y - (j % 2) * 20, x + j * 50 + 110, y + 60 - (j % 2) * 20, (255, 255, 255), ol=None)
    hill = (90, 160, 90) if kind in ("day", "morning") else (70, 60, 90) if kind == "dusk" else (20, 26, 40)
    pts = [(0, hgt)] + [(x, hgt * .55 - 50 * math.sin(x / 260) - 30 * math.sin(x / 90)) for x in range(0, SW + 1, 40)] + [(SW, hgt)]
    pen.p(pts, hill, ol=None)
    x = 0
    while x < SW:
        if rnd.random() < .5:
            wd = rnd.randint(150, 230); hh = rnd.randint(120, 200)
            col = rnd.choice([(240, 130, 110), (130, 190, 230), (250, 210, 120), (170, 220, 150), (230, 160, 210)])
            if kind == "night": col = tuple(int(v * .3) for v in col)
            pen.r(x, hgt - hh, x + wd, hgt + 10, col, w=4)
            pen.p([(x - 12, hgt - hh), (x + wd / 2, hgt - hh - 70), (x + wd + 12, hgt - hh)], (170, 70, 60) if kind != "night" else (40, 20, 24), w=4)
            wc = (255, 220, 120) if kind == "night" else (90, 140, 190)
            pen.r(x + 30, hgt - hh + 40, x + 70, hgt - hh + 85, wc, w=3); pen.r(x + wd - 70, hgt - hh + 40, x + wd - 30, hgt - hh + 85, wc, w=3)
            x += wd + rnd.randint(30, 90)
        else:
            tc = (60, 150, 70) if kind not in ("night", "dusk") else (30, 50, 50) if kind == "dusk" else (12, 24, 24)
            pen.r(x + 50, hgt - 120, x + 72, hgt + 10, (110, 70, 40), w=3)
            for (dx, dy, rr) in ((61, hgt - 190, 80), (30, hgt - 150, 55), (95, hgt - 150, 55)): pen.e(x + dx - rr, dy - rr, x + dx + rr, dy + rr, tc, w=4)
            x += 170
    return pen.out()

def scenery_frame(kind, t, speed):
    s = scenery(kind); SW = s.width
    off = int(t * speed) % SW
    strip = Image.new("RGBA", (W, s.height))
    strip.paste(s.crop((off, 0, min(SW, off + W), s.height)), (0, 0))
    if off + W > SW: strip.paste(s.crop((0, 0, off + W - SW, s.height)), (SW - off, 0))
    return strip

# ---------------------------------------------------------------- van interior (side benches)
SEAT_Y = 1292
@lru_cache(None)
def van_side_bg():
    pen = Pen()
    pen.r(-10, -10, W + 10, WIN_Y0 - 30, (70, 74, 96), ol=None)                         # ceiling
    for x in (180, 540, 900): pen.r(x - 90, 120, x + 90, 160, (250, 250, 220), rad=18, w=4)  # roof lights
    pen.l([(0, 300), (W, 300)], (210, 210, 220), 10)                                     # grab rail
    pen.r(-10, WIN_Y0 - 40, W + 10, 1180, (255, 214, 92), ol=None)                      # wall
    pen.d.rectangle([0, 0, W * K, (WIN_Y0 - 40) * K], fill=(70, 74, 96, 255))
    pen.l([(0, 300), (W, 300)], (210, 210, 220), 10)
    for x in (180, 540, 900): pen.r(x - 90, 120, x + 90, 160, (250, 250, 220), rad=18, w=4)
    for i in range(3):                                                                   # windows (holes)
        x0 = 30 + i * 350
        pen.r(x0 - 14, WIN_Y0 - 14, x0 + 314, WIN_Y1 + 14, (240, 190, 50), rad=40, w=6)
        pen.d.rounded_rectangle([x0 * K, WIN_Y0 * K, (x0 + 300) * K, WIN_Y1 * K], radius=30 * K, fill=(0, 0, 0, 0))
    pen.r(-10, 1120, W + 10, 1300, (178, 52, 64), rad=24, w=6)                           # backrest
    for x in range(0, W, 180): pen.l([(x, 1135), (x, 1290)], (150, 40, 52), 4)
    pen.r(-10, 1284, W + 10, 1348, (150, 40, 52), rad=16, w=6)                           # seat front
    pen.r(-10, 1348, W + 10, 1530, (60, 46, 52), ol=None)
    pen.r(-10, 1530, W + 10, H + 10, (96, 100, 116), ol=None)                           # floor
    for i in range(9): pen.l([(0, 1560 + i * 44), (W, 1560 + i * 44)], (80, 84, 100), 6)
    pen.r(530, 330, 552, 1120, (240, 200, 50), rad=8, w=4)                               # pole
    return pen.out()

def van_side(t, mood="day", scen="day", speed=0.0, bounce=True):
    base = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    base.paste(scenery_frame(scen, t, speed), (0, WIN_Y0))
    bg = van_side_bg()
    base.alpha_composite(bg)
    if mood != "day": base = tint(base, TINTS[mood])
    oy = int(4 * math.sin(t * 11) + 3 * math.sin(t * 7.3)) if (bounce and speed) else 0
    if oy: base = base.transform(base.size, Image.AFFINE, (1, 0, 0, 0, 1, -oy), fillcolor=(0, 0, 0, 255))
    return base, oy

def wet_patch(img, x, y, wdt=150, k=1.0):
    if k <= 0: return img
    pen = Pen()
    pen.e(x - wdt / 2, y - 26, x + wdt / 2, y + 22, (110, 170, 230, int(200 * k)), ol=None)
    pen.e(x - wdt / 4, y - 16, x, y - 4, (220, 240, 255, int(200 * k)), ol=None)
    for j in range(4): pen.e(x - 40 + j * 26, y + 50, x - 30 + j * 26, y + 66 + (j % 2) * 18, (110, 170, 230, int(220 * k)), ol=None)
    img.alpha_composite(pen.out()); return img

# ---------------------------------------------------------------- other backgrounds
@lru_cache(None)
def van_front_bg(mood):
    pen = Pen(); pen.img.paste(vgrad((80, 84, 110), (40, 40, 56), W * K, H * K), (0, 0))
    pen.p([(0, 0), (W, 0), (W * .66, H * .30), (W * .34, H * .30)], (66, 70, 92), w=4)           # ceiling
    pen.r(W * .34, H * .30, W * .66, H * .52, (255, 214, 92), w=4)                              # back wall
    pen.r(W * .39, H * .32, W * .61, H * .42, (150, 200, 240) if mood != "dusk" else (250, 160, 110), rad=16, w=5)
    for sd in (-1, 1):
        xo, xi = (0, W * .34) if sd < 0 else (W, W * .66)
        pen.p([(xo, H * .18), (xi, H * .32), (xi, H * .45), (xo, H * .62)], (255, 214, 92), w=4)
        pen.p([(xo, H * .62), (xi, H * .45), (xi, H * .49), (xo, H * .74)], (178, 52, 64), w=4)     # bench backs
        pen.p([(xo, H * .74), (xi, H * .49), (xi, H * .52), (xo, H * .80)], (150, 40, 52), w=4)
        for k_ in range(3):
            a = .2 + k_ * .25; x = xo + (xi - xo) * a
            pen.r(x - 8 * (1 - a) - 6, H * (.20 + .12 * a), x + 8 * (1 - a) + 6, H * (.36 + .1 * a), (150, 200, 240) if mood != "dusk" else (250, 160, 110), rad=10, w=3)
    pen.p([(W * .34, H * .52), (W * .66, H * .52), (W, H), (0, H)], (96, 100, 116), w=4)
    img = pen.out()
    return tint(img, TINTS[mood]) if mood != "day" else img

@lru_cache(None)
def wheel_fg(cx, cy, rad):
    pen = Pen()
    pen.e(cx - rad, cy - rad * .55, cx + rad, cy + rad * .55, None, ol=(30, 30, 36), w=46)
    pen.e(cx - rad, cy - rad * .55, cx + rad, cy + rad * .55, None, ol=(60, 60, 70), w=26)
    pen.l([(cx - rad * .9, cy), (cx + rad * .9, cy)], (40, 40, 48), 24)
    pen.e(cx - 60, cy - 36, cx + 60, cy + 36, (50, 50, 60), w=6)
    pen.r(-10, cy + rad * .3, W + 10, H + 10, (36, 36, 44), rad=40, w=6)                 # dashboard
    return pen.out()

@lru_cache(None)
def mirror_frame():
    pen = Pen()
    pen.r(W * .47, -10, W * .53, H * .14, (40, 40, 48), w=5)
    pen.r(40, H * .13, W - 40, H * .50, None, rad=70, ol=(40, 40, 48), w=26)
    return pen.out()

@lru_cache(None)
def mirror_inside(eyes):
    """what the mirror shows: Mohan's eyes on top, the back of the van behind"""
    mw, mh = W - 120, int(H * .37 - 40)
    pen = Pen(mw, mh); pen.img.paste(vgrad((255, 220, 120), (200, 160, 80), mw * K, mh * K), (0, 0))
    pen.r(mw * .30, mh * .38, mw * .70, mh * .78, (255, 214, 92), w=4)
    pen.r(mw * .36, mh * .42, mw * .64, mh * .62, (130, 160, 200), rad=14, w=4)          # back window
    pen.r(mw * .30, mh * .70, mw * .70, mh * .86, (178, 52, 64), rad=14, w=4)            # last seat
    pen.p([(0, mh * .55), (mw * .30, mh * .55), (mw * .30, mh * .90), (0, mh)], (178, 52, 64), w=4)
    pen.p([(mw, mh * .55), (mw * .70, mh * .55), (mw * .70, mh * .90), (mw, mh)], (178, 52, 64), w=4)
    pen.e(mw * .46, mh * .76, mw * .62, mh * .84, (110, 170, 230), ol=None)            # wet spot
    # Mohan's eyes across the top
    pen.r(0, 0, mw, mh * .30, (176, 116, 76), ol=None)
    for sx in (.36, .64):
        ex = mw * sx
        pen.e(ex - 70, mh * .06, ex + 70, mh * .24, (255, 255, 255), w=5)
        pr = 24 if eyes == "scared" else 32
        pen.e(ex - pr + 20, mh * .15 - pr, ex + pr + 20, mh * .15 + pr, (30, 20, 24), ol=None)
        if eyes == "sad": pen.l([(ex - 80, mh * .04), (ex + 80, mh * -.02)] if sx > .5 else [(ex - 80, mh * -.02), (ex + 80, mh * .04)], OL, 10)
        else: pen.l([(ex - 80, mh * .0), (ex, mh * -.05), (ex + 80, mh * .0)], OL, 10)
    img = pen.out()
    return tint(img, (.75, .78, .95))

@lru_cache(None)
def road_bg():
    pen = Pen(); pen.img.paste(vgrad((110, 180, 240), (210, 235, 250), W * K, H * K), (0, 0))
    for i in range(4): pen.e(80 + i * 260, 160 + (i % 2) * 60, 280 + i * 260, 240 + (i % 2) * 60, (255, 255, 255), ol=None)
    pen.r(-10, H * .52, W + 10, H * .60, (110, 170, 230), ol=None)                         # river
    for x in (120, 420, 720, 1000): pen.r(x - 26, H * .36, x + 26, H * .58, (170, 170, 176), w=4)  # new bridge pillars
    pen.r(-10, H * .34, W * .62, H * .38, (190, 190, 196), w=4)                          # half-built deck
    pen.l([(W * .80, H * .10), (W * .80, H * .40)], (240, 170, 30), 18)                    # crane
    pen.l([(W * .55, H * .12), (W * .98, H * .12)], (240, 170, 30), 14); pen.l([(W * .62, H * .12), (W * .62, H * .28)], (60, 60, 60), 3)
    pen.r(-10, H * .58, W + 10, H * .64, (110, 170, 90), ol=None)
    pen.r(-10, H * .64, W + 10, H * .80, (70, 70, 80), w=4)                              # road
    for x in range(0, W, 180): pen.r(x, H * .715, x + 100, H * .725, (250, 240, 200), ol=None)
    pen.r(-10, H * .80, W + 10, H + 10, (110, 170, 90), ol=None)
    for x in range(30, W, 120): pen.p([(x, H * .82), (x + 40, H * .82), (x + 20, H * .79)], (70, 140, 70), ol=None)
    pen.r(W * .62, H * .55, W * .95, H * .63, (250, 200, 40), rad=10, w=4)                 # sign board
    pen.t(W * .785, H * .59, "పనులు జరుగుతున్నాయి", 30, (30, 30, 30))
    return pen.out()

@lru_cache(None)
def van_ext(door_open=False):
    """yellow school van, side view, ~760x420, window holes"""
    vw, vh = 780, 430
    pen = Pen(vw, vh)
    pen.r(10, 40, vw - 10, vh - 70, (250, 200, 40), rad=60, w=7)
    pen.p([(vw - 150, 40), (vw - 40, 60), (vw - 10, 190), (vw - 150, 190)], (250, 200, 40), w=7)
    pen.r(20, 210, vw - 20, 236, (30, 30, 36), ol=None)
    pen.t(vw * .42, 280, "బడి బండి", 54, (30, 30, 36))
    for x in (150, vw - 170):
        pen.e(x - 70, vh - 140, x + 70, vh, (30, 30, 36), w=6); pen.e(x - 30, vh - 100, x + 30, vh - 40, (180, 180, 190), w=4)
    holes = [(50 + i * 140, 70, 170 + i * 140, 190) for i in range(4)] + [(vw - 140, 70, vw - 36, 190)]
    for (a, b, c_, d_) in holes:
        pen.r(a - 6, b - 6, c_ + 6, d_ + 6, (30, 30, 36), rad=18, w=3)
        pen.d.rounded_rectangle([a * K, b * K, c_ * K, d_ * K], radius=14 * K, fill=(0, 0, 0, 0))
    if door_open: pen.r(330, 60, 470, vh - 80, (20, 20, 26), rad=10, w=5)
    pen.e(vw - 40, 230, vw - 4, 262, (255, 250, 200), w=4)
    return pen.out(), holes

def van_with_people(door_open=False, driver="mohan", expr="neutral", mouth=0, blink=False, kids=0, glass=(140, 190, 230)):
    vimg, holes = van_ext(door_open)
    out = Image.new("RGBA", vimg.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(out)
    for (a, b, c_, d_) in holes: dr.rounded_rectangle([a, b, c_, d_], radius=14, fill=glass + (255,))
    if driver:
        sp, an = sprite(driver, "wheel", expr, mouth, blink, 300, True, 1)
        hx, hy = an["head"]; a, b, c_, d_ = holes[-1]
        out.alpha_composite(sp, (int((a + c_) / 2 - hx), int(b + 60 - hy)))
    for i in range(kids):
        sp, an = sprite(["kid1", "kid2", "kid3", "kid4"][i % 4], "lap", "happy", 0, False, 250, True, 0)
        hx, hy = an["head"]; a, b, c_, d_ = holes[i]
        out.alpha_composite(sp, (int((a + c_) / 2 - hx), int(b + 62 - hy)))
    msk = Image.new("L", vimg.size, 0); dm = ImageDraw.Draw(msk)
    for (a, b, c_, d_) in holes: dm.rounded_rectangle([a, b, c_, d_], radius=14, fill=255)
    clipped = Image.new("RGBA", vimg.size, (0, 0, 0, 0)); clipped.paste(out, (0, 0), msk)
    clipped.alpha_composite(vimg)
    return clipped

@lru_cache(None)
def lake_bg():
    pen = Pen(); pen.img.paste(vgrad((70, 50, 120), (255, 150, 100), W * K, int(H * .5) * K), (0, 0))
    pen.e(W * .5 - 150, H * .40, W * .5 + 150, H * .40 + 300, (255, 210, 120), ol=None)
    for i in range(0, W + 100, 110): pen.e(i - 90, H * .40, i + 90, H * .50, (50, 40, 70), ol=None)       # far trees
    pen.r(-10, H * .48, W + 10, H * .74, (70, 60, 130), ol=None)                                          # lake
    pen.r(-10, H * .72, W + 10, H + 10, (60, 90, 60), ol=None)
    pen.p([(0, H * .70), (W * .4, H * .72), (W * .7, H * .70), (W, H * .73), (W, H * .76), (0, H * .76)], (60, 90, 60), ol=None)
    for x in range(10, W, 70): pen.p([(x, H * .76), (x + 26, H * .76), (x + 13, H * .72)], (40, 70, 44), ol=None)
    pen.r(W * .78, H * .58, W * .80, H * .73, (60, 40, 30), w=3)                                           # lamp post at the jetty
    return pen.out()

def lake_frame(t):
    img = lake_bg().copy(); pen = Pen()
    rnd = random.Random(1)
    for i in range(30):
        y = H * (.50 + rnd.random() * .22); x = (rnd.random() * W + t * 20 * (1 + i % 3)) % W
        pen.l([(x, y), (x + rnd.randint(30, 120), y)], (255, 190, 130, 180), 4)
    for i in range(14):
        x = (rnd.random() * W + 30 * math.sin(t * .7 + i)) % W; y = H * (.60 + rnd.random() * .25) + 20 * math.sin(t + i)
        a = int(255 * max(0, math.sin(t * 2.3 + i * 1.7)))
        pen.e(x - 6, y - 6, x + 6, y + 6, (255, 250, 150, a), ol=None)
    img.alpha_composite(pen.out()); return img

@lru_cache(None)
def room_bg(mood):
    night = mood == "night"
    pen = Pen(); pen.img.paste(vgrad((120, 96, 150) if not night else (36, 36, 74), (80, 64, 110) if not night else (20, 20, 44), W * K, H * K), (0, 0))
    pen.r(-10, H * .70, W + 10, H + 10, (150, 100, 70) if not night else (50, 40, 46), ol=None)
    for i in range(6): pen.l([(0, H * (.72 + i * .05)), (W, H * (.72 + i * .05))], (130, 86, 60) if not night else (40, 32, 38), 4)
    wx0, wy0, wx1, wy1 = 90, 260, 560, 900
    sky = ((250, 160, 110), (255, 210, 150)) if not night else ((10, 14, 40), (30, 34, 70))
    pen.img.paste(vgrad(sky[0], sky[1], int((wx1 - wx0) * K), int((wy1 - wy0) * K)), (wx0 * K, wy0 * K))
    if night:
        pen.e(380, 330, 480, 430, (240, 240, 210), ol=None)
        for i in range(12): x = wx0 + 30 + (i * 97) % 420; y = wy0 + 40 + (i * 53) % 300; pen.e(x, y, x + 5, y + 5, (230, 230, 255), ol=None)
    for i in range(3): pen.e(wx0 + 40 + i * 130, wy1 - 160, wx0 + 200 + i * 130, wy1 + 40, (40, 70, 50) if night else (80, 130, 80), ol=None)
    pen.r(wx0 - 20, wy0 - 20, wx1 + 20, wy1 + 20, None, w=24, ol=(240, 230, 210) if not night else (90, 90, 110))
    pen.l([((wx0 + wx1) / 2, wy0), ((wx0 + wx1) / 2, wy1)], (240, 230, 210) if not night else (90, 90, 110), 14)
    pen.r(wx0 - 60, wy0 - 60, wx0 + 30, wy1 + 60, (200, 70, 90) if not night else (70, 30, 44), w=4)        # curtain
    pen.r(wx1 - 30, wy0 - 60, wx1 + 60, wy1 + 60, (200, 70, 90) if not night else (70, 30, 44), w=4)
    pen.r(700, 220, 980, 420, (250, 240, 220) if not night else (70, 70, 90), w=4)                         # wall poster
    pen.t(840, 320, "చదువు", 60, (200, 70, 90) if not night else (120, 60, 80))
    return pen.out()

@lru_cache(None)
def table_fg(mood):
    pen = Pen()
    pen.r(380, 1250, 1100, 1300, (170, 110, 60) if mood != "night" else (70, 50, 40), w=6)
    pen.r(400, 1300, 1080, 1700, (140, 90, 50) if mood != "night" else (56, 40, 34), w=6)
    pen.r(860, 1060, 900, 1250, (60, 60, 70), w=4); pen.p([(800, 1080), (960, 1080), (920, 980), (840, 980)], (240, 200, 60), w=5)
    pen.r(520, 1225, 700, 1258, (250, 250, 240), w=3)
    return pen.out()

@lru_cache(None)
def bed_fg():
    pen = Pen()
    pen.r(560, 1260, 1110, 1480, (80, 90, 160), rad=40, w=6)                                    # blanket
    for i in range(4): pen.l([(600 + i * 120, 1280), (640 + i * 120, 1460)], (100, 110, 180), 6)
    pen.r(540, 1460, 1110, 1700, (90, 60, 50), w=6)                                              # bed frame
    return pen.out()

@lru_cache(None)
def bed_bg():
    pen = Pen()
    pen.r(560, 980, 1110, 1300, (110, 80, 66), w=6)                                              # headboard
    pen.r(860, 1100, 1080, 1240, (240, 240, 250), rad=40, w=5)                                    # pillow
    return pen.out()

@lru_cache(None)
def library_bg():
    pen = Pen(); pen.img.paste(vgrad((120, 80, 60), (70, 46, 36), W * K, H * K), (0, 0))
    rnd = random.Random(3)
    for row in range(5):
        y = 160 + row * 210
        pen.r(-10, y + 160, W + 10, y + 184, (100, 60, 40), w=4)
        x = 10
        while x < W:
            w_ = rnd.randint(40, 80); hh = rnd.randint(110, 158)
            col = rnd.choice([(220, 80, 70), (70, 140, 200), (240, 190, 60), (90, 170, 110), (170, 100, 190), (240, 140, 70)])
            pen.r(x, y + 160 - hh, x + w_, y + 160, col, rad=4, w=3); pen.l([(x + 8, y + 160 - hh + 20), (x + w_ - 8, y + 160 - hh + 20)], (255, 255, 255, 120), 3)
            x += w_ + 4
    pen.r(-10, 1220, W + 10, H + 10, (110, 70, 46), ol=None)
    return pen.out()

@lru_cache(None)
def libtable_fg():
    pen = Pen()
    pen.r(-10, 1300, W + 10, 1360, (160, 100, 56), w=6)
    pen.r(20, 1360, W - 20, 1720, (130, 80, 44), w=6)
    pen.r(820, 1110, 850, 1300, (40, 90, 60), w=4); pen.p([(740, 1130), (930, 1130), (890, 1040), (780, 1040)], (40, 140, 80), w=5)
    pen.r(120, 1250, 300, 1300, (200, 70, 60), w=4); pen.r(130, 1210, 290, 1250, (70, 130, 200), w=4)
    return pen.out()

NAMES = ["లక్ష్మి, 8 ఏళ్ళు", "రవి, 10 ఏళ్ళు (డ్రైవర్ కొడుకు)", "సునీత, 9 ఏళ్ళు", "కిరణ్, 7 ఏళ్ళు",
         "అనిల్, 11 ఏళ్ళు", "పద్మ, 8 ఏళ్ళు", "రాజు, 9 ఏళ్ళు", "మీనా, 6 ఏళ్ళు"]
@lru_cache(None)
def paper_bg(hl):
    pen = Pen(); pen.img.paste(vgrad((236, 222, 186), (210, 192, 150), W * K, H * K), (0, 0))
    pen.r(50, 120, W - 50, H - 120, None, ol=(120, 100, 70), w=4)
    pen.t(W / 2, 220, "కాలనీ వార్తలు  -  1994", 70, (40, 30, 24))
    pen.l([(90, 280), (W - 90, 280)], (60, 50, 40), 6)
    pen.t(W / 2, 350, "బస్సులో ఉన్న పిల్లలు", 72, (30, 22, 18))
    for i, n in enumerate(NAMES):
        y = 470 + i * 88
        if i in hl: pen.r(90, y - 40, W - 90, y + 40, (240, 110, 80, 150), rad=12, ol=None)
        pen.t(120, y, f"{i + 1}.  {n}", 46, (36, 28, 22), anchor="l")
    pen.l([(90, 1190), (W - 90, 1190)], (60, 50, 40), 4)
    if "drv" in hl: pen.r(90, 1215, W - 90, 1295, (240, 110, 80, 150), rad=12, ol=None)
    pen.t(W / 2, 1255, "డ్రైవర్: మోహన్ రావు, 24 - ప్రాణాలతో బయటపడ్డాడు", 40, (30, 22, 18))
    if "miss" in hl: pen.r(90, 1320, W - 90, 1400, (240, 110, 80, 150), rad=12, ol=None)
    pen.t(W / 2, 1360, "ఆరుగురు పిల్లల ఆచూకీ ఇంకా తెలియలేదు", 44, (150, 24, 20) if "miss" in hl else (30, 22, 18))
    for i in range(5): pen.l([(90, 1450 + i * 34), (W - 90 - (i * 97) % 220, 1450 + i * 34)], (150, 130, 100), 10)
    return pen.out()

@lru_cache(None)
def drawing_img(seed, ring):
    rnd = random.Random(seed); j = lambda: rnd.uniform(-6, 6)
    pen = Pen(); pen.img.paste(vgrad((250, 246, 232), (236, 230, 210), W * K, H * K), (0, 0))
    for i in range(30): pen.l([(60, 120 + i * 58), (W - 60, 120 + i * 58)], (170, 190, 225), 3)
    pen.l([(170, 0), (170, H)], (230, 120, 120), 4)
    cx, cy = 560, 520
    def cl(pts, col, w=10): pen.l([(a + j(), b + j()) for a, b in pts], col, w)
    circle = [(cx + 150 * math.cos(a) + j(), cy + 160 * math.sin(a) + j()) for a in np.linspace(0, 2 * math.pi, 30)]
    pen.l(circle, (80, 60, 40), 12)
    for ex in (-55, 55): pen.e(cx + ex - 20 + j(), cy - 40 + j(), cx + ex + 20 + j(), cy + j(), (40, 30, 20), ol=None)
    cl([(cx - 50, cy + 80), (cx, cy + 60), (cx + 50, cy + 80)], (40, 30, 20))
    for k_ in range(10): cl([(cx - 130 + k_ * 28, cy - 140), (cx - 140 + k_ * 28, cy - 40)], (50, 70, 150), 9)
    body = [(cx - 220, cy + 200), (cx + 220, cy + 200), (cx + 250, cy + 780), (cx - 250, cy + 780)]
    pen.p([(a + j(), b + j()) for a, b in body], (70, 120, 220), ol=(40, 60, 140), w=8)
    for k_ in range(14): cl([(cx - 230 + k_ * 34, cy + 220), (cx - 240 + k_ * 34, cy + 760)], (90, 140, 235), 7)
    cl([(cx, cy + 160), (cx, cy + 200)], (80, 60, 40))
    pen.e(cx + 70, cy + 300, cx + 200, cy + 430, (250, 210, 60), ol=(80, 60, 40), w=6)
    pen.t(cx + 135, cy + 365, "ర", 90, (180, 30, 30))
    if ring: pen.e(cx + 30, cy + 260, cx + 240, cy + 470, None, ol=(230, 40, 40), w=10)
    cl([(cx - 90, cy + 200), (cx - 50, cy + 380)], (100, 100, 100), 6)
    pen.r(cx - 100, cy + 370, cx - 20, cy + 420, (190, 190, 200), rad=14, w=5)
    for k_ in range(16): cl([(cx - 230 + k_ * 30, cy + 800), (cx - 230 + k_ * 30, cy + 850 + (k_ % 3) * 36)], (80, 140, 230), 8)
    pen.t(W / 2, 1480, "అర్జున్", 70, (90, 70, 50))
    return pen.out()

@lru_cache(None)
def window_bg(ghost_out):
    pen = Pen(); pen.img.paste(vgrad((8, 12, 40), (24, 30, 70), W * K, H * K), (0, 0))
    pen.e(680, 300, 840, 460, (240, 240, 210), ol=None)
    for i in range(30): x = (i * 137) % W; y = (i * 71) % 900; pen.e(x, y, x + 5, y + 5, (230, 230, 255), ol=None)
    for i in range(4): pen.e(-60 + i * 300, 1000, 240 + i * 300, 1400, (14, 30, 30), ol=None)
    img = pen.out()
    if ghost_out:
        sp, an = sprite("ravi", "down", "sad", 0, False, 1100, False, 0, True)
        img.alpha_composite(sp, (int(W / 2 - an["feet"][0]), int(1650 - an["feet"][1])))
    return img

@lru_cache(None)
def window_frame():
    pen = Pen()
    pen.r(-20, -20, W + 20, 120, (90, 90, 110), ol=None); pen.r(-20, 1500, W + 20, H + 20, (90, 90, 110), ol=None)
    pen.r(-20, -20, 70, H + 20, (90, 90, 110), ol=None); pen.r(W - 70, -20, W + 20, H + 20, (90, 90, 110), ol=None)
    pen.r(W / 2 - 22, 0, W / 2 + 22, 1500, (90, 90, 110), w=5); pen.r(0, 790, W, 830, (90, 90, 110), w=5)
    pen.r(-20, 1500, W + 20, 1560, (120, 120, 140), w=5)
    return pen.out()

FOGN = None
def fog_layer(t, k):
    global FOGN
    if FOGN is None:
        n = np.random.default_rng(5).random((40, 24)).astype(np.float32)
        FOGN = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W * 2, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(50))).astype(np.float32) / 255
    off = int(t * 25) % W
    return FOGN[:, off:off + W] * k

@lru_cache(None)
def flash_bg():
    pen = Pen(); pen.img.paste(vgrad((60, 66, 80), (110, 116, 126), W * K, H * K), (0, 0))
    pen.r(-10, H * .58, W + 10, H + 10, (60, 80, 100), ol=None)
    for i in range(30): y = H * .6 + i * 26; pen.l([(i * 47 % W, y), (i * 47 % W + 140, y)], (100, 120, 140), 4)
    return pen.out()

@lru_cache(None)
def old_bus():
    bw, bh = 820, 380
    pen = Pen(bw, bh)
    pen.r(10, 30, bw - 10, bh - 70, (230, 120, 50), rad=40, w=7)
    pen.r(20, 190, bw - 20, 210, (250, 240, 220), ol=None)
    for x in (150, bw - 160): pen.e(x - 64, bh - 130, x + 64, bh, (30, 30, 36), w=6)
    for i in range(5): pen.r(40 + i * 150, 60, 160 + i * 150, 170, (170, 210, 240), rad=14, w=4)
    pen.t(bw / 2, 250, "1994", 50, (250, 240, 220), tfont=F_LAT)
    return pen.out()

def sepia(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    l = a @ np.array([.3, .59, .11], np.float32)
    s = np.stack([l * 1.07 + 20, l * .9 + 10, l * .68], -1)
    return Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).convert("RGBA")

def card(title, sub, t, end=False):
    img = vgrad((10, 14, 40), (40, 20, 50))
    pen = Pen(); rnd = random.Random(9)
    for i in range(140):
        x = rnd.random() * W; y = (rnd.random() * H + t * 900) % H
        pen.l([(x, y), (x - 8, y + 40)], (150, 170, 220, 140), 3)
    img.alpha_composite(pen.out())
    v = van_with_people(False, None, glass=(40, 50, 80))
    vs = v.resize((int(v.width * .9), int(v.height * .9)))
    img.alpha_composite(tint(vs, (.55, .55, .75)), (int(W / 2 - vs.width / 2 + (0 if end else 40 * math.sin(t))), 1180))
    pen = Pen()
    pen.t(W / 2, 640, title, 150, (255, 210, 60), tfont=F_TITLE, stroke=10)
    pen.t(W / 2, 860, sub, 96, (240, 70, 60), tfont=F_TITLE, stroke=8)
    for i in range(6):
        x = 260 + i * 110; L = 30 + (t * 60 + i * 37) % 120
        pen.r(x - 8, 930, x + 8, 930 + L, (240, 70, 60), rad=8, ol=None)
        pen.e(x - 14, 930 + L - 10, x + 14, 930 + L + 22, (240, 70, 60), ol=None)
    img.alpha_composite(pen.out())
    return img

# ================================================================ per-frame helpers
class Ctx:
    def __init__(self, sc, tt):
        self.sc, self.t = sc, tt
        self.si = 0
        for i, sg in enumerate(sc["seg"]):
            if tt >= sg["t0"] - .05: self.si = i
        sg = sc["seg"][self.si]
        self.seg = sg
        self.u = np.clip((tt - sg["t0"]) / sg["dur"], 0, 1)          # progress in current line
        self.U = tt / sc["dur"]                                        # progress in scene
        k = int((tt - sg["t0"]) * FPS)
        self.level = sg["rms"][k] if 0 <= k < len(sg["rms"]) else 0
    def mouth(self, who):
        if SPK_CHAR.get(self.seg["spk"]) != who: return 0
        return 0 if self.level < .18 else 1 if self.level < .5 else 2
    def blink(self, who):
        ph = (self.t + (hash(who) % 97) / 31) % 3.3
        return ph < .13

def put(img, ctx, who, x, y, h, pose="down", expr="neutral", seated=False, look=0, ghost=False, flip=False, anchor=None, alpha=1.0, bob=0.0):
    if isinstance(expr, (list, tuple)): expr = expr[min(ctx.si, len(expr) - 1)]
    if isinstance(pose, (list, tuple)): pose = pose[min(ctx.si, len(pose) - 1)]
    sp, an = sprite(who, pose, expr, ctx.mouth(who), ctx.blink(who), int(h), seated, look, ghost, flip)
    anchor = anchor or ("seat" if seated else "feet")
    ax, ay = an[anchor]
    oy = bob * math.sin(ctx.t * 2.2 + hash(who) % 7)
    if ghost: alpha *= .75 + .25 * math.sin(ctx.t * 5.0)
    if alpha < 1:
        sp = sp.copy(); sp.putalpha(sp.split()[3].point(lambda v: int(v * max(0, alpha))))
    img.alpha_composite(sp, (int(x - ax), int(y - ay + oy)))

def drops(img, t, xs, y0, y1, n=8, seed=1):
    pen = Pen(); rnd = random.Random(seed)
    for i in range(n):
        x = xs[0] + rnd.random() * (xs[1] - xs[0]); sp = .6 + rnd.random()
        y = y0 + ((rnd.random() + t * sp * .5) % 1) * (y1 - y0)
        pen.e(x - 7, y - 14, x + 7, y + 8, (140, 200, 250), ol=(60, 110, 170), w=2)
    img.alpha_composite(pen.out())

def rain(img, t, k=1.0, seed=2):
    pen = Pen(); rnd = random.Random(seed)
    for i in range(int(110 * k)):
        x = rnd.random() * W; y = (rnd.random() * H + t * 1400) % H
        pen.l([(x, y), (x - 10, y + 50)], (220, 230, 255, 150), 3)
    img.alpha_composite(pen.out())

def footprints(img, pts, k):
    pen = Pen()
    for i, (x, y, s_) in enumerate(pts):
        if i / len(pts) > k: break
        off = 18 * s_ if i % 2 else -18 * s_
        pen.e(x - 16 * s_, y + off - 26 * s_, x + 16 * s_, y + off + 26 * s_, (120, 180, 240, 200), ol=None)
        for tci in range(3): pen.e(x - 14 * s_ + tci * 10 * s_, y + off - 40 * s_, x - 6 * s_ + tci * 10 * s_, y + off - 30 * s_, (120, 180, 240, 200), ol=None)
    img.alpha_composite(pen.out())

def caption(img, ctx, special):
    if special: return img
    sg = ctx.seg
    if ctx.t < sg["t0"] - .1 or ctx.t > sg["t0"] + sg["dur"] + GAP + (ctx.sc["pause"] if ctx.si == len(ctx.sc["seg"]) - 1 else 0): return img
    img.alpha_composite(caption_img(ctx.sc["id"], ctx.si))
    return img

@lru_cache(None)
def caption_img(sid, si):
    sc = next(x for x in TL if x["id"] == sid); sg = sc["seg"][si]
    size = 54; lines = wrap(sg["text"], size, W - 170)
    lh = int(size * 1.55)
    L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    y0 = 1690 - lh * len(lines) // 2
    d.rounded_rectangle([46, y0 - 34, W - 46, y0 + lh * len(lines) + 14], radius=34, fill=(255, 255, 250, 235), outline=OL, width=6)
    if sg["spk"] in SPK_NAME:
        nm = SPK_NAME[sg["spk"]]; nw = tw(nm, 40) + 60
        d.rounded_rectangle([80, y0 - 82, 80 + nw, y0 - 20], radius=24, fill=SPK_COL[sg["spk"]], outline=OL, width=5)
        draw_text(d, 80 + nw / 2, y0 - 50, nm, 40, (255, 255, 255))
    for i, ln in enumerate(lines):
        draw_text(d, W // 2, y0 + i * lh + lh // 2 - 6, ln, size, (30, 24, 34))
    return L

def camera(img, z, cx=.5, cy=.45, shake=0.0, t=0.0):
    if z <= 1.001 and not shake: return img
    cw, ch = W / z, H / z
    x0 = min(max(cx * W - cw / 2, 0), W - cw) + shake * math.sin(t * 61); y0 = min(max(cy * H - ch / 2, 0), H - ch) + shake * math.cos(t * 47)
    return img.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BILINEAR)

# ================================================================ scene compositions
def kids_row(img, ctx, people, y=SEAT_Y):
    for p in people: put(img, ctx, *p[:4], seated=True, **(p[4] if len(p) > 4 else {}))

def compose(sc, tt):
    ctx = Ctx(sc, tt); sid = sc["id"]; U = ctx.U; z = 1.0; cx, cy = .5, .45; shake = 0
    if sid == "s01":
        img = card("అదనపు సీటు", "మూడవ భాగం", tt)
    elif sid == "s25":
        img = card("ఇంకా ఉంది...", "నాలుగవ భాగం", tt, end=True)
    elif sid == "s02":
        img, oy = van_side(tt, "day", "day", 260)
        wet_patch(img, 700, SEAT_Y + oy - 4)
        if ctx.si >= 2: put(img, ctx, "ravi", 700, SEAT_Y + oy, 520, "lap", "sad", True, -1, ghost=True, alpha=.55 + .3 * math.sin(tt * 3))
        kids_row(img, ctx, [("arjun", 200, SEAT_Y + oy, 440, dict(pose=["lap", "lap", "point"], expr=["neutral", "scared", "scared"], look=1)),
                            ("riya", 440, SEAT_Y + oy, 560, dict(pose="lap", expr=["scared", "scared", "shock"], look=1)),
                            ("kid2", 960, SEAT_Y + oy, 500, dict(pose="lap", expr="neutral", look=-1))])
        drops(img, tt, (650, 750), SEAT_Y + 40, SEAT_Y + 240)
        z = 1.0 + .08 * U; cx, cy = .45, .6
    elif sid in ("s03", "s19"):
        img = vgrad((120, 170, 220), (190, 200, 210))
        roadp = Pen()
        roadp.p([(W * .2, H), (W * .8, H), (W * .55, H * .55), (W * .45, H * .55)], (80, 80, 90), ol=None)
        for k_ in range(6):
            yy = H * .55 + ((k_ / 6 + tt * .5 * (sid == "s03")) % 1) ** 2 * H * .45
            roadp.r(W / 2 - 6 - (yy - H * .55) * .04, yy, W / 2 + 6 + (yy - H * .55) * .04, yy + 20 + (yy - H * .55) * .1, (250, 240, 200), ol=None)
        img.alpha_composite(roadp.out())
        if sid == "s19": img = tint(img, TINTS["dusk"])
        m = mirror_inside("scared" if sid == "s03" else "sad").copy()
        sp, an = sprite("ravi", "lap", "sad", 0, ctx.blink("ravi"), 330, True, -1 if sid == "s03" else 0, True)
        m.alpha_composite(sp, (int(m.width * .54 - an["seat"][0]), int(m.height * .80 - an["seat"][1] + 4 * math.sin(tt * 2))))
        msk = Image.new("L", m.size, 0); ImageDraw.Draw(msk).rounded_rectangle([0, 0, m.width, m.height], radius=60, fill=255)
        img.paste(m, (60, int(H * .13) + 20), msk)
        img.alpha_composite(mirror_frame())
        wf = wheel_fg(W // 2, 1500, 420); img.alpha_composite(wf)
        for sd in (-1, 1):   # trembling hands on the wheel
            hp = Pen(); jx = 5 * math.sin(tt * 40 + sd) if sid == "s03" else 0
            hp.e(W / 2 + sd * 330 - 55 + jx, 1430, W / 2 + sd * 330 + 55 + jx, 1530, CH["mohan"]["skin"], w=6)
            img.alpha_composite(hp.out())
        z = 1.0 + .06 * U
    elif sid == "s04":
        img = road_bg().copy()
        stop = sc["seg"][0]["t0"] + sc["seg"][0]["dur"] * .9
        p = min(1, tt / stop); x = -800 + (W / 2 + 800) * (1 - (1 - p) ** 2.4)
        shake = 6 if abs(tt - stop) < .5 else 0
        v = van_with_people(False, "mohan", ["neutral", "shout", "neutral"][ctx.si], ctx.mouth("mohan"), ctx.blink("mohan"), kids=4)
        tilt = 3 * math.exp(-max(0, tt - stop) * 4) * math.sin(max(0, tt - stop) * 18) if tt > stop else 0
        v2 = v.rotate(tilt, resample=Image.BICUBIC, expand=False)
        img.alpha_composite(v2, (int(x - v.width / 2), int(H * .80 - v.height + 20)))
        if tt < stop:
            lp = Pen(); [lp.l([(x - 450 - i * 30, H * .66 + i * 40), (x - 600 - i * 30, H * .66 + i * 40)], (255, 255, 255, 180), 6) for i in range(4)]
            img.alpha_composite(lp.out())
        if ctx.si == 1: z, cx, cy = 1.0 + .5 * min(1, ctx.u * 4), .78, .66
    elif sid in ("s05",):
        img = room_bg("evening").copy()
        put(img, ctx, "riya", 330, 1500, 900, "down", "neutral", look=1)
        put(img, ctx, "arjun", 640, 1290, 560, "hold", "neutral", True, look=0)
        img.alpha_composite(table_fg("evening"))
        img = glow(img, 880, 1080, 160, (90, 70, 20), .8)
        z = 1.0 + .05 * U
    elif sid == "s06":
        img = drawing_img(int(tt * 6) % 3, ctx.si == 1 and int(tt * 3) % 2 == 0).copy()
        z = 1.0 + .25 * U; cx, cy = .55, .45
    elif sid in ("s07", "s09"):
        img = library_bg().copy()
        exp = ["neutral", "sad"] if sid == "s07" else ["shock", "scared"]
        pose = "hold" if sid == "s07" else "cover"
        put(img, ctx, "riya", W / 2, 1340, 900, pose, exp, True)
        img.alpha_composite(libtable_fg())
        img = glow(img, 835, 1150, 200, (60, 90, 40), .7)
        if sid == "s09":   # paper slipping to the floor
            p = min(1, tt / 1.6); pp = Pen()
            px_, py_ = W / 2 + 160 * p, 1250 + 380 * p
            ang = p * 1.6
            pts = [(px_ + 120 * math.cos(ang + a) * (1 if i % 2 else .7), py_ + 80 * math.sin(ang + a)) for i, a in enumerate((0.6, 2.5, 3.7, 5.7))]
            pp.p(pts, (244, 236, 214), w=4); img.alpha_composite(pp.out())
            z, cx, cy = 1.0 + .35 * min(1, tt / 2.0), .5, .40
        else:
            z = 1.0 + .12 * U
    elif sid in ("s08", "s23"):
        hl = {"s08": [(0, 1), (0, 1), (0, 1, "drv")], "s23": [(), (0, 1), (2, 3, 4, 5, 6, 7, "miss")]}[sid][ctx.si]
        img = paper_bg(tuple(hl)).copy()
        z = 1.08 + .08 * U; cy = .40
    elif sid == "s10":
        img = room_bg("night").copy(); img.alpha_composite(bed_bg())
        put(img, ctx, "riya", 820, 1330, 620, "lap", ["neutral", "scared"], True, look=-1)
        img.alpha_composite(bed_fg())
        if ctx.si == 1:
            wp = Pen()
            for i in range(3):
                ph = (tt * 1.2 + i / 3) % 1
                wp.e(325 - ph * 140, 580 - ph * 140, 325 + ph * 140, 580 + ph * 140, None, ol=(180, 220, 255, int(200 * (1 - ph))), w=5)
            img.alpha_composite(wp.out())
        img = tint(img, (.85, .9, 1.1)); z = 1.0 + .06 * U; cx = .6
    elif sid in ("s11", "s12"):
        img = window_bg(sid == "s12").copy()
        img.alpha_composite(window_frame())
        a = np.asarray(img).astype(np.float32)
        fk = (.45 + .4 * U) if sid == "s11" else .85
        f = fog_layer(tt, 1)[..., None]
        a[..., :3] = a[..., :3] * (1 - fk * (.6 + .4 * f)) + 200 * fk * (.6 + .4 * f)
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        txt = ["నాన్నకి చెప్పు...", "ఆయన తప్పు", "కాదు..."]
        prog = 0 if sid == "s11" and ctx.si == 0 else (.15 * ctx.u if sid == "s11" else min(1, .15 + 1.1 * ctx.u))
        if prog > 0:
            m = Image.new("L", (W, H), 0); dm = ImageDraw.Draw(m)
            for i, ln in enumerate(txt): draw_text(dm, W / 2, 380 + i * 280, ln, 130, 255, F_TITLE)
            m = m.filter(ImageFilter.GaussianBlur(4))
            tot = prog * 3; wm = Image.new("L", (W, H), 0); dw = ImageDraw.Draw(wm)
            for i in range(3):
                fr = np.clip(tot - i, 0, 1)
                if fr > 0: dw.rectangle([0, 230 + i * 280, 90 + fr * (W - 180), 530 + i * 280], fill=255)
            m = Image.fromarray((np.asarray(m).astype(np.float32) * np.asarray(wm) / 255).astype(np.uint8))
            clear = window_bg(sid == "s12").copy(); clear.alpha_composite(window_frame())
            img = Image.composite(clear.convert("RGB"), img.convert("RGB"), m).convert("RGBA")
            if sid == "s12":
                dp = Pen()
                for i in range(10):
                    x = 200 + (i * 83) % 700; y0 = 420 + (i % 3) * 280; L_ = 40 + ((tt * 30 + i * 13) % 120)
                    dp.l([(x, y0), (x, y0 + L_)], (40, 50, 90, 180), 6)
                img.alpha_composite(dp.out())
        z = 1.0 + .05 * U
    elif sid in ("s13", "s17"):
        img = van_front_bg("dusk").copy()
        put(img, ctx, "riya", 850, 1150, 470, "lap", ["neutral", "sad"] if sid == "s13" else "sad", True, look=-1)
        put(img, ctx, "mohan", 420, 1330, 760, "wheel", ["neutral", "sad"] if sid == "s13" else ["cry", "sad"], True, look=1)
        img.alpha_composite(wheel_fg(400, 1560, 360))
        z = 1.0 + .06 * U; cx = .55
    elif sid in ("s14", "s16"):
        img = van_front_bg("dusk").copy()
        img = img.filter(ImageFilter.GaussianBlur(6))
        ex = {"s14": ["sad", "cry"], "s16": ["cry", "sad"]}[sid]
        put(img, ctx, "mohan", W / 2, 760, 1500, "wheel", ex, True, anchor="head", look=0)
        img.alpha_composite(wheel_fg(W // 2, 1640, 470))
        img = glow(img, W * .85, 300, 360, (110, 60, 20), .8)
        z = 1.0 + .06 * U; cy = .4
    elif sid == "s15":
        img = flash_bg().copy()
        if ctx.si <= 1:
            br = Pen(); br.r(-10, H * .50, W + 10, H * .54, (110, 100, 90), w=4)
            for x in (150, 540, 930): br.r(x - 24, H * .54, x + 24, H * .66, (110, 100, 90), w=4)
            img.alpha_composite(br.out())
            b = old_bus(); bx = int(W / 2 - b.width / 2 + 60 * math.sin(tt * .6))
            inner = Image.new("RGBA", b.size, (0, 0, 0, 0))
            sp, an = sprite("ymohan", "wheel", "happy", 0, ctx.blink("ymohan"), 260, True, 1)
            inner.alpha_composite(sp, (int(700 - an["head"][0]), int(105 - an["head"][1])))
            sp, an = sprite("ravi", "lap", "happy", 0, ctx.blink("ravi"), 230, True, -1)
            inner.alpha_composite(sp, (int(100 - an["head"][0]), int(105 - an["head"][1] + 4 * math.sin(tt * 6))))
            img.alpha_composite(inner, (bx, int(H * .50 - b.height + 40)))
            img.alpha_composite(b, (bx, int(H * .50 - b.height + 40)))
            if ctx.si == 1:
                wp = Pen(); [wp.e(bx + 60 - i * 40, int(H * .50 - b.height + 120) - i * 30, bx + 90 - i * 40, int(H * .50 - b.height + 150) - i * 30, None, ol=(255, 255, 255, 180), w=4) for i in range(3) if (tt * 3 + i) % 2 < 1]
                img.alpha_composite(wp.out())
            z = 1.0 + .1 * U
        elif ctx.si == 2:
            u = ctx.u
            br = Pen(); br.r(-10, H * .50, W * .42, H * .54, (110, 100, 90), w=4); br.r(W * .62, H * .50 + 30 * u, W + 10, H * .54 + 30 * u, (110, 100, 90), w=4)
            img.alpha_composite(br.out())
            b = old_bus().rotate(-35 * min(1, u * 1.5), expand=True, resample=Image.BICUBIC)
            img.alpha_composite(b, (int(W / 2 - b.width / 2), int(H * .40 - b.height / 2 + H * .25 * u ** 2)))
            wp = Pen(); wp.r(-10, H * .60, W + 10, H + 10, (60, 80, 100, 255), ol=None)
            for i in range(int(20 * u)):
                a_ = i * 0.6; wp.e(W / 2 + math.cos(a_) * 300 * u - 30, H * .60 - abs(math.sin(a_)) * 250 * u - 30, W / 2 + math.cos(a_) * 300 * u + 30, H * .60 - abs(math.sin(a_)) * 250 * u + 30, (200, 220, 240, 200), ol=None)
            img.alpha_composite(wp.out()); shake = 10 * (1 - u)
        else:   # underwater: two hands slipping apart
            u = ctx.u
            img = vgrad((40, 70, 100), (10, 20, 40))
            hp = Pen()
            ax, ay = W / 2, 760; kx, ky = W / 2 + 20, 900 + 520 * u ** 1.5
            hp.l([(ax, -20), (ax, ay)], CH["ymohan"]["shirt"], 90); hp.e(ax - 70, ay - 40, ax + 70, ay + 90, CH["ymohan"]["skin"], w=6)
            hp.l([(kx, ky + 60), (kx, H + 50)], CH["ravi"]["shirt"], 60); hp.e(kx - 50, ky - 40, kx + 50, ky + 70, CH["ravi"]["skin"], w=6)
            for i in range(14):
                bx_ = W / 2 + 200 * math.sin(i * 2.1); by_ = (H - (tt * 200 + i * 140) % H)
                hp.e(bx_ - 10 - i % 3 * 5, by_ - 10, bx_ + 10 + i % 3 * 5, by_ + 10, None, ol=(200, 230, 255, 160), w=3)
            img.alpha_composite(hp.out())
        img = sepia(img); rain(img, tt, .9)
        a = np.asarray(img).astype(np.float32); a[..., :3] += np.random.default_rng(int(tt * 24)).normal(0, 10, (H, W, 1))
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    elif sid in ("s18", "s21"):
        img = lake_frame(tt)
        if sid == "s18":
            stop = sc["seg"][0]["t0"] + sc["seg"][0]["dur"]
            p = min(1, tt / stop); x = W + 500 - (W / 2 + 500 + 120) * (1 - (1 - p) ** 2.2)
            v = van_with_people(False, "mohan", "sad", 0, ctx.blink("mohan"), glass=(200, 140, 120))
            v = v.transpose(Image.FLIP_LEFT_RIGHT)
            img.alpha_composite(v, (int(x - v.width / 2 + 120), int(H * .76 - v.height + 30)))
            z = 1.0 + .05 * U
        else:
            v = van_with_people(True, "mohan", "cry", 0, ctx.blink("mohan"), glass=(200, 140, 120))
            vx, vy = -60, int(H * .76 - v.height + 30)
            img.alpha_composite(v, (vx, vy))
            pts = [(vx + 400 + i * 70, H * .80 - i * 14, 1 - i * .04) for i in range(9)]
            footprints(img, pts, min(1, U * 1.6))
            gp = min(1, U * 1.5); gx = vx + 400 + gp * 600; gy = H * .80 - gp * 120
            alpha = 1 - max(0, (U - .75) / .25)
            put(img, ctx, "ravi", gx, gy, 420 * (1 - .25 * gp), "wave" if U > .55 else "down", "happy", ghost=True, alpha=alpha, flip=True)
            z = 1.0 + .05 * U
        img = glow(img, W * .79, H * .58, 60, (255, 200, 100), .9)
    elif sid == "s20":
        img, oy = van_side(tt, "dusk", "lake", 0)
        kids_row(img, ctx, [("arjun", 120, SEAT_Y, 440, dict(pose="lap", expr=["neutral", "happy", "happy"], look=1)),
                            ("riya", 330, SEAT_Y, 560, dict(pose="lap", expr=["sad", "cry", "happy"], look=1))])
        put(img, ctx, "mohan", 600, 1760, 1050, "hug", ["cry", "cry", "happy"], look=1)
        put(img, ctx, "ravi", 840, 1720, 760, "hug", "happy", ghost=True, flip=True)
        img = glow(img, 790, 1300, 260, (60, 80, 120), .8)
        z = 1.0 + .06 * U; cx, cy = .55, .55
    elif sid == "s22":
        img, oy = van_side(tt, "morning", "morning", 220)
        kids = [("kid1", 330), ("arjun", 448), ("kid2", 566), ("riya", 690), ("kid3", 814), ("kid4", 932), ("kid5", 1048)]
        counted = int(ctx.u * 7.4) if ctx.si == 1 else (7 if ctx.si == 2 else 0)
        for i, (who, x) in enumerate(kids):
            hh = 420 if who == "arjun" else 490
            bump = -18 if (ctx.si == 1 and i == counted - 1) else 0
            put(img, ctx, who, x, SEAT_Y + oy + bump, hh, "lap", "happy", True, look=-1)
            if i < counted:
                sp = Pen(); sx_, sy_ = x, SEAT_Y + oy - hh * .78 - 40
                sp.p([(sx_ + 34 * math.cos(a_ * math.pi / 5 - math.pi / 2) * (1 if k_ % 2 == 0 else .45), sy_ + 34 * math.sin(a_ * math.pi / 5 - math.pi / 2) * (1 if k_ % 2 == 0 else .45)) for k_, a_ in enumerate(range(10))], (255, 210, 60), w=3)
                img.alpha_composite(sp.out())
        put(img, ctx, "mohan", 120, 1740, 900, "pointstand" if ctx.si == 1 else "down", "happy", look=1)
        z = 1.0 + .04 * U
    elif sid == "s24":
        img, oy = van_side(tt, "dark", "night", 200)
        kids_row(img, ctx, [("arjun", 100, SEAT_Y + oy, 440, dict(pose="lap", expr="scared", look=1)),
                            ("riya", 250, SEAT_Y + oy, 560, dict(pose=["lap", "lap", "cover"], expr=["scared", "scared", "shock"], look=1))])
        xs = [390, 520, 650, 780, 910, 1040]
        wetk = [np.clip(ctx.u * 7 - i, 0, 1) if ctx.si == 2 else 0 for i in range(6)]
        for i, x in enumerate(xs): wet_patch(img, x, SEAT_Y + oy - 4, 120, wetk[i])
        drops(img, tt, (380, 1050), SEAT_Y + 40, SEAT_Y + 240, n=int(4 + 14 * sum(wetk) / 6), seed=4)
        rp = Pen()                                          # radio on the wall
        rp.r(820, 380, 1040, 500, (90, 60, 50), rad=16, w=5); rp.e(850, 400, 930, 480, (40, 30, 30), w=4)
        rp.r(950, 410, 1020, 450, (255, 220, 120) if tt > sc["seg"][0]["t0"] + .5 else (60, 60, 60), rad=6, w=3)
        if tt > sc["seg"][0]["t0"] + .5:
            for i in range(5):
                ph = (tt * .4 + i / 5) % 1
                note_shape(rp, 900 - ph * 500 + 40 * math.sin(tt * 3 + i), 380 - ph * 220, 18, (255, 220, 120, int(255 * (1 - ph))))
        img.alpha_composite(rp.out())
        if tt > sc["dur"] - 2.0 and (int(tt * 8) % 3 != 0):
            for i, x in enumerate(xs): put(img, ctx, ["kid1", "kid2", "kid3", "kid4", "kid5", "kid2"][i], x, SEAT_Y + oy, 470, "lap", "sad", True, ghost=True, alpha=.7)
        if ctx.si == 2: z, cx, cy = 1.0 + .25 * ctx.u, .62, .62
        if random.random() < .06: img = tint(img, (.6, .6, .7))
    else:
        img = vgrad((10, 10, 14), (2, 2, 4))
    img = camera(img, z, cx, cy, shake, tt)
    special = sid in ("s01", "s25")
    caption(img, ctx, special)
    fa = min(1, tt / .3, (sc["dur"] - tt) / .3)
    if fa < 1: img = tint(img, (fa, fa, fa))
    return img.convert("RGB")

# ================================================================ render
def render_scene(i):
    sc = TL[i]; n = int(round(sc["dur"] * FPS)); out = f"{WORK}/{sc['id']}.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    random.seed(i)
    for k in range(n):
        p.stdin.write(compose(sc, k / FPS).tobytes())
    p.stdin.close(); p.wait()
    return out

# ================================================================ audio
def synth_audio():
    N = int(TOTAL * SR) + SR
    tt = np.arange(N) / SR
    voice = np.zeros(N, np.float32); music = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
    r = np.random.default_rng(3)
    # soft spooky-cartoon bed: low pad + slow music-box melody
    lfo = .6 + .4 * np.sin(2 * np.pi * tt / 11)
    music += (.5 * np.sin(2 * np.pi * 55 * tt) + .3 * np.sin(2 * np.pi * 82.4 * tt) + .15 * np.sin(2 * np.pi * 110 * tt)) * lfo
    mel = [659, 587, 523, 494, 523, 440, 494, 392]
    for j in range(int(TOTAL / 1.6)):
        f = mel[j % len(mel)]; a = int(j * 1.6 * SR); n = int(1.5 * SR)
        if a + n < N:
            e = np.exp(-np.arange(n) / SR * 3)
            music[a:a + n] += .18 * (np.sin(2 * np.pi * f * np.arange(n) / SR) + .3 * np.sin(2 * np.pi * 2 * f * np.arange(n) / SR)) * e
    def add(buf, at, sig, g=1.0):
        a = int(at * SR); b = min(N, a + len(sig))
        if 0 <= a < N: buf[a:b] += sig[:b - a] * g
    def drip():
        n = int(.18 * SR); x = np.arange(n) / SR; f = 1400 * np.exp(-x * 12) + 500
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 28)
    def windn(d):
        n = int(d * SR); w = np.convolve(r.standard_normal(n), np.ones(60) / 60, "same") * 4
        return w * np.sin(np.linspace(0, np.pi, n)) ** 2
    def step():
        n = int(.3 * SR); x = np.arange(n) / SR
        return (np.sin(2 * np.pi * 70 * x) * 1.2 + np.convolve(r.standard_normal(n), np.ones(20) / 20, "same") * 2 * np.exp(-x * 10)) * np.exp(-x * 14)
    def sting(soft=False):
        n = int(3.5 * SR); x = np.arange(n) / SR
        s = (np.sin(2 * np.pi * 40 * x) + .6 * np.sin(2 * np.pi * 233 * x) + .5 * np.sin(2 * np.pi * 247 * x) + .3 * np.sin(2 * np.pi * 311 * x)) * np.exp(-x * 1.2)
        s[:200] *= np.linspace(0, 1, 200); return s * (.45 if soft else 1)
    def chime():
        n = int(4 * SR); x = np.arange(n) / SR
        return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * (1.2 + j * .4)) for j, f in enumerate([523, 659, 784, 1046])) * .35
    def whoosh():
        n = int(1.6 * SR); w = np.convolve(r.standard_normal(n), np.ones(15) / 15, "same") * 3
        return w * np.sin(np.linspace(0, np.pi, n)) ** 3
    def crickets(d):
        n = int(d * SR); x = np.arange(n) / SR
        return np.sin(2 * np.pi * 4200 * x) * (np.sin(2 * np.pi * 30 * x) > .6) * (np.sin(2 * np.pi * .9 * x) > 0) * .12
    def rise(d):
        n = int(d * SR); x = np.arange(n) / SR
        return np.sin(2 * np.pi * (60 + 40 * x / d) * x) * (x / d) ** 2 * 1.2
    def whistle(k=2):
        out = []
        for j in range(k):
            n = int(.32 * SR); x = np.arange(n) / SR; f = 2300 + 120 * np.sin(2 * np.pi * 38 * x)
            out += [np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** .5, np.zeros(int(.18 * SR))]
        return np.concatenate(out) * .5
    def brake():
        n = int(1.4 * SR); x = np.arange(n) / SR
        return np.sin(2 * np.pi * (1800 - 500 * x) * x) * np.exp(-x * 1.5) * .4 + np.convolve(r.standard_normal(n), np.ones(30) / 30, "same") * 2 * np.exp(-x * 2)
    def rainn(d):
        n = int(d * SR); x = r.standard_normal(n)
        return (x - np.convolve(x, np.ones(8) / 8, "same")) * .35 * np.sin(np.linspace(0, np.pi, n)) ** .3
    def radio(d):
        n = int(d * SR); x = np.arange(n) / SR
        st = r.standard_normal(n) * .5 * (.6 + .4 * np.sin(2 * np.pi * .7 * x)); tone = np.zeros(n)
        mel2 = [523, 587, 659, 523, 659, 698, 784, 0]
        for j in range(int(d / .45)):
            f = mel2[j % len(mel2)]; a_ = int(j * .45 * SR); b_ = min(n, a_ + int(.4 * SR))
            if f: tone[a_:b_] += np.sin(2 * np.pi * f * x[:b_ - a_]) * np.sin(np.linspace(0, np.pi, b_ - a_))
        return st * .5 + tone * .45 * (x / d)
    for sc in TL:
        s0 = sc["start"]
        for sg in sc["seg"]:
            with wave.open(f"{VO}/{sc['id']}_{sc['seg'].index(sg)}.wav") as wf_:
                w = np.frombuffer(wf_.readframes(wf_.getnframes()), np.int16).astype(np.float32) / 32768
            add(voice, s0 + sg["t0"], w)
        last = sc["seg"][-1]; ve = s0 + last["t0"] + last["dur"]
        for fx in sc["sfx"]:
            if fx == "drips":
                for x in np.arange(s0 + .3, s0 + sc["dur"], .75): add(sfx, x + r.random() * .3, drip(), .35)
            elif fx == "wind": add(sfx, s0, windn(sc["dur"]), .5)
            elif fx == "footsteps":
                for j in range(6): add(sfx, s0 + sc["seg"][1]["t0"] + j * .62, step(), .7)
            elif fx == "sting": add(sfx, s0 + (sc["dur"] - 2.6 if sc["id"] == "s24" else .1), sting(), .5)
            elif fx == "sting_soft": add(sfx, ve - 1.5, sting(True), .5)
            elif fx == "chime": add(sfx, s0 + sc["seg"][1]["t0"], chime(), .4)
            elif fx == "whoosh": add(sfx, s0, whoosh(), .6)
            elif fx == "crickets": add(sfx, s0, crickets(sc["dur"]), 1)
            elif fx == "drone_rise": add(sfx, s0, rise(sc["dur"]), .5)
            elif fx == "whistle": add(sfx, s0 + sc["seg"][-1]["t0"] + (sc["seg"][-1]["dur"] * .6 if sc["id"] == "s06" else 0), whistle(), .6)
            elif fx == "whistle2":
                sg = sc["seg"][1]
                for x in (sg["t0"] + sg["dur"] * .35, sg["t0"] + sg["dur"] * .7, sg["t0"] + sg["dur"] + .1): add(sfx, s0 + x, whistle(1), .55)
            elif fx == "brake": add(sfx, s0 + sc["seg"][0]["t0"] + sc["seg"][0]["dur"] * .75, brake(), .6)
            elif fx == "rain": add(sfx, s0, rainn(sc["dur"]), .5)
            elif fx == "radio": add(sfx, s0 + sc["seg"][0]["t0"] + .6, radio(sc["dur"] - 1.2), .45)
    def norm(x, peak): return x / (np.abs(x).max() + 1e-9) * peak
    voice = norm(voice, .92); music = norm(music, .10); sfx = norm(sfx, .40)
    duck = np.convolve((np.abs(voice) > .02).astype(np.float32), np.ones(SR // 4) / (SR // 4), "same")
    mix = voice + music * (1 - .5 * np.clip(duck, 0, 1)) + sfx
    fade = int(2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(f"{WORK}/mix.wav", "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())

def stills():
    ims = []
    for sc in TL:
        ims.append(compose(sc, sc["dur"] * .62).resize((216, 384)))
    cols = 7; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (216 * cols, 384 * rows))
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 216, (i // cols) * 384))
    sheet.save(f"{WORK}/stills.png")

if __name__ == "__main__":
    print(f"total {TOTAL:.1f}s, scenes {len(TL)}")
    json.dump([dict(id=x["id"], start=x["start"], dur=x["dur"]) for x in TL], open(f"{WORK}/timeline.json", "w"), indent=1)
    if os.environ.get("STILLS"):
        stills(); sys.exit(0)
    only = os.environ.get("ONLY")
    idx = [i for i, x in enumerate(TL) if not only or x["id"] in only.split(",")]
    if not only: synth_audio()
    with Pool(4) as pool:
        segs = pool.map(render_scene, idx)
    if only: sys.exit(0)
    with open(f"{WORK}/list.txt", "w") as f:
        for i in range(len(TL)): f.write(f"file '{WORK}/{TL[i]['id']}.mp4'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{WORK}/list.txt", "-i", f"{WORK}/mix.wav",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], check=True)
    print("done", OUT)
