/* 합일 v37 · 전투 음향 연출.
 * 전투 규칙(core)을 읽기만 하고 절대 쓰지 않는다. 모든 소리는 Web Audio로
 * 그 자리에서 합성하므로 외부 음원 파일·라이선스 의존이 없다.
 * 관찰(collect)과 합성(create)을 분리해 관찰 규칙은 브라우저 없이 검사한다. */
(function(root){
  'use strict';
  // gap: 같은 신호의 최소 간격(ms) · level: 마스터 이전 음량 · rank: 동시 발음이 많을 때 남길 우선순위
  var CUES={
    graze:{gap:42,level:.24,rank:1},
    bossHit:{gap:70,level:.4,rank:0},
    bossHitLow:{gap:70,level:.45,rank:1},
    kill:{gap:55,level:.4,rank:2},
    hurt:{gap:220,level:.5,rank:5},
    charge:{gap:420,level:.2,rank:2},
    laserWarn:{gap:380,level:.2,rank:3},
    laserFire:{gap:260,level:.34,rank:4},
    skillMemory:{gap:200,level:.15,rank:3},
    skillDelay:{gap:200,level:.2,rank:3},
    skillCounter:{gap:160,level:.24,rank:3},
    skillEgo:{gap:400,level:.18,rank:3},
    phaseBreak:{gap:500,level:.5,rank:5},
    summon:{gap:500,level:.24,rank:3},
    seal:{gap:300,level:.3,rank:4},
    awakening:{gap:900,level:.34,rank:5},
    warning:{gap:1500,level:.26,rank:4},
    win:{gap:1500,level:.5,rank:5},
    lose:{gap:1500,level:.4,rank:5},
    heartbeat:{gap:700,level:.3,rank:2},
    countdown:{gap:400,level:.17,rank:2},
    countdownLast:{gap:400,level:.18,rank:3}
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
    var ctx=null,master=null,noiseBuffer=null,enabled=true,state=newState(),last=Object.create(null),voices=0,played=0,skipped=0,failed=false;
    var MAX_VOICES=28,MASTER_LEVEL=.55;

    function ensure(){
      if(ctx||failed||!Ctor)return !!ctx;
      try{
        ctx=new Ctor();master=ctx.createGain();master.gain.value=MASTER_LEVEL;
        var limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=10;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
        master.connect(limiter);limiter.connect(ctx.destination);
        var length=Math.floor(ctx.sampleRate*.6),seed=0x2545f491;noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);var data=noiseBuffer.getChannelData(0);
        for(var i=0;i<length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=((seed>>>0)/2147483648)-1;}
      }catch(e){failed=true;ctx=null;master=null;}
      return !!ctx;
    }
    function unlock(){if(!ensure())return false;if(ctx.state==='suspended'&&ctx.resume){try{var p=ctx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}}return true;}
    function out(panValue){
      if(!panValue||!ctx.createStereoPanner)return master;
      var node=ctx.createStereoPanner();node.pan.value=panValue;node.connect(master);return node;
    }
    function envelope(gainNode,at,attack,hold,level){
      var g=gainNode.gain;g.setValueAtTime(.0001,at);g.exponentialRampToValueAtTime(Math.max(.0002,level),at+attack);g.exponentialRampToValueAtTime(.0001,at+attack+hold);
    }
    function finish(source,at,length){voices++;source.onended=function(){voices--;};source.start(at);source.stop(at+length+.03);}
    // 음정이 있는 한 음: from→to Hz로 미끄러지며 사라진다.
    function tone(dest,shape,from,to,length,level,delay,attack){
      var at=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();o.type=shape;
      o.frequency.setValueAtTime(from,at);if(to!==from)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);
      envelope(g,at,attack||.004,length,level);o.connect(g);g.connect(dest);finish(o,at,length);
    }
    // 걸러낸 잡음: 타격·폭발·바람 소리의 몸통.
    function noise(dest,filterType,from,to,q,length,level,delay,attack){
      var at=ctx.currentTime+(delay||0),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;s.loop=true;
      f.type=filterType;f.Q.value=q;f.frequency.setValueAtTime(from,at);if(to!==from)f.frequency.exponentialRampToValueAtTime(Math.max(30,to),at+length);
      envelope(g,at,attack||.003,length,level);s.connect(f);f.connect(g);g.connect(dest);finish(s,at,length);
    }
    function bell(dest,base,length,level,delay){tone(dest,'sine',base,base,length,level,delay,.002);tone(dest,'sine',base*2.76,base*2.76,length*.55,level*.35,delay,.002);tone(dest,'sine',base*5.4,base*5.4,length*.3,level*.16,delay,.002);}
    var jitter=0;function vary(){jitter=(jitter+1)%5;return 1+(jitter-2)*.035;}

    var VOICE={
      graze:function(d,l,c){var v=vary(),more=Math.min(3,c.count||1);tone(d,'triangle',2300*v,3300*v,.045,l*(.8+more*.1));tone(d,'sine',4600*v,5200*v,.03,l*.35);},
      bossHit:function(d,l){noise(d,'bandpass',2600*vary(),1800,2.2,.035,l);},
      bossHitLow:function(d,l){var v=vary();noise(d,'bandpass',4200*v,3000,3,.035,l);tone(d,'square',1560*v,1480,.03,l*.3);},
      kill:function(d,l){noise(d,'lowpass',3800,240,.7,.24,l);tone(d,'sine',190*vary(),48,.26,l*.9);noise(d,'highpass',5200,7000,.5,.07,l*.3);},
      hurt:function(d,l){tone(d,'sine',1250,150,.42,l*.7);tone(d,'sawtooth',310,70,.3,l*.3);noise(d,'lowpass',1800,180,.8,.34,l*.8);tone(d,'sine',92,38,.5,l);},
      charge:function(d,l){noise(d,'bandpass',300,2400,5,.38,l,0,.2);tone(d,'sine',150,420,.36,l*.4,0,.18);},
      laserWarn:function(d,l,c){var more=Math.min(2,(c.count||1)/3);tone(d,'sawtooth',220,660,.5,l*.32,0,.3);tone(d,'sine',440,1320,.5,l*(.6+more*.15),0,.3);tone(d,'square',1320,1320,.05,l*.3,.5);},
      laserFire:function(d,l,c){var more=Math.min(1.4,1+(c.count||1)*.06);noise(d,'lowpass',6500,300,1.2,.6,l*.8*more);tone(d,'sawtooth',98,60,.7,l*.5);tone(d,'sawtooth',99.4,61,.7,l*.4);tone(d,'sine',1900,380,.22,l*.4);},
      skillMemory:function(d,l){[523,659,784].forEach(function(f,i){tone(d,'triangle',f,f,.14,l*.8,i*.045);tone(d,'sine',f*2,f*2,.1,l*.3,i*.045);});},
      skillDelay:function(d,l){tone(d,'sine',620,310,.3,l,0,.05);tone(d,'sine',930,465,.3,l*.4,0,.05);noise(d,'bandpass',900,300,6,.3,l*.5,0,.1);},
      skillCounter:function(d,l){bell(d,1320,.34,l);tone(d,'square',2640,1980,.05,l*.25);noise(d,'highpass',6000,8000,.5,.05,l*.5);},
      skillEgo:function(d,l){[196,294,392,587].forEach(function(f,i){tone(d,'sawtooth',f*.5,f,.6,l*.28,i*.03,.25);tone(d,'sine',f,f*1.5,.7,l*.5,i*.03,.3);});noise(d,'highpass',2500,9000,.6,.6,l*.3,0,.4);},
      phaseBreak:function(d,l){noise(d,'lowpass',7000,160,.6,.9,l);tone(d,'sine',130,34,.9,l);[2093,2637,3136,3951,4699].forEach(function(f,i){tone(d,'sine',f,f*.97,.5,l*.16,.04+i*.035,.002);});noise(d,'highpass',4000,9000,.4,.3,l*.35,.02);},
      summon:function(d,l){tone(d,'sawtooth',82,164,.5,l*.5,0,.2);noise(d,'bandpass',500,1600,4,.5,l*.6,0,.25);bell(d,392,.5,l*.5,.15);},
      seal:function(d,l){bell(d,587,.8,l);bell(d,880,.7,l*.6,.09);},
      awakening:function(d,l){[147,220,294,440,587,880].forEach(function(f,i){tone(d,'sine',f,f,1.4,l*.4,i*.07,.2);});noise(d,'highpass',1500,10000,.5,1.3,l*.35,0,.8);tone(d,'sine',60,60,1.2,l*.7,0,.1);},
      warning:function(d,l){for(var i=0;i<3;i++){tone(d,'square',233,233,.2,l*.35,i*.36,.01);tone(d,'sawtooth',116.5,110,.26,l*.6,i*.36,.01);}noise(d,'lowpass',400,120,1,1.1,l*.4,0,.3);},
      win:function(d,l){noise(d,'lowpass',8000,120,.6,1.3,l*.9);tone(d,'sine',110,30,1.2,l);[392,494,587,784,988].forEach(function(f,i){bell(d,f,1.1,l*.3,.35+i*.11);});},
      lose:function(d,l){[392,349,294,196].forEach(function(f,i){tone(d,'triangle',f,f*.97,.5,l*.5,i*.2,.02);});tone(d,'sine',98,49,1.2,l*.6,.1,.05);},
      heartbeat:function(d,l){tone(d,'triangle',150,90,.14,l);tone(d,'sine',70,42,.14,l*.7);tone(d,'triangle',132,80,.16,l*.8,.19);tone(d,'sine',62,38,.16,l*.55,.19);}, // 휴대폰 스피커는 저역을 못 내므로 삼각파 배음을 겹친다
      
      countdown:function(d,l){tone(d,'square',880,880,.05,l*.5);tone(d,'sine',880,880,.09,l);},
      countdownLast:function(d,l){tone(d,'square',1175,1175,.06,l*.5);tone(d,'sine',1175,1175,.12,l);}
    };
    function play(cue){
      var spec=CUES[cue.name],voice=VOICE[cue.name];if(!spec||!voice||!enabled||!ctx||ctx.state!=='running')return false;
      var now=clock();if(now-(last[cue.name]||-1e9)<spec.gap){skipped++;return false;}
      if(voices>=MAX_VOICES&&spec.rank<4){skipped++;return false;}
      last[cue.name]=now;
      try{voice(out(cue.pan),spec.level,cue);played++;return true;}catch(e){return false;}
    }
    function observe(world,events){
      var cues=collect(state,world,events);if(!enabled||!ctx)return cues;
      for(var i=0;i<cues.length;i++)play(cues[i]);return cues;
    }
    return {
      unlock:unlock,observe:observe,play:function(name,panValue){return play({name:name,pan:panValue||0});},
      setEnabled:function(on){enabled=!!on;},
      reset:function(){state=newState();},
      dispose:function(){if(ctx&&ctx.close){try{var p=ctx.close();if(p&&p.catch)p.catch(function(){});}catch(e){}}ctx=null;master=null;noiseBuffer=null;},
      stats:function(){return {available:!!Ctor&&!failed,running:!!ctx&&ctx.state==='running',enabled:enabled,voices:voices,played:played,skipped:skipped,cues:Object.keys(CUES).length};}
    };
  }
  var api={revision:37,CUES:CUES,newState:newState,collect:collect,create:create};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilAudio=api;
})(typeof window!=='undefined'?window:globalThis);
