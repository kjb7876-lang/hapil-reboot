# 윤서하 아트 제작 기록

## A/B 공존

후속 요청에 따라 최초 소녀풍 디자인은 **윤서하 A**(`seoha`), v2의 성숙한 디자인은 **윤서하 B**(`seoha-b`)로 함께 선택할 수 있습니다. 기존 `seoha` 저장 기록과 초상·플레이어·필살 컷인은 A에 유지하고, B는 v2 자산을 별도로 사용합니다. 두 버전은 같은 시간공학 사격·필살·성장·피격 규칙을 공유합니다.

## v2: 성숙한 인상과 회화적 화풍

2026-11-17 추가 요청에 따라 기존 윤서하의 갈색 머리·땋음·기어 장식·시간검·시계·망토를 유지하고, 조금 더 성숙한 청년 인상으로 수정했습니다. 기억사수 컷인의 회화적 붓결을 참고했고 빨간 테니스 치마, 커피색 불투명 스타킹, 빨간 하이힐을 반영했습니다. 이 역시 외형의 새 시각 해석이며 서사 정본의 나이·복장 설정을 변경하지 않습니다.

| 파일 | 크기 | 바이트 | 용도 |
| --- | --- | --- | --- |
| seoha-portrait-v2.webp | 768×1152 | 231,374 | 수정 초상·오프닝·컷인 |
| seoha-player-v2.webp | 256×256 | 15,190 | 수정 후면 플레이어 |

내장 `image_gen`의 독립된 두 편집 호출을 사용했습니다. 초상은 기존 초상을 편집 대상으로, `media/arcade-v43-hero/cutin.webp`을 화풍 참조로 사용했습니다. 후면 플레이어는 기존 플레이어를 편집 대상으로, 완성된 v2 초상을 복장 참조로, 기억사수의 컷인과 `media/gunner.webp`을 각각 화풍·카메라 참조로 사용했습니다. 모든 입력은 편집 전에 확인했고, 완성된 두 이미지와 WebP 배포본을 각각 확인했습니다. 두 WebP의 크기·RGBA 모드·투명 픽셀과 불투명 픽셀을 검사했습니다. 알파를 유지한 크기 조절과 WebP 인코딩만 코드로 수행했습니다. 기존 파일은 보존합니다.

### v2 초상 최종 프롬프트

```text
Use case: style-transfer and identity-preserve. Asset type: transparent full-body character portrait for the existing bullet-hell game's selection screen and cut-in. Input image 1 is the EDIT TARGET, the original heroine Yoon Seoha. Input image 2 is a STYLE REFERENCE ONLY: the existing memory gunner's painterly cut-in. Revise image 1 while preserving the heroine's recognizable dark chestnut shoulder-length hair and small braid, bronze gear hair ornament, amber eyes, ivory high-collar blouse, navy engineer jacket and short flowing cape, bronze pocketwatch, clockwork focus floating over her left hand, and the slim turquoise time-engineering sword in her right hand pointing down. Make her look slightly more mature: a composed young adult woman in her early twenties, a thoughtful assured expression and refined facial proportions, still the same character. Replace the long navy skirt with a RED PLEATED TENNIS SKIRT of a tidy modest athletic fit, replace dark leggings with COFFEE-BROWN OPAQUE FULL-LENGTH TIGHTS, and replace boots with RED CLOSED-TOE HIGH-HEELED SHOES. Keep the outfit dignified and fully clothed, no sexualized pose or anatomical emphasis. Transfer the art finish toward image 2: sophisticated semi-realistic painterly fantasy-game illustration, visible elegant brushwork, textured cloth, natural soft face rendering, strongly modeled light and shadow, atmospheric blue-turquoise rim light, much less anime cel shading. Do not copy the gunner's identity, hood, gun, armor, or color scheme; image 2 supplies painting technique only. Full body, three-quarter front view, same gentle standing hero pose, centered vertical 2:3 framing, entire hair, hands, sword and red heels visible with clean margins. Navy, ivory, antique brass, clear turquoise accents plus the requested red skirt and shoes. Transparent background with real alpha, no scenery, no opaque mist background, no ground plane, clean cutout. Restrained light only around the time sword and small clockwork focus. No text, logos or watermark. One character only.
```

