(() => {
  'use strict';

  const brush=window.HapilPartyCues;
  const paper='#f2e9d6', ink='#292622', seal='#9c4638';
  const images = new Map();
  const TAU = Math.PI * 2;
  const spriteHeight = {memory: 38, seoha: 39, awakened: 40};

  function loadImage(key) {
    const uri = (window.PARTY_ART || {})[key];
    if (!uri) return null;
    if (!images.has(key)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = uri;
      images.set(key, image);
    }
    const image = images.get(key);
    return image.complete && image.naturalWidth ? image : null;
  }

  function tint(kind) {
    return brush.roles[kind] || brush.roles.hero;
  }

  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
  }

  function stage(ctx, w, h, stageId) {
    const bg = loadImage(stageId === 40 ? 'siege' : stageId === 41 ? 'hall' : 'background');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    if (!bg) return;
    const scale = Math.max(w / bg.width, h / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(242,233,214,.20)';
    ctx.fillRect(0, 0, w, h);
  }

  function captain(ctx, boss, attack, time, reduced, stageId) {
    if (!boss || !boss.alive) return;
    const role = stageId === 40 ? 'gate' : stageId === 41 ? 'demons' : 'captain';
    const sheet = loadImage(role + (attack ? 'AttackSheet' : 'Sheet'));
    const still = role === 'captain' ? loadImage(attack ? 'captainAttack' : 'captain') : null;
    const sprite = sheet || still;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.beginPath();ctx.ellipse(0,33,26,3.4,-.05,0,TAU);
    ctx.fillStyle='rgba(62,55,45,.15)';ctx.fill();
    if (sprite) {
      const frameW = sheet ? sheet.naturalWidth / 4 : still.naturalWidth;
      const frameH = sprite.naturalHeight;
      const frame = sheet ? (reduced ? (attack ? 2 : 0) : Math.floor(time * (attack ? 9 : 4)) % 4) : 0;
      const dh = 95;
      const dw = dh * frameW / frameH;
      ctx.drawImage(sprite, frame * frameW, 0, frameW, frameH, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#64584c';
      ctx.beginPath();
      ctx.moveTo(0, 30); ctx.lineTo(-20, -21); ctx.lineTo(0, -12); ctx.lineTo(20, -21); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function warning(ctx, mark, w, h, difficulty) {
    const aim = mark.kind === 'aim';
    const charge = Math.max(0, Math.min(1, 1 - mark.timeLeft / (mark.lead || 1)));
    const rot = Number.isFinite(mark.angle) ? mark.angle : Math.PI / 2;
    const len = Math.hypot(w,h);
    ctx.save();
    ctx.translate(mark.x, mark.y);
    ctx.rotate(rot);
    ctx.strokeStyle = aim ? seal : '#705d4a';
    ctx.globalAlpha = .40 + charge * .38;
    ctx.lineWidth = aim ? 1.35 : 1;
    ctx.setLineDash(aim ? [4, 7] : [10, 8]);
    if (aim) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    } else {
      // Rank muzzle spacing and angles follow the difficulty of this flight.
      const wings = difficulty === 'gentle' ? 2 : difficulty === 'hell' ? 4 : 3;
      ctx.globalAlpha *= .75;
      for (const sign of [-1, 1]) {
        const ox = sign * wings * 9 * Math.cos(rot) - wings * 5 * Math.sin(rot);
        const oy = -sign * wings * 9 * Math.sin(rot) - wings * 5 * Math.cos(rot);
        ctx.beginPath(); ctx.moveTo(ox, oy);
        ctx.lineTo(ox + len * Math.cos(wings*.075), oy + sign * len * Math.sin(wings*.075)); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = .65 + charge * .3;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(7, -3); ctx.lineTo(12, 0); ctx.lineTo(7, 3); ctx.stroke();
    ctx.restore();
  }

  function heart(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * .49, r * .51, -r, .05 * r, -r, -.34 * r);
    ctx.bezierCurveTo(-r, -.99 * r, -.47 * r, -1.12 * r, 0, -.55 * r);
    ctx.bezierCurveTo(.47 * r, -1.12 * r, r, -.99 * r, r, -.34 * r);
    ctx.bezierCurveTo(r, .05 * r, r * .49, r * .51, 0, r);
    ctx.closePath();
  }

  function player(ctx, p, time, reduced) {
    if (p.lives <= 0 || p.respawn > 0 || !p.alive) return;
    const col = seal;
    const sprite = loadImage(p.hero);
    const dh = spriteHeight[p.hero] || 38;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invuln > 0) {
      ctx.globalAlpha = reduced ? .65 : .74 + .18 * Math.cos(time * 12);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      circle(ctx, 0, 0, 16); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (sprite) {
      const dw = dh * sprite.naturalWidth / sprite.naturalHeight;
      ctx.drawImage(sprite, -dw / 2, -dh * .57, dw, dh);
    } else {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-6, 9); ctx.lineTo(0, 6); ctx.lineTo(6, 9); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const r = p.hitRadius || p.hitR || 3;
    ctx.strokeStyle = paper;
    ctx.lineWidth = 2.75;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, .85 * Math.PI, 1.32 * Math.PI);
    ctx.moveTo(Math.cos(-.15 * Math.PI) * (r + 3), Math.sin(-.15 * Math.PI) * (r + 3));
    ctx.arc(0, 0, r + 3, -.15 * Math.PI, .32 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    heart(ctx, r);
    ctx.fillStyle = ink;ctx.fill();
    brush.line(ctx,seal,1);
    ctx.restore();
  }

  // Two small ink stamps cover the whole training vocabulary. Enemy cores keep
  // the simulator's radius; only the paper edge extends beyond the hit area.
  const stamps=new Map();
  function bulletStamp(aim,radius) {
    const key=(aim?'aim':'rank')+radius;
    if(stamps.has(key))return stamps.get(key);
    const pad=Math.ceil(radius+3),size=2*pad;
    const stamp=document.createElement('canvas');
    stamp.width=stamp.height=2*size;
    const g=stamp.getContext('2d');
    g.scale(2,2);g.translate(pad,pad);
    const r=radius;
    g.beginPath();
    if(aim){
      g.moveTo(-r*1.25,0);
      g.quadraticCurveTo(-r*.28,-r*.85,r*.45,-r*.68);
      g.quadraticCurveTo(r*1.3,-r*.34,r,.25*r);
      g.quadraticCurveTo(r*.63,r*1.1,-r*.25,r*.59);
      g.closePath();
    }else{
      g.moveTo(-r,-.12*r);
      g.bezierCurveTo(-r*.89,-r*1.06,.53*r,-r*1.17,r*.92,-r*.32);
      g.bezierCurveTo(1.2*r,.5*r,r*.31,1.06*r,-.24*r,.96*r);
      g.quadraticCurveTo(-r*.97,r*.82,-r,-.12*r);g.closePath();
    }
    g.lineWidth=2.5;g.strokeStyle=paper;g.stroke();
    g.fillStyle=ink;g.fill();
    // One split in the drier end also distinguishes an aimed nib from a round drop.
    g.beginPath();
    if(aim){g.moveTo(-r*.87,-.06*r);g.quadraticCurveTo(-r*.28,-.25*r,.1*r,-.26*r);}
    else{g.moveTo(-r*.58,-.33*r);g.quadraticCurveTo(-r*.30,-r*.68,.15*r,-.57*r);}
    g.lineWidth=.8;g.strokeStyle='#aba294';g.stroke();
    stamps.set(key,stamp);
    return stamp;
  }

  function bullet(ctx,b) {
    const aim=b.kind==='aim',stamp=bulletStamp(aim,Math.max(1,b.r));
    const size=stamp.width/2;
    ctx.save();ctx.translate(b.x,b.y);
    if(aim)ctx.rotate(Math.atan2(b.vy,b.vx));
    ctx.drawImage(stamp,-size/2,-size/2,size,size);
    ctx.restore();
  }

  const allySize = {archon:25,drone:27,angel:31,archer:30};

  function actionColor(s, slot) {
    const actor = s.players && s.players.find(p => p.slot === slot);
    return tint(actor && actor.kind);
  }

  function companion(ctx, p, time, reduced, lineage) {
    const kind = p.kind;
    const tintColor = tint(kind);
    const size = allySize[kind] || 26;
    const rebuilding = p.alive === false || p.respawn > 0;
    const key = kind === 'archon' && lineage === 'neural' ? 'archonNeural' : kind === 'archon' && lineage === 'gravity' ? 'archonGravity' : kind;
    const image = loadImage(key);
    ctx.save();
    ctx.translate(p.x,p.y);
    if (rebuilding) {
      // The companion regroups at its post. Only the hero has a lethal hitpoint.
      ctx.globalAlpha = .63;
      ctx.strokeStyle = tintColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2,4]);
      circle(ctx,0,0,7);ctx.stroke();
      ctx.setLineDash([]);ctx.beginPath();
      ctx.arc(0,0,9,-Math.PI/2,Math.PI*2*(1-Math.min(1,p.respawn/2.6))-Math.PI/2);ctx.stroke();
      ctx.restore();
      return;
    }
    if (image) {
      const w = size, h = size * image.naturalHeight / image.naturalWidth;
      const bob = reduced ? 0 : 1.2 * Math.sin(time * 3 + p.slot * 2);
      ctx.globalAlpha = .98;
      ctx.drawImage(image, -w / 2, -h / 2 + bob, w, h);
    }
    // Role-specific brush strokes stay below the ally's feet.
    ctx.strokeStyle = tintColor;
    ctx.globalAlpha = .6;ctx.lineWidth=1;
    if (kind === 'archon') {
      ctx.beginPath();ctx.moveTo(-3,15);ctx.lineTo(0,17);ctx.lineTo(3,15);ctx.stroke();
    } else if (kind === 'drone') {
      ctx.beginPath();ctx.moveTo(-4,15);ctx.lineTo(-2,17);ctx.moveTo(2,17);ctx.lineTo(4,15);ctx.stroke();
    } else if(kind==='archer'){
      ctx.beginPath();ctx.moveTo(-5,16);ctx.lineTo(4,14);ctx.lineTo(2,16);ctx.stroke();
    } else {
      ctx.beginPath();ctx.arc(0,12,4,.22*Math.PI,.78*Math.PI);ctx.stroke();
    }
    ctx.restore();
  }

  function field(ctx,f) {
    const opacity=Math.min(1,Math.max(0,f.timeLeft)/Math.min(.25,f.duration||.25));
    ctx.save();ctx.globalAlpha=.69*opacity;
    brush.field(ctx,f.x,f.y,f.r,f.kind||'bomb');ctx.restore();
  }

  function shot(ctx,s,state) {
    const vx=s.vx || 0,vy=s.vy || -1,speed=Math.hypot(vx,vy)||1;
    const kind=s.kind || (s.slot===0?'hero':null);
    if(kind==='archer' && window.HapilPartyCues){
      ctx.save();ctx.globalAlpha=.82;
      window.HapilPartyCues.arrow(ctx,s.x,s.y,Math.atan2(vy,vx));
      ctx.restore();return;
    }
    const length=s.boost ? 12 : kind==='drone' ? 9 : 6;
    ctx.save();
    ctx.globalAlpha=s.boost ? .85 : kind==='hero' ? .59 : .51;
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-vx/speed*length,s.y-vy/speed*length);
    brush.line(ctx,kind?tint(kind):actionColor(state,s.slot),s.boost?1.8:1.1);
    ctx.restore();
  }

  function effect(ctx, e, state, reduced) {
    if (!(e.life>0) || !e.duration) return;
    const t=1-Math.min(1,e.life/e.duration);
    const slot=e.slot || 0;
    const color=['hurt','out','bossDown'].includes(e.kind)?seal:actionColor(state,slot);
    ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;
    ctx.globalAlpha=(reduced?.58:.92)*(1-t);ctx.lineWidth=1.15;
    const actor=state.players && state.players.find(p=>p.slot===slot);
    const startX=actor ? actor.x : e.x, startY=actor ? actor.y : e.y;
    if(['assist','intercept','barrier','control','power','rescue','link','guard','charge','heal'].includes(e.kind)){
      const hasEnd=Number.isFinite(e.endX)&&Number.isFinite(e.endY);
      const x0=hasEnd?e.x:startX, y0=hasEnd?e.y:startY, x1=hasEnd?e.endX:e.x, y1=hasEnd?e.endY:e.y;
      if (!window.HapilPartyCues?.action(ctx,e.kind,x0,y0,x1,y1,reduced?.5:t)) {
        if (Math.hypot(x1-x0,y1-y0)>6) {
          ctx.setLineDash([2,4]);
          ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();ctx.setLineDash([]);
        }
        circle(ctx,x1,y1,3+(reduced?.4:t)*10);ctx.stroke();
      }
    } else if(['hurt','out','disrupt','bossDown','evade','reform','impact'].includes(e.kind)){
      const end=e.kind==='bossDown'?44:e.kind==='impact'?4:13;
      if(e.kind==='impact')ctx.globalAlpha*=.4;
      if(e.kind==='reform'||e.kind==='disrupt'||e.kind==='evade')ctx.setLineDash([3,4]);
      circle(ctx,e.x,e.y,3+(reduced?.5:t)*end);ctx.stroke();
    }
    ctx.restore();
  }

  function draw(canvas, s, options={}) {
    if(!canvas || !s) return;
    const w=s.w || 360,h=s.h || 520;
    const dpr=Math.min(window.devicePixelRatio || 1,2);
    const pw=Math.max(1,Math.round((canvas.clientWidth || w)*dpr)),ph=Math.max(1,Math.round((canvas.clientHeight || h)*dpr));
    if(canvas.width!==pw || canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    const reduced=!!options.reducedMotion,time=s.time || 0;
    const hero=s.hero || s.players?.[0], allies=s.allies || s.players?.slice(1) || [];
    const scale=Math.min(pw/w,ph/h);
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=paper;ctx.fillRect(0,0,pw,ph);
    ctx.setTransform(scale,0,0,scale,(pw-w*scale)/2,(ph-h*scale)/2);
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
    stage(ctx,w,h,s.stage);
    for (const mark of s.warnings || []) warning(ctx,mark,w,h,s.difficulty);
    captain(ctx,s.boss,(s.warnings || []).length>0,time,reduced,s.stage);
    for (const f of s.fields || []) field(ctx,f);
    for (const a of s.shots || []) shot(ctx,a,s);
    for (const a of allies) companion(ctx,a,time,reduced,s.power?.lineage);
    if (hero) player(ctx,hero,time,reduced);
    for(const e of s.effects || []) effect(ctx,e,s,reduced);
    for(const b of s.bullets || []) bullet(ctx,b);
    ctx.restore();
  }
  window.PartyRenderer={draw};
})();
