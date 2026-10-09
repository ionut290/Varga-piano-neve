const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app.js','utf8');
function fn(name){const start=src.indexOf('function '+name+'(');assert(start>=0);const lineEnd=src.indexOf('\n',start),end=src.indexOf('\n}',start);return src.slice(start,src.slice(start,lineEnd).endsWith('}')?lineEnd:end+2)}
const drawn=[],elements={},recorded=[];
const c={Math,Number,Date,console,currentMode:'major',majorRi:0,mapState:{active:true,paused:false},majorNav:{mode:'inside'},majorTracking:{lanes:[],coveredMeters:0},majorRoutes:[{streets:[{name:'A'},{name:'B'},{name:'C'}]}],majorCoverageSegments:[],majorCoverageLayer:{},$:id=>elements[id]??={},L:{polyline(points){return{addTo(){drawn.push(points);return this}}}},recordStreetDistance:(index,meters)=>recorded.push({index,meters}),switchStreetWork(){},saveMajorWorkSession(){}};
vm.createContext(c);
for(const name of ['d','headingDeg','angleDiff','offsetRoad','majorAllowedDistance','nearestOnSegment','nearestMajorLanePoint','nearestMajorPointOnLane','lockMajorLane','trackedMajorLanePoint','majorMovementHeading','resetTrackingJoin','majorCoveragePath','markMajorPassed'])vm.runInContext(fn(name),c);
const origin=[44.55,11.35],point=(east,north)=>[origin[0]+north/110540,origin[1]+east/(111320*Math.cos(origin[0]*Math.PI/180))];
function reset(lanes){c.majorTracking.lanes=lanes;c.majorTracking.coveredMeters=0;c.resetTrackingJoin();c.majorCoverageSegments=[];drawn.length=0;recorded.length=0;c.mapState.paused=false}
function pair(coords,streetIndex){return[{coords:c.offsetRoad(coords,-2.4),streetIndex,direction:1},{coords:c.offsetRoad(coords,2.4).reverse(),streetIndex,direction:-1}]}
const north=pair([point(0,0),point(0,100)],0);
reset(north);
assert(north[0].coords[0][1]>origin[1],'northbound lane lies east, on the right');
assert(north[1].coords[0][1]<origin[1],'southbound lane lies west, on the right');
// Start with ambiguous position, then walking direction overrides the initial opposite lane.
c.markMajorPassed(point(-1,10),8);c.markMajorPassed(point(2,15),8);assert.equal(c.majorTracking.lastLane,0);
c.markMajorPassed(point(2,25),8);assert(drawn.length>=2,'initial correction does not cut the green line');
const beforeTurn=drawn.length;c.markMajorPassed(point(-2,20),8);assert.equal(c.majorTracking.lastLane,1,'U-turn switches immediately');assert(drawn.length>beforeTurn,'U-turn remains connected');
// Heading accumulates at walking pace, even when each GPS interval is below 3 metres.
reset(north);for(let n=0;n<=8;n++)c.markMajorPassed(point(0,10+n),8);assert.equal(c.majorTracking.lastLane,0);assert(drawn.length>=7,'sub-metre movement is retained');
// Adjacent roads need not be consecutive entries in the assigned route list.
const east=pair([point(0,100),point(100,100)],2);reset([...north,...east]);
c.markMajorPassed(point(2,90),8);c.markMajorPassed(point(2,96),8);const beforeJunction=drawn.length;
c.markMajorPassed(point(8,98),8);assert.equal(c.majorTracking.lockedStreet,2);assert(drawn.length>beforeJunction,'first GPS fix on the new street draws green');
c.markMajorPassed(point(18,98),8);assert.equal(c.majorTracking.lockedStreet,2);
// Curves are traced through geometry vertices, rather than straight across the corner.
const curved=[{coords:[point(0,0),point(0,20),point(20,20)],streetIndex:0,direction:1}];reset(curved);
c.markMajorPassed(point(0,15),8);c.markMajorPassed(point(5,20),8);assert.equal(drawn.length,2);assert(c.d(drawn[0][1],point(0,20))<.01);
// Pause and leaving the route must not fabricate covered road.
const n=drawn.length;c.mapState.paused=true;c.resetTrackingJoin();assert.equal(c.markMajorPassed(point(15,20),8),false);assert.equal(drawn.length,n);
c.mapState.paused=false;c.markMajorPassed(point(15,20),8);assert.equal(drawn.length,n);c.markMajorPassed(point(16,20),8);assert.equal(drawn.length,n+1);
assert.equal(c.markMajorPassed(point(100,100),8),false);assert.equal(c.majorTracking.lastSnap,null);
// A straight shortcut between separated roads cannot be filled in green.
reset([{coords:[point(0,0),point(0,20)],streetIndex:0},{coords:[point(80,0),point(80,20)],streetIndex:2}]);
c.markMajorPassed(point(0,10),8);c.markMajorPassed(point(80,10),8);assert.equal(drawn.length,0);
// Implausible GPS jumps are excluded.
reset(north);c.markMajorPassed(point(2,0),8);c.markMajorPassed(point(2,100),8);assert.equal(drawn.length,0);
console.log('PASS: right-side lanes, walking heading, immediate street changes, U-turn continuity, curved geometry, pause, off-route and GPS-jump guards');
