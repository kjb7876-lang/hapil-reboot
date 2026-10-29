'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(options={}){
 let now=100,raf,run=0,inputs=[],saveCalls=[],completionCalls=[],settingsCalls=[],pending=[],completionPending=[];
 const elements=new Map();
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id)}
 const document={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const stored={runId:'old',checkpointSerial:4},state={checkpoint:stored};
 const store={status:{persistent:true,message:'ok'},open:async()=>options.openFailure?({ok:false,reason:'storage-error'}):({ok:true}),load:async()=>options.bootReadFailure?({ok:false,reason:'storage-error'}):({settings:{quality:'high'},checkpoint:state.checkpoint,profile:{},hasStoredState:options.hasStoredState}),peek:async()=>({checkpoint:state.checkpoint,profile:{}}),saveSettings:async value=>(settingsCalls.push({...value}),{ok:true}),saveCheckpoint(s){saveCalls.push(s);return new Promise(resolve=>pending.push(result=>{if(result&&result.ok)state.checkpoint=s;resolve(result)}))},completeRun(s){completionCalls.push(s);function apply(result){if(result&&result.ok&&state.checkpoint&&state.checkpoint.runId===s.runId){state.checkpoint=s.won?null:{...state.checkpoint,runId:s.runId+'-retry'};}return result;}if(options.deferredComplete)return new Promise(resolve=>completionPending.push(result=>resolve(apply(result))));return Promise.resolve(apply({ok:true}))}};
 let live;
 const core={createRun(opts){live={runId:'run'+ ++run,checkpointSerial:1,tick:0,stage:'waves',campaign:true,bossIndex:0,practiceBoss:opts.practiceBoss,difficulty:'normal',player:{x:0,y:0,hp:3,maxHp:3,r:2},events:[],skills:{},bullets:[],shots:[],enemies:[],effects:[],hazards:[],stats:{}};return live},checkpoint:w=>({runId:w.runId,checkpointSerial:w.checkpointSerial,tick:w.tick}),step(w,input){inputs.push(input);w.tick++},restoreCheckpoint(s){return {runId:s.runId,checkpointSerial:s.checkpointSerial,tick:0,stage:'waves',campaign:true,bossIndex:0,practiceBoss:false,player:{x:0,y:0,hp:3,maxHp:3,r:2},events:[],skills:{},bullets:[],shots:[],enemies:[],effects:[],hazards:[],stats:{}}}};
 const actorContracts={},motionContracts={},media={};
 for(const name of ['spider','swamp','ember','echo','vial','guard','denial']){
  const poses={};for(const stateName of ['idle','walk','attack','hit']){const key='actor'+name[0].toUpperCase()+name.slice(1)+stateName[0].toUpperCase()+stateName.slice(1);poses[stateName]={key,width:64,height:64};media[key]=key;}actorContracts[name]={poses};
 }
 for(const name of ['violet','horn','balrog','mask','lucifer']){const key='bossMotion'+name[0].toUpperCase()+name.slice(1);motionContracts[name]={key,width:512,height:512};media[key]=key;}
 media.fxWindArrow8V6='fxWindArrow8V6';if(options.omitActorKey)delete media[options.omitActorKey];
 if(options.pendingOptional||options.failedOptional)media.fxOptionalFixture='fxOptionalFixture';
 const projectiles=options.missingProjectileModule?undefined:{create:()=>({}),assetKeysForEncounter:()=>(options.pendingOptional||options.failedOptional)?['fxOptionalFixture']:[],optionalAssetKeysForEncounter:()=>(options.pendingOptional||options.failedOptional)?['fxOptionalFixture']:[],invalidAssetForEncounter:()=>null};
 const global={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:core,HapilStore:store,HapilMedia:media,HapilActors:{contracts:actorContracts},HapilBossMotion:{contracts:motionContracts},HapilProjectiles:projectiles,HapilRenderer:{create:()=>({resize(){},draw(){}})}};
 class FakeImage {set src(value){if(!value)return;if(value==='fxOptionalFixture'&&options.pendingOptional)return;if(value==='fxOptionalFixture'&&options.failedOptional){Promise.resolve().then(()=>{if(this.onerror)this.onerror()});return;}this.complete=true;this.naturalWidth=value==='fxWindArrow8V6'?1024:value.startsWith('bossMotion')?512:64;this.naturalHeight=value==='fxWindArrow8V6'?512:this.naturalWidth;if(value===options.malformedActorKey)this.naturalHeight--;Promise.resolve().then(()=>{if(this.onload)this.onload()});}}
 const context={window:global,document,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},console,Image:FakeImage,Audio:function(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/app.js'),'utf8'),context);
 function click(id){el(id).listeners.click.call(el(id),{preventDefault(){}})}
 function tick(ms=20){now+=ms;raf(now)}
 function ptr(type,x,y){el('touch-pad').listeners[type]({type,pointerId:1,button:0,clientX:x,clientY:y,currentTarget:el('touch-pad'),preventDefault(){}})}
 return {global,el,click,tick,ptr,inputs,saveCalls,completionCalls,settingsCalls,pending,completionPending,live:()=>live,stored,state,store};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('mobile remembers chosen FPS; practice does not touch campaign checkpoint or result',async()=>{
 const h=harness();await flush();assert.equal(h.global.HapilApp.getState().settings.quality,'high');h.click('practice-button');assert.equal(h.saveCalls.length,0);h.live().stage='won';h.tick();await flush();assert.equal(h.completionCalls.length,0);h.click('result-home-button');assert.equal(h.el('continue-button').hidden,false);
});
test('failed checkpoint retries, and a delayed previous run cannot update the new run UI',async()=>{
 const h=harness();await flush();h.click('start-button');assert.equal(h.saveCalls.length,1);h.pending.shift()({ok:false});await flush();for(let i=0;i<105;i++)h.tick(20);assert.equal(h.saveCalls.length,2);h.click('start-button');assert.equal(h.saveCalls.length,3);h.pending.shift()({ok:true});await flush();h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run1');h.pending.shift()({ok:true});await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run1');
});
test('short touch drag survives release until a simulation step consumes it',async()=>{
 const h=harness();await flush();h.click('practice-button');h.ptr('pointerdown',0,0);h.ptr('pointermove',10,0);h.ptr('pointerup',10,0);assert.ok(h.global.HapilApp.getState().pointer.pendingX>0);h.tick(20);assert.ok(h.inputs.some(x=>x.dx>0));
});

test('fresh mobile defaults to 30 FPS and persists it; an existing 60 FPS preference stays selected',async()=>{
 const fresh=harness({hasStoredState:false});await flush();assert.equal(fresh.global.HapilApp.getState().settings.quality,'low');assert.equal(fresh.settingsCalls.length,1);assert.equal(fresh.settingsCalls[0].quality,'low');
 const existing=harness({hasStoredState:true});await flush();assert.equal(existing.global.HapilApp.getState().settings.quality,'high');assert.equal(existing.settingsCalls.length,0);
});
test('successful in-flight save updates continue after returning home',async()=>{
 const h=harness();await flush();h.click('start-button');h.click('home-button');h.pending.shift()({ok:true});await flush();h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run1');
});

// The finger remains down after a rapid drag; every small simulation step must
// retain the rest instead of discarding it after 50 ms. CPU event fixture.
test('held touch drag is consumed at bounded speed even when the finger stops',async()=>{
 const h=harness();await flush();h.click('practice-button');h.ptr('pointerdown',0,0);h.ptr('pointermove',20,0);
 for(let i=0;i<8;i++)h.tick(20);
 const total=h.inputs.reduce((sum,input)=>sum+input.dx,0);
 assert(Math.abs(total-20)<1e-8,`expected 20px of movement, got ${total}`);
 assert(h.inputs.every(input=>Math.hypot(input.dx,input.dy)<=4+1e-8));
 assert.equal(h.global.HapilApp.getState().pointer.pendingX,0);
});
test('pausing a held drag clears remaining input rather than moving after resume',async()=>{
 const h=harness();await flush();h.click('practice-button');h.ptr('pointerdown',0,0);h.ptr('pointermove',40,0);h.tick(20);
 assert(h.global.HapilApp.getState().pointer.pendingX>0);h.global.HapilApp.pause();
 assert.equal(h.global.HapilApp.getState().pointer.pendingX,0);h.global.HapilApp.resume();
 const before=h.inputs.length;h.tick(20);h.tick(20);assert(h.inputs.slice(before).every(input=>input.dx===0&&input.dy===0));
});


test('campaign loss reloads the confirmed retry checkpoint, while a win removes continue',async()=>{
 for(const won of [false,true]){
  const h=harness();await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
  h.live().stage=won?'won':'lost';h.tick(20);await flush();
  assert.equal(h.completionCalls.length,1);assert.equal(h.completionCalls[0].won,won);
  h.click('result-home-button');assert.equal(h.el('continue-button').hidden,won);
  if(!won){h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run1-retry');}
 }
});
test('practice loss leaves the confirmed campaign checkpoint untouched',async()=>{
 const h=harness();await flush();h.click('practice-button');h.live().stage='lost';h.tick(20);await flush();
 assert.equal(h.completionCalls.length,0);h.click('result-home-button');h.click('continue-button');await flush();
 assert.equal(h.global.HapilApp.getState().world.runId,'old');
});
test('a late completion load cannot replace a newer campaign checkpoint, even after returning home',async()=>{
 const h=harness();await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
 let finishOldLoad;h.store.peek=()=>new Promise(resolve=>{finishOldLoad=resolve});
 h.live().stage='lost';h.tick(20);await flush();assert.equal(typeof finishOldLoad,'function');
 h.click('start-button');h.pending.shift()({ok:true});await flush();h.click('home-button');
 finishOldLoad({profile:{},checkpoint:{runId:'run1-retry',checkpointSerial:1}});await flush();
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run2');
});


test('missing or malformed authored actor poses stop before combat, legacy keeps its own artwork',async()=>{
 for(const options of [{omitActorKey:'actorSpiderWalk'},{malformedActorKey:'actorSpiderAttack'},{malformedActorKey:'bossMotionViolet'}]){
  const h=harness(options);await flush();assert.equal(h.global.HapilApp.getState().ready,false);assert.equal(h.global.HapilApp.getState().mode,'error');assert.equal(h.el('error-screen').hidden,false);
  assert.equal(h.global.HapilApp.invalidActorAsset({},-1),null);
 }
 const h=harness();await flush();assert.equal(h.global.HapilApp.getState().ready,true);
});
test('a still-loading optional cast effect never blocks required game start',async()=>{
 const h=harness({pendingOptional:true});await flush();assert.equal(h.global.HapilApp.getState().ready,true);h.click('start-button');assert.equal(h.global.HapilApp.getState().mode,'playing');
});

test('a failed optional cast effect is omitted without blocking or falsely claiming replacement artwork',async()=>{
 const h=harness({failedOptional:true});await flush();assert.equal(h.global.HapilApp.getState().ready,true);
 assert(h.global.HapilApp.diagnostics().assetErrors.includes('fxOptionalFixture'));
 assert(!String(h.el('toast').textContent).includes('기본 연출'));h.click('start-button');assert.equal(h.global.HapilApp.getState().mode,'playing');
});


test('loss waits for completion and readback before enabling the rekeyed checkpoint',async()=>{
 const h=harness({deferredComplete:true});await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
 h.live().stage='lost';h.tick(20);h.click('result-home-button');assert.equal(h.el('continue-button').disabled,true);
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null,'old ID cannot be restored while completion is pending');
 let finishRead;h.store.peek=()=>new Promise(resolve=>{finishRead=resolve});h.completionPending.shift()({ok:true});await flush();
 assert.equal(h.el('continue-button').disabled,true,'still disabled while storage readback is pending');
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null);
 finishRead({profile:{},checkpoint:h.state.checkpoint});await flush();assert.equal(h.el('continue-button').disabled,false);
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run1-retry');
});
test('failed completion keeps old continue disabled and warns until a newer checkpoint is confirmed',async()=>{
 const h=harness({deferredComplete:true});await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
 h.live().stage='lost';h.tick(20);h.click('result-home-button');h.completionPending.shift()({ok:false});await flush();
 assert.equal(h.el('continue-button').disabled,true);assert.match(h.el('mobile-storage-status').textContent,/저장 오류/);
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null);
 h.click('start-button');h.pending.shift()({ok:true});await flush();h.click('home-button');
 assert.equal(h.el('continue-button').disabled,false);h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run2');
});
test('persistent storage error is visible on mobile instead of claiming automatic save',async()=>{
 const h=harness();await flush();h.store.status.message='저장 데이터 오류 · 기존 기록을 보존했습니다. 내보내기로 기록을 보관해 주세요';
 h.click('practice-button');h.click('home-button');assert.match(h.el('mobile-storage-status').textContent,/저장 오류/);
});

