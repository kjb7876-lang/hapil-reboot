'use strict';
// Independent CPU source-image checks and real core clocks. These fixtures
// grant explicit immunity; they do not prove natural clears or GPU/phone FPS.
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../tools/audit-object-projectiles-v24.cjs'),C=require('../src/core.js');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const json=v=>JSON.parse(JSON.stringify(v));
function runtime(){const box=a.runtime();box.HapilCore=C;return box;}
function phaseWorld(bossIndex,phase=0){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:28,practiceBoss:true,bossIndex,difficulty:'hell',seed:813,runId:'v28-independent-laser-presentation'}),boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function groupFor(index){return index>=12?index+1:index;}
function distance(x,y,h){const dx=h.x2-h.x1,dy=h.y2-h.y1,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((x-h.x1)*dx+(y-h.y1)*dy)/d)):0;return Math.hypot(x-h.x1-t*dx,y-h.y1-t*dy);}
function measure(canvas,h){const {width,height}=canvas,d=canvas.getContext('2d').getImageData(0,0,width,height).data;let interior=0,visible=0,outside=0,chroma=0,coloured=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const dist=distance(x+.5,y+.5,h),i=(y*width+x)*4,alpha=d[i+3];if(dist<h.width/2-.75){interior++;visible+=alpha>=100;}if(dist>h.width/2+1.25&&alpha>1)outside++;if(alpha>=100){chroma+=d[i]-d[i+2];coloured++;}}
  return {interior,visible,coverage:visible/Math.max(1,interior),outside,meanRedMinusBlue:chroma/Math.max(1,coloured)};
}
function noShapes(ctx){return new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('synthetic active beam replacement '+k);};const f=t[k];return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});}
function coreGeometry(h){return json(Object.fromEntries(['x1','y1','x2','y2','width','angle','length','born','baseWarningTicks','staggerTicks','warningTicks','activeTicks','fadeTicks','activeAt','fadeAt','expireAt','sourcePhase','sourceActorId','modelActorId','patternId','identityRole','v28BarrageId','v28Pattern','v28RayGroup','v28Segment','v28Reflected','chainId','paletteSlot'].map(k=>[k,h[k]])));}
function firstBarrage(index,phase=0){const w=phaseWorld(index,phase);for(let n=0;n<1500;n++){C.step(w,{});const hs=w.hazards.filter(h=>h.laserBarrage);if(hs.length)return {w,hazards:hs};}assert.fail('no actual barrage '+index+'/'+phase);}

test('actual v28 rays keep immutable finite geometry, owner and individual warning/active/fade clocks while the player moves',()=>{
  let rays=0,active=0,fade=0,reflected=0,staggered=0;
  for(const index of[0,1,3,4,5,6,7,8,9,11,25,33,34])for(const phase of[0,2]){
    const w=phaseWorld(index,phase),locked=new Map(),groups=new Map();
    for(let n=0;n<1000;n++){
      C.step(w,{dx:n%160<80?1:-1,dy:0,focus:n%90<45});
      for(const h of w.hazards.filter(h=>h.laserBarrage)){
        const geometry=coreGeometry(h);if(!locked.has(h.id)){locked.set(h.id,geometry);rays++;assert.equal(h.phase,'warning');assert(h.activeAt-w.tick>=54);assert(h.warningTicks>=54);assert.equal(h.activeAt,h.born+h.warningTicks);assert.equal(h.fadeAt,h.activeAt+h.activeTicks);assert.equal(h.expireAt,h.fadeAt+h.fadeTicks);assert(h.activeTicks>=8&&h.activeTicks<=20);assert(h.fadeTicks>=8&&h.fadeTicks<=12);assert(h.width>2.5);
          assert([h.x1,h.y1,h.x2,h.y2,h.width,h.angle,h.length].every(Number.isFinite));assert.notEqual(h.v28BarrageId,undefined);assert.equal(typeof h.v28Pattern,'string');assert([0,1].includes(h.v28Segment));assert.notEqual(h.chainId,undefined);assert.equal(h.sourcePhase,phase);assert.match(h.patternId,/^barrage-/);assert.equal(typeof h.identityRole,'string');assert.equal(h.warningTicks,h.baseWarningTicks+h.staggerTicks,'each ray keeps its declared base warning plus its own stagger');
          if(index===33)assert(['han-rian','baek-ion'].includes(h.modelActorId||h.sourceActorId),'paired finite segments keep their real/model caster ownership');
          const list=groups.get(h.v28BarrageId)||[];list.push(h.activeAt);groups.set(h.v28BarrageId,list);
          assert(Math.abs(Math.hypot(h.x2-h.x1,h.y2-h.y1)-h.length)<1e-6,'stored finite length matches the announced capsule');
          if(h.v28Reflected)reflected++;
        }else assert.deepEqual(geometry,locked.get(h.id),'announced ray retargeted or changed its own lifetime');
        assert(w.tick<h.expireAt);assert.equal(h.phase,w.tick<h.activeAt?'warning':w.tick<h.fadeAt?'active':'fade');
        if(h.phase==='active')active++;if(h.phase==='fade')fade++;
      }
    }
    for(const values of groups.values())if(new Set(values).size>1)staggered++;
  }
  assert(rays>100);assert(active>100&&fade>100);assert(reflected>0);assert(staggered>0,'real staggered ray clocks were observed');
});

