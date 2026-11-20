#!/usr/bin/env python3
"""빗소리 루프(mp3)에서 빗방울 조각을 잘라 적중 효과음 은행(src/rain-hit-bank-v43.js)을 만든다.
사용: build-rain-hit-bank-v43.py <빗소리.mp3> [출력.js]
- 영웅마다 8조각: 기억사수=짧고 또렷(70ms), 서하=조금 낮고 늘어지며 부드러운 잔향(180ms).
- 고음 거슬림 방지: 6kHz 위를 깎고, 8비트 μ-law 로 담아 JS 가 바로 풀어 쓴다(디코더 비동기 없음)."""
import sys,subprocess,base64,numpy as np
SR=16000
src=sys.argv[1];out=sys.argv[2] if len(sys.argv)>2 else 'src/rain-hit-bank-v43.js'
raw=subprocess.run(['ffmpeg','-loglevel','error','-i',src,'-ac','1','-ar','44100','-f','f32le','-'],capture_output=True,check=True).stdout
x=np.frombuffer(raw,dtype=np.float32).astype(np.float64);sr=44100
def lp(y,fc,sr):  # 1차 저역 통과 두 번
    a=np.exp(-2*np.pi*fc/sr)
    for _ in range(2):
        z=np.empty_like(y);s=0.0
        for i,v in enumerate(y):s=(1-a)*v+a*s;z[i]=s
        y=z
    return y
def hp(y,fc,sr):
    a=np.exp(-2*np.pi*fc/sr);z=np.empty_like(y);s=0.0
    for i,v in enumerate(y):s=(1-a)*v+a*s;z[i]=s
    return y-z
# 빗방울 시작점: 고역 변화량 봉우리, 서로 0.4초 이상 떨어진 것 중 세기 순
d=np.diff(x,prepend=0);w=int(sr*.004);env=np.sqrt(np.convolve(d*d,np.ones(w)/w,'same'))
order=np.argsort(-env);picks=[]
for k in order:
    if k<sr*.1 or k>len(x)-sr*.4:continue
    if all(abs(k-p)>sr*.4 for p in picks):picks.append(int(k))
    if len(picks)>=40:break
picks=picks[8:]+picks[:0]  # 가장 센 몇 개는 너무 튀어서 뺀다
rng=np.random.RandomState(7);rng.shuffle(picks)
def clip(k,ms,rate,lpfc,hpfc,echo,tail_decay):
    n=int(sr*(ms/1000)*rate)+int(sr*.03)
    seg=x[k-int(sr*.006):k-int(sr*.006)+n].copy()
    seg=hp(lp(seg,lpfc,sr),hpfc,sr)
    # 재표본(rate<1 이면 낮고 길게)
    m=int(len(seg)/rate*SR/sr);idx=np.linspace(0,len(seg)-1,m);seg=np.interp(idx,np.arange(len(seg)),seg)
    L=int(SR*ms/1000);seg=seg[:L] if len(seg)>=L else np.pad(seg,(0,L-len(seg)))
    t=np.arange(L)/SR;seg*=np.exp(-t/tail_decay)*np.minimum(1,np.arange(L)/(SR*.002))
    seg*=np.minimum(1,(L-np.arange(L))/(SR*.01))
    if echo:
        e=int(SR*echo[0]);buf=np.zeros(L+e);buf[:L]+=seg;buf[e:e+L]+=seg*echo[1];seg=buf[:L]
    return seg
def norm(s,peak):return s/(np.abs(s).max()+1e-9)*peak
res={}
specs={'memory':dict(ms=70,rate=1.06,lpfc=6000,hpfc=500,echo=None,tail_decay=.028,peak=.9),
       'seoha':dict(ms=180,rate=.84,lpfc=4200,hpfc=260,echo=(.075,.28),tail_decay=.07,peak=.8)}
for name,sp in specs.items():
    clips=[]
    for k in picks[:8]:
        p=sp.copy();pk=p.pop('peak');clips.append(norm(clip(k,**p),pk))
    cat=np.concatenate(clips)
    # μ-law 8비트
    mu=255.0;y=np.sign(cat)*np.log1p(mu*np.abs(cat))/np.log1p(mu);q=np.round((y+1)/2*255).astype(np.uint8)
    res[name]=(len(clips[0]),base64.b64encode(q.tobytes()).decode())
with open(out,'w') as f:
    f.write('/* 빗소리 적중 효과음 은행(자동 생성: tools/build-rain-hit-bank-v43.py). 영웅마다 8조각, 8비트 μ-law, %d Hz 모노. */\n'%SR)
    f.write('(function(root){\'use strict\';var BANK={rate:%d,'%SR)
    f.write(','.join('%s:{len:%d,data:"%s"}'%(n,l,b) for n,(l,b) in res.items()))
    f.write('};\n  function decode(name){var b=BANK[name];if(!b)return null;var s=(typeof atob===\'function\'?atob(b.data):Buffer.from(b.data,\'base64\').toString(\'binary\')),n=s.length,out=new Float32Array(n),i,u,y;for(i=0;i<n;i++){y=s.charCodeAt(i)/255*2-1;u=(Math.pow(256,Math.abs(y))-1)/255;out[i]=y<0?-u:u;}return {rate:BANK.rate,len:b.len,count:Math.floor(n/b.len),samples:out};}\n')
    f.write('  var api={bank:BANK,decode:decode};if(typeof module===\'object\'&&module.exports)module.exports=api;root.HapilRainHit=api;\n})(typeof window!==\'undefined\'?window:globalThis);\n')
print({n:(l,len(b)) for n,(l,b) in res.items()})