test('completion after a newer campaign begins never requests old-generation storage readback',async()=>{
 const h=harness({deferredComplete:true});await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
 h.live().stage='lost';h.tick(20);h.click('start-button');h.pending.shift()({ok:true});await flush();
 let reads=0;h.store.peek=async()=>{reads++;return {profile:{},checkpoint:h.state.checkpoint}};
 h.completionPending.shift()({ok:true});await flush();assert.equal(reads,0);
 h.click('home-button');h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'run2');
});
test('a failed completion readback cannot enable an old checkpoint',async()=>{
 const h=harness({deferredComplete:true});await flush();h.click('start-button');h.pending.shift()({ok:true});await flush();
 h.live().stage='lost';h.tick(20);h.click('result-home-button');h.store.peek=async()=>({ok:false,reason:'storage-error'});
 h.completionPending.shift()({ok:true});await flush();assert.equal(h.el('continue-button').disabled,true);
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null);
});
test('a checkpoint callback delayed past loss cannot overwrite confirmed rekeyed progress',async()=>{
 const h=harness();await flush();h.click('start-button');assert.equal(h.pending.length,1);
 h.store.peek=async()=>({checkpoint:{runId:'run1-retry',checkpointSerial:1},profile:{}});
 h.live().stage='lost';h.tick(20);await flush();h.click('result-home-button');
 h.pending.shift()({ok:true});h.state.checkpoint={runId:'run1-retry',checkpointSerial:1};await flush();h.click('continue-button');await flush();
 assert.equal(h.global.HapilApp.getState().world.runId,'run1-retry');
});


