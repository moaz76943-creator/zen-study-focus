/**
 * DEEP FOCUS — SovereignLocalAI (v618.0.0)
 * On-device Termux Ollama Bridge (127.0.0.1:11434) with keep_alive: "0" RAM guard
 * and deterministic offline heuristic fallback.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignLocalAI = {
    version: '618.0.0',
    endpoint: 'http://127.0.0.1:11434/api/generate',
    defaultModel: 'qwen2.5-coder:1.5b',

    /**
     * Queries local Termux Ollama daemon with mandatory keep_alive: "0"
     * Falls back cleanly to deterministic heuristic summary when daemon is offline.
     */
    generate: function (prompt, options) {
      options = options || {};
      var self = this;
      var model = options.model || this.defaultModel;

      return new Promise(function (resolve) {
        if (typeof fetch === 'undefined') {
          return resolve({ text: self.heuristicFallback(prompt), source: 'heuristic' });
        }

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, options.timeoutMs || 3500) : null;

        fetch(self.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            keep_alive: '0'
          }),
          signal: controller ? controller.signal : undefined
        })
          .then(function (res) {
            if (timeoutId) clearTimeout(timeoutId);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            if (data && data.response) {
              resolve({ text: String(data.response).trim(), source: 'ollama' });
            } else {
              resolve({ text: self.heuristicFallback(prompt), source: 'heuristic' });
            }
          })
          .catch(function () {
            if (timeoutId) clearTimeout(timeoutId);
            resolve({ text: self.heuristicFallback(prompt), source: 'heuristic' });
          });
      });
    },

    /**
     * Deterministic offline fallback when Ollama is not running
     */
    heuristicFallback: function (prompt) {
      if (!prompt || typeof prompt !== 'string') return '';
      var sentences = prompt.split(/[.!?\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (sentences.length <= 2) return prompt.trim();
      return sentences.slice(0, 2).join('. ') + '.';
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignLocalAI;
  }
  global.SovereignLocalAI = SovereignLocalAI;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
