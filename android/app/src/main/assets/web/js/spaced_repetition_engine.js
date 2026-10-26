/**
 * DEEP FOCUS — Spaced Repetition Study Engine
 * Mission #082: 4-tier Leitner box ladder (1d, 3d, 7d, 14d),
 * memory curve promotion, feedback rating, and Today task generation.
 */
(function (global) {
  'use strict';

  var INTERVAL_DAYS = {
    1: 1,   // Box 1: Next day
    2: 3,   // Box 2: 3 days later
    3: 7,   // Box 3: 7 days later
    4: 14   // Box 4: 14 days later
  };

  /**
   * Adds N days to a base date and returns YYYY-MM-DD string.
   */
  function addDaysCivil(baseDate, daysToAdd) {
    var d = baseDate instanceof Date && !isNaN(baseDate.getTime()) ? new Date(baseDate) : new Date();
    d.setDate(d.getDate() + daysToAdd);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /**
   * Registers a new study topic into Box 1.
   */
  function registerStudyTopic(topicTitle, category, startDate) {
    var title = String(topicTitle || '').trim();
    var start = startDate instanceof Date ? startDate : new Date();
    return {
      id: "sr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: title || "موضوع مراجعة جديد",
      category: category || "دراسة",
      box: 1,
      reviewCount: 0,
      nextReviewDate: addDaysCivil(start, INTERVAL_DAYS[1]),
      isMastered: false,
      lastReviewedAt: null
    };
  }

  /**
   * Processes student recall feedback ('easy', 'hard', 'forgot').
   */
  function evaluateRecallFeedback(topicItem, recallRating, reviewDate) {
    if (!topicItem || typeof topicItem !== 'object') return null;
    var item = Object.assign({}, topicItem);
    var rating = String(recallRating || 'easy').toLowerCase();
    var now = reviewDate instanceof Date && !isNaN(reviewDate.getTime()) ? reviewDate : new Date();

    item.reviewCount = (item.reviewCount || 0) + 1;
    item.lastReviewedAt = now.toISOString();

    if (rating === 'easy') {
      if (item.box < 4) {
        item.box += 1;
        item.nextReviewDate = addDaysCivil(now, INTERVAL_DAYS[item.box]);
      } else {
        item.isMastered = true;
        item.nextReviewDate = null;
      }
    } else if (rating === 'hard') {
      // Retain current box, reschedule after current interval
      item.nextReviewDate = addDaysCivil(now, INTERVAL_DAYS[item.box] || 1);
    } else {
      // 'forgot': reset back to box 1
      item.box = 1;
      item.isMastered = false;
      item.nextReviewDate = addDaysCivil(now, INTERVAL_DAYS[1]);
    }

    return item;
  }

  /**
   * Filters topics that are due for review today or earlier.
   */
  function filterDueReviewTopics(topicsList, todayCivilDateStr) {
    var list = Array.isArray(topicsList) ? topicsList : [];
    var todayStr = String(todayCivilDateStr || '').split('T')[0] || addDaysCivil(new Date(), 0);

    return list.filter(function (item) {
      if (!item || item.isMastered || !item.nextReviewDate) return false;
      return item.nextReviewDate <= todayStr;
    });
  }

  /**
   * Creates an actionable Today Task object compatible with today_focus_task_engine.js.
   */
  function generateReviewTaskPayload(topicItem) {
    if (!topicItem || typeof topicItem !== 'object') return null;
    return {
      id: "task_sr_" + topicItem.id,
      title: "مراجعة متباعدة: " + topicItem.title + " (صندوق \u200E" + topicItem.box + ")",
      category: topicItem.category || "دراسة",
      dueDate: topicItem.nextReviewDate,
      priority: topicItem.box === 1 ? "high" : "normal",
      tags: ["#spaced_review", topicItem.category || "مراجعة"],
      estimatedMinutes: 20
    };
  }

  var engine = {
    INTERVAL_DAYS: INTERVAL_DAYS,
    addDaysCivil: addDaysCivil,
    registerStudyTopic: registerStudyTopic,
    evaluateRecallFeedback: evaluateRecallFeedback,
    filterDueReviewTopics: filterDueReviewTopics,
    generateReviewTaskPayload: generateReviewTaskPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.SpacedRepetitionEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
