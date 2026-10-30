'use strict';
// Own-source alpha/pivot review only. Copies are explicit presentation fixtures,
// not a claim of natural play, actual engine clone timing or GPU/phone speed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const ROOT=path.resolve(__dirname,'..'),audit=require('./audit-actual-projectiles-v20.cjs'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
global.document={createElement(){return createCanvas(1,1)}};for(const name of ['story-assets','boss-motion','actors'])require('../src/'+name+'.js');
const media=require('./read-media-registry.cjs')();
async function main(){
 const codeFiles=['index.html','styles.css',...fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)],codeHashes=Object.fromEntries(codeFiles.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
 const cases=[{group:0,label:'VIOLET'},{group:5,label:'SLOTH'},{group:11,label:'PRIDE CYBORG'},{group:20,label:'FALLEN KNIGHT'},{group:30,label:'SIREN'},{group:34,label:'RIAN / ION'},{group:35,label:'CULT LEADER'},{group:12,label:'LEADER PRACTICE'}],canvas=createCanvas(1440,680),ctx=canvas.getContext('2d'),rows=[],sources={};ctx.fillStyle='#0d1422';ctx.fillRect(0,0,1440,680);
 for(let n=0;n<cases.length;n++){
  const {group,label}=cases[n],w=audit.phaseWorld(group,2,'hell');w.tick=60;w.boss.action='attack';w.boss.releaseTick=60;const keys=group>=19?global.HapilStoryAssets.assetKeysForEncounter(group):group===12?global.HapilActors.cultAssetKeysForEncounter(12):group>=5?global.HapilActors.sinAssetKeysForEncounter(group):[global.HapilBossMotion.contracts.violet.key],images={};
  for(const key of keys){const file=path.join(ROOT,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources[key]={path:media[key],bytes:bytes.length,sha256:sha(bytes)};}
  const actors=global.HapilActors.create(images),panel=createCanvas(360,320),pc=panel.getContext('2d');pc.fillStyle='#101c2c';pc.fillRect(0,0,360,320);actors.beginFrame();
  const copies=[0,1].map(i=>({id:'review-'+group+'-'+i,sourceActorId:'review-'+group+'-'+i,modelActorId:group===34?i?'baek-ion':'han-rian':undefined,kind:i?'clone':'illusion',x:i?270:90,y:185,born:0,expireAt:360,releaseTick:i?60:-1,action:i?'attack':'charge',actionProgress:.8}));
  const before=JSON.stringify(w);for(const c of copies)assert(actors.drawCombatCopy(pc,w,c,c.kind==='clone'?.92:.58));assert(actors.drawBoss(pc,w,180,group===34?w.boss.y:112,230,1));assert.equal(JSON.stringify(w),before);const m=actors.getMetrics();assert.equal(m.combatCopyDraws,2);assert.equal(m.combatCopyMissingAssets,0);const x=n%4*360,y=Math.floor(n/4)*340;ctx.drawImage(panel,x,y+20);ctx.fillStyle='#e3e8ec';ctx.font='12px sans-serif';ctx.fillText(label+' / OWN SOURCE',x+8,y+14);rows.push({group,label,scope:'two explicitly authored copy presentation records, current actual boss state and owned source pixels',metrics:m});
 }
 const dir=path.join(ROOT,'docs/v21-copy-pixels');fs.mkdirSync(dir,{recursive:true});const bytes=canvas.toBuffer('image/jpeg');fs.writeFileSync(path.join(dir,'source-own-projections.jpg'),bytes);const report={schema:1,scope:'Native CPU Canvas own-source display fixtures only; no timing/occupancy/natural-play/GPU/phone certification',codeHashes,copiesPerCase:2,width:155,ordinaryBossWidth:230,cases:rows,sources,image:{path:'docs/v21-copy-pixels/source-own-projections.jpg',bytes:bytes.length,sha256:sha(bytes)},reviewStatus:'pending direct pixel inspection'};assert.deepEqual(Object.fromEntries(codeFiles.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))])),codeHashes,'production code changed during source-only review');fs.writeFileSync(path.join(ROOT,'docs/V21-COPY-SOURCE-REVIEW-20261030.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,sources:Object.keys(sources).length,image:report.image}));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