test('source-only finite capsules cover short/zero/diagonal bodies without extending beyond their actual caps',async()=>{
  const box=runtime(),cache=new Map();let checked=0;
  for(const row of[{group:0},{group:6},{group:8},{group:34,owner:'han-rian',key:'storyRianCross'},{group:34,owner:'baek-ion',key:'storyIonShield'}]){
    const images=await a.imagesFor(box,row.group,cache),fx=box.HapilProjectiles.create(images),canvas=createCanvas(160,160),ctx=canvas.getContext('2d'),w=a.world(row.group,{combatRevision:28});
    try{for(const length of[0,8,20,100])for(const width of[6,16,32])for(const angle of[0,Math.PI/4,Math.PI/2])for(const low of[false,true])for(const paletteSlot of[0,1]){
      const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2,h={id:1,x1:80-dx,y1:80-dy,x2:80+dx,y2:80+dy,width,phase:'active',progress:.3,activeAt:120,age:.3,laserBarrage:true,v28Segment:0,paletteSlot,sourceActorId:row.owner?'copied-'+row.owner:undefined,modelActorId:row.owner};
      const before=JSON.stringify([w,h]);ctx.clearRect(0,0,160,160);fx.beginFrame();assert(fx.drawHazardBody(noShapes(ctx),w,h,low));assert.equal(JSON.stringify([w,h]),before);
      const m=measure(canvas,h),metrics=fx.getMetrics();assert(m.interior>0);assert(m.coverage>=.97,JSON.stringify({row,length,width,angle,low,m}));assert.equal(m.outside,0,'finite endpoints cannot become an infinite beam');assert.equal(metrics.missingProjectileAssets,0);assert(metrics.stampCacheBytes<=4194304&&metrics.stampCacheEntries<=96);
      if(row.key){assert.equal(metrics.beamSourceKeys[row.key],1,'a copied caster keeps the original model-owned source');assert((row.owner==='han-rian'?1:-1)*m.meanRedMinusBlue>3,'gold Han Rian and cool Baek Ion retain distinct native colour families in either palette slot');}checked++;
    }}finally{fx.destroy();}
  }
  assert.equal(checked,720);
});

test('real reflected ray segments preserve the same clocks and source-owned finite geometry before and after activation',async()=>{
  const box=runtime(),cache=new Map();let pairs=0;
  for(const index of[0,3,6,11,33])for(const phase of[0,2]){
    const w=phaseWorld(index,phase);let pair;
    for(let n=0;n<1200&&!pair;n++){C.step(w,{});const hs=w.hazards.filter(h=>h.laserBarrage&&h.v28Reflected);pair=hs.find(h=>h.v28Segment===0)&&hs.filter(h=>h.chainId===hs.find(q=>q.v28Segment===0).chainId);}
    if(!pair)continue;assert.equal(pair.length,2);const [first,second]=pair.sort((a,b)=>a.v28Segment-b.v28Segment);
    assert.equal(first.x2,second.x1);assert.equal(first.y2,second.y1);assert.equal(first.activeAt,second.activeAt);assert.equal(first.fadeAt,second.fadeAt);assert.equal(first.expireAt,second.expireAt);assert.equal(first.sourceActorId,second.sourceActorId);assert.equal(first.modelActorId,second.modelActorId);assert.equal(first.paletteSlot,second.paletteSlot,'explicit palette zero survives filtering and reflection segmentation');
    const images=await a.imagesFor(box,groupFor(index),cache),fx=box.HapilProjectiles.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d');
    try{while(w.tick<first.activeAt-1)C.step(w,{});for(const tick of[first.activeAt-1,first.activeAt,first.fadeAt]){
      while(w.tick<tick)C.step(w,{});const live=w.hazards.filter(h=>pair.some(p=>p.id===h.id));assert.equal(live.length,2);
      for(const low of[false,true]){ctx.clearRect(0,0,360,640);fx.beginFrame();for(const h of live)assert.equal(fx.drawHazardBody(noShapes(ctx),w,h,low),tick>=first.activeAt);const m=fx.getMetrics();assert.equal(m.assetLaserDraws,tick<first.activeAt?0:2);assert.equal(m.missingProjectileAssets,0);}
    }}finally{fx.destroy();}pairs++;
  }
  assert(pairs>0,'an actual reflected capsule pair must be tested');
});

