'use strict';
// Native CPU image checks, with real source artwork and explicitly marked
// presentation fixtures. These do not claim human clears or device/GPU FPS.
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../tools/audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const BASE='f32a2b9c6e61730ae5bd1b411fc58897d1b677ec',json=v=>JSON.parse(JSON.stringify(v));
function phaseWorld(box,index=0,phase=0,revision){
  const C=box.HapilCore,chosen=arguments.length<4?29:revision,initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:chosen,practiceBoss:true,bossIndex:index,difficulty:'hell',seed:813,runId:'v29-feedback-independent'}),snap=C.checkpoint(initial);snap.phase=phase;
  const w=C.restoreCheckpoint(snap);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function fixture(box,images){
  const canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images),ctx=canvas.getContext('2d');renderer.resize(360,640,1);
  return {canvas,ctx,renderer,draw(w,low=false,options,time=w.time){const before=JSON.stringify(w);renderer.draw(w,0,time,low,options);assert.equal(JSON.stringify(w),before,'presentation never changes core state');return {pixels:Buffer.from(ctx.getImageData(0,0,360,640).data),metrics:json(renderer.getMetrics())};},close(){renderer.destroy();}};
}
function differences(a,b,p){let n=0,far=0;for(let y=0;y<640;y++)for(let x=0;x<360;x++){const at=(y*360+x)*4;if(a.subarray(at,at+4).equals(b.subarray(at,at+4)))continue;n++;if(Math.hypot(x+.5-p.x,y+.5-p.y)>8)far++;}return {n,far};}
function noShapes(ctx){return new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('new warning cue cannot invent a geometric body '+k);};const f=t[k];return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});}
function distance(x,y,h){const dx=h.x2-h.x1,dy=h.y2-h.y1,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-h.x1)*dx+(y-h.y1)*dy)/d)):0;return Math.hypot(x-h.x1-t*dx,y-h.y1-t*dy);}

test('unspecified,21,25,27,28 frames remain exactly v28 pixels despite precise options and recent grazes',async()=>{
  const box=a.runtime(),old=a.runtime(BASE),cache=new Map();let checked=0;
  for(const index of[0,8,33]){
    const group=index>=12?index+1:index,images=await a.imagesFor(box,group,cache,{},old),now=fixture(box,images),before=fixture(old,images);
    try{for(const revision of[undefined,21,25,27,28]){
      const w=phaseWorld(old,index,0,revision);while(w.tick<200)old.HapilCore.step(w,{});w._lastGraze=w.tick-2;w.effects.push({kind:'graze',x:w.player.x,y:w.player.y,r:8,age:.03,ttl:.22});
      for(const low of[false,true]){const current=now.draw(w,low,{precise:true}),prior=before.draw(w,low,{precise:true});assert(current.pixels.equals(prior.pixels),'legacy pixels changed '+JSON.stringify({index,revision,low}));assert.equal(current.metrics.playerFeedback,null);assert.equal(current.metrics.projectilePresentation.imminentCueDraws,0);checked++;}
    }}finally{now.close();before.close();}
  }
  assert.equal(checked,30);
});

test('precise and graze accents stay within eight pixels, leave the actual r3 centre unchanged and remain above threats',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,0),f=fixture(box,images),w=phaseWorld(box);while(w.tick<200)box.HapilCore.step(w,{});
  w.player.invulnerableUntil=0;w.effects=[];w.hazards=[{id:900,phase:'active',x1:w.player.x,y1:400,x2:w.player.x,y2:620,width:22,progress:.3,activeAt:w.tick-5,fadeAt:w.tick+10,expireAt:w.tick+20}];w.bullets=[{id:901,x:w.player.x,y:w.player.y,px:w.player.x,py:w.player.y,r:11,halfLength:0,kind:'orb',age:.3,angle:1.2,paletteSlot:0}];w._lastGraze=-9999;
  try{for(const low of[false,true]){
    const plain=f.draw(w,low,{precise:false}),precise=f.draw(w,low,{precise:true}),d=differences(plain.pixels,precise.pixels,w.player);
    assert(d.n>0);assert.equal(d.far,0);assert.equal(precise.metrics.playerFeedback.hitRadius,3);assert.equal(precise.metrics.playerFeedback.focusRadius,6);assert.equal(w.player.r,3);
    const centre=(Math.floor(w.player.y)*360+Math.floor(w.player.x))*4;assert.deepEqual(precise.pixels.subarray(centre,centre+4),plain.pixels.subarray(centre,centre+4));assert(precise.pixels[centre]>240&&precise.pixels[centre+1]>240,'white core remains above the opaque beam and bullet');
    w._lastGraze=w.tick;const grazed=f.draw(w,low,{precise:false}),g=differences(plain.pixels,grazed.pixels,w.player);assert(g.n>0);assert.equal(g.far,0);assert.equal(grazed.metrics.playerFeedback.grazePulse,1);assert.deepEqual(grazed.pixels.subarray(centre,centre+4),plain.pixels.subarray(centre,centre+4));w._lastGraze=-9999;
  }}finally{f.close();}
});

