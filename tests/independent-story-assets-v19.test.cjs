'use strict';
// Current runtime files, original/source provenance and real CPU image decode.
// These checks do not substitute for visual review, GPU or mobile play.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const root=path.resolve(__dirname,'..'),assets=require('../src/story-assets.js'),media=require('../tools/read-media-registry.cjs')(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/V19-STORY-ASSET-PROVENANCE-20261030.json'),'utf8'));
test('all79 new retained story images have pinned source/runtime hashes, documented conversions, real decoded dimensions and no untraced extra files',async()=>{
 assert.equal(manifest.canonicalNarrativeSHA256,'e069b22f4ee33c80e1b8e2e407583a865efec5d01b6440408f0e3389d82cabaa');assert.equal(manifest.sourceRepository,'kjb7876-lang/hapil1');assert.equal(manifest.sourceCommit,'8629bd82fc1d8baf41183395c054fd83775e96df');assert.equal(manifest.runtimeFiles.length,79);let copies=0,conversions=0;
 const paths=new Set();for(const row of manifest.runtimeFiles){assert(!paths.has(row.path),'duplicate runtime image');paths.add(row.path);assert.equal(media[row.key],row.path);const bytes=fs.readFileSync(path.join(root,row.path));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),row.runtimeGitBlob);assert.match(row.sourceSHA256,/^[a-f0-9]{64}$/);assert.match(row.sourceGitBlob,/^[a-f0-9]{40}$/);assert.equal(row.pixelsInspected,true);const im=await loadImage(path.join(root,row.path));assert.deepEqual([im.width,im.height],[row.width,row.height],row.key);
  if(row.transformation==='byte-preserving copy'){copies++;assert.equal(row.sourceSHA256,row.sha256);assert.equal(row.sourceGitBlob,row.runtimeGitBlob);}else{conversions++;assert(['storyGoblin','storyPlayerHando','storyPlayerAwakening'].includes(row.key),'only the three audited conversions are permitted');assert.match(row.transformation,/resize|PNG|pixel-preserv|Lanczos/i);}
 }
 assert.equal(copies,76);assert.equal(conversions,3);assert.deepEqual(fs.readdirSync(path.join(root,'media/story-v19')).sort(),[...paths].map(p=>path.basename(p)).sort());assert.deepEqual(Object.entries(media).filter(([,p])=>p.startsWith('media/story-v19/')).map(([k])=>k).sort(),manifest.runtimeFiles.map(r=>r.key).sort(),'no stale or untraced story registry key');
});
test('every new scene uses traced own sources, protects non-targets and keeps two cult actors separate',()=>{
 assert.deepEqual(assets.entries.map(e=>e.group),Array.from({length:17},(_,i)=>i+19));const documented=new Map(manifest.runtimeFiles.map(r=>[r.path,r.sha256]));
 for(const file of ['docs/CULT-V17-VISUAL-SOURCES-20261029.json','docs/CULT-V17-DRIVE-FX-20261029.json']){const doc=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));for(const row of doc.items)documented.set(row.file,row.sha256||row.resultSHA256);}
 for(const entry of assets.entries){assert(entry.actors.length>0);assert(entry.player&&entry.playerShot,'new viewpoint has own actor and attack source');for(const key of assets.assetKeysForEncounter(entry.group)){assert(media[key],key);assert(documented.has(media[key]),`${entry.group}:${key} is not traced to its allowed own source pack`);assert.equal(sha(fs.readFileSync(path.join(root,media[key]))),documented.get(media[key]));}
  for(const actor of entry.actors.concat(entry.supportActors||[],entry.player||[])){assert.equal(actor.fullAnimationCycles,0,'static authored keyposes are not a continuous animation claim');assert.equal(actor.sourcePivotsCertified,false,'manual anchors must not be labelled source-certified');}
 }
 for(const group of [22,25,27,29])assert(assets.lookup(group).supportActors.length>0,'core/time/memory/Arbelia remain visibly protected outside the hostile target');
 const pair=assets.lookup(34);assert.deepEqual(pair.actors.filter(a=>a.participantId).map(a=>a.participantId).sort(),['baek-ion','han-rian']);assert.notEqual(pair.projectiles.participants['baek-ion'].orb.key,pair.projectiles.participants['han-rian'].orb.key,'each person keeps own attack source and palette');assert.notEqual(pair.projectiles.participants['baek-ion'].palette.id,pair.projectiles.participants['han-rian'].palette.id);
});
