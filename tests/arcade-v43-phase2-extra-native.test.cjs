'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),sha=require('node:crypto');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js'),P=require('../src/arcade-phase2-signatures-v43.js'),art=require('../src/arcade-phase2-extra-art-v43.js'),E=require('../src/arcade-phase2-extra-v43.js')(P,A);
const slots=[227,321,325,489,572,574],difficulties={gentle:.5,normal:.6,hell:.7};
function spec(k){const d=art[k];return d&&{...d,image:{complete:true,naturalWidth:d.cellWidth*d.columns,naturalHeight:d.cellHeight*Math.ceil(d.frameCount/d.columns)}};}
function init(id,d,load=true){const s=A.createRun({seed:12,hero:'seoha',entranceAll:true,difficulty:d,pacing:true,segment:id,compact:true,distort:false});if(load)N.fixtureAtlas(s,spec);return s;}
function tick(s,input){s.events.length=0;A.step(s,input||{});}
function until(s,p,n=580){for(let i=0;i<n;i++){tick(s);const q=N.inspect(s);if(q&&p(q))return q;}throw Error('state not reached '+s.seg+' '+s.tick);}
test('six exact native spells carry untouched unique atlas digests and 18 clean warning/active schedules',()=>{
 const unique=new Set();
 for(const id of slots){
  const n=N.slotFor(id),d=art[n.theme];a.equal(sha.createHash('sha256').update(fs.readFileSync(d.path)).digest('hex'),d.sha256);a(!unique.has(d.sha256));unique.add(d.sha256);
  for(const [difficulty,cov] of Object.entries(difficulties)){
   const s=init(id,difficulty);s.player.invulnerableUntil=99999;
   const t=until(s,v=>v.phase==='telegraph');a.equal(t.local,0);a.equal(s.n,0);a.equal(s.segTick,0);a(Math.abs(t.coverage-cov)<1e-5);
   const lane=t.safeLane;s.player.x=(lane[0]+lane[1])/2;until(s,v=>v.phase==='active');a(!N.hit(s));a.equal(s.n,0,'native volley started during the signature');
  }
 }
});
test('the live Hell collision enters existing damage once, warning and safe cells harmless',()=>{
 const s=init(227,'hell');s.player.invulnerableUntil=999999;
 const w=until(s,v=>v.phase==='telegraph');const p=E.plan(s.seg,s.difficulty,w.safeLane[0]<180?1:-1);
 let x,y;for(let j=300;j<550&&!x;j++)for(let i=70;i<300;i++)if(P.contains(p,i,j)){x=i;y=j;break;}
 a(x);s.player.invulnerableUntil=0;s.bombs=0;s.player.x=x;s.player.y=y;tick(s);a.equal(s.hits,0);
 until(s,u=>u.phase==='active');a.equal(s.hits,1);tick(s);a.equal(s.hits,1);
});
test('missing art leaves native fire and full original card route running',()=>{
 const s=init(321,'hell',false);s.player.invulnerableUntil=999999;
 for(let i=0;i<460;i++)tick(s);
 a.equal(N.inspect(s)?.phase??null,null);a(s.segTick>90);a(s.enemyShotsBorn>0);
});
test('actual adjacent native Hell cards drain their fired bullets before the follow-on warning',()=>{
 const plan=A.plannedSegments('hell');
 for(const id of slots){
  const prev=plan[plan.indexOf(id)-1],s=init(prev,'hell');s.player.invulnerableUntil=999999;
  let shotCount=0,warning;
  for(let i=0;i<4000;i++){
   tick(s);
   if(!shotCount&&s.seg===prev&&s.stage==='card'&&s.segTick>400&&s.n){shotCount=s.n;s.boss.hp=0;}
   if(s.seg===id&&N.inspect(s)?.phase==='telegraph'){warning=N.inspect(s);break;}
  }
  a(shotCount>=45,'previous real card did not make its native shots');a(warning,'missing exact follow-on warning at '+id);a.equal(s.n,0);a.equal(s.segTick,0);
 }
});
test('cause-lock compact Hell starts on a real threatened point and reaches the selected safe lane on either side',()=>{
 for(const startX of [178,182]){
  const s=init(574,'hell');s.player.x=startX;s.bombs=0;
  const w=until(s,q=>q.phase==='telegraph'),target=(w.safeLane[0]+w.safeLane[1])/2,p=E.plan(574,'hell',startX<=180?1:-1);
  let entry=null;
  for(const y of [520,480,430,555,590,390,350,310]){
   for(let x=66;x<298;x+=2)if([-4,0,4].every(d=>P.contains(p,x+d,y)&&P.contains(p,x,y+d))){entry={x,y};break;}
   if(entry)break;
  }
  a(entry);s.player.x=entry.x;s.player.y=entry.y;s.player.invulnerableUntil=0;
  const first=s.tick;
  for(let i=0;i<w.timing[0]+w.timing[1]+3;i++){
   const v=N.inspect(s);
   tick(s,{dx:s.tick-first>=15&&v?.phase==='telegraph'?target-s.player.x:0});
   a.equal(s.hits,0);a.equal(s.bombs,0);a.equal(s.n,0);
   if(N.inspect(s)?.phase==='active'){a.equal(s.player.x,target);a(!N.hit(s));}
  }
 }
});
