'use strict';
// Controlled source/phase and timing tests. Explicit immunity/HP fixtures below
// are not the independent ordinary-health route replay used for playability.
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const scenes=['last305','last301','last303','kair01','kair05','kair06','kair07','kair08','kair09','kair10','kair02','kair03','hando03','murder03','cult01','cult03','cult04'];
function phaseRun(index,phase=2,difficulty='normal',practice=true){const w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'story-v19-test'}),cp=core.checkpoint(w);cp.phase=phase;cp.practiceBoss=practice;return core.restoreCheckpoint(cp);}
function hold(w){w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function endPhase(w){w.boss.hp=1;w.player.invulnerableUntil=999999;for(let n=0;n<180&&w.stage==='boss';n++)core.step(w,{});assert.notEqual(w.stage,'boss');return w;}
function advance(w,n){for(let t=0;t<n;t++)core.step(w,{});return w;}

test('revision five has17 canonical configurations and does not widen old route endpoints or saves',()=>{
 assert.equal(core.CAMPAIGN_REVISION,3);assert.equal(core.LATEST_CAMPAIGN_REVISION,5);assert.equal(core.createRun({campaign:true}).campaignRevision,3);
 assert.deepEqual([1,2,3,4,5].map(core.campaignBossCount),[3,5,12,18,35]);
 assert.deepEqual(core.CAMPAIGN_BOSSES.slice(18).map(x=>x.sceneIds[0]),scenes);
 for(let i=18;i<35;i++){const info=core.CAMPAIGN_BOSSES[i];assert.equal(info.waves.length,3);assert.equal(info.routeNotes.length,3);assert.equal(info.hp.length,3);assert(info.objective&&info.healthLabel);assert.equal(phaseRun(i).protagonist,info.protagonist);assert.throws(()=>core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:i}));}
 const s=core.checkpoint(core.createRun({campaign:true,campaignRevision:5}));s.checkpointSerial=208;s.stats.phaseTicks=Array(105).fill(1000);assert(store.validateCheckpoint(s));assert.equal(core.restoreCheckpoint(s).checkpointSerial,208);s.checkpointSerial=209;assert.equal(store.validateCheckpoint(s),null);assert.throws(()=>core.restoreCheckpoint(s));s.checkpointSerial=208;s.stats.phaseTicks.push(1000);assert.equal(store.validateCheckpoint(s),null);assert.throws(()=>core.restoreCheckpoint(s));
 const old=core.checkpoint(core.createRun({campaign:true,campaignRevision:4}));old.checkpointSerial=107;assert.equal(store.validateCheckpoint(old),null);assert.throws(()=>core.restoreCheckpoint(old));old.checkpointSerial=106;old.stats.phaseTicks=Array(55).fill(1000);assert.equal(store.validateCheckpoint(old),null);assert.throws(()=>core.restoreCheckpoint(old));
});

test('scripted fallen-knight defeat continues the living route and Arbelia is freed rather than killed',()=>{
 const old=core.checkpoint(core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:17}));old.phase=2;old.practiceBoss=false;const endpoint=core.restoreCheckpoint(old);endPhase(endpoint);assert.equal(endpoint.stage,'won');
 const gate=phaseRun(17,2,'normal',false);endPhase(gate);assert.equal(gate.nextEncounter,18);assert.match(gate.transitionNarrative.join(' '),/세 잔/);assert.match(gate.transitionNarrative.join(' '),/둘 중 어느 한쪽도 지워지지/);
 const fallen=endPhase(phaseRun(19,2,'normal',false));assert.equal(fallen.stage,'transition');assert.equal(fallen.nextEncounter,20);assert.equal(fallen.storyOutcome,'defeated-and-fell');assert(fallen.events.some(e=>e.type==='story-fall'));assert(!fallen.events.some(e=>e.type==='win'||e.type==='lose'));assert.match(fallen.transitionNarrative.join(' '),/승리로 끝나지/);assert(fallen.player.hp>0);
 const arbelia=endPhase(phaseRun(28,2,'normal',false));assert.equal(arbelia.stage,'transition');assert.equal(arbelia.arbeliaFreed,true);assert.equal(arbelia.storyOutcome,'arbelia-self-rewrites');assert(arbelia.events.some(e=>e.type==='release'));assert.match(arbelia.transitionNarrative.join(' '),/자신의 지시를 넣지 않고 기다린다/);assert(!arbelia.effects.some(e=>e.kind==='kill'));
});

