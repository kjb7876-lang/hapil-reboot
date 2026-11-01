'use strict';
// Actual app boot/events and renderer allocation with a controlled clock.
// Images supply verified dimensions only; no browser or phone-FPS claim.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../src/core.js'),ROOT=path.resolve(__dirname,'..');
const {Image:DecodedImage,createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]}));
const dimensions={...require('./fixtures/h14-image-dimensions.json')};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function sizeFor(file){
  if(!dimensions[file]){const bytes=fs.readFileSync(path.join(ROOT,file));if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))dimensions[file]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];else{const image=new DecodedImage();image.src=bytes;assert(image.complete&&image.width>0);dimensions[file]=[image.width,image.height];}}
  return dimensions[file];
}
function harness({coarse=true,width=390,height=844,dpr=3,savedQuality='high',hasStoredState=true}={}){
  let now=100,raf,world;const elements=new Map(),resizeCalls=[],draws=[],stepCalls=[],settingsCalls=[];
  function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:id==='.masthead'?width:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(type,fn){listeners[type]=fn;},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360};},querySelectorAll(){return [];}});}return elements.get(id);}
  const document={getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
  const store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:savedQuality},profile:{},checkpoint:null,hasStoredState}),peek:async()=>({checkpoint:null,profile:{}}),saveSettings:async value=>(settingsCalls.push({...value}),{ok:true}),saveCheckpoint:async()=>({ok:true}),completeRun:async()=>({ok:true})};
  const g={innerWidth:width,innerHeight:height,devicePixelRatio:dpr,matchMedia:()=>({matches:coarse}),addEventListener(){},HapilStore:store,HapilCore:{...core,createRun(options){world=core.createRun(options);return world;},step(w,input,dt){stepCalls.push({dt,input:{...input}});return core.step(w,input,dt);}}};
  class ImageFixture{set src(file){if(!file)return;const size=sizeFor(file);this.complete=true;this.naturalWidth=size[0];this.naturalHeight=size[1];Promise.resolve().then(()=>{if(this.onload)this.onload();});}}
  const context={window:g,globalThis:g,document,Image:ImageFixture,performance:{now:()=>now},requestAnimationFrame:fn=>(raf=fn,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},Audio:function(){},console};vm.createContext(context);
  for(const name of ['media','story-assets','boss-motion','actors','projectiles','boss-skills','render'])vm.runInContext(fs.readFileSync(path.join(ROOT,'src',name+'.js'),'utf8'),context);
  g.HapilRenderer={...g.HapilRenderer,create:()=>({resize(w,h,ratio){resizeCalls.push({width:w,height:h,dpr:ratio});},draw(w,alpha,time,low){draws.push({tick:w&&w.tick,low});},getMetrics(){return {};}})};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/app.js'),'utf8'),context);
  return {g,el,resizeCalls,draws,stepCalls,settingsCalls,world:()=>world,async boot(){for(let n=0;n<8;n++)await flush();assert(g.HapilApp.getState().ready,el('error-description').textContent);},click(id){el(id).listeners.click.call(el(id),{preventDefault(){}});},quality(low){el('setting-low').checked=low;el('setting-low').listeners.change.call(el('setting-low'),{preventDefault(){}});},tick(ms=1000/60){now+=ms;raf(now);}};
}
async function practice(h){h.click('practice-button');for(let n=0;n<4;n++)await flush();assert.equal(h.g.HapilApp.getState().mode,'playing');}

test('mobile startup uses low despite an old high preference without rewriting persisted settings',async()=>{
  const h=harness();await h.boot();assert.equal(h.g.HapilApp.getState().settings.quality,'low');assert.equal(h.el('setting-low').checked,true);assert.equal(h.settingsCalls.length,0,'startup adaptation does not rewrite the user settings record');
  assert.equal(h.g.HapilApp.diagnostics().renderTarget,30);assert.equal(h.g.HapilApp.diagnostics().fixedHz,60);assert.equal(h.resizeCalls.at(-1).dpr,1);assert.equal(h.el('render-state').textContent,'30 FPS');
});

test('manual high override restores high rendering and60target during the same mobile session',async()=>{
  const h=harness();await h.boot();h.quality(false);await flush();assert.equal(h.g.HapilApp.getState().settings.quality,'high');assert.equal(h.el('setting-low').checked,false);assert.equal(h.settingsCalls.at(-1).quality,'high');assert.equal(h.g.HapilApp.diagnostics().renderTarget,60);assert.equal(h.el('render-state').textContent,'60 FPS');
  assert(h.resizeCalls.at(-1).dpr<=1.5&&h.resizeCalls.at(-1).dpr>1);h.quality(true);await flush();assert.equal(h.resizeCalls.at(-1).dpr,1);assert.equal(h.g.HapilApp.diagnostics().renderTarget,30);
});

test('a narrow fine-pointer viewport also gets the mobile startup budget while desktop keeps saved high',async()=>{
  const narrow=harness({coarse:false,width:390,height:844});await narrow.boot();assert.equal(narrow.g.HapilApp.diagnostics().mobileRuntime,true);assert.equal(narrow.g.HapilApp.getState().settings.quality,'low');assert.equal(narrow.resizeCalls.at(-1).dpr,1);
  const desktop=harness({coarse:false,width:1440,height:1000});await desktop.boot();assert.equal(desktop.g.HapilApp.diagnostics().mobileRuntime,false);assert.equal(desktop.g.HapilApp.getState().settings.quality,'high');assert.equal(desktop.g.HapilApp.diagnostics().renderTarget,60);assert.equal(desktop.resizeCalls.at(-1).dpr,1.5);assert.equal(desktop.settingsCalls.length,0);
});

test('low mode allocates at actual CSS size on high-DPR narrow screens without forcing360pixel upscale',async()=>{
  const h=harness({width:320,height:640,dpr:4});await h.boot();const fit=h.resizeCalls.at(-1);assert(fit.width<360);assert.equal(fit.dpr,1);
  const box={document:{createElement(){return createCanvas(1,1);}}};box.window=box;vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/render.js'),'utf8'),box);
  const canvas=createCanvas(1,1);canvas.style={};const renderer=box.HapilRenderer.create(canvas,{});try{renderer.resize(fit.width,fit.height,fit.dpr);assert.equal(canvas.width,Math.round(fit.width));assert.equal(canvas.height,Math.round(fit.height));assert(canvas.width<360&&canvas.height<640,'low backing store follows its CSS arena rather than logical minimum dimensions');}finally{renderer.destroy();}
});

test('new31runs inherit the mobile30fixed60Hz budget and manual high increases draw frequency',async()=>{
  const low=harness(),high=harness();await low.boot();await high.boot();high.quality(false);await practice(low);await practice(high);
  low.draws.length=high.draws.length=0;for(let n=0;n<120;n++){low.tick();high.tick();}
  assert(low.stepCalls.length>=119&&low.stepCalls.length<=120);assert.equal(high.stepCalls.length,low.stepCalls.length);assert(low.stepCalls.every(call=>call.dt===1/60));assert(high.stepCalls.every(call=>call.dt===1/60));
  assert(low.draws.length>=59&&low.draws.length<=61);assert(high.draws.length>=119&&high.draws.length<=120);assert(low.draws.every(draw=>draw.low===true));assert(high.draws.every(draw=>draw.low===false));assert.equal(low.world().tick,high.world().tick);assert.equal(low.world().combatRevision,31);assert.equal(high.world().combatRevision,31);assert.equal(low.g.HapilApp.diagnostics().candidateRevision,31);
});
