'use strict';
// Native CPU image fixtures. These are presentation/clock checks, not natural
// progression, a GPU benchmark, phone FPS or a newly authored animation cycle.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const story=require('../src/story-assets.js');require('../src/boss-skills.js');
const Skills=global.HapilBossSkills,media=require('../tools/read-media-registry.cjs')();
const ROOT=path.resolve(__dirname,'..'),indices=Array.from({length:36},(_,i)=>i).filter(i=>i!==12);
const roles=['wing-weave','bog-drag','sword-rake','feather-fork','constellation-orbit','late-pulse','mirror-reflection','hungry-jaw','red-stage','vault-branch','fire-fuse','calculation-column','authority-fold','defense-relay','mercy-boundary','veto-packet','feedback-return','migration-fork','repeat-disconnect','flute-phrase','six-swords','insomnia-veil','defense-intercept','harvest-tier','command-alternation','furnace-junction','neural-packet','deletion-seal','six-command-rings','tampered-thread','time-hand','castle-boundary','causal-lock','reverse-domination','circuit-cross','authority-fold'];
const propKeys=['h25SlothTissue','h25GluttonKnife','h25GreedMoney','h25GreedTreasure'];
let sharedImages;
async function images(){if(sharedImages)return sharedImages;const keys=new Set(propKeys.concat(['cultDriveFold','cultDriveStitch','cultDriveImpact','cultLance','chapter3Lance','chapter3Beam']));for(let i=0;i<12;i++)for(const k of Skills.optionalAssetKeysForEncounter(i))keys.add(k);for(let i=19;i<=35;i++)for(const k of story.skillKeysForEncounter(i))keys.add(k);const out={};for(const k of keys){assert(media[k],k+' registered');out[k]=await loadImage(path.join(ROOT,media[k]));}return sharedImages=out;}
async function fixture(){const old=global.document,allocated=[];global.document={createElement(name){assert.equal(name,'canvas');const c=createCanvas(1,1);allocated.push(c);return c;}};const im=await images(),canvas=createCanvas(360,640),fx=Skills.create(im);return {im,canvas,ctx:canvas.getContext('2d'),fx,allocated,close(){fx.destroy();global.document=old;}};}
function world(i,phase=0,patch={}){return {campaign:true,campaignRevision:5,finalPractice:i===12,bossIndex:i>=13?i-1:i,tick:500,stage:'boss',phase,boss:{id:1,x:180,y:112,action:'recover',actionProgress:.64,releaseTick:-1,skillReleases:[],...patch}};}
function plan(i,patch={}){return {id:'real-plan-'+i,patternId:'identity-'+roles[i]+'-v25',identityRole:roles[i],kind:'needle',x:180,y:136,angle:Math.PI/2,warningAt:450,activeAt:504,expireAt:516,...patch};}
function noGeometry(ctx){return new Proxy(ctx,{get(t,k){if(['fill','fillRect','stroke','strokeRect','arc','ellipse','fillText','strokeText'].includes(k))return()=>{throw Error('unexpected synthetic skill geometry '+k);};const v=t[k];return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}});}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}

test('35 canonical configurations have owned, frozen phase cues and preserve the separate final-practice route',()=>{
  const profiles=Skills.presentationProfiles.filter(p=>p.configuration);assert.equal(profiles.length,35);assert.equal(profiles.filter(p=>p.index!==8).length,34);assert.equal(new Set(profiles.map(p=>p.id)).size,35);
  for(const p of profiles){assert(Object.isFrozen(p));assert(Object.isFrozen(p.phaseRoles));assert.equal(p.phaseRoles.length,3);assert(p.phaseRoles.every(r=>r.length>4));}
  assert.equal(Skills.presentationForEncounter(12).configuration,false);
  assert.match(Skills.presentationForEncounter(18).phaseRoles[2],/released-ego-boundary/);
  assert.match(Skills.presentationForEncounter(27).phaseRoles[2],/owners-records/);
  assert.match(Skills.presentationForEncounter(29).phaseRoles[2],/autonomous-first-command/);
  assert.equal(Skills.presentationForEncounter(35).phaseRoles[2],'authority-impact');
  for(const i of [-1,36,'3',null])assert.equal(Skills.presentationForEncounter(i),null);
});

