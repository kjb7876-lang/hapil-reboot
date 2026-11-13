/* 합일 v43 · 제2부 — 일곱 개의 귀와 하이테크 축귀. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:2,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'ember',fire:'aim',color:K.WHITE};
      var spells={
      ph13:{name:'임시 13',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph14:{name:'임시 14',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph15:{name:'임시 15',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph16:{name:'임시 16',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph18:{name:'임시 18',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph19:{name:'임시 19',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph20:{name:'임시 20',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'13',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r13',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph13']},
        {scene:'14',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r14',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph14']},
        {scene:'15',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r15',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph15']},
        {scene:'16',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r16',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph16']},
        {scene:'17',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r17',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','heel']},
        {scene:'18',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r18',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph18']},
        {scene:'19',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r19',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph19']},
        {scene:'20',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r20',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','ph20']},
        {scene:'21',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r21',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','cathedral','ascend']},
        {scene:'22',placeholder:true,theme:{bg:'rings',tint:'#000000',fx:'none'},cast:['ember'],reward:{key:'r22',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['pride','bootloader']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
