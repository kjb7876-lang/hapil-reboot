/* Shared between campaign sorties and the standalone expedition. The run ledger owns the rewards. */
(function (root) {
  'use strict';
  const languages = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant', 'es', 'pt-BR'];
  const words = {
    cleared: ['STAGE {n} 클리어','Stage {n} cleared','ステージ{n}クリア','第 {n} 关已通过','第 {n} 關已通過','Fase {n} superada','Fase {n} concluída'],
    title: ['편대 정비','Regroup','編隊整備','编队整备','編隊整備','Reagrupar','Reagrupar'],
    next: ['다음 전투','Next encounter','次の戦闘','下一场战斗','下一場戰鬥','Próximo combate','Próximo combate'],
    choice: ['보상 하나 선택','Choose one reward','報酬をひとつ選択','选择一项奖励','選擇一項獎勵','Elige una recompensa','Escolha uma recompensa'],
    expedition: ['이번 원정','This run','遠征中','本轮远征','本輪遠征','Esta expedición','Nesta expedição'],
    nextOnly: ['다음 전투만','Next stage only','次の戦闘のみ','仅下场战斗','僅下場戰鬥','Solo la siguiente fase','Só na próxima fase'],
    owned: ['보유 효과 {n}종','Active upgrades ({n})','獲得効果（{n}種）','已有效果（{n}种）','已有效果（{n}種）','Mejoras activas ({n})','Melhorias ativas ({n})'],
    workshop: ['편성 · 보급','Formation & supplies','編成・補給','编队与补给','編隊與補給','Formación y suministros','Formação e suprimentos'],
    launch: ['{n}스테이지 출격','Start stage {n}','ステージ{n}へ','进入第 {n} 关','進入第 {n} 關','Iniciar fase {n}','Iniciar fase {n}'],
    failure: ['현재 원정 상태를 확인한 뒤 다시 선택하세요.','Check this run and try your selection again.','遠征の状態を確認し、もう一度選んでください。','请确认远征状态并重新选择。','請確認遠征狀態並重新選擇。','Comprueba el estado de la expedición y vuelve a elegir.','Confira o estado da expedição e escolha novamente.']
  };
  const rewards = {
    'archer-string': {
      role:'archer',
      label:['별빛 활시위','Starlight bowstring','星明かりの弓弦','星光弓弦','星光弓弦','Cuerda estelar','Corda estelar'],
      effect:['성궁수의 화살 피해 +12%','Star Archer arrow damage +12%','星弓の射手の矢の威力 +12%','星弓手的箭矢伤害 +12%','星弓手的箭矢傷害 +12%','Daño de las flechas de la arquera estelar +12%','Dano das flechas da arqueira estelar +12%']
    },
    'supply-quiver': {
      role:'archer',
      label:['은빛 화살통','Silver quiver','銀の矢筒','银色箭袋','銀色箭袋','Carcaj de plata','Aljava de prata'],
      effect:['성궁수의 화살 피해 +24%','Star Archer arrow damage +24%','星弓の射手の矢の威力 +24%','星弓手的箭矢伤害 +24%','星弓手的箭矢傷害 +24%','Daño de las flechas de la arquera estelar +24%','Dano das flechas da arqueira estelar +24%']
    },
    'drone-coil': {
      role:'drone',
      label:['동력 코일','Drive coil','動力コイル','动力线圈','動力線圈','Bobina motriz','Bobina motriz'],
      effect:['드론 사격 피해 +12%','Drone shot damage +12%','ドローンの射撃ダメージ +12%','无人机射击伤害 +12%','無人機射擊傷害 +12%','Daño de disparo del dron +12%','Dano de tiro do drone +12%']
    },
    'archon-clock': {
      role:'archon',
      label:['예지 회로','Foresight circuit','予知回路','预知回路','預知迴路','Circuito de previsión','Circuito de previsão'],
      effect:['아르콘 지원 기술 대기시간 −8%','Archon support cooldown −8%','アルコン支援の再使用時間 −8%','执政官支援技能冷却 −8%','執政官支援技能冷卻 −8%','Recarga del apoyo del arconte −8%','Recarga do apoio do arconte −8%']
    },
    'angel-ward': {
      role:'angel',
      label:['수호 깃털','Guardian feather','守護の羽','守护之羽','守護之羽','Pluma guardiana','Pena guardiã'],
      effect:['천사 방어막이 탄 1발을 더 막습니다.','Each angel shield blocks 1 extra shot.','天使の障壁が防ぐ弾数 +1','天使的护盾可额外挡住 1 发子弹。','天使的護盾可額外擋住 1 發子彈。','Cada escudo del ángel bloquea 1 disparo más.','Cada escudo do anjo bloqueia mais 1 disparo.']
    },
    'power-cell': {
      role:'hero',
      label:['공명 축전지','Resonance cell','共鳴蓄電池','共鸣电池','共鳴電池','Batería de resonancia','Bateria de ressonância'],
      effect:['영웅 권능 충전 속도 +12%','Hero power recharge +12%','英雄の権能チャージ速度 +12%','英雄权能充能速度 +12%','英雄權能充能速度 +12%','Velocidad de carga del poder +12%','Velocidade de recarga do poder +12%']
    },
    'recall-beacon': {
      role:'party',
      label:['귀환 봉화','Recall beacon','帰還の灯火','归队信标','歸隊信標','Baliza de retorno','Sinalizador de retorno'],
      effect:['격추된 동료의 복귀 시간 −12%','Downed allies return 12% sooner.','撃墜された仲間の復帰時間 −12%','被击落的同伴归队时间 −12%','被擊落的夥伴歸隊時間 −12%','Los aliados caídos regresan un 12% antes.','Aliados abatidos retornam 12% mais cedo.']
    },
    'pilot-ribbon': {
      role:'hero',
      label:['조종사의 매듭','Pilot’s knot','操縦士の結び紐','驾驶员之结','駕駛員之結','Nudo de piloto','Nó do piloto'],
      effect:['수동 회피로 얻은 사격 강화가 0.5초 더 지속됩니다.','Manual dodge boosts last 0.5 s longer.','手動回避後の射撃強化が0.5秒延長','手动闪避后射击强化延长 0.5 秒。','手動閃避後射擊強化延長 0.5 秒。','La mejora por esquiva manual dura 0,5 s más.','O bônus de esquiva manual dura mais 0,5 s.']
    },
    'supply-ammo': {
      role:'drone',
      label:['관통 탄창','Piercing magazine','貫通弾倉','穿甲弹匣','穿甲彈匣','Cargador perforante','Carregador perfurante'],
      effect:['드론 사격 피해 +24%','Drone shot damage +24%','ドローンの射撃ダメージ +24%','无人机射击伤害 +24%','無人機射擊傷害 +24%','Daño de disparo del dron +24%','Dano de tiro do drone +24%']
    },
    'supply-charge': {
      role:'hero',
      label:['예비 전지','Reserve cell','予備電池','备用电池','備用電池','Batería de reserva','Bateria reserva'],
      effect:['영웅 권능 충전 속도 +24%','Hero power recharge +24%','英雄の権能チャージ速度 +24%','英雄权能充能速度 +24%','英雄權能充能速度 +24%','Velocidad de carga del poder +24%','Velocidade de recarga do poder +24%']
    },
    'supply-clock': {
      role:'archon',
      label:['예지 동력팩','Foresight power pack','予知パワーパック','预知能源包','預知能源包','Carga de previsión','Carga de previsão'],
      effect:['아르콘 지원 기술 대기시간 −16%','Archon support cooldown −16%','アルコン支援の再使用時間 −16%','执政官支援技能冷却 −16%','執政官支援技能冷卻 −16%','Recarga del apoyo del arconte −16%','Recarga do apoio do arconte −16%']
    },
    'supply-beacon': {
      role:'party',
      label:['구조 신호탄','Rescue flare','救難信号弾','救援信号弹','救援信號彈','Bengala de rescate','Sinal de resgate'],
      effect:['격추된 동료의 복귀 시간 −24%','Downed allies return 24% sooner.','撃墜された仲間の復帰時間 −24%','被击落的同伴归队时间 −24%','被擊落的夥伴歸隊時間 −24%','Los aliados caídos regresan un 24% antes.','Aliados abatidos retornam 24% mais cedo.']
    },
    'supply-ribbon': {
      role:'hero',
      label:['집중 패치','Focus patch','集中パッチ','专注贴片','專注貼片','Parche de concentración','Adesivo de foco'],
      effect:['수동 회피로 얻은 사격 강화가 1초 더 지속됩니다.','Manual dodge boosts last 1 s longer.','手動回避後の射撃強化が1秒延長','手动闪避后射击强化延长 1 秒。','手動閃避後射擊強化延長 1 秒。','La mejora por esquiva manual dura 1 s más.','O bônus de esquiva manual dura mais 1 s.']
    },
    'supply-ward': {
      role:'angel',
      label:['수호 부적','Ward charm','守護のお守り','守护符','守護符','Talismán protector','Talismã protetor'],
      effect:['천사 방어막이 탄 1발을 더 막습니다.','Each angel shield blocks 1 extra shot.','天使の障壁が防ぐ弾数 +1','天使的护盾可额外挡住 1 发子弹。','天使的護盾可額外擋住 1 發子彈。','Cada escudo del ángel bloquea 1 disparo más.','Cada escudo do anjo bloqueia mais 1 disparo.']
    }
  };
  const fallbackArt = {
    archon:'media/arcade-v43-party/archon.webp', drone:'media/arcade-v43-party/drone.webp',
    angel:'media/arcade-v43-party/angel.webp', archer:'media/arcade-v43-party/archer.webp', memory:'media/gunner.webp'
  };
  const doc = root.document;
  let dialog = null;
  function node(tag, className, value) {
    const e = doc.createElement(tag);
    e.className = className;
    if (value !== undefined) e.textContent = value;
    return e;
  }
  function hide() {
    if (dialog?.open) dialog.close();
  }
  function close() {
    hide();
    if (dialog) dialog.remove();
    dialog = null;
  }
  function artwork(role) {
    const icon = node('span','pstop-art pstop-art-' + role);
    icon.setAttribute('aria-hidden','true');
    const members = role === 'party' ? ['archon','drone','angel'] : [role === 'hero' ? 'memory' : role];
    for (const key of members) {
      const image = node('img','');
      image.alt = '';
      image.src = root.PARTY_ART?.[key] || fallbackArt[key];
      icon.append(image);
    }
    return icon;
  }
  function open(options) {
    close();
    const data = options || {};
    const idOf = card => typeof card === 'string' ? card : card?.id;
    const offers = (data.offers || []).map(idOf).filter(id => Object.hasOwn(rewards,id));
    const col = Math.max(0,languages.indexOf(data.lang || root.HapilI18n?.lang || doc.documentElement.lang));
    const text = (key, n) => words[key][col].replace('{n}',String(n));
    const shell = dialog = node('dialog','pstop');
    shell.id = 'party-stop-dialog';
    shell.lang = languages[col];
    shell.setAttribute('aria-labelledby','party-stop-title');
    shell.addEventListener('cancel', event => event.preventDefault());
    // Prevent a key intended for the modal from reaching the battle beneath it.
    shell.addEventListener('keydown', event => { event.stopPropagation(); });
    shell.addEventListener('keyup', event => { event.stopPropagation(); });
    const panel = node('div','pstop-panel');
    const content = node('div','pstop-content');
    const status = node('p','pstop-cleared',text('cleared',data.stage));
    const title = node('h1','pstop-title',text('title'));
    title.tabIndex = -1;
    title.id = 'party-stop-title';
    content.append(status,title);
    if (typeof data.summary === 'string' && data.summary) content.append(node('p','pstop-summary',data.summary));
    const next = node('section','pstop-next');
    next.id = 'party-stop-forecast';
    next.append(node('span','pstop-next-label',text('next')));
    const destination = node('div','pstop-destination');
    destination.append(node('span','pstop-stage',String(data.nextStage).padStart(2,'0')),node('strong','pstop-target',data.nextName || ''));
    next.append(destination);
    if (typeof data.forecast === 'string' && data.forecast) next.append(node('p','pstop-brief',data.forecast));
    content.append(next);
    const legend = node('h2','pstop-legend',text('choice'));
    legend.id = 'party-stop-legend';
    const choices = node('div','pstop-choices');
    choices.setAttribute('role','group');
    choices.setAttribute('aria-labelledby',legend.id);
    content.append(legend,choices);
    let selected = offers.includes(data.selected) ? data.selected : null;
    const ranks = Object.assign({},data.boons || {});
    if (!data.boons) for (const pick of data.picks || []) {
      if (pick.card && !pick.card.startsWith('supply-')) ranks[pick.card] = (ranks[pick.card] || 0) + 1;
    }
    const footer = node('div','pstop-actions');
    const edit = node('button','pstop-workshop',text('workshop'));
    edit.type = 'button'; edit.id = 'party-stop-workshop';
    const launch = node('button','pstop-launch',text('launch',data.nextStage));
    launch.type = 'button'; launch.id = 'party-stop-launch';
    const notice = node('p','pstop-notice');
    notice.setAttribute('role','status');
    notice.hidden = true;
    let busy = false;
    const report = () => { notice.textContent = text('failure'); notice.hidden = false; };
    function paint() {
      for (const button of choices.children) {
        button.setAttribute('aria-pressed',String(button.dataset.partyCard === selected));
        button.disabled = busy;
      }
      launch.disabled = !selected || busy;
      edit.disabled = busy;
    }
    for (const id of offers) {
      const info = rewards[id];
      const button = node('button','pstop-choice');
      button.type = 'button'; button.dataset.partyCard = id;
      const lines = node('span','pstop-card-copy');
      const top = node('span','pstop-card-top');
      top.append(node('b','pstop-card-name',info.label[col]));
      top.append(node('small','pstop-scope',text(id.startsWith('supply-') ? 'nextOnly' : 'expedition')));
      lines.append(top,node('span','pstop-effect',info.effect[col]));
      button.append(artwork(info.role),lines,node('span','pstop-radio'));
      button.addEventListener('click', () => {
        if (busy || id === selected) return;
        const result = data.onSelect?.(id);
        if (result === false || result?.ok === false) { report(); return; }
        selected = id; notice.hidden = true; paint();
      });
      choices.append(button);
    }
    const active = Object.keys(rewards).filter(id => !id.startsWith('supply-') && ranks[id] > 0);
    if (active.length) {
      const owned = node('details','pstop-owned'); owned.id = 'party-stop-owned';
      owned.append(node('summary','',text('owned',active.length)));
      const list = node('ul','pstop-owned-list');
      for (const id of active) list.append(node('li','',rewards[id].label[col]+' ×'+ranks[id]));
      owned.append(list); content.append(owned);
    }
    if (typeof data.onWorkshop === 'function') {
      edit.addEventListener('click',() => { if (!busy) data.onWorkshop(); });
      footer.append(edit);
    }
    launch.addEventListener('click', async () => {
      if (!selected || busy) return;
      busy = true; notice.hidden = true; paint();
      try {
        const result = await data.onLaunch?.(selected);
        if (result === false || result?.ok === false) {busy = false; paint(); report();}
      } catch (err) {
        busy = false; paint(); report();
        root.console?.error(err);
      }
    });
    footer.append(launch); content.append(notice);
    panel.append(content,footer); shell.append(panel); doc.body.append(shell);
    paint(); shell.showModal(); title.focus({preventScroll:true});
  }
  function cardText(id, lang) {
    const info = rewards[id];
    if (!Object.hasOwn(rewards,id)) return null;
    const col = Math.max(0,languages.indexOf(lang));
    return {name:info.label[col],detail:info.effect[col]};
  }
  root.HapilPartyStop = {open,hide,close,cardText,visible:() => !!dialog?.open};
})(window);
