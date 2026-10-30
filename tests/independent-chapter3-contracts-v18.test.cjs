'use strict';
// Independent progression/save contract observations. Controlled lethal shots
// below select an exact safe boundary and do not count as natural progression.
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../src/core.js'),store=require('../src/storage.js')._test;
const expectedIds=['controller-army','controller-rescue','controller-veto','controller-authority','controller-migration','controller-memory-gate'];
const scenes=['u201','u202','u204','u205','u206','u203'];
const expectedSteps=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14],[15,16,17],[]];
function make(index,options={}){return core.createRun({campaign:true,campaignRevision:4,practiceBoss:true,bossIndex:index,difficulty:'normal',seed:1896,runId:'chapter3-contract',...options});}
function lethal(w){const b=w.boss;w.shots.push({id:++w.idCounter,x:b.x,y:b.y,px:b.x,py:b.y,vx:0,vy:0,r:2,age:0,ttl:1,damage:b.hp,kind:'basic',angle:-Math.PI/2});core.step(w,{});}
test('revision four follows six canonical scenes and seventeen story stages without inventing six people',()=>{
 assert.equal(core.LATEST_CAMPAIGN_REVISION,4);assert.equal(core.campaignBossCount(4),18);
 const additions=core.CAMPAIGN_BOSSES.slice(12);assert.equal(additions.length,6);
 assert.deepEqual(additions.map(b=>b.id),expectedIds);assert.deepEqual(additions.map(b=>b.sceneIds),scenes.map(s=>[s]));
 assert.deepEqual(additions.map(b=>b.storySteps),expectedSteps);assert.deepEqual(additions.flatMap(b=>b.storySteps),Array.from({length:17},(_,i)=>i+1));
 for(const [offset,b] of additions.entries()){
  assert.equal(b.chapter,3);assert.equal(b.identityGroup,'controller-system');assert.equal(b.patterns.length,3);
  const w=make(offset+12);assert.equal(w.protagonist,'의목사 B');assert.equal(w.boss.identityGroup,'controller-system');assert.equal(w.boss.linkTarget,true);assert.equal(w.boss.healthLabel,'반복 연결');
 }
 assert(!core.CAMPAIGN_BOSSES.some(b=>b.id==='cult-leader'),'separate part-eight practice is not inserted before missing chapters');
});
test('all earlier revision endpoints retain their bounds and reject overflow while revision four admits its complete safe schema',()=>{
 for(const [revision,count,phases] of [[1,3,9],[2,5,15],[3,12,36],[4,18,54]]){
  const w=core.createRun({campaign:true,campaignRevision:revision,difficulty:'normal',seed:1896,runId:'revision-schema-'+revision});
  assert.equal(w.bossCount,count);const s=core.checkpoint(w);s.bossIndex=count-1;s.stage='boss';s.phase=2;s.stats.phaseTicks=Array(phases).fill(1500);s.checkpointSerial=revision===4?106:70;
  assert.deepEqual(store.validateCheckpoint(s),s);const restored=core.restoreCheckpoint(s);assert.equal(restored.campaignRevision,revision);assert.equal(restored.bossCount,count);
  assert.equal(store.validateCheckpoint({...s,bossIndex:count}),null);assert.throws(()=>core.restoreCheckpoint({...s,bossIndex:count}));
  const bad=structuredClone(s);bad.stats.phaseTicks.push(1500);assert.equal(store.validateCheckpoint(bad),null);
  if(revision<4)assert.equal(store.validateCheckpoint({...s,checkpointSerial:101}),null);
 }
 const current=core.checkpoint(make(17));current.checkpointSerial=106;assert(store.validateCheckpoint(current));
 assert.equal(store.validateCheckpoint({...current,checkpointSerial:100000}),null);assert.equal(store.validateCheckpoint({...current,campaignRevision:99}),null);
});
test('a fresh revision-four run does not overwrite or reinterpret an old save and backup',()=>{
 const a=core.checkpoint(core.createRun({campaign:true,campaignRevision:3,difficulty:'normal',seed:188,runId:'existing-revision-three'}));
 let state=store.reduce(undefined,{type:'checkpoint',value:a},0).state;
 const b={...a,checkpointSerial:2,tick:60,score:2};state=store.reduce(state,{type:'checkpoint',value:b},state.revision).state;
 const original=structuredClone(state);const fresh=core.createRun({campaign:true,campaignRevision:4,seed:1896,runId:'new-revision-four'});
 assert.equal(fresh.bossCount,18);assert.deepEqual(state.checkpoint,original.checkpoint);assert.deepEqual(state.backup,original.backup);
 const loaded=store.normalizeState(state);assert.deepEqual(loaded.checkpoint,original.checkpoint);assert.deepEqual(loaded.backup,original.backup);
 for(const s of [loaded.checkpoint,loaded.backup]){const w=core.restoreCheckpoint(s);assert.equal(w.bossCount,12);assert.equal(w.campaignRevision,3);}
});
test('the memory-gate conclusion disconnects repetition and keeps the memory and gate',()=>{
 const w=make(17),s=core.checkpoint(w);s.phase=2;s.practiceBoss=false;
 const restored=core.restoreCheckpoint(s);restored.autoAttack=false;restored.skillRotation=false;lethal(restored);
 assert.equal(restored.stage,'won');assert(restored.events.some(e=>e.type==='disconnect'));assert(!restored.events.some(e=>e.type==='kill'));
 assert.match(restored.resultReason,/기억/);assert.match(restored.resultReason,/(반복|되감는 연결)/);assert(!/기억의 문을 파괴|기억을 파괴|기억을 지워|통제자를 처형/.test(restored.resultReason));
});

test('every retained chapter-three runtime image is byte-identical to a documented authorized source',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),root=path.join(__dirname,'..');
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'docs/CHAPTER3-SOURCE-DISCOVERY-20261030.json'),'utf8'));
 assert.equal(provenance.canonicalSource.sha256,'e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa');assert.equal(provenance.sourceRepository.readOnly,true);
 const documented=new Map();function visit(value){if(value&&typeof value==='object'){if(value.sha256&&value.dimensions)documented.set(value.sha256,value);for(const child of Object.values(value))visit(child);}}visit(provenance);
 const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/media.js'),'utf8'),scope);
 const entries=Object.entries(scope.window.HapilMedia).filter(([key])=>key.startsWith('chapter3'));assert.equal(entries.length,19);assert.equal(new Set(entries.map(([,file])=>file)).size,19);
 for(const [key,file] of entries){
  const bytes=fs.readFileSync(path.join(root,file)),hash=crypto.createHash('sha256').update(bytes).digest('hex'),source=documented.get(hash);assert(source,`${key} is absent from the source manifest`);assert.equal(bytes.length,source.bytes,key);assert.equal(source.decoded,true,key);assert.equal(source.pixelsInspected,true,key);
 }
 assert.deepEqual(fs.readdirSync(path.join(root,'media/chapter3-v18')).sort(),entries.map(([,file])=>path.basename(file)).sort(),'no extra untraced runtime image');
});
