'use strict';
// Recording Canvas tests of source registration/geometry, not browser/GPU QA.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Renderer=require('../src/story-render.js');
const first8=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/story-assets/first-eight-r3.json'),'utf8'));
class Context{
 constructor(){this.records=[];this.stack=[];this.m=[1,0,0,1,0,0];this.globalAlpha=1;this.dash=[];}
 save(){this.stack.push({m:[...this.m],globalAlpha:this.globalAlpha,dash:[...this.dash],lineWidth:this.lineWidth,strokeStyle:this.strokeStyle,fillStyle:this.fillStyle});}
 restore(){assert(this.stack.length);Object.assign(this,this.stack.pop());}
 setTransform(...m){this.m=m;}
 translate(x,y){const m=this.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;}
 rotate(a){const [aa,b,c,d,e,f]=this.m,co=Math.cos(a),si=Math.sin(a);this.m=[aa*co+c*si,b*co+d*si,c*co-aa*si,d*co-b*si,e,f];}
 point(x,y){const m=this.m;return[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
 beginPath(){this.path=[];}
 moveTo(x,y){this.path.push(['M',...this.point(x,y)]);}
 lineTo(x,y){this.path.push(['L',...this.point(x,y)]);}
 arc(x,y,r,a,b){assert([x,y,r,a,b].every(Number.isFinite));this.path.push(['A',...this.point(x,y),r,a,b]);}
 closePath(){this.path.push(['Z']);}
 setLineDash(a){this.dash=[...a];}
 clip(){this.records.push({type:'clip',path:structuredClone(this.path)});}
 stroke(){this.records.push({type:'stroke',path:structuredClone(this.path),alpha:this.globalAlpha,width:this.lineWidth,color:this.strokeStyle,dash:[...this.dash]});}
 fill(){this.records.push({type:'fill',path:structuredClone(this.path),alpha:this.globalAlpha,color:this.fillStyle});}
 fillRect(...args){this.records.push({type:'rect',args,alpha:this.globalAlpha,color:this.fillStyle});}
 fillText(text,...args){this.records.push({type:'text',text,args});}
 drawImage(im,...args){assert(args.every(Number.isFinite));this.records.push({type:'image',key:im.id,args,m:[...this.m],alpha:this.globalAlpha});}
}
function fixture(body=first8.bodies[0]){
 const ctx=new Context();let width=0,height=0,writes=0;
 const canvas={style:{},getContext(){return ctx;},get width(){return width;},set width(v){width=v;writes++;},get height(){return height;},set height(v){height=v;writes++;}};
 const assets={fixtureShot:{id:'fixtureShot',complete:true,naturalWidth:256,naturalHeight:96},fixtureProjectile:{id:'fixtureProjectile',complete:true,naturalWidth:64,naturalHeight:64},fixturePlayer:{id:'fixturePlayer',complete:true,naturalWidth:512,naturalHeight:512},fixtureMap:{id:'fixtureMap',complete:true,naturalWidth:720,naturalHeight:904}};
 assets[body.key]={id:body.key,complete:true,naturalWidth:512,naturalHeight:512};
 const art={body,projectile:{key:'fixtureProjectile',drawWidth:10,drawHeight:10},playerKey:'fixturePlayer',shotKey:'fixtureShot',background:{key:'fixtureMap'},palette:{main:'#a855d5',secondary:'#e4d2b0'}};
 const renderer=Renderer.create(canvas,{assets});renderer.resize(360,640,1);
 return{ctx,canvas,assets,art,renderer,get writes(){return writes;},draw(w,spec={name:'Registered source body'}){ctx.records=[];const before=JSON.stringify(w),metrics=renderer.render(w,spec,art);assert.equal(JSON.stringify(w),before);assert.equal(ctx.stack.length,0);return {metrics,records:ctx.records};}};
}
function world(id=first8.bodies[0].combatId,extra={}){return Object.assign({combatId:id,tick:120,stageIndex:0,phase:0,cyclePhase:'windup',cyclePhaseAge:.2,player:{x:180,y:540,r:3,hp:3,maxHp:3},boss:{id:1,x:180,y:116,hp:800,maxHp:1000,lean:0},enemies:[],bullets:[],shots:[],effects:[],hazards:[]},extra);}
function registration(record,anchor,cell){const [sx,sy,sw,sh,dx,dy,dw,dh]=record.args,lx=dx+anchor[0]*dw/sw,ly=dy+anchor[1]*dh/sh,[a,b,c,d,e,f]=record.m;assert.equal(sw,cell);assert.equal(sh,cell);return[a*lx+c*ly+e,b*lx+d*ly+f];}

test('all eight unchanged source atlases have complete four-pose registration contracts',()=>{
 assert.equal(first8.bodies.length,8);assert.equal(first8.allRequiredFormsComplete,false);assert.equal(first8.physicalPivotsCertified,false);
 for(const b of first8.bodies){const data=fs.readFileSync(path.join(__dirname,'..',b.file));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),b.sha256);assert.equal(data.readUInt32BE(16),512);assert.equal(data.readUInt32BE(20),512);assert.equal(b.poses.length,4);assert(b.scale>0&&b.scale<=.7);}
});
test('missing required source art fails before drawing and never substitutes another boss',()=>{
 for(const key of ['body','projectile','player','shot']){const f=fixture();delete f.assets[key==='body'?f.art.body.key:key==='projectile'?'fixtureProjectile':key==='shot'?'fixtureShot':'fixturePlayer'];assert.throws(()=>f.draw(world()),e=>e.code==='MISSING_STORY_ART');assert.equal(f.ctx.records.length,0);}
 const f=fixture();assert.throws(()=>f.draw(world('wrong-boss')),e=>e.asset==='body-identity-wrong-boss');assert.equal(f.ctx.records.length,0);
});
test('every authored pose shares one identity scale and its registered torso remains at the combat point',()=>{
 for(const b of first8.bodies){const f=fixture(b);for(const [kind,age,index] of [['windup',.25,0],['active',.04,1],['active',.3,2],['recovery',.3,3]]){
  const w=world(b.combatId,{cyclePhase:kind,cyclePhaseAge:age});const {records,metrics}=f.draw(w);const sprite=records.find(r=>r.type==='image'&&r.key===b.key);assert(sprite);const p=b.poses[index];assert.deepEqual(sprite.args.slice(0,4),[(index%2)*256,Math.floor(index/2)*256,256,256]);assert.deepEqual(registration(sprite,p.anchor,256),[180,116]);assert.equal(sprite.args[6]/256,b.scale);assert.equal(metrics.bodyDraws,1);assert.equal(metrics.threadDraws,1);
 }}
});
test('short dissolves blend registered source poses and keep the silk attached to their interpolated sockets',()=>{
 const f=fixture(),b=f.art.body,w=world(undefined,{cyclePhase:'windup',cyclePhaseAge:.08});const {records,metrics}=f.draw(w);const sprites=records.filter(r=>r.type==='image'&&r.key===b.key);assert.equal(sprites.length,2);assert.equal(sprites[0].alpha+sprites[1].alpha,1);const a=b.poses[3],z=b.poses[0],dy=((a.silk[1]-a.anchor[1])+(z.silk[1]-z.anchor[1]))*.5*b.scale;assert.equal(metrics.lastThread.end[1],116+dy);assert.equal(metrics.lastThread.damaging,false);
 const thread=records.findIndex(r=>r.type==='stroke'&&r.width===.65);const sprite=records.findIndex(r=>r.type==='image'&&r.key===b.key);assert(thread<sprite);
});
test('neutral missing-map presentation is labelled and never marks the scene ready',()=>{
 const f=fixture();f.art.background=null;const {metrics,records}=f.draw(world());assert.equal(metrics.mapMissing,true);assert.equal(metrics.ready,false);assert(records.some(r=>r.type==='text'&&r.text.includes('맵 자산 미등록')));assert(!records.some(r=>r.type==='image'&&r.key==='fixtureMap'));
});
test('projectile art is clipped to the opaque real collision capsule and the player core is drawn last',()=>{
 const f=fixture(),w=world(undefined,{bullets:[{x:120,y:350,vx:0,vy:80,r:3,halfLength:7,angle:Math.PI/2,kind:'needle'}],shots:[{x:180,y:400,r:1.5}]});const {metrics,records}=f.draw(w);assert.equal(metrics.projectileDraws,1);assert.equal(metrics.shotDraws,1);assert(records.some(r=>r.type==='image'&&r.key==='fixtureShot'));assert(!records.some(r=>r.type==='fill'&&r.path?.[0]?.[0]==='A'&&r.path[0][2]===400));const bitmap=records.findIndex(r=>r.type==='image'&&r.key==='fixtureProjectile');assert.equal(records[bitmap-1].type,'clip');assert.equal(metrics.playerCoreLast,true);assert.deepEqual(records.at(-1).path[0].slice(0,4),['A',180,540,3]);
});
test('committed warning, active laser and harmless fade preserve the same endpoints and damage width',()=>{
 const f=fixture(),geometry={x1:50,y1:116,x2:280,y2:610,width:6};
 for(const phase of ['warning','active','fade']){const {metrics,records}=f.draw(world(undefined,{hazards:[Object.assign({phase},geometry)]}));const beam=records.find(r=>r.type==='stroke'&&r.path[0]?.[0]==='M'&&r.path[0][1]===50);assert.deepEqual(beam.path,[['M',50,116],['L',280,610]]);assert.equal(beam.width,phase==='warning'?1.2:6);assert.equal(metrics.activeHazardDraws,phase==='active'?1:0);assert.equal(metrics.fadingHazardDraws,phase==='fade'?1:0);}
});
test('engine boss alias in enemies is not drawn twice; unrelated mobs require explicit body art',()=>{
 const f=fixture(),w=world();w.enemies=[w.boss];assert.equal(f.draw(w).metrics.bodyDraws,1);w.enemies=[{id:2,x:100,y:120,kind:'unregistered'}];assert.throws(()=>f.draw(w),e=>e.code==='MISSING_STORY_ART');
});
test('the protected-body command link requires its exact source sprite and retains its real collision rim',()=>{
 const f=fixture(),w=world();w.boss.bodyProtected=true;w.commandLink={x:226,y:158,r:14,hp:600,maxHp:800,target:'command-link'};
 assert.throws(()=>f.draw(w),e=>e.code==='MISSING_STORY_ART'&&e.asset==='command-link');assert.equal(f.ctx.records.length,0);
 f.assets.fixtureTarget={id:'fixtureTarget',complete:true,naturalWidth:64,naturalHeight:64};f.art.targetKey='fixtureTarget';const {records,metrics}=f.draw(w);assert.equal(metrics.commandTargetDraws,1);assert(records.some(r=>r.type==='image'&&r.key==='fixtureTarget'));assert(records.some(r=>r.type==='stroke'&&r.path[0]?.[0]==='A'&&r.path[0][1]===226&&r.path[0][2]===158&&r.path[0][3]===14));assert.equal(metrics.playerCoreLast,true);
});
test('pause replay is deterministic and canvas resizing avoids repeated backing allocation',()=>{
 const f=fixture(),w=world();assert.deepEqual(f.draw(w).records,f.draw(w).records);const before=f.writes;f.renderer.resize(360,640,1);assert.equal(f.writes,before);f.renderer.resize(360,640,4);assert.equal(f.canvas.width,540);assert.equal(f.canvas.height,960);const sized=f.writes;f.renderer.resize(360,640,4);assert.equal(f.writes,sized);f.renderer.dispose();assert.equal(f.canvas.width,1);assert.throws(()=>f.draw(w),/disposed/);
});