test('explicit continue loads the latest other-tab checkpoint and restores that exact snapshot',async()=>{
 const h=harness();await flush();h.state.checkpoint={runId:'latest-other-tab',checkpointSerial:9};
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world.runId,'latest-other-tab');assert.equal(h.global.HapilApp.getState().world.checkpointSerial,9);
});
test('new campaign, practice, and repeated continue cannot race an explicit checkpoint read',async()=>{
 const h=harness();await flush();let finishLoad;h.store.load=()=>new Promise(resolve=>{finishLoad=resolve});
 h.click('continue-button');assert.equal(h.el('start-button').disabled,true);assert.equal(h.el('practice-button').disabled,true);assert.equal(h.el('continue-button').disabled,true);
 h.click('start-button');h.click('practice-button');h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null);assert.equal(h.saveCalls.length,0);
 finishLoad({profile:{},checkpoint:{runId:'latest',checkpointSerial:5}});await flush();
 assert.equal(h.global.HapilApp.getState().world.runId,'latest');assert.equal(h.el('start-button').disabled,false);assert.equal(h.el('practice-button').disabled,false);
});
test('failed explicit checkpoint load warns without restoring or discarding the last safe checkpoint',async()=>{
 const h=harness();await flush();h.store.load=async()=>({ok:false,reason:'storage-error'});
 h.click('continue-button');await flush();assert.equal(h.global.HapilApp.getState().world,null);assert.equal(h.el('continue-button').hidden,false);assert.equal(h.el('continue-button').disabled,false);assert.match(h.el('mobile-storage-status').textContent,/저장 오류/);
 h.store.load=async()=>({checkpoint:h.state.checkpoint,profile:{}});h.click('continue-button');await flush();
 assert.equal(h.global.HapilApp.getState().world.runId,'old');assert.doesNotMatch(h.el('mobile-storage-status').textContent,/저장 오류/);
});
test('explicit continue observes a checkpoint cleared by another tab',async()=>{
 const h=harness();await flush();h.state.checkpoint=null;h.click('continue-button');await flush();
 assert.equal(h.global.HapilApp.getState().world,null);assert.equal(h.el('continue-button').hidden,true);
});

test('a missing projectile renderer stops combat instead of exposing invisible damage',async()=>{
 const h=harness({missingProjectileModule:true});await flush();assert.equal(h.global.HapilApp.getState().ready,false);assert.equal(h.global.HapilApp.getState().mode,'error');assert.equal(h.el('error-screen').hidden,false);
});


test('missing or wrong-size player arrow atlas blocks combat instead of hiding friendly shots',async()=>{
 for(const options of [{omitActorKey:'fxWindArrow8V6'},{malformedActorKey:'fxWindArrow8V6'}]){
  const h=harness(options);await flush();assert.equal(h.global.HapilApp.getState().ready,false);assert.equal(h.global.HapilApp.getState().mode,'error');
 }
});
test('storage open or boot read failures keep gameplay available but show a warning and never invent progress',async()=>{
 for(const options of [{openFailure:true},{bootReadFailure:true}]){
  const h=harness(options);await flush();assert.equal(h.global.HapilApp.getState().ready,true);assert.equal(h.el('continue-button').hidden,true);assert.match(h.el('mobile-storage-status').textContent,/저장 오류/);
 }
});
