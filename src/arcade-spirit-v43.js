/* 동방식 시스템의 화면 표시층(2026-11-20, docs/v43/touhou-systems.md). 그리기와 기록만 한다. 판정·점수는 src/arcade-v43.js 가 정한다.
   - 수집선: 하트가 떠 있을 때 '이 위에서 모두 거둔다'는 선을 보인다.
   - 보스 위치 표식: 화면 맨 아래에 보스의 가로 자리를 찍는다(영웅만 보고 있어도 사격을 맞출 수 있게). 플레이어를 돕는 표시라 인주색.
   - 봉인 보너스: 이름 붙은 패턴 아래에 지금 받을 수 있는 값이 줄어드는 것을 보이고, 봉인하면 낙관(도장)이 찍힌다.
   - 받은 값: 하트를 거둔 자리에 값이 뜬다. 최대값은 금빛.
   다른 게임의 그림·글꼴·연출은 쓰지 않았다(원리만). */
(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HapilSpirit=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(global){
  'use strict';
  var W=360,H=640,TAU=Math.PI*2,VERMILION='#a8382a',GOLD='#ffd86a',PAPER='#f6ead2',INK='rgba(20,16,14,.78)';
  var SERIF='"HapilSerif","Noto Serif KR","Noto Serif CJK KR","Nanum Myeongjo",serif',SANS='system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  var BOOK_KEY='hapil-arcade-v43-spellbook',POPUP_CAP=24,POPUP_TICKS=42,STAMP_TICKS=132,MISS_TICKS=84,LINE_INTRO=300;
  var book=null,popups=[],stamp=null,lineGlow=0,lineSeen=0,lineAge=0,bonusShown=-1,cleanSeg=-1,lostAt=-1e9,LABEL_TICKS=150,LOST_TICKS=36;
  function finite(n,d){return typeof n==='number'&&isFinite(n)?n:d;}
  function comma(n){n=Math.max(0,Math.floor(finite(n,0)));return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
  function loadBook(){if(book)return book;book={};try{var raw=global.localStorage&&global.localStorage.getItem(BOOK_KEY),v=raw?JSON.parse(raw):null;if(v&&typeof v==='object'&&!Array.isArray(v))Object.keys(v).slice(0,400).forEach(function(k){var e=v[k];if(Array.isArray(e)&&e.length===2&&e[0]>=0&&e[1]>=0&&e[1]<=e[0])book[k]=[Math.floor(e[0]),Math.floor(e[1])];});}catch(e){book={};}return book;}
  function saveBook(){try{if(global.localStorage)global.localStorage.setItem(BOOK_KEY,JSON.stringify(book));}catch(e){}}
  function entry(name,difficulty){var b=loadBook(),k=(difficulty||'normal')+'|'+name;return b[k]||(b[k]=[0,0]);}
  /* 패턴별 봉인 기록: [도전, 봉인]. 난이도마다 따로 센다. */
  function history(name,difficulty){var b=loadBook(),e=b[(difficulty||'normal')+'|'+name];return e?[e[0],e[1]]:[0,0];}
  /* 낙관 자리: 쓰러지는 보스와 영웅을 가리지 않는 높이. 보스가 내려와 있으면 그 위, 아니면 그 아래. */
  function stampY(s){var b=s.boss||{},by=finite(b.down?b.down.y:b.y,120),y=by>236?128:by+124;if(Math.abs(y-s.player.y)<70)y=by>236?by+110:128;return Math.max(110,Math.min(H-170,y));}
  /* 낙관 그림(tools/build-seal-v43.py 가 구운 직접 그린 그림). 아직 못 받았으면 코드로 그린 네모 낙관으로 대신한다. */
  var SEAL_SRC='media/arcade-v43/seal-v43.webp',sealImg=null;
  function seal(){if(sealImg===null&&global.Image&&global.document){sealImg=new global.Image();sealImg.decoding='async';sealImg.src=SEAL_SRC;}return sealImg&&sealImg.complete&&sealImg.naturalWidth?sealImg:null;}
  function reset(){seal();jack=null;popups.length=0;stamp=null;lineGlow=0;lineSeen=0;lineAge=0;bonusShown=-1;cleanSeg=-1;lostAt=-1e9;}
  var sound=null;function useSound(fn){sound=typeof fn==='function'?fn:null;}
  function onEvent(e,s,A){
    if(!s)return;
    if(e==='jackpot'&&s.lastJackpot){startJackpot(s,s.lastJackpot,sound);return;}
    if(e==='card'){var seg=A.SEGMENTS[s.seg];if(seg&&seg.name&&!s.bossOnly&&!s.spellOnly){entry(seg.name,s.difficulty)[0]++;saveBook();}}
    else if(e==='capture'&&s.lastCapture){var c=s.lastCapture;if(c.name&&!s.bossOnly&&!s.spellOnly){var en=entry(c.name,s.difficulty);if(en[1]<en[0])en[1]++;saveBook();}
      stamp={ok:true,bonus:c.bonus,tick:s.tick,pieces:s.pieces,of:A.LIFE_PIECES,gift:s.pieces===0,got:c.gift||'',y:stampY(s)};}
    else if(e==='captureMiss'&&stamp&&stamp.ok)stamp=null; // 놓친 패턴은 가운데에 따로 알리지 않는다(이름 아래 줄이 이미 회색): 못한 것을 되풀이해 띄우지 않는다
  }
  /* 엔진이 쌓아 둔 '받은 값'을 화면 목록으로 옮긴다(엔진 목록은 비운다). */
  function consume(s){
    var g=s.gets;if(!g||!g.length)return;
    // 한 틱에 여럿을 거두면 한 줄로 묶는다(영웅 자리에 숫자가 겹쳐 쌓이지 않게): 합계와 개수.
    var sum=0,n=0,top=true,x=0,y=0;for(var i=0;i+3<g.length;i+=4){sum+=g[i+2];n++;x+=g[i];y+=g[i+1];if(!g[i+3])top=false;}
    g.length=0;if(!n)return;if(top)lineGlow=1;
    var last=popups[popups.length-1];if(last&&last.t<24&&last.top===top){last.v+=sum;last.n+=n;last.t=Math.min(last.t,6);return;} // 줄줄이 빨려 오는 하트는 같은 숫자에 더한다
    if(popups.length>=POPUP_CAP)popups.shift();popups.push({x:x/n,y:y/n,v:sum,n:n,top:top,t:0});
  }
  function raw(Ink,d){if(Ink&&Ink.raw)Ink.raw(d);}
  /* 격파 잭팟(사용자 11-20 "보스를 잡으면 … 하트를 많이 주도록(잭팟느낌나게)"). 점수는 엔진이 이미 더했다(s.lastJackpot). 여기서는 그 하트 n개가
     쓰러진 자리 발치에서 분수처럼 솟구쳤다가 영웅에게 줄줄이 빨려 들어오며, 들어올 때마다 '하트 ×k'와 합계가 오른다. 하트 모양은 줍는 하트 그대로(사용자 11-14),
     둘레 빛과 숫자는 금빛(인주색은 쓰지 않는다: 돕는 예고·하트 자체의 색 몫). 쓰러지는 보스 몸을 가리지 않게 발치 아래에서 솟고, 보스가 먹으로 스미기 시작한 뒤 터진다. */
  var JACK_START=34,JACK_DROP=46,JACK_TAIL=96,jack=null;
  function rnd(i,k){var v=Math.sin(i*12.9898+k*78.233)*43758.5453;return v-Math.floor(v);}
  function startJackpot(s,j,play){var n=Math.max(0,Math.min(60,j.n|0)),mid=!!j.mid,x0=Math.max(30,Math.min(W-30,finite(j.x,W/2))),y0=Math.max(70,Math.min(H-220,finite(j.y,140)+JACK_DROP)),hs=[];
    for(var i=0;i<n;i++){var a=rnd(i,1),b=rnd(i,2),c=rnd(i,3);hs.push({d:JACK_START+i*(mid?3:1.4),x:x0+(a-.5)*18,y:y0,vx:(a-.5)*(mid?8:13)+(c-.5)*2,vy:-(1.6+b*(mid?2.4:3)),home:(mid?32:24)+(i%5)*2+c*5,st:0,age:0,k:.85+b*.3,r:(c-.5)*.5});}
    // 격파 필살기 보상(사용자 11-20): 받은 개수만큼 ✦ 별이 하트보다 조금 늦게, 더 크게 솟아 영웅에게 날아든다. 최대치라 못 받은 몫은 표에 '가득'으로만 알린다
    var bn=Math.max(0,Math.min(7,j.bombs|0)),bs=[];for(i=0;i<bn;i++){var e=rnd(i,7);bs.push({d:JACK_START+10+i*5,x:x0+(i-(bn-1)/2)*20,y:y0-6,vx:(i-(bn-1)/2)*1.6+(e-.5),vy:-(6.2+e*1.2),home:24,st:0,age:0});}
    jack={n:n,mid:mid,worth:j.worth|0,total:j.total|0,x:x0,y:y0,t:0,got:0,hs:hs,last:-99,play:typeof play==='function'?play:null,done:-1,
      bs:bs,bgot:0,bwant:Math.max(0,j.bombsWanted|0),bfull:!!j.bombsFull,bkind:j.bombKind||'',bglow:0};
    if(jack.play)jack.play('seal',x0);}
  function stepJackpot(p){var J=jack;J.t++;if(J.t===JACK_START&&J.play)J.play(J.mid?'item':'charge',J.x);
    for(var i=0;i<J.hs.length;i++){var q=J.hs[i];if(q.st===2||J.t<q.d)continue;q.age++;
      if(q.age<q.home){q.vy+=.24;q.vx*=.985;q.x+=q.vx;q.y+=q.vy;if(q.x<24||q.x>W-24){q.vx=-q.vx*.6;q.x=Math.max(24,Math.min(W-24,q.x));}q.st=0;}
      else{var dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy),sp=Math.min(19,4+(q.age-q.home)*.9);q.st=1;
        if(d<=sp+6){q.st=2;J.got++;J.glow=1;if(J.play&&J.t-J.last>=3){J.last=J.t;J.play('item',p.x);}if(J.got===J.n)J.done=J.t;}
        else{q.vx=dx/d*sp;q.vy=dy/d*sp;q.x+=q.vx;q.y+=q.vy;}}}
    for(i=0;i<J.bs.length;i++){q=J.bs[i];if(q.st===2||J.t<q.d)continue;q.age++;
      if(q.age<q.home){q.vy+=.3;q.vx*=.97;q.x+=q.vx;q.y+=q.vy;q.x=Math.max(24,Math.min(W-24,q.x));}
      else{dx=p.x-q.x;dy=p.y-q.y;d=Math.sqrt(dx*dx+dy*dy);sp=Math.min(16,3+(q.age-q.home)*.8);q.st=1;
        if(d<=sp+6){q.st=2;J.bgot++;J.bglow=1;if(J.play)J.play('seal',p.x);}else{q.vx=dx/d*sp;q.vy=dy/d*sp;q.x+=q.vx;q.y+=q.vy;}}}
  }
  /* 필살기 별: 네 갈래 빛(HUD 의 ✦ 과 같은 모양·같은 옥빛). 짙은 테두리 + 밝은 속으로 한지 위에서도 또렷하게 */
  function star(ctx,x,y,r,rot,a,c){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();for(var k=0;k<16;k++){var rr=k%2?r*.32:(k%4?r*.58:r),an=k*Math.PI/8;ctx[k?'lineTo':'moveTo'](Math.sin(an)*rr,-Math.cos(an)*rr);}ctx.closePath(); // 큰 꼭지 넷 + 짧은 대각 꼭지 넷: 작은 크기에서도 십자로 읽히지 않는 별빛(심사 11-20)
    ctx.globalAlpha=a;ctx.lineJoin='round';ctx.lineWidth=2.2;ctx.strokeStyle='#1d4f3f';ctx.stroke();ctx.fillStyle=c?c.jadeFill:'#7dffb0';ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(236,255,244,.95)';ctx.stroke();ctx.restore();}
  function drawJackpot(ctx,s,c,heart,playing){
    var J=jack,p=s.player;if(!J)return;if(playing)stepJackpot(p);
    if(J.done>=0&&J.t-J.done>JACK_TAIL){jack=null;return;}
    var i,q,z=J.mid?24:30;
    // 들어올 때마다 영웅 둘레가 금빛으로 한 번씩 부푼다(줄줄이 들어오면 빛이 이어진다)
    if(J.glow>0){var gl=J.glow;ctx.globalAlpha=gl*.8;ctx.strokeStyle='#e8b530';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,18+(1-gl)*20,0,TAU);ctx.stroke();var gg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,30+gl*16);gg.addColorStop(0,'rgba(255,232,150,.85)');gg.addColorStop(1,'rgba(255,216,106,0)');ctx.globalAlpha=gl*.7;ctx.fillStyle=gg;ctx.fillRect(p.x-48,p.y-48,96,96);if(playing)J.glow=Math.max(0,gl-.07);}
    // 터지는 순간: 발치에서 금빛 고리가 퍼지고 빛이 번진다
    var ft=J.t-JACK_START;if(ft>=0&&ft<44){var u=ft/44;ctx.globalAlpha=(1-u)*.55;var gr=ctx.createRadialGradient(J.x,J.y,0,J.x,J.y,30+u*70);gr.addColorStop(0,'rgba(255,226,140,.9)');gr.addColorStop(1,'rgba(255,216,106,0)');ctx.fillStyle=gr;ctx.fillRect(J.x-110,J.y-110,220,220);
      var rx=14+u*(J.mid?70:110),ry=6+u*(J.mid?24:40);ctx.globalAlpha=(1-u)*.9;ctx.strokeStyle='#6e4a10';ctx.lineWidth=5*(1-u)+1.4;ctx.beginPath();ctx.ellipse(J.x,J.y,rx,ry,0,0,TAU);ctx.stroke();ctx.strokeStyle='#ffe08a';ctx.lineWidth=2.4*(1-u)+.6;ctx.beginPath();ctx.ellipse(J.x,J.y,rx,ry,0,0,TAU);ctx.stroke();} // 두 겹 금빛(짙은 테두리+밝은 속): 한지 위에서도 탁해지지 않게
    for(i=0;i<J.hs.length;i++){q=J.hs[i];if(q.st===2||J.t<q.d)continue;
      var vs=Math.sqrt(q.vx*q.vx+q.vy*q.vy)||1,beat=1+Math.sin(J.t*.35+i)*.08,zz=z*q.k*beat*(q.age<6?.5+q.age/12:1)*(q.st===1?1:1);
      // 꼬리: 날아온 쪽으로 옅은 금빛 잔상 둘(곧게 날아오는 탄과 다르게 빛 알갱이로)
      var tl=q.st===1?4:2;ctx.fillStyle='#e8b530';for(var k=1;k<=tl;k++){ctx.globalAlpha=.34/k;ctx.beginPath();ctx.arc(q.x-q.vx/vs*k*7,q.y-q.vy/vs*k*7,zz*.22/k+1.2,0,TAU);ctx.fill();}
      ctx.globalAlpha=.5;var hg=ctx.createRadialGradient(q.x,q.y,zz*.2,q.x,q.y,zz*.62);hg.addColorStop(0,'rgba(255,236,160,.95)');hg.addColorStop(.8,'rgba(255,220,110,.55)');hg.addColorStop(1,'rgba(255,216,106,0)');ctx.fillStyle=hg;ctx.fillRect(q.x-zz,q.y-zz,zz*2,zz*2);
      ctx.globalAlpha=.85;ctx.strokeStyle='#8a5a12';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(q.x,q.y,zz*.5,0,TAU);ctx.stroke(); // 잭팟 하트만 금박 테두리: 평소 줍는 하트와 구분
      ctx.globalAlpha=1;if(heart){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.r+Math.sin(J.t*.12+i)*.15);ctx.drawImage(heart,-zz*.4,-zz*.4,zz*.8,zz*.8);ctx.restore();}else{ctx.fillStyle='#c9406e';ctx.beginPath();ctx.arc(q.x,q.y,zz*.4,0,TAU);ctx.fill();}}
    // 필살기 별(하트 위에 그린다): 옥빛 꼬리 + 둘레 빛
    for(i=0;i<J.bs.length;i++){q=J.bs[i];if(q.st===2||J.t<q.d)continue;var sv=Math.sqrt(q.vx*q.vx+q.vy*q.vy)||1,sr=(q.age<8?.5+q.age/16:1)*(J.mid?14:17);
      ctx.fillStyle=c.jadeFill;for(k=1;k<=3;k++){ctx.globalAlpha=.3/k;ctx.beginPath();ctx.arc(q.x-q.vx/sv*k*8,q.y-q.vy/sv*k*8,sr*.3/k+1.4,0,TAU);ctx.fill();}
      var sg=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,sr*2.2);sg.addColorStop(0,c.jadeGlow);sg.addColorStop(1,'rgba(90,190,150,0)');ctx.globalAlpha=.6;ctx.fillStyle=sg;ctx.fillRect(q.x-sr*2.2,q.y-sr*2.2,sr*4.4,sr*4.4);
      star(ctx,q.x,q.y,sr,J.t*.025*(i%2?-1:1)+i*.4,1,c);}
    if(J.bglow>0){var bgl=J.bglow,big=J.bkind==='chapter'&&J.bgot===J.bs.length?1.5:1;ctx.globalAlpha=bgl*.85;ctx.strokeStyle=c.jadeFill;ctx.lineWidth=1+bgl*2;ctx.beginPath();ctx.arc(p.x,p.y,(10+(1-bgl)*24)*big,0,TAU);ctx.stroke();if(bgl>.6)star(ctx,p.x,p.y-26,9,0,(bgl-.6)*2.5,c);if(playing)J.bglow=Math.max(0,bgl-.075);} // 도착: 옥빛 고리가 퍼지고 머리 위에 별이 한 번 번쩍인다. 챕터 막보스의 마지막 별은 고리가 더 크다
    // 영웅 쪽 숫자: 하트가 하나 들어올 때마다 오른다. 영웅 머리 위(받은 값 줄보다 한 칸 위)
    if(J.got>0){var fade=J.done>=0?Math.max(0,Math.min(1,(JACK_TAIL-(J.t-J.done))/24)):1,pop=J.done>=0&&J.t-J.done<10?1+.25*(1-(J.t-J.done)/10):1,
      side=p.x<W/2?1:-1,py=Math.max(118,Math.min(H-150,p.y-22)),title=J.mid?'하트 보상':J.bkind==='chapter'?'챕터 잭팟':'잭팟',cnt='하트 ×'+J.got,sum='+'+comma(J.got*J.worth),
      bl=J.bwant>0?(J.bs.length?'필살기 +'+J.bs.length+(J.bfull?' (가득)':''):'필살기 가득'):'',ex=bl?16:0;
      ctx.save();ctx.globalAlpha=fade;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
      ctx.font='700 '+Math.round((J.mid?17:23)*pop)+'px '+SERIF;var w1=ctx.measureText(title).width;ctx.font='700 '+Math.round((J.mid?13:15)*pop)+'px '+SANS;var w2=ctx.measureText(cnt).width,w3=bl?ctx.measureText(bl).width+18:0,bw=Math.max(w1,w2,w3)+28,px=Math.max(bw/2+6,Math.min(W-bw/2-6,p.x+side*(bw/2+34))); // 하트는 위에서 영웅 머리로 내려온다: 표는 영웅 옆, 넓은 쪽에 둔다
      ctx.globalAlpha=fade*(ex?.96:.9);py-=ex;plate(ctx,px-bw/2,py-(J.mid?36:42),bw,(J.mid?58:66)+ex,8,c);ctx.globalAlpha=fade;
      ctx.font='700 '+Math.round((J.mid?17:23)*pop)+'px '+SERIF;ctx.lineWidth=3;ctx.strokeStyle=c.halo;ctx.strokeText(title,px,py-(J.mid?18:20));ctx.fillStyle=c.gold;ctx.fillText(title,px,py-(J.mid?18:20));
      ctx.font='700 '+Math.round((J.mid?13:15)*pop)+'px '+SANS;ctx.fillStyle=c.text;ctx.fillText(cnt,px,py);
      ctx.font='700 '+(J.mid?11:12)+'px '+SANS;ctx.fillStyle=c.gold;ctx.fillText(sum,px,py+(J.mid?14:16));
      if(bl){ctx.font='700 '+(J.mid?12:13)+'px '+SANS;ctx.lineWidth=3;ctx.strokeStyle=c.halo;var by2=py+(J.mid?30:33);var bw3=ctx.measureText(bl).width,bx=px-9;ctx.strokeText(bl,bx,by2);ctx.fillStyle=c.jade;ctx.fillText(bl,bx,by2);star(ctx,bx+bw3/2+11,by2-4.5,7.5,0,fade,c);} // 글자 ✦ 대신 그린 별(글꼴에 따라 십자로 읽히지 않게)
      ctx.restore();}
  }
  /* 판 위에 그리는 것(흔들림을 같이 탄다): 수집선 · 받은 값 · 보스 위치 표식 */
  /* 수묵화풍(Ink 있음)에서는 한지 바탕에 먹 글씨·짙은 금빛, 예전 어두운 화면(?ink=0)에서는 어두운 바탕에 밝은 글씨. */
  function tone(Ink){return Ink?{plate:'rgba(244,236,218,.9)',edge:'rgba(40,32,26,.55)',text:'rgba(30,24,20,.95)',dim:'rgba(30,24,20,.72)',gold:'#9a6400',halo:'rgba(246,238,220,.95)',jade:'#1d6e50',jadeFill:'#2e8a6a',jadeGlow:'rgba(214,246,228,.85)'}:{plate:INK,edge:'rgba(246,234,210,.4)',text:PAPER,dim:'rgba(246,234,210,.8)',gold:GOLD,halo:'rgba(20,16,14,.9)',jade:'#7dffb0',jadeFill:'#7dffb0',jadeGlow:'rgba(200,255,228,.8)'};}
  function plate(ctx,x,y,w,h,r,c){ctx.fillStyle=c.plate;ctx.strokeStyle=c.edge;ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();}
  function drawWorld(ctx,s,A,Ink,playing,opt){
    opt=opt||{};var p=s.player,y0=A.AUTO_COLLECT_Y,i,c=tone(Ink);
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';
    // 수집선: 하트가 있을 때, 그리고 여정 첫 구간에서 잠깐.
    var intro=s.started!==false&&s.tick<LINE_INTRO&&s.stageIndex===0&&!s.results.length,want=s.itemCount>0||intro||lineGlow>0;
    if(playing){lineSeen+=((want?1:0)-lineSeen)*.12;lineAge=want?lineAge+1:lineSeen<.05?0:lineAge;}
    if(lineSeen>.02&&s.stage!=='lost'&&s.stage!=='won'&&!stamp){ // 낙관이 떠 있는 동안에는 선을 감춘다(낙관 쪽지 뒤로 점선이 지나가지 않게)
      var above=p.y<y0,on=above||lineGlow>0,a=lineSeen*(on?.95:.7)*(opt.dim?.25:1); // dim: 보스가 모습을 바꾸는 동안은 선을 물린다(보스 몸 위로 안내선이 지나가지 않게)
      ctx.lineCap='round';
      if(on){ctx.globalAlpha=a*.5;ctx.strokeStyle=c.text;ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(10,y0+1.6);ctx.lineTo(W-10,y0+1.6);ctx.stroke();} // 금빛 선 아래 가는 먹 밑선: 한지 위에서도 선이 끝까지 보인다
      ctx.globalAlpha=a;ctx.strokeStyle=on?c.gold:c.text;ctx.lineWidth=1.5;ctx.setLineDash([3,6]);ctx.lineDashOffset=on?-(s.tick%18)*.5:0; // 켜진 동안 점선이 흐른다
      ctx.beginPath();ctx.moveTo(10,y0);ctx.lineTo(W-10,y0);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
      var la=opt.quiet||opt.dim||stamp?0:above?1:intro?1:Math.max(0,Math.min(1,(LABEL_TICKS-lineAge)/30)); // 안내 글은 처음 잠깐만(선은 남는다). 알림 띠·낙관이 떠 있는 동안에는 숨긴다
      if(la>0){ctx.font='700 11px '+SANS;ctx.textAlign='left';ctx.textBaseline='alphabetic';var label=above?'모두 거두는 중 · 최대값':'선 위에 위치하는 자, 소소한 행복이 있으리.';
        ctx.globalAlpha=Math.min(1,a*1.3)*la;ctx.lineWidth=3;ctx.strokeStyle=c.halo;ctx.strokeText(label,12,y0-6);ctx.fillStyle=above?c.gold:c.text;ctx.fillText(label,12,y0-6);
        ctx.textAlign='right';ctx.strokeText('▲',W-12,y0-6);ctx.fillText('▲',W-12,y0-6);}
    }
    if(playing&&lineGlow>0)lineGlow=Math.max(0,lineGlow-.03);
    drawJackpot(ctx,s,c,opt.heart||null,playing);
    // 받은 값: 영웅 머리 위로 띄운다(영웅 그림에 가리지 않게)
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(i=popups.length-1;i>=0;i--){var q=popups[i],u=q.t/POPUP_TICKS;if(playing)q.t++;if(q.t>POPUP_TICKS){popups.splice(i,1);continue;}
      ctx.globalAlpha=u<.7?1:(1-u)/.3;ctx.font=(q.top?'700 14px ':'600 12px ')+SANS;var txt='+'+comma(q.v),sub=q.n>1?' '+q.n+'개':'',half=(ctx.measureText(txt).width+(sub?ctx.measureText(sub).width*.8:0))/2+4;
      var py=Math.max(54,Math.min(q.y,p.y)-46-16*Math.sqrt(u)),px=Math.max(half,Math.min(W-half,q.x));
      ctx.lineJoin='round';ctx.lineWidth=2.6;ctx.strokeStyle='rgba(44,30,14,.9)';ctx.textAlign='left';var x0=px-half+4,tw=ctx.measureText(txt).width;ctx.strokeText(txt,x0,py);ctx.fillStyle=q.top?'#e8b530':PAPER;ctx.fillText(txt,x0,py);
      if(sub){ctx.font='600 10px '+SANS;ctx.strokeText(sub,x0+tw,py);ctx.fillStyle=PAPER;ctx.fillText(sub,x0+tw,py);}ctx.textAlign='center';} // 합계를 크게, 개수는 작게(합계×개수로 읽히지 않게)
    ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  /* 화면 고정 표시: 봉인 보너스 줄 · 낙관 */
  function drawHud(ctx,s,A,Ink,opt){
    opt=opt||{};var seg=A.SEGMENTS[s.seg],c=tone(Ink);
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';ctx.textBaseline='alphabetic';
    if(s.stage==='card'&&seg&&seg.spell&&!opt.hideBonus){
      var y=opt.bonusY||68,hist=history(seg.name,s.difficulty),clean=!!s.spellClean,val=clean?A.spellBonus(s):0;
      if(clean)cleanSeg=s.seg;else if(cleanSeg===s.seg){cleanSeg=-1;lostAt=s.tick;} // 보너스를 잃는 순간 한 번 깜박인다
      var lost=s.tick-lostAt<LOST_TICKS&&((s.tick-lostAt)>>2)%2===0;
      var down=!!(s.cardDown||s.cardEnding); // 체력을 다 깎았다: 값이 굳었고, 남은 공격을 버티면 받는다(외부 심사 11-20)
      var text=clean?(down?'봉인 확정 +':'봉인 +')+comma(val):'봉인 놓침',tail=clean&&down?'  버티면 지급':hist[0]>0&&!s.bossOnly?'  기록 '+hist[1]+'/'+hist[0]:'';
      ctx.font='700 12px '+SANS;var w1=ctx.measureText(text).width;ctx.font='600 10px '+SANS;var w2=ctx.measureText(tail).width,w=w1+w2+16;
      ctx.globalAlpha=down&&clean?.9:.62;plate(ctx,W-12-w,y-13,w,18,9,c);
      ctx.globalAlpha=1;ctx.textAlign='right';ctx.font='600 10px '+SANS;ctx.fillStyle=c.dim;ctx.fillText(tail,W-20,y);
      ctx.font='700 12px '+SANS;ctx.fillStyle=clean?c.gold:lost?c.text:c.dim;ctx.fillText(text,W-20-w2,y);
      bonusShown=val;
    }
    drawDown(ctx,s,c);
    if(s.spellOnly&&s.stage!=='won'&&s.stage!=='lost'){ctx.font='700 11px '+SANS;var pt='스펠 연습 · 기록에 넣지 않음',pw2=ctx.measureText(pt).width+16;ctx.globalAlpha=.92;plate(ctx,12,(opt.bonusY||68)+10,pw2,18,9,c);ctx.globalAlpha=1;ctx.textAlign='left';ctx.fillStyle=c.text;ctx.fillText(pt,20,(opt.bonusY||68)+23);} // 연습 중임을 위쪽 봉인 줄 아래 왼편에 늘 보인다(영웅이 머무는 아래를 가리지 않게, 심사 2차)
    // 보스 위치 표식: 맨 아래 가장자리 눈금(바닥 안개·영웅 빛보다 위에 그려 묻히지 않게 화면 고정층에서). 맞는 동안 옅어지고, 체력이 20% 아래면 깜박인다.
    var b=s.boss;
    if(s.stage==='card'&&b&&b.present&&!s.cardEnding){
      var bx=Math.max(18,Math.min(W-18,finite(b.x,W/2))),hit=s.tick-finite(b.hitTick,-99)<5,low=b.maxHp>0&&b.hp/b.maxHp<=.2,al=hit?.6:1;if(low&&(s.tick>>3)%2)al*=.45;
      ctx.globalAlpha=al;ctx.fillStyle='#b02a1c';ctx.strokeStyle='rgba(250,244,230,.95)';ctx.lineWidth=1.6;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(bx,H-30);ctx.lineTo(bx+8,H-18);ctx.lineTo(bx+2.2,H-18);ctx.lineTo(bx+2.2,H-1);ctx.lineTo(bx-2.2,H-1);ctx.lineTo(bx-2.2,H-18);ctx.lineTo(bx-8,H-18);ctx.closePath();ctx.fill();ctx.stroke(); // 아래 테두리에 붙은 눈금: 세로 획 + 작은 세모(기존 겹화살 경고와 모양이 다르다)
    }
    if(stamp){
      var age=s.tick-stamp.tick-(stamp.wait||0),life=STAMP_TICKS;
      if(age>life)stamp=null;
      else if(age>=0){
        // 쪽지(한지 띠)가 먼저 깔리고, 낙관이 크게 내려와 그 모서리에 찍힌다(8틱). 찍히는 순간 인주가 튄다. 끝에 옅어진다.
        var k=age<8?1.9-.9*(age/8):age<14?1-.06*(1-(age-8)/6):1,fade=age>life-24?(life-age)/24:1,cx=W/2-62,cy=opt.toast?Math.max(stamp.y,208):stamp.y,sz=50*k,art=seal(),tx=cx+38,pw=stamp.gift?(stamp.got==='score'?200:162):128;
        ctx.globalAlpha=fade*Math.min(1,age/6)*.94;plate(ctx,cx+8,cy-25,pw+26,50,4,c);
        ctx.globalAlpha=fade*Math.min(1,age/6);ctx.textAlign='left';ctx.font='700 17px '+SERIF;ctx.fillStyle=c.text;ctx.fillText('봉인',tx,cy-4);ctx.font='700 17px '+SANS;ctx.fillStyle=c.gold;ctx.fillText('+'+comma(stamp.bonus),tx+42,cy-4);
        ctx.font='600 11px '+SANS;ctx.fillStyle=c.dim;ctx.fillText(stamp.gift?'조각이 모였다 · '+({life:'목숨 +1',bomb:'필살 +1',score:'목숨·필살 가득 · 10,000점'}[stamp.got]||'목숨 또는 필살 +1'):'봉인 조각 '+stamp.pieces+' / '+stamp.of,tx,cy+14);
        if(age>=8&&age<34){var su=(age-8)/26;ctx.fillStyle='#b02a1c';ctx.globalAlpha=fade*(1-su)*.85;for(var d=0;d<9;d++){var an=d*2.399+.6,rr=30+su*16+(d%3)*5;ctx.beginPath();ctx.arc(cx+Math.cos(an)*rr,cy+Math.sin(an)*rr*.9,1.2+(d%3)*.9,0,TAU);ctx.fill();}}
        ctx.globalAlpha=fade*(age<8?.4+.6*age/8:1);ctx.translate(cx,cy);ctx.rotate(-.1);
        if(art)ctx.drawImage(art,-sz*.62,-sz*.62,sz*1.24,sz*1.24);
        else{ctx.fillStyle=VERMILION;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(-sz/2,-sz/2,sz,sz,sz*.14);ctx.fill();}else ctx.fillRect(-sz/2,-sz/2,sz,sz);
        ctx.strokeStyle='rgba(246,234,210,.9)';ctx.lineWidth=1.4*k;ctx.strokeRect(-sz/2+3*k,-sz/2+3*k,sz-6*k,sz-6*k);
        ctx.fillStyle=PAPER;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(28*k)+'px '+SERIF;ctx.fillText('封',0,1.5*k);}
        ctx.rotate(.1);ctx.translate(-cx,-cy);ctx.textBaseline='alphabetic';
      }
    }
    ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  /* 체력 소진 알림(외부 심사 11-20 "보스 체력을 다 깎은 순간을 명확히"): 소진한 틱부터 1.6초 동안 보스 아래에 먹 붓 띠와 '격파'를 띄운다.
     감싸는 원은 쓰지 않는다(사용자 11-15). 띠는 가로 붓질 한 획 + 글씨. 뒤 1초에 걸쳐 옅어지고, 그 뒤에는 위쪽 봉인 줄('봉인 확정')이 이어 알린다. */
  var DOWN_TICKS=96;
  function drawDown(ctx,s,c){
    var b=s.boss;if(s.stage!=='card'||!s.cardDown||!b||!b.present)return;var age=s.tick-s.cardDown;if(age<0||age>DOWN_TICKS)return;
    var by=finite(b.y,120),y=Math.max(96,Math.min(H-200,by+(by>236?-118:132))),k=age<6?age/6:1,fade=age>DOWN_TICKS-36?(DOWN_TICKS-age)/36:1,wide=Math.min(1,age/8);
    ctx.save();ctx.globalAlpha=fade*.96;ctx.fillStyle=c.plate;ctx.strokeStyle=c.edge;ctx.lineWidth=1.4; // 붓 띠: 가운데가 두껍고 양끝이 가는 한 획
    var half=128*wide;ctx.beginPath();ctx.moveTo(W/2-half,y+4);ctx.quadraticCurveTo(W/2,y-24,W/2+half,y+2);ctx.quadraticCurveTo(W/2,y+38,W/2-half,y+4);ctx.fill();ctx.stroke();
    ctx.globalAlpha=fade*.55;ctx.fillStyle=c.text;for(var q=0;q<5;q++){var qx=W/2-half+q*half*.5,qy=y+30-Math.abs(q-2)*4;ctx.fillRect(qx-1,qy,2+((q*7)%3),1.4);} // 붓 끝 비백 몇 점
    if(age<20){var bx2=finite(b.x,W/2);ctx.globalAlpha=(1-age/20)*.7;for(var d=0;d<7;d++){var an=d*2.399+.3,rr=20+age*2.2+(d%3)*6;ctx.beginPath();ctx.ellipse(bx2+Math.cos(an)*rr,by+Math.sin(an)*rr*.7,2.4-(d%3)*.5,1.6,an,0,TAU);ctx.fill();}} // 소진 순간 보스 둘레로 먹물이 튄다(고리 아님, 흩어진 점)
    ctx.globalAlpha=fade*k;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(20+6*(1-k))+'px '+SERIF;ctx.lineWidth=3;ctx.strokeStyle=c.halo;ctx.fillStyle=c.text;
    var clean=!!s.spellClean&&s.bonusLock>0,t1='격파 · 마지막 공격';ctx.strokeText(t1,W/2,y-1);ctx.fillText(t1,W/2,y-1);
    ctx.font='700 12px '+SANS;ctx.lineWidth=2.4;var t2=clean?'끝까지 버티면 봉인 ':'남은 공격이 끝나면 쓰러진다',t3=clean?'+'+comma(s.bonusLock):'',w2=ctx.measureText(t2).width,w3=ctx.measureText(t3).width,x2=W/2-(w2+w3)/2;ctx.textAlign='left';ctx.strokeText(t2,x2,y+19);ctx.fillStyle=c.text;ctx.fillText(t2,x2,y+19);if(t3){ctx.strokeText(t3,x2+w2,y+19);ctx.fillStyle=c.gold;ctx.fillText(t3,x2+w2,y+19);}
    ctx.restore();ctx.textBaseline='alphabetic';
  }
  /* 스테이지 결산 한 줄(알림 띠 아래 줄) */
  function tally(result){if(!result)return '';var out=[];if(result.spells>0)out.push('봉인 '+(result.captures||0)+'/'+result.spells);if(result.graze>=0)out.push('스침 '+result.graze);if(result.bonus>0)out.push('결산 +'+comma(result.bonus));return out.join(' · ');}
  return {SEAL_SRC:SEAL_SRC,useSound:useSound,onEvent:onEvent,consume:consume,drawWorld:drawWorld,drawHud:drawHud,reset:reset,history:history,tally:tally,comma:comma,BOOK_KEY:BOOK_KEY,
    state:function(){return {jackpot:jack?{n:jack.n,got:jack.got,t:jack.t,bombs:jack.bs.length,bombsGot:jack.bgot,bombsWanted:jack.bwant}:null,popups:popups.length,stamp:stamp?{ok:stamp.ok,bonus:stamp.bonus}:null,line:lineSeen,bonus:bonusShown};}};
});
