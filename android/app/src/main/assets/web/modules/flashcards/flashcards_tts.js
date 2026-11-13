/**
 * DEEP FOCUS — Flashcards pronunciation controller (JS side of the native Android TTS bridge).
 *
 * Talks ONLY to window.ZenNative.tts* (device text-to-speech engine, no network API). Voices, languages and
 * gender are whatever the engine reports; gender is "male" only when the engine says so explicitly, otherwise
 * "unknown". Pitch never pretends to change gender. Android TTS cannot pause/resume, so neither is offered.
 *
 * Repetition: N repetitions = N complete utterances, each started only after the previous 'done' event.
 * A failed or cancelled attempt is never counted as a completed repetition. A new speak() or stop() cancels
 * the old one (generation token), so stale events/utterances cannot continue after navigation or rapid taps.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DFFlashcardsTts = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parse(s) { try { return JSON.parse(s); } catch (_) { return { ok: false, code: 'BAD_NATIVE_REPLY' }; } }

  function create(opts) {
    opts = opts || {};
    var getBridge = opts.bridge || function () { return (typeof window !== 'undefined' && window.ZenNative) || null; };
    var timers = opts.timers || { set: setTimeout, clear: clearTimeout };
    var token = 0, ready = false, initPromise = null, waiter = null, currentEngine = '';

    function bridge() { var b = getBridge(); return b && typeof b.ttsInit === 'function' ? b : null; }
    function available() { return !!bridge(); }

    function call(name, a, b) {
      var br = bridge(); if (!br || typeof br[name] !== 'function') return { ok: false, code: 'NO_NATIVE_TTS', error: 'Text-to-speech is not available in this app build' };
      try { return parse(b === undefined ? (a === undefined ? br[name]() : br[name](a)) : br[name](a, b)); }
      catch (e) { return { ok: false, code: 'NATIVE_CALL_FAILED', error: 'Text-to-speech call failed' }; }
    }

    var initWaiters = [];
    function init(engine) {
      engine = engine || '';
      if (ready && engine === currentEngine) return Promise.resolve({ ok: true, engine: currentEngine });
      if (initPromise && engine === currentEngine) return initPromise;
      if (!available()) return Promise.resolve({ ok: false, code: 'NO_NATIVE_TTS', error: 'Text-to-speech is not available in this app build' });
      ready = false; currentEngine = engine;
      initPromise = new Promise(function (resolve) {
        var done = false, tm;
        function finish(r) { if (done) return; done = true; timers.clear(tm); initPromise = null; resolve(r); }
        initWaiters.push(finish);
        tm = timers.set(function () { finish({ ok: false, code: 'INIT_TIMEOUT', error: 'Text-to-speech did not start' }); }, opts.initTimeoutMs || 8000);
        var r = call('ttsInit', engine);
        if (!r.ok) finish(r);
        else if (r.status === 'ready') { ready = true; finish({ ok: true, engine: engine }); }
      });
      return initPromise;
    }

    // Native events: init/start/done/error/stopped. Unknown ids are ignored (stale).
    function onEvent(ev) {
      if (!ev || typeof ev !== 'object') return;
      if (ev.event === 'init') {
        ready = ev.ok === true;
        var ws = initWaiters.splice(0); ws.forEach(function (f) { f(ev.ok === true ? { ok: true, engine: ev.engine || currentEngine } : { ok: false, code: ev.code || 'INIT_FAILED', error: 'Text-to-speech could not start' }); });
        return;
      }
      if (waiter && ev.utteranceId === waiter.id) waiter.handle(ev);
    }

    // Preference order: confirmed male > higher quality > works offline. Unknown gender is never treated as male.
    function rankVoices(voices, o) {
      o = o || {};
      var list = (voices || []).filter(function (v) { return v && v.installed !== false && !(o.offlineOnly && v.networkRequired); });
      return list.slice().sort(function (a, b) {
        var ma = a.gender === 'male' ? 1 : 0, mb = b.gender === 'male' ? 1 : 0;
        if (o.preferMale !== false && ma !== mb) return mb - ma;
        if ((b.quality || 0) !== (a.quality || 0)) return (b.quality || 0) - (a.quality || 0);
        var oa = a.networkRequired ? 1 : 0, ob = b.networkRequired ? 1 : 0;
        if (oa !== ob) return oa - ob;
        return String(a.id).localeCompare(String(b.id));
      });
    }
    function discover(language, o) {
      o = o || {};
      return init(o.engine || currentEngine).then(function (r) {
        if (!r.ok) return { ok: false, code: r.code, error: r.error };
        var st = call('ttsLanguageStatus', language);
        if (!st.ok) return st;
        var vs = call('ttsGetVoices', language);
        if (!vs.ok) return vs;
        var ranked = rankVoices(vs.voices, o), male = ranked.filter(function (v) { return v.gender === 'male'; });
        var notInstalled = (vs.voices || []).filter(function (v) { return v.installed === false; }).length;
        return {
          ok: true, language: language, languageStatus: st.status, usable: st.usable,
          voices: ranked, maleConfirmed: male.length > 0,
          recommended: (o.preferMale !== false && male.length) ? male[0] : (ranked[0] || null),
          genderNote: male.length ? '' : 'The engine does not confirm any male voice for this language; gender is unknown.',
          needsVoiceData: !st.usable || (ranked.length === 0 && notInstalled > 0),
          installHint: (!st.usable || (ranked.length === 0 && notInstalled > 0)) ? 'Install or download this language\'s voice data in Android Settings > System > Languages > Text-to-speech output.' : ''
        };
      });
    }

    function stop() {
      token++;
      var w = waiter; waiter = null;
      call('ttsStop');
      if (w) w.cancel();
      return { ok: true };
    }

    // Resolves { ok, requested, completed, cancelled?, code? }.
    function speak(text, o) {
      o = o || {};
      var myToken = ++token, requested = Math.max(1, Math.min(9, Math.round(Number(o.repeat) || 1)));
      var prev = waiter; waiter = null; if (prev) prev.cancel();
      var rate = Number(o.rate); rate = isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1;
      var pitch = Number(o.pitch); pitch = isFinite(pitch) ? Math.min(2, Math.max(0.5, pitch)) : 1;
      if (typeof text !== 'string' || !text.trim()) return Promise.resolve({ ok: false, code: 'EMPTY_TEXT', requested: requested, completed: 0 });
      return init(o.engine || currentEngine).then(function (r) {
        if (myToken !== token) return { ok: true, cancelled: true, requested: requested, completed: 0 };
        if (!r.ok) return { ok: false, code: r.code, error: r.error, requested: requested, completed: 0 };
        var completed = 0;
        function one(i) {
          if (myToken !== token) return Promise.resolve({ ok: true, cancelled: true, requested: requested, completed: completed });
          var id = 'u' + myToken + '_' + i;
          return new Promise(function (resolve) {
            var finished = false, tm;
            function end(res) { if (finished) return; finished = true; timers.clear(tm); if (waiter && waiter.id === id) waiter = null; resolve(res); }
            waiter = {
              id: id,
              cancel: function () { end({ stop: true, cancelled: true }); },
              handle: function (ev) {
                if (ev.event === 'done') end({ done: true });
                else if (ev.event === 'error') end({ stop: true, code: ev.code || 'SYNTHESIS_ERROR' });
                else if (ev.event === 'stopped') end({ stop: true, cancelled: true });
              }
            };
            var maxMs = Math.max(8000, Math.round(text.length * 250 / rate) + 4000);
            tm = timers.set(function () { call('ttsStop'); end({ stop: true, code: 'TIMEOUT' }); }, o.timeoutMs || maxMs);
            var sr = call('ttsSpeak', text, JSON.stringify({ utteranceId: id, language: o.language || '', voiceId: o.voiceId || '', rate: rate, pitch: pitch, offlineOnly: o.offlineOnly === true }));
            if (!sr.ok) end({ stop: true, code: sr.code || 'SPEAK_FAILED', error: sr.error });
          }).then(function (res) {
            if (res.done) { completed++; if (i < requested) return one(i + 1); return { ok: true, requested: requested, completed: completed }; }
            if (res.cancelled) return { ok: true, cancelled: true, requested: requested, completed: completed };
            return { ok: false, code: res.code, error: res.error, requested: requested, completed: completed };
          });
        }
        return one(1);
      });
    }

    return { available: available, init: init, discover: discover, rankVoices: rankVoices, speak: speak, stop: stop, onEvent: onEvent,
      isReady: function () { return ready; }, shutdown: function () { stop(); ready = false; return call('ttsShutdown'); },
      engines: function () { return call('ttsGetEngines'); }, languages: function () { return call('ttsGetLanguages'); }, capabilities: function () { return call('ttsCapabilities'); } };
  }

  return { create: create };
}));
