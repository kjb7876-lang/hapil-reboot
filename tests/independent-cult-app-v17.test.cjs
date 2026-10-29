'use strict';
// DOM/event fixture using real asset contracts; not a browser or decode benchmark.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../src/core.js'),dimensions=require('./fixtures/h14-image-dimensions.json');
const root=path.join(__dirname,'..'),flush=()=>new Promise(r=>setImmediate(r));
function harness(options={}){
 let now=100,raf,active=0,peak=0,requests=[],world;const fixtureDimensions={...dimensions};
 const elements=new Map(), saveCalls=[], completeCalls=[]; Object.assign(fixtureDimensions,{'media/cult-v17/cult-leader-atlas.png':[1536,1024],'media/cult-v17/beam.webp':[768,144],'media/cult-v17/lance.webp':[512,192],'media/cult-v17/arena.jpg':[1600,1000],'media/cult-v17/drive-spear.webp':[512,512],'media/cult-v17/drive-fold.webp':[512,512],'media/cult-v17/drive-impact.webp':[512,512],'media/cult-v17/drive-stitch.webp':[512,512]});
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id);}
 const doc={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:'high'},profile:{},checkpoint:null,hasStoredState:true}),peek:async()=>({checkpoint:null,profile:{}}),saveSettings:async()=>({ok:true}),saveCheckpoint:async s=>(saveCalls.push(s),{ok:true}),completeRun:async s=>(completeCalls.push(s),{ok:true})};
 const g={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:{...core,createRun(o){world=core.createRun(o);return world;}},HapilStore:store};
 class ImageFixture{set src(url){if(!url)return;requests.push(url);active++;peak=Math.max(peak,active);const size=fixtureDimensions[url]||[64,64];this.complete=true;this.naturalWidth=size[0];this.naturalHeight=size[1]-(url===options.malformed?1:0);Promise.resolve().then(()=>{active--;if(url===options.fail){if(this.onerror)this.onerror();}else if(this.onload)this.onload();});}}
 const context={window:g,globalThis:g,document:doc,Image:ImageFixture,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},Audio:function(){},console};
 vm.createContext(context);
 for(const file of ['media','boss-motion','actors','projectiles','boss-skills','render'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
 for(const c of Object.values(g.HapilBossMotion.contracts)){const url=g.HapilMedia[c.key];if(!fixtureDimensions[url])fixtureDimensions[url]=[c.width,c.height];}
 for(const c of Object.values(g.HapilActors.contracts))for(const p of Object.values(c.poses)){const url=g.HapilMedia[p.key];if(!fixtureDimensions[url])fixtureDimensions[url]=[p.width,p.height];}
 g.HapilRenderer={...g.HapilRenderer,create:()=>({resize(){},draw(){},getMetrics(){return {};}})};
 vm.runInContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),context);
 return {g,el,requests,saveCalls,completeCalls,get peak(){return peak;},world:()=>world,click(id){el(id).listeners.click.call(el(id),{preventDefault(){}});},tick(){now+=20;raf(now);}};
}

async function boot(h){for(let i=0;i<4;i++)await flush();assert(h.g.HapilApp.getState().ready,h.el('error-description').textContent);}
async function startCult(h){h.el('practice-select').value='12';h.click('practice-button');h.tick();for(let i=0;i<6;i++)await flush();h.tick();h.tick();}
test('separate final-practice only loads own required cult assets, never writes the campaign checkpoint, and retry preserves identity',async()=>{
 const h=harness();await boot(h);await startCult(h);assert.equal(h.g.HapilApp.getState().mode,'playing');assert.equal(h.world().finalPractice,true);assert.equal(h.world().boss.kind,'cult-leader');
 for(const name of ['cult-leader-atlas.png','beam.webp','lance.webp','arena.jpg','drive-spear.webp'])assert(h.requests.some(x=>x==='media/cult-v17/'+name),name);
 assert(h.world().tick>0);assert(h.peak<=2);assert.equal(h.saveCalls.length,0);
 h.world().stage='lost';h.tick();h.tick();await flush();assert.equal(h.g.HapilApp.getState().mode,'result');assert.equal(h.completeCalls.length,0);assert.match(h.el('result-description').textContent,/독립 연습/);
 // Change selection to expose any retry accidentally using the selector.
 h.el('practice-select').value='0';h.click('retry-button');h.tick();for(let i=0;i<6;i++)await flush();h.tick();
 assert.equal(h.world().finalPractice,true);assert.equal(h.world().boss.kind,'cult-leader');assert.equal(h.saveCalls.length,0);assert.equal(h.completeCalls.length,0);
});
test('missing or malformed mandatory cult artwork stops the final-practice before simulation',async()=>{
 for(const options of [{fail:'media/cult-v17/cult-leader-atlas.png'},{malformed:'media/cult-v17/beam.webp'},{fail:'media/cult-v17/lance.webp'},{malformed:'media/cult-v17/arena.jpg'},{fail:'media/cult-v17/drive-spear.webp'},{malformed:'media/cult-v17/drive-spear.webp'}]){
  const h=harness(options);await boot(h);await startCult(h);assert.equal(h.g.HapilApp.getState().mode,'error',JSON.stringify(options));assert.equal(h.world().tick,0);assert.equal(h.saveCalls.length,0);
 }
});
test('the separate final-practice result reports the specified conclusion without writing a completed campaign',async()=>{
 const h=harness();await boot(h);await startCult(h);const w=h.world();w.stage='won';w.resultReason='교주의 사몽 권한이 끊어졌다. 합일 코어는 남기고 지배 명령과 사이비 회로만 분리한다. 환도는 몽세수호자로 남는다.';h.tick();h.tick();await flush();
 assert.equal(h.g.HapilApp.getState().mode,'result');assert.match(h.el('result-description').textContent,/코어는 남기고/);assert.match(h.el('result-description').textContent,/몽세수호자/);assert.equal(h.completeCalls.length,0);
});
test('the final-practice awakening bridge is displayed instead of a pride-chairman description',async()=>{
 const h=harness();await boot(h);await startCult(h);const w=h.world();w.stage='transition';w.stageTime=0;w.transitionMinimum=9;w.stageLabel='사몽 각성';w.transitionNarrative=['교주가 무너졌지만 코어의 신경선이 그의 몸을 다시 잇는다.','환도는 돌아온 현실의 기억 속에서 여기가 꿈임을 알아차린다.','사몽의 권한으로 일어서서 교주에게 맞선다.'];for(let i=0;i<8;i++)h.tick();
 assert.equal(h.el('encounter-title').textContent,'사몽 각성');assert.match(h.el('encounter-description').textContent,/신경선/);assert.equal(h.saveCalls.length,0);
});

test('each optional cult Drive ornament failure leaves the required combat assets playable',async()=>{
 for(const key of ['drive-fold.webp','drive-impact.webp','drive-stitch.webp'])for(const failure of ['fail','malformed']){
  const h=harness({[failure]:'media/cult-v17/'+key});await boot(h);await startCult(h);for(let i=0;i<6;i++)await flush();h.tick();
  assert(h.requests.includes('media/cult-v17/'+key),key);assert.equal(h.g.HapilApp.getState().mode,'playing',key);assert(h.world().tick>0);assert.equal(h.saveCalls.length,0);assert(h.peak<=2);
 }
});
