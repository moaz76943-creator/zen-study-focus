# DEEP-FOCUS-RECOVERY-03 — completion-alert integration handoff

Source: Issue #13, DF-031..DF-042. Base SHA: `632ef51ae6034224e6b459e0962a8bbedbf2b18e`.

## Files and ownership
- `android/app/src/main/assets/web/completion_alert_settings.js`: isolated chooser, preview, settings and idempotency logic.
- `android/app/src/main/assets/web/completion_alerts/`: five locally packaged recorded PCM16/44.1kHz/mono clips plus a sidecar manifest.
- `docs/ALERT_AUDIO_LICENSES.md`: five individual source and rights entries.
- `tests/completion_alerts/`: Node regression tests and media audit.

No changes to `app.js`, `index.html`, `MainActivity.java`, `FocusTimerService.java`, `integration_v22.js`, `docs/MEDIA_LICENSES.md`, nature-audio lane 02, or CI workflows.

## Lane 00 integration contract

1. Include `completion_alert_settings.js` in `index.html` before initializing picker or completion callbacks. `DeepFocusCompletionAlerts` is an import-only namespace, no implicit startup, global event, auto audio, storage, or timer side effects.
2. Pass actual existing mutable `cfg` and `persist: changed => saveFortressData('zen_fortress_cfg_v21', changed) === true`; use only after journal preflight. The original three v21 keys/packet format, unknown fields and `ZEN21::` are unchanged. Do **not** invoke backup/restore handlers from this module.
3. Instantiate once per active web runtime: `const a=DeepFocusCompletionAlerts.createCompletionAlerts(cfg,{persist,canOutput,requestFocus,releaseFocus,onError})`. Pass a native policy gate to `canOutput` (DND/silent mode/headset policy), and safe audio-focus callbacks. `createCompletionAlerts` requires a synchronous verified persist. If the native bridge does not provide policy information, **do not** claim DND handling is verified.
4. Build the picker inside a host node with `mountCompletionAlertPicker(host,a,{translate:(key,fallback)=>...})`. Lane 03 localization owns the 20-language phrase keys; do not hard-code a locale reset.
5. Call `a.complete({sessionId: timerSessionId, phase: 'focus'|'custom'|'short'|'long'})` only from the **single authoritative actual-completion** callback, never from render/tick/start. Never call it for user stop/cancel or restored stale completion. The idempotency ledger is `cfg.completionAlertPlayedIds` (bounded last 512 IDs plus runtime Set) and is written **before** playback. No focus minutes are fabricated or altered. Test if the existing native timer and JS callback both trigger sound; route completion through one owner.
6. On tab/activity suspend, app background or Audio Focus loss call `a.pause()`; on page teardown call `a.dispose()`; never auto-resume interrupted alerts. Preview is user-triggered only.
7. **Critical native Android gate**: `FocusTimerService.java` currently emits the platform alarm, vibration and HIGH importance notification with DEFAULT_ALL plus a channel sound. Owner 00 must suppress those when muted and remove the duplicate independent audio path, while preserving permitted visual notification. Notification channels on Android 8+ retain user-configured sound after creation; changing code alone does not update an existing channel. Confirm permissions, API levels and Audio Focus on device.
8. Do not merge directly to main. Include `node --test tests/completion_alerts/*.test.cjs` and `node --test tests/completion_alerts/audit_media.test.cjs` in the coordinator's CI workflow. Verify real WebView decoding, sound volume, Android lock/background/headphone/Bluetooth, DND, channel state and rapid focus/rest before release.

## Offline/runtime caveats
- All clips are included locally, no web fetch, loops, autoplay or permission request.
- Platform AudioCtor errors and rejected promises become silence; no emergency synthetic beep.
- Invalid, missing or corrupt assets never substitute sound. Preview does not alter session ledger.
- Ledger is intentionally bounded to 512 historical IDs to constrain v21 storage size. This covers common retries/restarts; durable exactly-once across unbounded session history requires coordinator session-event ownership.
- Without platform-policy integration, `canOutput` can only be used as a JS-injected gate. Physical DND, alert-channel suppression and notification permission handling remain **BLOCKED** until lane 00.
- Human listening/headphones and Android WebView tests are **NOT_TESTED**, not claimed PASS.
