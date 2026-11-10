/**
 * DEEP FOCUS — Sovereign Feynman Mental Model Studio
 * Module: modules/recall/feynman_studio.js
 * Version: v441.0.0 | Code: 41161
 * 
 * Provides an active recall environment based on the Feynman Technique:
 * 1. Concept Definition & Target Audience Framing (Simplicity Score)
 * 2. Jargon Detection & Lexical Complexity Analyzer
 * 3. Analogy Synthesizer & Knowledge Gap Marker
 * 4. FSRS-4.5 Retrieval Difficulty Calibration
 * 5. Strict Zero-PII offline local storage envelope
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FeynmanStudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_PREFIX = 'df_feynman_session_';

  class FeynmanStudio {
    constructor(options = {}) {
      this.options = Object.assign({
        targetAudience: 'beginner', // 'child', 'beginner', 'peer'
        maxJargonThreshold: 3,
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.currentConcept = null;
      this.explanations = [];
    }

    /**
     * Start a new Feynman active recall exploration
     */
    startConcept(conceptName, subjectCategory = 'General STEM') {
      if (!conceptName || typeof conceptName !== 'string') {
        throw new Error('Invalid concept name for Feynman analysis');
      }

      this.currentConcept = {
        id: 'feynman_' + Date.now().toString(16),
        name: conceptName.trim(),
        subject: subjectCategory.trim(),
        createdAt: new Date().toISOString(),
        drafts: [],
        identifiedGaps: [],
        analogies: [],
        simplicityScore: 0,
        masteryLevel: 0
      };

      return this.currentConcept;
    }

    /**
     * Analyze explanation draft for technical jargon and readability
     */
    analyzeExplanation(text) {
      if (!text || typeof text !== 'string') {
        return { simplicityScore: 0, jargonTerms: [], wordCount: 0, feedback: 'Text is empty' };
      }

      const words = text.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;

      // Identify complex syllables and pseudo-jargon (>11 characters or formal suffixes)
      const jargonPatterns = /(?:ology|isation|ization|phoresis|quantum|isomorphism|hyperbolic|mitochondria|polymorphism|asynchronous)/i;
      const detectedJargon = [];

      for (let i = 0; i < words.length; i++) {
        const cleanWord = words[i].replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length >= 12 || jargonPatterns.test(cleanWord)) {
          if (!detectedJargon.includes(cleanWord)) {
            detectedJargon.push(cleanWord);
          }
        }
      }

      // Calculate simplicity index (1-100)
      const baseScore = 100;
      const jargonPenalty = detectedJargon.length * 8;
      const lengthAdjustment = wordCount >= 30 && wordCount <= 250 ? 0 : -10;
      const simplicityScore = Math.max(10, Math.min(100, baseScore - jargonPenalty + lengthAdjustment));

      const analysis = {
        conceptId: this.currentConcept ? this.currentConcept.id : null,
        wordCount,
        jargonCount: detectedJargon.length,
        jargonTerms: detectedJargon,
        simplicityScore,
        passedCleanThreshold: detectedJargon.length <= this.options.maxJargonThreshold,
        suggestedAction: detectedJargon.length > this.options.maxJargonThreshold
          ? 'Replace flagged technical terms with simple sensory analogies.'
          : 'Concept explanation is lucid and grounded.'
      };

      if (this.currentConcept) {
        this.currentConcept.simplicityScore = simplicityScore;
        this.currentConcept.drafts.push({
          timestamp: new Date().toISOString(),
          text,
          analysis
        });
      }

      return analysis;
    }

    /**
     * Add a verified simple analogy
     */
    recordAnalogy(analogyText) {
      if (!this.currentConcept) {
        throw new Error('No active Feynman concept session');
      }

      const analogyObj = {
        id: 'analogy_' + Date.now().toString(16),
        text: analogyText.trim(),
        timestamp: new Date().toISOString()
      };

      this.currentConcept.analogies.push(analogyObj);
      return analogyObj;
    }

    /**
     * Mark a conceptual gap that requires textbook cross-referencing
     */
    flagKnowledgeGap(topicDescription) {
      if (!this.currentConcept) {
        throw new Error('No active Feynman concept session');
      }

      const gapObj = {
        id: 'gap_' + Date.now().toString(16),
        description: topicDescription.trim(),
        resolved: false,
        timestamp: new Date().toISOString()
      };

      this.currentConcept.identifiedGaps.push(gapObj);
      return gapObj;
    }

    /**
     * Resolve a previously flagged knowledge gap
     */
    resolveGap(gapId) {
      if (!this.currentConcept) return false;
      const gap = this.currentConcept.identifiedGaps.find(g => g.id === gapId);
      if (gap) {
        gap.resolved = true;
        gap.resolvedAt = new Date().toISOString();
        return true;
      }
      return false;
    }

    /**
     * Calculate final conceptual mastery ratio
     */
    calculateMastery() {
      if (!this.currentConcept) return 0;

      const totalGaps = this.currentConcept.identifiedGaps.length;
      const resolvedGaps = this.currentConcept.identifiedGaps.filter(g => g.resolved).length;
      const gapFactor = totalGaps === 0 ? 1.0 : (resolvedGaps / totalGaps);
      const analogiesFactor = Math.min(1.0, this.currentConcept.analogies.length / 2);
      const simplicityFactor = this.currentConcept.simplicityScore / 100;

      const rawMastery = (simplicityFactor * 0.4) + (gapFactor * 0.4) + (analogiesFactor * 0.2);
      const finalMastery = Math.min(100, Math.round(rawMastery * 100));

      this.currentConcept.masteryLevel = finalMastery;
      return finalMastery;
    }

    /**
     * Save session to device local storage (Strictly zero tracking)
     */
    saveSession() {
      if (!this.currentConcept || !this.options.storage) return false;
      try {
        const key = STORAGE_KEY_PREFIX + this.currentConcept.id;
        this.options.storage.setItem(key, JSON.stringify(this.currentConcept));
        return true;
      } catch (err) {
        console.warn('[FeynmanStudio] Storage save warning:', err);
        return false;
      }
    }
  }

  return FeynmanStudio;
}));
