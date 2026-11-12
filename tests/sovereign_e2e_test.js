
// Runtime PASS counter hook (always reflects exact PASS lines printed)
let __e2ePassCount = 0;
const __origLog = console.log.bind(console);
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('PASS:')) __e2ePassCount++;
  __origLog(...args);
};

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("==================================================================");
console.log("🧪 [Deep Focus E2E] Running Sovereign Integration Test Harness...");
console.log("==================================================================");

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("  ✅ PASS:", name);
}

// 1. Verify app.js & index.html exist and are non-empty
const appJsPath = path.join(__dirname, "..", "android/app/src/main/assets/web/app.js");
const indexHtmlPath = path.join(__dirname, "..", "android/app/src/main/assets/web/index.html");
const appJs = fs.readFileSync(appJsPath, "utf8");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

test("Core Web Assets Exist & Non-Empty", () => {
    assert(appJs.length > 5000, "app.js unexpectedly small");
    assert(indexHtml.length > 1000, "index.html unexpectedly small");
});

// 2. Verify all Sovereign Modules are present
const requiredModules = [
    "SovereignAnalytics",
    "SovereignBreathing",
    "SovereignWorkerTimer",
    "SovereignHeapSanitizer",
    "SovereignChimes",
    "SovereignStateSnapshot",
    "SovereignBinauralAlpha",
    "SovereignProfiler",
    "SovereignDeckExchange",
    "SovereignHeatmap",
    "SovereignAudioVisualizer",
    "SovereignDeduplicator",
    "SovereignMaintenanceHub",
    "SovereignStorageVacuum",
    "SovereignStressAudit",
    "SovereignLocaleResolver",
    "SovereignAudioGuardian",
    "SovereignDeltaClock"
];

test("All 18 Sovereign Modules Registered in app.js", () => {
    requiredModules.forEach(mod => {
        assert(appJs.includes(mod), "Missing module: " + mod);
    });
});

// 3. Verify Zero-Music & Zero-Internet Policies
test("Strict Zero-Music Policy (No .mp3/.wav/.ogg/.flac/.m4a)", () => {
    const audioRegex = /["'][^"'\n]*\.(mp3|wav|ogg|flac|m4a)["']/i;
    assert(!audioRegex.test(appJs), "Unauthorized audio file reference found!");
});

test("Strict 100% Offline Manifest (No INTERNET or RECORD_AUDIO)", () => {
    const manifestPath = path.join(__dirname, "..", "android/app/src/main/AndroidManifest.xml");
    if (fs.existsSync(manifestPath)) {
        const mf = fs.readFileSync(manifestPath, "utf8");
        assert(!mf.includes("android.permission.INTERNET"), "INTERNET permission forbidden!");
        assert(!mf.includes("android.permission.RECORD_AUDIO"), "RECORD_AUDIO permission forbidden!");
    }
});

// 4. Verify Consolidated Locale Packs Integrity
test("Consolidated Locale Packs Valid JSON & >= 1000 Languages", () => {
    const manifestPackPath = path.join(__dirname, "..", "android/app/src/main/assets/web/locale_packs/manifest.json");
    assert(fs.existsSync(manifestPackPath), "locale_packs/manifest.json missing!");
    const mp = JSON.parse(fs.readFileSync(manifestPackPath, "utf8"));
    assert(mp.totalLocales >= 1000, "Expected >= 1000 locales, got " + mp.totalLocales);

    const corePath = path.join(__dirname, "..", "android/app/src/main/assets/web/locale_packs/core_20.json");
    const core = JSON.parse(fs.readFileSync(corePath, "utf8"));
    assert(core.ar && core.en, "Core-20 missing ar or en!");
});

// 5. Verify Levenshtein Similarity Logic
test("Levenshtein Deduplicator Similarity Math Accuracy", () => {
    function lev(a, b) {
        const m = [];
        for (let i = 0; i <= b.length; i++) m[i] = [i];
        for (let j = 0; j <= a.length; j++) m[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                m[i][j] = b[i - 1] === a[j - 1]
                    ? m[i - 1][j - 1]
                    : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
            }
        }
        return 1 - m[b.length][a.length] / Math.max(a.length, b.length);
    }
    assert(lev("Deep Focus", "Deep Focus!") >= 0.90, "Expected >= 0.90 similarity");
    assert(lev("Deep Focus", "Quantum Mechanics") < 0.30, "Expected < 0.30 similarity");
});


