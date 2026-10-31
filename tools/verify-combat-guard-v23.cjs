'use strict';
// Exact source-scope guard for a presentation-only laser change. This does not
// rerun historical natural input records or certify mobile/GPU performance.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE='c6c3febf736d8f45ea1ba955a78dc20c8b4e9a8c';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{cwd:ROOT,maxBuffer:64*1024*1024});
const read=p=>fs.readFileSync(path.join(ROOT,p)),old=p=>git('show',BASE+':'+p);
function row(p){const a=old(p),b=read(p);assert(a.equals(b),'unexpected immutable runtime/art change: '+p);return{path:p,bytes:b.length,sha256:sha(b),byteIdentical:true};}
async function ordinaryPixelReview(){
 const audit=require('./audit-laser-pixels-v23.cjs'),current=audit.runtime(),baseline=audit.runtime(BASE),cache=new Map(),sources={},rows=[];
 const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',ROOT]}));
 for(let group=0;group<=35;group++){
  const im=await audit.imagesFor(current,group,cache,sources),w=audit.world(group);
  for(const owner of audit.variantOwners(current,group))for(const low of[false,true]){
   const a=current.HapilProjectiles.create(im),b=baseline.HapilProjectiles.create(im),ca=createCanvas(128,128),cb=createCanvas(128,128),xa=ca.getContext('2d'),xb=cb.getContext('2d');
   try{for(const shape of['orb','blade']){
    const bullet={id:1,x:64,y:64,r:shape==='orb'?3.5:3,halfLength:shape==='orb'?0:7,angle:Math.PI/2,age:.25,kind:shape,vx:0,vy:120,sourceActorId:owner||undefined};
    // Set encounter cache identity and populate the unchanged normal texture,
    // then draw a laser using the same source/palette before normal art again.
    for(const [api,ctx]of[[a,xa],[b,xb]]){api.beginFrame();assert(api.drawBullet(ctx,w,bullet,low));api.drawHazardBody(ctx,w,{phase:'active',x1:64,y1:0,x2:64,y2:128,width:20,progress:.3,age:.3,sourceActorId:owner||undefined},low);ctx.clearRect(0,0,128,128);api.beginFrame();assert(api.drawBullet(ctx,w,bullet,low));assert.equal(api.getMetrics().missingProjectileAssets,0);}
    const actual=Buffer.from(xa.getImageData(0,0,128,128).data),prior=Buffer.from(xb.getImageData(0,0,128,128).data);assert(actual.equals(prior),'ordinary projectile pixels changed after laser cache use: '+[group,owner,low,shape].join(':'));
    rows.push({group,owner,quality:low?'low':'high',shape,pixelBytes:actual.length,sha256:sha(actual),byteIdentical:true});xa.clearRect(0,0,128,128);xb.clearRect(0,0,128,128);
   }}finally{a.destroy();b.destroy();}
  }
 }
 return{method:'Exact 128×128 native CPU RGBA comparison against deployed v22 for ordinary orb/blade sources, all36assetconfigurations and participant owners, both qualities, after interleaved same-owner laser cache use. No gameplay simulation, browser or device performance claim.',baseline:BASE,cases:rows.length,unmatchedPixels:0,rows};
}
async function main(){
 const tracked=git('ls-tree','-r','--name-only',BASE).toString().trim().split('\n');
 const retainedRuntimePaths=tracked.filter(p=>p.startsWith('src/')||p.startsWith('media/')).sort();
 const currentRuntimePaths=git('ls-files','--cached','--others','--exclude-standard','--','src','media').toString().trim().split('\n').sort();assert.deepEqual(currentRuntimePaths,retainedRuntimePaths,'runtime/media file set changed; review new/deleted artifacts explicitly');
 const immutable=tracked.filter(p=>(p.startsWith('src/')&&p.endsWith('.js')&&!['src/app.js','src/projectiles.js'].includes(p))||p==='styles.css'||p.startsWith('media/')).map(row);
 const runtime=tracked.filter(p=>p.startsWith('src/')&&p.endsWith('.js')).map(p=>({path:p,bytes:read(p).length,baselineSHA256:sha(old(p)),sha256:sha(read(p)),changed:!old(p).equals(read(p))}));
 const app=read('src/app.js').toString(),previous=old('src/app.js').toString(),diag=/version:'[^']+',candidateRevision:\d+/g;
 assert.equal((app.match(diag)||[]).length,1);assert.equal((previous.match(diag)||[]).length,1);assert.equal(app.replace(diag,'DIAGNOSTIC_VERSION'),previous.replace(diag,'DIAGNOSTIC_VERSION'),'app behavior must remain byte-identical except diagnostic version');
 const projectiles=read('src/projectiles.js').toString(),priorProjectiles=old('src/projectiles.js').toString();
 function functionText(source,name){const start=source.indexOf('    function '+name+'(');assert(start>=0,'missing nonlaserfunction '+name);const next=source.indexOf('\n    function ',start+1);assert(next>start);return source.slice(start,next);}
 const unchangedNonLaserFunctions=['drawBullet','oneShot','drawBossCast'].map(name=>{const a=functionText(priorProjectiles,name),b=functionText(projectiles,name);assert.equal(b,a,'unrelated projectile/cast function changed: '+name);return{name,sha256:sha(b),byteIdentical:true};});
 const html=read('index.html').toString(),priorHTML=old('index.html').toString();
 assert.equal(html.replace(/\?v=[^"']+/g,'?v=CACHE'),priorHTML.replace(/\?v=[^"']+/g,'?v=CACHE'),'index may only refresh cache query');
 const ordinaryProjectiles=await ordinaryPixelReview();
 const out={schema:'hapil-v23-combat-source-guard-1',date:'2026-10-31',timezone:'Asia/Seoul',createdAt:new Date().toISOString(),baseline:BASE,baselineTree:git('rev-parse',BASE+'^{tree}').toString().trim(),method:'Exact-byte comparison of retained runtime and source media against deployed v22; app diagnostic-only and index cache-query-only normalization. No historical play record is reported as a new run.',runtimeSources:runtime,appDiagnosticOnly:true,indexCacheQueriesOnly:true,ordinaryProjectiles,unchangedNonLaserFunctions,immutableFileCount:immutable.length,immutableSourcesAndMedia:immutable,allImmutableByteIdentical:true,runtimeAndMediaFileSetUnchanged:true,verificationToolSHA256:sha(read('tools/verify-combat-guard-v23.cjs')),limits:['This source-scope result confirms unchanged simulation, storage, controls, canonical story contracts and retained source image/audio bytes.','Renderer behavior and actual raster/clipping/clocks require the separate v23 laser presentation tests and pixel QA.','No new natural-play, save-race matrix, headless browser, GPU completion or physical-mobile performance certification is established by this guard.']};
 fs.writeFileSync(path.join(ROOT,'docs/V23-COMBAT-GUARD-20261031.json'),JSON.stringify(out,null,2)+'\n');
 const changed=runtime.filter(r=>r.changed).map(r=>r.path);
 fs.writeFileSync(path.join(ROOT,'docs/V23-COMBAT-GUARD-20261031.md'),'# v23 전투·저장·자산 원본 보존 검수\n\n배포된 v22 커밋 `'+BASE+'`과 실제 바이트를 대조했다. 코어·저장·조작·스토리/무기 계약 및 미디어 원본을 포함한 **'+immutable.length+'개 파일**이 동일하다. 런타임 변경 파일: `'+changed.join('`, `')+'`.\n\n`app.js`는 진단 버전 문자열만, `index.html`은 캐시 질의만 바뀌었음을 별도로 정규화해 확인했다. 원본 미디어/오디오의 새 생성·변환은 없다. 각 파일 SHA-256은 대응 JSON에 기록했다.\n\n공유 색 조정 함수의 레이저 전용 분기가 일반 탄환을 바꾸지 않는지도 별도로 확인했다. 36개 자산 구성과 분리된 참가자 원본, 두 품질, 구형/칼날형의 **'+ordinaryProjectiles.cases+'개 실제 CPU RGBA 비교**가 배포된 v22와 바이트 단위로 동일했다. 같은 소스/팔레트의 레이저 캐시 사용을 끼워 넣은 뒤에도 동일했다.\n\n이 검사는 전투 시뮬레이션 규칙 및 원본 보존 확인이다. 새 레이저 픽셀·클리핑·예고/발사/잔광은 별도 v23 검사로 확인해야 한다. 과거 113개 자연 입력 기록을 새로 재생했다고 주장하지 않으며, 이번 결과를 실제 브라우저 입력·GPU 완료 시간·휴대폰 FPS 통과로 분류하지 않는다.\n');
 console.log(JSON.stringify({report:'docs/V23-COMBAT-GUARD-20261031.json',immutableFileCount:immutable.length,runtimeChanged:changed,appDiagnosticOnly:true,indexCacheQueriesOnly:true,ordinaryProjectileCases:ordinaryProjectiles.cases}));return out;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});module.exports={BASE,main,ordinaryPixelReview};
