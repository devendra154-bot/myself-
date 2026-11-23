"""Pendrive falls from an alien lab, through a vortex, onto the real surface from the photo.
Usage: python3 portal.py <prep_dir> <out.mp4> [stills]"""
import sys, os, math, random, wave, subprocess
from functools import lru_cache
from multiprocessing import Pool
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

PREP, OUT = sys.argv[1], sys.argv[2]
STILLS = len(sys.argv) > 3 and sys.argv[3] == "stills"
W, H, FPS, SR = 1080, 1920, 30, 48000
DUR = 14.0
N = int(DUR * FPS)
# timeline (s)
T_ALARM, T_BEAM_OFF, T_DROP, T_TUNNEL, T_ARRIVE, T_OUT, T_HIT, T_B1, T_B2, T_SETTLE = 4.0, 4.7, 5.0, 6.0, 8.4, 8.75, 9.55, 10.05, 10.4, 10.6

ease = lambda x: x * x * (3 - 2 * x)
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
seg = lambda t, a, b: clamp((t - a) / (b - a))

# ---------------------------------------------------------------- assets
PHOTO = np.asarray(Image.open(f"{PREP}/photo_916.png").convert("RGB")).astype(np.float32) / 255
PLATE = np.asarray(Image.open(f"{PREP}/plate.png").convert("RGB")).astype(np.float32) / 255
_d = np.asarray(Image.open(f"{PREP}/drive_full.png")).astype(np.float32) / 255
BX0, BY0, BX1, BY1 = 14, 781, 988, 1207
SPR = _d[BY0:BY1, BX0:BX1].copy()
SPR[..., :3] *= SPR[..., 3:4]                      # premultiplied
SCX, SCY = (BX1 - BX0) / 2, (BY1 - BY0) / 2
HOME = (BX0 + SCX, BY0 + SCY)                       # drive centre in the photo


