'use strict';
/* 사용자 11-25 15:25·15:28 KST: "시공간왜곡을 기본7프로 확률로만두고 나머지는 성장나무에서 포인트로 강화해서 올리게하는거 어때 헬난이도에서도 적용되게 하고",
   "시공간 열매로해서 최대10개까지 장착가능하고 장착해지도 가능하게 개당7프로씩 확률증가 즉모두장착시77프로 … 그열매는 단계가 올라갈수록 맺을확률이 급격히 낮아지는거지". */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const h=require('./helpers/arcade-v43.cjs'),A=h.need(),G=require('../src/arcade-grove-v43.js');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('distortion is 7% base on every difficulty (hell too), +7% per equipped fruit, at most 77%, independent of attack level',()=>{
 for(const difficulty of ['gentle','normal','hell']){
  for(let n=0;n<=12;n++){const s=h.idle({difficulty,fruits:n});for(const lv of [1,4,7]){s.power=lv;assert.equal(A.distortChance(s),Math.round((7+7*Math.min(10,n)))/100,difficulty+' '+n+' Lv'+lv);}}
  for(const bad of [-3,NaN,'x',undefined,2.9])assert.equal(A.distortChance(h.idle({difficulty,fruits:bad})),bad===2.9?.21:.07);}
 assert.equal(A.FRUIT_SLOTS,10);assert.equal(A.distortChance(h.idle({fruits:10})),.77);
});

test('hell really rolls the distortion now (measured), and still never spends an automatic bomb',()=>{
 for(const [fruits,want] of [[0,.07],[10,.77]]){const s=h.idle({difficulty:'hell',seed:9,fruits});let slip=0;const N=3000;
  for(let i=0;i<N;i++){s.player.hp=3;s.player.invulnerableUntil=0;s.bombs=2;s.n=0;s.stage='break';const d=s.distorts;h.put(s,s.player.x,s.player.y,{bage:100});A.step(s,{dx:0,dy:0});
   if(s.distorts>d){slip++;assert.equal(s.player.hp,3);}else{assert.equal(s.player.hp,2);assert.equal(s.bombs,2,'hell: no automatic bomb');}h.clear(s);}
  assert(Math.abs(slip/N-want)<.025,'hell '+fruits+' fruits: '+slip/N);}
 const off=h.idle({difficulty:'hell',fruits:10,distort:false});assert.equal(off.noDistort,true);
});

test('fruit chances fall steeply stage by stage, and the ceiling guarantees the n-th bloom',()=>{
 assert.equal(G.SLOTS,10);assert.equal(G.CHANCE.length,10);assert.equal(G.COST.length,10);assert.equal(G.CHANCE[0],1);
 for(let i=1;i<10;i++){assert(G.CHANCE[i]<G.CHANCE[i-1]);assert(G.CHANCE[i]/G.CHANCE[i-1]<=.75,'steep drop '+i);assert(G.COST[i]>G.COST[i-1]);assert.equal(G.PITY[i],Math.ceil(2/G.CHANCE[i]));}
 const g=G.fresh();g.fruits=9;g.on=Array(9).fill(true);g.sap=1e6;let blooms=0;
 while(g.fruits<10){const r=G.feed(g,()=>.999999);assert(r.bloom);blooms++;}
 assert.equal(blooms,G.PITY[9],'never luckier than the ceiling with the worst roll');assert.equal(g.tries,0);assert.equal(G.next(g),null);
 assert.deepEqual(G.feed(g,()=>0),{poured:0,bloom:null},'a grown tree takes no more sap');
});

