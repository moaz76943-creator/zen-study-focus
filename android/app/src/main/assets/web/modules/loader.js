// --- Modular System Loader ---
(function() {
  if (typeof window === 'undefined') return;
  window.DF_MODULAR = {
    version: '300.6.0',
    ready: true,
    modules: ['core/registry', 'core/state']
  };
  console.log('DF_MODULAR architecture online.');
})();
