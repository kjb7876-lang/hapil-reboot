#!/usr/bin/env python3
"""보스 동작 그림 크기·발치 맞추기(사용자 11-18 "모든 이미지 일관성 있게, 특히 보스"). 기본 걷기 칸과 공격 칸의 몸 높이·발 위치·가운데가
크게 어긋난 보스는 공격 순간 몸이 커지거나 작아지거나 떠서 튄다. 어긋난 공격 시트의 칸마다 몸을 기본 칸의 높이(최대 +18%/-15% 이내로 보정)·발 높이·가운데에
맞춰 다시 앉힌다(칸 크기·칸 수는 그대로). 사용: python3 tools/fit-boss-poses-v43.py [--dry] 키…  (키 없으면 표의 기본 목록)"""
import json,sys
from PIL import Image
import numpy as np
D='media/arcade-v43/'
m=json.load(open(D+'manifest.json'))
DEFAULT='mb_01 mb_24 mb_35 mb_20 mb_05 p1_gate p1_root p2_wrath p3_legion p1_horn lucifer p1_staff'.split()
def cells(fn,e):
    im=Image.open(D+fn).convert('RGBA');n=int(e.get('frames',1));cw,ch=e['cell'] if e.get('cell') else (im.width//n,im.height)
    return im,n,cw,ch
def box(a):
    ys=np.where((a[:,:,3]>20).any(1))[0];xs=np.where((a[:,:,3]>20).any(0))[0]
    return (ys.min(),ys.max()+1,xs.min(),xs.max()+1) if len(ys) else None
def base_stat(key):
    fn=key+'.webp';im,n,cw,ch=cells(fn,m[fn]);a=np.array(im);hs=[];fs=[];cs=[]
    for i in range(n):
        b=box(a[:ch,i*cw:(i+1)*cw])
        if b:hs.append(b[1]-b[0]);fs.append(b[1]);cs.append((b[2]+b[3])/2)
    return np.median(hs)/ch,np.median(fs)/ch,np.median(cs)/cw # 칸 크기에 대한 비율(그릴 때 칸 높이가 화면 높이에 대응한다)
def fit(key,dry):
    h0,f0,c0=base_stat(key);fn=key+'@attack.webp';e=m[fn];im,n,cw,ch=cells(fn,e);a=np.array(im);out=np.zeros_like(a)
    hs=[box(a[:ch,i*cw:(i+1)*cw]) for i in range(n)];hs=[b for b in hs if b];cur=np.median([b[1]-b[0] for b in hs])
    ratio=cur/ch/h0;k=min(1.18,max(.85,1/ratio)) if ratio<.9 or ratio>1.1 else 1.0
    print(key,'ratio %.2f -> scale %.2f'%(ratio,k))
    for i in range(n):
        tile=Image.fromarray(a[:ch,i*cw:(i+1)*cw]);b=box(a[:ch,i*cw:(i+1)*cw])
        if not b:continue
        crop=tile.crop((b[2],b[0],b[3],b[1]));w,h=crop.size;nw,nh=max(1,round(w*k)),max(1,round(h*k))
        if nw>cw:nw,nh=cw,max(1,round(h*cw/w))
        crop=crop.resize((nw,nh),Image.LANCZOS);x=int(round(c0*cw-nw/2));x=max(0,min(cw-nw,x));y=int(round(f0*ch-nh));y=max(0,min(ch-nh,y))
        t=Image.new('RGBA',(cw,ch),(0,0,0,0));t.paste(crop,(x,y));out[:ch,i*cw:(i+1)*cw]=np.array(t)
    if not dry:Image.fromarray(out).save(D+fn,lossless=True,quality=100,method=6)
if __name__=='__main__':
    args=[x for x in sys.argv[1:] if x!='--dry'];dry='--dry' in sys.argv
    for k in args or DEFAULT:fit(k,dry)
