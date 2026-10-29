'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const JS_ROOT = path.join(REPO_ROOT, 'android', 'app', 'src', 'main', 'assets', 'web', 'js');
const ADAPTER_PATH = path.join(JS_ROOT, 'room6', 'active_recall_adapter.js');
const FLASHCARDS_PATH = path.join(JS_ROOT, 'active_recall_flashcard_engine.js');
const CAPSULE_PATH = path.join(JS_ROOT, 'active_recall_capsule_engine.js');

const Adapter = require(ADAPTER_PATH);
const Flashcards = require(FLASHCARDS_PATH);
const Capsule = require(CAPSULE_PATH);

const T0 = Date.parse('2026-10-20T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const TODAY = Flashcards.formatDateOnly(new Date(T0 + 8 * DAY));
const GOOD = Flashcards.RATINGS.GOOD;
const AGAIN = Flashcards.RATINGS.AGAIN;

const makeDeck = () => {
  let mastered = Flashcards.createCard('unit1', 'What is active recall?', 'Retrieval practice from memory.');
  let fresh = Flashcards.createCard('unit1', 'What is spaced repetition?', 'Reviews at widening intervals.');
  let failed = Flashcards.createCard('unit2', 'What is retrieval effort?', 'Desirable difficulty.');
  mastered = Flashcards.reviewCard(Flashcards.reviewCard(Flashcards.reviewCard(mastered, GOOD, T0), GOOD, T0 + DAY), GOOD, T0 + 2 * DAY);
  fresh = Flashcards.reviewCard(fresh, GOOD, T0);
  failed = Flashcards.reviewCard(failed, AGAIN, T0);
  return [mastered, fresh, failed];
};

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the active recall adapter');
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

test('F07 adapter binds the real merged recall engines', () => {
  assert.equal(Adapter.flashcards, Flashcards, 'adapter must operate on the real flashcard engine module, not a mock');
  assert.equal(Adapter.capsule, Capsule, 'adapter must operate on the real recall capsule engine module, not a mock');
  assert.deepEqual(Adapter.INTENT_TYPES, {
    REVIEW_CARD: 'active-recall/review-card',
    ADD_CARD: 'active-recall/add-card',
    SEAL_CAPSULE: 'active-recall/seal-capsule'
  });
  assert.throws(() => Adapter.createActiveRecallAdapter(null, null), /engine/i);
  assert.throws(() => Adapter.createActiveRecallAdapter({}, Capsule), /flashcard/i);
  assert.throws(() => Adapter.createActiveRecallAdapter(Flashcards, {}), /capsule/i);
});

test('flashcard viewmodel exposes only real engine deck statistics', () => {
  const deck = makeDeck();
  const snapshot = JSON.stringify(deck);
  const outcome = Adapter.createFlashcardViewModel(deck, TODAY);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.kind, 'flashcards-vm');
  assert.equal(Object.isFrozen(outcome.viewmodel), true);
  const stats = Flashcards.getDeckStatistics(deck, TODAY);
  assert.equal(stats.totalCards, 3);
  assert.equal(stats.dueCards, 2);
  assert.equal(stats.masteredCards, 1, 'the SM-2 graded card reaches mastered state through the real engine');
  assert.equal(stats.masteryRate, 33);
  assert.deepEqual(outcome.viewmodel.deck, {
    totalCards: stats.totalCards,
    dueCards: stats.dueCards,
    masteredCards: stats.masteredCards,
    masteryRate: stats.masteryRate,
    dueCardIds: Object.freeze(Flashcards.getDueCards(deck, TODAY).map((card) => card.id)),
    studiedCards: deck.filter((card) => card.repetitions > 0).length,
    minutesHint: null
  });
  assert.deepEqual(
    outcome.viewmodel.cards.map((card) => [card.id, card.prompt, card.intervalDays, card.nextReviewDate]),
    deck.map((card) => [card.id, card.prompt, card.intervalDays, card.nextReviewDate])
  );
  assert.deepEqual(
    outcome.viewmodel.cards.map((card) => card.isDue),
    [false, true, true]
  );
  assert.equal(JSON.stringify(deck), snapshot, 'the source deck must never be mutated');
  assert.equal(Object.isFrozen(outcome.viewmodel.cards), true);
  assert.throws(() => outcome.viewmodel.cards.shift(), TypeError, 'the frozen viewmodel refuses reordering');
});

