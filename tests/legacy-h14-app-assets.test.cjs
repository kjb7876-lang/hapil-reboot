'use strict';
// DOM/event fixture using real asset contracts; not a browser or decode benchmark.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const core=require('../src/core.js'),dimensions=require('./fixtures/h14-image-dimensions.json');
const root=path.join(__dirname,'..'),flush=()=>new Promise(r=>setImmediate(r));
function harness(options={}){
 let now=100,raf,active=0,peak=0,requests=[],world;const fixtureDimensions={...dimensions};
 const elements=new Map();
 function el(id){if(!elements.has(id)){const listeners={};elements.set(id,{id,listeners,hidden:false,disabled:false,checked:false,value:id==='practice-select'?'0':1,clientWidth:360,clientHeight:80,offsetHeight:50,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(t,f){listeners[t]=f},focus(){},setPointerCapture(){},getBoundingClientRect(){return {width:360}},querySelectorAll(){return []}})}return elements.get(id);}
 const doc={getElementById:el,querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(){},documentElement:{style:{setProperty(){}}},body:{appendChild(){}}};
 const store={status:{persistent:true,message:'ok'},open:async()=>({ok:true}),load:async()=>({settings:{quality:'high'},profile:{},checkpoint:null,hasStoredState:true}),peek:async()=>({checkpoint:null,profile:{}}),saveSettings:async()=>({ok:true}),saveCheckpoint:async()=>({ok:true}),completeRun:async()=>({ok:true})};
 const g={innerWidth:360,innerHeight:760,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},HapilCore:{...core,createRun(o){world=core.createRun(o);return world;}},HapilStore:store};
 class ImageFixture{set src(url){if(!url)return;requests.push(url);active++;peak=Math.max(peak,active);const size=fixtureDimensions[url]||[64,64];this.complete=true;this.naturalWidth=size[0];this.naturalHeight=size[1]-(url===options.malformed?1:0);Promise.resolve().then(()=>{active--;if(url===options.fail){if(this.onerror)this.onerror();}else if(this.onload)this.onload();});}}
 const context={window:g,globalThis:g,document:doc,Image:ImageFixture,performance:{now:()=>now},requestAnimationFrame:f=>(raf=f,1),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0'}),setTimeout:()=>1,clearTimeout(){},Audio:function(){},console};
 vm.createContext(context);
 for(const file of ['media','boss-motion','actors','projectiles','boss-skills','render'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
 for(const c of Object.values(g.HapilBossMotion.contracts)){const url=g.HapilMedia[c.key];if(!fixtureDimensions[url])fixtureDimensions[url]=[c.width,c.height];}
 for(const c of Object.values(g.HapilActors.contracts))for(const p of Object.values(c.poses)){const url=g.HapilMedia[p.key];if(!fixtureDimensions[url])fixtureDimensions[url]=[p.width,p.height];}
 g.HapilRenderer={...g.HapilRenderer,create:()=>({resize(){},draw(){},getMetrics(){return {};}})};
 vm.runInContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),context);
 return {g,el,requests,get peak(){return peak;},world:()=>world,click(id){el(id).listeners.click.call(el(id),{preventDefault(){}});},tick(){now+=20;raf(now);}};
}
test('encounter media stays lazy and bounded while its exact source map and phase variant load before simulation',async()=>{
 const h=harness();await flush();assert(h.g.HapilApp.getState().ready,h.el('error-description').textContent+' '+JSON.stringify(h.g.HapilApp.diagnostics().assetErrors));assert(h.requests.includes('media/hapil1-v14/maps/violet.webp'));assert(!h.requests.includes('media/hapil1-v14/maps/sloth.jpg'));assert(!h.requests.includes('media/hapil1-v14/maps/pride-core.jpg'));
 h.el('practice-select').value='11';h.click('practice-button');h.tick();const tick=h.world().tick;await flush();
 assert(h.requests.includes('media/hapil1-v14/maps/pride.jpg'));assert(h.requests.includes('media/hapil1-v14/maps/pride-core.jpg'));assert(!h.requests.includes('media/hapil1-v14/maps/sloth.jpg'));assert(h.peak<=2);
 h.tick();h.tick();assert(h.world().tick>tick);assert.equal(h.g.HapilApp.getState().mode,'playing');
});
test('missing or malformed own scene art stops before the new encounter can advance',async()=>{
 for(const options of [{fail:'media/hapil1-v14/maps/pride.jpg'},{malformed:'media/hapil1-v14/maps/pride-core.jpg'}]){
  const h=harness(options);await flush();assert(h.g.HapilApp.getState().ready,h.el('error-description').textContent+' '+JSON.stringify(h.g.HapilApp.diagnostics().assetErrors));h.el('practice-select').value='11';h.click('practice-button');h.tick();await flush();
  assert.equal(h.g.HapilApp.getState().mode,'error');assert.equal(h.world().tick,0);assert.equal(h.el('error-screen').hidden,false);
 }
});
test('a failed source used only as an optional skill/beam accent does not block its verified damage sprites',async()=>{
 const media=require('../tools/read-media-registry.cjs')(),url=media.h14SkillViolet,h=harness({fail:url});await flush();h.el('practice-select').value='0';h.click('practice-button');h.tick();await flush();h.tick();h.tick();
 assert(h.requests.includes(url));assert.equal(h.g.HapilApp.getState().mode,'playing');assert(h.world().tick>0);assert(h.peak<=2);
});
test('a skill source promoted to a required natural bullet body must fail closed before simulation',async()=>{
 const media=require('../tools/read-media-registry.cjs')();for(const [group,key] of [[1,'h14SkillHorn'],[11,'h14SkillPride']]){const h=harness({fail:media[key]});await flush();assert(h.g.HapilApp.getState().ready);h.el('practice-select').value=String(group);h.click('practice-button');h.tick();await flush();h.tick();h.tick();assert(h.requests.includes(media[key]));assert.equal(h.g.HapilApp.getState().mode,'error');assert.equal(h.world().tick,0);assert(h.peak<=2);}
});
test('the new skill renderer and changed modules share the browser cache revision, with skill definitions before the renderer',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/src="src\/([^"?]+)\.js\?v=([^"&]+)"/g)];
 assert(scripts.some(m=>m[1]==='boss-skills'));assert.equal(new Set(scripts.map(m=>m[2])).size,1);assert(html.indexOf('src/boss-skills.js')<html.indexOf('src/render.js'));
 assert(html.includes('styles.css?v='+scripts[0][2]));
});
