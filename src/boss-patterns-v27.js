/* Owned-source choreography. This module specifies physics, never artwork.
 * Each profile is an encounter motif, not a new character or canon quotation.
 * Specs are committed by core's 54-tick warning; motion never reads later aim.
 */
(function (root, factory) {
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilBossPatternsV27=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var TAU=Math.PI*2,DOWN=Math.PI/2;
  // id, retained source role, source kind, extra cadence, three phase motions,
  // size bias, speed bias, turn bias. All phases also change physical spacing.
  var ROWS=[
    ['violet-wing-loom','wing-weave','needle',0,['curve','weave','curve'],.88,1.06,.74],
    ['horn-sinking-boulders','bog-drag','orb',18,['pulse','comet','split'],1.72,.66,.18],
    ['balrog-meteor-crucible','sword-rake','blade',12,['comet','split','comet'],1.35,1.18,.20],
    ['mask-feather-mirrors','feather-fork','needle',6,['mirror','curve','mirror'],.82,1.12,.43],
    ['lucifer-orbiting-masks','constellation-orbit','orb',6,['curve','weave','split'],1.15,.80,.63],
    ['sloth-delayed-collapse','late-pulse','orb',24,['pulse','pulse','comet'],1.82,.53,.10],
    ['envy-opposite-reflections','mirror-reflection','blade',0,['mirror','mirror','weave'],.94,1.05,.51],
    ['glutton-dividing-maw','hungry-jaw','orb',18,['split','comet','split'],1.64,.73,.24],
    ['lust-stage-prop-waltz','red-stage','orb',0,['curve','piano','weave'],1.06,.95,.47],
    ['mammon-vault-dividends','vault-branch','orb',12,['piano','split','pulse'],1.38,.81,.21],
    ['wrath-firework-fuse','fire-fuse','orb',0,['comet','split','comet'],1.04,1.27,.28],
    ['pride-calculated-keyboard','calculation-column','needle',6,['piano','piano','mirror'],1.02,1.08,.14],
    ['defense-relay-battery','defense-relay','needle',0,['piano','comet','piano'],.84,1.16,.16],
    ['mercy-closing-boundaries','mercy-boundary','needle',18,['mirror','pulse','curve'],1.22,.71,.30],
    ['veto-stop-packets','veto-packet','needle',12,['pulse','piano','pulse'],1.10,.87,.20],
    ['feedback-return-current','feedback-return','needle',6,['curve','mirror','weave'],.90,1.01,.77],
    ['migration-branch-gates','migration-fork','needle',18,['split','piano','split'],1.18,.82,.24],
    ['memory-repeat-separation','repeat-disconnect','needle',12,['piano','pulse','curve'],.77,.90,.37],
    ['goblin-flute-arpeggio','flute-phrase','needle',6,['piano','weave','piano'],.81,1.13,.57],
    ['knight-six-sword-wheel','six-swords','blade',0,['curve','mirror','curve'],1.28,1.17,.91],
    ['insomnia-drifting-mist','insomnia-veil','orb',24,['weave','pulse','curve'],1.63,.58,.31],
    ['academy-turret-sonata','defense-intercept','needle',0,['piano','mirror','piano'],.92,1.12,.17],
    ['harvest-falling-tiers','harvest-tier','needle',18,['comet','pulse','comet'],1.41,.76,.22],
    ['upper-orders-checkerboard','command-alternation','blade',6,['mirror','piano','mirror'],.98,1.03,.39],
    ['furnace-pipe-rebound','furnace-junction','needle',12,['mirror','comet','split'],1.06,1.08,.30],
    ['neural-command-serpents','neural-packet','needle',6,['weave','weave','curve'],.82,.96,1.02],
    ['grave-command-seals','deletion-seal','blade',24,['pulse','split','curve'],1.27,.62,.41],
    ['collapse-two-triads','six-command-rings','orb',12,['curve','split','curve'],1.36,.84,.84],
    ['arbelia-deferred-threads','tampered-thread','needle',30,['pulse','weave','pulse'],.85,.54,.29],
    ['siren-clock-hands','time-hand','needle',6,['curve','piano','mirror'],1.24,.96,.69],
    ['castle-dual-owner-boundary','castle-boundary','blade',12,['mirror','curve','mirror'],1.15,1.02,.48],
    ['causal-three-delayed-locks','causal-lock','needle',18,['pulse','comet','piano'],1.03,.85,.23],
    ['cult-reverse-domination','reverse-domination','needle',6,['weave','curve','mirror'],1.11,1.06,-.76],
    ['circuit-cross-and-shield','circuit-duet','needle',12,['curve','mirror','piano'],1.20,.91,.36],
    ['authority-fold-stitch-impact','authority-fold','needle',0,['curve','split','piano'],1.48,1.10,.88]
  ];
  var profiles=Object.freeze(ROWS.map(function(r,index){return Object.freeze({index:index,id:r[0],role:r[1],kind:r[2],cadenceAdd:r[3],modes:Object.freeze(r[4]),size:r[5],speed:r[6],turn:r[7]});}));
  var FIELDS=Object.freeze(['v27Pattern','v27Motion','v27TurnRate','v27TurnUntil','v27WaveRate','v27WavePhase','v27Reflect','v27SplitAt','v27SplitCount','v27SplitSpread','v27ChildSpeed','v27LaneIndex','v27RestLane','v27ParentId','v27Child','v27SplitDone','v27Generation']);
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function profileFor(w){var index=w&&w.finalPractice?34:w&&w.bossIndex;return Number.isInteger(index)&&profiles[index]||null;}
  function phaseFor(w,opts){return clamp(Math.floor(opts&&finite(opts.phase)?opts.phase:w&&finite(w.phase)?w.phase:0),0,2);}
  function countFor(w,copy){return copy?(w.difficulty==='hell'?6:w.difficulty==='gentle'?3:5):(w.difficulty==='hell'?12:w.difficulty==='gentle'?6:9);}
  function speedFor(w){return w.difficulty==='hell'?164:w.difficulty==='gentle'?86:112;}
  function childCount(w){return w.difficulty==='hell'?3:2;}
  function modeFor(p,phase,emitter){return p.index===33&&emitter&&(emitter.modelActorId==='baek-ion'||emitter.sourceActorId==='baek-ion')?'mirror':p.modes[phase];}
  function configure(w,s,p,phase,ordinal,mode){
    if(s._v27Prepared)return s;
    s._v27Prepared=true;s._rhythmPrepared=true;s.v27Pattern=p.id;s.v27Motion=mode;s.sourcePhase=phase;
    var side=ordinal%2?1:-1,scale=p.size*(phase===1?1.08:phase===2?.94:1),large=s.kind==='orb';
    s.r=clamp((finite(s.r)?s.r:large?3.8:3)*scale,large?3.2:2.7,large?11:5.2);
    s.speed=clamp(s.speed*p.speed*(1+(phase-1)*.06)*(ordinal%3===0?.88:ordinal%3===1?1.08:1),40,w.difficulty==='hell'?272:204);
    if(mode==='curve'||mode==='weave'){
      s.v27TurnRate=p.turn*side*(phase===2?1.16:1);s.v27TurnUntil=1.45+phase*.22;
      if(mode==='weave'){s.v27WaveRate=2.2+(p.index%4)*.33;s.v27WavePhase=ordinal*.69+phase*.8;}
    }
    if(mode==='mirror')s.v27Reflect=1;
    if(mode==='split'){
      s.v27SplitAt=.95+(p.index%3)*.18+phase*.06;s.v27SplitCount=childCount(w);
      s.v27SplitSpread=.24+(p.index%4)*.035;s.v27ChildSpeed=clamp(s.speed*1.08,70,205);
    }
    if(mode==='pulse'){
      s.pauseFrom=.22+(ordinal%3)*.07;s.pauseUntil=1.03+(p.index%4)*.16+(ordinal%3)*.09;
      s.acceleration=w.difficulty==='hell'?88:52;s.accelerateAt=s.pauseUntil;s.maxSpeed=w.difficulty==='hell'?245:179;
    }
    if(mode==='comet'){
      s.speed*=.42;s.acceleration=(w.difficulty==='hell'?104:67)+(p.index%3)*11;
      s.accelerateAt=.68+(ordinal%3)*.12;s.maxSpeed=w.difficulty==='hell'?276:208;
    }
    return s;
  }
  function makeVolley(w,emitter,beat,opts){
    var p=profileFor(w);if(!p||!w.boss||!emitter||![emitter.x,emitter.y].every(finite))return [];
    opts=opts||{};beat=Number.isInteger(beat)?Math.max(0,beat):0;
    var phase=phaseFor(w,opts),mode=modeFor(p,phase,emitter),copy=!!opts.copy,count=countFor(w,copy),out=[];
    if(mode==='split')count=copy?2:w.difficulty==='hell'?4:w.difficulty==='gentle'?2:3;
    var seedBeat=((w.seed>>>0)+(beat+1)*17+phase*11+p.index*7)%9,base=speedFor(w)*(1+(seedBeat-4)*.025);
    var direction=beat%2?1:-1,aim=DOWN+(Math.atan2((w.player&&w.player.y||550)-emitter.y,(w.player&&w.player.x||180)-emitter.x)-DOWN)*.25;
    var lanes=w.difficulty==='hell'?12:w.difficulty==='gentle'?8:10,rest=(beat*(p.index%3+1)+phase*2+p.index)%lanes;
    for(var i=0;i<count;i++){
      var u=i-(count-1)/2,side=i%2?1:-1,rank=Math.floor(i/2),x=emitter.x,y=emitter.y,angle=aim+u*.12,speed=base,kind=p.kind,r=kind==='orb'?3.8:kind==='blade'?3.7:3;
      if(p.index===0){x+=side*(18+rank*6);y-=rank*4;angle=DOWN+side*(.12+rank*.085)+direction*phase*.06;}
      else if(p.index===1){x+=u*17;y+=rank*8;angle=DOWN+u*.11;r=i%3===0?7.8:4.5;}
      else if(p.index===2){x+=u*28;y-=Math.abs(u)*13;angle=DOWN+u*.16+direction*.12;kind=mode==='split'?'orb':'blade';r=mode==='split'?6.2:4;}
      else if(p.index===3){x+=side*(35+rank*4);angle=side>0?.40+rank*.075:Math.PI-.40-rank*.075;}
      else if(p.index===4){var orbit=i*TAU/count+beat*.45+phase*.31;x+=Math.cos(orbit)*58;y+=Math.sin(orbit)*30;angle=DOWN+Math.cos(orbit)*.78;r=i%3===0?6.8:3.4;}
      else if(p.index===5){x+=u*21;angle=DOWN+u*.075;r=i%2?3.8:8.5;speed*=i%2?1.4:.72;}
      else if(p.index===6){x+=side*(46+rank*4);angle=side>0?.28+rank*.062:Math.PI-.28-rank*.062;speed*=side===direction?1:.71;}
      else if(p.index===7){x+=side*(48-rank*9);y+=rank*11;angle=DOWN+side*(.38+rank*.07);r=i%2?4.2:7.2;}
      else if(p.index===8){x+=side*(20+rank*9);angle=DOWN+u*.14+Math.sin(beat*.6)*.16;r=i%3===0?5.6:3.8;}
      else if(p.index===9){x+=u*31;y-=rank*10;angle=DOWN+u*.17;r=i%2?4.4:6.5;}
      else if(p.index===10){x+=u*13;y-=rank*7;angle=DOWN+u*.155+direction*.13;r=3.5+(i%3)*1.1;}
      else if(p.index===11){x+=u*18;angle=DOWN+u*.027;r=i%2?3:4.6;}
      else if(p.index===12){x+=side*(22+rank*11);y-=rank*8;angle=DOWN+side*.24;}
      else if(p.index===13){x+=side*(36+rank*9);angle=side>0?.52+rank*.045:Math.PI-.52-rank*.045;speed*=.78;}
      else if(p.index===14){x+=u*14;y-=i*3;angle=DOWN+u*.055;r=i%3===0?4.4:2.8;}
      else if(p.index===15){x+=side*(18+rank*12);angle=DOWN+side*(.48-rank*.035);speed*=side===direction?1.16:.75;}
      else if(p.index===16){x+=side*(46+rank*13);angle=DOWN+side*.37+u*.06;}
      else if(p.index===17){x+=u*15;y-=rank*12;angle=DOWN+direction*.09+u*.04;}
      else if(p.index===18){x+=u*10;y+=Math.sin(i*.65)*12;angle=DOWN+Math.sin(i*.52+beat*.7)*.44;}
      else if(p.index===19){var spoke=i*Math.PI/3+beat*.23;x+=Math.cos(spoke)*54;y+=Math.sin(spoke)*26;angle=DOWN+Math.cos(spoke)*.91;r=4.2;}
      else if(p.index===20){x+=u*23;y-=rank*6;angle=DOWN+u*.08;r=i%3===0?7.5:4;speed*=.82;}
      else if(p.index===21){if(!copy){x=32+(beat%6)*58+u*4;y=82;}angle=DOWN+direction*.16+u*.06;}
      else if(p.index===22){x+=u*20;y-=rank*15;angle=DOWN+u*.07;r=2.8+(rank%3)*.9;speed*=.7+rank*.12;}
      else if(p.index===23){x+=side*(35+rank*12);y-=rank*6;angle=side>0?.61+rank*.035:Math.PI-.61-rank*.035;}
      else if(p.index===24){if(!copy){x=side>0?320-rank*4:40+rank*4;y=104;}angle=side>0?Math.PI-.56-rank*.035:.56+rank*.035;}
      else if(p.index===25){x+=u*10;y-=i*6;angle=DOWN+u*.08;r=i%2?2.8:4.1;}
      else if(p.index===26){var seal=i*TAU/count+beat*.28;x+=Math.cos(seal)*44;y+=Math.sin(seal)*22;angle=DOWN+Math.cos(seal)*.53;}
      else if(p.index===27){var triad=i%3,ring=Math.floor(i/3);x+=(triad-1)*54;y-=ring*15;angle=DOWN+(triad-1)*.29+direction*ring*.08;r=4+ring*.6;}
      else if(p.index===28){x+=side*(16+rank*10);y-=rank*9;angle=DOWN+side*.19+u*.04;speed*=.82;}
      else if(p.index===29){var hand=beat*Math.PI/6+i*TAU/count;x+=Math.cos(hand)*52;y+=Math.sin(hand)*27;angle=DOWN+Math.cos(hand)*.67;r=i%3===0?4.5:2.8;}
      else if(p.index===30){x+=side*(56-rank*3);angle=side>0?.34+rank*.055:Math.PI-.34-rank*.055;speed*=side===direction?1.19:.76;}
      else if(p.index===31){x+=(i%3-1)*42;y-=rank*13;angle=DOWN+(i%3-1)*.075;r=i%3===1?4.6:3;}
      else if(p.index===32){x+=(1-beat%3)*36+u*6;angle=DOWN+u*.14+(1-beat%3)*.14;speed*=.74+(i%3)*.17;}
      else if(p.index===33){var shield=emitter.modelActorId==='baek-ion'||emitter.sourceActorId==='baek-ion';x+=shield?u*17:i%2?u*12:0;y-=shield?rank*4:i*7;angle=shield?DOWN+u*.07:DOWN+u*.045;kind=shield?'blade':'needle';r=shield?4.1:3.5;}
      else if(p.index===34){x+=side*(36+rank*6);y-=rank*(phase===1?14:5);angle=DOWN+side*(.20+rank*.06);r=phase===2?4.8:phase===1?5.2:3.6;kind=phase===1?'orb':'needle';}
      var s={x:clamp(x,17,343),y:clamp(y,32,220),angle:angle,speed:speed,r:r,kind:kind,color:'#ffffff',ownerId:w.boss.id,ttl:6.8,patternId:'identity-'+p.id+'-v27',paletteSlot:i%2,identityRole:p.index===33?(shield?'circuit-shield':'circuit-cross'):p.index===34?['authority-fold','authority-stitch','authority-impact'][phase]:p.role,_rhythmPrepared:true,_hellPrepared:true};
      if(p.index===8)s.patternId=phase===1?'asmodeus-heart-chord':'asmodeus-phase-1';
      if(emitter.sourceActorId)s.sourceActorId=emitter.sourceActorId;if(emitter.modelActorId)s.modelActorId=emitter.modelActorId;
      if(mode==='piano'){
        var lane=(i+beat+phase)%lanes;if(lane===rest||lane===(rest+1)%lanes)continue;
        s.x=28+lane*304/(lanes-1);s.y=66+(i%3)*8;s.angle=DOWN+(p.index===18?Math.sin(beat*.6)*.12:0);
        s.pauseFrom=0;s.pauseUntil=(i%4)*.11+phase*.035;s.speed*=i%2?.87:1.18;s.v27LaneIndex=lane;s.v27RestLane=rest;
      }
      configure(w,s,p,phase,i,mode);out.push(s);
    }
    out._hellPrepared=true;return out;
  }
  function decorate(w,specs){
    var p=profileFor(w);if(!p||(w.combatRevision!==27&&w.combatRevision!==28)||!w.campaign||w.stage!=='boss'||!w.boss||!Array.isArray(specs))return specs;
    var phase=phaseFor(w);
    specs.forEach(function(s,i){
      if(!s||s._v27Prepared||s.v27Child||s.weaponMotion||s.kind==='boss-weapon'||s.kind==='hell-rotor'||s.ownerId!==w.boss.id||!finite(s.speed)||s.speed<=0)return;
      var mode=modeFor(p,phase,s),plannedRadius=(finite(s.r)?s.r:s.kind==='orb'?3.8:3)*p.size*(phase===1?1.08:phase===2?.94:1);
      // Dense authored rings already contain many parents. Branch only the
      // sparse large accents there; dedicated identity split volleys retain
      // their explicit 4/3/2 parent count. Other ring bodies remain accelerated
      // source objects, without promising a split that will never happen.
      if(mode==='split'&&(i%6!==0||plannedRadius<5.2))mode='comet';
      configure(w,s,p,phase,i,mode);
    });return specs;
  }
  function initialize(b,s,w){
    if(!b||!s||!s.v27Motion)return false;
    FIELDS.forEach(function(k){if(s[k]!==undefined)b[k]=s[k];});
    b.v27Age=0;b.v27Reflections=0;b.v27SplitDone=!!s.v27SplitDone;return true;
  }
  function advance(b,dt,width){
    if(!b||!b.v27Motion||!finite(dt)||dt<0||!finite(width)||width<=0)return false;
    b.v27BouncePoint=null;if(!dt)return true;
    var age=finite(b.v27Age)?b.v27Age:b.age||0,paused=b.pauseUntil&&age>=b.pauseFrom&&age<b.pauseUntil;
    if(paused)return true;
    if(finite(b.v27TurnRate)&&age<(b.v27TurnUntil||0)){
      var turn=b.v27TurnRate;
      if(b.v27WaveRate)turn*=Math.cos(age*b.v27WaveRate+(b.v27WavePhase||0));
      var magnitude=Math.hypot(b.vx,b.vy);b.angle+=turn*dt;b.vx=Math.cos(b.angle)*magnitude;b.vy=Math.sin(b.angle)*magnitude;
    }
    if(b.acceleration&&age>=(b.accelerateAt||0)){
      var speed=Math.min(b.maxSpeed||270,Math.hypot(b.vx,b.vy)+b.acceleration*dt);b.vx=Math.cos(b.angle)*speed;b.vy=Math.sin(b.angle)*speed;
    }
    // Reflect when the leading capsule cap reaches the wall, not only when
    // its centre-radius circle does. The authored long body stays in bounds.
    var wallMargin=b.r+Math.abs(Math.cos(b.angle))*(b.halfLength||0)+1;
    var x=b.x+b.vx*dt,y=b.y+b.vy*dt,left=wallMargin,right=width-wallMargin;
    if(b.v27Reflect&&b.v27Reflections<1&&((b.vx<0&&x<left)||(b.vx>0&&x>right))){
      var wall=b.vx<0?left:right,fraction=clamp((wall-b.x)/(b.vx*dt),0,1),hitY=b.y+b.vy*dt*fraction,remaining=dt*(1-fraction);
      b.v27BouncePoint={x:wall,y:hitY,fraction:fraction};b.v27Reflections=1;b.vx=-b.vx;
      b.x=wall+b.vx*remaining;b.y=hitY+b.vy*remaining;b.angle=Math.atan2(b.vy,b.vx);
    }else{b.x=x;b.y=y;}
    return true;
  }
  function splitChildren(w,b){
    if(!w||!b||!b.v27SplitAt||b.v27SplitDone||b.v27Child)return null;
    var age=finite(b.v27Age)?b.v27Age:b.age||0;if(age<b.v27SplitAt)return null;
    if(age>b.v27SplitAt+.8||b.y>420)return [];
    var player=w.player;if(!player||b.y>=player.y-88||Math.hypot(b.x-player.x,b.y-player.y)<110)return null;
    var count=clamp(Math.floor(b.v27SplitCount||2),2,3),spread=clamp(b.v27SplitSpread||.28,.18,.42),out=[];
    // A delayed branch keeps its visible parent. All daughters move downwards
    // and inherit that source; they never split again or appear near the pilot.
    var center=clamp(Math.atan2(b.vy,b.vx),.65,Math.PI-.65);
    for(var i=0;i<count;i++){
      var s={x:b.x,y:b.y,angle:clamp(center+(i-(count-1)/2)*spread,.35,Math.PI-.35),speed:clamp(b.v27ChildSpeed||Math.hypot(b.vx,b.vy),65,220),r:clamp(b.r*.62,2.5,4.2),kind:b.kind==='blade'?'needle':b.kind,color:b.color||'#ffffff',ownerId:b.ownerId,ttl:3.2,patternId:b.patternId||'',paletteSlot:((b.paletteSlot||0)+i)%2,v27Pattern:b.v27Pattern,v27Motion:'straight',v27Child:true,v27SplitDone:true,v27Generation:1,v27ParentId:b.id,_v27Prepared:true,_rhythmPrepared:true,_hellPrepared:true};
      ['sourceActorId','modelActorId','sourcePhase','identityRole','identityCastId','identityWarningAt','identityActiveAt'].forEach(function(k){if(b[k]!==undefined)s[k]=b[k];});out.push(s);
    }
    out._hellPrepared=true;return out;
  }
  return Object.freeze({profiles:profiles,profileFor:profileFor,makeVolley:makeVolley,decorate:decorate,initialize:initialize,advance:advance,splitChildren:splitChildren,fields:FIELDS});
});
