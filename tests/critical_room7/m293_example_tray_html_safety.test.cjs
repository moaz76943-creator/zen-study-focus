'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('/* === M293_EXAMPLE_SENTENCE_CONTEXT_TRAY_AND_CODE113_V1 === */');
const end=app.indexOf('/* === M294_',start);
assert.ok(start>=0&&end>start,'M293 implementation must be loaded from actual app source');
function load(){
 let listener=null;const utterances=[];
 const window={speechSynthesis:{cancel(){},speak(u){utterances.push(u);}}};
 const document={addEventListener(kind,fn){if(kind==='click')listener=fn;}};
 function SpeechSynthesisUtterance(text){this.text=text;}
 vm.runInNewContext(app.slice(start,end),{window,document,SpeechSynthesisUtterance,console},{timeout:2000});
 return {window,utterances,click:(target)=>listener({target})};
}
test('M293 malicious imported example is inert text and never inline JavaScript',()=>{
 const a=load(),payload='<img src=x onerror=alert(1)> "hello" & <script>alert(2)</script> \'quote';
 const html=a.window.dfRenderCardExampleTrayHtml({example:payload});
 assert.ok(html.includes('&lt;img')&&html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&amp;')&&html.includes('&quot;')&&html.includes('&#39;'));
 assert.ok(!html.includes('<img')&&!html.includes('<script')&&!/\\bonclick\\s*=/.test(html));
 assert.ok(html.includes('data-df-example-speech='));
});
test('M293 speech button uses delegated click with literal original sentence',()=>{
 const a=load(),sentence='Lila\'s <book> & "quotes"';
 const html=a.window.dfRenderCardExampleTrayHtml({example:sentence});
 assert.ok(html.includes('data-df-sentence='));
 const button={closest(query){return query.startsWith('button[')?this:query==='.df-card-example-tray'?{}:null;},getAttribute(name){return name==='data-df-sentence'?sentence:null;}};
 a.click({closest(){return button;}});
 assert.equal(a.utterances.length,1);
 assert.equal(a.utterances[0].text,sentence);
 a.click({closest(){return null;}});
 assert.equal(a.utterances.length,1);
});
