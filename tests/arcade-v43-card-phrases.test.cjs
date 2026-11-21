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
    s.events.length=0;
    A.step(s, {});
    if (s.stage !== 'card') continue;
    assert.equal(s.seg, segment);
    let born = 0, phraseBorn = 0;
    for (let j=0; j<s.n; j++) if (s.bage[j] === 1) { born++; if (!s.bmirror[j]) phraseBorn++; }
    frames.push({born, phraseBorn, split:s.events.includes('pop'), count:s.n, authored:s.authoredTick, variation:s.variationTick, patternCue:s.patternCue,
      laser:s.lasers.some(l => l.age<l.warn+l.active),
      cue:s.figures.some(f => f.age<=f.warn), figures:s.figures.map(f=>f.kind), risers:s.risen, special:s.sp&&s.sp.cur||''});
  }
  assert.equal(frames.length, ticks);
  return frames;
}

// 사용자 11-19 "각 패턴의 지속시간을 더 길게": 실제 게임(entranceAll)의 소절은 1.5배(420→630틱, 본 공격 210→315, 변주 240~360→360~540)
const CP=A.phraseLen({entranceAll:true}),AU=Math.round(210*CP/420),VA=Math.round(240*CP/420),VE=Math.round(360*CP/420);

for (const name of ['겹치는 명령', '닫힌 층의 명령']) {
  test(name+' teaches its own attack before alternating with a geometric burst', () => {
    const f = playSpell(name, 2100);
    const opening = f.slice(0,AU);
    assert.ok(opening.some(frame => frame.born>0));
    assert.ok(opening.every(frame => frame.variation===0 && frame.figures.length===0));
    const pause = f.slice(AU,VA);
    assert.ok(pause.every(frame => (frame.born===0 || frame.split) && frame.count>0), 'old bullets survive and can finish splitting during the rest');
    // 늘어난 본 공격 안에서 켜진 광선은 끝까지 간다(사용자 11-19 "이미 시전한 패턴은 모두 나오게"): 첫 변주는 광선이 꺼진 뒤 바로 나온다
    const v0=f.findIndex(frame=>frame.variation>0);
    assert.ok(v0>=VA && f.slice(VA,v0-1).every(frame=>frame.laser), 'the variation waits only for a live beam');
    assert.ok(f[v0].born>0, 'first geometric burst actually spawns');
    assert.ok(f.slice(VA,VE).every(frame=>frame.authored===AU), 'the authored script waits for its next turn');
    assert.ok(f.slice(CP).some(frame=>frame.authored>AU && frame.born>0), 'authored fire resumes');
    // 사용자 11-20 "탄이 다 사라진 다음에 육망성과 한자 패턴": 그림은 탄이 빠져나갈 때까지(최대 FIG_WAIT_MAX) 미뤄질 수 있다
    // 52스테이지 구성(11-20)에서 이 보스의 그림 순서는 한자 고리가 먼저라 문양은 더 뒤에 온다
    const g = playSpell(name, 4400+2*A.FIG_WAIT_MAX);
    assert.ok(g.some(frame=>frame.figures.includes('glyph')));
    assert.ok(g.some(frame=>frame.figures.includes('runes')));
    // 솟는 바위·뱉는 그림은 특수 페이즈에서만 나온다. 어느 특수 페이즈가 먼저인지는 스테이지 번호로 정해진다
    assert.ok(f.every((frame,i)=>frame.risers===(i?f[i-1].risers:0)||!!frame.special), 'risers only inside a special phase (stones, drawing)');
    assert.ok(f.filter(frame=>frame.cue).every(frame=>frame.born===0), 'foreground signature warnings remain readable');
  });
}

test('a pending authored laser gets its warning and full attack before the mathematical response', () => {
  const f = playSpell('짧은 틈', VE);
  assert.equal(f[VA].laser,true);
  const first = f.findIndex(frame=>frame.variation>0);
  assert.ok(first>VA && first<VE);
  assert.ok(f.slice(VA,first-1).every(frame=>frame.laser && frame.born===0));
  const cue=f[first].patternCue;
  assert.ok(!f[first].laser && cue.kind==='fibfan');
  const release=first+cue.until-cue.start;
  // 반사탄(mirrorVolley)은 소절과 따로 도는 층이다. 광선 예고가 1초 길어져(사용자 11-20) 변주 시작이 반사탄 박과 겹칠 수 있어, 예고 동안 소절 탄만 센다
  assert.ok(f.slice(first,release).every(frame=>frame.phraseBorn===0));
  assert.ok(f[release].born>0 && !f[release].laser);
});

test('a long beam cannot consume the variation and restart the same attack', () => {
  for (const name of ['따뜻한 빛','전조등']) {
    const frames=playSpell(name,900);
    const first=frames.findIndex(f=>f.variation>0);
    assert.ok(first>=VA && first<900,name+' first response at '+first);
    assert.equal(frames[first].authored,AU);
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
