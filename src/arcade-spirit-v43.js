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
  function reset(){seal();popups.length=0;stamp=null;lineGlow=0;lineSeen=0;lineAge=0;bonusShown=-1;cleanSeg=-1;lostAt=-1e9;}
  function onEvent(e,s,A){
    if(!s)return;
    if(e==='card'){var seg=A.SEGMENTS[s.seg];if(seg&&seg.name&&!s.bossOnly&&!s.spellOnly){entry(seg.name,s.difficulty)[0]++;saveBook();}}
    else if(e==='capture'&&s.lastCapture){var c=s.lastCapture;if(c.name&&!s.bossOnly&&!s.spellOnly){var en=entry(c.name,s.difficulty);if(en[1]<en[0])en[1]++;saveBook();}
      stamp={ok:true,bonus:c.bonus,tick:s.tick,pieces:s.pieces,of:A.LIFE_PIECES,gift:s.pieces===0,y:stampY(s)};}
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
  /* 판 위에 그리는 것(흔들림을 같이 탄다): 수집선 · 받은 값 · 보스 위치 표식 */
  /* 수묵화풍(Ink 있음)에서는 한지 바탕에 먹 글씨·짙은 금빛, 예전 어두운 화면(?ink=0)에서는 어두운 바탕에 밝은 글씨. */
  function tone(Ink){return Ink?{plate:'rgba(244,236,218,.9)',edge:'rgba(40,32,26,.55)',text:'rgba(30,24,20,.95)',dim:'rgba(30,24,20,.72)',gold:'#9a6400',halo:'rgba(246,238,220,.95)'}:{plate:INK,edge:'rgba(246,234,210,.4)',text:PAPER,dim:'rgba(246,234,210,.8)',gold:GOLD,halo:'rgba(20,16,14,.9)'};}
  function plate(ctx,x,y,w,h,r,c){ctx.fillStyle=c.plate;ctx.strokeStyle=c.edge;ctx.lineWidth=1;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();}
  function drawWorld(ctx,s,A,Ink,playing,opt){
    opt=opt||{};var p=s.player,y0=A.AUTO_COLLECT_Y,i,c=tone(Ink);
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';
    // 수집선: 하트가 있을 때, 그리고 여정 첫 구간에서 잠깐.
    var intro=s.started!==false&&s.tick<LINE_INTRO&&s.stageIndex===0&&!s.results.length,want=s.itemCount>0||intro||lineGlow>0;
    if(playing){lineSeen+=((want?1:0)-lineSeen)*.12;lineAge=want?lineAge+1:lineSeen<.05?0:lineAge;}
    if(lineSeen>.02&&s.stage!=='lost'&&s.stage!=='won'&&!stamp){ // 낙관이 떠 있는 동안에는 선을 감춘다(낙관 쪽지 뒤로 점선이 지나가지 않게)
      var above=p.y<y0,on=above||lineGlow>0,a=lineSeen*(on?.95:.7);
      ctx.lineCap='round';
      if(on){ctx.globalAlpha=a*.5;ctx.strokeStyle=c.text;ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(10,y0+1.6);ctx.lineTo(W-10,y0+1.6);ctx.stroke();} // 금빛 선 아래 가는 먹 밑선: 한지 위에서도 선이 끝까지 보인다
      ctx.globalAlpha=a;ctx.strokeStyle=on?c.gold:c.text;ctx.lineWidth=1.5;ctx.setLineDash([3,6]);ctx.lineDashOffset=on?-(s.tick%18)*.5:0; // 켜진 동안 점선이 흐른다
      ctx.beginPath();ctx.moveTo(10,y0);ctx.lineTo(W-10,y0);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
      var la=opt.quiet||stamp?0:above?1:intro?1:Math.max(0,Math.min(1,(LABEL_TICKS-lineAge)/30)); // 안내 글은 처음 잠깐만(선은 남는다). 알림 띠·낙관이 떠 있는 동안에는 숨긴다
      if(la>0){ctx.font='700 11px '+SANS;ctx.textAlign='left';ctx.textBaseline='alphabetic';var label=above?'모두 거두는 중 · 최대값':'▲ 이 선 위에서 하트를 모두 거둔다';
        ctx.globalAlpha=Math.min(1,a*1.3)*la;ctx.lineWidth=3;ctx.strokeStyle=c.halo;ctx.strokeText(label,12,y0-6);ctx.fillStyle=above?c.gold:c.text;ctx.fillText(label,12,y0-6);
        ctx.textAlign='right';ctx.strokeText('▲',W-12,y0-6);ctx.fillText('▲',W-12,y0-6);}
    }
    if(playing&&lineGlow>0)lineGlow=Math.max(0,lineGlow-.03);
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
        var k=age<8?1.9-.9*(age/8):age<14?1-.06*(1-(age-8)/6):1,fade=age>life-24?(life-age)/24:1,cx=W/2-62,cy=opt.toast?Math.max(stamp.y,208):stamp.y,sz=50*k,art=seal(),tx=cx+38,pw=stamp.gift?162:128;
        ctx.globalAlpha=fade*Math.min(1,age/6)*.94;plate(ctx,cx+8,cy-25,pw+26,50,4,c);
        ctx.globalAlpha=fade*Math.min(1,age/6);ctx.textAlign='left';ctx.font='700 17px '+SERIF;ctx.fillStyle=c.text;ctx.fillText('봉인',tx,cy-4);ctx.font='700 17px '+SANS;ctx.fillStyle=c.gold;ctx.fillText('+'+comma(stamp.bonus),tx+42,cy-4);
        ctx.font='600 11px '+SANS;ctx.fillStyle=c.dim;ctx.fillText(stamp.gift?'조각이 모였다 · 목숨 또는 필살 +1':'봉인 조각 '+stamp.pieces+' / '+stamp.of,tx,cy+14);
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
    var by=finite(b.y,120),y=Math.max(96,Math.min(H-200,by+(by>236?-96:78))),k=age<6?age/6:1,fade=age>DOWN_TICKS-36?(DOWN_TICKS-age)/36:1,wide=Math.min(1,age/8);
    ctx.save();ctx.globalAlpha=fade*.86;ctx.fillStyle=c.plate;ctx.strokeStyle=c.edge;ctx.lineWidth=1; // 붓 띠: 가운데가 두껍고 양끝이 가는 한 획
    var half=118*wide;ctx.beginPath();ctx.moveTo(W/2-half,y);ctx.quadraticCurveTo(W/2,y-17,W/2+half,y-2);ctx.quadraticCurveTo(W/2,y+19,W/2-half,y);ctx.fill();ctx.stroke();
    ctx.globalAlpha=fade*k;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(20+6*(1-k))+'px '+SERIF;ctx.lineWidth=3;ctx.strokeStyle=c.halo;ctx.fillStyle=c.text;
    var clean=!!s.spellClean&&s.bonusLock>0,t1=clean?'격파 · 봉인 확정':'격파';ctx.strokeText(t1,W/2,y-1);ctx.fillText(t1,W/2,y-1);
    ctx.font='600 11px '+SANS;ctx.fillStyle=c.dim;var t2=clean?'남은 공격을 버티면 +'+comma(s.bonusLock):'남은 공격이 끝나면 쓰러진다';ctx.strokeText(t2,W/2,y+19);ctx.fillText(t2,W/2,y+19);
    ctx.restore();ctx.textBaseline='alphabetic';
  }
  /* 스테이지 결산 한 줄(알림 띠 아래 줄) */
  function tally(result){if(!result)return '';var out=[];if(result.spells>0)out.push('봉인 '+(result.captures||0)+'/'+result.spells);if(result.graze>=0)out.push('스침 '+result.graze);if(result.bonus>0)out.push('결산 +'+comma(result.bonus));return out.join(' · ');}
  return {SEAL_SRC:SEAL_SRC,onEvent:onEvent,consume:consume,drawWorld:drawWorld,drawHud:drawHud,reset:reset,history:history,tally:tally,comma:comma,BOOK_KEY:BOOK_KEY,
    state:function(){return {popups:popups.length,stamp:stamp?{ok:stamp.ok,bonus:stamp.bonus}:null,line:lineSeen,bonus:bonusShown};}};
});
