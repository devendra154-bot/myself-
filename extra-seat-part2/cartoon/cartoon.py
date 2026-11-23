"""The Extra Seat: Part 2 — 2D cartoon with Telugu voice-over and Telugu captions.
Usage:
  python3 cartoon.py <vo_dir> <work_dir> stills            -> contact sheet of scene midpoints
  python3 cartoon.py <vo_dir> <work_dir> render <out_dir>  -> 4 parts (72 s each) + full video
"""
import sys, os, math, random, wave, subprocess
from functools import lru_cache
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from script_te import SCENES
from cast import place, sprite, INK

VO, WORK, MODE = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(WORK, exist_ok=True)
W, H, FPS, SR = 1080, 1920, 30, 44100
CW, CH = 1188, 2112                       # drawing canvas (10% larger for camera moves)
PART_LEN = 72.0
F_TE = "/usr/share/fonts/truetype/noto/NotoSansTelugu-Bold.ttf"
F_TITLE = "/usr/share/fonts/truetype/teluguvijayam/ramabhadra.ttf"
F_HAND = "/usr/share/fonts/truetype/teluguvijayam/ramabhadra.ttf"
F_SERIF = "/usr/share/fonts/truetype/noto/NotoSerifTelugu-Regular.ttf"
F_EN = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
font = lru_cache(None)(lambda p, s: ImageFont.truetype(p, s))
SPK_COL = {"n": (255, 255, 255), "a": (255, 222, 92), "r": (255, 176, 206), "o": (255, 196, 128), "l": (150, 240, 255)}
NO_CAPTION = {"s01", "s08", "s23"}
PAUSE_WEIGHT = {"s06": 3, "s08": 3, "s10": 2, "s15": 3, "s16": 3, "s18": 2, "s21": 3, "s22": 4, "s23": 3}


