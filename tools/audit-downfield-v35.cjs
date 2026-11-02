'use strict';
// Independent observations of real fixed-step worlds. Explicit immunity and
// disabled auto-attacks isolate geometry/lifetimes, not ordinary-health clears.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),BASE='509d1beb3a2bb6f4e75d880383fde28901ad5cdd',EPS=1e-6;
const FILES=['src/core.js','src/boss-patterns-v27.js','src/boss-lasers-v28.js','src/weapon-patterns.js','src/storage.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function hashes(){return Object.fromEntries(FILES.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));}
function baselineCore(){
 const cache=new Map(),sources={};function load(file){if(cache.has(file))return cache.get(file).exports;assert(/^src\/[A-Za-z0-9_.-]+\.js$/.test(file),'baseline loader only reads repository source modules');const code=cp.execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8',maxBuffer:4194304}),module={exports:{}};cache.set(file,module);sources[file]=sha(code);const factory=vm.runInNewContext('(function(require,module,exports){\n'+code+'\n})',{}, {filename:BASE+':'+file});factory(request=>{assert(request.startsWith('./'),'baseline module must use a local dependency');return load(path.posix.normalize(path.posix.join(path.posix.dirname(file),request)));},module,module.exports);return module.exports;}
 return {C:load('src/core.js'),sourceHashes:sources};
}
function world(C,index=0,phase=0,difficulty='hell',practice=true){
 const options={campaign:true,campaignRevision:5,combatRevision:31,practiceBoss:practice,bossIndex:index,difficulty,seed:813,runId:'v35-independent-'+index+'-'+phase+'-'+difficulty+'-'+(practice?'boss':'wave')};
 let w=C.createRun(options);const snap=C.checkpoint(w);snap.bossIndex=index;if(practice)snap.phase=phase;w=C.restoreCheckpoint(snap);
 assert.equal(w.bossIndex,index,'fixture selects the requested real campaign encounter');assert.equal(w.stage,practice?'boss':'waves');if(practice)assert.equal(w.phase,phase);
 w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function pointSegmentSquared(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=dx*dx+dy*dy?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy))):0;return (x-ax-t*dx)**2+(y-ay-t*dy)**2;}
