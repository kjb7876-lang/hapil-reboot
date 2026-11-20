'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),story=require('../src/arcade-story-v43.js'),arcade=require('../src/arcade-v43.js');
const original=fs.readFileSync(path.join(root,story.SOURCE.file)),source=original.toString('utf8'),normalize=s=>s.replace(/\s+/g,' ').trim();
const parts=source.split(/^\[([^\]]+)\]\s*$/m),sections={};for(let i=1;i<parts.length;i+=2)sections[parts[i]]=parts[i+1];

test('the supplied canonical narrative remains byte-identical and covers all 52 combat stages',()=>{
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),story.SOURCE.sha256);
 assert.equal(story.STAGES.length,52);assert.equal(arcade.STAGES.length,52);
 for(const [i,entry] of story.STAGES.entries()){
  assert.equal(story.getStage(i),entry);assert.equal(entry.stage,i);assert.equal(entry.title,arcade.STAGES[i].name);
  assert.equal(entry.sourceSection,entry.title==='무너진성'?'무너진 성':entry.title);
  assert(sections[entry.sourceSection],entry.title+' has its own canonical section');
 }
 assert.equal(story.getStage(-1),null);assert.equal(story.getStage(52),null);assert.equal(story.getStage('1'),null);
});

test('every short scene quotes its own canonical narrator without invented dialogue or oversized mobile text',()=>{
 for(const entry of [...story.STAGES,...story.TRANSITIONS,story.PROLOGUE,story.FINALE]){
  const body=entry===story.FINALE?source.split('최종장 — 남겨진 몽세')[1]:sections[entry.sourceSection];
  assert.equal(entry.kind,'memory');assert.equal(entry.lines.length,2);assert(body.includes('〈'+entry.speaker+'〉'));
  for(const line of entry.lines){assert.equal(line.speaker,entry.speaker);assert(normalize(body).includes(normalize(line.text)),entry.title+': '+line.text);assert(line.text.length<=80);}
  assert(Object.isFrozen(entry)&&Object.isFrozen(entry.lines));
 }
});

test('six non-combat transitions keep source order, speaker changes and the ending separate from entrance scenes',()=>{
 const expected=[[9,'기억하지 못하는 사람'],[19,'사라진 귀환자'],[25,'환도 자아의 탄생'],[28,'끼어든 시간'],[38,'최초명령 재작성'],[41,'잘못 이어진 기록']];
 assert.deepEqual(story.TRANSITIONS.map(e=>[e.afterStage,e.title]),expected);
 for(const [stage,title] of expected)assert.equal(story.getTransition(stage).title,title);
 assert.equal(story.getTransition(0),null);
 assert.equal(story.getStage(10).speaker,'의목사 A의 기억');assert.equal(story.getStage(20).speaker,'의목사 B의 기억');
 assert.equal(story.getStage(26).speaker,'환도의 기억');assert.equal(story.getStage(29).speaker,'윤서하의 기억');
 assert.equal(story.getStage(42).speaker,'윤하람의 기억');assert.equal(story.getStage(43).speaker,'장민재의 기억');assert.equal(story.getStage(44).speaker,'고서진의 기억');
 assert(story.FINALE.lines.some(l=>l.text.includes('몽세수호자')));
 for(const entry of story.STAGES)for(const line of entry.lines)assert(!line.text.includes('몽세수호자가 되었다'));
});

test('the browser receives the same canonical module without Node dependencies',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/arcade-story-v43.js'),'utf8'),context);
 assert.equal(context.HapilArcadeStory.getStage(51).sourceSection,'교주의 사몽');
 assert.equal(context.HapilArcadeStory.SOURCE.sha256,story.SOURCE.sha256);
});
