# Asset bullets and five boss signatures — 2026-10-28

This release improves the currently playable five-boss vertical campaign. It does not implement or certify the complete prologue–Part8 canonical story, final battle, or ending. The separate unfinished story branch remains separate. `hapil1` and `m0` were not modified.

## Visible changes

Every enemy projectile, including ordinary enemies and the legacy encounter, uses actual source pixels. The former colored circle/capsule backing, rim, geometric fallback, and optional projectile tail have been removed. Friendly shots also use the retained player wind-arrow asset. Harmless dashed laser telegraphs remain distinct from the active damage bodies.

Six static projectile files already stored in Drive were copied without changing a byte; their ZIP membership, manifest SHA-256 and local SHA-256 were checked again. Existing Violet/Lucifer four-phase ORBs remain finite playback followed by a held frame. No new complete continuous animation or new original artwork is claimed. Source records are in `ASSET-PATTERN-SOURCES-20261028.json`; previous ORB provenance remains in `DRIVE-VFX-20261028.json`.

Boss colors follow an explicit color in the name first, then substantial inspected image colors, then supporting image colors. Swatches are adjusted for readability, not claimed to be exact automatic extraction. Violet uses named purple; Horn bronze/olive/copper; Balrog ember/gold/charcoal; Mask red-orange/ivory/gold; Lucifer crimson/ivory/gold. Secondary signature layers use an explicit palette slot. Lucifer dark source pixels receive a contrast floor while its source detail and opacity are retained.

Active and fading lasers use three slices of that encounter's own projectile texture. There is no separately authored laser atlas in the available source set. Horn/Lucifer needles are adaptations of their own ORB material, not dedicated new needle art. Exact capsule clipping preserves the damage boundary and source opacity; no plain beam line substitutes for source pixels. Missing or malformed required damage assets block encounter loading instead of silently exposing invisible attacks or substitute geometry.

## Playable signatures

The third phase replaces the previous third-phase emissions; it does not stack another attack over them. Phase HP, phase count, checkpoints, save schema, controls, base fixed-step simulation and legacy save rules remain compatible.

| Boss | Original gameplay composition | Readable escape |
| --- | --- | --- |
| Violet | Paired needle weave and two committed flanking rays | Follow the drifting opening |
| Horn | Slow memory ring accelerates after1.15s, with a separated faster echo | Move into the opening before acceleration |
| Balrog | Seven pillar positions, five active rays | Two adjacent open lanes alternate left/right |
| Mask | Paired feather fans exchange leading side and speed | Read the opening between alternating wings |
| Lucifer | Five constellation origins and committed side rays | Separate the central aperture from the fixed rays |

This uses general danmaku composition ideas—fixed versus aimed lanes, alternating emissions, ring gaps and recovery windows—referenced while reviewing Imperishable Night. It does not copy its assets, characters, spell names, source code, or exact attack choreography. Reference pages: official game index https://www16.big.or.jp/~zun/html/game.html ; gameplay reference https://extra.ohuda.com/th08.html and https://wikiwiki.jp/thk/%E6%B0%B8/4B . The official individual th08 page was inaccessible to the search tool; no downloaded game executable was used.

New signature rays warn for66–78ticks (normal), with the existing additional12ticks in gentle difficulty, before damage. Paths are committed when the telegraph is created; they do not track the player afterward. Actual emission and activation, rather than the warning request, drives the boss attack keypose. The retained four keyposes are not a complete continuous animation.

## Validation scope

- Implementation: normal campaign phase3, boss practice and legacy projectile rendering are connected to production code. New hints appear in the touch caption and phase title.
- Automated unit/CPU Canvas: source-only drawing, actual PNG decoding/pixels, all768 enemy bullets and40 active hazards, every active laser interior pixel, exact ORB alpha phases, missing/wrong-size assets, palette order, player arrow tip, actual release timing, mobile FPS choice, short drag, save/practice isolation, write failures and stale run callbacks are covered.
- Phase combat fixtures: five bosses × normal/gentle ×1800ticks; deterministic patterns, no pool pressure/dropped groups, ordinary HP moving escape routes using real focus speed. A separate invulnerable observation fixture checks full-cycle emission timing. These are not natural campaign clears and do not use777.
- Native CPU performance: separate retained report `ASSET-PATTERN-CPU-20261028.json` and repeatable `tools/measure-asset-patterns.cjs`. Scope is host CPU raster at360×640 DPR1, not browser GPU completion or phone performance. Connected-maptiles were omitted from the CPU fixture and retained fallback terrain used for boss0. Synthetic768bullet/40beam saturation deliberately exceeds observed signature density; slow frames are retained in the report.
- Actual cloud Chrome: local QA sheet loads25actual source images, shows all15shape samples and10laser samples without missing assets. Static phase-combat controls exercise the actual engine and renderer. This is controlled screen inspection, not a natural playthrough.
- Headless browser, software GPU, hardware GPU, mobile emulation, actual phone, long natural campaign completion, and multi-tab storage competition: not certified in this release. Browser GPU backend is unknown. Actual mobile lag cannot be ruled out from CPU fixtures.

Node test count, final browser checks and the exact GitHub Pages deployment result are recorded after final validation. No required check or branch protection is bypassed.

Final local check: `npm test` passed43/43,0failed,0skipped. Individual-frame caching kept the same294144bytes in the controlled Lucifer mixed-body case and reduced host CPU median37.009→15.744ms. The89-ORB case had a slightly lower median but noisier/worse p95; no claim that every case or every phone improves. Final1000render-draw fixture report: observed-phase normal-quality p95 1.552–8.546ms; impossible-capacity saturation p95 13.626–19.096ms.

Real application browser check loaded the new Balrog encounter art and entered practice. Long interactive play in the cloud browser automatically paused on large frame gaps (>0.75s) between tool actions. This prevents certification of sustained actual-browser play or natural progression; the pause protection was preserved. Controlled phase snapshots are recorded separately from the live application check.
