/* 합일 v37 · 전투 음향 연출.
 * 전투 규칙(core)을 읽기만 하고 절대 쓰지 않는다. 모든 소리는 Web Audio로
 * 그 자리에서 합성하므로 외부 음원 파일·라이선스 의존이 없다.
 * 관찰(collect)과 합성(create)을 분리해 관찰 규칙은 브라우저 없이 검사한다. */
(function(root){
  'use strict';
  // gap: 같은 신호의 최소 간격(ms) · level: 마스터 이전 음량 · rank: 동시 발음이 많을 때 남길 우선순위
  var CUES={
    graze:{gap:48,level:.14,rank:1},
    item:{gap:70,level:.12,rank:0},
    bomb:{gap:400,level:.42,rank:5},
    bossHit:{gap:90,level:.1,rank:0},
    bossHitLow:{gap:90,level:.12,rank:1},
    kill:{gap:80,level:.22,rank:2},
    hurt:{gap:220,level:.5,rank:5},
    charge:{gap:420,level:.32,rank:4},
    bossCutin:{gap:1500,level:.32,rank:5},
    laserWarn:{gap:380,level:.2,rank:3},
    laserFire:{gap:260,level:.34,rank:4},
    skillMemory:{gap:200,level:.15,rank:3},
    skillDelay:{gap:200,level:.2,rank:3},
    skillCounter:{gap:160,level:.24,rank:3},
    skillEgo:{gap:400,level:.18,rank:3},
    phaseBreak:{gap:500,level:.4,rank:5},
    summon:{gap:500,level:.24,rank:3},
    seal:{gap:300,level:.3,rank:4},
    awakening:{gap:900,level:.34,rank:5},
    warning:{gap:1500,level:.26,rank:4},
    win:{gap:1500,level:.44,rank:5},
    lose:{gap:1500,level:.4,rank:5},
    heartbeat:{gap:700,level:.3,rank:2},
    countdown:{gap:400,level:.17,rank:2},
    countdownLast:{gap:400,level:.18,rank:3},
    // 시계 소리(사용자 11-18 "시계소리도 적절히 사용"): 시간을 다루는 패턴 이름·서하의 시간 기술·시공간 왜곡·막판 초읽기에만 쓴다. 배경음보다 크고 효과음 중에선 작게.
    groove:{gap:120,level:.15,rank:1},
    grooveAccent:{gap:120,level:.22,rank:2},
    clockTick:{gap:300,level:.15,rank:2},
    clockSlow:{gap:800,level:.2,rank:3},
    clockChime:{gap:900,level:.2,rank:3},
    // 위험마다 소리와 움직임을 짝짓는다(11-20 연출 검토): 솟는 먹물은 낮은 두드림(레이저의 상승 예고음과 구별), 대수문장 빗장의 금속음·풀림, 환도 세 박자, 스펠 첫 획.
    inkSwell:{gap:380,level:.26,rank:3},
    gateClang:{gap:300,level:.24,rank:3},
    boltRelease:{gap:200,level:.2,rank:3},
    hwandoThree:{gap:2000,level:.3,rank:4},
    brushStroke:{gap:400,level:.2,rank:2},
    // 영웅 공격 손맛(사용자 11-20 "기억사수 모든공격 롤제리 느낌", "서하 … 시간폭탄"): 짧은 고역 지지직·작은 째깍·낮은 터짐. 배경음보다 크되 적 위험음보다 작게, 귀 아픈 고음은 대역 필터로 깎는다.
    // 적중음(사용자 11-20): 빗소리 조각을 무작위로 번갈아 튼다. 오래 들어도 피곤하지 않게 간격을 두고 음량은 낮게(배경음보다 크되 적 위험음보다 작게).
    rainHitMemory:{gap:90,level:.1,rank:0},
    rainHitSeoha:{gap:110,level:.095,rank:0},
    sparkFire:{gap:110,level:.09,rank:1},
    sparkHit:{gap:90,level:.11,rank:1},
    tbStick:{gap:150,level:.12,rank:1},
    tbBoom:{gap:140,level:.17,rank:2},
    // 리듬 레이저(사용자 11-20 "리듬게임을 레이져 패턴으로 구현한 느낌"): 음표가 켜지는 박에 북(쿵 왼손·덕 오른손·덩 양손)과 가야금 다섯 음(황·태·중·임·남). 배경음보다 크고 귀 아픈 고음 없이.
    noteKung:{gap:50,level:.24,rank:2},
    noteDeok:{gap:50,level:.19,rank:2},
    noteDung:{gap:50,level:.27,rank:2},
    notePluck0:{gap:50,level:.17,rank:2},
    notePluck1:{gap:50,level:.17,rank:2},
    notePluck2:{gap:50,level:.17,rank:2},
    notePluck3:{gap:50,level:.17,rank:2},
    notePluck4:{gap:50,level:.17,rank:2}
  };
  // 'phase' 이벤트는 다음 패턴·구간이 시작될 때 나오므로 격파음에 쓰지 않는다(격파는 아래 단계 전환으로 잡는다).
  var EVENT_CUES={hurt:'hurt',kill:'kill',summon:'summon',seal:'seal',release:'seal',awakening:'awakening',win:'win',lose:'lose'};
  var SKILL_CUES={memory:'skillMemory',delay:'skillDelay',counter:'skillCounter',ego:'skillEgo'};
  var STAGE_BOSS='boss',STAGE_WAVE='waves',STAGE_INTRO='bossIntro',STAGE_BREAK='transition';
  var FIELD_WIDTH=360,LOW_BOSS_HEALTH=.2,COUNTDOWN_SECONDS=10,HEARTBEAT_TICKS=66,MAX_TRACKED_LASERS=96;

  function newState(){return {runId:null,graze:0,hitUntil:0,action:'',stage:'',lasers:Object.create(null),laserCount:0,heartbeatAt:0,countdown:-1};}
  function pan(x){return typeof x==='number'&&isFinite(x)?Math.max(-1,Math.min(1,(x/FIELD_WIDTH-.5)*1.4)):0;}
  function adopt(state,world){
    var boss=world.boss;
    state.runId=world.runId;state.graze=world.graze||0;state.hitUntil=boss?boss.hitUntil||0:0;state.action=boss?boss.action||'':'';
    state.stage=world.stage;state.lasers=Object.create(null);state.laserCount=0;state.heartbeatAt=0;state.countdown=-1;
    var hazards=world.hazards||[];
    for(var i=0;i<hazards.length&&state.laserCount<MAX_TRACKED_LASERS;i++)if(hazards[i].kind==='laser'){state.lasers[hazards[i].id]=hazards[i].phase;state.laserCount++;}
  }
  /* 직전 관찰과 현재 world·이번 프레임 이벤트를 비교해 울릴 신호 목록을 돌려준다.
   * world와 events는 수정하지 않는다. 새 판·이어하기 직후 첫 관찰은 기준만 잡고 소리를 내지 않는다. */
  function collect(state,world,events){
    var cues=[];if(!world)return cues;
    if(state.runId!==world.runId){adopt(state,world);if(world.stage===STAGE_INTRO)cues.push({name:'warning',pan:0});return cues;}
    var i,boss=world.boss,player=world.player||{},bossPan=boss?pan(boss.x):0,playerPan=pan(player.x);
    for(i=0;events&&i<events.length;i++){
      var e=events[i],name=e.type==='skill'?SKILL_CUES[e.name]:EVENT_CUES[e.type];
      if(name)cues.push({name:name,pan:name==='hurt'||name.indexOf('skill')===0?playerPan:bossPan});
    }
    var graze=world.graze||0;if(graze>state.graze)cues.push({name:'graze',pan:playerPan,count:graze-state.graze});state.graze=graze;
    var hitUntil=boss?boss.hitUntil||0:0;
    if(boss&&hitUntil>state.hitUntil)cues.push({name:boss.maxHp>0&&boss.hp/boss.maxHp<=LOW_BOSS_HEALTH?'bossHitLow':'bossHit',pan:bossPan});
    state.hitUntil=hitUntil;
    var action=boss?boss.action||'':'';if(action==='charge'&&state.action!=='charge')cues.push({name:'charge',pan:bossPan});state.action=action;
    // 광선이 없는 대부분의 프레임에서는 추적표를 새로 만들지 않는다.
    var hazards=world.hazards||[],idle=!hazards.length&&!state.laserCount,live=idle?state.lasers:Object.create(null),liveCount=0,warned=0,fired=0,firePan=0;
    for(i=0;i<hazards.length;i++){
      var h=hazards[i];if(h.kind!=='laser'||liveCount>=MAX_TRACKED_LASERS)continue;
      var before=state.lasers[h.id];live[h.id]=h.phase;liveCount++;
      if(h.phase==='warning'&&before===undefined)warned++;
      else if(h.phase==='active'&&before!=='active'){fired++;firePan+=pan((h.x1+h.x2)/2);}
    }
    state.lasers=live;state.laserCount=liveCount;
    if(warned)cues.push({name:'laserWarn',pan:bossPan,count:warned});
    if(fired)cues.push({name:'laserFire',pan:firePan/fired,count:fired});
    if(world.stage!==state.stage&&world.stage===STAGE_INTRO)cues.push({name:'warning',pan:0});
    // 보스 패턴이 실제로 격파된 틱: boss → transition.
    if(state.stage===STAGE_BOSS&&world.stage===STAGE_BREAK)cues.push({name:'phaseBreak',pan:bossPan});
    state.stage=world.stage;
    var fighting=world.stage===STAGE_BOSS||world.stage===STAGE_WAVE;
    if(fighting&&player.hp===1&&player.maxHp>1){if(world.tick>=state.heartbeatAt){cues.push({name:'heartbeat',pan:0});state.heartbeatAt=world.tick+HEARTBEAT_TICKS;}}
    else state.heartbeatAt=0;
    var left=world.stage===STAGE_BOSS&&world.phaseTimeout>0?Math.ceil(world.phaseTimeout-world.phaseTime):-1;
    if(left>=1&&left<=COUNTDOWN_SECONDS&&left!==state.countdown&&state.countdown!==-1)cues.push({name:left<=3?'countdownLast':'countdown',pan:0});
    state.countdown=left>=1&&left<=COUNTDOWN_SECONDS+1?left:-1;
    return cues;
  }

  function create(options){
    options=options||{};
    var Ctor=options.AudioContext||root.AudioContext||root.webkitAudioContext;
    var clock=options.now||function(){return root.performance&&root.performance.now?root.performance.now():Date.now();};
    var ctx=null,master=null,noiseBuffer=null,enabled=true,suspended=false,volume=1,state=newState(),last=Object.create(null),voices=0,played=0,skipped=0,failed=false,active=[],background=!!(root.document&&root.document.hidden),pageAway=false,listening=false;
    var MAX_VOICES=28,MASTER_LEVEL=.55;

    function visibility(){background=!!(root.document&&root.document.hidden);applyLevel();if(background)stopVoices();}
    function pagehide(){pageAway=true;applyLevel();stopVoices();}
    function pageshow(){pageAway=false;visibility();}
    function listen(on){
      if(listening===on)return;listening=on;var action=on?'addEventListener':'removeEventListener';
      if(root.document&&root.document[action])root.document[action]('visibilitychange',visibility);
      if(root[action]){root[action]('pagehide',pagehide);root[action]('pageshow',pageshow);}
    }
    function ensure(){
      listen(true);
      if(ctx&&ctx.state==='closed'){ctx=null;master=null;noiseBuffer=null;}
      if(ctx||failed||!Ctor)return !!ctx;
      try{
        ctx=new Ctor();master=ctx.createGain();applyLevel();
        var limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=10;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
        master.connect(limiter);limiter.connect(ctx.destination);
        var length=Math.floor(ctx.sampleRate*.6),seed=0x2545f491;noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);var data=noiseBuffer.getChannelData(0);
        for(var i=0;i<length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=((seed>>>0)/2147483648)-1;}
      }catch(e){failed=true;ctx=null;master=null;}
      return !!ctx;
    }
    function unlock(){if(!ensure())return false;if(ctx.state!=='running'&&ctx.resume){try{var p=ctx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}}return true;}
    function applyLevel(){if(master)master.gain.value=enabled&&!suspended&&!background&&!pageAway?MASTER_LEVEL*volume:0;}
    function disconnect(node){if(node&&node.disconnect)try{node.disconnect();}catch(e){}}
    function stopVoices(){
      active.slice().forEach(function(v){try{v.source.stop();}catch(e){}v.finish();});
    }
    function out(panValue){
      if(!panValue||!ctx.createStereoPanner)return master;
      var node=ctx.createStereoPanner();node.pan.value=panValue;node.connect(master);return node;
    }
    function envelope(gainNode,at,attack,hold,level){
      var g=gainNode.gain;g.setValueAtTime(.0001,at);g.exponentialRampToValueAtTime(Math.max(.0002,level),at+attack);g.exponentialRampToValueAtTime(.0001,at+attack+hold);
    }
    function finish(source,at,length,nodes,dest){
      var done=false,entry={source:source,finish:cleanup,dest:dest};
      function cleanup(){
        if(done)return;done=true;var i=active.indexOf(entry);if(i>=0)active.splice(i,1);voices=Math.max(0,voices-1);
        disconnect(source);nodes.forEach(disconnect);
        if(dest!==master&&!active.some(function(v){return v.dest===dest;}))disconnect(dest);
      }
      voices++;active.push(entry);source.onended=cleanup;
      try{source.start(at);source.stop(at+length+.03);}catch(e){cleanup();throw e;}
    }
    // 음정이 있는 한 음: from→to Hz로 미끄러지며 사라진다.
    function tone(dest,shape,from,to,length,level,delay,attack){
      var at=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();o.type=shape;
      o.frequency.setValueAtTime(from,at);if(to!==from)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);
      envelope(g,at,attack||.004,length,level);o.connect(g);g.connect(dest);finish(o,at,length,[g],dest);
    }
    // 걸러낸 잡음: 타격·폭발·바람 소리의 몸통.
    function noise(dest,filterType,from,to,q,length,level,delay,attack){
      var at=ctx.currentTime+(delay||0),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;s.loop=true;
      f.type=filterType;f.Q.value=q;f.frequency.setValueAtTime(from,at);if(to!==from)f.frequency.exponentialRampToValueAtTime(Math.max(30,to),at+length);
      envelope(g,at,attack||.003,length,level);s.connect(f);f.connect(g);g.connect(dest);finish(s,at,length,[f,g],dest);
    }
    function bell(dest,base,length,level,delay){tone(dest,'sine',base,base,length,level,delay,.002);tone(dest,'sine',base*2.76,base*2.76,length*.55,level*.35,delay,.002);tone(dest,'sine',base*5.4,base*5.4,length*.3,level*.16,delay,.002);}
    // 빗방울 조각 한 번: 직전과 다른 조각, 음높이 ±6%·음량 ±15% 변화. 조각은 컨텍스트마다 한 번만 버퍼로 만든다.
    var rainBuf=Object.create(null),rainLast=Object.create(null),rainSeed=0x1f3d5b79;
    function rainHit(d,l,name,c){
      var bank=root.HapilRainHit;if(!bank||!ctx)return;var b=rainBuf[name];
      if(!b){var dec=bank.decode(name);if(!dec)return;b=rainBuf[name]={dec:dec,buf:ctx.createBuffer(1,dec.samples.length,dec.rate)};b.buf.getChannelData(0).set(dec.samples);}
      rainSeed^=rainSeed<<13;rainSeed^=rainSeed>>>17;rainSeed^=rainSeed<<5;var r=(rainSeed>>>0)/4294967296;
      var n=b.dec.count,k=Math.floor(r*n),prev=rainLast[name];if(k===prev)k=(k+1)%n;rainLast[name]=k;
      rainSeed^=rainSeed<<13;rainSeed^=rainSeed>>>17;rainSeed^=rainSeed<<5;var r2=(rainSeed>>>0)/4294967296;
      var at=ctx.currentTime,src=ctx.createBufferSource(),g=ctx.createGain(),len=b.dec.len/b.dec.rate;
      src.buffer=b.buf;src.playbackRate.value=.94+r2*.12;g.gain.value=l*(.85+((rainSeed>>>8)&255)/255*.3)*((c&&c.power)||1);
      src.connect(g);g.connect(d);
      var done=false,entry={source:src,dest:d,finish:rainDone};
      function rainDone(){if(done)return;done=true;var i=active.indexOf(entry);if(i>=0)active.splice(i,1);voices=Math.max(0,voices-1);disconnect(src);disconnect(g);if(d!==master&&!active.some(function(v){return v.dest===d;}))disconnect(d);}
      voices++;active.push(entry);src.onended=rainDone;
      try{src.start(at,k*b.dec.len/b.dec.rate,len/src.playbackRate.value+.01);}catch(e){rainDone();throw e;}
    }
    var jitter=0;function vary(){jitter=(jitter+1)%5;return 1+(jitter-2)*.035;}

    var VOICE={
      // 스치기·아이템은 작고 부드럽게: 귀를 찌르는 고음을 빼고 음높이만 조금씩 바꾼다.
      graze:function(d,l,c){var v=vary(),more=Math.min(3,c.count||1);tone(d,'sine',1500*v,2100*v,.045,l*(.8+more*.1));},
      item:function(d,l){var v=vary();tone(d,'sine',1050*v,1400*v,.05,l);},
      bomb:function(d,l){noise(d,'lowpass',5200,140,.7,.8,l);tone(d,'sine',150,36,.8,l);tone(d,'triangle',660,220,.3,l*.3);},
      bossHit:function(d,l){noise(d,'bandpass',1900*vary(),1400,2.2,.035,l);},
      bossHitLow:function(d,l){var v=vary();noise(d,'bandpass',2600*v,2000,3,.035,l);tone(d,'triangle',1100*v,1040,.03,l*.3);},
      kill:function(d,l){noise(d,'lowpass',3800,240,.7,.24,l);tone(d,'sine',190*vary(),48,.26,l*.9);noise(d,'highpass',5200,7000,.5,.07,l*.3);},
      // 피격: 낮고 둔탁하게(사용자 11-15 "맞았을때 랑 탄없앨때 … 비슷해서 헷갈림"). 높은 쓸림을 빼고 몸통을 치는 쿵 + 거친 떨림.
      hurt:function(d,l){tone(d,'sine',150,40,.42,l);tone(d,'square',96,58,.16,l*.32);tone(d,'sawtooth',233,110,.22,l*.22,.02);noise(d,'lowpass',700,90,1.2,.3,l*.9);},
      charge:function(d,l){noise(d,'bandpass',300,2400,5,.38,l,0,.2);tone(d,'sine',150,420,.36,l*.4,0,.18);},
      // 메인보스 컷인: 짧은 상승 바람 뒤 낮은 타격·금속 잔향. 예약음도 기존 정지/음소거 경로로 정리한다.
      bossCutin:function(d,l){
        noise(d,'bandpass',260,2800,3,.36,l*.55,0,.2);
        tone(d,'sawtooth',82,164,.34,l*.22,0,.18);
        tone(d,'triangle',160,62,.45,l*.6,.30,.004);
        bell(d,294,.60,l*.40,.30);
      },
      laserWarn:function(d,l,c){var more=Math.min(2,(c.count||1)/3);tone(d,'sawtooth',220,660,.5,l*.32,0,.3);tone(d,'sine',440,1320,.5,l*(.6+more*.15),0,.3);tone(d,'square',1320,1320,.05,l*.3,.5);},
      laserFire:function(d,l,c){var more=Math.min(1.4,1+(c.count||1)*.06);noise(d,'lowpass',6500,300,1.2,.6,l*.8*more);tone(d,'sawtooth',98,60,.7,l*.5);tone(d,'sawtooth',99.4,61,.7,l*.4);tone(d,'sine',1900,380,.22,l*.4);},
      skillMemory:function(d,l){[523,659,784].forEach(function(f,i){tone(d,'triangle',f,f,.14,l*.8,i*.045);tone(d,'sine',f*2,f*2,.1,l*.3,i*.045);});},
      skillDelay:function(d,l){tone(d,'sine',620,310,.3,l,0,.05);tone(d,'sine',930,465,.3,l*.4,0,.05);noise(d,'bandpass',900,300,6,.3,l*.5,0,.1);},
      skillCounter:function(d,l){bell(d,1320,.34,l);tone(d,'square',2640,1980,.05,l*.25);noise(d,'highpass',6000,8000,.5,.05,l*.5);},
      skillEgo:function(d,l){[196,294,392,587].forEach(function(f,i){tone(d,'sawtooth',f*.5,f,.6,l*.28,i*.03,.25);tone(d,'sine',f,f*1.5,.7,l*.5,i*.03,.3);});noise(d,'highpass',2500,9000,.6,.6,l*.3,0,.4);},
      // 탄 지우기(패턴 깨기): 맑고 높게, 먹이 흩어지듯 위로 쓸리는 소리와 올라가는 종소리. 낮은 쿵은 피격에만.
      phaseBreak:function(d,l){noise(d,'highpass',2400,9500,.5,.7,l*.55);[1047,1319,1568,2093,2637].forEach(function(f,i){tone(d,'sine',f,f,.6,l*.22,i*.05,.003);tone(d,'triangle',f*2,f*2,.25,l*.06,i*.05,.003);});noise(d,'bandpass',6000,3000,3,.5,l*.25,.05);},
      summon:function(d,l){tone(d,'sawtooth',82,164,.5,l*.5,0,.2);noise(d,'bandpass',500,1600,4,.5,l*.6,0,.25);bell(d,392,.5,l*.5,.15);},
      seal:function(d,l){bell(d,587,.8,l);bell(d,880,.7,l*.6,.09);},
      awakening:function(d,l){[147,220,294,440,587,880].forEach(function(f,i){tone(d,'sine',f,f,1.4,l*.4,i*.07,.2);});noise(d,'highpass',1500,10000,.5,1.3,l*.35,0,.8);tone(d,'sine',60,60,1.2,l*.7,0,.1);},
      warning:function(d,l){for(var i=0;i<3;i++){tone(d,'square',233,233,.2,l*.35,i*.36,.01);tone(d,'sawtooth',116.5,110,.26,l*.6,i*.36,.01);}noise(d,'lowpass',400,120,1,1.1,l*.4,0,.3);},
      win:function(d,l){noise(d,'lowpass',8000,120,.6,1.3,l*.9);tone(d,'sine',110,30,1.2,l);[392,494,587,784,988].forEach(function(f,i){bell(d,f,1.1,l*.3,.35+i*.11);});},
      lose:function(d,l){[392,349,294,196].forEach(function(f,i){tone(d,'triangle',f,f*.97,.5,l*.5,i*.2,.02);});tone(d,'sine',98,49,1.2,l*.6,.1,.05);},
      heartbeat:function(d,l){tone(d,'triangle',150,90,.14,l);tone(d,'sine',70,42,.14,l*.7);tone(d,'triangle',132,80,.16,l*.8,.19);tone(d,'sine',62,38,.16,l*.55,.19);}, // 휴대폰 스피커는 저역을 못 내므로 삼각파 배음을 겹친다
      
      // 초읽기: 날카로운 전자음 대신 시계의 째깍(높은 틱)·깍(낮은 톡). 마지막 3초는 한 박자 더 단단하게.
      countdown:function(d,l){clockTick(d,l,1);},
      countdownLast:function(d,l){clockTick(d,l*1.15,1);tone(d,'sine',1175,1175,.1,l*.5,.02);},
      // 8박 장단의 박(레이백 특수 페이즈): 나무 박 소리. 센박은 한 음 낮고 길게.
      groove:function(d,l){tone(d,'triangle',520,360,.07,l,0,.004);noise(d,'bandpass',1800,900,3,.05,l*.3,0,.01);},
      grooveAccent:function(d,l){tone(d,'triangle',330,200,.14,l,0,.004);tone(d,'sine',165,110,.16,l*.6,0,.004);noise(d,'bandpass',1400,700,3,.06,l*.3,0,.01);},
      clockTick:function(d,l){clockTick(d,l,1);clockTick(d,l*.8,.78,.5);},
      // 시공간 왜곡·둔화장: 째깍 간격이 점점 벌어지고 음이 내려앉는다(태엽 풀림).
      clockSlow:function(d,l){[0,.09,.22,.42,.7].forEach(function(at,i){clockTick(d,l*(1-i*.12),1-i*.1,at);});tone(d,'sine',330,110,.9,l*.5,0,.05);noise(d,'lowpass',900,200,1,.7,l*.12,0,.1);},
      // 서하의 시간 기술: 맑은 종 한 번과 앞서 달려가는 째깍 셋.
      // 솟는 먹물: 바닥이 부풀 때 낮은 북 두드림 둘(쿵-둥). 피격음(낮은 쿵+떨림)보다 짧고 부드럽게, 쓸림 없음.
      inkSwell:function(d,l){tone(d,'sine',96,58,.2,l,0,.01);tone(d,'triangle',150,96,.12,l*.45,0,.01);tone(d,'sine',84,52,.22,l*.8,.17,.01);noise(d,'lowpass',420,140,1,.18,l*.35,0,.02);},
      // 빗장이 걸릴 때: 짧은 쇠 부딪힘(비조화 배음)과 묵직한 몸통.
      gateClang:function(d,l){bell(d,233,.42,l*.7);tone(d,'square',466,440,.05,l*.25);tone(d,'sine',1287,1287,.25,l*.22,0,.002);noise(d,'bandpass',3200,2200,4,.06,l*.6,0,.002);tone(d,'triangle',110,80,.18,l*.5);},
      // 빗장이 풀릴 때: 쇠가 미끄러지는 짧은 쓸림 뒤 가벼운 걸쇠 소리.
      boltRelease:function(d,l){noise(d,'bandpass',900,2600,6,.12,l*.6,0,.03);tone(d,'triangle',880,980,.04,l*.4,.12,.002);noise(d,'highpass',4000,5000,1,.03,l*.3,.12,.002);},
      // 환도가 세 번 울린다(46장 코어 회복 → 56장 세쌍둥이의 기록에서 같은 세 박자).
      hwandoThree:function(d,l){[0,.42,.84].forEach(function(at,i){bell(d,i===2?659:587,1.1-i*.1,l*(i===2?1:.8),at);tone(d,'sine',1760,1760,.5,l*.12,at+.01,.002);});},
      // 스펠 첫 획: 붓이 한지를 쓸고 지나가는 짧은 쓸림.
      brushStroke:function(d,l){noise(d,'bandpass',1500,500,1.6,.26,l,0,.04);noise(d,'highpass',5000,3000,.7,.12,l*.35,0,.01);},
      rainHitMemory:function(d,l,c){rainHit(d,l,'memory',c);},
      rainHitSeoha:function(d,l,c){rainHit(d,l,'seoha',c);},
      sparkFire:function(d,l){var v=vary();noise(d,'bandpass',3200*v,2400*v,4,.04,l,0,.002);noise(d,'bandpass',2200*v,1600,5,.03,l*.6,.035,.002);tone(d,'square',740*v,520*v,.03,l*.18);},
      sparkHit:function(d,l){var v=vary();noise(d,'bandpass',2600*v,1500,3,.05,l,0,.001);noise(d,'bandpass',3400*v,2000,4,.025,l*.5,.04,.001);tone(d,'triangle',300*v,180,.06,l*.4);},
      tbStick:function(d,l){clockTick(d,l,1.1);},
      tbBoom:function(d,l){noise(d,'lowpass',2400,180,.8,.22,l);tone(d,'sine',170,60,.24,l*.8);bell(d,1046,.25,l*.25,.02);clockTick(d,l*.5,.9,.06);},
      noteKung:function(d,l){tone(d,'sine',118,62,.22,l,0,.003);tone(d,'triangle',180,90,.1,l*.5,0,.002);noise(d,'lowpass',420,160,1,.08,l*.35,0,.002);},
      noteDeok:function(d,l){noise(d,'bandpass',1500,1100,6,.045,l,0,.001);tone(d,'triangle',640,520,.05,l*.6,0,.001);},
      noteDung:function(d,l){tone(d,'sine',104,52,.3,l,0,.003);tone(d,'triangle',170,84,.12,l*.5,0,.002);noise(d,'bandpass',1400,1000,5,.05,l*.6,0,.001);noise(d,'lowpass',380,140,1,.1,l*.3,0,.002);},
      notePluck0:function(d,l){pluck(d,l,293.7);},notePluck1:function(d,l){pluck(d,l,329.6);},notePluck2:function(d,l){pluck(d,l,392);},notePluck3:function(d,l){pluck(d,l,440);},notePluck4:function(d,l){pluck(d,l,493.9);},
      clockChime:function(d,l){bell(d,880,.9,l*.55,0);[.12,.24,.36].forEach(function(at,i){clockTick(d,l*.8,1+i*.06,at);});}
    };
    function pluck(d,l,f){tone(d,'triangle',f*1.012,f,.34,l,0,.002);tone(d,'sine',f*2,f*2,.16,l*.32,0,.002);noise(d,'bandpass',f*3,f*2,4,.03,l*.3,0,.001);} // 가야금 뜯는 한 음: 살짝 높게 시작해 제 음으로 내려앉는다
    function clockTick(d,l,pitch,delay){delay=delay||0;noise(d,'bandpass',2600*pitch,1800*pitch,5,.022,l*.8,delay,.001);tone(d,'sine',1900*pitch,1500*pitch,.035,l*.6,delay,.001);if(pitch===1&&!delay||pitch>1)noise(d,'bandpass',900,600,3,.03,l*.35,delay,.001);}
    function play(cue){
      var spec=CUES[cue.name],voice=VOICE[cue.name];if(!spec||!voice||!enabled||suspended||background||pageAway||volume===0||!ctx||ctx.state!=='running')return false;
      var now=clock();if(now-(last[cue.name]===undefined?-1e9:last[cue.name])<spec.gap){skipped++;return false;}
      if(voices>=MAX_VOICES&&spec.rank<4){skipped++;return false;}
      last[cue.name]=now;
      try{voice(out(cue.pan),spec.level,cue);played++;return true;}catch(e){if(root.__AUDIO_DEBUG)console.error(e);return false;}
    }
    function observe(world,events){
      var cues=collect(state,world,events);if(!enabled||!ctx)return cues;
      for(var i=0;i<cues.length;i++)play(cues[i]);return cues;
    }
    return {
      unlock:unlock,observe:observe,play:function(name,panValue){return play({name:name,pan:panValue||0});},
      setEnabled:function(on){enabled=!!on;applyLevel();if(!enabled)stopVoices();},
      setVolume:function(value){var n=Number(value);if(isFinite(n))volume=Math.max(0,Math.min(1,n));applyLevel();if(volume===0)stopVoices();},
      suspend:function(on){suspended=!!on;applyLevel();if(suspended)stopVoices();},
      reset:function(){state=newState();last=Object.create(null);stopVoices();},
      dispose:function(){listen(false);stopVoices();if(ctx&&ctx.close){try{var p=ctx.close();if(p&&p.catch)p.catch(function(){});}catch(e){}}ctx=null;master=null;noiseBuffer=null;last=Object.create(null);},
      stats:function(){return {available:!!Ctor&&!failed,running:!!ctx&&ctx.state==='running',enabled:enabled,suspended:suspended,volume:volume,voices:voices,played:played,skipped:skipped,cues:Object.keys(CUES).length};}
    };
  }
  var api={revision:37,CUES:CUES,newState:newState,collect:collect,create:create};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilAudio=api;
})(typeof window!=='undefined'?window:globalThis);
