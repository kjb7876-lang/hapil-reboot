'use strict';
// 개발자 모드(사용자 11-15 "게임테스트용 속도2배 체력무한 개발자용 모드도 만들어줘", "그냥 대놓고 알려주고 나중에 숨기던가하면됨").
const test=require('node:test'),assert=require('node:assert/strict'),h=require('./helpers/arcade-v43.cjs');
const app=h.read('src/arcade-app-v43.js'),html=h.read('arcade.html');
test('the title screen shows a visible developer-mode button, with one switch to hide it later',()=>{
 assert.match(html,/<button id="arcade-dev" data-i18n="devOff" type="button" aria-pressed="false">DEV 꺼짐<\/button>/);assert.match(html,/속도 2배 · 체력 무한/);
 assert.match(app,/var DEV_VISIBLE=true[;,]/,'one constant hides the button later');
 assert.match(app,/\$\('arcade-dev'\)\.hidden=!devUnlocked/);assert.match(app,/\[\?&\]dev=\(\[01\]\)/,'?dev=1 reveals the developer tools on this device');
});
test('developer mode runs the game at double speed',()=>{
 const f=app.match(/function frame\(stamp\)\{([\s\S]*?)\n    draw\(elapsed\);/);assert(f,'frame found');
 assert.match(f[1],/if\(devMode\)accumulator=Math\.min\(accumulator\+elapsed\*\(DEV_SPEED-1\)/);assert.match(app,/DEV_SPEED=2\b/);
});
test('developer mode keeps the hero at full health before every step',()=>{
 const f=app.match(/function frame\(stamp\)\{([\s\S]*?)\n    draw\(elapsed\);/);
 assert.match(f[1],/if\(devMode\)state\.player\.hp=state\.player\.maxHp;[^\n]*Arcade\.step/);
});
test('developer mode is remembered, toggled by the button, and badged on the HUD',()=>{
 assert.match(app,/DEV_KEY='hapil-arcade-dev-v43'/);assert.match(app,/\$\('arcade-dev'\)\.addEventListener\('click'/);assert.match(html,/<div id="arcade-dev-badge" data-i18n="devBadge" hidden>DEV ×2 · 무적<\/div>/);assert.match(app,/e\.hidden=!\(devMode&&mode==='playing'\)/);
});
