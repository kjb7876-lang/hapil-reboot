#!/usr/bin/env node
'use strict';
/* 앱 포장용 폴더(app/www)를 만든다. 세로판(arcade.html)이 실제로 쓰는 파일만 모은다(약 24MB).
 * - arcade.html → www/index.html, 화면이 싣는 src/*.js, media/arcade-v43*·music·gunner.
 * - 출시 빌드라 개발자 모드 버튼을 숨긴다(DEV_VISIBLE=false). 저장소 원본은 바꾸지 않는다.
 * - 원작자 보류(QA_HOLD) 그림은 기본으로 뺀다. 사용자가 출시 사용을 확인하면 --include-held.
 * 사용: node tools/build-app-www.cjs [출력 폴더, 기본 app/www] [--include-held] */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),outArg=process.argv.slice(2).find(a=>!a.startsWith('--')),out=outArg?path.resolve(process.cwd(),outArg):path.join(root,'app/www'); // 인자는 지금 폴더 기준
const MEDIA=['media/arcade-v43','media/arcade-v43-fx','media/arcade-v43-laser','media/music.mp3','media/gunner.webp'];
function copy(rel){const from=path.join(root,rel),to=path.join(out,rel);const st=fs.statSync(from);
  if(st.isDirectory()){for(const f of fs.readdirSync(from))copy(path.join(rel,f));return;}
  fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);bytes+=st.size;files++;}
let bytes=0,files=0;
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'arcade.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
if(!scripts.includes('src/arcade-app-v43.js'))throw new Error('arcade.html does not load src/arcade-app-v43.js');
for(const s of scripts)copy(s);
for(const m of MEDIA)copy(m);
// 원작자가 보류(QA_HOLD)라고 적은 그림은 출시 묶음에서 뺀다(드라이브 독안개 poison_mist_v002: '게임 자동적용 금지 명시'). 게임은 그림이 없으면 그 효과만 건너뛴다.
const held=[],keepHeld=process.argv.includes('--include-held'); // 사용자가 출시 사용을 확인하면 --include-held 로 넣는다
for(const d of keepHeld?[]:['media/arcade-v43-fx','media/arcade-v43-laser']){const idx=path.join(root,d,'index.json');if(!fs.existsSync(idx))continue;
  const list=JSON.parse(fs.readFileSync(idx,'utf8'));const entries=[].concat(...[list.effects,list.sheets].filter(Boolean).map(x=>Array.isArray(x)?x:Object.values(x)));for(const e of entries)if(/QA_HOLD/i.test(String(e.status||''))){const f=path.join(out,d,e.file);if(fs.existsSync(f)){bytes-=fs.statSync(f).size;files--;fs.rmSync(f);held.push(d+'/'+e.file);}}}
if(held.length)console.log('held back (QA_HOLD): '+held.join(', '));
const appJs=path.join(out,'src/arcade-app-v43.js'),code=fs.readFileSync(appJs,'utf8');
if(!/var DEV_VISIBLE=true[;,]/.test(code))throw new Error('DEV_VISIBLE switch not found');
fs.writeFileSync(appJs,code.replace(/var DEV_VISIBLE=true([;,])/,'var DEV_VISIBLE=false$1'));
fs.writeFileSync(path.join(out,'index.html'),html);bytes+=html.length;files++;
console.log(`app www: ${files} files, ${(bytes/1048576).toFixed(1)} MB → ${path.relative(root,out)}`);
