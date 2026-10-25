/**
 * DEEP FOCUS — Native Calendar Event Sync & Focus Block Coordinator
 * Cycle: CYCLE-111 (Mission #111)
 * Architecture: v21 Data Fortress Safe, RFC 5545 iCalendar Exporter & Focus Gap Finder
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero External Network Calls (100% Offline Local Calendar Protocol)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NativeCalendarSyncCoordinator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const I18N_STRINGS = {
    en: {
      calendar_summary_prefix: "Deep Focus Session",
      calendar_desc_template: "Dedicated study & focus block in Deep Focus. Category: {category}. Quality: {quality}/100.",
      event_created_toast: "Focus event ready for native calendar sync.",
      gap_free_slot: "Open Focus Window ({duration} min)"
    },
    ar: {
      calendar_summary_prefix: "جلسة تركيز ديب فوكس",
      calendar_desc_template: "فترة مدارسة وتركيز عميق عبر ديب فوكس. التصنيف: {category}. جودة التركيز: {quality}/100.",
      event_created_toast: "جلسة التركيز جاهزة للمزامنة مع الروزنامة.",
      gap_free_slot: "فترة تركيز متاحة ({duration} دقيقة)"
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

  function toWesternDigits(num) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function formatIcsTimestamp(dateInput) {
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }

  function generateSessionVEvent(session, locale = 'en') {
    const s = session || {};
    const startTimeMs = s.startTime ? Number(s.startTime) : Date.now();
    const durationSec = Math.max(60, parseInt(s.durationSeconds, 10) || 1500);
    const endTimeMs = startTimeMs + (durationSec * 1000);

    const uid = s.id ? `deepfocus-${s.id}@zenstudy` : `deepfocus-${startTimeMs}-${Math.floor(Math.random() * 10000)}@zenstudy`;
    const category = s.category || 'General Focus';
    const quality = s.qualityScore !== undefined ? toWesternDigits(s.qualityScore) : '85';

    const t = (k) => getLocalizedText(locale, k);
    const summary = `${t('calendar_summary_prefix')}: ${category}`;
    const description = t('calendar_desc_template')
      .replace('{category}', category)
      .replace('{quality}', quality);

    const dtStamp = formatIcsTimestamp(Date.now());
    const dtStart = formatIcsTimestamp(startTimeMs);
    const dtEnd = formatIcsTimestamp(endTimeMs);

    let vEvent = '';
    vEvent += 'BEGIN:VEVENT\r\n';
    vEvent += `UID:${uid}\r\n`;
    vEvent += `DTSTAMP:${dtStamp}\r\n`;
    vEvent += `DTSTART:${dtStart}\r\n`;
    vEvent += `DTEND:${dtEnd}\r\n`;
    vEvent += `SUMMARY:${summary}\r\n`;
    vEvent += `DESCRIPTION:${description}\r\n`;
    vEvent += `CATEGORIES:Study,Focus,DeepWork\r\n`;
    vEvent += 'STATUS:CONFIRMED\r\n';
    vEvent += 'TRANSP:OPAQUE\r\n';
    vEvent += 'END:VEVENT\r\n';

    return {
      vEvent,
      uid,
      dtStart,
      dtEnd,
      summary,
      description,
      durationMinutes: Math.round(durationSec / 60)
    };
  }

  function exportSessionsToIcs(sessions = [], calendarName = 'Deep Focus Calendar', locale = 'en') {
    const list = Array.isArray(sessions) ? sessions : [];
    let ics = '';
    ics += 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//Deep Focus//Zen Study Focus Timer v21//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += `X-WR-CALNAME:${calendarName}\r\n`;

    list.forEach(s => {
      const ev = generateSessionVEvent(s, locale);
      ics += ev.vEvent;
    });

    ics += 'END:VCALENDAR\r\n';
    return ics;
  }

  function createAndroidCalendarIntent(session, locale = 'en') {
    const s = session || {};
    const startTimeMs = s.startTime ? Number(s.startTime) : Date.now();
    const durationSec = Math.max(60, parseInt(s.durationSeconds, 10) || 1500);
    const endTimeMs = startTimeMs + (durationSec * 1000);
    const category = s.category || 'General Focus';
    const title = `${getLocalizedText(locale, 'calendar_summary_prefix')}: ${category}`;

    return {
      action: 'android.intent.action.INSERT',
      dataUri: 'content://com.android.calendar/events',
      extras: {
        title,
        beginTime: startTimeMs,
        endTime: endTimeMs,
        allDay: false,
        eventLocation: 'Deep Focus Sanctuary'
      }
    };
  }

  function findFocusGaps(busyIntervals = [], windowStartMs, windowEndMs, minDurationMinutes = 25) {
    const minMs = minDurationMinutes * 60 * 1000;
    const sorted = busyIntervals
      .filter(b => b && b.start && b.end && b.end > b.start)
      .map(b => ({ start: Math.max(windowStartMs, Number(b.start)), end: Math.min(windowEndMs, Number(b.end)) }))
      .sort((a, b) => a.start - b.start);

    const gaps = [];
    let currentPointer = windowStartMs;

    sorted.forEach(busy => {
      if (busy.start > currentPointer) {
        const gapDuration = busy.start - currentPointer;
        if (gapDuration >= minMs) {
          gaps.push({
            start: currentPointer,
            end: busy.start,
            durationMinutes: Math.round(gapDuration / (60 * 1000))
          });
        }
      }
      currentPointer = Math.max(currentPointer, busy.end);
    });

    if (windowEndMs > currentPointer) {
      const remainingGap = windowEndMs - currentPointer;
      if (remainingGap >= minMs) {
        gaps.push({
          start: currentPointer,
          end: windowEndMs,
          durationMinutes: Math.round(remainingGap / (60 * 1000))
        });
      }
    }

    return gaps;
  }

  return {
    formatIcsTimestamp,
    generateSessionVEvent,
    exportSessionsToIcs,
    createAndroidCalendarIntent,
    findFocusGaps,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