test('graze uses only its existing tick age, expires at twelve ticks and is suppressed during intro/result/hit immunity',async()=>{
  const box=a.runtime(),images=await a.imagesFor(box,0),f=fixture(box,images),w=phaseWorld(box);while(w.tick<200)box.HapilCore.step(w,{});w.player.invulnerableUntil=0;w.effects=[];
  try{
    for(const value of[-9999,undefined,NaN,w.tick+1,w.tick-12]){w._lastGraze=value;assert.equal(f.draw(w,false,{precise:false}).metrics.playerFeedback.grazePulse,0);}
    w._lastGraze=w.tick-11;assert(f.draw(w,false).metrics.playerFeedback.grazePulse>0);w._lastGraze=w.tick-12;assert.equal(f.draw(w,false).metrics.playerFeedback.grazePulse,0);
    w._lastGraze=w.tick-4;const first=f.draw(w,false,{precise:true},1),allocated=box.allocated.length;for(let n=0;n<8;n++){const repeated=f.draw(w,false,{precise:true},999+n);assert(repeated.pixels.equals(first.pixels));assert.equal(box.allocated.length,allocated,'repeated paused input does not allocate source surfaces');}
    f.draw(w,false,{precise:false});assert(f.draw(w,false,{precise:true}).pixels.equals(first.pixels),'toggling precision back restores the same paused pixels');
    w.player.invulnerableUntil=w.tick+100;assert.equal(f.draw(w,false,{precise:true}).metrics.playerFeedback.grazePulse,0);w.player.invulnerableUntil=0;
    for(const stage of['bossIntro','won','lost']){w.stage=stage;assert.equal(f.draw(w,false,{precise:true}).metrics.playerFeedback,null);}
  }finally{f.close();}
});

test('the last twelve warning ticks use clipped own-source emitters, preserve owner colours and never paint damage art',async()=>{
  const box=a.runtime(),cache=new Map();let checked=0;
  for(const row of[{group:0},{group:6},{group:8},{group:34,owner:'han-rian',key:'storyRianCross'},{group:34,owner:'baek-ion',key:'storyIonShield'}]){
    const images=await a.imagesFor(box,row.group,cache),fx=box.HapilProjectiles.create(images),canvas=createCanvas(160,160),ctx=canvas.getContext('2d'),w=a.world(row.group,{combatRevision:29,tick:200});
    try{for(const length of[0,18,100])for(const width of[6,24])for(const angle of[0,Math.PI/4])for(const low of[false,true])for(const paletteSlot of[0,1])for(const remaining of[12,6,1]){
      const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2,h={id:7,x1:80-dx,y1:80-dy,x2:80+dx,y2:80+dy,width,phase:'warning',progress:.8,activeAt:w.tick+remaining,paletteSlot,sourceActorId:row.owner?'copied-'+row.owner:undefined,modelActorId:row.owner};
      const before=JSON.stringify([w,h]);ctx.clearRect(0,0,160,160);fx.beginFrame();assert(fx.drawHazardWarningCue(noShapes(ctx),w,h,low));assert.equal(JSON.stringify([w,h]),before);const m=fx.getMetrics();assert.equal(m.assetLaserDraws,0);assert.equal(m.imminentCueDraws,1);const cue=m.imminentCues[0];assert.equal(cue.x,h.x1);assert.equal(cue.y,h.y1);assert.equal(cue.remainingTicks,remaining);assert.equal(cue.damaging,false);assert(cue.clippedToCommittedCapsule);if(row.key)assert.equal(cue.sourceKey,row.key);
      const data=ctx.getImageData(0,0,160,160).data;let painted=0,maxAlpha=0;for(let y=0;y<160;y++)for(let x=0;x<160;x++){const at=(y*160+x)*4,a=data[at+3];if(a>1){painted++;assert(distance(x+.5,y+.5,h)<=width/2+1.25,'harmless cue exceeds its announced capsule');}maxAlpha=Math.max(maxAlpha,a);}assert(painted>0);assert(maxAlpha<=145,'warning emitter remains distinct from opaque active damage');assert(m.stampCacheBytes<=4194304&&m.stampCacheEntries<=96);checked++;
    }
      for(const remaining of[13,0,-1]){fx.beginFrame();assert.equal(fx.drawHazardWarningCue(noShapes(ctx),w,{id:9,x1:40,y1:80,x2:120,y2:80,width:12,phase:'warning',activeAt:w.tick+remaining},false),false);assert.equal(fx.getMetrics().imminentCueDraws,0);}
      for(const revision of[undefined,21,25,27,28]){fx.beginFrame();assert.equal(fx.drawHazardWarningCue(noShapes(ctx),{...w,combatRevision:revision},{x1:40,y1:80,x2:120,y2:80,width:12,phase:'warning',activeAt:201},false),false);}
    }finally{fx.destroy();}
  }
  assert.equal(checked,720);
});

