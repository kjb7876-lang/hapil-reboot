'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');

test('distant-bullet fast path preserves exact swept hit and graze boundaries', () => {
  let rng = 123456789;
  function random() { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return (rng >>> 0) / 4294967296; }
  for (let i = 0; i < 2400; i++) {
    const w = core.createRun({campaign:true, practiceBoss:true, bossIndex:0, runId:'broadphase-boundary'});
    w.autoAttack = false; w.skillRotation = false; w.boss.hp = 1e9;
    const p = w.player;
    p.r = i % 5 === 0 ? 18 : 3;
    // Some projectiles begin well outside the viewport and traverse the player
    // in one tick; others graze the boundary or pass far away.
    const angle = random() * Math.PI * 2;
    const startX = i % 3 === 0 ? p.x + (random() - .5) * 100 : random() * 500 - 70;
    const startY = i % 3 === 0 ? p.y + (random() - .5) * 100 : random() * 800 - 80;
    const vx = (random() - .5) * 24000, vy = (random() - .5) * 24000;
    const b = {id:10000+i,x:startX,y:startY,px:startX,py:startY,vx,vy,r:3.8,
      halfLength:[0,9,13][i%3],angle,kind:['orb','needle','blade'][i%3],color:'#fff',age:0,ttl:6.4,ownerId:0,grazed:false};
    const projected = {...b, x:startX + vx/60, y:startY + vy/60};
    const d2 = core.geometry.projectileDistanceSquared(projected,p.x,p.y,p.x,p.y);
    const hit = d2 <= (p.r + b.r) ** 2;
    const graze = !hit && d2 <= (13 + b.r) ** 2;
    w.bullets.push(b); core.step(w,{});
    assert.equal(w.stats.collisions, Number(hit), `hit case ${i}`);
    assert.equal(w.graze, Number(graze), `graze case ${i}`);
  }
});

test('floating-point graze boundary and invalid half-length preserve exact geometry', () => {
  for (const halfLength of [9, -9]) for (const offset of [-1, 0, 1]) {
    const w = core.createRun({campaign:true, practiceBoss:true, bossIndex:0, runId:'boundary-rounding'});
    w.autoAttack = false; w.skillRotation = false; w.boss.hp = 1e9;
    w.player.x = 16.000000000000004;
    const x = 41.00000000000001 + offset * 7.105427357601002e-15;
    const b = {id:10001,x,y:540,px:x,py:540,vx:0,vy:0,r:3,halfLength,angle:0,
      kind:'needle',color:'#fff',age:0,ttl:6.4,ownerId:0,grazed:false};
    const d2 = core.geometry.projectileDistanceSquared(b,w.player.x,540,w.player.x,540);
    const hit = d2 <= 36, graze = !hit && d2 <= 256;
    w.bullets.push(b); core.step(w,{});
    assert.equal(w.stats.collisions,Number(hit), `hit ${halfLength}/${offset}`);
    assert.equal(w.graze,Number(graze), `graze ${halfLength}/${offset}`);
  }
});
