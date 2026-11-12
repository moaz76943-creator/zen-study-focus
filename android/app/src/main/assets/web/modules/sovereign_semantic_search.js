/**
 * DEEP FOCUS — SovereignSemanticSearch (v611.0.0)
 * Fast on-device semantic search, deterministic token vectorizer & embeddings cache.
 * Provides instant cosine-similarity ranking across study sessions, notes, flashcards & tags.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignSemanticSearch = {
    version: '611.0.0',
    vectorDimension: 64,
    cache: new Map(),

    /**
     * Stopwords list to enhance deterministic vector density
     */
    stopwords: new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
      'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'أن', 'إن', 'كان'
    ]),

    /**
     * Tokenizes text into normalized lower-case tokens and n-grams
     * @param {string} text
     * @returns {Array<string>}
     */
    tokenize: function (text) {
      if (!text || typeof text !== 'string') return [];
      var normalized = text.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim();
      var words = normalized.split(/\s+/).filter(function (w) {
        return w.length > 1;
      });
      return words;
    },

    /**
     * Generates a deterministic high-density vector using feature hashing & n-gram frequency.
     * Operates 100% offline with zero external neural models.
     * @param {string} text Input text
     * @returns {Array<number>} Normalized vector of fixed dimension
     */
    generateDeterministicVector: function (text) {
      var dim = this.vectorDimension;
      var vector = new Array(dim).fill(0);
      var tokens = this.tokenize(text);
      if (tokens.length === 0) return vector;

      for (var i = 0; i < tokens.length; i++) {
        var word = tokens[i];
        var weight = this.stopwords.has(word) ? 0.2 : 1.0;

        // Hash unigram
        var h1 = this._hashString(word);
        var idx1 = Math.abs(h1) % dim;
        var sign1 = (h1 & 1) === 0 ? 1 : -1;
        vector[idx1] += weight * sign1;

        // Hash character trigram for morphological robustness
        if (word.length >= 3) {
          for (var j = 0; j <= word.length - 3; j++) {
            var tri = word.substring(j, j + 3);
            var hTri = this._hashString(tri);
            var idxTri = Math.abs(hTri) % dim;
            vector[idxTri] += (weight * 0.3);
          }
        }
      }

      // L2 Normalize
      return this._l2Normalize(vector);
    },

    /**
     * Internal string hash (FNV-1a 32-bit variant)
     */
    _hashString: function (str) {
      var hash = 2166136261;
      for (var i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return hash >>> 0;
    },

    /**
     * L2 vector normalization
     */
    _l2Normalize: function (vec) {
      var sumSq = 0;
      for (var i = 0; i < vec.length; i++) {
        sumSq += vec[i] * vec[i];
      }
      var norm = Math.sqrt(sumSq);
      if (norm === 0) return vec;
      var out = new Array(vec.length);
      for (var j = 0; j < vec.length; j++) {
        out[j] = parseFloat((vec[j] / norm).toFixed(6));
      }
      return out;
    },

    /**
     * Computes Cosine Similarity between two normalized vectors
     * @param {Array<number>} vecA
     * @param {Array<number>} vecB
     * @returns {number} Score between 0.00 and 1.00
     */
    cosineSimilarity: function (vecA, vecB) {
      if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
        return 0.0;
      }
      var dot = 0;
      for (var i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
      }
      // Bound between 0.0 and 1.0 for ranking
      var sim = Math.max(0.0, Math.min(1.0, (dot + 1) / 2));
      return parseFloat(sim.toFixed(4));
    },

    /**
     * Obtains vector either via cache or deterministic generator
     * @param {string} text
     * @returns {Array<number>}
     */
    getVector: function (text) {
      if (!text) return new Array(this.vectorDimension).fill(0);
      var key = text.trim().substring(0, 200);
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      var vec = this.generateDeterministicVector(text);
      if (this.cache.size > 500) {
        // Evict oldest item
        var firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, vec);
      return vec;
    },

    /**
     * Optional local AI embedding bridge (Ollama qwen2.5-coder:1.5b)
     * Falls back seamlessly to deterministic vector if Ollama is absent or offline.
     * @param {string} text
     * @returns {Promise<Array<number>>}
     */
    getEmbeddingWithFallback: function (text) {
      var self = this;
      return new Promise(function (resolve) {
        if (typeof fetch === 'undefined') {
          return resolve(self.getVector(text));
        }

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 1200) : null;

        fetch('http://127.0.0.1:11434/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen2.5-coder:1.5b',
            prompt: text,
            keep_alive: '0'
          }),
          signal: controller ? controller.signal : undefined
        })
          .then(function (res) {
            if (timeoutId) clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Ollama HTTP error');
            return res.json();
          })
          .then(function (data) {
            if (data && Array.isArray(data.embedding)) {
              resolve(self._l2Normalize(data.embedding.slice(0, self.vectorDimension)));
            } else {
              resolve(self.getVector(text));
            }
          })
          .catch(function () {
            if (timeoutId) clearTimeout(timeoutId);
            resolve(self.getVector(text));
          });
      });
    },

    /**
     * Semantic Search across an array of items (documents, notes, flashcards, sessions).
     * @param {string} query Search query
     * @param {Array<object>} items Collection of items { id, title, content, tag }
     * @param {object} options Filter and limit options { limit: 10, minScore: 0.1 }
     * @returns {Array<object>} Ranked results with score and matched item
     */
    search: function (query, items, options) {
      if (!query || !Array.isArray(items) || items.length === 0) {
        return [];
      }
      options = options || {};
      var limit = options.limit || 10;
      var minScore = options.minScore || 0.05;

      var queryVec = this.getVector(query);
      var queryTokens = this.tokenize(query);
      var results = [];

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var textToMatch = (item.title || '') + ' ' + (item.content || '') + ' ' + (item.front || '') + ' ' + (item.back || '') + ' ' + (item.tag || '');
        if (!textToMatch.trim()) continue;

        var docVec = this.getVector(textToMatch);
        var sim = this.cosineSimilarity(queryVec, docVec);

        // Boost score if exact query token appears in title or front
        var tokenBoost = 0;
        var lowerText = textToMatch.toLowerCase();
        for (var t = 0; t < queryTokens.length; t++) {
          if (lowerText.indexOf(queryTokens[t]) !== -1) {
            tokenBoost += 0.05;
          }
        }
        var finalScore = parseFloat(Math.min(1.0, sim + tokenBoost).toFixed(4));

        if (finalScore >= minScore) {
          results.push({
            id: item.id || ('item_' + i),
            score: finalScore,
            item: item,
            matchedTokens: queryTokens.filter(function (t) {
              return lowerText.indexOf(t) !== -1;
            })
          });
        }
      }

      // Sort descending by score
      results.sort(function (a, b) {
        return b.score - a.score;
      });

      return results.slice(0, limit);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignSemanticSearch;
  }
  global.SovereignSemanticSearch = SovereignSemanticSearch;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
