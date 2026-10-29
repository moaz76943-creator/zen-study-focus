'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODULE_URL = new URL('../../tools/termux_room5/scope_collision_report.mjs', 'file://' + __dirname + '/').href;

const A01_KEY = 'tools/termux_room5/scope_collision_report.mjs';

const snapshot = () => ([
  { room: 'a', task: 'A01', owner: 'glm-5.3-flash-free', module: 'scope_collision_report', sourceFile: A01_KEY, testFile: 'tests/termux_room5/A01_scope_collision_report.test.cjs' },
  { room: 'a', task: 'A02', owner: 'glm-5.3-flash-free', module: 'ci_signal_classifier', sourceFile: 'tools/termux_room5/ci_signal_classifier.mjs', testFile: 'tests/termux_room5/A02_ci_signal_classifier.test.cjs' },
  { room: 'a', task: 'A03', owner: 'glm-5.3-flash-free', module: 'pr_scope_reconciler', sourceFile: 'tools/termux_room5/pr_scope_reconciler.mjs', testFile: 'tests/termux_room5/A03_pr_scope_reconciler.test.cjs' },
  { room: 'a', task: 'A04', owner: 'glm-5.3-flash-free', module: 'agent_work_ledger', sourceFile: 'tools/termux_room5/agent_work_ledger.mjs', testFile: 'tests/termux_room5/A04_agent_work_ledger.test.cjs' },
  { room: 'a', task: 'A05', owner: 'glm-5.3-flash-free', module: 'free_model_budget', sourceFile: 'tools/termux_room5/free_model_budget.mjs', testFile: 'tests/termux_room5/A05_free_model_budget.test.cjs' },
  { room: 'b', task: 'B01', owner: 'mimo-v2.6-flash-free', module: 'study_plan_templates_engine', sourceFile: 'tools/termux_room5/study_plan_templates_engine.mjs', testFile: 'tests/termux_room5/B01_study_plan_templates_engine.test.cjs' },
  { room: 'b', task: 'B02', owner: 'mimo-v2.6-flash-free', module: 'sport_interval_builder_engine', sourceFile: 'tools/termux_room5/sport_interval_builder_engine.mjs', testFile: 'tests/termux_room5/B02_sport_interval_builder_engine.test.cjs' },
  { room: 'b', task: 'B03', owner: 'mimo-v2.6-flash-free', module: 'reading_bookmark_engine', sourceFile: 'tools/termux_room5/reading_bookmark_engine.mjs', testFile: 'tests/termux_room5/B03_reading_bookmark_engine.test.cjs' },
  { room: 'b', task: 'B04', owner: 'mimo-v2.6-flash-free', module: 'project_time_budget_engine', sourceFile: 'tools/termux_room5/project_time_budget_engine.mjs', testFile: 'tests/termux_room5/B04_project_time_budget_engine.test.cjs' },
  { room: 'b', task: 'B05', owner: 'mimo-v2.6-flash-free', module: 'focus_ritual_templates_engine', sourceFile: 'tools/termux_room5/focus_ritual_templates_engine.mjs', testFile: 'tests/termux_room5/B05_focus_ritual_templates_engine.test.cjs' },
  { room: 'b', task: 'B06', owner: 'mimo-v2.6-flash-free', module: 'recovery_break_menu_engine', sourceFile: 'tools/termux_room5/recovery_break_menu_engine.mjs', testFile: 'tests/termux_room5/B06_recovery_break_menu_engine.test.cjs' },
  { room: 'b', task: 'B07', owner: 'mimo-v2.6-flash-free', module: 'focus_plan_checklist_engine', sourceFile: 'tools/termux_room5/focus_plan_checklist_engine.mjs', testFile: 'tests/termux_room5/B07_focus_plan_checklist_engine.test.cjs' },
  { room: 'b', task: 'B08', owner: 'mimo-v2.6-flash-free', module: 'focus_weekly_intentions_engine', sourceFile: 'tools/termux_room5/focus_weekly_intentions_engine.mjs', testFile: 'tests/termux_room5/B08_focus_weekly_intentions_engine.test.cjs' },
  { room: 'c', task: 'C01', owner: 'deepseek-v4.1-flash-free', module: 'locale_gap_report', sourceFile: 'tools/termux_room5/locale_gap_report.mjs', testFile: 'tests/termux_room5/C01_locale_gap_report.test.cjs' },
  { room: 'c', task: 'C02', owner: 'deepseek-v4.1-flash-free', module: 'audio_provenance_audit', sourceFile: 'tools/termux_room5/audio_provenance_audit.mjs', testFile: 'tests/termux_room5/C02_audio_provenance_audit.test.cjs' },
  { room: 'c', task: 'C03', owner: 'deepseek-v4.1-flash-free', module: 'mobile_a11y_lint', sourceFile: 'tools/termux_room5/mobile_a11y_lint.mjs', testFile: 'tests/termux_room5/C03_mobile_a11y_lint.test.cjs' },
  { room: 'c', task: 'C04', owner: 'deepseek-v4.1-flash-free', module: 'android_e2e_matrix', sourceFile: 'tools/termux_room5/android_e2e_matrix.mjs', testFile: 'tests/termux_room5/C04_android_e2e_matrix.test.cjs' }
]);

