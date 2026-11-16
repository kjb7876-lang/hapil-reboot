/* 눈 뜨기·감기 연출(11-16). 게임을 시작하면 감긴 눈이 한 번 깜빡이며 뜨고, 목숨이 다하면 천천히 감긴다.
   가로판(hapil1 RC181·RC182) 눈꺼풀 연출을 참고했다: 위·아래 눈꺼풀이 가운데에서 만나고, 반대로 열린다.
   세로판은 수묵화풍이 기본이라 눈꺼풀을 먹(농담·번짐·마른 붓결)으로 그린다. 인주색은 쓰지 않는다. 감싸는 원·십자가 없음.
   ?ink=0(옛 화풍)이면 가로판처럼 짙은 남색 눈꺼풀, ?eyes=0 이면 연출을 끈다. 화면 위 겹 캔버스라 게임 판정·탄에는 손대지 않는다. */
(function(global){
  'use strict';
  var doc=global.document;if(!doc)return;
  var off=/[?&]eyes=0\b/.test(String(global.location&&global.location.search||''));
  var reduce=!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 여는 순서(초): 감긴 채 잠깐 → 실눈 → 다시 반쯤 감김(깜빡) → 활짝. 잡몹은 위에서 내려오므로 아래쪽 영웅 자리는 0.9초 안에 드러난다.
  var OPEN=[[0,0],[.18,0],[.42,.14],[.6,.05],[1.05,1]],OPEN_END=1.05;
  // 감는 순서: 무겁게 반쯤 → 한 번 버티듯 살짝 뜸 → 끝까지 감김.
  var CLOSE=[[0,1],[.45,.17],[.66,.27],[1.15,0]],CLOSE_END=1.15;
  var SEAM=3,layer=null,ctx=null,grain=null,raf=0,anim=null,shown=false;
  function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
  function at(keys,t){ // 열림 정도 0(감김)~1(활짝)
    if(t<=keys[0][0])return keys[0][1];
    for(var i=1;i<keys.length;i++)if(t<=keys[i][0]){var a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*ease((t-a[0])/(b[0]-a[0]));}
    return keys[keys.length-1][1];
  }
  function ink(){return doc.documentElement.classList.contains('ink');}
  function ensure(){
    if(layer)return true;
    var frame=doc.getElementById('arcade-frame');if(!frame)return false;
    layer=doc.createElement('canvas');layer.id='arcade-eyes';layer.setAttribute('aria-hidden','true');
    layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;display:none;background:transparent';
    frame.appendChild(layer); // 저속·폭탄·일시정지 단추까지 덮는다(누름은 그대로 통과)
    ctx=layer.getContext('2d');return !!ctx;
  }
  // 먹 농담: 넓게 번진 옅은 얼룩 몇 점 + 마른 붓이 스친 가는 결 약간. 한 번만 만든다.
  function makeGrain(){
    var c=doc.createElement('canvas');c.width=320;c.height=320;var g=c.getContext('2d'),seed=7,i;
    function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
    for(i=0;i<16;i++){var x=rnd()*320,y=rnd()*320,r=40+rnd()*90,lt=rnd()<.6;
      for(var dx=-320;dx<=320;dx+=320)for(var dy=-320;dy<=320;dy+=320){var gr=g.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
        gr.addColorStop(0,lt?'rgba(120,110,98,.16)':'rgba(0,0,0,.22)');gr.addColorStop(1,lt?'rgba(120,110,98,0)':'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x+dx-r,y+dy-r,r*2,r*2);}}
    for(i=0;i<70;i++){var y0=rnd()*320,x0=rnd()*320,len=60+rnd()*200,w=1+rnd()*5;
      g.globalAlpha=.035+rnd()*.05;g.strokeStyle=rnd()<.5?'#6e665c':'#000000';g.lineWidth=w;g.lineCap='round';
      for(var k=-1;k<=0;k++){var ox=x0+k*320;g.beginPath();g.moveTo(ox,y0);g.bezierCurveTo(ox+len*.33,y0+(rnd()-.5)*6,ox+len*.66,y0+(rnd()-.5)*6,ox+len,y0+(rnd()-.5)*8);g.stroke();}}
    return c;
  }
  function size(){
    var r=layer.getBoundingClientRect(),dpr=Math.min(2,global.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;}
    return dpr;
  }
  // 눈꺼풀 가장자리: 가운데가 깊고 양 끝이 얕은 아몬드 곡선. 활짝이면 화면 밖으로 나간다.
  function edge(w,h,o,up,x){var u=(x-w/2)/(w/2),a=o*h*1.9*(up?1:.9);return h*.5+(up?-1:1)*(a*(1-.7*u*u)-SEAM*(1-o));} // 끝이 뾰족한 아몬드(심사: 반쯤 열린 틈이 원처럼 보임)
  function lidPath(w,h,o,up,pad){
    var n=48;ctx.beginPath();ctx.moveTo(-pad,up?-pad:h+pad);
    for(var i=0;i<=n;i++){var x=-pad+(w+2*pad)*i/n;ctx.lineTo(x,edge(w,h,o,up,x));}
    ctx.lineTo(w+pad,up?-pad:h+pad);ctx.closePath();
  }
  function edgeLine(w,h,o,up){var n=48;ctx.beginPath();for(var i=0;i<=n;i++){var x=w*i/n;ctx[i?'lineTo':'moveTo'](x,edge(w,h,o,up,x));}}
  // ink-v43.js 는 모든 2D 색을 한지·먹으로 뒤집는다 → 눈꺼풀은 이미 먹색이라 그리는 동안 바꾸기를 멈춘다
  function draw(o){var H=global.HapilInk&&global.HapilInk.raw;if(H)H(1);try{paint(o);}finally{if(H)H(-1);}}
  function paint(o){
    var dpr=size(),w=layer.width,h=layer.height,isInk=ink();
    ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);
    if(o>=1)return;
    [true,false].forEach(function(up){
      var e=edge(w,h,o,up,w/2);
      if(isInk){
        // 번짐: 가장자리 바깥(눈 안쪽)으로 옅은 먹이 스며든다
        for(var k=6;k>=1;k--){ctx.globalAlpha=.055;ctx.fillStyle='#1c1814';ctx.save();ctx.translate(0,(up?1:-1)*k*5*dpr);lidPath(w,h,o,up,4);ctx.fill();ctx.restore();}
        ctx.globalAlpha=1;
        var gr=ctx.createLinearGradient(0,up?0:h,0,e);gr.addColorStop(0,'#3b352d');gr.addColorStop(.6,'#1d1915');gr.addColorStop(1,'#0a0806');
        ctx.fillStyle=gr;lidPath(w,h,o,up,4);ctx.fill();
        // 마른 붓결
        if(!grain)grain=makeGrain();
        ctx.save();lidPath(w,h,o,up,4);ctx.clip();ctx.globalAlpha=1;ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.scale(dpr,dpr);ctx.fillRect(0,0,w/dpr,h/dpr);ctx.restore();
        // 속눈썹 선: 진한 먹 한 획(가운데 굵고 끝은 가늘게 보이도록 두 번 긋는다)
        ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#050403';
        ctx.globalAlpha=.9;ctx.lineWidth=2.2*dpr;edgeLine(w,h,o,up);ctx.stroke();
        ctx.save();ctx.beginPath();ctx.rect(w*.22,0,w*.56,h);ctx.clip();ctx.globalAlpha=.75;ctx.lineWidth=4.2*dpr;edgeLine(w,h,o,up);ctx.stroke();ctx.restore();
      }else{
        ctx.globalAlpha=1;ctx.fillStyle='#03060d';lidPath(w,h,o,up,4);ctx.fill();
      }
    });
    ctx.globalAlpha=1;
  }
  function stop(){if(raf)global.cancelAnimationFrame(raf);raf=0;anim=null;}
  function show(v){shown=v;if(layer)layer.style.display=v?'block':'none';}
  function run(keys,end,after){
    stop();if(!ensure())return;show(true);
    var t0=0;anim={keys:keys,end:end};
    function frame(now){
      if(!anim)return;if(!t0)t0=now;var t=(now-t0)/1000,o=at(keys,t);draw(o);
      if(t>=end){anim=null;raf=0;if(after)after();return;}
      raf=global.requestAnimationFrame(frame);
    }
    raf=global.requestAnimationFrame(frame);
  }
  /* 붉은 십자가(11-16 사용자: "사망시 눈감는 연출 나오고 다음에 붉은 십자가 나오면서 다시하기").
     사용자에게 십자가는 늘 좋은 것(구원) — 적·위험 소재에는 쓰지 않고, 쓰러진 영웅을 다시 일으키는 이 자리에만 쓴다.
     인주색 붓 두 획(세로 → 가로)이 위에서 아래로, 왼쪽에서 오른쪽으로 그어진다. 둘레 원·후광 없음. */
  var SEAL='#b0302a',SEAL_DEEP='#7e1c18',SEAL_WASH='rgba(176,48,42,.11)',CROSS_SECONDS=.8;
  function sealStroke(g,x0,y0,x1,y1,w,t,seed){ // t: 0~1 그어진 길이. 눌러 시작해 끝으로 갈수록 가늘고 마른다(비백)
    if(t<=0)return;var sd=seed,len=Math.hypot(x1-x0,y1-y0),n=Math.max(8,Math.ceil(len/2)),m=Math.max(1,Math.ceil(n*t)),i,k;
    function srnd(){sd=(sd*16807)%2147483647;return sd/2147483647;}
    var dx=(x1-x0)/len,dy=(y1-y0)/len,nx=-dy,ny=dx,wob=[];for(i=0;i<=n;i++)wob.push((srnd()-.5)*.08);
    function half(v,q){return w*.5*(v<.06?.7+v*5:1-.42*Math.pow(v,1.5))*(1+wob[q]);}
    function at(q,side){var v=q/n,hw=half(v,q)*side,cx=x0+dx*len*v,cy=y0+dy*len*v;return [cx+nx*hw,cy+ny*hw];}
    function body(){g.beginPath();var q,pt;for(q=0;q<=m;q++){pt=at(q,1);if(q)g.lineTo(pt[0],pt[1]);else g.moveTo(pt[0],pt[1]);}
      var e=at(m,0),ex=e[0]+dx*half(m/n,m)*.6,ey=e[1]+dy*half(m/n,m)*.6;g.quadraticCurveTo(ex,ey,at(m,-1)[0],at(m,-1)[1]);
      for(q=m;q>=0;q--){pt=at(q,-1);g.lineTo(pt[0],pt[1]);}
      var s0=at(0,0);g.quadraticCurveTo(s0[0]-dx*w*.45,s0[1]-dy*w*.45,at(0,1)[0],at(0,1)[1]);g.closePath();}
    // 번짐: 같은 획을 넓고 옅게 한 번(둘레 원·후광 아님)
    g.save();g.lineJoin='round';g.lineCap='round';g.strokeStyle=SEAL_WASH;g.lineWidth=w*.55;body();g.stroke();g.restore();
    g.fillStyle=SEAL;body();g.fill();
    // 먹결: 획 방향으로 짙은 결 몇 가닥
    g.save();body();g.clip();g.lineCap='round';
    for(k=0;k<7;k++){var off=(srnd()-.5)*1.6,a0=Math.floor(srnd()*m*.3),a1=Math.min(m,a0+Math.floor(m*(.4+srnd()*.6)));
      g.strokeStyle=SEAL_DEEP;g.globalAlpha=.18+srnd()*.25;g.lineWidth=w*(.05+srnd()*.08);g.beginPath();
      for(i=a0;i<=a1;i++){var v=i/n,hw=half(v,i)*off,px=x0+dx*len*v+nx*hw,py=y0+dy*len*v+ny*hw;if(i===a0)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();}
    // 비백: 끝 쪽에 붓털 사이로 바탕이 비친다
    g.globalCompositeOperation='destination-out';
    for(k=0;k<5;k++){var o2=(srnd()-.5)*1.5,b0=Math.floor(n*(.55+srnd()*.25));if(b0>=m)continue;
      g.globalAlpha=.5+srnd()*.4;g.lineWidth=w*(.03+srnd()*.05);g.beginPath();
      for(i=b0;i<=m;i++){var v2=i/n,hw2=half(v2,i)*o2,qx=x0+dx*len*v2+nx*hw2,qy=y0+dy*len*v2+ny*hw2;if(i===b0)g.moveTo(qx,qy);else g.lineTo(qx,qy);}g.stroke();}
    g.restore();g.globalAlpha=1;g.globalCompositeOperation='source-over';
  }
  function paintCross(c,t){
    var g=c.getContext('2d'),w=c.width,h=c.height,H=global.HapilInk&&global.HapilInk.raw;if(H)H(1);
    try{g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.clearRect(0,0,w,h);
      var bw=w*.15,a=Math.min(1,t/.55),b=Math.max(0,Math.min(1,(t-.5)/.5));
      sealStroke(g,w*.5,h*.06,w*.5,h*.95,bw,a,11);          // 세로(위→아래)
      sealStroke(g,w*.14,h*.33,w*.86,h*.31,bw*.92,b,29);    // 가로(왼→오른), 위쪽 3분의 1
    }finally{if(H)H(-1);}
  }
  var crossRaf=0;
  function cross(c){
    if(!c||!c.getContext)return;if(crossRaf)global.cancelAnimationFrame(crossRaf);crossRaf=0;
    var r=c.getBoundingClientRect(),dpr=Math.min(2,global.devicePixelRatio||1);c.width=Math.max(1,Math.round((r.width||96)*dpr));c.height=Math.max(1,Math.round((r.height||128)*dpr));
    if(reduce||off){paintCross(c,1);return;}
    var t0=0;function frame(now){if(!t0)t0=now;var t=Math.min(1,(now-t0)/1000/CROSS_SECONDS);paintCross(c,1-Math.pow(1-t,2));if(t<1)crossRaf=global.requestAnimationFrame(frame);else crossRaf=0;}
    crossRaf=global.requestAnimationFrame(frame);
  }
  var api={
    OPEN_SECONDS:OPEN_END,CLOSE_SECONDS:CLOSE_END,CROSS_SECONDS:CROSS_SECONDS,
    // 게임 오버 결과 화면: 감긴 눈 위에 붉은 붓 십자가를 긋는다
    cross:cross,
    // 게임 시작: 감긴 눈에서 깜빡이며 뜬다
    open:function(){
      if(off)return;if(!ensure())return;
      if(reduce){stop();show(false);return;}
      draw(0);run(OPEN,OPEN_END,function(){draw(1);show(false);});
    },
    // 게임 오버: 천천히 감긴다(감긴 채 결과 화면이 위에 뜬다)
    close:function(){
      if(off)return;if(!ensure())return;
      if(reduce){stop();show(true);draw(0);return;}
      run(CLOSE,CLOSE_END,function(){draw(0);});
    },
    // 처음 화면으로: 눈꺼풀을 치운다
    clear:function(){stop();show(false);},
    state:function(){return {shown:shown,animating:!!anim,off:off,reduce:reduce};},
    at:function(kind,t){return at(kind==='close'?CLOSE:OPEN,t);}
  };
  global.HapilEyes=api;
})(window);
