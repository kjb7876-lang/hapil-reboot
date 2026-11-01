'use strict';
// Explicit immune clocks/geometry fixtures, not human or device clears.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const C=require('../src/core.js'),Weapon=require('../src/weapon-patterns.js'),Patterns=require('../src/boss-patterns-v27.js'),Lasers=require('../src/boss-lasers-v28.js'),Flow=require('../src/boss-flow-v29.js');
const BASE='6afd61432c6b2334d44e8ab81db065241c9a67ac';
function load(source,internal=false){const box={HapilWeaponPatterns:Weapon,HapilBossPatternsV27:Patterns,HapilBossLasersV28:Lasers,HapilBossFlowV29:Flow};if(internal)source=source.replace('return Object.freeze({ W: W,','return Object.freeze({ _phraseTest:{warning:warning,flowReserved:flowReserved}, W: W,');vm.runInNewContext(source,box);return box.HapilCore;}
const T=load(fs.readFileSync(require.resolve('../src/core.js'),'utf8'),true)._phraseTest;
function world(index=0,phase=0,difficulty='normal',revision,core=C){if(arguments.length<4)revision=31;const initial=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'laser31-core-contract'}),saved=core.checkpoint(initial);saved.phase=phase;const w=core.restoreCheckpoint(saved);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function advance(w,tick){while(w.tick<tick)C.step(w,{});}
function locked(h){return JSON.stringify([h.x1,h.y1,h.x2,h.y2,h.width,h.born,h.baseWarningTicks,h.staggerTicks,h.warningTicks,h.activeAt,h.fadeAt,h.expireAt,h.sourcePhase,h.sourceActorId,h.modelActorId,h.chainId,h.paletteSlot,h.v31Barrage,h.v31Phrase,h.v31Stage,h.v31StageCount]);}

test('31 is separate and checkpoint-safe, inheriting the30 mobile limits without new saved fields',()=>{
 assert.equal(C.LASER_PHRASE_COMBAT_REVISION,31);assert.equal(C.LATEST_COMBAT_REVISION,31);const a=world(),b=world(0,0,'normal',30),saved=C.checkpoint(a);assert.equal(saved.combatRevision,31);assert.deepEqual(C.checkpoint(C.restoreCheckpoint(saved)),saved);assert.deepEqual(Object.keys(saved),Object.keys(C.checkpoint(b)));assert.equal(C.MOBILE_BOSS_LIMITS.maxCopies,4);assert.equal(C.MOBILE_BULLET_LIMITS.graceTicks,180);assert.equal(C.MOBILE_BULLET_LIMITS.retireDuration,.8);assert.equal(C.MOBILE_BULLET_LIMITS.exitPadding,104);for(const key of ['minActiveTicks','maxActiveTicks','minFadeTicks','maxFadeTicks','maxStaggerTicks','maxPhraseTicks','maxSegments'])assert.equal(C.LASER_PHRASE_LIMITS[key],Lasers.spectacleLimits[key]);
});

test('all seven historical selectors remain raw exact against pinned30, including real30 TTL and clone clocks',()=>{
 const Old=load(cp.execFileSync('git',['show',BASE+':src/core.js'],{encoding:'utf8'}));
 for(const revision of [undefined,21,25,27,28,29,30])for(const index of [0,8,24,33])for(const difficulty of ['normal','hell']){
  const a=world(index,2,difficulty,revision),b=world(index,2,difficulty,revision,Old),ticks=revision===30?900:240;assert.equal(JSON.stringify(a),JSON.stringify(b));for(let n=0;n<ticks;n++){const input={dx:n%120<60?4:-4,dy:n%180<90?.5:-.5,focus:n%90<45};C.step(a,input);Old.step(b,input);if(n%60===0||n===ticks-1)assert.equal(JSON.stringify(a),JSON.stringify(b),[revision,index,difficulty,n].join('/'));}
 }
});