### v2 플레이어 최종 프롬프트

```text
Use case: style-transfer and identity-preserve. Asset type: ONE transparent rear-facing player sprite for a vertical bullet-hell game. Input image 1 is the EDIT TARGET: Yoon Seoha's existing rear-facing game sprite. Input image 2 is her APPROVED NEW DESIGN and must determine her outfit, proportions, hair and materials. Input image 3 is the existing memory gunner's PAINTERLY STYLE reference only. Input image 4 is the existing gunner's overhead/rear gameplay-view reference only. Edit the heroine in image 1 to match image 2: a composed young adult woman, chestnut bob-length hair with a small braid and bronze gear ornament, navy short engineer cape with brass trim, ivory sleeves, RED PLEATED TENNIS SKIRT, COFFEE-BROWN OPAQUE FULL-LENGTH TIGHTS, and RED CLOSED-TOE HIGH-HEELED SHOES. Preserve her bronze pocketwatch, small clockwork focus in her left hand and turquoise time-engineering sword in her right hand. Keep the sword short and close to the body for a compact readable gameplay silhouette. The camera looks from high above and behind; she faces screen TOP and travels upward, her back and back of head visible, legs gently trailing downward. Entire character and shoes visible with transparent margin. No face turned toward the viewer. Draw ONE pose on ONE square canvas, centered on torso, body fills roughly 88% height with a compact width. Same attractive semi-realistic painterly fantasy style as image 2 and image 3, elegant brushwork and navy/ivory/antique-brass material definition, but simplify tiny details for readability at 64px display size. Do not adopt the gunner's hood, gun, armor or identity. Keep the heroine dignified, fully clothed, neutral gameplay stance, no sexualized pose or anatomy emphasis. True transparent background with real alpha, no scenery, no floor, no shadow plane, no surrounding aura or circles, no opaque mist; only a restrained turquoise edge on the sword. No spritesheet, no duplicate characters, no text, no watermark.
```


## 최초 버전 기록

최초 버전과 생성 기록도 보존합니다.

사용자가 요청한 소녀 시절의 시간공학 능력자 콘셉트를 위해 만든 새 시각 해석입니다. 외모, 복장, 장신구는 원전의 확정 설정이라고 주장하지 않습니다. 카이로스 아카데미움, 시간검, 시간공학, 인간의 시간 선택권이라는 개념은 `docs/v43/canonical-story.txt`의 「최초명령의 세계」·「예순여섯 수문장」을 참고했습니다. 특정 동방 캐릭터의 복장·무기를 복제하지 않은 독자 디자인입니다.

## 최초 버전 파일

| 파일 | 크기 | 바이트 | 용도 |
| --- | --- | --- | --- |
| seoha-portrait.webp | 768×1152 | 185,742 | 선택 화면·오프닝·컷인 |
| seoha-player.webp | 256×256 | 15,538 | 위쪽 진행 방향의 후면 플레이어 |

원본 PNG는 이미지 생성 결과로 별도 보존하며 배포에는 위 WebP만 포함합니다.

모두 RGBA 알파를 포함합니다. 배포 WebP에는 크기 변환과 포맷 인코딩만 적용했습니다. 이미지 재설계·배경 제거를 코드로 수행하지 않았습니다. 플레이어는 정사각 텍스처 중심 (0.5, 0.5)을 기준으로 사용하며, 표시 그림의 검·의상 외곽을 충돌 판정으로 사용하지 않습니다. 그림은 정지된 단일 포즈이므로 엔진 부유 애니메이션과 함께 사용할 수 있습니다.

## 최초 버전 생성 방식

