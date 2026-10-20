'use strict';
// Translate actual WebView CSS viewport coordinates to Android screen pixels.
// ADB input tap uses screen pixels, unlike CDP's unreliable synthetic touch injection.
function parseWebViewBounds(xml) {
  const nodes=String(xml||'').match(/<node\b[^>]*>/g)||[];
  const node=nodes.find(n=>/\bclass="android\.webkit\.WebView"/.test(n));
  if(!node)throw new Error('TRANSPORT: WebView node absent from real Android UI hierarchy');
  const m=/\bbounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/.exec(node);
  if(!m)throw new Error('TRANSPORT: WebView frame lacks physical bounds');
  const [left,top,right,bottom]=m.slice(1).map(Number);
  const width=right-left,height=bottom-top;
  if(![left,top,right,bottom,width,height].every(Number.isSafeInteger)||width<=0||height<=0)
    throw new Error('TRANSPORT: Invalid WebView physical frame');
  return {left,top,right,bottom,width,height};
}
function cssPointToAndroid(point,box) {
  const {x,y,viewportWidth,viewportHeight}=point||{};
  if(![x,y,viewportWidth,viewportHeight].every(Number.isFinite)||
     viewportWidth<=0||viewportHeight<=0||x<0||y<0||x>=viewportWidth||y>=viewportHeight||
     !box||![box.left,box.top,box.right,box.bottom,box.width,box.height].every(Number.isFinite)||
     box.width<=0||box.height<=0)
    throw new Error('TRANSPORT: Unsafe CSS-to-Android touch geometry');
  const scaleX=box.width/viewportWidth,scaleY=box.height/viewportHeight;
  if(Math.abs(scaleX-scaleY)/Math.max(scaleX,scaleY)>0.025)
    throw new Error('TRANSPORT: Android frame and CSS viewport describe different layout states');
  const px=Math.round(box.left+x*box.width/viewportWidth);
  const py=Math.round(box.top+y*box.height/viewportHeight);
  if(px<box.left||py<box.top||px>=box.right||py>=box.bottom)
    throw new Error('TRANSPORT: Translated touch lies outside actual WebView');
  return {x:px,y:py};
}
function parseNativePromptButton(xml,which='button1') {
  if(!['button1','button2'].includes(which))throw new Error('TRANSPORT: Unsupported native prompt action');
  const nodes=String(xml||'').match(/<node\b[^>]*>/g)||[];
  if(!nodes.some(n=>/\bclass="android\.widget\.EditText"/.test(n)))
    throw new Error('TRANSPORT: Editable native prompt is not exposed');
  const button=nodes.find(n=>n.includes('resource-id="android:id/'+which+'"'));
  const m=button&&/\bbounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/.exec(button);
  if(!m)throw new Error('TRANSPORT: Native prompt confirmation button unavailable');
  const [left,top,right,bottom]=m.slice(1).map(Number);
  if(![left,top,right,bottom].every(Number.isSafeInteger)||right<=left||bottom<=top)
    throw new Error('TRANSPORT: Invalid native prompt confirmation bounds');
  return {x:Math.round((left+right)/2),y:Math.round((top+bottom)/2)};
}
function nativePromptText(xml){
 const nodes=String(xml||'').match(/<node\b[^>]*>/g)||[];
 const fields=nodes.filter(n=>/\bclass="android\.widget\.EditText"/.test(n));
 if(fields.length!==1)throw new Error('TRANSPORT: Native prompt input missing or ambiguous');
 const text=/\btext="([^"]*)"/.exec(fields[0]);
 if(!text)throw new Error('TRANSPORT: Native prompt input text unavailable');
 return text[1].replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
module.exports={parseWebViewBounds,cssPointToAndroid,parseNativePromptButton,nativePromptText};
