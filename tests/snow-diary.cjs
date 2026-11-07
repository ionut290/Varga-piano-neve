const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('snow-diary.js','utf8');
new vm.Script(source); // Check syntax in isolation.
const nodes=new Map();
class Element {
 constructor(tag='div'){
  this.tagName=tag;this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.textContent='';this.dataset={};this.children=[];this.handlers={};
  this.classList={toggle(){},add(){},remove(){}};
 }
 set innerHTML(html){
  this._html=html;
  for(const match of html.matchAll(/id="([^"]+)"/g)){const e=new Element('div');e.id=match[1];nodes.set(e.id,e);}
  this.services=['lama','sale','manuale'].map(key=>{const e=new Element('input');e.dataset.snowService=key;return e});
 }
 get innerHTML(){return this._html||''}
 setAttribute(){}
 addEventListener(type,callback){this.handlers[type]=callback}
 append(...children){this.children.push(...children)}
 appendChild(child){this.children.push(child);return child}
 insertBefore(child){this.children.push(child);return child}
 replaceChildren(...children){this.children=children}
 querySelectorAll(selector){return selector==='[data-snow-service]'?(this.services||[]):[]}
 focus(){}
 click(){if(this.handlers.click)this.handlers.click()}
 remove(){}
}
for(const id of ['majorMoreMenu','snowApp','forceUpdateApp'])nodes.set(id,new Element());
const doc={
 getElementById:id=>nodes.get(id)||null,
 createElement:tag=>new Element(tag),
 addEventListener(){},
 body:new Element('body')
};
const records={},saved=[];
const scope={
 document:doc,window:{print(){scope.printed=true}},console,
 majorRoutes:[{name:'Percorso Rosso',code:'R',streets:[{name:'Via Roma'},{name:'Via Verdi'}]}],
 majorRi:0,majorPi:0,activeStreetIndex:0,currentMode:'major',
 streetWorkState:records,streetWorkTourId:'giro-test',majorDone:new Set(),
 mapState:{active:true,paused:false,meters:350,current:[44.5,11.35]},
 currentSaltEstimate:()=>({remainingKg:100}),setMajorMore(){},
 streetRecord:i=>records[String(i)]??=( {recordId:'r'+i,coveredMeters:0,completionPercent:0,status:'in_corso'}),
 queueStreetRecord:r=>saved.push(JSON.parse(JSON.stringify(r))),
 flushStreetWorkQueue(){},Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
 setTimeout(){},Date,Math,Number,String,Array,Object
};
vm.createContext(scope);
vm.runInContext(source,scope);
assert.ok(scope.window.VargaSnowDiary);
scope.window.VargaSnowDiary.open();
let data=scope.window.VargaSnowDiary.snapshot();
assert.equal(data.route,'Percorso Rosso');
assert.equal(data.km,0.35);
const overlay=nodes.get('snowApp').children[0];
assert.equal(overlay.hidden,false);
overlay.services[0].checked=true;overlay.services[1].checked=true;
nodes.get('snowDiarySaveServices').click();
assert.equal(records['0'].services.lama,true);
assert.equal(records['0'].services.sale,true);
assert.equal(records['0'].services.manuale,false);
nodes.get('snowDiaryIssueType').value='ghiaccio';
nodes.get('snowDiaryIssueNote').value='Ghiaccio sul ponte';
nodes.get('snowDiarySaveIssue').click();
assert.equal(records['0'].issues[0].type,'ghiaccio');
assert.equal(records['0'].issues[0].note,'Ghiaccio sul ponte');
assert.equal(records['0'].issues[0].position.join(','),'44.5,11.35');
assert.equal(saved.length,2);
nodes.get('snowDiaryCsv').click();
nodes.get('snowDiaryPrint').click();
assert.equal(scope.printed,true);
assert.equal(scope.window.VargaSnowDiary.snapshot().streets.length,2);
console.log('PASS: syntax, dashboard, mode lama/sale, anomaly GPS, CSV and print');