test('active damage and fading source bodies remain exactly v28 pixels after warning cues warm their materials',async()=>{
  const box=a.runtime(),old=a.runtime(BASE),cache=new Map();
  for(const group of[0,8,34]){const images=await a.imagesFor(box,group,cache,{},old),now=box.HapilProjectiles.create(images),prior=old.HapilProjectiles.create(images),c=createCanvas(160,160),ctx=c.getContext('2d');try{
    for(const owner of group===34?['han-rian','baek-ion']:[undefined])for(const low of[false,true])for(const paletteSlot of[0,1])for(const phase of['active','fade']){
      const h={id:9,x1:30,y1:40,x2:130,y2:120,width:20,phase,progress:.4,activeAt:180,paletteSlot,sourceActorId:owner},w=a.world(group,{combatRevision:29,tick:200});
      now.beginFrame();now.drawHazardWarningCue(ctx,w,{...h,phase:'warning',activeAt:201},low);ctx.clearRect(0,0,160,160);now.beginFrame();now.drawHazardBody(noShapes(ctx),w,h,low);const pixels=Buffer.from(ctx.getImageData(0,0,160,160).data);ctx.clearRect(0,0,160,160);prior.beginFrame();prior.drawHazardBody(noShapes(ctx),w,h,low);assert(pixels.equals(Buffer.from(ctx.getImageData(0,0,160,160).data)),'warning preparation changed actual damage/fade pixels');
    }
  }finally{now.destroy();prior.destroy();}}
});

test('real mixed warning sequences and forty-warning saturation select earliest clocks within high8/low4 and warm bounds',async()=>{
  const box=a.runtime(),cache=new Map();let mixed=0;
  for(const index of[0,33]){
    const w=phaseWorld(box,index,2);let found=false;for(let n=0;n<1500;n++){box.HapilCore.step(w,{});if(w.hazards.some(h=>h.phase==='active')&&w.hazards.some(h=>h.phase==='warning'&&h.activeAt-w.tick>=1&&h.activeAt-w.tick<=12)){found=true;break;}}assert(found,'real mixed laser clocks are exercised');
    const images=await a.imagesFor(box,index>=12?index+1:index,cache),f=fixture(box,images);
    try{for(const low of[false,true]){for(let n=0;n<3;n++)f.draw(w,low,{precise:true});const allocated=box.allocated.length,out=f.draw(w,low,{precise:true}),p=out.metrics.projectilePresentation,eligible=w.hazards.filter(h=>h.phase==='warning'&&h.activeAt-w.tick>=1&&h.activeAt-w.tick<=12).sort((a,b)=>a.activeAt-b.activeAt||a.id-b.id).slice(0,low?4:8);
      assert.deepEqual(p.imminentCues.map(c=>c.id),json(eligible.map(h=>h.id)));assert.equal(p.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);assert.equal(p.stampCacheMisses,0);assert.equal(p.beamFrameCacheBuilds,0);assert.equal(box.allocated.length,allocated);assert(p.stampCacheBytes<=4194304&&p.stampCacheEntries<=96);mixed++;
    }
    const template=w.hazards.find(h=>h.phase==='warning'),crowded=json(w);crowded.hazards=Array.from({length:40},(_,i)=>({...json(template),id:1000+i,x1:20+(i%5)*60,y1:90+Math.floor(i/5)*50,x2:45+(i%5)*60,y2:120+Math.floor(i/5)*50,activeAt:w.tick+12-i%12})).reverse();
    for(const low of[false,true]){const out=f.draw(crowded,low),m=out.metrics.projectilePresentation,expected=crowded.hazards.slice().sort((a,b)=>a.activeAt-b.activeAt||a.id-b.id).slice(0,low?4:8);assert.equal(m.imminentCueDraws,low?4:8);assert.deepEqual(m.imminentCues.map(c=>c.id),expected.map(h=>h.id));assert.equal(out.metrics.imminentWarningCandidates,40);}
    }finally{f.close();}
  }
  assert.equal(mixed,4);
});

test('missing optional emitter material is omitted safely and revision29 keeps harmless projectile retirement fading',async()=>{
  const box=a.runtime(),canvas=createCanvas(160,160),ctx=canvas.getContext('2d'),fx=box.HapilProjectiles.create({}),w=a.world(0,{combatRevision:29,tick:200});
  try{fx.beginFrame();assert.equal(fx.drawHazardWarningCue(noShapes(ctx),w,{id:1,x1:30,y1:80,x2:130,y2:80,width:12,phase:'warning',activeAt:201},false),false);assert.equal(fx.getMetrics().imminentCueDraws,0);assert.equal(fx.getMetrics().missingOptionalImminentAssets,1);assert.equal(fx.getMetrics().missingProjectileAssets,0);}finally{fx.destroy();}
  const images=await a.imagesFor(box,8),body=box.HapilProjectiles.create(images);try{const sums=[];for(const retireAge of[0,.175,.35]){const b=a.sampleBullet({retiring:true,retireAge,retireDuration:.35});const out=a.bulletPaint(box,images,a.world(8,{combatRevision:29}),b,false,body);let sum=0;for(let i=3;i<out.data.length;i+=4)sum+=out.data[i];sums.push(sum);}assert(sums[0]>sums[1]&&sums[1]>0);assert.equal(sums[2],0);}finally{body.destroy();}
});
