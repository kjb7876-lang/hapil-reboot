'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {read}=require('./helpers/arcade-v43.cjs');
const source=read('src/arcade-app-v43.js');
const effects=JSON.parse(read('media/arcade-v43-fx/index.json')).effects;

function renderer(effect, options={}){
  const state={stage:'card',seg:2,tick:400,boss:{actor:'owner',x:175,y:128,present:true},player:{x:175,y:560}};
  const cast={actor:'owner',seg:2,tick:400,x:175,y:128,e:effect,big:false};
  let calls=[];
  const ctx={save(){},restore(){},drawImage(img,sx,sy,cw,ch,x,y,w,h){calls.push({frame:sx/cw,x,y,w,h,alpha:this.globalAlpha});}};
  const box={ctx,casts:[cast],fxImages:{[effect.file]:{}},lite:false,compact:false,crowd:0,
    bossDraw:{},bossKey:s=>s.boss.actor,tallOf:()=>144,SKILL_FX_BRIGHT:.4,paleOf(){return false;},themeColor(){return '#444';},...options};
  for(const fn of ['currentBossCast','castEnvelope','drawSkillFx']){
    const body=source.match(new RegExp('  function '+fn+'\\([^)]*\\)\\{[\\s\\S]*?\\n  \\}'));
    assert(body,fn);vm.runInNewContext(body[0],box);
  }
  return {state,cast,box,at(offset){state.tick=cast.tick+offset;calls=[];box.drawSkillFx(state);return calls;}};
}

test('each owned cast plays its authored frames in sequence with a soft arrival and departure',()=>{
  for(const effect of effects){
    const view=renderer(effect),frames=new Set(),opacities=[];
    for(let tick=0;tick<effect.frames*60/effect.fps;tick++){
      const calls=view.at(tick);
      for(const c of calls){
        assert(c.frame>=0&&c.frame<effect.frames,effect.file+' samples a real cell');
        assert(c.alpha>=0&&c.alpha<=1);frames.add(c.frame);
      }
      opacities.push(calls.reduce((sum,c)=>sum+c.alpha,0));
    }
    assert.equal(frames.size,effect.frames,effect.file);
    assert.equal(opacities[0],0);
    assert(opacities.at(-1)<.06&&Math.max(...opacities)>.6,effect.file+' fades without dropping the last drawing');
    assert.equal(view.at(Math.ceil(effect.frames*60/effect.fps)).length,0);
  }
});

test('aura sheets follow their caster, planted hits stay put, and released art leaves the muzzle',()=>{
  for(const placement of ['caster','impact','release']){
    const effect=effects.find(e=>e.placement===placement),view=renderer(effect);
    const first=view.at(12)[0];
    view.state.boss.x+=45;view.state.boss.y+=9;
    const next=view.at(22)[0];
    if(placement==='caster'){assert(Math.abs(next.x-first.x-45)<1e-8);assert(Math.abs(next.y-first.y-9)<1e-8);}
    else{assert.equal(next.x,first.x);if(placement==='impact')assert.equal(next.y,first.y);else assert(next.y>first.y);}
    assert.deepEqual(view.at(22)[0],next,'paused combat does not advance the drawing');
    view.state.seg++;assert.equal(view.at(23).length,0,'old art cannot jump to a new attack');
  }
  const impact=effects.find(e=>e.placement==='impact');
  const normal=renderer(impact),balrog=renderer(impact,{tallOf:()=>248});
  assert(balrog.at(12)[0].y-normal.at(12)[0].y>45,'the impact lands at the feet of a larger boss');
});

test('low graphics draws one cell, and nearby bullets and the player take visual precedence',()=>{
  const effect=effects.find(e=>Number.isInteger(e.softCutAfter));
  const full=renderer(effect),lite=renderer(effect,{compact:true,lite:true});
  const tick=Math.ceil((effect.softCutAfter+.65)*60/effect.fps);
  assert.equal(full.at(tick).length,2,'soften the authored silhouette jump');
  const [a]=lite.at(tick);assert.equal(lite.at(tick).length,1);
  assert(a.w<full.at(tick)[0].w);
  lite.box.crowd=1;const [busy]=lite.at(tick);assert(busy.alpha<a.alpha);
  lite.state.player={x:a.x+a.w/2,y:a.y+a.h/2};assert(lite.at(tick)[0].alpha<busy.alpha);
  lite.state.boss.leaving=true;assert.equal(lite.at(tick).length,0);
});
