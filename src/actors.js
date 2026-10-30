/* Verified R7 actor presentation. Four authored poses, not animation frames.
 * Images are exact publisher crops. Source physical pivots were not certified:
 * the pixel anchors below are HAPIL's visually inspected torso anchors.
 * All poses of one actor share one native-pixel scale. Never fit alpha bounds
 * independently, mirror the source, or modify combat coordinates here.
 */
(function (global) {
  'use strict';
  function pose(key, w, h, x, y, silkX, silkY) {
    return Object.freeze({key:key,width:w,height:h,anchor:Object.freeze([x,y]),
      silk:silkX == null ? null : Object.freeze([silkX,silkY])});
  }
  var CONTRACTS = Object.freeze({
lucifer:Object.freeze({scale:0.23,poses:Object.freeze({walk:pose('actorLuciferWalk',768,520,400,210,400,185),idle:pose('actorLuciferIdle',768,514,394,205,394,180),hit:pose('actorLuciferHit',768,504,385,210,385,185),attack:pose('actorLuciferAttack',768,510,400,210,400,185)})}),
mask:Object.freeze({scale:0.18,poses:Object.freeze({walk:pose('actorMaskWalk',768,545,390,265,390,240),idle:pose('actorMaskIdle',768,546,412,235,412,210),hit:pose('actorMaskHit',768,478,450,218,450,193),attack:pose('actorMaskAttack',768,479,500,215,500,190)})}),
echo:Object.freeze({scale:0.095,poses:Object.freeze({walk:pose('actorEchoWalk',627,680,330,270,330,245),idle:pose('actorEchoIdle',627,680,285,270,285,245),hit:pose('actorEchoHit',627,574,320,220,320,195),attack:pose('actorEchoAttack',627,574,355,220,355,195)})}),
vial:Object.freeze({scale:0.09,poses:Object.freeze({walk:pose('actorVialWalk',724,543,400,225,400,200),idle:pose('actorVialIdle',724,543,380,215,380,190),hit:pose('actorVialHit',724,543,400,210,400,185),attack:pose('actorVialAttack',724,543,380,215,380,190)})}),
guard:Object.freeze({scale:0.095,poses:Object.freeze({walk:pose('actorGuardWalk',627,627,330,240,330,215),idle:pose('actorGuardIdle',627,627,320,245,320,220),hit:pose('actorGuardHit',627,627,370,270,370,245),attack:pose('actorGuardAttack',627,627,370,280,370,255)})}),
denial:Object.freeze({scale:0.095,poses:Object.freeze({walk:pose('actorDenialWalk',627,627,310,275,310,250),idle:pose('actorDenialIdle',627,627,300,260,300,235),hit:pose('actorDenialHit',627,627,330,280,330,255),attack:pose('actorDenialAttack',627,627,345,290,345,265)})}),
    violet:Object.freeze({scale:.218,poses:Object.freeze({
      idle:pose('actorVioletIdle',768,512,378,220,378,195),
      walk:pose('actorVioletWalk',768,512,382,230,382,205),
      attack:pose('actorVioletAttack',836,512,412,225,412,200),
      hit:pose('actorVioletHit',700,512,351,220,351,195)
    })}),
    horn:Object.freeze({scale:.190,poses:Object.freeze({
      idle:pose('actorHornIdle',627,615,335,250,335,225),
      walk:pose('actorHornWalk',627,615,350,250,350,225),
      attack:pose('actorHornAttack',627,639,382,254,382,229),
      hit:pose('actorHornHit',627,639,335,190,335,165)
    })}),
    balrog:Object.freeze({scale:.260,poses:Object.freeze({
      idle:pose('actorBalrogIdle',768,512,385,160,385,135),
      walk:pose('actorBalrogWalk',768,512,488,157,488,132),
      attack:pose('actorBalrogAttack',698,512,302,182,302,157),
      hit:pose('actorBalrogHit',838,512,455,130,455,105)
    })}),
    spider:Object.freeze({scale:.084,poses:Object.freeze({
      idle:pose('actorSpiderIdle',627,627,290,335,338,205),
      walk:pose('actorSpiderWalk',627,627,326,315,385,170),
      attack:pose('actorSpiderAttack',627,627,285,265,342,140),
      hit:pose('actorSpiderHit',627,627,302,282,350,150)
    })}),
    swamp:Object.freeze({scale:.084,poses:Object.freeze({
      idle:pose('actorSwampIdle',604,627,300,390,300,365),
      walk:pose('actorSwampWalk',650,627,455,390,455,365),
      attack:pose('actorSwampAttack',627,627,462,310,462,285),
      hit:pose('actorSwampHit',627,627,370,300,370,275)
    })}),
    ember:Object.freeze({scale:.088,poses:Object.freeze({
      idle:pose('actorEmberIdle',768,512,395,288,395,263),
      walk:pose('actorEmberWalk',768,512,465,285,465,260),
      attack:pose('actorEmberAttack',768,512,423,245,423,220),
      hit:pose('actorEmberHit',768,512,430,190,430,165)
    })})
  });
  var STATES = ['idle','walk','attack','hit'];
  // Source-backed chapter-II keyposes. These are manually inspected torso
  // registrations, not source-certified physical pivots or new tween frames.
  // One common scale is retained across each form's four source cells.
  function sinContract(key,scale,anchors){
    return Object.freeze({key:key,width:512,height:512,cell:256,scale:scale,
      anchors:Object.freeze(anchors.map(function(a){return Object.freeze(a);})),
      poseNames:Object.freeze(['prepare','downstroke','follow','recover']),
      manualDisplayAnchors:true,sourcePivotsCertified:false,authoredKeyposes:4,fullAnimationCycles:0});
  }
  var SIN_CONTRACTS=Object.freeze({
    belphegor:sinContract('sinBelphegorAtlas',.47,[[130,119],[129,128],[132,131],[130,125]]),
    leviathan:sinContract('sinLeviathanAtlas',.50,[[141,100],[136,118],[136,122],[123,108]]),
    beelzebub:sinContract('sinBeelzebubAtlas',.55,[[138,131],[129,158],[137,145],[129,113]]),
    asmodeus:sinContract('sinAsmodeusAtlas',.68,[[136,112],[129,125],[141,137],[126,111]]),
    mammon:sinContract('sinMammonAtlas',.59,[[138,112],[123,127],[139,129],[116,98]]),
    mammonChild:sinContract('sinMammonChildAtlas',.61,[[134,113],[139,119],[138,119],[132,105]]),
    wrath:sinContract('sinWrathAtlas',.50,[[142,112],[130,105],[132,105],[135,108]]),
    pride:sinContract('sinPrideAtlas',.53,[[131,105],[134,111],[135,114],[130,105]]),
    prideCyborg:sinContract('sinPrideCyborgAtlas',.63,[[127,91],[118,127],[133,132],[125,88]])
  });
  var SIN_ORDER=Object.freeze(['belphegor','leviathan','beelzebub','asmodeus','mammon','wrath','pride']);
  var WRATH_MANIFESTS=Object.freeze(['sinWrathBearV13','sinWrathWolfV13','sinWrathDragonV13']);
  // Six chronological encounters in one controller system, not six new people.
  // The four Drive atlases contain four authored keyposes. The migration core
  // has three original side-facing keyposes, not a new down-facing animation.
  function chapterContract(identity,key,scale,anchors,width,height,cell,columns){
    return Object.freeze({identity:identity,key:key,scale:scale,width:width||512,height:height||512,
      cell:cell||256,columns:columns||2,anchors:Object.freeze(anchors.map(function(a){return Object.freeze(a);})),
      authoredKeyposes:anchors.length,fullAnimationCycles:0,manualDisplayAnchors:true,sourcePivotsCertified:false});
  }
  var CHAPTER3_CONTRACTS=Object.freeze([
    chapterContract('chapter3WarManager','chapter3U201Atlas',.67,[[139,127],[141,140],[122,132],[143,118]]),
    chapterContract('chapter3MercyCorrector','chapter3U202Atlas',.64,[[120,122],[146,117],[124,111],[121,126]]),
    chapterContract('chapter3MemoryCensor','chapter3U204Atlas',.68,[[139,126],[129,131],[138,139],[129,117]]),
    chapterContract('chapter3ReversalAdministrator','chapter3U205Atlas',.71,[[135,119],[132,119],[139,121],[130,120]]),
    chapterContract('chapter3MigrationCore','chapter3MigrationCoreAtlas',.23,[[362,370],[362,370],[362,370]],2172,724,724,3),
    Object.freeze({identity:'chapter3Controller',key:'chapter3ControllerIdle',width:672,height:384,scale:.47,
      keys:Object.freeze(['chapter3ControllerIdle','chapter3ControllerRain','chapter3ControllerAttack','chapter3ControllerTransition']),
      anchors:Object.freeze([[367,163],[342,183],[349,184],[325,149]]),authoredKeyposes:4,fullAnimationCycles:0,manualDisplayAnchors:true,sourcePivotsCertified:false})
  ]);
  var CHAPTER3_DRONE_KEYS=Object.freeze(['chapter3DroneIdle','chapter3DroneAttack','chapter3DroneDestroyed']);
  function chapter3AssetKeysForEncounter(group){
    var c=CHAPTER3_CONTRACTS[group-13];if(!c)return [];
    return (c.keys?c.keys.slice():[c.key]).concat(group===18?['chapter3MemoryGate']:[],CHAPTER3_DRONE_KEYS);
  }
  function invalidChapter3AssetForEncounter(images,group){
    var c=CHAPTER3_CONTRACTS[group-13];if(!c)return 'chapter3-encounter-unsupported';
    var keys=chapter3AssetKeysForEncounter(group);
    for(var i=0;i<keys.length;i++){
      var key=keys[i],im=images&&images[key],size=key==='chapter3MemoryGate'?[1671,941]:CHAPTER3_DRONE_KEYS.indexOf(key)>=0?[512,512]:[c.width,c.height];
      if(!im||im.complete===false||im.naturalWidth!==size[0]||im.naturalHeight!==size[1])return key;
    }return null;
  }
  function storyAssetKeysForEncounter(group){return global.HapilStoryAssets?global.HapilStoryAssets.actorKeysForEncounter(group):[];}
  function invalidStoryAssetForEncounter(images,group){return global.HapilStoryAssets?global.HapilStoryAssets.invalidAsset(images,group,'actors'):'story-visual-contract';}
  function sinContractFor(world){
    if(!world||!world.campaign||!world.boss)return null;
    var b=world.boss,id=b.kind||world.bossId;
    if(SIN_ORDER.indexOf(id)<0)return null;
    var c=id==='mammon'&&(world.phase||0)===2?SIN_CONTRACTS.mammonChild:id==='pride'&&(world.phase||0)===2?SIN_CONTRACTS.prideCyborg:SIN_CONTRACTS[id];
    return b.artKey&&b.artKey!==c.key?null:c;
  }
  // Four generated keyposes derived from the verified c104 source, not an
  // interpolated animation. Torso anchors are manually estimated.
  var CULT_KEYS=Object.freeze(['cultLeaderAtlas']);
  function cultAssetKeysForEncounter(group){return group===12?CULT_KEYS.slice():[];}
  function invalidCultAssetForEncounter(images,group){
    if(group!==12)return 'cult-encounter-unsupported';
    for(var i=0;i<CULT_KEYS.length;i++){var im=images&&images[CULT_KEYS[i]];if(!im||im.complete===false||im.naturalWidth!==1536||im.naturalHeight!==1024)return CULT_KEYS[i];}return null;
  }
  function sinAssetKeysForEncounter(group){
    var id=SIN_ORDER[group-5];if(!id)return [];
    var keys=[SIN_CONTRACTS[id].key];
    if(id==='mammon')keys.push(SIN_CONTRACTS.mammonChild.key);
    if(id==='pride')keys.push(SIN_CONTRACTS.prideCyborg.key);
    if(id==='wrath')keys.push.apply(keys,WRATH_MANIFESTS);
    // The existing neutral assault/guard presentation remains on its source
    // actors. It is never relabelled as one of the seven sins.
    ['denial','guard'].forEach(function(name){STATES.forEach(function(state){keys.push(CONTRACTS[name].poses[state].key);});});
    return keys;
  }
  function invalidSinAssetForEncounter(images,group){
    if(!Number.isInteger(group)||group<5||group>11)return 'sin-encounter-unsupported';
    var keys=sinAssetKeysForEncounter(group);
    for(var i=0;i<keys.length;i++){
      var key=keys[i],im=images&&images[key],expected=WRATH_MANIFESTS.indexOf(key)>=0?[1254,1254]:key.indexOf('sin')===0?[512,512]:[627,627];
      if(!im||im.complete===false||im.naturalWidth!==expected[0]||im.naturalHeight!==expected[1])return key;
    }
    return null;
  }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function value(n,fallback) { return finite(n) ? n : fallback; }
  function selectedPose(world, actor, boss) {
    // Core exposes a four-tick, throttled hit window for bosses. Optional
    // enemy hit windows are supported, but are never invented from wall time.
    if (finite(actor.hitUntil) && value(world.tick,0) < actor.hitUntil) return 'hit';
    var p = clamp(value(actor.actionProgress,0),0,1);
    if (actor.action === 'move' || actor.action === 'enter' || actor.action === 'exit') return 'walk';
    if (actor.action === 'attack') return 'attack';
    if (boss && actor.action === 'charge' && p > .72) return 'walk';
    if (boss && actor.action === 'recover' && p < .18) return 'attack';
    return 'idle';
  }
  function angleFor(world, actor, boss) {
    var t = value(world.time,value(world.tick,0)/60), p = clamp(value(actor.actionProgress,0),0,1);
    var lean = clamp(value(actor.lean,0),-1,1);
    var angle = lean * (boss ? .010 : .030) + Math.sin(t * 2.2 + value(actor.wobble,0)) * (boss ? .003 : .009);
    if (actor.action === 'charge') angle -= Math.sin(p*Math.PI) * (boss ? .010 : .020);
    if (actor.action === 'attack') angle += Math.sin(Math.min(1,p*7)*Math.PI) * (boss ? .010 : .024);
    return clamp(angle,boss ? -.016 : -.055,boss ? .016 : .055);
  }
  function create(images) {
    images = images || {};
    var motionPresentation=global.HapilBossMotion?global.HapilBossMotion.create(images):null;
    var wrathStamps={};
    var metrics;
    function beginFrame() {
      if(motionPresentation)motionPresentation.beginFrame();
      metrics = {actorDraws:0,bossDraws:0,enemyDraws:0,silkTethers:0,enemySilkTethers:0,bossSilkTethers:0,
        lastBossAsset:null,lastBossPose:null,lastBossIdentity:null,
        usedAssets:{},usedPoses:{},lastSilk:null,authoredPosesPerActor:4,
        fullAnimationCycles:0,sourcePivotsCertified:false,sinBossDraws:0,lastSinSample:null,wrathManifestDraws:0,lastWrathManifest:null,
        chapter3BossDraws:0,chapter3DroneDraws:0,chapter3GateDraws:0,lastChapter3Sample:null,
        storyBossDraws:0,storyParticipantDraws:0,storyMinionDraws:0,storyPlayerDraws:0,storySupportDraws:0,storyEchoDraws:0,storyTargetMarkerDraws:0,lastStoryTargetMarker:null,lastStorySamples:[]};
    }
    beginFrame();
    function ready(contract) {
      return STATES.every(function (state) {
        var p = contract.poses[state], im = images[p.key];
        return im && im.complete !== false && im.naturalWidth === p.width && im.naturalHeight === p.height;
      });
    }
    function drawPose(ctx, contract, state, x, y, scale, angle, opacity) {
      var p = contract.poses[state];
      ctx.save();
      ctx.globalAlpha *= clamp(value(opacity,1),0,1);
      ctx.translate(x,y); ctx.rotate(angle);
      // Isolated PNGs include every source pixel; no adjacent atlas-cell bleed.
      ctx.drawImage(images[p.key],0,0,p.width,p.height,
        -p.anchor[0]*scale,-p.anchor[1]*scale,p.width*scale,p.height*scale);
      ctx.restore();
      metrics.actorDraws++;
      metrics.usedAssets[p.key] = (metrics.usedAssets[p.key] || 0) + 1;
      metrics.usedPoses[state] = (metrics.usedPoses[state] || 0) + 1;
      return p.key;
    }
    function drawBoss(ctx, world, x, y, width, opacity) {
      if(world&&world.campaignRevision>=5&&world.bossIndex>=18&&!world.finalPractice)return drawStoryBoss(ctx,world,x,y,width,opacity);
      if(world&&world.finalPractice&&world.boss&&world.boss.kind==='cult-leader')return drawCultBoss(ctx,world,x,y,width,opacity);
      if(world&&world.campaignRevision>=4&&world.bossIndex>=12&&world.bossIndex<=17)return drawChapter3Boss(ctx,world,x,y,width,opacity);
      var sin=sinContractFor(world);
      if(sin)return drawSinBoss(ctx,world,sin,x,y,width,opacity);
      if(motionPresentation&&motionPresentation.drawBoss(ctx,world,x,y,width,opacity)){
        var mm=motionPresentation.getMetrics();metrics.actorDraws+=mm.spriteDraws;metrics.bossDraws++;metrics.bossSilkTethers+=mm.tethers;metrics.silkTethers+=mm.tethers;metrics.lastBossAsset=mm.lastBossAsset;metrics.lastBossPose=mm.lastPose;metrics.lastBossIdentity=mm.lastBossIdentity;metrics.lastSilk=mm.lastSilk;metrics.usedAssets[mm.lastBossAsset]=(metrics.usedAssets[mm.lastBossAsset]||0)+mm.spriteDraws;metrics.usedPoses[mm.lastPose]=(metrics.usedPoses[mm.lastPose]||0)+1;return true;
      }

      if (!world || !world.campaign || !world.boss || world.stage === 'bossIntro' || !finite(x) || !finite(y)) return false;
      var b = world.boss, identity = b.kind || world.bossId || (b.artKey === 'boss' ? 'violet' : b.artKey);
      var contract = CONTRACTS[identity];
      if (!contract || !['violet','horn','balrog','mask','lucifer'].includes(identity) || !ready(contract)) return false;
      var state = selectedPose(world,b,true), scale = contract.scale * clamp(value(width,230)/230,.1,1);
      var angle = angleFor(world,b,true);
      drawSilk(ctx,world,b,contract.poses[state],scale,angle,x,y,true,opacity,identity);
      var key;
      if(identity==='mask'||identity==='lucifer'){
        var progress=clamp(value(b.actionProgress,0),0,1),blend=clamp(progress*(b.action==='move'?9:b.action==='charge'?9:b.action==='attack'?26:16),0,1);
        if(state==='hit')blend=1;
        var prev=b.action==='attack'?'idle':b.action==='recover'?'attack':b.action==='charge'?'walk':'idle';
        if(prev!==state&&blend<1){drawPose(ctx,contract,prev,x,y,scale,angle,(opacity==null?1:opacity)*(1-blend));}
        key=drawPose(ctx,contract,state,x,y,scale,angle,(opacity==null?1:opacity)*(prev!==state?blend:1));
      }else key = drawPose(ctx,contract,state,x,y,scale,angle,opacity);
      metrics.bossDraws++; metrics.lastBossAsset=key; metrics.lastBossPose=state; metrics.lastBossIdentity=identity;
      return true;
    }
    function storyEntry(world){return global.HapilStoryAssets&&global.HapilStoryAssets.forWorld(world);}
    function visibleInPhase(a,world){return (!a.phases||a.phases.indexOf(world.phase||0)>=0)&&(!a.stages||a.stages.indexOf(world.stage)>=0);}
    function storyFrame(a,world,actor){
      var frames=a.frames||[{rect:[0,0,a.width,a.height],anchor:a.anchor||[a.width/2,a.height/2]}],map=a.poseMap||{idle:0};
      var age=finite(actor.releaseTick)&&actor.releaseTick>=0?world.tick-actor.releaseTick:Infinity;
      var state=world.stage==='transition'&&map.transition!=null?'transition':age>=0&&age<12&&map.release!=null?'release':actor.action==='charge'&&map.charge!=null?'charge':actor.action==='recover'&&map.recover!=null?'recover':actor.action==='attack'&&map.attack!=null?'attack':actor.action==='move'&&map.move!=null?'move':'idle';
      if(finite(actor.hitUntil)&&world.tick<actor.hitUntil&&map.hit!=null)state='hit';
      var index=world.samongAwakened&&a.awakenedFrame!=null?a.awakenedFrame:map[state]==null?0:map[state],f=frames[index];if(!f)return null;
      if(world.samongAwakened&&a.awakenedFrame!=null)state='samong-awakened';
      return {frame:f,index:index,state:state,releaseAge:finite(age)?age:null,authoredFrames:frames.length};
    }
    function drawStoryActor(ctx,world,a,actor,x,y,width,opacity,role){
      if(!a||!visibleInPhase(a,world)||!finite(x)||!finite(y))return false;
      var sample=storyFrame(a,world,actor),f=sample&&sample.frame;if(!f)return false;
      var key=f.key||a.key,im=images[key],iw=f.width||a.width,ih=f.height||a.height;
      if(!im||im.complete===false||im.naturalWidth!==iw||im.naturalHeight!==ih)return false;
      var rect=f.rect||[0,0,iw,ih],anchor=f.anchor||a.anchor||[rect[2]/2,rect[3]/2],scaleLimit=world.stage==='bossIntro'?(a.introScaleLimit||2.5):1,scale=(f.scale||a.scale)*clamp(value(width,230)/230,.1,scaleLimit);
      var offset=a.offset||[0,0],dx=x+offset[0],dy=y+offset[1];
      ctx.save();ctx.globalAlpha*=clamp(value(opacity,1),0,1);ctx.translate(dx,dy);
      if(role!=='support'&&role!=='player')ctx.rotate(clamp(value(actor.lean,0),-1,1)*.007);
      ctx.drawImage(im,rect[0],rect[1],rect[2],rect[3],-anchor[0]*scale,-anchor[1]*scale,rect[2]*scale,rect[3]*scale);ctx.restore();
      metrics.actorDraws++;metrics.usedAssets[key]=(metrics.usedAssets[key]||0)+1;metrics.usedPoses[sample.state]=(metrics.usedPoses[sample.state]||0)+1;
      metrics.lastStorySamples.push({id:a.id||role,key:key,role:role,frame:sample.index,pose:sample.state,sourceRect:rect.slice(),anchor:anchor.slice(),scale:scale,position:[dx,dy],combatPosition:[x,y],authoredKeyposes:sample.authoredFrames,fullAnimationCycles:0,sourcePivotsCertified:false,actualReleaseTick:actor.releaseTick==null?-1:actor.releaseTick,releaseAge:sample.releaseAge});
      return true;
    }
    function drawStoryBoss(ctx,world,x,y,width,opacity){
      var entry=storyEntry(world),b=world.boss;if(!entry||!b||invalidStoryAssetForEncounter(images,world.bossIndex+1))return false;
      var activeCopies=entry.echoActorIndex!=null&&Array.isArray(b.shadowCopies)&&b.shadowCopies.some(function(c){return finite(c.warningAt)&&finite(c.activeAt)&&world.tick>=c.warningAt&&world.tick<c.activeAt+30;}),drew=0;
      (entry.actors||[]).forEach(function(a){
        if(activeCopies&&!a.participantId)return;
        var actor=b,px=x,py=y,role='boss';
        if(a.participantId){actor=(b.participants||[]).find(function(p){return p.id===a.participantId;});if(!actor)return;px=x+actor.x-b.x;py=y+actor.y-b.y;role='participant';}
        if(drawStoryActor(ctx,world,a,actor,px,py,width,opacity,role)){
          drew++;metrics.storyBossDraws++;if(role==='participant')metrics.storyParticipantDraws++;
          metrics.lastBossAsset=metrics.lastStorySamples[metrics.lastStorySamples.length-1].key;metrics.lastBossIdentity=a.id||b.kind||world.bossId;metrics.lastBossPose=metrics.lastStorySamples[metrics.lastStorySamples.length-1].pose;
          if(role==='participant'&&a.label){ctx.save();ctx.textAlign='center';ctx.font='9px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#e7dccc';ctx.fillText(a.label,px,py+(a.labelOffsetY||83));ctx.restore();}
        }
      });
      if(entry.echoActorIndex!=null&&Array.isArray(b.shadowCopies)){
        var model=entry.actors[entry.echoActorIndex];
        for(var ci=0;model&&ci<Math.min(6,b.shadowCopies.length);ci++){
          var copy=b.shadowCopies[ci],start=copy.warningAt,end=copy.activeAt+30;if(!finite(start)||!finite(end)||world.tick<start||world.tick>=end)continue;
          var actor=Object.assign({action:world.tick<copy.activeAt?'charge':'recover'},copy),echo=Object.assign({},model,{id:copy.id||'fallen-knight-copy-'+ci,scale:model.scale*.60,offset:[0,0]});
          var fade=world.tick<copy.activeAt?.45+.25*clamp((world.tick-start)/Math.max(1,copy.activeAt-start),0,1):.75*(end-world.tick)/30;
          if(drawStoryActor(ctx,world,echo,actor,copy.x,copy.y,230,fade,'echo')){drew++;metrics.storyEchoDraws++;metrics.storyBossDraws++;metrics.lastBossAsset=metrics.lastStorySamples[metrics.lastStorySamples.length-1].key;metrics.lastBossIdentity=b.kind||world.bossId;metrics.lastBossPose=metrics.lastStorySamples[metrics.lastStorySamples.length-1].pose;}
        }
      }
      if(activeCopies&&entry.targetMarker){
        // Six manifestations remain six bodies. This small source-owned sword
        // is an explicit aim marker for the unchanged logical clash target,
        // never a seventh actor, an attack, or a fabricated geometric proxy.
        var marker=entry.targetMarker,im=images[marker.key],crop=marker.crop,anchor=marker.anchor,dw=marker.display[0],dh=marker.display[1];
        if(im&&im.complete!==false&&im.naturalWidth===marker.width&&im.naturalHeight===marker.height){
          ctx.save();ctx.globalAlpha*=clamp(value(opacity,1),0,1);ctx.drawImage(im,crop[0],crop[1],crop[2],crop[3],x-(anchor[0]-crop[0])*dw/crop[2],y-(anchor[1]-crop[1])*dh/crop[3],dw,dh);
          ctx.textAlign='center';ctx.font='9px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#e3d9c7';ctx.fillText(marker.label,x,y+34);ctx.restore();
          metrics.storyTargetMarkerDraws++;metrics.usedAssets[marker.key]=(metrics.usedAssets[marker.key]||0)+1;metrics.lastStoryTargetMarker={key:marker.key,position:[x,y],sourceCrop:crop.slice(),sourceAnchor:anchor.slice(),displaySize:marker.display.slice(),label:marker.label,damaging:false,aimTarget:true};
        }
      }
      if(drew){metrics.bossDraws++;return true;}return false;
    }
    function drawSceneObjects(ctx,world){
      var entry=storyEntry(world);if(!entry||invalidStoryAssetForEncounter(images,world.bossIndex+1))return;
      (entry.supportActors||[]).forEach(function(a){var pos=a.position||[180,150];if(drawStoryActor(ctx,world,a,{action:'idle',releaseTick:-1},pos[0],pos[1],230,a.opacity==null?.85:a.opacity,'support')){metrics.storySupportDraws++;if(a.label){ctx.save();ctx.textAlign='center';ctx.font='8px Arial,"Malgun Gothic",sans-serif';ctx.fillStyle='#c7dad4';ctx.fillText(a.label,pos[0],a.labelY||Math.min(197,pos[1]+49));ctx.restore();}}});
    }
    function drawPlayer(ctx,world,opacity){
      var entry=storyEntry(world),a=entry&&entry.player,p=world&&world.player;if(!a||!p)return false;
      if(drawStoryActor(ctx,world,a,{action:'idle',releaseTick:-1},p.x,p.y,230,opacity,'player')){metrics.storyPlayerDraws++;return true;}return false;
    }
    function drawChapter3Boss(ctx,world,x,y,width,opacity){
      var c=CHAPTER3_CONTRACTS[world.bossIndex-12],b=world.boss,group=world.bossIndex+1;
      if(!c||!b||b.artKey!==c.identity||!finite(x)||!finite(y)||invalidChapter3AssetForEncounter(images,group))return false;
      var age=finite(b.releaseTick)&&b.releaseTick>=0?world.tick-b.releaseTick:Infinity;
      var frame=age>=0&&age<12?2:b.action==='charge'?1:b.action==='recover'?3:0;
      if(c.authoredKeyposes===3&&frame===3)frame=0;
      var key=c.keys?c.keys[frame]:c.key,anchor=c.anchors[frame],scale=c.scale*clamp(value(width,230)/230,.1,world.stage==='bossIntro'?2.5:1);
      var cell=c.cell||c.width,sx=c.keys?0:frame%c.columns*cell,sy=c.keys?0:Math.floor(frame/c.columns)*cell,sw=c.keys?c.width:cell,sh=c.keys?c.height:cell;
      ctx.save();ctx.globalAlpha*=clamp(value(opacity,1),0,1);ctx.translate(x,y);
      if(group===18){
        // Intact, non-damaging source overlay behind the controller. No door
        // destruction, break-up, substitute body or invented guardian persona.
        ctx.save();ctx.globalAlpha*=.48;ctx.drawImage(images.chapter3MemoryGate,0,0,1671,941,-126,-60,252,142);ctx.restore();metrics.chapter3GateDraws++;
      }
      ctx.rotate(clamp(value(b.lean,0),-1,1)*.007);
      ctx.drawImage(images[key],sx,sy,sw,sh,-anchor[0]*scale,-anchor[1]*scale,sw*scale,sh*scale);ctx.restore();
      var poseName=['prepare','charge','release','recover'][frame];metrics.actorDraws++;metrics.bossDraws++;metrics.chapter3BossDraws++;
      metrics.lastBossAsset=key;metrics.lastBossIdentity=b.kind||world.bossId;metrics.lastBossPose=poseName;
      metrics.usedAssets[key]=(metrics.usedAssets[key]||0)+1;metrics.usedPoses[poseName]=(metrics.usedPoses[poseName]||0)+1;
      metrics.lastChapter3Sample={frame:frame,key:key,sourceRect:[sx,sy,sw,sh],anchor:anchor,scale:scale,position:[x,y],combatPosition:[x,y],authoredKeyposes:c.authoredKeyposes,fullAnimationCycles:0,sourcePivotsCertified:false,actualReleaseTick:b.releaseTick,releaseAge:finite(age)?age:null};return true;
    }
    function drawCultBoss(ctx,world,x,y,width,opacity){
      if(!finite(x)||!finite(y)||invalidCultAssetForEncounter(images,12))return false;
      var b=world.boss,age=finite(b.releaseTick)&&b.releaseTick>=0?world.tick-b.releaseTick:Infinity;
      var frame=age>=0&&age<12?2:b.action==='charge'?1:b.action==='recover'?3:0,key=CULT_KEYS[0],anchors=[[424,160],[373,198],[415,205],[381,157]],anchor=anchors[frame];
      var scale=.30*clamp(value(width,230)/230,.1,world.stage==='bossIntro'?2.5:1),angle=clamp(value(b.lean,0),-1,1)*.009;
      ctx.save();ctx.globalAlpha*=clamp(value(opacity,1),0,1);ctx.translate(x,y);ctx.rotate(angle);
      // All four sprites share the same fixed canvas; this torso registration
      // is manual and not a certified source pivot.
      ctx.drawImage(images[key],frame%2*768,Math.floor(frame/2)*512,768,512,-anchor[0]*scale,-anchor[1]*scale,768*scale,512*scale);ctx.restore();
      metrics.actorDraws++;metrics.bossDraws++;metrics.lastBossAsset=key;metrics.lastBossPose=['idle','charge','down-attack','recover'][frame];metrics.lastBossIdentity='cult-leader';metrics.usedAssets[key]=(metrics.usedAssets[key]||0)+1;return true;
    }
    function drawSinBoss(ctx,world,c,x,y,width,opacity){
      var image=images[c.key];
      if(!image||image.complete===false||image.naturalWidth!==512||image.naturalHeight!==512||!finite(x)||!finite(y))return false;
      var b=world.boss;
      var sample=global.HapilBossMotion&&global.HapilBossMotion.sample?global.HapilBossMotion.sample(world,b):{from:3,to:3,blend:1};
      var from=clamp(sample.from,0,3),to=clamp(sample.to,0,3),blend=clamp(sample.blend,0,1);
      var scale=c.scale*clamp(value(width,230)/230,.1,world.stage==='bossIntro'?2.5:1),angle=clamp(value(b.lean,0),-1,1)*.009;
      var weight=global.HapilBossMotion&&global.HapilBossMotion.presentation?global.HapilBossMotion.presentation(world,b):{dy:0,opacity:1};
      var drawY=y+value(weight.dy,0),alpha=clamp(value(opacity,1),0,1)*value(weight.opacity,1);
      if((b.kind||world.bossId)==='wrath')drawWrathManifest(ctx,world,x,y,alpha);
      if((b.kind||world.bossId)==='asmodeus'){
        // A fine, non-damaging attachment on the inspected upper back. It is
        // a source-neutral tether, not an authored thread-animation claim.
        var anchor=c.anchors[blend>=.5?to:from];
        drawSilk(ctx,world,b,{anchor:anchor,silk:[anchor[0],anchor[1]-20]},scale,angle,x,drawY,true,alpha,'asmodeus');
      }
      function frame(index,a){
        if(a<=.001)return;var p=c.anchors[index];ctx.save();ctx.globalAlpha*=alpha*a;ctx.translate(x,drawY);ctx.rotate(angle);
        ctx.drawImage(image,index%2*256,Math.floor(index/2)*256,256,256,-p[0]*scale,-p[1]*scale,256*scale,256*scale);ctx.restore();metrics.actorDraws++;
        metrics.usedAssets[c.key]=(metrics.usedAssets[c.key]||0)+1;
      }
      if(from===to)frame(to,1);else{frame(from,1-blend);frame(to,blend);}
      var poseName=c.poseNames[blend>=.5?to:from];
      metrics.bossDraws++;metrics.sinBossDraws++;metrics.lastBossAsset=c.key;metrics.lastBossIdentity=b.kind||world.bossId;metrics.lastBossPose=poseName;
      metrics.usedPoses[poseName]=(metrics.usedPoses[poseName]||0)+1;
      metrics.lastSinSample={from:from,to:to,blend:blend,scale:scale,angle:angle,position:[x,drawY],combatPosition:[x,y],anchors:[c.anchors[from],c.anchors[to]],presentationOffsetY:weight.dy};
      return true;
    }
    function drawWrathManifest(ctx,world,x,y,opacity){
      if(world.stage!=='boss')return;
      var b=world.boss,releaseAge=finite(b.releaseTick)&&b.releaseTick>=0?value(world.tick,0)-b.releaseTick:Infinity;
      if(b.action!=='charge'&&!(releaseAge>=0&&releaseAge<18))return;
      var key=WRATH_MANIFESTS[clamp(world.phase||0,0,2)],source=images[key];
      if(!source||source.complete===false||source.naturalWidth!==1254||source.naturalHeight!==1254)return;
      var stamp=wrathStamps[key];
      if(!stamp){
        stamp=document.createElement('canvas');stamp.width=104;stamp.height=104;
        stamp.getContext('2d').drawImage(source,0,0,1254,1254,0,0,104,104);wrathStamps[key]=stamp;
      }
      var progress=clamp(value(b.actionProgress,0),0,1),a=b.action==='charge'?.25+.4*progress:.65*(1-releaseAge/18);
      var px=clamp(x+(x>240?-58:58),60,300),py=clamp(y+36,116,178);
      // Source-backed, static attack manifestation. It is non-damaging and
      // stays wholly above the player lane; real bullets/lasers draw later.
      ctx.save();ctx.globalAlpha*=opacity*a;ctx.drawImage(stamp,px-52,py-52,104,104);ctx.restore();
      metrics.wrathManifestDraws++;metrics.usedAssets[key]=(metrics.usedAssets[key]||0)+1;
      metrics.lastWrathManifest={key:key,phase:world.phase||0,center:[px,py],size:104,opacity:a,damaging:false,sourceFrames:1};
    }
    function drawSilk(ctx, world, actor, p, scale, angle, x, y, boss, opacity, identity) {
      // One fine neutral puppet tether per visible actor, behind its body.
      // The attachment receives the same pose transform as the sprite. It is
      // decoration only: no collision, hitbox, damage or motion is added.
      var dx=(p.silk[0]-p.anchor[0])*scale, dy=(p.silk[1]-p.anchor[1])*scale;
      var endX=x+dx*Math.cos(angle)-dy*Math.sin(angle), endY=y+dx*Math.sin(angle)+dy*Math.cos(angle);
      // Boss HUD covers y24..64. Start its tether beneath the panel so even
      // a low-opacity HUD never has a thread running through its lettering.
      var topY=boss ? 64 : 24;
      if (endY <= topY) return;
      var topX=clamp(boss ? 180 : value(actor.baseX,x),12,348);
      var progress=clamp(value(actor.actionProgress,0),0,1);
      var alpha=(boss ? .30 : .40)*clamp(value(opacity,1),0,1);
      if (actor.action === 'exit') alpha*=1-progress*.65;
      if (alpha <= 0) return;
      var clock=value(actor.age,value(world.time,value(world.tick,0)/60));
      var sway=Math.sin(clock*2+value(actor.wobble,0))*(boss ? 1 : 2);
      ctx.save(); ctx.globalAlpha*=alpha; ctx.strokeStyle='#c9c5b5'; ctx.lineWidth=.65;
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(topX,topY);
      ctx.lineTo((topX+endX)/2+sway,topY+(endY-topY)*.46); ctx.lineTo(endX,endY); ctx.stroke(); ctx.restore();
      metrics.silkTethers++;
      if (boss) metrics.bossSilkTethers++; else metrics.enemySilkTethers++;
      metrics.lastSilk={start:[topX,topY],end:[endX,endY],action:actor.action || 'idle',alpha:alpha,damaging:false,identity:identity,boss:boss};
    }
    function drawEnemy(ctx, world, e) {
      if (!world || !world.campaign || !e || !finite(e.x) || !finite(e.y)) return false;
      if(e.archetype==='story-minion'){
        var entry=storyEntry(world),a=entry&&entry.minion;if(!a)return false;if(e.age<0)return true;
        if(drawStoryActor(ctx,world,a,e,e.x,e.y,230,1,'minion')){metrics.enemyDraws++;metrics.storyMinionDraws++;return true;}return false;
      }
      if(e.archetype==='chapter3-drone'){
        // Three authored states only. Moving and hit states retain idle art.
        var key=e.action==='destroyed'?'chapter3DroneDestroyed':e.action==='attack'?'chapter3DroneAttack':'chapter3DroneIdle',im=images[key];
        if(!im||im.complete===false||im.naturalWidth!==512||im.naturalHeight!==512)return false;
        if(e.age<0)return true;
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(clamp(value(e.lean,0),-1,1)*.025);ctx.drawImage(im,0,0,512,512,-64,-64,128,128);ctx.restore();
        metrics.actorDraws++;metrics.enemyDraws++;metrics.chapter3DroneDraws++;metrics.usedAssets[key]=(metrics.usedAssets[key]||0)+1;return true;
      }
      var identity = e.archetype === 'weaver' ? 'spider' : e.archetype === 'wraith' ? 'swamp' : e.archetype === 'ember' ? 'ember' : ['echo','vial','guard','denial'].includes(e.archetype) ? e.archetype : null;
      var contract = CONTRACTS[identity];
      if (!contract || !ready(contract)) return false;
      if (e.age < 0) return true;
      var state=selectedPose(world,e,false), angle=angleFor(world,e,false), scale=contract.scale;
      drawSilk(ctx,world,e,contract.poses[state],scale,angle,e.x,e.y,false,1,identity);
      drawPose(ctx,contract,state,e.x,e.y,scale,angle,.96); metrics.enemyDraws++;
      return true;
    }
    return {beginFrame:beginFrame,drawBoss:drawBoss,drawEnemy:drawEnemy,drawSceneObjects:drawSceneObjects,drawPlayer:drawPlayer,
      getMetrics:function () { return Object.assign(JSON.parse(JSON.stringify(metrics)),{downwardMotion:motionPresentation?motionPresentation.getMetrics():null}); }};
  }
  global.HapilActors = Object.freeze({create:create,contracts:CONTRACTS,sinContracts:SIN_CONTRACTS,chapter3Contracts:CHAPTER3_CONTRACTS,
    storyAssetKeysForEncounter:storyAssetKeysForEncounter,invalidStoryAssetForEncounter:invalidStoryAssetForEncounter,
    chapter3AssetKeysForEncounter:chapter3AssetKeysForEncounter,invalidChapter3AssetForEncounter:invalidChapter3AssetForEncounter,
    sinContractFor:sinContractFor,sinAssetKeysForEncounter:sinAssetKeysForEncounter,invalidSinAssetForEncounter:invalidSinAssetForEncounter,cultAssetKeysForEncounter:cultAssetKeysForEncounter,invalidCultAssetForEncounter:invalidCultAssetForEncounter});
}(typeof window !== 'undefined' ? window : globalThis));
