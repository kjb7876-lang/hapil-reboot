'use strict';
// Actual core clocks and CPU source pixels. These fixtures disable player
// damage/attacks; they do not claim natural completion or device performance.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const ROOT=path.resolve(__dirname,'..'),core=require('../src/core.js');
global.document={createElement(){return createCanvas(1,1);}};
for(const name of ['story-assets','boss-motion','actors'])require('../src/'+name+'.js');
const Actors=global.HapilActors,media=require('../tools/read-media-registry.cjs')(),loaded={};
async function images(index){
  const keys=index===0?['bossMotionViolet']:index===8?Actors.sinAssetKeysForEncounter(8):['storyRianIdle','storyRianAttack','storyIonIdle','storyIonAttack'];
  const out={};for(const key of keys){if(!loaded[key])loaded[key]=await loadImage(path.join(ROOT,media[key]));out[key]=loaded[key];}return out;
}
function world(index=0,difficulty='normal',tick=200,revision=25){
  const w=core.createRun({campaign:true,campaignRevision:5,combatRevision:revision,practiceBoss:true,bossIndex:index,difficulty,seed:4242,runId:'committed-copy-pose'});
  w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;while(w.tick<tick)core.step(w,{});return w;
}
async function paint(w,c,factory=Actors){
  const actor=factory.create(await images(w.bossIndex)),canvas=createCanvas(360,640),before=structuredClone(w),copyBefore=structuredClone(c);
  actor.beginFrame();assert(actor.drawCombatCopy(canvas.getContext('2d'),w,c,.72));
  assert.deepEqual(w,before,'render must not alter simulation, plans, timing or pool records');assert.deepEqual(c,copyBefore);
  return {sample:actor.getMetrics().lastCombatCopySamples[0],pixels:Buffer.from(canvas.getContext('2d').getImageData(0,0,360,640).data)};
}
const clone=(w,slot)=>w.boss.combatCopies.find(c=>c.kind==='clone'&&c.id.endsWith('-'+slot));

test('the real filtered final clone at normal seed4242 tick493 shows recovery instead of a phantom strike',async()=>{
  const w=world(0,'normal',493),c=clone(w,0);assert.equal(c.action,'attack');assert.equal(c.releaseTick,-1);
  assert(!(w.boss.identityCasts||[]).some(p=>p.sourceActorId===c.sourceActorId));
  const result=await paint(w,c);assert.equal(result.sample.originalAction,'attack');assert.equal(result.sample.presentationAction,'recover');assert.equal(result.sample.pose,'recover');assert.equal(result.sample.repeatCue.active,false);assert.equal(result.sample.repeatCue.reason,'no-committed-volley');
});

test('all modes prepare only inside their real admitted54tick cast and strike only after successful emission',async()=>{
  for(const difficulty of ['normal','gentle','hell']){
    const w=world(0,difficulty,186),c=clone(w,1);assert.equal((await paint(w,c)).sample.presentationAction,'recover','initial nominal windup has no admitted cast yet');
    core.step(w,{});let sample=(await paint(w,c)).sample;assert.equal(w.tick,187);assert.equal(sample.presentationAction,'charge');assert.equal(sample.repeatCue.nextAt,241);assert.equal(sample.repeatCue.windowTicks,54);assert.equal(sample.repeatCue.remainingTicks,54);assert(sample.repeatCue.active);
    while(w.tick<240)core.step(w,{});sample=(await paint(w,c)).sample;assert.equal(sample.pose,'prepare');assert.equal(sample.repeatCue.remainingTicks,1);
    const ids=new Set(w.bullets.map(b=>b.id));core.step(w,{});assert.equal(c.releaseTick,241);assert(w.bullets.some(b=>!ids.has(b.id)&&b.sourceActorId===c.sourceActorId));
    sample=(await paint(w,c)).sample;assert.equal(sample.presentationAction,'attack');assert.equal(sample.pose,'downstroke');assert.equal(sample.repeatCue.reason,'actual-release-pose');assert.equal(sample.repeatCue.active,false);
    while(w.tick<253)core.step(w,{});sample=(await paint(w,c)).sample;assert.equal(sample.presentationAction,'recover');assert.equal(sample.pose,'follow');assert.equal(sample.repeatCue.reason,'actual-release-recovery');
    while(w.tick<262)core.step(w,{});sample=(await paint(w,c)).sample;assert.equal(sample.presentationAction,difficulty==='hell'?'charge':'recover','a later real warning resumes only after the21tick release/follow window');
  }
});

