/**
 * DEEP FOCUS — Monthly Focus Heatmap & Habit Consistency Engine
 * Mission #057: Leap-year safe monthly grids, 5-tier intensity levels,
 * streak tracking, pure SVG calendar heatmap, and Western digits.
 */
(function (global) {
  'use strict';

  var INTENSITY_COLORS = [
    "#EBEDF0", // Level 0: 0 mins
    "#C6E48B", // Level 1: 1 - 29 mins
    "#7BC96F", // Level 2: 30 - 59 mins
    "#239A3B", // Level 3: 60 - 119 mins
    "#196127"  // Level 4: 120+ mins
  ];

  /**
   * Calculates days in a given month safely (handles leap years).
   */
  function getDaysInMonth(year, month1Indexed) {
    var y = typeof year === 'number' ? year : 2026;
    var m = typeof month1Indexed === 'number' ? month1Indexed : 1;
    return new Date(y, m, 0).getDate();
  }

  /**
   * Maps session minutes to a 5-tier intensity level (0 to 4).
   */
  function getIntensityLevel(minutes) {
    var m = typeof minutes === 'number' && !isNaN(minutes) ? Math.max(0, minutes) : 0;
    if (m === 0) return 0;
    if (m < 30) return 1;
    if (m < 60) return 2;
    if (m < 120) return 3;
    return 4;
  }

  /**
   * Analyzes daily sessions for a target month and generates complete grid metrics.
   * @param {number} year - e.g. 2026
   * @param {number} month1Indexed - e.g. 10 (October)
   * @param {Array} sessions - Array of completed session objects.
   * @returns {Object} Comprehensive monthly habit metrics.
   */
  function generateMonthlyHeatmap(year, month1Indexed, sessions) {
    var y = typeof year === 'number' ? year : new Date().getFullYear();
    var m = typeof month1Indexed === 'number' ? month1Indexed : (new Date().getMonth() + 1);
    var list = Array.isArray(sessions) ? sessions : [];

    var daysCount = getDaysInMonth(y, m);
    var dailyMinutes = Object.create(null);

    // Aggregate minutes by YYYY-MM-DD
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || typeof s !== 'object') continue;

      var mins = Number(s.durationMinutes) || 0;
      if (mins <= 0) continue;

      var d = s.date || (s.timestamp ? new Date(s.timestamp).toISOString().split('T')[0] : '');
      if (d) {
        dailyMinutes[d] = (dailyMinutes[d] || 0) + mins;
      }
    }

    var grid = [];
    var activeDaysCount = 0;
    var currentStreak = 0;
    var maxStreak = 0;
    var totalMonthMinutes = 0;

    for (var day = 1; day <= daysCount; day++) {
      var dayStr = String(day).padStart(2, '0');
      var monthStr = String(m).padStart(2, '0');
      var dateKey = y + '-' + monthStr + '-' + dayStr;

      var dayDate = new Date(y, m - 1, day);
      var dayOfWeek = dayDate.getDay(); // 0 = Sunday, 6 = Saturday

      var dayMins = dailyMinutes[dateKey] || 0;
      totalMonthMinutes += dayMins;

      var level = getIntensityLevel(dayMins);
      if (level > 0) {
        activeDaysCount++;
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }

      grid.push({
        day: day,
        dateKey: dateKey,
        dayOfWeek: dayOfWeek,
        minutes: dayMins,
        intensityLevel: level,
        color: INTENSITY_COLORS[level]
      });
    }

    var consistencyPercentage = daysCount > 0 ? Math.round((activeDaysCount / daysCount) * 100) : 0;

    return {
      year: y,
      month: m,
      totalDays: daysCount,
      activeDaysCount: activeDaysCount,
      totalMinutes: totalMonthMinutes,
      totalHours: Math.round((totalMonthMinutes / 60) * 10) / 10,
      longestConsecutiveDays: maxStreak,
      consistencyPercentage: consistencyPercentage,
      daysGrid: grid
    };
  }

  /**
   * Renders lightweight responsive pure SVG heatmap for the month.
   */
  function renderSvgHeatmap(heatmapData, options) {
    options = options || {};
    var data = heatmapData || generateMonthlyHeatmap();
    var width = typeof options.width === 'number' && options.width >= 280 ? options.width : 320;
    var height = typeof options.height === 'number' && options.height >= 140 ? options.height : 160;

    var cellSize = 12;
    var cellGap = 3;
    var startX = 20;
    var startY = 25;

    var rects = '';
    for (var i = 0; i < data.daysGrid.length; i++) {
      var item = data.daysGrid[i];
      var weekCol = Math.floor((item.day - 1 + new Date(data.year, data.month - 1, 1).getDay()) / 7);
      var row = item.dayOfWeek;

      var x = startX + (weekCol * (cellSize + cellGap));
      var y = startY + (row * (cellSize + cellGap));

      rects += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" ' +
        'fill="' + item.color + '" rx="2" ry="2"><title>' + item.dateKey + ': \u200E' + item.minutes + 'm</title></rect>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
      'width="100%" height="auto" class="zen-heatmap-svg">' +
      '<text x="' + startX + '" y="16" fill="#444" font-size="12" font-weight="bold">\u200E' + data.year + '-' + String(data.month).padStart(2, '0') + '</text>' +
      rects +
      '</svg>';
  }

  var engine = {
    INTENSITY_COLORS: INTENSITY_COLORS,
    getDaysInMonth: getDaysInMonth,
    getIntensityLevel: getIntensityLevel,
    generateMonthlyHeatmap: generateMonthlyHeatmap,
    renderSvgHeatmap: renderSvgHeatmap
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.MonthlyFocusHeatmapEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