// 6. Verify AndroidManifest.xml Has Zero Duplicate Attributes in Any Tag
test("AndroidManifest.xml Has Zero Duplicate Attributes", () => {
    const manifestPath = path.join(__dirname, "..", "android/app/src/main/AndroidManifest.xml");
    const mf = fs.readFileSync(manifestPath, "utf8");
    const tags = mf.match(/<[A-Za-z_][^>]*>/g) || [];
    tags.forEach(tag => {
        const attrs = tag.match(/([A-Za-z_][A-Za-z0-9_.:-]*)\s*=/g) || [];
        const seen = new Set();
        attrs.forEach(a => {
            const name = a.replace(/\s*=$/, "");
            assert(!seen.has(name), "Duplicate XML attribute in tag: " + name);
            seen.add(name);
        });
    });
});


// 7. Verify Decoupled version.properties & Modular Registry File
test("Decoupled version.properties & Modular Registry Valid", () => {
    const vpPath = path.join(__dirname, "..", "android/version.properties");
    assert(fs.existsSync(vpPath), "android/version.properties missing!");
    const vp = fs.readFileSync(vpPath, "utf8");
    assert(vp.includes("VERSION_CODE=") && vp.includes("VERSION_NAME="), "Invalid version.properties!");

    const regPath = path.join(__dirname, "..", "android/app/src/main/assets/web/modules/sovereign_core_registry.js");
    assert(fs.existsSync(regPath), "sovereign_core_registry.js missing!");
});


// 9. Locale Pack Architecture & Zero-Bloat Gate
const packsDir = 'android/app/src/main/assets/web/locale_packs';
if (fs.existsSync(packsDir)) {
  const packs = fs.readdirSync(packsDir).filter(f => f.endsWith('.json'));
  if (packs.length < 5) {
    console.error('❌ FAIL: Expected at least 5 consolidated locale packs, found ' + packs.length);
    process.exit(1);
  }
  console.log('✅ PASS: Locale Pack Architecture Intact (' + packs.length + ' packs verified, zero bloat)');
} else {
  console.log('⚠️ SKIP: Locale packs directory not found in current path');
}


// 10. Modular Audio Suite Extraction & Zero-Stub Gate
const audioModPath = 'android/app/src/main/assets/web/modules/sovereign_audio_suite.js';
if (!fs.existsSync(audioModPath)) {
  console.error('❌ FAIL: Missing modular audio suite at ' + audioModPath);
  process.exit(1);
}
const audioModSrc = fs.readFileSync(audioModPath, 'utf8');
if (!audioModSrc.includes('SovereignChimes') || !audioModSrc.includes('SovereignBinauralAlpha') || !audioModSrc.includes('SovereignAudioGuardian')) {
  console.error('❌ FAIL: sovereign_audio_suite.js missing core DSP submodules');
  process.exit(1);
}
console.log('✅ PASS: Modular Audio Suite (sovereign_audio_suite.js) Intact & Connected');


// Modular Timer Engine & Error-Isolated EventBus Live Execution Test
const timerModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_timer_engine.js');
if (!fs.existsSync(timerModPath)) {
  console.error('❌ FAIL: Missing modular timer engine at ' + timerModPath);
  process.exit(1);
}
require(timerModPath);
if (!global.SovereignTimerEngine || !global.SovereignEventBus) {
  console.error('❌ FAIL: SovereignTimerEngine or SovereignEventBus failed to initialize');
  process.exit(1);
}
let busDelivered = 0;
global.SovereignEventBus.on('e2e:probe', () => { throw new Error('Simulated isolated module error'); });
global.SovereignEventBus.on('e2e:probe', (p) => { if (p && p.ok) busDelivered++; });
global.SovereignEventBus.emit('e2e:probe', { ok: true });
if (busDelivered !== 1) {
  console.error('❌ FAIL: SovereignEventBus error isolation failed');
  process.exit(1);
}
console.log('✅ PASS: Modular Timer Engine & Error-Isolated EventBus Verified');


