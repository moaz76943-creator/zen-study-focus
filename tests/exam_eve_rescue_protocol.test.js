const assert = require('assert');
const ExamEveRescueProtocol = require('../android/app/src/main/assets/web/modules/rescue/exam_eve_rescue_protocol.js');

console.log('🧪 Starting ExamEveRescueProtocol (Axis 8: M8498-M8507) Unit Tests...');

const protocol = new ExamEveRescueProtocol();

// Test 1: Activate Exam-Eve Rescue Protocol
const act = protocol.dfActivateExamEveFocusProtocol('Thermodynamics & Statistical Physics');
assert.strictEqual(act.success, true);
assert.strictEqual(protocol.activeRescue.subject, 'Thermodynamics & Statistical Physics');
assert.strictEqual(protocol.activeRescue.metricsMuted, true);
console.log('  ✓ dfActivateExamEveFocusProtocol verified.');

// Test 2: Filter Deck to Top 20% Critical
const mockCards = [
  { id: 1, front: 'Card 1', retentionScore: 0.9 },
  { id: 2, front: 'Card 2', retentionScore: 0.1 },
  { id: 3, front: 'Card 3', retentionScore: 0.4 },
  { id: 4, front: 'Card 4', retentionScore: 0.8 },
  { id: 5, front: 'Card 5', retentionScore: 0.2 }
];
const topCritical = protocol.dfFilterDeckToTop20PercentCritical(mockCards);
assert.strictEqual(topCritical.length, 1, 'Top 20% of 5 cards is 1 card');
assert.strictEqual(topCritical[0].id, 2, 'Card 2 has lowest retention (0.1)');
console.log('  ✓ dfFilterDeckToTop20PercentCritical verified.');

// Test 3: Hide Mastered Cards Temporarily
const mixCards = [
  { id: 10, reps: 5, stability: 20 },
  { id: 20, reps: 1, stability: 2 },
  { id: 30, reps: 6, stability: 18 }
];
const unmastered = protocol.dfHideMasteredCardsTemporarily(mixCards);
assert.strictEqual(unmastered.length, 1);
assert.strictEqual(unmastered[0].id, 20);
console.log('  ✓ dfHideMasteredCardsTemporarily verified.');

// Test 4: One-Page Formula & Date Sheet Compiler
const notes = [
  { id: 'f1', text: 'E = mc^2' },
  { id: 'f2', text: 'PV = nRT' },
  { id: 'd1', text: 'First Law discovered in 1850' },
  { id: 'c1', text: 'Entropy is a measure of molecular disorder' }
];
const sheet = protocol.dfCompileOnePageFormulaAndDateSheet(notes);
assert.strictEqual(sheet.totalFormulasCount, 2);
assert.strictEqual(sheet.totalDatesCount, 1);
assert.ok(sheet.onePageSummaryHtml.includes('E = mc^2'));
console.log('  ✓ dfCompileOnePageFormulaAndDateSheet verified.');

// Test 5: Rapid-Fire Sprint Intervals
const sprint = protocol.dfSetRapidFireSprintIntervals();
assert.strictEqual(sprint.focusMinutes, 20);
assert.strictEqual(sprint.breakMinutes, 3);
console.log('  ✓ dfSetRapidFireSprintIntervals verified.');

// Test 6: Sleep Protection Cutoff Enforcement
const sleep = protocol.dfEnforceSleepProtectionCutoff(23);
assert.strictEqual(sleep.cutoffHour, 23);
assert.ok(typeof sleep.sleepLockdownTriggered === 'boolean');
console.log('  ✓ dfEnforceSleepProtectionCutoff verified.');

// Test 7: Morning Warmup Five-Minute Quiz
const warmup = protocol.dfRunMorningWarmupFiveMinuteQuiz(mockCards);
assert.ok(warmup.quizCards.length <= 10);
assert.strictEqual(protocol.activeRescue.warmupQuizCompleted, true);
console.log('  ✓ dfRunMorningWarmupFiveMinuteQuiz verified.');

// Test 8: Mute Non-Critical UI Metrics
const muted = protocol.dfMuteAllNonCriticalUiMetrics(true);
assert.strictEqual(muted.metricsMuted, true);
assert.ok(muted.mutedElements.length >= 3);
console.log('  ✓ dfMuteAllNonCriticalUiMetrics verified.');

// Test 9: Deactivate Protocol Post-Exam
const deact = protocol.dfDeactivateExamEveModePostExam('Aced thermodynamics test!');
assert.strictEqual(deact.deactivated, true);
assert.strictEqual(protocol.activeRescue, null);
assert.ok(protocol.historyLedger.length >= 1);
console.log('  ✓ dfDeactivateExamEveModePostExam verified.');

// Test 10: Milestone Seal M8507
const seal = protocol.dfGetMilestoneM8507ExamRescueSeal();
assert.strictEqual(seal.milestone, 'M8507');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8507ExamRescueSeal verified.');

console.log('🎉 All 10 ExamEveRescueProtocol tests passed with 100% assertions!');
