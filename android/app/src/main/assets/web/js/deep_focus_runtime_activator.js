/**
 * DEEP FOCUS — runtime digit guard.
 * Keeps dates shown in `.date-display` in Western digits. Audio is owned by the
 * CC0 .ogg sound engines; this file no longer loads any audio.
 */
(function() {
  'use strict';

  function toWesternDigits(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
              .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  // Only touch a field when it actually contains Eastern digits; native date
  // inputs must never be rewritten (their value is always ISO / Western).
  function sanitizeDigits(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.date-display').forEach(function (el) {
      var t = el.textContent;
      if (t && /[\u0660-\u0669\u06F0-\u06F9]/.test(t)) el.textContent = toWesternDigits(t);
    });
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(function () { pending = false; sanitizeDigits(); });
  }

  document.addEventListener('DOMContentLoaded', sanitizeDigits);
  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
})();
