/* Verified four authored downward keyposes per boss; torso registration and short dissolves, not generated in-between frames. */
(function(global){
  'use strict';
  var CONTRACTS={"violet":{"key":"bossMotionViolet","cell":256,"width":512,"height":512,"scale":0.7121,"poses":[{"index":0,"name":"prepare","anchor":[148,126],"silk":[148,106],"alpha8Bounds":[65,60,219,225],"rgba_sha256":"b1c15b3884310166a7e288ea42162da519fc42785fbad725df753e992fd1742e"},{"index":1,"name":"downstroke","anchor":[143,140],"silk":[143,120],"alpha8Bounds":[51,83,206,226],"rgba_sha256":"ae3b6c3f774978bf5b5d59dd86437016d0ee949dc8ae9495538dfcfdcc930125"},{"index":2,"name":"follow","anchor":[156,118],"silk":[156,98],"alpha8Bounds":[68,60,229,217],"rgba_sha256":"aa6aab4333558ebf5d9be127acc6e6cc8575f77d19217647ac44e8301bed4179"},{"index":3,"name":"recover","anchor":[146,120],"silk":[146,100],"alpha8Bounds":[54,59,211,204],"rgba_sha256":"acbfba31ff10f75738ce4e8a1ba4ec662a31bf19de270240d6e2fc157df042ff"}],"manualTorsoAnchors":true,"physicalPivotsCertified":false},"horn":{"key":"bossMotionHorn","cell":256,"width":512,"height":512,"scale":0.7121,"poses":[{"index":0,"name":"prepare","anchor":[139,129],"silk":[139,109],"alpha8Bounds":[68,63,200,203],"rgba_sha256":"ed16f2b75d2106fbbd694b62e0bccdb708b7209a9a1d75ca947c98dad40b1c94"},{"index":1,"name":"downstroke","anchor":[130,145],"silk":[130,125],"alpha8Bounds":[57,89,187,214],"rgba_sha256":"affdd73fbc8fa5aa46b14e82c0b4662ade56dc70a76efdf151b01c958bc6a6ec"},{"index":2,"name":"follow","anchor":[134,122],"silk":[134,102],"alpha8Bounds":[63,71,200,194],"rgba_sha256":"ccea4196a326ac99765a4f0223a45e8adc99b3972d4b8fa5fde2df05337c3ace"},{"index":3,"name":"recover","anchor":[134,121],"silk":[134,101],"alpha8Bounds":[60,66,186,192],"rgba_sha256":"b32235a8332ec1d3691721f3dc9ec338789c37e85a7222e95da2f5c19cf32daf"}],"manualTorsoAnchors":true,"physicalPivotsCertified":false},"balrog":{"key":"bossMotionBalrog","cell":256,"width":512,"height":512,"scale":0.6104,"poses":[{"index":0,"name":"prepare","anchor":[139,105],"silk":[139,85],"alpha8Bounds":[59,28,221,230],"rgba_sha256":"efeccd68e5d2204ba6e7572fc8d573191e2dde57c9113a3197d6894fc02c4edb"},{"index":1,"name":"downstroke","anchor":[139,123],"silk":[139,103],"alpha8Bounds":[24,76,220,237],"rgba_sha256":"2183206274701b9f62690cccff0699bba197f25594677710edd2965f5ee6f5cf"},{"index":2,"name":"follow","anchor":[141,110],"silk":[141,90],"alpha8Bounds":[46,57,220,234],"rgba_sha256":"f818c1a0a2c9117e736a246be57be0d72d8b7beb5afbcf3d7296e094bc04ff23"},{"index":3,"name":"recover","anchor":[127,99],"silk":[127,79],"alpha8Bounds":[23,42,234,213],"rgba_sha256":"03b664be80c52587efea235d1820279144de8d5fc2b0dc6345bcc67a42efb28c"}],"manualTorsoAnchors":true,"physicalPivotsCertified":false},"mask":{"key":"bossMotionMask","cell":256,"width":512,"height":512,"scale":0.5222,"poses":[{"index":0,"name":"prepare","anchor":[126,86],"silk":[126,66],"alpha8Bounds":[38,19,214,236],"rgba_sha256":"6225bd43b3b613d43029bebfb8a75d89d5501a042349cdd32ba12d0f4fecc166"},{"index":1,"name":"downstroke","anchor":[127,103],"silk":[127,83],"alpha8Bounds":[24,32,233,235],"rgba_sha256":"f0906597ac8e0cbbe9a27349f6f3c9d045e319259f285fbf19817e93cbacdf23"},{"index":2,"name":"follow","anchor":[131,117],"silk":[131,97],"alpha8Bounds":[30,27,236,232],"rgba_sha256":"53686612c529029ed38a4fb552a25c898cd2d2d37bd2d05f32cb3d6fadf071a1"},{"index":3,"name":"recover","anchor":[125,83],"silk":[125,63],"alpha8Bounds":[21,15,235,232],"rgba_sha256":"046c4d1f9c1528243429825f30ccd3559883d040f12be107e2863a350b920b79"}],"manualTorsoAnchors":true,"physicalPivotsCertified":false},"lucifer":{"key":"bossMotionLucifer","cell":256,"width":512,"height":512,"scale":0.5109,"poses":[{"index":0,"name":"prepare","anchor":[132,111],"silk":[132,91],"alpha8Bounds":[21,34,243,233],"rgba_sha256":"cf7dafef8095e2da26ab3a94a437daaf3702c2269d1cd285b5114d0f51217607"},{"index":1,"name":"downstroke","anchor":[130,116],"silk":[130,96],"alpha8Bounds":[22,43,239,233],"rgba_sha256":"7648fda3ea27218b4fb6aea2ff53cfe46df9439892c6c7b6270bcfa1838afe93"},{"index":2,"name":"follow","anchor":[147,118],"silk":[147,98],"alpha8Bounds":[22,26,242,225],"rgba_sha256":"017136e583a11a1bd02a287c33ba3369912431234bd680897fd3eee02cd8d8a9"},{"index":3,"name":"recover","anchor":[128,98],"silk":[128,78],"alpha8Bounds":[19,29,241,227],"rgba_sha256":"a0be772a1013fa65bf268591b05399b5df8463e48866dcd321b8dbf854120e21"}],"manualTorsoAnchors":true,"physicalPivotsCertified":false}};
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function finite(n,f){return Number.isFinite(n)?n:f;}
  function mix(a,b,t){return a+(b-a)*t;}
  function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
  function sample(world,b){
    var p=clamp(finite(b.actionProgress,0),0,1),action=b.action||'recover';
    // A release marker is set only when a projectile actually spawns or an
    // announced beam becomes active. Keep the strike visible for six 60 Hz
    // ticks, then dissolve through the authored follow and recovery poses.
    var age=finite(b.releaseTick,-1)>=0?finite(world.tick,0)-b.releaseTick:Infinity;
    if(age>=0&&age<6)return {from:1,to:1,blend:1};
    if(age>=6&&age<10)return {from:1,to:2,blend:smooth((age-6)/4)};
    if(age>=10&&age<16)return {from:2,to:2,blend:1};
    if(age>=16&&age<21)return {from:2,to:3,blend:smooth((age-16)/5)};
    if(action==='charge')return {from:3,to:0,blend:smooth(p*.9/.14)};
    if(action==='attack')return {from:0,to:0,blend:1};
    return {from:3,to:3,blend:1};
  }
  // Small presentation-only weight shifts of existing authored keyposes.
  // These do not create source frames or change the simulation/hitbox anchor.
  function presentation(world,b){
    var p=clamp(finite(b.actionProgress,0),0,1),tick=finite(world.tick,0);
    var release=Number.isInteger(b.releaseTick)&&b.releaseTick>=0?b.releaseTick:-1;
    var age=release>=0?tick-release:Infinity,dy=0;
    if(age>=0&&age<6)dy=2.5*(1-smooth(age/6));
    else if(b.action==='charge')dy=-1.5*smooth(p);
    var hit=Number.isFinite(b.hitUntil)?b.hitUntil-tick:0;
    var opacity=hit>0&&hit<=4?1-.07*Math.sin(Math.PI*hit/4):1;
    return {dy:dy,opacity:opacity};
  }
  function create(images){
    var metrics;
    function beginFrame(){metrics={bossDraws:0,spriteDraws:0,tethers:0,lastBossIdentity:null,lastBossAsset:null,lastPose:null,lastSample:null,lastSilk:null,authoredKeyposesPerBoss:4,fullAnimationCycles:0,sourcePivotsCertified:false};}
    beginFrame();
    function ready(c){var im=images[c.key];return !!(im&&im.complete!==false&&im.naturalWidth===512&&im.naturalHeight===512);}
    function drawBoss(ctx,world,x,y,width,opacity){
      if(!world||!world.campaign||!world.boss||world.stage==='bossIntro')return false;
      var b=world.boss,id=b.kind||world.bossId,c=CONTRACTS[id];
      if(!c||!ready(c)||!Number.isFinite(x)||!Number.isFinite(y))return false;
      var state=sample(world,b),a=c.poses[state.from],z=c.poses[state.to],blend=state.blend;
      var scale=c.scale*clamp(finite(width,230)/230,.1,1),angle=clamp(finite(b.lean,0),-1,1)*.009;
      var weight=presentation(world,b),drawY=y+weight.dy;
      var alpha=clamp(finite(opacity,1),0,1)*weight.opacity,sway=Math.sin(finite(world.time,0)*1.6)*.5;
      var silkA=[(a.silk[0]-a.anchor[0])*scale,(a.silk[1]-a.anchor[1])*scale],silkZ=[(z.silk[0]-z.anchor[0])*scale,(z.silk[1]-z.anchor[1])*scale];
      var dx=mix(silkA[0],silkZ[0],blend),dy=mix(silkA[1],silkZ[1],blend),endX=x+dx*Math.cos(angle)-dy*Math.sin(angle),endY=drawY+dx*Math.sin(angle)+dy*Math.cos(angle);
      if(endY>64&&alpha>0){ctx.save();ctx.globalAlpha*=alpha*.30;ctx.strokeStyle='#c9c5b5';ctx.lineWidth=.65;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(180,64);ctx.lineTo((180+endX)/2+sway,64+(endY-64)*.46);ctx.lineTo(endX,endY);ctx.stroke();ctx.restore();metrics.tethers=1;metrics.lastSilk={start:[180,64],end:[endX,endY],alpha:alpha*.30,damaging:false,identity:id,boss:true};}
      function frame(p,weight){if(weight<=.001)return;ctx.save();ctx.globalAlpha*=alpha*weight;ctx.translate(x,drawY);ctx.rotate(angle);ctx.drawImage(images[c.key],(p.index%2)*256,Math.floor(p.index/2)*256,256,256,-p.anchor[0]*scale,-p.anchor[1]*scale,256*scale,256*scale);ctx.restore();metrics.spriteDraws++;}
      if(state.from===state.to)frame(z,1);else{frame(a,1-blend);frame(z,blend);}
      metrics.bossDraws++;metrics.lastBossIdentity=id;metrics.lastBossAsset=c.key;metrics.lastPose=blend>=.5?z.name:a.name;metrics.lastSample={from:state.from,to:state.to,blend:blend,scale:scale,angle:angle,position:[x,drawY],combatPosition:[x,y],presentationOffsetY:weight.dy,hitOpacity:weight.opacity};return true;
    }
    return {beginFrame:beginFrame,drawBoss:drawBoss,getMetrics:function(){return JSON.parse(JSON.stringify(metrics));}};
  }
  global.HapilBossMotion=Object.freeze({contracts:CONTRACTS,create:create,sample:sample,presentation:presentation});
})(typeof window!=='undefined'?window:globalThis);