test('all315 actual31 phrases sustain locked source-owned rays in stages and finish before recovery without raising mobile budgets',()=>{
 let rays=0,reflections=0;const modes=new Set();
 for(let index=0;index<35;index++)for(let phase=0;phase<3;phase++)for(const difficulty of ['gentle','normal','hell']){
  const w=world(index,phase,difficulty),seen=new Map(),initial=new Map();let first=Infinity,lastDamage=-Infinity,lastFade=-Infinity;
  for(let tick=0;tick<600;tick++){
   C.step(w,{});const live=w.hazards.filter(h=>h.laserBarrage),within=(Math.round(w.phaseTime*60)-1)%600;assert(w.hazards.length<=40);assert(live.length<=12);assert.equal(w.enemies.length,0);assert((w.boss.combatCopies||[]).length<=4);assert(w.bullets.length+T.flowReserved(w)<=768);
   for(const h of live){assert.equal(h.v31Barrage,true);assert.equal((h.born-1)%600,228);assert(h.patternId.endsWith('-v31'));assert.equal(h.sourcePhase,phase);assert(h.v31Phrase.length>0);assert(Number.isInteger(h.v31Stage)&&h.v31Stage>=0&&h.v31Stage<h.v31StageCount);assert(h.v31StageCount>=2&&h.v31StageCount<=3);assert(h.activeTicks>=42&&h.activeTicks<=72);assert(h.fadeTicks>=12&&h.fadeTicks<=18);assert(h.staggerTicks>=0&&h.staggerTicks<=138);assert.equal(h.warningTicks,h.baseWarningTicks+h.staggerTicks);assert(h.warningTicks>=54);assert.equal(h.activeAt,h.born+h.warningTicks);assert.equal(h.fadeAt,h.activeAt+h.activeTicks);assert.equal(h.expireAt,h.fadeAt+h.fadeTicks);assert(h.expireAt-h.born<=294);assert((h.expireAt-1)%600<=522);modes.add(h.v28Mode);
    assert.equal(h.phase,w.tick<h.activeAt?'warning':w.tick<h.fadeAt?'active':'fade');const signature=locked(h);if(seen.has(h.id))assert.equal(signature,seen.get(h.id),'a live ray must not move, rotate, widen or shift its clocks');else{seen.set(h.id,signature);initial.set(h.id,{...h});rays++;first=Math.min(first,h.activeAt);lastDamage=Math.max(lastDamage,h.fadeAt);lastFade=Math.max(lastFade,h.expireAt);}
    const route=w._pressurePlan&&w.tick<w._pressurePlan.expireAt&&w._pressurePlan.route;if(route){const margin=route.halfWidth+h.width/2+w.player.r;assert(C.geometry.segmentPairDistanceSquared(h.x1,h.y1,h.x2,h.y2,route.x1,route.y1,route.x2,route.y2)>margin*margin);}
    if(h.v28Reflected){const pair=live.filter(x=>x.chainId===h.chainId);assert.equal(pair.length,2);const a=pair.find(x=>x.v28Segment===0),b=pair.find(x=>x.v28Segment===1);assert(a&&b);assert(Math.hypot(a.x2-b.x1,a.y2-b.y1)<1e-7);for(const key of ['activeAt','fadeAt','expireAt','v31Phrase','v31Stage','v31StageCount'])assert.equal(a[key],b[key]);reflections++;}
    if(w.tick===h.activeAt){const record=w.boss.skillReleases.find(r=>r.tick===w.tick&&r.v28BarrageId===h.v28BarrageId&&r.v28RayGroup===h.v28RayGroup&&r.v28Segment===h.v28Segment);assert(record,'every actual activation retains its own release origin');for(const key of ['sourcePhase','sourceActorId','modelActorId','v31Barrage','v31Phrase','v31Stage','v31StageCount'])assert.equal(record[key],h[key]);assert.equal(record.x,h.x1);assert.equal(record.y,h.y1);}
   }
   if(within>=526){assert.equal(live.length,0);assert(w.hazards.every(h=>h.pressureCurtain));assert.equal(w.boss.action,'recover');}
  }
  assert(initial.size>0,[index,phase,difficulty].join('/')+' must actually expose its owned phrase');assert(initial.size<=(difficulty==='hell'?8:difficulty==='normal'?6:4));assert(lastDamage-first>=138,'the actual damaging phrase lasts at least2.3 seconds');assert(lastFade-first>=150);const stages=new Set([...initial.values()].map(h=>h.v31Stage));assert(stages.size>=2);assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
 }
 assert(rays>=1000);assert(reflections>50);for(const mode of ['sweep','cross','reflect','piano','spokes','reticle','parallel','relay','stairs','fork','bars','triads'])assert(modes.has(mode));
});

