/* 본보스 입장 독백. 문장은 모두 docs/v43/canonical-story.txt의 같은 제목 구역에서 그대로 옮긴 EGO의 1인칭 서술이다(새로 쓴 대사 없음).
 * 전투 전 회상(arcade-story-v43.js)에 이미 쓴 문장과는 겹치지 않는다.
 * 제2부의 9개 장면(10개 보스)은 arcade-boss-intros-v43.js에서 읽는다.
 * 아래 번호는 화면 표기(1~56)이며 getLine은 엔진의 0 기반 stageIndex를 받는다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HapilArcadeBossLines = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  var scenes = {
    1: {actor: "p1_tree", speaker: "EGO의 기억", text: "그래서 나는 다가오는 뿌리들을 향해 검을 들었다."},
    2: {actor: "violet", speaker: "EGO의 기억", text: "나는 인간에게 선을 선택할 여지가 남아 있다고 믿으며 무기를 들었다."},
    3: {actor: "p1_horn", speaker: "EGO의 기억", text: "나는 다가오는 얼굴과 비어 있는 기억 사이에 혼란스러워하며 검을 들지도 내리지도 못하고 있었다."},
    4: {actor: "p1_chaser", speaker: "EGO의 기억", text: "그 뒤의 중심만 보고 달려들면 양옆에서 둘러싸일 것 같았다."},
    5: {actor: "p1_comrade", speaker: "EGO의 기억", text: "내 얼굴을 보고 멈출 기색이 있는지, 무기를 밀어낼 때마다 그 눈을 다시 확인하곤 했다."},
    6: {actor: "p1_gate", speaker: "EGO의 기억", text: "문지기가 지나간 길을 따라가면 소환진 중심에 닿을 수 있을 것이다."},
    7: {actor: "balrog", speaker: "EGO의 기억", text: "가까이서 본 그 녀석은 내가 예상했던 것보다 훨씬 거대했다."},
    8: {actor: "mask", speaker: "EGO의 기억", text: "나는 치료를 받으면 영혼을 빼앗길까 봐 의료진을 경계하고 있었다."},
    9: {actor: "p1_staff", speaker: "EGO의 기억", text: "나는 손바닥보다 작은 약병에서 눈을 떼지 못했다."},
    10: {actor: "p1_seraph", speaker: "EGO의 기억", text: "초천사의 권능이란 자신이 적으로 인식하는 모든 존재를 지우는 힘이었다."},
    11: {actor: "lucifer", speaker: "EGO의 기억", text: "나를 지켜 준다던 존재가 오히려 도움을 주려는 사람들에게서 나를 떼어 놓고 있었다."},
    12: {actor: "lucifer", speaker: "EGO의 기억", text: "루시퍼는 내 오만과 두려움, 죄책감을 이용해 자신이 없으면 나는 아무것도 아니라고 믿게 하려 했다."},
    13: {actor: "p2_demons", speaker: "EGO의 기억", text: "나를 갉아먹던 트라우마와 약물 의존, 죄책감과 망상이 기괴한 형체를 갖추고 다가왔다."},
    23: {actor: "p3_legion", speaker: "EGO의 기억", text: "내 발이 앞으로 나아갈 때마다 폭격은 처음부터 다시 시작되고 있었다."},
    24: {actor: "p3_rampart", speaker: "EGO의 기억", text: "통제자는 내가 화를 낼 때마다 성벽을 높일 동력을 더 얻어 가곤 하였다."},
    25: {actor: "controller", speaker: "EGO의 기억", text: "다시 다가가려던 나는 문 앞에서 걸음을 멈췄다."},
    26: {actor: "controller", speaker: "EGO의 기억", text: "내 마음이 흔들릴수록 통제자의 그림자가 길어지고 있었다."},
    27: {actor: "p3_body", speaker: "EGO의 기억", text: "나는 눈앞에 놓인 차가운 육체를 자세히 살폈다."},
    28: {actor: "p3_gate", speaker: "EGO의 기억", text: "나는 검 자루를 세게 쥐었다가 천천히 힘을 풀었다."},
    29: {actor: "goblin", speaker: "EGO의 기억", text: "나는 환도가 울리는 공명을 나침반 삼아 들판을 걸었다."},
    30: {actor: "goblin", speaker: "EGO의 기억", text: "나는 늑대에게서 눈을 떼지 않은 채 소리가 흘러나오고 있는 곳을 찾았다."},
    31: {actor: "p4_knight", speaker: "EGO의 기억", text: "몸에 익은 자세로 돌아갈수록 내 움직임은 더 손쉽게 읽혔다."},
    32: {actor: "insomnia", speaker: "EGO의 기억", text: "마치 보이지 않는 실에 끌리는 것처럼 내게 달려들고 있었다."},
    33: {actor: "insomnia", speaker: "EGO의 기억", text: "나는 그들 사이를 누비며 불면귀의 본체만 집요하게 따라갔다."},
    34: {actor: "p5_cult", speaker: "EGO의 기억", text: "나는 코어를 방어하면서 적들이 어느 지점을 노리는지 유심히 보았다."},
    35: {actor: "p5_archon", speaker: "EGO의 기억", text: "첫 번째 관문 앞에서 나는 한 사람이 그 판정을 받는 광경을 목격했다."},
    36: {actor: "p5_common", speaker: "EGO의 기억", text: "나는 새로운 이름의 명령문을 읽을 때마다 다른 지옥에 왔다고 생각했다."},
    37: {actor: "p5_grand", speaker: "EGO의 기억", text: "나는 멈춰 선 자리에서 각 명령이 켜지고 꺼지는 주기를 다시 살폈다."},
    38: {actor: "p5_furnace", speaker: "EGO의 기억", text: "나는 이글거리는 불빛이 뺨에 닿는 자리까지 가까이 다가갔다."},
    39: {actor: "p5_neuron", speaker: "EGO의 기억", text: "싫다고 느끼는 동안에도 시스템의 지시는 한 발 앞서 내 사지를 움직이곤 하였다."},
    40: {actor: "p5_keeper", speaker: "EGO의 기억", text: "그 기억을 다시 땅에 묻을지 말지 정하는 일을, 이곳의 묘지기에게 맡겨 둘 수는 없었다."},
    41: {actor: "p5_rings", speaker: "EGO의 기억", text: "나는 굳게 잠긴 문에서 한 걸음 물러나, 그 앞을 가로막은 여섯 고리에 시간검을 겨누었다."},
    42: {actor: "arbelia", speaker: "EGO의 기억", text: "아르벨리아는 지친 인간에게 쉴 시간을 주곤 하였던 회복형 아르콘이었다."},
    43: {actor: "siren", speaker: "EGO의 기억", text: "검은 모래가 발등을 덮쳐 나는 급히 옆으로 자리를 옮겼다."},
    44: {actor: "chief", speaker: "EGO의 기억", text: "무너져 내린 성 안에서도 두 사람은 여전히 내가 다음 할 일을 일러 주기를 기다리고 있었다."},
    45: {actor: "p6_demons", speaker: "EGO의 기억", text: "나는 그들이 봉인을 마저 다 풀 때까지 앞쪽의 적들을 막아 냈다."},
    46: {actor: "chief", speaker: "EGO의 기억", text: "나는 두 사람이 정한 움직임에 호흡을 맞춰 검의 궤적을 바꾸었다."},
    47: {actor: "p7_car", speaker: "EGO의 기억", text: "나는 보행자 신호가 바뀌기를 기다리는 동안 깜빡이는 화면만 내려다보고 있었다."},
    48: {actor: "p7_shadow", speaker: "EGO의 기억", text: "나는 사고 직전으로 영상을 되돌려 다시 틀어 보곤 하였다."},
    49: {actor: "p7_alarm", speaker: "EGO의 기억", text: "나는 불이 나기 훨씬 전부터 두 문제를 모두 알고 있었다."},
    50: {actor: "executor", speaker: "EGO의 기억", text: "나는 집행체의 어깨 너머로 둥글게 이어진 도로를 유심히 살폈다."},
    51: {actor: "p8_chip", speaker: "EGO의 기억", text: "나는 가장 바깥쪽의 외곽 회로부터 하나씩 끊어 내기 시작했다."},
    52: {actor: "p8_collective", speaker: "EGO의 기억", text: "내가 조금 전까지 분명히 읽을 수 있었던 신도의 이름이 연결망 안에서 흔적도 없이 지워졌다."},
    53: {actor: "p8_lauren", speaker: "EGO의 기억", text: "나는 손에 쥐고 있던 환도를 내려다보았다."},
    54: {actor: "cultist", speaker: "EGO의 기억", text: "나는 두 가지 목표를 입속으로 다시 되뇌며 손안의 환도를 고쳐 쥐었다."},
    55: {actor: "rian", speaker: "EGO의 기억", text: "나는 그들의 등에서 시꺼먼 회로로 이어진 신경 다발을 바라보았다."},
    56: {actor: "cultist", speaker: "EGO의 기억", text: "간신히 붙들고 있던 내 기억도 안개처럼 다시 흐려지기 시작했다."}
  };

  function getLine(actor, stageIndex) {
    if (!Number.isInteger(stageIndex)) return null;
    var line = scenes[stageIndex + 1];
    return line && line.actor === actor ? line : null;
  }

  Object.values(scenes).forEach(Object.freeze);
  return Object.freeze({getLine: getLine});
});
