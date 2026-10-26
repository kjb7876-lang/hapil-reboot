'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Assets=require('../src/story-assets.js'),Data=require('../src/story-data.js');
function fixture(){return {schemaVersion:1,encounters:[{id:'mb-dist01',sourceName:'violet',conditional:false},{id:'new-boss',sourceName:'new',conditional:false},{id:'conditional',conditional:true}]};}
function index(){return {schema:'hapil.live-asset-index.v1',revision:1,generation_complete:false,scope_complete:false,roster:[{boss_id:'mb-dist01',asset_status:'accepted_initial_keypose_candidate_reuse'},{boss_id:'new-boss',asset_status:'pending'},{boss_id:'conditional',asset_status:'pending'}]};}
function ledger(){return {schemaVersion:1,indexVerified:true,indexRevision:1,entries:[{combatId:'mb-dist01',implemented:true,correctBody:true,attackArt:true,qa:true}]};}
test('known retained identities use explicit binding and unknown IDs never fall back',()=>{
 const gate=Assets.create(fixture(),index(),ledger());assert.deepEqual(gate.bindingFor('mb-dist01'),{combatId:'mb-dist01',adapter:'v8',bossIndex:0,visualId:'violet'});
 for(const id of ['new-boss','missing','conditional']){assert.equal(gate.bindingFor(id),null);assert.equal(gate.entryStatus(id).ready,false);}
 assert.deepEqual(gate.entryStatus('missing').reasons,['unknown-combat-id']);assert.ok(gate.entryStatus('conditional').reasons.includes('conditional-not-independent-combat'));
});
test('approval, implementation, correct body, attack art, QA and verified index are independent gates',()=>{
 for(const key of ['implemented','correctBody','attackArt','qa']){const l=ledger();l.entries[0][key]=false;assert.equal(Assets.create(fixture(),index(),l).entryStatus('mb-dist01').ready,false,key);}
 const unverified=ledger();unverified.indexVerified=false;assert.ok(Assets.create(fixture(),index(),unverified).entryStatus('mb-dist01').reasons.includes('asset-index-not-verified'));
 const stale=ledger();stale.indexRevision=2;assert.equal(Assets.create(fixture(),index(),stale).summary().indexVerified,false);
 const pending=index();pending.roster[0].asset_status='pending';assert.equal(Assets.create(fixture(),pending,ledger()).entryStatus('mb-dist01').bodyApproved,false);
});
test('wrong retained binding and arbitrary v8 indexes cannot impersonate new combat IDs',()=>{
 const l=ledger();l.entries[0].binding={adapter:'v8',bossIndex:4,visualId:'lucifer'};assert.equal(Assets.create(fixture(),index(),l).bindingFor('mb-dist01'),null);
 l.entries.push({combatId:'new-boss',implemented:true,correctBody:true,attackArt:true,qa:true,binding:{adapter:'v8',bossIndex:4}});const i=index();i.roster[1].asset_status='approved';assert.equal(Assets.create(fixture(),i,l).bindingFor('new-boss'),null);
});
test('partial future approval opens only the exact custom identity and preserves honest completion',()=>{
 const i=index(),l=ledger();l.entries.push({combatId:'new-boss',implemented:true,correctBody:true,attackArt:true,qa:true,binding:{adapter:'story',combatId:'new-boss',handler:'root-contract-v1'}});
 assert.equal(Assets.create(fixture(),i,l).summary().readyCount,1);i.revision=2;l.indexRevision=2;i.roster[1].asset_status='approved';let gate=Assets.create(fixture(),i,l);
 assert.equal(gate.summary().readyCount,2);assert.equal(gate.summary().allComplete,false);assert.equal(gate.missingList().length,0);
 i.generation_complete=true;i.scope_complete=true;i.required_forms_complete=true;gate=Assets.create(fixture(),i,l);assert.equal(gate.summary().allComplete,true);assert.equal(gate.bindingFor('new-boss').combatId,'new-boss');
});
test('duplicate rows fail closed and missing list reports exact per-ID reasons',()=>{
 const i=index(),l=ledger();i.roster.push({...i.roster[0]});l.entries.push({...l.entries[0]});const gate=Assets.create(fixture(),i,l),entry=gate.entryStatus('mb-dist01');
 assert.ok(entry.reasons.includes('duplicate-asset-index-row'));assert.ok(entry.reasons.includes('duplicate-implementation-row'));assert.equal(entry.binding,null);
 const missing=gate.missingList().find(e=>e.combatId==='new-boss');assert.deepEqual(missing.reasons,['body-not-approved','combat-not-implemented','correct-body-not-verified','attack-art-not-verified','integration-qa-not-verified','missing-explicit-combat-binding']);
});
test('historical r1 five-candidate classification stays incomplete without integration',()=>{
 const i={schema:'hapil.live-asset-index.v1',revision:1,generation_complete:false,scope_complete:false,roster:Data.encounters.map(e=>({boss_id:e.id,asset_status:Object.hasOwn(Assets.V8_BINDINGS,e.id)?'accepted_initial_keypose_candidate_reuse':'pending'}))};
 const gate=Assets.create(Data,i,{schemaVersion:1,indexVerified:true,indexRevision:i.revision,entries:[]});
 assert.equal(gate.summary().primaryCount,69);assert.equal(gate.summary().conditionalCount,3);assert.equal(gate.summary().allComplete,false);assert.equal(gate.summary().missingCount,69);
 assert.equal(Data.encounters.filter(e=>gate.entryStatus(e.id).bodyApproved).length,5);assert.ok(gate.entryStatus('dist00-boss').reasons.includes('body-not-approved'));
});