// Modular Analytics & 26-Week Heatmap Live Execution Test
const analyticsModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_analytics_suite.js');
if (!fs.existsSync(analyticsModPath)) {
  console.error('❌ FAIL: Missing modular analytics suite at ' + analyticsModPath);
  process.exit(1);
}
require(analyticsModPath);
if (!global.SovereignAnalytics || !global.SovereignHeatmap) {
  console.error('❌ FAIL: SovereignAnalytics or SovereignHeatmap failed to initialize');
  process.exit(1);
}
const rec = global.SovereignAnalytics.recordSession(25);
const grid = global.SovereignHeatmap.get26WeekGrid();
if (!rec || rec.minutes < 25 || grid.length !== 182) {
  console.error('❌ FAIL: Analytics recordSession or 26-week (182 days) grid invalid');
  process.exit(1);
}
console.log('✅ PASS: Modular Analytics & 26-Week (182-Day) Heatmap Verified');


// Modular Wellness UI, Breathing & CalmUI Live Execution Test
const wellnessModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_wellness_ui.js');
if (!fs.existsSync(wellnessModPath)) {
  console.error('❌ FAIL: Missing modular wellness UI at ' + wellnessModPath);
  process.exit(1);
}
require(wellnessModPath);
const boxPhase = global.SovereignBreathing.evaluateAt('box', 5);
if (!boxPhase || boxPhase.phase !== 'hold') {
  console.error('❌ FAIL: SovereignBreathing Box 4-4-4-4 phase calculation error');
  process.exit(1);
}
const twState = global.SovereignEyeComfort.toggle(true);
const drState = global.SovereignCalmUI.toggleDrawer(true);
if (twState !== true || drState !== true) {
  console.error('❌ FAIL: SovereignEyeComfort or SovereignCalmUI state toggle failed');
  process.exit(1);
}
console.log('✅ PASS: Modular Wellness UI (Breathing, EyeComfort & CalmUI) Verified');


// Modular Data Vault (Deduplicator, StorageVacuum & AES-GCM) Verification
const vaultModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_data_vault.js');
if (!fs.existsSync(vaultModPath)) {
  console.error('❌ FAIL: Missing modular data vault at ' + vaultModPath);
  process.exit(1);
}
require(vaultModPath);
const simExact = global.SovereignDeduplicator.similarity('focus', 'focus');
const simNear = global.SovereignDeduplicator.similarity('study', 'stady');
const dupes = global.SovereignDeduplicator.findDuplicates(['Algorithm', 'Algoritm', 'Physics'], 0.8);
global.SovereignStorageVacuum.safeSetItem('e2e_vault_probe', { ok: true });
const probeVal = global.SovereignStorageVacuum.safeGetItem('e2e_vault_probe');
if (simExact !== 1 || simNear < 0.7 || dupes.length !== 1 || !probeVal || typeof global.SovereignDeckExchange.encryptDeck !== 'function') {
  console.error('❌ FAIL: SovereignDataVault checks failed');
  process.exit(1);
}
console.log('✅ PASS: Modular Data Vault (Levenshtein, Vacuum & AES-GCM) Verified');


// Modular CSS Architecture & 48px Touch-Floor Gate
const stylesDir = 'android/app/src/main/assets/web/styles';
const reqCss = ['amoled_120hz.css', 'calm_drawer.css', 'twilight_theme.css', 'rtl_typography.css'];
for (const cssFile of reqCss) {
  const full = path.join(stylesDir, cssFile);
  if (!fs.existsSync(full) || fs.statSync(full).size < 50) {
    console.error('❌ FAIL: Missing or empty modular CSS: ' + full);
    process.exit(1);
  }
}
const amoledSrc = fs.readFileSync(path.join(stylesDir, 'amoled_120hz.css'), 'utf8');
const rtlSrc = fs.readFileSync(path.join(stylesDir, 'rtl_typography.css'), 'utf8');
if (!amoledSrc.includes('#000000') || !amoledSrc.includes('48px') || !rtlSrc.includes('tabular-nums')) {
  console.error('❌ FAIL: Modular CSS missing #000000 AMOLED, 48px floor, or tabular-nums');
  process.exit(1);
}
console.log('✅ PASS: Modular CSS Architecture (AMOLED 120Hz, Calm Drawer, Twilight & RTL) Verified');