test('real mixed warning/active rays use their own clocks and leave lower combat text clear in both qualities',async()=>{
  const box=runtime(),cache=new Map();let checked=0;
  for(const index of[0,7,11,33,34]){
    const w=phaseWorld(index,2);let found=false;
    for(let n=0;n<1500;n++){C.step(w,{});const hs=w.hazards.filter(h=>h.laserBarrage);if(hs.some(h=>h.phase==='warning')&&hs.some(h=>h.phase==='active')){found=true;break;}}
    if(!found)continue;
    const images=await a.imagesFor(box,groupFor(index),cache),canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),text=[],write=ctx.fillText.bind(ctx);ctx.fillText=(s,x,y,...rest)=>{text.push({s:String(s),x,y});return write(s,x,y,...rest);};
    const renderer=box.HapilRenderer.create(canvas,images);try{renderer.resize(360,640,1);for(const low of[false,true]){text.length=0;const before=JSON.stringify(w);renderer.draw(w,0,w.time,low);assert.equal(JSON.stringify(w),before);const m=renderer.getMetrics();assert.equal(m.warningContrastStrokes,w.hazards.filter(h=>h.phase==='warning').length);assert.equal(m.projectilePresentation.assetLaserDraws,w.hazards.filter(h=>h.phase==='active'||h.phase==='fade').length);assert.equal(m.projectilePresentation.missingProjectileAssets,0);assert(!text.some(t=>t.y>=260),'laser information cannot add bottom/centre captions');
      for(const shown of m.warningFootprints){const h=w.hazards.find(h=>h.id===shown.id);assert(h&&h.phase==='warning');for(const k of['x1','y1','x2','y2','width','activeAt'])assert.equal(shown[k],h[k]);}
      checked++;
    }}finally{renderer.destroy();}
  }
  assert(checked>=2,'a genuine staggered active/preceding-warning state is rendered');
});

test('forty finite source segments keep all bodies in low quality and warm caches within bounded detail work',async()=>{
  const box=runtime(),images=await a.imagesFor(box,34),fx=box.HapilProjectiles.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),w=a.world(34,{combatRevision:28});
  const rays=Array.from({length:40},(_,i)=>({id:i+1,x1:40+(i%4)*60,y1:100+i*10,x2:80+(i%4)*60,y2:120+i*10,width:12,phase:'active',progress:.3,activeAt:150,laserBarrage:true,v28Segment:i%2,paletteSlot:i%4<2?0:1,sourceActorId:i%2?'copy-ion':'copy-rian',modelActorId:i%2?'baek-ion':'han-rian'}));
  try{for(const low of[false,true]){
    fx.beginFrame();rays.forEach(h=>fx.drawHazardBody(noShapes(ctx),w,h,low));const allocated=box.allocated.length;
    for(let n=0;n<4;n++){w.tick++;fx.beginFrame();rays.forEach(h=>fx.drawHazardBody(noShapes(ctx),w,h,low));const m=fx.getMetrics();assert.equal(m.assetLaserDraws,40);assert.equal(m.missingProjectileAssets,0);assert.equal(m.beamFrameCacheBuilds,0);assert.equal(box.allocated.length,allocated);assert(m.beamFlowDraws<=(low?0:24));assert(m.beamEmitterDraws<=(low?0:12));assert(m.stampCacheBytes<=4194304&&m.stampCacheEntries<=96);}
  }}finally{fx.destroy();}
});

test('missing owned material never creates a geometric fallback and harmless fade reaches zero at its end',async()=>{
  const box=runtime(),{w,hazards}=firstBarrage(0),h={...hazards[0],phase:'active',progress:0},canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),missing=box.HapilProjectiles.create({});
  try{missing.beginFrame();assert.equal(missing.drawHazardBody(noShapes(ctx),w,h,false),false);assert.equal(missing.getMetrics().missingProjectileAssets,1);assert.equal(ctx.getImageData(0,0,360,640).data.some(v=>v!==0),false);}finally{missing.destroy();}
  const images=await a.imagesFor(box,0),fx=box.HapilProjectiles.create(images);try{const sums=[];for(const progress of[0,.5,1]){ctx.clearRect(0,0,360,640);fx.beginFrame();assert(fx.drawHazardBody(noShapes(ctx),w,{...h,phase:'fade',progress},true));const data=ctx.getImageData(0,0,360,640).data;let sum=0;for(let i=3;i<data.length;i+=4)sum+=data[i];sums.push(sum);}assert(sums[0]>sums[1]&&sums[1]>0);assert.equal(sums[2],0);}finally{fx.destroy();}
});
