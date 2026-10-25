'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const q=require('../../tools/daily_maintenance/quality_agents.cjs');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tools/daily_maintenance/agents.json'),'utf8'));
const expected=[
  {
    "file": "tests/android_dialogs/native_dialog_handoff.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/analytics_charts_20_accessibility.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/analytics_controls_and_digits.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/analytics_date_guard.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/analytics_recovery_buttons.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/analytics_screen_20_locales.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/task_checklist_ack.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/timer_destructive_shortcuts.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/timer_mode_20_locale_prompt.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/track07_functional/timer_mode_button_safety.test.cjs",
    "owner": "navigation"
  },
  {
    "file": "tests/df4_browser/note_modal_style.test.cjs",
    "owner": "notes"
  },
  {
    "file": "tests/nature_library_v2/audio_endurance.test.cjs",
    "owner": "nature_audio"
  },
  {
    "file": "tests/nature_library_v2/catalog.test.cjs",
    "owner": "nature_audio"
  },
  {
    "file": "tests/nature_library_v2/intake_manifest.test.cjs",
    "owner": "nature_audio"
  },
  {
    "file": "tests/nature_library_v2/twenty_originals_provenance.test.cjs",
    "owner": "nature_audio"
  }
];
test('12 agents retain a unique owner and reviewed scope for new PR #138 suites',()=>{
 assert.equal(q.validateManifest(manifest).length,12);
 for(const {file,owner} of expected){
  const holders=manifest.agents.filter(a=>a.test_dirs.some(d=>file.startsWith(d+'/'))).map(a=>a.id);
  assert.deepEqual(holders,[owner],'exactly one reviewed source test owner for '+file);
 }
});

// Regression for the live PR #138 hourly-agent ledger COVERAGE_GAP (Issue #69).
test('TRACK16 staged timer tick lifecycle suite has one timer specialist owner',()=>{
 const file='tests/track05_timer/tick_lifecycle.test.cjs';
 const owners=manifest.agents.filter(a=>a.test_dirs.some(d=>file.startsWith(d+'/'))).map(a=>a.id);
 assert.deepEqual(owners,['timer'],'a staged timer regression must not be unmapped or double-owned');
});
