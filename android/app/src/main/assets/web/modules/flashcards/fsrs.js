// --- Modular FSRS-4.5 Subsystem ---
(function() {
  if (typeof window === 'undefined') return;
  const fsrsModule = {
    computeInterval: function(stability, retention) {
      const s = Math.max(0.1, stability || 1.0);
      const r = retention || 0.9;
      const factor = (9 * (1 / r - 1));
      return Math.max(1, Math.round(s * factor));
    },
    calculateRetention: function(days, stability) {
      const s = Math.max(0.1, stability || 1.0);
      const t = Math.max(0, days || 0);
      return Math.pow(1 + 0.1 * t / s, -1);
    },
    parseCloze: function(text) {
      if (!text) return { template: '', answers: [] };
      const answers = [];
      let idx = 0;
      const r = /\\{\\{([^}]+)\\}\\}/g;
      const masked = text.replace(r, function(m, a) {
        idx++;
        answers.push(a.trim());
        return '[' + idx + ']';
      });
      return { template: masked, answers: answers };
    }
  };
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('flashcards', function() {
      return fsrsModule;
    });
  }
})();
