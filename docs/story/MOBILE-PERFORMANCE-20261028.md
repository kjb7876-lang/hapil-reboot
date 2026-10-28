# Mobile performance checkpoint — 2026-10-28

This checkpoint reduces rendering and collision CPU work; it does not certify lag-free mobile gameplay.

- V8 and story combat use conservative swept-distance broad-phase filtering. Exact hit, graze and counter calculations remain in use near the player. Invalid geometry uses the original path; ULP-boundary regressions are covered. No deliberate bullet, warning or damage reduction.
- V8 caches an unchanged boss background border and removes purely decorative border work in low quality. Warning lines, beams and projectile cores remain. Mobile page CSS disables backdrop blur and heavy shadows, keeping overlay backgrounds opaque. Story rendering avoids an unused diagnostic clone and per-tick array allocation; its 30 FPS render timing keeps cadence against 60 Hz simulation.
- Existing chosen quality is preserved; fresh mobile installs default to low quality. V8's story checkpoint and save behavior are not intentionally altered.

`npm run story:ledger` and `npm test`: 162 tests passed, zero failed or skipped, Node/CPU environment. Fixture collision comparisons cover 27,000 v8 invincible ticks and 28,972 story simulation ticks; the latter uses ordinary fixture scenarios, not a full story playthrough. Tests include warning/beam/projectile CPU pixels and collision edge cases. None establish physical device performance, GPU performance, real multi-tab interaction, or full narrative completion.

Two adjacent native CPU Canvas paired runs, 5 bosses × 3 phases, 360 ticks each, low quality at 360×640/DPR 1, invincible with player attack disabled, produced baseline render medians 5.39–6.03 ms and candidate medians 3.32–3.34 ms; p95 was 10.69–14.47 ms vs 7.94–8.25 ms. Maximum bullet counts per phase were unchanged. Eight large external images were unavailable in this benchmark, shared host load varied, and CPU command timing is not GPU completion or real mobile FPS. No real-mobile, mobile-emulation, headless browser, or actual GPU measurement was possible: local browser binary is absent and the cloud browser reached an account login wall. Large map images remain in use, and decoded memory/slow devices may still cause frame drops.

Only the isolated private playtest Site should receive this uncompleted work; main/production story is not complete.
