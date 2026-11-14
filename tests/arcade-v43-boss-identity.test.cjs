'use strict';
/* 지시서 STEP 6: 보스마다 구조가 달라야 한다. 비스펠(일반) 카드가 전역 순번으로 돌아 보스끼리 같은 일반 패턴을 나눠 쓰던 것을,
   보스마다 고유한 일반 패턴 두 가지로 묶는다. 바로 이어 나오는 두 보스는 일반 패턴이 겹치지 않는다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs');

function plainByActor(a){
 const by=new Map();for(const g of a.SEGMENTS.filter(x=>x.kind==='card'&&!x.spell)){if(!by.has(g.actor))by.set(g.actor,[]);by.get(g.actor).push(g.plain);}
 return by;
}

test('v43 boss identity: each boss keeps its own pair of plain (non-spell) patterns',()=>{
 const a=h.need();
 for(const [actor,names] of plainByActor(a)){const set=new Set(names);assert(set.size<=2,actor+' uses '+[...set].join(','));
  if(names.length>=2)assert.equal(set.size,2,actor+' alternates two patterns');}
});

test('v43 boss identity: two bosses met one after another never share a plain pattern',()=>{
 const a=h.need(),order=[...plainByActor(a).keys()],by=plainByActor(a);
 for(let i=1;i<order.length;i++){const prev=new Set(by.get(order[i-1]));for(const p of new Set(by.get(order[i])))assert(!prev.has(p),order[i-1]+' and '+order[i]+' both use '+p);}
});

test('v43 boss identity: every boss has its own colours and spell overlay signature',()=>{
 const a=h.need(),actors=[...plainByActor(a).keys()];
 for(const k of actors){assert(a.ACTORS[k],'actor '+k);assert(a.SIGNATURES[k],'signature '+k);}
});
