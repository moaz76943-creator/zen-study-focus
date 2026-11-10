/**
 * DEEP FOCUS — Exhaustive Feynman Blank-Sheet Challenge & Intelligent Error Bank
 * Module: modules/recall/feynman_error_bank_studio.js
 * Version: v450.0.0 | Code: 41170
 * Reference: Pillar 7 (M8408 – M8457)
 * 
 * Provides an exhaustive conceptual simplification and mistake taxonomy engine:
 * 1. Blank Sheet Challenge: Uncued free-recall canvas for testing true mastery
 * 2. Lexical Jargon Analyzer: Detects obfuscating terminology and scores clarity
 * 3. Intelligent Error Bank: Logs mistakes from exams, STEM tests, and flashcards
 * 4. Error Taxonomy: Categorizes errors into Conceptual, Calculation, or Attention Slip
 * 5. Interactive Retest Loop: Re-quizzes logged mistakes until mastery is achieved
 * 6. Local Storage Persistence: Zero-PII, 100% on-device private vaults
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FeynmanErrorBankStudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_ERROR_BANK_KEY = 'df_error_bank_vault_v1';
  const STORAGE_BLANK_SHEET_KEY = 'df_blank_sheet_sessions_v1';

  const ERROR_TYPES = {
    CONCEPTUAL: { id: 'conceptual', label: 'Conceptual Flaw', color: '#E11D48', weight: 1.0 },
    CALCULATION: { id: 'calculation', label: 'Calculation / Algebraic Error', color: '#D97706', weight: 0.6 },
    SLIP: { id: 'slip', label: 'Attention Slip / Misread', color: '#2563EB', weight: 0.3 }
  };

  class FeynmanErrorBankStudio {
    constructor(options = {}) {
      this.options = Object.assign({
        minExplanationWords: 20,
        storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      }, options);

      this.errorBank = [];
      this.currentBlankSheet = null;

      this.loadErrorBank();
    }

    /**
     * Start a new Blank Sheet active recall challenge
     */
    startBlankSheet(conceptTitle, requiredKeyTerms = []) {
      if (!conceptTitle || typeof conceptTitle !== 'string') {
        throw new Error('Valid concept title required for Blank Sheet Challenge');
      }

      this.currentBlankSheet = {
        id: 'bs_' + Date.now().toString(16),
        title: conceptTitle.trim(),
        requiredTerms: Array.isArray(requiredKeyTerms) ? requiredKeyTerms : [],
        userText: '',
        startedAt: new Date().toISOString(),
        coverageScore: 0,
        simplicityScore: 0,
        completed: false
      };

      return this.currentBlankSheet;
    }

    /**
     * Evaluate blank sheet free recall explanation
     */
    evaluateBlankSheet(text) {
      if (!this.currentBlankSheet) {
        throw new Error('No active Blank Sheet session');
      }

      const cleanText = (text || '').trim();
      this.currentBlankSheet.userText = cleanText;
      const words = cleanText.split(/\s+/).filter(Boolean);

      // 1. Calculate Coverage of Required Key Terms
      let matchedTerms = 0;
      const terms = this.currentBlankSheet.requiredTerms;
      for (const t of terms) {
        const regex = new RegExp('\\b' + t.replace(/[^a-zA-Z0-9]/g, '') + '\\b', 'i');
        if (regex.test(cleanText)) {
          matchedTerms++;
        }
      }

      const coverageScore = terms.length === 0
        ? Math.min(100, Math.round((words.length / this.options.minExplanationWords) * 100))
        : Math.round((matchedTerms / terms.length) * 100);

      // 2. Jargon and Simplicity Scoring
      const jargonMatches = cleanText.match(/(?:quantum|isomorphism|hyperbolic|attenuation|mitochondria|polymorphism|asynchronous)/gi) || [];
      const simplicityScore = Math.max(10, Math.min(100, 100 - (jargonMatches.length * 10)));

      this.currentBlankSheet.coverageScore = coverageScore;
      this.currentBlankSheet.simplicityScore = simplicityScore;
      this.currentBlankSheet.completed = (words.length >= this.options.minExplanationWords);
      this.currentBlankSheet.evaluatedAt = new Date().toISOString();

      this.saveBlankSheet();

      return {
        wordCount: words.length,
        matchedTerms,
        totalTerms: terms.length,
        coverageScore,
        simplicityScore,
        isMastered: coverageScore >= 75 && simplicityScore >= 70
      };
    }

    /**
     * Log a student mistake into the Intelligent Error Bank
     */
    logMistake(questionOrConcept, userMistakeReason, errorType = 'conceptual', sourceContext = 'General Exam') {
      const typeKey = (errorType || 'conceptual').toLowerCase();
      const resolvedType = ERROR_TYPES[typeKey.toUpperCase()] || ERROR_TYPES.CONCEPTUAL;

      const errorEntry = {
        id: 'err_' + Date.now().toString(16) + '_' + Math.random().toString(36).substring(2, 6),
        concept: (questionOrConcept || '').trim(),
        reason: (userMistakeReason || '').trim(),
        type: resolvedType.id,
        typeLabel: resolvedType.label,
        typeColor: resolvedType.color,
        source: sourceContext,
        loggedAt: new Date().toISOString(),
        retestAttempts: 0,
        resolved: false,
        resolvedAt: null
      };

      this.errorBank.unshift(errorEntry);
      this.saveErrorBank();
      return errorEntry;
    }

    /**
     * Retest a mistake from the bank
     */
    submitRetest(errorId, isCorrectAnswer) {
      const entry = this.errorBank.find(e => e.id === errorId);
      if (!entry) return null;

      entry.retestAttempts++;
      if (isCorrectAnswer) {
        entry.resolved = true;
        entry.resolvedAt = new Date().toISOString();
      }

      this.saveErrorBank();
      return {
        errorId,
        resolved: entry.resolved,
        totalAttempts: entry.retestAttempts,
        remainingUnresolved: this.getUnresolvedMistakes().length
      };
    }

    /**
     * Get unresolved mistakes filtered for active review
     */
    getUnresolvedMistakes() {
      return this.errorBank.filter(e => !e.resolved);
    }

    /**
     * Calculate error bank resolution statistics
     */
    getErrorStatistics() {
      const total = this.errorBank.length;
      const resolved = this.errorBank.filter(e => e.resolved).length;
      const unresolved = total - resolved;
      const masteryRatePct = total === 0 ? 100 : Math.round((resolved / total) * 100);

      const byType = {
        conceptual: this.errorBank.filter(e => e.type === 'conceptual').length,
        calculation: this.errorBank.filter(e => e.type === 'calculation').length,
        slip: this.errorBank.filter(e => e.type === 'slip').length
      };

      return {
        totalMistakesLogged: total,
        resolvedMistakes: resolved,
        unresolvedMistakes: unresolved,
        masteryRatePct,
        breakdownByType: byType
      };
    }

    saveErrorBank() {
      if (this.options.storage) {
        try {
          this.options.storage.setItem(STORAGE_ERROR_BANK_KEY, JSON.stringify(this.errorBank));
        } catch (e) {}
      }
    }

    loadErrorBank() {
      if (this.options.storage) {
        try {
          const raw = this.options.storage.getItem(STORAGE_ERROR_BANK_KEY);
          if (raw) {
            this.errorBank = JSON.parse(raw);
          }
        } catch (e) {
          this.errorBank = [];
        }
      }
    }

    saveBlankSheet() {
      if (this.options.storage && this.currentBlankSheet) {
        try {
          this.options.storage.setItem(STORAGE_BLANK_SHEET_KEY, JSON.stringify(this.currentBlankSheet));
        } catch (e) {}
      }
    }
  }

  return FeynmanErrorBankStudio;
}));
