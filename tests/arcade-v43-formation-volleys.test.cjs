'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const game=require('../src/arcade-v43.js');

for(const difficulty of ['gentle','normal','hell']){
  test('scene 24 firing lines leave a recovery between volleys on '+difficulty,()=>{
    const index=game.SEGMENTS.findIndex(g=>g.kind==='wave'&&game.STAGES[g.stage].scene==='24');
    const s=game.createRun({segment:index,entranceAll:true,pacing:true,difficulty,seed:33});
    s.player.x=8;
    const duration=game.waveDuration(s,game.SEGMENTS[index]);
    s.player.invulnerableUntil=duration;
    const volleys=[],seen=new Map();
    let pairs=0,peak=0;
    for(let t=0;t<duration;t++){
      const before=s.mobs.slice();
      game.step(s,{});
      const fired=[];
      for(const m of new Set([...before,...s.mobs])){
        if(m.shots>(seen.get(m)||0))fired.push(m.x);
        seen.set(m,m.shots);
      }
      if(fired.length){
        volleys.push(s.tick);
        assert.ok(fired.length<=2,'at most two sources on a beat');
        if(fired.length===2){
          pairs++;
          assert.ok(Math.abs(fired[0]-fired[1])>=game.WIDTH/3,'paired shots come from separate wings');
        }
      }
      peak=Math.max(peak,s.n);
    }
    assert.ok(peak>0&&volleys.length>=8&&pairs>0,'real formations fire single and paired attacks');
    for(let i=3;i<volleys.length;i++){
      const gaps=[volleys[i]-volleys[i-1],volleys[i-1]-volleys[i-2],volleys[i-2]-volleys[i-3]];
      assert.ok(Math.max(...gaps)>=35,'every sequence of four beats includes time to reposition');
    }
    assert.equal(s.dropped,0);
  });
}
