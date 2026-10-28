'use strict';
const assert=require('node:assert/strict');
const PKG='com.zenstudy.focus',TAG='*walarm*:com.deepfocus.study.TIMER_COMPLETE';

// API30 AlarmManagerService and API35 LazyAlarmStore format. Stop before
// per-uid/history statistics: a historical delivery is not a pending alarm.
function pendingTimerAlarms(dump){
 assert.match(dump,/Current Alarm Manager state:/,'TEST_INFRA: AlarmManager dump unavailable');
 const end=dump.indexOf('Pending alarms per uid:');
 assert.ok(end>=0&&dump.slice(0,end).includes('Pending user blocked background alarms:'),
  'TEST_INFRA: unrecognized pending AlarmManager sections');
 const pending=dump.slice(0,end);
 const starts=[...pending.matchAll(/^\s*(?:RTC_WAKEUP|RTC|ELAPSED_WAKEUP|ELAPSED) #\d+: (Alarm\{[^\n]+\})/gm)];
 const result=[];
 for(let i=0;i<starts.length;i++){
  const header=starts[i][1];
  if(!header.endsWith(' '+PKG+'}'))continue;
  const block=pending.slice(starts[i].index,starts[i+1]?.index||pending.length);
  if(!block.split(/\r?\n/).some(line=>line.trim()==='tag='+TAG))continue;
  const match=/\btype (\d+) (?:origWhen|when) (\d+)\b/.exec(header);
  assert.ok(match,'TEST_INFRA: timer alarm deadline unavailable');
  const deadline=Number(match[2]);
  assert.ok(Number.isSafeInteger(deadline),'TEST_INFRA: invalid timer alarm deadline');
  result.push({type:Number(match[1]),deadline,tag:TAG});
 }
 return result;
}
function resumedActivities(dump){
 const rows=dump.split(/\r?\n/).filter(line=>/\b(?:mResumedActivity|topResumedActivity)\s*[:=]/.test(line));
 assert.ok(rows.length,'TEST_INFRA: resumed Activity evidence unavailable');
 return rows.map(line=>line.trim());
}
module.exports={pendingTimerAlarms,resumedActivities};
