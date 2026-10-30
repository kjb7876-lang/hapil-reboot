'use strict';
// Actual engine-emitted dimensions, not hand-picked substitute r/l fixtures.
// The engine observation grants explicit immunity and disables player attacks.
// It is neither natural play nor a browser/GPU/mobile performance benchmark.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),baseline='079c830e40d607d9944215a107003d66e85367ce';
const core=require('../src/core.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function textAt(file,ref){return ref?cp.execFileSync('git',['show',ref+':'+file],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8');}
function makeAPI(ref){const context={document:{createElement(){return createCanvas(1,1)}}};context.window=context;vm.runInNewContext(textAt('src/story-assets.js',ref),context);vm.runInNewContext(textAt('src/projectiles.js',ref),context);return context.HapilProjectiles;}
function mediaAt(ref){const context={window:{}};vm.runInNewContext(textAt('src/media.js',ref),context);return context.window.HapilMedia;}
function options(group,phase,difficulty){const value={campaign:true,campaignRevision:group>=19?5:group>=13?4:3,practiceBoss:true,bossIndex:group>=13?group-1:group===12?11:group,difficulty,seed:813,runId:'v20-actual-shape-observation'};if(group===12)value.finalPractice=true;return value;}
function worldFor(group){const o=options(group,0,'normal');return {campaign:true,campaignRevision:o.campaignRevision,bossIndex:o.bossIndex,finalPractice:!!o.finalPractice};}
function phaseWorld(group,phase,difficulty='hell'){
 let w=core.createRun(options(group,phase,difficulty)),checkpoint=core.checkpoint(w);checkpoint.phase=phase;w=core.restoreCheckpoint(checkpoint);
 if(!w)throw Error('Invalid actual phase '+group+'/'+phase);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function collectActualShapes(){
 const observed=[],unique=new Map();
 for(let group=0;group<36;group++)for(const phase of [0,1,2])for(const difficulty of ['normal','hell']){
  const w=phaseWorld(group,phase,difficulty),seen=new Set();let peak=0;
  for(let tick=0;tick<1600;tick++){
   core.step(w,{});if(w.stage!=='boss')break;peak=Math.max(peak,w.bullets.length);
   for(const b of w.bullets){
    const key=[group,b.r,b.halfLength,b.kind,b.sourceActorId||''].join('|');seen.add(key);
    if(!unique.has(key)){
     const spec={group,r:b.r,l:b.halfLength,kind:b.kind,firstTick:w.tick,phase,difficulty};
     for(const property of ['sourceActorId','paletteSlot','patternId','acceleration','accelerateAt','maxSpeed','curveRate','curveUntil','pauseFrom','pauseUntil'])if(b[property]!=null)spec[property]=b[property];
     unique.set(key,spec);
    }
   }
  }
  observed.push({group,phase,difficulty,peakBullets:peak,uniqueShapeCount:seen.size});
 }
 return {observed,shapes:[...unique.values()]};
}
async function loadImages(apis,shapes){const media=mediaAt(),images={};for(const key of [...new Set(shapes.flatMap(s=>apis.flatMap(api=>api.assetKeysForEncounter(s.group))))]){if(!media[key])throw Error('Unregistered source '+key);images[key]=await loadImage(path.join(root,media[key]));}return images;}
function paint(api,images,spec,{angle=0,offset=0,paletteSlot=0,low=false,effect=null,age=.25}={}){
 const canvas=createCanvas(96,96),ctx=canvas.getContext('2d'),fx=effect||api.create(images),bullet={...spec,id:7,x:48+offset,y:48+offset,halfLength:spec.l,angle,vx:100*Math.cos(angle),vy:100*Math.sin(angle),age,paletteSlot};
 let draws=0,bodyData;
 const noGeometry=new Proxy(ctx,{get(t,key){if(['fill','fillRect','stroke','strokeRect','fillText'].includes(key))return()=>{throw Error('Geometric projectile fallback '+key)};const f=t[key];if(key==='drawImage')return(...args)=>{draws++;const value=f.apply(t,args);if(draws===1)bodyData=ctx.getImageData(0,0,96,96).data;return value;};return typeof f==='function'?f.bind(t):f;},set(t,key,value){t[key]=value;return true;}});
 try{fx.beginFrame();if(!fx.drawBullet(noGeometry,worldFor(spec.group),bullet,low))throw Error('Source did not draw '+spec.group+'/'+spec.kind);return {canvas,data:ctx.getImageData(0,0,96,96).data,bodyData,metrics:fx.getMetrics(),draws,bullet};}finally{if(!effect)fx.destroy();}
}
function inspect(data,bullet){
 const r=bullet.r,l=bullet.halfLength||0,ca=Math.cos(bullet.angle||0),sa=Math.sin(bullet.angle||0);let center=0,centerVisible=0,centerBright=0,centerLuma=0,shaft=0,shaftVisible=0,capsule=0,capsuleVisible=0,maxOutset=-Infinity;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){
  const dx=x+.5-bullet.x,dy=y+.5-bullet.y,along=dx*ca+dy*sa,across=-dx*sa+dy*ca,a=data[(y*96+x)*4+3],distance=Math.hypot(Math.max(0,Math.abs(along)-l),across);
  if(Math.hypot(dx,dy)<Math.min(2,r*.55)){const i=(y*96+x)*4,lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];center++;centerVisible+=a>=180;centerBright+=a>=180&&lum>=50;centerLuma+=lum*a/255;}
  if(Math.abs(along)<=l&&Math.abs(across)<=Math.min(1.5,r*.5)){shaft++;shaftVisible+=a>=128;}
  if(distance<=r){capsule++;capsuleVisible+=a>=128;}
  if(a>=64)maxOutset=Math.max(maxOutset,Math.abs(along)-l-r,Math.abs(across)-r);
 }
 return {centralCoreVisibleFraction:centerVisible/Math.max(1,center),centralBrightFraction:centerBright/Math.max(1,center),centralAlphaWeightedLuminance:centerLuma/Math.max(1,center),centralPixels:center,visibleCentralPixels:centerVisible,shaftVisibleFraction:shaft?shaftVisible/shaft:null,damageCapsuleVisibleFraction:capsuleVisible/Math.max(1,capsule),maxRasterOutset:maxOutset};
}
async function run(){
 const files=['src/core.js','src/storage.js','src/projectiles.js','src/story-assets.js','src/media.js'],hashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
 const before=makeAPI(baseline),after=makeAPI(),actual=collectActualShapes(),images=await loadImages([before,after],actual.shapes),rows=[];
 const paletteCases=Array.from({length:36},(_,group)=>({group,sourceActorId:group===34?'han-rian':undefined}));paletteCases.push({group:34,sourceActorId:'baek-ion'});
 for(const owner of paletteCases){const world=worldFor(owner.group),normal=after.paletteFor(world,owner),parameters={...owner,paletteSlot:1},swapped=after.paletteFor(world,parameters);if(swapped.primary!==normal.secondary||swapped.secondary!==normal.primary||swapped.accent!==normal.accent)throw Error('Secondary palette changes source ownership '+JSON.stringify(owner));for(let i=0;i<10;i++)if(after.paletteFor(world,parameters)!==swapped)throw Error('Secondary palette reallocated in the hot loop '+JSON.stringify(owner));}
 if(after.paletteFor(worldFor(34),{sourceActorId:'han-rian',paletteSlot:1})===after.paletteFor(worldFor(34),{sourceActorId:'baek-ion',paletteSlot:1}))throw Error('Distinct participant palettes were conflated');
 const variants=[{angle:0,offset:0},{angle:Math.PI/4,offset:0},{angle:Math.PI/2,offset:0},{angle:0,offset:.25},{angle:0,offset:.5}];
 let group=-1,effects=null;
 for(const spec of actual.shapes){if(spec.group!==group){if(effects)for(const effect of Object.values(effects))effect.destroy();group=spec.group;effects={before:before.create(images),after:after.create(images)};}for(const variant of variants)for(const paletteSlot of [0,1]){
  const pair={shape:spec,...variant,paletteSlot};
  for(const [name,api]of [['before',before],['after',after]]){const painted=paint(api,images,spec,{...variant,paletteSlot,effect:effects[name]});pair[name]={...inspect(painted.data,painted.bullet),body:inspect(painted.bodyData,painted.bullet),draws:painted.draws,missingAssets:painted.metrics.missingProjectileAssets,cacheBytes:painted.metrics.stampCacheBytes};}
  rows.push(pair);
 }}if(effects)for(const effect of Object.values(effects))effect.destroy();
 const targets=[{group:23,r:3.8,l:0},{group:25,r:3.8,l:0},{group:29,r:3.8,l:0},{group:34,r:4,l:13,sourceActorId:'baek-ion'},{group:19,r:3,l:9},{group:31,r:3,l:9},{group:31,r:4,l:13}],contact=createCanvas(960,targets.length*142+40),ctx=contact.getContext('2d');ctx.fillStyle='#10151f';ctx.fillRect(0,0,contact.width,contact.height);ctx.fillStyle='#e8e5dd';ctx.font='13px sans-serif';ctx.fillText('ACTUAL ENGINE SHAPES | baseline v19 / current | native and 4x | controlled CPU observation',12,23);
 for(let i=0;i<targets.length;i++){const target=targets[i],spec=actual.shapes.find(s=>Object.keys(target).every(k=>s[k]===target[k]));if(!spec)throw Error('Actual source tuple absent '+JSON.stringify(target));const y=40+i*142;ctx.fillStyle='#c8cfda';ctx.font='12px sans-serif';ctx.fillText('g'+spec.group+' '+spec.kind+' r'+spec.r+' l'+spec.l+(spec.sourceActorId?' '+spec.sourceActorId:''),12,y+18);
  for(const [side,api]of [[0,before],[1,after]]){const shot=paint(api,images,spec),m=inspect(shot.data,shot.bullet),x=240+side*350;ctx.fillText(side?'CURRENT':'V19',x,y+18);ctx.drawImage(shot.canvas,0,0,96,96,x,y+25,96,96);ctx.imageSmoothingEnabled=false;ctx.drawImage(shot.canvas,24,36,48,24,x+118,y+24,192,96);ctx.imageSmoothingEnabled=true;ctx.fillText('core '+m.centralCoreVisibleFraction.toFixed(3)+' / shaft '+(m.shaftVisibleFraction==null?'n/a':m.shaftVisibleFraction.toFixed(3)),x,y+133);}
 }
 for(const [file,hash]of Object.entries(hashes))if(sha(fs.readFileSync(path.join(root,file)))!==hash)throw Error('Source changed during actual-pixel audit '+file);
 const output=path.join(root,'docs/v20-pixels');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'actual-shapes-contact.jpg'),contact.toBuffer('image/jpeg'));
 const summary={baselineAlphaCoreBelow80Percent:rows.filter(r=>r.before.centralCoreVisibleFraction<.8).length,currentAlphaCoreBelow80Percent:rows.filter(r=>r.after.centralCoreVisibleFraction<.8).length,currentMinimumAlphaCore:Math.min(...rows.map(r=>r.after.centralCoreVisibleFraction)),currentMaximumDangerBodyRasterOutset:Math.max(...rows.map(r=>r.after.body.maxRasterOutset)),baselineBelowDiagnosticLuminance50:rows.filter(r=>r.before.centralBrightFraction<.8).length,currentBelowDiagnosticLuminance50:rows.filter(r=>r.after.centralBrightFraction<.8).length};
 const report={capturedAt:new Date().toISOString(),scope:'Actual engine-emitted r/halfLength/owner tuples from216 controlled phases; source-only native CPU pixels, not natural progression or browser/GPU/mobile timing.',fixture:'36 selections ×3 phases ×NORMAL/HELL ×1600 ticks; playerattacks/skillsdisabled and explicitdamageimmunity. Geometry/motion/resources/healthrules unchanged.',baselineCommit:baseline,productionHashes:hashes,observedCases:actual.observed,uniqueShapeCount:actual.shapes.length,variantCount:rows.length,secondaryPaletteReuse:{cases:paletteCases.length,repeatedCalls:paletteCases.length*10,identityStable:true,correctSwappedOwnerValues:true,distinctParticipantReferences:true},requiredGates:{centralAlpha180Fraction:.8,maximumDangerBodyRasterOutset:4.75,maximumSourceOrnamentOutset:4,regularBulletSourceDraws:1,cacheBytes:4194304},colorInterpretation:'The four originally failing real-size sources separately require80% colored alpha180/luminance50 centers in the regression test. Other naturally dark owner palettes retain their source colors: their luminance50 fractions are diagnostics, not additional failures or a request to repaint every boss.',shaftAndCapsuleCoverageDiagnosticOnly:true,separateLargeWeaponRotorIconExcludedFromSmallDangerBodyOutset:true,summary,rows};
 fs.writeFileSync(path.join(root,'docs/V20-ACTUAL-PROJECTILE-PIXELS-20261030.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({shapes:actual.shapes.length,variants:rows.length,...summary,contact:path.join(output,'actual-shapes-contact.jpg')},null,2));
}
module.exports={baseline,root,core,sha,makeAPI,worldFor,phaseWorld,collectActualShapes,loadImages,paint,inspect};
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
