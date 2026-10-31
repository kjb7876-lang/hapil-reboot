# V23 independent laser QA — 2026-10-31

The final candidate `src/projectiles.js` SHA-256 is `72e42480e7aec149bceaf0fa355674cf6cf6100587a4221c661906fcdc56be90`. The baseline is the exact deployed v22 source commit `2ff6bcd21616a20c66547c0512d53f728e0466b5`, read with `git show` into a separate VM. These comparisons use the actual retained encounter images, never painted proxy game assets.

`node tools/audit-laser-pixels-v23.cjs` passed 138 source-pixel cases across all 36 selectable visual encounter groups (the 35 current runtime configurations plus the retained cult practice selection), both Han Rian / Baek Ion owners, and both quality settings. Representative narrow, horizontal, diagonal and lattice rays are included in addition to every group's wide ray. This is a visual configuration count, not a new boss count.

- Every tested active interior retained 100% alpha >= 100 coverage under the independent interior mask (required >= 97%).
- No alpha > 1 appeared beyond the committed capsule union plus 1.25 native CPU pixels of antialias tolerance. No new damage boundary is implied by this tolerance.
- The minimum materially changed interior fraction against v22 was 75.588%. The gate requires 20% to distinguish a substantial presentation revision. Change alone is not a quality rating.
- The maximum shared source cache in the pixel cases was 1,032,256 bytes, below the existing 4 MiB / 96-entry ceiling. Missing source and optional beam counts were zero.
- Thirty-two actual-core observations reached warning, first active tick, last active tick and harmless fade at exactly their own committed clocks. These observations explicitly grant immunity and turn off player attacks and automatic skills. They are not natural gameplay or human clears.
- The eight complete HELL combat comparisons retain actual map, boss and bullet composition at pressure activation + 120 ticks; only the ray rendering differs between versions.

The additional independent tests check actual paired-owner pixel hues in both palette slots, forty-ray frame budgets, stable warmed allocations and cache builds, full cache release, transparent missing-asset behavior and the original fade fraction. Geometric body painting (`fill`, `stroke`, text and rectangles) is forbidden on the live ray body context. Existing core state and hazard objects are hashed before and after presentation.

Direct pixel review covered all eight complete scene pairs, twelve isolated wide-ray pairs and 38 material samples in the three contact sheets. The final images show a narrower bright spine with coloured shoulders, preserve owner-specific source ornament, and leave small bullets and terrain easier to distinguish in the broad attack field. This is a manual review of those sheets, not all 138 cases or a browser-motion certification. The primary reviewer also performs browser review separately.

The audit intercepted actual immutable runtime source canvases at `drawImage` and recorded 222 derived output identities: 74 materials, 74 flow layers and 74 emitters. Both palette slots of each actual owner were rendered. Each output has SHA-256 for raw RGBA and its native PNG encoding, dimensions, the creating source-code hash, and actual group/owner/slot uses. All 239 source image files are also SHA-256 pinned. The output PNGs were hashed in memory; their contact sheet is persisted. The JSON is the precise provenance record.

## CPU cost and verification limits

The synthetic forty-simultaneous-ray, laser-only CPU fixture used 360 × 640, DPR 1, five warmups and 25 samples per version/quality/group. Its high-quality median increased from 0.85–1.08 ms to 3.40–5.33 ms (candidate p95 3.87–5.93 ms); low quality increased from 0.85–1.06 ms to 3.22–3.56 ms (p95 3.81–4.02 ms). All measured warmed frames rebuilt zero ray caches. High quality caps flowing detail to twelve rays / twenty-four flow draws / twelve emitter draws; low quality disables those optional draws. These results disclose the cost of the richer source layers and do not claim a speed improvement.

Those numbers exclude map, bullet, simulation, input and GPU-completion cost. They are controlled native CPU raster measurements on a shared cloud host, not game FPS, headless automation, software-GPU certification, hardware-GPU certification, mobile emulation or actual-device performance.

The initial paired-pixel QA assertion required an unconditional red-minus-blue difference below -10 for Baek Ion. This was invalid for its intentionally off-white secondary palette `#e5edf2` (only -13 before grading). The retained failed-criterion log documents the error. The corrected ownership test derives its minimum warm/cool magnitude from both actual palette colours; it does not require an off-white role to become a saturated blue. No product behavior or accepted collision criterion changed to pass this test.

## Reproducible evidence

- `tools/audit-laser-pixels-v23.cjs`
- `tests/independent-laser-pixels-v23.test.cjs`
- `docs/V23-LASER-PIXEL-REVIEW-20261031.json`
- `docs/v23-laser-pixels-final-audit-20261031.log`
- `docs/v23-laser-pixels/actual-combat-before-after.jpg`
- `docs/v23-laser-pixels/baseline-current.jpg`
- `docs/v23-laser-pixels/graded-material-cache.jpg`
- `docs/v23-laser-pixels-tests-candidate2-20261031.log` (earlier four-test candidate)
- `docs/v23-laser-palette-test-initial-criterion-20261031.log` (rejected QA criterion, not a final product failure)

The source hashes were identical at audit start and completion. Full regression-suite and release/browser results belong to the primary release report.
