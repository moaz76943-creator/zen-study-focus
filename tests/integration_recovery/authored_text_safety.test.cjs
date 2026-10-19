'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
test('DF-059 existing edited starter content is guarded before automatic language sample localization',()=>{
 assert.match(app,/Object\.values\(DICT\)\.some\(/);
 assert.match(app,/sampleNotes\?\.\[idx\]/);
 assert.match(app,/sampleTasks\?\.\[idx\]/);
});
test('DF-064 user-authored numeric glyphs are not rewritten in notes, task cards, calendar or clipboard exports',()=>{
 for(const source of [
  "toWest(document.getElementById('inpNoteTitle').value.trim())",
  "toWest(document.getElementById('inpNoteBody').value.trim())",
  "toWest(document.getElementById('inpQuickDump').value.trim())",
  "toWest(n.title)","toWest(n.body)","toWest(t.title)"
 ])assert.ok(!app.includes(source),'User content must be losslessly preserved: '+source);
 assert.match(app,/const t = document\.getElementById\('inpNoteTitle'\)\.value\.trim\(\)/);
 assert.match(app,/const b = document\.getElementById\('inpNoteBody'\)\.value\.trim\(\)/);
});