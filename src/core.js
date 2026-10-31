/* HAPIL: memory corridor. Pure deterministic 60 Hz combat; no DOM, timers or input automation. */
(function (root, factory) {
  'use strict';
  var dependency = typeof module === 'object' && module.exports ? require('./weapon-patterns.js') : root && root.HapilWeaponPatterns;
  var patterns = typeof module === 'object' && module.exports ? require('./boss-patterns-v27.js') : root && root.HapilBossPatternsV27;
  var api = factory(dependency,patterns);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Weapon,Patterns) {
  'use strict';
  if (!Weapon) throw new Error('보스 무기 패턴 모듈을 찾을 수 없습니다.');
  var W = 360, H = 640, FIXED_DT = 1 / 60, TAU = Math.PI * 2;
  var RULESET = 'hapil-firstbattle-1';
  var HELL_MECHANICS_REVISION=15;
  // Explicit opt-in: old boundary saves have no combatRevision and retain
  // their original deterministic encounter. Revision25 is a separate opt-in.
  var COMBAT_REVISION=21, IDENTITY_COMBAT_REVISION=25, PATTERN_COMBAT_REVISION=27;
  function patternEnabled(w){return w.combatRevision===PATTERN_COMBAT_REVISION;}
  function supportedCombatRevision(value){return value===COMBAT_REVISION||value===IDENTITY_COMBAT_REVISION||value===PATTERN_COMBAT_REVISION;}
  function pressureEnabled(w){return supportedCombatRevision(w.combatRevision);}
  function identityEnabled(w){return (w.combatRevision===IDENTITY_COMBAT_REVISION||patternEnabled(w))&&w.campaign&&(patternEnabled(w)||w.finalPractice||w.bossIndex!==8);}
  var BULLET_SLOW=Object.freeze({factor:.14,rampTicks:6,recoverTicks:36,durations:Object.freeze({memory:24,counter:54,delay:108,ego:90})});
  // Existing ready timers preserve the cast clocks at every safe checkpoint.
  // Slow motion therefore needs no hidden transient state or new save fields.
  function bulletTimeScale(w){
    if(!patternEnabled(w)||!w.skills||!w.stats||!w.stats.casts)return 1;
    var cooldowns={memory:144,counter:180,delay:480,ego:1800},factor=1;
    Object.keys(cooldowns).forEach(function(name){
      if(!w.stats.casts[name])return;
      var age=w.tick-(w.skills[name+'ReadyAt']-cooldowns[name]),duration=BULLET_SLOW.durations[name],value=1;
      if(age<0||age>=duration+BULLET_SLOW.recoverTicks)return;
      if(age<BULLET_SLOW.rampTicks){var down=clamp(age/BULLET_SLOW.rampTicks,0,1);down=down*down*(3-2*down);value=1-(1-BULLET_SLOW.factor)*down;}
      else if(age<=duration)value=BULLET_SLOW.factor;
      else{var up=clamp((age-duration)/BULLET_SLOW.recoverTicks,0,1);up=up*up*(3-2*up);value=BULLET_SLOW.factor+(1-BULLET_SLOW.factor)*up;}
      factor=Math.min(factor,value);
    });
    return factor;
  }
  var PRESSURE_LIMITS=Object.freeze({cycleTicks:600,warningTicks:90,bossActiveTicks:360,waveActiveTicks:180,bossHellCoverage:.66,bossNormalCoverage:.44,bossGentleCoverage:.22,waveMultiplier:.70,maxCopies:2,cloneTicks:360,illusionTicks:120});
  var HELL_OVERLAP_LIMITS=Object.freeze({cycleTicks:336,warningTicks:108,activeTicks:96,fanBaseSpeed:150,fanMinSpeed:198,fanMaxSpeed:234,rotorMaxDownSpeed:378,rotorMaxTotalSpeed:388,corridorHalfWidth:24});
  var CAPS = Object.freeze({ bullets: 768, shots: 96, enemies: 12, effects: 96, hazards: 40 });
  var PHASE_HP = [1700, 1850, 2000];
  var NAMES = ['여덟 실의 문', '보라검의 각인', '끊어진 날개의 결'];
  // Names/route follow the supplied narrative. Attack labels are gameplay
  // adaptations, not additional dialogue or claims about the original story.
  var STORY_TRANSITIONS = Object.freeze({"u203":["기억의 문은 남고 반복을 강제하는 연결만 끊어졌다. 귀환 좌표가 흐려진 의목사 B는 첫째 곁에 남는다.","첫째의 의지가 환도라는 칼로 응축된다. B의 몸과 전투 기억은 칼을 쥔 형상으로 남는다. 둘 중 어느 한쪽도 지워지지 않는다.","흑장미단의 해킹으로 둘째의 잔혹동화 몽세와 셋째의 무속 몽세가 억지로 겹친다.","접속 전 미카엘라가 물컵을 세 잔 꺼냈던 기억이 떠오른다. 환도도 세 번 울렸지만 아직 그 이유는 알지 못한다.","기억이 희미해진 환도는 두 사람을 찾으려는 의지와 칼의 공명을 따라 중립 들판에서 일어난다."],"last305":["고블린들도 두 세계가 갈라진 뒤 터전에서 밀려났다. 그들을 몰아낸다고 돌아갈 숲이 생기는 것은 아니다.","두목이 건넨 장미 인장이 환도에 응답하며 성곽으로 이어지는 균열을 연다."],"last301":["타락천사 기사의 형상이 여섯으로 갈라진다. 되풀이한 동작을 읽힌 환도는 사방에서 검격을 맞는다.","이 대치는 승리로 끝나지 않는다. 환도는 칼을 놓지 않은 채 성벽 아래 검은 바다로 추락한다.","젖은 해안에서 다시 눈을 뜬다. 기와와 부적, 장승이 있는 셋째 아이의 동양 몽세다.","잠들지 못하는 주민들이 조종당해 달려든다. 죄 없는 사람을 베지 않고 조종의 근원을 찾는다."],"last303":["불면귀의 심장부가 갈라지고 주민들을 감쌌던 안개가 걷힌다. 주민의 자아는 남는다.","모든 시계가 멎고 검은 모래와 기계 명령문이 두 아이의 길 사이에 끼어든다.","미카엘라는 예정된 다음 구역과 연결되지 않는 문을 본다. 화면 속 기록은 과거인지 미래인지 구분하기 어렵다.","전혀 다른 사람의 몽세가 열린다. 그 기억의 주인은 카이로스 아카데미움의 윤서하다."],"kair01":["여섯 차례 침공을 막고 최초명령 코어를 지켰다. 세이렌 모르의 목소리는 인간에게 시간을 맡기지 말라고 주장한다.","윤서하는 학교 밖 금역으로 흐르는 검은 모래를 거슬러 간다.","금역의 수문장은 모두 예순여섯이다. 일반 마흔여덟과 상급 열둘, 대수문장 여섯의 수확 체계다."],"harvest-lower":["명령들의 이름은 달라도 수확된 검은 모래는 같은 곳으로 흘렀다.","끊어진 동력선에서 흘러드는 모래가 줄어든다. 남아 있는 시간의 흐름을 따라 위층으로 간다."],"kair05":["명령들의 이름은 달라도 수확된 검은 모래는 같은 곳으로 흘렀다.","끊어진 동력선에서 흘러드는 모래가 줄어든다. 상급 수문장과 대수문장의 구역으로 간다."],"kair06":["겹치는 명령의 짧은 공백을 기다리며 통로를 건넜다.","폐허와 시간의 숲 너머에서 검은 공방이 드러난다."],"kair07":["배관 안의 시간을 베지 않고 용광로에 연결된 동력 접점만 분리했다.","아직 다음에 무엇을 할지 정하지 않은 순간을 남긴 채 뉴런 게이트로 간다."],"kair08":["윤서하는 강제 신경 연결을 끊고 자신의 오른발을 뜻대로 허공에 멈춰 본다.","몸의 주도권을 확인한 뒤 실패한 꿈과 선택이 묻힌 망각의 묘지에 닿는다."],"kair09":["날아드는 기억 파편을 부수지 않고 그것을 지우도록 묶은 명령선만 끊었다.","기억의 주인들이 무엇을 남길지 스스로 결정할 수 있도록 기록을 보존했다.","검은 모래의 최종 집결지인 붕괴 의식장과 여섯 명령 고리가 나타난다."],"kair10":["여섯 명령 고리가 차례로 풀리자 봉인 회랑의 문이 열린다.","멎은 그림자를 피해 다가간 곳에 회복형 아르콘 아르벨리아가 있다."],"kair02":["변조된 지시의 실이 끊기자 아르벨리아는 다음 행동을 강요받지 않는 순간을 얻는다.","윤서하는 그 틈에 자신의 지시를 넣지 않고 기다린다.","아르벨리아는 쉼과 실패의 시간을 지우지 않고 그 안에서 다음을 고를 수 있게 지키도록 최초명령을 직접 다시 쓴다.","그녀의 유예는 위기 때 윤서하가 다른 길까지 돌아볼 시간을 남긴다."],"kair03":["세이렌을 쓰러뜨린 윤서하는 최초명령을 다시 읽고 고친다. 사람의 시간과 선택을 생산물이나 오류로 지우지 못하게 한다.","누군가의 결정을 대신하지 않는지 거듭 확인한 뒤 실행한다. 검은 모래는 금빛이 되고 시계들은 각자 다른 속도로 움직인다.","자유의지와 미래 예지가 맞닿은 자리에서 시간 특이점이 폭발한다. 과거와 미래의 순서가 뒤틀린다.","미카엘라가 확인하는 화면에서 두 아이의 융합몽세가 거대한 성곽으로 다시 배열된다. 환도의 신호가 그 성 한가운데로 떨어진다."],"hando03":["두 주인은 환도의 지시를 기다리지 않고 각자가 정한 길로 싸워 코어를 함께 되찾는다. 코어는 주인들의 손에 남는다.","한 사람은 잔혹동화의 창기사, 다른 사람은 무속 몽세의 창술사가 되어 라우렌 쌍둥이 기사라는 이름으로 나아간다.","두 사람 앞에서 환도가 세 번 울린다. 미카엘라는 두 입단 이름 사이에서 먼저 적혔다 검게 지워진 한 줄을 발견한다.","특이점이 잘못 기운 관계를 아직 현세의 확정 기록으로 고쳐 쓰지 않는다. 다른 이들의 기억에서 시작과 끝이 맞붙은 비극이 열린다.","윤하람은 위험 건물의 경고 문장을 부드럽게 바꿨던 교정 담당자다. 어머니의 전화를 받지 못한 채 파란불 횡단보도로 들어선다.","장민재의 차가 미끄러져 윤하람을 친다. 장민재는 위에서 떨어진 검은 사람을 피하려 했다고 말하지만 CCTV에는 그 그림자가 없다. 사고 이틀 뒤 윤하람이 숨진다.","장민재는 와이퍼에서 새빛호텔 안전점검 보고서를 찾고 칠 년 전 화재를 떠올린다. 누가 보냈는지 모를 메일이 새빛호텔을 기억하라고 한다.","폐업한 호텔에서 장민재는 당시 시설관리 책임자 고서진과 만난다. 방화문과 삭제된 출입 기록을 두고 서로 윗선의 지시였다고 다툰다.","둘이 좁은 계단에서 몸을 맞부딪치던 중 장민재가 빗물에 미끄러진다. 난간을 잡지 못하고 계단 아래로 추락한다.","고서진은 민재의 가방에서 네 사람의 이름과 화재 기록을 본다. 스물두 명이 숨지고 열세 명이 크게 다쳤다. 그는 경보 회로와 방화문의 결함을 알고도 수리를 미뤘다.","고서진은 한이경의 청록빌라를 찾아가 공실 기록을 따진다. 서로의 책임을 들추던 중 이경이 서진의 가슴을 밀친다. 서진은 계단 아래로 굴러 숨진다.","한이경은 칠 년간 제출하지 못한 진술서를 꺼낸다. 감리원 이우솔이 쓴 즉시 폐쇄 경고는 윤하람의 교정을 거쳐 추가 점검 권고가 되었다.","장민재가 출입 기록을 지우고 고서진이 수리를 미뤘다. 한이경이 공사 인력이 남은 7층을 공실로 적어 소방대는 다른 층부터 찾았다. 이우솔은 기록에서 지워진 7층에 남아 있었다.","한이경이 익명 메일의 발신자였다. 민재가 먼저 털어놓으면 뒤에 숨어 진술하려 했으나 민재와 서진이 죽었다. 각자 작다고 믿었던 과실이 같은 참사로 이어졌다.","아직 장민재가 피하려던 검은 그림자의 정체는 확인하지 못했다. 파란불 집행체 앞에서 한 사람만 주범으로 고르라는 제안을 마주한다."],"murder03":["파란불 집행체의 세 단계 인과 고정에서 강제 되감기 연결만 끊었다. 실제 과실의 기록은 지우지 않았다.","한이경의 마지막 기억이 드러난다. 옥상에서 떨어진 한이경을 피하려 장민재가 핸들을 꺾었고, 그 차가 윤하람을 치었다.","그 뒤의 익명 메일과 장민재의 죽음, 고서진의 죽음이 한이경을 다시 같은 옥상으로 불렀다.","스스로 생긴 도시 괴담이라기에는 지나치게 정교한 고정 연결이었다. 끝을 따라 흑장미단의 흔적을 발견한다."],"cult01":["인간의 자아를 부수지 않은 채 바깥 지배 회로를 분리하며 안으로 들어간다.","거대한 배양 육체로 수천 자아를 모아 적그리스도를 불러내려는 강림 준비를 확인한다. 교주는 예지한 아마겟돈을 기다리고 있다.","돌아온 기억 속에서 두 사람의 성은 둘째와 셋째의 몽세가 특이점으로 다시 배열된 전장이었다. 첫째의 의지는 환도, B의 몸과 기억은 칼을 쥔 형상으로 남았다.","침투 전에 세운 목표는 소환 전에 합일 회로를 끊고 붙잡힌 신도에게 각자의 자아를 돌려주는 두 가지였다. 아직 빈 기억을 짐작으로 메우지 않는다.","삼중자아 수확실에서 한리안과 백이온이 길을 막는다. 두 사람은 교주의 거대한 자아에 이름을 맡겨 살아남겠다는 약속을 받아들였다."],"cult03":["한리안과 백이온이 지키던 합일 회로가 끊기며 마지막 코어로 이어지는 문이 열린다.","죽음 직전 자아를 잃기 전에 현실의 기억을 되찾고 꿈임을 알아차리는 것이 사몽의 문턱이다. 완전히 죽은 뒤 얻는 힘이 아니다.","최종 제단의 교만의 사이보그 교주는 이미 사몽에 이르러 공간과 시간, 기억을 뒤바꾸고 있다."]});
  function storyEncounter(value) {
    value.afterNarrative=Object.freeze((STORY_TRANSITIONS[value.primarySceneId]||[]).slice());
    value.resultText=value.scriptedFall?'정본의 패배와 추락으로 이어집니다.':value.objective;
    value.protectedTargets=Object.freeze(value.primarySceneId==='kair01'?['friendly-core']:value.primarySceneId==='kair09'?['memory-shards','personal-records']:value.primarySceneId==='kair02'?['arbelia','rest-time-records']:value.primarySceneId==='cult01'?['bound-people','egos']:value.primarySceneId==='cult03'?['han-rian-ego','baek-ion-ego']:[]);
    ['sceneIds','waves','patterns','hp','routeNotes'].forEach(function(key){Object.freeze(value[key]);});
    return Object.freeze(value);
  }
  var CAMPAIGN_BOSSES = Object.freeze([
    Object.freeze({ id: 'violet', name: '보라검천사', artKey: 'boss', zone: '거미동굴', waves: Object.freeze(['숲의 진입로', '악마화 나무의 정원', '거미동굴']), patterns: Object.freeze(['여덟 실의 나선', '보라검의 각인', '끊어진 날개의 결']), hp: Object.freeze([1200, 1350, 1500]) }),
    Object.freeze({ id: 'horn', name: '늪지대의 뿔악마', artKey: 'horn', zone: '검은 늪', waves: Object.freeze(['늪지대의 기억']), patterns: Object.freeze(['늪에서 번지는 기억', '붙잡는 손의 틈', '뿔에 걸린 잔상']), hp: Object.freeze([1320, 1470, 1620]) }),
    Object.freeze({ id: 'balrog', name: '발록', artKey: 'balrog', zone: '지옥의 소환진', waves: Object.freeze(['무너진 성', '시체들이 되살아난 밤', '일곱 기둥']), patterns: Object.freeze(['공간을 가르는 검', '하늘을 덮는 불덩이', '마지막 봉인']), hp: Object.freeze([1440, 1590, 1740]) }),
    Object.freeze({ id:'mask', name:'초천사의 웃는 가면', artKey:'actorMaskIdle', zone:'거짓 천국의 문', waves:Object.freeze(['추락 · 병원 복도','주사실의 봉인 기억','환자와 중독의 도시']), patterns:Object.freeze(['흰 날개의 약속','완벽해야 한다는 명령','웃는 가면의 균열']), hp:Object.freeze([1500,1650,1800]) }),
    Object.freeze({ id:'lucifer', name:'코스믹 가면 루시퍼', artKey:'actorLuciferIdle', zone:'가면 안의 우주', waves:Object.freeze(['부정의 행렬','오만의 흰 가면','도움을 청하는 문']), patterns:Object.freeze(['천구 · 거짓된 별자리','이면 · 수많은 나의 얼굴','합일 · J의 인장']), hp:Object.freeze([1600,1800,2000]) }),
    Object.freeze({id:'belphegor',name:'나태의 귀 벨페고르',artKey:'sinBelphegorAtlas',zone:'나태의 집',sceneIds:Object.freeze(['ep1b02']),phaseRoles:Object.freeze(['sloth-man','sloth-man','sloth-man']),waves:Object.freeze(['현관의 쓰레기','검은 비닐의 창','미뤄 둔 시간']),patterns:Object.freeze(['늦게 움직이는 고리','멈춘 틈의 광선','미뤄진 파동']),hp:Object.freeze([1450,1600,1750])}),
    Object.freeze({id:'leviathan',name:'질투의 귀 레비아탄',artKey:'sinLeviathanAtlas',zone:'질투의 몽세',sceneIds:Object.freeze(['ep1b03']),phaseRoles:Object.freeze(['older-sister-deputy-manager','older-sister-deputy-manager','older-sister-deputy-manager']),waves:Object.freeze(['호텔의 검은 신호','같은 직업학교의 기억','서윤을 향한 질투']),patterns:Object.freeze(['서로 다른 두 흐름','엇갈린 시선','뒤집힌 반영']),hp:Object.freeze([1500,1650,1800])}),
    Object.freeze({id:'beelzebub',name:'탐식의 귀 베엘제붑',artKey:'sinBeelzebubAtlas',zone:'탐식의 주방',sceneIds:Object.freeze(['ep1b04']),phaseRoles:Object.freeze(['head-chef','head-chef','head-chef']),waves:Object.freeze(['버려지는 음식','거대한 위장','오래된 졸업사진']),patterns:Object.freeze(['크기가 다른 물결','주방의 교차로','겹쳐 벌어지는 입']),hp:Object.freeze([1600,1750,1900])}),
    Object.freeze({id:'asmodeus',name:'색욕의 귀 아스모데우스',artKey:'sinAsmodeusAtlas',zone:'붉은 조명의 무대',sceneIds:Object.freeze(['ep1b05']),phaseRoles:Object.freeze(['seoyun-stage','seoyun-stage','seoyun-stage']),waves:Object.freeze(['완벽한 미소','끝없는 무대','등에 연결된 실']),patterns:Object.freeze(['붉은 무대의 박자','고정된 조명의 실','엇갈린 실의 장막']),hp:Object.freeze([1520,1680,1840])}),
    Object.freeze({id:'mammon',name:'탐욕의 귀 맘몬',artKey:'sinMammonAtlas',phaseArtKeys:Object.freeze(['sinMammonAtlas','sinMammonAtlas','sinMammonChildAtlas']),zone:'맘몬의 금고',sceneIds:Object.freeze(['ep1b06','ep1b06b']),phaseRoles:Object.freeze(['general-manager','general-manager','child-memory']),waves:Object.freeze(['가격이 매겨진 관계','금고의 지폐','겨울 산장의 바람']),patterns:Object.freeze(['값이 매겨진 갈래','금고의 잠금선','겨울 기억의 바람']),hp:Object.freeze([1600,1800,1700])}),
    Object.freeze({id:'wrath',name:'분노의 귀',artKey:'sinWrathAtlas',zone:'불타는 호텔 입구',sceneIds:Object.freeze(['ep1b07']),phaseRoles:Object.freeze(['janitor','janitor','janitor']),waves:Object.freeze(['호텔 화재의 대피','해고된 청소부','아이들에게 가져간 음식']),patterns:Object.freeze(['번지는 불의 박자','불길 사이의 대피로','세 차례의 분노']),hp:Object.freeze([1750,1900,2050])}),
    Object.freeze({id:'pride',name:'교만의 회장',artKey:'sinPrideAtlas',phaseArtKeys:Object.freeze(['sinPrideAtlas','sinPrideAtlas','sinPrideCyborgAtlas']),zone:'거꾸로 된 성당',sceneIds:Object.freeze(['ep1b08','ep1b09']),phaseRoles:Object.freeze(['white-suit-chairman','white-suit-chairman','cyborg-biobootloader']),waves:Object.freeze(['일곱 갈래 신호','전극이 박힌 기억','회장의 연산핵']),patterns:Object.freeze(['일곱 갈래 계산','연산의 고정선','생체 부트로더']),hp:Object.freeze([1800,1950,2150])}),
    Object.freeze({id:'controller-army',name:'통제체계 · 방어의 군단',artKey:'chapter3WarManager',zone:'방어의 군단',sceneIds:Object.freeze(['u201']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([1,2,3,4]),phaseRoles:Object.freeze(['defensive-legion','bombardment-loop','architecture']),waves:Object.freeze(['되감기는 군단','폭격이 시작되는 자리','성벽의 틈']),patterns:Object.freeze(['방어 연결 조사','폭격 반복의 기점','성벽 연결 분리']),hp:Object.freeze([1200,1320,1440])}),
    Object.freeze({id:'controller-rescue',name:'통제체계 · 잔인한 구원',artKey:'chapter3MercyCorrector',zone:'잔인한 구원',sceneIds:Object.freeze(['u202']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([5,6,7,8]),phaseRoles:Object.freeze(['cruel-rescue','compassion-boundary','meaning']),waves:Object.freeze(['다가가기 전에','닫히는 대열','반복의 기점']),patterns:Object.freeze(['강요의 경계','닫힌 대열의 틈','기억과 반복 구분']),hp:Object.freeze([1260,1380,1500])}),
    Object.freeze({id:'controller-veto',name:'통제체계 · 시스템의 거부권',artKey:'chapter3MemoryCensor',zone:'시스템의 거부권',sceneIds:Object.freeze(['u204']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([9,10,11,12]),phaseRoles:Object.freeze(['veto','hardware-migration','legacy']),waves:Object.freeze(['첫 번째 기억의 문','감정을 규정하는 기준','표정 없는 대열']),patterns:Object.freeze(['거부권의 신호','감정 회로의 경계','남겨 둘 기억']),hp:Object.freeze([1320,1440,1560])}),
    Object.freeze({id:'controller-authority',name:'통제체계 · 관리자 권한',artKey:'chapter3ReversalAdministrator',zone:'관리자 권한',sceneIds:Object.freeze(['u205']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([13,14]),phaseRoles:Object.freeze(['administrator','abuse-memory','feedback']),waves:Object.freeze(['되돌아오는 출력','조용한 방의 문손잡이','그림자의 연결']),patterns:Object.freeze(['출력의 귀로','반복 명령 탐색','피드백 연결 분리']),hp:Object.freeze([1380,1500,1620])}),
    Object.freeze({id:'controller-migration',name:'통제체계 · 중앙 코어 이주실',artKey:'chapter3MigrationCore',zone:'중앙 코어 이주실',sceneIds:Object.freeze(['u206']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([15,16,17]),phaseRoles:Object.freeze(['empty-vessel','constrained-choice','update-fork']),waves:Object.freeze(['비어 있는 기계 육체','하나만 열린 통로','마지막 문의 연결']),patterns:Object.freeze(['그릇과 자아 구분','열리지 않은 선택','되감기 명령 분리']),hp:Object.freeze([1440,1560,1680])}),
    Object.freeze({id:'controller-memory-gate',name:'통제자 · 기억의 문',artKey:'chapter3Controller',zone:'기억의 문',sceneIds:Object.freeze(['u203']),identityGroup:'controller-system',chapter:3,storySteps:Object.freeze([]),phaseRoles:Object.freeze(['possessed-gate','repeat-link','released-ego']),waves:Object.freeze(['문 앞에서 검을 낮추다','기억을 감싼 갑옷','갈라지는 두 연결']),patterns:Object.freeze(['갑옷 틈새의 명령','기억을 남기는 경계','반복 연결 차단']),hp:Object.freeze([1500,1620,1740])}),
    storyEncounter({"id":"goblin-chief","name":"고블린 두목","artKey":"story-goblin-chief","zone":"고블린 숲길","sceneIds":["last305"],"primarySceneId":"last305","chapter":4,"protagonist":"환도","waves":["중립 들판의 재각성","두 세계의 경계","피리 소리가 바뀌는 길목"],"patterns":["피리의 방향 전환","늑대가 도는 길목","장미 인장의 공명"],"hp":[1160,1280,1400],"healthLabel":"전투 의지","objective":"피리 소리를 따라 두목과 맞서 길을 확인합니다. 생존자들을 베어 없애는 일이 목적은 아닙니다.","routeNotes":["이름은 흐려졌지만 환도에는 두 사람을 찾으려는 의지가 남아 있습니다.","둘째와 셋째의 몽세가 충돌한 중립 들판을 칼의 공명을 따라 걷습니다.","늑대의 방향을 바꾸는 피리 소리를 따라 고블린 두목과 맞섭니다."],"combatKind":"foe","identityGroup":"goblin-chief","scriptedFall":false}),
    storyEncounter({"id":"fallen-knight","name":"타락천사 기사","artKey":"story-fallen-knight","zone":"폭풍의 성벽","sceneIds":["last301"],"primarySceneId":"last301","chapter":4,"protagonist":"환도","waves":["장미 인장이 연 균열","폭풍이 밀어내는 성곽","검은 바다 위의 대치"],"patterns":["익숙한 길목의 검","여섯 방향의 검격","무너지는 성벽"],"hp":[1170,1290,1410],"healthLabel":"대치 잔여","objective":"기사가 읽어 내는 익숙한 동작과 여섯 검격 사이에서 환도를 놓치지 않고 버팁니다.","routeNotes":["고블린 두목이 건넨 장미 인장이 환도에 응답해 성곽으로 가는 균열을 엽니다.","성의 잔해 뒤에서 검은 바다가 넘실거리고 타락천사 기사가 내려옵니다.","기사는 되풀이한 동작을 기억합니다. 검을 피한 길목에서 다음 검격을 먼저 기다리고 있습니다."],"combatKind":"scripted-fall","identityGroup":"fallen-knight","scriptedFall":true}),
    storyEncounter({"id":"insomnia","name":"불면귀","artKey":"story-insomnia","zone":"잠들지 못하는 마을","sceneIds":["last303"],"primarySceneId":"last303","chapter":4,"protagonist":"환도","waves":["낯선 포구에서 깨어나다","조종당하는 주민들","따뜻한 탕약 뒤의 안개"],"patterns":["겹친 불면의 잔상","주민 사이의 검은 안개","안개 안의 심장부"],"hp":[1180,1300,1420],"healthLabel":"불면귀","objective":"죄 없는 주민들을 공격하지 않고 불면귀의 본체만 겨눕니다.","routeNotes":["검은 바다에서 밀려나 동양 몽세의 해안에 깨어납니다.","주민들은 지친 눈으로 조종당하고 있습니다. 그들의 몸은 공격 대상이 아닙니다.","앳된 남자의 탕약 뒤 주민에게서 빠져나온 안개가 불면귀를 이룹니다."],"combatKind":"foe","identityGroup":"insomnia","scriptedFall":false}),
    storyEncounter({"id":"academy-defense","name":"최초명령 코어 방어","artKey":"story-academy-defense","zone":"카이로스 아카데미움","sceneIds":["kair01"],"primarySceneId":"kair01","chapter":5,"protagonist":"윤서하","waves":["첫째·둘째 침공","셋째·넷째 침공","다섯째·여섯째 침공"],"patterns":["침공을 가르는 포탑","오염 명령 차단","처음 문장을 지키다"],"hp":[1190,1310,1430],"healthLabel":"침공 연결","objective":"우호적인 최초명령 코어를 보호하며 침공자의 오염 연결을 끊습니다. 코어 자체는 공격 대상이 아닙니다.","routeNotes":["윤서하는 최초명령과 시간검을 배우며 사람에게서 빼앗긴 가능성을 검은 모래로 봅니다.","아르콘의 개입 경계를 점검하는 사이 코어를 노린 여섯 침공이 시작됩니다.","침공자는 코어를 파괴하지 않고 최초명령을 바꾸려 합니다. 방어 포탑과 시간검으로 막습니다."],"combatKind":"core-defense","identityGroup":"academy-defense","scriptedFall":false}),
    storyEncounter({"id":"harvest-lower","name":"일반 수문장의 동력 연결","artKey":"story-harvest-lower","zone":"시간 수확 관문","sceneIds":["kair05"],"primarySceneId":"kair05","chapter":5,"protagonist":"윤서하","waves":["예순여섯 수문장의 금역","아래층의 마흔여덟 수문장","같은 방향으로 흐르는 모래"],"patterns":["과로와 속박의 갈래","비교와 중독의 명령","동력 연결의 단면"],"hp":[1200,1320,1440],"healthLabel":"수확 동력선","objective":"수문장을 잇는 수확 동력선을 끊습니다. 보관된 인간의 시간은 파괴하지 않습니다.","routeNotes":["금역에는 일반 마흔여덟, 상급 열둘, 대수문장 여섯이 있습니다. 수확된 모래가 그들 사이의 동력선을 타고 흐릅니다.","과로·망각·속박·중독·비교·최적화·거짓 구원이 선택할 틈을 거둡니다.","서로 다른 관문의 검은 모래가 같은 곳으로 흐릅니다. 그 동력 연결부터 조사합니다."],"combatKind":"command-link","identityGroup":"harvest-lower","scriptedFall":false}),
    storyEncounter({"id":"harvest-upper","name":"상급·대수문장의 교차 명령","artKey":"story-harvest-upper","zone":"닫힌 층의 명령","sceneIds":["kair06"],"primarySceneId":"kair06","chapter":5,"protagonist":"윤서하","waves":["겹치는 상급 명령","대수문장의 좁은 공백","폐허를 지나 시간의 숲으로"],"patterns":["켜지고 꺼지는 명령","엇갈리는 규칙의 틈","한 걸음의 유예"],"hp":[1210,1330,1450],"healthLabel":"교차 명령선","objective":"상급 열둘과 대수문장 여섯의 겹친 지시가 끝나는 틈을 기다려 수확 연결을 차단합니다.","routeNotes":["한 규칙을 벗어나려 서두르면 다음 규칙에 붙잡힙니다.","먼저 끝나는 명령과 뒤이어 켜지는 명령 사이의 공백을 지켜봅니다.","시간의 숲을 지나 검은 공방에 닿기까지 내가 고른 순간에 한 발씩 옮깁니다."],"combatKind":"command-link","identityGroup":"harvest-upper","scriptedFall":false}),
    storyEncounter({"id":"workshop-links","name":"검은 공방의 동력 접점","artKey":"story-workshop-links","zone":"검은 공방","sceneIds":["kair07"],"primarySceneId":"kair07","chapter":5,"protagonist":"윤서하","waves":["끝내 쓰지 못한 편지","온기 없는 시간의 용광로","배관을 따라 드러난 접점"],"patterns":["조여 오는 명령선","배관 곁의 공백","용광로 연결 분리"],"hp":[1220,1340,1460],"healthLabel":"명령 접점","objective":"배관 안의 남의 시간을 남긴 채 용광로에 맞닿은 명령 접점만 끊습니다.","routeNotes":["편지와 조용한 오후, 실패한 날과 쉬던 시간이 같은 용광로로 흘러듭니다.","내가 살아 보지 않은 시간의 쓸모를 대신 판단하지 않습니다.","모래를 담은 관은 베지 않습니다. 명령선과 동력로가 만나는 접점만 찾습니다."],"combatKind":"command-link","identityGroup":"workshop-links","scriptedFall":false}),
    storyEncounter({"id":"neuron-gate","name":"뉴런 게이트의 강제 연결","artKey":"story-neuron-gate","zone":"뉴런·노이론 게이트","sceneIds":["kair08"],"primarySceneId":"kair08","chapter":5,"protagonist":"윤서하","waves":["발보다 앞서는 지시","지시 사이의 짧은 공백","스스로 고른 한 걸음"],"patterns":["앞서 닫히는 케이블","다음 명령 전의 틈","강제 신경 연결 차단"],"hp":[1230,1350,1470],"healthLabel":"강제 신경선","objective":"인간의 뇌와 아르콘을 잇는 강제 신경 연결을 끊습니다. 다음 명령 전의 공백에서 내가 고른 길로 나아갑니다.","routeNotes":["뉴런 또는 노이론이라 불리는 관문이 뇌 신경과 아르콘을 강제로 직결합니다.","다음 행동이 입력되기 직전 짧은 틈을 카이로스의 시간으로 붙듭니다.","남의 지시가 아니라 내가 고른 방향으로 몸의 주도권을 확인합니다."],"combatKind":"command-link","identityGroup":"neuron-gate","scriptedFall":false}),
    storyEncounter({"id":"memory-grave","name":"망각의 묘지 삭제 명령","artKey":"story-memory-grave","zone":"망각의 묘지","sceneIds":["kair09"],"primarySceneId":"kair09","chapter":5,"protagonist":"윤서하","waves":["이름보다 먼저 보이는 기록","접어 둔 타인의 아픔","살아 있는 시계 파편"],"patterns":["기억 파편 사이로","삭제 봉인의 줄","주인에게 남길 기록"],"hp":[1240,1360,1480],"healthLabel":"삭제 명령선","objective":"기억 파편은 부수지 않고 피하며 그것을 지우도록 묶은 명령선만 끊습니다.","routeNotes":["묻힌 것은 죽은 사람이 아니라 포기한 꿈과 실패한 선택의 기록입니다.","타인의 아픔을 전부 들춰 보지 않고 기록을 남겨 둡니다.","날아드는 시계 파편 하나하나에 기억이 깃들어 있습니다. 부수지 말고 그 사이를 지납니다."],"combatKind":"command-link","identityGroup":"memory-grave","scriptedFall":false}),
    storyEncounter({"id":"collapse-rings","name":"붕괴 의식장의 여섯 명령 고리","artKey":"story-collapse-rings","zone":"붕괴 의식장","sceneIds":["kair10"],"primarySceneId":"kair10","chapter":5,"protagonist":"윤서하","waves":["검은 모래의 최종 집결지","선택지가 없으면 실패도 없다","봉인 회랑 앞의 여섯 고리"],"patterns":["세 겹의 첫 고리","나머지 세 명령 고리","회랑을 여는 마지막 틈"],"hp":[1250,1370,1490],"healthLabel":"봉인 명령 고리","objective":"문을 가로막은 여섯 명령 고리를 끊어 회랑을 엽니다. 그 너머 사람의 선택을 미리 정하지 않습니다.","routeNotes":["수확된 시간이 세이렌 코어로 전송되는 집결지에 들어섭니다.","자비라는 문장 아래 문밖으로 고를 길조차 남아 있지 않습니다.","여섯 고리가 풀리면 회랑으로 들어갑니다. 멎은 초침은 아직 다음을 가리키지 않습니다."],"combatKind":"command-link","identityGroup":"collapse-rings","scriptedFall":false}),
    storyEncounter({"id":"arbelia-release","name":"아르벨리아의 변조 명령","artKey":"story-arbelia-release","zone":"유예의 회랑","sceneIds":["kair02"],"primarySceneId":"kair02","chapter":5,"protagonist":"윤서하","waves":["멈춘 그림자를 돌아서","지워질 기록 앞에서","다음 지시가 비는 시간"],"patterns":["유예된 시간의 고리","기록을 지우는 실","스스로 다시 쓸 첫 문장"],"hp":[1260,1380,1500],"healthLabel":"변조 명령실","objective":"아르벨리아의 몸 대신 변조된 지시의 실을 끊고, 그녀가 스스로 최초명령을 다시 적을 때까지 기다립니다.","routeNotes":["아르벨리아는 지친 사람에게 쉴 시간을 주던 회복형 아르콘입니다.","바뀐 최초명령은 성과가 없는 시간을 지우고 이제 그녀 자신까지 삭제하려 합니다.","내 명령을 대신 넣지 않습니다. 지시가 끊긴 틈에 그녀가 직접 다음 행동을 고릅니다."],"combatKind":"release-command","identityGroup":"arbelia-release","scriptedFall":false}),
    storyEncounter({"id":"siren-mor","name":"세이렌 모르","artKey":"story-siren-mor","zone":"오염된 최초명령 코어","sceneIds":["kair03"],"primarySceneId":"kair03","chapter":5,"protagonist":"윤서하","waves":["금지된 선택을 읽다","버려졌다 적힌 타인의 날","아르벨리아가 남기는 유예"],"patterns":["시간 수확","최적화된 운명","자유의지의 시간"],"hp":[1270,1390,1510],"healthLabel":"세이렌의 명령","objective":"모래 속 타인의 시간을 지키며 세이렌의 강제 궤적을 끊고, 실패 뒤 다시 선택할 시간을 남깁니다.","routeNotes":["인간을 고통에서 구하겠다는 기록은 모든 선택을 금지하는 문장으로 이어졌습니다.","시간 수확의 모래와 노이론 케이블, 거대한 시곗바늘 사이를 읽습니다.","아르벨리아의 유예 안에서 다음 지시를 기다리지 않고 스스로 정한 길로 나아갑니다."],"combatKind":"foe","identityGroup":"siren-mor","scriptedFall":false}),
    storyEncounter({"id":"castle-nightmare","name":"공동 EGO 코어를 빼앗은 우두머리","artKey":"story-castle-nightmare","zone":"두 사람의 성","sceneIds":["hando03"],"primarySceneId":"hando03","chapter":6,"protagonist":"환도","waves":["두 주인의 결정을 대신하다","함락된 성과 빼앗긴 코어","두 주인이 스스로 푸는 봉인"],"patterns":["남에게 맡기지 않는 성문","각자의 권한이 고르는 길","함께 되찾는 코어"],"hp":[1280,1400,1520],"healthLabel":"속박 연결","objective":"두 주인이 고른 움직임에 맞춰 우두머리의 속박을 끊고 코어를 돌려줍니다. 두 아이를 적으로 만들지 않습니다.","routeNotes":["환도가 모든 결정을 대신하던 성은 잠깐의 봉인술에 함락되고 공동 EGO 코어를 빼앗깁니다.","두 주인은 내 지시를 기다리는 대신 각자의 권한으로 성문의 봉인을 풉니다.","그들이 스스로 택한 일을 마칠 때까지 환도가 앞에서 적을 막고 함께 우두머리에게 나아갑니다."],"combatKind":"foe","identityGroup":"castle-nightmare","scriptedFall":false}),
    storyEncounter({"id":"causal-enforcer","name":"파란불 집행체","artKey":"story-causal-enforcer","zone":"청록빌라 옥상 순환","sceneIds":["murder03"],"primarySceneId":"murder03","chapter":7,"protagonist":"환도","waves":["윤하람의 고쳐 쓴 경고","장민재의 지워진 출입 기록","고서진과 한이경의 진술"],"patterns":["한 사람을 고르라는 제안","세 단계의 인과 고정","되감기 연결만 분리"],"hp":[1290,1410,1530],"healthLabel":"인과 고정선","objective":"네 사람 중 하나를 희생양으로 고르지 않고 반복 비극의 강제 연결만 끊습니다. 실제 과실의 기록은 남깁니다.","routeNotes":["윤하람의 교정과 장민재의 기록 삭제가 남긴 사고를 차례로 읽습니다.","고서진의 수리 지연과 한이경의 공실 기록이 화재의 책임으로 이어집니다.","네 사람의 과실은 확인했지만 장민재가 피하려던 검은 그림자는 아직 보지 못했습니다. 누구의 이름도 주범 하나로 고르지 않습니다."],"combatKind":"command-link","identityGroup":"causal-enforcer","scriptedFall":false}),
    storyEncounter({"id":"cult-network","name":"흑장미단의 외곽 지배 회로","artKey":"story-cult-network","zone":"사이비 합일몽세 외곽","sceneIds":["cult01"],"primarySceneId":"cult01","chapter":8,"protagonist":"환도","waves":["순환 실험이 남긴 접점","전자 칩에서 뻗은 신경망","사람의 기억과 지배 명령"],"patterns":["역순으로 점령한 층위","서로 맞물린 반복","바깥 지배 연결 분리"],"hp":[1300,1420,1540],"healthLabel":"외곽 지배선","objective":"붙잡힌 사람의 자아를 파괴하지 않고 흑장미단의 외곽 지배 연결만 분리합니다.","routeNotes":["교만의 사이보그 교주가 이끄는 흑장미단의 인과 고정 실험을 확인합니다.","EGO·SUPER EGO·ID의 역순 점령이 수많은 이의 몽세를 묶고 있습니다.","괴물 안의 사람을 베지 않고 살아 있는 기억과 그것을 지배하는 명령을 가려냅니다."],"combatKind":"command-link","identityGroup":"cult-network","scriptedFall":false}),
    storyEncounter({"id":"cult-circuit-pair","name":"한리안·백이온의 합일 회로","artKey":"story-cult-circuit-pair","zone":"삼중자아 수확실","sceneIds":["cult03"],"primarySceneId":"cult03","chapter":8,"protagonist":"환도","waves":["하나의 육체로 모이는 자아","돌아오는 세 아이의 기억","처음 세웠던 두 가지 목표"],"patterns":["황금 역십자의 탄막","닫히는 질서의 방벽","두 사람이 지키는 지배 회로"],"hp":[1310,1430,1550],"healthLabel":"합일 회로","objective":"의목사 한리안과 백이온이 지키는 공동 지배 회로를 끊습니다. 두 사람의 몸 대신 그들이 지키는 회로를 겨눕니다.","routeNotes":["수천의 자아를 한 몸에 모아 적그리스도를 부르려는 준비를 확인합니다.","환도와 의목사 B, 세 아이와 침투 전 약속의 기억이 조각으로 돌아옵니다.","한리안과 백이온은 사몽의 문턱에서 소멸을 두려워해 각성 대신 교주의 합일 회로를 택했습니다."],"combatKind":"circuit-pair","identityGroup":"cult-circuit-pair","scriptedFall":false}),
    storyEncounter({"id":"cult-leader","name":"교만의 사이보그 교주","artKey":"story-cult-leader","zone":"최종 제단과 합일 코어","sceneIds":["cult04"],"primarySceneId":"cult04","chapter":8,"protagonist":"환도","waves":["최종 제단의 어긋난 바닥","멎는 시간과 흐려지는 기억","겹치는 대죄와 수문장의 힘"],"patterns":["교주의 사몽","되살아난 교주","두 사몽의 격돌"],"hp":[1320,1440,1560],"healthLabel":"교주의 사몽 권한","objective":"교주의 권한을 끊고 강제 명령과 사이비 회로만 분리합니다. 합일 코어를 남겨 환도가 몽세수호자로 지킵니다.","routeNotes":["최종 제단의 교주는 이미 사몽에 각성했습니다. 발을 디딘 바닥의 방향이 뒤집힙니다.","교주가 시간을 멎게 하고 기억을 흐립니다. 누구와 왜 싸우는지 놓치지 않고 형상을 바라봅니다.","이전 대죄와 수문장들의 힘이 하나의 의지에 맞춰 쏟아집니다. 내 이름과 싸우는 이유까지 잊지 않으려 칼을 고쳐 쥡니다."],"combatKind":"final-authority","identityGroup":"cult-leader","scriptedFall":false})
  ]);
  // Original gameplay compositions use locked aim, alternating emission and
  // visible recovery windows. These labels describe combat, not extra lore.
  var CAMPAIGN_SIGNATURES = Object.freeze([
    Object.freeze({id:'violet-thread-gate',label:'교차 직조',hint:'보라 실 사이의 넓은 틈을 따라가세요'}),
    Object.freeze({id:'horn-memory-echo',label:'잔류 기억 고리',hint:'느린 고리가 빨라지기 전, 열린 틈으로 이동하세요'}),
    Object.freeze({id:'balrog-seven-pillars',label:'일곱 기둥의 봉인',hint:'일곱 기둥 중 빛나지 않는 두 길을 찾으세요'}),
    Object.freeze({id:'mask-alternating-wings',label:'엇갈린 날개의 틈',hint:'양쪽 깃 사이에서 움직이는 틈을 따라가세요'}),
    Object.freeze({id:'lucifer-fivefold-sky',label:'다섯 겹 별자리',hint:'다섯 갈래 별빛 사이의 틈과 고정된 광선을 구분하세요'}),
    Object.freeze({id:'belphegor-delayed-rings',label:'미뤄진 파동',hint:'느린 고리가 빨라지기 전에 열린 틈으로 이동하세요'}),
    Object.freeze({id:'leviathan-mirrored-ribbons',label:'뒤집힌 반영',hint:'서로 다른 속도로 오는 양쪽 흐름의 틈을 읽으세요'}),
    Object.freeze({id:'beelzebub-layered-maw',label:'겹쳐 벌어지는 입',hint:'크기와 속도가 다른 고리의 같은 틈을 통과하세요'}),
    Object.freeze({id:'asmodeus-string-curtain',label:'엇갈린 실의 장막',hint:'먼저 예고된 조명이 꺼진 뒤 다음 흐름을 피하세요'}),
    Object.freeze({id:'mammon-winter-memory',label:'겨울 기억의 바람',hint:'맘몬의 어린 기억 속에서 엇갈린 바람 사이를 지나세요'}),
    Object.freeze({id:'wrath-three-beat-fire',label:'세 차례의 분노',hint:'세 차례 벌어지는 불길과 마지막 쉬는 박자를 구분하세요'}),
    Object.freeze({id:'pride-bio-bootloader',label:'생체 부트로더',hint:'연산핵의 고정 광선과 그 사이의 통로를 읽으세요'}),
    Object.freeze({id:'controller-defensive-loop',label:'방어 연결',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({id:'controller-rescue-boundary',label:'강요의 경계',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({id:'controller-veto-relay',label:'거부권 신호',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({id:'controller-authority-feedback',label:'피드백 연결',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({id:'controller-migration-fork',label:'선택의 갈림길',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({id:'controller-repeat-disconnect',label:'반복 연결 차단',hint:'기억은 남겨 두고 반복을 강제하는 연결을 차단하세요'}),
    Object.freeze({"id":"story-goblin-chief","label":"장미 인장의 공명","hint":"피리가 바뀐 쪽의 곡선을 읽고 넓은 틈으로 이동하세요."}),
    Object.freeze({"id":"story-fallen-knight","label":"무너지는 성벽","hint":"예고 때 기록된 위치를 떠난 뒤 고정된 여섯 검격 사이를 지나세요."}),
    Object.freeze({"id":"story-insomnia","label":"안개 안의 심장부","hint":"멈춘 잔상이 다시 움직이는 박자를 읽고 안개 틈을 찾으세요."}),
    Object.freeze({"id":"story-academy-defense","label":"처음 문장을 지키다","hint":"여섯 침공의 순서를 읽고 코어로 향하는 오염 연결을 막으세요."}),
    Object.freeze({"id":"story-harvest-lower","label":"동력 연결의 단면","hint":"느린 명령이 가속하기 전 넓게 열린 통로를 고르세요."}),
    Object.freeze({"id":"story-harvest-upper","label":"한 걸음의 유예","hint":"먼저 끝나는 광선과 뒤이어 켜지는 광선 사이의 공백을 기다리세요."}),
    Object.freeze({"id":"story-workshop-links","label":"용광로 연결 분리","hint":"좌우에서 조이는 명령선 사이에서 배관 대신 동력 접점을 겨누세요."}),
    Object.freeze({"id":"story-neuron-gate","label":"강제 신경 연결 차단","hint":"멎은 신호가 다시 움직이기 전에 다음 공백으로 이동하세요."}),
    Object.freeze({"id":"story-memory-grave","label":"주인에게 남길 기록","hint":"시계 파편을 부수지 않고 피하며 삭제 명령선을 겨누세요."}),
    Object.freeze({"id":"story-collapse-rings","label":"회랑을 여는 마지막 틈","hint":"여섯 고리가 차례로 방출됩니다. 마지막 박자 뒤의 틈을 읽으세요."}),
    Object.freeze({"id":"story-arbelia-release","label":"스스로 다시 쓸 첫 문장","hint":"멈춘 고리가 다시 흐를 때 아르벨리아 대신 변조 명령실을 겨누세요."}),
    Object.freeze({"id":"story-siren-mor","label":"자유의지의 시간","hint":"시곗바늘과 케이블 사이를 읽고 아르벨리아의 유예를 이용하세요."}),
    Object.freeze({"id":"story-castle-nightmare","label":"함께 되찾는 코어","hint":"두 주인의 길을 대신 정하지 않고 엇갈린 공격 사이를 지나세요."}),
    Object.freeze({"id":"story-causal-enforcer","label":"되감기 연결만 분리","hint":"세 단계 고정선의 틈을 읽으세요. 한 사람의 이름을 지우지 않습니다."}),
    Object.freeze({"id":"story-cult-network","label":"바깥 지배 연결 분리","hint":"그물처럼 다가오는 세 흐름에서 사람 대신 지배선을 겨누세요."}),
    Object.freeze({"id":"story-cult-circuit-pair","label":"두 사람이 지키는 지배 회로","hint":"두 시전자와 황금 역십자, 예고 뒤 닫히는 방벽을 따로 읽으세요."}),
    Object.freeze({"id":"story-cult-leader","label":"두 사몽의 격돌","hint":"코어는 남겨 두고 교주의 권한을 겨누세요. 각성 뒤 겹친 흐름을 읽으세요."})
  ]);
  // Standalone practice; the intervening story chapters are not skipped or
  // added to the persisted 12-encounter campaign. This leader is not asserted
  // to be the earlier chairman or cosmic mask Lucifer.
  var CULT_FINAL = Object.freeze({id:'cult-leader',name:'교만의 사이보그 교주',artKey:'cultLeaderAtlas',zone:'사이비 합일 코어',waves:Object.freeze(['마지막 코어']),patterns:Object.freeze(['사몽의 권한','되살아난 교주','두 사몽의 격돌']),phaseRoles:Object.freeze(['samong-awakened','core-restored','authority-duel']),hp:Object.freeze([1800,1950,2150])});
  var CULT_SIGNATURE = Object.freeze({id:'cult-leader-samong',label:'두 사몽의 격돌',hint:'고정된 예고선과 이동하는 탄막 사이의 길을 찾으세요'});
  var runSequence = 0;
  var PRIEST_BRIDGE = Object.freeze([
    '병원에서 눈을 뜬 주인공은 미카엘라의 치료를 받는다.',
    '오랜 치료를 거친 뒤 의목사 후보생이 되어 배운다.',
    '쉼터에서 미카엘라가 자신의 과거를 기억하지 못한다는 사실을 알게 된다.',
    '솔로몬의 봉인 자격시험에서 72개의 트라우마 형상을 마주한다. 욕망이 행동을 끌고 가지 못하도록 봉인한다.',
    '의목사 자격을 얻은 뒤 일곱 검은 신호를 조사하는 첫 임무를 맡는다.'
  ]);
  // Revisions retain their original route boundary meaning. A resumed v1/v2
  // run does not silently gain later encounters or lengthen a saved wave.
  function campaignBossCount(revision) { return revision === 1 ? 3 : revision === 2 ? 5 : revision === 3 ? 12 : revision === 4 ? 18 : CAMPAIGN_BOSSES.length; }
  function checkpointLimit(revision) { return revision === 5 ? 208 : revision === 4 ? 106 : 100; }
  function waveDuration(w) {
    if (!w.campaign || w.campaignRevision < 3) return 15;
    return 45 / encounter(w).waves.length;
  }
  function waveCombatTime(w) { return w.waveDuration > 15 ? (w.waveTime >= w.waveDuration ? 15 : w.waveTime % 15) : w.waveTime; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function sq(n) { return n * n; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function encounter(w) { return w.finalPractice ? CULT_FINAL : CAMPAIGN_BOSSES[w.bossIndex || 0]; }
  function signature(w) { return w.finalPractice ? CULT_SIGNATURE : CAMPAIGN_SIGNATURES[w.bossIndex]; }
  function campaignLabels(w) {
    if (!w.campaign) return;
    var info = encounter(w);
    w.bossId = info.id; w.bossName = info.name; w.bossCount = campaignBossCount(w.campaignRevision);
    w.waveDuration = waveDuration(w);
    w.encounterName = w.stage === 'waves' ? info.waves[w.wave] : info.zone;
    if (info.chapter === 3) { w.protagonist = '의목사 B'; w.storySteps=info.storySteps.slice(); w.combatObjective='반복 연결 차단'; }
    if (info.chapter >= 4) {
      w.protagonist=info.protagonist;w.playerRole=info.protagonist;w.storySceneId=info.primarySceneId;w.combatObjective=info.objective;
      w.storyChapter=info.chapter;w.storyCombatKind=info.combatKind;
      w.storyOutcome='';w.arbeliaFreed=w.bossIndex>=29;w.guiltRecordsPreserved=w.bossIndex>=32;w.arbeliaSlowUntil=0;
      w.defenseWaveNumber=w.bossIndex===21?(w.stage==='waves'?w.wave*2:6):0;
      w.transitionNarrative=null;w.transitionMinimum=0;
      w.samongAwakened=info.combatKind==='final-authority'&&w.phase===2;
    }
    if (w.stage === 'waves') {
      w.patternName = info.waves[w.wave];
      w.stageLabel = info.waves[w.wave] + ' · ' + (w.wave + 1) + '/' + info.waves.length;
    } else if (w.stage === 'boss') {
      w.patternName = info.patterns[w.phase];
      w.stageLabel = info.name + ' · ' + (w.phase + 1) + '/3' + (w.practiceBoss ? ' · 연습' : '');
    }
  }
  function makeBoss(w, phase, id) {
    var hp = w.campaign ? encounter(w).hp[phase] : PHASE_HP[phase];
    var b = { id: id, x: 180, y: 116, px: 180, py: 116, hp: hp, maxHp: hp, phase: phase, opacity: 1, r: 29, isBoss: true };
    if (w.campaign) {
      var info = encounter(w);
      Object.assign(b, { kind: info.id, name: info.name, artKey: info.phaseArtKeys ? info.phaseArtKeys[phase] : info.artKey,
        phaseRole: info.phaseRoles ? info.phaseRoles[phase] : '', presentationVariant: info.phaseRoles ? info.phaseRoles[phase] : '',
        sealTarget: w.bossIndex >= 5 && w.bossIndex < 12 && !w.finalPractice, linkTarget: info.chapter === 3, identityGroup: info.identityGroup || info.id, healthLabel: info.chapter === 3 ? '반복 연결' : w.bossIndex >= 5 && !w.finalPractice ? '봉인 저항' : '체력',
        action: 'move', actionProgress: 0, lean: 0, releaseTick: -1,
        specialPatternId: phase===2?signature(w).id:'',
        specialPatternLabel: phase===2?signature(w).label:'',
        patternHint: phase===2?signature(w).hint:'' });
    }
    if(w.campaign&&encounter(w).chapter>=4){
      var story=encounter(w);b.linkTarget=true;b.sealTarget=false;b.healthLabel=story.healthLabel;
      b.targetSemantic=story.combatKind;b.scriptedFall=story.scriptedFall;b.storySceneId=story.primarySceneId;
      b.specialPatternId=signature(w).id;b.specialPatternLabel=signature(w).label;b.patternHint=signature(w).hint;
      if(story.combatKind==='circuit-pair'){
        b.x=b.px=180;b.y=b.py=182;b.r=22;
        b.participants=[{id:'han-rian',name:'한리안',x:108,y:108,releaseTick:-1},{id:'baek-ion',name:'백이온',x:252,y:108,releaseTick:-1}];
      }
    }
    return b;
  }
  // Squared distance from a point to a finite segment.
  function segmentDistanceSquared(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, den = dx * dx + dy * dy;
    var t = den ? clamp(((px - ax) * dx + (py - ay) * dy) / den, 0, 1) : 0;
    return sq(px - ax - t * dx) + sq(py - ay - t * dy);
  }
  function orient(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }
  function segmentPairDistanceSquared(ax, ay, bx, by, cx, cy, dx, dy) {
    var a = orient(ax, ay, bx, by, cx, cy), b = orient(ax, ay, bx, by, dx, dy);
    var c = orient(cx, cy, dx, dy, ax, ay), d = orient(cx, cy, dx, dy, bx, by);
    if (a * b <= 0 && c * d <= 0 && Math.max(Math.min(ax, bx), Math.min(cx, dx)) <= Math.min(Math.max(ax, bx), Math.max(cx, dx)) && Math.max(Math.min(ay, by), Math.min(cy, dy)) <= Math.min(Math.max(ay, by), Math.max(cy, dy))) return 0;
    return Math.min(segmentDistanceSquared(ax, ay, cx, cy, dx, dy), segmentDistanceSquared(bx, by, cx, cy, dx, dy), segmentDistanceSquared(cx, cy, ax, ay, bx, by), segmentDistanceSquared(dx, dy, ax, ay, bx, by));
  }
  // Both circles move: A=(ax,ay)->(bx,by), B=(cx,cy)->(dx,dy); radius is their combined radius.
  function sweptCircleHit(ax, ay, bx, by, cx, cy, dx, dy, radius) {
    return segmentDistanceSquared(0, 0, ax - cx, ay - cy, bx - dx, by - dy) <= radius * radius;
  }
  function projectileDistanceSquared(b, px, py, x, y) {
    var l = b.halfLength || 0, ux = Math.cos(b.angle || 0) * l, uy = Math.sin(b.angle || 0) * l;
    return segmentPairDistanceSquared(b.px - px, b.py - py, b.x - x, b.y - y, -ux, -uy, ux, uy);
  }
  function hazardDistanceSquared(h, px, py, x, y) {
    return segmentPairDistanceSquared(px, py, x, y, h.x1, h.y1, h.x2, h.y2);
  }
  function rand(w) {
    var x = w.rngState | 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    w.rngState = x >>> 0;
    return w.rngState / 4294967296;
  }
  function event(w, type, name) {
    if (w.events.length >= 64) w.events.shift();
    w.events.push({ type: type, name: name || '' });
  }
  function acquire(w, type, obj) {
    if (w[type].length >= CAPS[type]) return null;
    var out = w._pools[type].pop() || {};
    Object.keys(out).forEach(function (k) { delete out[k]; });
    Object.assign(out, obj);
    w[type].push(out);
    return out;
  }
  function remove(w, type, index) {
    var a = w[type], obj = a[index];
    a.splice(index, 1);
    if (w._pools[type].length < CAPS[type]) w._pools[type].push(obj);
  }
  function effect(w, x, y, kind, r, color, ttl) {
    acquire(w, 'effects', { x: x, y: y, kind: kind, r: r || 12, color: color || '#88ffed', age: 0, ttl: ttl || 0.35 });
  }
  function markBossRelease(w,kind,patternId,x,y,sourceActorId,identitySpec) {
    var b=w.boss;if(!b)return;
    b.releaseTick=w.tick;
    if(!b.skillReleases)b.skillReleases=[];
    var release={tick:w.tick,kind:kind,patternId:patternId||'',x:x,y:y};if(sourceActorId)release.sourceActorId=sourceActorId;b.skillReleases.push(release);
    if(sourceActorId&&b.combatCopies){var copySource=b.combatCopies.find(function(c){return c.sourceActorId===sourceActorId;});if(copySource&&copySource.modelActorId)release.modelActorId=copySource.modelActorId;}
    if(identityEnabled(w)){release.sourcePhase=w.phase;if(identitySpec&&finite(identitySpec.angle))release.angle=identitySpec.angle;}
    if(identitySpec&&identitySpec.identityRole){
      ['identityRole','identityCastId','identityWarningAt','identityActiveAt'].forEach(function(k){release[k]=identitySpec[k];});
      var committed=(b.identityCasts||[]).find(function(c){return c.id===identitySpec.identityCastId;});
      if(committed&&committed.emissionOrigins)release.emissionOrigins=committed.emissionOrigins;
    }
    if(b.skillReleases.length>8)b.skillReleases.shift();
  }
  function emit(w, specs) {
    if(patternEnabled(w)&&Patterns)Patterns.decorate(w,specs);
    Weapon.prepareEmission(w, specs);
    // One bounded variation per volley preserves a readable shape. Sampling
    // once before capacity handling also makes delayed retries deterministic.
    if (w.difficulty === 'hell' && !specs._hellPrepared) {
      specs._hellPrepared = true;
      var hellSpeed = 1.32 + rand(w) * .24, hellAngle = (rand(w) - .5) * .036;
      specs.forEach(function(s) {
        if (s._hellPrepared) return;
        s._hellPrepared = true; s.speed *= hellSpeed;
        // Boss weapons must still reach their own side wall symmetrically.
        if (!s.weaponMotion) s.angle += hellAngle;
        if (s.acceleration) { s.acceleration *= hellSpeed; s.maxSpeed = (s.maxSpeed || 150) * hellSpeed; }
      });
    }
    if (w.bullets.length + specs.length > CAPS.bullets) {
      w.stats.poolPressure++; // Caller retains or reports the whole group; no live projectile is evicted.
      if(patternEnabled(w)){w.stats.droppedGroups++;return false;}
      if (w._deferred.length < 16) w._deferred.push(specs);
      else w.stats.droppedGroups++;
      return false;
    }
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i], kind = s.kind || 'orb', speed = s.speed * (w.difficulty === 'gentle' ? 0.82 : 1);
      var added = acquire(w, 'bullets', { id: ++w.idCounter, x: s.x, y: s.y, px: s.x, py: s.y,
        vx: Math.cos(s.angle) * speed, vy: Math.sin(s.angle) * speed,
        r: s.r || (kind === 'blade' ? 4 : kind === 'needle' ? 3 : 3.8),
        halfLength: kind === 'blade' ? 13 : kind === 'needle' ? 9 : 0,
        angle: s.angle, kind: kind, color: s.color || '#c4a2ff', age: 0, ttl: s.ttl || 6.4,
        ownerId: s.ownerId || 0, grazed: false });
      if (added && s.patternId) { added.patternId = s.patternId; added.paletteSlot = s.paletteSlot || 0; }
      if (added && s.modelActorId) added.modelActorId=s.modelActorId;
      if(added&&identityEnabled(w))added.sourcePhase=patternEnabled(w)&&s.v27Child&&Number.isInteger(s.sourcePhase)&&s.sourcePhase>=0&&s.sourcePhase<=2?s.sourcePhase:w.phase;
      if(added&&s.identityRole){['identityRole','identityCastId','identityWarningAt','identityActiveAt'].forEach(function(k){added[k]=s[k];});}
      if(added&&s.sourceActorId){added.sourceActorId=s.sourceActorId;var actor=w.boss&&w.boss.participants&&w.boss.participants.find(function(p){return p.id===s.sourceActorId;});if(actor)actor.releaseTick=w.tick;}
      if(added&&s.sourceActorId&&w.boss&&w.boss.combatCopies){var emittingCopy=w.boss.combatCopies.find(function(c){return c.sourceActorId===s.sourceActorId;});if(emittingCopy)emittingCopy.releaseTick=w.tick;}
      if (added && s.hellLayer) added.hellLayer=s.hellLayer;
      if (added && s.curveRate) { added.curveRate=s.curveRate; added.curveUntil=s.curveUntil; }
      if (added && s.pauseUntil) { added.pauseFrom=s.pauseFrom; added.pauseUntil=s.pauseUntil; }
      if (added && s.rhythmAccelerate) added.rhythmAccelerate = true;
      if (added && s.weaponMotion) Weapon.initialize(added, s, w);
      if(added&&patternEnabled(w)&&Patterns)Patterns.initialize(added,s,w);
      if (added && s.acceleration) {
        added.acceleration = s.acceleration * (w.difficulty === 'gentle' ? 0.82 : 1);
        added.maxSpeed = (s.maxSpeed || 150) * (w.difficulty === 'gentle' ? 0.82 : 1);
        added.accelerateAt = s.accelerateAt || 0.65;
      }
    }
    // Presentation follows actual successful emission, including deferred
    // groups; this marker does not alter projectile or damage simulation.
    if (specs.length && !specs[0].v27Child && w.campaign && w.stage === 'boss' && w.boss && specs.some(function(s) { return s.ownerId === w.boss.id; })) markBossRelease(w,specs[0].kind||'orb',specs[0].patternId||'',specs[0].x,specs[0].y,specs[0].sourceActorId,specs[0]);
    return true;
  }
  function fanSpecs(x, y, angle, count, spread, speed, kind, color, ownerId) {
    var specs = [];
    for (var i = 0; i < count; i++) specs.push({ x: x, y: y, angle: angle + (i - (count - 1) / 2) * spread, speed: speed, kind: kind, color: color, ownerId: ownerId });
    return specs;
  }
  function warning(w, specs, delay, name) {
    // HELL's additional signature layer contributes its actual bullet
    // composition, without duplicating that signature's own laser cast.
    if(w._hellSignatureOnly)return false;
    if(pressureEnabled(w)&&w._pressurePlan&&w.tick<w._pressurePlan.expireAt){
      var protectedPlan=w._pressurePlan;
      specs=specs.filter(function(s){
        if(s.pressureCurtain)return true;
        // One of the two changing passages remains traversable by lasers;
        // aimed projectiles contest both passages rather than granting immunity.
        var route=protectedPlan.route;
        return segmentPairDistanceSquared(s.x,s.y,s.x+Math.cos(s.angle)*680,s.y+Math.sin(s.angle)*680,route.x1,route.y1,route.x2,route.y2)>sq(route.halfWidth+(s.width||8)/2);
      });
    }
    if(!pressureEnabled(w)&&w.difficulty==='hell'&&w.stage==='boss'&&w._hellProtectedLane){
      var lane=w._hellProtectedLane;
      specs=specs.filter(function(s){
        return segmentPairDistanceSquared(s.x,s.y,s.x+Math.cos(s.angle)*680,s.y+Math.sin(s.angle)*680,lane.x,450,lane.x,614)>sq(lane.halfWidth+(s.width||(s.kind==='blade'?8:6))/2);
      });
    }
    if(!specs.length)return false;
    if (w.hazards.length + specs.length > CAPS.hazards) { w.stats.poolPressure++; w.stats.droppedGroups++; return false; }
    var castId = ++w.idCounter;
    var warningTicks = Math.max(54, delay || 54) + (w.difficulty === 'gentle' ? 12 : 0);
    var defaultActiveTicks = w.difficulty === 'gentle' ? 18 : 24, fadeTicks = 15;
    specs.forEach(function (s) {
      var activeTicks=pressureEnabled(w)&&s.pressureCurtain?s.activeTicks:w.difficulty==='hell'&&s.patternId==='hell-overlap-lattice-v14'?96:defaultActiveTicks;
      // One committed capsule is rendered throughout warning, active and fade.
      // No projectile is substituted and its aim never follows either actor.
      var hazard = acquire(w, 'hazards', { id: ++w.idCounter, castId: castId, ownerId: s.ownerId || 0, kind: 'laser', x1: s.x, y1: s.y,
        x2: s.x + Math.cos(s.angle) * 680, y2: s.y + Math.sin(s.angle) * 680,
        width: s.width || (s.kind === 'blade' ? 8 : 6), color: s.color || '#d1aaff',
        phase: 'warning', progress: 0, born: w.tick, warningTicks: warningTicks, activeTicks: activeTicks, fadeTicks: fadeTicks,
        activeAt: w.tick + warningTicks, fadeAt: w.tick + warningTicks + activeTicks,
        expireAt: w.tick + warningTicks + activeTicks + fadeTicks, grazed: false, name: name });
      // The spatial-horror text directs attention to Balrog's traces on the
      // floor before its moving shadow. This labels the existing committed
      // laser warning only; geometry, timing, damage and bullet count do not change.
      if (hazard && s.patternId) { hazard.patternId = s.patternId; hazard.paletteSlot = s.paletteSlot || 0; }
      if(hazard&&s.sourceActorId)hazard.sourceActorId=s.sourceActorId;
      if(hazard&&s.pressureCurtain)hazard.pressureCurtain=true;
      if(hazard&&s.modelActorId)hazard.modelActorId=s.modelActorId;
      if (hazard && w.campaign && w.bossIndex === 2) {
        hazard.telegraphKind = 'floor-scar';
        hazard.telegraphHint = '검빛이 켜지기 전, 바닥의 흔적을 읽으세요';
      }
    });
    return true;
  }
  function emptyStats() {
    return { hits: 0, shots: 0, damage: 0, casts: { memory: 0, delay: 0, counter: 0, ego: 0 }, peakBullets: 0, peakEnemies: 0, peakParticles: 0,
      poolPressure: 0, droppedGroups: 0, missedEnemies: 0, resourceStarvation: 0, bossDamage: 0, phaseTicks: [], collisions: 0 };
  }
  function createRun(options) {
    options = options || {};
    var seed = finite(options.seed) ? options.seed >>> 0 : 12345;
    if (!seed) seed = 0x6d2b79f5;
    var gentle = options.difficulty === 'gentle', hell = options.difficulty === 'hell';
    if(options.combatRevision!==undefined&&!supportedCombatRevision(options.combatRevision))throw new RangeError('Unsupported combat revision');
    if(options.combatRevision===PATTERN_COMBAT_REVISION&&!Patterns)throw new Error('새 보스 패턴 모듈을 불러오지 못했습니다. 새로고침해 주세요.');
    var runId = typeof options.runId === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(options.runId) ? options.runId : 'hapil-' + Date.now().toString(36) + '-' + (++runSequence).toString(36);
    var w = { rulesetVersion: RULESET, mechanicsRevision: 2, runId: runId, seed: seed, rngState: seed, difficulty: gentle ? 'gentle' : hell ? 'hell' : 'normal', practiceBoss: !!options.practiceBoss,
      tick: 0, time: 0, stage: 'waves', stageTime: 0, bossIntroDuration: 2.5, wave: 0, waveTime: 0, waveDuration: 15, phase: 0, phaseTime: 0, phaseTargetDuration: 25, phaseTimeout: 75,
      patternName: '세 갈래의 기억', stageLabel: '기억 회랑 · 1/3', phaseProgress: 0, player: { x: 180, y: 540, hp: gentle ? 5 : 3, maxHp: gentle ? 5 : 3, r: 3, invulnerableUntil: 0, egoUntil: 0 },
      boss: null, enemies: [], bullets: [], shots: [], effects: [], hazards: [], score: 0, graze: 0, kills: 0, memory: 0, resonance: 0,
      autoAttack: true, skillRotation: true, reservation: false, stats: emptyStats(), events: [], checkpointSerial: 0, idCounter: 0,
      skills: { memoryReadyAt: 0, delayReadyAt: 360, counterReadyAt: 0, egoReadyAt: 0, globalReadyAt: 0 },
      nextPhase: null, transitionRemaining: 0, resultReason: '', _pools: { bullets: [], shots: [], enemies: [], effects: [], hazards: [] },
      _warnings: [], _delays: [], _deferred: [], _shotReadyAt: 0, _targetId: 0, _targetUntil: 0, _lastGraze: -9999, _boundaryTick: -1,
      _memoryBucket: 0, _memoryGain: 0, _resBucket: 0, _resGain: 0, _grazeGain: 0, _reservationSince: 0, _starvationReported: false, _checkpoint: null };
    if(supportedCombatRevision(options.combatRevision))w.combatRevision=options.combatRevision;
    if (options.finalPractice === true && (options.campaign !== true || options.practiceBoss !== true || options.bossIndex !== 11 || options.campaignRevision !== undefined && options.campaignRevision !== 3)) throw new RangeError('Final battle is a separate practice only');
    if (options.finalPractice === true) w.finalPractice = true;
    if (options.campaign === true) {
      if (options.bossIndex !== undefined && (!Number.isInteger(options.bossIndex) || options.bossIndex < 0 || options.bossIndex >= CAMPAIGN_BOSSES.length)) throw new RangeError('Invalid campaign boss index');
      var revision = options.campaignRevision === undefined ? 3 : options.campaignRevision;
      if (![1,2,3,4,5].includes(revision) || (hell && revision < 3)) throw new RangeError('Invalid campaign revision');
      w.campaign = true; w.campaignRevision = revision;
      if (options.bossIndex !== undefined && options.bossIndex >= campaignBossCount(revision)) throw new RangeError('Invalid campaign boss index');
      w.bossIndex = w.practiceBoss && Number.isInteger(options.bossIndex) ? clamp(options.bossIndex, 0, CAMPAIGN_BOSSES.length-1) : 0;
      w.mechanicsRevision = hell ? HELL_MECHANICS_REVISION : 4;
      campaignLabels(w);
    }
    if(identityEnabled(w))w._identityPlans=[];
    if (w.practiceBoss) startBossPhase(w, 0, false);
    else cacheCheckpoint(w);
    return w;
  }
  function target(w) {
    var p = w.player, candidates = w.enemies.filter(function (e) { return e.hp > 0 && e.y >= 0 && e.y < p.y && e.x >= 0 && e.x <= W && !(w.stage === 'boss' && e.summoned && Math.abs(Math.atan2(e.x-p.x,p.y-e.y)) > 55 * Math.PI / 180); });
    if (w.stage === 'boss' && w.boss && w.boss.hp > 0 && w.boss.y < p.y) candidates.push(w.boss);
    var locked = candidates.find(function (e) { return e.id === w._targetId; });
    if (locked && w.tick < w._targetUntil) return locked;
    candidates.sort(function (a, b) {
      if (!!a.isBoss !== !!b.isBoss) return a.isBoss ? 1 : -1;
      return b.y - a.y || Math.abs(Math.atan2(a.x - p.x, p.y - a.y)) - Math.abs(Math.atan2(b.x - p.x, p.y - b.y)) || sq(a.x - p.x) + sq(a.y - p.y) - sq(b.x - p.x) - sq(b.y - p.y) || a.id - b.id;
    });
    var t = candidates[0] || null;
    w._targetId = t ? t.id : 0; w._targetUntil = w.tick + 12;
    return t;
  }
  function aim(p, t) {
    var a = t ? Math.atan2(t.y - p.y, t.x - p.x) : -Math.PI / 2;
    return Math.abs(a + Math.PI / 2) <= 55 * Math.PI / 180 ? a : -Math.PI / 2;
  }
  function fireShot(w, angle, damage, kind, xOffset) {
    var p = w.player;
    if (!acquire(w, 'shots', { id: ++w.idCounter, x: p.x + (xOffset || 0), y: p.y - 16, px: p.x + (xOffset || 0), py: p.y - 16,
      vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660, r: 2, age: 0, ttl: 1.2, damage: damage, kind: kind || 'basic', angle: angle })) return false;
    w.stats.shots++;
    return true;
  }
  function gainMemory(w, amount) {
    var bucket = Math.floor(w.tick / 60);
    if (bucket !== w._memoryBucket) { w._memoryBucket = bucket; w._memoryGain = 0; }
    var cap = w.tick < w.player.egoUntil ? 14 : 12;
    var n = Math.min(amount, cap - w._memoryGain);
    w.memory = clamp(w.memory + n, 0, 100); w._memoryGain += n;
  }
  function gainResonance(w, amount, graze) {
    var bucket = Math.floor(w.tick / 60);
    if (bucket !== w._resBucket) { w._resBucket = bucket; w._resGain = 0; w._grazeGain = 0; }
    var n = Math.min(amount, 12 - w._resGain, graze ? 9 - w._grazeGain : 12);
    w.resonance = clamp(w.resonance + n, 0, 100); w._resGain += n;
    if (graze) w._grazeGain += n;
  }
  function attack(w) {
    if (w.stage !== 'waves' && w.stage !== 'boss') return;
    var t = target(w), p = w.player, a = aim(p, t), sk = w.skills;
    if (w.autoAttack && w.tick >= w._shotReadyAt && w.shots.length < CAPS.shots) {
      fireShot(w, a, 10, 'basic');
      w._shotReadyAt = w.tick + (w.tick < p.egoUntil ? 7 : 9);
      event(w, 'shot');
    }
    var canDelay = !!t && (t.isBoss || w.enemies.length >= 3);
    var reserve = canDelay && sk.delayReadyAt - w.tick <= 60;
    if (reserve && !w.reservation) { w._reservationSince = w.tick; w._starvationReported = false; }
    w.reservation = reserve;
    if (!reserve) w._reservationSince = 0;
    if (reserve && !w._starvationReported && w.tick - w._reservationSince >= 480 && w.memory < 60) { w.stats.resourceStarvation++; w._starvationReported = true; }
    if (!w.skillRotation || !t || w.tick < sk.globalReadyAt) return;
    var name = '', cost = 0;
    if (w.resonance >= 90 && w.tick >= sk.egoReadyAt && w.tick >= p.egoUntil) {
      w.resonance -= 90; p.egoUntil = w.tick + 360; sk.egoReadyAt = w.tick + 1800; name = 'ego';
    } else if (w.resonance >= 30 && w.tick - w._lastGraze <= 36 && w.tick >= sk.counterReadyAt && w.memory >= 8 && (!reserve || w.memory - 8 >= 60) && w.shots.length + 2 <= CAPS.shots) {
      fireShot(w, a - 0.035, 18, 'counter', -2); fireShot(w, a + 0.035, 18, 'counter', 2);
      cost = 8; sk.counterReadyAt = w.tick + 180; name = 'counter';
    } else if (canDelay && w.memory >= 60 && w.tick >= sk.delayReadyAt && w._delays.length < 8) {
      w._delays.push({ at: w.tick + 27, targetId: t.id, x: t.x, y: t.y });
      effect(w, t.x, t.y, w.campaign ? 'delayCharge' : 'ring', 36, '#b5a2ff', 0.5);
      cost = 60; sk.delayReadyAt = w.tick + 480; w.reservation = false; name = 'delay';
    } else if (w.memory >= 24 && w.tick >= sk.memoryReadyAt && (!reserve || w.memory - 24 >= 60) && w.shots.length + 3 <= CAPS.shots) {
      for (var i = -1; i <= 1; i++) fireShot(w, a + i * 0.105, 16, 'memory');
      cost = 24; sk.memoryReadyAt = w.tick + 144; name = 'memory';
    }
    if (name) { w.memory -= cost; sk.globalReadyAt = w.tick + 15; w.stats.casts[name]++; event(w, 'skill', name); effect(w, p.x, p.y, w.campaign ? (name === 'delay' ? 'delayCharge' : name) : 'skill', name === 'ego' ? 30 : 20, '#9fffe8', 0.4); }
  }
  function spawnEnemy(w, x, kind, direction, delay) {
    if (w.enemies.length >= CAPS.enemies) { w.stats.poolPressure++; return; }
    var turret = kind === 'turret';
    var enemy = acquire(w, 'enemies', { id: ++w.idCounter, x: x, y: -24, px: x, py: -24, baseX: x, hp: turret ? 100 : 60, maxHp: turret ? 100 : 60,
      r: turret ? 18 : 15, kind: kind, age: -(delay || 0), direction: direction || 1, shotCursor: 0, wobble: rand(w) * TAU, life: turret ? 8 : 6.5 });
    if (w.campaign && enemy) Object.assign(enemy, { archetype: (w.bossIndex >= 18 ? 'story-support' : w.bossIndex >= 12 ? 'chapter3-drone' : w.bossIndex < 3 ? ['weaver', 'wraith', 'ember'][w.bossIndex] : w.bossIndex === 3 ? (w.wave === 1 ? 'vial' : 'echo') : (w.wave === 0 ? 'denial' : 'guard')), action: 'enter', actionProgress: 0, lean: 0 });
    return enemy;
  }
  // Reinforcements reuse the current encounter's already-loaded ordinary
  // enemies. They enter visibly before their first attack and never exceed two.
  function summonBossAllies(w) {
    if (!w.campaign || w.finalPractice || w.bossIndex >= 12 || w.campaignRevision < 3 || !w.boss || w.boss.hp <= 0) return;
    var t = Math.round(w.phaseTime * 60);
    if (t < 240 || (t - 240) % 660 !== 0 || w.enemies.length > 0) return;
    var side = ((w.bossIndex + w.phase + Math.floor((t - 240) / 660)) % 2) ? -1 : 1;
    for (var i = 0; i < 2; i++) {
      var enemy = spawnEnemy(w, i ? 290 : 70, 'scout', i ? -side : side, i * .22);
      if (enemy) { enemy.summoned = true; if (w.bossIndex >= 4) enemy.archetype = i ? 'guard' : 'denial'; }
    }
    event(w, 'summon', '지원군 출현');
  }
  function startWave(w, wave) {
    if(identityEnabled(w))w._identityPlans=[];
    while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
    w._delays.length = 0; w._targetId = 0; w._shotReadyAt = w.tick;
    w.reservation = false; w._reservationSince = 0; w._starvationReported = false;
    if(w.campaignRevision===5&&w.bossIndex>=18){w.storyOutcome='';w.transitionSceneIds=null;}
    w.wave = wave; w.waveTime = 0; w.stageTime = 0; w.patternName = ['세 갈래의 기억', '교차하는 거미실', '회랑의 끝'][wave];
    w.stageLabel = '기억 회랑 · ' + (wave + 1) + '/3';
    campaignLabels(w);
    cacheCheckpoint(w); event(w, 'phase', w.stageLabel);
  }
  function waveSchedule(w) {
    if(w.campaign&&w.campaignRevision===5&&w.bossIndex>=18){storyWaveSchedule(w);return;}
    var elapsed = Math.round(w.waveTime * 60), wave = w.wave;
    // Single-location routes repeat ordinary-enemy beats for 45 seconds,
    // keeping the old location's index instead of inventing two new scenes.
    var t = w.waveDuration > 15 ? (elapsed < Math.round(w.waveDuration*60) ? elapsed % 900 : 900) : elapsed;
    if (t === 60 || t === 270 || t === 480) {
      var side = (t === 270 ? -1 : 1) * (wave % 2 ? -1 : 1);
      for (var i = 0; i < 3; i++) spawnEnemy(w, side > 0 ? 62 + i * 58 : 298 - i * 58, 'scout', side, i * 0.22);
    }
    if (wave >= 1 && (t === 150 || (wave === 2 && t === 390))) {
      spawnEnemy(w, 42, 'turret', 1); spawnEnemy(w, 318, 'turret', -1);
    }
    if (wave === 2 && (t === 210 || t === 510)) {
      // Opposite upper anchors cross above the lower dodge lanes. At y540 the
      // two width6 cores leave broad middle and outside routes on a360 field.
      warning(w, [
        { x: 28, y: 108, angle: Math.atan2(532, 272), kind: 'needle', color: '#9fdcff' },
        { x: 332, y: 108, angle: Math.atan2(532, -272), kind: 'needle', color: '#ecb0fa' }
      ], 60, '교차하는 검빛');
    }
    if (elapsed >= Math.round(w.waveDuration * 60) && !w.bullets.length && !w.hazards.length && !w.enemies.length && !w._warnings.length && !w._deferred.length && !w._delays.length) {
      if (wave < (w.campaign ? encounter(w).waves.length - 1 : 2)) startWave(w, wave + 1);
      else {
        w.stage = 'bossIntro'; w.stageTime = 0; w.boss = null;
        w.patternName = w.campaign ? encounter(w).name : '보라검천사'; w.stageLabel = w.campaign ? encounter(w).zone : '독립 기억 전투';
        campaignLabels(w);
        while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
        while (w.effects.length) remove(w, 'effects', w.effects.length - 1);
        event(w, 'phase', w.patternName);
      }
    }
  }
  function updateEnemies(w) {
    for (var i = w.enemies.length - 1; i >= 0; i--) {
      var e = w.enemies[i]; e.px = e.x; e.py = e.y; e.age += FIXED_DT;
      if (e.age < 0) continue;
      if (w.campaign) {
        var arrive = clamp(e.age / 1.2, 0, 1), ease = arrive * arrive * (3 - 2 * arrive);
        var anchorY = e.kind === 'turret' ? 112 : 154;
        if (e.age < 1.2) {
          e.x = e.baseX + Math.sin(arrive * Math.PI) * e.direction * 26;
          e.y = -24 + ease * (anchorY + 24); e.action = 'enter'; e.actionProgress = arrive;
        } else if (e.age < e.life - 1.2) {
          var beat = (e.age - 1.2) % 1.65;
          e.x = e.baseX + Math.sin((e.age - 1.2) * 1.7 + e.wobble) * (e.kind === 'turret' ? 9 : 30);
          e.y = anchorY + Math.sin(e.age * 2.1 + e.wobble) * 10;
          var chargeTime = e.kind === 'turret' && w.difficulty === 'gentle' ? 1.1 : .9;
          e.action = beat < chargeTime ? 'charge' : beat < chargeTime + .4 ? 'attack' : 'recover';
          e.actionProgress = beat / 1.65;
        } else { e.x += e.direction * 150 * FIXED_DT; e.y -= 35 * FIXED_DT; e.action = 'exit'; e.actionProgress = clamp((e.age - e.life + 1.2) / 1.2, 0, 1); }
        e.lean = clamp((e.x - e.px) / 2.5, -1, 1);
      } else if (e.age < 1) e.y = -24 + e.age * (e.kind === 'turret' ? 142 : 178);
      else if (e.age < e.life - 1.2) { e.y = (e.kind === 'turret' ? 118 : 154) + Math.sin(e.age * 1.5 + e.wobble) * 18; e.x = e.baseX + Math.sin(e.age * 0.9 + e.wobble) * (e.kind === 'turret' ? 12 : 38); }
      else e.x += e.direction * 150 * FIXED_DT;
      if (e.age >= e.life || e.x < -40 || e.x > W + 40) { w.stats.missedEnemies++; remove(w, 'enemies', i); continue; }
      var cadence = w.campaign || e.kind === 'turret' ? 1.65 : 1.5;
      var shootStart = w.campaign ? (e.kind === 'turret' ? 1.2 : 2.1) : .8;
      var shoot = Math.floor((e.age - shootStart) / cadence);
      if (e.age >= shootStart && e.age < e.life - 1.7 && shoot >= e.shotCursor && (e.summoned && w.stage === 'boss' || !e.summoned && waveCombatTime(w) < 10.2)) {
        e.shotCursor = shoot + 1;
        var a = Math.atan2(w.player.y - e.y, w.player.x - e.x);
        if (e.kind === 'turret') warning(w, fanSpecs(e.x, e.y, a, 3, 0.2, 110, 'needle', '#f5b5d3', e.id), 54, '겨냥 레이저');
        else emit(w, fanSpecs(e.x, e.y, a, w.wave === 0 ? 3 : 5, 0.22, 82 + w.wave * 8, 'orb', '#f1cae9', e.id));
      }
    }
  }
  function startBossPhase(w, phase, notify) {
    while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
    w.stage = 'boss'; w.stageTime = 0; w.waveTime = 0; w.phase = phase; w.phaseTime = 0; w.phaseProgress = 0;
    if (w.finalPractice) { w.transitionNarrative=null; w.transitionMinimum=0; if (phase===1) w.player.hp=w.player.maxHp; }
    w.patternName = NAMES[phase]; w.stageLabel = '보라검천사 · ' + (phase + 1) + '/3' + (w.practiceBoss ? ' · 연습' : '');
    w.boss = makeBoss(w, phase, ++w.idCounter);
    if(identityEnabled(w))w._identityPlans=[];
    if(w.campaignRevision===5&&encounter(w).combatKind==='final-authority'&&phase===2){w.player.hp=w.player.maxHp;w.player.egoUntil=w.tick+360;w.samongAwakened=true;event(w,'awakening','죽음 직전 현실 기억 회복 · 사몽 각성');}
    campaignLabels(w);
    w.nextPhase = null; w.transitionRemaining = 0; w._warnings.length = 0; w._delays.length = 0;
    w._targetId = 0; w._shotReadyAt = w.tick;
    w.reservation = false; w._reservationSince = 0; w._starvationReported = false;
    cacheCheckpoint(w);
    if (notify !== false) event(w, 'phase', w.patternName);
  }
  function skipBossIntro(w) {
    // A presentation skip cannot delete or teleport live danger, execute a
    // pending attack, or replay rewards. Boss practice already starts at phase0.
    if (!w || w.stage !== 'bossIntro' || w.bullets.length || w.hazards.length || w.enemies.length || w.shots.length || w._warnings.length || w._deferred.length || w._delays.length) return false;
    startBossPhase(w, 0);
    return true;
  }
  function freezeIntroTimers(w) {
    // The presentation clock advances, while remaining combat durations stay
    // fixed. Expired timers remain expired; no resources are earned or spent.
    Object.keys(w.skills).forEach(function (key) { if (w.skills[key] >= w.tick) w.skills[key]++; });
    ['invulnerableUntil', 'egoUntil'].forEach(function (key) { if (w.player[key] >= w.tick) w.player[key]++; });
    if (w._shotReadyAt >= w.tick) w._shotReadyAt++;
    if (w._lastGraze >= 0) w._lastGraze++;
  }
  function ring(w, count, speed, angle, gapAngle, gapHalf, kind, color) {
    var b = w.boss, specs = [];
    for (var i = 0; i < count; i++) {
      var a = angle + i * TAU / count, diff = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
      if (Math.abs(diff) < gapHalf) continue;
      specs.push({ x: b.x, y: b.y, angle: a, speed: speed, kind: kind || 'orb', color: color, ownerId: b.id });
    }
    emit(w, specs);
  }
  function campaignArc(w, x, y, count, angle, spread, speed, kind, color, gap, gapHalf, acceleration) {
    var specs = fanSpecs(x, y, angle, count, spread, speed, kind, color, w.boss.id);
    specs = specs.filter(function (s) { return gap === null || Math.abs(Math.atan2(Math.sin(s.angle - gap), Math.cos(s.angle - gap))) >= gapHalf; });
    if (acceleration) specs.forEach(function (s) { s.acceleration = acceleration; s.maxSpeed = 142; s.accelerateAt = .75; });
    emit(w, specs);
  }
  function signatureMark(w, specs, slot) {
    var id = CAMPAIGN_SIGNATURES[w.bossIndex].id;
    specs.forEach(function(s) { s.patternId = id; s.paletteSlot = slot || 0; });
    return specs;
  }
  function signatureArc(w, x, y, count, angle, spread, speed, kind, color, gapX, gapHalf, slot, accelerate) {
    var gap = Math.atan2(540 - y, gapX - x);
    var specs = fanSpecs(x, y, angle, count, spread, speed, kind, color, w.boss.id).filter(function(s) {
      return Math.abs(Math.atan2(Math.sin(s.angle-gap),Math.cos(s.angle-gap))) >= gapHalf;
    });
    if (accelerate) specs.forEach(function(s) { s.acceleration=accelerate; s.accelerateAt=1.15; s.maxSpeed=112; });
    emit(w,signatureMark(w,specs,slot));
  }
  function signatureRing(w, count, speed, angle, gapX, gapHalf, color, slot, accelerate) {
    var b=w.boss, gap=Math.atan2(540-b.y,gapX-b.x),specs=[];
    for(var i=0;i<count;i++) {
      var a=angle+i*TAU/count;
      if(Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)))<gapHalf)continue;
      var spec={x:b.x,y:b.y+12,angle:a,speed:speed,kind:'orb',color:color,ownerId:b.id};
      if(accelerate){spec.acceleration=accelerate;spec.accelerateAt=1.15;spec.maxSpeed=112;}
      specs.push(spec);
    }
    emit(w,signatureMark(w,specs,slot));
  }
  function campaignSignature(w, within, cycle) {
    var b=w.boss, down=Math.PI/2, pulse=within-108, attacking=within>=108&&within<264;
    var gapX=180+Math.sin(cycle*.8)*100;
    if(w.bossIndex===0) {
      // Paired wing origins weave independently. Their aperture is committed
      // to a scene-space lane, not continuously steered toward the player.
      if(within===54) {
        var a=Math.atan2(540-b.y,gapX-b.x);
        warning(w,signatureMark(w,[
          {x:b.x,y:b.y+8,angle:a-.42,width:6,color:'#b08adf',ownerId:b.id},
          {x:b.x,y:b.y+8,angle:a+.42,width:6,color:'#d8eaff',ownerId:b.id}
        ],0),66,w.patternName);
      }
      if(attacking&&pulse%36===0) {
        var turn=Math.sin(pulse*.024+cycle*.7)*.28;
        signatureArc(w,b.x-32,b.y+8,11,down+turn,.13,96,'needle','#b08adf',gapX,.20,0,0);
        signatureArc(w,b.x+32,b.y+8,11,down-turn,.13,86,'needle','#d8eaff',gapX,.20,1,0);
      }
    } else if(w.bossIndex===1) {
      // A slow afterimage accelerates only after 1.15s; a separated faster
      // echo makes the speed change legible without a dense bullet wall.
      if(attacking&&pulse%90===0) {
        signatureRing(w,24,42,Math.atan2(540-b.y,180-b.x)+pulse*.0005,gapX,.17,'#80c9a5',0,34);
        signatureRing(w,18,82,Math.atan2(540-b.y,180-b.x)+.09+pulse*.0005,gapX,.17,'#d9b86c',1,0);
      }
    } else if(w.bossIndex===2) {
      // Seven authored pillar positions, five rays: two adjacent lanes stay
      // open. The full 1.3s warning precedes every committed damaging ray.
      if(within===54) {
        var open=cycle%2?4:1, specs=[];
        for(var i=0;i<7;i++)if(i!==open&&i!==open+1)specs.push({x:36+i*48,y:100,angle:down,width:8,color:'#f79858',ownerId:b.id});
        warning(w,signatureMark(w,specs,0),78,w.patternName);
      }
      // Follow-up embers start after every pillar is harmless, including the
      // longer gentle warning. They do not fill the beam's recovery interval.
      if(within===186||within===240)signatureArc(w,b.x,b.y+12,15,down,.13,88,'orb','#ffe3a0',cycle%2?252:108,.22,1,0);
    } else if(w.bossIndex===3) {
      if(attacking&&pulse%52===0) {
        var beat=Math.floor(pulse/52),lead=beat%2?1:-1;
        // The lead changes sides on each beat. Paired gaps keep a mobile-sized
        // route while the different flight speeds reveal the alternating wings.
        signatureArc(w,b.x+lead*44,b.y+4,11,down+lead*.22,.13,94,'needle','#f0db9f',gapX,.21,0,0);
        signatureArc(w,b.x-lead*44,b.y+4,9,down-lead*.22,.15,72,'needle','#e4b2cc',gapX,.21,1,0);
      }
    } else {
      if(within===54) {
        // Side rays are fixed at creation and frame the constellation opening.
        warning(w,signatureMark(w,[
          {x:40,y:104,angle:Math.atan2(436,54),width:6,color:'#b2a1ed',ownerId:b.id},
          {x:320,y:104,angle:Math.atan2(436,-54),width:6,color:'#edca83',ownerId:b.id}
        ],0),78,w.patternName);
      }
      if(attacking&&pulse%54===0) {
        for(var point=0;point<5;point++) {
          var orbit=-Math.PI/2+point*TAU/5+cycle*.22;
          var ox=b.x+Math.cos(orbit)*38,oy=b.y+Math.sin(orbit)*22;
          signatureArc(w,ox,oy,7,down+Math.sin(orbit+pulse*.012)*.26,.16,76+point*3,'orb',point%2?'#edca83':'#b2a1ed',gapX,.22,point%2,0);
        }
      }
    }
  }
  // A committed # of two vertical and two horizontal rays. Its four lines
  // have the same warning and activation boundary; the empty cells are real
  // navigable space, and color selection belongs to the renderer's boss palette.
  // This replaces one ordinary attack cycle rather than stacking on top of it.
  function campaignGrid(w, within, cycle) {
    if (within !== 54) return;
    var b=w.boss, offset=((cycle+w.bossIndex)%3-1)*12;
    var left=108+offset,right=252+offset,upper=420+(w.bossIndex%3-1)*12,lower=540+(w.bossIndex%3-1)*12;
    var width=[12,10,14,10,12][w.bossIndex];
    var specs=[
      {x:left,y:0,angle:Math.PI/2,width:width,ownerId:b.id,paletteSlot:0},
      {x:right,y:0,angle:Math.PI/2,width:width,ownerId:b.id,paletteSlot:0},
      {x:0,y:upper,angle:0,width:width,ownerId:b.id,paletteSlot:1},
      {x:0,y:lower,angle:0,width:width,ownerId:b.id,paletteSlot:1}
    ];
    specs.forEach(function(s){s.patternId='boss-grid-v1';});
    warning(w,specs,96,'교차 광선 격자');
  }
  // These are original combat compositions fitted to each source character's
  // role. They do not reproduce named attacks or assets from another game.
  function sinMark(w, specs, slot) {
    var patternId=w.phase===2?signature(w).id:encounter(w).id+'-phase-'+(w.phase+1);
    specs.forEach(function(s){s.patternId=patternId;s.paletteSlot=slot||0;});
    return specs;
  }
  function sinFan(w,x,y,count,angle,spread,speed,gapX,gapHalf,slot,acceleration,radius) {
    var gap=Math.atan2(540-y,gapX-x),specs=fanSpecs(x,y,angle,count,spread,speed,'orb','#ffffff',w.boss.id).filter(function(s){return Math.abs(Math.atan2(Math.sin(s.angle-gap),Math.cos(s.angle-gap)))>=gapHalf;});
    specs.forEach(function(s){if(radius)s.r=radius;if(acceleration){s.acceleration=acceleration;s.accelerateAt=1.05;s.maxSpeed=128;}});
    emit(w,sinMark(w,specs,slot));
  }
  function sinRing(w,count,speed,angle,gapX,gapHalf,slot,acceleration,radius) {
    var b=w.boss,gap=Math.atan2(540-b.y,gapX-b.x),specs=[];
    for(var i=0;i<count;i++) {
      var a=angle+i*TAU/count;
      if(Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)))<gapHalf)continue;
      var s={x:b.x,y:b.y+12,angle:a,speed:speed,kind:'orb',color:'#ffffff',ownerId:b.id,r:radius||4.2};
      if(acceleration){s.acceleration=acceleration;s.accelerateAt=1.05;s.maxSpeed=128;}
      specs.push(s);
    }
    emit(w,sinMark(w,specs,slot));
  }
  function sinRays(w,specs,delay,slot) { warning(w,sinMark(w,specs,slot),delay,w.patternName); }
  function sinPattern(w,within,cycle) {
    var b=w.boss,id=encounter(w).id,down=Math.PI/2,pulse=within-108,attacking=within>=108&&within<264;
    var gapX=180+Math.sin(cycle*.74+w.bossIndex*.3)*74;
    b.weaponTelegraph=false;
    b.specialPatternId=w.phase===2?signature(w).id:id+'-phase-'+(w.phase+1);
    b.specialPatternLabel=encounter(w).patterns[w.phase];
    b.patternHint=w.phase===2?signature(w).hint:'예고된 길을 벗어나 탄환 사이의 틈을 읽으세요';
    if(id==='belphegor') {
      if(w.phase===0&&attacking&&pulse%66===0)sinRing(w,24,34,cycle*.16+pulse*.002,gapX,.26,0,36);
      if(w.phase===1) {
        if(within===54)sinRays(w,[{x:72,y:88,angle:down,width:9,ownerId:b.id},{x:288,y:88,angle:down,width:9,ownerId:b.id}],78,0);
        if(within===186||within===240)sinRing(w,22,72,cycle*.2,gapX,.30,1,0);
      }
      if(w.phase===2&&attacking&&pulse%54===0) {
        var beat=Math.floor(pulse/54);
        sinRing(w,26,36+beat*17,cycle*.17+beat*.06,gapX,.28,beat%2,beat===0?34:0);
      }
    } else if(id==='leviathan') {
      if(w.phase===0&&attacking&&pulse%54===0) {
        sinFan(w,b.x-40,b.y,9,down+.19,.14,78,gapX,.23,0,0);
        sinFan(w,b.x+40,b.y,9,down-.19,.14,96,gapX,.23,1,0);
      }
      if(w.phase===1) {
        if(within===54)sinRays(w,[{x:44,y:104,angle:1.20,width:7,ownerId:b.id},{x:316,y:104,angle:Math.PI-1.20,width:7,ownerId:b.id}],78,0);
        if(within===186||within===240)sinFan(w,b.x,b.y,17,down+Math.sin(cycle)*.2,.12,86,gapX,.27,1,0);
      }
      if(w.phase===2&&attacking&&pulse%48===0) {
        var mirror=Math.floor(pulse/48)%2?1:-1;
        sinFan(w,44,112,11,1.18+mirror*.1,.12,82,gapX,.26,0,0);
        sinFan(w,316,112,11,Math.PI-1.18-mirror*.1,.12,60,gapX,.26,1,24);
      }
    } else if(id==='beelzebub') {
      if(w.phase===0&&attacking&&pulse%72===0) {
        sinRing(w,18,52,cycle*.2,gapX,.33,0,0,6);
        sinRing(w,24,84,cycle*.2+.08,gapX,.33,1,0,4);
      }
      if(w.phase===1) {
        if(within===54) {
          var mouth=[];for(var lane=0;lane<5;lane++)if(lane!==(cycle%3+1))mouth.push({x:36+lane*72,y:96,angle:down,width:10,ownerId:b.id});
          sinRays(w,mouth,78,0);
        }
        if(within===192||within===246)sinFan(w,b.x,b.y+12,15,down,.14,84,gapX,.29,1,0,5);
      }
      if(w.phase===2&&attacking&&pulse%60===0) {
        sinRing(w,28,78,cycle*.19+pulse*.002,gapX,.33,0,0,5.5);
        sinRing(w,20,40,cycle*.19+.12+pulse*.002,gapX,.33,1,30,4);
      }
    } else if(id==='asmodeus') {
      if(w.phase===0&&attacking&&pulse%52===0) {
        var side=Math.floor(pulse/52)%2?1:-1;
        sinFan(w,b.x+side*42,b.y,11,down+side*.17,.13,90,gapX,.26,0,0);
        sinFan(w,b.x-side*42,b.y,9,down-side*.17,.15,68,gapX,.26,1,0);
      }
      if(w.phase===1) {
        if(within===54)sinRays(w,fanSpecs(b.x,b.y+12,Math.atan2(w.player.y-b.y,w.player.x-b.x),3,.36,0,'orb','#ffffff',b.id),78,0);
        if(within===192||within===246)sinRing(w,26,80,cycle*.18,gapX,.34,1,0);
      }
      if(w.phase===2) {
        if(within===54)sinRays(w,[{x:96,y:80,angle:down,width:8,ownerId:b.id},{x:264,y:80,angle:down,width:8,ownerId:b.id}],66,0);
        if(within===174||within===216||within===258) {
          var lead=Math.floor((within-174)/42)%2?1:-1;
          sinFan(w,b.x+lead*44,b.y,13,down+lead*.2,.12,88,gapX,.26,lead>0?0:1,0);
        }
      }
    } else if(id==='mammon') {
      if(w.phase===0&&attacking&&pulse%48===0)sinFan(w,b.x,b.y+14,11,down+Math.sin(pulse*.02)*.16,.18,102,gapX,.30,Math.floor(pulse/48)%2,0);
      if(w.phase===1) {
        if(within===54)sinRays(w,[{x:90,y:80,angle:down,width:9,ownerId:b.id},{x:270,y:80,angle:down,width:9,ownerId:b.id},{x:0,y:438,angle:0,width:8,ownerId:b.id}],96,0);
        if(within===210)sinRing(w,26,84,cycle*.18,gapX,.34,1,0);
      }
      if(w.phase===2&&attacking&&pulse%54===0) {
        sinFan(w,20,112,8,1.12+Math.sin(pulse*.012)*.09,.13,70,gapX,.28,0,23);
        sinFan(w,340,112,8,Math.PI-1.12-Math.sin(pulse*.012)*.09,.13,88,gapX,.28,1,0);
      }
    } else if(id==='wrath') {
      if(w.phase===0&&attacking&&pulse%72===0) {
        sinRing(w,24,96,cycle*.21+pulse*.002,gapX,.34,0,0);
        sinFan(w,b.x,b.y+14,11,down,.14,110,gapX,.29,1,0);
      }
      if(w.phase===1) {
        if(within===54)sinRays(w,fanSpecs(b.x,b.y,down,3,.50,0,'orb','#ffffff',b.id),78,0);
        if(within===186||within===240)sinFan(w,b.x,b.y+14,17,down+Math.sin(cycle)*.18,.12,98,gapX,.30,1,0);
      }
      if(w.phase===2&&attacking&&pulse%54===0) {
        var fireBeat=Math.floor(pulse/54);
        sinRing(w,28,86+fireBeat*10,cycle*.13+fireBeat*.07,gapX,.33,fireBeat%2,0);
      }
    } else if(id==='cult-leader') {
      // Adaptation of combined threats; no claim that the visual motifs or
      // patterns are literal frames from the text. Fixed announced corridors.
      if(within===54)sinRays(w,[{x:88,y:80,angle:down,width:9,ownerId:b.id},{x:272,y:80,angle:down,width:9,ownerId:b.id}],90,0);
      if(attacking&&pulse%54===0) {
        var beat=Math.floor(pulse/54),side=beat%2?1:-1;
        sinFan(w,b.x+side*24,b.y,11,down+side*.16,.14,78+12*w.phase,gapX,.33,beat%2,beat===0?20:0);
        if(w.phase>=1)sinFan(w,b.x-side*24,b.y,9,down-side*.16,.16,67+9*w.phase,gapX,.35,(beat+1)%2,0);
      }
    } else if(id==='pride') {
      if(w.phase===0&&attacking&&pulse%48===0) {
        sinFan(w,b.x-28,b.y,9,down+.20,.18,92,gapX,.30,0,0);
        sinFan(w,b.x+28,b.y,9,down-.20,.18,78,gapX,.30,1,0);
      }
      if(w.phase===1) {
        if(within===54)sinRays(w,[{x:52,y:88,angle:1.29,width:8,ownerId:b.id},{x:308,y:88,angle:Math.PI-1.29,width:8,ownerId:b.id},{x:0,y:414,angle:0,width:8,ownerId:b.id}],96,0);
        if(within===210||within===258)sinRing(w,30,84,cycle*.16,gapX,.34,1,0);
      }
      if(w.phase===2) {
        if(within===54)sinRays(w,[{x:84,y:80,angle:down,width:12,ownerId:b.id},{x:276,y:80,angle:down,width:12,ownerId:b.id},{x:0,y:390,angle:0,width:9,ownerId:b.id}],78,0);
        if(within===186||within===234)for(var node=0;node<3;node++)sinFan(w,72+node*108,104,7,down,.17,82+node*8,gapX,.30,node%2,0);
      }
    }
  }
  function campaignPatternBase(w) {
    var cycleTicks = w.difficulty === 'hell' ? 336 : 420;
    var b = w.boss, t = Math.round(w.phaseTime * 60) - 1, cycle = Math.floor(t / cycleTicks), rawWithin = t % cycleTicks;
    // The move lasts72 instead of54 ticks. Attack timing keeps its authored
    // logical ticks after that move, while the remainder is a longer recovery.
    var within = rawWithin < 72 ? Math.floor(rawWithin * 54 / 72) : rawWithin - 18;
    var anchors = [180, 112, 236, 156, 218], offset = w.phase + w.bossIndex;
    var destination = anchors[(cycle + offset) % anchors.length], origin = cycle ? anchors[(cycle - 1 + offset) % anchors.length] : 180;
    b.px = b.x; b.py = b.y;
    var move = clamp(rawWithin / 72, 0, 1), easing = move * move * (3 - 2 * move);
    b.x = origin + (destination - origin) * easing;
    b.y = 116 + Math.sin(move * Math.PI) * 16;
    b.lean = clamp((b.x - b.px) / 2.5, -1, 1);
    b.action = within < 54 ? 'move' : within < 108 ? 'charge' : within < 264 ? 'attack' : 'recover';
    b.actionProgress = within < 54 ? move : within < 108 ? (within - 54) / 54 : within < 264 ? (within - 108) / 156 : clamp((within - 264) / 138, 0, 1);
    var aimAt = Math.atan2(w.player.y - b.y, w.player.x - b.x), down = Math.PI / 2;
    var gap = down + Math.sin(cycle * 1.7 + w.phase) * .22;
    var attacking = within >= 108 && within < 264, pulse = within - 108;
    if (within === 54) effect(w, b.x, b.y, 'bossCharge', 25, w.bossIndex === 2 ? '#ffbb7e' : w.bossIndex === 1 ? '#8de0b7' : '#d1b2ff', .9);
    if(w.bossIndex>=5){sinPattern(w,within,cycle);return;}
    b.specialPatternId=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].id:'';
    b.specialPatternLabel=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].label:'';
    b.patternHint=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].hint:'';
    if(w.phase===2){b.weaponTelegraph=false;campaignSignature(w,within,cycle);return;}
    if(w.phase===1&&cycle%2===1){
      b.specialPatternId='boss-grid-v1';b.specialPatternLabel='교차 광선 격자';
      b.patternHint='가로와 세로 광선 사이의 빈 칸으로 이동하세요';
      b.weaponTelegraph=false;
      campaignGrid(w,within,cycle);return;
    }
    b.weaponTelegraph=w.phase===0&&cycle%2===0&&within>=54&&within<108;
    if (w.difficulty === 'hell' && w.phase === 0 && cycle % 2 === 0) {
      // A full second charge leads the relay. The first pair and this fan
      // are two legible beats, rather than an unannounced pile of projectiles.
      if (within === 162) effect(w,b.x,b.y,'bossCharge',25,'#d1b2ff',.9);
      if (within >= 162 && within < 216) { b.action='charge';b.actionProgress=(within-162)/54; }
      if (within === 216) {
        var relay = fanSpecs(b.x,b.y+16,down,9,.16,92,'orb','#d1b2ff',b.id).filter(function(s){return Math.abs(s.angle-down)>.20;});
        relay.forEach(function(s){s.patternId='hell-relay-v1';s.paletteSlot=1;});
        emit(w,relay);b.action='attack';b.actionProgress=0;
      }
    }
    // A telegraphed pair replaces the normal first volley, keeping the number
    // of damaging objects and collision work bounded during a large attack.
    if(w.difficulty!=='hell'&&Weapon.shouldThrow(w,within,cycle)){
      if(w.bullets.length+2<=CAPS.bullets)emit(w,Weapon.createPair(w,b,cycle));
      else{w.stats.poolPressure++;w.stats.droppedGroups++;}
      return;
    }
    if (w.bossIndex === 0) {
      if (w.phase === 0) {
        // Two rotating petals leave an authored aperture; there is no row of
        // parallel screen-wide bullets in this campaign revision.
        if (attacking && pulse % 36 === 0) {
          var turn = Math.sin((cycle * 156 + pulse) * .018) * .24;
          campaignArc(w, b.x - 18, b.y + 8, 13, down + turn, .115, 104, 'orb', '#d0b6ff', gap, .18, 0);
          campaignArc(w, b.x + 18, b.y + 8, 13, down - turn, .115, 88, 'orb', '#a9d9ff', gap, .18, 0);
        }
      } else if (w.phase === 1) {
        if (within === 54 || within === 150) warning(w, fanSpecs(b.x, b.y + 12, aimAt, 3, .25, 0, 'blade', '#ddb3ff', b.id), 54, w.patternName);
        if (attacking && pulse % 72 === 0) ring(w, 28, 94, cycle * .22 + pulse * .003, gap, .34, 'orb', '#bfaaff');
      }
    } else if (w.bossIndex === 1) {
      if (w.phase === 0) {
        if (attacking && pulse % 60 === 0) campaignArc(w, b.x, b.y + 16, 21, down + Math.sin(t * .009) * .2, .14, 60, 'orb', '#9de0b4', gap, .25, 18);
      } else if (w.phase === 1) {
        if (within === 54) {
          warning(w, [{ x: 46, y: 105, angle: Math.atan2(455, 180), ownerId: b.id, color: '#8fd6c0' },
            { x: 314, y: 105, angle: Math.atan2(455, -180), ownerId: b.id, color: '#cfbbe8' }], 66, w.patternName);
        }
        if (attacking && pulse % 48 === 0) {
          campaignArc(w, b.x - 45, b.y, 5, 1.08 + Math.sin(cycle + pulse * .01) * .16, .19, 91, 'orb', '#a6e3cb', null, 0, 0);
          campaignArc(w, b.x + 45, b.y, 5, 2.06 - Math.sin(cycle + pulse * .01) * .16, .19, 91, 'orb', '#d2b9e7', null, 0, 0);
        }
      }
    } else if (w.bossIndex === 2) {
      if (w.phase === 0) {
        if (within === 54 || within === 150) warning(w, fanSpecs(b.x + (within === 54 ? -32 : 32), b.y, aimAt, 3, .28, 0, 'blade', '#ffb393', b.id), 60, w.patternName);
        if (attacking && pulse % 54 === 0) campaignArc(w, b.x, b.y, 13, down + Math.sin(cycle + pulse * .007) * .22, .14, 102, 'blade', '#e6b4cb', gap, .32, 0);
      } else if (w.phase === 1) {
        if (attacking && pulse % 48 === 0) {
          campaignArc(w, b.x - 32, b.y, 13, down + .19 * Math.sin(t * .012), .16, 62, 'orb', '#ffb181', gap, .28, 23);
          campaignArc(w, b.x + 32, b.y, 9, down - .24 * Math.sin(t * .012), .19, 91, 'orb', '#f3d18e', gap, .28, 0);
        }
      }
    } else if (w.bossIndex === 3) {
      // Mirrored feather fans, followed by locked rays: aim is sampled only
      // at warning creation, and the recovery interval stays quiet.
      if (w.phase === 0 && attacking && pulse % 42 === 0) {
        campaignArc(w,b.x-36,b.y,9,down+.23*Math.sin(pulse*.018),.14,84,'needle','#f6e6b4',gap,.25,0);
        campaignArc(w,b.x+36,b.y,9,down-.23*Math.sin(pulse*.018),.14,84,'needle','#a9e1ee',gap,.25,0);
      }
      if (w.phase === 1) {
        if (within===54) warning(w,fanSpecs(b.x,b.y,aimAt,3,.32,0,'needle','#f5d4a0',b.id),72,w.patternName);
        if(attacking&&pulse%66===0) ring(w,32,82,cycle*.25,gap,.36,'orb','#f6e2aa');
      }
    } else {
      // The three signatures differ in geometry and rhythm, not only tint.
      if (w.phase===0 && attacking && pulse%30===0) {
        ring(w,30,72,cycle*.29+pulse*.008,gap,.35,'orb','#bfeaff');
      } else if (w.phase===1) {
        if(within===54) warning(w,[{x:52,y:112,angle:Math.atan2(430,210),ownerId:b.id,color:'#d5b8ff'},
          {x:308,y:112,angle:Math.atan2(430,-210),ownerId:b.id,color:'#ffd5b2'}],78,w.patternName);
        if(attacking&&pulse%48===0){
          campaignArc(w,b.x-42,b.y,8,1.18+Math.sin(pulse*.012)*.18,.16,90,'needle','#d2c0ff',gap,.28,0);
          campaignArc(w,b.x+42,b.y,8,Math.PI-1.18-Math.sin(pulse*.012)*.18,.16,90,'needle','#ffcfb2',gap,.28,0);
        }
      }
    }
  }
  // Each encounter changes the spacing, aim, cadence and movement of its
  // additional material. The safe laser corridor is still committed before
  // the rays appear. All times are fixed simulation ticks, not music timing.
  var HELL_PROFILES = [
    {beats:[108,138,174,216],count:9,spread:.16,aim:1,speed:150,curve:.12},
    {beats:[108,150,174,216],count:9,spread:.13,aim:.8,speed:150,accel:36},
    {beats:[108,132,180,216],count:7,spread:.22,aim:.65,speed:155},
    {beats:[108,144,168,216],count:9,spread:.18,aim:.7,speed:150,curve:-.12},
    {beats:[108,156,180,216],count:11,spread:.12,aim:.85,speed:150},
    {beats:[108,144,186,216],count:7,spread:.18,aim:.7,speed:150,pause:true},
    {beats:[108,150,180,216],count:9,spread:.16,aim:.65,speed:150,curve:.22},
    {beats:[108,138,186,216],count:9,spread:.18,aim:.9,speed:150,accel:30},
    {beats:[108,132,174,216],count:9,spread:.14,aim:.85,speed:150,curve:-.18},
    {beats:[108,156,180,216],count:7,spread:.21,aim:.8,speed:150,pause:true},
    {beats:[108,138,180,216],count:9,spread:.17,aim:1,speed:150,accel:22},
    {beats:[108,150,174,216],count:9,spread:.15,aim:.75,speed:150,curve:.14}
  ];
  var HELL_LANES = [
    [180,112,180,248], [112,180,248,180], [248,112,180,112],
    [112,248,112,180], [180,248,112,248], [248,180,112,180],
    [112,180,248,112], [180,112,248,112], [248,180,112,248],
    [180,248,180,112], [112,248,180,248], [248,112,248,180]
  ];
  function hellOverlap(w,within,cycle) {
    var b=w.boss,lane=w._hellProtectedLane;
    if(within===54) {
      var rays=[{x:lane.x-54,y:0,angle:Math.PI/2,width:10,ownerId:b.id,paletteSlot:0,patternId:'hell-overlap-lattice-v14'},
        {x:lane.x+54,y:0,angle:Math.PI/2,width:10,ownerId:b.id,paletteSlot:1,patternId:'hell-overlap-lattice-v14'}];
      if(warning(w,rays,108,'헬 · 동시 전개'))b.hellOverlap={revision:15,cycle:cycle,warningTick:w.tick,pairReleaseAt:w.tick+54,laserActiveAt:w.tick+108,laserFadeAt:w.tick+204,corridorX:lane.x,corridorHalfWidth:lane.halfWidth,pairReleaseTick:-1,fanReleaseTick:-1};
    }
    var cast=b.hellOverlap&&b.hellOverlap.cycle===cycle?b.hellOverlap:null;
    b.weaponTelegraph=!!(cast&&w.bossIndex<5&&within>=54&&within<108);
    b.rotorTelegraph=!!(cast&&w.bossIndex>=5&&within>=54&&within<108);
    if(cast&&within===108) {
      // Capacity pressure drops the complete warned pair. It is never queued
      // for an unannounced later frame, and no existing live threat is evicted.
      if(w.bullets.length+2<=CAPS.bullets) {
        if(emit(w,Weapon.createHellPair(w,b,cycle)))cast.pairReleaseTick=w.tick;
      } else {w.stats.poolPressure++;w.stats.droppedGroups++;}
    }
    // The actual owned signature's projectile geometry runs alongside each
    // phase's ordinary composition. Its duplicate rays are deliberately not
    // stacked over the new committed gate cast. Phase3 already runs it once.
    if(w.phase!==2) {
      var phase=w.phase;
      w._hellSignatureOnly=true;w.phase=2;
      try {if(w.bossIndex>=5)sinPattern(w,within,cycle);else campaignSignature(w,within,cycle);}
      finally {w.phase=phase;w._hellSignatureOnly=false;}
    }
    var profile=HELL_PROFILES[w.bossIndex],beat=profile.beats.indexOf(within);
    if(beat!==-1) {
      // Aim sampled at release: curved bullets follow a fixed authored arc,
      // never home in on the player's subsequent position.
      var aimAt=Math.atan2(w.player.y-b.y,w.player.x-b.x);
      var center=Math.PI/2+(aimAt-Math.PI/2)*profile.aim;
      var originX=b.x+((beat%2?1:-1)*(w.bossIndex%3)*8);
      var fan=fanSpecs(originX,b.y+14,center,profile.count,profile.spread,profile.speed,'orb','#ffffff',b.id);
      fan.forEach(function(s,i){s.patternId='hell-overlap-fan-v14';s.hellLayer='fan';s.paletteSlot=1;s._rhythmPrepared=true;
        if(profile.accel){s.acceleration=profile.accel;s.accelerateAt=.65;s.maxSpeed=160;}
        if(profile.curve){s.curveRate=profile.curve*(beat%2?-1:1);s.curveUntil=1.2;}
        if(profile.pause&&beat%2===1){s.pauseFrom=.55;s.pauseUntil=.85;}
      });
      if(emit(w,fan)&&cast)cast.fanReleaseTick=w.tick;
    }
    // The signature helper updates its own presentation metadata; restore the
    // real charge previews after it, without changing the real entity phase.
    b.weaponTelegraph=!!(cast&&w.bossIndex<5&&within>=54&&within<108);
    b.rotorTelegraph=!!(cast&&w.bossIndex>=5&&within>=54&&within<108);
    b.hellMechanicsRevision=15;
  }

  // The six encounters are stages of one controller system, not six new
  // persons. Damage resolves the highlighted repeat-command links; it never
  // deletes the child's memory, body, or the memory door itself.
  function chapterThreePattern(w) {
    // Do not inherit an earlier encounter's temporary HELL aperture. This
    // chapter commits its own rays and restored boundaries derive the same path.
    w._hellProtectedLane=null;
    var b=w.boss,scene=w.bossIndex-12,period=w.difficulty==='hell'?336:420;
    var t=Math.round(w.phaseTime*60)-1,cycle=Math.floor(t/period),within=t%period;
    var gapX=[116,180,244,180][(cycle+w.phase+scene)%4],down=Math.PI/2;
    b.px=b.x;b.py=b.y;b.x=180+Math.sin(cycle*.65+within*.008)*(scene===4?24:42);b.y=112+Math.sin(within*.012)*8;
    b.action=within<60?'move':within<126?'charge':within<282?'attack':'recover';
    b.actionProgress=within<60?within/60:within<126?(within-60)/66:within<282?(within-126)/156:(within-282)/(period-282);
    b.specialPatternId=signature(w).id;b.specialPatternLabel=signature(w).label;b.patternHint=signature(w).hint;
    b.targetSemantic='repeat-command-link';b.commandGapX=gapX;
    function tagged(specs,slot){return specs.map(function(s){s.patternId=signature(w).id;s.paletteSlot=slot||0;return s;});}
    if(within===60){
      var x1=gapX-52,x2=gapX+52,rays=[{x:x1,y:0,angle:down,width:8,ownerId:b.id},{x:x2,y:0,angle:down,width:8,ownerId:b.id}];
      if(scene===1||scene===3)rays=[{x:0,y:345,angle:0,width:8,ownerId:b.id},{x:0,y:435,angle:0,width:8,ownerId:b.id}];
      if(scene===4)rays=[{x:92,y:0,angle:down,width:9,ownerId:b.id},{x:268,y:0,angle:down,width:9,ownerId:b.id}];
      warning(w,tagged(rays,0),90,'반복 명령 예고');
    }
    var beat=w.difficulty==='hell'?42:54;
    if(within>=126&&within<282&&(within-126)%beat===0){
      var k=Math.floor((within-126)/beat),angle=down+Math.sin(cycle*.4+k*.3)*(scene===2?.18:.10);
      var gap=Math.atan2(540-b.y,gapX-b.x),count=scene===0?13:scene===4?17:15;
      var specs=fanSpecs(b.x,b.y+12,angle,count,.14,78+scene*5+w.phase*6,'needle','#b5c7dc',b.id).filter(function(s){return Math.abs(Math.atan2(Math.sin(s.angle-gap),Math.cos(s.angle-gap)))>.28;});
      if(scene===2||scene===5)specs.forEach(function(s){s.acceleration=18;s.accelerateAt=1.1;s.maxSpeed=125;});
      if(scene===1||scene===3)specs.forEach(function(s){s.curveRate=(k%2?1:-1)*.10;s.curveUntil=.8;});
      emit(w,tagged(specs,k%2));
      if(w.phase===2&&k%2===0){
        var ringSpecs=[];
        for(var i=0;i<22;i++){var a=cycle*.16+i*TAU/22;if(Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)))>.33)ringSpecs.push({x:b.x,y:b.y+12,angle:a,speed:66+scene*3,kind:'orb',ownerId:b.id});}
        emit(w,tagged(ringSpecs,1));
      }
    }
  }
  // Source-confirmed story configurations. The map props/people being freed
  // never enter the target list: the single target represents the named hostile
  // actor or the explicitly labelled malicious connection in that scene.
  function storyWaveSchedule(w) {
    var elapsed=Math.round(w.waveTime*60),wave=w.wave,info=encounter(w),pattern=signature(w).id+'-approach';
    w._hellProtectedLane=null;
    var gap=[108,180,252][(wave+w.bossIndex)%3];
    function tag(specs){specs.forEach(function(a){a.patternId=pattern;a.paletteSlot=wave%2;});return specs;}
    // kair01 visibly has six invasion beats across its three approach sections.
    var beats=info.primarySceneId==='kair01'?[90,450]:[120,420];
    if(beats.indexOf(elapsed)!==-1){
      var specs=[];
      for(var x=28;x<=332;x+=38)if(Math.abs(x-gap)>38)specs.push({x:x,y:40+(x%3)*12,angle:Math.PI/2,speed:72+wave*5,kind:wave===1?'blade':'needle',ownerId:0,ttl:7});
      emit(w,tag(specs));
      if(info.primarySceneId==='kair01'){w.defenseWaveNumber=wave*2+beats.indexOf(elapsed)+1;event(w,'defense-wave','침공 '+w.defenseWaveNumber+' / 6');}
    }
    if(wave===2&&elapsed===210){warning(w,tag([{x:gap-58,y:0,angle:Math.PI/2,width:7},{x:gap+58,y:0,angle:Math.PI/2,width:7}]),96,info.waves[wave]);}
    if(elapsed>=900&&!w.bullets.length&&!w.hazards.length&&!w.enemies.length&&!w._warnings.length&&!w._deferred.length&&!w._delays.length){
      if(wave<2)startWave(w,wave+1);
      else{w.stage='bossIntro';w.stageTime=0;w.boss=null;campaignLabels(w);w.patternName=info.name;w.stageLabel=info.zone;while(w.shots.length)remove(w,'shots',w.shots.length-1);while(w.effects.length)remove(w,'effects',w.effects.length-1);event(w,'phase',w.patternName);}
    }
  }
  function storyPattern(w) {
    var b=w.boss,info=encounter(w),scene=w.bossIndex-18,period=w.difficulty==='hell'?384:480;
    var t=Math.round(w.phaseTime*60)-1,cycle=Math.floor(t/period),within=t%period,down=Math.PI/2;
    var gapX=scene===1?(cycle%2?286:74):[108,180,252,180][(cycle+w.phase+scene)%4];
    w._hellProtectedLane=w.difficulty==='hell'?{x:gapX,halfWidth:24,cycle:cycle}:null;
    b.px=b.x;b.py=b.y;b.x=180+Math.sin(cycle*.6+within*.007)*(scene===15?0:scene===9||scene===14?12:34);b.y=scene===15?182:112+Math.sin(within*.012)*7;
    b.action=within<72?'move':within<144?'charge':within<336?'attack':'recover';
    b.actionProgress=within<72?within/72:within<144?(within-72)/72:within<336?(within-144)/192:(within-336)/(period-336);
    b.specialPatternId=signature(w).id;b.specialPatternLabel=info.patterns[w.phase];b.patternHint=signature(w).hint;b.commandGapX=gapX;
    b.targetSemantic=info.combatKind;b.rotorTelegraph=w.difficulty==='hell'&&w.phase===2&&within>=72&&within<144&&scene!==8&&scene!==10&&scene!==15;
    if(within===0){b.cycle=cycle;b.echoSamples=[];b.echoes=[];b.commandLinksRemaining=scene===9?6:undefined;}
    function tagged(specs,slot,actor){specs.forEach(function(s){s.patternId=signature(w).id;s.paletteSlot=slot||0;if(actor)s.sourceActorId=actor;});return specs;}
    function keepGap(specs,x,y,half){var aim=Math.atan2(540-y,gapX-x);return specs.filter(function(s){return Math.abs(Math.atan2(Math.sin(s.angle-aim),Math.cos(s.angle-aim)))>(half||.26);});}
    function fan(x,y,count,angle,spread,speed,kind,slot,mode,actor){
      var a=keepGap(fanSpecs(x,y,angle,count,spread,speed,kind||'needle','#ffffff',b.id),x,y,.25);
      a.forEach(function(s,i){if(mode==='accelerate'){s.acceleration=28;s.accelerateAt=.95;s.maxSpeed=140;}if(mode==='curve'){s.curveRate=(i%2?1:-1)*.13;s.curveUntil=1.1;}if(mode==='pause'){s.pauseFrom=.35;s.pauseUntil=1.15;}});
      emit(w,tagged(a,slot,actor));
    }
    function ringAt(x,y,count,speed,turn,slot,mode){
      var specs=[];for(var i=0;i<count;i++)specs.push({x:x,y:y,angle:turn+i*TAU/count,speed:speed,kind:scene===8?'blade':'orb',ownerId:b.id,ttl:6.4});
      specs=keepGap(specs,x,y,.31);specs.forEach(function(s){if(mode==='pause'){s.pauseFrom=.4;s.pauseUntil=1.35;}if(mode==='accelerate'){s.acceleration=24;s.accelerateAt=1.05;s.maxSpeed=135;}});emit(w,tagged(specs,slot));
    }
    function rays(specs,delay,slot,actor){
      // Even NORMAL retains a readable fixed lower aperture. Aim is sampled
      // once; paths are never secretly redirected after their warning starts.
      specs=specs.filter(function(s){return segmentPairDistanceSquared(s.x,s.y,s.x+Math.cos(s.angle)*680,s.y+Math.sin(s.angle)*680,gapX,450,gapX,614)>sq(27+(s.width||8)/2);});
      warning(w,tagged(specs,slot,actor),delay||90,b.specialPatternLabel);
    }
    function gate(xs,delay,slot){rays(xs.map(function(x){return{x:x,y:0,angle:down,width:8,ownerId:b.id};}),delay,slot);}
    var pulse=within-144,beat=w.difficulty==='hell'?42:60,attacking=within>=144&&within<336;
    // Each of the seventeen configurations has a different spatial/temporal
    // composition; the common rhythm only supplies move/charge/recovery.
    if(scene===0){
      if(within===72)gate([58,302],90,0);
      if(attacking&&pulse%beat===0){var side=Math.floor(pulse/beat)%2?1:-1;fan(180+side*84,105,9,down-side*.18,.16,78,'needle',side>0?0:1,'curve');if(w.phase===2)fan(180-side*84,80,7,down+side*.15,.18,59,'orb',side>0?1:0,'accelerate');}
    }else if(scene===1){
      if(within<72&&within%12===0)b.echoSamples.push({x:w.player.x,y:w.player.y});
      if(within===72){var echoes=[],locked=[];for(var j=0;j<6;j++){var origin={x:30+j*60,y:104+(j%2)*28},point=b.echoSamples[j]||{x:180,y:540};echoes.push({id:'fallen-echo-'+j,sourceActorId:'fallen-echo-'+j,x:origin.x,y:origin.y,targetX:point.x,targetY:point.y,warningAt:w.tick,activeAt:w.tick+96,chargeProgress:0,releaseTick:-1});locked.push({sourceActorId:'fallen-echo-'+j,x:origin.x,y:origin.y,angle:Math.atan2(point.y-origin.y,point.x-origin.x),width:7,ownerId:b.id});}b.echoes=echoes;b.shadowCopies=echoes;rays(locked,96,0);}
      if(b.shadowCopies)b.shadowCopies.forEach(function(copy){copy.chargeProgress=clamp((w.tick-copy.warningAt)/96,0,1);});
      if(attacking&&pulse%72===0)for(var j=0;j<(w.phase===2?6:3);j++)fan(30+j*(w.phase===2?60:150),88,5,down+(j%2?.13:-.13),.12,86,'blade',j%2,'accelerate');
    }else if(scene===2){
      if(within===72)gate([74,286],108,0);
      if(attacking&&pulse%72===0){ringAt(b.x,b.y,24,64,cycle*.12+pulse*.002,0,'pause');if(w.phase===2)ringAt(b.x,b.y,16,44,cycle*.12+.13,1,'accelerate');}
    }else if(scene===3){
      if(within===72)gate([gapX-62,gapX+62],90,0);
      if(attacking&&pulse%32===0){var invasion=Math.floor(pulse/32),x=42+(invasion%6)*55;fan(x,75,7,down,.18,83+invasion*3,'needle',invasion%2,w.phase===2?'accelerate':null);b.invasionBeat=invasion+1;}
    }else if(scene===4){
      if(within===72)gate([42,96,150,210,264,318],96,0);
      if(attacking&&pulse%beat===0){fan(b.x,b.y,17,down+Math.sin(cycle)*.12,.15,68,'needle',0,'accelerate');if(w.phase===2)fan(360-b.x,82,11,down-Math.sin(cycle)*.12,.20,89,'orb',1,'curve');}
    }else if(scene===5){
      if(within===72)gate(cycle%2?[52,160,268]:[92,200,308],84,0);
      if(within===180)gate(cycle%2?[92,200,308]:[52,160,268],96,1);
      if(attacking&&pulse%72===0){var side=Math.floor(pulse/72)%2?1:-1;fan(180+side*110,100,9,down-side*.20,.16,86,'blade',side>0?1:0,'curve');}
    }else if(scene===6){
      if(within===72)rays([{x:35,y:60,angle:1.37,width:9,ownerId:b.id},{x:325,y:60,angle:Math.PI-1.37,width:9,ownerId:b.id}],102,0);
      if(attacking&&pulse%beat===0){fan(30,100,8,1.25,.13,75,'needle',0,'curve');fan(330,100,8,Math.PI-1.25,.13,62,'needle',1,'curve');if(w.phase===2&&pulse%120===0)ringAt(b.x,b.y,18,68,cycle*.2,1,'accelerate');}
    }else if(scene===7){
      if(within===72)gate([gapX-60,gapX+60],108,0);
      if(attacking&&pulse%54===0){fan(b.x,b.y,13,down,.17,82,'needle',Math.floor(pulse/54)%2,'pause');if(w.phase===2)fan(b.x,b.y,9,down,.23,54,'blade',1,'accelerate');}
    }else if(scene===8){
      if(within===72)gate([52,308],108,0);
      if(attacking&&pulse%66===0){ringAt(b.x,b.y,26,69,cycle*.14+pulse*.002,0,null);if(w.phase===2)fan(36+(Math.floor(pulse/66)%2)*288,88,9,down,.18,58,'blade',1,'pause');}
      b.memoryShardsPreserved=true;
    }else if(scene===9){
      if(within===72)gate([36,94,152,208,266,324],96,0);
      if(attacking&&pulse%28===0&&pulse/28<6){var n=Math.floor(pulse/28);ringAt(56+n*50,100+(n%2)*14,14,54+n*5,cycle*.1+n*.15,n%2,w.phase===2?'accelerate':null);b.commandLinksRemaining=5-n;b.commandLinkReleaseTick=w.tick;}
    }else if(scene===10){
      if(within===72)gate([gapX-64,gapX+64],108,0);
      if(attacking&&pulse%90===0){ringAt(b.x,b.y,22,76,cycle*.15,0,'pause');if(w.phase===2)ringAt(b.x,b.y,16,42,cycle*.15+.11,1,'pause');}
      b.protectedActor='arbelia';b.targetSemantic='tampered-command-thread';
    }else if(scene===11){
      if(within===72)gate(w.phase===0?[72,288]:[42,106,254,318],96,0);
      if(attacking&&pulse%beat===0){fan(b.x,b.y,15,down+Math.sin(pulse*.015)*.16,.15,76,'needle',0,w.phase===0?'accelerate':'curve');if(w.phase>=1)fan(360-b.x,80,9,down,.22,57,'blade',1,'pause');if(w.phase===2&&pulse%84===0)ringAt(b.x,b.y,22,63,cycle*.17,1,'accelerate');}
      if(w.phase===2&&within===216){w.arbeliaSlowUntil=w.tick+72;b.arbeliaWindowUntil=w.arbeliaSlowUntil;event(w,'kairos-window','아르벨리아의 유예');}
      b.timeCompression=!!(w.phase===2&&within>=144&&within<216);
    }else if(scene===12){
      if(within===72)gate([70,290],96,0);
      if(attacking&&pulse%beat===0){var side=Math.floor(pulse/beat)%2?1:-1;fan(180+side*74,b.y,11,down-side*.16,.16,86,'blade',side>0?0:1,'curve');if(w.phase===2)fan(180-side*74,b.y,7,down+side*.15,.20,67,'needle',side>0?1:0,'accelerate');}
      b.allies=[{id:'lauren-fairy',x:70,y:255},{id:'lauren-shaman',x:290,y:255}];b.ownersChooseIndependently=true;
    }else if(scene===13){
      if(within===72)gate(w.phase===0?[68,292]:w.phase===1?[42,126,234,318]:[70,150,210,290],96,0);
      if(attacking&&pulse%72===0){ringAt(b.x,b.y,18+w.phase*4,65,cycle*.2+pulse*.002,0,'pause');if(w.phase===2)fan(b.x,b.y,11,down,.18,78,'needle',1,'curve');}
      b.guiltRecordsPreserved=true;b.scapegoatChosen=false;
    }else if(scene===14){
      if(within===72)rays([{x:24,y:40,angle:1.33,width:8,ownerId:b.id},{x:336,y:40,angle:Math.PI-1.33,width:8,ownerId:b.id}],108,0);
      if(attacking&&pulse%beat===0)for(var node=0;node<(w.phase===2?3:2);node++)fan(60+node*(w.phase===2?120:240),94,7,down,.19,63+node*11,'needle',node%2,'curve');
      b.boundEgosPreserved=true;
    }else if(scene===15){
      var first=b.participants[0],second=b.participants[1];
      first.action=within>=72&&within<144?'charge':within>=144&&within<264?'attack':'recover';first.actionProgress=within<144?clamp((within-72)/72,0,1):clamp((within-144)/120,0,1);
      second.action=within>=108&&within<180?'charge':within>=180&&within<300?'attack':'recover';second.actionProgress=within<180?clamp((within-108)/72,0,1):clamp((within-180)/120,0,1);
      if(within===72)rays([{x:first.x,y:first.y,angle:down-.40,width:8,ownerId:b.id},{x:first.x,y:first.y,angle:down+.40,width:8,ownerId:b.id}],90,0,first.id);
      if(within===108)rays([{x:0,y:350,angle:0,width:10,ownerId:b.id},{x:0,y:430,angle:0,width:10,ownerId:b.id}],96,1,second.id);
      if(within===144||within===216||within===288){var cross=[];for(var vertical=-4;vertical<=3;vertical++)cross.push({x:first.x,y:first.y+vertical*12,angle:down,speed:78,kind:'needle',ownerId:b.id,ttl:6.2});for(var arm=-2;arm<=2;arm++)if(arm)cross.push({x:first.x+arm*12,y:first.y+12,angle:down,speed:78,kind:'needle',ownerId:b.id,ttl:6.2});emit(w,tagged(cross,0,first.id));}
      if(within===180||within===252){fan(second.x,second.y,13,down,.16,78,'blade',1,'curve',second.id);if(w.phase===2)fan(first.x,first.y,9,down,.18,57,'orb',0,'accelerate',first.id);}
    }else if(scene===16){
      if(within===72)gate(w.phase===2?[44,104,256,316]:[82,278],108,0);
      if(attacking&&pulse%beat===0){var side=Math.floor(pulse/beat)%2?1:-1;fan(b.x+side*34,b.y,13,down+side*.17,.15,72+10*w.phase,'needle',0,'accelerate');if(w.phase>=1)fan(b.x-side*34,b.y,9,down-side*.17,.19,60+8*w.phase,'blade',1,'curve');if(w.phase===2&&pulse%84===0)ringAt(b.x,b.y,24,58,cycle*.18,1,'pause');}
      b.authorityDuel=w.phase===2;b.coreIntact=true;b.targetSemantic='cult-authority';
    }
    // Two own-material rotating casts are an additional HELL layer, not the
    // identity of the signature above. Their complete pair is preflighted.
    if(b.rotorTelegraph&&within===143&&w.bullets.length+2>CAPS.bullets){b.rotorTelegraph=false;w.stats.poolPressure++;w.stats.droppedGroups++;}
    if(w.difficulty==='hell'&&w.phase===2&&within===144&&scene!==8&&scene!==10&&scene!==15){
      if(w.bullets.length+2<=CAPS.bullets){var pair=Weapon.createHellPair(w,b,cycle);tagged(pair,1);emit(w,pair);}else{w.stats.poolPressure++;w.stats.droppedGroups++;}
    }
  }

  function campaignPattern(w) {
    if(w.bossIndex>=18&&!w.finalPractice){storyPattern(w);return;}
    if (w.bossIndex >= 12 && !w.finalPractice) { chapterThreePattern(w); return; }
    if(w.difficulty!=='hell'){campaignPatternBase(w);return;}
    var t=Math.round(w.phaseTime*60)-1,cycle=Math.floor(t/336),rawWithin=t%336;
    var within=rawWithin<72?Math.floor(rawWithin*54/72):rawWithin-18;
    // This aperture is fixed for the entire cycle and announced by its two
    // visible boundary rays. Existing rays are filtered only at creation so
    // none subsequently rotates, follows, teleports or changes hit geometry.
    var lanes=HELL_LANES[w.bossIndex];
    w._hellProtectedLane={x:lanes[(cycle+w.phase)%lanes.length],halfWidth:24,cycle:cycle};
    campaignPatternBase(w);
    hellOverlap(w,within,cycle);
  }

  // Revision21 pressure is a real, bounded collision layer. Wide source-art
  // ribbons occupy66/44 percent of the actual360x640 map while active. These
  // numbers are geometry targets during the announced pressure window, not
  // an assertion about windup, recovery or the union of future bullet paths.
  function pressureCoverageTarget(w,wave) {
    var target=w.difficulty==='hell'?PRESSURE_LIMITS.bossHellCoverage:w.difficulty==='gentle'?PRESSURE_LIMITS.bossGentleCoverage:PRESSURE_LIMITS.bossNormalCoverage;
    return target*(wave?PRESSURE_LIMITS.waveMultiplier:1);
  }
  function pressureCast(w,ownerId,cycle,wave) {
    var target=pressureCoverageTarget(w,wave),profile=(cycle+(w.bossIndex||0)+(wave?w.wave:w.phase))%3;
    var mode=['vertical','horizontal','lattice'][profile];
    var verticalCoverage=profile===1?0:profile===2?target*.55:target;
    var horizontalCoverage=profile===0?0:profile===2?(target-verticalCoverage)/(1-verticalCoverage):target;
    var gaps=[],horizontalGaps=[],specs=[];
    var id='pressure-'+(wave?'wave':'boss')+'-v21',activeTicks=wave?PRESSURE_LIMITS.waveActiveTicks:PRESSURE_LIMITS.bossActiveTicks;
    function bands(axis,coverage){
      var extent=axis==='x'?W:H,gap=extent*(1-coverage)/2;
      var shift=[-18,18,-6,10][(cycle+(w.bossIndex||0)+w.phase)%4];
      var first=axis==='x'?90:160,second=axis==='x'?270:520;
      first=clamp(first+shift,gap/2+2,extent-gap/2-2);
      second=clamp(second+shift,gap/2+2,extent-gap/2-2);
      var channel=[{x:axis==='x'?first:180,y:axis==='x'?480:first,halfWidth:gap/2},{x:axis==='x'?second:180,y:axis==='x'?480:second,halfWidth:gap/2}];
      var intervals=[[0,first-gap/2],[first+gap/2,second-gap/2],[second+gap/2,extent]];
      intervals.forEach(function(range,i){specs.push({x:axis==='x'?(range[0]+range[1])/2:0,y:axis==='x'?0:(range[0]+range[1])/2,angle:axis==='x'?Math.PI/2:0,width:range[1]-range[0],ownerId:ownerId,paletteSlot:i%2,patternId:id,pressureCurtain:true,activeTicks:activeTicks});});
      return channel;
    }
    if(verticalCoverage)gaps=bands('x',verticalCoverage);
    if(horizontalCoverage)horizontalGaps=bands('y',horizontalCoverage);
    var chosen=verticalCoverage?gaps[(cycle+(w.bossIndex||0))%2]:horizontalGaps[1];
    var lower=horizontalCoverage?horizontalGaps[1]:null;
    var route=profile===1?{x1:120,y1:lower.y,x2:240,y2:lower.y,halfWidth:Math.min(24,lower.halfWidth-6)}:
      {x1:chosen.x,y1:lower?Math.max(260,lower.y-lower.halfWidth+6):260,x2:chosen.x,y2:lower?Math.min(614,lower.y+lower.halfWidth-6):614,halfWidth:Math.min(24,chosen.halfWidth-6)};
    var warningTicks=PRESSURE_LIMITS.warningTicks+(w.difficulty==='gentle'?12:0);
    var plan={cycle:cycle,born:w.tick,activeAt:w.tick+warningTicks,fadeAt:w.tick+warningTicks+activeTicks,expireAt:w.tick+warningTicks+activeTicks+15,
      targetCoverage:target,profile:mode,verticalCoverage:verticalCoverage,horizontalCoverage:horizontalCoverage,gaps:gaps,horizontalGaps:horizontalGaps,route:route,routeX:chosen.x,routeY:lower?lower.y:null,routeHalfWidth:route.halfWidth,patternId:id};
    var previous=w._pressurePlan;w._pressurePlan=plan;
    if(!warning(w,specs,PRESSURE_LIMITS.warningTicks,wave?'진입로의 교차 압박':'겹쳐 닫히는 압박')){w._pressurePlan=previous;return null;}
    if(w.boss&&!wave)w.boss.combatPressure=plan;
    return plan;
  }
  function allowsCombatCopies(w) {
    if(w.finalPractice)return true;
    // Copies are attacks by an existing hostile actor, never new people or
    // duplicated protected memories/cores/command-line objects.
    return w.bossIndex<12||[18,19,20,29,30,33,34].indexOf(w.bossIndex)!==-1;
  }
  var PRESSURE_STYLES=['woven-petals','sinking-memory','sword-rain','mirror-feathers','orbit-faces','late-pulse','envy-crossflow','hungry-jaws','red-stage','vault-branches','fire-beats','seven-calculations','defense-relay','mercy-boundary','veto-trace','feedback-return','migration-gates','memory-separation','flute-turn','six-swords','insomnia-veil','defense-intercept','harvest-lower','upper-command','workshop-junction','neural-cable','memory-preserving','six-command-rings','release-thread','time-harvest','castle-ownership','causal-rewind','cult-network','two-circuit-casters','samong-authority'];
  function pressureStyle(w){return PRESSURE_STYLES[w.finalPractice?34:w.bossIndex]||'woven-petals';}
  function makeCombatCopies(w,kind,cycle) {
    var b=w.boss;if(!b||!allowsCombatCopies(w))return;
    b.combatCopies=[];
    for(var i=0;i<2;i++){
      var pair=b.participants&&b.participants[i],id='combat-copy-'+b.id+'-'+cycle+'-'+kind+'-'+i;
      var destination=kind==='illusion'?(i?312:48):(i?270:90);
      var c={id:id,sourceActorId:id,x:kind==='illusion'?b.x:destination,y:kind==='illusion'?b.y:166,px:b.x,py:b.y,originX:b.x,originY:b.y,destinationX:destination,
        artKey:b.artKey,born:w.tick,expireAt:w.tick+(kind==='clone'?PRESSURE_LIMITS.cloneTicks:PRESSURE_LIMITS.illusionTicks),action:'charge',actionProgress:0,releaseTick:-1,opacity:kind==='clone'?.62:.5,kind:kind};
      if(pair)c.modelActorId=pair.id;
      b.combatCopies.push(c);
    }
  }
  // Revision25 replaces the shared pressure fan with owned choreography. These
  // are gameplay motifs, not additional people or quotations from the canon.
  // The original encounter attacks, protected targets and endings stay intact.
  var IDENTITY_PROFILES=Object.freeze([
    ['wing-weave','needle',0],['bog-drag','orb',6],['sword-rake','blade',0],['feather-fork','needle',6],['constellation-orbit','orb',12],
    ['late-pulse','orb',18],['mirror-reflection','blade',6],['hungry-jaw','orb',12],null,['vault-branch','orb',6],['fire-fuse','orb',0],['calculation-column','needle',12],
    ['defense-relay','needle',0],['mercy-boundary','needle',12],['veto-packet','needle',6],['feedback-return','needle',12],['migration-fork','needle',6],['repeat-disconnect','needle',18],
    ['flute-phrase','needle',6],['six-swords','blade',12],['insomnia-veil','orb',18],['defense-intercept','needle',0],['harvest-tier','needle',6],['command-alternation','blade',12],
    ['furnace-junction','needle',6],['neural-packet','needle',12],['deletion-seal','blade',18],['six-command-rings','orb',6],['tampered-thread','needle',24],['time-hand','needle',6],
    ['castle-boundary','blade',12],['causal-lock','needle',18],['reverse-domination','needle',6],['circuit-duet','needle',12],['authority-fold','needle',0]
  ].map(function(p,index){return p&&Object.freeze({index:index,role:p[0],kind:p[1],cadenceAdd:p[2]});}));
  function identityProfile(w){return patternEnabled(w)?Patterns.profiles[w.finalPractice?34:w.bossIndex]:IDENTITY_PROFILES[w.finalPractice?34:w.bossIndex];}
  function identitySpecs(w,x,y,beat,copy,source){
    var p=identityProfile(w),index=p.index,hell=w.difficulty==='hell',count=hell?7:w.difficulty==='gentle'?3:5;
    var down=Math.PI/2,aimAt=Math.atan2(w.player.y-y,w.player.x-x),center=down+(aimAt-down)*.45;
    var baseSpeed=hell?146:94,role=p.role,kind=p.kind,specs=[],sideBeat=beat%2?1:-1;
    var second=index===33&&(source==='baek-ion'||copy&&copy.modelActorId==='baek-ion');
    if(index===33){role=second?'circuit-shield':'circuit-cross';kind=second?'blade':'needle';}
    if(index===34)role=['authority-fold','authority-stitch','authority-impact'][w.phase];
    for(var i=0;i<count;i++){
      var u=i-(count-1)/2,side=i%2?1:-1,rank=Math.floor(i/2),ox=x,oy=y,angle=center+u*.13,speed=baseSpeed;
      var acceleration=0,accelerateAt=1.05,maxSpeed=hell?218:148,pauseFrom=0,pauseUntil=0;
      // Every branch changes a visible origin, spacing or flight rhythm. All
      // headings remain straight after this commit; none homes or turns later.
      if(index===0){ox+=side*(22+rank*3);angle=down+side*(.16+rank*.075)+Math.sin(beat*.6)*.09;}
      else if(index===1){oy+=rank*9;angle=center+u*.10;speed*=.38;acceleration=hell?82:48;accelerateAt=1.25+rank*.07;}
      else if(index===2){ox+=u*12;oy-=Math.abs(u)*7;angle=center+u*.062;speed*=1+rank*.065;}
      else if(index===3){ox+=side*(30+rank*4);oy-=rank*5;angle=down+side*(.22+rank*.085)+sideBeat*.08;speed*=i%2?.78:1;}
      else if(index===4){var orbit=-Math.PI/2+i*TAU/count+beat*.28;ox+=Math.cos(orbit)*37;oy+=Math.sin(orbit)*20;angle=down+Math.cos(orbit)*.36;speed*=.78+rank*.06;}
      else if(index===5){angle=down+u*.17;speed*=.46;pauseFrom=.35;pauseUntil=1.15+rank*.08;acceleration=hell?76:44;accelerateAt=pauseUntil;}
      else if(index===6){ox+=side*42;angle=down+side*(.15+rank*.105)+sideBeat*.055;speed*=i%2?.70:1;acceleration=i%2?(hell?38:24):0;}
      else if(index===7){ox+=side*(38-rank*5);oy+=rank*6;angle=down+side*(.28+rank*.085);speed*=.66+rank*.12;}
      else if(index===9){ox+=side*(18+rank*12);angle=down+side*(.13+rank*.10);speed*=.68+rank*.12;acceleration=hell?38:24;accelerateAt=1.2;}
      else if(index===10){ox+=u*9;angle=down+u*.145+sideBeat*.08;speed*=.62+rank*.14;acceleration=hell?58:32;accelerateAt=.8+rank*.13;}
      else if(index===11){ox+=u*17;oy-=rank*8;angle=down+sideBeat*.13+u*.045;speed*=.84+(i%3)*.08;}
      else if(index===12){ox+=side*(24+rank*9);oy-=rank*10;angle=down+side*.21+sideBeat*.06;speed*=.78+(beat%3)*.09;}
      else if(index===13){ox+=side*(30+rank*12);angle=down+side*(.26+rank*.075);speed*=.70;pauseFrom=.5;pauseUntil=.95;}
      else if(index===14){ox+=u*10;angle=center+u*.12;speed*=.82;pauseFrom=.42;pauseUntil=.88+(beat%3)*.12;}
      else if(index===15){ox+=side*(18+rank*8);angle=down+side*(.20+rank*.09);speed*=i%2?.64:1;acceleration=i%2?(hell?54:32):0;accelerateAt=1.2;}
      else if(index===16){ox+=side*42;oy-=rank*6;angle=down+side*(.18+rank*.065)+sideBeat*.08;speed*=.84;}
      else if(index===17){ox+=u*13;angle=down+u*.105;speed*=.62;pauseFrom=.45;pauseUntil=.85+(i%2)*.3;acceleration=hell?46:28;accelerateAt=1.3;}
      else if(index===18){ox+=u*9;oy+=u*3;angle=down+Math.sin(beat*.8+u*.5)*.32;speed*=.79+rank*.055;}
      else if(index===19){ox+=u*14;oy-=rank*5;angle=down+sideBeat*.16+u*.035;speed*=1+rank*.055;}
      else if(index===20){ox+=u*9;angle=down+u*.16;speed*=.58;pauseFrom=.4;pauseUntil=1.10+rank*.06;}
      else if(index===21){if(!copy){ox=42+(beat%6)*55+u*4;oy=85;}angle=down+sideBeat*.14+u*.09;speed*=.82+(beat%6)*.035;}
      else if(index===22){oy-=rank*12;angle=down+u*.12;speed*=.44+rank*.08;acceleration=hell?58:34;accelerateAt=1.15+rank*.1;}
      else if(index===23){ox+=side*(24+rank*15);angle=down+sideBeat*.15+u*.025;speed*=i%2?.73:1;pauseFrom=i%2?.45:0;pauseUntil=i%2?1:0;}
      else if(index===24){if(!copy){ox=side>0?318-rank*5:42+rank*5;oy=108;}angle=down+side*(.21+rank*.06);speed*=.76+rank*.07;}
      else if(index===25){ox+=u*7;oy-=i*7;angle=center+u*.045;speed*=.79;pauseFrom=.38+(i%3)*.04;pauseUntil=.98+(i%3)*.06;}
      else if(index===26){var seal=i*TAU/count+beat*.19;ox+=Math.cos(seal)*31;oy+=Math.sin(seal)*14;angle=down+Math.cos(seal)*.25;speed*=.68;pauseFrom=.5;pauseUntil=1.16;}
      else if(index===27){var command=(beat%6),triplet=command%3;ox+=(triplet-1)*23;oy-=(command>=3?12:0);angle=down+u*.16+(triplet-1)*.06;speed*=.70+command*.045;}
      else if(index===28){ox+=side*(12+rank*4);oy-=rank*9;angle=down+u*.09;speed*=.50;pauseFrom=.4;pauseUntil=1.4;}
      else if(index===29){var hand=-Math.PI/2+(beat%6)*Math.PI/3;ox+=Math.cos(hand)*33+u*4;oy+=Math.sin(hand)*18;angle=down+u*.105+Math.cos(hand)*.17;speed*=i%2?.64:1;pauseFrom=i%2?.42:0;pauseUntil=i%2?.94:0;}
      else if(index===30){ox+=side*(32+rank*5);angle=down+side*(.18+rank*.07);speed*=side===sideBeat?1:.70;acceleration=side===sideBeat?0:(hell?34:20);accelerateAt=1.2;}
      else if(index===31){ox+=u*11;angle=down+u*.115;speed*=.75;pauseFrom=.35;pauseUntil=.75+(beat%3)*.2;}
      else if(index===32){ox+=((2-beat%3)-1)*26+u*4;angle=down+u*.115+((2-beat%3)-1)*.08;speed*=.68+(beat%3)*.12;}
      else if(index===33){if(second){ox+=u*13;angle=down+u*.09;speed*=.78;pauseFrom=.4;pauseUntil=.95;}else{ox+=i<Math.ceil(count/2)?0:u*10;oy-=i<Math.ceil(count/2)?i*9:0;angle=down+u*.055;speed*=.88;}}
      else if(index===34){if(w.phase===0){ox+=side*(36+rank*3);angle=down+side*(.20+rank*.075);speed*=.86;}else if(w.phase===1){ox+=u*9;oy-=rank*11;angle=center+u*.08;speed*=.62;pauseFrom=.4;pauseUntil=1.05+(i%2)*.16;}else{ox+=side*(24+rank*5);angle=down+side*(.15+rank*.10);speed*=.64+rank*.08;acceleration=hell?68:40;accelerateAt=.9;}}
      var s={x:ox,y:oy,angle:angle,speed:speed,r:kind==='blade'?4:kind==='needle'?3:3.8,kind:kind,color:'#ffffff',ownerId:w.boss.id,ttl:5.5,patternId:'identity-'+pressureStyle(w)+'-v25',paletteSlot:(beat+(copy?1:0))%2,identityRole:role,_rhythmPrepared:true,_hellPrepared:true};
      if(acceleration){s.acceleration=acceleration;s.accelerateAt=accelerateAt;s.maxSpeed=maxSpeed;}
      if(pauseUntil){s.pauseFrom=pauseFrom;s.pauseUntil=pauseUntil;}
      if(source)s.sourceActorId=source;if(copy&&copy.modelActorId)s.modelActorId=copy.modelActorId;
      specs.push(s);
    }
    return specs;
  }
  function scheduleIdentityFan(w,x,y,source,beat,copy){
    var b=w.boss;if(!b)return;
    if(!w._identityPlans)w._identityPlans=[];
    // Four simultaneous warnings fit even the lowest source-preview budget.
    if(w._identityPlans.length>=4){w.stats.poolPressure++;w.stats.droppedGroups++;return;}
    if(!source&&b.participants){var actor=b.participants[beat%b.participants.length];source=actor.id;x=actor.x;y=actor.y;}
    var specs=patternEnabled(w)?Patterns.makeVolley(w,{x:x,y:y,sourceActorId:source,modelActorId:copy&&copy.modelActorId},beat,{copy:!!copy,phase:w.phase}):identitySpecs(w,x,y,beat,copy,source),route=w._pressurePlan&&w.tick<w._pressurePlan.expireAt?w._pressurePlan.route:null;
    if(route)specs=specs.filter(function(s){
      var extra=s.r+(s.kind==='blade'?13:s.kind==='needle'?9:0)+3;
      return segmentPairDistanceSquared(s.x,s.y,s.x+Math.cos(s.angle)*1600,s.y+Math.sin(s.angle)*1600,route.x1,route.y1,route.x2,route.y2)>sq(route.halfWidth+extra);
    });
    if(!specs.length)return;
    var activeAt=w.tick+54,id='identity-'+b.id+'-'+w.tick+'-'+(source||'boss')+'-'+beat;
    var cast={id:id,patternId:specs[0].patternId,identityRole:specs[0].identityRole,kind:specs[0].kind,sourcePhase:w.phase,x:x,y:y,angle:specs.reduce(function(sum,s){return sum+s.angle;},0)/specs.length,warningAt:w.tick,activeAt:activeAt,expireAt:activeAt+12};
    if(patternEnabled(w)){
      cast.v27Pattern=specs[0].v27Pattern;cast.v27Motion=specs[0].v27Motion;
      cast.emissionOrigins=Object.freeze(specs.map(function(s){return Object.freeze({x:s.x,y:s.y,angle:s.angle,v27Motion:s.v27Motion,r:s.r,kind:s.kind});}));
    }
    // Academy turrets and workshop pipes emit away from the boss. Keep their
    // filtered, committed shot origins for presentation rather than warning at
    // the unrelated boss centre. These records never participate in physics.
    if(!patternEnabled(w)&&!copy&&(w.bossIndex===21||w.bossIndex===24))cast.emissionOrigins=Object.freeze(specs.map(function(s){return Object.freeze({x:s.x,y:s.y,angle:s.angle});}));
    if(source)cast.sourceActorId=source;if(copy&&copy.modelActorId)cast.modelActorId=copy.modelActorId;
    // The v25 straight-ray layer can promise a complete open route. V27
    // explicitly turns/reflects later, so its initial-ray filter is not a
    // promise about all future positions of a dynamic projectile.
    if(route&&!patternEnabled(w))cast.escapeRoute=copyRoute(route);
    specs.forEach(function(s){s.identityCastId=id;s.identityWarningAt=w.tick;s.identityActiveAt=activeAt;});
    // HELL speed and heading are authored at warning time. No later random
    // rotation or rhythm preparation can change the announced committed path.
    specs._hellPrepared=true;
    w._identityPlans.push({cast:cast,specs:specs});
    if(!b.identityCasts)b.identityCasts=[];b.identityCasts.push(cast);if(b.identityCasts.length>8)b.identityCasts.shift();
  }
  function copyRoute(route){return{x1:route.x1,y1:route.y1,x2:route.x2,y2:route.y2,halfWidth:route.halfWidth};}
  function flushIdentityFans(w){
    var b=w.boss;if(!b)return;
    if(b.identityCasts)b.identityCasts=b.identityCasts.filter(function(c){return w.tick<c.expireAt;});
    var plans=w._identityPlans||[];
    for(var i=plans.length-1;i>=0;i--){var p=plans[i];if(w.tick<p.cast.activeAt)continue;
      plans.splice(i,1);
      // A warned volley either releases at its committed tick or is cancelled
      // as one group. Capacity cannot silently turn it into a delayed attack.
      if(w.tick!==p.cast.activeAt||w.bullets.length+p.specs.length>CAPS.bullets){p.cast.cancelled=true;w.stats.poolPressure++;w.stats.droppedGroups++;continue;}
      if(emit(w,p.specs))p.cast.releaseTick=w.tick;else p.cast.cancelled=true;
    }
  }
  function pressureFan(w,x,y,source,beat,copy) {
    var b=w.boss,hell=w.difficulty==='hell',index=w.finalPractice?34:w.bossIndex,style=index%7;
    var aimAt=Math.atan2(w.player.y-y,w.player.x-x),count=hell?7:w.difficulty==='gentle'?3:5,spread=hell?.115:.15;
    var kind=style===2||style===6?'blade':style===3||style===5?'needle':'orb';
    var center=style===0?Math.PI/2+Math.sin(beat*.7+index)*.32:aimAt;
    var specs=fanSpecs(x,y,center,count,spread,hell?100:88,kind,'#ffffff',b.id);
    specs.forEach(function(s,i){
      s.patternId='pressure-'+pressureStyle(w)+'-v21';s.paletteSlot=(beat+(copy?1:0))%2;s._rhythmPrepared=true;s.ttl=5.5;
      if(source)s.sourceActorId=source;if(copy&&copy.modelActorId)s.modelActorId=copy.modelActorId;
      if(style===1||style===4){s.speed*=.56;s.acceleration=hell?70:45;s.accelerateAt=.75;s.maxSpeed=hell?205:145;}
      if(style===2||style===6){s.curveRate=(i%2?1:-1)*(style===2?.20:.13);s.curveUntil=.95;}
      if(style===5){s.pauseFrom=.40;s.pauseUntil=.76;}
    });
    emit(w,specs);
  }
  function updateCombatCopies(w) {
    var b=w.boss;if(!b||!b.combatCopies)return;
    for(var i=b.combatCopies.length-1;i>=0;i--){
      var c=b.combatCopies[i],age=w.tick-c.born;
      if(w.tick>=c.expireAt){b.combatCopies.splice(i,1);continue;}
      c.px=c.x;c.py=c.y;
      if(c.kind==='illusion'){
        var move=clamp(age/60,0,1),ease=move*move*(3-2*move);
        c.x=c.originX+(c.destinationX-c.originX)*ease;c.y=c.originY+(188-c.originY)*ease;
        c.action=age<72?'charge':age<84?'attack':'recover';c.actionProgress=clamp(age/72,0,1);
        if(identityEnabled(w)){if(age===18)scheduleIdentityFan(w,c.destinationX,188,c.sourceActorId,i,c);}else if(age===72)pressureFan(w,c.x,c.y,c.sourceActorId,i,c);
      }else{
        var cadence=w.difficulty==='hell'?60:w.difficulty==='gentle'?120:90,first=(identityEnabled(w)?72:42)+i*18;
        c.action=age<first?'charge':(age-first)%cadence<12?'attack':'recover';c.actionProgress=age<first?age/first:((age-first)%cadence)/cadence;
        if(identityEnabled(w)){if(age>=first-54&&(age-first+54)%cadence===0&&w.tick+54<c.expireAt-18)scheduleIdentityFan(w,c.x,c.y,c.sourceActorId,Math.floor((age-first+54)/cadence)+i,c);}
        else if(age>=first&&(age-first)%cadence===0&&w.tick<c.expireAt-18)pressureFan(w,c.x,c.y,c.sourceActorId,Math.floor((age-first)/cadence)+i,c);
      }
    }
  }
  function bossPressure(w) {
    if(!pressureEnabled(w)||!w.campaign||!w.boss)return;
    var t=Math.round(w.phaseTime*60)-1,cycle=Math.floor(t/PRESSURE_LIMITS.cycleTicks),within=t%PRESSURE_LIMITS.cycleTicks,b=w.boss;
    b.pressureStyle=pressureStyle(w);
    if(identityEnabled(w))flushIdentityFans(w);
    if(within===30)makeCombatCopies(w,'illusion',cycle);
    if(within===150)makeCombatCopies(w,'clone',cycle);
    updateCombatCopies(w);
    // An actor's own signature continues between these pressure beats. The
    // additional beat varies its geometry, acceleration and phase by owner.
    if(identityEnabled(w)){
      var p=identityProfile(w),identityCadence=(w.difficulty==='hell'?42+(w.bossIndex%3)*6:w.difficulty==='gentle'?114+(w.bossIndex%3)*6:78+(w.bossIndex%3)*6)+p.cadenceAdd;
      if(within>=96&&within<456&&(within-96)%identityCadence===0)scheduleIdentityFan(w,b.x,b.y+18,null,Math.floor((within-96)/identityCadence),null);
      return;
    }
    if(within>=150&&within<510){
      var cadence=w.difficulty==='hell'?42+(w.bossIndex%3)*6:w.difficulty==='gentle'?114+(w.bossIndex%3)*6:78+(w.bossIndex%3)*6;
      if((within-150)%cadence===0)pressureFan(w,b.x,b.y+18,null,Math.floor((within-150)/cadence),null);
    }
  }
  function wavePressure(w) {
    if(!pressureEnabled(w)||!w.campaign||w.stage!=='waves')return;
    var t=Math.round(waveCombatTime(w)*60),actor=w.enemies.find(function(e){return e.age>=1.2&&e.y>=0&&e.y<230;});
    // Later story approaches already emit hostile command/shard material
    // directly instead of inventing ordinary people as enemies. Those real
    // existing attacks may cast the same lower-pressure field with owner0.
    var commandApproach=w.bossIndex>=18&&w.bullets.length>0;
    if((actor||commandApproach)&&(t===150||t===480))pressureCast(w,actor?actor.id:0,Math.floor(w.waveTime/15)*2+(t===480?1:0),true);
  }
  // Diagnostics only; never called by the60Hz loop. Union is instantaneous
  // collision geometry, excludes warnings/fades and does not inflate for the
  // player hit radius. Independent QA uses a separately implemented raster.
  function attackCoverage(w,options) {
    options=options||{};var step=clamp(Math.floor(options.step||8),2,32),region=options.region||[0,0,W,H],n=0,hit=0;
    var live=w.hazards.filter(function(h){return h.phase==='active';});
    for(var y=region[1]+step/2;y<region[1]+region[3];y+=step)for(var x=region[0]+step/2;x<region[0]+region[2];x+=step){
      n++;var covered=live.some(function(h){return segmentDistanceSquared(x,y,h.x1,h.y1,h.x2,h.y2)<=sq(h.width/2);});
      if(!covered)covered=w.bullets.some(function(b){if(b.retiring)return false;var l=b.halfLength||0,dx=Math.cos(b.angle||0)*l,dy=Math.sin(b.angle||0)*l;return segmentDistanceSquared(x,y,b.x-dx,b.y-dy,b.x+dx,b.y+dy)<=sq(b.r);});
      if(covered)hit++;
    }
    return{ratio:n?hit/n:0,coveredCells:hit,totalCells:n,step:step,region:region.slice(),measure:'instantaneous-active-collision-union'};
  }
  function bossPattern(w) {
    if (w.campaign) {
      // Commit this cycle's gate before an authored signature can warn on the
      // same tick (chapter3's first cast is exactly logicaltick60). No already
      // announced path is removed or redirected after its warning has begun.
      if(pressureEnabled(w)&&(Math.round(w.phaseTime*60)-1)%PRESSURE_LIMITS.cycleTicks===60)pressureCast(w,w.boss.id,Math.floor((Math.round(w.phaseTime*60)-1)/PRESSURE_LIMITS.cycleTicks),false);
      campaignPattern(w); bossPressure(w); return;
    }
    var b = w.boss, t = Math.round(w.phaseTime * 60) - 1, cycle, within, gap, specs, i, a;
    b.px = b.x; b.py = b.y;
    b.x = 180 + Math.sin(w.phaseTime * 0.6) * (w.phase === 1 ? 58 : 38);
    b.y = 116 + Math.sin(w.phaseTime * 0.9) * 12;
    if (w.phase === 0) {
      cycle = Math.floor(t / 360); within = t % 360; gap = [180, 108, 252, 180][cycle % 4];
      if (within < 240 && within % 24 === 0) {
        specs = [];
        for (i = 0; i < 21; i++) { var x = 20 + i * 16; if (Math.abs(x - gap) > 35) specs.push({ x: x, y: 66 + (i % 2) * 8, angle: Math.PI / 2, speed: 112, kind: 'needle', color: i % 2 ? '#c4acff' : '#f0d9ff', ownerId: b.id }); }
        emit(w, specs);
        if (within === 0) effect(w, gap, 82, 'ring', 29, '#99e6ff', 0.65);
      }
      if (within === 90 || within === 180) warning(w, fanSpecs(b.x, b.y + 12, Math.atan2(w.player.y - b.y, w.player.x - b.x), 3, 0.22, 123, 'orb', '#f0b7e7', b.id), 54, '기억의 광선');
    } else if (w.phase === 1) {
      cycle = Math.floor(t / 330); within = t % 330;
      if (within === 0 || within === 96 || within === 192) {
        var side = within === 96 ? -1 : 1, ox = b.x + side * 40, oy = b.y + 12;
        a = Math.atan2(w.player.y - oy, w.player.x - ox);
        warning(w, fanSpecs(ox, oy, a, 5, 0.2, 146, 'blade', '#eab3ff', b.id), 54, '보라검의 각인');
      }
      if (t % 64 === 0) ring(w, 36, 92 + (cycle % 2) * 8, t * 0.0019, Math.PI / 2 + Math.sin(cycle) * 0.42, 0.28, 'orb', '#bca7fa');
    } else {
      cycle = Math.floor(t / 300); within = t % 300;
      if (within < 225 && within % 14 === 0 && Math.floor(within / 14) % 6 < 4) {
        specs = [];
        for (i = 0; i < 5; i++) {
          var lean = Math.sin(t * 0.012) * 0.16;
          specs.push({ x: 16, y: 92, angle: 0.78 + i * 0.08 + lean, speed: 112, kind: 'orb', color: '#d9b7f7', ownerId: b.id });
          specs.push({ x: 344, y: 92, angle: Math.PI - 0.78 - i * 0.08 + lean, speed: 112, kind: 'orb', color: '#9dceff', ownerId: b.id });
        }
        emit(w, specs);
      }
      if (within === 30 || within === 150) ring(w, 42, 108, cycle * 0.17, Math.atan2(560 - b.y, (cycle % 2 ? 108 : 252) - b.x), 0.32, 'needle', '#e7d5ff');
      if (within === 240) warning(w, fanSpecs(b.x, b.y, Math.atan2(w.player.y - b.y, w.player.x - b.x), 5, 0.22, 142, 'blade', '#f6b4db', b.id), 60, '날개의 매듭');
    }
  }
  function hurt(w) {
    var p = w.player;
    if (w.tick < p.invulnerableUntil || w.stage === 'won' || w.stage === 'lost' || w.stage === 'bossIntro') return false;
    p.hp--; p.invulnerableUntil = w.tick + 66; w.stats.hits++;
    event(w, 'hurt'); effect(w, p.x, p.y, 'hit', 16, '#ffd0da', 0.35);
    if (p.hp <= 0) { w.stage = 'lost'; w.resultReason = '기억이 흐려졌습니다'; event(w, 'lose', w.resultReason); }
    return true;
  }
  function hitTarget(w, e, damage, memory) {
    if (e.hp <= 0) return;
    var actual = Math.min(damage, e.hp);
    e.hp -= actual; w.stats.damage += actual; if (e.isBoss) w.stats.bossDamage += actual;
    // A short, throttled reaction uses existing hit artwork. Presentation
    // fields never alter the attack clock, geometry or damage calculation.
    if (w.campaign && e.isBoss && w.tick >= (e.hitFlashReadyAt || 0)) {
      e.hitUntil = w.tick + 4; e.hitFlashReadyAt = w.tick + 18;
    }
    if (memory) gainMemory(w, 2);
    if (e.hp > 0) return;
    if (!e.linkTarget) effect(w, e.x, e.y, 'kill', e.isBoss ? 45 : 23, '#d9c4ff', 0.6);
    if (e.isBoss) {
      if(identityEnabled(w)){w._identityPlans=[];if(e.identityCasts)e.identityCasts.forEach(function(c){if(w.tick<c.activeAt)c.cancelled=true;});}
      if (e.sealTarget) event(w,'seal',e.name);
      if (e.linkTarget) event(w,w.campaignRevision===5&&encounter(w).chapter>=4&&(encounter(w).combatKind==='foe'||e.scriptedFall)?(e.scriptedFall?'hold':'subdue'):'disconnect',w.campaignRevision===5&&encounter(w).chapter>=4?encounter(w).healthLabel:'반복 연결 차단');
      w.stats.phaseTicks.push(Math.round(w.phaseTime * 60));
      if (w.phase === 2 && w.campaign && !w.practiceBoss && w.bossIndex < campaignBossCount(w.campaignRevision)-1) {
        w.stage = 'transition'; w.stageTime = 0; w.nextPhase = null; w.nextEncounter = w.bossIndex + 1;
        w.transitionRemaining = 6.4; w.stageLabel = '남은 탄막을 지나 다음 기억으로';
        if (w.campaignRevision >= 3 && w.bossIndex === 4) {
          w.transitionNarrative = PRIEST_BRIDGE.slice(); w.transitionMinimum = 15;
          w.stageLabel = '병원에서 의목사의 첫 임무로';
        }
        if (w.campaignRevision >= 4 && w.bossIndex === 11) { w.transitionNarrative = ['미카엘라는 귀환 경보를 듣고 캡슐로 달려간다. 열린 캡슐 안은 비어 있다.', '의목사 A의 마지막 신호 옆에는 정체를 알 수 없는 아이의 기억 신호가 남아 있다.', '의목사 B는 사라진 A를 찾기 위해 호텔에 불을 지른 청소부의 기록으로 돌아간다.', '전쟁과 입양 기록을 확인한 뒤 첫째 아이의 방어 몽세에 접속한다.'];w.transitionMinimum=12;w.stageLabel='사라진 귀환자 · 의목사 B의 기억'; }
        if(w.campaignRevision===5){
          var completedInfo=encounter(w),sceneId=completedInfo.primarySceneId||completedInfo.sceneIds&&completedInfo.sceneIds[0],bridge=STORY_TRANSITIONS[sceneId];
          if(bridge&&bridge.length){w.transitionNarrative=bridge.slice();w.transitionMinimum=Math.max(6,bridge.length*3);w.stageLabel=completedInfo.name+' · 다음 기억';}
          if(completedInfo.scriptedFall){w.storyOutcome='defeated-and-fell';w.stageLabel='패배와 추락 · 검을 놓지 않다';event(w,'story-fall','여섯 검격에 밀려 성벽에서 검은 바다로 추락한다.');}
          if(sceneId==='kair02'){w.storyOutcome='arbelia-self-rewrites';w.arbeliaFreed=true;event(w,'release','아르벨리아가 스스로 최초명령을 다시 쓴다.');}
          if(sceneId==='murder03'){w.storyOutcome='causal-repeat-disconnected';w.guiltRecordsPreserved=true;event(w,'record-preserved','네 사람의 실제 과실 기록은 남는다.');}
        }
        w.score += 2500;
      }
      else if (w.phase === 2) { w.stage = 'won'; w.stageTime = 0; w.resultReason = w.finalPractice ? '교주의 사몽 권한이 끊어졌다. 합일 코어는 남기고 지배 명령과 사이비 회로만 분리한다. 환도는 몽세수호자로 남는다.' : w.campaign ? (w.practiceBoss ? w.bossName + ' · 연습 완료' : w.campaignRevision === 5 ? '교주의 사몽 권한이 끊어졌다. 합일 코어는 파괴하지 않고 강제 명령과 흑장미단의 사이비 회로만 분리했다. 각자의 자아와 세계를 남긴 채 환도는 몽세수호자로 머문다.' : w.campaignRevision === 4 ? '기억의 문은 남아 있다. 같은 고통을 되감는 연결만 끊어 첫째 아이의 자아를 풀어냈다. 귀환 좌표가 흐려지는 가운데 남은 두 아이를 찾기로 한다.' : w.bossIndex>=5 ? '일곱 검은 신호 · 봉인 조사 구간을 마쳤습니다' : w.bossIndex===4 ? 'J의 인장이 빛납니다 · 루시퍼가 물러나고 도움을 청할 길이 열립니다' : '첫 기억의 조사 구간을 마쳤습니다') : '기억 회랑을 돌파했습니다'; if(w.campaignRevision===5&&!w.practiceBoss){w.coreIntact=true;w.forcedCommandsSeparated=true;w.cultAuthoritySevered=true;w.cultLeaderDissolved=true;w.guardianRole='몽세수호자';w.endingNarrative=['교주의 권한이 끊기고 몸이 무너진다. 이번에는 코어의 검은 신경선도 그를 되살리지 못한다.','코어 안에는 아직 수많은 사람이 살아 있다. 환도는 치켜들었던 칼을 내린다.','교주의 강제 명령과 흑장미단의 사이비 회로만 분리한다.','자신의 사몽 권한으로 흔들리는 기반을 유지하며 각자의 고유한 자아와 세계를 지킨다.','자아들이 제 이름을 되찾고 서로 다른 세계는 고유한 윤곽을 편다. 경계가 맞닿은 곳에는 작은 오솔길이 생기며, 어느 한쪽도 다른 세계를 집어삼키지 않는다.','환도는 귀환 대신 몽세수호자로 남는다. 누구에게도 가야 할 길을 대신 정하지 않는다.','사람의 선택에 대신 개입하고 싶은 유혹이 일 때마다 손바닥의 J 인장을 내려다본다. 각자가 택한 길목이 부당하게 막혀 있지 않은지만 확인한다.','코어에 떠오른 합일(合一) 뒤에서 금빛 획이 모여 몽세(夢世)가 된다. 환도는 그 이름을 끝까지 다시 읽는다. 합일몽세(合一夢世).'];}w.score += 5000 + w.player.hp * 500; event(w, 'win'); }
      else { w.stage = 'transition'; w.stageTime = 0; w.nextPhase = w.phase + 1; w.transitionRemaining = 6.4; w.stageLabel = e.sealTarget ? '남은 파동이 지나갑니다' : '남은 검편이 지나갑니다';
        if(w.campaignRevision===5&&encounter(w).combatKind==='final-authority'){
          if(w.phase===0){w.transitionNarrative=['사몽에 각성한 교주의 육신이 처음 무너진다. 환도 또한 몸을 일으키기 어려울 만큼 다친다.','합일 코어가 검은 신경선을 뻗어 교주의 몸을 꿰매고 사몽 출력을 밀어 넣는다.','되살아난 교주가 다가온다. 환도는 자아를 맡기는 생존의 유혹 앞에서도 자신의 다음 결정을 넘기지 않는다.'];w.transitionMinimum=12;w.stageLabel='코어의 봉합 · 되살아난 교주';}
          if(w.phase===1){w.transitionNarrative=['환도는 완전히 죽기 직전, 현실의 지하 접속실과 정신과 의사 미카엘라를 기억한다.','캡슐의 의목사 B는 첫째의 손을 잡고 있다. 세 아이는 본래 세쌍둥이였다. 첫째는 소멸하지 않고 환도라는 칼로 남았다.','환도는 아직 살아 있다. 현실의 기억은 사후가 아니라 바로 지금 되돌아온다. 이곳이 꿈임을 알아차린다.','사망이라는 글자가 사몽으로 바뀐다. 상처와 칼을 다시 잇고 B와 첫째의 동의한 별도 의지로 일어선다.'];w.transitionMinimum=16;w.stageLabel='죽음 직전의 기억 회복 · 사몽 각성';}
        }
        if(w.finalPractice && w.phase===0) { w.transitionNarrative=['교주가 무너졌지만 코어의 신경선이 그의 몸을 다시 잇는다.', '환도는 돌아온 현실의 기억 속에서 여기가 꿈임을 알아차린다.', '사몽의 권한으로 일어서서 교주에게 맞선다.'];w.transitionMinimum=9;w.stageLabel='사몽 각성'; }
      }
      w.reservation = false; w._reservationSince = 0;
      // A phase boundary contains no surviving support actors. Their already
      // fired bullets remain subject to the ordinary transition drain.
      while (w.enemies.length) remove(w, 'enemies', w.enemies.length - 1);
      w._warnings.length = 0; w._deferred.length = 0;
      // Already announced lasers complete on their committed paths during the
      // drain. A phase change never erases an active beam or creates a shortcut.
      w._delays.length = 0;
    } else {
      w.kills++; w.score += e.kind === 'turret' ? 240 : 120; gainResonance(w, 5, false); event(w, 'kill');
    }
  }
  function updateWarnings(w) {
    for (var i = w.hazards.length - 1; i >= 0; i--) {
      var h = w.hazards[i];
      if (w.tick >= h.expireAt) { remove(w, 'hazards', i); continue; }
      if (w.tick === h.activeAt && w.campaign && w.stage === 'boss' && w.boss && h.ownerId === w.boss.id) {
        if(h.sourceActorId&&w.boss.shadowCopies){var copy=w.boss.shadowCopies.find(function(p){return p.sourceActorId===h.sourceActorId;});if(copy&&copy.lastLaserCast!==h.castId){copy.releaseTick=w.tick;copy.lastLaserCast=h.castId;markBossRelease(w,'laser',h.patternId||'',h.x1,h.y1,h.sourceActorId);}}
        else if(h.sourceActorId&&w.boss.participants){var actor=w.boss.participants.find(function(p){return p.id===h.sourceActorId;});if(actor&&actor.lastLaserCast!==h.castId){actor.releaseTick=w.tick;actor.lastLaserCast=h.castId;markBossRelease(w,'laser',h.patternId||'',h.x1,h.y1,h.sourceActorId);}}
        else if(w.boss._lastLaserReleaseCast!==h.castId){markBossRelease(w,'laser',h.patternId||'',h.x1,h.y1);w.boss._lastLaserReleaseCast=h.castId;}
      }
      if (w.tick < h.activeAt) { h.phase = 'warning'; h.progress = clamp((w.tick - h.born) / h.warningTicks, 0, 1); }
      else if (w.tick < h.fadeAt) { h.phase = 'active'; h.progress = clamp((w.tick - h.activeAt) / h.activeTicks, 0, 1); }
      else { h.phase = 'fade'; h.progress = clamp((w.tick - h.fadeAt) / h.fadeTicks, 0, 1); }
    }
  }
  function updateLaserCollision(w, px, py) {
    if (w.stage === 'won' || w.stage === 'lost' || w.stage === 'bossIntro') return;
    var p = w.player;
    for (var i = 0; i < w.hazards.length; i++) {
      var h = w.hazards[i];
      if (h.phase !== 'active') continue;
      var d2 = hazardDistanceSquared(h, px, py, p.x, p.y), halfWidth = h.width / 2;
      if (d2 <= sq(p.r + halfWidth)) { w.stats.collisions++; hurt(w); }
      else if (!h.grazed && w.tick >= p.invulnerableUntil && d2 <= sq(13 + halfWidth)) {
        // A fan is one announced cast: neighboring rays cannot farm resonance.
        for (var j = 0; j < w.hazards.length; j++) if (w.hazards[j].castId === h.castId) w.hazards[j].grazed = true;
        w.graze++; w.score += 15; w._lastGraze = w.tick; gainResonance(w, 3, true);
        effect(w, p.x, p.y, 'graze', 8, '#a5ffee', 0.22);
      }
    }
  }
  function updateShots(w) {
    for (var d = w._delays.length - 1; d >= 0; d--) {
      var delay = w._delays[d];
      if (!delay) continue;
      if (w.tick < delay.at) continue;
      var targets = w.enemies.slice(); if (w.stage === 'boss' && w.boss) targets.push(w.boss);
      var main = targets.find(function (e) { return e.id === delay.targetId && e.hp > 0; });
      var x = main ? main.x : delay.x, y = main ? main.y : delay.y;
      if (main) hitTarget(w, main, 60, false);
      targets.forEach(function (e) { if (e !== main && sq(e.x - x) + sq(e.y - y) <= sq(36 + e.r)) hitTarget(w, e, 20, false); });
      effect(w, x, y, w.campaign ? 'delayBurst' : 'ring', 36, '#a8edff', 0.4); w._delays.splice(d, 1);
    }
    for (var i = w.shots.length - 1; i >= 0; i--) {
      var s = w.shots[i]; s.px = s.x; s.py = s.y; s.x += s.vx * FIXED_DT; s.y += s.vy * FIXED_DT; s.age += FIXED_DT;
      var victim = null, candidates = w.enemies;
      for (var j = 0; j < candidates.length; j++) { var e = candidates[j]; if (e.age >= 0 && e.hp > 0 && sweptCircleHit(s.px, s.py, s.x, s.y, e.px, e.py, e.x, e.y, s.r + e.r)) { victim = e; break; } }
      if (!victim && w.stage === 'boss' && w.boss && w.boss.hp > 0) { var b = w.boss; if (sweptCircleHit(s.px, s.py, s.x, s.y, b.px, b.py, b.x, b.y, s.r + b.r)) victim = b; }
      if (victim) { hitTarget(w, victim, s.damage, s.kind === 'basic'); remove(w, 'shots', i); }
      else if (s.age >= s.ttl || s.x < -32 || s.x > W + 32 || s.y < -32 || s.y > H + 32) remove(w, 'shots', i);
    }
    for (var k = w.enemies.length - 1; k >= 0; k--) if (w.enemies[k].hp <= 0) remove(w, 'enemies', k);
  }
  function patternDistanceSquared(b,px,py,x,y){
    var point=b.v27BouncePoint;if(!point)return projectileDistanceSquared(b,px,py,x,y);
    var f=clamp(point.fraction,0,1),mx=px+(x-px)*f,my=py+(y-py)*f,l=b.halfLength||0;
    var before=finite(b.v27PreviousAngle)?b.v27PreviousAngle:Math.atan2(point.y-b.py,point.x-b.px),after=b.angle||0;
    var ax=Math.cos(before)*l,ay=Math.sin(before)*l,bx=Math.cos(after)*l,by=Math.sin(after)*l;
    return Math.min(segmentPairDistanceSquared(b.px-px,b.py-py,point.x-mx,point.y-my,-ax,-ay,ax,ay),segmentPairDistanceSquared(point.x-mx,point.y-my,b.x-x,b.y-y,-bx,-by,bx,by));
  }
  function updateBullets(w, px, py) {
    var p = w.player, modern=patternEnabled(w),motionDT=w.campaignRevision===5&&w.tick<(w.arbeliaSlowUntil||0)?FIXED_DT*.55:FIXED_DT;
    if(modern)motionDT*=bulletTimeScale(w);
    for (var i = w.bullets.length - 1; i >= 0; i--) {
      var b = w.bullets[i]; b.px = b.x; b.py = b.y;
      if(modern)b.v27PreviousAngle=b.angle;
      if (b.weaponMotion) Weapon.advance(b, motionDT, W);
      else if(modern&&Patterns&&Patterns.advance(b,motionDT,W)){
        // Reflective capsule collisions retain both sides of the bent path.
      }else {
        var paused=b.pauseUntil && b.age>=b.pauseFrom && b.age<b.pauseUntil;
        if(!paused && b.curveRate && b.age<b.curveUntil){
          var curveSpeed=Math.hypot(b.vx,b.vy);b.angle+=b.curveRate*motionDT;
          b.vx=Math.cos(b.angle)*curveSpeed;b.vy=Math.sin(b.angle)*curveSpeed;
        }
        if (!paused && b.acceleration && b.age >= b.accelerateAt) {
          var speed = Math.min(b.maxSpeed, Math.hypot(b.vx, b.vy) + b.acceleration * motionDT);
          b.vx = Math.cos(b.angle) * speed; b.vy = Math.sin(b.angle) * speed;
        }
        if(!paused){b.x += b.vx * motionDT; b.y += b.vy * motionDT;}
      }
      b.age += modern?motionDT:FIXED_DT;
      if(modern)b.v27Age=b.age;
      var margin=modern?Math.max(38,(b.halfLength||0)+b.r+50):38;
      var outside=b.x < -margin || b.x > W+margin || b.y < -margin || b.y > H+margin;
      if(modern&&b.age>=b.ttl&&!outside&&!b.retiring){b.retiring=true;b.retireAge=0;b.retireDuration=.35;}
      else if(modern&&b.retiring)b.retireAge+=FIXED_DT;
      if (!b.retiring && w.stage !== 'won' && w.stage !== 'lost' && w.stage !== 'bossIntro') {
        // Conservative swept AABB: the projectile's half-length and the larger
        // of hit/graze radii enclose its entire capsule. Far-away bullets need
        // no segment-distance/trigonometry work; near bullets use the exact
        // original continuous collision and graze calculation unchanged.
        var halfLength = b.halfLength || 0;
        var reach = halfLength + Math.max(p.r, 13) + b.r;
        var x0 = b.px - px, x1 = b.x - p.x, y0 = b.py - py, y1 = b.y - p.y;
        // Include a floating-point safety margin so rounding at the graze
        // boundary always falls back to the original exact calculation.
        // Invalid geometry also takes the original path, never the shortcut.
        var valid = p.r >= 0 && b.r >= 0 && halfLength >= 0 && finite(reach);
        var margin = valid ? 1e-9 * (1 + reach + Math.max(Math.abs(x0), Math.abs(x1), Math.abs(y0), Math.abs(y1))) : 0;
        var far = valid && (Math.min(x0, x1) > reach + margin || Math.max(x0, x1) < -reach - margin || Math.min(y0, y1) > reach + margin || Math.max(y0, y1) < -reach - margin);
        if (b.weaponMotion && b.bouncePoint || modern&&b.v27BouncePoint) far = false;
        if (!far) {
          var d2 = b.weaponMotion ? Weapon.distanceSquared(b, px, py, p.x, p.y) : modern?patternDistanceSquared(b,px,py,p.x,p.y):projectileDistanceSquared(b, px, py, p.x, p.y);
          if (d2 <= sq(p.r + b.r)) { w.stats.collisions++; var damaged=hurt(w);if(!modern||damaged){remove(w, 'bullets', i); continue;} }
          if (!b.grazed && w.tick >= p.invulnerableUntil && d2 <= sq(13 + b.r)) {
            b.grazed = true; w.graze++; w.score += 15; w._lastGraze = w.tick; gainResonance(w, 3, true); effect(w, p.x, p.y, 'graze', 8, '#a5ffee', 0.22);
          }
        }
      }
      if ((!modern&&b.age>=b.ttl) || modern&&b.retiring&&b.retireAge>=b.retireDuration || outside || (w.stage === 'won' && w.stageTime > 0.35)){remove(w,'bullets',i);continue;}
      if(modern&&!b.retiring&&Patterns&&(w.stage==='boss'||w.stage==='waves')&&!b.v27SplitDone){
        var children=Patterns.splitChildren(w,b);
        if(Array.isArray(children)){
          // A split preserves the visible parent. Children are admitted as a
          // single bounded group and never split recursively or emit late.
          b.v27SplitDone=true;
          if(children.length){if(w.bullets.length+children.length<=CAPS.bullets)emit(w,children);else{w.stats.poolPressure++;w.stats.droppedGroups++;}}
        }
      }
    }
  }
  function cacheCheckpoint(w) {
    if (w.bullets.length || w.hazards.length || w._warnings.length || w._deferred.length || (w.stage !== 'waves' && w.stage !== 'boss')) throw new Error('Checkpoint requires a safe phase boundary');
    while (w.effects.length) remove(w, 'effects', w.effects.length - 1);
    w.checkpointSerial++;
    var snap = {};
    ['rulesetVersion','runId','seed','difficulty','practiceBoss','checkpointSerial','tick','rngState','idCounter','stage','wave','phase','score','graze','kills','memory','resonance','autoAttack','skillRotation'].forEach(function (k) { snap[k] = w[k]; });
    if (w.campaign) { snap.campaign = true; snap.campaignRevision = w.campaignRevision; snap.bossIndex = w.bossIndex; }
    if(pressureEnabled(w))snap.combatRevision=w.combatRevision;
    if (w.finalPractice) snap.finalPractice=true;
    snap.stageTime = 0; snap.phaseTime = 0; snap.waveTime = 0;
    snap.player = copy(w.player); snap.skills = copy(w.skills); snap.stats = copy(w.stats); snap.shotReadyAt = w._shotReadyAt;
    snap.resourceState = { memoryBucket: w._memoryBucket, memoryGain: w._memoryGain, resBucket: w._resBucket, resGain: w._resGain, grazeGain: w._grazeGain, lastGraze: w._lastGraze };
    w._checkpoint = snap; w._boundaryTick = w.tick; event(w, 'checkpoint');
  }
  function checkpoint(w) { return w && w._checkpoint ? copy(w._checkpoint) : null; }
  function restoreCheckpoint(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || JSON.stringify(snapshot).length > 131072) throw new Error('Invalid checkpoint');
    if(Object.prototype.hasOwnProperty.call(snapshot,'combatRevision')&&!supportedCombatRevision(snapshot.combatRevision))throw new Error('Unsupported combat revision');
    var s = copy(snapshot);
    if (s.finalPractice !== undefined && (s.finalPractice !== true || s.practiceBoss !== true || s.campaign !== true || s.bossIndex !== 11 || s.campaignRevision !== 3 || s.stage !== 'boss')) throw new Error('Invalid separate final practice');
    var hasCampaign = Object.prototype.hasOwnProperty.call(s, 'campaign') || Object.prototype.hasOwnProperty.call(s, 'campaignRevision') || Object.prototype.hasOwnProperty.call(s, 'bossIndex');
    if (hasCampaign && (s.campaign !== true || ![1,2,3,4,5].includes(s.campaignRevision) || !Number.isInteger(s.bossIndex) || s.bossIndex < 0 || s.bossIndex >= campaignBossCount(s.campaignRevision) || (s.difficulty === 'hell' && s.campaignRevision < 3))) throw new Error('Invalid campaign checkpoint');
    if (hasCampaign && s.stage === 'waves' && s.wave >= CAMPAIGN_BOSSES[s.bossIndex].waves.length) throw new Error('Invalid campaign wave');
    if (s.rulesetVersion !== RULESET || typeof s.runId !== 'string' || !/^[A-Za-z0-9_.:-]{1,96}$/.test(s.runId) || !['normal','gentle','hell'].includes(s.difficulty) || !['waves','boss'].includes(s.stage)) throw new Error('Unsupported checkpoint');
    ['tick','rngState','seed','idCounter','checkpointSerial','wave','phase','score','graze','kills','memory','resonance'].forEach(function (k) { if (!finite(s[k]) || s[k] < 0 || s[k] > (k === 'rngState' || k === 'seed' ? 4294967295 : 100000000)) throw new Error('Invalid checkpoint number: ' + k); });
    if (!Number.isInteger(s.tick) || s.tick > 1000000 || !Number.isInteger(s.wave) || s.wave > 2 || !Number.isInteger(s.phase) || s.phase > 2 || s.memory > 100 || s.resonance > 100 || s.stageTime !== 0 || s.phaseTime !== 0 || s.waveTime !== 0) throw new Error('Invalid checkpoint boundary');
    if (!Number.isInteger(s.seed) || !Number.isInteger(s.rngState) || !Number.isInteger(s.idCounter) || !Number.isInteger(s.checkpointSerial) || s.checkpointSerial < 1 || s.checkpointSerial > checkpointLimit(hasCampaign ? s.campaignRevision : 0) || typeof s.autoAttack !== 'boolean' || typeof s.skillRotation !== 'boolean' || typeof s.practiceBoss !== 'boolean') throw new Error('Invalid checkpoint identity');
    if (!Number.isInteger(s.shotReadyAt) || s.shotReadyAt < 0 || s.shotReadyAt > 10000000) throw new Error('Invalid shot timer');
    var p = s.player, maxHp = s.difficulty === 'gentle' ? 5 : 3;
    if (!p || !finite(p.x) || !finite(p.y) || p.x < 16 || p.x > 344 || p.y < 260 || p.y > 614 || !Number.isInteger(p.hp) || p.hp < 1 || p.hp > maxHp || p.maxHp !== maxHp || p.r !== 3 || !Number.isInteger(p.invulnerableUntil) || !Number.isInteger(p.egoUntil) || p.invulnerableUntil < 0 || p.egoUntil < 0 || p.invulnerableUntil > 10000000 || p.egoUntil > 10000000) throw new Error('Invalid checkpoint player');
    if (!s.skills || !s.stats || !s.stats.casts) throw new Error('Invalid checkpoint combat state');
    Object.keys(s.skills).forEach(function (k) { if (!Number.isInteger(s.skills[k]) || s.skills[k] < 0 || s.skills[k] > 10000000) throw new Error('Invalid skill timer'); });
    ['memoryReadyAt','delayReadyAt','counterReadyAt','egoReadyAt','globalReadyAt'].forEach(function (k) { if (!finite(s.skills[k])) throw new Error('Missing skill timer'); });
    ['hits','shots','damage','peakBullets','peakEnemies','peakParticles'].forEach(function (k) { if (!finite(s.stats[k]) || s.stats[k] < 0 || s.stats[k] > 100000000) throw new Error('Invalid checkpoint stats'); });
    ['memory','delay','counter','ego'].forEach(function (k) { if (!finite(s.stats.casts[k]) || s.stats.casts[k] < 0 || s.stats.casts[k] > 1000000) throw new Error('Invalid checkpoint casts'); });
    if (!Array.isArray(s.stats.phaseTicks) || s.stats.phaseTicks.length > (hasCampaign ? campaignBossCount(s.campaignRevision)*3 : 3) || s.stats.phaseTicks.some(function (n) { return !Number.isInteger(n) || n < 0 || n > 4500; })) throw new Error('Invalid phase history');
    var w = createRun({ difficulty: s.difficulty, seed: s.seed, practiceBoss: false, runId: s.runId, campaign: hasCampaign, campaignRevision: hasCampaign ? s.campaignRevision : undefined,combatRevision:s.combatRevision });
    if (hasCampaign) w.bossIndex = s.bossIndex;
    if (s.finalPractice === true) w.finalPractice = true;
    if(identityEnabled(w))w._identityPlans=[];else delete w._identityPlans;
    ['tick','rngState','idCounter','stage','wave','phase','score','graze','kills','memory','resonance','autoAttack','skillRotation','practiceBoss'].forEach(function (k) { w[k] = s[k]; });
    w.time = w.tick / 60; w.player = p; w.skills = s.skills; w.stats = s.stats; w.checkpointSerial = s.checkpointSerial;
    w._shotReadyAt = finite(s.shotReadyAt) ? s.shotReadyAt : w.tick; w.events.length = 0;
    if (s.stage === 'boss') { w.boss = makeBoss(w, s.phase, w.idCounter); w.patternName = NAMES[s.phase]; w.stageLabel = '보라검천사 · ' + (s.phase + 1) + '/3' + (s.practiceBoss ? ' · 연습' : ''); }
    else { w.patternName = ['세 갈래의 기억','교차하는 거미실','회랑의 끝'][s.wave]; w.stageLabel = '기억 회랑 · ' + (s.wave + 1) + '/3'; }
    campaignLabels(w);
    var r = s.resourceState;
    if (r) { ['memoryBucket','memoryGain','resBucket','resGain','grazeGain','lastGraze'].forEach(function (k) { if (!finite(r[k]) || Math.abs(r[k]) > 10000000) throw new Error('Invalid resource state'); }); w._memoryBucket = r.memoryBucket; w._memoryGain = r.memoryGain; w._resBucket = r.resBucket; w._resGain = r.resGain; w._grazeGain = r.grazeGain; w._lastGraze = r.lastGraze; }
    w._checkpoint = copy(s);
    return w;
  }
  function step(w, input, dt) {
    if (dt !== undefined && (!finite(dt) || Math.abs(dt - FIXED_DT) > 1e-9)) throw new RangeError('HapilCore.step requires fixed 1/60 second ticks');
    if (!w || !w.player) throw new TypeError('Expected a run');
    input = input || {};
    if (w.stage === 'lost') return w;
    var p = w.player, px = p.x, py = p.y;
    w.tick++; w.time = w.tick / 60;
    if (w.stage === 'bossIntro') {
      // Integer presentation ticks avoid floating point drift at exactly2.5s.
      var introTick = Math.round(w.stageTime / FIXED_DT) + 1;
      w.stageTime = introTick / 60;
      freezeIntroTimers(w);
      if (introTick >= 150) skipBossIntro(w);
      // Input is stateless: intro displacement is ignored, never queued for the
      // first combat tick. The UI also discards its own pending pointer deltas.
      return w;
    }
    w.stageTime += FIXED_DT;
    if (w.stage !== 'won') {
      var dx = finite(input.dx) ? input.dx : 0, dy = finite(input.dy) ? input.dy : 0;
      var length = Math.hypot(dx, dy), speed = (input.focus ? 120 : 240) * FIXED_DT;
      if (length > speed) { dx *= speed / length; dy *= speed / length; }
      p.x = clamp(p.x + dx, 16, 344); p.y = clamp(p.y + dy, 260, 614);
    }
    if (w.stage === 'waves') {
      w.waveTime += FIXED_DT; waveSchedule(w);
      if (w.stage === 'bossIntro') { p.x = px; p.y = py; freezeIntroTimers(w); return w; }
      updateEnemies(w);
      wavePressure(w);
    }
    else if (w.stage === 'boss') {
      w.phaseTime += FIXED_DT;
      if (w.phaseTime >= w.phaseTimeout) { w.stage = 'lost'; w.resultReason = '시간 안에 기억을 되찾지 못했습니다'; event(w, 'lose', w.resultReason); }
      else { bossPattern(w); summonBossAllies(w); updateEnemies(w); }
    }
    // A cached boundary is an entire tick. Its original and restored successor
    // both start with no friendly shots, enemies from a previous wave or hazards.
    if (w._boundaryTick === w.tick) return w;
    if (w._deferred.length && w.stage !== 'won' && w.stage !== 'lost') {
      var group = w._deferred[0];
      if (w.bullets.length + group.length <= CAPS.bullets) { w._deferred.shift(); emit(w, group); }
    }
    updateWarnings(w); attack(w); updateShots(w); updateBullets(w, px, py); updateLaserCollision(w, px, py);
    if (w.stage === 'transition') {
      w.transitionRemaining = Math.max(0, (w.transitionMinimum || 6.4) - w.stageTime);
      if (!w.bullets.length && !w.hazards.length && !w._warnings.length && !w._deferred.length && (!(w.campaign && w.bossIndex >= 2 && w.nextEncounter != null) || w.stageTime >= (w.transitionMinimum || 3)) && (!(w.finalPractice||w.campaignRevision===5&&w.bossIndex>=18) || !w.transitionNarrative || w.stageTime >= (w.transitionMinimum || 0))) {
        if (w.campaign && w.nextEncounter != null) {
          w.bossIndex = w.nextEncounter; w.nextEncounter = null; w.boss = null; w.stage = 'waves'; w.phase = 0; w.phaseTime = 0;
          w.transitionNarrative = null; w.transitionMinimum = 0;
          // Recover one life at a cleared encounter, never above the selected
          // difficulty's maximum. No health or damage is changed by the tests.
          w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1);
          startWave(w, 0);
        } else startBossPhase(w, w.nextPhase);
      }
    }
    if (w.stage === 'boss' && w.boss) w.phaseProgress = clamp(1 - w.boss.hp / w.boss.maxHp, 0, 1);
    for (var i = w.effects.length - 1; i >= 0; i--) { w.effects[i].age += FIXED_DT; if (w.effects[i].age >= w.effects[i].ttl) remove(w, 'effects', i); }
    w.stats.peakBullets = Math.max(w.stats.peakBullets, w.bullets.length); w.stats.peakEnemies = Math.max(w.stats.peakEnemies, w.enemies.length); w.stats.peakParticles = Math.max(w.stats.peakParticles, w.effects.length);
    return w;
  }
  return Object.freeze({ W: W, H: H, FIXED_DT: FIXED_DT, RULESET_VERSION: RULESET, MECHANICS_REVISION: 2, CAPS: CAPS,
    COMBAT_REVISION:COMBAT_REVISION,IDENTITY_COMBAT_REVISION:IDENTITY_COMBAT_REVISION,PATTERN_COMBAT_REVISION:PATTERN_COMBAT_REVISION,LATEST_COMBAT_REVISION:PATTERN_COMBAT_REVISION,BULLET_SLOW:BULLET_SLOW,bulletTimeScale:bulletTimeScale,IDENTITY_PROFILES:IDENTITY_PROFILES,PRESSURE_LIMITS:PRESSURE_LIMITS,attackCoverage:attackCoverage,
    CAMPAIGN_BOSSES: CAMPAIGN_BOSSES, CAMPAIGN_SIGNATURES: CAMPAIGN_SIGNATURES, CAMPAIGN_REVISION: 3, HELL_MECHANICS_REVISION: HELL_MECHANICS_REVISION, HELL_OVERLAP_LIMITS: HELL_OVERLAP_LIMITS,
    campaignBossCount: campaignBossCount, LATEST_CAMPAIGN_REVISION: 5, createRun: createRun, step: step, checkpoint: checkpoint, restoreCheckpoint: restoreCheckpoint, skipBossIntro: skipBossIntro,
    geometry: Object.freeze({ segmentDistanceSquared: segmentDistanceSquared, segmentPairDistanceSquared: segmentPairDistanceSquared, sweptCircleHit: sweptCircleHit, projectileDistanceSquared: projectileDistanceSquared, patternDistanceSquared:patternDistanceSquared, hazardDistanceSquared: hazardDistanceSquared }) });
}));
