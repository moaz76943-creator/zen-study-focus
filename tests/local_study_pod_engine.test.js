const assert = require('assert');
const LocalStudyPodEngine = require('../android/app/src/main/assets/web/modules/collaboration/local_study_pod_engine.js');

console.log('🧪 Starting LocalStudyPodEngine (Axis 8: M8458-M8467) Unit Tests...');

const engine = new LocalStudyPodEngine();

// Test 1: Host Local Study Pod
const hostResult = engine.dfHostLocalStudyPodSession('Calculus Marathon', 30, 'Integration Techniques');
assert.strictEqual(hostResult.success, true, 'Pod hosting must succeed');
assert.strictEqual(engine.currentPod.durationMinutes, 30, 'Duration must be 30 minutes');
assert.strictEqual(engine.currentPod.podName, 'Calculus Marathon');
console.log('  ✓ dfHostLocalStudyPodSession verified successfully.');

// Test 2: Generate Room Invite QR Ticket
const ticket = engine.dfGenerateRoomInviteQrTicket();
assert.ok(ticket.ticketCode.startsWith('DFPOD:'), 'Ticket must start with DFPOD: prefix');
assert.strictEqual(ticket.rawPayload.subj, 'Integration Techniques');
console.log('  ✓ dfGenerateRoomInviteQrTicket verified successfully.');

// Test 3: Join Pod with Ticket (Peer Simulation)
const peerEngine = new LocalStudyPodEngine();
const joinResult = peerEngine.dfJoinStudyPodWithTicket(ticket.ticketCode);
assert.strictEqual(joinResult.success, true, 'Peer join must succeed');
assert.strictEqual(peerEngine.currentPod.podName, 'Calculus Marathon');
console.log('  ✓ dfJoinStudyPodWithTicket verified successfully.');

// Test 4: Synchronized Countdown Clock
const clock = engine.dfSyncGroupCountdownTimerClock();
assert.strictEqual(clock.active, true);
assert.ok(clock.remainingMs > 0, 'Remaining time must be greater than zero');
assert.match(clock.formatted, /^\d{2}:\d{2}$/, 'Timer format must be Western mm:ss');
console.log('  ✓ dfSyncGroupCountdownTimerClock verified successfully.');

// Test 5: Anonymous Scholar Nicknames
const nicknames = engine.dfDisplayAnonymousPodNicknames();
assert.ok(nicknames.length >= 1, 'At least host scholar must be present');
assert.ok(nicknames[0].isSelf, 'Host must be identified as self');
assert.ok(typeof nicknames[0].nickname === 'string');
console.log('  ✓ dfDisplayAnonymousPodNicknames verified successfully.');

// Test 6: Strict Shield Pact Enforcement
const pact = engine.dfEnforceGroupStrictShieldPact(true);
assert.strictEqual(pact.pactEnforced, true);
assert.strictEqual(engine.pactEnforced, true);
console.log('  ✓ dfEnforceGroupStrictShieldPact verified successfully.');

// Test 7: Synchronized Break Trigger & Minute Accumulation
const breakResult = engine.dfTriggerGroupBreakSynchronized(5);
assert.strictEqual(breakResult.state, 'break');
assert.strictEqual(breakResult.breakMinutes, 5);
console.log('  ✓ dfTriggerGroupBreakSynchronized verified successfully.');

// Test 8: Aggregate Collective Minutes
const stats = engine.dfAggregateGroupTotalFocusMinutes();
assert.ok(stats.historicalTotalCollectiveMinutes >= 30, 'Historical minutes must be logged');
console.log('  ✓ dfAggregateGroupTotalFocusMinutes verified successfully.');

// Test 9: Clean Close and Ephemeral Wipe
const closeResult = engine.dfCloseLocalStudyPodCleanly();
assert.strictEqual(closeResult.success, true);
assert.strictEqual(engine.currentPod, null, 'Current pod state must be cleared');
console.log('  ✓ dfCloseLocalStudyPodCleanly verified successfully.');

// Test 10: Milestone Seal M8467
const seal = engine.dfGetMilestoneM8467StudyPodSeal();
assert.strictEqual(seal.milestone, 'M8467');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8467StudyPodSeal verified successfully.');

console.log('🎉 All 10 LocalStudyPodEngine tests passed with 100% assertions!');
