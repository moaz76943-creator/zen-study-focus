/**
 * DEEP FOCUS — Annual Focus Heatmap & GitHub-Style Grid Engine
 * Cycle: CYCLE-118 (Mission #118)
 * Architecture: v21 Data Fortress Safe, 365-Day Matrix & SVG Heatmap Generator
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Zero External Assets)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AnnualFocusHeatmapEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const INTENSITY_LEVELS = [
    { level: 0, minMinutes: 0, maxMinutes: 0, color: '#161b22' },
    { level: 1, minMinutes: 1, maxMinutes: 45, color: '#0e4429' },
    { level: 2, minMinutes: 46, maxMinutes: 120, color: '#006d32' },
    { level: 3, minMinutes: 121, maxMinutes: 240, color: '#26a641' },
    { level: 4, minMinutes: 241, maxMinutes: Infinity, color: '#39d353' }
  ];

  const I18N_STRINGS = {
    en: {
      heatmap_title: "Annual Focus & Study Consistency Heatmap",
      total_active_days: "Active Days",
      total_hours: "Total Hours",
      current_streak: "Current Streak",
      longest_streak: "Longest Streak",
      peak_day: "Peak Day",
      less_label: "Less",
      more_label: "More"
    },
    ar: {
      heatmap_title: "الخريطة الحرارية السنوية للاستمرارية والتركيز",
      total_active_days: "أيام الإنجاز النشطة",
      total_hours: "إجمالي الساعات",
      current_streak: "السلسلة الحالية",
      longest_streak: "أطول سلسلة استمرار",
      peak_day: "يوم الذروة السنوية",
      less_label: "أقل",
      more_label: "أكثر"
    }
  };

  function sanitizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    const clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') {
      return 'en';
    }
    return clean;
  }

  function toWesternDigits(num, decimals = 0) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function getIntensityLevel(minutes) {
    const mins = Math.max(0, parseInt(minutes, 10) || 0);
    if (mins === 0) return INTENSITY_LEVELS[0];
    if (mins <= 45) return INTENSITY_LEVELS[1];
    if (mins <= 120) return INTENSITY_LEVELS[2];
    if (mins <= 240) return INTENSITY_LEVELS[3];
    return INTENSITY_LEVELS[4];
  }

  function formatDateOnly(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function aggregateAnnualData(sessionsList = [], targetYear = 2026) {
    const year = parseInt(targetYear, 10) || 2026;
    const yearPrefix = `${year}-`;
    const dayMap = {};

    const list = Array.isArray(sessionsList) ? sessionsList : [];
    list.forEach(s => {
      if (!s) return;
      const date = s.date || (s.startTime ? formatDateOnly(new Date(s.startTime)) : '');
      if (typeof date === 'string' && date.startsWith(yearPrefix)) {
        const durSec = Math.max(0, parseInt(s.durationSeconds, 10) || 0);
        dayMap[date] = (dayMap[date] || 0) + Math.round(durSec / 60);
      }
    });

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const days = [];
    let cur = new Date(startDate);

    let totalMinutes = 0;
    let activeDaysCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let peakDay = { date: 'None', minutes: 0 };

    while (cur <= endDate) {
      const dateKey = formatDateOnly(cur);
      const minutes = dayMap[dateKey] || 0;
      const intensity = getIntensityLevel(minutes);

      totalMinutes += minutes;

      if (minutes > 0) {
        activeDaysCount++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        if (minutes > peakDay.minutes) {
          peakDay = { date: dateKey, minutes };
        }
      } else {
        tempStreak = 0;
      }

      days.push({
        date: dateKey,
        dayOfWeek: cur.getDay(),
        minutes,
        level: intensity.level,
        color: intensity.color
      });

      cur.setDate(cur.getDate() + 1);
    }

    currentStreak = tempStreak;
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    return {
      year,
      totalMinutes,
      totalHours,
      activeDaysCount,
      longestStreak,
      currentStreak,
      peakDay,
      days,
      totalDaysInYear: days.length,
      activeDaysFormatted: toWesternDigits(activeDaysCount),
      totalHoursFormatted: toWesternDigits(totalHours, 1),
      longestStreakFormatted: `${toWesternDigits(longestStreak)} days`,
      currentStreakFormatted: `${toWesternDigits(currentStreak)} days`
    };
  }

  function generateHeatmapSvg(annualData) {
    const data = annualData || aggregateAnnualData([], 2026);
    const cellSize = 10;
    const cellGap = 3;
    const step = cellSize + cellGap;

    const weeks = [];
    let curWeek = [];

    const firstDayOfWeek = data.days.length > 0 ? data.days[0].dayOfWeek : 0;
    for (let p = 0; p < firstDayOfWeek; p++) {
      curWeek.push(null);
    }

    data.days.forEach(d => {
      curWeek.push(d);
      if (curWeek.length === 7) {
        weeks.push(curWeek);
        curWeek = [];
      }
    });

    if (curWeek.length > 0) {
      while (curWeek.length < 7) curWeek.push(null);
      weeks.push(curWeek);
    }

    const svgWidth = (weeks.length * step) + 40;
    const svgHeight = (7 * step) + 30;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" class="zen-heatmap-svg">\n`;
    svg += `<rect width="100%" height="100%" fill="#0d1117" rx="6" ry="6"/>\n`;
    svg += `<g transform="translate(25, 20)">\n`;

    weeks.forEach((w, wIdx) => {
      const x = wIdx * step;
      w.forEach((day, dIdx) => {
        if (!day) return;
        const y = dIdx * step;
        const color = day.color || '#161b22';
        const title = `${day.date}: ${toWesternDigits(day.minutes)} min`;
        svg += `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" ry="2" fill="${color}"><title>${title}</title></rect>\n`;
      });
    });

    svg += `</g>\n`;
    svg += `</svg>`;

    return svg;
  }

  return {
    INTENSITY_LEVELS,
    getIntensityLevel,
    aggregateAnnualData,
    generateHeatmapSvg,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
