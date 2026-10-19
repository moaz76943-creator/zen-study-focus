/* Deep Focus Notes Core v21 — pure, no storage, DOM, timers or migration writes.
 * Existing numeric note/task IDs and unknown legacy fields are preserved.
 * Integration owner (lane 00/03) decides when and how to persist returned values.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusNotesCoreV21 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_NOTES = 10000, MAX_REVISIONS = 10, MAX_PAGE = 100;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
    (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  const copy = x => JSON.parse(JSON.stringify(x));
  const idOK = id => Number.isSafeInteger(id) && id >= 0;
  function assertId(id, label = 'note') {
    if (!idOK(id)) throw new TypeError(label + ' ID must be a nonnegative safe integer (not a numeric string)');
  }
  function checkRecords(records, label = 'notes') {
    if (!Array.isArray(records) || records.length > MAX_NOTES) throw new TypeError(label + ' must be an array of at most ' + MAX_NOTES);
  }
  function findOne(records, id) {
    assertId(id);
    const hits = records.filter(n => n && n.id === id);
    if (hits.length !== 1) throw new Error(hits.length ? 'DUPLICATE_ID' : 'NOTE_NOT_FOUND');
    return hits[0];
  }
  function validateNote(note) {
    if (!plain(note)) throw new TypeError('Note must be a plain record');
    assertId(note.id);
    if (typeof note.title !== 'string' || typeof note.body !== 'string') throw new TypeError('Legacy title and body must be strings');
    return note;
  }
  function ext(note) {
    if (note.notesV21 !== undefined && !plain(note.notesV21)) throw new TypeError('Invalid notesV21 extension; refusing to overwrite it');
    return note.notesV21 || {};
  }
  function replace(notes, id, next) { return notes.map(n => n && n.id === id ? next : n); }
  function time(value) { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Explicit timestamp required'); return value; }
  function values(v, name) {
    if (!Array.isArray(v) || v.length > 100) throw new TypeError(name + ' must be an array of at most 100');
    if (!v.every(x => typeof x === 'string' && x.length > 0 && x.length <= 120)) throw new TypeError('Invalid ' + name + ' entry');
    return [...new Set(v)];
  }
  function safePatch(patch) {
    if (!plain(patch)) throw new TypeError('Patch must be a plain object');
    for (const k of Object.keys(patch)) {
      if (['id', 'isStarter', 'createdAt', 'notesV21', '__proto__', 'constructor', 'prototype'].includes(k)) throw new Error('Protected field: ' + k);
    }
    if (own(patch, 'title') && typeof patch.title !== 'string') throw new TypeError('Invalid title');
    if (own(patch, 'body') && typeof patch.body !== 'string') throw new TypeError('Invalid body');
  }
  function snapshot(note) {
    const n = copy(note);
    if (plain(n.notesV21)) { delete n.notesV21.revisions; delete n.notesV21.redo; }
    return n;
  }
  function history(note) {
    const e = ext(note);
    return {revisions:Array.isArray(e.revisions) ? e.revisions : [], redo:Array.isArray(e.redo) ? e.redo : []};
  }
  function edit(notes, id, patch, options = {}) {
    checkRecords(notes); safePatch(patch); const previous = validateNote(findOne(notes, id));
    if (ext(previous).deletedAt != null) throw new Error('NOTE_IN_TRASH');
    const at = time(options.now);
    const changeExt = options.extension || {};
    if (!plain(changeExt)) throw new TypeError('extension must be plain');
    for (const key of Object.keys(changeExt)) {
      if (['revisions', 'redo', 'extractedKeys', '__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Protected extension field');
    }
    if (own(changeExt, 'tags')) values(changeExt.tags, 'tags');
    if (own(changeExt, 'notebookId') && changeExt.notebookId !== null &&
        (typeof changeExt.notebookId !== 'string' || changeExt.notebookId.length > 120)) throw new TypeError('Invalid notebookId');
    if (own(changeExt, 'kind') && (typeof changeExt.kind !== 'string' || changeExt.kind.length > 100)) throw new TypeError('Invalid kind');
    if (own(changeExt, 'cornell')) validateCornell(changeExt.cornell);
    if (own(changeExt, 'recallPairs')) validateRecallPairs(changeExt.recallPairs);
    const nextExt = {...copy(ext(previous)), ...copy(changeExt)};
    if (own(nextExt, 'tags')) nextExt.tags = values(nextExt.tags, 'tags');
    const next = {...copy(previous), ...copy(patch), updatedAt:at, notesV21:nextExt};
    validateNote(next);
    if (JSON.stringify(snapshot(next)) === JSON.stringify(snapshot(previous))) return notes;
    const h = history(previous);
    next.notesV21.revisions = [...h.revisions, snapshot(previous)].slice(-MAX_REVISIONS);
    next.notesV21.redo = [];
    return replace(notes, id, next);
  }
  function restoreRevision(notes, id, direction, now) {
    checkRecords(notes); const current = validateNote(findOne(notes, id));
    const e = copy(ext(current)), h = history(current);
    const source = direction === 'undo' ? h.revisions : h.redo;
    if (!source.length) return notes;
    const restored = copy(source[source.length - 1]);
    if (restored.id !== id) throw new Error('REVISION_ID_MISMATCH');
    validateNote(restored);
    const prior = direction === 'undo' ? source.slice(0, -1) : [...h.revisions, snapshot(current)].slice(-MAX_REVISIONS);
    const redo = direction === 'undo' ? [...h.redo, snapshot(current)].slice(-MAX_REVISIONS) : source.slice(0, -1);
    const priorKeys = Array.isArray(ext(restored).extractedKeys) ? ext(restored).extractedKeys : [];
    const currentKeys = Array.isArray(ext(current).extractedKeys) ? ext(current).extractedKeys : [];
    restored.notesV21 = {...copy(ext(restored)), extractedKeys:[...new Set([...priorKeys,...currentKeys])], revisions:prior, redo};
    restored.updatedAt = time(now);
    return replace(notes, id, restored);
  }
  function createNote(notes, note, options = {}) {
    checkRecords(notes); validateNote(note);
    if (notes.some(n => n && n.id === note.id)) throw new Error('DUPLICATE_ID');
    const at = time(options.now);
    const next = {...copy(note), createdAt:note.createdAt ?? at, updatedAt:note.updatedAt ?? at};
    return [next, ...notes];
  }
  function validateCornell(v) {
    if (!plain(v) || !['cues', 'notes', 'summary'].every(k => typeof v[k] === 'string'))
      throw new TypeError('Cornell requires cues, notes and summary strings');
    return v;
  }
  function cornellText(note) {
    const c = ext(note).cornell;
    if (!c) return null;
    validateCornell(c);
    return ['CUES / QUESTIONS', c.cues, 'MAIN NOTES', c.notes, 'SUMMARY', c.summary].join('\n\n');
  }
  function createTemplate(definition) {
    if (!plain(definition) || typeof definition.id !== 'string' || !/^[\w-]{1,60}$/.test(definition.id) ||
        typeof definition.name !== 'string' || !definition.name.trim() || typeof definition.body !== 'string')
      throw new TypeError('Invalid template');
    if (definition.cornell !== undefined) validateCornell(definition.cornell);
    return copy(definition);
  }
  const BUILTIN_TEMPLATES = Object.freeze([
    {id:'cornell',name:'Cornell',kind:'cornell',body:'',cornell:{cues:'',notes:'',summary:''}},
    {id:'recall',name:'Active Recall',kind:'recall',body:''},
    {id:'checklist',name:'Checklist',kind:'checklist',body:'☐ '},
    {id:'reading',name:'Reading',kind:'reading',body:''},
    {id:'meeting',name:'Meeting',kind:'meeting',body:''}
  ].map(t => Object.freeze(t)));
  function fromTemplate(notes, template, id, options = {}) {
    const t = createTemplate(template); assertId(id); const at = time(options.now);
    const extra = plain(options.fields) ? copy(options.fields) : {};
    if (own(extra, 'id') || own(extra, 'notesV21')) throw new Error('Protected template fields');
    return createNote(notes, {...extra, id, isStarter:false, title:options.title ?? t.name,
      body:t.body, catKey:t.kind === 'cornell' ? 'cornell' : t.kind === 'recall' ? 'flash' : 'quick',
      notesV21:{kind:t.kind || t.id, ...(t.cornell ? {cornell:copy(t.cornell)} : {})}}, {now:at});
  }
  function setStatus(notes, id, status, now) {
    const note = validateNote(findOne(notes, id)); const e = ext(note); const at = time(now);
    if (!['archive', 'trash', 'restore'].includes(status)) throw new Error('Invalid status');
    if (status === 'archive' && e.deletedAt != null) throw new Error('NOTE_IN_TRASH');
    const update = status === 'trash' ? {deletedAt:at} : status === 'archive' ? {archivedAt:at} : {deletedAt:null, archivedAt:null};
    return editAllowTrash(notes, id, update, at);
  }
  function editAllowTrash(notes, id, change, at) {
    checkRecords(notes); const note = validateNote(findOne(notes, id));
    const e = {...copy(ext(note)), ...change};
    const next = {...copy(note), notesV21:e, updatedAt:at};
    if (JSON.stringify(snapshot(next)) === JSON.stringify(snapshot(note))) return notes;
    const h = history(note);
    next.notesV21.revisions = [...h.revisions,snapshot(note)].slice(-MAX_REVISIONS);
    next.notesV21.redo = [];
    return replace(notes,id,next);
  }
  function permanentlyDelete(notes, id, options = {}) {
    checkRecords(notes); const n = validateNote(findOne(notes,id));
    if (options.approved !== true || ext(n).deletedAt == null) throw new Error('DELETE_NOT_APPROVED_OR_NOT_IN_TRASH');
    return notes.filter(x => x !== n);
  }
  function link(notes, sourceId, targetId, now) {
    checkRecords(notes); const source = validateNote(findOne(notes,sourceId));
    validateNote(findOne(notes,targetId));
    if (sourceId === targetId) throw new Error('SELF_LINK');
    const links = Array.isArray(ext(source).links) ? ext(source).links : [];
    if (links.includes(targetId)) return notes;
    if (links.some(x => !idOK(x))) throw new Error('INVALID_LINK_ID');
    return edit(notes,sourceId,{}, {now,extension:{links:[...links,targetId]}});
  }
  function backlinks(notes,id) {
    checkRecords(notes); findOne(notes,id);
    return notes.filter(n=>n && Array.isArray(ext(n).links) && ext(n).links.includes(id)).map(n=>n.id);
  }
  function normalizeSearch(text) {
    return String(text ?? '').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'')
      .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLocaleLowerCase();
  }
  function search(notes, options = {}) {
    checkRecords(notes); const q = normalizeSearch(options.query || '').trim();
    const tags = options.tags === undefined ? [] : values(options.tags,'tags');
    const offset = Math.max(0, Math.trunc(options.offset || 0));
    const limit = Math.min(MAX_PAGE,Math.max(1,Math.trunc(options.limit || 30)));
    const mode = options.status || 'active';
    if (!['active','archived','trash','all'].includes(mode)) throw new Error('Invalid status');
    const matches = [];
    for (const n of notes) {
      if (!n || !idOK(n.id)) continue;
      const e = ext(n);
      const deleted = e.deletedAt != null, archived = e.archivedAt != null;
      if (mode === 'active' && (deleted || archived) || mode === 'archived' && (!archived || deleted) || mode === 'trash' && !deleted) continue;
      if (options.favoriteOnly && !n.favorite || options.pinnedOnly && !n.pinned) continue;
      if (options.notebookId !== undefined && e.notebookId !== options.notebookId) continue;
      if (options.kind && (e.kind || n.catKey) !== options.kind) continue;
      if (tags.length && !tags.every(tag => Array.isArray(e.tags) && e.tags.includes(tag))) continue;
      if (q && !normalizeSearch([n.title,n.body,n.catKey,e.cornell?.cues,e.cornell?.notes,e.cornell?.summary,...(Array.isArray(e.tags) ? e.tags : [])].join(' ')).includes(q)) continue;
      matches.push(n);
    }
    const sort = options.sort || 'recent';
    if (!['recent','oldest','title'].includes(sort)) throw new Error('Invalid sort');
    const stamp = n => typeof n.updatedAt === 'number' ? n.updatedAt : typeof n.createdAt === 'number' ? n.createdAt : n.id;
    matches.sort((a,b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const c = sort === 'title' ? String(a.title).localeCompare(String(b.title)) : sort === 'oldest' ? stamp(a)-stamp(b) : stamp(b)-stamp(a);
      return c || a.id-b.id;
    });
    return {total:matches.length,offset,limit,items:matches.slice(offset,offset+limit).map(copy)};
  }
  function checklistItems(note) {
    validateNote(note); const e = ext(note), sections = [['body',note.body]];
    if (e.cornell) { validateCornell(e.cornell); sections.push(['cornell.notes',e.cornell.notes]); }
    const out=[];
    for (const [section,text] of sections) {
      const seen = new Map();
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*(?:☐|\[ \]|[-*]\s*\[ \])\s*(.+?)\s*$/u);
        if (!m) continue;
        const title=m[1].trim(); if (!title) continue;
        const ordinal=(seen.get(title)||0)+1;seen.set(title,ordinal);
        out.push({key:JSON.stringify([section,title,ordinal]),title,section});
      }
    }
    return out;
  }
  function checklistCandidates(notes,tasks,noteId) {
    checkRecords(notes); checkRecords(tasks,'tasks'); const note = validateNote(findOne(notes,noteId));
    const recorded = new Set(Array.isArray(ext(note).extractedKeys) ? ext(note).extractedKeys : []);
    for (const task of tasks) if (task && task.originNoteId === noteId && typeof task.originChecklistKey === 'string') recorded.add(task.originChecklistKey);
    return checklistItems(note).filter(i=>!recorded.has(i.key));
  }
  function extractTasks(notes,tasks,noteId,assignments,now) {
    checkRecords(notes); checkRecords(tasks,'tasks'); const note = validateNote(findOne(notes,noteId));
    if (!Array.isArray(assignments)) throw new TypeError('assignments array required');
    const candidates = new Map(checklistCandidates(notes,tasks,noteId).map(x=>[x.key,x]));
    const used = new Set(), ids = new Set(tasks.map(t=>t?.id));
    const added=[];
    for (const pair of assignments) {
      if (!plain(pair) || typeof pair.key !== 'string') throw new TypeError('Invalid assignment');
      assertId(pair.taskId,'task');
      if (used.has(pair.key) || !candidates.has(pair.key)) throw new Error('ALREADY_EXTRACTED_OR_INVALID_KEY');
      if (ids.has(pair.taskId)) throw new Error('DUPLICATE_TASK_ID');
      used.add(pair.key); ids.add(pair.taskId);
      const c=candidates.get(pair.key);
      added.push({id:pair.taskId,title:c.title,done:false,isStarter:false,
        catKey:note.catKey || 'study',...(note.calDate ? {date:note.calDate} : {}),
        originNoteId:noteId,originChecklistKey:pair.key});
    }
    if (!added.length) return {notes,tasks,created:[]};
    const prior = Array.isArray(ext(note).extractedKeys) ? ext(note).extractedKeys : [];
    const savedNote = {...copy(note),updatedAt:time(now),notesV21:{...copy(ext(note)),extractedKeys:[...new Set([...prior,...used])]}};
    const nextNotes=replace(notes,noteId,savedNote);
    return {notes:nextNotes,tasks:[...tasks,...added],created:copy(added)};
  }
  function validateRecallPairs(pairs) {
    if (!Array.isArray(pairs) || pairs.length > 200 || pairs.some(p => !plain(p) ||
      typeof p.question !== 'string' || typeof p.answer !== 'string' ||
      !p.question.trim() || !p.answer.trim() ||
      (p.key !== undefined && (typeof p.key !== 'string' || !p.key))))
      throw new TypeError('Invalid recallPairs');
    const keys = pairs.filter(p => p.key !== undefined).map(p => p.key);
    if (new Set(keys).size !== keys.length) throw new Error('DUPLICATE_RECALL_KEY');
  }
  function recallCards(note) {
    validateNote(note); const pairs=ext(note).recallPairs || [];
    validateRecallPairs(pairs);
    return pairs.map((p,i)=>({noteId:note.id,key:p.key || String(i),question:p.question,answer:p.answer}));
  }
  return Object.freeze({MAX_NOTES,MAX_PAGE,MAX_REVISIONS,BUILTIN_TEMPLATES,
    validateNote,createNote,edit,undo:(notes,id,now)=>restoreRevision(notes,id,'undo',now),
    redo:(notes,id,now)=>restoreRevision(notes,id,'redo',now),
    validateCornell,cornellText,createTemplate,fromTemplate,setStatus,permanentlyDelete,
    link,backlinks,normalizeSearch,search,checklistItems,checklistCandidates,extractTasks,recallCards});
});
