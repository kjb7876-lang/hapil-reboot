'use strict';
// Native CPU Canvas, exact current core states and actual retained image bytes.
// All phase observations disable attacks/skills and grant explicit immunity.
// The separate drain fixture lowers boss HP and uses a real delayed-hit update.
// Neither is natural play, a browser run, GPU timing, or phone performance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
const ROOT=path.resolve(__dirname,'..'),BASE='079c830e40d607d9944215a107003d66e85367ce';
const OUTPUT=path.join(ROOT,'docs/v20-battle-pixels'),REPORT=path.join(ROOT,'docs/V20-VISUAL-REVIEW-20261030.json');
const CODE=['index.html','styles.css',...fs.readdirSync(path.join(ROOT,'src')).filter(x=>x.endsWith('.js')).map(x=>'src/'+x)];
const MODULES=['src/media.js','src/weapon-patterns.js','src/core.js','src/boss-motion.js','src/story-assets.js','src/actors.js','src/projectiles.js','src/boss-skills.js','src/render.js'];
const COMPARE=[1,7,19,20,30,31,34,35],CASES=['warning','active','peak'],DRAWS=20,WARMUP=4,TICKS=1800;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fontProbe(){try{const families=cp.execFileSync('fc-list',[':lang=ko','family'],{encoding:'utf8'}).trim();return{command:'fc-list :lang=ko family',available:!!families,families:families?families.split('\n'):[],koreanGlyphPixelsCertified:false};}catch(error){return{command:'fc-list :lang=ko family',available:null,error:'font discovery unavailable',koreanGlyphPixelsCertified:false};}}
function source(file,ref){return ref?cp.execFileSync('git',['show',ref+':'+file],{cwd:ROOT}):fs.readFileSync(path.join(ROOT,file));}
function hashes(){return Object.fromEntries(CODE.map(f=>[f,sha(source(f))]));}
function runtime(ref){
  const box={document:{createElement(){return createCanvas(1,1);}}};box.window=box;box.global=box;
  const context=vm.createContext(box);
  for(const file of MODULES)vm.runInContext(source(file,ref).toString('utf8'),context,{filename:ref?ref.slice(0,8)+':'+file:file});
  // Reuse the product's complete per-encounter asset selection rather than a
  // larger synthetic bag which could conceal an omitted required dependency.
  const app=source('src/app.js',ref).toString('utf8'),start=app.indexOf('  function mobileAssetKeys('),end=app.indexOf('\n  // Required actor',start);
  assert(start>=0&&end>start,'product asset-selector boundary');
  vm.runInContext(app.slice(start,end),context);
  return box;
}
function options(group,difficulty){
  return {campaign:true,campaignRevision:group>=19?5:group>=13?4:3,practiceBoss:true,bossIndex:group===12?11:group>=13?group-1:group,finalPractice:group===12,difficulty,seed:813,runId:'v20-visual-'+group+'-'+difficulty};
}
function phaseWorld(core,group,difficulty,phase){let w=core.createRun(options(group,difficulty)),snap=core.checkpoint(w);snap.phase=phase;w=core.restoreCheckpoint(snap);w.autoAttack=false;w.skillRotation=false;w.player.invulnerableUntil=999999;return w;}
function liveCount(w){return w.bullets.length+w.hazards.filter(h=>h.phase==='warning'||h.phase==='active').length;}
function capture(core,group,difficulty){
  const w=phaseWorld(core,group,difficulty,2),entry=structuredClone(w);let charge=null,release=null,warning=null,active=null,peak=null,peakValue=-1,target=null;
  for(let i=0;i<TICKS;i++){
    core.step(w,{});assert.equal(w.stage,'boss','controlled phase remains live '+group);
    if(!charge&&w.boss.action==='charge')charge=structuredClone(w);
    if(!release&&w.boss.releaseTick===w.tick)release=structuredClone(w);
    if(!target){const h=w.hazards.find(h=>h.phase==='warning'&&h.activeAt>w.tick);if(h)target={id:h.id,castId:h.castId,activeAt:h.activeAt,x1:h.x1,y1:h.y1,x2:h.x2,y2:h.y2,width:h.width};}
    if(target&&!warning&&w.tick===target.activeAt-1)warning=structuredClone(w);
    if(target&&!active&&w.tick===target.activeAt&&w.hazards.some(h=>h.id===target.id&&h.phase==='active'))active=structuredClone(w);
    const value=w.bullets.length+6*w.hazards.filter(h=>h.phase==='active').length;
    if(value>peakValue){peakValue=value;peak=structuredClone(w);}
  }
  assert(release&&peak,'actual attack must release '+group);
  assert.equal(w.stats.poolPressure,0);assert.equal(w.stats.droppedGroups,0);
  if(target){assert(warning&&active,'exact committed warning/active pair '+group);const a=warning.hazards.find(h=>h.id===target.id),b=active.hazards.find(h=>h.id===target.id);for(const key of ['x1','y1','x2','y2','width','activeAt'])assert.equal(a[key],b[key],'warning keeps damage geometry '+key);}
  return {states:{warning:warning||charge||entry,active:active||release,peak},target,warningKind:warning?'committed-laser-final-warning-tick':charge?'charge-no-laser':'phase-entry-no-laser',activeKind:active?'committed-laser-first-active-tick':'actual-projectile-release-no-laser',observation:{ticks:TICKS,peakBullets:w.stats.peakBullets,poolPressure:w.stats.poolPressure,droppedGroups:w.stats.droppedGroups}};
}
function drain(core,group,difficulty){
  const w=phaseWorld(core,group,difficulty,1);
  for(let i=0;i<TICKS;i++){core.step(w,{});if(w.bullets.length>=12||w.hazards.some(h=>h.phase==='active'))break;}
  assert(liveCount(w)>0,'real residual threats '+group);
  // Explicit fixture, never natural completion: enter the actual engine's
  // damage/phase boundary, retaining its already fired and warned attacks.
  w.boss.hp=1;w._delays.push({at:w.tick+1,targetId:w.boss.id,x:w.boss.x,y:w.boss.y});core.step(w,{});
  assert.equal(w.stage,'transition');assert(liveCount(w)>0,'transition does not erase hazards '+group);
  return structuredClone(w);
}
function validate(m,w,kind){
  const p=m.projectilePresentation,fx=m.bossSkillsPresentation,a=m.actorPresentation,r=m.battleReadability;
  assert(p&&fx&&a&&r,'real full renderer metrics');assert.equal(p.texturedBullets,w.bullets.length);assert.equal(p.missingProjectileAssets,0);assert.equal(fx.skillMissingAssets,0);
  assert(p.stampCacheBytes<=4194304);assert(fx.skillCacheBytes<=2097152);assert.equal(m.sceneCacheEntries,1);assert.equal(m.sceneCacheBytes,1036800);assert(m.playerShotCacheBytes<=24576);
  assert(r.box[1]+r.box[3]<=64,'persistent HUD stays above playfield');assert.equal(r.enemyBullets,w.bullets.length);
  const warnings=w.hazards.filter(h=>h.phase==='warning'),active=w.hazards.filter(h=>h.phase==='active');assert.equal(r.warningLasers,warnings.length);assert.equal(r.activeLasers,active.length);
  const nearest=warnings.length?Math.max(0,Math.min(...warnings.map(h=>h.activeAt))-w.tick):null;assert.equal(r.nearestWarningTicks,nearest);
  if(kind==='transition'){assert.equal(r.statusKind,'residual-danger');assert(r.liveThreats>0);assert.equal(r.remainingSeconds,null);}
  else{assert(a.bossDraws>=1);assert(Math.abs(r.remainingSeconds-Math.max(0,w.phaseTimeout-w.phaseTime))<1e-8);}
  if(m.specialPatternCue){assert.equal(m.specialPatternCue.hintRenderedInArena,false);assert(m.specialPatternCue.box[1]+m.specialPatternCue.box[3]<=64);}
}
function render(api,images,w,low,timed,kind){
  const canvas=createCanvas(360,640);canvas.style={};const renderer=api.HapilRenderer.create(canvas,images),before=sha(JSON.stringify(w));
  try{
    renderer.resize(360,640,1);for(let i=0;i<WARMUP;i++)renderer.draw(w,0,w.time,low);
    const warm=renderer.getMetrics(),builds=warm.sceneCacheBuilds,layoutBuilds=warm.battleReadability&&warm.battleReadability.textLayoutBuilds,times=[];
    for(let i=0;i<(timed?DRAWS:1);i++){const start=performance.now();renderer.draw(w,0,w.time,low);if(timed)times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);const m=renderer.getMetrics();if(kind){validate(m,w,kind);assert.equal(m.battleReadability.textLayoutBuilds,layoutBuilds,'unchanged HUD text layout reused');}assert.equal(m.sceneCacheBuilds,builds,'background cache reused');assert.equal(sha(JSON.stringify(w)),before,'presentation never mutates core state');
    // destroy() deliberately releases the renderer-owned destination too.
    // Preserve actual output pixels before that release, outside timing.
    const snapshot=createCanvas(360,640);snapshot.getContext('2d').drawImage(canvas,0,0);
    return {canvas:snapshot,metrics:m,timing:timed?{samples:DRAWS,p50Ms:times[9],p95Ms:times[18],peakMs:times[19]}:null};
  }finally{renderer.destroy();}
}
function row(group,difficulty,kind,low,w,result,capture){
  const m=result.metrics,p=m.projectilePresentation,fx=m.bossSkillsPresentation,a=m.actorPresentation;
  return {group,difficulty,case:kind,quality:low?'low':'high',tick:w.tick,stage:w.stage,bullets:w.bullets.length,hazards:w.hazards.length,timing:result.timing,warningKind:capture&&capture.warningKind,activeKind:capture&&capture.activeKind,committedLaser:capture&&capture.target,readability:m.battleReadability,specialCue:m.specialPatternCue,actor:{bossDraws:a.bossDraws,echoes:a.storyEchoDraws||0,targetMarker:a.storyTargetMarkerDraws||0,participants:a.storyParticipantDraws||0,usedAssets:a.usedAssets},projectiles:{textured:p.texturedBullets,missing:p.missingProjectileAssets,sourceBeamOverlayDraws:p.sourceBeamOverlayDraws,assetLaserDraws:p.assetLaserDraws,maxVisualOutset:p.maxVisualOutset,naturalSilhouetteDraws:p.naturalSilhouetteDraws},skills:{draws:fx.skillSourceDraws,limit:fx.skillDrawLimit,candidates:fx.skillReleaseCandidates,emitters:fx.skillReleaseEmitters,representedReleases:fx.representedReleases},cache:{projectiles:p.stampCacheBytes,skills:fx.skillCacheBytes,scene:m.sceneCacheBytes,playerShot:m.playerShotCacheBytes},observation:capture&&capture.observation};
}
function imageCell(target,canvas,group,line){
  const x=(group%6)*180,y=Math.floor(group/6)*340,ctx=target.getContext('2d');ctx.fillStyle='#0e1420';ctx.fillRect(x,y,180,340);ctx.fillStyle='#eee';ctx.font='10px sans-serif';ctx.fillText('GROUP '+String(group).padStart(2,'0')+' / '+line,x+4,y+13);ctx.drawImage(canvas,x,y+18,180,320);
}
async function main(){
  if(process.argv.includes('--describe')){console.log(JSON.stringify({scope:'Preparation only: no image decode, engine observation or timed draw executed',baseline:BASE,timedCases:36*3*2,draws:36*3*2*DRAWS,additionalUntimed:'NORMAL same three states and both qualities; live residual transition each group/difficulty/quality;8 baseline/current actual-pixel pairs',ticks:TICKS,output:OUTPUT},null,2));return;}
  if(process.argv.includes('--check-runtime')){
    const api=runtime(),old=runtime(BASE);for(const box of [api,old])for(const key of ['HapilCore','HapilRenderer','HapilProjectiles','HapilBossSkills'])assert(box[key],key);
    const groups=Array.from({length:36},(_,group)=>{const keys=api.mobileAssetKeys(group);assert(keys.length>0);assert(keys.every(k=>api.HapilMedia[k]));return{group,images:keys.length};});
    console.log(JSON.stringify({scope:'Preparation only: both real module APIs and36 product asset selections initialized; no image decode, engine observation or timed draw executed',groups},null,2));return;
  }
  const codeHashes=hashes(),beforeHashes=Object.fromEntries(CODE.map(f=>[f,sha(source(f,BASE))])),fonts=fontProbe();
  for(const name of ['src/core.js','src/storage.js','src/media.js','src/weapon-patterns.js'])assert.equal(codeHashes[name],beforeHashes[name],'physics, save and original media stay unchanged '+name);
  const after=runtime(),before=runtime(BASE),media=after.HapilMedia,sources={},rows=[],drains=[],comparisons=[],photos={};
  // The reviewed table corrects exactly two display registrations. Normalize
  // only those explicit values, then compare every other field/owner/source.
  const oldEntries=JSON.parse(JSON.stringify(before.HapilStoryAssets.entries)),newEntries=JSON.parse(JSON.stringify(after.HapilStoryAssets.entries));
  const old31=oldEntries.find(e=>e.group===31),new31=newEntries.find(e=>e.group===31),old34=oldEntries.find(e=>e.group===34),new34=newEntries.find(e=>e.group===34);
  assert.deepEqual(old31.projectiles.blade.anchor,[288,269]);assert.deepEqual(new31.projectiles.blade.anchor,[288.5,269]);
  assert.equal(old34.projectiles.participants['han-rian'].blade.fixedOrientation,true);assert.equal(new34.projectiles.participants['han-rian'].blade.fixedOrientation,false);
  new31.projectiles.blade.anchor[0]=288;new34.projectiles.participants['han-rian'].blade.fixedOrientation=true;assert.deepEqual(newEntries,oldEntries,'only the two reviewed display metadata corrections are allowed');
  const metadataDelta=[{group:31,field:'projectiles.blade.anchor[0]',before:288,after:288.5,scope:'source sampling registration; collision unchanged'},{group:34,sourceActorId:'han-rian',field:'projectiles.participants.han-rian.blade.fixedOrientation',before:true,after:false,scope:'elongated source body follows physical travel axis; orb remains fixed'}];
  fs.mkdirSync(OUTPUT,{recursive:true});for(const kind of CASES)photos[kind]=createCanvas(1080,2040);
  const contact=createCanvas(720,COMPARE.length*342),contactCtx=contact.getContext('2d');contactCtx.fillStyle='#0e1420';contactCtx.fillRect(0,0,contact.width,contact.height);
  for(let group=0;group<36;group++){
    const keys=[...new Set(after.mobileAssetKeys(group).concat(before.mobileAssetKeys(group)))],images={};
    for(const key of keys){assert(media[key],'registered own image '+key);const file=path.join(ROOT,media[key]),bytes=fs.readFileSync(file);images[key]=await loadImage(file);sources[key]={path:media[key],bytes:bytes.length,sha256:sha(bytes),dimensions:[images[key].width,images[key].height]};}
    assert.equal(after.HapilProjectiles.invalidAssetForEncounter(images,group),null);assert.equal(after.HapilRenderer.invalidTerrainAsset(images,group),null);
    for(const difficulty of ['normal','hell']){
      const c=capture(after.HapilCore,group,difficulty);
      for(const kind of CASES)for(const low of [false,true]){
        const w=c.states[kind],r=render(after,images,w,low,difficulty==='hell',kind);rows.push(row(group,difficulty,kind,low,w,r,c));
        if(difficulty==='hell'&&!low){imageCell(photos[kind],r.canvas,group,kind+' t'+w.tick);}
        if(difficulty==='hell'&&kind==='peak'&&!low&&COMPARE.includes(group)){
          const original=render(before,images,w,false,false,null),pair=createCanvas(720,660),pc=pair.getContext('2d');pc.fillStyle='#0e1420';pc.fillRect(0,0,720,660);pc.font='12px sans-serif';pc.fillStyle='#eee';pc.fillText('V19 BASE / GROUP '+group,8,14);pc.fillText('V20 CANDIDATE / SAME CORE TICK '+w.tick,368,14);pc.drawImage(original.canvas,0,20);pc.drawImage(r.canvas,360,20);
          const file='compare-group-'+String(group).padStart(2,'0')+'.jpg';fs.writeFileSync(path.join(OUTPUT,file),pair.toBuffer('image/jpeg'));
          const y=COMPARE.indexOf(group)*342;contactCtx.fillStyle='#eee';contactCtx.font='11px sans-serif';contactCtx.fillText('GROUP '+group+' / V19 BASE',8,y+14);contactCtx.fillText('V20 / SAME TICK '+w.tick,368,y+14);contactCtx.drawImage(original.canvas,90,y+20,180,320);contactCtx.drawImage(r.canvas,450,y+20,180,320);
          comparisons.push({group,tick:w.tick,file,baselineMetrics:{specialCue:original.metrics.specialPatternCue,skillDraws:original.metrics.bossSkillsPresentation.skillSourceDraws,representedReleases:original.metrics.bossSkillsPresentation.representedReleases},candidateMetrics:{specialCue:r.metrics.specialPatternCue,readability:r.metrics.battleReadability,skillDraws:r.metrics.bossSkillsPresentation.skillSourceDraws,representedReleases:r.metrics.bossSkillsPresentation.representedReleases}});
        }
      }
      const transition=drain(after.HapilCore,group,difficulty);for(const low of [false,true]){const r=render(after,images,transition,low,false,'transition');drains.push(row(group,difficulty,'transition',low,transition,r));}
    }
    if(group%6===5)console.log(JSON.stringify({completedGroups:group+1,total:36}));
  }
  for(const kind of CASES)fs.writeFileSync(path.join(OUTPUT,'all36-'+kind+'.jpg'),photos[kind].toBuffer('image/jpeg'));
  fs.writeFileSync(path.join(OUTPUT,'baseline-candidate-contact.jpg'),contact.toBuffer('image/jpeg'));
  const finalHashes=hashes();assert.deepEqual(finalHashes,codeHashes,'source changed during observation/measurement');
  const timed=rows.filter(r=>r.timing),report={schema:1,capturedAt:new Date().toISOString(),node:process.version,status:'measurements-passed-pending-direct-contact-review',baselineCommit:BASE,codeHashes,baselineCodeHashes:beforeHashes,sourceHashGuardPassed:true,allowedVisualMetadataDelta:metadataDelta,fontAvailability:fonts,scope:'Actual source assets, native CPU Canvas360×640 DPR1.72 controlled phase3 observations ×warning/active/densepeak ×high/low; HELL216cases measured20draws after4warmups; NORMAL216cases untimed.144 real engine transition-drain render cases are untimed.',fixture:{phase:'restore phase2 through product checkpoint API; autoattack/skills off; explicit invulnerabilityUntil999999;1800 actual steps',transition:'restore phase1, wait for actual live threats, set boss HP1 and queue actual delayed-hit; engine transitions while preserving attacks'},excludedClaims:['natural-input completion','actual browser input','headless browser','software GPU','hardware GPU','mobile emulation','real phone','sustained FPS','image decode timing','simulation timing','Korean font certification'],summary:{groups:36,difficulties:2,phaseRenderCases:rows.length,timedCases:timed.length,measuredDraws:timed.length*DRAWS,transitionCases:drains.length,exactWarningPairs:rows.filter(r=>r.case==='active'&&r.quality==='high'&&r.committedLaser).length,noLaserFallbacks:rows.filter(r=>r.case==='active'&&r.quality==='high'&&!r.committedLaser).map(r=>({group:r.group,difficulty:r.difficulty,kind:r.activeKind})),p95RangeMs:[Math.min(...timed.map(r=>r.timing.p95Ms)),Math.max(...timed.map(r=>r.timing.p95Ms))],missingAssets:0,mutatedCoreStates:0,cacheLimitsPassed:true},sources,rows,transitionRows:drains,comparisons,proofFiles:fs.readdirSync(OUTPUT).filter(f=>/\.jpg$/.test(f)).map(f=>{const b=fs.readFileSync(path.join(OUTPUT,f));return{path:'docs/v20-battle-pixels/'+f,bytes:b.length,sha256:sha(b)};})};
  assert.equal(timed.length,216);assert.equal(rows.length,432);assert.equal(drains.length,144);assert.equal(comparisons.length,8);
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
  const md=[
    '# V20 전투·연출 CPU 및 이미지 대조',
    '',
    '현재 상태: 자동 측정 완료. 실제 contact 이미지의 직접 검수 결과는 별도 확인 후 기록해야 한다. 이 도구는 사람의 픽셀 검수를 자동 통과로 표시하지 않는다.',
    '',
    '## 검사 범위',
    '',
    '| 구분 | 이번 실행 |',
    '|---|---|',
    '| 실제 source 이미지 | 제품의 구간별 선택 함수로 로딩한 원본; 경로·SHA-256·규격을 JSON에 기록 |',
    '| phase3 고정 장면 | 36선택 × NORMAL/HELL × 예고/실제발사/밀집 최대 × 고/저품질 = '+rows.length+' |',
    '| 시간 측정 | HELL '+timed.length+'장면 × '+DRAWS+'회 = '+timed.length*DRAWS+'회. 장면별 4회 예열은 측정에서 제외 |',
    '| 실제 전환의 잔탄 | 36선택 × NORMAL/HELL × 고/저품질 = '+drains.length+'장면. 별도 HP1·지연피해 fixture |',
    '| v19/v20 동일 상태 비교 | 1·7·19·20·30·31·34·35의 실제 peak. 각 쌍은 정확히 같은 core tick과 상태 |',
    '| 지속 FPS·실제 기기·GPU | 검증하지 않음 |',
    '',
    'phase fixture는 제품 체크포인트 API로 세 번째 문양을 복원한 뒤 자동 공격과 스킬을 끄고 피해 면역을 설정한다. 전환 fixture는 두 번째 문양의 실제 탄환이 있는 상태에서 boss HP를 1로 낮추고 실제 지연 피해를 적용하여 엔진의 정상 전환 분기를 실행한다. 둘 다 자연 진행으로 세지 않는다. 자연 진행 검사는 별도 QA 문서를 참조한다.',
    '',
    '## 측정과 안전 조건',
    '',
    'CPU p95 범위는 '+report.summary.p95RangeMs.map(x=>x.toFixed(2)).join('~')+'ms다. native CPU Canvas의 반복 그리기 시간으로 이미지 디코딩·시뮬레이션·브라우저·GPU 완료·휴대폰 FPS를 포함하지 않는다. 이전 버전의 다른 장면 집합이나 다른 측정 도구의 수치와 직접 속도비를 계산하지 않는다.',
    '',
    '실제 레이저가 있는 '+report.summary.exactWarningPairs+'개 선택/난도에서는 동일한 committed capsule을 activeAt−1과 activeAt에 관찰했다. 원점·종점·폭·활성 틱이 같은지 비교했다. 레이저가 없는 경우는 JSON의 noLaserFallbacks에 실제 준비/탄환 발사 상태로 명시하며 레이저 검사로 세지 않는다.',
    '',
    '현재 renderer는 실제 탄환 수와 texturedBullets가 같고, 누락 자산·상태 변조가 0이었다. HUD의 예고·활성 수와 남은 시간은 원래 엔진 상태와 같았다. 전환의 살아 있는 탄막은 residual-danger로 표시하고 안전한 클리어로 바꾸지 않았다. 지속 HUD의 아래 경계는 y64 이하다. 반복 그리기에서 배경·문자 배치를 새로 만들지 않았다.',
    '',
    '탄환 캐시 4MiB, 스킬 캐시 2MiB, 장면 1,036,800B, 검격 캐시 24,576B 상한을 확인했다. core/storage/미디어/무기 엔진은 기준 v19와 같은 바이트다. 스토리 자산 표는 g31 blade anchor x288→288.5와 한리안 blade fixedOrientation true→false의 표시 보정 두 값만 달라졌으며, 나머지 모든 소유자·원본·규격·내용은 같음을 비교했다. 전체 '+CODE.length+'개 생산 파일은 측정 전후 SHA-256이 같았다.',
    '',
    '## 실제 픽셀 파일',
    '',
    '- `v20-battle-pixels/all36-warning.jpg`, `all36-active.jpg`, `all36-peak.jpg`: 전체 36선택의 실제 고품질 HELL 장면.',
    '- `v20-battle-pixels/compare-group-NN.jpg`: 선택한 여덟 구성의 v19 기준/현재 후보를 360×640 그대로 나란히 표시.',
    '- `v20-battle-pixels/baseline-candidate-contact.jpg`: 위 비교의 축소 모음.',
    '',
    'CPU 환경의 `fc-list :lang=ko family` 결과는 '+(fonts.available===false?'비어 있었다':fonts.available===true?'JSON의 fontAvailability에 기록했다':'조회하지 못했다')+'. 한글 글리프 형태·줄바꿈·실제 화면에서의 읽기는 CPU 이미지로 인증하지 않는다. 실제 Chrome의 별도 검수 기록이 필요하다.',
    '',
    '기준 commit: `'+BASE+'`.',
    ''];
  fs.writeFileSync(path.join(ROOT,'docs/V20-VISUAL-REVIEW-20261030.md'),md.join('\n'));
  console.log(JSON.stringify({report:REPORT,summary:report.summary},null,2));
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
