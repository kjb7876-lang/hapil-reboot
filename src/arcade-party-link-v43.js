/* Shares the companion workshop with the single-player campaign and its pause menu. */
(function (root) {
  'use strict';
  const prefKey = 'hapil.arcade.party-controls.v1';
  const modes = ['gentle','normal','hell','handicap'];
  let difficulty = 'normal', choices = {}, automatic = false;
  function readPrefs() {
    try {
      const saved = JSON.parse(root.localStorage.getItem(prefKey)) || {};
      choices = {};
      for (const mode of modes) {
        const value = saved.choices ? saved.choices[mode] : saved.enabled;
        if (typeof value === 'boolean') choices[mode] = value;
      }
      automatic = saved.auto === true;
    } catch (_) { /* Private browsing can still use the current session. */ }
  }
  function savePrefs() {
    try { root.localStorage.setItem(prefKey, JSON.stringify({choices, auto:automatic})); }
    catch (_) { /* Keep the in-memory preference. */ }
  }
  readPrefs();
  const enabled = () => choices[difficulty] ?? difficulty === 'hell';
  const forge = root.PartyForge;
  let ledger = null;
  function profile() {
    // The store reconciles its revision on each mutating operation.
    if (!ledger) ledger = forge.loadCampaign();
    return ledger;
  }
  root.HapilPartyPilotAuto = () => automatic;
  root.HapilPartyExplicitlyEnabled = () => choices[difficulty] === true;
  root.HapilPartyLoadout = () => enabled() && forge ? forge.battleConfig(profile()) : null;
  root.HapilPartyEnterStage = (stage, flags) => enabled() && forge ? forge.campaignEnter(profile(), stage, flags) : null;
  root.HapilPartyCampaignCleared = (stage, difficulty, runId) => {
    if (enabled() && forge) return forge.campaignClear(profile(), stage, difficulty, runId);
  };

  const doc = root.document;
  const el = id => doc.getElementById(id);
  const dialog = el('arcade-party-dialog');
  const toggle = el('arcade-party-enabled');
  const auto = el('party-auto-setting');
  let opener;
  function sync() {
    if (!toggle) return;
    toggle.checked = enabled();
    auto.checked = automatic;
    const active = enabled() && (typeof root.HapilPartyIsActive !== 'function' || root.HapilPartyIsActive());
    el('party-auto-row').hidden = !active;
    el('party-pause-prepare').hidden = !active;
  }
  function applyAuto(value) {
    automatic = value === true;
    savePrefs();
    root.dispatchEvent(new CustomEvent('hapil-party-auto', {detail:automatic}));
    sync();
  }
  root.HapilPartySetAuto = applyAuto;
  root.HapilPartyActivate = (options = {}) => {
    choices[difficulty] = true;
    ledger = null;
    applyAuto(typeof options.auto === 'boolean' ? options.auto : automatic);
  };
  if (!toggle) return; // The workshop also reads the same pilot preference.
  const launchUrl = new URL(root.location.href);
  let launchExpedition = launchUrl.searchParams.get('expedition') === '1';
  root.HapilPartySetDifficulty = next => {
    if (!modes.includes(next)) return;
    difficulty = next;
    if (launchExpedition) {
      choices[difficulty] = true;
      savePrefs();
      launchExpedition = false;
      launchUrl.searchParams.delete('expedition');
      if (root.history) root.history.replaceState(root.history.state, '', launchUrl.href);
    }
    sync();
  };
  toggle.addEventListener('change', () => {
    choices[difficulty] = toggle.checked;
    savePrefs();
    sync();
    root.dispatchEvent(new CustomEvent('hapil-party-preferences'));
  });
  auto.addEventListener('change', () => applyAuto(auto.checked));
  const frame = el('arcade-party-workshop');
  const close = el('arcade-party-dialog-close');
  let afterWorkshop = null;
  function open(trigger, onReturn) {
    if (dialog.open) return;
    opener = trigger;
    afterWorkshop = onReturn;
    const url = new URL('party.html', root.location.href);
    url.searchParams.set('campaign', '1');
    url.searchParams.set('embed', '1');
    if (onReturn) url.searchParams.set('rest', '1');
    else if (opener === el('party-pause-prepare')) url.searchParams.set('during', '1');
    frame.src = url.href;
    dialog.showModal();
    close.focus();
  }
  el('arcade-party-prepare').addEventListener('click', event => open(event.currentTarget, null));
  el('party-pause-prepare').addEventListener('click', event => open(event.currentTarget, null));
  root.HapilPartyOpenWorkshop = onReturn => open(null, onReturn);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    ledger = null;
    sync();
    const restore = afterWorkshop;
    afterWorkshop = null;
    if (restore) restore();
    else if (opener && opener.isConnected) opener.focus();
    opener = null;
  });
  root.addEventListener('message', event => {
    if (!dialog.open || event.source !== frame.contentWindow || !event.data) return;
    if (root.location.origin !== 'null' && event.origin !== root.location.origin) return;
    if (event.data.type === 'hapil-party-ready') {
      root.HapilPartyActivate({auto:event.data.auto});
      dialog.close();
    } else if (event.data.type === 'hapil-party-close') {
      dialog.close();
    }
  });
  root.addEventListener('storage', event => {
    if (event.key === prefKey) {
      readPrefs();
      sync();
      root.dispatchEvent(new CustomEvent('hapil-party-preferences'));
    }
    if (event.key === 'hapil.ai-party.campaign.v1') ledger = null;
  });
  const pause = el('arcade-pause');
  if (pause && typeof MutationObserver === 'function') new MutationObserver(sync).observe(pause, {attributes:true, attributeFilter:['hidden']});
  sync();
})(window);
