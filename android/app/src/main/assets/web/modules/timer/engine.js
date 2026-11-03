// --- Modular Timer Engine Subsystem ---
(function() {
  if (typeof window === 'undefined') return;
  const timerModule = {
    isRunning: false,
    durationSec: 1500,
    remainingSec: 1500,
    intervalId: null,
    start: function(onTick, onComplete) {
      if (this.isRunning) return;
      this.isRunning = true;
      const self = this;
      this.intervalId = setInterval(function() {
        if (self.remainingSec > 0) {
          self.remainingSec--;
          if (typeof onTick === 'function') {
            onTick(self.remainingSec);
          }
        } else {
          self.stop();
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }
      }, 1000);
    },
    stop: function() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },
    reset: function(seconds) {
      this.stop();
      this.durationSec = seconds || 1500;
      this.remainingSec = this.durationSec;
    }
  };
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('timer', function() {
      return timerModule;
    });
  }
})();
