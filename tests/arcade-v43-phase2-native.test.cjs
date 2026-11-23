'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),P=require('../src/arcade-phase2-signatures-v43.js');
const artSrc=fs.readFileSync('src/arcade-phase2-art-v43.js','utf8'),sandbox={};vm.runInNewContext(artSrc,sandbox);
const art=sandbox.HapilPhase2Art;
function face(x){
 const cells=x.cells,ims=cells?[Math.max(...cells.map(c=>c[0]+c[2])),Math.max(...cells.map(c=>c[1]+c[3]))]:[x.columns*x.cellWidth,Math.ceil(x.frameCount/x.columns)*x.cellHeight];
 return {...x,image:{complete:true,naturalWidth:ims[0],naturalHeight:ims[1]},alternateSpec:x.alternateSpec&&face(x.alternateSpec)};
}
function state(id,d,opts={}){
 const slot=N.slots[id],s=A.createRun({seed:12,entranceAll:true,difficulty:d,pacing:true,segment:opts.segment??slot.segment,compact:opts.compact||false,distort:false});
 for(let k=0;k<1600&&s.stage!=='card';k++){A.step(s,{});s.events.length=0;}
 assert.equal(s.stage,'card');s.segTick=48;s.player.invulnerableUntil=0;s.bombs=0;
 if(opts.atlas!==false)N.fixtureAtlas(s,t=>face(art[t]));return s;
}
function isolate(s,input={}){
 s.boss.hp=s.boss.maxHp=1e8;s.n=0;s.sn=0;s.figures.length=0;s.lasers.length=0;s.cannons.length=0;s.weapons.length=0;
 if(s.risers)s.risers.length=0;
 A.step(s,input);
}
function until(s,who,testLimit=1500){
 for(let i=0;i<testLimit;i++){isolate(s);const v=N.inspect(s);if(v&&who(v))return v;}
 throw Error(JSON.stringify({seg:s.seg,stage:s.stage,segTick:s.segTick,state:N.inspect(s)}));
}
test('all staged web assets are exact digests and every declared role/scene/card is real',()=>{
 const manifest=require('../media/phase2-v43/manifest.json');
 assert.equal(Object.keys(manifest).length,10);
 for(const [p,x] of Object.entries(manifest)){const bytes=fs.readFileSync('media/phase2-v43/'+p);assert.equal(bytes.length,x.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),x.sha256);}
 for(const [id,slot] of Object.entries(N.slots)){
  const g=A.SEGMENTS[slot.segment];assert.equal(g.actor,id);assert.equal(g.stage+1,slot.stage);assert.equal(String(A.STAGES[g.stage].scene),slot.scene);
  assert.equal(slot.role,g.mid?'midboss':A.partFinalStage(A.STAGES[g.stage].part)===g.stage?'episode':'main');
  for(const difficulty of ['gentle','normal','hell']){
   const plan=A.plannedSegments(difficulty).filter(i=>{const x=A.SEGMENTS[i];return x.kind==='card'&&x.actor===id&&x.stage===g.stage&&!x.mid;});assert.equal(plan[slot.ordinal],slot.segment);
  }
  for(const tag of slot.themes)assert(P.atlasSpec(face(art[tag]),tag),tag);
 }
});
test('native scheduling follows real six encounter slots and emits all available uniquely authored attacks',()=>{
 const seen=new Set();
 for(const [id,slot] of Object.entries(N.slots)){
  const s=state(id,'normal');s.player.invulnerableUntil=100000;
  for(const theme of slot.themes){
   const p=until(s,v=>v.phase==='telegraph'&&v.theme===theme);
   assert(Math.abs(p.coverage-.60)<1e-5,theme);
   assert.equal(p.local,0);assert.equal(p.segment,slot.segment);seen.add(p.theme);
   until(s,v=>v.phase==='active'&&v.theme===theme);
  }
 }
 assert.equal(seen.size,9);
});
test('actual native Wrath high origin settles physically without phantom hits, then preserves exact coverage on all difficulty sizes',()=>{
 for(const [d,target] of Object.entries({gentle:.50,normal:.60,hell:.70})){
  const s=state('p2_wrath',d,{compact:true});s.boss.y=s.boss.targetY=194;
  const p=until(s,v=>v.phase==='telegraph'),origin=p.origin;
  assert(d==='hell'?s.boss.y<194:s.boss.y===194);assert(Math.abs(origin.y-s.boss.y-10)<1);assert(Math.abs(p.coverage-target)<1e-5);
  assert.equal(s.hits,0);
  s.player.x=(p.safeLane[0]+p.safeLane[1])/2;s.player.y=560;
  until(s,v=>v.phase==='active');assert.equal(s.hits,0);assert.equal(N.hit(s),false);
 }
});
test('existing hit pipeline honors harmless warning, active damage, no repeats while invulnerable, and no missing-art fallback',()=>{
 const s=state('asmodeus','hell');const warn=until(s,v=>v.phase==='telegraph');
 assert.equal(s.hits,0);
 const mask=P.plan({theme:warn.theme,difficulty:s.difficulty,boss:s.boss,side:warn.safeLane[0]<180?1:-1});
 let x,y; for(let yy=250;yy<580&&x===undefined;yy+=10)for(let xx=60;xx<310;xx+=10)if(P.contains(mask,xx,yy)){x=xx;y=yy;break;}
 assert(x!==undefined);s.player.x=x;s.player.y=y;isolate(s);assert.equal(s.hits,0,'warning at a future hazard point is safe');
 until(s,v=>v.phase==='active');assert.equal(s.hits,1);assert(s.player.invulnerableUntil>s.tick);
 isolate(s);assert.equal(s.hits,1);
 const absent=state('asmodeus','hell',{atlas:false}),native=absent.segTick;for(let i=0;i<60;i++)isolate(absent);
 assert.equal(N.inspect(absent).phase,null);assert(absent.segTick>native);assert.equal(N.hit(absent),false);
 const guarded=state('asmodeus','normal');const marked=until(guarded,v=>v.phase==='telegraph');
 const nx=P.plan({theme:marked.theme,difficulty:guarded.difficulty,boss:guarded.boss,side:marked.safeLane[0]<180?1:-1});
 let px,py;for(let yy=240;yy<580&&px===undefined;yy+=12)for(let xx=65;xx<306;xx+=10)if(P.contains(nx,xx,yy)){px=xx;py=yy;break;}
 assert(px!==undefined);guarded.player.x=px;guarded.player.y=py;guarded.bombs=2;const hp=guarded.player.hp;
 until(guarded,v=>v.phase==='active');assert.equal(guarded.hits,1);assert.equal(guarded.autoBombs,1);assert.equal(guarded.player.hp,hp);

 const offslot=state('asmodeus','hell',{segment:N.slots.asmodeus.segment-1});for(let i=0;i<100;i++)isolate(offslot);assert.equal(N.inspect(offslot),null);
});
test('native executor impacts only the currently marked group, and genuine engine protected lane stays open',()=>{
 const s=state('executor','hell',{compact:true});const p=until(s,v=>v.phase==='telegraph');s.player.invulnerableUntil=100000;
 const plan=P.plan({theme:p.theme,difficulty:s.difficulty,boss:s.boss,side:p.safeLane[0]<180?1:-1});
 const groups=plan.landings.map(rows=>{for(let i=0;i<rows.length;i++)if(rows[i].length)return [rows[i][0]+.1,plan.area.y0+i+.1];throw Error('empty landing');});
 for(let land=0;land<groups.length;land++){
  until(s,v=>v.phase==='active'&&v.local===land*7);
  [s.player.x,s.player.y]=groups[land];assert(N.hit(s));[s.player.x,s.player.y]=groups[(land+1)%groups.length];assert(!N.hit(s));
  s.player.x=(p.safeLane[0]+p.safeLane[1])/2;s.player.y=530;assert(!N.hit(s));
 }
});
