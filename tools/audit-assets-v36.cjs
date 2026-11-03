'use strict';
// Read-only inspection of every tracked media file. Native decoder statistics
// are source inventory, not a GPU residency estimate or a commercial licence.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const a=require('./audit-object-projectiles-v24.cjs');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',a.ROOT]}));
const ROOT=a.ROOT,BASE='f616a344cfdc03af2bbc7cf98a17e2126123a4c0';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const tracked=prefix=>cp.execFileSync('git',['ls-files','-z',prefix],{cwd:ROOT}).toString().split('\0').filter(Boolean);
const bytes=p=>fs.readFileSync(path.join(ROOT,p));
function metadata(box){
 const rows=[],seen=new WeakSet();
 function walk(v,at,inheritedKey){
  if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);
  const key=v.key||inheritedKey;
  if(key&&box.HapilMedia[key]&&!Array.isArray(v)){
   const record={key,at};
   for(const k of ['width','height','cell','columns','frames','authoredFrames','authoredKeyposes','fullAnimationCycles','crop','rect','anchor','pivot','poses','scale','displayWidth','ms','rotation','fixedOrientation']){
    if(v[k]!==undefined&&(typeof v[k]!=='object'||Array.isArray(v[k])))record[k]=JSON.parse(JSON.stringify(v[k]));
   }
   rows.push(record);
  }
  for(const k of Object.keys(v))if(typeof v[k]==='object')walk(v[k],at+'.'+k,key);
 }
 for(const [name,value]of Object.entries(box))if(/^Hapil/.test(name)&&name!=='HapilMedia')walk(value,name,null);
 // These existing renderer contracts are authored atlases rather than inferred
 // cells; output records distinguish them from arbitrary square source art.
 for(const key of ['fxResonance','fxSlash','fxThorns','fxArrow','fxParry','fxSilk'])rows.push({key,at:'src/render.js atlasPhase',width:512,height:512,cell:256,frames:4,columns:2});
 rows.push({key:'fxWindArrow8V6',at:'src/render.js drawMemoryArrow8',width:1024,height:512,cell:256,frames:8,columns:4,pivot:[192,128]});
 return rows;
}
function rectangleInside(r,w,h){return Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=w&&r[1]+r[3]<=h;}
async function inspectImage(file){
 const im=await loadImage(path.join(ROOT,file)),w=im.width,h=im.height,c=createCanvas(w,h),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 const d=ctx.getImageData(0,0,w,h).data;let transparent=0,partial=0,opaque=0,minX=w,minY=h,maxX=-1,maxY=-1,magenta=0;
 for(let i=0;i<d.length;i+=4){const alpha=d[i+3];if(!alpha){transparent++;continue;}if(alpha<255)partial++;else opaque++;
  const pixel=i/4,x=pixel%w,y=Math.floor(pixel/w);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  if(alpha>=220&&d[i]>=230&&d[i+1]<=25&&d[i+2]>=230)magenta++;
 }
 const result={decoded:true,width:w,height:h,pixels:w*h,decodedRGBABytes:d.length,rgbaSHA256:sha(d),transparentPixels:transparent,partialAlphaPixels:partial,opaquePixels:opaque,hasTransparency:transparent+partial>0,visibleBounds:maxX<0?null:[minX,minY,maxX-minX+1,maxY-minY+1],opaqueMagentaPixels:magenta};
 c.width=1;c.height=1;return result;
}
function inspectAudio(file){
 const p=cp.spawnSync('ffprobe',['-v','error','-show_entries','format=format_name,duration,size:stream=codec_name,codec_type,sample_rate,channels,duration','-of','json',path.join(ROOT,file)],{encoding:'utf8'});
 if(p.error)return {inspected:false,reason:p.error.message};if(p.status!==0)return {inspected:false,reason:(p.stderr||'ffprobe failed').trim()};
 const r=JSON.parse(p.stdout);return {inspected:true,metadata:r};
}
function groupBy(rows,key){const map=new Map();for(const r of rows){const k=r[key];if(!k)continue;if(!map.has(k))map.set(k,[]);map.get(k).push(r.path);}return [...map.values()].filter(v=>v.length>1);}
async function main(){
 const media=tracked('media'),initial=Object.fromEntries(media.map(p=>[p,sha(bytes(p))]));
 const runtimeFiles=tracked('src').filter(p=>p.endsWith('.js')),runtimeSource=Object.fromEntries(runtimeFiles.filter(p=>p!=='src/media.js').map(p=>[p,bytes(p).toString()]));
 const sourceHashes=Object.fromEntries(runtimeFiles.map(p=>[p,sha(bytes(p))])),box=a.runtime(),registry=box.HapilMedia,contracts=metadata(box);
 const docs=tracked('docs').filter(p=>/\.(json|md|txt)$/.test(p)&&!/^docs\/v36\/asset-audit\.(json|md)$/.test(p)),docContents=docs.map(p=>({path:p,text:bytes(p).toString()}));
 const planKeys=new Set(),planGroups={};for(let group=0;group<36;group++){const keys=[...box.mobileAssetKeys(group)];planGroups[group]=keys;keys.forEach(k=>planKeys.add(k));}
 const missingRegistryFiles=[],mediaSet=new Set(media),registryRows=[];
 for(const [key,p]of Object.entries(registry)){
  const exists=fs.existsSync(path.join(ROOT,p)),literal=Object.entries(runtimeSource).filter(([,text])=>new RegExp('\\b'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(text)).map(([f])=>f);
  if(!exists)missingRegistryFiles.push({key,path:p});registryRows.push({key,path:p,exists,tracked:mediaSet.has(p),literalRuntimeReferences:literal,inMobileLoadPlan:planKeys.has(key),contractRecords:contracts.filter(r=>r.key===key).length});
 }
 const rows=[],decodeErrors=[];for(const file of media){
  const b=bytes(file),ext=path.extname(file).slice(1).toLowerCase(),row={path:file,type:ext,bytes:b.length,sha256:initial[file],registryKeys:registryRows.filter(r=>r.path===file).map(r=>r.key)};
  row.provenanceEvidence=docContents.filter(d=>d.text.includes(file)).map(d=>d.path);
  row.licenceStatus='Existing project asset; provenance links are evidence only. This audit does not establish new commercial-use rights or CC0 status.';
  try{if(/^(png|webp|jpg|jpeg|gif)$/.test(ext))Object.assign(row,await inspectImage(file));else if(/^(wav|mp3|ogg|flac)$/.test(ext))row.audio=inspectAudio(file);else row.inspection='hash and file metadata only';}
  catch(e){row.decoded=false;row.decodeError=String(e.message||e);decodeErrors.push({path:file,error:row.decodeError});}
  rows.push(row);
 }
 const images=rows.filter(r=>r.decoded),dimensions=Object.fromEntries(images.map(r=>[r.path,[r.width,r.height]])),contractIssues=[];
 for(const c of contracts){const p=registry[c.key],dim=dimensions[p];if(!dim)continue;const [w,h]=dim;
  if(c.rect&&!rectangleInside(c.rect,w,h))contractIssues.push({at:c.at,key:c.key,type:'rect-out-of-bounds',rect:c.rect,decoded:[w,h]});
  if(c.crop&&!rectangleInside(c.crop,w,h))contractIssues.push({at:c.at,key:c.key,type:'crop-out-of-bounds',crop:c.crop,decoded:[w,h]});
  if(!c.rect&&Number.isFinite(c.width)&&Number.isFinite(c.height)&&(c.width!==w||c.height!==h))contractIssues.push({at:c.at,key:c.key,type:'source-dimension-mismatch',contract:[c.width,c.height],decoded:[w,h]});
  if(Number.isFinite(c.cell)&&(w%c.cell||h%c.cell))contractIssues.push({at:c.at,key:c.key,type:'cell-does-not-divide-source',cell:c.cell,decoded:[w,h]});
 }
 const orphanFiles=rows.filter(r=>!r.registryKeys.length).map(r=>r.path),notInPlans=registryRows.filter(r=>!r.inMobileLoadPlan).map(r=>({key:r.key,path:r.path,literalRuntimeReferences:r.literalRuntimeReferences}));
 const candidateKeys=['fxResonance','fxSlash','fxThorns','fxArrow','fxParry','fxSilk','fxWindArrow8V6','shot','storyPlayerHandoSlash','storyPlayerSeohaSlash','fxV8Ember','fxV8GoldSlash','fxV8SilverSlash'];
 const visualNotes={fxResonance:'Directly viewed: cyan/blue painted four-stage impact; suitable for compact friendly hit confirmation while retaining its source alpha.',fxSlash:'Directly viewed: gold painted four-stage slash; suitable for brief small muzzle/impact/death accent, not a fullscreen explosion.',fxWindArrow8V6:'Directly viewed: eight separate teal painted arrow phases, original256px cells; suitable for friendly projectile variation without a neon geometric replacement.',shot:'Directly viewed: legacy bright cyan straight neon bar; stylistic fit is weaker than the painterly arrow/slash for this dark source art.',storyPlayerHandoSlash:'Directly viewed: pale gold/white curved slash; visible fine line/checker-like source remnants toward left. Existing crop/small stamp should be reviewed before any enlargement.',storyPlayerSeohaSlash:'Directly viewed: teal/gold crescent with delicate clockwork/compass decoration; distinct own-player skill material, native362px square. Fine rings are decorative source art rather than collision geometry.'};
 const candidates=candidateKeys.map(key=>({key,...rows.find(r=>r.path===registry[key]),contracts:contracts.filter(r=>r.key===key),visualNote:visualNotes[key]||'Metadata inventory only; not individually visually approved by this audit.'}));
 const mobilePlanEstimates=Object.entries(planGroups).map(([group,keys])=>{const paths=[...new Set(keys.map(k=>registry[k]).filter(Boolean))],selected=rows.filter(r=>paths.includes(r.path));return {group:Number(group),keys:keys.length,uniqueSourceFiles:paths.length,encodedBytes:selected.reduce((n,r)=>n+r.bytes,0),imageDecodedRGBABytes:selected.reduce((n,r)=>n+(r.decodedRGBABytes||0),0),scope:'Upper-bound source RGBA bytes if all selected images remain decoded; excludes canvas caches, browser overhead, other loading paths, mipmaps and actual GPU allocation.'};});
 const after=Object.fromEntries(media.map(p=>[p,sha(bytes(p))]));assert.deepEqual(after,initial,'source media changed during audit');
 const report={schema:1,baseline:BASE,scope:'Every tracked media file: SHA-256, byte size, all image decodes/full-alpha scans, audio ffprobe metadata; registry literal references, all36 mobile encounter plans, exported visual contracts. Inventory is not full-screen visual approval, GPU residency/FPS or a new licence verification.',toolSHA256:sha(fs.readFileSync(__filename)),sourceHashes,summary:{trackedMediaFiles:media.length,imagesDecoded:images.length,audioFiles:rows.filter(r=>r.audio).length,audioInspectionErrors:rows.filter(r=>r.audio&&!r.audio.inspected).length,bytes:rows.reduce((n,r)=>n+r.bytes,0),decodedRGBABytes:images.reduce((n,r)=>n+r.decodedRGBABytes,0),transparentImages:images.filter(r=>r.hasTransparency).length,registryKeys:registryRows.length,missingRegistryFiles:missingRegistryFiles.length,untrackedRegistryFiles:registryRows.filter(r=>!r.tracked).length,orphanFiles:orphanFiles.length,registryKeysNotInMobilePlans:notInPlans.length,contractRecords:contracts.length,contractIssues:contractIssues.length,decodeErrors:decodeErrors.length,encodedDuplicateGroups:groupBy(rows,'sha256').length,pixelDuplicateGroups:groupBy(images,'rgbaSHA256').length,originalAssetsModified:0},missingRegistryFiles,decodeErrors,orphanFiles,registryKeysNotInMobilePlans:notInPlans,encodedDuplicates:groupBy(rows,'sha256'),pixelDuplicates:groupBy(images,'rgbaSHA256'),contractIssues,registry:registryRows,mobileLoadPlans:planGroups,mobilePlanEstimates,contracts,candidates,assets:rows};
 report.passed=!report.summary.decodeErrors&&!report.summary.missingRegistryFiles&&!report.summary.untrackedRegistryFiles&&!report.summary.contractIssues&&!report.summary.audioInspectionErrors;
 const out=path.join(ROOT,'docs/v36');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'asset-audit.json'),JSON.stringify(report,null,2)+'\n');
 const md=['# v36 기존 자산 전수 인벤토리','',`기준 ${BASE}. 추적 자산 ${media.length}개, 이미지 ${images.length}개 전부 디코딩·알파 전수 스캔, 오디오 ${report.summary.audioFiles}개 ffprobe 메타데이터 확인. 원본 수정0개.`, '', '상세 경로·해시·크기·디코딩 규격·알파·등록 키·기존 출처 문서·프레임/크롭 계약은 [JSON](asset-audit.json)에 기록했습니다. 새 자산을 내려받거나 라이선스를 새로 판정한 작업은 아닙니다. 기존 자산에 CC0/상업 이용 가능 표시를 새로 부여하지 않았습니다.','',`누락 등록 파일 ${missingRegistryFiles.length}, 디코딩 오류 ${decodeErrors.length}, 계약 문제 ${contractIssues.length}. 미등록 파일 ${orphanFiles.length}, 모바일 로드 계획에 없는 등록 키 ${notInPlans.length}개는 역사적/선택 경로를 포함하므로 삭제 대상으로 단정하지 않습니다.`, '', '## 재사용 후보','', '|키|파일|실제 크기|알파|등록된 프레임/크롭 정보|','|---|---|---:|---|---|',...candidates.map(c=>`|${c.key}|${c.path}|${c.width}×${c.height}|${c.hasTransparency?'투명 포함':'불투명'}|${c.contracts.filter(x=>x.cell||x.crop||typeof x.frames==='number').map(x=>x.cell?`${typeof x.frames==='number'?x.frames:'셀'}프레임/${x.cell}px셀`:x.crop?'crop '+JSON.stringify(x.crop):x.frames+'프레임').filter((s,i,a)=>a.indexOf(s)===i).join('; ')}|`),'', '## 범위와 한계','', '- 이미지 모든 픽셀의 알파 통계는 완전 스캔이며 source-side RGBA 바이트 합은 동시 GPU 텍스처 메모리가 아닙니다.','- 인코딩/디코딩 픽셀 중복은 SHA-256 동등성만 의미합니다. 비슷한 그림이나 중복 기능을 자동 판정하지 않습니다.','- 참조는 런타임 리터럴·수출된 계약·36개 실제 로드 계획을 결합했습니다. 문자열 조립, 과거 모드, 향후 선택 로더 때문에 계획에 없다는 사실만으로 미사용을 확정하지 않습니다.','- 외부 상용 탄막 게임의 원본 그림·소리·코드를 가져오지 않았습니다.','- 소스 미디어 해시는 감사 시작/끝에 동일함을 확인했습니다.'];
 fs.writeFileSync(path.join(out,'asset-audit.md'),md.join('\n')+'\n');console.log(JSON.stringify({passed:report.passed,...report.summary}));if(!report.passed)process.exitCode=1;return report;
}
module.exports={main,inspectImage,metadata};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
