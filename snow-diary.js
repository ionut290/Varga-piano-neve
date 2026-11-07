(function(){
'use strict';
// Varga Piano Neve: diario operativo. Le dichiarazioni dell'operatore
// non sostituiscono la rilevazione automatica del GPS o i sensori sui mezzi.
const SERVICE_LABELS={lama:'Lama spazzaneve',sale:'Salatura',manuale:'Lavoro manuale'};
const ISSUE_LABELS={ostacolo:'Ostacolo / strada chiusa',ghiaccio:'Ghiaccio pericoloso',neve:'Accumulo neve',mezzo:'Problema al mezzo',altro:'Altro'};
const byId=id=>document.getElementById(id);
const menu=byId('majorMoreMenu');
const app=byId('snowApp');
if(!menu||!app)return;
const openButton=document.createElement('button');
openButton.id='openSnowDiary';
openButton.className='adminArchiveBtn';
openButton.textContent='📋 DIARIO OPERATIVO E RAPPORTINO';
const updateButton=byId('forceUpdateApp');
if(updateButton)menu.insertBefore(openButton,updateButton);else menu.appendChild(openButton);
const overlay=document.createElement('section');
overlay.id='snowDiary';
overlay.className='snowDiary';
overlay.hidden=true;
overlay.setAttribute('role','dialog');
overlay.setAttribute('aria-modal','true');
overlay.setAttribute('aria-labelledby','snowDiaryTitle');
overlay.innerHTML='<div class="snowDiarySheet">'+
'<header class="snowDiaryHeader"><div><b id="snowDiaryTitle">❄️ Diario operativo</b><small>Varga Piano Neve · rapporto del turno corrente</small></div><button type="button" id="snowDiaryClose" aria-label="Chiudi diario">✕</button></header>'+
'<div id="snowDiaryNotice" role="status" aria-live="polite"></div>'+
'<div class="snowDiaryMetrics"><div><small>Percorso</small><b id="snowDiaryRoute">—</b></div><div><small>Km rilevati</small><b id="snowDiaryKm">0,00</b></div><div><small>Sale residuo stimato</small><b id="snowDiarySalt">—</b></div></div>'+
'<p class="snowDiaryFootnote">I chilometri derivano dal GPS; il sale è una stima, non una misura certificata. I servizi sono dichiarati dall’operatore.</p>'+
'<section class="snowDiaryPanel" id="snowDiaryActions"><h3>Registra attività sul tratto</h3><p id="snowDiaryStreet">Tratto da selezionare</p>'+
'<div class="snowDiaryServices"><label><input type="checkbox" data-snow-service="lama"> 🚜 Lama</label><label><input type="checkbox" data-snow-service="sale"> 🧂 Salatura</label><label><input type="checkbox" data-snow-service="manuale"> 👷 A mano</label></div>'+
'<button type="button" id="snowDiarySaveServices" class="snowDiaryPrimary">SALVA ATTIVITÀ</button>'+
'<h3>Segnalazione sul tratto</h3><label for="snowDiaryIssueType">Tipo di problema</label>'+
'<select id="snowDiaryIssueType"><option value="ostacolo">Ostacolo / strada chiusa</option><option value="ghiaccio">Ghiaccio pericoloso</option><option value="neve">Accumulo neve</option><option value="mezzo">Problema al mezzo</option><option value="altro">Altro</option></select>'+
'<label for="snowDiaryIssueNote">Descrizione</label><textarea id="snowDiaryIssueNote" rows="2" maxlength="1000" placeholder="Descrivi il problema e la posizione"></textarea>'+
'<button type="button" id="snowDiarySaveIssue" class="snowDiaryPrimary">⚠ REGISTRA SEGNALAZIONE</button></section>'+
'<section class="snowDiaryPanel"><h3>Avanzamento per strada</h3><div id="snowDiaryStreets"></div></section>'+
'<section class="snowDiaryPanel"><h3>Segnalazioni del turno</h3><div id="snowDiaryIssues"></div></section>'+
'<div class="snowDiaryExports"><button type="button" id="snowDiaryCsv">⬇ ESPORTA CSV</button><button type="button" id="snowDiaryPrint">🖨 STAMPA / SALVA PDF</button></div>'+
'</div>';
app.appendChild(overlay);
const text=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value)};
const dateTime=value=>{if(!value)return '—';const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('it-IT'):'—'};
const clean=v=>String(v===null||v===undefined?'':v);
const activeIndex=()=>Number.isInteger(activeStreetIndex)?activeStreetIndex:majorPi;
function snapshot(){
 const route=majorRoutes[majorRi]||{streets:[]};
 const records=streetWorkState&&typeof streetWorkState==='object'?streetWorkState:{};
 const streets=(route.streets||[]).map((street,i)=>{
  const rec=records[String(i)]||{};
  return {index:i,name:street.name||('Tratto '+(i+1)),status:rec.status||(majorDone.has(majorRi+'-'+i)?'completata':'da_fare'),
   meters:Number(rec.coveredMeters)||0,percent:Number(rec.completionPercent)||0,
   services:rec.services||{},started:rec.startAtClient||'',ended:rec.endAtClient||'',
   issues:Array.isArray(rec.issues)?rec.issues:[]};
 });
 let salt='—';
 try{const estimate=currentSaltEstimate();if(estimate)salt=Math.round(estimate.remainingKg)+' kg';}catch(e){}
 return {route:route.name||('Percorso '+(majorRi+1)),routeCode:route.code||'',tourId:streetWorkTourId||'',
  km:(Number(mapState.meters)||0)/1000,salt,streets,active:!!mapState.active,paused:!!mapState.paused,
  createdAt:new Date().toISOString()};
}
function labelForStatus(status){
 return ({completata:'Completata',in_corso:'In corso',in_pausa:'In pausa',parziale:'Parziale',da_fare:'Da fare'})[status]||clean(status);
}
function appendLine(box,title,detail){
 const item=document.createElement('div');item.className='snowDiaryLine';
 const b=document.createElement('b');b.textContent=title;
 const span=document.createElement('span');span.textContent=detail;
 item.append(b,span);box.appendChild(item);
}
function render(){
 const data=snapshot();
 text('snowDiaryRoute',data.route);
 text('snowDiaryKm',data.km.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}));
 text('snowDiarySalt',data.salt);
 const index=activeIndex(),current=data.streets[index];
 text('snowDiaryStreet',current?'Tratto: '+current.name:'Nessun tratto selezionato');
 const disabled=!data.active||!current||currentMode!=='major';
 byId('snowDiaryActions').classList.toggle('snowDiaryDisabled',disabled);
 byId('snowDiarySaveServices').disabled=disabled;
 byId('snowDiarySaveIssue').disabled=disabled;
 overlay.querySelectorAll('[data-snow-service]').forEach(input=>{
  input.disabled=disabled;
  input.checked=!!current?.services?.[input.dataset.snowService];
 });
 const streetList=byId('snowDiaryStreets');streetList.replaceChildren();
 data.streets.forEach(s=>{
  const types=Object.entries(SERVICE_LABELS).filter(([key])=>s.services[key]).map(([,v])=>v);
  appendLine(streetList,(s.index+1)+'. '+s.name,labelForStatus(s.status)+' · '+s.percent.toLocaleString('it-IT')+'% · '+Math.round(s.meters)+' m'+(types.length?' · '+types.join(', '):''));
 });
 const issues=byId('snowDiaryIssues');issues.replaceChildren();
 let count=0;
 data.streets.forEach(s=>s.issues.forEach(issue=>{
  count++;
  const pos=Array.isArray(issue.position)?' · GPS '+issue.position.map(n=>Number(n).toFixed(5)).join(', '):' · GPS non disponibile';
  appendLine(issues,(ISSUE_LABELS[issue.type]||'Segnalazione')+' · '+s.name,dateTime(issue.time)+' · '+clean(issue.note)+pos);
 }));
 if(!count)appendLine(issues,'Nessuna segnalazione','Nessun problema registrato sul turno corrente.');
}
function notice(value){text('snowDiaryNotice',value)}
function saveChanges(record){
 try{queueStreetRecord(record);flushStreetWorkQueue(true);notice('Salvato sul telefono. La sincronizzazione avviene quando la connessione è disponibile.');return true}
 catch(e){console.error('Diario neve',e);notice('Non è stato possibile salvare i dati: '+(e.message||e));return false}
}
function saveServices(){
 if(currentMode!=='major'||!mapState.active){notice('Avvia prima un giro della viabilità maggiore.');return}
 const rec=streetRecord(activeIndex());if(!rec){notice('Seleziona un tratto valido.');return}
 const services={};overlay.querySelectorAll('[data-snow-service]').forEach(input=>{services[input.dataset.snowService]=input.checked});
 rec.services=services;
 const events=Array.isArray(rec.serviceEvents)?rec.serviceEvents:[];
 events.push({time:new Date().toISOString(),services:Object.assign({},services),source:'operatore'});
 rec.serviceEvents=events.slice(-150);
 if(saveChanges(rec))render();
}
function saveIssue(){
 if(currentMode!=='major'||!mapState.active){notice('Avvia prima un giro della viabilità maggiore.');return}
 const rec=streetRecord(activeIndex());if(!rec){notice('Seleziona un tratto valido.');return}
 const type=byId('snowDiaryIssueType').value;
 const note=byId('snowDiaryIssueNote').value.trim();
 if(!note){notice('Inserisci una descrizione del problema.');byId('snowDiaryIssueNote').focus();return}
 const position=Array.isArray(mapState.current)&&mapState.current.every(Number.isFinite)?mapState.current.map(Number):null;
 const issues=Array.isArray(rec.issues)?rec.issues:[];
 issues.push({id:'issue-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),type,note,time:new Date().toISOString(),position,source:'operatore'});
 rec.issues=issues;
 if(saveChanges(rec)){byId('snowDiaryIssueNote').value='';render()}
}
function csvEscape(value){
 let v=clean(value);
 // Impedisce interpretazioni come formule in Excel o LibreOffice.
 if(/^[=+@\-\t\r]/.test(v.trimStart()))v="'"+v;
 return '"'+v.replace(/"/g,'""')+'"';
}
function exportCsv(){
 const data=snapshot(),header=['Data export','ID giro','Percorso','Strada','Stato','Avanzamento %','Metri GPS','Lama','Salatura','Manuale','Inizio','Fine','Numero segnalazioni','Dettagli segnalazioni'];
 const rows=[header];
 data.streets.forEach(s=>rows.push([dateTime(data.createdAt),data.tourId,data.route,s.name,labelForStatus(s.status),s.percent,Math.round(s.meters),s.services.lama?'SI':'NO',s.services.sale?'SI':'NO',s.services.manuale?'SI':'NO',dateTime(s.started),dateTime(s.ended),s.issues.length,s.issues.map(i=>(ISSUE_LABELS[i.type]||i.type)+' '+dateTime(i.time)+': '+i.note).join(' | ')]));
 const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvEscape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Diario-Piano-Neve-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 notice('CSV del turno corrente preparato sul dispositivo.');
}
function open(){
 if(typeof setMajorMore==='function')setMajorMore(false);
 overlay.hidden=false;
 notice(!mapState.active?'Rapporto consultabile. Per registrare nuove attività avvia un giro.':'');
 render();
 const close=byId('snowDiaryClose');if(close)close.focus();
}
function close(){overlay.hidden=true;openButton.focus()}
openButton.addEventListener('click',open);
byId('snowDiaryClose').addEventListener('click',close);
byId('snowDiarySaveServices').addEventListener('click',saveServices);
byId('snowDiarySaveIssue').addEventListener('click',saveIssue);
byId('snowDiaryCsv').addEventListener('click',exportCsv);
byId('snowDiaryPrint').addEventListener('click',()=>{render();window.print()});
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
window.VargaSnowDiary={open,render,snapshot};
})();