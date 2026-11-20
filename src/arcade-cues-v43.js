/* 보스 행동과 회피를 잇는 연출(2026-11-20, 사용자 '/검토' 연출 제안서 반영). 그리기와 소리만 한다. 판정·점수·난수는 src/arcade-v43.js 가 정한다.
   - 1장 정원 '가장 굵은 뿌리'(광선 cue 'root'): 예고 동안 보스 뒤 장식 원을 옅게 하고, 내려찍을 축에 먹이 맺히며, 영웅 가까운 아래쪽에도 같은 축을 짧게 찍는다.
   - 16장 베엘제붑 '거대한 위장': 접시를 기울여 먹점이 모이는 동안, 모이기 시작할 때 영웅이 서 있던 자리에 먹 고리를 남긴다(그 자리로 쏟아진다).
     격파 뒤에는 빈 의자 옆에 졸업사진(정본 [탐식의 주방])이 잠시 드러난다. 대사 없음.
   - 몹 쏘기 예고(엔진 m.cueAt): 쏘기 직전 몸을 영웅 쪽으로 살짝 틀고 총구에 먹이 맺힌다. 물러나는 몹은 총구 없이 가던 방향 먹 자취만.
   - 37장 대수문장 '짧은 틈'(광선 cue 'bolt'): 세로 명령이 켜질 때 빗장이 걸리며 금속음, 꺼질 때 빗장이 풀리며 걸쇠 소리.
   - 46장 두 사람이 코어를 돌려받는 격파, 56장 '세쌍둥이의 기록' 시작: 환도가 세 번 울린다(같은 세 박자).
   - 스펠 시작: 보스 뒤 한지가 잠시 비고(배경을 덮는 한지빛), 그 스펠의 첫 탄이 나오는 순간 붓 첫 획 소리.
   - 공격 단계가 오르면 실제로 늘어난 것(주포 2→3발 등)을 글로 보인다(gainText, hero-memory-v43.js 가 쓴다).
   다른 게임의 그림·소리·연출은 쓰지 않았다(원리만). */
