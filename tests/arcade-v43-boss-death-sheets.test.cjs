'use strict';
/* 보스 모션 전수조사(11-17): 드라이브 CX-0135 A5 쓰러짐 8칸 시트를 같은 인물 보스에만 연결한다.
 * 이름이 다른 u203·u204·u205 시트는 일치하는 보스가 없어 쓰지 않는다. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),man=JSON.parse(fs.readFileSync(path.join(root,'media/arcade-v43/manifest.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'src/arcade-app-v43.js'),'utf8');
test('violet and the first comrade have an 8-frame death strip beside their attack strip',()=>{
 for(const k of ['violet','p1_comrade']){const e=man[k+'@death.webp'];assert(e&&e.frames===8,k);assert(fs.existsSync(path.join(root,'media/arcade-v43',k+'@death.webp')));
  assert((man[k+'.webp'].motions||[]).includes('death'),k+' lists the death motion');assert(man[k+'@attack.webp'],k+' still has its attack');}
});
test('a death strip plays once by fall progress instead of looping',()=>{
 assert.match(app,/deathProg>=0&&\/@death\$\/\.test\(key\)/);assert.match(app,/deathProg=k;try\{drawArt\(fall\.actor/);
});
