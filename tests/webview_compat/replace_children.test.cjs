'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base='android/app/src/main/assets/web/';
function fixture(){
 class Node {
  constructor(type,owner){this.nodeType=type;this.ownerDocument=owner;this.childNodes=[];this.parentNode=null;}
  get firstChild(){return this.childNodes[0]||null;}
  removeChild(node){const i=this.childNodes.indexOf(node);assert.ok(i>=0);this.childNodes.splice(i,1);node.parentNode=null;return node;}
  appendChild(node){
   if(node.nodeType===11){while(node.firstChild)this.appendChild(node.firstChild);return node;}
   if(node.parentNode)node.parentNode.removeChild(node);
   node.parentNode=this;this.childNodes.push(node);return node;
  }
 }
 class Element extends Node {constructor(owner){super(1,owner);}}
 class DocumentFragment extends Node {constructor(owner){super(11,owner);}}
 class Document extends Node {
  constructor(){super(9,null);}
  createTextNode(text){const node=new Node(3,this);node.data=String(text);return node;}
  createDocumentFragment(){return new DocumentFragment(this);}
 }
 const document=new Document();
 const ctx={Node,Element,DocumentFragment,Document,document};vm.createContext(ctx);
 const script=base+'js/dom_compat.js';
 if(fs.existsSync(script))vm.runInContext(fs.readFileSync(script,'utf8'),ctx);
 return {...ctx,parent:new Element(document)};
}
test('old Android WebView can clear and rebuild a parent without native replaceChildren',()=>{
 const {parent,document}=fixture();
 parent.appendChild(document.createTextNode('old'));
 parent.replaceChildren();assert.equal(parent.childNodes.length,0);
 parent.replaceChildren('new');assert.equal(parent.firstChild.data,'new');
});
test('replacement moves an existing child and treats authored markup/numerals as text',()=>{
 const {parent,document}=fixture(),child=document.createTextNode('keep');
 parent.appendChild(child);parent.appendChild(document.createTextNode('remove'));
 parent.replaceChildren(child,'<img src=x onerror=alert(1)> ۱۲ ٣');
 assert.equal(parent.childNodes.length,2);assert.equal(parent.firstChild,child);
 assert.equal(parent.childNodes[1].nodeType,3);
 assert.equal(parent.childNodes[1].data,'<img src=x onerror=alert(1)> ۱۲ ٣');
});
test('native replaceChildren stays intact and compatibility runs before all app consumers',()=>{
 const {Node,Element,DocumentFragment,Document,document}=fixture();
 const native=function(){};Element.prototype.replaceChildren=native;
 const script=base+'js/dom_compat.js';
 assert.ok(fs.existsSync(script),'missing offline DOM compatibility bootstrap');
 vm.runInNewContext(fs.readFileSync(script,'utf8'),{Node,Element,DocumentFragment,Document,document});
 assert.equal(Element.prototype.replaceChildren,native);
 const html=fs.readFileSync(base+'index.html','utf8');
 const pos=html.indexOf('src="js/dom_compat.js"');assert.ok(pos>=0);
 for(const file of ['app.js','notes_studio.js','tasks_studio.js','analytics_studio.js','goals_studio.js'])
  assert.ok(pos<html.indexOf('src="'+file+'"'),file+' must load after compatibility');
});
