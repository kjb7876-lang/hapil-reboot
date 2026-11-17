# 윤서하 아트 제작 기록

사용자가 요청한 소녀 시절의 시간공학 능력자 콘셉트를 위해 만든 새 시각 해석입니다. 외모, 복장, 장신구는 원전의 확정 설정이라고 주장하지 않습니다. 카이로스 아카데미움, 시간검, 시간공학, 인간의 시간 선택권이라는 개념은 `docs/v43/canonical-story.txt`의 「최초명령의 세계」·「예순여섯 수문장」을 참고했습니다. 특정 동방 캐릭터의 복장·무기를 복제하지 않은 독자 디자인입니다.

## 파일

| 파일 | 크기 | 바이트 | 용도 |
| --- | --- | --- | --- |
| seoha-portrait.webp | 768×1152 | 185,742 | 선택 화면·오프닝·컷인 |
| seoha-player.webp | 256×256 | 15,538 | 위쪽 진행 방향의 후면 플레이어 |

원본 PNG는 이미지 생성 결과로 별도 보존하며 배포에는 위 WebP만 포함합니다.

모두 RGBA 알파를 포함합니다. 배포 WebP에는 크기 변환과 포맷 인코딩만 적용했습니다. 이미지 재설계·배경 제거를 코드로 수행하지 않았습니다. 플레이어는 정사각 텍스처 중심 (0.5, 0.5)을 기준으로 사용하며, 표시 그림의 검·의상 외곽을 충돌 판정으로 사용하지 않습니다. 그림은 정지된 단일 포즈이므로 엔진 부유 애니메이션과 함께 사용할 수 있습니다.

## 생성 방식

2026-11-17, 내장 `image_gen`, 두 호출 모두 `transparent_background: true`.
첫 번째는 새 이미지 생성, 두 번째는 `seoha-portrait.png`를 로컬 참조 이미지로 사용했습니다. 별도 API 키·CLI는 사용하지 않았습니다.

## 초상 최종 프롬프트

```text
Use case: stylized-concept. Asset type: premium 2D bullet-hell game character-selection and cinematic portrait, full-body transparent PNG cutout, vertical composition. Create a new ORIGINAL character: Yoon Seoha as a teenage girl at the Kairos academy, a thoughtful time-engineering student who protects people's freedom to choose their own time. This is a NEW VISUAL INTERPRETATION, not a depiction of an existing anime character. Style: refined Japanese indie bullet-hell character illustration with a restrained Korean ink-wash fantasy atmosphere; slightly moe expressive large amber eyes, soft youthful face, polished linework and hand-painted cel shading, confident yet gentle. Her identity: dark chestnut shoulder-length hair, a small asymmetric braid, a modest ivory high-collar blouse and navy academy engineer jacket, short navy shoulder cape with bronze mechanical trim, knee-covering pleated skirt, opaque dark leggings and practical lace-up boots. A bronze gear-shaped hair clip, small pocketwatch on a belt chain, leather field-notebook pouch. She holds an elegant slim time-engineering sword with a translucent turquoise blade in her right hand, pointing diagonally downward; her left hand adjusts a compact bronze mechanical clockwork focus floating just above her palm. A small single turquoise chronometric arc suggests measured time magic without overwhelming the silhouette. Full body entirely visible, slight three-quarter front view, looking toward viewer, feet near the same baseline; centered composition with generous clear margins around head, sword and boots. Tasteful muted navy, ivory, antique brass and clear turquoise accents; no background, real alpha transparency, no cast ground plane. Not sexualized, no cleavage, no bare thighs, no school fetish elements. Avoid maid outfit, knives, familiar Touhou character costume, huge hats, giant bows, logos, watermarks, text, frame, circles enclosing the whole character. Important: a clean readable silhouette that remains attractive at 300px display height, beautiful hands with five fingers, one sword only.
```

## 플레이어 최종 프롬프트

```text
Use case: game-asset character sprite, precise art direction. Create ONE separate transparent full-body player sprite based exactly on the attached original Yoon Seoha character design. Preserve her dark chestnut bob-length hair with small braid, bronze gear hair ornament, navy short academy-engineer cape with brass edge, ivory sleeves, modest long navy pleated skirt covering the knees, opaque dark leggings, brown boots, turquoise time-engineering sword and bronze clockwork focus. IMPORTANT CAMERA: rear-facing view, looking toward the TOP of the image, from a high 65-degree overhead viewpoint for a vertically scrolling bullet-hell game. The back of the head, shoulders and cape are visible, NO portrait face facing viewer. She floats forward toward screen-top, both boots trail gently downward, arms slightly apart, compact turquoise blade held close alongside right arm and a tiny clockwork focus near left hand. Keep her entire body within a compact, vertically symmetrical silhouette, with hair and cape gently flowing toward the bottom. Center of the torso and actual player hitpoint should be very near image center, balanced left/right. Clear identity at tiny 42-64px game size, 2D painted anime sprite, clean decisive shapes, polished outline, modest level of detail appropriate for a small sprite. ONE character in ONE pose only, centered on a square canvas, body fills roughly 80% height and 60% width with generous transparent margins, no spritesheet, no multiple characters or poses, no label. True transparent background with real alpha, no background color, no ground plane or shadow, no giant surrounding aura or rings, no soft glow that fills the canvas. Crisp edges with restrained turquoise magical light only along the blade. Consistent navy/ivory/brass palette from the reference. Fully clothed and nonsexual. This is an ORIGINAL game character, do not copy a Touhou character or use maid costume, knives, giant hats, bows, logos or watermarks.
```

