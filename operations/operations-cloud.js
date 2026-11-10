/* Firestore operations backend: client UI controls do NOT replace Firestore rules. */
(function(root){
 'use strict';
 const core=root.VargaSnowOperationsCore;
 const cloud=()=>root.VargaSnowCloud;
 const db=()=>cloud()?.db;
 function requireAdmin(){if(!db()||cloud().role!=='admin')throw new Error('Accesso amministratore necessario');}
 function requireUser(){if(!db()||!cloud()?.user)throw new Error('Accesso necessario');return cloud().user;}
 const collection=name=>db().collection(name);
 function onCollection(name,cb,err){
  requireAdmin();
  return collection(name).onSnapshot(s=>cb(s.docs.map(d=>Object.assign({id:d.id},d.data()))),err||console.error);
 }
 function activeAssignment(routeId){
  return collection('pianoNeveAssignments').doc(routeId.replace(':','_'));
 }
 const api={
  async upsertVehicle(id,form){
   requireAdmin();if(!core.validId(id))throw new Error('ID mezzo non valido');
   const name=core.safeLabel(form.name),plate=core.safeLabel(form.plate,16);
   if(name.length<2)throw new Error('Nome mezzo obbligatorio');
   await collection('pianoNeveVehicles').doc(id).set({name,plate,active:true,updatedBy:cloud().user.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  },
  async upsertTeam(id,form){
   requireAdmin();if(!core.validId(id))throw new Error('ID squadra non valido');
   const name=core.safeLabel(form.name),operatorUid=String(form.operatorUid||'').trim();
   if(name.length<2||!core.validId(operatorUid))throw new Error('Nome o UID operatore non valido');
   await collection('pianoNeveTeams').doc(id).set({name,operatorUid,active:true,updatedBy:cloud().user.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  },
  async assign({routeId,operatorUid,teamId,vehicleId}){
   requireAdmin();const createdBy=cloud().user.uid;
   const payload=core.makeAssignment({routeId,operatorUid,teamId,vehicleId,createdBy});
   const team=await collection('pianoNeveTeams').doc(teamId).get();
   const vehicle=await collection('pianoNeveVehicles').doc(vehicleId).get();
   if(!team.exists||!team.data().active||team.data().operatorUid!==operatorUid)throw new Error('Squadra/operatore non valido');
   if(!vehicle.exists||!vehicle.data().active)throw new Error('Mezzo non disponibile');
   const ref=activeAssignment(routeId);
   await db().runTransaction(async tx=>{
    // Read all route slots before any write, so parallel assignments conflict and retry.
    const slotRefs=core.ROUTES.map(route=>activeAssignment(route.id));
    const slots=await Promise.all(slotRefs.map(slot=>tx.get(slot)));
    const used=slots.find(s=>s.exists&&s.data().status==='active'&&(
      s.data().routeId===routeId||s.data().vehicleId===vehicleId||
      s.data().operatorUid===operatorUid||s.data().teamId===teamId
    ));
    if(used)throw new Error('Percorso, mezzo o squadra già impegnati in un altro giro.');
    tx.set(ref,{...payload,routeId,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
   });
  },
  async release(routeId){
   requireAdmin();if(!core.routeFor(routeId))throw new Error('Percorso non valido');
   const ref=activeAssignment(routeId);
   await db().runTransaction(async tx=>{
    const existing=await tx.get(ref);
    if(!existing.exists||existing.data().status!=='active')throw new Error('Nessuna assegnazione attiva');
    tx.update(ref,{status:'released',releasedBy:cloud().user.uid,releasedAt:firebase.firestore.FieldValue.serverTimestamp()});
   });
  },
  watchVehicles(cb,onError){return onCollection('pianoNeveVehicles',cb,onError)},
  watchTeams(cb,onError){return onCollection('pianoNeveTeams',cb,onError)},
  watchAssignments(cb,onError){return onCollection('pianoNeveAssignments',cb,onError)},
  watchPositions(cb,onError){return onCollection('pianoNeveLivePositions',cb,onError)},
  watchOwnAssignments(cb,onError){
   const u=requireUser();
   return collection('pianoNeveAssignments').where('operatorUid','==',u.uid).onSnapshot(s=>cb(s.docs.map(d=>Object.assign({id:d.id},d.data()))),onError||console.error);
  },
  async publishPosition(position,assignment){
   const u=requireUser();
   if(!core.validPosition(position)||!core.canTrack(assignment,u.uid,assignment?.routeId))throw new Error('Tracciamento non autorizzato');
   const data={uid:u.uid,routeId:assignment.routeId,routeKey:assignment.routeId.replace(':','_'),teamId:assignment.teamId,vehicleId:assignment.vehicleId,lat:position.lat,lng:position.lng,accuracy:position.accuracy,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
   await collection('pianoNeveLivePositions').doc(u.uid).set(data);
  },
  async clearOwnPosition(){
   const u=requireUser();await collection('pianoNeveLivePositions').doc(u.uid).delete();
  }
 };
 root.VargaSnowOperationsCloud=api;
})(window);
