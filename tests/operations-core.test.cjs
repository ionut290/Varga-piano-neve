const test=require('node:test');
const assert=require('node:assert/strict');
const ops=require('../operations/operations-core.js');
test('seven existing major/minor routes are preserved',()=>{
 assert.deepEqual(ops.ROUTES.map(x=>x.id),['major:0','major:1','major:2','minor:0','minor:1','minor:2','minor:3']);
});
test('assignment is rejected for invalid resources and malformed routes',()=>{
 assert.throws(()=>ops.makeAssignment({operatorUid:'op1',teamId:'team1',vehicleId:'vehicle1',routeId:'other:0',createdBy:'admin1'}));
 assert.throws(()=>ops.makeAssignment({operatorUid:'!',teamId:'team1',vehicleId:'vehicle1',routeId:'major:0',createdBy:'admin1'}));
 const a=ops.makeAssignment({operatorUid:'operator1',teamId:'team1',vehicleId:'vehicle1',routeId:'major:0',createdBy:'admin1'});
 assert.equal(a.status,'active');
 assert.equal(ops.canTrack(a,'operator1','major:0'),true);
 assert.equal(ops.canTrack(a,'operator2','major:0'),false);
 assert.equal(ops.canTrack(a,'operator1','major:1'),false);
 assert.equal(ops.canTrack({...a,status:'released'},'operator1','major:0'),false);
});
test('GPS coordinates and timestamps reject incorrect or stale values',()=>{
 assert.equal(ops.validPosition({lat:44.57,lng:11.36,accuracy:7}),true);
 assert.equal(ops.validPosition({lat:150,lng:11.36,accuracy:7}),false);
 assert.equal(ops.validPosition({lat:44.57,lng:11.36,accuracy:200}),false);
 const now=Date.now();
 assert.equal(ops.fresh(now-30000,now),true);
 assert.equal(ops.fresh(now-180000,now),false);
});
