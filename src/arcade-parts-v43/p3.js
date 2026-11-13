/* 합일 v43 · 제3부 — 통제자의 열일곱 단계. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:3,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'drone',fire:'aim',color:K.WHITE};
      var spells={
      ph27:{name:'임시 27',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph28:{name:'임시 28',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'24',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r24',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','legion']},
        {scene:'25',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r25',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','rescue']},
        {scene:'26',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r26',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','veto']},
        {scene:'27',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r27',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','ph27']},
        {scene:'28',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r28',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','ph28']},
        {scene:'29',placeholder:true,theme:{bg:'nexus',tint:'#000000',fx:'none'},cast:['drone'],reward:{key:'r29',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['controller','memoryGate']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
