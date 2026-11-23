'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),P=require('../src/arcade-phase2-signatures-v43.js'),S=require('../src/arcade-phase2-source-ink-v43.js');
const {atlas,prepareAtlas,contact}=require('./helpers/phase2-source-image.cjs'),ctx={};
vm.runInNewContext(fs.readFileSync('src/arcade-phase2-art-v43.js','utf8'),ctx);
const art=ctx.HapilPhase2Art;
test.before(async()=>{for(const id of ['spatial-slash','meteor'])await prepareAtlas(art[id]);});
test('three disjoint source-alpha cuts only arm on the first fully visible three-cut tick',()=>{
 for(const d of ['gentle','normal','hell'])for(const side of [-1,1]){
  const s={stage:'card',difficulty:d,seg:77,boss:{actor:'balrog',hp:300,x:180,y:118},tick:0,player:{}},e=P.make(s,{stage:7,scene:'07',actor:'balrog',cardOrdinal:1,themeIndex:1,renderSpec:atlas(art['spatial-slash']),side});
  const p=e.plan,[start,aTicks,drift]=p.timing;
  a.equal(p.cuts.length,3);a.equal(p.countByCut.reduce((sum,n)=>sum+n,0),p.cells);
  a(p.coverage>.05&&p.coverage<.09);
  for(let k=0;k<3;k++){
   const rows=p.cutRows[k],trace=[];
   const r=rows.findIndex(x=>x.length!==0);s.player={x:rows[r][0]+.5,y:r+p.area.y0+.5};
   for(let t=0;t<start+aTicks+drift;t++){
    s.tick=t;trace.push(P.hit(e,s));if(t!==start)a(!trace[t]);
   }
   a(trace[start],'an original source-alpha point from each independent strike hits only on beat');
  }
  const clean=contact((x,y)=>!P.contains(p,x,y),310,510);[s.player.x,s.player.y]=clean;s.tick=start;a(!P.hit(e,s));
 }
});
test('real compact Hell: prelude cut 1/2 and recovery harmless; one ordinary impact, transparent gap and no-art safe',()=>{
 for(const mode of ['inside','outside','absent']){
  const s=A.createRun({seed:12,hero:'memory',entranceAll:true,difficulty:'hell',pacing:true,rhythm:true,growth:true,segment:77,compact:true,distort:false});
  N.fixtureAtlas(s,k=>mode==='absent'&&k==='spatial-slash'?null:atlas(art[k]));s.bombs=0;s.player.x=25;s.player.y=560;
  let point,first,alive=0,meteor=false;
  const got=[];
  for(let i=0;i<2100;i++){
   s.events.length=0;s.bombs=0;if(s.stage==='card')s.boss.hp=s.boss.maxHp;
   const q=N.inspect(s);meteor||=q?.theme==='meteor';
   // Keep unrelated setup alive; never shield the phase under test.
   if(!point&&q?.theme!=='spatial-slash')s.player.invulnerableUntil=s.tick+30;
   if(q?.theme==='spatial-slash'&&q.phase==='telegraph'&&!point){
    first=s.hits;const p=P.plan({theme:'spatial-slash',difficulty:s.difficulty,side:q.safeLane[0]<180?1:-1});
    point=mode==='inside'?contact((x,y)=>N.firstContactAt(s,x,y),325,500):contact((x,y)=>x>140&&x<210&&!N.firstContactAt(s,x,y)&&!P.contains(p,x,y),335,500);
    a(point);[s.player.x,s.player.y]=point;s.player.invulnerableUntil=0;
   }
   A.step(s,{});
   if(s.stage==='card')alive++;
   const now=N.inspect(s);if(point&&now?.cuts){got.push({...now.cuts,phase:now.phase,delta:s.hits-first,mask:N.hit(s),stock:s.bombs});if(now.phase==='decay'&&now.local>=5)break;}
  }
  a(meteor);
  if(mode==='absent'){a(!point&&alive>300);continue;}
  a(got.some(x=>x.phase==='telegraph'&&x.full===1)&&got.some(x=>x.phase==='telegraph'&&x.full===2));
  a(got.filter(x=>x.phase==='telegraph').every(x=>x.delta===0&&!x.mask&&x.stock===0));
  const hit=got.filter(x=>x.armed);a.equal(hit.length,1);a.equal(hit[0].full,3);a.equal(hit[0].delta,mode==='inside'?1:0);
  a(got.some(x=>x.phase==='decay'));a(got.filter(x=>x.phase==='decay').every(x=>!x.mask&&x.delta===(mode==='inside'?1:0)));
 }
});
