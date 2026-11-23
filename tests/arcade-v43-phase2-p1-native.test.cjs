'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),hash=require('node:crypto');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),P=require('../src/arcade-phase2-signatures-v43.js'),art=require('../src/arcade-phase2-p1-art-v43.js');
const bind=require('../src/arcade-phase2-p1-v43.js'),assets=Object.fromEntries(Object.values(art).map(d=>[d.artId,d]));
const E=bind(P,A,{assets,nativeOnly:true}),ids=[3,6,8,115,119,123],tiers={gentle:.5,normal:.6,hell:.7};
const {atlas,prepareAtlas,contact}=require('./helpers/phase2-source-image.cjs');
test.before(async()=>{for(const d of Object.values(art))await prepareAtlas(d);});
const spec=k=>atlas(art[k]);
function init(seg,d,load=true){
 const s=A.createRun({seed:12,hero:'seoha',entranceAll:true,difficulty:d,pacing:true,segment:seg,compact:true,distort:false});
 if(load)N.fixtureAtlas(s,spec);s.bombs=0;return s;
}
function tick(s,input={}){s.events.length=0;A.step(s,input);}
function until(s,p,limit=1000){for(let i=0;i<limit;i++){tick(s);const q=N.inspect(s);if(q&&p(q))return q;}throw Error('native stage failed '+s.seg+' '+s.tick);}
test('P1 exact mid/normal/episode quotas, canonical roles and Lucifer forms',()=>{
 a.deepEqual(ids.map(i=>N.slotFor(i).role),['midboss','main','main','episode','episode','episode']);
 a.deepEqual([115,119,123].map(i=>E.identity(i).form),['p1_seraph','lucifer','lucifer_alt11']);
 a.equal(E.identity(3).plain,'hypocycloid');
 for(const id of ids){
  const q=E.identity(id),d=art[q.theme],x=fs.readFileSync(d.path);
  a.equal(hash.createHash('sha256').update(x).digest('hex'),d.sha256);
  for(const [tier,target] of Object.entries(tiers))for(const side of [-1,1]){
   const p=E.plan(id,tier,side),[lo,hi]=p.safeLane;
   a.equal(p.cells,Math.round(201584*target));a.equal(hi-lo,q.stage===1?tier==='gentle'?64:tier==='normal'?49:42:42);
   a(p.rows.every(row=>row.every((x,i)=>i%2===1||row[i+1]<=lo||x>=hi)));
  }
 }
});
test('18 real entrance/phase schedules survive exact awake/role/form lifecycle with a protected active lane',()=>{
 for(const id of ids)for(const [tier,cov] of Object.entries(tiers)){
  const s=init(id,tier),q=E.identity(id),w=until(s,q=>q.phase==='telegraph'),lane=(w.safeLane[0]+w.safeLane[1])/2;
  a.equal(s.seg,id);a.equal(s.n,0);a.equal(s.boss.actor,q.actor);a.equal(!!s.boss.mid,q.role==='mid');
  if(q.role!=='mid')a.equal(s.formKey,q.stage-1+'|'+q.actor+'|'+q.formNo);
  if(q.stage===1&&tier==='gentle')a.equal(w.timing[0],180);
  a(Math.abs(w.maxClip-cov)<1e-5);a.equal(w.local,0);
  s.player.x=lane;s.player.y=520;s.player.invulnerableUntil=0;
  until(s,q=>q.phase==='active');a.equal(s.hits,0);a.equal(s.n,0);a(!N.hit(s));
  until(s,q=>q.phase==='decay');a.equal(s.hits,0);a(!N.hit(s));
 }
});
test('vulnerable actual stage-1 root hit once using native stocks and native iframe; warning remains harmless',()=>{
 const s=init(3,'hell');until(s,q=>q.phase==='telegraph');
 const probe=contact((x,y)=>N.firstContactAt(s,x,y),55,620);a(probe);
 [s.player.x,s.player.y]=probe;tick(s);a.equal(s.hits,0);a.equal(s.bombs,0);
 until(s,q=>q.phase==='active');a.equal(s.hits,1);a(s.player.invulnerableUntil>s.tick);tick(s);a.equal(s.hits,1);
});
test('rootlets group authoring has exact union but only the current seven-tick group is dangerous',()=>{
 const s=init(6,'hell'),w=until(s,q=>q.phase==='telegraph'),p=E.plan(6,'hell',w.safeLane[0]<180?1:-1);
 let coverage=0;
 const points=p.landings.map(rows=>{for(const l of rows)for(let i=0;i<l.length;i+=2)coverage+=l[i+1]-l[i];const i=rows.findIndex(r=>r.length);return [rows[i][0]+.5,i+p.area.y0+.5];});
 a.equal(coverage,p.cells);s.player.invulnerableUntil=99999;
 for(let g=0;g<3;g++){
  until(s,q=>q.phase==='active'&&q.local===g*7);
  const ink=contact((x,y)=>{s.player.x=x;s.player.y=y;return N.hit(s);},55,620);
  a(ink,'actual painted rootlet for group '+g);
  [s.player.x,s.player.y]=points[(g+1)%3];a(!N.hit(s));
 }
});
test('missing art or wrong Lucifer form fails closed without changing save/state schema',()=>{
 const absent=init(119,'hell',false);absent.player.invulnerableUntil=99999;
 for(let i=0;i<440;i++)tick(absent);
 a.equal(N.inspect(absent)?.phase??null,null);a(absent.enemyShotsBorn>0);
 const s=init(119,'hell');until(s,q=>q.phase==='telegraph');const activeKeys=Object.keys(s).sort();
 a(!activeKeys.some(k=>/phase2|signature|p1Native/i.test(k)));
 const clone=JSON.parse(JSON.stringify(s));a.equal(N.inspect(clone),null);a(!N.hit(clone));
 s.formKey='9|lucifer|2';a.equal(E.make(s,{art:spec('inscription-collapse')}),null);
});
test('native preceding tree/Lucifer cards drain honest bullet stock before phase-one signatures and preserve form keys',()=>{
 const plan=A.plannedSegments('hell');
 for(const id of ids.slice(1)){
  const prev=plan[plan.indexOf(id)-1],s=init(prev,'hell');s.player.invulnerableUntil=99999;
  let fired=0,first;
  for(let i=0;i<4000;i++){
   tick(s);
   if(!fired&&s.seg===prev&&s.stage==='card'&&s.segTick>410&&s.n){fired=s.n;s.boss.hp=0;}
   if(s.seg===id&&N.inspect(s)?.phase==='telegraph'){first=N.inspect(s);break;}
  }
  a(fired>0&&first,'expected real native adjacent-card transition for '+id);a.equal(s.n,0);a.equal(s.segTick,0);
  const q=E.identity(id);a.equal(s.formKey,q.stage-1+'|'+q.actor+'|'+q.formNo);
 }
});
