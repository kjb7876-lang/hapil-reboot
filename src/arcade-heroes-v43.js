/* Playable identities. Biography comes from the supplied canonical narrative;
 * shot patterns and seven skill labels are arcade adaptations, not new lore. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HapilArcadeHeroes=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var DEFAULT_ID='memory';
  var profiles={
    memory:{
      id:'memory',name:'기억사수',title:'기억을 잇는 사수',
      description:'기억 결정과 유도탄을 쏘는 사수. 성장하면 기억 번개와 필살기가 강화됩니다.',
      summary:'직선 사격 · 기억 결정 · 기억 번개',
      abilities:['직선 주포와 유도탄 · 공격·필살 각 7단계 성장','성장에 따른 주변 적탄 둔화, 초능력 중 공격 ×1.3·필살 게이지 ×1.5','상대하는 보스가 레이저를 더 자주 쏨'],
      portrait:'media/arcade-v43-hero/cutin.webp',sprite:'media/gunner.webp',
      cutin:'media/arcade-v43-hero/cutin-ink.webp',
      shotLabel:'기억 결정',attackName:'기억 공격',bombLabel:'기억 해방',
      bombNames:[null,'기억 섬광','기억 파편','잔상 폭우','회상 뇌격','망각의 붕괴','기억 범람','기억 해방'],
      shot:{style:'memory',color:'#ffd9a0',focusColor:'#dff8ff'},
      source:{kind:'existing-playable-hero'}
    },
    seoha:{
      id:'seoha',family:'seoha',name:'윤서하 · 수련생',title:'최초명령자를 꿈꾼 아카데미움 학생',
      description:'‘최초명령자’가 되려고 카이로스 아카데미움에 들어간 윤서하. 오직 그녀의 눈에만 사라진 미래, 검은 모래가 보입니다. 시간검 탄을 펼쳐 쏘고 초능력 사용 중에는 좁게 모읍니다.',
      summary:'시간검 분산 사격 · 초능력 집중 사격 · 시간공학 필살',
      abilities:['평상시 분산 시간검, 초능력 사용 중 집중 시간검 · 7단계 성장','성장과 초능력(누를 때만)에 따른 주변 적탄 둔화','상대하는 적의 탄이 더 많고 빠름'],
      portrait:'media/arcade-v43-heroes/seoha-portrait.webp',sprite:'media/arcade-v43-heroes/seoha-player.webp',
      cutin:'media/arcade-v43-heroes/seoha-portrait.webp',spriteAnchor:{x:.5,y:.5},
      shotLabel:'시간검',attackName:'시간검 공격',bombLabel:'되찾은 시간',
      bombNames:[null,'크로노스 섬광','초침의 조율','카이로스 절단','시간검 연쇄','아이온 전개','최초명령 공명','되찾은 시간'],
      shot:{style:'clock-hands',color:'#a9e6e0',focusColor:'#e5f7ed',
        spread:.55,focusSpread:0,offsetScale:1.15,focusOffsetScale:.45,
        homingOffsetScale:1.1,focusHomingOffsetScale:.55},
      source:{kind:'canonical-character',file:'docs/v43/canonical-story.txt',section:'최초명령의 세계',combatAdaptation:true}
    }
  };
  // 기존 seoha ID는 A로 남겨 저장 기록을 보존한다. B는 같은 성장/시간공학 규칙의 별도 선택 영웅이다.
  profiles['seoha-b']=Object.assign({},profiles.seoha,{
    id:'seoha-b',name:'윤서하 · 각성',title:'깨어난 최초명령의 힘',
    description:'검은 모래를 따라 금역을 건넌 뒤 시간 절단과 시공간 압축, 최초명령의 힘이 온전히 깨어난 윤서하. 사격과 성장 규칙은 수련생 때와 같습니다.',
    portrait:'media/arcade-v43-heroes/seoha-portrait-v2.webp',sprite:'media/arcade-v43-heroes/seoha-player-v2.webp',
    cutin:'media/arcade-v43-heroes/seoha-portrait-v2.webp'
  });
  function freeze(value){
    if(value&&typeof value==='object'){Object.keys(value).forEach(function(k){freeze(value[k]);});Object.freeze(value);}
    return value;
  }
  freeze(profiles);
  function get(id){return Object.prototype.hasOwnProperty.call(profiles,id)?profiles[id]:profiles[DEFAULT_ID];}
  function list(){return [profiles.memory,profiles.seoha,profiles['seoha-b']];}
  return Object.freeze({DEFAULT_ID:DEFAULT_ID,profiles:profiles,get:get,list:list});
});
