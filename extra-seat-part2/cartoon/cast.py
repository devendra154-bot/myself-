"""2D cartoon cast for The Extra Seat. Characters are drawn in unit space
(feet at y=0, a standing kid is ~1.0 tall) at 2x and downsampled, then cached."""
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

INK = (34, 22, 38, 255)

CAST = {
    "riya":    dict(kind="kid", skin=(205, 150, 112), hair=(40, 25, 30), style="ponytail", shirt=(246, 246, 250), bottom=(140, 34, 56), pinafore=True, band=(226, 60, 80), h=1.0),
    "arjun":   dict(kind="kid", skin=(186, 130, 92), hair=(26, 18, 22), style="short", shirt=(246, 246, 250), bottom=(44, 56, 100), h=0.86),
    "lakshmi": dict(kind="kid", skin=(214, 164, 126), hair=(30, 20, 26), style="braids", shirt=(246, 246, 250), bottom=(60, 96, 184), ribbon=(60, 112, 226), h=0.88),
    "boy":     dict(kind="kid", skin=(200, 152, 118), hair=(22, 16, 22), style="fringe", shirt=(236, 240, 246), bottom=(46, 56, 92), h=0.9),
    "k1":      dict(kind="kid", skin=(176, 122, 86), hair=(30, 20, 20), style="short", shirt=(96, 168, 98), bottom=(60, 60, 70), h=0.9),
    "k2":      dict(kind="kid", skin=(212, 160, 120), hair=(46, 28, 26), style="braids", shirt=(236, 186, 64), bottom=(150, 60, 120), ribbon=(230, 90, 120), h=0.9),
    "k3":      dict(kind="kid", skin=(196, 140, 100), hair=(20, 14, 18), style="short", shirt=(96, 146, 214), bottom=(50, 50, 60), h=0.92),
    "k4":      dict(kind="kid", skin=(220, 170, 130), hair=(54, 32, 28), style="ponytail", shirt=(230, 120, 90), bottom=(70, 70, 120), band=(90, 160, 230), h=0.9),
    "k5":      dict(kind="kid", skin=(170, 116, 82), hair=(24, 16, 18), style="short", shirt=(180, 120, 200), bottom=(60, 60, 70), h=0.88),
    "oldw":    dict(kind="old", skin=(186, 136, 102), hair=(206, 206, 212), saree=(238, 224, 196), border=(146, 32, 48), blouse=(146, 32, 48), h=1.0),
}

ARMS = {  # hand positions (unit space, relative to feet) for (left, right)
    "down":   ((-0.16, -0.37), (0.16, -0.37)),
    "point":  ((-0.16, -0.37), (0.40, -0.80)),
    "thumb":  ((-0.16, -0.37), (-0.26, -0.78)),
    "hug":    ((-0.38, -0.58), (0.38, -0.58)),
    "embrace": ((-0.10, -0.52), (0.18, -0.50)),
    "chest":  ((-0.05, -0.47), (0.05, -0.47)),
    "hold_r": ((-0.16, -0.37), (0.24, -0.33)),
    "hold_l": ((-0.24, -0.33), (0.16, -0.37)),
    "mouth":  ((-0.16, -0.37), (0.04, -0.70)),
    "curtain": ((-0.16, -0.37), (0.36, -0.86)),
    "blanket": ((-0.10, -0.40), (0.10, -0.40)),
    "lean":   ((-0.30, -0.50), (0.14, -0.40)),
}


