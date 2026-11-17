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
