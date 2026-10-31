# V25 보스별 소유 스킬 표현 검수

기준 `ef95fc227506162b5203092da9e1734e2f43ef58`. 제품 `src/boss-skills.js` SHA-256 `d3a61215ad24c66747b057dc06200e6c5091f22953e5e753abf676f50b2da863`. CPU 자산·시계 fixture 검사이며 실제 휴대전화 FPS나 자연 진행 검사는 아니다.

정본 전투 구성 35개 중 색욕 기준 전투는 유지하고 나머지 34개에 단계별 고유 cue를 연결했다. 별도 최종전 연습 경로는 본문 보스 수에 더하지 않았다. 탄환·레이저의 실제 피해는 기존 core/projectiles가 결정하며 여기서는 실제 시전 계획과 성공한 발사 기록만 표시한다.

54틱 동안 원점과 각도가 잠긴 신규 경고를 먼저 그린다. 동시 경고는 최대 4개라 low 4 / high 8 이미지 예산에서 모두 표시된다. 같은 원점의 일반 charge가 겹치면 한 번만 표시한다. 실패한 발사는 release 효과를 만들지 않는다.

스탬프는 소유 원본의 RGB·알파·종횡비를 보존하고 수직 공격 방향으로 회전한다. 보스 몸을 감싸는 흰 원이나 도형 대체 자산은 만들지 않았다. 2 MiB / 24개 캐시 한도를 유지한다.

| 구성 | 실제 경고 소스 예시 | 단계 cue | 보존 조건 |
|---|---|---|---|
| 0 보라검천사 | `h14SkillViolet` | woven-sword → inscribed-sword → severed-thread | 천사 모습은 전투 상대이며 인류 전부가 악이라는 단정으로 확장하지 않는다 |
| 1 늪지대의 뿔악마 | `h14SkillHorn` | sinking-grasp → closing-hands → horn-echo | 동료의 얼굴을 새 보스나 실제 죽음의 확정 증거로 만들지 않는다 |
| 2 발록 | `h14SkillBalrog` | space-cut → sky-fire → seven-seals | 소환진 붕괴 뒤 추락 서사 유지 |
| 3 초천사의 웃는 가면 | `h14SkillMask` | white-promise → perfect-command → mask-crack | 의료진이나 환자를 공격 대상으로 바꾸지 않는다 |
| 4 코스믹 가면 루시퍼 | `h14SkillLucifer` | false-constellation → many-faces → j-seal | J 인장은 환자의 선택과 도움 요청이며 악마의 투척 무기로 새로 주장하지 않는다 |
| 5 나태의 귀 벨페고르 | `h25SlothTissue` | late-trash → held-pulse → postponed-wave | 남자를 강제로 일으켜 세우는 승리 연출 금지 |
| 6 질투의 귀 레비아탄 | `h14SkillEnvy` | unequal-flows → crossed-gaze → reversed-reflection | 서윤/동생을 소환한 새 적으로 만들지 않는다 |
| 7 탐식의 귀 베엘제붑 | `h25GluttonKnife` | large-small-waves → kitchen-crossing → layered-maw | 정본의 조사·징계·치료가 악몽 승리로 취소되지 않는다 |
| 8 색욕의 귀 아스모데우스 | `h14SkillLust` | stage-beat → locked-spotlight → string-curtain | 이번 개선의 기준; 색욕 자산을 다른 보스에 재사용하지 않는다 |
| 9 탐욕의 귀 맘몬 | `h25GreedTreasure` | priced-branches → vault-lock → preserved-winter-memory | 어린 소년을 악의적 돈 공격자로 재해석하지 않는다; 어머니 죽음 책임을 아이에게 묻지 않는다 |
| 10 분노의 귀 | `h14SkillWrath` | spreading-fire → escape-corridor → bear-wolves-dragon | 먼저 대피하는 사람들과 세 아이는 적이 아니다 |
| 11 교만의 회장 | `h14SkillPride` | seven-branches → electrode-line → cyborg-bootloader | 제2부 회장과 제8부 최종 교주는 런타임 단계·서사 위치를 합치지 않는다 |
| 12 통제체계 · 방어의 군단 | `chapter3Lance` | defensive-legion → bombardment-loop → architecture-link | 공격으로 방어가 강화됨은 압박 단서; 아이·방어기제 자체의 영구 소멸을 목표로 하지 않는다 |
| 13 통제체계 · 잔인한 구원 | `chapter3Lance` | cruel-rescue → compassion-boundary → meaning-link | 기억 자체를 지우지 않는다; 통제자를 별개 네 명으로 분할하지 않는다 |
| 14 통제체계 · 시스템의 거부권 | `chapter3Lance` | veto-signal → hardware-migration → legacy-link | 인간성을 오류로 처리하거나 치료를 폭력의 정답으로 고정하지 않는다 |
| 15 통제체계 · 관리자 권한 | `chapter3Lance` | administrator-output → abuse-repeat-link → feedback-link | 학대 기억과 아이의 자아는 지울 대상이 아니다 |
| 16 통제체계 · 중앙 코어 이주실 | `chapter3Lance` | empty-vessel-link → constrained-choice → update-fork | 빈 육체 자체를 새 악마로 만들지 않는다; 인간으로 돌아가라는 강요도 피한다 |
| 17 통제자 · 기억의 문 | `chapter3Lance` | possessed-gate-link → repeat-link → released-ego-boundary | 기억의 문은 베지 않는다; 반복 명령 연결만 끊고 첫째 아이 해방 |
| 18 고블린 두목 | `storyGoblinWave` | flute-turn → wolf-path → rose-resonance | 고블린 전멸이 목표가 아니다; 두목에게서 장미 인장 받기 유지 |
| 19 타락천사 기사 | `storyKnightSword` | familiar-path → six-sword-positions → falling-wall | 정본의 패배·바다 추락 유지; 신규 승리 결말 금지 |
| 20 불면귀 | `storyInsomniaGaze` | sleepless-echo → resident-safe-mist → mist-heart | 주민 몸이 공격 대상이 아니다; 본체와 안개 연결 겨누기 |
| 21 최초명령 코어 방어 | `storyChronoCrescent` | intercepting-turret → polluted-command → protected-first-command | 코어 파괴가 목표가 아니다; 적의 목표도 코어 오염이지 코어 분쇄가 아니다 |
| 22 일반 수문장의 동력 연결 | `storyChronoCrescent` | overwork-bonds → comparison-command → power-junction | 48개 모두 별도 애니메이션 보스로 구현됐다고 주장하지 않는다 |
| 23 상급·대수문장의 교차 명령 | `storyChronoCrescent` | alternating-orders → crossed-rule-gap → chosen-step | 66 수문장이 66 런타임 독립 보스라는 주장 금지 |
| 24 검은 공방의 동력 접점 | `storyChronoCrescent` | tightening-order → preserved-time-pipe → furnace-junction | 유용한 시간만 구하는 심사 추가 금지; 공방의 개인 시간은 모두 보존 |
| 25 뉴런 게이트의 강제 연결 | `storyChronoCrescent` | preceding-cable → next-command-gap → forced-neural-link | 연결된 인간을 공격 주체의 새 캐릭터로 만들지 않는다 |
| 26 망각의 묘지 삭제 명령 | `storyChronoCrescent` | preserved-clock-shards → deletion-order → owners-records | memory-shards/personal-records 보호; 파편 부수기 보상 금지 |
| 27 붕괴 의식장의 여섯 명령 고리 | `storyChronoShard` | first-three-links → last-three-links → corridor-opening | 여섯 명령을 새로운 여섯 인물로 확정하지 않는다 |
| 28 아르벨리아의 변조 명령 | `storyChronoCrescent` | deferred-time → tampered-record-thread → autonomous-first-command | 아르벨리아와 쉼의 기록을 공격/삭제하지 않는다; 그녀 스스로 재작성 |
| 29 세이렌 모르 | `storyChronoShard` | time-harvest → optimized-fate → free-choice-window | 검은 모래 속 타인의 시간 파괴 금지; 실패 뒤 다시 선택하는 시간 남김 |
| 30 공동 EGO 코어를 빼앗은 우두머리 | `storyChiefBlade` | chosen-gate → owners-authority → returned-core | 두 아이를 적으로 바꾸거나 되찾은 코어를 환도 소유로 바꾸지 않는다 |
| 31 파란불 집행체 | `storyExecutorRoad` | scapegoat-refusal → three-causal-locks → preserved-guilt-records | 한 명만 주범 선택 금지; 실제 과실 기록 보존 |
| 32 흑장미단의 외곽 지배 회로 | `cultLance` | reverse-ego-occupation → interlocked-repeat → outer-command-link | bound-people/egos 보호; 괴물 형상 안 기억 소멸 금지 |
| 33 한리안·백이온의 합일 회로 | `storyRianCross` | rian-inverse-cross → ion-order-wall → shared-command-circuit | 세 번째 회로 배우는 새 인물이 아니다; 두 의목사 자아 보호 |
| 34 교만의 사이보그 교주 | `cultDriveImpact` | samong-fold → revival-stitch → authority-impact | 합일 코어 보존; 강제 명령/사이비 회로만 분리; 환도 몽세수호자 결말 |

