/* Allied brush marks have a light paper edge so they stay legible over dark scenery. */
(function (root) {
  'use strict';
  const paper = '#f3eada';
  const ink = '#37322e';
  const seal = '#9c4638';
  const roles = {hero:seal,archon:'#514741',drone:'#59605b',angel:'#806451',archer:'#5a5247'};

  function line(ctx, colour, width) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = width + 1.6;
    ctx.strokeStyle = paper;
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = colour;
    ctx.stroke();
  }

  function arrow(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x,y); ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-9,0); ctx.lineTo(6,0);
    ctx.moveTo(-9,-2.4); ctx.lineTo(-5,0); ctx.lineTo(-9,2);
    ctx.moveTo(1,-2.5); ctx.lineTo(6,0); ctx.lineTo(1,2.5); ctx.lineTo(2,0); ctx.closePath();
    line(ctx,roles.archer,1.15);
    ctx.fillStyle = roles.archer;
    ctx.fill();
    ctx.restore();
  }

  function action(ctx, kind, x, y, endX, endY, progress) {
    const support = kind === 'charge' || kind === 'heal';
    if (kind === 'arrow') {
      arrow(ctx,x+(endX-x)*progress,y+(endY-y)*progress,Math.atan2(endY-y,endX-x));
      return true;
    }
    if (!support && kind !== 'guard' && kind !== 'intercept') return false;
    ctx.save();
    // Keep the centre clear for the hero's actual hit point.
    const px=endX+(support?10:0), py=endY-(support?12+3*progress:0);
    if (kind==='intercept') {
      const dx=endX-x,dy=endY-y,f=Math.min(1,20/(Math.hypot(dx,dy)||1));
      ctx.beginPath();
      ctx.moveTo(endX-dx*f,endY-dy*f);ctx.lineTo(endX,endY);
      line(ctx,roles.drone,.8);
    }
    ctx.translate(px,py);
    ctx.beginPath();
    if (kind==='guard') {
      ctx.moveTo(-8,-4);ctx.lineTo(0,-7);ctx.lineTo(8,-4);
      ctx.quadraticCurveTo(8,3,0,8);ctx.quadraticCurveTo(-7,5,-8,-4);ctx.closePath();
      ctx.fillStyle='rgba(217,202,175,.52)';ctx.fill();
      ctx.moveTo(-4,-1);ctx.lineTo(0,-3);ctx.lineTo(4,-1);
    } else if (kind==='intercept') {
      const spread=4+progress*2;
      ctx.moveTo(-spread,-spread*.6);ctx.lineTo(-1,-1);
      ctx.moveTo(2,1);ctx.lineTo(spread,spread*.55);
      ctx.moveTo(-spread*.65,spread);ctx.lineTo(-1,1);
      ctx.moveTo(1,-1);ctx.lineTo(spread*.85,-spread);
    } else if (kind==='heal') {
      ctx.moveTo(-4.5,0);ctx.lineTo(4.5,0);ctx.moveTo(0,-4.5);ctx.lineTo(0,4.5);
    } else {
      ctx.moveTo(-4,3);ctx.lineTo(0,-1);ctx.lineTo(3,2);
      ctx.moveTo(-3,-2);ctx.lineTo(0,-5);ctx.lineTo(3,-2);
    }
    line(ctx,support?seal:ink,kind==='heal'?2:1.4);
    ctx.restore();
    return true;
  }

  // The broken rim marks the actual radius, with sparse, distinct strokes for each power.
  function field(ctx, x, y, radius, kind) {
    if (!(radius>0)) return;
    const tau=Math.PI*2;
    ctx.save();ctx.translate(x,y);
    ctx.beginPath();
    if (kind==='barrier') {
      for(let i=0;i<6;i++){
        const a=-Math.PI/2+i*tau/6, b=a+tau/6;
        const x0=Math.cos(a)*radius,y0=Math.sin(a)*radius,x1=Math.cos(b)*radius,y1=Math.sin(b)*radius;
        ctx.moveTo(x0+(x1-x0)*.03,y0+(y1-y0)*.03);
        ctx.lineTo(x0+(x1-x0)*.87,y0+(y1-y0)*.87);
      }
    } else {
      const count=kind==='neural'?6:4;
      for(let i=0;i<count;i++) {
        const a=-1.28+i*tau/count, b=a+tau/count*(kind==='gravity'?.58:.76);
        ctx.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);
        ctx.arc(0,0,radius,a,b);
        if(kind==='time'){
          ctx.moveTo(Math.cos(a)*(radius-3.8),Math.sin(a)*(radius-3.8));
          ctx.lineTo(Math.cos(a)*(radius+1),Math.sin(a)*(radius+1));
        }else if(kind==='gravity'){
          ctx.lineTo(Math.cos(b+.07)*(radius-4.5),Math.sin(b+.07)*(radius-4.5));
        }
      }
    }
    line(ctx,kind==='barrier'?roles.angel:roles.archon,1.05);
    ctx.restore();
  }
  root.HapilPartyCues={action,arrow,field,line,roles};
})(typeof globalThis==='object'?globalThis:this);
