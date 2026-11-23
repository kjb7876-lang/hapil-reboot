#!/usr/bin/env node
'use strict';
/* 앱 포장용 폴더(app/www)를 만든다. 세로판(arcade.html)이 실제로 쓰는 파일만 모은다(약 24MB).
 * - arcade.html → www/index.html, 화면이 싣는 src/*.js, media/arcade-v43*·music·gunner.
 * - 출시 빌드라 개발자 모드 버튼을 숨긴다(DEV_VISIBLE=false). 저장소 원본은 바꾸지 않는다.
 * - 닷츠 QA_HOLD 그림은 기본 포함(사용자 확인 11-15). 빼야 하면 --exclude-held.
 * 사용: node tools/build-app-www.cjs [출력 폴더, 기본 app/www] [--exclude-held] */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),outArg=process.argv.slice(2).find(a=>!a.startsWith('--')),out=outArg?path.resolve(process.cwd(),outArg):path.join(root,'app/www'); // 인자는 지금 폴더 기준
const MEDIA=['media/arcade-v43','media/arcade-v43-fx','media/arcade-v43-laser','media/arcade-v43-hero','media/arcade-v43-heroes','media/phase2-v43','media/fonts','media/music.mp3','media/gunner.webp'];
function copy(rel){const from=path.join(root,rel),to=path.join(out,rel);const st=fs.statSync(from);
  if(st.isDirectory()){for(const f of fs.readdirSync(from))copy(path.join(rel,f));return;}
  fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);bytes+=st.size;files++;}
let bytes=0,files=0;
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'arcade.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
if(!scripts.includes('src/arcade-app-v43.js'))throw new Error('arcade.html does not load src/arcade-app-v43.js');
for(const s of scripts)copy(s);
copy('docs/v43/canonical-story.txt'); // 규칙 메뉴의 정본 원문: 오프라인 앱에서도 읽을 수 있게 포함한다.
copy('media/combat/boss01-purple-sword-spider-angel-cutin.webp'); // 보라검 천사 본보스 전용 컷인.
for(const m of MEDIA)copy(m);
if(fs.existsSync(path.join(root,'media/bgm')))copy('media/bgm'); // 구간별 배경음악(arcade-music-v43.js)
// --exclude-held: 닷츠가 보류(QA_HOLD)라고 적은 그림을 묶음에서 뺀다. 게임은 그림이 없으면 그 효과만 건너뛴다.
const held=[],keepHeld=!process.argv.includes('--exclude-held'); // 11-15 사용자: QA_HOLD 시트는 닷츠(사용자 작업자)가 만든 것 → 기본 포함, 닷츠 최종 판정(CX-0103AV)에서 NO가 나오면 --exclude-held
for(const d of keepHeld?[]:['media/arcade-v43-fx','media/arcade-v43-laser']){const idx=path.join(root,d,'index.json');if(!fs.existsSync(idx))continue;
  const list=JSON.parse(fs.readFileSync(idx,'utf8'));const entries=[].concat(...[list.effects,list.sheets].filter(Boolean).map(x=>Array.isArray(x)?x:Object.values(x)));for(const e of entries)if(/QA_HOLD/i.test(String(e.status||''))){const f=path.join(out,d,e.file);if(fs.existsSync(f)){bytes-=fs.statSync(f).size;files--;fs.rmSync(f);held.push(d+'/'+e.file);}}}
if(held.length)console.log('held back (QA_HOLD): '+held.join(', '));
const appJs=path.join(out,'src/arcade-app-v43.js'),code=fs.readFileSync(appJs,'utf8');
if(!/var DEV_VISIBLE=true[;,]/.test(code))throw new Error('DEV_VISIBLE switch not found');
fs.writeFileSync(appJs,code.replace(/var DEV_VISIBLE=true([;,])/,'var DEV_VISIBLE=false$1'));
fs.writeFileSync(path.join(out,'index.html'),html);bytes+=html.length;files++;
console.log(`app www: ${files} files, ${(bytes/1048576).toFixed(1)} MB → ${path.relative(root,out)}`);
