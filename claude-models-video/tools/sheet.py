import sys,glob
from PIL import Image,ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'/*.jpg'));cols=6;w,h=270,480
rows=(len(fs)+cols-1)//cols;S=Image.new('RGB',(cols*w,rows*(h+24)),'black');d=ImageDraw.Draw(S)
for i,f in enumerate(fs):
    im=Image.open(f).resize((w,h));x,y=(i%cols)*w,(i//cols)*(h+24);S.paste(im,(x,y+24));d.text((x+6,y+5),f.split('/')[-1],fill='white')
S.save(sys.argv[2],quality=88)
