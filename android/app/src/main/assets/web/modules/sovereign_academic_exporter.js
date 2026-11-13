/**
 * DEEP FOCUS — SovereignAcademicExporter (v618.0.0)
 * On-device Academic Exporter Portal (Anki TSV, Markdown, LaTeX).
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignAcademicExporter = {
    version: '618.0.0',

    exportToAnkiTSV: function (cards) {
      if (!Array.isArray(cards) || cards.length === 0) return '';
      var lines = ['#separator:tab', '#html:true', '#tags column:3'];
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var front = (c.front || '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
        var back = (c.back || '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
        var tag = (c.tag || 'DeepFocus').replace(/\s+/g, '_');
        lines.push(front + '\t' + back + '\t' + tag);
      }
      return lines.join('\n');
    },

    exportToMarkdown: function (data) {
      data = data || {};
      var title = data.title || 'Deep Focus Study Session';
      var dateStr = data.date || (function(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(new Date());
      var notes = data.notes || '';
      var cards = Array.isArray(data.cards) ? data.cards : [];
      var md = ['---', 'title: "' + title + '"', 'date: ' + dateStr, 'generator: "Deep Focus OS v618.0.0"', '---', '', '# ' + title, ''];
      if (notes.trim()) {
        md.push('## Notes', notes.trim(), '');
      }
      if (cards.length > 0) {
        md.push('## Flashcards');
        for (var i = 0; i < cards.length; i++) {
          md.push('### ' + (i + 1) + '. ' + (cards[i].front || 'Prompt'));
          md.push('> ' + (cards[i].back || ''), '');
        }
      }
      return md.join('\n');
    },

    exportToLaTeX: function (data) {
      data = data || {};
      var title = this._latexEscape(data.title || 'Deep Focus Study Summary');
      var cards = Array.isArray(data.cards) ? data.cards : [];
      var tex = [
        '\\documentclass[11pt,a4paper]{article}',
        '\\usepackage[utf8]{inputenc}',
        '\\title{' + title + '}',
        '\\begin{document}',
        '\\maketitle'
      ];
      if (cards.length > 0) {
        tex.push('\\section*{Flashcard Glossary}', '\\begin{description}');
        for (var i = 0; i < cards.length; i++) {
          tex.push('  \\item[' + this._latexEscape(cards[i].front || '') + '] ' + this._latexEscape(cards[i].back || ''));
        }
        tex.push('\\end{description}');
      }
      tex.push('\\end{document}');
      return tex.join('\n');
    },

    _latexEscape: function (text) {
      if (!text || typeof text !== 'string') return '';
      // Single pass: escaping the backslash and the braces in separate passes would re-escape "{}".
      return text.replace(/[\\&%$#_{}]/g, function (ch) {
        return ch === '\\' ? '\\textbackslash{}' : '\\' + ch;
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignAcademicExporter;
  }
  global.SovereignAcademicExporter = SovereignAcademicExporter;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
