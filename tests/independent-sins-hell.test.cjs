'use strict';
// Independent CPU fixtures for campaign boundaries and live combat safety.
// These do not replace normal-health natural replays or actual device QA.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const clone=x=>structuredClone(x);
function fixture(index,phase,difficulty='normal',seed=591){
 const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,difficulty,seed,runId:'independent-sins-fixture'});
 w.phase=phase;w.phaseTime=0;w.boss.phase=phase;w.autoAttack=false;w.skillRotation=false;
 // Explicit long-observation immunity, not a natural progression assertion.
 w.player.invulnerableUntil=999999;
 return w;
}
function sample(w){return JSON.stringify({tick:w.tick,stage:w.stage,boss:w.boss,bullets:w.bullets,hazards:w.hazards,rngState:w.rngState,stats:w.stats});}
test('revision three extends rather than renames the five published encounters and owns twelve distinct signature identities',()=>{
 assert.equal(core.CAMPAIGN_REVISION,3);
 assert.deepEqual(core.CAMPAIGN_BOSSES.slice(0,5).map(b=>b.id),['violet','horn','balrog','mask','lucifer']);
 assert.equal(core.CAMPAIGN_BOSSES.length,12);
 assert.deepEqual(core.CAMPAIGN_BOSSES.slice(5).map(b=>b.id),['belphegor','leviathan','beelzebub','asmodeus','mammon','wrath','pride']);
 assert.deepEqual(core.CAMPAIGN_BOSSES.slice(5).map(b=>b.sceneIds),[['ep1b02'],['ep1b03'],['ep1b04'],['ep1b05'],['ep1b06','ep1b06b'],['ep1b07'],['ep1b08','ep1b09']]);
 assert.equal(new Set(core.CAMPAIGN_BOSSES.map(b=>b.id)).size,12);
 assert.equal(core.CAMPAIGN_SIGNATURES.length,12);
 assert.equal(new Set(core.CAMPAIGN_SIGNATURES.map(b=>b.id)).size,12);
 for(const b of core.CAMPAIGN_BOSSES){assert(b.name&&b.zone&&b.artKey);assert.equal(b.patterns.length,3);assert.equal(b.hp.length,3);assert(b.waves.length>=1&&b.waves.length<=3);}
});

test('Mammon child memory and chairman cyborg keep actor identity while restoring their own phase artwork',()=>{
 for(const [index,id,role,key] of [[9,'mammon','child-memory','sinMammonChildAtlas'],[11,'pride','cyborg-biobootloader','sinPrideCyborgAtlas']]){
  const w=core.createRun({campaign:true,practiceBoss:true,bossIndex:index,seed:96,runId:'same-actor-phase-fixture'});
  const s=core.checkpoint(w);s.phase=2;
  const validated=store.validateCheckpoint(s);assert(validated);
  const restored=core.restoreCheckpoint(validated);
  assert.equal(restored.bossId,id);assert.equal(restored.boss.kind,id);assert.equal(restored.boss.phaseRole,role);assert.equal(restored.boss.artKey,key);
  assert.equal(restored.bossIndex,index);assert.equal(restored.bossCount,12);
 }
 assert.notEqual(core.CAMPAIGN_BOSSES[4].id,core.CAMPAIGN_BOSSES[11].id,'cosmic Lucifer and the pride chairman remain different people');
});

test('normal and gentle route fixtures require 45 seconds of ordinary-enemy time before each boss introduction',()=>{
 // Select each encounter only by a validated safe-boundary save. Immunity is
 // set after restoration solely to isolate the route timer from dodge skill.
 for(const difficulty of ['normal','gentle'])for(let index=0;index<core.CAMPAIGN_BOSSES.length;index++){
  const s=core.checkpoint(core.createRun({campaign:true,difficulty,seed:96,runId:'route-duration-fixture'}));
  s.bossIndex=index;const validated=store.validateCheckpoint(s);assert(validated);
  const w=core.restoreCheckpoint(validated);w.player.invulnerableUntil=999999;
  let enemyFrames=0,ticks=0;
  while(w.stage==='waves'&&ticks<4000){core.step(w,{});ticks++;if(w.enemies.length)enemyFrames++;}
  assert.equal(w.stage,'bossIntro',`${index}/${difficulty}`);
  // Announced dangers are allowed to drain after the minimum route time.
  assert(ticks>=2700&&ticks<4000,`${index}/${difficulty}: ${ticks} route ticks`);
  assert(enemyFrames>800,`${index}/${difficulty}: ordinary enemies must actually spawn throughout the route`);
  assert.equal(w.phase,0);assert.equal(w.boss,null);
 }
});

test('legacy revision boundaries keep their saved wave timing, boss count and revision after restore',()=>{
 for(const [revision,count] of [[1,3],[2,5]]){
  const w=core.createRun({campaign:true,campaignRevision:revision,difficulty:'normal',seed:96,runId:'legacy-route-fixture'});
  assert.equal(w.bossCount,count);assert.equal(w.waveDuration,15);
  const s=core.checkpoint(w);s.bossIndex=1;
  const validated=store.validateCheckpoint(s);assert(validated);
  const restored=core.restoreCheckpoint(validated);assert.equal(restored.campaignRevision,revision);assert.equal(restored.bossCount,count);assert.equal(restored.waveDuration,15);
  restored.player.invulnerableUntil=999999;
  while(restored.stage==='waves'&&restored.tick<1400)core.step(restored,{});
  assert.equal(restored.stage,'bossIntro');assert(restored.tick>=900&&restored.tick<1400);
  core.skipBossIntro(restored);const next=core.checkpoint(restored);
  assert.equal(next.campaignRevision,revision);assert.equal(next.bossIndex,1);assert(store.validateCheckpoint(next));
  const invalid=clone(s);invalid.bossIndex=count;
  assert.equal(store.validateCheckpoint(invalid),null);assert.throws(()=>core.restoreCheckpoint(invalid));
 }
});

