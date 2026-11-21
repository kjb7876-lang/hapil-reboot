'use strict';
// node tools/audit-live-difficulty-v43.cjs --stage 7 --device mobile --details --check
// Without filters, run all authored waves and cards on both devices. This includes the
// repeated plain cards omitted from the shortened Easy/Normal campaign itineraries.
const Arcade = require('../src/arcade-v43.js');

const difficulties = ['gentle', 'normal', 'hell'];
const openingTicks = 12 * 60;
const cardTicks = 30 * 60;
const waveTicks = 24 * 60;

function measure(segment, difficulty, compact, ability) {
  const part = Arcade.SEGMENTS[segment];
  const state = Arcade.createRun({
    segment, difficulty, compact, ability, hero: 'memory', seed: 43,
    growth: true, entranceAll: true, rhythm: true, pacing: true
  });
  // Keep combat and automatic fire running. Prevent HP changes or the automatic bomb
  // from cutting the comparison short. A fixed off-centre pilot avoids the camping attack.
  state.player.invulnerableUntil = Infinity;
  for (let t = 0; t < 1000 && state.stage === 'intro'; t++) Arcade.step(state, {});
  if (state.stage !== part.kind) throw new Error('Combat did not start for segment ' + segment);
  state.player.x = 110;
  const start = state.enemyShotsBorn;
  const limit = part.kind === 'wave' ? waveTicks : cardTicks;
  let opening, peak = 0;
  for (let t = 0; t < limit && state.seg === segment; t++) {
    for (const mob of state.mobs) mob.hp = 1e6;
    if (part.kind === 'card') state.boss.hp = state.boss.maxHp;
    Arcade.step(state, {});
    peak = Math.max(peak, state.n);
    if (t + 1 === openingTicks) opening = state.enemyShotsBorn - start;
    state.events.length = state.cancelled.length = state.pops.length = 0;
  }
  const born = state.enemyShotsBorn - start;
  return { born, opening: opening ?? born, peak };
}

function ordered(values) {
  return values[0] < values[1] && values[1] < values[2];
}

function options(args) {
  // This matches the gunner’s initial in-game ability setting. The player may change it.
  const out = { ability: 7, details: false, check: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--stage':
        out.stage = Number(args[++i]);
        if (!Number.isInteger(out.stage) || out.stage < 1 || out.stage > Arcade.STAGES.length)
          throw new Error('--stage requires a stage number from 1 to ' + Arcade.STAGES.length);
        break;
      case '--device':
        out.device = args[++i];
        if (!['mobile', 'pc'].includes(out.device)) throw new Error('--device requires mobile or pc');
        break;
      case '--ability':
        out.ability = Number(args[++i]);
        if (!Number.isInteger(out.ability) || out.ability < 0 || out.ability > 7)
          throw new Error('--ability requires an integer from 0 to 7');
        break;
      case '--details': out.details = true; break;
      case '--check': out.check = true; break;
      default: throw new Error('Unknown option ' + args[i]);
    }
  }
  return out;
}

function audit(args) {
  const opt = options(args);
  let violations = 0;
  for (const device of opt.device ? [opt.device] : ['mobile', 'pc']) {
    const totals = [0, 0, 0], peaks = [0, 0, 0];
    let rows = 0, openingOrdered = 0, endOrdered = 0;
    for (const [segment, part] of Arcade.SEGMENTS.entries()) {
      const stage = part.stage + 1;
      if (opt.stage && stage !== opt.stage) continue;
      const runs = difficulties.map(difficulty => measure(segment, difficulty, device === 'mobile', opt.ability));
      const shots = runs.map((run, k) => {
        totals[k] += run.born;
        peaks[k] = Math.max(peaks[k], run.peak);
        return run.born;
      });
      const opening = runs.map(run => run.opening);
      const okOpening = ordered(opening), okEnd = ordered(shots);
      rows++;
      if (okOpening) openingOrdered++;
      if (okEnd) endOrdered++;
      if (!okOpening || !okEnd) violations++;
      if (opt.details || (!okOpening || !okEnd) && opt.check) {
        const name = part.name || part.plain || part.kind;
        console.log(`${device} stage ${stage}, segment ${segment} ${name} | 12s ${opening.join('/')} | total ${shots.join('/')} | peak ${runs.map(run => run.peak).join('/')}`);
      }
    }
    console.log(`${device}, memory ability ${opt.ability}, Easy/Normal/Hell | total births ${totals.join('/')} | peak alive ${peaks.join('/')}`);
    console.log(`Strictly ordered | first 12 s: ${openingOrdered}/${rows} | 24 s waves, 30 s cards: ${endOrdered}/${rows}`);
  }
  if (opt.check && violations) process.exitCode = 1;
}

if (require.main === module) audit(process.argv.slice(2));
