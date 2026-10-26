/* Boundary controller. Navigation cannot manufacture combat results. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HapilStorySession=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function create(options){
    var o=options||{},data=o.data,gate=o.assets,combat=o.combat,world=null,state=null,saveRevision=0,lastError=null;
    if(!data||!gate||!combat||!o.stateAPI||!o.storageAPI)throw new TypeError('Missing story services');
    function supported(id){return gate.entryStatus(id).ready&&combat.supports(id)===true;}
    var machine=o.stateAPI.create(data,{canStartCombat:supported,resolutionFor:o.resolutionFor,verifyResult:function(event,active){return !!world&&combat.verifyResult(event,active,world)===true;}});
    var store=o.storageAPI.create(machine,o.storageOptions||{}),loaded=store.load();
    if(loaded.status==='empty')state=machine.newState();
    else if(loaded.status==='ok'){state=loaded.state;saveRevision=loaded.revision;}
    else lastError=loaded.status;
    function fail(reason){lastError=reason;return {ok:false,reason:reason,state:state?copy(state):null};}
    function commit(next){
      var saved=store.save(next,saveRevision);
      if(!saved.ok)return fail(saved.reason||saved.status||'storage-error');
      state=next;saveRevision=saved.revision;lastError=null;
      return {ok:true,state:copy(state)};
    }
    function dispatch(event){
      if(!state)return fail(lastError||'save-unavailable');
      // Combat terminal events only originate in settle(), below.
      if(['START_COMBAT','COMBAT_CLEARED','DEFEAT','RETRY'].indexOf(event&&event.type)>=0)return fail('engine-owned-event');
      var changed=machine.reduce(state,event);
      if(!changed.ok)return fail(changed.reason);
      if(changed.duplicate)return {ok:true,state:copy(state),duplicate:true};
      var result=commit(changed.state);
      if(result.ok&&!state.activeCombat)world=null;
      return result;
    }
    function id(){return 'story-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);}
    function start(combatId,settings){
      if(!state)return fail(lastError||'save-unavailable');
      if(!supported(combatId))return fail('asset-or-implementation-locked');
      var token=id(),candidate;
      try{candidate=combat.create(combatId,{runId:token,seed:Date.now()>>>0,difficulty:settings&&settings.difficulty||'normal'});}catch(e){return fail(e.message||'combat-create-failed');}
      var changed=machine.reduce(state,{type:'START_COMBAT',combatId:combatId,runId:token});
      if(!changed.ok)return fail(changed.reason);
      var result=commit(changed.state);
      if(result.ok)world=candidate;
      return result;
    }
    function settle(){
      if(!world||!state||!state.activeCombat)return fail('no-live-combat');
      if(world.status==='defeated'){
        if(state.activeCombat.status==='defeated')return {ok:true,state:copy(state),duplicate:true};
        var defeat=machine.reduce(state,{type:'DEFEAT',combatId:state.activeCombat.combatId,runId:state.activeCombat.runId});
        return defeat.ok?commit(defeat.state):fail(defeat.reason);
      }
      var terminal=combat.result(world);
      if(!terminal)return {ok:true,state:copy(state),pending:true};
      var cleared=machine.reduce(state,Object.assign({type:'COMBAT_CLEARED'},terminal));
      if(!cleared.ok)return fail(cleared.reason);
      return commit(cleared.state);
    }
    function retry(settings){
      if(!state||!state.activeCombat)return fail('no-checkpoint');
      var active=state.activeCombat;
      if(!supported(active.combatId))return fail('asset-or-implementation-locked');
      var next=state;
      // A restored in-flight encounter resumes from its entry boundary, never
      // from an unvalidated projectile snapshot. Record no victory or loss.
      if(active.status==='active'){
        if(world&&world.status!=='defeated')return fail('combat-still-active');
        var stopped=machine.reduce(next,{type:'DEFEAT',combatId:active.combatId,runId:active.runId});
        if(!stopped.ok)return fail(stopped.reason);
        next=stopped.state;
      }
      var token=id(),candidate;
      try{candidate=combat.create(active.combatId,{runId:token,seed:Date.now()>>>0,difficulty:settings&&settings.difficulty||'normal'});}catch(e){return fail(e.message||'combat-create-failed');}
      var changed=machine.reduce(next,{type:'RETRY',combatId:active.combatId,runId:active.runId,newRunId:token});
      if(!changed.ok)return fail(changed.reason);
      var result=commit(changed.state);if(result.ok)world=candidate;return result;
    }
    function tick(input){
      if(!world||!state||!state.activeCombat||state.activeCombat.status!=='active')return false;
      combat.step(world,input||{});
      if(world.status==='defeated'||combat.result(world))settle();
      return true;
    }
    function reset(){
      var invalid=!state&&['corrupt','version-mismatch'].indexOf(loaded.status)>=0;
      var result=store.reset(invalid?null:saveRevision);
      if(!result.ok)return fail(result.reason||result.status||'reset-failed');
      state=result.state;saveRevision=result.revision;world=null;lastError=null;
      return {ok:true,state:copy(state)};
    }
    return Object.freeze({dispatch:dispatch,start:start,retry:retry,tick:tick,settle:settle,reset:reset,
      state:function(){return state?copy(state):null;},world:function(){return world;},
      status:function(){return {saveRevision:saveRevision,error:lastError,loadedStatus:loaded.status,checkpointNeedsRestart:!!(state&&state.activeCombat&&!world)};},
      frontier:function(){return state?machine.deriveFrontier(state):null;},
      sceneStatus:function(sceneId){return state?machine.sceneStatus(state,sceneId):'unavailable';},
      availableCombats:function(){return state?machine.availableCombats(state):[];},machine:machine});
  }
  return Object.freeze({create:create});
}));
