'use strict';
// DOM/events and image dimensions only: no browser or image-pixel claim.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../../src/core.js'),dimensions=require('../fixtures/h14-image-dimensions.json');
const {Image:DecodedImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'../..')]}));
const root=path.resolve(__dirname,'../..'),flush=()=>new Promise(r=>setImmediate(r)),sizeCache={...dimensions};
function dimensionsFor(url){if(!sizeCache[url]){const bytes=fs.readFileSync(path.join(root,url));if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))sizeCache[url]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];else{const image=new DecodedImage();image.src=bytes;assert(image.complete&&image.width>0&&image.height>0,url);sizeCache[url]=[image.width,image.height];}}return sizeCache[url];}
function harness(options={}){
 let now=100,raf,active=0,peak=0,world;const requests=[],createOptions=[],elements=new Map(),saveCalls=[],completeCalls=[];
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id);}
 const doc={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const stored=options.checkpoint||null,store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:'high'},profile:{},checkpoint:stored,hasStoredState:true}),peek:async()=>({checkpoint:stored,profile:{}}),saveSettings:async()=>({ok:true}),saveCheckpoint:async s=>(saveCalls.push(structuredClone(s)),{ok:true}),completeRun:async s=>(completeCalls.push(s),{ok:true})};
 const g={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:{...core,createRun(o){createOptions.push(o);world=core.createRun(o);return world;},restoreCheckpoint(s){world=core.restoreCheckpoint(s);return world;}},HapilStore:store};
 class ImageFixture{set src(url){if(!url)return;requests.push(url);active++;peak=Math.max(peak,active);const size=dimensionsFor(url);this.complete=true;this.naturalWidth=size[0];this.naturalHeight=size[1]-(url===options.malformed?1:0);Promise.resolve().then(()=>{active--;if(url===options.fail){if(this.onerror)this.onerror();}else if(this.onload)this.onload();});}}
 const context={window:g,globalThis:g,document:doc,Image:ImageFixture,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},Audio:function(){},console};vm.createContext(context);
 for(const file of ['media','story-assets','boss-motion','actors','projectiles','boss-skills','render'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
 g.HapilRenderer={...g.HapilRenderer,create:()=>({resize(){},draw(){},getMetrics(){return {};}})};vm.runInContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),context);
 return {g,el,requests,createOptions,saveCalls,completeCalls,get peak(){return peak;},world:()=>world,click(id){el(id).listeners.click.call(el(id),{preventDefault(){}});},tick(){now+=20;raf(now);}};
}
async function boot(h){for(let i=0;i<8;i++)await flush();assert(h.g.HapilApp.getState().ready,h.el('error-description').textContent);}
async function advance(h){h.tick();for(let i=0;i<10;i++)await flush();h.tick();h.tick();}
async function practice(h,group){h.el('practice-select').value=String(group);h.click('practice-button');await advance(h);}
module.exports={harness,boot,advance,practice};
