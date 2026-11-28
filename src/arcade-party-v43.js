/* One pilot owns all stocks. AI companions operate on the actual campaign projectile field. */
(function (root) {
  'use strict';
  const positions = {front:[-18,-72], wing:[58,-20], rear:[-43,26]};
  const types = ['archon','drone','angel'];
  const colours = {archon:'#b99fea',drone:'#69b9bc',angel:'#e6c477'};
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const integer = (n,min,max) => Number.isFinite(n) ? clamp(Math.floor(n),min,max) : min;
  const neutralEffects = Object.freeze({droneDamage:1,archonCooldown:1,wardCapacity:0,powerCharge:1,reformTime:1,evadeSeconds:0});
  function create(config, player, auto) {
    if (!config || !Array.isArray(config.companions)) return null;
    const allies = [], slots = new Set(), roster = new Set();
    for (const c of config.companions) {
      if (!c || !types.includes(c.kind) || !Object.prototype.hasOwnProperty.call(positions,c.slot) || slots.has(c.slot) || roster.has(c.kind)) continue;
      slots.add(c.slot); roster.add(c.kind);
      const stars = integer(c.stars,1,7), gear = integer(c.gear,0,2), supply = integer(c.supply,0,3);
      const health = 2 + Math.floor((stars-1)/3) + (c.slot==='rear'?1:0);
      const [ox,oy] = positions[c.slot];
      allies.push({kind:c.kind,slot:c.slot,stars,gear,supply,x:player.x+ox,y:player.y+oy,
        integrity:health,maxIntegrity:health,ready:36+allies.length*12,nextShot:0,reform:0,invuln:0,
        evadeX:0,evadeY:0,action:null,blocks:0,damage:0,disabled:0,casts:0});
    }
    return {allies,effects:config.effects||neutralEffects,auto:!!auto,lineage:['time','gravity','neural'].includes(config.lineage)?config.lineage:'time',
      charge:100,powerUses:0,autoPowers:0,linkUsed:false,neuralUntil:0,field:null,ward:null,rescue:0,extends:0,boostUntil:0,recoverUntil:0,evades:0,rewardNext:0,
      moveX:player.x,moveY:player.y,lastMove:-100,autoX:0,autoY:0,guardTick:-100,wasAuto:!!auto,
      laserRead:null,wasFocus:false,grazes:0,hits:0};
  }
  function readyBullet(s,i) {
    return !s.bexit[i] && s.bage[i]>=s.bgrace[i];
  }
  // Select an approaching projectile by distance at closest approach, rather than dispersion density.
  function danger(s,x,y,range,smallOnly) {
    let best=-1,score=Infinity;
    for(let i=0;i<s.n;i++){
      const dx=s.bx[i]-x,dy=s.by[i]-y;
      if(Math.abs(dx)>range||Math.abs(dy)>range||!readyBullet(s,i)||(smallOnly&&s.bsize[i]===5))continue;
      const vx=Math.cos(s.ba[i])*s.bs[i]/60,vy=Math.sin(s.ba[i])*s.bs[i]/60;
      const t=clamp(-(dx*vx+dy*vy)/(vx*vx+vy*vy||1),0,30);
      const ex=dx+vx*t,ey=dy+vy*t,dist=ex*ex+ey*ey;
      if(dist>24*24 || dist+t*2>=score)continue;
      best=i;score=dist+t*2;
    }
    return best;
  }
  function away(s,index,x,y) {
    const angle=s.ba[index],nx=-Math.sin(angle),ny=Math.cos(angle);
    let sign=(x-s.bx[index])*nx+(y-s.by[index])*ny>=0?1:-1;
    if(x+nx*sign*35<10||x+nx*sign*35>350)sign=-sign;
    return [nx*sign,ny*sign];
  }
  function rayDistance(l,x,y) {
    const c=Math.cos(l.angle),sn=Math.sin(l.angle),dx=x-l.x,dy=y-l.y;
    if(!l.full&&dx*c+dy*sn<0)return Infinity;
    return Math.abs(dx*sn-dy*c);
  }
  function steer(s,input) {
    const q=s.party,p=s.player;
    if(q.wasAuto!==q.auto){
      q.wasAuto=q.auto;q.boostUntil=0;q.laserRead=null;q.lastMove=-100;
    }
    if(!q.auto)return input;
    if(s.tick%4===1){
      const front=q.allies.find(a=>a.slot==='front'&&!a.reform);
      const look=front?{archon:123,drone:102,angel:84}[front.kind]:68;
      const i=danger(s,p.x,p.y,look,false);
      if(i>=0)[q.autoX,q.autoY]=away(s,i,p.x,p.y);
      else {
        const beam=s.lasers.find(l=>l.age<l.warn+l.active && l.age+26>=l.warn && rayDistance(l,p.x,p.y)<l.width*.5+18);
        if(beam){
          const nx=-Math.sin(beam.angle),ny=Math.cos(beam.angle);
          let side=(p.x-beam.x)*nx+(p.y-beam.y)*ny>=0?1:-1;
          if(p.x+side*nx*28<9||p.x+side*nx*28>351)side=-side;
          q.autoX=side*nx;q.autoY=side*ny;
        } else {
          const target=s.boss.present?s.boss.x:180;
          q.autoX=clamp((target-p.x)/90,-.38,.38);q.autoY=clamp((528-p.y)/90,-.3,.3);
        }
      }
    }
    return {dx:q.autoX*3.25,dy:q.autoY*3.25,bomb:!!(input&&input.bomb),focus:!!(input&&input.focus)};
  }
  function mark(a,kind,tick,x,y){
    a.action={kind,from:tick,until:tick+(kind==='shot'?8:22),x,y};
  }
  function field(s,manual,source) {
    const q=s.party,p=s.player,linked=manual&&!q.linkUsed&&q.allies.some(a=>a.kind==='archon'&&!a.reform)&&
      q.allies.some(a=>a.kind==='drone'&&!a.reform)&&q.allies.some(a=>a.kind!=='angel'&&a.stars===7&&!a.reform);
    const radius=manual?150:97, clock=s.tick+(manual?144:81)+(linked?39:0);
    const x=q.lineage==='gravity'?clamp(p.x+(p.x>180?84:-84),20,340):p.x, y=Math.max(96,p.y-(manual?63:82));
    if(!manual&&q.field&&q.field.manual&&s.tick<q.field.until)return false;
    if(q.lineage==='neural'){
      const delay=(manual?66:33)+(linked?27:0);
      const l=s.lasers.find(b=>b.age<b.warn&&!b.partyDelayed);
      if(l){l.warn+=delay;l.partyDelayed=true;}
      else if(s.stage==='card'&&!s.cardEnding&&!s.cardDown){q.neuralUntil=Math.max(q.neuralUntil,s.tick+delay);}
      else {
        const mob=s.mobs.find(m=>m.hp>0&&!m.retreat&&m.y>=0&&!m.brood);
        if(!mob)return false;
        mob.next=Math.max(mob.age,Number.isFinite(mob.next)?mob.next:mob.first||0)+delay;
        if(mob.cueAt>s.tick)mob.cueAt+=delay;
      }
    }
    q.field={x,y,radius,until:clock,strength:manual?.52:.36,lineage:q.lineage,manual,source};
    if(linked)q.linkUsed=true;
    else if(manual&&!q.linkUsed){
      const angel=q.allies.find(a=>a.kind==='angel'&&a.stars===7&&!a.reform);
      if(angel&&q.allies.some(a=>a!==angel&&!a.reform)){
        q.linkUsed=true;q.ward={x:p.x,y:p.y-12,capacity:2+q.effects.wardCapacity,radius:42,until:s.tick+87,owner:angel};
      }
    }
    return true;
  }
  function refit(s,config) {
    const q=s.party,next=create(config,s.player,q.auto);
    if(!next)return;
    for(const n of next.allies){
      const old=q.allies.find(a=>a.kind===n.kind);
      if(!old){n.ready+=s.tick;continue;}
      const wounds=old.maxIntegrity-old.integrity;
      Object.assign(old,{slot:n.slot,stars:n.stars,gear:n.gear,supply:n.supply,maxIntegrity:n.maxIntegrity,
        integrity:old.reform?0:Math.max(1,n.maxIntegrity-wounds)});
      Object.assign(n,old);
    }
    q.allies=next.allies;q.lineage=next.lineage;q.effects=next.effects;q.field=null;q.ward=null;q.linkUsed=false;q.laserRead=null;
  }
  // Checkpoints reopen the current segment with the same remaining support resources.
  // Store relative durations because the restored engine starts its clock at zero.
  function checkpoint(s) {
    const q=s.party, left=until=>Math.max(0,until-s.tick);
    return {charge:q.charge,rescue:q.rescue,linkUsed:q.linkUsed,boost:left(q.boostUntil),recover:left(q.recoverUntil),
      allies:q.allies.map(a=>({kind:a.kind,wounds:a.maxIntegrity-a.integrity,reform:left(a.reform),
        ready:left(a.ready),shot:left(a.nextShot),invuln:left(a.invuln)}))};
  }
  function restore(s,carry) {
    if(!carry||!Array.isArray(carry.allies))return;
    const q=s.party,t=s.tick;
    q.charge=clamp(Number(carry.charge)||0,0,100);q.rescue=integer(carry.rescue,0,2);q.linkUsed=carry.linkUsed===true;
    q.boostUntil=q.auto?0:t+integer(carry.boost,0,400);q.recoverUntil=t+integer(carry.recover,0,60);
    for(const a of q.allies){
      const old=carry.allies.find(c=>c&&c.kind===a.kind);if(!old)continue;
      a.reform=old.reform?t+integer(old.reform,0,240):0;
      a.integrity=a.reform?0:Math.max(1,a.maxIntegrity-integer(old.wounds,0,8));
      a.ready=t+integer(old.ready,0,510);a.nextShot=t+integer(old.shot,0,43);a.invuln=t+integer(old.invuln,0,80);
    }
  }
  function cast(s,a,i,tools) {
    const q=s.party,p=s.player,bx=s.bx[i],by=s.by[i];
    if(a.kind==='drone'){
      tools.removeBullet(s,i);a.blocks++;
      mark(a,'intercept',s.tick,bx,by);
    } else if(a.kind==='archon'){
      if(!field(s,false,a))return false;
      mark(a,'control',s.tick,q.field.x,q.field.y);
    } else {
      q.ward={x:p.x,y:p.y-12,capacity:(a.slot==='rear'?2:1)+q.effects.wardCapacity,radius:35+a.stars*1.2,
        until:s.tick+69,owner:a};
      mark(a,'ward',s.tick,p.x,p.y);
    }
    a.casts++;
    const base=a.kind==='drone'?288:a.kind==='archon'?480*q.effects.archonCooldown:510;
    a.ready=s.tick+Math.max(38,Math.round(base*(a.slot==='front'?.75:1)/(1+.048*(a.stars-1)+.04*a.gear+.025*a.supply)));
    return true;
  }
  function enemy(s,a) {
    let best=null,distance=Infinity;
    if(s.stage==='card' && s.boss.present&&!s.boss.leaving&&!s.cardDown&&!s.cardEnding&&s.boss.hp>0) {
      best=s.boss;distance=Math.hypot(best.x-a.x,best.y-a.y);
    }
    for(const m of s.mobs){
      if(m.hp<=0||m.y<0)continue;
      const d=Math.hypot(m.x-a.x,m.y-a.y);
      if(d<distance){best=m;distance=d;}
    }
    return best;
  }
  function update(s,tools) {
    const q=s.party,p=s.player;
    if(q.field && s.tick>q.field.until)q.field=null;
    if(q.ward && (s.tick>q.ward.until||q.ward.owner.reform))q.ward=null;
    const active=s.stage==='wave'||s.stage==='card';
    if(active){
      const rear=q.allies.some(a=>a.slot==='rear'&&!a.reform);
      q.charge=Math.min(100,q.charge+(rear?.12:.1)*q.effects.powerCharge);
      if(q.charge>=100){
        const command=p.focus&&!q.wasFocus;
        const alerted=!command&&q.auto&&s.tick%8===0&&s.tick>=p.invulnerableUntil&&(
          danger(s,p.x,p.y,122,true)>=0 || s.lasers.some(l=>l.age<l.warn&&l.age+35>=l.warn&&rayDistance(l,p.x,p.y)<l.width*.5+12));
        if((command||alerted)&&field(s,true,p)){
          q.charge=0;q.powerUses++;if(alerted)q.autoPowers++;
        }
      }
    }
    const moved=Math.hypot(p.x-q.moveX,p.y-q.moveY);
    if(!q.auto&&moved>.7)q.lastMove=s.tick;
    q.moveX=p.x;q.moveY=p.y;
    if(!q.auto&&!q.laserRead&&s.tick>=p.invulnerableUntil&&active){
      const line=s.lasers.find(l=>l.age<l.warn&&rayDistance(l,p.x,p.y)<=l.width*.5+p.r);
      if(line)q.laserRead={line,x:p.x,y:p.y,hits:s.hits,bombs:s.bombsUsed};
    }
    for(let index=0;index<q.allies.length;index++){
      const a=q.allies[index];
      if(a.reform){
        if(s.tick<a.reform)continue;
        a.reform=0;a.integrity=a.maxIntegrity;a.invuln=s.tick+60;a.x=p.x;a.y=p.y;
      }
      if((s.tick+index)%6===0){
        const i=danger(s,a.x,a.y,78,false);
        if(i>=0)[a.evadeX,a.evadeY]=away(s,i,a.x,a.y);
        else {a.evadeX=0;a.evadeY=0;}
      }
      const [ox,oy]=positions[a.slot],tx=clamp(p.x+ox+a.evadeX*36,12,348),ty=clamp(p.y+oy+a.evadeY*32,34,625);
      const angle=Math.atan2(ty-a.y,tx-a.x),dist=Math.min(3.5,Math.hypot(tx-a.x,ty-a.y));
      a.x+=Math.cos(angle)*dist;a.y+=Math.sin(angle)*dist;
      if(!active)continue;
      if(s.tick>=a.ready && (s.tick+index)%4===0){
        const i=danger(s,p.x,p.y,a.kind==='archon'?135:96,true);
        if(i>=0 && (a.kind!=='drone'||Math.hypot(s.bx[i]-a.x,s.by[i]-a.y)<136)){
          if(cast(s,a,i,tools))continue;
        }
      }
      if(s.tick<a.nextShot)continue;
      const target=enemy(s,a);
      if(!target)continue;
      const hit=(a.kind==='drone'?1.4*q.effects.droneDamage:a.kind==='archon'?.65:.5)*(a.slot==='wing'?1.45:1)*(1+.095*(a.stars-1)+.08*a.gear+.06*a.supply);
      a.damage+=Math.min(hit,target.hp);
      tools.hitFoe(s,target,hit);
      a.nextShot=s.tick+(a.kind==='drone'?23:43);
      mark(a,'shot',s.tick,target.x,target.y);
    }
    q.wasFocus=p.focus;
  }
  function fieldSpeed(s,i) {
    const f=s.party.field;
    if(!f||s.bsize[i]===5||Math.abs(s.bx[i]-f.x)>f.radius||Math.abs(s.by[i]-f.y)>f.radius)return 1;
    if((s.bx[i]-f.x)**2+(s.by[i]-f.y)**2>f.radius*f.radius)return 1;
    if(f.lineage==='gravity'){
      const a=s.ba[i],toward=Math.atan2(f.y-s.by[i],f.x-s.bx[i]);
      const delta=Math.atan2(Math.sin(toward-a),Math.cos(toward-a));
      s.ba[i]+=clamp(delta,-.018,.018);return 1;
    }
    return f.lineage==='time'?1-f.strength:1;
  }
  function contact(s,i,x,y,r) {
    const q=s.party,p=s.player,w=q.ward;
    if(w&&s.bsize[i]!==5){
      const dx=x-w.x,dy=y-w.y,D=w.radius+r;
      if(dx*dx+dy*dy<=D*D){
        w.owner.blocks++;q.guardTick=s.tick;
        if(--w.capacity<=0)q.ward=null;
        const vx=Math.cos(s.ba[i])*s.bs[i]/60,vy=Math.sin(s.ba[i])*s.bs[i]/60;
        const t=clamp(((p.x-x)*vx+(p.y-y)*vy)/(vx*vx+vy*vy||1),0,45);
        const saved=Math.hypot(x+t*vx-p.x,y+t*vy-p.y)<=r*s.rules.hitScale+p.r+1;
        if(w.owner.slot==='rear'&&saved&&s.tick>=p.invulnerableUntil&&p.hp>0&&p.hp<p.maxHp&&++q.rescue>=3){
          q.rescue=0;p.hp++;q.extends++;if(s.events.length<48)s.events.push('extend');
        }
        return true;
      }
    }
    if(s.bsize[i]===5)return false;
    for(const a of q.allies){
      if(a.reform||s.tick<a.invuln)continue;
      if((x-a.x)**2+(y-a.y)**2>(r+4)**2)continue;
      a.integrity--;a.invuln=s.tick+80;
      if(a.integrity<=0){a.reform=s.tick+Math.round(240*q.effects.reformTime);a.disabled++;a.action=null;}
      return true;
    }
    return false;
  }
  function finish(s) {
    const q=s.party,p=s.player,hurt=s.hits>q.hits;
    if(hurt){
      q.laserRead=null;q.boostUntil=0;
      if(!q.auto)q.recoverUntil=s.tick+60;
    }
    let cleanRead=false;
    if(q.laserRead){
      const w=q.laserRead,l=w.line;
      if(!s.lasers.includes(l)||q.auto||w.hits!==s.hits||w.bombs!==s.bombsUsed)q.laserRead=null;
      else if(l.age>=l.warn){
        cleanRead=Math.hypot(w.x-p.x,w.y-p.y)>=16&&rayDistance(l,p.x,p.y)>l.width*.5+p.r+4;
        q.laserRead=null;
      }
    }
    if(!q.auto&&!hurt&&s.tick>=p.invulnerableUntil&&s.tick>=q.rewardNext&&s.tick-q.guardTick>18&&
        (cleanRead||(s.graze>q.grazes&&s.tick-q.lastMove<=8))){
      q.evades++;q.boostUntil=s.tick+180+Math.round(60*q.effects.evadeSeconds);q.rewardNext=s.tick+42;
    }
    q.grazes=s.graze;q.hits=s.hits;
  }
  function draw(ctx,s,sprites) {
    const q=s.party;
    if(!q||s.stage==='lost'||s.stage==='won')return;
    ctx.save();ctx.lineWidth=1.2;
    function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
    if(q.field){ctx.strokeStyle='#906da6';ctx.globalAlpha=.7;circle(q.field.x,q.field.y,q.field.radius);}
    if(q.ward){ctx.strokeStyle='#d3a738';ctx.globalAlpha=.8;circle(q.ward.x,q.ward.y,q.ward.radius);}
    if(q.boostUntil>s.tick||q.recoverUntil>s.tick){
      ctx.strokeStyle=q.recoverUntil>s.tick?'#a94842':'#edc877';ctx.globalAlpha=.8;
      ctx.beginPath();ctx.arc(s.player.x,s.player.y,12,-Math.PI/2,Math.PI*1.5);ctx.stroke();
    }
    for(const a of q.allies){
      if(a.reform)continue;
      const key=a.kind==='archon'?{time:'archon',gravity:'archonGravity',neural:'archonNeural'}[q.lineage]:a.kind;
      const col=colours[a.kind],img=sprites&&(sprites[key]||sprites[a.kind]);
      ctx.globalAlpha=s.tick<a.invuln?.58:.9;
      if(img && img.complete && img.naturalWidth){
        const size=a.kind==='drone'?38:43,ratio=img.naturalWidth/img.naturalHeight,h=size/Math.max(1,ratio),w=h*ratio;
        ctx.drawImage(img,a.x-w/2,a.y-h/2,w,h);
      }else{
        ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(a.x,a.y-9);ctx.lineTo(a.x+8,a.y+4);ctx.lineTo(a.x-8,a.y+4);ctx.closePath();ctx.fill();
      }
      if(a.action&&a.action.until>s.tick){
        ctx.globalAlpha=.5*(a.action.until-s.tick)/(a.action.until-a.action.from);
        ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.action.x,a.action.y);ctx.stroke();
      }
    }
    ctx.restore();
  }
  const api={create,refit,checkpoint,restore,steer,update,fieldSpeed,contact,finish,draw};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HapilArcadeParty=api;
})(typeof globalThis==='object'?globalThis:this);
