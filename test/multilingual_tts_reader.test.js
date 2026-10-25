const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/multilingual_tts_reader_engine.js');

console.log('--- Running 🎯 Mission #159: Multilingual TTS Reader Tests ---');

// Test 1: Speech Payload Preparation across Languages (Arabic & English)
{
  const arPayload = Engine.prepareSpeechPayload('ملاحظة دراسية هامة: قانون الديناميكا الأول.', 1.0, 'ar');
  assert.strictEqual(arPayload.valid, true);
  assert.strictEqual(arPayload.voiceLang, 'ar-SA');
  assert.strictEqual(arPayload.rate, 1.0);
  assert.strictEqual(arPayload.zeroMusicCertified, true);

  const enPayload = Engine.prepareSpeechPayload('Crucial Physics Note: Energy Conservation Law.', 1.25, 'en');
  assert.strictEqual(enPayload.valid, true);
  assert.strictEqual(enPayload.voiceLang, 'en-US');
  assert.strictEqual(enPayload.formattedRate, '1.25x');

  console.log('✓ Test 1: Speech payload preparation across languages verified.');
}

// Test 2: Voice Language Mapping & 100-Locale Fallback
{
  assert.strictEqual(Engine.resolveVoiceLang('ar'), 'ar-SA');
  assert.strictEqual(Engine.resolveVoiceLang('en'), 'en-US');
  assert.strictEqual(Engine.resolveVoiceLang('fr'), 'fr-FR');
  assert.strictEqual(Engine.resolveVoiceLang('de'), 'de-DE');
  assert.strictEqual(Engine.resolveVoiceLang('tr'), 'tr-TR');

  // Absolute Hebrew exclusion
  assert.strictEqual(Engine.resolveVoiceLang('he'), 'en-US');
  assert.strictEqual(Engine.resolveVoiceLang('iw'), 'en-US');

  console.log('✓ Test 2: Voice language resolution & Hebrew exclusion verified.');
}

// Test 3: Fault-Tolerant Execution in Headless / Node Environments
{
  let errorTriggered = false;
  const res = Engine.speakNoteOrTask(
    { text: 'Testing fallback', voiceLang: 'en-US', rate: 1.0 },
    {
      onError: function (err) {
        errorTriggered = true;
      }
    }
  );

  assert.strictEqual(res.success, false);
  assert.strictEqual(errorTriggered, true);

  console.log('✓ Test 3: Fault-tolerant execution and defensive error boundary verified.');
}

// Test 4: Comprehensive TTS Report Generation & Zero Music Guarantee
{
  const report = Engine.generateTTSReport('مفهوم التكامل بالتعويض', 0.75, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.faultTolerance.zeroMusicPolicyVerified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.voiceConfig.speedRate, '0.75x');
  assert.ok(report.voiceConfig.speedLabel.includes('متأنية'));

  console.log('✓ Test 4: Comprehensive TTS report generation verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('es'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('السرعة ١.٢٥x والمدة التقديرية ١٢s');
  assert.strictEqual(western, 'السرعة 1.25x والمدة التقديرية 12s');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #159 Tests PASSED (GREEN) ---');