test('all17 real signatures commit source-owned geometry, remain bounded and have distinct mechanical traces',()=>{
 const distinct=new Set();
 for(let index=18;index<35;index++)for(const difficulty of ['normal','gentle','hell']){
  const a=hold(phaseRun(index,2,difficulty)),b=hold(core.restoreCheckpoint(core.checkpoint(a))),samples=[];let sawRay=false,sawBullet=false,max=0;
  for(let t=0;t<1440;t++){
   const input={dx:Math.sin(t*.017),dy:0,focus:true};core.step(a,input);core.step(b,input);
   if(t%120===0)assert.deepEqual({player:a.player,rng:a.rngState,bullets:a.bullets,hazards:a.hazards},{player:b.player,rng:b.rngState,bullets:b.bullets,hazards:b.hazards});
   max=Math.max(max,a.bullets.length);sawRay ||=a.hazards.some(h=>h.phase==='active');sawBullet ||=a.bullets.length>0;
   for(const bullet of a.bullets)assert.equal(bullet.patternId,core.CAMPAIGN_SIGNATURES[index].id);
   if(difficulty==='normal'&&[72,145,180,241,300,480,720].includes(t))samples.push({bullets:a.bullets.map(x=>[x.kind,...[x.x,x.y,x.vx,x.vy].map(n=>Math.round(n))]),rays:a.hazards.map(x=>[x.phase,...[x.x1,x.y1,x.x2,x.y2,x.width].map(Math.round)])});
  }
  assert.equal(a.stage,'boss');assert(sawRay,'no real active laser '+index);assert(sawBullet,'no source projectiles '+index);assert(max<=300,'unbounded density '+index+': '+max);assert.equal(a.stats.poolPressure,0);assert.equal(a.stats.droppedGroups,0);assert.equal(a.enemies.length,0,'another chapter ordinary actor must not substitute');
  if(difficulty==='normal')distinct.add(crypto.createHash('sha256').update(JSON.stringify(samples)).digest('hex'));
 }
 assert.equal(distinct.size,17,'changing only labels/colors is not a distinct signature');
});

test('six fallen echoes aim at already sampled positions and release on their committed activation tick',()=>{
 const w=hold(phaseRun(19));advance(w,73);assert.equal(w.boss.shadowCopies.length,6);assert(w.boss.shadowCopies.every(p=>p.warningAt===73&&p.activeAt===169&&p.releaseTick===-1));const originals=w.hazards.map(h=>[h.sourceActorId,h.x1,h.y1,h.x2,h.y2]);assert(originals.length>0);
 for(let t=0;t<95;t++){core.step(w,{dx:4});assert.deepEqual(w.hazards.map(h=>[h.sourceActorId,h.x1,h.y1,h.x2,h.y2]),originals);}
 assert(w.hazards.every(h=>h.phase==='warning'));core.step(w,{});assert(w.hazards.every(h=>h.phase==='active'));for(const h of w.hazards){const copy=w.boss.shadowCopies.find(p=>p.id===h.sourceActorId);assert(copy);assert.equal(copy.releaseTick,169);}assert.deepEqual(w.boss.skillReleases.filter(r=>r.tick===169).map(r=>r.sourceActorId).sort(),w.hazards.map(h=>h.sourceActorId).sort());
});

