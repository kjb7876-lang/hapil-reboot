'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {idle,put,read,need}=require('./helpers/arcade-v43.cjs'),A=need();
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
const app=read('src/arcade-app-v43.js');
const defaults=app.match(/var settings=(\{.*?\});/)[1];
const settingsCode=app.slice(app.indexOf('  var BOOLEAN_SETTINGS='),app.indexOf('  /* 키 바꾸기'));
const nativeContinue=app.slice(app.indexOf("    $('arcade-continue').addEventListener"),app.indexOf("    $('arcade-start').addEventListener"));
function ui({saved=null,selectedHero='memory',checkpoint=null}={}){
 let store=saved==null?null:JSON.stringify(saved);
 function el(){return {value:'0',max:'3',dataset:{},attrs:{},handlers:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.handlers[k]=f;}};}
 const els=Object.fromEntries(['setting-abilitySeoha','setting-abilityMemory','value-abilitySeoha','value-abilityMemory','note-abilitySeoha','note-abilityMemory','ability-row-seoha','ability-row-memory','ability-trade-seoha','label-abilitySeoha','arcade-continue'].map(k=>[k,el()]));
 const label=els['label-abilitySeoha'];
 const env={Arcade:A, lite:false, settings:null, selectedHero,state:null,
  T:(k,args={})=>k+' '+Object.values(args).join(','), $:k=>els[k], isSeoha:id=>id==='seoha'||id==='seoha-b', syncStoryFx(){},refreshKeyLabels(){},bindKeySettings(){}, keyOk(){return true;},
  keyFocus:'Shift',keyBomb:'KeyX',fx:null,Ink:null,HeroFx:null,music:null,SETTINGS_KEY:'x',
  midway:()=>checkpoint,heroId:id=>id, unlockAudio(){},syncUI(){},
  global:{localStorage:{getItem:()=>store,setItem:(k,v)=>{store=v;}}}};
 const startOptions=app.match(/var options=\{ability:abilityFor\(run\.hero\)/);assert.ok(startOptions);
 const realStartFwd=`function start(run){state=Arcade.createRun({hero:run.hero,stage:run.stage,segment:run.segment,grown:run.grown,ability:abilityFor(run.hero),entranceAll:true});syncAbility();}`;
 vm.createContext(env);vm.runInContext('settings='+defaults+';\n'+settingsCode+realStartFwd+nativeContinue+'\nloadSettings();bindSettings();syncAbility();',env);
 return {env,els,label,value:()=>JSON.parse(store),set(k,v){els['setting-'+k].value=String(v);els['setting-'+k].handlers.input();},select(hero,union=false){env.state=A.createRun({hero});if(union)env.state.union=true;vm.runInContext('syncAbility()',env);}};
}
test('selectable awakened has seven 11% time steps; trainee and actual story union stay capped at 3',()=>{
 for(let l=0;l<=7;l++){
  const s=idle({hero:'seoha-b',ability:l});
  assert.equal(s.ability,l);assert.equal(A.abilityMax(s),7);assert.equal(s.union,undefined);
  const o=A.abilityOf(s);near(o.bulletSpeed,1);near(o.move,1);
  s.player.focus=true;const p=A.abilityOf(s);near(p.bulletSpeed,1-.11*l);near(p.move,1-.11*l);near(p.damage,1);
 }
 for(const union of [false,true]){
  const s=idle({hero:'seoha',ability:7});s.union=union;s.player.focus=true;
  assert.equal(s.ability,3);assert.equal(A.abilityMax(s),3);near(A.abilityOf(s).bulletSpeed,.67);near(A.abilityOf(s).move,union?1:.67);
 }
});
test('actual held B7 Hell deep-stage bullet, player, and enemy clocks slow and recover on release',()=>{
 function sample(level,focus,compact){
  const s=idle({hero:'seoha-b',difficulty:'hell',stage:46,compact,entranceAll:true,ability:level,growth:true});
  assert.equal(s.stageIndex,46);
  put(s,36,120,{bage:100,bs:60,ba:0});
  const x=s.bx[0],m=s.player.x;A.step(s,{dx:50,dy:0,focus});
  const first={bullet:s.bx[0]-x,move:s.player.x-m,rate:s.enemyTimeRate};
  const x2=s.bx[0],m2=s.player.x;A.step(s,{dx:50,dy:0,focus:false});
  return {...first,released:[s.bx[0]-x2,s.player.x-m2,s.enemyTimeRate]};
 }
 for(const compact of [false,true]){
  const a=sample(0,true,compact),b=sample(7,true,compact);
  near(b.bullet/a.bullet,.23);near(b.move/a.move,.23);near(b.rate,.23);near(b.move,compact?.391:.46);
  near(a.released[0],b.released[0]);near(a.released[1],b.released[1]);near(b.released[2],1);
  const h=sample(7,false,compact),f=sample(0,false,compact);near(h.bullet,f.bullet);near(h.move,f.move);
 }
});
test('native reused controls show B7 label/note, switch actual heroes, and save independent choices',()=>{
 const u=ui({selectedHero:'seoha-b'});
 const e=u.els['setting-abilitySeoha'];assert.equal(e.max,'7');assert.equal(e.value,'7');assert.equal(e.style.values['--steps'],'7');
 assert.equal(e.attrs['aria-label'],'abilityTimeAwakened ');assert.equal(u.label.dataset.i18n,'abilityTimeAwakened');
 assert.equal(u.els['note-abilitySeoha'].textContent,'abilityTimeNote 77');
 u.select('seoha-b');u.set('abilitySeoha',6);assert.equal(u.env.state.ability,6);
 assert.equal(u.value().abilitySeohaB,6);assert.equal(u.value().abilitySeoha,3);assert.equal(u.value().abilityV,4);
 u.select('seoha');assert.equal(e.max,'3');assert.equal(e.value,'3');assert.equal(u.label.dataset.i18n,'abilityTime');
 u.set('abilitySeoha',2);u.select('seoha',true);assert.equal(e.max,'3');assert.equal(u.env.state.ability,2);
 u.select('memory');assert.equal(u.env.state.ability,7);u.select('seoha-b');assert.equal(e.value,'6');
 assert.equal(u.value().abilitySeoha,2);assert.equal(u.value().abilitySeohaB,6);
});
test('legacy shared migration, explicit Off and v4 independent values restore across reload / Continue',()=>{
 for(const [saved,b,a] of [
  [{abilityV:3,abilitySeoha:0},0,0],[{abilityV:3,abilitySeoha:2},2,2],[{abilityV:3,abilitySeoha:3},7,3],
  [{abilityV:2,abilitySeoha:6},6,3],[{abilityV:2,abilitySeoha:0},0,0],[{abilitySeoha:0},7,3],
  [{abilityV:4,abilitySeohaB:0,abilitySeoha:3},0,3],[{abilityV:4,abilitySeohaB:6,abilitySeoha:1},6,1]
 ]){
  const u=ui({saved,selectedHero:'memory',checkpoint:{stage:46,seg:A.STAGES[46].first,hero:'seoha-b',exp:0,fills:0}});
  assert.equal(u.env.settings.abilitySeohaB,b);assert.equal(u.env.settings.abilitySeoha,a);
  u.els['arcade-continue'].handlers.click();
  assert.equal(u.env.state.hero,'seoha-b');assert.equal(u.env.state.ability,b);assert.equal(u.els['setting-abilitySeoha'].max,'7');
 }
});
