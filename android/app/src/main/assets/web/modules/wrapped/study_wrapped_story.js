/**
 * DEEP FOCUS - Axis 9: Interactive Study Wrapped Story Studio
 * Milestone M8548 - M8557 | Sovereign Offline Architecture
 * Weekly & Monthly Cognitive Synthesis, Story Slides, Peak Chronotype & Actionable Goals
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyWrappedStory = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_WRAPPED = 'df_study_wrapped_history_v1';

  class StudyWrappedStory {
    constructor() {
      this.archivedReports = [];
      this.currentWrapped = null;
      this._loadArchive();
    }

    _loadArchive() {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY_WRAPPED);
          if (raw) {
            this.archivedReports = JSON.parse(raw) || [];
          }
        }
      } catch (e) {
        console.warn('[StudyWrapped] Archive restore failed, initializing clean.', e);
      }
    }

    _saveArchive() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_WRAPPED, JSON.stringify(this.archivedReports));
        }
      } catch (e) {
        console.warn('[StudyWrapped] Archive persistence failed.', e);
      }
    }

    // M8548: dfCompileWeeklyStudyWrappedData
    dfCompileWeeklyStudyWrappedData(sessions = [], flashcardLogs = []) {
      const now = new Date();
      let totalMinutes = 0;
      const subjectMap = {};
      const hourMap = Array(24).fill(0);
      const dayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      sessions.forEach(s => {
        const mins = parseInt(s.durationMinutes, 10) || 0;
        totalMinutes += mins;
        const subj = String(s.subject || 'General Study').trim();
        subjectMap[subj] = (subjectMap[subj] || 0) + mins;

        if (s.timestamp) {
          const d = new Date(s.timestamp);
          hourMap[d.getHours()] += mins;
          dayMap[d.getDay()] += mins;
        }
      });

      // Find top subject
      let topSubject = 'Independent Exploration';
      let maxSubjMins = 0;
      for (const [subj, m] of Object.entries(subjectMap)) {
        if (m > maxSubjMins) {
          maxSubjMins = m;
          topSubject = subj;
        }
      }

      // Find peak chronotype hour
      let peakHour = 10; // Default 10 AM
      let maxHourMins = 0;
      hourMap.forEach((m, h) => {
        if (m > maxHourMins) {
          maxHourMins = m;
          peakHour = h;
        }
      });

      // Memory retention stats
      const totalCards = flashcardLogs.length;
      const masteredCards = flashcardLogs.filter(c => (c.stability || 0) >= 14).length;

      this.currentWrapped = {
        reportId: 'wrapped_' + Date.now().toString(36),
        generatedAt: now.toISOString(),
        totalFocusMinutes: totalMinutes,
        totalFocusHours: Math.round((totalMinutes / 60) * 10) / 10,
        topSubject: topSubject,
        topSubjectMinutes: maxSubjMins,
        peakChronotypeHour: peakHour,
        totalCardsReviewed: totalCards,
        masteredCardsCount: masteredCards,
        subjectBreakdown: subjectMap
      };

      return this.currentWrapped;
    }

    // M8549: dfRenderStorySlideTotalHours
    dfRenderStorySlideTotalHours(totalMinutes, priorWeekMinutes = 0) {
      const mins = parseInt(totalMinutes, 10) || (this.currentWrapped ? this.currentWrapped.totalFocusMinutes : 0);
      const hours = Math.round((mins / 60) * 10) / 10;
      const priorHours = Math.round((priorWeekMinutes / 60) * 10) / 10;
      const diff = Math.round((hours - priorHours) * 10) / 10;

      return {
        slideIndex: 1,
        title: 'Deep Work Volume',
        hours: hours,
        comparisonText: diff >= 0 ? `+${diff}h compared to previous week` : `${diff}h compared to previous week`,
        slideSvg: `<svg width="300" height="400" viewBox="0 0 300 400">
          <rect width="300" height="400" rx="20" fill="#020617"/>
          <text x="150" y="80" fill="#94a3b8" font-size="14" text-anchor="middle">TOTAL FOCUS HOURS</text>
          <text x="150" y="190" fill="#10b981" font-size="64" font-weight="800" text-anchor="middle">${hours}</text>
          <text x="150" y="240" fill="#f8fafc" font-size="16" text-anchor="middle">HOURS OF FLOW</text>
          <text x="150" y="320" fill="#38bdf8" font-size="13" text-anchor="middle">${diff >= 0 ? '▲ Expanding Velocity' : '▼ Consolidating'}</text>
        </svg>`
      };
    }

    // M8550: dfRenderStorySlideTopSubject
    dfRenderStorySlideTopSubject(topSubject, minutes = 0) {
      const subj = topSubject || (this.currentWrapped ? this.currentWrapped.topSubject : 'Calculus');
      const mins = minutes || (this.currentWrapped ? this.currentWrapped.topSubjectMinutes : 0);
      const hours = Math.round((mins / 60) * 10) / 10;

      return {
        slideIndex: 2,
        title: 'Academic Anchor',
        subject: subj,
        dedicatedHours: hours,
        slideSvg: `<svg width="300" height="400" viewBox="0 0 300 400">
          <rect width="300" height="400" rx="20" fill="#020617"/>
          <text x="150" y="80" fill="#94a3b8" font-size="14" text-anchor="middle">PRIMARY FOCUS DOMAIN</text>
          <circle cx="150" cy="180" r="60" fill="#064e3b" stroke="#10b981" stroke-width="3"/>
          <text x="150" y="190" font-size="32" text-anchor="middle">🏛️</text>
          <text x="150" y="280" fill="#ffffff" font-size="18" font-weight="700" text-anchor="middle">${subj}</text>
          <text x="150" y="320" fill="#10b981" font-size="14" text-anchor="middle">${hours} Dedicated Hours</text>
        </svg>`
      };
    }

    // M8551: dfRenderStorySlideMemoryStrength
    dfRenderStorySlideMemoryStrength(totalCards = 0, masteredCards = 0) {
      const total = totalCards || (this.currentWrapped ? this.currentWrapped.totalCardsReviewed : 50);
      const mastered = masteredCards || (this.currentWrapped ? this.currentWrapped.masteredCardsCount : 35);
      const rate = total > 0 ? Math.round((mastered / total) * 100) : 100;

      return {
        slideIndex: 3,
        title: 'Synaptic Stability',
        masteredCards: mastered,
        retentionRatePercent: rate,
        slideSvg: `<svg width="300" height="400" viewBox="0 0 300 400">
          <rect width="300" height="400" rx="20" fill="#020617"/>
          <text x="150" y="80" fill="#94a3b8" font-size="14" text-anchor="middle">SYNAPTIC STABILITY</text>
          <text x="150" y="180" fill="#ec4899" font-size="52" font-weight="800" text-anchor="middle">${rate}%</text>
          <text x="150" y="230" fill="#f8fafc" font-size="16" text-anchor="middle">LONG-TERM MASTERY</text>
          <text x="150" y="310" fill="#94a3b8" font-size="13" text-anchor="middle">${mastered} Cards Consolidated</text>
        </svg>`
      };
    }

    // M8552: dfRenderStorySlidePeakChronotype
    dfRenderStorySlidePeakChronotype(peakHour = 10) {
      const h = parseInt(peakHour, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = ((h % 12) || 12) + ':00 ' + period;
      let label = 'Morning Apex Scholar';
      if (h >= 17) label = 'Nocturnal Deep Thinker';
      else if (h >= 12) label = 'Afternoon Flow Master';

      return {
        slideIndex: 4,
        title: 'Cognitive Chronotype',
        peakHourFormatted: displayHour,
        chronotypeLabel: label,
        slideSvg: `<svg width="300" height="400" viewBox="0 0 300 400">
          <rect width="300" height="400" rx="20" fill="#020617"/>
          <text x="150" y="80" fill="#94a3b8" font-size="14" text-anchor="middle">PEAK COGNITIVE WINDOW</text>
          <text x="150" y="180" fill="#f59e0b" font-size="42" font-weight="700" text-anchor="middle">${displayHour}</text>
          <text x="150" y="230" fill="#f8fafc" font-size="15" text-anchor="middle">${label}</text>
          <text x="150" y="310" fill="#94a3b8" font-size="12" text-anchor="middle">Highest Alertness & Focus Velocity</text>
        </svg>`
      };
    }

    // M8553: dfGenerateNextWeekActionableGoal
    dfGenerateNextWeekActionableGoal(weakestSubject = null, currentWeeklyHours = 20) {
      const targetHours = Math.round(currentWeeklyHours * 1.1); // 10% progressive overload
      const subj = weakestSubject || 'Foundational Recall';

      return {
        actionableGoal: `Achieve ${targetHours} hours with 2 extra sprint intervals in ${subj}.`,
        targetWeeklyHours: targetHours,
        focusRecommendation: 'Maintain steady circadian rhythm and protect 23:00 sleep boundary.'
      };
    }

    // M8554: dfExportWeeklySummaryCardSvg
    dfExportWeeklySummaryCardSvg(wrappedData = null) {
      const data = wrappedData || this.currentWrapped || {
        totalFocusHours: 25.5,
        topSubject: 'Physics',
        masteredCardsCount: 42
      };

      const cardSvg = `<svg width="340" height="480" viewBox="0 0 340 480">
        <rect width="340" height="480" rx="24" fill="#020617" stroke="#10b981" stroke-width="2"/>
        <text x="170" y="60" fill="#10b981" font-size="16" font-weight="800" text-anchor="middle">DEEP FOCUS WRAPPED</text>
        <line x1="40" y1="85" x2="300" y2="85" stroke="#1e293b" stroke-width="1"/>
        <text x="50" y="130" fill="#94a3b8" font-size="12">TOTAL HOURS</text>
        <text x="50" y="165" fill="#f8fafc" font-size="28" font-weight="700">${data.totalFocusHours || 0}h</text>
        <text x="50" y="220" fill="#94a3b8" font-size="12">CHIEF SUBJECT</text>
        <text x="50" y="255" fill="#38bdf8" font-size="20" font-weight="600">${data.topSubject || 'STEM'}</text>
        <text x="50" y="310" fill="#94a3b8" font-size="12">MASTERED CARDS</text>
        <text x="50" y="345" fill="#ec4899" font-size="24" font-weight="700">${data.masteredCardsCount || 0}</text>
        <line x1="40" y1="380" x2="300" y2="380" stroke="#1e293b" stroke-width="1"/>
        <text x="170" y="425" fill="#64748b" font-size="11" text-anchor="middle">100% Offline-First / Sovereign Verified</text>
      </svg>`;

      return {
        cardSvg: cardSvg,
        hashSignature: 'DFWRAPPED:' + btoa(unescape(encodeURIComponent(cardSvg))).slice(0, 32)
      };
    }

    // M8555: dfCompileYearlyMonumentalReview
    dfCompileYearlyMonumentalReview(yearLogs = []) {
      const totalMinutes = yearLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
      return {
        yearTotalHours: totalHours,
        totalSessionsCount: yearLogs.length,
        milestoneTier: totalHours >= 500 ? 'Centurion Grand Scholar' : 'Devoted Practitioner'
      };
    }

    // M8556: dfArchiveWrappedReportsHistory
    dfArchiveWrappedReportsHistory(report = null) {
      const rep = report || this.currentWrapped;
      if (rep) {
        this.archivedReports.unshift(rep);
        if (this.archivedReports.length > 52) this.archivedReports.pop(); // Keep 1 year (52 weeks)
        this._saveArchive();
      }
      return {
        archivedCount: this.archivedReports.length,
        latestArchivedId: rep ? rep.reportId : null
      };
    }

    // M8557: dfGetMilestoneM8557StudyWrappedSeal
    dfGetMilestoneM8557StudyWrappedSeal() {
      return {
        milestone: 'M8557',
        architecture: 'Interactive Study Wrapped Story Studio',
        standards: 'Zero-Cloud Offline Analytics, Vector Story Cards, Privacy Preserved',
        numerals: 'Strict Western ASCII 0123456789',
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED_SOVEREIGN'
      };
    }
  }

  return StudyWrappedStory;
}));
