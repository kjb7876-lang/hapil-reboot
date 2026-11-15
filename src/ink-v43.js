/* 수묵화풍 시안(코드만, 새 그림 없음). 주소에 ?ink=1 이 있을 때만 켜진다. 없으면 아무 일도 하지 않는다.
 * 방식: 게임 코드는 그대로 두고 캔버스 그리기 길목에서 바꾼다.
 *  1) 코드로 칠하는 색(탄·광선·문양·글자): 밝기를 뒤집고 채도를 낮춰 한지 위 먹·광물 안료 색으로.
 *  2) 더하기 합성(빛 번짐) → 곱하기(먹이 겹칠수록 짙어짐).
 *  3) 그림 파일: 인물·몹은 담채(옅은 색 먹그림)로, 배경은 한지 위 먹 번짐 + 윤곽 붓선으로 한 번만 굽는다.
 *  4) 프레임 끝에 한지 결·가장자리 먹 번짐을 덮는다. */
(function(global){'use strict';
  var on=/[?&]ink=1(&|$)/.test(global.location&&global.location.search||'');
  global.HapilInk={on:on};
  if(!on||!global.CanvasRenderingContext2D)return;
  document.documentElement.classList.add('ink');

  var PAPER=[242,233,214],INK=[30,26,24];
  var seed=20261115;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;} // 화면 난수와 섞이지 않는 제 난수
  var hold=0; // >0 이면 색을 바꾸지 않는다(이 파일이 직접 그릴 때)

  /* ── 색 바꾸기 ── */
  var NAMED={white:[255,255,255,1],black:[0,0,0,1],transparent:[0,0,0,0],red:[255,0,0,1]};
  function parse(v){
    var m;v=v.trim().toLowerCase();
    if(v.charAt(0)==='#'){var h=v.slice(1);if(h.length===3||h.length===4)h=h.replace(/./g,'$&$&');if(h.length!==6&&h.length!==8)return null;var n=parseInt(h.slice(0,6),16);if(n!==n)return null;
      return [n>>16&255,n>>8&255,n&255,h.length===8?parseInt(h.slice(6),16)/255:1];}
    if((m=/^rgba?\(([^)]+)\)$/.exec(v))){var p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);if(p.length<3)return null;return [p[0],p[1],p[2],p.length>3?p[3]:1];}
    return NAMED[v]||null;
  }
  function toInk(r,g,b){ // 밝은 색 → 짙은 먹/안료, 어두운 색 → 한지
    var mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,l=(mx+mn)/2,d=mx-mn,s=d?d/(1-Math.abs(2*l-1)):0,h=0;
    if(d){if(mx===r/255)h=((g-b)/255/d)%6;else if(mx===g/255)h=(b-r)/255/d+2;else h=(r-g)/255/d+4;h*=60;}
    var l2=.11+.82*(1-l),s2=Math.min(1,s)*.5*(l>.9?.4:1); // 거의 흰 색은 그냥 먹
    if(h>40&&h<70)l2=Math.min(l2,.4); // 황토는 한지와 붙지 않게 조금 짙게
    var c=(1-Math.abs(2*l2-1))*s2,x=c*(1-Math.abs((h/60)%2-1)),m=l2-c/2,R=0,G=0,B=0;h=((h%360)+360)%360;
    if(h<60){R=c;G=x;}else if(h<120){R=x;G=c;}else if(h<180){G=c;B=x;}else if(h<240){G=x;B=c;}else if(h<300){R=x;B=c;}else{R=c;B=x;}
    // 한지·먹의 따뜻한 기운을 살짝 섞는다
    var t=l2,wr=INK[0]+(PAPER[0]-INK[0])*t,wg=INK[1]+(PAPER[1]-INK[1])*t,wb=INK[2]+(PAPER[2]-INK[2])*t;
    return [Math.round((R+m)*255*.82+wr*.18),Math.round((G+m)*255*.82+wg*.18),Math.round((B+m)*255*.82+wb*.18)];
  }
  var memo={},memoN=0,VEIL=/^rgba\(5,5,14,\.(56|68)\)$/;
  function remap(v){
    if(hold||typeof v!=='string')return v;
    var hit=memo[v];if(hit!==undefined)return hit;
    if(VEIL.test(v)){memo[v]='rgba(242,233,214,.16)';return memo[v];} // 배경을 어둡게 누르던 막: 한지에서는 옅게만
    var p=parse(v),out=v;if(p){var k=toInk(p[0],p[1],p[2]);out='rgba('+k[0]+','+k[1]+','+k[2]+','+(Math.round(p[3]*1000)/1000)+')';}
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

  /* ── 그림 파일 굽기 ── */
  function canvasOf(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  var rawDraw=proto.drawImage;
  /* 인물·몹·소품: 담채. 색은 조금만 남기고 먹 농담으로. */
  function washSprite(img){
    var w=img.naturalWidth,h=img.naturalHeight,c=canvasOf(w,h),g=c.getContext('2d',{willReadFrequently:true});rawDraw.call(g,img,0,0);
    var data;try{data=g.getImageData(0,0,w,h);}catch(e){return img;}
    var p=data.data,i,y,v,r,gg,b;
    for(i=0;i<p.length;i+=4){if(!p[i+3])continue;r=p[i];gg=p[i+1];b=p[i+2];y=r*.299+gg*.587+b*.114;
      v=y/255;v=v<.5?2*v*v:1-2*(1-v)*(1-v);v=Math.pow(v,.8); // 농담 대비를 세우고 조금 밝게
      var keep=.3,ir=INK[0]+(PAPER[0]-INK[0])*v,ig=INK[1]+(PAPER[1]-INK[1])*v,ib=INK[2]+(PAPER[2]-INK[2])*v,lift=y?v*255/y:1;
      p[i]=Math.min(255,ir*(1-keep)+r*lift*keep);p[i+1]=Math.min(255,ig*(1-keep)+gg*lift*keep);p[i+2]=Math.min(255,ib*(1-keep)+b*lift*keep);}
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
    blur(L,B,2);blur(B,B,2);
    for(i=0;i<n;i++)hist[Math.min(255,B[i]|0)]++;
    var rank=new Float32Array(256),acc=0;for(i=0;i<256;i++){acc+=hist[i];rank[i]=acc/n;}
    for(y=0;y<h;y++)for(x=0;x<w;x++){i=y*w+x;
      var up=((y-1+h)%h)*w,dn=((y+1)%h)*w,xl=Math.max(0,x-1),xr=Math.min(w-1,x+1);
      var gx=(B[up+xr]+2*B[y*w+xr]+B[dn+xr])-(B[up+xl]+2*B[y*w+xl]+B[dn+xl]),gy=(B[dn+xl]+2*B[dn+x]+B[dn+xr])-(B[up+xl]+2*B[up+x]+B[up+xr]);
      var edge=Math.min(1,Math.sqrt(gx*gx+gy*gy)/70),r=rank[Math.min(255,B[i]|0)];
      var tone=.3+.7*Math.pow(r,.5);            // 대부분은 옅은 담묵
      tone-=edge*edge*.5;                         // 윤곽은 붓선으로 짙게
      tone+=(rnd()-.5)*.035;                      // 먹 입자
      tone=Math.max(.1,Math.min(1,tone));
      var o=i*4,keep=.1;p[o]=(INK[0]+(PAPER[0]-INK[0])*tone)*(1-keep)+Math.min(255,p[o]*2.2)*keep;p[o+1]=(INK[1]+(PAPER[1]-INK[1])*tone)*(1-keep)+Math.min(255,p[o+1]*2.2)*keep;p[o+2]=(INK[2]+(PAPER[2]-INK[2])*tone)*(1-keep)+Math.min(255,p[o+2]*2.2)*keep;p[o+3]=255;}
    g.putImageData(data,0,0);return c;
  }
  var washed=typeof WeakMap==='function'?new WeakMap():null;
  function inkOf(img){
    if(!washed||!img.complete||!img.naturalWidth)return img;
    var c=washed.get(img);
    if(!c){hold++;try{c=/\/bg-[^\/]*$/.test(img.src)?washPaper(img):washSprite(img);}catch(e){c=img;}hold--;washed.set(img,c);}
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
    var rgb=hexOf(color),pig=toInk(rgb[0],rgb[1],rgb[2]),t=tint&&tint!==color?hexOf(tint):null,edge=t?toInk(t[0],t[1],t[2]):pig,r=radius,i;
    var dark=[Math.round(edge[0]*.45+INK[0]*.55),Math.round(edge[1]*.45+INK[1]*.55),Math.round(edge[2]*.45+INK[2]*.55)];
    hold++;g.translate(reach*scale,reach*scale);g.scale(scale,scale);g.lineCap='round';g.lineJoin='round';
    if(kind==='orb'){
      var mid=[Math.round(pig[0]*.7+INK[0]*.3),Math.round(pig[1]*.7+INK[1]*.3),Math.round(pig[2]*.7+INK[2]*.3)],wet=[Math.round(pig[0]*.62+PAPER[0]*.38),Math.round(pig[1]*.62+PAPER[1]*.38),Math.round(pig[2]*.62+PAPER[2]*.38)];
      // 번짐: 옅은 담묵이 둘레로 고르지 않게 퍼진다
      g.fillStyle=css(mid,1);g.globalAlpha=.13;blob(g,Math.min(reach*.92,r*1.6),.36,9);g.fill();
      g.globalAlpha=.2;blob(g,Math.min(reach*.86,r*1.3),.3,9);g.fill();g.globalAlpha=1;
      // 몸: 붓으로 찍은 점. 가장자리에 먹이 고이고 가운데는 물기로 옅다
      var body=g.createRadialGradient(-r*.12,-r*.1,r*.05,0,0,r*1.08);body.addColorStop(0,css(wet,.95));body.addColorStop(.45,css(mid,1));body.addColorStop(.8,css(dark,1));body.addColorStop(1,css(INK,1));
      g.fillStyle=body;blob(g,r*1.02,.3,9);g.fill();
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
      // 큰 방울: 한 붓으로 돌린 원(끝이 살짝 벌어진다)
      g.fillStyle=css(pig,.2);blob(g,r*.98,.08,16);g.fill();
      var a0=rnd()*6.283,steps=40;for(i=0;i<steps;i++){var u=i/steps,a=a0+u*5.9,w=r*(.2-.14*u)*(1+(rnd()-.5)*.25);g.strokeStyle=css(dark,.95-.5*u*u);g.lineWidth=Math.max(.8,w);g.beginPath();g.arc(0,0,r*.86,a,a+5.9/steps+.05);g.stroke();}
      g.fillStyle=css(pig,1);blob(g,r*.28,.3,9);g.fill();
    }
    hold--;return {image:c,half:reach};
  }
  global.HapilInk.sprite=sprite;

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
    for(i=0;i<70;i++){var t=rnd(),side=i%4,ex=side===0?rnd()*W:side===1?rnd()*W:side===2?-8+rnd()*14:W+8-rnd()*14,ey=side===0?-8+rnd()*14:side===1?H+8-rnd()*14:rnd()*H,er=26+t*60,eg=g.createRadialGradient(ex,ey,0,ex,ey,er),ea=.1+rnd()*.16;
      eg.addColorStop(0,'rgba(52,44,38,'+ea+')');eg.addColorStop(.6,'rgba(52,44,38,'+ea*.45+')');eg.addColorStop(1,'rgba(52,44,38,0)');g.fillStyle=eg;g.fillRect(ex-er,ey-er,er*2,er*2);}
    hold--;return c;
  }
  var canvas=null;
  function finish(){
    canvas=canvas||document.getElementById('arcade-canvas');if(!canvas)return;
    sheet=sheet||buildSheet();
    var g=canvas.getContext('2d');hold++;g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.filter='none';g.globalCompositeOperation='multiply';rawDraw.call(g,sheet,0,0,canvas.width,canvas.height);g.restore();hold--;
  }
  var raf=global.requestAnimationFrame;
  if(raf)global.requestAnimationFrame=function(fn){return raf.call(global,function(t){fn(t);try{finish();}catch(e){}});};
  global.HapilInk.finish=finish;
})(window);
