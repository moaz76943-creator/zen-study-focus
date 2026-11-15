(function () {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && !navigator.__ZEN_VIBRATE_GUARDED__) {
    var origVibrate = navigator.vibrate.bind(navigator);
    navigator.vibrate = function (pattern) {
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
      try { return origVibrate(pattern); } catch (_) { return false; }
    };
    navigator.__ZEN_VIBRATE_GUARDED__ = true;
  }
})();
