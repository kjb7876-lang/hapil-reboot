/* Short formation cues shared by the campaign and its training range. */
(function (root) {
  'use strict';
  const colour = {arrow:'#b5ead7', guard:'#dfcef7', intercept:'#a9e4ef', heal:'#c6edb7', charge:'#f9db8e'};
  function stroke(ctx, ink) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(29,31,29,.68)';
    ctx.stroke();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = ink;
    ctx.stroke();
  }
  function arrow(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-9,0); ctx.lineTo(5,0);
    ctx.moveTo(1,-2.5); ctx.lineTo(5,0); ctx.lineTo(1,2.5);
    ctx.moveTo(-10,-2); ctx.lineTo(-7,0); ctx.lineTo(-10,2);
    stroke(ctx, colour.arrow);
    ctx.restore();
  }
  function action(ctx, kind, x, y, endX, endY, progress) {
    if (!Object.hasOwn(colour, kind)) return false;
    const dx = endX - x, dy = endY - y;
    if (kind === 'arrow') {
      arrow(ctx, x + dx * progress, y + dy * progress, Math.atan2(dy, dx));
      return true;
    }
    ctx.save();
    const support = kind === 'charge' || kind === 'heal';
    // Offset support signs from the pilot's hit point; the halo stays free for dodging.
    const symbolX = endX + (support ? 9 : 0), symbolY = endY - (support ? 12 + 4 * progress : 0);
    if (kind === 'intercept' || support) {
      ctx.beginPath();
      if (support) ctx.setLineDash([1.7,4]);
      ctx.moveTo(x,y); ctx.lineTo(symbolX,symbolY);
      ctx.strokeStyle = colour[kind]; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.translate(symbolX,symbolY);
    ctx.beginPath();
    if (kind === 'guard') {
      ctx.moveTo(0,-7); ctx.lineTo(8,-4); ctx.lineTo(7,1);
      ctx.quadraticCurveTo(6,5,0,8); ctx.quadraticCurveTo(-6,5,-7,1);
      ctx.lineTo(-8,-4); ctx.closePath();
      ctx.fillStyle = 'rgba(126,109,159,.25)'; ctx.fill();
      ctx.moveTo(-4,-1); ctx.lineTo(0,-3); ctx.lineTo(4,-1);
    } else if (kind === 'intercept') {
      const d = 3 + 2 * progress;
      ctx.moveTo(-d,-d); ctx.lineTo(-1,-1); ctx.moveTo(1,1); ctx.lineTo(d,d);
      ctx.moveTo(-d,d); ctx.lineTo(-1,1); ctx.moveTo(1,-1); ctx.lineTo(d,-d);
    } else if (kind === 'heal') {
      ctx.moveTo(-4.5,0); ctx.lineTo(4.5,0); ctx.moveTo(0,-4.5); ctx.lineTo(0,4.5);
    } else {
      ctx.moveTo(-3,2); ctx.lineTo(0,-1); ctx.lineTo(3,2);
      ctx.moveTo(-3,-2); ctx.lineTo(0,-5); ctx.lineTo(3,-2);
    }
    stroke(ctx, colour[kind]);
    ctx.restore();
    return true;
  }
  root.HapilPartyCues = {action,arrow};
})(typeof globalThis === 'object' ? globalThis : this);