def wav_read(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


# ============================================================== timeline
def build_timeline():
    clips = {}
    for s in SCENES:
        for i in range(len(s["lines"])):
            clips[(s["id"], i)] = wav_read(f"{VO}/{s['id']}_{i:02d}.wav")
    LEAD, GAP = 0.45, 0.30
    tl = []
    for p in (1, 2, 3, 4):
        ss = [s for s in SCENES if s["part"] == p]
        base = sum(LEAD + sum(len(clips[(s["id"], i)]) / SR for i in range(len(s["lines"]))) + GAP * (len(s["lines"]) - 1) + s["pause"] for s in ss)
        slack = PART_LEN - base
        assert slack >= 0, f"part {p} too long by {-slack:.2f}s"
        ngaps = sum(len(s["lines"]) - 1 for s in ss)
        gap_add = min(0.35, slack * 0.35 / max(ngaps, 1))
        rest = slack - gap_add * ngaps
        wsum = sum(PAUSE_WEIGHT.get(s["id"], 1) for s in ss)
        t = (p - 1) * PART_LEN
        for s in ss:
            sc = dict(s, start=t, lines_t=[])
            lt = t + LEAD
            for i, (spk, text) in enumerate(s["lines"]):
                d = len(clips[(s["id"], i)]) / SR
                sc["lines_t"].append((lt, lt + d, spk, text))
                lt += d + (GAP + gap_add if i < len(s["lines"]) - 1 else 0)
            end = lt + s["pause"] + rest * PAUSE_WEIGHT.get(s["id"], 1) / wsum
            sc["dur"] = end - t
            tl.append(sc); t = end
    return tl, clips


TL, CLIPS = build_timeline()
NFRAMES = int(round(4 * PART_LEN * FPS))

# mouth envelopes per speaker (per global frame)
MOUTH = {k: np.zeros(NFRAMES + 10, np.float32) for k in SPK_COL}
for sc in TL:
    for i, (a, b, spk, text) in enumerate(sc["lines_t"]):
        x = CLIPS[(sc["id"], i)]
        hop = SR // FPS
        n = len(x) // hop
        rms = np.sqrt(np.array([np.mean(x[k * hop:(k + 1) * hop] ** 2) for k in range(n)]) + 1e-12)
        ref = np.percentile(rms, 90) + 1e-6
        m = np.clip((rms / ref - 0.18) / 0.8, 0, 1)
        f0 = int(round(a * FPS))
        MOUTH[spk][f0:f0 + n] = np.maximum(MOUTH[spk][f0:f0 + n], m[:len(MOUTH[spk][f0:f0 + n])])


def mouth(spk, f):
    v = MOUTH[spk][f]
    return 0.0 if v < 0.15 else (0.4 if v < 0.45 else (0.7 if v < 0.75 else 1.0))


def blink(f, seed):
    per = int(FPS * (3.0 + (seed % 5) * 0.41))
    return ((f + seed * 37) % per) < 4


ease = lambda x: x * x * (3 - 2 * x)
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
seg = lambda t, a, b: clamp((t - a) / max(b - a, 1e-6))


# ============================================================== painting helpers (2x supersampled)
class BG:
    def __init__(s, top, bot=None, k=2):
        s.k = k
        bot = bot or top
        a = np.linspace(0, 1, CH * k)[:, None, None]
        arr = np.array(top, np.float32)[None, None] * (1 - a) + np.array(bot, np.float32)[None, None] * a
        s.img = Image.fromarray(np.repeat(arr, CW * k, 1).astype(np.uint8)).convert("RGBA")
        s.d = ImageDraw.Draw(s.img)

    def _p(s, pts): return [(x * s.k, y * s.k) for x, y in pts]
    def _b(s, b): return [b[0] * s.k, b[1] * s.k, b[2] * s.k, b[3] * s.k]
    def rect(s, b, fill, ol=True, w=4): s.d.rectangle(s._b(b), fill=fill, outline=INK if ol else None, width=w * s.k if ol else 0)
    def rrect(s, b, r, fill, ol=True, w=4): s.d.rounded_rectangle(s._b(b), radius=r * s.k, fill=fill, outline=INK if ol else None, width=w * s.k if ol else 0)
    def ell(s, b, fill, ol=True, w=4): s.d.ellipse(s._b(b), fill=fill, outline=INK if ol else None, width=w * s.k if ol else 0)
    def poly(s, pts, fill, ol=True, w=4): s.d.polygon(s._p(pts), fill=fill, outline=INK if ol else None, width=w * s.k if ol else 0)
    def line(s, pts, fill=INK, w=4): s.d.line(s._p(pts), fill=fill, width=int(w * s.k), joint="curve")
    def text(s, xy, txt, fnt, size, fill, anchor="mm", stroke=0, sfill=INK):
        s.d.text((xy[0] * s.k, xy[1] * s.k), txt, font=font(fnt, size * s.k), fill=fill, anchor=anchor, stroke_width=stroke * s.k, stroke_fill=sfill)
    def glow(s, cx, cy, r, col, a=0.8):
        g = radial(int(r * s.k), col, a)
        s.img.alpha_composite(g, (int(cx * s.k - r * s.k), int(cy * s.k - r * s.k)))
    def done(s):
        return s.img.resize((CW, CH), Image.LANCZOS)


@lru_cache(None)
def radial(r, col, a=0.8):
    y, x = np.ogrid[-r:r, -r:r]
    d = np.sqrt(x * x + y * y) / r
    al = np.clip(1 - d, 0, 1) ** 2 * 255 * a
    arr = np.zeros((2 * r, 2 * r, 4), np.uint8); arr[..., :3] = col; arr[..., 3] = al.astype(np.uint8)
    return Image.fromarray(arr)


def stars(b, n, ymax, seed=1):
    rr = random.Random(seed)
    for _ in range(n):
        x, y, s_ = rr.random() * CW, rr.random() * ymax, rr.choice([2, 2, 3, 4])
        b.ell([x - s_, y - s_, x + s_, y + s_], (255, 250, 220, 255), ol=False)


def tree(b, x, y, s_, col=(40, 90, 70, 255)):
    b.rect([x - 10 * s_, y - 120 * s_, x + 10 * s_, y], (90, 60, 40, 255))
    b.ell([x - 70 * s_, y - 250 * s_, x + 70 * s_, y - 100 * s_], col)


def house(b, x, y, w, h, wall, roof, win=(255, 210, 120, 255), door=True):
    b.rect([x, y - h, x + w, y], wall)
    b.poly([(x - 20, y - h), (x + w / 2, y - h - w * 0.45), (x + w + 20, y - h)], roof)
    b.rect([x + w * 0.15, y - h * 0.75, x + w * 0.4, y - h * 0.45], win)
    if door:
        b.rect([x + w * 0.58, y - h * 0.6, x + w * 0.82, y], (110, 70, 50, 255))


def van_side(b, x, y, s_=1.0, lit=True, face=False):
    """Yellow school van, side view; (x,y) = rear-bottom-left corner on the road."""
    L, Hh = 720 * s_, 330 * s_
    b.rrect([x, y - Hh - 60 * s_, x + L, y - 60 * s_], int(50 * s_), (250, 196, 40, 255))
    b.poly([(x + L - 10 * s_, y - Hh - 40 * s_), (x + L + 90 * s_, y - Hh * 0.45), (x + L + 90 * s_, y - 60 * s_), (x + L - 10 * s_, y - 60 * s_)], (250, 196, 40, 255))
    b.rect([x, y - 150 * s_, x + L + 90 * s_, y - 120 * s_], (30, 30, 34, 255), ol=False)
    for i in range(4):
        wx = x + 40 * s_ + i * 150 * s_
        b.rrect([wx, y - Hh - 30 * s_, wx + 120 * s_, y - Hh + 80 * s_], int(14 * s_), (150, 200, 230, 255) if lit else (40, 60, 90, 255))
    b.poly([(x + L + 10 * s_, y - Hh - 20 * s_), (x + L + 70 * s_, y - Hh * 0.5), (x + L + 10 * s_, y - Hh * 0.5)], (150, 200, 230, 255) if lit else (40, 60, 90, 255))
    b.text((x + L * 0.45, y - 185 * s_), "స్కూల్ వ్యాన్", F_TE, int(46 * s_), (30, 30, 34, 255))
    for wx in (x + 130 * s_, x + L - 40 * s_):
        b.ell([wx - 70 * s_, y - 130 * s_, wx + 70 * s_, y + 10 * s_], (30, 30, 34, 255))
        b.ell([wx - 30 * s_, y - 90 * s_, wx + 30 * s_, y - 30 * s_], (170, 170, 180, 255))
    if face:  # faint face in the back window (callback to Part 1)
        fx, fy = x + 100 * s_, y - Hh + 25 * s_
        b.ell([fx - 34 * s_, fy - 40 * s_, fx + 34 * s_, fy + 40 * s_], (200, 240, 255, 150), ol=False)
        b.ell([fx - 18 * s_, fy - 10 * s_, fx - 6 * s_, fy + 4 * s_], (20, 30, 40, 220), ol=False)
        b.ell([fx + 6 * s_, fy - 10 * s_, fx + 18 * s_, fy + 4 * s_], (20, 30, 40, 220), ol=False)


# ---------------------------------------------------------------- van interior
VPX, VPY = 594, 860
vx = lambda xw, z: VPX + xw * z
vy = lambda yw, z: VPY + yw * z
ROWS = [0.36, 0.46, 0.62]
BACK_Z = 0.28
SEATS = {  # name: (row z, xw)
    "k5": (0.36, 190), "k2": (0.46, -430), "k3": (0.46, -190), "k4": (0.46, 300),
    "k1": (0.62, -430), "arjun": (0.62, -190), "riya": (0.62, 190),
}
EXTRA_SEAT = (0.62, 430)


def bench(b, z, full=False, col=(150, 58, 52, 255)):
    k = 0.6 + 0.4 * z / 0.62
    c = tuple(int(v * k) for v in col[:3]) + (255,)
    c2 = tuple(min(255, int(v * k * 1.18)) for v in col[:3]) + (255,)
    spans = [(-560, 560)] if full else [(-560, -80), (80, 560)]
    for a, bb in spans:
        b.rrect([vx(a, z), vy(220, z), vx(bb, z), vy(660, z)], int(40 * z), c)
        b.rrect([vx(a + 20, z), vy(250, z), vx(bb - 20, z), vy(330, z)], int(30 * z), c2, ol=False)
        b.poly([(vx(a - 10, z), vy(640, z)), (vx(bb + 10, z), vy(640, z)), (vx(bb + 30, z), vy(720, z)), (vx(a - 30, z), vy(720, z))], c2)


def van_static(mood="day"):
    sky = {"day": ((120, 190, 235), (200, 230, 245)), "cold": ((60, 90, 130), (110, 140, 170))}[mood]
    b = BG((70, 60, 66) if mood == "day" else (40, 40, 52), (36, 30, 34))
    # ceiling and floor
    b.poly([(0, 0), (CW, 0), (vx(560, BACK_Z), vy(-420, BACK_Z)), (vx(-560, BACK_Z), vy(-420, BACK_Z))], (226, 220, 206, 255) if mood == "day" else (130, 132, 140, 255))
    b.poly([(0, CH), (CW, CH), (vx(560, BACK_Z), vy(1050, BACK_Z)), (vx(-560, BACK_Z), vy(1050, BACK_Z))], (88, 84, 90, 255))
    b.poly([(vx(-70, 1.4), CH), (vx(70, 1.4), CH), (vx(40, BACK_Z), vy(1050, BACK_Z)), (vx(-40, BACK_Z), vy(1050, BACK_Z))], (60, 56, 62, 255), ol=False)
    # side windows
    for side in (-1, 1):
        for z0, z1 in ((1.3, 0.75), (0.7, 0.5), (0.48, 0.37), (0.35, 0.29)):
            pts = [(vx(side * 600, z0), vy(-380, z0)), (vx(side * 600, z1), vy(-380, z1)), (vx(side * 600, z1), vy(150, z1)), (vx(side * 600, z0), vy(150, z0))]
            b.poly(pts, sky[0] + (255,))
            b.poly([pts[0], pts[1], (pts[1][0], (pts[1][1] + pts[2][1]) / 2), (pts[0][0], (pts[0][1] + pts[3][1]) / 2)], sky[1] + (255,), ol=False)
    # back window + back bench
    b.rrect([vx(-450, BACK_Z), vy(-360, BACK_Z), vx(450, BACK_Z), vy(120, BACK_Z)], 20, sky[0] + (255,))
    bench(b, BACK_Z, full=True)
    return b.done()


@lru_cache(None)
def van_layers(mood="day"):
    bg = van_static(mood)
    rows = {}
    for z in ROWS:
        b = BG((0, 0, 0)); b.img.putalpha(0); bench(b, z); rows[z] = b.done()
    b = BG((0, 0, 0)); b.img.putalpha(0)
    z = 0.98
    for a, bb in ((-600, -90), (90, 600)):
        b.rrect([vx(a, z), vy(420, z), vx(bb, z), vy(1300, z)], 50, (120, 48, 44, 255))
        b.rrect([vx(a + 30, z), vy(450, z), vx(bb - 30, z), vy(540, z)], 40, (150, 60, 54, 255), ol=False)
    front = b.done()
    return bg, rows, front


def draw_van(cv, ctx, kids, extra=None, arjun_stand=None, back_puddle=False):
    """kids: {name: dict(expr, look, pose, m)}; draws rows far->near with occlusion."""
    bg, rows, front = van_layers(ctx.get("mood", "day"))
    cv.alpha_composite(bg)
    f = ctx["f"]
    if back_puddle:
        draw_puddle(cv, vx(-40, BACK_Z), vy(660, BACK_Z), 120, 22, f)
        drips(cv, f, vx(-60, BACK_Z), vx(60, BACK_Z), vy(700, BACK_Z), vy(1050, BACK_Z), n=5, seed=2)
    for z in ROWS:
        cv.alpha_composite(rows[z])
        for n, (zz, xw) in SEATS.items():
            if zz != z or n not in kids:
                continue
            k = kids[n]
            bob = math.sin(f * 0.21 + hash(n) % 7) * 2
            place(cv, n, vx(xw + k.get("dx", 0), z), vy(650, z) + bob, 1000 * z * 0.98, sit=True, pose=k.get("pose", "down"),
                  expr=k.get("expr", "neutral"), m=k.get("m", 0.0), blink=blink(f, hash(n) % 97), look=k.get("look", 0.0), lookv=k.get("lookv", 0.0))
        if extra and extra[0] == z:
            extra[1](cv, z)
    cv.alpha_composite(front)
    if arjun_stand:
        arjun_stand(cv)


def draw_puddle(cv, cx, cy, rx, ry, f):
    L = Image.new("RGBA", (int(rx * 2 + 20), int(ry * 2 + 20)), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    d.ellipse([10, 10, 10 + rx * 2, 10 + ry * 2], fill=(110, 170, 220, 200), outline=(60, 110, 160, 255), width=3)
    sh = (f * 2) % int(rx)
    d.ellipse([10 + rx * 0.4 + sh * 0.2, 10 + ry * 0.4, 10 + rx * 0.9 + sh * 0.2, 10 + ry * 0.8], fill=(220, 240, 255, 160))
    cv.alpha_composite(L, (int(cx - rx - 10), int(cy - ry - 10)))


def drips(cv, f, x0, x1, y0, y1, n=6, seed=1, ripple=True):
    rr = random.Random(seed)
    d = ImageDraw.Draw(cv)
    for i in range(n):
        x = rr.uniform(x0, x1); ph = rr.random(); sp = rr.uniform(0.7, 1.2)
        u = ((f / FPS) * sp * 0.9 + ph) % 1.0
        y = y0 + (y1 - y0) * (u ** 1.6)
        d.ellipse([x - 7, y - 16, x + 7, y + 8], fill=(150, 205, 245, 255), outline=(40, 80, 120, 255), width=2)
        if ripple and u > 0.85:
            rr_ = (u - 0.85) / 0.15 * 40
            d.ellipse([x - rr_, y1 - rr_ * 0.3, x + rr_, y1 + rr_ * 0.3], outline=(170, 215, 245, 200), width=3)


def fog_layer(alpha, seed=3):
    @lru_cache(None)
    def base(sd):
        rng = np.random.default_rng(sd)
        n = rng.random((40, 24)).astype(np.float32)
        img = Image.fromarray((n * 255).astype(np.uint8)).resize((CW * 2, CH), Image.BICUBIC).filter(ImageFilter.GaussianBlur(50))
        return np.asarray(img).astype(np.float32) / 255
    return base(seed)


FOG = None


def fog(cv, f, strength=0.35, col=(200, 215, 230)):
    global FOG
    if FOG is None:
        FOG = fog_layer(1)
    off = int(f * 1.2) % CW
    a = FOG[:, off:off + CW]
    arr = np.zeros((CH, CW, 4), np.uint8)
    arr[..., :3] = col; arr[..., 3] = np.clip(a * 255 * strength * 1.6, 0, 255).astype(np.uint8)
    cv.alpha_composite(Image.fromarray(arr))


def overlay(cv, col, a):
    if a <= 0.003:
        return
    cv.alpha_composite(Image.new("RGBA", cv.size, col + (int(255 * clamp(a)),)))


def lamp_flame(cv, x, y, s_, f, k=1.0):
    if k <= 0.02:
        return
    fl = 1 + 0.12 * math.sin(f * 0.9) * math.sin(f * 0.37)
    g = radial(int(220 * s_ * k * fl), (255, 170, 70), 0.75)
    cv.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))
    d = ImageDraw.Draw(cv)
    h = 46 * s_ * k * fl
    d.ellipse([x - 13 * s_ * k, y - h, x + 13 * s_ * k, y + 10 * s_], fill=(255, 210, 90, 255))
    d.ellipse([x - 6 * s_ * k, y - h * 0.5, x + 6 * s_ * k, y + 6 * s_], fill=(255, 250, 220, 255))


