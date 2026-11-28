(() => {
  'use strict';

  const colors = {hero:'#83eddb',archon:'#bea8f2',drone:'#79c7e5',angel:'#e3d99b',archer:'#9ed9bc'};
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
    return colors[kind] || colors.hero;
  }

  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
  }

  function stage(ctx, w, h, stageId) {
    const bg = loadImage(stageId === 40 ? 'siege' : stageId === 41 ? 'hall' : 'background');
    ctx.fillStyle = '#181d24';
    ctx.fillRect(0, 0, w, h);
    if (!bg) return;
    const scale = Math.max(w / bg.width, h / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(12,18,24,.24)';
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
    const light = ctx.createRadialGradient(0, 0, 2, 0, 0, 53);
    light.addColorStop(0, 'rgba(255,191,133,.27)');
    light.addColorStop(1, 'rgba(255,183,106,0)');
    ctx.fillStyle = light;
    ctx.fillRect(-53, -53, 106, 106);
    if (sprite) {
      const frameW = sheet ? sheet.naturalWidth / 4 : still.naturalWidth;
      const frameH = sprite.naturalHeight;
      const frame = sheet ? (reduced ? (attack ? 2 : 0) : Math.floor(time * (attack ? 9 : 4)) % 4) : 0;
      const dh = 95;
      const dw = dh * frameW / frameH;
      ctx.drawImage(sprite, frame * frameW, 0, frameW, frameH, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#a79078';
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
    ctx.strokeStyle = aim ? '#ff94ae' : '#ffb576';
    ctx.globalAlpha = .27 + charge * .36;
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
    const col = colors.hero;
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
    ctx.strokeStyle = 'rgba(10,15,22,.92)';
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
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1920'; ctx.stroke();
    ctx.fillStyle = '#fff0e2'; ctx.fill();
    ctx.restore();
  }

  function bullet(ctx, b) {
    const aim = b.kind === 'aim', r = Math.max(1, b.r);
    ctx.save();
    ctx.translate(b.x, b.y);
    if (aim) {
      ctx.rotate(Math.atan2(b.vy || 1, b.vx || 0) - Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0,-r-1); ctx.quadraticCurveTo(r*.72,-r*.36,r,0);
      ctx.quadraticCurveTo(r*.8,r*.45,0,r+1); ctx.quadraticCurveTo(-r*.8,r*.45,-r,0);
      ctx.quadraticCurveTo(-r*.72,-r*.36,0,-r-1); ctx.closePath();
    } else {
      circle(ctx, 0, 0, r);
    }
    ctx.strokeStyle = '#311620'; ctx.lineWidth = 2.3; ctx.stroke();
    ctx.fillStyle = aim ? '#f06586' : '#ed8652'; ctx.fill();
    ctx.strokeStyle = aim ? '#ffbfd0' : '#ffe3a4'; ctx.lineWidth = .88; ctx.stroke();
    circle(ctx, 0, 0, Math.max(.75, r * .37)); ctx.fillStyle = '#fff0da'; ctx.fill();
    ctx.restore();
  }


  const allyNames = {archon:'아르콘',drone:'드론',angel:'천사',archer:'성궁수'};
  const allySize = {archon:25,drone:27,angel:31,archer:30};
  const actionName = {assist:'엄호',intercept:'요격', barrier:'방벽', control:'제어', rescue:'구원', reform:'복귀', link:'공명'};

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
    // A little engine light belongs under each support. Keep the pilot's heart unique.
    ctx.strokeStyle = tintColor;
    ctx.globalAlpha = .6;ctx.lineWidth=1;
    if (kind === 'archon') {
      ctx.beginPath();ctx.moveTo(-3,15);ctx.lineTo(0,17);ctx.lineTo(3,15);ctx.stroke();
    } else if (kind === 'drone') {
      ctx.beginPath();ctx.moveTo(-4,15);ctx.lineTo(-2,17);ctx.moveTo(2,17);ctx.lineTo(4,15);ctx.stroke();
    } else {
      ctx.beginPath();ctx.arc(0,12,4,.22*Math.PI,.78*Math.PI);ctx.stroke();
    }
    ctx.restore();
  }

  function field(ctx, f, state, reduced) {
    const r = f.r;
    if (!(r > 0)) return;
    const type = f.kind || 'bomb';
    const color = type === 'gravity' ? '#cbb7f6' : type === 'time' ? '#a3d1bf' : type === 'barrier' ? colors.angel : actionColor(state,f.slot);
    const opacity = Math.min(1, Math.max(0, f.timeLeft) / Math.min(.25, f.duration || .25));
    ctx.save();ctx.translate(f.x,f.y);
    ctx.globalAlpha = opacity * .055;
    ctx.fillStyle = color;
    circle(ctx,0,0,r);ctx.fill();
    ctx.globalAlpha = opacity * .72;ctx.strokeStyle = color;ctx.lineWidth = 1.35;
    if (type === 'barrier') {
      ctx.beginPath();
      for(let i=0;i<7;i++) {
        const angle=Math.PI*(i/3-.5), dx=Math.cos(angle)*r, dy=Math.sin(angle)*r;
        if (!i) ctx.moveTo(dx,dy); else ctx.lineTo(dx,dy);
      }
      ctx.stroke();
    } else {
      if(type==='time') ctx.setLineDash([1,9]);
      if(type==='gravity') ctx.setLineDash([8,5]);
      circle(ctx,0,0,r);ctx.stroke();
    }
    if(type==='gravity' || type==='time') {
      const offset = reduced ? 0 : (state.time || 0)*.35;
      ctx.globalAlpha *= .63;ctx.setLineDash([]);
      for(let i=0;i<4;i++) {
        const a=offset+i*Math.PI/2;
        if(type==='time'){
          ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-4),Math.sin(a)*(r-4));ctx.lineTo(Math.cos(a)*(r+1),Math.sin(a)*(r+1));ctx.stroke();
        } else {
          ctx.beginPath();ctx.arc(0,0,r*.83,a,a+.5);ctx.stroke();
        }
      }
    }
    ctx.restore();
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
    ctx.strokeStyle=kind ? tint(kind) : actionColor(state,s.slot);
    ctx.lineWidth=s.boost ? 2.3 : kind==='hero' ? 1.7 : 1.35;
    ctx.globalAlpha=s.boost ? .85 : kind==='hero' ? .59 : .51;
    ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-vx/speed*length,s.y-vy/speed*length);ctx.stroke();
    ctx.restore();
  }

  function effect(ctx, e, state, reduced, showText) {
    if (!(e.life>0) || !e.duration) return;
    const t=1-Math.min(1,e.life/e.duration);
    const slot=e.slot || 0;
    const color=['hurt','out','bossDown'].includes(e.kind)?'#fba6a5':actionColor(state,slot);
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
      if(showText && actionName[e.kind] && actor?.kind && allyNames[actor.kind]) {
        const tx=Math.min(329,Math.max(31,startX)), ty=Math.max(15,startY-20);
        const label=allyNames[actor.kind]+' '+actionName[e.kind];
        ctx.globalAlpha=Math.min(1,e.life/.16);
        ctx.font='bold 8px system-ui, sans-serif';ctx.textAlign='center';
        ctx.lineWidth=3;ctx.strokeStyle='#122022';ctx.strokeText(label,tx,ty);
        ctx.fillText(label,tx,ty);
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
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#141923';ctx.fillRect(0,0,pw,ph);
    ctx.setTransform(scale,0,0,scale,(pw-w*scale)/2,(ph-h*scale)/2);
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
    stage(ctx,w,h,s.stage);
    for (const mark of s.warnings || []) warning(ctx,mark,w,h,s.difficulty);
    captain(ctx,s.boss,(s.warnings || []).length>0,time,reduced,s.stage);
    for (const f of s.fields || []) field(ctx,f,s,reduced);
    for (const a of s.shots || []) shot(ctx,a,s);
    for (const a of allies) companion(ctx,a,time,reduced,s.power?.lineage);
    if (hero) player(ctx,hero,time,reduced);
    const fx=s.effects || [];
    const display=fx.slice().reverse().find(e=>actionName[e.kind] && e.life>.06);
    for(const e of fx) effect(ctx,e,s,reduced,e===display);
    for(const b of s.bullets || []) bullet(ctx,b);
    ctx.restore();
  }
  window.PartyRenderer={draw};
})();
