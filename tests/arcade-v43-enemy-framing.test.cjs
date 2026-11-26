'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const Arcade=require('../src/arcade-v43.js');
const manifest=require('../media/arcade-v43/manifest.json');

function loadRenderer(){
  const draws=[];
  const context={globalAlpha:1,drawImage:(...args)=>draws.push(args),save(){},restore(){}};
  const canvas={getContext:()=>context};
  const window={HapilArcade:Arcade,addEventListener(){},document:{getElementById:()=>canvas},innerWidth:360,innerHeight:640,metadata:manifest};
  window.window=window;
  const app=fs.readFileSync(path.join(__dirname,'../src/arcade-app-v43.js'),'utf8');
  const script=app.replace('  boot();\n',`  manifest=global.metadata;
    global.frameTest={height:tallOf,draw:function(key,mid,motion,progress){
      var name=key+(motion?'@'+motion:''),entry=manifest[name+'.webp'];
      images[name]={width:entry.size[0],height:entry.size[1]};
      deathProg=progress==null?-1:progress;
      drawArt(key,120,100,false,'#fff',0,motion,1,null,fieldHeight(key,tallOf(key,mid)));
    }};
`);
  vm.runInNewContext(script,window);
  return {api:window.frameTest,draws};
}

test('all encounter heights follow their live role, including a boss reused as a midboss',()=>{
  const {api}=loadRenderer();
  for(const [id,spec] of Object.entries(Arcade.MOBS)){
    const height=api.height(id,false);
    assert(spec.elite?height>=75&&height<=90:height>=51&&height<=64,id+' '+height);
  }
  for(const seg of Arcade.SEGMENTS.filter(x=>x.kind==='card')){
    const key=Arcade.segArt(seg);
    assert(seg.mid?api.height(key,true)===108:api.height(key,false)>=128,key);
  }
  assert.equal(api.height('balrog',false),248);
  assert(api.height('cultist_awake',false)>api.height('cultist',false));
  assert(api.height('controller',true)<api.height('controller',false));
});

test('each pose keeps the same registration throughout its animation, including its fall',()=>{
  const {api,draws}=loadRenderer();
  for(const [name,base] of Object.entries(manifest)){
    if(!['actors','mobs'].includes(base.group)||!base.motions)continue;
    const key=name.slice(0,-5),height=api.height(key,false)*(base.fieldScale||1);
    for(const motion of base.motions){
      const entry=manifest[key+'@'+motion+'.webp'];
      assert(entry.poseFit,key+' '+motion);
      const [scale,x,y]=entry.poseFit;
      assert(scale>=.85&&scale<=1.18&&Math.abs(x)<=.15&&Math.abs(y)<=.15,key);
      api.draw(key,false,motion, motion==='death'?0:null);
      const first=draws.at(-1);
      assert.equal(first[8],height*scale);
      assert(Math.abs(first[5]+first[7]/2-(120+height*x))<1e-9,key+' horizontal anchor');
      assert(Math.abs(first[6]+first[8]/2-(100+height*y))<1e-9,key+' vertical anchor');
      if(motion==='death'&&entry.frames>1){
        api.draw(key,false,motion,1);
        const last=draws.at(-1);
        assert.notEqual(last[1],first[1]);
        assert.deepEqual(last.slice(5),first.slice(5));
      }
    }
  }
});
