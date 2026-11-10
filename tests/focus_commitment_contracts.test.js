const assert = require('assert');
const FocusCommitmentContracts = require('../android/app/src/main/assets/web/modules/contracts/focus_commitment_contracts.js');

console.log('🧪 Starting FocusCommitmentContracts (Axis 8: M8478-M8487) Unit Tests...');

const contracts = new FocusCommitmentContracts();

// Test 1: Draft Personal Focus Commitment
const draft = contracts.dfDraftPersonalFocusCommitment(15, 'Quantum Mechanics & Linear Algebra');
assert.strictEqual(draft.success, true);
assert.strictEqual(contracts.activeContract.weeklyHoursTarget, 15);
assert.strictEqual(contracts.activeContract.targetMinutes, 900);
console.log('  ✓ dfDraftPersonalFocusCommitment verified.');

// Test 2: Set Commitment Target Streak Days
const targetStreak = contracts.dfSetCommitmentTargetStreakDays(21);
assert.strictEqual(targetStreak.targetStreakDays, 21);
console.log('  ✓ dfSetCommitmentTargetStreakDays verified.');

// Test 3: Daily Minimum Focus Verification
const log1 = contracts.dfVerifyDailyMinimumFocusMet(60);
assert.strictEqual(log1.isThresholdMet, true);
assert.strictEqual(log1.currentStreak, 1);
assert.strictEqual(contracts.activeContract.completedMinutes, 60);
console.log('  ✓ dfVerifyDailyMinimumFocusMet verified.');

// Test 4: Streak Freeze Shield Application
const shield = contracts.dfProvideOneStreakFreezeShield();
assert.strictEqual(shield.applied, true);
assert.strictEqual(shield.remainingShields, 0);
console.log('  ✓ dfProvideOneStreakFreezeShield verified.');

// Test 5: Consistency Reliability Score
const score = contracts.dfComputeConsistencyReliabilityScore();
assert.ok(score.consistencyScore >= 0 && score.consistencyScore <= 100);
assert.ok(typeof score.grade === 'string');
console.log('  ✓ dfComputeConsistencyReliabilityScore verified.');

// Test 6: Cryptographic Proof of Study Generation
const proof = contracts.dfGenerateCryptographicProofOfStudy({
  timestamp: 1700000000000,
  durationMinutes: 50,
  subject: 'Vector Calculus'
});
assert.ok(proof.proofHash.startsWith('DFSIG:'));
assert.strictEqual(proof.payload.mins, 50);
console.log('  ✓ dfGenerateCryptographicProofOfStudy verified.');

// Test 7: Peer Cryptographic Proof Signature Verification
const verifyValid = contracts.dfVerifyPeerStudyProofSignature(proof);
assert.strictEqual(verifyValid.valid, true);
assert.strictEqual(verifyValid.verifiedMinutes, 50);

// Tamper simulation test
const tamperedProof = JSON.parse(JSON.stringify(proof));
tamperedProof.payload.mins = 999; // Tampered duration
const verifyTampered = contracts.dfVerifyPeerStudyProofSignature(tamperedProof);
assert.strictEqual(verifyTampered.valid, false);
console.log('  ✓ dfVerifyPeerStudyProofSignature (valid and tampered) verified.');

// Test 8: Milestone Celebration Rendering
const celebration = contracts.dfRenderStreakMilestoneCelebration(21);
assert.strictEqual(celebration.streakDays, 21);
assert.ok(celebration.celebrationBadgeSvg.includes('<svg'));
console.log('  ✓ dfRenderStreakMilestoneCelebration verified.');

// Test 9: Commitment History Ledger
const ledgerEntry = contracts.dfLogCommitmentHistoryLedger(contracts.activeContract);
assert.strictEqual(ledgerEntry.targetHours, 15);
assert.ok(contracts.historyLedger.length >= 1);
console.log('  ✓ dfLogCommitmentHistoryLedger verified.');

// Test 10: Milestone Seal M8487
const seal = contracts.dfGetMilestoneM8487CommitmentSeal();
assert.strictEqual(seal.milestone, 'M8487');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8487CommitmentSeal verified.');

console.log('🎉 All 10 FocusCommitmentContracts tests passed with 100% assertions!');