test('flashcard viewmodel rejects anything that is not a real card list', () => {
  assert.equal(Adapter.createFlashcardViewModel('single card string').ok, false);
  assert.equal(Adapter.createFlashcardViewModel(null).errors[0].code, 'CARDS_NOT_ARRAY');
  const halfReal = Adapter.createFlashcardViewModel([{ id: 'card_ok_1', nextReviewDate: '2026-10-26' }, { id: 'card_ok_2' }]);
  assert.equal(halfReal.ok, false);
  assert.equal(halfReal.errors[0].code, 'INVALID_CARD');
  assert.equal(halfReal.errors[0].index, 1);
});

test('recall score is computed from actual answers only', () => {
  const actual = Adapter.computeRecallScore([2, 2, 0, 3]);
  assert.equal(actual.ok, true);
  assert.equal(actual.reviewed, 4);
  assert.deepEqual(actual.counts, { again: 1, hard: 0, good: 2, easy: 1 });
  assert.equal(actual.scorePercent, 75, '(2 good + 1 easy full credit + 0.5 hard) / 4 answers');
  assert.equal(actual.creditPolicy.creditsIssued, null, 'the adapter never fabricates credits');
  assert.equal(Object.isFrozen(actual), true);
  assert.equal(Adapter.computeRecallScore([0, 2]).scorePercent, 50);
  assert.equal(Adapter.computeRecallScore([3]).scorePercent, 100);
});

test('recall score refuses fabricated readings when no honest score is available', () => {
  const empty = Adapter.computeRecallScore([]);
  assert.equal(empty.ok, true);
  assert.equal(empty.reviewed, 0);
  assert.equal(empty.scorePercent, null, 'no answers means no score, never a fabricated 0%');
  const garbage = Adapter.computeRecallScore([2, '2', 3.5, undefined, NaN, 4, -1]);
  assert.equal(garbage.ok, false);
  assert.equal(garbage.errors.length, 6);
  assert.equal(garbage.errors.every((error) => error.code === 'INVALID_RATING'), true);
  assert.equal(garbage.scorePercent, null, 'a partially invalid answer set is never silently scored');
  assert.equal(garbage.counts.good, 1, 'actually rated answers still surface their counts');
  assert.equal(Adapter.computeRecallScore(50).errors[0].code, 'RATINGS_NOT_ARRAY');
  assert.equal(Adapter.computeRecallScore('good').ok, false);
});

test('review intents regrade cards strictly through the real engine', () => {
  const deck = makeDeck();
  const target = deck[2];
  const outcome = Adapter.applyIntent(deck, Adapter.createReviewIntent(target.id, GOOD), T0 + DAY);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.intentType, 'active-recall/review-card');
  assert.equal(outcome.cards.length, 3);
  assert.equal(outcome.changed, true);
  assert.deepEqual(outcome.reviewedCard, Flashcards.reviewCard(target, GOOD, T0 + DAY));
  assert.deepEqual(outcome.cards.map((card) => card.id), deck.map((card) => card.id), 'the card list order is preserved');
  assert.notEqual(outcome.cards[2], target, 'the regraded card replaces the old card instead of mutating it');
  assert.equal(outcome.cards[0].intervalDays, deck[0].intervalDays, 'unrelated cards keep their engine data');
});

test('review intent rejects fabricated or unknown regrades without touching the deck', () => {
  const deck = makeDeck();
  const fingerprint = (cards) => JSON.stringify(cards.map((card) => ({ id: card.id, intervalDays: card.intervalDays, repetitions: card.repetitions, easeFactor: card.easeFactor })));
  const before = fingerprint(deck);
  const noCard = Adapter.applyIntent(deck, Adapter.createReviewIntent('card_missing', 2), T0);
  assert.equal(noCard.ok, false);
  assert.equal(noCard.errors[0].code, 'CARD_NOT_FOUND');
  const badRating = Adapter.applyIntent(deck, Adapter.createReviewIntent(deck[0].id, 3.5), T0);
  assert.equal(badRating.ok, false);
  assert.equal(badRating.errors[0].code, 'RATING_INVALID');
  assert.equal(Adapter.applyIntent(deck, Adapter.createReviewIntent(deck[0].id, 'easy'), T0).errors[0].code, 'RATING_INVALID', 'the engine coercion fallback never runs: invalid ratings are refused');
  const hijack = Adapter.applyIntent(deck, { type: 'active-recall/wipe-deck' });
  assert.equal(hijack.ok, false);
  assert.deepEqual(hijack.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  const missing = Adapter.applyIntent(deck, null);
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  assert.equal(fingerprint(deck), before, 'rejected intents leave the deck untouched');
});

test('add card intent builds cards through the engine and appends them', () => {
  const deck = makeDeck();
  const outcome = Adapter.applyIntent(deck, Adapter.createAddCardIntent(' What is spacing effect? ', '  Wider gaps stick longer. ', 'unit2', ' challenger '));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.intentType, 'active-recall/add-card');
  assert.equal(outcome.cards.length, 4);
  const created = outcome.createdCard;
  const expected = Flashcards.createCard('unit2', 'What is spacing effect?', 'Wider gaps stick longer.', 'challenger');
  assert.equal(created.deckId, expected.deckId);
  assert.equal(created.prompt, expected.prompt);
  assert.equal(created.answer, expected.answer);
  assert.equal(created.notes, expected.notes);
  assert.equal(created.repetitions, 0);
  assert.match(created.id, /^card_\d+_\d+$/, 'card ids come from the engine factory');
  assert.equal(deck.length, 3, 'the original deck stays untouched');
  assert.equal(Adapter.applyIntent(deck, Adapter.createAddCardIntent('   ', 'yes')).errors[0].code, 'CARD_PROMPT_INVALID');
  assert.equal(Adapter.applyIntent(deck, { type: 'active-recall/add-card', prompt: 'q' }).errors[0].code, 'CARD_ANSWER_INVALID');
});

