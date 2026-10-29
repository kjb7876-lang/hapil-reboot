# Debug and Drive detail release — 2026-10-29

Scope is the currently playable vertical five-boss campaign. This is not a claim that the complete canonical prologue–Part8 story, final fight, or ending is implemented. `hapil1` and `m0` were not modified. The unfinished canonical-story work remains separate.

## Fixes

- Held touch drag no longer discards unconsumed movement merely because the finger has stopped for50ms; bounded movement, pause clearing, and short-drag handling remain.
- A loss records the result once and retains the latest checkpoint and its previous backup. A new retry run ID allows normal checkpoint saves; accumulated kills exclude the previously counted prefix. Wins retain the existing completion behavior. Practice cannot replace a campaign checkpoint or result. Export includes backup and result ledger.
- Delayed save/completion callbacks cannot replace a newer campaign's UI state. While a completion is unresolved, only continuation is locked. Automatic result readback uses `peek` without adopting another tab's revision; explicit Continue loads the latest checkpoint and restores that same checkpoint while new starts are briefly locked.
- Malformed/unsupported stored state and backup are not silently normalized and overwritten. Read/write errors produce failure rather than stale success; recoverable raw records can be exported. Existing version1 records without the new optional baseline remain readable. A primary checkpoint can still recover from a valid same-run backup.
- Required projectile renderer, actor atlas/pose dimensions and player-arrow atlas are checked before play so missing bodies do not become invisible damage or unrelated substitutes. Optional, non-damaging decoration loads independently and its failure does not block combat.

## Verified Drive details

Five pre-existing static boss-specific cast motifs were attached to their respective attacks: purple knot, swamp ring, Balrog fire, mask feather fan and Lucifer ring. They are decoration only; the original damage, independently visible telegraphs, committed aim and actual release timing remain authoritative. Source alpha is retained and their colors are adapted to the existing name/image palette. They are static pictures, not new continuous animation.

The Horn encounter now uses its dedicated reed needle; Lucifer uses his own proposed ceramic mask-shard projectile material. The latter is a static material candidate and does not assert approval of an absent body master or merge the characters. No new original art was generated. Seven source PNGs were compared byte-for-byte with their official downloaded ZIP members and SHA-256 manifests: see `SIGNATURE-CAST-SOURCES-20261029.json`.

## Validation and limits

- `npm test`: **91 passed, 0 failed, 0 skipped** on the final candidate. Includes real-pixel CPU Canvas tests, normal and gentle signature warning/activation, correct boss release poses, cap saturation, drag, save, retry, corruption and race regression fixtures.
- **Natural CPU bot replay**, no777 or invulnerability, ordinary HP, normal damage, automatic attack/skills and legal directional movement: all five current bosses and15phases cleared in normal and gentle, two seeds each. All28 safe checkpoints per run were validated and restored with180 subsequent inputs compared to original state. This is automated CPU simulation, not a human playthrough.
- **Real Chrome**: local isolated QA loaded32 actual images and displayed the five boss samples. A separate isolated IndexedDB name was used with two real browser tabs and the final storage module; stale writes conflicted before and after peek, explicit load enabled the next write, and defeat preserved checkpoint serial2 and backup serial1 with the same retry ID. This was a controlled storage fixture, not the whole live UI in two tabs. Old already-open versions and arbitrary API clients that explicitly adopt a revision then reuse an old world are not certified.
- **Actual game in Chrome**: the game booted with required assets and entered Horn practice. Cloud browser frame gaps caused its existing safety pause, so sustained real-time gameplay and manual full completion were not verified.
- **CPU Canvas performance**: `DEBUG-DETAIL-CPU-20261029.json` and `tools/measure-debug-detail.cjs` reproduce1000 warm render draws at360×640/DPR1, with static charge decorations forced on. The five observed phase-3 peak snapshots had normal-quality p95 0.734–3.309ms on this host; an artificial768-bullet/40-beam saturation had p95 6.675–13.937ms. Connected map tiles were omitted and boss0 used retained terrain fallback; this is not phone/GPU timing or a guarantee of no lag.
- **Not certified**: mobile emulation, real phone, software GPU, actual GPU, sustained browser combat, multi-tab races with an old already-open deployed version, and the full canonical story.
