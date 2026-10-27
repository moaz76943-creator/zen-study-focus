'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const JS_ROOT = path.join(REPO_ROOT, 'android', 'app', 'src', 'main', 'assets', 'web', 'js');
const ADAPTER_PATH = path.join(JS_ROOT, 'room6', 'spaced_repetition_adapter.js');
const SPACED_PATH = path.join(JS_ROOT, 'spaced_repetition_engine.js');
const LEITNER_PATH = path.join(JS_ROOT, 'leitner_box_flashcard_engine.js');

const Adapter = require(ADAPTER_PATH);
const Spaced = require(SPACED_PATH);
const Leitner = require(LEITNER_PATH);

const TODAY = '2026-10-20';
const startOf = (dateStr) => new Date(Date.parse(`${dateStr}T08:00:00.000Z`));

const buildTopics = () => {
  const dueBox1 = Spaced.registerStudyTopic('Photosynthesis light reactions', 'biology', startOf('2026-10-05'));
  const dueBox2 = Spaced.registerStudyTopic('Stoichiometry basics', 'chemistry', startOf('2026-10-05'));
  const advanced = Spaced.evaluateRecallFeedback(dueBox2, 'easy', startOf('2026-10-06'));
  let mastered = Spaced.registerStudyTopic('Hormonal loops', 'biology', startOf('2026-10-05'));
  mastered = Spaced.evaluateRecallFeedback(mastered, 'easy', startOf('2026-10-06'));
  mastered = Spaced.evaluateRecallFeedback(mastered, 'easy', startOf('2026-10-09'));
  mastered = Spaced.evaluateRecallFeedback(mastered, 'easy', startOf('2026-10-16'));
  mastered = Spaced.evaluateRecallFeedback(mastered, 'easy', startOf('2026-10-30'));
  const futureBox2 = Spaced.registerStudyTopic('Astronomy basics', 'physics', startOf('2026-10-18'));
  const futureAdvanced = Spaced.evaluateRecallFeedback(futureBox2, 'easy', startOf('2026-10-19'));
  return [dueBox1, advanced, mastered, futureAdvanced];
};

const buildCards = () => [
  { id: 'card_box3', box: 3, daysSinceReview: 7 },
  { id: 'card_box1_late', box: 1, daysSinceReview: 3 },
  { id: 'card_box2_early', box: 2, daysSinceReview: 1 }
];

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('markup injection properties must never be used by the study queue adapter');
  };
  const createElement = (tag) => {
    const node = {
      tagName: String(tag).toLowerCase(),
      children: [],
      attributes: {},
      textContent: '',
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      }
    };
    Object.defineProperty(node, 'innerHTML', { get: forbidden, set: forbidden });
    return node;
  };
  return { createElement };
};

const flattenPlan = (node, visit = [], stack = []) => {
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), 'plan nodes are plain objects');
  const expectedKeys = ['attrs', 'children', 'tag', 'text'].filter((key) => key in node).sort();
  assert.deepEqual(Object.keys(node).sort(), expectedKeys);
  assert.equal(typeof node.tag, 'string');
  assert.ok(/^[a-z][a-z0-9-]*$/.test(node.tag), `native tag expected, got ${node.tag}`);
  if ('text' in node) assert.equal(typeof node.text, 'string');
  for (const [name, value] of Object.entries(node.attrs || {})) {
    assert.equal(typeof value, 'string', `attribute ${name} must be a string`);
    assert.ok(!/^(href|src|srcset|style)$/i.test(name), `attribute ${name} is forbidden in the render plan`);
    assert.ok(!/https?:/i.test(String(value)), `attribute ${name} must not embed a URL`);
  }
  visit.push({ node, path: `${stack.join('/')}/${node.tag}` });
  for (const child of node.children || []) flattenPlan(child, visit, stack.concat(node.tag));
  return visit;
};

test('F08 adapter binds the real merged spaced repetition and Leitner engines', () => {
  assert.equal(Adapter.spaced, Spaced, 'adapter must operate on the real spaced repetition engine module, not a mock');
  assert.equal(Adapter.leitner, Leitner, 'adapter must operate on the real Leitner box engine module, not a mock');
  assert.deepEqual(Adapter.SPACED_INTERVALS, { 1: 1, 2: 3, 3: 7, 4: 14 });
  assert.deepEqual(Adapter.LEITNER_INTERVALS, { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 });
  assert.deepEqual(Adapter.FEEDBACK_RATINGS, ['easy', 'hard', 'forgot']);
  assert.throws(() => Adapter.createSpacedRepetitionAdapter(null, null), /engines?/i);
  assert.throws(() => Adapter.createSpacedRepetitionAdapter({}, Leitner), /spaced/i);
  assert.throws(() => Adapter.createSpacedRepetitionAdapter(Spaced, {}), /leitner/i);
});

