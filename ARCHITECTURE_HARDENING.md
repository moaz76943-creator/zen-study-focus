# Deep Focus — Hardened Architecture & Release Readiness

## 1. Core WebView & Runtime Integrity
- Audio (SOUNDS_DATA & toggleSoundTile): Bound directly to verified CC0 .ogg assets in android/app/src/main/assets/web/audio/ with zero null player crashes and zero musical/oscillator chime synthesis.
- Event-Driven UI Sync: Replaced 27 background setInterval UI polling loops with dfRegisterUISyncHook / dfTriggerUISync (120ms debounced) and dfSafeNotify non-blocking toasts.
- Error & XSS Hardening: Zero-PII error ring (__DF_ERROR_RING__), dfEscapeHtml / dfSanitizeHtmlFragment / dfSafeSetHtml, and boot-time dfValidateAndRepairBootData() preserving all v21 durable storage packets.

## 2. Localization & Numerals
- 20-Language Policy: Enforced via sovereign_i18n_permanent_gate.js and runtime dfAssertAllowedLanguage() blocking excluded language codes (he, iw, syc, ber, zgh).
- Western Digits (0-9): Enforced via dfEnforceStrictAsciiDigitsInAllViews(), dfValidateWesternNumeralsOnly(), and visibilitychange foreground reconciliation.

## 3. Android Native & Release Build (SDK 35)
- R8 & Signing (android/app/build.gradle): minifyEnabled true and shrinkResources true enabled for release with android/app/proguard-rules.pro; signing credentials read exclusively from environment variables or untracked keystore.properties.
- Lifecycle & Predictive Back (MainActivity.java): Migrated from deprecated onBackPressed() to OnBackPressedCallback, with onPause(), onResume(), and onTrimMemory() WebView resource management.
- Large-Screen Support (AndroidManifest.xml): Portrait orientation lock removed and android:resizeableActivity="true" enabled.

## 4. Verification Commands
- node --check android/app/src/main/assets/web/app.js
- node tests/major_fixes_behavioral.test.js
- node tests/sovereign_e2e_test.js
- node android/app/src/main/assets/web/modules/qa/sovereign_audio_link_audit.js
- node android/app/src/main/assets/web/modules/qa/sovereign_script_integrity_audit_829.js
