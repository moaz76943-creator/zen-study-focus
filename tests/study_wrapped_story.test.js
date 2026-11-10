const assert = require('assert');
const StudyWrappedStory = require('../android/app/src/main/assets/web/modules/wrapped/study_wrapped_story.js');

console.log('🧪 Starting StudyWrappedStory (Axis 9: M8548-M8557) Unit Tests...');

const wrapped = new StudyWrappedStory();

// Test 1: Compile Weekly Data
const mockSessions = [
  { durationMinutes: 60, subject: 'Quantum Mechanics', timestamp: new Date().setHours(10, 0, 0, 0) },
  { durationMinutes: 50, subject: 'Quantum Mechanics', timestamp: new Date().setHours(11, 0, 0, 0) },
  { durationMinutes: 40, subject: 'Differential Equations', timestamp: new Date().setHours(14, 0, 0, 0) }
];
const mockCards = [
  { id: 1, stability: 18 },
  { id: 2, stability: 20 },
  { id: 3, stability: 5 }
];

const compiled = wrapped.dfCompileWeeklyStudyWrappedData(mockSessions, mockCards);
assert.strictEqual(compiled.totalFocusMinutes, 150);
assert.strictEqual(compiled.totalFocusHours, 2.5);
assert.strictEqual(compiled.topSubject, 'Quantum Mechanics');
assert.strictEqual(compiled.masteredCardsCount, 2);
console.log('  ✓ dfCompileWeeklyStudyWrappedData verified.');

// Test 2: Story Slide Total Hours
const slide1 = wrapped.dfRenderStorySlideTotalHours(150, 120);
assert.strictEqual(slide1.hours, 2.5);
assert.ok(slide1.slideSvg.includes('<svg'));
console.log('  ✓ dfRenderStorySlideTotalHours verified.');

// Test 3: Story Slide Top Subject
const slide2 = wrapped.dfRenderStorySlideTopSubject('Quantum Mechanics', 110);
assert.strictEqual(slide2.subject, 'Quantum Mechanics');
assert.ok(slide2.slideSvg.includes('🏛️'));
console.log('  ✓ dfRenderStorySlideTopSubject verified.');

// Test 4: Story Slide Memory Strength
const slide3 = wrapped.dfRenderStorySlideMemoryStrength(3, 2);
assert.strictEqual(slide3.masteredCards, 2);
assert.strictEqual(slide3.retentionRatePercent, 67);
console.log('  ✓ dfRenderStorySlideMemoryStrength verified.');

// Test 5: Story Slide Peak Chronotype
const slide4 = wrapped.dfRenderStorySlidePeakChronotype(10);
assert.strictEqual(slide4.peakHourFormatted, '10:00 AM');
assert.strictEqual(slide4.chronotypeLabel, 'Morning Apex Scholar');
console.log('  ✓ dfRenderStorySlidePeakChronotype verified.');

// Test 6: Actionable Next-Week Goal
const goal = wrapped.dfGenerateNextWeekActionableGoal('Differential Equations', 20);
assert.strictEqual(goal.targetWeeklyHours, 22);
assert.ok(goal.actionableGoal.includes('Differential Equations'));
console.log('  ✓ dfGenerateNextWeekActionableGoal verified.');

// Test 7: Export Summary Card
const card = wrapped.dfExportWeeklySummaryCardSvg(compiled);
assert.ok(card.hashSignature.startsWith('DFWRAPPED:'));
assert.ok(card.cardSvg.includes('DEEP FOCUS WRAPPED'));
console.log('  ✓ dfExportWeeklySummaryCardSvg verified.');

// Test 8: Yearly Review Compilation
const year = wrapped.dfCompileYearlyMonumentalReview(mockSessions);
assert.strictEqual(year.yearTotalHours, 2.5);
assert.strictEqual(year.totalSessionsCount, 3);
console.log('  ✓ dfCompileYearlyMonumentalReview verified.');

// Test 9: Archive History
const arch = wrapped.dfArchiveWrappedReportsHistory(compiled);
assert.strictEqual(arch.archivedCount, 1);
assert.strictEqual(arch.latestArchivedId, compiled.reportId);
console.log('  ✓ dfArchiveWrappedReportsHistory verified.');

// Test 10: Milestone Seal M8557
const seal = wrapped.dfGetMilestoneM8557StudyWrappedSeal();
assert.strictEqual(seal.milestone, 'M8557');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8557StudyWrappedSeal verified.');

console.log('🎉 All 10 StudyWrappedStory tests passed with 100% assertions!');
