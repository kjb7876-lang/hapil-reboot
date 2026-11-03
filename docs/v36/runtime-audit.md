# v36 runtime/source audit

All tracked JavaScript/CJS/MJS and newly added canonical src/tests/tools/qa code syntax and literal loader/dependency inventory; temporary untracked browser-preview copies are excluded. Every src module has a recorded focused semantic role review. Baseline design gaps are explicitly separated from their observed current resolution. Static checks are not complete branch execution, formal proof, browser rendering or measured FPS.

Baseline: f616a344cfdc03af2bbc7cf98a17e2126123a4c0

Source syntax: 201/201; runtime modules: 15; registered safely: 14; literal loader/dependency errors: 0.

## Runtime coverage

- `src/actors.js`: 44470 bytes, 40 named functions. Source-only enemy, boss, projection, story actor and player body presentation. Reviewed pose selectors, actor surface caches, boss/copy ownership, enemy fallback gating and player/stories. Enemy hit pose exists but core nonboss damage does not set hitUntil.
- `src/app.js`: 69035 bytes, 72 named functions. DOM UI, bounded image loading, fixed-step/30-or60 render loop, audio, input and save orchestration. Reviewed fit/mobile DPR, image queue and generation cancellation, audio pools, initial event-channel opt-in and frame loop. The private core event channel retains every fixed-step successful contact across skipped30FPS draws; it does not infer hits from disappearing shots.
- `src/boss-flow-v29.js`: 6223 bytes, 9 named functions. 600-tick additional pressure choreography and three-pulse sampled streams. Reviewed actionAt and makeStream. Actual pilot snapshot is sampled once; cosmetic cues cannot become homing.
- `src/boss-lasers-v28.js`: 22694 bytes, 22 named functions. Finite profile-specific staged laser programs and full-boundary route fitting. Reviewed route entry, fullLengthRoutes, planned endpoint and staged spectacle generation. Laser warning/active/fade geometry is committed before release.
- `src/boss-motion.js`: 8945 bytes, 11 named functions. Five original bosses, four authored poses with torso registration and bounded presentation offsets. Reviewed actual release-driven pose sampling and hitUntil opacity. Existing hit reaction is four ticks and at most7% opacity modulation.
- `src/boss-patterns-v27.js`: 21435 bytes, 16 named functions. 35 profile owned ordinary volleys, curves, waves, reflection, splitting and lower-field guidance. Reviewed prepare/initialize/advance/children and current31-only gate. Keep renderer-only shot polish out of hostile pattern state.
- `src/boss-skills.js`: 27229 bytes, 24 named functions. Bounded source-owned charge/release and caster cues. Reviewed source surface caching, detached origin cues, planned warning precedence and bounded real release records. Existing low/high budgets4/8 avoid new invisible emitter promises.
- `src/combat-presentation-v36.js`: 11561 bytes, 19 named functions. Current31 friendly own-source shot, true muzzle/contact and finite defeat presentation. Read complete module: own-story/WindArrow source selection and measured tip pivots, four existing-skill grades, precomposited source tails, bounded1MB cache/eviction/release, actual private cue ring/expiry, muzzle2/3 and impact8/12 budgets, compact source flecks, kill smoke, no world writes. Missing own art fails closed; no external particle body or gameplay hitbox is introduced.
- `src/core.js`: 204247 bytes, 122 named functions. Fixed-step combat, target selection, pooled entities, attacks, collision, phase/story transitions and safe checkpoints. Focused semantic review covers acquire/remove/effect, fireShot/attack, hitTarget/hurt, swept collision/updateShots, updateBullets, pressure, step and checkpoint contracts. Current private WeakMap64-cue channel records actual successful muzzle/selected-victim contacts, independent of world/save/RNG; numeric-oracle contact tests and2520 normal-health raw-world/checkpoint comparisons cover its simulation isolation. All source parsed/inventoried; this is not a claim of formal proof of every branch.
- `src/media.js`: 16550 bytes, 0 named functions. Immutable browser media registry. All registry entries are covered by the companion asset audit. Module registers URLs; it does not load or render them.
- `src/projectiles.js`: 70044 bytes, 44 named functions. Owned hostile projectile bodies, beam source materials, finite stamps and offscreen submission culling. Reviewed source signatures, weak body bindings, cache bounds/release, drawBullet and laser bodies. Do not replace damage bodies with particles or shrink them for performance.
- `src/render.js`: 93671 bytes, 69 named functions. Canvas2D composition, connected terrain, source bodies, player shots, effects, hostile foreground and diagnostics. Focused review covers layer order, ownPlayerShot, wind arrow cropping, drawImpact, pressure cache and draw/destroy. Current own-source shot module and true contact cues render above actors/friendly shots and below hostile hazards. Legacy draw paths stay available for other selectors.
- `src/storage.js`: 32820 bytes, 32 named functions. Validated revision-specific save reducer, IndexedDB/memory fallback and conflict-safe writes. Reviewed validation schema, campaign boundaries, reducer expected revisions and queued storage operations. No enemy arrays or render caches are persisted.
- `src/story-assets.js`: 62154 bytes, 10 named functions. Chapters IV–VIII source metadata for actors, terrain, shots and effects. Inspected every data entry via exported immutable registry and role collectors; forWorld maps boss18..34 to group19..35. Player-shot source is story-specific.
- `src/weapon-patterns.js`: 5577 bytes, 10 named functions. Deterministic one-wall boss weapon physics and acceleration. Reviewed pair creation, emission rhythm, bounce split segments and relative collision distance. No rendering owns the weapon hitbox.

