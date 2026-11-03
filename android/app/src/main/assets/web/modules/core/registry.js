// --- Module Registry Engine ---
window.dfModuleRegistry = {
  modules: {},
  register: function(name, factory) {
    if (!name || typeof factory !== 'function') {
      return false;
    }
    this.modules[name] = {
      instance: null,
      factory: factory,
      initialized: false
    };
    return true;
  },
  get: function(name) {
    const m = this.modules[name];
    if (!m) return null;
    if (!m.initialized) {
      m.instance = m.factory();
      m.initialized = true;
    }
    return m.instance;
  }
};
