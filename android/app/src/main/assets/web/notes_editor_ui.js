/* Deep Focus Notes UX v21 — opt-in interface. No storage access or side effects on import. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.DeepFocusNotesEditorUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const NOTE_LIMIT=500000;
  let instance=null;
  const validId=id=>Number.isSafeInteger(id)&&id>=0;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const cleanText=x=>typeof x==='string'?x:'';
  const words=s=>cleanText(s).trim().split(/\s+/u).filter(Boolean).length;
  function parseTags(text){
    const tags=cleanText(text).split(/[,،\n]/u).map(s=>s.trim()).filter(Boolean);
    if(tags.some(t=>t.length>120)||tags.length>100) throw new Error('Tag length or count exceeded');
    return [...new Set(tags)];
  }
  function findOccurrences(text,query){
    if(!query||!String(query).trim()) return [];
    const a=String(text).toLocaleLowerCase(),b=String(query).toLocaleLowerCase(),out=[];
    let i=0; while((i=a.indexOf(b,i))!==-1 && out.length<1000){out.push(i);i+=Math.max(1,b.length);}
    return out;
  }
  function formatSelection(text,start,end,kind){
    const s=String(text);start=Math.max(0,Math.min(s.length,start));end=Math.max(start,Math.min(s.length,end));
    const prefix={heading:'# ',bullet:'- ',check:'☐ ',number:'1. ',quote:'> '}[kind];
    if(!prefix) throw new Error('Unknown formatting action');
    const lineStart=s.lastIndexOf('\n',start-1)+1;
    const lineEndIndex=s.indexOf('\n',end);
    const lineEnd=lineEndIndex===-1?s.length:lineEndIndex;
    const chunk=s.slice(lineStart,lineEnd);
    const output=chunk.split('\n').map(line=>prefix+line).join('\n');
    const updated=s.slice(0,lineStart)+output+s.slice(lineEnd);
    const change=output.length-chunk.length;
    return {text:updated,cursorStart:start+prefix.length,cursorEnd:end+change};
  }
  function toggleChecklistLine(text,at){
    const value=String(text),pos=Math.max(0,Math.min(value.length,at));
    const from=value.lastIndexOf('\n',pos-1)+1;
    const end=value.indexOf('\n',pos),stop=end===-1?value.length:end;
    const part=value.slice(from,stop),match=part.match(/^(\s*)(☐|☑)/u);
    if(!match)return {text:value,changed:false};
    const symbol=match[2]==='☐'?'☑':'☐';
    return {text:value.slice(0,from)+part.replace(/^(\s*)(?:☐|☑)/u,'$1'+symbol)+value.slice(stop),changed:true};
  }
  function createController(adapter){
    if(!adapter||!adapter.core||typeof adapter.readState!=='function'||
       typeof adapter.commitNotes!=='function'||typeof adapter.nextNumericId!=='function')
      throw new TypeError('Notes UX requires an explicit Notes Core and durable persistence adapter');
    const core=adapter.core;
    const now=()=>{const v=adapter.now?adapter.now():Date.now();if(!validId(v))throw new Error('INVALID_TIMESTAMP');return v;};
    function read(){
      const state=adapter.readState();
      if(!state||!Array.isArray(state.notesList)||!Array.isArray(state.tasksList))throw new Error('INVALID_V21_SNAPSHOT');
      return state;
    }
    function one(id,notes){
      if(!validId(id))throw new Error('INVALID_NOTE_ID');
      const a=notes.filter(n=>n&&n.id===id);
      if(a.length!==1)throw new Error(a.length?'DUPLICATE_ID':'NOTE_NOT_FOUND');
      return a[0];
    }
    function apply(transform,kind='notes'){
      const before=read();
      const out=transform(before);
      if(!out||!Array.isArray(out.notesList))throw new Error('INVALID_NOTES_RESULT');
      // A synchronous adapter owns packet/mirror verification and atomicity; false/void is NOT success.
      const ack=kind==='both'
        ? (typeof adapter.commitBoth==='function'?adapter.commitBoth(before,out):null)
        :adapter.commitNotes(before,out);
      if(ack!==true)throw new Error('DURABLE_COMMIT_NOT_CONFIRMED');
      if(typeof adapter.onSaved==='function')adapter.onSaved(out);
      return out;
    }
    function extension(d){
      const e={};
      if(d.kind!==undefined)e.kind=cleanText(d.kind);
      if(d.notebookId!==undefined)e.notebookId=cleanText(d.notebookId).trim()||null;
      if(d.tags!==undefined)e.tags=Array.isArray(d.tags)?d.tags:parseTags(d.tags);
      if(d.cornell!==undefined){
        const c=d.cornell;
        if(!c||['cues','notes','summary'].some(k=>typeof c[k]!=='string'))throw new Error('INVALID_CORNELL');
        e.cornell={cues:c.cues,notes:c.notes,summary:c.summary};
      }
      if(d.recallPairs!==undefined){
        if(!Array.isArray(d.recallPairs)||d.recallPairs.length>200||
           d.recallPairs.some(p=>!p||!p.question?.trim()||!p.answer?.trim()))throw new Error('INVALID_RECALL_PAIRS');
        e.recallPairs=d.recallPairs.map((p,i)=>({key:cleanText(p.key)||'pair-'+i,question:p.question,answer:p.answer}));
      }
      return e;
    }
    function save(d){
      if(!d || (d.id!==null && d.id!==undefined && !validId(d.id)))throw new Error('INVALID_NOTE_ID');
      const title=cleanText(d.title).trim(),body=cleanText(d.body);
      if(!title&&!body&&!['cues','notes','summary'].some(k=>d.cornell?.[k]?.trim()))throw new Error('EMPTY_NOTE');
      if(title.length>250||body.length>NOTE_LIMIT)throw new Error('NOTE_TOO_LARGE');
      const patch={title,body,catKey:['cornell','flash','quick'].includes(d.catKey)?d.catKey:'quick',
        calDate:cleanText(d.calDate),blur:!!d.blur,pinned:!!d.pinned,favorite:!!d.favorite};
      const ext=extension(d);const stamp=now();
      return apply(before=>{
        let next;
        if(d.id===null||d.id===undefined){
          const id=adapter.nextNumericId();
          if(!validId(id))throw new Error('New note requires a numeric v21 ID');
          next=core.createNote(before.notesList,{id,...patch,isStarter:false,notesV21:ext},{now:stamp});
        }else {
          // The comparison occurs INSIDE the durable commit's fresh read/transform.
          // Reject external edits to any field, even when updatedAt is unchanged.
          if(d.expectedSnapshot!==undefined &&
             JSON.stringify(one(d.id,before.notesList))!==d.expectedSnapshot)
            throw new Error('NOTE_CONFLICT_RELOAD_REQUIRED');
          next=core.edit(before.notesList,d.id,patch,{now:stamp,extension:ext});
        }
        return {...before,notesList:next};
      });
    }
    function toggle(id,field){
      if(!['pinned','favorite'].includes(field))throw new Error('INVALID_FLAG');
      return apply(before=>{
        const n=one(id,before.notesList);
        return {...before,notesList:core.edit(before.notesList,id,{[field]:!n[field]},{now:now()})};
      });
    }
    function duplicate(id){
      return apply(before=>{
        const n=clone(one(id,before.notesList)),newId=adapter.nextNumericId();
        if(!validId(newId))throw new Error('New note requires a numeric v21 ID');
        n.id=newId;n.isStarter=false;n.pinned=false;n.createdAt=now();n.updatedAt=n.createdAt;
        if(n.notesV21){delete n.notesV21.revisions;delete n.notesV21.redo;delete n.notesV21.extractedKeys;}
        return {...before,notesList:core.createNote(before.notesList,n,{now:n.createdAt})};
      });
    }
    function move(id,status){return apply(before=>({...before,notesList:core.setStatus(before.notesList,id,status,now())}));}
    function purge(id){
      if(typeof adapter.confirmPermanentDelete!=='function')throw new Error('BACKUP_ACKNOWLEDGEMENT_REQUIRED');
      const approval=adapter.confirmPermanentDelete(id);
      if(!approval||approval.confirmed!==true||approval.backupAcknowledged!==true)
        throw new Error('BACKUP_ACKNOWLEDGEMENT_REQUIRED');
      return apply(before=>({...before,notesList:core.permanentlyDelete(before.notesList,id,{approved:true})}));
    }
    function history(id,action){
      if(!['undo','redo'].includes(action))throw new Error('INVALID_HISTORY_ACTION');
      return apply(before=>({...before,notesList:core[action](before.notesList,id,now())}));
    }
    function link(id,target){
      return apply(before=>({...before,notesList:core.link(before.notesList,id,target,now())}));
    }
    function linkTask(id,taskId){
      if(!validId(taskId))throw new Error('INVALID_TASK_ID');
      return apply(before=>{
        const note=one(id,before.notesList);
        const target=before.tasksList.filter(task=>task&&task.id===taskId);
        if(target.length!==1)throw new Error(target.length?'DUPLICATE_TASK_ID':'TASK_NOT_FOUND');
        const stored=note.notesV21?.taskLinks||[];
        if(!Array.isArray(stored)||stored.some(x=>!validId(x)))throw new Error('INVALID_TASK_LINKS');
        if(stored.includes(taskId))throw new Error('TASK_ALREADY_LINKED');
        return {...before,notesList:core.edit(before.notesList,id,{},
          {now:now(),extension:{taskLinks:[...stored,taskId]}})};
      });
    }
    function extract(id){
      if(typeof adapter.commitBoth!=='function')throw new Error('ATOMIC_TASK_COMMIT_REQUIRED');
      const snapshot=read();one(id,snapshot.notesList);
      if(!core.checklistCandidates(snapshot.notesList,snapshot.tasksList,id).length)
        return {...snapshot,created:[]}; // idempotent no-op: do not rewrite mirrors.
      return apply(before=>{
        const candidates=core.checklistCandidates(before.notesList,before.tasksList,id);
        if(!candidates.length)return { ...before,notesList:before.notesList,created:[]};
        const assignments=candidates.map(c=>({key:c.key,taskId:adapter.nextNumericId()}));
        const out=core.extractTasks(before.notesList,before.tasksList,id,assignments,now());
        return {...before,notesList:out.notes,tasksList:out.tasks,created:out.created};
      },'both');
    }
    function recall(id){const s=read();return core.recallCards(one(id,s.notesList));}
    function query(options={}){
      const notes=read().notesList;
      if(options.category && options.category!=='all'){
        if(!['cornell','flash','quick'].includes(options.category))
          throw new Error('INVALID_CATEGORY');
        return core.search(notes.filter(n=>n&&n.catKey===options.category),options);
      }
      return core.search(notes,options);
    }
    return Object.freeze({read,one,save,toggle,duplicate,move,purge,history,link,linkTask,extract,recall,query});
  }
  function el(tag,cls,label){
    const e=document.createElement(tag);if(cls)e.className=cls;
    if(label!==undefined)e.textContent=label;
    return e;
  }
  const languages={
    en:{all:'All notes',archive:'Archive',trash:'Trash',notebooks:'Notebook',tag:'Tag',allbooks:'All notebooks',
      alltags:'All tags',empty:'No notes in this view',focus:'Focus writing',normal:'Exit focus',read:'Read / Review',
      edit:'Edit',restore:'Restore',delete:'Move to trash',purge:'Delete forever',archiveIt:'Archive',
      undo:'Undo',redo:'Redo',find:'Find in note',next:'Next',preview:'Preview',write:'Write',
      question:'Questions / cues',explain:'Main notes',summary:'Summary',pairQ:'Recall question',
      pairA:'Answer',addPair:'Add Q&A',tags:'Tags (comma-separated)',book:'Notebook',link:'Link note',
      task:'Create tasks from unchecked items',saved:'Note saved',failed:'Could not save note',
      confirm:'Delete permanently? An exported backup is required.',review:'Tap answer to reveal',
      draft:'Draft and legacy body are kept separately',filter:'Filter',status:'Status',linked:'Linked notes',more:'More',copy:'Copy',
      copied:'Copied',copyFailed:'Could not copy note',duplicate:'Duplicate',previewLimit:'Preview limited to 400 lines; original note is unchanged.',
      completePairs:'Complete each recall question and answer before saving',large:'Note exceeds maximum size',
      done:'Mark complete',heading:'Heading',bullet:'Bulleted list',check:'Checklist',number:'Numbered list',
      quote:'Quote',typeCornell:'Structured notes',typeFlash:'Recall',typeQuick:'Quick notes'},
    ar:{all:'كل الملاحظات',archive:'الأرشيف',trash:'سلة المحذوفات',notebooks:'الدفتر',tag:'الوسم',allbooks:'كل الدفاتر',
      alltags:'كل الوسوم',empty:'لا توجد ملاحظات في هذا العرض',focus:'تركيز الكتابة',normal:'إنهاء التركيز',read:'قراءة ومراجعة',
      edit:'تحرير',restore:'استعادة',delete:'نقل إلى السلة',purge:'حذف نهائي',archiveIt:'أرشفة',
      undo:'تراجع',redo:'إعادة',find:'بحث داخل الملاحظة',next:'التالي',preview:'معاينة',write:'كتابة',
      question:'الأسئلة والكلمات المفتاحية',explain:'الشرح والملاحظات',summary:'الملخص',pairQ:'سؤال المراجعة',
      pairA:'الإجابة',addPair:'إضافة سؤال وإجابة',tags:'الوسوم (افصل بفاصلة)',book:'الدفتر',
      link:'ربط ملاحظة',task:'إنشاء مهام من مربعات الاختيار',saved:'تم حفظ الملاحظة',
      failed:'تعذّر حفظ الملاحظة',confirm:'حذف نهائي؟ تأكد من وجود نسخة احتياطية مصدّرة.',
      review:'المس الإجابة لإظهارها',draft:'المحتوى القديم محفوظ بمعزل عن كورنيل',filter:'تصفية',
      status:'الحالة',linked:'ملاحظات مرتبطة',more:'المزيد',copy:'نسخ',
      copied:'تم النسخ',copyFailed:'تعذّر نسخ الملاحظة',duplicate:'إنشاء نسخة',previewLimit:'المعاينة تعرض أول 400 سطر فقط؛ الملاحظة الأصلية محفوظة دون تغيير.',
      completePairs:'أكمل سؤال المراجعة وإجابته قبل الحفظ',large:'تجاوزت الملاحظة الحجم المسموح',
      done:'وضع علامة مكتمل',heading:'عنوان',bullet:'قائمة نقطية',check:'قائمة تحقق',number:'قائمة مرقمة',
      quote:'اقتباس',typeCornell:'ملاحظات منظمة',typeFlash:'استذكار',typeQuick:'ملاحظات سريعة'}
  };
  function translate(locale,key){
    const code=String(locale||'en').toLowerCase().split(/[-_]/)[0];
    const fallback=(languages[code==='ar'?'ar':'en'][key]||languages.en[key]||key);
    const api=globalThis.DF99Locale;
    return api&&typeof api.t==='function'?api.t(code,'notes','editor_'+key,fallback):fallback;
  }
  function t(key){return translate(instance?.adapter?.locale?.()||'en',key);}
  function refreshLocalization(){
    if(!instance||typeof document==='undefined')return;
    const locale=instance.adapter.locale();
    if(instance.lastLocale===locale)return;
    instance.lastLocale=locale;
    const status=document.getElementById('nsux-status');
    if(status){
      [['all','all'],['archived','archive'],['trash','trash']].forEach(([value,key])=>{
        const option=[...status.options].find(o=>o.value===value);
        if(option)option.textContent=t(key);
      });
      status.setAttribute('aria-label',t('status'));
    }
    const books=document.getElementById('nsux-book-filter'),tags=document.getElementById('nsux-tag-filter');
    if(books)books.setAttribute('aria-label',t('notebooks'));
    if(tags)tags.setAttribute('aria-label',t('tag'));
    document.querySelectorAll('[data-nsux-i18n]').forEach(node=>{
      const key=node.dataset.nsuxI18n;
      if(key)node.textContent=t(key);
    });
    document.querySelectorAll('[data-nsux-aria]').forEach(node=>{
      const key=node.dataset.nsuxAria;
      if(key)node.setAttribute('aria-label',t(key));
    });
    // UI direction only; authored note text and draft input values are untouched.
    const rtl=new Set(['ar','fa','ur','ps','yi','sd','ug']).has(String(locale).split(/[-_]/)[0]);
    const host=document.getElementById('nsux-filters');
    if(host)host.dir=rtl?'rtl':'ltr';
    ['nsux-find'].forEach(id=>{const node=document.getElementById(id);if(node)node.dir='auto';});
  }
  function style(){
    if(document.getElementById('nsux-style'))return;
    const s=el('style');s.id='nsux-style';
    s.textContent=[
      '.nsux-controls,.nsux-inline,.nsux-tabs,.nsux-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.nsux-controls{margin:8px 0 16px}.nsux-controls select,.nsux-controls input,.nsux-inline input,.nsux-inline select{min-width:0;max-width:100%;padding:10px;border:1px solid var(--df22-border,#dce5f0);border-radius:12px;background:#fff;color:var(--df22-ink,#1c2e4d);font:inherit}',
      '.nsux-controls select{flex:1 1 100px}.nsux-controls input{flex:1 1 125px}',
      '.nsux-btn{min-height:44px;min-width:44px;padding:9px 12px;border:1px solid var(--df22-border,#dce5f0);border-radius:13px;background:var(--df22-surface-soft,#f3f7fd);color:var(--df22-primary,#1759ad);font:inherit;font-size:.8rem;font-weight:650}',
      '.nsux-btn:focus-visible,.nsux-controls input:focus-visible,.nsux-area:focus-visible{outline:2px solid #3288eb;outline-offset:2px}',
      '.nsux-btn[aria-pressed="true"]{background:#e8f5ff;border-color:#92cff7}.nsux-btn.danger{color:#a53733;background:#fff7f7}',
      '.nsux-extra{display:grid;gap:9px;margin:9px 0}.nsux-extra label{display:grid;gap:5px;font-size:.75rem;color:#50617a}',
      '.nsux-area{box-sizing:border-box;width:100%;min-height:90px;resize:vertical;white-space:pre-wrap;unicode-bidi:plaintext;border:1px solid #dce5f0;border-radius:13px;background:#fff;padding:12px;color:#1c2e4d;line-height:1.65;font:inherit;font-size:16px}',
      '.nsux-inline>*{flex:1 1 120px}.nsux-meta{margin:7px 0;color:#50617a;font-size:.76rem}',
      '.nsux-reading #nsux-fields>label,.nsux-reading #nsux-fields>#nsux-cornell,.nsux-reading #nsux-fields>#nsux-recall,.nsux-reading #nsux-fields>.nsux-btn{display:none!important}',
      '.nsux-reading #inpNoteTitle,.nsux-reading #inpNoteBody,.nsux-reading #nsBodyLabel,.nsux-reading #nsCounter,.nsux-reading #nsux-fields .nsux-meta,.nsux-reading #nsux-tools,.nsux-reading .ns-meta,.nsux-reading .ns-options,.nsux-reading .modal-actions,.nsux-reading #nsEditorTemplates{display:none!important}',
      '.nsux-reading #nsux-preview{display:block!important;max-height:65dvh}',
      '.nsux-reader{white-space:normal;overflow-wrap:anywhere;line-height:1.7;color:#1c2e4d;padding:14px;border:1px solid #dce5f0;border-radius:15px;background:white;max-height:42vh;overflow:auto}',
      '.nsux-reader{unicode-bidi:plaintext}.nsux-reader p{white-space:pre-wrap;margin:7px 0}.nsux-reader h4{font-size:1.02rem;margin:12px 0 4px}.nsux-reader .nsux-check{display:flex;gap:10px;align-items:baseline}.nsux-reader .nsux-check input{pointer-events:none}',
      '.nsux-card{border:1px solid var(--df22-border,#dce5f0);border-radius:22px;background:#fff;padding:15px;box-shadow:var(--df22-shadow-low,0 2px 10px #203b5f10)}',
      '.nsux-card h3{margin:8px 0;color:#1c2e4d;overflow-wrap:anywhere}.nsux-card p{white-space:pre-wrap;overflow-wrap:anywhere;color:#50617a;font-size:.79rem;max-height:7em;overflow:hidden}',
      '.nsux-blank{padding:25px;text-align:center;background:#fff;border:1px dashed #bfd6f4;border-radius:18px;color:#50617a}',
      '#noteModal.nsux-focus .ns-editor{max-width:760px;width:100%;max-height:100dvh;border-radius:0}',
      '#noteModal.nsux-focus #nsEditorTemplates,#noteModal.nsux-focus .ns-meta,#noteModal.nsux-focus .ns-options{display:none}',
      '#noteModal.nsux-focus #inpNoteBody{max-height:55dvh;min-height:35dvh}',
      '#noteModal .ns-editor{max-height:min(92dvh,calc(var(--nsux-height,100dvh) - 10px));overflow-y:auto;overscroll-behavior:contain;padding-bottom:max(15px,env(safe-area-inset-bottom));}',
      '@media(max-width:360px){.nsux-actions{gap:5px}.nsux-btn{padding:8px}.nsux-area{min-height:80px}}',
      '@media(prefers-reduced-motion:reduce){#noteModal .ns-editor{scroll-behavior:auto}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function field(parent,label,value,tag='input',key=''){
    const wrap=el('label'),caption=el('span','',label),input=el(tag,tag==='textarea'?'nsux-area':'');
    if(key)caption.dataset.nsuxI18n=key;
    wrap.appendChild(caption);
    if(tag==='textarea')input.rows=3;else input.type='text';
    input.value=value||'';input.dir='auto';wrap.appendChild(input);parent.appendChild(wrap);return input;
  }
  function button(parent,label,fn,extra='',key=''){
    const b=el('button','nsux-btn'+(extra?' '+extra:''),label);
    if(key)b.dataset.nsuxI18n=key;
    b.type='button';b.addEventListener('click',fn);parent.appendChild(b);return b;
  }
  function renderText(container,text,query){
    container.replaceChildren();const needle=String(query||'').trim();
    const lines=String(text||'').split(/\r?\n/u);
    lines.slice(0,400).forEach(line=>{
      let node,body=line;
      if(/^#{1,3}\s/.test(line)){node=el('h4');body=line.replace(/^#{1,3}\s/,'');}
      else if(/^\s*(?:☐|☑|\[ \]|[-*]\s*\[ \])\s*/u.test(line)){
        node=el('div','nsux-check');const check=el('input');check.type='checkbox';check.disabled=true;
        check.checked=/^\s*☑/u.test(line);
        node.appendChild(check);body=line.replace(/^\s*(?:☐|☑|\[ \]|[-*]\s*\[ \])\s*/u,'');
      }else{node=el('p');if(/^\s*(?:[-*]|\d+\.)\s/.test(line))body='• '+line.replace(/^\s*(?:[-*]|\d+\.)\s/,'');}
      node.dir='auto';
      if(!needle){node.appendChild(document.createTextNode(body));}
      else {
        let pos=0; const indexes=findOccurrences(body,needle);
        indexes.forEach(i=>{node.appendChild(document.createTextNode(body.slice(pos,i)));
          const mark=el('mark','',body.slice(i,i+needle.length));node.appendChild(mark);pos=i+needle.length;});
        node.appendChild(document.createTextNode(body.slice(pos)));
      }
      container.appendChild(node);
    });
    if(lines.length>400)container.appendChild(el('p','nsux-meta',t('previewLimit')));
  }
  function createPairs(parent,pairs){
    parent.replaceChildren();
    pairs.forEach((pair,i)=>{
      const group=el('div','nsux-inline'),q=field(group,t('pairQ'),pair.question,'input','pairQ'),a=field(group,t('pairA'),pair.answer,'input','pairA');
      group.dataset.key=pair.key||'pair-'+i;
      button(group,'×',()=>{group.remove();schedule();},'danger');
      parent.appendChild(group);[q,a].forEach(input=>input.addEventListener('input',schedule));
    });
  }
  function schedule(){
    if(typeof nsScheduleDraft==='function')nsScheduleDraft();
  }
  function setupEditor(){
    const modal=document.getElementById('noteModal'),card=modal&&modal.querySelector('.ns-editor');
    if(!card)return;
    const body=document.getElementById('inpNoteBody');body.dir='auto';document.getElementById('inpNoteTitle').dir='auto';
    const toolbar=el('div','nsux-actions'),extra=el('div','nsux-extra');
    toolbar.id='nsux-tools';extra.id='nsux-fields';
    const basic=[['heading','H1'],['bullet','• List'],['check','☐'],['number','1.'],['quote','❝']];
    basic.forEach(([key,label])=>{const action=button(toolbar,label,()=>{
      if(document.activeElement!==body)body.focus();
      const pos=formatSelection(body.value,body.selectionStart,body.selectionEnd,key);
      if(pos.text.length>NOTE_LIMIT){instance.adapter.notify?.(t('large'));return;}
      body.value=pos.text;body.setSelectionRange(pos.cursorStart,pos.cursorEnd);body.focus();schedule();
      if(typeof nsUpdateCount==='function')nsUpdateCount();
    });action.dataset.nsuxAria=key;action.setAttribute('aria-label',t(key));});
    button(toolbar,'☑',()=>{
      const old=body.selectionStart,changed=toggleChecklistLine(body.value,old);
      if(!changed.changed)return;
      body.value=changed.text;body.focus();body.setSelectionRange(old,old);
      schedule();renderPreview();if(typeof nsUpdateCount==='function')nsUpdateCount();
    },'', 'done');
    const view=button(toolbar,t('preview'),()=>togglePreview(),'','preview'),focus=button(toolbar,t('focus'),()=>toggleFocus(),'','focus');
    view.id='nsux-preview-toggle';focus.id='nsux-focus-toggle';
    const find=field(extra,t('find'),'','input','find');find.id='nsux-find';
    const status=el('div','nsux-meta');status.id='nsux-search-count';extra.appendChild(status);
    button(extra,t('next'),()=>findNext(),'','next');
    const preview=el('div','nsux-reader');preview.id='nsux-preview';preview.hidden=true;extra.appendChild(preview);
    const cornell=el('div','nsux-extra');cornell.id='nsux-cornell';extra.appendChild(cornell);
    instance.fields={
      cues:field(cornell,t('question'),'', 'textarea','question'),
      notes:field(cornell,t('explain'),'', 'textarea','explain'),
      summary:field(cornell,t('summary'),'', 'textarea','summary'),
      notebook:field(extra,t('book'),'','input','book'),
      tags:field(extra,t('tags'),'','input','tags')
    };
    const pairs=el('div','nsux-extra');pairs.id='nsux-recall';extra.appendChild(pairs);
    const pairList=el('div','nsux-extra');pairs.appendChild(pairList);instance.pairList=pairList;
    button(pairs,t('addPair'),()=>{const c=[...instance.pairList.children].length;
      const a=collectPairs(true);a.push({key:'pair-'+Date.now()+'-'+c,question:'',answer:''});createPairs(instance.pairList,a);
      schedule();
    },'','addPair');
    body.parentNode.insertBefore(toolbar,body);document.getElementById('nsCounter').after(extra);
    find.addEventListener('input',()=>{renderPreview();findNext(true);});
    body.addEventListener('input',()=>{renderPreview();});
    [instance.fields.cues,instance.fields.notes,instance.fields.summary,
      instance.fields.notebook,instance.fields.tags].forEach(x=>x.addEventListener('input',schedule));
    document.getElementById('selNoteCat').addEventListener('change',()=>{showType();schedule();});
    // visualViewport reports actual available height while the Android IME is visible.
    if(window.visualViewport){
      const update=()=>modal.style.setProperty('--nsux-height',window.visualViewport.height+'px');
      window.visualViewport.addEventListener('resize',update);update();instance.disposeViewport=()=>window.visualViewport.removeEventListener('resize',update);
    }
    showType();
  }
  function collectPairs(includeEmpty){
    return [...instance.pairList.children].map(row=>({key:row.dataset.key,
      question:row.querySelectorAll('input')[0]?.value||'',answer:row.querySelectorAll('input')[1]?.value||''}))
      .filter(p=>includeEmpty||p.question.trim()&&p.answer.trim());
  }
  function showType(){
    const kind=document.getElementById('selNoteCat').value;
    document.getElementById('nsux-cornell').hidden=kind!=='cornell';
    document.getElementById('nsux-recall').hidden=kind!=='flash';
  }
  function renderPreview(){
    if(!instance)return;
    const preview=document.getElementById('nsux-preview');
    if(!preview||preview.hidden)return;
    const body=document.getElementById('inpNoteBody').value,term=document.getElementById('nsux-find').value;
    renderText(preview,body,term);
  }
  function togglePreview(){
    const preview=document.getElementById('nsux-preview');preview.hidden=!preview.hidden;
    document.getElementById('nsux-preview-toggle').setAttribute('aria-pressed',String(!preview.hidden));
    if(!preview.hidden)renderPreview();
  }
  function toggleFocus(){
    const modal=document.getElementById('noteModal'),focus=modal.classList.toggle('nsux-focus');
    document.getElementById('nsux-focus-toggle').textContent=t(focus?'normal':'focus');
  }
  function findNext(countOnly){
    const body=document.getElementById('inpNoteBody'),q=document.getElementById('nsux-find').value;
    const hits=findOccurrences(body.value,q);
    document.getElementById('nsux-search-count').textContent=hits.length+' / '+hits.length;
    if(!hits.length||countOnly)return;
    let next=hits.find(i=>i>body.selectionStart);if(next===undefined)next=hits[0];
    body.focus();body.setSelectionRange(next,next+q.length);
    document.getElementById('nsux-search-count').textContent=(hits.indexOf(next)+1)+' / '+hits.length;
  }
  function onOpen(note){
    if(!instance)return;
    refreshLocalization();
    const n=note||{},ext=n.notesV21||{},f=instance.fields;
    // Track the entire opened record, not just updatedAt or visible inputs.
    instance.openedSnapshot=note?JSON.stringify(note):null;
    f.cues.value=ext.cornell?.cues||'';f.notes.value=ext.cornell?.notes||'';
    f.summary.value=ext.cornell?.summary||'';f.tags.value=(ext.tags||[]).join(', ');
    f.notebook.value=ext.notebookId||'';createPairs(instance.pairList,ext.recallPairs||[]);
    document.getElementById('nsux-preview').hidden=true;
    document.getElementById('nsux-find').value='';
    document.getElementById('nsux-search-count').textContent='';
    document.getElementById('noteModal').classList.remove('nsux-focus','nsux-reading');
    document.getElementById('nsux-focus-toggle').textContent=t('focus');
    showType();
  }
  function draftFields(){
    if(!instance)return {};
    const f=instance.fields;
    return {cornell:{cues:f.cues.value,notes:f.notes.value,summary:f.summary.value},
      notebookId:f.notebook.value,tags:f.tags.value,recallPairs:collectPairs(true)};
  }
  function restoreDraftFields(d){
    if(!instance||!d)return;
    const f=instance.fields;
    f.cues.value=d.cornell?.cues||'';f.notes.value=d.cornell?.notes||'';
    f.summary.value=d.cornell?.summary||'';f.tags.value=d.tags||'';
    f.notebook.value=d.notebookId||'';
    createPairs(instance.pairList,Array.isArray(d.recallPairs)?d.recallPairs:[]);
    showType();renderPreview();
  }
  function draftToSave(){
    const f=instance.fields,cat=document.getElementById('selNoteCat').value;
    const allPairs=collectPairs(true);
    if(allPairs.some(pair=>!pair.question.trim()||!pair.answer.trim()))throw new Error(t('completePairs'));
    const pairs=allPairs;
    const result={id:typeof nsEditId==='number'?nsEditId:null,
      title:document.getElementById('inpNoteTitle').value,body:document.getElementById('inpNoteBody').value,
      catKey:cat,calDate:document.getElementById('inpNoteCalDate').value,
      pinned:document.getElementById('nsPinCheck').checked,favorite:document.getElementById('nsFavCheck').checked,
      blur:document.getElementById('chkNoteBlur').checked,notebookId:f.notebook.value,
      expectedSnapshot:instance.openedSnapshot,
      tags:parseTags(f.tags.value),recallPairs:pairs};
    // Never guess Cornell structure for a legacy note. Only authored fields are persisted.
    if(cat==='cornell')result.cornell={cues:f.cues.value,notes:f.notes.value,summary:f.summary.value};
    return result;
  }
  function save(){
    if(!instance){if(typeof showToast==='function')showToast('⚠️ Notes UI is not connected; nothing was saved.');return false;}
    try{
      instance.controller.save(draftToSave());
      if(typeof nsClearDraftForSavedNote==='function')nsClearDraftForSavedNote();
      document.getElementById('noteModal').classList.remove('open');
      if(typeof nsEditId!=='undefined')nsEditId=null;
      renderStack();instance.adapter.onRefresh?.();instance.adapter.notify?.(t('saved'));
      return true;
    }catch(e){instance.adapter.notify?.(t('failed')+': '+e.message);return false;}
  }
  function cardAction(parent,label,fn,danger){return button(parent,label,()=>{try{fn();renderStack();}catch(e){instance.adapter.notify?.(e.message);}},danger?'danger':'');}
  function statusView(){
    const root=document.getElementById('nsux-filters');if(!root)return;
    const a=instance.controller.read().notesList;
    const notebooks=[...new Set(a.map(n=>n?.notesV21?.notebookId).filter(x=>typeof x==='string'&&x))].sort();
    const tags=[...new Set(a.flatMap(n=>Array.isArray(n?.notesV21?.tags)?n.notesV21.tags:[]))].sort();
    const select=(e,values,first)=>{
      const chosen=e.value;e.replaceChildren();
      const o=el('option','',first);o.value='';e.appendChild(o);
      values.forEach(x=>{const op=el('option','',x);op.value=x;e.appendChild(op);});
      e.value=values.includes(chosen)?chosen:'';
    };
    select(document.getElementById('nsux-book-filter'),notebooks,t('allbooks'));
    select(document.getElementById('nsux-tag-filter'),tags,t('alltags'));
  }
  function renderStack(){
    if(!instance)return false;
    refreshLocalization();
    const box=document.getElementById('notesStackBox');if(!box)return false;
    statusView();
    const query=document.getElementById('inpSearchNotes')?.value||'';
    const s=document.getElementById('nsux-status').value;
    const filters={query,status:s,sort:document.getElementById('nsSort')?.value||'recent',
      pinnedOnly:document.getElementById('nsPinnedOnly')?.getAttribute('aria-pressed')==='true'};
    const bk=document.getElementById('nsux-book-filter').value,tag=document.getElementById('nsux-tag-filter').value;
    if(bk)filters.notebookId=bk;if(tag)filters.tags=[tag];
    if(typeof noteTagFilter!=='undefined'&&noteTagFilter!=='all'&&noteTagFilter)filters.category=noteTagFilter;
    const signature=JSON.stringify(filters);
    if(signature!==instance.filterSignature){instance.filterSignature=signature;instance.page=0;}
    const offset=(instance.page||0)*100;
    const result=instance.controller.query({...filters,offset,limit:100});
    const found=result.items;
    const all=instance.controller.read().notesList.filter(n=>n&&!n.isStarter&&!n.notesV21?.deletedAt);
    const total=document.getElementById('nsTotal'),pinned=document.getElementById('nsPinned'),count=document.getElementById('nsVisibleCount');
    if(total)total.textContent=String(all.length);
    if(pinned)pinned.textContent=String(all.filter(n=>n.pinned).length);
    if(count)count.textContent=String(Math.min(offset+found.length,result.total))+' / '+result.total;
    box.replaceChildren();
    if(!found.length){box.appendChild(el('div','nsux-blank',t('empty')));return true;}
    found.forEach(n=>{
      const card=el('article','nsux-card'),top=el('div','nsux-inline');
      top.appendChild(el('span','ns-type',t(n.catKey==='cornell'?'typeCornell':n.catKey==='flash'?'typeFlash':'typeQuick')));
      top.appendChild(el('span','nsux-meta',n.calDate||''));
      card.appendChild(top);
      const title=el('h3','',n.title);title.dir='auto';card.appendChild(title);
      const body=el('p','',n.body||n.notesV21?.cornell?.summary||'');
      body.dir='auto'; if(n.blur){body.textContent=t('review');body.setAttribute('role','button');
        body.tabIndex=0;const reveal=()=>{body.textContent=n.body||n.notesV21?.cornell?.summary||'';body.removeAttribute('role');};
        body.addEventListener('click',reveal);body.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();reveal();}});
      }
      card.appendChild(body);
      const safeTags=Array.isArray(n.notesV21?.tags)?n.notesV21.tags:[];
    const meta=el('div','nsux-meta',(n.notesV21?.notebookId||'')+' · '+safeTags.join(' · '));
      card.appendChild(meta);
      const actions=el('div','nsux-actions');
      if(s==='trash'){
        cardAction(actions,t('restore'),()=>instance.controller.move(n.id,'restore'));
        cardAction(actions,t('purge'),()=>instance.controller.purge(n.id),'danger');
      }else{
        cardAction(actions,t('edit'),()=>{openNoteModal(null,n.id);});
        cardAction(actions,'★',()=>instance.controller.toggle(n.id,'favorite'));
        cardAction(actions,'📌',()=>instance.controller.toggle(n.id,'pinned'));
        cardAction(actions,t('read'),()=>showReader(n));
        cardAction(actions,t('duplicate'),()=>instance.controller.duplicate(n.id));
        cardAction(actions,t('copy'),()=>copyNote(n));
        cardAction(actions,t('undo'),()=>instance.controller.history(n.id,'undo'));
        cardAction(actions,t('redo'),()=>instance.controller.history(n.id,'redo'));
        cardAction(actions,s==='archived'?t('restore'):t('archiveIt'),()=>instance.controller.move(n.id,s==='archived'?'restore':'archive'));
        cardAction(actions,t('delete'),()=>instance.controller.move(n.id,'trash'),'danger');
      }
      if(s!=='trash'){
        if(instance.adapter.openCalendarForNote)cardAction(actions,'📅',()=>instance.adapter.openCalendarForNote(n.id));
        if(instance.adapter.pickNoteLinkTarget)cardAction(actions,t('link'),()=>{
          const target=instance.adapter.pickNoteLinkTarget(n.id,instance.controller.read().notesList);
          if(target!==null&&target!==undefined)instance.controller.link(n.id,target);
        });
        if(instance.adapter.pickTaskLinkTarget)cardAction(actions,'↗ '+t('task'),()=>{
          const target=instance.adapter.pickTaskLinkTarget(n.id,instance.controller.read().tasksList);
          if(target!==null&&target!==undefined)instance.controller.linkTask(n.id,target);
        });
        if(instance.adapter.confirmTaskExtraction && instance.adapter.commitBoth)
          cardAction(actions,t('task'),()=>{
            const state=instance.controller.read();const c=instance.controller.one(n.id,state.notesList);
            if(instance.adapter.confirmTaskExtraction(n.id,c)===true)instance.controller.extract(n.id);
          });
      }
      card.appendChild(actions);box.appendChild(card);
    });
    if(offset+result.items.length<result.total)button(box,t('more'),()=>{instance.page++;renderStack();});
    return true;
  }
  function copyNote(note){
    // Clipboard receives authored text exactly; no HTML parsing or numeric conversion.
    const value=String(note.title||'')+'\n\n'+String(note.body||'');
    const clipboard=globalThis.navigator?.clipboard;
    if(!clipboard||typeof clipboard.writeText!=='function'){instance.adapter.notify?.(t('copyFailed'));return;}
    Promise.resolve(clipboard.writeText(value)).then(()=>instance.adapter.notify?.(t('copied')))
      .catch(()=>instance.adapter.notify?.(t('copyFailed')));
  }
  function showReader(n){
    const dlg=document.getElementById('noteModal');openNoteModal(null,n.id);
    const preview=document.getElementById('nsux-preview');
    dlg.classList.add('nsux-reading');
    document.activeElement?.blur?.();
    preview.hidden=false;
    renderText(preview,n.body||'','');
    const ext=n.notesV21||{};
    if(ext.cornell){
      [['cues',t('question')],['notes',t('explain')],['summary',t('summary')]].forEach(([k,label])=>{
        preview.appendChild(el('h4','',label));const p=el('p','',ext.cornell[k]);p.dir='auto';preview.appendChild(p);
      });
    }
    const pairs=instance.controller.recall(n.id);
    pairs.forEach(pair=>{
      const q=el('h4','',pair.question);q.dir='auto';preview.appendChild(q);
      const answer=button(preview,t('review'),()=>{answer.textContent=pair.answer;});answer.dir='auto';
    });
    const links=Array.isArray(ext.links)?ext.links:[];
    if(links.length){preview.appendChild(el('h4','',t('linked')));links.forEach(id=>{
      const target=instance.controller.read().notesList.find(x=>x?.id===id);
      if(target)button(preview,target.title,()=>showReader(target));
    });}
    if(Array.isArray(ext.taskLinks))ext.taskLinks.forEach(id=>{
      const target=instance.controller.read().tasksList.find(x=>x&&x.id===id);
      if(target)preview.appendChild(el('p','',t('task')+': '+target.title));
    });
    button(preview,t('edit'),()=>{dlg.classList.remove('nsux-reading');document.getElementById('inpNoteBody').focus();});
    dlg.querySelector('.ns-editor').scrollTop=0;
  }
  function mountFilters(){
    const notes=document.getElementById('sec-notes'),box=document.getElementById('notesStackBox');
    if(!notes||!box||document.getElementById('nsux-filters'))return;
    const root=el('div','nsux-controls');root.id='nsux-filters';
    const status=el('select');status.id='nsux-status';status.setAttribute('aria-label',t('status'));
    [['active',t('all')],['archived',t('archive')],['trash',t('trash')]].forEach(([value,name])=>{
      const op=el('option','',name);op.value=value;status.appendChild(op);
    });
    const book=el('select');book.id='nsux-book-filter';book.setAttribute('aria-label',t('notebooks'));
    const tag=el('select');tag.id='nsux-tag-filter';tag.setAttribute('aria-label',t('tag'));
    [status,book,tag].forEach(x=>{root.appendChild(x);x.addEventListener('change',renderStack);});
    box.parentNode.insertBefore(root,box);
  }
  function install(adapter){
    if(instance)return instance.controller;
    if(typeof window==='undefined'||!window.DeepFocusNotesCoreV21)throw new Error('Load Notes Core before Notes UX');
    if(!adapter||typeof adapter.locale!=='function'||typeof adapter.notify!=='function')
      throw new Error('Notes UX requires locale and notification adapters');
    const controller=createController({...adapter,core:window.DeepFocusNotesCoreV21});
    instance={adapter,controller,page:0,filterSignature:''};style();mountFilters();setupEditor();renderStack();return controller;
  }
  function onTemplate(kind){
    if(!instance)return;
    if(kind==='cornell'){instance.fields.cues.value='';instance.fields.notes.value='';instance.fields.summary.value='';}
    showType();
  }
  return Object.freeze({createController,parseTags,formatSelection,toggleChecklistLine,findOccurrences,renderText,
    install,renderStack,onOpen,onTemplate,draftFields,restoreDraftFields,save,showReader,translate});
});