test('HELL actually varies volley speed by seed and remains faster than normal without breaking weapon pair symmetry',()=>{
 function firstPair(difficulty,seed){
  const w=fixture(0,0,difficulty,seed);
  for(let t=0;t<200;t++){
   core.step(w,{});const pair=w.bullets.filter(b=>b.kind==='boss-weapon'&&Math.abs(b.age-core.FIXED_DT)<1e-8);
   if(pair.length)return pair.map(b=>({speed:Math.hypot(b.vx,b.vy),vx:b.vx,vy:b.vy}));
  }
  assert.fail('missing first boss weapon pair');
 }
 const normal=firstPair('normal',31),a=firstPair('hell',31),b=firstPair('hell',947),again=firstPair('hell',31);
 assert.deepEqual(a,again);assert.notDeepEqual(a,b,'different seeds must change the live volley');
 for(const pair of [a,b]){
  assert.equal(pair.length,2);assert(Math.abs(pair[0].speed-pair[1].speed)<1e-8);assert(Math.abs(pair[0].vx+pair[1].vx)<1e-8);assert(Math.abs(pair[0].vy-pair[1].vy)<1e-8);
  for(const p of pair){const factor=p.speed/normal[0].speed;assert(factor>=1.32&&factor<=1.56);}
 }
});

test('a synthetic lethal-shot fixture ends legacy routes at their own final boss instead of silently extending the saved campaign',()=>{
 // Deliberate endpoint fixture; this makes no ordinary-HP clear claim. Full
 // normal-damage progression is independently replayed from recorded input.
 for(const [revision,count] of [[1,3],[2,5],[3,12]]){
  const initial=core.createRun({campaign:true,campaignRevision:revision,practiceBoss:true,bossIndex:count-1,difficulty:'normal',seed:96,runId:'legacy-endpoint-fixture'});
  const s=core.checkpoint(initial);s.practiceBoss=false;s.phase=2;
  const validated=store.validateCheckpoint(s);assert(validated);
  const w=core.restoreCheckpoint(validated);w.autoAttack=false;w.skillRotation=false;
  const b=w.boss;
  w.shots.push({id:++w.idCounter,x:b.x,y:b.y,px:b.x,py:b.y,vx:0,vy:0,r:2,age:0,ttl:1,damage:b.hp,kind:'basic',angle:-Math.PI/2});
  core.step(w,{});
  assert.equal(w.stage,'won',`revision ${revision} must stop at boss ${count-1}`);assert.equal(w.bossIndex,count-1);assert.equal(w.bossCount,count);assert.equal(w.nextEncounter,undefined);
 }
});

test('all extended combat phases and modes are seeded, bounded and keep committed laser geometry through activation',()=>{
 let measured=0,extendedPatterns=new Set();
 for(const difficulty of ['normal','gentle','hell'])for(let index=0;index<core.CAMPAIGN_BOSSES.length;index++)for(let phase=0;phase<3;phase++){
  const a=fixture(index,phase,difficulty),b=fixture(index,phase,difficulty),hazards=new Map();let births=0;
  for(let t=0;t<1000;t++){
   core.step(a,{});core.step(b,{});measured++;
   assert.equal(a.stage,'boss');assert(a.bullets.length<=core.CAPS.bullets);assert(a.hazards.length<=core.CAPS.hazards);assert(a.effects.length<=core.CAPS.effects);
   const fresh=a.bullets.filter(p=>Math.abs(p.age-core.FIXED_DT)<1e-8);births+=fresh.length;
   for(const p of a.bullets){assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.vx)&&Number.isFinite(p.vy));assert(Math.hypot(p.vx,p.vy)<=450,'world speed has a finite gameplay bound');if(index>=5&&p.patternId)extendedPatterns.add(p.patternId);}
   for(const h of a.hazards){
    const committed=[h.x1,h.y1,h.x2,h.y2,h.width,h.activeAt,h.fadeAt,h.expireAt];
    if(!hazards.has(h.id)){hazards.set(h.id,committed);assert(h.warningTicks>=54);assert.equal(h.activeAt-h.born,h.warningTicks);}
    assert.deepEqual(committed,hazards.get(h.id),'already announced laser endpoints and timing cannot move');
    assert.equal(h.phase,a.tick<h.activeAt?'warning':a.tick<h.fadeAt?'active':'fade');
    if(index>=5&&h.patternId)extendedPatterns.add(h.patternId);
   }
   if(t%120===0)assert.equal(sample(a),sample(b),`${index}/${phase}/${difficulty}`);
  }
  assert(births>0,`${index}/${phase}/${difficulty}: no bullet release observed`);
  assert.equal(a.stats.poolPressure,0,`${index}/${phase}/${difficulty}: pool pressure`);assert.equal(a.stats.droppedGroups,0);assert.equal(a._deferred.length,0);
 }
 assert.equal(measured,108000);
 for(const signature of core.CAMPAIGN_SIGNATURES.slice(5))assert(extendedPatterns.has(signature.id),`missing actual sin signature ${signature.id}`);
});
