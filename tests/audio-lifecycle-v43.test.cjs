'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const audio=require('../src/audio-v37.js');

function context(){
  const sources=[],gains=[],nodes=[];
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=extra=>{const n=Object.assign({connected:true,connect(){},disconnect(){this.connected=false;}},extra);nodes.push(n);return n;};
  const source=extra=>{const s=node(Object.assign({start(at){this.startAt=at;},stop(at){if(at!==undefined)this.stopAt=at;if(at===undefined){this.stopped=true;this.onended&&this.onended();}}},extra));sources.push(s);return s;};
  const ctx={state:'running',currentTime:0,sampleRate:1000,destination:{},resume(){this.state='running';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},
    createGain(){const g=node({gain:param()});gains.push(g);return g;},
    createDynamicsCompressor(){return node({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});},
    createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};},
    createOscillator(){return source({frequency:param()});},createBufferSource(){return source({});},
    createBiquadFilter(){return node({frequency:param(),Q:param()});},createStereoPanner(){return node({pan:param()});}};
  return {ctx,sources,gains,nodes,Ctor:function(){return ctx;}};
}
test('SFX mute and pause immediately silence and release already scheduled voices',()=>{
  const f=context(),fx=audio.create({AudioContext:f.Ctor,now:()=>0});fx.unlock();
  assert(fx.play('warning',.5));assert.equal(fx.stats().voices,7);
  fx.setEnabled(false);assert.equal(f.gains[0].gain.value,0);assert.equal(fx.stats().voices,0);
  assert(f.sources.every(s=>s.stopped&&!s.connected));
  fx.setEnabled(true);fx.reset();assert(fx.play('bomb',-.5));fx.suspend(true);
  assert.equal(fx.stats().voices,0);assert.equal(f.gains[0].gain.value,0);assert(!fx.play('kill'));
  fx.suspend(false);assert.equal(f.gains[0].gain.value,.55);assert.equal(fx.stats().voices,0,'old cues never resume');
  fx.setVolume(.25);assert.equal(f.gains[0].gain.value,.55*.25);
  assert(fx.play('kill'));fx.setVolume(0);assert.equal(fx.stats().voices,0);assert.equal(f.gains[0].gain.value,0);
});
test('a cue at clock zero is rate limited, and completed nodes release their output route',()=>{
  const f=context();let time=0;const fx=audio.create({AudioContext:f.Ctor,now:()=>time});fx.unlock();
  assert(fx.play('bomb',.5));time=10;assert.equal(fx.play('bomb',.5),false);
  for(const s of f.sources)s.onended();
  assert.equal(fx.stats().voices,0);
  assert(f.nodes.filter(n=>'pan' in n).every(n=>!n.connected),'stereo nodes do not accumulate after a cue ends');
});
test('audio unlock resumes an interrupted mobile audio context',()=>{
  const f=context(),fx=audio.create({AudioContext:f.Ctor});fx.unlock();f.ctx.state='interrupted';
  fx.unlock();assert.equal(f.ctx.state,'running');fx.dispose();assert.equal(fx.stats().voices,0);
});

