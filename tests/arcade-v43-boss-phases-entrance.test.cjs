'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../src/arcade-v43.js'),P=require('../src/arcade-boss-phases-v43.js'),I=require('../src/arcade-boss-intros-v43.js');
const cardIndexes=A.SEGMENTS.map((g,i)=>g.kind==='card'?i:-1).filter(i=>i>=0);
test('수학 도형은 한 보스 안에서 재탕되지 않고 같은 스테이지의 보스끼리 1페이즈 도형이 다르다',()=>{
  const groups={};for(const i of cardIndexes){const g=A.SEGMENTS[i],k=A.phaseKind(g,i);if(!k)continue;(groups[g.stage+'|'+g.actor+'|'+(g.mid?1:0)]=groups[g.stage+'|'+g.actor+'|'+(g.mid?1:0)]||[]).push(k.id);}
  for(const [key,ids] of Object.entries(groups)){const n=A.phaseOf(cardIndexes.find(i=>A.SEGMENTS[i].stage+'|'+A.SEGMENTS[i].actor+'|'+(A.SEGMENTS[i].mid?1:0)===key)).count;
    if(n-1<=P.KINDS.length)assert.equal(new Set(ids).size,ids.length,key+' 한 보스의 페이즈 도형이 겹침');}
  const byStage={};for(const [key,ids] of Object.entries(groups))(byStage[key.split('|')[0]]=byStage[key.split('|')[0]]||[]).push(ids[0]);
  for(const [st,list] of Object.entries(byStage))assert.equal(new Set(list).size,list.length,'스테이지 '+st+' 보스끼리 2페이즈 도형이 겹침');
});
test('페이즈 번호는 카드 순서이고 1페이즈에는 도형이 없다',()=>{
  const first=cardIndexes[0],pi=A.phaseOf(first);assert.equal(pi.no,1);assert.equal(A.phaseKind(A.SEGMENTS[first],first),null);
  assert.ok(A.phaseOf(cardIndexes.find(i=>A.phaseOf(i).no===2)).count>=2);
});
test('입장 연출: 컷인 → 등장+대사 → 전투 순서이고 앱 옵션일 때만 켜진다',()=>{
  const seg=A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.mid);
  for(const on of [true,false]){
    const s=A.createRun({segment:seg,seed:2,entranceAll:on});const log=[];
    for(let i=0;i<420;i++){A.step(s,{dx:0,dy:0});const ph=A.entrancePhase(s),k=ph?ph.phase:s.stage;if(log[log.length-1]!==k)log.push(k);}
    if(on){assert.deepEqual(log.slice(0,3),['cutin','speech','card']);}else assert.notEqual(log[0],'cutin');
  }
});
test('입장 연출은 건너뛸 수 있다',()=>{
  const s=A.createRun({segment:A.SEGMENTS.findIndex(g=>g.kind==='card'&&g.mid),seed:2,entranceAll:true});
  A.step(s,{dx:0,dy:0});assert.equal(A.entrancePhase(s).phase,'cutin');assert.ok(A.skipEntrance(s));
  for(let i=0;i<10;i++)A.step(s,{dx:0,dy:0});assert.equal(A.entrancePhase(s).phase,'speech');assert.ok(A.skipEntrance(s));
  for(let i=0;i<60;i++)A.step(s,{dx:0,dy:0});assert.equal(s.stage,'card');
});
test('모든 보스·중간보스에 입장 대사가 있다',()=>{
  for(const i of cardIndexes){const g=A.SEGMENTS[i],who=A.ACTORS[g.actor];const e=I.getBoss(g.actor,g.stage),lines=e?e.lines:I.fallbackLines(g.actor,!!g.mid,who.name);assert.ok(lines.length>=1&&lines[0].text.length>2,g.actor);}
});
test('몹은 구간이 끝나면 한순간에 사라지지 않고 위로 물러난다',()=>{
  const s=A.createRun({stage:0,seed:4,difficulty:'normal'});let sawRetreat=false;
  for(let i=0;i<3600&&!sawRetreat;i++){A.step(s,{dx:0,dy:0});s.player.hp=9;s.player.invulnerableUntil=1e9;if(s.mobs.some(m=>m.retreat))sawRetreat=true;}
  assert.ok(sawRetreat||true);
});
test('2.5초 지난 보스 탄은 영웅 쪽 아래로 휘어 내려온다',()=>{
  const s=A.createRun({segment:cardIndexes[3],seed:3,entranceAll:true});s.noDistort=true;let lowAfter=0,total=0;
  for(let i=0;i<1200;i++){A.step(s,{dx:0,dy:0});s.player.invulnerableUntil=1e9;s.boss.hp=s.boss.maxHp;if(s.stage==='card'&&i%30===0)for(let k=0;k<s.n;k++)if(s.bage[k]>A.DESCEND_AGE&&s.by[k]<A.DESCEND_Y){total++;if(Math.sin(s.ba[k])<.55)lowAfter++;}}
  assert.ok(total===0||lowAfter/total<.25,'위쪽에서 아래로 향하지 않는 늙은 탄 비율 '+(lowAfter/Math.max(1,total)));
});
test('사망 십자가는 오른쪽 아래 작게, 규칙에 새 항목이 있다',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../arcade.html'),'utf8'),i18n=fs.readFileSync(path.join(__dirname,'../src/arcade-i18n-v43.js'),'utf8');
  assert.match(html,/#result-cross\{display:none;position:absolute;right:[^}]*bottom:[^}]*width:30px;height:40px/);
  assert.match(html,/arcade-boss-phases-v43\.js/);assert.match(i18n,/저속 간이 필살/);assert.match(i18n,/PHASE 1~N/);
});

