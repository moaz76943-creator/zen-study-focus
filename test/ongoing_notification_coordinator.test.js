/**
 * DEEP FOCUS — Test Suite: Ongoing Media-Style Notification Coordinator (M093)
 * File: test/ongoing_notification_coordinator.test.js
 */

const assert = require('assert');
const Coordinator = require('../android/app/src/main/assets/web/js/ongoing_notification_coordinator.js');

console.log('--- Running 🎯 Mission #093: Ongoing Notification Coordinator Tests ---');

// Test 1: Payload Construction & Western Time Formatting
try {
  assert.strictEqual(Coordinator.formatTime(1500), '25:00');
  assert.strictEqual(Coordinator.formatTime(4), '00:04');
  assert.strictEqual(Coordinator.formatTime(0), '00:00');

  const state = {
    status: 'running',
    timeRemainingSec: 1200,
    totalDurationSec: 1500,
    taskName: 'Advanced Physics Problem Set',
    soundName: 'Rainy Library'
  };

  const payload = Coordinator.buildNotificationPayload(state, { locale: 'en' });
  assert.strictEqual(payload.notificationId, 1001);
  assert.strictEqual(payload.channelId, 'deep_focus_ongoing_timer');
  assert.strictEqual(payload.ongoing, true);
  assert.strictEqual(payload.formattedTime, '20:00');
  assert.strictEqual(payload.progressPercent, 20);
  assert(payload.title.includes('20:00 • Advanced Physics Problem Set'));
  assert(payload.body.includes('Rainy Library'));

  assert.strictEqual(payload.actions.length, 3);
  assert.strictEqual(payload.actions[0].id, Coordinator.ACTIONS.PAUSE);
  assert.strictEqual(payload.actions[1].id, Coordinator.ACTIONS.ADD_5M);
  assert.strictEqual(payload.actions[2].id, Coordinator.ACTIONS.FINISH);

  console.log('✓ Test 1: Notification payload schema, actions & Western timer formatting verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Multi-Language & Strict English Fallback
try {
  const state = { status: 'running', timeRemainingSec: 900, totalDurationSec: 1500, taskName: 'Study Task' };

  const payloadAr = Coordinator.buildNotificationPayload(state, { locale: 'ar' });
  assert.strictEqual(payloadAr.actions[0].title, 'إيقاف مؤقت');
  assert.strictEqual(payloadAr.actions[1].title, '+5 دقائق');
  assert.strictEqual(payloadAr.actions[2].title, 'إنهاء');

  const payloadEs = Coordinator.buildNotificationPayload(state, { locale: 'es' });
  assert.strictEqual(payloadEs.actions[0].title, 'Pausa');
  assert.strictEqual(payloadEs.actions[1].title, '+5 min');
  assert.strictEqual(payloadEs.actions[2].title, 'Terminar');

  const payloadFallback = Coordinator.buildNotificationPayload(state, { locale: 'unknown_lang' });
  assert.strictEqual(payloadFallback.actions[0].title, 'Pause');
  assert.strictEqual(payloadFallback.actions[1].title, '+5 Min');
  assert.strictEqual(payloadFallback.actions[2].title, 'Finish');

  console.log('✓ Test 2: Multi-language notification labels & strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Interactive Action Handling & Event Bus
try {
  Coordinator.clearListeners();
  let receivedEvent = null;

  Coordinator.onAction((evt) => {
    receivedEvent = evt;
  });

  const pauseRes = Coordinator.handleNotificationAction(Coordinator.ACTIONS.PAUSE);
  assert.strictEqual(pauseRes.type, 'pause_timer');
  assert.strictEqual(receivedEvent.type, 'pause_timer');

  const resumeRes = Coordinator.handleNotificationAction(Coordinator.ACTIONS.RESUME);
  assert.strictEqual(resumeRes.type, 'resume_timer');
  assert.strictEqual(receivedEvent.type, 'resume_timer');

  const addRes = Coordinator.handleNotificationAction(Coordinator.ACTIONS.ADD_5M);
  assert.strictEqual(addRes.type, 'add_time');
  assert.strictEqual(addRes.addedSeconds, 300);

  const finishRes = Coordinator.handleNotificationAction(Coordinator.ACTIONS.FINISH);
  assert.strictEqual(finishRes.type, 'finish_session');

  console.log('✓ Test 3: Notification interactive actions (Pause, Resume, +5m, Finish) verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Native Android Bridge Interface Dispatch & Fallback
try {
  const syncNode = Coordinator.syncState({ status: 'running', timeRemainingSec: 600 });
  assert.strictEqual(syncNode.success, true);
  assert.strictEqual(syncNode.dispatchedToNative, false);

  let nativeNotificationString = null;
  global.window = {
    AndroidNotificationInterface: {
      updateOngoingNotification: function(jsonStr) {
        nativeNotificationString = jsonStr;
      },
      cancelOngoingNotification: function(id) {
        nativeNotificationString = 'cancelled_' + id;
      }
    }
  };

  const syncNative = Coordinator.syncState({ status: 'running', timeRemainingSec: 600, taskName: 'Mock Task' });
  assert.strictEqual(syncNative.dispatchedToNative, true);
  assert(nativeNotificationString !== null);
  const parsed = JSON.parse(nativeNotificationString);
  assert.strictEqual(parsed.notificationId, 1001);
  assert.strictEqual(parsed.formattedTime, '10:00');

  const cancelRes = Coordinator.cancelNotification();
  assert.strictEqual(cancelRes.dispatchedToNative, true);
  assert.strictEqual(nativeNotificationString, 'cancelled_1001');

  delete global.window;

  console.log('✓ Test 4: Android Native WebView interface dispatch & safe headless fallback verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strict Western Arabic Digits & Hebrew Exclusion
try {
  const state = { status: 'running', timeRemainingSec: 1545, totalDurationSec: 1800 };
  const payload = Coordinator.buildNotificationPayload(state, { locale: 'ar' });

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const fullText = JSON.stringify(payload);

  easternDigits.forEach(d => {
    assert(!fullText.includes(d), `Notification must not contain Eastern digit ${d}`);
  });

  const payloadHe = Coordinator.buildNotificationPayload(state, { locale: 'he' });
  assert.strictEqual(payloadHe.actions[0].title, 'Pause', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(payloadHe).includes('עברית'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Strict Western digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #093 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
