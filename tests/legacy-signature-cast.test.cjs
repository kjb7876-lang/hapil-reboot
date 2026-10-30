'use strict';
// Real source pixels in native CPU canvas. This is a controlled rendering
// fixture, not a live natural-play, GPU, or actual-phone performance test.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
require('../src/projectiles.js');const api=global.HapilProjectiles;
const specs=[
 ['castVioletV11','violet-knot.png','c72f96123e091473cd5761aef62fe0d2ced7d7d5ed39ff56476b9a7e126fced5'],
 ['castHornV11','horn-swamp.png','a63d7814ed4a8c414c9ddbd4ccb2a083c31a8c6f94e9adcf7852e3e37358b50b'],
 ['castBalrogV11','balrog-fire.png','cd57c83c262e07a13128b920e57e66d4ac2ace0a8ebf63fffc4890f5cb0fb38a'],
 ['castMaskV11','mask-fan.png','fbe38267c2dc0b3d3704947fc08646909d8fa6673cd8125295805d524a7e2eaa'],
 ['castLuciferV11','lucifer-ring.png','e9106e21f663424bff962f59ef82700fb1af835a01799a450b4d585ed063bba9']
];
async function fixture(){
 const old=global.document;global.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1)}};
 const images={};for(const [key,file,sha] of specs){const src=path.join(__dirname,'../media/encounter-signature-v11',file),bytes=fs.readFileSync(src);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha);images[key]=await loadImage(src);assert.equal(images[key].width,96);assert.equal(images[key].height,96);}
 const c=createCanvas(180,180),ctx=c.getContext('2d'),fx=api.create(images);
 return {images,c,ctx,fx,close(){fx.destroy();global.document=old;}};
}
function sample(f,index,action,tick,release,progress=.6,low=false){
 f.ctx.clearRect(0,0,180,180);f.fx.beginFrame();const world={campaign:true,bossIndex:index,stage:'boss',phase:2,tick,boss:{x:90,y:65,action,actionProgress:progress,releaseTick:release}};
 f.fx.drawBossCast(f.ctx,world,low);return {pixels:Buffer.from(f.ctx.getImageData(0,0,180,180).data),metrics:f.fx.getMetrics()};
}
function countAlpha(p){let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;return n;}
test('each boss draws its own real static Drive accent during charge and genuine release only',async()=>{
 const f=await fixture();try{for(let i=0;i<5;i++)for(const low of [false,true]){
  const optionalBeam=['h14SkillViolet',null,'h14SkillBalrog','h14SkillMask','h14SkillLucifer'][i];assert.deepEqual(api.optionalAssetKeysForEncounter(i),[specs[i][0],...(optionalBeam?[optionalBeam]:[])]);assert(api.assetKeysForEncounter(i).includes(specs[i][0]));
  const charging=sample(f,i,'charge',100,-1,.6,low);assert.equal(charging.metrics.signatureCastDraws,1);assert.equal(charging.metrics.bossCastDraws,1);assert(countAlpha(charging.pixels)>12,'actual authored pixels visible');
  const before=sample(f,i,'attack',100,-1,.6,low);assert.equal(before.metrics.signatureCastDraws,0);assert.equal(countAlpha(before.pixels),0);
  const released=sample(f,i,'attack',100,100,.6,low);assert.equal(released.metrics.signatureCastDraws,1);assert(countAlpha(released.pixels)>12);
  const stale=sample(f,i,'attack',118,100,.6,low);assert.equal(stale.metrics.signatureCastDraws,0);assert.equal(countAlpha(stale.pixels),0);
  assert.deepEqual(sample(f,i,'charge',100,-1,.6,low).pixels,sample(f,i,'charge',106,-1,.6,low).pixels,'same static art, no generated frame loop');
 }assert.deepEqual(api.optionalAssetKeysForEncounter(-1),[]);
 }finally{f.close();}
});
test('optional missing or wrong-size casts create no fallback or blocking projectile asset requirement',async()=>{
 const f=await fixture();try{for(let i=0;i<5;i++){
  const key=specs[i][0],old=f.images[key];delete f.images[key];const absent=sample(f,i,'charge',50,-1);assert.equal(absent.metrics.signatureCastDraws,0);assert.equal(countAlpha(absent.pixels),0);assert.notEqual(api.invalidAssetForEncounter(f.images,i),key);
  const malformed=createCanvas(1,1);malformed.complete=true;malformed.naturalWidth=1;malformed.naturalHeight=1;f.images[key]=malformed;assert.equal(sample(f,i,'charge',50,-1).metrics.signatureCastDraws,0);f.images[key]=old;
 }}finally{f.close();}
});
test('Lucifer accent preserves source alpha while its cyan source is recolored to crimson and ivory',async()=>{
 const f=await fixture();try{const image=sample(f,4,'charge',50,-1).pixels;let colored=0,red=0;for(let i=0;i<image.length;i+=4)if(image[i+3]>0){colored++;if(image[i]>image[i+2]+8&&image[i]>image[i+1]+8)red++;}
 assert(colored>20);assert(red>colored*.25,'substantial source detail uses Lucifer crimson, rather than original cyan');
 }finally{f.close();}
});

test('boss accents retain source alpha and use only one screen draw without an added outline',async()=>{
 const f=await fixture();try{for(let i=0;i<5;i++){
  let draws=0;const ctx=new Proxy(f.ctx,{get(target,key){if(['fill','stroke','fillRect','strokeRect'].includes(key))return ()=>{throw Error('decorative geometry forbidden')};const value=target[key];if(key==='drawImage')return (...args)=>{draws++;return value.apply(target,args)};return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});
  f.ctx.clearRect(0,0,180,180);f.fx.beginFrame();f.fx.drawBossCast(ctx,{campaign:true,bossIndex:i,stage:'boss',phase:2,tick:50,boss:{x:90,y:65,action:'charge',actionProgress:.6,releaseTick:-1}},false);
  assert.equal(draws,1);const actual=f.ctx.getImageData(0,0,180,180).data;
  const tmp=createCanvas(i===2?96:100,i===2?96:100);tmp.getContext('2d').drawImage(f.images[specs[i][0]],i===2?0:2,i===2?0:2);
  const reference=createCanvas(180,180),ref=reference.getContext('2d');ref.globalAlpha=.25+.45*.6;ref.drawImage(tmp,54,99,72,72);
  const expected=ref.getImageData(0,0,180,180).data;let compared=0;
  for(let j=3;j<actual.length;j+=4){assert(Math.abs(actual[j]-expected[j])<=3,`alpha changed at ${j} for boss${i}`);if(expected[j])compared++;}
  assert(compared>20,'source contributes opaque and antialiased pixels');
 }}finally{f.close();}
});

test('dim horn decoration is brightened within its existing source alpha',async()=>{
 const f=await fixture();try{const actual=sample(f,1,'charge',50,-1,.6).pixels,src=f.images.castHornV11,render=createCanvas(180,180),ctx=render.getContext('2d'),tmp=createCanvas(100,100);tmp.getContext('2d').drawImage(src,2,2);ctx.globalAlpha=.25+.45*.6;ctx.drawImage(tmp,54,99,72,72);const original=ctx.getImageData(0,0,180,180).data;
 let difference=0,samples=0;for(let i=0;i<actual.length;i+=4)if(actual[i+3]>=24&&original[i+3]>=24){difference+=(actual[i]+actual[i+1]+actual[i+2])-(original[i]+original[i+1]+original[i+2]);samples++;}assert(samples>8);assert(difference/samples>35,'preexisting source pixels brighten for the dark encounter');
 }finally{f.close();}
});
