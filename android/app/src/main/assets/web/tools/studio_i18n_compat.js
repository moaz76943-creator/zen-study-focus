// --- Studio i18n Compat Adapter ---
window.dfStudioI18nCompat = {
  tokens: {
    analytics_title: 'Study Analytics',
    tasks_title: 'Focus Tasks',
    notes_title: 'Study Notes'
  },
  getToken: function(key) {
    return this.tokens[key] || key;
  }
};
