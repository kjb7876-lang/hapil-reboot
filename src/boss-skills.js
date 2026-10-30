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
    function beginFrame() { metrics = { skillSourceDraws: 0, skillCastDraws: 0, skillReleaseDraws: 0, skillLaserDraws: 0, skillMissingAssets: 0, skillDrawLimit: 8, skillReleaseCandidates: 0, skillReleaseEmitters: 0, sourceKeys: {}, representedReleases: [] }; }
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
    function paint(ctx, spec, role, x, y, age, duration, progress, low) {
      if (!spec || ![x, y, age, duration].every(finite) || age < 0 || duration <= 0 || age >= duration) return false;
      if (x < 0 || x > 360 || y < 0 || y > 220) return false;
      var art = surface(spec); if (!art) { metrics.skillMissingAssets++; return false; }
      var p = clamp(age / duration, 0, 1), alpha = role === 'cast' ? .18 + clamp(progress || 0, 0, 1) * .22 : .48 * Math.min(1, (1 - p) * 2);
      var size = (low ? 44 : 54) * (role === 'cast' ? .86 + .12 * clamp(progress || 0, 0, 1) : .94 + p * .10);
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
      ctx.translate(x, y); ctx.rotate(role === 'cast' ? 0 : (spec.turn || 0) * p);
      ctx.drawImage(art.canvas, -size / 2, -size / 2, size, size); ctx.restore();
      metrics.skillSourceDraws++; metrics[role === 'cast' ? 'skillCastDraws' : role === 'laser' ? 'skillLaserDraws' : 'skillReleaseDraws']++;
      metrics.sourceKeys[spec.key] = (metrics.sourceKeys[spec.key] || 0) + 1; return true;
    }
    function draw(ctx, world, low) {
      if (!world || !world.campaign || world.stage !== 'boss' || !world.boss || !finite(world.tick)) return;
      var chapter=world.campaignRevision>=4&&world.bossIndex>=12&&world.bossIndex<=17;
      var story=world.campaignRevision>=5&&world.bossIndex>=18&&!world.finalPractice;
      var index = world.finalPractice ? 12 : chapter||story?world.bossIndex+1:world.bossIndex, entry = world.finalPractice ? {cast:world.phase===1?CULT_STITCH:CULT_FOLD,release:world.phase===2?CULT_IMPACT:CULT_LANCE,laser:CULT_LANCE} : chapter?chapterSpecs(index):specsFor(index); if (!entry) return;
      if (encounter !== index) { clear(); encounter = index; }
      var limit = low ? 4 : 8; metrics.skillDrawLimit = limit;
      var b = world.boss, progress = clamp(b.actionProgress || 0, 0, 1);
      function specFor(role,event){var source=event&&(event.modelActorId||event.sourceActorId),owner=source&&entry.participants&&entry.participants[source]||entry,spec=owner[role];return Array.isArray(spec)?spec[Math.min(world.phase||0,spec.length-1)]:spec;}
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
          if (paint(ctx, spec, laser ? 'laser' : 'release', e.x, e.y, age, 30, 0, low)) {var represented={ tick:e.tick,kind:e.kind,patternId:e.patternId||'',x:e.x,y:e.y,sourceKey:spec.key };if(e.sourceActorId)represented.sourceActorId=e.sourceActorId;if(e.modelActorId)represented.modelActorId=e.modelActorId;metrics.representedReleases.push(represented);}
        }
      } else if (finite(b.releaseTick) && b.releaseTick >= 0) {
        var releaseAge = world.tick - b.releaseTick;
        var releaseSpec=specFor('release');
        if (metrics.skillSourceDraws < limit && paint(ctx, releaseSpec, 'release', b.x, b.y + 20, releaseAge, 24, 0, low)) metrics.representedReleases.push({ tick: b.releaseTick, kind: 'legacy-release', patternId: '',x:b.x,y:b.y+20,sourceKey:releaseSpec.key });
      }
      // Confirmed releases take priority over a preparation accent that may
      // overlap their attack clock. Any remaining cast budget is still capped.
      var cast=specFor('cast');
      if (b.action === 'charge' && cast && metrics.skillSourceDraws < limit) paint(ctx, cast, 'cast', b.x, b.y + 24, progress, 2, progress, low);
      if(story&&Array.isArray(b.participants))b.participants.forEach(function(p){var spec=specFor('cast',{sourceActorId:p.id}),pr=clamp(p.actionProgress||0,0,1);if(p.action==='charge'&&spec&&metrics.skillSourceDraws<limit)paint(ctx,spec,'cast',p.x,p.y+24,pr,2,pr,low);});
    }
    beginFrame();
    return { beginFrame: beginFrame, draw: draw, getMetrics: function () { return Object.assign({}, metrics, { sourceKeys: Object.assign({}, metrics.sourceKeys), representedReleases: metrics.representedReleases.slice(), skillCacheEntries: cache.size, skillCacheBytes: bytes, skillCacheByteLimit: CACHE_BYTES, skillCacheEntryLimit: CACHE_ENTRIES }); }, destroy: function () { clear(); images = {}; } };
  }
  global.HapilBossSkills = Object.freeze({ create: create, assetKeysForEncounter: assetKeysForEncounter, optionalAssetKeysForEncounter: optionalAssetKeysForEncounter, invalidOptionalAssetForEncounter: invalidOptionalAssetForEncounter, encounters: ENCOUNTERS });
})(typeof window !== 'undefined' ? window : globalThis);
