(function (global) {
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var mobileRuntime=global.matchMedia?global.matchMedia('(pointer: coarse)').matches:Math.min(global.innerWidth||999,global.innerHeight||999)<600;
  var defaults={music:true,sfx:true,quality:mobileRuntime?'low':'high',skillRotation:true,difficulty:'normal',sensitivity:1};
  var settings=Object.assign({},defaults),profile={},savedCheckpoint=null,world=null,renderer=null,images={};
  var mode='title',ready=false,booting=true,lastStamp=0,accumulator=0,lastRender=0,lastHud=0,visualTime=0,checkpointSerial=-1,completed=false;
  var keys=Object.create(null),pointer={active:false,id:null,lastX:0,lastY:0,pendingX:0,pendingY:0,lastMove:0},inputSource='keyboard',raf=0;
  var samples={update:[],render:[],frame:[]},totalFrames=0,totalSteps=0,droppedGaps=0,peakUpdate=0,peakRender=0,peakFrame=0,lastGapReason='',maxSamples=360;
  var audio={unlocked:false,music:null,shot:[],hurt:[],shotIndex:0,hurtIndex:0,lastShot:0},toastTimer=0,settingsWasPlaying=false,settingsFocus=null;
  var core=null,store=null,lastProfileRefresh=0,assetErrors=[];
  var encounterArtPending=false,encounterArtGroup=-1,artLoadJob=null,artLoadGeneration=0;
  var imageRequests=Object.create(null),imageQueue=[],imageActive=0,imageWanted=null;
  var renderDirty=true,lastDrawnWorld=null,lastDrawnTick=-1,lastDrawnMode='',lastFitKey='',lastFitRenderer=null;
  var seenBossIntros=Object.create(null),skipIntroForRun=false;
  // Presentation summaries of the supplied first-volume route. No new story
  // events, battle logic or save fields are introduced by this ledger.
  var routeNotes=[
    {title:'숲의 진입로',text:'검은 나무 너머로 무너진 궁전의 정원이 모습을 드러냅니다.'},
    {title:'악마화 나무의 정원',text:'날개까지 감은 뿌리. 이름을 잃은 천사 곁에서 동굴로 향하는 길이 열립니다.'},
    {title:'거미동굴',text:'뼈로 짠 거미줄 사이에서, 흰 날개와 여덟 다리의 그림자가 기다립니다.'},
    {title:'늪지대의 기억',text:'검은 물에서 익숙한 얼굴들이 떠오릅니다. 붙잡는 손 너머로 북쪽을 향합니다.'},
    {title:'무너진 성',text:'끊어진 봉인 사슬과 검은 재. 성 안쪽의 불길에 거대한 형상이 어른거립니다.'},
    {title:'시체들이 되살아난 밤',text:'불타는 성의 묘지에서, 함께했던 동료들을 적의 모습으로 다시 마주합니다.'},
    {title:'일곱 기둥',text:'소환진을 감싼 일곱 기둥. 문지기들을 지나 마지막 사슬 앞에 섭니다.'},
    {title:'추락 · 병원 복도',text:'소환진 너머로 추락한 뒤 눈을 뜬 병원. 낯선 복도에서 두려움이 환각의 형상을 얻습니다.'},
    {title:'주사실의 봉인 기억',text:'주사실에서 되돌아오는 기억. 자신이 풀어버린 봉인과 웃는 초천사의 그림자가 겹칩니다.'},
    {title:'환자와 중독의 도시',text:'반복되는 갈망과 환자들의 행렬. 완벽해져야 한다는 속삭임 너머로 길을 찾습니다.'},
    {title:'부정의 행렬',text:'나를 지키던 가면이 나를 가둡니다. 부정의 잔영 사이에서 자신의 목소리를 찾습니다.'},
    {title:'오만의 흰 가면',text:'도움을 청하는 것은 부끄러움이 아닙니다. 흰 날개 뒤에서 수많은 얼굴이 모습을 드러냅니다.'},
    {title:'도움을 청하는 문',text:'가면 안의 우주가 열립니다. 완벽함을 강요하는 루시퍼와 마주하고 J의 인장을 기억합니다.'}
  ];
  var bossNotes=[
    '흰 날개와 여덟 다리, 보랏빛 검. 한때 천사였던 그녀의 탄막 사이를 통과하세요.',
    '죽은 수호자의 기억을 매단 뿔. 검은 늪에서 번지는 탄막의 틈을 읽으세요.',
    '박쥐 날개와 황소의 뿔. 공간을 가르는 검과 하늘을 덮는 불덩이가 마지막 봉인을 지킵니다.',
    '흰 날개 아래 웃는 얼굴. 대칭의 깃털과 고정된 광선 사이에서 거짓 약속의 균열을 찾으세요.',
    '천구의 별자리, 가면의 이면, J의 인장. 세 문양을 지나 루시퍼를 물러나게 하세요.'
  ];
  var skillNames={memory:'기억 해방',delay:'시간 지연',counter:'반격',ego:'자아 각성'},lastSkill=null;
  function updateStory(){
    if(!world){safeText('chapter-caption','기억의 길 · 13구간');safeText('chapter-number','01');safeText('encounter-kicker','THE BROKEN SEAL');safeText('encounter-title','검은 정원에서 코스믹 가면 루시퍼까지');safeText('encounter-description','이름을 잃은 천사와 돌아온 동료들. 일곱 기둥 너머의 소환진으로 나아갑니다.');$('app').setAttribute('data-encounter','violet');return;}
    if(!world.campaign){$('app').setAttribute('data-encounter','violet');safeText('chapter-caption','첫 기억');safeText('chapter-number','01');safeText('encounter-kicker','A FRAGMENT OF MEMORY');safeText('encounter-title',world.stage==='waves'?'기억의 회랑':'보라검천사');safeText('encounter-description','숲길과 폐허를 지나 거미 동굴로 이어지는 첫 기억입니다.');return;}
    var boss=world.bossIndex||0,offset=[0,3,4,7,10][boss],wave=world.wave||0,index=Math.min(12,offset+(boss===1?0:wave)),note=routeNotes[index],isWave=world.stage==='waves'||(world.stage==='lost'&&!world.boss&&!world.practiceBoss);
    $('app').setAttribute('data-encounter',['violet','horn','balrog','mask','lucifer'][boss]);
    safeText('chapter-caption',world.practiceBoss?'보스 연습 · 3패턴':isWave?'기억의 길 · 13구간':'마지막 봉인으로');
    safeText('chapter-number',pad(world.practiceBoss?boss+1:isWave?index+1:offset+(boss===1?1:3),2));
    safeText('encounter-kicker',isWave?'FRAGMENT '+pad(index+1,2)+' / 13':world.practiceBoss?'PATTERN STUDY':'GUARDIAN '+pad(boss+1,2)+' / 05');
    safeText('encounter-title',isWave?note.title:world.bossName);
    safeText('encounter-description',isWave?note.text:bossNotes[boss]);
    if(world.stage==='won'&&!world.practiceBoss){safeText('encounter-kicker','BEYOND THE MASK');safeText('encounter-title','가면 너머의 새벽');safeText('encounter-description','J의 인장으로 루시퍼가 물러납니다. 모든 두려움이 사라진 것은 아니지만, 이제 도움을 청할 수 있습니다.');}
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
  function syncIntroControls(){var active=mode==='playing'&&world&&world.stage==='bossIntro';setHidden('intro-skip-button',!active);safeText('pad-caption',active?'보스 등장 · 잠시 뒤 전투가 이어집니다':'여기 또는 전투 화면을 드래그하세요');}
  function safeText(id,value){var element=$(id),text=value==null?'':String(value);if(element.textContent!==text)element.textContent=text;}
  function clearInput(){keys=Object.create(null);pointer.active=false;pointer.id=null;pointer.pendingX=0;pointer.pendingY=0;pointer.lastMove=0;inputSource='keyboard';$('touch-pad').classList.remove('active');}
  function toast(message){safeText('toast',message);setHidden('toast',false);clearTimeout(toastTimer);toastTimer=setTimeout(function(){setHidden('toast',true);},2200);}
  function showError(error){ready=false;mode='error';clearInput();setHidden('title-screen',true);setHidden('pause-screen',true);setHidden('result-screen',true);setHidden('error-screen',false);safeText('error-description',error&&error.message?error.message:String(error));$('pause-button').disabled=true;stopMusic();}
  function updateStorage(){var status=store&&store.status?store.status:{persistent:false,message:'이 세션에서만 기록됩니다.'};var message=(status.persistent?'':'임시 기록 · ')+(status.message|| (status.persistent?'이 독립 실행판에 자동 저장됩니다.':'브라우저가 영구 저장을 허용하지 않았습니다.'));var conflict=message.indexOf('다른 창')>=0;safeText('storage-status',message);$('storage-status').classList.toggle('warning',!status.persistent||conflict);safeText('mobile-storage-status',conflict?'다른 창의 기록 변경 · 다시 열어주세요':(status.persistent?'별도 기록에 자동 저장됩니다.':'임시 기록 · 이 세션에서만 유지됩니다.'));$('mobile-storage-status').classList.toggle('warning',!status.persistent||conflict);safeText('settings-storage',message+' 기존 합일의 저장 데이터와 분리됩니다.');}
  function updateProfile(){safeText('best-score',pad(profile.bestScore));safeText('profile-summary',profile.runs?('도전 '+profile.runs+'회 · 회랑 통과 '+(profile.wins||0)+'회'):'아직 기록된 기억이 없습니다.');}
  function syncSettings(){
    $('setting-music').checked=settings.music;$('setting-sfx').checked=settings.sfx;$('setting-skills').checked=settings.skillRotation;$('setting-low').checked=settings.quality==='low';$('setting-sensitivity').value=settings.sensitivity;safeText('sensitivity-value',Number(settings.sensitivity).toFixed(1)+'×');
    document.querySelectorAll('[data-difficulty]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.difficulty===settings.difficulty));});
    safeText('difficulty-description',settings.difficulty==='gentle'?'느린 탄속 · 체력 5 · 넉넉한 레이저 예고':'정원에서 코스믹 가면 루시퍼까지 · 탄막의 틈을 읽는 여정');safeText('skill-state',settings.skillRotation?'스킬 자동 순환':'스킬 순환 꺼짐');safeText('render-state',settings.quality==='low'?'30 FPS':'60 FPS');
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
        if(ok&&(!imageWanted||imageWanted[name]))images[name]=task.im;
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
    var enemyNames=[['Spider'],['Swamp'],['Ember'],['Echo','Vial'],['Guard','Denial']][group]||[];
    var motionKeys=['bossMotionViolet','bossMotionHorn','bossMotionBalrog','bossMotionMask','bossMotionLucifer'];
    var fxKeys=global.HapilProjectiles&&global.HapilProjectiles.assetKeysForEncounter?global.HapilProjectiles.assetKeysForEncounter(group):[];
    return Object.keys(global.HapilMedia).filter(function(k){
      if(['gunner','boss','spider','fxResonance','fxSlash','fxThorns','fxArrow','fxParry','fxSilk'].includes(k))return true;
      if(group===0&&(/^map\d+$/.test(k)||k==='violetCutin'))return true;
      if((group===-1||group===1||group===2)&&['forest','ruins','cave'].includes(k))return true;
      if(k===motionKeys[group]||fxKeys.indexOf(k)>=0)return true;
      return enemyNames.some(function(n){return k.indexOf('actor'+n)===0;});
    });
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
    if(!world||!store||world.checkpointSerial===checkpointSerial)return;checkpointSerial=world.checkpointSerial;
    var snap=core.checkpoint(world);if(!snap)return;
    store.saveCheckpoint(snap).then(function(result){if(result&&result.ok===false){updateStorage();}else if(!completed&&world&&world.runId===snap.runId){savedCheckpoint=snap;setHidden('continue-button',false);}});
  }
  function start(practice,retry){
    if(!ready)return;unlockAudio();clearInput();completed=false;checkpointSerial=-1;
    lastSkill=null;skipIntroForRun=!!retry;
    if(!retry)seenBossIntros=Object.create(null);
    var retryWorld=world,selectedBoss=Number($('practice-select').value||0);
    var practiceIndex=retry&&retryWorld&&retryWorld.practiceBoss?(retryWorld.bossIndex||0):selectedBoss;
    var campaign=retry&&retryWorld?!!retryWorld.campaign:true;
    var seed=(Date.now()^Math.floor(performance.now()*1000))>>>0;
    try{world=core.createRun({difficulty:settings.difficulty,seed:seed,practiceBoss:!!practice,campaign:campaign,bossIndex:practice?practiceIndex:0});world.skillRotation=settings.skillRotation;setMode('playing');accumulator=0;lastStamp=performance.now();lastRender=0;updateHUD();saveCheckpointIfChanged();if(practice)toast((world.bossName||'보스')+' 연습 · 해당 전투만 진행합니다');$('game-canvas').focus({preventScroll:true});}
    catch(e){showError(e);}
  }
  function continueRun(){
    if(!ready||!savedCheckpoint)return;unlockAudio();clearInput();
    try{lastSkill=null;world=core.restoreCheckpoint(savedCheckpoint);world.skillRotation=settings.skillRotation;completed=false;checkpointSerial=world.checkpointSerial;accumulator=0;lastStamp=performance.now();setMode('paused');safeText('pause-title','저장된 기억의 시작점');safeText('pause-description','안전한 구간 시작점에서 이어갑니다.');updateHUD();$('resume-button').focus({preventScroll:true});}
    catch(e){toast('저장된 구간을 읽지 못했습니다. 새 전투를 시작해주세요.');savedCheckpoint=null;setHidden('continue-button',true);}
  }
  function skipIntro(){
    if(mode!=='playing'||!world||world.stage!=='bossIntro'||!core.skipBossIntro)return;
    clearInput();
    if(core.skipBossIntro(world)){seenBossIntros[introKey()]=true;accumulator=0;lastStamp=performance.now();lastRender=0;syncIntroControls();updateHUD();saveCheckpointIfChanged();$('game-canvas').focus({preventScroll:true});}
  }
  function pause(reason){if(mode!=='playing')return;setMode('paused');accumulator=0;lastStamp=0;safeText('pause-title','잠시, 숨을 고르기');safeText('pause-description',reason||'준비되면 기억을 이어가세요.');$('resume-button').focus({preventScroll:true});}
  function resume(){if(mode!=='paused'||!world)return;unlockAudio();clearInput();accumulator=0;lastStamp=performance.now();lastRender=0;setMode('playing');$('game-canvas').focus({preventScroll:true});}
  function home(){setHidden('settings-modal',true);setMode('title');world=null;lastSkill=null;accumulator=0;syncSettings();updateStory();safeText('score-value','000000');safeText('resonance-value','0');document.querySelectorAll('.phase-list li').forEach(function(e){e.classList.remove('active');});setHidden('continue-button',!savedCheckpoint);$('start-button').focus({preventScroll:true});}
  function complete(){
    if(completed||!world)return;completed=true;setMode('result');var won=world.stage==='won';safeText('result-eyebrow',won?'MEMORY RESTORED':'A MEMORY REMAINS');safeText('result-title',won?(world.practiceBoss?'보스 연습 완료':world.campaign?'가면 너머의 새벽':'첫 기억을 되찾았습니다'):'기억이 남았습니다');safeText('result-description',world.practiceBoss?(world.bossName||'보스')+' 연습 기록 · 본편은 정원에서 이어집니다.':(won?(world.campaign?'J의 인장이 빛나고 루시퍼가 물러납니다. 완벽하지 않은 자신을 받아들이고 도움을 청할 길을 찾았습니다.':'당신의 걸음이 회랑에 새겨졌습니다.'):'다음 걸음은 조금 더 멀리.'));safeText('result-score',pad(world.score));safeText('result-graze',world.graze||0);safeText('result-kills',world.kills||0);safeText('result-hits',world.stats?world.stats.hits:0);savedCheckpoint=null;setHidden('continue-button',true);
    if(store){store.completeRun({runId:world.runId,score:world.score,graze:world.graze,kills:world.kills,difficulty:world.difficulty,won:won}).then(function(result){if(result&&result.ok===false){updateStorage();toast('기록 저장을 완료하지 못했습니다. 저장 상태를 확인해주세요.');return null;}return store.load();}).then(function(data){if(data){profile=data.profile||profile;updateProfile();updateStorage();}});}
    $('retry-button').focus({preventScroll:true});
  }
  function updateHUD(){
    if(!world)return;var p=world.player,html='';for(var i=0;i<p.maxHp;i++)html+='<span'+(i>=p.hp?' class="empty"':'')+'>'+(i<p.hp?'◆':'◇')+'</span>';if($('health-value').innerHTML!==html)$('health-value').innerHTML=html;$('health-value').setAttribute('aria-label','체력 '+p.hp+' / '+p.maxHp);
    safeText('score-value',pad(world.score));safeText('resonance-value',Math.floor(world.resonance||0));safeText('stage-label',world.stageLabel||'기억의 입구');var chapter=world.stage==='waves'?Math.min(3,(world.wave||0)+1):Math.min(3,(world.phase||0)+1);safeText('stage-count',(world.practiceBoss?'연습 · ':'')+pad(chapter,2)+' / 05');
    if(world.campaign){safeText('stage-count',world.stage==='waves'?'구간 '+([0,3,4,7,10][world.bossIndex||0]+(world.wave||0)+1)+' / 13':(world.practiceBoss?'연습 · ':'보스 ')+((world.bossIndex||0)+1)+' / 5');}
    updateStory();updateSkills();$('phase-wave').classList.toggle('active',world.stage==='waves');$('phase-boss').classList.toggle('active',world.stage==='boss'||world.stage==='bossIntro'||world.stage==='transition');$('phase-end').classList.toggle('active',world.stage==='won');
  }
  function drainEvents(){
    if(!world||!world.events)return;var events=world.events.splice(0,world.events.length),shot=false,hurt=false;
    for(var i=0;i<events.length;i++){var e=events[i];if(e.type==='shot')shot=true;else if(e.type==='hurt')hurt=true;else if(e.type==='skill'){if(skillNames[e.name]){lastSkill={name:e.name,tick:world.tick,runId:world.runId};updateSkills();}}else if(e.type==='phase')toast(world.patternName||'새로운 기억이 펼쳐집니다');}
    if(hurt)sound('hurt');else if(shot)sound('shot');
  }
  function inputForStep(){
    if(world&&world.stage==='bossIntro'){clearInput();return {dx:0,dy:0,focus:false};}
    var focus=!!keys.Shift,speed=(focus?120:240)/60,x=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),y=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),n=Math.hypot(x,y);if(n){x=x/n*speed;y=y/n*speed;}
    if(performance.now()-pointer.lastMove>50){pointer.pendingX=0;pointer.pendingY=0;}
    if(inputSource!=='pointer')return {dx:x,dy:y,focus:focus};
    var dragN=Math.hypot(pointer.pendingX,pointer.pendingY),dragScale=dragN>speed?speed/dragN:1,dx=pointer.pendingX*dragScale,dy=pointer.pendingY*dragScale;pointer.pendingX-=dx;pointer.pendingY-=dy;
    return {dx:dx,dy:dy,focus:focus};
  }
  function sample(name,value){var list=samples[name];list.push(value);if(list.length>maxSamples)list.shift();}
  function distribution(values,peak){if(!values.length)return{p50:0,p95:0,peak:peak||0,samples:0};var a=values.slice().sort(function(x,y){return x-y;});return{p50:+a[Math.floor((a.length-1)*.5)].toFixed(3),p95:+a[Math.floor((a.length-1)*.95)].toFixed(3),peak:+(peak||a[a.length-1]).toFixed(3),samples:a.length};}
  function diagnostics(){
    var hazards=world&&world.hazards?world.hazards:[],heap=null;
    try{var m=performance.memory;if(m&&Number.isFinite(m.usedJSHeapSize))heap={usedBytes:m.usedJSHeapSize,totalBytes:m.totalJSHeapSize,limitBytes:m.jsHeapSizeLimit,scope:'Browser-reported JS heap estimate; excludes GPU and decoded media; GC not controlled'};}catch(e){}
    return {version:'hapil-lucifer-v8',candidateRevision:8,mobileRuntime:mobileRuntime,loadedImages:Object.keys(images).length,imageRequestsPending:Object.keys(imageRequests).length,imageRequestsActive:imageActive,mechanicsRevision:world?world.mechanicsRevision:(core?core.MECHANICS_REVISION:2),connectedMapStatus:renderer&&renderer.getMetrics?renderer.getMetrics().sourceStatus||'not-yet-reported':'not-yet-reported',capturedAt:new Date().toISOString(),mode:mode,fixedHz:60,renderTarget:settings.quality==='low'?30:60,rollingWindow:maxSamples,measurementScope:{update:'Main-thread fixed-step simulation and event processing',render:'JavaScript canvas command submission only; not GPU completion',frame:'requestAnimationFrame callback intervals during play'},updateMs:distribution(samples.update,peakUpdate),renderMs:distribution(samples.render,peakRender),frameIntervalMs:distribution(samples.frame,peakFrame),renderedFrames:totalFrames,fixedSteps:totalSteps,pausedLargeGaps:droppedGaps,lastGapReason:lastGapReason,viewport:{width:global.innerWidth,height:global.innerHeight,dpr:global.devicePixelRatio||1,arenaWidth:$('app-stage').clientWidth,arenaHeight:$('app-stage').clientHeight,padHeight:$('touch-pad').clientHeight},entities:world?{bullets:world.bullets.length,shots:world.shots.length,enemies:world.enemies.length,effects:world.effects.length,laserWarnings:hazards.filter(function(h){return h.phase==='warning';}).length,activeLasers:hazards.filter(function(h){return h.phase==='active';}).length,fadingLasers:hazards.filter(function(h){return h.phase==='fade';}).length}:null,terrain:renderer&&renderer.getMetrics?renderer.getMetrics():null,jsHeapEstimate:heap,gpuTimeMs:null,coreStats:world?JSON.parse(JSON.stringify(world.stats||{})):null,assetErrors:assetErrors.slice(),storage:store?Object.assign({},store.status):null};
  }
  function ensureEncounterArt(){
    if(mode==='error')return false;
    var group=world?(world.campaign?world.bossIndex:-1):0;
    if(artLoadJob&&artLoadJob.group!==group){artLoadJob.cancelled=true;artLoadJob=null;encounterArtPending=false;artLoadGeneration++;}
    if(encounterArtPending)return false;
    if(encounterArtGroup===group)return true;
    var keysToLoad=mobileAssetKeys(group);
    var job={group:group,generation:++artLoadGeneration,cancelled:false};artLoadJob=job;
    encounterArtPending=true;encounterArtGroup=null;clearInput();accumulator=0;toast('다음 기억의 원화를 불러오는 중…');
    retainImageRequests(keysToLoad);
    Object.keys(images).forEach(function(k){if(keysToLoad.indexOf(k)<0)delete images[k];});
    function current(){return artLoadJob===job&&!job.cancelled&&job.generation===artLoadGeneration;}
    loadImagesBounded(keysToLoad,current).then(function(){
      if(!current())return;
      encounterArtPending=false;artLoadJob=null;
      if(keysToLoad.some(function(k){return !images[k];})){showError(new Error('다음 구간의 원화를 불러오지 못했습니다. 연결을 확인한 뒤 다시 열어주세요.'));return;}
      Object.keys(images).forEach(function(k){if(keysToLoad.indexOf(k)<0)delete images[k];});
      encounterArtGroup=group;accumulator=0;lastStamp=performance.now();clearInput();renderDirty=true;
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
        sample('frame',elapsed*1000);peakFrame=Math.max(peakFrame,elapsed*1000);if(elapsed>.08){droppedGaps++;pointer.pendingX=0;pointer.pendingY=0;}accumulator=Math.min(accumulator+elapsed,3/60);
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
  function pointerUp(e){if(e.pointerId!==pointer.id)return;pointer.active=false;pointer.id=null;pointer.pendingX=0;pointer.pendingY=0;inputSource='keyboard';$('touch-pad').classList.remove('active');}
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
    $('start-button').addEventListener('click',function(){start(false);});$('practice-button').addEventListener('click',function(){start(true);});$('continue-button').addEventListener('click',continueRun);$('pause-button').addEventListener('click',function(){pause();});$('resume-button').addEventListener('click',resume);$('home-button').addEventListener('click',home);$('result-home-button').addEventListener('click',home);$('retry-button').addEventListener('click',function(){start(!!(world&&world.practiceBoss),true);});$('intro-skip-button').addEventListener('click',skipIntro);$('reload-button').addEventListener('click',function(){global.location.reload();});
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
    bind();fit();$('start-button').disabled=true;$('practice-button').disabled=true;
    try{
      core=global.HapilCore;store=global.HapilStore;if(!core||!core.createRun||!core.step)throw new Error('전투 엔진을 찾지 못했습니다. 압축 파일 전체를 풀거나 단일 HTML 실행 파일을 사용해주세요.');if(!global.HapilRenderer)throw new Error('화면 렌더러 파일을 찾지 못했습니다.');
      var media=global.HapilMedia||{};setSkillEmblems(media);var bootKeys=mobileAssetKeys(0);await loadImagesBounded(bootKeys);if(bootKeys.some(function(k){return !images[k];}))throw new Error('시작 구간의 이미지를 불러오지 못했습니다. 연결을 확인하고 다시 열어주세요.');encounterArtGroup=0;
      if(assetErrors.indexOf('gunner')>=0||assetErrors.indexOf('boss')>=0)throw new Error('캐릭터 이미지를 읽지 못했습니다. media 폴더가 포함되어 있는지 확인하거나 단일 HTML 실행 파일을 사용해주세요.');
      renderer=global.HapilRenderer.create($('game-canvas'),images);fit();buildAudio(media);raf=requestAnimationFrame(frame);
      if(store){await store.open();var data=await store.load();if(data){settings=Object.assign({},defaults,data.settings||{});profile=data.profile||{};savedCheckpoint=data.checkpoint||null;}}if(mobileRuntime)settings.quality='low';syncSettings();updateStory();fit();updateProfile();updateStorage();setHidden('continue-button',!savedCheckpoint);ready=true;booting=false;$('start-button').disabled=false;$('practice-button').disabled=false;
      if(assetErrors.length)toast('일부 이미지를 읽지 못해 기본 연출로 표시합니다.');
    }catch(e){booting=false;showError(e);}
  }
  global.HapilApp={getState:function(){return {mode:mode,paused:mode==='paused',ready:ready,booting:booting,settings:Object.assign({},settings),world:world?{tick:world.tick,time:world.time,stage:world.stage,runId:world.runId,player:{x:world.player.x,y:world.player.y,hp:world.player.hp,maxHp:world.player.maxHp,r:world.player.r},skillRotation:world.skillRotation,difficulty:world.difficulty,phase:world.phase,wave:world.wave,stageTime:world.stageTime,bossIntroDuration:world.bossIntroDuration,checkpointSerial:world.checkpointSerial,practiceBoss:!!world.practiceBoss,campaign:!!world.campaign,bossIndex:world.bossIndex,bossName:world.bossName,score:world.score}:null,pointer:{active:pointer.active,pendingX:pointer.pendingX,pendingY:pointer.pendingY}};},diagnostics:diagnostics,exportDiagnostics:exportDiagnostics,pause:pause,resume:resume};
  boot();
})(window);
