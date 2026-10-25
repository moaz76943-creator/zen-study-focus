/**
 * DEEP FOCUS — Standalone completion idempotency guard, v21-compatible.
 * This is not the app.js session accounting engine. The integration owner must
 * explicitly wire it before it can be claimed as runtime coverage.
 */
(function (global) {
  'use strict';
  const STORAGE_KEY_PROCESSED = 'zen_fortress_processed_sessions_v21';

  function recordCompletion(session, storageBackend, analyticsTracker) {
    if (!session || typeof session.sessionId !== 'string' || !session.sessionId.trim())
      return {status: 'INVALID_SESSION', credited: false};

    const minutes = Number(session.durationMinutes);
    if (!Number.isFinite(minutes) || minutes < 0)
      return {status: 'INVALID_DURATION', credited: false, sessionId: session.sessionId};
    if (!analyticsTracker || typeof analyticsTracker.addFocusMinutes !== 'function')
      return {status: 'TRACKER_UNAVAILABLE', credited: false, sessionId: session.sessionId};
    if (!storageBackend || typeof storageBackend.getItem !== 'function' || typeof storageBackend.setItem !== 'function')
      return {status: 'LEDGER_UNAVAILABLE', credited: false, sessionId: session.sessionId};

    let raw, processed;
    try {
      raw = storageBackend.getItem(STORAGE_KEY_PROCESSED);
      processed = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(processed) || processed.some(id => typeof id !== 'string' || !id.trim()))
        return {status: 'LEDGER_INVALID', credited: false, sessionId: session.sessionId};
    } catch (error) {
      // Corrupt/unreadable history must never be treated as an empty history.
      return {status: 'LEDGER_UNAVAILABLE', credited: false, sessionId: session.sessionId};
    }

    if (processed.includes(session.sessionId))
      return {status: 'ALREADY_CREDITED', credited: false, sessionId: session.sessionId};

    // Durable reservation before the external analytics callback. If storage
    // rejects a write, analytics is not called. Never evict older IDs: doing so
    // would allow an older completion to be replayed after 500 sessions.
    const updated = JSON.stringify([...processed, session.sessionId]);
    try {
      storageBackend.setItem(STORAGE_KEY_PROCESSED, updated);
      if (storageBackend.getItem(STORAGE_KEY_PROCESSED) !== updated)
        return {status: 'LEDGER_WRITE_UNVERIFIED', credited: false, sessionId: session.sessionId};
    } catch (error) {
      return {status: 'LEDGER_WRITE_FAILED', credited: false, sessionId: session.sessionId};
    }
    try {
      analyticsTracker.addFocusMinutes(minutes, session.activityType || 'focus');
    } catch (error) {
      // Callback may have committed before throwing. Do not replay automatically;
      // reconciliation with the analytics ledger requires the integration owner.
      return {status: 'CREDIT_UNCERTAIN', credited: false, sessionId: session.sessionId};
    }
    return {status: 'CREDITED_SUCCESSFULLY', credited: true,
      sessionId: session.sessionId, creditedMinutes: minutes};
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {recordCompletion, STORAGE_KEY_PROCESSED};
  } else {
    global.ZenTimerIdempotency = {recordCompletion, STORAGE_KEY_PROCESSED};
  }
})(typeof window !== 'undefined' ? window : globalThis);
