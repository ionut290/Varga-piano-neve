const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,deleteDoc,getDocs,collection,query,where,serverTimestamp}=require('firebase/firestore');
const port=Number(process.env.FIRESTORE_EMULATOR_PORT||8085);
let env;
function client(uid,email){
 return env.authenticatedContext(uid,{email,email_verified:true}).firestore();
}
async function seed(){
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await Promise.all([
    setDoc(doc(db,'platformUsers','op1'),{statoAccount:'attivo',role:'operatore'}),
    setDoc(doc(db,'platformUsers','op2'),{statoAccount:'attivo',role:'operatore'}),
    setDoc(doc(db,'platformUsers','admin1'),{statoAccount:'attivo',role:'admin'}),
    setDoc(doc(db,'platformUsers','office1'),{statoAccount:'attivo',role:'ufficio'}),
    setDoc(doc(db,'platformUsers','banned'),{statoAccount:'attivo',role:'admin',banned:true}),
    setDoc(doc(db,'platformUsers','pending'),{statoAccount:'in_attesa',role:'operatore'})
  ]);
 });
}
test('Firestore emulator roles and ownership',async t=>{
 env=await initializeTestEnvironment({projectId:'demo-varga-neve-phase1',firestore:{
  host:'127.0.0.1',port,
  rules:readFileSync('tests/firestore.phase1.rules','utf8')
 }});
 t.after(async()=>await env.cleanup());
 await seed();
 const a=client('op1','op1@example.test'),b=client('op2','op2@example.test');
 const admin=client('admin1','admin@example.test'),office=client('office1','office@example.test');
 const banned=client('banned','banned@example.test'),pending=client('pending','pending@example.test');
 const session={uid:'op1',userEmail:'op1@example.test',active:true,mode:'major'};
 const work={uid:'op1',userEmail:'op1@example.test',recordId:'tour-1-0',status:'in_corso'};
 await t.test('operator can save own session, not another user session',async()=>{
  await assertSucceeds(setDoc(doc(a,'pianoNeveUsers/op1/sessions/active'),session));
  await assertFails(getDoc(doc(b,'pianoNeveUsers/op1/sessions/active')));
  await assertFails(setDoc(doc(b,'pianoNeveUsers/op1/sessions/active'),{...session,uid:'op2'}));
 });
 await t.test('operator cannot forge record owner or overwrite others',async()=>{
  await assertSucceeds(setDoc(doc(a,'pianoNeveStreetWork/tour-1-0'),work));
  await assertFails(setDoc(doc(b,'pianoNeveStreetWork/tour-1-0'),{...work,uid:'op2',userEmail:'op2@example.test'}));
  await assertFails(setDoc(doc(a,'pianoNeveStreetWork/tour-1-1'),{...work,recordId:'tour-1-1',uid:'op2'}));
  await assertFails(setDoc(doc(a,'pianoNeveStreetWork/tour-1-2'),{...work,recordId:'tour-1-2',userEmail:'another@example.test'}));
  await assertSucceeds(getDoc(doc(admin,'pianoNeveStreetWork/tour-1-0')));
  await assertFails(getDoc(doc(b,'pianoNeveStreetWork/tour-1-0')));
 });
 await t.test('office cannot edit routes or see other users full sessions',async()=>{
  await assertFails(setDoc(doc(office,'pianoNeveRouteEdits/edit1'),{uid:'office1',userEmail:'office@example.test',editId:'edit1'}));
  await assertFails(getDoc(doc(office,'pianoNeveUsers/op1/sessions/active')));
  await assertSucceeds(getDocs(collection(office,'pianoNeveRouteEdits')));
 });
 await t.test('administrator can edit shared routes and read registry',async()=>{
  await assertSucceeds(setDoc(doc(admin,'pianoNeveRouteEdits/edit2'),{uid:'admin1',userEmail:'admin@example.test',editId:'edit2'}));
  await assertSucceeds(getDocs(collection(admin,'pianoNeveStreetWork')));
  await assertFails(setDoc(doc(admin,'pianoNeveUsers/op1/giri/tour1'),{uid:'op1',userEmail:'op1@example.test',archiveId:'tour1'}));
 });
 await t.test('disabled and unauthenticated accounts cannot write records',async()=>{
  await assertFails(setDoc(doc(banned,'pianoNeveStreetWork/bad1'),{uid:'banned',userEmail:'banned@example.test',recordId:'bad1'}));
  await assertFails(setDoc(doc(pending,'pianoNeveStreetWork/bad2'),{uid:'pending',userEmail:'pending@example.test',recordId:'bad2'}));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'pianoNeveRouteEdits/edit2')));
 });

 await t.test('Phase 2 fleet and team writes require administrator',async()=>{
  const truck={name:'Spargisale 1',plate:'TEST',active:true,updatedBy:'admin1'};
  const team={name:'Squadra 1',operatorUid:'op1',active:true,updatedBy:'admin1'};
  await assertSucceeds(setDoc(doc(admin,'pianoNeveVehicles/truck-01'),truck));
  await assertSucceeds(setDoc(doc(admin,'pianoNeveTeams/team-01'),team));
  await assertFails(setDoc(doc(a,'pianoNeveVehicles/truck-02'),{...truck,updatedBy:'op1'}));
  await assertFails(getDocs(collection(a,'pianoNeveTeams')));
  await assertSucceeds(getDocs(collection(admin,'pianoNeveVehicles')));
 });
 await t.test('Phase 2 exclusive route assignment is visible only to its operator',async()=>{
  const assignment={routeId:'major:0',operatorUid:'op1',teamId:'team-01',vehicleId:'truck-01',createdBy:'admin1',status:'active'};
  await assertSucceeds(setDoc(doc(admin,'pianoNeveAssignments/major_0'),assignment));
  await assertFails(setDoc(doc(a,'pianoNeveAssignments/major_1'),{...assignment,routeId:'major:1',createdBy:'op1'}));
  await assertFails(setDoc(doc(admin,'pianoNeveAssignments/major_1'),{...assignment,routeId:'major:0'}));
  await assertSucceeds(getDoc(doc(a,'pianoNeveAssignments/major_0')));
  await assertFails(getDoc(doc(b,'pianoNeveAssignments/major_0')));
  await assertSucceeds(getDocs(query(collection(a,'pianoNeveAssignments'),where('operatorUid','==','op1'))));
  await assertFails(getDocs(collection(a,'pianoNeveAssignments')));
 });
 await t.test('Phase 2 live position restricted to active assigned operator',async()=>{
  const gps={uid:'op1',routeId:'major:0',routeKey:'major_0',teamId:'team-01',vehicleId:'truck-01',lat:44.57,lng:11.36,accuracy:10,updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(a,'pianoNeveLivePositions/op1'),gps));
  await assertFails(setDoc(doc(b,'pianoNeveLivePositions/op1'),{...gps,uid:'op2'}));
  await assertFails(setDoc(doc(a,'pianoNeveLivePositions/op1'),{...gps,lat:100}));
  await assertFails(getDocs(collection(a,'pianoNeveLivePositions')));
  await assertSucceeds(getDocs(collection(admin,'pianoNeveLivePositions')));
  await assertSucceeds(setDoc(doc(admin,'pianoNeveAssignments/major_0'),{routeId:'major:0',operatorUid:'op1',teamId:'team-01',vehicleId:'truck-01',createdBy:'admin1',status:'released',releasedBy:'admin1'}));
  await assertFails(setDoc(doc(a,'pianoNeveLivePositions/op1'),gps));
  await assertSucceeds(deleteDoc(doc(a,'pianoNeveLivePositions/op1')));
  await assertSucceeds(setDoc(doc(admin,'pianoNeveAssignments/major_0'),{routeId:'major:0',operatorUid:'op2',teamId:'team-01',vehicleId:'truck-01',createdBy:'admin1',status:'active'}));
 });

});
