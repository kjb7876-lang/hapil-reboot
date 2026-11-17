/* Rendering only: reveal nearby hostile shapes through the hero, without changing combat. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HapilHeroVisibility=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var MIN_OPACITY=.34,NEAR=26,FAR=74,LASER_LENGTH=1000;
  function finite(n){return typeof n==='number'&&isFinite(n);}
  function clamp(n){return Math.max(MIN_OPACITY,Math.min(1,n));}
  function opacity(edge){if(edge<=NEAR)return MIN_OPACITY;if(edge>=FAR)return 1;var t=(edge-NEAR)/(FAR-NEAR);return MIN_OPACITY+(1-MIN_OPACITY)*t*t*(3-2*t);}
  function segmentDistance(px,py,x0,y0,x1,y1){
    var dx=x1-x0,dy=y1-y0,len=dx*dx+dy*dy,u=len?((px-x0)*dx+(py-y0)*dy)/len:0;
    u=Math.max(0,Math.min(1,u));dx=px-x0-u*dx;dy=py-y0-u*dy;return Math.sqrt(dx*dx+dy*dy);
  }
  function target(s,A){
    if(!s||!s.player||!A||!finite(s.player.x)||!finite(s.player.y))return 1;
    var px=s.player.x,py=s.player.y,best=FAR,scale=finite(s.sizeScale)?Math.max(0,s.sizeScale):1,i,x,y,r,dx,dy,d,limit;
    for(i=0;i<(s.n||0);i++){
      if(s.bage[i]<Math.max(A.BLOOM_TICKS||0,s.bgrace&&s.bgrace[i]||0))continue;
      x=s.bx[i];y=s.by[i];if(!finite(x)||!finite(y))continue;
      var size=s.bsize[i],color=s.bcolor[i];
      if(size===A.SHAPE_PROP&&(!A.PROPS||!A.PROPS[color]))continue;
      r=A.bulletRenderSpan?A.bulletRenderSpan(size,color)*scale*.5:(A.SIZE_RADIUS[size]||0)*scale;
      if(!finite(r))continue;
      dx=px-x;dy=py-y;limit=best+r;
      if(Math.abs(dx)>=limit||Math.abs(dy)>=limit||dx*dx+dy*dy>=limit*limit)continue;
      d=Math.sqrt(dx*dx+dy*dy)-r;if(d<=NEAR)return MIN_OPACITY;if(d<best)best=d;
    }
    var lasers=s.lasers||[];
    for(i=0;i<lasers.length;i++){
      var l=lasers[i];if(l.age<l.warn||l.age>=l.warn+l.active)continue;
      if(!finite(l.x)||!finite(l.y)||!finite(l.angle)||!finite(l.width))continue;
      x=l.x+Math.cos(l.angle)*LASER_LENGTH;y=l.y+Math.sin(l.angle)*LASER_LENGTH;
      d=segmentDistance(px,py,l.x,l.y,x,y)-l.width*.5;
      if(d<=NEAR)return MIN_OPACITY;if(d<best)best=d;
    }
    var figures=s.figures||[];
    if(A.figurePhase&&A.figureSegments)for(i=0;i<figures.length;i++){
      var f=figures[i];if(A.figurePhase(f,s.tick)!=='on')continue;
      r=(f.width||0)*.5;
      // Keep distant glyphs out of the segment allocation path. Rune radii use
      // their authored outer ring; exact segment distance still decides fading.
      var reach=0,j;
      if(f.kind==='runes'&&f.rings){for(j=0;j<f.rings.length;j++)reach=Math.max(reach,f.rings[j].r);reach*=f.fit||1;}
      else if(f.kind==='glyph')reach=(f.r||0)*2;
      if(reach&&Math.hypot(px-f.cx,py-f.cy)>reach+r+best)continue;
      var segments=A.figureSegments(f);
      for(j=0;j<segments.length;j++){var q=segments[j];d=segmentDistance(px,py,q[0],q[1],q[2],q[3])-r;if(d<=NEAR)return MIN_OPACITY;if(d<best)best=d;}
    }
    return opacity(best);
  }
  function smooth(current,wanted,elapsed){
    current=finite(current)?clamp(current):1;wanted=finite(wanted)?clamp(wanted):1;
    if(!finite(elapsed)||elapsed<=0)return current;
    var dt=Math.min(.1,elapsed),tau=wanted<current?.07:.18;
    return clamp(wanted+(current-wanted)*Math.exp(-dt/tau));
  }
  return Object.freeze({target:target,smooth:smooth,MIN_OPACITY:MIN_OPACITY,NEAR:NEAR,FAR:FAR});
});
