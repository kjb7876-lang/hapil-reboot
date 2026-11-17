#!/usr/bin/env node
'use strict';
/* Search and replay continuous no-hit inputs for the actual first ordinary
 * rhythm card. This is seeded machine-route evidence, not a human-playability
 * proof. No immunity, bombs, passive evasion, position injection or hazard wipe
 * is used. Boss HP is replenished so native timeout, not player DPS, ends coverage.
 * node tools/audit-boss-rhythm-v43.cjs --output docs/v43/boss-rhythm-audit.json
 * node tools/audit-boss-rhythm-v43.cjs --verify docs/v43/boss-rhythm-audit.json
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const A=require('../src/arcade-v43.js'),R=require('../src/arcade-boss-rhythm-v43.js');
const ROOT=path.join(__dirname,'..'),DIFFICULTIES=['gentle','normal','hell'],SEEDS=[1,17,12345];
const SPEED=4.2,FOCUS_SPEED=1.8,HP=1e9;
const DIRECTIONS=[[0,0],[0,-1],[0,1],[-1,0],[1,0],[-Math.SQRT1_2,-Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,Math.SQRT1_2]];
const ACTIONS=[false,true].flatMap(focus=>DIRECTIONS.map(([x,y])=>({dx:x*(focus?FOCUS_SPEED:SPEED),dy:y*(focus?FOCUS_SPEED:SPEED),focus})));
const INPUT_KEYS=['dx','dy','focus'];
function sha(data){return crypto.createHash('sha256').update(data).digest('hex');}
function sources(){const files=['src/arcade-v43.js','src/arcade-boss-rhythm-v43.js','src/arcade-boss-intros-v43.js','src/arcade-heroes-v43.js',...fs.readdirSync(path.join(ROOT,'src/arcade-parts-v43')).filter(f=>f.endsWith('.js')).sort().map(f=>'src/arcade-parts-v43/'+f)];return Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));}
function cases({actors=R.ids,difficulties=DIFFICULTIES,seeds=SEEDS,layouts=[false,true]}={}){
 assert(difficulties.every(d=>DIFFICULTIES.includes(d)),'unknown difficulty');assert(seeds.every(Number.isSafeInteger),'integer seeds required');assert(layouts.every(v=>typeof v==='boolean'),'boolean layouts required');
 const out=[];for(const actor of actors){assert(R.ids.includes(actor),'unknown actor '+actor);
 const firstCards=A.SEGMENTS.map((g,segment)=>({g,segment})).filter(({g,segment})=>g.actor===actor&&A.isCinematicBoss(g.actor,g.mid)&&R.handles({rhythm:true,seg:segment},g,A));assert(firstCards.length,'missing first rhythm card '+actor);
 for(const {g,segment}of firstCards)for(const difficulty of difficulties)for(const seed of seeds)for(const compact of layouts)out.push({id:[actor,'stage'+(g.stage+1),difficulty,seed,compact?'compact':'desktop'].join('/'),actor,stage:g.stage,segment,difficulty,seed,compact});}return out;
}
function init(c){
 const s=A.createRun({segment:c.segment,difficulty:c.difficulty,seed:c.seed,compact:c.compact,hero:'memory',pacing:true,rhythm:true,distort:false});
 assert.deepEqual([s.player.x,s.player.y],[A.WIDTH/2,A.HEIGHT-84],'use the real bottom-centre spawn');
 assert.equal(s.player.invulnerableUntil,0);s.bombs=0;
 assert(A.prepareBossEntrance(s),'use the real cinematic entrance preparation');
 assert(R.handles(s,A.SEGMENTS[s.seg],A),'engine must select the replacement rhythm card');return s;
}
function legal(input){
 assert(input&&INPUT_KEYS.every(k=>Object.hasOwn(input,k)),'complete input');
 assert(Number.isFinite(input.dx)&&Number.isFinite(input.dy));assert.equal(typeof input.focus,'boolean');
 assert(Math.hypot(input.dx,input.dy)<=(input.focus?FOCUS_SPEED:SPEED)+1e-9,'input exceeds actual app movement speed');
 assert(!input.bomb,'bombs are forbidden');
}
function prepare(s){s.bombs=0;if(s.stage==='card')s.boss.hp=s.boss.maxHp=HP;}
function clean(s){s.events.length=s.cancelled.length=s.pops.length=s.zaps.length=0;}
function safe(s){return s.hits===0&&s.autoBombs===0&&s.distorts===0&&s.bombsUsed===0&&s.player.hp===s.player.maxHp&&s.player.invulnerableUntil===0;}
function done(s,c){return s.seg!==c.segment||s.stage==='bossClear'||s.stage==='won';}
function limit(c){return Math.ceil(A.cardDuration({difficulty:c.difficulty,paced:true},A.SEGMENTS[c.segment])*60)+A.BOSS_ENTRANCE_GRACE+180;}
function append(inputs,input){const last=inputs.at(-1);if(last&&last[0]===input.dx&&last[1]===input.dy&&last[2]===input.focus)last[3]++;else inputs.push([input.dx,input.dy,input.focus,1]);}
function aimInput(s,x,y,focus){
 if(s.stage!=='card')return {dx:0,dy:0,focus:false};
 let dx=x-s.player.x,dy=y-s.player.y,n=Math.hypot(dx,dy),speed=focus?FOCUS_SPEED:SPEED;
 if(n>speed){dx*=speed/n;dy*=speed/n;}
 // Truncation never rounds a component above the legal movement budget.
 return {dx:Math.trunc(dx*1e6)/1e6,dy:Math.trunc(dy*1e6)/1e6,focus};
}
function lineDistance(x,y,x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,L=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/L));return Math.hypot(x-x0-u*dx,y-y0-u*dy);}
function rank(s,goal){
 if(s.stage!=='card')return [{input:{dx:0,dy:0,focus:false},score:0}];
 const p=s.player,figures=s.figures.filter(f=>f.age+30>=f.warn&&f.age<f.warn+f.active).map(f=>({f,segments:A.figureSegments(f)}));
 return ACTIONS.map(input=>{
  let score=0;for(const t of [4,12,28]){
   const x=Math.max(8,Math.min(352,p.x+input.dx*t)),y=Math.max(40,Math.min(626,p.y+input.dy*t)),weight=t===4?4:t===12?2:1;
   let nearest=100;
   function hazard(di,penalty){nearest=Math.min(nearest,di);score+=weight*(di<0?penalty-di*30:10/(di+3));}
   for(let i=0;i<s.n;i++){
    if(s.bage[i]+t<Math.max(A.BLOOM_TICKS,s.bgrace[i]))continue;
    const bx=s.bx[i]+Math.cos(s.ba[i])*s.bs[i]*t/60,by=s.by[i]+Math.sin(s.ba[i])*s.bs[i]*t/60,r=A.bulletRadius(s,i)*s.rules.hitScale+p.r+3;
    hazard(Math.hypot(x-bx,y-by)-r,600);
   }
   for(const l of s.lasers){if(l.age+t<l.warn||l.age+t>=l.warn+l.active)continue;const angle=l.angle+(l.spin||0)*t/60;hazard(lineDistance(x,y,l.x,l.y,l.x+Math.cos(angle)*1000,l.y+Math.sin(angle)*1000)-l.width*A.BEAM_HIT*.5-p.r-3,900);}
   for(const {f,segments}of figures){if(A.figurePhase({...f,age:f.age+t},s.tick+t)!=='on')continue;for(const g of segments)hazard(lineDistance(x,y,...g)-f.width*A.BEAM_HIT*.5-p.r-3,800);}
   for(const r of s.risers||[]){if(r.age+t<A.RISER_WARN||r.fade)continue;const ry=Math.max(r.apex,r.y-r.vy*t);for(const c of A.MOTIFS[r.kind].hit)hazard(Math.hypot(x-r.x-c[0]*r.size,y-ry-c[1]*r.size)-c[2]*r.size-p.r-3,800);}
   if(s.floor){
    if(y>Math.min(A.floorTop(s,x-6),A.floorTop(s,x+6))-7)score+=weight*300;
    for(const q of s.floor.pieces)for(const c of q.cells){const x0=(q.col+c[0])*A.FLOOR_CELL+3,y1=q.y+3.7*t-c[1]*A.FLOOR_CELL-3;if(x>x0-p.r-4&&x<x0+24+p.r+4&&y>y1-24-p.r-4&&y<y1+p.r+4)score+=weight*900;}
   }
   score-=Math.min(36,nearest)*weight*.45;
   score+=(Math.abs(y-goal.y)*.009+Math.abs(x-goal.x)*.003)*weight;
   if(x<25||x>335)score+=weight*5;
  }
  score+=(input.focus?.05:0)+(input.dx||input.dy?.01:0);return {input,score};
 }).sort((a,b)=>a.score-b.score);
}
function snapshotMetrics(s,metrics,cardFrame){
 metrics.peakBullets=Math.max(metrics.peakBullets,s.n);metrics.peakLasers=Math.max(metrics.peakLasers,s.lasers.length);metrics.peakRisers=Math.max(metrics.peakRisers,(s.risers||[]).length);
 if(cardFrame)metrics.cardTicks++;else metrics.introTicks++;
}
function trial(c,policy){
 const s=init(c),inputs=[],metrics={peakBullets:0,peakLasers:0,peakRisers:0,introTicks:0,cardTicks:0,normalTicks:0,focusTicks:0};let failure=null;
 for(let t=0;t<limit(c)&&!done(s,c);t++){
  prepare(s);let input;const cardFrame=s.stage==='card';
  if(policy.kind==='target'){
   input=aimInput(s,policy.x,policy.y,policy.focus);legal(input);A.step(s,input);
  }else{
   // Forecast geometry only; never clone the engine's large bullet buffers.
   // A failed policy is restarted from the actual spawn, not rescued mid-run.
   input=rank(s,policy)[0].input;legal(input);A.step(s,input);
  }
  snapshotMetrics(s,metrics,cardFrame||s.bossEntrance&&s.bossEntrance.releasedTick===s.tick);
  append(inputs,input);metrics[input.focus?'focusTicks':'normalTicks']++;
  if(!safe(s)){failure={tick:s.tick,reason:'actual engine registered damage or defense',hits:s.hits,autoBombs:s.autoBombs,distorts:s.distorts};break;}
  clean(s);
 }
 if(!failure&&!done(s,c))failure={tick:s.tick,reason:'native timeout not reached'};
 if(!failure&&(!metrics.cardTicks||!metrics.peakBullets||!metrics.peakLasers))failure={tick:s.tick,reason:'required rhythm hazards were not observed',...metrics};
 return {ok:!failure,policy,inputs,metrics,engineTicks:s.tick,finalPosition:[s.player.x,s.player.y],nativeTimeoutSeconds:A.cardDuration(s,A.SEGMENTS[c.segment]),failure};
}
const POLICIES=[
 {kind:'target',x:60,y:500,focus:false},{kind:'target',x:300,y:500,focus:false},
 {kind:'forecast',x:180,y:500},{kind:'forecast',x:80,y:480},{kind:'forecast',x:280,y:480},
 {kind:'target',x:60,y:450,focus:true},{kind:'target',x:300,y:450,focus:true},
 {kind:'forecast',x:180,y:430}
];
function search(c){const attempts=[];for(const policy of POLICIES){const result=trial(c,policy);attempts.push({policy,failure:result.failure});if(result.ok)return {...result,attempts:attempts.length};}return {ok:false,attempts,inputs:[]};}
function verify(c,route){
 const s=init(c),inputHash=crypto.createHash('sha256');let ticks=0,cardTicks=0;
 for(const [dx,dy,focus,count]of route.inputs){assert(Number.isInteger(count)&&count>0,'positive RLE length');const input={dx,dy,focus};legal(input);
  for(let j=0;j<count;j++){assert(!done(s,c),'route continues beyond native first-card exit');prepare(s);const cardFrame=s.stage==='card';A.step(s,input);ticks++;
   if(cardFrame||s.bossEntrance&&s.bossEntrance.releasedTick===s.tick)cardTicks++;
   assert(safe(s),c.id+' replay registered a hit/defense at '+s.tick);inputHash.update(JSON.stringify(input));clean(s);
  }
 }
 assert(done(s,c),c.id+' route does not finish its actual native first card');assert.equal(ticks,route.engineTicks);assert.equal(cardTicks,Math.ceil(A.cardDuration(s,A.SEGMENTS[c.segment])*60),'complete native card duration');
 assert.equal(s.bombsUsed,0);assert.equal(s.autoBombs,0);assert.equal(s.distorts,0);assert.equal(s.hits,0);assert.equal(s.player.invulnerableUntil,0);
 return {verified:true,ticks,cardTicks,inputSha256:inputHash.digest('hex'),hits:s.hits,bombsUsed:s.bombsUsed,autoBombs:s.autoBombs,distorts:s.distorts};
}
function audit(selected,{progress=true}={}){
 const sourceHashes=sources(),samples=[];let lastActor='';
 for(const c of selected){const result=search(c);let replay=null;if(result.ok)replay=verify(c,result);
  samples.push({...c,passed:result.ok,route:result.ok?{policy:result.policy,inputs:result.inputs,engineTicks:result.engineTicks,nativeTimeoutSeconds:result.nativeTimeoutSeconds,finalPosition:result.finalPosition,...result.metrics}:null,attempts:result.attempts,replay,failure:result.ok?null:result.attempts});
  if(progress&&c.actor!==lastActor){process.stderr.write('audited '+c.actor+' ('+samples.length+'/'+selected.length+')\n');lastActor=c.actor;}
 }
 assert.deepEqual(sources(),sourceHashes,'simulation sources changed during audit; regenerate results');
 return {schemaVersion:1,command:'node tools/audit-boss-rhythm-v43.cjs --output docs/v43/boss-rhythm-audit.json',sourceHashes,
  scope:'Actual paced first ordinary rhythm card for every listed cinematic boss encounter, including repeat visits, from the real bottom-centre spawn through native timeout. This does not cover named spells, complete stages, every seed, prior combat history or human reaction limits.',
  method:{seeds:[...new Set(selected.map(c=>c.seed))],actors:[...new Set(selected.map(c=>c.actor))],difficulties:[...new Set(selected.map(c=>c.difficulty))],layouts:[...new Set(selected.map(c=>c.compact?'compact':'desktop'))],movement:{normal:SPEED,focus:FOCUS_SPEED,unit:'game pixels per engine tick'},start:[A.WIDTH/2,A.HEIGHT-84],bombs:0,passiveEvasion:false,invulnerability:false,bossHp:HP,
   bossHpNote:'Only boss HP/maxHP is replenished each card tick to prevent player fire from ending coverage before the existing native timeout. Native duration and all hazards remain unchanged.',
   preparation:'Uses prepareBossEntrance and the real 120-tick boss arrival pause. The audit never clears gameplay hazards; normal engine entrance/transition cleanup still runs. Floor, rising objects, mobs and fragments follow actual engine rules.',
   controls:'Searches several legal target paths, then a geometric hazard-forecast controller if needed. Each trial advances only one real engine state; a hit fails that trial. Successful full input streams are replayed on a fresh run.',
   limits:['A failed search is not proof that no route exists.','A successful seeded machine route is not proof of universal dodgability or human playability.','The 8-second rhythm may only partially repeat before the native 6–11-second first card ends. No artificial 16-second extension is used.','Normal and Hell use the same rhythm definition; their native card durations and life counts differ.']},
  summary:{cases:samples.length,passed:samples.filter(s=>s.passed).length,failed:samples.filter(s=>!s.passed).length,actors:new Set(selected.map(c=>c.actor)).size,visits:new Set(selected.map(c=>c.segment)).size,verifiedReplays:samples.filter(s=>s.replay&&s.replay.verified).length},samples};
}
function serialize(report){const {samples,...meta}=report;return JSON.stringify(meta,null,2).slice(0,-2)+',\n  "samples": [\n'+samples.map(s=>'    '+JSON.stringify(s)).join(',\n')+'\n  ]\n}\n';}
if(require.main===module){
 const args=process.argv.slice(2),opts={};let output,verifyFile;
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(arg==='--output')output=args[++i];else if(arg==='--verify')verifyFile=args[++i];else if(arg==='--actors')opts.actors=args[++i].split(',');else if(arg==='--seeds')opts.seeds=args[++i].split(',').map(Number);else if(arg==='--difficulties')opts.difficulties=args[++i].split(',');else if(arg==='--layout'){const v=args[++i];assert(['desktop','compact','both'].includes(v));opts.layouts=v==='both'?[false,true]:[v==='compact'];}else if(arg==='--list'){console.log(cases(opts).map(c=>c.id).join('\n'));process.exit(0);}else throw new Error('Unknown argument '+arg);
 }
 if(verifyFile){const report=JSON.parse(fs.readFileSync(verifyFile,'utf8'));assert.deepEqual(sources(),report.sourceHashes,'audit sources are stale');for(const s of report.samples){assert(s.passed,s.id+' was not passed');verify(s,s.route);}console.log('Verified '+report.samples.length+' stored no-hit routes.');}
 else{const report=audit(cases(opts));if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,serialize(report));}else process.stdout.write(serialize(report));console.error(JSON.stringify(report.summary));if(report.summary.failed)process.exitCode=1;}
}
module.exports={cases,init,legal,trial,search,verify,audit,serialize,sources,ACTIONS};
