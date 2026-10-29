'use strict';
// Native CPU Canvas and controlled skill-input fixtures only. Not browser,
// GPU, physical mobile, natural campaign, or approval of story gate readiness.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const Core=require('../src/story-combat.js'),Encounters=require('../src/story-encounters.js'),Renderer=require('../src/story-render.js');
const root=path.resolve(__dirname,'..'),binding=JSON.parse(fs.readFileSync(path.join(root,'docs/story/runtime-assets.json'))).bindings['dist00-boss'];
const skills=['memory','delay','parry','ego'];
function hash(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function pixelCountDifferent(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;}
async function actualFixture(){
 const assets={};for(const item of binding.images){const p=path.join(root,item.file);assert.equal(hash(p),item.sha256);const im=await loadImage(p);assert.equal(im.width,item.width);assert.equal(im.height,item.height);assets[item.key]=im;}
 const canvas=createCanvas(360,640);canvas.style={};const renderer=Renderer.create(canvas,{assets});renderer.resize(360,640,1);
 return {canvas,renderer,assets};
}
test('four real retained player atlases render only selected cells for real engine skill events',async()=>{
 const f=await actualFixture(),spec=Encounters.get('dist00-boss');try{
  for(const name of skills){
   const w=Core.create(spec,{runId:'visual-fixture-'+name,seed:42,difficulty:'normal'});
   // Only ego needs 45 memory; this explicit visual fixture raises resource, not HP or damage.
   if(name==='ego')w.memory=45;
   Core.step(w,{skill:name,skillRotation:false});
   assert.equal(w.stats.casts[name],1);assert(w.effects.some(e=>e.kind===name&&e.damaging===false));
   const before=JSON.stringify(w),without=JSON.parse(before);without.effects=without.effects.filter(e=>e.kind!==name);
   f.renderer.render(without,spec,binding.art);const base=Buffer.from(f.canvas.getContext('2d').getImageData(0,0,360,640).data);
   const m=f.renderer.render(w,spec,binding.art),withFx=Buffer.from(f.canvas.getContext('2d').getImageData(0,0,360,640).data);
   assert.equal(JSON.stringify(w),before,'rendering cannot mutate simulation');assert.equal(m.atlasEffectDraws,1);assert.equal(m.playerCoreLast,true);
   assert(pixelCountDifferent(base,withFx)>12,`${name} source art visibly changes rendered pixels`);
   for(let y=538;y<=542;y++)for(let x=178;x<=182;x++){const p=(y*360+x)*4;assert.deepEqual(withFx.subarray(p,p+4),base.subarray(p,p+4),'player hit core stays visible on top');}
  }
 }finally{f.renderer.dispose()}
});

test('first encounter stays gated despite source hash and CPU integration success',()=>{
 const Data=require('../src/story-scope.js').apply(require('../src/story-data.js')),Assets=require('../src/story-assets.js');
 const index=JSON.parse(fs.readFileSync(path.join(root,'docs/story/LIVE-ASSET-INDEX-current.json'))),ledger=JSON.parse(fs.readFileSync(path.join(root,'docs/story/asset-ledger.json')));
 const gate=Assets.create(Data,index,ledger),status=gate.entryStatus('dist00-boss');
 assert.equal(status.ready,false);assert(status.reasons.includes('integration-qa-not-verified'));assert(status.reasons.includes('behavior-qa-not-verified'));assert(status.reasons.includes('readability-qa-not-verified'));assert.equal(gate.summary().readyCount,0);
});
