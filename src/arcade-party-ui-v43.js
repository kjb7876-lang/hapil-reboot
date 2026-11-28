(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const F = window.PartyForge, Sim = window.WingSim;
  const art = window.PARTY_ART || {};
  const kindNames = {archon:'아르콘',drone:'드론',angel:'천사'};
  const slots = ['front','wing','rear'], kinds = ['archon','drone','angel'];
  const positions = {front:'전방',wing:'측면',rear:'후방'};
  const lineageNames = {time:'시간 제어',gravity:'중력 제어',neural:'신경계 제어'};
  const lineageInfo = {time:'시간 제어는 접근하는 적탄을 늦춥니다.',gravity:'중력 제어는 적탄의 경로를 휘게 합니다.',neural:'신경계 제어는 적의 다음 발사 명령을 늦춥니다.'};
  const roles = {archon:'탄막 제어',drone:'공격·요격',angel:'방어막·회복'};
  const missions = {40:'차단선 훈련',41:'교차 사격 훈련',42:'악몽분대장'};
  const campaign = new URLSearchParams(location.search).get('campaign') === '1' && !!F.loadCampaign;
  const save = campaign ? F.loadCampaign() : F.load();
  const embedded = window.parent !== window;
  const duringSortie = campaign && new URLSearchParams(location.search).get('during') === '1';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let page = 'home', chosenSlot = null, unit = 'archon', tab = 'supply';
  let message = '', run = null, sim = null, view = null, gameStage = 42;
  let paused = false, autoPilot = campaign && typeof window.HapilPartyPilotAuto === 'function' && !!window.HapilPartyPilotAuto();
  let selectedHero = 'memory', held = new Set(), queued = new Set(), drag = null, focusPointer = null;
  let lastFrame = 0, hudTimer = 0, previousHud = '', directPractice = false;
  const node = (tag, text, className) => {const n=document.createElement(tag);if(text !== undefined)n.textContent=text;if(className)n.className=className;return n;};
  const action = (label, fn, cls, disabled=false) => {const b=node('button',label,cls);b.disabled=disabled;b.addEventListener('click',fn);return b;};
  const localize = element => {if(campaign && window.PartyWorkshopI18n)window.PartyWorkshopI18n.apply(element);};
  const sprite = (kind, cls='portrait') => {const img=node('img',undefined,cls);img.alt='';const src=art[kind];if(src)img.src=src;else img.hidden=true;return img;};
  const show = id => {
    page=id;
    ['home','workshop','game','result'].forEach(k=>{$(k).hidden=k!==id;});
    if(id==='game')fitArena();
    else window.scrollTo(0,0);
  };
  const describe = (kind,slot) => String(Sim.describe(F.preview(save,kind,slot)) || roles[kind]);
  const slotFor = kind => slots.find(pos=>save.board[pos]===kind);
  function home() {
    const stage=campaign ? 42 : save.stage;
    $('mission-label').textContent=campaign?'스토리 모드 · 편대 원정':'편대 훈련 · 스테이지 42';
    $('home-title').textContent=campaign?'편대 준비':'악몽분대장';
    $('mission-hint').textContent=campaign?'영웅이 출격하면 세 동료가 편성한 자리에서 함께 싸웁니다.':'깃창이 가리키는 탄길을 읽고, 동료 셋과 분대장을 돌파하세요.';
    $('launch').hidden=campaign;$('native-launch').hidden=!campaign;$('native-back').hidden=!campaign;
    $('expedition').textContent=campaign?'42 훈련에서 배치 시험 →':(save.cleared?.includes(42)?'원정 마지막 전투 다시 도전 →':'성장 원정 진행 · '+stage+' '+missions[stage]+' →');
    $('lineage-choice').value=save.lineage;$('lineage-tiny').textContent=lineageNames[save.lineage];
    if(duringSortie) {
      $('native-launch').textContent='다음 스테이지에 적용';
      $('mission-hint').textContent='바꾼 배치는 다음 스테이지부터 적용됩니다. 자동 회피 설정은 전투를 재개하면 바로 반영됩니다.';
    }
    $('hero-choice').value=selectedHero;$('hero-choice').hidden=campaign;$('hero-label').hidden=campaign;
    $('home-auto').checked=autoPilot;
    $('lineage-hint').textContent=lineageInfo[save.lineage];
    const heroArt=art[campaign?'angel':selectedHero]||art.memory;
    if(art.background)document.documentElement.style.setProperty('--art','url("'+new URL(art.background,document.baseURI).href+'")');
    if(heroArt)document.documentElement.style.setProperty('--actor','url("'+new URL(heroArt,document.baseURI).href+'")');
    const cards=slots.map(pos=>{
      const kind=save.board[pos],data=save.units[kind],selected=chosenSlot===pos;
      const b=action('',()=>clickPosition(pos),'position'+(selected?' active':chosenSlot?' destination':''));
      b.dataset.pos=pos;b.setAttribute('aria-pressed',String(selected));
      b.setAttribute('aria-label',positions[pos]+' '+kindNames[kind]+' '+data.stars+'성 '+roles[kind]+(chosenSlot&&!selected?', 여기로 교대':''));
      b.append(node('span',positions[pos],'place'),sprite(kind),node('b',kindNames[kind],'role'),node('span','★ '+data.stars+' · '+roles[kind],'rank'),node('small',({front:'지원 대기 −25%',wing:'사격 피해 +45%',rear:'권능 충전 +20%'})[pos],'slot-effect'));
      return b;
    });
    $('board').replaceChildren(...cards);
    $('board-help').textContent=chosenSlot?kindNames[save.board[chosenSlot]]+' · '+describe(save.board[chosenSlot],chosenSlot)+' 다른 자리를 눌러 교대하세요.':(message||'동료를 누르고 옮길 자리를 선택하세요.');
    localize($('home'));
  }
  function clickPosition(pos) {
    if(!chosenSlot){chosenSlot=pos;message='';home();return;}
    if(chosenSlot===pos){chosenSlot=null;message='';home();return;}
    const kind=save.board[chosenSlot];
    const res=F.place(save,kind,pos);
    chosenSlot=null;message=res.ok?kindNames[kind]+' → '+positions[pos]+' · '+describe(kind,pos):res.message;
    home();
  }
  $('hero-choice').addEventListener('change',()=>{selectedHero=$('hero-choice').value;home();});
  $('lineage-choice').addEventListener('change',()=>{const r=F.setLineage(save,$('lineage-choice').value);message=r.message;home();});
  $('home-auto').addEventListener('change',()=>{autoPilot=$('home-auto').checked;});
  $('native-launch').addEventListener('click',event=>{
    const opts={auto:!!autoPilot};
    if(typeof window.HapilPartyActivate==='function')window.HapilPartyActivate(opts);
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
  function unitChooser(after,label) {
    const group=node('div',undefined,'reel-option');
    for(const k of kinds)group.append(action(label(k),()=>workshopAction(()=>after(k)),'outline'));
    return group;
  }
  function workshop() {
    $('credits').textContent='정비비 '+save.credits;$('seals').textContent='인장 '+save.seals;
    for(const t of ['supply','units','shop']){
      $('pane-'+t).hidden=tab!==t;$('tab-'+t).setAttribute('aria-pressed',String(tab===t));
    }
    $('forge-notice').textContent=message;
    if(tab==='units'){renderUnits();localize($('workshop'));return;}
    if(tab==='shop'){renderShop();localize($('workshop'));return;}
    const r=save.reel;
    $('reel-help').textContent=r.spent?'보급을 사용했습니다. 새 스테이지 격파 후 다시 회전할 수 있습니다.':r.status==='idle'?'다음 전투에서 한 동료가 쓸 보급을 정합니다. 세 릴을 무료로 한 번 돌리세요.':r.status==='choose'?'확정 +1을 받을 동료를 선택하거나, 문양 한 칸을 고정해 나머지 두 칸을 다시 돌리세요.':(r.level>0?kindNames[r.target]+' 보급 +'+r.level+' · 다음 전투에 투입합니다.':'이번 릴 보급은 0단계입니다.');
    $('reels').replaceChildren(...[0,1,2].map(i=>{
      const k=r.symbols?.[i], name=kindNames[k]||k;
      const b=r.status==='choose'?action('',()=>workshopAction(()=>F.reroll(save,i)),'reel'):node('div',undefined,'reel');
      if(r.status==='choose')b.setAttribute('aria-label',(i+1)+'번째 '+name+' 고정 후 재회전');
      if(k)b.append(sprite(k));else b.append(node('b','—'));
      b.append(node('span',k?(name+(r.status==='choose'?' 고정':'')):'대기','place'));
      return b;
    }));
    const actions=[];
    if(r.status==='idle'){const b=action('무료 회전',()=>workshopAction(()=>F.spin(save)),'primary');b.id='spin';actions.push(b);}
    else if(r.status==='choose')actions.push(unitChooser(k=>F.bank(save,k),k=>kindNames[k]+' +1'));
    $('reel-actions').replaceChildren(...actions);localize($('workshop'));
  }
  function renderUnits(){
    $('unit-picks').replaceChildren(...kinds.map(k=>{const b=action('',()=>{unit=k;message='';workshop();},unit===k?'active':'');b.dataset.kind=k;b.append(sprite(k),node('b',kindNames[k]+' ★'+save.units[k].stars));return b;}));
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
  $('forge-back').addEventListener('click',()=>{message='';show('home');home();});
  function fitArena(){
    const parent=document.querySelector('.stagewell'), box=document.querySelector('.arena-box');
    const w=Math.min(parent.clientWidth,parent.clientHeight*360/520);
    if(w>0){box.style.width=w+'px';box.style.height=(w*520/360)+'px';}
  }
  window.addEventListener('resize',fitArena);
  if(window.ResizeObserver)new ResizeObserver(fitArena).observe(document.querySelector('.stagewell'));
  function clearInput(){held.clear();queued.clear();focusPointer=null;drag=null;$('focus').setAttribute('aria-pressed','false');}
  function start(stage){
    let config;
    directPractice=campaign;
    if(directPractice){run=null;config=F.battleConfig(save,stage);}
    else{
      run=F.start(save,stage);
      if(!run.ok){message=run.message;home();return;}
      config=run.config;
    }
    gameStage=stage;
    sim=Sim.create({...config,hero:selectedHero,difficulty:$('trial-difficulty').value});
    view=Sim.snapshot(sim);
    paused=false;lastFrame=0;hudTimer=0;previousHud='';
    $('pause').hidden=true;$('battle-caption').hidden=true;$('stage-tag').textContent=String(stage);$('battle-title').textContent=missions[stage];
    clearInput();show('game');hud();draw();
    $('arena').focus({preventScroll:true});
  }
  $('launch').addEventListener('click',()=>start(42));
  $('expedition').addEventListener('click',()=>start(campaign?42:save.stage));
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
    $('hero-hp').textContent='목숨 ♥'+h.lives+(h.fragments?' · 생명 조각 '+h.fragments+'/3':'');
    $('flight-mode').textContent=autoPilot?'영웅 자동 회피':h.recovery>0?'피격 · 사격 회복 중':h.boost>0?'회피 성공 · 사격 강화':'영웅 직접 조종';
    $('boss-meter').setAttribute('aria-valuenow',String(percent));$('boss-fill').style.transform='scaleX('+(percent/100)+')';
    $('bomb-count').textContent=h.bombs;$('bomb').disabled=!eligible||!h.bombs;
    $('power').querySelector('small').textContent=p.ready?'준비':Math.floor(p.charge)+'%';
    $('power').disabled=!p.ready||!eligible||!b.alive;
    if(p.lineage==='neural')$('power').title='조준 예고 중에 사용하면 다음 발사를 늦춥니다.';
    else $('power').title=lineageInfo[p.lineage];
    $('focus').disabled=autoPilot||!eligible;
    $('focus').setAttribute('aria-pressed',String(!autoPilot&&(focusPointer!==null||held.has('ShiftLeft')||held.has('ShiftRight'))));
    $('battle-caption').textContent=status;$('battle-caption').hidden=!status;
  }
  function showResult(){
    const won=view.phase==='won';
    const outcome=run?F.finish(save,run.id,won):null;
    show('result');
    $('result-stage').textContent=gameStage+' · '+missions[gameStage];
    $('result-title').textContent=won?'작전 성공':'영웅 격추';
    $('result-copy').textContent=won?'적의 마지막 탄막까지 편대와 함께 돌파했습니다.':'영웅의 마지막 목숨을 모두 썼습니다. 동료 배치를 바꿔 다시 도전할 수 있습니다.';
    const stats=[['남은 목숨',view.hero.lives],['직접 회피',view.hero.evades+'회'],['초능력',view.power.used+'회']];
    $('result-stats').replaceChildren(...stats.map(([label,val])=>{const n=node('div',undefined,'stat');n.append(node('small',label),node('b',String(val)));return n;}));
    $('ally-stats').replaceChildren(...view.allies.map(a=>{
      const row=node('div',undefined,'report-unit');
      const role=a.kind==='angel'?'방벽 '+a.blocks+'발 · 목숨 회복 '+a.rescues+'회':a.kind==='drone'?'요격 '+a.intercepts+'발 · 보스 피해 '+Math.round(a.dmg):'감속 '+a.slowed+'발 · 견인 '+a.redirected+'발 · 발사 지연 '+a.delayed+'회';
      row.append(sprite(a.kind),node('span',kindNames[a.kind]+' ★'+a.stars),node('small',role));
      return row;
    }));
    $('reward-text').textContent=outcome?outcome.message:'편대 훈련을 마쳤습니다.';
    localize($('result'));sim=null;run=null;clearInput();$('result-home').focus({preventScroll:true});
  }
  $('result-home').addEventListener('click',()=>{message='';chosenSlot=null;show('home');home();$('launch').hidden?$('native-launch').focus({preventScroll:true}):$('launch').focus({preventScroll:true});});
  function frame(now){
    requestAnimationFrame(frame);
    if(page!=='game'||paused||!sim){lastFrame=0;return;}
    const dt=lastFrame?Math.min(.075,(now-lastFrame)/1000):0;lastFrame=now;
    if(dt>0){Sim.step(sim,pilotInput(),dt);view=Sim.snapshot(sim);}
    draw();
    hudTimer+=dt;if(hudTimer>.06){hud();hudTimer=0;}
    if(view.phase!=='battle')showResult();
  }
  function pause(){
    if(page!=='game'||paused)return;
    paused=true;clearInput();localize($('pause'));$('pilot-auto').checked=autoPilot;$('pause').hidden=false;$('resume').focus({preventScroll:true});
  }
  function resume(){
    if(!paused)return;
    paused=false;lastFrame=0;$('pause').hidden=true;$('arena').focus({preventScroll:true});
  }
  $('battle-menu').addEventListener('click',pause);$('resume').addEventListener('click',resume);
  $('pilot-auto').addEventListener('change',()=>{autoPilot=$('pilot-auto').checked;clearInput();});
  $('retreat').addEventListener('click',()=>{
    if(run)F.finish(save,run.id,false);sim=null;run=null;clearInput();paused=false;$('pause').hidden=true;message='정비로 복귀했습니다.';show('home');home();
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
  home();localize(document.body);requestAnimationFrame(frame);
})();
