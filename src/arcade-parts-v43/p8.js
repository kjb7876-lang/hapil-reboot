/* 합일 v43 · 제8부 — 사이비 합일몽세. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:8,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'leech',fire:'aim',color:K.WHITE};
      var spells={
      ph57:{name:'임시 57',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'56',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r56',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','boundNightmare']},
        {scene:'57',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r57',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','ph57']},
        {scene:'58',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r58',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','returning']},
        {scene:'59',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r59',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','twoGoals']},
        {scene:'60',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r60',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','traitors']},
        {scene:'61',placeholder:true,theme:{bg:'cult',tint:'#000000',fx:'none'},cast:['leech'],reward:{key:'r61',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['cultist','samong']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
