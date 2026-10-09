const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app.js','utf8');
function fn(name){const start=src.indexOf('function '+name+'(');assert(start>=0);const lineEnd=src.indexOf('\n',start),end=src.indexOf('\n}',start);return (src.slice(start-6,start)==='async '?'async ':'')+src.slice(start,src.slice(start,lineEnd).endsWith('}')?lineEnd:end+2)}
const drawn=[],recorded=[],c={window:{},console,Math,Number,Date,majorRi:0,currentMode:'major',majorNav:{mode:'inside'},majorTracking:{lanes:[],routeIndex:null},mapState:{active:true,paused:false},majorCoverageSegments:[],majorCoverageLayer:{},$:()=>({}),L:{polyline(p){return{addTo(){drawn.push(p);return this}}}},recordStreetDistance:(i,m)=>recorded.push([i,m]),switchStreetWork(){},saveMajorWorkSession(){}};
vm.createContext(c);
for(const f of ['major-routes.js','major-network.js','major-parking.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
c.majorRoutes=c.window.MAJOR_ROUTES;c.majorRoadNetwork=c.window.MAJOR_OFFLINE.roads;c.majorBoundary=c.window.MAJOR_OFFLINE.boundary;c.loadMajorRoadNetwork=async()=>{};
for(const name of ['d','majorSearchName','normRoadName','roadNameScore','findMajorWaysByName','findMajorWays','majorParkingAreas','pointInRing','pointInBoundary','boundaryEdges','segmentIntersectionT','interp','clipMajorCoords','offsetRoad','headingDeg','angleDiff','nearestOnSegment','nearestMajorParkingPoint','nearestMajorLanePoint','nearestMajorPointOnLane','lockMajorLane','trackedMajorLanePoint','majorMovementHeading','prepareMajorTrackingRoute','majorAllowedDistance','resetTrackingJoin','majorCoveragePath','markMajorPassed'])vm.runInContext(fn(name),c);
(async()=>{
 let count=0;
 for(let ri=0;ri<c.majorRoutes.length;ri++){
  c.majorRi=ri;c.majorTracking.routeIndex=null;await c.prepareMajorTrackingRoute();
  for(const [i,s] of c.majorRoutes[ri].streets.entries())if(/parch/i.test(s.name)){
   count++;const p=c.window.MAJOR_PARKING[s.name];assert(p, s.name);assert(p.areas.length||p.ways.length,'missing parking '+s.name);
   assert(c.majorTracking.lanes.some(l=>l.streetIndex===i&&l.parking),'parking absent in GPS '+s.name);
   if(/^PARCH/i.test(s.name))assert(c.findMajorWays(s).every(w=>w.parking),'parking-only row incorrectly uses entire nearby road');
  }
 }
 assert.equal(count,14);
 c.majorRi=0;c.majorTracking.routeIndex=null;await c.prepareMajorTrackingRoute();c.resetTrackingJoin();
 const index=c.majorRoutes[0].streets.findIndex(s=>s.name==='PARCH. SCUOLA BERTOLINI DA VIA LIRONE');
 const a=[44.5740886,11.360091],b=[44.5740535,11.3600695],maneuver=[44.57406,11.36004];
 for(const p of [a,b,maneuver,a]){assert.equal(c.markMajorPassed(p,8),true);assert.equal(c.majorTracking.lanes[c.majorTracking.lastLane].streetIndex,index)}
 assert(drawn.length>=3,'maneuvers must draw green');assert(recorded.every(([i])=>i===index),'work must belong to parking rather than Lirone/Curiel');
 const n=drawn.length;c.mapState.paused=true;assert.equal(c.markMajorPassed(b,8),false);assert.equal(drawn.length,n);c.mapState.paused=false;c.resetTrackingJoin();
 assert.equal(c.markMajorPassed(b,8),true);assert.equal(drawn.length,n,'resume must not join across a pause');
 assert.equal(c.markMajorPassed(a,50),false);assert.equal(drawn.length,n,'bad GPS must not draw');
 const lirone=[44.5741397,11.3601321];assert.notEqual(c.nearestMajorLanePoint(lirone).streetIndex,index,'passing Lirone must not complete the parking');
 assert.equal(c.findMajorWays({...c.majorRoutes[0].streets[index],_adminDeleted:true}).length,0);
 assert.equal(c.majorParkingAreas({...c.majorRoutes[0].streets[index],_adminDeleted:true}).length,0);
 console.log('PASS: all 14 parking entries have separate geometry and GPS recognition; Bertolini parking maneuvers, correct street ownership, Lirone exclusion, pause, resume, poor GPS and admin overrides');
})().catch(e=>{console.error(e);process.exit(1)});
