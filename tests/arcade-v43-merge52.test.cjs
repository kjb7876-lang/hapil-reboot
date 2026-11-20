'use strict';
/* 사용자 11-20 스테이지 합치기: "10-11-12 하나로 합치고 페이즈를 6페이즈로 … 같은 루시퍼니까 / 29-30 합치고 / 32-33 합치고 / 44-악몽군집체로 /
 * 54를 55로 옮기고 56 교주는 사몽각성 교주 … 이지는 노말패턴 노말은 헬패턴 헬은 모든패턴2배가속", "저장불러오기랑 패턴등도 버그없어야해". */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/arcade-v43.js'),C=require('../src/arcade-chapters-v43.js'),H=require('../src/arcade-heroes-v43.js'),Lines=require('../src/arcade-boss-lines-v43.js');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const bossCards=i=>A.SEGMENTS.map((g,k)=>({g,k})).filter(x=>x.g.stage===i&&x.g.kind==='card'&&!x.g.mid);
const spells=i=>bossCards(i).filter(x=>x.g.spell);

test('the merged Lucifer fights six phases on screen (opening + five named), goblin and insomnia keep six named phases, each phase with its own look',()=>{
 assert.equal(A.STAGES.length,52);
 const plan=new Set(A.plannedSegments('normal'));
 for(const [stage,actor,forms,titles,shown] of [
  [9,'lucifer',['p1_seraph','lucifer','lucifer','lucifer_alt11','lucifer_alt11'],['초천사','루시퍼','루시퍼','루시퍼','루시퍼'],6],
  [26,'goblin',['goblin_alt31','goblin_alt31','goblin_alt31','goblin','goblin','goblin'],null,7],
  [28,'insomnia',['insomnia_alt34','insomnia_alt34','insomnia_alt34','insomnia','insomnia','insomnia'],null,7]]){
  const sp=spells(stage);assert.equal(sp.length,forms.length,'named phases at stage '+(stage+1));
  assert.equal(bossCards(stage).filter(x=>plan.has(x.k)).length,shown,'phases the game shows (보스 n / N 페이즈) at stage '+(stage+1));
  assert(bossCards(stage).every(x=>x.g.actor===actor),'one boss all the way');
  assert.deepEqual(sp.map(x=>A.segArt(x.g)),forms);
  if(titles)assert.deepEqual(sp.map(x=>x.g.title),titles);
  assert.equal(new Set(sp.map(x=>x.g.name)).size,forms.length,'no named pattern repeats');
  for(const f of new Set(forms))assert(fs.existsSync(path.join(root,'media/arcade-v43',f+'.webp')),'art '+f);
 }
 // 합쳐져 사라진 장면은 스테이지로 남지 않는다
 for(const scene of ['09-2','10','31','34'])assert(!A.STAGES.some(g=>g.scene===scene),scene);
 assert.deepEqual(A.LAYOUT.NEW_FROM[9],[9,10,11]);assert.deepEqual(A.LAYOUT.NEW_FROM[26],[28,29]);assert.deepEqual(A.LAYOUT.NEW_FROM[28],[31,32]);
 assert.deepEqual([A.LAYOUT.NEW_FROM[49],A.LAYOUT.NEW_FROM[50],A.LAYOUT.NEW_FROM[51]],[[54],[53],[55]],'한리안과 백이온이 교주 앞으로');
});

