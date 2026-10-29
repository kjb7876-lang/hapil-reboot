/* Deterministic boss weapon motion; rendering never owns hit geometry. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HapilWeaponPatterns = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var CYCLE_TICKS = 420, BOSS_WEAPON_KIND = 'boss-weapon';
  var RADIUS = 11, INITIAL_X_SPEED = 130, INITIAL_Y_SPEED = 30;
  var MIN_AFTER_BOUNCE_Y = 45, DOWN_ACCEL = 60, MAX_DOWN_SPEED = 225;
  var INWARD_SPEED_FACTOR = .42, SPIN_RATE = 2.6, EPS = 1e-9;
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function phaseCycle(w){return Math.floor(Math.max(0,Math.round((w.phaseTime || 0)*60)-1)/(w.difficulty==='hell'?336:CYCLE_TICKS));}
  function shouldThrow(w,within,cycle){
    return !!(w&&w.campaign&&w.stage==='boss'&&w.boss&&w.phase===0&&within===108&&cycle%2===0);
  }
  function createPair(w, boss, cycle){
    if(!w||!boss||!Number.isFinite(boss.x)||!Number.isFinite(boss.y))return [];
    return [-1,1].map(function(side){
      return {x:boss.x+side*7,y:boss.y+23,angle:Math.atan2(INITIAL_Y_SPEED,side*INITIAL_X_SPEED),
        speed:Math.hypot(INITIAL_X_SPEED,INITIAL_Y_SPEED),r:RADIUS,kind:BOSS_WEAPON_KIND,
        color:'#ffffff',ownerId:boss.id,ttl:7.6,patternId:'boss-weapon-throw',paletteSlot:0,
        weaponMotion:true,spinRate:side*SPIN_RATE,spinAngle:side*.25,throwCycle:cycle};
    });
  }
  // Called once before the deferred-group capacity check; _rhythmPrepared
  // prevents a queued group being slowed a second time during later retries.
  function prepareEmission(w,specs){
    if(!w||!w.campaign||w.stage!=='boss'||!w.boss||w.phase!==0||!Array.isArray(specs))return;
    var slowBeat=phaseCycle(w)%2===1;
    specs.forEach(function(s){
      if(!s||s._rhythmPrepared||s.weaponMotion||s.ownerId!==w.boss.id)return;
      s._rhythmPrepared=true;
      // Existing acceleration authored by a boss keeps its own established curve.
      if(!slowBeat||s.acceleration||!Number.isFinite(s.speed)||s.speed<=0)return;
      s.speed*=.55;s.acceleration=45;s.accelerateAt=.9;s.maxSpeed=140;
      s.rhythmAccelerate=true;
    });
  }
  function initialize(b,s,w){
    if(!b||!s||!s.weaponMotion)return;
    var factor=w&&w.difficulty==='gentle'?.82:w&&w.difficulty==='hell'?1.44:1;
    b.weaponMotion=true;b.bounceCount=0;b.bounceAt=null;
    b.weaponDownAcceleration=DOWN_ACCEL*factor;b.weaponMaxDownSpeed=MAX_DOWN_SPEED*factor;
    b.weaponMinDownSpeed=MIN_AFTER_BOUNCE_Y*factor;
    b.spinRate=Number.isFinite(s.spinRate)?s.spinRate:SPIN_RATE;
    b.spinAngle=Number.isFinite(s.spinAngle)?s.spinAngle:0;b.throwCycle=s.throwCycle||0;
  }
  function advance(b,dt,width){
    if(!b||!b.weaponMotion)return false;
    if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(width)||width<=b.r*2)throw new RangeError('invalid weapon movement bounds');
    b.bouncePoint=null;
    var oldX=b.x, oldY=b.y, vx=b.vx, vy=b.vy, left=b.r, right=width-b.r;
    var nextX=oldX+vx*dt, nextY=oldY+vy*dt;
    if(b.bounceCount===0&&((vx<0&&nextX<=left)||(vx>0&&nextX>=right))){
      var wall=vx<0?left:right, fraction=clamp((wall-oldX)/(vx*dt),0,1);
      var hitY=oldY+vy*dt*fraction, remain=dt*(1-fraction);
      b.bouncePoint={x:wall,y:hitY,fraction:fraction};
      b.bounceCount=1;b.bounceAt=(b.age||0)+dt*fraction;
      b.vx=-vx*INWARD_SPEED_FACTOR;
      var initialDown=Math.max(vy,b.weaponMinDownSpeed),newDown=Math.min(b.weaponMaxDownSpeed,initialDown+b.weaponDownAcceleration*remain);
      b.vy=newDown;b.x=wall+b.vx*remain;b.y=hitY+(initialDown+newDown)*.5*remain;
    }else if(b.bounceCount===1){
      var endDown=Math.min(b.weaponMaxDownSpeed,vy+b.weaponDownAcceleration*dt);
      b.x=nextX;b.y=oldY+(vy+endDown)*.5*dt;b.vy=endDown;
    }else{b.x=nextX;b.y=nextY;}
    b.angle=Math.atan2(b.vy,b.vx);
    b.spinAngle=(b.spinAngle+b.spinRate*dt)%(Math.PI*2);
    return true;
  }
  function segmentDistanceSquared(x0,y0,x1,y1){
    var dx=x1-x0,dy=y1-y0,den=dx*dx+dy*dy;
    var t=den?clamp(-(x0*dx+y0*dy)/den,0,1):0;
    var x=x0+dx*t,y=y0+dy*t;return x*x+y*y;
  }
  // Weapon hitbox is a circle. A side-wall reflection can bend its path
  // within a tick; compare both segments with the player's position at exactly
  // the same time instead of testing only the chord between endpoints.
  function distanceSquared(b,px,py,x,y){
    var point=b&&b.bouncePoint;
    if(!point)return segmentDistanceSquared(b.px-px,b.py-py,b.x-x,b.y-y);
    var f=clamp(point.fraction,0,1),mx=px+(x-px)*f,my=py+(y-py)*f;
    return Math.min(segmentDistanceSquared(b.px-px,b.py-py,point.x-mx,point.y-my),
      segmentDistanceSquared(point.x-mx,point.y-my,b.x-x,b.y-y));
  }
  return Object.freeze({CYCLE_TICKS:CYCLE_TICKS,KIND:BOSS_WEAPON_KIND,RADIUS:RADIUS,
    shouldThrow:shouldThrow,createPair:createPair,prepareEmission:prepareEmission,initialize:initialize,
    advance:advance,distanceSquared:distanceSquared,constants:Object.freeze({INITIAL_X_SPEED:INITIAL_X_SPEED,INITIAL_Y_SPEED:INITIAL_Y_SPEED,MIN_AFTER_BOUNCE_Y:MIN_AFTER_BOUNCE_Y,DOWN_ACCEL:DOWN_ACCEL,MAX_DOWN_SPEED:MAX_DOWN_SPEED,INWARD_SPEED_FACTOR:INWARD_SPEED_FACTOR,SPIN_RATE:SPIN_RATE})});
}));