async function music(tracks,options={}){
  const made=[],events={},pending=[];let clock=0;
  class Aud{
    constructor(src){this.src=src;this.paused=true;this.volume=0;this.muted=false;this.currentTime=10;this.plays=0;this.handlers={};made.push(this);}
    addEventListener(t,f){this.handlers[t]=f;}
    play(){this.plays++;this.paused=false;if(options.defer)return new Promise((resolve,reject)=>pending.push({a:this,resolve,reject}));return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const document={hidden:false,addEventListener(t,f){events[t]=f;}};
  const w={Audio:Aud,document,performance:{now:()=>clock},HapilArcade:{STAGES:[{},{}]},
    addEventListener(t,f){events[t]=f;},fetch:()=>Promise.resolve({ok:true,json:()=>({tracks})})};w.window=w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/arcade-music-v43.js'),'utf8'),w);
  await new Promise(r=>setImmediate(r));
  return {M:w.HapilMusic,made,events,pending,document,time(t){clock=t;},flush:()=>new Promise(r=>setImmediate(r))};
}
const tracks={title:{file:'title.mp3',volume:.2},field:{file:'field.mp3',volume:.24},boss:{file:'boss.mp3',volume:.36}};
const field={stage:'wave',stageIndex:0},boss={stage:'intro',stageIndex:0};
test('BGM resumes immediately after pause or mute and user volume preserves the per-track mix',async()=>{
  const h=await music(tracks),M=h.M;
  M.update('playing',field,true);await h.flush();const a=h.made.find(a=>a.src.endsWith('field.mp3'));
  h.time(100);M.update('paused',field,true);assert(a.paused);
  h.time(110);M.update('playing',field,true);assert(!a.paused,'no one-second retry delay on resume');
  await h.flush();M.setVolume(.5);assert.equal(a.volume,.12);
  M.setEnabled(false);assert(a.paused);M.update('playing',field,true);assert(!a.paused);
  M.setVolume(0);assert(a.paused);M.update('playing',field,true);assert(a.paused);
  M.setVolume(1);M.update('playing',field,true);assert(!a.paused);assert.equal(a.volume,.24);
});
test('zero in a track manifest is silent; duplicated track files keep one player and position',async()=>{
  const h=await music({field:{file:'same.mp3',volume:0},boss:{file:'same.mp3',volume:.3}});
  assert.equal(h.made.length,1);h.M.update('playing',field,true);await h.flush();
  const a=h.made[0];assert.equal(a.volume,0);a.currentTime=8;
  h.M.update('playing',boss,true);assert.equal(a.volume,.3);assert.equal(a.currentTime,8);assert.equal(a.plays,1);
});
test('pending play completion cannot resurrect music after pause, mute or background',async()=>{
  for(const action of ['pause','mute','background']){
    const h=await music(tracks,{defer:true}),M=h.M;M.update('playing',field,true);
    const p=h.pending[0];assert(p);
    if(action==='pause')M.update('paused',field,true);else if(action==='mute')M.setEnabled(false);else M.suspend(true);
    p.a.paused=false;p.resolve();await h.flush();assert(p.a.paused,action+' remains silent after a late promise');
  }
});
test('warming and track changes never leave a track muted or two stale tracks playing',async()=>{
  const h=await music(tracks),M=h.M;M.update('playing',field,true);M.unlock();await h.flush();
  h.time(50);M.update('playing',boss,true);await h.flush();
  h.time(100);M.update('title',null,true);await h.flush();
  h.time(1200);M.update('title',null,true);await h.flush();
  assert.deepEqual(h.made.filter(a=>!a.paused).map(a=>a.src),['media/bgm/title.mp3']);
  assert(h.made.every(a=>!a.muted));
});
test('visibility suspension does not clear a separate native-app suspension',async()=>{
  const h=await music(tracks),M=h.M;M.update('title',null,true);await h.flush();M.suspend(true);
  h.document.hidden=true;h.events.visibilitychange();h.document.hidden=false;h.events.visibilitychange();
  M.update('title',null,true);assert(h.made.every(a=>a.paused));
  M.suspend(false);M.update('title',null,true);assert(!h.made.find(a=>a.src.endsWith('title.mp3')).paused);
});

test('SFX also stops result-screen tails on visibility changes and removes listeners on disposal',()=>{
  const f=context(),events={},document={hidden:false,addEventListener(t,fn){events[t]=fn;},removeEventListener(t){delete events[t];}};
  const w={document,addEventListener(t,fn){events[t]=fn;},removeEventListener(t){delete events[t];}};w.window=w;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/audio-v37.js'),'utf8'),w);
  const fx=w.HapilAudio.create({AudioContext:f.Ctor,now:()=>100});fx.unlock();assert(fx.play('win'));
  document.hidden=true;events.visibilitychange();assert.equal(fx.stats().voices,0);assert.equal(f.gains[0].gain.value,0);assert(!fx.play('kill'));
  fx.suspend(true);document.hidden=false;events.visibilitychange();assert(!fx.play('kill'),'visibility does not override pause-menu suspension');
  fx.suspend(false);assert(fx.play('kill'));events.pagehide();assert.equal(fx.stats().voices,0);assert(!fx.play('hurt'));
  events.pageshow();assert(fx.play('hurt'));fx.dispose();assert.deepEqual(Object.keys(events),[]);
});
test('BGM autoplay rejection can retry on a gesture, while a broken file does not retry each second',async()=>{
  const h=await music(tracks,{defer:true}),M=h.M;M.update('playing',field,true);
  const a=h.pending[0].a;h.pending[0].reject({name:'NotAllowedError'});await h.flush();assert(a.paused);
  h.time(200);M.update('playing',field,true);assert.equal(a.plays,1);M.unlock();assert.equal(a.plays,2);
  const retry=h.pending.find((p,i)=>i>0&&p.a===a);retry.reject({name:'NotSupportedError'});await h.flush();
  h.time(3000);M.update('playing',field,true);M.unlock();assert.equal(a.plays,2,'missing or unsupported media does not spin on retry');
});

test('win and loss transitions do not briefly switch from boss music to field music',async()=>{
  const h=await music(tracks);
  assert.equal(h.M.pick('playing',{stage:'won',stageIndex:1}),'title');
  assert.equal(h.M.pick('playing',{stage:'lost',stageIndex:0}),'title');
});

test('main-boss cut-in sound respects mute and zero volume before scheduling any voice',()=>{
  const f=context(),fx=audio.create({AudioContext:f.Ctor,now:()=>0});fx.unlock();
  fx.setEnabled(false);assert.equal(fx.play('bossCutin'),false);assert.equal(f.sources.length,0);
  fx.setEnabled(true);fx.setVolume(0);assert.equal(fx.play('bossCutin'),false);assert.equal(f.sources.length,0);
  fx.setVolume(.4);assert.equal(fx.play('bossCutin'),true);assert.equal(f.gains[0].gain.value,.55*.4);
  assert.equal(f.sources.length,6);assert.equal(fx.play('bossCutin'),false,'one entrance must not layer duplicate cut-in sounds');
  assert(Math.max(...f.sources.map(s=>s.stopAt))<1,'the cue finishes in under one second');
  fx.setEnabled(false);assert.equal(fx.stats().voices,0);assert.equal(f.gains[0].gain.value,0);
  assert(f.sources.every(s=>s.stopped&&!s.connected),'muting cancels the scheduled impact and its tail too');
});
test('pausing a main-boss cut-in cancels its delayed impact without replaying it on resume',()=>{
  const f=context(),fx=audio.create({AudioContext:f.Ctor,now:()=>0});fx.unlock();assert(fx.play('bossCutin'));
  assert(f.sources.some(s=>s.startAt>=.3),'the impact follows the rising sound');
  f.ctx.currentTime=.1;fx.suspend(true);assert.equal(f.gains[0].gain.value,0);assert.equal(fx.stats().voices,0);
  assert(f.sources.every(s=>s.stopped&&!s.connected));assert.equal(fx.play('bossCutin'),false);
  const count=f.sources.length;fx.suspend(false);assert.equal(f.sources.length,count);assert.equal(fx.stats().voices,0);
});
