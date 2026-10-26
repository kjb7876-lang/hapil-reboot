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
    var metrics;
    function beginFrame() {
      metrics = {actorDraws:0,bossDraws:0,enemyDraws:0,silkTethers:0,enemySilkTethers:0,bossSilkTethers:0,
        lastBossAsset:null,lastBossPose:null,lastBossIdentity:null,
        usedAssets:{},usedPoses:{},lastSilk:null,authoredPosesPerActor:4,
        fullAnimationCycles:0,sourcePivotsCertified:false};
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
      getMetrics:function () { return JSON.parse(JSON.stringify(metrics)); }};
  }
  global.HapilActors = Object.freeze({create:create,contracts:CONTRACTS});
}(typeof window !== 'undefined' ? window : globalThis));
