'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const compat=require('../../android/app/src/main/assets/web/webview_compat.js');
test('existing native replaceChildren implementations are preserved without wrapping',()=>{
 function Element(){}function Fragment(){}
 const first=function(){return 'native-element';},second=function(){return 'native-fragment';};
 Element.prototype.replaceChildren=first;Fragment.prototype.replaceChildren=second;
 assert.equal(compat.install({Element,DocumentFragment:Fragment}),0);
 assert.equal(Element.prototype.replaceChildren,first);assert.equal(Fragment.prototype.replaceChildren,second);
});
