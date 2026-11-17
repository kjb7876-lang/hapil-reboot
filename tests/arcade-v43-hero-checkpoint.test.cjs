'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),H=require('../src/arcade-heroes-v43.js');
const source=fs.readFileSync(path.join(__dirname,'../src/arcade-mobile-v43.js'),'utf8'),KEY='hapil-arcade-checkpoint-v43';
function sandbox(profiles=true){
 const storage={},w={HapilArcade:A,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>delete storage[k]},addEventListener(){}};
 if(profiles)w.HapilArcadeHeroes=H;w.window=w;vm.runInNewContext(source,w);return {M:w.HapilMobile,storage};
}
function middle(hero){const s=A.createRun({hero,stage:3,difficulty:'normal'});s.started=true;s.seg=A.STAGES[3].first+1;s.stage='wave';return s;}
test('checkpoint stores and restores every playable identity including both Seoha appearances',()=>{
 for(const profiles of [true,false])for(const hero of ['memory','seoha','seoha-b']){
  const {M,storage}=sandbox(profiles),s=middle(hero);s.exp=321;s.fills=8;M.tick(s,'playing',16);
  const saved=JSON.parse(storage[KEY]);assert.equal(saved.hero,hero);assert.equal(saved.exp,321);assert.equal(saved.fills,8);
  const cp=M.checkpoint(3,'normal');assert.equal(cp.hero,hero);const resumed=A.createRun({hero:cp.hero,stage:cp.stage,segment:cp.seg,grown:{exp:cp.exp,fills:cp.fills}});assert.equal(resumed.hero,hero);
  assert.equal(M.checkpoint(3,'hell'),null);assert.equal(M.checkpoint(4,'normal'),null);
 }
});
test('old Seoha checkpoints stay appearance A and missing or unknown hero values use memory',()=>{
 const {M,storage}=sandbox(),s=middle('memory');M.tick(s,'playing',16);const original=JSON.parse(storage[KEY]);
 for(const hero of [undefined,null,'unknown','__proto__','constructor',4,{}]){
  storage[KEY]=JSON.stringify(Object.assign({},original,{hero}));assert.equal(M.checkpoint(3,'normal').hero,'memory');
 }
 for(const hero of ['seoha','seoha-b']){storage[KEY]=JSON.stringify(Object.assign({},original,{hero}));assert.equal(M.checkpoint(3,'normal').hero,hero);}
 s.hero='not-playable';s.seg++;M.tick(s,'playing',16);assert.equal(JSON.parse(storage[KEY]).hero,'memory');
});
test('damaged checkpoint indices and timestamps are rejected instead of silently starting a different segment',()=>{
 const {M,storage}=sandbox(),s=middle('seoha-b');M.tick(s,'playing',16);const valid=JSON.parse(storage[KEY]);
 for(const patch of [{seg:String(valid.seg)},{seg:valid.seg+.5},{seg:-1},{seg:A.SEGMENTS.length},{stage:'3'},{stage:-1},{at:String(valid.at)},{at:Date.now()+60000},{at:Date.now()-31*24*3600*1000}]){
  storage[KEY]=JSON.stringify({...valid,...patch});assert.equal(M.checkpoint(3,'normal'),null,JSON.stringify(patch));
 }
 for(const broken of ['{broken','null','[]','{"v":2}']){storage[KEY]=broken;assert.equal(M.checkpoint(3,'normal'),null);}
 storage[KEY]=JSON.stringify(valid);assert.equal(M.checkpoint(3,'normal').seg,valid.seg);
});
test('legacy or damaged carry values become safe nonnegative integers without signed overflow',()=>{
 const {M,storage}=sandbox(),s=middle('seoha-b');M.tick(s,'playing',16);const valid=JSON.parse(storage[KEY]);
 for(const value of [undefined,null,'500',-1,{},false]){
  storage[KEY]=JSON.stringify({...valid,hits:value,bombs:value,exp:value,fills:value});const cp=M.checkpoint(3,'normal');
  for(const k of ['hits','bombs','exp','fills'])assert.equal(cp[k],0,k);assert.equal(cp.hero,'seoha-b');
 }
 storage[KEY]=JSON.stringify({...valid,hits:2.9,bombs:1e30,exp:1e30,fills:13.9});const cp=M.checkpoint(3,'normal');
 assert.equal(cp.hits,2);assert.equal(cp.bombs|0,2147483647);assert.equal(cp.exp|0,2147483647);assert.equal(cp.fills,13);
 const next=A.createRun({hero:cp.hero,segment:cp.seg,grown:{exp:cp.exp|0,fills:cp.fills|0}});assert(Number.isFinite(next.exp));assert.equal(next.power,7);assert.equal(next.hero,'seoha-b');
});
