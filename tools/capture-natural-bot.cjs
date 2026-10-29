'use strict';const core=require('../src/core.js'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const clamp=(a,l,h)=>Math.min(h,Math.max(l,a));
function pointseg(px,py,ax,ay,bx,by){let x=bx-ax,y=by-ay,d=x*x+y*y,t=d?clamp(((px-ax)*x+(py-ay)*y)/d,0,1):0;return Math.hypot(px-(ax+x*t),py-(ay+y*t));}
const dirs=[[0,0],[4,0],[-4,0],[0,4],[0,-4],[2.828,2.828],[2.828,-2.828],[-2.828,2.828],[-2.828,-2.828]];
function move(w){let p=w.player,best=0,bscore=Infinity;for(let a=0;a<dirs.length;a++){let [dx,dy]=dirs[a],score=0;
 for(let t of [6,12,20,30,42,56,72]){let x=clamp(p.x+dx*t,16,344),y=clamp(p.y+dy*t,260,614),weight=1/(1+t*.015);
  for(const b of w.bullets){let bx=b.x+b.vx*t/60,by=b.y+b.vy*t/60,l=b.halfLength||0,ux=Math.cos(b.angle||0)*l,uy=Math.sin(b.angle||0)*l;
   let d=pointseg(x,y,bx-ux,by-uy,bx+ux,by+uy)-(b.r||3)-p.r;if(d<0)score+=12000*weight;else if(d<38)score+=(38-d)*(38-d)*weight;
  }
  for(const h of w.hazards){if(w.tick+t<h.activeAt||w.tick+t>=h.fadeAt)continue;let d=pointseg(x,y,h.x1,h.y1,h.x2,h.y2)-h.width/2-p.r;if(d<0)score+=16000*weight;else if(d<35)score+=(35-d)*(35-d)*weight;}
 }
 let x=clamp(p.x+dx*30,16,344),y=clamp(p.y+dy*30,260,614);score+=(x-180)*(x-180)*.006+(y-540)*(y-540)*.012;
 if(a===0)score-=3;if(score<bscore){bscore=score;best=a;}}
 return best;}
const out=path.join(__dirname,'../tests/fixtures/natural-bot'),corePath=path.join(__dirname,'../src/core.js');fs.mkdirSync(out,{recursive:true});
const codeHash=crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex');
const records=[];
for(const difficulty of ['gentle','normal'])for(const seed of [813,42]){
 const w=core.createRun({campaign:true,difficulty,seed,runId:'natural-bot-'+difficulty+'-'+seed}),marks=[];let seen=w.checkpointSerial,sequence='';
 for(let n=0;n<110000&&!['lost','won'].includes(w.stage);n++){
  const key=move(w);sequence+=String(key);const dir=dirs[key];core.step(w,{dx:dir[0],dy:dir[1]});
  if(w.checkpointSerial!==seen){seen=w.checkpointSerial;marks.push([w.tick,w.bossIndex,w.stage,w.wave,w.phase,w.player.hp]);}
 }
 if(w.stage!=='won')throw Error(`Natural bot did not clear ${difficulty}/${seed}: ${w.stage} tick ${w.tick}`);
 const file=`${difficulty}-${seed}.moves.gz`,bytes=zlib.gzipSync(Buffer.from(sequence),{mtime:0});fs.writeFileSync(path.join(out,file),bytes);
 const rec={difficulty,seed,runId:w.runId,stage:w.stage,tick:w.tick,hits:w.stats.hits,hp:w.player.hp,score:w.score,killCount:w.kills,checkpointCount:w.checkpointSerial,phaseTicks:w.stats.phaseTicks,marks,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};records.push(rec);console.log(JSON.stringify({difficulty,seed,tick:w.tick,hits:w.stats.hits,hp:w.player.hp,file,bytes:bytes.length}));
}
if(crypto.createHash('sha256').update(fs.readFileSync(corePath)).digest('hex')!==codeHash)throw Error('Core changed during recording: regenerate replays');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({method:'Recorded from state-aware deterministic avoidance policy with ordinary 8-direction 240 px/sec movement, normal damage, auto-attack and skills. No modifications to run state, invulnerability, health, damage, or RNG. These are CPU bot simulations, not human/browser/mobile/GPU play.',directions:dirs,recordedCoreSha256:codeHash,records},null,2)+'\n');
