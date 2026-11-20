'use strict';
/* 보스 행동과 회피를 잇는 연출(11-20 연출 검토): 화면·소리 꼬리표가 실제 공격과 같은 순간·같은 자리를 가리키는지 본다. 판정은 바꾸지 않는다. */
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('./helpers/arcade-v43.cjs'),A=h.need();
global.HapilArcade=A;
const Cues=require('../src/arcade-cues-v43.js'),Audio=require('../src/audio-v37.js');
const segOf=(name,actor)=>A.SEGMENTS.findIndex(x=>x.name===name&&(!actor||x.actor===actor));
function toCard(seg,options){const s=A.createRun(Object.assign({difficulty:'normal',seed:5,segment:seg,entranceAll:true},options));for(let i=0;i<6000&&!(s.stage==='card'&&s.seg===seg);i++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});h.clear(s);}assert.equal(s.stage,'card');return s;}

test('level-up text names what actually grew (main gun 2→3 at level 3)',()=>{
 assert.equal(Cues.gainText(3),'주포 2→3발');assert.equal(Cues.gainText(4),'유도탄 2→4발');assert.match(Cues.gainText(2),/연사/);
 for(let l=2;l<=7;l++)assert(Cues.gainText(l).length>0,'every level shows a gain '+l);
 assert.equal(Cues.gainText(1),'');assert.equal(Cues.gainText(9),'');
});

test('the thickest root in the garden is tagged, fades the decor while it lands and the axis matches the strike',()=>{
 const seg=segOf('가장 굵은 뿌리','p1_tree');assert(seg>=0);const s=toCard(seg);let seen=null;
 for(let i=0;i<900&&!seen;i++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});seen=s.lasers.find(l=>l.cue==='root');h.clear(s);}
 assert(seen,'root strike appears');assert.equal(seen.x,s.p1x,'the drawn axis is the strike column');
 Cues.reset();seen.age=Math.round(seen.warn/2);assert(Cues.decorFade(s)<.4,'decor steps back during the warning');
 seen.age=seen.warn+seen.active+1;assert.equal(Cues.decorFade(s),1,'and returns after');
});

test('the gluttony plate remembers where the hero stood when the swallow began, and the spit flies there',()=>{
 const seg=segOf('거대한 위장','p2_beelzebub');assert(seg>=0);const s=toCard(seg);let c=null;
 for(let i=0;i<1200&&!c;i++){s.player.invulnerableUntil=s.tick+999;A.step(s,{});if(s.skillCast&&s.skillCast.kind==='stomach')c=s.skillCast;h.clear(s);}
 assert(c,'stomach cast');assert(Number.isFinite(c.px)&&Number.isFinite(c.py));
 const aim=Math.atan2(c.py-c.y,c.px-c.x);assert(Math.abs(Math.atan2(Math.sin(aim-c.angle),Math.cos(aim-c.angle)))<1e-6,'remembered spot lies on the locked aim');
});

test('a graduation photo beside an empty chair follows only the gluttony boss down, and leaves when the next map fights',()=>{
 Cues.reset();const s={tick:100,stageIndex:15,stage:'bossClear',n:0,mobs:[],boss:{down:{actor:'p2_beelzebub',x:180,y:120}},lasers:[]};
 Cues.onEvent('bossDown',s,A,null);assert(Cues._state().memorial);
 Cues.reset();s.boss.down.actor='asmodeus';Cues.onEvent('bossDown',s,A,null);assert(!Cues._state().memorial);
});

test('wave mobs get a firing cue a fixed lead before they shoot',()=>{
 const s=A.createRun({difficulty:'normal',seed:9,segment:0,entranceAll:true});let cued=0,fired=0,early=0;
 for(let i=0;i<1600;i++){s.player.invulnerableUntil=s.tick+999;const before=s.mobs.map(m=>[m,m.shots]);A.step(s,{});
  for(const [m,n] of before)if(m.shots>n){fired++;if(m.cueAt!==undefined&&m.cueAt<=s.tick&&s.tick-m.cueAt<=2)cued++;}
  for(const m of s.mobs)if(m.cueAt!==undefined&&m.cueAt-s.tick>A.MOB_CUE_LEAD)early++;h.clear(s);}
 assert(fired>5,'mobs fired '+fired);assert(cued/fired>=.8,'most shots were cued '+cued+'/'+fired);assert.equal(early,0);
});

test('the gate captain bolts lock with the command columns; every new cue has a sound',()=>{
 const seg=segOf('짧은 틈','p5_grand');assert(seg>=0);const s=toCard(seg),seen=new Set();let tagged=0;
 for(let i=0;i<3000&&tagged<4&&s.seg===seg;i++){s.player.invulnerableUntil=s.tick+999;s.boss.hp=s.boss.maxHp;A.step(s,{});for(const l of s.lasers)if(l.cue==='bolt'&&!seen.has(l)){seen.add(l);tagged++;}h.clear(s);}
 assert(tagged>=4,'bolt columns '+tagged);
 Cues.reset();const sounds=[];const play=n=>sounds.push(n);const t={tick:0,stage:'card',n:0,lasers:[{cue:'bolt',x:90,age:0,warn:10,active:5,color:0}],mobs:[],boss:{x:180,y:100},player:{x:180,y:500},stageIndex:36};
 for(let i=0;i<20;i++){Cues.frame(t,A,play);t.lasers[0].age++;t.tick++;}
 assert.deepEqual(sounds,['gateClang','boltRelease']);
 for(const n of ['inkSwell','gateClang','boltRelease','hwandoThree','brushStroke'])assert(Audio.CUES[n],n);
 const app=h.read('src/arcade-app-v43.js');assert(/riserWarn'\)\{if\(!s\.special\)play\('inkSwell'/.test(app),'rising ink has its own low thud, lasers keep the rising cue');
 const html=h.read('arcade.html');assert(html.indexOf('src/arcade-cues-v43.js')>0&&html.indexOf('src/arcade-cues-v43.js')<html.indexOf('src/arcade-app-v43.js'));
});

test('the same three hwando beats ring at the shared core (42) and return at the triplets record (52)',()=>{
 const core=A.STAGES.findIndex(g=>g.scene==='50');assert.equal(core,41);
 Cues.reset();const sounds=[];const s={tick:1,stageIndex:core,stage:'bossClear',n:0,mobs:[],lasers:[],boss:{x:180,y:120,down:{actor:'chief',x:180,y:120}},player:{x:180,y:500}};
 Cues.frame(s,A,()=>{});Cues.onEvent('bossDown',s,A,n=>sounds.push(n));
 const trip=segOf('세쌍둥이의 기록');assert(trip>=0);const t={tick:2,seg:trip,stageIndex:A.SEGMENTS[trip].stage,stage:'card',n:0,mobs:[],lasers:[],boss:{x:180,y:120},player:{x:180,y:500}};
 Cues.onEvent('card',t,A,n=>sounds.push(n));assert.deepEqual(sounds,['hwandoThree','hwandoThree']);
});
