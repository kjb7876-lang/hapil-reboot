# v36 기존 자산 전수 인벤토리

기준 f616a344cfdc03af2bbc7cf98a17e2126123a4c0. 추적 자산 299개, 이미지 296개 전부 디코딩·알파 전수 스캔, 오디오 3개 ffprobe 메타데이터 확인. 원본 수정0개.

상세 경로·해시·크기·디코딩 규격·알파·등록 키·기존 출처 문서·프레임/크롭 계약은 [JSON](asset-audit.json)에 기록했습니다. 새 자산을 내려받거나 라이선스를 새로 판정한 작업은 아닙니다. 기존 자산에 CC0/상업 이용 가능 표시를 새로 부여하지 않았습니다.

누락 등록 파일 0, 디코딩 오류 0, 계약 문제 0. 미등록 파일 11, 모바일 로드 계획에 없는 등록 키 42개는 역사적/선택 경로를 포함하므로 삭제 대상으로 단정하지 않습니다.

## 재사용 후보

|키|파일|실제 크기|알파|등록된 프레임/크롭 정보|
|---|---|---:|---|---|
|fxResonance|media/combat/fx01-resonance-impact-v2-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxSlash|media/combat/fx02-golden-slash-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxThorns|media/combat/fx03-violet-thorns-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxArrow|media/combat/fx04-wind-arrow-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxParry|media/combat/fx05-parry-ring-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxSilk|media/combat/fx06-spider-silk-atlas.webp|512×512|투명 포함|4프레임/256px셀|
|fxWindArrow8V6|media/fx-v6/wind-arrow-8.webp|1024×512|투명 포함|8프레임/256px셀|
|shot|media/shot.webp|256×96|투명 포함||
|storyPlayerHandoSlash|media/story-v19/player-hando-slash.png|512×341|투명 포함|crop [52,88,399,185]|
|storyPlayerSeohaSlash|media/story-v19/player-seoha-slash.png|362×362|투명 포함|crop [17,24,328,313]|
|fxV8Ember|media/fx-v8/ember.webp|512×512|투명 포함|16프레임|
|fxV8GoldSlash|media/fx-v8/gold-slash.webp|512×256|투명 포함|8프레임|
|fxV8SilverSlash|media/fx-v8/silver-slash.webp|512×512|투명 포함|16프레임|

## 범위와 한계

- 이미지 모든 픽셀의 알파 통계는 완전 스캔이며 source-side RGBA 바이트 합은 동시 GPU 텍스처 메모리가 아닙니다.
- 인코딩/디코딩 픽셀 중복은 SHA-256 동등성만 의미합니다. 비슷한 그림이나 중복 기능을 자동 판정하지 않습니다.
- 참조는 런타임 리터럴·수출된 계약·36개 실제 로드 계획을 결합했습니다. 문자열 조립, 과거 모드, 향후 선택 로더 때문에 계획에 없다는 사실만으로 미사용을 확정하지 않습니다.
- 외부 상용 탄막 게임의 원본 그림·소리·코드를 가져오지 않았습니다.
- 소스 미디어 해시는 감사 시작/끝에 동일함을 확인했습니다.
