/* 합일 v43 · 제4부 — 환도 자아와 융합몽세. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:4,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'mobgoblin',fire:'aim',color:K.WHITE};
      var spells={
      ph31:{name:'임시 31',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph33:{name:'임시 33',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'31',placeholder:true,theme:{bg:'insomnia',tint:'#000000',fx:'none'},cast:['mobgoblin'],reward:{key:'r31',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['insomnia','ph31']},
        {scene:'32',placeholder:true,theme:{bg:'insomnia',tint:'#000000',fx:'none'},cast:['mobgoblin'],reward:{key:'r32',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['insomnia','roseSeal']},
        {scene:'33',placeholder:true,theme:{bg:'insomnia',tint:'#000000',fx:'none'},cast:['mobgoblin'],reward:{key:'r33',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['insomnia','ph33']},
        {scene:'34',placeholder:true,theme:{bg:'insomnia',tint:'#000000',fx:'none'},cast:['mobgoblin'],reward:{key:'r34',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['insomnia','sleepless']},
        {scene:'35',placeholder:true,theme:{bg:'insomnia',tint:'#000000',fx:'none'},cast:['mobgoblin'],reward:{key:'r35',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['insomnia','openEye','puppetFog']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
