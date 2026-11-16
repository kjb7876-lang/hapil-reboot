/* 수묵화풍(코드만, 새 그림 없음). 기본으로 켜진다. 주소에 ?ink=0 을 붙이면 꺼지고 옛 화풍으로 돈다. 기준: docs/v43/ink-style.md
 * 방식: 게임 코드는 그대로 두고 캔버스 그리기 길목에서 바꾼다.
 *  1) 코드로 칠하는 색(탄·광선·문양·글자): 밝기를 뒤집고 채도를 낮춰 한지 위 먹·광물 안료 색으로.
 *  2) 더하기 합성(빛 번짐) → 곱하기(먹이 겹칠수록 짙어짐).
 *  3) 그림 파일: 인물·몹은 담채(옅은 색 먹그림)로, 배경은 한지 위 먹 번짐 + 윤곽 붓선으로 한 번만 굽는다.
 *  4) 프레임 끝에 한지 결·가장자리 먹 번짐을 덮는다. */
(function(global){'use strict';
  var on=!/[?&]ink=0(&|$)/.test(global.location&&global.location.search||'');
  var monoQ=/[?&]mono=([012])(&|$)/.exec(global.location&&global.location.search||''),mono=monoQ?+monoQ[1]:2; // 기본 2 = 먹 농담에 돕는 색(하트·판정점·예고)만 인주색(사용자 11-16, 적 탄은 먹). ?mono=1 완전 흑백, ?mono=0 예전 담채
  global.HapilInk={on:on,mono:on?mono:0};
  if(!on||!global.CanvasRenderingContext2D)return;
  document.documentElement.classList.add('ink');

  var PAPER=[242,233,214],INK=[30,26,24];
  var seed=20261115;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;} // 화면 난수와 섞이지 않는 제 난수
  var hold=0; // >0 이면 색을 바꾸지 않는다(이 파일이 직접 그릴 때)
  var slow=false;global.HapilInk.setLite=function(v){slow=!!v;}; // 느린 기기(앱의 가벼운 화면): 한지 결 덧입히기·갈필을 뺀다
  global.HapilInk.raw=function(d){hold=Math.max(0,hold+d);}; // 바닥 바위처럼 원래 짙은 색 그대로 둘 그림을 감쌀 때

  /* ── 색 바꾸기 ── */
  var NAMED={white:[255,255,255,1],black:[0,0,0,1],transparent:[0,0,0,0],red:[255,0,0,1]};
  function parse(v){
    var m;v=v.trim().toLowerCase();
    if(v.charAt(0)==='#'){var h=v.slice(1);if(h.length===3||h.length===4)h=h.replace(/./g,'$&$&');if(h.length!==6&&h.length!==8)return null;var n=parseInt(h.slice(0,6),16);if(n!==n)return null;
      return [n>>16&255,n>>8&255,n&255,h.length===8?parseInt(h.slice(6),16)/255:1];}
    if((m=/^rgba?\(([^)]+)\)$/.exec(v))){var p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);if(p.length<3)return null;return [p[0],p[1],p[2],p.length>3?p[3]:1];}
    return NAMED[v]||null;
  }
  function deepen(k){return mono&&k[0]-k[2]<40?[Math.round(k[0]*.58+INK[0]*.42),Math.round(k[1]*.58+INK[1]*.42),Math.round(k[2]*.58+INK[2]*.42)]:k;} // 먹 화면의 탄은 잿빛 몹·배경보다 한 단계 짙게
  function toInk(r,g,b,al){ // 밝은 색 → 짙은 먹/안료, 어두운 색 → 한지
    var mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,l=(mx+mn)/2,d=mx-mn,s=d?d/(1-Math.abs(2*l-1)):0,h=0;
    if(d){if(mx===r/255)h=((g-b)/255/d)%6;else if(mx===g/255)h=(b-r)/255/d+2;else h=(r-g)/255/d+4;h*=60;}
    var l2=.11+.82*(1-l),s2=Math.min(1,s)*.5*(l>.9?.4:1); // 거의 흰 색은 그냥 먹
    if(s>.25&&h>28&&h<75){l2=Math.min(l2,.3);s2=Math.max(s2,.6);} // 황토는 한지와 붙지 않게 짙고 진하게
    if(mono){var hn=((h%360)+360)%360;if(mono===2&&s>.3&&(hn<20||hn>330)&&!(al<.5))l2=Math.min(l2,.18);s2=0;} // 붉던 적 탄은 가장 짙은 먹("가장 검은 것 = 위험", 심사 1차), 옅은 붉은 빛은 그대로 옅게. // 흑백: 색을 빼고 먹 농담만. 붉은 탄·광선·보스 공격도 먹이다(사용자 11-16). 인주색은 아래 FIXED 의 돕는 색(하트·판정점·예고)에만
    var c=(1-Math.abs(2*l2-1))*s2,x=c*(1-Math.abs((h/60)%2-1)),m=l2-c/2,R=0,G=0,B=0;h=((h%360)+360)%360;
    if(h<60){R=c;G=x;}else if(h<120){R=x;G=c;}else if(h<180){G=c;B=x;}else if(h<240){G=x;B=c;}else if(h<300){R=x;B=c;}else{R=c;B=x;}
    // 한지·먹의 따뜻한 기운을 살짝 섞는다
    var t=l2,wr=INK[0]+(PAPER[0]-INK[0])*t,wg=INK[1]+(PAPER[1]-INK[1])*t,wb=INK[2]+(PAPER[2]-INK[2])*t;
    return [Math.round((R+m)*255*.82+wr*.18),Math.round((G+m)*255*.82+wg*.18),Math.round((B+m)*255*.82+wb*.18)];
  }
  /* 뜻이 정해진 색: 영웅 자리 고리 = 그리지 않음(사용자 11-15), 판정점 = 가라앉힌 인주 테 + 먹 점(튀지 않게), 영웅 탄 = 담묵(적 탄 안료 색과 겹치지 않게) */
  var FIXED={'#7ff3ff':'rgba(30,26,24,0)','#ff2a4a':'rgba(150,56,44,.8)','#fa800a':'rgba(44,40,42,1)','#fa800a00':'rgba(44,40,42,0)','#c9406e':'rgba(198,46,36,1)','#f7b6cc':'rgba(240,170,150,1)','#f2c46d':'rgba(30,26,24,1)'};
  /* 인주색은 돕는 색(사용자 11-16 "언주색은 하트나 아래예고처럼 … 플레이어에게 도움을 주는 그런상황"): 하트·영웅 판정점·예고(광선 예고선 #c9406e, 아래에서 솟기 전·바닥 경고 #c2362a)만 */
  if(mono===2){FIXED['#c2362a']='rgba(194,54,42,1)';FIXED['rgba(255,90,60,.35)']='rgba(194,54,42,.35)';FIXED['rgba(255,90,60,0)']='rgba(194,54,42,0)';}
  if(mono===2){FIXED['#e0a52c']='rgba(160,34,28,1)';FIXED['#fff0c0']='rgba(236,160,140,1)';FIXED['#8a5a12']='rgba(30,26,24,1)';} // 큰 하트도 인주색(조금 더 짙게)
  if(mono===1){FIXED['#c9406e']='rgba(52,46,44,1)';FIXED['#f7b6cc']='rgba(156,148,140,1)';}
  var memo={},memoN=0,VEIL=/^rgba\(5,5,14,\.(56|68)\)$/;
  function remap(v){
    if(hold||typeof v!=='string')return v;
    var hit=memo[v];if(hit!==undefined)return hit;
    if(VEIL.test(v)){memo[v]='rgba(242,233,214,.16)';return memo[v];}
    if(FIXED[v]){memo[v]=FIXED[v];return memo[v];} // 배경을 어둡게 누르던 막: 한지에서는 옅게만
    var p=parse(v),out=v;if(p){var k=toInk(p[0],p[1],p[2],p[3]);out='rgba('+k[0]+','+k[1]+','+k[2]+','+(Math.round(p[3]*1000)/1000)+')';}
    if(memoN++>4000){memo={};memoN=0;}memo[v]=out;return out;
  }
  var proto=global.CanvasRenderingContext2D.prototype;
  ['fillStyle','strokeStyle','shadowColor'].forEach(function(name){
    var d=Object.getOwnPropertyDescriptor(proto,name);if(!d||!d.set)return;
    Object.defineProperty(proto,name,{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){d.set.call(this,remap(v));}});
  });
  (function(){var d=Object.getOwnPropertyDescriptor(proto,'globalCompositeOperation');if(!d||!d.set)return;
    Object.defineProperty(proto,'globalCompositeOperation',{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){d.set.call(this,!hold&&(v==='lighter'||v==='screen')?'multiply':v);}});})();
  if(global.CanvasGradient){var stop=global.CanvasGradient.prototype.addColorStop;global.CanvasGradient.prototype.addColorStop=function(o,c){return stop.call(this,o,remap(c));};}


  /* ── 굵은 선(광선·문양·고리)은 붓 획으로: 같은 길을 한지색 가는 점선으로 한 번 더 그어 갈필(마른 붓 자국)을 낸다 ── */
  var rawStroke=proto.stroke,inBrush=false;
  proto.stroke=function(){
    rawStroke.apply(this,arguments);
    if(hold||inBrush||slow||arguments.length||this.lineWidth<2.6)return;
    var dash=this.getLineDash();if(dash&&dash.length)return;
    inBrush=true;hold++;var lw=this.lineWidth,ss=this.strokeStyle,ga=this.globalAlpha,op=this.globalCompositeOperation,cap=this.lineCap;
    try{this.globalCompositeOperation='source-over';this.strokeStyle='rgba(242,233,214,.55)';this.lineCap='butt';this.lineWidth=Math.max(.6,lw*.2);this.setLineDash([lw*5,lw*2.4,lw*1.6,lw*3.2]);this.lineDashOffset=lw*1.7;rawStroke.call(this);
      this.lineWidth=Math.max(.5,lw*.12);this.setLineDash([lw*2.2,lw*6]);this.lineDashOffset=-lw*2.3;this.translate(lw*.28,lw*.28);rawStroke.call(this);this.translate(-lw*.28,-lw*.28);}catch(e){}
    this.setLineDash([]);this.lineDashOffset=0;this.lineWidth=lw;this.strokeStyle=ss;this.globalAlpha=ga;this.globalCompositeOperation=op;this.lineCap=cap;hold--;inBrush=false;
  };

  /* ── 그림 파일 굽기 ── */
  function canvasOf(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  var rawDraw=proto.drawImage;
  /* 인물·몹·소품: 담채. 색은 조금만 남기고 먹 농담으로, 바깥 윤곽에는 붓선을 두른다. 영웅은 색을 더 빼 먹그림에 가깝게. */
  function washSprite(img){
    var w=img.naturalWidth,h=img.naturalHeight,c=canvasOf(w,h),g=c.getContext('2d',{willReadFrequently:true});rawDraw.call(g,img,0,0);
    var data;try{data=g.getImageData(0,0,w,h);}catch(e){return img;}
    var p=data.data,i,x,y,v,r,gg,b,hero=/gunner/.test(img.src),keep=mono?0:hero?.12:.14,n=w*h,A=new Uint8Array(n);
    for(i=0;i<n;i++)A[i]=p[i*4+3];
    for(i=0;i<p.length;i+=4){if(!p[i+3])continue;r=p[i];gg=p[i+1];b=p[i+2];y=r*.299+gg*.587+b*.114;
      v=y/255;v=v<.5?2*v*v:1-2*(1-v)*(1-v);v=Math.pow(v,hero?1.05:.78);var qb=v*5,qf=Math.floor(qb),qr=qb-qf;qr=qr<.25?0:qr>.75?1:(qr-.25)*2;v=(qf+qr)/5; // 농담을 다섯 단으로 묶는다(붓으로 겹쳐 칠한 면)
      if(v>.72&&((i>>2)*2654435761>>>0)%100<10)v=1; // 밝은 면의 비백(마른 붓이 남긴 흰 자리)
      var ir=INK[0]+(PAPER[0]-INK[0])*v,ig=INK[1]+(PAPER[1]-INK[1])*v,ib=INK[2]+(PAPER[2]-INK[2])*v,lift=y?v*255/y:1;
      p[i]=Math.min(255,ir*(1-keep)+r*lift*keep);p[i+1]=Math.min(255,ig*(1-keep)+gg*lift*keep);p[i+2]=Math.min(255,ib*(1-keep)+b*lift*keep);}
    // 윤곽 붓선: 투명한 곳과 맞닿은 살을 먹으로 누른다(굵기는 그림 크기에 맞춘다)
    var t=Math.max(1,Math.round(Math.min(w,h)/(hero?150:170))),o,k,q,edge;
    for(y=0;y<h;y++)for(x=0;x<w;x++){o=y*w+x;if(A[o]<110)continue;edge=0;
      for(k=1;k<=t&&!edge;k++){if(x-k<0||x+k>=w||y-k<0||y+k>=h||A[o-k]<50||A[o+k]<50||A[o-k*w]<50||A[o+k*w]<50)edge=1-(k-1)/t;}
      if(edge){q=o*4;k=.88*edge;p[q]=p[q]*(1-k)+INK[0]*k;p[q+1]=p[q+1]*(1-k)+INK[1]*k;p[q+2]=p[q+2]*(1-k)+INK[2]*k;}}
    g.putImageData(data,0,0);return c;
  }
  /* 배경: 한지 위 먹 번짐. 밝기 순위로 대부분을 옅게 풀고, 가장 어두운 곳만 먹으로, 윤곽에는 붓선을 얹는다. 위아래는 이어진다. */
  function washPaper(img){
    var w=Math.min(480,img.naturalWidth),h=Math.round(img.naturalHeight*w/img.naturalWidth),c=canvasOf(w,h),g=c.getContext('2d',{willReadFrequently:true});rawDraw.call(g,img,0,0,w,h);
    var data;try{data=g.getImageData(0,0,w,h);}catch(e){return img;}
    var p=data.data,n=w*h,L=new Float32Array(n),B=new Float32Array(n),T=new Float32Array(n),hist=new Uint32Array(256),i,x,y;
    for(i=0;i<n;i++){L[i]=p[i*4]*.299+p[i*4+1]*.587+p[i*4+2]*.114;}
    // 번짐: 가로·세로 상자 흐림 두 번(세로는 위아래를 감아 이음매를 지킨다)
    function blur(src,dst,rad){var acc,k;for(y=0;y<h;y++){acc=0;for(k=-rad;k<=rad;k++)acc+=src[y*w+Math.min(w-1,Math.max(0,k))];for(x=0;x<w;x++){T[y*w+x]=acc/(rad*2+1);acc+=src[y*w+Math.min(w-1,x+rad+1)]-src[y*w+Math.max(0,x-rad)];}}
      for(x=0;x<w;x++){acc=0;for(k=-rad;k<=rad;k++)acc+=T[((k+h)%h)*w+x];for(y=0;y<h;y++){dst[y*w+x]=acc/(rad*2+1);acc+=T[((y+rad+1)%h)*w+x]-T[((y-rad+h)%h)*w+x];}}}
    blur(L,B,3);blur(B,B,3);blur(B,B,2); // 넓게 풀어 번짐 면을 만든다(잔무늬·돋을새김 느낌을 없앤다)
    var mr=0,mg=0,mb=0;for(i=0;i<n;i+=7){mr+=p[i*4];mg+=p[i*4+1];mb+=p[i*4+2];}
    var mM=Math.max(mr,mg,mb)||1,T=mono?[.88,.87,.85]:[.74+.26*mr/mM,.74+.26*mg/mM,.74+.26*mb/mM]; // 지역 담채: 원화의 주된 색 기운을 옅게 곱한다
    for(i=0;i<n;i++)hist[Math.min(255,B[i]|0)]++;
    var rank=new Float32Array(256),acc=0;for(i=0;i<256;i++){acc+=hist[i];rank[i]=acc/n;}
    for(y=0;y<h;y++)for(x=0;x<w;x++){i=y*w+x;
      var up=((y-1+h)%h)*w,dn=((y+1)%h)*w,xl=Math.max(0,x-1),xr=Math.min(w-1,x+1);
      var gx=(B[up+xr]+2*B[y*w+xr]+B[dn+xr])-(B[up+xl]+2*B[y*w+xl]+B[dn+xl]),gy=(B[dn+xl]+2*B[dn+x]+B[dn+xr])-(B[up+xl]+2*B[up+x]+B[up+xr]);
      var mag=Math.sqrt(gx*gx+gy*gy),edge=Math.max(0,Math.min(1,(mag-14)/46)),r=rank[Math.min(255,B[i]|0)];
      var tone=.5+.5*Math.pow(r,.6);             // 대부분은 옅은 담묵(탄보다 늘 옅게)
      var q=tone*6,f=Math.floor(q),fr=q-f;fr=fr<.3?0:fr>.7?1:(fr-.3)/.4;tone=(f+fr*fr*(3-2*fr))/6; // 농담을 몇 단으로 묶어 번진 면으로
      tone-=edge*.3;                              // 큰 덩어리의 경계에만 붓선 한 겹(어두운 쪽으로만)
      tone+=(rnd()-.5)*.03;                       // 먹 입자
      tone=Math.max(.2,Math.min(1,tone));
      var o=i*4,sh=.45+.55*(1-tone);             // 담채는 짙은 곳에 더 밴다
      p[o]=(INK[0]+(PAPER[0]-INK[0])*tone)*(1-sh*(1-T[0]));p[o+1]=(INK[1]+(PAPER[1]-INK[1])*tone)*(1-sh*(1-T[1]));p[o+2]=(INK[2]+(PAPER[2]-INK[2])*tone)*(1-sh*(1-T[2]));p[o+3]=255;}
    g.putImageData(data,0,0);return c;
  }
  /* 보스 레이저·문양 그림(media/arcade-v43-laser): 검은 바탕에 빛만 그린 더하기용 그림(투명도 없음). 인물처럼 구우면 검은 바탕이 먹 네모가 된다
     (보스 이펙트 전수조사 11-15: 스펠마다 보스 위에 먹 네모, 광선은 검은 띠). 밝기를 투명도로 바꾸고 색은 먹·안료로: 바탕은 비고 빛만 먹 번짐으로 남는다. */
  function washGlow(img){
    var w=img.naturalWidth,h=img.naturalHeight,c=canvasOf(w,h),g=c.getContext('2d',{willReadFrequently:true});rawDraw.call(g,img,0,0);
    var data;try{data=g.getImageData(0,0,w,h);}catch(e){return img;}
    var p=data.data,i,a,k;
    for(i=0;i<p.length;i+=4){a=Math.max(p[i],p[i+1],p[i+2]);a=a<14?0:Math.pow(Math.min(1,(a-14)/130),.7); // 심사 1차 6.41: 문양·광선이 옅어 스펠 시작·위협 신호가 약했다
      k=toInk(p[i],p[i+1],p[i+2]);p[i]=k[0];p[i+1]=k[1];p[i+2]=k[2];p[i+3]=Math.round(a*p[i+3]);}
    g.putImageData(data,0,0);return c;
  }
  var washed=typeof WeakMap==='function'?new WeakMap():null;
  function inkOf(img){
    if(!washed||!img.complete||!img.naturalWidth)return img;
    var c=washed.get(img);
    if(!c){hold++;try{c=/\/bg-[^\/]*$/.test(img.src)?washPaper(img):/\/arcade-v43-laser\//.test(img.src)?washGlow(img):washSprite(img);}catch(e){c=img;}hold--;washed.set(img,c);}
    return c;
  }
  var paperBg=false; // 배경 그림을 구운 뒤에 덮는 어두운 막(탄 읽히라고 누르던 것)은 한지에서는 필요 없다
  proto.drawImage=function(src){
    if(!hold&&global.HTMLImageElement&&src instanceof global.HTMLImageElement){
      var c=inkOf(src);
      if(c!==src){var a=Array.prototype.slice.call(arguments);a[0]=c;
        if(a.length===9&&c.width!==src.naturalWidth){var kx=c.width/src.naturalWidth,ky=c.height/src.naturalHeight;a[1]*=kx;a[2]*=ky;a[3]*=kx;a[4]*=ky;}
        return rawDraw.apply(this,a);}
    }
    return rawDraw.apply(this,arguments);
  };


  /* ── 탄: 붓으로 찍은 먹 자국 ── */
  function css(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
  function hexOf(color){var n=parseInt(String(color).slice(1,7),16);return [n>>16&255,n>>8&255,n&255];}
  function blob(g,r,wob,n){ // 고르지 않은 둘레(먹이 번진 가장자리)
    var k=n||14,a0=rnd()*6.283,pts=[],i;for(i=0;i<k;i++){var a=a0+i/k*6.283,rr=r*(1+(rnd()-.5)*wob);pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
    g.beginPath();for(i=0;i<k;i++){var p=pts[i],q=pts[(i+1)%k],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;if(!i)g.moveTo(mx,my);else g.quadraticCurveTo(p[0],p[1],mx,my);}
    g.quadraticCurveTo(pts[0][0],pts[0][1],(pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2);g.closePath();
  }
  function sprite(kind,radius,color,scale,tint){
    var reach=kind==='rice'?radius*2.6+3:kind==='bubble'?radius*1.2:radius*1.9,c=canvasOf(Math.ceil(reach*2*scale),Math.ceil(reach*2*scale)),g=c.getContext('2d');
    var rgb=hexOf(color),pig=deepen(toInk(rgb[0],rgb[1],rgb[2])),t=tint&&tint!==color?hexOf(tint):null,edge=t?toInk(t[0],t[1],t[2]):pig,r=radius,i;
    var dark=[Math.round(edge[0]*.45+INK[0]*.55),Math.round(edge[1]*.45+INK[1]*.55),Math.round(edge[2]*.45+INK[2]*.55)];
    hold++;g.translate(reach*scale,reach*scale);g.scale(scale,scale);g.lineCap='round';g.lineJoin='round';
    if(kind==='orb'){
      var mid=[Math.round(pig[0]*.7+INK[0]*.3),Math.round(pig[1]*.7+INK[1]*.3),Math.round(pig[2]*.7+INK[2]*.3)],wet=[Math.round(pig[0]*.62+PAPER[0]*.38),Math.round(pig[1]*.62+PAPER[1]*.38),Math.round(pig[2]*.62+PAPER[2]*.38)];
      // 번짐: 옅은 담묵이 둘레로 고르지 않게 퍼진다
      g.fillStyle=css(mid,1);g.globalAlpha=.13;blob(g,Math.min(reach*.92,r*1.6),.36,9);g.fill();
      g.globalAlpha=.2;blob(g,Math.min(reach*.86,r*1.3),.3,9);g.fill();g.globalAlpha=1;
      // 몸: 붓으로 찍은 점. 가장자리에 먹이 고이고 가운데는 물기로 옅다
      var body=g.createRadialGradient(-r*.12,-r*.1,r*.05,0,0,r*1.08);body.addColorStop(0,css(wet,.95));body.addColorStop(.45,css(mid,1));body.addColorStop(.8,css(dark,1));body.addColorStop(1,css(INK,1));
      g.strokeStyle=css(PAPER,.85);g.lineWidth=Math.max(1,r*.34);blob(g,r*1.04,.3,9);g.stroke();g.fillStyle=body;g.fill(); // 한지색 여백 테: 몹·다른 탄과 겹쳐도 낱알로 읽힌다
      // 튄 먹 방울
      if(r>=3){g.fillStyle=css(dark,.8);for(i=0;i<3;i++){var da=rnd()*6.283,dd=r*(1.25+rnd()*.35),ds=Math.max(.45,r*(.08+rnd()*.1));g.beginPath();g.arc(Math.cos(da)*dd,Math.sin(da)*dd,ds,0,6.283);g.fill();}}
    }else if(kind==='rice'){
      // 붓 한 점: 머리는 짙고 꼬리는 갈라지며 마른다(진행 방향 = +x)
      var L=radius*2.6;
      g.fillStyle=css(pig,.2);g.beginPath();g.ellipse(0,0,L*.98,r*1.35,0,0,6.283);g.fill();
      g.fillStyle=css(dark,1);g.beginPath();g.moveTo(L*.95,0);g.bezierCurveTo(L*.7,-r*1.15,L*.1,-r*1.1,-L*.55,-r*.5);g.lineTo(-L*.95,-r*.1);g.lineTo(-L*.62,r*.12);g.lineTo(-L*.9,r*.42);g.bezierCurveTo(-L*.2,r*1.05,L*.6,r*1.2,L*.95,0);g.closePath();g.fill();
      g.fillStyle=css(pig,.95);g.beginPath();g.ellipse(L*.3,0,L*.42,r*.5,0,0,6.283);g.fill();
      g.strokeStyle=css(PAPER,.7);g.lineWidth=Math.max(.4,r*.16);for(i=0;i<2;i++){var yy=(i-.5)*r*.7;g.beginPath();g.moveTo(-L*.75,yy);g.lineTo(-L*.2,yy*.8);g.stroke();}
    }else{
      // 큰 방울: 고리 없이 번진 담묵 덩이(사용자 11-15 "감싸는 원 모두 없애줘"). 크기(판정)는 그대로, 가운데로 갈수록 짙다
      var deep=[Math.round(pig[0]*.72+INK[0]*.28),Math.round(pig[1]*.72+INK[1]*.28),Math.round(pig[2]*.72+INK[2]*.28)];
      g.fillStyle=css(deep,.13);blob(g,r*1.17,.34,11);g.fill(); // 바깥 번짐은 옅게, 겹쳐도 안개가 되지 않게
      var wash=g.createRadialGradient(0,0,r*.08,0,0,r);wash.addColorStop(0,css(dark,.97));wash.addColorStop(.3,css(dark,.9));wash.addColorStop(.5,css(deep,.8));wash.addColorStop(.9,css(deep,.74));wash.addColorStop(1,css(dark,.82));
      g.fillStyle=wash;blob(g,r*.97,.2,13);g.fill(); // 몸: 고르지 않은 둘레의 먹 덩이, 가장자리에 물 고인 짙은 기운(선이 아니라 농담)
      g.fillStyle=css(PAPER,.22);for(i=0;i<4;i++){var ba=rnd()*6.283,bd=r*(.5+rnd()*.3);g.beginPath();g.ellipse(Math.cos(ba)*bd,Math.sin(ba)*bd,r*.09,r*.03,ba,0,6.283);g.fill();} // 비백
    }
    hold--;return {image:c,half:reach};
  }
  global.HapilInk.sprite=sprite;



  /* 도형 탄(별·비늘·단검·부적): 구운 그림의 고른 테두리를 갉아 고르지 않게 하고, 가장자리에 먹이 고이게 한다. 크기·판정은 그대로 */
  function rough(sp){
    var c=sp.image,w=c.width,h=c.height,g=c.getContext('2d'),data;try{data=g.getImageData(0,0,w,h);}catch(e){return sp;}
    var p=data.data,n=w*h,A=new Float32Array(n),Bf=new Float32Array(n),i,x,y,rad=Math.max(1,Math.round(w/44)),k,acc;
    for(i=0;i<n;i++)A[i]=p[i*4+3]>150?1:0; // 몸(번짐 무리는 뺀다)
    for(y=0;y<h;y++){for(x=0;x<w;x++){acc=0;for(k=-rad;k<=rad;k++)acc+=A[y*w+Math.min(w-1,Math.max(0,x+k))];Bf[y*w+x]=acc/(rad*2+1);}}
    for(x=0;x<w;x++){for(y=0;y<h;y++){acc=0;for(k=-rad;k<=rad;k++)acc+=Bf[Math.min(h-1,Math.max(0,y+k))*w+x];A[y*w+x]=A[y*w+x]?acc/(rad*2+1):0;}}
    var gs=Math.max(3,Math.round(w/9)),gw=Math.ceil(w/gs)+2,gh=Math.ceil(h/gs)+2,N=new Float32Array(gw*gh);for(i=0;i<N.length;i++)N[i]=rnd();
    for(y=0;y<h;y++)for(x=0;x<w;x++){i=y*w+x;var inner=A[i];if(!inner)continue; // inner: 1=속, .5=가장자리
      var fx=x/gs,fy=y/gs,x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0,nz=(N[y0*gw+x0]*(1-tx)+N[y0*gw+x0+1]*tx)*(1-ty)+(N[(y0+1)*gw+x0]*(1-tx)+N[(y0+1)*gw+x0+1]*tx)*ty;
      var o=i*4,e=Math.max(0,Math.min(1,(1-inner)*2.1)),bite=inner+nz*.5;
      if(bite<.78){p[o+3]=p[o+3]*Math.max(0,(bite-.62)/.16);if(bite<.62)continue;}
      var d=e*.8,l=Math.max(0,(inner-.82)/.18)*.3*(.3+nz*1.2); // 가장자리는 먹, 속은 물기로 옅게
      p[o]=p[o]*(1-d)+INK[0]*d;p[o+1]=p[o+1]*(1-d)+INK[1]*d;p[o+2]=p[o+2]*(1-d)+INK[2]*d;
      p[o]+=(PAPER[0]-p[o])*l;p[o+1]+=(PAPER[1]-p[o+1])*l;p[o+2]+=(PAPER[2]-p[o+2])*l;}
    g.putImageData(data,0,0);return sp;
  }
  global.HapilInk.rough=rough;

  /* ── 보스 발치의 먹구름: 먹 번짐 덩이 여럿이 천천히 일렁인다. 탄보다 아래에 그려 탄을 가리지 않는다 ── */
  var puff=null;
  function buildPuff(){var S=96,c=canvasOf(S,S),g=c.getContext('2d'),i;hold++;g.translate(S/2,S/2);
    for(i=0;i<7;i++){var a=rnd()*6.283,d=rnd()*S*.16,r=S*(.2+rnd()*.14),x=Math.cos(a)*d,y=Math.sin(a)*d*.6,m=g.createRadialGradient(x,y,0,x,y,r);
      m.addColorStop(0,'rgba(30,26,24,.78)');m.addColorStop(.5,'rgba(36,32,30,.46)');m.addColorStop(1,'rgba(40,36,34,0)');g.fillStyle=m;g.fillRect(x-r,y-r,r*2,r*2);}
    hold--;return c;}
  var PUFFS=[[-.42,.02,.5,.0],[-.2,-.05,.62,1.3],[.02,.03,.7,2.1],[.24,-.04,.6,3.4],[.44,.03,.5,4.2],[-.1,.1,.56,5.0],[.14,.11,.54,.7]];
  function footCloud(g,x,y,tall,time,alpha){
    puff=puff||buildPuff();var g0=g.globalAlpha;hold++;g.save();g.globalCompositeOperation='source-over';
    var cy=y+tall*.43,w=tall*.95,i;
    for(i=0;i<PUFFS.length;i++){var p=PUFFS[i],sw=Math.sin(time*.55+p[3]),s2=Math.cos(time*.4+p[3]*1.7),size=tall*p[2]*(1+.08*s2);
      g.globalAlpha=(.78+.14*sw)*(alpha||1)*g0;rawDraw.call(g,puff,x+p[0]*w+sw*tall*.05-size/2,cy+p[1]*tall+s2*tall*.025-size*.36,size,size*.72);}
    g.restore();hold--;
  }
  // 사용자 11-15: 코드로 그린 검은 구름은 별로 → 드라이브 프레임 애니메이션(독안개 12칸 루프, media/arcade-v43-fx/fx-poison-mist.webp)을 먹빛으로 바꿔 쓴다.
  var mist=null,mistInk=null,MIST={frames:12,cw:192,ch:147,fps:9};
  (function(){try{mist=new Image();mist.onload=function(){try{
      var c=canvasOf(mist.naturalWidth,mist.naturalHeight),g=c.getContext('2d',{willReadFrequently:true});rawDraw.call(g,mist,0,0);var d=g.getImageData(0,0,c.width,c.height),p=d.data,i,y,v;
      for(i=0;i<p.length;i+=4){if(!p[i+3])continue;y=(p[i]*.299+p[i+1]*.587+p[i+2]*.114)/255;v=Math.min(1,y*1.5);v=.1+.62*v; // 짙은 속은 농묵, 밝은 결은 담묵
        p[i]=INK[0]+(PAPER[0]-INK[0])*v;p[i+1]=INK[1]+(PAPER[1]-INK[1])*v;p[i+2]=INK[2]+(PAPER[2]-INK[2])*v;p[i+3]=Math.min(255,p[i+3]*1.25);}
      g.putImageData(d,0,0);mistInk=c;}catch(e){mistInk=null;}};mist.src='media/arcade-v43-fx/fx-poison-mist.webp';}catch(e){}})();
  function mistCloud(g,x,y,tall,time,alpha){
    if(!mistInk)return;var f=Math.floor(time*MIST.fps)%MIST.frames,w=tall*1.3,h=w*MIST.ch/MIST.cw,a0=g.globalAlpha;
    hold++;g.save();g.globalCompositeOperation='source-over';g.globalAlpha=a0*(alpha||1);
    rawDraw.call(g,mistInk,f*MIST.cw,0,MIST.cw,MIST.ch,x-w/2,y+tall*.5-h*.86,w,h);g.restore();hold--; // 칸 아래쪽 덩이가 발 자리에 오게
  }
  global.HapilInk.footCloud=mistCloud;global.HapilInk.footCloudDraft=footCloud;
  /* 몸 앞을 지나는 옅은 구름 한 겹(사용자 11-16 "구름에 녹아든 느낌"): 같은 먹 안개를 뒤집어 조금 높게, 옅게 얹어 구름 윗선이 곧은 띠로 남지 않게 한다 */
  function footVeil(g,x,y,tall,time,alpha){
    if(!mistInk)return;var f=(Math.floor(time*MIST.fps*.8)+5)%MIST.frames,w=tall*1.55,h=w*MIST.ch/MIST.cw,a0=g.globalAlpha,sway=Math.sin(time*.5)*tall*.04;
    hold++;g.save();g.globalCompositeOperation='source-over';g.globalAlpha=a0*.5*(alpha||1);g.translate(x+sway,0);g.scale(-1,1);
    rawDraw.call(g,mistInk,f*MIST.cw,0,MIST.cw,MIST.ch,-w/2,y+tall*.36-h*.86,w,h);g.restore();hold--;
  }
  /* 보스 아랫몸 녹이기(사용자 11-16): 몸만 따로 그린 판 g 에서 아래쪽을 지운다. 지우는 경계는 곧은 선이 아니라 물이 번진 먹 가장자리처럼
     들쭉날쭉하고, 몸에서 아래로 먹이 몇 가닥 흘러내린 듯 남은 자국이 있다. 경계는 숨 쉬듯 천천히 오르내린다. 판정과는 무관(그림만). */
  var meltMask=null,MELT={w:192,h:96};
  function buildMelt(){
    var Wd=MELT.w,Hd=MELT.h,c=canvasOf(Wd,Hd),g=c.getContext('2d',{willReadFrequently:true}),d,p,x,y,i,A=[],B=[],C=[];hold++;
    for(i=0;i<9;i++)A.push(rnd());for(i=0;i<23;i++)B.push(rnd());for(i=0;i<41;i++)C.push(rnd());
    function nz(T,t){var f=t*T.length,i0=Math.floor(f)%T.length,u=f-Math.floor(f);u=u*u*(3-2*u);return T[i0]*(1-u)+T[(i0+1)%T.length]*u;}
    function ss(a,b,v){v=Math.max(0,Math.min(1,(v-a)/(b-a)));return v*v*(3-2*v);}
    d=g.getImageData(0,0,Wd,Hd);p=d.data;
    for(x=0;x<Wd;x++){var u=x/Wd,edge=.08+.4*nz(A,u)+.22*nz(B,u),soft=.2+.16*nz(C,u+.3),drip=Math.pow(nz(C,u),3); // drip: 먹이 흘러내린 가닥(지우기를 늦춘다)
      for(y=0;y<Hd;y++){var v=y/Hd,a=ss(edge,edge+soft,v);a*=1-.55*drip*(1-ss(.55,1,v));p[(y*Wd+x)*4+3]=Math.round(255*a);}}
    g.putImageData(d,0,0);hold--;return c;
  }
  function melt(g,x,y,tall,time){
    meltMask=meltMask||buildMelt();var w=tall*3.2,top=y-tall*.1+Math.sin(time*.7)*tall*.02,h=tall*.62;
    hold++;g.save();g.globalCompositeOperation='destination-out';g.globalAlpha=1;
    rawDraw.call(g,meltMask,x-w/2+Math.sin(time*.23)*tall*.08,top,w,h); // 경계가 옆으로도 천천히 흐른다
    g.fillStyle='rgba(0,0,0,1)';g.fillRect(x-w/2-tall,top+h-1,w+tall*2,tall*2); // 그 아래는 모두 구름 속
    g.restore();hold--;
  }
  global.HapilInk.melt=melt;global.HapilInk.footVeil=footVeil;


  /* 영웅의 흰 구름: 한지보다 흰 뭉게구름에 먹 윤곽선(구름 문양). 발밑에서 천천히 일렁인다 */
  var hcloud=null;
  function buildHeroCloud(){var Wd=128,Hd=64,c=canvasOf(Wd,Hd),g=c.getContext('2d'),i;hold++;
    var L=[[26,40,15],[46,31,19],[68,28,21],[90,33,17],[106,41,13],[58,42,17],[80,43,16],[38,44,13]];
    g.fillStyle='rgba(60,54,50,.16)';g.beginPath();g.ellipse(64,50,54,9,0,0,6.283);g.fill();           // 아래 옅은 그늘
    g.strokeStyle='rgba(30,26,24,.85)';g.lineWidth=3.2;g.lineJoin='round';
    for(i=0;i<L.length;i++){g.beginPath();g.arc(L[i][0],L[i][1],L[i][2],0,6.283);g.stroke();}            // 윤곽(안쪽은 흰색으로 덮여 바깥 선만 남는다)
    g.fillStyle='#fffdf6';for(i=0;i<L.length;i++){g.beginPath();g.arc(L[i][0],L[i][1],L[i][2],0,6.283);g.fill();}
    g.strokeStyle='rgba(30,26,24,.4)';g.lineWidth=1.4;g.lineCap='round';                                   // 소용돌이 붓선 몇 가닥
    [[46,33,9,2.4,5.2],[70,31,10,2.6,5.6],[92,36,7,2.2,5.0]].forEach(function(q){g.beginPath();g.arc(q[0],q[1],q[2],q[3],q[4]);g.stroke();});
    hold--;return c;}
  function heroCloud(g,x,y,time){
    hcloud=hcloud||buildHeroCloud();hold++;g.save();g.globalCompositeOperation='source-over';
    var w=54+Math.sin(time*1.1)*2,h=w/2,dx=Math.sin(time*.8)*1.5;rawDraw.call(g,hcloud,x-w/2+dx,y-h*.62,w,h);g.restore();hold--;
  }
  global.HapilInk.heroCloud=heroCloud;

  /* ── 한지 결과 가장자리 번짐(프레임 끝에 곱해 덮는다) ── */
  var sheet=null;
  function buildSheet(){
    var W=360,H=640,c=canvasOf(W,H),g=c.getContext('2d'),i;hold++;
    g.fillStyle='#ffffff';g.fillRect(0,0,W,H);
    // 얼룩(큰 농담)
    for(i=0;i<26;i++){var x=rnd()*W,y=rnd()*H,r=60+rnd()*150,m=g.createRadialGradient(x,y,0,x,y,r),a=.035+rnd()*.045;m.addColorStop(0,'rgba(150,128,96,'+a+')');m.addColorStop(1,'rgba(150,128,96,0)');g.fillStyle=m;g.fillRect(x-r,y-r,r*2,r*2);}
    // 닥 섬유
    g.lineCap='round';
    for(i=0;i<420;i++){var fx=rnd()*W,fy=rnd()*H,ang=rnd()*Math.PI,len=4+rnd()*16,bend=(rnd()-.5)*6;g.strokeStyle=rnd()<.7?'rgba(120,98,70,'+(.05+rnd()*.09)+')':'rgba(255,252,240,'+(.25+rnd()*.3)+')';g.lineWidth=.4+rnd()*.7;
      g.beginPath();g.moveTo(fx,fy);g.quadraticCurveTo(fx+Math.cos(ang)*len/2+bend,fy+Math.sin(ang)*len/2+bend,fx+Math.cos(ang)*len,fy+Math.sin(ang)*len);g.stroke();}
    // 가장자리 먹 번짐: 고르지 않게 번진 테두리
    for(i=0;i<70;i++){var t=rnd(),side=i%4,ex=side===0?rnd()*W:side===1?rnd()*W:side===2?-8+rnd()*14:W+8-rnd()*14,ey=side===0?-8+rnd()*14:side===1?H+8-rnd()*14:rnd()*H,er=26+t*60,eg=g.createRadialGradient(ex,ey,0,ex,ey,er),ea=.06+rnd()*.1;
      eg.addColorStop(0,'rgba(52,44,38,'+ea+')');eg.addColorStop(.6,'rgba(52,44,38,'+ea*.45+')');eg.addColorStop(1,'rgba(52,44,38,0)');g.fillStyle=eg;g.fillRect(ex-er,ey-er,er*2,er*2);}
    hold--;return c;
  }
  var canvas=null;
  function finish(){
    if(slow)return;canvas=canvas||document.getElementById('arcade-canvas');if(!canvas)return;
    sheet=sheet||buildSheet();
    var g=canvas.getContext('2d');hold++;g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.filter='none';g.globalCompositeOperation='multiply';rawDraw.call(g,sheet,0,0,canvas.width,canvas.height);g.restore();hold--;
  }
  var raf=global.requestAnimationFrame;
  if(raf)global.requestAnimationFrame=function(fn){return raf.call(global,function(t){fn(t);try{finish();}catch(e){}});};
  global.HapilInk.finish=finish;
})(window);
