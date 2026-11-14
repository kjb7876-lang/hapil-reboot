#!/usr/bin/env node
/* 코드로 그린 기물(해골, 악마 손)을 게임과 같은 그리기 코드(HapilArcadeApp.drawPropArt)로 webp 한 장씩 굽는다.
   실행: 저장소 루트에서 node tools/build-drawn-props-v43.cjs  (playwright 크로미움 필요)
   결과: media/arcade-v43/<key>.webp 와 manifest.json 항목(group props, source code:drawPropArt). +x가 진행 방향. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/node-tools/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),out=path.join(root,'media/arcade-v43');
const KEYS={skull:[96,96],'demon-hand':[112,96]}; // 칸 크기(가로가 진행 방향)
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.css':'text/css'};
const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
server.listen(0,async()=>{
 const browser=await chromium.launch(),page=await browser.newPage();
 await page.goto('http://localhost:'+server.address().port+'/arcade.html');await page.waitForFunction(()=>window.HapilArcadeApp&&HapilArcadeApp.drawPropArt);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 for(const [key,[w,h]] of Object.entries(KEYS)){
  const data=await page.evaluate(([key,w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.translate(w/2,h/2);HapilArcadeApp.drawPropArt(key,g,Math.min(w,h)*.46);return c.toDataURL('image/webp',.9);},[key,w,h]);
  const buf=Buffer.from(data.split(',')[1],'base64'),file=key+'.webp';fs.writeFileSync(path.join(out,file),buf);
  manifest[file]={bytes:buf.length,group:'props',size:[w,h],source:'code:HapilArcadeApp.drawPropArt',sourceSha256:crypto.createHash('sha256').update(buf).digest('hex'),table:'tools/build-drawn-props-v43.cjs'};
  console.log(file,buf.length);}
 const sorted={};for(const k of Object.keys(manifest).sort())sorted[k]=manifest[k];
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(sorted,null,1));
 await browser.close();server.close();});
