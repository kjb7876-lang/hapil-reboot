# v17 separate cult finale practice QA

The current main campaign remains the 12-boss, seven-sins campaign and retains its prior endpoint. The cult leader is a separate final-practice entry, not a claim that the intervening story and parts 3–8 are complete. The hotel chairman, cosmic Lucifer and eighth-part cult leader are not asserted to be the same person. Canonical ending wording preserves the Hapil core, separates forced commands and cult circuits, and leaves Hwandō as guardian.

## Automated checks

After the last visual/effect modification, `npm test` passed **200/200**, zero failures and zero skipped in 26.27 seconds. This includes old save/backup tests, boss identity, asset and rendering tests, six deterministic ordinary-health campaign replays, a separate cult practice natural route test, and app load/failure/retry/isolation tests.

All existing 12-boss campaign replays in gentle/normal/hell × seeds 813 and 42 naturally finished with standard health, damage, movement input, automatic attacks and automatic skills; their compressed input files were byte-for-byte unchanged from v16. Every run validated and restored 69 new saved boundaries and compared up to the next 180 simulation ticks against the original. Boss defeat and checkpoint progression are not forced. These are CPU automated runs, not human or device tests.

The independent cult-practice test used standard health and game damage for all three difficulties and both seeds, and progressed through phases 0, 1 and 2 to the core-preserving result. Actual bullets, active lasers, the awakening bridge, and ordinary auto-attack were observed; no 777 fixture, forced invulnerability, health mutation or result forcing was used. Separate live/restored phase-boundary states agreed after 180 ticks. All six runs completed with zero hits, pool pressure and dropped groups. The mode's authored health reset at the revival transition remained as implemented. This verifies the separate practice, not the missing full story.

DOM/event fixtures exercise 12→13th distinct art-group loading, mandatory own atlas/beam/lance/arena/Drive spear failures or invalid dimensions stopping before tick 1, no checkpoint or completion writes from practice, retry after selection changes preserving the cult identity, and visible transition and ending text. Concurrency stays at most two images. These fixtures use synthetic image dimension metadata and are not browser image-decode tests. Forced result and transition states are limited to the UI display tests and are not counted as natural progress.

Source atlas, beam, lance and arena provenance appears in [CULT-V17-VISUAL-SOURCES-20261029.json](CULT-V17-VISUAL-SOURCES-20261029.json); Drive-source FX provenance appears in [CULT-V17-DRIVE-FX-20261029.json](CULT-V17-DRIVE-FX-20261029.json). Actual PNG pixels, alpha and Canvas rendering are checked by the separate `cult-visuals-v17` tests. Four atlas cells are key poses, not an independently authored continuous animation. Laser and projectile visual coverage checks do not establish mobile physical-screen legibility.

## Tested source SHA-256

| Candidate file | SHA-256 |
|---|---|
| `src/core.js` | `fc45c2fd29a35084676d9bbbed31627c2b314e6950cd200356ec377fa839ecf1` |
| `src/actors.js` | `13d80479b8ff1e4df19583a952685f1ffaeac0d05705beae788a3377fe3a8179` |
| `src/projectiles.js` | `a1c77a1e4363136b5c5658f6143cab468d1b4cdbfa035ef60b06d50d4918d477` |
| `src/render.js` | `da99145234fdab90f0ef496d7e25370c4c713cf0fa09df1825a8a49bf227888a` |
| `src/boss-skills.js` | `0ebfd3e246e4bafe2fcbbaf6f27edc08ec436942e9542056944abd402f702072` |
| `src/app.js` | `278df5d0c265a67b7fcdcfbd720df178f4c99248794889c5192475a4adcfd1d4` |
| `src/media.js` | `63398edfa481638eaccec994e22300a637f4b09923bdeeccf459ae4d5b0af177` |
| `index.html` | `569b8f20d7053730c64a49f2a531b2b4f58492c7c3ce25ca06dad2464c18b671` |
| `media/cult-v17/arena.jpg` | `9f23361f00f184e73e963784176d6c0979fe8b4375e45cdd8e06539d4776a53b` |
| `media/cult-v17/beam.webp` | `2b2cfae52803b7b7b1d4311aa98d7e37ebcc2876e8c3b15dfb1c596bac8dfb59` |
| `media/cult-v17/cult-leader-atlas.png` | `d76c925bd52b367aaac41473b234b35a0b5aecde42201324b187af5408f1a2de` |
| `media/cult-v17/lance.webp` | `b1c98912111f3c661c418567e1d304d606705d7e3eb87c643caeaf8402f4acf7` |
| `media/cult-v17/drive-spear.webp` | `507b0455ada4be3ff8876d1686aef6362539b57782333c849c48ba21ed352dd8` |
| `media/cult-v17/drive-fold.webp` | `c51d89509e9e52a07b539027596b986094f5e56fdff3f587e2c19c9ffe38ed93` |
| `media/cult-v17/drive-impact.webp` | `318c20e9dc3588e5929e619a9a8da35bfbf12c3674848752ba46127152247f57` |
| `media/cult-v17/drive-stitch.webp` | `6c2785664e1226250da23a2c048043ca8c3b2cfeeb4c5d1c8259c7d3d8b3649a` |
| `tests/fixtures/natural-bot/manifest.json` | `009785654011e2b835fdf30524449db01233cebe3d0fd7b6ee9753684fb3e1ab` |

Browser observations and deployment status are reported separately. No physical mobile device, browser GPU completion, or proven mobile framerate has been measured in these tests.

The additional `drive-spear.webp` is mandatory: missing or wrong dimensions stop the encounter before tick 1. The three Drive fold/impact/stitch decorations are optional: each missing or malformed condition was tested individually and gameplay continues with required damage materials intact. This is a DOM image-loader fixture, not a physical mobile test.
