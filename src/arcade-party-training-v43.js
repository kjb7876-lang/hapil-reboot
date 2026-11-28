/* A single pilot and their autonomous companions; fixed 60 Hz battle simulation. */
(function (root) {
  'use strict';
  const W = 360, H = 520, FPS = 60, DT = 1 / FPS;
  const SHIELD_RADIUS = 66, SHIELD_TIME = 1.35, HIT_RADIUS = 3;
  const HERO_NAMES = {memory:'기억사수', seoha:'수련생 윤서하', awakened:'각성 윤서하'};
  const KINDS = {archon:'아르콘', drone:'드론', angel:'천사', archer:'성궁수'};
  const angelRecovery = '후방에서 탄을 막거나 다친 영웅을 전투 중 8초간 지키면 치유 1점. 3점으로 목숨 1 회복. 헬에서는 스테이지당 한 번';
  const POSITIONS = {front:[0,-67], wing:[64,-17], rear:[-40,26]};
  const RULES = {gentle:{lives:5,bombs:3,period:1.22,speed:.85,rank:2},normal:{lives:3,bombs:2,period:1,speed:1,rank:3},hell:{lives:2,bombs:1,period:.88,speed:1.12,rank:4}};
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const round = x => Math.round(x * 100) / 100;
  const integer = (x,lo,hi) => clamp(Math.trunc(Number(x)||0),lo,hi);
  const automated = p => p.bot || p.auto;

  function describe(c) {
    if (!c || !KINDS[c.kind]) return '';
    const position = {front:'전방 · 고유 지원 재사용 25% 단축',wing:'측면 · 기본 사격 피해 45% 증가',rear:'후방 · 권능 충전 20% 가속'}[c.slot] || '';
    const role = {archon:'전방에서 탄과 조준 기술을 대신 막고 계약 권능 사용',drone:'다가오는 적탄을 조준해 요격',
      archer:'적을 조준해 지속 사격 · 후방에서 화살 피해 60% 증가',angel:'권능 충전을 돕고 실제 엄호 시 게이지 회복'}[c.kind];
    const reading = c.slot === 'front' ? {archon:' · 자동 회피 장거리 예측',drone:' · 자동 회피 중거리 예측',angel:' · 자동 회피 근거리 예측',archer:' · 자동 회피 근거리 예측'}[c.kind] : '';
    return (position ? position + reading + '. ' : '') + role + (c.kind==='angel' && c.slot==='rear'?' · '+angelRecovery:'') + '.';
  }
  function makeActor(slot,x,y) {
    return {id:String(slot),slot,x,y,alive:true,bot:slot>0,auto:false, hits:0,evades:0,assists:0,bombsUsed:0,autoBombs:0,dmg:0,boost:0,invuln:0,
      respawn:0,recovery:0,focus:false,shotCd:.1+slot*.12,travel:0,moveTick:-60,unsafeTick:-1,shotsFired:0,distortions:0,
      casts:0,intercepts:0,blocks:0,rescues:0,disruptions:0,slowed:0,redirected:0,delayed:0};
  }
  // The previous training build already saved live flights. Their projectiles,
  // remaining stocks and cooldowns can be retained while adding the new counters.
  function restoreRoles(s) {
    if (!s) return s;
    s.boons.archerDamage ??= 1;
    for (const p of s.allies) {
      p.guards ??= 0; p.skillBlocks ??= 0; p.chargeGranted ??= 0;
      if (p.kind === 'angel') p.careTicks ??= 0;
      if (p.kind === 'archer') p.chargedArrow ??= false;
      if (p.kind === 'archon') {
        p.maxIntegrity = 2 + Math.floor((p.stars - 1) / 3) + (p.position === 'front' ? 2 : 0);
        p.integrity ??= p.alive ? p.maxIntegrity : 0;
        p.guardReady ??= 0;
        p.excessWounds ??= 0;
      }
    }
    return s;
  }
  function carryCompanions(s) {
    const result={...s.bench};
    for (const p of s.allies) {
      result[p.kind]={reform:p.respawn,cooldown:p.cooldown,invuln:p.invuln,shot:p.shotCd,
        guard:Math.max(0,(p.guardReady||0)-s.tick),wounds:p.kind==='archon'?p.maxIntegrity-p.integrity+p.excessWounds:0};
      if (p.kind==='angel') result.angel.careTicks=p.careTicks;
    }
    return result;
  }
  function deployCompanions(s, previous) {
    const duration=(value,max,initial=0)=>Number.isFinite(value)?clamp(value,0,max):initial;
    s.bench={};
    if (!previous) return;
    for (const kind of Object.keys(KINDS)) {
      const prior=previous[kind];
      if (!prior || typeof prior!=='object') continue;
      const p=s.allies.find(a=>a.kind===kind);
      if (!p) {s.bench[kind]={...prior};continue;}
      p.respawn=duration(prior.reform,4);p.alive=p.respawn<=0;
      p.cooldown=duration(prior.cooldown,9,p.cooldown);
      p.invuln=duration(prior.invuln,2);p.shotCd=duration(prior.shot,1,p.shotCd);
      if (kind==='angel') p.careTicks=integer(prior.careTicks,0,8*FPS-1);
      if (kind==='archon') {
        p.guardReady=integer(prior.guard,0,150);
        const wounds=integer(prior.wounds,0,6);
        p.integrity=p.alive?Math.max(1,p.maxIntegrity-wounds):0;
        p.excessWounds=Math.max(0,wounds-(p.maxIntegrity-p.integrity));
      }
    }
  }
  function create(config={}) {
    const heroKey = HERO_NAMES[config.hero] ? config.hero : 'memory';
    const diffKey = config.difficulty === 'easy' ? 'gentle' : config.difficulty;
    const difficulty = RULES[diffKey] ? diffKey : 'normal', rules=RULES[difficulty];
    const hero=Object.assign(makeActor(0,W*.5,H*.81),{hero:heroKey,kind:'hero',name:HERO_NAMES[heroKey],lives:rules.lives,bombs:rules.bombs,
      maxLives:rules.lives,attackLevel:1,bombLevel:1,fragments:0,bombHeld:false,bombQueued:false,powerHeld:false,powerQueued:false});
    if(config.carry){
      const c=config.carry;
      hero.lives=integer(c.lives,1,rules.lives);
      hero.bombs=integer(c.bombs,0,rules.bombs);
      hero.fragments=integer(c.fragments,0,2);
    }
    const boons={droneDamage:1,archonCooldown:1,wardCapacity:0,powerCharge:1,reformTime:1,evadeSeconds:0,...config.boons};
    const defaults=[{kind:'archon',slot:'front'},{kind:'drone',slot:'wing'},{kind:'angel',slot:'rear'}];
    const lineup=Array.isArray(config.companions)?config.companions:defaults;
    const allies=[], slots=new Set(), kinds=new Set();
    for (const c of lineup) {
      if (!c || !KINDS[c.kind] || !POSITIONS[c.slot] || slots.has(c.slot) || kinds.has(c.kind)) continue;
      slots.add(c.slot); kinds.add(c.kind);
      const offset=POSITIONS[c.slot],slot=allies.length+1;
      allies.push(Object.assign(makeActor(slot,hero.x+offset[0],hero.y+offset[1]),{kind:c.kind,hero:c.kind,name:KINDS[c.kind],position:c.slot,
        stars:integer(c.stars||1,1,7),gear:integer(c.gear,0,2),supply:integer(c.supply,0,3),cooldown:c.kind==='archon'?3:1.5,link:false}));
    }
    const stage=[40,41,42].includes(config.stage)?config.stage:42;
    const maxHp=Math.round(({40:255,41:370,42:550})[stage]*(difficulty==='gentle'?.85:difficulty==='hell'?1.08:1));
    const lineage=['time','gravity','neural'].includes(config.lineage)?config.lineage:'time';
    const charge=Number.isFinite(config.carry?.charge)?clamp(config.carry.charge,0,100):100;
    const seed=((config.seed==null?8243:config.seed)>>>0)||1;
    // Vary the opening flank and the crossing angle while retaining the stage's readable cadence.
    const opening=config.expedition ? {side:(seed & 1)?1:-1,offset:((seed>>>5)%17)-8} : {side:1,offset:0};
    const s=restoreRoles({w:W,h:H,stage,difficulty,rules,boons,opening,tick:0,time:0,remaining:0,serial:0,rng:seed,
      phase:'battle',hero,allies,players:[hero,...allies],boss:{x:W/2,y:84,targetX:W/2,hp:maxHp,maxHp,alive:true},
      power:{charge,max:100,ready:charge>=100,used:0,autoUsed:0,lineage,active:0,policy:config.powerPolicy==='manual'?'manual':'danger'},linkUsed:false,
      bullets:[],shots:[],warnings:[],fields:[],effects:[],volleys:[],nextTarget:0});
    deployCompanions(s,config.carry?.companions);
    return s;
  }
  function random(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
  function effect(s, kind, obj, slot, duration) {
    s.effects.push({id: ++s.serial, kind, x: obj.x, y: obj.y, slot, life: duration, duration});
  }
  function damageBoss(s, amount, p) {
    const boss = s.boss;
    if (!boss.alive) return;
    const dealt = Math.min(boss.hp, amount);
    boss.hp -= dealt; p.dmg += dealt;
    if (boss.hp <= .001) {
      boss.hp = 0; boss.alive = false; s.warnings.length = 0;
      effect(s, 'bossDown', boss, p.slot, 1.2);
    }
  }

  function field(s,kind,p,x,y,r,duration,capacity) {
    const f={id:++s.serial,kind,slot:p.slot,x,y,r,duration,timeLeft:duration,capacity};
    s.fields.push(f);return f;
  }
  function bomb(s,p,automatic) {
    if (!p.alive||p.respawn>0||p.bombs<=0) return;
    p.bombs--;p.bombsUsed++;if (automatic) p.autoBombs++;
    p.invuln=Math.max(p.invuln,2.5);
    field(s,'bomb',p,p.x,p.y,SHIELD_RADIUS,SHIELD_TIME,999);
    effect(s,automatic?'autoBomb':'bomb',p,p.slot,.8);damageBoss(s,5,p);
  }
  function hurt(s,p) {
    if(!p.alive||p.invuln>0)return;
    if(p.bot){
      // The tank can hold the lane until its finite integrity is exhausted.
      if(p.kind==='archon' && --p.integrity>0){p.hits++;p.invuln=.8;return;}
      p.hits++;p.disruptions++;p.respawn=2.6*s.boons.reformTime;p.alive=false;
      effect(s,'disrupt',p,p.slot,.7);return;
    }
    if(p.hero==='memory'&&random(s)<.07){p.distortions++;p.invuln=.5;return;}
    p.hits++;p.boost=0;if(!p.auto)p.recovery=1;
    if(s.difficulty!=='hell'&&p.bombs>0){bomb(s,p,true);return;}
    p.lives--;p.alive=p.lives>0;effect(s,p.alive?'hurt':'out',p,0,1);
    if(!p.alive){s.phase='lost';return;}
    p.bombs=Math.max(p.bombs,s.rules.bombs);p.invuln=3.25;p.respawn=.5;p.x=W*.5;p.y=H*.84;
  }
  function warn(s, kind, side, target, lead, cross) {
    const x = s.boss.x + (kind === 'rank' ? side * 22 : 0), y = s.boss.y + 26;
    const aimX = kind === 'aim' ? target.x : W * (.5 - side * (cross ? .16 : .04)) + s.opening.offset;
    const aimY = kind === 'aim' ? target.y : H * .84;
    const cue = {id: ++s.serial, x, y, angle: Math.atan2(aimY - y, aimX - x), kind,
      targetSlot: target ? target.slot : -1, timeLeft: lead, lead, side};
    if (kind === 'aim' && !automated(target) && target.invuln <= 0) {
      cue.read = {tick: s.tick, hits: target.hits, travel: target.travel, targetSlot: target.slot,
        x, y, angle: cue.angle, range: Math.hypot(aimX - x, aimY - y), checked: false, clear: false};
    }
    s.warnings.push(cue);
  }

  function command(s) {
    if(!s.boss.alive)return;
    const cycle=Math.round(({40:173,41:146,42:132})[s.stage]*s.rules.period);
    const t=s.tick-39;if(t<0)return;
    const turn=Math.floor(t/cycle),beat=t%cycle,side=(turn%2?1:-1)*s.opening.side;
    if(beat===0)warn(s,'rank',side,null,.65,turn>0);
    if(s.stage>=41 && beat===Math.round(cycle*.29) && turn>0)warn(s,'rank',-side,null,.6,true);
    if(beat===Math.round(cycle*.74))s.boss.targetX=W*(.5+side*(s.stage===40?.09:.16));
    if(beat===Math.round(cycle*.56)&&s.stage>=41){
      const hero=s.hero;
      if(hero.alive && hero.respawn<=0)warn(s,'aim',0,hero,.7,true);
    }
  }
  function launch(s, w) {
    const rank = w.kind === 'rank';
    const volley = {id: w.id, tick: s.tick, read: w.read, marks: s.players.map(p => ({hits: p.hits, close: false, travel: p.travel}))};
    s.volleys.push(volley);
    const wings = rank ? s.rules.rank : 1;
    for (let i = -wings; i <= wings; i++) {
      const angle = w.angle + i * (rank ? .075 : .12), speed = (rank ? 104 : 157)*s.rules.speed;
      s.bullets.push({id: ++s.serial, x: w.x + (rank ? i * 9 : 0), y: w.y - (rank ? Math.abs(i) * 5 : 0),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: rank ? 4 : 4.5, kind: w.kind,
        side: w.side, targetSlot: w.targetSlot, volley: w.id, leader: !rank && i === 0});
    }
  }

  function strength(p) {return 1+(p.stars-1)*.095+p.gear*.08+p.supply*.06;}
  function fire(s,p) {
    if(!s.boss.alive)return;
    const b=s.boss, spread=p.kind==='archer'?.008:p.hero==='seoha'&&!p.focus?.09:.035;
    const aimLimit=p.bot?(p.kind==='archer'?1.1:p.kind==='drone'?.67:.43):.23;
    const a=-Math.PI/2+clamp(Math.atan2(b.x-p.x,p.y-b.y),-aimLimit,aimLimit)+(p.shotsFired++%2?-1:1)*spread;
    const boost=!automated(p)&&p.boost>0;
    const slotBonus=p.kind==='archer'&&p.position==='rear'?1.6:p.position==='wing'?1.45:1;
    const damage=p.bot?({archon:1.1,drone:1.9*s.boons.droneDamage,angel:.75,archer:3.15*s.boons.archerDamage}[p.kind])*strength(p)*slotBonus:(boost?3:2);
    const doubled=p.kind==='archer'&&p.chargedArrow;
    if(doubled)p.chargedArrow=false;
    s.shots.push({id:++s.serial,x:p.x,y:p.y-12,vx:Math.cos(a)*420,vy:Math.sin(a)*420,slot:p.slot,kind:p.kind,boost:boost||doubled,damage:damage*(doubled?2:1)});
  }
  function anchor(s,p) {
    if(!p.bot)return {x:s.boss.x,y:H*.81};
    const d=POSITIONS[p.position];
    const flank=p.position==='wing' && s.hero.x>W*.72 ? -1:1;
    return {x:clamp(s.hero.x+d[0]*flank,14,W-14),y:clamp(s.hero.y+d[1],125,H-15)};
  }
  // Evaluate a short flight in each direction. A pilot on automatic needs the formation to read farther ahead.
  const DIRS=[[0,0],[1,0],[-1,0],[0,-1],[0,1],[.707,-.707],[-.707,-.707],[.707,.707],[-.707,.707]];
  function pilotHorizon(front) {
    if(!front)return .07;
    return {archon:.22,drone:.13,angel:.085,archer:.085}[front.kind]+(front.stars-1)*.008;
  }
  function autoMove(s,p) {
    const goal=anchor(s,p);
    // Step into the predicted path in front of the pilot. Off-axis fire still passes.
    if(p.kind==='archon' && p.position==='front' && s.tick>=p.guardReady && !p.invuln){
      const b=threat(s,s.hero,1);
      if(b&&b.vy>10&&b.y<=goal.y+20){
        const at=(goal.y-b.y)/b.vy;
        const x=b.x+b.vx*Math.max(0,at);
        if(Math.abs(x-goal.x)<42) return {dx:clamp((x-p.x)/10,-1,1),dy:clamp((goal.y-p.y)/10,-1,1)};
      }
    }
    const front=s.allies.find(a=>a.position==='front'&&a.alive);
    const reach=p.bot ? .25+(p.stars-1)*.014 : pilotHorizon(front);
    const stride=p.bot?19:23;
    const near=s.bullets.filter(b=>Math.abs(b.x-p.x)<=58&&Math.abs(b.y-p.y)<=80).map(b=>{
      let rate=1;
      for(const f of s.fields)if(f.kind==='time'&&dist(f,b)<f.r)rate=Math.min(rate,f.factor);
      return {x:b.x,y:b.y,vx:b.vx*rate,vy:b.vy*rate};
    });
    let best=-Infinity,pick=DIRS[0];
    for(const d of DIRS){
      const x=clamp(p.x+d[0]*stride,10,W-10),y=clamp(p.y+d[1]*stride,110,H-12);
      let score=-Math.abs(x-goal.x)*.11-Math.abs(y-goal.y)*.10-Math.hypot(...d)*.45;
      for(const b of near){
        for(const fraction of [.45,1]){
          const dt=reach*fraction;
          const gap=Math.hypot(b.x+b.vx*dt-(p.x+(x-p.x)*fraction),b.y+b.vy*dt-(p.y+(y-p.y)*fraction));
          score-=Math.max(0,(p.bot?19:front?17:11)-gap)*1.25;
        }
      }
      if(score>best){best=score;pick=d;}
    }
    return {dx:pick[0],dy:pick[1]};
  }
  function incoming(b,p,horizon,margin=7) {
    const speed2=b.vx*b.vx+b.vy*b.vy;
    const t=((p.x-b.x)*b.vx+(p.y-b.y)*b.vy)/(speed2||1);
    return t>=0&&t<=horizon&&Math.hypot(b.x+b.vx*t-p.x,b.y+b.vy*t-p.y)<=b.r+margin ? t:Infinity;
  }
  function threat(s,p,horizon,smallOnly=false) {
    let closest=null,when=Infinity;
    for(const b of s.bullets){
      if(smallOnly && b.leader)continue;
      const t=incoming(b,p,horizon);
      if(t<when){closest=b;when=t;}
    }
    return closest;
  }
  function lineEffect(s,kind,p,target) {
    effect(s,kind,p,p.slot,.6);
    Object.assign(s.effects[s.effects.length-1],{endX:target.x,endY:target.y});
  }
  function rewardRescue(s,owner) {
    const h=s.hero;
    if(!h.alive||!h.lives||!owner.alive||owner.kind!=='angel')return;
    const charge=Math.min(8,s.power.max-s.power.charge);
    if(charge>0){
      s.power.charge+=charge;owner.chargeGranted+=charge;
      s.power.ready=s.power.charge>=s.power.max;lineEffect(s,'charge',owner,h);
    }
    grantHealingPoint(s,owner);
  }
  function grantHealingPoint(s,owner) {
    const h=s.hero;
    if(!h.alive||h.lives<=0||owner.position!=='rear'||!owner.alive||h.lives>=h.maxLives||(s.difficulty==='hell'&&owner.rescues>=1))return;
    if(++h.fragments<3)return;
    h.fragments=0;h.lives++;owner.rescues++;lineEffect(s,'heal',owner,h);
    if(h.lives===h.maxLives||s.difficulty==='hell')owner.careTicks=0;
  }
  function tendPilot(s,angel) {
    const h=s.hero;
    if(h.lives>=h.maxLives) {
      h.fragments=0;
      if(angel)angel.careTicks=0;
      if(s.bench?.angel)s.bench.angel.careTicks=0;
      return;
    }
    if(!s.boss.alive||!h.alive||!h.lives||h.respawn>0||!angel||angel.position!=='rear'||
       !angel.alive||angel.respawn>0||(s.difficulty==='hell'&&angel.rescues>=1))return;
    if(++angel.careTicks===8*FPS){angel.careTicks=0;grantHealingPoint(s,angel);}
  }
  function protect(s,f,b) {
    if((f.kind!=='barrier'&&f.kind!=='bomb')||f.capacity<=0||dist(f,b)>f.r+b.r)return false;
    f.capacity--;
    if(f.kind==='barrier'){
      const p=s.players[f.slot];p.blocks++;
      if(s.hero.alive&&s.hero.invuln<=0&&incoming(b,s.hero,.75,HIT_RADIUS+1)!==Infinity){
        p.assists++;rewardRescue(s,p);lineEffect(s,'assist',p,s.hero);
      }
    }
    return true;
  }
  function adjustments(s,b) {
    let rate=1;
    for(const f of s.fields){
      if((f.kind!=='time'&&f.kind!=='gravity')||dist(f,b)>f.r)continue;
      const caster=s.players[f.slot];
      if(f.kind==='time'){
        rate=Math.min(rate,f.factor);
        if(b.lastSlow!==f.id){b.lastSlow=f.id;caster.slowed++;}
      }else{
        const dx=f.x-b.x,dy=f.y-b.y,r=Math.max(18,Math.hypot(dx,dy));
        b.vx=clamp(b.vx+dx/r*f.pull*DT,-178,178);
        if(b.lastPull!==f.id){b.lastPull=f.id;caster.redirected++;}
      }
    }
    return rate;
  }
  function activate(s,p,active,linked=false) {
    const h=s.hero,kind=s.power.lineage;
    const duration=(active?2.4:1.35)+(linked?.65:0);
    let target;
    if(kind==='neural'){
      const w=s.warnings.find(w=>!w.delayed);
      if(!w)return false;
      const delay=(active?1.1:.55)+(linked?.45:0);
      w.timeLeft+=delay;w.lead+=delay;w.delayed=true;p.delayed++;
      target=w;
    }else{
      const x=kind==='gravity'?clamp(h.x+(h.x>W/2?84:-84),20,W-20):h.x;
      const f=field(s,kind,p,x,Math.max(96,h.y-(active?63:82)),active?150:97,duration,0);
      f.factor=active?.48:.64;f.pull=(active?112:74)*(linked?1.35:1);target=f;
    }
    p.casts++;lineEffect(s,active?'power':'control',p,target);
    if(active)s.power.active=duration;
    return true;
  }
  function usePower(s) {
    if(s.power.charge<100||!s.hero.alive||s.hero.respawn>0||!s.boss.alive)return false;
    const archon=s.allies.find(p=>p.kind==='archon'&&p.alive);
    const drone=s.allies.find(p=>p.kind==='drone'&&p.alive);
    const angel=s.allies.find(p=>p.kind==='angel'&&p.alive);
    const linked=!s.linkUsed&&archon&&drone&&(archon.stars===7||drone.stars===7);
    const sanctuary=!s.linkUsed&&!linked&&angel&&angel.stars===7&&s.allies.some(p=>p!==angel&&p.alive);
    const source=archon||s.hero;
    // A neural command entered between tells is held for the next announced volley.
    if(!activate(s,source,true,linked))return false;
    if(linked){s.linkUsed=true;source.link=true;lineEffect(s,'link',source,drone);}
    else if(sanctuary){
      s.linkUsed=true;angel.link=true;angel.casts++;
      field(s,'barrier',angel,s.hero.x,s.hero.y-12,49,1.7,2+s.boons.wardCapacity);
      lineEffect(s,'link',angel,s.hero);
    }else if(!s.linkUsed){
      const archer=s.allies.find(p=>p.kind==='archer'&&p.alive&&p.stars===7);
      if(archer&&s.allies.some(p=>p!==archer&&p.alive)){
        s.linkUsed=true;archer.link=true;archer.chargedArrow=true;lineEffect(s,'link',archer,s.hero);
      }
    }
    s.power.charge=0;s.power.ready=false;s.power.used++;return true;
  }
  function support(s,p) {
    if(!s.boss.alive&& !s.bullets.length)return;
    const h=s.hero;
    if(!h.alive||p.cooldown>0||p.kind==='archer')return;
    const near=threat(s,h,p.kind==='angel'?.7:1.55,p.kind==='drone');
    const cadence=(p.position==='front'?.75:1)/(1+(p.stars-1)*.048+p.gear*.04+p.supply*.025);
    if(p.kind==='archon'){
      if((near||s.warnings.length)&&activate(s,p,false))p.cooldown=8*cadence*s.boons.archonCooldown;
    }else if(p.kind==='drone'){
      if(!near||dist(near,p)>132+3*p.stars||s.fields.some(f=>f.kind==='barrier'&&f.capacity>0&&dist(f,h)<f.r))return;
      s.bullets.splice(s.bullets.indexOf(near),1);
      p.casts++;p.intercepts++;p.assists++;lineEffect(s,'intercept',p,near);p.cooldown=2.1*cadence;
    }else if(near&&h.invuln<=0&&dist(h,p)<120){
      field(s,'barrier',p,h.x,h.y-12,35+p.stars*1.2,1.15,(p.position==='rear'?2:1)+s.boons.wardCapacity);
      p.casts++;lineEffect(s,'barrier',p,h);p.cooldown=8.5*cadence;
    }
  }
  function guard(s,tank,b){
    if(!tank||!tank.alive||tank.invuln>0||s.hero.invuln>0||s.tick<tank.guardReady||tank.y>=s.hero.y-8||b.y>s.hero.y)return false;
    if(Math.abs(b.x-tank.x)>20+b.r||Math.abs(b.y-tank.y)>18+b.r||incoming(b,s.hero,1,HIT_RADIUS+2)===Infinity)return false;
    tank.guardReady=s.tick+150;tank.guards++;
    if(b.leader)tank.skillBlocks++;
    lineEffect(s,'guard',tank,b);hurt(s,tank);
    return true;
  }
  // The centre spear has to reach the pilot's depth. Clearing all three rays early counts as a read.
  function checkAimedDodge(s, read, bullet) {
    if (read.checked) return;
    const p = s.players[read.targetSlot], ux = Math.cos(read.angle), uy = Math.sin(read.angle);
    const dx = p.x - read.x, dy = p.y - read.y;
    const progress = (bullet.x - read.x) * ux + (bullet.y - read.y) * uy;
    if (progress < Math.max(read.range, dx * ux + dy * uy)) return;
    read.checked = true;
    if (p.travel - read.travel < 18 || p.unsafeTick >= read.tick || p.hits !== read.hits) return;
    read.clear = [-.12, 0, .12].every(offset => {
      const a = read.angle + offset;
      return Math.abs(dx * Math.sin(a) - dy * Math.cos(a)) > bullet.r + HIT_RADIUS + 5;
    });
  }

  function tick(s,controls) {
    s.tick++;s.time=s.tick*DT;
    const h=s.hero;
    h.auto=controls.auto===true;
    const rear=s.allies.some(p=>p.alive&&p.position==='rear');
    const medic=s.allies.find(p=>p.kind==='angel');
    const angel=medic?.alive ? medic : null;
    const flow=(rear?1.2:1)*s.boons.powerCharge*6*DT;
    const beforeBonus=Math.min(s.power.max,s.power.charge+flow);
    s.power.charge=Math.min(s.power.max,beforeBonus+(angel?flow*.2:0));
    if(angel)angel.chargeGranted+=s.power.charge-beforeBonus;
    tendPilot(s,medic);
    s.power.ready=s.power.charge>=100;s.power.active=Math.max(0,s.power.active-DT);
    for(const p of s.players){
      p.invuln=Math.max(0,p.invuln-DT);p.respawn=Math.max(0,p.respawn-DT);
      p.recovery=Math.max(0,p.recovery-DT);p.boost=automated(p)?0:Math.max(0,p.boost-DT);
      if(p.bot){
        p.cooldown=Math.max(0,p.cooldown-DT);
        if(!p.alive&&p.respawn<=0){
          p.alive=true;if(p.kind==='archon'){p.integrity=p.maxIntegrity;p.excessWounds=0;}
          const goal=anchor(s,p);p.x=goal.x;p.y=goal.y;p.invuln=1.15;effect(s,'reform',p,p.slot,.6);
        }
      }
      if(!p.alive||p.respawn>0)continue;
      // A given AI formation makes one steering decision per 6 ticks; a weak automatic pilot reacts less often.
      const leader=s.allies.find(a=>a.position==='front'&&a.alive);
      const reaction=p.bot?6:leader?{archon:8,drone:17,angel:23,archer:23}[leader.kind]:26;
      if(automated(p) && (!p.steer||s.tick%reaction===p.slot)){
        p.steer=autoMove(s,p);
      }
      const input=automated(p)?p.steer:controls;
      if(!automated(p))p.steer=null;
      p.focus=!!input.focus;
      const dx=clamp(Number(input.dx)||0,-1,1),dy=clamp(Number(input.dy)||0,-1,1);
      const speed=(p.bot?145:p.focus?85:160)/Math.max(1,Math.hypot(dx,dy));
      const x=clamp(p.x+speed*dx*DT,9,W-9),y=clamp(p.y+speed*dy*DT,108,H-12);
      const moved=Math.hypot(x-p.x,y-p.y);
      if(moved>.1)p.moveTick=s.tick;
      p.travel+=moved;p.x=x;p.y=y;
      if(!p.bot&&p.bombQueued)bomb(s,p,false);
      p.shotCd-=DT;
      if(p.shotCd<=0){
        if(p.recovery<=0)fire(s,p);
        p.shotCd=p.recovery>0?0:p.shotCd+(p.bot?{archon:.68,drone:.55,angel:.85,archer:.53}[p.kind]:.22);
      }
    }
    h.bombQueued=false;
    if(s.boss.alive)s.boss.x+=(s.boss.targetX-s.boss.x)*.035;
    command(s);
    if(h.powerQueued && usePower(s))h.powerQueued=false;
    if(h.auto&&s.power.policy==='danger'&&s.power.ready&&h.invuln<=0&&s.tick%6===0
      &&!s.fields.some(f=>f.kind==='barrier'&&f.capacity>0&&dist(f,h)<f.r)
      &&threat(s,h,.85) && usePower(s))s.power.autoUsed++;
    for(const p of s.allies)if(p.alive)support(s,p);
    for(const w of s.warnings){w.timeLeft-=DT;if(w.timeLeft<=0)launch(s,w);}
    s.warnings=s.warnings.filter(w=>w.timeLeft>0);
    s.shots=s.shots.filter(b=>{
      b.x+=b.vx*DT;b.y+=b.vy*DT;
      if(s.boss.alive&&Math.hypot(b.x-s.boss.x,b.y-s.boss.y)<25){
        damageBoss(s,b.damage,s.players[b.slot]);effect(s,'impact',b,b.slot,.12);return false;
      }
      return b.y>=-12&&b.x>-12&&b.x<W+12;
    });
    const volleys=new Map(s.volleys.map(v=>[v.id,v]));
    const tank=s.allies.find(a=>a.kind==='archon'&&a.position==='front');
    s.bullets=s.bullets.filter(b=>{
      const rate=adjustments(s,b);b.x+=b.vx*DT*rate;b.y+=b.vy*DT*rate;
      if(s.fields.some(f=>protect(s,f,b)))return false;
      if(guard(s,tank,b))return false;
      const v=volleys.get(b.volley);
      if(b.leader&&v&&v.read)checkAimedDodge(s,v.read,b);
      for(const p of s.players){
        if(!p.alive||p.respawn>0)continue;
        const gap=dist(p,b);
        if(gap<=b.r+HIT_RADIUS&&p.invuln<=0){hurt(s,p);return false;}
        if(v&&!automated(p)&&p.invuln<=0&&s.tick-p.moveTick<=18&&gap<b.r+HIT_RADIUS+13)v.marks[p.slot].close=true;
      }
      return b.y<H+12&&b.y>-14&&b.x>-14&&b.x<W+14;
    });
    if(h.auto||!h.alive||h.invuln>0||s.fields.some(f=>['barrier','bomb'].includes(f.kind)&&dist(f,h)<=f.r))h.unsafeTick=s.tick;
    const flying=new Set(s.bullets.map(b=>b.volley));
    s.volleys=s.volleys.filter(v=>{
      if(flying.has(v.id))return true;
      const m=v.marks[0],graze=m.close&&h.hits===m.hits&&h.unsafeTick<v.tick&&h.travel-m.travel>=14;
      const read=v.read&&v.read.clear&&h.hits===v.read.hits&&h.unsafeTick<v.read.tick;
      if(h.alive&&!h.auto&&(graze||read)){h.evades++;h.boost=3+s.boons.evadeSeconds;effect(s,'evade',h,0,.65);}
      return false;
    });
    for(const f of s.fields)f.timeLeft-=DT;
    s.fields=s.fields.filter(f=>f.timeLeft>0&&(f.kind!=='barrier'||f.capacity>0));
    for(const e of s.effects)e.life-=DT;
    s.effects=s.effects.filter(e=>e.life>0);
    if(!h.alive)s.phase='lost';
    else if(!s.boss.alive&&!s.bullets.length)s.phase='won';
  }
  function step(s,input={},seconds=DT){
    if(s.phase!=='battle'||!Number.isFinite(seconds)||seconds<0)return s;
    const h=s.hero;
    if(input.bomb&&!h.bombHeld)h.bombQueued=true;
    if(input.power&&!h.powerHeld&&s.power.ready)h.powerQueued=true;
    h.bombHeld=!!input.bomb;h.powerHeld=!!input.power;
    s.remaining+=seconds;
    const frames=Math.floor((s.remaining+1e-9)*FPS);
    s.remaining=Math.max(0,s.remaining-frames*DT);
    for(let i=0;i<frames&&s.phase==='battle';i++)tick(s,input);
    return s;
  }
  function pick(obj, keys) {
    const view = {};
    for (const key of keys.split(' ')) view[key] = typeof obj[key] === 'number' ? round(obj[key]) : obj[key];
    return view;
  }

  function snapshot(s) {
    const players=s.players.map(p=>pick(p,'id slot name hero kind position stars gear supply bot auto x y alive lives maxLives bombs hits bombsUsed autoBombs evades assists dmg boost invuln respawn recovery focus attackLevel bombLevel fragments casts intercepts blocks rescues disruptions slowed redirected delayed link shotsFired guards skillBlocks chargeGranted integrity maxIntegrity'));
    return {w:W,h:H,time:round(s.time),tick:s.tick,stage:s.stage,difficulty:s.difficulty,phase:s.phase,hero:players[0],allies:players.slice(1),players,power:{...s.power},linkUsed:s.linkUsed,
      boss:pick(s.boss,'x y hp maxHp alive'),
      shots:s.shots.map(b=>pick(b,'id x y vx vy slot kind boost')),
      bullets:s.bullets.map(b=>pick(b,'id x y r vx vy kind side targetSlot')),
      warnings:s.warnings.map(w=>pick(w,'id x y angle kind targetSlot timeLeft lead side')),
      fields:s.fields.map(f=>pick(f,'id kind x y r timeLeft duration slot capacity')),
      effects:s.effects.map(e=>pick(e,'id kind x y slot life duration endX endY'))};
  }
  root.WingSim={create,step,snapshot,describe,restoreRoles,carryCompanions,angelRecovery};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.WingSim;
})(typeof window==='undefined'?globalThis:window);
