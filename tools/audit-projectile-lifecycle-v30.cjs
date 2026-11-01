'use strict';
// Read-only simulation instrumentation. The product source is loaded unchanged
// except for an observer immediately before an existing pool removal. This is
// an immune, attack-disabled lifecycle fixture, not ordinary-health gameplay.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),BASE='f5bc56c9acaabef2ad653c3c63afd9982599ad54';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function source(file,ref){return ref?cp.execFileSync('git',['show',ref+':'+file],{cwd:ROOT}):fs.readFileSync(path.join(ROOT,file));}
function runtime(ref,onRemove){
  const loaded=new Map();
  function load(file){
    if(loaded.has(file))return loaded.get(file).exports;
    const module={exports:{}},sandbox={module,exports:module.exports,__onBulletRemove:onRemove||(()=>{})};loaded.set(file,module);
    sandbox.require=request=>{assert(request.startsWith('./'),'product module cannot import external code');return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),request)));};
    let text=source(file,ref).toString();
    if(file==='src/core.js'){
      assert.equal((text.match(/remove\(w,\s*['"]bullets['"],\s*i\)/g)||[]).length,2,'all existing bullet-removal call sites must be observed');
      const hit="if(!modern||damaged){remove(w, 'bullets', i); continue;}",lifetime="{remove(w,'bullets',i);continue;}";
      assert(text.includes(hit)&&text.includes(lifetime),'known damaging-hit and lifecycle branches are required');
      text=text.replace(hit,"if(!modern||damaged){__onBulletRemove(w,b,'real-player-hit');remove(w, 'bullets', i); continue;}");
      text=text.replace(lifetime,"{__onBulletRemove(w,b,'lifetime-or-bounds');remove(w,'bullets',i);continue;}");
    }
    vm.runInNewContext(text,sandbox,{filename:file});return module.exports;
  }
  return load('src/core.js');
}
function classify(w,b){
  const modern=[27,28,29,30].includes(w.combatRevision),padding=w.combatRevision===30?104:50,margin=modern?Math.max(38,(b.halfLength||0)+b.r+padding):38,outside=b.x< -margin||b.x>360+margin||b.y< -margin||b.y>640+margin;
  if(b.retiring&&b.retireAge>=b.retireDuration)return 'complete-ttl-fade';
  if(outside)return 'outside-core-margin';
  if(w.stage==='won'&&w.stageTime>.35)return 'terminal-victory';
  return 'unclassified-removal';
}
function world(C,index,phase,difficulty,revision){
  const initial=C.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'projectile-lifecycle-observer'});
  const saved=C.checkpoint(initial);saved.phase=phase;const w=C.restoreCheckpoint(saved);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function observe(options={}){
  const ref=Object.hasOwn(options,'ref')?options.ref:BASE,revision=options.revision||29,ticks=options.ticks||1800,indices=options.indices||Array.from({length:35},(_,i)=>i),rows=[],examples={};
  const totals={cases:0,ticks:0,removals:0,onscreenTtlFades:0,pilotRegionTtlFades:0,outsideCoreMargin:0,insideRemovedWithoutFade:0},reasons={};let current;
  const C=runtime(ref,(w,b,site)=>{
    const reason=site==='real-player-hit'?site:classify(w,b);current.removals++;totals.removals++;reasons[reason]=(reasons[reason]||0)+1;
    const inside=b.x>=0&&b.x<=360&&b.y>=0&&b.y<=640,pilot=inside&&b.y>=260&&b.y<=614;
    if(reason==='complete-ttl-fade'&&inside){current.onscreenTtlFades++;totals.onscreenTtlFades++;if(pilot){current.pilotRegionTtlFades++;totals.pilotRegionTtlFades++;}}
    if(reason==='outside-core-margin'){current.outsideCoreMargin++;totals.outsideCoreMargin++;}
    if(inside&&reason!=='complete-ttl-fade'){current.insideRemovedWithoutFade++;totals.insideRemovedWithoutFade++;}
    const key=reason==='complete-ttl-fade'&&pilot?'pilot-region-ttl-fade':reason;
    if(!examples[key])examples[key]=[];
    if(examples[key].length<16)examples[key].push({index:current.index,phase:w.phase,difficulty:w.difficulty,tick:w.tick,stage:w.stage,reason,x:b.x,y:b.y,r:b.r,halfLength:b.halfLength||0,age:b.age,ttl:b.ttl,retiring:!!b.retiring,retireAge:b.retireAge,retireDuration:b.retireDuration,kind:b.kind,vx:b.vx,vy:b.vy,patternId:b.patternId,sourcePhase:b.sourcePhase,sourceActorId:b.sourceActorId,modelActorId:b.modelActorId,v27Motion:b.v27Motion,v27Pattern:b.v27Pattern,ownerId:b.ownerId,paletteSlot:b.paletteSlot,v27Child:!!b.v27Child});
  });
  for(const index of indices)for(const phase of [0,1,2])for(const difficulty of ['gentle','normal','hell']){
    current={index,phase,difficulty,removals:0,onscreenTtlFades:0,pilotRegionTtlFades:0,outsideCoreMargin:0,insideRemovedWithoutFade:0};
    const w=world(C,index,phase,difficulty,revision);if(options.skills)w.skillRotation=true;if(options.autoAttack)w.autoAttack=true;if(options.ordinaryHealth)w.player.invulnerableUntil=0;
    for(let n=0;n<ticks;n++)C.step(w,options.ordinaryHealth?{dx:Math.floor(n/120)%2?-1.5:1.5,dy:Math.floor(n/180)%2?-.5:.5}:{});
    current.endStage=w.stage;current.endTick=w.tick;current.hits=w.stats.hits;current.skillCasts={...w.stats.casts};
    current.peakBullets=w.stats.peakBullets;current.poolPressure=w.stats.poolPressure;current.droppedGroups=w.stats.droppedGroups;rows.push(current);totals.cases++;totals.ticks+=w.tick;
  }
  return {schema:1,baseline:ref,revision,requestedTicksPerCase:ticks,scope:{description:'Actual core pool-removal observer, checkpoint-selected phase fixtures. Product source changed only in memory to invoke a read-only observer. No human/mobile/FPS claim.',autoAttack:!!options.autoAttack,skillRotation:!!options.skills,health:options.ordinaryHealth?'ordinary with scripted legal movement':'immune without movement'},instrumentedSourceSHA256:sha(source('src/core.js',ref)),totals,reasons,examples,rows};
}
async function edgePixels(options={}){
  const ref=Object.hasOwn(options,'ref')?options.ref:BASE,index=options.index??7,phase=options.phase??0,difficulty=options.difficulty||'hell',ticks=options.ticks||2400,revision=options.revision||29,removed=[];
  const C=runtime(ref,(w,b)=>{if(classify(w,b)==='outside-core-margin'&&b.r>6&&b.kind==='orb')removed.push({...b,tick:w.tick});}),w=world(C,index,phase,difficulty,revision);
  for(let n=0;n<ticks;n++)C.step(w,{});
  const A=require('./audit-object-projectiles-v24.cjs'),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]}));
  const box=A.runtime(ref),group=index>=12?index+1:index,images=await A.imagesFor(box,group,new Map(),{},null,true),fx=box.HapilProjectiles.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d');
  const result={ref,index,phase,difficulty,ticks,revision,scope:'Exact outside-removal states from immune simulation, painted with the same pinned authored source. Native CPU pixels, not browser or phone FPS.',actualRemovedLargeOrbs:removed.length,largestOutset:0,stillVisibleAtActualRemoval:0,opaqueAtActualRemoval:0,examples:[]};
  try{
    for(const b of removed){
      ctx.clearRect(0,0,360,640);fx.beginFrame();assert(fx.drawBullet(ctx,w,b,false));const metrics=fx.getMetrics();result.largestOutset=Math.max(result.largestOutset,metrics.maxVisualOutset);
      // The old padding guarantees complete exit for <=50px ornaments.
      if(metrics.maxVisualOutset<=50)continue;
      const d=ctx.getImageData(0,0,360,640).data;let visible=0,opaque=0;for(let at=3;at<d.length;at+=4){visible+=d[at]>0;opaque+=d[at]>=96;}
      if(visible){result.stillVisibleAtActualRemoval++;if(opaque)result.opaqueAtActualRemoval++;if(result.examples.length<12)result.examples.push({tick:b.tick,id:b.id,x:b.x,y:b.y,r:b.r,angle:b.angle,outset:metrics.maxVisualOutset,visiblePixels:visible,opaquePixels:opaque,patternId:b.patternId,v27Motion:b.v27Motion});}
    }
  }finally{fx.destroy();}
  return result;
}
async function main(){
  const argv=process.argv.slice(2),get=(name,fallback)=>{const i=argv.indexOf(name);return i<0?fallback:argv[i+1];};
  const ref=get('--ref',BASE),common={ref:ref==='current'?null:ref,revision:Number(get('--revision','29')),ticks:Number(get('--ticks','2400'))},result=argv.includes('--edge-pixels')?await edgePixels({...common,index:Number(get('--index','7')),phase:Number(get('--phase','0')),difficulty:get('--difficulty','hell')}):observe({...common,indices:get('--indices',null)?.split(',').map(Number),skills:argv.includes('--skills'),autoAttack:argv.includes('--auto-attack'),ordinaryHealth:argv.includes('--ordinary-health')}),output=get('--output',null);
  if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result.rows?{totals:result.totals,reasons:result.reasons,peak:Math.max(...result.rows.map(r=>r.peakBullets)),casts:result.rows.reduce((o,r)=>{for(const [key,value]of Object.entries(r.skillCasts))o[key]=(o[key]||0)+value;return o;},{}),output}:{...result,output}));
}
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={BASE,ROOT,source,runtime,classify,world,observe,edgePixels};
