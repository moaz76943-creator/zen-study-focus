'use strict';
// Logic tests for the JS TTS controller against a FAKE bridge. They prove repetition/cancellation logic only;
// proof that the real Android engine speaks needs the emulator job (see docs/FLASHCARDS.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const T = require(path.resolve(__dirname, '../android/app/src/main/assets/web/modules/flashcards/flashcards_tts.js'));

function fake(opts = {}) {
  const log = [], voices = opts.voices || [];
  let ctl = null;
  const b = {
    log,
    ttsInit() { log.push(['init']); setImmediate(() => ctl.onEvent({ event: 'init', ok: opts.initOk !== false })); return JSON.stringify({ ok: true, status: 'initializing' }); },
    ttsLanguageStatus(l) { return JSON.stringify({ ok: true, language: l, status: opts.langStatus || 'language', usable: opts.usable !== false }); },
    ttsGetVoices() { return JSON.stringify({ ok: true, voices }); },
    ttsStop() { log.push(['stop']); return '{"ok":true}'; },
    ttsShutdown() { return '{"ok":true}'; },
    ttsSpeak(text, o) {
      o = JSON.parse(o); log.push(['speak', text, o]);
      if (opts.speakFail && opts.speakFail(o)) return JSON.stringify({ ok: false, code: 'LANGUAGE_UNAVAILABLE' });
      const mode = opts.mode || 'done';
      if (mode === 'done') setImmediate(() => ctl.onEvent({ event: 'done', utteranceId: o.utteranceId }));
      if (mode === 'error') setImmediate(() => ctl.onEvent({ event: 'error', utteranceId: o.utteranceId, code: 'ERROR_-4' }));
      return JSON.stringify({ ok: true, utteranceId: o.utteranceId });
    },
  };
  ctl = T.create({ bridge: () => b });
  return { b, ctl };
}

test('repeat N speaks exactly N complete utterances, one at a time', async () => {
  for (const n of [1, 2, 5, 9]) {
    const { b, ctl } = fake();
    const r = await ctl.speak('Haus', { language: 'de-DE', repeat: n, rate: 0.8, pitch: 1.1 });
    assert.deepEqual([r.ok, r.requested, r.completed], [true, n, n]);
    const speaks = b.log.filter((x) => x[0] === 'speak');
    assert.equal(speaks.length, n);
    assert.equal(new Set(speaks.map((s) => s[2].utteranceId)).size, n);
    assert.equal(speaks[0][2].rate, 0.8); assert.equal(speaks[0][2].pitch, 1.1); assert.equal(speaks[0][2].language, 'de-DE');
  }
  const { ctl } = fake();
  assert.equal((await ctl.speak('x', { repeat: 99 })).requested, 9);
});

test('failed attempt is not counted and stops the sequence', async () => {
  const { ctl } = fake({ mode: 'error' });
  const r = await ctl.speak('Haus', { repeat: 5 });
  assert.equal(r.ok, false); assert.equal(r.completed, 0); assert.equal(r.code, 'ERROR_-4');
  const { ctl: c2 } = fake({ speakFail: () => true });
  const r2 = await c2.speak('Haus', { language: 'zz', repeat: 3 });
  assert.equal(r2.code, 'LANGUAGE_UNAVAILABLE'); assert.equal(r2.completed, 0);
});

test('init failure is reported, not hidden', async () => {
  const { ctl } = fake({ initOk: false });
  const r = await ctl.speak('x', {});
  assert.equal(r.ok, false); assert.equal(r.completed, 0);
});

test('stop and rapid new speak cancel the old sequence; stale events ignored', async () => {
  const { b, ctl } = fake({ mode: 'manual' });
  const p1 = ctl.speak('eins', { repeat: 5 });
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  const first = b.log.filter((x) => x[0] === 'speak')[0][2].utteranceId;
  const p2 = ctl.speak('zwei', { repeat: 2 });
  assert.equal((await p1).cancelled, true);
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  ctl.onEvent({ event: 'done', utteranceId: first }); // stale: must not advance anything
  const speaks = b.log.filter((x) => x[0] === 'speak');
  assert.equal(speaks.length, 2, 'only one new utterance is active, no overlap');
  ctl.stop();
  const r2 = await p2; assert.equal(r2.cancelled, true); assert.equal(r2.completed, 0);
  assert.equal(b.log.filter((x) => x[0] === 'speak').length, 2, 'nothing speaks after stop');
});

test('voice ranking: confirmed male first, unknown never promoted, offline-only filter', () => {
  const { ctl } = fake();
  const v = [
    { id: 'a', gender: 'unknown', quality: 500, networkRequired: false, installed: true },
    { id: 'b', gender: 'male', quality: 300, networkRequired: true, installed: true },
    { id: 'c', gender: 'male', quality: 400, networkRequired: false, installed: true },
    { id: 'd', gender: 'female', quality: 500, networkRequired: false, installed: true },
    { id: 'e', gender: 'male', quality: 500, networkRequired: false, installed: false },
  ];
  assert.deepEqual(ctl.rankVoices(v).map((x) => x.id), ['c', 'b', 'a', 'd']);
  assert.deepEqual(ctl.rankVoices(v, { offlineOnly: true }).map((x) => x.id), ['c', 'a', 'd']);
  assert.deepEqual(ctl.rankVoices(v, { preferMale: false }).map((x) => x.id), ['a', 'd', 'c', 'b']);
});

test('discover reports unknown gender honestly and missing voice data', async () => {
  const f = fake({ voices: [{ id: 'x', gender: 'unknown', quality: 400, networkRequired: false, installed: true }] });
  const d = await f.ctl.discover('de-DE');
  assert.equal(d.maleConfirmed, false); assert.ok(d.genderNote); assert.equal(d.recommended.id, 'x');
  const g = fake({ voices: [], usable: false, langStatus: 'missing-data' });
  const d2 = await g.ctl.discover('ar');
  assert.equal(d2.needsVoiceData, true); assert.ok(d2.installHint); assert.equal(d2.recommended, null);
});

test('no native bridge: honest error, no throw', async () => {
  const ctl = T.create({ bridge: () => null });
  assert.equal(ctl.available(), false);
  const r = await ctl.speak('x', {}); assert.equal(r.code, 'NO_NATIVE_TTS');
});
