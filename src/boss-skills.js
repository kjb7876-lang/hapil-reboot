/* Compact, source-only boss skill accents. Damage and all warning geometry
 * remain owned by core.js and projectiles.js. Static source drawings stay a
 * single frame: a pulse/fade transform is not an authored animation atlas.
 */
(function (global) {
  'use strict';
  // Each source was read at hapil1 commit43f9b257199f3cb25d81bf0ef3fdc8243f8dbd81,
  // checked by Git-blob SHA/SHA-256, decoded and inspected as actual pixels.
  // The retained source ownership map is documented separately. Cropped bone
  // and cross fragments omit their surrounding ring; no whole-actor aura is
  // drawn. These files are static artwork, not animation sheets.
  var SOURCE_SPECS = [
    ['violet','h14SkillViolet',512,512,[10,158,495,184]],
    ['horn','h14SkillHorn',256,256,[31,67,83,151]],
    ['balrog','h14SkillBalrog',512,512,[26,93,459,325]],
    ['mask','h14SkillMask',512,512,[26,134,460,245]],
    ['lucifer','h14SkillLucifer',512,512,[26,134,460,245]],
    ['belphegor','h14SkillSloth',512,512,[21,21,469,470]],
    ['leviathan','h14SkillEnvy',512,512,[26,105,460,303]],
    ['beelzebub','h14SkillGlutton',512,512,[33,27,444,459]],
    ['asmodeus','h14SkillLust',512,512,[21,35,470,443]],
    ['mammon','h14SkillGreed',512,512,[28,70,456,373]],
    ['wrath','h14SkillWrath',512,512,[21,26,469,460]],
    ['pride','h14SkillPride',512,512,[174,142,154,267]]
  ];
  var ENCOUNTERS = Object.freeze(SOURCE_SPECS.map(function (row) {
    var spec = Object.freeze({key:row[1],width:row[2],height:row[3],crop:Object.freeze(row[4]),authoredFrames:1,turn:.22});
    return Object.freeze({id:row[0],cast:spec,release:spec,laser:spec});
  }));
  var CULT_FOLD=Object.freeze({key:'cultDriveFold',width:512,height:512,crop:Object.freeze([0,0,512,512]),authoredFrames:1,turn:.22});
  var CULT_IMPACT=Object.freeze({key:'cultDriveImpact',width:512,height:512,crop:Object.freeze([0,0,512,512]),authoredFrames:1,turn:.22});
  var CULT_STITCH=Object.freeze({key:'cultDriveStitch',width:512,height:512,crop:Object.freeze([0,0,512,512]),authoredFrames:1,turn:.22});
  var CULT_LANCE=Object.freeze({key:'cultLance',width:512,height:192,crop:Object.freeze([0,0,512,192]),authoredFrames:1,turn:.22});
  var CH3_LANCE=Object.freeze({key:'chapter3Lance',width:512,height:192,crop:Object.freeze([0,0,512,192]),authoredFrames:1,turn:.16});
  var CH3_BEAM=Object.freeze({key:'chapter3Beam',width:768,height:144,crop:Object.freeze([0,0,768,144]),authoredFrames:1,turn:0});
  // One presentation contract per runtime configuration (12 is the separate
  // final-practice route). These are source-art keypose transforms, not new
  // attacks or authored animation cycles. In particular, the six controller
  // rows remain stages of the same system and point at its repeat-command
  // links; a preserved memory/person/core never becomes a bursting target.
  var PROFILE_ROWS = [
    ['violet-eight-sword-threads',['woven-sword','inscribed-sword','severed-thread'],.32,7,1.04,2],
    ['horn-swamp-grasp',['sinking-grasp','closing-hands','horn-echo'],-.23,9,.98,3],
    ['balrog-space-fire',['space-cut','sky-fire','seven-seals'],.46,12,1.12,0],
    ['mask-false-white-promise',['white-promise','perfect-command','mask-crack'],-.38,6,1.02,1],
    ['lucifer-many-selves',['false-constellation','many-faces','j-seal'],.63,4,1.08,4],
    ['belphegor-postponed-pulse',['late-trash','held-pulse','postponed-wave'],-.13,3,1.06,5],
    ['leviathan-crossed-reflections',['unequal-flows','crossed-gaze','reversed-reflection'],-.52,8,1.02,1],
    ['beelzebub-hungry-kitchen',['large-small-waves','kitchen-crossing','layered-maw'],.26,10,1.13,3],
    ['asmodeus-red-stage',['stage-beat','locked-spotlight','string-curtain'],.22,0,1,0],
    ['mammon-vault-winter-memory',['priced-branches','vault-lock','preserved-winter-memory'],.40,5,1.04,5],
    ['wrath-three-fire-beats',['spreading-fire','escape-corridor','bear-wolves-dragon'],-.66,11,1.14,2],
    ['pride-seven-calculations',['seven-branches','electrode-line','cyborg-bootloader'],.14,3,1.12,4],
    ['cult-practice-authority',['samong-fold','revival-stitch','authority-impact'],.54,8,1.10,2],
    ['controller-defensive-legion',['defensive-legion','bombardment-loop','architecture-link'],.18,11,.98,2],
    ['controller-coercive-rescue',['cruel-rescue','compassion-boundary','meaning-link'],-.43,5,1.03,3],
    ['controller-veto-signal',['veto-signal','hardware-migration','legacy-link'],.08,7,.96,4],
    ['controller-feedback-return',['administrator-output','abuse-repeat-link','feedback-link'],-.58,9,1.06,1],
    ['controller-choice-fork',['empty-vessel-link','constrained-choice','update-fork'],.37,4,1.01,5],
    ['controller-repeat-disconnect',['possessed-gate-link','repeat-link','released-ego-boundary'],-.21,6,1.07,0],
    ['goblin-flute-turn',['flute-turn','wolf-path','rose-resonance'],.49,6,.98,4],
    ['fallen-knight-six-swords',['familiar-path','six-sword-positions','falling-wall'],-.44,12,1.12,2],
    ['insomnia-black-mist',['sleepless-echo','resident-safe-mist','mist-heart'],.10,2,1.14,5],
    ['academy-six-invasions',['intercepting-turret','polluted-command','protected-first-command'],.24,8,.99,2],
    ['harvest-lower-power-links',['overwork-bonds','comparison-command','power-junction'],-.31,10,1.04,0],
    ['harvest-upper-crossed-orders',['alternating-orders','crossed-rule-gap','chosen-step'],.57,5,1.01,1],
    ['workshop-power-junction',['tightening-order','preserved-time-pipe','furnace-junction'],-.36,7,1.08,3],
    ['neuron-forced-cable',['preceding-cable','next-command-gap','forced-neural-link'],.17,4,1.03,5],
    ['memory-grave-deletion-link',['preserved-clock-shards','deletion-order','owners-records'],-.11,3,1.09,4],
    ['collapse-six-command-rings',['first-three-links','last-three-links','corridor-opening'],.72,9,.97,4],
    ['arbelia-tampered-thread',['deferred-time','tampered-record-thread','autonomous-first-command'],-.17,2,1.06,5],
    ['siren-time-harvest',['time-harvest','optimized-fate','free-choice-window'],.60,10,1.11,1],
    ['castle-returned-ego-core',['chosen-gate','owners-authority','returned-core'],-.47,9,1.07,2],
    ['causal-repeat-links',['scapegoat-refusal','three-causal-locks','preserved-guilt-records'],.05,5,1.02,4],
    ['cult-outer-command-network',['reverse-ego-occupation','interlocked-repeat','outer-command-link'],-.64,8,1.09,3],
    ['cult-two-circuit-casters',['rian-inverse-cross','ion-order-wall','shared-command-circuit'],.28,6,1.05,1],
    ['cult-final-samong-authority',['samong-fold','revival-stitch','authority-impact'],.54,8,1.10,2]
  ];
  var PRESENTATION_PROFILES = Object.freeze(PROFILE_ROWS.map(function(row,index){return Object.freeze({index:index,id:row[0],phaseRoles:Object.freeze(row[1]),swing:row[2],recoil:row[3],scale:row[4],envelope:row[5],configuration:index!==12});}));
  // Native artwork headings were reviewed in the retained source pixels. A
  // horizontal spear becomes a downward strike by rotation, never stretching
  // its silhouette into a beam. Symmetric apparatus uses a stable upright axis.
  var SOURCE_HEADINGS = Object.freeze({h14SkillViolet:0,h14SkillHorn:Math.PI/2,h14SkillBalrog:.20,h14SkillMask:0,h14SkillLucifer:0,h14SkillSloth:Math.PI/2,h14SkillEnvy:0,h14SkillGlutton:0,h14SkillLust:Math.PI/2,h14SkillGreed:Math.PI/2,h14SkillWrath:-Math.PI/4,h14SkillPride:Math.PI/2,h25SlothTissue:Math.PI/2,h25GluttonKnife:.36,h25GreedMoney:0,h25GreedTreasure:0,cultDriveFold:.82,cultDriveImpact:Math.PI/2,cultDriveStitch:Math.PI/2,cultLance:0,chapter3Lance:0,chapter3Beam:0,storyGoblinWave:-.40,storyGoblin:Math.PI/2,storyKnightSword:Math.PI/2,storyInsomniaGaze:Math.PI/2,storyChronoCrescent:0,storyChronoShard:0,storyChiefBlade:2.25,storyChiefIdle:Math.PI/2,storyExecutorRoad:0,storyRianCross:Math.PI/2,storyIonShield:Math.PI/2});
  function profileFor(i){return Number.isInteger(i)&&PRESENTATION_PROFILES[i]||null;}
  var CACHE_BYTES = 2 * 1024 * 1024, CACHE_ENTRIES = 24, STAMP_SIZE = 96;
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function validIndex(i) { return Number.isInteger(i) && i >= 0 && i < ENCOUNTERS.length; }
  function specsFor(i) { if(i>=19){var story=global.HapilStoryAssets&&global.HapilStoryAssets.lookup(i);return story&&story.skills||null;}return validIndex(i) ? ENCOUNTERS[i] : null; }
  function chapterSpecs(i){return Number.isInteger(i)&&i>=13&&i<=18?{cast:CH3_LANCE,release:CH3_LANCE,laser:CH3_BEAM}:null;}
  function ready(images, s) { var im = s && images && images[s.key]; return !!(im && im.complete !== false && im.naturalWidth === s.width && im.naturalHeight === s.height); }
  function assetKeysForEncounter(i) { return i>=19&&global.HapilStoryAssets?global.HapilStoryAssets.skillKeysForEncounter(i):[]; }
  function optionalAssetKeysForEncounter(i) {
    var entry = specsFor(i), keys = [];
    if(i===12)return ['cultDriveFold','cultDriveImpact','cultDriveStitch'];
    // These are already required damage materials. Do not classify them as
    // optional here: app's optional filter must never drop required images.
    if(i>=13)return [];
    if (entry) ['cast', 'release', 'laser'].forEach(function (role) { var spec = entry[role]; if (spec && keys.indexOf(spec.key) < 0) keys.push(spec.key); });
    return keys;
  }
  function invalidOptionalAssetForEncounter(images, i) {
    if(i>=19)return null;
    var entry = specsFor(i); if (!entry) return null;
    var roles = ['cast', 'release', 'laser'];
    for (var n = 0; n < roles.length; n++) { var s = entry[roles[n]]; if (s && !ready(images, s)) return s.key; }
    return null;
  }
  function create(images) {
    images = images || {};
    var cache = new Map(), bytes = 0, encounter = -1, metrics;
    function release(item) { if (item && item.canvas) { item.canvas.width = 1; item.canvas.height = 1; } }
    function clear() { cache.forEach(release); cache.clear(); bytes = 0; }
    function beginFrame() { metrics = { skillSourceDraws: 0, skillCastDraws: 0, skillReleaseDraws: 0, skillLaserDraws: 0, skillMissingAssets: 0, skillDrawLimit: 8, skillReleaseCandidates: 0, skillReleaseEmitters: 0, skillWarningCandidates:0, skillWarningDraws:0, skillChargeSuppressed:0, skillDetachedDraws:0, skillProfileId:'', sourceKeys: {}, skillCueIds:{}, representedReleases: [], representedCasts: [] }; }
    function remember(key, item) {
      if (item.bytes > CACHE_BYTES) { release(item); return null; }
      while (cache.size && (cache.size >= CACHE_ENTRIES || bytes + item.bytes > CACHE_BYTES)) { var first = cache.keys().next().value, old = cache.get(first); bytes -= old.bytes; release(old); cache.delete(first); }
      cache.set(key, item); bytes += item.bytes; return item;
    }
    function surface(spec) {
      var key = spec.key + '|' + spec.crop.join(','), existing = cache.get(key);
      if (existing) return existing;
      if (!ready(images, spec) || !global.document || !global.document.createElement) return null;
      var c = global.document.createElement('canvas'); c.width = c.height = STAMP_SIZE;
      var ctx = c.getContext('2d'); if (!ctx) { release({ canvas: c }); return null; }
      var crop = spec.crop, scale = (STAMP_SIZE - 4) / Math.max(crop[2], crop[3]), width = crop[2] * scale, height = crop[3] * scale;
      ctx.drawImage(images[spec.key], crop[0], crop[1], crop[2], crop[3], (STAMP_SIZE - width) / 2, (STAMP_SIZE - height) / 2, width, height);
      return remember(key, { canvas: c, bytes: STAMP_SIZE * STAMP_SIZE * 4 });
    }
    function paint(ctx, spec, role, x, y, age, duration, progress, low, profile, phase, event) {
      if (!spec || ![x, y, age, duration].every(finite) || age < 0 || duration <= 0 || age >= duration) return false;
      // Some actual controller lasers originate at the side at y345/435.
      // Keep those compact source muzzles at the true origin, never relocate
      // them to the boss or project their art over the player's lower region.
      if (x < 0 || x > 360 || y < 0 || y > 440) return false;
      var art = surface(spec); if (!art) { metrics.skillMissingAssets++; return false; }
      profile=profile||PRESENTATION_PROFILES[0];phase=clamp(Math.floor(phase||0),0,2);event=event||{};
      var p = clamp(age / duration, 0, 1), charge=clamp(progress||0,0,1), envelope=profile.envelope;
      var semantic=event.identityRole||event.kind||role,phaseRole=profile.phaseRoles[phase],cueId=profile.id+':'+phaseRole+':'+semantic;
      // The artwork follows the recorded heading for planned casts. Earlier
      // release records have no heading; their compact downward recoil is an
      // origin accent, not a claim about an individual projectile trajectory.
      var heading=finite(event.angle)?event.angle:Math.PI/2,native=finite(SOURCE_HEADINGS[spec.key])?SOURCE_HEADINGS[spec.key]:Math.PI/2;
      var side=x<180?-1:1,held=envelope===5?charge*charge*charge:envelope===2?Math.sqrt(charge):charge;
      var rotation=heading-native+(role==='cast'?(1-held)*profile.swing*side:profile.swing*side*Math.sin(p*Math.PI)*.45);
      if(semantic==='circuit-shield')rotation=(role==='cast'?(1-charge)*-.12:p*.12);
      // No explosion/dissolve is applied to memory/core/record ownership. The
      // finite accent recoils at the hostile command's own emission point.
      var recoil=role==='cast'?-profile.recoil*(1-held)*.35:profile.recoil*Math.sin(p*Math.PI)*(envelope===1?-1:1);
      var size = (low ? 44 : 54)*profile.scale*(role==='cast'? .72+.28*held:.96+.10*Math.sin(p*Math.PI));
      if(semantic==='hell-rotor'||semantic==='weapon')size*=1.12;
      if(role==='laser')size*=1.06;
      var alpha=role==='cast'?.23+.37*charge:.56*Math.min(1,(1-p)*2);
      // v24's separately reviewed Lust props, stage clocks and accent remain
      // the reference battle; this pass changes the other 34 configurations.
      if(profile.index===8){rotation=role==='cast'?0:(spec.turn||0)*p;recoil=0;size=(low?44:54)*(role==='cast'?.86+.12*charge:.94+p*.10);alpha=role==='cast'?.18+charge*.22:.48*Math.min(1,(1-p)*2);}
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.translate(x+Math.cos(heading)*recoil,y+Math.sin(heading)*recoil); ctx.rotate(rotation);
      ctx.drawImage(art.canvas, -size / 2, -size / 2, size, size); ctx.restore();
      metrics.skillSourceDraws++; metrics[role === 'cast' ? 'skillCastDraws' : role === 'laser' ? 'skillLaserDraws' : 'skillReleaseDraws']++;
      metrics.sourceKeys[spec.key] = (metrics.sourceKeys[spec.key] || 0) + 1;metrics.skillCueIds[cueId]=(metrics.skillCueIds[cueId]||0)+1;
      return {cueId:cueId,phaseRole:phaseRole,rotation:rotation,displaySize:size,releaseAge:age};
    }
    function detachedSurface(spec, origins, low, profile) {
      if(!spec||!Array.isArray(origins)||!origins.length||origins.length>7)return null;
      var valid=origins.every(function(o){return o&&[o.x,o.y,o.angle].every(finite)&&o.x>=0&&o.x<=360&&o.y>=0&&o.y<=440;});
      if(!valid)return null;
      var key='detached|'+spec.key+'|'+spec.crop.join(',')+'|'+(low?'low':'high')+'|'+profile.id+'|'+origins.map(function(o){return[o.x,o.y,o.angle].join(',');}).join(';'),known=cache.get(key);
      if(known)return known;
      var art=surface(spec);if(!art)return null;
      // Several shots emerge from one narrow turret/pipe. Cluster only points
      // within 24px of every other member: one compact source icon identifies
      // that emitter without stacking seven opaque pictures over the playfield.
      var groups=[];
      origins.forEach(function(o){var group=groups.find(function(g){return g.every(function(p){return Math.hypot(p.x-o.x,p.y-o.y)<=24;});});if(group)group.push(o);else groups.push([o]);});
      var emitters=groups.map(function(g){var x=0,y=0,sin=0,cos=0;g.forEach(function(o){x+=o.x;y+=o.y;sin+=Math.sin(o.angle);cos+=Math.cos(o.angle);});return {x:x/g.length,y:y/g.length,angle:Math.atan2(sin,cos),shotCount:g.length};});
      var size=(low?44:54)*profile.scale,pad=Math.ceil(size*Math.SQRT2/2)+2;
      var left=Math.floor(Math.min.apply(null,emitters.map(function(o){return o.x;}))-pad),top=Math.floor(Math.min.apply(null,emitters.map(function(o){return o.y;}))-pad);
      var width=Math.ceil(Math.max.apply(null,emitters.map(function(o){return o.x;}))+pad-left),height=Math.ceil(Math.max.apply(null,emitters.map(function(o){return o.y;}))+pad-top);
      if(width>440||height>520||!global.document||!global.document.createElement)return null;
      var c=global.document.createElement('canvas');c.width=width;c.height=height;var context=c.getContext('2d');
      if(!context){release({canvas:c});return null;}
      var native=finite(SOURCE_HEADINGS[spec.key])?SOURCE_HEADINGS[spec.key]:Math.PI/2;
      emitters.forEach(function(o){context.save();context.translate(o.x-left,o.y-top);context.rotate(o.angle-native);context.drawImage(art.canvas,-size/2,-size/2,size,size);context.restore();});
      // Bake the complete detached volley once. Its live warning/release costs
      // one draw even on the four-draw path; opacity never moves its origins.
      return remember(key,{canvas:c,bytes:width*height*4,x:left,y:top,emitters:emitters,size:size});
    }
    function paintDetached(ctx,spec,role,event,age,duration,progress,low,profile,phase){
      var art=detachedSurface(spec,event.emissionOrigins,low,profile);
      if(!art){metrics.skillMissingAssets++;return false;}
      var phaseRole=profile.phaseRoles[phase],cueId=profile.id+':'+phaseRole+':'+(event.identityRole||event.kind||role);
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=role==='cast'?.23+.37*clamp(progress,0,1):.56*Math.min(1,(1-age/duration)*2);ctx.drawImage(art.canvas,art.x,art.y);ctx.restore();
      metrics.skillSourceDraws++;metrics[role==='cast'?'skillCastDraws':'skillReleaseDraws']++;metrics.skillDetachedDraws++;
      metrics.sourceKeys[spec.key]=(metrics.sourceKeys[spec.key]||0)+1;metrics.skillCueIds[cueId]=(metrics.skillCueIds[cueId]||0)+1;
      return {cueId:cueId,phaseRole:phaseRole,rotation:0,displaySize:art.size,releaseAge:age,detached:true,x:art.emitters[0].x,y:art.emitters[0].y,emissionOrigins:art.emitters.map(function(o){return Object.assign({},o);})};
    }
    function draw(ctx, world, low) {
      if (!world || !world.campaign || world.stage !== 'boss' || !world.boss || !finite(world.tick)) return;
      var chapter=world.campaignRevision>=4&&world.bossIndex>=12&&world.bossIndex<=17;
      var story=world.campaignRevision>=5&&world.bossIndex>=18&&!world.finalPractice;
      var index = world.finalPractice ? 12 : chapter||story?world.bossIndex+1:world.bossIndex, entry = world.finalPractice ? {cast:world.phase===1?CULT_STITCH:CULT_FOLD,release:world.phase===2?CULT_IMPACT:CULT_LANCE,laser:CULT_LANCE} : chapter?chapterSpecs(index):specsFor(index); if (!entry) return;
      if (encounter !== index) { clear(); encounter = index; }
      var limit = low ? 4 : 8; metrics.skillDrawLimit = limit;
      var b = world.boss, progress = clamp(b.actionProgress || 0, 0, 1);
      var profile=profileFor(index);metrics.skillProfileId=profile.id;
      function phaseFor(event){return event&&Number.isInteger(event.sourcePhase)&&event.sourcePhase>=0&&event.sourcePhase<=2?event.sourcePhase:clamp(Math.floor(world.phase||0),0,2);}
      function specFor(role,event){
        var source=event&&(event.modelActorId||event.sourceActorId),owner=source&&entry.participants&&entry.participants[source]||entry,spec=owner[role];
        var identity=event&&event.identityRole,phase=phaseFor(event),prop=identity==='late-pulse'?'h25SlothTissue':identity==='hungry-jaw'?'h25GluttonKnife':identity==='vault-branch'&&phase<2?(phase===1?'h25GreedTreasure':'h25GreedMoney'):null;
        // These inspected whole props are also the required projectile source
        // for the same committed identity cast. Missing pixels omit the cue;
        // they never borrow a different owner's art or a geometric fallback.
        if(prop)return {key:prop,width:256,height:256,crop:[0,0,256,256],authoredFrames:1,turn:0};
        if(identity==='authority-fold')return CULT_FOLD;
        if(identity==='authority-stitch')return CULT_STITCH;
        if(identity==='authority-impact')return CULT_IMPACT;
        return Array.isArray(spec)?spec[Math.min(phase,spec.length-1)]:spec;
      }
      function recordCast(plan,spec,drawn,progress){
        if(!drawn)return;var record=Object.assign({id:plan.id||'',sourceKey:spec.key,x:plan.x,y:plan.y,progress:progress,warningAt:plan.warningAt,activeAt:plan.activeAt,patternId:plan.patternId||'',identityRole:plan.identityRole||'',planned:!!plan.planned},drawn);
        if(plan.sourceActorId)record.sourceActorId=plan.sourceActorId;if(plan.modelActorId)record.modelActorId=plan.modelActorId;metrics.representedCasts.push(record);
      }
      // The actual locked 54-tick identity warnings take precedence over the
      // generic boss charge and cosmetic release echoes. Core admits at most
      // four live plans, so even the low path can show every pending origin.
      var plans=Array.isArray(b.identityCasts)?b.identityCasts:[];
      for(var q=0;q<plans.length&&metrics.skillSourceDraws<limit;q++){
        var plan=plans[q];if(!plan||plan.cancelled||![plan.x,plan.y,plan.warningAt,plan.activeAt].every(finite)||plan.activeAt<=plan.warningAt||world.tick<plan.warningAt||world.tick>=plan.activeAt)continue;
        metrics.skillWarningCandidates++;var pr=clamp((world.tick-plan.warningAt)/(plan.activeAt-plan.warningAt),0,1),castSpec=specFor('cast',plan)||specFor('release',plan);
        var shown=plan.emissionOrigins?paintDetached(ctx,castSpec,'cast',plan,pr,2,pr,low,profile,phaseFor(plan)):paint(ctx,castSpec,'cast',plan.x,plan.y,pr,2,pr,low,profile,phaseFor(plan),plan);
        if(shown){metrics.skillWarningDraws++;recordCast(Object.assign({},plan,{planned:true}),castSpec,shown,pr);}
      }
      // The bounded records are emitted only after a real projectile group or
      // laser activation succeeds. A dropped group creates no release accent.
      var events = Array.isArray(b.skillReleases) ? b.skillReleases : null;
      if (events) {
        // Several real emitters can fire the same kind on the same tick. Keep
        // their committed positions instead of treating the whole volley as
        // one effect. Give each origin one accent before spending the bounded
        // budget on additional kinds from an already represented origin.
        var primary=[],secondary=[],seenEvents=Object.create(null),seenEmitters=Object.create(null);
        for (var i = events.length - 1, visited = 0; i >= 0 && visited < 8; i--, visited++) {
          var e = events[i]; if (!e || !finite(e.tick) || e.tick < 0) continue;
          var age = world.tick - e.tick,origin=e.sourceActorId||e.x+'|'+e.y,identity=e.tick+'|'+e.kind+'|'+e.patternId+'|'+origin+'|'+e.x+'|'+e.y;
          if (seenEvents[identity] || age < 0 || age >= 30 || !finite(e.x) || !finite(e.y)) continue;
          seenEvents[identity]=true;metrics.skillReleaseCandidates++;
          if(seenEmitters[origin])secondary.push(e);else{seenEmitters[origin]=true;metrics.skillReleaseEmitters++;primary.push(e);}
        }
        // On the four-draw path, sample a crowded set of origins evenly. This
        // depends only on the release records, not wall time or frame parity,
        // so a paused/repeated frame cannot make accents jump between emitters.
        var selected=primary;
        if(primary.length>limit){
          selected=[];var sampled=Object.create(null);
          for(var n=0;n<limit;n++){var pick=Math.floor(n*(primary.length-1)/Math.max(1,limit-1));sampled[pick]=true;selected.push(primary[pick]);}
          for(var n=0;n<primary.length;n++)if(!sampled[n])selected.push(primary[n]);
        }
        selected=selected.concat(secondary);
        for(var j=0;j<selected.length&&metrics.skillSourceDraws<limit;j++){
          var e=selected[j],age=world.tick-e.tick;
          var laser = e.kind === 'laser', spec = laser ? specFor('laser',e) || specFor('release',e) : specFor('release',e);
          var shown=e.emissionOrigins&&!laser?paintDetached(ctx,spec,'release',e,age,30,0,low,profile,phaseFor(e)):paint(ctx, spec, laser ? 'laser' : 'release', e.x, e.y, age, 30, 0, low,profile,phaseFor(e),e);
          if (shown) {var represented=Object.assign({ tick:e.tick,kind:e.kind,patternId:e.patternId||'',identityRole:e.identityRole||'',x:e.x,y:e.y,sourceKey:spec.key },shown);if(e.sourceActorId)represented.sourceActorId=e.sourceActorId;if(e.modelActorId)represented.modelActorId=e.modelActorId;metrics.representedReleases.push(represented);}
        }
      } else if (finite(b.releaseTick) && b.releaseTick >= 0) {
        var releaseAge = world.tick - b.releaseTick;
        var releaseSpec=specFor('release');
        if (metrics.skillSourceDraws < limit) {var legacy=paint(ctx, releaseSpec, 'release', b.x, b.y + 20, releaseAge, 24, 0, low,profile,world.phase);if(legacy)metrics.representedReleases.push(Object.assign({ tick: b.releaseTick, kind: 'legacy-release', patternId: '',x:b.x,y:b.y+20,sourceKey:releaseSpec.key },legacy));}
      }
      // Confirmed releases take priority over a preparation accent that may
      // overlap their attack clock. Any remaining cast budget is still capped.
      function hasPlannedCharge(id,x,y){return metrics.representedCasts.some(function(c){return c.planned&&(!c.sourceActorId||c.sourceActorId===id)&&(c.detached||Math.hypot(c.x-x,c.y-y)<32);});}
      var cast=specFor('cast');
      if (b.action === 'charge' && cast && metrics.skillSourceDraws < limit) {if(hasPlannedCharge(null,b.x,b.y+24))metrics.skillChargeSuppressed++;else recordCast({x:b.x,y:b.y+24,patternId:b.specialPatternId},cast,paint(ctx, cast, 'cast', b.x, b.y + 24, progress, 2, progress, low,profile,world.phase),progress);}
      if(story&&Array.isArray(b.participants))b.participants.forEach(function(p){var event={sourceActorId:p.id},spec=specFor('cast',event),pr=clamp(p.actionProgress||0,0,1);if(p.action==='charge'&&spec&&metrics.skillSourceDraws<limit){if(hasPlannedCharge(p.id,p.x,p.y+24))metrics.skillChargeSuppressed++;else recordCast({x:p.x,y:p.y+24,sourceActorId:p.id,patternId:b.specialPatternId},spec,paint(ctx,spec,'cast',p.x,p.y+24,pr,2,pr,low,profile,world.phase,event),pr);}});
    }
    beginFrame();
    return { beginFrame: beginFrame, draw: draw, getMetrics: function () { return Object.assign({}, metrics, { sourceKeys: Object.assign({}, metrics.sourceKeys), skillCueIds:Object.assign({},metrics.skillCueIds), representedReleases: metrics.representedReleases.slice(), representedCasts:metrics.representedCasts.slice(), skillCacheEntries: cache.size, skillCacheBytes: bytes, skillCacheByteLimit: CACHE_BYTES, skillCacheEntryLimit: CACHE_ENTRIES }); }, destroy: function () { clear(); images = {}; } };
  }
  global.HapilBossSkills = Object.freeze({ create: create, assetKeysForEncounter: assetKeysForEncounter, optionalAssetKeysForEncounter: optionalAssetKeysForEncounter, invalidOptionalAssetForEncounter: invalidOptionalAssetForEncounter, encounters: ENCOUNTERS, presentationProfiles:PRESENTATION_PROFILES, presentationForEncounter:profileFor });
})(typeof window !== 'undefined' ? window : globalThis);
