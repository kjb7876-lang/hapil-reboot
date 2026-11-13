/* 합일 v43 · 제7부 — 파란불 아래의 사람들. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:7,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'nightmare',fire:'aim',color:K.WHITE};
      var spells={

      };
      var stages=[
        {scene:'52',placeholder:true,theme:{bg:'executor',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r52',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['executor','blueLight']},
        {scene:'53',placeholder:true,theme:{bg:'executor',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r53',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['executor','hotel']},
        {scene:'54',placeholder:true,theme:{bg:'executor',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r54',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['executor','fireDoor']},
        {scene:'55',placeholder:true,theme:{bg:'executor',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r55',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['executor','rooftopLoop']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
