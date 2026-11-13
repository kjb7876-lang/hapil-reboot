# v42 — 총집본: 원큐 여정 + 보스 체험

한 화면(`arcade.html`)에서 두 가지를 시작한다.

- **원큐 여정**: 1부 → 8부 스테이지 9개가 끊기지 않고 이어진다(잡몹 → 중간 보스 → 잡몹 → 보스). 시작 지점을 고를 수 있다.
- **보스 체험**: 고른 장의 중간 보스와 보스만 연달아 싸우고 끝난다(9장, 인물 15명).

옛 스토리판(`index.html`)의 전투 엔진과는 합치지 않았다. 대사·컷신이 있는 옛 스토리판은 그대로 두고 첫 화면의 버튼을 총집본으로 연결했다. 두 엔진을 한 엔진으로 합치는 일은 옛 스토리판 테스트 562개를 다시 써야 해서 이번 범위에서 뺐다.

## 일반 공격 아홉 가지 (수학·조형 검토)

| 무늬 | 식·원리 | 조형 근거 |
|---|---|---|
| 이중 나선 | 아르키메데스 나선 두 가닥이 반대로 돈다 | 대비되는 회전 |
| 리사주 | x = sin(3t + π/2), y = sin(2t) | 두 진동의 겹침 |
| 종곡선 | exp(−u²/2σ²) 속도 분포(가우스) | 가운데가 앞서는 종 모양 |
| 현수선 아치 | y = a·(cosh(x/a) − 1)을 뒤집음 | 가우디의 사슬 아치. 아치마다 세 칸의 문 |
| 엇갈린 고리 | 반 칸씩 어긋난 동심원 | 리듬 |
| 하이포사이클로이드 | 델토이드(k=3)·아스트로이드(k=4) 교대 | 구르는 원의 자취 |
| 해바라기 | i번째 씨앗: 각 i·137.5°, 거리 √i | 피보나치 잎차례(다빈치가 관찰한 나선 배열) |
| 심장형 | r = 1 − sin θ, 부푼 쪽이 영웅을 향함 | 방향성 있는 윤곽 |
| 초공식 | r = (｜cos(mθ/4)｜^n₂ + ｜sin(mθ/4)｜^n₃)^(−1/n₁) | 꽃·불가사리 같은 자연 윤곽 |

이름 붙은 패턴 37개(v41)는 그대로다. 일반 공격은 46번 나오며 아홉 가지가 차례로 돌아, 모든 보스가 세 가지 이상을 쓴다.

검토에서 확인한 것: 모든 도형은 단위원에 맞춰 정규화(가장 먼 점 = 1)되어 크기·속도가 일정하다. 해바라기의 이웃 씨앗 각은 황금각과 1e-6 이내로 일치한다. 색은 그 보스의 두 색만 쓰고(전체 6색 규칙 유지), 무늬 하나가 퍼지는 동안 다음 무늬가 겹치지 않도록 주기를 46~90틱으로 띄웠다.

"수학자·가우디·다빈치 검수"는 실제 사람의 검수가 아니라 위 식과 조형 원리에 비춰 내가 점검한 것이다.

## 검증 (전부 헤드리스)

- 새 테스트 `tests/arcade-v42.test.cjs` 6개: 새 곡선의 유한성·정규화, 일반 공격 9종, 일반 공격 46개 × 4조건 안전 통로, 보스 체험 9장(잡몹 0·그 장만·결정적), 원큐 여정 9스테이지 순서, 페이지 구성.
  - 이번에는 코드를 먼저 고치고 테스트를 뒤에 썼다(v41과 순서가 다름).
- 헤드리스 크롬: 보스 체험 시작 → BOSS CLEAR → 다시 도전, 새 무늬 6종 화면 확인, 콘솔 오류 0.
- 실제 휴대폰, 사람 손 플레이, 소리는 확인하지 못했다.

## 마지막 테스트 실행 결과

```
$ npm test   (2026-11-13, 전체)
ok 12 - v42 the new curves are finite, normalised point sets
ok 13 - v42 plain attacks come in nine geometric kinds and each boss shows more than one
ok 14 - v42 every plain attack leaves a lane on every difficulty
ok 15 - v42 boss experience fights only the chosen stage's mid boss and boss, then ends
ok 16 - v42 the one-shot journey is unchanged: all nine stages in order from a single start
ok 17 - v42 one page starts both modes and the story page points to it
…(나머지 572개 생략, 모두 ok)
# tests 578
# suites 0
# pass 578
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 733876.253967
```
