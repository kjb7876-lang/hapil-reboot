'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const bridge=fs.readFileSync(path.join(__dirname,'../src/arcade-party-link-v43.js'),'utf8');
const pref='hapil.arcade.party-controls.v1';

function title(storage, query=''){
  const elements=new Map();
  const href='https://game.test/arcade.html'+query;
  const win={location:new URL(href),URL,history:{replaceState(){}},
    document:{getElementById(id){
      if(!elements.has(id)) elements.set(id,{addEventListener(type,fn){this[type]=fn;}});
      return elements.get(id);
    }},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,v)=>storage.set(key,v)},
    PartyForge:{loadCampaign:()=>({}),battleConfig:()=>({companions:[]})},
    CustomEvent:class{},addEventListener(){},dispatchEvent(){}};
  win.window=win;
  vm.runInNewContext(bridge,win);
  return {win,box:elements.get('arcade-party-enabled')};
}

test('Hell offers the wing on first visit and remembers an explicit solo choice independently',()=>{
  const storage=new Map(),{win,box}=title(storage);
  win.HapilPartySetDifficulty('gentle');assert.equal(box.checked,false);
  win.HapilPartySetDifficulty('hell');assert.equal(box.checked,true);
  assert.equal(win.HapilPartyExplicitlyEnabled(),false);
  box.checked=false;box.change();
  win.HapilPartySetDifficulty('normal');win.HapilPartyActivate({auto:true});
  const loaded=title(storage);
  loaded.win.HapilPartySetDifficulty('hell');assert.equal(loaded.box.checked,false);
  assert.equal(loaded.win.HapilPartyLoadout(),null);
  loaded.win.HapilPartySetDifficulty('normal');assert.equal(loaded.box.checked,true);
  assert(loaded.win.HapilPartyExplicitlyEnabled());assert(loaded.win.HapilPartyPilotAuto());
});

test('an existing pilot preference survives the upgrade and an expedition link activates only the selected mode',()=>{
  const storage=new Map([[pref,JSON.stringify({enabled:false,auto:true})]]);
  const prior=title(storage);prior.win.HapilPartySetDifficulty('hell');assert.equal(prior.box.checked,false);
  const opened=title(storage,'?expedition=1');opened.win.HapilPartySetDifficulty('gentle');
  assert(opened.box.checked);assert(opened.win.HapilPartyPilotAuto());
  opened.win.HapilPartySetDifficulty('hell');assert.equal(opened.box.checked,false);
});
