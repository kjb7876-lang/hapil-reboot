/* Canonical encounter design contracts, not implemented or art-approved gameplay. */
(function (root, factory) {
  'use strict';
  var common = typeof module === 'object' && module.exports, scope = root && root.HapilStoryScope;
  var data = common ? require('./story-data.js') : root.HapilStoryData;
  if (common) {
    try { scope = require('./story-scope.js'); }
    catch (error) { if (error.code !== 'MODULE_NOT_FOUND' || error.message.indexOf("'./story-scope.js'") < 0) throw error; }
  }
  var api = factory(data, scope);
  if (common) module.exports = api;
  if (root) root.HapilStoryEncounters = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (base, scope) {
  'use strict';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.keys(value).forEach(function (k) { freeze(value[k]); }); Object.freeze(value); } return value; }
  if (!base || !Array.isArray(base.encounters) || !Array.isArray(base.scenes)) throw new Error('Canonical story data required');
  var data = scope && typeof scope.apply === 'function' ? scope.apply(base) : base;
  var ids = data.primaryCombatIds.slice();
  if (ids.indexOf('blue-executor') < 0) ids.push('blue-executor');
  if (ids.length !== 70 || new Set(ids).size !== 70 || ids.indexOf('mb-ep1a09') >= 0 || ids.indexOf('a11-cosmic-v31318') >= 0) throw new Error('Expected effective 70 encounter IDs');
  var requiredIds = ids.slice(); ids = [];
  data.scenes.forEach(function (s) {
    (s.combatOrderGroups || []).forEach(function (group) { group.forEach(function (id) { if (requiredIds.indexOf(id) >= 0 && ids.indexOf(id) < 0) ids.push(id); }); });
    if (s.id === 'murder03' && ids.indexOf('blue-executor') < 0) ids.push('blue-executor');
  });
  if (ids.length !== 70 || requiredIds.some(function (id) { return ids.indexOf(id) < 0; })) throw new Error('Incomplete canonical encounter order');
  var sources = Object.create(null), scenes = Object.create(null), specs = Object.create(null);
  data.encounters.forEach(function (e) { sources[e.id] = e; });
  base.encounters.forEach(function (e) { if (!sources[e.id]) sources[e.id] = e; });
  data.scenes.forEach(function (s) { if (s.sourceRange[1] > 919) throw new Error('Post-ending encounter content forbidden'); scenes[s.id] = s; });
  var BUDGET = { width: 360, height: 640, ticksPerSecond: 60, maxActiveProjectiles: 128, maxEmissionCount: 18, maxSpeed: 228, collisionGeometryOnly: true };
  var shape = { fan: 'circle', ring: 'annulus', lanes: 'rectangle', aimed: 'circle', spiral: 'circle', sweep: 'capsule' };
  // All timings, counts, speeds and geometry below are gameplay adaptations.
  // sourceExplicit records only words/actions in the supplied prose, never old runtime pattern titles.
  function beat(label, explicit, lines, pattern, target, options) {
    options = options || {};
    return { label: label, sourceExplicit: explicit || [], sourceEvidence: lines ? [{ lines: lines, attribution: options.attribution || 'individual', assertion: explicit && explicit.length ? 'prose-action' : 'scene-context-only-no-individual-attack-claim' }] : [],
      stageBasis: options.stageBasis || 'gameplay-adaptation', target: target || 'body',
      adaptation: { pattern: pattern, windupTicks: options.windup || 60, activeTicks: options.active || 120, recoveryTicks: options.recovery || 45, intervalTicks: options.interval || 40, count: options.count || 5, speed: options.speed || 156, spread: options.spread === undefined ? 1.1 : options.spread },
      damageSource: { shape: shape[pattern], phase: 'active-only', harmful: options.harmful !== false, collisionRadius: options.radius || 5, lineHalfWidth: options.halfWidth || 7, source: 'gameplay-adaptation', affects: options.affects || 'player', assetApproved: false }
    };
  }
  function set(id, stages, extra) { specs[id] = Object.assign({ stages: stages }, extra || {}); }
  function context(label, explicit, lines, pattern, target, options) { return beat(label, explicit, lines, pattern, target, Object.assign({ attribution: 'scene-context' }, options || {})); }
  set('dist00-boss', [beat('다가오는 뿌리', ['다가오는 뿌리'], [113, 115], 'sweep', 'command-link', { count: 3, halfWidth: 9 })], { targetSemantics: 'Cut the root binding the angel, not the captive angel; the distant tree center remains.' });
  set('mb-dist01', [beat('무기가 부딪치는 동안', ['무기가 부딪치는 동안'], [124, 128], 'sweep', 'body', { count: 4, active: 90, speed: 174 })]);
  set('mb-dist02', [context('발목을 붙잡는 손', ['물속에서 올라온 손들이 발목을 붙잡았다'], [134, 139], 'lanes', 'body', { count: 4 }), context('달려드는 얼굴들', ['달려드는 얼굴들'], [139, 139], 'aimed', 'body', { count: 3, speed: 168 })]);
  set('mb-dist03', [beat('핏빛 추격자들', ['길을 막은 핏빛 추격자들'], [148, 148], 'aimed', 'body', { count: 3, speed: 180 })]);
  set('mb-dist04', [context('악마화된 동료들', [], [155, 156], 'lanes', 'body', { count: 5, speed: 162 })]);
  set('mb-dist05', [context('일곱 기둥의 악마들', ['기둥을 지키는 악마들'], [160, 162], 'ring', 'body', { count: 7, speed: 132 })]);
  set('dist06-boss', [beat('공간을 가르는 검', ['발록의 검이 공간을 갈랐고'], [168, 168], 'sweep', 'body', { count: 3, windup: 72, halfWidth: 10 }), beat('하늘을 뒤덮는 불덩이', ['불덩이가 하늘을 뒤덮었다'], [168, 170], 'fan', 'body', { count: 9, speed: 144 })], { resolution: 'cleared', targetSemantics: 'Weapon reaches Balrog chest; the summoning circle is broken afterward. Balrog is not a scripted player defeat; the void encounter presents the later fall. This is not the final union core.', canonicalTransition: { event: 'summoning-circle-broken', sourceRange: [170, 171] } });
  set('mb-dist06', [context('소환진 검은기둥', [], [168, 173], 'lanes', 'body', { count: 4, speed: 144 })]);
  set('mb-ep1a07', [context('소용돌이와 기억 붕괴', [], [171, 173], 'spiral', 'survival', { count: 5, speed: 126 }), beat('끝내 이어지는 추락', ['나도 그 안으로 끌려 들어갔다'], [173, 175], 'lanes', 'survival', { count: 3, harmful: false, active: 90, stageBasis: 'canonical-sequence' })], { resolution: 'survive-and-fall', targetSemantics: 'Runtime memory-devourer adaptation presents the source vortex, memory collapse and fall after Balrog. The prose does not name an independent memory-devourer creature.' });
  set('mb-ep1a08', [context('백의 안정화 감독', [], [179, 185], 'lanes', 'command-link', { count: 3, speed: 138 })], { targetSemantics: 'Fictional threatening perception only. Real healthcare workers remain protected; treatment is not villainy.' });
  set('mb-ep1a10', [context('오만의 폐허핵', [], [212, 218], 'ring', 'command-link', { count: 8, speed: 132 })], { targetSemantics: 'The harmful belief structure, not the patient or treatment team.' });
  set('mb-ep1a11', [context('갈라지는 가면', ['가면이 갈라지자 수천 개의 내 얼굴이 나타났다'], [224, 226], 'fan', 'body', { count: 7, speed: 144 })]);
  set('a11-boss', [beat('흰 날개가 검게 물들고', [], [222, 222], 'ring', 'body', { count: 8, speed: 150 }), beat('수천 개의 내 얼굴', ['수천 개의 내 얼굴이 나타났다'], [224, 226], 'spiral', 'body', { count: 9, speed: 138 }), beat('루시퍼의 가슴에 닿는 인장', [], [228, 236], 'aimed', 'command-link', { count: 3, harmful: false, active: 60 })], { targetSemantics: 'Lucifer temporarily withdraws. Do not claim craving, pride or shame are permanently erased.' });
  set('mb-ep1b01', [context('일흔두 번째 봉인', [], [264, 271], 'ring', 'command-link', { count: 12, speed: 126 })], { targetSemantics: 'Establish boundaries around the represented mind; do not excise the person or their feelings.' });
  set('b02-boss', [beat('더러운 휴지뭉치', ['더러운 휴지뭉치'], [280, 280], 'fan', 'body', { count: 7, speed: 144 }), beat('냉장고와 소파, 썩은 침대', ['냉장고와 소파, 썩은 침대가 날아왔다'], [280, 280], 'lanes', 'body', { count: 3, windup: 78, radius: 10 })], { targetSemantics: 'Nightmare sin form may be confronted; the human patient and recovery remain protected.' });
  set('b03-boss', [beat('칼날과 유리 조각', ['칼날과 유리 조각을 쏟아 냈다'], [294, 294], 'fan', 'command-link', { count: 9, speed: 174 }), beat('질투의 뱀', [], [294, 300], 'sweep', 'command-link', { count: 2, halfWidth: 10 })], { targetSemantics: 'Seal the envy serpent; the woman and her separate responsibility are not erased.' });
  set('b04-boss', [beat('식칼과 프라이팬', ['식칼과 프라이팬'], [306, 306], 'aimed', 'body', { count: 3, speed: 186 }), beat('독가스', ['독가스를 쏟아 냈다'], [306, 310], 'ring', 'body', { count: 10, speed: 120, radius: 7 })], { targetSemantics: 'Beelzebub nightmare form; preserve the chef as patient and accountable person.' });
  set('b05-boss', [beat('하이힐의 칼날', ['하이힐의 칼날'], [320, 320], 'aimed', 'command-link', { count: 3, speed: 192 }), beat('매혹의 빛', ['매혹의 빛을 쏘았다'], [320, 322], 'fan', 'command-link', { count: 7, speed: 150 })], { targetSemantics: 'Cut coercive puppet relationships; do not erase Seoyun or the wish to be loved.' });
  set('b06-boss', [beat('칼날로 변한 지폐', ['손에서 흩어진 지폐가 칼날로 변했다'], [328, 330], 'fan', 'command-link', { count: 9, speed: 168 }), beat('같은 뒷면의 동전', ['수백 개의 동전이 모두 같은 뒷면을 보였다'], [332, 332], 'ring', 'command-link', { count: 12, speed: 144 })]);
  set('b06b-boss', [context('눈보라 속의 소년', [], [336, 343], 'lanes', 'command-link', { count: 4, windup: 75, speed: 126 })], { targetSemantics: 'Release the coercive fear-bound memory. The bereaved child is not a bodily kill target; no thorn/yoyo attack is named in prose.' });
  set('mb-ep1b06b', [context('겨울숲 가시파수', [], [336, 343], 'lanes', 'command-link', { count: 4, windup: 72, speed: 138 })], { targetSemantics: 'Runtime-source guardian adaptation, not the bereaved boy body. No thorn/yoyo attack is individually named in prose; preserve the child and his memory.' });
  set('b07-boss', ['곰', '늑대', '용'].map(function (form, i) { return beat(form + '의 형상', ['곰과 늑대, 용의 형상으로 변했다'], [349, 353], ['sweep', 'aimed', 'fan'][i], 'body', { count: [3, 5, 9][i], speed: [144, 180, 162][i], stageBasis: 'canonical-form-sequence' }); }), { targetSemantics: 'The dangerous fire form, not the janitor or children; evacuation precedes entering this dream.' });
  set('b08-boss', [beat('인장과 눈과 몸의 봉인', ['내 인장을 지우고 눈과 몸을 봉인했다'], [365, 365], 'lanes', 'body', { count: 4, speed: 144 }), beat('뇌를 닮은 연산핵', [], [367, 367], 'ring', 'body', { count: 10, speed: 138 })]);
  set('b09-boss', [beat('사이보그 개들', ['사이보그 개들이 눈보라를 헤치고 달려들었다'], [371, 371], 'lanes', 'body', { count: 4, speed: 180 }), beat('복제된 기억과 학습된 공격', ['내 기억을 복제해 죽은 동료들을 만들었다', '공격 방식까지 학습하여 같은 기술이 두 번 통하지 않게 했다'], [375, 375], 'aimed', 'body', { count: 5, speed: 192 }), beat('고통을 돌려받는 연산핵', [], [377, 383], 'ring', 'core', { count: 6, harmful: false, active: 90 })], { resolution: 'cleared', targetSemantics: 'Connection and returned experience collapse the computation core; the return coordinates are lost. This is not an ordinary defeat or bodily fall. Do not equate copied patterns with verified immortality.', canonicalTransition: { event: 'return-coordinates-lost', sourceRange: [381, 392] } });
  set('u201-mid', [context('방어의 군단', ['더 많은 기계가 조립되었다'], [408, 408], 'lanes', 'body', { count: 5, speed: 162 }), context('폭격의 루프', ['드론의 회전음에는 폭격과 탄피'], [412, 412], 'fan', 'body', { count: 7, speed: 168 })]);
  set('u202-mid', [context('분노와 기계 성벽', [], [426, 438], 'lanes', 'command-link', { count: 4, speed: 144 })]);
  set('u204-mid', [context('시스템의 거부권', [], [444, 456], 'ring', 'command-link', { count: 10, speed: 138 })]);
  set('u205-mid', [context('흡수되는 축귀 시스템 출력', ['그 힘까지 흡수했다'], [462, 468], 'spiral', 'command-link', { count: 6, speed: 150 })]);
  set('u206-mid', [context('선택의 얼굴을 한 명령', [], [474, 485], 'lanes', 'command-link', { count: 3, speed: 138 })]);
  set('u203-boss', [beat('기억의 문에 빙의한 통제자', ['기억의 문에 빙의했다'], [489, 489], 'sweep', 'command-link', { count: 3, halfWidth: 9 }), beat('반복을 명령하는 연결', [], [491, 495], 'aimed', 'command-link', { count: 3, harmful: false, active: 75 })], { targetSemantics: 'Sever repetitive command links. The memory door, child memories and child agency are preserved.' });
  set('l305-boss', [beat('피리로 늑대를 조종', ['피리로 늑대를 조종하는 고블린 두목'], [519, 523], 'aimed', 'body', { count: 4, speed: 180 }), beat('장미 인장과 공명', [], [523, 523], 'ring', 'body', { count: 6, harmful: false, active: 60 })], { targetSemantics: 'Defeat is followed by learning that the goblins are refugees and using the rose seal, not extermination.' });
  set('l301-boss', [beat('자세와 검로를 읽는 기사', ['내 자세와 검로를 읽어 갔다'], [527, 527], 'aimed', 'survival', { count: 3, speed: 192 }), beat('여섯 형상의 검격', ['여섯 형상으로 분열하였다', '서로 다른 방향에서 검격이 한꺼번에 들어왔다'], [529, 531], 'sweep', 'survival', { count: 6, windup: 84, halfWidth: 8, stageBasis: 'canonical-sequence' }), beat('검은 바다로 추락', [], [531, 532], 'lanes', 'survival', { count: 2, harmful: false, active: 90, stageBasis: 'canonical-sequence' })]);
  set('mb-last302-v31231', [context('주민을 끄는 보이지 않는 실', ['보이지 않는 실에 끌리듯'], [539, 541], 'lanes', 'command-link', { count: 4, speed: 126 })], { targetSemantics: 'Controlled exhausted villagers are protected subjects, not the objective target.' });
  set('l303-boss', [beat('잠을 빼앗는 시선', ['잠을 빼앗는 시선'], [547, 547], 'aimed', 'body', { count: 3, speed: 162 }), beat('겹겹의 잔상', ['겹겹의 잔상'], [547, 547], 'spiral', 'body', { count: 7, speed: 144 }), beat('드러난 핵', [], [549, 551], 'ring', 'core', { count: 6, harmful: false, active: 75 })], { targetSemantics: 'The hostile insomnia entity and exposed core; never turn the sword on the villagers.' });
  set('mb-kair01-v31231', [1, 2, 3, 4, 5, 6].map(function (wave) { return context('침공 파동 ' + wave, [], [582, 584], ['lanes', 'fan', 'aimed', 'ring', 'sweep', 'spiral'][wave - 1], 'core', { count: [3, 5, 3, 8, 3, 6][wave - 1], speed: 144 + wave * 6, active: 180, stageBasis: 'canonical-six-waves', affects: 'protected-core' }); }), { targetSemantics: 'Defend the first-command core against contamination, never damage or destroy the protected core.' });
  set('mb-kair04-v31231', [context('쉬고 기억하고 선택할 시간의 수확', [], [588, 592], 'ring', 'command-link', { count: 8, speed: 132 })]);
  set('kair-great-01', [context('빼앗긴 시간의 연결', [], [596, 602], 'ring', 'command-link', { count: 10, speed: 138 })]);
  set('kair-great-02', [context('겹치는 명령의 짧은 틈', [], [606, 610], 'lanes', 'command-link', { count: 4, interval: 48, speed: 150 })]);
  set('kair-great-04', [context('가능성을 태우는 동력로', ['명령선이 공방 전체를 조여 왔다'], [614, 618], 'sweep', 'command-link', { count: 4, windup: 72, halfWidth: 8 })], { targetSemantics: 'Cut the power/command route burning possibilities; preserve the possibilities themselves.' });
  set('kair-great-05', [context('명령문으로 바뀌는 움직임', ['내 움직임도 명령문으로 바뀌기 시작했다'], [622, 626], 'aimed', 'command-link', { count: 4, windup: 72, speed: 180 })]);
  set('mb-kair09-v31231', [beat('수천 개의 시계 파편', ['수천 개의 시계 파편으로 일어섰다'], [634, 634], 'spiral', 'command-link', { count: 12, speed: 132 })], { targetSemantics: 'Cut the gravekeeper deletion order while preserving the clock fragments and failed-choice memories.' });
  set('kair-great-06', [1, 2, 3, 4, 5, 6].map(function (ring) { return context('명령 고리 ' + ring, [], [638, 642], 'ring', 'command-link', { count: 6 + ring, speed: 126 + ring * 6, stageBasis: 'canonical-six-rings' }); }), { targetSemantics: 'Release all six rings. Numbers identify distinct rings; prose does not prescribe their numeric order.' });
  set('kair-great-03', [context('변조된 최초명령', [], [646, 650], 'lanes', 'command-link', { count: 3 }), beat('명령의 실 절단', [], [650, 650], 'sweep', 'command-link', { count: 2, harmful: false, active: 75 }), beat('스스로 다시 쓰는 첫 문장', [], [652, 652], 'ring', 'command-link', { count: 4, harmful: false, active: 60 })], { targetSemantics: 'Liberate Arvelia by cutting corrupted commands. Never attack or kill her body; her self rewrite and alliance are required.' });
  set('k103-boss', [beat('시간 수확', ['검은 모래가 전장을 잠식하고', '노이론 케이블과 시곗바늘이 내 움직임을 잘랐다'], [660, 664], 'sweep', 'command-link', { count: 4, halfWidth: 8, stageBasis: 'canonical-three-phases' }), beat('최적화된 운명', ['내 움직임까지 직접 명령했다'], [666, 670], 'lanes', 'command-link', { count: 4, active: 150, stageBasis: 'canonical-three-phases' }), beat('자유의지의 시간', ['검은 모래와 시곗바늘, 케이블과 생산 장치가 하나의 명령 아래 정렬되었다'], [672, 678], 'spiral', 'command-link', { count: 9, speed: 168, stageBasis: 'canonical-three-phases' })], { targetSemantics: 'Break imposed fate and restore choice; Arvelia grants a pause in phase two. The first-command core will be rewritten, not destroyed.' });
  set('mb-hando01', [context('혼자 지키는 성문', [], [700, 707], 'lanes', 'body', { count: 5, speed: 174 })], { resolution: 'cleared', canonicalTransition: { event: 'castle-fallen-and-ego-stolen', sourceRange: [704, 707] } });
  set('mb-hando02', [context('두 주인의 성문 봉인', [], [711, 715], 'lanes', 'command-link', { count: 4, active: 150 })], { targetSemantics: 'Only each owner can open their own seal. Hando defends their decision time and cannot substitute his authority.' });
  set('h103-boss', [beat('공동 EGO 코어의 속박', [], [719, 721], 'sweep', 'command-link', { count: 4 }), beat('함께 쓰러뜨리는 우두머리', [], [721, 723], 'aimed', 'body', { count: 3, speed: 180 })], { targetSemantics: 'Joint owner choices guide the fight; recover the shared core and receive a voluntary Lauren alliance.' });
  set('mb-murder01', [context('파란불 아래의 교정지', [], [743, 751], 'lanes', 'command-link', { count: 3, speed: 132 })], { targetSemantics: 'Investigation obstacle; Yun Haram remains a witness/memory subject and cannot be a kill objective.' });
  set('mb-murder02', [context('CCTV와 지워진 출입 기록', [], [756, 768], 'sweep', 'command-link', { count: 3, speed: 138 })], { targetSemantics: 'Investigate the missing fall and hotel records; do not classify Jang Minjae or Go Seojin as combat bosses.' });
  set('murder04-mid', [context('진술을 가리는 인과', [], [773, 799], 'lanes', 'command-link', { count: 4, speed: 126 })], { targetSemantics: 'Preserve four separate responsibilities and Woosol original report; do not kill or erase the memory subjects.' });
  set('blue-executor', [1, 2, 3].map(function (anchor) { return beat('인과 고정 단계 ' + anchor, ['인과를 고정하는 세 단계'], [804, 808], ['lanes', 'sweep', 'ring'][anchor - 1], 'command-link', { count: [4, 3, 8][anchor - 1], speed: [144, 156, 138][anchor - 1], stageBasis: 'canonical-three-causal-stages' }); }), { targetSemantics: 'Preserve records, reject a single scapegoat, release three causal locks and then reveal the falling shadow as Han Ikyung.', relativeEncounterOrder: 'unspecified-with-mb-murder03' });
  set('mb-murder03', [context('옥상 인과보관인', [], [804, 808], 'spiral', 'command-link', { count: 6, speed: 132 })], { relativeEncounterOrder: 'unspecified-with-blue-executor' });
  set('c101-mid', [context('신경망 외곽 회로', [], [831, 835], 'lanes', 'command-link', { count: 4, speed: 144 })]);
  set('c102-boss', [context('기계공학으로 이어지는 정신', [], [839, 843], 'fan', 'command-link', { count: 9, speed: 156 }), context('집단 자아의 연결', [], [839, 843], 'ring', 'command-link', { count: 12, speed: 144 })], { targetSemantics: 'The coercive neural connection is the target; the people, individual names and memories are protected.' });
  set('c105-mid', [context('ID 생체조 관리자', [], [847, 853], 'aimed', 'body', { count: 4, speed: 168 })]);
  set('c106-mid', [context('기계재판 집행핵', [], [857, 861], 'sweep', 'command-link', { count: 4, halfWidth: 8 })]);
  set('c103-mid', [context('황금 역십자가의 탄막', ['황금 역십자가의 탄막'], [873, 873], 'fan', 'command-link', { count: 9, speed: 168 })], { targetSemantics: 'Han Rian is the named betrayer; cut the guarded cult circuit without rewriting him as a collective-ego entity. Prose describes their attacks jointly; the per-person allocation follows the source runtime roster.' });
  set('c103-boss', [context('질서의 방벽', ['질서의 방벽'], [873, 873], 'lanes', 'command-link', { count: 4, active: 150 })], { targetSemantics: 'Baek Ion is the named betrayer; cut the guarded circuit. c103-mid remains Han Rian. Prose describes their attacks jointly; the per-person allocation follows the source runtime roster.' });
  set('c104-mid', [context('적그리스도 배양좌', [], [839, 841], 'ring', 'command-link', { count: 12, speed: 150 })], { targetSemantics: 'Cult apparatus, not the preserved union core. Its name is a source encounter adaptation and does not assert a completed Antichrist summoning.' });
  set('c104-boss', [beat('교주의 사몽', ['공간을 왜곡하고 시간을 멈추며 기억을 지웠다'], [877, 880], 'spiral', 'body', { count: 12, speed: 174, stageBasis: 'canonical-sequence' }), beat('검은 신경선의 부활', ['검은 신경선이 교주의 몸을 꿰매고'], [882, 885], 'sweep', 'survival', { count: 4, windup: 90, stageBasis: 'canonical-sequence' }), beat('동의한 두 의지의 사몽', [], [887, 898], 'lanes', 'authority', { count: 4, speed: 180, stageBasis: 'canonical-sequence' }), beat('교주의 사몽 권한 절단', [], [898, 906], 'aimed', 'authority', { count: 3, harmful: false, active: 75, stageBasis: 'canonical-sequence' })], { targetSemantics: 'One encounter includes body defeat, black-neural revival, living Samong awakening and authority duel. Preserve union core; remove only coercive commands and cult circuitry; remain as guardian.' });

  var finalByScene = { dist06: 'mb-ep1a07', ep1b09: 'b09-boss', u203: 'u203-boss', last301: 'l301-boss', kair01: 'mb-kair01-v31231', kair10: 'kair-great-06', kair02: 'kair-great-03', kair03: 'k103-boss', hando01: 'mb-hando01', hando02: 'mb-hando02', hando03: 'h103-boss', murder01: 'mb-murder01', murder02: 'mb-murder02', murder04: 'murder04-mid', murder03: 'blue-executor', cult04: 'c104-boss' };
  var objectives = { last301: true, kair01: true, kair10: true, kair02: true, kair03: true, hando02: true, hando03: true, murder01: true, murder02: true, murder04: true, murder03: true, cult04: true };
  var resolutionMap = { victory: 'cleared', 'survive-and-fall': 'survive-and-fall', 'restore-ally': 'liberated', 'defend-core': 'defended', investigation: 'investigated', 'end-command-link': 'command-severed', 'authority-cut': 'authority-severed' };
  var list = ids.map(function (id, index) {
    var source = sources[id], scene = source && scenes[source.sceneId];
    if (!source || !scene) throw new Error('Missing canonical encounter source: ' + id);
    var authored = specs[id];
    // These runtime-source midboss identities have no individually attributed attack in prose.
    // A labelled adaptation is deliberately distinct from a claimed canonical attack.
    if (!authored) {
      if (['mb-ep1b02', 'mb-ep1b03', 'mb-ep1b04', 'mb-ep1b05', 'mb-ep1b06', 'mb-ep1b06b', 'mb-ep1b07', 'mb-ep1b08', 'mb-ep1b09', 'u203-mid', 'mb-hando03'].indexOf(id) < 0) throw new Error('Unreviewed encounter contract: ' + id);
      var pattern = ['fan', 'sweep', 'ring', 'aimed', 'lanes', 'spiral'][index % 6];
      authored = { stages: [context(source.canonicalName, [], scene.sourceRange, pattern, 'body', { count: 3 + index % 6, speed: 138 + index % 5 * 12, interval: 40 + index % 3 * 4 })], targetSemantics: 'Runtime-source encounter adaptation. No individual attack is named in the prose; do not transfer the scene final objective to this intermediate encounter.' };
    }
    var isFinal = finalByScene[scene.id] === id;
    var resolution = authored.resolution || (finalByScene[scene.id] && !isFinal ? 'cleared' : (resolutionMap[scene.outcome] || 'cleared'));
    var stages = authored.stages.map(function (s, n) { return Object.assign({ id: id + ':stage:' + (n + 1) }, s); });
    var result = { id: id, sceneId: scene.id, name: source.canonicalName || source.sourceName, identity: id, sourceName: source.sourceName, sourceAnchors: source.sourceAnchors.slice(), sourceRange: scene.sourceRange.slice(), narrator: scene.narrators.map(function (n) { return n.name; }), outcome: resolution === 'cleared' ? 'victory' : scene.outcome, resolution: resolution, objectiveSceneId: isFinal && objectives[scene.id] ? scene.id : null,
      canonicalIdentity: { sourceId: id, relationGroup: source.relationGroup, role: id === 'blue-executor' ? 'boss' : source.role, historicalSourceRole: source.role, origin: 'canonical-source-encounter-roster', proseAttackAttribution: stages.some(function (s) { return s.sourceExplicit.length > 0; }) ? 'see-per-stage-evidence' : 'not-individually-specified' },
      targetSemantics: authored.targetSemantics || 'Target the represented hostile encounter form. Exact attack choreography is an explicitly labelled gameplay adaptation.',
      stages: stages, stageCount: stages.length, stageCountBasis: ['mb-kair01-v31231', 'kair-great-06', 'k103-boss', 'blue-executor'].indexOf(id) >= 0 ? 'canonical-explicit-count' : 'authored-contract', relativeEncounterOrder: authored.relativeEncounterOrder || 'source-scene-order', requiredFormIds: clone(source.requiredFormIds || []), gameplayImplemented: false, approvedArt: false, contractOnly: true };
    if (authored.canonicalTransition) result.canonicalTransition = clone(authored.canonicalTransition);
    if (id === 'c103-mid' && result.name.indexOf('한리안') < 0 || id === 'c103-boss' && result.name.indexOf('백이온') < 0) throw new Error('Han Rian / Baek Ion identity mismatch');
    return freeze(result);
  });
  var byId = Object.create(null); list.forEach(function (descriptor) { byId[descriptor.id] = descriptor; });
  freeze(list); freeze(BUDGET);
  return freeze({ schemaVersion: 1, contractRevision: 'storymode-encounters-1', budget: BUDGET, get: function (id) { return typeof id === 'string' && byId[id] || null; }, list: function () { return list; } });
}));
