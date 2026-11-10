const test=require('node:test');
const assert=require('node:assert/strict');
globalThis.indexedDB=require('fake-indexeddb').indexedDB;
const queue=require('../offline-outbox.js');
queue.setUser('test-operator');
test('persists and acknowledges a street only after successful remote save', async()=>{
 const id='street-'+Date.now();
 await queue.enqueue(id,{coveredMeters:12});
 let failed=false;
 try{await queue.flush(async()=>{throw new Error('offline')})}catch(e){failed=true}
 assert.equal(failed,true);
 assert.ok((await queue.count())>=1);
 await queue.flush(async (key,data)=>{if(key===id)assert.equal(data.coveredMeters,12)});
 assert.equal((await queue.count()),0);
});
test('newer version is not removed after an in-flight older upload',async()=>{
 const id='versioned-'+Date.now();
 await queue.enqueue(id,{coveredMeters:10});
 await queue.flush(async(key,data)=>{
  if(key===id)await queue.enqueue(id,{coveredMeters:20});
 });
 assert.equal(await queue.count(),1);
 let actual;
 await queue.flush(async(key,data)=>{if(key===id)actual=data.coveredMeters});
 assert.equal(actual,20);
 assert.equal(await queue.count(),0);
});
test('recovers latest IndexedDB session and deletes it on confirmed closure',async()=>{
 await queue.saveSession({active:true,meters:125.5});
 assert.deepEqual(await queue.loadSession(),{active:true,meters:125.5});
 await queue.clearSession();
 assert.equal(await queue.loadSession(),null);
});

test('another account cannot read or upload pending records',async()=>{
 queue.setUser('operator-a');
 await queue.enqueue('account-a-record',{coveredMeters:99});
 await queue.saveSession({active:true,meters:99});
 queue.setUser('operator-b');
 assert.equal(await queue.count(),0);
 assert.equal(await queue.loadSession(),null);
 let sent=0;
 await queue.flush(async()=>{sent++});
 assert.equal(sent,0);
 queue.setUser('operator-a');
 assert.equal(await queue.count(),1);
 assert.equal((await queue.loadSession()).meters,99);
 await queue.flush(async()=>{sent++});
 assert.equal(sent,1);
 await queue.clearSession();
 queue.setUser('test-operator');
});