function r3Sources(){
 return {
  i:JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/story/LIVE-ASSET-INDEX-r3.json'),'utf8')),
  addendum:JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/story/required-forms-addendum.json'),'utf8'))
 };
}
function approvedEntry(combatId,extra={}){return {combatId,assetApproved:true,sourceVerified:true,implemented:true,correctBody:true,attackArt:true,qa:true,behaviorQA:true,readabilityQA:true,...extra};}
function formProof(formID){return {formID,assetApproved:true,sourceVerified:true,implemented:true,behaviorQA:true,readabilityQA:true,assetRefs:['reviewed/'+formID+'.png']};}
function effectiveData(){return require('../src/story-scope.js').apply(Data);}
test('r3 registers first-eight body candidates separately from implementation and global completion',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum),l={indexVerified:true,indexRevision:3,entries:[]};let gate=Assets.create(data,i,l);
 assert.equal(gate.entryStatus('dist00-boss').bodyCandidate,true);assert.equal(gate.entryStatus('dist00-boss').bodyApproved,false);assert.equal(gate.entryStatus('dist00-boss').implemented,false);
 l.entries.push(approvedEntry('dist00-boss',{binding:{adapter:'story',combatId:'dist00-boss',handler:'root-guardian-v1'}}));gate=Assets.create(data,i,l);
 assert.equal(gate.entryStatus('dist00-boss').ready,true,'individually complete early encounter remains available despite later missing forms');
 assert.equal(gate.entryStatus('dist00-boss').indexReportedFormsComplete,false);assert.equal(gate.summary().generationComplete,false);assert.equal(gate.summary().requiredFormsComplete,false);assert.equal(gate.summary().allComplete,false);
});
test('r3 Lucifer keeps white pre-reveal artwork but revealed combat requires its exact black-wing horn form',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum),l={indexVerified:true,indexRevision:3,entries:[approvedEntry('a11-boss')]};let gate=Assets.create(data,i,l),entry=gate.entryStatus('a11-boss');
 assert.equal(entry.preRevealRetained,true);assert.equal(entry.bodyApproved,true);assert.equal(entry.ready,false);assert.equal(gate.bindingFor('a11-boss'),null);
 assert.ok(entry.reasons.includes('required-form:revealed-black-wing-horn-lucifer:missing-form-proof'));
 l.entries[0].requiredForms=[formProof('white-six-wing-pre-reveal')];assert.equal(Assets.create(data,i,l).entryStatus('a11-boss').ready,false,'a different same-character form cannot satisfy reveal');
 l.entries[0].requiredForms=[formProof('revealed-black-wing-horn-lucifer')];gate=Assets.create(data,i,l);assert.equal(gate.entryStatus('a11-boss').ready,true);
 l.entries[0].binding={adapter:'story',combatId:'a11-boss',visualId:'lucifer',handler:'reviewed-reveal-v1'};gate=Assets.create(data,i,l);assert.equal(gate.bindingFor('a11-boss').handler,'reviewed-reveal-v1','a reviewed same-ID reveal adapter can replace the retained presentation explicitly');
 for(const patch of [{visualId:'violet'},{bossIndex:0},{visualId:undefined}]){const bad=structuredClone(l);Object.assign(bad.entries[0].binding,patch);assert.equal(Assets.create(data,i,bad).bindingFor('a11-boss'),null,'known story bindings must retain exact visual identity');}
 assert.equal(gate.entryStatus('a11-boss').gpuVerified,false);assert.equal(gate.entryStatus('a11-boss').requiredForms[0].gpuVerified,false,'CPU behavior/readability QA does not certify GPU execution');
});
test('r3 required form rejects each missing approval, source, implementation, behavior, readability and reference independently',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum),formID='revealed-black-wing-horn-lucifer';
 for(const key of ['assetApproved','sourceVerified','implemented','behaviorQA','readabilityQA','assetRefs']){
  const proof=formProof(formID);proof[key]=key==='assetRefs'?[]:false;const l={indexVerified:true,indexRevision:3,entries:[approvedEntry('a11-boss',{requiredForms:[proof]})]};
  const entry=Assets.create(data,i,l).entryStatus('a11-boss');assert.equal(entry.ready,false,key);assert.ok(entry.requiredForms[0].reasons.length>0,key);
 }
 const proof=formProof(formID),l={indexVerified:true,indexRevision:3,entries:[approvedEntry('a11-boss',{requiredForms:[proof,proof]})]};assert.ok(Assets.create(data,i,l).entryStatus('a11-boss').reasons.includes('required-form:'+formID+':duplicate-form-proof'));
});
test('r3 source, behavior and readability gates are explicit and do not inherit aggregate CPU QA',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum);
 for(const key of ['sourceVerified','behaviorQA','readabilityQA']){
  const row=approvedEntry('dist00-boss',{binding:{adapter:'story',combatId:'dist00-boss',handler:'root-guardian-v1'}});row[key]=false;
  assert.equal(Assets.create(data,i,{indexVerified:true,indexRevision:3,entries:[row]}).entryStatus('dist00-boss').ready,false,key);
 }
});
test('promoted blue executor is separately missing and never receives another boss binding',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum);let gate=Assets.create(data,i,{indexVerified:true,indexRevision:3,entries:[]});
 assert.equal(gate.summary().primaryCount,70);assert.equal(gate.summary().requiredFormCount,16);const blue=gate.entryStatus('blue-executor');assert.equal(blue.conditional,false);assert.equal(blue.ready,false);assert.equal(blue.requiredForms[0].formID,'causal-loop-executor');assert.equal(gate.bindingFor('blue-executor'),null);
 const l={indexVerified:true,indexRevision:3,entries:[approvedEntry('blue-executor',{requiredForms:[formProof('causal-loop-executor')],binding:{adapter:'v8',bossIndex:4,visualId:'lucifer'}})]};
 const next=structuredClone(i);next.roster.find(e=>e.boss_id==='blue-executor').asset_status='approved';gate=Assets.create(data,next,l);assert.equal(gate.bindingFor('blue-executor'),null);assert.ok(gate.entryStatus('blue-executor').reasons.includes('missing-explicit-combat-binding'));
 l.entries[0].binding={adapter:'story',combatId:'blue-executor',visualId:'lucifer',handler:'executor-v1'};assert.equal(Assets.create(data,next,l).bindingFor('blue-executor'),null,'custom handler cannot bind the executor to Lucifer artwork');
});
test('static signature FX remain thirteen decorative drawings with zero certified animated frames',()=>{
 const {i,addendum}=r3Sources(),data=effectiveData(addendum),l={indexVerified:true,indexRevision:3,entries:[approvedEntry('dist00-boss',{attackArtMode:'static-decorative-only',requiresDamagingWarning:true,binding:{adapter:'story',combatId:'dist00-boss',handler:'root-guardian-v1'}})]};
 const gate=Assets.create(data,i,l),fx=gate.summary().staticFX;assert.equal(fx.newStaticDrawings,7);assert.equal(fx.reusedStaticDrawings,6);assert.equal(fx.animatedFrames,0);assert.equal(fx.usage,'decorative-cast-only');assert.equal(fx.soleDamagingWarningCertified,false);assert.equal(fx.gpuVerified,false);assert.ok(gate.entryStatus('dist00-boss').reasons.includes('static-fx-not-a-damaging-warning'));
});
test('each global completion flag is required while individual entry readiness is unchanged',()=>{
 const {i}=r3Sources(),data={encounters:[{id:'dist00-boss',conditional:false}],requiredForms:[]},l={indexVerified:true,indexRevision:3,entries:[approvedEntry('dist00-boss',{binding:{adapter:'story',combatId:'dist00-boss',handler:'root-guardian-v1'}})]};
 const complete={...i,generation_complete:true,scope_complete:true,required_forms_complete:true};delete complete.required_forms_addendum;
 assert.equal(Assets.create(data,complete,l).summary().allComplete,true);
 for(const key of ['generation_complete','scope_complete','required_forms_complete']){const missing={...complete,[key]:false},gate=Assets.create(data,missing,l);assert.equal(gate.entryStatus('dist00-boss').ready,true,key);assert.equal(gate.summary().allComplete,false,key);}
 const unloaded=Assets.create(data,i,l);assert.equal(unloaded.summary().requiredFormScopeLoaded,false);assert.equal(unloaded.entryStatus('dist00-boss').ready,false,'r3 form addendum cannot silently disappear');
});

