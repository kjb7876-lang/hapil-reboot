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
      kicker:'HAPIL · 원큐 여정 · 56 STAGES',controls:'끌어서 이동 · 공격은 자동<br><b>저속</b>을 누르면 느려지고 피격점이 보입니다 · <b>폭탄</b>은 탄을 지웁니다',
      continue:'이어하기',continueStage:'이어하기 · STAGE {n}',continueMid:'이어하기 · STAGE {n} 중간부터',loading:'불러오는 중…',fromStart:'처음부터',here:'여기서',stageSelect:'스테이지 선택',
      difficulty:'난이도',gentle:'여유',normal:'기본',hell:'지옥',
      noteGentle:'목숨 {hp} · 폭탄 {bombs} · 쉬운 패턴 · 느린 탄 · 작은 피격점 · 스테이지마다 목숨 회복',noteNormal:'목숨 {hp} · 폭탄 {bombs} · 본 패턴 · 스테이지마다 목숨 회복',noteHell:'목숨 {hp} · 폭탄 {bombs} · 더 빠른 탄 · 큰 피격점 · 스테이지마다 목숨 회복',
      keepsakes:'기념물',keepsakesCount:'기념물 {n}/{max}',bossPractice:'보스 체험',soundOn:'소리 켜짐',soundOff:'소리 꺼짐',
      starsBest:'별 <b id="title-stars">0</b> / <span id="title-stars-max">168</span> · 최고 점수 <b id="title-best">00000000</b>',noSave:'이 브라우저에서는 기록을 저장할 수 없습니다.',
      report:'기기 진단 복사',credit:'음악: 자체 작곡 · 악기 소리 Fluid R3 GM (Frank Wen, CC BY 3.0)',reportDone:'복사됨 · 스레드에 붙여 넣어 주세요',reportFail:'복사 안 됨 · 길게 눌러 선택',
      start:'시작',back:'돌아가기',paused:'잠시 멈춤',resume:'계속하기',toTitle:'처음 화면으로',best:'최고 점수',retryStage:'이 스테이지부터 다시',retryFallen:'다시하기 · 이 스테이지 처음부터',retryBoss:'한 번 더',
      saveVersion:'지원하지 않는 저장 버전입니다. 원본 보호를 위해 덮어쓰지 않습니다.',saveFailed:'현재 진행을 저장하지 못했습니다. 저장 공간·브라우저 설정을 확인해 주세요.',saveRecovered:'최근 정상 기록에서 저장자료를 복구했습니다.',saveReset:'일부 저장자료를 읽지 못했습니다. 손상 원본은 별도로 보관했습니다.',resumeSegment:'저장 구간 {n}',resumeRules:'이어하기는 저장된 구간부터 다시 시작합니다. 체력·폭탄·점수는 재시작 기준입니다.',stageClear:'보스 격파',nextStage:'다음 스테이지로 이동합니다',journeyClear:'여정을 마쳤습니다',
      pause:'일시정지',focus:'저속',focusLabel:'저속 이동 (누르고 있는 동안)',bomb:'폭탄',field:'세로 탄막 전투장',bossStage:'보스 스테이지',language:'언어'
    },
    en:{
      kicker:'HAPIL · ONE-RUN JOURNEY · 56 STAGES',controls:'Drag to move · Shots fire automatically<br>Hold <b>Focus</b> to slow down and see your hitbox · <b>Bomb</b> clears bullets',
      continue:'Continue',continueStage:'Continue · STAGE {n}',continueMid:'Continue · STAGE {n} (checkpoint)',loading:'Loading…',fromStart:'New game',here:'Play',stageSelect:'Select stage',
      difficulty:'Difficulty',gentle:'Easy',normal:'Normal',hell:'Hell',
      noteGentle:'{hp} lives · {bombs} bombs · easy patterns · slow bullets · tiny hitbox · lives refill each stage',noteNormal:'{hp} lives · {bombs} bombs · full patterns · lives refill each stage',noteHell:'{hp} lives · {bombs} bomb · faster bullets · larger hitbox · lives refill each stage',
      keepsakes:'Keepsakes',keepsakesCount:'Keepsakes {n}/{max}',bossPractice:'Boss practice',soundOn:'Sound on',soundOff:'Sound off',
      starsBest:'Stars <b id="title-stars">0</b> / <span id="title-stars-max">168</span> · Best <b id="title-best">00000000</b>',noSave:'Progress cannot be saved in this browser.',
      report:'Copy device report',credit:'Music: original score · Instrument samples Fluid R3 GM (Frank Wen, CC BY 3.0)',reportDone:'Copied · paste it to the developer',reportFail:'Copy failed · long-press to select',
      start:'Start',back:'Back',paused:'Paused',resume:'Resume',toTitle:'Title screen',best:'Best',retryStage:'Retry this stage',retryFallen:'Rise again · from this stage\'s start',retryBoss:'Again',
      saveVersion:'Unsupported save version. The original will not be overwritten.',saveFailed:'Progress could not be saved. Check storage space and browser settings.',saveRecovered:'Save data recovered from the last valid backup.',saveReset:'Some save data could not be read. The damaged original was preserved.',resumeSegment:'Saved section {n}',resumeRules:'Continue restarts the saved section. Lives, bombs and score reset on restart.',stageClear:'BOSS CLEAR',nextStage:'Moving to the next stage',journeyClear:'Journey complete',
      pause:'Pause',focus:'Focus',focusLabel:'Focus movement (hold)',bomb:'Bomb',field:'Vertical bullet-hell field',bossStage:'Boss stage',language:'Language'
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
