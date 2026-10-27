/** Deep Focus Room6 F07 — safe active recall viewmodel/score adapter over the real merged flashcard and recall-capsule engines; scores come from actual answers only, no storage, no network, no fabricated score or credits. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusActiveRecallAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const FLASHCARD_ENGINE_PATH = '../active_recall_flashcard_engine.js';
  const CAPSULE_ENGINE_PATH = '../active_recall_capsule_engine.js';
  const FLASHCARD_ENGINE_KEY = 'ActiveRecallFlashcardEngine';
  const CAPSULE_ENGINE_KEY = 'ActiveRecallCapsuleEngine';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
  const finiteMs = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const plainFreeze = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => plainFreeze(entry));
      Object.freeze(value);
      return value;
    }
    if (record(value)) {
      for (const key of Object.keys(value)) plainFreeze(value[key]);
      Object.freeze(value);
      return value;
    }
    return value;
  };

  const INTENT_TYPES = Object.freeze({
    REVIEW_CARD: 'active-recall/review-card',
    ADD_CARD: 'active-recall/add-card',
    SEAL_CAPSULE: 'active-recall/seal-capsule'
  });
  const FLUENCY_TIERS = Object.freeze({
    FLUID: 'fluency_fluid',
    PARTIAL: 'fluency_partial',
    EFFORTFUL: 'fluency_effortful'
  });
  const RATING_KEYS = Object.freeze(['again', 'hard', 'good', 'easy']);
  const RATING_WEIGHTS = Object.freeze({ again: 0, hard: 0.5, good: 1, easy: 1 });
  const CREDIT_POLICY = Object.freeze({
    creditsIssued: null,
    reason: 'active recall scores are advisory; no credit currency is derived or fabricated'
  });

  function resolveEngines(flashcardModule, capsuleModule) {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return {
        flashcards: flashcardModule === undefined ? require(FLASHCARD_ENGINE_PATH) : flashcardModule,
        capsule: capsuleModule === undefined ? require(CAPSULE_ENGINE_PATH) : capsuleModule
      };
    }
    const rootRef = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : null);
    const flashcards = rootRef && rootRef[FLASHCARD_ENGINE_KEY];
    const capsule = rootRef && rootRef[CAPSULE_ENGINE_KEY];
    if (!flashcards || !capsule) {
      throw new Error('Active Recall engines are required: load active_recall_flashcard_engine.js and active_recall_capsule_engine.js first');
    }
    return { flashcards, capsule };
  }

  const snapshotCards = (cards) => plainFreeze(Array.isArray(cards)
    ? cards.filter((card) => record(card)).map((card) => ({ ...card }))
    : []);

  function createActiveRecallAdapter(flashcardModule, capsuleModule) {
    if (flashcardModule === null || capsuleModule === null) {
      throw new Error('Active Recall engines are required: load active_recall_flashcard_engine.js and active_recall_capsule_engine.js first');
    }
    const resolved = flashcardModule === undefined && capsuleModule === undefined
      ? resolveEngines(undefined, undefined)
      : { flashcards: flashcardModule, capsule: capsuleModule };
    const flashcards = resolved.flashcards;
    const capsule = resolved.capsule;
    if (!flashcards || typeof flashcards.createCard !== 'function' || typeof flashcards.reviewCard !== 'function' ||
        typeof flashcards.getDueCards !== 'function' || typeof flashcards.getDeckStatistics !== 'function') {
      throw new Error('ActiveRecallFlashcardEngine engine is required: load active_recall_flashcard_engine.js first');
    }
    if (!capsule || typeof capsule.createRecallCapsule !== 'function' || typeof capsule.evaluateFluency !== 'function') {
      throw new Error('ActiveRecallCapsuleEngine engine is required: load active_recall_capsule_engine.js first');
    }

    function resolveExplicitTiming(startedAtMs, endedAtMs) {
      if (typeof startedAtMs !== 'number' || (typeof endedAtMs !== 'number' && endedAtMs !== null)) {
        return { ok: false, errors: [{ code: 'NON_NUMERIC_MS', field: 'startedAtMs' }] };
      }
      if (endedAtMs === null) {
        return { ok: true, durationSeconds: null, startedAtMs, endedAtMs, source: 'explicit' };
      }
      if (!Number.isSafeInteger(startedAtMs) || startedAtMs < 0) {
        return { ok: false, errors: [{ code: 'NON_INTEGER_MS', field: 'startedAtMs' }] };
      }
      if (!Number.isSafeInteger(endedAtMs) || endedAtMs < 0) {
        return { ok: false, errors: [{ code: 'NON_INTEGER_MS', field: 'endedAtMs' }] };
      }
      const elapsedMs = endedAtMs - startedAtMs;
      if (elapsedMs < 0) {
        return { ok: false, errors: [{ code: 'NONPOSITIVE_ELAPSED_MS', field: 'startedAtMs' }] };
      }
      const clampedSeconds = Math.min(60, Math.max(1, Math.floor(elapsedMs / 1000)));
      const source = elapsedMs > 60000 ? 'clamped-to-capsule-window' : 'explicit';
      return { ok: true, durationSeconds: clampedSeconds, startedAtMs, endedAtMs, source };
    }

    function classifyAnswers(rawAnswers, durationSeconds) {
      if (!Array.isArray(rawAnswers)) {
        return { ok: false, errors: [{ code: 'ANSWERS_NOT_ARRAY', field: 'retrievalAnswers' }] };
      }
      const entries = rawAnswers.map((entry) => {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return { raw: entry, kept: true, normalized: entry.trim() };
        }
        return { raw: entry === undefined ? null : entry, kept: false, normalized: null };
      });
      const kept = entries.filter((entry) => entry.kept).map((entry) => entry.normalized);
      const estimate = capsule.evaluateFluency(kept, durationSeconds);
      if (estimate.pointsCount !== kept.length) {
        return { ok: false, errors: [{ code: 'ANSWER_COUNT_MISMATCH', field: 'retrievalAnswers' }] };
      }
      return {
        ok: true,
        entries,
        points: Object.freeze(kept),
        pointsCount: kept.length,
        droppedCount: entries.length - kept.length,
        durationSeconds: estimate.durationSeconds,
        formattedDuration: estimate.formattedDuration,
        fluencyTier: estimate.fluencyTier,
        flagForReview: estimate.flagForReview
      };
    }

    function scoreRecallAnswers(rawAnswers, startedAtMs, endedAtMs) {
      const timing = resolveExplicitTiming(startedAtMs, endedAtMs);
      if (!timing.ok) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors(timing.errors),
          points: Object.freeze([]),
          pointsCount: null,
          durationSeconds: null,
          fluencyTier: null,
          flagForReview: null
        });
      }
      if (timing.durationSeconds === null) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors([{ code: 'MISSING_DURATION', field: 'endedAtMs' }]),
          points: Object.freeze([]),
          pointsCount: null,
          durationSeconds: null,
          fluencyTier: null,
          flagForReview: null
        });
      }
      const classified = classifyAnswers(rawAnswers, timing.durationSeconds);
      if (!classified.ok) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors(classified.errors),
          points: Object.freeze([]),
          pointsCount: null,
          durationSeconds: timing.durationSeconds,
          fluencyTier: null,
          flagForReview: null
        });
      }
      return Object.freeze({
        ok: true,
        points: classified.points,
        pointsCount: classified.pointsCount,
        droppedCount: classified.droppedCount,
        durationSeconds: classified.durationSeconds,
        formattedDuration: classified.formattedDuration,
        fluencyTier: classified.fluencyTier,
        flagForReview: classified.flagForReview,
        timing: plainFreeze(timing)
      });
    }

    function createCardViewModel(card, todayStr) {
      const due = todayStr !== undefined && card.nextReviewDate !== undefined && card.nextReviewDate !== null
        ? String(card.nextReviewDate) <= todayStr
        : null;
      return Object.freeze({
        id: card.id,
        deckId: card.deckId,
        prompt: card.prompt,
        answer: card.answer,
        notes: card.notes,
        repetitions: card.repetitions,
        intervalDays: card.intervalDays,
        easeFactor: card.easeFactor,
        lastReviewed: card.lastReviewed === undefined ? null : card.lastReviewed,
        nextReviewDate: card.nextReviewDate,
        isDue: due
      });
    }

    function createFlashcardViewModel(cards, currentDateStr) {
      if (!Array.isArray(cards)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'CARDS_NOT_ARRAY', field: 'cards' }]) });
      }
      const today = currentDateStr === undefined ? null : String(currentDateStr || '');
      const cardErrors = [];
      cards.forEach((card, index) => {
        if (!record(card) || typeof card !== 'object' || !card.id || typeof card.nextReviewDate !== 'string') {
          cardErrors.push({ code: 'INVALID_CARD', field: `cards[${index}]`, index });
        }
      });
      if (cardErrors.length) {
        return Object.freeze({ ok: false, errors: frozenErrors(cardErrors) });
      }
      const stats = flashcards.getDeckStatistics(cards, today);
      const dueIds = Object.freeze(flashcards.getDueCards(cards, today).map((card) => card.id));
      const studiedCount = cards.filter((card) => (card.repetitions || 0) > 0).length;
      const viewmodel = Object.freeze({
        deck: Object.freeze({
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          masteryRate: stats.masteryRate,
          dueCardIds: dueIds,
          studiedCards: studiedCount,
          minutesHint: null
        }),
        cards: Object.freeze(cards.map((card) => createCardViewModel(card, today)))
      });
      return Object.freeze({ ok: true, kind: 'flashcards-vm', viewmodel });
    }

    function createRecallCapsuleViewModel(capsuleRecord) {
      if (!record(capsuleRecord) || typeof capsuleRecord.capsuleId !== 'string' || !capsuleRecord.capsuleId ||
          !record(capsuleRecord.fluency) || !Array.isArray(capsuleRecord.retrievalPoints)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'INVALID_CAPSULE', field: 'capsule' }]) });
      }
      const points = capsuleRecord.retrievalPoints;
      const invalidPoint = points.findIndex((point) => typeof point !== 'string');
      if (invalidPoint !== -1) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors([{ code: 'INVALID_CAPSULE', field: `retrievalPoints[${invalidPoint}]` }])
        });
      }
      const recomputed = capsule.evaluateFluency(points, capsuleRecord.fluency.durationSeconds);
      if (recomputed.pointsCount !== capsuleRecord.fluency.pointsCount ||
          recomputed.fluencyTier !== capsuleRecord.fluency.fluencyTier ||
          recomputed.flagForReview !== capsuleRecord.fluency.flagForReview) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors([{ code: 'CAPSULE_FLUENCY_MISMATCH', field: 'fluency' }])
        });
      }
      const viewmodel = Object.freeze({
        capsuleId: capsuleRecord.capsuleId,
        sessionRef: capsuleRecord.sessionRef,
        subject: capsuleRecord.subject,
        status: capsuleRecord.status,
        points: Object.freeze(points.slice()),
        pointsCount: recomputed.pointsCount,
        durationSeconds: recomputed.durationSeconds,
        formattedDuration: recomputed.formattedDuration,
        fluencyTier: recomputed.fluencyTier,
        flagForReview: recomputed.flagForReview
      });
      return Object.freeze({ ok: true, kind: 'capsule-vm', viewmodel });
    }

    function computeRecallScore(ratings) {
      if (!Array.isArray(ratings)) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors([{ code: 'RATINGS_NOT_ARRAY', field: 'ratings' }]),
          reviewed: 0,
          counts: Object.freeze({ again: 0, hard: 0, good: 0, easy: 0 }),
          scorePercent: null,
          creditPolicy: CREDIT_POLICY
        });
      }
      const errors = [];
      const counts = { again: 0, hard: 0, good: 0, easy: 0 };
      let reviewed = 0;
      let weight = 0;
      ratings.forEach((rating, index) => {
        if (Number.isInteger(rating) && rating >= 0 && rating <= 3) {
          reviewed += 1;
          counts[RATING_KEYS[rating]] += 1;
          weight += RATING_WEIGHTS[RATING_KEYS[rating]];
        } else {
          errors.push({ code: 'INVALID_RATING', field: `ratings[${index}]`, index });
        }
      });
      if (errors.length) {
        return Object.freeze({
          ok: false,
          errors: frozenErrors(errors),
          reviewed,
          counts: Object.freeze(counts),
          scorePercent: null,
          creditPolicy: CREDIT_POLICY
        });
      }
      const scorePercent = reviewed > 0 ? Math.round((weight / reviewed) * 100) : null;
      return Object.freeze({
        ok: true,
        reviewed,
        counts: Object.freeze(counts),
        scorePercent,
        creditPolicy: CREDIT_POLICY
      });
    }

    const createReviewIntent = (cardId, rating) => plainFreeze({ type: INTENT_TYPES.REVIEW_CARD, cardId, rating });
    const createAddCardIntent = (prompt, answer, deckId, notes) => plainFreeze({
      type: INTENT_TYPES.ADD_CARD,
      prompt: String(prompt).trim(),
      answer: String(answer).trim(),
      deckId: deckId === undefined || deckId === null ? 'default' : String(deckId).trim(),
      notes: String(notes === undefined ? '' : notes).trim()
    });
    const createSealCapsuleIntent = (retrievalAnswers, startedAtMs, endedAtMs, options) => {
      const opts = record(options) ? options : {};
      const intent = {
        type: INTENT_TYPES.SEAL_CAPSULE,
        retrievalAnswers: Array.isArray(retrievalAnswers)
          ? retrievalAnswers.slice()
          : (retrievalAnswers === undefined ? [] : retrievalAnswers),
        startedAtMs,
        endedAtMs,
        subject: opts.subject === undefined ? undefined : String(opts.subject).trim(),
        sessionRef: opts.sessionRef === undefined ? undefined : String(opts.sessionRef).trim()
      };
      return plainFreeze(intent);
    };

    function applyIntent(cards, intent, reviewTimestampMs) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          cards: snapshotCards(cards),
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      if (intent.type !== INTENT_TYPES.REVIEW_CARD && intent.type !== INTENT_TYPES.ADD_CARD && intent.type !== INTENT_TYPES.SEAL_CAPSULE) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          cards: snapshotCards(cards),
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }

      if (intent.type === INTENT_TYPES.SEAL_CAPSULE) {
        const timing = resolveExplicitTiming(intent.startedAtMs, intent.endedAtMs);
        if (!timing.ok || timing.durationSeconds === null) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors(timing.ok ? [{ code: 'MISSING_DURATION', field: 'endedAtMs' }] : timing.errors)
          });
        }
        const scored = scoreRecallAnswers(intent.retrievalAnswers, intent.startedAtMs, intent.endedAtMs);
        if (!scored.ok) {
          return Object.freeze({ ok: false, intentType: intent.type, errors: scored.errors });
        }
        const opts = record(intent) ? intent : {};
        const sealed = capsule.createRecallCapsule(opts.sessionRef, scored.points, scored.durationSeconds, opts.subject);
        if (sealed.retrievalPoints.length !== scored.pointsCount) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'CAPSULE_ENGINE_MISMATCH', field: 'retrievalPoints' }])
          });
        }
        const safeCards = snapshotCards(cards);
        return Object.freeze({
          ok: true,
          intentType: intent.type,
          changed: false,
          cards: plainFreeze(safeCards),
          capsule: plainFreeze(sealed),
          score: scored
        });
      }

      if (!Array.isArray(cards)) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'CARDS_NOT_ARRAY', field: 'cards' }])
        });
      }

      if (intent.type === INTENT_TYPES.REVIEW_CARD) {
        if (typeof intent.cardId !== 'string' || !intent.cardId) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'CARD_ID_INVALID', field: 'cardId' }])
          });
        }
        if (!Number.isInteger(intent.rating) || intent.rating < 0 || intent.rating > 3) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'RATING_INVALID', field: 'rating' }])
          });
        }
        const index = cards.findIndex((card) => record(card) && card.id === intent.cardId);
        if (index === -1) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'CARD_NOT_FOUND', field: 'cardId' }])
          });
        }
        const before = cards[index];
        const reviewed = flashcards.reviewCard(before, intent.rating, reviewTimestampMs);
        const nextCards = cards.map((card) => ({ ...card }));
        nextCards.splice(index, 1, reviewed);
        const changed = JSON.stringify(reviewed) !== JSON.stringify(before);
        return Object.freeze({
          ok: true,
          intentType: intent.type,
          changed,
          cards: plainFreeze(nextCards),
          reviewedCard: plainFreeze(reviewed)
        });
      }

      if (typeof intent.prompt !== 'string' || !intent.prompt.trim() || !record(intent) ) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'CARD_PROMPT_INVALID', field: 'prompt' }])
        });
      }
      if (typeof intent.answer !== 'string' || !intent.answer.trim()) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'CARD_ANSWER_INVALID', field: 'answer' }])
        });
      }
      const created = flashcards.createCard(intent.deckId, intent.prompt, intent.answer, intent.notes);
      const nextCards = cards.map((card) => ({ ...card })).concat([created]);
      return Object.freeze({
        ok: true,
        intentType: intent.type,
        changed: true,
        cards: plainFreeze(nextCards),
        createdCard: plainFreeze(created)
      });
    }

    function safeRenderPlan(bundle, options) {
      const opts = record(options) ? options : {};
      const attrs = { class: 'active-recall', role: 'group', 'aria-label': 'Active recall' };
      if (opts.dir === 'rtl' || opts.dir === 'ltr' || opts.dir === 'auto') attrs.dir = opts.dir;
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      if (!record(bundle) || typeof bundle.kind !== 'string') {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'NOT_A_VIEWMODEL', field: 'bundle' }]) });
      }
      let summaryText = '';
      let listNodes = [];
      let extra = [];
      if (bundle.kind === 'flashcards-vm') {
        const deck = bundle.viewmodel.deck;
        summaryText = `${deck.dueCards} of ${deck.totalCards} cards due - mastery ${deck.masteryRate}%`;
        listNodes = bundle.viewmodel.cards
          .filter((card) => card.isDue)
          .map((card) => Object.freeze({
            tag: 'li',
            attrs: Object.freeze({ class: 'active-recall-due-card', 'data-card-id': card.id }),
            children: Object.freeze([
              leaf('span', 'active-recall-card-prompt', card.prompt),
              leaf('span', 'active-recall-card-schedule', `interval ${String(card.intervalDays)}d, next ${card.nextReviewDate}`)
            ])
          }));
        extra = [leaf('p', 'active-recall-credits', 'No credits issued for recall scores')];
      } else if (bundle.kind === 'capsule-vm') {
        summaryText = `${bundle.viewmodel.pointsCount} insights captured`;
        listNodes = bundle.viewmodel.points.map((point) => Object.freeze({
          tag: 'li',
          attrs: Object.freeze({ class: 'active-recall-capsule-point' }),
          children: Object.freeze([Object.freeze({
            tag: 'span',
            attrs: Object.freeze({ class: 'active-recall-point-text', dir: 'auto' }),
            text: point,
            children: Object.freeze([])
          })])
        }));
        extra = [
          leaf('p', 'active-recall-capsule-timing', `${bundle.viewmodel.formattedDuration} retrieval window`),
          leaf('p', 'active-recall-capsule-flag', bundle.viewmodel.flagForReview ? 'Flagged for review backlog' : 'No review backlog flag')
        ];
      } else {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'NOT_A_VIEWMODEL', field: 'bundle.kind' }]) });
      }
      return Object.freeze({
        ok: true,
        plan: Object.freeze({
          tag: 'section',
          attrs: Object.freeze(attrs),
          children: Object.freeze([
            leaf('p', 'active-recall-summary', summaryText),
            ...extra,
            Object.freeze({
              tag: 'ol',
              attrs: Object.freeze({ class: 'active-recall-list', 'aria-label': 'Active recall entries' }),
              children: Object.freeze(listNodes)
            })
          ])
        })
      });
    }

    function mountRecallView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountRecallView requires a DOM document factory');
      }
      const build = (node) => {
        const element = doc.createElement(node.tag);
        for (const [name, value] of Object.entries(node.attrs || {})) element.setAttribute(name, value);
        if (typeof node.text === 'string') element.textContent = node.text;
        for (const child of node.children || []) element.appendChild(build(child));
        return element;
      };
      const mounted = build(plan);
      if (target) target.appendChild(mounted);
      return mounted;
    }

    return Object.freeze({
      flashcards,
      capsule,
      INTENT_TYPES,
      RATING_WEIGHTS,
      CREDIT_POLICY,
      scoreRecallAnswers,
      computeRecallScore,
      createFlashcardViewModel,
      createRecallCapsuleViewModel,
      createReviewIntent,
      createAddCardIntent,
      createSealCapsuleIntent,
      applyIntent,
      safeRenderPlan,
      mountRecallView
    });
  }

  const defaultAdapter = createActiveRecallAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createActiveRecallAdapter }));
});
