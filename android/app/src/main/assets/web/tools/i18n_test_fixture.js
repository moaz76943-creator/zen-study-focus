// --- i18n Test Fixture Helper ---
window.dfEnsureTestLocales = function() {
  if (!window.df_i18n_locales) {
    window.df_i18n_locales = { en: {}, ar: {} };
  }
  if (!window.df_i18n_locales.en) {
    window.df_i18n_locales.en = {};
  }
  return true;
};
