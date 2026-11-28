'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const forge = require('../src/arcade-party-forge-v43.js');

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}

test('a new companion reaches seven stars using guaranteed first clears alone', () => {
  const storage = memoryStorage();
  const campaign = forge.loadCampaign(storage);
  const stagesAtPromotion = [];
  for (let stage = 1; stage <= 52; stage++) {
    const {reward} = forge.campaignClear(campaign, stage, 'normal');
    if (reward.vouchers) assert(forge.redeem(campaign, 'drone').ok);
    if (forge.promotion(campaign, 'drone').ready) {
      assert(forge.promote(campaign, 'drone').success);
      stagesAtPromotion.push(stage);
    }
    assert.equal(forge.campaignClear(campaign, stage, 'hell').first, false);
  }
  assert.deepEqual(stagesAtPromotion, [4, 16, 18, 26, 34, 46]);
  assert.equal(forge.loadCampaign(storage).units.drone.stars, 7);
  assert.equal(forge.load(storage).units.drone.stars, 1);
});

test('a checkpoint resumes its supply while a fresh attempt consumes a new allocation', () => {
  const storage = memoryStorage();
  const campaign = forge.loadCampaign(storage);
  assert(forge.spin(campaign).ok);
  if (campaign.reel.status === 'choose') assert(forge.bank(campaign, 'angel').ok);
  if (campaign.reel.target === forge.reserve(campaign)) assert(forge.place(campaign,campaign.reel.target,'rear').ok);
  const allocation = forge.campaignEnter(campaign, 1);
  assert(allocation.companions.some(unit => unit.supply > 0));
  const resumed = forge.campaignEnter(forge.loadCampaign(storage), 1, {resume:true});
  assert.deepEqual(resumed, allocation);
  const retry = forge.campaignEnter(campaign, 1);
  assert(retry.companions.every(unit => unit.supply === 0));
});

test('a three-ally save gains a reserve without changing its active flight, equipment or paid shelf', () => {
  for (const mode of ['trial','campaign']) {
    const storage = memoryStorage(), legacy = forge.fresh(247, mode);
    delete legacy.units.archer;
    for (const item of legacy.shop) if (item.kind === 'archer') item.kind = 'drone';
    legacy.units.angel = {stars:5,copies:2,gear:2};
    legacy.board = {front:'drone',wing:'angel',rear:'archon'};
    legacy.reel = {symbols:['angel','angel','drone'],status:'awarded',target:'angel',level:1,held:0};
    if (mode === 'trial') forge.start(legacy);
    else forge.campaignEnter(legacy, 12);
    storage.setItem(forge.keys[mode],JSON.stringify(legacy));
    const load = mode === 'trial' ? forge.load : forge.loadCampaign;
    const restored = load(storage);
    assert.deepEqual(restored,{...legacy,units:{...legacy.units,archer:{stars:1,copies:0,gear:0}}});
    assert.deepEqual(JSON.parse(storage.getItem(forge.keys[mode])), restored);
    assert.equal(forge.reserve(restored),'archer');
    if (mode === 'trial') assert.equal(forge.start(restored).id,legacy.active.id);
    else assert.deepEqual(forge.campaignEnter(restored,12,{resume:true}),legacy.stageAllocation);
  }
});

test('reserve exchanges preserve three unique active allies, existing allocations and other workshop edits', () => {
  const storage = memoryStorage(), one = forge.loadCampaign(storage), two = forge.loadCampaign(storage);
  const before = forge.campaignEnter(one,1);
  assert(forge.place(one,'archer','rear').ok);
  assert.equal(forge.reserve(one),'angel');
  assert.equal(forge.preview(one,'angel').slot,'bench');
  assert.deepEqual(Object.keys(one.board).sort(),forge.slots.slice().sort());
  assert.equal(forge.place(two,'drone','front').ok,false); // First reconcile competing workshop save.
  assert.deepEqual(two.board,one.board);
  assert(forge.place(two,'drone','front').ok);
  assert.deepEqual(forge.campaignEnter(one,1,{resume:true}),before);
  const deployed = forge.campaignEnter(one,2);
  assert.deepEqual(deployed.companions.map(unit=>[unit.slot,unit.kind]),
    [['front','drone'],['wing','archon'],['rear','archer']]);
  assert(forge.place(one,'angel','rear').ok);
  assert.equal(forge.reserve(forge.loadCampaign(storage)), 'archer');
});