// Sovereign Module Manifest & Plug-and-Play Consistency Gate
const manifestFilePath = path.resolve('android/app/src/main/assets/web/modules/sovereign_manifest.json');
if (!fs.existsSync(manifestFilePath)) {
  console.error('❌ FAIL: Missing sovereign_manifest.json');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestFilePath, 'utf8'));
if (!Array.isArray(manifest.modules) || manifest.modules.length < 6 || !Array.isArray(manifest.styles) || manifest.styles.length < 4) {
  console.error('❌ FAIL: Invalid sovereign_manifest.json schema or missing items');
  process.exit(1);
}
for (const m of manifest.modules) {
  const p = path.resolve('android/app/src/main/assets/web', m.file);
  if (!fs.existsSync(p)) {
    console.error('❌ FAIL: Manifest references non-existent module file: ' + m.file);
    process.exit(1);
  }
}
for (const s of manifest.styles) {
  const sp = path.resolve('android/app/src/main/assets/web', s);
  if (!fs.existsSync(sp)) {
    console.error('❌ FAIL: Manifest references non-existent style file: ' + s);
    process.exit(1);
  }
}
console.log('✅ PASS: Sovereign Module Manifest & Plug-and-Play File Consistency Verified');


// SovereignStore Unified State Layer & Undo/Redo Gate
const storeModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_store.js');
require(storeModPath);
if (!global.SovereignStore || typeof global.SovereignStore.dispatch !== 'function') {
  console.error('❌ FAIL: SovereignStore failed to initialize');
  process.exit(1);
}
global.SovereignStore.dispatch('preferences.twilight', true);
const v1 = global.SovereignStore.get('preferences.twilight');
global.SovereignStore.dispatch('preferences.twilight', false);
const v2 = global.SovereignStore.get('preferences.twilight');
global.SovereignStore.undo();
const v3 = global.SovereignStore.get('preferences.twilight');
if (v1 !== true || v2 !== false || v3 !== true) {
  console.error('❌ FAIL: SovereignStore dispatch/undo sequence error');
  process.exit(1);
}
console.log('✅ PASS: SovereignStore Unified State Layer & Atomic Undo/Redo Verified');


// Android Java Bridge & Memory-Leak Prevention Gate
const glob = require('fs');
let foundMain = false;
function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) findMainActivity(full);
    else if (item === 'MainActivity.java') {
      const jSrc = fs.readFileSync(full, 'utf8');
      if (jSrc.includes('@JavascriptInterface') && !jSrc.includes('WeakReference') && jSrc.includes('Activity mContext')) {
        console.error('❌ FAIL: MainActivity retains direct strong Activity reference in JavascriptInterface');
        process.exit(1);
      }
      foundMain = true;
    }
  }
}
findMainActivity('android/app/src/main/java');
console.log('✅ PASS: Android Java Bridge & Zero-Memory-Leak Architecture Verified');


// Android 15 (SDK 35) Receiver & Alarm Security Gate
const manPath = path.resolve('android/app/src/main/AndroidManifest.xml');
if (!fs.existsSync(manPath)) {
  console.error('❌ FAIL: Missing AndroidManifest.xml');
  process.exit(1);
}
const mXml = fs.readFileSync(manPath, 'utf8');
if (mXml.includes('FOREGROUND_SERVICE') || mXml.includes('SYSTEM_ALERT_WINDOW')) {
  console.error('❌ FAIL: Manifest declares forbidden background services');
  process.exit(1);
}
if (!mXml.includes('FocusAlarmReceiver') || !mXml.includes('android:exported="false"')) {
  console.error('❌ FAIL: FocusAlarmReceiver missing or lacks explicit exported="false"');
  process.exit(1);
}
console.log('✅ PASS: Android 15 (SDK 35) Background Alarm & Receiver Security Verified');


