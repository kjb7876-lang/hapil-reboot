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
