# V25 일반 체력 CPU 검증

Ordinary-health CPU isolated product-checkpoint phase3 practice. Nine legal movement directions, unchanged HP/damage/autoattack/skills. No777, external immunity, timer/actor/projectile/RNG rewrites, future emission reads or hidden inputs. Not fullstory/human/browser/GPU/mobile/device.

첫 정책: 103승 / 2패. 실패2개를 삭제하지 않고 별도 합법 이동 정책으로 재시도해2승을 기록했다. 105개 보스·난도 조합 모두 최소 한 번의 합법적 클리어 입력과 정확한 재생 기록이 있다.

기존21을 같은 정책으로 실행해도 색욕과 분노 HELL은 모두 패배했다. 색욕은 기존21과 새25의 입력과 결과가 동일하다. 이는 새 패턴이 불가능하다는 증거가 아니며, 자동 정책이 사람의 플레이 난도를 대신하지 않는다.

총 194854틱을 정확히 재생했고, 풀 압력과 탄환 그룹 누락은0이다.

| 보스 | 첫25정책 | 동일정책21대조 | 다른합법정책25 |
|---|---|---|---|
| asmodeus HELL | lost 2614틱 · 3피격 | lost 2614틱 · 3피격 | won 2797틱 · HP1 |
| wrath HELL | lost 2263틱 · 3피격 | lost 2198틱 · 3피격 | won 2768틱 · HP3 |

기록기 배열 비교 오류 수정 전후105개 결과와 입력 SHA는 전부 같았다. 최초 실패와 기록기 오류 로그도 남겼다. 실제 브라우저 입력, 실제 GPU 및 휴대폰 성능은 이 검사에 포함되지 않는다.
