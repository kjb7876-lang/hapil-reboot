'use strict';
// Independent historical-hole regression plus current whole-hitbody visibility.
// The baseline intentionally recreates the prior real holes; no replacement
// threshold is substituted when an owned source changes its material colour.
const assert=require('node:assert/strict'),a=require('./audit-boss-identities-v25.cjs'),old=require('./audit-actual-projectiles-v20.cjs');
const TARGETS=[{group:23,r:3.8,l:0,kind:'orb'},{group:25,r:3.8,l:0,kind:'orb'},{group:29,r:3.8,l:0,kind:'orb'},{group:34,r:4,l:13,kind:'blade',sourceActorId:'baek-ion'}];
async function review(){
  const current=old.makeAPI(),prior=old.makeAPI(old.baseline),v24=old.makeAPI(a.BASE),images=await old.loadImages([current,prior,v24],TARGETS),rows=[],c=a.createCanvas(900,320),ctx=c.getContext('2d'),before=a.sha(a.source('src/projectiles.js'));
  ctx.fillStyle='#101622';ctx.fillRect(0,0,900,320);
  for(let index=0;index<TARGETS.length;index++){
    const spec=TARGETS[index];
    for(const angle of[0,Math.PI/4,Math.PI/2])for(const offset of[0,.25,.5])for(const paletteSlot of[0,1])for(const low of[false,true]){
      const options={angle,offset,paletteSlot,low},actual=old.paint(current,images,spec,options),previous=old.paint(prior,images,spec,options),last=old.paint(v24,images,spec,options),m=old.inspect(actual.data,actual.bullet),p=old.inspect(previous.data,previous.bullet),v=old.inspect(last.data,last.bullet);
      const row={group:spec.group,angle,offset,paletteSlot,quality:low?'low':'high',actual:m,historical:p,v24:v,relativeHistoricalLuma:m.centralAlphaWeightedLuminance/Math.max(.001,p.centralAlphaWeightedLuminance)};rows.push(row);
      assert(m.centralCoreVisibleFraction>=.8,'real opaque source center '+JSON.stringify(row));assert(m.centralBrightFraction>=.8,'center has coloured bright source pixels '+JSON.stringify(row));assert(m.centralAlphaWeightedLuminance>=p.centralAlphaWeightedLuminance*.9,'retained historical brightness floor '+JSON.stringify(row));
      assert(m.damageCapsuleVisibleFraction>=.9,'full actual circular/capsule hitbody is visible after pivot change '+JSON.stringify(row));
      if(angle===0&&offset===0&&paletteSlot===0&&!low){ctx.drawImage(previous.canvas,index*225,25,96,96);ctx.drawImage(actual.canvas,index*225+110,25,96,96);ctx.imageSmoothingEnabled=false;ctx.drawImage(actual.canvas,36,36,24,24,index*225,130,192,192);ctx.imageSmoothingEnabled=true;ctx.font='12px sans-serif';ctx.fillStyle='#eee';ctx.fillText('G'+spec.group+' old / source-detail',index*225+3,16);}
    }
  }
  assert.equal(a.sha(a.source('src/projectiles.js')),before,'source stable');const proof=a.jpgProof(c,'docs/v25-pixels/historical-luma-review.jpg');
  const report={schema:1,scope:'Native CPU, four historically affected actual radii/capsules ×3angles ×3subpixels ×2palette slots ×2qualities. Source exposure preserves material colour while retaining existing alpha180/luma50 and relative-brightness gates. No browser/GPU/mobile claim.',historicalBaseline:old.baseline,v24Baseline:a.BASE,projectileSHA256:before,summary:{cases:rows.length,minCentral:Math.min(...rows.map(r=>r.actual.centralCoreVisibleFraction)),minBright:Math.min(...rows.map(r=>r.actual.centralBrightFraction)),minRelativeHistoricalLuma:Math.min(...rows.map(r=>r.relativeHistoricalLuma)),minFullDamage:Math.min(...rows.map(r=>r.actual.damageCapsuleVisibleFraction)),minV24FullDamage:Math.min(...rows.map(r=>r.v24.damageCapsuleVisibleFraction))},rows,proof};
  a.writeReport('docs/v25-qa/historical-luma-review.json',report);return report;
}
module.exports={TARGETS,review};if(require.main===module)review().then(r=>console.log(JSON.stringify(r.summary))).catch(e=>{console.error(e.stack);process.exitCode=1;});