def sparkles(cv, f, cx, cy, spread, n=14, rise=True, seed=5, a=1.0):
    rr = random.Random(seed)
    d = ImageDraw.Draw(cv)
    for i in range(n):
        ph = rr.random(); sp = rr.uniform(0.4, 1.0)
        u = ((f / FPS) * sp * 0.4 + ph) % 1.0
        x = cx + rr.uniform(-spread, spread) + math.sin(u * 6 + i) * 20
        y = cy + rr.uniform(-spread, spread) * 0.6 - (u * 300 if rise else 0)
        s_ = 6 + 6 * math.sin(u * math.pi)
        al = int(255 * a * math.sin(u * math.pi))
        d.polygon([(x, y - s_ * 2), (x + s_ * 0.5, y - s_ * 0.5), (x + s_ * 2, y), (x + s_ * 0.5, y + s_ * 0.5), (x, y + s_ * 2), (x - s_ * 0.5, y + s_ * 0.5), (x - s_ * 2, y), (x - s_ * 0.5, y - s_ * 0.5)], fill=(220, 250, 255, al))


# ============================================================== scenes
STATIC = {}


def static(name, fn):
    if name not in STATIC:
        STATIC[name] = fn()
    return STATIC[name]


def ln(ctx, i):  # (start, end) of line i in scene time
    a, b, *_ = ctx["lines"][i]
    return a, b


def bg_title():
    b = BG((10, 14, 34), (30, 24, 48))
    stars(b, 90, 1100)
    b.ell([820, 220, 980, 380], (250, 246, 220, 255), ol=False)
    b.rect([0, 1500, CW, CH], (36, 36, 44, 255), ol=False)
    b.rect([0, 1480, CW, 1510], (70, 70, 80, 255), ol=False)
    for i in range(6):
        house(b, -40 + i * 220, 1480, 180, 260 + (i % 3) * 60, (52, 46, 70, 255), (40, 30, 50, 255), win=(255, 200, 110, 255) if i % 2 else (40, 40, 60, 255))
    b.rect([960, 1000, 980, 1520], (50, 50, 60, 255))
    b.glow(960, 1010, 260, (255, 220, 140), 0.55)
    van_side(b, 160, 1720, 0.9, lit=False, face=True)
    return b.done()


def sc_title(cv, ctx):
    cv.alpha_composite(static("title", bg_title))
    f, t = ctx["f"], ctx["t"]
    d = ImageDraw.Draw(cv)
    a = int(255 * seg(t, 0.2, 1.2))
    d.text((CW / 2, 520), "ది ఎక్స్‌ట్రా సీట్", font=font(F_TITLE, 150), fill=(235, 50, 50, a), anchor="mm", stroke_width=10, stroke_fill=(20, 10, 16, a))
    d.text((CW / 2, 700), "రెండవ భాగం", font=font(F_TE, 96), fill=(255, 255, 255, a), anchor="mm", stroke_width=8, stroke_fill=(20, 10, 16, a))
    fog(cv, f, 0.25)


def bg_bridge():
    b = BG((12, 20, 44), (30, 40, 70))
    stars(b, 70, 900, 4)
    b.ell([180, 260, 320, 400], (250, 246, 220, 255), ol=False)
    b.rect([0, 1250, CW, CH], (24, 46, 78, 255), ol=False)
    for i in range(30):
        y = 1270 + i * 28; x = random.Random(i).random() * CW
        b.line([(x, y), (x + 160, y)], (70, 110, 150, 255), 3)
    b.ell([200, 1300, 300, 1700], (90, 120, 150, 120), ol=False)
    b.poly([(0, 1000), (480, 1000), (520, 1060), (430, 1040), (0, 1050)], (70, 60, 60, 255))
    b.poly([(700, 1010), (CW, 990), (CW, 1050), (660, 1070)], (70, 60, 60, 255))
    for px_ in (160, 1020):
        b.rect([px_ - 24, 1040, px_ + 24, 1300], (60, 50, 50, 255))
    b.poly([(560, 1100), (640, 1120), (600, 1240), (530, 1220)], (70, 60, 60, 255))
    b.poly([(470, 1050), (560, 1080), (520, 1180)], (70, 60, 60, 255))
    van_side(b, -20, 1000, 0.55, lit=False)
    return b.done()


def sc_bridge(cv, ctx):
    cv.alpha_composite(static("bridge", bg_bridge))
    f = ctx["f"]
    g = radial(260, (255, 230, 160), 0.45)
    cv.alpha_composite(g, (int(430 - 200), int(870 - 260)))
    fog(cv, f, 0.3)


def kids_default(ctx, riya_expr="neutral", riya_m=None, others="neutral"):
    f = ctx["f"]
    k = {n: dict(expr=others, look=random.Random(n).uniform(-0.5, 0.5)) for n in SEATS}
    k["riya"] = dict(expr=riya_expr, m=mouth("r", f) if riya_m is None else riya_m)
    k["arjun"] = dict(expr="neutral", m=mouth("a", f))
    return k


def sc_van_calm(cv, ctx):
    k = kids_default(ctx, riya_expr="happy")
    draw_van(cv, ctx, k)


