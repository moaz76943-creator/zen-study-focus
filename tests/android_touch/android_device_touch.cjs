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
  const px=Math.round(box.left+x*box.width/viewportWidth);
  const py=Math.round(box.top+y*box.height/viewportHeight);
  if(px<box.left||py<box.top||px>=box.right||py>=box.bottom)
    throw new Error('TRANSPORT: Translated touch lies outside actual WebView');
  return {x:px,y:py};
}
module.exports={parseWebViewBounds,cssPointToAndroid};