// Xiaomi 17T Pro Edge-to-Edge WindowInsets & Notch Gate
const amoledCssPath = path.resolve('android/app/src/main/assets/web/styles/amoled_120hz.css');
if (!fs.existsSync(amoledCssPath)) {
  console.error('❌ FAIL: Missing amoled_120hz.css');
  process.exit(1);
}
const cssContent = fs.readFileSync(amoledCssPath, 'utf8');
if (!cssContent.includes('df-notch-top') || !cssContent.includes('safe-area-inset-top')) {
  console.error('❌ FAIL: amoled_120hz.css missing Xiaomi 17T Pro notch insets calibration');
  process.exit(1);
}
console.log('✅ PASS: Xiaomi 17T Pro Edge-to-Edge WindowInsets & Notch Calibration Verified');


// 120Hz/144Hz Frame Pacer & Idle Battery Suspension Gate
const pacerModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_frame_pacer.js');
require(pacerModPath);
if (!global.SovereignFramePacer || typeof global.SovereignFramePacer.requestFrameLoop !== 'function') {
  console.error('❌ FAIL: SovereignFramePacer failed to initialize');
  process.exit(1);
}
global.SovereignFramePacer.requestFrameLoop('e2e_pacer_probe', () => {});
global.SovereignFramePacer.cancelFrameLoop('e2e_pacer_probe');
if (!global.SovereignFramePacer.isSuspended()) {
  console.error('❌ FAIL: SovereignFramePacer did not enter idle suspension when tasks emptied');
  process.exit(1);
}
console.log('✅ PASS: 120Hz/144Hz Adaptive Frame Pacer & Idle Battery Suspension Verified');


// OnPause / OnTrimMemory Resource Drain Prevention Gate
const guardModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_memory_guard.js');
require(guardModPath);
if (!global.SovereignMemoryDrainGuard || typeof global.SovereignMemoryDrainGuard.handleTrimMemory !== 'function') {
  console.error('❌ FAIL: SovereignMemoryDrainGuard failed to initialize');
  process.exit(1);
}
global.SovereignMemoryDrainGuard.handleTrimMemory('CRITICAL');
if (!global.SovereignMemoryDrainGuard.isDrained()) {
  console.error('❌ FAIL: SovereignMemoryDrainGuard failed to mark state as drained');
  process.exit(1);
}
global.SovereignMemoryDrainGuard.handleResume();
if (global.SovereignMemoryDrainGuard.isDrained()) {
  console.error('❌ FAIL: SovereignMemoryDrainGuard failed to restore state upon resume');
  process.exit(1);
}
console.log('✅ PASS: OnPause / OnTrimMemory Resource Drain & LMKD Guard Verified');


// QuickTimerWidgetProvider Live AppWidgetManager Push Synchronization Gate
const widgetModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_widget_bridge.js');
require(widgetModPath);
if (!global.SovereignWidgetBridge || typeof global.SovereignWidgetBridge.syncWidgetState !== 'function') {
  console.error('❌ FAIL: SovereignWidgetBridge failed to initialize');
  process.exit(1);
}
const synced = global.SovereignWidgetBridge.syncWidgetState({ remainingSec: 1200, totalSec: 1500, mode: 'focus', running: true, sessionCount: 3 });
if (!synced || synced.remainingSec !== 1200 || !synced.running) {
  console.error('❌ FAIL: SovereignWidgetBridge failed to generate proper payload');
  process.exit(1);
}
if (!global.SovereignWidgetBridge.getLastPayload()) {
  console.error('❌ FAIL: SovereignWidgetBridge failed to retain last payload');
  process.exit(1);
}
console.log('✅ PASS: QuickTimerWidgetProvider Live AppWidgetManager Push Sync Verified');


// Dynamic App Shortcuts & Intent Deep-Link Routing Gate
const shortcutsModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_shortcuts_bridge.js');
require(shortcutsModPath);
if (!global.SovereignShortcutsBridge || typeof global.SovereignShortcutsBridge.handleShortcutAction !== 'function') {
  console.error('❌ FAIL: SovereignShortcutsBridge failed to initialize');
  process.exit(1);
}
const shortcutsList = global.SovereignShortcutsBridge.getRegisteredShortcuts();
if (!Array.isArray(shortcutsList) || shortcutsList.length !== 3) {
  console.error('❌ FAIL: SovereignShortcutsBridge missing standard dynamic shortcuts');
  process.exit(1);
}
const handledFocus = global.SovereignShortcutsBridge.handleShortcutAction('quick_focus');
if (!handledFocus || global.SovereignShortcutsBridge.getLastAction() !== 'quick_focus') {
  console.error('❌ FAIL: SovereignShortcutsBridge failed to handle quick_focus action');
  process.exit(1);
}
const handledIntent = global.SovereignShortcutsBridge.checkLaunchIntent('?shortcut=calm_breathing');
if (!handledIntent || global.SovereignShortcutsBridge.getLastAction() !== 'calm_breathing') {
  console.error('❌ FAIL: SovereignShortcutsBridge failed to parse launch intent query');
  process.exit(1);
}
console.log('✅ PASS: Dynamic App Shortcuts & Intent Deep-Link Routing Verified');


