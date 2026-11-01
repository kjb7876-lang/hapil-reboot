'use strict';
// Independent engine and authored-pixel fixtures. Immunity and synthetic
// expiry sentinels are explicit; these are not human or phone-FPS claims.
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),L=require('../tools/audit-projectile-lifecycle-v30.cjs');
function world(revision=30){return L.world(C,7,0,'normal',revision);}
function bullet(w,patch={}){const b={id:++w.idCounter,x:30,y:300,px:30,py:300,vx:1,vy:0,r:3,halfLength:0,angle:0,kind:'orb',age:.1,ttl:.09,ownerId:w.boss.id,grazed:true,...patch};w.bullets.push(b);return b;}

test('pinned29 actually expires live visible bullets away from player contacts',()=>{
  let completed=0,pilot=0;const Old=L.runtime(L.BASE,(w,b)=>{if(L.classify(w,b)==='complete-ttl-fade'&&b.x>=0&&b.x<=360&&b.y>=0&&b.y<=640){completed++;if(b.y>=260&&b.y<=614)pilot++;assert.equal(b.retireDuration,.35);}}),w=L.world(Old,29,2,'gentle',29);
  for(let n=0;n<900;n++)Old.step(w,{});
  assert(completed>=70,'a real seeded cohort reaches TTL while still visible');assert(pilot>=60);assert.equal(w.stats.hits,0);
});

test('30 moving expiry grace uses180 real ticks while an actual skill slows its logical age',()=>{
  const w=world(),b=bullet(w);w.skillRotation=true;w.memory=60;w.skills.delayReadyAt=0;C.step(w,{});assert.equal(w.stats.casts.delay,1);w.skillRotation=false;
  assert.equal(b.v30OverdueTicks,1);for(let n=1;n<179;n++)C.step(w,{});
  assert.equal(b.v30OverdueTicks,179);assert(w.bullets.includes(b));assert(!b.retiring);assert(b.age<2,'logical lifetime elapsed substantially less than three seconds');
  C.step(w,{});assert.equal(b.v30OverdueTicks,180);assert.equal(b.retiring,true);assert.equal(b.retireAge,0);assert.equal(b.retireDuration,.8);
  for(let n=0;n<47;n++){C.step(w,{});assert(w.bullets.includes(b));}C.step(w,{});assert(!w.bullets.includes(b),'the unscaled fallback cannot hang during slow time');
});

test('30 stationary expiry is immediately harmless and visibly fades;29 keeps its exact old clock',()=>{
  for(const revision of[29,30]){
    const w=world(revision),b=bullet(w,{x:w.player.x,y:w.player.y,vx:0,vy:0});w.player.invulnerableUntil=0;const hp=w.player.hp;C.step(w,{});
    assert.equal(b.retiring,true);assert.equal(w.player.hp,hp);assert.equal(b.retireDuration,revision===30?.8:.35);
    for(let n=0;n<10;n++){C.step(w,{});assert(w.bullets.includes(b));assert.equal(w.player.hp,hp);}
  }
});

test('30 does not erase a moving slow-time projectile when its authored TTL is reached',()=>{
  const w=world(),b=bullet(w,{x:80,y:280,vx:0,vy:100});w.skillRotation=true;w.memory=24;C.step(w,{});assert.equal(w.stats.casts.memory,1);w.skillRotation=false;const id=b.id;
  for(let n=0;n<23;n++)C.step(w,{});
  assert.equal(b.id,id);assert(w.bullets.includes(b));assert(!b.retiring);assert(b.y-280<20);assert.equal(C.BULLET_SLOW.factor,.14);
});

test('the authored knife tail remains visible beyond the old edge and30 retains it until full source exit',async()=>{
  const A=require('../tools/audit-object-projectiles-v24.cjs'),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',L.ROOT]}));
  const box=A.runtime(L.BASE),images=await A.imagesFor(box,7,new Map(),{},null,true),fx=box.HapilProjectiles.create(images),canvas=createCanvas(360,640),ctx=canvas.getContext('2d'),w=world();
  // This exact centre/radius/direction occurred at pinned29 tick249 removal.
  const b=bullet(w,{x:422.39287719406263,y:62.43206096102615,r:9.84,angle:5.94493205494212,vx:0,vy:0,age:1,ttl:100,patternId:'beelzebub-phase-1',sourcePhase:0});
  const pixels=()=>{ctx.clearRect(0,0,360,640);fx.beginFrame();assert(fx.drawBullet(ctx,w,b,false));return ctx.getImageData(0,0,360,640).data.reduce((n,v,at)=>n+(at%4===3&&v>=96),0);};
  try{
    assert(b.x>360+b.r+50,'old core already considers this projectile outside');assert(pixels()>100,'the actual owned knife still has an opaque onscreen tail');assert(fx.getMetrics().maxVisualOutset>50);
    C.step(w,{});assert(w.bullets.includes(b),'new full-object padding retains the same ID');
    b.x=360+b.r+C.MOBILE_BULLET_LIMITS.exitPadding+.01;assert.equal(pixels(),0,'the complete source is now outside');C.step(w,{});assert(!w.bullets.includes(b));
  }finally{fx.destroy();}
});
