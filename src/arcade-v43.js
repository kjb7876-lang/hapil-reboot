/* 합일 v43 · 원큐 여정(ARCADE 탄막) — 전투 시뮬레이션.
 * 60Hz 고정 틱·시드 난수로 결정적으로 돈다. DOM을 쓰지 않는다. 화면·소리·저장은 arcade-app-v43.js가 맡는다.
 * 스테이지는 원작(StoryWorld) 56장면(쉼터 제외)을 순서대로 하나씩 맡는다. 스테이지 내용(테마·잡몹·인물·패턴·보상)은
 * 부별 파일 src/arcade-parts-v43/p1.js … p8.js 에 있고, 이 파일은 그것을 읽어 구간(SEGMENTS)으로 잇는다.
 *   길 스테이지(road): 잡몹 구간 여럿 → 길목지기(일반 공격 + 이름 붙은 패턴)
 *   보스 스테이지(boss): 잡몹 → 중간 보스 → 잡몹 → 보스(일반 공격과 이름 붙은 패턴이 번갈아)
 * 글 대신 스테이지 이름 한 줄, 패턴 이름 한 줄과 탄막 무늬로만 사연을 전한다. */
(function(root){
  'use strict';
  /* 부별 파일. 노드에서는 require로, 브라우저에서는 먼저 읽힌 스크립트가 HapilArcadeParts에 쌓아 둔 것을 쓴다. */
  var PARTS=typeof module==='object'&&module.exports&&typeof require==='function'
    ?[1,2,3,4,5,6,7,8].map(function(n){return require('./arcade-parts-v43/p'+n+'.js');})
    :(root.HapilArcadeParts||[]).slice().sort(function(a,b){return a.part-b.part;});
  function gather(field,into,isList){PARTS.forEach(function(p){var v=p[field];if(!v)return;if(isList)v.forEach(function(x){into.push(x);});else Object.keys(v).forEach(function(k){if(into[k])throw new Error('duplicate '+field+' '+k);into[k]=v[k];});});}
  /* 원작 장면 표: [장면 번호, 부, 제목]. 쉼터 6곳은 뺐다(62장면 가운데 56장면). 스테이지 이름은 여기서만 나온다. */
  var SCENES=[
    ['01',1,'악마화 나무의 정원'],
    ['02',1,'거미동굴'],
    ['03',1,'늪지대의 뿔악마'],
    ['04',1,'무너진성'],
    ['05',1,'시체들이 되살아난 밤'],
    ['06',1,'일곱 기둥'],
    ['07',1,'추락'],
    ['08',1,'피로 물든 병원'],
    ['09-1',1,'주사실'],
    ['09-2',1,'결전의 날'],
    ['10',1,'환자와 중독의 도시'],
    ['11',1,'천사의 가면과 의목사 후보생'],
    ['13',2,'솔로몬의 봉인식'],
    ['14',2,'나태의 집'],
    ['15',2,'금이 간 안경'],
    ['16',2,'탐식의 주방'],
    ['17',2,'붉은 하이힐'],
    ['18',2,'맘몬의 금고'],
    ['19',2,'눈보라 속의 소년'],
    ['20',2,'불을 지른 남자'],
    ['21',2,'하늘에 서려는 자'],
    ['22',2,'생체 부트로더'],
    ['24',3,'방어의 군단'],
    ['25',3,'잔인한 구원'],
    ['26',3,'시스템의 거부권'],
    ['27',3,'관리자 권한'],
    ['28',3,'중앙 코어 이주실'],
    ['29',3,'기억의 문'],
    ['31',4,'중립 지역의 재각성'],
    ['32',4,'고블린 두목과 장미 인장'],
    ['33',4,'타락천사 기사'],
    ['34',4,'잠들지 못하는 마을'],
    ['35',4,'한약과 불면귀'],
    ['37',5,'최초명령의 세계'],
    ['38',5,'예순여섯 수문장'],
    ['39',5,'빼앗긴 시간'],
    ['40',5,'닫힌 층의 명령'],
    ['41',5,'검은 공방'],
    ['42',5,'뉴런 게이트 · 노이론 게이트'],
    ['43',5,'망각의 묘지'],
    ['44',5,'붕괴 의식장'],
    ['45',5,'아르벨리아, 유예의 수문장'],
    ['46',5,'세이렌 모르'],
    ['48',6,'성 안에 소환된 의목사'],
    ['49',6,'두 주인의 각성'],
    ['50',6,'함께 되찾은 코어'],
    ['52',7,'윤하람'],
    ['53',7,'장민재와 새빛호텔'],
    ['54',7,'고서진과 청록빌라'],
    ['55',7,'옥상의 순환'],
    ['56',8,'하나로 묶인 악몽'],
    ['57',8,'교주가 기다리는 전쟁'],
    ['58',8,'돌아오는 현실의 기억'],
    ['59',8,'처음 세웠던 목표'],
    ['60',8,'사몽의 문턱'],
    ['61',8,'교주의 사몽']];
  var FIGURE_CAP=10,W=360,H=640,CAP=1400,COMPACT_CAP=820,LASER_CAP=24,MOB_CAP=28,ITEM_CAP=160,TICK=1/60,TAU=Math.PI*2;
  var GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5)); // 137.5°. 해바라기 씨앗이 겹치지 않고 차오르는 각도
  /* 난이도. density 탄 수 배율 · speed 탄 속도 배율 · hp 목숨 · mapHeal 다음 맵에서 회복(-1은 전부) · bombs 폭탄 ·
   * radius 영웅 피격점 반지름 · hitScale 탄의 보이는 반지름 중 실제로 닿는 비율 · warn 광선 예고 시간 배율 · beam 광선 굵기 배율 */
  var DIFFICULTY={
    // 11-14 사용자 기준: 이지(여유)는 탄 수가 노멀의 약 2/3인 쉬운 패턴(지시서의 44% 대 66%). 노멀·헬은 같은 밀도에 헬이 더 빠르고 피격점이 크고 목숨이 적다.
    gentle:{density:1.65,speed:.56,hp:7,mapHeal:-1,bombs:3,radius:1,hitScale:.3,warn:1.6,beam:.72,label:'여유'},
    normal:{density:2.45,speed:.64,hp:3,mapHeal:1,bombs:2,radius:1.4,hitScale:.38,warn:1.2,beam:.88,label:'기본'},
    hell:{density:2.6,speed:.9,hp:1,mapHeal:0,bombs:1,radius:2.4,hitScale:.5,warn:1,beam:1,label:'지옥'}
  };
  // 휴대폰 모드: 탄 수를 줄이고 그만큼 탄을 크게 그린다(판정도 같이 커진다).
  var COMPACT_DENSITY=.72,COMPACT_SIZE=1.25;
  var HAND_WARN=50,HAND_AWAY=64,EXPIRE_SPEED=60,GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,BOMB_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=80,FIRE_DELAY=40,WAVE_GRACE=360;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=96,MAX_MOVE=12,FOCUS_MOVE=2;
  var BEAM_HIT=.62,BEAM_FADE=14,BEAM_LENGTH=1000;
  var GAUGE_FULL=100,MAX_BOMBS=4,AUTO_COLLECT_Y=190,ITEM_REACH=24,ITEM_PULL=11,BOMB_BOSS_DAMAGE=40,BOMB_MOB_DAMAGE=25;
  // 탄 색은 여섯 가지만 쓴다: 0 빨강 2 보라 4 청록 5 초록 6 노랑 8 흰색
  var PALETTE=[0,2,4,5,6,8],RED=0,PURPLE=2,CYAN=4,GREEN=5,YELLOW=6,WHITE=8;
  // 모양도 여섯 가지: 0 작은 구슬 1 중간 2 큰 구슬 3 쌀알탄 4 거품 5 큰 기물(색 번호 자리에 기물 번호)
  var SIZE_RADIUS=[4,6,10,3.2,15,14],RICE=3,SHAPE_PROP=5,MUZZLE=22;
  // 큰 기물. upright는 절대 돌리지 않는 것(십자가는 똑바로 선 채 아래로만 내려온다).
  var PROPS=[{key:'sword-violet',radius:12},{key:'cleaver',radius:14},{key:'sword-balrog',radius:14},{key:'obelisk',radius:17},{key:'spire',radius:18},
    {key:'twin-blade',radius:13},{key:'crescent',radius:14},{key:'tissue',radius:10},{key:'money',radius:10},{key:'heel',radius:11},{key:'feather',radius:9},
    {key:'cross',radius:14,upright:true},{key:'gear',radius:16},
    // 코드로 그린 기물(drawn, 그림 파일은 tools/build-drawn-props-v43.cjs가 같은 코드로 구워 둔다): 해골(묘지), 늪에서 올라오는 초록 악마 손.
    // glow는 빛무리 색 번호. 둘 다 진행 방향을 본다(손끝은 위로 솟고, 해골은 날아가는 쪽으로 얼굴 아래턱을 둔다).
    {key:'skull',radius:11,drawn:true,glow:2},{key:'demon-hand',radius:12,drawn:true,glow:5}];
  gather('props',PROPS,true);
  var P={};PROPS.forEach(function(p,i){P[p.key]=i;});
  // 탄 변화 방식: 1 영웅을 다시 조준 2 각도 꺾기 3 터져서 고리로 4 가지치기(프랙탈)
  var MODE_REAIM=1,MODE_TURN=2,MODE_SPLIT=3,MODE_BRANCH=4;

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*s.density));}
  function pick(s,gentle,normal,hell){return s.difficulty==='gentle'?gentle:s.difficulty==='hell'?hell:normal;}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  function note(s,name){if(s.events.length<48)s.events.push(name);}
  function bulletRadius(s,i){return (s.bsize[i]===SHAPE_PROP?PROPS[s.bcolor[i]].radius:SIZE_RADIUS[s.bsize[i]])*s.sizeScale;}
  /* 탄 하나. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode,arg,speed2,life,gen(가지치기 남은 횟수),spin(기물이 도는 속도, 틱당 라디안)} */
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=s.cap){s.dropped++;return;}
    o=o||{};var size=o.size||0;
    // 화면이 붐비면(상한의 72% 이상) 새 탄을 하나 걸러 하나만, 82% 이상이면 쉬게 한다(조형물은 예외). 느린 탄이 쌓여도 상한에 닿지 않는다.
    if(s.n>=s.cap*.72&&size!==SHAPE_PROP){s.thin=(s.thin+1)|0;if(s.n>=s.cap*.82||s.thin%2)return;}
    // 보스 한가운데서 쏘는 탄은 보스 몸 가장자리(MUZZLE)에서 나오게 옮긴다. 탄이 몸을 덮어 보스가 가려지지 않는다(7분야 심사 3차 지적).
    var b=s.boss;if(b&&s.stage==='card'&&Math.abs(x-b.x)<2&&Math.abs(y-b.y)<2){x+=Math.cos(angle)*MUZZLE;y+=Math.sin(angle)*MUZZLE;}
    var i=s.n++;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*s.rules.speed;
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*s.rules.speed;s.bgen[i]=o.gen||0;
    s.bage[i]=0;s.blife[i]=o.life||780;s.bsize[i]=size;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;s.bbounce[i]=size===SHAPE_PROP?0:o.bounce||0;
    s.bspin[i]=size===SHAPE_PROP&&PROPS[o.color||0].upright?0:o.spin||0;
  }
  function ring(s,x,y,n,speed,offset,o){for(var i=0;i<n;i++)spawn(s,x,y,offset+TAU*i/n,speed,o);}
  function fan(s,x,y,n,center,spread,speed,o){for(var i=0;i<n;i++)spawn(s,x,y,center+(n>1?(i/(n-1)-.5)*spread:0),speed,o);}
  // 가우스 종곡선: 부채꼴 가운데가 가장 빠르고 가장자리로 갈수록 정규분포 곡선을 따라 느려져, 탄막 앞줄이 종 모양이 된다.
  function bell(s,x,y,n,center,spread,speed,sigma,o){
    for(var i=0;i<n;i++){var u=n>1?i/(n-1)*2-1:0;spawn(s,x,y,center+u*spread/2,speed*(.5+.8*Math.exp(-u*u/(2*sigma*sigma))),o);}
  }
  // 위에서 내려오는 한 줄. 화면 밖(위)에서 들어오므로 갑자기 나타나지 않는다. gapAt부터 gapWidth칸은 비운다.
  function curtain(s,cells,gapAt,gapWidth,speed,o){var step=W/cells;for(var i=0;i<cells;i++){if(i>=gapAt&&i<gapAt+gapWidth)continue;spawn(s,step*(i+.5),-10,Math.PI/2,speed,o);}}

  /* ── 공통 발사기(11-14 지시서 STEP 3). 패턴을 데이터로 적는다:
   *   {kind, patternId, emitterCount, bulletsPerWave, fireInterval(초), baseSpeed(px/초), speedVariance, spreadAngle(라디안), rotationSpeed(라디안/초),
   *    phaseOffset, bulletType:{size,color}, difficultyMultiplier:{gentle,normal,hell}, duration(초), delay(초), children}
   *   emit(s,spec,t,origin)을 패턴의 매 틱 t마다 부르면 그 발사기가 제 박자에 쏜다. 시간은 틱이 아니라 시뮬레이션 초(t·TICK)로 센다.
   *   좌표계는 y가 아래로 +, 각도 π/2가 화면 아래(적 탄의 기본 방향).
   *   01 radial 방사형 θi = θ0 + 2πi/N · 02 fan 부채꼴 · 03 rotating 발사원이 도는 직진탄 · 04 curved 탄 자신이 휘는 곡선탄 v ← Rotate(v, ω·dt)
   *   05 spiral 다중 나선 θi(t) = ωt + 2πi/N + θ0 · 06 delayedRing 시간차로 속도·위상이 다른 고리 · 07 aimed 쏘는 순간만 조준(추적 없음)
   *   08 layered 독립 갱신되는 여러 겹 · 09 orbCorridor 큰 구슬 줄 사이로 움직이는 통로 · 10 composite 2~4종을 저마다의 지연·박자로 합성 */
  var EMITTER_KINDS=['radial','fan','rotating','curved','spiral','delayedRing','aimed','layered','orbCorridor','composite'];
  function waveCount(s,spec,n){var m=spec.difficultyMultiplier,k=m&&typeof m==='object'?(m[s.difficulty]||1):(m||1);return Math.max(1,Math.round(n*k*s.density));}
  function emitSpeed(s,spec){var v=spec.baseSpeed||80,d=spec.speedVariance||0;return d?v+(rand(s)*2-1)*d:v;}
  // bulletType에 at·mode·arg·speed2·accel·min·max·spin을 함께 적으면 그대로 탄에 실린다(시간차 꺾기·분열 등).
  function emitOpts(spec,size,color){var b=spec.bulletType||{},o={};for(var k in b)o[k]=b[k];if(o.size===undefined)o.size=size;if(o.color===undefined)o.color=color;o.turn=spec.kind==='curved'?spec.turnRate||0:0;return o;}
  function emit(s,spec,t,origin){
    var k,n,kind=spec.kind,x=origin.x,y=origin.y;
    if(kind==='layered'||kind==='composite'){for(k=0;k<(spec.children||[]).length;k++)emit(s,spec.children[k],t,origin);return;}
    var local=t-Math.round((spec.delay||0)*60),beat=Math.max(1,Math.round((spec.fireInterval||.5)*60));
    if(local<0||local%beat||(spec.duration&&local*TICK>=spec.duration))return;
    var time=local*TICK,phase=spec.phaseOffset||0,omega=spec.rotationSpeed||0,o;
    if(kind==='radial'){o=emitOpts(spec,0,RED);n=waveCount(s,spec,spec.bulletsPerWave||12);for(k=0;k<n;k++)spawn(s,x,y,phase+omega*time+TAU*k/n,emitSpeed(s,spec),o);}
    else if(kind==='fan'||kind==='curved'||kind==='aimed'){
      o=emitOpts(spec,0,kind==='aimed'?WHITE:PURPLE);n=waveCount(s,spec,spec.bulletsPerWave||5);
      var center=kind==='aimed'?aim(s,x,y)+(spec.aimOffset||0):spec.center===undefined?Math.PI/2:spec.center,spread=spec.spreadAngle||(kind==='aimed'?0:1);
      if(kind==='curved'&&spec.center===undefined&&!spec.spreadAngle){for(k=0;k<n;k++)spawn(s,x,y,phase+omega*time+TAU*k/n,emitSpeed(s,spec),o);}
      else for(k=0;k<n;k++){var one={},q;for(q in o)one[q]=o[q];if(kind==='curved'&&spec.mirror&&k%2)one.turn=-o.turn;spawn(s,x,y,center+omega*time+(n>1?(k/(n-1)-.5)*spread:0),emitSpeed(s,spec),one);}
    }
    else if(kind==='rotating'){o=emitOpts(spec,0,CYAN);spawn(s,x,y,phase+omega*time,emitSpeed(s,spec),o);}
    else if(kind==='spiral'){o=emitOpts(spec,RICE,WHITE);n=spec.emitterCount||3;for(k=0;k<n;k++)spawn(s,x,y,omega*time+TAU*k/n+phase,emitSpeed(s,spec),o);}
    else if(kind==='delayedRing'){o=emitOpts(spec,1,YELLOW);var layer=(local/beat)%(spec.emitterCount||3);n=waveCount(s,spec,spec.bulletsPerWave||16);
      for(k=0;k<n;k++)spawn(s,x,y,phase+layer*(spec.phaseStep||0)+TAU*k/n,(spec.baseSpeed||60)+layer*(spec.speedStep||15),o);}
    else if(kind==='orbCorridor'){
      // 큰 구슬을 화면 폭에 고르게 늘어놓되, 통로 자리는 비운다. 통로 가운데는 사인파로 좌우를 오가므로 영웅은 통로를 따라 움직여야 한다.
      o=emitOpts(spec,2,CYAN);n=waveCount(s,spec,spec.bulletsPerWave||9);var gap=spec.gapWidth||80,half=gap/2+SIZE_RADIUS[o.size]*s.sizeScale,
        mid=W/2+(W/2-gap/2-10)*Math.sin((spec.drift||1)*time+phase);
      for(k=0;k<n;k++){var gx=(k+.5)*W/n;if(Math.abs(gx-mid)<half)continue;spawn(s,gx,y,Math.PI/2,emitSpeed(s,spec),o);}
    }
  }

  /* ── 기하 도형. 원점 기준 단위 좌표의 점 묶음. 각 탄을 "원점에서 그 점 방향으로, 거리에 비례한 속도"로 쏘면
   *    도형이 모양을 유지한 채 커진다. ── */
  var shapeCache={};
  function cached(key,build){if(!shapeCache[key]){var pts=build(),max=0,out=[],i;for(i=0;i<pts.length;i+=2)max=Math.max(max,Math.sqrt(pts[i]*pts[i]+pts[i+1]*pts[i+1]));for(i=0;i<pts.length;i+=2){var x=pts[i]/max,y=pts[i+1]/max;if(x*x+y*y>=.0144)out.push(x,y);}shapeCache[key]=out;}return shapeCache[key];}
  function outline(vertices,perSide){var out=[],n=vertices.length/2;for(var k=0;k<n;k++){var x1=vertices[k*2],y1=vertices[k*2+1],x2=vertices[(k+1)%n*2],y2=vertices[(k+1)%n*2+1];for(var j=0;j<perSide;j++)out.push(x1+(x2-x1)*j/perSide,y1+(y2-y1)*j/perSide);}return out;}
  function corners(n,radius,turn){var v=[];for(var k=0;k<n;k++){var a=TAU*k/n-Math.PI/2+(turn||0);v.push(Math.cos(a)*radius,Math.sin(a)*radius);}return v;}
  var Shapes={
    polygon:function(n,perSide){return cached('p'+n+'/'+perSide,function(){return outline(corners(n,1),perSide);});},
    // 별(톱니): 바깥 꼭짓점과 안쪽 꼭짓점을 번갈아 이은 2n각형
    star:function(n,inner,perSide){return cached('s'+n+'/'+inner+'/'+perSide,function(){var v=[],o=corners(n,1),i=corners(n,inner,Math.PI/n);for(var k=0;k<n;k++)v.push(o[k*2],o[k*2+1],i[k*2],i[k*2+1]);return outline(v,perSide);});},
    // 장미 곡선 r = 0.3 + 0.7·cos²(kθ/2): 꽃잎 k장
    rose:function(k,points){return cached('r'+k+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var a=TAU*i/points,c=Math.cos(k*a/2),r=.3+.7*c*c;out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});},
    // 눈: 납작한 타원 테두리 안에 작은 눈동자 고리
    eye:function(points){return cached('e'+points,function(){var out=[],i,a,pupil=Math.max(6,points>>2);for(i=0;i<points;i++){a=TAU*i/points;out.push(Math.cos(a),Math.sin(a)*.42);}for(i=0;i<pupil;i++){a=TAU*i/pupil;out.push(Math.cos(a)*.24,Math.sin(a)*.24);}return out;});},
    // 리사주 곡선 x = sin(a·t + π/2), y = sin(b·t): 두 진동의 겹침
    lissajous:function(a,b,points){return cached('l'+a+'/'+b+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points;out.push(Math.sin(a*t+Math.PI/2),Math.sin(b*t));}return out;});},
    // 하이포사이클로이드: 큰 원 안을 구르는 작은 원 위 한 점의 자취. k=3 델토이드, k=4 아스트로이드
    hypocycloid:function(k,points){return cached('h'+k+'/'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points;out.push((k-1)*Math.cos(t)+Math.cos((k-1)*t),(k-1)*Math.sin(t)-Math.sin((k-1)*t));}return out;});},
    // 심장형 곡선 r = 1 − sin θ. 부푼 쪽이 위(−y)를 본다.
    cardioid:function(points){return cached('c'+points,function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points,r=1-Math.sin(t);out.push(Math.cos(t)*r,Math.sin(t)*r);}return out;});},
    // 초공식(Gielis): r = (|cos(mθ/4)|^n2 + |sin(mθ/4)|^n3)^(−1/n1). 꽃·불가사리·조개 같은 자연의 윤곽
    superformula:function(m,n1,n2,n3,points){return cached('f'+[m,n1,n2,n3,points].join('/'),function(){var out=[];for(var i=0;i<points;i++){var t=TAU*i/points,r=Math.pow(Math.pow(Math.abs(Math.cos(m*t/4)),n2)+Math.pow(Math.abs(Math.sin(m*t/4)),n3),-1/n1);out.push(Math.cos(t)*r,Math.sin(t)*r);}return out;});},
    // 해바라기: i번째 씨앗을 황금각 i배 방향, √i 거리에 놓는다(피보나치 나선이 보인다).
    sunflower:function(points){return cached('u'+points,function(){var out=[];for(var i=0;i<points;i++){var r=Math.sqrt((i+1)/points),a=i*GOLDEN_ANGLE;out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});},
    // 코흐 눈송이: 정삼각형의 각 변 가운데 1/3을 바깥 삼각형으로 바꾸기를 depth번 반복
    koch:function(depth){return cached('k'+depth,function(){var v=corners(3,1);for(var d=0;d<depth;d++){var next=[],n=v.length/2;for(var k=0;k<n;k++){var x1=v[k*2],y1=v[k*2+1],x2=v[(k+1)%n*2],y2=v[(k+1)%n*2+1],dx=(x2-x1)/3,dy=(y2-y1)/3;next.push(x1,y1,x1+dx,y1+dy,x1+dx*1.5+dy*.8660254,y1+dy*1.5-dx*.8660254,x1+dx*2,y1+dy*2);}v=next;}return v;});},
    // 시에르핀스키 삼각형: 가운데 삼각형을 비우기를 depth번 반복한 뒤 남은 작은 삼각형들의 꼭짓점
    sierpinski:function(depth){return cached('t'+depth,function(){var seen={},out=[];(function cut(ax,ay,bx,by,cx,cy,d){if(!d){[[ax,ay],[bx,by],[cx,cy]].forEach(function(p){var key=Math.round(p[0]*1000)+','+Math.round(p[1]*1000);if(!seen[key]){seen[key]=1;out.push(p[0],p[1]);}});return;}var abx=(ax+bx)/2,aby=(ay+by)/2,bcx=(bx+cx)/2,bcy=(by+cy)/2,cax=(cx+ax)/2,cay=(cy+ay)/2;cut(ax,ay,abx,aby,cax,cay,d-1);cut(abx,aby,bx,by,bcx,bcy,d-1);cut(cax,cay,bcx,bcy,cx,cy,d-1);})(0,-1,.8660254,.5,-.8660254,.5,depth);return out;});},
    // 비트루비우스: 원과 그 안의 정사각형
    vitruvian:function(points){return cached('v'+points,function(){return outline(corners(points,1),1).concat(outline(corners(4,.9,Math.PI/4),Math.max(2,Math.round(points/5))));});},
    // 황금 나선: 90°마다 반지름이 황금비만큼 커지는 로그 나선(6.9라디안, 약 1.1바퀴 동안 약 8배)
    goldenSpiral:function(points){return cached('g'+points,function(){var out=[],phi=(1+Math.sqrt(5))/2;for(var i=0;i<points;i++){var a=i*6.9/Math.max(1,points-1),r=Math.pow(phi,a/(Math.PI/2));out.push(Math.cos(a)*r,Math.sin(a)*r);}return out;});}
  };
  function shape(s,x,y,points,speed,turn,o){
    var cos=Math.cos(turn),sin=Math.sin(turn);
    for(var i=0;i<points.length;i+=2){var px=points[i]*cos-points[i+1]*sin,py=points[i]*sin+points[i+1]*cos;spawn(s,x,y,Math.atan2(py,px),speed*Math.sqrt(px*px+py*py),o);}
  }

  /* 광선 하나. (x,y)에서 angle 방향으로 뻗는다. o: {width,warn,active,color,spin(초당 회전),follow(보스에 붙음),burst(켜질 때 선을 따라 쌀알탄)} */
  function beam(s,x,y,angle,o){
    if(s.lasers.length>=LASER_CAP)return;
    s.lasers.push({x:x,y:y,angle:angle,width:(o.width||18)*s.rules.beam,warn:Math.round((o.warn||60)*s.rules.warn),active:o.active||60,
      color:o.color||0,spin:o.spin||0,follow:!!o.follow,burst:!!o.burst,age:0,grazed:false});
    if(!s.warned){s.warned=true;note(s,'laserWarn');}
  }
  function row(s,y,o){beam(s,-12,y,0,o);}
  function column(s,x,o){beam(s,x,-12,Math.PI/2,o);}
  // 가로폭을 n칸으로 나눠 칸마다 한 줄씩 세운다. 칸 사이에는 늘 지나갈 틈이 남는다.
  function slots(s,n,span,margin){var out=[],cell=(span-margin*2)/n;for(var i=0;i<n;i++)out.push(margin+cell*(i+.2+rand(s)*.6));return out;}

  /* ── 몹. elite는 내려와 자리를 잡고 무늬를 쏘는 중간 몹. ── */
  var MOBS={
    spider:{hp:5,r:14,score:300},slime:{hp:6,r:14,score:300},ember:{hp:6,r:14,score:300},drone:{hp:6,r:13,score:300},mobgoblin:{hp:7,r:14,score:300},
    wolf:{hp:6,r:14,score:300},nightmare:{hp:8,r:15,score:300},collector:{hp:8,r:15,score:300},leech:{hp:7,r:14,score:300},
    guardian:{hp:70,r:20,score:3000,elite:true},warden:{hp:90,r:22,score:4000,elite:true},horn:{hp:120,r:24,score:6000,elite:true},
    belphegor:{hp:100,r:22,score:5000,elite:true},mammon:{hp:100,r:20,score:5000,elite:true},knight:{hp:120,r:22,score:6000,elite:true}
  };
  gather('mobs',MOBS);
  var MOB_FIRE={
    aim:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.3,96,{color:m.color,size:RICE});},
    drop:function(s,m){spawn(s,m.x,m.y,Math.PI/2,78,{color:m.color,size:0});},
    ring:function(s,m){ring(s,m.x,m.y,count(s,8),64,aim(s,m.x,m.y),{color:m.color,size:0});},
    hexagon:function(s,m){shape(s,m.x,m.y,Shapes.polygon(6,Math.max(2,count(s,3))),78,m.shots*.26,{color:m.color,size:0});},
    bell:function(s,m){bell(s,m.x,m.y,count(s,11),aim(s,m.x,m.y),1.5,100,.42,{color:m.color,size:1});},
    gearRing:function(s,m){shape(s,m.x,m.y,Shapes.star(8,.72,Math.max(1,count(s,2))),76,m.shots*.2,{color:m.color,size:0});},
    tissue:function(s,m){fan(s,m.x,m.y,pick(s,2,3,5),aim(s,m.x,m.y),1.1,52,{size:SHAPE_PROP,color:P.tissue,spin:.03});},
    money:function(s,m){ring(s,m.x,m.y,pick(s,4,6,9),70,m.shots*.5,{size:SHAPE_PROP,color:P.money,spin:.12});},
    cleaver:function(s,m){fan(s,m.x,m.y,pick(s,1,2,3),aim(s,m.x,m.y),.7,104,{size:SHAPE_PROP,color:P.cleaver,spin:.2});bell(s,m.x,m.y,count(s,9),aim(s,m.x,m.y),1.6,92,.45,{color:m.color,size:1});},
    sixcuts:function(s,m){fan(s,m.x,m.y,6,aim(s,m.x,m.y),pick(s,2.2,1.9,1.6),118,{size:SHAPE_PROP,color:P['sword-violet']});}
  };
  /* 몹 하나. o: {vx,vy,sway,swayRate,fire,first,every,color,stopY,hold} */
  function mob(s,kind,x,y,o){
    if(s.mobs.length>=MOB_CAP)return;
    var spec=MOBS[kind];o=o||{};
    s.mobs.push({kind:kind,elite:!!spec.elite,x:x,y:y,baseX:x,vx:o.vx||0,vy:o.vy===undefined?1.6:o.vy,sway:o.sway||0,swayRate:o.swayRate||.05,hp:spec.hp,r:spec.r,score:spec.score,
      fire:o.fire||'aim',first:o.first||40,every:o.every||0,color:o.color||0,stopY:o.stopY||120,hold:o.hold||300,age:0,shots:0,hitTick:-99});
  }
  /* 잡몹 구간 대본 두 가지. a: 잡몹 {kind,fire,color}, elite: 중간 몹 {kind,fire,color} 또는 없음. */
  function waveColumns(a,elite){return function(s,t){
    // 황금각 순서로 자리를 옮겨 가며 내려오는 줄 → 중간 몹 → 양옆에서 가로질러 들어오는 줄
    if(t<270&&t%24===0){var i=t/24;mob(s,a.kind,180+150*Math.sin(i*GOLDEN_ANGLE),-20,{vy:1.7,sway:.6,fire:a.fire,first:46,color:a.color});}
    if(t===300){if(elite)mob(s,elite.kind,180,-30,{stopY:116,fire:elite.fire,first:20,every:78,hold:280,color:elite.color});else for(var k=0;k<4;k++)mob(s,a.kind,60+k*80,-20-k*14,{vy:1.3,fire:'ring',first:60,color:a.color});}
    if(t>=420&&t<700&&t%32===0){var left=(t/32)%2===0;mob(s,a.kind,left?-16:W+16,60+rand(s)*90,{vx:left?2:-2,vy:.7,fire:'drop',first:34,every:54,color:a.color});}
  };}
  function waveDives(a,elite){return function(s,t){
    // 사인 곡선으로 내리꽂는 떼 → 중간 몹 둘 → 흩어져 내려오며 고리를 뿌리는 떼
    if(t<280&&t%20===0){var i=t/20;mob(s,a.kind,i%2?74:286,-20,{vy:2.1,sway:2.4,swayRate:.085,fire:a.fire,first:38,color:a.color});}
    if(t===300&&elite){mob(s,elite.kind,96,-30,{stopY:122,fire:elite.fire,first:20,every:84,hold:280,color:elite.color});mob(s,elite.kind,264,-30,{stopY:122,fire:elite.fire,first:62,every:84,hold:280,color:elite.color});}
    if(t>=400&&t<700&&t%34===0)mob(s,a.kind,30+rand(s)*300,-20,{vy:1.5,sway:1.1,fire:'ring',first:44,color:a.color});
  };}

  /* ── 보스의 일반 공격 세 가지(이름 없음). c1, c2는 그 보스의 두 색. ── */
  function plainSpiral(c1,c2){return function(s,t){var b=s.boss,arms=count(s,3),k;
    if(t%7===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.04+TAU*k/arms,84,{color:c1,size:0});
    if(t%7===3)for(k=0;k<arms;k++)spawn(s,b.x,b.y,-t*.034+TAU*k/arms,66,{color:c2,size:0});};}
  function plainRings(c1,c2){return function(s,t){var b=s.boss,n=count(s,18);
    if(t%44===0)ring(s,b.x,b.y,n,72,(t/44)%2?Math.PI/n:0,{color:(t/44)%2?c2:c1,size:1});
    if(t%88===60)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,112,{color:WHITE,size:RICE});};}
  function plainBells(c1,c2){return function(s,t){var b=s.boss;
    if(t%52===0)bell(s,b.x,b.y,count(s,13),aim(s,b.x,b.y),1.9,104,.45,{color:c1,size:1});
    if(t%104===70)ring(s,b.x,b.y,count(s,12),58,rand(s)*TAU,{color:c2,size:0});};}
  function plainLissajous(c1,c2){return function(s,t){var b=s.boss;
    if(t%56===0)shape(s,b.x,b.y,Shapes.lissajous(3,2,count(s,26)),82,t*.01,{color:(t/56)%2?c2:c1,size:0});
    if(t%112===84)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,110,{color:WHITE,size:RICE});};}
  function plainHypocycloid(c1,c2){return function(s,t){var b=s.boss,odd=(t/60)%2;
    if(t%60===0)shape(s,b.x,b.y,Shapes.hypocycloid(odd?3:4,count(s,28)),78,t*.008,{color:odd?c2:c1,size:1});};}
  function plainCardioid(c1,c2){return function(s,t){var b=s.boss;
    if(t%64===0)shape(s,b.x,b.y,Shapes.cardioid(count(s,26)),84,aim(s,b.x,b.y)+Math.PI/2,{color:c1,size:0});
    if(t%64===32)ring(s,b.x,b.y,count(s,12),60,rand(s)*TAU,{color:c2,size:1});};}
  // 가우디의 현수선 아치: 사슬을 늘어뜨린 곡선(cosh)을 뒤집은 아치가 차례로 내려온다. 아치마다 세 칸의 문이 있다.
  function plainCatenary(c1,c2){return function(s,t){
    if(t%46!==0)return;
    s.lane=Math.max(0,Math.min(10,(s.lane===undefined?5:s.lane)+Math.floor(rand(s)*3)-1));
    for(var i=0;i<13;i++){if(i>=s.lane&&i<s.lane+3)continue;var x=W/13*(i+.5),u=(x-W/2)/90;spawn(s,x,-43+12*((Math.exp(u)+Math.exp(-u))/2-1),Math.PI/2,60,{color:(t/46)%2?c2:c1,size:1});}};}
  function plainSunflower(c1,c2){return function(s,t){var b=s.boss;
    if(t%90===0)shape(s,b.x,b.y,Shapes.sunflower(count(s,34)),94,rand(s)*TAU,{color:c1,size:0});
    if(t%90===45)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.8,100,.45,{color:c2,size:1});};}
  function plainSuperformula(c1,c2){return function(s,t){var b=s.boss,odd=(t/58)%2;
    if(t%58===0)shape(s,b.x,b.y,Shapes.superformula(odd?5:7,odd?2:3,7,7,count(s,30)),80,t*.006,{color:odd?c2:c1,size:0});};}
  // 보스를 축으로 도는 광선 바퀴
  function wheel(s,spokes,turn,color,active){var b=s.boss,base=aim(s,b.x,b.y)+Math.PI/spokes;for(var k=0;k<spokes;k++)beam(s,b.x,b.y,base+TAU*k/spokes,{width:12,warn:76,active:active,color:color,spin:turn,follow:true});}
  // 가로줄·세로줄 광선 격자. both면 한꺼번에 켠다.
  function lattice(s,t,period,rows,columns,both,width,c1,c2){var phase=t%period,half=period>>1;
    if(phase===0||both&&phase===half)for(var k=0;k<rows;k++)row(s,236+k*(330/rows)+rand(s)*46,{width:width,warn:64,active:66,color:c1});
    if(phase===half||both&&phase===0)slots(s,columns,W,10).forEach(function(x){column(s,x,{width:width,warn:64,active:66,color:c2});});}

  /* ── 인물. 원작에 나오는 이름만 쓴다. ── */
  var ACTORS={
    violet:{name:'보라검 천사',c1:PURPLE,c2:WHITE},balrog:{name:'발록',c1:RED,c2:YELLOW},mask:{name:'웃는 가면',c1:WHITE,c2:RED},lucifer:{name:'루시퍼',c1:YELLOW,c2:RED},
    asmodeus:{name:'아스모데우스',c1:RED,c2:PURPLE},pride:{name:'교만의 회장',c1:WHITE,c2:YELLOW},controller:{name:'통제자',c1:CYAN,c2:PURPLE},
    goblin:{name:'고블린 두목',c1:GREEN,c2:RED},insomnia:{name:'불면귀',c1:WHITE,c2:PURPLE},arbelia:{name:'아르벨리아',c1:CYAN,c2:WHITE},siren:{name:'세이렌 모르',c1:RED,c2:CYAN},
    chief:{name:'악몽의 우두머리',c1:WHITE,c2:PURPLE},executor:{name:'파란불 집행체',c1:CYAN,c2:RED},rian:{name:'한리안과 백이온',c1:YELLOW,c2:CYAN},cultist:{name:'교주',c1:RED,c2:WHITE}
  };
  gather('actors',ACTORS);

  /* ── 이름 붙은 패턴. 이름을 순서대로 읽으면 그 인물의 사연이 되도록 원작 장면 제목·목표에서만 따왔다.
   *    name 패턴 이름 · scene 원작 장면 번호 · fire(s,t) 발사 시작 뒤 t틱째 ── */
  // 붉은 하이힐용 발사기 설정(데이터). 굽 돌진은 조준 1회 + 가속, 큰 회전은 큰 구슬 세 팔 나선.
  var HEEL_DASH={kind:'aimed',patternId:'heel-dash',bulletsPerWave:1,difficultyMultiplier:{gentle:.45,normal:.85,hell:.85},spreadAngle:.5,baseSpeed:40,fireInterval:1,bulletType:{size:SHAPE_PROP,color:P.heel,accel:420,max:300}};
  var HEEL_WHEEL={kind:'spiral',patternId:'heel-wheel',emitterCount:3,rotationSpeed:1.3,baseSpeed:62,fireInterval:12/60,bulletType:{size:2,color:RED}};
  var spells={
    // 1부 전반 — 궁전. 보라검 천사의 실, 발록의 일곱 기둥·소환진·추락
    web:{name:'여덟 다리의 실',scene:'02',fire:function(s,t){var b=s.boss,n=pick(s,2,2,3),k,phase=t%190;
      if(phase===0)for(k=0;k<n;k++)beam(s,-12,-150+k*(520/n)+rand(s)*50,.95,{width:11,warn:62,active:70,color:PURPLE});
      if(phase===95)for(k=0;k<n;k++)beam(s,W+12,-150+k*(520/n)+rand(s)*50,Math.PI-.95,{width:11,warn:62,active:70,color:PURPLE});
      if(t%54===20)shape(s,b.x,b.y,Shapes.polygon(6,Math.max(2,count(s,4))),64,t*.009,{color:PURPLE,size:1});
      if(t%108===74)ring(s,b.x,b.y,pick(s,3,4,6),90,rand(s)*TAU,{size:SHAPE_PROP,color:P['sword-violet'],spin:.16});}},
    pillars:{name:'일곱 기둥',scene:'06',fire:function(s,t){var b=s.boss,phase=t%230,k,shift=Math.floor(t/230)%2?25:0;
      // 일곱 기둥이 한꺼번에 서고, 다음에는 반 칸 옮겨 선다. 기둥 사이 여섯 칸이 통로다.
      if(phase===0)for(k=0;k<7;k++)column(s,30+shift+k*50,{width:14,warn:70,active:84,color:RED});
      if(t%58===30)ring(s,b.x,b.y,count(s,12),60,rand(s)*TAU,{color:YELLOW,size:1});
      // 기둥에서 떨어지는 불티와, 느리게 번지는 붉은 고리.
      if(t%58===1)ring(s,b.x,b.y,count(s,16),44,rand(s)*TAU,{color:RED,size:0});
      if(t%8===0)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,44+rand(s)*26,{color:YELLOW,size:RICE});}},
    summon:{name:'소환진',scene:'07',fire:function(s,t){var b=s.boss;
      if(t%66===0)shape(s,b.x,b.y,Shapes.vitruvian(count(s,16)),66,t*.01,{color:RED,size:1});
      if(t%132===33)shape(s,b.x,b.y,Shapes.star(5,.4,Math.max(2,count(s,3))),78,-t*.008,{color:YELLOW,size:0});
      if(t%120===90)ring(s,b.x,b.y,pick(s,2,3,5),80,aim(s,b.x,b.y),{size:SHAPE_PROP,color:P['sword-balrog'],spin:.2,turn:.22});}},
    fall:{name:'추락',scene:'07',fire:function(s,t){var b=s.boss,i;
      // 모든 것이 아래로 떨어진다. 빈 칸이 조금씩 옮겨 가며 이어진다.
      if(t%40===0){s.lane=Math.max(1,Math.min(10,(s.lane===undefined?5:s.lane)+Math.floor(rand(s)*3)-1));curtain(s,14,s.lane,3,62,{color:t%80?RED:YELLOW,size:1});}
      if(t%9===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,50+rand(s)*40,{color:YELLOW,size:0});
      if(t%110===55)spawn(s,b.x,b.y,aim(s,b.x,b.y),96,{color:RED,size:2,at:56,mode:MODE_SPLIT,arg:count(s,10),speed2:70});}},
    // 1부 후반 — 병원. 웃는 가면, 루시퍼의 주사실·중독의 도시·천사의 가면
    smile:{name:'웃는 가면',scene:'08',fire:function(s,t){var b=s.boss;
      if(t%72===0)fan(s,b.x,b.y,pick(s,3,5,7),aim(s,b.x,b.y),1.3,96,{size:SHAPE_PROP,color:P.feather});
      if(t%72===36)ring(s,b.x,b.y,count(s,16),60,t*.02,{color:WHITE,size:1});}},
    needles:{name:'주사실',scene:'09-1',fire:function(s,t){var b=s.boss,phase=t%120;
      // 가는 바늘 줄기가 한동안 영웅을 따라오다 멈춘다.
      if(phase<64&&phase%8===0){var a=aim(s,b.x,b.y);spawn(s,b.x-9,b.y,a,132,{color:WHITE,size:RICE});spawn(s,b.x+9,b.y,a,132,{color:WHITE,size:RICE});}
      if(t%60===30)ring(s,b.x,b.y,count(s,14),54,rand(s)*TAU,{color:YELLOW,size:1});}},
    craving:{name:'중독의 도시',scene:'10',fire:function(s,t){var b=s.boss;
      // 흩어졌던 탄이 멈췄다가 영웅 쪽으로 다시 몰려든다.
      if(t%78===0){var n=count(s,30),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,160,{color:RED,size:0,accel:-165,min:0,at:60,mode:MODE_REAIM,arg:(i%3-1)*.22,speed2:92});}
      if(t%78===39)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.8,96,.45,{color:YELLOW,size:1});}},
    angelMask:{name:'천사의 가면',scene:'11',fire:function(s,t){var b=s.boss,every=pick(s,3,2,2);
      // 황금각 잎차례: 한 발마다 137.5°씩 돌려 쏘면 날개 같은 나선 팔이 생긴다.
      if(t%every===0){var i=t/every;spawn(s,b.x,b.y,i*GOLDEN_ANGLE,74,{color:i%13?YELLOW:WHITE,size:i%13?0:1});}
      if(t%130===70)ring(s,b.x,b.y,pick(s,4,6,8),70,rand(s)*TAU,{size:SHAPE_PROP,color:P.feather,spin:.1});}},
    // 2부 — 일곱 개의 귀. 붉은 하이힐, 회장의 전극 성당·하늘에 서려는 자·생체 부트로더
    heel:{name:'붉은 하이힐',scene:'17',fire:function(s,t){var b=s.boss;
      if(t%64===0)fan(s,b.x,b.y,pick(s,2,3,5),aim(s,b.x,b.y),1,104,{size:SHAPE_PROP,color:P.heel});
      if(t%96===48)shape(s,b.x,b.y,Shapes.rose(5,count(s,30)),78,t*.01,{color:RED,size:0});
      // 돌진(11-14 지시서): 굽이 느리게 출발했다가 쏘는 순간 겨눈 곳으로 급가속해 내리꽂힌다(쏜 뒤에는 따라오지 않는다).
      if(t%150===110)emit(s,HEEL_DASH,0,b);
      // 큰 회전: 큰 구슬 세 팔이 보스 둘레를 천천히 돌며 직진탄을 뿜는다(발사원이 도는 것, 탄은 곧게 난다).
      if(t%300>=150&&t%300<270)emit(s,HEEL_WHEEL,t,b);}},
    cathedral:{name:'전극 성당',scene:'21',fire:function(s,t){var b=s.boss;
      lattice(s,t,220,pick(s,2,2,3),pick(s,2,3,4),s.difficulty==='hell',10,WHITE,YELLOW);
      if(t%70===35)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,92,.45,{color:WHITE,size:0});
      // 전극 불꽃: 격자 사이로 노란 고리가 겹겹이 번진다.
      if(t%44===0)ring(s,b.x,b.y,count(s,16),54,t*.013,{color:YELLOW,size:1});
      if(t%8===0)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,44+rand(s)*26,{color:WHITE,size:RICE});}},
    ascend:{name:'하늘에 서려는 자',scene:'21',fire:function(s,t){var b=s.boss;
      // 위로 솟구친 탄이 힘을 잃고 꺾여 내려온다.
      if(t%44===0){var n=count(s,16);for(var i=0;i<n;i++){var u=n>1?i/(n-1)-.5:0;spawn(s,b.x,b.y,-Math.PI/2+u*2.2,150,{color:YELLOW,size:1,accel:-150,min:20,at:52,mode:MODE_TURN,arg:Math.PI-u*1.5,speed2:64});}}
      if(t%88===44)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,108,{color:WHITE,size:RICE});}},
    bootloader:{name:'생체 부트로더',scene:'22',fire:function(s,t){
      // 0과 1의 줄이 내려온다. 빈 세 칸이 한 줄에 한 칸씩만 옮겨 간다.
      if(t%38===0){s.lane=Math.max(0,Math.min(12,(s.lane===undefined?6:s.lane)+Math.floor(rand(s)*3)-1));curtain(s,15,s.lane,3,58,{color:(t/38)%2?WHITE:CYAN,size:(t/38)%2?0:1});}}},
    // 3부 — 통제자의 열일곱 단계
    legion:{name:'방어의 군단',scene:'24',fire:function(s,t){var b=s.boss;
      if(t%52===0)shape(s,b.x,b.y,Shapes.polygon(4,Math.max(2,count(s,6))),70,t*.012,{color:CYAN,size:0});
      if(t%104===78)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.5,96,.45,{color:PURPLE,size:1});}},
    rescue:{name:'잔인한 구원',scene:'25',fire:function(s,t){var b=s.boss,phase=t%260;
      // 양옆 벽이 차례로 좁혀 온다. 가운데 길만 남는다.
      if(phase===0){column(s,26,{width:22,warn:70,active:150,color:CYAN});column(s,W-26,{width:22,warn:70,active:150,color:CYAN});}
      if(phase===70){column(s,74,{width:22,warn:70,active:90,color:CYAN});column(s,W-74,{width:22,warn:70,active:90,color:CYAN});}
      if(t%64===32)fan(s,b.x,b.y,count(s,5),aim(s,b.x,b.y),.9,96,{color:PURPLE,size:1});
      // 구원의 손길: 느린 고리가 겹겹이 번지고, 가는 빗줄기가 가운데 길에 내린다.
      if(t%48===0)ring(s,b.x,b.y,count(s,16),52,t*.011,{color:CYAN,size:0});
      if(t%7===0)spawn(s,60+rand(s)*(W-120),-8,Math.PI/2,50+rand(s)*30,{color:PURPLE,size:RICE});}},
    veto:{name:'시스템의 거부권',scene:'26',fire:function(s,t){var b=s.boss,k;
      // 뻗어 나가던 탄이 멈춰 서서 일제히 방향을 꺾는다.
      if(t%120===0){var n=count(s,36),start=rand(s)*TAU;for(k=0;k<n;k++)spawn(s,b.x,b.y,start+TAU*k/n,180,{color:CYAN,size:0,accel:-200,min:0,at:55,mode:MODE_TURN,arg:k%2?.9:-.9,speed2:88});}
      if(t%120===60)shape(s,b.x,b.y,Shapes.koch(pick(s,1,2,2)),92,t*.004,{color:WHITE,size:0});}},
    memoryGate:{name:'기억의 문',scene:'29',fire:function(s,t){var b=s.boss;
      // 같은 명령이 되풀이된다: 같은 삼각 무늬가 조금씩 돌아가며 반복된다.
      if(t%48===0)shape(s,b.x,b.y,Shapes.sierpinski(pick(s,2,2,3)),74,Math.floor(t/48)*.35,{color:PURPLE,size:0});
      if(t%192===100)for(var k=0;k<pick(s,1,2,2);k++)row(s,300+k*150+rand(s)*40,{width:14,warn:66,active:60,color:CYAN});}},
    // 4부 — 환도 자아와 융합몽세. 고블린 두목의 장미 인장, 불면귀의 마을·눈·실안개
    roseSeal:{name:'장미 인장',scene:'32',fire:function(s,t){var b=s.boss;
      if(t%60===0)shape(s,b.x,b.y,Shapes.rose((t/60)%2?5:4,count(s,32)),84,t*.007,{color:(t/60)%2?RED:GREEN,size:0});
      if(t%120===90)ring(s,b.x,b.y,pick(s,2,3,5),86,aim(s,b.x,b.y),{size:SHAPE_PROP,color:P.cleaver,spin:.18});}},
    sleepless:{name:'잠들지 못하는 마을',scene:'34',fire:function(s,t){var b=s.boss,i;
      // 안개: 흰 탄이 천천히 흔들리며 화면을 덮는다.
      if(t%7===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2+(rand(s)-.5)*.5,30+rand(s)*26,{color:WHITE,size:rand(s)<.25?1:0,turn:(rand(s)-.5)*.3,life:1500});
      if(t%96===48)ring(s,b.x,b.y,count(s,14),50,rand(s)*TAU,{color:PURPLE,size:1});}},
    openEye:{name:'감기지 않는 눈',scene:'35',fire:function(s,t){var b=s.boss;
      if(t%68===0)shape(s,b.x,b.y,Shapes.eye(count(s,30)),86,(t/68)%2?.5:-.5,{color:(t/68)%2?PURPLE:WHITE,size:0});
      // 시선: 눈이 영웅을 본다.
      if(t%68===34)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.3,118,{color:PURPLE,size:RICE});}},
    puppetFog:{name:'꼭두각시 실안개',scene:'35',fire:function(s,t){var i;
      // 주민에게서 뻗은 흰 실이 격자를 짜고, 그 사이로 안개가 내린다.
      lattice(s,t,240,pick(s,2,2,3),pick(s,2,3,4),s.difficulty==='hell',8,WHITE,WHITE);
      if(t%6===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2+(rand(s)-.5)*.4,32+rand(s)*22,{color:WHITE,size:0,turn:(rand(s)-.5)*.24,life:1500});
      // 실에 끌리는 손: 보스에게서 보랏빛 고리가 실을 따라 번진다.
      if(t%66===33)ring(s,s.boss.x,s.boss.y,count(s,14),50,rand(s)*TAU,{color:PURPLE,size:1});}},
    // 5부 — 카이로노미콘. 아르벨리아의 유예, 세이렌의 빼앗긴 시간·닫힌 층·재작성. 톱니와 초침.
    reprieve:{name:'유예의 수문장',scene:'45',fire:function(s,t){var b=s.boss;
      // 시계: 긴 바늘과 짧은 바늘이 서로 다른 빠르기로 돌고, 열두 눈금이 퍼진다.
      if(t%420===0){var a=aim(s,b.x,b.y)+Math.PI/2;beam(s,b.x,b.y,a,{width:11,warn:76,active:300,color:CYAN,spin:pick(s,.16,.22,.3),follow:true});beam(s,b.x,b.y,a+Math.PI,{width:15,warn:76,active:300,color:WHITE,spin:-pick(s,.06,.08,.11),follow:true});}
      if(t%60===30)ring(s,b.x,b.y,12,58,-Math.PI/2+Math.floor(t/60)*.13,{color:CYAN,size:1});
      // 분 눈금: 열두 눈금 사이사이로 작은 눈금이 느리게 따라 퍼진다.
      if(t%30===0)ring(s,b.x,b.y,count(s,24),40,-Math.PI/2+Math.floor(t/30)*.065,{color:WHITE,size:0});
      if(t%90===45)bell(s,b.x,b.y,count(s,9),aim(s,b.x,b.y),1.4,86,.45,{color:YELLOW,size:RICE});}},
    stolenTime:{name:'빼앗긴 시간',scene:'39',fire:function(s,t){var b=s.boss;
      // 톱니바퀴: 톱니 모양 고리가 맞물리듯 번갈아 돌며 퍼진다.
      if(t%60===0)shape(s,b.x,b.y,Shapes.star(8,.74,Math.max(2,count(s,2))),74,((t/60)%2?1:-1)*t*.006,{color:(t/60)%2?CYAN:RED,size:0});
      if(t%120===80)ring(s,b.x,b.y,pick(s,2,3,5),62,rand(s)*TAU,{size:SHAPE_PROP,color:P.gear,spin:.08});}},
    closedFloor:{name:'닫힌 층의 명령',scene:'40',fire:function(s,t){var b=s.boss,phase=t%240;
      // 층이 위에서부터 차례로 닫힌다.
      if(phase===0)row(s,250,{width:16,warn:60,active:70,color:RED});if(phase===50)row(s,380,{width:16,warn:60,active:70,color:RED});if(phase===100)row(s,510,{width:16,warn:60,active:70,color:RED});
      if(t%60===20)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,92,.45,{color:CYAN,size:1});
      // 명령문: 층마다 붉은 고리가 느리게 번지고, 층 사이로 쌀알이 내린다.
      if(t%48===0)ring(s,b.x,b.y,count(s,16),50,t*.009,{color:RED,size:0});
      if(t%7===0)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,46+rand(s)*28,{color:CYAN,size:RICE});}},
    rewrite:{name:'최초명령 재작성',scene:'46',fire:function(s,t){var b=s.boss,k,n=pick(s,2,3,4);
      // 초침처럼 한 바퀴 도는 탄 줄기와, 휘어 돌아오는 초승달
      if(t%90===0)for(k=0;k<n;k++)shape(s,b.x,b.y,Shapes.goldenSpiral(count(s,12)),104,TAU*k/n+t*.01,{color:CYAN,size:1});
      if(t%90===45)fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),1.3,96,{size:SHAPE_PROP,color:P.crescent,spin:.12,turn:.28});
      if(t%10===0)spawn(s,b.x,b.y,-Math.PI/2+t*TAU/360,60,{color:RED,size:0});}},
    // 6부 — 두 사람의 성
    castleGate:{name:'성문',scene:'48',fire:function(s,t){var b=s.boss;
      if(t%200===0){column(s,70,{width:20,warn:66,active:120,color:WHITE});column(s,W-70,{width:20,warn:66,active:120,color:WHITE});}
      if(t%84===40)ring(s,b.x,b.y,pick(s,3,4,6),82,rand(s)*TAU,{size:SHAPE_PROP,color:P['twin-blade'],spin:.2});
      // 쇠창살: 빈칸이 조금씩 옮겨 가는 쌀알 줄이 내려온다. 성벽 위에서는 화살 고리가 퍼진다.
      if(t%40===0){s.lane=Math.max(0,Math.min(11,(s.lane===undefined?6:s.lane)+Math.floor(rand(s)*3)-1));curtain(s,15,s.lane,4,66,{color:WHITE,size:RICE});}
      if(t%56===28)ring(s,b.x,b.y,count(s,14),58,rand(s)*TAU,{color:YELLOW,size:0});}},
    summoned:{name:'소환된 의목사',scene:'48',fire:function(s,t){var b=s.boss;
      if(t%64===0)shape(s,b.x,b.y,Shapes.vitruvian(count(s,16)),64,t*.009,{color:WHITE,size:1});
      if(t%64===32)ring(s,b.x,b.y,count(s,14),84,t*.02,{color:PURPLE,size:0});}},
    twoMasters:{name:'두 주인의 각성',scene:'49',fire:function(s,t){var b=s.boss,every=pick(s,4,3,2);
      // 두 주인: 보스 양옆 두 자리에서 서로 반대로 도는 나선이 함께 피어난다.
      if(t%every===0){var i=t/every;spawn(s,b.x-64,b.y+6,i*GOLDEN_ANGLE,70,{color:PURPLE,size:0});spawn(s,b.x+64,b.y+6,-i*GOLDEN_ANGLE,70,{color:WHITE,size:0});}}},
    sharedCore:{name:'함께 되찾은 코어',scene:'50',fire:function(s,t){var b=s.boss,k;
      // 좌우로 갈라져 나간 쌍검이 휘어 한가운데에서 다시 만난다.
      if(t%70===0)for(k=0;k<pick(s,1,2,3);k++){spawn(s,b.x,b.y,Math.PI/2-1.2-k*.25,104,{size:SHAPE_PROP,color:P['twin-blade'],spin:.2,turn:.55});spawn(s,b.x,b.y,Math.PI/2+1.2+k*.25,104,{size:SHAPE_PROP,color:P['twin-blade'],spin:-.2,turn:-.55});}
      if(t%70===35)shape(s,b.x,b.y,Shapes.polygon(8,Math.max(2,count(s,3))),72,t*.01,{color:(t/70)%2?PURPLE:WHITE,size:1});}},
    // 7부 — 파란불 아래의 사람들
    hotel:{name:'새빛호텔',scene:'53',fire:function(s,t){var b=s.boss,phase=t%200;
      // 화재 경보: 붉은 줄과 푸른 줄이 번갈아 켜진다.
      if(phase===0)row(s,300+rand(s)*60,{width:16,warn:64,active:70,color:RED});if(phase===100)row(s,440+rand(s)*60,{width:16,warn:64,active:70,color:CYAN});
      if(t%50===25)ring(s,b.x,b.y,count(s,14),64,rand(s)*TAU,{color:(t/50)%2?RED:CYAN,size:1});
      // 스프링클러: 천장에서 물방울이 쉬지 않고 떨어진다.
      if(t%6===0)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,50+rand(s)*30,{color:CYAN,size:RICE});}},
    fireDoor:{name:'청록빌라 방화문',scene:'54',fire:function(s,t){var i;
      // 방화문이 닫힌다: 세로 막대 사이 열린 문으로만 지나간다.
      if(t%170===0)slots(s,pick(s,2,3,4),W,24).forEach(function(x){column(s,x,{width:26,warn:70,active:80,color:CYAN});});
      if(t%5===0)for(i=0;i<count(s,1);i++)spawn(s,8+rand(s)*(W-16),-8,Math.PI/2,48+rand(s)*36,{color:CYAN,size:0});
      // 문틈으로 새는 불티: 보스에게서 붉은 고리가 느리게 번진다.
      if(t%54===27)ring(s,s.boss.x,s.boss.y,count(s,14),54,rand(s)*TAU,{color:RED,size:1});}},
    blueLight:{name:'파란불',scene:'52',fire:function(s,t){var b=s.boss;
      // 멈춤과 출발: 고리가 멈춰 섰다가 신호가 바뀌면 다시 나아간다.
      if(t%84===0){var n=count(s,26),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,150,{color:(t/84)%2?RED:CYAN,size:1,accel:-190,min:0,at:96,mode:MODE_TURN,arg:0,speed2:84});}
      if(t%84===42)fan(s,b.x,b.y,count(s,3),aim(s,b.x,b.y),.5,108,{color:WHITE,size:RICE});}},
    rooftopLoop:{name:'옥상의 순환',scene:'55',fire:function(s,t){var b=s.boss;
      // 순환: 탄이 원을 그리며 돌아 제자리로 되돌아온다.
      if(t%50===0)ring(s,b.x,b.y,count(s,14),96,rand(s)*TAU,{color:(t/50)%2?CYAN:WHITE,size:0,turn:(t/50)%2?.95:-.95,life:560});
      if(t%100===60)fan(s,b.x,b.y,pick(s,2,3,4),aim(s,b.x,b.y),1.2,90,{size:SHAPE_PROP,color:P.crescent,spin:.12,turn:.25});}},
    // 8부 — 사이비 합일몽세
    traitors:{name:'배신자 둘',scene:'60',fire:function(s,t){var b=s.boss,other=W-b.x;
      // 두 사람: 보스 자리와 그 맞은편 자리에서 번갈아 쏜다. 십자가는 똑바로 선 채 내려온다.
      if(t%72===0)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,96,.45,{color:YELLOW,size:1});
      if(t%72===36)bell(s,other,b.y,count(s,11),aim(s,other,b.y),1.7,96,.45,{color:CYAN,size:1});
      if(t%150===100)slots(s,pick(s,1,2,3),W,30).forEach(function(x){spawn(s,x,-30,Math.PI/2,76,{size:SHAPE_PROP,color:P.cross,life:900});});}},
    boundNightmare:{name:'하나로 묶인 악몽',scene:'56',fire:function(s,t){var b=s.boss;
      // 흩어졌던 탄이 한 점으로 묶여 든다.
      if(t%90===0){var n=count(s,28),base=rand(s)*TAU;for(var i=0;i<n;i++)spawn(s,b.x,b.y,base+TAU*i/n,170,{color:RED,size:0,accel:-180,min:0,at:64,mode:MODE_REAIM,arg:0,speed2:78});}
      if(t%90===45)ring(s,b.x,b.y,count(s,12),56,rand(s)*TAU,{color:WHITE,size:1});}},
    returning:{name:'돌아오는 기억',scene:'58',fire:function(s,t){var b=s.boss;
      // 아래로 내려갔던 탄이 멈췄다가 왔던 길로 되돌아온다.
      if(t%64===0){var n=count(s,11);for(var i=0;i<n;i++)spawn(s,b.x,b.y,Math.PI/2+(n>1?i/(n-1)-.5:0)*1.9,190,{color:WHITE,size:1,accel:-170,min:0,at:84,mode:MODE_TURN,arg:Math.PI,speed2:74});}
      if(t%128===96)ring(s,b.x,b.y,count(s,14),60,rand(s)*TAU,{color:RED,size:0});}},
    twoGoals:{name:'처음 세웠던 목표',scene:'59',fire:function(s,t){var b=s.boss,phase=t%100;
      // 두 목표: 두 자리에서 번갈아 곧게 겨눈다.
      if(phase<50&&phase%10===0)fan(s,b.x-80,b.y,pick(s,1,2,3),aim(s,b.x-80,b.y),.16,120,{color:RED,size:RICE});
      if(phase>=50&&phase%10===0)fan(s,b.x+80,b.y,pick(s,1,2,3),aim(s,b.x+80,b.y),.16,120,{color:WHITE,size:RICE});
      if(t%100===75)ring(s,b.x,b.y,count(s,16),54,rand(s)*TAU,{color:YELLOW,size:1});}},
    samong:{name:'교주의 사몽',scene:'61',fire:function(s,t){var b=s.boss,k,arms=count(s,3);
      // 끝: 광선 바퀴 사이로 눈송이와 나선이 번갈아 피어난다.
      if(t%400===0)wheel(s,pick(s,2,3,4),(Math.floor(t/400)%2?-1:1)*pick(s,.14,.2,.28),RED,270);
      if(t%11===0)for(k=0;k<arms;k++)spawn(s,b.x,b.y,t*.03+TAU*k/arms,84,{color:RED,size:0});
      if(t%120===30)shape(s,b.x,b.y,Shapes.koch(pick(s,1,2,2)),92,t*.004,{color:WHITE,size:0});
      if(t%120===90)for(k=0;k<pick(s,2,3,4);k++)shape(s,b.x,b.y,Shapes.goldenSpiral(count(s,12)),104,TAU*k/pick(s,2,3,4)+t*.01,{color:YELLOW,size:1});}}
  };

  var PLAIN=[plainSpiral,plainLissajous,plainBells,plainCatenary,plainRings,plainHypocycloid,plainSunflower,plainCardioid,plainSuperformula],PLAIN_NAMES=['spiral','lissajous','bell','catenary','rings','hypocycloid','sunflower','cardioid','superformula'],plainCount=0,STAGES=[],SEGMENTS=[];
  /* 잡몹 구간 하나. script(s,t)는 t틱째에 몹을 내보내는 대본. */
  function wave(script,duration){script.duration=duration||760;return script;}
  /* 부별 파일에 건네는 도구 상자. */
  var KIT={W:W,H:H,TAU:TAU,TICK:TICK,GOLDEN_ANGLE:GOLDEN_ANGLE,RED:RED,PURPLE:PURPLE,CYAN:CYAN,GREEN:GREEN,YELLOW:YELLOW,WHITE:WHITE,RICE:RICE,SHAPE_PROP:SHAPE_PROP,P:P,
    MODE_REAIM:MODE_REAIM,MODE_TURN:MODE_TURN,MODE_SPLIT:MODE_SPLIT,MODE_BRANCH:MODE_BRANCH,
    rand:rand,count:count,pick:pick,aim:aim,spawn:spawn,ring:ring,fan:fan,bell:bell,curtain:curtain,emit:emit,shape:shape,Shapes:Shapes,beam:beam,row:row,column:column,slots:slots,wheel:wheel,lattice:lattice,
    mob:mob,wave:wave,waveColumns:function(a,elite,duration){return wave(waveColumns(a,elite),duration);},waveDives:function(a,elite,duration){return wave(waveDives(a,elite),duration);}};
  var DEFS={};
  PARTS.forEach(function(p){
    var built=p.build(KIT);
    Object.keys(built.mobFire||{}).forEach(function(k){if(MOB_FIRE[k])throw new Error('duplicate mob fire '+k);MOB_FIRE[k]=built.mobFire[k];});
    Object.keys(built.spells||{}).forEach(function(k){if(spells[k])throw new Error('duplicate spell '+k);spells[k]=built.spells[k];});
    (built.stages||[]).forEach(function(g){if(DEFS[g.scene])throw new Error('scene twice: '+g.scene);g.partFile=p.part;DEFS[g.scene]=g;});
  });
  SCENES.forEach(function(row,index){
    var g=DEFS[row[0]];if(!g)throw new Error('no stage for scene '+row[0]+' '+row[2]);
    if(g.partFile!==row[1])throw new Error('scene '+row[0]+' belongs to part '+row[1]);
    var stage={index:index,part:row[1],scene:row[0],name:row[2],kind:g.boss?'boss':'road',theme:g.theme,cast:g.cast||[],first:SEGMENTS.length,reward:g.reward,seconds:0};
    if(g.placeholder)stage.placeholder=true;
    stage.cast.forEach(function(k){if(!MOBS[k])throw new Error(row[2]+': unknown mob '+k);});
    function cards(list,mid){
      var actor=list[0],who=ACTORS[actor];if(!who)throw new Error(row[2]+': unknown actor '+actor);
      for(var k=1;k<list.length;k++){
        var spell=spells[list[k]],last=!mid&&k===list.length-1;if(!spell)throw new Error(row[2]+': unknown pattern '+list[k]);
        if(spell.scene&&spell.scene!==row[0])throw new Error(row[2]+': pattern '+list[k]+' belongs to scene '+spell.scene);
        if(spell.used)throw new Error('pattern used twice: '+list[k]);spell.used=true;
        SEGMENTS.push({kind:'card',stage:index,actor:actor,mid:mid,spell:false,name:'',plain:PLAIN_NAMES[plainCount%9],hp:mid?200:240,time:mid?16:18,fire:PLAIN[plainCount++%9](who.c1,who.c2)});
        SEGMENTS.push({kind:'card',stage:index,actor:actor,mid:mid,spell:true,name:spell.name,scene:row[0],hp:spell.hp||(mid?420:last?600:520),time:spell.time||(mid?26:last?36:30),fire:spell.fire});
      }
    }
    function waves(list){list.forEach(function(script){SEGMENTS.push({kind:'wave',stage:index,duration:script.duration||760,script:script});});}
    var w=g.waves||[];if(w.length<2)throw new Error(row[2]+': a stage needs at least two mob waves');
    if(g.boss){var half=Math.ceil(w.length/2);waves(w.slice(0,half));cards(g.mid,true);waves(w.slice(half));cards(g.boss,false);}
    else{waves(w);cards(g.mid,true);}
    for(var i=stage.first;i<SEGMENTS.length;i++){var x=SEGMENTS[i];stage.seconds+=x.kind==='wave'?x.duration/60+4:x.time*.7+2.5;}
    STAGES.push(stage);
  });
  var CARD_TOTAL=SEGMENTS.filter(function(g){return g.kind==='card'&&g.spell;}).length;

  /* options: {difficulty, seed, stage(시작 스테이지), segment(시작 구간), compact(휴대폰 모드), bossOnly(보스 체험: 그 스테이지의 보스전만)} */
  function createRun(options){
    options=options||{};var difficulty=DIFFICULTY[options.difficulty]?options.difficulty:'normal',rules=DIFFICULTY[difficulty],compact=!!options.compact;
    var startSeg=Number.isInteger(options.segment)&&SEGMENTS[options.segment]?options.segment:Number.isInteger(options.stage)&&STAGES[options.stage]?STAGES[options.stage].first:0;
    var s={revision:43,difficulty:difficulty,rules:rules,compact:compact,density:rules.density*(compact?COMPACT_DENSITY:1),sizeScale:compact?COMPACT_SIZE:1,cap:compact?COMPACT_CAP:CAP,
      seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'break',stageTick:BREAK_TICKS-30,seg:startSeg-1,segTick:0,stageIndex:SEGMENTS[startSeg].stage,spellNumber:0,
      player:{x:W/2,y:H-84,hp:rules.hp,maxHp:rules.hp,invulnerableUntil:0,r:rules.radius,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,actor:'',name:'',mid:false,hitTick:-99,leaving:false,present:false,down:null},
      bossOnly:!!options.bossOnly,rushStage:SEGMENTS[startSeg].stage,bombs:rules.bombs,gauge:0,spellClean:false,captures:0,itemsTaken:0,lane:undefined,
      n:0,dropped:0,peak:0,score:0,graze:0,hits:0,kills:0,cleared:0,timeouts:0,events:[],cancelled:[],pops:[],lasers:[],mobs:[],warned:false,sn:0,itemCount:0,
      lastStage:STAGES.length-1,started:false,results:[],bombsUsed:0,mark:{tick:0,score:0,hits:0,bombs:0,captures:0,spells:0}};
    if(Number.isInteger(options.stages)&&options.stages>0)s.lastStage=Math.min(STAGES.length-1,s.stageIndex+options.stages-1);
    ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin'].forEach(function(k){s[k]=new Float32Array(CAP);});
    ['bage','blife','bat'].forEach(function(k){s[k]=new Uint16Array(CAP);});
    ['bsize','bcolor','bgrazed','bmode','bgen','bbounce'].forEach(function(k){s[k]=new Uint8Array(CAP);});s.figures=[];s.ripples=[];
    s.sx=new Float32Array(SHOT_CAP);s.sy=new Float32Array(SHOT_CAP);s.shoming=new Uint8Array(SHOT_CAP);
    s.ix=new Float32Array(ITEM_CAP);s.iy=new Float32Array(ITEM_CAP);s.ivy=new Float32Array(ITEM_CAP);s.ikind=new Uint8Array(ITEM_CAP);
    // 구간을 직접 지정하면(연습·검사) 그 구간에서 바로 시작한다.
    if(Number.isInteger(options.segment)&&SEGMENTS[options.segment]){s.started=true;s.seg=startSeg;s.stageTick=0;s.stage=SEGMENTS[startSeg].kind==='wave'?'wave':'intro';}
    return s;
  }
  function removeBullet(s,i){
    var j=--s.n;if(i===j)return;
    s.bx[i]=s.bx[j];s.by[i]=s.by[j];s.ba[i]=s.ba[j];s.bs[i]=s.bs[j];s.bturn[i]=s.bturn[j];s.bacc[i]=s.bacc[j];s.bmin[i]=s.bmin[j];s.bmax[i]=s.bmax[j];s.barg[i]=s.barg[j];s.bs2[i]=s.bs2[j];s.bspin[i]=s.bspin[j];
    s.bage[i]=s.bage[j];s.blife[i]=s.blife[j];s.bat[i]=s.bat[j];s.bsize[i]=s.bsize[j];s.bcolor[i]=s.bcolor[j];s.bgrazed[i]=s.bgrazed[j];s.bmode[i]=s.bmode[j];s.bgen[i]=s.bgen[j];s.bbounce[i]=s.bbounce[j];
  }
  // 화면의 탄과 광선을 모두 지우고, 지운 탄 자리를 연출용으로 남긴다(최대 320개). 지운 탄 수를 돌려준다.
  function cancelAll(s){
    var n=s.n;for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bsize[i]===SHAPE_PROP?WHITE:s.bcolor[i]);
    s.n=0;s.lasers.length=0;s.figures.length=0;s.ripples.length=0;return n;
  }
  /* 아이템 하나를 떨군다. kind 0 점수, 1 폭탄 조각. 위로 살짝 튀었다가 천천히 내려온다. */
  function dropItem(s,x,y,kind){if(s.itemCount>=ITEM_CAP)return;var i=s.itemCount++;s.ix[i]=Math.max(10,Math.min(W-10,x));s.iy[i]=y;s.ivy[i]=-1.6;s.ikind[i]=kind||0;}
  function fillGauge(s){while(s.gauge>=GAUGE_FULL){s.gauge-=GAUGE_FULL;if(s.bombs<MAX_BOMBS){s.bombs++;note(s,'bombGain');}}}
  function updateItems(s){
    var p=s.player,pull=p.y<AUTO_COLLECT_Y,reach=p.focus?ITEM_REACH+10:ITEM_REACH;
    for(var i=s.itemCount-1;i>=0;i--){
      var dx=p.x-s.ix[i],dy=p.y-s.iy[i],d=Math.sqrt(dx*dx+dy*dy);
      // 화면 위쪽으로 올라가 있으면 모든 아이템이 빨려 온다. 아니면 가까운 것만 끌려온다.
      if(pull||d<60){var step=pull?ITEM_PULL:5;if(d>step){s.ix[i]+=dx/d*step;s.iy[i]+=dy/d*step;d-=step;}else d=0;}
      else{s.ivy[i]=Math.min(1.5,s.ivy[i]+.05);s.iy[i]+=s.ivy[i];}
      if(d<reach){
        // 높은 곳에서 먹을수록 값이 크다.
        if(s.ikind[i]===1)s.gauge+=25;else s.score+=100+Math.round(Math.max(0,H-p.y)*1.5);
        s.itemsTaken++;note(s,'item');
      }else if(s.iy[i]<=H+20)continue;
      var j=--s.itemCount;s.ix[i]=s.ix[j];s.iy[i]=s.iy[j];s.ivy[i]=s.ivy[j];s.ikind[i]=s.ikind[j];
    }
    fillGauge(s);
  }
  function killMob(s,k){var m=s.mobs[k];s.score+=m.score;s.kills++;s.pops.push(m.x,m.y,m.elite?1:0);note(s,'kill');
    for(var i=0;i<(m.elite?7:1);i++)dropItem(s,m.x+(m.elite?(i-3)*9:0),m.y,m.elite&&i===3?1:0);s.mobs.splice(k,1);}
  function useBomb(s){
    if(s.bombs<=0||s.stage==='won'||s.stage==='lost')return;
    s.bombs--;s.bombsUsed++;s.spellClean=false;s.score+=cancelAll(s)*10;s.player.invulnerableUntil=Math.max(s.player.invulnerableUntil,s.tick+BOMB_TICKS);note(s,'bomb');
    if(s.stage==='card')s.boss.hp-=BOMB_BOSS_DAMAGE;
    for(var k=s.mobs.length-1;k>=0;k--){var m=s.mobs[k];m.hp-=BOMB_MOB_DAMAGE;m.hitTick=s.tick;if(m.hp<=0)killMob(s,k);}
  }
  function segment(s){return SEGMENTS[s.seg];}
  /* 스테이지 하나를 마쳤다. 그 스테이지 동안의 기록을 남긴다. 별: 깨면 1, 한 번도 안 맞으면 +1, 폭탄을 안 쓰면 +1. */
  function closeStage(s,index){
    var m=s.mark,hits=s.hits-m.hits,bombs=s.bombsUsed-m.bombs;
    s.results.push({stage:index,ticks:s.tick-m.tick,score:s.score-m.score,hits:hits,bombs:bombs,captures:s.captures-m.captures,spells:s.spellNumber-m.spells,stars:1+(hits===0?1:0)+(bombs===0?1:0)});
    m.tick=s.tick;m.score=s.score;m.hits=s.hits;m.bombs=s.bombsUsed;m.captures=s.captures;m.spells=s.spellNumber;note(s,'stageClear');
  }
  /* 다음 구간으로. 맵이 바뀌면 난이도 규칙대로 목숨을 채우고, 인물이 바뀌면 이전 보스를 내보낸다. */
  function advance(s){
    var prev=segment(s),at=s.seg+1,p=s.player;
    // 보스 체험: 잡몹 구간을 건너뛰고, 고른 스테이지의 중간 보스와 보스만 싸운 뒤 끝난다.
    if(s.bossOnly){while(SEGMENTS[at]&&SEGMENTS[at].kind==='wave')at++;if(SEGMENTS[at]&&SEGMENTS[at].stage!==s.rushStage)at=SEGMENTS.length;}
    var next=SEGMENTS[at];
    if(next&&next.stage>s.lastStage)next=undefined;
    if(s.started&&prev&&(!next||next.stage!==prev.stage))closeStage(s,prev.stage);
    s.started=true;
    if(!next){s.stage='won';s.stageTick=0;note(s,'win');return;}
    s.seg=at;s.segTick=0;s.stageTick=0;s.lane=undefined;
    if(next.stage!==s.stageIndex){s.stageIndex=next.stage;var heal=s.rules.mapHeal;if(heal&&p.hp<p.maxHp){p.hp=heal<0?p.maxHp:Math.min(p.maxHp,p.hp+heal);note(s,'extend');}note(s,'map');}
    if(next.kind==='wave'){s.boss.leaving=s.boss.present;s.stage='wave';note(s,'wave');return;}
    if(!prev||prev.kind!=='card'||prev.actor!==next.actor||!s.boss.present){s.boss.leaving=s.boss.present;s.stage='intro';}else s.stage='break';
  }
  function enter(s,actor){var b=s.boss;b.actor=actor;b.name=ACTORS[actor].name;b.mid=!!segment(s).mid;b.present=true;b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=132;s.stageTick=0;note(s,'entrance');}
  function beginCard(s){var card=segment(s),b=s.boss;b.maxHp=b.hp=card.hp;b.mid=!!card.mid;s.stage='card';s.stageTick=0;s.segTick=0;s.spellClean=!!card.spell;if(card.spell){s.spellNumber++;note(s,'card');}else note(s,'plain');}
  function endCard(s,defeated){
    var card=segment(s),left=Math.max(0,card.time-s.segTick*TICK),wiped=cancelAll(s),b=s.boss;
    if(defeated){s.cleared++;s.score+=Math.round(left)*300+wiped*30;for(var i=0;i<(card.spell?10:5);i++)dropItem(s,b.x+(i-4.5)*12,b.y+((i*37)%30)-15,card.spell&&i===5?1:0);}else s.timeouts++;
    // 이름 붙은 패턴을 폭탄 없이, 맞지 않고 넘기면 보너스
    if(card.spell&&defeated&&s.spellClean){s.captures++;s.score+=20000+card.stage*5000;note(s,'capture');}
    s.score+=wiped*10;note(s,'break');var who=b.actor,dx=b.x,dy=b.y;advance(s);
    // 이 보스의 마지막 패턴이 깨졌다(다른 보스나 잡몹 구간으로 넘어감): 화면은 이 자리에서 쓰러지는 동작을 그린다.
    if(defeated&&(b.leaving||s.stage==='won')){b.down={actor:who,x:dx,y:dy,tick:s.tick};note(s,'bossDown');}
  }
  function moveBoss(s){
    var b=s.boss;if(!b.present)return;
    if(b.leaving){b.y-=5;if(b.y<-70){b.leaving=false;b.present=false;}return;}
    if(s.stage==='card'&&s.segTick%150===0){b.targetX=96+rand(s)*(W-192);b.targetY=112+rand(s)*52;}
    b.x+=(b.targetX-b.x)*.035;b.y+=(b.targetY-b.y)*.05;
  }
  function movePlayer(s,input){
    var p=s.player,dx=Number(input&&input.dx)||0,dy=Number(input&&input.dy)||0,limit=input&&input.focus?FOCUS_MOVE:MAX_MOVE,len=Math.sqrt(dx*dx+dy*dy);
    if(!(len<1e9)){dx=0;dy=0;len=0;} // NaN·무한대 입력은 버린다
    if(len>limit){dx*=limit/len;dy*=limit/len;}
    p.focus=!!(input&&input.focus);p.x=Math.max(8,Math.min(W-8,p.x+dx));p.y=Math.max(40,Math.min(H-14,p.y+dy));
  }
  // 따로 정하지 않은 잡몹도 화면 위쪽에 머무는 동안 이 간격(틱)으로 다시 쏜다. 잡몹 구간이 보스전보다 지나치게 한가하지 않게(11-14 지시서).
  // 화면의 탄이 적으면 더 자주, 많으면 쉬어서 장면마다 압박이 고르게 한다. [쉬움, 보통, 지옥] 기준 탄 수.
  var MOB_REFIRE=[96,56,56],WAVE_FLOOR=[110,280,280],WAVE_CEIL=[170,320,320];
  function refireEvery(s,every){var d=s.difficulty==='gentle'?0:s.difficulty==='hell'?2:1,base=every||MOB_REFIRE[d];
    return Math.max(12,Math.round(s.n<WAVE_FLOOR[d]?base*.4:s.n>WAVE_CEIL[d]?base*2.5:base));}
  function updateMobs(s){
    for(var i=s.mobs.length-1;i>=0;i--){
      var m=s.mobs[i];m.age++;
      if(m.elite){
        if(m.age>m.hold+90)m.y-=2.4;else if(m.y<m.stopY)m.y+=2.2;
        if(m.y>=m.stopY-1&&m.age<=m.hold+90&&m.every&&m.age>=m.first+60&&(m.age-m.first-60)%m.every===0){MOB_FIRE[m.fire](s,m);m.shots++;}
        if(m.y<-40&&m.age>m.hold){s.mobs.splice(i,1);continue;}
      }else{
        m.baseX+=m.vx;m.y+=m.vy;m.x=m.baseX+(m.sway?Math.sin(m.age*m.swayRate)*m.sway*22:0);
        // 화면 위쪽에 있을 때만 쏜다(영웅 코앞 기습 방지).
        if(m.next===undefined)m.next=m.first;
        if(m.y<300&&m.y>0&&m.age>=m.next){MOB_FIRE[m.fire](s,m);m.shots++;m.next=m.age+refireEvery(s,m.every);}
        else if(m.age>=m.next&&m.y<=0)m.next=m.age+1;
        if(m.y>H+30||m.x<-40||m.x>W+40){s.mobs.splice(i,1);continue;}
      }
    }
  }
  // 유도탄이 따라갈 가로 좌표: 보스전이면 보스, 아니면 가장 가까운 몹.
  function homingX(s){
    if(s.stage==='card')return s.boss.x;
    var best=null,bestD=1e9,p=s.player;
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i];if(m.y<0||m.y>p.y)continue;var d=Math.abs(m.x-p.x)+(p.y-m.y)*.3;if(d<bestD){bestD=d;best=m;}}
    return best?best.x:null;
  }
  function updateShots(s){
    var b=s.boss,p=s.player,i,k,target=homingX(s);
    // 곧은 주포 2발 + 적을 따라가는 유도탄 2발. 적 바로 아래에 서면 주포까지 맞아 훨씬 빨리 깬다.
    if(s.tick%SHOT_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=0;s.sx[s.sn]=p.x-7;s.sy[s.sn++]=p.y-18;s.shoming[s.sn]=0;s.sx[s.sn]=p.x+7;s.sy[s.sn++]=p.y-18;}
    if(s.tick%HOMING_EVERY===0&&s.sn+2<=SHOT_CAP){s.shoming[s.sn]=1;s.sx[s.sn]=p.x-20;s.sy[s.sn++]=p.y-4;s.shoming[s.sn]=1;s.sx[s.sn]=p.x+20;s.sy[s.sn++]=p.y-4;}
    for(i=s.sn-1;i>=0;i--){
      s.sy[i]-=SHOT_SPEED;
      if(s.shoming[i]&&target!==null){var steer=target-s.sx[i];s.sx[i]+=steer>HOMING_STEER?HOMING_STEER:steer<-HOMING_STEER?-HOMING_STEER:steer;}
      var hit=s.stage==='card'&&Math.abs(s.sx[i]-b.x)<30&&Math.abs(s.sy[i]-b.y)<34;
      if(hit){b.hp-=1;s.score+=2;if(s.tick-b.hitTick>=5){b.hitTick=s.tick;note(s,b.hp/b.maxHp<=.2?'bossHitLow':'bossHit');}}
      for(k=s.mobs.length-1;k>=0&&!hit;k--){
        var m=s.mobs[k];if(Math.abs(s.sx[i]-m.x)>m.r+4||Math.abs(s.sy[i]-m.y)>m.r+9)continue;
        hit=true;m.hp--;m.hitTick=s.tick;if(m.hp<=0)killMob(s,k);
      }
      if(hit||s.sy[i]<-20){var j=--s.sn;s.sx[i]=s.sx[j];s.sy[i]=s.sy[j];s.shoming[i]=s.shoming[j];}
    }
  }
  // 광선을 한 틱 진행하고, 켜져 있는 광선이 영웅에게 닿았는지 돌려준다.
  function updateLasers(s){
    var p=s.player,struck=false,fired=false,grazed=0,i;
    for(i=s.lasers.length-1;i>=0;i--){
      var l=s.lasers[i];l.age++;
      if(l.follow){l.x=s.boss.x;l.y=s.boss.y;}
      if(l.spin&&l.age>l.warn)l.angle+=l.spin*TICK;
      if(l.age>l.warn+l.active+BEAM_FADE){s.lasers.splice(i,1);continue;}
      var cos=Math.cos(l.angle),sin=Math.sin(l.angle);
      if(l.age===l.warn){
        fired=true;
        // 참격: 켜지는 순간 선을 따라 쌀알탄이 양옆으로 흩어진다.
        if(l.burst)for(var d=70;d<620;d+=Math.round(64/s.density)){var bx=l.x+cos*d,by=l.y+sin*d;if(bx<-10||bx>W+10||by>H+10)break;spawn(s,bx,by,l.angle+Math.PI/2,34,{color:l.color,size:RICE});spawn(s,bx,by,l.angle-Math.PI/2,34,{color:l.color,size:RICE});}
      }
      if(l.age<l.warn||l.age>=l.warn+l.active)continue;
      var px=p.x-l.x,py=p.y-l.y,along=px*cos+py*sin,dist=along<0?Math.sqrt(px*px+py*py):Math.abs(px*sin-py*cos);
      if(along>BEAM_LENGTH)continue;
      if(dist<l.width*.5*BEAM_HIT+p.r)struck=true;
      else if(!l.grazed&&dist<l.width*.5+GRAZE_MARGIN){l.grazed=true;grazed++;}
    }
    if(!s.lasers.length)s.warned=false;
    if(fired)note(s,'laserFire');
    if(grazed){s.graze+=grazed;s.gauge+=grazed*2;s.score+=grazed*40;note(s,'graze');}
    return struck;
  }
  /* ── 보스 고유 문양 광선(2026-11-14). 도형은 단위 원 안의 선(점 묶음)이고, 보스를 따라 돌며 줄었다 늘었다 한다.
   *    외곽 지그재그는 화면 양옆을 몇 초간 막아 피할 자리를 줄인다. 선분만 닿는다(무한 광선이 아니다). ── */
  function arcPts(cx,cy,r,a0,a1,n){var o=[];for(var k=0;k<=n;k++){var a=a0+(a1-a0)*k/n;o.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}return o;}
  function starPts(n,skip,r,rot){var o=[];for(var k=0;k<=n;k++){var a=-Math.PI/2+(rot||0)+TAU*((k*skip)%n)/n;o.push(Math.cos(a)*r,Math.sin(a)*r);}return o;}
  function polyPts(n,r,rot){return starPts(n,1,r,rot);}
  var GLYPHS={
    pentagram:[starPts(5,2,1),arcPts(0,0,1,0,TAU,30)],
    hexagram:[polyPts(3,1),polyPts(3,1,Math.PI)],
    octagram:[starPts(8,3,1),arcPts(0,0,.42,0,TAU,20)],
    triangle:[polyPts(3,1),polyPts(3,.5,Math.PI)],
    square:[polyPts(4,1,Math.PI/4),polyPts(4,.6)],
    ring:[arcPts(0,0,1,0,TAU,36),arcPts(0,0,.55,0,TAU,24)],
    eye:[arcPts(0,.9,1.35,-Math.PI*.78,-Math.PI*.22,14),arcPts(0,-.9,1.35,Math.PI*.22,Math.PI*.78,14),arcPts(0,0,.32,0,TAU,16)],
    wheel:[arcPts(0,0,1,0,TAU,36),[-1,0,1,0],[-.5,-.866,.5,.866],[-.5,.866,.5,-.866]],
    waterwheel:[arcPts(0,0,1,0,TAU,36),arcPts(0,0,.3,0,TAU,12)].concat([0,1,2,3,4,5,6,7].map(function(k){var a=TAU*k/8,c=Math.cos(a),sn=Math.sin(a),q=a+.32;return [c*.3,sn*.3,c,sn,Math.cos(q)*1.22,Math.sin(q)*1.22];})),
    gear:[(function(){var o=[];for(var k=0;k<=48;k++){var a=TAU*k/48,r=Math.floor(k/2)%2?1:.8;o.push(Math.cos(a)*r,Math.sin(a)*r);}return o;})(),arcPts(0,0,.35,0,TAU,16)],
    wave:[(function(){var o=[];for(var k=0;k<=40;k++){var x=-1+k/20;o.push(x,Math.sin(x*Math.PI*2)*.4);}return o;})(),(function(){var o=[];for(var k=0;k<=40;k++){var x=-1+k/20;o.push(x,-Math.sin(x*Math.PI*2)*.4);}return o;})()],
    wings:[arcPts(-1,0,1,-Math.PI*.45,Math.PI*.45,14),arcPts(1,0,1,Math.PI*.55,Math.PI*1.45,14),arcPts(-1.2,0,.7,-Math.PI*.4,Math.PI*.4,10),arcPts(1.2,0,.7,Math.PI*.6,Math.PI*1.4,10)],
    branch:[[0,1,0,-.2,-.6,-.8],[0,-.2,.6,-.8],[0,.3,-.7,-.1,-1,-.5],[0,.3,.7,-.1,1,-.5],[-.6,-.8,-.4,-1],[.6,-.8,.4,-1]],
    horns:[arcPts(-.9,.2,.9,-Math.PI*.95,-Math.PI*.2,12),arcPts(.9,.2,.9,-Math.PI*.8,-Math.PI*.05,12),arcPts(0,0,.35,0,TAU,14)],
    spiral:[(function(){var o=[];for(var k=0;k<=60;k++){var a=k/60*TAU*2.2,r=.12+.88*k/60;o.push(Math.cos(a)*r,Math.sin(a)*r);}return o;})(),arcPts(0,0,.1,0,TAU,8)],
    flame:[[0,-1,.35,-.35,.7,.2,.4,.7,0,1,-.4,.7,-.7,.2,-.35,-.35,0,-1],[0,-.3,.25,.25,0,.6,-.25,.25,0,-.3]],
    gate:[[-.8,1,-.8,-.3],arcPts(0,-.3,.8,Math.PI,TAU,14),[.8,-.3,.8,1],arcPts(0,0,.22,0,TAU,12),[-1,1,1,1]],
    hourglass:[[-.7,-1,.7,-1,-.7,1,.7,1,-.7,-1],[-.9,-1.15,.9,-1.15],[-.9,1.15,.9,1.15]],
    honeycomb:[polyPts(6,1,Math.PI/6),polyPts(6,.5,Math.PI/6),[0,-.5,0,-1],[0,.5,0,1]],
    rose:[(function(){var o=[];for(var k=0;k<=72;k++){var a=TAU*k/72,r=Math.cos(4*a);o.push(Math.cos(a)*r,Math.sin(a)*r);}return o;})(),arcPts(0,0,.2,0,TAU,12)],
    coin:[arcPts(0,0,1,0,TAU,36),polyPts(4,.45,Math.PI/4)],
    crown:[[-1,.6,-1,-.6,-.5,0,0,-1,.5,0,1,-.6,1,.6,-1,.6],[-.7,.85,.7,.85]],
    key:[arcPts(-.55,0,.4,0,TAU,16),[-.15,0,1,0],[.6,0,.6,.35],[.85,0,.85,.3]],
    circuit:[polyPts(4,1,Math.PI/4),[-.7,-.3,-.2,-.3,-.2,.3,.3,.3],[.7,-.7,.7,0,.2,0],[-.7,.7,0,.7,0,.3]],
    thorns:[(function(){var o=[];for(var k=0;k<=32;k++){var a=TAU*k/32,r=k%2?1:.62;o.push(Math.cos(a)*r,Math.sin(a)*r);}return o;})(),arcPts(0,0,.4,0,TAU,18)],
    ouroboros:[arcPts(0,0,1,.35,TAU-.05,34),arcPts(0,0,.8,.35,TAU-.05,30),[.94,.34,1.08,.12,.75,.25]]
  };
  // 보스마다: glyph 문양, color 색, arms 이어진 탄 줄기 수, edge 외곽 지그재그(1이면 씀), spin 도는 방향, reach 문양 최대 반지름
  var SIGNATURES={
    p1_tree:['branch',GREEN,3,0],violet:['hexagram',PURPLE,4,0],p1_horn:['horns',RED,3,1],p1_chaser:['spiral',RED,2,1],p1_comrade:['eye',PURPLE,2,0],p1_gate:['gate',YELLOW,4,1],
    balrog:['flame',RED,5,1],mask:['eye',WHITE,3,0],p1_staff:['triangle',CYAN,2,0],p1_seraph:['wings',WHITE,6,0],lucifer:['pentagram',RED,6,1],
    p2_demons:['octagram',PURPLE,6,1],p2_belphegor:['hourglass',GREEN,3,1],p2_leviathan:['wave',CYAN,4,1],p2_beelzebub:['honeycomb',YELLOW,5,0],asmodeus:['rose',PURPLE,3,1],
    p2_greed:['coin',YELLOW,2,1],p2_mammon:['crown',YELLOW,6,1],p2_wrath:['thorns',RED,4,1],pride:['crown',WHITE,4,0],p2_chairman:['key',YELLOW,3,0],p2_core:['circuit',CYAN,3,0],
    p3_legion:['gear',WHITE,4,1],p3_rampart:['square',CYAN,5,1],p3_defense:['triangle',YELLOW,3,1],controller:['circuit',GREEN,5,1],p3_body:['gear',RED,3,0],p3_gate:['gate',CYAN,2,1],
    goblin:['thorns',GREEN,4,0],p4_knight:['wings',RED,4,1],insomnia:['eye',CYAN,4,1],p5_cult:['ouroboros',PURPLE,5,0],p5_archon:['hexagram',YELLOW,3,1],p5_common:['square',WHITE,2,0],
    p5_upper:['octagram',CYAN,4,0],p5_grand:['octagram',YELLOW,6,0],p5_furnace:['flame',YELLOW,4,1],p5_neuron:['circuit',PURPLE,4,0],p5_keeper:['hourglass',WHITE,2,1],p5_rings:['wheel',CYAN,6,1],
    arbelia:['rose',WHITE,5,0],siren:['wave',PURPLE,3,0],p6_demons:['pentagram',PURPLE,3,1],chief:['horns',PURPLE,6,1],p6_bind:['ouroboros',RED,4,1],p7_car:['wheel',WHITE,3,0],
    p7_shadow:['spiral',PURPLE,4,0],p7_alarm:['triangle',RED,6,1],executor:['key',CYAN,5,1],p8_chip:['circuit',YELLOW,2,1],p8_collective:['honeycomb',CYAN,6,0],p8_lauren:['wings',CYAN,2,1],
    cultist:['ouroboros',WHITE,6,1],p8_ion:['spiral',CYAN,3,1],rian:['rose',RED,4,0]
  };
  // extra: 보스 셋 중 하나는 직선 레이저 난사를 더한다(물레방아·톱니 바퀴는 11-14에 뺐다).
  var EXTRAS=['','spray',''];
  Object.keys(SIGNATURES).forEach(function(k,i){var v=SIGNATURES[k];SIGNATURES[k]={glyph:v[0],color:v[1],arms:v[2],edge:v[3],spin:i%2?-1:1,reach:118+(i*29)%50,extra:EXTRAS[i%3]};});
  function signatureOf(actor){return SIGNATURES[actor]||null;}
  // 도형 광선 하나의 선분들 [x1,y1,x2,y2,...]
  function figureSegments(f){
    var out=[],i,k;
    if(f.kind==='zigzag'){for(i=0;i+3<f.points.length;i+=2)out.push([f.points[i],f.points[i+1],f.points[i+2],f.points[i+3]]);return out;}
    var lines=GLYPHS[f.glyph]||[],c=Math.cos(f.turn),sn=Math.sin(f.turn),r=f.r;
    for(i=0;i<lines.length;i++){var L=lines[i];for(k=0;k+3<L.length;k+=2){
      var x1=L[k]*r,y1=L[k+1]*r,x2=L[k+2]*r,y2=L[k+3]*r;out.push([f.cx+x1*c-y1*sn,f.cy+x1*sn+y1*c,f.cx+x2*c-y2*sn,f.cy+x2*sn+y2*c]);}}
    return out;
  }
  /* 보스 둘레에 붙던 문양 광선(summonGlyph)과 도는 바퀴(summonWheels)는 11-14 요청으로 뺐다: 보스 옆에 '3'처럼 보이는 붉은 호가 어색했다.
     그 자리는 그림 쪽 룬 결계(drawRuneBarrier)가 맡는다. 결계는 장식이라 맞지 않는다. */
  /* 직선 레이저 난사: 영웅 쪽 부채꼴로 가는 레이저 여러 줄이 한꺼번에 예고선을 긋고 짧게 켜진다. 줄 사이는 늘 벌어져 있다. */
  function spray(s,sig,t){
    var b=s.boss,n=pick(s,5,6,7),spread=1.7,center=aim(s,b.x,b.y)+(rand(s)-.5)*.5,k;
    for(k=0;k<n;k++)beam(s,b.x,b.y,center+(k/(n-1)-.5)*spread,{width:9,warn:42,active:22,color:sig.color});
    note(s,'figure');
  }
  function summonZigzag(s,sig,side){
    if(s.figures.length>=6)return;
    var depth=40,step=46,pts=[],x0=side<0?0:W,k=0;
    for(var y=70;y<=H+20;y+=step,k++)pts.push(x0-side*(k%2?depth:4),y);
    s.figures.push({kind:'zigzag',points:pts,width:8*s.rules.beam,warn:Math.round(70*s.rules.warn),active:200,age:0,color:sig.color,r:0,turn:0,grazed:false});
    note(s,'figure');
  }
  // 이어진 탄 줄기: 보스 둘레의 줄기 끝에서 쌀알탄을 촘촘히 뿜는다. 줄기 방향이 사인파로 흔들려 탄 줄이 생물처럼 휜다.
  function strands(s,sig,t){
    var b=s.boss,arms=sig.arms,gap=Math.max(5,Math.round(9/s.density*1.6));if(t%gap||s.n>CAP*.55)return; // 이미 탄이 많은 패턴에서는 탄줄을 쉬어 상한 여유를 지킨다
    for(var k=0;k<arms;k++){var base=Math.PI/2+(k-(arms-1)/2)*(1.9/arms),sway=Math.sin(t*.021+k*1.7)*.62*(k%2?1:-1);
      spawn(s,b.x+Math.cos(base)*24,b.y+Math.sin(base)*24,base+sway,52,{color:sig.color,size:RICE,life:1400});}
  }
  // 보스 고유 연출: 이름 붙은 패턴(spell) 동안 기존 패턴 위에 겹친다.
  function signature(s,t){
    var sig=signatureOf(s.boss.actor);if(!sig)return;
    if(sig.edge&&t%600===260){summonZigzag(s,sig,-1);summonZigzag(s,sig,1);}
    if(t%300<200)strands(s,sig,t);
    if(sig.extra==='spray'&&t%420>=120&&t%420<=330&&t%70===50)spray(s,sig,t);
  }
  function updateFigures(s){
    var p=s.player,struck=false,grazed=0;
    for(var i=s.figures.length-1;i>=0;i--){
      var f=s.figures[i];f.age++;
      if(f.age>f.warn+f.active+BEAM_FADE){s.figures.splice(i,1);continue;}
      if(f.orbit&&s.boss.present){var o=f.orbit,R=o.near+(o.far-o.near)*(.5-.5*Math.cos(TAU*f.age/o.period)),A=o.phase+o.speed*f.age*TICK;f.cx=s.boss.x+Math.cos(A)*R;f.cy=s.boss.y+Math.sin(A)*R;}
      if(f.kind==='glyph'){if(f.follow&&s.boss.present){f.cx=s.boss.x;f.cy=s.boss.y;}f.turn+=f.spin*TICK*(f.age<f.warn?.35:1);f.r=f.r0+(f.r1-f.r0)*(.5-.5*Math.cos(TAU*f.age/f.period));}
      if(f.age<f.warn||f.age>=f.warn+f.active)continue;
      var segs=figureSegments(f),reach=f.width*.5*BEAM_HIT+p.r,near=1e9;
      for(var k=0;k<segs.length;k++){var g=segs[k],dx=g[2]-g[0],dy=g[3]-g[1],L=dx*dx+dy*dy||1,u=((p.x-g[0])*dx+(p.y-g[1])*dy)/L;u=u<0?0:u>1?1:u;
        var d=Math.sqrt(Math.pow(p.x-g[0]-u*dx,2)+Math.pow(p.y-g[1]-u*dy,2));if(d<near)near=d;}
      if(near<reach)struck=true;else if(!f.grazed&&near<f.width*.5+GRAZE_MARGIN){f.grazed=true;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.gauge+=grazed*2;s.score+=grazed*40;note(s,'graze');}
    return struck;
  }
  function updateBullets(s){
    var p=s.player,px=p.x,py=p.y,struck=false,grazed=0,hitScale=s.rules.hitScale,i,k;
    for(i=s.n-1;i>=0;i--){
      var age=++s.bage[i];
      if(s.bat[i]&&age===s.bat[i]){
        var mode=s.bmode[i];
        if(mode===MODE_SPLIT||mode===MODE_BRANCH){
          var sx=s.bx[i],sy=s.by[i],color=s.bcolor[i],parts=Math.round(s.barg[i]),speed=s.bs2[i]/s.rules.speed,heading=s.ba[i],gen=s.bgen[i],size=s.bsize[i],at=s.bat[i];
          removeBullet(s,i);
          if(mode===MODE_SPLIT)ring(s,sx,sy,parts,speed,heading,{color:color,size:0});
          // 가지치기: 진행 방향을 중심으로 부채꼴로 갈라지고, 세대가 남아 있으면 가지가 다시 갈라진다.
          else for(k=0;k<parts;k++)spawn(s,sx,sy,heading+(k-(parts-1)/2)*.5,speed,gen>1?{color:color,size:Math.max(0,size-1),at:at,mode:MODE_BRANCH,arg:parts,gen:gen-1,speed2:speed}:{color:color,size:0});
          note(s,'pop');continue;
        }
        if(mode===MODE_REAIM)s.ba[i]=Math.atan2(py-s.by[i],px-s.bx[i])+s.barg[i];else if(mode===MODE_TURN)s.ba[i]+=s.barg[i];
        s.bs[i]=s.bs2[i];s.bacc[i]=0;
      }
      if(s.bturn[i])s.ba[i]+=s.bturn[i]*TICK;
      if(s.bacc[i]){var v=s.bs[i]+s.bacc[i]*TICK;s.bs[i]=v<s.bmin[i]?s.bmin[i]:v>s.bmax[i]?s.bmax[i]:v;}
      var ox=s.bx[i],oy=s.by[i],x=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK,y=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK;
      // 벽에서 되돌아오는 탄: 좌우 벽과 위 벽에서 한 번(남은 횟수만큼) 튕긴다. 아래로는 튕기지 않는다(영웅 뒤에서 오지 않게).
      if(s.bbounce[i]){var a0=s.ba[i];
        if((x<0&&Math.cos(a0)<0)||(x>W&&Math.cos(a0)>0)){s.ba[i]=Math.PI-a0;s.bx[i]=x=x<0?0:W;s.bbounce[i]--;}
        else if(y<0&&Math.sin(a0)<0&&age>BLOOM_TICKS){s.ba[i]=-a0;s.by[i]=y=0;s.bbounce[i]--;}}
      if(x<-36||x>W+36||y<-48||y>H+36){removeBullet(s,i);continue;}
      if(age>=s.blife[i]){
        // 화면 한가운데에서 수명이 다해 사라지지 않는다. 그대로 끝까지 날아가고(멈춘 탄은 다시 움직인다), 옆 벽에서 한 번 되돌아온다.
        if(x<-4||x>W+4||y<-4||y>H+4){removeBullet(s,i);continue;}
        s.blife[i]=65535;s.bacc[i]=0;s.bturn[i]=0;if(s.bs[i]<EXPIRE_SPEED)s.bs[i]=EXPIRE_SPEED;if(s.bsize[i]!==SHAPE_PROP&&!s.bbounce[i])s.bbounce[i]=1;
      }
      if(age<BLOOM_TICKS)continue; // 갓 피어난 탄은 아직 닿지 않는다
      var dx=x-px,dy=y-py,radius=bulletRadius(s,i),d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN;
      // 빠른 탄(한 틱에 4px 넘게 움직이는 탄)은 이전 위치→새 위치 선분에서 영웅에 가장 가까운 점으로 잰다: 한 틱 사이에 영웅을 건너뛰어도 맞는다.
      var mx=x-ox,my=y-oy,m2=mx*mx+my*my;
      if(m2>16){var u=((px-ox)*mx+(py-oy)*my)/m2;u=u<0?0:u>1?1:u;dx=ox+mx*u-px;dy=oy+my*u-py;d2=dx*dx+dy*dy;}
      if(d2>reach*reach)continue;
      var hitReach=radius*hitScale+p.r;
      if(d2<hitReach*hitReach)struck=true;
      else if(!s.bgrazed[i]){s.bgrazed[i]=1;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.gauge+=grazed;s.score+=grazed*20;note(s,'graze');}
    return struck;
  }
  /* 장면별 탄(사용자 요청 11-14): 늪(03)에서는 물결이 먼저 일고(예고) 그 자리에서 초록 악마 손이 천천히 솟아오른다.
     묘지(05·43)에서는 해골이 위에서 영웅 쪽으로 날아온다. 웨이브와 보스전 모두에 깔린다. */
  var THEMED={'03':'hands','05':'skulls','43':'skulls'};
  function themed(s){
    var kind=THEMED[STAGES[s.stageIndex].scene],t=s.stageTick,i;if(!kind||(s.stage!=='wave'&&s.stage!=='card'))return;
    if(kind==='hands'){
      if(t%pick(s,110,95,80)===0&&s.ripples.length<6){var rx=24+rand(s)*(W-48);if(Math.abs(rx-s.player.x)<HAND_AWAY)rx=s.player.x+(s.player.x<W/2?1:-1)*(HAND_AWAY+rand(s)*60);s.ripples.push({x:rx,age:0});}
      // 영웅 바로 밑(HAND_AWAY 안)에서는 솟지 않는다: 물결 자리를 영웅에게서 떨어뜨리고, 그사이 영웅이 그 위로 오면 손은 가라앉는다(헛물결).
      for(i=s.ripples.length-1;i>=0;i--){var r=s.ripples[i];if(++r.age>=HAND_WARN){if(Math.abs(r.x-s.player.x)>=HAND_AWAY)spawn(s,r.x,H+8,-Math.PI/2,pick(s,30,34,42),{size:SHAPE_PROP,color:P['demon-hand'],life:1400});s.ripples.splice(i,1);}}
    }else if(t%pick(s,100,85,70)===40){var x=30+rand(s)*(W-60);spawn(s,x,-10,aim(s,x,-10),pick(s,44,50,62),{size:SHAPE_PROP,color:P.skull});}
  }
  /* 한 틱(1/60초) 진행. input: {dx,dy,focus,bomb} — dx,dy는 이번 틱에 움직일 픽셀, focus는 저속 이동, bomb은 이번 틱에 폭탄 사용. */
  function step(s,input){
    if(s.stage==='won'||s.stage==='lost'){s.stageTick++;return s;}
    s.tick++;s.stageTick++;movePlayer(s,input);moveBoss(s);
    if(input&&input.bomb)useBomb(s);
    var seg=segment(s),b=s.boss;
    if(s.stage==='break'){if(s.stageTick>=BREAK_TICKS){if(seg&&seg.kind==='card'&&b.present)beginCard(s);else advance(s);}}
    else if(s.stage==='intro'){
      if(!b.present)enter(s,seg.actor);
      else if(!b.leaving&&b.actor===seg.actor&&s.stageTick>=INTRO_TICKS)beginCard(s);
    }
    else if(s.stage==='wave'){
      var w=s.segTick++;if(w<seg.duration)seg.script(s,w);
      // 대본이 끝나고 몹이 다 사라지면 다음으로. 너무 오래 남은 몹은 물러난다.
      if(w>=seg.duration&&(!s.mobs.length||w>=seg.duration+WAVE_GRACE)){s.mobs.length=0;s.score+=cancelAll(s)*10;note(s,'waveClear');advance(s);}
    }
    else if(s.stage==='card'){
      var t=s.segTick++;
      if(t>=FIRE_DELAY){seg.fire(s,t-FIRE_DELAY);if(seg.spell)signature(s,t-FIRE_DELAY);} // 패턴 이름이 뜨는 동안은 쏘지 않는다. 이름 붙은 패턴에는 보스 고유 연출이 겹친다.
      var left=seg.time-s.segTick*TICK;
      if(seg.spell&&left<=10&&left>0&&s.segTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    themed(s);updateMobs(s);updateShots(s);
    if(s.stage==='card'&&b.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&s.segTick*TICK>=segment(s).time)endCard(s,false);
    var p=s.player,byBeam=updateLasers(s),byFigure=updateFigures(s),byBullet=updateBullets(s);
    updateItems(s);
    if((byBeam||byFigure||byBullet)&&s.tick>=p.invulnerableUntil&&s.stage!=='won'){
      p.hp--;s.hits++;s.spellClean=false;p.invulnerableUntil=s.tick+INVULN_TICKS;cancelAll(s);note(s,'hurt');
      // 목숨이 남았으면 폭탄이 기본 개수까지 다시 찬다.
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}else if(s.bombs<s.rules.bombs)s.bombs=s.rules.bombs;
    }
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function timeLeft(s){var seg=segment(s);return s.stage==='card'?Math.max(0,seg.time-s.segTick*TICK):0;}
  /* ── 진행 기록(저장용, 순수 함수). cleared 깬 스테이지 번호 · stars 스테이지별 별(1~3) · best 최고 점수 · rewards 얻은 기념물 ── */
  var Progress=(function(){
    function fresh(){return {version:43,cleared:[],stars:{},best:{},rewards:[],difficulty:'normal'};}
    function whole(v){return typeof v==='number'&&isFinite(v)&&Math.floor(v)===v;}
    function unlocked(p){var n=0;while(n<STAGES.length-1&&p.cleared.indexOf(n)>=0)n++;return n;}
    function canPlay(p,index){return whole(index)&&index>=0&&index<=unlocked(p);}
    function sanitize(raw){
      var p=fresh(),i;if(!raw||typeof raw!=='object'||Array.isArray(raw))return p;
      if(Array.isArray(raw.cleared))for(i=0;i<raw.cleared.length;i++){var c=raw.cleared[i];if(whole(c)&&c>=0&&c<STAGES.length&&p.cleared.indexOf(c)<0)p.cleared.push(c);}
      p.cleared.sort(function(a,b){return a-b;});
      // 앞 스테이지를 깨지 않고는 뒤 스테이지 기록이 있을 수 없다.
      var open=unlocked(p);p.cleared=p.cleared.filter(function(c){return c<=open;});
      p.cleared.forEach(function(c){
        var st=raw.stars&&typeof raw.stars==='object'?Number(raw.stars[c]):NaN,b=raw.best&&typeof raw.best==='object'?Number(raw.best[c]):NaN;
        p.stars[c]=whole(st)&&st>=1&&st<=3?st:1;p.best[c]=isFinite(b)&&b>=0?Math.floor(b):0;
        p.rewards.push(STAGES[c].reward.key);
      });
      if(DIFFICULTY[raw.difficulty])p.difficulty=raw.difficulty;
      return p;
    }
    function record(p,result,difficulty){
      p=sanitize(p);if(!result||!canPlay(p,result.stage))return p;
      var c=result.stage,stars=whole(result.stars)&&result.stars>=1&&result.stars<=3?result.stars:1,score=isFinite(result.score)&&result.score>0?Math.floor(result.score):0;
      if(p.cleared.indexOf(c)<0){p.cleared.push(c);p.cleared.sort(function(a,b){return a-b;});}
      p.stars[c]=Math.max(p.stars[c]||0,stars);p.best[c]=Math.max(p.best[c]||0,score);if(DIFFICULTY[difficulty])p.difficulty=difficulty;
      p.rewards=p.cleared.map(function(i){return STAGES[i].reward.key;});
      return p;
    }
    function resume(p){for(var i=0;i<STAGES.length;i++)if(p.cleared.indexOf(i)<0)return i;return 0;}
    function totalStars(p){var n=0;Object.keys(p.stars).forEach(function(k){n+=p.stars[k];});return n;}
    return {fresh:fresh,sanitize:sanitize,record:record,unlocked:unlocked,canPlay:canPlay,resume:resume,totalStars:totalStars};
  })();
  var api={revision:43,Progress:Progress,SCENES:SCENES,WIDTH:W,HEIGHT:H,CAP:CAP,COMPACT_CAP:COMPACT_CAP,LASER_CAP:LASER_CAP,MOB_CAP:MOB_CAP,ITEM_CAP:ITEM_CAP,GOLDEN_ANGLE:GOLDEN_ANGLE,GAUGE_FULL:GAUGE_FULL,AUTO_COLLECT_Y:AUTO_COLLECT_Y,
    SEGMENTS:SEGMENTS,EMITTER_KINDS:EMITTER_KINDS,emit:emit,refireEvery:refireEvery,MODE_TURN:MODE_TURN,MODE_SPLIT:MODE_SPLIT,STAGES:STAGES,ACTORS:ACTORS,MOBS:MOBS,PROPS:PROPS,PALETTE:PALETTE,CARD_TOTAL:CARD_TOTAL,DIFFICULTY:DIFFICULTY,SIZE_RADIUS:SIZE_RADIUS,SHAPE_PROP:SHAPE_PROP,
    BLOOM_TICKS:BLOOM_TICKS,HAND_WARN:HAND_WARN,SIGNATURES:SIGNATURES,GLYPHS:GLYPHS,figureSegments:figureSegments,BEAM_FADE:BEAM_FADE,BEAM_HIT:BEAM_HIT,Shapes:Shapes,createRun:createRun,step:step,timeLeft:timeLeft,bulletRadius:bulletRadius,dropItem:dropItem};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);