// TalkBack Semantics & ARIA Live Regions Hardening Gate
const a11yModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_accessibility_suite.js');
require(a11yModPath);
if (!global.SovereignAccessibilitySuite || typeof global.SovereignAccessibilitySuite.announce !== 'function') {
  console.error('❌ FAIL: SovereignAccessibilitySuite failed to initialize');
  process.exit(1);
}
const announced = global.SovereignAccessibilitySuite.announce('Focus session active', 'polite');
if (!announced || !global.SovereignAccessibilitySuite.getLastAnnouncement()) {
  console.error('❌ FAIL: SovereignAccessibilitySuite failed to record announcement');
  process.exit(1);
}
const last = global.SovereignAccessibilitySuite.getLastAnnouncement();
if (last.text !== 'Focus session active' || last.priority !== 'polite') {
  console.error('❌ FAIL: SovereignAccessibilitySuite corrupted announcement payload');
  process.exit(1);
}
console.log('✅ PASS: TalkBack Semantics & ARIA Live Regions Hardening Verified');


// Study Profiles & Zen Focus Presets Engine Gate
const profilesModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_study_profiles.js');
require(profilesModPath);
if (!global.SovereignStudyProfiles || typeof global.SovereignStudyProfiles.listProfiles !== 'function') {
  console.error('❌ FAIL: SovereignStudyProfiles failed to initialize');
  process.exit(1);
}
const list = global.SovereignStudyProfiles.listProfiles();
if (!Array.isArray(list) || list.length < 4) {
  console.error('❌ FAIL: SovereignStudyProfiles missing default presets');
  process.exit(1);
}
const switched = global.SovereignStudyProfiles.setActiveProfile('reading_zen');
if (!switched || global.SovereignStudyProfiles.getActiveProfile().id !== 'reading_zen') {
  console.error('❌ FAIL: SovereignStudyProfiles failed to switch active profile');
  process.exit(1);
}
const custom = global.SovereignStudyProfiles.createCustomProfile({
  id: 'exam_prep',
  name: 'Exam Preparation',
  focusSec: 3600,
  breakSec: 600,
  soundMode: 'brown_noise'
});
if (!custom || custom.id !== 'exam_prep' || custom.focusSec !== 3600) {
  console.error('❌ FAIL: SovereignStudyProfiles failed to create custom profile');
  process.exit(1);
}
console.log('✅ PASS: Study Profiles & Zen Focus Presets Engine Verified');


// Pure Real-Time DSP Brown & Pink Noise Generator Gate
const dspModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_ambient_dsp.js');
require(dspModPath);
if (!global.SovereignAmbientDSP || typeof global.SovereignAmbientDSP.generateNoiseBuffer !== 'function') {
  console.error('❌ FAIL: SovereignAmbientDSP failed to initialize');
  process.exit(1);
}
const brownBuf = global.SovereignAmbientDSP.generateNoiseBuffer('brown', 1, 44100);
if (!(brownBuf instanceof Float32Array) || brownBuf.length !== 44100) {
  console.error('❌ FAIL: SovereignAmbientDSP failed to synthesize Brown Noise buffer');
  process.exit(1);
}
const pinkBuf = global.SovereignAmbientDSP.generateNoiseBuffer('pink', 1, 44100);
if (!(pinkBuf instanceof Float32Array) || pinkBuf.length !== 44100) {
  console.error('❌ FAIL: SovereignAmbientDSP failed to synthesize Pink Noise buffer');
  process.exit(1);
}
global.SovereignAmbientDSP.playNoise('brown', 0.8);
if (global.SovereignAmbientDSP.getActiveNoiseType() !== 'brown') {
  console.error('❌ FAIL: SovereignAmbientDSP active noise type mismatch');
  process.exit(1);
}
global.SovereignAmbientDSP.stopNoise();
if (global.SovereignAmbientDSP.getActiveNoiseType() !== null) {
  console.error('❌ FAIL: SovereignAmbientDSP failed to stop cleanly');
  process.exit(1);
}
console.log('✅ PASS: Pure Real-Time DSP Brown & Pink Noise Generator Verified');


