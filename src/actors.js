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
        fullAnimationCycles:0,sourcePivotsCertified:false,sinBossDraws:0,lastSinSample:null,wrathManifestDraws:0,lastWrathManifest:null};
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
      if(world&&world.finalPractice&&world.boss&&world.boss.kind==='cult-leader')return drawCultBoss(ctx,world,x,y,width,opacity);
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
      var identity = e.archetype === 'weaver' ? 'spider' : e.archetype === 'wraith' ? 'swamp' : e.archetype === 'ember' ? 'ember' : ['echo','vial','guard','denial'].includes(e.archetype) ? e.archetype : null;
      var contract = CONTRACTS[identity];
      if (!contract || !ready(contract)) return false;
      if (e.age < 0) return true;
      var state=selectedPose(world,e,false), angle=angleFor(world,e,false), scale=contract.scale;
      drawSilk(ctx,world,e,contract.poses[state],scale,angle,e.x,e.y,false,1,identity);
      drawPose(ctx,contract,state,e.x,e.y,scale,angle,.96); metrics.enemyDraws++;
      return true;
    }
    return {beginFrame:beginFrame,drawBoss:drawBoss,drawEnemy:drawEnemy,
      getMetrics:function () { return Object.assign(JSON.parse(JSON.stringify(metrics)),{downwardMotion:motionPresentation?motionPresentation.getMetrics():null}); }};
  }
  global.HapilActors = Object.freeze({create:create,contracts:CONTRACTS,sinContracts:SIN_CONTRACTS,
    sinContractFor:sinContractFor,sinAssetKeysForEncounter:sinAssetKeysForEncounter,invalidSinAssetForEncounter:invalidSinAssetForEncounter,cultAssetKeysForEncounter:cultAssetKeysForEncounter,invalidCultAssetForEncounter:invalidCultAssetForEncounter});
}(typeof window !== 'undefined' ? window : globalThis));
