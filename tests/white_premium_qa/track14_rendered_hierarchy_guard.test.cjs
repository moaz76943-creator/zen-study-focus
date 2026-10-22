'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const script=path.join(__dirname,'track14_rendered_hierarchy_guard.py');
function verify(nodes){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'track14-a11y-'));
  const file=path.join(d,'window.xml');
  try{
    fs.writeFileSync(file,nodes,'utf8');
    const proc=spawnSync('python3',[script,file],{encoding:'utf8',timeout:15000});
    return {code:proc.status,details:proc.stdout?JSON.parse(proc.stdout):{},stderr:proc.stderr};
  }finally{fs.rmSync(d,{recursive:true,force:true});}
}
const node=(text,cls='android.view.View',pack='com.zenstudy.focus')=>'<node class="'+cls+'" package="'+pack+'" text="'+text+'" content-desc="" />';
const doc=body=>'<?xml version="1.0" encoding="UTF-8"?><hierarchy>'+body+'</hierarchy>';
function web(...texts){return doc('<node class="android.webkit.WebView" package="com.zenstudy.focus" text="">'+texts.map(x=>node(x)).join('')+'</node>')}
test('real WebView plus header and two English navigation labels qualifies as semantic candidate',()=>{
  const r=verify(web('Deep Focus','Tasks','Notes','Timer'));
  assert.equal(r.code,0,r.stderr+JSON.stringify(r.details));
  assert.equal(r.details.status,'RENDERED_SEMANTIC_CANDIDATE');
});
test('Arabic RTL and German navigation labels are recognized without translation',()=>{
  for(const labels of [['Deep Focus','المهام','التقويم'],['Deep Focus','Aufgaben','Notizen']]){
    const r=verify(web(...labels));
    assert.equal(r.code,0,r.stderr+JSON.stringify(r.details));
  }
});
test('white splash or decorative WebView with only title is not accepted',()=>{
  const r=verify(web('Deep Focus'));
  assert.equal(r.code,1,JSON.stringify(r.details));
  assert.equal(r.details.status,'WEBVIEW_DOM_NOT_VERIFIED');
});
test('Android chrome outside the application package cannot impersonate WebView navigation',()=>{
  const r=verify(doc(node('Deep Focus','android.webkit.WebView','com.android.settings')+node('Tasks')+node('Notes')));
  assert.equal(r.code,1,JSON.stringify(r.details));
});
test('app native title plus footer without an actual WebView is insufficient',()=>{
  const r=verify(doc(node('Deep Focus')+node('Tasks')+node('Notes')));
  assert.equal(r.code,1,JSON.stringify(r.details));
});
test('malformed or missing hierarchy returns invalid rather than UI pass',()=>{
  const r=verify('<hierarchy><node');
  assert.equal(r.code,1,JSON.stringify(r.details));
  assert.equal(r.details.status,'HIERARCHY_INVALID');
  const missing=spawnSync('python3',[script,'/nonexistent-track14-window.xml'],{encoding:'utf8'});
  assert.equal(missing.status,1,missing.stdout+missing.stderr);
});
