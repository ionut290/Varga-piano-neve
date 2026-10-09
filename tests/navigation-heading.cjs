const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{}};vm.runInNewContext(fs.readFileSync('navigation-heading.js','utf8'),c);
const h=c.window.VargaNavigationHeading(),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),bearing=()=>90;
const update=(heading,speed=4,accuracy=8,p=[0,0])=>h.update({heading,speed,accuracy},p,dist,bearing);
assert.equal(update(90),90);assert.equal(update(180,0),90,'stationary GPS must not rotate');assert.equal(update(180,4,70),90,'poor accuracy ignored');
h.reset();assert.equal(update(359),359);const wrap=update(1);assert.ok(wrap>350||wrap<10,'shortest rotation across north');
assert.equal(update(180),180,'sharp turn responds promptly');h.reset();assert.equal(update(null,null,8,[0,0]),null);assert.equal(update(null,null,8,[3,0]),null);assert.equal(update(null,null,8,[9,0]),90,'accumulated GPS movement determines course');
assert.equal(update(-1),90,'invalid course ignored');h.reset();assert.equal(h.value,null);
console.log('PASS: course filtering, stationary fix, poor GPS, north wrap, turns and movement fallback');