test('capsule scoring measures only real retrieval answers in an explicitly bounded window', () => {
  const startedAtMs = T0;
  const endedAtMs = T0 + 30 * 1000;
  const outcome = Adapter.scoreRecallAnswers(['F=ma', '   ', 'inertia resists change', 3], startedAtMs, endedAtMs);
  assert.equal(outcome.ok, true);
  assert.deepEqual([...outcome.points], ['F=ma', 'inertia resists change'], 'only the actually retrievable strings are kept');
  assert.equal(outcome.pointsCount, 2);
  assert.equal(outcome.droppedCount, 2);
  assert.equal(outcome.durationSeconds, 30);
  assert.equal(outcome.fluencyTier, 'fluency_fluid', 'tier comes from the real capsule engine');
  assert.equal(outcome.flagForReview, false, 'no fabricated flags for fluid recall');
  assert.equal(outcome.timing.source, 'explicit');
  assert.equal(outcome.timing.durationSeconds, 30);
  assert.equal(Object.isFrozen(outcome), true);
  assert.throws(() => outcome.points.push('late'), TypeError, 'frozen score views cannot absorb new answers');
});

test('misreported capsule timing windows are disabled, never silently repaired', () => {
  const startedAtMs = T0;
  assert.equal(Adapter.scoreRecallAnswers(['alpha', 'beta'], startedAtMs, null).ok, false, 'null end time disables scoring');
  assert.equal(Adapter.scoreRecallAnswers(['alpha', 'beta'], startedAtMs, null).errors[0].code, 'MISSING_DURATION');
  assert.equal(Adapter.scoreRecallAnswers(['alpha'], undefined, T0 + 9000).ok, false, 'missing start time disables scoring');
  assert.equal(Adapter.scoreRecallAnswers(['alpha'], startedAtMs, T0 - 30000).ok, false, 'negative elapsed time is refused');
  assert.equal(Adapter.scoreRecallAnswers(['alpha'], T0, T0 + 30000.5).errors[0].code, 'NON_INTEGER_MS', 'sub-millisecond tampering is refused');
  assert.equal(Adapter.scoreRecallAnswers([], T0, T0 + 30000).pointsCount, 0, 'an actually empty answer set reports zero, honestly');
  assert.equal(Adapter.scoreRecallAnswers('all systems nominal', T0, T0 + 30000).errors[0].code, 'ANSWERS_NOT_ARRAY', 'a string of wording is not an array of retrievable answers');
  const clamped = Adapter.scoreRecallAnswers(['single point'], T0, T0 + 120 * 1000);
  assert.equal(clamped.durationSeconds, 60, 'the 60-second capsule window is an explicit, recorded clamp');
  assert.equal(clamped.timing.source, 'clamped-to-capsule-window');
  assert.equal(clamped.formattedDuration, '60s');
});

