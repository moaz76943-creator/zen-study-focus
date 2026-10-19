'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
function rig(){
 const packets=new Map(),writes=[];let failure=null;
 const c=vm.createContext({cfg:{lang:'ar',todayMins:0,sessions:0,water:0,streak:0,unknown:7},
  tasksList:[{id:1,title:'قديم',done:false}],notesList:[{id:2,title:'قديم',body:'لا تمسح'}],
  LANG_CATALOG:[{code:'ar'},{code:'en'}],Number,Date,Map,Set,Buffer,
  localStorage:{getItem:k=>packets.get(k)??null,setItem(k,v){writes.push(k);if(failure&&failure(k))throw Error('QuotaExceededError');packets.set(k,String(v));},removeItem:k=>packets.delete(k)},
  confirmSensitiveAction:()=>true,showToast(){},closeModal(){},syncDailyRollover(){},applyLanguage(){},
  atob:s=>Buffer.from(s,'base64').toString('binary')
 });c.window=c;
 vm.runInContext('({cfg,tasksList,notesList}=JSON.parse(JSON.stringify({cfg,tasksList,notesList})));',c);
 for(const file of ['data_compat_v21.js','integration_v22.js'])vm.runInContext(fs.readFileSync(path.join(web,file),'utf8'),c,{filename:file});
 vm.runInContext(app.slice(app.indexOf('const SECRET_SALT ='),app.indexOf('function saveFortressData(')),c);
 vm.runInContext(app.slice(app.indexOf('function validateImportedBackup('),app.indexOf('function openCloudBackupModal(')),c);
 const run=s=>vm.runInContext(s,c),D=c.DeepFocusDataCompatV21;
 const initial=run('JSON.stringify({cfg,tasksList,notesList})');
 for(const [field,key] of [['cfg',D.KEYS.cfg],['tasksList',D.KEYS.tasks],['notesList',D.KEYS.notes]]){
  const packet=D.encodePacket(JSON.parse(initial)[field]);packets.set(key,packet);packets.set(key+'_mirror',packet);
 }
 const incoming={cfg:{lang:'ar',todayMins:5,sessions:1,water:0,streak:0,extra:'keep'},tasksList:[{id:40,title:'مهمة ٢',done:false,extra:3}],notesList:[{id:50,title:'جديد',body:'محتوى ٣',extra:9}]};
 const code=value=>{const bundle=JSON.stringify({...value,v:21});return 'ZEN21::'+Buffer.from(JSON.stringify({bundle,sig:D.computeHash(bundle)})).toString('base64');};
 return {c,D,run,packets,writes,initial,incoming,code,fail(fn){failure=fn;}};
}
test('live legacy restore uses the actual six-packet journal, preserving numeric IDs and unknown fields',()=>{
 const r=rig();assert.equal(r.run('verifyAndRestoreBackupCode('+JSON.stringify(r.code(r.incoming))+')'),true);
 assert.equal(r.writes[0],r.D.JOURNAL_KEY);assert.equal(r.packets.has(r.D.JOURNAL_KEY),false);
 assert.equal(r.D.inspectStorage(r.c.localStorage).snapshot.notesList[0].extra,9);
 assert.equal(r.run('notesList[0].id'),50);assert.equal(r.run('tasksList[0].title'),'مهمة ٢');
});
test('failed live restore rolls back bytes and does not publish imported records',()=>{
 const r=rig(),before=[...r.packets];let once=true;r.fail(k=>k===r.D.KEYS.notes+'_mirror'&&once?(once=false,true):false);
 assert.equal(r.run('verifyAndRestoreBackupCode('+JSON.stringify(r.code(r.incoming))+')'),false);
 assert.deepEqual([...r.packets],before);assert.equal(r.run('JSON.stringify({cfg,tasksList,notesList})'),r.initial);
});
test('ambiguous imported IDs never write even a journal',()=>{
 const r=rig();r.incoming.tasksList.push({...r.incoming.tasksList[0]});
 assert.equal(r.run('verifyAndRestoreBackupCode('+JSON.stringify(r.code(r.incoming))+')'),false);assert.deepEqual(r.writes,[]);
});
