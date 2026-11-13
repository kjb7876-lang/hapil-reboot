/* 합일 v43 · 제5부 — 카이로노미콘. 이 부의 스테이지(원작 장면마다 하나)와 그 내용.
 * actors/mobs/props: 이 부가 새로 들이는 인물·몹·큰 기물. build(K): 도구 상자 K로 패턴과 스테이지를 만든다. DOM·난수·시계를 쓰지 않는다. */
(function(root){
  'use strict';
  var part={part:5,actors:{},mobs:{},props:[],
    build:function(K){
      var a={kind:'collector',fire:'aim',color:K.WHITE};
      var spells={
      ph37:{name:'임시 37',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph38:{name:'임시 38',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph41:{name:'임시 41',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph42:{name:'임시 42',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph43:{name:'임시 43',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}},
      ph44:{name:'임시 44',fire:function(s,t){if(t%40===0)K.ring(s,s.boss.x,s.boss.y,K.count(s,12),70,t*.01,{color:K.WHITE,size:1});}}
      };
      var stages=[
        {scene:'37',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r37',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph37']},
        {scene:'38',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r38',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph38']},
        {scene:'39',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r39',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','stolenTime']},
        {scene:'40',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r40',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','closedFloor']},
        {scene:'41',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r41',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph41']},
        {scene:'42',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r42',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph42']},
        {scene:'43',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r43',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph43']},
        {scene:'44',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r44',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','ph44']},
        {scene:'45',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r45',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','reprieve']},
        {scene:'46',placeholder:true,theme:{bg:'siren',tint:'#000000',fx:'none'},cast:['collector'],reward:{key:'r46',name:'기념물'},
          waves:[K.waveColumns(a,null),K.waveDives(a,null)],mid:['siren','rewrite']}
      ];
      return {spells:spells,mobFire:{},stages:stages};
    }};
  if(typeof module==='object'&&module.exports)module.exports=part;else(root.HapilArcadeParts=root.HapilArcadeParts||[]).push(part);
})(typeof window!=='undefined'?window:globalThis);
