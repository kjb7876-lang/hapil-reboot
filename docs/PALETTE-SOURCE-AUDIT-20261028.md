# Boss palette and authored projectile source audit — 2026-10-28

Scope: the five currently deployed legacy encounters. This is a presentation audit, not evidence that the complete canonical story is implemented.

All five existing 512×512 RGBA boss keypose atlases were opened as actual pixels in this environment. They contain four keyposes each; no additional poses were generated and no complete continuous animation is claimed.

## Palette rule

A color explicitly present in a boss name wins. Otherwise use a recognizable substantial image color, then image secondary and tertiary colors. Runtime swatches are brightened readability adaptations of those inspected colors, not claimed to be mathematically exact color extraction or canonical color names. Neutral wing area, skin and shaded armor can dominate a raw histogram; the chosen substantial identity color is documented below.

| Encounter | First color evidence | Second image color | Third image color |
| --- | --- | --- | --- |
| 보라검천사 / Violet | Name explicitly says purple: purple sword | Ivory/silver wings | Bronze trim |
| 뿔악마 / Horn | Bronze-olive armor | Moss olive | Copper/brown horns and trim |
| 발록 / Balrog | Ember orange sword and armor | Fire gold | Charcoal/red-brown armor |
| 가면 / Mask | Red-orange wing edges and aura | Ivory wings and body | Gold/copper trim |
| 루시퍼 / Lucifer | Substantial crimson robe | Ivory wings | Gold crown and trim |

The previous mint Horn and lavender Lucifer render palettes were inconsistent with the inspected sprites. Mask and Lucifer remain separate encounters; no identity merger or narrative inference follows from shared porcelain/feather material.

Hue-bin cross-check on alpha≥128 pixels, saturation>0.25 and value>0.2: Horn has 13,536 pixels in 30–60° with raw median #594d1f, then 7,629 warm-brown pixels and 2,369 olive pixels. Mask has 62,430 red-orange pixels in 0–30°. Lucifer has 45,575 warm wing/skin pixels in 0–30° and 21,198 crimson pixels in 330–360°. This confirms that a visual hierarchy is a documented choice rather than an automatic largest-bin result.

## Boss source byte checks

Source guide previously verified from Drive: https://drive.google.com/file/d/1KaI-E743hzYDdZNUbPg95I_nbWk5M_hb/view . The current deploy's atlases were read from the locally staged exact repository media, with fresh SHA-256 checks:

| File | SHA-256 |
| --- | --- |
| media/boss-motion-v8/violet-atlas-512.png | `8271ccb891a9ea88cee33aec9052ac0b427b3b4ace0b241f2dd04cdc136f6f24` |
| media/boss-motion-v8/horn-atlas-512.png | `1c3853aa55e9f6cf205329f361c83eac2422cf0e85275956769e88f503529d27` |
| media/boss-motion-v8/balrog-atlas-512.png | `3300f7c753b275d8c7c96e08e084cf800418ae8763b578519dc39386625ad667` |
| media/boss-motion-v8/mask-atlas-512.png | `460a8ea40d084791a0856a4a8d057df7f7e95817637dda3a8059e506cfe00ef1` |
| media/boss-motion-v8/lucifer-atlas-512.png | `06716474312bafc759bba028fb42660d6b626c67fba58f690a8014ac226600cd` |

## Projectile and beam sources

The existing authenticated Drive source inventory is recorded in `docs/DRIVE-VFX-20261028.json`. Its original pack hashes and byte-identical ORB entries remain applicable. These local source files were inspected again as actual pixels:

| Source | Interpretation |
| --- | --- |
| motion/runtime/violet_orb_cocoon-atlas.png | Dedicated purple silk-wrapped ORB, 4 finite keyframes, no seamless-loop claim |
| motion/runtime/lucifer_orb_eclipseiris-atlas.png | Dedicated dark iris ORB, 4 finite keyframes; palette tint is a presentation adaptation |
| pilot/runtime/violet/violet_blade_spindle.png | Authored purple spindle blade, static |
| pilot/runtime/balrog/balrog_blade_slagfang.png | Authored cinder/slag blade, static |
| pilot/runtime/false_angel/false_angel_needle_edictfeather.png | Authored ivory/gold feather projectile material, static; filename alone does not establish a canonical actor mapping |
| pilot/runtime/lucifer_mask/lucifer_blade_maskshard.png | Authored porcelain shard material, static; does not merge Mask and Lucifer |
| media/fx-v8/silver-slash.webp | Existing blue/silver slash atlas, source texture adaptation only |
| media/fx-v8/gold-slash.webp | Existing ember/gold slash atlas, source texture adaptation only |

No dedicated authored laser atlas was found in the available verified Drive packages. Any beam made from a stretched or tiled existing projectile/slash texture must be labelled a beam texture adaptation, not a newly authored laser animation. Collision length, radius, warning and damage phases remain owned by core.js.

The old `media/bullet.webp` was opened and has obvious magenta color-key blocks extending from the orb to the right. Its whole image is not an approved clean fallback. Do not use it to hide missing assets. Likewise the earlier rejected unlock atlas remains excluded.

No source Drive file or permission was changed, and no duplicate art was generated for this audit.
