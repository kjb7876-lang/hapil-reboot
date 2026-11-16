'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const A=require('../src/arcade-v43.js'),root=path.join(__dirname,'..');
const KEY='hapil-arcade-checkpoint-v43',STAT='hapil-arcade-stats-v43';
function world(initial={}){
  const data={...initial},clock={now:Date.now()},fault={get:false,set:null},listeners={};
  class Clock extends Date{static now(){return clock.now;}}
  const w={HapilArcade:A,Date:Clock,localStorage:{getItem(k){if(fault.get)throw Error('denied');return data[k]??null;},setItem(k,v){if(fault.set===true||fault.set===k)throw Error('quota');data[k]=String(v);},removeItem(k){delete data[k];}},addEventListener(k,f){listeners[k]=f;},setTimeout(){},navigator:{},screen:{}};
  w.window=w;vm.createContext(w);for(const file of ['arcade-storage-v43.js','arcade-mobile-v43.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),w);
  return {w,data,clock,fault,listeners};
}
const spec={versionKey:'version',version:43,validate:v=>v&&v.version===43&&Array.isArray(v.cleared)?A.Progress.sanitize(v):null};
const progress=()=>A.Progress.record(A.Progress.fresh(),{stage:0,stars:3,score:1234},'normal');
function checkpoint(now){const stage=3;return {v:1,stage,seg:A.STAGES[stage].first+1,difficulty:'normal',at:now,hits:2,bombs:1,exp:160,fills:3};}
test('valid progress is backed up, and a corrupt primary recovers without losing stars or the damaged original',()=>{
  const {w,data}=world(),S=w.HapilSave,p=progress();
  assert(S.write('progress',p,spec));const damaged='{"version":43,"cleared":[';data.progress=damaged;
  assert.deepEqual(S.read('progress',spec,null),p);assert.equal(data['progress.invalid'],damaged);assert(S.status().recovered);
  assert(S.write('progress',p,spec));assert.deepEqual(JSON.parse(data.progress),p);assert.deepEqual(JSON.parse(data['progress.backup']),p);
});
test('unknown versions are never replaced or deleted, including a newer save appearing during a running session',()=>{
  const {w,data}=world(),S=w.HapilSave,p=progress();S.write('progress',p,spec);data.progress=JSON.stringify({...p,version:44});
  const future=data.progress;assert.deepEqual(S.read('progress',spec,null),p);assert(!S.write('progress',p,spec));assert(!S.remove('progress',spec));assert.equal(data.progress,future);assert(S.status().blocked);
  const other=world({progress:JSON.stringify(p),'progress.backup':JSON.stringify({...p,version:45})});
  assert(!other.w.HapilSave.write('progress',p,spec));assert.equal(JSON.parse(other.data['progress.backup']).version,45);
  const late=world();late.data[KEY]=JSON.stringify({v:2});assert(!late.w.HapilMobile.clearCheckpoint());assert.equal(late.data[KEY],'{"v":2}');
});
test('storage denial or quota failure leaves the previous save intact and reports failure',()=>{
  const {w,data,fault}=world(),S=w.HapilSave,p=progress();S.write('progress',p,spec);const before=data.progress;
  fault.set='progress';assert(!S.write('progress',A.Progress.fresh(),spec));assert.equal(data.progress,before);assert(!S.status().ok);
  fault.set=null;assert(S.write('progress',p,spec));assert(S.status().ok);
  fault.get=true;assert.equal(S.read('other',spec,null),null);assert(!S.status().ok);
});
test('both damaged copies are retained before a new valid save replaces them',()=>{
  const {w,data}=world({progress:'broken','progress.backup':'also broken'}),S=w.HapilSave;
  assert.equal(S.read('progress',spec,null),null);assert(S.status().reset);assert(S.write('progress',progress(),spec));
  assert.equal(data['progress.invalid'],'broken');assert.equal(data['progress.backup.invalid'],'also broken');
});
test('a full disk cannot prevent reading a valid backup into memory',()=>{
  const p=progress(),{w,data,fault}=world({progress:'damaged','progress.backup':JSON.stringify(p)});
  fault.set=true;assert.deepEqual(w.HapilSave.read('progress',spec,null),p);assert(!w.HapilSave.status().ok);
  assert.equal(data.progress,'damaged');assert.equal(data['progress.backup'],JSON.stringify(p));
});
test('malformed statistics and error entries cannot stop play or alter campaign progress',()=>{
  for(const raw of [{v:1},{v:1,frames:{}},{v:1,frames:{hist:[-1,'x',null]},stages:[]},null,[]]){
    const saved=JSON.stringify(progress()),{w,data}=world({[STAT]:JSON.stringify(raw),'hapil-arcade-errors-v43':'[null,{"at":"bad"}]',progress:saved});
    const s=A.createRun({stage:3,segment:A.STAGES[3].first+1});
    assert.doesNotThrow(()=>{w.HapilMobile.tick(s,'playing',16.7);w.HapilMobile.report();});
    assert(w.HapilMobile.checkpoint(3,'normal'));assert.equal(data.progress,saved);
  }
});
test('checkpoints reject negative or non-integer growth, future dates and mismatched sections; legacy optional fields still load',()=>{
  const now=Date.now(),valid=checkpoint(now);
  for(const patch of [{hits:-1},{bombs:1.5},{exp:2147483648},{fills:'3'},{at:now+60000},{seg:0},{difficulty:'__proto__'}]){
    const {w}=world({[KEY]:JSON.stringify({...valid,...patch})});assert.equal(w.HapilMobile.checkpoint(3,'normal'),null,JSON.stringify(patch));
  }
  const {w}=world({[KEY]:JSON.stringify(valid)});assert.equal(w.HapilMobile.checkpoint(3,'normal').exp,160);assert.equal(w.HapilMobile.checkpoint(3,'hell'),null);
  const old={...valid};delete old.exp;delete old.fills;const legacy=world({[KEY]:JSON.stringify(old)});assert.equal(legacy.w.HapilMobile.checkpoint(3,'normal').exp,undefined);
  const oldGrowth=A.createRun({stage:36,growth:true,grown:legacy.w.HapilMobile.checkpoint(3,'normal')});assert.equal(oldGrowth.power,5);assert.equal(oldGrowth.bombLevel,5);
  const expired=world({[KEY]:JSON.stringify({...valid,at:now-31*86400000})});assert.equal(expired.w.HapilMobile.checkpoint(3,'normal'),null);
});
test('checkpoint writes retry after a transient failure and clearing does not resurrect a backup',()=>{
  const {w,data,fault,clock}=world(),s=A.createRun({stage:3,segment:A.STAGES[3].first+1});
  fault.set=KEY;w.HapilMobile.tick(s,'playing',16);assert(!w.HapilSave.status().ok);
  fault.set=null;clock.now+=1100;w.HapilMobile.tick(s,'playing',16);assert(w.HapilMobile.checkpoint(3,'normal'));assert(w.HapilSave.status().ok);
  w.HapilMobile.clearCheckpoint();assert.equal(data[KEY],undefined);assert.equal(data[KEY+'.backup'],undefined);assert.equal(w.HapilMobile.checkpoint(3,'normal'),null);
});
test('first-section checkpoints retain earned growth, and resuming lower or zero growth never grants the stage-start estimate',()=>{
  const {w}=world(),stage=36,s=A.createRun({stage,segment:A.STAGES[stage].first});s.exp=60;s.fills=0;
  w.HapilMobile.tick(s,'playing',16);const saved=w.HapilMobile.checkpoint(stage,'normal');assert(saved);
  const resumed=A.createRun({stage,segment:saved.seg,growth:true,grown:saved});assert.equal(resumed.exp,60);assert.equal(resumed.power,2);assert.equal(resumed.fills,0);assert.equal(resumed.bombLevel,1);
  const zero=A.createRun({stage,growth:true,grown:{exp:0,fills:0}});assert.equal(zero.power,1);assert.equal(zero.bombLevel,1);
  const earned=A.createRun({stage:1,growth:true,grown:{exp:880,fills:15}});assert.equal(earned.power,6);assert.equal(earned.bombLevel,6);
});
test('the clear interval does not write a checkpoint back into the defeated boss',()=>{
  const {w,data}=world(),s=A.createRun({stage:3,segment:A.STAGES[3].first+1});w.HapilMobile.tick(s,'playing',16);
  s.results.push({stage:3,stars:3});s.stage='clear';w.HapilMobile.tick(s,'playing',16);const ms=w.HapilMobile._stats().playMs;
  for(let i=0;i<90;i++)w.HapilMobile.tick(s,'playing',16);
  assert.equal(data[KEY],undefined);assert.equal(data[KEY+'.backup'],undefined);assert.equal(w.HapilMobile._stats().playMs,ms);
});
test('a failed campaign save keeps the last checkpoint available as a fallback',()=>{
  const {w,data,fault}=world(),s=A.createRun({stage:3,segment:A.STAGES[3].first+1});w.HapilMobile.tick(s,'playing',16);const cp=data[KEY];
  fault.set=true;w.HapilSave.write('progress',progress(),spec);s.results.push({stage:3,stars:3});s.stage='clear';w.HapilMobile.tick(s,'playing',16);
  assert.equal(data[KEY],cp);
});
