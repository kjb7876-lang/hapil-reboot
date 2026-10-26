'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),Builder=require('../tools/build-story-ledger.cjs'),Data=require('../src/story-scope.js').apply(require('../src/story-data.js')),Engine=require('../src/story-combat.js'),Encounters=require('../src/story-encounters.js'),Gate=require('../src/story-assets.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));

test('deterministic ledger build reproduces checked-in artifacts and exact verified r5 bytes',()=>{
 const a=Builder.assemble(),b=Builder.assemble();assert.deepEqual(a,b);
 assert.deepEqual(a.ledger,read('docs/story/asset-ledger.json'));assert.deepEqual(a.registry,read('docs/story/runtime-assets.json'));
 const current=fs.readFileSync(path.join(root,'docs/story/LIVE-ASSET-INDEX-current.json'));assert.deepEqual(current,a.indexBytes);assert.equal(sha(current),'88b5dda6e17854312c1cbb89657ca690683683ef224ea65b35df35fbb5b6d6a7');
 assert.equal(a.ledger.entries.length,70);assert.deepEqual(new Set(a.ledger.entries.map(e=>e.combatId)),new Set(Data.primaryCombatIds));assert.equal(a.summary.allComplete,false);
});

test('every registered image exists with exact declared hash and runtime dimensions',()=>{
 const {registry}=Builder.assemble();let checked=0;
 for(const [id,binding] of Object.entries(registry.bindings)){
  assert.equal(binding.combatId,id);assert.equal(binding.art.body.combatId,id);assert.equal(binding.art.body.cell,256);assert.equal(binding.art.body.poses.length,4);
  const keys=new Set();for(const image of binding.images){assert.ok(!keys.has(image.key),'duplicate runtime key');keys.add(image.key);assert.ok(image.file.startsWith('media/'));assert.ok(!image.file.includes('..'));const bytes=fs.readFileSync(path.join(root,image.file));assert.equal(sha(bytes),image.sha256,image.file);assert.equal(bytes.length,image.bytes);assert.ok(image.width>0&&image.height>0);if(path.extname(image.file)==='.png'){assert.equal(bytes.readUInt32BE(16),image.width);assert.equal(bytes.readUInt32BE(20),image.height);}checked++;}
  assert.ok(keys.has(binding.art.body.key));if(binding.art.projectile)assert.ok(keys.has(binding.art.projectile.key));if(binding.art.background)assert.ok(keys.has(binding.art.background.key));
 }
 assert.equal(Object.keys(registry.bindings).length,22);assert.ok(checked>50);
});

test('registered bodies and signature art retain exact combat ownership without clamp or cross-character fallback',()=>{
 const {registry,ledger}=Builder.assemble(),bodyReports=['first-eight-r3','chapter2-r5'].flatMap(name=>read('docs/story-assets/'+name+'.json').bodies),first8=read('docs/story-assets/first8-fx-r5.json').assets;
 for(const body of bodyReports){if(body.contextFormOnly)continue;const binding=registry.bindings[body.combatId];assert.ok(binding);assert.equal(binding.art.body.key,body.key);assert.ok(binding.images.some(i=>i.file===body.file&&i.sha256===body.sha256));}
 for(const fx of first8){assert.ok(registry.bindings[fx.combatId].images.some(i=>i.key===fx.key));for(const [id,binding] of Object.entries(registry.bindings))if(id!==fx.combatId)assert.equal(binding.images.some(i=>i.key===fx.key),false,'cross-boss FX leak');}
 for(const entry of ledger.entries)if(!entry.bodyRefs.length)assert.equal(registry.bindings[entry.combatId],undefined,'missing body never selects an available boss');
 for(const id of ['blue-executor','c104-boss','b07-boss','b08-boss'])assert.equal(registry.bindings[id],undefined,id);
 assert.equal(registry.bindings['a11-boss'].art.body.key,'bossMotionLucifer');assert.equal(ledger.entries.find(e=>e.combatId==='a11-boss').bodyUseScope,'white-six-wing-pre-reveal-only');
});

test('canonical context and form boundaries preserve pending hospital backgrounds, human context, and child identity',()=>{
 const {registry,ledger}=Builder.assemble(),entry=id=>ledger.entries.find(e=>e.combatId===id);
 assert.equal(registry.bindings['dist00-boss'].art.background.key,'forest');assert.equal(registry.bindings['mb-dist01'].art.background.key,'cave');assert.equal(registry.bindings['dist06-boss'].art.background.key,'ruins');
 for(const id of ['mb-ep1a08','mb-ep1a10','mb-ep1a11','a11-boss']){assert.equal(registry.bindings[id].art.background,null);assert.ok(entry(id).pendingReasons.includes('missing-canonical-context-background'));}
 assert.deepEqual(registry.contextBodies.map(b=>b.formId),['b07-boss-human','b08-boss-human']);assert.equal(registry.bindings['b06b-boss'].art.body.combatId,'b06b-boss');assert.equal(entry('b06b-boss').bodyFormId,'b06b-boss-child');assert.equal(registry.bindings['b06b-boss-child'],undefined);
 assert.equal(entry('mb-ep1a08').correctBody,false,'notdetermined review is not a positive body clearance');
 assert.equal(ledger.entries.reduce((sum,e)=>sum+e.requiredForms.length,0),16);for(const form of ledger.entries.flatMap(e=>e.requiredForms)){assert.equal(form.assetApproved,false);assert.equal(form.implemented,false);assert.equal(form.behaviorQA,false);assert.equal(form.readabilityQA,false);for(const ref of form.candidateBodyReferences)assert.equal(ref.exactRequiredFormCertified,false);}
});

