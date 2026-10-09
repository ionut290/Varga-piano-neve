const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('screen-awake.js','utf8');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
function setup(options={}) {
 const docEvents={},winEvents={},locks=[],requests=[],timers=new Map();let nextTimer=0;
 const document={visibilityState:'visible',addEventListener:(n,fn)=>docEvents[n]=fn};
 const window={addEventListener:(n,fn)=>winEvents[n]=fn};
 const navigator=options.unsupported?{}:{wakeLock:{request:async type=>{
  requests.push(type);if(options.fail)throw Error('Denied');
  const events={},lock={released:false,addEventListener:(n,fn)=>events[n]=fn,release:async()=>{lock.released=true;events.release?.()}};
  locks.push(lock);if(options.wait)await options.wait;return lock;
 }}};
 vm.runInNewContext(src,{window,document,navigator,console:{warn(){}},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id)});
 return {window,document,locks,requests,timers,docEvents,winEvents};
}
(async()=>{
 let c=setup();assert.equal(c.requests.length,0);c.window.VargaScreenAwake.setActive(true);await flush();assert.deepEqual(c.requests,['screen']);
 c.window.VargaScreenAwake.setActive(true);await flush();assert.equal(c.requests.length,1,'GPS updates do not duplicate locks');
 c.document.visibilityState='hidden';c.docEvents.visibilitychange();await flush();assert.equal(c.locks[0].released,true);
 c.document.visibilityState='visible';c.docEvents.visibilitychange();await flush();assert.equal(c.requests.length,2);
 c.window.VargaScreenAwake.setActive(false);await flush();assert.equal(c.locks[1].released,true);assert.equal(c.timers.size,0);
 c.winEvents.focus();await flush();assert.equal(c.requests.length,2,'no reacquire after stop');
 let grant;c=setup({wait:new Promise(resolve=>grant=resolve)});c.window.VargaScreenAwake.setActive(true);c.window.VargaScreenAwake.setActive(false);grant();await flush();assert.equal(c.locks[0].released,true,'late grant after stop must release');
 c=setup();c.window.VargaScreenAwake.setActive(true);await flush();c.winEvents.pagehide();await flush();assert.equal(c.locks[0].released,true);c.winEvents.pageshow();await flush();assert.equal(c.requests.length,2,'bfcache return reacquires');
 await c.locks[1].release();assert.equal(c.timers.size,1);c.window.VargaScreenAwake.setActive(false);assert.equal(c.timers.size,0,'stop cancels automatic retries');
 c=setup({fail:true});c.window.VargaScreenAwake.setActive(true);await flush();assert.equal(c.timers.size,0);c.docEvents.pointerdown();await flush();assert.equal(c.requests.length,2,'gesture retries refusal');
 c=setup({unsupported:true});c.window.VargaScreenAwake.setActive(true);await flush();assert.equal(c.requests.length,0);
 const app=fs.readFileSync('app.js','utf8');let active;
 const state={window:{VargaScreenAwake:{setActive:v=>active=v}},mapState:{active:false},navTarget:null};vm.createContext(state);
 vm.runInContext(app.match(/function syncScreenAwake\(\)\{[^\n]+/)[0],state);
 state.syncScreenAwake();assert.equal(active,false);state.mapState.active=true;state.mapState.paused=true;state.syncScreenAwake();assert.equal(active,true,'active tour includes pauses');state.mapState.active=false;state.navTarget=[44,11];state.syncScreenAwake();assert.equal(active,true,'minor navigation');state.navTarget=null;state.syncScreenAwake();assert.equal(active,false);
 assert.ok(app.includes('navTarget=p;syncScreenAwake();'));assert.ok(app.includes('navTarget=null;syncScreenAwake()'));
 console.log('PASS: wake lock lifecycle, visibility, late grant, page restore, refusal, unsupported API and navigation integration');
})().catch(error=>{console.error(error);process.exitCode=1});
