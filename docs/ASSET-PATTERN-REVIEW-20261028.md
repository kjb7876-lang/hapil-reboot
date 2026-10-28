# Asset projectile and signature review — 2026-10-28

Independent review scope: the currently implemented five-boss vertical campaign and its legacy combat mode. This change does not complete Parts 1–8 or add a new story ending.

## Reviewed behavior

- Enemy damage bodies are sampled from retained Drive projectile source pixels. The renderer has no circle/capsule fill or solid-line damage-body fallback. Exact capsule paths remain presentation masks so the art does not widen damage geometry.
- Ordinary mobs use their current encounter's projectile material. Horn and Lucifer elongated projectiles are explicitly adaptations of their own orb material; they are not newly authored dedicated needle animations. Laser bodies likewise adapt the owner's source texture; no dedicated authored laser sequence was found or claimed.
- Five boss palettes prioritize the explicit named purple for 보라검천사, then prominent and supporting image colors. Palette swatches are readable adaptations from actual pixel inspection, not a claim of exact automatic color extraction. Some attack layers use the corresponding secondary palette.
- Every required projectile's decoded dimensions are checked before the encounter starts. Missing or malformed damage-body assets block play instead of silently substituting geometry.
- New phase-3 signatures replace old phase-3 emissions. Their fixed warnings, successful release timestamps, recovery beats, and whole-group pool budget remain intact. Save schema and checkpoint boundaries are unchanged by the signatures.
- The first signature draft admitted a stationary center safe spot. It was revised before release: independent current tests verify a moving route at normal focus speed and a negative control showing that staying at the center requires a dodge.

## Independent executable checks

`node --test tests/legacy-asset-render-integration.test.cjs tests/legacy-boss-signatures.test.cjs` passed 10 tests, with no failures or skips, after the revised moving gaps were applied.

Five integration tests load actual retained Drive PNGs/WebP, rather than generated placeholder textures:

1. The complete renderer paints all 768 enemy bullets in every one of the five encounters and legacy mode, at both quality levels. Every bullet center changes the corresponding empty-scene pixel and metrics report 768 source draws.
2. All 40 synthetic active beams remain visible for each boss in both quality settings.
3. Every missing or incorrectly sized projectile dependency is rejected by the encounter asset contract.
4. Real-source beam interiors are fully opaque across the damaging width, without an extra visible damage body beyond that width; warning phases are not painted as active bodies.
5. The player's wind-arrow source tip remains on the simulated shot position and follows its velocity at several angles and source phases.

The separate signature tests distinguish an invulnerable observation fixture (for all timed emissions) from ordinary-health moving-route and stationary negative-control tests. They verify locked warning geometry, damage only at activation, actual attack-pose release timing, delayed Horn acceleration, no deferred/dropped groups, and bounded phase density. None is presented as a natural campaign clear.

The previous `legacy-render-performance.test.cjs` high/low equality assertion could pass if both bodies were absent. The new baseline-pixel and source-draw-count checks specifically close this verification gap.

## Native CPU measurements and limits

`tools/measure-asset-patterns.cjs` writes `docs/ASSET-PATTERN-CPU-20261028.json`. Each case has five warmup draws and fifty measured draws at 360×640, DPR 1. Five bosses, two quality modes, observed phase-3 peak snapshots and synthetic 768-bullet/40-beam saturation give 1,000 measured scene draws. Source image hashes and environment are recorded. Measurements are shared-host native CPU raster times, not browser frame rate or GPU completion.

Actual retained projectile, boss, player, forest, ruins, and cave images are used. Connected-map tiles unavailable in the local snapshot are omitted; boss 0 therefore uses the retained terrain fallback during measurement. This is not an exact performance measurement of the deployed first map sequence.

The final report was captured after frame caching was optimized. Across the observed phase peaks, render p95 was 1.552–8.546 ms in normal quality and 2.451–3.779 ms in low quality. Synthetic 768-bullet/40-beam p95 was 13.626–19.096 ms in normal quality and 12.112–16.846 ms in low quality. Every final case reported zero missing source assets and zero warm cache misses; the saturation cases painted all 768 bodies and all 40 beams. The ordinary-health moving-route observation retained all health over 1,800 ticks for every boss.

The first draft measured a costly four-frame source-strip path under extreme Lucifer saturation. A bounded direct-module diagnostic identified body rendering rather than the three-slice beam path as the cost. Body frames were then cached as separate surfaces with the same total pixel bytes, permitting one direct draw per bullet. `ASSET-PATTERN-CACHE-AB-20261028.json` retains the controlled before/after source hashes and actual-image experiment: 768 mixed Lucifer bodies changed from median 37.009 ms / p95 57.357 ms to median 15.744 ms / p95 19.715 ms. Cache bytes remained 294,144 in both cases. The 89-orb case's median improved, but its p95 increased in that small shared-host capture; the evidence does not support a claim that every percentile always improves. The final 1,000-scene capture and the controlled A/B are separate experiments with different timing values.

These timings are not a guarantee of lag-free mobile play. They exclude GPU completion, display cadence, touch latency, sustained thermal behavior, and background application contention.

Not covered here: headless browser automation, real browser rendering, software-GPU profiling, hardware-GPU profiling, mobile emulation, actual phones, natural campaign clears, and real multi-tab storage contention. Those require separate evidence; none is marked passed by this review.