test('implementation follows engine support while hash and candidate approvals never fabricate browser/GPU QA',()=>{
 const {ledger,registry}=Builder.assemble(),index=JSON.parse(fs.readFileSync(path.join(root,'docs/story/LIVE-ASSET-INDEX-current.json'))),gate=Gate.create(Data,index,ledger);
 const qaPath=path.join(root,'qa/story-integration.json'),proof=fs.existsSync(qaPath)?read('qa/story-integration.json'):{entries:[]};
 for(const entry of ledger.entries){assert.equal(entry.implemented,Engine.supports(Encounters.get(entry.combatId)),entry.combatId);const expected=entry.qaProofRequirements;const qa=(proof.entries||[]).find(q=>q.combatId===entry.combatId&&q.browserVerified===true&&entry.bodyRefs[0]&&q.bodySHA256===expected.bodySHA256&&q.artSHA256===expected.artSHA256&&q.dependenciesSHA256&&Object.keys(q.dependenciesSHA256).length===Object.keys(expected.dependenciesSHA256).length&&Object.keys(expected.dependenciesSHA256).every(key=>q.dependenciesSHA256[key]===expected.dependenciesSHA256[key]));for(const flag of ['qa','behaviorQA','readabilityQA','gpuVerified'])assert.equal(entry[flag],!!qa&&qa[flag]===true,entry.combatId+' '+flag);}
 assert.equal(gate.summary().allComplete,false);assert.equal(registry.summary.allComplete,false);
 if(!fs.existsSync(qaPath)){assert.equal(gate.summary().readyCount,0);assert.equal(gate.summary().gpuVerifiedCount,0);}
});

test('a changed imported asset causes manifest assembly to fail closed',()=>{
 const original=fs.readFileSync,target=path.join(root,'media/story-bodies/dist00-boss-atlas-512.png');
 fs.readFileSync=function(file,...args){const result=original.call(fs,file,...args);if(String(file)===target&&Buffer.isBuffer(result)){const changed=Buffer.from(result);changed[changed.length-1]^=1;return changed;}return result;};
 try{assert.throws(()=>Builder.assemble(),/Asset hash mismatch: media\/story-bodies\/dist00-boss-atlas-512.png/);}finally{fs.readFileSync=original;}
});

test('root command target uses its own core and player skill atlases stay explicitly unmapped',()=>{
 const {ledger,registry}=Builder.assemble(),binding=registry.bindings['dist00-boss'];assert.equal(binding.art.targetKey,'storyFirst8FxRootCore');assert.ok(binding.images.some(i=>i.key===binding.art.targetKey));
 for(const entry of ledger.entries)for(const name of ['memory','delay','parry','ego']){assert.equal(entry.skillVisuals[name].ready,false);assert.ok(entry.pendingReasons.includes('player-skill-art-pending:'+name));const registered=registry.bindings[entry.combatId];if(registered)assert.equal(registered.art.effects[name],undefined,'full player atlas is never drawn as an unselected single frame');}
});

test('browser proof is invalidated by stale art, code, images or missing dependency keys, and does not infer GPU',()=>{
 const base=Builder.assemble(),requirement=base.registry.bindings['dist00-boss'].qaProofRequirements;
 assert.ok(Object.hasOwn(requirement.dependenciesSHA256,'src/story-combat.js'));assert.ok(Object.hasOwn(requirement.dependenciesSHA256,'src/story-render.js'));assert.ok(Object.hasOwn(requirement.dependenciesSHA256,'src/story-app.js'));
 for(const image of base.registry.bindings['dist00-boss'].images)assert.equal(requirement.dependenciesSHA256[image.file],image.sha256);
 let supplied={combatId:'dist00-boss',...structuredClone(requirement),browserVerified:true,qa:true,behaviorQA:true,readabilityQA:true};
 const originalRead=fs.readFileSync,originalExists=fs.existsSync,qaFile=path.join(root,'qa/story-integration.json');
 fs.existsSync=function(file){return String(file)===qaFile||originalExists.call(fs,file);};
 fs.readFileSync=function(file,...args){return String(file)===qaFile?JSON.stringify({entries:[supplied]}):originalRead.call(fs,file,...args);};
 try{
  let entry=Builder.assemble().ledger.entries.find(e=>e.combatId==='dist00-boss');assert.equal(entry.qa,true);assert.equal(entry.gpuVerified,false);
  const valid=structuredClone(supplied);
  for(const mutate of [q=>q.artSHA256='0'.repeat(64),q=>q.bodySHA256='0'.repeat(64),q=>q.dependenciesSHA256['src/story-render.js']='0'.repeat(64),q=>q.dependenciesSHA256[base.registry.bindings['dist00-boss'].images[0].file]='0'.repeat(64),q=>delete q.dependenciesSHA256['src/story-app.js'],q=>q.dependenciesSHA256['extra-key']='0'.repeat(64),q=>q.browserVerified=false]){
   supplied=structuredClone(valid);mutate(supplied);entry=Builder.assemble().ledger.entries.find(e=>e.combatId==='dist00-boss');for(const flag of ['qa','behaviorQA','readabilityQA','gpuVerified'])assert.equal(entry[flag],false,flag+' cannot survive a stale fingerprint');
  }
 }finally{fs.readFileSync=originalRead;fs.existsSync=originalExists;}
});
