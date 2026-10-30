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
    private Bundle testArguments;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        testArguments = arguments;
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
            // Reopen in a new Android instrumentation process after real am force-stop.
            // The scenario's title depends on a controlled viewport, not wall-clock time.
            final String width = testArguments == null ? "unknown" : testArguments.getString("width", "unknown");
            final String locale = testArguments == null ? "en" : testArguments.getString("locale", "en");
            final String fontScale = testArguments == null ? "1.0" : testArguments.getString("fontScale", "1.0");
            assertTrue("en".equals(locale) || "ar".equals(locale), "Unsupported test locale " + locale);
            final float actualFontScale = activity.getResources().getConfiguration().fontScale;
            assertTrue(Math.abs(actualFontScale - Float.parseFloat(fontScale)) < 0.01f,
                "Requested Android font scale not actually tested: " + actualFontScale);
            result.putString("df08_actual_font_scale", String.valueOf(actualFontScale));
            final String noteTitle = "DF08 Instrumented " + width + " " + locale + " " + fontScale;
            final String stage = testArguments == null ? "save" : testArguments.getString("stage", "save");
            if ("verify".equals(stage)) {
                final String expectedId = testArguments.getString("expectedId", "");
                assertTrue(expectedId.matches("[0-9]+"), "No independently captured saved ID supplied for reopen");
                JSONObject restored = null;
                boolean found = false;
                for (int attempt = 0; attempt < 24; attempt++) {
                    restored = js("(()=>{const D=window.DeepFocusDataCompatV21,k=D?.KEYS?.notes;" +
                        "const p=k?localStorage.getItem(k):null,m=k?localStorage.getItem(k+'_mirror'):null;" +
                        "const packet=p&&D?D.inspectPacket(p):{ok:false};" +
                        "const live=(typeof notesList==='undefined'?[]:notesList).filter(n=>n.title==="+JSONObject.quote(noteTitle)+");" +
                        "const stored=(packet.ok&&Array.isArray(packet.value)?packet.value:[]).filter(n=>n.title==="+JSONObject.quote(noteTitle)+");" +
                        "return {matches:live.length,liveBody:live[0]?.body||'',liveId:String(live[0]?.id),storedId:String(stored[0]?.id),lang:cfg.lang,dir:document.documentElement.dir,storedMatches:stored.length," +
                        "storedBody:stored[0]?.body||'',mirrorOk:!!p&&p===m&&packet.ok," +
                        "primaryPresent:!!p,mirrorPresent:!!m,advancedUi:document.body.classList.contains('df-v22')," +
                        "storageFamilies:Object.keys(localStorage).filter(k=>k.startsWith('zen_fortress_')).length};})()");
                    found = restored.optInt("matches") == 1 &&
                        restored.optInt("storedMatches") == 1 &&
                        restored.optBoolean("mirrorOk") &&
                        expectedId.equals(restored.optString("liveId")) &&
                        expectedId.equals(restored.optString("storedId")) &&
                        locale.equals(restored.optString("lang")) &&
                        ("ar".equals(locale) ? "rtl" : "ltr").equals(restored.optString("dir")) &&
                        "Persisted note 2026".equals(restored.optString("liveBody")) &&
                        "Persisted note 2026".equals(restored.optString("storedBody"));
                    if (found) break;
                    SystemClock.sleep(250);
                }
                assertTrue(found, "Force-stop/relaunch Notes mirror and rendered state FAILED: " + restored);
                result.putString("df08_status", "PASS");
                result.putString("df08_reopen", "PASS");
                result.putString("df08_stage", "verify");
                Log.i(TAG, "DF08_NOTES_REOPEN_PASS width=" + width);
                finish(Activity.RESULT_OK, result);
                return;
            }
            assertTrue("save".equals(stage), "Unknown isolated test stage " + stage);

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
            for (String navLocale : new String[]{"en","ar"}) {
                final String selected = navLocale;
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
            js("(()=>{applyLanguage(" + JSONObject.quote(locale) + ");return {lang:cfg.lang};})()");
            tap("navTimer");
            js("(()=>{document.getElementById('orbWaterTxt').parentElement.id='df08WaterTapTarget';" +
                "window.__DF08WaterFault={cfg:JSON.stringify(cfg),primary:localStorage.getItem('zen_fortress_cfg_v21')," +
                "mirror:localStorage.getItem('zen_fortress_cfg_v21_mirror'),original:Storage.prototype.setItem,hit:false};" +
                "Storage.prototype.setItem=function(k,v){const f=window.__DF08WaterFault;" +
                "if(k==='zen_fortress_cfg_v21_mirror'&&!f.hit){f.hit=true;throw new DOMException('Disposable water fault','QuotaExceededError');}" +
                "return f.original.call(this,k,v);};return {armed:true};})()");
            try {
                tap("df08WaterTapTarget");
                JSONObject water = js("(()=>{const f=window.__DF08WaterFault;return {hit:f.hit," +
                    "cfgUnchanged:JSON.stringify(cfg)===f.cfg," +
                    "primaryUnchanged:localStorage.getItem('zen_fortress_cfg_v21')===f.primary," +
                    "mirrorUnchanged:localStorage.getItem('zen_fortress_cfg_v21_mirror')===f.mirror};})()");
                assertTrue(water.optBoolean("hit") && water.optBoolean("cfgUnchanged") &&
                    water.optBoolean("primaryUnchanged") && water.optBoolean("mirrorUnchanged"),
                    "Physical water tap published a rejected save: "+water);
                result.putString("df08_water_ack", "PASS");
            } finally {
                js("(()=>{Storage.prototype.setItem=window.__DF08WaterFault.original;delete window.__DF08WaterFault;return {restored:true};})()");
            }
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
            // Stable note title allows a separate process to verify this exact saved record.
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
                "return {matches:a.length,id:String(a[0]?.id),body:a[0]?.body||'',open:document.getElementById('noteModal').classList.contains('open')};})()");
            assertTrue(saved.optInt("matches") == 1 &&
                "Persisted note 2026".equals(saved.optString("body")) && !saved.optBoolean("open"),
                "Physical Save did not persist note exactly once: "+saved);
            final String savedId = saved.optString("id");
            assertTrue(savedId.matches("[0-9]+"), "Physical Save produced an invalid note ID");
            // A successful in-memory Save must also be a verified v21 disk write.
            // Otherwise the following force-stop would only expose an already false PASS.
            JSONObject beforeStop = js("(()=>{const D=window.DeepFocusDataCompatV21,k=D?.KEYS?.notes;" +
                "const p=k?localStorage.getItem(k):null,m=k?localStorage.getItem(k+'_mirror'):null;" +
                "const packet=p&&D?D.inspectPacket(p):{ok:false};" +
                "const stored=packet.ok&&Array.isArray(packet.value)?packet.value:[];" +
                "return {primaryPresent:!!p,mirrorPresent:!!m,mirrorOk:!!p&&p===m&&packet.ok," +
                "savedIds:stored.filter(n=>n.title==="+JSONObject.quote(noteTitle)+").map(n=>String(n.id))," +
                "advancedUi:document.body.classList.contains('df-v22')," +
                "integrationAvailable:!!window.DF22Integration};})()");
            assertTrue(beforeStop.optBoolean("mirrorOk") && beforeStop.getJSONArray("savedIds").length() == 1 &&
                savedId.equals(beforeStop.getJSONArray("savedIds").getString(0)),
                "Visible Notes Save lacked v21 packet ACK before process death: "+beforeStop);
            result.putString("df08_note_id",savedId);
            result.putString("df08_locale",locale);
            result.putString("df08_font_scale",fontScale);
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
            "if(!n)return {exists:false};const prepare=true;" +
            "if(prepare)n.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});" +
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
            "cssMobileMedia:matchMedia('(max-width: 430px)').matches," +
            "cssMatchedSelector:!!n.closest('.modal-actions')&&n.closest('.modal-actions').matches('body:not(.deep-lockdown) #noteModal .ns-editor > .modal-actions')," +
            "cssFooterMatched:!!n.closest('.modal-actions')&&n.closest('.modal-actions').matches('#noteModal .modal-actions')," +
            "footerAncestor:n.closest('.modal-actions')?.parentElement?.className||'missing'," +
            "editorAncestor:n.closest('.ns-editor')?.className||'missing'," +
            "cssLoadedStyles:Array.from(document.styleSheets).map(s=>({href:s.href||'inline',disabled:s.disabled}))," +
            "hitNode:hit?.id||hit?.className||hit?.tagName||'none'," +
            "altHitNode:alt?.id||alt?.className||alt?.tagName||'none'," +
            "altHit:!!alt&&(alt===n||n.contains(alt))," +
            "hit:!!hit&&(hit===n||n.contains(hit))};})()";
        js("(()=>{if(window.__df08Events)return {installed:true};window.__df08Events=[];" +
            "for(const kind of ['touchstart','touchend','touchcancel','click','contextmenu','pointerdown','pointerup','pointercancel']){" +
            "document.addEventListener(kind,e=>{const p=e.changedTouches?.[0]||e;" +
            "window.__df08Events.push({kind,clientX:p.clientX,clientY:p.clientY," +
            "target:e.target?.id||e.target?.closest('.bnav-btn')?.id||e.target?.tagName," +
            "trusted:e.isTrusted,eventTime:e.timeStamp,observedAt:performance.now(),defaultPrevented:e.defaultPrevented});" +
            "if(window.__df08Events.length>24)window.__df08Events.shift();},true)}" +
            "return {installed:true};})()");
        js(expression);
        awaitRenderedTouchGeometry();
        JSONObject p=js(expression.replace("const prepare=true;","const prepare=false;"));
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
        long physicalPressMillis=injectPhysicalTap(x,y,id);
        actualTaps++;
        SystemClock.sleep(400);
        if("nsSaveButton".equals(id)) {
            // API35 may acknowledge an OS injection even when Chromium never
            // dispatches a trusted click. Never retry a Save that dispatched.
            JSONObject delivered=js("(()=>{const a=window.__df08Events||[];" +
                "return {clicks:a.filter(e=>e.kind==='click'&&e.target==='nsSaveButton'&&e.trusted).length," +
                "open:document.getElementById('noteModal').classList.contains('open')};})()");
            if(delivered.optInt("clicks")==0 && delivered.optBoolean("open")) {
                awaitRenderedTouchGeometry();
                injectPhysicalTap(x,y,id); // Exactly one more *physical* attempt.
                actualTaps++;
                SystemClock.sleep(400);
                delivered=js("(()=>{const a=window.__df08Events||[];" +
                    "return {clicks:a.filter(e=>e.kind==='click'&&e.target==='nsSaveButton'&&e.trusted).length};})()");
            }
            assertTrue(delivered.optInt("clicks")==1,
                "Save must receive exactly one trusted Android click; got "+delivered);
        }
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
            " native="+insetsDiag.get()+" activeWindow="+activeWindow+
            " physicalPressMillis="+physicalPressMillis+" observed="+after;
        Log.i(TAG,"TAP_DIAGNOSTICS "+lastTapDiagnostics);
    }

    // JavaScript layout is not proof that Chromium's compositor has committed
    // scroll/IME changes. Fence that state and two Android frames before DOWN.
    private void awaitRenderedTouchGeometry() throws Exception {
        CountDownLatch rendered=new CountDownLatch(1);
        runOnMainSync(() -> view.postVisualStateCallback(SystemClock.uptimeMillis(),
            new WebView.VisualStateCallback() {
                @Override public void onComplete(long requestId) {
                    view.postOnAnimation(() -> view.postOnAnimation(rendered::countDown));
                }
            }));
        assertTrue(rendered.await(12,TimeUnit.SECONDS),"WebView touch geometry frame timed out");
        waitForIdleSync();
    }

    // UP must describe the real release time. Synchronous injection may spend
    // time waiting for dispatch; precomputing down+90 conceals that delay.
    private long injectPhysicalTap(int x,int y,String id) {
        long down=SystemClock.uptimeMillis();
        MotionEvent press=MotionEvent.obtain(down,down,MotionEvent.ACTION_DOWN,x,y,0);
        MotionEvent release=null;
        press.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        try {
            assertTrue(getUiAutomation().injectInputEvent(press,true),"Android rejected touchStart "+id);
            SystemClock.sleep(90);
            long up=SystemClock.uptimeMillis();
            release=MotionEvent.obtain(down,up,MotionEvent.ACTION_UP,x,y,0);
            release.setSource(InputDevice.SOURCE_TOUCHSCREEN);
            assertTrue(getUiAutomation().injectInputEvent(release,true),"Android rejected touchEnd "+id);
            return up-down;
        } finally {
            press.recycle();
            if(release!=null)release.recycle();
        }
    }

    private void key(int code) {
        long when=SystemClock.uptimeMillis();
        KeyEvent down=new KeyEvent(when,when,KeyEvent.ACTION_DOWN,code,0);
        KeyEvent up=new KeyEvent(when,when+80,KeyEvent.ACTION_UP,code,0);
        assertTrue(getUiAutomation().injectInputEvent(down,true),"Android rejected Back down");
        assertTrue(getUiAutomation().injectInputEvent(up,true),"Android rejected Back up");
    }
}
