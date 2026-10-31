'use strict';
// One-draw actual frozen core scenes for immediate direct pixel review.
// This is a screenshot generator, not a warm CPU timing measurement.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),a=require('./audit-boss-identities-v25.cjs');
function page(pictures,index){
  const c=a.createCanvas(240*pictures.length,900),ctx=c.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<pictures.length;i++)for(const[j,key]of['baseline','actual'].entries()){ctx.drawImage(pictures[i][key],i*240,j*450+24,240,426);ctx.fillStyle='#eee';ctx.font='13px sans-serif';ctx.fillText('G'+pictures[i].group+' '+key+' · CPU one draw',i*240+4,j*450+17);}
  return a.jpgProof(c,'docs/v25-pixels/quick-battle-page-'+index+'.jpg');
}
async function main(){
  const input=process.argv[2]||path.join(path.dirname(a.ROOT),'v25-collected-worlds.json'),data=JSON.parse(fs.readFileSync(input)),box=a.runtime(),old=a.runtime(a.BASE),before=a.hashes(),proofs=[],batch=[];
  const snapshots=data.scenes.map(([group,world])=>({group,world,detail:false}));for(const group of[5,7,9])for(const phase of[0,1]){const w=a.practice(box,group,phase,'hell',25);while(w.tick<235)box.HapilCore.step(w,{});snapshots.push({group,world:w,detail:true});}
  let index=0;
  for(const {group,world:w,detail}of snapshots){
    const images=await a.imagesFor(box,group,new Map(),old,true),pair={group,phase:w.phase,detail},immutable=JSON.stringify(w);
    for(const[name,scope]of[['baseline',old],['actual',box]]){const canvas=a.createCanvas(360,640);canvas.style={};const r=scope.HapilRenderer.create(canvas,images);try{r.resize(360,640,1);r.draw(w,0,w.time,false);const m=r.getMetrics();assert.equal(m.projectilePresentation.missingProjectileAssets,0);assert.equal(m.bossSkillsPresentation.skillMissingAssets,0);pair[name]=canvas;}finally{r.destroy();}}
    assert.equal(JSON.stringify(w),immutable);
    if(!detail){batch.push(pair);if(batch.length===6){const p=page(batch,++index);proofs.push(p);batch.length=0;console.log(JSON.stringify(p));}}
    if(detail||[1,2,5,7,9,17,22,27,29,34,35].includes(group)){const c=a.createCanvas(720,664),ctx=c.getContext('2d');ctx.fillStyle='#111722';ctx.fillRect(0,0,720,664);for(const[i,key]of['baseline','actual'].entries()){ctx.drawImage(pair[key],i*360,24);ctx.fillStyle='#eee';ctx.font='14px sans-serif';ctx.fillText('G'+group+' phase'+(w.phase+1)+' '+key+' native360x640',i*360+4,17);}proofs.push(a.jpgProof(c,`docs/v25-pixels/quick-native-group-${group}-phase-${w.phase+1}.jpg`));}
    console.log(JSON.stringify({group,phase:w.phase,detail}));
  }
  assert.equal(batch.length,0);assert.deepEqual(a.hashes(),before);a.writeReport('docs/v25-qa/immediate-scene-pixel-proofs.json',{scope:'One native CPU draw per exact actual immune core snapshot/runtime, not FPS/warm-cache measurement.',sourceHashes:before,sourceHashGuardPassed:true,proofs});
}
module.exports={main};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