def _draw(name, pose="down", expr="neutral", m=0.0, blink=False, look=0.0, lookv=0.0, back=False, sit=False, S=600):
    c = CAST[name]
    W, H = int(1.3 * S), int(1.55 * S)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ox, oy = 0.65 * S, 1.18 * S
    lw = max(2, int(S * 0.011))
    old = c["kind"] == "old"
    sy = 0.37 if sit else 0.0                        # sitting: upper body drops onto the seat (origin = seat)
    P = lambda x, y: (ox + x * S, oy + (y + sy) * S)
    Q = lambda x, y: (ox + x * S, oy + y * S)        # unshifted (for shins when sitting)

    def E(cx, cy, rx, ry, fill, ol=True, sh=True):
        f = P if sh else Q
        a, b = f(cx - rx, cy - ry), f(cx + rx, cy + ry)
        d.ellipse([a, b], fill=fill, outline=INK if ol else None, width=lw if ol else 0)

    def Poly(pts, fill, ol=True, sh=True):
        f = P if sh else Q
        d.polygon([f(*p) for p in pts], fill=fill, outline=INK if ol else None, width=lw if ol else 0)

    def Limb(a, b, w, col):
        pa, pb = P(*a), P(*b)
        d.line([pa, pb], fill=INK, width=int(w * S + 2 * lw))
        for p in (pa, pb):
            r = (w * S) / 2 + lw; d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK)
        d.line([pa, pb], fill=col, width=int(w * S))
        for p in (pa, pb):
            r = (w * S) / 2; d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=col)

    skin = c["skin"] + (255,)
    hcx, hcy, r = (0, -0.86, 0.13) if old else (0, -0.80, 0.165)
    hair = c["hair"] + (255,)
    style = "bun" if old else c["style"]
    (lhx, lhy), (rhx, rhy) = ARMS[pose]

    # ---- back hair
    if style == "ponytail" and not back:
        E(hcx + 0.95 * r, hcy + 0.15 * r, 0.32 * r, 0.70 * r, hair)
        E(hcx + 0.80 * r, hcy - 0.35 * r, 0.14 * r, 0.12 * r, c.get("band", (200, 50, 70)) + (255,))
    if style == "braids":
        for side in (-1, 1):
            for k in range(1, 5):
                E(hcx + side * 0.92 * r, hcy + (0.15 + k * 0.33) * r, 0.17 * r, 0.20 * r, hair)
            E(hcx + side * 0.92 * r, hcy + 1.85 * r, 0.20 * r, 0.12 * r, c.get("ribbon", (60, 110, 220)) + (255,))
    if style == "bun":
        E(hcx, hcy - 1.0 * r, 0.48 * r, 0.40 * r, hair)

    # ---- legs / lower body
    if old:
        if sit:
            Poly([(-0.17, -0.45), (0.17, -0.45), (0.25, -0.36), (0.22, -0.33), (-0.22, -0.33), (-0.25, -0.36)], c["saree"] + (255,))
            Poly([(-0.15, 0.0), (0.15, 0.0), (0.17, 0.27), (-0.17, 0.27)], c["saree"] + (255,), sh=False)
            Poly([(-0.168, 0.22), (0.168, 0.22), (0.17, 0.27), (-0.17, 0.27)], c["border"] + (255,), sh=False)
            E(-0.08, 0.29, 0.05, 0.022, skin, sh=False); E(0.08, 0.29, 0.05, 0.022, skin, sh=False)
        else:
            Poly([(-0.16, -0.46), (0.16, -0.46), (0.23, -0.02), (-0.23, -0.02)], c["saree"] + (255,))
            Poly([(-0.225, -0.08), (0.225, -0.08), (0.23, -0.02), (-0.23, -0.02)], c["border"] + (255,))
            E(-0.08, -0.01, 0.05, 0.02, skin); E(0.08, -0.01, 0.05, 0.02, skin)
    else:
        if sit:
            for sx in (-0.06, 0.06):
                Limb((sx, -0.30), (sx, -0.20), 0.055, skin)
                d.line([Q(sx, -0.02), Q(sx, 0.22)], fill=INK, width=int(0.055 * S + 2 * lw))
                d.line([Q(sx, -0.02), Q(sx, 0.22)], fill=skin, width=int(0.055 * S))
                E(sx * 1.1, 0.24, 0.05, 0.025, (30, 26, 30, 255), sh=False)
        else:
            for sx in (-0.06, 0.06):
                Limb((sx, -0.27), (sx, -0.05), 0.05, skin)
                Limb((sx, -0.11), (sx, -0.05), 0.05, (246, 246, 250, 255))
                E(sx * 1.1, -0.025, 0.055, 0.026, (30, 26, 30, 255))
        bot = c["bottom"] + (255,)
        if c["style"] in ("short", "fringe"):
            Poly([(-0.13, -0.39), (0.13, -0.39), (0.145, -0.24), (0.01, -0.24), (0, -0.29), (-0.01, -0.24), (-0.145, -0.24)], bot)
        else:
            Poly([(-0.14, -0.41), (0.14, -0.41), (0.21, -0.21), (-0.21, -0.21)], bot)

    # ---- torso
    if old:
        Poly([(-0.11, -0.71), (0.11, -0.71), (0.15, -0.43), (-0.15, -0.43)], c["blouse"] + (255,))
        Poly([(-0.12, -0.71), (-0.01, -0.71), (0.17, -0.44), (0.08, -0.40)], c["saree"] + (255,))
        d.line([P(-0.01, -0.71), P(0.17, -0.44)], fill=c["border"] + (255,), width=int(0.02 * S))
        sh_y, sh_x = -0.66, 0.11
    else:
        Poly([(-0.10, -0.645), (0.10, -0.645), (0.13, -0.37), (-0.13, -0.37)], c["shirt"] + (255,))
        if c.get("pinafore") and not back:
            Poly([(-0.075, -0.56), (0.075, -0.56), (0.11, -0.39), (-0.11, -0.39)], c["bottom"] + (255,))
            for sx in (-0.06, 0.06):
                d.line([P(sx, -0.645), P(sx, -0.56)], fill=c["bottom"] + (255,), width=int(0.025 * S))
        if not back:
            Poly([(-0.035, -0.645), (0, -0.60), (0.035, -0.645)], (230, 230, 236, 255))
        sh_y, sh_x = -0.60, 0.105

    # ---- arms
    sleeve = (c["blouse"] if old else c["shirt"]) + (255,)
    for sx, (hx, hy) in ((-sh_x, (lhx, lhy)), (sh_x, (rhx, rhy))):
        Limb((sx, sh_y), (hx, hy), 0.045, skin)
        E(sx * 1.05, sh_y + 0.035, 0.05, 0.055, sleeve)
        E(hx, hy, 0.032, 0.032, skin)

    # ---- neck + head
    Poly([(-0.03, hcy + 0.9 * r), (0.03, hcy + 0.9 * r), (0.03, sh_y - 0.03), (-0.03, sh_y - 0.03)], skin, ol=False)
    E(hcx, hcy, r, r * 1.02, skin)
    if not back:
        E(hcx - 1.0 * r, hcy + 0.08 * r, 0.14 * r, 0.2 * r, skin)
        E(hcx + 1.0 * r, hcy + 0.08 * r, 0.14 * r, 0.2 * r, skin)

    # ---- face
    if not back:
        eyes_hidden = style == "fringe"
        ey = hcy + 0.05 * r
        er = 0.15 if old else 0.19
        for sx in (-1, 1):
            ex = hcx + sx * 0.38 * r
            if eyes_hidden:
                continue
            if blink:
                a, b = P(ex - er * r, ey - 0.02 * r), P(ex + er * r, ey + 0.2 * r)
                d.arc([a, b], 10, 170, fill=INK, width=lw)
            else:
                E(ex, ey, er * r, er * 1.25 * r, (255, 255, 255, 255))
                pr = (0.08 if expr in ("scared", "surprised") else 0.115) * r
                E(ex + look * 0.07 * r, ey + lookv * 0.1 * r + 0.03 * r, pr, pr, (28, 20, 26, 255), ol=False)
                E(ex + look * 0.07 * r - 0.04 * r, ey + lookv * 0.1 * r - 0.03 * r, 0.035 * r, 0.035 * r, (255, 255, 255, 255), ol=False)
            # brows
            by = ey - (0.42 if expr in ("scared", "surprised") else 0.34) * r
            inner = {"sad": -0.10, "scared": -0.08, "cry": -0.10, "surprised": 0.0, "puzzled": 0.06 * sx}.get(expr, 0.03)
            d.line([P(ex - sx * 0.05 * r - sx * -0.14 * r, by + inner * r), P(ex + sx * 0.16 * r, by - inner * r * 0.4)], fill=INK, width=int(lw * 1.6))
        if old:
            for sx in (-1, 1):
                ex = hcx + sx * 0.38 * r
                d.ellipse([P(ex - 0.27 * r, ey - 0.27 * r), P(ex + 0.27 * r, ey + 0.27 * r)], outline=(90, 70, 60, 255), width=lw)
            d.line([P(hcx - 0.11 * r, ey), P(hcx + 0.11 * r, ey)], fill=(90, 70, 60, 255), width=lw)
            E(hcx, hcy - 0.45 * r, 0.06 * r, 0.06 * r, (200, 30, 40, 255), ol=False)
        if eyes_hidden:
            d.ellipse([P(hcx - 0.6 * r, ey - 0.05 * r), P(hcx - 0.15 * r, ey + 0.25 * r)], fill=(10, 10, 20, 255))
            d.ellipse([P(hcx + 0.15 * r, ey - 0.05 * r), P(hcx + 0.6 * r, ey + 0.25 * r)], fill=(10, 10, 20, 255))
        # nose
        d.arc([P(hcx - 0.07 * r, ey + 0.12 * r), P(hcx + 0.07 * r, ey + 0.3 * r)], 0, 180, fill=INK, width=lw)
        # cheeks
        if not old and style != "fringe":
            for sx in (-1, 1):
                E(hcx + sx * 0.62 * r, ey + 0.38 * r, 0.13 * r, 0.08 * r, (240, 120, 120, 110), ol=False)
        # tears
        if expr in ("cry", "cry_happy"):
            for sx in (-1, 1):
                ex = hcx + sx * 0.38 * r
                Poly([(ex - 0.05 * r, ey + 0.25 * r), (ex + 0.05 * r, ey + 0.25 * r), (ex + 0.03 * r, ey + 0.7 * r), (ex - 0.03 * r, ey + 0.7 * r)], (120, 190, 255, 230), ol=False)
        # mouth
        my = hcy + 0.52 * r
        if m > 0.05:
            h = (0.05 + 0.30 * m) * r
            E(hcx, my + h * 0.3, 0.13 * r + 0.04 * r * m, h, (112, 26, 42, 255))
            E(hcx, my + h * 0.9, 0.08 * r, h * 0.35, (230, 110, 120, 255), ol=False)
        elif expr in ("scared", "surprised"):
            E(hcx, my + 0.05 * r, 0.07 * r, 0.10 * r, (112, 26, 42, 255))
        elif expr in ("sad", "cry"):
            d.arc([P(hcx - 0.16 * r, my + 0.02 * r), P(hcx + 0.16 * r, my + 0.24 * r)], 200, 340, fill=INK, width=int(lw * 1.4))
        elif expr in ("happy", "cry_happy"):
            d.chord([P(hcx - 0.22 * r, my - 0.12 * r), P(hcx + 0.22 * r, my + 0.18 * r)], 0, 180, fill=(112, 26, 42, 255), outline=INK, width=lw)
        else:
            d.arc([P(hcx - 0.14 * r, my - 0.10 * r), P(hcx + 0.14 * r, my + 0.08 * r)], 20, 160, fill=INK, width=int(lw * 1.4))

    # ---- front hair
    R = 1.07 * r
    box = [P(hcx - R, hcy - R), P(hcx + R, hcy + R)]
    if back:
        d.ellipse(box, fill=hair, outline=INK, width=lw)
        if style == "ponytail":
            E(hcx, hcy + 0.6 * r, 0.30 * r, 0.75 * r, hair)
            E(hcx, hcy - 0.05 * r, 0.14 * r, 0.10 * r, c.get("band", (200, 50, 70)) + (255,))
        if style == "braids":
            for side in (-1, 1):
                E(hcx + side * 0.6 * r, hcy + 1.1 * r, 0.16 * r, 0.32 * r, hair)
    elif style == "fringe":
        d.chord(box, 160, 380, fill=hair, outline=INK, width=lw)
        for k in range(-3, 4):
            x = hcx + k * 0.22 * r
            Poly([(x - 0.13 * r, hcy - 0.1 * r), (x + 0.13 * r, hcy - 0.1 * r), (x + 0.02 * r, hcy + 0.30 * r)], hair, ol=False)
    elif style == "short":
        d.chord(box, 192, 348, fill=hair, outline=INK, width=lw)
        for k in range(-2, 3):
            x = hcx + k * 0.3 * r
            Poly([(x - 0.18 * r, hcy - 0.85 * r), (x + 0.18 * r, hcy - 0.85 * r), (x + 0.05 * r, hcy - 1.25 * r)], hair, ol=False)
    elif style == "bun":
        d.chord(box, 188, 352, fill=hair, outline=INK, width=lw)
    else:  # girls: ponytail / braids
        d.chord(box, 192, 348, fill=hair, outline=INK, width=lw)
        for sx in (-1, 1):
            Poly([(hcx + sx * R * 0.99, hcy - 0.15 * r), (hcx + sx * R * 1.02, hcy + 0.55 * r), (hcx + sx * 0.80 * r, hcy + 0.45 * r), (hcx + sx * 0.78 * r, hcy - 0.3 * r)], hair, ol=False)
        if style == "braids":
            d.line([P(hcx, hcy - R), P(hcx, hcy - 0.3 * r)], fill=(70, 50, 56, 255), width=lw)
        for k in range(-2, 3):
            x = hcx + k * 0.24 * r
            Poly([(x - 0.14 * r, hcy - 0.36 * r), (x + 0.14 * r, hcy - 0.36 * r), (x + 0.03 * r, hcy - 0.12 * r)], hair, ol=False)
    return img, (ox, oy)