## Baseline findings and current resolutions

- **F1 (implemented-current)** Baseline nonlethal enemy hits did not emit a contact effect. Boss hits only set a short throttled hitUntil; kill effects originated at target centre. Existing effect kind hit is player damage, not enemy damage. Current implementation records exact successful muzzle/selected-victim impact primitives in an opt-in private WeakMap ring. Earliest relative swept contact is measured only after the real victim is selected; no disappearance inference, extra damage or serialized world field.
- **F2 (implemented-current)** Baseline basic/memory/counter shots reused one static26px own-story slash or22x9 wind arrow without distinct power treatment, compact muzzle accent or shot-linked contact feedback. Current own-source module keeps the original story/arrow source, adds cached restrained source tails and tip pivots, and grades existing basic/memory/counter/ego states without changing speed/damage/count.
- **F3 (implemented-current)** Legacy effects draw before bodies, so a centre-origin kill or hit could be obscured by an opaque actor. Current new contacts/defeat layers draw above actors/friendly shots and below hostile hazards/bullets; player hit core remains last.
- **F4 (implemented-current)** Low mode draws30FPS while core steps60Hz. A proposed draw-only observer could miss shots born and consumed between frames. Implemented private core success events instead of a draw-only observer or inferred disappearance. App opts in before stepping; the64-slot ring retains exact events across skipped draws and is separate for every world identity.
- **F5 (existing-scope-or-optimization)** Bounded hostile stamp caches, weak bullet bindings, offscreen draw skip, measured3-wide batching, low-DPR1, mobile shadow/blur removal and bounded image concurrency already exist. Do not install duplicate engines/optimizers or reduce all visual quality. Measure incremental shot/contact work on actual same-state scenes.
- **F6 (existing-scope-or-optimization)** This repository uses Canvas2D, not the Three.js/WebGL engine of the separate m0 project. Keep the existing Canvas2D architecture. Report CPU submission/frame observations honestly; WebGL draw-call/texture-memory counters are not directly available here.

## Pipeline

Buildless static HTML/CSS/JavaScript. npm test = node --test tests/*.test.cjs. Canvas2D360×640; simulation60Hz; low/high draw targets30/60. No engine migration or extra package required.

## Limits

- App boot intentionally not executed by this static audit; use real browser QA and existing app harness tests.
- Allocation-site counts are lexical inventory, not evidence of GC events or per-frame costs.
- String-built/dynamic paths and semantic outcomes require existing runtime tests and companion asset-contract audit.
- This tool does not install external skills, dependencies, assets or engines and does not change product source.
