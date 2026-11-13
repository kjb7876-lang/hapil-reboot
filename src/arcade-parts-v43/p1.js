/* 합일 v43 · 제1부 — 마지막 수호자 EGO. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:1,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'spider',fire:'aim',color:K.WHITE};
      var spells={
      ph01:{name:'임시 01',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph03:{name:'임시 03',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph04:{name:'임시 04',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph05:{name:'임시 05',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph09_2:{name:'임시 09-2',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'01',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r01',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','ph01']},
        {scene:'02',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r02',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','web']},
        {scene:'03',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r03',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','ph03']},
        {scene:'04',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r04',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','ph04']},
        {scene:'05',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r05',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','ph05']},
        {scene:'06',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r06',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','pillars']},
        {scene:'07',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r07',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','summon','fall']},
        {scene:'08',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r08',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','smile']},
        {scene:'09-1',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r09_1',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','needles']},
        {scene:'09-2',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r09_2',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','ph09_2']},
        {scene:'10',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r10',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','craving']},
        {scene:'11',placeholder:true,theme:{bg:'forest',tint:'#000000',fx:'none'},cast:['spider'],reward:{key:'r11',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['violet','angelMask']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