test('feeding pours sap into the bloom gauge; a bloom either sets a fruit (equipped at once) or only drops petals',()=>{
 const g=G.fresh();g.sap=60;let r=G.feed(g,()=>0);assert.deepEqual(r,{poured:60,bloom:null});assert.equal(g.grow,60);assert.equal(g.sap,0);
 g.sap=500;r=G.feed(g,()=>.99);assert.equal(r.poured,G.COST[0]-60);assert.equal(r.bloom.ok,true,'the first fruit is certain');assert.equal(g.fruits,1);assert.equal(g.on[0],true);assert.equal(g.grow,0);
 r=G.feed(g,()=>.71);assert.equal(r.bloom.ok,false);assert.equal(g.fruits,1);assert.equal(g.tries,1);
 r=G.feed(g,()=>.5);assert.equal(g.sap,500-(G.COST[0]-60)-2*G.COST[1]+0,'two blooms of stage 2 cost');assert.equal(r.bloom.ok,true);assert.equal(g.fruits,2);
 assert.equal(G.equipped(g),2);assert.equal(G.chancePct(g),21);
 G.toggle(g,0);assert.equal(G.equipped(g),1);assert.equal(G.chancePct(g),14);assert.equal(G.toggle(g,5),false,'no fruit there yet');
 G.setAll(g,false);assert.equal(G.chancePct(g),7);G.setAll(g,true);assert.equal(G.equipped(g),2);
});

test('score turns into sap incrementally (10,000 points each), without counting the same points twice',()=>{
 const g=G.fresh(),run={banked:0,sap:0};assert.equal(G.earn(g,run,9999),0);assert.equal(G.earn(g,run,25000),2);assert.equal(G.earn(g,run,25000),0);assert.equal(G.earn(g,run,30001),1);
 assert.equal(g.sap,3);assert.equal(g.total,3);assert.equal(run.sap,3);assert.equal(G.earn(g,null,1e9),0);
});

test('saved trees are cleaned on load and merged by the larger total; expected sap for all ten fruits is a long goal',()=>{
 const c=G.clean({sap:-5,total:'x',fruits:40,grow:1e9,tries:1e9,on:[0,1]});assert.equal(c.sap,0);assert.equal(c.fruits,10);assert.equal(c.grow,0);assert.equal(c.on.length,10);assert.equal(c.on[0],false);assert.equal(c.on[1],true);assert.equal(c.on[9],true);
 const d=G.clean({sap:10,fruits:2,grow:150,tries:1});assert.equal(d.grow,150);assert.equal(d.tries,1);assert.equal(G.clean(G.clean(d)).grow,150);
 assert.deepEqual(G.clean(null),G.fresh());
 assert.equal(G.merge({total:5,fruits:1},{total:9,fruits:0}).total,9);assert.equal(G.merge({total:9,fruits:3},{total:2,fruits:9}).fruits,3);
 const all=G.expectedSap(10);assert(all>50000&&all<80000,'about ten normal full clears: '+all);assert.equal(G.expectedSap(1),G.COST[0]);
});

test('the title menu opens the tree, the run receives the equipped fruits, and DEV runs earn no sap',()=>{
 const html=read('arcade.html'),app=read('src/arcade-app-v43.js');
 const a=html.indexOf('src/arcade-grove-v43.js'),b=html.indexOf('src/arcade-app-v43.js');assert(a>0&&a<b);
 assert(/id="arcade-grove"/.test(html)&&/id="arcade-grove-screen"/.test(html)&&/id="arcade-grove-body"/.test(html)&&/id="arcade-grove-back"/.test(html));
 assert(/fruits:Grove&&grove\?Grove\.equipped\(grove\):0/.test(app),'createRun gets the equipped count');
 assert(/function bankSap\(s\)\{if\(!Grove\|\|!grove\|\|!s\|\|!s\.groveRun\|\|devMode\)return 0;/.test(app));
 assert(/grove:'arcade-grove-screen'/.test(app));assert(/grove:grove\|\|undefined/.test(app),'record code carries the tree');
 const src=read('src/arcade-grove-v43.js');assert(!/#b23a2c|#c0392b|vermilion|인주색 칠/i.test(src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'')),'no seal red on the tree');
});
