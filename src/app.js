(function (global) {
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var mobileRuntime=global.matchMedia?global.matchMedia('(pointer: coarse)').matches:Math.min(global.innerWidth||999,global.innerHeight||999)<600;
  var defaults={music:true,sfx:true,quality:mobileRuntime?'low':'high',skillRotation:true,difficulty:'normal',sensitivity:1};
  var settings=Object.assign({},defaults),profile={},savedCheckpoint=null,world=null,renderer=null,images={};
  var mode='title',ready=false,booting=true,lastStamp=0,accumulator=0,lastRender=0,lastHud=0,visualTime=0,checkpointSerial=-1,completed=false,checkpointPending=null,checkpointRetryAt=0;
  var keys=Object.create(null),pointer={active:false,id:null,lastX:0,lastY:0,pendingX:0,pendingY:0,lastMove:0},inputSource='keyboard',raf=0;
  var samples={update:[],render:[],frame:[]},sampleCursor={update:0,render:0,frame:0},totalFrames=0,totalSteps=0,droppedGaps=0,peakUpdate=0,peakRender=0,peakFrame=0,lastGapReason='',maxSamples=360;
  var audio={unlocked:false,music:null,shot:[],hurt:[],shotIndex:0,hurtIndex:0,lastShot:0},toastTimer=0,settingsWasPlaying=false,settingsFocus=null;
  var core=null,store=null,lastProfileRefresh=0,assetErrors=[],campaignGeneration=0,completionJobs=0,completionUncertain=false,uncertainGeneration=-1,lastFinalizedGeneration=-1,restorePending=false,restoreError=false;
  var encounterArtPending=false,encounterArtGroup=-1,artLoadJob=null,artLoadGeneration=0;
  var imageRequests=Object.create(null),imageQueue=[],imageActive=0,imageWanted=null;
  var renderDirty=true,lastDrawnWorld=null,lastDrawnTick=-1,lastDrawnMode='',lastFitKey='',lastFitRenderer=null;
  var seenBossIntros=Object.create(null),skipIntroForRun=false;
  // Presentation summaries of the supplied first-volume route. No new story
  // events, battle logic or save fields are introduced by this ledger.
  // Spatial cues adapted from the supplied 2026-10-28 sensory narrative.
  // These 13 gameplay sections are a first-volume adaptation, not 13 canonical scenes.
  var routeNotes=[
    {title:'궁전 회랑',text:'창에는 얼굴 없는 성상이 비칩니다. 나뭇잎은 고요한데, 뿌리 아래 끼인 날개만 떨립니다.',cue:'멈춘 잎 아래, 떨리는 날개'},
    {title:'악마화 나무의 정원',text:'발등까지 온 뿌리를 피해 나아갑니다. 뿌리를 베어도 기억은 돌아오지 않습니다.',cue:'뿌리 아래로 이어지는 길'},
    {title:'뼈의 거미동굴',text:'머리 위 뼈들이 부딪칩니다. 이름을 부르는 목소리 아래, 보라검 천사가 서 있습니다.',cue:'목소리보다 눈앞의 검을 보세요'},
    {title:'검은 물의 늪',text:'하늘이 비치던 검은 수면에서 동료의 얼굴이 다시 떠오릅니다. 마지막 손은 북쪽을 가리킵니다.',cue:'검은 물 너머, 북쪽의 소환진'},
    {title:'재와 사슬의 성',text:'재에 묻힌 사슬은 무너진 성으로 이어집니다. 한곳의 불빛 아래 그림자는 다른 방향으로 뻗습니다.',cue:'불빛과 어긋난 그림자'},
    {title:'시체 언덕',text:'흙처럼 보인 언덕에서 익숙한 갑옷이 일어납니다. 얼굴보다 갑옷의 문양이 먼저 기억납니다.',cue:'잊은 얼굴, 기억나는 갑옷'},
    {title:'일곱 기둥',text:'눈부신 기둥 사이, 바닥에는 채찍 자국과 불씨가 남았습니다. 검이 내려올 길을 읽습니다.',cue:'바닥의 점선이 켜질 길입니다'},
    {title:'추락 뒤의 병원',text:'소환진 너머의 바닥이 꺼집니다. 추락하던 기억 뒤로 형광등과 병실의 문이 나타납니다.',cue:'형광등 아래, 낯선 병실'},
    {title:'주사실의 기억',text:'손바닥보다 작은 약병에 시선이 갇힙니다. 되돌아온 기억 속에서 봉인을 푼 초천사가 웃습니다.',cue:'보지 않게 된 문과 창'},
    {title:'주사기 폐허',text:'달빛에 주사기가 반짝입니다. 서로 다른 시절의 얼굴을 지나, 도움을 청할 말을 찾습니다.',cue:'혼자 견디는 대신 도움을 청하며'},
    {title:'천사의 가면',text:'다정했던 목소리가 완벽함과 벌을 강요합니다. 가면 속 얼굴들이 한 입을 함께 움직입니다.',cue:'그 목소리는 내 판단이었을까'},
    {title:'병원 창의 불빛',text:'날개 끝이 검게 변하고 뿔이 솟습니다. 병원 창에 불이 하나씩 켜지자, 손을 펴 봅니다.',cue:'검은 날개 너머, 켜지는 창'},
    {title:'J의 인장',text:'인장을 루시퍼에게 댑니다. 그는 물러나지만 갈망은 남습니다. 흔들리는 날에는 다시 도움을 청해야 합니다.',cue:'물러난 목소리, 남아 있는 선택'}
  ];
  var bossNotes=[
    '머리 위 뼈 소리에 시선을 빼앗기지 마세요. 눈앞의 보라색 검과 공격 예고를 읽으세요.',
    '수면에 비친 하늘이 흐트러지고 얼굴들이 떠오릅니다. 뿔악마의 탄막 사이를 지나세요.',
    '검이 내려오는 쪽으로 공간이 벌어집니다. 바닥에 남은 점선의 길에서 벗어나세요.',
    '가면 속 얼굴들이 같은 입을 움직입니다. 대칭으로 뻗는 깃털과 고정된 광선을 읽으세요.',
    '완벽함을 강요하는 목소리와 맞섭니다. 세 패턴을 지나 J의 인장으로 루시퍼를 물러나게 하세요.'
  ];
  var sinRoutes=[
    ['창이 검은 비닐로 덮인 집에서 미뤄 둔 시간이 쏟아집니다.','쓰레기 산 사이에서 남자가 자신의 삶에 손을 뻗으려 합니다.','나태의 귀를 봉인하고 누나에게 이어진 검은 신호를 따라갑니다.'],
    ['누나는 호텔의 부매니저가 되어 옛 친구를 다시 만났습니다.','서윤이 계속 자기 아래에 있기를 바랐던 마음을 돌아봅니다.','타인과 비교하던 시선 너머에 사과와 치료가 남습니다.'],
    ['조금만 모양이 흐트러져도 음식들이 버려지는 주방입니다.','거대한 위장 안으로 식칼과 독가스가 쏟아집니다.','오래된 졸업사진과 집착을 마주합니다.'],
    ['서윤의 허락을 받고 붉은 조명의 몽세에 들어갑니다.','완벽한 미소 뒤에는 텅 빈 표정이 남아 있습니다.','사랑받고 싶은 마음을 없애는 대신 자신을 해치는 연결을 끊습니다.'],
    ['금고와 겨울 산장이 한 공간에 이어져 있습니다.','지폐가 칼날이 되고 동전은 모두 같은 뒷면을 보입니다.','눈보라 속 소년의 기억은 총지배인과 같은 사람의 과거입니다.'],
    ['화재 속에서는 사람들의 대피가 먼저입니다.','청소부가 쌓아 온 모욕과 분노의 기억을 마주합니다.','지키려던 아이들과 자신이 태우는 생명을 구분하게 합니다.'],
    ['백색 정장의 회장에게 일곱 갈래 신호가 모입니다.','타인의 선택을 줄이는 일을 자신의 권능으로 여겼던 사람입니다.','육체의 봉인 뒤에도 남은 같은 회장의 생체 부트로더와 맞섭니다.']
  ];
  bossNotes=bossNotes.concat([
    '나태의 귀 벨페고르 · 느리게 쌓이는 탄막이 뒤늦게 가속합니다.',
    '질투의 귀 레비아탄 · 서로 엇갈리는 대칭 탄막과 비어 있는 틈을 읽으세요.',
    '탐식의 귀 베엘제붑 · 식칼과 독가스를 연상한 연속 공격 사이를 이동하세요.',
    '색욕의 귀 아스모데우스 · 서윤의 몽세에서 매혹의 빛과 실의 경로를 피하세요.',
    '탐욕의 귀 맘몬 · 지폐와 동전의 연속 공격 뒤에 같은 사람의 소년 기억이 드러납니다.',
    '분노의 귀 · 청소부의 분노가 번지는 방향과 공격 예고를 읽으세요.',
    '교만의 회장 · 코스믹 가면 루시퍼와 별개 인물입니다. 같은 회장의 기계 후속전까지 이어집니다.'
  ]);
  // Latest supplied story, SHA-256 e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa.
  // These are six places within one controller system, not six new people.
  var controllerRoutes=[
    ['의목사 B는 귀환하지 못한 의목사 A의 기록을 따라 아이의 몽세로 들어갑니다.','군단을 부수자 방어가 더 단단해집니다. 공격보다 반복의 시작점을 살핍니다.','통제자는 아이가 살아남으려고 만든 방어기제입니다.'],
    ['현실로 돌아가자는 말이 아이에게는 다시 다치러 가자는 말일 수도 있습니다.','분노를 쏟을수록 성벽은 높아집니다. 무기가 가리는 곳을 살핍니다.','기억을 지우지 않고 폭격을 되감는 명령을 찾습니다.'],
    ['기억의 문턱에 다가가자 방어 장치가 총구를 돌립니다.','아이를 끌어내려던 팔을 거두고 곁에 남을 길을 찾습니다.','감정을 바꾸겠다는 약속에는 아이가 다르게 느낄 자리가 없습니다.'],
    ['축귀 출력을 높일수록 통제자가 또렷해집니다. 힘이 닿는 회로를 찾습니다.','문손잡이가 돌아가자 아이의 몸이 굳습니다. 전쟁 뒤에도 안전하지 않았던 방입니다.','괴롭다는 이유로 아이의 기억을 지워 구원이라 부를 수는 없습니다.'],
    ['빈 기계 육체를 부수려던 검을 내립니다. 인간으로 남으라는 판단도 명령일 수 있습니다.','기계 몸으로 향하는 길만 열려 있습니다. 거부할 길이 있는지 묻습니다.','기억을 남긴 채 고통을 되감는 연결만 분리할 경계를 찾습니다.'],
    ['통제자가 기억의 문에 빙의해 기계 괴물로 일어납니다.','기억과 반복 명령이 갈라지는 경계를 찾습니다. 아이나 기억의 문은 공격 목표가 아닙니다.','같은 고통을 처음부터 되풀이하게 만드는 연결 고리만 끊습니다.']
  ];
  var controllerNotes=[
    '방어의 군단 · 틈을 읽으며 반복을 시작시키는 연결을 조사합니다.',
    '잔인한 구원 · 구하려는 확신보다 아이가 두려워하는 방향을 살핍니다.',
    '시스템의 거부권 · 기억 접근과 감정 통제의 경계를 구분합니다.',
    '관리자 권한 · 축귀 출력이 흘러드는 연결을 분리합니다.',
    '중앙 코어 이주실 · 기계 육체를 부수지 않고 강요된 선택의 회로를 찾습니다.',
    '기억의 문 · 기억 자체는 남기고 반복 명령의 연결만 끊습니다.'
  ];
  function roster(){return core&&core.CAMPAIGN_BOSSES||[];}
  function runBossCount(){return world&&world.bossCount|| (world&&world.campaignRevision===1?3:world&&world.campaignRevision===2?5:world&&world.campaignRevision===3?12:world&&world.campaignRevision===4?18:roster().length||35);}
  function routeOffset(boss){var list=roster(),sum=0;for(var i=0;i<boss;i++)sum+=list[i]?list[i].waves.length:(i===1?1:3);return sum;}
  function routeCount(){return routeOffset(runBossCount());}
  function routeNote(){
    if(!world||!world.campaign)return routeNotes[0];
    var boss=world.bossIndex||0,wave=world.wave||0,info=roster()[boss];
    if(boss<5)return routeNotes[Math.min(12,routeOffset(boss)+wave)];
    if(boss>=18)return {title:info&&info.waves[wave]||world.encounterName||world.bossName,text:info&&info.routeNotes&&info.routeNotes[Math.min(wave,info.routeNotes.length-1)]||info&&info.objective||world.combatObjective||'',cue:'제'+(info&&info.chapter||4)+'부 · '+(info&&info.protagonist||world.protagonist||'환도')};
    if(boss>=12)return {title:info&&info.waves[wave]||world.encounterName||world.bossName,text:controllerRoutes[boss-12][Math.min(wave,2)],cue:'의목사 B · 반복 명령의 연결을 살피세요'};
    return {title:info&&info.waves[wave]||world.encounterName||world.bossName,text:sinRoutes[boss-5][wave],cue:info&&info.waves[wave]||'검은 신호를 따라 이동하세요'};
  }
  var skillNames={memory:'기억 해방',delay:'시간 지연',counter:'반격',ego:'자아 각성'},lastSkill=null;
  function endingText(){return world&&Array.isArray(world.endingNarrative)&&world.endingNarrative.length?world.endingNarrative.join('\n\n'):world&&world.resultReason||'';}
  var endingPage=0;
  function showEndingPage(index){
    if(!world||world.campaignRevision!==5||world.practiceBoss||world.stage!=='won'||!Array.isArray(world.endingNarrative))return;
    var paragraphs=world.endingNarrative;if(!paragraphs.length)return;
    endingPage=Math.max(0,Math.min(paragraphs.length-1,index));
    safeText('result-description',paragraphs[endingPage]);safeText('ending-progress',(endingPage+1)+' / '+paragraphs.length);
    $('ending-prev').disabled=endingPage===0;$('ending-next').disabled=endingPage===paragraphs.length-1;
    setHidden('ending-nav',false);
  }
  function updateStory(){
    if(!world){safeText('chapter-caption','스토리모드 · 프롤로그~제8부');safeText('chapter-number','01');safeText('encounter-kicker','THE DREAM GUARDIAN');safeText('encounter-title','검은 정원에서 사몽의 최종전까지');safeText('encounter-description','EGO와 의목사의 기억을 지나 환도의 길을 잇습니다. 코어 안의 세계를 지키며 강제 명령과 사이비 회로를 분리하세요.');$('app').setAttribute('data-encounter','violet');return;}
    if(!world.campaign){$('app').setAttribute('data-encounter','violet');safeText('chapter-caption','첫 기억');safeText('chapter-number','01');safeText('encounter-kicker','A FRAGMENT OF MEMORY');safeText('encounter-title',world.stage==='waves'?'기억의 회랑':'보라검천사');safeText('encounter-description','숲길과 폐허를 지나 거미 동굴로 이어지는 첫 기억입니다.');return;}
    var boss=world.bossIndex||0,offset=routeOffset(boss),wave=world.wave||0,index=offset+wave,note=routeNote(),info=roster()[boss],isWave=world.stage==='waves'||(world.stage==='lost'&&!world.boss&&!world.practiceBoss);
    $('app').setAttribute('data-encounter',info?info.id:['violet','horn','balrog','mask','lucifer'][boss]);
    safeText('chapter-caption',world.practiceBoss?(world.practiceStartPhase===2?'특수 패턴 연습 · 3번째 패턴':'전투 연습 · 3패턴'):isWave?'기억의 길 · '+routeCount()+'구간':boss>=18?'제'+(info&&info.chapter||4)+'부 · '+(info&&info.protagonist||world.protagonist||'환도'):boss>=12?'의목사 B · 통제자의 열일곱 단계':boss>=5?'의목사 A · 일곱 검은 신호':'마지막 수호자 EGO');
    safeText('chapter-number',pad(world.practiceBoss?boss+1:isWave?index+1:offset+(info?info.waves.length:boss===1?1:3),2));
    safeText('encounter-kicker',isWave?'FRAGMENT '+pad(index+1,2)+' / '+routeCount():world.practiceBoss?'PATTERN STUDY':'GUARDIAN '+pad(boss+1,2)+' / '+pad(runBossCount(),2));
    safeText('encounter-title',isWave?note.title:world.bossName);
    safeText('encounter-description',isWave?note.text:boss>=18?info&&info.objective||world.combatObjective||'':boss>=12?controllerNotes[boss-12]:bossNotes[boss]);
    if(world.transitionNarrative){safeText('encounter-kicker','BETWEEN MEMORIES');if(Array.isArray(world.transitionNarrative)){safeText('encounter-title',world.stageLabel);safeText('encounter-description',world.transitionNarrative[Math.min(world.transitionNarrative.length-1,Math.floor((world.stageTime||0)/3))]);}else{safeText('encounter-title',world.transitionNarrative.title);safeText('encounter-description',world.transitionNarrative.body);}}
    if(world.finalPractice){safeText('chapter-caption','제8부 최종전 · 독립 연습');safeText('chapter-number','08');if(world.stage!=='transition'){safeText('encounter-kicker','FINAL PRACTICE');safeText('encounter-title','교만의 사이보그 교주');safeText('encounter-description','교주의 사몽에 맞서고, 되살아난 기억으로 권한을 되찾으세요.');}}
    if(world.stage==='won'&&!world.practiceBoss&&world.campaignRevision===5){safeText('encounter-kicker','THE DREAM GUARDIAN');safeText('encounter-title','남겨진 몽세 · 몽세수호자');safeText('encounter-description',endingText());}
    else if(world.stage==='won'&&!world.practiceBoss&&world.campaignRevision===4){safeText('encounter-kicker','AFTER THE MEMORY GATE');safeText('encounter-title','환도 자아의 탄생');safeText('encounter-description','기억의 문은 남았습니다. 의목사 B는 아이 곁에 남고, 첫째의 의지가 환도라는 칼로 응축됩니다. 몸과 칼은 각자의 뜻을 지닌 채 함께 움직입니다.');}
    else if(world.stage==='won'&&!world.practiceBoss){var extended=world.campaignRevision>=3;safeText('encounter-kicker',extended?'THE SEVEN SIGNALS':'BEYOND THE MASK');safeText('encounter-title',extended?'일곱 검은 신호의 끝':'가면 너머의 새벽');safeText('encounter-description',extended?'회장의 생체 부트로더와 연산핵이 무너집니다. 이것으로 합일의 전체 이야기가 끝난 것은 아닙니다.':'J의 인장으로 루시퍼가 물러납니다. 이제 도움을 청할 수 있습니다.');}
  }
  function updateSkills(){
    var tick=world?world.tick:0,active=settings.skillRotation&&world&&lastSkill&&lastSkill.runId===world.runId&&tick-lastSkill.tick<90?lastSkill.name:null;
    safeText('memory-value',world?Math.floor(world.memory||0):0);$('memory-meter').value=world?Math.max(0,Math.min(100,world.memory||0)):0;
    Object.keys(skillNames).forEach(function(name){
      var remaining=world&&world.skills?Math.max(0,world.skills[name+'ReadyAt']-tick):0;
      var state=active===name?'active':!settings.skillRotation?'off':remaining>0?'cooldown':'waiting';
      $('skill-'+name).setAttribute('data-state',state);
      safeText('skill-'+name+'-state',state==='active'?'발동':state==='off'?'꺼짐':remaining>0?(Math.ceil(remaining/6)/10).toFixed(1)+'초':'대기');
    });
    safeText('skill-state',active?skillNames[active]+' · 발동':settings.skillRotation?'스킬 자동 순환':'스킬 순환 꺼짐');
  }
  function introKey(){return world&&world.campaign?'campaign-'+world.bossIndex:'legacy';}
  function pad(n,width){return String(Math.max(0,Math.floor(n||0))).padStart(width||6,'0');}
  function setHidden(id,value){var element=$(id),hidden=!!value;if(element.hidden!==hidden)element.hidden=hidden;}
  function syncIntroControls(){
    var active=mode==='playing'&&world&&world.stage==='bossIntro';setHidden('intro-skip-button',!active);
  }
  function safeText(id,value){var element=$(id),text=value==null?'':String(value);if(element.textContent!==text)element.textContent=text;}
  function clearInput(){keys=Object.create(null);pointer.active=false;pointer.id=null;pointer.pendingX=0;pointer.pendingY=0;pointer.lastMove=0;inputSource='keyboard';$('touch-pad').classList.remove('active');}
  function toast(message){safeText('toast',message);setHidden('toast',false);clearTimeout(toastTimer);toastTimer=setTimeout(function(){setHidden('toast',true);},2200);}
  function showError(error){ready=false;mode='error';clearInput();setHidden('title-screen',true);setHidden('pause-screen',true);setHidden('result-screen',true);setHidden('error-screen',false);safeText('error-description',error&&error.message?error.message:String(error));$('pause-button').disabled=true;stopMusic();}
  function updateStorage(){
    var status=store&&store.status?store.status:{persistent:false,message:'이 세션에서만 기록됩니다.'};
    var message=(status.persistent?'':'임시 기록 · ')+(status.message|| (status.persistent?'이 독립 실행판에 자동 저장됩니다.':'브라우저가 영구 저장을 허용하지 않았습니다.'));
    var conflict=message.indexOf('다른 창')>=0,failed=completionUncertain||restoreError||/오류|실패/.test(message);
    if(completionUncertain)message+=' · 이어하기 확인이 필요합니다. 게임을 다시 열어주세요';
    else if(completionJobs>0||restorePending)message+=' · 이어하기 기록 확인 중';
    var warning=!status.persistent||conflict||failed;
    safeText('storage-status',message);$('storage-status').classList.toggle('warning',warning);
    safeText('mobile-storage-status',conflict?'다른 창의 기록 변경 · 다시 열어주세요':failed?'저장 오류 · 기록 확인 후 다시 열어주세요':(completionJobs>0||restorePending)?'이어하기 기록 확인 중':(status.persistent?'별도 기록에 자동 저장됩니다.':'임시 기록 · 이 세션에서만 유지됩니다.'));
    $('mobile-storage-status').classList.toggle('warning',warning);safeText('settings-storage',message+' 기존 합일의 저장 데이터와 분리됩니다.');
  }
  function syncContinueAvailability(){
    safeText('continue-button',savedCheckpoint&&savedCheckpoint.combatRevision!==21?'기존 전투로 이어하기':'저장된 구간에서 이어하기');
    $('continue-button').disabled=completionJobs>0||completionUncertain||restorePending;
    $('start-button').disabled=!ready||restorePending;
    $('practice-button').disabled=!ready||restorePending;
    $('special-practice-button').disabled=!ready||restorePending;
  }
  function confirmCheckpoint(snap,generation){
    savedCheckpoint=snap;
    if(completionUncertain&&generation>uncertainGeneration)completionUncertain=false;
    setHidden('continue-button',false);syncContinueAvailability();
  }

  function updateProfile(){safeText('best-score',pad(profile.bestScore));safeText('profile-summary',profile.runs?('도전 '+profile.runs+'회 · 회랑 통과 '+(profile.wins||0)+'회'):'아직 기록된 기억이 없습니다.');}
  function syncSettings(){
    $('setting-music').checked=settings.music;$('setting-sfx').checked=settings.sfx;$('setting-skills').checked=settings.skillRotation;$('setting-low').checked=settings.quality==='low';$('setting-sensitivity').value=settings.sensitivity;safeText('sensitivity-value',Number(settings.sensitivity).toFixed(1)+'×');
    document.querySelectorAll('[data-difficulty]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.difficulty===settings.difficulty));});
    safeText('difficulty-description',settings.difficulty==='gentle'?'느린 탄속 · 낮은 공격 밀도 · 체력 5':settings.difficulty==='hell'?'HELL · 다중 공격 · 환영과 6초 분신':'탄막과 광선의 교차 · 제8부 사몽 최종전까지');safeText('skill-state',settings.skillRotation?'스킬 자동 순환':'스킬 순환 꺼짐');safeText('render-state',settings.quality==='low'?'30 FPS':'60 FPS');
    if(world)world.skillRotation=settings.skillRotation;else safeText('health-value',settings.difficulty==='gentle'?'◇ ◇ ◇ ◇ ◇':'◇ ◇ ◇');updateSkills();
    if(!settings.music)stopMusic();else if(mode==='playing')startMusic();
  }
  function persistSettings(){syncSettings();if(store)store.saveSettings(settings).then(updateStorage);}
  function setMode(next){
    if(mode!==next)renderDirty=true;
    mode=next;setHidden('title-screen',next!=='title');setHidden('pause-screen',next!=='paused');setHidden('result-screen',next!=='result');setHidden('error-screen',next!=='error');setHidden('battle-caption',!(next==='playing'||next==='paused'||next==='result'));$('pause-button').disabled=next!=='playing';
    if(next!=='playing'){clearInput();stopMusic();}else startMusic();
    syncIntroControls();
  }
  function fit(){
    var mobile=global.innerWidth<=820,vh=global.visualViewport?global.visualViewport.height:global.innerHeight;
    var shell=document.querySelector('.app-shell'),mast=document.querySelector('.masthead');
    var shellStyle=getComputedStyle(shell),safeInsets=(parseFloat(shellStyle.paddingTop)||0)+(parseFloat(shellStyle.paddingBottom)||0);
    var availableHeight=vh-(mast.offsetHeight+48+48+38+80+25)-safeInsets;
    // Every arena pixel remains visible; the touch pad always reserves eighty CSS pixels.
    if(mobile)availableHeight=vh-mast.offsetHeight-(vh<=680?28:33)-80-(vh<=680?18:20)-14-7-safeInsets;
    else if(vh<=850)availableHeight=vh-mast.offsetHeight-28-30-38-80-25-safeInsets;
    var availableWidth=mobile?Math.min(420,mast.clientWidth):(global.innerWidth<=1050?global.innerWidth-56-2*160-56:global.innerWidth-112-2*200-112);
    var h=Math.max(180,Math.min(640,availableHeight,Math.max(130,availableWidth)*640/360)),w=h*360/640;
    var dpr=settings.quality==='low'?1:Math.min(1.5,global.devicePixelRatio||1),fitKey=w.toFixed(2)+':'+h.toFixed(2)+':'+dpr;
    if(fitKey!==lastFitKey||lastFitRenderer!==renderer){
      document.documentElement.style.setProperty('--arena-w',w.toFixed(2)+'px');document.documentElement.style.setProperty('--arena-h',h.toFixed(2)+'px');document.documentElement.style.setProperty('--pad-h','80px');
      if(renderer)renderer.resize(w,h,dpr);
      lastFitKey=fitKey;lastFitRenderer=renderer;renderDirty=true;
    }
  }
  function setSkillEmblems(media){
    if(!media.comboIcons)return;
    // Existing static recipe atlas reused as badges for the four current
    // skills; it does not implement the source pack's proposed combos.
    var positions={memory:'100% 0%',delay:'0% 100%',counter:'0% 0%',ego:'100% 100%'};
    Object.keys(positions).forEach(function(name){var emblem=$('skill-'+name+'-emblem');emblem.style.backgroundImage='url('+JSON.stringify(media.comboIcons)+')';emblem.style.backgroundPosition=positions[name];emblem.classList.add('atlas-emblem');emblem.textContent='';});
  }
  function pumpImageQueue(){
    while(imageActive<2&&imageQueue.length){
      var task=imageQueue.shift();if(task.done)continue;
      if(imageWanted&&!imageWanted[task.name]){task.finish(false,true);continue;}
      task.active=true;imageActive++;
      task.im=new Image();task.timer=setTimeout((function(item){return function(){item.finish(false);};})(task),15000);
      task.im.onload=(function(item){return function(){item.finish(true);};})(task);
      task.im.onerror=(function(item){return function(){item.finish(false);};})(task);
      task.im.src=task.url;
    }
  }
  function retainImageRequests(names){
    imageWanted=Object.create(null);names.forEach(function(name){imageWanted[name]=true;});
    Object.keys(imageRequests).forEach(function(name){
      var task=imageRequests[name];if(!task||imageWanted[name])return;
      task.finish(false,true);
    });
  }
  function loadImage(name,url){
    if(images[name])return Promise.resolve();
    if(imageRequests[name])return imageRequests[name].promise;
    if(!url){if(assetErrors.indexOf(name)<0)assetErrors.push(name);return Promise.resolve();}
    var task={name:name,url:url,done:false,active:false,im:null,timer:null};
    task.promise=new Promise(function(resolve){
      task.finish=function(ok,cancelled){
        if(task.done)return;task.done=true;clearTimeout(task.timer);
        if(task.im){task.im.onload=task.im.onerror=null;if(!ok)try{task.im.src='';}catch(ignore){}}
        if(ok&&(!imageWanted||imageWanted[name])){images[name]=task.im;var oldError=assetErrors.indexOf(name);if(oldError>=0)assetErrors.splice(oldError,1);}
        else if(!cancelled&&(!imageWanted||imageWanted[name])&&assetErrors.indexOf(name)<0)assetErrors.push(name);
        if(imageRequests[name]===task)delete imageRequests[name];
        if(task.active)imageActive--;resolve();pumpImageQueue();
      };
    });
    imageRequests[name]=task;imageQueue.push(task);pumpImageQueue();return task.promise;
  }
  async function loadImagesBounded(names,isCurrent){
    var cursor=0;async function worker(){while(cursor<names.length&&(!isCurrent||isCurrent())){var key=names[cursor++];await loadImage(key,global.HapilMedia[key]);}}
    await Promise.all([worker(),worker()]);
  }
  function mobileAssetKeys(group){
    var enemyNames=group>=12?[]:group>=5?['Guard','Denial']:([['Spider'],['Swamp'],['Ember'],['Echo','Vial'],['Guard','Denial']][group]||[]);
    var motionKeys=['bossMotionViolet','bossMotionHorn','bossMotionBalrog','bossMotionMask','bossMotionLucifer'];
    var fxKeys=global.HapilProjectiles&&global.HapilProjectiles.assetKeysForEncounter?global.HapilProjectiles.assetKeysForEncounter(group):[];
    var sinKeys=group>=19&&global.HapilStoryAssets&&global.HapilStoryAssets.assetKeysForEncounter?global.HapilStoryAssets.assetKeysForEncounter(group):group>=13&&global.HapilActors&&global.HapilActors.chapter3AssetKeysForEncounter?global.HapilActors.chapter3AssetKeysForEncounter(group):group===12&&global.HapilActors&&global.HapilActors.cultAssetKeysForEncounter?global.HapilActors.cultAssetKeysForEncounter(group):group>=5&&global.HapilActors&&global.HapilActors.sinAssetKeysForEncounter?global.HapilActors.sinAssetKeysForEncounter(group):[];
    var terrainKeys=global.HapilRenderer&&global.HapilRenderer.terrainAssetKeysForEncounter?global.HapilRenderer.terrainAssetKeysForEncounter(group):[];
    var skillKeys=global.HapilBossSkills&&global.HapilBossSkills.assetKeysForEncounter?global.HapilBossSkills.assetKeysForEncounter(group):[];
    if(global.HapilBossSkills&&global.HapilBossSkills.optionalAssetKeysForEncounter)skillKeys=skillKeys.concat(global.HapilBossSkills.optionalAssetKeysForEncounter(group));
    return Object.keys(global.HapilMedia).filter(function(k){
      // These legacy body/floor images are unused by the source-backed controller scenes.
      if(group>=13&&['boss','spider','cave'].includes(k))return false;
      if(group>=19&&k==='gunner'&&global.HapilStoryAssets&&global.HapilStoryAssets.lookup(group)&&global.HapilStoryAssets.lookup(group).player)return false;
      if(group>=19&&k==='fxWindArrow8V6'&&global.HapilStoryAssets&&global.HapilStoryAssets.lookup(group)&&global.HapilStoryAssets.lookup(group).playerShot)return false;
      if(['gunner','boss','spider','fxResonance','fxSlash','fxThorns','fxArrow','fxParry','fxSilk','fxWindArrow8V6'].includes(k))return true;
      if(group===0&&(/^map\d+$/.test(k)||k==='violetCutin'))return true;
      if(group>=5&&k==='cave')return true;
      if((group===-1||group===1||group===2)&&['forest','ruins','cave'].includes(k))return true;
      if(k===motionKeys[group]||fxKeys.indexOf(k)>=0||sinKeys.indexOf(k)>=0||terrainKeys.indexOf(k)>=0||skillKeys.indexOf(k)>=0)return true;
      return enemyNames.some(function(n){return k.indexOf('actor'+n)===0;});
    });
  }
  // Required actor poses have authored dimensions. A damaged or missing image
  // must stop before combat instead of silently falling back to another actor
  // or to procedural silhouettes. Legacy (-1) uses its own older presentation.
  function invalidActorAsset(candidate,group){
    if(group===-1)return null;
    if(group>=19)return global.HapilActors&&global.HapilActors.invalidStoryAssetForEncounter?global.HapilActors.invalidStoryAssetForEncounter(candidate,group):'story-actor-contract';
    if(group>=13&&group<=18)return global.HapilActors&&global.HapilActors.invalidChapter3AssetForEncounter?global.HapilActors.invalidChapter3AssetForEncounter(candidate,group):'controller-actor-contract';
    if(group===12)return global.HapilActors&&global.HapilActors.invalidCultAssetForEncounter?global.HapilActors.invalidCultAssetForEncounter(candidate,group):'cult-actor-contract';
    if(!Number.isInteger(group)||group<0||group>11)return 'encounter-index';
    if(group>=5){
      if(!global.HapilActors||typeof global.HapilActors.invalidSinAssetForEncounter!=='function')return 'sin-actor-contract';
      var sinError=global.HapilActors.invalidSinAssetForEncounter(candidate,group);if(sinError)return sinError;
    }
    var actors=global.HapilActors, motion=global.HapilBossMotion;
    if(!actors||!actors.contracts||!motion||!motion.contracts)return 'actor-renderer';
    var bosses=['violet','horn','balrog','mask','lucifer'];
    var enemies=group>=5?['guard','denial']:[['spider'],['swamp'],['ember'],['echo','vial'],['guard','denial']][group];
    var contract=motion.contracts[bosses[group]], sprite=contract&&candidate[contract.key];
    if(group<5&&(!contract||!sprite||sprite.complete===false||sprite.naturalWidth!==contract.width||sprite.naturalHeight!==contract.height))return contract&&contract.key||'boss-motion-contract';
    for(var i=0;i<enemies.length;i++){
      var actor=actors.contracts[enemies[i]],names=['idle','walk','attack','hit'];
      if(!actor||!actor.poses)return 'actor-contract-'+enemies[i];
      for(var j=0;j<names.length;j++){
        var pose=actor.poses[names[j]],im=pose&&candidate[pose.key];
        if(!pose||!im||im.complete===false||im.naturalWidth!==pose.width||im.naturalHeight!==pose.height)return pose&&pose.key||'actor-pose-'+enemies[i];
      }
    }
    return null;
  }
  function invalidDamageAsset(candidate,group){
    var projectiles=global.HapilProjectiles;
    // Without the required renderer, enemy damage could otherwise become
    // invisible because geometry fallbacks are deliberately disabled.
    if(!projectiles||typeof projectiles.create!=='function'||typeof projectiles.assetKeysForEncounter!=='function'||typeof projectiles.invalidAssetForEncounter!=='function')return 'projectile-renderer';
    if(group>=19){
      var storyAssets=global.HapilStoryAssets;
      if(!storyAssets||!storyAssets.lookup(group))return 'story-damage-contract';
      var storyError=storyAssets.invalidAsset(candidate,group,['projectiles','skills']);
      if(storyError)return storyError;
      if(storyAssets.lookup(group).playerShot)return projectiles.invalidAssetForEncounter(candidate,group);
    }
    var arrow=candidate.fxWindArrow8V6;
    if(!arrow||arrow.complete===false||arrow.naturalWidth!==1024||arrow.naturalHeight!==512)return 'fxWindArrow8V6';
    return projectiles.invalidAssetForEncounter(candidate,group);
  }
  function invalidTerrainAsset(candidate,group){return global.HapilRenderer&&global.HapilRenderer.invalidTerrainAsset?global.HapilRenderer.invalidTerrainAsset(candidate,group):null;}
  function optionalAssetKeys(group){
    if(group>=19)return [];
    var projectiles=global.HapilProjectiles;
    var projectileOptional=projectiles&&projectiles.optionalAssetKeysForEncounter?projectiles.optionalAssetKeysForEncounter(group):[];
    var projectileRequired=projectiles&&projectiles.assetKeysForEncounter?projectiles.assetKeysForEncounter(group).filter(function(k){return projectileOptional.indexOf(k)<0;}):[];
    var keys=projectileOptional.slice();
    if(global.HapilBossSkills&&global.HapilBossSkills.optionalAssetKeysForEncounter)keys=keys.concat(global.HapilBossSkills.optionalAssetKeysForEncounter(group));
    // A source reused as a damaging bullet body remains required even when
    // its decorative skill presentation permits a missing cast accent.
    return keys.filter(function(k,i){return keys.indexOf(k)===i&&projectileRequired.indexOf(k)<0;});
  }
  function requiredAssetKeys(keys,group){var optional=optionalAssetKeys(group);return keys.filter(function(k){return optional.indexOf(k)<0;});}
  function queueOptionalAssets(keys,group){
    var optional=optionalAssetKeys(group).filter(function(k){return keys.indexOf(k)>=0;});
    // Decoration is allowed to load or fail in the background; do not delay a
    // playable encounter, and cancel it through the existing generation gate.
    loadImagesBounded(optional,function(){return encounterArtGroup===group&&!encounterArtPending&&mode!=='error';}).then(function(){if(encounterArtGroup===group)renderDirty=true;});
  }
  function buildAudio(media){
    try{if(media.music){audio.music=new Audio(media.music);audio.music.loop=true;audio.music.volume=.22;audio.music.preload='none';}
      ['shot','hurt'].forEach(function(kind){var url=media[kind+'Sound'];if(!url)return;for(var i=0;i<(kind==='shot'?3:2);i++){var a=new Audio(url);a.preload='none';a.volume=kind==='shot'?.12:.36;audio[kind].push(a);}});
    }catch(e){audio.music=null;}
  }
  function unlockAudio(){audio.unlocked=true;if(mode==='playing')startMusic();}
  function startMusic(){if(!audio.unlocked||!settings.music||!audio.music||mode!=='playing')return;try{var p=audio.music.play();if(p&&p.catch)p.catch(function(){});}catch(e){}}
  function stopMusic(){if(audio.music)try{audio.music.pause();}catch(e){}}
  function sound(kind){
    if(!audio.unlocked||!settings.sfx)return;var pool=audio[kind];if(!pool||!pool.length)return;
    if(kind==='shot'){var now=performance.now();if(now-audio.lastShot<95)return;audio.lastShot=now;}
    var name=kind+'Index',a=pool[audio[name]++%pool.length];try{a.currentTime=0;var p=a.play();if(p&&p.catch)p.catch(function(){});}catch(e){}
  }
  function saveCheckpointIfChanged(){
    if(!world||world.practiceBoss||!store||world.checkpointSerial===checkpointSerial||checkpointPending||performance.now()<checkpointRetryAt)return;
    var snap=core.checkpoint(world);if(!snap)return;
    var saveGeneration=campaignGeneration;checkpointPending=snap;
    store.saveCheckpoint(snap).then(function(result){
      if(saveGeneration!==campaignGeneration)return;
      if(saveGeneration<=lastFinalizedGeneration){if(checkpointPending===snap)checkpointPending=null;return;}
      if(checkpointPending!==snap){
        // Practice and title never write campaign progress, but a campaign save
        // already in flight may finish after navigating to either screen.
        if(result&&result.ok&&(!world||world.practiceBoss))confirmCheckpoint(snap,saveGeneration);
        return;
      }
      checkpointPending=null;
      if(!world){if(result&&result.ok)confirmCheckpoint(snap,saveGeneration);else updateStorage();return;}
      if(world.runId!==snap.runId)return;
      if(!result||!result.ok){checkpointRetryAt=performance.now()+2000;updateStorage();return;}
      checkpointSerial=snap.checkpointSerial;checkpointRetryAt=0;
      if(!completed)confirmCheckpoint(snap,saveGeneration);
    },function(){if(checkpointPending===snap){checkpointPending=null;checkpointRetryAt=performance.now()+2000;updateStorage();}});
  }
  function start(practice,retry,specialPhase){
    if(!ready||restorePending)return;if(!practice)campaignGeneration++;unlockAudio();clearInput();completed=false;checkpointSerial=-1;checkpointPending=null;checkpointRetryAt=0;
    lastSkill=null;skipIntroForRun=!!retry;
    if(!retry)seenBossIntros=Object.create(null);
    var retryWorld=world,selectedBoss=Number($('practice-select').value||0);
    var finalPractice=!!practice&&(retry&&retryWorld?!!retryWorld.finalPractice:selectedBoss===12);
    var practiceIndex=finalPractice?11:retry&&retryWorld&&retryWorld.practiceBoss?(retryWorld.bossIndex||0):selectedBoss>=13?selectedBoss-1:selectedBoss;
    var campaignRevision=retry&&retryWorld?retryWorld.campaignRevision:!practice||selectedBoss>=19?5:selectedBoss>=13?4:3;
    var campaign=retry&&retryWorld?!!retryWorld.campaign:true;
    var practiceStartPhase=practice?(retry&&retryWorld?retryWorld.practiceStartPhase||0:specialPhase===2?2:0):0;
    var seed=(Date.now()^Math.floor(performance.now()*1000))>>>0;
    try{world=core.createRun({difficulty:settings.difficulty,seed:seed,practiceBoss:!!practice,combatRevision:21,campaign:campaign,campaignRevision:campaign?campaignRevision:undefined,bossIndex:practice?practiceIndex:0,finalPractice:finalPractice});if(practice&&practiceStartPhase){var practiceSnapshot=core.checkpoint(world);practiceSnapshot.phase=practiceStartPhase;world=core.restoreCheckpoint(practiceSnapshot);if(!world)throw new Error('특수 패턴 연습을 시작하지 못했습니다.');}if(practice)world.practiceStartPhase=practiceStartPhase;world.skillRotation=settings.skillRotation;setMode('playing');accumulator=0;lastStamp=performance.now();lastRender=0;updateHUD();saveCheckpointIfChanged();if(practice)toast((world.bossName||'보스')+(practiceStartPhase===2?' 특수 패턴 연습 · 본편 기록은 유지됩니다':' 연습 · 해당 전투만 진행합니다'));$('game-canvas').focus({preventScroll:true});}
    catch(e){showError(e);}
  }
  function continueRun(){
    if(!ready||!savedCheckpoint||completionJobs>0||completionUncertain||restorePending||!store)return;
    // The user explicitly requested the latest stored progress. Lock the two
    // launch buttons until load adopts its revision and returns the matching
    // checkpoint, so a new run cannot accidentally inherit that revision.
    campaignGeneration++;var generation=campaignGeneration;
    restorePending=true;syncContinueAvailability();updateStorage();unlockAudio();clearInput();
    Promise.resolve().then(function(){return store.load();}).then(function(data){
      if(generation!==campaignGeneration||!restorePending)return;
      if(!data||data.ok===false||!Object.prototype.hasOwnProperty.call(data,'checkpoint'))throw new Error('checkpoint-load-failed');
      restoreError=false;profile=data.profile||profile;updateProfile();
      if(!data.checkpoint){savedCheckpoint=null;setHidden('continue-button',true);toast('이어갈 저장 구간이 없습니다.');return;}
      // Restore exactly the checkpoint whose revision load just adopted.
      var restored=core.restoreCheckpoint(data.checkpoint);
      savedCheckpoint=data.checkpoint;lastSkill=null;world=restored;world.skillRotation=settings.skillRotation;completed=false;checkpointPending=null;checkpointRetryAt=0;checkpointSerial=world.checkpointSerial;accumulator=0;lastStamp=performance.now();setMode('paused');safeText('pause-title','저장된 기억의 시작점');safeText('pause-description',world.combatRevision===21?'안전한 구간 시작점에서 이어갑니다.':'이 기록은 기존 전투를 유지합니다. 새 패턴은 새 게임이나 보스 연습에서 시작하세요.');updateHUD();$('resume-button').focus({preventScroll:true});
    }).catch(function(){
      if(generation!==campaignGeneration)return;
      restoreError=true;toast('저장 구간을 확인하지 못했습니다. 다시 시도하거나 기록을 내보내 주세요.');
    }).finally(function(){
      if(generation!==campaignGeneration)return;
      restorePending=false;syncContinueAvailability();updateStorage();
    });
  }
  function skipIntro(){
    if(mode!=='playing'||!world||world.stage!=='bossIntro'||!core.skipBossIntro)return;
    clearInput();
    if(core.skipBossIntro(world)){seenBossIntros[introKey()]=true;accumulator=0;lastStamp=performance.now();lastRender=0;syncIntroControls();updateHUD();saveCheckpointIfChanged();$('game-canvas').focus({preventScroll:true});}
  }
  function pause(reason){if(mode!=='playing')return;setMode('paused');accumulator=0;lastStamp=0;safeText('pause-title','잠시, 숨을 고르기');safeText('pause-description',reason||'준비되면 기억을 이어가세요.');$('resume-button').focus({preventScroll:true});}
  function resume(){if(mode!=='paused'||!world)return;unlockAudio();clearInput();accumulator=0;lastStamp=performance.now();lastRender=0;setMode('playing');$('game-canvas').focus({preventScroll:true});}
  function home(){setHidden('settings-modal',true);setMode('title');world=null;lastSkill=null;accumulator=0;syncSettings();updateStory();safeText('score-value','000000');safeText('resonance-value','0');document.querySelectorAll('.phase-list li').forEach(function(e){e.classList.remove('active');});setHidden('continue-button',!savedCheckpoint);syncContinueAvailability();updateStorage();$('start-button').focus({preventScroll:true});}
  function complete(){
    if(completed||!world)return;completed=true;setMode('result');var won=world.stage==='won';safeText('result-eyebrow',won?'MEMORY RESTORED':'A MEMORY REMAINS');safeText('result-title',won?(world.practiceBoss?'보스 연습 완료':world.campaign?(world.campaignRevision>=3?'일곱 검은 신호의 끝':'가면 너머의 새벽'):'첫 기억을 되찾았습니다'):'기억이 남았습니다');safeText('result-description',world.finalPractice?(won?world.resultReason:'제8부 최종전 독립 연습입니다. 본편 기록은 유지됩니다.'):world.practiceBoss?(world.bossName||'보스')+' 연습 기록 · 본편은 정원에서 이어집니다.':(won?(world.campaign?(world.campaignRevision>=3?'회장의 생체 부트로더와 연산핵을 무너뜨렸습니다. 일곱 검은 신호 편을 마쳤습니다.':'J의 인장으로 루시퍼가 물러납니다. 도움을 청할 길을 찾았습니다.'):'당신의 걸음이 회랑에 새겨졌습니다.'):'다음 걸음은 조금 더 멀리.'));if(world.campaignRevision===5&&!world.practiceBoss&&won){safeText('result-title','남겨진 몽세 · 몽세수호자');safeText('result-description',endingText());}else if(world.campaignRevision===4&&!world.practiceBoss&&won){safeText('result-title','환도 자아의 탄생');safeText('result-description',world.resultReason);}
    setHidden('ending-nav',true);if(won&&world.campaignRevision===5&&!world.practiceBoss)showEndingPage(0);
    if(world.practiceBoss&&world.practiceStartPhase===2){safeText('result-title',won?'특수 패턴 연습 완료':'특수 패턴 연습');safeText('result-description',(world.bossName||'보스')+' · 3번째 패턴 연습입니다. 본편 기록은 유지됩니다.');}
    safeText('result-score',pad(world.score));safeText('result-graze',world.graze||0);safeText('result-kills',world.kills||0);safeText('result-hits',world.stats?world.stats.hits:0);
    var resultRunId=world.runId,resultGeneration=campaignGeneration;
    if(store&&!world.practiceBoss){
      // Until completion and readback settle, the old run ID might already be
      // marked completed. Only 'continue' is disabled; other menus still work.
      lastFinalizedGeneration=Math.max(lastFinalizedGeneration,resultGeneration);completionJobs++;syncContinueAvailability();updateStorage();
      store.completeRun({runId:world.runId,score:world.score,graze:world.graze,kills:world.kills,difficulty:world.difficulty,won:won}).then(function(result){
        if(!result||result.ok===false)throw new Error('completion-write-failed');
        // Never adopt an external revision automatically, and do not even
        // request readback for an already replaced campaign generation.
        if(campaignGeneration!==resultGeneration)return null;
        if(typeof store.peek!=='function')throw new Error('completion-read-unavailable');
        return store.peek();
      }).then(function(data){
        if(campaignGeneration!==resultGeneration)return;
        if(!data||data.ok===false||!Object.prototype.hasOwnProperty.call(data,'checkpoint'))throw new Error('completion-read-failed');
        profile=data.profile||profile;updateProfile();
        // Newer campaign generations own their own checkpoint UI; a late old
        // readback cannot replace it, including after returning home.
        if(!world||world.runId===resultRunId||world.practiceBoss){savedCheckpoint=data.checkpoint||null;setHidden('continue-button',!savedCheckpoint);completionUncertain=false;}
      }).catch(function(){
        if(campaignGeneration===resultGeneration){completionUncertain=true;uncertainGeneration=resultGeneration;toast('기록 확인에 실패했습니다. 이어하기 전에 게임을 다시 열어주세요.');}
      }).finally(function(){completionJobs=Math.max(0,completionJobs-1);syncContinueAvailability();updateStorage();});
    }

    $('retry-button').focus({preventScroll:true});
  }
  function updateHUD(){
    if(!world)return;var p=world.player,html='';for(var i=0;i<p.maxHp;i++)html+='<span'+(i>=p.hp?' class="empty"':'')+'>'+(i<p.hp?'◆':'◇')+'</span>';if($('health-value').innerHTML!==html)$('health-value').innerHTML=html;$('health-value').setAttribute('aria-label','체력 '+p.hp+' / '+p.maxHp);
    safeText('score-value',pad(world.score));safeText('resonance-value',Math.floor(world.resonance||0));safeText('stage-label',world.campaign&&world.stage==='waves'?routeNote().title:(world.stageLabel||'기억의 입구'));var chapter=world.stage==='waves'?Math.min(3,(world.wave||0)+1):Math.min(3,(world.phase||0)+1);safeText('stage-count',(world.practiceBoss?'연습 · ':'')+pad(chapter,2)+' / 05');
    if(world.campaign){safeText('stage-count',world.practiceBoss?'패턴 '+((world.phase||0)+1)+' / 3':world.stage==='waves'?'구간 '+(routeOffset(world.bossIndex||0)+(world.wave||0)+1)+' / '+routeCount():'전투 구간 '+((world.bossIndex||0)+1)+' / '+runBossCount());}
    if(world.difficulty==='hell')safeText('stage-count','HELL · '+$('stage-count').textContent);
    updateStory();updateSkills();$('phase-wave').classList.toggle('active',world.stage==='waves');$('phase-boss').classList.toggle('active',world.stage==='boss'||world.stage==='bossIntro'||world.stage==='transition');$('phase-end').classList.toggle('active',world.stage==='won');
  }
  function drainEvents(){
    if(!world||!world.events)return;var events=world.events.splice(0,world.events.length),shot=false,hurt=false;
    for(var i=0;i<events.length;i++){var e=events[i];if(e.type==='shot')shot=true;else if(e.type==='hurt')hurt=true;else if(e.type==='skill'){if(skillNames[e.name]){lastSkill={name:e.name,tick:world.tick,runId:world.runId};updateSkills();}}else if(e.type==='phase')toast(world.patternName||'새로운 기억이 펼쳐집니다');else if(e.type==='summon')toast('적 증원 출현');}
    if(hurt)sound('hurt');else if(shot)sound('shot');
  }
  function inputForStep(){
    if(world&&world.stage==='bossIntro'){clearInput();return {dx:0,dy:0,focus:false};}
    var focus=!!keys.Shift,speed=(focus?120:240)/60,x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),y=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),n=Math.hypot(x,y);if(n){x=x/n*speed;y=y/n*speed;}
    // A held finger may stop moving before a speed-limited drag is consumed.
    // Keep its remaining distance; long frame gaps and pause still clear input.
    if(inputSource!=='pointer')return {dx:x,dy:y,focus:focus};
    var dragN=Math.hypot(pointer.pendingX,pointer.pendingY),dragScale=dragN>speed?speed/dragN:1,dx=pointer.pendingX*dragScale,dy=pointer.pendingY*dragScale;pointer.pendingX-=dx;pointer.pendingY-=dy;if(!pointer.active&&Math.abs(pointer.pendingX)<.001&&Math.abs(pointer.pendingY)<.001){pointer.pendingX=0;pointer.pendingY=0;inputSource='keyboard';}
    return {dx:dx,dy:dy,focus:focus};
  }
  function sample(name,value){var list=samples[name];if(list.length<maxSamples)list.push(value);else{var at=sampleCursor[name];list[at]=value;sampleCursor[name]=(at+1)%maxSamples;}}
  function distribution(values,peak){if(!values.length)return{p50:0,p95:0,peak:peak||0,samples:0};var a=values.slice().sort(function(x,y){return x-y;});return{p50:+a[Math.floor((a.length-1)*.5)].toFixed(3),p95:+a[Math.floor((a.length-1)*.95)].toFixed(3),peak:+(peak||a[a.length-1]).toFixed(3),samples:a.length};}
  function diagnostics(){
    var hazards=world&&world.hazards?world.hazards:[],heap=null;
    try{var m=performance.memory;if(m&&Number.isFinite(m.usedJSHeapSize))heap={usedBytes:m.usedJSHeapSize,totalBytes:m.totalJSHeapSize,limitBytes:m.jsHeapSizeLimit,scope:'Browser-reported JS heap estimate; excludes GPU and decoded media; GC not controlled'};}catch(e){}
    return {version:'hapil-laser-quality-v23',candidateRevision:23,mobileRuntime:mobileRuntime,loadedImages:Object.keys(images).length,imageRequestsPending:Object.keys(imageRequests).length,imageRequestsActive:imageActive,mechanicsRevision:world?world.mechanicsRevision:(core?core.MECHANICS_REVISION:2),combatRevision:world?world.combatRevision||0:21,connectedMapStatus:renderer&&renderer.getMetrics?renderer.getMetrics().sourceStatus||'not-yet-reported':'not-yet-reported',capturedAt:new Date().toISOString(),mode:mode,fixedHz:60,renderTarget:settings.quality==='low'?30:60,rollingWindow:maxSamples,measurementScope:{update:'Main-thread fixed-step simulation and event processing',render:'JavaScript canvas command submission only; not GPU completion',frame:'requestAnimationFrame callback intervals during play'},updateMs:distribution(samples.update,peakUpdate),renderMs:distribution(samples.render,peakRender),frameIntervalMs:distribution(samples.frame,peakFrame),renderedFrames:totalFrames,fixedSteps:totalSteps,pausedLargeGaps:droppedGaps,lastGapReason:lastGapReason,viewport:{width:global.innerWidth,height:global.innerHeight,dpr:global.devicePixelRatio||1,arenaWidth:$('app-stage').clientWidth,arenaHeight:$('app-stage').clientHeight,padHeight:$('touch-pad').clientHeight},entities:world?{bullets:world.bullets.length,shots:world.shots.length,enemies:world.enemies.length,effects:world.effects.length,laserWarnings:hazards.filter(function(h){return h.phase==='warning';}).length,activeLasers:hazards.filter(function(h){return h.phase==='active';}).length,fadingLasers:hazards.filter(function(h){return h.phase==='fade';}).length}:null,terrain:renderer&&renderer.getMetrics?renderer.getMetrics():null,jsHeapEstimate:heap,gpuTimeMs:null,coreStats:world?JSON.parse(JSON.stringify(world.stats||{})):null,assetErrors:assetErrors.slice(),storage:store?Object.assign({},store.status):null};
  }
  function ensureEncounterArt(){
    if(mode==='error')return false;
    var group=world?(world.finalPractice?12:world.campaign?(world.bossIndex>=12?world.bossIndex+1:world.bossIndex):-1):0;
    if(artLoadJob&&artLoadJob.group!==group){artLoadJob.cancelled=true;artLoadJob=null;encounterArtPending=false;artLoadGeneration++;}
    if(encounterArtPending)return false;
    if(encounterArtGroup===group)return true;
    var keysToLoad=mobileAssetKeys(group),requiredKeys=requiredAssetKeys(keysToLoad,group);
    var job={group:group,generation:++artLoadGeneration,cancelled:false};artLoadJob=job;
    encounterArtPending=true;encounterArtGroup=null;clearInput();accumulator=0;toast('다음 기억의 원화를 불러오는 중…');
    retainImageRequests(keysToLoad);
    Object.keys(images).forEach(function(k){if(keysToLoad.indexOf(k)<0)delete images[k];});
    function current(){return artLoadJob===job&&!job.cancelled&&job.generation===artLoadGeneration;}
    loadImagesBounded(requiredKeys,current).then(function(){
      if(!current())return;
      encounterArtPending=false;artLoadJob=null;
      if(requiredKeys.some(function(k){return !images[k];})||invalidActorAsset(images,group)||invalidDamageAsset(images,group)||invalidTerrainAsset(images,group)){showError(new Error('다음 구간의 원화를 불러오지 못했습니다. 연결을 확인한 뒤 다시 열어주세요.'));return;}
      Object.keys(images).forEach(function(k){if(keysToLoad.indexOf(k)<0)delete images[k];});
      encounterArtGroup=group;accumulator=0;lastStamp=performance.now();clearInput();renderDirty=true;queueOptionalAssets(keysToLoad,group);
    }).catch(function(error){if(current()){encounterArtPending=false;artLoadJob=null;showError(error);}});
    return false;
  }
  function frame(stamp){
    raf=requestAnimationFrame(frame);if(!renderer)return;
    if(!ensureEncounterArt()){lastStamp=stamp;accumulator=0;return;}
    if(!lastStamp)lastStamp=stamp;var elapsed=Math.max(0,(stamp-lastStamp)/1000);lastStamp=stamp;visualTime+=Math.min(elapsed,.05);
    if(mode==='playing'){
      if(elapsed>.75){droppedGaps++;lastGapReason='frame-gap-'+Math.round(elapsed*1000)+'ms';pause('화면이 오래 멈춰 전투를 일시정지했습니다.');}
      else {
        sample('frame',elapsed*1000);peakFrame=Math.max(peakFrame,elapsed*1000);if(elapsed>.08){droppedGaps++;if(pointer.active){pointer.pendingX=0;pointer.pendingY=0;}}accumulator=Math.min(accumulator+elapsed,3/60);
        var startUpdate=performance.now(),steps=0;
        try{while(accumulator>=1/60&&steps<5&&mode==='playing'){if(!ensureEncounterArt()){accumulator=0;break;}var previousStage=world.stage;core.step(world,inputForStep(),1/60);accumulator-=1/60;steps++;totalSteps++;if(previousStage!=='bossIntro'&&world.stage==='bossIntro'){clearInput();if(skipIntroForRun&&seenBossIntros[introKey()]&&core.skipBossIntro)core.skipBossIntro(world);}if(previousStage==='bossIntro'&&world.stage!=='bossIntro'){seenBossIntros[introKey()]=true;clearInput();}if(world.stage==='won'||world.stage==='lost')break;}}
        catch(e){showError(e);}
        var updateCost=performance.now()-startUpdate;if(steps){sample('update',updateCost/steps);peakUpdate=Math.max(peakUpdate,updateCost/steps);}drainEvents();saveCheckpointIfChanged();
        if(world&&(world.stage==='won'||world.stage==='lost'))complete();
      }
    }else accumulator=0;
    var target=settings.quality==='low'?1000/30:1000/60;
    var stableScreen=mode==='paused'||mode==='result';
    var needsDraw=!stableScreen||renderDirty||world!==lastDrawnWorld||(world&&world.tick)!==lastDrawnTick||mode!==lastDrawnMode;
    if(needsDraw&&!encounterArtPending&&(stamp-lastRender>=target-.7||!lastRender)){var rs=performance.now();try{renderer.draw(world,accumulator*60,visualTime,settings.quality==='low');}catch(error){showError(error);return;}var cost=performance.now()-rs;if(mode==='playing'){sample('render',cost);peakRender=Math.max(peakRender,cost);}lastRender=stamp;totalFrames++;renderDirty=false;lastDrawnWorld=world;lastDrawnTick=world&&world.tick;lastDrawnMode=mode;}
    syncIntroControls();if(stamp-lastHud>=120){updateHUD();lastHud=stamp;}
  }
  function pointerDown(e){if(mode!=='playing'||(world&&world.stage==='bossIntro')||pointer.active||e.button>0)return;e.preventDefault();unlockAudio();pointer.active=true;pointer.id=e.pointerId;pointer.lastX=e.clientX;pointer.lastY=e.clientY;pointer.pendingX=0;pointer.pendingY=0;pointer.lastMove=performance.now();inputSource='pointer';$('touch-pad').classList.add('active');try{e.currentTarget.setPointerCapture(e.pointerId);}catch(ignore){}}
  function pointerMove(e){if(!pointer.active||pointer.id!==e.pointerId||mode!=='playing')return;e.preventDefault();var rect=$('game-canvas').getBoundingClientRect(),scale=360/rect.width*Number(settings.sensitivity),dx=(e.clientX-pointer.lastX)*scale,dy=(e.clientY-pointer.lastY)*scale;pointer.lastX=e.clientX;pointer.lastY=e.clientY;pointer.lastMove=performance.now();inputSource='pointer';pointer.pendingX=Math.max(-60,Math.min(60,pointer.pendingX+dx));pointer.pendingY=Math.max(-60,Math.min(60,pointer.pendingY+dy));}
  function pointerUp(e){if(e.pointerId!==pointer.id)return;if(e.type==='pointerup')pointerMove(e);pointer.active=false;pointer.id=null;if(e.type!=='pointerup'){pointer.pendingX=0;pointer.pendingY=0;inputSource='keyboard';}$('touch-pad').classList.remove('active');}
  var layoutWidth=global.innerWidth;
  function resize(){if(mobileRuntime&&Math.abs(global.innerWidth-layoutWidth)<40){fit();return;}layoutWidth=global.innerWidth;if(mode==='playing')pause('화면 크기가 바뀌어 전투를 일시정지했습니다.');clearInput();accumulator=0;lastStamp=0;fit();}
  function openSettings(){settingsFocus=document.activeElement;settingsWasPlaying=mode==='playing';if(settingsWasPlaying)pause();setHidden('settings-modal',false);$('settings-close').focus({preventScroll:true});}
  function closeSettings(){setHidden('settings-modal',true);if(settingsFocus&&settingsFocus.focus)settingsFocus.focus({preventScroll:true});if(settingsWasPlaying){settingsWasPlaying=false;toast('설정을 저장했습니다. 전투 계속하기를 눌러주세요.');}}
  async function exportDiagnostics(){
    var data={measurements:diagnostics(),settings:Object.assign({},settings),run:world?{runId:world.runId,seed:world.seed,tick:world.tick,stage:world.stage,score:world.score,difficulty:world.difficulty,practiceBoss:!!world.practiceBoss}:null};
    if(store)try{data.savedData=await store.exportData();}catch(ignore){}
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hapil-firstbattle-measurements-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);toast('측정값과 독립 실행판 기록을 내보냈습니다.');return data;
  }
  function bind(){
    $('start-button').addEventListener('click',function(){start(false);});$('practice-button').addEventListener('click',function(){start(true);});$('special-practice-button').addEventListener('click',function(){start(true,false,2);});$('continue-button').addEventListener('click',continueRun);$('pause-button').addEventListener('click',function(){pause();});$('resume-button').addEventListener('click',resume);$('home-button').addEventListener('click',home);$('result-home-button').addEventListener('click',home);$('ending-prev').addEventListener('click',function(){showEndingPage(endingPage-1);});$('ending-next').addEventListener('click',function(){showEndingPage(endingPage+1);});$('retry-button').addEventListener('click',function(){start(!!(world&&world.practiceBoss),true);});$('intro-skip-button').addEventListener('click',skipIntro);$('reload-button').addEventListener('click',function(){global.location.reload();});
    document.querySelectorAll('[data-difficulty]').forEach(function(b){b.addEventListener('click',function(){settings.difficulty=b.dataset.difficulty;persistSettings();});});
    $('settings-button').addEventListener('click',openSettings);$('pause-settings-button').addEventListener('click',openSettings);$('settings-close').addEventListener('click',closeSettings);$('settings-modal').addEventListener('click',function(e){if(e.target===this)closeSettings();});
    [['music','music'],['sfx','sfx'],['skills','skillRotation']].forEach(function(pair){$('setting-'+pair[0]).addEventListener('change',function(){settings[pair[1]]=this.checked;persistSettings();});});
    $('setting-low').addEventListener('change',function(){settings.quality=this.checked?'low':'high';persistSettings();fit();});$('setting-sensitivity').addEventListener('input',function(){settings.sensitivity=Number(this.value);syncSettings();});$('setting-sensitivity').addEventListener('change',persistSettings);$('export-button').addEventListener('click',exportDiagnostics);
    [$('game-canvas'),$('touch-pad')].forEach(function(el){el.addEventListener('pointerdown',pointerDown);el.addEventListener('pointermove',pointerMove);el.addEventListener('pointerup',pointerUp);el.addEventListener('pointercancel',pointerUp);el.addEventListener('lostpointercapture',pointerUp);});
    $('game-canvas').tabIndex=-1;
    document.addEventListener('keydown',function(e){
      if(!$('settings-modal').hidden){if(e.key==='Escape'){e.preventDefault();closeSettings();}if(e.key==='Tab'){var focusables=$('settings-modal').querySelectorAll('button,input');var first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
      var key=e.key.length===1?e.key.toLowerCase():e.key;
      if(key==='Escape'||key===' '){if(mode==='playing'||mode==='paused'){e.preventDefault();if(!e.repeat){if(mode==='playing')pause();else resume();}}return;}
      if(mode!=='playing')return;if(world&&world.stage==='bossIntro'){e.preventDefault();if(key==='Enter'&&!e.repeat)skipIntro();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift'].indexOf(key)>=0){e.preventDefault();if(e.repeat&&!keys[key])return;keys[key]=true;if(key!=='Shift')inputSource='keyboard';}else if(key==='c'&&!e.repeat){e.preventDefault();settings.skillRotation=!settings.skillRotation;persistSettings();toast(settings.skillRotation?'스킬 자동 순환 켜짐':'스킬 자동 순환 꺼짐');}
    });
    document.addEventListener('keyup',function(e){var key=e.key.length===1?e.key.toLowerCase():e.key;delete keys[key];});
    document.addEventListener('visibilitychange',function(){if(document.hidden)pause('화면을 떠나 전투를 일시정지했습니다.');});global.addEventListener('blur',function(){pause('창을 떠나 전투를 일시정지했습니다.');clearInput();});global.addEventListener('resize',resize);if(global.visualViewport)global.visualViewport.addEventListener('resize',resize);
    document.querySelector('.wordmark').addEventListener('click',function(e){e.preventDefault();if(mode==='playing')pause();else if(mode!=='error')home();});
    global.addEventListener('pagehide',function(){stopMusic();clearInput();});
  }
  async function boot(){
    bind();fit();$('start-button').disabled=true;$('practice-button').disabled=true;$('special-practice-button').disabled=true;
    try{
      core=global.HapilCore;store=global.HapilStore;if(!core||!core.createRun||!core.step)throw new Error('전투 엔진을 찾지 못했습니다. 압축 파일 전체를 풀거나 단일 HTML 실행 파일을 사용해주세요.');if(!global.HapilRenderer)throw new Error('화면 렌더러 파일을 찾지 못했습니다.');
      var media=global.HapilMedia||{};setSkillEmblems(media);var bootKeys=mobileAssetKeys(0),bootRequired=requiredAssetKeys(bootKeys,0);retainImageRequests(bootKeys);await loadImagesBounded(bootRequired);if(bootRequired.some(function(k){return !images[k];})||invalidActorAsset(images,0)||invalidDamageAsset(images,0)||invalidTerrainAsset(images,0))throw new Error('시작 구간의 이미지를 불러오지 못했습니다. 연결을 확인하고 다시 열어주세요.');encounterArtGroup=0;queueOptionalAssets(bootKeys,0);
      if(assetErrors.indexOf('gunner')>=0||assetErrors.indexOf('boss')>=0)throw new Error('캐릭터 이미지를 읽지 못했습니다. media 폴더가 포함되어 있는지 확인하거나 단일 HTML 실행 파일을 사용해주세요.');
      renderer=global.HapilRenderer.create($('game-canvas'),images);fit();buildAudio(media);raf=requestAnimationFrame(frame);
      if(store){
        var opened=await store.open();
        if(!opened||opened.ok===false)restoreError=true;
        else {
          var data=await store.load();
          if(!data||data.ok===false)restoreError=true;
          else {
            if(data.hasStoredState===false){var initialSettings=await store.saveSettings(settings);if(!initialSettings||initialSettings.ok===false)restoreError=true;}
            else settings=Object.assign({},defaults,data.settings||{});
            profile=data.profile||{};savedCheckpoint=data.checkpoint||null;
          }
        }
      }syncSettings();updateStory();fit();updateProfile();updateStorage();setHidden('continue-button',!savedCheckpoint);ready=true;booting=false;syncContinueAvailability();
      // Optional cast art may fail without replacing it with another visual.
    }catch(e){booting=false;showError(e);}
  }
  global.HapilApp={invalidActorAsset:invalidActorAsset,getState:function(){return {mode:mode,paused:mode==='paused',ready:ready,booting:booting,settings:Object.assign({},settings),world:world?{tick:world.tick,time:world.time,stage:world.stage,runId:world.runId,player:{x:world.player.x,y:world.player.y,hp:world.player.hp,maxHp:world.player.maxHp,r:world.player.r},skillRotation:world.skillRotation,difficulty:world.difficulty,combatRevision:world.combatRevision||0,phase:world.phase,wave:world.wave,stageTime:world.stageTime,bossIntroDuration:world.bossIntroDuration,checkpointSerial:world.checkpointSerial,practiceBoss:!!world.practiceBoss,practiceStartPhase:world.practiceStartPhase||0,campaign:!!world.campaign,campaignRevision:world.campaignRevision,protagonist:world.protagonist,samongAwakened:!!world.samongAwakened,bossIndex:world.bossIndex,bossName:world.bossName,score:world.score}:null,pointer:{active:pointer.active,pendingX:pointer.pendingX,pendingY:pointer.pendingY}};},diagnostics:diagnostics,exportDiagnostics:exportDiagnostics,pause:pause,resume:resume};
  boot();
})(window);
