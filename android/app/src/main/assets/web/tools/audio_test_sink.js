// --- Audio Test Sink Adapter ---
window.dfAudioTestSink = {
  isMocked: true,
  validateToneParams: function(freq, dur) {
    const f = freq || 440;
    const d = dur || 0.5;
    return f > 20 && f < 20000 && d > 0;
  }
};