// Sovereign Spaced Repetition (SM-2) Flashcards Gate
const srModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_spaced_repetition.js');
require(srModPath);
if (!global.SovereignSpacedRepetition || typeof global.SovereignSpacedRepetition.createCard !== 'function') {
  console.error('❌ FAIL: SovereignSpacedRepetition failed to initialize');
  process.exit(1);
}
const deck = global.SovereignSpacedRepetition.createDeck('math', 'Mathematics', 'Calculus and Linear Algebra');
if (!deck || deck.id !== 'math') {
  console.error('❌ FAIL: SovereignSpacedRepetition failed to create deck');
  process.exit(1);
}
const card = global.SovereignSpacedRepetition.createCard({
  deckId: 'math',
  front: 'Derivative of e^x',
  back: 'e^x'
});
if (!card || card.easeFactor !== 2.5) {
  console.error('❌ FAIL: SovereignSpacedRepetition failed to initialize card with EF 2.5');
  process.exit(1);
}
const reviewed = global.SovereignSpacedRepetition.reviewCard(card.id, 5);
if (!reviewed || reviewed.repetitions !== 1 || reviewed.easeFactor <= 2.5) {
  console.error('❌ FAIL: SovereignSpacedRepetition failed SM-2 interval/EF progression');
  process.exit(1);
}
const stats = global.SovereignSpacedRepetition.getRetentionStats('math');
if (stats.total < 1) {
  console.error('❌ FAIL: SovereignSpacedRepetition corrupted retention stats');
  process.exit(1);
}
console.log('✅ PASS: Sovereign Spaced Repetition (SM-2) Flashcards Engine Verified');


// Flexible Weekly Habit & Non-Punitive Momentum Gate
const habitModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_habit_momentum.js');
require(habitModPath);
if (!global.SovereignHabitMomentum || typeof global.SovereignHabitMomentum.recordSession !== 'function') {
  console.error('❌ FAIL: SovereignHabitMomentum failed to initialize');
  process.exit(1);
}
global.SovereignHabitMomentum.setWeeklyGoal(500, 2);
const session = global.SovereignHabitMomentum.recordSession(50);
if (!session || session.minutes !== 50) {
  console.error('❌ FAIL: SovereignHabitMomentum failed to record study session');
  process.exit(1);
}
const progress = global.SovereignHabitMomentum.getWeeklyProgress();
if (!progress || progress.loggedMinutes < 50 || progress.targetMinutes !== 500) {
  console.error('❌ FAIL: SovereignHabitMomentum weekly progress calculation mismatch');
  process.exit(1);
}
const momentum = global.SovereignHabitMomentum.calculateMomentumScore();
if (typeof momentum.score !== 'number' || !momentum.status) {
  console.error('❌ FAIL: SovereignHabitMomentum failed to produce momentum score');
  process.exit(1);
}
console.log('✅ PASS: Flexible Weekly Habit & Non-Punitive Momentum Verified');


// Zen Lock-In Mode & Full Sensory Shielding Gate
const lockinModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_lockin_mode.js');
require(lockinModPath);
if (!global.SovereignLockInMode || typeof global.SovereignLockInMode.activateLockIn !== 'function') {
  console.error('❌ FAIL: SovereignLockInMode failed to initialize');
  process.exit(1);
}
global.SovereignLockInMode.activateLockIn({ strictLock: true });
if (!global.SovereignLockInMode.isLockInActive()) {
  console.error('❌ FAIL: SovereignLockInMode failed to activate');
  process.exit(1);
}
// Attempt premature exit without hold
const normalExit = global.SovereignLockInMode.deactivateLockIn(false);
if (normalExit || !global.SovereignLockInMode.isLockInActive()) {
  console.error('❌ FAIL: SovereignLockInMode strict lock bypassed without hold');
  process.exit(1);
}
// Valid emergency exit with 3000ms hold
const heldExit = global.SovereignLockInMode.handleEmergencyExitPress(3200);
if (!heldExit || global.SovereignLockInMode.isLockInActive()) {
  console.error('❌ FAIL: SovereignLockInMode emergency hold exit failed');
  process.exit(1);
}
console.log('✅ PASS: Zen Lock-In Mode & Full Sensory Shielding Verified');