test('four reel symbols yield the stated held-spin odds and the archer can recruit and grow to seven stars', () => {
  const held = 'archer', totals = {0:0,1:0,3:0};
  for (const second of forge.kinds) for (const third of forge.kinds) {
    totals[forge.reelLevel([held,second,third])]++;
  }
  assert.deepEqual(totals,{0:6,1:9,3:1});
  const reelKinds = new Set(), shopKinds = new Set();
  for (let seed = 0; seed < 64; seed++) {
    const trial = forge.fresh(seed);
    trial.shop.forEach(offer=>shopKinds.add(offer.kind));
    forge.spin(trial);
    trial.reel.symbols.forEach(kind=>reelKinds.add(kind));
    if (trial.reel.status === 'choose') {
      const fixed = trial.reel.symbols[1];
      forge.reroll(trial,1);
      assert.equal(trial.reel.target,fixed);
      assert.equal(trial.reel.level,forge.reelLevel(trial.reel.symbols));
    }
  }
  assert.deepEqual(shopKinds,new Set(forge.kinds));
  assert.deepEqual(reelKinds,new Set(forge.kinds));
  const campaign=forge.fresh(13,'campaign');
  for (let stage=1;stage<=46;stage++) {
    const {reward}=forge.campaignClear(campaign,stage,'hell');
    if (reward.vouchers) assert(forge.redeem(campaign,'archer').ok);
    if (forge.promotion(campaign,'archer').ready) assert(forge.promote(campaign,'archer').success);
  }
  assert.equal(campaign.units.archer.stars,7);
  assert.equal(forge.reserve(campaign),'archer');
  assert(forge.equip(campaign,'archer').ok);
  assert(forge.place(campaign,'archer','rear').ok);
  assert.equal(forge.campaignEnter(campaign,47).companions[2].gear,1);
});

test('a stage 42 training clear never credits campaign resources', () => {
  const storage = memoryStorage();
  const trial = forge.load(storage);
  const campaign = forge.loadCampaign(storage);
  const sortie = forge.start(trial, 42);
  assert.equal(sortie.practice, true);
  assert.equal(forge.finish(trial, sortie.id, true).first, false);
  assert.equal(forge.finish(trial, sortie.id, true).ok, false);
  assert.deepEqual(forge.loadCampaign(storage), campaign);
});

test('each expedition rest restocks once on replay while permanent rewards stay first-clear only', () => {
  const storage = memoryStorage();
  const campaign = forge.loadCampaign(storage);
  const shelfSize = campaign.shop.length;
  const firstShelf = campaign.offerSeq;
  assert(forge.spin(campaign).ok);
  const first = forge.campaignClear(campaign, 16, 'normal', 'first-run');
  assert(first.first && first.restocked);
  assert.equal(first.reward.vouchers, 1);
  assert.equal(campaign.offerSeq, firstShelf + shelfSize);
  assert.equal(campaign.reel.status, 'idle');
  const savedCurrency = [campaign.credits, campaign.seals, campaign.vouchers];

  // A duplicate event (even from a second mounted workshop or another difficulty)
  // must keep an already rolled reel and the same shelf.
  const otherWindow = forge.loadCampaign(storage);
  assert(forge.spin(campaign).ok);
  const spunReel = structuredClone(campaign.reel);
  assert.equal(forge.campaignClear(otherWindow, 16, 'hell', 'first-run').restocked, false);
  assert.deepEqual(otherWindow.reel, spunReel);
  assert.deepEqual(otherWindow.shop, campaign.shop);
  assert.equal(forge.campaignClear(otherWindow, 16, 'easy').restocked, false);
  assert.deepEqual(otherWindow.difficultyClears.gentle, [16]);

  const replay = forge.campaignClear(campaign, 16, 'normal', 'second-run');
  assert.equal(replay.first, false);
  assert.equal(replay.restocked, true);
  assert.equal(campaign.offerSeq, firstShelf + 2 * shelfSize);
  assert.equal(campaign.reel.status, 'idle');
  assert.deepEqual([campaign.credits, campaign.seals, campaign.vouchers], savedCurrency);
  assert.deepEqual(campaign.cleared, [16]);
  assert(forge.spin(campaign).ok);
  for (const runId of ['first-run', 'second-run', undefined]) {
    assert.equal(forge.campaignClear(campaign, 16, 'normal', runId).restocked, false);
  }
  assert.notEqual(campaign.reel.status, 'idle');
  assert.equal(campaign.offerSeq, firstShelf + 2 * shelfSize);
  assert.equal(forge.campaignClear(campaign, 17, 'normal', 'second-run').restocked, true);
  const restored = forge.loadCampaign(storage);
  assert.equal(forge.campaignClear(restored, 16, 'normal', 'second-run').restocked, false);
  assert.equal(restored.offerSeq, firstShelf + 3 * shelfSize);
});
