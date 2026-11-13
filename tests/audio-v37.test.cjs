'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../src/core.js'),audio=require('../src/audio-v37.js');

function run(bossIndex,seed){return core.createRun({runId:'audio-v37-'+bossIndex+'-'+seed,difficulty:'normal',seed,practiceBoss:true,combatRevision:31,campaign:true,campaignRevision:3,bossIndex});}
function names(cues){return cues.map(c=>c.name);}
function world(patch){return Object.assign({runId:'r',tick:100,stage:'boss',graze:0,phaseTimeout:75,phaseTime:5,player:{x:180,hp:3,maxHp:3},boss:{x:180,hp:100,maxHp:100,hitUntil:0,action:''},hazards:[]},patch);}

test('v37 sound observation never changes the fight it listens to',()=>{
 for(const bossIndex of [0,2,4,11]){
  const heard=run(bossIndex,91),silent=run(bossIndex,91),state=audio.newState();
  for(let i=0;i<2400&&silent.stage!=='won'&&silent.stage!=='lost';i++){
   const input={dx:Math.sin(i/37)*2,dy:Math.cos(i/53)};
   core.step(silent,input);core.step(heard,input);
   const frozen=JSON.stringify(heard),events=heard.events.slice();
   audio.collect(state,heard,events);
   assert.equal(JSON.stringify(heard),frozen);assert.equal(events.length,heard.events.length);
   heard.events.length=0;silent.events.length=0;
  }
  assert.equal(JSON.stringify(heard),JSON.stringify(silent));
  assert.equal(heard.tick,silent.tick);assert.equal(heard.score,silent.score);
 }
});

test('v37 a real boss fight produces the expected families of cues',()=>{
 const w=run(2,7),state=audio.newState(),count={};
 for(let i=0;i<6000&&w.stage!=='won'&&w.stage!=='lost';i++){
  if(i%400<300)w.player.hp=w.player.maxHp;
  core.step(w,{dx:Math.sin(i/40)*2,dy:0});
  for(const cue of audio.collect(state,w,w.events.splice(0))){assert(audio.CUES[cue.name],cue.name);assert(cue.pan>=-1&&cue.pan<=1);count[cue.name]=(count[cue.name]||0)+1;}
 }
 assert.equal(w.stage,'won');
 for(const name of ['bossHit','bossHitLow','graze','hurt','charge','laserWarn','laserFire','phaseBreak','skillMemory','win'])assert(count[name]>0,name+' never fired');
 assert.equal(count.win,1);assert.equal(count.phaseBreak,2);
});

test('v37 a new or resumed run sets a baseline instead of replaying old state',()=>{
 const state=audio.newState();
 const resumed=world({graze:40,boss:{x:90,hp:10,maxHp:100,hitUntil:500,action:'charge'},hazards:[{kind:'laser',id:1,phase:'active',x1:0,x2:0}]});
 assert.deepEqual(audio.collect(state,resumed,[{type:'phase',name:'x'}]),[]);
 assert.deepEqual(audio.collect(state,resumed,[]),[]);
 assert.deepEqual(names(audio.collect(audio.newState(),world({stage:'bossIntro'}),[])),['warning']);
});

test('v37 each cue fires on its transition only',()=>{
 const state=audio.newState();audio.collect(state,world({}),[]);
 assert.deepEqual(names(audio.collect(state,world({graze:2}),[])),['graze']);
 assert.deepEqual(audio.collect(state,world({graze:2}),[]),[]);
 const hit=world({graze:2,boss:{x:300,hp:100,maxHp:100,hitUntil:120,action:'charge'}});
 const cues=audio.collect(state,hit,[]);assert.deepEqual(names(cues),['bossHit','charge']);assert(cues[0].pan>0);
 assert.deepEqual(audio.collect(state,hit,[]),[]);
 const low=world({graze:2,boss:{x:60,hp:20,maxHp:100,hitUntil:140,action:'charge'}});
 assert.deepEqual(names(audio.collect(state,low,[])),['bossHitLow']);
 const warn=world({graze:2,boss:low.boss,hazards:[{kind:'laser',id:7,phase:'warning',x1:0,x2:0},{kind:'laser',id:8,phase:'warning',x1:360,x2:360}]});
 const warned=audio.collect(state,warn,[]);assert.deepEqual(names(warned),['laserWarn']);assert.equal(warned[0].count,2);
 assert.deepEqual(audio.collect(state,warn,[]),[]);
 warn.hazards[0].phase='active';warn.hazards[1].phase='active';
 const fired=audio.collect(state,warn,[]);assert.deepEqual(names(fired),['laserFire']);assert.equal(fired[0].count,2);assert.equal(fired[0].pan,0);
 warn.hazards[0].phase='fade';assert.deepEqual(audio.collect(state,warn,[]),[]);
 assert.deepEqual(names(audio.collect(state,warn,[{type:'skill',name:'counter'},{type:'shot'},{type:'checkpoint'},{type:'seal',name:'x'}])),['skillCounter','seal']);
});