test('A01 scope_collision_report: room5 ownership registry', async () => {
  const { analyzeRoomOwnership, findCollisions, formatReport } = await import(MODULE_URL);

  await test('real room snapshot is collision-free and PASS', () => {
    const report = analyzeRoomOwnership(snapshot());
    assert.equal(report.status, 'PASS');
    assert.equal(report.ok, true);
    assert.equal(report.roomCount, 17);
    assert.equal(report.entryCount, 17);
    assert.equal(report.collisions.length, 0);
    assert.deepEqual(report.duplicateSourceFiles, []);
    assert.deepEqual(report.duplicateTestFiles, []);
    assert.deepEqual(report.duplicateModules, []);
    assert.deepEqual(report.duplicateRooms, []);
  });

  await test('detects source-file collision across independent rooms', () => {
    const rooms = snapshot().slice(0, 3);
    rooms[2].sourceFile = rooms[0].sourceFile;
    const report = analyzeRoomOwnership(rooms);
    assert.equal(report.status, 'COLLISION');
    assert.equal(report.ok, false);
    assert.equal(report.duplicateSourceFiles.length, 1);
    const dup = report.duplicateSourceFiles[0];
    assert.equal(dup.key, A01_KEY);
    assert.deepEqual([...dup.rooms].sort(), ['A01', 'A03']);
    assert.ok(report.collisions.some(c => c.kind === 'source'));
  });

  await test('detects test-file collision and module-name collision', () => {
    const rooms = snapshot().slice(3, 6);
    rooms[1].testFile = rooms[0].testFile;
    rooms[2].module = rooms[0].module;
    const report = analyzeRoomOwnership(rooms);
    assert.equal(report.status, 'COLLISION');
    assert.equal(report.duplicateTestFiles.length, 1);
    assert.equal([...report.duplicateTestFiles[0].rooms].sort().join(','), 'A04,A05');
    assert.equal(report.duplicateModules.length, 1);
    assert.equal(report.duplicateModules[0].key, 'agent_work_ledger');
  });

  await test('detects duplicate room-task registration', () => {
    const rooms = snapshot().slice(0, 2);
    rooms[1].task = rooms[0].task;
    const report = analyzeRoomOwnership(rooms);
    assert.equal(report.duplicateRooms.length, 1);
    assert.equal(report.duplicateRooms[0].key, 'a|A01');
    assert.equal(report.status, 'COLLISION');
  });

  await test('findCollisions returns flat deterministic sorted list', () => {
    const rooms = snapshot().slice(0, 4);
    rooms[1].sourceFile = rooms[0].sourceFile;
    rooms[2].testFile = rooms[0].testFile;
    const list = findCollisions(rooms);
    assert.equal(list.length, 2);
    const kinds = list.map(c => c.kind).join(',');
    assert.ok(kinds === 'source,test' || kinds === 'test,source');
    for (let i = 1; i < list.length; i++) {
      assert.ok(
        list[i - 1].kind + '\u0000' + list[i - 1].key <= list[i].kind + '\u0000' + list[i].key,
        'collisions sorted by kind then key'
      );
    }
    for (const c of list) {
      assert.ok(['source', 'test', 'module', 'room'].includes(c.kind));
      assert.equal(typeof c.key, 'string');
      assert.ok(Array.isArray(c.rooms) && c.rooms.length > 1);
    }
  });

  await test('input never mutated; repeated runs are deeply equal', () => {
    const rooms = snapshot();
    const before = JSON.stringify(rooms);
    const report = analyzeRoomOwnership(rooms);
    assert.equal(JSON.stringify(rooms), before);
    assert.deepEqual(report, analyzeRoomOwnership(rooms));
    assert.deepEqual(findCollisions(rooms), findCollisions(rooms));
  });

  await test('normalizes surrounding whitespace, stays case-sensitive', () => {
    const rooms = [
      { room: 'a', task: 'A01', owner: 'o1', module: 'm1', sourceFile: ' x/y.mjs ', testFile: 't1' },
      { room: 'a', task: 'A02', owner: 'o2', module: 'm2', sourceFile: 'x/y.mjs', testFile: 't2' },
      { room: 'a', task: 'A03', owner: 'o3', module: 'm3', sourceFile: 'X/Y.mjs', testFile: 't3' }
    ];
    const report = analyzeRoomOwnership(rooms);
    assert.equal(report.duplicateSourceFiles.length, 1);
    assert.equal(report.duplicateSourceFiles[0].key, 'x/y.mjs');
    assert.equal([...report.duplicateSourceFiles[0].rooms].sort().join(','), 'A01,A02');
  });

  await test('rejects invalid registries with precise errors', () => {
    assert.throws(() => analyzeRoomOwnership(null), /array of room ownership entries/i);
    assert.throws(() => analyzeRoomOwnership('nope'), /array of room ownership entries/i);
    assert.throws(() => analyzeRoomOwnership([{ room: 'a' }]), /task/i);
    assert.throws(() => analyzeRoomOwnership([{ task: 'A01' }]), /room/i);
    assert.throws(() => analyzeRoomOwnership([{ room: 'a', task: 'A01' }]), /module/i);
    assert.throws(() => analyzeRoomOwnership([{ room: 'a', task: 'A01', module: 'm' }]), /sourceFile/i);
  });

  await test('empty registry is a valid PASS baseline', () => {
    const report = analyzeRoomOwnership([]);
    assert.equal(report.status, 'PASS');
    assert.equal(report.ok, true);
    assert.equal(report.roomCount, 0);
    assert.equal(report.entryCount, 0);
    assert.equal(report.collisions.length, 0);
  });

  await test('formatReport deterministic, offline, summary-only text', () => {
    const bad = snapshot().slice(0, 3);
    bad[2].sourceFile = bad[0].sourceFile;
    const good = formatReport(analyzeRoomOwnership(snapshot()));
    const text = formatReport(analyzeRoomOwnership(bad));
    assert.equal(typeof good, 'string');
    assert.equal(typeof text, 'string');
    assert.ok(good.includes('PASS'));
    assert.ok(text.includes('COLLISION'));
    assert.ok(text.includes('source'));
    assert.ok(text.includes(A01_KEY));
    assert.equal(formatReport(analyzeRoomOwnership(bad)), text);
    assert.ok(!/https?:\/\//.test(text), 'no URLs / network hints in report');
  });

  await test('stable API surface: exactly three exported functions', async () => {
    const ns = await import(MODULE_URL);
    const keys = Object.keys(ns).sort();
    assert.deepEqual(keys, ['analyzeRoomOwnership', 'findCollisions', 'formatReport']);
    assert.equal(typeof ns.analyzeRoomOwnership, 'function');
    assert.equal(typeof ns.findCollisions, 'function');
    assert.equal(typeof ns.formatReport, 'function');
  });
});
