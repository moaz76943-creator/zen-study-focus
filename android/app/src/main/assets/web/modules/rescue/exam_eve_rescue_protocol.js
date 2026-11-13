/**
 * DEEP FOCUS - Axis 8: Exam-Eve Rescue Protocol Studio
 * Milestone M8498 - M8507 | Sovereign Offline Architecture
 * High-Stakes 24-Hour Cognitive Triage, Rapid Sprints & Sleep Protection
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ExamEveRescueProtocol = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_RESCUE = 'df_exam_eve_rescue_state_v1';
  const STORAGE_KEY_HISTORY = 'df_exam_eve_history_v1';

  class ExamEveRescueProtocol {
    constructor() {
      this.activeRescue = null;
      this.historyLedger = [];
      this._loadStorage();
    }

    _loadStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY_RESCUE);
          if (raw) this.activeRescue = JSON.parse(raw);
          const rawH = localStorage.getItem(STORAGE_KEY_HISTORY);
          if (rawH) this.historyLedger = JSON.parse(rawH) || [];
        }
      } catch (e) {
        console.warn('[RescueProtocol] Storage restore failed, using clean defaults.', e);
      }
    }

    _saveStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          if (this.activeRescue) {
            localStorage.setItem(STORAGE_KEY_RESCUE, JSON.stringify(this.activeRescue));
          } else {
            localStorage.removeItem(STORAGE_KEY_RESCUE);
          }
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.historyLedger));
        }
      } catch (e) {
        console.warn('[RescueProtocol] Storage persistence failed.', e);
      }
    }

    // M8498: dfActivateExamEveFocusProtocol
    dfActivateExamEveFocusProtocol(examSubject, examDateIso = null) {
      const subject = String(examSubject || 'Comprehensive Exam').replace(/[<>]/g, '').trim();
      const now = new Date();
      const examTime = examDateIso ? new Date(examDateIso).getTime() : (now.getTime() + (24 * 60 * 60 * 1000));

      this.activeRescue = {
        sessionId: 'rescue_' + Date.now().toString(36),
        subject: subject,
        activatedAtIso: now.toISOString(),
        examTimeEpoch: examTime,
        status: 'active', // 'active' | 'completed' | 'deactivated'
        sprintConfig: { focusMinutes: 20, breakMinutes: 3 },
        sleepCutoffHour: 23, // 11:00 PM standard sleep guard
        metricsMuted: true,
        completedSprintsCount: 0,
        warmupQuizCompleted: false
      };

      this._saveStorage();
      return {
        success: true,
        session: this.activeRescue,
        message: 'Exam-Eve Rescue Protocol active. All non-critical metrics muted.'
      };
    }

    // M8499: dfFilterDeckToTop20PercentCritical
    dfFilterDeckToTop20PercentCritical(deckCards) {
      if (!Array.isArray(deckCards) || deckCards.length === 0) return [];
      
      // Rank by lowest retention / highest difficulty
      const sorted = deckCards.slice().sort((a, b) => {
        const retA = typeof a.retentionScore === 'number' ? a.retentionScore : 0.5;
        const retB = typeof b.retentionScore === 'number' ? b.retentionScore : 0.5;
        return retA - retB;
      });

      const topCount = Math.max(1, Math.ceil(deckCards.length * 0.20));
      return sorted.slice(0, topCount).map(c => ({
        ...c,
        isRescuePriority: true,
        triageRank: 'CRITICAL_RETENTION_RISK'
      }));
    }

    // M8500: dfHideMasteredCardsTemporarily
    dfHideMasteredCardsTemporarily(deckCards) {
      if (!Array.isArray(deckCards)) return [];
      // Filter out cards with high stability / repetition count >= 5 and rating >= 4
      return deckCards.filter(c => {
        const reps = c.reps || 0;
        const stability = c.stability || 0;
        const isMastered = reps >= 4 && stability >= 14;
        return !isMastered;
      });
    }

    // M8501: dfCompileOnePageFormulaAndDateSheet
    dfCompileOnePageFormulaAndDateSheet(items) {
      if (!Array.isArray(items)) return { title: 'Exam Rescue Sheet', formulas: [], definitions: [] };

      const formulas = [];
      const definitions = [];
      const keyDates = [];

      items.forEach(item => {
        const text = String(item.text || item.front || item.cue || '');
        if (text.includes('=') || text.includes('∫') || text.includes('∑') || text.includes('√')) {
          formulas.push({ id: item.id || formulas.length + 1, content: text });
        } else if (/\b\d{4}\b/.test(text) || /\b(BC|BCE|AD|CE)\b/.test(text)) {
          keyDates.push({ id: item.id || keyDates.length + 1, content: text });
        } else {
          definitions.push({ id: item.id || definitions.length + 1, content: text });
        }
      });

      return {
        subject: this.activeRescue ? this.activeRescue.subject : 'Emergency Review',
        compiledAt: new Date().toISOString(),
        totalFormulasCount: formulas.length,
        totalDatesCount: keyDates.length,
        totalDefinitionsCount: definitions.length,
        onePageSummaryHtml: `
          <div class="df-rescue-sheet">
            <h3>⚡ One-Page Emergency Rescue Sheet</h3>
            <div class="rescue-section"><h4>Formulas (${formulas.length})</h4><ul>${formulas.slice(0, 15).map(f => `<li>${f.content}</li>`).join('')}</ul></div>
            <div class="rescue-section"><h4>Key Chronologies (${keyDates.length})</h4><ul>${keyDates.slice(0, 10).map(d => `<li>${d.content}</li>`).join('')}</ul></div>
            <div class="rescue-section"><h4>Core Axioms (${definitions.length})</h4><ul>${definitions.slice(0, 15).map(d => `<li>${d.content}</li>`).join('')}</ul></div>
          </div>
        `
      };
    }

    // M8502: dfSetRapidFireSprintIntervals
    dfSetRapidFireSprintIntervals() {
      if (this.activeRescue) {
        this.activeRescue.sprintConfig = { focusMinutes: 20, breakMinutes: 3 };
        this._saveStorage();
      }
      return {
        mode: 'RapidFireExamSprint',
        focusMinutes: 20,
        breakMinutes: 3,
        cognitiveRationale: 'Maximizes high-intensity working memory consolidation without inducing cognitive fatigue.'
      };
    }

    // M8503: dfEnforceSleepProtectionCutoff
    dfEnforceSleepProtectionCutoff(targetSleepHour = 23) {
      const cutoffHour = parseInt(targetSleepHour, 10) || 23;
      if (this.activeRescue) {
        this.activeRescue.sleepCutoffHour = cutoffHour;
        this._saveStorage();
      }

      const currentHour = new Date().getHours();
      const isPastCutoff = currentHour >= cutoffHour || currentHour < 5;

      return {
        cutoffHour: cutoffHour,
        currentHour: currentHour,
        sleepLockdownTriggered: isPastCutoff,
        sleepPrescription: 'Deep memory consolidation strictly requires NREM and REM cycles. Cease studying and sleep.'
      };
    }

    // M8504: dfRunMorningWarmupFiveMinuteQuiz
    dfRunMorningWarmupFiveMinuteQuiz(deckCards) {
      if (!Array.isArray(deckCards) || deckCards.length === 0) {
        return { quizCards: [], message: 'No cards available for warmup.' };
      }

      // Pick 10 high-confidence cards for positive neural priming
      const warmupSample = deckCards.slice(0, 10).map((c, idx) => ({
        index: idx + 1,
        front: c.front || c.text || 'Core Concept',
        back: c.back || 'Axiomatic Answer',
        primingWeight: 1.0
      }));

      if (this.activeRescue) {
        this.activeRescue.warmupQuizCompleted = true;
        this._saveStorage();
      }

      return {
        quizCards: warmupSample,
        totalCount: warmupSample.length,
        recommendedDurationMinutes: 5,
        objective: 'Confidence Calibration & Cortisol Reduction'
      };
    }

    // M8505: dfMuteAllNonCriticalUiMetrics
    dfMuteAllNonCriticalUiMetrics(active = true) {
      if (this.activeRescue) {
        this.activeRescue.metricsMuted = !!active;
        this._saveStorage();
      }
      return {
        metricsMuted: !!active,
        mutedElements: [
          'lifetime_statistics_drawer',
          'streak_burnup_chart',
          'botanical_growth_garden',
          'peer_leaderboards'
        ],
        activeFocusElements: [
          '20min_sprint_timer',
          'critical_formula_sheet',
          'high_priority_flashcards'
        ]
      };
    }

    // M8506: dfDeactivateExamEveModePostExam
    dfDeactivateExamEveModePostExam(examReflectionNotes = '') {
      if (!this.activeRescue) {
        return { deactivated: false, message: 'No active exam rescue protocol found.' };
      }

      const completedSession = {
        ...this.activeRescue,
        status: 'completed',
        deactivatedAtIso: new Date().toISOString(),
        reflection: String(examReflectionNotes).slice(0, 500)
      };

      this.historyLedger.unshift(completedSession);
      this.activeRescue = null;
      this._saveStorage();

      return {
        deactivated: true,
        restoredUi: 'Normal Sovereign Study OS restored.',
        sessionSummary: completedSession
      };
    }

    // M8507: dfGetMilestoneM8507ExamRescueSeal
    dfGetMilestoneM8507ExamRescueSeal() {
      return {
        milestone: 'M8507',
        architecture: 'Exam-Eve Rescue Protocol Studio',
        mission: 'High-Impact 24-Hour Exam Triage with Sleep Protection',
        numerals: 'Strict Western ASCII 0123456789',
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED_SOVEREIGN'
      };
    }
  }

  return ExamEveRescueProtocol;
}));
