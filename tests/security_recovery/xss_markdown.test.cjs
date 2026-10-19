'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const NotesUI = require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const root=path.resolve(__dirname,'../..');
const web=path.join(root,'android/app/src/main/assets/web');

function fakeNode(tag,kind='element') {
  return {
    tagName:tag.toUpperCase(),kind,children:[],textContent:'',
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...children){this.children=children;}
  };
}
function walk(node) {return [node,...node.children.flatMap(walk)];}

test('XSS payloads remain inert text in Notes preview, including Markdown javascript links',()=>{
  const prior=global.document;
  global.document={
    createElement(tag){return fakeNode(tag);},
    createTextNode(value){const node=fakeNode('#text','text');node.textContent=value;return node;}
  };
  try {
    const host=fakeNode('section');
    const malicious='<img src=x onerror=alert(1)>\n[click](javascript:alert(1))\n<svg onload=alert(2)>';
    NotesUI.renderText(host,malicious,'alert');
    const nodes=walk(host);
    assert.ok(nodes.every(n=>!['IMG','SVG','SCRIPT','A','IFRAME'].includes(n.tagName)));
    assert.ok(nodes.some(n=>n.kind==='text'&&n.textContent.includes('<img')));
    assert.ok(nodes.some(n=>n.kind==='text'&&n.textContent.includes('javascript:')));
  } finally {
    if(prior===undefined)delete global.document;
    else global.document=prior;
  }
});

test('Markdown export escapes user-supplied raw tags and does not alter source note',()=>{
  const note={id:200,title:'<svg onload=alert(1)>',body:'<img src=x onerror=alert(1)>'};
  const original=JSON.stringify(note);
  const exported=NotesUI.serializeNote(note,'md');
  assert.ok(exported.includes('&lt;svg'));
  assert.ok(exported.includes('&lt;img'));
  assert.ok(!exported.includes('<svg'));
  assert.ok(!exported.includes('<img'));
  assert.equal(JSON.stringify(note),original);
});

test('user content render surfaces avoid code execution primitives',()=>{
  for(const file of ['notes_editor_ui.js','notes_studio.js','tasks_studio.js']){
    const code=fs.readFileSync(path.join(web,file),'utf8');
    assert.doesNotMatch(code,/\beval\s*\(|\bnew\s+Function\s*\(/);
    assert.doesNotMatch(code,/document\.write\s*\(/);
  }
});

test('production JS and Android sources contain no literal high-confidence private secrets',()=>{
  const javaDir=path.join(root,'android/app/src/main/java/com/zenstudy/focus');
  const paths=[...fs.readdirSync(web).filter(x=>x.endsWith('.js')).map(x=>path.join(web,x)),
    ...fs.readdirSync(javaDir).filter(x=>x.endsWith('.java')).map(x=>path.join(javaDir,x))];
  const patterns=[
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bghp_[A-Za-z0-9]{36}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
    /\bAIza[0-9A-Za-z_-]{35}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bsk-proj-[A-Za-z0-9_-]{25,}\b/
  ];
  for(const filename of paths){
    const source=fs.readFileSync(filename,'utf8');
    for(const re of patterns)assert.doesNotMatch(source,re,filename);
  }
});
