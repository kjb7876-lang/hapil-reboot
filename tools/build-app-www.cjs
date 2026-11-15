#!/usr/bin/env node
'use strict';
/* 앱 포장용 폴더(app/www)를 만든다. 세로판(arcade.html)이 실제로 쓰는 파일만 모은다(약 24MB).
 * - arcade.html → www/index.html, 화면이 싣는 src/*.js, media/arcade-v43*·music·gunner.
 * - 출시 빌드라 개발자 모드 버튼을 숨긴다(DEV_VISIBLE=false). 저장소 원본은 바꾸지 않는다.
 * 사용: node tools/build-app-www.cjs [출력 폴더, 기본 app/www] */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),out=path.resolve(root,process.argv[2]||'app/www');
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
const appJs=path.join(out,'src/arcade-app-v43.js'),code=fs.readFileSync(appJs,'utf8');
if(!/var DEV_VISIBLE=true[;,]/.test(code))throw new Error('DEV_VISIBLE switch not found');
fs.writeFileSync(appJs,code.replace(/var DEV_VISIBLE=true([;,])/,'var DEV_VISIBLE=false$1'));
fs.writeFileSync(path.join(out,'index.html'),html);bytes+=html.length;files++;
console.log(`app www: ${files} files, ${(bytes/1048576).toFixed(1)} MB → ${path.relative(root,out)}`);
