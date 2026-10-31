/* Extra-layer rhythm for explicit revision29. The existing boss attacks,
 * owned projectile sources and finite laser programs remain their modules'
 * responsibility. A stream is one declared bait point and three straight
 * pulses, never homing or a hidden estimate of the pilot's future position.
 */
(function(root,factory){
  'use strict';
  var dependency=typeof module==='object'&&module.exports?require('./boss-patterns-v27.js'):root.HapilBossPatternsV27;
  var api=factory(dependency);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilBossFlowV29=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Patterns){
  'use strict';
  if(!Patterns||!Patterns.profiles)throw new Error('보스 고유 탄막 모듈을 찾을 수 없습니다.');
  var REVISION=29,CYCLE_TICKS=600,PULSE_OFFSETS=Object.freeze([54,66,78]);
  var EVENTS=Object.freeze([
    Object.freeze({at:72,kind:'stream',source:'main',ordinal:0}),
    Object.freeze({at:168,kind:'fixed',source:'copy',ordinal:1}),
    Object.freeze({at:228,kind:'laser',source:'main',ordinal:2}),
    Object.freeze({at:342,kind:'fixed',source:'main',ordinal:3}),
    Object.freeze({at:420,kind:'fixed',source:'copy',ordinal:4,optional:true})
  ]);
  var FIELDS=Object.freeze(['v29Role','v29PulseIndex','v29PulseCount','v29TargetX','v29TargetY','v29AimSampleTick','v29OriginX','v29OriginY','v29MovementX','v29MovementY']);
  var profiles=Object.freeze(Patterns.profiles.map(function(p){return Object.freeze({index:p.index,id:p.id,role:p.role,kind:p.kind,size:p.size,speed:p.speed});}));
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function enabled(w){return !!(w&&w.combatRevision===REVISION&&w.campaign&&w.stage==='boss');}
  function profileFor(w){var index=w&&w.finalPractice?34:w&&w.bossIndex;return Number.isInteger(index)&&profiles[index]||null;}
  function phaseFor(w){return clamp(Math.floor(w&&finite(w.phase)?w.phase:0),0,2);}
  function optionalCopy(w){return w.difficulty==='hell'||w.difficulty==='normal'&&phaseFor(w)===2;}
  function actionAt(w,within,cycle){
    var profile=profileFor(w);if(!enabled(w)||!profile||!Number.isInteger(within)||within<0||within>=CYCLE_TICKS)return null;
    var event=EVENTS.find(function(e){return e.at===within;});if(!event||event.optional&&!optionalCopy(w))return null;
    cycle=Number.isInteger(cycle)?Math.max(0,cycle):Math.floor(Math.max(0,(w.phaseTime||0)*60-1)/CYCLE_TICKS);
    // Five is deliberately odd: a paired encounter selected by beat%2 must
    // alternate its actual caster across cycles for every main/laser role.
    var result={at:event.at,kind:event.kind,source:event.source,beat:cycle*EVENTS.length+event.ordinal,cycle:cycle,profileId:profile.id};
    if(event.source==='copy')result.copySlot=(cycle+phaseFor(w)+(event.optional?1:0))%2;
    return Object.freeze(result);
  }
  function roleFor(profile,phase,emitter){
    if(profile.index===33)return emitter.modelActorId==='baek-ion'||emitter.sourceActorId==='baek-ion'?'circuit-shield':'circuit-cross';
    return profile.index===34?['authority-fold','authority-stitch','authority-impact'][phase]:profile.role;
  }
  function makeStream(w,emitter,beat,opts){
    var profile=profileFor(w);if(!enabled(w)||!profile||!w.boss||!w.player||!emitter||![w.player.x,w.player.y,emitter.x,emitter.y].every(finite))return null;
    opts=opts||{};beat=Number.isInteger(beat)?Math.max(0,beat):0;
    var phase=phaseFor(w),perPulse=w.difficulty==='hell'?4:w.difficulty==='gentle'?2:3;
    // Read the real pilot exactly once. Even an explicit motion option does
    // not change this public bait point or lead later pulses ahead of it.
    var snapshot=Object.freeze({x:w.player.x,y:w.player.y,motionX:0,motionY:0,sampleTick:Number.isInteger(w.tick)?w.tick:0});
    var role=roleFor(profile,phase,emitter),shield=role==='circuit-shield',kind=profile.index===33?(shield?'blade':'needle'):profile.kind;
    var radius=clamp(2.7+(profile.size-.8)*.55+phase*.10,2.7,3.55);
    var baseSpeed=w.difficulty==='hell'?218:w.difficulty==='gentle'?124:176;
    var speed=clamp(baseSpeed*(.90+profile.speed*.18)*(1+phase*.025),w.difficulty==='hell'?185:w.difficulty==='gentle'?110:150,w.difficulty==='hell'?245:w.difficulty==='gentle'?150:204);
    var spread=.025+(profile.index%4)*.006+(phase===2?.004:0),aim=Math.atan2(snapshot.y-emitter.y,snapshot.x-emitter.x),pulses=[];
    for(var pulse=0;pulse<PULSE_OFFSETS.length;pulse++){
      var side=(beat+pulse+profile.index)%2?1:-1,offsets=[0,side,-side,side*2],specs=[];
      for(var pellet=0;pellet<perPulse;pellet++){
        var spec={x:emitter.x,y:emitter.y,angle:aim+offsets[pellet]*spread,speed:speed,r:radius,kind:kind,ttl:6,
          color:'#ffffff',ownerId:w.boss.id,sourcePhase:phase,patternId:'stream-'+profile.id+'-v29',paletteSlot:(pulse+pellet)%2,identityRole:role,
          v27Pattern:profile.id,v27Motion:'straight',v29Role:'aimed-stream',v29PulseIndex:pulse,v29PulseCount:3,
          v29TargetX:snapshot.x,v29TargetY:snapshot.y,v29AimSampleTick:snapshot.sampleTick,v29OriginX:emitter.x,v29OriginY:emitter.y,
          v29MovementX:0,v29MovementY:0,_v27Prepared:true,_rhythmPrepared:true,_hellPrepared:true};
        // Lust keeps its already reviewed independent props: a pulse never
        // turns a shoe/lipstick into an unrelated generic material crop.
        if(profile.index===8)spec.patternId=phase===1?'asmodeus-heart-chord':'asmodeus-phase-1';
        if(emitter.sourceActorId)spec.sourceActorId=emitter.sourceActorId;if(emitter.modelActorId)spec.modelActorId=emitter.modelActorId;
        specs.push(spec);
      }
      specs._hellPrepared=true;pulses.push({offset:PULSE_OFFSETS[pulse],targetX:snapshot.x,targetY:snapshot.y,specs:specs});
    }
    return {profileId:profile.id,sourcePhase:phase,warningTicks:54,targetSnapshot:snapshot,pulses:pulses,totalPellets:perPulse*3};
  }
  return Object.freeze({revision:REVISION,cycleTicks:CYCLE_TICKS,events:EVENTS,pulseOffsets:PULSE_OFFSETS,profiles:profiles,fields:FIELDS,enabled:enabled,profileFor:profileFor,actionAt:actionAt,makeStream:makeStream});
});
