// --- Version Test Compat Adapter ---
window.dfVersionCompat = {
  canonicalVersion: '300.0.0',
  canonicalCode: 30000,
  isCompatibleWith: function(requiredCode) {
    return this.canonicalCode >= (requiredCode || 0);
  }
};