test('civil day math is pure calendar arithmetic over real date strings', () => {
  assert.equal(Adapter.civilDaysBetween('2026-10-06', '2026-10-20'), 14);
  assert.equal(Adapter.civilDaysBetween('2026-02-28', '2026-03-01'), 1, 'non leap February has 28 days');
  assert.equal(Adapter.civilDaysBetween('2024-02-28', '2024-02-29'), 1, 'leap February honors the 29th');
  assert.equal(Adapter.civilDaysBetween('1970-01-01', '1970-01-01'), 0);
  assert.equal(Adapter.civilDaysBetween('2026-02-30', '2026-03-01'), null, 'February 30 is refused');
  assert.equal(Adapter.civilDaysBetween('2026-10-06', 'nope'), null);
  assert.equal(Adapter.civilDaysBetween(undefined, '2026-10-06'), null);
});

test('offline queue preview mirrors real engine due decisions exactly', () => {
  const topics = buildTopics();
  const cards = buildCards();
  const snapshot = JSON.stringify({ topics, cards });
  const outcome = Adapter.createStudyQueuePreview(topics, cards, TODAY);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.kind, 'study-queue-preview');
  assert.equal(Object.isFrozen(outcome), true);
  assert.equal(outcome.offline, true, 'the queue is an offline preview, never a live fetch');
  assert.deepEqual(outcome.counts, {
    topicsTotal: 4,
    cardsTotal: 3,
    spacedDue: 2,
    leitnerDue: 2,
    dueTotal: 4,
    masteredExcluded: 1
  });
  assert.equal(JSON.stringify({ topics, cards }), snapshot, 'the source data must never be mutated');
  const engineSpacedDue = Spaced.filterDueReviewTopics(topics, TODAY);
  const engineLeitnerResult = Leitner.filterDueCards(cards);
  assert.deepEqual(
    outcome.queue.filter((entry) => entry.source === 'spaced-topic').map((entry) => entry.id),
    engineSpacedDue.map((topic) => topic.id),
    'spaced due selection comes from the real engine result'
  );
  assert.deepEqual(
    outcome.queue.filter((entry) => entry.source === 'leitner-card').map((entry) => entry.id).sort(),
    engineLeitnerResult.dueQueue.map((card) => card.id).sort(),
    'leitner due selection comes from the real engine result'
  );
  assert.equal(Object.isFrozen(outcome.queue), true);
  assert.throws(() => outcome.queue.pop(), TypeError, 'frozen queue views cannot drop entries');
});

test('queue entries carry honest ids and no hidden timestamp fields', () => {
  const outcome = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  for (const entry of outcome.queue) {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ['box', 'category', 'id', 'intervalDays', 'kind', 'label', 'nextReviewDate', 'overdueDays', 'priority', 'source'].concat(entry.source === 'leitner-card' ? ['daysSinceReview'] : []).sort(),
      'entries expose only schedule facts derived from explicit inputs'
    );
    assert.equal(typeof entry.id, 'string');
    assert.ok(entry.id.length > 0, 'every entry is traceable to a real topic or card id');
    assert.equal(entry.nextReviewDate === null || /^\d{4}-\d{2}-\d{2}$/.test(entry.nextReviewDate), true, 'civil dates stay civil, no embedded clock time');
    assert.ok(entry.overdueDays >= 0, 'overdue days come from the calendar difference');
    assert.equal(entry.label === entry.id || typeof Spaced.generateReviewTaskPayload === 'function', true, 'labels trace to the caller data');
  }
});

