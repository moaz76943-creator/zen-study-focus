// --- Modular State Machine ---
window.dfModularState = {
  defaults: {
    focusMin: 25,
    breakMin: 5,
    theme: 'monastic',
    activeTask: 'Deep Study'
  },
  load: function(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return this.defaults;
      const parsed = JSON.parse(raw);
      return parsed.data || this.defaults;
    } catch (e) {
      return this.defaults;
    }
  },
  save: function(key, val) {
    try {
      const payload = {
        data: val,
        ts: Date.now()
      };
      const d = JSON.stringify(payload);
      localStorage.setItem(key, d);
      return true;
    } catch (e) {
      return false;
    }
  }
};
