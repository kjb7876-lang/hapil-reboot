/* HAPIL: memory corridor. Pure deterministic 60 Hz combat; no DOM, timers or input automation. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var W = 360, H = 640, FIXED_DT = 1 / 60, TAU = Math.PI * 2;
  var RULESET = 'hapil-firstbattle-1';
  var CAPS = Object.freeze({ bullets: 768, shots: 96, enemies: 12, effects: 96, hazards: 40 });
  var PHASE_HP = [1700, 1850, 2000];
  var NAMES = ['여덟 실의 문', '보라검의 각인', '끊어진 날개의 결'];
  // Names/route follow the supplied narrative. Attack labels are gameplay
  // adaptations, not additional dialogue or claims about the original story.
  var CAMPAIGN_BOSSES = Object.freeze([
    Object.freeze({ id: 'violet', name: '보라검천사', artKey: 'boss', zone: '거미동굴', waves: Object.freeze(['숲의 진입로', '악마화 나무의 정원', '거미동굴']), patterns: Object.freeze(['여덟 실의 나선', '보라검의 각인', '끊어진 날개의 결']), hp: Object.freeze([1200, 1350, 1500]) }),
    Object.freeze({ id: 'horn', name: '늪지대의 뿔악마', artKey: 'horn', zone: '검은 늪', waves: Object.freeze(['늪지대의 기억']), patterns: Object.freeze(['늪에서 번지는 기억', '붙잡는 손의 틈', '뿔에 걸린 잔상']), hp: Object.freeze([1320, 1470, 1620]) }),
    Object.freeze({ id: 'balrog', name: '발록', artKey: 'balrog', zone: '지옥의 소환진', waves: Object.freeze(['무너진 성', '시체들이 되살아난 밤', '일곱 기둥']), patterns: Object.freeze(['공간을 가르는 검', '하늘을 덮는 불덩이', '마지막 봉인']), hp: Object.freeze([1440, 1590, 1740]) }),
    Object.freeze({ id:'mask', name:'초천사의 웃는 가면', artKey:'actorMaskIdle', zone:'거짓 천국의 문', waves:Object.freeze(['추락 · 병원 복도','주사실의 봉인 기억','환자와 중독의 도시']), patterns:Object.freeze(['흰 날개의 약속','완벽해야 한다는 명령','웃는 가면의 균열']), hp:Object.freeze([1500,1650,1800]) }),
    Object.freeze({ id:'lucifer', name:'코스믹 가면 루시퍼', artKey:'actorLuciferIdle', zone:'가면 안의 우주', waves:Object.freeze(['부정의 행렬','오만의 흰 가면','도움을 청하는 문']), patterns:Object.freeze(['천구 · 거짓된 별자리','이면 · 수많은 나의 얼굴','합일 · J의 인장']), hp:Object.freeze([1600,1800,2000]) })
  ]);
  // Original gameplay compositions use locked aim, alternating emission and
  // visible recovery windows. These labels describe combat, not extra lore.
  var CAMPAIGN_SIGNATURES = Object.freeze([
    Object.freeze({id:'violet-thread-gate',label:'교차 직조',hint:'보라 실 사이의 넓은 틈을 따라가세요'}),
    Object.freeze({id:'horn-memory-echo',label:'잔류 기억 고리',hint:'느린 고리가 빨라지기 전, 열린 틈으로 이동하세요'}),
    Object.freeze({id:'balrog-seven-pillars',label:'일곱 기둥의 봉인',hint:'일곱 기둥 중 빛나지 않는 두 길을 찾으세요'}),
    Object.freeze({id:'mask-alternating-wings',label:'엇갈린 날개의 틈',hint:'양쪽 깃 사이에서 움직이는 틈을 따라가세요'}),
    Object.freeze({id:'lucifer-fivefold-sky',label:'다섯 겹 별자리',hint:'다섯 갈래 별빛 사이의 틈과 고정된 광선을 구분하세요'})
  ]);
  var runSequence = 0;
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function sq(n) { return n * n; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function encounter(w) { return CAMPAIGN_BOSSES[w.bossIndex || 0]; }
  function campaignLabels(w) {
    if (!w.campaign) return;
    var info = encounter(w);
    w.bossId = info.id; w.bossName = info.name; w.bossCount = CAMPAIGN_BOSSES.length;
    w.encounterName = w.stage === 'waves' ? info.waves[w.wave] : info.zone;
    if (w.stage === 'waves') {
      w.patternName = info.waves[w.wave];
      w.stageLabel = info.waves[w.wave] + ' · ' + (w.wave + 1) + '/' + info.waves.length;
    } else if (w.stage === 'boss') {
      w.patternName = info.patterns[w.phase];
      w.stageLabel = info.name + ' · ' + (w.phase + 1) + '/3' + (w.practiceBoss ? ' · 연습' : '');
    }
  }
  function makeBoss(w, phase, id) {
    var hp = w.campaign ? encounter(w).hp[phase] : PHASE_HP[phase];
    var b = { id: id, x: 180, y: 116, px: 180, py: 116, hp: hp, maxHp: hp, phase: phase, opacity: 1, r: 29, isBoss: true };
    if (w.campaign) {
      var info = encounter(w);
      Object.assign(b, { kind: info.id, name: info.name, artKey: info.artKey, action: 'move', actionProgress: 0, lean: 0, releaseTick: -1,
        specialPatternId: phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].id:'',
        specialPatternLabel: phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].label:'',
        patternHint: phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].hint:'' });
    }
    return b;
  }
  // Squared distance from a point to a finite segment.
  function segmentDistanceSquared(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, den = dx * dx + dy * dy;
    var t = den ? clamp(((px - ax) * dx + (py - ay) * dy) / den, 0, 1) : 0;
    return sq(px - ax - t * dx) + sq(py - ay - t * dy);
  }
  function orient(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }
  function segmentPairDistanceSquared(ax, ay, bx, by, cx, cy, dx, dy) {
    var a = orient(ax, ay, bx, by, cx, cy), b = orient(ax, ay, bx, by, dx, dy);
    var c = orient(cx, cy, dx, dy, ax, ay), d = orient(cx, cy, dx, dy, bx, by);
    if (a * b <= 0 && c * d <= 0 && Math.max(Math.min(ax, bx), Math.min(cx, dx)) <= Math.min(Math.max(ax, bx), Math.max(cx, dx)) && Math.max(Math.min(ay, by), Math.min(cy, dy)) <= Math.min(Math.max(ay, by), Math.max(cy, dy))) return 0;
    return Math.min(segmentDistanceSquared(ax, ay, cx, cy, dx, dy), segmentDistanceSquared(bx, by, cx, cy, dx, dy), segmentDistanceSquared(cx, cy, ax, ay, bx, by), segmentDistanceSquared(dx, dy, ax, ay, bx, by));
  }
  // Both circles move: A=(ax,ay)->(bx,by), B=(cx,cy)->(dx,dy); radius is their combined radius.
  function sweptCircleHit(ax, ay, bx, by, cx, cy, dx, dy, radius) {
    return segmentDistanceSquared(0, 0, ax - cx, ay - cy, bx - dx, by - dy) <= radius * radius;
  }
  function projectileDistanceSquared(b, px, py, x, y) {
    var l = b.halfLength || 0, ux = Math.cos(b.angle || 0) * l, uy = Math.sin(b.angle || 0) * l;
    return segmentPairDistanceSquared(b.px - px, b.py - py, b.x - x, b.y - y, -ux, -uy, ux, uy);
  }
  function hazardDistanceSquared(h, px, py, x, y) {
    return segmentPairDistanceSquared(px, py, x, y, h.x1, h.y1, h.x2, h.y2);
  }
  function rand(w) {
    var x = w.rngState | 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    w.rngState = x >>> 0;
    return w.rngState / 4294967296;
  }
  function event(w, type, name) {
    if (w.events.length >= 64) w.events.shift();
    w.events.push({ type: type, name: name || '' });
  }
  function acquire(w, type, obj) {
    if (w[type].length >= CAPS[type]) return null;
    var out = w._pools[type].pop() || {};
    Object.keys(out).forEach(function (k) { delete out[k]; });
    Object.assign(out, obj);
    w[type].push(out);
    return out;
  }
  function remove(w, type, index) {
    var a = w[type], obj = a[index];
    a.splice(index, 1);
    if (w._pools[type].length < CAPS[type]) w._pools[type].push(obj);
  }
  function effect(w, x, y, kind, r, color, ttl) {
    acquire(w, 'effects', { x: x, y: y, kind: kind, r: r || 12, color: color || '#88ffed', age: 0, ttl: ttl || 0.35 });
  }
  function emit(w, specs) {
    if (w.bullets.length + specs.length > CAPS.bullets) {
      w.stats.poolPressure++; // Caller retains or reports the whole group; no live projectile is evicted.
      if (w._deferred.length < 16) w._deferred.push(specs);
      else w.stats.droppedGroups++;
      return false;
    }
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i], kind = s.kind || 'orb', speed = s.speed * (w.difficulty === 'gentle' ? 0.82 : 1);
      var added = acquire(w, 'bullets', { id: ++w.idCounter, x: s.x, y: s.y, px: s.x, py: s.y,
        vx: Math.cos(s.angle) * speed, vy: Math.sin(s.angle) * speed,
        r: s.r || (kind === 'blade' ? 4 : kind === 'needle' ? 3 : 3.8),
        halfLength: kind === 'blade' ? 13 : kind === 'needle' ? 9 : 0,
        angle: s.angle, kind: kind, color: s.color || '#c4a2ff', age: 0, ttl: s.ttl || 6.4,
        ownerId: s.ownerId || 0, grazed: false });
      if (added && s.patternId) { added.patternId = s.patternId; added.paletteSlot = s.paletteSlot || 0; }
      if (added && s.acceleration) {
        added.acceleration = s.acceleration * (w.difficulty === 'gentle' ? 0.82 : 1);
        added.maxSpeed = (s.maxSpeed || 150) * (w.difficulty === 'gentle' ? 0.82 : 1);
        added.accelerateAt = s.accelerateAt || 0.65;
      }
    }
    // Presentation follows actual successful emission, including deferred
    // groups; this marker does not alter projectile or damage simulation.
    if (specs.length && w.campaign && w.stage === 'boss' && w.boss && specs.some(function(s) { return s.ownerId === w.boss.id; })) w.boss.releaseTick = w.tick;
    return true;
  }
  function fanSpecs(x, y, angle, count, spread, speed, kind, color, ownerId) {
    var specs = [];
    for (var i = 0; i < count; i++) specs.push({ x: x, y: y, angle: angle + (i - (count - 1) / 2) * spread, speed: speed, kind: kind, color: color, ownerId: ownerId });
    return specs;
  }
  function warning(w, specs, delay, name) {
    if (w.hazards.length + specs.length > CAPS.hazards) { w.stats.poolPressure++; w.stats.droppedGroups++; return false; }
    var castId = ++w.idCounter;
    var warningTicks = Math.max(54, delay || 54) + (w.difficulty === 'gentle' ? 12 : 0);
    var activeTicks = w.difficulty === 'gentle' ? 18 : 24, fadeTicks = 15;
    specs.forEach(function (s) {
      // One committed capsule is rendered throughout warning, active and fade.
      // No projectile is substituted and its aim never follows either actor.
      var hazard = acquire(w, 'hazards', { id: ++w.idCounter, castId: castId, ownerId: s.ownerId || 0, kind: 'laser', x1: s.x, y1: s.y,
        x2: s.x + Math.cos(s.angle) * 680, y2: s.y + Math.sin(s.angle) * 680,
        width: s.width || (s.kind === 'blade' ? 8 : 6), color: s.color || '#d1aaff',
        phase: 'warning', progress: 0, born: w.tick, warningTicks: warningTicks, activeTicks: activeTicks, fadeTicks: fadeTicks,
        activeAt: w.tick + warningTicks, fadeAt: w.tick + warningTicks + activeTicks,
        expireAt: w.tick + warningTicks + activeTicks + fadeTicks, grazed: false, name: name });
      // The spatial-horror text directs attention to Balrog's traces on the
      // floor before its moving shadow. This labels the existing committed
      // laser warning only; geometry, timing, damage and bullet count do not change.
      if (hazard && s.patternId) { hazard.patternId = s.patternId; hazard.paletteSlot = s.paletteSlot || 0; }
      if (hazard && w.campaign && w.bossIndex === 2) {
        hazard.telegraphKind = 'floor-scar';
        hazard.telegraphHint = '검빛이 켜지기 전, 바닥의 흔적을 읽으세요';
      }
    });
    return true;
  }
  function emptyStats() {
    return { hits: 0, shots: 0, damage: 0, casts: { memory: 0, delay: 0, counter: 0, ego: 0 }, peakBullets: 0, peakEnemies: 0, peakParticles: 0,
      poolPressure: 0, droppedGroups: 0, missedEnemies: 0, resourceStarvation: 0, bossDamage: 0, phaseTicks: [], collisions: 0 };
  }
  function createRun(options) {
    options = options || {};
    var seed = finite(options.seed) ? options.seed >>> 0 : 12345;
    if (!seed) seed = 0x6d2b79f5;
    var gentle = options.difficulty === 'gentle';
    var runId = typeof options.runId === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(options.runId) ? options.runId : 'hapil-' + Date.now().toString(36) + '-' + (++runSequence).toString(36);
    var w = { rulesetVersion: RULESET, mechanicsRevision: 2, runId: runId, seed: seed, rngState: seed, difficulty: gentle ? 'gentle' : 'normal', practiceBoss: !!options.practiceBoss,
      tick: 0, time: 0, stage: 'waves', stageTime: 0, bossIntroDuration: 2.5, wave: 0, waveTime: 0, waveDuration: 15, phase: 0, phaseTime: 0, phaseTargetDuration: 25, phaseTimeout: 75,
      patternName: '세 갈래의 기억', stageLabel: '기억 회랑 · 1/3', phaseProgress: 0, player: { x: 180, y: 540, hp: gentle ? 5 : 3, maxHp: gentle ? 5 : 3, r: 3, invulnerableUntil: 0, egoUntil: 0 },
      boss: null, enemies: [], bullets: [], shots: [], effects: [], hazards: [], score: 0, graze: 0, kills: 0, memory: 0, resonance: 0,
      autoAttack: true, skillRotation: true, reservation: false, stats: emptyStats(), events: [], checkpointSerial: 0, idCounter: 0,
      skills: { memoryReadyAt: 0, delayReadyAt: 360, counterReadyAt: 0, egoReadyAt: 0, globalReadyAt: 0 },
      nextPhase: null, transitionRemaining: 0, resultReason: '', _pools: { bullets: [], shots: [], enemies: [], effects: [], hazards: [] },
      _warnings: [], _delays: [], _deferred: [], _shotReadyAt: 0, _targetId: 0, _targetUntil: 0, _lastGraze: -9999, _boundaryTick: -1,
      _memoryBucket: 0, _memoryGain: 0, _resBucket: 0, _resGain: 0, _grazeGain: 0, _reservationSince: 0, _starvationReported: false, _checkpoint: null };
    if (options.campaign === true) {
      if (options.bossIndex !== undefined && (!Number.isInteger(options.bossIndex) || options.bossIndex < 0 || options.bossIndex >= CAMPAIGN_BOSSES.length)) throw new RangeError('Invalid campaign boss index');
      w.campaign = true; w.campaignRevision = 2;
      w.bossIndex = w.practiceBoss && Number.isInteger(options.bossIndex) ? clamp(options.bossIndex, 0, CAMPAIGN_BOSSES.length-1) : 0;
      w.mechanicsRevision = 4;
      campaignLabels(w);
    }
    if (w.practiceBoss) startBossPhase(w, 0, false);
    else cacheCheckpoint(w);
    return w;
  }
  function target(w) {
    var p = w.player, candidates = w.enemies.filter(function (e) { return e.hp > 0 && e.y >= 0 && e.y < p.y && e.x >= 0 && e.x <= W; });
    if (w.stage === 'boss' && w.boss && w.boss.hp > 0 && w.boss.y < p.y) candidates.push(w.boss);
    var locked = candidates.find(function (e) { return e.id === w._targetId; });
    if (locked && w.tick < w._targetUntil) return locked;
    candidates.sort(function (a, b) {
      if (!!a.isBoss !== !!b.isBoss) return a.isBoss ? 1 : -1;
      return b.y - a.y || Math.abs(Math.atan2(a.x - p.x, p.y - a.y)) - Math.abs(Math.atan2(b.x - p.x, p.y - b.y)) || sq(a.x - p.x) + sq(a.y - p.y) - sq(b.x - p.x) - sq(b.y - p.y) || a.id - b.id;
    });
    var t = candidates[0] || null;
    w._targetId = t ? t.id : 0; w._targetUntil = w.tick + 12;
    return t;
  }
  function aim(p, t) {
    var a = t ? Math.atan2(t.y - p.y, t.x - p.x) : -Math.PI / 2;
    return Math.abs(a + Math.PI / 2) <= 55 * Math.PI / 180 ? a : -Math.PI / 2;
  }
  function fireShot(w, angle, damage, kind, xOffset) {
    var p = w.player;
    if (!acquire(w, 'shots', { id: ++w.idCounter, x: p.x + (xOffset || 0), y: p.y - 16, px: p.x + (xOffset || 0), py: p.y - 16,
      vx: Math.cos(angle) * 660, vy: Math.sin(angle) * 660, r: 2, age: 0, ttl: 1.2, damage: damage, kind: kind || 'basic', angle: angle })) return false;
    w.stats.shots++;
    return true;
  }
  function gainMemory(w, amount) {
    var bucket = Math.floor(w.tick / 60);
    if (bucket !== w._memoryBucket) { w._memoryBucket = bucket; w._memoryGain = 0; }
    var cap = w.tick < w.player.egoUntil ? 14 : 12;
    var n = Math.min(amount, cap - w._memoryGain);
    w.memory = clamp(w.memory + n, 0, 100); w._memoryGain += n;
  }
  function gainResonance(w, amount, graze) {
    var bucket = Math.floor(w.tick / 60);
    if (bucket !== w._resBucket) { w._resBucket = bucket; w._resGain = 0; w._grazeGain = 0; }
    var n = Math.min(amount, 12 - w._resGain, graze ? 9 - w._grazeGain : 12);
    w.resonance = clamp(w.resonance + n, 0, 100); w._resGain += n;
    if (graze) w._grazeGain += n;
  }
  function attack(w) {
    if (w.stage !== 'waves' && w.stage !== 'boss') return;
    var t = target(w), p = w.player, a = aim(p, t), sk = w.skills;
    if (w.autoAttack && w.tick >= w._shotReadyAt && w.shots.length < CAPS.shots) {
      fireShot(w, a, 10, 'basic');
      w._shotReadyAt = w.tick + (w.tick < p.egoUntil ? 7 : 9);
      event(w, 'shot');
    }
    var canDelay = !!t && (t.isBoss || w.enemies.length >= 3);
    var reserve = canDelay && sk.delayReadyAt - w.tick <= 60;
    if (reserve && !w.reservation) { w._reservationSince = w.tick; w._starvationReported = false; }
    w.reservation = reserve;
    if (!reserve) w._reservationSince = 0;
    if (reserve && !w._starvationReported && w.tick - w._reservationSince >= 480 && w.memory < 60) { w.stats.resourceStarvation++; w._starvationReported = true; }
    if (!w.skillRotation || !t || w.tick < sk.globalReadyAt) return;
    var name = '', cost = 0;
    if (w.resonance >= 90 && w.tick >= sk.egoReadyAt && w.tick >= p.egoUntil) {
      w.resonance -= 90; p.egoUntil = w.tick + 360; sk.egoReadyAt = w.tick + 1800; name = 'ego';
    } else if (w.resonance >= 30 && w.tick - w._lastGraze <= 36 && w.tick >= sk.counterReadyAt && w.memory >= 8 && (!reserve || w.memory - 8 >= 60) && w.shots.length + 2 <= CAPS.shots) {
      fireShot(w, a - 0.035, 18, 'counter', -2); fireShot(w, a + 0.035, 18, 'counter', 2);
      cost = 8; sk.counterReadyAt = w.tick + 180; name = 'counter';
    } else if (canDelay && w.memory >= 60 && w.tick >= sk.delayReadyAt && w._delays.length < 8) {
      w._delays.push({ at: w.tick + 27, targetId: t.id, x: t.x, y: t.y });
      effect(w, t.x, t.y, w.campaign ? 'delayCharge' : 'ring', 36, '#b5a2ff', 0.5);
      cost = 60; sk.delayReadyAt = w.tick + 480; w.reservation = false; name = 'delay';
    } else if (w.memory >= 24 && w.tick >= sk.memoryReadyAt && (!reserve || w.memory - 24 >= 60) && w.shots.length + 3 <= CAPS.shots) {
      for (var i = -1; i <= 1; i++) fireShot(w, a + i * 0.105, 16, 'memory');
      cost = 24; sk.memoryReadyAt = w.tick + 144; name = 'memory';
    }
    if (name) { w.memory -= cost; sk.globalReadyAt = w.tick + 15; w.stats.casts[name]++; event(w, 'skill', name); effect(w, p.x, p.y, w.campaign ? (name === 'delay' ? 'delayCharge' : name) : 'skill', name === 'ego' ? 30 : 20, '#9fffe8', 0.4); }
  }
  function spawnEnemy(w, x, kind, direction, delay) {
    if (w.enemies.length >= CAPS.enemies) { w.stats.poolPressure++; return; }
    var turret = kind === 'turret';
    var enemy = acquire(w, 'enemies', { id: ++w.idCounter, x: x, y: -24, px: x, py: -24, baseX: x, hp: turret ? 100 : 60, maxHp: turret ? 100 : 60,
      r: turret ? 18 : 15, kind: kind, age: -(delay || 0), direction: direction || 1, shotCursor: 0, wobble: rand(w) * TAU, life: turret ? 8 : 6.5 });
    if (w.campaign && enemy) Object.assign(enemy, { archetype: (w.bossIndex < 3 ? ['weaver', 'wraith', 'ember'][w.bossIndex] : w.bossIndex === 3 ? (w.wave === 1 ? 'vial' : 'echo') : (w.wave === 0 ? 'denial' : 'guard')), action: 'enter', actionProgress: 0, lean: 0 });
  }
  function startWave(w, wave) {
    while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
    w._delays.length = 0; w._targetId = 0; w._shotReadyAt = w.tick;
    w.reservation = false; w._reservationSince = 0; w._starvationReported = false;
    w.wave = wave; w.waveTime = 0; w.stageTime = 0; w.patternName = ['세 갈래의 기억', '교차하는 거미실', '회랑의 끝'][wave];
    w.stageLabel = '기억 회랑 · ' + (wave + 1) + '/3';
    campaignLabels(w);
    cacheCheckpoint(w); event(w, 'phase', w.stageLabel);
  }
  function waveSchedule(w) {
    var t = Math.round(w.waveTime * 60), wave = w.wave;
    if (t === 60 || t === 270 || t === 480) {
      var side = (t === 270 ? -1 : 1) * (wave % 2 ? -1 : 1);
      for (var i = 0; i < 3; i++) spawnEnemy(w, side > 0 ? 62 + i * 58 : 298 - i * 58, 'scout', side, i * 0.22);
    }
    if (wave >= 1 && (t === 150 || (wave === 2 && t === 390))) {
      spawnEnemy(w, 42, 'turret', 1); spawnEnemy(w, 318, 'turret', -1);
    }
    if (wave === 2 && (t === 210 || t === 510)) {
      // Opposite upper anchors cross above the lower dodge lanes. At y540 the
      // two width6 cores leave broad middle and outside routes on a360 field.
      warning(w, [
        { x: 28, y: 108, angle: Math.atan2(532, 272), kind: 'needle', color: '#9fdcff' },
        { x: 332, y: 108, angle: Math.atan2(532, -272), kind: 'needle', color: '#ecb0fa' }
      ], 60, '교차하는 검빛');
    }
    if (t >= 900 && !w.bullets.length && !w.hazards.length && !w.enemies.length && !w._warnings.length && !w._deferred.length && !w._delays.length) {
      if (wave < (w.campaign ? encounter(w).waves.length - 1 : 2)) startWave(w, wave + 1);
      else {
        w.stage = 'bossIntro'; w.stageTime = 0; w.boss = null;
        w.patternName = w.campaign ? encounter(w).name : '보라검천사'; w.stageLabel = w.campaign ? encounter(w).zone : '독립 기억 전투';
        campaignLabels(w);
        while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
        while (w.effects.length) remove(w, 'effects', w.effects.length - 1);
        event(w, 'phase', w.patternName);
      }
    }
  }
  function updateEnemies(w) {
    for (var i = w.enemies.length - 1; i >= 0; i--) {
      var e = w.enemies[i]; e.px = e.x; e.py = e.y; e.age += FIXED_DT;
      if (e.age < 0) continue;
      if (w.campaign) {
        var arrive = clamp(e.age / 1.2, 0, 1), ease = arrive * arrive * (3 - 2 * arrive);
        var anchorY = e.kind === 'turret' ? 112 : 154;
        if (e.age < 1.2) {
          e.x = e.baseX + Math.sin(arrive * Math.PI) * e.direction * 26;
          e.y = -24 + ease * (anchorY + 24); e.action = 'enter'; e.actionProgress = arrive;
        } else if (e.age < e.life - 1.2) {
          var beat = (e.age - 1.2) % 1.65;
          e.x = e.baseX + Math.sin((e.age - 1.2) * 1.7 + e.wobble) * (e.kind === 'turret' ? 9 : 30);
          e.y = anchorY + Math.sin(e.age * 2.1 + e.wobble) * 10;
          var chargeTime = e.kind === 'turret' && w.difficulty === 'gentle' ? 1.1 : .9;
          e.action = beat < chargeTime ? 'charge' : beat < chargeTime + .4 ? 'attack' : 'recover';
          e.actionProgress = beat / 1.65;
        } else { e.x += e.direction * 150 * FIXED_DT; e.y -= 35 * FIXED_DT; e.action = 'exit'; e.actionProgress = clamp((e.age - e.life + 1.2) / 1.2, 0, 1); }
        e.lean = clamp((e.x - e.px) / 2.5, -1, 1);
      } else if (e.age < 1) e.y = -24 + e.age * (e.kind === 'turret' ? 142 : 178);
      else if (e.age < e.life - 1.2) { e.y = (e.kind === 'turret' ? 118 : 154) + Math.sin(e.age * 1.5 + e.wobble) * 18; e.x = e.baseX + Math.sin(e.age * 0.9 + e.wobble) * (e.kind === 'turret' ? 12 : 38); }
      else e.x += e.direction * 150 * FIXED_DT;
      if (e.age >= e.life || e.x < -40 || e.x > W + 40) { w.stats.missedEnemies++; remove(w, 'enemies', i); continue; }
      var cadence = w.campaign || e.kind === 'turret' ? 1.65 : 1.5;
      var shootStart = w.campaign ? (e.kind === 'turret' ? 1.2 : 2.1) : .8;
      var shoot = Math.floor((e.age - shootStart) / cadence);
      if (e.age >= shootStart && e.age < e.life - 1.7 && shoot >= e.shotCursor && w.waveTime < 10.2) {
        e.shotCursor = shoot + 1;
        var a = Math.atan2(w.player.y - e.y, w.player.x - e.x);
        if (e.kind === 'turret') warning(w, fanSpecs(e.x, e.y, a, 3, 0.2, 110, 'needle', '#f5b5d3', e.id), 54, '겨냥 레이저');
        else emit(w, fanSpecs(e.x, e.y, a, w.wave === 0 ? 3 : 5, 0.22, 82 + w.wave * 8, 'orb', '#f1cae9', e.id));
      }
    }
  }
  function startBossPhase(w, phase, notify) {
    while (w.shots.length) remove(w, 'shots', w.shots.length - 1);
    w.stage = 'boss'; w.stageTime = 0; w.waveTime = 0; w.phase = phase; w.phaseTime = 0; w.phaseProgress = 0;
    w.patternName = NAMES[phase]; w.stageLabel = '보라검천사 · ' + (phase + 1) + '/3' + (w.practiceBoss ? ' · 연습' : '');
    w.boss = makeBoss(w, phase, ++w.idCounter);
    campaignLabels(w);
    w.nextPhase = null; w.transitionRemaining = 0; w._warnings.length = 0; w._delays.length = 0;
    w._targetId = 0; w._shotReadyAt = w.tick;
    w.reservation = false; w._reservationSince = 0; w._starvationReported = false;
    cacheCheckpoint(w);
    if (notify !== false) event(w, 'phase', w.patternName);
  }
  function skipBossIntro(w) {
    // A presentation skip cannot delete or teleport live danger, execute a
    // pending attack, or replay rewards. Boss practice already starts at phase0.
    if (!w || w.stage !== 'bossIntro' || w.bullets.length || w.hazards.length || w.enemies.length || w.shots.length || w._warnings.length || w._deferred.length || w._delays.length) return false;
    startBossPhase(w, 0);
    return true;
  }
  function freezeIntroTimers(w) {
    // The presentation clock advances, while remaining combat durations stay
    // fixed. Expired timers remain expired; no resources are earned or spent.
    Object.keys(w.skills).forEach(function (key) { if (w.skills[key] >= w.tick) w.skills[key]++; });
    ['invulnerableUntil', 'egoUntil'].forEach(function (key) { if (w.player[key] >= w.tick) w.player[key]++; });
    if (w._shotReadyAt >= w.tick) w._shotReadyAt++;
    if (w._lastGraze >= 0) w._lastGraze++;
  }
  function ring(w, count, speed, angle, gapAngle, gapHalf, kind, color) {
    var b = w.boss, specs = [];
    for (var i = 0; i < count; i++) {
      var a = angle + i * TAU / count, diff = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
      if (Math.abs(diff) < gapHalf) continue;
      specs.push({ x: b.x, y: b.y, angle: a, speed: speed, kind: kind || 'orb', color: color, ownerId: b.id });
    }
    emit(w, specs);
  }
  function campaignArc(w, x, y, count, angle, spread, speed, kind, color, gap, gapHalf, acceleration) {
    var specs = fanSpecs(x, y, angle, count, spread, speed, kind, color, w.boss.id);
    specs = specs.filter(function (s) { return gap === null || Math.abs(Math.atan2(Math.sin(s.angle - gap), Math.cos(s.angle - gap))) >= gapHalf; });
    if (acceleration) specs.forEach(function (s) { s.acceleration = acceleration; s.maxSpeed = 142; s.accelerateAt = .75; });
    emit(w, specs);
  }
  function signatureMark(w, specs, slot) {
    var id = CAMPAIGN_SIGNATURES[w.bossIndex].id;
    specs.forEach(function(s) { s.patternId = id; s.paletteSlot = slot || 0; });
    return specs;
  }
  function signatureArc(w, x, y, count, angle, spread, speed, kind, color, gapX, gapHalf, slot, accelerate) {
    var gap = Math.atan2(540 - y, gapX - x);
    var specs = fanSpecs(x, y, angle, count, spread, speed, kind, color, w.boss.id).filter(function(s) {
      return Math.abs(Math.atan2(Math.sin(s.angle-gap),Math.cos(s.angle-gap))) >= gapHalf;
    });
    if (accelerate) specs.forEach(function(s) { s.acceleration=accelerate; s.accelerateAt=1.15; s.maxSpeed=112; });
    emit(w,signatureMark(w,specs,slot));
  }
  function signatureRing(w, count, speed, angle, gapX, gapHalf, color, slot, accelerate) {
    var b=w.boss, gap=Math.atan2(540-b.y,gapX-b.x),specs=[];
    for(var i=0;i<count;i++) {
      var a=angle+i*TAU/count;
      if(Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)))<gapHalf)continue;
      var spec={x:b.x,y:b.y+12,angle:a,speed:speed,kind:'orb',color:color,ownerId:b.id};
      if(accelerate){spec.acceleration=accelerate;spec.accelerateAt=1.15;spec.maxSpeed=112;}
      specs.push(spec);
    }
    emit(w,signatureMark(w,specs,slot));
  }
  function campaignSignature(w, within, cycle) {
    var b=w.boss, down=Math.PI/2, pulse=within-108, attacking=within>=108&&within<264;
    var gapX=180+Math.sin(cycle*.8)*100;
    if(w.bossIndex===0) {
      // Paired wing origins weave independently. Their aperture is committed
      // to a scene-space lane, not continuously steered toward the player.
      if(within===54) {
        var a=Math.atan2(540-b.y,gapX-b.x);
        warning(w,signatureMark(w,[
          {x:b.x,y:b.y+8,angle:a-.42,width:6,color:'#b08adf',ownerId:b.id},
          {x:b.x,y:b.y+8,angle:a+.42,width:6,color:'#d8eaff',ownerId:b.id}
        ],0),66,w.patternName);
      }
      if(attacking&&pulse%36===0) {
        var turn=Math.sin(pulse*.024+cycle*.7)*.28;
        signatureArc(w,b.x-32,b.y+8,11,down+turn,.13,96,'needle','#b08adf',gapX,.20,0,0);
        signatureArc(w,b.x+32,b.y+8,11,down-turn,.13,86,'needle','#d8eaff',gapX,.20,1,0);
      }
    } else if(w.bossIndex===1) {
      // A slow afterimage accelerates only after 1.15s; a separated faster
      // echo makes the speed change legible without a dense bullet wall.
      if(attacking&&pulse%90===0) {
        signatureRing(w,24,42,Math.atan2(540-b.y,180-b.x)+pulse*.0005,gapX,.17,'#80c9a5',0,34);
        signatureRing(w,18,82,Math.atan2(540-b.y,180-b.x)+.09+pulse*.0005,gapX,.17,'#d9b86c',1,0);
      }
    } else if(w.bossIndex===2) {
      // Seven authored pillar positions, five rays: two adjacent lanes stay
      // open. The full 1.3s warning precedes every committed damaging ray.
      if(within===54) {
        var open=cycle%2?4:1, specs=[];
        for(var i=0;i<7;i++)if(i!==open&&i!==open+1)specs.push({x:36+i*48,y:100,angle:down,width:8,color:'#f79858',ownerId:b.id});
        warning(w,signatureMark(w,specs,0),78,w.patternName);
      }
      // Follow-up embers start after every pillar is harmless, including the
      // longer gentle warning. They do not fill the beam's recovery interval.
      if(within===186||within===240)signatureArc(w,b.x,b.y+12,15,down,.13,88,'orb','#ffe3a0',cycle%2?252:108,.22,1,0);
    } else if(w.bossIndex===3) {
      if(attacking&&pulse%52===0) {
        var beat=Math.floor(pulse/52),lead=beat%2?1:-1;
        // The lead changes sides on each beat. Paired gaps keep a mobile-sized
        // route while the different flight speeds reveal the alternating wings.
        signatureArc(w,b.x+lead*44,b.y+4,11,down+lead*.22,.13,94,'needle','#f0db9f',gapX,.21,0,0);
        signatureArc(w,b.x-lead*44,b.y+4,9,down-lead*.22,.15,72,'needle','#e4b2cc',gapX,.21,1,0);
      }
    } else {
      if(within===54) {
        // Side rays are fixed at creation and frame the constellation opening.
        warning(w,signatureMark(w,[
          {x:40,y:104,angle:Math.atan2(436,54),width:6,color:'#b2a1ed',ownerId:b.id},
          {x:320,y:104,angle:Math.atan2(436,-54),width:6,color:'#edca83',ownerId:b.id}
        ],0),78,w.patternName);
      }
      if(attacking&&pulse%54===0) {
        for(var point=0;point<5;point++) {
          var orbit=-Math.PI/2+point*TAU/5+cycle*.22;
          var ox=b.x+Math.cos(orbit)*38,oy=b.y+Math.sin(orbit)*22;
          signatureArc(w,ox,oy,7,down+Math.sin(orbit+pulse*.012)*.26,.16,76+point*3,'orb',point%2?'#edca83':'#b2a1ed',gapX,.22,point%2,0);
        }
      }
    }
  }
  function campaignPattern(w) {
    var b = w.boss, t = Math.round(w.phaseTime * 60) - 1, cycle = Math.floor(t / 360), within = t % 360;
    var anchors = [180, 112, 236, 156, 218], offset = w.phase + w.bossIndex;
    var destination = anchors[(cycle + offset) % anchors.length], origin = cycle ? anchors[(cycle - 1 + offset) % anchors.length] : 180;
    b.px = b.x; b.py = b.y;
    var move = clamp(within / 54, 0, 1), easing = move * move * (3 - 2 * move);
    b.x = origin + (destination - origin) * easing;
    b.y = 116 + Math.sin(move * Math.PI) * 16;
    b.lean = clamp((b.x - b.px) / 2.5, -1, 1);
    b.action = within < 54 ? 'move' : within < 108 ? 'charge' : within < 264 ? 'attack' : 'recover';
    b.actionProgress = within < 54 ? within / 54 : within < 108 ? (within - 54) / 54 : within < 264 ? (within - 108) / 156 : (within - 264) / 96;
    var aimAt = Math.atan2(w.player.y - b.y, w.player.x - b.x), down = Math.PI / 2;
    var gap = down + Math.sin(cycle * 1.7 + w.phase) * .22;
    var attacking = within >= 108 && within < 264, pulse = within - 108;
    if (within === 54) effect(w, b.x, b.y, 'bossCharge', 25, w.bossIndex === 2 ? '#ffbb7e' : w.bossIndex === 1 ? '#8de0b7' : '#d1b2ff', .9);
    b.specialPatternId=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].id:'';
    b.specialPatternLabel=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].label:'';
    b.patternHint=w.phase===2?CAMPAIGN_SIGNATURES[w.bossIndex].hint:'';
    if(w.phase===2){campaignSignature(w,within,cycle);return;}
    if (w.bossIndex === 0) {
      if (w.phase === 0) {
        // Two rotating petals leave an authored aperture; there is no row of
        // parallel screen-wide bullets in this campaign revision.
        if (attacking && pulse % 36 === 0) {
          var turn = Math.sin((cycle * 156 + pulse) * .018) * .24;
          campaignArc(w, b.x - 18, b.y + 8, 13, down + turn, .115, 104, 'orb', '#d0b6ff', gap, .18, 0);
          campaignArc(w, b.x + 18, b.y + 8, 13, down - turn, .115, 88, 'orb', '#a9d9ff', gap, .18, 0);
        }
      } else if (w.phase === 1) {
        if (within === 54 || within === 150) warning(w, fanSpecs(b.x, b.y + 12, aimAt, 3, .25, 0, 'blade', '#ddb3ff', b.id), 54, w.patternName);
        if (attacking && pulse % 72 === 0) ring(w, 28, 94, cycle * .22 + pulse * .003, gap, .34, 'orb', '#bfaaff');
      }
    } else if (w.bossIndex === 1) {
      if (w.phase === 0) {
        if (attacking && pulse % 60 === 0) campaignArc(w, b.x, b.y + 16, 21, down + Math.sin(t * .009) * .2, .14, 60, 'orb', '#9de0b4', gap, .25, 18);
      } else if (w.phase === 1) {
        if (within === 54) {
          warning(w, [{ x: 46, y: 105, angle: Math.atan2(455, 180), ownerId: b.id, color: '#8fd6c0' },
            { x: 314, y: 105, angle: Math.atan2(455, -180), ownerId: b.id, color: '#cfbbe8' }], 66, w.patternName);
        }
        if (attacking && pulse % 48 === 0) {
          campaignArc(w, b.x - 45, b.y, 5, 1.08 + Math.sin(cycle + pulse * .01) * .16, .19, 91, 'orb', '#a6e3cb', null, 0, 0);
          campaignArc(w, b.x + 45, b.y, 5, 2.06 - Math.sin(cycle + pulse * .01) * .16, .19, 91, 'orb', '#d2b9e7', null, 0, 0);
        }
      }
    } else if (w.bossIndex === 2) {
      if (w.phase === 0) {
        if (within === 54 || within === 150) warning(w, fanSpecs(b.x + (within === 54 ? -32 : 32), b.y, aimAt, 3, .28, 0, 'blade', '#ffb393', b.id), 60, w.patternName);
        if (attacking && pulse % 54 === 0) campaignArc(w, b.x, b.y, 13, down + Math.sin(cycle + pulse * .007) * .22, .14, 102, 'blade', '#e6b4cb', gap, .32, 0);
      } else if (w.phase === 1) {
        if (attacking && pulse % 48 === 0) {
          campaignArc(w, b.x - 32, b.y, 13, down + .19 * Math.sin(t * .012), .16, 62, 'orb', '#ffb181', gap, .28, 23);
          campaignArc(w, b.x + 32, b.y, 9, down - .24 * Math.sin(t * .012), .19, 91, 'orb', '#f3d18e', gap, .28, 0);
        }
      }
    } else if (w.bossIndex === 3) {
      // Mirrored feather fans, followed by locked rays: aim is sampled only
      // at warning creation, and the recovery interval stays quiet.
      if (w.phase === 0 && attacking && pulse % 42 === 0) {
        campaignArc(w,b.x-36,b.y,9,down+.23*Math.sin(pulse*.018),.14,84,'needle','#f6e6b4',gap,.25,0);
        campaignArc(w,b.x+36,b.y,9,down-.23*Math.sin(pulse*.018),.14,84,'needle','#a9e1ee',gap,.25,0);
      }
      if (w.phase === 1) {
        if (within===54) warning(w,fanSpecs(b.x,b.y,aimAt,3,.32,0,'needle','#f5d4a0',b.id),72,w.patternName);
        if(attacking&&pulse%66===0) ring(w,32,82,cycle*.25,gap,.36,'orb','#f6e2aa');
      }
    } else {
      // The three signatures differ in geometry and rhythm, not only tint.
      if (w.phase===0 && attacking && pulse%30===0) {
        ring(w,30,72,cycle*.29+pulse*.008,gap,.35,'orb','#bfeaff');
      } else if (w.phase===1) {
        if(within===54) warning(w,[{x:52,y:112,angle:Math.atan2(430,210),ownerId:b.id,color:'#d5b8ff'},
          {x:308,y:112,angle:Math.atan2(430,-210),ownerId:b.id,color:'#ffd5b2'}],78,w.patternName);
        if(attacking&&pulse%48===0){
          campaignArc(w,b.x-42,b.y,8,1.18+Math.sin(pulse*.012)*.18,.16,90,'needle','#d2c0ff',gap,.28,0);
          campaignArc(w,b.x+42,b.y,8,Math.PI-1.18-Math.sin(pulse*.012)*.18,.16,90,'needle','#ffcfb2',gap,.28,0);
        }
      }
    }
  }
  function bossPattern(w) {
    if (w.campaign) { campaignPattern(w); return; }
    var b = w.boss, t = Math.round(w.phaseTime * 60) - 1, cycle, within, gap, specs, i, a;
    b.px = b.x; b.py = b.y;
    b.x = 180 + Math.sin(w.phaseTime * 0.6) * (w.phase === 1 ? 58 : 38);
    b.y = 116 + Math.sin(w.phaseTime * 0.9) * 12;
    if (w.phase === 0) {
      cycle = Math.floor(t / 360); within = t % 360; gap = [180, 108, 252, 180][cycle % 4];
      if (within < 240 && within % 24 === 0) {
        specs = [];
        for (i = 0; i < 21; i++) { var x = 20 + i * 16; if (Math.abs(x - gap) > 35) specs.push({ x: x, y: 66 + (i % 2) * 8, angle: Math.PI / 2, speed: 112, kind: 'needle', color: i % 2 ? '#c4acff' : '#f0d9ff', ownerId: b.id }); }
        emit(w, specs);
        if (within === 0) effect(w, gap, 82, 'ring', 29, '#99e6ff', 0.65);
      }
      if (within === 90 || within === 180) warning(w, fanSpecs(b.x, b.y + 12, Math.atan2(w.player.y - b.y, w.player.x - b.x), 3, 0.22, 123, 'orb', '#f0b7e7', b.id), 54, '기억의 광선');
    } else if (w.phase === 1) {
      cycle = Math.floor(t / 330); within = t % 330;
      if (within === 0 || within === 96 || within === 192) {
        var side = within === 96 ? -1 : 1, ox = b.x + side * 40, oy = b.y + 12;
        a = Math.atan2(w.player.y - oy, w.player.x - ox);
        warning(w, fanSpecs(ox, oy, a, 5, 0.2, 146, 'blade', '#eab3ff', b.id), 54, '보라검의 각인');
      }
      if (t % 64 === 0) ring(w, 36, 92 + (cycle % 2) * 8, t * 0.0019, Math.PI / 2 + Math.sin(cycle) * 0.42, 0.28, 'orb', '#bca7fa');
    } else {
      cycle = Math.floor(t / 300); within = t % 300;
      if (within < 225 && within % 14 === 0 && Math.floor(within / 14) % 6 < 4) {
        specs = [];
        for (i = 0; i < 5; i++) {
          var lean = Math.sin(t * 0.012) * 0.16;
          specs.push({ x: 16, y: 92, angle: 0.78 + i * 0.08 + lean, speed: 112, kind: 'orb', color: '#d9b7f7', ownerId: b.id });
          specs.push({ x: 344, y: 92, angle: Math.PI - 0.78 - i * 0.08 + lean, speed: 112, kind: 'orb', color: '#9dceff', ownerId: b.id });
        }
        emit(w, specs);
      }
      if (within === 30 || within === 150) ring(w, 42, 108, cycle * 0.17, Math.atan2(560 - b.y, (cycle % 2 ? 108 : 252) - b.x), 0.32, 'needle', '#e7d5ff');
      if (within === 240) warning(w, fanSpecs(b.x, b.y, Math.atan2(w.player.y - b.y, w.player.x - b.x), 5, 0.22, 142, 'blade', '#f6b4db', b.id), 60, '날개의 매듭');
    }
  }
  function hurt(w) {
    var p = w.player;
    if (w.tick < p.invulnerableUntil || w.stage === 'won' || w.stage === 'lost' || w.stage === 'bossIntro') return false;
    p.hp--; p.invulnerableUntil = w.tick + 66; w.stats.hits++;
    event(w, 'hurt'); effect(w, p.x, p.y, 'hit', 16, '#ffd0da', 0.35);
    if (p.hp <= 0) { w.stage = 'lost'; w.resultReason = '기억이 흐려졌습니다'; event(w, 'lose', w.resultReason); }
    return true;
  }
  function hitTarget(w, e, damage, memory) {
    if (e.hp <= 0) return;
    var actual = Math.min(damage, e.hp);
    e.hp -= actual; w.stats.damage += actual; if (e.isBoss) w.stats.bossDamage += actual;
    // A short, throttled reaction uses existing hit artwork. Presentation
    // fields never alter the attack clock, geometry or damage calculation.
    if (w.campaign && e.isBoss && w.tick >= (e.hitFlashReadyAt || 0)) {
      e.hitUntil = w.tick + 4; e.hitFlashReadyAt = w.tick + 18;
    }
    if (memory) gainMemory(w, 2);
    if (e.hp > 0) return;
    effect(w, e.x, e.y, 'kill', e.isBoss ? 45 : 23, '#d9c4ff', 0.6);
    if (e.isBoss) {
      w.stats.phaseTicks.push(Math.round(w.phaseTime * 60));
      if (w.phase === 2 && w.campaign && !w.practiceBoss && w.bossIndex < CAMPAIGN_BOSSES.length-1) {
        w.stage = 'transition'; w.stageTime = 0; w.nextPhase = null; w.nextEncounter = w.bossIndex + 1;
        w.transitionRemaining = 6.4; w.stageLabel = '남은 탄막을 지나 다음 기억으로';
        w.score += 2500;
      }
      else if (w.phase === 2) { w.stage = 'won'; w.stageTime = 0; w.resultReason = w.campaign ? (w.practiceBoss ? w.bossName + ' · 연습 완료' : 'J의 인장이 빛납니다 · 루시퍼가 물러나고 도움을 청할 길이 열립니다') : '기억 회랑을 돌파했습니다'; w.score += 5000 + w.player.hp * 500; event(w, 'win'); }
      else { w.stage = 'transition'; w.stageTime = 0; w.nextPhase = w.phase + 1; w.transitionRemaining = 6.4; w.stageLabel = '남은 검편이 지나갑니다'; }
      w.reservation = false; w._reservationSince = 0;
      w._warnings.length = 0; w._deferred.length = 0;
      // Already announced lasers complete on their committed paths during the
      // drain. A phase change never erases an active beam or creates a shortcut.
      w._delays.length = 0;
    } else {
      w.kills++; w.score += e.kind === 'turret' ? 240 : 120; gainResonance(w, 5, false); event(w, 'kill');
    }
  }
  function updateWarnings(w) {
    for (var i = w.hazards.length - 1; i >= 0; i--) {
      var h = w.hazards[i];
      if (w.tick >= h.expireAt) { remove(w, 'hazards', i); continue; }
      if (w.tick === h.activeAt && w.campaign && w.stage === 'boss' && w.boss && h.ownerId === w.boss.id) w.boss.releaseTick = w.tick;
      if (w.tick < h.activeAt) { h.phase = 'warning'; h.progress = clamp((w.tick - h.born) / h.warningTicks, 0, 1); }
      else if (w.tick < h.fadeAt) { h.phase = 'active'; h.progress = clamp((w.tick - h.activeAt) / h.activeTicks, 0, 1); }
      else { h.phase = 'fade'; h.progress = clamp((w.tick - h.fadeAt) / h.fadeTicks, 0, 1); }
    }
  }
  function updateLaserCollision(w, px, py) {
    if (w.stage === 'won' || w.stage === 'lost' || w.stage === 'bossIntro') return;
    var p = w.player;
    for (var i = 0; i < w.hazards.length; i++) {
      var h = w.hazards[i];
      if (h.phase !== 'active') continue;
      var d2 = hazardDistanceSquared(h, px, py, p.x, p.y), halfWidth = h.width / 2;
      if (d2 <= sq(p.r + halfWidth)) { w.stats.collisions++; hurt(w); }
      else if (!h.grazed && w.tick >= p.invulnerableUntil && d2 <= sq(13 + halfWidth)) {
        // A fan is one announced cast: neighboring rays cannot farm resonance.
        for (var j = 0; j < w.hazards.length; j++) if (w.hazards[j].castId === h.castId) w.hazards[j].grazed = true;
        w.graze++; w.score += 15; w._lastGraze = w.tick; gainResonance(w, 3, true);
        effect(w, p.x, p.y, 'graze', 8, '#a5ffee', 0.22);
      }
    }
  }
  function updateShots(w) {
    for (var d = w._delays.length - 1; d >= 0; d--) {
      var delay = w._delays[d];
      if (!delay) continue;
      if (w.tick < delay.at) continue;
      var targets = w.enemies.slice(); if (w.stage === 'boss' && w.boss) targets.push(w.boss);
      var main = targets.find(function (e) { return e.id === delay.targetId && e.hp > 0; });
      var x = main ? main.x : delay.x, y = main ? main.y : delay.y;
      if (main) hitTarget(w, main, 60, false);
      targets.forEach(function (e) { if (e !== main && sq(e.x - x) + sq(e.y - y) <= sq(36 + e.r)) hitTarget(w, e, 20, false); });
      effect(w, x, y, w.campaign ? 'delayBurst' : 'ring', 36, '#a8edff', 0.4); w._delays.splice(d, 1);
    }
    for (var i = w.shots.length - 1; i >= 0; i--) {
      var s = w.shots[i]; s.px = s.x; s.py = s.y; s.x += s.vx * FIXED_DT; s.y += s.vy * FIXED_DT; s.age += FIXED_DT;
      var victim = null, candidates = w.enemies;
      for (var j = 0; j < candidates.length; j++) { var e = candidates[j]; if (e.age >= 0 && e.hp > 0 && sweptCircleHit(s.px, s.py, s.x, s.y, e.px, e.py, e.x, e.y, s.r + e.r)) { victim = e; break; } }
      if (!victim && w.stage === 'boss' && w.boss && w.boss.hp > 0) { var b = w.boss; if (sweptCircleHit(s.px, s.py, s.x, s.y, b.px, b.py, b.x, b.y, s.r + b.r)) victim = b; }
      if (victim) { hitTarget(w, victim, s.damage, s.kind === 'basic'); remove(w, 'shots', i); }
      else if (s.age >= s.ttl || s.x < -32 || s.x > W + 32 || s.y < -32 || s.y > H + 32) remove(w, 'shots', i);
    }
    for (var k = w.enemies.length - 1; k >= 0; k--) if (w.enemies[k].hp <= 0) remove(w, 'enemies', k);
  }
  function updateBullets(w, px, py) {
    var p = w.player;
    for (var i = w.bullets.length - 1; i >= 0; i--) {
      var b = w.bullets[i]; b.px = b.x; b.py = b.y;
      if (b.acceleration && b.age >= b.accelerateAt) {
        var speed = Math.min(b.maxSpeed, Math.hypot(b.vx, b.vy) + b.acceleration * FIXED_DT);
        b.vx = Math.cos(b.angle) * speed; b.vy = Math.sin(b.angle) * speed;
      }
      b.x += b.vx * FIXED_DT; b.y += b.vy * FIXED_DT; b.age += FIXED_DT;
      if (w.stage !== 'won' && w.stage !== 'lost' && w.stage !== 'bossIntro') {
        // Conservative swept AABB: the projectile's half-length and the larger
        // of hit/graze radii enclose its entire capsule. Far-away bullets need
        // no segment-distance/trigonometry work; near bullets use the exact
        // original continuous collision and graze calculation unchanged.
        var halfLength = b.halfLength || 0;
        var reach = halfLength + Math.max(p.r, 13) + b.r;
        var x0 = b.px - px, x1 = b.x - p.x, y0 = b.py - py, y1 = b.y - p.y;
        // Include a floating-point safety margin so rounding at the graze
        // boundary always falls back to the original exact calculation.
        // Invalid geometry also takes the original path, never the shortcut.
        var valid = p.r >= 0 && b.r >= 0 && halfLength >= 0 && finite(reach);
        var margin = valid ? 1e-9 * (1 + reach + Math.max(Math.abs(x0), Math.abs(x1), Math.abs(y0), Math.abs(y1))) : 0;
        var far = valid && (Math.min(x0, x1) > reach + margin || Math.max(x0, x1) < -reach - margin || Math.min(y0, y1) > reach + margin || Math.max(y0, y1) < -reach - margin);
        if (!far) {
          var d2 = projectileDistanceSquared(b, px, py, p.x, p.y);
          if (d2 <= sq(p.r + b.r)) { w.stats.collisions++; hurt(w); remove(w, 'bullets', i); continue; }
          if (!b.grazed && w.tick >= p.invulnerableUntil && d2 <= sq(13 + b.r)) {
            b.grazed = true; w.graze++; w.score += 15; w._lastGraze = w.tick; gainResonance(w, 3, true); effect(w, p.x, p.y, 'graze', 8, '#a5ffee', 0.22);
          }
        }
      }
      if (b.age >= b.ttl || b.x < -38 || b.x > W + 38 || b.y < -38 || b.y > H + 38 || (w.stage === 'won' && w.stageTime > 0.35)) remove(w, 'bullets', i);
    }
  }
  function cacheCheckpoint(w) {
    if (w.bullets.length || w.hazards.length || w._warnings.length || w._deferred.length || (w.stage !== 'waves' && w.stage !== 'boss')) throw new Error('Checkpoint requires a safe phase boundary');
    while (w.effects.length) remove(w, 'effects', w.effects.length - 1);
    w.checkpointSerial++;
    var snap = {};
    ['rulesetVersion','runId','seed','difficulty','practiceBoss','checkpointSerial','tick','rngState','idCounter','stage','wave','phase','score','graze','kills','memory','resonance','autoAttack','skillRotation'].forEach(function (k) { snap[k] = w[k]; });
    if (w.campaign) { snap.campaign = true; snap.campaignRevision = 2; snap.bossIndex = w.bossIndex; }
    snap.stageTime = 0; snap.phaseTime = 0; snap.waveTime = 0;
    snap.player = copy(w.player); snap.skills = copy(w.skills); snap.stats = copy(w.stats); snap.shotReadyAt = w._shotReadyAt;
    snap.resourceState = { memoryBucket: w._memoryBucket, memoryGain: w._memoryGain, resBucket: w._resBucket, resGain: w._resGain, grazeGain: w._grazeGain, lastGraze: w._lastGraze };
    w._checkpoint = snap; w._boundaryTick = w.tick; event(w, 'checkpoint');
  }
  function checkpoint(w) { return w && w._checkpoint ? copy(w._checkpoint) : null; }
  function restoreCheckpoint(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || JSON.stringify(snapshot).length > 131072) throw new Error('Invalid checkpoint');
    var s = copy(snapshot);
    var hasCampaign = Object.prototype.hasOwnProperty.call(s, 'campaign') || Object.prototype.hasOwnProperty.call(s, 'campaignRevision') || Object.prototype.hasOwnProperty.call(s, 'bossIndex');
    if (hasCampaign && (s.campaign !== true || ![1,2].includes(s.campaignRevision) || !Number.isInteger(s.bossIndex) || s.bossIndex < 0 || s.bossIndex >= (s.campaignRevision === 1 ? 3 : CAMPAIGN_BOSSES.length))) throw new Error('Invalid campaign checkpoint');
    if (hasCampaign && s.stage === 'waves' && s.wave >= CAMPAIGN_BOSSES[s.bossIndex].waves.length) throw new Error('Invalid campaign wave');
    if (s.rulesetVersion !== RULESET || typeof s.runId !== 'string' || !/^[A-Za-z0-9_.:-]{1,96}$/.test(s.runId) || !['normal','gentle'].includes(s.difficulty) || !['waves','boss'].includes(s.stage)) throw new Error('Unsupported checkpoint');
    ['tick','rngState','seed','idCounter','checkpointSerial','wave','phase','score','graze','kills','memory','resonance'].forEach(function (k) { if (!finite(s[k]) || s[k] < 0 || s[k] > (k === 'rngState' || k === 'seed' ? 4294967295 : 100000000)) throw new Error('Invalid checkpoint number: ' + k); });
    if (!Number.isInteger(s.tick) || s.tick > 1000000 || !Number.isInteger(s.wave) || s.wave > 2 || !Number.isInteger(s.phase) || s.phase > 2 || s.memory > 100 || s.resonance > 100 || s.stageTime !== 0 || s.phaseTime !== 0 || s.waveTime !== 0) throw new Error('Invalid checkpoint boundary');
    if (!Number.isInteger(s.seed) || !Number.isInteger(s.rngState) || !Number.isInteger(s.idCounter) || !Number.isInteger(s.checkpointSerial) || s.checkpointSerial < 1 || s.checkpointSerial > 100 || typeof s.autoAttack !== 'boolean' || typeof s.skillRotation !== 'boolean' || typeof s.practiceBoss !== 'boolean') throw new Error('Invalid checkpoint identity');
    if (!Number.isInteger(s.shotReadyAt) || s.shotReadyAt < 0 || s.shotReadyAt > 10000000) throw new Error('Invalid shot timer');
    var p = s.player, maxHp = s.difficulty === 'gentle' ? 5 : 3;
    if (!p || !finite(p.x) || !finite(p.y) || p.x < 16 || p.x > 344 || p.y < 260 || p.y > 614 || !Number.isInteger(p.hp) || p.hp < 1 || p.hp > maxHp || p.maxHp !== maxHp || p.r !== 3 || !Number.isInteger(p.invulnerableUntil) || !Number.isInteger(p.egoUntil) || p.invulnerableUntil < 0 || p.egoUntil < 0 || p.invulnerableUntil > 10000000 || p.egoUntil > 10000000) throw new Error('Invalid checkpoint player');
    if (!s.skills || !s.stats || !s.stats.casts) throw new Error('Invalid checkpoint combat state');
    Object.keys(s.skills).forEach(function (k) { if (!Number.isInteger(s.skills[k]) || s.skills[k] < 0 || s.skills[k] > 10000000) throw new Error('Invalid skill timer'); });
    ['memoryReadyAt','delayReadyAt','counterReadyAt','egoReadyAt','globalReadyAt'].forEach(function (k) { if (!finite(s.skills[k])) throw new Error('Missing skill timer'); });
    ['hits','shots','damage','peakBullets','peakEnemies','peakParticles'].forEach(function (k) { if (!finite(s.stats[k]) || s.stats[k] < 0 || s.stats[k] > 100000000) throw new Error('Invalid checkpoint stats'); });
    ['memory','delay','counter','ego'].forEach(function (k) { if (!finite(s.stats.casts[k]) || s.stats.casts[k] < 0 || s.stats.casts[k] > 1000000) throw new Error('Invalid checkpoint casts'); });
    if (!Array.isArray(s.stats.phaseTicks) || s.stats.phaseTicks.length > (hasCampaign ? (s.campaignRevision === 1 ? 9 : 15) : 3) || s.stats.phaseTicks.some(function (n) { return !Number.isInteger(n) || n < 0 || n > 4500; })) throw new Error('Invalid phase history');
    var w = createRun({ difficulty: s.difficulty, seed: s.seed, practiceBoss: false, runId: s.runId, campaign: hasCampaign });
    if (hasCampaign) w.bossIndex = s.bossIndex;
    ['tick','rngState','idCounter','stage','wave','phase','score','graze','kills','memory','resonance','autoAttack','skillRotation','practiceBoss'].forEach(function (k) { w[k] = s[k]; });
    w.time = w.tick / 60; w.player = p; w.skills = s.skills; w.stats = s.stats; w.checkpointSerial = s.checkpointSerial;
    w._shotReadyAt = finite(s.shotReadyAt) ? s.shotReadyAt : w.tick; w.events.length = 0;
    if (s.stage === 'boss') { w.boss = makeBoss(w, s.phase, w.idCounter); w.patternName = NAMES[s.phase]; w.stageLabel = '보라검천사 · ' + (s.phase + 1) + '/3' + (s.practiceBoss ? ' · 연습' : ''); }
    else { w.patternName = ['세 갈래의 기억','교차하는 거미실','회랑의 끝'][s.wave]; w.stageLabel = '기억 회랑 · ' + (s.wave + 1) + '/3'; }
    campaignLabels(w);
    var r = s.resourceState;
    if (r) { ['memoryBucket','memoryGain','resBucket','resGain','grazeGain','lastGraze'].forEach(function (k) { if (!finite(r[k]) || Math.abs(r[k]) > 10000000) throw new Error('Invalid resource state'); }); w._memoryBucket = r.memoryBucket; w._memoryGain = r.memoryGain; w._resBucket = r.resBucket; w._resGain = r.resGain; w._grazeGain = r.grazeGain; w._lastGraze = r.lastGraze; }
    w._checkpoint = copy(s);
    return w;
  }
  function step(w, input, dt) {
    if (dt !== undefined && (!finite(dt) || Math.abs(dt - FIXED_DT) > 1e-9)) throw new RangeError('HapilCore.step requires fixed 1/60 second ticks');
    if (!w || !w.player) throw new TypeError('Expected a run');
    input = input || {};
    if (w.stage === 'lost') return w;
    var p = w.player, px = p.x, py = p.y;
    w.tick++; w.time = w.tick / 60;
    if (w.stage === 'bossIntro') {
      // Integer presentation ticks avoid floating point drift at exactly2.5s.
      var introTick = Math.round(w.stageTime / FIXED_DT) + 1;
      w.stageTime = introTick / 60;
      freezeIntroTimers(w);
      if (introTick >= 150) skipBossIntro(w);
      // Input is stateless: intro displacement is ignored, never queued for the
      // first combat tick. The UI also discards its own pending pointer deltas.
      return w;
    }
    w.stageTime += FIXED_DT;
    if (w.stage !== 'won') {
      var dx = finite(input.dx) ? input.dx : 0, dy = finite(input.dy) ? input.dy : 0;
      var length = Math.hypot(dx, dy), speed = (input.focus ? 120 : 240) * FIXED_DT;
      if (length > speed) { dx *= speed / length; dy *= speed / length; }
      p.x = clamp(p.x + dx, 16, 344); p.y = clamp(p.y + dy, 260, 614);
    }
    if (w.stage === 'waves') {
      w.waveTime += FIXED_DT; waveSchedule(w);
      if (w.stage === 'bossIntro') { p.x = px; p.y = py; freezeIntroTimers(w); return w; }
      updateEnemies(w);
    }
    else if (w.stage === 'boss') {
      w.phaseTime += FIXED_DT;
      if (w.phaseTime >= w.phaseTimeout) { w.stage = 'lost'; w.resultReason = '시간 안에 기억을 되찾지 못했습니다'; event(w, 'lose', w.resultReason); }
      else bossPattern(w);
    }
    // A cached boundary is an entire tick. Its original and restored successor
    // both start with no friendly shots, enemies from a previous wave or hazards.
    if (w._boundaryTick === w.tick) return w;
    if (w._deferred.length && w.stage !== 'won' && w.stage !== 'lost') {
      var group = w._deferred[0];
      if (w.bullets.length + group.length <= CAPS.bullets) { w._deferred.shift(); emit(w, group); }
    }
    updateWarnings(w); attack(w); updateShots(w); updateBullets(w, px, py); updateLaserCollision(w, px, py);
    if (w.stage === 'transition') {
      w.transitionRemaining = Math.max(0, 6.4 - w.stageTime);
      if (!w.bullets.length && !w.hazards.length && !w._warnings.length && !w._deferred.length && (!(w.campaign && w.bossIndex >= 2 && w.nextEncounter != null) || w.stageTime >= 3)) {
        if (w.campaign && w.nextEncounter != null) {
          w.bossIndex = w.nextEncounter; w.nextEncounter = null; w.boss = null; w.stage = 'waves'; w.phase = 0; w.phaseTime = 0;
          // Recover one life at a cleared encounter, never above the selected
          // difficulty's maximum. No health or damage is changed by the tests.
          w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1);
          startWave(w, 0);
        } else startBossPhase(w, w.nextPhase);
      }
    }
    if (w.stage === 'boss' && w.boss) w.phaseProgress = clamp(1 - w.boss.hp / w.boss.maxHp, 0, 1);
    for (var i = w.effects.length - 1; i >= 0; i--) { w.effects[i].age += FIXED_DT; if (w.effects[i].age >= w.effects[i].ttl) remove(w, 'effects', i); }
    w.stats.peakBullets = Math.max(w.stats.peakBullets, w.bullets.length); w.stats.peakEnemies = Math.max(w.stats.peakEnemies, w.enemies.length); w.stats.peakParticles = Math.max(w.stats.peakParticles, w.effects.length);
    return w;
  }
  return Object.freeze({ W: W, H: H, FIXED_DT: FIXED_DT, RULESET_VERSION: RULESET, MECHANICS_REVISION: 2, CAPS: CAPS,
    CAMPAIGN_BOSSES: CAMPAIGN_BOSSES, CAMPAIGN_SIGNATURES: CAMPAIGN_SIGNATURES, CAMPAIGN_REVISION: 2,
    createRun: createRun, step: step, checkpoint: checkpoint, restoreCheckpoint: restoreCheckpoint, skipBossIntro: skipBossIntro,
    geometry: Object.freeze({ segmentDistanceSquared: segmentDistanceSquared, segmentPairDistanceSquared: segmentPairDistanceSquared, sweptCircleHit: sweptCircleHit, projectileDistanceSquared: projectileDistanceSquared, hazardDistanceSquared: hazardDistanceSquared }) });
}));
