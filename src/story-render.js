/* Source-backed story combat presentation. Four keyposes and short dissolves
 * are consumer choreography, not newly authored in-between/joint animation.
 */
(function(root,factory){
  'use strict';var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilStoryRenderer=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var W=360,H=640,TAU=Math.PI*2,LIMITS=Object.freeze({bullets:768,shots:96,effects:96,enemies:12,hazards:40});
  function finite(n,fallback){return Number.isFinite(n)?n:fallback;}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function smooth(n){n=clamp(n,0,1);return n*n*(3-2*n);}
  function mix(a,b,t){return a+(b-a)*t;}
  function missing(label){var e=new Error('Missing approved story art: '+label);e.name='MissingArtError';e.code='MISSING_STORY_ART';e.asset=label;return e;}
  function dimensions(im){return [im&&(im.naturalWidth||im.width)||0,im&&(im.naturalHeight||im.height)||0];}
  function usable(im){var d=dimensions(im);return !!(im&&im.complete!==false&&d[0]>0&&d[1]>0);}
  function poseSample(phase){
    phase=phase||{};var age=Math.max(0,finite(phase.age,0)),kind=phase.kind||'recovery';
    if(kind==='windup')return {from:3,to:0,blend:smooth(age/.16)};
    if(kind==='active')return age<.1?{from:1,to:1,blend:1}:{from:1,to:2,blend:smooth((age-.1)/.08)};
    if(kind==='recovery')return {from:2,to:3,blend:smooth(age/.18)};
    return {from:3,to:3,blend:1};
  }
  function create(canvas,options){
    options=options||{};if(!canvas||typeof canvas.getContext!=='function')throw new TypeError('Story renderer requires a canvas');
    var ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D unavailable');
    var assets=options.assets||{},ratio=1,disposed=false,lastWidth=0,lastHeight=0,metrics;
    function reset(){metrics={bodyDraws:0,bodyLayers:0,commandTargetDraws:0,projectileDraws:0,shotDraws:0,effectDraws:0,threadDraws:0,warningDraws:0,activeHazardDraws:0,fadingHazardDraws:0,playerCoreLast:false,mapMissing:false,ready:false,lastBody:null,lastPose:null,lastThread:null,skippedEffectKinds:[],fullAnimationCycles:0,physicalPivotsCertified:false,cacheCanvasCount:0};}
    reset();
    function image(key,label){if(typeof key!=='string'||!usable(assets[key]))throw missing(label||key||'unregistered-key');return assets[key];}
    function bodyContract(c,label){
      if(!c||typeof c.key!=='string')throw missing(label||'body');var im=image(c.key,label||c.key),d=dimensions(im),cell=c.cell||256;
      if(d[0]!==finite(c.width,cell*2)||d[1]!==finite(c.height,cell*2)||!Array.isArray(c.poses)||c.poses.length!==4)throw missing((label||c.key)+'-contract');
      c.poses.forEach(function(p,i){if(!p||p.index!==i||!Array.isArray(p.anchor)||!Array.isArray(p.silk)||p.anchor.length!==2||p.silk.length!==2||!p.anchor.concat(p.silk).every(Number.isFinite))throw missing((label||c.key)+'-pose-'+i);});
      return im;
    }
    function assertArtReady(art){
      if(!art)throw missing('registry');bodyContract(art.body,'body');image(art.projectile&&art.projectile.key,'projectile');image(art.playerKey,'player');image(art.shotKey,'player-shot');
      if(art.background&&art.background.key)image(art.background.key,'background');return true;
    }
    function path(r,l){
      ctx.beginPath();if(l>0){ctx.moveTo(-l,-r);ctx.lineTo(l,-r);ctx.arc(l,0,r,-Math.PI/2,Math.PI/2);ctx.lineTo(-l,r);ctx.arc(-l,0,r,Math.PI/2,Math.PI*1.5);ctx.closePath();}else ctx.arc(0,0,r,0,TAU);
    }
    function palette(spec,art){var p=art.palette||spec.palette||spec.colors||{};return {main:p.main||p.primary||p[0]||'#c9c8dc',secondary:p.secondary||p.support||p[1]||'#ece2c9'};}
    function background(art){
      ctx.fillStyle='#0d1420';ctx.fillRect(0,0,W,H);
      if(!art.background||!art.background.key){metrics.mapMissing=true;return;}
      var im=image(art.background.key,'background'),d=dimensions(im),scale=Math.max(W/d[0],H/d[1]),sw=W/scale,sh=H/scale;
      ctx.drawImage(im,(d[0]-sw)/2,(d[1]-sh)/2,sw,sh,0,0,W,H);
    }
    function body(actor,contract,phase,boss,clock){
      var im=bodyContract(contract,boss?'body':'enemy-body'),state=poseSample(phase),a=contract.poses[state.from],z=contract.poses[state.to],blend=state.blend;
      var x=finite(actor.x,180),y=finite(actor.y,116),scale=clamp(finite(contract.scale,.5),.05,2),angle=clamp(finite(actor.lean,0),-1,1)*.009,alpha=clamp(finite(actor.opacity,1),0,1),cell=contract.cell||256;
      var dx=mix(a.silk[0]-a.anchor[0],z.silk[0]-z.anchor[0],blend)*scale,dy=mix(a.silk[1]-a.anchor[1],z.silk[1]-z.anchor[1],blend)*scale;
      var endX=x+dx*Math.cos(angle)-dy*Math.sin(angle),endY=y+dx*Math.sin(angle)+dy*Math.cos(angle),top=boss?64:24,topX=boss?180:clamp(finite(actor.baseX,x),12,348);
      if(endY>top&&alpha>0){ctx.save();ctx.globalAlpha*=alpha*(boss?.3:.4);ctx.strokeStyle='#c9c5b5';ctx.lineWidth=.65;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(topX,top);ctx.lineTo((topX+endX)/2+Math.sin(clock*1.6)*.5,top+(endY-top)*.46);ctx.lineTo(endX,endY);ctx.stroke();ctx.restore();metrics.threadDraws++;metrics.lastThread={start:[topX,top],end:[endX,endY],damaging:false};}
      function frame(p,weight){if(weight<=.001)return;ctx.save();ctx.globalAlpha*=alpha*weight;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(im,(p.index%2)*cell,Math.floor(p.index/2)*cell,cell,cell,-p.anchor[0]*scale,-p.anchor[1]*scale,cell*scale,cell*scale);ctx.restore();metrics.bodyLayers++;}
      if(state.from===state.to)frame(z,1);else{frame(a,1-blend);frame(z,blend);}
      metrics.bodyDraws++;metrics.lastBody=contract.key;metrics.lastPose={from:state.from,to:state.to,blend:blend,scale:scale,position:[x,y]};
    }
    function commandTarget(world,art,tone){
      var target=world.commandLink;if(!target)return;
      var im=image(art.targetKey,'command-link'),r=Math.max(1,finite(target.r,14));
      if(!Number.isFinite(target.x)||!Number.isFinite(target.y))throw new TypeError('Invalid story command link');
      ctx.save();ctx.drawImage(im,target.x-r,target.y-r,r*2,r*2);ctx.beginPath();ctx.arc(target.x,target.y,r,0,TAU);ctx.strokeStyle=tone.secondary;ctx.lineWidth=.8;ctx.stroke();
      if(Number.isFinite(target.hp)&&Number.isFinite(target.maxHp)){ctx.fillStyle='#282b35';ctx.fillRect(target.x-r,target.y+r+4,r*2,2);ctx.fillStyle=tone.main;ctx.fillRect(target.x-r,target.y+r+4,r*2*clamp(target.hp/Math.max(1,target.maxHp),0,1),2);}
      ctx.restore();metrics.commandTargetDraws++;
    }
    function projectile(b,art,tone){
      if(!Number.isFinite(b.x)||!Number.isFinite(b.y))throw new TypeError('Invalid story projectile position');
      var im=image(art.projectile.key,'projectile'),r=clamp(finite(b.r,3),.5,40),l=clamp(finite(b.halfLength,0),0,100),angle=finite(b.angle,Math.atan2(finite(b.vy,0),finite(b.vx,0)));
      ctx.save();ctx.globalAlpha=b.harmful===false?.35:1;ctx.translate(b.x,b.y);ctx.rotate(angle);path(r,l);ctx.fillStyle=b.color||tone.main;ctx.fill();
      // The backing and clip are the real collision circle/capsule. The source
      // raster cannot enlarge danger or become the only warning cue.
      ctx.save();path(r,l);ctx.clip();ctx.drawImage(im,-l-r,-r,(l+r)*2,r*2);ctx.restore();path(r,l);ctx.strokeStyle=tone.secondary;ctx.lineWidth=.65;if(b.harmful===false)ctx.setLineDash([2,2]);ctx.stroke();ctx.restore();metrics.projectileDraws++;
    }
    function hazard(h,tone){
      var lineGeometry=Number.isFinite(h.x1)&&Number.isFinite(h.y1)&&Number.isFinite(h.x2)&&Number.isFinite(h.y2),circleGeometry=Number.isFinite(h.x)&&Number.isFinite(h.y)&&Number.isFinite(h.r);if(!lineGeometry&&!circleGeometry)throw new TypeError('Unsupported committed story hazard geometry');
      var phase=h.phase||h.state||'warning',active=phase==='active',fade=phase==='fade';ctx.save();ctx.globalAlpha=h.harmful===false?.28:fade?.16:active?1:.65;ctx.strokeStyle=h.color||tone.main;ctx.fillStyle=h.color||tone.main;
      if(lineGeometry){
        ctx.lineWidth=active?Math.max(1,finite(h.width,8)):fade?Math.max(1,finite(h.width,8)):1.2;ctx.setLineDash(h.harmful===false?[2,4]:active||fade?[]:[5,5]);ctx.beginPath();ctx.moveTo(h.x1,h.y1);ctx.lineTo(h.x2,h.y2);ctx.stroke();
      }else if(circleGeometry){
        ctx.lineWidth=active?2:1;ctx.setLineDash(h.harmful===false?[2,4]:active||fade?[]:[4,4]);ctx.beginPath();ctx.arc(h.x,h.y,Math.max(.5,h.r),0,TAU);if(active){ctx.globalAlpha=h.harmful===false?.08:.18;ctx.fill();ctx.globalAlpha=h.harmful===false?.28:1;}ctx.stroke();
      }else throw new TypeError('Unsupported committed story hazard geometry');
      ctx.restore();if(active)metrics.activeHazardDraws++;else if(fade)metrics.fadingHazardDraws++;else metrics.warningDraws++;
    }
    function effects(world,art){
      var list=world.effects||[];for(var i=0;i<list.length;i++){
        var e=list[i],spec=art.effects&&art.effects[e.kind],key=e.assetKey||(spec&&spec.key);if(!key){if(metrics.skippedEffectKinds.indexOf(e.kind)<0)metrics.skippedEffectKinds.push(e.kind||'unknown');continue;}
        var im=image(key,'effect-'+(e.kind||key)),age=Math.max(0,finite(e.age,0)),ttl=Math.max(.001,finite(e.ttl,.4)),size=clamp(finite(e.size,spec&&spec.drawWidth||48),1,96);
        if(age>=ttl)continue;ctx.save();ctx.globalAlpha=Math.min(1,age/.04,(ttl-age)/.08)*.55;ctx.drawImage(im,finite(e.x,180)-size/2,finite(e.y,116)-size/2,size,size);ctx.restore();metrics.effectDraws++;
      }
    }
    function hud(world,spec,tone){
      var b=world.boss||{},hp=clamp(finite(b.hp,0)/Math.max(1,finite(b.maxHp,1)),0,1),name=spec.name||spec.canonicalName||world.combatId||'';
      if(b.survival){var stage=spec.stages&&spec.stages[world.stageIndex],a=stage&&stage.adaptation,total=a&&(a.windupTicks+a.activeTicks+a.recoveryTicks);hp=world.stage==='transition'||world.stage==='won'?1:clamp(finite(world.stageTime,0)*60/Math.max(1,finite(total,1)),0,1);name='생존 · '+(stage&&stage.label||name);}
      ctx.save();ctx.fillStyle='rgba(8,12,22,.88)';ctx.fillRect(13,24,334,40);ctx.textAlign='left';ctx.fillStyle=tone.secondary;ctx.font='9px Arial,"Malgun Gothic",sans-serif';ctx.fillText(name,19,37);ctx.fillStyle='#343342';ctx.fillRect(19,48,322,3);ctx.fillStyle=tone.main;ctx.fillRect(19,48,322*hp,3);ctx.restore();
      if(metrics.mapMissing){ctx.save();ctx.textAlign='center';ctx.fillStyle='#a7a3ae';ctx.font='9px Arial,"Malgun Gothic",sans-serif';ctx.fillText('맵 자산 미등록 · 전투 시작 잠금',180,628);ctx.restore();}
    }
    function render(world,spec,art){
      if(disposed)throw new Error('Story renderer disposed');if(!world||!spec)throw new TypeError('Story render requires world and spec');assertArtReady(art);if(world.commandLink)image(art.targetKey,'command-link');
      ['bullets','shots','effects','enemies'].forEach(function(k){if(world[k]&&(!Array.isArray(world[k])||world[k].length>LIMITS[k]))throw new RangeError('Story '+k+' exceeds presentation contract');});
      if(art.body.combatId&&world.combatId&&art.body.combatId!==world.combatId)throw missing('body-identity-'+world.combatId);
      reset();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);background(art);var tone=palette(spec,art),clock=finite(world.tick,0)/60;
      var cycle=typeof world.phase==='object'?world.phase:{kind:world.cyclePhase||({charge:'windup',attack:'active',recover:'recovery'}[(world.boss||{}).action])||'recovery',age:finite(world.cyclePhaseAge,finite(world.cyclePhaseTick,0)/60)};
      if(world.boss)body(world.boss,art.body,cycle,true,clock);commandTarget(world,art,tone);
      (world.enemies||[]).forEach(function(e){if(e===world.boss||world.boss&&e.id!=null&&e.id===world.boss.id)return;var c=art.enemyBodies&&art.enemyBodies[e.combatId||e.kind||e.id];if(!c)throw missing('enemy-body-'+(e.combatId||e.kind||e.id));body(e,c,e.phase&&typeof e.phase==='object'?e.phase:cycle,false,clock);});effects(world,art);
      var player=world.player;if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))throw new TypeError('Invalid story player');var im=image(art.playerKey,'player'),pd=dimensions(im),inv=finite(player.invulnerableUntil,0)>finite(world.tick,0);ctx.save();ctx.globalAlpha=inv?.6:1;ctx.drawImage(im,player.x-pd[0]*.505*57/pd[0],player.y-pd[1]*.5544*57/pd[1],57,57);ctx.restore();
      var shotImage=image(art.shotKey,'player-shot'),shotDimensions=dimensions(shotImage);
      (world.shots||[]).forEach(function(s){
        if(!Number.isFinite(s.x)||!Number.isFinite(s.y))throw new TypeError('Invalid story shot position');
        // Existing shot.webp points along +X. Its luminous head is at 240/256,
        // 48/96; the dim source trail remains harmless presentation pixels.
        var scale=Math.max(.02,finite(s.r,1.5)/14),pivot=art.shotPivot||[shotDimensions[0]*.9375,shotDimensions[1]*.5],angle=finite(s.angle,Math.atan2(finite(s.vy,-1),finite(s.vx,0)));
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(angle);ctx.drawImage(shotImage,-pivot[0]*scale,-pivot[1]*scale,shotDimensions[0]*scale,shotDimensions[1]*scale);ctx.restore();metrics.shotDraws++;
      });
      (world.bullets||[]).forEach(function(b){projectile(b,art,tone);});
      var hazards=world.telegraphs||world.hazards||[];if(!Array.isArray(hazards)||hazards.length>LIMITS.hazards)throw new RangeError('Story hazards exceed presentation contract');hazards.forEach(function(h){hazard(h,tone);});hud(world,spec,tone);
      // Actual player collision core is always the last visible primitive.
      ctx.beginPath();ctx.arc(player.x,player.y,4.7,0,TAU);ctx.fillStyle='#080e19';ctx.fill();ctx.beginPath();ctx.arc(player.x,player.y,finite(player.r,3),0,TAU);ctx.fillStyle='#fff9e9';ctx.fill();ctx.strokeStyle='#8bdce2';ctx.lineWidth=.9;ctx.stroke();metrics.playerCoreLast=true;metrics.ready=!metrics.mapMissing;return getMetrics();
    }
    function resize(cssWidth,cssHeight,dpr){
      if(disposed)throw new Error('Story renderer disposed');if(!Number.isFinite(cssWidth)||cssWidth<=0||!Number.isFinite(cssHeight)||cssHeight<=0)throw new TypeError('Invalid story canvas size');
      ratio=clamp(finite(dpr,1),1,1.5)*cssWidth/W;var width=Math.max(1,Math.round(W*ratio)),height=Math.max(1,Math.round(H*ratio));if(width!==lastWidth||height!==lastHeight){canvas.width=width;canvas.height=height;lastWidth=width;lastHeight=height;ctx.imageSmoothingEnabled=true;}if(canvas.style){canvas.style.width='100%';canvas.style.height='100%';}
    }
    function getMetrics(){return JSON.parse(JSON.stringify(metrics));}
    function dispose(){if(disposed)return;disposed=true;assets={};canvas.width=canvas.height=1;reset();}
    return Object.freeze({render:render,resize:resize,dispose:dispose,getMetrics:getMetrics,assertArtReady:assertArtReady});
  }
  return Object.freeze({create:create,poseSample:poseSample,LIMITS:LIMITS});
}));