test('seal capsule intent seals only scoreable answers from verified timing', () => {
  const deck = makeDeck();
  const snapshot = JSON.stringify(deck.map((card) => card.id));
  const intent = Adapter.createSealCapsuleIntent(['Newton 1: inertia', ' ', 42, 'Pairs are reciprocal'], T0, T0 + 20 * 1000, { subject: ' Newtonian mechanics ' });
  assert.equal(Object.isFrozen(intent), true);
  const outcome = Adapter.applyIntent(deck, intent);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.intentType, 'active-recall/seal-capsule');
  assert.equal(outcome.changed, false, 'sealing a capsule never modifies the flashcard deck');
  assert.deepEqual(outcome.cards.map((card) => card.id), deck.map((card) => card.id));
  assert.equal(JSON.stringify(deck.map((card) => card.id)), snapshot);
  assert.equal(outcome.score.pointsCount, 2);
  assert.deepEqual([...outcome.score.points], ['Newton 1: inertia', 'Pairs are reciprocal']);
  const expected = Capsule.createRecallCapsule(undefined, [...outcome.score.points], 20, 'Newtonian mechanics');
  assert.equal(outcome.capsule.subject, expected.subject, 'capsule shape follows the real engine');
  assert.equal(outcome.capsule.fluency.durationSeconds, 20);
  assert.equal(outcome.capsule.fluency.pointsCount, 2);
  assert.equal(outcome.capsule.fluency.fluencyTier, 'fluency_fluid');
  assert.equal(outcome.capsule.status, 'sealed');
  assert.equal(outcome.capsule.sessionRef, 'session_current', 'unset session refs follow the engine default honestly');
  assert.match(outcome.capsule.capsuleId, /^cap_[0-9a-z]+_[0-9a-z]+$/, 'capsule ids come from the engine');
  const vmOutcome = Adapter.createRecallCapsuleViewModel(outcome.capsule);
  assert.equal(vmOutcome.ok, true);
  assert.equal(vmOutcome.kind, 'capsule-vm');
  assert.equal(vmOutcome.viewmodel.durationSeconds, 20);
  assert.equal(vmOutcome.viewmodel.pointsCount, 2);
  assert.deepEqual([...vmOutcome.viewmodel.points], [...outcome.score.points]);
});

