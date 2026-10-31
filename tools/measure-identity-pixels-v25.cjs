'use strict';
// Same independent pixel thresholds as audit-boss-identities-v25. Reuse actual
// render caches and isolate collision sampling from the much larger viewport.
// The complete source image still contributes contrast and clipping metrics.
const assert=require('node:assert/strict'),a=require('./audit-boss-identities-v25.cjs');
function measure(painted,b){
  const {data,canvas}=painted,r=b.r,l=b.halfLength||0,angle=b.angle||0,ca=Math.cos(angle),sa=Math.sin(angle),hx=Math.abs(ca)*l+r,hy=Math.abs(sa)*l+r;
  let core=0,coreVisible=0,damage=0,damageVisible=0,edges=0,opaque=0,sum=0,sum2=0;const colours=new Set();
  for(let y=Math.max(0,Math.floor(b.y-hy)-1);y<=Math.min(canvas.height-1,Math.ceil(b.y+hy)+1);y++)for(let x=Math.max(0,Math.floor(b.x-hx)-1);x<=Math.min(canvas.width-1,Math.ceil(b.x+hx)+1);x++){
    const dx=x+.5-b.x,dy=y+.5-b.y,along=dx*ca+dy*sa,across=-dx*sa+dy*ca,alpha=data[(y*canvas.width+x)*4+3];
    if(Math.hypot(dx,dy)<Math.min(2,r*.55)){core++;coreVisible+=alpha>=180;}
    if(Math.hypot(Math.max(0,Math.abs(along)-l),across)<=r){damage++;damageVisible+=alpha>=128;}
  }
  for(let x=0;x<canvas.width;x++){edges+=data[x*4+3]>8;edges+=data[((canvas.height-1)*canvas.width+x)*4+3]>8;}
  for(let y=1;y<canvas.height-1;y++){edges+=data[(y*canvas.width)*4+3]>8;edges+=data[(y*canvas.width+canvas.width-1)*4+3]>8;}
  for(let i=0;i<data.length;i+=4)if(data[i+3]>=180){opaque++;const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];sum+=lum;sum2+=lum*lum;colours.add(`${data[i]>>3},${data[i+1]>>3},${data[i+2]>>3}`);}
  return {centralSamples:core,centralVisibleSamples:coreVisible,centralFraction:coreVisible/Math.max(core,1),damageSamples:damage,visibleDamageSamples:damageVisible,fullDamageFraction:damageVisible/Math.max(damage,1),opaquePixels:opaque,quantizedColours:colours.size,opaqueLumaDeviation:Math.sqrt(Math.max(0,sum2/Math.max(1,opaque)-(sum/Math.max(1,opaque))**2)),isolatedClippedEdgePixels:edges};
}
function paint(box,fx,canvas,w,b,low){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);let draws=0;const before=JSON.stringify([w,b]);
  const sourceOnly=new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','fillText','strokeText'].includes(k))return()=>{throw Error('primitive projectile replacement '+k);};const f=t[k];if(k==='drawImage')return(...args)=>{draws++;return f.apply(t,args);};return typeof f==='function'?f.bind(t):f;},set(t,k,v){t[k]=v;return true;}});
  fx.beginFrame();assert(fx.drawBullet(sourceOnly,w,b,low));assert.equal(JSON.stringify([w,b]),before);return{canvas,data:Buffer.from(ctx.getImageData(0,0,canvas.width,canvas.height).data),metrics:structuredClone(fx.getMetrics()),draws};
}
function copy(c){const n=a.createCanvas(c.width,c.height);n.getContext('2d').drawImage(c,0,0);return n;}
async function sourcePixels(box,old,collected){
  const cache=new Map(),rows=[],pictures=[],newOwnedVariants=new Set(),currentCanvas=a.createCanvas(256,256),oldCanvas=a.createCanvas(256,256);let group=-1,images,fx,priorFx,checked=0;
  try{for(const route of collected.routes){
    if(route.group!==group){if(fx)fx.destroy();if(priorFx)priorFx.destroy();group=route.group;images=await a.imagesFor(box,group,cache,old);assert.equal(box.HapilProjectiles.invalidAssetForEncounter(images,group),null);fx=box.HapilProjectiles.create(images);priorFx=old.HapilProjectiles.create(images);console.log(JSON.stringify({stage:'source-group',group}));}
    for(const angle of[0,Math.PI/4,Math.PI/2,Math.PI*3/4])for(const low of[false,true]){
      const b={...route.bullet,x:128,y:128,px:128,py:128,angle};if(b.kind==='hell-rotor')b.spinAngle=angle;
      const actual=paint(box,fx,currentCanvas,route.world,b,low),prior=paint(old,priorFx,oldCanvas,route.world,b,low),m=measure(actual,b),changed=!actual.data.equals(prior.data),owned=actual.metrics.ownedObjectDraws>0;
      if(checked++%97===0)assert.deepEqual(m,a.alphaMeasure(actual,b),'bounded geometric sampler must exactly equal full-viewport independent sampler');
      assert.equal(actual.metrics.missingProjectileAssets,0);assert.equal(m.isolatedClippedEdgePixels,0);assert(m.centralFraction>=.8,'visible collision centre '+JSON.stringify({group,b,low,m}));
      if(changed&&owned){assert(m.fullDamageFraction>=.9,'new whole object encloses full real hitbody '+JSON.stringify({group,b,low,m}));assert.equal(actual.draws,1);assert(m.quantizedColours>=12&&m.opaqueLumaDeviation>=3);Object.keys(actual.metrics.projectileVariantDraws||{}).forEach(v=>newOwnedVariants.add(v));}
      assert(actual.metrics.stampCacheBytes<=4194304&&actual.metrics.stampCacheEntries<=96);if(group===8)assert(!changed,'v24 Lust exact projectile pixels');
      rows.push({group,first:route.first,routeKey:a.routeKey(route.bullet),angle,quality:low?'low':'high',changed,ownedObject:owned,measurement:m,pixelSHA256:a.sha(actual.data),variantKeys:Object.keys(actual.metrics.projectileVariantDraws||{}),sourceKeys:Object.keys(actual.metrics.compactFamilies||{})});
      if(changed&&!low&&angle===0&&!pictures.some(p=>p.group===group))pictures.push({group,name:'g'+group,actual:copy(actual.canvas),baseline:copy(prior.canvas)});
    }
  }}finally{if(fx)fx.destroy();if(priorFx)priorFx.destroy();}
  return{rows,pictures,newOwnedVariants:[...newOwnedVariants]};
}
module.exports={measure,paint,sourcePixels};
