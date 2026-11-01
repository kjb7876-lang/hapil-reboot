'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const a=require('./audit-object-projectiles-v24.cjs'),m=require('./review-mobile-render-v30.cjs'),BASE='fb90bfb8c5bf9f63f7789b2c38fefc10927562ed';
async function main(){
 const old=a.runtime(BASE),box=a.runtime(),cache=new Map(),c=m.createCanvas(1080,700),ctx=c.getContext('2d'),rows=[];ctx.fillStyle='#11131d';ctx.fillRect(0,0,1080,700);ctx.font='12px sans-serif';ctx.fillStyle='#ece0c7';
 const cases=[[0,'Violet'],[4,'Lucifer'],[6,'Envy'],[8,'Lust'],[11,'Pride'],[33,'Rian / Ion']];
 for(const [slot,[index,name]]of cases.entries()){
  const images=await a.imagesFor(box,index>=12?index+1:index,cache,{},old),w=m.world(box,index,2,300,31),immutable=JSON.stringify(w),before=m.fixture(old,images),after=m.fixture(box,images);
  try{for(const low of[true,false]){
   for(let i=0;i<3;i++){before.draw(w,low);after.draw(w,low);}const allocated=box.allocated.length;
   const b=before.draw(w,low),d=after.draw(w,low);assert.equal(box.allocated.length,allocated);assert.equal(JSON.stringify(w),immutable);
   assert.equal(d.metrics.projectilePresentation.missingProjectileAssets,0);assert.equal(d.metrics.projectilePresentation.assetLaserDraws,b.metrics.projectilePresentation.assetLaserDraws);assert.equal(d.metrics.combatCopyDraws,b.metrics.combatCopyDraws);
   assert(d.metrics.projectilePresentation.stampCacheBytes<=4194304);assert.equal(d.metrics.projectilePresentation.stampCacheBytes,b.metrics.projectilePresentation.stampCacheBytes);
   rows.push({index,name,low,tick:w.tick,difference:m.difference(b.pixels,d.pixels),bullets:w.bullets.length,logicalLasers:d.metrics.projectilePresentation.assetLaserDraws,copies:d.metrics.combatCopyDraws,sourceCacheBytes:d.metrics.projectilePresentation.stampCacheBytes,missing:0,warmCanvasAllocations:box.allocated.length-allocated,backdrop:d.metrics.combatBackdropGrade,coreUnchanged:true});
   if(low)for(const [version,pixels]of[['before33',b],['after34',d]]){const image=m.createCanvas(360,640);image.getContext('2d').putImageData(new (require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]})).ImageData)(new Uint8ClampedArray(pixels.pixels),360,640),0,0);const x=slot%3*360+(version==='after34'?180:0),y=Math.floor(slot/3)*350;ctx.drawImage(image,x,y+24,180,320);ctx.fillText(name+' '+version,x+4,y+15);}
  }}finally{before.close();after.close();}
 }
 const out=path.join(a.ROOT,'docs/v34');fs.mkdirSync(out,{recursive:true});const bytes=c.toBuffer('image/png');fs.writeFileSync(path.join(out,'danmaku-before-after.png'),bytes);const report={baseline:BASE,scope:'Same actual HELL31 source worlds seed813 phase2 tick300, immune, attacks/skills disabled. Native Canvas comparison, not phone/GPU FPS.',sourceHashes:Object.fromEntries(['src/render.js','src/projectiles.js'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(a.ROOT,p))).digest('hex')])),imageSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),rows};fs.writeFileSync(path.join(out,'scene-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows));return report;
}
module.exports={main,BASE};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
