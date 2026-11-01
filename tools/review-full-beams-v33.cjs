'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const a=require('./audit-object-projectiles-v24.cjs'),m=require('./review-mobile-render-v30.cjs'),BASE='1001693e009e3bc4d1dbd1ad9b859ad5936dedf7';
async function main(){
 const old=a.runtime(BASE),box=a.runtime(),cache=new Map(),c=m.createCanvas(720,700),ctx=c.getContext('2d'),rows=[];ctx.fillStyle='#11131d';ctx.fillRect(0,0,720,700);ctx.font='12px sans-serif';ctx.fillStyle='#ece0c7';
 for(const [slot,index]of[8,6,4,11].entries()){
  const images=await a.imagesFor(box,index,cache,{},old);
  for(const [version,b]of[['before',old],['after',box]]){
   const w=m.world(b,index,2,300,31),f=m.fixture(b,images);try{
    const snapshot=JSON.stringify(w),out=f.draw(w,true);assert.equal(JSON.stringify(w),snapshot);assert.equal(out.metrics.projectilePresentation.missingProjectileAssets,0);
    const x=(slot%2)*360+(version==='after'?180:0),y=Math.floor(slot/2)*350;ctx.drawImage(f.canvas,x,y+24,180,320);ctx.fillText(['Lust','Envy','Lucifer','Pride'][slot]+' '+version,x+4,y+15);
    const rays=w.hazards.filter(h=>h.laserBarrage);if(version==='after')assert(rays.every(h=>Math.min(Math.abs(h.x2),Math.abs(h.x2-360),Math.abs(h.y2),Math.abs(h.y2-640))<1e-6));
    rows.push({index,version,tick:w.tick,rays:rays.map(h=>({id:h.id,phase:h.phase,x1:h.x1,y1:h.y1,x2:h.x2,y2:h.y2,width:h.width,activeAt:h.activeAt,expireAt:h.expireAt,reflected:!!h.v28Reflected})),missing:out.metrics.projectilePresentation.missingProjectileAssets});
   }finally{f.close();}
  }
 }
 const out=path.join(a.ROOT,'docs/v33');fs.mkdirSync(out,{recursive:true});const bytes=c.toBuffer('image/png');fs.writeFileSync(path.join(out,'full-beams-before-after.png'),bytes);
 fs.writeFileSync(path.join(out,'scene-review.json'),JSON.stringify({baseline:BASE,scope:'Native Canvas actual core31 HELL phase2 seed813 tick300 per version, immune, autoattack/skills disabled. Changed geometry means version worlds intentionally differ. Not phone/GPU FPS.',imageSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),rows},null,2)+'\n');console.log('Rendered eight actual source scenes');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
