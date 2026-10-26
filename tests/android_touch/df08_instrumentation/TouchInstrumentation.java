package com.zenstudy.focus.df08;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebView;

import org.json.JSONObject;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Isolated Android instrumentation on a disposable emulator, no WebView DevTools.
 * Tests the shipped production WebView with OS-injected touch, real IME and DOM
 * postconditions observed through WebView.evaluateJavascript on its UI thread.
 * The Gradle test-source wiring is appended to a temporary CI checkout ONLY.
 */
public final class TouchInstrumentation extends Instrumentation {
    private static final String TAG = "DF08_REAL_ANDROID";
    private Activity activity;
    private WebView view;
    private int actualTaps = 0;
    private String lastTapDiagnostics = "none";

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        start();
    }

    @Override public void onStart() {
        super.onStart();
        Bundle result = new Bundle();
        try {
            Intent launch = new Intent();
            launch.setClassName("com.zenstudy.focus", "com.zenstudy.focus.MainActivity");
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            activity = startActivitySync(launch);
            assertTrue(activity != null, "Unable to launch real MainActivity");
            waitForIdleSync();
            runOnMainSync(() -> {
                View root = activity.findViewById(android.R.id.content);
                if (root instanceof android.view.ViewGroup) {
                    View candidate = ((android.view.ViewGroup) root).getChildAt(0);
                    if (candidate instanceof WebView) view = (WebView) candidate;
                }
            });
            assertTrue(view != null, "No actual WebView in the installed application");
            boolean ready = false;
            for (int i = 0; i < 35; i++) {
                JSONObject state = js("({ready:document.readyState,url:location.href,tabs:document.querySelectorAll('.bnav-btn').length,notes:!!document.getElementById('noteModal')})");
                if ("complete".equals(state.optString("ready")) &&
                    "file:///android_asset/web/index.html".equals(state.optString("url")) &&
                    state.optInt("tabs") == 7 && state.optBoolean("notes")) {
                    ready = true;
                    break;
                }
                SystemClock.sleep(400);
            }
            assertTrue(ready, "WebView app bootstrap NOT verified");
            JSONObject viewport=js("({cssWidth:visualViewport.width,dpr:devicePixelRatio})");
            AtomicReference<Integer> nativeWidth=new AtomicReference<>(0);
            runOnMainSync(() -> nativeWidth.set(view.getWidth()));
            assertTrue(Math.abs(viewport.optDouble("cssWidth")-nativeWidth.get())<=2.5,
                "Requested CSS width not actually tested: native="+nativeWidth.get()+" "+viewport);
            String[][] tabs = {
                {"navTasks","sec-tasks"}, {"navCalendar","sec-calendar"},
                {"navNotes","sec-notes"}, {"navTimer","sec-timer"},
                {"navTraining","sec-timer"}, {"navSounds","sec-sounds"},
                {"navAnalytics","sec-analytics"}
            };
            for (String locale : new String[]{"en","ar"}) {
                final String selected = locale;
                JSONObject language = js("(()=>{applyLanguage("+JSONObject.quote(selected)+");return {lang:cfg.lang,dir:document.documentElement.dir};})()");
                assertTrue(selected.equals(language.optString("lang")), "Language failed: "+language);
                for (String[] item : tabs) {
                    tap(item[0]);
                    JSONObject state = js("({active:[...document.querySelectorAll('.bnav-btn.active')].map(n=>n.id)," +
                        "screen:[...document.querySelectorAll('.screen-section.active')].map(n=>n.id)," +
                        "lang:cfg.lang})");
                    assertTrue(state.getJSONArray("active").length() == 1 &&
                        item[0].equals(state.getJSONArray("active").getString(0)) &&
                        state.getJSONArray("screen").length() == 1 &&
                        item[1].equals(state.getJSONArray("screen").getString(0)) &&
                        selected.equals(state.optString("lang")),
                        "Actual Android tap did not navigate "+selected+" "+item[0]+": "+state+" lastTap="+lastTapDiagnostics);
                    Log.i(TAG, "NAV_PASS locale="+selected+" tab="+item[0]);
                }
            }
            js("(()=>{applyLanguage('en');return {lang:cfg.lang};})()");
            tap("navNotes");
            tap("nsNewButton");
            JSONObject opened = js("({open:document.getElementById('noteModal').classList.contains('open')})");
            assertTrue(opened.optBoolean("open"), "Physical tap did not open Notes modal");
            tap("inpNoteBody");
            boolean imeShown = false;
            for (int i = 0; i < 18; i++) {
                AtomicReference<Boolean> ime = new AtomicReference<>(false);
                runOnMainSync(() -> {
                    WindowInsets insets = view.getRootWindowInsets();
                    ime.set(insets != null && insets.isVisible(WindowInsets.Type.ime()));
                });
                if (Boolean.TRUE.equals(ime.get())) { imeShown = true; break; }
                SystemClock.sleep(250);
            }
            assertTrue(imeShown, "Actual Android soft keyboard NOT visible after body tap");
            String noteTitle = "DF08 Instrumented "+System.currentTimeMillis();
            JSONObject draft = js("(()=>{" +
                "const t=document.getElementById('inpNoteTitle'),b=document.getElementById('inpNoteBody');" +
                "t.value="+JSONObject.quote(noteTitle)+";b.value='Persisted note 2026';" +
                "for(const n of [t,b])n.dispatchEvent(new Event('input',{bubbles:true}));" +
                "return {title:t.value,body:b.value,open:document.getElementById('noteModal').classList.contains('open')};})()");
            assertTrue(draft.optBoolean("open") && noteTitle.equals(draft.optString("title")),
                "Test fixture did not populate open editor");
            key(KeyEvent.KEYCODE_BACK);
            boolean imeHidden = false;
            for (int i = 0; i < 18; i++) {
                AtomicReference<Boolean> ime = new AtomicReference<>(true);
                runOnMainSync(() -> {
                    WindowInsets insets = view.getRootWindowInsets();
                    ime.set(insets != null && insets.isVisible(WindowInsets.Type.ime()));
                });
                if (!Boolean.TRUE.equals(ime.get())) { imeHidden = true; break; }
                SystemClock.sleep(250);
            }
            assertTrue(imeHidden, "Android Back did not dismiss visible keyboard");
            JSONObject stillOpen = js("({open:document.getElementById('noteModal').classList.contains('open'),body:document.getElementById('inpNoteBody').value})");
            assertTrue(stillOpen.optBoolean("open") && "Persisted note 2026".equals(stillOpen.optString("body")),
                "Android Back closed Notes or lost unsaved draft while dismissing IME: "+stillOpen);
            tap("nsSaveButton");
            JSONObject saved = js("(()=>{const a=notesList.filter(n=>n.title==="+JSONObject.quote(noteTitle)+");" +
                "return {matches:a.length,body:a[0]?.body||'',open:document.getElementById('noteModal').classList.contains('open')};})()");
            assertTrue(saved.optInt("matches") == 1 &&
                "Persisted note 2026".equals(saved.optString("body")) && !saved.optBoolean("open"),
                "Physical Save did not persist note exactly once: "+saved);
            result.putString("df08_status","PASS");
            result.putInt("df08_physical_taps",actualTaps);
            result.putString("df08_platform","Android UIAutomation touch / actual IME / native WebView evaluateJavascript");
            Log.i(TAG,"DF08_ANDROID_PASS touches="+actualTaps+" nav=14 ime=true noteSaved=true");
            finish(Activity.RESULT_OK,result);
        } catch (Throwable failure) {
            result.putString("df08_status","FAIL");
            result.putString("df08_error",String.valueOf(failure));
            // Capture before finishing instrumentation, while the target Activity
            // is still foregrounded; post-finish screenshots show Launcher instead.
            try {
                android.os.ParcelFileDescriptor shot=getUiAutomation()
                    .executeShellCommand("screencap -p /sdcard/df08_live_failure.png");
                if(shot!=null)shot.close();
                SystemClock.sleep(700);
            } catch(Throwable ignored) {}
            Log.e(TAG,"DF08_ANDROID_FAIL after taps="+actualTaps,failure);
            finish(Activity.RESULT_CANCELED,result);
        }
    }

    private static void assertTrue(boolean condition, String reason) {
        if (!condition) throw new AssertionError(reason);
    }

    private JSONObject js(String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> reply = new AtomicReference<>();
        runOnMainSync(() -> view.evaluateJavascript(expression, value -> {
            reply.set(value);
            latch.countDown();
        }));
        assertTrue(latch.await(12,TimeUnit.SECONDS),"WebView.evaluateJavascript timed out: "+expression.substring(0,Math.min(60,expression.length())));
        String raw=reply.get();
        assertTrue(raw!=null && !"null".equals(raw),"WebView evaluation returned null: "+expression.substring(0,Math.min(60,expression.length())));
        return new JSONObject(raw);
    }

    private void tap(String id) throws Exception {
        String expression="(()=>{const n=document.getElementById("+JSONObject.quote(id)+");" +
            "if(!n)return {exists:false};n.scrollIntoView({block:'center',inline:'nearest'});" +
            "const r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;" +
            "const hit=document.elementFromPoint(x,y);" +
            "const vv=window.visualViewport;" +
            "const alt=document.elementFromPoint(x-(vv?.offsetLeft||0),y-(vv?.offsetTop||0));" +
            "return {exists:true,x,y,width:r.width,height:r.height,vw:innerWidth,vh:innerHeight," +
            "visX:vv?vv.offsetLeft:0,visY:vv?vv.offsetTop:0," +
            "visWidth:vv?vv.width:innerWidth,visHeight:vv?vv.height:innerHeight," +
            "scale:vv?vv.scale:1,dpr:devicePixelRatio," +
            "bodyClass:document.body.className," +
            "stylePosition:getComputedStyle(n).position," +
            "styleBottom:getComputedStyle(n).bottom," +
            "noteModalRect:document.getElementById('noteModal')?.getBoundingClientRect().toJSON()," +
            "editorRect:document.querySelector('#noteModal .ns-editor')?.getBoundingClientRect().toJSON()," +
            "noteModalScroll:document.getElementById('noteModal')?.scrollTop," +
            "editorScroll:document.querySelector('#noteModal .ns-editor')?.scrollTop," +
            "editorMaxHeight:getComputedStyle(document.querySelector('#noteModal .ns-editor')).maxHeight," +
            "hitNode:hit?.id||hit?.className||hit?.tagName||'none'," +
            "altHitNode:alt?.id||alt?.className||alt?.tagName||'none'," +
            "altHit:!!alt&&(alt===n||n.contains(alt))," +
            "hit:!!hit&&(hit===n||n.contains(hit))};})()";
        js("(()=>{if(window.__df08Events)return {installed:true};window.__df08Events=[];" +
            "for(const kind of ['touchstart','touchend','click','pointerdown','pointerup']){" +
            "document.addEventListener(kind,e=>{const p=e.changedTouches?.[0]||e;" +
            "window.__df08Events.push({kind,clientX:p.clientX,clientY:p.clientY," +
            "target:e.target?.id||e.target?.closest('.bnav-btn')?.id||e.target?.tagName," +
            "trusted:e.isTrusted});if(window.__df08Events.length>16)window.__df08Events.shift();},true)}" +
            "return {installed:true};})()");
        js(expression);
        SystemClock.sleep(140);
        JSONObject p=js(expression);
        assertTrue(p.optBoolean("exists") && p.optDouble("width")>0 && p.optDouble("height")>=40 &&
            p.optDouble("x")>=0 && p.optDouble("y")>=0 &&
            p.optDouble("x")>=p.optDouble("visX") &&
            p.optDouble("x")<p.optDouble("visX")+p.optDouble("visWidth") &&
            p.optDouble("y")>=p.optDouble("visY") &&
            p.optDouble("y")<p.optDouble("visY")+p.optDouble("visHeight") &&
            p.optDouble("visWidth")>0 && p.optDouble("visHeight")>0 &&
            p.optBoolean("hit"),"Physical touch target invalid/occluded "+id+": "+p);
        int[] screen=new int[2];
        AtomicReference<int[]> frame=new AtomicReference<>();
        runOnMainSync(() -> {
            view.getLocationOnScreen(screen);
            frame.set(new int[]{screen[0],screen[1],view.getWidth(),view.getHeight()});
        });
        int[] box=frame.get();
        // Visual viewport may pan independently of window.innerWidth/innerHeight.
        // API30 evidence: layout viewport 174 CSS px, actual visible width 122,
        // visualViewport.offsetTop nonzero after scrollIntoView. Use the visible
        // viewport in both axes; do NOT scale using the layout viewport.
        int x=(int)Math.round(box[0]+(p.getDouble("x")-p.getDouble("visX"))*box[2]/p.getDouble("visWidth"));
        int y=(int)Math.round(box[1]+(p.getDouble("y")-p.getDouble("visY"))*box[3]/p.getDouble("visHeight"));
        assertTrue(x>=box[0]&&x<box[0]+box[2]&&y>=box[1]&&y<box[1]+box[3],
            "WebView mapped touch outside physical bounds "+id);
        long down=SystemClock.uptimeMillis();
        MotionEvent press=MotionEvent.obtain(down,down,MotionEvent.ACTION_DOWN,x,y,0);
        MotionEvent release=MotionEvent.obtain(down,down+90,MotionEvent.ACTION_UP,x,y,0);
        press.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        release.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        try {
            assertTrue(getUiAutomation().injectInputEvent(press,true),"Android rejected touchStart "+id);
            SystemClock.sleep(90);
            assertTrue(getUiAutomation().injectInputEvent(release,true),"Android rejected touchEnd "+id);
        } finally {press.recycle();release.recycle();}
        actualTaps++;
        SystemClock.sleep(400);
        JSONObject after=js("({events:window.__df08Events?.slice(-8)||[]," +
            "nav:[...document.querySelectorAll('.bnav-btn.active')].map(n=>n.id)," +
            "sections:[...document.querySelectorAll('.screen-section.active')].map(n=>n.id)," +
            "innerWidth,innerHeight,scrollX,scrollY})");
        AtomicReference<String> insetsDiag=new AtomicReference<>("missing");
        runOnMainSync(() -> {
            WindowInsets inset=view.getRootWindowInsets();
            android.graphics.Insets bars=inset==null?android.graphics.Insets.NONE:
                inset.getInsets(WindowInsets.Type.systemBars());
            insetsDiag.set("systemBarInsets="+bars+" decorHeight="+
                activity.getWindow().getDecorView().getHeight()+
                " rootHeight="+view.getRootView().getHeight());
        });
        String activeWindow="unknown";
        try {
            android.view.accessibility.AccessibilityNodeInfo root=
                getUiAutomation().getRootInActiveWindow();
            if(root!=null) {
                android.graphics.Rect bounds=new android.graphics.Rect();
                root.getBoundsInScreen(bounds);
                activeWindow="pkg="+root.getPackageName()+" class="+root.getClassName()+" bounds="+bounds;
                root.recycle();
            }
        } catch(Throwable ignored) { activeWindow="unavailable"; }
        lastTapDiagnostics="id="+id+" css="+p+" screen="+x+","+y+
            " webview="+java.util.Arrays.toString(box)+
            " native="+insetsDiag.get()+" activeWindow="+activeWindow+" observed="+after;
        Log.i(TAG,"TAP_DIAGNOSTICS "+lastTapDiagnostics);
    }

    private void key(int code) {
        long when=SystemClock.uptimeMillis();
        KeyEvent down=new KeyEvent(when,when,KeyEvent.ACTION_DOWN,code,0);
        KeyEvent up=new KeyEvent(when,when+80,KeyEvent.ACTION_UP,code,0);
        assertTrue(getUiAutomation().injectInputEvent(down,true),"Android rejected Back down");
        assertTrue(getUiAutomation().injectInputEvent(up,true),"Android rejected Back up");
    }
}