test('native CPU renders all 32 real body poses with their exact approved projectile art and deterministic pauses',async()=>{
 const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',path.resolve(__dirname,'..')]}));
 const project=path.resolve(__dirname,'..'),out=path.resolve(project,'../drive-story-first8/native-render');fs.mkdirSync(out,{recursive:true});
 const fx=JSON.parse(fs.readFileSync(path.join(project,'docs/story-assets/first8-fx-r5.json'),'utf8'));
 const assets={gunner:await loadImage(path.join(project,'media/gunner.webp')),shot:await loadImage(path.join(project,'media/shot.webp'))};
 const frames=[],sheets=[createCanvas(1440,2560),createCanvas(1440,2560)],tones=[['#a0ab7f','#d6c698'],['#a3495d','#d5b1a0'],['#946bd5','#b7cbea'],['#c9c49a','#d6c0a0'],['#e1884e','#e2bd8c'],['#ac6de7','#a5c6dd'],['#91c9d4','#d8d8bb'],['#d1b067','#e5d2a6']];
 const cases=[['windup',.25],['active',.04],['active',.3],['recovery',.3]];
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 function write(p,b){fs.writeFileSync(p+'.tmp',b);fs.renameSync(p+'.tmp',p);}
 for(const [bodyIndex,b] of first8.bodies.entries()){
  const core=fx.assets.find(a=>a.combatId===b.combatId&&a.role==='core-art');assert(core,'exact per-ID core asset required');
  assets[b.key]=await loadImage(path.join(project,b.file));assets[core.key]=await loadImage(path.join(project,core.file));
  const canvas=createCanvas(360,640);canvas.style={};const renderer=Renderer.create(canvas,{assets});renderer.resize(360,640,1);
  const art={body:b,projectile:{key:core.key},targetKey:core.key,playerKey:'gunner',shotKey:'shot',background:null,palette:{main:tones[bodyIndex][0],secondary:tones[bodyIndex][1]}};
  for(const [poseIndex,[kind,age]] of cases.entries()){
   const w=world(b.combatId,{cyclePhase:kind,cyclePhaseAge:age,bullets:[{x:128,y:350,r:3,vx:0,vy:80,angle:Math.PI/2},{x:232,y:390,r:3,halfLength:7,vx:0,vy:80,angle:Math.PI/2}],shots:[{x:180,y:430,r:1.5,angle:-Math.PI/2,vx:0,vy:-400}]});
   if(b.combatId==='dist00-boss'){w.boss.bodyProtected=true;w.commandLink={x:226,y:158,r:14,hp:600,maxHp:800,target:'command-link'};}
   const before=JSON.stringify(w),metrics=renderer.render(w,{name:b.canonicalName},art),pixels=canvas.getContext('2d').getImageData(0,0,360,640).data,pixelHash=hash(pixels);
   renderer.render(w,{name:b.canonicalName},art);assert.equal(hash(canvas.getContext('2d').getImageData(0,0,360,640).data),pixelHash);assert.equal(JSON.stringify(w),before);assert.equal(metrics.mapMissing,true);assert.equal(metrics.ready,false);assert.equal(metrics.projectileDraws,2);assert.equal(metrics.shotDraws,1);assert.equal(metrics.playerCoreLast,true);
   const name=b.combatId+'-pose-'+(poseIndex+1)+'.png',png=canvas.toBuffer('image/png');write(path.join(out,name),png);
   const sheet=sheets[Math.floor(bodyIndex/4)];sheet.getContext('2d').drawImage(canvas,poseIndex*360,(bodyIndex%4)*640);
   frames.push({combatId:b.combatId,poseIndex,bodyKey:b.key,bodySHA256:b.sha256,projectileKey:core.key,projectileSHA256:core.sha256,pixelSHA256:pixelHash,file:name,mapMissing:true,ready:false,previewOnly:true});
  }
  renderer.dispose();
 }
 for(let i=0;i<sheets.length;i++)write(path.join(out,'contact-'+(i+1)+'.png'),sheets[i].toBuffer('image/png'));
 write(path.join(out,'report.json'),Buffer.from(JSON.stringify({scope:'Actual native CPU Canvas source-art/registration/geometry preview only. No browser/GPU/physical-mobile or combat-balance certification. Missing scene maps stay neutral and ready=false.',rendererSHA256:hash(fs.readFileSync(path.join(project,'src/story-render.js'))),frames:frames.length,pausePixelChecks:frames.length,worldImmutableChecks:frames.length,allRequiredFormAssetsComplete:false,gameBrowserGPUVerified:false,physicalMobileVerified:false,records:frames},null,2)+'\n'));
 assert.equal(frames.length,32);
});
