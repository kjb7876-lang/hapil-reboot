'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/boss-motion.js');
const motion=global.HapilBossMotion;
function recorder(){
 const translations=[],draws=[],paths=[];let stack=[];
 return {globalAlpha:1,translations,draws,paths,
  save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},
  translate(x,y){translations.push([x,y]);},rotate(){},setLineDash(){},beginPath(){},
  moveTo(x,y){paths.push([x,y]);},lineTo(x,y){paths.push([x,y]);},stroke(){},
  drawImage(){draws.push({alpha:this.globalAlpha,args:[...arguments]});}
 };
}
test('keypose weight stays bounded and uses the real release tick without changing pose timing',()=>{
 for(const action of ['move','charge','attack','recover'])for(let age=-2;age<45;age++)for(const p of [0,.2,.7,1]){
  const b={action,actionProgress:p,releaseTick:100},w={tick:100+age};
  const q=motion.presentation(w,b);
  assert(q.dy>=-1.5&&q.dy<=2.5);assert(q.opacity>=.93&&q.opacity<=1);
  if(action!=='charge'&&(age<0||age>=6))assert.equal(q.dy,0);
 }
 const b={action:'attack',actionProgress:0,releaseTick:100};
 assert.equal(motion.presentation({tick:100},b).dy,2.5);
 assert(motion.presentation({tick:103},b).dy<2.5);
 assert.equal(motion.presentation({tick:106},b).dy,0);
 assert.deepEqual(motion.sample({tick:100},b),{from:1,to:1,blend:1});
 for(const releaseTick of [-1,100.5,NaN,Infinity])assert.equal(motion.presentation({tick:100},{...b,releaseTick}).dy,0);
});
test('sprite and tether use the same small offset, preserving the combat anchor and world state',()=>{
 for(const id of Object.keys(motion.contracts)){
  const c=motion.contracts[id],images={[c.key]:{complete:true,naturalWidth:512,naturalHeight:512}};
  const actor=Object.freeze({kind:id,action:'attack',actionProgress:0,releaseTick:100,lean:0,hitUntil:0});
  const world=Object.freeze({campaign:true,stage:'boss',boss:actor,tick:100,time:100/60});
  const original=JSON.stringify(world),ctx=recorder(),r=motion.create(images);
  assert(r.drawBoss(ctx,world,180,150,230,1));
  const m=r.getMetrics(),pose=c.poses[1];
  assert.deepEqual(m.lastSample.position,[180,152.5]);
  assert.deepEqual(m.lastSample.combatPosition,[180,150]);
  assert.deepEqual(ctx.translations,[[180,152.5]]);
  assert.equal(m.lastSilk.end[1],152.5+(pose.silk[1]-pose.anchor[1])*c.scale);
  assert.equal(JSON.stringify(world),original);
  assert.equal(m.authoredKeyposesPerBoss,4);assert.equal(m.fullAnimationCycles,0);assert.equal(m.sourcePivotsCertified,false);
 }
});
test('actual hit feedback is a subtle opacity pulse with no extra sprite or attack-pose override',()=>{
 const c=motion.contracts.balrog,images={[c.key]:{complete:true,naturalWidth:512,naturalHeight:512}};
 const world={campaign:true,stage:'boss',boss:{kind:'balrog',action:'attack',actionProgress:0,releaseTick:100,lean:0,hitUntil:102},tick:100,time:1};
 const ctx=recorder(),r=motion.create(images);r.drawBoss(ctx,world,180,150,230,1);
 assert.equal(ctx.draws.length,1);assert(Math.abs(ctx.draws[0].alpha-.93)<1e-12);
 assert.equal(r.getMetrics().lastPose,'downstroke');
 for(const hitUntil of [0,100,105,NaN,Infinity])assert.equal(motion.presentation({tick:100},{...world.boss,hitUntil}).opacity,1);
});
