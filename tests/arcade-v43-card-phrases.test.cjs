'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/arcade-v43.js');
const geometry = require('../src/arcade-boss-phases-v43.js');

function playSpell(name, ticks) {
  const segment = A.SEGMENTS.findIndex(g => g.spell && g.name === name);
  assert.ok(segment >= 0, name);
  const s = A.createRun({segment, seed:17, difficulty:'normal', entranceAll:true, rhythm:true, pacing:true});
  const frames = [];
  for (let i=0; i<ticks+600 && frames.length<ticks; i++) {
    s.player.invulnerableUntil = s.tick+600;
    if (s.stage === 'card') s.boss.hp = s.boss.maxHp;
    A.step(s, {});
    if (s.stage !== 'card') continue;
    assert.equal(s.seg, segment);
    let born = 0;
    for (let j=0; j<s.n; j++) if (s.bage[j] === 1) born++;
    frames.push({born, count:s.n, authored:s.authoredTick, variation:s.variationTick,
      laser:s.lasers.some(l => l.age<l.warn+l.active),
      cue:s.figures.some(f => f.age<=f.warn), figures:s.figures.map(f=>f.kind), risers:s.risen});
  }
  assert.equal(frames.length, ticks);
  return frames;
}

for (const name of ['겹치는 명령', '닫힌 층의 명령']) {
  test(name+' teaches its own attack before alternating with a geometric burst', () => {
    const f = playSpell(name, 900);
    const opening = f.slice(0,210);
    assert.ok(opening.some(frame => frame.born>0));
    assert.ok(opening.every(frame => frame.variation===0 && frame.figures.length===0));
    const pause = f.slice(210,240);
    assert.ok(pause.every(frame => frame.born===0 && frame.count>0), 'old, moving bullets survive the rest');
    assert.ok(f[240].born>0, 'first geometric burst actually spawns');
    assert.ok(f.slice(240,360).every(frame=>frame.authored===210), 'the authored script waits for its next turn');
    assert.ok(f.slice(420).some(frame=>frame.authored>210 && frame.born>0), 'authored fire resumes');
    assert.ok(f.some(frame=>frame.figures.includes('glyph')));
    assert.ok(f.some(frame=>frame.figures.includes('runes')));
    assert.ok(f.every(frame=>frame.risers===0));
    assert.ok(f.filter(frame=>frame.cue).every(frame=>frame.born===0), 'foreground signature warnings remain readable');
  });
}

test('a pending authored laser gets its warning and full attack before the mathematical response', () => {
  const f = playSpell('짧은 틈', 360);
  assert.equal(f[240].laser,true);
  const first = f.findIndex(frame=>frame.variation>0);
  assert.ok(first>240 && first<360);
  assert.ok(f.slice(240,first-1).every(frame=>frame.laser && frame.born===0));
  assert.ok(!f[first].laser && f[first].born>0);
});

test('a long beam cannot consume the variation and restart the same attack', () => {
  for (const name of ['따뜻한 빛','전조등']) {
    const frames=playSpell(name,600);
    const first=frames.findIndex(f=>f.variation>0);
    assert.ok(first>=360 && first<600,name+' first response at '+first);
    assert.equal(frames[first].authored,210);
    assert.ok(frames[first].born>0);
  }
});

test('swamp waves finish announced hands and stop announcing new ones while surviving mobs leave', () => {
  const segment = A.SEGMENTS.findIndex(g=>g.kind==='wave' && A.STAGES[g.stage].scene==='03');
  const s=A.createRun({segment, seed:17, difficulty:'normal', entranceAll:true, pacing:false});
  // Stay in a real wave with a living mob while the script clock moves into its exit grace.
  for (let i=0; i<1000 && !s.mobs.length; i++) A.step(s,{});
  assert.ok(s.mobs.length>0);
  s.ripples=[{x:40,age:A.HAND_WARN-1}];
  s.segTick=A.waveDuration(s,A.SEGMENTS[segment]);
  s.stageTick=94; // next tick is an ordinary hand-warning beat
  s.player.invulnerableUntil=s.tick+400;
  A.step(s,{});
  assert.deepEqual(s.ripples,[]);
  assert.ok(Array.from(s.bsize.slice(0,s.n)).some((size,i)=>size===A.SHAPE_PROP && A.PROPS[s.bcolor[i]].key==='demon-hand'));
});

test('actor-derived geometry parameters always draw a polygon edge or a real orbit', () => {
  for (const [i,g] of A.SEGMENTS.entries()) {
    if(g.kind!=='card')continue;
    const p=geometry.params(g.actor+'|'+g.stage,A.phaseOf(i).no);
    assert.ok(p.k>=2 && p.k<=5 && p.k2>=1 && p.k2<=3);
  }
});
