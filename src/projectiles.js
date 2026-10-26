(function (global) {
  'use strict';
  // Byte-preserved Drive atlases: docs/reused-drive-fx-v6.json records their
  // hashes and authored contracts. Crops below are presentation adaptations,
  // not collision masks. Core.js remains the sole source of damage geometry.
  var SPECS = {
    ember:{key:'fxEmberV6',width:1024,height:1024,cell:256,frames:16,ms:60,pivot:[128,128],crop:[96,112,80,80],base:'#863718'},
    reed:{key:'fxReedV6',width:1024,height:1024,cell:256,frames:16,ms:50,pivot:[128,128],crop:[28,24,196,152],base:'#23534b'},
    arrow:{key:'fxWindArrow8V6',width:1024,height:512,cell:256,frames:8,ms:80,pivot:[192,128],crop:[64,72,144,112],base:'#335c69'},
    web:{key:'fxVioletWebV6',width:1536,height:1536,cell:384,frames:16,ms:80,pivot:[192,192],endpointFade:true},
    ripple:{key:'fxSwampRippleV6',width:1536,height:1536,cell:384,frames:16,ms:80,pivot:[192,274],endpointFade:true}
  };
  var COLORS={cyan:'#8de5ea',violet:'#c2a4f4',pink:'#f3a2cd',gold:'#f0cf86',red:'#ff858f',blue:'#88b7ff',white:'#f6efdc'};
  var LIMIT=384;
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function ready(im,s){return !!(im&&im.complete&&im.naturalWidth===s.width&&im.naturalHeight===s.height);}
  function family(world){return world.bossIndex===2?'ember':world.bossIndex===1?'reed':'arrow';}
  function bodyFrame(s,age){return s===SPECS.arrow?Math.min(7,Math.floor(Math.max(0,age||0)*1000/80)):0;}
  function path(ctx,r,l){
    ctx.beginPath();
    if(l>0){ctx.moveTo(-l,-r);ctx.lineTo(l,-r);ctx.arc(l,0,r,-Math.PI/2,Math.PI/2);ctx.lineTo(-l,r);ctx.arc(-l,0,r,Math.PI/2,Math.PI*1.5);ctx.closePath();}
    else ctx.arc(0,0,r,0,Math.PI*2);
  }
  function create(images){
    var metrics;
    function beginFrame(){metrics={projectileTextureDraws:0,projectileTextureLimit:LIMIT,texturedBullets:0,projectileTailDraws:0,bossCastDraws:0,hazardEmitterDraws:0,projectileFamilies:{}};}
    beginFrame();
    function stamp(ctx,s,frame,crop,x,y,w,h){
      ctx.drawImage(images[s.key],(frame%4)*s.cell+crop[0],Math.floor(frame/4)*s.cell+crop[1],crop[2],crop[3],x,y,w,h);
    }
    function drawBullet(ctx,world,b){
      if(!world||!world.campaign||!b||metrics.projectileTextureDraws>=LIMIT)return false;
      var name=family(world),s=SPECS[name];
      if(!ready(images[s.key],s)||!Number.isFinite(b.x)||!Number.isFinite(b.y))return false;
      var r=Number.isFinite(b.r)&&b.r>0?b.r:3,l=Number.isFinite(b.halfLength)?Math.max(0,b.halfLength):0;
      var angle=Number.isFinite(b.angle)?b.angle:Math.atan2(b.vy||0,b.vx||0);
      var frame=bodyFrame(s,b.age),crop=s.crop,extent=l+r;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.translate(b.x,b.y);ctx.rotate(angle);
      // At ordinary density a dim, short wake exposes the original silhouette.
      // It extends at most 1.5 radii behind the actual capsule, never forward.
      // Dense patterns reserve the stamp budget for opaque danger bodies.
      if((!world.bullets||world.bullets.length<=160)&&metrics.projectileTextureDraws+2<=LIMIT){
        ctx.globalAlpha=.22;stamp(ctx,s,frame,crop,-extent-r*1.5,-r*1.5,extent*2,r*3);
        metrics.projectileTextureDraws++;metrics.projectileTailDraws++;
      }
      ctx.globalAlpha=1;path(ctx,r,l);ctx.fillStyle=s.base;ctx.fill();
      ctx.strokeStyle='#090d16';ctx.lineWidth=2.2;ctx.stroke();
      // A fully opaque backing covers every damaging pixel even if the source
      // has transparency. Source art cannot widen or move the authoritative hit.
      ctx.save();path(ctx,r,l);ctx.clip();
      stamp(ctx,s,frame,crop,-extent,-r,extent*2,r*2);
      ctx.restore();metrics.projectileTextureDraws++;
      if(world.bossIndex>=3){
        // Distinct readable interiors, entirely clipped to authoritative bodies.
        ctx.save();path(ctx,r,l);ctx.clip();ctx.globalAlpha=1;
        ctx.fillStyle=world.bossIndex===3?'#f5e4ba':'#c1d8fa';
        if(l>0){ctx.fillRect(-l,-.65,l*2,1.3);ctx.fillRect(l*.35,-r*.6,1.2,r*1.2);}
        else{ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();if(world.bossIndex===4){ctx.fillStyle='#423862';ctx.fillRect(-.6,-r*.4,1.2,r*.8);}}
        ctx.restore();
      }
      // Rim lies on the exact radius / capsule. No bright line is added inside
      // the source art: tiny ember sparks and reed strands remain visible.
      path(ctx,r,l);ctx.strokeStyle=COLORS[b.color]||b.color||'#f8ecd4';ctx.lineWidth=.8;ctx.stroke();
      ctx.restore();metrics.texturedBullets++;metrics.projectileFamilies[name]=(metrics.projectileFamilies[name]||0)+1;return true;
    }
    function oneShot(ctx,s,elapsed,x,y,size,alpha){
      if(!ready(images[s.key],s)||elapsed<0||elapsed>=s.frames*s.ms)return false;
      var frame=Math.floor(elapsed/s.ms),a=alpha;
      if(s.endpointFade)a*=Math.min(1,elapsed/s.ms,(s.frames*s.ms-elapsed)/s.ms);
      if(a<=0)return false;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;
      stamp(ctx,s,frame,[0,0,s.cell,s.cell],x-s.pivot[0]*size/s.cell,y-s.pivot[1]*size/s.cell,size,size);
      ctx.restore();return true;
    }
    function drawBossCast(ctx,world){
      if(!world||!world.campaign||!world.boss||world.stage!=='boss')return;
      var b=world.boss,action=b.action,progress=clamp(b.actionProgress||0,0,1);
      if(action!=='charge'&&action!=='attack')return;
      var s=world.bossIndex===2?SPECS.ember:world.bossIndex===1?SPECS.ripple:SPECS.web;
      // A single authored sequence per action, never a looping explosion or
      // a wall-clock animation. An exhausted cast disappears during attack.
      var elapsed=progress*(action==='charge'?900:2600);
      if(oneShot(ctx,s,elapsed,b.x,Math.max(96,b.y+38),72,action==='charge'?.34:.63))metrics.bossCastDraws++;
    }
    function drawHazardDecoration(ctx,world,h){
      if(!world||!world.campaign||!h||h.phase==='warning'||!Number.isFinite(h.x1)||!Number.isFinite(h.y1))return false;
      if(h.phase!=='active'&&h.phase!=='fade')return false;
      var s=SPECS[family(world)],a=h.phase==='active'?.30:.08*(1-clamp(h.progress||0,0,1));
      if(!ready(images[s.key],s)||a<=0||metrics.hazardEmitterDraws>=16)return false;
      var radius=Math.min(10,Math.max(4,h.width||6));
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;ctx.translate(h.x1,h.y1);ctx.rotate(Math.atan2(h.y2-h.y1,h.x2-h.x1));
      path(ctx,radius,0);ctx.clip();stamp(ctx,s,0,s.crop,-radius,-radius,radius*2,radius*2);ctx.restore();
      metrics.hazardEmitterDraws++;return true;
    }
    return {beginFrame:beginFrame,drawBullet:drawBullet,drawBossCast:drawBossCast,drawHazardDecoration:drawHazardDecoration,getMetrics:function(){return Object.assign({},metrics,{projectileFamilies:Object.assign({},metrics.projectileFamilies)});}};
  }
  global.HapilProjectiles={create:create};
})(typeof window!=='undefined'?window:globalThis);

