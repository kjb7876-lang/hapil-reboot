/* Entrance dialogue adapted for play from the supplied canonical narrative.
 * These are newly written performance lines, NOT verbatim canonical dialogue.
 * Each entry preserves exact source excerpts so the adaptation is reviewable. */
(function(root,factory){
  var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HapilArcadeBossIntros=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var SOURCE={file:'docs/v43/canonical-story.txt',sha256:'ba14958353047e5558b9261a02e39cfc0f65bf8069122d433540a1c5266669fe',kind:'user-provided-canon'};
  // Continued forms of greed/pride belong to the same sin; they are not extra sins.
  // The explicit list permits the chairman's entrance even when mid is true.
  // No generic mb_* guardian, including the spider, is included.
  var BOSS_ENTRANCES=[
  {
    "actor": "p2_belphegor",
    "stage": 13,
    "sin": "sloth",
    "sinName": "나태",
    "bossName": "벨페고르",
    "title": "나태의 집",
    "sourceSection": "나태의 집",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "무엇을 해도 달라지지 않는다는 체념이 그의 몽세 안에 고여 있었다.",
      "이 방에서 억지로 일으켜 세운다 해도, 현실에는 치워야 할 쓰레기나 미뤄 둔 일이 그대로 남아 있었을 테니까."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "벨페고르",
        "text": "일어나 봐야 달라질 건 없어."
      },
      {
        "speaker": "벨페고르",
        "text": "오늘도… 내일로 미루면 돼."
      }
    ]
  },
  {
    "actor": "p2_leviathan",
    "stage": 14,
    "sin": "envy",
    "sinName": "질투",
    "bossName": "레비아탄",
    "title": "금이 간 안경",
    "sourceSection": "금이 간 안경",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "자신만큼 애쓰지도 않은 사람이 모든 것을 가져갔다는 원망이 그 안에 똬리를 틀고 있었다.",
      "서윤이 자신보다 못한 처지로 떨어져야 비로소 안심할 수 있었던 듯하였다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "레비아탄",
        "text": "왜 그 여자만 모든 걸 가져야 하지?"
      },
      {
        "speaker": "레비아탄",
        "text": "그 여자가 나보다 불행해져야 해."
      }
    ]
  },
  {
    "actor": "p2_beelzebub",
    "stage": 15,
    "sin": "gluttony",
    "sinName": "탐식",
    "bossName": "베엘제붑",
    "title": "탐식의 주방",
    "sourceSection": "탐식의 주방",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "최고의 결과가 아니면 내놓지 않는다는 강박이, 앞에 놓인 음식들을 차례로 쓰레기통에 보내고 있었던 모양이다.",
      "요리의 맛을 수없이 고치면서도, 결국에는 서윤이 자신을 선택해 주기를 기다리고 있었던 셈이다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "베엘제붑",
        "text": "이 정도로는 안 돼. 다시 만들어."
      },
      {
        "speaker": "베엘제붑",
        "text": "서윤이 나를 선택할 때까지."
      }
    ]
  },
  {
    "actor": "asmodeus",
    "stage": 16,
    "sin": "lust",
    "sinName": "색욕",
    "bossName": "아스모데우스",
    "title": "붉은 하이힐",
    "sourceSection": "붉은 하이힐",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "빈 객석을 마주한 얼굴들은 누구도 먼저 웃음을 거두지 못했다.",
      "나는 목 앞의 칼날을 간신히 밀어내며, 좋아해 달라는 마음 하나에 붙들리면 제 팔조차 거둘 수 없다는 것을 몸으로 깨달았던 듯하였다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "아스모데우스",
        "text": "아직 웃음을 거두면 안 돼."
      },
      {
        "speaker": "아스모데우스",
        "text": "사랑받고 싶을 뿐인데…"
      }
    ]
  },
  {
    "actor": "p2_greed",
    "stage": 17,
    "sin": "greed",
    "sinName": "탐욕",
    "bossName": "탐욕의 귀",
    "title": "맘몬의 금고",
    "sourceSection": "맘몬의 금고",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "어느 길을 골라도 마지막에는 총지배인의 이익으로 이어지게 되어 있었다.",
      "사람마다 가격표가 붙어 있다고 여기던 그는 상대에게 고르라고 하면서도, 거래가 끝날 자리는 처음부터 제 쪽에 마련해 두곤 하였던 모양이다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "탐욕의 귀",
        "text": "골라 봐. 어느 길이든 내게 돌아올 테니."
      },
      {
        "speaker": "탐욕의 귀",
        "text": "사람마다 값은 정해져 있어."
      }
    ]
  },
  {
    "actor": "p2_mammon",
    "stage": 18,
    "sin": "greed",
    "sinName": "탐욕",
    "bossName": "맘몬",
    "title": "눈보라 속의 소년",
    "sourceSection": "눈보라 속의 소년",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "돈만 있었다면 어머니를 살릴 수 있었다는 생각이 그 좁은 방 안에서 끝없이 되풀이되었다.",
      "누군가 가까이 다가오면 약점부터 쥐고서야 잠시 안심하곤 하였고, 무언가 잃을 기미가 보이면 먼저 빼앗았다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "맘몬",
        "text": "돈만 있었다면… 어머니를 살릴 수 있었어."
      },
      {
        "speaker": "맘몬",
        "text": "다시는 잃지 않겠어. 먼저 빼앗아서라도."
      }
    ]
  },
  {
    "actor": "p2_wrath",
    "stage": 19,
    "sin": "wrath",
    "sinName": "분노",
    "bossName": "분노의 귀",
    "title": "불을 지른 남자",
    "sourceSection": "불을 지른 남자",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "총주방장이 버린 음식을 청소부가 몰래 챙겨 세 아이에게 가져다주던 날이 나타났다.",
      "청소부는 몽세 안에서 여전히 해고를 통보받고 있었던 듯하였다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "분노의 귀",
        "text": "버린 음식조차 내 아이들에게 줄 수 없었어."
      },
      {
        "speaker": "분노의 귀",
        "text": "그날의 모욕은 아직 끝나지 않았어."
      }
    ]
  },
  {
    "actor": "pride",
    "stage": 20,
    "sin": "pride",
    "sinName": "교만",
    "bossName": "교만의 회장",
    "title": "하늘에 서려는 자",
    "sourceSection": "하늘에 서려는 자",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "사람들을 먹여 살리고 일자리를 주었으니 그들의 값어치도 자신이 정할 수 있다고 여기곤 하였던 모양이다.",
      "회장은 사람들이 무엇을 갈망하는지 꿰뚫고 있었다. 그리고 그 사실을 그들을 마음대로 움직일 자격으로 받아들였던 셈이다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "교만의 회장",
        "text": "먹여 살린 건 나다. 값어치도 내가 정해."
      },
      {
        "speaker": "교만의 회장",
        "text": "무엇을 원하는지 아는 내가, 너희를 움직인다."
      }
    ]
  },
  {
    "actor": "p2_chairman",
    "stage": 21,
    "sin": "pride",
    "sinName": "교만",
    "bossName": "회장",
    "title": "생체 부트로더",
    "sourceSection": "생체 부트로더",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "회장은 육신을 ‘생체 부트로더’라 불렀다. 인공지능과 완전히 결합하기 전까지 잠시 거쳐 가는 기반이라는 뜻이었다.",
      "기억과 욕망, 공포와 쾌락을 데이터로 옮겼으니 고깃덩어리는 버려도 된다고 했다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "회장",
        "text": "육신은 잠시 거쳐 가는 생체 부트로더일 뿐."
      },
      {
        "speaker": "회장",
        "text": "기억과 욕망은 이미 옮겨 두었다."
      }
    ]
  },
  {
    "actor": "p2_core",
    "stage": 21,
    "sin": "pride",
    "sinName": "교만",
    "bossName": "연산핵",
    "title": "생체 부트로더",
    "sourceSection": "생체 부트로더",
    "sourceFile": "docs/v43/canonical-story.txt",
    "sourceExcerpts": [
      "건물 잔해 사이로 죽은 동료들의 형상이 나타났다. 내 기억을 본뜬 환영들이었을 것이다.",
      "다음 수를 생각할 때마다 내가 디딜 수 있는 자리가 하나씩 줄어들곤 하였다."
    ],
    "kind": "dialogue-adaptation",
    "durationMs": 6000,
    "entrance": true,
    "isSevenSin": true,
    "lines": [
      {
        "speaker": "연산핵",
        "text": "네 기억으로 만든 형상이다. 익숙하지 않나?"
      },
      {
        "speaker": "연산핵",
        "text": "다음 수를 생각해 봐. 네가 설 자리는 줄어들 테니."
      }
    ]
  }
];
  BOSS_ENTRANCES.forEach(function(entry){
    entry.lines.forEach(Object.freeze);Object.freeze(entry.lines);
    Object.freeze(entry.sourceExcerpts);Object.freeze(entry);
  });
  function getBoss(actor,stage){
    if(typeof actor!=='string'||!Number.isInteger(stage))return null;
    return BOSS_ENTRANCES.find(function(entry){return entry.actor===actor&&entry.stage===stage;})||null;
  }
  /* 정본 발췌가 없는 보스·중간보스의 입장 대사(새로 쓴 연출용 한 줄, 설정·지명을 만들지 않는다). 보스 이름으로 같은 대사가 고정된다. */
  var GENERIC={mid:["여기서부터는 지나갈 수 없다.","먼저 나를 넘어서야 할 것이다.","여기까지 왔나. 시험해 보지.","발걸음은 여기까지다."],
    main:["이 앞은 내가 막는다.","돌아가라. 아니면 여기서 끝이다.","기억도 시간도, 여기서 멈춘다.","나를 쓰러뜨려야 지나갈 수 있다."]};
  function fallbackLines(actor,mid,name){
    var h=0,i,list=mid?GENERIC.mid:GENERIC.main,key=String(actor||'');for(i=0;i<key.length;i++)h=(h*31+key.charCodeAt(i))>>>0;
    return [{speaker:name||'',text:list[h%list.length]}];
  }
  function isSinBoss(actor){return typeof actor==='string'&&BOSS_ENTRANCES.some(function(entry){return entry.actor===actor;});}
  return Object.freeze({SOURCE:Object.freeze(SOURCE),BOSS_ENTRANCES:Object.freeze(BOSS_ENTRANCES),getBoss:getBoss,isSinBoss:isSinBoss,fallbackLines:fallbackLines});
});

