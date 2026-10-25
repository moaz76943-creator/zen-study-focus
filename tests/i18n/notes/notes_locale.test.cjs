'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const base=path.resolve(__dirname,'../../../android/app/src/main/assets/web');
const source=name=>fs.readFileSync(path.join(base,name),'utf8');
function notesHarness(){
 const nodes=new Map();
 function get(id){
  if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',placeholder:'',dir:'',hidden:false,
   options:[{textContent:''},{textContent:''},{textContent:''}],
   classList:{contains:()=>true,add(){}},appendChild(){},replaceChildren(){},
   setAttribute(k,v){this[k]=v},focus(){}});
  return nodes.get(id);
 }
 get('noteModal').classList.contains=()=>true;
 const cfg={lang:'en'},records=[{id:7,title:'عنوان ٧ <img>',body:'私の ١٢٣',isStarter:false}];
 const translations={de:{tpl_cornell_title:'Cornell-Notizen',tpl_cornell_description:'Strukturierte Mitschrift',
 tpl_cornell_body:'FRAGEN\n\nNOTIZEN\n\nZUSAMMENFASSUNG'}};
 const context={cfg,notesList:records,noteTagFilter:'all',selectedCalDate:'2026-10-25',todayISO:'2026-10-25',
  document:{getElementById:get,querySelector:()=>null,createElement(tag){return {tag,type:'',title:'',textContent:'',appendChild(){},
   setAttribute(){},addEventListener(){},dataset:{}}},querySelectorAll:()=>[]},
  window:{DeepFocusNotesEditorUI:{renderStack:()=>true,onTemplate(){}}},
  DF99Locale:{t:(lang,family,key,fallback)=>translations[lang]?.[key]??fallback},
  confirm:()=>true,localDateISO:()=> '2026-10-25',nsScheduleDraft(){},toWest:s=>s,
  renderCalendar(){},getNoteTagLabel:()=>'',showToast(){},saveFortressData(){},closeModal(){},nextRecordId:()=>8};
 vm.createContext(context);vm.runInContext(source('notes_studio.js'),context,{timeout:1000});
 return {context,get,records,translations,run:x=>vm.runInContext(x,context)};
}
test('all 12 existing template IDs remain stable and get localized titles, descriptions and bodies',()=>{
 const h=notesHarness();
 assert.deepEqual(Array.from(h.run('NS_TEMPLATES.map(t=>t[0])')),
  ['cornell','recall','reading','meeting','project','workout','brainstorm','checklist','lecture','weekly','decision','journal']);
 assert.equal(h.run("nsTemplateText('cornell','title')"),'Structured notes');
 assert.match(h.run("nsTemplateText('cornell','description')"),/note|structure/i);
 h.context.cfg.lang='de';
 assert.equal(h.run("nsTemplateText('cornell','title')"),'Cornell-Notizen');
 assert.equal(h.run("nsTemplateText('cornell','body')"),h.translations.de.tpl_cornell_body);
 assert.equal(h.run("nsTemplateText('cornell','description')"),'Strukturierte Mitschrift');
});
test('changing the language updates UI direction but never rewrites note fields or draft values',()=>{
 const h=notesHarness();
 const title=h.get('inpNoteTitle'),body=h.get('inpNoteBody');
 title.value='Meine Notiz ٥';body.value='مرحبا ٣ <img src=x onerror=alert(1)>';
 h.context.cfg.lang='ar';h.run('nsApplyLabels()');
 assert.equal(h.get('sec-notes').dir,'rtl');
 assert.equal(h.get('noteModal').dir,'rtl');
 h.context.cfg.lang='de';h.run('nsApplyLabels()');
 assert.equal(h.get('sec-notes').dir,'ltr');
 assert.equal(title.value,'Meine Notiz ٥');assert.equal(body.value,'مرحبا ٣ <img src=x onerror=alert(1)>');
});
test('using a template fills the selected language, never silently replaces existing text',()=>{
 const h=notesHarness();h.context.cfg.lang='de';
 const body=h.get('inpNoteBody'),title=h.get('inpNoteTitle');
 h.run("nsUseTemplate('cornell')");
 assert.equal(body.value,h.translations.de.tpl_cornell_body);
 assert.equal(title.value,'Cornell-Notizen');
 h.context.confirm=()=>false;body.value='Personal text';
 h.run("nsUseTemplate('recall')");
 assert.equal(body.value,'Personal text');
});
test('rendering saved note text does not normalize authored numeral scripts',()=>{
 const src=source('notes_studio.js');
 assert.doesNotMatch(src,/toWest\(n\.(?:title|body)\s*\|\|/);
 assert.doesNotMatch(src,/toWest\(document\.getElementById\('inpNote(?:Title|Body)'\)/);
});
test('rich editor resolves approved locale keys without changing the note model',()=>{
 const UI=require(path.join(base,'notes_editor_ui.js'));
 const previous=globalThis.DF99Locale;
 try{
  globalThis.DF99Locale={t:(loc,fam,key,fallback)=>loc==='de'&&fam==='notes'&&key==='editor_archive'?'Archiv':fallback};
  assert.equal(UI.translate('de','archive'),'Archiv');
  assert.equal(UI.translate('fr','archive'),'Archive');
  assert.equal(UI.translate('ar','archive'),'الأرشيف');
 }finally{if(previous===undefined)delete globalThis.DF99Locale;else globalThis.DF99Locale=previous;}
});
test('draft messages use approved translations; draft storage key and payload schema remain unchanged',()=>{
 const src=source('notes_drafts.js'),ctx={cfg:{lang:'de'},DF99Locale:{t:(l,f,k,fallback)=>k==='draft_restore'?'Entwurf wiederherstellen':fallback},
  document:{getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}}};
 vm.createContext(ctx);vm.runInContext(src,ctx,{timeout:1000});
 assert.equal(vm.runInContext("nsDraftLabel('restore')",ctx),'Entwurf wiederherstellen');
 assert.match(src,/deep_focus_unsaved_note_draft_v1/);
 assert.match(src,/v:1,editId:/);
});


test('template confirmation also protects unsaved structured Cornell fields',()=>{
 const h=notesHarness();
 let accepted=false;
 h.context.window.DeepFocusNotesEditorUI.draftFields=()=>({
  cornell:{cues:'Private question',notes:'Private notes',summary:'Private summary'}});
 h.context.window.DeepFocusNotesEditorUI.onTemplate=()=>{accepted=true;};
 h.context.confirm=()=>false;
 h.run("nsUseTemplate('cornell')");
 assert.equal(h.get('inpNoteBody').value,'');
 assert.equal(accepted,false);
});
test('editor modal heading and save action retranslate without closing an open draft',()=>{
 const h=notesHarness();
 h.get('inpNoteBody').value='Unfinished draft';
 h.context.cfg.lang='ar';h.run('nsApplyLabels()');
 assert.equal(h.get('nsEditorHeading').textContent,'ملاحظة جديدة');
 assert.equal(h.get('nsSaveButton').textContent,'حفظ الملاحظة');
 assert.equal(h.get('inpNoteBody').value,'Unfinished draft');
});
