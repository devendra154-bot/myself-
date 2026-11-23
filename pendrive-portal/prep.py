"""Cut the pendrive out of the photo and build a clean plate of the surface (9:16 crop).
Usage: python3 prep.py <photo.jpg> <work_dir>"""
import sys, os, numpy as np, cv2
from PIL import Image
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(SRC).convert("RGB"))
Hh, Ww = im.shape[:2]
cw = int(Hh * 9 / 16); x0 = int(np.clip(1326 - cw / 2, 0, Ww - cw))
crop = im[:, x0:x0 + cw].astype(np.float32)
r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
gray = crop.mean(-1)
m = (gray < 105) | ((r - (g + b) / 2) > 45)
m = ndimage.binary_closing(m, np.ones((15, 15)))
m = ndimage.binary_fill_holes(m)
lab, n = ndimage.label(m)
sizes = ndimage.sum(m, lab, range(1, n + 1))
m = lab == (1 + int(np.argmax(sizes)))
loose = m.copy()                                      # drive + its shadow, used for the clean plate
sat = crop.max(-1) - crop.min(-1)
bgish = (gray > 80) & (sat < 80)                     # light, unsaturated = surface or its shadow
m = m & ~bgish
m = ndimage.binary_opening(m, np.ones((5, 5)))
lab, n = ndimage.label(m)
sizes = ndimage.sum(m, lab, range(1, n + 1))
m = ndimage.binary_fill_holes(lab == (1 + int(np.argmax(sizes))))
m = ndimage.binary_erosion(m, np.ones((3, 3)))
alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.6)
ys, xs = np.where(m); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
print("crop x0", x0, "bbox", bx0, by0, bx1, by1)
# clean plate: low frequencies from a Telea inpaint + high-frequency speckle borrowed from clean surface above
hole = ndimage.binary_dilation(m, np.ones((1, 1)), iterations=0)
hole = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=16).astype(bool)
sh = np.zeros_like(hole); sh[min(Hh - 1, by0):min(Hh, by1 + 140), max(0, bx0 - 120):min(cw, bx1 + 40)] = True
hole = hole | (sh & cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=34).astype(bool))
# smooth surface model: 2D cubic fit of the background outside a wide zone around the drive
far = cv2.dilate(loose.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=60).astype(bool)
q = 8
cs = crop[::q, ::q]; ok = ~far[::q, ::q]
yy, xx = np.mgrid[0:cs.shape[0], 0:cs.shape[1]]
X = (xx / cs.shape[1]).ravel(); Y = (yy / cs.shape[0]).ravel()
A = np.stack([X ** i * Y ** j for i in range(4) for j in range(4 - i)], 1)
low_s = np.zeros_like(cs)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A[ok.ravel()], cs[..., c].ravel()[ok.ravel()], rcond=None)
    low_s[..., c] = (A @ coef).reshape(cs.shape[:2])
low = cv2.resize(low_s, (cw, Hh), interpolation=cv2.INTER_CUBIC)
hole = cv2.dilate(loose.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=26).astype(bool)
shift = 900
src = np.roll(crop, shift, axis=0)                       # texture from 900 px above
hf = src - cv2.GaussianBlur(src, (0, 0), 18)
fill = low + hf
w = np.clip(cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 30) * 1.6, 0, 1)[..., None]
plate = crop * (1 - w) + fill * w
S = 1080 / cw
def out(a, name, mode="RGB"):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), mode).resize((1080, 1920), Image.LANCZOS).save(f"{OUT}/{name}")
out(crop, "photo_916.png"); out(plate, "plate.png")
rgba = np.dstack([crop, alpha * 255])
Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA").resize((1080, 1920), Image.LANCZOS).save(f"{OUT}/drive_full.png")
print("bbox_out", [round(v * S) for v in (bx0, by0, bx1, by1)])
