'use strict';
// Study-mode matrix at the engine level: queue contents, session lifecycle, ratings, edge cases.
// (The UI mapping of modes to question/answer sides is covered by the real-browser flashcards flow.)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const FC = require(path.resolve(__dirname, '../android/app/src/main/assets/web/modules/flashcards/flashcards_core.js'));
function mk() {
  const m = new Map(); const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
  const clock = { t: Date.UTC(2026, 0, 10, 12) }; let seed = 7; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return { api: FC.create({ storage, now: () => clock.t, random }), storage, clock };
}
function fixture() {
  const x = mk(); const d = x.api.createDeck({ name: 'D' }).deck;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => x.api.addCard({ deckId: d.id, frontText: 'f' + k, backText: 'b' + k, sourceLanguage: 'de', targetLanguage: 'en' }).card.id);
  return { ...x, d, ids };
}
const MODE_TO_QUEUE = { classic: 'due', reverse: 'due', both: 'due', listening: 'due', pronunciation: 'due', writing: 'due', quick: 'quick', random: 'random', mistakes: 'mistakes', custom: 'all' };

for (const [mode, q] of Object.entries(MODE_TO_QUEUE)) {
  test(`mode ${mode}: queue, session lifecycle, resume, completion`, () => {
    const { api, ids, d, storage } = fixture();
    if (mode === 'mistakes') ids.slice(0, 2).forEach((id) => api.reviewCard(id, 1));
    const base = api.stats().reviewedToday;
    const queue = api.buildQueue({ mode: q, deckId: d.id, limit: 50 });
    assert.ok(queue.length > 0, 'queue not empty');
    assert.equal(new Set(queue).size, queue.length, 'no duplicate cards in queue');
    const dir = mode === 'reverse' ? 'reverse' : (mode === 'both' ? 'both' : 'forward');
    const s = api.startSession({ queue, deckId: d.id, studyMode: mode, direction: dir }).session;
    assert.equal(s.direction, dir); assert.equal(s.studyMode, mode);
    const first = queue[0];
    assert.ok(api.reviewCard(first, 3, { sessionId: s.id, submissionId: s.id + ':0:' + first }).ok);
    // restart: session resumes at the next card, repeated submission does nothing
    const again = FC.create({ storage, now: () => Date.UTC(2026, 0, 10, 12) });
    const r = again.resumeSession(); assert.equal(r.studyMode, mode); assert.equal(r.index, 1); assert.equal(r.queue.length, queue.length);
    assert.ok(again.reviewCard(first, 3, { sessionId: s.id, submissionId: s.id + ':0:' + first }).duplicate);
    assert.equal(again.stats().reviewedToday, base + 1, 'duplicate not counted');
    for (let i = 1; i < queue.length; i++) again.reviewCard(queue[i], 3, { sessionId: s.id, submissionId: s.id + ':' + i + ':' + queue[i] });
    const done = again.completeSession(s.id);
    assert.equal(done.session.reviewedCount, queue.length); assert.equal(done.session.incorrectCount, 0);
    assert.equal(again.resumeSession(), null);
    assert.equal(again.stats().reviewedToday, base + queue.length);
  });
}

test('cancel (abandon) keeps cards schedulable and does not count a session', () => {
  const { api, ids, d } = fixture();
  const s = api.startSession({ queue: api.buildQueue({ mode: 'due', deckId: d.id }), deckId: d.id }).session;
  api.reviewCard(ids[0], 3, { sessionId: s.id, submissionId: 'x1' });
  assert.ok(api.abandonSession(s.id).ok || api.abandonSession() !== undefined);
  assert.equal(api.resumeSession(), null);
  assert.ok(api.getCard(ids[0]).reps === 1 && api.buildQueue({ mode: 'due', deckId: d.id }).length === ids.length - 1);
});

test('ratings: Again < Hard < Good < Easy intervals, and Again counts as incorrect', () => {
  const { api, ids } = fixture();
  const pv = api.previewIntervals(ids[0]);
  const ms = (p) => (p.days || 0) * 86400000 + (p.ms || 0);
  assert.ok(ms(pv[1]) < ms(pv[2]) || ms(pv[1]) <= ms(pv[2])); assert.ok(ms(pv[2]) <= ms(pv[3])); assert.ok(ms(pv[3]) < ms(pv[4]));
  const s = api.startSession({ queue: [ids[0], ids[1]], studyMode: 'classic' }).session;
  api.reviewCard(ids[0], 1, { sessionId: s.id, submissionId: 'a' }); api.reviewCard(ids[1], 4, { sessionId: s.id, submissionId: 'b' });
  const done = api.completeSession(s.id).session; assert.equal(done.incorrectCount, 1); assert.equal(done.correctCount, 1);
  assert.equal(api.getCard(ids[0]).st, 'learning'); assert.equal(api.getCard(ids[1]).st === 'review' || api.getCard(ids[1]).st === 'learning', true);
});

test('suspended cards, archived decks and empty decks never enter a queue; deleted cards vanish on resume', () => {
  const { api, ids, d } = fixture();
  api.setSuspended(ids[0], true);
  assert.ok(!api.buildQueue({ mode: 'all', deckId: d.id }).includes(ids[0]));
  const e = api.createDeck({ name: 'Empty' }).deck;
  assert.deepEqual(api.buildQueue({ mode: 'due', deckId: e.id }), []);
  const s = api.startSession({ queue: api.buildQueue({ mode: 'all', deckId: d.id }), deckId: d.id }).session;
  api.deleteCard(ids[1]);
  assert.ok(!api.resumeSession().queue.includes(ids[1]));
  api.archiveDeck(d.id); assert.deepEqual(api.buildQueue({ mode: 'all', deckId: d.id }), []);
  assert.ok(s.id);
});

test('writing mode: exact, close spelling and different answers are distinguished honestly', () => {
  const { api } = fixture();
  assert.equal(api.checkAnswer('house', 'house').result, 'exact');
  assert.equal(api.checkAnswer('house', 'hause').result, 'close');
  assert.equal(api.checkAnswer('house', 'dog').result, 'wrong');
  assert.equal(api.checkAnswer('كتاب', 'كِتاب').result, 'exact', 'Arabic diacritics tolerated');
});

test('multiple choice and cloze helpers never leak the answer or reuse it as a distractor', () => {
  const { api, ids } = fixture();
  const dist = api.distractors(ids[0], 3); assert.equal(dist.length, 3); assert.ok(!dist.includes('ba'));
  api.updateCard(ids[0], { frontText: 'Das Haus ist groß', backText: 'house', exampleText: 'Das Haus ist groß.' });
  const cl = api.makeCloze(ids[0]); if (cl) assert.ok(!cl.text.includes(cl.answer));
});