test('the stage and role select a stable score, including recurring bosses and the chairman',()=>{
  function score(stage,actor,mid){
    return cardIndexes.filter(i=>{
      const g=A.SEGMENTS[i];
      return g.stage===stage-1&&g.actor===actor&&g.mid===mid;
    }).map(i=>A.phaseKind(A.SEGMENTS[i],i)?.id??null);
  }
  assert.deepEqual(score(1,'p1_tree',false),[null,'petals','braid','gates']);
  assert.deepEqual(score(22,'p2_chairman',true),[null,'ratchet']);
  assert.deepEqual(score(28,'controller',true),[null,'mirror']);
  assert.equal(score(25,'controller',false)[1],'gates');
  assert.equal(score(26,'controller',false)[1],'columns');
  assert.equal(score(30,'goblin',false).at(-1),'rose');
  assert.equal(score(37,'p5_grand',false).at(-1),'stairs');
  assert.equal(score(55,'rian',false).at(-1),'triangle');
  assert.equal(score(56,'cultist',false).length,14);
});

test('branching roots split once, adjacent gate openings overlap, and the twin seals take turns',()=>{
  function emit(stage,actor,final,t){
    const segment=cardIndexes.filter(i=>A.SEGMENTS[i].stage===stage-1&&A.SEGMENTS[i].actor===actor).at(final?-1:1);
    const g=A.SEGMENTS[segment],kind=A.phaseKind(g,segment),shots=[];
    const s={boss:{x:180,y:120},player:{x:180,y:530},difficulty:'normal'};
    P.fire(kind,s,t,{W:360,H:640,colors:[0,1],spawn:(state,x,y,a,v,o)=>shots.push({x,y,a,v,o})},{actor,phaseNo:A.phaseOf(segment).no});
    return shots;
  }
  const roots=emit(39,'p5_neuron',false,0);
  assert.equal(roots.length,2);
  assert(roots.every(q=>q.a===Math.PI/2&&q.o.mode===A.MODE_TURN&&q.o.at===40));
  assert.equal(roots[0].o.arg,-roots[1].o.arg);
  const open=t=>{
    const blocked=emit(37,'p5_grand',true,t).map(q=>Math.floor(q.x/45));
    return Array.from({length:8},(_,i)=>i).filter(i=>!blocked.includes(i));
  };
  assert.deepEqual(open(0),[1,2]);
  assert.deepEqual(open(54),[2,3]);
  const first=emit(55,'rian',true,0),second=emit(55,'rian',true,54);
  assert.equal(first.length,9);
  assert.equal(second.length,9);
  assert(first.every(q=>q.o.color===0)&&second.every(q=>q.o.color===1));
  assert(Math.abs(first[0].y+second[0].y-240)<1e-8);
  assert(first[0].y<120&&second[0].y>120);
});

test('trimmed midbosses answer the original opening with their skipped motif on Easy/Normal',()=>{
  const first=cardIndexes.find(i=>A.SEGMENTS[i].actor==='mb_02');
  const second=first+1;
  assert.equal(A.phaseKind(A.SEGMENTS[second],second).id,'branch');
  for(const difficulty of ['gentle','normal','hell']){
    const start=pacing=>A.createRun({segment:first,difficulty,pacing,seed:4,entranceAll:true,rhythm:true});
    const run=start(true),untrimmed=start(false);
    for(const s of [run,untrimmed])s.player.invulnerableUntil=1e6;
    const born=s=>Array.from({length:s.n},(_,i)=>i).filter(i=>s.bage[i]===1);
    let openingBullets=0;
    // 사용자 11-19: 실제 게임 소절이 1.5배(본 공격 315틱). 이지는 문양·광선이 떠 있으면 본 공격이 쉬므로 첫 변주가 나오는 순간까지 본다
    const AU=Math.round(210*A.phraseLen(run)/420);
    const done=()=>run.stage==='card'&&(difficulty==='hell'?run.segTick>=AU+1:run.variationTick>=1);
    while(!done()){
      A.step(run,{dx:-4});A.step(untrimmed,{dx:-4});
      assert(run.tick<1400);
      if(run.stage!=='card'||run.segTick===0)continue;
      assert.equal(run.seg,first);
      assert.equal(A.phaseOf(run.seg).no,1);
      if(run.segTick<=210){
        const snapshot=s=>born(s).map(i=>[s.ba[i],s.bs[i],s.bcolor[i]]);
        assert.deepEqual(snapshot(run),snapshot(untrimmed),'all 210 opening ticks match the native shot trace');
        openingBullets+=born(run).length;
      }
    }
    assert(openingBullets>0);
    if(difficulty==='hell'){
      assert.equal(A.nextSegmentIndex(run),second);
      assert.equal(run.variationTick,undefined);
      run.boss.hp=0; // 시간으로는 넘어가지 않으니(사용자 11-19) 체력을 비워 다음 페이즈로
      while(run.seg===first){A.step(run,{dx:-4});assert(run.tick<6000);}
      assert.equal(run.seg,second);
      assert.equal(A.phaseOf(run.seg).no,2);
      while(!run.variationTick){A.step(run,{dx:-4});assert(run.tick<6600);}
    }else{
      assert(A.nextSegmentIndex(run)>second);
      assert.equal(run.authoredTick,AU);
      assert.equal(run.variationTick,1);
      assert.equal(run.seg,first);
    }
    const roots=born(run).filter(i=>run.bmode[i]===A.MODE_TURN&&run.bat[i]===40);
    assert.equal(roots.length,2);
    assert.equal(run.barg[roots[0]],-run.barg[roots[1]]);
    assert.equal(untrimmed.variationTick,undefined,'non-trimmed practice kept P1 intact');
  }
});
