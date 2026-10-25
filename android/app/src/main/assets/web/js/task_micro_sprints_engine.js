/**
 * DEEP FOCUS — Task Micro-Sprints & Breakdown Engine
 * Mission #084: Large task slicing, sprint queue state machine,
 * adaptive remainder balancing, and timer contract binding.
 */
(function (global) {
  'use strict';

  var DEFAULT_SPRINT_MINS = 20;
  var DEFAULT_BREAK_MINS = 5;

  /**
   * Slices total task minutes into balanced, sequential sprints.
   */
  function calculateSprints(totalMinutes, targetSprintMins) {
    var total = typeof totalMinutes === 'number' && totalMinutes > 0 ? Math.round(totalMinutes) : DEFAULT_SPRINT_MINS;
    var sprintSize = typeof targetSprintMins === 'number' && targetSprintMins >= 10 && targetSprintMins <= 45
      ? Math.round(targetSprintMins)
      : DEFAULT_SPRINT_MINS;

    if (total <= sprintSize) {
      return [total];
    }

    // Determine optimal count of balanced sprints
    var count = Math.max(1, Math.floor(total / sprintSize));
    var remainder = total % sprintSize;

    // If remainder is significant (>= 15 mins) and can form a full sprint, add a sprint;
    // Otherwise balance the remainder evenly across the existing sprints
    if (remainder >= 15 && Math.floor(total / (count + 1)) >= 15) {
      count += 1;
    }

    var base = Math.floor(total / count);
    var extra = total % count;
    var sprints = [];

    for (var i = 0; i < count; i++) {
      sprints.push(base + (i < extra ? 1 : 0));
    }

    return sprints;
  }

  /**
   * Initializes a sequential micro-sprint queue for a parent task.
   */
  function createSprintQueue(parentTask, sprintMins, breakMins) {
    if (!parentTask || typeof parentTask !== 'object') return null;

    var totalMins = typeof parentTask.estimatedMinutes === 'number' && parentTask.estimatedMinutes > 0
      ? parentTask.estimatedMinutes
      : 45;

    var sprintDurations = calculateSprints(totalMins, sprintMins);
    var breakDur = typeof breakMins === 'number' && breakMins > 0 ? breakMins : DEFAULT_BREAK_MINS;

    var sprints = [];
    for (var i = 0; i < sprintDurations.length; i++) {
      var num = i + 1;
      sprints.push({
        sprintIndex: i,
        sprintNumber: num,
        durationMinutes: sprintDurations[i],
        targetSeconds: sprintDurations[i] * 60,
        titleAr: "سبرنت \u200E" + num + " من \u200E" + sprintDurations.length + ": " + (parentTask.title || "التركيز"),
        titleEn: "Sprint \u200E" + num + " of \u200E" + sprintDurations.length + ": " + (parentTask.title || "Focus"),
        breakMinutesAfter: (i < sprintDurations.length - 1) ? breakDur : 0,
        completed: false
      });
    }

    return {
      queueId: "queue_" + Date.now(),
      parentTaskId: parentTask.id,
      parentTaskTitle: parentTask.title || "مهمة رئيسية",
      totalSprints: sprints.length,
      currentSprintIndex: 0,
      isComplete: false,
      sprints: sprints
    };
  }

  /**
   * Advances the sprint queue to the next sequential sprint.
   */
  function advanceSprintQueue(queue) {
    if (!queue || !Array.isArray(queue.sprints) || queue.sprints.length === 0) {
      return null;
    }
    var q = JSON.parse(JSON.stringify(queue));
    var curIdx = q.currentSprintIndex;

    if (curIdx < q.sprints.length) {
      q.sprints[curIdx].completed = true;
    }

    if (curIdx + 1 < q.sprints.length) {
      q.currentSprintIndex = curIdx + 1;
      q.isComplete = false;
    } else {
      q.isComplete = true;
    }

    return q;
  }

  /**
   * Generates timer payload for the active sprint in the queue.
   */
  function getActiveSprintTimerPayload(queue) {
    if (!queue || !Array.isArray(queue.sprints) || queue.isComplete) {
      return null;
    }
    var cur = queue.sprints[queue.currentSprintIndex];
    if (!cur) return null;

    return {
      action: "START_SPRINT_TIMER",
      parentTaskId: queue.parentTaskId,
      sprintNumber: cur.sprintNumber,
      totalSprints: queue.totalSprints,
      label: cur.titleAr,
      durationMinutes: cur.durationMinutes,
      targetSeconds: cur.targetSeconds,
      breakMinutesAfter: cur.breakMinutesAfter
    };
  }

  var engine = {
    calculateSprints: calculateSprints,
    createSprintQueue: createSprintQueue,
    advanceSprintQueue: advanceSprintQueue,
    getActiveSprintTimerPayload: getActiveSprintTimerPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.TaskMicroSprintsEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
