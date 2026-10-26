package com.zenstudy.focus.df03;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;
import org.json.JSONObject;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Disposable Android emulator only. Tests real bundled WebView without CDP or Native changes. */
public final class TaskInstrumentation extends Instrumentation {
    private static final String TAG="DF03_TASKS_ANDROID";
    private static final int FIXTURE_ID=9900876;
    private static final String ORIGINAL="DF03 synthetic undated";
    private static final String SAVED="DF03 saved no date";
    private Activity activity;
    private WebView view;
    private int realTaps=0;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override public void onStart() {
        super.onStart();
        Bundle report=new Bundle();
        try {
            Bundle args=getArguments();
            String stage=args==null?"edit":args.getString("stage","edit");
            String locale=args==null?"en":args.getString("locale","en");
            Intent launch=new Intent();
            launch.setClassName("com.zenstudy.focus","com.zenstudy.focus.MainActivity");
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
            activity=startActivitySync(launch);
            assertOk(activity!=null,"Real MainActivity not launched");
            waitForIdleSync();
            runOnMainSync(()->{
                View root=activity.findViewById(android.R.id.content);
                if(root instanceof android.view.ViewGroup){
                    View candidate=((android.view.ViewGroup)root).getChildAt(0);
                    if(candidate instanceof WebView)view=(WebView)candidate;
                }
            });
            assertOk(view!=null,"Real production WebView not found");
            boolean ready=false;
            for(int i=0;i<45;i++){
                JSONObject snapshot=js("({ready:document.readyState,url:location.href,core:!!window.DeepFocusTasksStudioV21,integration:!!window.DF22Integration,native:!!window.ZenNative})");
                if("complete".equals(snapshot.optString("ready")) &&
                    "file:///android_asset/web/index.html".equals(snapshot.optString("url")) &&
                    snapshot.optBoolean("core")&&snapshot.optBoolean("integration")&&snapshot.optBoolean("native")){
                    ready=true;break;
                }
                SystemClock.sleep(350);
            }
            assertOk(ready,"Bundled application/bootstrap not ready");
            if("verify".equals(stage)) {
                verifySaved();
            } else if("edit".equals(stage)){
                doEdit(locale);
            } else {
                throw new AssertionError("Unrecognized stage "+stage);
            }
            report.putString("df03_status","PASS");
            report.putString("df03_stage",stage);
            report.putString("df03_locale",locale);
            report.putInt("df03_real_taps",realTaps);
            Log.i(TAG,"PASS stage="+stage+" locale="+locale+" actualTaps="+realTaps);
            finish(Activity.RESULT_OK,report);
        }catch(Throwable err){
            report.putString("df03_status","FAIL");
            report.putString("df03_error",String.valueOf(err));
            Log.e(TAG,"FAIL after "+realTaps+" real taps",err);
            finish(Activity.RESULT_CANCELED,report);
        }
    }
    private static void assertOk(boolean test,String reason){
        if(!test)throw new AssertionError(reason);
    }
    private JSONObject js(String expression)throws Exception{
        CountDownLatch latch=new CountDownLatch(1);
        AtomicReference<String> reply=new AtomicReference<>();
        runOnMainSync(()->view.evaluateJavascript(expression,raw->{reply.set(raw);latch.countDown();}));
        assertOk(latch.await(14,TimeUnit.SECONDS),"WebView evaluateJavascript timeout");
        String raw=reply.get();
        assertOk(raw!=null&&!raw.equals("null"),"WebView JavaScript returned null: "+expression.substring(0,Math.min(60,expression.length())));
        return new JSONObject(raw);
    }
    private JSONObject receipt()throws Exception{
        return js("(()=>{const raw=ZenNative.readDurableV21();" +
          "if(!raw||raw==='NONE'||raw==='ERROR')return {ok:false,raw};" +
          "const p=JSON.parse(raw).packets,keys=Object.keys(p||{});" +
          "return {ok:keys.length===6&&keys.every(k=>p[k]===localStorage.getItem(k)&&(!p[k]||DeepFocusDataCompatV21.inspectPacket(p[k]).ok)),count:keys.length};})()");
    }
    private JSONObject readFixture()throws Exception{
        return js("(()=>{const s=DF22Integration.getSnapshot(),a=s.tasksList.filter(x=>x.id==="+FIXTURE_ID+");" +
          "const t=a[0]||{};return {count:a.length,title:t.title||'',date:Object.hasOwn(t,'date')," +
          "due:Object.hasOwn(t,'dueAssigned'),legacy:JSON.stringify(t.df03Legacy||null)};})()");
    }
    private void verifySaved()throws Exception{
        JSONObject item=readFixture();
        assertOk(item.optInt("count")==1&&SAVED.equals(item.optString("title")),"Force-stop relaunch failed to retain edit: "+item);
        assertOk(!item.optBoolean("date")&&!item.optBoolean("due"),"Legacy due fields fabricated after restart: "+item);
        assertOk("{\"keep\":\"العربية\"}".equals(item.optString("legacy")),"Unknown legacy data lost: "+item);
        JSONObject nativeAck=receipt();
        assertOk(nativeAck.optBoolean("ok"),"Native v21 packet readback failed after process kill: "+nativeAck);
    }
    private void doEdit(String locale)throws Exception{
        assertOk("en".equals(locale)||"ar".equals(locale),"Unsupported test locale");
        JSONObject seed=js("(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));" +
            "if(after.tasksList.some(t=>t.id==="+FIXTURE_ID+"))return {ok:false,reason:'collision'};" +
            "after.tasksList.push({id:"+FIXTURE_ID+",title:"+JSONObject.quote(ORIGINAL)+
            ",catKey:'study',done:false,isStarter:false,df03Legacy:{keep:'العربية'}});" +
            "const ok=DF22Integration.write(before,after);return {ok,id:"+FIXTURE_ID+"};})()");
        assertOk(seed.optBoolean("ok"),"Fixture durable v21 write not acknowledged "+seed);
        JSONObject ack=receipt();
        assertOk(ack.optBoolean("ok"),"Native ACK missing before touch "+ack);
        String target="df03TaskHost";
        mount(target,locale,false);
        JSONObject found=js("(()=>{const card=[...document.querySelectorAll('#df03TaskHost #df-task-results .df-task')]" +
            ".find(c=>c.querySelector('.df-title')?.textContent==="+JSONObject.quote(ORIGINAL)+");" +
            "const b=card&&[...card.querySelectorAll('button')].find(x=>x.textContent.trim()==="+
              JSONObject.quote("ar".equals(locale)?"تعديل":"Edit")+");" +
            "if(b)b.id='df03Edit';return {found:!!card,button:!!b,dir:document.querySelector('#df03TaskHost .df-tasks')?.getAttribute('dir')};})()");
        assertOk(found.optBoolean("found")&&found.optBoolean("button"),"Tasks Editor not visible "+found);
        assertOk(("ar".equals(locale)?"rtl":"ltr").equals(found.optString("dir")),"Wrong RTL/LTR direction "+found);
        tap("df03Edit");
        JSONObject draft=js("(()=>{const f=document.querySelector('#df03TaskHost form.df-form');" +
            "if(!f)return {form:false};const title=f.querySelector('input[type=text]'),save=f.querySelector('button[type=submit]');" +
            "title.value="+JSONObject.quote(SAVED)+";title.dispatchEvent(new Event('input',{bubbles:true}));" +
            "save.id='df03Save';return {form:true,date:f.querySelector('input[type=date]')?.value||''," +
            "checked:f.querySelector('input[type=checkbox]')?.checked,title:title.value};})()");
        assertOk(draft.optBoolean("form")&&"".equals(draft.optString("date"))&&!draft.optBoolean("checked"),
            "Editing legacy undated task fabricated date "+draft);
        tap("df03Save");
        JSONObject saved=readFixture();
        assertOk(saved.optInt("count")==1&&SAVED.equals(saved.optString("title")),
            "Real Android Save did not persist single edit "+saved);
        assertOk(!saved.optBoolean("date")&&!saved.optBoolean("due"),
            "Real Android Save invented date or due "+saved);
        assertOk(receipt().optBoolean("ok"),"Native v21 ACK missing after Save");
        mount("df03RejectHost",locale,true);
        JSONObject edit=js("(()=>{const card=[...document.querySelectorAll('#df03RejectHost #df-task-results .df-task')]" +
            ".find(c=>c.querySelector('.df-title')?.textContent==="+JSONObject.quote(SAVED)+");" +
            "const b=card&&[...card.querySelectorAll('button')].find(x=>x.textContent.trim()==="+
              JSONObject.quote("ar".equals(locale)?"تعديل":"Edit")+");" +
            "if(b)b.id='df03RejectEdit';return {found:!!b};})()");
        assertOk(edit.optBoolean("found"),"ACK rejection fixture Edit missing");
        tap("df03RejectEdit");
        js("(()=>{const f=document.querySelector('#df03RejectHost form.df-form');" +
            "const title=f.querySelector('input[type=text]');title.value='DF03 rejected write';" +
            "f.querySelector('button[type=submit]').id='df03RejectSave';return {ready:true};})()");
        tap("df03RejectSave");
        JSONObject refused=js("(()=>({draft:document.querySelector('#df03RejectHost form.df-form input[type=text]')?.value||''," +
            "stored:DF22Integration.getSnapshot().tasksList.find(t=>t.id==="+FIXTURE_ID+")?.title||''}))()");
        assertOk("DF03 rejected write".equals(refused.optString("draft")) &&
            SAVED.equals(refused.optString("stored")),"Rejected ACK overwrote task or lost editor draft "+refused);
        assertOk(receipt().optBoolean("ok"),"Native packet changed on injected rejected ACK");
        assertOk(realTaps==4,"Expected four genuine Android physical tap events, got "+realTaps);
    }
    private void mount(String id,String locale,boolean reject)throws Exception{
        String script="(()=>{const host=document.createElement('div');host.id="+JSONObject.quote(id)+";" +
            "Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#fff'," +
            "overflowY:'auto',padding:'8px'});document.body.appendChild(host);" +
            "window.DeepFocusTasksStudioV21.mount(host,{locale:"+JSONObject.quote(locale)+
            ",now:()=>new Date(2026,9,26),readState:()=>JSON.parse(JSON.stringify(DF22Integration.getSnapshot()))," +
            "commit:(before,after)=>"+(reject?"false":"DF22Integration.write(before,after)")+"});" +
            "return {mounted:!!host.querySelector('.df-tasks'),count:host.querySelectorAll('.df-task').length};})()";
        JSONObject mounted=js(script);
        assertOk(mounted.optBoolean("mounted")&&mounted.optInt("count")>0,"Real WebView Tasks UI not mounted "+mounted);
    }
    private void tap(String id)throws Exception{
        String source="(()=>{const el=document.getElementById("+JSONObject.quote(id)+");" +
            "if(!el)return {present:false};el.scrollIntoView({block:'center',inline:'nearest'});" +
            "const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;" +
            "const hit=document.elementFromPoint(x,y),v=window.visualViewport;" +
            "return {present:true,x,y,width:r.width,height:r.height,visX:v?v.offsetLeft:0," +
            "visY:v?v.offsetTop:0,visWidth:v?v.width:innerWidth,visHeight:v?v.height:innerHeight," +
            "hit:!!hit&&(hit===el||el.contains(hit))};})()";
        js(source);SystemClock.sleep(170);
        JSONObject point=js(source);
        assertOk(point.optBoolean("present")&&point.optBoolean("hit")&&point.optDouble("width")>=20 &&
            point.optDouble("height")>=28,"Touch target absent/occluded "+id+": "+point);
        int[] pos=new int[2];AtomicReference<int[]> bounds=new AtomicReference<>();
        runOnMainSync(()->{
            view.getLocationOnScreen(pos);
            bounds.set(new int[]{pos[0],pos[1],view.getWidth(),view.getHeight()});
        });
        int[] b=bounds.get();
        double x=(point.getDouble("x")-point.getDouble("visX"))*b[2]/point.getDouble("visWidth");
        double y=(point.getDouble("y")-point.getDouble("visY"))*b[3]/point.getDouble("visHeight");
        int sx=(int)Math.round(b[0]+x),sy=(int)Math.round(b[1]+y);
        assertOk(sx>=b[0]&&sx<b[0]+b[2]&&sy>=b[1]&&sy<b[1]+b[3],
            "Touch coordinate outside WebView "+id+" "+point);
        long time=SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(time,time,MotionEvent.ACTION_DOWN,sx,sy,0);
        MotionEvent up=MotionEvent.obtain(time,time+100,MotionEvent.ACTION_UP,sx,sy,0);
        down.setSource(InputDevice.SOURCE_TOUCHSCREEN);up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        try{
            assertOk(getUiAutomation().injectInputEvent(down,true),"Android physical DOWN rejected "+id);
            SystemClock.sleep(100);
            assertOk(getUiAutomation().injectInputEvent(up,true),"Android physical UP rejected "+id);
        }finally{down.recycle();up.recycle();}
        realTaps++;SystemClock.sleep(350);
        Log.i(TAG,"REAL_TOUCH id="+id+" x="+sx+" y="+sy);
    }
}
