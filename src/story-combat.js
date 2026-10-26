/* Pure, bounded 60Hz story combat. Art, narrative unlocks and persistence are
 * outside this module. A supported mechanical adaptation is not evidence that
 * every canonical encounter/form/objective has been implemented or approved. */
(function(root,factory){
  'use strict';var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilStoryCombat=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var W=360,H=640,HZ=60,DT=1/HZ,TAU=Math.PI*2,VERSION=1;
  var CAPS=Object.freeze({bullets:160,shots:64,effects:24,hazards:3});
  var PATTERNS=Object.freeze(['fan','ring','lanes','aimed','spiral','sweep']);
  var RESOLUTIONS=Object.freeze(['cleared','victory']);
  // These scenes require validated objective sequences, not ordinary boss HP.
  var SPECIAL_SCENES=Object.freeze(['last301','kair01','kair02','kair03','kair10','hando02','hando03','murder01','murder02','murder03','murder04','cult04','ending']);
  var SPECIAL_IDS=Object.freeze(['l301-boss','kair-great-03','c104-boss','c104-mid']);
  var records=new WeakMap(),runSequence=0;
  function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
  function finite(v){return typeof v==='number'&&Number.isFinite(v);}
  function integer(v,a,b){return Number.isInteger(v)&&v>=a&&v<=b;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function identifier(v){return typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,96}$/.test(v);}
  function validateSpec(spec){
    if(!object(spec)||spec.conditional===true||!identifier(spec.id)||!identifier(spec.sceneId)||SPECIAL_IDS.indexOf(spec.id)>=0||SPECIAL_SCENES.indexOf(spec.sceneId)>=0||RESOLUTIONS.indexOf(spec.resolution)<0)return false;
    if(spec.objectiveSceneId!=null&&spec.objectiveSceneId!==spec.sceneId)return false;
    if(!Array.isArray(spec.stages)||spec.stages.length<1||spec.stages.length>16)return false;
    var rootLink=spec.id==='dist00-boss'&&spec.sceneId==='dist00'&&spec.resolution==='cleared';
    if(spec.id==='dist00-boss'&&!rootLink)return false;
    var ids=new Set();
    return spec.stages.every(function(stage){
      if(!object(stage)||!identifier(stage.id)||ids.has(stage.id)||stage.target!==(rootLink?'command-link':'body')||typeof stage.label!=='string'||stage.label.length>160||!Array.isArray(stage.sourceExplicit))return false;
      ids.add(stage.id);var a=stage.adaptation;
      return object(a)&&PATTERNS.indexOf(a.pattern)>=0&&integer(a.windupTicks,24,180)&&integer(a.activeTicks,36,240)&&integer(a.recoveryTicks,30,180)&&integer(a.intervalTicks,12,120)&&integer(a.count,1,36)&&finite(a.speed)&&a.speed>=40&&a.speed<=240&&(a.spread==null||finite(a.spread)&&a.spread>=0&&a.spread<=TAU);
    });
  }
  function supports(spec){try{return validateSpec(spec);}catch(_){return false;}}
  function rand(rec){var x=rec.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;rec.rng=x>>>0;return rec.rng/4294967296;}
  function segmentDistanceSquared(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy,t=den?clamp(((px-ax)*dx+(py-ay)*dy)/den,0,1):0;dx=px-ax-t*dx;dy=py-ay-t*dy;return dx*dx+dy*dy;}
  function orient(ax,ay,bx,by,cx,cy){return (bx-ax)*(cy-ay)-(by-ay)*(cx-ax);}
  function segmentPairSquared(ax,ay,bx,by,cx,cy,dx,dy){
    var a=orient(ax,ay,bx,by,cx,cy),b=orient(ax,ay,bx,by,dx,dy),c=orient(cx,cy,dx,dy,ax,ay),d=orient(cx,cy,dx,dy,bx,by);
    if(a*b<=0&&c*d<=0&&Math.max(Math.min(ax,bx),Math.min(cx,dx))<=Math.min(Math.max(ax,bx),Math.max(cx,dx))&&Math.max(Math.min(ay,by),Math.min(cy,dy))<=Math.min(Math.max(ay,by),Math.max(cy,dy)))return 0;
    return Math.min(segmentDistanceSquared(ax,ay,cx,cy,dx,dy),segmentDistanceSquared(bx,by,cx,cy,dx,dy),segmentDistanceSquared(cx,cy,ax,ay,bx,by),segmentDistanceSquared(dx,dy,ax,ay,bx,by));
  }
  function bulletDistanceSquared(b,px,py,x,y){var l=b.halfLength||0,ux=Math.cos(b.angle)*l,uy=Math.sin(b.angle)*l;return segmentPairSquared(b.px-px,b.py-py,b.x-x,b.y-y,-ux,-uy,ux,uy);}
  function circleSwept(a,b,r){return segmentDistanceSquared(0,0,a.px-b.px,a.py-b.py,a.x-b.x,a.y-b.y)<=r*r;}
  function effect(w,kind,x,y,r,ttl,color){if(w.effects.length>=CAPS.effects)return;w.effects.push({id:++w.idCounter,kind:kind,x:x,y:y,r:r,ageTicks:0,ttlTicks:ttl,age:0,ttl:ttl/HZ,color:color||'#b8d6f1',damaging:false});}
  function cycleLength(a){return a.windupTicks+a.activeTicks+a.recoveryTicks;}
  function stageSpec(rec,w){return rec.spec.stages[w.stageIndex];}
  function hpFor(index){return 1050+index*70;}
  function planCycle(w,rec){
    var a=stageSpec(rec,w).adaptation,b=w.boss;
    rec.aim=Math.atan2(w.player.y-b.y,w.player.x-b.x);rec.ringGap=Math.PI/2+Math.sin(w.stageIndex*.8+w.cycleIndex*.7+rec.stageSeed)*.23;
    if(a.pattern==='sweep'){
      for(var old=w.hazards.length-1;old>=0;old--)if(w.tick>=w.hazards[old].expireAt)w.hazards.splice(old,1);
      var n=Math.min(3,a.count),spread=a.spread==null?.28:a.spread;
      for(var i=0;i<n;i++){
        var angle=rec.aim+(i-(n-1)/2)*spread;
        w.hazards.push({id:++w.idCounter,x1:b.x,y1:b.y+12,x2:b.x+Math.cos(angle)*820,y2:b.y+12+Math.sin(angle)*820,width:6,phase:'warning',progress:0,born:w.tick,activeAt:w.tick+a.windupTicks,fadeAt:w.tick+a.windupTicks+a.activeTicks,expireAt:w.tick+cycleLength(a),color:'#d1bfef'});
      }
    }
    effect(w,'bossCharge',b.x,b.y+12,26,Math.min(48,a.windupTicks),'#cbb8e5');
  }
  function beginStage(w,rec,index){
    w.stageIndex=index;w.phase=index;w.stageTime=0;w.stage='boss';w.status='active';w.cyclePhase='windup';w.cycleTick=0;w.cycleIndex=0;w.cyclePhaseTick=0;w.cyclePhaseAge=0;
    rec.stageTick=0;rec.hp=hpFor(index);rec.damageInStage=0;rec.stageSeed=rand(rec)*TAU;
    var s=stageSpec(rec,w),previous=w.boss;
    w.boss={id:++w.idCounter,stageId:s.id,name:s.label,x:previous?previous.x:180,y:previous?previous.y:116,px:previous?previous.x:180,py:previous?previous.y:116,r:26,hp:rec.hp,maxHp:rec.hp,action:'charge',actionProgress:0,lean:0};
    w.boss.bodyProtected=s.target==='command-link';
    w.commandLink=w.boss.bodyProtected?{id:++w.idCounter,kind:'command-link',x:w.boss.x+46,y:w.boss.y+42,px:w.boss.x+46,py:w.boss.y+42,r:14,hp:rec.hp,maxHp:rec.hp,bodyProtected:true}:null;
    w.enemies=[w.boss];w.patternName=s.label;planCycle(w,rec);
  }
  function create(spec,options){
    if(!supports(spec))throw new RangeError('Unsupported story combat specification/objective');
    options=options||{};
    if(options.runId!==undefined&&!identifier(options.runId))throw new TypeError('Invalid story combat runId');
    if(options.seed!==undefined&&!integer(options.seed,0,4294967295))throw new TypeError('Invalid story combat seed');
    if(options.difficulty!==undefined&&options.difficulty!=='normal'&&options.difficulty!=='gentle')throw new TypeError('Invalid difficulty');
    var seed=options.seed===undefined?0x6d2b79f5:options.seed,difficulty=options.difficulty||'normal';
    var w={simVersion:VERSION,combatId:spec.id,sceneId:spec.sceneId,runId:options.runId||'story-run-'+(++runSequence),seed:seed,difficulty:difficulty,tick:0,time:0,stage:'boss',status:'active',stageIndex:0,phase:0,stageTime:0,cyclePhase:'windup',cycleTick:0,cycleIndex:0,cyclePhaseTick:0,cyclePhaseAge:0,idCounter:0,patternName:'',boss:null,commandLink:null,enemies:[],bullets:[],shots:[],hazards:[],effects:[],memory:35,skillRotation:true,
      player:{x:180,y:540,px:180,py:540,r:3,hp:difficulty==='gentle'?5:3,maxHp:difficulty==='gentle'?5:3,invulnerableUntil:0,delayUntil:0,parryUntil:0,egoUntil:0},
      skills:{memoryReadyAt:0,delayReadyAt:0,parryReadyAt:0,egoReadyAt:0,globalReadyAt:0},
      stats:{shots:0,damage:0,hits:0,graze:0,reflected:0,bodyDamage:0,commandLinkDamage:0,stageClears:0,stageTicks:[],stageDamage:[],casts:{memory:0,delay:0,parry:0,ego:0},peakBullets:0,peakShots:0,peakEffects:0,poolPressure:0,droppedGroups:0},resultReason:''};
    var rec={spec:copy(spec),runId:w.runId,combatId:spec.id,seed:seed,rng:seed||0x6d2b79f5,stageTick:0,hp:0,damageInStage:0,damage:0,hits:0,shots:0,clears:[],stageDamage:[],stageTicks:[],bodyDamage:0,commandLinkDamage:0,commandLinkCuts:[],ownedShots:new WeakMap(),casts:{memory:0,delay:0,parry:0,ego:0},nextShotAt:0,nextGrazeAt:0,terminal:null,terminalTick:null,actualTicks:0};
    records.set(w,rec);beginStage(w,rec,0);return w;
  }
  function movePlayer(w,input){
    var p=w.player;p.px=p.x;p.py=p.y;
    var dx=0,dy=0;
    // Nonzero drag deltas take precedence; neutral dx/dy do not suppress keys.
    if(finite(input.dx)&&input.dx!==0||finite(input.dy)&&input.dy!==0){
      dx=finite(input.dx)?input.dx:0;dy=finite(input.dy)?input.dy:0;var length=Math.hypot(dx,dy);if(length>40){dx*=40/length;dy*=40/length;}
    }else{
      dx=finite(input.x)?clamp(input.x,-1,1):0;dy=finite(input.y)?clamp(input.y,-1,1):0;var n=Math.hypot(dx,dy);if(n>1){dx/=n;dy/=n;}var speed=input.slow?1.5:3;dx*=speed;dy*=speed;
    }
    p.x=clamp(p.x+dx,14,346);p.y=clamp(p.y+dy,240,620);
  }
  function updateBoss(w,rec){
    var b=w.boss,a=stageSpec(rec,w).adaptation,t=w.cycleTick;
    b.px=b.x;b.py=b.y;
    if(a.pattern!=='sweep'||w.cyclePhase==='recovery'){
      var destination=180+Math.sin(w.stageTime*.62+w.stageIndex*.9+rec.stageSeed)*72;
      b.x+=(destination-b.x)*.035;b.y+=(116+Math.sin(w.stageTime*.82)*12-b.y)*.035;
    }
    b.lean=clamp((b.x-b.px)/1.4,-1,1);
    if(w.cyclePhase==='windup'){b.action='charge';b.actionProgress=t/a.windupTicks;}
    else if(w.cyclePhase==='active'){b.action='attack';b.actionProgress=(t-a.windupTicks)/a.activeTicks;}
    else{b.action='recover';b.actionProgress=(t-a.windupTicks-a.activeTicks)/a.recoveryTicks;}
    b.hp=rec.hp;
    if(w.commandLink){var link=w.commandLink;link.px=link.x;link.py=link.y;link.x=b.x+46;link.y=b.y+42;link.hp=rec.hp;}
  }
  function emit(w,rec,specs){
    if(w.bullets.length+specs.length>CAPS.bullets){w.stats.poolPressure++;w.stats.droppedGroups++;return false;}
    specs.forEach(function(s){var speed=s.speed*(w.difficulty==='gentle'?.80:1),l=s.kind==='needle'?7:0;w.bullets.push({id:++w.idCounter,x:s.x,y:s.y,px:s.x,py:s.y,r:l?3:3.4,halfLength:l,angle:s.angle,baseVX:Math.cos(s.angle)*speed,baseVY:Math.sin(s.angle)*speed,vx:Math.cos(s.angle)*speed,vy:Math.sin(s.angle)*speed,kind:s.kind||'orb',ageTicks:0,age:0,color:s.color||'#c1b2ec',grazed:false});});return true;
  }
  function firePattern(w,rec){
    var a=stageSpec(rec,w).adaptation,pulse=w.cycleTick-a.windupTicks;
    if(w.cyclePhase!=='active'||pulse%a.intervalTicks!==0||a.pattern==='sweep')return;
    var b=w.boss,specs=[],n=a.count,i,angle,spread=a.spread==null?.16:a.spread;
    function shot(x,y,angle,kind){specs.push({x:x,y:y,angle:angle,speed:a.speed,kind:kind||'orb'});}
    if(a.pattern==='ring'){
      for(i=0;i<n;i++){angle=i*TAU/n+w.cycleIndex*.31+pulse*.003+rec.stageSeed;if(Math.abs(Math.atan2(Math.sin(angle-rec.ringGap),Math.cos(angle-rec.ringGap)))<.24)continue;shot(b.x,b.y+10,angle);}
    }else if(a.pattern==='spiral'){
      for(i=0;i<n;i++)shot(b.x,b.y+10,i*TAU/n+w.cycleIndex*.22+pulse*.017+rec.stageSeed);
    }else if(a.pattern==='lanes'){
      var safe=(w.cycleIndex+Math.floor(rec.stageSeed))%n;
      for(i=0;i<n;i++){if(n>2&&i===safe)continue;shot(22+(W-44)*(i+.5)/n,66,Math.PI/2+Math.sin(w.cycleIndex+i)*.055,'needle');}
    }else{
      var center=a.pattern==='aimed'?Math.atan2(w.player.y-b.y,w.player.x-b.x):Math.PI/2+Math.sin(w.cycleIndex*.8+pulse*.008)*.22;
      for(i=0;i<n;i++)shot(b.x,b.y+10,center+(i-(n-1)/2)*spread,a.pattern==='aimed'?'needle':'orb');
    }
    emit(w,rec,specs);
  }
  function target(w){if(w.stage!=='boss'||!w.boss||w.boss.hp<=0)return null;var rec=records.get(w);if(rec&&stageSpec(rec,w).target==='command-link')return w.commandLink&&w.commandLink.hp>0?w.commandLink:null;return w.boss;}
  function targetDistanceSquared(w,s){var t=target(w);if(!t)return Infinity;return segmentDistanceSquared(0,0,s.px-t.px,s.py-t.py,s.x-t.x,s.y-t.y);}
  function addShot(w,rec,x,y,reflected){
    var b=target(w);if(!b||w.shots.length>=CAPS.shots)return false;
    var speed=540,travel=Math.hypot(b.x-x,b.y-y)/speed,vx=(b.x-b.px)*HZ,vy=(b.y-b.py)*HZ;
    var angle=Math.atan2(b.y+vy*travel-y,b.x+vx*travel-x);
    var shot={id:++w.idCounter,x:x,y:y,px:x,py:y,r:2.2,angle:angle,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,reflected:!!reflected,ageTicks:0,age:0};
    rec.ownedShots.set(shot,{x:x,y:y,vx:shot.vx,vy:shot.vy,ageTicks:0,reflected:!!reflected});w.shots.push(shot);
    if(!reflected){rec.shots++;w.stats.shots=rec.shots;}return true;
  }
  function damage(w,rec,amount){
    if(w.stage!=='boss'||rec.hp<=0)return;
    var dealt=Math.min(rec.hp,amount);rec.hp-=dealt;rec.damageInStage+=dealt;rec.damage+=dealt;w.stats.damage=rec.damage;w.boss.hp=rec.hp;w.memory=clamp(w.memory+.85,0,100);
    if(stageSpec(rec,w).target==='command-link'){rec.commandLinkDamage+=dealt;w.stats.commandLinkDamage=rec.commandLinkDamage;if(w.commandLink)w.commandLink.hp=rec.hp;}
    else{rec.bodyDamage+=dealt;w.stats.bodyDamage=rec.bodyDamage;}
    if(rec.hp<=0){
      if(stageSpec(rec,w).target==='command-link')rec.commandLinkCuts.push(stageSpec(rec,w).id);
      rec.clears.push(stageSpec(rec,w).id);rec.stageDamage.push(rec.damageInStage);rec.stageTicks.push(rec.stageTick);
      w.stats.stageClears=rec.clears.length;w.stats.stageDamage=rec.stageDamage.slice();w.stats.stageTicks=rec.stageTicks.slice();
      w.stage='transition';w.stageTime=0;w.boss.action='recover';w.boss.actionProgress=0;w.enemies=[];
      effect(w,'phaseClear',w.boss.x,w.boss.y,38,42,'#e5d4ae');
    }
  }
  function updateShots(w,rec){
    for(var i=w.shots.length-1;i>=0;i--){var s=w.shots[i],owned=rec.ownedShots.get(s);if(!owned){w.shots.splice(i,1);continue;}s.px=owned.x;s.py=owned.y;owned.x+=owned.vx*DT;owned.y+=owned.vy*DT;owned.ageTicks++;s.x=owned.x;s.y=owned.y;s.vx=owned.vx;s.vy=owned.vy;s.ageTicks=owned.ageTicks;s.age=s.ageTicks/HZ;s.reflected=owned.reflected;s.r=2.2;s.angle=Math.atan2(owned.vy,owned.vx);
      var b=target(w);if(b&&targetDistanceSquared(w,s)<=(s.r+b.r)*(s.r+b.r)){damage(w,rec,s.reflected?22:16);effect(w,'shotImpact',s.x,s.y,7,9,'#c5e8ef');w.shots.splice(i,1);}
      else if(s.ageTicks>120||s.y<-30||s.y>H+30||s.x<-30||s.x>W+30)w.shots.splice(i,1);
    }
  }
  function trySkill(w,rec,name){
    if(['memory','delay','parry','ego'].indexOf(name)<0||w.stage!=='boss'||w.tick<w.skills.globalReadyAt||w.tick<w.skills[name+'ReadyAt'])return false;
    var cost={memory:30,delay:18,parry:20,ego:45}[name];if(w.memory<cost)return false;
    w.memory-=cost;w.skills.globalReadyAt=w.tick+24;w.skills[name+'ReadyAt']=w.tick+{memory:480,delay:540,parry:420,ego:900}[name];rec.casts[name]++;w.stats.casts[name]=rec.casts[name];
    if(name==='memory'){w.bullets.length=0;effect(w,'memory',w.player.x,w.player.y,42,30,'#b8e7eb');}
    if(name==='delay'){w.player.delayUntil=w.tick+210;effect(w,'delay',w.player.x,w.player.y,36,42,'#b8a7df');}
    if(name==='parry'){w.player.parryUntil=w.tick+42;effect(w,'parry',w.player.x,w.player.y,30,42,'#efd7a1');}
    if(name==='ego'){w.player.egoUntil=w.tick+150;damage(w,rec,64);effect(w,'ego',w.player.x,w.player.y,40,48,'#b7ead3');}
    return true;
  }
  function skills(w,rec,input){
    if(typeof input.skillRotation==='boolean')w.skillRotation=input.skillRotation;
    w.memory=clamp(w.memory+2*DT,0,100);
    if(typeof input.skill==='string'){trySkill(w,rec,input.skill);return;}
    if(!w.skillRotation||w.stage!=='boss')return;
    var danger=w.bullets.some(function(b){var dx=b.x-w.player.x,dy=b.y-w.player.y;return dx*dx+dy*dy<70*70;});
    if(danger&&trySkill(w,rec,'parry'))return;
    if(w.bullets.length>12&&trySkill(w,rec,'memory'))return;
    if(w.bullets.length>8&&trySkill(w,rec,'delay'))return;
    if(w.memory>=45)trySkill(w,rec,'ego');
  }
  function hurt(w,rec){
    var p=w.player;if(w.tick<p.invulnerableUntil||w.status!=='active')return false;
    p.hp--;p.invulnerableUntil=w.tick+90;rec.hits++;w.stats.hits=rec.hits;effect(w,'hurt',p.x,p.y,18,24,'#e8a4b3');
    if(p.hp<=0){p.hp=0;w.stage='lost';w.status='lost';w.resultReason='기억을 이어갈 힘이 남아 있지 않습니다.';rec.terminal='lost';rec.terminalTick=w.tick;}
    return true;
  }
  function updateBullets(w,rec){
    var p=w.player,slow=w.tick<p.delayUntil?.36:1;
    for(var i=w.bullets.length-1;i>=0;i--){var b=w.bullets[i];b.px=b.x;b.py=b.y;b.vx=b.baseVX*slow;b.vy=b.baseVY*slow;b.x+=b.vx*DT;b.y+=b.vy*DT;b.ageTicks++;b.age=b.ageTicks/HZ;
      var distance=bulletDistanceSquared(b,p.px,p.py,p.x,p.y);
      if(w.tick<p.parryUntil&&distance<=(b.r+30)*(b.r+30)){
        if(addShot(w,rec,b.x,b.y,true))w.stats.reflected++;
        w.bullets.splice(i,1);continue;
      }
      if(distance<=(b.r+p.r)*(b.r+p.r)&&hurt(w,rec)){w.bullets.splice(i,1);continue;}
      if(!b.grazed&&distance<=(b.r+p.r+12)*(b.r+p.r+12)){b.grazed=true;w.stats.graze++;w.memory=clamp(w.memory+1,0,100);}
      if(b.ageTicks>420||b.x<-36||b.x>W+36||b.y<-36||b.y>H+36)w.bullets.splice(i,1);
    }
  }
  function updateHazards(w,rec){
    var p=w.player;
    for(var i=w.hazards.length-1;i>=0;i--){var h=w.hazards[i];
      if(w.tick>=h.expireAt){w.hazards.splice(i,1);continue;}
      if(w.tick<h.activeAt){h.phase='warning';h.progress=clamp((w.tick-h.born)/(h.activeAt-h.born),0,1);}
      else if(w.tick<h.fadeAt){h.phase='active';h.progress=clamp((w.tick-h.activeAt)/(h.fadeAt-h.activeAt),0,1);var radius=h.width/2+p.r;if(segmentPairSquared(p.px,p.py,p.x,p.y,h.x1,h.y1,h.x2,h.y2)<=radius*radius)hurt(w,rec);}
      else{h.phase='fade';h.progress=clamp((w.tick-h.fadeAt)/(h.expireAt-h.fadeAt),0,1);}
    }
  }
  function terminalWin(w,rec){
    if(rec.clears.length!==rec.spec.stages.length||rec.stageDamage.some(function(d,i){return d!==hpFor(i);})||w.player.hp<=0)return;
    w.stage='won';w.status='won';w.resultReason='전투를 돌파했습니다.';rec.terminal='won';rec.terminalTick=w.tick;
    rec.result={combatId:rec.combatId,runId:rec.runId,resolution:rec.spec.resolution,evidence:{simVersion:VERSION,terminalTick:w.tick,seed:rec.seed,stageIds:rec.clears.slice(),stageDamage:rec.stageDamage.slice(),stageTicks:rec.stageTicks.slice(),damage:rec.damage,shots:rec.shots,hits:rec.hits,playerHp:w.player.hp,skillCasts:copy(rec.casts),stageTargets:rec.spec.stages.map(function(s){return s.target;}),bodyDamage:rec.bodyDamage,commandLinkDamage:rec.commandLinkDamage,commandLinkCut:rec.commandLinkCuts.length===rec.spec.stages.length,protectedBodyUntouched:rec.spec.stages.every(function(s){return s.target==='command-link';})&&rec.bodyDamage===0},combatVerified:true};
  }
  function step(w,input){
    var rec=records.get(w);if(!rec)throw new TypeError('Unknown story combat world');
    if(rec.terminal)return w;
    if(w.combatId!==rec.combatId||w.runId!==rec.runId||w.tick!==rec.actualTicks||!integer(w.stageIndex,0,rec.spec.stages.length-1))throw new Error('Story combat world identity was modified');
    input=object(input)?input:{};w.tick++;rec.actualTicks=w.tick;w.time=w.tick/HZ;
    movePlayer(w,input);
    if(w.stage==='boss'){
      rec.stageTick++;w.stageTime=rec.stageTick/HZ;var a=stageSpec(rec,w).adaptation,total=cycleLength(a);
      w.cycleTick=rec.stageTick%total;w.cycleIndex=Math.floor(rec.stageTick/total);
      w.cyclePhase=w.cycleTick<a.windupTicks?'windup':w.cycleTick<a.windupTicks+a.activeTicks?'active':'recovery';
      w.cyclePhaseTick=w.cyclePhase==='windup'?w.cycleTick:w.cyclePhase==='active'?w.cycleTick-a.windupTicks:w.cycleTick-a.windupTicks-a.activeTicks;w.cyclePhaseAge=w.cyclePhaseTick/HZ;
      updateBoss(w,rec);if(w.cycleTick===0)planCycle(w,rec);firePattern(w,rec);
    }else if(w.stage==='transition'){w.stageTime+=DT;}
    skills(w,rec,input);
    if(target(w)&&w.tick>=rec.nextShotAt){if(addShot(w,rec,w.player.x,w.player.y-9,false))rec.nextShotAt=w.tick+(w.tick<w.player.egoUntil?4:7);}
    updateShots(w,rec);updateBullets(w,rec);updateHazards(w,rec);
    if(w.stage==='transition'&&!w.bullets.length&&!w.hazards.length){
      w.shots.length=0;
      if(w.stageIndex+1<rec.spec.stages.length){w.player.hp=Math.min(w.player.maxHp,w.player.hp+1);beginStage(w,rec,w.stageIndex+1);}
      else terminalWin(w,rec);
    }
    for(var i=w.effects.length-1;i>=0;i--){var e=w.effects[i];e.ageTicks++;e.age=e.ageTicks/HZ;if(e.ageTicks>=e.ttlTicks)w.effects.splice(i,1);}
    w.stats.peakBullets=Math.max(w.stats.peakBullets,w.bullets.length);w.stats.peakShots=Math.max(w.stats.peakShots,w.shots.length);w.stats.peakEffects=Math.max(w.stats.peakEffects,w.effects.length);
    return w;
  }
  function result(w){
    var rec=records.get(w);
    if(!rec||rec.terminal!=='won'||!rec.result||w.stage!=='won'||w.status!=='won'||w.tick!==rec.terminalTick||w.tick!==rec.actualTicks||w.runId!==rec.runId||w.combatId!==rec.combatId||w.stageIndex!==rec.spec.stages.length-1||w.player.hp!==rec.result.evidence.playerHp||w.stats.damage!==rec.damage||w.stats.stageClears!==rec.clears.length||!object(w.boss)||w.boss.hp!==0||w.stats.bodyDamage!==rec.bodyDamage||w.stats.commandLinkDamage!==rec.commandLinkDamage)return null;
    if(rec.spec.stages.every(function(s){return s.target==='command-link';})&&(!w.boss.bodyProtected||!object(w.commandLink)||w.commandLink.hp!==0||rec.bodyDamage!==0))return null;
    return copy(rec.result);
  }
  function verifyResult(event,active,w){
    try{
      var actual=result(w);
      return !!(actual&&object(event)&&object(active)&&active.status==='active'&&active.combatId===actual.combatId&&active.runId===actual.runId&&event.combatId===actual.combatId&&event.runId===actual.runId&&event.resolution===actual.resolution&&event.combatVerified===true&&JSON.stringify(event.evidence)===JSON.stringify(actual.evidence));
    }catch(_){return false;}
  }
  return Object.freeze({VERSION:VERSION,FIXED_HZ:HZ,FIXED_DT:DT,WIDTH:W,HEIGHT:H,CAPS:CAPS,PATTERNS:PATTERNS,SUPPORTED_RESOLUTIONS:RESOLUTIONS,UNSUPPORTED_OBJECTIVE_SCENES:SPECIAL_SCENES,supports:supports,create:create,step:step,result:result,verifyResult:verifyResult,geometry:Object.freeze({segmentDistanceSquared:segmentDistanceSquared,segmentPairDistanceSquared:segmentPairSquared,bulletDistanceSquared:bulletDistanceSquared,targetDistanceSquared:targetDistanceSquared})});
}));
