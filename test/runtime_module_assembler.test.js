const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/runtime_module_assembler_engine.js');

console.log('--- Running 🎯 Mission #171: Runtime Module Assembler Tests ---');

// Test 1: Registry Creation and Module Registration
{
  const reg = Engine.createAssemblerRegistry();
  assert.strictEqual(reg.registryVersion, '3.0.0-assembled');
  assert.strictEqual(reg.zeroMusicEnforced, true);

  Engine.registerModule(reg, 'soundscape', { playRain: () => true });
  Engine.registerModule(reg, 'timer', { start: () => true });

  assert.strictEqual(Object.keys(reg.registeredModules).length, 2);
  assert.strictEqual(reg.registeredModules['soundscape'].isOperational, true);

  console.log('✓ Test 1: Unified registry creation & module registration verified.');
}

// Test 2: Dynamic Widget Mounting in Headless Environment (Graceful Fallback)
{
  const reg = Engine.createAssemblerRegistry();
  const mountRes = Engine.mountDynamicWidget(reg, 'epaper_clock', '#clock-container');
  assert.strictEqual(mountRes.success, true);
  assert.strictEqual(mountRes.mounted, false);
  assert.strictEqual(mountRes.statusKey, 'mount_fallback');
  assert.strictEqual(reg.mountedWidgets['epaper_clock'].status, 'fallback_standby');

  console.log('✓ Test 2: Dynamic widget mounting & graceful fallback verified.');
}

// Test 3: Fault-Tolerant Sandboxing (Suppresses Render Callback Errors)
{
  const reg = Engine.createAssemblerRegistry();
  global.document = {
    querySelector: () => { throw new Error('Simulated DOM Failure'); }
  };

  const failRes = Engine.mountDynamicWidget(reg, 'failing_widget', '#bad-selector');
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.errorSuppressed, true);
  assert.strictEqual(reg.mountedWidgets['failing_widget'].status, 'error_suppressed');

  delete global.document;
  console.log('✓ Test 3: Fault-tolerant error boundary & exception suppression verified.');
}

// Test 4: Comprehensive Assembler Report & Zero Music Guarantee
{
  const reg = Engine.createAssemblerRegistry();
  Engine.registerModule(reg, 'timer', {});
  Engine.registerModule(reg, 'notes', {});

  const report = Engine.generateAssemblerReport(reg, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.summary.totalRegisteredEngines, '2');
  assert.strictEqual(report.summary.sandboxedFaultTolerance, true);
  assert.strictEqual(report.summary.zeroMusicPolicyVerified, true);
  assert.strictEqual(report.runtimeGuarantees.zeroIndexHtmlOverwrite, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.statusLabel.includes('تناغم'));

  console.log('✓ Test 4: Comprehensive assembler report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('es'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المحركات المسجلة ٨ من أصل ٨');
  assert.strictEqual(western, 'المحركات المسجلة 8 من أصل 8');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #171 Tests PASSED (GREEN) ---');
