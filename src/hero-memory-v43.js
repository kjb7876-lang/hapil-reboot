/* 기억사수·윤서하(세로판 영웅) 성장형 공격·필살기·시간 둔화 그리기.
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
  function load(){Object.keys(SHEETS).concat(['cutin']).forEach(function(k){var i=new Image();i.src=DIR+k+(inkOn()?'-ink':'')+'.webp';img[k]=i;});
    ['seoha','seoha-b'].forEach(function(id){var portrait=new Image(),H=global.HapilArcadeHeroes;portrait.src=H?H.get(id).cutin:'media/arcade-v43-heroes/seoha-portrait'+(id==='seoha-b'?'-v2':'')+'.webp';img[cutinKey(id)]=portrait;});
  }
  function isSeoha(id){return id==='seoha'||id==='seoha-b';}
  function heroId(s){return s&&isSeoha(s.hero)?s.hero:'memory';}
  function cutinKey(id){return id==='seoha-b'?'seohaBCutin':id==='seoha'?'seohaCutin':'cutin';}
  function heroProfile(s){var A=global.HapilArcade,H=global.HapilArcadeHeroes,p=A&&A.heroProfile?A.heroProfile(s):null;return p||(H&&H.get?H.get(heroId(s)):{name:isSeoha(heroId(s))?'윤서하':'기억사수',attackName:isSeoha(heroId(s))?'시간검 공격':'기억 공격',bombNames:[]});}
  function heroBombName(s,lv){var A=global.HapilArcade,p=heroProfile(s);return A&&A.bombName?A.bombName(s,lv):p.bombNames&&p.bombNames[lv]||A&&A.BOMB_NAMES&&A.BOMB_NAMES[lv]||'';}
  function timeColor(brass){return inkOn()?(brass?'#625e52':'#282b29'):(brass?'#c39b58':'#59bab6');}
  // 윤서하의 시간 기구는 시각 연출이다. 피해·성장·둔화 수치는 공유 엔진을 그대로 따른다.
  function clockwork(g,x,y,r,angle,alpha,teeth){
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.strokeStyle=timeColor(true);g.lineWidth=1.4;g.lineCap='round';
    g.beginPath();for(var i=0;i<teeth;i++){var a=TAU*i/teeth,c=Math.cos(a),v=Math.sin(a);g.moveTo(c*r*.72,v*r*.72);g.lineTo(c*r,v*r);g.lineTo(Math.cos(a+.12)*r,Math.sin(a+.12)*r);}g.stroke(); // 서로 떨어진 톱니: 닫힌 고리로 탄을 가리지 않는다
    g.strokeStyle=timeColor(false);g.lineWidth=1.7;g.beginPath();g.moveTo(-r*.2,r*.25);g.lineTo(0,0);g.lineTo(r*.65,-r*.25);g.moveTo(0,0);g.lineTo(-r*.12,-r*.52);g.stroke();g.restore();
  }
  function timeNeedle(g,x,y,angle,len,alpha,lv){
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.fillStyle=timeColor(false);var w=1.2+lv*.17;
    g.beginPath();g.moveTo(0,-len*.6);g.lineTo(w,len*.18);g.lineTo(0,len*.35);g.lineTo(-w,len*.18);g.closePath();g.fill();
    if(lv>=3){g.strokeStyle=timeColor(true);g.lineWidth=1.2;g.beginPath();g.moveTo(-w*1.8,len*.1);g.lineTo(w*1.8,len*.1);g.moveTo(0,len*.1);g.lineTo(w*1.4,-len*.12);g.stroke();}g.restore();
  }
  // 컷인 제목·성장 글자용 명조 조각(tools/build-cutin-font-v43.py, Noto Serif KR OFL). 캔버스 글자는 글꼴을 스스로 불러오지 않으므로 미리 읽는다.
  // 기기에 한글 명조가 없으면(아이폰·헤드리스) 고딕으로 떨어지던 문제(11-16 실검증). 못 읽으면 아래 글꼴 줄의 다음 글꼴을 쓴다.
  var SERIF='"HapilSerif","Noto Serif KR","Noto Serif CJK KR","Nanum Myeongjo",serif';
  try{if(global.FontFace&&global.document&&global.document.fonts){var face=new global.FontFace('HapilSerif','url(media/fonts/hapil-serif-v43.woff2) format("woff2")',{weight:'100 900'});global.document.fonts.add(face);face.load().catch(function(){});}}catch(e){}
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
    var lv=s.power||1,i,ink=inkOn(),big=SHARD_SIZE[lv],shardOk=lv>=3&&ready('shard'),f=Math.floor(t*SHEETS.shard.fps);
    raw(1);g.save();blend(g);
    if(isSeoha(heroId(s))){for(i=0;i<s.sn;i++)timeNeedle(g,s.sx[i],s.sy[i],Math.atan2(s.svx?s.svx[i]:0,15),s.shoming[i]?18:25+lv,ink?.75:s.shoming[i]?.4:.58,lv);g.restore();raw(-1);return;}
    for(i=0;i<s.sn;i++){
      var x=s.sx[i],y=s.sy[i],vx=s.svx?s.svx[i]:0,ang=-Math.PI/2+Math.atan2(vx,15);
      if(shardOk){var z=s.shoming[i]?big*.7:big;cell(g,'shard',f+i,x,y,ang,z,ink?(s.shoming[i]?.6:vx?.75:.9):(s.shoming[i]?.3:vx?.4:.5));} // 색판은 적 탄보다 한 단계 옅게(심사 1차). 수묵판 시트는 이미 회색이라 옅게 그리면 한지에 묻혀 안 보였다(11-16 실검증)
      else{g.save();g.translate(x,y);g.rotate(Math.atan2(vx,15));stroke(g,0,0,s.shoming[i]?16:24+lv*2,s.shoming[i]?3:4+lv*.6,.5);g.restore();}
    }
    g.restore();raw(-1);
  }

  /* ── 기억 번개(5단계부터): 영웅→적으로 번개 시트를 늘여 그리고, 맞은 자리에 결정 파편이 터진다 ── */
  var zaps=[],pops=[],texts=[],bombs=[],quake=0;
  function takeZaps(s,t){
    var z=s.zaps;if(!z||!z.length)return;
    for(var i=0;i+4<z.length;i+=5){if(zaps.length<12)zaps.push({x0:z[i],y0:z[i+1],x1:z[i+2],y1:z[i+3],lv:z[i+4],t0:t,hero:heroId(s)});if(pops.length<30)pops.push({x:z[i+2],y:z[i+3],t0:t,size:56+z[i+4]*6,hero:heroId(s)});}
    z.length=0;
  }
  function drawZaps(g,t){
    for(var i=zaps.length-1;i>=0;i--){var z=zaps[i],f=(t-z.t0)*SHEETS.bolt.fps;if(f>=SHEETS.bolt.frames){zaps.splice(i,1);continue;}
      var dx=z.x1-z.x0,dy=z.y1-z.y0,d=Math.sqrt(dx*dx+dy*dy)||1,size=36+z.lv*4,len=size*(1-24*2/192);
      if(isSeoha(z.hero)){var a=1-f/SHEETS.bolt.frames;g.save();g.globalAlpha=a*.42;g.strokeStyle=timeColor(false);g.lineWidth=1.2;g.beginPath();for(var j=0;j<6;j++){var u=j/6,v=(j+.55)/6;g.moveTo(z.x0+dx*u,z.y0+dy*u);g.lineTo(z.x0+dx*v,z.y0+dy*v);}g.stroke();g.restore();clockwork(g,z.x1,z.y1,9+z.lv,t*3,a*.55,7);}
      else cell(g,'bolt',f,z.x0,z.y0,Math.atan2(dy,dx),size,.7,d/len,SHEETS.bolt.ox);} // 가늘고 짧게: 적 광선으로 오인되지 않게(심사 1차)
  }
  /* ── 저속 간이 필살(사용자 11-17). 기억사수=인과의 역전: 적을 쫓는 먹빛 번개 선이 튀며 이어진다. 윤서하=시간차 공격: 시계가 돌고 잠시 뒤 굵은 시간검이 적을 쫓는다.
   *  피해는 엔진(s.skillFx 선분, s.fsSwords 검)이 정하고, 여기서는 그리기만 한다. 탄을 가리지 않게 가늘게, 0.3초 안에 사라진다. ── */
  var skillBolts=[],lastSkillLabel=-9;
  function takeSkillFx(s,t){
    var z=s.skillFx;if(!z||!z.length)return;
    for(var i=0;i+4<z.length;i+=5){if(z[i+4]<0){if(pops.length<30)pops.push({x:z[i+2],y:z[i+3],t0:t,size:46,hero:heroId(s)});}else if(skillBolts.length<24)skillBolts.push({x0:z[i],y0:z[i+1],x1:z[i+2],y1:z[i+3],hop:z[i+4],t0:t+z[i+4]*.06,seed:(z[i]*7+z[i+3]*3)|0});}
    z.length=0;
  }
  function jag(g,x0,y0,x1,y1,seed,w){
    var dx=x1-x0,dy=y1-y0,d=Math.sqrt(dx*dx+dy*dy)||1,nx=-dy/d,ny=dx/d,n=Math.max(3,Math.round(d/22)),i;
    g.beginPath();g.moveTo(x0,y0);for(i=1;i<n;i++){var u=i/n,o=(((seed+i*37)%11)-5)*w*.55;g.lineTo(x0+dx*u+nx*o,y0+dy*u+ny*o);}g.lineTo(x1,y1);g.stroke();
  }
  function drawBolts(g,t){
    for(var i=skillBolts.length-1;i>=0;i--){var b=skillBolts[i],age=t-b.t0;if(age>.32){skillBolts.splice(i,1);continue;}if(age<0)continue;
      var a=1-age/.32;g.save();g.lineCap='round';g.globalAlpha=a*.8;g.strokeStyle=inkOn()?'#262322':'#dff8ff';g.lineWidth=2.6-b.hop*.25;jag(g,b.x0,b.y0,b.x1,b.y1,b.seed,9);
      g.globalAlpha=a*.55;g.strokeStyle=inkOn()?'#7c7872':'#ffffff';g.lineWidth=1;jag(g,b.x0,b.y0,b.x1,b.y1,b.seed+5,9);g.restore();}
  }
  function drawSwords(g,s,t){
    var sw=s.fsSwords;if(!sw||!sw.length)return;
    for(var i=0;i<sw.length;i++){var w=sw[i],delay=global.HapilArcade&&global.HapilArcade.SWORD_DELAY||20;
      if(w.age<delay){var u=w.age/delay;clockwork(g,s.player.x,s.player.y-30,16+u*10,-t*9,.7*(1-u*.25),8);continue;}
      var back=Math.max(0,Math.min(1,(w.age-delay)/4));timeNeedle(g,w.x,w.y,w.ang+Math.PI/2,46,.92*back,7);
      for(var k=1;k<=3;k++)timeNeedle(g,w.x-Math.cos(w.ang)*k*11,w.y-Math.sin(w.ang)*k*11,w.ang+Math.PI/2,40,.22/k*back,5);}
  }
  function drawSkill(g,s,t){takeSkillFx(s,t);if(!skillBolts.length&&!(s.fsSwords&&s.fsSwords.length))return;raw(1);g.save();drawBolts(g,t);drawSwords(g,s,t);g.restore();raw(-1);}
  function drawPops(g,t){
    for(var i=pops.length-1;i>=0;i--){var p=pops[i],f=(t-p.t0)*SHEETS.shatter.fps;if(f<0)continue;if(f>=SHEETS.shatter.frames){pops.splice(i,1);continue;}if(isSeoha(p.hero))clockwork(g,p.x,p.y,p.size*(.14+.09*f/SHEETS.shatter.frames),(p.rot||0)+f*.13,(1-f/SHEETS.shatter.frames)*.62,7);else cell(g,'shatter',f,p.x,p.y,p.rot||0,p.size,.9);}
  }

  /* ── 필살기 7단계. 단계가 오를수록 겹이 늘어난다(앞 단계 연출은 모두 포함):
   *  1 기억 섬광: 영웅 앞 궁극 폭발 한 번 · 2 기억 파편: 화면 위쪽 결정 파편 터짐 · 3 잔상 폭우: 아래에서 위로 결정탄 소나기
   *  4 회상 뇌격: 과녁(보스·몹)마다 번개 · 5 망각의 붕괴: 보스(또는 화면 가운데)에 큰 폭발 + 화면 먹물 번짐
   *  6 기억 범람: 화면을 가로지르는 연쇄 폭발 + 과녁마다 파편 · 7 기억 해방: 큰 붓글씨 '憶'(기억할 억)과 화면을 덮는 폭발 ── */
  function bomb(b,t,W,H,s){
    if(!b)return;if(isSeoha(heroId(s))){timeBomb(b,s,t,W,H);return;}var lv=b.level,cx=b.x,cy=Math.max(120,b.y-90),i,tg=b.targets||[],main=tg.length?[tg[0],tg[1]]:[W/2,H*.32];
    bombs.push({lv:lv,t0:t,name:b.name,x:b.x,y:b.y});
    bombs[bombs.length-1].bursts=[{x:cx,y:cy,t0:t,size:150+lv*22}];
    var B=bombs[bombs.length-1].bursts;
    if(lv>=2)for(i=0;i<3+lv;i++)pops.push({x:40+((i*97+lv*31)%(W-80)),y:70+((i*53)%Math.round(H*.45)),t0:t+.08+i*.05,size:70+lv*10,rot:i});
    if(lv>=3){B.rain=[];for(i=0;i<8+lv*5;i++)B.rain.push({x:12+((i*61)%(W-24)),d:(i*37%17)/17*.5,v:.9+(i%5)*.12});}
    if(lv>=4)for(i=0;i+1<tg.length&&i<16;i+=2)zaps.push({x0:b.x,y0:b.y-20,x1:tg[i],y1:tg[i+1],lv:lv,t0:t+.12+i*.02});
    if(lv>=5)B.push({x:main[0],y:main[1],t0:t+.35,size:260+lv*30});
    if(lv>=6){for(i=0;i<3;i++)B.push({x:W*(.2+.3*i),y:H*(.22+.14*((i+1)%2)),t0:t+.55+i*.15,size:200+lv*16});for(i=0;i+1<tg.length&&i<24;i+=2)pops.push({x:tg[i],y:tg[i+1],t0:t+.4,size:90});}
    if(lv>=7)B.push({x:W/2,y:H*.42,t0:t+1.05,size:240}); // 7단계는 큰 덩어리 대신 憶 획이 그어지는 박자(심사 1차: 5단계와 구분)
    quake=4+lv*2.2;if(ready('cutin'))cut={t0:t,lv:lv,name:b.name,auto:!!b.auto};else texts.push({text:b.name,sub:'필살 Lv.'+lv,t0:t,x:b.x,y:b.y-70,big:true});
  }
  function timeBomb(b,s,t,W,H){
    var lv=b.level,targets=b.targets||[],x=targets.length>=2?targets[0]:W/2,y=targets.length>=2?targets[1]:H*.32;
    bombs.push({hero:heroId(s),lv:lv,t0:t,x:Math.max(35,Math.min(W-35,x)),y:Math.max(75,Math.min(380,y)),name:b.name||heroBombName(s,lv)});
    quake=3+lv*1.6;
    if(ready(cutinKey(heroId(s))))cut={t0:t,lv:lv,name:b.name||heroBombName(s,lv),auto:!!b.auto,hero:heroId(s),label:heroProfile(s).name};
    else texts.push({text:b.name||heroBombName(s,lv),sub:heroProfile(s).name+' · 필살 Lv.'+lv,t0:t,x:b.x,y:b.y-70,big:true});
  }
  function drawTimeBomb(g,o,age,W,H){
    if(age>1.8)return;var lv=o.lv,fade=Math.max(0,1-age/1.8),spread=Math.min(1,age/.5),r=28+lv*6;
    raw(1);g.save();g.globalCompositeOperation='source-over';
    clockwork(g,o.x,o.y,r*(.65+.35*spread),-age*(1+lv*.12),fade*.42,7+lv);
    for(var i=0;i<Math.min(7,lv);i++){var a=i*2.39996+age*.7,x=o.x+Math.cos(a)*(r+18)*spread,y=Math.max(55,Math.min(420,o.y+Math.sin(a)*(r+12)*spread));timeNeedle(g,x,y,a+Math.PI/2,19+lv*2,fade*.35,lv);}
    if(lv>=5){clockwork(g,o.x-65,Math.min(400,o.y+48),18+lv,age*2,fade*.25,8);clockwork(g,o.x+65,Math.max(55,o.y-42),16+lv,-age*2,fade*.25,8);}
    if(lv>=7){g.globalAlpha=fade*.32;g.strokeStyle=timeColor(true);g.lineWidth=2;g.beginPath();g.moveTo(o.x-90,o.y+24);g.lineTo(o.x,o.y);g.lineTo(o.x+45,o.y-70);g.stroke();} // 최대 단계의 엇갈린 큰 바늘, 화면 아래 탄·영웅 영역은 비운다
    g.restore();raw(-1);
  }
  function drawBombs(g,t,W,H){
    for(var n=bombs.length-1;n>=0;n--){var o=bombs[n],age=t-o.t0,B=o.bursts,i;if(age>3.2){bombs.splice(n,1);continue;}
      if(isSeoha(o.hero)){drawTimeBomb(g,o,age,W,H);continue;}
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
    q.fillStyle=inkOn()?'rgb(30,26,24)':'rgb(170,250,255)';q.font='900 '+Math.round(S*.86)+'px '+SERIF;q.textAlign='center';q.textBaseline='middle';
    for(i=0;i<3;i++){q.globalAlpha=i?.35:1;q.fillText('憶',S/2+(i?(i-1.5)*3:0),S/2+(i?(i-1.5)*2:0));} // 겹쳐 쓴 먹 번짐
    q.globalCompositeOperation='destination-out';var sd=7;function rr(){sd=(sd*16807)%2147483647;return sd/2147483647;}
    for(i=0;i<110;i++){var y=rr()*S,x=rr()*S,w=8+rr()*40;q.globalAlpha=.35+rr()*.5;q.fillRect(x,y,w,.8+rr()*1.4);} // 갈필: 마른 붓이 남긴 흰 결
    raw(-1);return c;
  }
  function drawMemoryGlyph(g,age,W,H){
    glyph=glyph||buildGlyph();var size=W*.62,x=W/2-size/2,y=H*.42-size/2,reveal=Math.min(1,Math.max(0,(age-.15)/.75)),fade=age<1.9?1:1-(age-1.9)/.9;if(reveal<=0||fade<=0)return;
    raw(1);g.save();g.globalCompositeOperation='source-over';g.globalAlpha=.62*fade;g.beginPath();var d=reveal*2.1*size;g.moveTo(x-20,y-20);g.lineTo(x-20+d,y-20);g.lineTo(x-20,y-20+d);g.closePath();g.clip();g.drawImage(glyph,x,y,size,size);g.restore();raw(-1);
  }
  /* ── 필살기 컷씬(사용자 11-16 "필살기사용시 영웅 짧은컷씬도 간지나게", "수묵화풍"): 0.95초.
   *  비스듬한 한지 띠가 오른쪽에서 붓으로 쓸듯 열리고, 그 안에 먹으로 그린 기억사수 초상(m0 초상을 수묵으로 구움)이 천천히 밀려 들어온다.
   *  눈매에 한지빛 섬광 한 줄, 띠 위아래는 마른 붓 테두리, 띠 안을 가로지르는 먹 속도선. 필살 이름은 붓글씨처럼 굵게. 단계가 높을수록 띠가 두껍고 속도선이 많다.
   *  7단계는 띠가 두 겹. 색은 먹 농담만(인주색 없음). 판정·시간은 멈추지 않는다(필살기 무적 2.5초 안에서 끝난다). ── */
  var cut=null,CUT_LIFE=.95;
  function brushEdge(g,x0,x1,y,thick,seed){ // 마른 붓 테두리: 굵기가 출렁이고 끝이 갈라진다
    var n=26,i,sd=seed;function rr(){sd=(sd*16807)%2147483647;return sd/2147483647;}
    g.beginPath();g.moveTo(x0,y);for(i=1;i<=n;i++){var x=x0+(x1-x0)*i/n;g.lineTo(x,y-thick*(.35+rr()*.65));}for(i=n;i>=0;i--){var x2=x0+(x1-x0)*i/n;g.lineTo(x2,y+thick*(.2+rr()*.5));}g.closePath();g.fill();
    g.save();g.globalAlpha*=.55;for(i=0;i<5;i++){var yy=y+(rr()-.5)*thick*1.6,xa=x0+rr()*(x1-x0)*.3;g.fillRect(xa,yy,(x1-x0)*(.25+rr()*.5),.8+rr()*1.2);}g.restore(); // 갈라진 붓털 자국
  }
  var cutImages={};
  function cutPortrait(hero){ // 초상 가장자리를 먹 번짐처럼 녹인다: 왼쪽·아래로 갈수록 투명(네모 경계가 띠에 비치지 않게, 심사 1차)
    var seoha=isSeoha(hero),key=cutinKey(hero);if(cutImages[key])return cutImages[key];var im=img[key],w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,c=document.createElement('canvas');if(seoha&&h>w*1.3)h=Math.round(w*1.05);c.width=w;c.height=h;var x=c.getContext('2d');
    if(seoha&&inkOn())x.filter='grayscale(1)';x.drawImage(im,0,0);x.filter='none';x.globalCompositeOperation='destination-in';var gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.3,'rgba(0,0,0,.55)');gr.addColorStop(.48,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=gr;x.fillRect(0,0,w,h);
    var gv=x.createLinearGradient(0,0,0,h);gv.addColorStop(0,'rgba(0,0,0,1)');gv.addColorStop(.8,'rgba(0,0,0,1)');gv.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gv;x.fillRect(0,0,w,h);
    var sd=1116;function rr(){sd=(sd*16807)%2147483647;return sd/2147483647;}x.fillStyle='rgba(0,0,0,1)';x.globalCompositeOperation='destination-out'; // 왼쪽 가장자리에 마른 붓털 결
    for(var i=0;i<26;i++){var yy=rr()*h,ww=w*(.12+rr()*.22);x.globalAlpha=.25+rr()*.5;x.fillRect(0,yy,ww,1.5+rr()*4);}
    cutImages[key]=c;return c;
  }
  function speedStroke(g,x0,x1,y,th){ // 갈필 속도선: 가운데가 굵고 양끝이 가늘게 빠진다
    var n=8,i;g.beginPath();g.moveTo(x0,y);for(i=1;i<n;i++){var u=i/n,w=th*Math.sin(Math.PI*u)*(.7+.3*Math.sin(i*2.7+y));g.lineTo(x0+(x1-x0)*u,y-w);}g.lineTo(x1,y);for(i=n-1;i>0;i--){var u2=i/n;g.lineTo(x0+(x1-x0)*u2,y+th*Math.sin(Math.PI*u2)*.45);}g.closePath();g.fill();
  }
  function drawCutin(g,t,W,H){
    if(!cut)return false;var age=t-cut.t0;if(age>CUT_LIFE||age<0){cut=null;return false;}
    var lv=cut.lv,ink=inkOn(),seoha=isSeoha(cut.hero),portrait=cutPortrait(cut.hero),open=Math.min(1,age/.13),close=age>CUT_LIFE-.16?(age-(CUT_LIFE-.16))/.16:0,ease=1-Math.pow(1-open,3);
    var bandH=118+lv*9,cy=H*.4,ang=-.17,i;
    raw(1);g.save();g.globalCompositeOperation='source-over';
    g.globalAlpha=.22*(1-close)*Math.min(1,age/.08);g.fillStyle=ink?'rgb(30,26,24)':'rgb(4,10,20)';g.fillRect(0,0,W,H); // 화면을 한 겹 누른다
    g.translate(W/2,cy-close*40);g.rotate(ang);g.globalAlpha=1-close;
    var L=W*1.5,x0=L/2-L*ease; // 오른쪽에서 열린다
    if(lv>=7){g.fillStyle=ink?'rgba(244,236,218,.38)':'rgba(10,22,40,.4)';g.fillRect(x0,-bandH*.5-22,L,bandH+44);g.fillStyle=ink?'rgba(30,26,24,.85)':seoha?'rgba(195,155,88,.7)':'rgba(120,230,255,.7)';brushEdge(g,x0,L/2,-bandH*.5-22,7,lv*97+3);brushEdge(g,x0,L/2,bandH*.5+22,7,lv*31+5);} // 7단계: 바깥에 한 겹 더
    g.save();g.beginPath();g.rect(x0,-bandH/2,L,bandH);g.clip();
    g.fillStyle=ink?'rgb(244,236,218)':seoha?'rgba(9,25,28,.94)':'rgba(10,22,40,.92)';g.fillRect(-L/2,-bandH/2,L,bandH); // 한지 띠
    g.fillStyle=ink?'rgb(30,26,24)':seoha?timeColor(false):'rgba(140,235,255,1)'; // 먹 속도선(갈필 획). 부제 줄은 비운다
    for(i=0;i<4+lv*3;i++){var sy=-bandH/2+((i*37.7)%bandH);if(Math.abs(sy-(bandH*.5-22))<9)continue;var sl=60+((i*53)%120),sx=L/2-((age*900*(1+(i%3)*.4)+i*71)%(L+sl));g.globalAlpha=(1-close)*.45;speedStroke(g,sx,sx+sl,sy,.8+((i*13)%5)*.45);}
    g.globalAlpha=1-close;var ph=bandH*1.65,pw=ph*(seoha?portrait.width/portrait.height:384/512),px=W*.3+lv*2-age*22+(1-ease)*80,top=-bandH*.56; // 초상: 띠 오른쪽, 두건·얼굴·총이 띠 안에 든다(제목과 겹치지 않게)
    if(ink)g.globalCompositeOperation='multiply';g.drawImage(portrait,px-pw/2,top,pw,ph);if(ink){g.globalAlpha=(.4+lv*.06)*(1-close);g.drawImage(portrait,px-pw/2,top,pw,ph);g.globalAlpha=1-close;}g.globalCompositeOperation='source-over'; // 먹(곱하기)으로 얹어 흰 데는 한지에 스며들고 먹만 남는다
    var ex=px-pw/2+pw*(205/384),ey=top+ph*(108/512),gl=Math.max(0,1-Math.abs(age-.32)/.14); // 눈매 섬광
    if(seoha){clockwork(g,-W*.25,-bandH*.22,19+lv,-age*2,.48*(1-close),7);clockwork(g,W*.07,bandH*.26,11+lv,age*3,.38*(1-close),8);}
    if(gl>0&&!seoha){g.globalAlpha=gl*(1-close);g.fillStyle=ink?'rgb(255,253,246)':'rgb(200,250,255)';g.beginPath();g.ellipse(ex,ey,26*gl+4,1.6,-.12,0,TAU);g.fill();}
    g.restore();
    g.fillStyle=ink?'rgb(30,26,24)':seoha?timeColor(true):'rgba(140,235,255,1)';g.globalAlpha=1-close;brushEdge(g,x0,L/2,-bandH/2,5+lv*.6,lv*13+1);brushEdge(g,x0,L/2,bandH/2,5+lv*.6,lv*7+2); // 띠 위아래 붓 테두리
    // 필살 이름: 띠 왼쪽에 굵은 붓글씨, 아래에 작게 단계
    var tx=-W*.36+(1-ease)*60;g.globalAlpha=(1-close)*Math.min(1,Math.max(0,(age-.08)/.12));g.textAlign='left';g.textBaseline='middle';
    g.font='700 '+(27+lv)+'px '+SERIF;if(seoha&&g.measureText){var tw=g.measureText(cut.name).width;if(tw>W*.63)g.font='700 '+Math.max(20,Math.floor((27+lv)*W*.63/tw))+'px '+SERIF;}g.lineWidth=5;g.strokeStyle=ink?'rgba(244,236,218,.95)':'rgba(0,0,0,.8)';g.strokeText(cut.name,tx,-6);g.fillStyle=ink?'rgb(30,26,24)':'#dff8ff';g.fillText(cut.name,tx,-6);
    g.font='700 13px '+SERIF;g.lineWidth=3;var sub=(seoha?((cut.label||'윤서하')+(cut.auto?' · 자동 필살 Lv.':' · 필살 Lv.')):(cut.auto?'피격 직전 · 자동 필살 Lv.':'기억사수 · 필살 Lv.'))+lv;g.strokeText(sub,tx+2,bandH*.5-22);g.fillText(sub,tx+2,bandH*.5-22);
    g.restore();raw(-1);return true;
  }
  function onEvent(e,s,t){
    if(e==='powerUp')texts.push({text:heroProfile(s).attackName+' Lv.'+s.power,sub:s.power>=5?(isSeoha(heroId(s))?'시계바늘 연쇄':'기억 번개'):'',t0:t,x:s.player.x,y:s.player.y-48});
    else if(e==='powerDown')texts.push({text:heroProfile(s).attackName+' Lv.'+s.power,sub:'',t0:t,x:s.player.x,y:s.player.y-48,down:true});
    else if(e==='bombLevelUp')texts.push({text:'필살 Lv.'+s.bombLevel,sub:heroBombName(s,s.bombLevel),t0:t,x:s.player.x,y:s.player.y-62});
    else if(e==='focusSkill'){if(t-lastSkillLabel>2.4){lastSkillLabel=t;texts.push({text:s.fsLast&&s.fsLast.kind==='sword'?'시간차 공격':'인과의 역전',sub:'',t0:t,x:s.player.x,y:s.player.y-34});}}
    else if(e==='bomb')bomb(s.lastBomb,t,360,640,s);
    else if(e==='bombPulse'){var pi=s.pulseInfo;if(pi)pulseFx(pi,s.bombLevel||1,t,heroId(s));}
    else if(e==='distort'){var side=(s.distorts%2)?1:-1;warps.push({x:s.player.x,y:s.player.y,t0:t,side:side,hero:heroId(s)});if(warps.length>4)warps.shift();hand+=TAU*1.25;texts.push({text:'시공 왜곡',sub:'',t0:t,x:s.player.x-side*44,y:s.player.y-22});}
  }
  /* ── 시공간 왜곡: 탄이 빗겨 간 자리. 한쪽(탄이 온 쪽)으로 휘어 바깥 아래로 빠져나가는 붓 획 서너 개와 엷은 잔상(닫힌 고리 없이, 0.5초. 심사 1차: 좌우 대칭 획이 렌즈 꼴 고리로 읽힘 → 한쪽 흐름으로) ── */
  var warps=[],WARP_LIFE=.5;
  function taper(g,x0,y0,cx,cy,x1,y1,w){ // 끝이 가는 붓 획(채운 모양): 2차 곡선을 따라 가운데가 굵다
    var n=14,i,L=[],R=[];for(i=0;i<=n;i++){var u=i/n,v=1-u,x=v*v*x0+2*v*u*cx+u*u*x1,y=v*v*y0+2*v*u*cy+u*u*y1,dx=2*v*(cx-x0)+2*u*(x1-cx),dy=2*v*(cy-y0)+2*u*(y1-cy),d=Math.sqrt(dx*dx+dy*dy)||1,ww=w*Math.pow(Math.sin(Math.PI*Math.min(1,u*1.15)),.8)*(u<.5?1:1-(u-.5)*.6);L.push(x-dy/d*ww,y+dx/d*ww);R.push(x+dy/d*ww,y-dx/d*ww);}
    g.beginPath();g.moveTo(L[0],L[1]);for(i=2;i<L.length;i+=2)g.lineTo(L[i],L[i+1]);for(i=R.length-2;i>=0;i-=2)g.lineTo(R[i],R[i+1]);g.closePath();g.fill();
  }
  function drawWarps(g,t){
    for(var i=warps.length-1;i>=0;i--){var w=warps[i],age=t-w.t0;if(age>WARP_LIFE||age<0){warps.splice(i,1);continue;}
      var u=age/WARP_LIFE,a=age<.15?1:Math.max(0,1-(age-.15)/(WARP_LIFE-.15)),ink=inkOn(),side=w.side,k,pass;
      raw(1);g.save();g.globalCompositeOperation='source-over';
      if(isSeoha(w.hero)){for(k=0;k<4;k++)timeNeedle(g,w.x+side*(16+k*8+u*20),w.y-25+k*15,-side*.4,14-k, a*.45,3);clockwork(g,w.x-side*18,w.y-8,8+u*4,-side*u*2,a*.45,7);g.restore();raw(-1);continue;}
      var strokes=[[side,0],[side,1],[side,2],[-side,0]]; // 탄이 온 쪽 세 획, 반대쪽 한 획(어긋나게)
      for(pass=0;pass<2;pass++)for(k=0;k<strokes.length;k++){var sd=strokes[k][0],j=strokes[k][1],far=sd!==side,wid=(far?2.6:4.6-j*.7)*(1-u*.35);
        var x0=w.x+sd*(5+j*5)+(far?sd*3:0),y0=w.y-36-j*7+(far?12:0),cx=w.x+sd*(26+j*6+u*6),cy=w.y-2+j*3,x1=w.x+sd*(34+j*7+u*28),y1=w.y+20+j*6+u*10;
        if(pass===0){g.globalAlpha=a*.5;g.fillStyle=ink?'rgba(255,253,246,1)':'rgba(0,10,20,1)';taper(g,x0,y0,cx,cy,x1,y1,wid+1.6);} // 한지색 밑칠로 얼룩 배경에서 떼어 낸다
        else{g.globalAlpha=a*(far?.7:1-j*.15);g.fillStyle=ink?'rgba(30,26,24,1)':'rgba(170,240,255,1)';taper(g,x0,y0,cx,cy,x1,y1,wid);}}
      g.globalAlpha=a*.6;g.fillStyle=ink?'rgba(30,26,24,1)':'rgba(170,240,255,1)';
      for(k=0;k<3;k++){var gx=w.x-side*(7+k*7)*(.6+u),gy=w.y-2-k*3;g.beginPath();g.ellipse(gx,gy,4.6-k*.9,8-k*1.4,0,0,TAU);g.fill();} // 반대쪽으로 밀린 잔상 세 점(영웅이 비켜 선 자리)
      g.restore();raw(-1);}
  }
  /* ── 필살기 7연타: 컷씬 뒤 일곱 번, 과녁(없으면 화면 위쪽을 훑으며) 먹 폭발이 터진다 ── */
  var pulseBursts=[];
  function pulseFx(pi,lv,t,hero){
    var tg=pi.targets,i=pi.index-1,x,y,vary=.85+((i*37)%7)/7*.3;
    if(tg.length>=2){var k=(i*2)%(tg.length-(tg.length%2||0)||2);x=tg[k];y=tg[k+1];}else{x=60+((i*127)%240);y=120+((i*71)%240);}
    y=Math.min(y,450); // 영웅·탄 구역(아래쪽)에는 터지지 않게(심사 1차)
    if(pulseBursts.length<14)pulseBursts.push({x:x,y:y,t0:t,size:(84+lv*12+(i===6?30:0))*vary,rot:i*1.3+vary,hero:hero});
    if(pops.length<30)pops.push({x:x,y:y,t0:t,size:60+lv*6,rot:i,hero:hero});
    quake=Math.max(quake,i===6?2.6:1.2+i*.12);
  }
  function drawPulses(g,t){
    if(!pulseBursts.length)return;raw(1);g.save();blend(g);
    for(var i=pulseBursts.length-1;i>=0;i--){var b=pulseBursts[i],f=(t-b.t0)*SHEETS.burst.fps;if(f>=10){pulseBursts.splice(i,1);continue;}if(f<0)continue;if(isSeoha(b.hero)){clockwork(g,b.x,b.y,b.size*.28,b.rot+f*.18,(1-f/10)*.62,10);timeNeedle(g,b.x,b.y,b.rot,b.size*.5,(1-f/10)*.55,7);}else cell(g,'burst',f,b.x,b.y,b.rot,b.size,(f<3?.8:f<8?.62:.62*(1-(f-8)/2)));}
    g.restore();raw(-1);
  }
  function drawTexts(g,t){
    drawCutin(g,t,360,640);
    for(var i=texts.length-1;i>=0;i--){var o=texts[i],age=t-o.t0,life=o.big?1.6:1.1;if(age>life){texts.splice(i,1);continue;}
      var a=age<.12?age/.12:1-Math.max(0,age-life*.6)/(life*.4),y=o.y-age*16,x=Math.max(70,Math.min(290,o.x));
      raw(1);g.save();g.globalAlpha=a;g.textAlign='center';g.font=(o.big?'700 20px ':'700 13px ')+SERIF;g.lineWidth=3;g.strokeStyle='rgba(255,253,246,.9)';g.fillStyle=o.down?'rgba(90,84,80,1)':'rgba(30,26,24,1)';
      if(!inkOn()){g.strokeStyle='rgba(0,0,0,.7)';g.fillStyle=o.down?'#9aa':'#bff6ff';}g.strokeText(o.text,x,y);g.fillText(o.text,x,y);
      if(o.sub){g.font='600 11px '+SERIF;g.strokeText(o.sub,x,y+15);g.fillText(o.sub,x,y+15);}g.restore();raw(-1);}
  }

  /* ── 구름 위 시계: 바늘은 보통 6초에 한 바퀴, 가속 4배, 둔화(저속) 4분의 1. 테두리 눈금 7개가 공격 단계만큼 짙어진다 ── */
  var hand=0,lastT=0;
  var RATE={normal:TAU/6,haste:TAU/1.5,slow:TAU/24};
  function clock(g,s,t,opacity){
    opacity=typeof opacity==='number'?Math.max(0,Math.min(1,opacity)):1;
    var dt=Math.max(0,Math.min(.1,t-lastT));lastT=t;var st=global.HapilArcade&&global.HapilArcade.clockState?global.HapilArcade.clockState(s):'normal';hand+=RATE[st]*dt;
    var p=s.player,x=p.x,y=p.y+23,r=11,lv=s.power||1,i,ink=inkOn();
    raw(1);g.save();g.globalCompositeOperation='source-over';g.globalAlpha=(s.tick<p.invulnerableUntil&&Math.floor(s.tick/4)%2?.45:1)*opacity;
    if(isSeoha(heroId(s))){clockwork(g,x,y,r+3,hand*.2,.75*g.globalAlpha,12);g.strokeStyle=timeColor(false);g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(hand-Math.PI/2)*r*.75,y+Math.sin(hand-Math.PI/2)*r*.75);g.stroke();g.restore();raw(-1);return;}
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
  function field(g,s,t,opacity){
    opacity=typeof opacity==='number'?Math.max(0,Math.min(1,opacity)):1;
    var A=global.HapilArcade;if(!A||!A.slowField)return;var f=A.slowField(s),R=f[0],k=f[1],p=s.player,n=2+(s.power||1),i,ink=inkOn();
    raw(1);g.save();g.globalCompositeOperation='source-over';g.lineCap='round';
    for(i=0;i<n*2;i++){var u=((t*(.18+k*.1)+i*.381966)%1),ph=i*2.39996+hand*.35+Math.sin(i*1.7)*.5,rr=R*(.25+.75*((i*.618034+u*.5)%1)),x=p.x+Math.cos(ph)*rr,y=p.y+Math.sin(ph)*rr*.9;
      if(isSeoha(heroId(s))){g.globalAlpha=Math.sin(Math.PI*u)*(.18+k*.4)*opacity;g.strokeStyle=timeColor(i%3===0);g.lineWidth=1.1;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(ph)*4,y+Math.sin(ph)*4);g.stroke();continue;}
      // 튄 먹물 방울: 영웅 곁에서 생겨 마르며 사라진다(선을 긋지 않아 둘레 고리로 읽히지 않는다, 심사 1차). 크기·자리를 들쭉날쭉하게
      g.globalAlpha=Math.min(1,Math.sin(Math.PI*u)*(.3+k*1.1))*opacity;g.fillStyle=ink?'rgba(30,26,24,1)':'rgba(170,240,255,1)';var dr=(.7+k*2.6)*(.5+((i*.4142)%1));
      g.beginPath();g.ellipse(x,y,dr,dr*(.7+.3*((i*.31)%1)),ph,0,TAU);g.fill();if(i%3===0){g.beginPath();g.arc(x+Math.cos(ph)*dr*2.2,y+Math.sin(ph)*dr*2.2,dr*.45,0,TAU);g.fill();}}
    g.restore();raw(-1);
  }
  function draw(g,s,t){takeZaps(s,t);raw(1);g.save();blend(g);drawZaps(g,t);drawPops(g,t);g.restore();raw(-1);drawSkill(g,s,t);drawBombs(g,t,360,640);drawPulses(g,t);drawWarps(g,t);}
  function shake(){var q=quake;quake=0;return q;}
  function reset(){skillBolts.length=0;lastSkillLabel=-9;zaps.length=0;pops.length=0;texts.length=0;bombs.length=0;quake=0;cut=null;warps.length=0;pulseBursts.length=0;}
  function hudLine(s){var lv=s.power||1,bl=s.bombLevel||1;return {attack:lv,bomb:bl};}
  load();
  global.HapilHeroFx={shots:shots,draw:draw,drawTexts:drawTexts,clock:clock,field:field,onEvent:onEvent,shake:shake,reset:reset,hudLine:hudLine,SHEETS:SHEETS,
    debug:function(){return {cut:!!cut,cutHero:cut?cut.hero||'memory':null,cutName:cut?cut.name:null,warps:warps.length,zaps:zaps.length,pops:pops.length,bombs:bombs.length,texts:texts.length,ready:Object.keys(SHEETS).filter(ready)};}};
})(window);
