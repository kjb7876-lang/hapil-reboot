(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const F = window.PartyForge, Sim = window.WingSim;
  const art = window.PARTY_ART || {};
  const kindNames = F.names, slots = F.slots, kinds = F.kinds;
  const positions = {front:'전방',wing:'측면',rear:'후방',reserve:'대기 동료'};
  const lineageNames = {time:'시간 제어',gravity:'중력 제어',neural:'신경계 제어'};
  const lineageInfo = {time:'시간 제어는 접근하는 적탄을 늦춥니다.',gravity:'중력 제어는 적탄의 경로를 휘게 합니다.',neural:'신경계 제어는 적의 다음 발사 명령을 늦춥니다.'};
  const roles = {archon:'전열 수호',drone:'탄환 요격',archer:'원거리 사격',angel:'치유·충전'};
  const slotEffects = {front:'지원 대기 −25%',wing:'사격 피해 +45%',rear:'권능 충전 +20%'};
  const missions = {40:'차단선 훈련',41:'교차 사격 훈련',42:'악몽분대장'};
  const campaign = new URLSearchParams(location.search).get('campaign') === '1' && !!F.loadCampaign;
  const campRest = campaign && new URLSearchParams(location.search).get('rest') === '1';
  const E = window.PartyExpedition, stop = window.HapilPartyStop;
  const ledger = campaign ? null : E.open('trial');
  let expedition = ledger?.read();
  const running = () => expedition && ['rest','battle'].includes(expedition.status);
  // One equipment profile for this expedition. The original practice and story profiles have their own keys.
  const memory = new Map();
  const prefix = 'hapil.ai-party.trial-route.';
  function recall(key) {
    try {
      const value = localStorage.getItem(prefix + key);
      if (value !== null) return JSON.parse(value);
    } catch (_) {}
    return memory.get(key);
  }
  function store(key, value) {
    memory.set(key, value);
    try {
      if(value === null) localStorage.removeItem(prefix + key);
      else localStorage.setItem(prefix + key, JSON.stringify(value));
    } catch (_) {}
  }
  function routeEquipment(owner) {
    return F.load({
      getItem() {const record=recall('equipment');return record?.owner===owner ? record.data : null;},
      setItem(_,data) {store('equipment',{owner,data});}
    });
  }
  let save = campaign ? F.loadCampaign() : routeEquipment(running() ? expedition.id : 'ready');
  let editingStop = false, directRestSupply = false;
  const nativeRestSupply = campRest && new URLSearchParams(location.search).get('pane') === 'supply';
  let reelReadyAt = 0;
  const prefs = campaign ? {} : (recall('controls') || {});
  const embedded = window.parent !== window;
  const duringSortie = campaign && new URLSearchParams(location.search).get('during') === '1';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let page = 'home', chosenSlot = null, unit = 'archon', tab = 'supply';
  let message = '', run = null, sim = null, view = null, gameStage = 42;
  let paused = false, autoPilot = campaign ? !!window.HapilPartyPilotAuto?.() : (prefs.auto ?? expedition?.carry?.auto ?? expedition?.auto ?? false);
  let selectedHero = (!campaign && (running() ? expedition.hero : prefs.hero)) || 'memory', held = new Set(), queued = new Set(), drag = null, focusPointer = null;
  let lastFrame = 0, hudTimer = 0, previousHud = '', directPractice = false;
  let checkpointTick = 0;
  if(!campaign){
    $('trial-difficulty').value=(running() ? expedition.difficulty : prefs.difficulty) || 'gentle';
    // Put the manual/automatic switch within reach on the first visit and on small screens.
    document.querySelector('.launch-row').after($('home-auto').parentElement);
  }
  function rememberControls(){
    if(!campaign)store('controls',{hero:selectedHero,auto:autoPilot,difficulty:$('trial-difficulty').value});
  }
  const node = (tag, text, className) => {const n=document.createElement(tag);if(text !== undefined)n.textContent=text;if(className)n.className=className;return n;};
  const action = (label, fn, cls, disabled=false) => {const b=node('button',label,cls);b.disabled=disabled;b.addEventListener('click',fn);return b;};
  const locale = window.PartyWorkshopI18n;
  const localize = element => locale.apply(element);
  const sprite = (kind, cls='portrait') => {const img=node('img',undefined,cls);img.alt='';const src=art[kind];if(src)img.src=src;else img.hidden=true;return img;};
  const show = id => {
    page=id;
    ['home','workshop','game','result'].forEach(k=>{$(k).hidden=k!==id;});
    if(id==='game')fitArena();
    else window.scrollTo(0,0);
  };
  function describe(kind,slot) {
    const base=Sim.describe(F.preview(save,kind,slot));
    if(kind==='angel' && campaign) {
      return '폭탄 게이지 획득량 +20%. 엄호에 성공하면 편대 권능 +8.'+
        (slot==='rear'?' '+Sim.angelRecovery+'.':'');
    }
    return base;
  }
  const slotFor = kind => slots.find(pos=>save.board[pos]===kind) || 'reserve';
  const kindAt = pos => pos==='reserve' ? F.reserve(save) : save.board[pos];
  function home() {
    const underway=!campaign && running(), suspended=underway && expedition.status==='battle';
    const stage=underway ? expedition.stage : 40;
    $('mission-label').textContent=campaign?'스토리 모드 · 편대 원정':editingStop?locale.text('스테이지 {n} 클리어').replace('{n}',stage):'성장 원정 · 40 → 41 → 42';
    $('home-title').textContent=campaign?'편대 준비':editingStop?'다음 전투 준비':'악몽분대 돌파전';
    $('mission-hint').textContent=campaign?'영웅이 출격하면 세 동료가 편성한 자리에서 함께 싸웁니다.':editingStop?
      '동료를 교대하거나 계약·보급에서 인장을 쓰세요. 같은 작전의 남은 목숨과 폭탄을 이어갑니다.':
      '6성 아르콘과 출발합니다. 매 전투 뒤 보상 하나를 고르고, 42스테이지에서 악몽분대장과 맞섭니다.';
    $('launch').hidden=campaign;$('native-launch').hidden=!campaign;$('native-back').hidden=!campaign;
    $('launch').textContent=editingStop?'보상 선택으로 돌아가기 →':suspended?locale.text('스테이지 {n} 이어하기').replace('{n}',stage)+' →':'40스테이지 새 원정 →';
    $('expedition').hidden=campRest || editingStop;
    $('expedition').textContent=campaign?'42 훈련에서 배치 시험 →':'42스테이지 단독 연습 · 기존 훈련 편대 →';
    $('forge-open').disabled=!!suspended;
    $('lineage-choice').disabled=!!suspended;
    $('hero-choice').disabled=!!underway;$('trial-difficulty').disabled=!!underway;
    if(suspended)$('mission-hint').textContent='저장한 편대와 남은 목숨으로 전투를 이어갑니다.';
    if(editingStop && save.seals>=3 && save.units.archon.stars===6){
      $('mission-hint').textContent='공명 인장 3개를 모았습니다. 계약·보급 › 동료 강화에서 아르콘을 7성으로 올릴 수 있습니다.';
    }
    $('lineage-choice').value=save.lineage;$('lineage-tiny').textContent=lineageNames[save.lineage];
    if(campRest){
      $('native-launch').textContent='정비 마치기';$('native-back').textContent='선택으로 돌아가기';
    }else if(duringSortie) {
      $('native-launch').textContent='다음 스테이지에 적용';
      $('mission-hint').textContent='바꾼 배치는 다음 스테이지부터 적용됩니다. 자동 회피 설정은 전투를 재개하면 바로 반영됩니다.';
    }
    $('hero-choice').value=selectedHero;$('hero-choice').hidden=campaign;$('hero-label').hidden=campaign;
    $('home-auto').checked=autoPilot;
    $('lineage-hint').textContent=lineageInfo[save.lineage];
    const landscape=art.expeditionLandscape || art.background;
    if(landscape)document.documentElement.style.setProperty('--art','url("'+new URL(landscape,document.baseURI).href+'")');
    const cards=[...slots,'reserve'].map(pos=>{
      const kind=kindAt(pos),data=save.units[kind],selected=chosenSlot===pos;
      const b=action('',()=>clickPosition(pos),'position'+(selected?' active':chosenSlot?' destination':''));
      b.disabled=!!suspended;b.dataset.pos=pos;b.dataset.kind=kind;b.setAttribute('aria-pressed',String(selected));
      b.setAttribute('aria-label',positions[pos]+' '+kindNames[kind]+' '+data.stars+'성 '+roles[kind]+(chosenSlot&&!selected?', 여기로 교대':''));
      b.append(node('span',positions[pos],'place'),sprite(kind),node('b',kindNames[kind],'role'),node('span','★ '+data.stars+' · '+roles[kind],'rank'));
      if (pos!=='reserve') {
        const effect=pos==='rear'&&kind==='archer'?'후방 사격 +60%':slotEffects[pos];
        b.append(node('small',effect,'slot-effect'));
      }
      return b;
    });
    $('board').replaceChildren(...cards);
    $('board-help').textContent=chosenSlot?kindNames[kindAt(chosenSlot)]+' · '+describe(kindAt(chosenSlot),chosenSlot)+' 다른 자리를 눌러 교대하세요.':(message||'동료 넷 중 셋이 출격합니다. 두 자리를 차례로 눌러 교대하세요.');
    localize($('home'));
  }
  function clickPosition(pos) {
    if(!chosenSlot || chosenSlot===pos) {
      chosenSlot=chosenSlot===pos ? null : pos;
      message='';
    } else {
      // F.place takes a deployed destination. A tap on the reserve swaps it into the selected seat.
      const target=pos==='reserve'?chosenSlot:pos;
      const kind=kindAt(pos==='reserve'?'reserve':chosenSlot);
      const res=F.place(save,kind,target);
      message=res.ok?kindNames[kind]+' → '+positions[target]+' · '+describe(kind,target):res.message;
      chosenSlot=null;
    }
    home();
    $('board').querySelector('[data-pos="'+pos+'"]').focus({preventScroll:true});
  }
  $('hero-choice').addEventListener('change',()=>{selectedHero=$('hero-choice').value;rememberControls();home();});
  $('trial-difficulty').addEventListener('change',rememberControls);
  $('lineage-choice').addEventListener('change',()=>{const r=F.setLineage(save,$('lineage-choice').value);message=r.message;home();});
  $('home-auto').addEventListener('change',()=>{autoPilot=$('home-auto').checked;rememberControls();});
  $('native-launch').addEventListener('click',event=>{
    const opts={auto:!!autoPilot};
    if(!embedded)window.HapilPartySetAuto?.(opts.auto);
    if(embedded){event.preventDefault();window.parent.postMessage({type:'hapil-party-ready',...opts},location.origin==='null'?'*':location.origin);}
  });
  $('native-back').addEventListener('click',event=>{
    if(embedded){event.preventDefault();window.parent.postMessage({type:'hapil-party-close'},location.origin==='null'?'*':location.origin);}
  });
  function workshopAction(fn) {
    const result=fn();
    message=result?.message||'';
    workshop();
  }
  const reelText = (phrase,values) => locale.text(phrase).replace(/\{(\w+)\}/g,(_,key)=>values[key]);
  function settleReel(fn, moving=[]) {
    if (performance.now()<reelReadyAt) return;
    const result=fn();
    message=result.ok?'':result.message;
    if (result.ok && moving.length) {
      reelReadyAt=performance.now()+(motion.matches?180:450);
    }
    workshop();
    if (result.ok && moving.length) {
      if (!motion.matches) for (const i of moving) {
        $('reels').children[i]?.classList.add('is-rolling');
      }
      window.setTimeout(()=>{
        if(page==='workshop' && tab==='supply' && $('reel-bank')){
          $('reel-bank').disabled=false;
          $('reel-reroll').disabled=$('reel-reroll').dataset.available!=='true';
        }
      },Math.max(0,Math.ceil(reelReadyAt-performance.now())));
    }
    $('reel-help').focus({preventScroll:true});
  }
  function selectReel(kind) {
    // This only previews a recipient. Banking or rolling always takes a separate press.
    const result=F.selectRecipient(save,kind);
    message=result.ok?'':result.message;
    workshop();
  }
  function workshop() {
    $('forge-back').textContent=directRestSupply||nativeRestSupply?'← 선택으로 돌아가기':'← 편대로';
    $('credits').textContent='정비비 '+save.credits;$('seals').textContent='인장 '+save.seals;
    for(const t of ['supply','units','shop']){
      $('pane-'+t).hidden=tab!==t;$('tab-'+t).setAttribute('aria-pressed',String(tab===t));
    }
    $('forge-notice').textContent=message;
    if(tab==='units')renderUnits();
    else if(tab==='shop')renderShop();
    else renderReel();
    localize($('workshop'));
  }
  function renderReel() {
    const r=save.reel, choosing=r.status==='choose', idle=r.status==='idle';
    const pair=F.pairKind(r.symbols), recipient=r.recipient || pair || r.symbols[0];
    const target=choosing?recipient:r.target;
    const held=choosing ? (pair || recipient) : null;
    const single=r.symbols.indexOf(recipient);
    const level=choosing?(recipient===pair?2:1):r.level;
    const help=$('reel-help');
    help.tabIndex=-1;
    if (idle) help.textContent='세 문양이 모두 같으면 해당 동료에게 다음 전투 보급 +3.';
    else if (choosing) help.textContent=pair?'두 문양이 일치했습니다. 확정하거나 나머지 한 칸에 도전하세요.':'문양을 눌러 고정할 동료를 고른 뒤 확정 또는 재회전을 선택하세요.';
    else if (r.spent) help.textContent='보급을 사용했습니다. 새 스테이지 격파 후 다시 회전할 수 있습니다.';
    else if (!level) help.textContent='이번 릴 보급은 0단계입니다.';
    else help.textContent=reelText('다음 전투 · {name} 보급 +{n}',{name:locale.text(kindNames[target]),n:level});

    const reels=$('reels');
    reels.replaceChildren(...[0,1,2].map(i=>{
      const kind=r.symbols[i];
      const fixed=choosing ? kind===held : r.held===i || !!r.heldPair?.includes(i);
      const b=choosing?action('',()=>{
        selectReel(kind);reels.children[i]?.focus({preventScroll:true});
      },'reel'):node('div',undefined,'reel');
      b.dataset.reelIndex=i;b.style.setProperty('--reel-order',i);
      b.classList.toggle('is-match',!!kind && (kind===pair || F.reelLevel(r.symbols)===3));
      b.classList.toggle('is-held',fixed);
      if (choosing) {
        b.setAttribute('aria-pressed',String(recipient===kind));
        b.setAttribute('aria-label',reelText('{n}번 문양 · {name} 선택',{n:i+1,name:locale.text(kindNames[kind])}));
      }
      if(kind)b.append(sprite(kind));else b.append(node('b','—'));
      b.append(node('span',kind?kindNames[kind]:'대기','place'));
      if(fixed)b.append(node('small',choosing?'재회전 시 고정':'고정','reel-hold'));
      return b;
    }));

    const actions=[];
    if(idle) {
      const spin=action('무료 회전',()=>settleReel(()=>F.spin(save),[0,1,2]),'primary');
      spin.id='spin';actions.push(spin);
    } else if(choosing) {
      const recipientLabel=node('label',undefined,'reel-recipient');
      recipientLabel.htmlFor='reel-recipient';
      recipientLabel.append(node('span','확정 보급 대상'));
      const select=node('select');select.id='reel-recipient';
      for(const k of kinds) {
        const rank=k===pair?2:1;
        const opt=node('option',kindNames[k]+' +'+rank+' · '+positions[slotFor(k)]);
        opt.value=k;select.append(opt);
      }
      select.value=recipient;select.addEventListener('change',()=>{selectReel(select.value);$('reel-recipient')?.focus({preventScroll:true});});
      recipientLabel.append(select);actions.push(recipientLabel);
      const options=node('div',undefined,'reel-options');
      const bank=action(reelText('{name} +{n} 확정',{name:locale.text(kindNames[recipient]),n:level}),()=>settleReel(()=>F.bank(save,recipient)),'primary');
      bank.id='reel-bank';bank.disabled=performance.now()<reelReadyAt;options.append(bank);
      const locked=pair || recipient;
      const gamble=action(pair?'두 칸 고정 · 재회전':'한 칸 고정 · 재회전',()=>{
        const open=[0,1,2].filter(i=>r.symbols[i]!==locked);
        settleReel(()=>pair?F.rerollPair(save):F.reroll(save,single),open);
      },'outline',performance.now()<reelReadyAt || !pair && single<0);
      gamble.dataset.available=String(!!pair || single>=0);
      gamble.id='reel-reroll';gamble.setAttribute('aria-describedby','reel-risk');options.append(gamble);
      const risk=node('p',pair?'재회전 결과 · +3 (25%) / +1 (75%)':'재회전 결과 · +3 (1/16) / +1 (9/16) / +0 (6/16)','reel-odds-line small');
      if(pair && pair!==recipient)risk.prepend(locale.text(kindNames[pair])+' · ');
      risk.id='reel-risk';
      actions.push(options,risk);
    }
    if(target && level>0 && !r.spent) {
      const active=slotFor(target)!=='reserve';
      const bonus=node('p',reelText('다음 전투 기본 사격 피해 +{n}%',{n:6*level}),'reel-benefit small');
      if(!active)bonus.append(' · '+locale.text('다음 전투에 쓰려면 대기 동료를 편성하세요.'));
      actions.push(bonus);
      const current=campaign && (campRest || duringSortie) ? E.open('campaign').read() : !campaign?expedition:null;
      if(active && current) {
        const formation=F.battleConfig(save).companions.map(c=>({...c,supply:c.kind===target?level:0}));
        const resonance=E.resonance(current,formation,current.selected);
        if(resonance) {
          const detail=stop.cardText(resonance.cardId,locale.lang).detail;
          actions.push(node('p',locale.text('출격 시 문양 공명')+' · '+detail,'reel-resonance'));
        }
      }
    }
    $('reel-actions').replaceChildren(...actions);
    $('reel-odds').textContent='네 문양은 같은 확률입니다. 첫 회전은 셋 일치 1/16, 둘 일치 9/16, 모두 다름 6/16입니다.';
  }
  function renderUnits(){
    $('unit-picks').replaceChildren(...kinds.map(k=>{const b=action('',()=>{unit=k;message='';workshop();},unit===k?'active':'');b.dataset.kind=k;b.setAttribute('aria-pressed',String(unit===k));b.append(sprite(k),node('b',kindNames[k]+' ★'+save.units[k].stars));return b;}));
    const data=save.units[unit], promo=F.promotion(save,unit), box=node('div',undefined,'readout');
    box.append(node('b',kindNames[unit]+' · '+positions[slotFor(unit)]),node('p',describe(unit,slotFor(unit)),'small'),node('p','보유 '+(unit==='drone'?'설계도 ':'증표 ')+data.copies+' · 장비 +'+data.gear+' · '+promo.text,'small'));
    $('unit-readout').replaceChildren(box);
    const list=[action('확정 승격',()=>workshopAction(()=>F.promote(save,unit)),'primary',!promo.ready)];
    list[0].id='promote';
    if(promo.risky){const b=action('조기 합성 · 50% / 정비비 2',()=>workshopAction(()=>F.promote(save,unit,true)),'outline');b.id='risk-promote';list.push(b);}
    const eq=action('장비 강화 · 정비비 2',()=>workshopAction(()=>F.equip(save,unit)),'outline',data.gear>=2||save.credits<2);eq.id='equip';list.push(eq);
    if(save.vouchers>0&&F.redeem){const b=action('선택 증표 받기 · 남은 '+save.vouchers,()=>workshopAction(()=>F.redeem(save,unit)),'outline');b.id='redeem';list.push(b);}
    $('unit-actions').replaceChildren(...list);
  }
  function renderShop(){
    $('shop-refresh').disabled=save.credits<2;
    $('shop-list').replaceChildren(...save.shop.map(o=>{const row=node('div',undefined,'shop-row');const b=action(o.sold?'구매 완료':'구매 · '+o.cost,()=>workshopAction(()=>F.buy(save,o.id)),'outline',o.sold||o.cost>save.credits);b.dataset.offer=o.id;row.append(node('span',kindNames[o.kind]+' '+(o.kind==='drone'?'설계도':'증표')+' ×'+o.qty),b);return row;}));
  }
  ['supply','units','shop'].forEach(t=>$('tab-'+t).addEventListener('click',()=>{tab=t;message='';workshop();}));
  $('shop-refresh').addEventListener('click',()=>workshopAction(()=>F.refresh(save)));
  $('forge-open').addEventListener('click',()=>{message='';chosenSlot=null;show('workshop');workshop();});
  $('forge-back').addEventListener('click',()=>{
    message='';
    if (directRestSupply){directRestSupply=false;openRest();return;}
    if (nativeRestSupply && embedded){
      window.parent.postMessage({type:'hapil-party-close'},location.origin==='null'?'*':location.origin);return;
    }
    show('home');home();
  });
  function fitArena(){
    const parent=document.querySelector('.stagewell'), box=document.querySelector('.arena-box');
    const w=Math.min(parent.clientWidth,parent.clientHeight*360/520);
    if(w>0){box.style.width=w+'px';box.style.height=(w*520/360)+'px';}
  }
  window.addEventListener('resize',fitArena);
  if(window.ResizeObserver)new ResizeObserver(fitArena).observe(document.querySelector('.stagewell'));
  function clearInput(){held.clear();queued.clear();focusPointer=null;drag=null;$('focus').setAttribute('aria-pressed','false');}
  function checkpoint(){
    if(directPractice || !expedition || !sim || sim.phase!=='battle' || page!=='game')return;
    const current=ledger.read();
    if(current?.id!==expedition.id || current.stage!==gameStage || current.status!=='battle')return;
    const latest=recall('flight');
    if(latest?.id===current.id && latest.stage===gameStage && latest.configId===run.id && latest.world.tick>sim.tick)return;
    // The player array aliases hero/allies. Rebuild the aliases when resuming.
    const {players, ...world}=sim;
    store('flight',{id:expedition.id,stage:gameStage,configId:run.id,world});
    checkpointTick=sim.tick;
  }
  const activeCards = () => expedition?.picks.filter(p=>{
    const card=E.cards[p.card];
    return !card.temporary || p.stage+1===expedition.stage;
  }) || [];
  function start(stage,practice=false){
    directPractice=practice;
    const gear=practice && !campaign ? F.load() : save;
    let config;
    if(practice){run=null;config=F.battleConfig(gear,stage);}
    else{
      run=F.start(gear,stage);
      if(!run.ok){message=run.message;show('home');home();return false;}
      config=run.config;
      config.seed=(expedition.seed ^ Math.imul(stage,2654435761))>>>0;
      config.expedition=true;config.boons=E.effects(expedition,config.companions);config.carry=expedition.carry;
    }
    gameStage=stage;
    const last=practice ? null : recall('flight');
    if(last?.id===expedition?.id && last?.stage===stage && last?.configId===run?.id && last?.world?.phase==='battle'){
      sim=last.world;sim.players=[sim.hero,...sim.allies];Sim.restoreRoles(sim);
    }else sim=Sim.create({...config,hero:practice?selectedHero:expedition.hero,difficulty:practice?$('trial-difficulty').value:expedition.difficulty});
    view=Sim.snapshot(sim);
    paused=false;lastFrame=0;hudTimer=0;previousHud='';checkpointTick=sim.tick;
    $('pause').hidden=true;$('battle-caption').hidden=true;$('stage-tag').textContent=String(stage);$('battle-title').textContent=missions[stage];
    $('retreat').textContent=practice?'정비로 복귀':'저장하고 편대로';
    const labels=practice?[]:activeCards().map(p=>stop.cardText(p.card,locale.lang).name);
    $('applied-pick').hidden=!labels.length;$('applied-pick').textContent=labels.join(' · ');
    $('applied-pick').title=practice?'':activeCards().map(p=>stop.cardText(p.card,locale.lang).detail).join(' · ');
    clearInput();show('game');localize($('game'));hud();draw();checkpoint();
    $('arena').focus({preventScroll:true});return true;
  }
  function openRest(){
    if(expedition?.status!=='rest')return;
    const stage=expedition.stage, id=expedition.id, c=expedition.carry;
    editingStop=false;chosenSlot=null;message='';show('rest');
    stop.open({
      stage,nextStage:stage+1,nextName:locale.text(missions[stage+1]),offers:expedition.offers,
      selected:expedition.selected,picks:expedition.picks,lang:locale.lang,run:expedition,
      companions:F.battleConfig(save,stage+1).companions,reelStatus:save.reel.status,
      summary:locale.text((c?'목숨 '+c.lives+' · 폭탄 '+c.bombs+' · ':'')+'공명 인장 ×'+save.seals),
      forecast:locale.text(stage===40?'양쪽에서 교차하는 탄 뒤에 조준 예고가 뜹니다. 예고를 보고 옆으로 빠지세요.':
        '분대장의 교차 사격이 빨라집니다. 공명 인장 3개로 7성 아르콘의 연계 권능을 열 수 있습니다.'),
      onSelect(card){
        expedition=ledger.select(id,stage,card);
        return expedition?.id===id && expedition.selected===card;
      },
      onWorkshop(){stop.hide();editingStop=true;show('home');home();$('launch').focus({preventScroll:true});},
      onSupply(){
        stop.hide();editingStop=true;directRestSupply=true;tab='supply';show('workshop');workshop();$('forge-back').focus({preventScroll:true});
      },
      onRedraft(){
        const current=ledger.read();
        if(current?.id!==id||current.stage!==stage||current.status!=='rest'||!E.redraftsLeft(current))return false;
        expedition=ledger.redraft(id,stage,F.battleConfig(save).companions.map(ally=>ally.kind));
        if(expedition?.id!==id||expedition.stage!==stage||expedition.status!=='rest'||E.redraftsLeft(expedition))return false;
        openRest();return true;
      },
      onLaunch(card){
        expedition=ledger.choose(id,stage,card);
        if(expedition?.id!==id || expedition.stage!==stage+1 || expedition.status!=='battle')return false;
        stop.close();return start(expedition.stage);
      }
    });
  }
  $('launch').addEventListener('click',()=>{
    if(editingStop){openRest();return;}
    if(!running()){
      expedition=ledger.start({startStage:40,endStage:42,hero:selectedHero,difficulty:$('trial-difficulty').value,auto:autoPilot});
      store('equipment',{owner:expedition.id,data:JSON.stringify(save)});
      save=routeEquipment(expedition.id);store('result',null);
    }
    if(expedition.status==='rest')openRest();else start(expedition.stage);
  });
  $('expedition').addEventListener('click',()=>start(42,true));
  function pilotInput(){
    const axis=(a,b)=>Number(held.has(a)||held.has(b));
    let dx=axis('ArrowRight','KeyD')-axis('ArrowLeft','KeyA'),dy=axis('ArrowDown','KeyS')-axis('ArrowUp','KeyW');
    if(drag&&!dx&&!dy){
      dx=drag.x-view.hero.x;dy=drag.y-view.hero.y;
      const scale=Math.max(4,Math.hypot(dx,dy));dx/=scale;dy/=scale;
    }
    return {dx,dy,auto:autoPilot,focus:!autoPilot&&(focusPointer!==null||held.has('ShiftLeft')||held.has('ShiftRight')),bomb:queued.delete('bomb'),power:queued.delete('power')};
  }
  function draw(){
    (window.PartyRenderer||window.WingRenderer).draw($('arena'),view,{reducedMotion:motion.matches});
  }
  function hud(){
    const h=view.hero,p=view.power,b=view.boss,eligible=h.alive&&h.respawn<=0;
    const percent=Math.max(0,Math.min(100,Math.round(b.hp/b.maxHp*100)));
    const status=h.respawn>0?'재출격 중':(!b.alive?'남은 탄을 피하세요':'');
    const source=[h.lives,h.bombs,autoPilot,h.recovery>0,h.boost>0,eligible,percent,Math.floor(p.charge),p.ready,status,h.fragments,focusPointer!==null||held.has('ShiftLeft')||held.has('ShiftRight')].join('/');
    if(source===previousHud)return;
    previousHud=source;
    $('hero-hp').textContent=locale.text('목숨')+' ♥'+h.lives+(h.fragments?' · '+locale.text('생명 조각')+' '+h.fragments+'/3':'');
    $('flight-mode').textContent=locale.text(autoPilot?'영웅 자동 회피':h.recovery>0?'피격 · 사격 회복 중':h.boost>0?'회피 성공 · 사격 강화':'영웅 직접 조종');
    $('boss-meter').setAttribute('aria-valuenow',String(percent));$('boss-fill').style.transform='scaleX('+(percent/100)+')';
    $('bomb-count').textContent=h.bombs;$('bomb').disabled=!eligible||!h.bombs;
    $('power').querySelector('small').textContent=p.ready?locale.text('준비'):Math.floor(p.charge)+'%';
    $('power').disabled=!p.ready||!eligible||!b.alive;
    if(p.lineage==='neural')$('power').title=locale.text('조준 예고 중에 사용하면 다음 발사를 늦춥니다.');
    else $('power').title=locale.text(lineageInfo[p.lineage]);
    $('focus').disabled=autoPilot||!eligible;
    $('focus').setAttribute('aria-pressed',String(!autoPilot&&(focusPointer!==null||held.has('ShiftLeft')||held.has('ShiftRight'))));
    $('battle-caption').textContent=locale.text(status);$('battle-caption').hidden=!status;
  }
  function showResult(){
    const won=view.phase==='won';
    let reward='';
    if(!directPractice){
      const latest=ledger.read();
      if(latest?.id!==expedition.id || latest.stage!==gameStage || latest.status!=='battle'){
        location.reload();return;
      }
      let result=F.finish(save,run.id,won);
      // Opening another tab can advance the forge revision without changing this sortie.
      if(!result.ok && save.active?.id===run.id)result=F.finish(save,run.id,won);
      if(!result.ok && !(won && save.cleared.includes(gameStage))){location.reload();return;}
      reward=result?.first?result.message:'';
      const h=view.hero;
      const carry={lives:h.lives,maxLives:h.maxLives,bombs:h.bombs,fragments:h.fragments,companions:Sim.carryCompanions(sim),
        hero:selectedHero,difficulty:view.difficulty,auto:autoPilot,charge:view.power.charge,manualEvades:h.evades,powerUses:view.power.used};
      expedition=won ? ledger.clear(expedition.id,gameStage,carry,view.allies.map(ally=>ally.kind)) : ledger.lose(expedition.id,gameStage);
      store('flight',null);
      if(expedition.status==='rest'){
        sim=null;run=null;clearInput();openRest();return;
      }
      const report={id:expedition.id,stage:gameStage,reward,view:{phase:view.phase,hero:h,power:view.power,allies:view.allies}};
      store('result',report);
    }
    finishScreen(reward);
  }
  function finishScreen(reward){
    const won=view.phase==='won';
    show('result');
    $('result-stage').textContent=(directPractice?'단독 훈련 · ':'성장 원정 · ')+gameStage+' · '+missions[gameStage];
    $('result-title').textContent=directPractice?(won?'작전 성공':'영웅 격추'):(won?'3구간 원정 완주':'원정 종료 · 영웅 격추');
    $('result-copy').textContent=directPractice?(won?'적의 마지막 탄막까지 편대와 함께 돌파했습니다.':'영웅의 마지막 목숨을 모두 썼습니다.'):
      (won?'악몽분대장을 격파했습니다. ':'편대가 영웅의 마지막 목숨을 지키지 못했습니다. ')+
      (expedition.picks.length?locale.text('선택한 보상')+' · '+expedition.picks.map(p=>stop.cardText(p.card,locale.lang).name).join(', '):'첫 보급 정거장에 도달하지 못했습니다.');
    const stats=[['남은 목숨',view.hero.lives],['직접 회피',view.hero.evades+'회'],['초능력',view.power.used+'회']];
    $('result-stats').replaceChildren(...stats.map(([label,val])=>{const n=node('div',undefined,'stat');n.append(node('small',label),node('b',String(val)));return n;}));
    $('ally-stats').replaceChildren(...view.allies.map(a=>{
      const row=node('div',undefined,'report-unit');
      const stats={
        archon:'엄호 '+(a.guards||0)+'회 · 스킬 방어 '+(a.skillBlocks||0)+'회',
        drone:'요격 '+a.intercepts+'발 · 보스 피해 '+Math.round(a.dmg),
        archer:'사격 '+a.shotsFired+'발 · 보스 피해 '+Math.round(a.dmg),
        angel:'권능 충전 +'+Math.round(a.chargeGranted||0)+' · 목숨 회복 '+a.rescues+'회'
      };
      row.append(sprite(a.kind),node('span',kindNames[a.kind]+' ★'+a.stars),node('small',stats[a.kind]));
      return row;
    }));
    $('reward-text').textContent=directPractice?'편대 훈련을 마쳤습니다.':(reward?reward+' · ':'')+'다음 원정은 40스테이지에서 새로운 보상 후보로 시작합니다.';
    localize($('result'));sim=null;run=null;clearInput();$('result-home').focus({preventScroll:true});
  }
  $('result-home').addEventListener('click',()=>{
    if(!directPractice && !campaign){store('result',null);save=routeEquipment('ready');}
    message='';chosenSlot=null;show('home');home();$('launch').hidden?$('native-launch').focus({preventScroll:true}):$('launch').focus({preventScroll:true});
  });
  function frame(now){
    requestAnimationFrame(frame);
    if(page!=='game'||paused||!sim){lastFrame=0;return;}
    const dt=lastFrame?Math.min(.075,(now-lastFrame)/1000):0;lastFrame=now;
    if(dt>0){Sim.step(sim,pilotInput(),dt);view=Sim.snapshot(sim);}
    draw();
    hudTimer+=dt;if(hudTimer>.06){hud();hudTimer=0;}
    if(view.phase!=='battle')showResult();
    else if(!directPractice && sim.tick-checkpointTick>=180)checkpoint();
  }
  function pause(){
    if(page!=='game'||paused)return;
    checkpoint();paused=true;clearInput();localize($('pause'));$('pilot-auto').checked=autoPilot;$('pause').hidden=false;$('resume').focus({preventScroll:true});
  }
  function resume(){
    if(!paused)return;
    paused=false;lastFrame=0;$('pause').hidden=true;$('arena').focus({preventScroll:true});
  }
  $('battle-menu').addEventListener('click',pause);$('resume').addEventListener('click',resume);
  $('pilot-auto').addEventListener('change',()=>{autoPilot=$('pilot-auto').checked;rememberControls();clearInput();});
  $('retreat').addEventListener('click',()=>{
    checkpoint();sim=null;run=null;clearInput();paused=false;$('pause').hidden=true;message='정비로 복귀했습니다.';show('home');home();
  });
  const codes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyS','KeyW','KeyD','Space','KeyX','ShiftLeft','ShiftRight']);
  window.addEventListener('keydown',e=>{
    if(page!=='game'||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'){e.preventDefault();if(!e.repeat)(paused?resume:pause)();return;}
    if(paused){
      if(e.key==='Tab'){
        const first=$('pilot-auto'),last=$('retreat');
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
      return;
    }
    if(!codes.has(e.code))return;
    if(e.code==='Space'&&e.target.tagName==='BUTTON')return;
    e.preventDefault();held.add(e.code);
    if(!e.repeat){if(e.code==='Space')queued.add('bomb');if(e.code==='KeyX')queued.add('power');}
  });
  window.addEventListener('keyup',e=>{if(held.delete(e.code)&&page==='game')e.preventDefault();});
  window.addEventListener('blur',()=>{if(page==='game')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&page==='game')pause();});
  const arena=$('arena');
  arena.addEventListener('pointerdown',e=>{
    if(paused||drag||autoPilot||!view?.hero.alive||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();arena.setPointerCapture(e.pointerId);drag={id:e.pointerId,px:e.clientX,py:e.clientY,x:view.hero.x,y:view.hero.y};
  });
  arena.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const scale=360/Math.max(1,arena.getBoundingClientRect().width);
    drag.x=Math.max(5,Math.min(355,drag.x+(e.clientX-drag.px)*scale));
    drag.y=Math.max(5,Math.min(515,drag.y+(e.clientY-drag.py)*scale));drag.px=e.clientX;drag.py=e.clientY;
  });
  for(const t of ['pointerup','pointercancel','lostpointercapture'])arena.addEventListener(t,e=>{if(drag?.id===e.pointerId)drag=null;});
  $('focus').addEventListener('pointerdown',e=>{if(!paused&&!autoPilot&&focusPointer===null){e.preventDefault();$('focus').setPointerCapture(e.pointerId);focusPointer=e.pointerId;}});
  for(const t of ['pointerup','pointercancel','lostpointercapture'])$('focus').addEventListener(t,e=>{if(focusPointer===e.pointerId)focusPointer=null;});
  $('focus').addEventListener('click',e=>{if(!e.detail&&!autoPilot)focusPointer=focusPointer==='keyboard'?null:'keyboard';});
  $('power').addEventListener('click',()=>{if(!paused)queued.add('power');});
  $('bomb').addEventListener('click',()=>{if(!paused)queued.add('bomb');});
  window.addEventListener('pagehide',checkpoint);
  home();localize(document.body);
  const report=campaign?null:recall('result');
  if(nativeRestSupply){show('workshop');workshop();}
  else if(expedition?.status==='rest')openRest();
  else if(report && expedition?.id===report.id && ['won','lost'].includes(expedition.status)){
    view=report.view;gameStage=report.stage;finishScreen(report.reward);
  }
  requestAnimationFrame(frame);
})();
