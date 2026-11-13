/**
 * DEEP FOCUS — storage write guard.
 *
 * Several boot-time engines re-save identical JSON many times (df_notes_v1 x9,
 * df_cards_v1 x8 ...). Writing an unchanged value is a logical no-op, but on a phone it
 * costs flash wear, startup time and risks a QuotaExceededError for nothing.
 * Skipping the write when the stored value is already identical is transparent: reads
 * return the same data and the browser never raises a `storage` event for same-value sets.
 */
(function (global) {
  'use strict';
  if (!global.Storage || !global.Storage.prototype) return;
  var proto = global.Storage.prototype;
  if (proto.__dfWriteGuard) return;
  var nativeSet = proto.setItem;
  var skipped = 0;
  Object.defineProperty(proto, '__dfWriteGuard', { value: true });
  proto.setItem = function (key, value) {
    try {
      var next = String(value);
      if (this.getItem(key) === next) { skipped++; return; }
    } catch (_) { /* fall through to the real write, which will report the real error */ }
    return nativeSet.apply(this, arguments);
  };
  global.DFStorageWriteGuard = Object.freeze({ skippedWrites: function () { return skipped; } });
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * Production logging policy: console.log is silenced (it costs CPU on a phone and can leak
 * user text into logcat). Enable for debugging with localStorage.setItem('df_debug','1').
 */
(function (global) {
  'use strict';
  try {
    if (!global.console || global.console.__dfQuiet) return;
    var on = false;
    try { on = global.localStorage && global.localStorage.getItem('df_debug') === '1'; } catch (_) { on = false; }
    if (on) return;
    global.console.log = function () {};
    Object.defineProperty(global.console, '__dfQuiet', { value: true });
  } catch (_) { /* logging policy must never break boot */ }
})(typeof window !== 'undefined' ? window : globalThis);
