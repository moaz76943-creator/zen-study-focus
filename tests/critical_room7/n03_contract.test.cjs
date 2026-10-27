'use strict';
// Compiles the real WebChromeClient; Android UI is represented by boundary doubles.
// Actual Window/WebView/IME lifecycle acceptance remains a separate device gate.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const sources={
'android/R.java':`package android; public class R {public static class string {public static final int ok=1,cancel=2;}}`,
'android/view/View.java':`package android.view; public class View {}`,
'android/content/DialogInterface.java':`package android.content; public interface DialogInterface { interface OnCancelListener {void onCancel(DialogInterface d);} interface OnDismissListener {void onDismiss(DialogInterface d);} interface OnClickListener {void onClick(DialogInterface d,int which);} }`,
'android/content/res/Resources.java':`package android.content.res; public class Resources {public static class DisplayMetrics {public float density=1;} public DisplayMetrics getDisplayMetrics(){return new DisplayMetrics();}}`,
'android/text/InputType.java':`package android.text; public class InputType {public static final int TYPE_CLASS_TEXT=1,TYPE_TEXT_FLAG_CAP_SENTENCES=2;}`,
'android/widget/EditText.java':`package android.widget; public class EditText extends android.view.View {String value="";public EditText(Object c){}public void setSingleLine(boolean b){}public void setInputType(int t){}public void setText(String s){value=s;}public void setSelectAllOnFocus(boolean b){}public String getText(){return value;}}`,
'android/widget/LinearLayout.java':`package android.widget; public class LinearLayout extends android.view.View {public static final int VERTICAL=1;android.view.View child;public LinearLayout(Object c){}public void setPadding(int a,int b,int c,int d){}public void setOrientation(int o){}public void addView(android.view.View v,LayoutParams p){child=v;}public android.view.View getChildAt(int i){return child;}public static class LayoutParams {public static final int MATCH_PARENT=-1,WRAP_CONTENT=-2;public LayoutParams(int a,int b){}}}`,
'android/webkit/JsResult.java':`package android.webkit; public class JsResult {public int confirms,cancels;public Runnable onConfirm,onCancel;public void confirm(){confirms++;if(onConfirm!=null)onConfirm.run();}public void cancel(){cancels++;if(onCancel!=null)onCancel.run();}}`,
'android/webkit/JsPromptResult.java':`package android.webkit; public class JsPromptResult extends JsResult {public String value;public void confirm(String s){value=s;super.confirm();}}`,
'android/webkit/WebView.java':`package android.webkit; public class WebView {}`,
'android/webkit/WebChromeClient.java':`package android.webkit; public class WebChromeClient {public boolean onJsConfirm(WebView v,String u,String m,JsResult r){return false;}public boolean onJsAlert(WebView v,String u,String m,JsResult r){return false;}public boolean onJsPrompt(WebView v,String u,String m,String d,JsPromptResult r){return false;}}`,
'androidx/appcompat/app/AlertDialog.java':`package androidx.appcompat.app;
import android.content.DialogInterface; import android.view.View;
public class AlertDialog implements DialogInterface {
 public static AlertDialog last;public static boolean failNextShow;public static int shows;
 public DialogInterface.OnClickListener positive,negative;public DialogInterface.OnCancelListener cancel;public DialogInterface.OnDismissListener dismiss;public View entry;public boolean showing;
 public void setOnDismissListener(DialogInterface.OnDismissListener l){dismiss=l;}public void setCanceledOnTouchOutside(boolean b){}public void show(){if(failNextShow){failNextShow=false;throw new RuntimeException("window unavailable");}showing=true;shows++;}public void dismiss(){showing=false;if(dismiss!=null)dismiss.onDismiss(this);}public void accept(){positive.onClick(this,1);dismiss();}public void reject(){negative.onClick(this,2);dismiss();}public void back(){cancel.onCancel(this);dismiss();}
 public static class Builder {AlertDialog d=new AlertDialog();public Builder(Object c){}public Builder setTitle(String s){return this;}public Builder setMessage(String s){return this;}public Builder setOnCancelListener(DialogInterface.OnCancelListener l){d.cancel=l;return this;}public Builder setPositiveButton(int i,DialogInterface.OnClickListener l){d.positive=l;return this;}public Builder setNegativeButton(int i,DialogInterface.OnClickListener l){d.negative=l;return this;}public Builder setView(View v){d.entry=v;return this;}public AlertDialog create(){last=d;return d;}}
}`,
'com/zenstudy/focus/MainActivity.java':`package com.zenstudy.focus; public class MainActivity {public boolean finishing,destroyed;public boolean isFinishing(){return finishing;}public boolean isDestroyed(){return destroyed;}public android.content.res.Resources getResources(){return new android.content.res.Resources();}}`,
'com/zenstudy/focus/DialogsTest.java':`package com.zenstudy.focus;
import android.webkit.*;import android.widget.*;import androidx.appcompat.app.AlertDialog;
public class DialogsTest {
 static final String URL="file:///android_asset/web/index.html";
 static void check(boolean b,String m){if(!b)throw new AssertionError(m);}
 static JsResult confirm(FocusAppWebChromeClient c){JsResult r=new JsResult();c.onJsConfirm(null,URL,"Delete?",r);return r;}
 public static void main(String[] args){
  MainActivity a=new MainActivity();FocusAppWebChromeClient c=new FocusAppWebChromeClient(a);
  JsResult foreign=new JsResult();c.onJsConfirm(null,"https://example.test", "unsafe",foreign);check(foreign.cancels==1&&AlertDialog.shows==0,"untrusted origins never show or accept");
  a.finishing=true;JsResult closing=confirm(c);check(closing.cancels==1,"finishing Activity cancels");a.finishing=false;
  JsResult first=confirm(c);AlertDialog d=AlertDialog.last;JsResult overlapping=confirm(c);check(overlapping.cancels==1,"overlap is refused");d.accept();check(first.confirms==1&&first.cancels==0,"accept exactly once despite dismiss");
  JsResult cancel=confirm(c);AlertDialog.last.reject();AlertDialog.last.dismiss();check(cancel.cancels==1&&cancel.confirms==0,"negative and repeated dismiss cancel once");
  JsResult back=confirm(c);AlertDialog.last.back();check(back.cancels==1&&back.confirms==0,"Back cancels once");
  JsPromptResult prompt=new JsPromptResult();c.onJsPrompt(null,URL,"Name","draft",prompt);d=AlertDialog.last;EditText input=(EditText)((LinearLayout)d.entry).getChildAt(0);check(input.getText().equals("draft"),"prompt default retained");input.setText("نص Draft");d.accept();check(prompt.value.equals("نص Draft")&&prompt.confirms==1&&prompt.cancels==0,"prompt text reaches JS unchanged");
  JsResult alert=new JsResult();c.onJsAlert(null,URL,"Notice",alert);check(AlertDialog.last.negative==null,"alert has no added Cancel action");AlertDialog.last.accept();check(alert.confirms==1,"alert acknowledgement preserved");
  JsResult chain=new JsResult(),next=new JsResult();chain.onConfirm=()->c.onJsConfirm(null,URL,"Backup?",next);c.onJsConfirm(null,URL,"Delete?",chain);AlertDialog old=AlertDialog.last;old.accept();check(AlertDialog.last!=old&&AlertDialog.last.showing,"synchronous chained confirm opens");AlertDialog.last.accept();check(next.confirms==1&&next.cancels==0,"old dismiss cannot cancel next dialog");
  FocusAppWebChromeClient failed=new FocusAppWebChromeClient(a);JsResult broken=new JsResult(),retry=new JsResult();broken.onCancel=()->failed.onJsConfirm(null,URL,"Next after show failure",retry);AlertDialog.failNextShow=true;failed.onJsConfirm(null,URL,"broken",broken);check(broken.cancels==1&&broken.confirms==0,"show failure never approves");AlertDialog replacement=AlertDialog.last;check(replacement.showing,"cancel may synchronously open replacement");failed.cancelPending();check(retry.cancels==1&&!replacement.showing,"show-failure cleanup retains ownership of replacement");
  FocusAppWebChromeClient dying=new FocusAppWebChromeClient(a);JsResult pending=new JsResult(),reentrant=new JsResult();pending.onCancel=()->dying.onJsConfirm(null,URL,"Reentrant on teardown",reentrant);dying.onJsConfirm(null,URL,"Pending",pending);AlertDialog owned=AlertDialog.last;int shown=AlertDialog.shows;dying.cancelPending();dying.cancelPending();check(pending.cancels==1&&!owned.showing,"teardown resolves and dismisses exactly once");check(reentrant.cancels==1&&reentrant.confirms==0&&AlertDialog.shows==shown,"teardown must reject synchronous reentrant JS dialog");
  System.out.println("N03 production JVM dialog assertions PASS; Android Window/WebView NOT_TESTED");
 }
}`
};
test('N03 production Java dialogs preserve answers and settle safely on show failure and teardown',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-n03-java-'));
 try{
  for(const [name,source] of Object.entries(sources)){const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);}
  const production=path.join(dir,'com/zenstudy/focus/FocusAppWebChromeClient.java');fs.copyFileSync(path.join(ROOT,'android/app/src/main/java/com/zenstudy/focus/FocusAppWebChromeClient.java'),production);
  cp.execFileSync('java',['com.sun.tools.javac.Main','-d',dir,...Object.keys(sources).map(p=>path.join(dir,p)),production],{encoding:'utf8',timeout:30000});
  assert.match(cp.execFileSync('java',['-cp',dir,'com.zenstudy.focus.DialogsTest'],{encoding:'utf8',timeout:15000}),/assertions PASS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
