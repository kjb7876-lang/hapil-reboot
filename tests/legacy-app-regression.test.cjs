'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(options={}){
 let now=100,raf,run=0,inputs=[],saveCalls=[],completionCalls=[],settingsCalls=[],pending=[];
 const elements=new Map();
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id)}
 const document={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const stored={runId:'old',checkpointSerial:4};
 const store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:'high'},checkpoint:stored,profile:{},hasStoredState:options.hasStoredState}),saveSettings:async value=>(settingsCalls.push({...value}),{ok:true}),saveCheckpoint(s){saveCalls.push(s);return new Promise(resolve=>pending.push(resolve))},completeRun(s){completionCalls.push(s);return Promise.resolve({ok:true})}};
 let live;
 const core={createRun(opts){live={runId:'run'+ ++run,checkpointSerial:1,tick:0,stage:'waves',campaign:true,bossIndex:0,practiceBoss:opts.practiceBoss,difficulty:'normal',player:{x:0,y:0,hp:3,maxHp:3,r:2},events:[],skills:{},bullets:[],shots:[],enemies:[],effects:[],hazards:[],stats:{}};return live},checkpoint:w=>({runId:w.runId,checkpointSerial:w.checkpointSerial,tick:w.tick}),step(w,input){inputs.push(input);w.tick++},restoreCheckpoint(s){return {runId:s.runId,checkpointSerial:s.checkpointSerial,tick:0,stage:'waves',campaign:true,bossIndex:0,practiceBoss:false,player:{x:0,y:0,hp:3,maxHp:3,r:2},events:[],skills:{},bullets:[],shots:[],enemies:[],effects:[],hazards:[],stats:{}}}};
 const global={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:core,HapilStore:store,HapilMedia:{},HapilRenderer:{create:()=>({resize(){},draw(){}})}};
 const context={window:global,document,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},console,Image:function(){},Audio:function(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/app.js'),'utf8'),context);
 function click(id){el(id).listeners.click.call(el(id),{preventDefault(){}})}
 function tick(ms=20){now+=ms;raf(now)}
 function ptr(type,x,y){el('touch-pad').listeners[type]({type,pointerId:1,button:0,clientX:x,clientY:y,currentTarget:el('touch-pad'),preventDefault(){}})}
 return {global,el,click,tick,ptr,inputs,saveCalls,completionCalls,settingsCalls,pending,live:()=>live,stored};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('mobile remembers chosen FPS; practice does not touch campaign checkpoint or result',async()=>{
 const h=harness();await flush();assert.equal(h.global.HapilApp.getState().settings.quality,'high');h.click('practice-button');assert.equal(h.saveCalls.length,0);h.live().stage='won';h.tick();await flush();assert.equal(h.completionCalls.length,0);h.click('result-home-button');assert.equal(h.el('continue-button').hidden,false);
});
test('failed checkpoint retries, and a delayed previous run cannot update the new run UI',async()=>{
 const h=harness();await flush();h.click('start-button');assert.equal(h.saveCalls.length,1);h.pending.shift()({ok:false});await flush();for(let i=0;i<105;i++)h.tick(20);assert.equal(h.saveCalls.length,2);h.click('start-button');assert.equal(h.saveCalls.length,3);h.pending.shift()({ok:true});await flush();h.click('continue-button');assert.equal(h.global.HapilApp.getState().world.runId,'old');h.pending.shift()({ok:true});await flush();assert.equal(h.global.HapilApp.getState().world.runId,'old');
});
test('short touch drag survives release until a simulation step consumes it',async()=>{
 const h=harness();await flush();h.click('practice-button');h.ptr('pointerdown',0,0);h.ptr('pointermove',10,0);h.ptr('pointerup',10,0);assert.ok(h.global.HapilApp.getState().pointer.pendingX>0);h.tick(20);assert.ok(h.inputs.some(x=>x.dx>0));
});

test('fresh mobile defaults to 30 FPS and persists it; an existing 60 FPS preference stays selected',async()=>{
 const fresh=harness({hasStoredState:false});await flush();assert.equal(fresh.global.HapilApp.getState().settings.quality,'low');assert.equal(fresh.settingsCalls.length,1);assert.equal(fresh.settingsCalls[0].quality,'low');
 const existing=harness({hasStoredState:true});await flush();assert.equal(existing.global.HapilApp.getState().settings.quality,'high');assert.equal(existing.settingsCalls.length,0);
});
test('successful in-flight save updates continue after returning home',async()=>{
 const h=harness();await flush();h.click('start-button');h.click('home-button');h.pending.shift()({ok:true});await flush();h.click('continue-button');assert.equal(h.global.HapilApp.getState().world.runId,'run1');
});
