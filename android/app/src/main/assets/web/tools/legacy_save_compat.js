// --- Legacy Save & Bulk Tasks Compat ---
window.dfLegacySaveCompat = {
  migratePayload: function(payload) {
    if (!payload) return {};
    const res = Object.assign({}, payload);
    if (!res.version) res.version = '300.0.0';
    return res;
  }
};
