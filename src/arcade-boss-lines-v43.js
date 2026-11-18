/* 본보스 입장용 한국어 각색. 근거는 docs/v43/canonical-story.txt의 같은 제목 구역이다.
 * 전용 대사가 있는 제2부의 9개 장면은 arcade-boss-intros-v43.js에서 읽는다.
 * 아래 번호는 화면 표기(1~56)이며 getLine은 엔진의 0 기반 stageIndex를 받는다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HapilArcadeBossLines = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  var scenes = {
    1: {actor: "p1_tree", speaker: "악마화 나무 · 속삭임", text: "이름 하나만 놓고 가렴. 아픈 기억도 그 이름을 따라갈 테니."},
    2: {actor: "violet", speaker: "보라검 천사", text: "배가 고파 본 적 있니? 그래도 네가 선할 수 있을 것 같아?"},
    3: {actor: "p1_horn", speaker: "뿔악마", text: "물 밑을 봐. 저 얼굴들은 알아보면서 마지막 모습은 왜 기억 못 하지?"},
    4: {actor: "p1_chaser", speaker: "핏빛 추격자", text: "저 녀석은 불길만 본다. 너희는 기둥 양옆을 돌아!"},
    5: {actor: "p1_comrade", speaker: "갑옷 속 메아리", text: "이 문양, 알아보겠나? 그럼 이번에도 검을 거두겠군."},
    6: {actor: "p1_gate", speaker: "문지기", text: "채찍 자국을 잘도 따라왔군. 다음 자국이 어디 날지도 보이나?"},
    7: {actor: "balrog", speaker: "발록", text: "기둥 하나면 숨을 만하겠지. 그 뒤의 하늘까지 가려 보아라."},
    8: {actor: "mask", speaker: "웃는 가면 · 환청", text: "흰 가운이 보이니? 눈을 감아. 내 목소리만 들으면 돼."},
    9: {actor: "p1_staff", speaker: "문밖의 의료진", text: "문 좀 열어 주세요. 약병은 거기 두세요. 제가 여기 있어요."},
    10: {actor: "p1_seraph", speaker: "초천사", text: "고맙구나, 수호자여. 이제 내가 누구를 적으로 보는지 잘 보아라."},
    11: {actor: "lucifer", speaker: "천사의 목소리", text: "손목의 이름표를 왜 보니? 내가 불러 준 이름을 기억하렴."},
    12: {actor: "lucifer", speaker: "루시퍼", text: "도와 달라고? 네가 지킨다는 사람들 앞에서, 그 말을 해 보겠느냐?"},
    13: {actor: "p2_demons", speaker: "일흔두 악마", text: "우릴 다 베면 또 영웅이겠지. 그 이름, 아직도 갖고 싶잖아?"},
    23: {actor: "p3_legion", speaker: "강철 군단 · 구령", text: "앞줄, 한 걸음. 뒷줄, 같은 자리. 아이 앞에 빈틈을 두지 마라."},
    24: {actor: "p3_rampart", speaker: "통제자", text: "화를 더 내도 좋다. 네가 칼을 세울 때마다 이 벽이 자란다."},
    25: {actor: "controller", speaker: "통제자", text: "문턱에서 발을 떼. 아이에게는 그 한 발도 침입이야."},
    26: {actor: "controller", speaker: "통제자", text: "기도를 계속해. 네가 힘을 보탤 때마다 내 목소리가 또렷해지지?"},
    27: {actor: "p3_body", speaker: "통제자", text: "이 몸은 아프지 않아. 들어오렴. 열어 둔 문은 여기 하나야."},
    28: {actor: "p3_gate", speaker: "기억의 문 · 통제자", text: "문을 억지로 열어 보겠어? 네 칼이 먼저 닿을 건 이 아이의 상처야."},
    29: {actor: "goblin", speaker: "고블린 두목", text: "눈 떴으면 칼부터 내려놔. 풀숲에서 널 보는 눈이 몇 쌍인 줄 알아?"},
    30: {actor: "goblin", speaker: "고블린 두목", text: "늑대들이 네 칼만 보지? 이 숲에선 내 피리를 듣거든."},
    31: {actor: "p4_knight", speaker: "타락천사 기사", text: "또 그쪽 발부터 빼는군. 거긴 내 검이 먼저 가 있다."},
    32: {actor: "insomnia", speaker: "마루 밑의 목소리", text: "아직 깨어 있지? 옆집도, 그 옆집도. 네 숨소리까지 들려."},
    33: {actor: "insomnia", speaker: "불면귀", text: "한 모금 마셨구나. 그 무거운 눈으로 어느 쪽이 나인지 보이니?"},
    34: {actor: "p5_cult", speaker: "크로노보로스 교단", text: "쉬어 버린 한 시간까지 세어라. 우리에게 건네지 못할 시간은 없다."},
    35: {actor: "p5_archon", speaker: "아르콘 수문장", text: "관문 앞에 멈춰라. 네 시간을 어디에 썼는지 용도를 밝혀라."},
    36: {actor: "p5_common", speaker: "일반 수문장", text: "숨 고를 시간은 남겨 두었나? 여기선 멈춘 만큼 모래로 받는다."},
    37: {actor: "p5_grand", speaker: "대수문장", text: "첫 명령이 풀렸군. 그래, 다음 발도 마음대로 뗄 수 있을까?"},
    38: {actor: "p5_furnace", speaker: "공방 안내", text: "마치지 못한 편지는 이쪽입니다. 잉크가 덜 말라도 잘 탑니다."},
    39: {actor: "p5_neuron", speaker: "노이론 게이트", text: "한 걸음 앞으로. 네가 싫다고 말할 때쯤엔 발이 닿아 있을 거야."},
    40: {actor: "p5_keeper", speaker: "묘지기", text: "그 비석은 닫아 두게. 무덤 주인이 살아서 다시 아파할 테니."},
    41: {actor: "p5_rings", speaker: "회랑 안내", text: "문은 잠겼습니다. 이제 잘못된 길로 들어서실 염려가 없습니다."},
    42: {actor: "arbelia", speaker: "아르벨리아", text: "이 오후엔 아무 기록도 없군요. 내가 쉬게 해 드린 오후였는데……."},
    43: {actor: "siren", speaker: "세이렌 모르", text: "네가 망쳤다고 여긴 하루를 내게 다오. 다음 하루도 내가 고르마."},
    44: {actor: "chief", speaker: "악몽의 우두머리", text: "창은 둘인데 입은 하나군. 네가 잠잠해져도 저 문을 지킬 수 있을까?"},
    45: {actor: "p6_demons", speaker: "성 밖의 악마들", text: "한 놈은 왼쪽 문으로! 저 둘이 봉인을 다 풀기 전에 밀어붙여!"},
    46: {actor: "chief", speaker: "악몽의 우두머리", text: "코어가 왜 저 둘에게 대답하지? 칼잡이는 여기 내 앞에 있는데!"},
    47: {actor: "p7_car", speaker: "윤하람 · 속말", text: "파란불이다. 엄마한텐 길 건너서 전화하면 돼."},
    48: {actor: "p7_shadow", speaker: "장민재 · 속말", text: "영상을 한 번만 더 돌려 주세요. 제가 핸들을 꺾기 바로 전이요."},
    49: {actor: "p7_alarm", speaker: "고서진 · 속말", text: "그 경보, 고장 난 줄 알았어요. 다음 주면 부품이 온다고 했어요."},
    50: {actor: "executor", speaker: "파란불 집행체", text: "이름 넷 중 하나에 동그라미를 쳐. 남은 셋은 집에 보내 주마."},
    51: {actor: "p8_chip", speaker: "전자 칩 · 수신 음성", text: "접속됐습니다. 교주님의 말씀이 들리면 그대로 듣고 계십시오."},
    52: {actor: "p8_collective", speaker: "집단 자아", text: "한 사람 더 들어왔다. 이름은 들었는데…… 우리 이름이 뭐였지?"},
    53: {actor: "p8_lauren", speaker: "라우렌 기사의 기억", text: "그 성의 창문, 기억나? 네가 보던 하늘은 내 쪽에선 안 보였지."},
    54: {actor: "cultist", speaker: "교주", text: "내 회로에 칼을 대겠다고? 그 선마다 누구의 꿈이 걸렸는지 보아라."},
    55: {actor: "rian", speaker: "수확실의 속삭임", text: "내 이름을 주면 산대. 넌 정말 그 칼 하나 들고 혼자 죽을 수 있어?"},
    56: {actor: "cultist", speaker: "교주", text: "발을 어디에 디딜 셈이냐. 이 제단에선 바닥도 내 손끝을 따른다."}
  };

  function getLine(actor, stageIndex) {
    if (!Number.isInteger(stageIndex)) return null;
    var line = scenes[stageIndex + 1];
    return line && line.actor === actor ? line : null;
  }

  Object.values(scenes).forEach(Object.freeze);
  return Object.freeze({getLine: getLine});
});