(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HapilCues=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(global){
  'use strict';
  var W=360,H=640,TAU=Math.PI*2,INKC='#1e1a18',PAPER='#f3ead6',VERMILION='#a8382a',METAL='#4a4540';
  var WASH_TICKS=72,MEMORIAL_TICKS=300,MEMORIAL_DELAY=16,SPOT_TAIL=30,ROOT_FADE=.22,BOLT_SLIDE=14,STROKE_WINDOW=300;
  var st=null;
  function finite(n,d){return typeof n==='number'&&isFinite(n)?n:d;}
  function clamp(v,a,b){return v<a?a:v>b?b:v;}
  function raw(Ink,d){if(Ink&&Ink.raw)Ink.raw(d);}
  function reset(){st={stage:-1,wash:null,cardAt:-1,cardN:0,stroked:true,memorial:null,spot:null,bolts:typeof WeakMap==='function'?new WeakMap():null,boltOff:[]};}
  reset();
  function A(){return global.HapilArcade||null;}
  /* 공격 단계가 오르며 실제로 늘어난 것. POWER_SHOTS[단계] = [주포 수, 주포 간격, 유도탄 수, 유도 간격, 번개, …] */
  function gainText(level){
    var a=A(),P=a&&a.POWER_SHOTS;if(!P||!P[level]||!P[level-1])return '';
    var p=P[level-1],c=P[level],out=[];
    if(c[0]>p[0])out.push('주포 '+p[0]+'→'+c[0]+'발');
    if(c[2]>p[2])out.push('유도탄 '+p[2]+'→'+c[2]+'발');
    if(c[1]<p[1]||c[3]<p[3])out.push('연사 빨라짐');
    return out.join(' · ');
  }
  function segName(s,a){var g=a&&a.SEGMENTS&&a.SEGMENTS[s.seg];return g&&g.name||'';}
  function onEvent(e,s,a,play){
    if(!s||!st)return;
    if(e==='card'){var b=s.boss||{};st.wash={tick:s.tick,x:finite(b.x,W/2),y:finite(b.y,140)};st.cardAt=s.tick;st.cardN=s.n;st.stroked=false;
      if(segName(s,a)==='세쌍둥이의 기록'&&play)play('hwandoThree',b.x);}
    else if(e==='bossDown'){var dn=s.boss&&s.boss.down;if(!dn)return;
      if(dn.actor==='p2_beelzebub')st.memorial={x:clamp(finite(dn.x,W/2)-20,60,W-110),y:clamp(finite(dn.y,140)+46,150,330),tick:s.tick};
      // 46장(장면 50 '함께 되찾은 코어'): 두 주인이 코어를 돌려받는 마지막 격파에 환도가 세 번 울린다. 56장 '세쌍둥이의 기록'에서 같은 세 박자가 돌아온다.
      var g=a&&a.STAGES&&a.STAGES[st.stage>=0?st.stage:s.stageIndex];if(g&&g.scene==='50'&&dn.actor==='chief'&&play)play('hwandoThree',dn.x);}
  }
  /* 한 번의 상태 읽기마다 부른다(이벤트 뒤). 첫 획 소리·빗장 소리를 낸다. */
  function frame(s,a,play){
    if(!s||!st)return;
    if(!st.stroked&&s.stage==='card'){
      if(s.tick-st.cardAt>STROKE_WINDOW)st.stroked=true;
      else if(s.n>st.cardN){st.stroked=true;if(play)play('brushStroke',s.boss&&s.boss.x);}
      else st.cardN=Math.min(st.cardN,s.n);
    }
    var clang=0,release=0,i,l;
    for(i=0;i<s.lasers.length;i++){l=s.lasers[i];if(l.cue!=='bolt')continue;
      var ph=l.age<l.warn?0:l.age<l.warn+l.active?1:2,was=st.bolts?st.bolts.get(l):undefined;
      if(was===undefined)was=ph===0?0:ph; // 처음 본 광선은 지금 상태에서 시작(이어하기 직후 소리 몰림 방지)
      if(ph===1&&was===0)clang++;
      if(ph===2&&was<2){release++;st.boltOff.push({x:l.x,tick:s.tick,c:l.color});}
      if(st.bolts)st.bolts.set(l,ph);}
    if(st.boltOff.length>12)st.boltOff.splice(0,st.boltOff.length-12);
    if(clang&&play)play('gateClang',W/2);
    if(release&&play)play('boltRelease',W/2);
    var c=s.skillCast;
    if(c&&c.kind==='stomach'&&s.stage==='card'&&c.px!==undefined&&(!st.spot||st.spot.start!==c.start))st.spot={x:c.px,y:c.py,start:c.start,release:c.release,until:c.until,bx:c.x,by:c.y,angle:c.angle};
    st.stage=s.stageIndex;
  }
  function rootLaser(s){for(var i=0;i<s.lasers.length;i++){var l=s.lasers[i];if(l.cue==='root'&&l.age<l.warn+l.active)return l;}return null;}
  /* 보스 뒤 장식 원(룬 결계·마법진)의 진하기 배율: 뿌리가 내려찍힐 축을 읽을 동안 물러난다. */
  function decorFade(s){if(!s)return 1;var f=1,l=rootLaser(s),w=st&&st.wash;
    if(l){var k=Math.min(1,l.age/12),out=l.age>l.warn+l.active-10?(l.warn+l.active-l.age)/10:1;f=1-(1-ROOT_FADE)*k*Math.max(0,out);}
    if(w){var age=s.tick-w.tick;if(age>=0&&age<WASH_TICKS)f=Math.min(f,age<6?1-.9*age/6:age<40?.1:.1+.9*(age-40)/(WASH_TICKS-40));} // 스펠 시작: 보스 뒤 한지가 잠시 빈다(장식 원이 물러났다 돌아온다)
    return f;}
  /* 몹 몸 틀기 각도: 쏘기 직전 영웅 쪽으로 최대 0.22라디안. */
  function mobTilt(s,m){var a=A(),L=a&&a.MOB_CUE_LEAD||18;if(!m||m.cueAt===undefined||s.tick>m.cueAt||m.retreat)return 0;
    var k=1-(m.cueAt-s.tick)/(m.cueLead||L);if(k<=0)return 0;var dx=s.player.x-m.x;return clamp(dx/120,-1,1)*.22*Math.sin(Math.min(1,k)*Math.PI*.5);}
  /* 보스 그림 아래(배경 위): 스펠 시작 때 한지가 잠시 비는 자리. */
  function drawUnder(ctx,s,a,Ink){
    var w=st&&st.wash;if(!w)return;var age=s.tick-w.tick;if(age<0||age>WASH_TICKS){st.wash=null;return;}
    var k=age/WASH_TICKS,al=(k<.12?k/.12:1-(k-.12)/.88),b=s.boss||{},x=finite(b.x,w.x),y=finite(b.y,w.y),R=150+60*k;
    raw(Ink,1);ctx.save();var g=ctx.createRadialGradient(x,y,10,x,y,R);
    var col=Ink?'243,234,214':'200,190,175',top=Ink?.82:.22;
    g.addColorStop(0,'rgba('+col+','+(top*al)+')');g.addColorStop(.55,'rgba('+col+','+(top*.75*al)+')');g.addColorStop(1,'rgba('+col+',0)');
    ctx.fillStyle=g;ctx.fillRect(x-R,y-R,R*2,R*2);ctx.restore();raw(Ink,-1);
  }
  function blot(ctx,x,y,r,seed){ctx.beginPath();for(var v=0;v<10;v++){var q=v/10*TAU+seed,rr=r*(.84+.24*(((seed*7+v*5)%7)/6));if(v)ctx.lineTo(x+Math.cos(q)*rr,y+Math.sin(q)*rr);else ctx.moveTo(x+Math.cos(q)*rr,y+Math.sin(q)*rr);}ctx.closePath();ctx.fill();}
  function drawRoot(ctx,s,Ink,l){
    var x=finite(l.x,W/2),warn=l.age<l.warn,t=warn?l.age/l.warn:1,fade=warn?1:Math.max(0,1-(l.age-l.warn)/14),b=s.boss||{},top=Math.max(118,finite(b.y,120)+58),i;
    if(fade<=0)return;
    // 축에 먹이 맺힌다: 위에서 아래로 갈수록 작아지는 먹방울 줄, 맨 위 방울이 차오른다.
    // 한지빛 테두리를 먼저 깔아 붉은 예고선·탄 위에서도 먹방울이 탄과 다른 것으로 읽힌다.
    for(var pass=0;pass<2;pass++){ctx.fillStyle=pass?(Ink?INKC:'#e7dcff'):(Ink?PAPER:'#1a1428');var grow=pass?0:2.2;
      ctx.globalAlpha=(pass?.92:.8)*fade;ctx.save();ctx.translate(x,top-4);ctx.scale(1.9,.62);blot(ctx,0,0,(4+7*t)+grow,2.1);ctx.restore(); // 맨 위에 고이는 먹(번진 가장자리)
      ctx.globalAlpha=(pass?.9:.75)*fade;ctx.fillRect(x-1.2-grow*.5,top,2.4+grow,(46+70*t));                                  // 축을 따라 흐르는 먹줄
      for(i=0;i<4;i++){var yy=top+18+i*26*(.6+.4*t),r=(7.5-i*1.4)*(.4+.6*t)+grow;if(r<1)continue;ctx.globalAlpha=(pass?.9-i*.12:.7)*fade;blot(ctx,x,yy,r,i*1.3);}}
    // 영웅 가까운 아래쪽에 같은 축을 짧게: 양옆 붓 괄호(돕는 표시라 인주색).
    var py=finite(s.player.y,H-120),y0=clamp(py-64,H*.45,H-120),y1=Math.min(H-26,y0+110),hw=Math.max(14,l.width*.5)+5,pulse=.6+.4*Math.sin(l.age*.35);
    ctx.globalAlpha=(warn?(.35+.55*t)*pulse:.6)*fade;ctx.strokeStyle=Ink?VERMILION:'#ff8a7a';ctx.lineWidth=3;ctx.lineCap='round';
    for(var side=-1;side<=1;side+=2){var ex=x+side*hw;ctx.beginPath();ctx.moveTo(ex-side*5,y0);ctx.lineTo(ex,y0+6);ctx.lineTo(ex,y1-6);ctx.lineTo(ex-side*5,y1);ctx.stroke();}
    ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-6,y0-10);ctx.lineTo(x,y0-3);ctx.lineTo(x+6,y0-10);ctx.stroke(); // 위에서 온다는 작은 꺾쇠
  }
  function drawBolt(ctx,x,y,shut,Ink,live){
    // 빗장: 양쪽 고리(걸쇠) 사이로 가로대가 밀려 들어간다. shut 0=열림 1=잠김
    var hw=17,bar=hw*2+8,off=(1-shut)*(hw+10);
    ctx.lineWidth=2.4;ctx.strokeStyle=Ink?METAL:'#cfd6e0';ctx.fillStyle=Ink?PAPER:'#202530';
    for(var side=-1;side<=1;side+=2){ctx.beginPath();ctx.rect(x+side*hw-4,y-7,8,14);ctx.fill();ctx.stroke();}
    ctx.fillStyle=Ink?(live?'#2a2522':'#6b635a'):(live?'#ffffff':'#9aa3b0');ctx.beginPath();ctx.rect(x-bar/2+off,y-3.2,bar,6.4);ctx.fill();
    ctx.fillStyle=Ink?'#2a2522':'#cfd6e0';ctx.beginPath();ctx.arc(x-bar/2+off+bar-3,y,4.2,0,TAU);ctx.fill();
  }
  function drawBolts(ctx,s,Ink){
    var y=Math.max(116,finite(s.boss&&s.boss.y,110)+66),i,l;
    for(i=0;i<s.lasers.length;i++){l=s.lasers[i];if(l.cue!=='bolt'||l.age>=l.warn+l.active)continue;
      var shut=l.age<l.warn?Math.max(0,(l.age-(l.warn-BOLT_SLIDE))/BOLT_SLIDE):1,live=l.age>=l.warn;
      ctx.globalAlpha=Math.min(1,l.age/10)*.95;drawBolt(ctx,finite(l.x,0),y,shut,Ink,live);}
    for(i=st.boltOff.length-1;i>=0;i--){var o=st.boltOff[i],age=s.tick-o.tick;if(age>BOLT_SLIDE+10||age<0){st.boltOff.splice(i,1);continue;}
      ctx.globalAlpha=age<BOLT_SLIDE?1:1-(age-BOLT_SLIDE)/10;drawBolt(ctx,o.x,y,1-Math.min(1,age/BOLT_SLIDE),Ink,false);}
  }
  function drawStomach(ctx,s,Ink){
    var sp=st.spot;if(!sp)return;var now=s.tick;if(now<sp.start||now>sp.until+SPOT_TAIL||s.stage!=='card'){if(now>sp.until+SPOT_TAIL)st.spot=null;return;}
    var b=s.boss||{},bx=finite(b.x,sp.bx),by=finite(b.y,sp.by),pull=Math.min(1,(now-sp.start)/Math.max(1,sp.release-sp.start)),spit=now>=sp.release,i;
    // 접시: 보스 앞에서 잡아 둔 자리 쪽으로 기운다.
    var tilt=clamp(Math.cos(sp.angle),-1,1)*.55*pull,px=bx,py=by+34,live=now<=sp.until;
    if(live){ctx.save();ctx.translate(px,py);ctx.rotate(tilt);ctx.globalAlpha=.92;ctx.fillStyle=Ink?PAPER:'#e9e2d2';ctx.strokeStyle=INKC;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.ellipse(0,0,27,7.5,0,0,TAU);ctx.fill();ctx.stroke();ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,-.5,17,4.2,0,0,TAU);ctx.stroke();
      ctx.fillStyle=INKC;for(i=0;i<5;i++){var q=i/5*TAU+now*.08,rr=(1-pull)*13+2;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(Math.cos(q)*rr,Math.sin(q)*rr*.28-1,1.6+pull*1.2,0,TAU);ctx.fill();}
      ctx.restore();}
    // 기억된 자리: 모이기 시작할 때 영웅이 서 있던 곳. 옆으로 비키면 이 고리로 쏟아진다.
    var k=spit?Math.min(1,(now-sp.release)/12):0,fade=now>sp.until?1-(now-sp.until)/SPOT_TAIL:1,r=16-5*pull+8*k;
    ctx.globalAlpha=(.35+.5*pull)*fade*(1-k*.4);ctx.strokeStyle=INKC;ctx.lineWidth=2.6;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(sp.x,sp.y,r,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=INKC;ctx.globalAlpha=(.4+.4*pull)*fade;ctx.beginPath();ctx.arc(sp.x,sp.y,2.4+2*pull,0,TAU);ctx.fill();
    if(!spit&&live){ctx.globalAlpha=.22*pull;ctx.lineWidth=1.4;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(px,py+6);ctx.lineTo(sp.x,sp.y-r);ctx.stroke();ctx.setLineDash([]);}
  }
  function drawMemorial(ctx,s,Ink){
    // 다음 맵의 몹이 들어오면 바로 걷는다(앞 맵 장면이 새 전투에 남지 않게).
    var m=st.memorial;if(!m)return;if(s.stage==='wave'&&s.mobs.length){st.memorial=null;return;}var age=s.tick-m.tick-MEMORIAL_DELAY;if(age>MEMORIAL_TICKS){st.memorial=null;return;}if(age<0)return;
    var al=Math.min(1,age/40)*Math.min(1,(MEMORIAL_TICKS-age)/60),x=m.x,y=m.y;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=al*.9;
    // 빈 의자(먹 실루엣, 살짝 비스듬한 3/4 모습): 등받이 기둥 둘·가로대·앉판·다리 넷.
    var ink=Ink?INKC:'#d9cdb8';ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineWidth=3.6;ctx.beginPath();
    ctx.moveTo(x-18,y-42);ctx.lineTo(x-16,y);ctx.moveTo(x+8,y-46);ctx.lineTo(x+9,y-4);           // 등받이 기둥
    ctx.moveTo(x-19,y-40);ctx.lineTo(x+9,y-45);ctx.moveTo(x-17,y-26);ctx.lineTo(x+9,y-30);       // 가로대
    ctx.moveTo(x-16,y+2);ctx.lineTo(x-17,y+34);ctx.moveTo(x+9,y-2);ctx.lineTo(x+10,y+26);         // 뒷다리
    ctx.moveTo(x+4,y+10);ctx.lineTo(x+3,y+40);ctx.moveTo(x+28,y+6);ctx.lineTo(x+29,y+34);ctx.stroke(); // 앞다리
    ctx.beginPath();ctx.moveTo(x-17,y);ctx.lineTo(x+9,y-4);ctx.lineTo(x+30,y+5);ctx.lineTo(x+4,y+11);ctx.closePath();ctx.fill(); // 앉판
    // 의자 다리에 기대 둔 졸업사진: 바랜 액자 속 학사모 쓴 넷.
    ctx.translate(x+52,y+24);ctx.rotate(-.14);ctx.scale(1.25,1.25);ctx.fillStyle=Ink?'#e8dcc0':'#5a4a36';ctx.strokeStyle=Ink?INKC:'#e8dcc0';ctx.lineWidth=2;ctx.beginPath();ctx.rect(-19,-15,38,28);ctx.fill();ctx.stroke();
    ctx.fillStyle=Ink?'#8a7a64':'#c9b48e';ctx.globalAlpha=al*.85;for(var i=0;i<4;i++){var hx=-12+i*8,hy=i%2?-1:1;ctx.beginPath();ctx.arc(hx,hy,2.8,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(hx-4,hy+9);ctx.quadraticCurveTo(hx,hy+3,hx+4,hy+9);ctx.fill();ctx.fillRect(hx-3.6,hy-4.6,7.2,1.6);}
    ctx.restore();
  }
  function drawMobCues(ctx,s,Ink){
    var a=A(),L=a&&a.MOB_CUE_LEAD||18,i,m;
    for(i=0;i<s.mobs.length;i++){m=s.mobs[i];if(m.x!==m.x||m.y!==m.y)continue;
      if(m.retreat||m.y>finite(s.player.y,H)+12){ // 물러나는 몹: 총구를 거두고 가던 방향 먹 자취만
        var vx=finite(m.vx,0),vy=finite(m.vy,1),vl=Math.hypot(vx,vy)||1;ctx.fillStyle=Ink?INKC:'#cfc6ff';
        for(var j=1;j<=3;j++){ctx.globalAlpha=.16*(4-j)/3;ctx.beginPath();ctx.ellipse(m.x-vx/vl*j*9,m.y-vy/vl*j*9,4.5-j,2.6,Math.atan2(vy,vx),0,TAU);ctx.fill();}
        continue;}
      if(m.cueAt===undefined||s.tick>m.cueAt)continue;var k=1-(m.cueAt-s.tick)/(m.cueLead||L);if(k<=0)continue;
      var dx=s.player.x-m.x,dy=s.player.y-m.y,d=Math.hypot(dx,dy)||1,r=finite(m.r,12),off=Math.max(r*1.6+6,22),mx=m.x+dx/d*off,my=m.y+dy/d*off;
      // 탄(꽉 찬 먹 구슬)과 헷갈리지 않게 속이 빈 고리가 총구로 조여든다: 먹이 모이는 모습. 한지빛 테를 먼저 깔아 짙은 몸 위에서도 읽힌다.
      var rr=3+10*(1-k);ctx.lineWidth=3.6;ctx.globalAlpha=.55*(.4+.6*k);ctx.strokeStyle=Ink?PAPER:'#1a1428';ctx.beginPath();ctx.arc(mx,my,rr,0,TAU);ctx.stroke();
      ctx.lineWidth=1.6;ctx.globalAlpha=.35+.6*k;ctx.strokeStyle=Ink?INKC:'#ffffff';ctx.beginPath();ctx.arc(mx,my,rr,0,TAU);ctx.stroke();
      ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx-dx/d*rr*.2,my-dy/d*rr*.2);ctx.lineTo(mx+dx/d*(3+4*k),my+dy/d*(3+4*k));ctx.stroke();}
  }
  /* 아이템 위·광선 아래 층. */
  function drawWorld(ctx,s,a,Ink){
    if(!s||!st)return;
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';
    drawBolts(ctx,s,Ink);drawStomach(ctx,s,Ink);drawMemorial(ctx,s,Ink);drawMobCues(ctx,s,Ink);
    ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  /* 광선·탄 위 층: 뿌리 축의 먹 맺힘과 아래쪽 축 표시는 붉은 예고선 위에 그려야 읽힌다. */
  function drawOver(ctx,s,a,Ink){
    if(!s||!st)return;var l=rootLaser(s);if(!l)return;
    raw(Ink,1);ctx.save();ctx.globalCompositeOperation='source-over';drawRoot(ctx,s,Ink,l);ctx.restore();ctx.globalAlpha=1;raw(Ink,-1);
  }
  return {revision:1,drawOver:drawOver,reset:reset,onEvent:onEvent,frame:frame,decorFade:decorFade,mobTilt:mobTilt,drawUnder:drawUnder,drawWorld:drawWorld,gainText:gainText,
    WASH_TICKS:WASH_TICKS,MEMORIAL_TICKS:MEMORIAL_TICKS,_state:function(){return st;}};
});