function segmentDistanceSquared(ax,ay,bx,by,cx,cy,dx,dy){
 const cross=(a,b,c,d)=>a*d-b*c,rx=bx-ax,ry=by-ay,sx=dx-cx,sy=dy-cy,den=cross(rx,ry,sx,sy);
 if(Math.abs(den)>1e-10){const t=cross(cx-ax,cy-ay,sx,sy)/den,u=cross(cx-ax,cy-ay,rx,ry)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 return Math.min(pointSegmentSquared(ax,ay,cx,cy,dx,dy),pointSegmentSquared(bx,by,cx,cy,dx,dy),pointSegmentSquared(cx,cy,ax,ay,bx,by),pointSegmentSquared(dx,dy,ax,ay,bx,by));
}
function wide(h){return !!(h&&(h.bossWideLaser||h.pressureCurtain||h.width>20));}
function locked(h){return JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.born,h.warningTicks,h.activeAt,h.fadeAt,h.expireAt,h.ownerId,h.sourceActorId,h.modelActorId,h.bossWideLaser,h.pressureCurtain]);}
function emitterPoints(w){const b=w.boss;if(!b)return[];return [{id:'boss',x:b.x,y:b.y+18},...(b.participants||[]).map(p=>({id:p.id,x:p.x,y:p.y+18}))];}
function sourceFor(w,h){return emitterPoints(w).find(p=>Math.hypot(p.x-h.x1,p.y-h.y1)<=EPS)||null;}
function issueBook(){return {counts:{},samples:[]};}
function issue(book,type,detail){book.counts[type]=(book.counts[type]||0)+1;if(book.samples.length<24)book.samples.push({type,...detail});}
function violationCount(book){return Object.values(book.counts).reduce((n,x)=>n+x,0);}
function bulletTracker(book){
 const known=new Map();const out={births:0,ordinaryBirths:0,weaponBirths:0,initialUpwardBefore360:0,initialOutwardBefore360:0,earlySideExits:0,earlyTopExits:0,reached360:0,sourcePatterns:new Set(),examples:[]};
 function sample(type,w,b,record){const row={type,tick:w.tick,id:b.id,pattern:b.patternId||null,kind:b.kind,x:b.x,y:b.y,vx:b.vx,vy:b.vy,birthX:record.x,birthY:record.y,birthTick:record.tick};if(out.examples.length<24)out.examples.push(row);issue(book,type,row);}
 function observe(w){for(const b of w.bullets){let r=known.get(b.id);if(!r){
   const weapon=!!b.weaponMotion||b.kind==='boss-weapon'||b.kind==='hell-rotor';r={x:Number.isFinite(b.px)?b.px:b.x,y:Number.isFinite(b.py)?b.py:b.y,tick:w.tick,weapon,maxY:b.y,side:false,top:false,reached:b.y>=360};known.set(b.id,r);out.births++;if(weapon){out.weaponBirths++;continue;}out.ordinaryBirths++;out.sourcePatterns.add(b.patternId||'untagged');
   if(r.y<360&&b.vy<=0){out.initialUpwardBefore360++;sample('ordinary-initial-upward',w,b,r);}
   if(r.y<360&&((r.x<=0&&b.vx<0)||(r.x>=360&&b.vx>0)||r.y<0&&b.vy<0)){out.initialOutwardBefore360++;sample('ordinary-initial-outward',w,b,r);}
  }
  if(r.weapon)continue;r.maxY=Math.max(r.maxY,b.y);if(!r.reached&&r.maxY>=360){r.reached=true;out.reached360++;}
  if(r.maxY<360&&!r.side&&(b.x<0||b.x>360)){r.side=true;out.earlySideExits++;sample('ordinary-side-exit-before360',w,b,r);}
  if(r.maxY<360&&!r.top&&b.y<0){r.top=true;out.earlyTopExits++;sample('ordinary-top-exit-before360',w,b,r);}
 }}
 function result(){return {...out,sourcePatterns:[...out.sourcePatterns].sort()};}
 return {observe,result};
}
function phaseMatrix(C,{ticks=1200,bosses=Array.from({length:35},(_,i)=>i),phases=[0,1,2],difficulties=['gentle','normal','hell']}={}){
 assert.equal(C.PRESSURE_LIMITS.warningTicks,90,'preserve the established wide-pressure warning clock');assert.equal(C.PRESSURE_LIMITS.bossActiveTicks,360,'preserve the established wide-pressure active clock');
 const rows=[];let corridorChecks=0,anchorChecks=0,seenWide=0;
 for(const index of bosses)for(const phase of phases)for(const difficulty of difficulties){
  const w=world(C,index,phase,difficulty),book=issueBook(),trace=bulletTracker(book),known=new Map();let prior=new Map(),peakBullets=0,peakHazards=0,peakWide=0;
  for(let n=0;n<ticks;n++){
   C.step(w,{dx:n%240<120?1:-1,dy:n%180<90?.5:-.5});if(w.stage!=='boss')issue(book,'boss-fixture-left-stage',{tick:w.tick,stage:w.stage});
   const rays=w.hazards.filter(wide),ids=new Set(rays.map(h=>h.id));peakBullets=Math.max(peakBullets,w.bullets.length);peakHazards=Math.max(peakHazards,w.hazards.length);peakWide=Math.max(peakWide,rays.length);
   if(w.bullets.length>768||w.hazards.length>40||rays.length>6)issue(book,'entity-budget',{tick:w.tick,bullets:w.bullets.length,hazards:w.hazards.length,wide:rays.length});
   for(const [id,expireAt]of prior)if(!ids.has(id)&&w.tick!==expireAt)issue(book,'wide-disappeared-before-expiry',{tick:w.tick,id,expireAt});prior=new Map(rays.map(h=>[h.id,h.expireAt]));
   for(const h of rays){
    const geometry=[h.x1,h.y1,h.x2,h.y2,h.width,h.born,h.activeAt,h.fadeAt,h.expireAt];if(!geometry.every(Number.isFinite)){issue(book,'wide-invalid-geometry',{tick:w.tick,id:h.id});continue;}
    if(!h.bossWideLaser||!h.pressureCurtain||h.ownerId!==w.boss.id||h.sourceActorId&&/copy|clone|illusion/.test(String(h.sourceActorId)))issue(book,'wide-not-owned-by-actual-boss',{tick:w.tick,id:h.id,ownerId:h.ownerId,source:h.sourceActorId});
    if(Math.abs(h.y2-640)>EPS||h.x1<0||h.x1>360||h.x2<0||h.x2>360||h.y1<0||h.y1>=260||h.width<20||h.width>48)issue(book,'wide-not-bounded-downfield',{tick:w.tick,id:h.id,x1:h.x1,y1:h.y1,x2:h.x2,y2:h.y2,width:h.width});
    const expected=w.tick<h.activeAt?'warning':w.tick<h.fadeAt?'active':'fade';if(h.phase!==expected)issue(book,'wide-clock-phase',{tick:w.tick,id:h.id,phase:h.phase,expected});
    if(h.activeAt-h.born!==(difficulty==='gentle'?102:90)||h.fadeAt-h.activeAt!==360||h.expireAt-h.fadeAt!==15)issue(book,'wide-clock-duration',{tick:w.tick,id:h.id,warning:h.activeAt-h.born,active:h.fadeAt-h.activeAt,fade:h.expireAt-h.fadeAt});
    let record=known.get(h.id);if(!record){const source=sourceFor(w,h);if(!source)issue(book,'wide-origin-not-on-boss-at-birth',{tick:w.tick,id:h.id,x:h.x1,y:h.y1,points:emitterPoints(w)});record={lock:locked(h),source:source&&source.id};known.set(h.id,record);seenWide++;
     if(h.born!==w.tick)issue(book,'wide-first-seen-after-birth',{tick:w.tick,id:h.id,born:h.born});
     const plan=w._pressurePlan;if(!plan||plan.geometryKind!=='boss-downfield-fan'||plan.targetCoverage!==null)issue(book,'wide-plan-contract',{tick:w.tick,id:h.id,kind:plan&&plan.geometryKind,target:plan&&plan.targetCoverage});
    }else if(locked(h)!==record.lock)issue(book,'wide-promise-mutated',{tick:w.tick,id:h.id});
    const current=emitterPoints(w).find(p=>p.id===record.source);if(!current||Math.hypot(current.x-h.x1,current.y-h.y1)>EPS)issue(book,'wide-emitter-detached',{tick:w.tick,id:h.id,source:record.source,points:emitterPoints(w),origin:[h.x1,h.y1]});anchorChecks++;
    const plan=w._pressurePlan;if(plan&&w.tick<plan.expireAt&&plan.route){const r=plan.route,margin=r.halfWidth+h.width/2+w.player.r;corridorChecks++;if(segmentDistanceSquared(h.x1,h.y1,h.x2,h.y2,r.x1,r.y1,r.x2,r.y2)<=margin*margin)issue(book,'wide-crosses-protected-route',{tick:w.tick,id:h.id,route:r});}
   }
   trace.observe(w);
  }
  if(!known.size)issue(book,'no-boss-wide-cast',{index,phase,difficulty});if(w.stats.poolPressure||w.stats.droppedGroups)issue(book,'dropped-attack-groups',{poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups});
  rows.push({bossIndex:index,phase,difficulty,ticks,wideCapsules:known.size,peakBullets,peakHazards,peakWide,bullets:trace.result(),violations:book});
 }
 return {summary:{cases:rows.length,ticksPerCase:ticks,engineTicks:rows.length*ticks,actualWideCapsules:seenWide,actualAnchorChecks:anchorChecks,actualCorridorChecks:corridorChecks,peakBullets:Math.max(...rows.map(r=>r.peakBullets)),peakHazards:Math.max(...rows.map(r=>r.peakHazards)),peakWide:Math.max(...rows.map(r=>r.peakWide)),ordinaryBirths:rows.reduce((n,r)=>n+r.bullets.ordinaryBirths,0),weaponBirths:rows.reduce((n,r)=>n+r.bullets.weaponBirths,0),earlySideExits:rows.reduce((n,r)=>n+r.bullets.earlySideExits,0),earlyTopExits:rows.reduce((n,r)=>n+r.bullets.earlyTopExits,0),initialUpwardBefore360:rows.reduce((n,r)=>n+r.bullets.initialUpwardBefore360,0),initialOutwardBefore360:rows.reduce((n,r)=>n+r.bullets.initialOutwardBefore360,0),violationCount:rows.reduce((n,r)=>n+violationCount(r.violations),0)},rows};
}
function waveMatrix(C,{ticks=600,bosses=Array.from({length:35},(_,i)=>i),difficulties=['gentle','normal','hell']}={}){
 const rows=[];for(const index of bosses)for(const difficulty of difficulties){const w=world(C,index,0,difficulty,false),book=issueBook(),trace=bulletTracker(book);let waveTicks=0,wideObserved=0;
  for(let n=0;n<ticks;n++){C.step(w,{dx:n%240<120?1:-1,dy:0});if(w.stage==='waves'){waveTicks++;for(const h of w.hazards)if(wide(h)){wideObserved++;issue(book,'wide-laser-during-waves',{tick:w.tick,id:h.id,ownerId:h.ownerId,width:h.width});}}trace.observe(w);}
  if(!waveTicks)issue(book,'no-wave-steps-observed',{index,difficulty});rows.push({bossIndex:index,difficulty,ticks,waveTicks,wideObserved,bullets:trace.result(),violations:book});
 }
 return {summary:{cases:rows.length,ticksPerCase:ticks,engineTicks:rows.length*ticks,waveTicks:rows.reduce((n,r)=>n+r.waveTicks,0),wideObserved:rows.reduce((n,r)=>n+r.wideObserved,0),ordinaryBirths:rows.reduce((n,r)=>n+r.bullets.ordinaryBirths,0),earlySideExits:rows.reduce((n,r)=>n+r.bullets.earlySideExits,0),earlyTopExits:rows.reduce((n,r)=>n+r.bullets.earlyTopExits,0),initialUpwardBefore360:rows.reduce((n,r)=>n+r.bullets.initialUpwardBefore360,0),violationCount:rows.reduce((n,r)=>n+violationCount(r.violations),0)},rows};
}
function baselineTrajectories(C,{bossTicks=1200,waveTicks=600}={}){
 const result={boss:{cases:0,engineTicks:0,ordinaryBirths:0,weaponBirths:0,initialUpwardBefore360:0,initialOutwardBefore360:0,earlySideExits:0,earlyTopExits:0,actualWideCapsules:0,wideSamples:0,detachedWideSamples:0},waves:{cases:0,engineTicks:0,ordinaryBirths:0,weaponBirths:0,initialUpwardBefore360:0,initialOutwardBefore360:0,earlySideExits:0,earlyTopExits:0,wideObserved:0},examples:[]};
 for(const kind of ['boss','waves'])for(let index=0;index<35;index++)for(const phase of kind==='boss'?[0,1,2]:[0])for(const difficulty of ['gentle','normal','hell']){
  const target=result[kind],w=world(C,index,phase,difficulty,kind==='boss'),trace=bulletTracker(issueBook()),knownWide=new Set(),ticks=kind==='boss'?bossTicks:waveTicks;target.cases++;
  for(let n=0;n<ticks;n++){C.step(w,{dx:n%240<120?1:-1,dy:kind==='boss'?(n%180<90?.5:-.5):0});target.engineTicks++;trace.observe(w);for(const h of w.hazards.filter(wide)){if(kind==='boss'){knownWide.add(h.id);target.wideSamples++;if(!sourceFor(w,h))target.detachedWideSamples++;}else if(w.stage==='waves')target.wideObserved++;}}
  const stats=trace.result();for(const key of ['ordinaryBirths','weaponBirths','initialUpwardBefore360','initialOutwardBefore360','earlySideExits','earlyTopExits'])target[key]+=stats[key];if(kind==='boss')target.actualWideCapsules+=knownWide.size;if(result.examples.length<24)result.examples.push(...stats.examples.slice(0,24-result.examples.length).map(row=>({fixtureKind:kind,bossIndex:index,phase,difficulty,...row})));
 }
 return result;
}
function main(){const C=require('../src/core.js'),before=hashes(),boss=phaseMatrix(C),waves=waveMatrix(C),baseline=baselineCore(),prior=baselineTrajectories(baseline.C);assert.deepEqual(hashes(),before,'product source changed while audit was running');const report={schema:1,baseline:BASE,scope:'Independent deterministic CPU boss/wave worlds, current31, seed813, explicit immunity and automatic attacks/skills off. Actual boss origins, immutable committed geometry, full fade, bounds and real bullet boundary crossings. Before/after use identical fixtures and each revision own complete source modules. Not natural clears or device/GPU FPS.',sourceHashes:before,baselineSourceHashes:baseline.sourceHashes,before:prior,boss,waves,passed:boss.summary.violationCount===0&&waves.summary.violationCount===0};const directory=path.join(ROOT,'docs/v35');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'downfield-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,before:{boss:prior.boss,waves:prior.waves},after:{boss:boss.summary,waves:waves.summary}}));if(!report.passed)process.exitCode=1;return report;}
module.exports={ROOT,BASE,hashes,baselineCore,baselineTrajectories,world,segmentDistanceSquared,bulletTracker,phaseMatrix,waveMatrix,main};if(require.main===module)main();
