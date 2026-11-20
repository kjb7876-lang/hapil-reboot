/* 7대죄 보스 입장 독백. 두 줄 모두 docs/v43/canonical-story.txt의 같은 제목 구역에서 그대로 옮긴 EGO의 1인칭 서술이다(새로 쓴 대사 없음).
 * sourceExcerpts는 lines와 같은 원문이며 검토용으로 남긴다. */
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
      "stage": 11,
      "sin": "sloth",
      "sinName": "나태",
      "bossName": "벨페고르",
      "title": "나태의 집",
      "sourceSection": "나태의 집",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "나태의 귀를 쫓아 들어와 약병 앞에 주저앉을 수는 없었다.",
        "무엇을 해도 달라지지 않는다는 체념이 그의 몽세 안에 고여 있었다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "나태의 귀를 쫓아 들어와 약병 앞에 주저앉을 수는 없었다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "무엇을 해도 달라지지 않는다는 체념이 그의 몽세 안에 고여 있었다."
        }
      ]
    },
    {
      "actor": "p2_leviathan",
      "stage": 12,
      "sin": "envy",
      "sinName": "질투",
      "bossName": "레비아탄",
      "title": "금이 간 안경",
      "sourceSection": "금이 간 안경",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "레비아탄의 독기가 닿자 내 앞에도 다른 삶이 펼쳐졌다.",
        "자신만큼 애쓰지도 않은 사람이 모든 것을 가져갔다는 원망이 그 안에 똬리를 틀고 있었다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "레비아탄의 독기가 닿자 내 앞에도 다른 삶이 펼쳐졌다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "자신만큼 애쓰지도 않은 사람이 모든 것을 가져갔다는 원망이 그 안에 똬리를 틀고 있었다."
        }
      ]
    },
    {
      "actor": "p2_beelzebub",
      "stage": 13,
      "sin": "gluttony",
      "sinName": "탐식",
      "bossName": "베엘제붑",
      "title": "탐식의 주방",
      "sourceSection": "탐식의 주방",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "나는 그 손이 멈추지 못하는 까닭을 알아보려고 몽세에 접속했다.",
        "그러나 기억 속에서 접시를 건넬 때마다, 그는 음식보다 서윤의 표정을 먼저 살폈던 듯하였다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "나는 그 손이 멈추지 못하는 까닭을 알아보려고 몽세에 접속했다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "그러나 기억 속에서 접시를 건넬 때마다, 그는 음식보다 서윤의 표정을 먼저 살폈던 듯하였다."
        }
      ]
    },
    {
      "actor": "asmodeus",
      "stage": 14,
      "sin": "lust",
      "sinName": "색욕",
      "bossName": "아스모데우스",
      "title": "붉은 하이힐",
      "sourceSection": "붉은 하이힐",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "하이힐 끝에서 뻗어 나온 첫 공격은 피했으나, 뒤따른 매혹의 빛이 내 손목에 닿았다.",
        "무기를 돌려 막으려는데 칼끝이 오히려 내 목을 향하고 있었다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "하이힐 끝에서 뻗어 나온 첫 공격은 피했으나, 뒤따른 매혹의 빛이 내 손목에 닿았다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "무기를 돌려 막으려는데 칼끝이 오히려 내 목을 향하고 있었다."
        }
      ]
    },
    {
      "actor": "p2_greed",
      "stage": 15,
      "sin": "greed",
      "sinName": "탐욕",
      "bossName": "탐욕의 귀",
      "title": "맘몬의 금고",
      "sourceSection": "맘몬의 금고",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "어느 길을 골라도 마지막에는 총지배인의 이익으로 이어지게 되어 있었다.",
        "발치에 떨어진 하나를 확인한 뒤 곁의 동전들도 살펴보았다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "어느 길을 골라도 마지막에는 총지배인의 이익으로 이어지게 되어 있었다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "발치에 떨어진 하나를 확인한 뒤 곁의 동전들도 살펴보았다."
        }
      ]
    },
    {
      "actor": "p2_mammon",
      "stage": 16,
      "sin": "greed",
      "sinName": "탐욕",
      "bossName": "맘몬",
      "title": "눈보라 속의 소년",
      "sourceSection": "눈보라 속의 소년",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "돈만 있었다면 어머니를 살릴 수 있었다는 생각이 그 좁은 방 안에서 끝없이 되풀이되었다.",
        "소년은 눈을 털어 내지도 않은 채 어머니를 붙들고 있었던 듯하였다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "돈만 있었다면 어머니를 살릴 수 있었다는 생각이 그 좁은 방 안에서 끝없이 되풀이되었다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "소년은 눈을 털어 내지도 않은 채 어머니를 붙들고 있었던 듯하였다."
        }
      ]
    },
    {
      "actor": "p2_wrath",
      "stage": 17,
      "sin": "wrath",
      "sinName": "분노",
      "bossName": "분노의 귀",
      "title": "불을 지른 남자",
      "sourceSection": "불을 지른 남자",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "청소부는 몽세 안에서 여전히 해고를 통보받고 있었던 듯하였다.",
        "나는 뜨거운 열기를 피해 물러났다가 다시 그 장면을 바라보았다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "청소부는 몽세 안에서 여전히 해고를 통보받고 있었던 듯하였다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "나는 뜨거운 열기를 피해 물러났다가 다시 그 장면을 바라보았다."
        }
      ]
    },
    {
      "actor": "pride",
      "stage": 18,
      "sin": "pride",
      "sinName": "교만",
      "bossName": "교만의 회장",
      "title": "하늘에 서려는 자",
      "sourceSection": "하늘에 서려는 자",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "내가 모두를 구해야 한다는 생각이 스치자마자, 스스로를 마지막 수호자라 믿던 시절이 떠올랐다.",
        "이미 내면에 있던 욕망이 드러날 무대만 마련해 주었다는 생각이었을 것이다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "내가 모두를 구해야 한다는 생각이 스치자마자, 스스로를 마지막 수호자라 믿던 시절이 떠올랐다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "이미 내면에 있던 욕망이 드러날 무대만 마련해 주었다는 생각이었을 것이다."
        }
      ]
    },
    {
      "actor": "p2_chairman",
      "stage": 19,
      "sin": "pride",
      "sinName": "교만",
      "bossName": "회장",
      "title": "생체 부트로더",
      "sourceSection": "생체 부트로더",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "회장은 육신을 ‘생체 부트로더’라 불렀다.",
        "기억과 욕망, 공포와 쾌락을 데이터로 옮겼으니 고깃덩어리는 버려도 된다고 했다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "회장은 육신을 ‘생체 부트로더’라 불렀다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "기억과 욕망, 공포와 쾌락을 데이터로 옮겼으니 고깃덩어리는 버려도 된다고 했다."
        }
      ]
    },
    {
      "actor": "p2_core",
      "stage": 19,
      "sin": "pride",
      "sinName": "교만",
      "bossName": "연산핵",
      "title": "생체 부트로더",
      "sourceSection": "생체 부트로더",
      "sourceFile": "docs/v43/canonical-story.txt",
      "sourceExcerpts": [
        "내 기억을 본뜬 환영들이었을 것이다.",
        "다음 수를 생각할 때마다 내가 디딜 수 있는 자리가 하나씩 줄어들곤 하였다."
      ],
      "kind": "canon-monologue",
      "durationMs": 6000,
      "entrance": true,
      "isSevenSin": true,
      "lines": [
        {
          "speaker": "EGO의 기억",
          "text": "내 기억을 본뜬 환영들이었을 것이다."
        },
        {
          "speaker": "EGO의 기억",
          "text": "다음 수를 생각할 때마다 내가 디딜 수 있는 자리가 하나씩 줄어들곤 하였다."
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
    if(mid)return []; // 사용자 11-20: 중간보스는 컷씬(컷인)만, 대사 없음. 보스만 대사
    var h=0,i,list=mid?GENERIC.mid:GENERIC.main,key=String(actor||'');for(i=0;i<key.length;i++)h=(h*31+key.charCodeAt(i))>>>0;
    return [{speaker:name||'',text:list[h%list.length]}];
  }
  function isSinBoss(actor){return typeof actor==='string'&&BOSS_ENTRANCES.some(function(entry){return entry.actor===actor;});}
  return Object.freeze({SOURCE:Object.freeze(SOURCE),BOSS_ENTRANCES:Object.freeze(BOSS_ENTRANCES),getBoss:getBoss,isSinBoss:isSinBoss,fallbackLines:fallbackLines});
});