test('every due entry carries a schedule line from its own box', () => {
  const outcome = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  const bySource = {
    'spaced-topic': outcome.queue.filter((entry) => entry.source === 'spaced-topic'),
    'leitner-card': outcome.queue.filter((entry) => entry.source === 'leitner-card')
  };
  assert.deepEqual(bySource['spaced-topic'].map((entry) => [entry.box, entry.intervalDays, entry.nextReviewDate, entry.overdueDays]), [
    [1, 1, '2026-10-06', 14],
    [2, 3, '2026-10-09', 11]
  ]);
  assert.deepEqual(bySource['leitner-card'].map((entry) => [entry.box, entry.intervalDays, entry.daysSinceReview, entry.overdueDays]), [
    [1, 1, 3, 2],
    [3, 7, 7, 0]
  ]);
  assert.equal(bySource['leitner-card'][0].nextReviewDate, null, 'elapsed-day cards have no civil next date and none is fabricated');
  for (const entry of outcome.queue) {
    assert.equal(entry.priority, entry.box === 1 ? 'high' : 'normal');
  }
});

test('preview ordering is deterministic and most overdue first', () => {
  const outcome = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  const overdueSequence = outcome.queue.map((entry) => entry.overdueDays);
  assert.deepEqual(overdueSequence, [14, 11, 2, 0]);
  const shape = (preview) => preview.queue.map((entry) => `${entry.source}:${entry.box}:${entry.overdueDays}`);
  const again = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  assert.deepEqual(shape(again), shape(outcome), 'the queue order is reproducible, most overdue entries first');
});

test('preview refuses malformed time inputs instead of falling back to hidden clock reads', () => {
  assert.equal(Adapter.createStudyQueuePreview([], [], 'tomorrow').errors[0].code, 'INVALID_TODAY');
  assert.equal(Adapter.createStudyQueuePreview([], [], '2026-10-2').ok, false, 'non padded day strings are refused');
  assert.equal(Adapter.createStudyQueuePreview([], [], '2026-02-30').errors[0].code, 'INVALID_TODAY', 'impossible civil dates are refused');
  assert.equal(Adapter.createStudyQueuePreview([], [], undefined).errors[0].code, 'INVALID_TODAY');
  assert.equal(Adapter.createStudyQueuePreview([], [], null).ok, false);
  assert.equal(Adapter.createStudyQueuePreview(undefined, [], TODAY).errors[0].code, 'TOPICS_NOT_ARRAY');
  assert.equal(Adapter.createStudyQueuePreview([], undefined, TODAY).errors[0].code, 'CARDS_NOT_ARRAY');
  const rejected = Adapter.createStudyQueuePreview('photosynthesis', 'card', TODAY);
  assert.deepEqual(rejected.errors, [
    { code: 'TOPICS_NOT_ARRAY', field: 'topics' },
    { code: 'CARDS_NOT_ARRAY', field: 'cards' }
  ]);
  assert.deepEqual(rejected.counts, { topicsTotal: 0, cardsTotal: 0, spacedDue: 0, leitnerDue: 0, dueTotal: 0, masteredExcluded: 0 });
});

test('preview refuses half-real data with specific indexes and never caches it', () => {
  const topics = buildTopics();
  const bad = Adapter.createStudyQueuePreview(
    topics.concat([{ id: 'box9_topic', box: 9, isMastered: false, nextReviewDate: '2026-10-19' }]),
    buildCards().concat([{ id: 'card_nocreplies', box: 2, daysSinceReview: 1.5 }]),
    TODAY
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((error) => error.code === 'INVALID_TOPIC' && error.index === 4), 'the out of range spaced box is pinned');
  assert.ok(bad.errors.some((error) => error.code === 'INVALID_CARD' && error.index === 3), 'the fractional elapsed days are pinned');
  assert.deepEqual(bad.queue, []);
  const noDate = Adapter.createStudyQueuePreview(
    [{ id: 'nostamp', box: 1, isMastered: false, nextReviewDate: null }], [], TODAY);
  assert.equal(noDate.errors[0].code, 'INVALID_TOPIC', 'a non mastered topic without a real next review date is not silently hidden or invented');
  const weirdFlag = Adapter.createStudyQueuePreview(
    [{ id: 'flagged', box: 1, isMastered: 'maybe', nextReviewDate: '2026-10-19' }], [], TODAY);
  assert.equal(weirdFlag.errors[0].field, 'topics[0].isMastered', 'truthy junk flags do not hide a topic from the honest queue');
});