def warp_drive(x, y, s, ang, squash=1.0, blur=(0, 0), tint=(1, 1, 1)):
    """Return premultiplied RGBA (H,W,4) of the drive at centre (x,y)."""
    def one(dx, dy):
        a = math.radians(ang)
        ca, sa = math.cos(a), math.sin(a)
        sx, sy = s, s * squash
        M = np.array([[sx * ca, -sy * sa, 0], [sx * sa, sy * ca, 0]], np.float32)
        M[:, 2] = np.array([x + dx, y + dy]) - M[:, :2] @ np.array([SCX, SCY])
        return cv2.warpAffine(SPR, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    k = int(min(9, max(1, math.hypot(*blur) / 6)))
    if k == 1:
        out = one(0, 0)
    else:
        out = sum(one(blur[0] * (i / (k - 1) - 0.5), blur[1] * (i / (k - 1) - 0.5)) for i in range(k)) / k
    out[..., :3] *= np.array(tint, np.float32)
    return out


def over(dst, src):
    return dst * (1 - src[..., 3:4]) + src[..., :3]


def add_glow(img, col, mask, sigma, k):
    g = cv2.GaussianBlur(mask, (0, 0), sigma)
    return img + g[..., None] * np.array(col, np.float32) * k


@lru_cache(None)
def polar(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    x -= w / 2; y -= h / 2
    return np.sqrt(x * x + y * y), np.arctan2(y, x)


def swirl(w, h, t, c1=(0.1, 0.5, 1.0), c2=(0.3, 1.0, 0.8), arms=4, speed=5.0, edge=True):
    r, th = polar(w, h)
    rn = r / (min(w, h) / 2)
    v = 0.5 + 0.5 * np.sin(th * arms + np.log(rn + 0.05) * 7 - t * speed)
    v2 = 0.5 + 0.5 * np.sin(th * (arms + 3) - np.log(rn + 0.05) * 11 + t * speed * 0.7)
    core = np.exp(-rn * 3.5)
    col = (v[..., None] * np.array(c1) + v2[..., None] * np.array(c2) * 0.6) * (0.4 + 0.6 * rn[..., None]) + core[..., None] * 1.4
    a = np.clip((1.0 - rn) * 6, 0, 1) if edge else np.ones_like(rn)
    return np.clip(col, 0, 2).astype(np.float32), a.astype(np.float32)


# ---------------------------------------------------------------- lab background
LW, LH = int(W * 1.15), int(H * 1.15)


def glyph_row(d, x, y, n, sz, col, rr):
    for i in range(n):
        gx = x + i * sz * 1.3
        for _ in range(rr.randint(2, 4)):
            pts = [(gx + rr.random() * sz, y + rr.random() * sz) for _ in range(2)]
            d.line(pts, fill=col, width=max(2, int(sz / 8)))
        if rr.random() < 0.4:
            d.ellipse([gx + sz * 0.3, y + sz * 0.3, gx + sz * 0.6, y + sz * 0.6], outline=col, width=2)


@lru_cache(None)
def lab_static():
    img = Image.new("RGB", (LW, LH))
    a = np.linspace(0, 1, LH)[:, None, None]
    arr = np.array([8, 14, 26])[None, None] * (1 - a) + np.array([4, 6, 12])[None, None] * a
    img = Image.fromarray(np.repeat(arr, LW, 1).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")
    # back wall panels
    for i in range(9):
        x = i * LW / 8
        d.line([(x, 0), (x, LH * 0.72)], fill=(30, 50, 70, 255), width=6)
    for j in range(8):
        y = j * 160
        d.line([(0, y), (LW, y)], fill=(22, 38, 54, 255), width=4)
    # floor
    d.polygon([(0, LH * 0.72), (LW, LH * 0.72), (LW, LH), (0, LH)], fill=(12, 18, 26, 255))
    for i in range(-10, 11):
        d.line([(LW / 2 + i * 60, LH * 0.72), (LW / 2 + i * 260, LH)], fill=(30, 60, 80, 120), width=3)
    for j in range(8):
        y = LH * 0.72 + (j ** 1.7) * 14
        d.line([(0, y), (LW, y)], fill=(30, 60, 80, 110), width=2)
    # glowing strips on pillars
    for x in (70, LW - 110):
        d.rectangle([x, 0, x + 40, LH * 0.72], fill=(20, 30, 40, 255))
        d.rectangle([x + 14, 60, x + 26, LH * 0.70], fill=(80, 255, 170, 255))
    # specimen tank (left)
    d.rounded_rectangle([140, 500, 420, 1500], radius=120, fill=(20, 90, 60, 200), outline=(120, 255, 200, 255), width=6)
    d.ellipse([200, 800, 360, 1000], fill=(40, 140, 90, 220))
    d.ellipse([230, 860, 270, 890], fill=(200, 255, 120, 255)); d.ellipse([290, 860, 330, 890], fill=(200, 255, 120, 255))
    d.rectangle([120, 1480, 440, 1560], fill=(40, 50, 60, 255))
    # frosted glass panel with alien silhouette (right)
    d.rectangle([760, 380, 1180, 1420], fill=(60, 90, 110, 120), outline=(120, 200, 230, 200), width=5)
    sil = Image.new("RGBA", (LW, LH), (0, 0, 0, 0)); ds = ImageDraw.Draw(sil)
    cx = 975
    ds.ellipse([cx - 110, 560, cx + 110, 800], fill=(5, 8, 12, 230))              # big head
    ds.rectangle([cx - 22, 780, cx + 22, 880], fill=(5, 8, 12, 230))              # neck
    ds.polygon([(cx - 150, 1420), (cx - 120, 900), (cx - 40, 860), (cx + 40, 860), (cx + 120, 900), (cx + 150, 1420)], fill=(5, 8, 12, 230))
    for sx in (-1, 1):
        ds.line([(cx + sx * 125, 920), (cx + sx * 175, 1180), (cx + sx * 150, 1320)], fill=(5, 8, 12, 230), width=34)
    sil = sil.filter(ImageFilter.GaussianBlur(9))
    img.paste(sil, (0, 0), sil)
    # holo screens
    rr = random.Random(4)
    for (x0, y0, x1, y1) in ((470, 300, 760, 520), (180, 160, 470, 360)):
        d.rectangle([x0, y0, x1, y1], fill=(40, 200, 255, 40), outline=(90, 220, 255, 220), width=3)
        for k in range(4):
            glyph_row(d, x0 + 18, y0 + 20 + k * 48, 7, 26, (120, 230, 255, 220), rr)
    # pedestal
    cx, ty = LW / 2, 1520
    d.rectangle([cx - 230, ty, cx + 230, ty + 260], fill=(30, 40, 52, 255))
    d.ellipse([cx - 230, ty + 200, cx + 230, ty + 320], fill=(24, 32, 42, 255))
    d.ellipse([cx - 230, ty - 60, cx + 230, ty + 60], fill=(40, 56, 70, 255), outline=(90, 230, 255, 255), width=8)
    return np.asarray(img).astype(np.float32) / 255


PED = (LW / 2, 1520)          # pedestal top centre (lab canvas)
FLOAT = (LW / 2, 990)         # drive float point (lab canvas)


def lab_frame(t):
    img = lab_static().copy()
    rr = random.Random(int(t * FPS))
    # animated: bubbles in tank
    L = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(L, "RGBA")
    for i in range(14):
        ph = (i * 0.137) % 1; u = (t * 0.25 + ph) % 1
        x = 180 + (i * 53) % 220 + math.sin(t * 2 + i) * 10; y = 1460 - u * 920
        d.ellipse([x - 8, y - 8, x + 8, y + 8], outline=(200, 255, 220, 200), width=3)
    # alien eyes glow (blink)
    eye = 0 if (int(t * FPS) % 110) < 4 else 1
    if eye:
        for sx in (-1, 1):
            d.ellipse([975 + sx * 55 - 26, 680, 975 + sx * 55 + 26, 708], fill=(120, 255, 140, 230))
    # holo waveform
    pts = [(480 + k * 7, 470 + math.sin(k * 0.3 + t * 6) * 22 * math.sin(k * 0.05 + t)) for k in range(40)]
    d.line(pts, fill=(140, 240, 255, 230), width=3)
    img = np.asarray(L).astype(np.float32) / 255
    alarm = 0.0
    if t > T_ALARM:
        alarm = (0.5 + 0.5 * math.sin((t - T_ALARM) * 2 * math.pi * 2.2)) * 0.55
    # beam
    beam_on = t < T_BEAM_OFF or (t < T_BEAM_OFF + 0.3 and rr.random() < 0.5)
    if beam_on:
        cone = np.zeros((LH, LW), np.float32)
        poly = np.array([[PED[0] - 210, PED[1]], [PED[0] + 210, PED[1]], [PED[0] + 130, 560], [PED[0] - 130, 560]], np.int32)
        cv2.fillPoly(cone, [poly], 1.0)
        cone = cv2.GaussianBlur(cone, (0, 0), 25) * (0.30 + 0.05 * math.sin(t * 9))
        img += cone[..., None] * np.array([0.3, 0.9, 1.0])
    # portal on the pedestal
    po = seg(t, T_BEAM_OFF, T_DROP)
    if po > 0:
        pw, ph = int(440 * ease(po)) + 2, int(120 * ease(po)) + 2
        col, a = swirl(440, 440, t)
        col = cv2.resize(col, (pw, ph)); a = cv2.resize(a, (pw, ph))[..., None]
        x0, y0 = int(PED[0] - pw / 2), int(PED[1] - ph / 2)
        reg = img[y0:y0 + ph, x0:x0 + pw]
        img[y0:y0 + ph, x0:x0 + pw] = reg * (1 - a) + col * a
        m = np.zeros((LH, LW), np.float32); m[y0:y0 + ph, x0:x0 + pw] = a[..., 0]
        img = add_glow(img, (0.2, 0.6, 1.0), m, 60, 1.5 * ease(po))
    # alarm red wash
    if alarm > 0:
        img = img * (1 - alarm * 0.35) + np.array([0.9, 0.05, 0.05]) * alarm * 0.35
    # (drive rendered in lab canvas coords)
    if t < T_TUNNEL:
        x = FLOAT[0]
        if t < T_DROP:
            y = FLOAT[1] + math.sin(t * 2.2) * 18; s = 0.62; ang = math.sin(t * 0.9) * 14 - 8; blur = (0, 0)
        else:
            u = t - T_DROP
            y = min(PED[1], FLOAT[1] + 0.5 * 2400 * u * u)
            s = 0.62 * (1 - 0.75 * seg(y, FLOAT[1] + 250, PED[1]))
            ang = -8 + u * 200; blur = (0, 2400 * u * 0.033)
        dr = warp_lab(x, y, s, ang, blur)
        if t >= T_DROP and y > PED[1] - 40:
            # vanish into the portal mouth
            fade = seg(y, PED[1] - 40, PED[1])
            dr *= (1 - fade)
        img = over(img, dr)
        # scan laser
        if t < T_ALARM:
            sy = FLOAT[1] + math.sin(t * 2.6) * 170
            m = np.zeros((LH, LW), np.float32)
            cv2.line(m, (int(FLOAT[0] - 360), int(sy)), (int(FLOAT[0] + 360), int(sy)), 1.0, 4)
            img += m[..., None] * np.array([0.4, 1.0, 0.5])
            img = add_glow(img, (0.3, 1.0, 0.4), m, 14, 2.0)
    # floating dust
    for i in range(40):
        ph = (i * 0.0731) % 1
        x = int((i * 97) % LW); y = int((LH * (1 - ((t * 0.04 + ph) % 1))))
        cv2.circle(img, (x, y), 2, (0.6, 0.8, 0.9), -1)
    return img


def warp_lab(x, y, s, ang, blur):
    def one(dx, dy):
        a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
        M = np.array([[s * ca, -s * sa, 0], [s * sa, s * ca, 0]], np.float32)
        M[:, 2] = np.array([x + dx, y + dy]) - M[:, :2] @ np.array([SCX, SCY])
        return cv2.warpAffine(SPR, M, (LW, LH))
    k = int(min(9, max(1, math.hypot(*blur) / 6)))
    out = one(0, 0) if k == 1 else sum(one(blur[0] * (i / (k - 1) - .5), blur[1] * (i / (k - 1) - .5)) for i in range(k)) / k
    out[..., :3] *= np.array([0.85, 1.0, 1.08], np.float32)
    return out


def lab_cam(t):
    """crop (cx, cy, zoom) in lab canvas"""
    z = 1.15 * (1.0 + 0.06 * ease(seg(t, 0, T_DROP)))
    cx, cy = LW / 2, 1050
    if t > T_DROP:
        u = ease(seg(t, T_DROP, T_TUNNEL))
        cy = 1050 + (PED[1] - 1050) * u
        z = z * (1 + 2.2 * u ** 2)
    return cx, cy, z


# ---------------------------------------------------------------- tunnel
def tunnel_frame(t):
    u = (t - T_TUNNEL) / (T_ARRIVE - T_TUNNEL)
    col, _ = swirl(W, H, t * 1.6, c1=(0.1, 0.35, 1.0), c2=(0.2, 1.0, 0.9), arms=5, speed=7, edge=False)
    img = col * 0.75
    rr = random.Random(7)
    m = np.zeros((H, W), np.float32)
    for i in range(70):
        ang = rr.random() * 2 * math.pi; ph = rr.random()
        r0 = ((t * 1.4 + ph) % 1) ** 2 * 1400
        r1 = r0 + 80 + r0 * 0.4
        p0 = (int(W / 2 + math.cos(ang) * r0), int(H / 2 + math.sin(ang) * r0))
        p1 = (int(W / 2 + math.cos(ang) * r1), int(H / 2 + math.sin(ang) * r1))
        cv2.line(m, p0, p1, 1.0, 3)
    img += m[..., None] * np.array([0.8, 0.95, 1.0])
    img = add_glow(img, (0.3, 0.7, 1.0), m, 8, 0.8)
    shake = (math.sin(t * 50) * 10, math.cos(t * 43) * 10)
    ang = (t - T_TUNNEL) * 260
    squash = 0.55 + 0.45 * abs(math.cos(math.radians(ang * 0.7)))
    s = 0.45 + 0.08 * math.sin(t * 6)
    dr = warp_drive(W / 2 + shake[0], H / 2 + shake[1], s, ang, squash, tint=(0.8, 0.95, 1.1))
    img = add_glow(img, (0.3, 0.8, 1.0), dr[..., 3], 30, 1.6)
    img = over(img, dr)
    # sparks trailing
    for i in range(30):
        ph = rr.random(); a = rr.random() * 2 * math.pi
        k = (t * 2.5 + ph) % 1
        x = W / 2 + math.cos(a) * k * 500; y = H / 2 + math.sin(a) * k * 500 - k * 200
        cv2.circle(img, (int(x), int(y)), 3, (1.4, 0.9, 0.5), -1)
    fl = max(seg(t, T_TUNNEL, T_TUNNEL + 0.25) and (1 - seg(t, T_TUNNEL, T_TUNNEL + 0.25)), seg(t, T_ARRIVE - 0.2, T_ARRIVE))
    return img * (1 - fl) + fl * 1.2


# ---------------------------------------------------------------- arrival on the real surface
PORTAL2 = (540, 230)


def drive_path(t):
    """centre x,y, scale, angle, height(0..1) on the surface shot"""
    hx, hy = HOME
    if t < T_OUT:
        return None
    if t < T_HIT:
        u = seg(t, T_OUT, T_HIT)
        y = PORTAL2[1] + (hy - PORTAL2[1]) * u ** 2
        return hx + (PORTAL2[0] - hx) * (1 - u) ** 1.5, y, 0.55 + 0.47 * u, 40 * (1 - u) ** 2 - 6 * u, 1 - u, (0, 900 * u * 0.033 * 2)
    if t < T_B1:
        u = seg(t, T_HIT, T_B1); h = 4 * u * (1 - u)
        return hx + 8 * u, hy - 90 * h, 1.0 + 0.03 * h, -6 + 10 * u, h * 0.15, (0, 0)
    if t < T_B2:
        u = seg(t, T_B1, T_B2); h = 4 * u * (1 - u)
        return hx + 8 - 6 * u, hy - 28 * h, 1.0 + 0.01 * h, 4 - 5 * u, h * 0.05, (0, 0)
    u = ease(seg(t, T_B2, T_SETTLE))
    return hx + 2 * (1 - u), hy, 1.0, -1 * (1 - u), 0.0, (0, 0)


def smoke(img, t, x, y, a):
    if a <= 0:
        return img
    m = np.zeros((H, W), np.float32)
    rr = random.Random(3)
    for i in range(16):
        ph = rr.random(); u = ((t - T_HIT) * 0.35 + ph) % 1
        px = x + rr.uniform(-280, 280) + math.sin(u * 5 + i) * 40
        py = y - 40 - u * 520
        cv2.circle(m, (int(px), int(py)), int(30 + 70 * u), float(math.sin(u * math.pi) * 0.5), -1)
    m = cv2.GaussianBlur(m, (0, 0), 30) * a
    return img * (1 - m[..., None] * 0.7) + m[..., None] * 0.92 * 0.7


def surface_frame(t):
    img = PLATE.copy()
    # portal above
    po = min(seg(t, T_ARRIVE, T_ARRIVE + 0.35), 1 - seg(t, T_HIT + 0.4, T_SETTLE + 0.5))
    light = 0.0
    if po > 0:
        pw, ph = int(560 * ease(po)) + 2, int(170 * ease(po)) + 2
        col, a = swirl(560, 560, t, arms=4, speed=6)
        col = cv2.resize(col, (pw, ph)); a = cv2.resize(a, (pw, ph))[..., None]
        x0, y0 = int(PORTAL2[0] - pw / 2), int(PORTAL2[1] - ph / 2)
        img[y0:y0 + ph, x0:x0 + pw] = img[y0:y0 + ph, x0:x0 + pw] * (1 - a) + col * a
        m = np.zeros((H, W), np.float32); m[y0:y0 + ph, x0:x0 + pw] = a[..., 0]
        img = add_glow(img, (0.15, 0.45, 1.0), m, 120, 1.2 * po)
        light = po
    # blue light spill on surface
    if light > 0:
        r, _ = polar(W, H)
        yy = np.arange(H)[:, None]
        spill = np.exp(-((np.arange(W)[None] - 540) ** 2) / (2 * 380 ** 2)) * np.exp(-((yy - 700) ** 2) / (2 * 600 ** 2))
        img = img * (1 - 0.25 * light * spill[..., None]) + spill[..., None] * np.array([0.2, 0.45, 1.0]) * 0.35 * light
    p = drive_path(t)
    if p:
        x, y, s, ang, h, blur = p
        # contact shadow
        shadow = warp_drive(HOME[0] + 10 + (x - HOME[0]) * 0.3, HOME[1] + 18, s, ang)[..., 3]
        sg = 10 + 70 * h
        shadow = cv2.GaussianBlur(shadow, (0, 0), sg) * (0.45 * (1 - h) ** 2.2)
        img *= (1 - shadow[..., None])
        dr = warp_drive(x, y, s, ang, blur=blur)
        if t < T_HIT + 0.3:
            img = add_glow(img, (0.2, 0.6, 1.0), dr[..., 3], 25, 0.9 * (1 - seg(t, T_HIT, T_HIT + 0.3)))
        img = over(img, dr)
    # crossfade to the real photo once settled
    cf = ease(seg(t, T_SETTLE, T_SETTLE + 0.6))
    if cf > 0:
        img = img * (1 - cf) + PHOTO * cf
    # impact: dust ring + sparks + debris
    if T_HIT <= t < T_HIT + 0.9:
        u = seg(t, T_HIT, T_HIT + 0.9)
        m = np.zeros((H, W), np.float32)
        cv2.ellipse(m, (int(HOME[0]), int(HOME[1] + 120)), (int(200 + 500 * u), int(60 + 150 * u)), 0, 0, 360, float(1 - u), int(40 + 60 * u))
        m = cv2.GaussianBlur(m, (0, 0), 25)
        img = img * (1 - m[..., None] * 0.5) + m[..., None] * np.array([0.95, 0.93, 0.9]) * 0.5
        rr = random.Random(9)
        for i in range(40):
            a = rr.uniform(math.pi * 1.05, math.pi * 1.95); sp = rr.uniform(300, 1100)
            x = HOME[0] + rr.uniform(-300, 300) + math.cos(a) * sp * u * 0.9
            y = HOME[1] + 60 + math.sin(a) * sp * u * 0.9 + 1600 * (u * 0.9) ** 2
            cv2.circle(img, (int(x), int(y)), 3, (1.5, 1.0, 0.55), -1)
    img = smoke(img, t, HOME[0], HOME[1], seg(t, T_HIT, T_HIT + 0.6) * (1 - seg(t, 12.6, 13.8)))
    return img


# ---------------------------------------------------------------- grade
@lru_cache(None)
def vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = ((x - W / 2) / (W * 0.75)) ** 2 + ((y - H / 2) / (H * 0.75)) ** 2
    return (1 - 0.55 * np.clip(d, 0, 1) ** 1.3)[..., None]


def grade(img, f, bloom=True):
    if bloom:
        br = np.clip(img - 0.75, 0, None)
        img = img + cv2.GaussianBlur(br, (0, 0), 22) * 1.2
    img = np.clip(img, 0, 1.5)
    lum = img.mean(-1, keepdims=True)
    img = img + (np.array([-0.025, 0.0, 0.035]) * (1 - lum) + np.array([0.035, 0.012, -0.03]) * lum)   # teal shadows, warm highlights
    img = (img - 0.5) * 1.08 + 0.5
    img *= vignette()
    rng = np.random.default_rng(f)
    img += rng.normal(0, 0.018, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1)
    img[:110] = 0; img[-110:] = 0
    return np.clip(img, 0, 1)


def frame(f):
    t = f / FPS
    if t < T_TUNNEL:
        img = lab_frame(t)
        cx, cy, z = lab_cam(t)
        cw, ch = W * 1.15 / z, H * 1.15 / z
        x0 = int(np.clip(cx - cw / 2, 0, LW - cw)); y0 = int(np.clip(cy - ch / 2, 0, LH - ch))
        img = cv2.resize(img[y0:y0 + int(ch), x0:x0 + int(cw)], (W, H), interpolation=cv2.INTER_LINEAR)
        img = img * (1 - seg(t, T_TUNNEL - 0.25, T_TUNNEL)) + seg(t, T_TUNNEL - 0.25, T_TUNNEL) * np.array([0.6, 0.85, 1.2])
    elif t < T_ARRIVE:
        img = tunnel_frame(t)
    else:
        img = surface_frame(t)
        fl = 1 - seg(t, T_ARRIVE, T_ARRIVE + 0.3)
        img = img * (1 - fl) + fl * 1.2
        # slow push-in + impact shake
        z = 1 + 0.06 * ease(seg(t, T_SETTLE, DUR))
        sx = sy = 0
        if T_HIT <= t < T_HIT + 0.3:
            k = 1 - seg(t, T_HIT, T_HIT + 0.3); sx, sy = math.sin(t * 90) * 14 * k, math.cos(t * 77) * 14 * k
        if z > 1.0005 or sx or sy:
            M = np.array([[z, 0, (1 - z) * HOME[0] + sx], [0, z, (1 - z) * HOME[1] + sy]], np.float32)
            img = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    img = grade(img, f, bloom=t < T_ARRIVE + 0.5)
    fi = seg(t, 0, 0.6); fo = 1 - seg(t, DUR - 0.9, DUR)
    img *= min(fi, fo)
    return (img * 255).astype(np.uint8)


# ---------------------------------------------------------------- sound
def sound(path):
    n = int(DUR * SR); t = np.arange(n) / SR
    r = np.random.default_rng(2)
    out = np.zeros(n, np.float32)
    def add(at, sig, g=1.0):
        a = int(at * SR); b = min(n, a + len(sig))
        if a < n: out[a:b] += sig[:b - a] * g
    def noise(m, sm=1):
        x = r.standard_normal(m)
        return np.convolve(x, np.ones(sm) / sm, "same") if sm > 1 else x
    def env(m, a=0.02, rel=0.3):
        e = np.ones(m); A, R = int(a * SR), min(m, int(rel * SR)); e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R); return e
    # lab hum + electrical buzz
    lab = (t < T_TUNNEL)
    out += lab * (0.25 * np.sin(2 * np.pi * 50 * t) + 0.08 * np.sign(np.sin(2 * np.pi * 100 * t)) * 0.3 + 0.05 * noise(n, 30) * 3)
    # cinematic pad
    pad = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 130.8 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7))
    out += 0.12 * pad * np.clip(t / 2, 0, 1)
    # scanner beeps + sweep
    for k, at in enumerate(np.arange(0.8, T_ALARM, 0.55)):
        m = int(0.09 * SR); tt = np.arange(m) / SR
        add(at, np.sin(2 * np.pi * (1500 + 300 * (k % 3)) * tt) * np.exp(-tt * 30), 0.25)
    # alarm siren
    seg_ = (t >= T_ALARM) & (t < T_TUNNEL)
    f_ = 700 + 250 * (np.sin(2 * np.pi * 2.2 * (t - T_ALARM)) > 0)
    out += seg_ * 0.22 * np.sign(np.sin(2 * np.pi * np.cumsum(f_) / SR)) * 0.6
    # beam power-down
    m = int(0.6 * SR); tt = np.arange(m) / SR
    add(T_BEAM_OFF, np.sin(2 * np.pi * np.cumsum(400 * np.exp(-tt * 5) + 40) / SR) * np.exp(-tt * 3), 0.5)
    # portal open whoosh (rising)
    m = int(1.6 * SR); tt = np.arange(m) / SR
    add(T_BEAM_OFF, noise(m, 12) * 3 * (tt / 1.6) ** 2 * env(m, 0.01, 0.2), 0.5)
    add(T_BEAM_OFF, np.sin(2 * np.pi * np.cumsum(60 + 300 * (tt / 1.6) ** 2) / SR) * (tt / 1.6) * 0.8, 0.5)
    # tunnel roar
    m = int((T_ARRIVE - T_TUNNEL) * SR); tt = np.arange(m) / SR
    roar = noise(m, 25) * 5 * env(m, 0.05, 0.3) + 0.6 * np.sin(2 * np.pi * (35 + 10 * np.sin(tt * 3)) * tt)
    add(T_TUNNEL, roar, 0.6)
    # transition booms
    def boom(d=2.5, f0=48):
        m = int(d * SR); tt = np.arange(m) / SR
        return (np.sin(2 * np.pi * f0 * tt * (1 - 0.3 * tt / d)) * np.exp(-tt * 2.2) + noise(m, 6) * np.exp(-tt * 18) * 0.6)
    add(T_TUNNEL, boom(), 0.9); add(T_ARRIVE, boom(), 0.8)
    # fall whistle
    m = int((T_HIT - T_OUT) * SR); tt = np.arange(m) / SR
    add(T_OUT, np.sin(2 * np.pi * np.cumsum(1800 - 1200 * tt / tt[-1]) / SR) * 0.25 * (tt / tt[-1]) + noise(m, 8) * (tt / tt[-1]) ** 2 * 0.8, 0.5)
    # impact: thud + plastic clacks
    def clack(g=1.0):
        m = int(0.12 * SR); tt = np.arange(m) / SR
        return (np.sin(2 * np.pi * 2300 * tt) * 0.6 + np.sin(2 * np.pi * 3700 * tt) * 0.4 + noise(m) * 0.5) * np.exp(-tt * 45) * g
    add(T_HIT, boom(1.6, 60), 1.0); add(T_HIT, clack(), 0.8)
    add(T_B1, clack(), 0.55); add(T_B2, clack(), 0.35); add(T_SETTLE - 0.02, clack(), 0.15)
    # sparks crackle + steam hiss
    m = int(1.0 * SR); add(T_HIT, noise(m) * (r.random(m) > 0.985) * np.exp(-np.arange(m) / SR * 3), 0.5)
    m = int(3.5 * SR); tt = np.arange(m) / SR
    hiss = (noise(m) - noise(m, 3)) * env(m, 0.3, 1.5) * 0.4
    add(T_HIT + 0.3, hiss, 0.5)
    # tail: soft low chord
    m = int(4 * SR); tt = np.arange(m) / SR
    add(T_SETTLE + 0.3, sum(np.sin(2 * np.pi * fq * tt) for fq in (110, 164.8, 220)) * env(m, 1.0, 2.0) * 0.12, 1.0)
    fade = np.ones(n); fo = int(1.0 * SR); fade[-fo:] = np.linspace(1, 0, fo)
    out *= fade
    out = out / np.abs(out).max() * 0.89
    st = np.stack([out, np.roll(out, int(0.012 * SR)) * 0.95], 1)    # light stereo width
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    if STILLS:
        ts = [0.5, 2.0, 3.6, 4.4, 4.9, 5.4, 5.8, 6.5, 7.6, 8.6, 9.2, 9.6, 9.9, 10.3, 11.5, 13.2]
        with Pool(4) as p:
            fr = p.map(frame, [int(x * FPS) for x in ts])
        th = [Image.fromarray(a).resize((216, 384)) for a in fr]
        sheet = Image.new("RGB", (8 * 216, 2 * 384))
        for i, im in enumerate(th):
            sheet.paste(im, ((i % 8) * 216, (i // 8) * 384))
        sheet.save(OUT)
        sys.exit()
    tmp = OUT + ".noaudio.mp4"
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    with Pool(4) as p:
        for i, fr in enumerate(p.imap(frame, range(N), chunksize=4)):
            enc.stdin.write(fr.tobytes())
            if i % 60 == 0:
                print(f"frame {i}/{N}", flush=True)
    enc.stdin.close(); enc.wait()
    sound(OUT + ".wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-i", OUT + ".wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], check=True)
    os.remove(tmp); os.remove(OUT + ".wav")
    print("done", OUT)
