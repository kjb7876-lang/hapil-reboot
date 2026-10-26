# 합일 · 기억 회랑 — 발록전 v6.1 실 연결 후보

기존 v5의 전투·저장을 보존하고 Google Drive의 실제 몬스터 자세와 탄막 그림을 연결한 독립 세로 탄막 게임입니다. 기존 hapil1 저장소·main·공개 배포 및 v1–v6 결과물은 변경하지 않았습니다. 새 이미지와 음원을 생성하지 않았습니다.

## v6.1 변경과 확장 준비

현재 구현된 일반 몹 3종과 보스 3종 모두에 가느다란 중립색 실을 연결했습니다. 실은 몸 뒤에서 실제 위치·자세·회전을 따르며 피해 판정이 없습니다. 일시정지 시 움직임도 멈춥니다. 기존 정지 등장 컷인과 과거 비캠페인 저장의 연출은 유지합니다.

**이번 실행본의 진행 범위는 발록전까지입니다. 병원부터 코스믹 가면 루시퍼까지의 새 전투는 아직 구현하지 않았습니다.** `docs/DCOS-LUCIFER-PROMPTS-KO.md`는 그 확장을 위한 보스 연속 동작·탄환 제작 요청서입니다. 새 자산 제작이나 dcos 전송은 여기서 실행하지 않았습니다.

## 계승한 v6 내용

- 보라검천사·뿔악마·발록: 같은 인물의 대기·이동·공격·피격 그림 4개씩을 실제 행동 상태에 연결했습니다. 자세마다 몸 기준점을 맞추고 준비·이동·반동을 더했습니다. 4자세 전환이며 완성된 연속 프레임 애니메이션은 아닙니다.
- 거미: 기존 거미 그림의 자세 전환과 실제 위치를 따르는 실 매달림·하강·퇴장 연출입니다. 거미줄은 장식이며 공격 판정이 없습니다.
- 늪/성채 일반 적: 도형 몸체를 스토리월드의 녹색 슬라임·붉은 균열 가고일 그림으로 바꿨습니다. 해당 적의 역할에 맞게 기존 그림을 재사용했습니다.
- 탄막: 실제 불꽃·갈대·바람 화살 그림을 사용하고 보라 거미줄·늪 파문을 보스 시전에 연결했습니다. 탄의 원/캡슐 피격 범위는 불투명 몸체와 테두리로 표시하며 그림의 투명 부분이 판정을 바꾸지 않습니다.
- 7웨이브·3보스·9패턴, 자동 공격/조준/스킬, 예고→실제 레이저→무해한 잔광, 2.5초 등장 연출·건너뛰기·재도전 생략을 유지합니다. core.js와 storage.js는 v5와 같은 바이트입니다.

## 실행과 조작

`HAPIL-Balrog-v6.1-candidate.html`은 코드·이미지·음원을 포함한 단일 파일입니다. 다운로드 후 브라우저에서 여세요.

- PC: WASD/방향키 이동, Shift 정밀 이동, Space/Escape 일시정지, C 스킬 자동 순환 켜기/끄기.
- 모바일: 화면 또는 하단 패드 상대 드래그. 공격·조준·스킬은 자동입니다.
- 보스 등장 연출은 버튼/Enter로 건너뛰며, 같은 재도전 흐름에서 이미 본 연출은 생략합니다.
- 보스별 연습과 안전 구간 이어하기를 제공합니다.

file:// 실행은 세션 임시 저장입니다. 웹에서는 기존 리부트 DB `hapil.reboot.firstbattle.v1`을 유지합니다. 파일과 주소 사이의 저장을 자동 이전하지 않습니다. v3 저장은 이전 짧은 전투, v4/v5 캠페인 저장은 같은 규칙으로 이어갑니다.

## 직접 업로드 및 소스

`HAPIL-GitHub-Upload-v6.1-candidate.zip`을 풀어 사용자가 선택한 별도 저장소에 올리세요. index.html, styles.css, src, media 폴더를 같은 루트 구조로 유지하세요. 업로드 ZIP은 작은 개별 파일로 나뉜 배포본이며 ZIP 자체는 실행 페이지가 아닙니다. GitHub 업로드·병합·배포는 수행하지 않았습니다.

`HAPIL-Balrog-Source-v6.1-candidate.zip`은 수정 가능한 소스, 실제 사용 자산, 출처·계약·검수 기록을 포함합니다. Drive 인증 URL과 원본 대형 ZIP은 포함하지 않습니다. 이번 dcos 요청은 기존 인물의 정체성을 유지하면서 4자세 사이를 자연스럽게 잇는 새 연속 동작과 차별화된 탄환을 제작하는 명세입니다. `docs/DCOS-LUCIFER-PROMPTS-KO.md`를 먼저 확인하세요.

## 검증 및 남은 일

```sh
node --test tests/core.test.cjs tests/storage.test.cjs tests/renderer-contract.test.cjs tests/ui-contract.test.cjs tests/campaign.test.cjs tests/campaign-storage.test.cjs tests/render-v4.test.cjs tests/render-v5.test.cjs tests/actors-v6.test.cjs tests/projectiles-v6.test.cjs
python3 tools/verify-assets.py
python3 tools/verify-connected-maps.py
python3 tools/verify-combat-assets.py
python3 tools/verify-actor-assets-v6.py
python3 tools/verify-fx-v6.py
python3 tools/build.py
python3 tools/verify-package.py
```

현재 변경 검증은 `qa/revision6_1-*`입니다. `qa/revision6-*`는 v6 자산·전투 검증 기록입니다. 이전 revision과 history 자료는 과거 기록입니다. CPU 화면 합성·Node 논리 검사·파일 검수는 실제 브라우저·GPU·모바일·오디오·IndexedDB 통합 검증을 대신하지 않습니다. 해당 검증은 미완료이며 이전 Chromium 실패를 재시도하거나 보안 설정을 바꾸지 않았습니다.

등록된 런타임 이미지를 모두 사전 로드합니다. 크기에서 계산한 이미지 RGBA 비용은 약 125.21 MiB이며, base64 HTML 문자열·오디오·브라우저 복사본·캔버스 캐시는 추가입니다. 실제 기기 메모리나 모바일 성능을 측정한 수치가 아닙니다.

연결맵 v1 12개는 첫 3웨이브와 보라검천사 구간에 유지합니다. 확장맵 v2는 상속한 끝 타일이 현재 v1과 1,278픽셀 달라 계속 보류합니다. 늪/성/발록에는 기존 배경을 사용합니다.