test('a merged boss changes its look mid-fight in the real game: fire pauses, the name changes and the next user line is announced once per change',()=>{
 // 실제 게임(pacing)은 반복 일반 패턴을 건너뛰므로 모습은 이름 패턴에서 바뀐다
 const plan=A.plannedSegments('normal').filter(k=>{const g=A.SEGMENTS[k];return g.stage===9&&g.kind==='card'&&!g.mid;});
 const shift=plan.find(k=>A.SEGMENTS[k].formNo===1),before=plan[plan.indexOf(shift)-1];
 assert(A.SEGMENTS[shift].spell&&A.SEGMENTS[before].formNo===0);
 const s=A.createRun({segment:before,difficulty:'normal',seed:5,entranceAll:true,pacing:true,rhythm:true});let saw=[],holdFrom=0,born=0;
 for(let i=0;i<20000&&s.stageIndex===9&&s.stage!=='won';i++){
  s.player.invulnerableUntil=s.tick+60;if(s.stage==='card'&&!(s.formHold>s.tick))s.boss.hp=0;
  A.step(s,{});
  if(s.events.includes('formShift')){saw.push([s.seg,s.formShifts,s.boss.name,A.segArt(A.SEGMENTS[s.seg])]);if(!holdFrom)holdFrom=s.tick;}
  if(holdFrom&&s.tick>holdFrom&&s.tick<holdFrom+A.FORM_HOLD)for(let j=0;j<s.n;j++)if(s.bage[j]===1)born++;
  s.events.length=0;
 }
 assert.deepEqual(saw.map(x=>x.slice(1)),[[1,'루시퍼','lucifer'],[2,'루시퍼','lucifer_alt11']],'two changes, each announced once');
 assert.equal(saw[0][0],shift);assert.equal(born,0,'no new bullets while the new form is announced');
 assert.equal(Lines.getShiftLine(9,1).text,'세상을 수호할 자는 너뿐이라고 했거늘, 어찌하여 믿음을 버리는 것인가.');
 // 바뀐 모습에서 바로 시작하면(연습·이어 하기) 등장 연출이 대신하고 알림을 겹치지 않는다
 const t=A.createRun({segment:shift,difficulty:'normal',seed:5,entranceAll:true,pacing:true});let again=0;
 for(let i=0;i<900;i++){t.player.invulnerableUntil=t.tick+60;A.step(t,{});if(t.events.includes('formShift'))again++;t.events.length=0;}
 assert.equal(t.stage,'card');assert.equal(again,0);assert.equal(t.formShifts,1,'the line number is still known');
 const app=read('src/arcade-app-v43.js');
 assert(/e==='formShift'\)\{beginFormShift\(s\)/.test(app)&&/function drawFormShift/.test(app)&&/getShiftLine\(s\.stageIndex,s\.formShifts\|\|1\)/.test(app)&&/seg\.formNo>0&&BLs\.getShiftLine/.test(app),'the app shows the new name and line');
});

test('stage 40 is the nightmare swarm and the last boss is the awakened cult leader, by name and by picture',()=>{
 const swarm=A.STAGES.findIndex(g=>g.scene==='48');assert.equal(swarm,39);
 assert.equal(A.actorName('chief',swarm),'악몽 군집체');assert.equal(A.segArt(bossCards(swarm)[0].g),'chief_swarm');
 assert.equal(A.actorName('chief',A.STAGES.findIndex(g=>g.scene==='50')),A.ACTORS.chief.name,'the later chief keeps its own name');
 assert.equal(A.actorName('cultist',51),'사몽각성 교주');assert.equal(A.segArt(bossCards(51)[0].g),'cultist_awake');
 assert.equal(A.actorName('cultist',50),A.ACTORS.cultist.name);assert.notEqual(A.segArt(bossCards(50)[0].g),'cultist_awake');
 const s=A.createRun({segment:bossCards(51)[0].k,difficulty:'normal',seed:2,entranceAll:true});
 for(let i=0;i<900&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+60;A.step(s,{});}
 assert.equal(s.boss.name,'사몽각성 교주');
 const manifest=JSON.parse(read('media/arcade-v43/manifest.json'));
 for(const k of ['chief_swarm','cultist_awake']){assert(manifest[k+'.webp'],k);assert(fs.statSync(path.join(root,'media/arcade-v43',k+'.webp')).size>2000,k);}
 assert.equal(Lines.getLine('chief',swarm).text,'그들은 항상 의지만 할 걸, 여태 그래 왔듯이.');
});

