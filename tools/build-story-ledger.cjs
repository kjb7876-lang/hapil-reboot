#!/usr/bin/env node
'use strict';
// Deterministic manifest assembly; this does not perform browser/GPU QA.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
// Exact retained main-release files, inspected and hashed in this Work env.
// These four registrations are a first-encounter integration candidate only.
const FIRST_SKILL_FX={
  memory:{key:'storyPlayerMemory8',file:'media/fx-v6/wind-arrow-8.webp',sha256:'0fcc33586f03cd144abe418b7774aae990336ea5d1c2f7d9ea684993d956a0f1',dimensions:[1024,512],drawWidth:62,atlas:{cols:4,rows:2,cell:256,frameEndsMs:[50,100,150,200,250,300,350,400],pivot:[192,128],offset:[0,-10],rotation:-Math.PI/2}},
  delay:{key:'storyPlayerDelay4',file:'media/combat/fx03-violet-thorns-atlas.webp',sha256:'a8f5cf52e5458543ff0d78635c6c1c0b0e9263b98313d24e0b6f3d079e470a2e',dimensions:[512,512],drawWidth:68,atlas:{cols:2,rows:2,cell:256,frameEndsMs:[60,130,220,340],pivot:[128,128],offset:[0,0],rotation:0}},
  parry:{key:'storyPlayerParry4',file:'media/combat/fx05-parry-ring-atlas.webp',sha256:'f83f4bbc41c6d1a9c206a8a08d5005a4b8738b49625d16f392d0ffb5ae032433',dimensions:[512,512],drawWidth:72,atlas:{cols:2,rows:2,cell:256,frameEndsMs:[60,130,220,340],pivot:[128,128],offset:[0,0],rotation:0}},
  ego:{key:'storyPlayerEgo4',file:'media/combat/fx01-resonance-impact-v2-atlas.webp',sha256:'ab9646a1264e7a05b4b5b2dd49cdb26ef060d71447510d2df367bc26134faf73',dimensions:[512,512],drawWidth:76,atlas:{cols:2,rows:2,cell:256,frameEndsMs:[60,130,220,340],pivot:[128,128],offset:[0,0],rotation:0}}
};
function read(relative,root=ROOT){return JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));}
function classic(relative,name,root){const context={};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,relative),'utf8'),context,{filename:relative,timeout:1000});return clone(context[name]);}
function assemble(root=ROOT){
  const Data=require(path.join(root,'src/story-scope.js')).apply(require(path.join(root,'src/story-data.js'))),Encounters=require(path.join(root,'src/story-encounters.js')),Engine=require(path.join(root,'src/story-combat.js')),Assets=require(path.join(root,'src/story-assets.js'));
  const currentBytes=fs.readFileSync(path.join(root,'docs/story/LIVE-ASSET-INDEX-r5.json')),index=JSON.parse(currentBytes),indexSHA256=digest(currentBytes);
  if(indexSHA256!=='88b5dda6e17854312c1cbb89657ca690683683ef224ea65b35df35fbb5b6d6a7'||index.revision!==5)throw Error('Unverified live index bytes; review the new revision before rebuilding');
  const reportNames=['first-eight-r3','signature-static-r3','first8-fx-r5','chapter2-r5','first-eight-canon-review'];
  const reports=Object.fromEntries(reportNames.map(name=>[name,read('docs/story-assets/'+name+'.json',root)]));
  const media=classic('src/media.js','HapilMedia',root),motionContext={};motionContext.window=motionContext;motionContext.globalThis=motionContext;vm.createContext(motionContext);vm.runInContext(fs.readFileSync(path.join(root,'src/boss-motion.js'),'utf8'),motionContext,{timeout:1000});
  const motions=clone(motionContext.HapilBossMotion.contracts),retained=read('docs/reused-assets.json',root).concat(read('docs/reused-boss-motion-v8.json',root).files),dimensions=read('tests/fixtures/media-dimensions-v6.json',root),retainedByFile=new Map(retained.map(row=>[row.file,row]));
  const observedFiles=new Map();
  function asset(row){
    if(!row||typeof row.file!=='string'||!row.file.startsWith('media/')||row.file.includes('..'))throw Error('Unsafe/missing asset path');
    const bytes=fs.readFileSync(path.join(root,row.file)),sha256=digest(bytes),expected=row.sha256||(retainedByFile.get(row.file)||{}).sha256;
    if(!expected||sha256!==expected)throw Error('Asset hash mismatch: '+row.file);
    let size=row.dimensions||(row.width&&row.height?[row.width,row.height]:dimensions[row.file]);
    if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){const actual=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];if(size&&(size[0]!==actual[0]||size[1]!==actual[1]))throw Error('Asset dimensions mismatch: '+row.file);size=actual;}
    if(!size||!size.every(x=>Number.isInteger(x)&&x>0))throw Error('Unknown asset dimensions: '+row.file);
    const out={key:row.key,file:row.file,width:size[0],height:size[1],sha256,bytes:bytes.length};observedFiles.set(row.file,out);return out;
  }
  function retainedAsset(key){return asset({key,file:media[key]});}
  const bodyById=new Map(),contextBodies=[];
  for(const [id,binding] of Object.entries(Assets.V8_BINDINGS)){
    const body=motions[binding.visualId],image=retainedAsset(body.key);
    bodyById.set(id,{contract:{combatId:id,...clone(body)},image,batch:'initial-five-boss-keyposes',bodyApproved:true,correctBody:true,review:'retained-v8-exact-identity',formScope:id==='a11-boss'?'white-six-wing-pre-reveal-only':'retained-body-keyposes-only'});
  }
  const reviewed=new Map(reports['first-eight-canon-review'].bodies.map(b=>[b.combatId,b]));
  for(const [name,report] of [['first-eight-r3',reports['first-eight-r3']],['chapter2-r5',reports['chapter2-r5']]])for(const b of report.bodies){
    const image=asset(b),review=reviewed.get(b.combatId),correct=name==='first-eight-r3'&&review&&review.atlasSHA256===image.sha256&&review.atlasBytesVerified===true&&review.bodyUsableForIntegration===true;
    const registered={contract:{combatId:b.combatId,key:b.key,cell:b.cell,width:b.width,height:b.height,poses:clone(b.poses),scale:b.scale},image,batch:report.batch,bodyApproved:true,correctBody:!!correct,review:correct?'first-eight-canon-review':name==='first-eight-r3'?'canonical-identity-not-determined':'canonical-review-pending',formId:b.formId||b.combatId,formScope:b.acceptedFormScope||b.bodyCanonicalClearance};
    if(b.contextFormOnly){contextBodies.push({combatId:b.combatId,formId:b.formId,contextOnly:true,image,batch:report.batch,reason:'human-context-does-not-replace-canonical-combat-form'});continue;}
    if(bodyById.has(b.combatId))throw Error('Duplicate body mapping: '+b.combatId);bodyById.set(b.combatId,registered);
  }
  const fxById=new Map();function ownFX(id,row,batch){if(!Data.primaryCombatIds.includes(id))throw Error('Unknown FX owner: '+id);const item={...asset(row),combatId:id,role:row.role||row.publisher_role,batch,animatedFrames:0,decorativeOnly:true};if(!fxById.has(id))fxById.set(id,[]);fxById.get(id).push(item);}
  for(const fx of reports['first8-fx-r5'].assets)ownFX(fx.combatId,fx,reports['first8-fx-r5'].batch);
  const ownerByVisual=Object.fromEntries(Object.entries(Assets.V8_BINDINGS).map(([id,b])=>[b.visualId,id]));
  for(const fx of reports['signature-static-r3'].assets){const owner=ownerByVisual[fx.boss];if(!owner)throw Error('Unknown retained FX identity');ownFX(owner,fx,'signature-static-fx');}
  const backgroundByScene={dist00:'forest',dist01:'cave',dist02:'forest',dist03:'ruins',dist04:'ruins',dist05:'ruins',dist06:'ruins'};
  let qa={entries:[]};const qaFile=path.join(root,'qa/story-integration.json');if(fs.existsSync(qaFile))qa=JSON.parse(fs.readFileSync(qaFile,'utf8'));
  const codeDependencies=Object.fromEntries(['src/story-combat.js','src/story-render.js','src/story-app.js'].map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
  function matchingDependencies(actual,expected){return actual&&typeof actual==='object'&&!Array.isArray(actual)&&Object.keys(actual).length===Object.keys(expected).length&&Object.keys(expected).every(key=>actual[key]===expected[key]);}
  const bindings={},entries=[];
  for(const e of Data.encounters){
    const spec=Encounters.get(e.id),body=bodyById.get(e.id),fx=fxById.get(e.id)||[],core=fx.find(f=>f.role==='core-art'||f.role==='core-art-original'),cast=fx.find(f=>f.role==='cast'||f.role==='cast-impact-source-composite'),hit=fx.find(f=>f.role==='impact'||f.role==='cast-impact-source-composite'),backgroundKey=backgroundByScene[e.sceneId]||null;
    const background=body&&backgroundKey?retainedAsset(backgroundKey):null,implemented=!!spec&&Engine.supports(spec);
    const runtimeImages=body?[body.image,...fx.map(f=>({key:f.key,file:f.file,width:f.width,height:f.height,sha256:f.sha256,bytes:f.bytes})),retainedAsset('gunner'),retainedAsset('shot')]:[];if(background)runtimeImages.push(background);
    const effects={};if(cast)effects.bossCharge={key:cast.key,drawWidth:64};if(hit)effects.bossHit={key:hit.key,drawWidth:64};
    if(e.id==='dist00-boss'&&body)for(const [name,row] of Object.entries(FIRST_SKILL_FX)){
      runtimeImages.push(asset(row));effects[name]={key:row.key,drawWidth:row.drawWidth,atlas:clone(row.atlas)};
    }
    const runtimeArt=body?{body:body.contract,projectile:core?{key:core.key,combatId:e.id}:null,playerKey:'gunner',shotKey:'shot',background:background?{key:background.key}:null,effects}:null;
    if(e.id==='dist00-boss'&&runtimeArt&&core)runtimeArt.targetKey=core.key;
    const qaRequirements={bodySHA256:body?body.image.sha256:null,artSHA256:runtimeArt?digest(JSON.stringify(runtimeArt)):null,dependenciesSHA256:{...codeDependencies,...Object.fromEntries(runtimeImages.map(image=>[image.file,image.sha256]))}};
    const matchingQA=(Array.isArray(qa.entries)?qa.entries:[]).find(q=>q.combatId===e.id&&body&&q.bodySHA256===qaRequirements.bodySHA256&&q.artSHA256===qaRequirements.artSHA256&&q.browserVerified===true&&matchingDependencies(q.dependenciesSHA256,qaRequirements.dependenciesSHA256))||{};
    const requiredForms=(Data.requiredForms||[]).filter(f=>f.bossID===e.id).map(f=>({formID:f.formID,assetApproved:false,sourceVerified:false,implemented:false,behaviorQA:false,readabilityQA:false,gpuVerified:false,assetRefs:[],candidateBodyReferences:body?[{file:body.image.file,sha256:body.image.sha256,sourceBytesVerified:true,exactRequiredFormCertified:false}]:[],pendingReason:'exact-canonical-form-and-runtime-proof-not-certified'}));
    const pending=[];if(!body)pending.push('missing-own-body');if(body&&!body.correctBody)pending.push('canonical-body-review-pending');if(!core)pending.push('missing-own-projectile-art');if(!background)pending.push('missing-canonical-context-background');if(!implemented)pending.push('combat-objective-not-supported');if(!matchingQA.qa)pending.push('browser-integration-qa-pending');
    if(requiredForms.length)pending.push('canonical-required-form-proof-pending');
    const skillVisuals=Object.fromEntries(['memory','delay','parry','ego'].map(name=>[name,{ready:false,reason:e.id==='dist00-boss'?'atlas-integration-candidate-awaiting-browser-behavior-readability-and-qa':'source-player-atlas-needs-verified-frame-selection-and-renderer-rect-support'}]));
    for(const name of Object.keys(skillVisuals))pending.push('player-skill-art-pending:'+name);
    const binding={adapter:'story',combatId:e.id,handler:'storyCombat'};if(Assets.V8_BINDINGS[e.id])binding.visualId=Assets.V8_BINDINGS[e.id].visualId;
    const entry={combatId:e.id,canonicalName:e.canonicalName,sceneId:e.sceneId,liveAssetIndexRevision:index.revision,assetApproved:!!body,sourceVerified:!!body,implemented,correctBody:!!body&&body.correctBody,attackArt:!!core&&!!background,qa:matchingQA.qa===true,behaviorQA:matchingQA.behaviorQA===true,readabilityQA:matchingQA.readabilityQA===true,gpuVerified:matchingQA.gpuVerified===true,qaProofRequirements:qaRequirements,skillVisuals,binding,bodyRefs:body?[body.image]:[],bodyBatch:body?body.batch:null,bodyFormId:body?body.formId||e.id:null,bodyReview:body?body.review:null,bodyUseScope:body?body.formScope:null,projectileRefs:core?[core]:[],effectRefs:fx,backgroundReuse:background?{sceneId:e.sceneId,key:background.key,file:background.file,reason:'retained-source-context-'+e.sceneId}:null,requiredForms,pendingReasons:pending,generation:'reuse-or-parent-provided-candidate-only',consumerQAScope:'Actual browser evidence required; hash and CPU checks alone never certify GPU or gameplay.'};entries.push(entry);
    if(body){
      bindings[e.id]={combatId:e.id,status:'pending-integration-qa',pendingReasons:pending,qaProofRequirements:qaRequirements,images:runtimeImages,art:runtimeArt};
    }
  }
  const ledger={schemaVersion:1,indexVerified:true,indexRevision:index.revision,indexSHA256,contentRevision:Data.contentRevision,entries,allComplete:false,qaEvidence:fs.existsSync(qaFile)?'qa/story-integration.json':null,qaProofSchema:{entries:'[{combatId,bodySHA256,artSHA256,dependenciesSHA256,browserVerified,behaviorQA,readabilityQA,qa,gpuVerified}]',fingerprintSource:'Copy qaProofRequirements from the exact tested runtime binding. dependenciesSHA256 must contain the exact current code and image keys, without missing or additional keys.',gpu:'gpuVerified is independent explicit evidence; never inferred from browserVerified or CPU tests.'}};
  const gate=Assets.create(Data,index,ledger),summary=gate.summary();
  const registry={schemaVersion:1,indexRevision:index.revision,indexSHA256,contentRevision:Data.contentRevision,bindings,contextBodies,summary:{registeredBodies:Object.keys(bindings).length,readyCombats:summary.readyCount,primaryCount:Data.primaryCombatIds.length,allComplete:summary.allComplete},limits:['Partial art registrations are not permission to start a battle.','Signature drawings are static decorations, never the sole damage warning.','White six-wing Lucifer is pre-reveal only; black-wing horn form remains required.','No hospital or chapter2 background is fabricated from another context.']};
  for(const entry of entries)entry.pendingReasons=Array.from(new Set([...entry.pendingReasons,...gate.entryStatus(entry.combatId).reasons]));
  return {indexBytes:currentBytes,ledger,registry,summary:{...summary,registeredBodies:Object.keys(bindings).length,contextOnlyBodies:contextBodies.length,verifiedFileCount:observedFiles.size}};
}
function build(root=ROOT){const result=assemble(root),destination=path.join(root,'docs/story');fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'LIVE-ASSET-INDEX-current.json'),result.indexBytes);for(const [name,value] of [['asset-ledger.json',result.ledger],['runtime-assets.json',result.registry]])fs.writeFileSync(path.join(destination,name),JSON.stringify(value,null,2)+'\n');return result;}
if(require.main===module){const result=build();process.stdout.write(JSON.stringify(result.summary,null,2)+'\n');}
module.exports={assemble,build};