새로운 소유 소품은 나태 휴지, 탐식 칼, 성인 맘몬의 돈·보물이다. 맘몬의 어린 기억 단계에는 돈·보물을 배정하지 않고 기존 소유 동전을 유지한다. 한리안·백이온 및 분신은 sourceActor/modelActor ID에 따라 역십자와 방패를 따로 쓴다. 교주 최종전은 Fold → Stitch → Impact 단계 소스를 사용한다.

검증: 신규 focused 6개 통과. 색욕 cue는 3단계 × 2품질 × charge/orb/laser × 4시점 = 72개 CPU 원시 픽셀 비교에서 v24와 동일했다. 전체 전투·저장·브라우저 검사 결과는 별도 최종 QA 기록을 따른다.

- First five retained four keyposes are not full continuous animations; no poses were regenerated.
- Most later skills are one static source drawing with finite source-only transforms, not newly authored frame cycles.
- Six controller rows share the same controller-system source arsenal; their casts and command-link roles differ without inventing six people.
- Chapter V configurations retain the same source-owned time machinery arsenal. No unsupported bespoke boss weapon artwork was invented.
- Skill accents are decorative origin cues. Projectile damage coverage and laser warnings remain independently owned by core/projectiles.
- This report does not certify ordinary-health progression, real GPU or real mobile device performance.

픽셀 대조: [owned-cues-v24-v25.jpg](v25-skill-pixels/owned-cues-v24-v25.jpg). 출처·정확한 바이트/해시·실제 metrics는 같은 이름의 JSON과 V25-CANONICAL-COMBAT-IDENTITIES, V25-RUNTIME-PROJECTILE-ASSETS 기록에 보존했다.
