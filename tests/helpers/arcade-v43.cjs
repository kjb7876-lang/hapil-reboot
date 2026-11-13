'use strict';
/* v43 검사 공용 도구. 엔진과 원작 장면 표를 읽고, 자주 쓰는 준비 동작을 모은다. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','..');
let arcade=null,loadError=null;try{arcade=require('../../src/arcade-v43.js');}catch(e){loadError=e;}
const original=JSON.parse(fs.readFileSync(path.join(root,'docs/v41/original-scenes.json'),'utf8')).scenes;
const lane=require('./arcade-lane.cjs');
const need=()=>{assert(arcade,'src/arcade-v43.js must load: '+(loadError&&loadError.message));return arcade;};
const clear=s=>{s.events.length=0;s.cancelled.length=0;s.pops.length=0;};
function idle(options){const a=need(),s=a.createRun(Object.assign({difficulty:'normal',seed:1},options));s.stage='break';s.stageTick=-1e6;s.mobs.length=0;return s;}
function put(s,x,y,patch){const i=s.n++;for(const k of ['ba','bs','bturn','bacc','bmin','barg','bs2','bspin','bage','bat','bsize','bcolor','bgrazed','bmode','bgen'])s[k][i]=0;s.bmax[i]=400;s.bx[i]=x;s.by[i]=y;s.blife[i]=60000;s.bsize[i]=1;for(const k in patch||{})s[k][i]=patch[k];return i;}
/* 무적 봇으로 끝까지(또는 limit 틱까지) 돌린다. */
function play(options,limit,each){const a=need(),s=a.createRun(options);let i=0;
 for(;i<limit&&s.stage!=='won'&&s.stage!=='lost';i++){s.player.invulnerableUntil=s.tick+999;const target=s.stage==='card'?s.boss.x:s.mobs.length?s.mobs[0].x:180;
  a.step(s,{dx:Math.max(-4,Math.min(4,target-s.player.x)),dy:0});if(each)each(s,i);clear(s);}
 return {s,ticks:i};}
/* 한 부(part)의 구간마다 안전 통로를 검사한다. */
function lanePart(part){const a=need(),failures=[];let n=0;
 a.SEGMENTS.forEach((g,i)=>{if(a.STAGES[g.stage].part!==part)return;
  for(const [difficulty,compact] of [['gentle',false],['normal',false],['hell',false],['hell',true]]){const r=lane.check(a,{difficulty,compact,seed:17+i,segment:i});n++;
   if(r.emptyAt>=0||r.minOpen<4||r.ticks<=100)failures.push(`${difficulty}${compact?'/compact':''} #${i} ${a.STAGES[g.stage].name} ${r.name}: open ${r.minOpen} emptyAt ${r.emptyAt} ticks ${r.ticks}`);}});
 assert(n>0,'part '+part+' has segments');assert.deepEqual(failures,[]);}
/* 한 부를 세 난이도로 완주한다. */
function runPart(part){const a=need(),first=a.STAGES.findIndex(g=>g.part===part),count=a.STAGES.filter(g=>g.part===part).length;assert(first>=0);
 for(const difficulty of ['gentle','normal','hell']){const seen=[];let most=0;
  const r=play({difficulty,seed:5+part,stage:first,stages:count},900000,s=>{assert(s.n<=a.CAP&&s.events.length<=48&&s.mobs.length<=a.MOB_CAP&&s.lasers.length<=a.LASER_CAP&&s.itemCount<=a.ITEM_CAP);
   if(seen[seen.length-1]!==s.seg)seen.push(s.seg);if(s.n>most)most=s.n;});
  assert.equal(r.s.stage,'won',`part ${part} ${difficulty}`);assert.equal(r.s.dropped,0);
  const mine=a.SEGMENTS.map((g,i)=>i).filter(i=>a.STAGES[a.SEGMENTS[i].stage].part===part);assert.deepEqual(seen.filter(x=>x>=mine[0]),mine,'every segment of the part, in order');
  for(let i=0;i<r.s.n;i++)assert(Number.isFinite(r.s.bx[i])&&Number.isFinite(r.s.by[i])&&Number.isFinite(r.s.ba[i])&&Number.isFinite(r.s.bs[i]));
  assert(Number.isFinite(r.s.score)&&r.s.score>0);assert(most<=a.CAP*.85,'headroom under the cap: '+most);assert.equal(r.s.results.length,count,'one result per cleared stage');}}
module.exports={root,original,lane,need,clear,idle,put,play,lanePart,runPart,read:f=>fs.readFileSync(path.join(root,f),'utf8')};