test('each remaining configuration draws every admitted locked warning before generic charge/release echoes in low4 and high8',async()=>{
  const f=await fixture();try{for(const i of indices.filter(i=>i!==8))for(const low of [false,true]){
    const phase=i===35?2:1,plans=[48,136,224,312].map((x,n)=>plan(i,{id:'locked-'+n,x,angle:1.1+n*.2,sourceActorId:i===34?(n%2?'baek-ion':'han-rian'):'emitter-'+n,identityRole:i===35?'authority-impact':i===34?(n%2?'circuit-shield':'circuit-cross'):roles[i]}));
    const events=Array.from({length:8},(_,n)=>({tick:500,kind:n%2?'laser':'needle',patternId:'confirmed-'+n,x:20+n*40,y:140}));
    const w=freeze(world(i,phase,{action:'charge',identityCasts:plans,skillReleases:events})),before=JSON.stringify(w);f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),w,low);const m=f.fx.getMetrics();
    assert.equal(m.skillWarningCandidates,4,i+': all pending origins admitted');assert.equal(m.skillWarningDraws,4);assert.equal(m.representedCasts.length,4);assert(m.representedCasts.every(c=>c.planned));assert.equal(m.skillSourceDraws,low?4:8);assert.equal(m.representedReleases.length,low?0:4);assert.equal(JSON.stringify(w),before);
    assert(m.representedCasts.every(c=>c.patternId===plans[0].patternId&&c.cueId.startsWith(Skills.presentationForEncounter(i).id+':')));assert(m.skillCacheBytes<=2097152&&m.skillCacheEntries<=24);
  }}finally{f.close();}
});

test('real 54-tick warning boundaries and angle-lock changes are represented without fabricating a release on a rejected group',async()=>{
  const f=await fixture();try{const cast=plan(0,{warningAt:500,activeAt:554,expireAt:566});for(const [tick,count]of [[499,0],[500,1],[553,1],[554,0],[565,0],[566,0]]){
    const w=world(0,0,{identityCasts:[cast]});w.tick=tick;f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),w,false);const m=f.fx.getMetrics();assert.equal(m.skillWarningDraws,count,String(tick));assert.equal(m.representedReleases.length,0,'no committed group means no firing accent');
  }
  const sampled=[];for(const angle of [.9,1.6]){f.fx.beginFrame();f.fx.draw(f.ctx,world(0,0,{identityCasts:[plan(0,{angle})]}),false);sampled.push(f.fx.getMetrics().representedCasts[0].rotation);}assert(Math.abs(sampled[1]-sampled[0]-.7)<1e-10,'source weapon follows the locked heading, not current player aim');
  f.fx.beginFrame();f.fx.draw(f.ctx,world(0,0,{action:'charge',identityCasts:[plan(0)]}),false);assert.equal(f.fx.getMetrics().skillSourceDraws,1,'one planned origin does not stack a second generic charge over itself');assert.equal(f.fx.getMetrics().skillChargeSuppressed,1);
  f.fx.beginFrame();f.fx.draw(f.ctx,world(0,0,{identityCasts:[{...cast,cancelled:true}]}),false);assert.equal(f.fx.getMetrics().skillWarningDraws,0);
  }finally{f.close();}
});

