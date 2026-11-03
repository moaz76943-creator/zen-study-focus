// --- Branding & Package ID Compat ---
window.dfBrandingCompat = {
  packageId: 'moaz76943.zenstudyfocus',
  appName: 'DEEP FOCUS',
  validatePackage: function(pkg) {
    if (!pkg) return false;
    return pkg.includes('zenstudyfocus') ||
      pkg.includes('zen-study-focus');
  }
};
