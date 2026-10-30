'use strict';
// DOM/event fixture with the real engine and asset contracts. Canvas is used
// only to obtain JPEG/WebP dimensions; PNG sizes come from their headers.
// This test is not an image decode benchmark or browser/device play.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../src/core.js'),dimensions=require('./fixtures/h14-image-dimensions.json');
const {Image:DecodedImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.join(__dirname,'..'),flush=()=>new Promise(r=>setImmediate(r)),sizeCache={...dimensions};
function dimensionsFor(url){if(!sizeCache[url]){const bytes=fs.readFileSync(path.join(root,url));if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))sizeCache[url]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];else{const image=new DecodedImage();image.src=bytes;assert(image.complete&&image.width>0&&image.height>0,url);sizeCache[url]=[image.width,image.height];}}return sizeCache[url];}
function harness(options={}){
 let now=100,raf,active=0,peak=0,world,runtimeImages;const requests=[],createOptions=[],elements=new Map(),saveCalls=[],completeCalls=[];
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id);}
 const doc={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const stored=options.checkpoint||null;
 const store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:'high'},profile:{},checkpoint:stored,hasStoredState:true}),peek:async()=>({checkpoint:stored,profile:{}}),saveSettings:async()=>({ok:true}),saveCheckpoint:async s=>(saveCalls.push(structuredClone(s)),{ok:true}),completeRun:async s=>(completeCalls.push(s),{ok:true})};
 const g={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:{...core,createRun(o){createOptions.push(o);world=core.createRun(o);return world;},restoreCheckpoint(s){world=core.restoreCheckpoint(s);return world;}},HapilStore:store};
 class ImageFixture{set src(url){if(!url)return;requests.push(url);active++;peak=Math.max(peak,active);const size=dimensionsFor(url);this.complete=true;this.naturalWidth=size[0];this.naturalHeight=size[1]-(url===options.malformed?1:0);Promise.resolve().then(()=>{active--;if(url===options.fail){if(this.onerror)this.onerror();}else if(this.onload)this.onload();});}}
 const context={window:g,globalThis:g,document:doc,Image:ImageFixture,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},Audio:function(){},console};vm.createContext(context);
 for(const file of ['media','boss-motion','actors','projectiles','boss-skills','render'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
 g.HapilRenderer={...g.HapilRenderer,create:(canvas,images)=>(runtimeImages=images,{resize(){},draw(){},getMetrics(){return {};}})};
 vm.runInContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),context);
 return {g,el,requests,createOptions,saveCalls,completeCalls,get peak(){return peak;},get images(){return runtimeImages;},world:()=>world,click(id){el(id).listeners.click.call(el(id),{preventDefault(){}});},tick(){now+=20;raf(now);}};
}
async function boot(h){for(let i=0;i<6;i++)await flush();assert(h.g.HapilApp.getState().ready,h.el('error-description').textContent);}
async function advance(h){h.tick();for(let i=0;i<8;i++)await flush();h.tick();h.tick();}
async function practice(h,group){h.el('practice-select').value=String(group);h.click('practice-button');await advance(h);}
function assertOwnRequired(h,group){
 const keys=[...h.g.HapilActors.chapter3AssetKeysForEncounter(group),...h.g.HapilProjectiles.assetKeysForEncounter(group),...h.g.HapilRenderer.terrainAssetKeysForEncounter(group)];
 for(const key of keys)assert(h.requests.includes(h.g.HapilMedia[key]),`missing own asset ${group}:${key}`);
 assert.equal(h.g.HapilApp.getState().mode,'playing',group+': '+h.el('error-description').textContent);assert(h.world().tick>0);assert(h.peak<=2,'more than two image requests');for(const key of ['boss','spider','cave'])assert.equal(h.images[key],undefined,`unused legacy image retained in group ${group}: ${key}`);
}
test('new campaign starts revision five; retry preserves the selected campaign contract',async()=>{
 const h=harness();await boot(h);h.click('start-button');await advance(h);assert.equal(h.createOptions[0].campaignRevision,5);assert.equal(h.world().bossCount,35);assert.equal(h.world().practiceBoss,false);
 // Deliberate loss fixture checks result navigation only, not natural survival.
 h.world().stage='lost';await advance(h);h.el('practice-select').value='0';h.click('retry-button');await advance(h);
 assert.equal(h.world().campaignRevision,5);assert.equal(h.world().bossCount,35);assert.equal(h.world().practiceBoss,false);
});
test('continuing revision three and retrying it does not silently upgrade its route',async()=>{
 const old=core.createRun({campaign:true,campaignRevision:3,difficulty:'normal',seed:813,runId:'existing-revision-three'}),snap=core.checkpoint(old),bytes=JSON.stringify(snap),h=harness({checkpoint:snap});await boot(h);h.click('continue-button');for(let i=0;i<8;i++)await flush();
 assert.equal(h.g.HapilApp.getState().mode,'paused');assert.equal(h.world().campaignRevision,3);assert.equal(h.world().bossCount,12);assert.equal(h.world().runId,snap.runId);assert.equal(JSON.stringify(snap),bytes);
 h.click('resume-button');await advance(h);h.world().stage='lost';await advance(h);h.click('retry-button');await advance(h);assert.equal(h.world().campaignRevision,3);assert.equal(h.world().bossCount,12);assert.equal(h.world().practiceBoss,false);
});
test('all six chapter-three practice selections load their own assets without replacing campaign saves',async()=>{
 for(let group=13;group<=18;group++){
  const h=harness();await boot(h);await practice(h,group);assert.equal(h.world().campaignRevision,4);assert.equal(h.world().bossIndex,group-1);assert.equal(!!h.world().finalPractice,false);assert.equal(h.world().boss.kind,core.CAMPAIGN_BOSSES[group-1].id);assertOwnRequired(h,group);assert.equal(h.saveCalls.length,0);
  h.world().stage='lost';await advance(h);h.el('practice-select').value='12';h.click('retry-button');await advance(h);assert.equal(h.world().bossIndex,group-1);assert.equal(h.world().campaignRevision,4);assert.equal(!!h.world().finalPractice,false);assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
 }
});
test('missing or malformed chapter-three required assets stop simulation instead of substituting another boss',async()=>{
 const cases=[[13,'chapter3U201Atlas'],[14,'chapter3U202Atlas'],[15,'chapter3U204Atlas'],[16,'chapter3U205Atlas'],[17,'chapter3MigrationCoreAtlas'],[18,'chapter3ControllerIdle'],[18,'chapter3ControllerAttack'],[18,'chapter3ControllerRain'],[18,'chapter3ControllerTransition'],[18,'chapter3MemoryGate'],[13,'chapter3DroneIdle'],[14,'chapter3DroneAttack'],[18,'chapter3DroneDestroyed'],[13,'chapter3Beam'],[18,'chapter3Lance'],[13,'chapter3WarMap'],[15,'chapter3NexusMap'],[17,'chapter3MigrationMap'],[18,'chapter3GateMap']];
 for(const [group,key] of cases)for(const failure of ['fail','malformed']){
  const probe=harness();const url=probe.g.HapilMedia[key];assert(url,key);const h=harness({[failure]:url});await boot(h);await practice(h,group);assert.equal(h.g.HapilApp.getState().mode,'error',`${failure}:${key}`);assert.equal(h.world().tick,0,`${failure}:${key}`);assert.equal(h.saveCalls.length,0);
 }
});