/* v8 compact Drive FX and bounded opaque projectile stamps.
 * The authored circles/capsules still come exclusively from core.js. The tiny
 * texture is baked once per shape/palette, never once per bullet or frame.
 * Full v6 presentation remains available for legacy consumers without v8 art.
 */
(function(global){
  'use strict';
  var Legacy=global.HapilProjectiles;
  var PALETTE_LIST=Object.freeze([
    Object.freeze({id:'violet',primary:'#b08adf',secondary:'#d8eaff',accent:'#8774c3'}),
    Object.freeze({id:'horn',primary:'#80c9a5',secondary:'#d9b86c',accent:'#c99b8d'}),
    Object.freeze({id:'balrog',primary:'#f79858',secondary:'#ffe3a0',accent:'#db774d'}),
    Object.freeze({id:'mask',primary:'#f0db9f',secondary:'#e4b2cc',accent:'#f2ecdb'}),
    Object.freeze({id:'lucifer',primary:'#b2a1ed',secondary:'#edca83',accent:'#d789b8'})
  ]);
  var PALETTES=Object.freeze({violet:PALETTE_LIST[0],horn:PALETTE_LIST[1],balrog:PALETTE_LIST[2],mask:PALETTE_LIST[3],lucifer:PALETTE_LIST[4]});
  var FX=Object.freeze({
    web:{key:'fxV8VioletWeb',frames:16,ms:80,pivot:[64,64],sample:4},
    silver:{key:'fxV8SilverSlash',frames:16,ms:40,pivot:[64,64],sample:4},
    ripple:{key:'fxV8SwampRipple',frames:16,ms:80,pivot:[64,274/3],sample:4},
    reed:{key:'fxV8Reed',frames:16,ms:50,pivot:[64,64],sample:4},
    ember:{key:'fxV8Ember',frames:16,ms:60,pivot:[64,64],sample:4},
    gold:{key:'fxV8GoldSlash',frames:8,ms:60,pivot:[64,64],sample:3},
    unlock:{key:'fxV8Unlock',frames:16,ms:80,pivot:[64,64],sample:4},
    vortex:{key:'fxV8Vortex',frames:16,ms:80,pivot:[64,64],sample:4}
  });
  var FAMILIES=[['web','silver'],['ripple','reed'],['ember','gold'],['unlock','gold'],['vortex','silver','unlock']];
  var CACHE_LIMIT=96, STAMP_DRAW_LIMIT=768, SCALE=3, PAD=2, CELL=128;
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function indexFor(w){return w&&Number.isInteger(w.bossIndex)?clamp(w.bossIndex,0,4):0;}
  function colorFor(w,b){
    if(!w||!w.campaign)return b&&b.color||'#c2a4f4';
    var palette=PALETTE_LIST[indexFor(w)];
    if(b&&b.kind==='blade')return palette.accent;
    if(b&&b.kind==='needle')return palette.secondary;
    return b&&Number.isInteger(b.id)&&b.id%3===0?palette.secondary:palette.primary;
  }
  function assetKeysForEncounter(i){return FAMILIES[clamp(Math.floor(i||0),0,4)].map(function(name){return FX[name].key;});}
  function ready(im,s){return !!(im&&im.complete!==false&&im.naturalWidth===512&&im.naturalHeight===Math.ceil(s.frames/4)*CELL);}
  function capsule(ctx,x,y,r,l){
    ctx.beginPath();
    if(l>0){ctx.moveTo(x-l,y-r);ctx.lineTo(x+l,y-r);ctx.arc(x+l,y,r,-Math.PI/2,Math.PI/2);ctx.lineTo(x-l,y+r);ctx.arc(x-l,y,r,Math.PI/2,Math.PI*1.5);ctx.closePath();}
    else ctx.arc(x,y,r,0,Math.PI*2);
  }
  function create(images){
    images=images||{};
    var legacy=Legacy.create(images),cache=new Map(),group=-1,metrics;
    function release(entry){if(entry&&entry.canvas){entry.canvas.width=1;entry.canvas.height=1;}}
    function clearCache(){cache.forEach(release);cache.clear();}
    function beginFrame(){legacy.beginFrame();metrics={stampDraws:0,stampCacheMisses:0,stampCacheHits:0,stampCacheLimit:CACHE_LIMIT,stampCacheBytes:0,stampCacheEntries:cache.size,compactCastDraws:0,compactHazardDraws:0,compactFamilies:{}};}
    function textureFor(w,b){var names=FAMILIES[indexFor(w)];return FX[names[b&&b.halfLength>0?1:0]];}
    function buildStamp(w,b,s,r,l,tone){
      if(!global.document||!global.document.createElement)return null;
      var canvas=global.document.createElement('canvas');
      var halfX=l+r+PAD,halfY=r+PAD;
      canvas.width=Math.ceil(halfX*2*SCALE);canvas.height=Math.ceil(halfY*2*SCALE);
      var ctx=canvas.getContext('2d');if(!ctx){release({canvas:canvas});return null;}
      var cx=halfX*SCALE,cy=halfY*SCALE;
      // Fully opaque backing remains throughout the source's one-shot fade.
      capsule(ctx,cx,cy,r*SCALE,l*SCALE);ctx.fillStyle=tone;ctx.fill();
      ctx.strokeStyle='#101323';ctx.lineWidth=1.8*SCALE;ctx.stroke();
      ctx.save();capsule(ctx,cx,cy,r*SCALE,l*SCALE);ctx.clip();
      ctx.globalAlpha=.34;
      ctx.drawImage(images[s.key],s.sample%4*CELL,Math.floor(s.sample/4)*CELL,CELL,CELL,
        cx-(l+r)*SCALE,cy-r*SCALE,(l+r)*2*SCALE,r*2*SCALE);
      ctx.globalAlpha=1;
      // Palette-specific core, clipped inside exactly the damaging capsule.
      ctx.fillStyle=PALETTE_LIST[indexFor(w)].secondary;
      if(l>0){ctx.fillRect(cx-l*SCALE,cy-.45*SCALE,l*2*SCALE,.9*SCALE);}
      else{ctx.beginPath();ctx.arc(cx,cy,r*.35*SCALE,0,Math.PI*2);ctx.fill();}
      ctx.restore();
      capsule(ctx,cx,cy,r*SCALE,l*SCALE);ctx.strokeStyle='#f1e9e1';ctx.lineWidth=.5*SCALE;ctx.stroke();
      return {canvas:canvas,width:canvas.width/SCALE,height:canvas.height/SCALE,x:halfX,y:halfY,r:r,halfLength:l,bytes:canvas.width*canvas.height*4};
    }
    function drawBullet(ctx,w,b,lowQuality){
      if(!w||!w.campaign||!b)return legacy.drawBullet(ctx,w,b);
      var s=textureFor(w,b);
      if(!ready(images[s.key],s))return legacy.drawBullet(ctx,w,b);
      if(!finite(b.x)||!finite(b.y)||metrics.stampDraws>=STAMP_DRAW_LIMIT)return false;
      var r=finite(b.r)&&b.r>0?b.r:3,l=finite(b.halfLength)?Math.max(0,b.halfLength):0;
      if(r>8||l>24)return false;
      var wi=indexFor(w);if(group!==wi){clearCache();group=wi;}
      var tone=colorFor(w,b),key=s.key+'|'+r+'|'+l+'|'+tone,entry=cache.get(key);
      if(!entry){
        entry=buildStamp(w,b,s,r,l,tone);if(!entry)return false;
        if(cache.size>=CACHE_LIMIT){var first=cache.keys().next().value;release(cache.get(first));cache.delete(first);}
        cache.set(key,entry);metrics.stampCacheMisses++;
      }else metrics.stampCacheHits++;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      ctx.translate(b.x,b.y);ctx.rotate(finite(b.angle)?b.angle:Math.atan2(b.vy||0,b.vx||0));
      // Exactly one cached image for a live bullet, no translucent tail draw.
      ctx.drawImage(entry.canvas,0,0,entry.canvas.width,entry.canvas.height,-entry.x,-entry.y,entry.width,entry.height);
      ctx.restore();metrics.stampDraws++;metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;return true;
    }
    function oneShot(ctx,s,elapsed,x,y,size,alpha){
      if(!ready(images[s.key],s)||!finite(elapsed)||elapsed<0||elapsed>=s.frames*s.ms||alpha<=0)return false;
      var frame=Math.floor(elapsed/s.ms),a=alpha*Math.min(1,elapsed/s.ms,(s.frames*s.ms-elapsed)/s.ms);
      if(a<=0)return false;
      size=Math.min(72,size);
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;
      ctx.drawImage(images[s.key],frame%4*CELL,Math.floor(frame/4)*CELL,CELL,CELL,
        x-s.pivot[0]*size/CELL,y-s.pivot[1]*size/CELL,size,size);
      ctx.restore();return true;
    }
    function drawBossCast(ctx,w,lowQuality){
      if(!w||!w.campaign||!w.boss||w.stage!=='boss')return;
      var b=w.boss,progress=clamp(b.actionProgress||0,0,1),wi=indexFor(w),names=FAMILIES[wi];
      if(b.action!=='charge'&&b.action!=='attack')return;
      var name=b.action==='charge'?names[0]:wi===4&&w.phase===2?'unlock':names[1];
      var s=FX[name];
      if(!ready(images[s.key],s)){legacy.drawBossCast(ctx,w);return;}
      var elapsed=progress*(b.action==='charge'?900:2600);
      if(oneShot(ctx,s,elapsed,b.x,Math.max(88,b.y+24),lowQuality?60:72,b.action==='charge'?.48:.7)){metrics.compactCastDraws++;metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;}
    }
    function drawHazardDecoration(ctx,w,h,lowQuality){
      if(!w||!w.campaign||!h||h.phase==='warning')return false;
      var s=textureFor(w,{halfLength:1}),progress=clamp(h.progress||0,0,1);
      if(!ready(images[s.key],s))return legacy.drawHazardDecoration(ctx,w,h);
      if(h.phase!=='active'&&h.phase!=='fade'||!finite(h.x1)||!finite(h.y1)||metrics.compactHazardDraws>=(lowQuality?4:8))return false;
      var a=h.phase==='active'?.35:.1*(1-progress),size=Math.min(18,Math.max(10,(h.width||6)*2));
      if(a<=0)return false;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;
      ctx.drawImage(images[s.key],s.sample%4*CELL,Math.floor(s.sample/4)*CELL,CELL,CELL,h.x1-size/2,h.y1-size/2,size,size);ctx.restore();metrics.compactHazardDraws++;return true;
    }
    beginFrame();
    return {beginFrame:beginFrame,drawBullet:drawBullet,drawBossCast:drawBossCast,drawHazardDecoration:drawHazardDecoration,
      getMetrics:function(){var old=legacy.getMetrics(),bytes=0;cache.forEach(function(e){bytes+=e.bytes;});return Object.assign({},old,metrics,{projectileTextureLimit:metrics.stampDraws?STAMP_DRAW_LIMIT:old.projectileTextureLimit,projectileTextureDraws:old.projectileTextureDraws+metrics.stampDraws,texturedBullets:old.texturedBullets+metrics.stampDraws,bossCastDraws:old.bossCastDraws+metrics.compactCastDraws,hazardEmitterDraws:old.hazardEmitterDraws+metrics.compactHazardDraws,stampCacheEntries:cache.size,stampCacheBytes:bytes,compactFamilies:Object.assign({},metrics.compactFamilies)});},
      destroy:function(){clearCache();images={};}};
  }
  global.HapilProjectiles=Object.freeze({create:create,palettes:PALETTES,paletteList:PALETTE_LIST,assetKeysForEncounter:assetKeysForEncounter,colorFor:colorFor,compactFX:FX});
})(typeof window!=='undefined'?window:globalThis);