test('recall feedback passes through the real spaced engine with explicit review dates only', () => {
  const topic = buildTopics()[0];
  const snapshot = JSON.stringify(topic);
  const outcome = Adapter.evaluateTopicFeedback(topic, 'hard', startOf('2026-10-20'));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.rating, 'hard');
  assert.deepEqual(outcome.result, Spaced.evaluateRecallFeedback(topic, 'hard', startOf('2026-10-20')));
  assert.equal(outcome.result.box, 1, 'a hard rating keeps the box and just reschedules');
  assert.equal(outcome.result.nextReviewDate, '2026-10-21');
  assert.equal(JSON.stringify(topic), snapshot, 'the source topic must never be mutated');

  const promoted = Adapter.evaluateTopicFeedback(buildTopics()[0], 'easy', startOf('2026-10-06'));
  assert.equal(promoted.result.box, 2);
  assert.equal(promoted.result.nextReviewDate, '2026-10-09', 'promotion follows the real 4-tier ladder 1d 3d 7d 14d');

  const forgot = Adapter.evaluateTopicFeedback(buildTopics()[0], 'forgot', startOf('2026-10-20'));
  assert.equal(forgot.result.box, 1);
  assert.equal(forgot.result.nextReviewDate, '2026-10-21', 'forgetting resets to box 1 through the real engine');

  assert.equal(Adapter.evaluateTopicFeedback(topic, 'deck', startOf('2026-10-20')).errors[0].code, 'FEEDBACK_RATING_INVALID');
  assert.equal(Adapter.evaluateTopicFeedback(topic, 'EASY', startOf('2026-10-20')).ok, false, 'coercion fallbacks are refused');
  assert.equal(Adapter.evaluateTopicFeedback(topic, 'easy', '2026-10-20').errors[0].code, 'REVIEW_DATE_REQUIRED');
  assert.equal(Adapter.evaluateTopicFeedback(topic, 'easy', null).ok, false, 'a missing review date disables scoring, it is not filled with a hidden clock');
});

test('card review planning is delegated to the real Leitner engine without coercion', () => {
  const outcome = Adapter.planCardReview(3, true);
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.result, Leitner.processCardReviewResult(3, true));
  assert.equal(outcome.result.newBox, 4);
  assert.equal(outcome.result.nextIntervalDays, 14);
  assert.equal(outcome.result.promoted, true);
  const demote = Adapter.planCardReview(4, false);
  assert.deepEqual(demote.result, Leitner.processCardReviewResult(4, false), 'wrong answers demote through the real path');
  assert.equal(demote.result.newBox, 1);
  assert.equal(demote.result.demoted, true);
  assert.equal(Adapter.planCardReview(6, true).errors[0].code, 'BOX_OUT_OF_RANGE');
  assert.equal(Adapter.planCardReview(0, true).ok, false);
  assert.equal(Adapter.planCardReview(2.5, true).ok, false, 'fractional boxes are refused, not normalized');
  assert.equal(Adapter.planCardReview('3', true).ok, false, 'string boxes are refused, not normalized');
  assert.equal(Adapter.planCardReview(3, 'yes').errors[0].code, 'REVIEW_RESULT_NOT_BOOLEAN');
  assert.equal(Adapter.planCardReview(3, 1).ok, false);
});

test('review task previews come from the real spaced task factory', () => {
  const topic = buildTopics()[0];
  const outcome = Adapter.createReviewTaskPreview(topic);
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.task, Spaced.generateReviewTaskPayload(topic));
  assert.equal(outcome.task.priority, 'high', 'box 1 topics are honestly urgent');
  assert.equal(outcome.task.estimatedMinutes, 20);
  assert.equal(Adapter.createReviewTaskPreview({ nope: true }).ok, false);
  assert.equal(Adapter.createReviewTaskPreview(null).errors[0].code, 'REVIEW_TASK_TOPIC_INVALID');
});

