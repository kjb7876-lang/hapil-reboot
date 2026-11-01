'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const a=require('./audit-object-projectiles-v24.cjs'),m=require('./review-mobile-render-v30.cjs'),{BASE}=require('./review-portrait-v32.cjs');
async function main(){
  const old=a.runtime(BASE),box=a.runtime(),images=await a.imagesFor(box,8,new Map(),{},old),w=m.world(box,8,2,300,31),before=m.fixture(old,images),after=m.fixture(box,images),sheet=m.createCanvas(1080,670),ctx=sheet.getContext('2d'),rows=[];
  // Explicit presentation fixture: same actual core scene, six injected
  // cosmetic events to expose all four source phases. No claimed play result.
  ctx.fillStyle='#10131c';ctx.fillRect(0,0,1080,670);ctx.font='14px sans-serif';ctx.fillStyle='#e8e1d5';
  try{for(let step=0;step<3;step++){
    w.effects=[{kind:'hit',x:w.player.x,y:w.player.y,r:16,age:[.03,.12,.29][step],ttl:.35},{kind:'kill',x:140,y:240,r:45,age:[.05,.25,.52][step],ttl:.6}];
    const immutable=JSON.stringify(w);for(const [version,f]of[['before',before],['after',after]]){const out=f.draw(w,true),x=step*360+(version==='after'?180:0);ctx.drawImage(f.canvas,x,30,180,320);ctx.fillText(version+' '+step,x+8,20);rows.push({step,version,metrics:{hurt:out.metrics.hurtImpactDraws||0,defeat:out.metrics.defeatImpactDraws||0,cacheBytes:out.metrics.impactCacheBytes||0},effects:structuredClone(w.effects)});
      // Magnified crop is labelled and separate from the full scene.
      ctx.drawImage(f.canvas,90,190,100,100,x,370,180,180);ctx.fillText('defeat crop (1.8x)',x+5,574);ctx.drawImage(f.canvas,w.player.x-30,w.player.y-30,60,60,x+36,590,72,72);
    }assert.equal(JSON.stringify(w),immutable);
  }}finally{before.close();after.close();}
  const out=path.join(a.ROOT,'docs/v32');fs.mkdirSync(out,{recursive:true});const bytes=sheet.toBuffer('image/png');fs.writeFileSync(path.join(out,'impact-before-after.png'),bytes);
  const manifest={scope:'Native Canvas presentation fixture, actual seed813 Lust HELL31 tick300 background with explicitly injected cosmetic hit/kill events. Not a browser screenshot or natural-clear record.',baseline:BASE,rows,sourceAssets:['fxResonance','fxSlash'].map(key=>{const p=box.HapilMedia[key],b=fs.readFileSync(path.join(a.ROOT,p));return {key,path:p,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,source:'Existing verified project combat atlas; no new external license claim',conversion:key==='fxResonance'?'Runtime144px cells, luminance-preserving red-violet grade, alpha retained':'Runtime144px cells, original gold RGB/alpha'};}),image:{path:'docs/v32/impact-before-after.png',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}};
  fs.writeFileSync(path.join(out,'impact-provenance.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.image));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
