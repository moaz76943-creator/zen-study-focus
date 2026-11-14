'use strict';
// Source-level guard (NOT Android delivery proof): a refused prefs write must not cancel the armed alarm,
// and receiver delivery must share the class monitor with schedule/cancel/completeNow.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const j=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/FocusAlarmReceiver.java'),'utf8');
const body=name=>{const i=j.indexOf(name);return j.slice(i,j.indexOf('\n    }\n',i));};
test('schedule clears the old alarm only after the new state committed',()=>{
  const b=body('public static synchronized void schedule');
  assert.ok(b.indexOf('.commit()')>0&&b.indexOf('clearSystemAlarm')>b.indexOf('.commit()'));
});
test('cancel and completeNow keep the alarm when the commit is refused',()=>{
  const c=body('public static synchronized void cancel');assert.ok(c.indexOf('clearSystemAlarm')>c.indexOf('.commit()'));
  const d=body('public static synchronized void completeNow');assert.ok(d.indexOf('clearSystemAlarm')>d.indexOf('.commit()'));
});
test('onReceive delivery is serialized on the class monitor',()=>{
  assert.match(j,/synchronized \(FocusAlarmReceiver\.class\)\s*\{\s*deliver\(context, intent\);/);
});
