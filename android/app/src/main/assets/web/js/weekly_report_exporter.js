/**
 * DEEP FOCUS — Weekly Focus Report Exporter Engine
 * Mission #043: Markdown & JSON export, table escaping,
 * ZEN21::REPORT envelope, RTL/Arabic support, Western digits invariant.
 */
(function (global) {
  'use strict';

  /**
   * Escapes Markdown table special characters (| and newlines).
   */
  function escapeMarkdownCell(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  }

  /**
   * Formats numbers to Western digits with LTR isolation mark.
   */
  function formatDigits(num) {
    var val = (typeof num === 'number' && !isNaN(num)) ? num : 0;
    return '\u200E' + val;
  }

  /**
   * Aggregates weekly metrics from raw session and task data.
   */
  function aggregateWeeklyMetrics(sessions, tasks) {
    var sList = Array.isArray(sessions) ? sessions : [];
    var tList = Array.isArray(tasks) ? tasks : [];

    var totalMinutes = 0;
    var dayDistribution = {};
    var categoryTotals = {};
    var ratingsSum = 0;
    var ratedSessionsCount = 0;

    for (var i = 0; i < sList.length; i++) {
      var s = sList[i];
      if (!s) continue;
      var mins = Math.max(0, Number(s.durationMinutes) || 0);
      totalMinutes += mins;

      var dateKey = s.date || (s.timestamp ? new Date(s.timestamp).toISOString().split('T')[0] : 'Unknown');
      dayDistribution[dateKey] = (dayDistribution[dateKey] || 0) + mins;

      var cat = s.category || 'عام';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;

      if (s.reflection && typeof s.reflection.rating === 'number') {
        ratingsSum += s.reflection.rating;
        ratedSessionsCount++;
      }
    }

    var completedTasks = tList.filter(function (t) { return t && t.completed; });

    return {
      totalMinutes: totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      sessionsCount: sList.length,
      dayDistribution: dayDistribution,
      categoryTotals: categoryTotals,
      completedTasksCount: completedTasks.length,
      completedTasks: completedTasks,
      avgRating: ratedSessionsCount > 0 ? (Math.round((ratingsSum / ratedSessionsCount) * 10) / 10) : null
    };
  }

  /**
   * Exports weekly data into beautifully formatted Markdown.
   */
  function exportToMarkdown(sessions, tasks, options) {
    options = options || {};
    var isRtl = options.locale === 'ar' || options.isRtl !== false;
    var weekLabel = options.weekLabel || 'الأسبوع الحالي';
    var metrics = aggregateWeeklyMetrics(sessions, tasks);

    var md = '';
    if (isRtl) {
      md += '# 📊 تقرير التركيز الأسبوعي — DEEP FOCUS\n\n';
      md += '**الفترة:** ' + escapeMarkdownCell(weekLabel) + '\n';
      md += '**إجمالي وقت التركيز:** ' + formatDigits(metrics.totalHours) + ' ساعة (' + formatDigits(metrics.totalMinutes) + ' دقيقة)\n';
      md += '**عدد الجلسات المكتملة:** ' + formatDigits(metrics.sessionsCount) + '\n';
      md += '**المهام المنجزة:** ' + formatDigits(metrics.completedTasksCount) + '\n';
      if (metrics.avgRating) {
        md += '**متوسط جودة التركيز:** ' + formatDigits(metrics.avgRating) + ' / 5\n';
      }
      md += '\n## 📅 توزيع التركيز اليومي\n\n';
      md += '| التاريخ | الدقائق |\n| :--- | :--- |\n';
      for (var d in metrics.dayDistribution) {
        md += '| ' + escapeMarkdownCell(d) + ' | ' + formatDigits(metrics.dayDistribution[d]) + ' دقيقة |\n';
      }

      if (metrics.completedTasks.length > 0) {
        md += '\n## ✅ المهام المنجزة خلال الأسبوع\n\n';
        for (var t = 0; t < metrics.completedTasks.length; t++) {
          md += '- [x] ' + escapeMarkdownCell(metrics.completedTasks[t].title || 'مهمة بدون عنوان') + '\n';
        }
      }
    } else {
      md += '# 📊 Weekly Focus Report — DEEP FOCUS\n\n';
      md += '**Period:** ' + escapeMarkdownCell(weekLabel) + '\n';
      md += '**Total Focus Time:** ' + formatDigits(metrics.totalHours) + ' hrs (' + formatDigits(metrics.totalMinutes) + ' mins)\n';
      md += '**Completed Sessions:** ' + formatDigits(metrics.sessionsCount) + '\n';
      md += '**Tasks Accomplished:** ' + formatDigits(metrics.completedTasksCount) + '\n';
      if (metrics.avgRating) {
        md += '**Average Focus Quality:** ' + formatDigits(metrics.avgRating) + ' / 5\n';
      }
      md += '\n## 📅 Daily Distribution\n\n';
      md += '| Date | Minutes |\n| :--- | :--- |\n';
      for (var day in metrics.dayDistribution) {
        md += '| ' + escapeMarkdownCell(day) + ' | ' + formatDigits(metrics.dayDistribution[day]) + ' mins |\n';
      }

      if (metrics.completedTasks.length > 0) {
        md += '\n## ✅ Completed Tasks\n\n';
        for (var j = 0; j < metrics.completedTasks.length; j++) {
          md += '- [x] ' + escapeMarkdownCell(metrics.completedTasks[j].title || 'Untitled Task') + '\n';
        }
      }
    }

    return md;
  }

  /**
   * Exports weekly data into structured JSON with ZEN21::REPORT envelope.
   */
  function exportToJson(sessions, tasks, options) {
    options = options || {};
    var metrics = aggregateWeeklyMetrics(sessions, tasks);
    return {
      marker: "ZEN21::REPORT",
      version: 21,
      exportedAt: new Date().toISOString(),
      weekLabel: options.weekLabel || 'Current Week',
      metrics: metrics,
      rawSessionsCount: Array.isArray(sessions) ? sessions.length : 0
    };
  }

  var engine = {
    escapeMarkdownCell: escapeMarkdownCell,
    formatDigits: formatDigits,
    aggregateWeeklyMetrics: aggregateWeeklyMetrics,
    exportToMarkdown: exportToMarkdown,
    exportToJson: exportToJson
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.WeeklyReportExporter = engine;
  }
})(typeof window !== 'undefined' ? window : this);
