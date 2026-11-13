/* 합일 v43 · 제6부 — 두 사람의 성. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:6,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'nightmare',fire:'aim',color:K.WHITE};
      var spells={

      };
      var stages=[
        {scene:'48',placeholder:true,theme:{bg:'chief',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r48',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['chief','castleGate','summoned']},
        {scene:'49',placeholder:true,theme:{bg:'chief',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r49',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['chief','twoMasters']},
        {scene:'50',placeholder:true,theme:{bg:'chief',tint:'#000000',fx:'none'},cast:['nightmare'],reward:{key:'r50',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['chief','sharedCore']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
