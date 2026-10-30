'use strict';
// Native CPU only: actual frozen-core clone states, before/current actor painter.
// Phase observations disable outgoing damage and use explicit immunity. These
// images are not natural progress, browser/GPU timing or full animation cycles.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const ROOT=path.resolve(__dirname,'..'),BASE='03c0f984b2e709f2946a56794eaa97d29dba89f5',sha=x=>crypto.createHash('sha256').update(x).digest('hex'),core=require('../src/core.js');
global.document={createElement(){return createCanvas(1,1)}};for(const mod of ['story-assets','boss-motion','actors'])require('../src/'+mod+'.js');
const beforeSource=cp.execFileSync('git',['show',BASE+':src/actors.js'],{cwd:ROOT,encoding:'utf8'}),box={document:global.document,HapilBossMotion:global.HapilBossMotion,HapilStoryAssets:global.HapilStoryAssets,HapilCore:core};box.window=box;vm.runInNewContext(beforeSource,box,{filename:'deployed-v21-actors.js'});const beforeAPI=box.HapilActors,currentAPI=global.HapilActors,media=require('./read-media-registry.cjs')();
const FILES=['src/core.js','src/actors.js','src/story-assets.js','src/boss-motion.js'];const hashes=()=>Object.fromEntries(FILES.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
function actual(group,tick){const index=group>=13?group-1:group;let w=core.createRun({campaign:true,campaignRevision:5,practiceBoss:true,bossIndex:index,combatRevision:21,difficulty:'hell',seed:813,runId:'v22-copy-pixels-'+group});const s=core.checkpoint(w);s.phase=2;w=core.restoreCheckpoint(s);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;while(w.tick<tick)core.step(w,{});return w;}
async function main(){
 const codeHashes=hashes(),canvas=createCanvas(1440,1140),ctx=canvas.getContext('2d'),rows=[],sources={};ctx.fillStyle='#0e1727';ctx.fillRect(0,0,1440,1140);
 const cases=[{group:0,label:'VIOLET',tick:244},{group:5,label:'SLOTH',tick:244},{group:20,label:'FALLEN KNIGHT',tick:244},{group:30,label:'SIREN',tick:244},{group:34,label:'RIAN / ION',tick:244},{group:0,label:'VIOLET / SKIPPED FINAL SHOT',tick:502}];
 for(let n=0;n<cases.length;n++){
  const {group,tick,label}=cases[n],w=actual(group,tick),keys=group>=19?global.HapilStoryAssets.assetKeysForEncounter(group):group>=5?global.HapilActors.sinAssetKeysForEncounter(group):[global.HapilBossMotion.contracts.violet.key],images={};
  for(const key of keys){const file=path.join(ROOT,media[key]),b=fs.readFileSync(file);sources[key]={path:media[key],bytes:b.length,sha256:sha(b)};images[key]=await loadImage(file);}
  const immutable=JSON.stringify(w),pair=[];
  for(const [version,api]of [['before',beforeAPI],['current',currentAPI]]){
   const actors=api.create(images),panel=createCanvas(360,360),pc=panel.getContext('2d');pc.fillStyle='#132034';pc.fillRect(0,0,360,360);actors.beginFrame();for(const c of w.boss.combatCopies)assert(actors.drawCombatCopy(pc,w,c,.72));const m=actors.getMetrics();assert.equal(m.combatCopyDraws,2);assert.equal(m.combatCopyMissingAssets,0);assert.equal(m.storySupportDraws,0);assert.equal(JSON.stringify(w),immutable);const x=n%2*720+(version==='current'?360:0),y=Math.floor(n/2)*380;ctx.drawImage(panel,x,y+20);ctx.font='12px sans-serif';ctx.fillStyle='#e7edf3';ctx.fillText(label+' / '+version+' / T'+tick,x+5,y+14);pair.push({version,actor:m.lastCombatCopySamples,pixelsSHA256:sha(panel.toBuffer('image/png'))});
  }
  rows.push({group,tick,label,ordinaryHealth:false,actualCoreCopyRecords:w.boss.combatCopies,comparison:pair});
 }
 const out=path.join(ROOT,'docs/v22-copy-pixels');fs.mkdirSync(out,{recursive:true});const jpg=canvas.toBuffer('image/jpeg');fs.writeFileSync(path.join(out,'repeat-source-before-after.jpg'),jpg);assert.deepEqual(hashes(),codeHashes);
 const report={schema:1,scope:'Native CPU source-body comparison at actual current-core controlled clone ticks. No source art, HP, bullet, warning or release-clock edits; not natural play or GPU/device timing.',baseline:BASE,baselineActorSHA256:sha(Buffer.from(beforeSource)),codeHashes,sourceHashGuardPassed:true,cases:rows,sources,image:{path:'docs/v22-copy-pixels/repeat-source-before-after.jpg',bytes:jpg.length,sha256:sha(jpg)},reviewStatus:'pending-direct-pixel-review'};
 fs.writeFileSync(path.join(ROOT,'docs/V22-COPY-ANTICIPATION-20261030.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,sourceImages:Object.keys(sources).length,image:report.image}));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
