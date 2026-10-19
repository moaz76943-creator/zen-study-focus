'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_editor_ui.js'),'utf8');
test('Notes editor uses the existing selected-language label for each note category',()=>{
  assert.match(source,/typeof getNoteTagLabel\s*===\s*['"]function['"]\s*\?\s*getNoteTagLabel\(n\.catKey\)/);
  assert.doesNotMatch(source,/el\(['"]span['"],['"]ns-type['"],n\.catKey\|\|['"]note['"]\)/);
});
