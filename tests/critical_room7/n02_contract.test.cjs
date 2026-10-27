'use strict';
// Executes the production receiver on a JVM with explicit Android boundary doubles.
// This proves receiver control flow, not AlarmManager/Doze or real-device delivery.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const sources = {
'android/Manifest.java': `package android; public final class Manifest { public static class permission { public static final String POST_NOTIFICATIONS="notify"; } }`,
'android/content/SharedPreferences.java': `package android.content; public interface SharedPreferences { boolean getBoolean(String k,boolean d); long getLong(String k,long d); String getString(String k,String d); Editor edit(); interface Editor { Editor putBoolean(String k,boolean v); Editor putLong(String k,long v); Editor putString(String k,String v); boolean commit(); } }`,
'android/content/Context.java': `package android.content; public abstract class Context { public static final int MODE_PRIVATE=0; public static final String NOTIFICATION_SERVICE="notifications", ALARM_SERVICE="alarms"; public abstract SharedPreferences getSharedPreferences(String name,int mode); public abstract Object getSystemService(String name); }`,
'android/content/BroadcastReceiver.java': `package android.content; public abstract class BroadcastReceiver { public abstract void onReceive(Context c,Intent i); }`,
'android/content/Intent.java': `package android.content; public class Intent { public static final String ACTION_BOOT_COMPLETED="boot"; public static final int FLAG_ACTIVITY_CLEAR_TOP=1, FLAG_ACTIVITY_SINGLE_TOP=2; String action; long token; public Intent(){} public Intent(Context c,Class<?> x){} public void setAction(String a){action=a;} public String getAction(){return action;} public void putExtra(String k,long v){token=v;} public long getLongExtra(String k,long d){return token;} public void addFlags(int f){} }`,
'android/content/pm/PackageManager.java': `package android.content.pm; public class PackageManager { public static final int PERMISSION_GRANTED=0; }`,
'android/net/Uri.java': `package android.net; public class Uri {}`,
'android/os/Build.java': `package android.os; public class Build { public static class VERSION { public static int SDK_INT=35; } }`,
'android/media/AudioAttributes.java': `package android.media; public class AudioAttributes { public static final int USAGE_NOTIFICATION=1; public static class Builder { public Builder setUsage(int i){return this;} public AudioAttributes build(){return new AudioAttributes();} } }`,
'android/media/RingtoneManager.java': `package android.media; public class RingtoneManager { public static final int TYPE_NOTIFICATION=1; public static android.net.Uri getDefaultUri(int t){return null;} }`,
'android/app/PendingIntent.java': `package android.app; public class PendingIntent { public static final int FLAG_UPDATE_CURRENT=1, FLAG_IMMUTABLE=2; public long token; public static PendingIntent getBroadcast(android.content.Context c,int r,android.content.Intent i,int f){PendingIntent p=new PendingIntent();p.token=i.getLongExtra("token",0);return p;} public static PendingIntent getActivity(android.content.Context c,int r,android.content.Intent i,int f){return new PendingIntent();} }`,
'android/app/AlarmManager.java': `package android.app; public class AlarmManager { public static final int RTC_WAKEUP=0; public long deadline,token; public int scheduled,cancelled; public void setAndAllowWhileIdle(int t,long d,PendingIntent p){deadline=d;token=p.token;scheduled++;} public void cancel(PendingIntent p){cancelled++;} }`,
'android/app/NotificationChannel.java': `package android.app; public class NotificationChannel { public NotificationChannel(String i,String n,int level){} public void setDescription(String x){} public void setSound(android.net.Uri u,android.media.AudioAttributes a){} public void enableVibration(boolean v){} }`,
'android/app/NotificationManager.java': `package android.app; public class NotificationManager { public static final int IMPORTANCE_LOW=1,IMPORTANCE_HIGH=2; public int completed,activeCancelled; public void createNotificationChannel(NotificationChannel c){} public void notify(int i,Object n){if(i==2002)completed++;} public void cancel(int i){if(i==1001)activeCancelled++;} }`,
'androidx/core/content/ContextCompat.java': `package androidx.core.content; public class ContextCompat { public static int checkSelfPermission(android.content.Context c,String p){return 0;} }`,
'androidx/core/app/NotificationCompat.java': `package androidx.core.app; public class NotificationCompat { public static final int PRIORITY_LOW=0,PRIORITY_HIGH=1; public static final String CATEGORY_ALARM="alarm"; public static class Builder { public Builder(android.content.Context c,String s){} public Builder setSmallIcon(int x){return this;} public Builder setContentTitle(String s){return this;} public Builder setContentText(String s){return this;} public Builder setWhen(long x){return this;} public Builder setShowWhen(boolean b){return this;} public Builder setUsesChronometer(boolean b){return this;} public Builder setChronometerCountDown(boolean b){return this;} public Builder setOnlyAlertOnce(boolean b){return this;} public Builder setOngoing(boolean b){return this;} public Builder setContentIntent(android.app.PendingIntent p){return this;} public Builder setPriority(int x){return this;} public Builder setAutoCancel(boolean b){return this;} public Builder setCategory(String s){return this;} public Object build(){return this;} } }`,
'com/zenstudy/focus/MainActivity.java': `package com.zenstudy.focus; public class MainActivity {}`,
'com/zenstudy/focus/R.java': `package com.zenstudy.focus; public class R { public static class string { public static final int native_focus_session=1,native_channel_active_name=2,native_channel_active_description=3,native_channel_done_name=4,native_channel_done_description=5,native_notification_title=6,native_notification_active=7,native_notification_time_up=8; } public static class drawable { public static final int ic_launcher=1; } }`,
'com/zenstudy/focus/NativeLocaleStrings.java': `package com.zenstudy.focus; public class NativeLocaleStrings { public static String get(android.content.Context c,int i){return "Focus";} public static String format(android.content.Context c,int i,String s){return s;} }`,
'com/zenstudy/focus/ReceiverTest.java': `package com.zenstudy.focus;
import java.util.*; import java.util.concurrent.*; import java.util.concurrent.atomic.*;
import android.content.*; import android.app.*;
public class ReceiverTest {
 static void check(boolean b,String m){if(!b)throw new AssertionError(m);}
 static class Prefs implements SharedPreferences {
  final Map<String,Object> data=new ConcurrentHashMap<>(); boolean failNext; volatile CountDownLatch readToken,allowRead;
  public boolean getBoolean(String k,boolean d){return (Boolean)data.getOrDefault(k,d);}
  public long getLong(String k,long d){ if(k.equals("token")&&readToken!=null&&Thread.currentThread().getName().equals("receiver")){readToken.countDown();try{check(allowRead.await(5,TimeUnit.SECONDS),"release receiver");}catch(InterruptedException e){throw new RuntimeException(e);}} return (Long)data.getOrDefault(k,d); }
  public String getString(String k,String d){return (String)data.getOrDefault(k,d);}
  public Editor edit(){return new Editor(){ final Map<String,Object> next=new HashMap<>();public Editor putBoolean(String k,boolean v){next.put(k,v);return this;}public Editor putLong(String k,long v){next.put(k,v);return this;}public Editor putString(String k,String v){next.put(k,v==null?"":v);return this;}public boolean commit(){data.putAll(next);boolean ok=!failNext;failNext=false;return ok;}};}
 }
 static class App extends Context { final Prefs p=new Prefs(); final AlarmManager a=new AlarmManager(); final NotificationManager n=new NotificationManager(); public SharedPreferences getSharedPreferences(String name,int mode){return p;} public Object getSystemService(String name){return name.equals(ALARM_SERVICE)?a:n;} }
 static Intent fire(long token){Intent i=new Intent();i.setAction("com.deepfocus.study.TIMER_COMPLETE");i.putExtra("token",token);return i;}
 public static void main(String[] args)throws Exception {
  App c=new App();FocusAlarmReceiver r=new FocusAlarmReceiver();
  FocusAlarmReceiver.schedule(c,60,"Work");long first=c.p.getLong("token",0);check(c.a.scheduled==1,"start schedules once");
  FocusAlarmReceiver.schedule(c,0,"invalid");check(c.a.scheduled==1,"invalid duration preserves alarm");
  FocusAlarmReceiver.cancel(c);r.onReceive(c,fire(first));check(c.n.completed==0,"pause/reset/cancel suppress queued delivery");
  FocusAlarmReceiver.schedule(c,30,"Resume");long second=c.p.getLong("token",0);check(second!=first,"resume changes generation");
  c.p.data.put("deadline",System.currentTimeMillis()-1000L);r.onReceive(c,fire(first));check(c.n.completed==0,"stale generation cannot complete resumed timer");
  r.onReceive(c,fire(second));r.onReceive(c,fire(second));check(c.n.completed==1,"same completion delivered once");
  FocusAlarmReceiver.schedule(c,60,"Boot");int schedules=c.a.scheduled;Intent boot=new Intent();boot.setAction(Intent.ACTION_BOOT_COMPLETED);r.onReceive(c,boot);check(c.a.scheduled==schedules+1,"future boot restores deadline");check(c.n.completed==1,"future boot does not alert");
  c.p.data.put("deadline",System.currentTimeMillis()-1000L);r.onReceive(c,boot);r.onReceive(c,boot);check(c.n.completed==2,"expired boot completes once");
  FocusAlarmReceiver.schedule(c,60,"Original");long priorToken=c.p.getLong("token",0),priorDeadline=c.p.getLong("deadline",0);int priorCancel=c.a.cancelled;
  c.p.failNext=true;FocusAlarmReceiver.schedule(c,20,"Refused");check(c.a.cancelled==priorCancel,"failed reschedule must preserve existing system alarm");check(c.p.getLong("token",0)==priorToken&&c.p.getLong("deadline",0)==priorDeadline,"failed commit restores previous in-memory generation and deadline");
  c.p.data.put("deadline",System.currentTimeMillis()-1000L);c.p.readToken=new CountDownLatch(1);c.p.allowRead=new CountDownLatch(1);
  AtomicReference<Throwable> failure=new AtomicReference<>();Thread receiver=new Thread(()->{try{r.onReceive(c,fire(priorToken));}catch(Throwable t){failure.set(t);}},"receiver");receiver.start();check(c.p.readToken.await(3,TimeUnit.SECONDS),"receiver reached token read");
  CountDownLatch cancelStarted=new CountDownLatch(1),cancelDone=new CountDownLatch(1);Thread cancel=new Thread(()->{cancelStarted.countDown();FocusAlarmReceiver.cancel(c);cancelDone.countDown();});cancel.start();check(cancelStarted.await(3,TimeUnit.SECONDS),"cancel started");
  boolean returnedBeforeDelivery;try{returnedBeforeDelivery=cancelDone.await(200,TimeUnit.MILLISECONDS);}finally{c.p.allowRead.countDown();}receiver.join(3000);cancel.join(3000);check(!returnedBeforeDelivery,"cancel must serialize with in-flight receiver delivery");check(failure.get()==null,"receiver failure: "+failure.get());check(!c.p.getBoolean("active",true),"cancel wins after receiver exits");
  System.out.println("N02 JVM lifecycle and fault-injection assertions PASS; Android delivery NOT_TESTED");
 }
}`
};
test('N02 production Java receiver: lifecycle, duplicate/stale delivery, failed reschedule, concurrency', () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-n02-java-'));
 try {
  for(const [name,source] of Object.entries(sources)){const dest=path.join(dir,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,source);}
  const production=path.join(dir,'com/zenstudy/focus/FocusAlarmReceiver.java');fs.copyFileSync(path.join(ROOT,'android/app/src/main/java/com/zenstudy/focus/FocusAlarmReceiver.java'),production);
  const files=Object.keys(sources).map(p=>path.join(dir,p)).concat(production);
  cp.execFileSync('java',['com.sun.tools.javac.Main','-d',dir,...files],{encoding:'utf8',timeout:30000});
  const output=cp.execFileSync('java',['-cp',dir,'com.zenstudy.focus.ReceiverTest'],{encoding:'utf8',timeout:15000});
  assert.match(output,/assertions PASS/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

// These parsers consume actual Android receipts; warnings and absent fields
// cannot silently become positive lifecycle evidence.
test('N02 Android receipt parsers separate actual native state and package notification IDs', () => {
 const {parseAlarmPrefs, notificationKeys}=require('./n02_android_probe.cjs');
 assert.deepEqual(parseAlarmPrefs('<map><boolean name="active" value="false" /><long name="token" value="7" /><long name="deadline" value="1790000000000" /><long name="lastNotified" value="1790000000030" /></map>'),{active:false,token:7,deadline:1790000000000,lastNotified:1790000000030});
 assert.throws(()=>parseAlarmPrefs('<map><boolean name="active" value="true" /></map>'),/Missing native preference/);
 assert.throws(()=>parseAlarmPrefs('run-as: package unavailable'),/XML unavailable/);
 assert.throws(()=>parseAlarmPrefs('<map><boolean name="active" value="true" /><long name="token" value="NaN" /><long name="deadline" value="0" /><long name="lastNotified" value="0" /></map>'),/Invalid native preference/);
 const receipt='0|android|2002|null|1000\n0|com.zenstudy.focus|1001|null|10177\n0|com.zenstudy.focus|2002|null|10177\n';
 assert.deepEqual(notificationKeys(receipt,2002),['0|com.zenstudy.focus|2002|null|10177']);
 assert.deepEqual(notificationKeys(receipt,1001),['0|com.zenstudy.focus|1001|null|10177']);
});