def sc_van_wet(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    a2, _ = ln(ctx, 2)
    k = kids_default(ctx, riya_expr="neutral")
    k["riya"]["look"] = -0.6
    for n in ("arjun", "k3", "k5"):
        del k[n]
    turned = t >= a2 - 0.1

    def arjun(cv_):
        walk = clamp(t / 2.0)
        z = 0.95 - 0.12 * ease(walk)
        bob = abs(math.sin(t * 7)) * 8 if t < 2.0 else 0
        place(cv_, "arjun", VPX - 170, vy(1050, z) - bob, 1000 * z * 0.86, back=not turned,
              pose="thumb" if turned else "down", expr="scared", m=mouth("a", f), blink=blink(f, 3), look=-0.3)
    if turned:
        k["riya"]["look"] = -0.3
    draw_van(cv, ctx, k, arjun_stand=arjun, back_puddle=True)


def bg_wet_close():
    b = BG((40, 36, 44), (24, 20, 26))
    b.rect([0, 0, CW, 520], (110, 150, 190, 255))
    b.rrect([60, 380, CW - 60, 1150], 90, (140, 54, 50, 255))
    b.rrect([110, 430, CW - 110, 640], 70, (166, 66, 60, 255), ol=False)
    b.poly([(20, 1100), (CW - 20, 1100), (CW + 40, 1400), (-40, 1400)], (170, 68, 62, 255))
    b.rect([0, 1400, CW, CH], (80, 76, 84, 255))
    b.ell([180, 1700, 1000, 1950], (110, 170, 220, 200))
    return b.done()


def sc_wet_close(cv, ctx):
    f = ctx["f"]
    cv.alpha_composite(static("wet_close", bg_wet_close))
    draw_puddle(cv, 594, 1230, 360, 95, f)
    drips(cv, f, 260, 930, 1330, 1820, n=9, seed=7)


def bg_bedroom():
    b = BG((26, 30, 60), (16, 18, 36))
    b.rect([640, 260, 1100, 900], (14, 20, 46, 255))
    stars(b, 0, 0)
    b.ell([870, 340, 990, 460], (250, 246, 220, 255), ol=False)
    b.rect([640, 260, 1100, 900], None, ol=True, w=14)
    b.line([(870, 260), (870, 900)], INK, 12); b.line([(640, 580), (1100, 580)], INK, 12)
    b.poly([(600, 230), (690, 230), (660, 960), (590, 960)], (110, 60, 90, 255))
    b.poly([(1140, 230), (1050, 230), (1080, 960), (1150, 960)], (110, 60, 90, 255))
    b.rect([0, 1500, CW, CH], (60, 44, 50, 255), ol=False)
    b.rrect([40, 1000, 900, 1260], 40, (200, 200, 230, 255))       # headboard area / pillow wall
    b.rrect([80, 1060, 470, 1220], 60, (240, 240, 250, 255))       # pillow
    b.rect([20, 1240, 960, 1560], (90, 60, 50, 255))               # bed frame
    return b.done()


def sc_bedroom(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("bedroom", bg_bedroom))
    taps = [ln(ctx, i)[0] for i in (2, 3, 4)]
    jolt = any(0 <= t - a < 0.15 for a in taps)
    tapped = t >= taps[0] - 0.05
    dx = (random.Random(f).uniform(-8, 8)) if jolt else 0
    place(cv, "riya", 300, 1300 + (6 if jolt else 0), 900, sit=True, pose="blanket",
          expr="scared" if tapped else "neutral", blink=blink(f, 5) and not tapped, look=0.9 if tapped else 0.2, lookv=-0.6 if not tapped else 0)
    b = ImageDraw.Draw(cv)
    b.rounded_rectangle([20, 1250, 960, 1600], radius=60, fill=(80, 110, 180, 255), outline=INK, width=4)   # blanket
    for i in range(5):
        b.line([(60 + i * 180, 1280), (120 + i * 180, 1580)], fill=(66, 92, 156, 255), width=6)
    for a in taps:
        u = (t - a) / 0.6
        if 0 <= u < 1:
            r = 40 + 160 * u
            b.ellipse([870 - r + dx, 580 - r, 870 + r + dx, 580 + r], outline=(255, 255, 255, int(220 * (1 - u))), width=8)
    if jolt:
        b.text((870 + dx, 700), "టక్!", font=font(F_TE, 90), fill=(255, 255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=INK)


def bg_window(fogged=0.0, curtain_open=True):
    b = BG((20, 26, 50), (12, 14, 28))
    b.rect([150, 280, 1040, 1300], (14, 22, 50, 255))
    b.ell([700, 380, 860, 540], (250, 246, 220, 255), ol=False)
    for i in range(5):
        tree(b, 220 + i * 180, 1300, 1.2, (20, 40, 40, 255))
    b.rect([150, 280, 1040, 1300], None, w=26)
    b.line([(595, 280), (595, 1300)], INK, 18); b.line([(150, 790), (1040, 790)], INK, 18)
    b.rect([110, 1300, 1080, 1360], (90, 66, 56, 255))
    if not curtain_open:
        b.rect([120, 240, 1070, 1320], (110, 60, 90, 255))
    else:
        b.poly([(60, 230), (200, 230), (160, 1380), (40, 1380)], (110, 60, 90, 255))
    b.rect([0, 1500, CW, CH], (50, 40, 46, 255), ol=False)
    return b.done()


def fog_glass(cv, a, x0=164, y0=294, x1=1026, y1=1286):
    if a <= 0:
        return
    L = Image.new("RGBA", cv.size, (0, 0, 0, 0))
    ImageDraw.Draw(L).rectangle([x0, y0, x1, y1], fill=(205, 218, 232, int(200 * a)))
    cv.alpha_composite(L.filter(ImageFilter.GaussianBlur(6)))


def sc_window_fog(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    cv.alpha_composite(static("window", bg_window))
    fog_glass(cv, ease(seg(t, 0.5, T * 0.7)))
    a1, _ = ln(ctx, 1)
    if t > a1 + 1.5:
        L = Image.new("L", cv.size, 0)
        ImageDraw.Draw(L).text((360, 560), "నా", font=font(F_HAND, 150), fill=255, anchor="mm")
        rv = seg(t, a1 + 1.5, a1 + 3.5)
        mask = L.point(lambda v: int(v * rv))
        cv.paste(Image.new("RGBA", cv.size, (20, 30, 60, 255)), (0, 0), mask)
    place(cv, "riya", 240, 1900, 1150, pose="curtain", expr="scared" if t > a1 else "neutral", blink=blink(f, 4), look=0.8)


def sc_fog_message(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("window", bg_window))
    fog_glass(cv, 1.0)
    a0, b0 = ln(ctx, 0); a1, b1 = ln(ctx, 1)
    L = Image.new("L", cv.size, 0)
    dl = ImageDraw.Draw(L)
    lines = [("నా పేరు లక్ష్మి.", 560, a0, b0), ("నన్ను ఇంటికి", 840, a1, a1 + (b1 - a1) * 0.55), ("తీసుకెళ్ళు.", 1080, a1 + (b1 - a1) * 0.5, b1)]
    for txt, y, a, b in lines:
        u = seg(t, a - 0.1, b)
        if u <= 0:
            continue
        T_ = Image.new("L", cv.size, 0)
        size = 150
        while font(F_HAND, size).getlength(txt) > 760:
            size -= 6
        ImageDraw.Draw(T_).text((595, y), txt, font=font(F_HAND, size), fill=255, anchor="mm")
        bbox = T_.getbbox()
        if bbox:
            xcut = bbox[0] + (bbox[2] - bbox[0]) * u
            M = Image.new("L", cv.size, 0); ImageDraw.Draw(M).rectangle([0, 0, xcut, CH], fill=255)
            L = ImageChops.lighter(L, ImageChops.multiply(T_, M)); dl = ImageDraw.Draw(L)
            if u >= 1:
                rr = random.Random(y)
                for i in range(5):
                    x = rr.uniform(bbox[0], bbox[2]); ln_ = 30 + (t - b) * 60 * rr.uniform(0.5, 1.2)
                    dl.line([(x, bbox[3] - 10), (x, bbox[3] + min(ln_, 90))], fill=255, width=6)
    cv.paste(Image.new("RGBA", cv.size, (16, 24, 52, 255)), (0, 0), L)
    if t > b1 - 0.4:  # faint Lakshmi behind the glass
        a = seg(t, b1 - 0.4, b1 + 0.6) * 0.5
        img, (ax, ay) = sprite("lakshmi", px=760, ghost=True, expr="sad")
        im = img.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a)))
        cv.alpha_composite(im, (int(800 - ax), int(1300 - ay)))
    sparkles(cv, f, 600, 800, 400, n=6, a=0.4)


def bg_library():
    b = BG((70, 50, 40), (40, 28, 24))
    rr = random.Random(9)
    for row in range(5):
        y = 160 + row * 220
        b.rect([0, y + 170, CW, y + 196], (90, 60, 40, 255))
        x = 10
        while x < CW:
            w_ = rr.randint(34, 70); h_ = rr.randint(110, 165)
            b.rect([x, y + 170 - h_, x + w_, y + 170], rr.choice([(150, 50, 46), (60, 110, 80), (200, 160, 70), (70, 90, 160), (120, 70, 140)]) + (255,), w=3)
            x += w_ + 6
    b.rect([0, 1350, CW, CH], (70, 46, 32, 255), ol=False)
    b.rect([60, 1500, 1130, 1580], (130, 84, 50, 255))                 # table top
    b.rect([100, 1580, 150, 2000], (110, 70, 44, 255)); b.rect([1040, 1580, 1090, 2000], (110, 70, 44, 255))
    b.line([(930, 1500), (900, 1250), (980, 1180)], (60, 60, 60, 255), 10)    # desk lamp
    b.poly([(940, 1150), (1060, 1150), (1030, 1230), (970, 1230)], (40, 110, 80, 255))
    b.glow(1000, 1350, 380, (255, 210, 120), 0.5)
    return b.done()


def sc_library(cv, ctx):
    f = ctx["f"]
    cv.alpha_composite(static("library", bg_library))
    place(cv, "riya", 520, 1420, 1050, sit=True, pose="chest", expr="neutral", blink=blink(f, 6), lookv=1.0, look=0.1)
    d = ImageDraw.Draw(cv)
    d.polygon([(300, 1470), (760, 1450), (800, 1540), (260, 1560)], fill=(232, 222, 190, 255), outline=INK, width=4)
    for i in range(4):
        d.line([(330, 1480 + i * 18), (740, 1470 + i * 18)], fill=(120, 110, 90, 255), width=5)


def bg_newspaper():
    b = BG((226, 212, 172), (200, 184, 140))
    b.text((CW / 2, 230), "కాలనీ వార్తలు", F_TITLE, 130, (34, 26, 22, 255))
    b.line([(70, 330), (CW - 70, 330)], (40, 30, 26, 255), 8)
    b.text((CW / 2, 380), "1994", F_EN, 50, (60, 50, 40, 255))
    b.text((CW / 2, 500), "పాత వంతెనపై నుంచి", F_TE, 86, (24, 18, 16, 255))
    b.text((CW / 2, 610), "చెరువులో పడ్డ స్కూల్ బస్సు", F_TE, 80, (24, 18, 16, 255))
    b.rect([260, 700, 930, 1300], (150, 130, 100, 255))
    b.text((CW / 2, 1370), "లక్ష్మి, వయసు 8", F_TE, 60, (30, 24, 20, 255))
    b.text((CW / 2, 1450), "తల్లి — చెరువు వీధి", F_TE, 50, (40, 32, 26, 255))
    rr = random.Random(3)
    for i in range(12):
        y = 1540 + i * 40
        b.line([(80, y), (CW - 80 - rr.random() * 200, y)], (120, 108, 88, 255), 8)
    return b.done()


@lru_cache(None)
def sepia_lakshmi():
    img, anc = sprite("lakshmi", px=560, expr="happy")
    a = np.asarray(img).astype(np.float32)
    g = a[..., :3].mean(-1, keepdims=True)
    a[..., :3] = g * np.array([1.05, 0.9, 0.7]) * 0.85 + 20
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), anc


def sc_newspaper(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("newspaper", bg_newspaper))
    img, (ax, ay) = sepia_lakshmi()
    cv.alpha_composite(img, (int(595 - ax), int(1290 - ay)))
    d = ImageDraw.Draw(cv)
    a0, b0 = ln(ctx, 0)
    u = seg(t, a0, a0 + 1.2)
    if u > 0:
        d.arc([220, 660, 970, 1340], -90, -90 + 360 * u, fill=(220, 30, 30, 255), width=14)
    a2, _ = ln(ctx, 2)
    v = seg(t, a2, a2 + 0.8)
    if v > 0:
        d.line([(390, 1490), (390 + 410 * v, 1490)], fill=(220, 30, 30, 255), width=10)