function fillerHazard(w,laserBarrage){return {id:++w.idCounter,castId:0,ownerId:0,kind:'laser',x1:0,y1:0,x2:1,y2:1,width:1,phase:'warning',born:0,warningTicks:9000,activeAt:9000,fadeAt:9010,expireAt:9020,activeTicks:10,fadeTicks:10,progress:0,grazed:false,...(laserBarrage?{laserBarrage:true}:{})};}
test('the entire pending/active/fade budget is resolved before any long warning and never queues a stale phrase',()=>{
 for(const kind of ['all','new']){const w=world();advance(w,228);if(kind==='all')while(w.hazards.length<40)w.hazards.push(fillerHazard(w,false));else for(let i=0;i<10;i++)w.hazards.push(fillerHazard(w,true));const before=new Set(w.hazards.map(h=>h.id)),drops=w.stats.droppedGroups,pressure=w.stats.poolPressure;C.step(w,{});assert.equal(w.boss.laserBarrageStats.skippedBudget,1);assert.equal(w.boss.laserBarrageStats.committed,0);assert(w.hazards.every(h=>before.has(h.id)));assert.equal(w.stats.droppedGroups,drops);assert.equal(w.stats.poolPressure,pressure);assert.equal(w._deferred.length,0);advance(w,420);assert(w.hazards.filter(h=>h.v31Barrage).length===0);assert.equal(w.boss.laserBarrageStats.attempts,1);}
});

function reflected(w,patch={}){return [{x:8,y:80,x2:60,y2:120,width:4,warningTicks:54,staggerTicks:0,activeTicks:54,fadeTicks:12,ownerId:w.boss.id,laserBarrage:true,v28Reflected:true,v28Segment:0,chainId:'test-reflect',v31Barrage:true,v31Phrase:'fixture',v31Stage:0,v31StageCount:2},{x:60,y:120,x2:8,y2:160,width:4,warningTicks:54,staggerTicks:0,activeTicks:54,fadeTicks:12,ownerId:w.boss.id,laserBarrage:true,v28Reflected:true,v28Segment:1,chainId:'test-reflect',v31Barrage:true,v31Phrase:'fixture',v31Stage:0,v31StageCount:2}].map(s=>({...s,...patch}));}
test('31 rejects invalid long clocks and broken reflected-stage metadata as complete groups before a cue exists',()=>{
 for(const patch of [{warningTicks:53},{staggerTicks:139},{activeTicks:73},{activeTicks:41},{fadeTicks:19},{fadeTicks:11},{v31Barrage:false},{v31Stage:3},{v31StageCount:4},{warningTicks:120,staggerTicks:138,activeTicks:72,fadeTicks:18}]){const w=world();advance(w,228);const ids=w.idCounter,count=w.hazards.length,drops=w.stats.droppedGroups;assert.equal(T.warning(w,reflected(w,patch),54,'invalid-phrase'),false);assert.equal(w.idCounter,ids);assert.equal(w.hazards.length,count);assert.equal(w.stats.droppedGroups,drops);}
 const w=world();advance(w,228);const broken=reflected(w);broken[1].v31Stage=1;const count=w.hazards.length;assert.equal(T.warning(w,broken,54,'broken-stage'),false);assert.equal(w.hazards.length,count);w.phaseTime=480/60;assert.equal(T.warning(w,reflected(w),54,'late-phrase'),false);assert.equal(w.hazards.length,count,'nothing is shifted or erased to fit a late promise');
});

test('real phase defeat leaves the already announced long phrase on its exact paths until every original fade ends',()=>{
 const w=world(3,0,'normal');advance(w,300);const initial=new Map(w.hazards.filter(h=>h.v31Barrage).map(h=>[h.id,{signature:locked(h),expireAt:h.expireAt}]));assert(initial.size>=4);assert([...initial.values()].some(h=>h.expireAt>440));w.boss.hp=1;w.shots.push({id:++w.idCounter,x:w.boss.x,y:w.boss.y,px:w.boss.x,py:w.boss.y,vx:0,vy:0,r:2,kind:'basic',age:0,ttl:1,damage:100});C.step(w,{});assert.equal(w.stage,'transition');const last=Math.max(...[...initial.values()].map(h=>h.expireAt));
 while(w.tick<=last){for(const [id,saved]of initial){const h=w.hazards.find(h=>h.id===id);if(w.tick<saved.expireAt){assert(h);assert.equal(locked(h),saved.signature);}else assert(!h);}assert(w.hazards.filter(h=>h.v31Barrage).every(h=>initial.has(h.id)));C.step(w,{});}assert.equal(w.hazards.filter(h=>h.v31Barrage).length,0);assert.equal(w.stats.droppedGroups,0);
});
