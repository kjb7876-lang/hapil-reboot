'use strict';
// node tools/audit-boss-share-v43.cjs [--stages 1,12,30] [--check]
// 사용자 11-21 "일반몹 총탄환이 보스보다 많이 나와 탄환 밸런스가 역전": 실제 게임(entranceAll)에서 한 스테이지를 무적 봇으로 돌려
// 잡몹 구간(wave)과 보스·중간보스 구간(card)의 화면 위 평균 탄 수를 잰다. 보스전에는 육망성·한자 고리(탄 없음)와 레이저 특수 페이즈가 섞여도
// 평균이 잡몹 구간보다 많아야 한다(--check 는 card 평균 > wave 평균 ×1.15 를 모든 난이도·기기에서 요구).
const Arcade = require('../src/arcade-v43.js');
const args = process.argv.slice(2);
const stages = (args.includes('--stages') ? args[args.indexOf('--stages') + 1] : '1,12,30').split(',').map(Number);
const check = args.includes('--check');
const RATIO = 1.15;
function measure(stage, difficulty, compact) {
  const s = Arcade.createRun({ difficulty, seed: 3, stage, stages: 1, entranceAll: true, compact, pacing: true });
  const per = { wave: { ticks: 0, sum: 0, peak: 0 }, card: { ticks: 0, sum: 0, peak: 0 } };
  for (let t = 0; t < 400000 && s.stage !== 'won' && s.stage !== 'lost'; t++) {
    s.player.invulnerableUntil = s.tick + 999;
    const tx = s.stage === 'card' ? s.boss.x : s.mobs.length ? s.mobs[0].x : 180;
    Arcade.step(s, { dx: Math.max(-1, Math.min(1, (tx - s.player.x) / 4)), dy: 0 });
    s.events.length = s.cancelled.length = s.pops.length = 0;
    const k = s.stage === 'card' ? 'card' : s.stage === 'wave' ? 'wave' : null;
    if (k) { const p = per[k]; p.ticks++; p.sum += s.n; if (s.n > p.peak) p.peak = s.n; }
  }
  const avg = k => per[k].ticks ? per[k].sum / per[k].ticks : 0;
  return { stage, difficulty, device: compact ? 'mobile' : 'pc', wave: +avg('wave').toFixed(1), card: +avg('card').toFixed(1), wavePeak: per.wave.peak, cardPeak: per.card.peak, end: s.stage };
}
const rows = [], bad = [];
for (const stage of stages) for (const compact of [true, false]) for (const difficulty of ['gentle', 'normal', 'hell']) {
  const r = measure(stage, difficulty, compact); rows.push(r);
  console.log(`${r.device}\t${difficulty}\tstage ${stage}\twave avg ${r.wave} (peak ${r.wavePeak})\tboss avg ${r.card} (peak ${r.cardPeak})\t×${(r.card / Math.max(.1, r.wave)).toFixed(2)}`);
  if (r.end !== 'won' || !(r.card > r.wave * RATIO) || !(r.cardPeak > r.wavePeak)) bad.push(r);
}
if (check && bad.length) { console.error('boss share too low: ' + JSON.stringify(bad)); process.exit(1); }