test('v37 heartbeat and countdown follow the rules they announce',()=>{
 const state=audio.newState();audio.collect(state,world({}),[]);
 const hurt=patch=>world(Object.assign({player:{x:180,hp:1,maxHp:3}},patch));
 assert.deepEqual(names(audio.collect(state,hurt({tick:101}),[])),['heartbeat']);
 assert.deepEqual(audio.collect(state,hurt({tick:120}),[]),[]);
 assert.deepEqual(names(audio.collect(state,hurt({tick:167}),[])),['heartbeat']);
 assert.deepEqual(audio.collect(state,hurt({tick:168,stage:'transition'}),[]),[]);
 assert.deepEqual(audio.collect(state,world({tick:200,player:{x:180,hp:1,maxHp:1}}),[]),[]);
 const timer=audio.newState();audio.collect(timer,world({}),[]);
 const at=left=>names(audio.collect(timer,world({phaseTime:75-left}),[]));
 assert.deepEqual(at(20),[]);assert.deepEqual(at(10.5),[]);assert.deepEqual(at(9.9),['countdown']);assert.deepEqual(at(9.5),[]);
 assert.deepEqual(at(8.9),['countdown']);assert.deepEqual(at(2.9),['countdownLast']);assert.deepEqual(at(0),[]);
 // 남은 시간이 이미 10초 안쪽인 구간에서 이어 시작해도 첫 관찰은 울리지 않는다.
 const late=audio.newState();audio.collect(late,world({phaseTime:70}),[]);assert.deepEqual(names(audio.collect(late,world({phaseTime:70.01}),[])),[]);
});

function fakeContext(){
 const made={osc:0,noise:0,pan:0};
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(v){assert(v>0,'ramp target must be positive');}});
 const node=extra=>Object.assign({connect(){},start(){},stop(){if(this.onended)this.onended();},onended:null},extra);
 return {made,Ctor:function(){return {state:'running',currentTime:0,sampleRate:8000,destination:{},resume(){return Promise.resolve();},close(){return Promise.resolve();},
  createGain(){return node({gain:param()});},createDynamicsCompressor(){return node({threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});},
  createBuffer(c,n){return {getChannelData(){return new Float32Array(n);}};},createOscillator(){made.osc++;return node({frequency:param(),type:''});},
  createBufferSource(){made.noise++;return node({buffer:null,loop:false});},createBiquadFilter(){return node({frequency:param(),Q:param(),type:''});},
  createStereoPanner(){made.pan++;return node({pan:param()});}};}};
}

test('v37 every cue has a voice, respects its gap and the effects setting',()=>{
 let now=0;const fake=fakeContext(),fx=audio.create({AudioContext:fake.Ctor,now:()=>now});
 assert.equal(fx.play('graze'),false,'silent until the first user gesture unlocks audio');
 assert.equal(fx.unlock(),true);
 for(const name of Object.keys(audio.CUES)){now+=5000;assert.equal(fx.play(name,.5),true,name);}
 assert(fake.made.osc>40&&fake.made.noise>10&&fake.made.pan===Object.keys(audio.CUES).length);
 now+=5000;assert.equal(fx.play('graze'),true);now+=10;assert.equal(fx.play('graze'),false);now+=40;assert.equal(fx.play('graze'),true);
 fx.setEnabled(false);now+=5000;assert.equal(fx.play('kill'),false);
 const before=fake.made.osc;assert.deepEqual(names(fx.observe(world({}),[])),[]);assert.equal(fake.made.osc,before);
 fx.setEnabled(true);assert.equal(fx.play('nope'),false);
 const stats=fx.stats();assert.equal(stats.cues,Object.keys(audio.CUES).length);assert(stats.played>=stats.cues);assert(stats.skipped>=1);
 fx.dispose();assert.equal(fx.play('kill'),false);
});

test('v37 missing or failing Web Audio leaves the game playable',()=>{
 const none=audio.create({AudioContext:null});
 if(!globalThis.AudioContext&&!globalThis.webkitAudioContext){assert.equal(none.unlock(),false);assert.equal(none.stats().available,false);}
 const broken=audio.create({AudioContext:function(){throw new Error('blocked');}});
 assert.equal(broken.unlock(),false);assert.equal(broken.unlock(),false);assert.equal(broken.stats().available,false);
 assert.deepEqual(names(broken.observe(world({stage:'bossIntro'}),[])),['warning']);
});

test('v37 the page loads the sound module before the app and the app only reads through it',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),order=[...html.matchAll(/src="src\/([^"?]+)\.js/g)].map(m=>m[1]);
 assert(order.indexOf('audio-v37')>=0&&order.indexOf('audio-v37')<order.indexOf('app'));
 const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../src/audio-v37.js'),'utf8');
 assert.match(app,/audio\.fx\.observe\(world,events\)/);assert.match(app,/if\(audio\.fx\)audio\.fx\.unlock\(\)/);
 assert.doesNotMatch(source,/world\.[A-Za-z_.]+\s*(=[^=]|\+\+|--|\+=|-=)/,'the sound module must not assign to the world');
 assert.doesNotMatch(source,/new Audio\(|fetch\(|\.mp3|\.wav|\.ogg/,'sounds are synthesized, not downloaded');
});
