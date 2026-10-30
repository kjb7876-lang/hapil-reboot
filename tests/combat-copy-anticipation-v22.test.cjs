'use strict';
// Actual core timing plus CPU source-pose inspection. Explicit no-damage phase
// observations are not human play, natural route completion or device timing.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),core=require('../src/core.js');
global.document={createElement(){return createCanvas(1,1)}};
for(const mod of ['story-assets','boss-motion','actors'])require('../src/'+mod+'.js');
const media=require('../tools/read-media-registry.cjs')();let image;
async function assets(){if(!image)image=await loadImage(path.join(root,media.bossMotionViolet));return {bossMotionViolet:image};}
function world(difficulty='hell',tick=244){let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:0,difficulty,combatRevision:21,seed:813,runId:'v22-copy-clock'});const cp=core.checkpoint(w);cp.phase=2;w=core.restoreCheckpoint(cp);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;while(w.tick<tick)core.step(w,{});return w;}
async function paint(w,copy){const a=global.HapilActors.create(await assets()),canvas=createCanvas(360,640),before=structuredClone(w);a.beginFrame();assert(a.drawCombatCopy(canvas.getContext('2d'),w,copy,.72));assert.deepEqual(w,before,'display-only anticipation never mutates combat');return {sample:a.getMetrics().lastCombatCopySamples[0],bytes:canvas.toBuffer('image/png')};}
test('repeat anticipation uses the real stable clone slot and points at actual emitted volleys in all three modes',async()=>{
 for(const difficulty of ['hell','normal','gentle']){
  const cadence=difficulty==='hell'?60:difficulty==='normal'?90:120;
  for(const slot of [0,1]){
   const shotAt=151+42+slot*18+cadence,w=world(difficulty,shotAt-1),c=w.boss.combatCopies.find(x=>x.id.endsWith('-'+slot));assert.equal(c.action,'recover','actual v21 core record stays unchanged before repeat');
   // Deliberately reorder the public projection list: the source slot lives in
   // the stable emitter id rather than its current array index.
   w.boss.combatCopies.reverse();const out=await paint(w,c);assert.equal(out.sample.originalAction,'recover');assert.equal(out.sample.presentationAction,'charge');assert.equal(out.sample.repeatCue.nextAt,shotAt);assert.equal(out.sample.repeatCue.remainingTicks,1);assert.equal(out.sample.repeatCue.active,true);assert.equal(out.sample.key,'bossMotionViolet');assert.equal(out.sample.pose,'prepare');
   w.boss.combatCopies.reverse(); // Restore the real core slot order before stepping.
   const releasedBefore=new Set(w.bullets.map(b=>b.id));core.step(w,{});assert.equal(w.tick,shotAt);assert(w.bullets.some(b=>!releasedBefore.has(b.id)&&b.sourceActorId===c.sourceActorId),'real own-source emission occurs exactly at the indicated tick');const strike=await paint(w,c);assert.equal(c.releaseTick,shotAt);assert.equal(strike.sample.pose,'downstroke');assert.equal(strike.sample.repeatCue.active,false);assert.equal(strike.sample.presentationAction,'attack');
  }
 }
});
test('repeat preparation is bounded to18ticks and stops before the core final-volley cutoff',async()=>{
 const before=world('hell',234),a=before.boss.combatCopies[0];assert.equal((await paint(before,a)).sample.repeatCue.active,false);core.step(before,{});assert.equal(before.tick,235);const start=(await paint(before,a)).sample;assert.equal(start.repeatCue.active,true);assert.equal(start.repeatCue.remainingTicks,18);
 const end=world('hell',502),c=end.boss.combatCopies[0],s=(await paint(end,c)).sample;assert.equal(s.repeatCue.active,false);assert.equal(s.repeatCue.nextAt,null);assert.equal(s.repeatCue.reason,'no-later-volley');assert.equal(c.action,'attack','core nominal clock would paint a skipped final shot');assert.equal(c.releaseTick,433,'no projectile actually released at the blocked nominal493tick');assert.equal(s.presentationAction,'recover');assert.equal(c.expireAt,511,'display does not extend six-second lifetime');
});
test('pending or capacity-blocked emissions do not promise an imminent repeat pose',async()=>{
 const w=world('hell',244),c=w.boss.combatCopies[0];w._deferred.push([{sourceActorId:c.sourceActorId}]);let s=(await paint(w,c)).sample;assert.equal(s.repeatCue.active,false);assert.equal(s.repeatCue.reason,'pending-deferred-release');assert.equal(s.presentationAction,'recover');w._deferred.length=0;
 // Explicit capacity fixture, not natural combat. A render must not hide or
 // evict bullets to make its cue possible.
 w.bullets.length=core.CAPS.bullets;s=(await paint(w,c)).sample;assert.equal(s.repeatCue.active,false);assert.equal(s.repeatCue.reason,'capacity-blocked');assert.equal(w.bullets.length,core.CAPS.bullets);
});
test('authored preparation pixels change on a repeat while actual source bytes, release and legacy records remain intact',async()=>{
 const w=world('hell',244),c=w.boss.combatCopies[0],current=await paint(w,c),legacy=structuredClone(w);delete legacy.combatRevision;const previous=await paint(legacy,legacy.boss.combatCopies[0]);assert.notDeepEqual(current.bytes,previous.bytes,'same owner source changes from recovery to actual authored preparation');assert.equal(current.sample.key,previous.sample.key);assert.equal(current.sample.pose,'prepare');assert.equal(previous.sample.pose,'recover');assert.equal(previous.sample.repeatCue,null);assert.equal(c.action,'recover');assert.equal(c.releaseTick,193);
});
