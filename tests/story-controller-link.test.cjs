'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Combat=require('../src/story-combat.js'),Encounters=require('../src/story-encounters.js');
function dodge(w){
 const p=w.player;let best=Infinity,chosen={x:0,y:0};
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
  let n=Math.hypot(x,y),vx=x*(n>1?3/n:3),vy=y*(n>1?3/n:3),risk=0;
  for(const f of [8,20,36,54]){
   const px=Math.max(14,Math.min(346,p.x+vx*Math.min(f,24))),py=Math.max(300,Math.min(620,p.y+vy*Math.min(f,24)));
   for(const b of w.bullets){if(b.harmful===false)continue;const bx=b.x+b.vx*f/60,by=b.y+b.vy*f/60,l=b.halfLength||0;
    if(Math.abs(bx-px)>80||Math.abs(by-py)>80)continue;
    const d=Math.sqrt(Combat.geometry.segmentDistanceSquared(px,py,bx-Math.cos(b.angle)*l,by-Math.sin(b.angle)*l,bx+Math.cos(b.angle)*l,by+Math.sin(b.angle)*l))-3-b.r;
    risk+=d<3?10000:d<10?100/(d+1):d<22?3/(d+1):0;
   }
  }
  for(const h of w.hazards){if(h.harmful===false||h.activeAt>w.tick+70||h.fadeAt<=w.tick)continue;
   const f=Math.max(1,Math.min(40,h.activeAt-w.tick)),px=Math.max(14,Math.min(346,p.x+vx*f)),py=Math.max(300,Math.min(620,p.y+vy*f));
   const d=Math.sqrt(Combat.geometry.segmentDistanceSquared(px,py,h.x1,h.y1,h.x2,h.y2))-h.width/2-3;risk+=d<8?20000:d<24?300/(d+1):0;
  }
  risk+=Math.abs(p.x+vx*12-w.boss.x)*.008+Math.abs(p.y+vy*12-535)*.006+(Math.abs(x)+Math.abs(y))*.003;
  if(risk<best){best=risk;chosen={x,y};}
 }return chosen;
}
const canonical=Encounters.get('u203-boss');
test('the controller fight can sever only the repeated-command link, preserving the memory door',()=>{
 assert(Combat.supports(canonical));
 for(const mutate of [s=>s.stages[0].target='body',s=>s.stages[1].target='body',s=>s.sceneId='other',s=>s.id='other',s=>s.resolution='cleared',s=>s.stages.pop()]){
  let s=structuredClone(canonical);mutate(s);assert.equal(Combat.supports(s),false);
 }
 const w=Combat.create(canonical,{runId:'controller-natural',seed:12345,difficulty:'gentle'}),active={combatId:w.combatId,runId:w.runId,status:'active'};
 let input={};for(let i=0;i<15000&&w.status==='active';i++){if(i%3===0)input=dodge(w);Combat.step(w,input);assert.equal(w.stats.bodyDamage,0);assert.equal(w.boss.bodyProtected,true);}
 assert.equal(w.status,'won');const r=Combat.result(w);assert.equal(r.resolution,'command-severed');assert.equal(r.evidence.commandLinkCut,true);assert.equal(r.evidence.protectedBodyUntouched,true);assert.equal(r.evidence.bodyDamage,0);assert.equal(r.evidence.commandLinkDamage,2170);assert(Combat.verifyResult(r,active,w));
});
function harmlessSpec(pattern){return {id:'harmless-test',sceneId:'test',resolution:'cleared',stages:[{id:'stage',label:'표시',sourceExplicit:[],target:'body',damageSource:{harmful:false},adaptation:{pattern,windupTicks:24,activeTicks:150,recoveryTicks:60,intervalTicks:24,count:1,speed:200,spread:0}}]};}
test('harmless projectiles visibly exist but cannot damage, graze or cause reflected shots',()=>{
 const w=Combat.create(harmlessSpec('aimed'),{runId:'harmless-projectiles',seed:1,difficulty:'normal'});let hadBullet=false;
 for(let i=0;i<290;i++){Combat.step(w,{skillRotation:false});hadBullet ||= w.bullets.some(b=>b.harmful===false);}
 assert(hadBullet);assert.equal(w.player.hp,3);assert.equal(w.stats.hits,0);assert.equal(w.stats.graze,0);assert.equal(w.stats.reflected,0);
});
test('harmless active sweep cannot damage player along its committed path',()=>{
 const w=Combat.create(harmlessSpec('sweep'),{runId:'harmless-beam',seed:1,difficulty:'normal'});let active=false;
 for(let i=0;i<180;i++){Combat.step(w,{skillRotation:false});active ||= w.hazards.some(h=>h.phase==='active'&&h.harmful===false);}
 assert(active);assert.equal(w.player.hp,3);assert.equal(w.stats.hits,0);
});

test('first-eight medical director and ruin core target their own command structure without body damage',()=>{
 for(const id of ['mb-ep1a08','mb-ep1a10']){
  const s=Encounters.get(id);assert(Combat.supports(s));let body=structuredClone(s);body.stages[0].target='body';assert(!Combat.supports(body));let wrong=structuredClone(s);wrong.sceneId='other';assert(!Combat.supports(wrong));
  const w=Combat.create(s,{runId:id+'-natural',seed:12345,difficulty:'gentle'}),active={combatId:w.combatId,runId:w.runId,status:'active'};
  let input={};for(let i=0;i<12000&&w.status==='active';i++){if(i%3===0)input=dodge(w);Combat.step(w,input);assert.equal(w.stats.bodyDamage,0);}
  assert.equal(w.status,'won',id);const r=Combat.result(w);assert.equal(r.evidence.protectedBodyUntouched,true);assert.equal(r.evidence.bodyDamage,0);assert.equal(r.evidence.commandLinkDamage,1050);assert(Combat.verifyResult(r,active,w));
 }
});

test('vortex is survived then entered as a fall with no damage to the represented body',()=>{
 const s=Encounters.get('mb-ep1a07');assert(Combat.supports(s));let wrong=structuredClone(s);wrong.stages[0].target='body';assert(!Combat.supports(wrong));
 const w=Combat.create(s,{runId:'vortex-natural',seed:12345,difficulty:'gentle'});let input={};
 for(let i=0;i<12000&&w.status==='active';i++){if(i%3===0)input=dodge(w);Combat.step(w,input);assert.equal(w.stats.bodyDamage,0);assert.equal(w.stats.shots,0);}
 assert.equal(w.status,'won');const r=Combat.result(w);assert(r);assert.equal(r.resolution,'survive-and-fall');assert.deepEqual(r.evidence.stageTargets,['survival','survival']);assert.deepEqual(r.evidence.stageDamage,[0,0]);assert.equal(r.evidence.playerHp>0,true);assert.match(w.resultReason,/추락/);
 assert(Combat.verifyResult(r,{combatId:w.combatId,runId:w.runId,status:'active'},w));
});