@lru_cache(maxsize=600)
def sprite(name, pose="down", expr="neutral", m=0.0, blink=False, look=0.0, lookv=0.0, back=False, sit=False, px=600, ghost=False):
    """Returns (RGBA image at final size, (anchor_x, anchor_y)). px = standing height in output pixels."""
    c = CAST[name]
    S = px * 2 / c["h"] * c["h"]  # unit height -> px (kids' unit already reflects h via px choice)
    S = int(px * 2)
    img, (ax, ay) = _draw(name, pose, expr, m, blink, look, lookv, back, sit, S)
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    ax, ay = ax / 2, ay / 2
    if ghost:
        a = np.asarray(img).astype(np.float32)
        tint = np.array([170, 236, 255], np.float32)
        a[..., :3] = a[..., :3] * 0.35 + tint * 0.65
        a[..., 3] *= 0.62
        g = Image.fromarray(a.astype(np.uint8))
        glow = Image.new("RGBA", img.size, (120, 220, 255, 0))
        glow.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(px * 0.03)).point(lambda v: int(v * 0.55)))
        glow.alpha_composite(g)
        img = glow
    return img, (ax, ay)


def place(canvas, name, x, y, px, **kw):
    """Paste a character with its feet (or seat when sit=True) at canvas point (x, y)."""
    img, (ax, ay) = sprite(name, px=int(px), **kw)
    canvas.alpha_composite(img, (int(x - ax), int(y - ay))) if canvas.mode == "RGBA" else canvas.paste(img, (int(x - ax), int(y - ay)), img)


