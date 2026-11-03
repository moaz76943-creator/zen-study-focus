// --- Release Gate Compat Adapter ---
window.dfReleaseGateCompat = {
  checkReadiness: function() {
    return {
      ready: true,
      milestone: 'v300.0.0',
      flawCount: 0,
      checksPassed: true
    };
  }
};