test('capsule intents without verified timing or actual answers are refused', () => {
  const deck = makeDeck();
  const noWindow = Adapter.applyIntent(deck, Adapter.createSealCapsuleIntent(['one'], T0, null));
  assert.equal(noWindow.ok, false);
  const badAnswers = Adapter.applyIntent(deck, Adapter.createSealCapsuleIntent('spill everything', T0, T0 + 9000));
  assert.equal(badAnswers.ok, false);
  assert.equal(badAnswers.errors[0].code, 'ANSWERS_NOT_ARRAY');
  assert.equal(Adapter.createRecallCapsuleViewModel({}).ok, false);
  const missingFlag = Adapter.createRecallCapsuleViewModel({
    capsuleId: 'cap_x',
    subject: 'Unit 3',
    status: 'sealed',
    fluency: { pointsCount: 1, durationSeconds: 30, fluencyTier: 'fluency_partial' },
    retrievalPoints: ['one']
  });
  assert.equal(missingFlag.ok, false, 'a capsule without a real flag state must not render as scored');
  const mismatch = Adapter.createRecallCapsuleViewModel({
    capsuleId: 'cap_x',
    subject: 'Unit 3',
    status: 'sealed',
    fluency: { pointsCount: 1, durationSeconds: 30, fluencyTier: 'fluency_fluid', flagForReview: false },
    retrievalPoints: ['one', 'two']
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.errors[0].code, 'CAPSULE_FLUENCY_MISMATCH', 'the fluency result is recomputed from the actual points, never trusted');
});

test('render plan is declarative, honest and innerHTML-free', () => {
  const deck = makeDeck();
  const vmOutcome = Adapter.createFlashcardViewModel(deck, TODAY);
  assert.equal(vmOutcome.ok, true);
  const planOutcome = Adapter.safeRenderPlan(vmOutcome, { dir: 'rtl' });
  assert.equal(planOutcome.ok, true);
  assert.equal(Object.isFrozen(planOutcome.plan), true);
  const nodes = flattenPlan(planOutcome.plan);
  assert.equal(planOutcome.plan.tag, 'section');
  assert.equal(planOutcome.plan.attrs.dir, 'rtl');
  assert.equal(planOutcome.plan.attrs.class, 'active-recall');
  const summary = nodes.find((entry) => entry.node.attrs.class === 'active-recall-summary');
  assert.ok(summary.node.text.includes(`${vmOutcome.viewmodel.deck.dueCards} of ${vmOutcome.viewmodel.deck.totalCards} cards due`), 'summary text derives from real engine stats');
  const listNode = nodes.find((entry) => entry.node.tag === 'ol');
  assert.equal(listNode.node.children.length, vmOutcome.viewmodel.deck.dueCards);
  const dueItem = listNode.node.children[0];
  assert.equal(dueItem.attrs.class, 'active-recall-due-card');
  assert.equal(typeof dueItem.attrs['data-card-id'], 'string');
  const creditLine = nodes.find((entry) => entry.node.attrs.class === 'active-recall-credits');
  assert.equal(creditLine.node.text, 'No credits issued for recall scores');
  assert.equal(JSON.stringify(planOutcome.plan).includes('http'), false);

  const capsuleResult = Adapter.applyIntent(deck, Adapter.createSealCapsuleIntent(['inertia stays'], T0, T0 + 50 * 1000, { subject: 'unit2' }));
  const capsulePlan = Adapter.safeRenderPlan(Adapter.createRecallCapsuleViewModel(capsuleResult.capsule));
  assert.equal(capsulePlan.ok, true);
  const capsuleNodes = flattenPlan(capsulePlan.plan);
  const flagLine = capsuleNodes.find((entry) => entry.node.attrs.class === 'active-recall-capsule-flag');
  assert.equal(flagLine.node.text, 'No review backlog flag');
  const timingLine = capsuleNodes.find((entry) => entry.node.attrs.class === 'active-recall-capsule-timing');
  assert.equal(timingLine.node.text, '50s retrieval window');
  const pointLeaf = capsuleNodes.find((entry) => entry.node.attrs.class === 'active-recall-point-text');
  assert.equal(pointLeaf.node.text, 'inertia stays');
  assert.equal(pointLeaf.node.attrs.dir, 'auto', 'retrieval points keep per-point RTL detection');
  const notAVm = Adapter.safeRenderPlan({ prompt: 'hijack me' });
  assert.equal(notAVm.ok, false);
  assert.notEqual(Adapter.safeRenderPlan(vmOutcome, { dir: 'interior' }).plan.attrs.dir, null, 'direction stays inherited unless rtl/ltr/auto requested');
});

test('mounting uses only safe DOM primitives and textContent', () => {
  const deck = makeDeck();
  const capsuleResult = Adapter.applyIntent(deck, Adapter.createSealCapsuleIntent(['inertia stays', '  '], T0, T0 + 55 * 1000, { subject: 'unit2' }));
  assert.equal(capsuleResult.score.durationSeconds, 55);
  assert.equal(capsuleResult.score.fluencyTier, 'fluency_partial');
  const vm = Adapter.createRecallCapsuleViewModel(capsuleResult.capsule);
  const doc = makeFakeDocument();
  const root = Adapter.mountRecallView(doc.createElement('div'), Adapter.safeRenderPlan(vm).plan, doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes.class, 'active-recall');
  assert.equal(root.children[0].textContent, `${vm.viewmodel.pointsCount} insights captured`);
  assert.equal(root.children[3].tagName, 'ol');
  assert.equal(root.children[3].children.length, 1);
  assert.equal(root.children[3].children[0].children[0].textContent, 'inertia stays');
  assert.equal('style' in root.attributes, false);
  assert.throws(() => Adapter.mountRecallView(doc.createElement('div'), Adapter.safeRenderPlan(vm).plan, null), /document/i);
});

test('capsule sealing and card appends keep the caller deck untouched and frozen copies only', () => {
  const deck = makeDeck();
  const snapshot = JSON.stringify(deck);
  const capsuleResult = Adapter.applyIntent(deck, Adapter.createSealCapsuleIntent(['alpha', 1, 'beta'], T0, T0 + 45 * 1000));
  assert.equal(capsuleResult.ok, true);
  assert.equal(capsuleResult.score.pointsCount, 2);
  assert.equal(capsuleResult.score.fluencyTier, 'fluency_fluid');
  assert.equal(JSON.stringify(deck), snapshot, 'the deck never mutates even after capsule sealing');
  const cardOutcome = Adapter.applyIntent(deck, Adapter.createAddCardIntent('q?', 'a'));
  assert.equal(cardOutcome.ok, true);
  assert.equal(cardOutcome.cards.length, 4);
  assert.equal(Object.isFrozen(cardOutcome.cards), true);
  assert.equal(Object.isFrozen(cardOutcome.cards[3]), true);
  assert.equal(deck.length, 3);
  assert.equal(JSON.stringify(deck), snapshot);
  assert.throws(() => cardOutcome.cards.pop(), TypeError, 'adapter outputs are frozen only as copies');
});

test('adapter source stays offline, persistence-free and innerHTML-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
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
    ['../active_recall_flashcard_engine.js', '../active_recall_capsule_engine.js']
  );
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
  assert.equal(fs.existsSync(FLASHCARDS_PATH) && fs.existsSync(CAPSULE_PATH), true);
});
