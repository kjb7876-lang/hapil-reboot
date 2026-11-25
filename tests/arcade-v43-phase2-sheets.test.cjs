'use strict';
// 닷츠 CX-0191BS 보스 스킬 시트(11~52스테이지): 카드 연결·피할 길·판정 비트표·예고 중 무판정.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const A=require('../src/arcade-v43.js'),N=require('../src/arcade-phase2-native-v43.js');
const bind=require('../src/arcade-phase2-sheets-v43.js'),art=require('../src/arcade-phase2-sheets-art-v43.js');

const slots=[];for(let i=0;i<A.SEGMENTS.length;i++){const s=N.slotFor(i);if(s&&s.sheet)slots.push(s);}

test('37 boss skill sheets each own one named spell card of their boss',()=>{
  assert.equal(Object.keys(art).length,37);
  assert.equal(slots.length,37);
  const stages=new Set(slots.map(s=>s.stage));assert.equal(stages.size,37);
  for(const s of slots){
    const n=A.SEGMENTS[s.seg],d=art[s.theme];
    assert.equal(n.kind,'card');assert.ok(n.spell&&!n.mid,'spell card '+s.theme);
    assert.equal(n.stage+1,d.stage);
    assert.ok(n.actor===d.actor||A.segArt(n)===d.actor,'actor '+s.theme);
    assert.ok(fs.existsSync(d.url.split('?')[0]),'file '+d.url);
    assert.ok(d.bytes<340000,'sheet size '+d.theme);
  }
  // 교만의 회장·연산핵(사용자 11-25 지적)
  assert.ok(slots.some(s=>s.actor==='pride'&&A.SEGMENTS[s.seg].name==='일곱 갈래 신호'));
  assert.ok(slots.some(s=>s.actor==='p2_core'));
});

test('the centre escape lane is clear in every attack frame and the walls are real',()=>{
  const b=bind(A,art);
  for(const t of Object.keys(art)){
    const a=b.audit(t);
    assert.equal(a.laneHits,0,t);
    assert.ok(a.coverage>.12&&a.coverage<.5,t+' coverage '+a.coverage);
  }
});

test('contact only in active frames, from the alpha grid; telegraph and centre are safe',()=>{
  const b=bind(A,art);
  for(const s of slots){
    const d=art[s.theme],st={seg:s.seg,stage:'card',difficulty:'normal',tick:1000,boss:{hp:1,actor:s.actor},player:{x:180,y:560}};
    const e=b.make({...st,tick:1000},{art:{...d,image:{}}});assert.ok(e,s.theme);
    const [w,a]=e.plan.timing;
    // 예고: 어디에 있어도 맞지 않는다.
    let hitTele=false;for(let x=10;x<350;x+=6){st.tick=1000+w-1;st.player={x,y:400};if(b.hit(e,st))hitTele=true;}
    assert.equal(hitTele,false,s.theme+' telegraph');
    // 공격: 가운데 길은 늘 안전, 양옆 어딘가는 맞는다.
    let side=false;
    for(let k=0;k<a;k+=4){st.tick=1000+w+k;
      for(let y=60;y<620;y+=20){st.player={x:180,y};assert.equal(b.hit(e,st),false,s.theme+' lane '+y);}
      for(let y=60;y<620&&!side;y+=10)for(let x=12;x<150&&!side;x+=4){st.player={x,y};if(b.hit(e,st))side=true;}
    }
    assert.ok(side,s.theme+' has contact');
  }
});

test('telegraph is long enough to walk from either edge to the lane',()=>{
  const b=bind(A,art),s=slots[0],d=art[s.theme];
  for(const difficulty of ['gentle','normal','hell']){
    const e=b.make({seg:s.seg,difficulty,tick:0,boss:{hp:1,actor:s.actor}},{art:{...d,image:{}}});
    const lane=e.plan.safeLane,far=Math.max(lane[0]-8,352-lane[1]);
    assert.ok(e.plan.timing[0]>=80,'telegraph ticks');
    assert.ok(far/e.plan.timing[0]<2.2,'walk '+far+'px in '+e.plan.timing[0]+' ticks');
  }
});
