/* 기억사수(세로판 영웅) 성장형 공격·필살기·시간 둔화 그리기 (사용자 11-16).
 *  "스토리월드 기억사수기반으로 영웅 패시브공격 성장형+폭탄필살기도 성장형이펙트나오게 각 7단계", "이펙트가져와서 수묵화풍으로 개선가공",
 *  "지금영웅 구름에 수묵화풍시계그림넣어서 일반 가속 둔화에 따라 시계가 빨리돌고 늦게돌게끔 … 영웅공격가속 및 영웅주변적탄환 속도느려짐 … 7단계로".
 *  그림 원천: m0 StoryWorld 기억사수 이펙트 시트(Dots 제작·사용자 승인) → tools/build-hero-fx-v43.py 가 줄인 원색판과 수묵판을 media/arcade-v43-hero/ 에 굽는다.
 *   shard 결정탄 비행 8칸 · shatter 결정 파편 터짐 6칸 · bolt 기억 번개 8칸 · burst 궁극 폭발 12칸.
 *  규칙: 수묵(먹 농담)만 쓴다(인주색은 하트·붉은 탄·경고 전용). 영웅을 감싸는 원 고리는 그리지 않는다(둔화는 흩날리는 먹 붓끝으로). 십자가 없음.
 *  판정·피해는 엔진(arcade-v43.js)이 정한다. 이 파일은 그림만. */