test('the awakened cult leader plays one difficulty up: easy = normal table and shapes, normal = hell table, hell = every pattern at double tempo',()=>{
 const seg=bossCards(51)[1].k,ref=bossCards(50)[1].k;
 const at=(segment,difficulty)=>{const s=A.createRun({segment,difficulty,seed:9,entranceAll:true});for(let i=0;i<900&&s.stage!=='card';i++){s.player.invulnerableUntil=s.tick+60;A.step(s,{});}assert.equal(s.stage,'card');return s;};
 const g=at(seg,'gentle'),n=at(seg,'normal'),h=at(seg,'hell'),rn=at(ref,'normal'),rh=at(ref,'hell'),rg=at(ref,'gentle');
 assert(g.awake&&n.awake&&h.awake);assert(!rn.awake&&!rg.awake&&!rh.awake,'only the last stage');
 assert.equal(g.awakeShape,true);assert.equal(n.awakeTempo,1);assert.equal(h.awakeTempo,A.AWAKE_TEMPO);assert.equal(A.AWAKE_TEMPO,2);
 // 탄속·밀도는 한 단계 위의 표, 목숨·피격점은 고른 난이도 그대로
 assert.equal(g.rules.speed,rn.rules.speed);assert.equal(g.density,rn.density);
 assert.equal(n.rules.speed,rh.rules.speed);assert.equal(n.density,rh.density);
 assert.equal(h.rules.speed,rh.rules.speed);assert(h.density<rh.density&&h.density>=rh.density*.5,'hell thins the count so the doubled tempo stays readable');
 assert.equal(g.player.maxHp,rg.player.maxHp);assert.equal(n.player.maxHp,rn.player.maxHp);assert.equal(h.player.maxHp,rh.player.maxHp);
 // 헬: 같은 시간에 패턴 박자가 두 배로 돈다 → 같은 기본 패턴의 노멀보다 탄이 훨씬 많이 난다(밀도 보정 뒤에도)
 const count=s=>{let born=0;for(let i=0;i<600;i++){s.player.invulnerableUntil=s.tick+60;s.boss.hp=s.boss.maxHp;A.step(s,{});for(let j=0;j<s.n;j++)if(s.bage[j]===1)born++;}return born;};
 const plain=bossCards(51)[2].k,bn=count(at(plain,'normal')),bh=count(at(plain,'hell'));assert(bh>bn*1.2,'hell '+bh+' vs normal '+bn);
 // 중간보스·다른 스테이지는 그대로
 const mid=A.SEGMENTS.findIndex(x=>x.stage===51&&x.kind==='card'&&x.mid),m=at(mid,'normal');assert(!m.awake);
 assert.equal(A.awakeNow(A.createRun({segment:seg,difficulty:'hell',seed:1})),false,'only in the real game (entranceAll)');
});