def bg_lake_house():
    b = BG((90, 60, 120), (240, 140, 100))
    b.ell([480, 980, 720, 1220], (255, 200, 120, 255), ol=False)
    b.rect([0, 1150, CW, CH], (40, 60, 90, 255), ol=False)
    for i in range(20):
        y = 1180 + i * 24; x = random.Random(i + 40).random() * CW
        b.line([(x, y), (x + 120, y)], (120, 110, 150, 255), 3)
    b.poly([(0, 1350), (380, 1260), (700, 1300), (CW, 1250), (CW, CH), (0, CH)], (50, 70, 50, 255))
    b.poly([(520, CH), (760, CH), (640, 1330), (600, 1330)], (130, 110, 90, 255))
    for x in (560, 610, 660, 700):
        b.line([(x, 1500), (x + 30, 1560)], (90, 70, 60, 255), 6)
    # crumbling house
    b.rect([380, 900, 820, 1310], (110, 90, 84, 255))
    b.poly([(350, 900), (600, 700), (850, 900)], (80, 52, 50, 255))
    b.poly([(700, 800), (760, 830), (740, 870), (690, 840)], (90, 60, 120, 255), ol=False)
    b.line([(420, 960), (470, 1060), (440, 1150)], INK, 5); b.line([(780, 980), (740, 1100)], INK, 5)
    b.rect([540, 1000, 660, 1110], (60, 40, 30, 255))
    b.rect([450, 1180, 540, 1310], (70, 46, 36, 255))
    for i in range(6):
        tree(b, 60 + i * 210 if i < 3 else 760 + (i - 3) * 160, 1350, 1.3, (30, 50, 50, 255))
    return b.done()


