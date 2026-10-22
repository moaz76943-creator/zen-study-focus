/**
 * DEEP FOCUS — Study Session CSV Exporter & Importer Engine (M092 Updated)
 * File: android/app/src/main/assets/web/js/study_session_csv_engine.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.StudySessionCSVEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  var UTF8_BOM = '\uFEFF';

  var COLUMNS = [
    { key: 'id', i18n_key: 'csv.col.id' },
    { key: 'date', i18n_key: 'csv.col.date' },
    { key: 'timestamp', i18n_key: 'csv.col.timestamp' },
    { key: 'duration_minutes', i18n_key: 'csv.col.duration_minutes' },
    { key: 'tag', i18n_key: 'csv.col.tag' },
    { key: 'task_name', i18n_key: 'csv.col.task_name' },
    { key: 'mode', i18n_key: 'csv.col.mode' },
    { key: 'interrupted', i18n_key: 'csv.col.interrupted' },
    { key: 'sound_environment', i18n_key: 'csv.col.sound_environment' },
    { key: 'reflection_notes', i18n_key: 'csv.col.reflection_notes' }
  ];

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function escapeCSVField(val) {
    if (val === null || val === undefined) {
      return '';
    }
    var str = String(val);
    if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportSessionsToCSV(sessions, options) {
    var opts = options || {};
    var includeBOM = opts.includeBOM !== false;
    var locale = opts.locale || opts.lang || 'en';
    var delimiter = opts.delimiter || ',';

    var headerRow = [];
    for (var i = 0; i < COLUMNS.length; i++) {
      var col = COLUMNS[i];
      var headerText = translate(col.i18n_key, locale);
      headerRow.push(escapeCSVField(headerText));
    }

    var lines = [headerRow.join(delimiter)];

    if (Array.isArray(sessions)) {
      for (var s = 0; s < sessions.length; s++) {
        var item = sessions[s] || {};
        var row = [];

        for (var c = 0; c < COLUMNS.length; c++) {
          var key = COLUMNS[c].key;
          var val = item[key];

          if (key === 'duration_minutes') {
            val = (typeof val === 'number' && !isNaN(val)) ? Math.round(val) : 0;
          } else if (key === 'interrupted') {
            val = val ? 'true' : 'false';
          } else if (key === 'date' && !val && item.timestamp) {
            val = String(item.timestamp).split('T')[0];
          }

          row.push(escapeCSVField(val));
        }
        lines.push(row.join(delimiter));
      }
    }

    var csvResult = lines.join('\r\n');
    return includeBOM ? (UTF8_BOM + csvResult) : csvResult;
  }

  function parseCSV(text, delimiter) {
    var delim = delimiter || ',';
    var cleanText = text;
    if (cleanText.charCodeAt(0) === 0xFEFF) {
      cleanText = cleanText.slice(1);
    }

    var rows = [];
    var currentRow = [];
    var currentField = '';
    var insideQuote = false;

    for (var i = 0; i < cleanText.length; i++) {
      var char = cleanText[i];
      var nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === delim && !insideQuote) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  }

  function importSessionsFromCSV(csvString, options) {
    if (!csvString || typeof csvString !== 'string') {
      return { success: false, error: 'Empty or invalid CSV input', sessions: [], totalParsed: 0 };
    }

    var rows = parseCSV(csvString, (options && options.delimiter) || ',');
    if (rows.length < 2) {
      return { success: false, error: 'CSV must contain at least a header row and one data row', sessions: [], totalParsed: 0 };
    }

    var headers = rows[0];
    var colMap = {};

    var localesToSearch = (I18n && typeof I18n.getLoadedLocales === 'function') ?
      I18n.getLoadedLocales() : ['en', 'ar', 'es'];

    for (var h = 0; h < headers.length; h++) {
      var headerClean = headers[h].trim().toLowerCase();

      for (var c = 0; c < COLUMNS.length; c++) {
        var col = COLUMNS[c];

        if (headerClean === col.key.toLowerCase() || headerClean.indexOf(col.key) !== -1) {
          colMap[col.key] = h;
          break;
        }

        var matched = false;
        for (var l = 0; l < localesToSearch.length; l++) {
          var translatedHeader = translate(col.i18n_key, localesToSearch[l]).toLowerCase();
          if (headerClean === translatedHeader) {
            colMap[col.key] = h;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    var importedSessions = [];
    var errors = [];

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (row.length === 1 && row[0].trim() === '') continue;

      try {
        var idVal = colMap.id !== undefined ? (row[colMap.id] || '').trim() : '';
        var timestampVal = colMap.timestamp !== undefined ? (row[colMap.timestamp] || '').trim() : '';
        var dateVal = colMap.date !== undefined ? (row[colMap.date] || '').trim() : '';
        var durStr = colMap.duration_minutes !== undefined ? (row[colMap.duration_minutes] || '0').trim() : '0';
        var tagVal = colMap.tag !== undefined ? (row[colMap.tag] || 'General').trim() : 'General';
        var taskVal = colMap.task_name !== undefined ? (row[colMap.task_name] || '').trim() : '';
        var modeVal = colMap.mode !== undefined ? (row[colMap.mode] || 'standard_pomodoro').trim() : 'standard_pomodoro';
        var interruptedVal = colMap.interrupted !== undefined ? (row[colMap.interrupted] || 'false').trim().toLowerCase() : 'false';
        var soundVal = colMap.sound_environment !== undefined ? (row[colMap.sound_environment] || 'none').trim() : 'none';
        var notesVal = colMap.reflection_notes !== undefined ? (row[colMap.reflection_notes] || '').trim() : '';

        var duration = parseInt(durStr, 10);
        if (isNaN(duration) || duration < 0) duration = 25;

        if (!timestampVal) {
          timestampVal = dateVal ? (dateVal + 'T12:00:00.000Z') : new Date().toISOString();
        }
        if (!dateVal) {
          dateVal = timestampVal.split('T')[0];
        }
        if (!idVal) {
          idVal = 'imported_' + Date.now() + '_' + r;
        }

        importedSessions.push({
          id: idVal,
          date: dateVal,
          timestamp: timestampVal,
          duration_minutes: duration,
          tag: tagVal || 'General',
          task_name: taskVal || 'Study Task',
          mode: modeVal,
          interrupted: interruptedVal === 'true' || interruptedVal === '1' || interruptedVal === 'نعم' || interruptedVal === 'sí',
          sound_environment: soundVal,
          reflection_notes: notesVal
        });
      } catch (err) {
        errors.push({ row: r + 1, error: err.message });
      }
    }

    return {
      success: errors.length === 0,
      sessions: importedSessions,
      totalParsed: importedSessions.length,
      errors: errors
    };
  }

  function generateSampleSessions() {
    return [
      {
        id: 'sess_101',
        date: '2026-10-22',
        timestamp: '2026-10-22T08:30:00.000Z',
        duration_minutes: 45,
        tag: 'Mathematics',
        task_name: 'Calculus Integration Problems',
        mode: 'deep_flow',
        interrupted: false,
        sound_environment: 'quiet_library',
        reflection_notes: 'High clarity and sustained focus without distraction.'
      },
      {
        id: 'sess_102',
        date: '2026-10-22',
        timestamp: '2026-10-22T10:00:00.000Z',
        duration_minutes: 25,
        tag: 'Physics',
        task_name: 'Electromagnetism Chapter Review',
        mode: 'standard_pomodoro',
        interrupted: false,
        sound_environment: 'deep_noise_isolation',
        reflection_notes: 'Completed formulas sheet and flashcards.'
      },
      {
        id: 'sess_103',
        date: '2026-10-22',
        timestamp: '2026-10-22T14:15:00.000Z',
        duration_minutes: 30,
        tag: 'اللغة العربية',
        task_name: 'مراجعة البلاغة والنحو، مع تلخيص الأمثلة',
        mode: 'standard_pomodoro',
        interrupted: true,
        sound_environment: 'forest_cabin',
        reflection_notes: 'جلسة مثمرة رغم انقطاع قصير للدقيقة 18.'
      }
    ];
  }

  return {
    UTF8_BOM: UTF8_BOM,
    COLUMNS: COLUMNS,
    escapeCSVField: escapeCSVField,
    exportSessionsToCSV: exportSessionsToCSV,
    parseCSV: parseCSV,
    importSessionsFromCSV: importSessionsFromCSV,
    generateSampleSessions: generateSampleSessions
  };
}));
