/* Phase 2 operator sharing and admin operations center. No telemetry before opt-in. */
(function(root){
 'use strict';
 const core=root.VargaSnowOperationsCore,api=root.VargaSnowOperationsCloud;
 if(!core||!api)return;
 const style=document.createElement('style');
 style.textContent=`
 #snowOpsOpen{position:fixed;top:72px;left:12px;z-index:1500;border:0;border-radius:12px;padding:11px;background:#0c344a;color:white;font:700 13px system-ui}
 #snowOpsPanel[hidden],#snowOpsOpen[hidden],#snowOpsConsent[hidden]{display:none!important}
 #snowOpsPanel{position:fixed;inset:0;z-index:18000;background:#061724eb;color:#eaf6ff;padding:12px;overflow:auto;font:14px system-ui}
 #snowOpsPanel *{box-sizing:border-box}
 #snowOpsPanel .opsBody{width:min(1060px,100%);margin:auto;background:#102b3b;border:1px solid #426476;border-radius:18px;padding:14px}
 #snowOpsPanel button,#snowOpsPanel select,#snowOpsPanel input{border-radius:9px;border:1px solid #526d7e;padding:10px;font:inherit}
 #snowOpsPanel button{background:#246b91;color:white;cursor:pointer}
 #snowOpsPanel input,#snowOpsPanel select{background:#072132;color:white;width:100%}
 #snowOpsPanel label{display:grid;gap:5px}
 #snowOpsPanel .opsGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
 #snowOpsPanel .opsCard{background:#18384a;border-radius:12px;padding:12px;display:grid;gap:8px}
 #snowOpsPanel #snowOpsMap{height:300px;border-radius:12px;overflow:hidden;margin:12px 0}
 #snowOpsPanel #snowOpsSummary{padding:10px 0}
 #snowOpsPanel .opsRows{display:grid;gap:6px;margin:9px 0}
 #snowOpsPanel .opsRow{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #355163;padding:8px}
 #snowOpsConsent{position:fixed;bottom:105px;left:12px;z-index:1400;background:#092b40;color:white;border-radius:12px;padding:10px;max-width:220px;box-shadow:0 7px 25px #0005;font:12px system-ui}
 #snowOpsConsent label{display:flex;gap:8px;align-items:center}
 #snowOpsConsent p{margin:5px 0}
 `;
 document.head.appendChild(style);
 const button=document.createElement('button');button.id='snowOpsOpen';button.textContent='🚜 Centrale operativa';button.hidden=true;document.body.appendChild(button);
 const panel=document.createElement('section');panel.id='snowOpsPanel';panel.hidden=true;
 panel.innerHTML=`<div class="opsBody"><header style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><strong style="font-size:21px">Centrale operativa neve</strong><p>Squadre, mezzi e assegnazione percorsi · Fase 2</p></div><button id="opsClose">Chiudi</button></header><p id="opsError" role="status"></p><div id="snowOpsMap" aria-label="Posizioni autorizzate delle squadre"></div><div id="snowOpsSummary"></div><div class="opsGrid"><form id="opsVehicleForm" class="opsCard"><strong>Registra mezzo</strong><label>ID mezzo<input name="vehicleId" required pattern="[A-Za-z0-9_-]{3,80}" placeholder="mezzo-01"></label><label>Descrizione<input name="name" required placeholder="Spargisale 1"></label><label>Targa<input name="plate" placeholder="Facoltativa"></label><button>Salva mezzo</button></form><form id="opsTeamForm" class="opsCard"><strong>Registra squadra</strong><label>ID squadra<input name="teamId" required pattern="[A-Za-z0-9_-]{3,80}" placeholder="squadra-01"></label><label>Nome<input name="name" required placeholder="Squadra 1"></label><label>UID Firebase operatore<input name="operatorUid" required placeholder="UID dell'operatore"></label><button>Salva squadra</button></form><form id="opsAssignmentForm" class="opsCard"><strong>Assegna percorso</strong><label>Percorso<select name="routeId"></select></label><label>Squadra<select name="teamId"></select></label><label>Mezzo<select name="vehicleId"></select></label><button>Assegna</button></form></div><h3>Assegnazioni attive</h3><div id="opsAssignments" class="opsRows"></div><h3>Mezzi e squadre registrate</h3><div id="opsRoster" class="opsRows"></div><small>Posizioni GPS condivise solo durante il giro e con consenso operativo esplicito. I punti più vecchi di 2 minuti sono indicati come non aggiornati.</small></div>`;
 document.body.appendChild(panel);
 const consent=document.createElement('div');consent.id='snowOpsConsent';consent.hidden=true;
 consent.innerHTML='<strong>Condivisione posizione</strong><p id="opsMyAssignment">In attesa di assegnazione</p><label><input id="opsShareGps" type="checkbox"> Condividi GPS durante il giro</label><p id="opsShareStatus" role="status">Disattivata</p>';
 document.body.appendChild(consent);
 const $=id=>document.getElementById(id);
 let teams=[],vehicles=[],assignments=[],positions=[],map=null,markers=[],subscriptions=[],ownAssignments=[],lastSend=0,sending=false,enabled=false,assignmentsReady=false,adminMode=false,lastPublishedRoute=null;
 function message(txt){$('opsError').textContent=txt||''}
 function opt(name,items,label){
  const select=panel.querySelector('#opsAssignmentForm select[name="'+name+'"]');
  const old=select.value;
  select.replaceChildren();
  for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=label(item);select.appendChild(option)}
  if(items.some(x=>x.id===old))select.value=old;
 }
 function assignOptions(){
  opt('routeId',core.ROUTES,x=>x.label);
  opt('teamId',teams.filter(x=>x.active),x=>x.name+' · '+x.operatorUid);
  opt('vehicleId',vehicles.filter(x=>x.active),x=>x.name);
 }
 function renderRoster(){
  const list=$('opsRoster');list.replaceChildren();
  for(const item of [...teams.map(t=>({id:t.id,display:'👷 '+t.name+' · '+t.operatorUid})),...vehicles.map(v=>({id:v.id,display:'🚜 '+v.name+(v.plate?' · '+v.plate:'')}))]){const row=document.createElement('div');row.className='opsRow';row.textContent=item.display;list.appendChild(row)}
 }
 function renderAssignments(){
  const el=$('opsAssignments');el.replaceChildren();
  const active=assignments.filter(a=>a.status==='active');
  if(!active.length)el.textContent='Nessun percorso assegnato';
  for(const a of active){
   const line=document.createElement('div');line.className='opsRow';
   const details=document.createElement('span');details.textContent=(core.routeFor(a.routeId)?.label||a.routeId)+' · '+(teams.find(x=>x.id===a.teamId)?.name||a.teamId)+' · '+(vehicles.find(x=>x.id===a.vehicleId)?.name||a.vehicleId);
   const end=document.createElement('button');end.type='button';end.textContent='Libera';end.onclick=async()=>{if(!confirm('Liberare il percorso '+(core.routeFor(a.routeId)?.label||'')+'?'))return;try{await api.release(a.routeId);message('Percorso liberato')}catch(e){message(e.message)}};
   line.append(details,end);el.appendChild(line);
  }
 }
 function updateMap(){
  if(!map)return;
  for(const m of markers)map.removeLayer(m);
  markers=[];
  let live=0,stale=0;
  const permitted=new Map(assignments.filter(a=>a.status==='active').map(a=>[a.operatorUid,a]));
  for(const p of positions){
   const a=permitted.get(p.uid);
   if(!a||a.routeId!==p.routeId||!core.validPosition(p))continue;
   const time=p.updatedAt?.toMillis?.()||0,fresh=core.fresh(time);
   if(fresh)live++;else stale++;
   const point=L.circleMarker([p.lat,p.lng],{radius:9,color:fresh?'#14ac81':'#a0a5b0',fillColor:fresh?'#19cfa3':'#9099a2',fillOpacity:.9,weight:3}).addTo(map);
   const label=(core.routeFor(p.routeId)?.label||p.routeId)+' · '+(teams.find(x=>x.id===p.teamId)?.name||'Squadra')+' · '+(fresh?'GPS aggiornato':'Posizione non aggiornata');
   point.bindPopup(label);markers.push(point);
  }
  $('snowOpsSummary').textContent='Squadre in servizio: '+permitted.size+' · GPS aggiornati: '+live+' · Posizioni non aggiornate: '+stale;
 }
 function open(){panel.hidden=false;if(!map){map=L.map('snowOpsMap',{zoomControl:true}).setView([44.574,11.366],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map)}setTimeout(()=>{map.invalidateSize();updateMap()},50)}
 function close(){panel.hidden=true}
 button.onclick=open;$('opsClose').onclick=close;
 // Freshness changes with time even when the server emits no new events.
 setInterval(()=>{if(!panel.hidden)updateMap()},30000);
 async function formSubmit(fn,form){try{message('Salvataggio…');await fn(new FormData(form));form.reset();message('Salvato')}catch(e){message('Errore: '+e.message)}}
 $('opsVehicleForm').onsubmit=e=>{e.preventDefault();formSubmit(async d=>api.upsertVehicle(d.get('vehicleId'),{name:d.get('name'),plate:d.get('plate')}),e.currentTarget)};
 $('opsTeamForm').onsubmit=e=>{e.preventDefault();formSubmit(async d=>api.upsertTeam(d.get('teamId'),{name:d.get('name'),operatorUid:d.get('operatorUid')}),e.currentTarget)};
 $('opsAssignmentForm').onsubmit=e=>{e.preventDefault();formSubmit(async d=>{const team=teams.find(x=>x.id===d.get('teamId'));if(!team)throw new Error('Scegli una squadra');await api.assign({routeId:d.get('routeId'),teamId:team.id,vehicleId:d.get('vehicleId'),operatorUid:team.operatorUid})},e.currentTarget)};
 function clearSubscriptions(){for(const u of subscriptions)try{u()}catch(e){}subscriptions=[]}
 function onAuth(e){
  clearSubscriptions();lastPublishedRoute=null;button.hidden=true;consent.hidden=true;enabled=false;assignmentsReady=false;adminMode=false;$('opsShareGps').checked=false;
  const role=e.detail?.role;adminMode=role==='admin';if(role==='admin'){
   button.hidden=false;
   for(const [name,callback] of [['watchVehicles',v=>{vehicles=v;assignOptions();renderRoster()}],['watchTeams',v=>{teams=v;assignOptions();renderRoster()}],['watchAssignments',v=>{assignments=v;renderAssignments();updateMap()}],['watchPositions',v=>{positions=v;updateMap()}]]){
    try{subscriptions.push(api[name](callback,err=>message('Lettura non autorizzata: '+err.message)))}catch(ex){message(ex.message)}
   }
  }
  if(role==='operatore'||role==='ufficio'||role==='admin'){
   consent.hidden=false;
   try{subscriptions.push(api.watchOwnAssignments(v=>{assignmentsReady=true;ownAssignments=v.filter(a=>a.status==='active');if(lastPublishedRoute&&!ownAssignments.some(a=>a.routeId===lastPublishedRoute)){enabled=false;$('opsShareGps').checked=false;lastPublishedRoute=null;void api.clearOwnPosition().catch(()=>{})}$('opsMyAssignment').textContent=ownAssignments.length?ownAssignments.map(a=>core.routeFor(a.routeId)?.label||a.routeId).join(', '):'Nessun percorso attivo';if(!ownAssignments.length){enabled=false;$('opsShareGps').checked=false;void api.clearOwnPosition().catch(()=>{})}},err=>{assignmentsReady=false;enabled=false;$('opsShareGps').checked=false;$('opsShareStatus').textContent='Assegnazioni non verificabili: '+err.message}))}catch(err){$('opsShareStatus').textContent=err.message}
  }
 }
 root.addEventListener('varga-auth-ready',onAuth);
 root.addEventListener('varga-auth-logout',()=>{clearSubscriptions();button.hidden=true;panel.hidden=true;consent.hidden=true;enabled=false;$('opsShareGps').checked=false;teams=[];vehicles=[];assignments=[];positions=[];ownAssignments=[];assignmentsReady=false;adminMode=false;if(map)updateMap()});
 $('opsShareGps').onchange=async e=>{
  enabled=e.target.checked&&ownAssignments.length>0&&assignmentsReady;
  e.target.checked=enabled;
  $('opsShareStatus').textContent=enabled?'Attiva solo durante il giro':'Disattivata';
  if(!enabled)try{await api.clearOwnPosition()}catch(err){$('opsShareStatus').textContent='Disattivata; rimozione GPS in attesa di rete'}
 };
 async function receiveGps(coords,working,routeId){
  if(!enabled||!working||document.hidden||!navigator.onLine||sending||Date.now()-lastSend<20000)return;
  const a=ownAssignments.find(a=>core.canTrack(a,root.VargaSnowCloud?.user?.uid,routeId));
  if(!a)return;
  const point={lat:coords.latitude,lng:coords.longitude,accuracy:coords.accuracy};
  if(!core.validPosition(point))return;
  lastSend=Date.now();sending=true;
  try{await api.publishPosition(point,a);lastPublishedRoute=routeId;$('opsShareStatus').textContent='GPS inviato · '+new Date().toLocaleTimeString('it-IT')}catch(e){$('opsShareStatus').textContent='Invio GPS non riuscito'}finally{sending=false}
 }
 async function endSharing(){lastPublishedRoute=null;enabled=false;$('opsShareGps').checked=false;$('opsShareStatus').textContent='Disattivata';try{await api.clearOwnPosition()}catch(e){}}
 function mayUseRoute(routeId){
   if(adminMode)return true;
   if(!assignmentsReady)return false;
   return ownAssignments.some(a=>core.canTrack(a,root.VargaSnowCloud?.user?.uid,routeId));
 }
 function requireAssignedRoute(routeId){
   if(mayUseRoute(routeId))return true;
   const desc=core.routeFor(routeId)?.label||routeId;
   alert('Percorso '+desc+' non assegnato o assegnazioni non disponibili. Contatta la centrale operativa.');
   return false;
 }
 root.VargaSnowOperationsUI={receiveGps,endSharing,mayUseRoute,requireAssignedRoute};
})(window);
