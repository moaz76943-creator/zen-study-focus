/** Deep Focus Room6 F08 — offline study queue preview and honest due views over the merged spaced repetition and Leitner box engines; due state comes from explicit civil date strings and caller-supplied elapsed days only, with zero hidden clock reads, zero storage and zero network. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusSpacedRepetitionAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {

  const SPACED_ENGINE_PATH = '../spaced_repetition_engine.js';
  const LEITNER_ENGINE_PATH = '../leitner_box_flashcard_engine.js';
  const SPACED_ENGINE_KEY = 'SpacedRepetitionEngine';
  const LEITNER_ENGINE_KEY = 'LeitnerBoxFlashcardEngine';
  const FEEDBACK_RATINGS = Object.freeze(['easy', 'hard', 'forgot']);
  const CIVIL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DAYS_IN_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  const EMPTY_COUNTS = Object.freeze({
    topicsTotal: 0,
    cardsTotal: 0,
    spacedDue: 0,
    leitnerDue: 0,
    dueTotal: 0,
    masteredExcluded: 0
  });
  const DUE_POLICY = Object.freeze({
    spacedTopics: 'due when nextReviewDate <= the supplied civil today string; overdueDays is a pure calendar difference of the two strings',
    leitnerCards: 'due when daysSinceReview >= the Leitner box interval; both inputs are caller-supplied values',
    clockReads: 0,
    storage: 'none - nothing is persisted or cached between calls',
    network: 'offline-only preview'
  });

  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
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

  function parseCivil(value) {
    if (typeof value !== 'string') return null;
    const match = CIVIL_PATTERN.exec(value);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (m < 1 || m > 12) return null;
    let maxDay = DAYS_IN_MONTH[m - 1];
    if (m === 2 && (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) maxDay = 29;
    if (d < 1 || d > maxDay) return null;
    return { y, m, d };
  }

  function daysFromCivil({ y, m, d }) {
    const yy = m <= 2 ? y - 1 : y;
    const era = Math.floor(yy / 400);
    const yoe = yy - era * 400;
    const mp = m + (m > 2 ? -3 : 9);
    const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  function civilDaysBetween(fromStr, toStr) {
    const from = parseCivil(fromStr);
    const to = parseCivil(toStr);
    return from && to ? daysFromCivil(to) - daysFromCivil(from) : null;
  }

  function resolveEngines(spacedModule, leitnerModule) {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return {
        spaced: spacedModule === undefined ? require(SPACED_ENGINE_PATH) : spacedModule,
        leitner: leitnerModule === undefined ? require(LEITNER_ENGINE_PATH) : leitnerModule
      };
    }
    const rootRef = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : null);
    const spaced = rootRef && rootRef[SPACED_ENGINE_KEY];
    const leitner = rootRef && rootRef[LEITNER_ENGINE_KEY];
    if (!spaced || !leitner) {
      throw new Error('Spaced repetition engines are required: load spaced_repetition_engine.js and leitner_box_flashcard_engine.js first');
    }
    return { spaced, leitner };
  }

  function createSpacedRepetitionAdapter(spacedModule, leitnerModule) {
    if (spacedModule === null || leitnerModule === null) {
      throw new Error('Spaced repetition engines are required: load spaced_repetition_engine.js and leitner_box_flashcard_engine.js first');
    }
    const resolved = spacedModule === undefined && leitnerModule === undefined
      ? resolveEngines(undefined, undefined)
      : { spaced: spacedModule, leitner: leitnerModule };
    const spaced = resolved.spaced;
    const leitner = resolved.leitner;
    if (!spaced || typeof spaced.addDaysCivil !== 'function' || typeof spaced.evaluateRecallFeedback !== 'function' ||
        typeof spaced.filterDueReviewTopics !== 'function' || typeof spaced.generateReviewTaskPayload !== 'function' ||
        !record(spaced.INTERVAL_DAYS)) {
      throw new Error('SpacedRepetitionEngine engine is required: load spaced_repetition_engine.js first');
    }
    if (!leitner || typeof leitner.processCardReviewResult !== 'function' || typeof leitner.filterDueCards !== 'function' ||
        typeof leitner.toWesternDigits !== 'function' || !record(leitner.BOX_INTERVALS_DAYS)) {
      throw new Error('LeitnerBoxFlashcardEngine engine is required: load leitner_box_flashcard_engine.js first');
    }

    const SPACED_INTERVALS = Object.freeze({
      1: spaced.INTERVAL_DAYS[1],
      2: spaced.INTERVAL_DAYS[2],
      3: spaced.INTERVAL_DAYS[3],
      4: spaced.INTERVAL_DAYS[4]
    });
    const LEITNER_INTERVALS = Object.freeze({
      1: leitner.BOX_INTERVALS_DAYS[1],
      2: leitner.BOX_INTERVALS_DAYS[2],
      3: leitner.BOX_INTERVALS_DAYS[3],
      4: leitner.BOX_INTERVALS_DAYS[4],
      5: leitner.BOX_INTERVALS_DAYS[5]
    });

    function validateTopic(item, index, errors) {
      if (!record(item)) {
        errors.push({ code: 'INVALID_TOPIC', field: `topics[${index}]`, index });
        return false;
      }
      if (typeof item.id !== 'string' || !item.id) {
        errors.push({ code: 'INVALID_TOPIC', field: `topics[${index}].id`, index });
        return false;
      }
      if (!Number.isInteger(item.box) || item.box < 1 || item.box > 4) {
        errors.push({ code: 'INVALID_TOPIC', field: `topics[${index}].box`, index });
        return false;
      }
      if (item.isMastered !== true && item.isMastered !== false) {
        errors.push({ code: 'INVALID_TOPIC', field: `topics[${index}].isMastered`, index });
        return false;
      }
      if (item.isMastered === false && !parseCivil(item.nextReviewDate)) {
        errors.push({ code: 'INVALID_TOPIC', field: `topics[${index}].nextReviewDate`, index });
        return false;
      }
      return true;
    }

    function validateCard(item, index, errors) {
      if (!record(item)) {
        errors.push({ code: 'INVALID_CARD', field: `cards[${index}]`, index });
        return false;
      }
      if (typeof item.id !== 'string' || !item.id) {
        errors.push({ code: 'INVALID_CARD', field: `cards[${index}].id`, index });
        return false;
      }
      if (!Number.isInteger(item.box) || item.box < 1 || item.box > 5) {
        errors.push({ code: 'INVALID_CARD', field: `cards[${index}].box`, index });
        return false;
      }
      if (!Number.isInteger(item.daysSinceReview) || item.daysSinceReview < 0) {
        errors.push({ code: 'INVALID_CARD', field: `cards[${index}].daysSinceReview`, index });
        return false;
      }
      return true;
    }

    function compareQueueEntries(a, b) {
      if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
      if (a.intervalDays !== b.intervalDays) return a.intervalDays - b.intervalDays;
      const rankA = a.source === 'spaced-topic' ? 0 : 1;
      const rankB = b.source === 'spaced-topic' ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }

    function entryFromSpacedTopic(topic, todayStr) {
      const nextReviewDate = parseCivil(topic.nextReviewDate) ? topic.nextReviewDate : null;
      const overdueDays = nextReviewDate ? civilDaysBetween(nextReviewDate, todayStr) : 0;
      return {
        source: 'spaced-topic',
        kind: 'topic',
        id: topic.id,
        label: topic.title,
        category: typeof topic.category === 'string' ? topic.category : null,
        box: topic.box,
        intervalDays: SPACED_INTERVALS[topic.box],
        nextReviewDate,
        overdueDays,
        priority: topic.box === 1 ? 'high' : 'normal'
      };
    }

    function entryFromLeitnerCard(dueCard) {
      const overdueDays = Math.max(0, dueCard.daysSinceReview - dueCard.dueInterval);
      return {
        source: 'leitner-card',
        kind: 'flashcard',
        id: dueCard.id,
        label: dueCard.id,
        category: null,
        box: dueCard.box,
        intervalDays: dueCard.dueInterval,
        nextReviewDate: null,
        daysSinceReview: dueCard.daysSinceReview,
        overdueDays,
        priority: dueCard.box === 1 ? 'high' : 'normal'
      };
    }

    function createStudyQueuePreview(topics, cards, todayStr) {
      const errors = [];
      if (!Array.isArray(topics)) errors.push({ code: 'TOPICS_NOT_ARRAY', field: 'topics' });
      if (!Array.isArray(cards)) errors.push({ code: 'CARDS_NOT_ARRAY', field: 'cards' });
      if (todayStr === undefined || todayStr === null || !parseCivil(todayStr)) {
        errors.push({ code: 'INVALID_TODAY', field: 'todayStr' });
      }
      if (errors.length) {
        return Object.freeze({ ok: false, errors: frozenErrors(errors), queue: Object.freeze([]), counts: EMPTY_COUNTS, duePolicy: DUE_POLICY });
      }
      const today = String(todayStr);
      const itemErrors = [];
      topics.forEach((topic, index) => validateTopic(topic, index, itemErrors));
      cards.forEach((card, index) => validateCard(card, index, itemErrors));
      if (itemErrors.length) {
        return Object.freeze({ ok: false, errors: frozenErrors(itemErrors), queue: Object.freeze([]), counts: EMPTY_COUNTS, duePolicy: DUE_POLICY });
      }

      const spacedDue = spaced.filterDueReviewTopics(topics, today);
      const leitnerResult = leitner.filterDueCards(cards);
      const masteredExcluded = topics.filter((topic) => topic.isMastered === true).length;

      const entries = []
        .concat(spacedDue.map((topic) => entryFromSpacedTopic(topic, today)))
        .concat(leitnerResult.dueQueue.map((card) => entryFromLeitnerCard(card)))
        .sort(compareQueueEntries);

      const counts = {
        topicsTotal: topics.length,
        cardsTotal: cards.length,
        spacedDue: spacedDue.length,
        leitnerDue: leitnerResult.dueCount,
        dueTotal: spacedDue.length + leitnerResult.dueCount,
        masteredExcluded
      };
      return Object.freeze({
        ok: true,
        kind: 'study-queue-preview',
        today,
        offline: true,
        counts: Object.freeze(counts),
        queue: plainFreeze(entries),
        duePolicy: DUE_POLICY
      });
    }

    function evaluateTopicFeedback(topicItem, rating, reviewDate) {
      if (!record(topicItem)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'TOPIC_NOT_RECORD', field: 'topic' }]), result: null });
      }
      if (!FEEDBACK_RATINGS.includes(rating)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'FEEDBACK_RATING_INVALID', field: 'rating' }]), result: null });
      }
      if (!(reviewDate instanceof Date) || isNaN(reviewDate.getTime())) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'REVIEW_DATE_REQUIRED', field: 'reviewDate' }]), result: null });
      }
      const result = spaced.evaluateRecallFeedback(topicItem, rating, reviewDate);
      if (!record(result)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'SPACED_ENGINE_REFUSED', field: 'topic' }]), result: null });
      }
      return Object.freeze({ ok: true, rating, result: plainFreeze(result) });
    }

    function planCardReview(currentBox, isCorrect) {
      if (!Number.isInteger(currentBox) || currentBox < 1 || currentBox > 5) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'BOX_OUT_OF_RANGE', field: 'currentBox' }]), result: null });
      }
      if (isCorrect !== true && isCorrect !== false) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'REVIEW_RESULT_NOT_BOOLEAN', field: 'isCorrect' }]), result: null });
      }
      const result = leitner.processCardReviewResult(currentBox, isCorrect);
      return Object.freeze({ ok: true, result: plainFreeze(result) });
    }

    function createReviewTaskPreview(topicItem) {
      if (!record(topicItem) || !topicItem.id) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'REVIEW_TASK_TOPIC_INVALID', field: 'topic' }]), task: null });
      }
      const task = spaced.generateReviewTaskPayload(topicItem);
      if (!record(task)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'SPACED_ENGINE_REFUSED', field: 'topic' }]), task: null });
      }
      return Object.freeze({ ok: true, task: plainFreeze(task) });
    }

    function safeRenderPlan(bundle, options) {
      const opts = record(options) ? options : {};
      const attrs = { class: 'study-queue', role: 'group', 'aria-label': 'Offline study queue' };
      if (opts.dir === 'rtl' || opts.dir === 'ltr' || opts.dir === 'auto') attrs.dir = opts.dir;
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      if (!record(bundle) || bundle.kind !== 'study-queue-preview' ||
          !record(bundle.counts) || !Array.isArray(bundle.queue) || bundle.duePolicy !== DUE_POLICY) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'NOT_A_VIEWMODEL', field: 'bundle.kind' }]) });
      }
      const counts = bundle.counts;
      const summaryText = `${counts.dueTotal} of ${counts.topicsTotal + counts.cardsTotal} scheduled entries due - offline study queue`;
      const entryNodes = bundle.queue.map((entry) => Object.freeze({
        tag: 'li',
        attrs: Object.freeze({ class: 'study-queue-entry', 'data-entry-id': entry.id }),
        children: Object.freeze([
          Object.freeze({
            tag: 'span',
            attrs: Object.freeze({ class: 'study-queue-entry-label', dir: 'auto' }),
            text: entry.label,
            children: Object.freeze([])
          }),
          leaf('span', 'study-queue-entry-schedule', entry.source === 'spaced-topic'
            ? `box ${entry.box} - next ${entry.nextReviewDate} (${entry.overdueDays}d overdue)`
            : `box ${entry.box} - ${entry.daysSinceReview}d elapsed of ${entry.intervalDays}d interval (${entry.overdueDays}d overdue)`)
        ])
      }));
      return Object.freeze({
        ok: true,
        plan: Object.freeze({
          tag: 'section',
          attrs: Object.freeze(attrs),
          children: Object.freeze([
            leaf('p', 'study-queue-summary', summaryText),
            leaf('p', 'study-queue-policy', 'Due from explicit civil dates and elapsed days only - no clock reads, no storage, offline only'),
            Object.freeze({
              tag: 'ol',
              attrs: Object.freeze({ class: 'study-queue-list', 'aria-label': 'Study queue entries' }),
              children: Object.freeze(entryNodes)
            })
          ])
        })
      });
    }

    function mountStudyQueueView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountStudyQueueView requires a DOM document factory');
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
      spaced,
      leitner,
      DUE_POLICY,
      FEEDBACK_RATINGS,
      SPACED_INTERVALS,
      LEITNER_INTERVALS,
      civilDaysBetween,
      createStudyQueuePreview,
      evaluateTopicFeedback,
      planCardReview,
      createReviewTaskPreview,
      safeRenderPlan,
      mountStudyQueueView
    });
  }

  const defaultAdapter = createSpacedRepetitionAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createSpacedRepetitionAdapter, civilDaysBetween }));
});
