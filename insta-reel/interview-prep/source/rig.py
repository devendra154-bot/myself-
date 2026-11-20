from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json
h=Image.open('assets/host.png').convert('RGBA'); W,Hh=h.size
a=np.array(h).astype(np.int32)
CUT=342
def avg(x0,y0,x1,y1):
    p=a[y0:y1,x0:x1].reshape(-1,4); p=p[p[:,3]>200]; return np.array(p[:,:3].mean(0))
cheek=avg(500,262,530,285)
# --- remove the original mouth: pixels in mouth box that are not skin-like
x0,y0,x1,y1=440,286,510,334
reg=a[y0:y1,x0:x1,:3].astype(float)
dist=np.sqrt(((reg-cheek)**2).sum(-1))
lum=reg.mean(-1)
mask=(dist>45)&(a[y0:y1,x0:x1,3]>0)
# keep the jaw/face outline at the far left edge (dark thin line near face border): skip columns < 446
mask[:, :6]=False
mimg=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
mf=np.array(mimg)/255.0
head=a.copy()
# fill with a smooth skin gradient sampled from rows above/below the mouth
top=avg(455,276,500,284); bot=avg(462,336,492,342)
for yy in range(y0,y1):
    t=(yy-y0)/(y1-y0); col=top*(1-t)+bot*t
    m=mf[yy-y0][:,None]
    head[yy,x0:x1,:3]=(head[yy,x0:x1,:3]*(1-m)+col*m).astype(np.int32)
head=head.astype(np.uint8)
hd=np.zeros_like(head); hd[:CUT,330:660]=head[:CUT,330:660]
for i,y in enumerate(range(CUT-6,CUT)):
    hd[y,:,3]=(hd[y,:,3]*(1-(i+1)/7)).astype(np.uint8)
Image.fromarray(hd).crop((330,40,660,CUT+2)).save('assets/head.png')
# --- body: remove head; filler only behind the head bottom (y in CUT-45..CUT), masked to original silhouette
body=a.astype(np.uint8).copy(); body[:CUT-6,330:660,3]=0
neck=avg(480,360,520,390)
fill=Image.new('L',(W,Hh),0); ImageDraw.Draw(fill).ellipse([440,CUT-34,558,CUT+30],fill=255)
fa=np.array(fill)>0
sil=a[...,3]>0
zone=fa&sil&(np.arange(Hh)[:,None]<CUT)
body[zone,:3]=neck.astype(np.uint8); body[zone,3]=255
Image.fromarray(body).save('assets/body.png')
json.dump(dict(W=W,H=Hh,head=[330,40],cut=CUT,pivot=[490,342],mouth=[474,309],skin=[int(v) for v in cheek]),open('rig.json','w'))
bg=Image.new('RGBA',(W,Hh),(201,182,255,255)); bg.alpha_composite(Image.open('assets/body.png')); bg.alpha_composite(Image.open('assets/head.png'),(330,40))
bg.crop((330,40,690,560)).resize((540,780)).convert('RGB').save('rigcheck.jpg')
# rotated test (+5 deg) to check seams
b2=Image.new('RGBA',(W,Hh),(201,182,255,255)); b2.alpha_composite(Image.open('assets/body.png'))
hdI=Image.open('assets/head.png'); layer=Image.new('RGBA',(W,Hh),(0,0,0,0)); layer.alpha_composite(hdI,(330,40))
layer=layer.rotate(5,center=(490,342),resample=Image.BICUBIC); b2.alpha_composite(layer)
b2.crop((330,40,690,560)).resize((540,780)).convert('RGB').save('rigcheck2.jpg')