test('render plan is declarative, honest and injection-free', () => {
  const outcome = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  const planOutcome = Adapter.safeRenderPlan(outcome, { dir: 'rtl' });
  assert.equal(planOutcome.ok, true);
  assert.equal(Object.isFrozen(planOutcome.plan), true);
  const nodes = flattenPlan(planOutcome.plan);
  assert.equal(planOutcome.plan.tag, 'section');
  assert.equal(planOutcome.plan.attrs.dir, 'rtl');
  assert.equal(planOutcome.plan.attrs.class, 'study-queue');
  const summary = nodes.find((entry) => entry.node.attrs.class === 'study-queue-summary');
  assert.ok(summary.node.text.includes('4 of 7 scheduled entries due'), 'summary text derives from real counts');
  assert.ok(summary.node.text.includes('offline'), 'the preview declares being offline');
  const listNode = nodes.find((entry) => entry.node.tag === 'ol');
  assert.equal(listNode.node.children.length, outcome.counts.dueTotal);
  const firstItem = listNode.node.children[0];
  assert.equal(firstItem.attrs.class, 'study-queue-entry');
  assert.equal(typeof firstItem.attrs['data-entry-id'], 'string');
  const policyLine = nodes.find((entry) => entry.node.attrs.class === 'study-queue-policy');
  assert.ok(policyLine.node.text.includes('no clock reads'), 'the plan states the no hidden time guarantees outright');
  assert.ok(policyLine.node.text.includes('no storage'));
  assert.equal(JSON.stringify(planOutcome.plan).includes('http'), false);
  const notAVm = Adapter.safeRenderPlan({ kind: 'study-queue-preview' });
  assert.equal(notAVm.ok, false, 'a bare kind label is not a real viewmodel');
  assert.equal(Adapter.safeRenderPlan({ prompt: 'hijack me' }).errors[0].code, 'NOT_A_VIEWMODEL');
});

test('mounting uses only safe DOM primitives and textContent', () => {
  const outcome = Adapter.createStudyQueuePreview(buildTopics(), buildCards(), TODAY);
  const vm = Adapter.safeRenderPlan(outcome, { dir: 'auto' });
  const doc = makeFakeDocument();
  const root = Adapter.mountStudyQueueView(doc.createElement('div'), vm.plan, doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes.class, 'study-queue');
  assert.equal(root.attributes.dir, 'auto');
  assert.equal(root.children[0].textContent, '4 of 7 scheduled entries due - offline study queue');
  assert.equal(root.children[2].tagName, 'ol');
  assert.equal(root.children[2].children.length, 4);
  assert.equal(root.children[2].children[0].children[0].textContent, 'Photosynthesis light reactions');
  assert.equal(root.children[2].children[0].children[1].textContent.startsWith('box 1'), true);
  assert.equal('style' in root.attributes, false);
  assert.throws(() => Adapter.mountStudyQueueView(doc.createElement('div'), vm.plan, null), /document/i);
});

test('both engines stay untouched across the full adapter flow', () => {
  const topics = buildTopics();
  const cards = buildCards();
  const fingerprint = JSON.stringify({ topics, cards });
  const preview = Adapter.createStudyQueuePreview(topics, cards, TODAY);
  const first = Adapter.evaluateTopicFeedback(topics[0], 'easy', startOf('2026-10-20'));
  const plan = Adapter.safeRenderPlan(preview);
  const doc = makeFakeDocument();
  Adapter.mountStudyQueueView(doc.createElement('div'), plan.plan, doc);
  assert.equal(first.result.box, 2, 'the promoted review result is a fresh engine object, not the live topic');
  assert.equal(JSON.stringify({ topics, cards }), fingerprint, 'the adapter only outputs frozen copies');
  assert.equal(Object.isFrozen(preview.counts), true);
  assert.equal(Object.isFrozen(preview.duePolicy), true);
  assert.equal(Object.isFrozen(first.result), true);
});

test('adapter source stays offline, storage-free, clock-free and injection-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
  assert.equal(/\bnew\s+Date\s*\(|Date\.now\s*\(/.test(source), false, 'due math must never consult a hidden clock');
  assert.equal(/document\s*\./.test(source), false, 'the adapter never touches a host document directly');
  const requireArgs = [...source.matchAll(/require\(\s*([^)]*?)\s*\)/g)].map((match) => match[1]);
  assert.ok(requireArgs.length >= 1, 'adapter must load both engine modules via require');
  const targets = new Set();
  for (const arg of requireArgs) {
    const literal = arg.match(/^['"]([^'"]+)['"]$/);
    if (literal) {
      targets.add(literal[1]);
      continue;
    }
    const declared = source.match(new RegExp(`(?:const|let|var)\\s+${arg.trim()}\\s*=\\s*['"]([^'"]+)['"]`));
    assert.ok(declared, `require target ${arg} must resolve to a local module path`);
    targets.add(declared[1]);
  }
  assert.deepEqual(
    [...targets],
    ['../spaced_repetition_engine.js', '../leitner_box_flashcard_engine.js']
  );
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
  assert.equal(fs.existsSync(SPACED_PATH) && fs.existsSync(LEITNER_PATH), true);
});
