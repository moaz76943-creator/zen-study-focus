'use strict';
// Exercise the real Java-embedded JavaScript against a controlled DOM boundary.
// These host checks prove preparation/measurement contracts, not Android behavior.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const files=[path.join(__dirname,'TouchInstrumentation.java'),path.join(__dirname,'../../tasks_core/df_final03_instrumentation/TaskInstrumentation.java')];
for(const file of files){
 const java=fs.readFileSync(file,'utf8'),tasks=file.includes('TaskInstrumentation');
 const declaration='String '+(tasks?'source':'expression')+'=';
 const begin=java.indexOf(declaration,java.indexOf('private void tap('));
 const end=java.indexOf(';\n        js(',begin);
 assert.ok(begin>=0&&end>begin,'Actual touch geometry expression missing');
 const code=java.slice(begin+declaration.length,end);
 // Decode Java string literals and its single dynamic JSONObject.quote(id).
 const tokens=code.match(/"(?:\\.|[^"\\])*"|JSONObject\.quote\(id\)/g);
 const expression=tokens.map(token=>token==='JSONObject.quote(id)'?JSON.stringify('control'):JSON.parse(token)).join('');
 test(path.basename(file)+': final hit-test measures without initiating another scroll',()=>{
  let mutations=0,rect={left:20,top:1000,width:44,height:44,right:64,bottom:1044};
  rect.toJSON=()=>({...rect,toJSON:undefined});
  const control={scrollIntoView(options){assert.equal(options.behavior,'instant');mutations++;rect.top=300;rect.bottom=344;},getBoundingClientRect:()=>rect,closest:()=>null,contains:node=>node===control};
  const document={getElementById:()=>control,elementFromPoint:()=>control,querySelector:()=>null,styleSheets:[],body:{className:'df-v22'}};
  const window={visualViewport:{offsetLeft:0,offsetTop:0,width:320,height:772,scale:1},scrollBy(){throw Error('Unexpected measurement scroll');}};
  const context={document,window,innerWidth:320,innerHeight:772,devicePixelRatio:1,getComputedStyle:()=>({position:'fixed',bottom:'0px',maxHeight:'756px'}),matchMedia:()=>({matches:true})};
  const prepared=vm.runInNewContext(expression,context);
  assert.equal(mutations,1);assert.equal(prepared[tasks?'present':'exists'],true);
  control.scrollIntoView=()=>{throw Error('Measurement must not scroll');};
  const measured=vm.runInNewContext(expression.replace('const prepare=true;','const prepare=false;'),context);
  assert.equal(mutations,1);assert.equal(measured.hit,true);assert.equal(measured.y,322);
  assert.ok(java.includes('awaitRenderedTouchGeometry();\n        JSONObject '+(tasks?'point=js(source':'p=js(expression')+'.replace("const prepare=true;","const prepare=false;"))'));
 });
}

const os=require('node:os'),cp=require('node:child_process');
for(const file of files)test(path.basename(file)+': actual Java fence waits for compositor and two frames before idle',()=>{
 const java=fs.readFileSync(file,'utf8');
 const start=java.indexOf('    private void awaitRenderedTouchGeometry(');
 let end=java.indexOf('{',start)+1,depth=1;
 while(depth&&end<java.length){if(java[end]==='{')depth++;else if(java[end]==='}')depth--;end++;}
 assert.ok(start>=0&&depth===0);
 const method=java.slice(start,end),dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-rendered-touch-'));
 try{
  const probe=`import java.util.concurrent.*;
class RenderedTouchProbe {
 static class SystemClock {static long uptimeMillis(){return System.nanoTime()/1000000;}}
 static volatile int phase=0; static volatile Throwable failure; boolean idle;
 static void check(boolean okay,String message){if(!okay)throw new AssertionError(message);}
 static class WebView {
  abstract static class VisualStateCallback { public abstract void onComplete(long requestId); }
  void schedule(Runnable runnable){new Thread(()->{try{Thread.sleep(25);runnable.run();}catch(Throwable error){failure=error;}}).start();}
  void postVisualStateCallback(long requestId,VisualStateCallback callback){schedule(()->{check(phase==0,"visual callback order");phase++;callback.onComplete(requestId);});}
  void postOnAnimation(Runnable frame){schedule(()->{check(phase==1||phase==2,"frame ordering");phase++;frame.run();});}
 }
 WebView view=new WebView(); void runOnMainSync(Runnable runnable){runnable.run();}
 void waitForIdleSync(){check(phase==3,"idle preceded compositor/frames");idle=true;}
 void assertTrue(boolean okay,String message){check(okay,message);} void assertOk(boolean okay,String message){check(okay,message);}
 ${method}
 public static void main(String[] args)throws Exception{RenderedTouchProbe probe=new RenderedTouchProbe();probe.awaitRenderedTouchGeometry();if(failure!=null)throw new AssertionError(failure);check(probe.idle&&phase==3,"touch fence returned early");System.out.println("PASS actual Java compositor/frame fence");}
}`;
  const filePath=path.join(dir,'RenderedTouchProbe.java');fs.writeFileSync(filePath,probe);
  const build=cp.spawnSync('java',['com.sun.tools.javac.Main','-d',dir,filePath],{encoding:'utf8',timeout:30000});
  assert.equal(build.status,0,build.stderr);
  const result=cp.spawnSync('java',['-cp',dir,'RenderedTouchProbe'],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS actual Java compositor\/frame fence/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