test('whole owned prop previews match phase identity; child memory never receives adult money/treasure props',async()=>{
  const f=await fixture();try{for(const [i,phase,identityRole,key]of [[5,0,'late-pulse','h25SlothTissue'],[7,1,'hungry-jaw','h25GluttonKnife'],[9,0,'vault-branch','h25GreedMoney'],[9,1,'vault-branch','h25GreedTreasure'],[9,2,'vault-branch','h14SkillGreed'],[35,0,'authority-fold','cultDriveFold'],[35,1,'authority-stitch','cultDriveStitch'],[35,2,'authority-impact','cultDriveImpact']]){
    const cast=plan(i,{identityRole}),event={tick:500,kind:'needle',patternId:cast.patternId,identityRole,x:180,y:136};f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),world(i,phase,{identityCasts:[cast],skillReleases:[event]}),false);const m=f.fx.getMetrics();assert.equal(m.representedCasts[0].sourceKey,key);assert.equal(m.representedReleases[0].sourceKey,key);assert.equal(m.skillMissingAssets,0);
  }
  const missing=Skills.create({...f.im,h25SlothTissue:undefined});missing.beginFrame();missing.draw(noGeometry(f.ctx),world(5,0,{identityCasts:[plan(5)]}),false);assert.equal(missing.getMetrics().skillSourceDraws,0);assert.equal(missing.getMetrics().skillMissingAssets,1);missing.destroy();
  f.fx.beginFrame();f.fx.draw(f.ctx,world(9,0,{identityCasts:[plan(9,{sourcePhase:2})],skillReleases:[{tick:500,kind:'orb',identityRole:'vault-branch',sourcePhase:2,x:180,y:136}]}),false);const oldPhase=f.fx.getMetrics();assert.equal(oldPhase.representedCasts[0].sourceKey,'h14SkillGreed');assert.equal(oldPhase.representedReleases[0].sourceKey,'h14SkillGreed');assert.equal(oldPhase.representedCasts[0].phaseRole,'preserved-winter-memory');
  }finally{f.close();}
});

test('two-caster copied plans retain model ownership and source-only phase cues; repeat/memory/core cues remain finite origin accents',async()=>{
  const f=await fixture();try{const plans=[plan(34,{id:'cross',identityRole:'circuit-cross',sourceActorId:'copy-a',modelActorId:'han-rian',x:72}),plan(34,{id:'shield',identityRole:'circuit-shield',sourceActorId:'copy-b',modelActorId:'baek-ion',x:288})];f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),world(34,2,{identityCasts:plans}),false);const m=f.fx.getMetrics();assert.deepEqual(m.representedCasts.map(c=>[c.sourceActorId,c.modelActorId,c.sourceKey]),[['copy-a','han-rian','storyRianCross'],['copy-b','baek-ion','storyIonShield']]);
  for(const i of [13,14,15,16,17,18,22,25,27,29,32,33,35]){const w=freeze(world(i,2,{skillReleases:[{tick:500,kind:'needle',patternId:'command-link-only',x:180,y:136}]})),before=JSON.stringify(w);f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),w,false);assert.equal(f.fx.getMetrics().skillSourceDraws,1);assert.equal(JSON.stringify(w),before);}
  const side=world(14,0,{skillReleases:[{tick:500,kind:'laser',patternId:'actual-side-beam',x:0,y:435}]});f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),side,false);assert.equal(f.fx.getMetrics().representedReleases[0].y,435,'side laser accent is not falsely moved to boss origin');
  }finally{f.close();}
});

test('repeated fixed frames are deterministic, bounded and warm; no static source pose is reported as a full animation cycle',async()=>{
  const f=await fixture();try{for(const i of indices){const w=world(i,2,{action:'charge',identityCasts:i===8?[]:[plan(i,{identityRole:i===35?'authority-impact':roles[i]})],skillReleases:[{tick:491,kind:'orb',patternId:'actual-owned-group',x:180,y:136}]});let trace,allocated;for(let n=0;n<3;n++){f.fx.beginFrame();f.fx.draw(noGeometry(f.ctx),w,true);const m=f.fx.getMetrics(),now=JSON.stringify([m.representedCasts,m.representedReleases,m.skillCueIds]);if(n){assert.equal(now,trace);assert.equal(f.allocated.length,allocated,'warm fixed frame never builds another stamp');}trace=now;allocated=f.allocated.length;assert(m.skillSourceDraws<=4);assert(m.skillCacheEntries<=24&&m.skillCacheBytes<=2097152);}}
  f.fx.destroy();assert(f.allocated.every(c=>c.width===1&&c.height===1));
  }finally{f.close();}
});
