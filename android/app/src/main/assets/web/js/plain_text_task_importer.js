/**
 * DEEP FOCUS — Plain Text & Markdown Task Importer Engine
 * Mission #055: Batch plain-text import, Markdown checklists parsing,
 * inline #tag extraction, Arabic/English priority parsing, and v21 binding.
 */
(function (global) {
  'use strict';

  function sanitizeTitle(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
  }

  function parseTaskLine(rawLine) {
    if (typeof rawLine !== 'string') return null;
    var line = rawLine.trim();
    if (!line) return null;

    var completed = false;

    // Check for Markdown checklist patterns: - [ ] or - [x]
    if (/^[-*]\s*\[([ xX])\]\s*/.test(line)) {
      var checkMatch = line.match(/^[-*]\s*\[([ xX])\]\s*/);
      completed = checkMatch[1].toLowerCase() === 'x';
      line = line.substring(checkMatch[0].length).trim();
    } else {
      // Strip leading bullets: -, *, or 1., 2.
      line = line.replace(/^([-*]|\d+\.)\s+/, '').trim();
    }

    if (!line) return null;

    // Extract inline priority flag with Arabic Unicode boundary support
    var priority = 'normal';
    var prioRegex = /!(high|medium|low|عالية|متوسطة|منخفضة)(?=[^\w\u0621-\u064A]|$)/i;
    var prioMatch = line.match(prioRegex);
    if (prioMatch) {
      var pVal = prioMatch[1].toLowerCase();
      if (pVal === 'high' || pVal === 'عالية') priority = 'high';
      else if (pVal === 'medium' || pVal === 'متوسطة') priority = 'medium';
      else if (pVal === 'low' || pVal === 'منخفضة') priority = 'low';
      line = line.replace(prioRegex, '').trim();
    }

    // Extract inline tags: #tag or #وسم
    var tags = [];
    var tagMatches = line.match(/#([\w\u0621-\u064A]+)/g);
    if (tagMatches) {
      for (var i = 0; i < tagMatches.length; i++) {
        tags.push(tagMatches[i].replace(/^#/, ''));
      }
      line = line.replace(/#([\w\u0621-\u064A]+)/g, '').trim();
    }

    var cleanTitle = sanitizeTitle(line);
    if (!cleanTitle) return null;

    return {
      id: "task_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      title: cleanTitle,
      completed: completed,
      priority: priority,
      tags: tags,
      createdAt: new Date().toISOString()
    };
  }

  function parseBatchText(rawText) {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return [];
    }

    var lines = rawText.split(/\r?\n/);
    var tasks = [];

    for (var i = 0; i < lines.length; i++) {
      var task = parseTaskLine(lines[i]);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  function mergeImportedTasks(existingTasks, importedTasks) {
    var base = Array.isArray(existingTasks) ? existingTasks.slice() : [];
    var incoming = Array.isArray(importedTasks) ? importedTasks : [];

    var seenTitles = Object.create(null);
    for (var i = 0; i < base.length; i++) {
      if (base[i] && base[i].title) {
        seenTitles[base[i].title.toLowerCase()] = true;
      }
    }

    var addedCount = 0;
    for (var j = 0; j < incoming.length; j++) {
      var item = incoming[j];
      if (item && item.title) {
        var key = item.title.toLowerCase();
        if (!seenTitles[key]) {
          seenTitles[key] = true;
          base.push(item);
          addedCount++;
        }
      }
    }

    return {
      mergedList: base,
      addedCount: addedCount
    };
  }

  var engine = {
    sanitizeTitle: sanitizeTitle,
    parseTaskLine: parseTaskLine,
    parseBatchText: parseBatchText,
    mergeImportedTasks: mergeImportedTasks
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.PlainTextTaskImporter = engine;
  }
})(typeof window !== 'undefined' ? window : this);