if __name__ == "__main__":
    import sys
    sheet = Image.new("RGB", (2400, 1700), (60, 64, 80))
    row = [("riya", {}), ("arjun", {"expr": "scared", "pose": "point"}), ("lakshmi", {"expr": "happy"}), ("oldw", {"expr": "sad", "pose": "chest"}),
           ("boy", {}), ("k1", {"m": 0.8}), ("k2", {"blink": True}), ("riya", {"back": True})]
    for i, (n, kw) in enumerate(row):
        place(sheet, n, 150 + i * 300, 760, 640, **kw)
    row2 = [("oldw", {"sit": True, "pose": "chest", "expr": "cry"}), ("lakshmi", {"ghost": True, "pose": "hug", "expr": "happy"}), ("riya", {"expr": "surprised", "pose": "curtain"}),
            ("arjun", {"m": 0.6, "expr": "scared", "pose": "lean"}), ("riya", {"sit": True, "expr": "sad", "m": 0.4}), ("boy", {"sit": True, "ghost": True}), ("oldw", {"pose": "hug", "expr": "cry_happy"})]
    for i, (n, kw) in enumerate(row2):
        place(sheet, n, 170 + i * 330, 1500 if not kw.get("sit") else 1300, 640, **kw)
    sheet.save(sys.argv[1])
