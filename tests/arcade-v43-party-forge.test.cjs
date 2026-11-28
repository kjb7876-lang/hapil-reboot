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
  const allocation = forge.campaignEnter(campaign, 1);
  assert(allocation.companions.some(unit => unit.supply > 0));
  const resumed = forge.campaignEnter(forge.loadCampaign(storage), 1, {resume:true});
  assert.deepEqual(resumed, allocation);
  const retry = forge.campaignEnter(campaign, 1);
  assert(retry.companions.every(unit => unit.supply === 0));
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
