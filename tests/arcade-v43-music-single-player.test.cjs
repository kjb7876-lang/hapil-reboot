'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/arcade-music-v43.js'),'utf8');
const tracks={title:{file:'title.mp3',volume:.2},field:{file:'field.mp3',volume:.24},boss:{file:'boss.mp3',volume:.36},final:{file:'final.mp3',volume:.4}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({manifest=tracks,defer=false,lateManifest=false}={}){
 const made=[],requests=[],events={},actions=[];let clock=0,fetches=0,resolveManifest;
 class Aud{
  constructor(src){this.paused=true;this.volume=0;this.currentTime=0;this.muted=false;this.listeners={};this._src=src;this.plays=0;made.push(this);}
  get src(){return this._src;}
  set src(value){assert(this.paused,'the old source must stop before replacement');actions.push(['source',value]);this._src=value;this.currentTime=0;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  play(){assert(made.filter(a=>!a.paused).length===0,'no duplicate or overlapping play call');this.paused=false;this.plays++;actions.push(['play',this.src]);
   if(defer)return new Promise((resolve,reject)=>requests.push({a:this,src:this.src,resolve,reject}));return Promise.resolve();}
  pause(){this.paused=true;actions.push(['pause',this.src]);}
 }
 const doc={hidden:false,addEventListener:(k,fn)=>events[k]=fn};
 const w={Audio:Aud,document:doc,HapilArcade:{STAGES:[{},{}]},performance:{now:()=>clock},addEventListener:(k,fn)=>events[k]=fn,
  fetch(){fetches++;return lateManifest?new Promise(resolve=>resolveManifest=resolve):Promise.resolve({ok:true,json:()=>({tracks:manifest})});},
  setTimeout(){throw Error('music must not create a timer');},requestAnimationFrame(){throw Error('music must not create a frame loop');}};w.window=w;
 vm.runInNewContext(source,w);await flush();
 return {M:w.HapilMusic,w,made,requests,events,actions,doc,time(t){clock=t;},fetches:()=>fetches,manifest(){resolveManifest({ok:true,json:()=>({tracks:manifest})});},reload(){vm.runInNewContext(source,w);}};
}
const wave={stage:'wave',stageIndex:0},boss={stage:'intro',stageIndex:0},clear={stage:'bossClear',stageIndex:0},final={stage:'card',stageIndex:1};
function only(h,src){assert.equal(h.made.length,1);const a=h.made[0];assert.equal(a.src,'media/bgm/'+src);assert.equal(a.paused,false);assert.equal(a.muted,false);}

test('all rapid transitions use one physical player and stop before source changes, without duplicate unlocks',async()=>{
 const h=await harness(),M=h.M;
 for(let i=0;i<100;i++){
  h.time(i*20);M.update('playing',wave,true);only(h,'field.mp3');const plays=h.made[0].plays;M.unlock();h.events.pointerdown();h.events.touchend();M.update('playing',wave,true);assert.equal(h.made[0].plays,plays);
  M.update('playing',boss,true);only(h,'boss.mp3');M.update('playing',clear,true);only(h,'boss.mp3');
  M.update('paused',clear,true);assert(h.made[0].paused);M.unlock();assert(h.made[0].paused);
  M.update('playing',clear,true);only(h,'boss.mp3');M.update('playing',final,true);only(h,'final.mp3');M.update('title',null,true);only(h,'title.mp3');await flush();
 }
 const api=h.M,plays=h.made[0].plays;h.reload();await flush();assert.equal(h.w.HapilMusic,api);assert.equal(h.fetches(),1);assert.equal(h.made.length,1);assert.equal(h.made[0].plays,plays,'loading the script twice never starts another owner');
});

test('out-of-order play completion and rejection never stop the latest track or revive blocked playback',async()=>{
 const h=await harness({defer:true}),M=h.M;M.update('playing',wave,true);M.update('playing',boss,true);M.update('title',null,true);
 const [old,previous,current]=h.requests;old.reject({name:'NotSupportedError'});previous.resolve();await flush();only(h,'title.mp3');current.resolve();await flush();
 for(const reason of ['pause','mute','zero','hidden','native','pagehide']){
  h.doc.hidden=false;h.events.pageshow();M.suspend(false);M.setEnabled(true);M.setVolume(1);M.update('playing',wave,true);M.update('playing',boss,true);
  const pending=h.requests.at(-1),count=h.made[0].plays;
  if(reason==='pause')M.update('paused',boss,true);if(reason==='mute')M.setEnabled(false);if(reason==='zero')M.setVolume(0);
  if(reason==='hidden'){h.doc.hidden=true;h.events.visibilitychange();}if(reason==='native')M.suspend(true);if(reason==='pagehide')h.events.pagehide();
  M.unlock();assert.equal(h.made[0].plays,count);assert(h.made[0].paused);
  // A late native completion is represented adversarially, even after pause().
  pending.a.paused=false;pending.resolve();await flush();assert(pending.a.paused,reason);assert.equal(pending.a.volume,0,reason);
 }
});

test('a late manifest honors the last paused or muted request and never starts a stale screen',async()=>{
 for(const quiet of ['paused','mute','zero']){
  const h=await harness({lateManifest:true});h.M.update('playing',wave,true);h.M.update(quiet==='paused'?'paused':'playing',boss,quiet!=='mute');if(quiet==='zero')h.M.setVolume(0);
  h.manifest();await flush();h.M.unlock();assert.equal(h.made.length,1);assert.equal(h.made[0].plays,0);assert(h.made[0].paused);
  h.M.setVolume(1);h.M.update('playing',final,true);only(h,'final.mp3');
 }
});

test('identical assets retain position without restarting and silent assets never play',async()=>{
 const h=await harness({manifest:{field:{file:'same.mp3',volume:.2},boss:{file:'same.mp3',volume:.3},title:{file:'silent.mp3',volume:0}}}),M=h.M;
 M.update('playing',wave,true);h.made[0].currentTime=19;const plays=h.made[0].plays;M.update('playing',boss,true);assert.equal(h.made[0].currentTime,19);assert.equal(h.made[0].plays,plays);assert.equal(h.made[0].volume,.3);
 M.update('title',null,true);M.unlock();assert(h.made[0].paused);assert.equal(h.made[0].plays,plays);M.update('playing',wave,true);assert.equal(h.made[0].currentTime,19);only(h,'same.mp3');
});

test('a failed source is not retried endlessly and does not poison other tracks',async()=>{
 const h=await harness({defer:true}),M=h.M;M.update('playing',boss,true);h.requests.at(-1).reject({name:'NotSupportedError'});await flush();
 const failedPlays=h.made[0].plays;h.time(5000);M.update('playing',boss,true);M.unlock();assert.equal(h.made[0].plays,failedPlays);
 M.update('playing',wave,true);only(h,'field.mp3');h.requests.at(-1).resolve();await flush();M.update('playing',boss,true);assert(h.made[0].paused);assert.equal(h.made[0].plays,failedPlays+1);
});
