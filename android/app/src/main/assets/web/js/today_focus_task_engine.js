/**
 * DEEP FOCUS — Smart Today-Focus Task Filtering & Scheduling Engine
 * Mission #044: Daily task isolation, quiet overdue rollover,
 * priority hierarchy sorting, and timer payload generation.
 */
(function (global) {
  'use strict';

  function getLocalCivilDateString(dateObj) {
    var d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function computeTaskPriority(task, isOverdue) {
    var weight = 0;
    if (isOverdue) weight += 100;
    var p = String(task.priority || '').toLowerCase();
    if (p === 'high' || p === 'عالية') weight += 50;
    else if (p === 'medium' || p === 'متوسطة') weight += 20;
    else weight += 10;
    return weight;
  }

  function filterTodayTasks(tasks, options) {
    var list = Array.isArray(tasks) ? tasks : [];
    options = options || {};
    var todayStr = typeof options.referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(options.referenceDate)
      ? options.referenceDate
      : getLocalCivilDateString(options.referenceDate instanceof Date ? options.referenceDate : new Date());

    var includeCompleted = Boolean(options.includeCompleted);
    var filtered = [];

    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || typeof t !== 'object') continue;

      var isCompleted = Boolean(t.completed);
      if (!includeCompleted && isCompleted) continue;

      var dueDate = t.dueDate ? String(t.dueDate).split('T')[0] : null;
      var hasTodayTag = false;
      if (Array.isArray(t.tags)) {
        hasTodayTag = t.tags.some(function (tag) {
          return String(tag).toLowerCase() === 'today' || tag === 'اليوم' || tag === '#today';
        });
      }

      var isDueToday = dueDate === todayStr;
      var isOverdue = Boolean(dueDate && dueDate < todayStr && !isCompleted);

      if (isDueToday || isOverdue || hasTodayTag) {
        filtered.push({
          task: t,
          isOverdue: isOverdue,
          priorityWeight: computeTaskPriority(t, isOverdue)
        });
      }
    }

    filtered.sort(function (a, b) {
      if (b.priorityWeight !== a.priorityWeight) {
        return b.priorityWeight - a.priorityWeight;
      }
      return (b.task.id || '').localeCompare(a.task.id || '');
    });

    return filtered.map(function (item) {
      var output = Object.assign({}, item.task);
      output._isOverdue = item.isOverdue;
      output._isTodayFocus = true;
      return output;
    });
  }

  function createTimerLinkPayload(task, defaultMinutes) {
    if (!task || typeof task !== 'object') return null;
    var mins = typeof task.estimatedMinutes === 'number' && task.estimatedMinutes > 0
      ? task.estimatedMinutes
      : (typeof defaultMinutes === 'number' && defaultMinutes > 0 ? defaultMinutes : 25);

    return {
      action: "LINK_TASK_TIMER",
      taskId: task.id || ('temp_' + Date.now()),
      taskTitle: task.title || "مهمة اليوم",
      category: task.category || "دراسة",
      durationMinutes: mins,
      targetSeconds: mins * 60,
      timestamp: Date.now()
    };
  }

  var engine = {
    getLocalCivilDateString: getLocalCivilDateString,
    filterTodayTasks: filterTodayTasks,
    computeTaskPriority: computeTaskPriority,
    createTimerLinkPayload: createTimerLinkPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.TodayFocusTaskEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
