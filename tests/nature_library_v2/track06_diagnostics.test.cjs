'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const manifest=require('../../tools/nature_audio/commons_intake.json');
const alerts=require('../../android/app/src/main/assets/web/completion_alerts/manifest.json');
const locale=require('../../android/app/src/main/assets/web/completion_alert_locales.js');
const probe=require('./android20_runtime_probe.cjs');

test('TRACK06 selected cohort: 20 distinct pinned source recordings remain quarantined',()=>{
  const all=[...manifest.items,...manifest.replacement_candidates];
  assert.equal(manifest.required_slots.length,20);
  const hashes=new Set(),slots=new Set(),selection=new Set();
  let cc0=0,pd=0;
  for(const slot of manifest.required_slots){
    assert.ok(!slots.has(slot.slot_id),'duplicated requested slot');
    slots.add(slot.slot_id);
    const id=slot.replacement_candidate_id||slot.candidate_id;
    assert.ok(!selection.has(id),'same original reused under two requested slots');
    selection.add(id);
    const source=all.find(x=>x.id===id);
    assert.ok(source,'missing pinned candidate for '+slot.slot_id);
    assert.match(source.source_sha256,/^[a-f0-9]{64}$/);
    assert.ok(!hashes.has(source.source_sha256),'duplicate original bytes');
    hashes.add(source.source_sha256);
    assert.equal(source.approved_for_runtime,false,id);
    assert.equal(source.ready,false,id);
    assert.equal(source.human_audio_review,'NOT_TESTED',id);
    assert.ok(source.license_evidence.startsWith('https://'),id);
    assert.ok(['CC0-1.0','PD-author'].includes(source.license),id);
    if(source.license==='CC0-1.0')cc0++;else pd++;
  }
  assert.equal(hashes.size,20);
  for(const candidate of all){
    if(candidate.approved_for_runtime===false)assert.equal(candidate.ready,false,'explicit quarantine flag missing for '+candidate.id);
  }
  assert.deepEqual([cc0,pd],[14,6]);
  assert.equal(manifest.sources_verified_for_distribution,false);
  const rightsConflict=manifest.items.find(x=>x.id==='ocean');
  assert.ok(rightsConflict.review_warnings.some(x=>x.startsWith('BLOCKED_RIGHTS:')));
  assert.ok(!selection.has('ocean'),'the historic rights-conflicted ocean must stay excluded');
});

test('TRACK06 completion options are five pinned local cues plus actual silence in all 20 locales',()=>{
  const picker=require('../../android/app/src/main/assets/web/completion_alert_settings.js');
  assert.deepEqual(picker.CHOICES.map(x=>x.id),['silent','soft-bell','wood-tap','water-drop','muted-metal','two-taps']);
  assert.equal(picker.CHOICES[0].file,null);
  assert.equal(alerts.assets.length,5);
  assert.equal(new Set(alerts.assets.map(x=>x.sha256)).size,5);
  assert.equal(locale.languages.length,20);
  for(const item of alerts.assets){
    assert.match(item.sha256,/^[a-f0-9]{64}$/);
    assert.match(item.source_sha256,/^[a-f0-9]{64}$/);
    assert.equal(picker.CHOICES.find(x=>x.id===item.id).file,item.path);
    for(const lang of locale.languages)assert.ok(locale.translate(lang,'completionAlerts.'+item.id));
  }
});

test('TRACK06 Android unmuted lifecycle must cover 1, 2, and 20 distinct tracks',()=>{
  assert.equal(typeof probe.lifecycleTrackSelections,'function','missing lifecycle selection matrix');
  assert.deepEqual(probe.lifecycleTrackSelections(20).map(x=>x.trackCount),[1,2,20]);
  assert.deepEqual(probe.lifecycleTrackSelections(1),[{trackCount:1,indices:[0]}]);
  assert.deepEqual(probe.lifecycleTrackSelections(2).map(x=>x.trackCount),[1,2]);
  for(const {trackCount,indices} of probe.lifecycleTrackSelections(20)){
    assert.equal(indices.length,trackCount);
    assert.equal(new Set(indices).size,trackCount);
    assert.ok(indices.every(i=>i>=0&&i<20));
  }
  for(const n of [0,21,NaN,1.5,-1])assert.throws(()=>probe.lifecycleTrackSelections(n));
});

test('TRACK06 fails closed on a real hidden audio stall and never promotes old muted checks',()=>{
  const before=[{id:'nature',progress:1,duration:90}];
  const after=[{id:'nature',progress:15.7,duration:90}];
  const sample={seconds:18.02,visibility:'hidden',wakefulness:'Asleep',active:1,gain:0.5,errors:[]};
  assert.throws(()=>probe.assertLifecycle('background',before,after,sample),/stalled/);
  assert.throws(()=>probe.assertLifecycle('screenOff',before,after,sample),/stalled/);
  const smoke={status:'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS',endurance:{requested:0,seconds:6,status:'NOT_TESTED'}};
  assert.match(probe.resultSummary(smoke,smoke),/THIRTY_MINUTE_MUTED_DECODE_MIX=NOT_TESTED/);
  assert.throws(()=>probe.resultSummary({...smoke,background:{status:'FAIL'}},smoke),/Contradictory lifecycle summary/);
});