function r5Sources(){return {...r3Sources(),i:JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/story/LIVE-ASSET-INDEX-r5.json'),'utf8'))};}
test('r5 visual form assets flag supersedes deprecated flag without certifying consumer runtime',()=>{
 const {i,addendum}=r5Sources(),data=effectiveData(addendum),l={indexVerified:true,indexRevision:5,entries:[]};
 assert.equal(i.required_form_assets_complete,false);let summary=Assets.create(data,i,l).summary();assert.equal(summary.requiredFormAssetsComplete,false);assert.equal(summary.formAssetCompletionField,'required_form_assets_complete');
 const parentDone={...i,generation_complete:true,scope_complete:true,required_form_assets_complete:true,required_forms_complete:false};summary=Assets.create(data,parentDone,l).summary();
 assert.equal(summary.generationComplete,true);assert.equal(summary.requiredFormAssetsComplete,true,'new asset flag wins even while deprecated flag stays false');assert.equal(summary.runtimeFormGatesComplete,false);assert.equal(summary.allComplete,false,'parent asset QA is not consumer gameplay proof');assert.equal(summary.gpuVerifiedCount,0);
 const staleTrue={...parentDone,required_forms_complete:true,required_form_assets_complete:false};assert.equal(Assets.create(data,staleTrue,l).summary().requiredFormAssetsComplete,false);
 const malformed={...parentDone,required_form_assets_complete:undefined};assert.equal(Assets.create(data,malformed,l).summary().requiredFormAssetsComplete,false,'present malformed new flag cannot fall back to old true');
});
test('r5 chapter2 partial batch exposes exact candidate forms without satisfying mandatory forms',()=>{
 const {i,addendum}=r5Sources(),gate=Assets.create(effectiveData(addendum),i,{indexVerified:true,indexRevision:5,entries:[]});
 const boy=gate.entryStatus('b06b-boss'),wrath=gate.entryStatus('b07-boss');
 assert.equal(boy.bodyCandidate,true);assert.deepEqual(boy.bodyCandidateRegistrations,[{batchId:'chapter2-partial11-20261026',formID:'b06b-boss-child'}]);assert.equal(boy.bodyApproved,false);assert.equal(boy.implemented,false);
 assert.equal(wrath.bodyCandidate,true);assert.equal(wrath.bodyCandidateRegistrations[0].formID,'b07-boss-human');assert.equal(wrath.requiredForms[0].formID,'fire-bear-wolf-dragon');assert.equal(wrath.requiredForms[0].ready,false,'human candidate does not stand in for three canonical flame beasts');
 assert.equal(gate.bindingFor('b07-boss'),null);assert.equal(gate.summary().allComplete,false);
});
test('r5 first-eight signature FX preserve individual batch counts and do not become animation or GPU evidence',()=>{
 const {i,addendum}=r5Sources(),gate=Assets.create(effectiveData(addendum),i,{indexVerified:true,indexRevision:5,entries:[]}),fx=gate.summary().staticFX;
 assert.equal(fx.batches.length,2);const first8=fx.batches.find(b=>b.id==='signature-first8-static-fx');assert.deepEqual(first8,{id:'signature-first8-static-fx',newStaticDrawings:11,reusedStaticDrawings:5,animatedFrames:0,derivedVariants:48});
 assert.equal(fx.countScope,'batch-declared-counts-not-deduplicated');assert.equal(fx.animatedFrames,0);assert.equal(fx.collisionVerified,false);assert.equal(fx.gpuVerified,false);assert.equal(fx.soleDamagingWarningCertified,false);
});
