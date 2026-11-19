'use strict';
/* 사용자 11-19: "같은 이미지의 보스가 반복해서 나오는문제, 탄종류를 보스마다 고유하나씩은 가지고 있도록 탄문양 ex 주먹 시간 검 미사일 거미줄 같은 그리고 그 고유탄위주로 사용하게".
 * 1) 이어 나오는 두 스테이지에서 같은 그림의 보스가 다시 나오지 않는다(같은 인물이면 다른 모습 그림).
 * 2) 모든 보스·중간보스가 고유 탄 문양을 갖고, 같은 맵의 중간보스·보스와 앞 맵 보스끼리 문양이 겹치지 않는다.
 * 3) 앱은 보스가 나와 있는 동안 그 문양으로 탄을 그린다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),A=require('../src/arcade-v43.js');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43/manifest.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
function cast(){return A.STAGES.map((g,i)=>{const mid=[],boss=[];A.SEGMENTS.forEach(s=>{if(s.stage!==i||s.kind!=='card')return;const l=s.mid?mid:boss;if(l.indexOf(s.actor)<0)l.push(s.actor);});return {mid,boss};});}

test('no boss picture repeats in two stages in a row',()=>{
  const c=cast();let prev=[];
  c.forEach((g,i)=>{const arts=[...g.mid,...g.boss].map(a=>A.bossArtOf(a,i));
    arts.forEach(k=>assert.ok(manifest[k+'.webp'],'picture '+k+' is in the bundle'));
    arts.forEach(k=>assert.ok(prev.indexOf(k)<0,'stage '+i+' ('+A.STAGES[i].name+') repeats picture '+k+' from the stage before'));
    prev=arts;});
});

test('alternate forms are the same person',()=>{
  Object.keys(A.BOSS_FORMS).forEach(k=>{const [actor,scene]=k.split('@'),key=A.BOSS_FORMS[k];
    assert.equal(A.FORM_BASE[key],actor);assert.ok(A.ACTORS[actor],actor);
    assert.ok(A.STAGES.some(g=>g.scene===scene),'scene '+scene);
    assert.ok(manifest[key+'.webp']&&manifest[key+'.webp'].table==='tools/arcade-art-v43/forms.json',key);});
});

test('every boss and midboss has its own shot shape, neighbours differ (the same person keeps its shape)',()=>{
  const c=cast();let prevBoss='',prevActor='';
  c.forEach((g,i)=>{
    [...g.mid,...g.boss].forEach(a=>assert.ok(A.SHOT_KINDS.indexOf(A.bossShotOf(a))>=0,a+' has a shot shape'));
    const mids=g.mid.map(A.bossShotOf),boss=g.boss.map(A.bossShotOf);
    mids.forEach(m=>assert.ok(boss.indexOf(m)<0,'stage '+i+': midboss and boss share '+m));
    if(prevBoss){if(g.boss[0]!==prevActor)assert.notEqual(boss[0],prevBoss,'stage '+i+' boss shot repeats the stage before');g.mid.forEach((a,k)=>a!==prevActor&&assert.notEqual(mids[k],prevBoss,'stage '+i+' midboss shot repeats the stage before boss'));}
    prevBoss=boss[boss.length-1];prevActor=g.boss[g.boss.length-1];});
  assert.ok(new Set(c.map(g=>A.bossShotOf(g.boss[0]))).size>=24,'many different shapes across the journey');
});

test('app draws the boss shot shape while a boss is out',()=>{
  assert.match(app,/var shot=bossShot\(s\);if\(shot\)return shot;/);
  assert.match(app,/buildShot\(kind,radius,COLORS\[color\],orbTint\)/);
  A.SHOT_KINDS.forEach(k=>assert.ok(app.indexOf("k==='"+k+"'")>=0,'shape '+k+' is drawn'));
  assert.match(app,/drawArt\(ak,0,0,s\.tick-b\.hitTick<3/,'boss is drawn with its picture for this stage');
});
