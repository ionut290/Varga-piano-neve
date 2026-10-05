const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('app.js','utf8');
// Parse the entire application: a syntax error anywhere prevents ALL handlers from attaching.
new vm.Script(src);
const elements={},groups={};
function el(id){return elements[id]??={hidden:false,dataset:{},addEventListener(type,fn){this[type]=fn}}}
for(const [selector,key,count] of [['[data-start-mode]','startMode',2],['[data-start-major-route]','startMajorRoute',3],['[data-start-minor-route]','startMinorRoute',4]])groups[selector]=Array.from({length:count},(_,i)=>({...el(selector+i),dataset:{[key]:key==='startMode'?['major','minor'][i]:String(i)}}));
let chosen=null,tab=null;
const c={$:el,document:{querySelectorAll:s=>groups[s],querySelector:s=>({click(){tab=s}})},readMajorWorkSession:()=>null,chooseMajorRoute:async i=>{chosen=Number(i);return true},routes:[{},{},{},{}],localStorage:{setItem(){}},drawRoute(){},ri:0,pi:0};
vm.createContext(c);vm.runInContext(src.slice(src.indexOf('let startupMode=null;'),src.indexOf('function majorSearchName')),c);
const event={preventDefault(){},stopPropagation(){}};
(async()=>{c.initStartupSelection();assert.equal(el('startupRouteStep').hidden,true);
for(let i=0;i<3;i++){groups['[data-start-mode]'][0].onclick(event);assert.equal(el('startupModeStep').hidden,true);assert.equal(el('startupMajorRoutes').hidden,false);assert.equal(el('startupMinorRoutes').hidden,true);await groups['[data-start-major-route]'][i].onclick();assert.equal(chosen,i);assert.equal(el('startupChooser').hidden,true);assert.match(tab,/major/);el('startupBack').onclick();}
groups['[data-start-mode]'][1].touchend(event);assert.equal(el('startupMajorRoutes').hidden,true);assert.equal(el('startupMinorRoutes').hidden,false);await groups['[data-start-minor-route]'][3].onclick();assert.equal(c.ri,3);assert.match(tab,/minor/);console.log('PASS: whole-app syntax, major click, all three routes, back, minor touch and route selection');})().catch(e=>{console.error(e);process.exitCode=1});
