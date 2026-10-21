'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scanJava,report}=require('../../tools/localization_100/native_copy.cjs');
test('native Android UI literals are inventoried with source lines and exact files',()=>{
 const source='Toast.makeText(this, "Backup saved", Toast.LENGTH_LONG).show();\n'+
  'new NotificationChannel(CHANNEL_ALARM, "Quiet timer", NotificationManager.IMPORTANCE_DEFAULT);\n'+
  '.setContentText("Timer is running")\n'+
  '.setDescription("Notification channel")\n'+
  '.setTitle("Deep Focus")';
 const rows=scanJava(source,'Test.java');
 assert.deepEqual(new Set(rows.map(r=>r.text)),new Set(['Backup saved','Quiet timer','Timer is running','Notification channel','Deep Focus']));
 assert.ok(rows.every(r=>r.line>=1&&r.path==='Test.java'&&r.status==='UNTRANSLATED_REQUIRES_REVIEW'));
});
test('real Android Java notifications and backup messages are explicitly unlocalized',()=>{
 const r=report();
 assert.ok(r.uiStrings.length>=8);
 assert.ok(r.uiStrings.some(x=>x.text==='File picker unavailable; use Share Backup'));
 assert.ok(r.uiStrings.some(x=>x.text==='Deep Focus is running in background — Tap to open'));
 assert.ok(r.uiStrings.some(x=>x.text==='Quiet timer completion status'));
 assert.equal(r.localizedIn100,false);
 assert.equal(r.reviewed,false);
});
