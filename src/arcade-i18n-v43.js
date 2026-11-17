/* 세로판 화면 글자 다국어 준비(11-15 글로벌 동시 출시 방향).
 * - 언어: 주소 ?lang=en > 기기에 고른 언어(localStorage) > 기본 한국어. 번역이 다 차기 전까지 기기 언어로 자동 전환은 하지 않는다(AUTO=false).
 * - 화면 글자: HTML 요소에 data-i18n="키"(글자) · data-i18n-html="키"(굵은 글씨 포함, 이 파일의 고정 문구만) · data-i18n-label="키"(aria-label).
 * - 코드 글자: HapilI18n.t('키',{n:3}) — {n} 자리를 채운다. 없는 키는 한국어, 그것도 없으면 키 그대로.
 * - 스테이지·보스 이름은 정본 서사라 아직 번역하지 않는다(번역 표는 사용자 확인 뒤 STAGE_NAMES에 넣는다). */
(function(global){
  'use strict';
  var KEY='hapil-arcade-lang-v43',AUTO=false;
  var LANGS={ko:'한국어',en:'English'}; // 다음 차례(제안): ja 日本語, zh-Hant 繁體中文, es Español, pt-BR Português
  var DICT={
    ko:{
      kicker:'HAPIL · 원큐 여정 · 56 STAGES',controls:'끌어서 이동 · 공격은 자동<br><b>저속</b>을 누른 채 다른 손가락으로 정밀 이동 · <b>폭탄</b>으로 탄을 지웁니다',
      continue:'이어하기',continueStage:'이어하기 · STAGE {n}',continueMid:'이어하기 · STAGE {n} 중간부터',loading:'불러오는 중…',fromStart:'처음부터',here:'여기서',stageSelect:'스테이지 선택',
      difficulty:'난이도',gentle:'이지',normal:'노멀',hell:'헬',
      noteGentle:'목숨 {hp} · 폭탄 {bombs} · 쉬운 패턴 · 느린 탄 · 작은 피격점 · 다음 부 진입 시 목숨 1 회복 · 목표 약 {minutes}분',noteNormal:'목숨 {hp} · 폭탄 {bombs} · 헬과 같은 공격 · 피격점 접촉 시 확률 회피·자동폭탄 · 다음 부 진입 시 목숨 1 회복 · 목표 약 {minutes}분',noteHell:'목숨 {hp} · 폭탄 {bombs} · 노멀과 같은 공격 · 수동폭탄만 · 자동회피 없음 · 다음 부 진입 시 목숨 1 회복 · 목표 약 {minutes}분',
      keepsakes:'기념물',keepsakesCount:'기념물 {n}/{max}',bossPractice:'보스 체험',soundOn:'소리 켜짐',soundOff:'소리 꺼짐',
      starsBest:'별 <b id="title-stars">0</b> / <span id="title-stars-max">168</span> · 최고 점수 <b id="title-best">00000000</b>',noSave:'이 브라우저에서는 기록을 저장할 수 없습니다.',
      report:'기기 진단 복사',credit:'음악: 자체 작곡 · 악기 소리 Fluid R3 GM (Frank Wen, CC BY 3.0)',reportDone:'복사됨 · 스레드에 붙여 넣어 주세요',reportFail:'복사 안 됨 · 길게 눌러 선택',
      start:'시작',back:'돌아가기',paused:'잠시 멈춤',resume:'계속하기',toTitle:'처음 화면으로',best:'최고 점수',retryStage:'이 스테이지부터 다시',retryFallen:'다시하기 · 이 스테이지 처음부터',retryBoss:'한 번 더',
      settings:'플레이 설정',music:'배경음악',sfx:'효과음',musicVolume:'배경음악 음량',sfxVolume:'효과음 음량',screenShake:'화면 흔들림',lowQuality:'절전 그래픽',focusActive:'저속 켜짐',
      pauseHelp:'저속: 버튼을 누른 채 다른 손가락으로 움직이면 정밀 이동하며 피격점이 강조됩니다. PC는 Shift.<br>폭탄: 버튼 또는 X. 지옥은 수동 사용만 가능합니다.<br>설정은 자동 저장됩니다. Esc로 전투에 복귀합니다.',
      pause:'일시정지',focus:'저속',focusLabel:'저속 이동 (누르고 있는 동안)',bomb:'폭탄',rulesBody:"<p><b>이동·사격</b> — 드래그 또는 방향키/WASD로 이동하며 사격은 자동입니다. Shift 또는 저속 버튼을 누르면 정밀 이동과 피격점 표시가 켜집니다.</p> <p><b>피격점·스침</b> — 캐릭터 그림 전체가 아닌 작은 피격점으로 판정합니다. 탄 가까이를 지나 스침 게이지를 채우면 폭탄 재고를 얻습니다.</p> <p><b>대형탄 파괴</b> — 균열 표시가 있는 대형탄만 사격으로 부술 수 있습니다. 터지면 작은 잔탄 3개가 남습니다. 잔탄은 처음 잠깐 옅게 보이다가 위험해집니다. 작은 구슬·버블·쌀알탄과 표시 없는 탄은 피하세요.</p> <p><b>아래에서 올라오는 요소</b> — 바닥의 빛·화살표는 상승하는 적의 예고입니다. 솟아오르는 먹 그림은 장식이 아니라 장애물이며, 예고 뒤 닿으면 피해를 줍니다. 사격으로 부수거나 옆으로 피하세요. 떨어지는 블록도 사격으로 부술 수 있습니다. 쌓인 블록·솟은 지형은 피해 없이 위로 밀어 올리므로 위쪽 탄막도 살펴야 합니다. 바닥 가로 레이저는 예고 뒤 활성화되니 위아래 빈 곳으로 피하세요.</p> <p><b>문양 레이저</b> — 밝을 때 위험하고 꺼진 동안 통과할 수 있습니다. 재점등 직전 옅게 밝아지는 예고에는 피해가 없습니다.</p> <p><b>폭탄·난이도</b> — X 또는 폭탄 버튼으로 사용합니다. 이지·노멀은 피격점 접촉 시 확률 회피 후 폭탄이 있으면 자동 사용합니다. 헬은 수동폭탄만 가능하며 자동회피가 없습니다.</p> <p><b>목숨·회복</b> — 시작 목숨은 이지 5·노멀 3·헬 2입니다. 일반 스테이지마다 완전 회복하지 않고, 다음 부로 넘어갈 때 목숨 1을 최대치 안에서 회복합니다.</p> <p><b>원코인·이어하기</b> — 처음부터 게임 오버 없이 끝내는 것이 원코인 클리어입니다. 이어하기·구간 선택·재도전·DEV는 연습용이며 원코인 클리어에 포함하지 않습니다. 일시정지와 대화 읽기는 가능합니다.</p> <p><b>영웅 선택</b> — 기억사수·윤서하 A·윤서하 B 중 선택합니다. A는 소녀 시절, B는 성숙한 시간공학자의 모습입니다. 윤서하의 두 모습은 시간검 분산·집중 사격을 사용하며 성장·목숨·필살 규칙을 공유합니다.</p> <p><b>보스의 기억</b> — 본보스가 등장하기 직전에 컷신과 정본 발췌 또는 보스 대사를 보여주며 전투는 멈춥니다. 7대죄와 후속 형태는 각자의 등장 대사를 갖습니다. 등장 전 모든 탄막을 정리하고 보스 등장 후 약 2초 뒤 공격을 시작합니다. 컷신 보스를 쓰러뜨리면 탄막을 정리하고 약 2초 뒤 다음 구간으로 갑니다. 다음/건너뛰기 또는 Enter·Space로 넘기고, 자동 진행을 끄면 천천히 읽을 수 있습니다. 이미 본 기억은 다음 시도에 생략합니다.</p>",rules:'탄막 기본 규칙',storyMainBoss:'본보스',storyCanon:'서사 정본 · 기억',storyDialogue:'보스 등장 · 대사',storyNext:'다음',storyFight:'전투 시작',storySkip:'건너뛰기',storyAuto:'자동 진행 · Esc로 멈춤',storyReplay:'본 기억 다시 표시',storyReplayDone:'다음 보스부터 기억을 다시 표시합니다',field:'세로 탄막 전투장',bossStage:'보스 스테이지',language:'언어'
    },
    en:{
      kicker:'HAPIL · ONE-RUN JOURNEY · 56 STAGES',controls:'Drag to move · Shots fire automatically<br>Hold <b>Focus</b> and drag with another finger for precise movement · <b>Bomb</b> clears bullets',
      continue:'Continue',continueStage:'Continue · STAGE {n}',continueMid:'Continue · STAGE {n} (checkpoint)',loading:'Loading…',fromStart:'New game',here:'Play',stageSelect:'Select stage',
      difficulty:'Difficulty',gentle:'Easy',normal:'Normal',hell:'Hell',
      noteGentle:'{hp} lives · {bombs} bombs · easy patterns · slow bullets · tiny hitbox · recover 1 life on entering the next part · target ~{minutes} min',noteNormal:'{hp} lives · {bombs} bombs · same attacks as Hell · chance dodge and auto-bomb on hitbox contact · recover 1 life on entering the next part · target ~{minutes} min',noteHell:'{hp} lives · {bombs} bomb · same attacks as Normal · manual bombs only, no auto-dodge · recover 1 life on entering the next part · target ~{minutes} min',
      keepsakes:'Keepsakes',keepsakesCount:'Keepsakes {n}/{max}',bossPractice:'Boss practice',soundOn:'Sound on',soundOff:'Sound off',
      starsBest:'Stars <b id="title-stars">0</b> / <span id="title-stars-max">168</span> · Best <b id="title-best">00000000</b>',noSave:'Progress cannot be saved in this browser.',
      report:'Copy device report',credit:'Music: original score · Instrument samples Fluid R3 GM (Frank Wen, CC BY 3.0)',reportDone:'Copied · paste it to the developer',reportFail:'Copy failed · long-press to select',
      start:'Start',back:'Back',paused:'Paused',resume:'Resume',toTitle:'Title screen',best:'Best',retryStage:'Retry this stage',retryFallen:'Rise again · from this stage\'s start',retryBoss:'Again',
      settings:'Play settings',music:'Background music',sfx:'Sound effects',musicVolume:'Music volume',sfxVolume:'Effects volume',screenShake:'Screen shake',lowQuality:'Low-power graphics',focusActive:'Focus on',
      pauseHelp:'Focus: hold the button and move with another finger for precise movement and a highlighted hitbox. Use Shift on PC.<br>Bomb: tap the button or press X. Hell uses manual bombs only.<br>Settings save automatically. Press Esc to resume.',
      pause:'Pause',focus:'Focus',focusLabel:'Focus movement (hold)',bomb:'Bomb',rules:'How to play',storyMainBoss:'MAIN BOSS',storyCanon:'CANONICAL STORY · MEMORY',storyDialogue:'BOSS ENTRANCE · DIALOGUE',storyNext:'Next',storyFight:'Begin battle',storySkip:'Skip',storyAuto:'Auto advance · Esc to pause',storyReplay:'Show memories again',storyReplayDone:'Memories will appear at the next boss',rulesBody:'<p><b>Move and fire</b> — Drag or use arrows/WASD. Fire is automatic. Hold Focus or Shift for precise movement and a visible hitbox.</p><p><b>Hitbox and graze</b> — The small hitbox determines damage. Graze nearby bullets to fill the gauge and earn bomb stock.</p><p><b>Large bullets</b> — Only large bullets marked with a crack can be shot apart. Three small bullets remain; they start faint and briefly harmless, then become dangerous. Dodge small orbs, bubbles, rice and unmarked bullets.</p><p><b>From below</b> — Light and arrows along the floor warn of rising enemies. Rising ink pictures are obstacles: after their warning, contact hurts. Shoot them or move aside. Falling blocks can be shot too. Stacked blocks and rising ground push you upward without damage; watch the bullets above. Horizontal floor lasers turn dangerous after their warning: move above or below them.</p><p><b>Glyph lasers</b> — Bright means danger. Cross while dim. The brief recharge warning is harmless.</p><p><b>Bombs</b> — Use X or the bomb button. Easy/Normal can dodge by chance or spend a bomb automatically on contact. Hell has manual bombs only and no automatic evasion.</p><p><b>Lives</b> — Easy 5 / Normal 3 / Hell 2. Recover one life, up to the cap, on entering the next part. Ordinary stage clears do not refill lives.</p><p><b>One-credit clear</b> — Start from the beginning and finish without a game over. Continue, stage select, retries and DEV are practice. Pauses and reading are allowed.</p><p><b>Heroes</b> — Choose the Memory Gunner, young Seoha A or mature time engineer Seoha B. Both Seoha appearances spread time swords and concentrate them while focused, sharing growth, lives and bomb rules.</p><p><b>Memories</b> — A cinematic with a canonical excerpt or boss dialogue appears before the main boss arrives. Every deadly sin and follow-up form has its own lines. Combat freezes and bullets clear before the entrance; attacks begin about two seconds after arrival. Defeating a cinematic boss clears all bullets and waits about two seconds before advancing. Next/Skip or Enter/Space advances; turn off Auto to read at your pace. Seen memories are skipped on later attempts.</p>',field:'Vertical bullet-hell field',bossStage:'Boss stage',language:'Language'
    }
  };
  function pick(){
    var m=/[?&]lang=([a-zA-Z-]+)/.exec(global.location?global.location.search:''),saved=null;
    try{saved=global.localStorage.getItem(KEY);}catch(e){}
    var want=m?m[1]:saved;if(!want&&AUTO&&global.navigator)want=String(global.navigator.language||'').slice(0,2);
    return DICT[want]?want:'ko';
  }
  var lang=pick();
  function t(key,vars){
    var s=(DICT[lang]&&DICT[lang][key])!=null?DICT[lang][key]:DICT.ko[key]!=null?DICT.ko[key]:key;
    if(vars)s=s.replace(/\{(\w+)\}/g,function(all,k){return vars[k]!=null?String(vars[k]):all;});
    return s;
  }
  function apply(root){
    if(lang==='ko'||!root||!root.querySelectorAll)return; // 한국어는 HTML에 쓴 그대로 둔다
    root.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=t(el.getAttribute('data-i18n'));});
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){el.innerHTML=t(el.getAttribute('data-i18n-html'));}); // 이 파일의 고정 문구만 들어간다
    root.querySelectorAll('[data-i18n-label]').forEach(function(el){el.setAttribute('aria-label',t(el.getAttribute('data-i18n-label')));});
    if(root.documentElement)root.documentElement.lang=lang;
  }
  function set(next){if(!DICT[next])return false;lang=next;try{global.localStorage.setItem(KEY,next);}catch(e){}return true;}
  global.HapilI18n={t:t,apply:apply,set:set,get lang(){return lang;},LANGS:LANGS,DICT:DICT};
})(typeof window!=='undefined'?window:globalThis);
