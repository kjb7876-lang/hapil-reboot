'use strict';
// Real29 core snapshots and optional presentation controls, native CPU only.
// Immune stream/laser observations and ordinary-health graze are separate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const a=require('./audit-object-projectiles-v24.cjs'),C=require('../src/core.js'),policy=require('./natural-bot-policy.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const FILES=['src/core.js','src/boss-flow-v29.js','src/boss-patterns-v27.js','src/boss-lasers-v28.js','src/render.js','src/projectiles.js','src/actors.js','src/app.js'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),json=x=>JSON.parse(JSON.stringify(x));
const hashes=()=>Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(a.ROOT,f)))]));
function world(index,phase=0,difficulty='hell',immune=true,tag='observer'){
  const first=C.createRun({campaign:true,campaignRevision:5,combatRevision:29,practiceBoss:true,bossIndex:index,difficulty,seed:813,runId:'v29-feedback-'+tag+'-'+index}),snap=C.checkpoint(first);snap.phase=phase;const w=C.restoreCheckpoint(snap);
  if(immune){w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;}return w;
}
function stream(index,phase){
  const w=world(index,phase);while(w.tick<220){const move=w.tick>=80&&w.tick<180?-1.5:0;C.step(w,{dx:move,dy:0,focus:true});}
  const pellets=w.bullets.filter(b=>b.v29Role==='aimed-stream');assert(pellets.length>0);
  return {w,summary:{scope:'Immune actual-core observation; attacks/skills disabled, legal precise movement after the warning bait was sampled.',tick:w.tick,pilot:{x:w.player.x,y:w.player.y,r:w.player.r},pellets:pellets.length,pulses:[...new Set(pellets.map(b=>b.v29PulseIndex))],baitPoints:[...new Set(pellets.map(b=>b.v29TargetX+','+b.v29TargetY))]}};
}
function laser(){
  const w=world(33,2);let h;
  for(let n=0;n<1500&&!h;n++){C.step(w,{});h=w.hazards.find(h=>h.laserBarrage&&h.phase==='warning'&&h.activeAt-w.tick>=12);}
  assert(h,'actual extra finite laser exists');const id=h.id,activeAt=h.activeAt,rows=[];
  for(const remaining of[12,1,0]){while(w.tick<activeAt-remaining)C.step(w,{});const current=w.hazards.find(h=>h.id===id);assert(current);assert.equal(current.phase,remaining?'warning':'active');rows.push({remaining,w:json(w),h:json(current)});}
  return rows;
}
function realGraze(){
  for(const index of[0,8,6]){
    const w=world(index,0,'normal',false,'graze'),inputs=[];
    for(let n=0;n<1400&&!['lost','won'].includes(w.stage);n++){
      const key=w.bullets.length||w.hazards.length?policy.linearMove(w):0,d=policy.directions[key];assert(d);inputs.push(key);C.step(w,{dx:d[0],dy:d[1]});
      if(w._lastGraze===w.tick&&w.player.invulnerableUntil<=w.tick&&w.player.hp>0){
        const replay=world(index,0,'normal',false,'graze');for(const key of inputs){const d=policy.directions[key];C.step(replay,{dx:d[0],dy:d[1]});}assert.equal(JSON.stringify(replay),JSON.stringify(w));
        return {w,summary:{scope:'Actual ordinary selected-mode HP/damage, default autoattack/skills, legal nine-direction inputs only. A short successful graze observation, not a complete campaign or human clear.',bossIndex:index,difficulty:'normal',tick:w.tick,hp:w.player.hp,maxHp:w.player.maxHp,actualGrazes:w.graze,lastGraze:w._lastGraze,exactInputReplay:true,inputs:inputs.join(''),inputSHA256:sha(Buffer.from(inputs.join('')))}};
      }
    }
  }
  throw Error('no ordinary-health graze found; do not fabricate a success timestamp');
}
function paint(box,images,w,precise){
  const canvas=createCanvas(360,640);canvas.style={};const renderer=box.HapilRenderer.create(canvas,images),before=JSON.stringify(w);renderer.resize(360,640,1);
  try{for(let n=0;n<3;n++)renderer.draw(w,0,w.time,false,{precise});const allocated=box.allocated.length;renderer.draw(w,0,w.time,false,{precise});assert.equal(box.allocated.length,allocated);assert.equal(JSON.stringify(w),before);
    const m=renderer.getMetrics(),p=m.projectilePresentation;assert.equal(p.missingProjectileAssets,0);assert.equal(p.stampCacheMisses,0);assert.equal(p.beamFrameCacheBuilds,0);assert(p.stampCacheBytes<=4194304&&p.stampCacheEntries<=96);assert(p.imminentCueDraws<=8);
    const snapshot=createCanvas(360,640);snapshot.getContext('2d').drawImage(canvas,0,0);
    return {canvas:snapshot,metrics:{playerFeedback:json(m.playerFeedback),imminentWarningCandidates:m.imminentWarningCandidates,imminentCues:json(p.imminentCues),missingProjectileAssets:p.missingProjectileAssets,warmStampMisses:p.stampCacheMisses,warmBeamBuilds:p.beamFrameCacheBuilds,stampCacheBytes:p.stampCacheBytes,skillCacheBytes:m.bossSkillsPresentation.skillCacheBytes}};
  }finally{renderer.destroy();}
}
function proof(frames,crops){
  const W=1080,H=2*666+150,c=createCanvas(W,H),ctx=c.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,W,H);
  for(let n=0;n<frames.length;n++){const f=frames[n],x=n%3*360,y=Math.floor(n/3)*666;ctx.drawImage(f.canvas,x,y+26);ctx.fillStyle='#e9e4da';ctx.font='13px Arial';ctx.fillText(f.label,x+6,y+17,348);}
  for(let n=0;n<crops.length;n++){const f=crops[n],x=n*180,y=1332;ctx.fillStyle='#9faebb';ctx.font='11px Arial';ctx.fillText(f.label,x+5,y+17,170);ctx.imageSmoothingEnabled=false;ctx.drawImage(f.canvas,f.x-16,f.y-16,32,32,x+26,y+31,128,128);}
  const bytes=c.toBuffer('image/jpeg',{quality:86});assert(bytes.length<=2700000);return {canvas:c,bytes};
}
async function main(){
  const initial=hashes(),box=a.runtime(),cache=new Map(),frames=[],records=[],crops=[];
  const s0=stream(0,0),s8=stream(8,2),g=realGraze(),lasers=laser();
  for(const [index,state,label,precise]of[[0,s0,'B0 real bait stream / t220',false],[8,s8,'B8 owned stream / precise',true],[g.summary.bossIndex,g,'Real graze / legal input / t'+g.w.tick,false]]){
    const group=index>=12?index+1:index,images=await a.imagesFor(box,group,cache),out=paint(box,images,state.w,precise);frames.push({...out,label});records.push({label,worldSHA256:sha(JSON.stringify(state.w)),summary:state.summary,metrics:out.metrics});
    if(state===s0){const focused=paint(box,images,state.w,true);crops.push({label:'same frame: normal r3',canvas:out.canvas,x:state.w.player.x,y:state.w.player.y},{label:'same frame: precise r3',canvas:focused.canvas,x:state.w.player.x,y:state.w.player.y});}
    if(state===g){assert(out.metrics.playerFeedback.grazePulse===1);crops.push({label:'actual graze: age 0',canvas:out.canvas,x:state.w.player.x,y:state.w.player.y});}
  }
  const images=await a.imagesFor(box,34,cache);
  for(const row of lasers){const out=paint(box,images,row.w,true),label=row.remaining?'real laser: '+row.remaining+' ticks to fire':'real laser: active';
    const selected=out.metrics.imminentCues.find(c=>c.id===row.h.id);assert.equal(!!selected,row.remaining>0);if(selected){assert.equal(selected.x,row.h.x1);assert.equal(selected.y,row.h.y1);assert.equal(selected.remainingTicks,row.remaining);}
    frames.push({...out,label});crops.push({label:'emitter '+(row.remaining?'-'+row.remaining:'active')+' / 4x',canvas:out.canvas,x:row.h.x1,y:row.h.y1});records.push({label,worldSHA256:sha(JSON.stringify(row.w)),actualRay:row.h,metrics:out.metrics});
  }
  assert.deepEqual(hashes(),initial);const rendered=proof(frames,crops),file='docs/v29-feedback-review/contact.jpg';fs.mkdirSync(path.dirname(path.join(a.ROOT,file)),{recursive:true});fs.writeFileSync(path.join(a.ROOT,file),rendered.bytes);
  const report={schema:1,date:'2026-11-01',scope:'Native CPU review of six real revision29 core frames. Stream/laser observations explicitly grant immunity and disable player attacks/skills; the separate ordinary-health graze records legal inputs and exact replay. 4x crops are labelled from those unchanged frames. Not human/full-story/browser/GPU/phone FPS.',productSHA256:initial,toolSHA256:sha(fs.readFileSync(__filename)),proof:{path:file,width:rendered.canvas.width,height:rendered.canvas.height,bytes:rendered.bytes.length,sha256:sha(rendered.bytes)},summary:{fullFrames:frames.length,crops:crops.length,missingProjectileAssets:records.reduce((n,r)=>n+r.metrics.missingProjectileAssets,0),warmStampMisses:records.reduce((n,r)=>n+r.metrics.warmStampMisses,0),warmBeamBuilds:records.reduce((n,r)=>n+r.metrics.warmBeamBuilds,0),maxStampCacheBytes:Math.max(...records.map(r=>r.metrics.stampCacheBytes)),maxSkillCacheBytes:Math.max(...records.map(r=>r.metrics.skillCacheBytes)),actualGrazeTick:g.w.tick,actualGrazeHP:g.w.player.hp},visualReview:{status:'pending direct inspection',notes:['Focus and graze remain cosmetic; actual hit radius stays3 and the white centre is still drawn last.','Imminent cue is only a small source-owned emitter inside the immutable warning capsule, not an active damage body.','Old unspecified/21/25/27/28 frames and actual active/fade material pixels are checked against the pinned v28 commit by the separate focused regression.','The inherited thin fitted ordinary projectile full-hitbody visibility limit below90% is unchanged.']},records};
  fs.writeFileSync(path.join(a.ROOT,'docs/V29-FEEDBACK-VISUAL-REVIEW-20261101.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({summary:report.summary,proof:report.proof})+'\n');return report;
}
module.exports={main};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
