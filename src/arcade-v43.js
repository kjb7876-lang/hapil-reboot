/* 합일 v43 · 원큐 여정(ARCADE 탄막) — 전투 시뮬레이션.
 * 60Hz 고정 틱·시드 난수로 결정적으로 돈다. DOM을 쓰지 않는다. 화면·소리·저장은 arcade-app-v43.js가 맡는다.
 * 스테이지는 원작(StoryWorld) 56장면(쉼터 제외)을 순서대로 하나씩 맡는다. 스테이지 내용(테마·잡몹·인물·패턴·보상)은
 * 부별 파일 src/arcade-parts-v43/p1.js … p8.js 에 있고, 이 파일은 그것을 읽어 구간(SEGMENTS)으로 잇는다.
 *   길 스테이지(road): 잡몹 구간 여럿 → 길목지기(일반 공격 + 이름 붙은 패턴)
 *   보스 스테이지(boss): 잡몹 → 중간 보스 → 잡몹 → 보스(일반 공격과 이름 붙은 패턴이 번갈아)
 * 글 대신 스테이지 이름 한 줄, 패턴 이름 한 줄과 탄막 무늬로만 사연을 전한다. */
(function(root){
  'use strict';
  var HEROES=typeof module==='object'&&module.exports&&typeof require==='function'
    ?require('./arcade-heroes-v43.js'):root.HapilArcadeHeroes;
  var BOSS_INTROS=typeof module==='object'&&module.exports&&typeof require==='function'
    ?require('./arcade-boss-intros-v43.js'):root.HapilArcadeBossIntros;
  var BOSS_RHYTHM=typeof module==='object'&&module.exports&&typeof require==='function'
    ?require('./arcade-boss-rhythm-v43.js'):root.HapilArcadeBossRhythm;
  var BOSS_PHASES=typeof module==='object'&&module.exports&&typeof require==='function'
    ?require('./arcade-boss-phases-v43.js'):root.HapilArcadePhases;
  var rhythmContext=null;
  function heroProfile(s){return HEROES?HEROES.get(typeof s==='string'?s:s&&s.hero):null;}
  function isCinematicBoss(actor,mid){var intros=BOSS_INTROS||root.HapilArcadeBossIntros;return !mid||!!(intros&&intros.isSinBoss(actor));}
  // 11-17 사용자: 컷씬 화면과 본게임을 오가지 않고 모든 보스·중간보스가 같은 입장 연출(수묵 컷인 → 등장 → 대사 → 전투). 앱이 createRun({entranceAll:true})로 켠다(엔진 단독 시뮬은 기존 그대로).
  function graceOf(s){if(!(s&&s.entranceAll))return BOSS_ENTRANCE_GRACE;var g=segment(s);return g&&g.mid?BOSS_ENTRANCE_MID:BOSS_ENTRANCE_SPEECH;} // 사용자 11-20: 중간보스는 컷인만(대사 없음) → 등장 뒤 짧게만 기다린다
  function hasEntrance(s,g){return !!(s&&s.entranceAll)||isCinematicBoss(g.actor,g.mid);}
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
    // 11-17 사용자 기준: 노멀과 헬은 탄 수·속도·공격 모양·판정이 같다. 노멀에는 피격점 접촉 시 자동 방어, 헬에는 수동 필살만 있다.
    gentle:{density:1.65,speed:.56,hp:5,mapHeal:0,partHeal:-1,bombs:3,radius:1,hitScale:.3,warn:1.6,beam:.72,label:'여유'},
    normal:{density:2.6,speed:.9,hp:3,mapHeal:0,partHeal:-1,bombs:2,radius:2.4,hitScale:.5,warn:1,beam:1,label:'기본'},
    hell:{density:2.6,speed:.9,hp:2,mapHeal:0,partHeal:-1,bombs:1,radius:2.4,hitScale:.5,warn:1,beam:1,label:'지옥'}
  };
  /* 여유 모드만 첫 스테이지 탄 수 70%에서 마지막 110%까지 오른다. 노멀·헬은 같은 공격을 유지한다. */
  var SOFT={gentle:{speed:.87,density:.8},normal:{speed:.88,density:.8}},SCATTER_ANGLE=.16,SCATTER_SPEED=.22,SCATTER_POS=7;
  var CURVE_START=.7,CURVE_END=1.1,PACE_START=1,PACE_END=1; // 속도는 그대로(탄이 화면 아래까지 닿는 시간을 지킨다), 탄 수만 곡선
  function applyCurve(s){var base=DIFFICULTY[s.difficulty],u=STAGES.length>1?Math.max(0,Math.min(1,s.stageIndex/(STAGES.length-1))):0,gentle=s.difficulty==='gentle';
    var d=gentle?CURVE_START+(CURVE_END-CURVE_START)*u:1,v=gentle?PACE_START+(PACE_END-PACE_START)*u:1;
    var soft=s.entranceAll&&s.difficulty!=='hell'?SOFT[s.difficulty]:null; // 사용자 11-18: 이지·노멀만 탄 속도를 낮추고 탄 수를 10% 줄인다(헬은 그대로)
    s.rules.speed=base.speed*v*(soft?soft.speed:1)*(s.entranceAll?LIVE_FAST:1);s.density=base.density*d*(soft?soft.density:1)*(s.compact?COMPACT_DENSITY:1)*(s.entranceAll?LIVE_TRIM:1);
    var L=s.entranceAll&&LIVE_TABLE[s.difficulty];if(L){s.rules.speed=L.speed;s.density=(L.density+(L.end===undefined?0:(L.end-L.density)*u))/(s.compact?1:COMPACT_DENSITY);s.rules.radius=L.radius;s.rules.hitScale=L.hitScale;if(s.player)s.player.r=L.radius;}
    var tune=s.entranceAll&&HERO_TUNE[isSeohaHero(s)?'seoha':s.hero];if(tune){s.rules.speed*=tune.speed||1;s.density*=tune.density||1;}}
  /* 영웅별 난이도 보정(사용자 11-20 "서하로 플레이할때는 적 탄환패턴 많이 나와도됨 탄환난이도 조금더 높여도 될듯"): 실제 게임(entranceAll)에서 기준표(LIVE_TABLE) 위에 곱한다. 서하는 시간을 늦추는 능력이 있으니 탄 수 +20%, 탄속 +6% */
  var HERO_TUNE={seoha:{density:1.2,speed:1.06},memory:{laser:1.5,laserEvery:{gentle:300,normal:170,hell:200}}};
  /* 영웅별 적 특성화(사용자 11-20 "서하-탄환 많이, 기억사수-레이져많이 적이 특성화해서 스킬사용하게"):
   *  서하 → 위 HERO_TUNE.seoha 가 탄 밀도·속도를 올린다. 기억사수 → 보스전에서 광선을 더 자주 쓴다.
   *  heroLaserBias(s) 는 다른 광선 페이즈(리듬 광선 등)가 빈도 배율로 그대로 가져다 쓰라고 둔 값이다(기억사수 >1, 그 밖 1).
   *  추가 광선은 한 줄만 세우고 composeLasers 가 사다리·스위퍼로 묶는다 — 이미 켜진 광선·문양이 있으면 쉬므로 겹쳐 막히지 않는다. */
  function heroLaserBias(s){var t=s&&s.entranceAll&&HERO_TUNE[s.hero];return t&&t.laser||1;}
  // 종류 칸(이지1·노멀2·헬3)은 지킨다. 반사탄만 칸을 차지하고 있으면 광선이 그 칸을 넘겨받는다(yieldMirror 가 반사를 멈춤).
  var HERO_LASER_LIFE=220; // 사다리·스위퍼가 예고부터 꺼질 때까지 걸리는 틱(넉넉히). 그 안에 특수 페이즈가 열리면 쏘지 않는다(테트리스·문양과 겹치지 않게)
  function spSoon(s,ahead){var st=s.segTick;s.segTick=st+ahead;var w=spWindow(s);s.segTick=st;return !!w;}
  function heroLaser(s){
    var t=s.entranceAll&&HERO_TUNE[s.hero],every=t&&t.laserEvery&&(t.laserEvery[s.difficulty]||250);
    if(!every||s.stage!=='card'||!s.boss.present||s.calm||s.cardEnding||s.cardDown||s.lasers.length||s.figures.length||layersBut(s,'mirror')>=layerCap(s)||spQuiet(s)||spSoon(s,HERO_LASER_LIFE)){s.heroLaserT=Math.min(s.heroLaserT||0,every?every-40:0);return;}
    if((s.heroLaserT=(s.heroLaserT||0)+1)<every)return;
    s.heroLaserT=0;s.heroLaserN=(s.heroLaserN||0)+1;
    var a=ACTORS[s.boss.actor],c=a&&a.c2!==WHITE&&a.c2!==RED?a.c2:CYAN;
    if(s.heroLaserN%2)column(s,s.player.x<W/2?W-24:24,{width:BEAM_MIN,warn:66,active:60,color:c});
    else row(s,H-60,{width:BEAM_MIN,warn:66,active:60,color:c});
  }
  /* 실제 게임 난이도 기준표(사용자 11-19 "제안대로 계단 고르게"): 그동안 겹겹이 곱해지던 배율(표·이지노멀 완화·탄 수 -25%·-20%·탄속 +20%)을 최종값 한 줄로 합쳤다.
     탄 수는 휴대폰 기준값(PC는 ÷COMPACT_DENSITY), 이지는 첫 스테이지 density에서 마지막 end까지 오른다. 앞으로 난이도 조정은 이 표의 숫자만 고친다. 목숨·필살은 DIFFICULTY 표 그대로 */
  var LIVE_TABLE={
    // 사용자 11-19 21:22 "탄환속도와크기 전체적으로 30프로 늘려주고 그만큼 탄환 30프로 줄여줘": 탄속 ×1.3·탄 수 ×0.7(크기는 LIVE_GROW ×1.3)
    gentle:{speed:.91,density:.385,end:.525,radius:1.6,hitScale:.4},
    normal:{speed:1.17,density:.595,radius:2.0,hitScale:.5},
    hell:{speed:1.365,density:.77,radius:2.4,hitScale:.5}
  };
  var LIVE_TRIM=.75*.8,LIVE_GROW=1.15*1.3,LIVE_FAST=1.2; // 11-19 13:14 "탄환속도 20프로 빨라지게하고 대신 탄환 숫자20프로 줄여줘": 25% 감소에서 20% 더(×.8), 속도 ×1.2
  // 사용자 11-19 "모든모드 탄환숫자25프로정도 감소"·"전체적으로 탄환크기 15프로정도 증가": 실제 게임(entranceAll)의 탄 수 25%↓, 탄 크기 15%↑
  // 휴대폰 모드: 탄 수를 줄이고 그만큼 탄을 크게 그린다(판정도 같이 커진다).
  var COMPACT_DENSITY=.72,COMPACT_SIZE=1.25;
  var DRIFT_CAP=600,MOB_DROP_EVERY=3,ELITE_DROPS=3,CARD_DROPS=4,PLAIN_DROPS=2; // 하트(점수 아이템)는 적게(사용자 11-14)
  var BOMB_PULSES=7,BOMB_PULSE_START=30,BOMB_PULSE_EVERY=11,DISTORT_CHANCE=[0,.07,.12,.17,.22,.27,.32,.37],DISTORT_TICKS=30,HAND_WARN=50,HAND_AWAY=64,EXPIRE_SPEED=60,GRAZE_MARGIN=13,BLOOM_TICKS=12,INVULN_TICKS=150,BOMB_TICKS=150,INTRO_TICKS=110,BREAK_TICKS=80,FIRE_DELAY=40,WAVE_GRACE=360;
  var SHOT_SPEED=15,SHOT_EVERY=5,HOMING_EVERY=8,HOMING_STEER=7,SHOT_CAP=160,MAX_MOVE=12,FOCUS_MOVE=2;
  var BEAM_HIT=.62,BEAM_FADE=14,BEAM_LENGTH=1000;
  /* ── 기억사수 성장(사용자 11-16 "패시브공격 성장형+폭탄필살기도 성장형 … 각 7단계", "플레이어 성장따라 영웅공격가속 및 영웅주변적탄환 속도느려짐 … 7단계로").
   *  공격 단계(power 1~7): 적을 쓰러뜨려 얻는 기억(exp)으로 오른다. 잡몹 1 · 중간 몹 5 · 일반 패턴 격파 10 · 이름 붙은 패턴 격파 16. 맞으면 한 단계 내려간다.
   *    단계마다 주포·유도탄 수, 연사 간격(가속), 5단계부터 기억 번개(가장 가까운 적을 곧장 치는 번개), 영웅 둘레 적탄 둔화가 커진다.
   *  필살기 단계(bombLevel 1~7): 충전 게이지가 가득 찰 때마다(폭탄 하트·스치기) 쌓인 횟수로 오른다. 맞아도 내려가지 않는다. 단계마다 피해·연출이 커진다.
   *  시계 상태(clock): 'slow' 저속 이동 중(둔화가 1.35배) · 'haste' 단계가 오르거나 필살기를 쓴 뒤 3초(연사 한 틱 빠름) · 'normal'.
   *  중간 스테이지에서 시작하면 그 스테이지까지 왔을 만큼의 단계에서 시작한다(최대 5). ── */
  var POWER_EXP=[0,60,160,320,560,880,1300],BOMB_FILLS=[0,1,3,6,10,15,21],HASTE_TICKS=180,MAX_LEVEL=7;
  // [주포 수, 주포 간격, 유도탄 수, 유도탄 간격, 번개 피해, 번개 간격, 번개 갈래]
  var POWER_SHOTS=[null,[2,5,2,8,0,0,0],[2,4,2,8,0,0,0],[3,4,2,8,0,0,0],[3,4,4,8,0,0,0],[3,4,4,7,8,60,1],[4,3,4,7,8,54,1],[5,3,6,6,10,48,2]];
  // 단계별 화력(1단계 대비 배수). 그림(탄 수·연사)은 화려하게 늘되 보스 패턴을 끝까지 볼 수 있게 화력은 1.8배까지만: 탄 한 발 피해 = 목표 화력 ÷ 늘어난 탄 수.
  var POWER_DPS=[null,1,1.12,1.25,1.38,1.5,1.65,1.8],SHOT_DAMAGE=[null];
  (function(){function raw(q){return q[0]*60/q[1]+q[2]*60/q[3]+(q[4]?q[4]*q[6]*60/q[5]:0);}var base=raw(POWER_SHOTS[1]);for(var l=1;l<=7;l++)SHOT_DAMAGE[l]=POWER_DPS[l]*base/raw(POWER_SHOTS[l]);})();
  // 주포 자리 [x 어긋남, 옆 속도(px/틱)]
  var MAIN_LAYOUT={2:[[-7,0],[7,0]],3:[[-9,0],[0,0],[9,0]],4:[[-13,-.55],[-5,0],[5,0],[13,.55]],5:[[-15,-.8],[-7,-.2],[0,0],[7,.2],[15,.8]]};
  var HOMING_LAYOUT={2:[-20,20],4:[-30,-20,20,30],6:[-40,-30,-20,20,30,40]};
  // 영웅 둘레 적탄 둔화: [반지름, 가장 느려지는 비율(영웅 바로 옆)]
  var SLOW_FIELD=[null,[34,.15],[42,.2],[50,.25],[58,.3],[66,.35],[74,.4],[84,.45]],FOCUS_SLOW=.777/.45,FOCUS_SLOW_MAX=.777; // 사용자 11-20 "저속 누르면 최대 77.7프로까지 적탄 속도가 느려지게 범위 나가지면 탄속도 다시 빨라지고": 저속 배율을 7단계에서 77.7%가 되게(1단계 25.9%). 둔화는 틱마다 거리로 다시 재므로 범위를 벗어난 탄은 곧바로 원래 속도다
  // 필살기 단계별 [보스 피해, 몹 피해]
  var BOMB_POWER=[null,[40,25],[48,32],[56,40],[66,50],[76,60],[88,72],[100,90]];
  var BOMB_NAMES=[null,'기억 섬광','기억 파편','잔상 폭우','회상 뇌격','망각의 붕괴','기억 범람','기억 해방'];
  function bombName(s,level){var hero=heroProfile(s),lv=Math.max(1,Math.min(MAX_LEVEL,level||s&&s.bombLevel||1));return hero?hero.bombNames[lv]:BOMB_NAMES[lv];}
  function levelOf(table,v){var l=1;while(l<MAX_LEVEL&&v>=table[l])l++;return l;}
  /* 챕터 레벨(사용자 11-20 "챕터가 달라져도 영웅레벨은 이어지도록 … 챕터당 1레벨식 … 6-7챕터쯤 만렙"): 제n부의 기본 레벨은 n(7부부터 만렙 7).
     공격·필살 단계는 한 판 안에서 그대로 이어지고, 새 챕터에 들어서면 그 챕터 기본 레벨 밑이면 거기까지 올려 준다. 맞아서 내려가도 기본 레벨 밑으로는 안 간다. */
  function chapterFloor(s){var st=STAGES[s.stageIndex];return Math.max(1,Math.min(MAX_LEVEL,st&&st.part||1));}
  function liftToFloor(s,quiet){var f=chapterFloor(s);
    if(s.power<f){s.exp=Math.max(s.exp,POWER_EXP[f-1]);s.power=levelOf(POWER_EXP,s.exp);if(!quiet){s.hasteUntil=s.tick+HASTE_TICKS;note(s,'powerUp');}}
    if(s.bombLevel<f){s.fills=Math.max(s.fills,BOMB_FILLS[f-1]);s.bombLevel=levelOf(BOMB_FILLS,s.fills);if(!quiet)note(s,'bombLevelUp');}}
  function gainExp(s,n){var before=s.power;s.exp+=n;s.power=levelOf(POWER_EXP,s.exp);if(s.power>before){s.hasteUntil=s.tick+HASTE_TICKS;note(s,'powerUp');}}
  function clockState(s){return s.player.focus?'slow':s.tick<s.hasteUntil?'haste':'normal';}
  function isSeohaHero(s){return !!s&&(s.hero==='seoha'||s.hero==='seoha-b');}
  function slowField(s){var f=SLOW_FIELD[s.power],k=s.player.focus&&s.hero!=='memory'?FOCUS_SLOW:1;return [f[0],Math.min(FOCUS_SLOW_MAX,f[1]*k)];} // 사용자 11-20 "저속 누르면 탄환느려지는거 서하만": 기억사수는 저속에서 둘레 둔화가 커지지 않는다(평소 둘레 둔화는 그대로)
  /* 능력조절(사용자 11-20 "설정안에 능력조절 신규로 … 7단계로 조절"): 0=끔, 1~7단계. 설정 화면이 setAbility 로 s.ability 를 바꾼다.
     기억사수 출력조절: 단계마다 자기 공격 피해 +11%(7단계 1.77배), 그 절반 비율로 적탄이 빨라진다(+5.5%, 7단계 1.385배).
     서하 시간제어: 단계마다 적탄이 11%씩 느려진다(7단계 77%), 서하 이동도 같은 비율로 느려진다.
     기억사수 저속: 적탄 둔화 대신 자기 피해 ×FOCUS_POWER, 필살 게이지 ×FOCUS_GAUGE. */
  var ABILITY_MAX=7,ABILITY_POWER=.11,ABILITY_HASTE=.055,ABILITY_SLOW=.11,FOCUS_POWER=1.3,FOCUS_GAUGE=1.5;
  /* 영웅 공격 손맛(사용자 11-20 "기억사수 모든공격 롤제리 느낌나게", "서하는 공격중에 시간탄섞어서 … 시간폭탄"). 원작 그림·소리는 쓰지 않고 수묵으로 다시 그린다.
     기억사수 충전탄: 주포 CHARGE_EVERY 번째 발사마다 가운데 한 발이 충전탄. 맞으면 피해를 CHARGE_ARC 만큼 덜어 CHARGE_REACH 안의 다른 적에게 튀긴다(합계는 한 발 피해 그대로).
     윤서하 시간탄: TIMEBOMB_EVERY 틱마다 가운데 한 발이 시간탄. 붙는 순간 보통 탄 한 발 피해(한 적만 상대할 때 두 영웅 화력이 같게: heroes 검사),
       TIMEBOMB_FUSE 틱 째깍인 뒤 터지며 TIMEBOMB_R 안의 다른 적에게 한 발 ×TIMEBOMB_SPLASH 를 더 준다(몰려 있을 때만 이득). 붙은 적이 먼저 쓰러지면 그 자리에서 터진다. */
  /* 서하 초능력(사용자 11-20 "서하 초능력(저속) 사용시 서하 탄도 매우 느려지게 다만 서하 시간탄은 더 자주 나가게 서하 시간탄속도도 느려짐"):
     누른 동안 쏜 서하 탄은 SEOHA_FOCUS_SHOT 배, 시간탄은 SEOHA_FOCUS_TB 배 빠르기로 날고(쏜 뒤 손을 떼도 그 빠르기 그대로), 시간탄은 SEOHA_FOCUS_TB_EVERY 틱마다 나간다.
     한 발 피해는 그대로라 한 적만 상대할 때 화력은 같고(늦게 닿을 뿐), 시간탄이 잦아지는 만큼 몰린 적에게 터지는 피해만 는다. */
  var SEOHA_FOCUS_SHOT=.4,SEOHA_FOCUS_TB=.3,SEOHA_FOCUS_TB_EVERY=18;
  var CHARGE_EVERY=4,CHARGE_ARC=.35,CHARGE_REACH=96,TIMEBOMB_EVERY=36,TIMEBOMB_FUSE=42,TIMEBOMB_MULT=0,TIMEBOMB_SPLASH=.6,TIMEBOMB_R=52,TIMEBOMB_CAP=8,SHOT_HITS_CAP=96;
  function abilityLevel(s){var l=s&&s.ability|0;return l<0?0:l>ABILITY_MAX?ABILITY_MAX:l;}
  function setAbility(s,level){s.ability=Math.max(0,Math.min(ABILITY_MAX,Math.round(Number(level)||0)));return s.ability;}
  /* 사용자 11-20 "서하 능력조절 시간제어는 저속 누르고 있을때만 발동 … 원밖에서는 설정발동 원안에서는 패시브+설정발동 중첩": 서하 시간제어는 초능력(저속)을 누른 동안에만 켜진다.
     armed: true 면 누름과 상관없는 설정 수치(설정 화면 설명용), 없으면 지금 누름(s.player.focus)을 따른다. 탄 둔화는 updateBullets 에서 둘레 둔화와 곱해진다(원 안은 중첩) */
  function abilityOf(s,armed){var l=abilityLevel(s);
    if(isSeohaHero(s)){var on=armed===undefined?!!(s.player&&s.player.focus):!!armed,k=on?ABILITY_SLOW*l:0;return {kind:'time',level:l,active:on,damage:1,bulletSpeed:1-k,move:1-k};}
    return {kind:'power',level:l,active:true,damage:1+ABILITY_POWER*l,bulletSpeed:1+ABILITY_HASTE*l,move:1};}
  function shotDamage(s){var d=SHOT_DAMAGE[s.power]*abilityOf(s).damage;if(s.hero==='memory'&&s.player.focus)d*=FOCUS_POWER;return d;}
  var GAUGE_FULL=100,MAX_BOMBS=4,AUTO_COLLECT_Y=190,ITEM_REACH=24,ITEM_PULL=11,BOMB_BOSS_DAMAGE=40,BOMB_MOB_DAMAGE=25;
  // 탄 색은 여섯 가지만 쓴다: 0 빨강 2 보라 4 청록 5 초록 6 노랑 8 흰색
  var PALETTE=[0,2,4,5,6,8],RED=0,PURPLE=2,CYAN=4,GREEN=5,YELLOW=6,WHITE=8;
  // 모양도 여섯 가지: 0 작은 구슬 1 중간 2 큰 구슬 3 쌀알탄 4 거품 5 큰 기물(색 번호 자리에 기물 번호)
  var SIZE_RADIUS=[4,6,10,3.2,15,14],RICE=3,SHAPE_PROP=5,MUZZLE=22;
  // 사용자가 보여 준 톱니/코어 크기(몸체 긴 변 56px) 이상인 탄 중 세 개에 하나만 사격으로 깬다.
  // 옅은 빛무리·생성 직후 부풀림은 크기에 포함하지 않는다. 작은 구슬·거품은 그대로 남는다.
  var BULLET_BREAK_MIN_SPAN=56,ORB_HP=[0,0,0,0,0,3],ORB_BREAK_EVERY=3,ORB_FRAGMENT_COUNT=3,ORB_FRAGMENT_GRACE=36,ORB_FRAGMENT_SPEED=80;
  // 화면과 파괴 크기 판정이 같은 몸체 길이를 쓴다. 휴대폰 확대는 작은 탄의 파괴 자격을 바꾸지 않는다.
  var PROP_LONG={'sword-violet':68,cleaver:64,'sword-balrog':72,obelisk:80,spire:72,'twin-blade':62,crescent:58,tissue:34,money:36,heel:40,feather:44,hexagram:46,gear:56,skull:34,'demon-hand':46};
  // 큰 기물. upright는 절대 돌리지 않는 것(육망성은 똑바로 선 채 아래로만 내려온다. 사용자 11-16: 십자가는 늘 좋은 것이라 적이 쓰지 않는다).
  var PROPS=[{key:'sword-violet',radius:12},{key:'cleaver',radius:14},{key:'sword-balrog',radius:14},{key:'obelisk',radius:17},{key:'spire',radius:18},
    {key:'twin-blade',radius:13},{key:'crescent',radius:14},{key:'tissue',radius:10},{key:'money',radius:10},{key:'heel',radius:11},{key:'feather',radius:9},
    {key:'hexagram',radius:14,upright:true,drawn:true,glow:6},{key:'gear',radius:16},
    // 코드로 그린 기물(drawn, 그림 파일은 tools/build-drawn-props-v43.cjs가 같은 코드로 구워 둔다): 해골(묘지), 늪에서 올라오는 초록 악마 손.
    // glow는 빛무리 색 번호. 둘 다 진행 방향을 본다(손끝은 위로 솟고, 해골은 날아가는 쪽으로 얼굴 아래턱을 둔다).
    {key:'skull',radius:11,drawn:true,glow:2},{key:'demon-hand',radius:12,drawn:true,glow:5}];
  gather('props',PROPS,true);
  var P={};PROPS.forEach(function(p,i){P[p.key]=i;});
  /* 무기탄 판정(사용자 11-18: "회전탄 등 무기탄은 중심 말고 외곽에도 탄환을 넣어 무기에 맞은 느낌"): 기물마다 그림 모양대로 중심 말고 날·끝·가장자리에도 작은 판정점을 둔다.
     긴 기물(칼·도끼·깃털·탑)은 긴 축을 따라 다섯 점, 둥근 기물(초승달·톱니·쌍검·육망성·해골)은 가운데 한 점과 가장자리 여섯 점. 점은 기물이 그려지는 각도(turn)대로 같이 돈다. */
  var PROP_DIMS={'sword-violet':[200,43],cleaver:[200,41],'sword-balrog':[200,60],obelisk:[71,200],spire:[139,200],'twin-blade':[200,185],crescent:[200,165],tissue:[120,99],money:[120,76],heel:[127,140],feather:[160,53],gear:[200,184],hexagram:[1,1],skull:[1,1],'demon-hand':[1.6,1]};
  var PROP_HIT_REACH=.78; // 긴 축 끝점은 그림 끝에서 22% 안쪽(끝 투명 여백·너무 억울한 판정 방지)
  // 손으로 정한 판정점(그림 절반 가로·세로에 대한 비율 x,y 와 반지름 r=긴 변 절반 대비): 속이 빈 초승달·갈라진 쌍검이 허공에서 맞지 않게.
  var PROP_HIT_MANUAL={
    crescent:[[.85,0,.1],[.4,0,.1],[-.2,-.6,.1],[-.2,.6,.1],[-.55,-.3,.1],[-.55,.3,.1]],
    'twin-blade':[[.1,-.8,.11],[-.15,-.2,.11],[-.4,.4,.11],[-.6,.85,.11],[.62,-.5,.11],[.35,0,.11],[.05,.5,.11],[-.1,.85,.11]]
  };
  function buildPropHit(key,rad){
    var d=PROP_DIMS[key]||[1,1],long=PROP_LONG[key]||48,k=long/Math.max(d[0],d[1]),hw=d[0]*k/2,hh=d[1]*k/2,pts=[],i;
    var major=Math.max(hw,hh),minor=Math.min(hw,hh);
    if(PROP_HIT_MANUAL[key]){var mx=0;PROP_HIT_MANUAL[key].forEach(function(m){var q=[m[0]*hw,m[1]*hh,Math.max(3.2,m[2]*major*2)];pts.push(q);mx=Math.max(mx,Math.hypot(q[0],q[1])+q[2]);});return {pts:pts,extent:mx,vert:false};}
    if(major/minor>1.6){var pr=Math.max(3.2,minor*.9,rad*.7),vert=hh>hw;[-1,-.5,0,.5,1].forEach(function(f){var a=f*major*PROP_HIT_REACH;pts.push(vert?[0,a,pr]:[a,0,pr]);});}
    else{pts.push([0,0,Math.max(4,minor*.45,rad*.6)]);var rr=major*.62,pr2=Math.max(3.4,minor*.34),start=key==='hexagram'?-Math.PI/2:0;for(i=0;i<6;i++){var a2=start+i*TAU/6;pts.push([Math.cos(a2)*rr,Math.sin(a2)*rr,pr2]);}}
    return {pts:pts,extent:major*PROP_HIT_REACH+Math.max(3.2,minor*.9,rad*.7),vert:major/minor>1.6&&hh>hw};
  }
  var PROP_HIT=null;
  function propHitOf(color){if(!PROP_HIT){PROP_HIT=PROPS.map(function(p){return buildPropHit(p.key,p.radius||10);});}return PROP_HIT[color];}
  function propHitPoints(color){var h=propHitOf(color);return h?h.pts:null;}
  function propTurn(s,i){var pr=PROPS[s.bcolor[i]];return pr.upright?0:s.bspin[i]?s.bage[i]*s.bspin[i]:s.ba[i];} // 앱 drawProp 이 쓰는 각도와 같다
  function propRenderSpan(prop){return PROP_LONG[prop.key]||Math.round((prop.radius||12)*4.4);}
  function bulletRenderSpan(size,color){return size===SHAPE_PROP?propRenderSpan(PROPS[color]):SIZE_RADIUS[size]*(size===RICE?5.2:2);}
  function breakableHp(size,color){return bulletRenderSpan(size,color)>=BULLET_BREAK_MIN_SPAN?ORB_HP[size]:0;}
  function isBulletBreakable(s,i){return !!s.bbreakable[i]&&breakableHp(s.bsize[i],s.bcolor[i])>0;}
  // 탄 변화 방식: 1 영웅을 다시 조준 2 각도 꺾기 3 터져서 고리로 4 가지치기(프랙탈)
  var MODE_REAIM=1,MODE_TURN=2,MODE_SPLIT=3,MODE_BRANCH=4;

  function rand(s){var x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
  function count(s,n){return Math.max(1,Math.round(n*s.density));}
  function patternDifficulty(s){return s.difficulty==='gentle'?'gentle':'hell';}
  function pick(s,gentle,normal,hell){return s.difficulty==='gentle'?gentle:hell;}
  function aim(s,x,y){return Math.atan2(s.player.y-y,s.player.x-x);}
  function note(s,name){if(s.events.length<48)s.events.push(name);}
  function bulletRadius(s,i){return (s.bsize[i]===SHAPE_PROP?PROPS[s.bcolor[i]].radius:SIZE_RADIUS[s.bsize[i]])*hitSize(s);}
  function hitSize(s){return s.entranceAll&&s.compact?s.sizeScale/COMPACT_SIZE:s.sizeScale;} // 휴대폰 이지가 어려운 원인(11-19): 휴대폰은 탄을 1.25배로 크게 그리지만 판정까지 커졌다. 실제 게임은 그림만 키우고 판정은 PC와 같게
  /* 탄 하나. o: {size,color,turn(초당 회전),accel,min,max,at(변화 틱),mode,arg,speed2,life,gen(가지치기 남은 횟수),spin(기물이 도는 속도, 틱당 라디안)} */
  function srand(s){var x=s.srng|0||1;x^=x<<13;x^=x>>>17;x^=x<<5;s.srng=x>>>0;return s.srng/4294967296;}
  function spawn(s,x,y,angle,speed,o){
    if(s.n>=s.cap){s.dropped++;return;}
    o=o||{};var size=o.size||0;
    if(s.efire===false&&size!==SHAPE_PROP&&!o.fragment){s.timeHeld=(s.timeHeld||0)+1;return;} // 서하 시간제어: 적의 시간이 느려져 발사도 그만큼 드물다(아래 step 의 enemyClock)
    // 화면이 붐비면(상한의 72% 이상) 새 탄을 하나 걸러 하나만, 82% 이상이면 쉬게 한다(조형물은 예외). 느린 탄이 쌓여도 상한에 닿지 않는다.
    if(s.n>=s.cap*.72&&size!==SHAPE_PROP&&!o.fragment){s.thin=(s.thin+1)|0;if(s.n>=s.cap*.82||s.thin%2)return;}
    // 보스 한가운데서 쏘는 탄은 보스 몸 가장자리(MUZZLE)에서 나오게 옮긴다. 탄이 몸을 덮어 보스가 가려지지 않는다(7분야 심사 3차 지적).
    var b=s.boss;if(!o.fragment&&b&&s.stage==='card'&&Math.abs(x-b.x)<2&&Math.abs(y-b.y)<2){x+=Math.cos(angle)*MUZZLE;y+=Math.sin(angle)*MUZZLE;}
    // A designed gap or locked volley must keep the heading that the player saw.
    if(s.entranceAll&&s.difficulty!=='hell'&&!o.formation&&size!==SHAPE_PROP&&!o.fragment){angle+=(srand(s)-.5)*2*SCATTER_ANGLE;speed*=1+(srand(s)-.5)*2*SCATTER_SPEED;x+=(srand(s)-.5)*2*SCATTER_POS;y+=(srand(s)-.5)*2*SCATTER_POS;} // 탄을 조금 더 흩뿌려 겹침을 줄인다(사용자 11-18, 이지·노멀)
    if((s.figPend||s.figHeldAt===s.tick)&&!o.fragment&&!s.splitting)return; // 육망성·한자 고리를 기다리는 동안 새 탄을 내지 않는다(사용자 11-20)
    if(s.calm&&!o.fragment)return; // 육망성·한자 고리가 떠 있는 동안, 그리고 보스가 아래로 내려와 있는 동안은 새 탄을 내지 않는다(사용자 11-19 "탄환은 위에 있을때만 생성"). 반사탄도 마찬가지
    var i=s.n++;
    s.bx[i]=x;s.by[i]=y;s.ba[i]=angle;s.bs[i]=speed*s.rules.speed;
    s.bturn[i]=o.turn||0;s.bacc[i]=o.accel||0;s.bmin[i]=o.min===undefined?0:o.min;s.bmax[i]=o.max===undefined?400:o.max;
    s.bat[i]=o.at||0;s.bmode[i]=o.mode||0;s.barg[i]=o.arg||0;s.bs2[i]=(o.speed2||0)*s.rules.speed;s.bgen[i]=o.gen||0;
    var hp=breakableHp(size,o.color||0),eligible=hp>0;
    if(eligible)s.orbSerial++;
    s.bbreakable[i]=eligible&&(o.breakable===true||o.breakable!==false&&(s.orbSerial-1)%ORB_BREAK_EVERY===0)?1:0;
    s.bhp[i]=s.bbreakable[i]?hp:0;s.bfragment[i]=o.fragment?1:0;s.bformation[i]=o.formation?1:0;s.bgrace[i]=o.grace||BLOOM_TICKS;
    s.bage[i]=0;s.blife[i]=o.life||780;s.bsize[i]=size;s.bcolor[i]=o.color||0;s.bgrazed[i]=0;s.bexit[i]=0;s.bmirror[i]=o.mirror?1:0;s.bbounce[i]=size===SHAPE_PROP?0:o.bounce||(s.entranceAll&&!o.fragment&&y<H*WALL_KICK_Y?1:0); // 위쪽에서 난 탄은 옆·위 벽에서 한 번 튕겨 아래로 온다: 위쪽 옆으로 새어 나가던 탄이 45%였다(사용자 11-19 "실질적 위협")
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
  function waveCount(s,spec,n){var m=spec.difficultyMultiplier,k=m&&typeof m==='object'?(m[patternDifficulty(s)]||1):(m||1);return Math.max(1,Math.round(n*k*s.density));}
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
    for(var q=0;q<s.figures.length;q++)if(s.figures[q].sigil)return; // 큰 육망성이 떠 있는 동안 다른 광선은 내지 않는다: 사용자 11-15 "이상한레이져 생성하지말고", 심사 6.50(육망성 선과 방사 광선이 한 화면에서 겹침)
    var wd=o.width||18;if(s.entranceAll&&!o.solid&&wd<BEAM_MIN)wd=BEAM_MIN; // 사용자 11-19 "빨간색선처럼 맵끝에서 끝으로 레이져가 굵게": 실제 게임의 가는 광선은 굵게
    s.lasers.push({x:x,y:y,angle:angle,width:wd*s.rules.beam,warn:Math.round((o.warn||60)*s.rules.warn),active:o.active||60,
      color:o.color||0,spin:o.spin||0,follow:!!o.follow,burst:!!o.burst,age:0,grazed:false,full:!!s.entranceAll,solid:!!o.solid,keep:!!o.keep,sq:!!o.sq});if(o.cue)s.lasers[s.lasers.length-1].cue=o.cue; // cue: 화면 연출 꼬리표(뿌리 'root'·빗장 'bolt', src/arcade-cues-v43.js). 판정과 무관 // 실제 게임의 광선은 모두 맵 끝에서 끝까지(사용자 11-19 "모든레이저는 맵끝과 끝이닿는레이져로"): 시작점을 지나는 온 줄
    if(!s.warned){s.warned=true;note(s,'laserWarn');}
  }
  var BEAM_MIN=20,FAN_APEX=-90,FAN_W=24;
  /* ── 광선 문법(사용자 11-19 "레이져도 하나만 딸랑나오지말고 아래부터 한줄씩나오면서 위로가는걸 유도 … 모든 패턴 모든공격에는 의미와 당위성").
   *  동방·도돈파치·무시히메사마 등 탄막 설계 관행을 조사해 정한 규칙(docs/v43/danmaku-rules.md): 광선은 벽·스위퍼·우리·밀어내기·조준 중 하나의 역할을 가진다.
   *  실제 게임에서 한 틱에 가로줄 하나·세로줄 하나만 덩그러니 나오면 역할이 없으므로 여기서 묶음으로 바꾼다.
   *  · 가로 한 줄 → 밀어올리기 사다리: 화면 아래부터 64px 띠가 한 칸씩 차례로 켜져 위로 차오른다. 모든 예고(인주색)가 처음부터 보이고, 아래 띠일수록 오래 남는다. 맨 위 띠 위가 안전지대다.
   *  · 세로 한 줄 → 스위퍼: 영웅 쪽으로 한 칸씩 걸어오는 벽. 앞 줄이 꺼지면 그 뒤가 비어 '지나간 자리로 넘어가기'가 답이 된다.
   *  · 기울어진 한 줄(영웅 조준)·keep 표시(의도된 차례 연출·중앙 견제)는 그대로 둔다.
   *  난이도는 같은 아이디어의 줄 수만 바꾼다(이지 2·노멀 3·헬 4). ── */
  var MOB_NEAR_HOLD=120,LADDER_N={gentle:2,normal:3,hell:4},LADDER_BAND=64,LADDER_LAG=22,SWEEP_N={gentle:2,normal:3,hell:4},SWEEP_STEP=44,SWEEP_LAG=16;
  function cloneBeam(l,o){var c={};for(var k in l)c[k]=l[k];for(k in o)c[k]=o[k];c.composed=true;return c;}
  function composeLasers(s){
    if(!s.entranceAll)return;
    var fresh=[],i,l;for(i=0;i<s.lasers.length;i++){l=s.lasers[i];if(l.age===0&&!l.composed)fresh.push(l);}
    if(fresh.length!==1)return;
    l=fresh[0];if(l.solid||l.floor||l.follow||l.sq||l.keep||l.spin)return;
    var n,k,lag=Math.round(LADDER_LAG*s.rules.warn);
    if(Math.abs(l.angle)<.01){ // 가로 → 밀어올리기 사다리
      // 띠 하나는 LADDER_BAND 높이를 통째로 덮는다(solid): 줄 사이에 서서 버티는 길이 없고, 바닥이 정말로 한 칸씩 차오른다(심사 11-19 7.29: 줄 사이가 안전지대로 남았다)
      n=LADDER_N[s.difficulty]||3;
      l.y=H-LADDER_BAND*.5;l.width=LADDER_BAND;l.solid=true;l.active+=(n-1)*lag;l.composed=true;l.role='ladder';
      coverClear(s,false); // 회피 측정(11-20 헬 25 학대의 방): 사다리가 위로 밀어 올리는데 앞서 켜진 가로줄이 위로 가는 길을 막아 어떤 길도 안전하지 않았다 → 사다리를 세울 때 같은 방향(가로) 앞 광선은 잔광으로 끈다
      for(k=1;k<n&&s.lasers.length<LASER_CAP;k++)s.lasers.push(cloneBeam(l,{y:H-LADDER_BAND*(k+.5),warn:l.warn+k*lag,active:l.active-k*lag,role:'ladder'}));
      s.composedLasers=(s.composedLasers||0)+1;
    }else if(Math.abs(l.angle-Math.PI/2)<.01){ // 세로 → 스위퍼
      n=SWEEP_N[s.difficulty]||3;var dir=s.player.x>=l.x?1:-1,end=l.x+dir*SWEEP_STEP*(n-1),sl=Math.round(SWEEP_LAG*s.rules.warn);
      if(end<16||end>W-16){dir=-dir;}
      l.composed=true;l.role='sweep';l.active=Math.max(30,Math.round(l.active*.7));l.width=SWEEP_STEP;l.solid=true; // 기둥끼리 맞붙은 벽(solid): 사이로 빠지지 않고, 먼저 켜진 뒤쪽 기둥이 먼저 꺼져 벽이 걸어온다
      coverClear(s,true); // 스위퍼도 같은 규칙: 옆으로 밀어내는 벽 앞을 세로 앞 광선이 막지 않게
      for(k=1;k<n&&s.lasers.length<LASER_CAP;k++){var x=l.x+dir*SWEEP_STEP*k;if(x<10||x>W-10)break;s.lasers.push(cloneBeam(l,{x:x,warn:l.warn+k*sl,role:'sweep'}));}
      s.composedLasers=(s.composedLasers||0)+1;
    }
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
    s.mobs.push({kind:kind,elite:!!spec.elite,x:x,y:y,baseX:x,vx:o.vx||0,vy:o.vy===undefined?1.6:o.vy,sway:o.sway||0,swayRate:o.swayRate||.05,hp:s.entranceAll?Math.round(spec.hp*MOB_HP_UP):spec.hp,r:spec.r,score:spec.score,
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
  var CATENARY_SPEED=120; // 7전문가 심사 11-14: 60이면 노멀(속도 ×.64)에서 3.5초가 지나도 화면 위쪽 벽처럼 머물렀다
  function plainCatenary(c1,c2){return function(s,t){
    if(t%46!==0)return;
    s.lane=Math.max(0,Math.min(10,(s.lane===undefined?5:s.lane)+Math.floor(rand(s)*3)-1));
    for(var i=0;i<13;i++){if(i>=s.lane&&i<s.lane+3)continue;var x=W/13*(i+.5),u=(x-W/2)/90;spawn(s,x,-43+12*((Math.exp(u)+Math.exp(-u))/2-1),Math.PI/2,CATENARY_SPEED,{color:(t/46)%2?c2:c1,size:1});}};}
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
  /* ── 같은 인물이 이어 나올 때의 다른 모습(사용자 11-19 "같은 이미지의 보스가 반복해서 나오는 문제"). 인물·패턴·이름은 그대로이고 그림만 바꾼다.
   *    키: 인물@원작 장면 → 그림 키(media/arcade-v43/<키>.webp, 배정표 tools/arcade-art-v43/forms.json). 같은 인물의 원화(m0·저장소)만 쓴다. ── */
  var BOSS_FORMS={'lucifer@11':'lucifer_alt11','mask@11':'mask_alt11','controller@27':'controller_alt27','controller@29':'controller_alt29',
    'goblin@31':'goblin_alt31','insomnia@34':'insomnia_alt34','chief@50':'chief_alt50','cultist@61':'cultist_alt61','p6_demons@48':'p6_demons_alt48'},FORM_BASE={};
  Object.keys(BOSS_FORMS).forEach(function(k){FORM_BASE[BOSS_FORMS[k]]=k.split('@')[0];});
  /* ── 보스마다 고유 탄 문양(사용자 11-19 "탄종류를 보스마다 고유하나씩 … 그 고유탄위주로"). 보스·중간보스가 나와 있는 동안 그 인물이 쏜 작은·중간·큰 구슬탄은
   *    이 문양으로 그린다(판정 원은 그대로, 그림만). 이어 만나는 인물끼리(같은 맵의 중간보스·보스, 앞 맵 보스)는 문양이 겹치지 않는다(arcade-v43-boss-shots 검사).
   *    십자가 모양 금지(검은 가드 없음), 색은 패턴이 정한 보스 색 그대로(인주색 아님). 중간보스(mb_*)는 아래 표에 없으면 bossShotOf가 고른다. ── */
  var BOSS_SHOTS={p1_tree:'leaf',violet:'sword',p1_horn:'horn',p1_chaser:'chain',p1_comrade:'skull',p1_gate:'key',balrog:'fist',mask:'mask',p1_staff:'needle',p1_seraph:'feather',lucifer:'bolt',
    p2_demons:'horn',p2_belphegor:'moon',p2_leviathan:'fang',p2_beelzebub:'fly',asmodeus:'lips',p2_greed:'sword',p2_mammon:'key',p2_wrath:'flame',pride:'crown',p2_chairman:'gear',p2_core:'eye',
    p3_legion:'missile',p3_rampart:'fist',p3_defense:'key',controller:'chain',p3_body:'gear',p3_gate:'hourglass',goblin:'fang',p4_knight:'sword',insomnia:'eye',
    p5_cult:'fang',p5_archon:'scythe',p5_common:'hourglass',p5_upper:'key',p5_grand:'bell',p5_furnace:'flame',p5_neuron:'bolt',p5_keeper:'skull',p5_rings:'chain',arbelia:'feather',siren:'bell',
    p6_demons:'horn',chief:'scythe',p6_bind:'web',p7_car:'missile',p7_shadow:'moon',p7_alarm:'bell',executor:'chain',p8_chip:'web',p8_collective:'mask',p8_lauren:'sword',cultist:'clock',p8_ion:'bolt',rian:'rose',
    mb_01:'thorn',mb_02:'web',mb_03:'drop',mb_04:'fang',mb_05:'needle',mb_06:'feather',mb_07:'flame',mb_08:'drop',mb_09_1:'eye',mb_09_2:'sword',mb_10:'coin',mb_13:'key',mb_14:'leaf',mb_15:'eye',
    mb_16:'drop',mb_17:'rose',mb_18:'coin',mb_19:'fang',mb_20:'sword',mb_21:'skull',mb_24:'web',mb_25:'eye',mb_27:'key',mb_28:'bolt',mb_31:'thorn',mb_32:'rose',mb_33:'feather',mb_34:'moon',mb_35:'drop',
    mb_37:'hourglass',mb_38:'sword',mb_39:'leaf',mb_41:'gear',mb_42:'gear',mb_43:'sword',mb_44:'hourglass',mb_45:'key',mb_46:'key',mb_49:'sword',mb_52:'eye',mb_53:'key',mb_54:'chain',mb_56:'gear',
    mb_57:'thorn',mb_58:'fang',mb_59:'drop',mb_61:'chain'};
  var SHOT_KINDS=['fist','clock','sword','missile','web','coin','gear','eye','flame','horn','feather','lips','chain','key','rose','bell','hourglass','needle','leaf','moon','skull','fang','drop','mask','bolt','scythe','fly','crown','thorn'];
  function bossShotOf(actor){return BOSS_SHOTS[actor]||'';}
  /* ── 중간보스(사용자 11-16 "일반몹-중간보스-보스-다음맵"). 맵마다 잡몹 구간 다음에 보스와 다른 인물이 한 번 나와 일반 패턴 둘을 쏘고 쓰러진다.
   *    맵의 원래 중간 인물이 보스와 다르고 바로 앞 맵의 보스도 아니면 그 인물이 중간보스다. 아니면 아래 표의 인물이 나온다.
   *    이름은 스토리월드(m0·드라이브) 그림에 붙은 이름만 쓴다. 그림은 tools/arcade-art-v43/midboss.json. ── */
  var MIDBOSS={
    '01':['뿌리 추적자',GREEN,PURPLE],'02':['보랏빛 알집지기',PURPLE,WHITE],'03':['늪의 염소머리 악마',GREEN,YELLOW],'04':['피냄새 추적자',RED,WHITE],
    '05':['피로 꿰맨 전령',PURPLE,GREEN],'06':['숨이 끊긴 전령의 그림자',RED,PURPLE],'07':['검은기둥 화염술사',YELLOW,RED],'08':['복도 비명잔영',WHITE,CYAN],
    '09-1':['주사실 감시환각',CYAN,WHITE],'09-2':['보라검 추격천사',YELLOW,WHITE],'10':['암시장의 수상한 자',PURPLE,YELLOW],'13':['일흔두 번째 인장 잔류체',CYAN,PURPLE],
    '14':['나태의 껍데기 파수',GREEN,YELLOW],'15':['금이 간 비교잔영',CYAN,WHITE],'16':['폐기주방 감독',YELLOW,RED],'17':['심장빛 무대감독',RED,PURPLE],
    '18':['모든 면이 뒷면인 동전',YELLOW,WHITE],'19':['눈보라 속 여우 악마',WHITE,CYAN],'20':['호텔 화염기사',RED,YELLOW],'21':['흑마법사의 시체경호체',CYAN,RED],
    '24':['기계화 문턱 관측거미',YELLOW,CYAN],'25':['기억 검열기',WHITE,PURPLE],'27':['역전 관리자',CYAN,WHITE],'28':['중앙이주 코어',CYAN,YELLOW],
    '31':['피리 고블린',GREEN,RED],'32':['장미이슬 슬라임',RED,GREEN],'33':['소환진 타락천사',PURPLE,RED],'34':['포구 검은 안개',WHITE,PURPLE],'35':['검은 안개 심장',PURPLE,YELLOW],
    '37':['시간 수집자',YELLOW,PURPLE],'38':['상위수문장 49',YELLOW,CYAN],'39':['상위수문장 51',CYAN,WHITE],'41':['상위수문장 53',CYAN,PURPLE],'42':['시간핵의 명령 파동',RED,CYAN],
    '43':['상위수문장 56',GREEN,WHITE],'44':['시간수문장 42',PURPLE,YELLOW],'45':['상위수문장 57',WHITE,CYAN],'46':['상위수문장 54',CYAN,GREEN],
    '49':['환수검 모조체',WHITE,CYAN],'52':['파란불 역주행 목격자',CYAN,WHITE],'53':['공실장부 당직감사',YELLOW,RED],'54':['진술 봉쇄 인과핵',PURPLE,WHITE],
    '56':['소환좌 칩 수호체',CYAN,RED],'57':['흑장미 귀막은 신도',PURPLE,RED],'58':['생체기계 악몽',RED,PURPLE],'59':['죄책감 압축결정',GREEN,PURPLE],'61':['EGO 구속 연결자',PURPLE,CYAN]};
  function midbossKey(scene){return 'mb_'+scene.replace('-','_');}
  Object.keys(MIDBOSS).forEach(function(sc){var m=MIDBOSS[sc];ACTORS[midbossKey(sc)]={name:m[0],c1:m[1],c2:m[2],midboss:true};});

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
      lattice(s,t,220,pick(s,2,2,3),pick(s,2,3,4),s.difficulty!=='gentle',10,WHITE,YELLOW);
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
      lattice(s,t,240,pick(s,2,2,3),pick(s,2,3,4),s.difficulty!=='gentle',8,WHITE,WHITE);
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
      // 층이 아래에서부터 차례로 닫혀 올라온다(11-19 "아래부터 한줄씩나오면서 위로가는걸 유도"): 닫히는 층을 피해 위층으로 올라서는 것이 답이다.
      if(phase===0)row(s,510,{width:16,warn:60,active:70,color:RED,keep:1});if(phase===50)row(s,380,{width:16,warn:60,active:70,color:RED,keep:1});if(phase===100)row(s,250,{width:16,warn:60,active:70,color:RED,keep:1});
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
      // 두 사람: 보스 자리와 그 맞은편 자리에서 번갈아 쏜다. 금빛 육망성은 똑바로 선 채 내려온다.
      if(t%72===0)bell(s,b.x,b.y,count(s,11),aim(s,b.x,b.y),1.7,96,.45,{color:YELLOW,size:1});
      if(t%72===36)bell(s,other,b.y,count(s,11),aim(s,other,b.y),1.7,96,.45,{color:CYAN,size:1});
      if(t%150===100)slots(s,pick(s,1,2,3),W,30).forEach(function(x){spawn(s,x,-30,Math.PI/2,76,{size:SHAPE_PROP,color:P.hexagram,life:900});});}},
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

  var PLAIN=[plainSpiral,plainLissajous,plainBells,plainCatenary,plainRings,plainHypocycloid,plainSunflower,plainCardioid,plainSuperformula],PLAIN_NAMES=['spiral','lissajous','bell','catenary','rings','hypocycloid','sunflower','cardioid','superformula'],plainCount=0,plainOf={},STAGES=[],SEGMENTS=[];
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
  var prevBoss='',lastNew='',midPlains={};
  SCENES.forEach(function(row,index){
    var g=DEFS[row[0]];if(!g)throw new Error('no stage for scene '+row[0]+' '+row[2]);
    if(g.partFile!==row[1])throw new Error('scene '+row[0]+' belongs to part '+row[1]);
    var stage={index:index,part:row[1],scene:row[0],name:row[2],kind:g.boss?'boss':'road',theme:g.theme,cast:g.cast||[],first:SEGMENTS.length,reward:g.reward,seconds:0};
    if(g.placeholder)stage.placeholder=true;
    stage.cast.forEach(function(k){if(!MOBS[k])throw new Error(row[2]+': unknown mob '+k);});
    function cards(list,mid,light){
      var actor=list[0],who=ACTORS[actor];if(!who)throw new Error(row[2]+': unknown actor '+actor);
      for(var k=1;k<list.length;k++){
        // 보스마다 고유한 일반 패턴 두 가지를 번갈아 쓴다. 처음 나온 순서 i번째 보스는 (2i, 2i+1) mod 9: 이어 나오는 두 보스는 겹치지 않는다.
        if(!plainOf[actor]){plainOf[actor]={i:plainCount++,n:0};lastNew=actor;}
        var po=plainOf[actor],pf=(2*po.i+po.n++%2)%9;
        var spell=spells[list[k]],last=!mid&&k===list.length-1;if(!spell)throw new Error(row[2]+': unknown pattern '+list[k]);
        if(spell.scene&&spell.scene!==row[0])throw new Error(row[2]+': pattern '+list[k]+' belongs to scene '+spell.scene);
        if(spell.used)throw new Error('pattern used twice: '+list[k]);spell.used=true;
        var lm=mid||light; // 길 맵의 보스는 예전 중간 인물의 체력·시간 그대로(맵 길이를 크게 늘리지 않는다)
        var plainFire=PLAIN[pf](who.c1,who.c2);
        // 초반 보스(1~6장, 사용자 11-18 "초반보스도 화려하게, 난이도는 조절"): 기본 패턴 자리에 이웃 기명 패턴의 화려한 모양을 40% 밀도·길어진 예고·가는 광선으로 미리 보여 준다(보스 맵에 한정, 중간보스 제외). 같은 모양이 바로 이어 반복되지 않게 다음(없으면 앞) 기명 패턴을 쓴다.
        if(index<=5&&!mid&&!light){var other=spells[list[k+1<list.length?k+1:k-1>=1?k-1:k]];if(other&&other.fire&&other!==spell)plainFire=(function(f){return function(s,tt){var d=s.density,r=s.rules,w=r.warn,bm=r.beam;s.density=Math.max(.4,d*.4);r.warn=w*1.4;r.beam=bm*.8;try{f(s,tt);}finally{s.density=d;r.warn=w;r.beam=bm;}};})(other.fire);}
        SEGMENTS.push({kind:'card',stage:index,actor:actor,mid:mid,spell:false,name:'',plain:PLAIN_NAMES[pf],hp:lm?200:170,time:lm?16:13,fire:plainFire});
        SEGMENTS.push({kind:'card',stage:index,actor:actor,mid:mid,spell:true,name:spell.name,scene:row[0],hp:spell.hp||(lm?420:last?600:520),time:spell.time||(lm?26:last?36:30),fire:spell.fire});
      }
    }
    function waves(list){list.forEach(function(script){SEGMENTS.push({kind:'wave',stage:index,duration:script.duration||760,script:script});});}
    // 중간보스: 일반 패턴 둘(이름 붙은 패턴 없음). 보스의 일반 패턴 순번과 섞이지 않게 따로 센다.
    function midboss(){var actor=midbossKey(row[0]),who=ACTORS[actor];if(!who)throw new Error(row[2]+': no midboss for scene '+row[0]);
      // 앞 맵 보스·이 맵 보스의 일반 패턴과 겹치지 않는 두 가지를 고른다(이어 만나는 두 인물은 일반 패턴을 나누지 않는다).
      // 처음 만나는 순서로 바로 앞·뒤 인물(앞서 처음 나온 인물, 다음에 처음 나올 인물)도 피한다.
      var taken={},mark=function(a){if(midPlains[a]){midPlains[a].forEach(function(c){taken[c]=true;});return;}var po=plainOf[a],i=po?po.i:plainCount;taken[(2*i)%9]=taken[(2*i+1)%9]=true;},picks=[];
      if(prevBoss)mark(prevBoss);if(lastNew)mark(lastNew);mark(bossList[0]);taken[(2*plainCount)%9]=taken[(2*plainCount+1)%9]=true;
      for(var q=0;q<9&&picks.length<2;q++){var c=(2*index+1+q*4)%9;if(!taken[c]&&picks.indexOf(c)<0)picks.push(c);}
      midPlains[actor]=picks;lastNew=actor;
      for(var n=0;n<2;n++){var pf=picks[n];SEGMENTS.push({kind:'card',stage:index,actor:actor,mid:true,midboss:true,spell:false,name:'',plain:PLAIN_NAMES[pf],hp:n?240:200,time:16,fire:PLAIN[pf](who.c1,who.c2)});}}
    var w=g.waves||[];if(w.length<2)throw new Error(row[2]+': a stage needs at least two mob waves');
    /* 맵마다 일반몹 → 중간보스 → 보스 → 다음 맵(사용자 11-16: 같은 보스가 나왔다 사라졌다 다시 나오면 피로하다).
     * 잡몹 구간은 모두 앞에 모은다. 보스는 한 번 나오면 그 맵의 패턴을 다 쓰고 쓰러진다.
     * 원래 중간 인물이 보스와 같거나 바로 앞 맵의 보스였으면 그 인물의 패턴은 보스 몫으로 앞에 붙이고 중간보스 표의 인물이 나온다.
     * 보스가 없던 맵(길)은 그 맵의 인물이 보스가 된다(체력·시간은 예전 중간 인물 그대로). */
    var bossList,midList=null,light=false;
    if(g.boss){bossList=g.boss.slice();if(g.mid[0]!==g.boss[0]&&g.mid[0]!==prevBoss)midList=g.mid;else bossList=[g.boss[0]].concat(g.mid.slice(1),g.boss.slice(1));}
    else{bossList=g.mid.slice();light=true;}
    waves(w);
    if(midList)cards(midList,true);else midboss();
    cards(bossList,false,light);prevBoss=bossList[0];
    for(var i=stage.first;i<SEGMENTS.length;i++){var x=SEGMENTS[i];stage.seconds+=x.kind==='wave'?x.duration/60+4:x.time*.7+2.5;}
    STAGES.push(stage);
  });
  /* 이 장면에서 이 인물을 그릴 그림 키(다른 모습이 없으면 인물 키 그대로). */
  function bossArtOf(actor,stageIndex){var g=STAGES[stageIndex];return (g&&BOSS_FORMS[actor+'@'+g.scene])||actor;}
  var CARD_TOTAL=SEGMENTS.filter(function(g){return g.kind==='card'&&g.spell;}).length;
  /* 56장면의 짧은 원큐 여정. 작성된 패턴과 구간 번호는 그대로 두고 반복 일반탄만 생략한다.
   * segment 직접 시작은 연습/전체 패턴 검사이므로 기본은 원래 길이; pacing:true로 실제 여정 길이를 검사한다.
   * nominalMinutes는 목표 예산이지 플레이어별 완료 시간 보장이 아니다. */
  var PACING={
    // 일반 탄이 주포를 막지 않는 규칙의 실제 사격 시간으로 재측정했다. 탄속·발사 박자는 바꾸지 않는다.
    gentle:{nominalMinutes:60,waveMinutes:20,bossMinutes:35,presentationMinutes:5,hpScale:.75,skipRepeatedPlain:true},
    normal:{nominalMinutes:90,waveMinutes:30,bossMinutes:55,presentationMinutes:5,hpScale:1.3,skipRepeatedPlain:true},
    hell:{nominalMinutes:120,waveMinutes:40,bossMinutes:75,presentationMinutes:5,hpScale:1.3,skipRepeatedPlain:false}
  };
  var REPEATED_PLAIN={},pacingTotals={};
  (function(){var seen={};SEGMENTS.forEach(function(g,i){if(g.kind!=='card'||g.spell)return;var key=g.stage+':'+g.actor;if(seen[key])REPEATED_PLAIN[i]=true;seen[key]=true;});
    Object.keys(PACING).forEach(function(d){var p=PACING[d],wave=0,boss=0,waves=0,cards=0;SEGMENTS.forEach(function(g,i){if(p.skipRepeatedPlain&&REPEATED_PLAIN[i])return;if(g.kind==='wave'){wave+=g.duration;waves++;}else{boss+=g.time;cards++;}});pacingTotals[d]={waveTicks:wave,bossSeconds:boss,waves:waves,cards:cards};});})();
  function plannedSegments(difficulty){var p=PACING[difficulty]||PACING.normal;return SEGMENTS.map(function(g,i){return i;}).filter(function(i){return !p.skipRepeatedPlain||!REPEATED_PLAIN[i];});}
  function waveDuration(s,g){if(!s.paced)return g.duration;var p=PACING[s.difficulty],tot=pacingTotals[s.difficulty];return Math.max(120,Math.round(g.duration*(p.waveMinutes*3600-tot.waves*30)/tot.waveTicks));}
  function cardDuration(s,g){var up=s.entranceAll?BOSS_STAY*(g.mid?MID_UP[s.difficulty]||2.5:1):1;if(!s.paced)return g.time*up;var p=PACING[s.difficulty],tot=pacingTotals[s.difficulty];return Math.max(3,g.time*p.bossMinutes*60/tot.bossSeconds*1.4)*up;}
  function cardHp(s,g){if(s.entranceAll)return Math.round((s.paced?Math.max(20,Math.round(g.hp*PACING[s.difficulty].hpScale)):g.hp)*BOSS_HP_UP*(g.mid?MID_UP[s.difficulty]||2.5:1));return s.paced?Math.max(20,Math.round(g.hp*PACING[s.difficulty].hpScale)):g.hp;}
  function pacingReport(difficulty){var d=PACING[difficulty]?difficulty:'normal',p=PACING[d],tot=pacingTotals[d],s={difficulty:d,paced:true},wave=0,boss=0;plannedSegments(d).forEach(function(i){var g=SEGMENTS[i];if(g.kind==='wave')wave+=(waveDuration(s,g)+30)/60;else boss+=cardDuration(s,g);});return {difficulty:d,targetMinutes:p.nominalMinutes,waveBudgetMinutes:wave/60,bossBudgetMinutes:p.bossMinutes,cardHpScale:p.hpScale,cardTimeoutMinutes:boss/60,presentationBudgetMinutes:p.presentationMinutes,waves:tot.waves,cards:tot.cards,skippedPlain:SEGMENTS.length-tot.waves-tot.cards};}
  function stageTargetSeconds(difficulty,index){var d=PACING[difficulty]?difficulty:'normal',p=PACING[d],tot=pacingTotals[d],seconds=p.presentationMinutes*60/STAGES.length;plannedSegments(d).forEach(function(i){var g=SEGMENTS[i];if(g.stage===index)seconds+=g.kind==='wave'?g.duration/tot.waveTicks*p.waveMinutes*60:g.time/tot.bossSeconds*p.bossMinutes*60;});return seconds;}
  STAGES.forEach(function(g){g.authoredSeconds=g.seconds;g.seconds=stageTargetSeconds('normal',g.index);});



  /* options: {hero('memory' 또는 'seoha'), difficulty, seed, stage(시작 스테이지), segment(시작 구간), compact(휴대폰 모드), bossOnly(보스 체험: 그 스테이지의 보스전만), growth(중간에서 시작하면 그만큼 자란 공격·필살 단계로)} */
  function createRun(options){
    options=options||{};var difficulty=DIFFICULTY[options.difficulty]?options.difficulty:'normal',rules=Object.assign({},DIFFICULTY[difficulty]),compact=!!options.compact;
    var startSeg=Number.isInteger(options.segment)&&SEGMENTS[options.segment]?options.segment:Number.isInteger(options.stage)&&STAGES[options.stage]?STAGES[options.stage].first:0;
    var selectedHero=heroProfile(options);
    var s={revision:43,entranceAll:options.entranceAll===true,srng:((options.seed|0)*2246822519+374761393)>>>0||7,hero:selectedHero?selectedHero.id:'memory',rhythm:options.rhythm===true,paced:options.pacing===true||(options.pacing!==false&&!Number.isInteger(options.segment)),difficulty:difficulty,rules:rules,compact:compact,density:rules.density*(compact?COMPACT_DENSITY:1),sizeScale:(compact?COMPACT_SIZE:1)*(options.entranceAll===true?LIVE_GROW:1),cap:compact?COMPACT_CAP:CAP,
      seed:(options.seed>>>0)||1,rng:(options.seed>>>0)||1,tick:0,stage:'break',stageTick:BREAK_TICKS-30,seg:startSeg-1,segTick:0,stageIndex:SEGMENTS[startSeg].stage,spellNumber:0,
      ability:Math.max(0,Math.min(ABILITY_MAX,options.ability|0)),player:{x:W/2,y:H-84,hp:rules.hp,maxHp:rules.hp,invulnerableUntil:0,r:rules.radius,focus:false},
      boss:{x:W/2,y:-60,targetX:W/2,targetY:132,hp:1,maxHp:1,actor:'',name:'',mid:false,hitTick:-99,leaving:false,present:false,down:null},
      bossOnly:!!options.bossOnly,spellOnly:!!(options.spellOnly&&SEGMENTS[startSeg].kind==='card'),spellSeg:startSeg,rushStage:SEGMENTS[startSeg].stage,bombs:rules.bombs,gauge:0,spellClean:false,captures:0,itemsTaken:0,lane:undefined,
      n:0,drifted:[],mobDrops:0,hearts:0,pieces:0,gets:[],lastCapture:null,jackpots:0,lastJackpot:null,dropped:0,peak:0,score:0,graze:0,hits:0,kills:0,cleared:0,timeouts:0,events:[],cancelled:[],pops:[],lasers:[],mobs:[],warned:false,sn:0,itemCount:0,
      lastStage:STAGES.length-1,lastWipe:-1e9,started:false,results:[],bombsUsed:0,autoBombs:0,distorts:0,orbsBroken:0,orbSerial:0,orbFragments:0,bombPulse:null,pulseInfo:null,noDistort:options.distort===false,drng:((((options.seed>>>0)||1)*2246822519)^0x9e3779b9)>>>0||7,power:1,exp:0,bombLevel:1,fills:0,hasteUntil:-1,zaps:[],skillFx:[],fsSwords:[],fsNext:0,fsLabelTick:-1e9,fsCasts:0,fsHits:0,frng:((((options.seed>>>0)||1)*3266489917)^0x85ebca6b)>>>0||11,lastBomb:null,mark:{tick:0,score:0,hits:0,bombs:0,captures:0,spells:0}};
    if(Number.isInteger(options.stages)&&options.stages>0)s.lastStage=Math.min(STAGES.length-1,s.stageIndex+options.stages-1);
    ['bx','by','ba','bs','bturn','bacc','bmin','bmax','barg','bs2','bspin','bhp'].forEach(function(k){s[k]=new Float32Array(CAP);});
    ['bage','blife','bat','bgrace'].forEach(function(k){s[k]=new Uint16Array(CAP);});
    ['bsize','bcolor','bgrazed','bmode','bgen','bbounce','bbreakable','bfragment','bformation','bexit','bmirror'].forEach(function(k){s[k]=new Uint8Array(CAP);});s.figures=[];s.ripples=[];s.floor=freshFloor(s,s.stageIndex);
    s.sx=new Float32Array(SHOT_CAP);s.sy=new Float32Array(SHOT_CAP);s.svx=new Float32Array(SHOT_CAP);s.shoming=new Uint8Array(SHOT_CAP);s.skind=new Uint8Array(SHOT_CAP);s.sspd=new Float32Array(SHOT_CAP);s.tbombs=[];s.shotHits=[];s.volleys=0;s.tbNext=0;
    if(options.growth){/* 화면이 켜 준 경우만(검사·연습용 구간 시작은 1단계 그대로): 시작 챕터의 기본 레벨부터 */s.growth=true;liftToFloor(s,true);}
    if(options.grown){var ge=+options.grown.exp,gf=+options.grown.fills;if(ge>s.exp){s.exp=ge;s.power=levelOf(POWER_EXP,ge);}if(gf>s.fills){s.fills=gf;s.bombLevel=levelOf(BOMB_FILLS,gf);}} // 중간 저장에서 이어 하면 그때까지 자란 단계 그대로(11-16 실검증: 이어하기 뒤 필살 단계가 내려가던 문제)
    s.ix=new Float32Array(ITEM_CAP);s.iy=new Float32Array(ITEM_CAP);s.ivy=new Float32Array(ITEM_CAP);s.ikind=new Uint8Array(ITEM_CAP);
    // 구간을 직접 지정하면(연습·검사) 그 구간에서 바로 시작한다.
    applyCurve(s);
    if(Number.isInteger(options.segment)&&SEGMENTS[options.segment]){s.started=true;s.seg=startSeg;s.stageTick=0;s.stage=SEGMENTS[startSeg].kind==='wave'?'wave':'intro';}
    return s;
  }
  function removeBullet(s,i){
    var j=--s.n;if(i===j)return;
    s.bx[i]=s.bx[j];s.by[i]=s.by[j];s.ba[i]=s.ba[j];s.bs[i]=s.bs[j];s.bturn[i]=s.bturn[j];s.bacc[i]=s.bacc[j];s.bmin[i]=s.bmin[j];s.bmax[i]=s.bmax[j];s.barg[i]=s.barg[j];s.bs2[i]=s.bs2[j];s.bspin[i]=s.bspin[j];s.bhp[i]=s.bhp[j];
    s.bage[i]=s.bage[j];s.blife[i]=s.blife[j];s.bat[i]=s.bat[j];s.bsize[i]=s.bsize[j];s.bcolor[i]=s.bcolor[j];s.bgrazed[i]=s.bgrazed[j];s.bmode[i]=s.bmode[j];s.bgen[i]=s.bgen[j];s.bbounce[i]=s.bbounce[j];s.bbreakable[i]=s.bbreakable[j];s.bfragment[i]=s.bfragment[j];s.bformation[i]=s.bformation[j];s.bgrace[i]=s.bgrace[j];s.bexit[i]=s.bexit[j];s.bmirror[i]=s.bmirror[j];
  }
  // 화면의 탄과 광선을 모두 지우고, 지운 탄 자리를 연출용으로 남긴다(최대 320개). 지운 탄 수를 돌려준다.
  function cancelAll(s,drift){
    var n=s.n;
    // drift: 패턴·구간이 끝나 지운 탄은 터지지 않고 제 길로 화면 아래까지 흘러가며 흐려진다(판정 없음, 화면 연출용). 사용자 11-14: 탄이 닿기 직전 끊기면 맥빠짐.
    if(drift){for(var j=0;j<n&&s.drifted.length<DRIFT_CAP*5;j++)s.drifted.push(s.bx[j],s.by[j],s.bsize[j]===SHAPE_PROP?WHITE:s.bcolor[j],s.ba[j],s.bs[j]*TICK);}
    else for(var i=0;i<n&&s.cancelled.length<320*3;i++)s.cancelled.push(s.bx[i],s.by[i],s.bsize[i]===SHAPE_PROP?WHITE:s.bcolor[i]);
    s.n=0;s.lasers.length=0;s.figures.length=0;s.ripples.length=0;if(s.floor)s.floor.pieces.length=0;return n;
  }
  /* 탄은 화면 밖으로 나가야만 사라진다(사용자 11-19 "모든탄환은 맵밖으로 나가야 사라지게 해주고(필살기등예외) 몹이나 보스가 없고 탄환만 있을때는 탄환을 가속시켜 맵으로 완전히 나가게하고 그다음 다음 몹이나 보스가 등장", 모든 난이도).
     실제 게임(entranceAll)에서 구간 전환·피격·보스 쓰러짐 때 탄을 지우지 않고 '나가는 탄'으로 바꾼다: 판정 없이 제 방향으로 점점 빨라져 화면 밖으로 빠진다. 필살기(useBomb)는 예외로 그대로 지운다. 나가게 한 탄 수를 돌려준다. */
  var EXIT_GROW=1.035,EXIT_MAX=900,EXIT_TURN=.14,WAVE_LINGER=360; // 나가는 탄의 가속은 11-19 21:22 사용자 "탄환이 사라지는 속도 지금보다 2배더 길게"로 1.08→1.035(빠져나가는 시간 약 2배). 몹이 다 사라져도 탄은 약 6초 남았다가(사용자 11-19) 아래로 빠르게 빠진다
  /* 반사탄이 벽에 튕긴 자리(그리기용 기록, 판정 없음): 앱이 벗겨진 고리가 번지며 흩어지는 연출로 쓴다 */
  function mirrorHit(s,i,x,y){var h=s.mirrorHits||(s.mirrorHits=[]);if(h.length<24)h.push({x:x,y:y,size:s.bsize[i],left:s.bbounce[i]});}
  function flushBullets(s){var n=0;for(var i=0;i<s.n;i++){if(s.bexit[i])continue;s.bexit[i]=1;s.bbounce[i]=0;s.bat[i]=0;s.bturn[i]=0;s.bacc[i]=0;s.blife[i]=65535;n++;}return n;}
  /* 판정은 그대로 둔 채 지금 방향으로 점점 빨라져 맵 밖으로 나가게 한다(갑자기 사라지거나 판정이 꺼지지 않는다) */
  var HURRY_ACC=300,HURRY_MAX=440;
  function hurryBullets(s){for(var i=0;i<s.n;i++){if(s.bexit[i]||s.bsize[i]===SHAPE_PROP)continue;s.bformation[i]=1;s.bbounce[i]=0;s.bat[i]=0;s.bturn[i]=0;s.bacc[i]=HURRY_ACC;if(s.bmax[i]<HURRY_MAX)s.bmax[i]=HURRY_MAX;s.blife[i]=65535;}}
  function driftBullets(s){for(var j=0;j<s.n&&s.drifted.length<DRIFT_CAP*5;j++)s.drifted.push(s.bx[j],s.by[j],s.bsize[j]===SHAPE_PROP?WHITE:s.bcolor[j],s.ba[j],s.bs[j]*TICK);s.n=0;}
  function exiting(s){for(var i=0;i<s.n;i++)if(s.bexit[i])return true;return false;}
  function clearNonBullets(s){s.lasers.length=0;s.figures.length=0;s.ripples.length=0;if(s.floor)s.floor.pieces.length=0;}
  /* 패턴·잡몹 구간이 끝날 때 화면 탄을 지우는 것은 1분에 한 번(사용자 11-15 "하트모으면 탄모두없어지는거 쿨타임 1분으로해서 너무 자주 발생하지않게", 카드 답: 패턴 깰 때).
     쿨타임 중에는 탄이 그대로 남아 계속 날아온다(하트는 그대로 떨어진다). 보스의 광선·문양·고리는 패턴과 함께 끝나므로 늘 걷는다. 지운 탄 수를 돌려준다. */
  var WIPE_COOLDOWN=3600;
  function breakWipe(s){
    if(s.tick-s.lastWipe>=WIPE_COOLDOWN){s.lastWipe=s.tick;if(s.entranceAll){clearNonBullets(s);return flushBullets(s);}return cancelAll(s,true);}
    s.lasers.length=0;s.figures.length=0;note(s,'wipeCooling');return 0;
  }
  /* 아이템 하나를 떨군다. kind 0 점수, 1 폭탄 조각. 위로 살짝 튀었다가 천천히 내려온다. */
  var DROP_BELOW=68;
  /* 쓰러진 보스의 하트 자리: 보스 이름으로 정한 제각각의 흩뿌림(사용자 11-16 "남은 지적 개선": 매번 같은 반원 고리처럼 놓이지 않게). 발치 구름 속, 한쪽으로 쏠리기도 한다 */
  function dropAt(actor,i,n,bx,by,axis){var h=0,k;actor=String(actor||'');for(k=0;k<actor.length;k++)h=(Math.imul(h,31)+actor.charCodeAt(k))>>>0;
    var r=function(j){var v=Math.imul(h^(j*2654435761),1597334677)>>>0;v=(v^(v>>>15))>>>0;return (v%1000)/1000;},lean=(r(97)-.5)*30;
    return axis?by+DROP_BELOW-14+r(i*2+7)*30:bx+lean+(i-(n-1)/2)*(24+r(31)*14)+(r(i*2+3)-.5)*14;}
  function dropItem(s,x,y,kind){if(!kind)s.hearts++;if(s.itemCount>=ITEM_CAP)return;var i=s.itemCount++;s.ix[i]=Math.max(10,Math.min(W-10,x));s.iy[i]=y;s.ivy[i]=-1.6;s.ikind[i]=kind||0;}
  function fillGauge(s){while(s.gauge>=GAUGE_FULL){s.gauge-=GAUGE_FULL;s.fills++;var bl=levelOf(BOMB_FILLS,s.fills);if(bl>s.bombLevel){s.bombLevel=bl;note(s,'bombLevelUp');}if(s.bombs<MAX_BOMBS){s.bombs++;note(s,'bombGain');}}}
  /* 동방식 점수 순환(2026-11-20): 스침이 쌓일수록 하트 한 개의 값이 오르고(pointValue), 수집선(AUTO_COLLECT_Y) 위에서 거두면 그 값을 다 받는다.
     선 아래에서는 높이에 따라 30%~100%. 화면은 s.gets(x,y,값,최대?)로 받은 값을 띄운다(최대값은 금빛). 원작의 수치·그림이 아니라 '위험을 무릅쓰면 값이 오른다'는 원리만 가져왔다. */
  var POINT_BASE=500,POINT_PER_STAGE=150,POINT_PER_GRAZE=10,POINT_MAX=9990,POINT_LOW=.3,GETS_CAP=40;
  function pointValue(s){return Math.min(POINT_MAX,POINT_BASE+(s.stageIndex||0)*POINT_PER_STAGE+(s.graze||0)*POINT_PER_GRAZE);} // 뒤 스테이지일수록 기본값이 크다(봉인 보너스가 스테이지에 비례해 커지는 것과 발을 맞춘다)
  function heartWorth(s,y){var k=Math.max(0,Math.min(1,(H-y)/(H-AUTO_COLLECT_Y)));return Math.round(pointValue(s)*(POINT_LOW+(1-POINT_LOW)*k)/10)*10;}
  /* 봉인 보너스(스펠 보너스): 이름 붙은 패턴을 맞지 않고 필살기 없이 넘기면 받는다. 처음 값에서 시작해 SPELL_DECAY_FROM초 뒤부터 SPELL_DECAY_OVER초에 걸쳐
     1/3까지 줄어든다(빨리 끝낼수록 크다). 실제 게임은 페이즈 최소 시간(CARD_MIN) 동안 보스가 쓰러지지 않으므로 그 시간이 지난 뒤부터 줄기 시작한다. */
  var SPELL_DECAY_FROM=20,SPELL_DECAY_OVER=40,SPELL_FLOOR=1/3,LIFE_PIECES=3;
  function spellBonusBase(card){return 20000+card.stage*5000;}
  function spellBonus(s){var card=segment(s);if(!card||!card.spell||s.stage!=='card')return 0;if(s.bonusLock)return s.bonusLock; // 체력을 다 깎은 순간 값이 굳는다(외부 심사 11-20: 소진 뒤 17초 동안 줄던 것)
    var el=Math.max(0,s.segTick-cardFireDelay(s))/60,k=Math.max(0,Math.min(1,(el-SPELL_DECAY_FROM)/SPELL_DECAY_OVER));return Math.round(spellBonusBase(card)*(1-(1-SPELL_FLOOR)*k)/10)*10;}
  /* 봉인 조각: 봉인 LIFE_PIECES 번마다 목숨 하나를 되찾는다. 목숨이 가득이면 필살기 하나(그것도 가득이면 점수). */
  function gainPiece(s){s.pieces++;if(s.pieces<LIFE_PIECES)return;s.pieces-=LIFE_PIECES;var p=s.player;
    var got=p.hp<p.maxHp?'life':s.bombs<MAX_BOMBS?'bomb':'score';if(s.lastCapture)s.lastCapture.gift=got; // 낙관에 실제로 받은 것을 찍는다(연출 제안서 11-20)
    if(got==='life'){p.hp++;note(s,'extend');}else if(got==='bomb'){s.bombs++;note(s,'bombGain');}else s.score+=10000;}
  /* 격파 잭팟(사용자 11-20 "중간보스 잡으면 하트를 난이도에 맞게 주고 보스를 잡으면 난이도+점수에 맞게 하트를 많이 주도록(잭팟느낌나게)"):
     그 인물의 마지막 패턴을 깨는 순간 하트 n개를 한꺼번에, 수집선 위 최대값으로 준다(보스 격파 때 모두 거두는 탄막 게임의 관습).
     중간보스는 난이도별 개수, 보스는 난이도 기본 + 지금 점수의 제곱근에 비례한 덤(뒤로 갈수록·잘할수록 크지만 끝없이 늘지 않게 JACKPOT_SCORE_MAX).
     점수는 즉시 더한다: 격파 뒤 2초 연출 동안 나가도 결과·최고점에 남는다. 하트가 솟구쳐 영웅에게 쏟아지는 그림은 표시층(arcade-spirit-v43.js)이 그린다. */
  var JACKPOT_MID={gentle:4,normal:6,hell:8},JACKPOT_BOSS={gentle:12,normal:16,hell:20},JACKPOT_SCORE_STEP=150000,JACKPOT_SCORE_MAX=18;
  function jackpotCount(s,mid){var d=JACKPOT_BOSS[s.difficulty]?s.difficulty:'normal';if(mid)return JACKPOT_MID[d];return JACKPOT_BOSS[d]+Math.min(JACKPOT_SCORE_MAX,Math.floor(Math.sqrt(Math.max(0,s.score||0)/JACKPOT_SCORE_STEP)));}
  function jackpot(s,mid,x,y){var n=jackpotCount(s,mid),worth=heartWorth(s,AUTO_COLLECT_Y),total=n*worth;s.score+=total;s.jackpots=(s.jackpots||0)+1;
    s.lastJackpot={mid:!!mid,n:n,worth:worth,total:total,x:x,y:y,tick:s.tick,difficulty:s.difficulty};note(s,'jackpot');}
  function updateItems(s){
    var p=s.player,pull=p.y<AUTO_COLLECT_Y,reach=p.focus?ITEM_REACH+10:ITEM_REACH;
    for(var i=s.itemCount-1;i>=0;i--){
      var dx=p.x-s.ix[i],dy=p.y-s.iy[i],d=Math.sqrt(dx*dx+dy*dy);
      // 화면 위쪽으로 올라가 있으면 모든 아이템이 빨려 온다. 아니면 가까운 것만 끌려온다.
      if(pull||d<60){var step=pull?ITEM_PULL:5;if(d>step){s.ix[i]+=dx/d*step;s.iy[i]+=dy/d*step;d-=step;}else d=0;}
      else{s.ivy[i]=Math.min(1.5,s.ivy[i]+.05);s.iy[i]+=s.ivy[i];}
      if(d<reach){
        // 높은 곳에서 먹을수록 값이 크다.
        if(s.ikind[i]===1)s.gauge+=25;else{var top=pull||p.y<AUTO_COLLECT_Y,worth=heartWorth(s,top?AUTO_COLLECT_Y:p.y);s.score+=worth;if(s.gets.length<GETS_CAP*4)s.gets.push(s.ix[i],s.iy[i],worth,top?1:0);}
        s.itemsTaken++;note(s,'item');
      }else if(s.iy[i]<=H+20)continue;
      var j=--s.itemCount;s.ix[i]=s.ix[j];s.iy[i]=s.iy[j];s.ivy[i]=s.ivy[j];s.ikind[i]=s.ikind[j];
    }
    fillGauge(s);
  }
  function killMob(s,k){var m=s.mobs[k];s.score+=m.score;s.kills++;gainExp(s,m.elite?5:1);s.pops.push(m.x,m.y,m.elite?1:0);note(s,'kill');
    if(m.elite)for(var i=0;i<ELITE_DROPS;i++)dropItem(s,m.x+(i-1)*12,m.y,i===1?1:0);else if(++s.mobDrops%MOB_DROP_EVERY===0)dropItem(s,m.x,m.y,0);s.mobs.splice(k,1);}
  /* 시공간 왜곡 확률: 공격 단계마다 5%씩, 1단계 7% → 7단계 37%(사용자: 기본 7%, 풀강화 37% 이하). 탄 패턴의 난수와 따로 굴려 패턴이 바뀌지 않게 한다 */
  function distortChance(s){return s.difficulty==='hell'?0:DISTORT_CHANCE[Math.max(1,Math.min(MAX_LEVEL,s.power||1))];}
  function distortRoll(s){if(s.difficulty==='hell'||s.noDistort)return false;var x=s.drng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.drng=x>>>0;return s.drng/4294967296<distortChance(s);}
  function bombPulse(s){
    var q=s.bombPulse;if(!q||s.tick<q.next||s.stage==='won'||s.stage==='lost')return;
    var pw=BOMB_POWER[q.lv],targets=[],k;q.left--;q.next=s.tick+BOMB_PULSE_EVERY;
    if(s.stage==='card'){s.boss.hp-=pw[0]/BOMB_PULSES;targets.push(s.boss.x,s.boss.y);}
    for(k=s.mobs.length-1;k>=0;k--){var m=s.mobs[k];if(targets.length<24)targets.push(m.x,m.y);m.hp-=pw[1]/BOMB_PULSES;m.hitTick=s.tick;if(m.hp<=0)killMob(s,k);}
    s.pulseInfo={index:BOMB_PULSES-q.left,targets:targets,x:s.player.x,y:s.player.y};note(s,'bombPulse');
    if(q.left<=0)s.bombPulse=null;
  }
  function useBomb(s){
    if(s.bombs<=0||s.stage==='won'||s.stage==='lost')return;
    var lv=s.bombLevel,pw=BOMB_POWER[lv],targets=[];
    s.bombs--;s.bombsUsed++;s.spellClean=false;s.score+=cancelAll(s)*10;s.player.invulnerableUntil=Math.max(s.player.invulnerableUntil,s.tick+BOMB_TICKS);s.hasteUntil=s.tick+HASTE_TICKS;
    s.bombPulse={left:BOMB_PULSES,next:s.tick+BOMB_PULSE_START,lv:lv}; // 피해는 컷씬 뒤 BOMB_PULSES 번에 나눠 들어간다(총합은 예전 한 번과 같다, 사용자 11-16)
    if(s.stage==='card')targets.push(s.boss.x,s.boss.y);
    for(var k=0;k<s.mobs.length&&targets.length<24;k++)targets.push(s.mobs[k].x,s.mobs[k].y);
    s.lastBomb={hero:s.hero,level:lv,name:bombName(s,lv),x:s.player.x,y:s.player.y,tick:s.tick,targets:targets};note(s,'bomb'); // 화면은 이 단계·과녁 자리로 필살기 연출을 그린다
  }
  function segment(s){return SEGMENTS[s.seg];}
  /* 스테이지 하나를 마쳤다. 그 스테이지 동안의 기록을 남긴다. 별: 깨면 1, 한 번도 안 맞으면 +1, 폭탄을 안 쓰면 +1. */
  function clearBonus(index,graze,hits,bombs){return (index+1)*2000+graze*20+(hits===0?5000:0)+(bombs===0?3000:0);}
  function closeStage(s,index){
    var m=s.mark,hits=s.hits-m.hits,bombs=s.bombsUsed-m.bombs,graze=s.graze-(m.graze||0),bonus=clearBonus(index,graze,hits,bombs);s.score+=bonus; // 결산: 스테이지·스침·무피격·무필살을 한 줄로 더한다
    s.results.push({stage:index,ticks:s.tick-m.tick,score:s.score-m.score,hits:hits,bombs:bombs,captures:s.captures-m.captures,spells:s.spellNumber-m.spells,stars:1+(hits===0?1:0)+(bombs===0?1:0),graze:graze,bonus:bonus});
    m.tick=s.tick;m.score=s.score;m.hits=s.hits;m.bombs=s.bombsUsed;m.captures=s.captures;m.spells=s.spellNumber;m.graze=s.graze;note(s,'stageClear');
  }
  // 실제 진행과 보스의 마지막 카드 판정이 같은 계획을 읽는다. 체험/반복 생략/마지막 맵 제한도 여기서만 적용한다.
  function nextSegmentIndex(s){
    var at=s.seg+1;
    if(s.spellOnly&&s.seg>=s.spellSeg)return SEGMENTS.length; // 스펠 연습(외부 심사 11-20 '방금 맞은 스펠 다시 연습'): 그 패턴 하나만 하고 끝난다
    // 보스 체험: 잡몹 구간을 건너뛰고, 고른 스테이지의 중간 보스와 보스만 싸운 뒤 끝난다.
    if(s.bossOnly){while(SEGMENTS[at]&&SEGMENTS[at].kind==='wave')at++;if(SEGMENTS[at]&&SEGMENTS[at].stage!==s.rushStage)at=SEGMENTS.length;}
    if(s.paced&&PACING[s.difficulty].skipRepeatedPlain){while(REPEATED_PLAIN[at])at++;}
    return SEGMENTS[at]&&SEGMENTS[at].stage<=s.lastStage?at:SEGMENTS.length;
  }
  /* 다음 구간으로. 맵이 바뀌면 난이도 규칙대로 목숨을 채우고, 인물이 바뀌면 이전 보스를 내보낸다. */
  function advance(s){
    var prev=segment(s),at=nextSegmentIndex(s),p=s.player,next=SEGMENTS[at];
    if(s.started&&prev&&(!next||next.stage!==prev.stage)){
      var committed=s.bossClear&&s.bossClear.stageCommitted&&s.bossClear.segment===s.seg&&s.bossClear.stageIndex===prev.stage;
      if(committed)s.mark.tick=s.tick; // 격파 때 저장한 결과는 그대로. 2초 연출은 다음 맵의 전투 시간에도 넣지 않는다.
      else closeStage(s,prev.stage);
    }
    s.started=true;
    if(!next){s.stage='won';s.stageTick=0;note(s,'win');return;}
    s.seg=at;s.segTick=0;s.stageTick=0;s.lane=undefined;
    if(next.stage!==s.stageIndex){var oldPart=STAGES[s.stageIndex].part;s.stageIndex=next.stage;applyCurve(s);var heal=STAGES[next.stage].part!==oldPart?s.rules.partHeal:0;if(heal&&p.hp<p.maxHp){p.hp=heal<0?p.maxHp:Math.min(p.maxHp,p.hp+heal);note(s,'extend');}if(s.growth&&STAGES[next.stage].part!==oldPart)liftToFloor(s);note(s,'map');}
    if(next.kind==='wave'){s.boss.leaving=s.boss.present;s.stage='wave';note(s,'wave');return;}
    if(!prev||prev.kind!=='card'||prev.actor!==next.actor||!s.boss.present){s.boss.leaving=s.boss.present;s.stage='intro';}else s.stage='break';
  }
  var CALM_BELOW=20,BOSS_REST=156,BOSS_SWAY=40,BOSS_ROAM=58,BOSS_ENTRANCE_GRACE=120,BOSS_ENTRANCE_SPEECH=190,BOSS_ENTRANCE_MID=80,ENTRANCE_CUTIN=54,BOSS_CLEAR_TICKS=120; // 좌우는 가운데 3분의 1 안: 문양이 칸 가장자리에 잘리지 않게(심사 6.53)
  // 컷신 준비는 폭탄/격파가 아니다. 점수·아이템·경험치·쿨타임을 건드리지 않고 공격 잔재만 걷는다.
  // 지워지는 탄·잡몹 자리를 앱이 '먹물로 번져 스러짐'으로 그리도록 남긴다(사용자 11-18 "탄환이 갑자기 뜬금없이 사라질때 … 연출을 좀 납득가능하게"). 판정은 없다.
  var INK_DISSOLVE_CAP=480;
  function inkDissolve(s){
    var ink=s.inked||(s.inked=[]),i;
    for(i=0;i<s.n&&ink.length<INK_DISSOLVE_CAP*4;i++)ink.push(s.bx[i],s.by[i],s.bsize[i]===SHAPE_PROP?WHITE:s.bcolor[i],s.bsize[i]===SHAPE_PROP?2:1);
    for(i=0;i<s.mobs.length&&ink.length<INK_DISSOLVE_CAP*4;i++)if(s.mobs[i].y>-10)ink.push(s.mobs[i].x,s.mobs[i].y,WHITE,3);
    return ink.length;
  }
  function clearBossEntranceHazards(s){
    var inked=inkDissolve(s);
    s.n=0;s.sn=0;s.mobs.length=0;s.lasers.length=0;s.figures.length=0;s.ripples.length=0;
    s.cancelled.length=0;s.drifted.length=0;s.pops.length=0;s.zaps.length=0;s.skillFx.length=0;s.fsSwords.length=0;if(s.tbombs)s.tbombs.length=0;if(s.shotHits)s.shotHits.length=0;
    s.bombPulse=null;s.pulseInfo=null;s.lastBomb=null;s.warned=false;
    s.risers=s.risers||[];s.risers.length=0;s.riserDue=0;s.riserT=0;s.riserN=0;s.riserStage=s.stageIndex;
    if(s.risen===undefined)s.risen=0;if(s.riserRng===undefined)s.riserRng=((s.seed*40503)^(s.stageIndex*2654435761+7))>>>0||1;
    var F=s.floor;if(F){F.grid.fill(0);F.hill.fill(0);F.goal.fill(0);F.pieces.length=0;F.warns.length=0;if(F.bursts)F.bursts.length=0;F.clearing=0;F.kind='';F.t=0;}
    // 구간 저장·맵 변경은 유지한다. 이전 공격의 소리/번개/필살 연출은 컷신 뒤 다시 재생하지 않는다.
    s.events=s.events.filter(function(e){return e==='map'||e==='stageClear'||e==='extend';});
    return inked;
  }
  /* 앱이 본보스 컷신 시작(또는 이미 본 컷신을 건너뜀) 직전에 한 번 준비한다.
   * 미호출 시 기존 대본 시간은 그대로다. 실제 enter()부터 120틱 동안 양쪽 공격을 쉬며,
   * 컷신 중 앱이 step()을 부르지 않으면 tick/등장 대기도 진행되지 않는다. */
  function prepareBossEntrance(s){
    var g=segment(s);if(s.stage!=='intro'||!g||g.kind!=='card'||!hasEntrance(s,g)||s.bossEntrance&&s.bossEntrance.segment===s.seg)return false;
    clearBossEntranceHazards(s);var entered=s.boss.present&&!s.boss.leaving&&s.boss.actor===g.actor?(s.boss.enteredTick===undefined?s.tick:s.boss.enteredTick):null;
    s.bossEntrance={segment:s.seg,enteredTick:entered,readyTick:entered===null?null:entered+graceOf(s),releasedTick:null};
    s.cinematicEncounter={actor:g.actor,stageIndex:g.stage,segment:s.seg};return true;
  }
  /* 입장 연출 단계: 'cutin'(보스 수묵 컷인, 아직 판에 없음) → 'speech'(판에 들어서 대사) → 전투. 화면은 이 값으로 컷인·대사 상자를 그린다. */
  function entrancePhase(s){
    var e=s.bossEntrance;if(!e||e.segment!==s.seg||s.stage!=='intro')return null;
    if(e.enteredTick===null||e.enteredTick===undefined||!s.boss.present||s.boss.leaving)return {phase:'cutin',t:Math.min(1,s.stageTick/ENTRANCE_CUTIN)};
    if(e.readyTick===null||s.tick>=e.readyTick)return null;
    return {phase:'speech',t:Math.max(0,Math.min(1,(s.tick-e.enteredTick)/graceOf(s)))};
  }
  function skipEntrance(s){
    var ph=entrancePhase(s);if(!ph)return false;
    if(ph.phase==='cutin'){if(s.stageTick<ENTRANCE_CUTIN)s.stageTick=ENTRANCE_CUTIN;return true;}
    var e=s.bossEntrance;e.readyTick=Math.min(e.readyTick,s.tick+24);return true;
  }
  function enter(s,actor){var b=s.boss;b.actor=actor;b.name=ACTORS[actor].name;b.mid=!!segment(s).mid;b.present=true;b.leaving=false;b.x=W/2;b.y=-60;b.targetX=W/2;b.targetY=BOSS_REST;b.enteredTick=s.tick;s.stageTick=0;
    var e=s.bossEntrance;if(e&&e.segment===s.seg){e.enteredTick=s.tick;e.readyTick=s.tick+graceOf(s);}
    note(s,'entrance');}
  function beginCard(s){var card=segment(s),b=s.boss;s.cardEnding=null;s.cardDown=0;s.downEnd=0;s.bonusLock=0;s.phraseCard=0;spReset(s);b.maxHp=b.hp=cardHp(s,card);b.mid=!!card.mid;s.stage='card';s.stageTick=0;s.segTick=0;s.spellClean=!!card.spell;if(card.spell){s.spellNumber++;note(s,'card');}else note(s,'plain');}
  /* 보스·중간보스는 패턴 도중에 쓰러지지 않는다(사용자 11-19 "패턴중에 보스및 중간보스가 죽지않도록 패턴끝나고 죽도록"): 체력이 다하거나 시간이 다하면
     새 공격을 멈추고(특수 페이즈도 끝), 화면 탄은 가속해 밖으로 내보내고, 이미 켜진 광선·문양이 제 수명대로 꺼진 뒤에야 쓰러짐(endCard)으로 넘어간다. 최대 CARD_ENDING_MAX틱. */
  var CARD_ENDING_MAX=240;
  /* 페이즈 최소 시간과 시전한 패턴 끝까지(사용자 11-19 "체력이 달아 페이즈가 넘어가더라도 이미 시전한 패턴은 모두 나오게 한다음 다음페이즈… 패턴별 지속시간이 유지되도록"):
     체력이 먼저 다해도 한 소절(CARD_MIN)은 채우고, 소절 경계·광선·문양·특수 페이즈가 끝난 뒤에야 쓰러진다. 기다리는 동안 체력은 1로 붙든다(무한 대기 방지 상한 CARD_DOWN_MAX) */
  var CARD_MIN=Math.round(420*1.5),CARD_DOWN_MAX=Math.round(420*1.5)+180;
  function cardMayFall(s){var t=s.segTick-cardFireDelay(s);if(s.cardDown&&s.tick-s.cardDown>=CARD_DOWN_MAX)return true;if(t<CARD_MIN)return false;
    if(s.cardDown){if(t<s.downEnd)return false;return !beamsOrFiguresLive(s);} // 소진 뒤에는 새 발사가 멈췄으니 소절 끝·예고된 광선·문양만 기다린다
    if(s.phraseCard&&s.phraseTick%s.phraseCard!==0)return false;
    if(s.lasers.some(function(l){return l.age<l.warn+l.active;})||s.figures.some(function(f){return f.age<f.warn+(f.active||0);}))return false;
    if(spWindow(s))return false;return true;}
  function beamsOrFiguresLive(s){return s.lasers.some(function(l){return l.age<l.warn+l.active;})||s.figures.some(function(f){return f.age<f.warn+(f.active||0);});}
  /* 체력 소진(외부 심사 11-20 "이미 예고된 공격은 끝까지, 소진 뒤에는 다음 발사 묶음을 시작하지 않도록 … 봉인 보너스 금액을 확정하고 마지막 공격까지 살아남으면 지급"):
     소진한 틱에 봉인 보너스를 굳히고(bonusLock), 지금 소절은 끝까지 쏘되(사용자 11-19 '시전한 패턴은 모두 나오게') 다음 소절·특수 페이즈·반사탄·중앙 견제·배경 압박은 새로 시작하지 않는다. */
  function downFiring(s){if(!s.cardDown)return true;return s.segTick-cardFireDelay(s)<s.downEnd;}
  function markDown(s){var card=segment(s),L=phraseLen(s),t=Math.max(0,s.segTick-cardFireDelay(s));s.cardDown=s.tick||1;s.downEnd=spQuiet(s)?t:Math.max(CARD_MIN,Math.ceil((t+1)/L)*L); // 특수 페이즈 중에 다 깎으면 본 공격을 다시 열지 않는다
    s.bonusLock=card&&card.spell?spellBonus(s):0;}
  /* 같은 보스의 다음 패턴으로 넘어갈 때는 화면의 탄·광선·문양을 지우거나 가속하지 않는다(사용자 11-19 "피하는중인데 탄이 갑자기 사라져서 맥이 빠지거나… 흐름이 끊겨"): 남은 탄은 제 길로 맵 밖까지 날아간다.
     보스가 떠날 때(다른 보스·잡몹 구간으로 넘어감)만 예전처럼 탄을 가속해 내보낸다(사용자 11-19 "몹이나 보스가 없고 탄환만 있을때는 탄환을 가속") */
  var CARD_BREAK_PAUSE=45;
  function bossStays(s){var card=segment(s),next=SEGMENTS[nextSegmentIndex(s)];return !!(s.entranceAll&&card&&next&&next.kind==='card'&&next.actor===card.actor&&next.stage===card.stage);}
  function beginCardEnding(s,defeated){s.cardEnding={defeated:!!defeated,tick:s.tick,stays:bossStays(s)};if(s.boss.hp<0)s.boss.hp=0;if(!s.cardEnding.stays)flushBullets(s);}
  function cardEndingStep(s){if(s.boss.hp<0)s.boss.hp=0;if(!s.cardEnding.stays)flushBullets(s);} // 이 사이에 다른 경로로 생긴 탄(파편 등)도 내보낸다
  function cardEndingDone(s){var e=s.cardEnding;if(s.tick-e.tick>=CARD_ENDING_MAX)return true;if(e.stays?s.tick-e.tick<CARD_BREAK_PAUSE:s.n)return false;
    for(var i=0;i<s.lasers.length;i++){var l=s.lasers[i];if(l.age<=l.warn+l.active)return false;}return !s.figures.length;}
  /* 반사탄(사용자 11-19 "반사탄도 생성해서 탄환이 벽에 닿으면 반사되어 마치 빛이 거울에 닿으면 반사되는 각도로 … 1-2번 튕기면 맵밖으로"): 실제 게임 보스전에서
     몇 초마다 보스가 좌우 벽을 향해 비스듬한 탄 몇 알을 쏜다. 벽에서 입사각=반사각으로 꺾이고(좌우 벽은 θ→π−θ, 위 벽은 θ→−θ), 이지 1번·노멀 1~2번·헬 2번 튕긴 뒤 화면 밖으로 나간다(아래로는 튕기지 않는다). */
  var MIRROR_EVERY={gentle:900,normal:330,hell:270};
  function mirrorVolley(s,t){
    if(!s.entranceAll||t<=0||t%(MIRROR_EVERY[s.difficulty]||330)!==150||s.figures.length||s.lasers.length>2)return;
    if(layersBut(s,'mirror')>=layerCap(s)+(layerCap(s)===1?1:0))return; // 종류 칸이 없으면 쉰다(이지는 반사탄이 본 공격을 잠시 대신한다) // 문양·광선이 떠 있을 때는 얹지 않는다(겹침 자제)
    var b=s.boss,lvl=s.difficulty==='gentle'?0:s.difficulty==='normal'?1:2,per=[2,3,3][lvl],side,k,a=ACTORS[b.actor]||{},c=a.c2===undefined?(a.c1||0):a.c2;
    for(side=-1;side<=1;side+=2)for(k=0;k<per;k++){var ang=Math.PI/2+side*(.62+k*.17),bounce=lvl===0?1:lvl===2?2:1+((k+(t/330|0))%2);
      spawn(s,b.x+side*18,b.y+12,ang,[70,80,86][lvl],{color:c,size:0,bounce:bounce,mirror:1});}
  }
  function endCard(s,defeated){
    s.cardEnding=null;
    var card=segment(s),left=timeLeft(s),b=s.boss,nextAt=nextSegmentIndex(s),next=SEGMENTS[nextAt],cinematic=s.cinematicEncounter;
    var hold=defeated&&cinematic&&cinematic.actor===card.actor&&cinematic.stageIndex===card.stage&&(!next||next.kind!=='card'||next.actor!==card.actor||next.stage!==card.stage);
    var wiped=0;if(hold)clearBossEntranceHazards(s);else if(!(s.entranceAll&&next&&next.kind==='card'&&next.actor===card.actor&&next.stage===card.stage))wiped=breakWipe(s); // 같은 보스가 이어 가면 탄·패턴을 그대로 둔다
    if(defeated){s.cleared++;gainExp(s,card.spell?16:10);s.score+=Math.round(left)*300+wiped*30;var nd=card.spell?CARD_DROPS:PLAIN_DROPS;if(!s.spellOnly&&(!next||next.kind!=='card'||next.actor!==card.actor))nd=card.spell?1:0; /* 잭팟이 터지는 마지막 패턴은 낱개 하트를 떨구지 않는다(심사 11-20: 잭팟이 흩어진 낱개와 섞여 묽어짐). 스펠이면 필살 조각 하나만 */for(var i=0;i<nd;i++)dropItem(s,dropAt(b.actor,i,nd,b.x,b.y,0),dropAt(b.actor,i,nd,b.x,b.y,1),card.spell&&(i===1||nd===1)?1:0); /* 하트는 보스 발치 구름 아래에서 솟는다: 먹으로 스미는 몸 한가운데를 가리지 않게(사용자 11-16) */}else s.timeouts++;
    // 이름 붙은 패턴을 폭탄 없이, 맞지 않고 넘기면 보너스
    if(defeated&&!s.spellOnly&&(!next||next.kind!=='card'||next.actor!==card.actor))jackpot(s,!!card.mid,b.x,b.y); // 이 인물의 마지막 패턴: 잭팟(스펠 연습은 제외)
    if(card.spell&&defeated&&s.spellClean){var sb=spellBonus(s);s.captures++;s.score+=sb;s.lastCapture={ok:true,bonus:sb,tick:s.tick,seg:s.seg,name:card.name};note(s,'capture');gainPiece(s);}
    else if(card.spell&&defeated){s.lastCapture={ok:false,bonus:0,tick:s.tick,seg:s.seg,name:card.name};note(s,'captureMiss');}
    s.score+=wiped*10;note(s,'break');var who=b.actor,dx=b.x,dy=b.y;
    if(hold){
      b.down={actor:who,x:dx,y:dy,tick:s.tick};b.present=false;b.leaving=false;
      s.stage='bossClear';s.stageTick=0;s.bossClear={actor:who,stageIndex:card.stage,segment:s.seg,nextSegment:nextAt,startedTick:s.tick,readyTick:s.tick+BOSS_CLEAR_TICKS,stageCommitted:false};
      note(s,'bossClear');note(s,'bossDown');
      // 연출 중 홈/새로고침을 해도 맵 격파가 취소되지 않게 결과를 즉시 확정한다. 같은 맵의 후속 보스는 아직 완료가 아니다.
      if(s.started&&(!next||next.stage!==card.stage)){closeStage(s,card.stage);s.bossClear.stageCommitted=true;}
      return;
    }
    advance(s);
    // 이 보스의 마지막 패턴이 깨졌다(다른 보스나 잡몹 구간으로 넘어감): 화면은 이 자리에서 쓰러지는 동작을 그린다.
    if(defeated&&(b.leaving||s.stage==='won')){b.down={actor:who,x:dx,y:dy,tick:s.tick};note(s,'bossDown');}
  }
  var BOSS_DESCEND=342,DESCEND_HOLD=420;
  // 헬: 보스가 내려와 탄을 못 내는 동안 화면이 비지 않게 맵 끝에서 끝까지 닿는 가로·세로 광선을 판 가장자리에서 깐다(보스는 여전히 탄을 내지 않는다, 실플레이 심사 11-19)
  var CALM_LASER_EVERY=84,CALM_LASER_FIRST=12;
  /* 이지·노멀(11-19 탄막 규칙 9·16, 전수조사: 노멀 보스 카드 58장에서 보스가 내려와 쉬는 동안 화면이 3초 넘게 텅 빔):
   * 문양·광선이 다 사라졌는데 보스가 아직 내려와 있으면 같은 역할의 광선을 수만 줄여 낸다. 세로 외줄·가로 외줄은 광선 문법이 걸어오는 벽·차오르는 바닥으로 묶는다. */
  var CALM_SOFT={gentle:{every:150,cols:1},normal:{every:110,cols:2}},CALM_SOFT_WAIT=30;
  function calmSoft(s){
    var cf=CALM_SOFT[s.difficulty];
    if(!cf||!s.calm||s.cardEnding||s.cardDown||!s.boss.present||!s.entranceAll||s.lasers.length||s.figures.length||(s.sp&&s.sp.cur)){s.calmSoftT=0;return;}
    var t=s.calmSoftT=(s.calmSoftT||0)+1;if(t<CALM_SOFT_WAIT||(t-CALM_SOFT_WAIT)%cf.every)return;
    var a=ACTORS[s.boss.actor],c=a&&a.c2!==WHITE&&a.c2!==RED?a.c2:CYAN,k=((t-CALM_SOFT_WAIT)/cf.every)|0;
    // 영웅이 선 자리에 한 줄(움직일 이유), 노멀은 한쪽 옆(±76px)에 한 줄 더 세워 반대쪽으로 비키게 한다(심사 7.50: 가운데가 그냥 안전했다). 이지 한 줄은 광선 문법이 걸어오는 벽으로 묶는다
    var px=Math.max(24,Math.min(W-24,s.player.x));
    if(k%2===0){column(s,px,{width:BEAM_MIN,warn:66,active:56,color:c});if(cf.cols>1){var side=px<W/2?1:-1;column(s,Math.max(24,Math.min(W-24,px+side*76)),{width:BEAM_MIN,warn:66,active:56,color:c});}}
    else row(s,460,{width:BEAM_MIN,warn:66,active:56,color:c});
    s.calmSoftN=(s.calmSoftN||0)+1;s.calmSoftAt=s.tick;
  }
  /* 이지 조준 층(11-19 탄막 규칙 6 "조준은 움직이게 만드는 이유", 전수조사: 이지 보스 카드 494장 중 188장은 가만히 서 있어도 10초 동안 안 맞음 → 피할 이유가 없는 장식).
   * 탄이 영웅 14px 안(거의 닿을 거리)을 3초 동안 한 번도 지나지 않으면 보스가 느린 홀수 3갈래 조준탄을 낸다(홀수라 가운데 갈래가 영웅을 겨눠 한 걸음 비켜야 한다). 노멀·헬은 이미 모두 10초 안에 맞는다. */
  var NUDGE_IDLE=180,NUDGE_NEAR=14,NUDGE_SPEED=96,NUDGE_MOVE=24,NUDGE_CUE=24;
  function gentleNudge(s){
    if(s.difficulty!=='gentle'||!s.entranceAll||s.stage!=='card'||s.cardEnding||s.cardDown||s.calm||!s.boss.present||s.boss.leaving||(s.sp&&s.sp.cur)||s.segTick<FIRE_DELAY){s.nudgeT=0;s.nudgeCue=null;return;}
    var p=s.player,b=s.boss,i,dx,dy;
    if(s.nudgeCue){if(s.tick<s.nudgeCue.fire)return; // 조준 예고(인주색 점선, 앱이 그림) 뒤에 쏜다: 왜 날아오는지 보인다(심사 7.50)
      var a=ACTORS[b.actor]||{},c=a.c1===RED||a.c1===undefined?CYAN:a.c1;fan(s,b.x,b.y+20,3,Math.atan2(p.y-b.y-20,p.x-b.x),.34,NUDGE_SPEED,{color:c,size:2});
      s.nudgeCue=null;s.nudgeT=0;s.nudges=(s.nudges||0)+1;s.nudgeAt=s.tick;return;}
    // 가만히 선 영웅만 겨눈다(심사 7.50: 잘 피하고 있는 플레이어까지 겨누면 안 된다): 3초 동안 24px 넘게 움직이면 처음부터
    if(s.nudgeX===undefined||Math.abs(p.x-s.nudgeX)>NUDGE_MOVE||Math.abs(p.y-s.nudgeY)>NUDGE_MOVE){s.nudgeX=p.x;s.nudgeY=p.y;s.nudgeT=0;return;}
    for(i=0;i<s.n;i++){if(s.bexit[i])continue;dx=s.bx[i]-p.x;dy=s.by[i]-p.y;if(dx*dx+dy*dy<NUDGE_NEAR*NUDGE_NEAR){s.nudgeT=0;return;}}
    if((s.nudgeT=(s.nudgeT||0)+1)<NUDGE_IDLE)return;
    s.nudgeCue={from:s.tick,fire:s.tick+NUDGE_CUE};
  }
  function calmLaser(s){
    calmSoft(s);
    if(!s.calm||s.difficulty!=='hell'||s.cardEnding||s.cardDown||!s.boss.present){s.calmT=0;return;}
    var t=s.calmT=(s.calmT||0)+1;if(t<CALM_LASER_FIRST||(t-CALM_LASER_FIRST)%CALM_LASER_EVERY)return;
    var a=ACTORS[s.boss.actor],c=a&&a.c2!==WHITE&&a.c2!==RED?a.c2:CYAN,k=((t-CALM_LASER_FIRST)/CALM_LASER_EVERY)|0;
    if(k%2===0)slots(s,3,W,18).forEach(function(x){column(s,x,{width:BEAM_MIN,warn:62,active:56,color:c});});
    else for(var i=0;i<2;i++)row(s,380+i*120+rand(s)*50,{width:BEAM_MIN,warn:62,active:56,color:c});
  }
  function bossDescends(s){for(var i=0;i<s.figures.length;i++){var f=s.figures[i];if((f.sigil||f.kind==='runes')&&f.age<f.warn+f.active)return true;}return false;}
  function moveBoss(s){
    var b=s.boss;if(!b.present)return;
    if(b.leaving){b.leaveT=(b.leaveT||0)+1;b.y-=Math.min(5,1+b.leaveT*.12);if(b.y<-70){b.leaving=false;b.present=false;b.leaveT=0;}return;} // 갑자기 사라지지 않게 천천히 가속하며 물러난다
    if(s.stage==='card'&&s.segTick%150===0){b.targetX=W/2-BOSS_ROAM+rand(s)*BOSS_ROAM*2;var ty=BOSS_REST-6+rand(s)*BOSS_SWAY;if(!(s.entranceAll&&b.downHold>0))b.targetY=ty;}
    // 육망성·한자띠가 떠 있는 동안 보스가 화면 가운데보다 조금 아래까지 내려와 문양이 화면 아래 끝 가까이 닿는다(사용자 11-18). 끝나면 제자리로 돌아간다.
    if(s.stage==='card'&&s.entranceAll){if(bossDescends(s))b.downHold=DESCEND_HOLD;else if(b.downHold>0)b.downHold--;if(b.downHold>0){b.targetX=W/2;b.targetY=BOSS_DESCEND;b.descended=true;}else if(b.descended){b.descended=false;b.targetY=BOSS_REST;}} // 사용자 11-19 "보스가 아래로왔다가 금방위로가고 하니까 정신없어": 내려오면 문양이 끝난 뒤에도 DESCEND_HOLD 동안 머문다(다음 문양까지 이어지면 계속 아래) // 심사 반복 지적: 화면 위에 붙어 체력 띠·스펠 이름과 겹쳤다. 조금 내려 둔다(위 3분의 1 안).
    var ease=s.entranceAll?.022:.05;b.x+=(b.targetX-b.x)*.035;b.y+=(b.targetY-b.y)*ease; // 오르내림은 천천히
  }
  function movePlayer(s,input){
    var p=s.player,dx=Number(input&&input.dx)||0,dy=Number(input&&input.dy)||0,limit=(input&&input.focus?FOCUS_MOVE:MAX_MOVE)*abilityOf(s,!!(input&&input.focus)).move,len=Math.sqrt(dx*dx+dy*dy);
    if(!(len<1e9)){dx=0;dy=0;len=0;} // NaN·무한대 입력은 버린다
    if(len>limit){dx*=limit/len;dy*=limit/len;}
    p.focus=!!(input&&input.focus);p.x=Math.max(8,Math.min(W-8,p.x+dx));p.y=Math.max(40,Math.min(H-14,p.y+dy));
  }
  // 따로 정하지 않은 잡몹도 화면 위쪽에 머무는 동안 이 간격(틱)으로 다시 쏜다. 잡몹 구간이 보스전보다 지나치게 한가하지 않게(11-14 지시서).
  // 화면의 탄이 적으면 더 자주, 많으면 쉬어서 장면마다 압박이 고르게 한다. [쉬움, 보통, 지옥] 기준 탄 수.
  var MOB_HP_UP=1.7*1.06,BOSS_HP_UP=1.5,BOSS_STAY=1.8,MOB_STAY=2400,MID_UP={gentle:3,normal:2.5,hell:2.5};
  var MOB_ENGAGE_SPEED=.5,MOB_EXIT_MARGIN=80;

  var MOB_REFIRE=[96,56,56],WAVE_FLOOR=[110,280,280],WAVE_CEIL=[170,320,320];
  var MOB_VOLLEY_BEAT={gentle:13,normal:10,hell:9};
  function fireWaveMob(s,m){
    MOB_FIRE[m.fire](s,m);
    m.shots++;
    m.next=m.age+(m.every||MOB_REFIRE[s.difficulty==='gentle'?0:2]);
  }
  function refireEvery(s,every){var d=s.difficulty==='gentle'?0:2,base=every||MOB_REFIRE[d];
    return Math.max(12,Math.round(s.n<WAVE_FLOOR[d]?base*.4:s.n>WAVE_CEIL[d]?base*2.5:base));}
  var MOB_BELOW_SPEED=2.6;
  function belowHero(s,m){return s.entranceAll&&!m.rise&&m.vy>0&&m.y>s.player.y+12;}
  function pastMobExit(m){
    // 대열 뒤쪽은 화면 밖에서 출발할 수 있다. 자기 진행 방향의 출구를 지난 개체만 뺀다.
    return m.y>H+MOB_EXIT_MARGIN || (m.vy<0&&m.y<-MOB_EXIT_MARGIN) ||
      (m.vx<0&&m.x<-MOB_EXIT_MARGIN) || (m.vx>0&&m.x>W+MOB_EXIT_MARGIN);
  }
  function updateMobs(s){
    var formation=s.entranceAll&&s.stage==='wave',beat=MOB_VOLLEY_BEAT[s.difficulty];
    var slot=formation&&s.segTick%beat===0?(s.segTick/beat)%6:-1;
    var shooters=slot>=0&&slot<3?[null,null]:null;
    for(var i=s.mobs.length-1;i>=0;i--){
      var m=s.mobs[i];m.age++;
      if(m.elite&&!s.entranceAll&&m.age>m.hold+90)m.retreat=true;
      if(m.retreat){
        // 가로 편대는 건너편으로, 위에서 들어와 멈춘 정예는 다시 아래로 나간다.
        if(m.elite)m.y+=4;
        else{
          var length=Math.hypot(m.vx,m.vy);
          if(length){
            var scale=Math.max(2.6,length*(belowHero(s,m)?MOB_BELOW_SPEED:1.7))/length;
            m.baseX+=m.vx*scale;m.y+=m.vy*scale;
            m.x=m.baseX+(m.sway?Math.sin(m.age*m.swayRate)*m.sway*22:0);
          }else m.y+=2.6;
        }
        if(pastMobExit(m))s.mobs.splice(i,1);
        continue;
      }
      var inRange;
      if(m.elite){
        if(m.y<m.stopY)m.y+=2.2;
        inRange=m.y>=m.stopY-1&&m.every;
        if(!formation&&inRange&&m.age>=m.first+60&&(m.age-m.first-60)%m.every===0){MOB_FIRE[m.fire](s,m);m.shots++;}
        if(!formation&&inRange&&m.age+MOB_CUE_LEAD>=m.first+60&&(m.age+MOB_CUE_LEAD-m.first-60)%m.every===0){m.cueAt=s.tick+MOB_CUE_LEAD;m.cueLead=MOB_CUE_LEAD;}
      }else{
        // 진입은 대본 속도 그대로. 플레이어가 겨눌 수 있는 상단을 지날 때만 진행 속도를 늦춘다.
        var engage=formation&&!m.rise&&m.baseX>=0&&m.baseX<=W&&m.y>=24&&m.y<300;
        var speed=engage?MOB_ENGAGE_SPEED:belowHero(s,m)?MOB_BELOW_SPEED:1; // 영웅보다 아래로 내려간 몹은 가던 방향 그대로 빨리 빠져나간다(실플레이 심사 11-19)
        m.baseX+=m.vx*speed;m.y+=m.vy*speed;m.x=m.baseX+(m.sway?Math.sin(m.age*m.swayRate)*m.sway*22:0);
        // 화면 위쪽에 있을 때만 쏜다(영웅 코앞 기습 방지).
        inRange=(m.y<300||m.rise&&m.y<H-30&&Math.abs(m.x-s.player.x)>40)&&m.y>0;
        if(inRange&&m.rise&&s.entranceAll&&Math.hypot(m.x-s.player.x,m.y-s.player.y)<MOB_NEAR_HOLD)inRange=false; // 아래에서 솟는 몹은 영웅 코앞(120px 안)에서는 쏘지 않는다: 발밑 기습 금지(11-19 탄막 규칙 2·15, docs/v43/danmaku-rules.md)
        if(!formation){
          if(m.next===undefined)m.next=m.first;
          if(inRange&&m.age>=m.next){MOB_FIRE[m.fire](s,m);m.shots++;m.next=m.age+refireEvery(s,m.every);}
          if(inRange&&m.next-m.age===MOB_CUE_LEAD){m.cueAt=s.tick+MOB_CUE_LEAD;m.cueLead=MOB_CUE_LEAD;}
          else if(m.age>=m.next&&m.y<=0)m.next=m.age+1;
        }
        if(pastMobExit(m))s.mobs.splice(i,1);
      }
      if(!shooters||!inRange||m.x<0||m.x>W)continue;
      if(m.next===undefined)m.next=m.first+(m.elite?60:0);
      var side=m.x<W/2?0:1,other=shooters[side];
      if(m.age>=m.next&&(!other||m.age-m.next>other.age-other.next))shooters[side]=m;
    }
    if(!shooters){if(slot>=0)cueWaveShooters(s,beat);return;}
    // 왼쪽과 오른쪽이 한 번씩 답하고 세 번째 박에서만 멀리 떨어진 두 자리가 함께 쏜다.
    // 남은 세 박은 편대 전체가 쉰다. 각 편에서는 가장 오래 기다린 몹의 원래 공격을 사용한다.
    var first=shooters[slot%2]||shooters[1-slot%2];
    if(first)fireWaveMob(s,first);
    if(slot===2&&shooters[0]&&shooters[1]&&shooters[1].x-shooters[0].x>=W/3&&s.n<WAVE_CEIL[s.difficulty==='gentle'?0:2])fireWaveMob(s,shooters[1]);
    cueWaveShooters(s,beat); // 이번 박을 쏜 뒤의 상태로 다음 박에 쏠 몹을 고른다(한 박 앞 예고)
  }
  /* 쏘기 예고(연출 제안 11-20 "편대에서 곧 쏠 적이 먼저 몸을 틀고 총구에 먹을 맺는다"): 편대는 박마다 쏜 뒤 다음 박(한 박 = 9~13틱 앞)에 쏠 몹을, 홀로 쏘는 몹은 MOB_CUE_LEAD틱 앞서 같은 규칙으로 골라 m.cueAt·m.cueLead만 적는다.
     판정·발사·난수는 건드리지 않는다(화면만 읽는다). 박 사이에 새로 들어온 몹이 대신 쏘면 예고 없이 쏠 수 있다(드묾). */
  var MOB_CUE_LEAD=18;
  function cueWaveShooters(s,beat){
    var slot=((s.segTick+beat)/beat)%6;if(slot>=3)return;var pick=[null,null],L=beat;
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i];if(m.retreat||m.x<0||m.x>W)continue;
      var inRange=m.elite?m.y>=m.stopY-1&&m.every:(m.y<300||m.rise&&m.y<H-30&&Math.abs(m.x-s.player.x)>40)&&m.y>0;if(!inRange)continue;
      var nx=m.next===undefined?m.first+(m.elite?60:0):m.next,side=m.x<W/2?0:1,o=pick[side];
      if(m.age+L>=nx&&(!o||m.age-nx>o.age-o.nx))pick[side]={m:m,age:m.age,nx:nx};}
    var first=pick[slot%2]||pick[1-slot%2];if(first){first.m.cueAt=s.tick+L;first.m.cueLead=L;}
    if(slot===2&&pick[0]&&pick[1]&&pick[1].m.x-pick[0].m.x>=W/3){pick[1].m.cueAt=s.tick+L;pick[1].m.cueLead=L;}
  }
  // 유도탄이 따라갈 가로 좌표: 보스전이면 보스, 아니면 가장 가까운 몹.
  function homingX(s){
    if(s.stage==='card')return s.boss.x;
    var best=null,bestD=1e9,p=s.player;
    for(var i=0;i<s.mobs.length;i++){var m=s.mobs[i];if(m.y<0||m.y>p.y)continue;var d=Math.abs(m.x-p.x)+(p.y-m.y)*.3;if(d<bestD){bestD=d;best=m;}}
    return best?best.x:null;
  }
  function nearestFoe(s,x,y,skip){
    var best=null,bestD=1e9,i,m,d;
    if(s.stage==='card'&&s.boss.present&&skip.indexOf(s.boss)<0&&s.boss.y>0){best=s.boss;bestD=Math.abs(s.boss.x-x)+(y-s.boss.y)*.3;}
    for(i=0;i<s.mobs.length;i++){m=s.mobs[i];if(m.y<0||m.y>y||skip.indexOf(m)>=0)continue;d=Math.abs(m.x-x)+(y-m.y)*.3;if(d<bestD){bestD=d;best=m;}}
    return best;
  }
  /* 기억 번개(5단계부터): 가장 가까운 적을 곧장 친다. 7단계는 맞은 적에서 다음 적으로 한 번 더 튄다. 화면은 s.zaps(x0,y0,x1,y1,단계)를 읽어 그린다. */
  function memoryBolt(s,dmg,chains){
    var x=s.player.x,y=s.player.y-20,hit=[],k,f;
    for(k=0;k<chains;k++){f=nearestFoe(s,x,y,hit);if(!f)break;hit.push(f);if(s.zaps.length<60)s.zaps.push(x,y,f.x,f.y,s.power);x=f.x;y=f.y+1;
      if(f===s.boss){f.hp-=dmg*shotDamage(s);s.score+=dmg*2;}else{f.hp-=dmg*shotDamage(s);f.hitTick=s.tick;if(f.hp<=0)killMob(s,s.mobs.indexOf(f));}}
    if(hit.length)note(s,'zap');
  }
  /* ── 보스 페이즈(사용자 11-17). 한 보스(스테이지·인물·중간 여부)의 카드를 순서대로 PHASE 1..N 으로 부른다. 앱의 2페이즈부터 원래 공격과 수학 도형이 차례로 나온다. ── */
  var PHASE_INFO=null;
  function phaseTable(){
    if(PHASE_INFO)return PHASE_INFO;var info=[],groups={};
    SEGMENTS.forEach(function(g,i){if(g.kind!=='card')return;var k=g.stage+'|'+g.actor+'|'+(g.mid?1:0);(groups[k]=groups[k]||[]).push(i);});
    Object.keys(groups).forEach(function(k){groups[k].forEach(function(i,j){info[i]={no:j+1,count:groups[k].length};});});
    PHASE_INFO=info;return info;
  }
  function phaseOf(segIndex){return phaseTable()[segIndex]||null;}
  var PHASE_PLANS={};
  function phaseKind(seg,segIndex){var pi=phaseOf(segIndex);if(!BOSS_PHASES||!pi||pi.no<2)return null;var key=seg.stage+'|'+seg.actor+'|'+(seg.mid?1:0),plan=PHASE_PLANS[key]||(PHASE_PLANS[key]=BOSS_PHASES.plan(key,pi.count));return plan[pi.no-1];}
  function variationCardIndex(s,g){
    var at=s.seg+1,next=SEGMENTS[at];
    // A two-plain midboss loses P2 on a trimmed route. Let its motif answer the
    // native opening inside P1. Keep the HUD, current card, rewards and HP on P1.
    if(g.mid&&!g.spell&&s.paced&&REPEATED_PLAIN[at]&&next.mid&&next.stage===g.stage&&next.actor===g.actor
      &&phaseOf(s.seg).no===1&&!isCinematicBoss(g.actor,g.mid)&&nextSegmentIndex(s)>at)return at;
    return s.seg;
  }
  // Keep the authored clock contiguous: several cards snapshot aim on one beat and use it on a later beat.
  // 3.5 s of the named attack, 0.5 s to reposition, 2 s of variation, then 1 s before repeating.
  var CARD_PHRASE=420,AUTHORED_TICKS=210,VARIATION_AT=240,VARIATION_END=360;
  /* 패턴 길이(사용자 11-19 "각 패턴의 지속시간을 더 길게… 너무 패턴들이 빨리 바뀌는거 같아"): 실제 게임(entranceAll)에서는 한 소절을 1.5배로 늘린다 */
  var PHRASE_LONG=1.5;
  function phraseLen(s){return s.entranceAll?Math.round(CARD_PHRASE*PHRASE_LONG):CARD_PHRASE;}
  function fireCardPhrase(s,seg,t,kind,variationCard){
    if(!t){s.phraseTick=0;s.authoredTick=0;s.variationTick=0;s.signatureTick=0;s.accentCycle=-1;}
    var L=s.entranceAll?PHRASE_LONG:1,CARD_PHRASE=Math.round(420*L),AUTHORED_TICKS=Math.round(210*L),VARIATION_AT=Math.round(240*L),VARIATION_END=Math.round(360*L);s.phraseCard=CARD_PHRASE;
    var phrase=s.phraseTick,beat=phrase%CARD_PHRASE,cycle=Math.floor(phrase/CARD_PHRASE);
    var beamLive=s.lasers.some(function(l){return l.age<l.warn+l.active;});
    // Hold the hand-off itself. Long native beams must not run out the variation window and restart themselves.
    if(beat===VARIATION_AT&&beamLive)return;
    s.phraseTick++;
    if(seg.spell&&phrase>=VARIATION_END&&!beamLive){
      // The original glyph/rune order and warning lengths are kept. Let an announced beam complete first.
      signature(s,s.signatureTick++,true);
    }
    var cue=s.figures.some(function(f){return f.age<f.warn;});
    if(cue)return;
    if(beat<AUTHORED_TICKS){seg.fire(s,s.authoredTick++);return;}
    if(beat<VARIATION_AT||beat>=VARIATION_END||beamLive)return;
    if(s.figures.some(function(f){var phase=figurePhase(f,s.tick);return phase==='on'||phase==='charge';}))return;
    var sig=seg.spell&&signatureOf(seg.actor);
    if(cycle%2===1&&sig&&s.difficulty!=='gentle'){
      // A signature accent gets its own turn in place of the mathematical phrase.
      var accent=beat-VARIATION_AT;
      var accents=1+(sig.edge?1:0)+(sig.extra==='spray'?1:0);
      var choice=Math.floor(cycle/2)%accents;
      if(choice===accents-1)strands(s,sig,accent);
      else if(s.accentCycle!==cycle){
        s.accentCycle=cycle;
        if(sig.edge&&choice===0){summonZigzag(s,sig,-1);summonZigzag(s,sig,1);}
        else spray(s,sig,t);
      }
      return;
    }
    var actor=ACTORS[seg.actor];
    BOSS_PHASES.fire(kind,s,s.variationTick++,{spawn:spawn,W:W,H:H,colors:[actor.c1,actor.c2]},{actor:seg.actor+'|'+seg.stage,phaseNo:phaseOf(variationCard).no});
  }
  /* ── 저속 간이 필살(사용자 11-17). 저속(focus) 이동 중 확률적으로 나가며 탄을 지우지 않는다. 기억사수=인과의 역전(적을 쫓는 레이저, 확률로 체인 라이트닝처럼 연쇄),
   *    윤서하=시간차 공격(시계가 돌고 잠시 뒤 굵은 시간검이 나가 적을 자동 추적). 쓰는 난수는 frng 로 탄 패턴 난수와 따로 굴린다. ── */
  var FOCUS_SKILL_CHANCE=[0,.010,.011,.012,.014,.016,.018,.021],FOCUS_SKILL_GAP=48,SWORD_DELAY=20,SWORD_SPEED=13,SWORD_LIFE=150,SWORD_TURN=.28,SWORD_POWER=7,REVERSAL_POWER=6,REVERSAL_CHAIN_P=.62,REVERSAL_HOP=240;
  function frand(s){var x=s.frng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.frng=x>>>0;return s.frng/4294967296;}
  function foeNear(s,x,y,skip,maxD){
    var best=null,bestD=maxD||1e9,i,m,d;
    if(s.stage==='card'&&s.boss.present&&!s.boss.leaving&&s.boss.y>0&&skip.indexOf(s.boss)<0){d=Math.sqrt((s.boss.x-x)*(s.boss.x-x)+(s.boss.y-y)*(s.boss.y-y));if(d<bestD){bestD=d;best=s.boss;}}
    for(i=0;i<s.mobs.length;i++){m=s.mobs[i];if(m.y<0||skip.indexOf(m)>=0)continue;d=Math.sqrt((m.x-x)*(m.x-x)+(m.y-y)*(m.y-y));if(d<bestD){bestD=d;best=m;}}
    return best;
  }
  function hitFoe(s,f,dmg){
    f.hp-=dmg;
    if(f===s.boss){s.score+=2;if(s.tick-f.hitTick>=5){f.hitTick=s.tick;note(s,f.hp/f.maxHp<=.2?'bossHitLow':'bossHit');}}
    else{f.hitTick=s.tick;if(f.hp<=1e-6){var k=s.mobs.indexOf(f);if(k>=0)killMob(s,k);}}
  }
  function focusSkillKind(s){return s.hero==='seoha'||s.hero==='seoha-b'?'sword':'reversal';}
  function focusSkill(s){
    var p=s.player,i,w,f,k;
    for(i=s.fsSwords.length-1;i>=0;i--){
      w=s.fsSwords[i];w.age++;
      if(w.age<SWORD_DELAY){w.x=p.x;w.y=p.y-26-w.age*.4;continue;}
      f=foeNear(s,w.x,w.y,[]);
      if(f){var d=Math.atan2(f.y-w.y,f.x-w.x)-w.ang;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;w.ang+=Math.max(-SWORD_TURN,Math.min(SWORD_TURN,d));}
      var done=false;
      for(k=0;k<2&&!done;k++){
        w.x+=Math.cos(w.ang)*SWORD_SPEED*.5;w.y+=Math.sin(w.ang)*SWORD_SPEED*.5;
        if(s.stage==='card'&&s.boss.present&&!s.boss.leaving&&Math.abs(w.x-s.boss.x)<34&&Math.abs(w.y-s.boss.y)<38){hitFoe(s,s.boss,w.dmg);done=true;}
        for(var j=s.mobs.length-1;j>=0&&!done;j--){var m=s.mobs[j];if(Math.abs(w.x-m.x)<m.r+9&&Math.abs(w.y-m.y)<m.r+11){hitFoe(s,m,w.dmg);done=true;}}
      }
      if(done){s.fsHits++;if(s.skillFx.length<80)s.skillFx.push(w.x,w.y,w.x,w.y,-1);note(s,'swordHit');}
      if(done||w.age>SWORD_LIFE||w.x<-40||w.x>W+40||w.y<-40||w.y>H+40)s.fsSwords.splice(i,1);
    }
    if(!p.focus||s.stage==='won'||s.stage==='lost'||s.stage==='bossClear'||(s.stage!=='card'&&s.stage!=='wave')||s.bombPulse||s.tick<s.fsNext)return;
    if(frand(s)>=FOCUS_SKILL_CHANCE[Math.max(1,Math.min(MAX_LEVEL,s.power||1))])return;
    var kind=focusSkillKind(s),dmg=(kind==='sword'?SWORD_POWER:REVERSAL_POWER)*shotDamage(s);
    if(!foeNear(s,p.x,p.y,[]))return;
    s.fsNext=s.tick+FOCUS_SKILL_GAP;s.fsCasts++;
    if(kind==='sword'){s.fsSwords.push({x:p.x,y:p.y-26,age:0,ang:-Math.PI/2,dmg:dmg});}
    else{
      var x=p.x,y=p.y-20,hit=[],hops=2+(s.power>>1),hop=0;
      while(hop<hops){f=foeNear(s,x,y,hit,hop?REVERSAL_HOP:0);if(!f)break;hit.push(f);if(s.skillFx.length<80)s.skillFx.push(x,y,f.x,f.y,hop);var fx=f.x,fy=f.y;hitFoe(s,f,dmg*Math.pow(.85,hop));x=fx;y=fy;hop++;if(frand(s)>=REVERSAL_CHAIN_P)break;}
      if(hop)s.fsHits+=hop;
    }
    s.fsLast={kind:kind,tick:s.tick};note(s,'focusSkill');
  }
  // 깨진 큰 탄 하나에서만 작은 잔탄이 나온다. 영웅을 향하는 방향은 비우고 넓게 벌어지며,
  // 생성 후 0.6초는 무해하다. 잔탄은 다시 부서지거나 분열하지 않는다. 폭탄·구간 정리는 이 함수를 부르지 않는다.
  function fragmentOrb(s,x,y,color,heading){
    var dx=x-s.player.x,dy=y-s.player.y,away=dx*dx+dy*dy>1e-6?Math.atan2(dy,dx):heading+Math.PI;
    for(var k=0;k<ORB_FRAGMENT_COUNT&&s.n<s.cap;k++){
      var before=s.n;
      spawn(s,x,y,away+(k-1)*.9,ORB_FRAGMENT_SPEED,{size:0,color:color,life:480,fragment:true,grace:ORB_FRAGMENT_GRACE,breakable:false});
      s.orbFragments+=s.n-before;
    }
  }
  // 영웅 탄의 한 틱 이동 선분으로 검사한다. 한 발은 가장 먼저 만난 파괴 가능한 몸체 하나에만 막힌다.
  // 벡터 배열의 교환 삭제 때 남은 내구도·파괴 표시·생성 보호 시간도 같이 옮긴다.
  function shotCircleEntry(dx,dy,vx,vy,len2,r){
    var c=dx*dx+dy*dy-r*r;
    if(c<=0)return 0;
    if(!len2)return Infinity;
    var dot=dx*vx+dy*vy,disc=dot*dot-len2*c;
    if(disc<0)return Infinity;
    var t=(-dot-Math.sqrt(disc))/len2;
    return t>=0&&t<=1?t:Infinity;
  }
  function shotHitsOrb(s,x0,y0,x1,y1,dmg){
    var vx=x1-x0,vy=y1-y0,len2=vx*vx+vy*vy,near=Infinity,at=-1,minX=Math.min(x0,x1),maxX=Math.max(x0,x1),minY=Math.min(y0,y1),maxY=Math.max(y0,y1);
    for(var k=s.n-1;k>=0;k--){
      if(!isBulletBreakable(s,k))continue;
      var rim=s.bsize[k]===SHAPE_PROP?propHitOf(s.bcolor[k]):null;
      var r=(rim?rim.extent*s.sizeScale:bulletRadius(s,k))+3,bx=s.bx[k],by=s.by[k];
      if(bx<minX-r||bx>maxX+r||by<minY-r||by>maxY+r)continue;
      var dx=x0-bx,dy=y0-by,entry=Infinity;
      if(rim){
        // 탄 경로를 기물 좌표로 한 번 돌린 뒤, 피격 판정과 같은 날·가장자리에서 첫 접점을 찾는다.
        var angle=propTurn(s,k),cos=Math.cos(angle),sin=Math.sin(angle),sc=s.sizeScale;
        var lx=dx*cos+dy*sin,ly=dy*cos-dx*sin,lvx=vx*cos+vy*sin,lvy=vy*cos-vx*sin;
        for(var j=0;j<rim.pts.length&&entry>0;j++){
          var pt=rim.pts[j];
          entry=Math.min(entry,shotCircleEntry(lx-pt[0]*sc,ly-pt[1]*sc,lvx,lvy,len2,pt[2]*sc+3));
        }
      }else entry=shotCircleEntry(dx,dy,vx,vy,len2,r);
      if(entry<near){near=entry;at=k;}
    }
    if(at<0)return false;
    if(s.bhp[at]<=0)s.bhp[at]=breakableHp(s.bsize[at],s.bcolor[at]);
    s.bhp[at]-=dmg;
    if(s.bhp[at]<=1e-6){
      var bx=s.bx[at],by=s.by[at],color=s.bcolor[at],heading=s.ba[at];
      if(s.bsize[at]===SHAPE_PROP)color=PROPS[color].glow===undefined?WHITE:PROPS[color].glow;
      if(s.pops.length<64*3)s.pops.push(bx,by,0);
      removeBullet(s,at);s.orbsBroken++;s.score+=2;fragmentOrb(s,bx,by,color,heading);
      if(s.tick-(s.orbBreakTick===undefined?-99:s.orbBreakTick)>=6){s.orbBreakTick=s.tick;note(s,'orbBreak');}
    }
    return true;
  }
  function updateShots(s){
    var b=s.boss,p=s.player,i,k,target=homingX(s),plan=POWER_SHOTS[s.power],dmg=shotDamage(s),haste=s.tick<s.hasteUntil?1:0,lay,hero=heroProfile(s),clockHands=hero&&hero.shot.style==='clock-hands'?hero.shot:null,offset,vx;
    // 단계마다 주포·유도탄이 늘고 간격이 짧아진다(가속 중에는 한 틱 더 짧게). 적 바로 아래에 서면 주포까지 맞아 훨씬 빨리 깬다.
    // 윤서하는 같은 탄 수·간격·피해로 시간검을 펼친다. 저속일 때만 주포와 유도탄 출발 폭을 좁혀 집중한다.
    var seohaFocus=isSeohaHero(s)&&p.focus;
    if(s.tick%Math.max(3,plan[1]-haste)===0){var special=isSeohaHero(s)?(s.tick>=s.tbNext&&foeNear(s,p.x,p.y,[])?2:0):(++s.volleys%CHARGE_EVERY===0?1:0);lay=MAIN_LAYOUT[plan[0]];for(k=0;k<lay.length&&s.sn<SHOT_CAP;k++){
      offset=lay[k][0];vx=lay[k][1];if(clockHands){offset*=p.focus?clockHands.focusOffsetScale:clockHands.offsetScale;vx=(k-(lay.length-1)*.5)*(p.focus?clockHands.focusSpread:clockHands.spread);}
      var kd=k===(lay.length>>1)?special:0,sp=seohaFocus?(kd===2?SEOHA_FOCUS_TB:SEOHA_FOCUS_SHOT):1;
      s.shoming[s.sn]=0;s.skind[s.sn]=kd;s.sspd[s.sn]=SHOT_SPEED*sp;s.svx[s.sn]=vx*sp;s.sx[s.sn]=p.x+offset;s.sy[s.sn++]=p.y-18;}
      if(special===2){s.tbNext=s.tick+(seohaFocus?SEOHA_FOCUS_TB_EVERY:TIMEBOMB_EVERY);note(s,'tbFire');}else if(special===1)note(s,'sparkFire');}
    if(s.tick%Math.max(4,plan[3]-haste)===0){lay=HOMING_LAYOUT[plan[2]];for(k=0;k<lay.length&&s.sn<SHOT_CAP;k++){
      offset=lay[k];if(clockHands)offset*=p.focus?clockHands.focusHomingOffsetScale:clockHands.homingOffsetScale;
      s.shoming[s.sn]=1;s.skind[s.sn]=0;s.sspd[s.sn]=SHOT_SPEED*(seohaFocus?SEOHA_FOCUS_SHOT:1);s.svx[s.sn]=0;s.sx[s.sn]=p.x+offset;s.sy[s.sn++]=p.y-4+Math.abs(offset)*.1;}}
    if(plan[4]&&s.tick%Math.max(20,plan[5]-haste*8)===0)memoryBolt(s,plan[4],plan[6]);
    for(i=s.sn-1;i>=0;i--){
      var sx0=s.sx[i],sy0=s.sy[i];
      s.sy[i]-=s.sspd[i]||SHOT_SPEED;s.sx[i]+=s.svx[i];
      if(s.shoming[i]&&target!==null){var steer=target-s.sx[i];s.sx[i]+=steer>HOMING_STEER?HOMING_STEER:steer<-HOMING_STEER?-HOMING_STEER:steer;}
      var hit=shotHitsOrb(s,sx0,sy0,s.sx[i],s.sy[i],dmg);
      var kind=s.skind[i],foe=null;
      if(!hit&&s.stage==='card'&&Math.abs(s.sx[i]-b.x)<30&&Math.abs(s.sy[i]-b.y)<34){hit=true;foe=b;}
      for(k=s.mobs.length-1;k>=0&&!hit;k--){
        var m=s.mobs[k];if(Math.abs(s.sx[i]-m.x)>m.r+4||Math.abs(s.sy[i]-m.y)>m.r+9)continue;
        hit=true;foe=m;
      }
      if(foe)shotStrike(s,foe,s.sx[i],s.sy[i],dmg,kind);
      if(!hit)hit=shotHitsPiece(s,s.sx[i],s.sy[i],dmg);
      if(!hit)hit=shotHitsRiser(s,s.sx[i],s.sy[i],dmg);
      if(hit||s.sy[i]<-20||s.sx[i]<-20||s.sx[i]>W+20){var j=--s.sn;s.sx[i]=s.sx[j];s.sy[i]=s.sy[j];s.svx[i]=s.svx[j];s.shoming[i]=s.shoming[j];s.skind[i]=s.skind[j];s.sspd[i]=s.sspd[j];}
    }
    updateTimeBombs(s);
  }
  function shotMark(s,x,y,kind,x1,y1){if(s.shotHits.length<SHOT_HITS_CAP*5)s.shotHits.push(x,y,kind,x1===undefined?x:x1,y1===undefined?y:y1);}
  // 영웅 탄 한 발이 보스·몹에 맞았다. 일반 탄은 그대로, 충전탄은 일부를 옆 적에 튀기고(합계 같음), 시간탄은 붙는다.
  function shotStrike(s,foe,x,y,dmg,kind){
    var b=s.boss;
    if(kind===2&&s.tbombs.length<TIMEBOMB_CAP){s.tbombs.push({foe:foe,ox:x-foe.x,oy:Math.max(-12,Math.min(12,y-foe.y)),x:x,y:y,age:0,dmg:dmg});note(s,'tbStick');}
    var share=1;
    if(kind===1){var o=foeNear(s,foe.x,foe.y,[foe],CHARGE_REACH);if(o){share=1-CHARGE_ARC;shotMark(s,foe.x,foe.y,3,o.x,o.y);hitFoe(s,o,dmg*CHARGE_ARC);}note(s,'sparkHit');}
    shotMark(s,x,y,kind===1?1:0);
    if(foe===b){b.hp-=dmg*share;s.score+=2;if(s.tick-b.hitTick>=5){b.hitTick=s.tick;note(s,b.hp/b.maxHp<=.2?'bossHitLow':'bossHit');}}
    else{foe.hp-=dmg*share;foe.hitTick=s.tick;if(foe.hp<=1e-6){var k=s.mobs.indexOf(foe);if(k>=0)killMob(s,k);}}
  }
  function foeAlive(s,f){return f===s.boss?s.stage==='card'&&f.present&&!f.leaving&&f.hp>0:f.hp>1e-6&&s.mobs.indexOf(f)>=0;}
  function updateTimeBombs(s){
    for(var i=s.tbombs.length-1;i>=0;i--){
      var t=s.tbombs[i],alive=foeAlive(s,t.foe);t.age++;
      if(alive){t.x=t.foe.x+t.ox;t.y=t.foe.y+t.oy;}
      if(alive&&t.age<TIMEBOMB_FUSE)continue;
      s.tbombs.splice(i,1);shotMark(s,t.x,t.y,4);note(s,'tbBoom');
      if(alive&&TIMEBOMB_MULT)hitFoe(s,t.foe,t.dmg*TIMEBOMB_MULT);
      var near=[],k;if(s.stage==='card'&&s.boss!==t.foe&&foeAlive(s,s.boss)&&Math.abs(s.boss.x-t.x)<TIMEBOMB_R+20&&Math.abs(s.boss.y-t.y)<TIMEBOMB_R+20)near.push(s.boss);
      for(k=0;k<s.mobs.length;k++){var m=s.mobs[k];if(m!==t.foe&&(m.x-t.x)*(m.x-t.x)+(m.y-t.y)*(m.y-t.y)<(TIMEBOMB_R+m.r)*(TIMEBOMB_R+m.r))near.push(m);}
      for(k=0;k<near.length;k++)hitFoe(s,near[k],t.dmg*TIMEBOMB_SPLASH);
    }
  }
  // 광선을 한 틱 진행하고, 켜져 있는 광선이 영웅에게 닿았는지 돌려준다.
  function updateLasers(s){
    var p=s.player,struck=false,fired=false,grazed=0,i;
    for(i=s.lasers.length-1;i>=0;i--){
      var l=s.lasers[i],lt=s.efire!==false||!l.age;if(lt)l.age++; // 서하 시간제어: 광선의 예고·켜짐·회전도 적의 시계(enemyClock)로만 흐른다
      if(l.follow){l.x=s.boss.x;l.y=s.boss.y;}
      if(lt&&l.spin&&l.age>l.warn)l.angle+=l.spin*TICK;
      if(l.age>l.warn+l.active+BEAM_FADE){s.lasers.splice(i,1);continue;}
      var cos=Math.cos(l.angle),sin=Math.sin(l.angle);
      if(l.age===l.warn){
        fired=true;
        // 참격: 켜지는 순간 선을 따라 쌀알탄이 양옆으로 흩어진다.
        if(l.burst)for(var d=70;d<620;d+=Math.round(64/s.density)){var bx=l.x+cos*d,by=l.y+sin*d;if(bx<-10||bx>W+10||by>H+10)break;spawn(s,bx,by,l.angle+Math.PI/2,34,{color:l.color,size:RICE});spawn(s,bx,by,l.angle-Math.PI/2,34,{color:l.color,size:RICE});}
      }
      if(l.age<l.warn||l.age>=l.warn+l.active)continue;
      var px=p.x-l.x,py=p.y-l.y,along=px*cos+py*sin,dist=along<0&&!l.full?Math.sqrt(px*px+py*py):Math.abs(px*sin-py*cos);
      if(along>BEAM_LENGTH)continue;
      if(dist<l.width*.5*(l.solid?1:BEAM_HIT)+p.r)struck=true; // 화면 덮기 띠(solid)는 보이는 폭 전체가 닿는다: 띠 사이 틈으로 빠져나가지 않게
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
  Object.keys(SIGNATURES).forEach(function(k,i){var v=SIGNATURES[k];SIGNATURES[k]={index:i,glyph:v[0],color:v[1],arms:v[2],edge:v[3],spin:i%2?-1:1,reach:118+(i*29)%50,extra:EXTRAS[i%3]};});
  function signatureOf(actor){return SIGNATURES[actor]||null;}
  // 도형 광선 하나의 선분들 [x1,y1,x2,y2,...]
  function figureSegments(f){
    var out=[],i,k;
    if(f.kind==='zigzag'){for(i=0;i+3<f.points.length;i+=2)out.push([f.points[i],f.points[i+1],f.points[i+2],f.points[i+3]]);return out;}
    if(f.kind==='runes'){var gr=f.grow===undefined?1:f.grow;for(i=0;i<f.rings.length;i++){var q=f.rings[i],R=q.r*(f.fit||1)*(RUNE_GROW+(1-RUNE_GROW)*gr),rot=f.turn*q.dir+q.phase;
      for(k=0;k<q.n;k++){var a0=rot+TAU*k/q.n+q.gap/2,a1=rot+TAU*(k+1)/q.n-q.gap/2,m=Math.max(2,Math.ceil((a1-a0)/.1));
        for(var j=0;j<m;j++){var u0=a0+(a1-a0)*j/m,u1=a0+(a1-a0)*(j+1)/m;out.push([f.cx+Math.cos(u0)*R,f.cy+Math.sin(u0)*R,f.cx+Math.cos(u1)*R,f.cy+Math.sin(u1)*R]);}}}
      return out;}
    var lines=GLYPHS[f.glyph]||[],c=Math.cos(f.turn),sn=Math.sin(f.turn),r=f.r;
    for(i=0;i<lines.length;i++){var L=lines[i];for(k=0;k+3<L.length;k+=2){
      var x1=L[k]*r,y1=L[k+1]*r,x2=L[k+2]*r,y2=L[k+3]*r;out.push([f.cx+x1*c-y1*sn,f.cy+x1*sn+y1*c,f.cx+x2*c-y2*sn,f.cy+x2*sn+y2*c]);}}
    // 꼭짓점을 지나는 큰 원(사용자 11-15 18:42 "그게 진하게 나오면서 돌아가면서 맞으면 피해"): 맨 뒤에 f.ring개 선분으로 붙는다. 문양과 같이 돈다.
    for(i=0;i<(f.ring||0);i++){var a1=f.turn+TAU*i/f.ring,a2=f.turn+TAU*(i+1)/f.ring;out.push([f.cx+Math.cos(a1)*r,f.cy+Math.sin(a1)*r,f.cx+Math.cos(a2)*r,f.cy+Math.sin(a2)*r]);}
    return out;
  }
  /* 보스 둘레에 붙던 문양 광선(summonGlyph)과 도는 바퀴(summonWheels)는 11-14 요청으로 뺐다: 보스 옆에 '3'처럼 보이는 붉은 호가 어색했다.
     그 자리는 그림 쪽 룬 결계(drawRuneBarrier)가 맡는다. 결계는 장식이라 맞지 않는다. */
  /* 직선 레이저 난사: 영웅 쪽 부채꼴로 가는 레이저 여러 줄이 한꺼번에 예고선을 긋고 짧게 켜진다. 줄 사이는 늘 벌어져 있다. */
  function spray(s,sig,t){
    var b=s.boss,n=pick(s,5,6,7),spread=1.7,center=aim(s,b.x,b.y)+(rand(s)-.5)*.5,k,ox=b.x,oy=b.y,wd=9,wn=42;
    if(s.entranceAll){ // 사용자 11-19(그림): 보스에서 비스듬히 나가다 끊기는 가는 부채 대신, 화면 위 끝 너머 한 점에서 퍼져 아래 끝까지 닿는 굵은 광선
      ox=Math.max(40,Math.min(W-40,b.x));oy=FAN_APEX;n=pick(s,3,4,5);spread=.95;center=Math.atan2(s.player.y-oy,s.player.x-ox)+(rand(s)-.5)*.2;wd=FAN_W;wn=60;}
    for(k=0;k<n;k++)beam(s,ox,oy,center+(k/(n-1)-.5)*spread,{width:wd,warn:wn,active:22,color:sig.color});
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
  /* 문양 레이저(사용자 11-14 23:33·23:34 KST): 보스 뒤 육망성처럼 보스를 중심으로 도는 큰 문양과 끊긴 원 고리가 레이저가 된다.
     보스마다 자기 문양(SIGNATURES.glyph)·도는 방향·고리 수가 다르다. 크게 그려 모양이 한눈에 읽히게 하되(보스 옆 작은 '3' 모양 금지),
     화면 아래쪽 절반에는 닿지 않게 반지름을 줄인다(SIGIL_FLOOR). 반지름은 고정이라 안쪽 빈자리와 바깥은 늘 안전하다. */
  var SIGIL_RING_SEGS=48,BIG_SIGIL_R=316,BIG_SIGIL_SPIN=.22,SIGIL_FIT=.38,SIGIL_R=150,SIGIL_RING=1.18,SIGIL_FLOOR=.53,SIGIL_EVERY=1440,SIGIL_AT=30; // 사용자 11-16 "육망성패턴은 … 피할길이 거의없어서 빈도수를 낮춰줘 이펙트 변경하지는 말고": 8초마다 → 24초마다
  [3,4,5].forEach(function(n){GLYPHS['ring'+n]=[];for(var k=0;k<n;k++){var a0=TAU*k/n;GLYPHS['ring'+n].push(arcPts(0,0,1,a0+.32,a0+TAU/n-.32,14));}});
  var glyphReach={};
  function reachOf(name){if(glyphReach[name]===undefined){var m=1,lines=GLYPHS[name]||[];for(var i=0;i<lines.length;i++)for(var k=0;k+1<lines[i].length;k+=2)m=Math.max(m,Math.sqrt(lines[i][k]*lines[i][k]+lines[i][k+1]*lines[i][k+1]));glyphReach[name]=m;}return glyphReach[name];}
  function sigilRadius(f,want){return want/reachOf(f.glyph);}
  // 흰 문양은 흰 탄·흰 레이저와 한 덩어리로 번진다(심사 11-14): 흰 보스의 문양은 그 보스의 둘째 색, 그것도 희면 하늘색.
  function sigilColor(s,sig){if(sig.color!==WHITE)return sig.color;var a=ACTORS[s.boss.actor];return a&&a.c2!==WHITE?a.c2:CYAN;}
  /* 사용자 11-20 "탄이 있으면 탄이 다 사라진다음에 육망성과 한자패턴이 나왔으면 좋겠는데" + "그렇다고 갑자기 탄을 다 사라지게 하지말고":
     실제 게임에서 화면에 탄이 남아 있거나 앞 육망성·한자 고리가 아직 떠 있으면 문양을 바로 펴지 않고 미룬다. 그동안 새 탄은 나오지 않고,
     남은 탄은 지우지 않은 채 제 길로 날아가 화면 밖으로 나간다(FIG_HURRY틱이 지나도 남으면 판정을 지닌 채 빨라져 나간다). 다 나가면 그때 문양을 편다.
     FIG_WAIT_MAX틱이 지나도 못 비우면 더 미루지 않는다(멈춤 방지). 새 문양이 겹쳐 요청되면 앞 요청 하나만 남긴다. */
  var FIG_HURRY=150,FIG_WAIT_MAX=600;
  function figureBusy(s){for(var i=0;i<s.figures.length;i++){var f=s.figures[i];if((f.sigil||f.kind==='runes')&&f.age<f.warn+f.active)return true;}return false;}
  // 상태는 복제·저장될 수 있으므로 미룬 그림은 함수 대신 이름(sigil·runes)으로 담는다
  function figureDefer(s,fn,args){
    if(!s.entranceAll||s.figRelease)return false;
    if(!s.n&&!figureBusy(s))return false;
    if(!s.figPend)s.figPend={fn:fn,args:args,since:s.tick,seg:s.seg,hurried:false};
    return true;
  }
  function figurePending(s){var q=s.figPend;if(!q)return;
    // 특수 페이즈 창 안에서는 시그니처가 원래 나가지 않으므로, 미뤄 둔 그림도 버린다(특수 페이즈 광선·탄을 굶기지 않게)
    if(q.seg!==s.seg||s.stage!=='card'||s.cardEnding||s.cardDown||spQuiet(s)){s.figPend=null;return;}
    var wait=s.tick-q.since;
    if(!q.hurried&&wait>=FIG_HURRY&&s.n){q.hurried=true;hurryBullets(s);}
    if((!s.n&&!figureBusy(s))||wait>=FIG_WAIT_MAX){s.figPend=null;s.figHeldAt=s.tick;s.figRelease=true;try{(q.fn==="runes"?summonRunes:summonSigil).apply(null,[s].concat(q.args));}finally{s.figRelease=false;}s.figWaits=(s.figWaits||0)+1;}
  }
  function summonSigil(s,sig,index){
    if(figureDefer(s,'sigil',[sig,index]))return;
    if(s.figures.length>=FIGURE_CAP-2)return;
    var warn=Math.max(54,Math.round(70*s.rules.warn)),active=260,dir=sig.spin,rings=3+index%3;
    var parts=[{glyph:'hexagram',want:BIG_SIGIL_R,spin:dir*BIG_SIGIL_SPIN*(1+.15*(index%3)),width:7}]; // 사용자 11-15: 보스 뒤 육망성 하나를 맵 대부분을 덮게 키우고 그 선이 판정. 따로 도는 고리 레이저는 없고, 꼭짓점을 지나는 큰 원(f.ring)이 같이 돌며 판정을 갖는다(18:42).
    parts.forEach(function(q,k){var f={kind:'glyph',sigil:true,glyph:q.glyph,cx:s.boss.x,cy:s.boss.y,want:q.want,turn:TAU*k/7,spin:q.spin,follow:true,period:1e9,
      width:q.width*s.rules.beam,warn:warn,active:active,age:0,color:sigilColor(s,sig),grazed:false,ring:SIGIL_RING_SEGS};f.r=f.r0=f.r1=sigilRadius(f,q.want);s.figures.push(f);});
    note(s,'figure');
  }
  /* 한자문 고리(사용자 11-15 "보스뒤에 나오는 저 원들 톱니처럼도는거 크기를 키우고 굵게해서 패턴용으로 … 안에는 한자 적어놓고", "한자문으로 만들어서 넣어 단순 한자 한글자 반복하지말고").
     보스 뒤에서 돌던 장식 룬 고리 둘이 커지고 굵어져 판정을 갖는다. 고리마다 틈이 있어 톱니처럼 서로 반대로 돌고, 틈으로 드나든다. 고리 띠 안의 한문 문장은 그림 쪽(보스마다 다름).
     큰 육망성(SIGIL)이 켜진 동안에는 켜지지 않는다: 육망성은 t%1440 = 30~360, 고리는 360·640·920·1200(예고 90) 뒤 각 280틱이라 둘이 함께 판정을 갖는 순간이 없다. 이지는 바깥 고리 하나만. */
  /* 사용자 11-16 "원형한자빈도수 늘리고 더 겹겹히 큰사이즈로 더 압도적이게": 육망성 한 번(24초 주기의 처음 6초) 뒤 고리가 4초마다 네 번.
     고리는 네 겹(이지 두 겹), 바깥 고리는 반지름 210으로 필드 좌우를 넘어 화면을 덮는다. 겹마다 반대로 돌고, 켜질 때 틈이 모두 아래를 본다. */
  /* 사용자 11-20 "보스 한자패턴 예고시간과 한자나오는 지속시간 더 늘려줘 지금 너무 빠르게 전환됨": 예고 60→90틱(1.5배), 켜진 시간 150→190틱. 24초 주기 안에 네 번이 그대로 들어가도록 간격 210→280(육망성은 1440 주기 그대로, 마지막 고리 1200+280=1480 은 다음 육망성 판정 1540 보다 앞). */
  var RUNE_SLOW=.7,RUNE_SLOW_EASY=.55; // 사용자 11-19 "한자패턴 조금더 느리게돌게해서 피하기 쉽게"(이지는 더 느리게)
  var RUNE_AT=360,RUNE_TIMES=[360,640,920,1200],RUNE_WARN=90,RUNE_ACTIVE=190,RUNE_GROW=.62,RUNE_SPIN=.55,RUNE_W=24,RUNE_OUTER=210,RUNE_INNER=166,RUNE_RADII=[214,182,150,118,88,60];
  // 고리 중심: 보스를 따르되 가로는 필드 정중앙, 세로는 170~230으로 묶고, 바깥 고리가 띠·매듭까지 좌우 벽 안에 들도록 줄인다(심사 2·3차: 벽에 닿아 잘렸다).
  function runeCentre(f,b){f.cx=W/2;f.cy=Math.max(170,Math.min(b.descended?382:230,b.y+40));f.fit=1;} // 보스가 내려오면(11-18) 고리 중심도 따라 내려와 바깥 띠가 화면 아래 끝 가까이 닿는다
  function summonRunes(s,sig,cast){
    if(figureDefer(s,'runes',[sig,cast]))return;
    if(s.figures.length>=FIGURE_CAP-1)return;
    var spin=sig.spin*RUNE_SPIN*(s.entranceAll?(s.difficulty==='gentle'?RUNE_SLOW_EASY:RUNE_SLOW):1),lead=spin*TICK*.35*RUNE_WARN; // 켜지는 순간 두 고리 모두 틈 하나가 바로 아래(영웅 쪽)를 보게 한다(심사: 화면 안에서 틈이 보여야 한다)
    var layers=(s.difficulty==='gentle'?[2,3,3,3]:[5,6,6,6])[cast||0],rings=[]; // 점층(심사 11-16): 다섯 겹 → 여섯 겹(11-20: 예고·지속을 늘려 짧은 카드엔 두 번만 들어가므로 둘째에서 여섯 겹 도달)(사용자 11-16 "한자문고리6겹해")으로 쌓아 올린 뒤 육망성으로 넘어간다
    for(var k=0;k<layers;k++){var dir=k%2?-1:1,r=RUNE_RADII[k];rings.push({r:r,n:3,gap:Math.min(1.2,Math.max(.62*172/Math.max(120,r)+.04*k,64/r)),dir:dir,phase:Math.PI/2-dir*lead});} // 안쪽 고리일수록 틈 각도를 넓혀 틈 폭(px)을 비슷하게
    var rf={kind:'runes',cx:s.boss.x,cy:s.boss.y,fit:1,follow:true,rings:rings,turn:0,spin:spin,grow:0,width:RUNE_W*s.rules.beam,warn:RUNE_WARN,active:RUNE_ACTIVE,age:0,color:sigilColor(s,sig),r:0,grazed:false};runeCentre(rf,s.boss);s.figures.push(rf);
    note(s,'figure');
  }
  // 보스 고유 연출: 이름 붙은 패턴(spell) 동안 기존 패턴 위에 겹친다.
  function signature(s,t,figuresOnly){
    var sig=signatureOf(s.boss.actor);if(!sig)return;
    if(t%SIGIL_EVERY===SIGIL_AT)summonSigil(s,sig,sig.index);
    var rk=RUNE_TIMES.indexOf(t%SIGIL_EVERY);if(rk>=0)summonRunes(s,sig,rk);
    if(figuresOnly||s.difficulty==='gentle')return; // 이지는 주공격과 문양만: 가장자리 지그재그·보조 실탄·추가 분사를 중첩하지 않는다.
    if(sig.edge&&t%600===260){summonZigzag(s,sig,-1);summonZigzag(s,sig,1);}
    if(t%300<200)strands(s,sig,t);
    if(sig.extra==='spray'&&t%420>=120&&t%420<=330&&t%70===50)spray(s,sig,t);
  }
  // 문양은 자르지 않고 빛이 꺼진 동안 통과한다(11-17). 겹친 문양도 같은 박자로 쉬므로
  // 한 문양의 빈 시간에 다른 문양이 켜져 길을 다시 막지 않는다. 마지막 charge도 판정은 없다.
  var FIGURE_ON_TICKS=60,FIGURE_OFF_TICKS=90,FIGURE_CHARGE_TICKS=18;
  function figurePhase(f,tick){
    if(f.age<f.warn)return 'warn';
    if(f.age>=f.warn+f.active)return 'fade';
    var period=FIGURE_ON_TICKS+FIGURE_OFF_TICKS,t=((tick%period)+period)%period;
    if(t<FIGURE_ON_TICKS)return 'on';
    return t>=period-FIGURE_CHARGE_TICKS?'charge':'off';
  }
  function updateFigures(s){
    var p=s.player,struck=false,grazed=0;
    for(var i=s.figures.length-1;i>=0;i--){
      var f=s.figures[i],ft=s.efire!==false||!f.age;if(ft)f.age++; // 문양도 적의 시계로
      if(f.age>f.warn+f.active+BEAM_FADE){s.figures.splice(i,1);continue;}
      if(f.orbit&&s.boss.present){var o=f.orbit,R=o.near+(o.far-o.near)*(.5-.5*Math.cos(TAU*f.age/o.period)),A=o.phase+o.speed*f.age*TICK;f.cx=s.boss.x+Math.cos(A)*R;f.cy=s.boss.y+Math.sin(A)*R;}
      if(f.kind==='runes'){if(f.follow&&s.boss.present)runeCentre(f,s.boss);f.grow=Math.min(1,f.age/f.warn);f.turn+=f.spin*TICK*(f.age<f.warn?.35:1);}
      if(f.kind==='glyph'){if(f.follow&&s.boss.present){f.cx=s.boss.x;f.cy=s.boss.y;}if(f.sigil)f.r=f.r0=f.r1=sigilRadius(f,f.want);f.turn+=f.spin*TICK*(f.age<f.warn?.35:1);f.r=f.r0+(f.r1-f.r0)*(.5-.5*Math.cos(TAU*f.age/f.period));}
      if(figurePhase(f,s.tick)!=='on')continue;
      var segs=figureSegments(f),reach=f.width*.5*BEAM_HIT+p.r,near=1e9;
      for(var k=0;k<segs.length;k++){var g=segs[k],dx=g[2]-g[0],dy=g[3]-g[1],L=dx*dx+dy*dy||1,u=((p.x-g[0])*dx+(p.y-g[1])*dy)/L;u=u<0?0:u>1?1:u;
        var d=Math.sqrt(Math.pow(p.x-g[0]-u*dx,2)+Math.pow(p.y-g[1]-u*dy,2));if(d<near)near=d;}
      if(near<reach)struck=true;else if(!f.grazed&&near<f.width*.5+GRAZE_MARGIN){f.grazed=true;grazed++;}
    }
    if(grazed){s.graze+=grazed;s.gauge+=grazed*2;s.score+=grazed*40;note(s,'graze');}
    return struck;
  }
  var WALL_KICK_Y=.6,DOWN_LO=1.0,DOWN_SIN=.84,SOFT_DESCEND_AGE=95,DESCEND_AGE=150,LIVE_DESCEND_AGE=45,LIVE_DESCEND_AGE_HELL=60,DESCEND_Y=470,DESCEND_TURN=.05,DESCEND_SPEED=72;
  function updateBullets(s){
    var p=s.player,px=p.x,py=p.y,struck=false,grazed=0,hitScale=s.rules.hitScale,i,k,field=slowField(s),fr=field[0],fs=field[1],tempo=abilityOf(s).bulletSpeed;
    for(i=s.n-1;i>=0;i--){
      var age=++s.bage[i];
      if(s.bexit[i]){var da=Math.atan2(Math.cos(s.ba[i]),Math.sin(s.ba[i]));s.ba[i]+=da>EXIT_TURN?EXIT_TURN:da<-EXIT_TURN?-EXIT_TURN:da;var es=Math.max(s.bs[i],EXPIRE_SPEED*.5)*EXIT_GROW;s.bs[i]=es>EXIT_MAX?EXIT_MAX:es;var ex2=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK,ey2=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK;
        if(ex2<-36||ex2>W+36||ey2<-48||ey2>H+36)removeBullet(s,i);continue;} // 나가는 탄: 판정 없이 점점 빨라져 화면 밖으로
      if(s.bat[i]&&age===s.bat[i]){
        var mode=s.bmode[i];
        if(mode===MODE_SPLIT||mode===MODE_BRANCH){
          var sx=s.bx[i],sy=s.by[i],color=s.bcolor[i],parts=Math.round(s.barg[i]),speed=s.bs2[i]/s.rules.speed,heading=s.ba[i],gen=s.bgen[i],size=s.bsize[i],at=s.bat[i];
          removeBullet(s,i);s.splitting=true; // 이미 화면에 있는 탄이 갈라지는 것은 새 탄이 아니다: 그림 대기 중에도 막지 않는다
          if(mode===MODE_SPLIT)ring(s,sx,sy,parts,speed,heading,{color:color,size:0});
          // 가지치기: 진행 방향을 중심으로 부채꼴로 갈라지고, 세대가 남아 있으면 가지가 다시 갈라진다.
          else for(k=0;k<parts;k++)spawn(s,sx,sy,heading+(k-(parts-1)/2)*.5,speed,gen>1?{color:color,size:Math.max(0,size-1),at:at,mode:MODE_BRANCH,arg:parts,gen:gen-1,speed2:speed}:{color:color,size:0});
          s.splitting=false;note(s,'pop');continue;
        }
        if(mode===MODE_REAIM)s.ba[i]=Math.atan2(py-s.by[i],px-s.bx[i])+s.barg[i];else if(mode===MODE_TURN)s.ba[i]+=s.barg[i];
        s.bs[i]=s.bs2[i];s.bacc[i]=0;
      }
      if(s.bturn[i])s.ba[i]+=s.bturn[i]*TICK;
      // 아래로 내려오는 보장(사용자 11-17 "보스 탄환은 보스 주변만 돌지 말고 언젠가는 아래로 내려와 의미가 있게"): 2.5초가 지나도 위쪽에 머무는 탄은 영웅이 있는 아랫녘으로 부드럽게 휘어 내려온다.
      if(s.entranceAll&&!s.bformation[i]&&age>(s.entranceAll?(s.difficulty==='hell'?LIVE_DESCEND_AGE_HELL:LIVE_DESCEND_AGE):s.difficulty==='hell'?DESCEND_AGE:SOFT_DESCEND_AGE)&&s.by[i]<DESCEND_Y&&s.bsize[i]!==SHAPE_PROP&&!s.bfragment[i]){
        var want=s.entranceAll?(Math.cos(s.ba[i])<0?Math.PI-DOWN_LO:DOWN_LO):Math.atan2(py+70-s.by[i],px+((i*37)%9-4)*24-s.bx[i]), // 실제 게임은 영웅에게 모이지 않고 제 옆 방향을 지킨 채 가파르게 내려온다: 화면 아래 전체가 위협
          lo=s.entranceAll?DOWN_LO:.22,hi=Math.PI-lo; // 사용자 11-19 "대부분의 패턴은 맵아래까지": 실제 게임은 더 가파르게 내려와 옆으로 새지 않는다if(want<lo)want=lo;else if(want>hi)want=hi;
        var ha=s.ba[i];while(ha>Math.PI)ha-=TAU;while(ha<-Math.PI)ha+=TAU;var dd=want-ha;if(dd>Math.PI)dd-=TAU;else if(dd<-Math.PI)dd+=TAU;
        if(Math.sin(ha)<(s.entranceAll?DOWN_SIN:.55)){s.ba[i]=ha+(dd>DESCEND_TURN?DESCEND_TURN:dd<-DESCEND_TURN?-DESCEND_TURN:dd);s.bacc[i]=0;var fl=DESCEND_SPEED*s.rules.speed;if(s.bs[i]<fl)s.bs[i]=fl;}
      }
      if(s.bacc[i]){var v=s.bs[i]+s.bacc[i]*TICK;s.bs[i]=v<s.bmin[i]?s.bmin[i]:v>s.bmax[i]?s.bmax[i]:v;}
      var slow=tempo,fdx=s.bx[i]-px,fdy=s.by[i]-py;if(fdx<fr&&fdx>-fr&&fdy<fr&&fdy>-fr){var fd=Math.sqrt(fdx*fdx+fdy*fdy);if(fd<fr)slow=tempo*(1-fs*(1-fd/fr));} // 능력조절 빠르기(tempo)에 둘레 둔화를 곱한다 // 영웅 둘레 시간 둔화: 가까울수록 느리다(판정은 그대로)
      var ox=s.bx[i],oy=s.by[i],x=s.bx[i]+=Math.cos(s.ba[i])*s.bs[i]*TICK*slow,y=s.by[i]+=Math.sin(s.ba[i])*s.bs[i]*TICK*slow;
      // 벽에서 되돌아오는 탄: 좌우 벽과 위 벽에서 한 번(남은 횟수만큼) 튕긴다. 아래로는 튕기지 않는다(영웅 뒤에서 오지 않게).
      if(s.bbounce[i]){var a0=s.ba[i];
        if((x<0&&Math.cos(a0)<0)||(x>W&&Math.cos(a0)>0)){s.ba[i]=Math.PI-a0;s.bx[i]=x=x<0?0:W;s.bbounce[i]--;if(s.bmirror[i])mirrorHit(s,i,x,y);}
        else if(y<0&&Math.sin(a0)<0&&age>BLOOM_TICKS){s.ba[i]=-a0;s.by[i]=y=0;s.bbounce[i]--;if(s.bmirror[i])mirrorHit(s,i,x,y);}}
      if(x<-36||x>W+36||y<-48||y>H+36){removeBullet(s,i);continue;}
      if(age>=s.blife[i]){
        // 화면 한가운데에서 수명이 다해 사라지지 않는다. 그대로 끝까지 날아가고(멈춘 탄은 다시 움직인다), 옆 벽에서 한 번 되돌아온다.
        if(x<-4||x>W+4||y<-4||y>H+4){removeBullet(s,i);continue;}
        s.blife[i]=65535;s.bacc[i]=0;s.bturn[i]=0;if(s.bs[i]<EXPIRE_SPEED)s.bs[i]=EXPIRE_SPEED;if(s.bsize[i]!==SHAPE_PROP&&!s.bbounce[i])s.bbounce[i]=1;
      }
      if(age<Math.max(BLOOM_TICKS,s.bgrace[i]))continue; // 갓 피어난 탄과 파괴 직후의 잔탄은 아직 닿지 않는다
      var dx=x-px,dy=y-py,radius=bulletRadius(s,i),d2=dx*dx+dy*dy,reach=radius+GRAZE_MARGIN,rim=s.bsize[i]===SHAPE_PROP?propHitOf(s.bcolor[i]):null;
      if(rim)reach=Math.max(reach,rim.extent*hitSize(s)+GRAZE_MARGIN);
      // 빠른 탄(한 틱에 4px 넘게 움직이는 탄)은 이전 위치→새 위치 선분에서 영웅에 가장 가까운 점으로 잰다: 한 틱 사이에 영웅을 건너뛰어도 맞는다.
      var mx=x-ox,my=y-oy,m2=mx*mx+my*my;
      if(m2>16){var u=((px-ox)*mx+(py-oy)*my)/m2;u=u<0?0:u>1?1:u;dx=ox+mx*u-px;dy=oy+my*u-py;d2=dx*dx+dy*dy;}
      if(d2>reach*reach)continue;
      if(rim){
        // 무기탄: 중심과 가장자리 판정점 중 가장 가까운 점으로 맞음·스침을 정한다(점은 그려진 각도대로 돈다).
        var tn=propTurn(s,i),co=Math.cos(tn),si=Math.sin(tn),sc=hitSize(s),hit=false,graze=false,pt,j,lx,ly,ex,ey,dd;
        var cx0=px+dx,cy0=py+dy; // 가장 가까운 지점에서의 기물 중심(빠른 탄은 선분 위 점)
        for(j=0;j<rim.pts.length;j++){pt=rim.pts[j];lx=pt[0]*sc;ly=pt[1]*sc;ex=cx0+lx*co-ly*si-px;ey=cy0+lx*si+ly*co-py;dd=ex*ex+ey*ey;
          var pr3=pt[2]*sc,hr=pr3*hitScale+p.r,gr=pr3+GRAZE_MARGIN;if(dd<hr*hr){hit=true;break;}if(dd<gr*gr)graze=true;}
        if(hit)struck=true;else if(graze&&!s.bgrazed[i]){s.bgrazed[i]=1;grazed++;}
        continue;
      }
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
  /* 한 번에 나오는 패턴 종류(사용자 11-19 "이지는 한번에 탄환 혹은 패턴 한종류만나오게 노멀은 두종류 헬은 3종류만"):
     종류 = 본 공격(몹 사격·보스 소절·특수 페이즈) / 문양·광선 / 반사탄 / 배경 압박(바닥·솟는 그림·손·해골). 새 종류는 남은 칸이 있을 때만 시작한다 */
  var LAYER_CAP={gentle:1,normal:2,hell:3};
  /* 종류가 넘치면 반사탄이 양보한다: 보스 대본의 광선·문양이 새로 켜져 칸이 넘치면 남은 튕김을 거두어 보통 탄처럼 밖으로 나가게 한다(고리도 사라진다) */
  function yieldMirror(s){if(!s.entranceAll||!mirrorLive(s))return;var cap=layerCap(s)+(layerCap(s)===1?1:0);if(layersBut(s,'')<=cap)return;for(var i=0;i<s.n;i++)if(s.bmirror[i])s.bbounce[i]=0;}
  var SOLO_MAX=240;
  function soloHold(s){var hold=s.entranceAll&&layerCap(s)===1&&(figureLive(s)||mirrorLive(s));s.soloT=hold?(s.soloT||0)+1:0;return hold&&s.soloT<=SOLO_MAX;} // 이지: 문양·광선·반사탄이 떠 있는 동안 본 공격은 쉰다(최대 4초)
  function layerCap(s){return LAYER_CAP[s.difficulty]||2;}
  function figureLive(s){if(s.figures.length)return true;for(var i=0;i<s.lasers.length;i++){var l=s.lasers[i];if(l.age<l.warn+l.active)return true;}return false;}
  function mirrorLive(s){for(var i=0;i<s.n;i++)if(s.bmirror[i]&&s.bbounce[i]&&!s.bexit[i])return true;return false;} // 튕김이 남은 동안만 반사탄 종류로 센다
  function ambientLive(s){var F=s.floor;if(s.ripples&&s.ripples.length)return true;if(F&&(F.kind||F.pieces.length||F.warns.length))return true;var R=s.risers;if(R)for(var i=0;i<R.length;i++)if(!R[i].fade)return true;return false;}
  function mainLive(s){return s.stage==='wave'?s.mobs.length>0:s.stage==='card'&&!s.cardEnding;}
  function layersBut(s,skip){return (skip!=='main'&&mainLive(s)?1:0)+(skip!=='figure'&&figureLive(s)?1:0)+(skip!=='mirror'&&mirrorLive(s)?1:0)+(skip!=='ambient'&&ambientLive(s)?1:0);}
  function allowAmbientStart(s){
    if(s.entranceAll&&layersBut(s,'ambient')>=layerCap(s))return false;
    if(s.entranceAll&&(s.cardEnding||s.cardDown||s.stage==='card'&&(s.figures.length||s.lasers.length>2)))return false; // 패턴 겹침 자제(사용자 11-19): 문양·광선이 떠 있거나 보스가 쓰러지는 중이면 배경 압박을 새로 얹지 않는다
    if(spQuiet(s))return false; // 특수 페이즈 중에는 배경 압박을 따로 얹지 않는다(특수 페이즈가 직접 낸다)
    if(s.stage==='wave')return s.segTick<waveDuration(s,segment(s));
    if(s.stage!=='card'||s.difficulty==='gentle')return false;
    // Named attacks and app entrance rhythms have their own cues. Other plain cards keep the stage backdrop.
    if(!s.entranceAll)return true;
    var seg=segment(s),phase=phaseOf(s.seg);
    if(!phase||seg.spell||phase.no===1||s.segTick<=FIRE_DELAY)return false;
    // A short admission window leaves time for the floor, hand and ink warnings before the variation.
    var beat=s.phraseTick%phraseLen(s);
    return beat>=60&&beat<120;
  }
  function themed(s){
    var kind=THEMED[STAGES[s.stageIndex].scene],t=s.stageTick,i;if(!kind||(s.stage!=='wave'&&s.stage!=='card'))return;
    var start=allowAmbientStart(s);
    if(kind==='hands'){
      if(start&&t%pick(s,110,95,80)===0&&s.ripples.length<6){var rx=24+rand(s)*(W-48);if(Math.abs(rx-s.player.x)<HAND_AWAY)rx=s.player.x+(s.player.x<W/2?1:-1)*(HAND_AWAY+rand(s)*60);s.ripples.push({x:rx,age:0});}
      // 영웅 바로 밑(HAND_AWAY 안)에서는 솟지 않는다: 물결 자리를 영웅에게서 떨어뜨리고, 그사이 영웅이 그 위로 오면 손은 가라앉는다(헛물결).
      for(i=s.ripples.length-1;i>=0;i--){var r=s.ripples[i];if(++r.age>=HAND_WARN){if(Math.abs(r.x-s.player.x)>=HAND_AWAY)spawn(s,r.x,H+8,-Math.PI/2,pick(s,30,34,42),{size:SHAPE_PROP,color:P['demon-hand'],life:1400});s.ripples.splice(i,1);}}
    }else if(start&&t%pick(s,100,85,70)===40){var x=30+rand(s)*(W-60);spawn(s,x,-10,aim(s,x,-10),pick(s,44,50,62),{size:SHAPE_PROP,color:P.skull});}
  }
  /* ── 아래쪽 압박(사용자 11-15 "맨아래에만 있으면 피하기 쉬워서 …"). 화면 맨 아래에 숨어 있지 못하게 네 가지를 스테이지마다 둘씩 섞어 번갈아 낸다.
   *  rise    아래에서 가끔 몹이 올라온다(영웅에게서 떨어진 자리).
   *  blocks  테트리스처럼 조각이 떨어져 아래에 쌓인다. 떨어지는 조각은 닿으면 아프고, 쌓인 블록은 바닥이 되어 영웅을 위로 밀어 올린다. 한 줄이 차면 지워진다.
   *  terrain 아래에서 지형(언덕)이 솟아 바닥 공간을 줄인다. 닿아도 아프지 않고 위로 밀어 올린다.
   *  lines   아래쪽에 ㅡ(한 줄)·=(두 줄) 가로 광선이 그어져 위로 몰아낸다.
   *  쌓이는 높이는 FLOOR_ROWS칸(30px)까지라 위쪽 공간은 늘 남는다(사용자 11-15 "피할길 안남겨도 됨 그냥 공간만남겨도됨"). 이지는 한 가지만, 더 드물게. ── */
  var FLOOR_KINDS=['rise','blocks','terrain','lines'],FLOOR_COLS=12,FLOOR_CELL=W/FLOOR_COLS,FLOOR_CYCLE=720,FLOOR_ON=90,FLOOR_OFF=600,FLOOR_LINE_Y=[H-40,H-70];
  var FLOOR_PIECES=[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[2,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[0,1],[0,2],[1,0]],[[1,0],[1,1],[0,1],[0,2]]];
  function floorPlan(index,difficulty){var a=index%4,b=(a+1+((index>>2)%3))%4;return difficulty==='gentle'?[FLOOR_KINDS[a]]:[FLOOR_KINDS[a],FLOOR_KINDS[b]];}
  function floorRows(s){return pick(s,3,4,4);}
  function floorRand(F){var x=F.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;F.rng=x>>>0;return F.rng/4294967296;} // 바닥 압박은 따로 굴리는 난수: 기존 패턴의 탄 배치를 바꾸지 않는다
  function freshFloor(s,index){return {stage:index,t:0,kind:'',rng:((s.seed*2654435761)^(index*40503+1))>>>0||1,grid:new Uint8Array(FLOOR_COLS*6),hill:new Float32Array(FLOOR_COLS),goal:new Float32Array(FLOOR_COLS),pieces:[],bursts:[],broken:0,warns:[],clearing:0,lines:0,cleared:0,risen:0,dropped:0,mounds:0};}
  function stackHeight(F,c){for(var r=5;r>=0;r--)if(F.grid[r*FLOOR_COLS+c])return r+1;return 0;}
  // 그 x에서 바닥(쌓인 블록·지형) 윗면의 y. 바닥이 없으면 H.
  function floorTop(s,x){var F=s.floor,c=Math.max(0,Math.min(FLOOR_COLS-1,Math.floor(x/FLOOR_CELL)));return H-Math.max(stackHeight(F,c)*FLOOR_CELL,F.hill[c]);}
  var FLOOR_BEAM_W=18; // 아래쪽 가로줄도 굵게(배포 뒤 실플레이 심사 11-19: 25px 안팎으로 가늘었다, 사용자 '굵게')
  function floorLine(s,y,color,lag){lag=lag||0;if(s.lasers.length>=LASER_CAP)return;s.lasers.push({x:-12,y:y,angle:0,width:(s.entranceAll?FLOOR_BEAM_W:12)*s.rules.beam,warn:Math.round(72*s.rules.warn)+lag,active:140-lag,color:color,spin:0,follow:false,burst:false,age:0,grazed:false,floor:true});if(!s.warned){s.warned=true;note(s,'laserWarn');}}
  // 내려오는 조각은 영웅 공격으로 깨진다(사용자 11-16 "테트리스 내려오는건 영웅공격으로 꺠부실수 있도록"). 칸마다가 아니라 조각 하나에 체력 하나.
  var PIECE_HP=9,PIECE_SCORE=150,BURST_TICKS=40;
  function pieceHp(s){return Math.round(PIECE_HP*(s.difficulty==='gentle'?.6:1.35));}
  function shotHitsPiece(s,x,y,dmg){var F=s.floor;if(!F||!F.pieces.length)return false;
    for(var k=F.pieces.length-1;k>=0;k--){var q=F.pieces[k];
      for(var j=0;j<q.cells.length;j++){var x0=(q.col+q.cells[j][0])*FLOOR_CELL,y1=q.y-q.cells[j][1]*FLOOR_CELL,y0=y1-FLOOR_CELL;
        if(x<x0||x>x0+FLOOR_CELL||y<y0-8||y>y1)continue;
        if(q.hp===undefined){q.hp=pieceHp(s);q.maxHp=q.hp;}
        q.hp-=dmg;q.hitTick=s.tick;if(s.tick-(F.pieceHitTick||-99)>=6){F.pieceHitTick=s.tick;note(s,'pieceHit');}
        if(q.hp<=1e-6){F.pieces.splice(k,1);F.broken++;s.score+=PIECE_SCORE;note(s,'pieceBreak');
          if(F.bursts.length<12)F.bursts.push({cells:q.cells,col:q.col,y:q.y,color:q.color,age:0});}
        return true;}}
    return false;}
  function dropPiece(s,F,most){
    var rows=floorRows(s);if(F.pieces.length>=(most||pick(s,2,3,3)))return; // 한 번에 떨어지는 조각 수 제한(심사 1차: 과밀)
    for(var tries=0;tries<5;tries++){
      var shape=FLOOR_PIECES[Math.floor(floorRand(F)*FLOOR_PIECES.length)],wide=0,tall=0,k;for(k=0;k<shape.length;k++){wide=Math.max(wide,shape[k][0]+1);tall=Math.max(tall,shape[k][1]+1);}
      var col=Math.floor(floorRand(F)*(FLOOR_COLS-wide+1)),land=0;if(tries<2&&floorRand(F)<.5)col=Math.max(0,Math.min(FLOOR_COLS-wide,Math.floor(s.player.x/FLOOR_CELL)-(wide>>1))); // 절반은 영웅 쪽 칸을 겨눠 바닥 가운데 골이 숨을 곳이 되지 않게(심사 3차)
      for(k=0;k<shape.length;k++)land=Math.max(land,stackHeight(F,col+shape[k][0])-shape[k][1]);
      if(land+tall>rows)continue; // 쌓이면 상한을 넘는 자리는 고르지 않는다
      var hp=pieceHp(s);F.pieces.push({cells:shape,col:col,y:-tall*FLOOR_CELL,land:land,color:1+Math.floor(floorRand(F)*5),hp:hp,maxHp:hp,hitTick:-99});F.dropped++;return;
    }
  }
  function settlePiece(s,F,p){
    for(var k=0;k<p.cells.length;k++)F.grid[(p.land+p.cells[k][1])*FLOOR_COLS+p.col+p.cells[k][0]]=p.color;
    for(var r=0;r<6;r++){var full=true;for(var c=0;c<FLOOR_COLS;c++)if(!F.grid[r*FLOOR_COLS+c]){full=false;break;}
      if(full){F.grid.copyWithin(r*FLOOR_COLS,(r+1)*FLOOR_COLS);F.grid.fill(0,5*FLOOR_COLS);F.cleared++;s.score+=1000;note(s,'floorClear');r--;}}
  }
  function raiseMound(s,F){var cc=Math.floor(floorRand(F)*FLOOR_COLS),half=2+Math.floor(floorRand(F)*2),peak=pick(s,56,84,96)*(.8+floorRand(F)*.2);
    for(var c=Math.max(0,cc-half);c<=Math.min(FLOOR_COLS-1,cc+half);c++)F.goal[c]=Math.max(F.goal[c],peak*Math.cos((c-cc)/(half+1)*Math.PI/2));F.mounds++;}
  var RISE_WARN=45; // 아래에서 올라오기 전 바닥 가장자리에 빛 예고(심사 1차: 예고 없이 튀어나옴)
  function warnRise(s,F){var x=30+floorRand(F)*(W-60);if(Math.abs(x-s.player.x)<90)x=s.player.x+(s.player.x<W/2?1:-1)*(90+floorRand(F)*60);F.warns.push({x:Math.max(24,Math.min(W-24,x)),age:0});}
  function riseMob(s,F,x){
    var cast=(STAGES[s.stageIndex].cast||[]).filter(function(k){return MOBS[k]&&!MOBS[k].elite;}),kind=cast.length?cast[Math.floor(floorRand(F)*cast.length)]:'drone';
    if(Math.abs(x-s.player.x)<90)x=s.player.x+(s.player.x<W/2?1:-1)*(90+floorRand(F)*60); // 영웅 바로 밑에서는 올라오지 않는다
    var before=s.mobs.length;mob(s,kind,Math.max(24,Math.min(W-24,x)),H+20,{vy:-pick(s,1.1,1.4,1.7),sway:.5,fire:'aim',first:50,every:pick(s,140,90,70),color:CYAN});
    if(s.mobs.length>before){s.mobs[s.mobs.length-1].rise=true;F.risen++;}
  }
  function updateFloor(s){
    var F=s.floor,p=s.player,c,k;if(F.stage!==s.stageIndex)F=s.floor=freshFloor(s,s.stageIndex);
    var live=s.stage==='wave'||s.stage==='card',t=live?F.t++:F.t,plan=floorPlan(s.stageIndex,s.difficulty),u=t%FLOOR_CYCLE,kind=plan[Math.floor(t/FLOOR_CYCLE)%plan.length],on=live&&u>=FLOOR_ON&&u<FLOOR_OFF;
    if(!allowAmbientStart(s))on=false; // 대본이 끝난 웨이브는 마저 끝나게 둔다
    F.kind=on?kind:'';
    if(on){var slow=s.difficulty==='gentle'?1.6:1;
      if(kind==='rise'&&(u-FLOOR_ON)%Math.round(pick(s,150,110,90)*slow)===0)warnRise(s,F);
      if(kind==='blocks'&&(u-FLOOR_ON)%Math.round(pick(s,80,58,46)*slow)===0)dropPiece(s,F);
      if(kind==='terrain'&&(u-FLOOR_ON)%Math.round(pick(s,240,170,150)*slow)===0)raiseMound(s,F);
      if(kind==='lines'&&(u-FLOOR_ON)%Math.round(pick(s,230,180,150)*slow)===0){var nl=s.entranceAll?(s.difficulty==='hell'?3:2+(s.difficulty==='normal'&&F.lines%2)):1+F.lines%2;for(var li=0;li<nl;li++)floorLine(s,H-40-30*li,YELLOW,li*Math.round(LADDER_LAG*s.rules.warn));F.lines++;} // 바닥이 아래부터 한 줄씩 차오른다(11-19)
    }
    // 차례가 끝나면 지형은 가라앉고 블록은 위에서부터 한 줄씩 흩어진다.
    if(live&&u===FLOOR_OFF+40&&!(s.sp&&s.sp.cur)){F.goal.fill(0);if(kind==='blocks')F.clearing=1;}
    if(!live&&s.stage==='break'){F.goal.fill(0);}
    if(F.clearing&&t%10===0){var top=-1;for(var r=5;r>=0&&top<0;r--)for(c=0;c<FLOOR_COLS;c++)if(F.grid[r*FLOOR_COLS+c]){top=r;break;}
      if(top<0)F.clearing=0;else{F.grid.fill(0,top*FLOOR_COLS,(top+1)*FLOOR_COLS);note(s,'floorClear');}}
    if(!F.bursts)F.bursts=[];for(k=F.bursts.length-1;k>=0;k--)if(++F.bursts[k].age>=BURST_TICKS)F.bursts.splice(k,1);
    for(k=F.warns.length-1;k>=0;k--){if(++F.warns[k].age>=RISE_WARN){riseMob(s,F,F.warns[k].x);F.warns.splice(k,1);}}
    for(c=0;c<FLOOR_COLS;c++){var d=F.goal[c]-F.hill[c];F.hill[c]+=d>0?Math.min(d,.9):Math.max(d,-1.2);}
    var struck=false,speed=pick(s,2.4,3.1,3.7);
    for(k=F.pieces.length-1;k>=0;k--){var q=F.pieces[k],rest=H-q.land*FLOOR_CELL;q.y=Math.min(rest,q.y+speed);
      for(var j=0;j<q.cells.length;j++){var x0=(q.col+q.cells[j][0])*FLOOR_CELL+3,y1=q.y-q.cells[j][1]*FLOOR_CELL-3,x1=x0+FLOOR_CELL-6,y0=y1-FLOOR_CELL+6;
        if(p.x>x0-p.r&&p.x<x1+p.r&&p.y>y0-p.r&&p.y<y1+p.r)struck=true;}
      if(q.y>=rest){F.pieces.splice(k,1);settlePiece(s,F,q);}}
    // 바닥 위로 밀어 올린다(영웅 판정점 좌우 6px 안의 가장 높은 바닥).
    var floorY=Math.min(floorTop(s,p.x-6),floorTop(s,p.x+6))-6;if(p.y>floorY)p.y=Math.max(40,floorY);
    return struck;
  }
  /* ── 아래에서 솟는 수묵 소재(사용자 11-15): 난·매화·대나무·연꽃·산·해·달, 움직이는 파도·회오리·불길·구름(사용자 11-15: 호랑이는 빼고 동적인 것 위주), 적 무기(칼·창), 보스 상징이 먹 그림으로 아래에서 올라온다.
   *  예고(RISER_WARN) 뒤 화면 밑에서 올라와 꼭대기 자리에서 잠깐 머물다 먹이 풀리듯 사라진다. 판정은 그림 실루엣을 따른 원 몇 개.
   *  한 번에 둘까지, 화면 위 1/4은 늘 비운다(공간 남기기). 따로 굴리는 난수라 기존 탄 배치는 바뀌지 않는다. ── */
  var MOTIFS={
    orchid:{size:70,hit:[[0,.5,.2],[0,0,.28],[-.45,-.3,.22],[.45,-.3,.22],[0,-.6,.22]]},
    plum:{size:70,hit:[[-.1,.6,.18],[-.15,.1,.22],[-.15,-.5,.26],[.45,-.35,.26],[-.55,.15,.2]]},
    bamboo:{size:74,hit:[[-.2,.75,.12],[-.19,.35,.13],[-.14,-.05,.14],[-.1,-.45,.2],[-.3,-.85,.25],[.2,.7,.1],[.18,.3,.11],[.2,-.2,.2],[.3,-.6,.24]]},
    lotus:{size:62,hit:[[0,-.5,.42],[-.45,-.3,.25],[.45,-.3,.25],[0,.25,.1],[0,.6,.1],[-.5,.55,.3]]},
    wave:{size:66,hit:[[.05,0,.5],[-.5,.3,.3],[.5,.35,.3],[.35,-.45,.25]]},
    whirl:{size:58,hit:[[0,0,.8]]},
    flame:{size:64,hit:[[0,.5,.4],[0,0,.3],[0,-.5,.18],[-.3,.35,.22],[.3,.3,.22]]},
    cloud:{size:60,hit:[[-.5,.15,.36],[.05,-.12,.46],[.55,.12,.34],[0,.4,.4]]},
    mountain:{size:78,hit:[[0,-.6,.22],[0,-.1,.42],[-.6,.4,.34],[.65,.4,.34],[0,.5,.5]]},
    sun:{size:62,hit:[[0,-.1,.56]]},
    moon:{size:60,hit:[[-.3,0,.42],[-.05,-.55,.16],[-.05,.55,.16]]},
    sword:{size:78,hit:[[0,-.75,.09],[0,-.45,.13],[0,-.15,.14],[0,.15,.14],[0,.45,.16],[0,.75,.1]]},
    spear:{size:84,hit:[[0,-.8,.13],[0,-.5,.08],[0,-.2,.07],[0,.1,.07],[0,.4,.07],[0,.7,.07],[0,.95,.07]]},
    coin:{size:56,hit:[[0,0,.8]]},
    lips:{size:60,hit:[[-.5,0,.34],[0,.05,.4],[.5,0,.34]]},
    glyph:{size:60,hit:[[0,0,.84]]},
    // 서양 소재(사용자 11-15 "서양쪽 적테마와서사,보스에 맞는것도 수묵화버전으로"): 스테이지 서사·보스에 맞춰 솟는다
    chalice:{size:64,hit:[[0,-.5,.42],[-.38,-.72,.2],[.38,-.72,.2],[0,.12,.12],[0,.45,.1],[0,.85,.3]]},
    hexagram:{size:66,hit:[[0,0,.44],[.46,0,.14],[-.46,0,.14],[.23,-.4,.14],[-.23,-.4,.14],[.23,.4,.14],[-.23,.4,.14],[0,-.72,.18],[0,.72,.18],[-.62,-.36,.18],[.62,-.36,.18],[-.62,.36,.18],[.62,.36,.18]]}, // 사용자 11-16: 십자가 대신 육망성
    skull:{size:60,hit:[[0,-.25,.62],[0,.5,.36]]},
    scythe:{size:82,hit:[[.2,-.8,.12],[-.12,-.96,.17],[-.5,-.87,.17],[-.8,-.6,.13],[-.93,-.36,.08],[.12,-.5,.09],[.02,-.15,.09],[-.08,.2,.09],[-.18,.55,.09],[-.28,.9,.09]]},
    crown:{size:60,hit:[[0,.3,.4],[-.52,.25,.34],[.52,.25,.34],[0,-.45,.25],[-.85,-.2,.18],[.85,-.2,.18]]},
    chain:{size:80,hit:[[.06,-.82,.2],[-.06,-.42,.2],[.06,-.02,.2],[-.06,.38,.2],[.06,.78,.2]]},
    candle:{size:70,hit:[[0,-.78,.15],[0,-.38,.17],[-.55,-.5,.15],[.55,-.5,.15],[-.5,-.1,.15],[.5,-.1,.15],[0,.08,.2],[0,.48,.12],[0,.85,.3]]},
    key:{size:76,hit:[[0,-.65,.34],[0,-.18,.1],[0,.12,.1],[0,.42,.1],[.12,.74,.24]]},
    hourglass:{size:64,hit:[[0,-.55,.4],[0,0,.16],[0,.55,.4],[-.4,-.85,.15],[.4,-.85,.15],[-.4,.85,.15],[.4,.85,.15]]},
    wing:{size:70,hit:[[-.55,-.1,.25],[.04,-.51,.2],[.5,-.76,.14],[.04,-.04,.24],[.5,.03,.16],[-.22,.27,.22],[.05,.57,.15],[-.58,.3,.2],[.56,-.35,.15],[.31,.35,.16]]},
    horn:{size:68,hit:[[0,.62,.36],[-.75,.38,.25],[-.96,-.08,.17],[-.92,-.5,.13],[-.76,-.87,.09],[.75,.38,.25],[.96,-.08,.17],[.92,-.5,.13],[.76,-.87,.09]]},
    mirror:{size:68,hit:[[0,-.28,.64],[0,.55,.12],[0,.85,.12]]},
    gear:{size:58,hit:[[0,0,.82]]},
    bell:{size:62,hit:[[0,-.2,.5],[-.4,.3,.34],[.4,.3,.34],[0,.75,.14],[0,-.8,.14]]},
    mask:{size:62,hit:[[0,-.3,.55],[0,.3,.42],[0,.68,.2]]},
    rose:{size:70,hit:[[0,-.45,.5],[0,.15,.1],[-.3,.38,.2],[0,.5,.1],[.3,.62,.2],[0,.88,.1]]},
    web:{size:66,hit:[[0,0,.72]]},
    vial:{size:60,hit:[[0,.35,.52],[0,-.35,.18],[0,-.72,.18]]},
    eye:{size:64,hit:[[0,0,.45],[-.55,0,.26],[.55,0,.26]]},
    tower:{size:78,hit:[[0,-.7,.36],[0,-.2,.36],[0,.3,.4],[0,.72,.45]]},
    book:{size:62,hit:[[-.45,0,.42],[.45,0,.42],[0,.1,.3]]},
    cauldron:{size:62,hit:[[0,.25,.6],[-.5,0,.26],[.5,0,.26]]},
    // 이야기 소재(사용자 11-16 "그림으로 스토리푸는느낌으로"): 성·묘비·하이힐·금 간 안경·주사기·악마화 나무
    castle:{size:80,hit:[[-.74,-.3,.24],[0,-.45,.36],[.72,-.62,.2],[.72,-.12,.26],[-.5,.3,.42],[.5,.3,.42],[0,.2,.35],[-.45,.68,.34],[.45,.68,.34]]},
    tomb:{size:72,hit:[[-.14,-.36,.42],[-.06,.1,.44],[0,.55,.45],[-.55,.84,.25],[.55,.84,.25]]},
    heel:{size:76,hit:[[-.68,.66,.25],[-.3,.52,.2],[.05,.3,.18],[.36,.02,.2],[.62,-.3,.22],[.74,-.56,.16],[.77,.25,.09],[.79,.6,.09],[.79,.84,.08]]},
    glasses:{size:74,hit:[[-.48,.1,.42],[.48,.1,.42],[0,-.08,.12],[-.84,-.4,.14],[-.56,-.7,.12],[.84,-.4,.14],[.56,-.7,.12]]},
    syringe:{size:80,hit:[[0,-.86,.06],[0,-.7,.08],[0,-.3,.27],[0,.15,.27],[-.38,.47,.13],[.38,.47,.13],[0,.6,.1],[0,.86,.22]]},
    tree:{size:82,hit:[[0,.78,.26],[-.45,.92,.14],[.45,.92,.14],[0,.4,.18],[0,.08,.16],[0,-.25,.18],[-.38,-.48,.18],[-.76,-.5,.2],[-.84,-.1,.12],[.08,-.72,.2],[.38,-.36,.16],[.72,-.56,.22],[.9,-.2,.12]]}
  };
  var MOTIF_WEST=['chalice','hexagram','skull','scythe','crown','chain','candle','key','hourglass','wing','horn','mirror','gear','bell','mask','rose','web','vial','eye','tower','book','cauldron'];
  /* 스테이지(배경 열쇠)별 서양 소재 셋. 첫째가 그 스테이지 보스·서사에 가장 맞는 것(보스 고유 문양이 있으면 그 문양을 따른다)이고 한 바퀴에 두 번 나온다.
   * 소재는 스테이지 이름·몹 구성·보스 문양에서 고른 것이며 새 설정을 지어내지 않는다(Claude 판단, 기준서 docs/v43/ink-style.md 표). */
  var STAGE_MOTIFS={
    p1_garden:['rose','horn','skull'],p1_cave:['web','candle','skull'],p1_swamp:['horn','skull','chain'],p1_castle:['tower','crown','chain'],p1_grave:['skull','hexagram','scythe'],p1_pillars:['candle','horn','chain'],
    p1_summon:['horn','wing','chain'],p1_ward:['vial','mask','hexagram'],p1_injection:['vial','eye','mask'],p1_memory:['hourglass','horn','crown'],p1_city:['vial','chain','bell'],p1_mask:['wing','mask','hexagram'],
    p2_chapel:['book','key','candle'],p2_sloth:['hourglass','chain','web'],p2_envy:['mirror','eye','chain'],p2_gluttony:['cauldron','chalice','skull'],p2_lust:['rose','mirror','chalice'],p2_greed:['key','chalice','crown'],
    p2_snow:['crown','bell','candle'],p2_wrath:['horn','chain','candle'],p2_pride:['crown','tower','wing'],p2_core:['gear','eye','chain'],
    p3_war:['gear','tower','chain'],p3_rampart:['gear','hexagram','tower'],p3_passage:['gear','eye','key'],p3_nexus:['key','eye','gear'],p3_migration:['gear','vial','hourglass'],p3_gate:['key','mirror','gear'],
    p4_field:['horn','skull','rose'],p4_goblin:['rose','crown','skull'],p4_rampart:['wing','hexagram','crown'],p4_harbor:['bell','candle','eye'],p4_fogvillage:['eye','cauldron','candle'],
    p5_academy:['book','key','candle'],p5_outer:['key','chain','scythe'],p5_forest:['hourglass','scythe','chain'],p5_layers:['book','key','chain'],p5_workshop:['gear','cauldron','chain'],p5_neural:['eye','gear','key'],
    p5_graveyard:['skull','hexagram','hourglass'],p5_ritual:['candle','book','chalice'],p5_corridor:['rose','hourglass','key'],p5_core:['bell','scythe','skull'],
    p6_siege:['horn','hexagram','tower'],p6_hall:['crown','mirror','key'],p6_core:['horn','gear','crown'],
    p7_crosswalk:['bell','mirror','hourglass'],p7_hotel:['key','bell','candle'],p7_villa:['mirror','key','mask'],p7_rooftop:['key','hourglass','chain'],
    p8_circuit:['chain','gear','eye'],p8_collective:['rose','mask','book'],p8_castle:['tower','mirror','hourglass'],p8_approach:['rose','candle','hexagram'],p8_harvest:['rose','scythe','chalice'],p8_core:['mask','chain','crown']
  };
  /* 이야기 소재(사용자 11-16 "먹그림올라오는거 서사에맞게 약간 그림으로 스토리푸는느낌으로 … 은연중에 티나게"): 스테이지 이름·장면에서 읽히는 것 둘.
   * 첫째가 그 스테이지 이야기의 얼굴(시체들이 되살아난 밤 = 묘비, 무너진성 = 성)이고 한 바퀴에 두 번 나온다. 서양 소재 셋과 겹치지 않는다(배정은 Claude 판단, docs/v43/ink-style.md 표). */
  var MOTIF_STORY=['castle','tomb','heel','glasses','syringe','tree'];
  var STAGE_STORY={
    p1_garden:['tree','moon'],p1_cave:['eye','mountain'],p1_swamp:['lotus','whirl'],p1_castle:['castle','moon'],p1_grave:['tomb','moon'],p1_pillars:['tower','flame'],
    p1_summon:['cloud','scythe'],p1_ward:['syringe','skull'],p1_injection:['syringe','hourglass'],p1_memory:['castle','flame'],p1_city:['syringe','tower'],p1_mask:['book','candle'],
    p2_chapel:['hexagram','chain'],p2_sloth:['moon','cloud'],p2_envy:['glasses','mask'],p2_gluttony:['flame','candle'],p2_lust:['heel','mask'],p2_greed:['chain','tower'],
    p2_snow:['cloud','mountain'],p2_wrath:['flame','tower'],p2_pride:['cloud','castle'],p2_core:['vial','hourglass'],
    p3_war:['spear','castle'],p3_rampart:['castle','sword'],p3_passage:['chain','book'],p3_nexus:['crown','book'],p3_migration:['cloud','eye'],p3_gate:['castle','hourglass'],
    p4_field:['mountain','sword'],p4_goblin:['spear','castle'],p4_rampart:['sword','castle'],p4_harbor:['moon','tomb'],p4_fogvillage:['moon','vial'],
    p5_academy:['tower','eye'],p5_outer:['castle','spear'],p5_forest:['tomb','moon'],p5_layers:['tower','castle'],p5_workshop:['flame','sword'],p5_neural:['whirl','chain'],
    p5_graveyard:['tomb','moon'],p5_ritual:['hexagram','skull'],p5_corridor:['castle','scythe'],p5_core:['wave','moon'],
    p6_siege:['castle','book'],p6_hall:['castle','mask'],p6_core:['sun','sword'],
    p7_crosswalk:['glasses','cloud'],p7_hotel:['tower','moon'],p7_villa:['flame','tower'],p7_rooftop:['cloud','tower'],
    p8_circuit:['mask','whirl'],p8_collective:['sword','castle'],p8_castle:['castle','sun'],p8_approach:['sun','book'],p8_harvest:['tomb','moon'],p8_core:['castle','flame']
  };
  function stageStory(index){var g=STAGES[index];return STAGE_STORY[g&&g.theme&&g.theme.bg]||['tomb','moon'];}
  function stageMotifs(index){var g=STAGES[index];return STAGE_MOTIFS[g&&g.theme&&g.theme.bg]||['skull','chain','candle'];}
  var MOTIF_NATURE=['orchid','plum','bamboo','lotus','mountain','sun','moon'],MOTIF_MOVING=['wave','whirl','flame','cloud'],MOTIF_WEAPONS=['sword','spear'],RISER_WARN=60,RISER_HOLD=50,RISER_FADE=50;
  function stageBoss(index){var g=STAGES[index];for(var k=g.first;k<SEGMENTS.length&&SEGMENTS[k].stage===index;k++)if(SEGMENTS[k].actor&&!SEGMENTS[k].mid)return SEGMENTS[k].actor;for(k=g.first;k<SEGMENTS.length&&SEGMENTS[k].stage===index;k++)if(SEGMENTS[k].actor)return SEGMENTS[k].actor;return '';}
  // 스테이지마다: 동양화 소재 둘, 무기 하나, 보스 상징 하나. 상징은 보스 고유 문양(엽전 문양은 엽전 그림, 색욕 보스는 입술).
  function motifEmblem(index){var sig=signatureOf(stageBoss(index));return STAGES[index].scene==='17'?'lips':sig&&sig.glyph==='coin'?'coin':'glyph';}
  function motifPlan(index){var t=stageMotifs(index),st=stageStory(index),free=function(L,i){L=L.filter(function(k){return st.indexOf(k)<0;});return L[((i%L.length)+L.length)%L.length];},
    n=MOTIF_NATURE.length,m=MOTIF_MOVING.length,a=index%n,b=a+1+((index>>1)%(n-1)),mv=index%m,mw=index+1+(index>>2)%(m-1),na1=free(MOTIF_NATURE,a),na2=free(MOTIF_NATURE,b),mv1=free(MOTIF_MOVING,mv),mv2=free(MOTIF_MOVING,mw);
    if(na2===na1)na2=free(MOTIF_NATURE,b+1);if(mv2===mv1)mv2=free(MOTIF_MOVING,mw+1);
    return [t[0],st[0],mv1,t[1],na1,st[1],free(MOTIF_WEAPONS,index),motifEmblem(index),t[2],st[0],mv2,na2,t[0]];} // 이야기 소재(둘째 칸·열째 칸, 여섯째 칸)와 서양 소재 셋이 한 바퀴 열셋 중 일곱. 움직이는 소재 둘, 꽃·풍경 둘, 무기, 보스 상징은 그대로 섞인다
  function riserHits(s,r,x,y){if(r.age<RISER_WARN||r.fade)return false;var hit=MOTIFS[r.kind].hit,pr=s.player.r;for(var k=0;k<hit.length;k++){var dx=x-(r.x+hit[k][0]*r.size),dy=y-(r.y+hit[k][1]*r.size),rr=hit[k][2]*r.size+pr;if(dx*dx+dy*dy<rr*rr)return true;}return false;}
  /* 사용자 11-16 "그림도 테트리스처럼 공격으로 폭파시킬수 있게": 다 솟은 먹 그림은 영웅 탄에 깎이고, 다 깎이면 먹폭발(fade)로 터진다. 판정은 그림 실루엣 원 그대로. */
  var RISER_HP=14,RISER_SCORE=200;
  function riserHp(s){return Math.round(RISER_HP*(s.difficulty==='gentle'?.6:1.35));}
  function shotHitsRiser(s,x,y,dmg){var R=s.risers;if(!R||!R.length)return false;
    for(var k=R.length-1;k>=0;k--){var r=R[k];if(r.age<RISER_WARN||r.fade)continue;var c=MOTIFS[r.kind].hit,on=false;
      for(var j=0;j<c.length&&!on;j++){var dx=x-(r.x+c[j][0]*r.size),dy=y-(r.y+c[j][1]*r.size),rr=c[j][2]*r.size+4;on=dx*dx+dy*dy<rr*rr;}
      if(!on)continue;if(r.hp===undefined){r.hp=riserHp(s);r.maxHp=r.hp;}
      r.hp-=dmg;r.hitTick=s.tick;if(s.tick-(s.riserHitTick===undefined?-99:s.riserHitTick)>=6){s.riserHitTick=s.tick;note(s,'riserHit');}
      if(r.hp<=1e-6){r.fade=1;r.broken=true;s.score+=RISER_SCORE;note(s,'riserBreak');}
      return true;}
    return false;}
  /* 사용자 11-17 "이지는 위에서만 나와서 아래끝까지 가서 터지게, 노멀은 아래위 둘다, 헬은 아래위좌우 전방위": 난이도별로 먹 그림이 들어오는 쪽. */
  var RISER_DIRS={gentle:['down'],normal:['up','down'],hell:['up','down','left','right']};
  function riserDir(s,n){var L=RISER_DIRS[s.difficulty]||RISER_DIRS.normal;return L[((n+s.stageIndex)%L.length+L.length)%L.length];}
  function riserRand(s){var x=s.riserRng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.riserRng=x>>>0;return s.riserRng/4294967296;}
  function pushRiser(s,forceKind,opt){
    var plan=motifPlan(s.stageIndex),R=s.risers,p=s.player,kind=forceKind||plan[s.riserN++%plan.length],size=MOTIFS[kind].size,lane=(s.riserN+s.stageIndex+((s.riserN/3)|0))%3,x=W*(lane===0?.24:lane===1?.76:.5)+(riserRand(s)-.5)*W*.14;
        if(opt&&opt.at!==undefined)x=opt.at; // 특수 페이즈의 협공 자리(영웅 옆으로 비껴 지나간다)
        else if(Math.abs(x-p.x)<90)x=p.x+(Math.abs(p.x-W/2)>24?(p.x<W/2?1:-1):(s.riserN&1?1:-1))*(90+riserRand(s)*50); // 영웅 바로 밑에서는 솟지 않는다
        x=Math.max(size*1.12,Math.min(W-size*1.12,x));
        var dir=opt&&opt.dir||riserDir(s,s.riserN-1),sx=x,sy=H+size+2,ax=x,ay=H*(.42+riserRand(s)*.28);
        if(dir==='down'){sy=-size-2;ay=H-size*.6;} // 쉬움·보통: 위에서 내려와 아래 끝에서 터진다
        else if(dir==='left'||dir==='right'){sy=H*(.2+riserRand(s)*.32);if(opt&&opt.at!==undefined)sy=Math.max(size,Math.min(H-size,opt.atY===undefined?sy:opt.atY));else if(Math.abs(sy-p.y)<90)sy=Math.max(size,p.y-90-riserRand(s)*50);sx=dir==='left'?-size-2:W+size+2;ax=W*(dir==='left'?.3+riserRand(s)*.2:.5+riserRand(s)*.2);ay=sy;} // 헬: 좌우에서도 들어온다
        else{ax=x;}
        R.push({kind:kind,size:size,dir:dir,x:dir==='left'||dir==='right'?sx:x,y:sy,ax:ax,ay:ay,age:0,apex:ay,vy:pick(s,1.2,1.5,1.8),held:0,fade:0,lean:(riserRand(s)-.5)*.3,emblem:kind==='glyph'?(signatureOf(stageBoss(s.stageIndex))||{glyph:'ring'}).glyph:''});s.risen++;note(s,'riserWarn');
  }
  function riserInit(s){
    if(!s.risers){s.risers=[];s.risen=0;s.riserT=0;s.riserStage=-1;}
    if(s.riserStage!==s.stageIndex){s.riserStage=s.stageIndex;s.riserT=0;s.riserN=0;s.riserDue=0;s.riserRng=((s.seed*40503)^(s.stageIndex*2654435761+7))>>>0||1;}
  }
  function updateRisers(s){
    riserInit(s);
    var R=s.risers,p=s.player,k,live=s.stage==='wave'||s.stage==='card',every=Math.round(pick(s,560,330,270));
    if(live&&allowAmbientStart(s)){var t=s.riserT++;
      if(t>=120&&(t-120)%every===0&&s.riserDue<2)s.riserDue++; // 자리가 없으면 미뤘다가 자리가 나면 솟는다
      if(s.riserDue>0&&R.length<(s.floor&&s.floor.kind?1:pick(s,1,2,2))){s.riserDue--;pushRiser(s);}}
    var struck=false;
    for(k=R.length-1;k>=0;k--){var r=R[k];r.age++;
      if(r.fade){if(++r.fade>RISER_FADE)R.splice(k,1);continue;}
      if(!live){r.fade=1;continue;}
      if(r.age>=RISER_WARN){var rd=r.dir||'up';
        if(rd==='spit'){r.x+=r.vx;r.y+=r.vy;if(r.x<-r.size||r.x>W+r.size||r.y<-r.size||r.y>H+r.size)r.fade=1;}
        else if(rd==='down'){if(r.y<r.ay)r.y=Math.min(r.ay,r.y+r.vy*1.3);else{r.fade=1;r.broken=true;}}
        else if(rd==='left'){if(r.x<r.ax)r.x=Math.min(r.ax,r.x+r.vy*1.5);else if(++r.held>RISER_HOLD)r.fade=1;}
        else if(rd==='right'){if(r.x>r.ax)r.x=Math.max(r.ax,r.x-r.vy*1.5);else if(++r.held>RISER_HOLD)r.fade=1;}
        else if(r.y>r.apex)r.y=Math.max(r.apex,r.y-r.vy);else if(++r.held>RISER_HOLD)r.fade=1;}
      if(riserHits(s,r,p.x,p.y))struck=true;}
    return struck;
  }
  /* ── 보스전 특수 페이즈와 중앙 견제(사용자 11-18).
   *  · 특수 페이즈(entranceAll 보스전에서 카드 시작 15초 뒤부터 33초마다): 레이저만 / 그림만(많이 나옴, 쏘아 부수기) / 무자비한 테트리스(피하거나 부수기) / 솟는 바위(공간 줄이기).
   *    이지·노멀·헬 모두 나오되 지속·밀도·동시 개수·틈 폭을 난이도마다 달리한다. 시작 1.5초 전부터 새 탄은 멈추고 화면 탄은 먹이 흐르듯 걷힌다.
   *    "솟는 바위"와 "그림"이 들어오는 방향은 기존 난이도 규칙(RISER_DIRS: 이지 위→아래 터짐, 노멀 위·아래, 헬 사방)을 그대로 따른다.
   *  · 레이백(사용자 11-18 "레이저 그림 테트리스 무자비 연출에서는 rayback적용해서 리듬감있게"): 8박 장단(BEAT=30틱)에 맞추되 소리와 박 표시는 박에, 실제로 나가는 것은 LAYBACK틱 뒤에 둔다. 박에서 살짝 뒤처져 늘어지는 맛이다. 난이도가 높을수록 덜 처진다.
   *  · 중앙 견제: 노멀·헬에서 영웅이 가운데 띠에 오래 머물면 굵은 중앙 레이저 → 한자 고리 → 육망성 순서로 강제로 끼워 넣는다(이지는 없음). ── */
  var SP_START=960,SP_CYCLE=1980,SP_LEAD=90,SP_BEAT=30,SP_LAYBACK={gentle:7,normal:5,hell:4},SP_LEN={gentle:420,normal:540,hell:600},SP_KINDS=['laser','drawing','tetris','stones'],SP_ORDER=['laser','drawing','laser','stones','laser','tetris']; // 사용자 11-18 "레이져 무자비패턴 빈도수 증가": 여섯 번 중 세 번이 레이저
  var SP_INFO={laser:{name:'빛줄기만',sub:'탄은 멈추고 레이저만 읽는다'},drawing:{name:'붓끝 소나기',sub:'그림이 쏟아진다 · 쏘아 부숴라'},tetris:{name:'무자비 낙하',sub:'조각을 피하거나 부숴라'},stones:{name:'솟는 바위',sub:'공간이 좁아진다'}};
  var SP_ACCENT=[1,0,.5,0,1,0,.5,.5];
  function beamRaw(s,x,y,a,o){return beam(s,x,y,a,o);}
  function SQ_ACTIVE(s){return 4*SP_BEAT+Math.round(48*s.rules.warn)-Math.round(66*s.rules.warn);} // 비트루비우스 사각 틀은 X가 켜지는 순간(4박 뒤 + X 예고 48틱) 꺼진다: 사각과 X가 함께 켜져 있던 18틱 겹침 제거(11-18 심사) // 8박 장단: 센박(1)·중간박(.5)·여린박(0)
  var CAMP_HALF=52,CAMP_NEED={normal:210,hell:150},CAMP_COOL={normal:420,hell:300},CAMP_BEAM={normal:34,hell:46};
  function spReset(s){if(s.sp&&s.sp.cur)spEnd(s);var carry=!!(s.sp&&s.sp.drain),seg=SEGMENTS[s.seg],dur=seg&&seg.kind==='card'?cardDuration(s,seg):40;s.sp={drain:carry,start:dur*60>=SP_START+SP_LEAD+Math.round((SP_LEN[s.difficulty]||SP_LEN.normal)*.7)?SP_START:-1,q:[],cur:'',cycle:-1,camp:0,cool:0,round:0,rng:((s.seed*2246822519)^(s.stageIndex*40503+13))>>>0||1};s.special=null;}
  function spRand(s){var x=s.sp.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.sp.rng=x>>>0;return s.sp.rng/4294967296;}
  // 이번 틱의 특수 페이즈 위치. 시작 SP_START-SP_LEAD부터 SP_CYCLE마다 (예고 SP_LEAD틱 + 본 구간 len틱).
  function spWindow(s){
    if(!s.entranceAll||s.stage!=='card'||!s.boss.present||s.boss.leaving||(s.sp&&s.sp.start<0))return null;
    var from=(s.sp?s.sp.start:SP_START)-SP_LEAD,t=s.segTick-from;if(t<0)return null;
    var cycle=Math.floor(t/SP_CYCLE),local=t-cycle*SP_CYCLE,len=SP_LEN[s.difficulty]||SP_LEN.normal;
    if(local>=SP_LEAD+len)return null;
    return {cycle:cycle,local:local,len:len,active:local>=SP_LEAD,kind:SP_ORDER[(s.stageIndex*3+s.seg+cycle)%SP_ORDER.length]};
  }
  function spQuiet(s){return !!spWindow(s)||!!(s.sp&&s.sp.tail>s.tick&&s.stage==='card');}
  function spLvl(s){return s.difficulty==='gentle'?0:s.difficulty==='normal'?1:2;}
  function spRisers(s){var n=0;if(s.risers)for(var i=0;i<s.risers.length;i++)if(!s.risers[i].fade)n++;return n;}
  function spFloor(s){var F=s.floor;if(!F||F.stage!==s.stageIndex)F=s.floor=freshFloor(s,s.stageIndex);return F;}
  function spEnd(s){
    var kind=s.sp.cur;s.sp.cur='';s.sp.q.length=0;s.special=null;
    if(kind==='stones'&&s.floor)s.floor.goal.fill(0);
    if(kind==='tetris')s.sp.drain=true; // 떨어지던 조각이 다 내려앉은 뒤 쌓인 블록을 위에서부터 걷는다
  }
  // 박마다 한 번 불린다(레이백 때문에 박보다 LAYBACK틱 늦게). n은 이 페이즈의 박 번호.
  /* ── 무자비 페이즈의 설계(사용자 11-18 "다빈치·가우스 같은 일류학자들이 설계한 느낌나게 패턴 지능화"). 읽히되 영리한 수학 구조:
   *  · 황금비 빗살(Weyl 수열): 틈 자리 = frac(k/φ). 같은 자리를 되풀이하지 않으면서 화면 전체를 고르게 훑는다(저불일치 수열).
   *  · 가우스 종(정규분포 분위수): 보스에서 영웅을 평균으로 겨눈 광선 부채. 분위수 Φ⁻¹((i+.5)/n) 간격이라 가운데는 촘촘, 끝은 성기다. 평균 바로 옆 두 줄을 비워 '종의 어깨'가 피할 길이 된다.
   *  · 비트루비우스(다빈치의 사각과 원): 영웅을 정사각 틀(광선 네 줄)로 가둔 뒤, 그 중심을 지나는 대각선 X 로 틀 안의 네 모서리 삼각형만 남긴다.
   *  · 나침반 협공: 솟는 바위와 그림이 영웅의 행·열을 사이에 두고 맞은편에서 엇갈려 들어온다(이지 위·아래, 노멀·헬 사방).
   *  · 보스의 시그니처 뱉기: 보스마다 자기 상징 그림을 고유 형식(거미줄 3방향, 금화 고리, 톱니 6방, 칼 3줄 …)으로 뱉는다. 겨눔은 황금각만큼 돌아가 매번 다르다. ── */
  var PHI=(1+Math.sqrt(5))/2,GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));
  function probit(p){return 4.91*(Math.pow(p,.14)-Math.pow(1-p,.14));} // 정규분포 분위수(Tukey 근사)
  var SPIT_MOTIF={mb_02:'web',mb_24:'web',violet:'sword',p1_tree:'tree',p1_horn:'horn',p1_chaser:'spear',p1_comrade:'mask',p1_gate:'tower',balrog:'flame',mask:'mask',p1_staff:'syringe',p1_seraph:'wing',lucifer:'wing',
    p2_demons:'horn',p2_belphegor:'moon',p2_leviathan:'mirror',p2_beelzebub:'cauldron',asmodeus:'lips',p2_greed:'sword',mb_18:'coin',p2_mammon:'coin',p2_wrath:'flame',pride:'crown',p2_chairman:'gear',p2_core:'eye',
    p3_legion:'spear',p3_rampart:'tower',p3_defense:'chain',controller:'chain',p3_body:'gear',p3_gate:'key',goblin:'sword',mb_32:'rose',p4_knight:'wing',insomnia:'eye',
    p5_cult:'hourglass',p5_archon:'key',p5_common:'scythe',p5_upper:'book',p5_grand:'book',p5_furnace:'gear',p5_neuron:'eye',p5_keeper:'tomb',p5_rings:'hexagram',arbelia:'rose',siren:'bell',
    chief:'horn',p6_demons:'horn',p6_bind:'chain',p7_car:'sun',p7_shadow:'moon',p7_alarm:'bell',executor:'chain',p8_chip:'chain',p8_collective:'mask',p8_lauren:'sword',cultist:'candle',p8_ion:'scythe',rian:'hexagram'};
  // 형식: [이름, 갈래 수(이지·노멀·헬), 벌림(라디안, 고리는 0)]
  var SPIT_FORM={web:['fan',[3,3,3],.62],coin:['ring',[4,5,6],0],gear:['ring',[4,6,6],0],eye:['ring',[3,4,5],0],sword:['lance',[2,3,3],0],spear:['lance',[2,3,3],0],scythe:['fan',[2,3,3],.9],
    flame:['fan',[3,5,5],.5],cauldron:['fan',[3,4,5],.55],candle:['fan',[3,4,5],.55],lips:['pincer',[2,2,2],.55],heel:['pincer',[2,2,2],.55],wing:['pincer',[2,2,2],.7],mask:['pincer',[2,2,2],.6],mirror:['pincer',[2,2,2],.5],hexagram:['ring',[3,6,6],0]};
  function spitMotif(s){var k=SPIT_MOTIF[s.boss.actor];if(k&&MOTIFS[k])return k;var plan=motifPlan(s.stageIndex);for(var i=0;i<plan.length;i++)if(plan[i]!=='glyph'&&MOTIF_NATURE.indexOf(plan[i])<0&&MOTIF_MOVING.indexOf(plan[i])<0)return plan[i];return plan[0];}
  function bossSpit(s){
    if(s.calm)return; // 내려와 있는 보스는 뱉지 않는다(사용자 11-19)
    var b=s.boss,p=s.player,lvl=spLvl(s),kind=spitMotif(s),form=SPIT_FORM[kind]||['fan',[2,3,3],.62],n=form[1][lvl],sp=s.sp,R=s.risers,size=Math.round(MOTIFS[kind].size*.74),speed=pick(s,1.5,2,2.4);
    var aim=Math.atan2(p.y-b.y,p.x-b.x),turn=((sp.spitN=(sp.spitN||0)+1)*GOLDEN_ANGLE)%TAU,i,list=[];
    if(form[0]==='ring')for(i=0;i<n;i++)list.push({a:turn+TAU*i/n,dx:0});
    else if(form[0]==='lance')for(i=0;i<n;i++)list.push({a:aim,dx:(i-(n-1)/2)*size*1.15}); // 나란히 세 줄: 사이 틈이 아니라 바깥으로 피한다
    else if(form[0]==='pincer')list.push({a:aim-form[2],dx:0},{a:aim+form[2],dx:0}); // 양옆에서 조여 오는 집게: 정면이 빈다
    else for(i=0;i<n;i++)list.push({a:aim+(n>1?(i/(n-1)-.5)*form[2]*2:0)+(sp.spitN%2?.06:-.06),dx:0}); // 부채(거미줄 3방향): 영웅을 가운데 갈래로 겨눈다
    for(i=0;i<list.length;i++){var q=list[i],x=b.x+Math.cos(q.a+Math.PI/2)*q.dx,y=b.y+20+Math.sin(q.a+Math.PI/2)*q.dx;
      R.push({kind:kind,size:size,dir:'spit',x:x,y:y,ax:x,ay:y,apex:y,vx:Math.cos(q.a)*speed,vy:Math.sin(q.a)*speed,age:0,vy0:speed,held:0,fade:0,lean:0,spit:true,emblem:''});s.risen++;}
    sp.spits=(sp.spits||0)+1;note(s,'riserWarn');note(s,'bossSpit');
  }
  var SP_OPP={up:'down',down:'up',left:'right',right:'left'};
  var COVER_REACH=230; // (예고 84틱 - 반응 15틱 - 여유 14틱) × 키보드 4.2px ≈ 230px
  // 덮기와 같은 방향의 앞 광선(눌린 건반 등)을 끈다: 켜진 것은 바로 꺼지고(사라지는 잔상만), 예고 중인 것은 지운다. 덮기 띠 자신(solid)은 건드리지 않는다
  function coverClear(s,vert,g0,gap){for(var i=s.lasers.length-1;i>=0;i--){var l=s.lasers[i];if(l.solid)continue;
    var lv=Math.abs(Math.abs(l.angle)-Math.PI/2)<.05,lh=Math.abs(l.angle)<.05||Math.abs(Math.abs(l.angle)-Math.PI)<.05;
    var hit=vert?lv:lh; // 틈과 겹친 것뿐 아니라 같은 방향의 앞 광선(눌린 건반 등)은 모두 끈다: 틈까지 가는 길을 앞 건반이 벽처럼 막아 지름길이 없던 경우(재측정 11-20 헬 7·17·25)
    if(!hit)continue;if(l.age<l.warn){l.warn=l.age;l.active=0;}else l.active=Math.min(l.active,l.age-l.warn);}} // 예고 중인 것도 잔상(BEAM_FADE)으로 옅어지며 사라진다(심사: 뚝 끊김)
  function spAct(s,n){
    var k=s.sp.cur,pos=n%8,bar=n>>3,lvl=spLvl(s),b=s.boss,p=s.player,a=ACTORS[b.actor]||{},c1=a.c1===undefined?0:a.c1,c2=a.c2===undefined?c1:a.c2,i,sp=s.sp;
    if(k==='laser'){
      // 페이즈 끝에 남은 광선이 다시 시작된 일반 탄과 겹치지 않게(심사 11-18): 마지막 광선이 꺼질 때까지 일반 사격 재개를 미룬다(spQuiet 꼬리)
      var beam=function(st,x,y,a,o){var r=beamRaw(st,x,y,a,o);sp.tail=Math.max(sp.tail||0,st.tick+Math.round(o.warn*st.rules.warn)+o.active+BEAM_FADE);return r;};
      var motif=(bar+sp.cycle+s.stageIndex)%5;
      if(motif===3){ // 피아노 건반(사용자 11-19 "피아노 건반같은 레이져 패턴도 많이"): 세로 8건반이 음계처럼 차례로 눌린다. 흰건반은 굵고 검은건반은 가늘다. 이지 2박마다 한 건반, 노멀 박마다, 헬 박마다 화음(두 건반)
        var KW=W/8,up=(bar+sp.cycle)%2===0,key=function(j){return up?j:7-j;},hold=SP_BEAT*[2,3,3][lvl]-6; // 건반이 박마다 하나씩 눌리고 2~3박 동안 눌린 채 남는다 → 2~3건반 너비의 벽이 음계를 따라 걸어간다(스위퍼). 지나간 건반 쪽으로 넘어가는 것이 답(11-19 규칙 3·4)
        var j=key(pos),black=[1,3,6].indexOf(j)>=0;beam(s,KW*(j+.5),-12,Math.PI/2,{width:KW*.7/s.rules.beam,warn:46,active:hold,color:black?c2:c1,keep:1});
        if(lvl===2&&pos%2===1){var j2=(j+4)%8;beam(s,KW*(j2+.5),-12,Math.PI/2,{width:KW*.7/s.rules.beam,warn:46,active:30,color:c2,keep:1});}
      }else if(motif===4){ // 화면 덮기(사용자 11-19 "맵의 70 80 90프로덮는패턴 … 난이도 맞게"): 이지 70%·노멀 80%·헬 90%를 광선으로 덮고 한 줄기 틈만 남긴다. 틈 자리는 황금비 수열로 매번 다르다. 마디마다 세로·가로를 번갈아
        if(pos===0){var cover=[.7,.8,.9][lvl],vert=(bar+sp.cycle)%2===0,top=120,span=vert?W:H-top,gap=span*(1-cover),gk=sp.coverN=(sp.coverN||0)+1,
            here=vert?p.x:p.y-top,reach=COVER_REACH*s.rules.warn,glo=Math.max(0,Math.min(span-gap,here-reach-gap/2)),ghi=Math.max(glo,Math.min(span-gap,here+reach-gap/2)), // 회피 측정(11-20): 틈이 영웅에게서 너무 멀면 예고 84틱 안에 키보드 속도(4.2px)로 못 닿았다(헬 가로 덮기 4%). 틈은 영웅이 반응(0.25초) 뒤 닿을 수 있는 거리 안에서 황금비로 고른다
            g0=glo+((gk/PHI+s.stageIndex*.21)%1)*(ghi-glo),segs=[[0,g0],[g0+gap,span]],q2,c0;
          coverClear(s,vert,vert?g0:g0+top,gap);s.coverGap={vert:vert,lo:vert?g0:g0+top,hi:(vert?g0:g0+top)+gap,from:s.tick,on:s.tick+Math.round(84*s.rules.warn),until:s.tick+Math.round(84*s.rules.warn)+44}; // 화면이 틈 가장자리를 비춰 준다(그리기 전용) // 앞 마디 피아노 건반이 틈 위에 눌린 채 남아 틈이 8px로 좁아지던 겹침(헬 측정) 제거
          for(q2=0;q2<2;q2++){var lo=segs[q2][0],hi=segs[q2][1],nb=Math.ceil((hi-lo)/32),w0=(hi-lo)/nb;for(c0=0;c0<nb;c0++){var mid=lo+w0*(c0+.5);
            beam(s,vert?mid:-12,vert?-12:top+mid,vert?Math.PI/2:0,{width:w0/s.rules.beam,warn:84,active:44,color:c0%2?c2:c1,solid:1});}}}
      }else if(motif===0){ // 황금비 빗살
        if(pos%2===0){var open=[3,2,2][lvl],slots=6-open+1,k2=sp.combN=(sp.combN||0)+1,o=Math.floor(((k2/PHI+s.stageIndex*.37)%1)*slots);
          for(i=0;i<6;i++)if(i<o||i>=o+open)beam(s,30+60*i,-12,Math.PI/2,{width:17,warn:60,active:36,color:i%2?c2:c1});}
        // 홀수 박은 쉰다(강약 교대). 예전 마디 끝 가운데 외줄은 빗살과 관계없는 장식이라 뺐다(11-19 "작은레이져 한줄 … 의미가없어")
      }else if(motif===1){ // 가우스 종
        var bx=Math.max(40,Math.min(W-40,b.x)),by=FAN_APEX,mu=Math.atan2(Math.max(p.y,H*.55)-by,p.x-bx),sig=[.30,.26,.23][lvl]; // 사용자 11-19(그림): 보스에서 나가는 부채 → 화면 위 끝 너머에서 퍼져 아래 끝까지 닿는 굵은 광선(빨간 선)
        if(pos===0||pos===4){var m=[5,7,9][lvl],mid=(m-1)/2;
          for(i=0;i<m;i++){if(Math.abs(i-mid)===1)continue;beam(s,bx,by,mu+sig*probit((i+.5)/m),{width:FAN_W,warn:60,active:30,color:i===mid?c1:c2});}}
        else if((pos===2||pos===6)&&lvl>0){beam(s,bx,by,mu-2.2*sig,{width:FAN_W,warn:54,active:28,color:c2});beam(s,bx,by,mu+2.2*sig,{width:FAN_W,warn:54,active:28,color:c2});} // 꼬리(±2.2σ): 크게 비켜 가는 것을 막는다
      }else{ // 비트루비우스: 사각 틀 → 대각선 X
        var S=[100,84,74][lvl];
        if(pos===0){var cx=Math.max(S+12,Math.min(W-S-12,p.x)),cy=Math.max(140+S,Math.min(H-40-S,p.y));sp.sq={x:cx,y:cy};
          var SQ={width:13,warn:66,active:SQ_ACTIVE(s),sq:1};beam(s,cx-S,-12,Math.PI/2,Object.assign({color:c1},SQ));beam(s,cx+S,-12,Math.PI/2,Object.assign({color:c1},SQ));
          beam(s,-12,cy-S,0,Object.assign({color:c2},SQ));beam(s,-12,cy+S,0,Object.assign({color:c2},SQ));}
        else if(pos===4&&sp.sq&&lvl>0){var L=S*1.5,q;for(q=0;q<2;q++){var ang=q?-Math.PI/4:Math.PI/4;beam(s,sp.sq.x-Math.cos(ang)*L,sp.sq.y-Math.sin(ang)*L,ang,{width:11,warn:48,active:40,color:c1});}}
      }
    }else if(k==='drawing'){
      if(pos===0||pos===4){if(spRisers(s)<[3,5,7][lvl]+3)bossSpit(s);}
      else if((lvl===1?pos%2===0:lvl===2?pos!==7:false)&&spRisers(s)<[3,5,7][lvl])pushRiser(s);
      else if(lvl===0&&pos===2&&spRisers(s)<3)pushRiser(s);
    }else if(k==='tetris'){
      var drop=lvl===0?pos%4===0:lvl===1?pos%2===0:true;
      if(drop)dropPiece(s,spFloor(s),[3,5,7][lvl]);
    }else if(k==='stones'){
      var F=spFloor(s),dirs=lvl===0?['up','down']:['up','right','down','left'],d=dirs[(bar+sp.cycle)%dirs.length],off=bar%2?62:-62; // 마디마다 나침반이 한 칸 돈다
      var place=function(dir,o){return dir==='left'||dir==='right'?{dir:dir,at:0,atY:p.y+o}:{dir:dir,at:p.x+o};}; // 영웅의 행·열을 사이에 두고 비껴 지나간다
      if(pos===0)raiseMound(s,F);
      else if((pos===2||(lvl===2&&pos===5))&&spRisers(s)<[3,5,7][lvl])pushRiser(s,'mountain',place(d,off));
      else if(pos===6&&spRisers(s)<[3,5,7][lvl])pushRiser(s,null,place(SP_OPP[d],-off)); // 맞은편에서 엇갈려 들어오는 그림
      else if(pos===4){if(lvl>0)bossSpit(s);else if(spRisers(s)<3)pushRiser(s,null,place('down',-off));}
    }
  }
  function centerGuard(s,w){
    var sp=s.sp,lvl=spLvl(s);if(!lvl||w||s.stage!=='card'||!s.entranceAll||!s.boss.present||s.boss.leaving||s.segTick<FIRE_DELAY+60){sp.camp=0;return;}
    if(sp.cool>0)sp.cool--;
    if(Math.abs(s.player.x-W/2)<CAMP_HALF)sp.camp++;else sp.camp=Math.max(0,sp.camp-2);
    if(sp.camp<CAMP_NEED[s.difficulty]||sp.cool>0||s.figures.length)return;
    for(var nb=0;nb<s.n;nb++)if(s.bage[nb]===0)return; // 이번 틱에 새 탄이 났으면 다음 틱에: 문양 예고와 새 탄이 한 틱에 겹치지 않게(문양 예고는 읽혀야 한다)
    var sig=signatureOf(s.boss.actor),a=ACTORS[s.boss.actor]||{},step=sp.round++%3;
    sp.camp=0;sp.cool=CAMP_COOL[s.difficulty];sp.guards=(sp.guards||0)+1;
    if(step===0||!sig){beam(s,W/2,-12,Math.PI/2,{width:CAMP_BEAM[s.difficulty],warn:66,active:46,color:a.c1||0,keep:1});if(lvl===2)beam(s,W/2-92,-12,Math.PI/2,{width:20,warn:66,active:46,color:a.c2||0});}
    else if(step===1)summonRunes(s,sig,lvl===2?1:0);
    else summonSigil(s,sig,sig.index);
    note(s,'centerGuard');
  }
  function bossSpecials(s){
    if(!s.sp)spReset(s);
    if(s.cardEnding||s.cardDown){if(s.sp.cur)spEnd(s);s.sp.q.length=0;return;} // 소진 뒤에는 특수 페이즈·중앙 견제를 새로 열지 않는다(이미 켠 광선은 제 수명대로)
    var sp=s.sp,w=spWindow(s),i;
    if(sp.drain&&s.floor&&!s.floor.pieces.length){s.floor.clearing=1;sp.drain=false;}
    if(!w){if(sp.cur)spEnd(s);sp.q.length=0;centerGuard(s,null);return;}
    if(w.local===0&&!sp.cur){if(s.entranceAll)hurryBullets(s);else cancelAll(s,true);} // 전환 예고: 실제 게임은 지난 패턴의 탄을 지우지 않고 판정을 지닌 채 제 길로 빨라져 나가게 한다(사용자 11-19 "탄이 갑자기 사라져서 맥이 빠지거나")
    if(w.local===SP_LEAD&&!sp.cur&&s.entranceAll&&s.n)driftBullets(s); // 예고 1.5초 안에 못 나간 몇 알만 먹이 흐르듯 걷는다(특수 페이즈는 탄 없이 광선·그림만) // 전환 예고: 지난 패턴의 탄은 먹이 흐르듯 걷힌다
    if(w.local===SP_LEAD&&!sp.cur){sp.cur=w.kind;sp.cycle=w.cycle;s.special={kind:w.kind,start:s.tick,cycle:w.cycle,lay:SP_LAYBACK[s.difficulty]};note(s,'special');}
    if(!w.active||!sp.cur){centerGuard(s,w);return;}
    riserInit(s);var lt=w.local-SP_LEAD;
    if(lt%SP_BEAT===0){var n=lt/SP_BEAT;s.beat={tick:s.tick,n:n,accent:SP_ACCENT[n%8]};note(s,SP_ACCENT[n%8]>=1?'grooveAccent':'grooveBeat');sp.q.push({at:s.tick+SP_LAYBACK[s.difficulty],n:n});}
    for(i=0;i<sp.q.length;i++)if(sp.q[i].at<=s.tick){var e=sp.q.splice(i,1)[0];i--;spAct(s,e.n);}
  }
  /* 한 틱(1/60초) 진행. input: {dx,dy,focus,bomb} — dx,dy는 이번 틱에 움직일 픽셀, focus는 저속 이동, bomb은 이번 틱에 폭탄 사용. */
  /* 서하 시간제어(초능력 중)는 적탄만 느리게 하는 게 아니라 적의 시간 자체를 늦춘다: 발사 틱도 같은 비율로만 돌아온다.
   * 탄만 느려지고 발사는 그대로면 화면의 탄 밀도가 1/속도배(7단계 4.3배)로 쌓여 피할 길이 없었다(사용자 11-20 "둘다 이론상 피할수는 있어야함" 실검증: 노멀 504·648, 헬 504·540 구간 막힘).
   * 한 틱의 탄은 통째로 나가거나 통째로 쉰다(고리·부채 모양 유지). 그림 탄(SHAPE_PROP)·조각은 그대로.
   * 광선·문양의 예고·켜짐·회전도 같은 시계로 흐른다(실검증: 7단계 서하는 0.46px/틱이라 보스 회전 광선을 못 벗어났다, 교주의 사몽). */
  function enemyClock(s){var k=abilityOf(s).bulletSpeed;if(k>=1){s.efire=true;s.eclock=0;return;}s.eclock=(s.eclock||0)+k;s.efire=s.eclock>=1;if(s.efire)s.eclock-=1;}
  function step(s,input){
    if(s.stage==='won'||s.stage==='lost'){s.stageTick++;return s;}
    s.tick++;s.stageTick++;movePlayer(s,input);enemyClock(s);var charge0=s.fills*GAUGE_FULL+s.gauge;
    if(s.stage==='bossClear'){
      if(s.tick>=s.bossClear.readyTick)advance(s);
      return s; // 격파 연출 2초 동안 공격·피격·아이템·필살을 모두 멈춘다. 다음 구간은 다음 틱부터 움직인다.
    }
    moveBoss(s);
    if(s.entranceAll&&s.stage==='intro'&&s.n>0&&!(s.bossEntrance&&s.bossEntrance.segment===s.seg)){flushBullets(s);updateBullets(s);s.stageTick=0;return s;} // 보스·몹 없이 탄만 남으면 탄을 가속해 다 내보낸 뒤에 다음 보스가 들어선다(사용자 11-19)
    if(s.entranceAll&&s.stage==='intro')prepareBossEntrance(s);
    var entrance=s.bossEntrance;
    if(entrance&&entrance.segment===s.seg&&s.stage==='intro'){
      if(!s.boss.present){if(s.entranceAll&&s.stageTick<ENTRANCE_CUTIN)return s;enter(s,segment(s).actor);} // 수묵 컷인이 끝난 뒤에야 보스가 판에 들어선다
      if(entrance.readyTick===null||s.tick<entrance.readyTick)return s;
      // 준비를 마친 첫 카드만 이름 표시용 FIRE_DELAY를 생략한다. 이후 카드의 40틱 예고는 그대로다.
      clearBossEntranceHazards(s);beginCard(s);entrance.releasedTick=s.tick;
    }
    if(input&&input.bomb)useBomb(s);
    bombPulse(s);
    var seg=segment(s),b=s.boss;s.calm=s.entranceAll&&s.stage==='card'&&(bossDescends(s)||b.present&&b.y>BOSS_REST+BOSS_SWAY+CALM_BELOW);calmLaser(s);heroLaser(s);figurePending(s);
    if(s.stage==='break'){if(s.stageTick>=(s.paced?24:BREAK_TICKS)){if(seg&&seg.kind==='card'&&b.present)beginCard(s);else advance(s);}}
    else if(s.stage==='intro'){
      if(!b.present)enter(s,seg.actor);
      else if(!b.leaving&&b.actor===seg.actor&&s.stageTick>=(s.paced?55:INTRO_TICKS))beginCard(s);
    }
    else if(s.stage==='wave'&&s.entranceAll&&s.segTick===0&&!s.mobs.length&&s.n>0){flushBullets(s);} // 앞 구간 탄이 다 나간 뒤에 첫 몹이 나온다(사용자 11-19)
    else if(s.stage==='wave'){
      var w=s.segTick++,duration=waveDuration(s,seg);if(w<duration)seg.script(s,w);
      if(w>=duration){
        if(!s.mobs.length&&s.entranceAll){if(!s.waveFlush&&s.n&&(s.waveLinger=(s.waveLinger||0)+1)<WAVE_LINGER){}else if(!s.waveFlush){s.waveFlush=true;s.waveFlushN=flushBullets(s);clearNonBullets(s);}if(!s.n){s.waveFlush=false;s.waveLinger=0;s.score+=(s.waveFlushN||0)*10;s.waveFlushN=0;note(s,'waveClear');advance(s);}else s.segTick--;} // 몹이 다 사라지면 남은 탄을 가속해 내보내고, 다 나간 뒤에 다음으로
        else if(!s.mobs.length){s.score+=breakWipe(s)*10;note(s,'waveClear');advance(s);}
        else if(w-duration>=(s.entranceAll?MOB_STAY:s.paced?30:WAVE_GRACE)){
          for(var q=0;q<s.mobs.length;q++)s.mobs[q].retreat=true;
        }
      }
    }
    else if(s.stage==='card'&&s.cardEnding){cardEndingStep(s);}
    else if(s.stage==='card'){
      var t=s.segTick++;
      var fireDelay=cardFireDelay(s);
      if(t>=fireDelay&&!spQuiet(s)&&downFiring(s)){if(!s.cardDown)mirrorVolley(s,t-fireDelay);if(!soloHold(s))
        if(BOSS_RHYTHM&&BOSS_RHYTHM.handles(s,seg,api))BOSS_RHYTHM.fire(s,t-fireDelay,rhythmContext);
        else{
          var variationCard=s.entranceAll?variationCardIndex(s,seg):s.seg;
          var kind=s.entranceAll&&phaseKind(SEGMENTS[variationCard],variationCard);
          if(kind)fireCardPhrase(s,seg,t-fireDelay,kind,variationCard);
          else{seg.fire(s,t-fireDelay);if(seg.spell)signature(s,t-fireDelay);}
        }
      } // 고유 첫 공격은 원래 발사를 대체한다. 이름 붙은 문양과 중간 카드의 대본은 유지한다.
      var left=timeLeft(s);
      if(seg.spell&&!s.entranceAll&&left<=10&&left>0&&s.segTick%60===0)note(s,left<=3?'countdownLast':'countdown');
    }
    themed(s);updateMobs(s);updateShots(s);focusSkill(s);
    if(s.stage==='card'&&s.entranceAll&&!s.cardEnding&&(b.hp<=0||s.cardDown)){if(!s.cardDown)markDown(s);if(cardMayFall(s)){b.hp=0;beginCardEnding(s,true);}else b.hp=1;} // 시간이 다 된 카드는 쓰러짐이 아니라 그대로 넘어간다(남은 탄은 breakWipe가 밖으로 내보낸다)
    else if(s.stage==='card'&&s.entranceAll&&s.cardEnding){if(s.boss.hp<0)s.boss.hp=0;if(cardEndingDone(s))endCard(s,s.cardEnding.defeated);}
    else if(s.stage==='card'&&b.hp<=0)endCard(s,true);
    else if(s.stage==='card'&&!s.entranceAll&&timeLeft(s)===0)endCard(s,false); // 실제 게임에서 보스·중간보스는 시간으로 사라지지 않는다(사용자 11-19): 체력이 다해야 쓰러진다
    if(s.stage==='bossClear')return s;
    var p=s.player;bossSpecials(s);yieldMirror(s);gentleNudge(s);composeLasers(s);var byFloor=updateFloor(s)|updateRisers(s),byBeam=updateLasers(s),byFigure=updateFigures(s),byBullet=updateBullets(s);
    updateItems(s);
    if(s.hero==='memory'&&p.focus){var gained=s.fills*GAUGE_FULL+s.gauge-charge0;if(gained>0){s.gauge+=gained*(FOCUS_GAUGE-1);fillGauge(s);}} // 기억사수 저속: 이번 틱에 찬 필살 게이지를 1.5배로
    var touched=(byBeam||byFigure||byBullet||byFloor)&&s.tick>=p.invulnerableUntil&&s.stage!=='won'&&s.stage!=='lost';
    if(touched&&distortRoll(s)){
      // 시공간 왜곡(사용자 11-16, 기억사수 패시브): 닿기 직전 시간이 비틀려 탄이 빗겨 간다. 공격 단계 1에서 7%, 7에서 37%. 잠깐(DISTORT_TICKS) 닿지 않는다
      s.distorts++;p.invulnerableUntil=s.tick+DISTORT_TICKS;note(s,'distort');
    }else if(touched&&s.difficulty!=='hell'&&s.bombs>0){
      // 자동 필살(사용자 11-16): 피격점에 닿는 순간 필살기가 남아 있으면 목숨 대신 저절로 터진다. 목숨·공격 단계·필살 단계는 그대로. 맞은 것으로 세어(무피격 별) 필살기 하나를 쓴다
      s.autoBombs++;s.hits++;useBomb(s);if(s.lastBomb)s.lastBomb.auto=true;note(s,'autoBomb');
    }else if(touched){
      p.hp--;s.hits++;s.spellClean=false;p.invulnerableUntil=s.tick+INVULN_TICKS;if(!s.entranceAll)cancelAll(s);note(s,'hurt');if(s.power>(s.growth?chapterFloor(s):1)){s.power--;s.exp=POWER_EXP[s.power-1];note(s,'powerDown');} // 맞으면 공격 단계가 하나 내려간다(필살기 단계는 그대로)
      // 목숨이 남았으면 폭탄이 기본 개수까지 다시 찬다.
      if(p.hp<=0){s.stage='lost';s.stageTick=0;note(s,'lose');}else if(s.bombs<s.rules.bombs)s.bombs=s.rules.bombs;
    }
    if(s.n>s.peak)s.peak=s.n;
    return s;
  }
  function cardFireDelay(s){
    var entrance=s.bossEntrance;
    return entrance&&entrance.segment===s.seg&&entrance.releasedTick!==null?0:FIRE_DELAY;
  }
  function timeLeft(s){
    if(s.stage!=='card')return 0;
    var g=segment(s),elapsed=s.segTick;
    // A later phase can spend 40 ticks announcing itself before its attack begins.
    if(s.entranceAll&&g.mid)elapsed=Math.max(0,elapsed-cardFireDelay(s));
    return Math.max(0,cardDuration(s,g)-elapsed*TICK);
  }
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
  var api={revision:43,POWER_SHOTS:POWER_SHOTS,MOB_CUE_LEAD:MOB_CUE_LEAD,spellBonus:spellBonus,spellBonusBase:spellBonusBase,jackpotCount:jackpotCount,JACKPOT_MID:JACKPOT_MID,JACKPOT_BOSS:JACKPOT_BOSS,JACKPOT_SCORE_MAX:JACKPOT_SCORE_MAX,pointValue:pointValue,heartWorth:heartWorth,clearBonus:clearBonus,LIFE_PIECES:LIFE_PIECES,SPELL_DECAY_FROM:SPELL_DECAY_FROM,SPELL_DECAY_OVER:SPELL_DECAY_OVER,POINT_BASE:POINT_BASE,POINT_MAX:POINT_MAX,CALM_SOFT:CALM_SOFT,composeLasers:composeLasers,beamFor:beam,LADDER_N:LADDER_N,SWEEP_N:SWEEP_N,CARD_ENDING_MAX:CARD_ENDING_MAX,CARD_MIN:CARD_MIN,DESCEND_HOLD:DESCEND_HOLD,LIVE_FAST:LIVE_FAST,BEAM_MIN:BEAM_MIN,FAN_APEX:FAN_APEX,CALM_BELOW:CALM_BELOW,CALM_LASER_EVERY:CALM_LASER_EVERY,LIVE_TABLE:LIVE_TABLE,COMPACT_DENSITY:COMPACT_DENSITY,CARD_BREAK_PAUSE:CARD_BREAK_PAUSE,bossStays:bossStays,MOB_BELOW_SPEED:MOB_BELOW_SPEED,BOSS_REST:BOSS_REST,BOSS_SWAY:BOSS_SWAY,WALL_KICK_Y:WALL_KICK_Y,CARD_DOWN_MAX:CARD_DOWN_MAX,EXIT_TURN:EXIT_TURN,WAVE_LINGER:WAVE_LINGER,LAYER_CAP:LAYER_CAP,layersBut:layersBut,phraseLen:phraseLen,flushBullets:flushBullets,heroProfile:heroProfile,bombName:bombName,isCinematicBoss:isCinematicBoss,nextSegmentIndex:nextSegmentIndex,Progress:Progress,SCENES:SCENES,WIDTH:W,HEIGHT:H,CAP:CAP,COMPACT_CAP:COMPACT_CAP,LASER_CAP:LASER_CAP,MOB_CAP:MOB_CAP,ITEM_CAP:ITEM_CAP,GOLDEN_ANGLE:GOLDEN_ANGLE,GAUGE_FULL:GAUGE_FULL,AUTO_COLLECT_Y:AUTO_COLLECT_Y,
    PACING:PACING,stageTargetSeconds:stageTargetSeconds,plannedSegments:plannedSegments,pacingReport:pacingReport,waveDuration:waveDuration,cardDuration:cardDuration,cardHp:cardHp,SEGMENTS:SEGMENTS,EMITTER_KINDS:EMITTER_KINDS,emit:emit,refireEvery:refireEvery,MOB_DROP_EVERY:MOB_DROP_EVERY,ELITE_DROPS:ELITE_DROPS,CARD_DROPS:CARD_DROPS,MODE_REAIM:MODE_REAIM,MODE_TURN:MODE_TURN,MODE_SPLIT:MODE_SPLIT,MODE_BRANCH:MODE_BRANCH,STAGES:STAGES,ACTORS:ACTORS,MOBS:MOBS,PROPS:PROPS,PALETTE:PALETTE,CARD_TOTAL:CARD_TOTAL,DIFFICULTY:DIFFICULTY,PROP_LONG:PROP_LONG,propHitPoints:propHitPoints,propRenderSpan:propRenderSpan,bulletRenderSpan:bulletRenderSpan,BULLET_BREAK_MIN_SPAN:BULLET_BREAK_MIN_SPAN,isBulletBreakable:isBulletBreakable,ORB_HP:ORB_HP,ORB_BREAK_EVERY:ORB_BREAK_EVERY,ORB_FRAGMENT_COUNT:ORB_FRAGMENT_COUNT,ORB_FRAGMENT_GRACE:ORB_FRAGMENT_GRACE,ORB_FRAGMENT_SPEED:ORB_FRAGMENT_SPEED,CURVE_START:CURVE_START,CURVE_END:CURVE_END,applyCurve:applyCurve,SIZE_RADIUS:SIZE_RADIUS,SHAPE_PROP:SHAPE_PROP,
    BOSS_ENTRANCE_GRACE:BOSS_ENTRANCE_GRACE,BOSS_ENTRANCE_SPEECH:BOSS_ENTRANCE_SPEECH,BOSS_ENTRANCE_MID:BOSS_ENTRANCE_MID,BOSS_CLEAR_TICKS:BOSS_CLEAR_TICKS,prepareBossEntrance:prepareBossEntrance,phaseOf:phaseOf,phaseKind:phaseKind,entrancePhase:entrancePhase,skipEntrance:skipEntrance,ENTRANCE_CUTIN:ENTRANCE_CUTIN,BLOOM_TICKS:BLOOM_TICKS,HAND_WARN:HAND_WARN,SIGNATURES:SIGNATURES,GLYPHS:GLYPHS,BOSS_FORMS:BOSS_FORMS,FORM_BASE:FORM_BASE,bossArtOf:bossArtOf,BOSS_SHOTS:BOSS_SHOTS,SHOT_KINDS:SHOT_KINDS,bossShotOf:bossShotOf,figureSegments:figureSegments,figurePhase:figurePhase,FIGURE_ON_TICKS:FIGURE_ON_TICKS,FIGURE_OFF_TICKS:FIGURE_OFF_TICKS,FIGURE_CHARGE_TICKS:FIGURE_CHARGE_TICKS,RUNE_AT:RUNE_AT,RISER_HP:RISER_HP,RISER_SCORE:RISER_SCORE,riserHp:riserHp,shotHitsRiser:shotHitsRiser,PIECE_HP:PIECE_HP,PIECE_SCORE:PIECE_SCORE,BURST_TICKS:BURST_TICKS,pieceHp:pieceHp,RUNE_TIMES:RUNE_TIMES,RUNE_RADII:RUNE_RADII,SIGIL_EVERY:SIGIL_EVERY,SIGIL_AT:SIGIL_AT,RUNE_WARN:RUNE_WARN,RUNE_ACTIVE:RUNE_ACTIVE,RUNE_OUTER:RUNE_OUTER,RUNE_GROW:RUNE_GROW,RUNE_INNER:RUNE_INNER,WIPE_COOLDOWN:WIPE_COOLDOWN,BEAM_FADE:BEAM_FADE,BEAM_HIT:BEAM_HIT,Shapes:Shapes,createRun:createRun,step:step,floorPlan:floorPlan,BOSS_DESCEND:BOSS_DESCEND,SP_START:SP_START,spStart:function(s){return s.sp?s.sp.start:SP_START;},SP_CYCLE:SP_CYCLE,SP_LEAD:SP_LEAD,SP_BEAT:SP_BEAT,SP_LAYBACK:SP_LAYBACK,SP_LEN:SP_LEN,SP_KINDS:SP_KINDS,SP_ORDER:SP_ORDER,spitMotif:spitMotif,SPIT_FORM:SPIT_FORM,SP_INFO:SP_INFO,CAMP_HALF:CAMP_HALF,CAMP_NEED:CAMP_NEED,spWindow:spWindow,MOTIFS:MOTIFS,MOTIF_MOVING:MOTIF_MOVING,MOTIF_WEST:MOTIF_WEST,MOTIF_STORY:MOTIF_STORY,STAGE_STORY:STAGE_STORY,stageStory:stageStory,stageMotifs:stageMotifs,motifPlan:motifPlan,riserHits:riserHits,RISER_WARN:RISER_WARN,RISER_FADE:RISER_FADE,floorTop:floorTop,FLOOR_KINDS:FLOOR_KINDS,FLOOR_COLS:FLOOR_COLS,FLOOR_CELL:FLOOR_CELL,FLOOR_CYCLE:FLOOR_CYCLE,FLOOR_ON:FLOOR_ON,FLOOR_LINE_Y:FLOOR_LINE_Y,timeLeft:timeLeft,bulletRadius:bulletRadius,dropItem:dropItem,
    POWER_EXP:POWER_EXP,BOMB_FILLS:BOMB_FILLS,chapterFloor:chapterFloor,POWER_SHOTS:POWER_SHOTS,POWER_DPS:POWER_DPS,SHOT_DAMAGE:SHOT_DAMAGE,SLOW_FIELD:SLOW_FIELD,DESCEND_AGE:DESCEND_AGE,DESCEND_Y:DESCEND_Y,FOCUS_SKILL_CHANCE:FOCUS_SKILL_CHANCE,FOCUS_SKILL_GAP:FOCUS_SKILL_GAP,SWORD_DELAY:SWORD_DELAY,SWORD_POWER:SWORD_POWER,REVERSAL_POWER:REVERSAL_POWER,FOCUS_SLOW:FOCUS_SLOW,FOCUS_SLOW_MAX:FOCUS_SLOW_MAX,COVER_REACH:COVER_REACH,BOMB_POWER:BOMB_POWER,BOMB_NAMES:BOMB_NAMES,BOMB_PULSES:BOMB_PULSES,BOMB_PULSE_START:BOMB_PULSE_START,BOMB_PULSE_EVERY:BOMB_PULSE_EVERY,DISTORT_CHANCE:DISTORT_CHANCE,DISTORT_TICKS:DISTORT_TICKS,distortChance:distortChance,HASTE_TICKS:HASTE_TICKS,MAX_LEVEL:MAX_LEVEL,clockState:clockState,slowField:slowField,gainExp:gainExp,ABILITY_MAX:ABILITY_MAX,ABILITY_POWER:ABILITY_POWER,ABILITY_HASTE:ABILITY_HASTE,ABILITY_SLOW:ABILITY_SLOW,FOCUS_POWER:FOCUS_POWER,FOCUS_GAUGE:FOCUS_GAUGE,SEOHA_FOCUS_SHOT:SEOHA_FOCUS_SHOT,SEOHA_FOCUS_TB:SEOHA_FOCUS_TB,SEOHA_FOCUS_TB_EVERY:SEOHA_FOCUS_TB_EVERY,HERO_TUNE:HERO_TUNE,heroLaserBias:heroLaserBias,shotStrike:shotStrike,updateTimeBombs:updateTimeBombs,CHARGE_EVERY:CHARGE_EVERY,CHARGE_ARC:CHARGE_ARC,CHARGE_REACH:CHARGE_REACH,TIMEBOMB_EVERY:TIMEBOMB_EVERY,TIMEBOMB_FUSE:TIMEBOMB_FUSE,TIMEBOMB_MULT:TIMEBOMB_MULT,TIMEBOMB_SPLASH:TIMEBOMB_SPLASH,TIMEBOMB_R:TIMEBOMB_R,abilityOf:abilityOf,setAbility:setAbility,shotDamage:shotDamage,FIG_HURRY:FIG_HURRY,FIG_WAIT_MAX:FIG_WAIT_MAX};
   rhythmContext={WIDTH:W,HEIGHT:H,ACTORS:ACTORS,SIGNATURES:SIGNATURES,PROPS:PROPS,SEGMENTS:SEGMENTS,SHAPE_PROP:SHAPE_PROP,spawn:spawn,beam:beam,isCinematicBoss:isCinematicBoss};
   if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcade=api;
})(typeof window!=='undefined'?window:globalThis);
