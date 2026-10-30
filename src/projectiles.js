/* Asset-only enemy projectiles. Simulation geometry belongs to core.js.
 * Regular bullets retain the authored object silhouette rather than clipping
 * everything to a capsule. Their visible fins/points extend 3..4 CSS pixels
 * beyond the smaller collision core, as ornamental bullet art normally does.
 * No geometric backing, stroke, fallback body or per-frame pixel processing.
 */
(function(global){
  'use strict';
  // Readable adaptations sampled from the retained boss sheets. Violet is the
  // only explicit color in a boss name, so its named purple wins. The other
  // palettes follow prominent image colors, then supporting image colors.
  var PALETTE_LIST=Object.freeze([
    Object.freeze({id:'violet',primary:'#b46ce0',secondary:'#ece0cf',accent:'#ad8752'}),
    Object.freeze({id:'horn',primary:'#b39a51',secondary:'#88944f',accent:'#c58252'}),
    Object.freeze({id:'balrog',primary:'#f46b2c',secondary:'#f4c55b',accent:'#78645e'}),
    Object.freeze({id:'mask',primary:'#d34b35',secondary:'#f0ddc4',accent:'#c7a054'}),
    Object.freeze({id:'lucifer',primary:'#be2442',secondary:'#eee0cf',accent:'#cea24c'}),
    // Readable adaptations of the actual retained Chapter-2 boss pixels.
    // The white-suited chairman's explicit named white takes precedence.
    Object.freeze({id:'belphegor',primary:'#b8a36f',secondary:'#ded5b5',accent:'#7e9865'}),
    Object.freeze({id:'leviathan',primary:'#43b7b6',secondary:'#d3d9d3',accent:'#6f7f92'}),
    Object.freeze({id:'beelzebub',primary:'#c79b52',secondary:'#ebd8b0',accent:'#87965c'}),
    Object.freeze({id:'asmodeus',primary:'#d24a4a',secondary:'#f4d9ca',accent:'#bc9363'}),
    Object.freeze({id:'mammon',primary:'#7985aa',secondary:'#e0bb65',accent:'#dfd6c7'}),
    Object.freeze({id:'wrath',primary:'#a8927c',secondary:'#f6a153',accent:'#d75a43'}),
    Object.freeze({id:'pride',primary:'#eee6d6',secondary:'#c9ad67',accent:'#76818c'}),
    Object.freeze({id:'cult-leader',primary:'#eee4dc',secondary:'#a73545',accent:'#897a7c'})
  ]);
  var PALETTES=Object.freeze({violet:PALETTE_LIST[0],horn:PALETTE_LIST[1],balrog:PALETTE_LIST[2],mask:PALETTE_LIST[3],lucifer:PALETTE_LIST[4],belphegor:PALETTE_LIST[5],leviathan:PALETTE_LIST[6],beelzebub:PALETTE_LIST[7],asmodeus:PALETTE_LIST[8],mammon:PALETTE_LIST[9],wrath:PALETTE_LIST[10],pride:PALETTE_LIST[11]});
  var FX=Object.freeze({
    web:{key:'fxV8VioletWeb',frames:16,ms:80,pivot:[64,64],sample:4},
    silver:{key:'fxV8SilverSlash',frames:16,ms:40,pivot:[64,64],sample:4},
    ripple:{key:'fxV8SwampRipple',frames:16,ms:80,pivot:[64,274/3],sample:4},
    reed:{key:'fxV8Reed',frames:16,ms:50,pivot:[64,64],sample:4},
    ember:{key:'fxV8Ember',frames:16,ms:60,pivot:[64,64],sample:4},
    gold:{key:'fxV8GoldSlash',frames:8,ms:60,pivot:[64,64],sample:3},
    unlock:{key:'fxV8Unlock',frames:16,ms:80,pivot:[64,64],sample:4},
    vortex:{key:'fxV8Vortex',frames:16,ms:80,pivot:[64,64],sample:4}
  });
  var FAMILIES=[['web','silver'],['ripple','reed'],['ember','gold'],['unlock','gold'],['vortex','silver','unlock'],[],[],[],[],[],[],[],[]];
  var ORBS=[
    {key:'projectileVioletOrbV9',width:296,height:80,frames:4,ms:125,crop:[16,16,48,48],step:72,r:24,l:0},
    {key:'projectileHornOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileBalrogOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileMaskOrbV10',width:64,height:64,frames:1,crop:[8,8,48,48],r:24,l:0},
    {key:'projectileLuciferOrbV9',width:296,height:80,frames:4,ms:125,crop:[16,16,48,48],step:72,r:24,l:0},
    // These are dense material crops from that boss's own approved static
    // attack source. They are not separate full-object flight animations.
    // Source alpha (250..253 in these interiors) is retained, never backed by
    // a generated shape. See SINS-PROJECTILE-SOURCES-20261029.json.
    {key:'projectileBelphegorV13',width:1254,height:1254,frames:1,crop:[453,448,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileLeviathanV13',width:1254,height:1254,frames:1,crop:[598,608,104,104],r:52,l:0,encounterMaterial:true},
    {key:'projectileBeelzebubV13',width:1254,height:1254,frames:1,crop:[434,635,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileAsmodeusV13',width:1254,height:1254,frames:1,crop:[810,278,148,148],r:74,l:0,encounterMaterial:true},
    {key:'projectileMammonV13',width:1295,height:1215,frames:1,crop:[461,419,384,384],r:192,l:0,encounterMaterial:true},
    {key:'projectileWrathV13',width:1295,height:1214,frames:1,crop:[482,481,340,340],r:170,l:0,encounterMaterial:true},
    {key:'projectilePrideV13',width:1536,height:1024,frames:1,crop:[680,452,176,176],r:88,l:0,encounterMaterial:true},
    {key:'cultBeam',width:768,height:144,frames:1,crop:[360,56,48,32],r:16,l:8,encounterMaterial:true}
  ];
  var BLADES=[
    {key:'projectileVioletBladeV10',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    {key:'projectileHornNeedleV11',width:128,height:64,frames:1,crop:[28,23,72,18],r:9,l:27},
    {key:'projectileBalrogBladeV10',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    {key:'projectileMaskNeedleV10',width:128,height:64,frames:1,crop:[28,23,72,18],r:9,l:27},
    {key:'projectileLuciferShardV11',width:128,height:64,frames:1,crop:[13,20,102,24],r:12,l:39},
    ORBS[5],ORBS[6],ORBS[7],ORBS[8],ORBS[9],ORBS[10],ORBS[11],ORBS[12]
  ];
  // Horn reed and Lucifer mask shard are static own-encounter source art.
  // The shard is a proposed ceramic material, not a canonical actor/body master.
  // Both are fitted to the existing core-owned capsule without changing damage.
  var CASTS=[
    {key:'castVioletV11',width:96,height:96},
    {key:'castHornV11',width:96,height:96},
    {key:'castBalrogV11',width:96,height:96},
    {key:'castMaskV11',width:96,height:96},
    {key:'castLuciferV11',width:96,height:96}
  ];
  // Individually generated transparent weapon/attack-material candidates.
  // Source crops trim faint detached alpha noise, never alter original bytes.
  // Mask's feather and Lucifer's shard are presentation motifs, not claims
  // that those bosses canonically carry a handheld weapon.
  var WEAPONS=[
    {key:'weaponVioletV12',width:1774,height:887,crop:[225,309,1323,296]},
    {key:'weaponHornV12',width:1774,height:887,crop:[66,264,1664,354]},
    {key:'weaponBalrogV12',width:1774,height:887,crop:[41,184,1689,522]},
    {key:'weaponMaskV12',width:1774,height:887,crop:[265,236,1309,448]},
    {key:'weaponLuciferV12',width:1254,height:1254,crop:[348,134,800,979]}
  ];
  // Actual hapil1 own-actor attack sprites, only for the two large HELL
  // rotors. These are projectile/skill materials, not newly asserted held
  // weapons. Their ornament is cosmetic; the proven same-boss dense material
  // below still paints the complete, core-owned circular damage region.
  var ROTORS=[null,null,null,null,null,
    {key:'h14SkillSloth',width:512,height:512,crop:[21,21,469,470]},
    {key:'h14SkillEnvy',width:512,height:512,crop:[26,105,460,303]},
    {key:'h14RotorGlutton',width:512,height:512,crop:[40,59,447,398]},
    {key:'h14SkillLust',width:512,height:512,crop:[21,35,470,443]},
    {key:'h14SkillGreed',width:512,height:512,crop:[28,70,456,373]},
    {key:'h14SkillWrath',width:512,height:512,crop:[21,26,469,460]},
    {key:'h14SkillPride',width:512,height:512,crop:[174,142,154,267]},
    {key:'cultDriveSpear',width:512,height:512,crop:[0,0,512,512]}
  ];
  var BEAMS=[null,null,null,null,null,
    {key:'h14BeamSloth',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamEnvy',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamGlutton',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamLust',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamGreed',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamWrath',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'h14BeamPride',width:2172,height:724,crop:[543,181,1086,362]},
    {key:'cultBeam',width:768,height:144,crop:[0,0,768,144]}
  ];
  // Small source crops previously erased whole objects into indistinguishable
  // circles. These are the owner's actual objects, with authored alpha intact.
  // Orb/needle are gameplay roles, not claims about canonical handheld weapons.
  function natural(key,width,height,crop,extra){return Object.assign({key:key,width:width,height:height,crop:crop,frames:1,natural:true,downsample:[96,96]},extra||{});}
  var NATURAL_ORBS=[
    natural('projectileVioletOrbV9',296,80,[8,8,64,64],{frames:4,ms:125,step:72}),
    natural('projectileHornOrbV10',64,64,[0,0,64,64]),
    natural('projectileBalrogOrbV10',64,64,[0,0,64,64]),
    natural('projectileMaskOrbV10',64,64,[0,0,64,64]),
    natural('projectileLuciferOrbV9',296,80,[8,8,64,64],{frames:4,ms:125,step:72}),
    natural('projectileBelphegorV13',1254,1254,[203,296,851,673]),
    natural('h14SkillEnvy',512,512,[169,157,275,196]),
    natural('projectileBeelzebubV13',1254,1254,[308,122,637,1007]),
    natural('h14SkillLust',512,512,[22,71,469,406]),
    natural('projectileMammonV13',1295,1215,[189,146,922,920]),
    natural('projectileWrathV13',1295,1214,[366,27,575,1125]),
    natural('projectilePrideV13',1536,1024,[604,16,328,991]),
    natural('cultDriveSpear',512,512,[252,207,84,84])
  ];
  var NATURAL_BLADES=[
    natural('weaponVioletV12',1774,887,[225,309,1323,296],{downsample:[128,48]}),
    natural('h14SkillHorn',256,256,[23,26,219,227],{downsample:[128,48]}),
    natural('weaponBalrogV12',1774,887,[41,184,1689,522],{downsample:[128,48]}),
    natural('weaponMaskV12',1774,887,[265,236,1309,448],{downsample:[128,48]}),
    natural('weaponLuciferV12',1254,1254,[348,134,800,979],{downsample:[128,48]}),
    natural('h14SkillSloth',512,512,[21,22,469,467]),
    natural('projectileLeviathanV13',1254,1254,[561,171,164,880],{rotation:-Math.PI/2,downsample:[128,64]}),
    natural('h14SkillGlutton',512,512,[33,28,443,458]),
    natural('h14SkillLust',512,512,[22,71,469,406]),
    natural('h14SkillGreed',512,512,[31,71,451,371]),
    natural('h14SkillWrath',512,512,[21,31,469,455]),
    natural('h14SkillPride',512,512,[35,24,443,467]),
    natural('cultLance',512,192,[9,41,493,115],{downsample:[128,48]})
  ];
  var ownEarlyBeams=[['h14SkillViolet',512,512,[32,161,468,177]],['h14SkillHorn',256,256,[27,30,211,219]],['h14SkillBalrog',512,512,[27,94,457,323]],['h14SkillMask',512,512,[28,135,456,242]],['h14SkillLucifer',512,512,[28,135,456,242]]];
  ownEarlyBeams.forEach(function(a,i){BEAMS[i]={key:a[0],width:a[1],height:a[2],crop:a[3]};});
  // Chapter III reuses only this control system's own source material.
  // The six entries are encounter roles, not six invented people.
  var CH3_MATERIAL={key:'chapter3Beam',width:768,height:144,frames:1,crop:[360,56,48,32],r:16,l:8,encounterMaterial:true};
  var CH3_LANCE={key:'chapter3Lance',width:512,height:192,crop:[0,0,512,192]};
  var CH3_PALETTES=[['#80b9c5','#c8ab75','#4b4e51'],['#80bfc5','#c2ad7c','#373d46'],['#8fcbd0','#b7a078','#424853'],['#7fbdca','#a99574','#3f444b'],['#4fd8df','#b5e9e7','#576477'],['#bd78cb','#7db7d3','#575170']];
  for(var chapterSlot=13;chapterSlot<=18;chapterSlot++){
    var chapterPalette=CH3_PALETTES[chapterSlot-13];
    PALETTE_LIST=Object.freeze(PALETTE_LIST.concat([Object.freeze({id:'controller-system-'+chapterSlot,primary:chapterPalette[0],secondary:chapterPalette[1],accent:chapterPalette[2]})]));
    ORBS[chapterSlot]=CH3_MATERIAL;BLADES[chapterSlot]=CH3_MATERIAL;
    ROTORS[chapterSlot]=CH3_LANCE;BEAMS[chapterSlot]={key:'chapter3Beam',width:768,height:144,crop:[0,0,768,144]};FAMILIES[chapterSlot]=[];
    NATURAL_ORBS[chapterSlot]=natural('chapter3Beam',768,144,[0,0,144,144]);
    NATURAL_BLADES[chapterSlot]=natural('chapter3Lance',512,192,[9,41,493,115],{downsample:[128,48]});
  }
  var CACHE_LIMIT=96,CACHE_BYTES=4*1024*1024,SCALE=3,PAD=1,CELL=128;
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function storySpec(i,owner){var s=Number.isInteger(i)&&i>=19&&i<=35&&global.HapilStoryAssets&&global.HapilStoryAssets.projectilesForEncounter?global.HapilStoryAssets.projectilesForEncounter(i):null;var id=owner&&typeof owner==='object'?(owner.modelActorId||owner.sourceActorId):owner;return s&&id&&s.participants&&s.participants[id]?s.participants[id]:s;}
  function slotForEncounter(i){return i===undefined||i===-1?0:Number.isInteger(i)&&i>=0&&((i<ORBS.length&&ORBS[i])||storySpec(i))?i:-1;}
  function indexFor(w){if(w&&w.finalPractice)return 12;var i=w&&w.bossIndex;if(w&&w.campaignRevision>=5&&Number.isInteger(i)&&i>=18&&i<=34)return slotForEncounter(i+1);if(w&&w.campaignRevision>=4&&Number.isInteger(i)&&i>=12&&i<=17)return i+1;return i>=12?-1:slotForEncounter(i);}
  function paletteAt(i,owner){var story=storySpec(i,owner);return story?story.palette:PALETTE_LIST[i];}
  var SECONDARY_PALETTE_CACHE=new WeakMap();
  function paletteFor(w,b){
    var p=paletteAt(indexFor(w),b);if(!p||!b||b.paletteSlot!==1)return p||null;
    var swapped=SECONDARY_PALETTE_CACHE.get(p);
    if(!swapped){swapped=Object.freeze({id:p.id+'-secondary',primary:p.secondary,secondary:p.primary,accent:p.accent});SECONDARY_PALETTE_CACHE.set(p,swapped);}
    return swapped;
  }
  function colorFor(w,b){var p=paletteFor(w,b);return p?p.primary:null;}
  // Acceleration is a property known at launch, so tint the existing authored
  // pixels from the first frame: players get a stable cue before it speeds up.
  // Use the boss's own two palette colors, preserve source alpha, and do not
  // change collision geometry. The authored silhouette has a bounded cosmetic
  // extent outside that smaller hit core; there is no painted capsule behind it.
  // Precompute bounded color cues from each owner's palette. These remain
  // stable for the projectile's lifetime, including before its behavior starts.
  var BEHAVIOR_PALETTES=PALETTE_LIST.map(function(base){return [base,{id:base.id+'-secondary',primary:base.secondary,secondary:base.primary,accent:base.accent}].map(function(p){
    function mix(role,target,weight){var a=rgb(p.primary),q=rgb(target),color='#';for(var i=0;i<3;i++)color+=Math.round(a[i]*(1-weight)+q[i]*weight).toString(16).padStart(2,'0');return Object.freeze({id:p.id+'-'+role,primary:color,secondary:p.secondary,accent:p.accent});}
    return {accelerating:mix('accelerating',p.secondary,.52),curving:mix('curving',p.secondary,.25),pausing:mix('pausing',p.accent,.55)};
  });});
  var STORY_BEHAVIOR_PALETTES=Object.create(null);
  function bulletPalette(w,b){
    var role=b&&b.pauseUntil?'pausing':b&&finite(b.curveRate)&&b.curveRate!==0?'curving':b&&finite(b.acceleration)&&b.acceleration>0?'accelerating':null;
    if(!role)return paletteFor(w,b);
    var index=indexFor(w);if(index<0)return null;
    if(storySpec(index,b)){var base=paletteFor(w,b);if(!base)return null;var id=base.id+'-'+role,known=STORY_BEHAVIOR_PALETTES[id];if(known)return known;var target=rgb(role==='pausing'?base.accent:base.secondary),p=rgb(base.primary),weight=role==='accelerating'?.52:role==='curving'?.25:.55,color='#';for(var c=0;c<3;c++)color+=Math.round(p[c]*(1-weight)+target[c]*weight).toString(16).padStart(2,'0');return STORY_BEHAVIOR_PALETTES[id]=Object.freeze({id:id,primary:color,secondary:base.secondary,accent:base.accent});}
    return BEHAVIOR_PALETTES[index][b.paletteSlot===1?1:0][role];
  }
  var NATURAL_SPEC_CACHE=new WeakMap(),DENSE_SPEC_CACHE=new WeakMap(),SIGNATURE_CACHE=new WeakMap();
  function naturalSpec(i,blade,owner){var story=storySpec(i,owner),s=story?(blade?story.blade:story.orb):(blade?NATURAL_BLADES[i]:NATURAL_ORBS[i]);if(!s||s.natural)return s||null;var cached=NATURAL_SPEC_CACHE.get(s);if(cached)return cached;cached=Object.assign(natural(s.key,s.width,s.height,s.objectCrop||s.crop),s,{natural:true,crop:s.objectCrop||s.crop,frames:s.frames||1});NATURAL_SPEC_CACHE.set(s,cached);return cached;}
  function sourceSignature(s){var cached=SIGNATURE_CACHE.get(s);if(cached)return cached;cached=[s.key,s.crop.join(','),s.rotation||0,s.frames||1,s.step||0,s.ms||0,s.downsample?s.downsample.join(','):'original',s.anchor?s.anchor.join(','):'center',s.fixedOrientation?'fixed':'aimed',s.visualOutset||0,s.alphaBoost?'readable':'original',s.sourceKey||'authored-alpha',s.cast?'cast':'body',s.encounterMaterial?'material':'object',s.natural?'natural':'dense'].join('|');SIGNATURE_CACHE.set(s,cached);return cached;}
  function optionalAssetKeysForEncounter(i){var out=[];if(!Number.isInteger(i)||i<0||i>=ORBS.length)return out;if(i>=12)return out;if(CASTS[i])out.push(CASTS[i].key);if(ROTORS[i])out.push(ROTORS[i].key);if(BEAMS[i])out.push(BEAMS[i].key);var orb=naturalSpec(i,false),blade=naturalSpec(i,true);return out.filter(function(k){return (!orb||k!==orb.key)&&(!blade||k!==blade.key);});}
  function assetKeysForEncounter(i){
    var wi=slotForEncounter(i);if(wi<0)return [];var story=storySpec(wi);if(story)return global.HapilStoryAssets.assetKeysForEncounter(wi,'projectiles');
    var out=[ORBS[wi].key];if(wi===12)out.push('cultLance','cultDriveSpear');if(wi>=13)out.push('chapter3Lance');
    if(BLADES[wi]&&out.indexOf(BLADES[wi].key)<0)out.push(BLADES[wi].key);
    [naturalSpec(wi,false),naturalSpec(wi,true)].forEach(function(s){if(s&&out.indexOf(s.key)<0)out.push(s.key);});
    if(Number.isInteger(i)&&i>=0&&WEAPONS[wi])out.push(WEAPONS[wi].key);
    out=out.concat(optionalAssetKeysForEncounter(i));
    (FAMILIES[wi]||[]).forEach(function(name){if(name!=='unlock'&&out.indexOf(FX[name].key)<0)out.push(FX[name].key);});
    return out.filter(function(k,n){return out.indexOf(k)===n;});
  }
  function ready(im,s){return !!(im&&im.complete!==false&&im.naturalWidth===(s.width||512)&&im.naturalHeight===(s.height||Math.ceil(s.frames/4)*CELL));}
  function invalidAssetForEncounter(images,i){var wi=slotForEncounter(i);if(wi<0)return 'unsupportedProjectileEncounter';var story=storySpec(wi);if(story)return global.HapilStoryAssets.invalidAsset(images,wi,'projectiles');var specs=[ORBS[wi],naturalSpec(wi,false),naturalSpec(wi,true)].filter(Boolean);if(wi>=13)specs.push(CH3_LANCE);if(wi===12)specs.push({key:'cultLance',width:512,height:192},{key:'cultDriveSpear',width:512,height:512});if(BLADES[wi])specs.push(BLADES[wi]);if(Number.isInteger(i)&&i>=0&&WEAPONS[wi])specs.push(WEAPONS[wi]);for(var k=0;k<specs.length;k++)if(!ready(images&&images[specs[k].key],specs[k]))return specs[k].key;return null;}
  function capsule(ctx,x,y,r,l){
    ctx.beginPath();
    if(l>0){ctx.moveTo(x-l,y-r);ctx.lineTo(x+l,y-r);ctx.arc(x+l,y,r,-Math.PI/2,Math.PI/2);ctx.lineTo(x-l,y+r);ctx.arc(x-l,y,r,Math.PI/2,Math.PI*1.5);ctx.closePath();}
    else ctx.arc(x,y,r,0,Math.PI*2);
  }
  function rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function create(images){
    images=images||{};
    var cache=new Map(),cacheBytes=0,group=-1,metrics;
    function release(e){if(!e)return;if(e.canvases)e.canvases.forEach(function(c){c.width=1;c.height=1;});if(e.canvas){e.canvas.width=1;e.canvas.height=1;}}
    function clearCache(){cache.forEach(release);cache.clear();cacheBytes=0;}
    function beginFrame(){metrics={stampDraws:0,stampCacheMisses:0,stampCacheHits:0,stampCacheLimit:CACHE_LIMIT,stampCacheByteLimit:CACHE_BYTES,stampCacheBytes:cacheBytes,stampCacheEntries:cache.size,animatedBulletDraws:0,bodyAnimationPhases:0,naturalSilhouetteDraws:0,maxVisualOutset:0,suppressedUnapprovedFX:0,compactCastDraws:0,compactHazardDraws:0,assetLaserDraws:0,assetLaserSlices:0,signatureCastDraws:0,weaponVisualDraws:0,weaponTelegraphDraws:0,rotorVisualDraws:0,rotorTelegraphDraws:0,sourceBeamOverlayDraws:0,missingOptionalRotorAssets:0,missingOptionalBeamAssets:0,missingProjectileAssets:0,compactFamilies:{}};}
    function remember(key,e){
      if(e.bytes>CACHE_BYTES){release(e);return null;}
      while(cache.size&&(cache.size>=CACHE_LIMIT||cacheBytes+e.bytes>CACHE_BYTES)){var first=cache.keys().next().value,old=cache.get(first);cacheBytes-=old.bytes;release(old);cache.delete(first);}
      cache.set(key,e);cacheBytes+=e.bytes;return e;
    }
    function canvas(w,h){if(!global.document||!global.document.createElement)return null;var c=global.document.createElement('canvas');c.width=w;c.height=h;return c;}
    function beamMaterialFor(w,b){var wi=indexFor(w),story=storySpec(wi,b);if(wi<0)return null;if(story){var s=story.beam||story.blade,cached=DENSE_SPEC_CACHE.get(s);if(cached)return cached;var c=s.denseCrop||s.crop;cached=Object.assign({frames:1,r:Math.min(c[2],c[3])/2,l:Math.max(0,(c[2]-c[3])/2)},s,{crop:c});DENSE_SPEC_CACHE.set(s,cached);return cached;}return BLADES[wi]||ORBS[wi];}
    function tintedArt(s,palette){
      var key='art|'+sourceSignature(s)+'|'+palette.id,e=cache.get(key);if(e)return e;
      var crop=s.crop,fw=s.downsample?s.downsample[0]:crop[2],fh=s.downsample?s.downsample[1]:crop[3],gutter=2,c=canvas((fw+gutter*2)*s.frames,fh+gutter*2);if(!c)return null;
      var ctx=c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      for(var f=0;f<s.frames;f++){
        if(s.rotation){ctx.save();ctx.translate(f*(fw+gutter*2)+gutter+fw/2,gutter+fh/2);ctx.rotate(s.rotation);ctx.drawImage(images[s.key],crop[0]+f*(s.step||0),crop[1],crop[2],crop[3],-fh/2,-fw/2,fh,fw);ctx.restore();}
        else ctx.drawImage(images[s.key],crop[0]+f*(s.step||0),crop[1],crop[2],crop[3],f*(fw+gutter*2)+gutter,gutter,fw,fh);
      }
      // Recolor only existing authored pixels. Dark details and bright patches
      // remain source-controlled. A few translucent spell sheets request a
      // readability remap on existing authored pixels only, never outside alpha.
      var data=ctx.getImageData(0,0,c.width,c.height),d=data.data,p=rgb(palette.primary),q=rgb(palette.secondary),a=rgb(palette.accent);
      for(var i=0;i<d.length;i+=4){
        if(!d[i+3])continue;
        var lum=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255,isLucifer=palette.id.indexOf('lucifer')===0;
        // The eclipse source contains saturated blue petals: weighted luminance
        // alone treats them as dark. Preserve their authored value contrast as
        // ivory highlights while the dark iris remains readable crimson.
        var value=isLucifer?.85*Math.max(d[i],d[i+1],d[i+2])/255+.15*lum:lum;
        // Small static cast accents are sometimes exceptionally dark or pale.
        // Raise their existing pixels into the encounter's identity palette;
        // retain source alpha and source-value variation without adding a rim.
        var castValue=s.cast?Math.max(d[i],d[i+1],d[i+2])/255:0;
        var hi=s.cast?clamp((castValue-.5)/.5,0,1)*.28:s.natural&&!isLucifer?clamp((lum-.25)/.75,0,1)*.9:s.encounterMaterial?clamp((lum-.52)/.48,0,1)*.55:isLucifer?clamp((value-.45)/.55,0,1)*.9:clamp((lum-.64)/.36,0,1)*.72;
        // Coal, steel and fabric contain dark source detail. Lift their own
        // pixels into the readable encounter palette without adding alpha,
        // contour strokes or an opaque replacement danger body.
        var mid=s.cast?.80+castValue*.35:s.natural&&!isLucifer?.90+Math.min(lum,.9)*.45:s.encounterMaterial?.88+Math.min(lum,.75)*.55:isLucifer?1.15+Math.min(value,.64)*.35:.38+Math.min(lum,.64)*1.03;
        for(var j=0;j<3;j++)d[i+j]=clamp(Math.round(p[j]*mid*(1-hi)+q[j]*hi+(a[j]-p[j])*.045),0,255);
        if(s.natural&&s.alphaBoost&&d[i+3]>64)d[i+3]=Math.round(64+191*Math.pow((d[i+3]-64)/191,.25));
      }
      ctx.putImageData(data,0,0);
      return remember(key,{canvas:c,frameWidth:fw+gutter*2,frameHeight:fh+gutter*2,sourceWidth:fw,sourceHeight:fh,gutter:gutter,frames:s.frames,r:s.r,l:s.l,bytes:c.width*c.height*4});
    }
    // Crop caps from authored source art, scale their radii uniformly, and
    // stretch only the central band. Thus an orb can become a capsule without
    // elongating its cap or changing the authoritative damage silhouette.
    function slices(ctx,art,phase,x,y,r,l){
      var sw=art.sourceWidth,sh=art.sourceHeight,sr=art.r,sx=phase*art.frameWidth+art.gutter,sy=art.gutter;
      var cy=y-r,diameter=r*2;
      ctx.drawImage(art.canvas,sx,sy,sr,sh,x-l-r,cy,r,diameter);
      if(l>0){var band=sw-sr*2;ctx.drawImage(art.canvas,sx+sr-(band?0:.5),sy,band||1,sh,x-l,cy,l*2,diameter);}
      ctx.drawImage(art.canvas,sx+sw-sr,sy,sr,sh,x+l,cy,r,diameter);
    }
    function buildStamp(w,b,s,r,l){
      var art=tintedArt(s,bulletPalette(w,b));if(!art)return null;
      var sourceOutset=Math.min(4-Math.SQRT2/SCALE,Math.max(3,finite(s.visualOutset)?s.visualOutset:r*.5)),outset=sourceOutset+Math.SQRT2/SCALE,fw=Math.ceil((l+r+outset+PAD)*2*SCALE/2)*2,fh=Math.ceil((r+outset+PAD)*2*SCALE/2)*2,hx=fw/(2*SCALE),hy=fh/(2*SCALE),frames=[];
      // Fractional hit radii must still land on the exact center of the cached
      // surface. Even cache dimensions avoid a second asymmetric half-pixel
      // resampling when its authored center is drawn back at native size.
      // Separate frame surfaces preserve fractional-radius edge coverage and
      // permit one direct 5-argument drawImage per live bullet. A cropped frame
      // in a long strip was measurably expensive in native CPU Canvas.
      for(var phase=0;phase<s.frames;phase++){
        var c=canvas(fw,fh),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c,canvases:frames});return null;}
        // Preserve the actual transparent contour, cloth edge, blade point or
        // mechanical fins. No capsule clipping and no opaque backing is drawn.
        var ax=s.anchor?clamp((s.anchor[0]-s.crop[0])/s.crop[2],0,1):.5,ay=s.anchor?clamp((s.anchor[1]-s.crop[1])/s.crop[3],0,1):.5;
        if(s.rotation){var ca=Math.cos(s.rotation),sa=Math.sin(s.rotation),nx=ca*(ax-.5)-sa*(ay-.5)+.5,ny=sa*(ax-.5)+ca*(ay-.5)+.5;ax=clamp(nx,0,1);ay=clamp(ny,0,1);}
        var dw=(l+r+sourceOutset)/Math.max(ax,1-ax),dh=(r+sourceOutset)/Math.max(ay,1-ay);
        ctx.drawImage(art.canvas,phase*art.frameWidth+art.gutter,art.gutter,art.sourceWidth,art.sourceHeight,(hx-ax*dw)*SCALE,(hy-ay*dh)*SCALE,dw*SCALE,dh*SCALE);
        // A single cached source-alpha edge separates authored silhouettes
        // from bright map detail. It follows existing alpha rather than any
        // hitbox shape; its furthest diagonal is <0.48 CSS px and fits inside
        // the same four-pixel total ornament budget. Live bullets still draw
        // once, without shadow/filter work or added geometric backing.
        var pixels=ctx.getImageData(0,0,fw,fh),original=new Uint8ClampedArray(pixels.data),d=pixels.data;
        for(var y=1;y<fh-1;y++)for(var x=1;x<fw-1;x++){
          var at=(y*fw+x)*4,a=original[at+3]/255;if(a===1)continue;
          var edge=0;for(var ey=-1;ey<=1;ey++)for(var ex=-1;ex<=1;ex++)if(ex||ey)edge=Math.max(edge,original[((y+ey)*fw+x+ex)*4+3]);
          var under=edge/255*.94*(1-a),alpha=a+under;if(!under||!alpha)continue;
          d[at]=Math.round((original[at]*a+7*under)/alpha);d[at+1]=Math.round((original[at+1]*a+11*under)/alpha);d[at+2]=Math.round((original[at+2]*a+19*under)/alpha);d[at+3]=Math.round(alpha*255);
        }
        ctx.putImageData(pixels,0,0);
        frames.push(c);
      }
      return {canvases:frames,width:fw/SCALE,height:fh/SCALE,frameWidth:fw,frameHeight:fh,frameCount:s.frames,x:hx,y:hy,r:r,halfLength:l,outset:outset,bytes:fw*fh*s.frames*4};
    }
    // One small, bounded per-encounter cache is baked from the generated
    // source pixels; rotating it never changes physics or collision direction.
    function weaponSurface(w){
      var wi=indexFor(w),spec=WEAPONS[wi];if(!spec)return null;var key='weapon|'+spec.key,e=cache.get(key);
      if(e)return e;
      if(!ready(images[spec.key],spec))return null;
      var c=canvas(96,96),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      var crop=spec.crop,scale=84/Math.max(crop[2],crop[3]),dw=crop[2]*scale,dh=crop[3]*scale;
      ctx.drawImage(images[spec.key],crop[0],crop[1],crop[2],crop[3],(96-dw)/2,(96-dh)/2,dw,dh);
      return remember(key,{canvas:c,bytes:96*96*4});
    }
    function drawWeaponIcon(ctx,w,x,y,angle,size,alpha){
      var art=weaponSurface(w);if(!art)return false;
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;
      ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(art.canvas,-size/2,-size/2,size,size);ctx.restore();return true;
    }
    function rotorSurface(w,owner){
      var wi=indexFor(w),story=storySpec(wi,owner),s=story?story.rotor:ROTORS[wi];if(!s||!ready(images[s.key],s))return null;
      var key='rotor|'+s.key,e=cache.get(key);if(e)return e;
      var c=canvas(96,96),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      var crop=s.crop,scale=88/Math.max(crop[2],crop[3]),width=crop[2]*scale,height=crop[3]*scale;
      ctx.drawImage(images[s.key],crop[0],crop[1],crop[2],crop[3],(96-width)/2,(96-height)/2,width,height);
      return remember(key,{canvas:c,bytes:96*96*4});
    }
    function drawRotorIcon(ctx,w,x,y,angle,size,alpha,owner){
      var art=rotorSurface(w,owner);if(!art){metrics.missingOptionalRotorAssets++;return false;}
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);
      ctx.drawImage(art.canvas,-size/2,-size/2,size,size);ctx.restore();return true;
    }
    function beamSurface(w,h){
      var wi=indexFor(w),story=storySpec(wi,h),s=story?story.beam:BEAMS[wi];if(!s||!ready(images[s.key],s))return null;
      var palette=paletteFor(w,h),key='beam|'+s.key+'|'+palette.id,e=cache.get(key);if(e)return e;
      // The authoritative hapil1 connected-laser crop is the central half of
      // each panorama. Downsample once; never recolor the 6MiB raw file each
      // frame or load all seven families for a single encounter.
      var c=canvas(384,128),ctx=c&&c.getContext('2d');if(!ctx){release({canvas:c});return null;}
      var crop=s.crop;ctx.drawImage(images[s.key],crop[0],crop[1],crop[2],crop[3],0,0,384,128);
      var data=ctx.getImageData(0,0,384,128),d=data.data,p=rgb(palette.primary),q=rgb(palette.secondary);
      for(var i=0;i<d.length;i+=4){if(!d[i+3])continue;var value=Math.max(d[i],d[i+1],d[i+2])/255,highlight=clamp((value-.64)/.36,0,1)*.55,level=.62+value*.5;for(var channel=0;channel<3;channel++)d[i+channel]=clamp(Math.round((p[channel]*(1-highlight)+q[channel]*highlight)*level),0,255);}
      ctx.putImageData(data,0,0);return remember(key,{canvas:c,bytes:384*128*4});
    }
    function drawBullet(ctx,w,b,lowQuality){
      if(!w||!b||!finite(b.x)||!finite(b.y))return false;
      var wi=indexFor(w),weapon=WEAPONS[wi];
      if(b.kind==='boss-weapon'&&(!weapon||!ready(images[weapon.key],weapon))){metrics.missingProjectileAssets++;return false;}
      var s=naturalSpec(wi,b&&b.halfLength>0,b);
      if(!s||!ready(images[s.key],s)){metrics.missingProjectileAssets++;return false;}
      var r=finite(b.r)&&b.r>0?b.r:3,l=finite(b.halfLength)?Math.max(0,b.halfLength):0;
      if(r>128||l>640)return false;
      if(group!==wi){clearCache();group=wi;}
      var key='body|'+sourceSignature(s)+'|'+r+'|'+l+'|'+bulletPalette(w,b).id,e=cache.get(key);
      if(!e){e=buildStamp(w,b,s,r,l);if(!e)return false;e=remember(key,e);if(!e)return false;metrics.stampCacheMisses++;}else metrics.stampCacheHits++;
      var phase=s.frames>1?Math.min(s.frames-1,Math.floor(Math.max(0,finite(b.age)?b.age:0)*1000/s.ms)):0;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.translate(b.x,b.y);ctx.rotate(s.fixedOrientation?0:b.kind==='hell-rotor'&&finite(b.spinAngle)?b.spinAngle:finite(b.angle)?b.angle:Math.atan2(b.vy||0,b.vx||0));
      ctx.drawImage(e.canvases[phase],-e.x,-e.y,e.width,e.height);ctx.restore();
      // The owner's opaque, authored ORB covers the actual r=11 damage body;
      // the separate transparent weapon is a cosmetic rotating layer on it.
      if(b.kind==='boss-weapon'&&drawWeaponIcon(ctx,w,b.x,b.y,finite(b.spinAngle)?b.spinAngle:0,34,1))metrics.weaponVisualDraws++;
      if(b.kind==='hell-rotor'&&drawRotorIcon(ctx,w,b.x,b.y,finite(b.spinAngle)?b.spinAngle:0,36,1,b))metrics.rotorVisualDraws++;
      metrics.stampDraws++;metrics.animatedBulletDraws++;metrics.naturalSilhouetteDraws++;metrics.maxVisualOutset=Math.max(metrics.maxVisualOutset,e.outset);metrics.bodyAnimationPhases=Math.max(metrics.bodyAnimationPhases,e.frameCount);metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;return true;
    }
    function drawHazardBody(ctx,w,h,lowQuality){
      if(!w||!h||(h.phase!=='active'&&h.phase!=='fade')||![h.x1,h.x2,h.y1,h.y2,h.width].every(finite)||h.width<=0)return false;
      var s=beamMaterialFor(w,h);if(!s||!ready(images[s.key],s)){metrics.missingProjectileAssets++;return false;}
      var art=tintedArt(s,paletteFor(w,h));if(!art)return false;
      var dx=h.x2-h.x1,dy=h.y2-h.y1,len=Math.sqrt(dx*dx+dy*dy),r=h.width/2;
      var progress=clamp(h.progress||0,0,1),phase=s.frames>1?Math.min(s.frames-1,Math.floor(Math.max(0,finite(h.age)?h.age:0)*1000/s.ms)):0;
      // Broad pressure ribbons retain their complete source-painted damage
      // footprint while letting separate projectile centers read above them.
      // Narrow lasers keep full opacity; afterglow remains harmless and uses
      // only the original fade clock, never a premature active-beam fade.
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=h.phase==='active'?(h.pressureCurtain?.72:1):Math.max(0,1-progress)*.35;
      ctx.translate((h.x1+h.x2)/2,(h.y1+h.y2)/2);ctx.rotate(Math.atan2(dy,dx));capsule(ctx,0,0,r,len/2);ctx.clip();slices(ctx,art,phase,0,0,r,len/2);
      if(BEAMS[indexFor(w)]||storySpec(indexFor(w))){var overlay=beamSurface(w,h);if(overlay){ctx.globalAlpha*=lowQuality?.92:1;ctx.drawImage(overlay.canvas,-len/2-r,-r,len+r*2,r*2);metrics.sourceBeamOverlayDraws++;}else metrics.missingOptionalBeamAssets++;}
      ctx.restore();
      metrics.assetLaserDraws++;metrics.assetLaserSlices+=len>0?3:2;return true;
    }
    function oneShot(ctx,s,elapsed,x,y,size,alpha){
      if(!ready(images[s.key],s)||!finite(elapsed)||elapsed<0||elapsed>=s.frames*s.ms||alpha<=0)return false;
      var frame=Math.floor(elapsed/s.ms),a=alpha*Math.min(1,elapsed/s.ms,(s.frames*s.ms-elapsed)/s.ms);if(a<=0)return false;
      size=Math.min(72,size);ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;
      ctx.drawImage(images[s.key],frame%4*CELL,Math.floor(frame/4)*CELL,CELL,CELL,x-s.pivot[0]*size/CELL,y-s.pivot[1]*size/CELL,size,size);ctx.restore();return true;
    }
    function drawBossCast(ctx,w,lowQuality){
      if(!w||!w.campaign||!w.boss||w.stage!=='boss')return;
      var b=w.boss,progress=clamp(b.actionProgress||0,0,1),wi=indexFor(w),names=FAMILIES[wi]||(storySpec(wi)?[]:null);if(wi<0||!names)return;
      var releaseAge=Number.isFinite(b.releaseTick)&&b.releaseTick>=0?w.tick-b.releaseTick:Infinity;
      if(b.action!=='charge'&&!(releaseAge>=0&&releaseAge<60)&&!b.rotorTelegraph&&!b.weaponTelegraph)return;
      // The pair appears during this particular charge only; its retained art
      // previews the two actual throws and never replaces damage warnings.
      if(b.weaponTelegraph){
        var a=.55+.25*progress;
        if(drawWeaponIcon(ctx,w,b.x-36,b.y+38,-.45,27,a))metrics.weaponTelegraphDraws++;
        if(drawWeaponIcon(ctx,w,b.x+36,b.y+38,.45,27,a))metrics.weaponTelegraphDraws++;
      }
      if(b.rotorTelegraph){
        var marker=b.hellOverlap,p=marker&&finite(marker.warningTick)&&finite(marker.pairReleaseAt)?clamp((w.tick-marker.warningTick)/Math.max(1,marker.pairReleaseAt-marker.warningTick),0,1):progress;
        var rotorAlpha=.5+.25*p;
        if(drawRotorIcon(ctx,w,b.x-36,b.y+38,-.45,28,rotorAlpha))metrics.rotorTelegraphDraws++;
        if(drawRotorIcon(ctx,w,b.x+36,b.y+38,.45,28,rotorAlpha))metrics.rotorTelegraphDraws++;
      }
      // Static accents are purely decorative, underneath all actors, warnings,
      // and damage bodies; they never replace the existing damage telegraphs.
      // One image per frame, visible during charge or the 18 ticks following a
      // real owned-projectile/laser release. No new animated loop is implied.
      var cast=CASTS[wi],fade=b.action==='charge'?.25+.45*progress:(releaseAge<18?.70*(1-releaseAge/18):0);
      if(fade>0&&cast&&ready(images[cast.key],cast)){
        var source=images[cast.key];
        if(wi!==2){
          // Recolor existing pixels once to boss-derived colors. The Lucifer
          // ring uses its blue-value-aware tint; the dim Horn and faint Violet/
          // Mask accents use a readable decorative tint, preserving source alpha.
          var recolored=tintedArt({key:cast.key,width:96,height:96,frames:1,crop:[0,0,96,96],r:48,l:0,cast:wi!==4},PALETTE_LIST[wi]);
          source=recolored&&recolored.canvas;
        }
        if(source){var size=lowQuality?60:72;ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=fade;
          ctx.drawImage(source,b.x-size/2,Math.max(88,b.y+70)-size/2,size,size);ctx.restore();metrics.signatureCastDraws++;
          metrics.compactFamilies[cast.key]=(metrics.compactFamilies[cast.key]||0)+1;}
      }
      var name=b.action==='charge'?names[0]:wi===4&&w.phase===2?'unlock':names[1];if(name==='unlock'){metrics.suppressedUnapprovedFX++;return;}
      var s=FX[name];if(!s||!ready(images[s.key],s))return;
      var elapsed=b.action==='charge'?progress*900:releaseAge*1000/60;
      if(oneShot(ctx,s,elapsed,b.x,Math.max(88,b.y+24),lowQuality?60:72,b.action==='charge'?.48:.7)){metrics.compactCastDraws++;metrics.compactFamilies[s.key]=(metrics.compactFamilies[s.key]||0)+1;}
    }
    function drawHazardDecoration(ctx,w,h,lowQuality){return false;}
    beginFrame();
    return {beginFrame:beginFrame,drawBullet:drawBullet,drawBossCast:drawBossCast,drawHazardBody:drawHazardBody,drawHazardDecoration:drawHazardDecoration,
      getMetrics:function(){return Object.assign({},metrics,{projectileTextureLimit:768,projectileTextureDraws:metrics.stampDraws,texturedBullets:metrics.stampDraws,projectileTailDraws:0,bossCastDraws:metrics.compactCastDraws+metrics.signatureCastDraws,hazardEmitterDraws:0,stampCacheEntries:cache.size,stampCacheBytes:cacheBytes,compactFamilies:Object.assign({},metrics.compactFamilies)});},
      destroy:function(){clearCache();images={};}};
  }
  global.HapilProjectiles=Object.freeze({create:create,palettes:PALETTES,paletteList:PALETTE_LIST,paletteFor:paletteFor,bulletPalette:bulletPalette,assetKeysForEncounter:assetKeysForEncounter,optionalAssetKeysForEncounter:optionalAssetKeysForEncounter,invalidAssetForEncounter:invalidAssetForEncounter,colorFor:colorFor,compactFX:FX});
})(typeof window!=='undefined'?window:globalThis);
