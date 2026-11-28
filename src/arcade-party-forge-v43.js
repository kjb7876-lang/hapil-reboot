/* Contract marks, engineering plans and supplies for one pilot's AI formation. */
(function (root) {
  'use strict';
  const KINDS = ['archon', 'drone', 'angel'];
  const SLOTS = ['front', 'wing', 'rear'];
  const names = {archon:'아르콘', drone:'드론', angel:'천사'};
  const positions = {front:'전방', wing:'측면', rear:'후방'};
  const costByStar = {3:1, 4:2, 5:2, 6:3};
  const sealStages = [18,22,26,30,34,38,42,46];
  const keys = {trial:'hapil.ai-party.forge.v1', campaign:'hapil.ai-party.campaign.v1'};
  const lineages = ['time','gravity','neural'];
  const saves = new WeakMap();
  const number = (value, lo, hi) => Number.isInteger(value) && value >= lo && value <= hi;
  const validKind = value => KINDS.includes(value);
  const canStage = n => number(n, 1, 52);
  const ok = (message, extra) => Object.assign({ok:true, message}, extra);
  const fail = message => ({ok:false, message});
  const emptyReel = () => ({symbols:[], status:'idle', level:0, target:null, held:null});
  const firstSlot = (s, kind) => SLOTS.find(slot => s.board[slot] === kind);
  function randomSeed() {
    try { return root.crypto.getRandomValues(new Uint32Array(1))[0]; }
    catch (_) { return (Date.now() ^ Math.floor(Math.random()*4294967296)) >>> 0; }
  }
  function draw(s, count) {
    // Use rejection sampling so three symbols really do have equal frequency.
    const limit = 4294967296 - 4294967296 % count;
    do { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; } while (s.rng >= limit);
    // The upper bits mix successive outputs even when count divides 2**32.
    return Math.floor(s.rng / (limit/count));
  }
  function shop(s) {
    return Array.from({length:5}, () => {
      const kind = KINDS[draw(s,3)];
      const rarity = draw(s,100);
      const qty = rarity < 70 ? 1 : rarity < 95 ? 2 : 3;
      return {id:++s.offerSeq, kind, qty, cost:qty, sold:false};
    });
  }
  function restock(s) {
    s.reel=emptyReel();
    s.shop=shop(s);
  }
  function fresh(seed = randomSeed(), mode = 'trial') {
    const campaign = mode === 'campaign';
    const s = {version:1, mode:campaign?'campaign':'trial', revision:0, seed:seed>>>0, rng:seed>>>0,
      credits:6, seals:campaign?0:1, vouchers:0, stage:campaign?1:40, cleared:[], difficultyClears:{},
      board:{front:'archon',wing:'drone',rear:'angel'}, lineage:'time', units:{},
      reel:emptyReel(), shop:[], offerSeq:0, sortie:0, active:null};
    for (const k of KINDS) s.units[k] = {stars:!campaign && k==='archon' ? 6 : 1, copies:0, gear:0};
    s.shop=shop(s);
    return s;
  }
  function reelLevel(symbols) {
    const count = new Set(symbols).size;
    return count === 1 ? 3 : count === 2 ? 1 : 0;
  }
  function validate(s, mode) {
    if (!s || s.version!==1 || s.mode!==mode || !number(s.revision,0,1e9) ||
        !number(s.seed,0,4294967295) || !number(s.rng,0,4294967295) || !canStage(s.stage) ||
        !number(s.credits,0,1e6) || !number(s.seals,0,1e5) || !number(s.vouchers,0,1e5) ||
        !number(s.offerSeq,0,1e9) || !number(s.sortie,0,1e9) || !lineages.includes(s.lineage)) return false;
    if (!s.board || new Set(SLOTS.map(key=>s.board[key])).size !== 3 || !SLOTS.every(slot=>validKind(s.board[slot]))) return false;
    if (!s.units || !KINDS.every(k => s.units[k] && number(s.units[k].stars,1,7) &&
        number(s.units[k].gear,0,2) && number(s.units[k].copies,0,1e6))) return false;
    if (!Array.isArray(s.shop) || s.shop.length!==5 || !s.shop.every(o=>o && validKind(o.kind) &&
        number(o.id,1,s.offerSeq) && number(o.qty,1,3) && o.qty===o.cost && typeof o.sold==='boolean')) return false;
    const r=s.reel;
    if (!r || !Array.isArray(r.symbols) || !r.symbols.every(validKind) || !number(r.level,0,3) ||
        !(r.held===null || number(r.held,0,2))) return false;
    if (!(r.status==='idle' && !r.symbols.length && !r.level && r.target===null ||
          r.status==='choose' && r.symbols.length===3 && !r.level && r.target===null ||
          r.status==='awarded' && r.symbols.length===3 && validKind(r.target) && [0,1,3].includes(r.level))) return false;
    if (!Array.isArray(s.cleared) || !s.cleared.every(canStage) || !s.difficultyClears ||
        typeof s.difficultyClears!=='object' || Array.isArray(s.difficultyClears) ||
        !Object.values(s.difficultyClears).every(list=>Array.isArray(list)&&list.every(canStage))) return false;
    if (s.restThrough!==undefined && (!s.restThrough || typeof s.restThrough!=='object' ||
        Array.isArray(s.restThrough) || !Object.values(s.restThrough).every(canStage))) return false;
    if (s.active && (typeof s.active.id!=='string' || !number(s.active.stage,40,42) || typeof s.active.practice!=='boolean')) return false;
    return mode==='campaign' || s.stage>=40 && s.stage<=42;
  }
  function usableStorage(given) {
    if (given !== undefined) return given;
    try { return root.localStorage; } catch (_) { return null; }
  }
  function loadProfile(mode, storage) {
    storage=usableStorage(storage);
    let restored;
    try { restored=JSON.parse(storage.getItem(keys[mode])); } catch (_) {}
    const s=validate(restored,mode) ? restored : fresh(randomSeed(),mode);
    if (storage) {
      saves.set(s,storage);
      if (s !== restored) {
        try { storage.setItem(keys[mode],JSON.stringify(s)); } catch (_) {}
      }
    }
    return s;
  }
  function action(s, perform, invalidate=true, reconcile=false) {
    const storage=saves.get(s);
    // Reconcile a second open workshop before acting on its older offer/credit balance.
    if (storage) {
      try {
        const latest=JSON.parse(storage.getItem(keys[s.mode]));
        if (validate(latest,s.mode) && (latest.seed!==s.seed || latest.revision>s.revision)) {
          Object.assign(s,latest);
          if (!reconcile) return fail('다른 화면의 정비 기록을 가져왔습니다. 현재 선택을 다시 확인하세요.');
        }
      } catch (_) {}
    }
    const result=perform();
    if (!result.ok) return result;
    if (invalidate) s.active=null;
    s.revision++;
    if (storage) {
      try { storage.setItem(keys[s.mode],JSON.stringify(s)); }
      catch (_) { result.message += ' 이 브라우저에서는 재실행 후 복원이 제한됩니다.'; }
    }
    return result;
  }
  function place(s,kind,slot) {
    if (!validKind(kind)||!SLOTS.includes(slot)) return fail('동료와 자리를 선택하세요.');
    return action(s,()=>{
      const previous=firstSlot(s,kind);
      if (previous===slot) return fail('이미 이 자리에 있습니다.');
      s.board[previous]=s.board[slot]; s.board[slot]=kind;
      return ok(names[kind]+' · '+positions[slot]+' 배치');
    });
  }
  function setLineage(s,lineage) {
    return action(s,()=>{
      if (!lineages.includes(lineage)) return fail('계약 계보를 선택하세요.');
      s.lineage=lineage;
      return ok('출격할 권능을 선택했습니다.');
    });
  }
  function refresh(s) {
    return action(s,()=>{
      if (s.credits<2) return fail('재탐색에 정비비 2가 필요합니다.');
      s.credits-=2; s.shop=shop(s);
      return ok('새 계약 후보 다섯 개를 찾았습니다.');
    });
  }
  function buy(s,offerId) {
    return action(s,()=>{
      const offer=s.shop.find(o=>String(o.id)===String(offerId));
      if (!offer || offer.sold) return fail('이미 처리된 후보입니다.');
      if (s.units[offer.kind].stars>=3) return fail('3성부터는 공명 인장으로 승격합니다.');
      if (s.credits<offer.cost) return fail('정비비가 부족합니다.');
      s.credits-=offer.cost; offer.sold=true; s.units[offer.kind].copies+=offer.qty;
      return ok(names[offer.kind]+' 증표 '+offer.qty+'개를 얻었습니다.');
    });
  }
  function redeem(s,kind) {
    return action(s,()=>{
      if (!validKind(kind) || !s.vouchers || s.units[kind].stars>=3) return fail('1~2성 동료에게 보급 증표를 사용할 수 있습니다.');
      s.vouchers--; s.units[kind].copies++;
      return ok(names[kind]+' 증표 1개를 받았습니다.');
    });
  }
  function promotion(s,kind) {
    if (!validKind(kind)) return {ready:false,risky:false,text:'동료 선택'};
    const u=s.units[kind];
    if (u.stars===7) return {ready:false,risky:false,text:'7성 완료'};
    if (u.stars<3) {
      const cost=u.stars===1 ? 2 : 6;
      return {ready:u.copies>=cost, risky:u.stars===1 && u.copies===1 && s.credits>=2,
        text:u.copies+' / '+cost+' 추가 증표',cost};
    }
    const cost=costByStar[u.stars];
    return {ready:s.seals>=cost,risky:false,text:s.seals+' / '+cost+' 공명 인장',cost};
  }
  function promote(s,kind,risky=false) {
    return action(s,()=>{
      if (!validKind(kind)) return fail('동료를 선택하세요.');
      const p=promotion(s,kind), u=s.units[kind];
      if (risky && p.risky) {
        s.credits-=2;
        if (draw(s,2)===0) return ok('조기 합성 실패 · 기존 별과 증표를 보존했습니다.',{success:false});
        u.copies--;
      } else if (!p.ready) return fail(p.text);
      else if (u.stars<3) u.copies-=p.cost;
      else s.seals-=p.cost;
      u.stars++;
      return ok(names[kind]+' '+u.stars+'성 승격',{success:true});
    });
  }
  function equip(s,kind) {
    return action(s,()=>{
      if (!validKind(kind) || s.units[kind].gear>=2) return fail('장비 강화는 +2까지입니다.');
      if (s.credits<2) return fail('장비 강화에 정비비 2가 필요합니다.');
      s.credits-=2; s.units[kind].gear++;
      return ok(names[kind]+' 장비 +'+s.units[kind].gear);
    });
  }
  function awardReel(s,kind,level) {
    Object.assign(s.reel,{target:kind,level,status:'awarded'});
    return ok(level===0?'추가 보급 없음':names[kind]+' 출격 보급 +'+level);
  }
  function spin(s) {
    return action(s,()=>{
      if (s.reel.status!=='idle') return fail('이번 정비의 릴을 이미 돌렸습니다.');
      const symbols=Array.from({length:3},()=>KINDS[draw(s,3)]);
      s.reel.symbols=symbols;
      if (reelLevel(symbols)===3) return awardReel(s,symbols[0],3);
      s.reel.status='choose';
      return ok('확정 +1 보급 또는 한 칸 고정 후 재회전을 고르세요.');
    });
  }
  function bank(s,kind) {
    return action(s,()=>{
      if (!validKind(kind) || s.reel.status!=='choose') return fail('정산할 릴이 없습니다.');
      return awardReel(s,kind,1);
    });
  }
  function reroll(s,index) {
    return action(s,()=>{
      if (s.reel.status!=='choose' || !number(index,0,2)) return fail('고정할 릴 한 칸을 고르세요.');
      const kind=s.reel.symbols[index]; s.reel.held=index;
      s.reel.symbols=s.reel.symbols.map((value,i)=>i===index?value:KINDS[draw(s,3)]);
      return awardReel(s,kind,reelLevel(s.reel.symbols));
    });
  }
  function preview(s,kind,slot=firstSlot(s,kind)) {
    const unit=s.units[kind];
    return {kind,slot,stars:unit.stars,gear:unit.gear,supply:s.reel.target===kind && !s.reel.spent?s.reel.level:0,lineage:s.lineage};
  }
  function battleConfig(s,stage=s.stage) {
    return {stage,seed:(s.seed ^ Math.imul(stage,2654435761))>>>0,lineage:s.lineage,
      companions:SLOTS.map(slot=>preview(s,s.board[slot],slot))};
  }
  function start(s,stage=s.stage) {
    if (s.mode!=='trial' || !number(stage,40,42)) return fail('훈련 단계를 선택하세요.');
    return action(s,()=>{
      if (!s.active || s.active.stage!==stage) {
        s.sortie++;
        s.active={id:s.seed.toString(36)+'-'+s.sortie.toString(36),stage,practice:stage!==s.stage || s.cleared.includes(stage)};
      }
      return ok(s.active.practice?'연습 출격':'작전 출격',{id:s.active.id,config:battleConfig(s,stage),practice:s.active.practice});
    },false);
  }
  function firstClear(s,stage) {
    const reward={credits:4+Math.min(5,Math.floor(s.credits/10)),seals:0,vouchers:0};
    if (s.mode==='trial' || sealStages.includes(stage)) reward.seals=1;
    if (s.mode==='campaign' && stage<=16 && stage%2===0) reward.vouchers=1;
    s.cleared.push(stage); s.credits+=reward.credits; s.seals+=reward.seals; s.vouchers+=reward.vouchers;
    return reward;
  }
  function rewardText(r) {
    const parts=['정비비 +'+r.credits];
    if (r.seals) parts.push('인장 +'+r.seals);
    if (r.vouchers) parts.push('선택 증표 +'+r.vouchers);
    return parts.join(' · ');
  }
  function finish(s,id,won) {
    return action(s,()=>{
      if (s.mode!=='trial'||!s.active||s.active.id!==id) return fail('이미 종료된 출격입니다.');
      const run=s.active; s.active=null;
      if (!won) return ok('재출격 시 같은 보급을 이어 씁니다.',{first:false});
      if (run.practice||s.cleared.includes(run.stage)) return ok('훈련을 마쳤습니다.',{first:false});
      const reward=firstClear(s,run.stage);
      restock(s);
      s.stage=Math.min(42,run.stage+1);
      return ok(rewardText(reward),{first:true,reward});
    },false);
  }
  function campaignEnter(s,stage,options={}) {
    if (s.mode!=='campaign' || !canStage(stage)) throw new RangeError('캠페인 출격 단계를 확인하세요.');
    const result=action(s,()=>{
      const previous=s.stageAllocation;
      if (options.resume && previous && previous.stage===stage && Array.isArray(previous.companions) &&
          previous.companions.length===3 && previous.companions.every(c=>c && validKind(c.kind) && SLOTS.includes(c.slot) &&
            number(c.stars,1,7) && number(c.gear,0,2) && number(c.supply,0,3)) &&
          number(previous.seed,0,4294967295) && lineages.includes(previous.lineage)) {
        return ok('편대 복귀',{config:JSON.parse(JSON.stringify(previous))});
      }
      const config=battleConfig(s,stage);
      s.stageAllocation=JSON.parse(JSON.stringify(config));
      if (s.reel.status==='awarded') s.reel.spent=true;
      return ok('편대 출격',{config});
    },false,true);
    return result.config;
  }
  function campaignClear(s,stage,difficulty='normal',runId) {
    if (s.mode!=='campaign'||!canStage(stage)) return fail('캠페인 스테이지를 확인하세요.');
    if (!['gentle','easy','normal','hell','handicap'].includes(difficulty)) difficulty='normal';
    if (difficulty==='easy') difficulty='gentle';
    return action(s,()=>{
      const records=s.difficultyClears[difficulty] || (s.difficultyClears[difficulty]=[]);
      const recorded=records.includes(stage);
      if (!recorded) records.push(stage);
      // Each expedition advances in order. Remember its furthest rest so repeated
      // callbacks and reopened workshops cannot reroll the supplies or the shelf.
      const runKey=typeof runId==='string' && runId.length>0 && runId.length<=128 ? 'run:'+runId : null;
      const newRest=runKey!==null && stage>(s.restThrough?.[runKey]||0);
      if (newRest) {
        if (!s.restThrough) s.restThrough={};
        s.restThrough[runKey]=stage;
      }
      const first=!s.cleared.includes(stage);
      if (first || newRest) restock(s);
      if (!first) {
        const message=newRest ? '편대 보급과 상점 물자를 새로 준비했습니다.' :
          recorded ? '이미 완료한 스테이지입니다.' : '다른 난이도의 클리어를 기록했습니다.';
        return ok(message,{first:false,restocked:newRest});
      }
      const reward=firstClear(s,stage);
      s.stage=Array.from({length:52},(_,i)=>i+1).find(n=>!s.cleared.includes(n))||52;
      return ok(rewardText(reward),{first:true,restocked:true,reward});
    },false,true);
  }
  function reset(s) {
    if (s.mode==='campaign') return fail('여기서는 훈련 기록만 초기화할 수 있습니다.');
    return action(s,()=>{ Object.assign(s,fresh()); return ok('새 훈련 편대를 준비했습니다.'); });
  }
  const api={names,positions,kinds:KINDS,slots:SLOTS,keys,fresh,load:storage=>loadProfile('trial',storage),
    loadCampaign:storage=>loadProfile('campaign',storage),place,setLineage,buy,refresh,equip,promotion,promote,redeem,
    reelLevel,spin,bank,reroll,preview,battleConfig,start,finish,campaignEnter,campaignClear,reset};
  root.PartyForge=api;
  if (typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window==='undefined'?globalThis:window);
