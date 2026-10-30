'use strict';
// Independent app wiring, failed loads, route/retry/save isolation. Real core
// and asset contract data with DOM/Image fixtures, not browser or device play.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),{harness,boot,advance,practice}=require('./helpers/story-app-fixture-v19.cjs');
test('all new story practice selections start the intended revision-five encounter with own mandatory sources and bounded image requests',async()=>{
 const probe=harness();await boot(probe);const groups=Array.from(probe.g.HapilStoryAssets.entries,e=>e.group);assert.deepEqual(groups,Array.from({length:17},(_,i)=>i+19));
 for(const group of groups){const h=harness();await boot(h);await practice(h,group);const w=h.world();assert.equal(w.campaignRevision,5);assert.equal(w.bossIndex,group-1);assert.equal(w.boss.kind,core.CAMPAIGN_BOSSES[group-1].id);assert.equal(!!w.finalPractice,false);assert.equal(w.practiceBoss,true);assert(w.tick>0);assert.equal(h.g.HapilApp.getState().mode,'playing');assert(h.peak<=2);
  const own=h.g.HapilStoryAssets.assetKeysForEncounter(group);assert(own.length>=4,'actual own body/map/projectile sources required');for(const key of own)assert(h.requests.includes(h.g.HapilMedia[key]),`${group} misses ${key}`);
  assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
  // Controlled loss is for navigation only; no natural-progression claim.
  w.stage='lost';await advance(h);h.el('practice-select').value='0';h.click('retry-button');await advance(h);assert.equal(h.world().campaignRevision,5);assert.equal(h.world().bossIndex,group-1);assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
 }
});
test('revision-four continue and retry keep the historical memory-gate endpoint instead of upgrading an existing save',async()=>{
 const old=core.createRun({campaign:true,campaignRevision:4,difficulty:'normal',seed:813,runId:'historical-four'}),snap=core.checkpoint(old),bytes=JSON.stringify(snap),h=harness({checkpoint:snap});await boot(h);h.click('continue-button');await advance(h);assert.equal(h.world().campaignRevision,4);assert.equal(h.world().bossCount,18);assert.equal(h.world().runId,snap.runId);assert.equal(JSON.stringify(snap),bytes);assert.equal(h.g.HapilApp.getState().mode,'paused');
 h.click('resume-button');await advance(h);h.world().stage='lost';await advance(h);h.click('retry-button');await advance(h);assert.equal(h.world().campaignRevision,4);assert.equal(h.world().bossCount,18);assert.equal(h.world().practiceBoss,false);
});
test('every new required source fails closed before tick one if unavailable or dimensionally malformed',async()=>{
 const probe=harness();await boot(probe);let cases=0;
 for(let group=19;group<=35;group++){const keys=probe.g.HapilStoryAssets.assetKeysForEncounter(group);assert(keys.length>=4);for(const key of keys)for(const failure of ['fail','malformed']){const url=probe.g.HapilMedia[key];assert(url,`${group}:${key} registered`);const h=harness({[failure]:url});await boot(h);await practice(h,group);assert.equal(h.g.HapilApp.getState().mode,'error',`${failure}:${group}:${key}`);assert.equal(h.world().tick,0,`${failure}:${group}:${key}`);assert.equal(h.saveCalls.length,0);cases++;}}
 assert(cases>=136,'at least body/map/two own damage sources per new encounter, each unavailable/malformed');
});
test('the special-pattern shortcut reaches phase three for all36 selections, preserves retry identity and never writes campaign data',async()=>{
 for(let group=0;group<=35;group++){
  const h=harness();assert.equal(h.el('special-practice-button').disabled,true,'boot must finish before opening a source-backed special pattern');h.click('special-practice-button');assert.equal(h.world(),undefined);await boot(h);assert.equal(h.el('special-practice-button').disabled,false);
  h.el('practice-select').value=String(group);h.click('special-practice-button');await advance(h);const w=h.world(),index=group===12?11:group>=13?group-1:group,revision=group>=19?5:group>=13?4:3;
  assert.equal(h.g.HapilApp.getState().mode,'playing',`special selector ${group}: ${h.el('error-description').textContent}`);assert(w.tick>0);assert.equal(w.bossIndex,index);assert.equal(w.campaignRevision,revision);assert.equal(w.phase,2);assert.equal(w.practiceStartPhase,2);assert.equal(w.practiceBoss,true);assert.equal(!!w.finalPractice,group===12);assert(w.boss.specialPatternLabel||group===12,'the selected phase exposes its special-pattern identity');assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
  w.stage='lost';await advance(h);h.el('practice-select').value=String((group+1)%36);h.click('retry-button');await advance(h);assert.equal(h.world().bossIndex,index);assert.equal(h.world().campaignRevision,revision);assert.equal(h.world().phase,2);assert.equal(h.world().practiceStartPhase,2);assert.equal(!!h.world().finalPractice,group===12);assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
 }
});
test('ordinary historical practice still waits for every newly required natural body and starts phase one',async()=>{
 for(let group=0;group<12;group++){const h=harness();await boot(h);await practice(h,group);assert.equal(h.g.HapilApp.getState().mode,'playing',`historical${group}: ${h.el('error-description').textContent}`);assert.equal(h.world().phase,0);assert.equal(h.world().practiceStartPhase,0);assert(h.world().tick>0);const required=h.g.HapilProjectiles.assetKeysForEncounter(group).filter(k=>!h.g.HapilProjectiles.optionalAssetKeysForEncounter(group).includes(k));for(const key of required)assert(h.requests.includes(h.g.HapilMedia[key]),`newly required natural body ${group}:${key}`);assert.equal(h.saveCalls.length,0);}
});
test('the actual final-engine ending is reachable in eight ordered pages without writing extra progress, and practice hides ending navigation',async()=>{
 // Controlled final-boundary navigation fixture, distinct from natural replays.
 const initial=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:34,difficulty:'normal',seed:813,runId:'ending-pagination-fixture'}),snapshot=core.checkpoint(initial);snapshot.practiceBoss=false;snapshot.phase=2;snapshot.autoAttack=false;snapshot.skillRotation=false;
 const h=harness({checkpoint:snapshot});await boot(h);h.click('continue-button');await advance(h);h.click('resume-button');await advance(h);const w=h.world(),b=w.boss;
 w.shots.push({id:++w.idCounter,x:b.x,y:b.y,px:b.x,py:b.y,vx:0,vy:0,r:2,age:0,ttl:1,damage:b.hp,kind:'basic',angle:-Math.PI/2});core.step(w,{});assert.equal(w.stage,'won');assert.equal(w.endingNarrative.length,8);assert.equal(w.coreIntact,true);await advance(h);
 assert.equal(h.g.HapilApp.getState().mode,'result');assert.equal(h.el('ending-nav').hidden,false);assert.equal(h.el('ending-prev').disabled,true);const counts=[h.saveCalls.length,h.completeCalls.length];assert.equal(counts[1],1,'campaign completion is still finalized once');
 for(let page=0;page<8;page++){assert.equal(h.el('result-description').textContent,w.endingNarrative[page]);assert.equal(h.el('ending-progress').textContent,`${page+1} / 8`);assert.equal(h.el('ending-next').disabled,page===7);if(page<7)h.click('ending-next');}
 assert.match(w.endingNarrative[6],/J 인장/);assert.match(h.el('result-description').textContent,/合一夢世/);h.click('ending-next');assert.equal(h.el('ending-progress').textContent,'8 / 8','extra click cannot leave the ending');
 for(let page=6;page>=0;page--){h.click('ending-prev');assert.equal(h.el('result-description').textContent,w.endingNarrative[page]);}assert.equal(h.el('ending-prev').disabled,true);h.click('ending-prev');assert.equal(h.el('ending-progress').textContent,'1 / 8');assert.deepEqual([h.saveCalls.length,h.completeCalls.length],counts,'reading pages cannot create progress or finalization writes');
 h.click('result-home-button');await practice(h,35);h.world().stage='won';await advance(h);assert.equal(h.el('ending-nav').hidden,true);assert.deepEqual([h.saveCalls.length,h.completeCalls.length],counts,'the subsequent final-boss practice cannot write the campaign');
});
