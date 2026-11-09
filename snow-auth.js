(function(){
'use strict';
const OWNER=['ionut29019@gmail.com'],ACTIVE=new Set(['attivo','active','approvato','approved']);
let auth=null,db=null,user=null,profile=null,role='',sessionWriteChain=Promise.resolve();
const CLIENT_KEY='pianoNeveClientId';
let clientId;
try{clientId=localStorage.getItem(CLIENT_KEY);if(!clientId){clientId='device-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random());localStorage.setItem(CLIENT_KEY,clientId)}}catch(e){clientId='session-'+Date.now()+'-'+Math.random()}
const SESSION_LEASE_MS=120000;
function sessionOwnedByAnother(data){
 const updated=data?.updatedAt?.toMillis?.()||0;
 return !!(data?.clientId&&data.clientId!==clientId&&Date.now()-updated<SESSION_LEASE_MS);
}

const $=id=>document.getElementById(id);
function message(v){const e=$('loginMessage');if(e)e.textContent=v||''}
function show(ok,text=''){document.body.classList.remove('auth-loading');document.body.classList.toggle('auth-ready',ok);document.body.classList.toggle('auth-locked',!ok);if($('loginScreen'))$('loginScreen').hidden=ok;if($('snowApp'))$('snowApp').hidden=!ok;const probe=$('bootProbe');if(probe)probe.remove();message(text)}
async function authorize(u){const s=await db.collection('platformUsers').doc(u.uid).get();profile=s.exists?s.data():null;const email=String(u.email||'').toLowerCase();if(OWNER.includes(email)){role='admin';return true}if(!profile||profile.banned===true)return false;const st=String(profile.statoAccount||profile.accountStatus||'').toLowerCase(),legacy=!st&&profile.profileMigratedByEmail!==false;if(!legacy&&!ACTIVE.has(st))return false;const r=String(profile.role||profile.ruolo||'').toLowerCase();role=r==='ufficio'?'ufficio':'operatore';return true}
function boot(){const cfg=window.VARGA_FIREBASE_CONFIG;if(!cfg||typeof firebase==='undefined'){show(false,'Configurazione accesso non disponibile.');return}const app=firebase.apps.find(a=>a.name==='vargaPianoNeve')||firebase.initializeApp(cfg,'vargaPianoNeve');auth=app.auth();db=app.firestore();auth.onAuthStateChanged(async u=>{user=u||null;if(!u){show(false);return}try{if(await authorize(u)){show(true);window.dispatchEvent(new CustomEvent('varga-auth-ready',{detail:{uid:u.uid,email:u.email,role}}))}else{show(false,'Account non autorizzato nel Varga Gestionale.');await auth.signOut()}}catch(e){console.warn(e);show(false,'Impossibile verificare autorizzazione.')}})}
async function emailLogin(){message('Accesso…');try{await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);await auth.signInWithEmailAndPassword($('loginEmail').value.trim(),$('loginPassword').value)}catch(e){message('Email o password non corrette.')}}
function startAuth(){try{boot();const lb=$('loginButton'),lp=$('loginPassword'),gb=$('loginGoogleButton');if(lb)lb.onclick=emailLogin;if(lp)lp.addEventListener('keydown',e=>{if(e.key==='Enter')emailLogin()});if(gb)gb.onclick=async()=>{try{await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){message('Accesso Google non riuscito.')}}}catch(e){console.error('Varga auth boot',e);show(false,'Errore avvio accesso: '+(e.message||e))}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startAuth,{once:true});else startAuth();
window.VargaSnowCloud={get user(){return user},get role(){return role},async saveSession(payload){
 if(!user)return false;
 const uid=user.uid,email=user.email||'',snapshot=JSON.parse(JSON.stringify(payload));
 const task=sessionWriteChain.catch(()=>{}).then(()=>db.runTransaction(async tx=>{
  const ref=db.collection('pianoNeveUsers').doc(uid).collection('sessions').doc('active'),existing=await tx.get(ref);
  if(existing.exists&&sessionOwnedByAnother(existing.data()))throw new Error('Sessione in uso su un altro dispositivo');
  tx.set(ref,Object.assign({},snapshot,{uid,userEmail:email,clientId,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),{merge:false});
 }));
 sessionWriteChain=task;await task;return true
},async loadSession(){
 if(!user)return null;
 await sessionWriteChain.catch(()=>{});
 const s=await db.collection('pianoNeveUsers').doc(user.uid).collection('sessions').doc('active').get();
 if(s.exists&&sessionOwnedByAnother(s.data()))throw new Error('Giro già attivo su un altro dispositivo');
 return s.exists?s.data():null
},async clearSession(){
 if(!user)throw new Error('Utente non autenticato');
 await sessionWriteChain;
 const ref=db.collection('pianoNeveUsers').doc(user.uid).collection('sessions').doc('active');
 await db.runTransaction(async tx=>{
  const existing=await tx.get(ref);
  if(existing.exists&&sessionOwnedByAnother(existing.data()))throw new Error('Giro attivo su un altro dispositivo');
  tx.delete(ref);
 })
},async archiveTour(payload){if(!user||role!=='admin')throw new Error('Solo amministratore');const tourId=String(payload.tourId||'tour-'+Date.now());const ref=db.collection('pianoNeveUsers').doc(user.uid).collection('giri').doc(tourId);await ref.set(Object.assign({},payload,{archiveId:ref.id,uid:user.uid,userEmail:user.email||'',archivedAt:firebase.firestore.FieldValue.serverTimestamp()}));return ref.id},async saveStreetProgress(id,payload){if(!user||!id)return false;await db.collection('pianoNeveStreetWork').doc(id).set(Object.assign({},payload,{recordId:id,uid:user.uid,userEmail:user.email||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),{merge:true});return id},async loadStreetWork(){if(!user||role!=='admin')throw new Error('Solo amministratore');const q=await db.collection('pianoNeveStreetWork').orderBy('updatedAt','asc').get();return q.docs.map(d=>Object.assign({recordId:d.id},d.data()))},async saveRouteEdit(payload){if(!user||role!=='admin')throw new Error('Solo amministratore');const ref=db.collection('pianoNeveRouteEdits').doc();await ref.set(Object.assign({},payload,{editId:ref.id,uid:user.uid,userEmail:user.email||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}));return ref.id},async loadRouteEdits(){if(!user)return[];const q=await db.collection('pianoNeveRouteEdits').orderBy('updatedAt','asc').get();return q.docs.map(d=>Object.assign({editId:d.id},d.data()))},async deleteRouteEdit(id){if(!user||role!=='admin')throw new Error('Solo amministratore');await db.collection('pianoNeveRouteEdits').doc(id).delete()},signOut(){return auth&&auth.signOut()}};
})();