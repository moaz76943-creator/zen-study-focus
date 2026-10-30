'use strict';
// Host boundary test only: execute the instrumentation's actual Java injection
// method under controlled dispatch delays. This is not Android touch evidence.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
for(const file of [path.join(__dirname,'TouchInstrumentation.java'),path.join(__dirname,'../../tasks_core/df_final03_instrumentation/TaskInstrumentation.java')]){
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('    private long injectPhysicalTap(');
assert.ok(start>=0,'Actual instrumentation injection method missing');
let end=source.indexOf('{',start)+1,depth=1;
while(depth&&end<source.length){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;end++;}
const method=source.slice(start,end);

test(path.basename(file)+': real Java injection timestamps release after synchronous dispatch and recycles failures',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df08-touch-time-'));
 try {
  const java=`import java.util.*;
class TouchTimingProbe {
 static class SystemClock { static long now; static long uptimeMillis(){return now;} static void sleep(long delay){now+=delay;} }
 static class InputDevice { static final int SOURCE_TOUCHSCREEN=4098; }
 static class MotionEvent {
  static final int ACTION_DOWN=0,ACTION_UP=1; static List<MotionEvent> created=new ArrayList<>();
  long down,time; int action,x,y,source; boolean recycled;
  static MotionEvent obtain(long down,long time,int action,int x,int y,int meta){MotionEvent e=new MotionEvent();e.down=down;e.time=time;e.action=action;e.x=x;e.y=y;created.add(e);return e;}
  void setSource(int value){source=value;} void recycle(){recycled=true;}
 }
 static class Automation {
  long latency; int failAction=-1; List<MotionEvent> events=new ArrayList<>();
  boolean injectInputEvent(MotionEvent e,boolean sync){check(sync,"dispatch must remain synchronous");events.add(e);if(e.action==0)SystemClock.now+=latency;else check(e.time==SystemClock.now,"UP timestamp conceals actual dispatch latency");return e.action!=failAction;}
 }
 Automation automation=new Automation(); Automation getUiAutomation(){return automation;}
 static void check(boolean okay,String reason){if(!okay)throw new AssertionError(reason);}
 static void assertTrue(boolean okay,String reason){check(okay,reason);}
 static void assertOk(boolean okay,String reason){check(okay,reason);}
 ${method}
 public static void main(String[] args){
  for(long delay:new long[]{0,300,900}){
   TouchTimingProbe p=new TouchTimingProbe();p.automation.latency=delay;MotionEvent.created.clear();SystemClock.now=1000;
   long duration=p.injectPhysicalTap(293,758,"navAnalytics");
   check(duration==delay+90,"physical duration does not reflect dispatch delay");check(p.automation.events.size()==2,"not exactly one DOWN and UP");
   MotionEvent down=p.automation.events.get(0),up=p.automation.events.get(1);
   check(down.action==0&&up.action==1&&down.down==up.down&&down.time==1000&&up.time==1090+delay,"inconsistent gesture timing");
   check(down.x==293&&up.x==293&&down.y==758&&up.y==758,"coordinates changed");
   check(down.source==4098&&up.source==4098&&down.recycled&&up.recycled,"source or cleanup lost");
  }
  for(int fail:new int[]{0,1}){
   TouchTimingProbe p=new TouchTimingProbe();p.automation.failAction=fail;MotionEvent.created.clear();boolean failed=false;
   try{p.injectPhysicalTap(1,2,"rejected");}catch(AssertionError expected){failed=true;}
   check(failed,"rejected injection reached success");for(MotionEvent e:MotionEvent.created)check(e.recycled,"rejected event leaked");
  }
  System.out.println("PASS actual injection Java: 3 dispatch delays; DOWN/UP rejection cleanup");
 }
}`;
  fs.writeFileSync(path.join(dir,'TouchTimingProbe.java'),java);
  const compiled=cp.spawnSync('java',['com.sun.tools.javac.Main','-d',dir,path.join(dir,'TouchTimingProbe.java')],{encoding:'utf8',timeout:30000});
  assert.equal(compiled.error,undefined);assert.equal(compiled.status,0,compiled.stderr);
  const result=cp.spawnSync('java',['-cp',dir,'TouchTimingProbe'],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS actual injection Java/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

}
