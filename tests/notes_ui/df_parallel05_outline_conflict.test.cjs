'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const UI=require('../../android/app/src/main/assets/web/notes_editor_ui.js');
test('DF05: outline reads only authored headings with bounded line and item limits, preserving raw content',()=>{
 const raw='# العنوان\nPlain <script>\n## Einführung ü\n### Note ٩\nNot a heading';
 const before=raw;
 assert.deepEqual(UI.headingOutline(raw),[
  {line:0,title:'العنوان'},{line:2,title:'Einführung ü'},{line:3,title:'Note ٩'}
 ]);
 assert.equal(raw,before);
 assert.deepEqual(UI.headingOutline('not a heading'),[]);
 const long=Array.from({length:500},(_,i)=>'# Heading '+i).join('\n');
 const o=UI.headingOutline(long);
 assert.equal(o.length,40);
 assert.equal(o[39].line,39);
});
test('DF05: stale note conflict has a human warning in Arabic and English and does not use raw error label',()=>{
 const en=UI.translate('en','conflict');
 const ar=UI.translate('ar','conflict');
 assert.notEqual(en,'conflict');
 assert.notEqual(ar,'conflict');
 assert.notEqual(ar,en);
 const code=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_editor_ui.js'),'utf8');
 assert.match(code,/NOTE_CONFLICT_RELOAD_REQUIRED'\s*\?\s*t\('conflict'\)/);
});
