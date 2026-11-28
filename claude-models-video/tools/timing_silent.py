import json
L=json.load(open('script.json'))
DUR={'s1':10,'s2':6,'s3':6.5,'s4':5.2,'s5':6.8,'s6':14,'s7':8.6}
t=0.45;gap=0.3;tl=[];subs=[]
for l in L:
    d=DUR[l['id']];tl.append({'id':l['id'],'who':l['who'],'t0':round(t,3),'t1':round(t+d,3),'sub':l['sub']})
    w=[len(s)+8 for s in l['sub']];a=t
    for s,c in zip(l['sub'],w):
        b=a+d*c/sum(w);subs.append({'t0':round(a,3),'t1':round(b,3),'text':s,'who':l['who']});a=b
    t+=d+gap
N=1800
print('speech end',round(t-gap,2))
json.dump({'N':N,'lines':tl,'subs':subs,'env':[0]*N},open('timing.json','w'),ensure_ascii=False)