def sc_lake_house(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    cv.alpha_composite(static("lake_house", bg_lake_house))
    lamp_flame(cv, 600, 1080, 0.9, f)
    u = ease(clamp(t / T))
    for n, x0, px_ in (("riya", 520, 600), ("arjun", 700, 520)):
        y = 2050 - 420 * u
        s_ = 1 - 0.45 * u
        bob = abs(math.sin(t * 6 + (n == "arjun"))) * 10 * s_
        place(cv, n, x0 + (600 - x0) * u * 0.3, y - bob, px_ * s_, back=True)
    fog(cv, f, 0.2, (200, 180, 220))


def bg_porch(dark=False, lamp_win=True):
    top = (60, 46, 70) if not dark else (24, 24, 40)
    b = BG(top, (30, 22, 30))
    b.rect([0, 300, CW, 1500], (120, 92, 80, 255) if not dark else (70, 56, 56, 255))      # house wall
    for i in range(12):
        b.line([(0, 330 + i * 100), (CW, 330 + i * 100)], (100, 76, 66, 255), 4)
    b.rect([720, 520, 1060, 900], (60, 40, 30, 255))                                   # window
    b.line([(890, 520), (890, 900)], INK, 10)
    b.rect([150, 520, 470, 1500], (90, 60, 44, 255))                                   # door
    b.rect([0, 1500, CW, CH], (126, 92, 64, 255))                                      # porch floor
    for i in range(10):
        y = 1500 + i * 64
        b.line([(0, y), (CW, y)], (96, 68, 48, 255), 5)
    b.rect([-10, 1660, CW + 10, 1720], (150, 110, 80, 255))                             # top step edge
    b.rect([-10, 1720, CW + 10, 1880], (120, 86, 60, 255))
    b.rect([-10, 1880, CW + 10, CH], (100, 72, 50, 255))
    return b.done()


def sc_old_woman(cv, ctx, *, tears=False):
    f = ctx["f"]
    cv.alpha_composite(static("porch", bg_porch))
    lamp_flame(cv, 890, 800, 1.1, f)
    place(cv, "oldw", 700, 1690, 980, sit=True, pose="chest", expr="sad", blink=blink(f, 8), lookv=1.0, m=mouth("o", f))
    ribbon(cv, 700, 1690 - 980 * 0.10, 980)
    for n, x, px_ in (("riya", 170, 820), ("arjun", 360, 700)):
        place(cv, n, x, 2080, px_, expr="sad" if n == "riya" else "neutral", blink=blink(f, hash(n) % 50), look=1.0, m=mouth(n[0], f))


def ribbon(cv, x, y, px_):
    d = ImageDraw.Draw(cv)
    s_ = px_ / 1000
    d.line([(x - 70 * s_, y), (x - 10 * s_, y + 20 * s_), (x + 60 * s_, y - 10 * s_), (x + 90 * s_, y + 60 * s_)], fill=(60, 110, 220, 255), width=int(22 * s_), joint="curve")


def sc_old_close(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("porch_close", lambda: bg_porch().resize((CW * 2, CH * 2)).crop((CW // 2, CH // 4, CW // 2 + CW, CH // 4 + CH))))
    lamp_flame(cv, 1050, 380, 2.0, f)
    a2, _ = ln(ctx, 2)
    expr = "cry" if t > a2 + 2.0 else "sad"
    place(cv, "oldw", 594, 3350, 3000, pose="chest", expr=expr, blink=blink(f, 8), lookv=0.9 if t < a2 + 1.5 else 0.0, m=mouth("o", f))
    ribbon(cv, 594, 3350 - 3000 * 0.47, 3000)


def sc_riya_close(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("porch_close2", lambda: bg_porch().resize((CW * 2, CH * 2)).crop((0, CH // 3, CW, CH // 3 + CH))))
    a1, _ = ln(ctx, 1)
    place(cv, "riya", 594, 3000, 2600, pose="chest", expr="sad", blink=blink(f, 5), look=0.5, m=mouth("r", f))


def footprints(cv, t, a, b, path):
    d = ImageDraw.Draw(cv)
    n = len(path)
    for i, (x, y, s_) in enumerate(path):
        if t >= a + (b - a) * i / n:
            al = int(200 * clamp(1 - (t - (a + (b - a) * i / n)) / 6) + 55)
            side = -1 if i % 2 else 1
            d.ellipse([x - 22 * s_ + side * 18 * s_, y - 40 * s_, x + 22 * s_ + side * 18 * s_, y + 30 * s_], fill=(70, 110, 150, al))
            d.ellipse([x - 16 * s_ + side * 18 * s_, y - 70 * s_, x + 16 * s_ + side * 18 * s_, y - 46 * s_], fill=(70, 110, 150, al))


FOOT_PATH = [(1120 - i * 85, 1600 + (i % 2) * 10, 1.0) for i in range(6)]


def wind_lines(cv, f, a=1.0):
    d = ImageDraw.Draw(cv)
    rr = random.Random(11)
    for i in range(10):
        y = rr.uniform(300, 1600); sp = rr.uniform(20, 40); ph = rr.random() * CW
        x = (ph - f * sp) % (CW + 600) - 300
        d.arc([x, y, x + 380, y + 80], 200, 340, fill=(230, 240, 255, int(150 * a)), width=5)
    for i in range(6):
        ph = rr.random(); x = (CW - ((f * 14 + ph * 2000) % (CW + 200))); y = rr.uniform(500, 1500) + math.sin(f * 0.2 + i) * 40
        d.ellipse([x, y, x + 30, y + 16], fill=(120, 150, 60, 255), outline=INK, width=2)


def sc_porch_wind(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("porch", bg_porch))
    a1, _ = ln(ctx, 1); a2, b2 = ln(ctx, 2)
    k = 1.0 if t < a1 else 0.55 + 0.45 * abs(math.sin(f * 0.8))
    lamp_flame(cv, 890, 800, 1.1, f, k)
    footprints(cv, t, a2 + 0.6, b2 + 1.2, FOOT_PATH)
    place(cv, "oldw", 700, 1690, 980, sit=True, pose="chest", expr="cry", blink=blink(f, 8), look=0.6 if t > a2 else 0, lookv=0.6)
    ribbon(cv, 700, 1690 - 980 * 0.10, 980)
    scared = t > a2
    for n, x, px_ in (("riya", 170, 820), ("arjun", 360, 700)):
        place(cv, n, x, 2080, px_, expr="scared" if scared else "sad", blink=blink(f, hash(n) % 50), look=1.0)
    if t > a1:
        wind_lines(cv, f, seg(t, a1, a1 + 0.5))
    overlay(cv, (20, 40, 90), 0.25 * seg(t, a1, a2))


def sc_porch_turn(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("porch_dark", lambda: bg_porch(dark=True)))
    lamp_flame(cv, 890, 800, 1.1, f, 0.5 + 0.5 * abs(math.sin(f * 0.6)))
    footprints(cv, 99, 0, 1, FOOT_PATH)
    a1, _ = ln(ctx, 1)
    place(cv, "oldw", 560, 1640, 1050, pose="mouth" if t < a1 else "hug", expr="surprised", blink=blink(f, 8), look=1.0, m=mouth("o", f))
    for n, x, px_ in (("riya", 170, 820), ("arjun", 360, 700)):
        place(cv, n, x, 2080, px_, expr="scared", blink=blink(f, hash(n) % 50), look=1.0)
    overlay(cv, (20, 40, 90), 0.25)


def sc_embrace(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    cv.alpha_composite(static("porch_dark", lambda: bg_porch(dark=True)))
    lamp_flame(cv, 890, 800, 1.1, f)
    warm = seg(t, 0, T)
    a2, _ = ln(ctx, 2)
    expr = "cry_happy" if t > a2 - 0.5 else "cry"
    ga = 0.35 + 0.65 * seg(t, 0.5, 2.5)
    img, (ax, ay) = sprite("lakshmi", px=760, ghost=True, pose="hug", expr="happy", blink=blink(f, 12))
    im = img.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * ga)))
    place(cv, "oldw", 640, 1640, 1050, pose="embrace", expr=expr, blink=blink(f, 8), look=0.6, lookv=0.6)
    cv.alpha_composite(im, (int(720 - ax), int(1650 - ay)))
    sparkles(cv, f, 720, 1250, 260, n=16)
    place(cv, "riya", 170, 2080, 820, expr="puzzled", blink=blink(f, 30), look=1.0)
    place(cv, "arjun", 360, 2080, 700, expr="happy" if t > a2 else "neutral", blink=blink(f, 31), look=1.0)
    overlay(cv, (20, 40, 90), 0.25 * (1 - warm))
    overlay(cv, (255, 170, 90), 0.12 * warm)


def sc_lamp_out(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    cv.alpha_composite(static("lamp_close", lambda: bg_porch(dark=True).resize((CW * 3, CH * 3)).crop((int(890 * 3 - CW / 2), int(800 * 3 - CH * 0.55), int(890 * 3 + CW / 2), int(800 * 3 + CH * 0.45)))))
    a0, _ = ln(ctx, 0)
    out_t = a0 + 0.5
    k = 1.0 if t < out_t else max(0.0, 1 - (t - out_t) * 3)
    d = ImageDraw.Draw(cv)
    d.polygon([(500, 1300), (690, 1300), (650, 1400), (540, 1400)], fill=(170, 110, 60, 255), outline=INK, width=5)   # clay lamp
    d.rectangle([590, 1200, 600, 1300], fill=(40, 30, 20, 255))
    lamp_flame(cv, 595, 1190, 2.4, f, k)
    if t > out_t:
        u = t - out_t
        for i in range(8):
            yy = 1180 - i * 70 - u * 60
            xx = 595 + math.sin(i * 0.9 + u * 2) * 40
            al = int(140 * clamp(1 - i / 8) * clamp(u * 2) * clamp(2.5 - u * 0.5))
            g = radial(50, (200, 200, 210), al / 255)
            cv.alpha_composite(g, (int(xx - 50), int(yy - 50)))
        sparkles(cv, f, 595, 900, 200, n=10, a=clamp(1 - u / 4))
    overlay(cv, (0, 0, 10), 0.3 * clamp((t - out_t) * 2) if t > out_t else 0)
    overlay(cv, (255, 160, 80), 0.18 * seg(t, out_t + 1, T))


def bg_walk():
    b = BG((240, 140, 110), (120, 70, 110))
    b.ell([480, 660, 720, 900], (255, 220, 140, 255), ol=False)
    b.poly([(0, 1000), (CW, 1000), (CW, CH), (0, CH)], (90, 70, 80, 255), ol=False)
    b.poly([(200, CH), (990, CH), (640, 1000), (550, 1000)], (110, 100, 110, 255))
    b.line([(594, 1010), (594, CH)], (220, 210, 190, 255), 6)
    for side in (-1, 1):
        for i in range(5):
            z = 1 / (1 + i * 0.7)
            x = 594 + side * (380 + 120 * z) * z * 1.2 - (220 * z if side > 0 else 0) * 0
            w_ = 300 * z; h_ = 320 * z
            xx = 594 + side * 560 * z - (w_ if side < 0 else 0)
            house(b, xx, 1000 + 700 * z, w_, h_, ((150, 110, 120) if i % 2 else (170, 140, 110)) + (255,), (110, 60, 70, 255))
    return b.done()


def sc_walk_home(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    cv.alpha_composite(static("walk", bg_walk))
    u = ease(clamp(t / T))
    a3, _ = ln(ctx, 3); a2, _ = ln(ctx, 2)
    s_ = 0.75 + 0.35 * u
    y = 1650 + 300 * u
    bob = abs(math.sin(t * 5.5)) * 10
    place(cv, "riya", 500 - 40 * u, y - bob, 1000 * s_, pose="hold_r", expr="happy" if t > a2 - 0.2 else "neutral", blink=blink(f, 5), look=0.6, m=mouth("r", f))
    place(cv, "arjun", 500 - 40 * u + 290 * s_, y - abs(math.sin(t * 5.5 + 1)) * 10, 860 * s_, pose="hold_l", expr="sad" if t < a2 else "happy", blink=blink(f, 3), look=-0.7, m=mouth("a", f))


def sc_van_count(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    k = kids_default(ctx, riya_expr="neutral")
    order = ["k5", "k2", "k3", "k4", "k1", "arjun", "riya"]
    draw_van(cv, ctx, k)
    d = ImageDraw.Draw(cv)
    for j, n in enumerate(order):
        a, _ = ln(ctx, 2 + j)
        if t < a - 0.03:
            continue
        z, xw = SEATS[n]
        x, y = vx(xw, z), vy(650, z) - 1000 * z * 0.98 * 0.70
        pop = 1 + 0.35 * math.exp(-(t - a) * 8) * math.cos((t - a) * 20)
        r = 46 * pop * (z / 0.5) ** 0.5
        d.ellipse([x - r, y - r - 40, x + r, y + r - 40], fill=(255, 255, 255, 255), outline=INK, width=5)
        d.text((x, y - 40), str(j + 1), font=font(F_EN, int(r * 1.2)), fill=(40, 120, 60, 255), anchor="mm")


def sc_van_whisper(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    a2, _ = ln(ctx, 2)
    ctx = dict(ctx, mood="cold" if t > a2 else "day")
    k = kids_default(ctx, riya_expr="happy" if t < a2 + 0.5 else "neutral")
    k["arjun"] = dict(expr="scared" if t > ln(ctx, 1)[0] else "neutral", m=mouth("a", f), pose="lean" if t > ln(ctx, 1)[0] else "down",
                      look=1.0, dx=60 * seg(t, ln(ctx, 1)[0], ln(ctx, 1)[0] + 0.6))
    draw_van(cv, ctx, k)
    overlay(cv, (40, 80, 140), 0.25 * seg(t, a2, T))


def sc_wet_beside(cv, ctx):
    f, t, T = ctx["f"], ctx["t"], ctx["T"]
    ctx = dict(ctx, mood="cold")
    a0, b0 = ln(ctx, 0); a2, b2 = ln(ctx, 2)
    k = {"riya": dict(expr="scared", look=ease(seg(t, a0, b0 + 0.6)) * 1.0, dx=0)}
    ghost_on = t > b2 + 0.1

    def extra(cv_, z):
        x, y = vx(EXTRA_SEAT[1], z), vy(650, z)
        draw_puddle(cv_, x, y + 10, 110, 22, f)
        drips(cv_, f, x - 80, x + 80, y + 40, vy(1050, z), n=6, seed=4)
        if ghost_on and ((f // 2) % 5 != 0 or t > b2 + 0.8):
            img, (ax, ay) = sprite("boy", px=int(1000 * z * 0.9), sit=True, ghost=True)
            cv_.alpha_composite(img, (int(x - ax), int(y - ay)))
    draw_van(cv, ctx, k, extra=(0.62, extra))
    overlay(cv, (30, 60, 120), 0.3)
    if ghost_on:
        overlay(cv, (0, 0, 0), 0.25 * seg(t, b2 + 0.1, T))


def sc_end(cv, ctx):
    f, t = ctx["f"], ctx["t"]
    cv.alpha_composite(static("end", lambda: BG((8, 6, 12), (18, 10, 16)).done()))
    d = ImageDraw.Draw(cv)
    d.rectangle([564, 1200, 624, 1460], fill=(236, 226, 206, 255), outline=INK, width=4)
    lamp_flame(cv, 594, 1180, 1.6, f)
    a = int(255 * seg(t, 0.2, 1.0))
    d.text((CW / 2, 640), "ఇంకా ఉంది...", font=font(F_TITLE, 130), fill=(235, 60, 50, a), anchor="mm", stroke_width=8, stroke_fill=(10, 6, 10, a))
    d.text((CW / 2, 820), "మూడవ భాగం", font=font(F_TE, 96), fill=(255, 255, 255, a), anchor="mm", stroke_width=6, stroke_fill=(10, 6, 10, a))
    drips(cv, f, 100, 1080, -20, 400, n=8, seed=9, ripple=False)


SCENE_FN = {
    "title": sc_title, "bridge": sc_bridge, "van_calm": sc_van_calm, "van_wet": sc_van_wet, "wet_close": sc_wet_close,
    "bedroom": sc_bedroom, "window_fog": sc_window_fog, "fog_message": sc_fog_message, "library": sc_library,
    "newspaper": sc_newspaper, "lake_house": sc_lake_house, "old_woman": sc_old_woman, "old_close": sc_old_close,
    "riya_close": sc_riya_close, "porch_wind": sc_porch_wind, "porch_turn": sc_porch_turn, "embrace": sc_embrace,
    "lamp_out": sc_lamp_out, "walk_home": sc_walk_home, "van_count": sc_van_count, "van_whisper": sc_van_whisper,
    "wet_beside": sc_wet_beside, "end": sc_end,
}
# camera: (zoom start, zoom end, (cx,cy) start, (cx,cy) end) in canvas coords
CAM = {
    "title": (1.0, 1.08, (594, 1056), (594, 1000)), "bridge": (1.0, 1.15, (594, 1100), (480, 1050)),
    "van_calm": (1.0, 1.06, (594, 1056), (594, 1056)), "van_wet": (1.05, 1.3, (594, 1050), (560, 980)),
    "wet_close": (1.0, 1.12, (594, 1056), (594, 1150)), "bedroom": (1.0, 1.1, (594, 1056), (650, 900)),
    "window_fog": (1.0, 1.06, (594, 1056), (594, 1000)), "fog_message": (1.05, 1.15, (594, 900), (594, 860)),
    "library": (1.0, 1.1, (594, 1100), (560, 1200)), "newspaper": (1.12, 1.0, (594, 900), (594, 1056)),
    "lake_house": (1.0, 1.1, (594, 1056), (594, 1000)), "old_woman": (1.0, 1.08, (594, 1200), (640, 1250)),
    "old_close": (1.0, 1.06, (594, 1056), (594, 1000)), "riya_close": (1.0, 1.06, (594, 1056), (594, 1000)),
    "porch_wind": (1.0, 1.05, (594, 1300), (594, 1250)), "porch_turn": (1.05, 1.2, (594, 1250), (620, 1150)),
    "embrace": (1.15, 1.0, (640, 1250), (594, 1150)), "lamp_out": (1.0, 1.1, (594, 1100), (594, 1150)),
    "walk_home": (1.0, 1.05, (594, 1056), (594, 1100)), "van_count": (1.0, 1.04, (594, 1056), (594, 1056)),
    "van_whisper": (1.35, 1.55, (594, 1080), (594, 1080)), "wet_beside": (1.6, 1.9, (660, 1110), (760, 1110)),
    "end": (1.0, 1.05, (594, 1056), (594, 1000)),
}


# ============================================================== captions & badges
def wrap(text, f, maxw):
    out, line = [], ""
    for w_ in text.split(" "):
        t_ = (line + " " + w_).strip()
        if f.getlength(t_) <= maxw:
            line = t_
        else:
            if line:
                out.append(line)
            line = w_
    out.append(line)
    return out


@lru_cache(None)
def caption_img(text, spk):
    f = font(F_TE, 58)
    lines = wrap(text, f, 940)
    lh = 92
    L = Image.new("RGBA", (W, lh * len(lines) + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    for i, l in enumerate(lines):
        d.text((W // 2, 20 + i * lh + lh // 2), l, font=f, fill=SPK_COL[spk] + (255,), anchor="mm", stroke_width=7, stroke_fill=(10, 8, 14, 255))
    return L


@lru_cache(None)
def badge_img(part):
    L = Image.new("RGBA", (W, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    t = f"ది ఎక్స్‌ట్రా సీట్ 2  •  భాగం {part}/4"
    f = font(F_TE, 40)
    w_ = f.getlength(t)
    d.rounded_rectangle([W / 2 - w_ / 2 - 26, 80, W / 2 + w_ / 2 + 26, 150], radius=30, fill=(0, 0, 0, 130))
    d.text((W / 2, 115), t, font=f, fill=(255, 255, 255, 230), anchor="mm")
    return L


@lru_cache(None)
def next_img(part):
    L = Image.new("RGBA", (W, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    t = f"తర్వాత  →  భాగం {part + 1}/4"
    f = font(F_TE, 62)
    w_ = f.getlength(t)
    d.rounded_rectangle([W / 2 - w_ / 2 - 30, 10, W / 2 + w_ / 2 + 30, 130], radius=40, fill=(235, 60, 50, 235))
    d.text((W / 2, 70), t, font=f, fill=(255, 255, 255, 255), anchor="mm")
    return L


def scene_at(T):
    for i, sc in enumerate(TL):
        if sc["start"] <= T < sc["start"] + sc["dur"]:
            return i
    return len(TL) - 1


SHAKE = set()
for sc in TL:
    if sc["id"] == "s22":
        e = sc["lines_t"][-1][1]
        SHAKE |= set(range(int((e + 0.1) * FPS), int((e + 0.45) * FPS)))


def render_frame(f):
    T = f / FPS
    i = scene_at(T)
    sc = TL[i]
    t = T - sc["start"]
    ctx = dict(f=f, t=t, T=sc["dur"], u=t / sc["dur"], lines=[(a - sc["start"], b - sc["start"], s_, x) for a, b, s_, x in sc["lines_t"]])
    cv = Image.new("RGBA", (CW, CH), (0, 0, 0, 255))
    SCENE_FN[sc["visual"]](cv, ctx)
    z0, z1, c0, c1 = CAM[sc["visual"]]
    u = ease(clamp(t / sc["dur"]))
    z = z0 + (z1 - z0) * u
    cx, cy = c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u
    if f in SHAKE:
        cx += random.Random(f).uniform(-30, 30); cy += random.Random(f + 1).uniform(-30, 30)
    cw, ch = CW / z, CH / z
    cx = clamp(cx, cw / 2, CW - cw / 2); cy = clamp(cy, ch / 2, CH - ch / 2)
    fr = cv.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((W, H), Image.BILINEAR)
    # vignette + scene fades
    fr.alpha_composite(vignette())
    fade = min(1, t / 0.25, (sc["dur"] - t) / 0.25)
    if fade < 1:
        overlay(fr, (0, 0, 0), 1 - max(0, fade))
    clean = fr.copy()
    if sc["id"] not in NO_CAPTION:
        cur = None
        lt = ctx["lines"]
        for j, (a, b, spk, text) in enumerate(lt):
            nxt = lt[j + 1][0] if j + 1 < len(lt) else sc["dur"] - 0.3
            if a - 0.05 <= t < nxt - 0.05:
                cur = (spk, text, j)
        if cur:
            spk, text, j = cur
            if sc["id"] == "s20" and 2 <= j <= 8:
                text = " ".join(x[3] for x in lt[2:j + 1])
            cap = caption_img(text, spk)
            clean.alpha_composite(cap, (0, int(1470 - cap.height / 2)))
    return clean


@lru_cache(None)
def vignette():
    y, x = np.ogrid[:H, :W]
    d = np.clip((((x - W / 2) / (W * 0.7)) ** 2 + ((y - H / 2) / (H * 0.7)) ** 2), 0, 1)
    arr = np.zeros((H, W, 4), np.uint8); arr[..., 3] = (d ** 1.5 * 150).astype(np.uint8)
    return Image.fromarray(arr)


def render_part(p):
    f0, f1 = int((p - 1) * PART_LEN * FPS), int(p * PART_LEN * FPS)
    enc = lambda out: subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    pc, pb = enc(f"{WORK}/clean_{p}.mp4"), enc(f"{WORK}/badge_{p}.mp4")
    for f in range(f0, f1):
        fr = render_frame(f)
        pc.stdin.write(fr.convert("RGB").tobytes())
        fr.alpha_composite(badge_img(p), (0, 0))
        if p < 4 and f >= f1 - 3 * FPS:
            fr.alpha_composite(next_img(p), (0, 230))
        pb.stdin.write(fr.convert("RGB").tobytes())
        if (f - f0) % 300 == 0:
            print(f"part {p}: {f - f0}/{f1 - f0}", flush=True)
    for pp in (pc, pb):
        pp.stdin.close(); pp.wait()
    return p


# ============================================================== audio
def synth_audio():
    N = int(4 * PART_LEN * SR)
    t = np.arange(N) / SR
    r = np.random.default_rng(5)
    voice = np.zeros(N, np.float32); music = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
    S = {sc["id"]: sc for sc in TL}

    def add(buf, at, sig, g=1.0):
        a = int(at * SR)
        if a < 0: sig = sig[-a:]; a = 0
        b = min(N, a + len(sig))
        if a < N: buf[a:b] += sig[:b - a].astype(np.float32) * g

    for sc in TL:
        for i, (a, b, spk, text) in enumerate(sc["lines_t"]):
            add(voice, a, CLIPS[(sc["id"], i)])
    # ---- music box: A minor motif, warm C major during the reunion, stops at the twist
    stop_t = S["s21"]["lines_t"][2][0]
    warm0, warm1 = S["s17"]["start"], S["s19"]["start"] + S["s19"]["dur"]
    minor = [69, 72, 76, 81, 79, 76, 72, 74, 76, 72, 69, 71, 72, 69, 64, 69]
    major = [72, 76, 79, 84, 83, 79, 76, 77, 79, 76, 72, 74, 76, 72, 67, 72]
    def note(midi, dur=1.6):
        n = int(dur * SR); tt = np.arange(n) / SR; fq = 440 * 2 ** ((midi - 69) / 12)
        return (np.sin(2 * np.pi * fq * tt) + 0.35 * np.sin(4 * np.pi * fq * tt) + 0.12 * np.sin(2 * np.pi * fq * 4.2 * tt)) * np.exp(-tt * 3.2)
    step = 0.5; k = 0; x = 0.0
    while x < stop_t - 0.5:
        warm = warm0 <= x < warm1
        seq = major if warm else minor
        add(music, x, note(seq[k % 16]), 0.5)
        if k % 4 == 0:
            add(music, x, note(seq[k % 16] - 24, 2.5), 0.35)
        k += 1; x += step
    pad = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 9)) * 0.25
    music += np.where(t < stop_t, pad, 0)
    end_t = S["s22"]["start"] + S["s22"]["dur"]
    dr = (t >= stop_t) & (t < end_t)
    music += np.where(dr, np.sin(2 * np.pi * 41 * t) * 0.6 * np.clip((t - stop_t) / 3, 0, 1), 0)
    e23 = S["s23"]["start"]
    for j, mm in enumerate([69, 72, 76, 75]):
        add(music, e23 + 0.6 + j * 0.7, note(mm, 2.5), 0.5)

    # ---- SFX
    def env(n, k_): return np.exp(-np.arange(n) / SR * k_)
    def noise(n, sm=1):
        x = r.standard_normal(n)
        return np.convolve(x, np.ones(sm) / sm, "same") if sm > 1 else x
    def drip():
        n = int(0.18 * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * np.cumsum(1400 * np.exp(-tt * 14) + 500) / SR) * np.exp(-tt * 26)
    def knock():
        n = int(0.3 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 160 * tt) * 1.2 + noise(n) * np.exp(-tt * 70) * 0.8) * np.exp(-tt * 26)
    def wind(d):
        n = int(d * SR); w_ = noise(n, 50) * 5
        return w_ * np.sin(np.linspace(0, np.pi, n)) ** 2 * (0.7 + 0.3 * np.sin(np.linspace(0, 11, n)))
    def step_():
        n = int(0.35 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 75 * tt) * 1.1 + noise(n, 12) * 2.5 * np.exp(-tt * 9)) * np.exp(-tt * 12)
    def sting(soft=False):
        n = int(3.5 * SR); tt = np.arange(n) / SR
        s_ = (np.sin(2 * np.pi * 40 * tt) * 1.3 + 0.5 * np.sin(2 * np.pi * 233 * tt) + 0.45 * np.sin(2 * np.pi * 247 * tt) + 0.3 * np.sin(2 * np.pi * 311 * tt)) * np.exp(-tt * 1.3)
        s_[:200] *= np.linspace(0, 1, 200)
        return s_ * (0.5 if soft else 1.0)
    def chime():
        n = int(4 * SR); tt = np.arange(n) / SR
        return sum(np.sin(2 * np.pi * fq * tt) * np.exp(-tt * (1.2 + j * 0.4)) for j, fq in enumerate([523, 659, 784, 1046])) * 0.4
    def whoosh(d=1.4):
        n = int(d * SR); return noise(n, 14) * 3 * np.sin(np.linspace(0, np.pi, n)) ** 3
    def crickets(d):
        n = int(d * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.6) * (np.sin(2 * np.pi * 0.8 * tt) > 0) * 0.25
    def engine(d):
        n = int(d * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 48 * tt) + 0.5 * np.sin(2 * np.pi * 96 * tt + np.sin(tt * 30))) * 0.5 * np.minimum(1, tt / 0.8) * np.minimum(1, (d - tt) / 0.8)
    def pop():
        n = int(0.12 * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * np.cumsum(600 + 900 * tt / 0.12) / SR) * np.exp(-tt * 30)
    def page():
        n = int(0.5 * SR); return noise(n, 4) * np.sin(np.linspace(0, np.pi, n)) * 1.5
    def rise(d):
        n = int(d * SR); tt = np.arange(n) / SR
        return np.sin(2 * np.pi * (55 + 45 * tt / d) * tt) * (tt / d) ** 2 * 1.4
    def heart():
        n = int(0.6 * SR); tt = np.arange(n) / SR
        b_ = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 18)
        return b_ + np.roll(b_, int(0.22 * SR)) * 0.7

    for sc in TL:
        s0, d0 = sc["start"], sc["dur"]
        lt = sc["lines_t"]
        for fx in sc["sfx"]:
            if fx == "drips":
                for x in np.arange(s0 + 0.3, s0 + d0, 0.8): add(sfx, x + r.random() * 0.3, drip(), 0.5)
            elif fx == "taps":
                for (a, b, *_ ) in lt[2:5]: add(sfx, a, knock(), 1.0)
            elif fx == "wind": add(sfx, s0, wind(d0), 0.6)
            elif fx == "footsteps":
                a2, b2 = lt[2][0], lt[2][1]
                for j in range(6): add(sfx, a2 + 0.6 + (b2 + 1.2 - a2 - 0.6) * j / 6, step_(), 0.9)
            elif fx == "sting": add(sfx, lt[-1][1] + 0.1, sting(), 0.9)
            elif fx == "sting_soft": add(sfx, s0 + 0.2, sting(True), 0.7)
            elif fx == "chime": add(sfx, lt[0][0] + 0.5, chime(), 0.6)
            elif fx == "whoosh": add(sfx, s0, whoosh(), 0.7)
            elif fx == "crickets": add(sfx, s0, crickets(d0), 1.0)
            elif fx == "blowout": add(sfx, lt[0][0] + 0.5, whoosh(0.5), 0.9)
            elif fx == "engine": add(sfx, s0, engine(d0), 0.6)
            elif fx == "page": add(sfx, s0 + 0.3, page(), 0.6)
            elif fx == "drone_rise": add(sfx, s0, rise(d0), 0.7)
        if sc["id"] == "s20":
            for (a, b, *_ ) in lt[2:9]: add(sfx, a, pop(), 0.6)
        if sc["id"] == "s22":
            for j in range(4): add(sfx, s0 + 0.3 + j * 0.9, heart(), 0.8)
    return voice, music, sfx


def mix(voice, music, sfx):
    """Music at exactly 50% of the voice's gated RMS (-6 dB); SFX at <=50% with peaks <= 0.7x voice peak.
    Then one linear gain to about -16 dBFS voice RMS and a peak limiter at -1 dBFS."""
    def gated_rms(x, rel_db=-30):
        hop = SR // 20
        n = len(x) // hop
        r_ = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, 1) + 1e-12)
        g = r_ > r_.max() * 10 ** (rel_db / 20)
        return np.sqrt(np.mean(r_[g] ** 2))
    v_rms, v_pk = gated_rms(voice), np.abs(voice).max()
    music = music * (0.5 * v_rms / gated_rms(music))
    g_s = min(0.5 * v_rms / gated_rms(sfx), 0.7 * v_pk / (np.abs(sfx).max() + 1e-9))
    sfx = sfx * g_s
    m_db = 20 * np.log10(gated_rms(music) / v_rms); s_db = 20 * np.log10(gated_rms(sfx) / v_rms)
    print(f"levels: music {m_db:+.1f} dB vs voice, sfx {s_db:+.1f} dB vs voice, sfx peak/voice peak {np.abs(sfx).max() / v_pk:.2f}")
    out = voice + music + sfx
    out *= 10 ** (-16 / 20) / v_rms
    # peak limiter at -1 dBFS (gain envelope with 5 ms lookahead, 80 ms release)
    lim = 10 ** (-1 / 20)
    a = np.abs(out)
    win = int(0.005 * SR)
    pk = np.maximum.reduce([np.roll(a, -k) for k in range(0, win, 8)])
    g = np.minimum(1, lim / (pk + 1e-9))
    rel = np.exp(-1 / (0.08 * SR))
    gs = g.copy()
    for i in range(1, len(gs)):
        if gs[i] > gs[i - 1]:
            gs[i] = gs[i - 1] * rel + gs[i] * (1 - rel)
    out = np.clip(out * gs, -lim, lim)
    with wave.open(f"{WORK}/mix.wav", "wb") as w_:
        w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(SR); w_.writeframes((out * 32767).astype(np.int16).tobytes())


# ============================================================== main
if __name__ == "__main__":
    for p in (1, 2, 3, 4):
        print(f"part {p}:", [(s["id"], round(s["dur"], 2)) for s in TL if s["part"] == p])
    if MODE == "stills":
        frames = []
        for sc in TL:
            for q in ((0.5,) if os.environ.get("ONE") else (0.3, 0.8)):
                frames.append(int((sc["start"] + sc["dur"] * q) * FPS))
        only = os.environ.get("ONLY")
        if only:
            frames = [int((sc["start"] + sc["dur"] * q) * FPS) for sc in TL if sc["id"] in only.split(",") for q in (0.2, 0.5, 0.85)]
        with Pool(4) as pool:
            imgs = pool.map(render_frame, frames)
        th = [im.convert("RGB").resize((216, 384)) for im in imgs]
        cols = 8
        sheet = Image.new("RGB", (cols * 216, ((len(th) + cols - 1) // cols) * 384), (0, 0, 0))
        for i, im in enumerate(th):
            sheet.paste(im, ((i % cols) * 216, (i // cols) * 384))
        sheet.save(f"{WORK}/sheet.jpg", quality=88)
        print("sheet", f"{WORK}/sheet.jpg")
    elif MODE == "render":
        OUT = sys.argv[4]
        mix(*synth_audio())
        with Pool(4) as pool:
            pool.map(render_part, [1, 2, 3, 4])
        for p in (1, 2, 3, 4):
            a = (p - 1) * PART_LEN
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{WORK}/badge_{p}.mp4", "-ss", str(a), "-t", str(PART_LEN), "-i", f"{WORK}/mix.wav",
                            "-c:v", "copy", "-af", "afade=t=in:d=0.15,afade=t=out:st=71.7:d=0.3", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                            f"{OUT}/Extra_Seat_Cartoon_Part2_{p}of4.mp4"], check=True)
        with open(f"{WORK}/clean.txt", "w") as fl:
            for p in (1, 2, 3, 4):
                fl.write(f"file '{WORK}/clean_{p}.mp4'\n")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{WORK}/clean.txt", "-i", f"{WORK}/mix.wav",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", f"{OUT}/Extra_Seat_Cartoon_Part2_Full.mp4"], check=True)
        print("done")