test('old 56-stage saves move to the new numbers: progress, chapter log, record code and checkpoints',()=>{
 const P=A.Progress,L=A.LAYOUT;assert.equal(L.version,44);assert.equal(L.OLD_TO_NEW.length,56);
 // 진행 기록: 옛 14스테이지(0~13)까지 깬 기록
 const old={version:43,cleared:Array.from({length:14},(_,i)=>i),stars:{},best:{}};for(let i=0;i<14;i++){old.stars[i]=1+i%3;old.best[i]=1000+i;}
 const p=P.sanitize(JSON.parse(JSON.stringify(old)));assert.equal(p.version,44);
 assert.deepEqual(p.cleared,[0,1,2,3,4,5,6,7,8,9,10,11],'old 9·10·11 → 9, old 12·13 → 10·11');
 assert.equal(p.stars[9],Math.max(old.stars[9],old.stars[10],old.stars[11]));assert.equal(p.best[9],1011);assert.equal(p.best[11],1013);assert.equal(P.resume(p),12);
 // 합쳐진 스테이지를 일부만 깼으면 깬 것으로 치지 않는다(안 깬 구간을 건너뛰지 않는다)
 const part=P.sanitize({version:43,cleared:[0,1,2,3,4,5,6,7,8,9,10],stars:{},best:{}});assert.deepEqual(part.cleared,[0,1,2,3,4,5,6,7,8]);assert.equal(P.resume(part),9);
 // 다 깬 옛 기록은 다 깬 새 기록
 const all=P.sanitize({version:43,cleared:Array.from({length:56},(_,i)=>i),stars:{},best:{}});assert.equal(all.cleared.length,52);
 // 이미 옮긴 기록은 다시 옮기지 않는다
 assert.deepEqual(P.sanitize(JSON.parse(JSON.stringify(p))),p);
 // 챕터 기록(난이도 기록): 합쳐진 스테이지는 가장 낮은 값, 하나라도 없으면 없음
 const log=C.cleanLog({v:1,levels:{0:3,9:3,10:2,11:3,12:1,28:2,29:2,31:3,53:2,54:3,55:1},done:{1:1700000000000}},A.STAGES);
 assert.equal(log.v,2);assert.equal(log.levels[9],2);assert.equal(log.levels[10],1);assert.equal(log.levels[26],2);assert.equal(log.levels[28],undefined,'old 32 was never cleared');
 assert.equal(log.levels[50],2,'old 54 교주 → 51번째');assert.equal(log.levels[49],3,'old 55 한리안과 백이온 → 50번째');assert.equal(log.levels[51],1);assert.equal(log.done[1],1700000000000);
 assert.deepEqual(C.cleanLog(JSON.parse(JSON.stringify(log)),A.STAGES),log,'already moved');
 // 기록 코드: 옛 코드도 같은 길로 옮겨진다
 const code=C.encode({v:1,at:1,progress:old,chapters:{v:1,levels:{9:3,10:3,11:3},done:{}},best:5,bests:{}}),back=C.decode(code);
 assert.deepEqual(P.sanitize(back.progress).cleared,p.cleared);assert.equal(C.mergeLog(C.freshLog?C.freshLog():{v:2,levels:{},done:{}},back.chapters,A.STAGES).levels[9],3);
 // 이어하기 지점: 번호가 바뀐 스테이지(10번째부터)의 옛 지점은 버리고, 그대로인 앞 스테이지와 새 지점은 살린다
 const source=read('src/arcade-mobile-v43.js'),KEY='hapil-arcade-checkpoint-v43';
 const mobile=saved=>{const storage={...saved},w={HapilArcade:A,HapilArcadeHeroes:H,localStorage:{getItem:k=>storage[k]||null,setItem(k,v){storage[k]=String(v);},removeItem:k=>delete storage[k]},addEventListener(){}};w.window=w;vm.runInNewContext(source,w);return w.HapilMobile;};
 const cp=(stage,seg,layout)=>JSON.stringify({v:1,layout,stage,seg,hero:'memory',difficulty:'normal',at:Date.now(),hits:0,bombs:0,exp:0,fills:0});
 const early=bossCards(3)[0].k,late=bossCards(20)[0].k;
 assert(mobile({[KEY]:cp(3,early)}).checkpoint(3,'normal'),'an old checkpoint before the first merged stage still resumes');
 assert.equal(mobile({[KEY]:cp(20,late)}).checkpoint(20,'normal'),null,'an old checkpoint with old numbers is dropped');
 assert(mobile({[KEY]:cp(20,late,44)}).checkpoint(20,'normal'),'a new checkpoint resumes');
});

test('cutscenes follow the new order: story scenes, sin entrances, phase tables and every user line',()=>{
 const story=require('../src/arcade-story-v43.js'),intro=require('../src/arcade-boss-intros-v43.js');
 story.STAGES.forEach((e,i)=>assert.equal(e.title,A.STAGES[i].name,'story scene '+i));
 for(const t of story.TRANSITIONS)assert(A.STAGES[t.afterStage+1]&&A.STAGES[t.afterStage].part!==A.STAGES[t.afterStage+1].part,'transition after stage '+t.afterStage+' sits at a chapter end');
 for(const e of intro.BOSS_ENTRANCES)assert(bossCards(e.stage).concat(A.SEGMENTS.map((g,k)=>({g,k})).filter(x=>x.g.stage===e.stage&&x.g.kind==='card')).some(x=>x.g.actor===e.actor),e.actor);
 for(let i=0;i<52;i++){const b=bossCards(i);assert(b.length>=2,'stage '+i+' has a boss');assert(Lines.getLine(b[0].g.actor,i).text.length>2);}
 assert.equal(A.STAGES[51].scene,'61');assert.equal(A.STAGES[51].awake,true);
 // 마지막 스테이지를 깨면 끝(엔딩)으로 간다
 const s=A.createRun({segment:bossCards(51).at(-1).k,difficulty:'gentle',seed:1});
 for(let i=0;i<4000&&s.stage!=='won';i++){s.player.invulnerableUntil=s.tick+60;if(s.stage==='card')s.boss.hp=0;A.step(s,{});}
 assert.equal(s.stage,'won');
});
