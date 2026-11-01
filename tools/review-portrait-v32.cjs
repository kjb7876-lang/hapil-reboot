'use strict';
// Same-world comparison. Native Canvas CPU times are not browser/device FPS.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const a=require('./audit-object-projectiles-v24.cjs'),m=require('./review-mobile-render-v30.cjs');
const BASE='86f45afa49b282cfb20c03263904e576bc1b89f8',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const before=a.runtime(BASE),after=a.runtime(),cache=new Map(),rows=[];
  for(const index of [0,4,6,8,11,33]){
    const simulation=m.world(after,index,2,0,31);let peak=0,snapshot;while(simulation.tick<900){after.HapilCore.step(simulation,{});if(simulation.bullets.length>peak){peak=simulation.bullets.length;snapshot=JSON.stringify(simulation);}}const w=JSON.parse(snapshot),images=await a.imagesFor(after,index>=12?index+1:index,cache,{},before);
    const f=m.fixture(before,images),g=m.fixture(after,images),state=JSON.stringify(w);
    try{for(const low of [true,false]){
      const draw=x=>x.renderer.draw(w,0,w.time,low,{precise:true});
      for(let n=0;n<8;n++){draw(f);draw(g);}
      const reference=f.draw(w,low),candidate=g.draw(w,low),pixels=m.difference(reference.pixels,candidate.pixels);
      assert.equal(pixels.changedPixels,0,'optimization must preserve exact scene '+index);
      const times={before:[],after:[]},allocated=after.allocated.length;
      for(let block=0;block<6;block++)for(const key of block%2?['after','before']:['before','after'])for(let n=0;n<10;n++){const start=performance.now();draw(key==='before'?f:g);times[key].push(performance.now()-start);}
      assert.equal(after.allocated.length,allocated);assert.equal(JSON.stringify(w),state);
      const timing=Object.fromEntries(Object.entries(times).map(([key,t])=>{t.sort((a,b)=>a-b);return [key,{p50:t[30],p95:t[57],frames:t.length}];}));
      const metrics=g.renderer.getMetrics().projectilePresentation;
      rows.push({index,tick:w.tick,low,bullets:w.bullets.length,pixels,...timing,bindingHits:metrics.bodyBindingHits||0,offscreenSkipped:metrics.offscreenBulletDrawsSkipped||0,cacheBytes:metrics.stampCacheBytes,missing:metrics.missingProjectileAssets});
    }}finally{f.close();g.close();}
  }
  const report={baseline:BASE,scope:'Actual seeded HELL31 worlds at each boss maximum bullet count in first900ticks, immune, attacks/skills disabled; alternating60 warmed draw-only CPU samples. Not phone/GPU FPS.',source:Object.fromEntries(['src/render.js','src/projectiles.js'].map(p=>[p,sha(fs.readFileSync(path.join(a.ROOT,p)))])),rows};
  fs.mkdirSync(path.join(a.ROOT,'docs/v32'),{recursive:true});fs.writeFileSync(path.join(a.ROOT,'docs/v32/render-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows));return report;
}
module.exports={main,BASE};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