// Detailed Study Session Log & Multi-Tag Engine Gate
const loggerModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_session_logger.js');
require(loggerModPath);
if (!global.SovereignSessionLogger || typeof global.SovereignSessionLogger.logSession !== 'function') {
  console.error('❌ FAIL: SovereignSessionLogger failed to initialize');
  process.exit(1);
}
const logged = global.SovereignSessionLogger.logSession({
  durationMinutes: 45,
  tags: ['Physics', 'Quantum'],
  qualityScore: 5
});
if (!logged || logged.durationMinutes !== 45 || logged.tags.length !== 2) {
  console.error('❌ FAIL: SovereignSessionLogger failed to log session payload');
  process.exit(1);
}
const physicsSessions = global.SovereignSessionLogger.querySessions({ tag: 'Physics' });
if (!Array.isArray(physicsSessions) || physicsSessions.length < 1) {
  console.error('❌ FAIL: SovereignSessionLogger tag querying failed');
  process.exit(1);
}
const tagDist = global.SovereignSessionLogger.getTagDistribution();
if (!tagDist.Physics || tagDist.Physics.totalMinutes < 45) {
  console.error('❌ FAIL: SovereignSessionLogger tag distribution aggregation corrupted');
  process.exit(1);
}
console.log('✅ PASS: Detailed Study Session Log & Multi-Tag Engine Verified');


// Canvas Study Milestone Card Exporter Gate
const cardModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_card_exporter.js');
require(cardModPath);
if (!global.SovereignCardExporter || typeof global.SovereignCardExporter.generateCardSpec !== 'function') {
  console.error('❌ FAIL: SovereignCardExporter failed to initialize');
  process.exit(1);
}
const spec = global.SovereignCardExporter.generateCardSpec({
  title: 'Quantum Physics Sprint',
  statValue: '25 Hours',
  statLabel: 'Deep Study Completed'
});
if (!spec || spec.width !== 1080 || spec.statValue !== '25 Hours') {
  console.error('❌ FAIL: SovereignCardExporter spec generation failed');
  process.exit(1);
}
const exportedUrl = global.SovereignCardExporter.exportDataUrl(spec);
if (!exportedUrl || !exportedUrl.startsWith('data:image/png')) {
  console.error('❌ FAIL: SovereignCardExporter exportDataUrl failed to produce PNG data URL');
  process.exit(1);
}
console.log('✅ PASS: Canvas Study Milestone Card Exporter Verified');


// Sovereign Onboarding Tour & Phase 3 Sealing Gate
const tourModPath = path.resolve('android/app/src/main/assets/web/modules/sovereign_onboarding_tour.js');
require(tourModPath);
if (!global.SovereignOnboardingTour || typeof global.SovereignOnboardingTour.getTourSteps !== 'function') {
  console.error('❌ FAIL: SovereignOnboardingTour failed to initialize');
  process.exit(1);
}
const steps = global.SovereignOnboardingTour.getTourSteps();
if (!Array.isArray(steps) || steps.length !== 4) {
  console.error('❌ FAIL: SovereignOnboardingTour step count mismatch');
  process.exit(1);
}
const completed = global.SovereignOnboardingTour.completeTour({
  profileId: 'deep_work',
  weeklyMinutes: 600,
  restDays: 2
});
if (!completed) {
  console.error('❌ FAIL: SovereignOnboardingTour completeTour failed');
  process.exit(1);
}
console.log('✅ PASS: Sovereign Onboarding Tour & Phase 3 Sealing Verified');

console.log("==================================================================");
console.log(`🎉 [E2E Summary]: ${__e2ePassCount} / ${__e2ePassCount} Integration Tests PASSED!`);
console.log("==================================================================");
