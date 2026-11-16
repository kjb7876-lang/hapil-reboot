'use strict';
// 사용자 11-16 "먹그림올라오는거 서사에맞게 약간 그림으로 스토리푸는느낌으로 시체들이되살아난밤이면 해골문양 성이면 성 뭐 그런식으로 은연중에 티나게"
// "먹그림들 올라와서 사리지그전에 먹폭발한변하고 사라지도록 불꽃놀이 수묵화버전마냥 화려하게 보는맛이나게".
// 스테이지마다 이야기 소재 둘(서양 소재 셋과 겹치지 않음)이 더 솟아, 한 바퀴의 절반 넘게가 그 스테이지 이야기 그림이다. 사라질 때는 먹이 터진다(그리기만).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),h=require('./helpers/arcade-v43.cjs');
const a=h.need(),app=fs.readFileSync(path.join(__dirname,'..','src/arcade-app-v43.js'),'utf8'),art=fs.readFileSync(path.join(__dirname,'..','src/ink-motifs-v43.js'),'utf8');
const NEW=['castle','tomb','heel','glasses','syringe','tree'];
const by=name=>{const i=a.STAGES.findIndex(g=>g.name.indexOf(name)>=0);assert(i>=0,name);return i;};
test('new story drawings exist in the engine and the brush art',()=>{
  NEW.forEach(k=>{const m=a.MOTIFS[k];assert(m&&m.size>=50&&m.size<=90,'size of '+k);assert(m.hit.length>=1,'hit of '+k);
    m.hit.forEach(c=>{assert(c[2]>0&&c[2]<=.9);assert(Math.abs(c[0])+c[2]<=1.25&&Math.abs(c[1])+c[2]<=1.25,'inside '+k);});
    assert.match(art,new RegExp('M\\.'+k+'=function'),'drawn '+k);});
  NEW.forEach(k=>assert(a.MOTIF_STORY.includes(k),'story list has '+k));
});
test('every stage tells its story: two story subjects, and most of a cycle is that stage\'s own subjects',()=>{
  const used=new Set();
  for(let i=0;i<a.STAGES.length;i++){const s=a.stageStory(i),t=a.stageMotifs(i),p=a.motifPlan(i);
    assert.equal(s.length,2,'two story subjects at '+i);assert.notEqual(s[0],s[1]);
    s.forEach(k=>{assert(a.MOTIFS[k],'known '+k);assert(!t.includes(k),'story differs from the western three at '+i);used.add(k);});
    assert.equal(p.filter(k=>k===s[0]).length,2,'lead story subject twice at '+i);assert(p.includes(s[1]));
    const own=p.filter(k=>s.includes(k)||t.includes(k)).length;assert(own*2>p.length,'own subjects '+own+'/'+p.length+' at '+i);}
  NEW.forEach(k=>assert(used.has(k),k+' used'));
});
test('the stories read from the stage names',()=>{
  assert(a.stageStory(by('시체들이 되살아난 밤')).includes('tomb'));assert.equal(a.stageMotifs(by('시체들이 되살아난 밤'))[0],'skull');
  assert.equal(a.stageStory(by('무너진성'))[0],'castle');assert.equal(a.stageStory(by('악마화 나무의 정원'))[0],'tree');
  assert.equal(a.stageStory(by('붉은 하이힐'))[0],'heel');assert.equal(a.stageStory(by('금이 간 안경'))[0],'glasses');
  assert.equal(a.stageStory(by('피로 물든 병원'))[0],'syringe');assert.equal(a.stageStory(by('솔로몬의 봉인식'))[0],'hexagram');
  assert.equal(a.stageStory(by('불을 지른 남자'))[0],'flame');
});
test('a subject bursts into an ink firework before it vanishes, drawing only',()=>{
  assert.match(app,/function drawInkBurst\(/,'burst painter');
  assert.match(app,/r\.fade[^\n]*drawInkBurst\(|drawInkBurst\([^\n]*r\.fade/,'called while the subject fades');
  const body=app.slice(app.indexOf('function drawInkBurst('),app.indexOf('function drawInkBurst(')+3000);
  assert.doesNotMatch(body.split('\n')[0]+body.split('\n')[1],/#c2362a|#c9406e/,'no vermilion: the burst is ink');
});
