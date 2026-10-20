'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseWebViewBounds,cssPointToAndroid}=require('./android_device_touch.cjs');
const xml='<?xml version="1.0"?><hierarchy rotation="0"><node class="android.widget.FrameLayout" bounds="[0,0][1080,2400]"><node class="android.webkit.WebView" bounds="[0,60][1080,2310]" /></node></hierarchy>';
test('real Android WebView XML bounds are parsed independently of unavailable HTML descendants',()=>{
  assert.deepEqual(parseWebViewBounds(xml),{left:0,top:60,right:1080,bottom:2310,width:1080,height:2250});
});
test('CSS WebView touch coordinates map to physical adb pixels including system-bar offset',()=>{
  const box=parseWebViewBounds(xml);
  assert.deepEqual(cssPointToAndroid({x:206,y:421.5,viewportWidth:412,viewportHeight:843},box),{x:540,y:1185});
  assert.deepEqual(cssPointToAndroid({x:31.5,y:809,viewportWidth:412,viewportHeight:843},box),{x:83,y:2219});
});
test('unavailable, spoofed, or invalid Android WebView bounds fail closed',()=>{
  for(const xmlText of ['', '<node class="android.widget.WebView" bounds="[0,0][1080,2400]"/>','<node class="android.webkit.WebView" bounds="[5,5][5,100]"/>'])
    assert.throws(()=>parseWebViewBounds(xmlText),/TRANSPORT:/);
});
test('invalid device points never become trusted touches',()=>{
  const box=parseWebViewBounds(xml);
  for(const bad of [{x:-1,y:100,viewportWidth:412,viewportHeight:843},
                    {x:412,y:100,viewportWidth:412,viewportHeight:843},
                    {x:20,y:850,viewportWidth:412,viewportHeight:843},
                    {x:NaN,y:5,viewportWidth:412,viewportHeight:843}])
    assert.throws(()=>cssPointToAndroid(bad,box),/TRANSPORT:/);
});
test('native prompt confirmation requires a real editable dialog and positive button bounds',()=>{
 const {parseNativePromptButton}=require('./android_device_touch.cjs');
 const prompt='<hierarchy><node class="android.widget.EditText" bounds="[10,10][900,100]"/><node resource-id="android:id/button1" bounds="[600,110][900,180]"/></hierarchy>';
 assert.deepEqual(parseNativePromptButton(prompt),{x:750,y:145});
 assert.throws(()=>parseNativePromptButton('<node resource-id="android:id/button1" bounds="[0,0][100,100]"/>'),/TRANSPORT:/);
 assert.throws(()=>parseNativePromptButton(prompt.replace('[600,110][900,180]','[600,110][600,180]')),/TRANSPORT:/);
});
test('native field value is verified before confirmation, with safe cancellation and ambiguity rejection',()=>{
 const {nativePromptText,parseNativePromptButton}=require('./android_device_touch.cjs');
 const field='<node class="android.widget.EditText" text="Fixture&amp;Child" bounds="[0,0][100,20]"/>';
 assert.equal(nativePromptText(field),'Fixture&Child');
 assert.throws(()=>nativePromptText(field+field),/ambiguous/);
 assert.throws(()=>nativePromptText('<node class="android.widget.EditText"/>'),/unavailable/);
 assert.deepEqual(parseNativePromptButton(field+'<node resource-id="android:id/button2" bounds="[10,20][110,60]"/>','button2'),{x:60,y:40});
 assert.throws(()=>parseNativePromptButton(field,'arbitrary'),/Unsupported/);
});