test('two cult guardians keep independent real origins/charge/release while only a shared circuit is targetable',()=>{
 const w=hold(phaseRun(33)),seen=new Set();advance(w,109);assert.equal(w.boss.participants.length,2);assert.equal(w.boss.x,180);assert.equal(w.boss.y,182);assert.equal(w.boss.healthLabel,'합일 회로');assert.deepEqual(w.boss.participants.map(p=>p.id),['han-rian','baek-ion']);
 for(let t=0;t<240;t++){core.step(w,{});w.bullets.forEach(b=>{if(b.sourceActorId)seen.add(b.sourceActorId)});(w.boss.skillReleases||[]).forEach(r=>{if(r.sourceActorId)seen.add(r.sourceActorId)});}
 assert.deepEqual([...seen].sort(),['baek-ion','han-rian']);assert(w.boss.participants.every(p=>p.releaseTick>0));assert.equal(w.enemies.length,0);
});

test('six academy invasion beats are observed without a shootable friendly core or borrowed support actor',()=>{
 const w=core.createRun({campaign:true,campaignRevision:5,seed:813});w.bossIndex=21;w.autoAttack=false;w.player.invulnerableUntil=999999;
 const cp=core.checkpoint(w);cp.bossIndex=21;const a=core.restoreCheckpoint(cp);a.autoAttack=false;a.player.invulnerableUntil=999999;let ticks=0;while(a.stage==='waves'&&ticks++<6000)core.step(a,{});assert.equal(a.stage,'bossIntro');assert.deepEqual(a.events.filter(e=>e.type==='defense-wave').map(e=>e.name),['침공 1 / 6','침공 2 / 6','침공 3 / 6','침공 4 / 6','침공 5 / 6','침공 6 / 6']);assert.equal(a.enemies.length,0);assert(core.CAMPAIGN_BOSSES[21].protectedTargets.includes('friendly-core'));
});

test('Siren compression provides Arbelia motion relief without locking or reversing player input',()=>{
 const w=hold(phaseRun(29));advance(w,217);assert.equal(w.arbeliaSlowUntil,289);assert(w.events.some(e=>e.type==='kairos-window'));
 const oldX=w.player.x;core.step(w,{dx:4});assert.equal(w.player.x-oldX,4);const bullet=w.bullets.find(b=>!b.pauseUntil&&!b.weaponMotion);assert(bullet);assert(Math.abs((bullet.x-bullet.px)-bullet.vx/60*.55)<1e-8);assert(Math.abs((bullet.y-bullet.py)-bullet.vy/60*.55)<1e-8);
});

test('final awakening happens before death and ending separates coercion while leaving the core and selves intact',()=>{
 const first=endPhase(phaseRun(34,0,'normal',false));assert.equal(first.stage,'transition');assert.equal(first.nextPhase,1);assert.match(first.transitionNarrative.join(' '),/코어가 검은 신경선/);assert(!first.samongAwakened);
 const second=endPhase(phaseRun(34,1,'normal',false));assert.equal(second.nextPhase,2);assert.equal(second.transitionMinimum,16);assert.match(second.transitionNarrative.join(' '),/아직 살아 있다/);assert.match(second.transitionNarrative.join(' '),/세쌍둥이/);second.player.hp=1;advance(second,960);assert.equal(second.stage,'boss');assert.equal(second.phase,2);assert.equal(second.samongAwakened,true);assert.equal(second.player.hp,second.player.maxHp);assert(second.events.some(e=>e.type==='awakening'));assert(second.player.egoUntil>second.tick);
 const last=endPhase(phaseRun(34,2,'normal',false));assert.equal(last.stage,'won');assert.equal(last.coreIntact,true);assert.equal(last.forcedCommandsSeparated,true);assert.equal(last.guardianRole,'몽세수호자');assert.match(last.resultReason,/코어는 파괴하지 않고/);assert.match(last.endingNarrative.join(' '),/대신 정하지/);
});
