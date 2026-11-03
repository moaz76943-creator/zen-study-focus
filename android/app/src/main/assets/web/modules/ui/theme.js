// --- Modular UI & Theme Subsystem ---
(function() {
  if (typeof window === 'undefined') return;
  const themeModule = {
    currentTheme: 'oled',
    applyTheme: function(themeName) {
      this.currentTheme = themeName || 'oled';
      if (typeof document === 'undefined') return;
      if (this.currentTheme === 'oled') {
        const sel = [
          'body', '.main-white-sheet',
          '.focus-hero-card', '.pure-white-card',
          '.card', '[class*="bg-white"]'
        ];
        sel.forEach(function(s) {
          const list = document.querySelectorAll(s);
          for (let i = 0; i < list.length; i++) {
            list[i].style.backgroundColor = '#000';
            list[i].style.color = '#e0e0e0';
          }
        });
      }
    }
  };
  const reg = window.dfModuleRegistry;
  if (reg) {
    reg.register('ui', function() {
      return themeModule;
    });
  }
})();
