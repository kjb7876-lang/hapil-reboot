'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/arcade-v43.js');

function card(name, difficulty) {
  const segment = A.SEGMENTS.findIndex(g => g.spell && g.name === name);
  assert.ok(segment >= 0);
  const state = A.createRun({segment, difficulty, entranceAll:true, pacing:true, seed:17});
  state.stage = 'card';
  state.boss.x = A.WIDTH / 2;
  state.boss.y = 110;
  return {state, fire: A.SEGMENTS[segment].fire};
}

function crossings(run, tick) {
  const s = run.state;
  s.n = 0;
  run.fire(s, tick);
  const row = A.HEIGHT * .87;
  return Array.from({length:s.n}, (_, i) => {
    assert.equal(s.bformation[i], 1);
    return s.bx[i] + (row - s.by[i]) / Math.tan(s.ba[i]);
  }).filter(x => x >= 0 && x <= A.WIDTH).sort((a,b) => a-b);
}

for (const difficulty of ['gentle', 'normal', 'hell']) {
  test(difficulty + ': the inner feathers outline a lane and then cover its old center', () => {
    const run = card('흰 날개', difficulty);
    const center = A.WIDTH/2;
    const opening = crossings(run, 0);
    assert.ok(opening.some(x => x < center) && opening.some(x => x > center));
    assert.ok(opening.every(x => Math.abs(x-center) > 26));
    assert.ok(crossings(run, 66).some(x => Math.abs(x-center) < 1));
  });
  test(difficulty + ': the two lattice rows reach the lower field with alternate gaps', () => {
    const run = card('어울리지 않는 풍경', difficulty);
    const first = crossings(run, 0), next = crossings(run, 48);
    assert.ok(first.some(x => Math.abs(x-A.WIDTH/2) < 1));
    assert.ok(next.length >= 2 && next.every(x => Math.abs(x-A.WIDTH/2) > 25));
  });
  test(difficulty + ': swallowed beads converge and release toward the original aim', () => {
    const run = card('거대한 위장', difficulty), s = run.state;
    s.player.x = 110;
    s.player.y = 556;
    run.fire(s, 0);
    s.player.x = 250;
    const release = [];
    for (let i=0;i<s.n;i++) {
      assert.equal(s.bmode[i], A.MODE_TURN);
      const distance = s.bs[i]*s.bat[i]/60;
      assert.ok(Math.abs(s.bx[i]+distance*Math.cos(s.ba[i])-s.boss.x)<1);
      assert.ok(Math.abs(s.by[i]+distance*Math.sin(s.ba[i])-s.boss.y)<1);
      const heading = s.ba[i]+s.barg[i];
      release.push(s.boss.x+(s.player.y-s.boss.y)/Math.tan(heading));
    }
    assert.ok(release.some(x=>Math.abs(x-110)<1));
    assert.ok(release.every(x=>Math.abs(x-133)>10), 'a short sidestep clears the old aim');
  });
}
