/**
 * DEEP FOCUS — Automated v21 Storage Health Monitor & Self-Healing Guard
 * Mission #052: Schema verification, null/undefined pruning,
 * missing ID auto-generation without data loss, and fortress audit.
 */
(function (global) {
  'use strict';

  function auditAndHealList(list, prefix) {
    if (!Array.isArray(list)) {
      return { list: [], repairedCount: 0, removedCorruptCount: 0 };
    }

    var healed = [];
    var repaired = 0;
    var removedCorrupt = 0;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item !== 'object') {
        removedCorrupt++;
        continue;
      }

      var clean = Object.assign({}, item);
      if (!clean.id || typeof clean.id !== 'string') {
        clean.id = (prefix || 'item_') + Date.now() + '_' + i;
        repaired++;
      }
      healed.push(clean);
    }

    return {
      list: healed,
      repairedCount: repaired,
      removedCorruptCount: removedCorrupt
    };
  }

  function evaluateFortressHealth(datasets) {
    datasets = datasets || {};
    var tasksAudit = auditAndHealList(datasets.tasks, 'task_');
    var notesAudit = auditAndHealList(datasets.notes, 'note_');
    var sessionsAudit = auditAndHealList(datasets.sessions, 'sess_');

    var totalIssues = tasksAudit.repairedCount + tasksAudit.removedCorruptCount +
                      notesAudit.repairedCount + notesAudit.removedCorruptCount +
                      sessionsAudit.repairedCount + sessionsAudit.removedCorruptCount;

    var status = totalIssues === 0 ? "HEALTHY" : "AUTO_REPAIRED";

    return {
      status: status,
      totalIssuesFound: totalIssues,
      healedDatasets: {
        tasks: tasksAudit.list,
        notes: notesAudit.list,
        sessions: sessionsAudit.list
      }
    };
  }

  var engine = {
    auditAndHealList: auditAndHealList,
    evaluateFortressHealth: evaluateFortressHealth
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.V21DataHealthMonitor = engine;
  }
})(typeof window !== 'undefined' ? window : this);