(function(global){'use strict';
  var TAU=Math.PI*2,DIR='media/arcade-v43-hero/';
  var SHEETS={shard:{frames:8,cell:96,fps:14},shatter:{frames:6,cell:128,fps:16},bolt:{frames:8,cell:192,fps:26,ox:24},burst:{frames:12,cell:192,fps:16}};
  var img={},inkOn=function(){return !!(global.HapilInk&&global.HapilInk.on);};
  function load(){Object.keys(SHEETS).forEach(function(k){var i=new Image();i.src=DIR+k+(inkOn()?'-ink':'')+'.webp';img[k]=i;});}
  function ready(k){var i=img[k];return i&&i.complete&&i.naturalWidth>0;}
  function raw(d){if(global.HapilInk&&global.HapilInk.raw)global.HapilInk.raw(d);} // 수묵판은 이미 구운 먹 그림이라 색 바꾸기를 건너뛴다
  // 시트 한 칸: 칸 가운데(또는 ox)를 (x,y)에, 진행 방향 ang(시트는 오른쪽을 향함), 칸 한 변 size
  function cell(g,k,f,x,y,ang,size,alpha,stretch,ox){
    if(!ready(k))return;var S=SHEETS[k],c=S.cell,fi=Math.max(0,Math.min(S.frames-1,f|0));
    g.save();g.translate(x,y);if(ang)g.rotate(ang);g.globalAlpha=alpha;
    var sx=(stretch||1),o=(ox===undefined?c/2:ox);
    g.drawImage(img[k],fi*c,0,c,c,-o*size/c*sx,-size/2,size*sx,size);g.restore();
  }
  function blend(g){g.globalCompositeOperation=inkOn()?'source-over':'lighter';}

  /* ── 패시브 공격: 1~2단계는 붓끝 먹줄기, 3단계부터 기억 결정탄(단계마다 커진다) ── */
  var SHARD_SIZE=[0,0,0,22,24,26,28,31];
  function stroke(g,x,y,len,wid,alpha){ // 붓 한 획: 머리 짙고 꼬리 가늘게
    g.globalAlpha=alpha;g.fillStyle=inkOn()?'rgba(36,32,32,1)':'#ffd9a0';g.beginPath();g.moveTo(x,y-len*.5);g.quadraticCurveTo(x+wid,y-len*.2,x+wid*.3,y+len*.5);g.lineTo(x-wid*.3,y+len*.5);g.quadraticCurveTo(x-wid,y-len*.2,x,y-len*.5);g.fill();
  }
  function shots(g,s,t){
    var lv=s.power||1,i,big=SHARD_SIZE[lv],shardOk=lv>=3&&ready('shard'),f=Math.floor(t*SHEETS.shard.fps);
    raw(1);g.save();blend(g);
    for(i=0;i<s.sn;i++){
      var x=s.sx[i],y=s.sy[i],vx=s.svx?s.svx[i]:0,ang=-Math.PI/2+Math.atan2(vx,15);
      if(shardOk){var z=s.shoming[i]?big*.7:big;cell(g,'shard',f+i,x,y,ang,z,s.shoming[i]?.3:vx?.4:.5);} // 적 탄보다 한 단계 옅게(심사 1차)
      else{g.save();g.translate(x,y);g.rotate(Math.atan2(vx,15));stroke(g,0,0,s.shoming[i]?16:24+lv*2,s.shoming[i]?3:4+lv*.6,.5);g.restore();}
    }
    g.restore();raw(-1);
  }

  /* ── 기억 번개(5단계부터): 영웅→적으로 번개 시트를 늘여 그리고, 맞은 자리에 결정 파편이 터진다 ── */
  var zaps=[],pops=[],texts=[],bombs=[],quake=0;
  function takeZaps(s,t){
    var z=s.zaps;if(!z||!z.length)return;
    for(var i=0;i+4<z.length;i+=5){if(zaps.length<12)zaps.push({x0:z[i],y0:z[i+1],x1:z[i+2],y1:z[i+3],lv:z[i+4],t0:t});if(pops.length<30)pops.push({x:z[i+2],y:z[i+3],t0:t,size:56+z[i+4]*6});}
    z.length=0;
  }
  function drawZaps(g,t){
    for(var i=zaps.length-1;i>=0;i--){var z=zaps[i],f=(t-z.t0)*SHEETS.bolt.fps;if(f>=SHEETS.bolt.frames){zaps.splice(i,1);continue;}
      var dx=z.x1-z.x0,dy=z.y1-z.y0,d=Math.sqrt(dx*dx+dy*dy)||1,size=36+z.lv*4,len=size*(1-24*2/192);
      cell(g,'bolt',f,z.x0,z.y0,Math.atan2(dy,dx),size,.7,d/len,SHEETS.bolt.ox);} // 가늘고 짧게: 적 광선으로 오인되지 않게(심사 1차)
  }
  function drawPops(g,t){
    for(var i=pops.length-1;i>=0;i--){var p=pops[i],f=(t-p.t0)*SHEETS.shatter.fps;if(f<0)continue;if(f>=SHEETS.shatter.frames){pops.splice(i,1);continue;}cell(g,'shatter',f,p.x,p.y,p.rot||0,p.size,.9);}
  }

  /* ── 필살기 7단계. 단계가 오를수록 겹이 늘어난다(앞 단계 연출은 모두 포함):
   *  1 기억 섬광: 영웅 앞 궁극 폭발 한 번 · 2 기억 파편: 화면 위쪽 결정 파편 터짐 · 3 잔상 폭우: 아래에서 위로 결정탄 소나기
   *  4 회상 뇌격: 과녁(보스·몹)마다 번개 · 5 망각의 붕괴: 보스(또는 화면 가운데)에 큰 폭발 + 화면 먹물 번짐
   *  6 기억 범람: 화면을 가로지르는 연쇄 폭발 + 과녁마다 파편 · 7 기억 해방: 큰 붓글씨 '憶'(기억할 억)과 화면을 덮는 폭발 ── */
  function bomb(b,t,W,H){
    if(!b)return;var lv=b.level,cx=b.x,cy=Math.max(120,b.y-90),i,tg=b.targets||[],main=tg.length?[tg[0],tg[1]]:[W/2,H*.32];
    bombs.push({lv:lv,t0:t,name:b.name,x:b.x,y:b.y});
    bombs[bombs.length-1].bursts=[{x:cx,y:cy,t0:t,size:150+lv*22}];
    var B=bombs[bombs.length-1].bursts;
    if(lv>=2)for(i=0;i<3+lv;i++)pops.push({x:40+((i*97+lv*31)%(W-80)),y:70+((i*53)%Math.round(H*.45)),t0:t+.08+i*.05,size:70+lv*10,rot:i});
    if(lv>=3){B.rain=[];for(i=0;i<8+lv*5;i++)B.rain.push({x:12+((i*61)%(W-24)),d:(i*37%17)/17*.5,v:.9+(i%5)*.12});}
    if(lv>=4)for(i=0;i+1<tg.length&&i<16;i+=2)zaps.push({x0:b.x,y0:b.y-20,x1:tg[i],y1:tg[i+1],lv:lv,t0:t+.12+i*.02});
    if(lv>=5)B.push({x:main[0],y:main[1],t0:t+.35,size:260+lv*30});
    if(lv>=6){for(i=0;i<3;i++)B.push({x:W*(.2+.3*i),y:H*(.22+.14*((i+1)%2)),t0:t+.55+i*.15,size:200+lv*16});for(i=0;i+1<tg.length&&i<24;i+=2)pops.push({x:tg[i],y:tg[i+1],t0:t+.4,size:90});}
    if(lv>=7)B.push({x:W/2,y:H*.42,t0:t+1.05,size:240}); // 7단계는 큰 덩어리 대신 憶 획이 그어지는 박자(심사 1차: 5단계와 구분)
    quake=4+lv*2.2;texts.push({text:b.name,sub:'필살 Lv.'+lv,t0:t,x:b.x,y:b.y-70,big:true});
  }
  function drawBombs(g,t,W,H){
    for(var n=bombs.length-1;n>=0;n--){var o=bombs[n],age=t-o.t0,B=o.bursts,i;if(age>3.2){bombs.splice(n,1);continue;}
      if(o.lv>=7&&age<2.8)drawMemoryGlyph(g,age,W,H);
      // 5단계 이상: 화면에 먹물이 번졌다 걷힌다(빛 대신 먹)
      if(o.lv>=5&&age<1.1){var k=age<.2?age/.2:1-(age-.2)/.9,gg=g.createRadialGradient(W/2,H*.4,40,W/2,H*.4,H*.8);
        raw(1);g.save();g.globalCompositeOperation='source-over';var a=(inkOn()?.16:.14)*k;gg.addColorStop(0,inkOn()?'rgba(30,26,24,'+a*.4+')':'rgba(120,240,255,'+a*.5+')');gg.addColorStop(1,inkOn()?'rgba(30,26,24,'+a+')':'rgba(10,30,40,'+a+')');g.fillStyle=gg;g.fillRect(0,0,W,H);g.restore();raw(-1);}
      raw(1);g.save();blend(g);
      for(i=0;i<B.length;i++){var b=B[i],f=(t-b.t0)*SHEETS.burst.fps;if(f<0||f>=10)continue;var fa=(b.size>250?.62:.88)*(f<8?1:1-(f-8)/2);cell(g,'burst',f,b.x,b.y,i*.7,b.size,fa);} // 마지막 두 칸(옅은 고리처럼 남는 잔상)은 쓰지 않고 8~9칸에서 걷는다. 큰 폭발은 옅게 겹쳐 보스·탄을 오래 가리지 않게(심사 1차)
      if(B.rain)for(i=0;i<B.rain.length;i++){var r=B.rain[i],ra=age-r.d;if(ra<0||ra>1.1)continue;var ry=H+30-ra*r.v*H*1.1;cell(g,'shard',Math.floor(t*14)+i,r.x,ry,-Math.PI/2,34+o.lv*3,.85*(1-ra/1.1));}
      g.restore();raw(-1);
    }
  }
  /* 7단계 憶: 붓으로 쓴 글자. 한 번 구워 두고(갈필 결을 지운 자국), 왼쪽 위에서 오른쪽 아래로 획이 그어지듯 드러났다가 번지며 걷힌다. 화면 폭 62% 안에 온전히 */
  var glyph=null;
  function buildGlyph(){
    var S=300,c=document.createElement('canvas');c.width=c.height=S;var q=c.getContext('2d'),i;raw(1);
    q.fillStyle=inkOn()?'rgb(30,26,24)':'rgb(170,250,255)';q.font='900 '+Math.round(S*.86)+'px "Noto Serif KR","Noto Serif CJK KR","Noto Sans CJK KR",serif';q.textAlign='center';q.textBaseline='middle';
    for(i=0;i<3;i++){q.globalAlpha=i?.35:1;q.fillText('憶',S/2+(i?(i-1.5)*3:0),S/2+(i?(i-1.5)*2:0));} // 겹쳐 쓴 먹 번짐
    q.globalCompositeOperation='destination-out';var sd=7;function rr(){sd=(sd*16807)%2147483647;return sd/2147483647;}
    for(i=0;i<110;i++){var y=rr()*S,x=rr()*S,w=8+rr()*40;q.globalAlpha=.35+rr()*.5;q.fillRect(x,y,w,.8+rr()*1.4);} // 갈필: 마른 붓이 남긴 흰 결
    raw(-1);return c;
  }
  function drawMemoryGlyph(g,age,W,H){
    glyph=glyph||buildGlyph();var size=W*.62,x=W/2-size/2,y=H*.42-size/2,reveal=Math.min(1,Math.max(0,(age-.15)/.75)),fade=age<1.9?1:1-(age-1.9)/.9;if(reveal<=0||fade<=0)return;
    raw(1);g.save();g.globalCompositeOperation='source-over';g.globalAlpha=.62*fade;g.beginPath();var d=reveal*2.1*size;g.moveTo(x-20,y-20);g.lineTo(x-20+d,y-20);g.lineTo(x-20,y-20+d);g.closePath();g.clip();g.drawImage(glyph,x,y,size,size);g.restore();raw(-1);
  }
  function onEvent(e,s,t){
    if(e==='powerUp')texts.push({text:'기억 공격 Lv.'+s.power,sub:s.power>=5?'기억 번개':'',t0:t,x:s.player.x,y:s.player.y-48});
    else if(e==='powerDown')texts.push({text:'기억 공격 Lv.'+s.power,sub:'',t0:t,x:s.player.x,y:s.player.y-48,down:true});
    else if(e==='bombLevelUp')texts.push({text:'필살 Lv.'+s.bombLevel,sub:global.HapilArcade?global.HapilArcade.BOMB_NAMES[s.bombLevel]:'',t0:t,x:s.player.x,y:s.player.y-62});
    else if(e==='bomb')bomb(s.lastBomb,t,360,640);
  }
  function drawTexts(g,t){
    for(var i=texts.length-1;i>=0;i--){var o=texts[i],age=t-o.t0,life=o.big?1.6:1.1;if(age>life){texts.splice(i,1);continue;}
      var a=age<.12?age/.12:1-Math.max(0,age-life*.6)/(life*.4),y=o.y-age*16,x=Math.max(70,Math.min(290,o.x));
      raw(1);g.save();g.globalAlpha=a;g.textAlign='center';g.font=(o.big?'700 20px ':'700 13px ')+'"Noto Serif KR",serif';g.lineWidth=3;g.strokeStyle='rgba(255,253,246,.9)';g.fillStyle=o.down?'rgba(90,84,80,1)':'rgba(30,26,24,1)';
      if(!inkOn()){g.strokeStyle='rgba(0,0,0,.7)';g.fillStyle=o.down?'#9aa':'#bff6ff';}g.strokeText(o.text,x,y);g.fillText(o.text,x,y);
      if(o.sub){g.font='600 11px "Noto Serif KR",serif';g.strokeText(o.sub,x,y+15);g.fillText(o.sub,x,y+15);}g.restore();raw(-1);}
  }

  /* ── 구름 위 시계: 바늘은 보통 6초에 한 바퀴, 가속 4배, 둔화(저속) 4분의 1. 테두리 눈금 7개가 공격 단계만큼 짙어진다 ── */
  var hand=0,lastT=0;
  var RATE={normal:TAU/6,haste:TAU/1.5,slow:TAU/24};
  function clock(g,s,t){
    var dt=Math.max(0,Math.min(.1,t-lastT));lastT=t;var st=global.HapilArcade&&global.HapilArcade.clockState?global.HapilArcade.clockState(s):'normal';hand+=RATE[st]*dt;
    var p=s.player,x=p.x,y=p.y+23,r=11,lv=s.power||1,i,ink=inkOn();
    raw(1);g.save();g.globalCompositeOperation='source-over';g.globalAlpha=s.tick<p.invulnerableUntil&&Math.floor(s.tick/4)%2?.45:1;
    g.fillStyle=ink?'#fffdf6':'rgba(230,250,255,.92)';g.beginPath();g.ellipse(x,y,r,r*.92,0,0,TAU);g.fill(); // 시계판(구름 앞에 얹힌 작은 판)
    g.strokeStyle=ink?'rgba(30,26,24,.9)':'#1c3a48';g.lineWidth=1.5;g.lineCap='round';
    g.beginPath();for(i=0;i<14;i++){var a=-1.2+i*.2,rr=r*(1+((i*7)%3-1)*.03);if(i)g.lineTo(x+Math.cos(a*2.2)*rr,y+Math.sin(a*2.2)*rr*.92);else g.moveTo(x+Math.cos(a*2.2)*rr,y+Math.sin(a*2.2)*rr*.92);}g.stroke(); // 붓으로 그은 테(끊긴 데가 있다)
    for(i=0;i<7;i++){var ta=-Math.PI/2+i*TAU/7,on=i<lv;g.strokeStyle=on?(ink?'rgba(30,26,24,1)':'#0f7f9a'):(ink?'rgba(30,26,24,.22)':'rgba(30,60,70,.3)');g.lineWidth=on?2.4:1;
      g.fillStyle=g.strokeStyle;g.beginPath();g.arc(x+Math.cos(ta)*(r+3.2),y+Math.sin(ta)*(r+3.2)*.92,on?1.5:1,0,TAU);g.fill();} // 눈금 일곱: 공격 단계. 판 바깥 먹점으로 빼 바늘을 가리지 않게(심사 2차)
    g.strokeStyle=ink?'rgba(30,26,24,1)':'#0b2a33';g.lineWidth=2.1;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(hand-Math.PI/2)*r*.72,y+Math.sin(hand-Math.PI/2)*r*.72*.92);g.stroke(); // 긴 바늘
    g.lineWidth=2.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(hand/12-Math.PI/2)*r*.45,y+Math.sin(hand/12-Math.PI/2)*r*.45*.92);g.stroke(); // 짧은 바늘
    g.fillStyle=ink?'rgba(30,26,24,1)':'#0b2a33';g.beginPath();g.arc(x,y,1.2,0,TAU);g.fill();
    g.restore();raw(-1);
  }
  /* ── 시간 둔화: 원 고리 대신 영웅 둘레를 맴도는 먹 붓끝 몇 점(단계만큼 늘고 멀리 간다). 맴도는 빠르기도 시계를 따른다 ── */
  function field(g,s,t){
    var A=global.HapilArcade;if(!A||!A.slowField)return;var f=A.slowField(s),R=f[0],k=f[1],p=s.player,n=2+(s.power||1),i,ink=inkOn();
    raw(1);g.save();g.globalCompositeOperation='source-over';g.lineCap='round';
    for(i=0;i<n*2;i++){var u=((t*(.18+k*.1)+i*.381966)%1),ph=i*2.39996+hand*.35+Math.sin(i*1.7)*.5,rr=R*(.25+.75*((i*.618034+u*.5)%1)),x=p.x+Math.cos(ph)*rr,y=p.y+Math.sin(ph)*rr*.9;
      // 튄 먹물 방울: 영웅 곁에서 생겨 마르며 사라진다(선을 긋지 않아 둘레 고리로 읽히지 않는다, 심사 1차). 크기·자리를 들쭉날쭉하게
      g.globalAlpha=Math.min(1,Math.sin(Math.PI*u)*(.3+k*1.1));g.fillStyle=ink?'rgba(30,26,24,1)':'rgba(170,240,255,1)';var dr=(.7+k*2.6)*(.5+((i*.4142)%1));
      g.beginPath();g.ellipse(x,y,dr,dr*(.7+.3*((i*.31)%1)),ph,0,TAU);g.fill();if(i%3===0){g.beginPath();g.arc(x+Math.cos(ph)*dr*2.2,y+Math.sin(ph)*dr*2.2,dr*.45,0,TAU);g.fill();}}
    g.restore();raw(-1);
  }
  function draw(g,s,t){takeZaps(s,t);raw(1);g.save();blend(g);drawZaps(g,t);drawPops(g,t);g.restore();raw(-1);drawBombs(g,t,360,640);}
  function shake(){var q=quake;quake=0;return q;}
  function reset(){zaps.length=0;pops.length=0;texts.length=0;bombs.length=0;quake=0;}
  function hudLine(s){var lv=s.power||1,bl=s.bombLevel||1;return {attack:lv,bomb:bl};}
  load();
  global.HapilHeroFx={shots:shots,draw:draw,drawTexts:drawTexts,clock:clock,field:field,onEvent:onEvent,shake:shake,reset:reset,hudLine:hudLine,SHEETS:SHEETS,
    debug:function(){return {zaps:zaps.length,pops:pops.length,bombs:bombs.length,texts:texts.length,ready:Object.keys(SHEETS).filter(ready)};}};
})(window);
