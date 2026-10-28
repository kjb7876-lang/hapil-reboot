'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Store=require('../src/storage.js')._test;
test('a failed persistent write reports failure and does not silently commit to memory',async()=>{
 let writes=0;
 const db={close(){},transaction(name,mode){const tx={objectStore(){return {get(){const req={};queueMicrotask(()=>{if(mode==='readonly'){req.result=undefined;req.onsuccess();queueMicrotask(()=>tx.oncomplete())}else{writes++;queueMicrotask(()=>tx.onabort())}});return req}}}};return tx}};
 const indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req}};
 const store=Store.createStore({indexedDB,location:{protocol:'https:'}});
 assert.equal((await store.open()).persistent,true);
 const failed=await store.saveSettings({quality:'low'});assert.equal(failed.ok,false);assert.equal(failed.reason,'storage-error');assert.equal(failed.persistent,false);
 const blocked=await store.saveSettings({quality:'high'});assert.equal(blocked.ok,false);assert.equal(blocked.reason,'storage-error');assert.equal(writes,1);
});
test('empty store is distinguishable from settings saved in this session',async()=>{
 const store=Store.createStore({location:{protocol:'https:'}});
 await store.open();const fresh=await store.load();assert.equal(fresh.hasStoredState,false);
 assert.equal((await store.saveSettings({quality:'low'})).ok,true);
 const restored=await store.load();assert.equal(restored.hasStoredState,true);assert.equal(restored.settings.quality,'low');
});
