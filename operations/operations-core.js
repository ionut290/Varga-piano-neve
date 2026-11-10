/* Pure validation and status helpers for Piano Neve Phase 2. */
(function(root){
 'use strict';
 const ROUTES=[
  {id:'major:0',label:'Rosso n° 1',mode:'major',index:0},
  {id:'major:1',label:'Blu n° 2',mode:'major',index:1},
  {id:'major:2',label:'Giallo n° 3',mode:'major',index:2},
  {id:'minor:0',label:'Castel Maggiore 1',mode:'minor',index:0},
  {id:'minor:1',label:'Castel Maggiore 2',mode:'minor',index:1},
  {id:'minor:2',label:'Trebbo di Reno',mode:'minor',index:2},
  {id:'minor:3',label:'1° Maggio',mode:'minor',index:3}
 ];
 const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{3,80}$/.test(value);
 const routeFor=id=>ROUTES.find(r=>r.id===id)||null;
 const validPosition=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=100;
 const fresh=(stamp,now=Date.now(),ttl=120000)=>Number.isFinite(stamp)&&stamp<=now+30000&&now-stamp<=ttl;
 const canTrack=(assignment,uid,routeId)=>!!(assignment&&assignment.status==='active'&&assignment.operatorUid===uid&&assignment.routeId===routeId);
 const assignmentConflict=(rows,candidate)=>rows.some(row=>
   row&&row.status==='active'&&(
     row.routeId===candidate.routeId||
     row.vehicleId===candidate.vehicleId||
     row.operatorUid===candidate.operatorUid||
     row.teamId===candidate.teamId
   )
 );
 function safeLabel(v,max=90){return String(v||'').trim().slice(0,max)}
 function makeAssignment({operatorUid,teamId,vehicleId,routeId,createdBy}){
  if(!validId(operatorUid)||!validId(teamId)||!validId(vehicleId)||!routeFor(routeId)||!validId(createdBy))throw new Error('Assegnazione non valida');
  return {operatorUid,teamId,vehicleId,routeId,createdBy,status:'active'};
 }
 const api={ROUTES,validId,routeFor,validPosition,fresh,canTrack,assignmentConflict,safeLabel,makeAssignment};
 root.VargaSnowOperationsCore=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