test('cancelled, future, stale-phase and another emitter cast cannot drive a clone pose',async()=>{
  const w=world(),c=clone(w,1),original=w.boss.identityCasts.find(p=>p.sourceActorId===c.sourceActorId);assert(original);
  for(const patch of [{cancelled:true},{warningAt:w.tick+1},{sourcePhase:1},{sourceActorId:'another-copy'}]){
    w.boss.identityCasts=[{...original,...patch}];const s=(await paint(w,c)).sample;assert.equal(s.presentationAction,'recover');assert.equal(s.repeatCue.active,false);
  }
  w.boss.identityCasts=[original];const other=clone(w,0),s=(await paint(w,other)).sample;assert.equal(s.presentationAction,'recover','the unfiltered companion cast does not animate a filtered emitter');
  // Cancellation at the committed release boundary must not leave a nominal
  // attack after all live warnings have been removed.
  w.tick=original.activeAt;c.action='attack';w.boss.identityCasts=[{...original,cancelled:true}];assert.equal((await paint(w,c)).sample.presentationAction,'recover');
});

test('paired clones keep model ownership while only the matching admitted source prepares and releases',async()=>{
  const w=world(33,'hell',200),rian=clone(w,0),ion=clone(w,1),cast=w.boss.identityCasts.find(p=>p.sourceActorId===rian.sourceActorId);assert(cast);assert.equal(cast.modelActorId,'han-rian');
  w.boss.combatCopies.reverse();let s=(await paint(w,rian)).sample;assert.equal(s.presentationAction,'charge');assert.equal(s.modelActorId,'han-rian');assert.equal(s.key,'storyRianIdle');
  s=(await paint(w,ion)).sample;assert.equal(s.presentationAction,'recover');assert.equal(s.modelActorId,'baek-ion');assert.equal(s.key,'storyIonIdle');
  const original=w.boss.identityCasts;w.boss.identityCasts=[{...cast,modelActorId:'baek-ion'}];assert.equal((await paint(w,rian)).sample.presentationAction,'recover','a wrong model with the same emitter cannot borrow its partner pose');w.boss.identityCasts=original;
  w.boss.combatCopies.reverse();while(w.tick<223)core.step(w,{});assert.equal(rian.releaseTick,223);s=(await paint(w,rian)).sample;assert.equal(s.key,'storyRianAttack');assert.equal(s.presentationAction,'attack');assert.equal(s.pose,'release');
});

test('legacy21 and the25Lust reference keep byte-identical copy pixels and presentation records',async()=>{
  const box={HapilStoryAssets:global.HapilStoryAssets,HapilBossMotion:global.HapilBossMotion,document:global.document};
  vm.runInNewContext(cp.execFileSync('git',['show','1beed909dfb7217f3b3eda98314dc539d0e3918e:src/actors.js'],{cwd:ROOT,encoding:'utf8'}),box);
  for(const [index,revision]of [[0,21],[8,25]])for(const difficulty of ['normal','gentle','hell'])for(const tick of [186,200,240,241,493]){
    const w=world(index,difficulty,tick,revision);for(const c of w.boss.combatCopies){const current=await paint(w,c),baseline=await paint(w,c,box.HapilActors);assert(current.pixels.equals(baseline.pixels),`${index}/${revision}/${difficulty}/${tick}/${c.id} pixels changed`);assert.equal(JSON.stringify(current.sample),JSON.stringify(baseline.sample));}
  }
});
