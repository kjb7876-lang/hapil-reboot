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
  function stampY(s){var b=s.boss||{},by=finite(b.down?b.down.y:b.y,120),y=by>236?by-96:by+118;if(Math.abs(y-s.player.y)<70)y=by>236?by+110:by-96;return Math.max(96,Math.min(H-170,y));}
  /* 낙관 그림(tools/build-seal-v43.py 가 구운 직접 그린 그림). 아직 못 받았으면 코드로 그린 네모 낙관으로 대신한다. */
  var SEAL_SRC='media/arcade-v43/seal-v43.webp',sealImg=null;
  function seal(){if(sealImg===null&&global.Image&&global.document){sealImg=new global.Image();sealImg.decoding='async';sealImg.src=SEAL_SRC;}return sealImg&&sealImg.complete&&sealImg.naturalWidth?sealImg:null;}
  function reset(){seal();popups.length=0;stamp=null;lineGlow=0;lineSeen=0;lineAge=0;bonusShown=-1;cleanSeg=-1;lostAt=-1e9;}
  function onEvent(e,s,A){
    if(!s)return;
    if(e==='card'){var seg=A.SEGMENTS[s.seg];if(seg&&seg.name&&!s.bossOnly){entry(seg.name,s.difficulty)[0]++;saveBook();}}
    else if(e==='capture'&&s.lastCapture){var c=s.lastCapture;if(c.name&&!s.bossOnly){var en=entry(c.name,s.difficulty);if(en[1]<en[0])en[1]++;saveBook();}
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
  function drawWorld(ctx,s,A,Ink,playing){
    var p=s.player,y0=A.AUTO_COLLECT_Y,i;
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';
    // 수집선: 하트가 있을 때, 그리고 여정 첫 구간에서 잠깐.
    var intro=s.started!==false&&s.tick<LINE_INTRO&&s.stageIndex===0&&!s.results.length,want=s.itemCount>0||intro||lineGlow>0;
    if(playing){lineSeen+=((want?1:0)-lineSeen)*.12;lineAge=want?lineAge+1:lineSeen<.05?0:lineAge;}
    if(lineSeen>.02&&s.stage!=='lost'&&s.stage!=='won'){
      var above=p.y<y0,a=lineSeen*(above||lineGlow>0?.85:.5);
      ctx.globalAlpha=a;ctx.strokeStyle=above||lineGlow>0?GOLD:'rgba(40,32,26,.9)';ctx.lineWidth=above||lineGlow>0?1.8:1.3;ctx.setLineDash([2,7]);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(10,y0);ctx.lineTo(W-10,y0);ctx.stroke();ctx.setLineDash([]);
      var la=above?1:intro?1:Math.max(0,Math.min(1,(LABEL_TICKS-lineAge)/30)); // 안내 글은 처음 잠깐만(선은 남는다): 보스전 내내 글자가 탄 위에 떠 있지 않게
      ctx.font='600 10px '+SANS;ctx.textAlign='left';ctx.textBaseline='alphabetic';var label=above?'모두 거두는 중 · 최대값':'▲ 이 선 위에서 하트를 모두 거둔다';
      var lw=ctx.measureText(label).width+10;ctx.globalAlpha=a*.8*la;ctx.fillStyle=INK;ctx.fillRect(10,y0-15,lw,13);ctx.globalAlpha=Math.min(1,a*1.4)*la;ctx.fillStyle=above?GOLD:PAPER;ctx.fillText(label,15,y0-5);
    }
    if(playing&&lineGlow>0)lineGlow=Math.max(0,lineGlow-.03);
    // 받은 값
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(i=popups.length-1;i>=0;i--){var q=popups[i],u=q.t/POPUP_TICKS;if(playing)q.t++;if(q.t>POPUP_TICKS){popups.splice(i,1);continue;}
      ctx.globalAlpha=u<.7?1:(1-u)/.3;ctx.font=(q.top?'700 13px ':'600 11px ')+SANS;var py=q.y-16-20*Math.sqrt(u),px=Math.max(34,Math.min(W-34,q.x)),txt='+'+comma(q.v)+(q.n>1?' ×'+q.n:'');
      ctx.lineWidth=3;ctx.strokeStyle='rgba(20,16,14,.85)';ctx.strokeText(txt,px,py);ctx.fillStyle=q.top?GOLD:PAPER;ctx.fillText(txt,px,py);}
    // 보스 위치 표식: 맨 아래 가장자리. 맞는 동안 옅어지고, 체력이 20% 아래면 깜박인다.
    var b=s.boss;
    if(s.stage==='card'&&b&&b.present&&!s.cardEnding){
      var bx=Math.max(14,Math.min(W-14,finite(b.x,W/2))),hit=s.tick-finite(b.hitTick,-99)<5,low=b.maxHp>0&&b.hp/b.maxHp<=.2,al=hit?.5:.95;if(low&&(s.tick>>3)%2)al*=.45;
      ctx.globalAlpha=al;ctx.fillStyle=VERMILION;ctx.strokeStyle='rgba(246,234,210,.9)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx,H-22);ctx.lineTo(bx+9,H-9);ctx.lineTo(bx-9,H-9);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.globalAlpha=al*.55;ctx.fillRect(bx-24,H-8,48,2);
    }
    ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  /* 화면 고정 표시: 봉인 보너스 줄 · 낙관 */
  function drawHud(ctx,s,A,Ink,opt){
    opt=opt||{};var seg=A.SEGMENTS[s.seg];
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';ctx.textBaseline='alphabetic';
    if(s.stage==='card'&&seg&&seg.spell&&!opt.hideBonus){
      var y=opt.bonusY||68,hist=history(seg.name,s.difficulty),clean=!!s.spellClean,val=clean?A.spellBonus(s):0;
      if(clean)cleanSeg=s.seg;else if(cleanSeg===s.seg){cleanSeg=-1;lostAt=s.tick;} // 보너스를 잃는 순간 한 번 깜박인다
      var lost=s.tick-lostAt<LOST_TICKS&&((s.tick-lostAt)>>2)%2===0;
      var text=clean?'봉인 +'+comma(val):'봉인 놓침',tail=hist[0]>0&&!s.bossOnly?'  '+hist[1]+'/'+hist[0]:'';
      ctx.font='700 11px '+SANS;var w1=ctx.measureText(text).width;ctx.font='10px '+SANS;var w2=ctx.measureText(tail).width,w=w1+w2+14;
      ctx.globalAlpha=.78;ctx.fillStyle=INK;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(W-12-w,y-12,w,16,8);ctx.fill();}else ctx.fillRect(W-12-w,y-12,w,16);
      ctx.globalAlpha=1;ctx.textAlign='right';ctx.font='10px '+SANS;ctx.fillStyle='rgba(246,234,210,.72)';ctx.fillText(tail,W-19,y);
      ctx.font='700 11px '+SANS;ctx.fillStyle=clean?GOLD:lost?PAPER:'rgba(200,196,188,.75)';ctx.fillText(text,W-19-w2,y);
      bonusShown=val;
    }
    if(stamp){
      var age=s.tick-stamp.tick,life=STAMP_TICKS;
      if(age<0||age>life)stamp=null;
      else{
        // 낙관: 크게 내려와 찍히고(8틱), 잠깐 눌렸다가 제 크기로. 끝에 옅어진다.
        var k=age<8?1.9-.9*(age/8):age<14?1-.06*(1-(age-8)/6):1,fade=age>life-24?(life-age)/24:1,cx=W/2-56,cy=stamp.y,sz=46*k,art=seal();
        ctx.globalAlpha=fade*(age<8?.4+.6*age/8:1);ctx.translate(cx,cy);ctx.rotate(-.1);
        if(art)ctx.drawImage(art,-sz*.62,-sz*.62,sz*1.24,sz*1.24);
        else{ctx.fillStyle=VERMILION;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(-sz/2,-sz/2,sz,sz,sz*.14);ctx.fill();}else ctx.fillRect(-sz/2,-sz/2,sz,sz);
        ctx.strokeStyle='rgba(246,234,210,.9)';ctx.lineWidth=1.4*k;ctx.strokeRect(-sz/2+3*k,-sz/2+3*k,sz-6*k,sz-6*k);
        ctx.fillStyle=PAPER;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(28*k)+'px '+SERIF;ctx.fillText('封',0,1.5*k);}
        ctx.rotate(.1);ctx.translate(-cx,-cy);ctx.textBaseline='alphabetic';
        if(age>=8){var ta=Math.min(1,(age-8)/8)*fade,tx=cx+34;ctx.globalAlpha=ta*.8;ctx.fillStyle=INK;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tx-6,cy-24,142,48,6);ctx.fill();}else ctx.fillRect(tx-6,cy-24,142,48);
          ctx.globalAlpha=ta;ctx.textAlign='left';ctx.font='700 16px '+SERIF;ctx.fillStyle=PAPER;ctx.fillText('봉인',tx,cy-5);ctx.font='700 15px '+SANS;ctx.fillStyle=GOLD;ctx.fillText('+'+comma(stamp.bonus),tx+40,cy-5);
          ctx.font='10px '+SANS;ctx.fillStyle='rgba(246,234,210,.85)';ctx.fillText(stamp.gift?'조각이 모였다 · 목숨 또는 필살 +1':'봉인 조각 '+stamp.pieces+' / '+stamp.of,tx,cy+13);}
      }
    }
    ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  /* 스테이지 결산 한 줄(알림 띠 아래 줄) */
  function tally(result){if(!result)return '';var out=[];if(result.spells>0)out.push('봉인 '+(result.captures||0)+'/'+result.spells);if(result.graze>=0)out.push('스침 '+result.graze);if(result.bonus>0)out.push('결산 +'+comma(result.bonus));return out.join(' · ');}
  return {SEAL_SRC:SEAL_SRC,onEvent:onEvent,consume:consume,drawWorld:drawWorld,drawHud:drawHud,reset:reset,history:history,tally:tally,comma:comma,BOOK_KEY:BOOK_KEY,
    state:function(){return {popups:popups.length,stamp:stamp?{ok:stamp.ok,bonus:stamp.bonus}:null,line:lineSeen,bonus:bonusShown};}};
});
