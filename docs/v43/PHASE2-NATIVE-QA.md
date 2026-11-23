# Native phase-two signature slice (local candidate, not release evidence)

This first slice stages nine unique existing authored signatures for six exact second native cards. It does not claim the campaign-wide target of one per midboss, two per main boss, and three per episode boss. Extra validated assets and encounters are intentionally outside this candidate.

| Boss runtime id | Display stage / canonical scene | Native slot (zero-based) | Encounter role | Staged |
| --- | --- | ---: | --- | --- |
| p2_wrath | 18 / 20 | 221 | main | flame cone |
| p3_gate | 26 / 29 | 319 | episode | machine tentacles |
| asmodeus | 15 / 17 | 178 | main | giant kiss, broken heart |
| balrog | 7 / 07 | 77 | main | meteor, spatial slash |
| siren | 39 / 46 | 487 | episode | time acceleration, gravity v2 |
| executor | 46 / 55 | 570 | episode | sedan/cargo alternating impact |

The exact stage assets are loaded only as native HTML images and all new images and warning/active shapes use the normal native Ink renderer: no raw override, no replacement filter. Image failure leaves the settled existing card unchanged and does not introduce invisible danger. The engine gates by exact actor/native card/scene/role, pauses only new legacy emissions during the inserted encounter, then resumes its authored clock. Existing projectiles are not recolored, deleted, or retimed. Hit results join existing invulnerability, auto-bomb, and hurt rules. No HP or save-schema change. WeakMap state prevents art objects or signature state leaking into saved data.

A new attack's logic and colored hazard shape use a shared integer mask covering 50%, 60% or 70% of the true playable area. The approximate 39px protected stripe is from this new hazard; it is not blanket immunity from earlier legacy bullets. Executor coverage is the union of five staggered landing masks, not simultaneous damage. Falling silhouettes are tell only and never produce a collider. Siren clock/well shards have time-accelerated or bending trajectories, but are cosmetic and do not change legacy projectiles, player speed or gravity. Wrath physically moves to a brief high launch position only if necessary before the cone is announced, so the measured origin follows the visible boss without clipping the requested area.

Run:
`node --test tests/arcade-v43-phase2-native.test.cjs`
`node tools/check-phase2-ink-parity-v43.cjs`
`npm run test:ui` (usual real browser runner; includes seed fixtures for the new actual game sprites on desktop plus representative portrait cases).

Offline ink parity is not a gameplay/physical-device approval. The light/dark paper contrast test samples the active marked interiors at mobile raster scale and reports ratios, not a claim of perfectly uniform luminance. The native active ink glaze plus two-tone edge use the exact mask, including vehicle landing groups, without altering danger geometry or replacing accepted atlas images.
