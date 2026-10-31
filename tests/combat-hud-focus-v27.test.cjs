'use strict';
// Native CPU text-coordinate and DOM/CSS wiring checks. No browser/device FPS
// claim: the renderer observes genuine core snapshots with explicit immunity.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const a=require('../tools/audit-object-projectiles-v24.cjs');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const {harness,boot,advance,practice}=require('./helpers/story-app-fixture-v19.cjs');
const core=require('../src/core.js');

// The Node engine resolves the same production pattern module as the app.
// Other fixture modules remain isolated in their renderer VM.
function runtime(){const box=a.runtime();box.HapilCore=core;return box;}

function phaseWorld(box,group,phase=0){
  const C=box.HapilCore,initial=C.createRun({campaign:true,campaignRevision:group===12?3:5,combatRevision:27,practiceBoss:true,bossIndex:group>=13?group-1:group===12?11:group,finalPractice:group===12,difficulty:'hell',seed:4242,runId:'v27-hud-focus'});
  const boundary=C.checkpoint(initial);boundary.phase=phase;
  const w=C.restoreCheckpoint(boundary);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;
}
function capture(box,images){
  const canvas=createCanvas(360,640);canvas.style={};const ctx=canvas.getContext('2d'),texts=[],fillText=ctx.fillText.bind(ctx);
  ctx.fillText=(text,x,y,...rest)=>{const m=ctx.getTransform();texts.push({text:String(text),x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});return fillText(text,x,y,...rest);};
  const renderer=box.HapilRenderer.create(canvas,images);renderer.resize(360,640,1);
  return {renderer,draw(w,low){texts.length=0;const before=JSON.stringify(w);renderer.draw(w,0,w.time||0,low);assert.equal(JSON.stringify(w),before);return {texts:texts.map(t=>({...t})),metrics:renderer.getMetrics()};},close(){renderer.destroy();}};
}

test('every actual encounter keeps the lower combat field free of text in quiet and live attack states',async()=>{
  const box=runtime(),cache=new Map();let checked=0,live=0;
  for(let group=0;group<=35;group++){
    const images=await a.imagesFor(box,group,cache),f=capture(box,images);
    try{for(const phase of[0,2]){
      const w=phaseWorld(box,group,phase);
      for(const target of[1,180]){
        while(w.tick<target)box.HapilCore.step(w,{});
        assert.equal(w.stage,'boss');
        // Exercise the former skill-reservation path without inventing a real
        // core event or changing the underlying attack records.
        const fixture=JSON.parse(JSON.stringify(w));fixture.reservation='RESERVATION MUST NOT COVER MOVEMENT';
        for(const low of[false,true]){
          const out=f.draw(fixture,low),lower=out.texts.filter(t=>t.y>=260&&t.y<=640);
          assert.deepEqual(lower,[],JSON.stringify({group,phase,target,low,lower}));
          assert(!out.texts.some(t=>t.text.includes('MEMORY SIGN')||t.text.includes('RESERVATION MUST')));
          assert.equal(out.metrics.patternEntryCue,null,'opening pattern names do not create a middle panel');
          assert(out.metrics.battleReadability,'essential boss status remains available');
          assert(out.metrics.battleReadability.box[1]+out.metrics.battleReadability.box[3]<=64);
          assert(out.texts.some(t=>t.y<=64),'top health/timer/status text is retained');
          if(w.bullets.length||w.hazards.length)live++;checked++;
        }
      }
    }}finally{f.close();}
  }
  assert.equal(checked,288);assert(live>70,'actual attack snapshots, not just empty fixtures, were rendered');
});

test('approach waves also omit reservation text while preserving the top route indication',async()=>{
  const box=runtime(),images=await a.imagesFor(box,0),f=capture(box,images);
  try{const w=box.HapilCore.createRun({campaign:true,campaignRevision:5,combatRevision:27,difficulty:'normal',seed:4242});
    assert.equal(w.stage,'waves');w.reservation='SKILL QUEUED';box.HapilCore.step(w,{});
    for(const low of[false,true]){const out=f.draw(w,low);assert(!out.texts.some(t=>t.y>=260));assert(out.texts.some(t=>t.y===46),'route information remains at the top');}
  }finally{f.close();}
});

test('boss entrance names and chronological transition narrative remain visible outside active combat',async()=>{
  const box=runtime(),images=await a.imagesFor(box,4),f=capture(box,images);
  try{const w=phaseWorld(box,4);w.stage='bossIntro';w.stageTime=1.2;w.bossIntroDuration=2.5;
    let out=f.draw(w,false);assert(out.metrics.introActive);assert(out.texts.some(t=>t.y===478&&t.text===w.bossName),'intro name plate remains available');
    w.stage='transition';w.stageTime=.1;w.stageLabel='다음 기억으로';w.transitionNarrative=['환도는 병원에서 미카엘라의 치료를 받는다.'];
    out=f.draw(w,false);assert(out.texts.some(t=>t.text==='다음 기억으로'&&t.y===106));assert(out.texts.some(t=>t.text.includes('미카엘라')&&t.y>=132&&t.y<=216));
  }finally{f.close();}
});

test('actual app events stay quiet during combat and pause/settings/error controls retain their notices',async()=>{
  const h=harness();await boot(h);const attrs={};h.el('app').setAttribute=(name,value)=>{attrs[name]=value;};
  await practice(h,19);assert.equal(attrs['data-mode'],'playing');assert.equal(h.el('toast').hidden,true,'practice startup does not overlay the arena');
  const w=h.world();w.events.push({type:'phase'},{type:'summon'});await advance(h);
  assert.equal(h.el('toast').hidden,true,'phase names and reinforcements have visual cues instead of toasts');
  h.click('settings-button');assert.equal(h.g.HapilApp.getState().mode,'paused');assert.equal(h.el('settings-modal').hidden,false);assert.equal(attrs['data-mode'],'paused');
  h.click('settings-close');assert.equal(h.el('toast').hidden,false);assert.match(h.el('toast').textContent,/전투 계속하기/);
  h.click('resume-button');assert.equal(h.g.HapilApp.getState().mode,'playing');assert.equal(h.el('toast').hidden,true,'stale pause notices do not carry into combat');
  const broken=harness({fail:h.g.HapilMedia.storyGoblin});await boot(broken);await practice(broken,19);
  assert.equal(broken.g.HapilApp.getState().mode,'error');assert.equal(broken.el('error-screen').hidden,false);assert(broken.el('error-description').textContent,'asset failure still has a readable error');
});

test('CSS keeps rare operational notices at the top and quiets bottom status without hiding controls or storage warnings',()=>{
  const css=fs.readFileSync(path.join(a.ROOT,'styles.css'),'utf8'),toast=css.match(/\.toast\{([^}]*)\}/)[1];
  assert.match(toast,/(?:^|;)top:72px(?:;|$)/);assert.doesNotMatch(toast,/(?:^|;)bottom:/);
  assert.match(css,/\.app-shell\[data-mode="playing"\] \.arena-footer\{visibility:hidden\}/);
  assert.match(css,/\.app-shell\[data-mode="playing"\] \.mobile-storage-status:not\(\.warning\)\{visibility:hidden\}/);
  assert.doesNotMatch(css,/\.app-shell\[data-mode="playing"\] [^}]*?(?:\.touch-pad|\.pause-button|\.warning)\{(?:display:none|visibility:hidden)/);
});
