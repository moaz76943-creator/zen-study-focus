'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseNativeConfirmButton}=require('./android_device_touch.cjs');

test('real Deep Focus confirmation needs no editable prompt input',()=>{
 const xml='<hierarchy><node class="android.widget.TextView" text="Deep Focus"/>'+
  '<node class="android.widget.TextView" text="Discard incomplete timer?"/>'+
  '<node class="android.widget.Button" resource-id="android:id/button2" bounds="[120,650][430,740]"/>'+
  '<node class="android.widget.Button" resource-id="android:id/button1" bounds="[620,650][940,740]"/></hierarchy>';
 assert.deepEqual(parseNativeConfirmButton(xml),{x:780,y:695});
});
test('browser-origin and unbranded confirmations are rejected, never auto-accepted',()=>{
 const valid='<node class="android.widget.TextView" text="Deep Focus"/>'+
  '<node resource-id="android:id/button1" bounds="[620,650][940,740]"/>';
 assert.throws(()=>parseNativeConfirmButton(valid.replace('Deep Focus','The page at file://')),/TRANSPORT:/);
 assert.throws(()=>parseNativeConfirmButton(valid.replace('Deep Focus','Other app')),/TRANSPORT:/);
 assert.throws(()=>parseNativeConfirmButton('<node text="Deep Focus"/>'),/TRANSPORT:/);
 assert.throws(()=>parseNativeConfirmButton(valid.replace('[620,650][940,740]','[620,650][620,740]')),/TRANSPORT:/);
});
