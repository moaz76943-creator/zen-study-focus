// --- Arabic RTL & Visual Suite Adapter ---
window.dfRtlVisualCompat = {
  applyRtl: function(element) {
    if (element && element.setAttribute) {
      element.setAttribute('dir', 'rtl');
    }
    return true;
  },
  validateAlignment: function(dir) {
    return dir === 'rtl' || dir === 'ltr';
  }
};
