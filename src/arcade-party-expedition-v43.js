/* A single expedition spans several fights. Only its trophies and intermissions live here. */
(function (root) {
  'use strict';

  const keys = Object.freeze({
    campaign: 'hapil.ai-party.expedition.campaign.v1',
    trial: 'hapil.ai-party.expedition.trial.v1'
  });
  const permanent = [
    ['drone-coil', '동력 코일', '드론 사격 피해 +12%', 'drone', 'droneDamage', 3, .12],
    ['archon-clock', '예지 회로', '아르콘 지원 기술 대기시간 −8%', 'archon', 'archonCooldown', 3, -.08],
    ['angel-ward', '수호 깃털', '천사 방어막이 탄을 1발 더 막음', 'angel', 'wardCapacity', 2, 1],
    ['power-cell', '공명 축전지', '영웅 권능 충전 속도 +12%', 'hero', 'powerCharge', 3, .12],
    ['recall-beacon', '귀환 봉화', '쓰러진 동료의 재합류 대기시간 −12%', 'party', 'reformTime', 3, -.12],
    ['pilot-ribbon', '조종사의 매듭', '직접 회피로 얻는 사격 강화가 0.5초 더 지속', 'hero', 'evadeSeconds', 3, .5]
  ];
  const supplies = [
    ['supply-ammo', '관통 탄창', '다음 스테이지에서 드론 사격 피해 +24%', 'drone', 'droneDamage', 1, .24],
    ['supply-clock', '예지 동력팩', '다음 스테이지에서 아르콘 지원 기술 대기시간 −16%', 'archon', 'archonCooldown', 1, -.16],
    ['supply-ward', '수호 부적', '다음 스테이지에서 천사 방어막이 탄을 1발 더 막음', 'angel', 'wardCapacity', 1, 1],
    ['supply-charge', '예비 전지', '다음 스테이지에서 영웅 권능 충전 속도 +24%', 'hero', 'powerCharge', 1, .24],
    ['supply-beacon', '구조 신호탄', '다음 스테이지에서 쓰러진 동료의 재합류 대기시간 −24%', 'party', 'reformTime', 1, -.24],
    ['supply-ribbon', '집중 패치', '다음 스테이지에서 직접 회피 사격 강화가 1초 더 지속', 'hero', 'evadeSeconds', 1, 1]
  ];
  const cards = Object.create(null);
  function define(rows, temporary) {
    for (const [id, name, detail, role, stat, maxRank, amount] of rows) {
      cards[id] = Object.freeze({id, name, detail, role, stat, maxRank, amount, temporary});
    }
  }
  define(permanent, false);
  define(supplies, true);
  Object.freeze(cards);
  const permanentIds = permanent.map(row => row[0]);
  const supplyIds = supplies.map(row => row[0]);
  const memory = Object.create(null);
  const stores = new WeakMap();
  let sequence = 0;

  function randomSeed() {
    try { return root.crypto.getRandomValues(new Uint32Array(1))[0]; }
    catch (_) { return (Date.now() + Math.floor(Math.random() * 4294967296)) >>> 0; }
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  const isStage = n => Number.isInteger(n) && n >= 1 && n <= 52;
  function rank(run, id) {
    if (!run || !cards[id]) return 0;
    if (cards[id].temporary) {
      return Number(run.picks.some(p => p.card === id && p.stage + 1 === run.stage));
    }
    return run.picks.filter(p => p.card === id).length;
  }
  function effects(run) {
    const result = {droneDamage:1, archonCooldown:1, wardCapacity:0, powerCharge:1, reformTime:1, evadeSeconds:0};
    if (!run || (run.status !== 'battle' && run.status !== 'rest')) return result;
    for (const pick of run.picks) {
      const card = cards[pick.card];
      if (card && (!card.temporary || pick.stage + 1 === run.stage)) result[card.stat] += card.amount;
    }
    for (const stat of Object.keys(result)) result[stat] = Math.round(result[stat] * 100) / 100;
    return result;
  }
  // Stage-keyed PRNG separates drafting from shop rolls, battle timing and how often the menu reopens.
  function draft(run) {
    let state = (run.seed ^ Math.imul(run.stage, 0x9e3779b1)) >>> 0;
    function random() {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(state ^ state >>> 15, state | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    }
    function shuffle(ids) {
      for (let i = ids.length - 1; i > 0; --i) {
        const j = Math.floor(random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      return ids;
    }
    const available = shuffle(permanentIds.filter(id => rank(run, id) < cards[id].maxRank));
    const temporary = shuffle(supplyIds.slice());
    const mixed = run.stage > run.startStage && random() < .5;
    const offers = available.splice(0, mixed ? 2 : 3);
    for (const id of temporary.concat(available)) {
      if (offers.length === 3) break;
      if (!offers.some(other => cards[other].stat === cards[id].stat)) offers.push(id);
    }
    return shuffle(offers);
  }
  function valid(run) {
    if (!run || run.version !== 1 || typeof run.id !== 'string' || !run.id || run.id.length > 120 ||
        !Number.isInteger(run.seed) || run.seed < 0 || run.seed > 4294967295 ||
        !isStage(run.startStage) || !isStage(run.endStage) || !isStage(run.stage) ||
        run.stage < run.startStage || run.stage > run.endStage ||
        !['battle','rest','won','lost'].includes(run.status) || !Array.isArray(run.offers) ||
        !Array.isArray(run.picks) || run.picks.length !== run.stage - run.startStage ||
        (run.status === 'won' && run.stage !== run.endStage)) return false;
    const counts = Object.create(null);
    for (let index = 0; index < run.picks.length; index++) {
      const pick = run.picks[index], card = pick && cards[pick.card];
      if (!card || pick.stage !== run.startStage + index) return false;
      counts[card.id] = (counts[card.id] || 0) + 1;
      if (!card.temporary && counts[card.id] > card.maxRank) return false;
    }
    if (run.status !== 'rest') return !run.offers.length && run.selected === null;
    const options = run.offers.map(id => cards[id]);
    return run.stage < run.endStage && options.length === 3 && options.every(card =>
      card && (card.temporary || (counts[card.id] || 0) < card.maxRank)) &&
      new Set(options.map(card => card.stat)).size === 3 &&
      (run.selected === null || run.offers.includes(run.selected));
  }
  // Bound the save to a stage checkpoint, independently of the engine's projectile buffers.
  function cloneCarry(value) {
    if (value == null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('원정 체크포인트 형식을 확인하세요.');
    const text = JSON.stringify(value);
    if (!text || text.length > 32768) throw new RangeError('원정 체크포인트가 너무 큽니다.');
    return JSON.parse(text);
  }
  function open(scope, storage) {
    if (!Object.prototype.hasOwnProperty.call(keys, scope)) throw new RangeError('원정 종류를 확인하세요.');
    const key = keys[scope];
    if (storage === undefined) {
      try { storage = root.localStorage; } catch (_) { storage = null; }
    }
    let cache = memory;
    if (storage) {
      if (!stores.has(storage)) stores.set(storage, Object.create(null));
      cache = stores.get(storage);
    }
    const cell = cache[key] || (cache[key] = {run:null, interruptedWrite:false});
    function current() {
      if (storage && !cell.interruptedWrite) {
        try {
          const text = storage.getItem(key);
          if (text === null) { cell.run = null; return null; }
          const data = JSON.parse(text);
          if (valid(data)) { cell.run = data; return data; }
          cell.run = null; return null;
        } catch (_) {
          // Fall through to the last usable in-session checkpoint.
        }
      }
      return cell.run;
    }
    function save(run) {
      cell.run = run;
      if (storage) {
        try { storage.setItem(key, JSON.stringify(run)); cell.interruptedWrite = false; }
        catch (_) { cell.interruptedWrite = true; }
      }
      return copy(run);
    }
    function start(options = {}) {
      const startStage = options.startStage == null ? 1 : options.startStage;
      const endStage = options.endStage == null ? 52 : options.endStage;
      if (!isStage(startStage) || !isStage(endStage) || endStage < startStage) throw new RangeError('원정 스테이지 범위를 확인하세요.');
      const seed = options.seed == null ? randomSeed() : options.seed;
      if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('원정 시드를 확인하세요.');
      const id = [Date.now().toString(36), (++sequence).toString(36), randomSeed().toString(36)].join('-');
      return save({version:1,id,seed,startStage,endStage,stage:startStage,status:'battle',
        hero:String(options.hero || 'memory'),difficulty:String(options.difficulty || 'normal'),auto:options.auto === true,
        offers:[],selected:null,picks:[],carry:null});
    }
    // Every mutating action checks the identity, completed stage, and current phase again.
    function change(id, stage, status, update) {
      const run = current();
      if (!run || run.id !== id || run.stage !== stage || run.status !== status || !update(run)) return run ? copy(run) : null;
      return save(run);
    }
    function clear(id, stage, carry) {
      return change(id, stage, 'battle', run => {
        if (carry !== undefined) run.carry = cloneCarry(carry);
        if (stage === run.endStage) run.status = 'won';
        else { run.status = 'rest'; run.offers = draft(run); }
        return true;
      });
    }
    function select(id, stage, card) {
      return change(id, stage, 'rest', run => {
        if (!run.offers.includes(card) || run.selected === card) return false;
        run.selected = card; return true;
      });
    }
    function choose(id, stage, card) {
      return change(id, stage, 'rest', run => {
        const choice = card === undefined ? run.selected : card;
        if (!run.offers.includes(choice)) return false;
        run.picks.push({stage,card:choice});
        run.stage++; run.status = 'battle'; run.offers = []; run.selected = null;
        return true;
      });
    }
    function checkpoint(id, stage, carry) {
      return change(id, stage, 'battle', run => { run.carry = cloneCarry(carry); return true; });
    }
    function lose(id, stage) {
      return change(id, stage, 'battle', run => { run.status = 'lost'; return true; });
    }
    return {read() { const run = current(); return run ? copy(run) : null; }, start, checkpoint, clear, select, choose, lose};
  }
  const api = {open, cards, rank, effects, keys};
  root.PartyExpedition = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