2026-11-17, 내장 `image_gen`, 두 호출 모두 `transparent_background: true`.
첫 번째는 새 이미지 생성, 두 번째는 `seoha-portrait.png`를 로컬 참조 이미지로 사용했습니다. 별도 API 키·CLI는 사용하지 않았습니다.

## 최초 버전 초상 최종 프롬프트

```text
Use case: stylized-concept. Asset type: premium 2D bullet-hell game character-selection and cinematic portrait, full-body transparent PNG cutout, vertical composition. Create a new ORIGINAL character: Yoon Seoha as a teenage girl at the Kairos academy, a thoughtful time-engineering student who protects people's freedom to choose their own time. This is a NEW VISUAL INTERPRETATION, not a depiction of an existing anime character. Style: refined Japanese indie bullet-hell character illustration with a restrained Korean ink-wash fantasy atmosphere; slightly moe expressive large amber eyes, soft youthful face, polished linework and hand-painted cel shading, confident yet gentle. Her identity: dark chestnut shoulder-length hair, a small asymmetric braid, a modest ivory high-collar blouse and navy academy engineer jacket, short navy shoulder cape with bronze mechanical trim, knee-covering pleated skirt, opaque dark leggings and practical lace-up boots. A bronze gear-shaped hair clip, small pocketwatch on a belt chain, leather field-notebook pouch. She holds an elegant slim time-engineering sword with a translucent turquoise blade in her right hand, pointing diagonally downward; her left hand adjusts a compact bronze mechanical clockwork focus floating just above her palm. A small single turquoise chronometric arc suggests measured time magic without overwhelming the silhouette. Full body entirely visible, slight three-quarter front view, looking toward viewer, feet near the same baseline; centered composition with generous clear margins around head, sword and boots. Tasteful muted navy, ivory, antique brass and clear turquoise accents; no background, real alpha transparency, no cast ground plane. Not sexualized, no cleavage, no bare thighs, no school fetish elements. Avoid maid outfit, knives, familiar Touhou character costume, huge hats, giant bows, logos, watermarks, text, frame, circles enclosing the whole character. Important: a clean readable silhouette that remains attractive at 300px display height, beautiful hands with five fingers, one sword only.
```

## 최초 버전 플레이어 최종 프롬프트

```text
Use case: game-asset character sprite, precise art direction. Create ONE separate transparent full-body player sprite based exactly on the attached original Yoon Seoha character design. Preserve her dark chestnut bob-length hair with small braid, bronze gear hair ornament, navy short academy-engineer cape with brass edge, ivory sleeves, modest long navy pleated skirt covering the knees, opaque dark leggings, brown boots, turquoise time-engineering sword and bronze clockwork focus. IMPORTANT CAMERA: rear-facing view, looking toward the TOP of the image, from a high 65-degree overhead viewpoint for a vertically scrolling bullet-hell game. The back of the head, shoulders and cape are visible, NO portrait face facing viewer. She floats forward toward screen-top, both boots trail gently downward, arms slightly apart, compact turquoise blade held close alongside right arm and a tiny clockwork focus near left hand. Keep her entire body within a compact, vertically symmetrical silhouette, with hair and cape gently flowing toward the bottom. Center of the torso and actual player hitpoint should be very near image center, balanced left/right. Clear identity at tiny 42-64px game size, 2D painted anime sprite, clean decisive shapes, polished outline, modest level of detail appropriate for a small sprite. ONE character in ONE pose only, centered on a square canvas, body fills roughly 80% height and 60% width with generous transparent margins, no spritesheet, no multiple characters or poses, no label. True transparent background with real alpha, no background color, no ground plane or shadow, no giant surrounding aura or rings, no soft glow that fills the canvas. Crisp edges with restrained turquoise magical light only along the blade. Consistent navy/ivory/brass palette from the reference. Fully clothed and nonsexual. This is an ORIGINAL game character, do not copy a Touhou character or use maid costume, knives, giant hats, bows, logos or watermarks.
```

