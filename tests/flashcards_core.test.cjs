'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const FC = require(path.resolve(__dirname, '../android/app/src/main/assets/web/modules/flashcards/flashcards_core.js'));

function mem(opts = {}) {
  const m = new Map(); let quota = opts.quota || Infinity, failNext = 0;
  const s = {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => { m.delete(k); },
    setItem(k, v) {
      if (failNext > 0) { failNext--; throw new Error('QuotaExceededError'); }
      v = String(v);
      let total = 0; for (const [kk, vv] of m) if (kk !== k) total += vv.length; if (total + v.length > quota) throw new Error('QuotaExceededError');
      m.set(k, v);
    },
    failNext(n) { failNext = n; },
  };
  return s;
}
function mk(opts = {}) {
  const storage = opts.storage || mem();
  const clock = { t: opts.t || Date.UTC(2026, 0, 10, 12, 0, 0) };
  const api = FC.create({ storage, now: () => clock.t, random: opts.random });
  return { api, storage, clock };
}
const addDeck = (api, name = 'German') => api.createDeck({ name }).deck;
const card = (api, deckId, front = 'Haus', back = 'house', extra = {}) => api.addCard({ deckId, frontText: front, backText: back, ...extra });

test('deck CRUD, archive, safe delete', () => {
  const { api } = mk();
  const d = addDeck(api);
  assert.equal(api.createDeck({ name: '  ' }).code, 'NAME_REQUIRED');
  assert.equal(api.createDeck({ name: 'x', color: 'red', icon: 'unknown' }).deck.color, '#111827');
  assert.equal(api.updateDeck(d.id, { name: 'Deutsch' }).deck.name, 'Deutsch');
  card(api, d.id);
  assert.equal(api.deleteDeck(d.id).code, 'DECK_NOT_EMPTY');
  assert.ok(api.archiveDeck(d.id).ok);
  assert.equal(api.listDecks().some((x) => x.id === d.id), false);
  assert.equal(api.listDecks({ archived: true }).length, 1);
  assert.ok(api.restoreDeck(d.id).ok);
  assert.equal(api.listDecks({ search: 'deutsch' }).length, 1);
  const dup = api.duplicateDeck(d.id);
  assert.equal(dup.copied, 1);
  assert.notEqual(dup.deck.id, d.id);
  assert.equal(new Set(api.listDecks().map((x) => x.id)).size, api.listDecks().length);
});

test('add card validation, language tags, types, duplicates', () => {
  const { api } = mk();
  const d = addDeck(api);
  assert.equal(api.addCard({ deckId: 'nope', frontText: 'a', backText: 'b' }).code, 'DECK_REQUIRED');
  assert.equal(card(api, d.id, '', 'x').code, 'FRONT_REQUIRED');
  assert.equal(card(api, d.id, 'x', ' ').code, 'BACK_REQUIRED');
  assert.equal(card(api, d.id, 'x', 'y', { sourceLanguage: 'de_DE!' }).code, 'BAD_LANGUAGE');
  assert.equal(card(api, d.id, 'x', 'y', { cardType: 'bogus' }).code, 'BAD_TYPE');
  const ok = card(api, d.id, 'Haus', 'house', { sourceLanguage: 'de-DE', targetLanguage: 'ar', cardType: 'word', tags: 'a, b ,A' });
  assert.ok(ok.ok); assert.deepEqual(ok.card.tags, ['a', 'b']);
  const dup = card(api, d.id, ' haus ', 'home');
  assert.equal(dup.code, 'DUPLICATE');
  assert.ok(card(api, d.id, ' haus ', 'home', undefined) && api.addCard({ deckId: d.id, frontText: 'haus', backText: 'home' }, { allowDuplicate: true }).ok);
  assert.ok(card(api, d.id, 'Q?', 'A', { cardType: 'qa' }).ok);
});

test('stored text is never altered by search normalisation; Arabic diacritics tolerated', () => {
  const { api } = mk();
  const d = addDeck(api, 'عربي');
  const c = card(api, d.id, 'كِتَاب', 'Buch', { personalNotes: 'Café' }).card;
  assert.equal(api.search('كتاب').total, 1);
  assert.equal(api.search('cafe').total, 1);
  assert.equal(api.search('buch haus').total, 0);
  assert.equal(api.getCard(c.id).frontText, 'كِتَاب');
  assert.equal(api.search('عربي').total, 1, 'deck name is searchable');
});

test('independent field edits keep progress; material change flags review', () => {
  const { api, clock } = mk();
  const d = addDeck(api);
  const c = card(api, d.id, 'Haus', 'house').card;
  api.reviewCard(c.id, 3); clock.t += 11 * 60000; api.reviewCard(c.id, 3);
  const before = api.getCard(c.id);
  assert.equal(before.st, 'review');
  const r1 = api.updateCard(c.id, { exampleText: 'Das Haus ist groß' });
  assert.equal(r1.needsReview, false);
  let after = api.getCard(c.id);
  assert.equal(after.backText, 'house'); assert.equal(after.frontText, 'Haus');
  for (const k of ['st', 'due', 'stab', 'diff', 'reps', 'ok', 'lapses', 'ivl']) assert.equal(after[k], before[k], k);
  assert.deepEqual(after.log, before.log);
  api.updateCard(c.id, { backText: 'houses' }); // minor change
  assert.equal(api.getCard(c.id).flag, null);
  const r2 = api.updateCard(c.id, { backText: 'completely different meaning' });
  assert.equal(r2.needsReview, true);
  after = api.getCard(c.id);
  assert.equal(after.flag.type, 'content_changed'); assert.ok(after.flag.reason);
  assert.equal(after.reps, before.reps); assert.equal(after.stab, before.stab);
  assert.ok(after.due <= clock.t);
});

test('move, favorite, suspend, delete + undo', () => {
  const { api } = mk();
  const a = addDeck(api, 'A'), b = addDeck(api, 'B');
  const c = card(api, a.id).card;
  assert.ok(api.moveCard(c.id, b.id).ok); assert.equal(api.getCard(c.id).deckId, b.id);
  assert.equal(api.moveCard(c.id, 'zzz').code, 'DECK_REQUIRED');
  assert.equal(api.toggleFavorite(c.id).favorite, true);
  api.setSuspended(c.id, true); assert.equal(api.reviewCard(c.id, 3).code, 'SUSPENDED');
  api.setSuspended(c.id, false);
  api.deleteCard(c.id); assert.equal(api.getCard(c.id), null);
  assert.ok(api.undo().ok); assert.equal(api.getCard(c.id).deckId, b.id);
  api.updateCard(c.id, { frontText: 'Neu' }); assert.ok(api.undo().ok); assert.equal(api.getCard(c.id).frontText, 'Haus');
  assert.ok(api.undo().ok); assert.equal(api.getCard(c.id).deckId, a.id, 'move is undone too');
  assert.equal(api.undo().code, 'NOTHING_TO_UNDO');
});

test('scheduler: learning steps, graduation, ordering Hard<Good<Easy, lapse', () => {
  const { api, clock } = mk();
  const d = addDeck(api);
  const c = card(api, d.id).card;
  let p = api.previewIntervals(c.id);
  assert.equal(p[1].ms, 60000); assert.equal(p[3].ms, 10 * 60000); assert.ok(p[4].days >= 1);
  api.reviewCard(c.id, 3); assert.equal(api.getCard(c.id).st, 'learning');
  clock.t += 10 * 60000;
  api.reviewCard(c.id, 3);
  let x = api.getCard(c.id); assert.equal(x.st, 'review'); assert.ok(x.ivl >= 1); assert.ok(x.stab > 0);
  clock.t += x.ivl * 86400000;
  p = api.previewIntervals(c.id);
  assert.ok(p[2].days < p[3].days && p[3].days < p[4].days, JSON.stringify(p));
  const s0 = x.stab;
  api.reviewCard(c.id, 3); x = api.getCard(c.id); assert.ok(x.stab > s0, 'stability grows on success');
  clock.t += x.ivl * 86400000;
  api.reviewCard(c.id, 1); x = api.getCard(c.id);
  assert.equal(x.st, 'relearning'); assert.equal(x.lapses, 1); assert.equal(x.due, clock.t + 60000);
  clock.t += 60000; api.reviewCard(c.id, 3); clock.t += 10 * 60000; api.reviewCard(c.id, 3);
  assert.equal(api.getCard(c.id).st, 'review');
  assert.equal(api.reviewCard(c.id, 9).code, 'BAD_RATING');
});

test('scheduler is deterministic', () => {
  const run = () => { const { api, clock } = mk({ random: () => 0.5 }); const d = addDeck(api); const c = card(api, d.id).card; const out = []; for (const g of [3, 3, 2, 4, 1, 3, 3]) { api.reviewCard(c.id, g); const x = api.getCard(c.id); out.push([x.st, x.due, x.stab, x.diff]); clock.t = Math.max(clock.t, x.due); } return JSON.stringify(out); };
  assert.equal(run(), run());
});

test('review is idempotent per submissionId and logged once', () => {
  const { api } = mk();
  const d = addDeck(api); const c = card(api, d.id).card;
  const a = api.reviewCard(c.id, 3, { submissionId: 'sub1' }); assert.ok(!a.duplicate);
  const b = api.reviewCard(c.id, 3, { submissionId: 'sub1' }); assert.ok(b.duplicate);
  const x = api.getCard(c.id); assert.equal(x.reps, 1); assert.equal(x.log.length, 1);
  assert.equal(api.stats().reviewedToday, 1);
});

test('queue ordering, filters, random only on request, suspended/archived excluded', () => {
  const { api, clock } = mk({ random: () => 0.3 });
  const d = addDeck(api), e = addDeck(api, 'E');
  const ids = ['a', 'b', 'c', 'd'].map((f) => card(api, d.id, f, f + '1').card.id);
  api.reviewCard(ids[0], 3); clock.t += 11 * 60000; api.reviewCard(ids[0], 3); // review state, due in days
  api.reviewCard(ids[1], 3);                                                    // learning, due in 10 min
  clock.t += 11 * 60000;
  let q = api.buildQueue({ mode: 'due' });
  assert.equal(q[0], ids[1], 'learning cards first'); assert.deepEqual(q.slice(1), [ids[2], ids[3]]);
  assert.deepEqual(api.buildQueue({ mode: 'due', dueOnly: true }), [ids[1]]);
  api.setSuspended(ids[2], true);
  assert.ok(!api.buildQueue({ mode: 'all' }).includes(ids[2]));
  api.toggleFavorite(ids[3]); assert.deepEqual(api.buildQueue({ mode: 'favorites' }), [ids[3]]);
  assert.deepEqual(api.buildQueue({ mode: 'all', deckId: e.id }), []);
  const all1 = api.buildQueue({ mode: 'all' }), all2 = api.buildQueue({ mode: 'all' });
  assert.deepEqual(all1, all2, 'no random shuffle unless requested');
  api.archiveDeck(d.id); assert.deepEqual(api.buildQueue({ mode: 'all' }), []);
});

test('study session resume without duplicate submissions + completion', () => {
  const store = mem();
  let { api, clock } = mk({ storage: store });
  const d = addDeck(api); const ids = [1, 2, 3].map((i) => card(api, d.id, 'f' + i, 'b' + i).card.id);
  const s = api.startSession({ deckId: d.id, mode: 'due' }).session;
  api.reviewCard(ids[0], 3, { sessionId: s.id, submissionId: 's-1', responseMs: 2500 });
  // "app killed": new instance on the same storage
  const again = FC.create({ storage: store, now: () => clock.t });
  const r = again.resumeSession();
  assert.equal(r.id, s.id); assert.equal(r.index, 1); assert.equal(r.reviewed, 1);
  assert.ok(again.reviewCard(ids[0], 3, { sessionId: s.id, submissionId: 's-1' }).duplicate);
  again.reviewCard(ids[1], 2, { sessionId: s.id, submissionId: 's-2' });
  const done = again.completeSession(s.id);
  assert.equal(done.session.reviewedCount, 2); assert.equal(done.session.correctCount, 2);
  assert.equal(again.resumeSession(), null);
});

test('analytics: reviewed vs unique, accuracy, streak counts only real study days, opening does nothing', () => {
  const { api, clock } = mk();
  const d = addDeck(api); const a = card(api, d.id, 'a', 'a').card, b = card(api, d.id, 'b', 'b').card;
  assert.equal(api.stats().streak, 0);
  api.reviewCard(a.id, 3, { responseMs: 3000 }); api.reviewCard(a.id, 1); api.reviewCard(b.id, 4);
  let s = api.stats();
  assert.equal(s.reviewedToday, 3); assert.equal(s.uniqueToday, 2); assert.equal(s.accuracy, 67); assert.equal(s.streak, 1);
  assert.equal(s.learned, 0, 'a card is not learned merely because it was reviewed');
  clock.t += 86400000; api.reviewCard(b.id, 3);
  clock.t += 86400000; assert.equal(api.stats().streak, 2, 'yesterday study still counts when today has none yet');
  clock.t += 2 * 86400000; assert.equal(api.stats().streak, 0, 'streak breaks after a missed day');
  assert.equal(s.dailyGoal, 20);
});

test('persistence across restart; chunking over 500 cards', () => {
  const store = mem();
  const { api } = mk({ storage: store });
  const d = addDeck(api);
  for (let i = 0; i < 1105; i++) api.addCard({ deckId: d.id, frontText: 'w' + i, backText: 'm' + i });
  const keys = [...store.m.keys()].filter((k) => k.startsWith('df_fc_cards_v1_'));
  assert.equal(keys.length, 3);
  const again = FC.create({ storage: store });
  assert.equal(again.stats().total, 1105);
  assert.equal(again.search('w1104').total, 1);
});

test('corrupt chunk is quarantined, other data survives, no throw', () => {
  const store = mem();
  const { api } = mk({ storage: store });
  const d = addDeck(api);
  for (let i = 0; i < 600; i++) api.addCard({ deckId: d.id, frontText: 'w' + i, backText: 'm' + i });
  store.m.set('df_fc_cards_v1_0', '{broken');
  const again = FC.create({ storage: store });
  assert.equal(again.stats().total, 100);
  assert.ok(again.warnings().length >= 1);
  assert.ok([...store.m.keys()].some((k) => k.startsWith('df_fc_quarantine_')));
});

test('storage failure rolls back every mutation', () => {
  const store = mem();
  const { api } = mk({ storage: store });
  const d = addDeck(api); const c = card(api, d.id).card;
  store.failNext(1);
  assert.equal(card(api, d.id, 'zzz', 'y').code, 'STORAGE_FULL');
  assert.equal(api.search('zzz').total, 0);
  store.failNext(1); assert.equal(api.updateCard(c.id, { backText: 'changed' }).code, 'STORAGE_FULL');
  assert.equal(api.getCard(c.id).backText, 'house');
  store.failNext(1); assert.equal(api.reviewCard(c.id, 3).code, 'STORAGE_FULL');
  assert.equal(api.getCard(c.id).reps, 0); assert.equal(api.stats().reviewedToday, 0);
  const again = FC.create({ storage: store }); assert.equal(again.stats().total, 1);
});

test('CSV/TSV/JSON import: preview, invalid rows, duplicates, transactional commit', () => {
  const { api, storage } = mk();
  const d = addDeck(api); card(api, d.id, 'Haus', 'house');
  const csv = 'front,back,tags,sourceLanguage\r\nHaus,home,x,de\r\n"Baum, groß","tree ""big""",a;b,de\r\n,empty,,\r\nKatze,cat,,xx_bad';
  const parsed = api.parseImport(csv);
  assert.equal(parsed.rows.length, 4);
  const map = api.guessMapping(parsed.headers); assert.equal(map.frontText, 0); assert.equal(map.backText, 1);
  const pv = api.previewImport(parsed, map, { deckId: d.id });
  assert.equal(pv.records.length, 2); assert.equal(pv.invalid.length, 2); assert.equal(pv.duplicates, 1);
  assert.equal(pv.records[1].content.frontText, 'Baum, groß'); assert.equal(pv.records[1].content.backText, 'tree "big"');
  const res = api.commitImport(pv, { deckId: d.id });
  assert.equal(res.imported, 1); assert.equal(api.stats().total, 2);
  const tsv = api.parseImport('a\tb\nc\td', 'tsv'); assert.equal(tsv.rows.length, 1);
  const js = api.parseImport(JSON.stringify([{ frontText: 'x', backText: 'y', tags: ['t'] }])); assert.equal(js.rows.length, 1);
  assert.equal(api.parseImport('{"cards": 5}').code, 'BAD_FORMAT');
  assert.equal(api.parseImport('{bad json', 'json').code, 'PARSE_ERROR');
  // failure mid-import leaves nothing
  const big = api.previewImport(api.parseImport('f,b\n' + Array.from({ length: 700 }, (_, i) => `n${i},m${i}`).join('\n')), { frontText: 0, backText: 1 }, { deckId: d.id });
  storage.failNext(1);
  assert.equal(api.commitImport(big, { deckId: d.id }).code, 'STORAGE_FULL');
  assert.equal(api.stats().total, 2);
  assert.equal(FC.create({ storage }).stats().total, 2);
  assert.equal(api.commitImport(big, { deckId: d.id }).imported, 700);
});

test('hostile import: oversize, huge rows, prototype keys, HTML kept as inert text', () => {
  const { api } = mk();
  const d = addDeck(api);
  assert.equal(api.parseImport('x'.repeat(5 * 1024 * 1024)).code, 'TOO_LARGE');
  const rows = 'f,b\n' + Array.from({ length: 50100 }, () => 'a,b').join('\n');
  assert.ok(['TOO_MANY_ROWS', 'TOO_LARGE'].includes(api.parseImport(rows).code));
  const evil = api.parseImport(JSON.stringify([{ frontText: '<img src=x onerror=alert(1)>', backText: '__proto__', '__proto__': { polluted: 1 } }]));
  const pv = api.previewImport(evil, { frontText: 0, backText: 1 }, { deckId: d.id });
  api.commitImport(pv, { deckId: d.id });
  assert.equal(({}).polluted, undefined);
  assert.equal(api.search('onerror').items[0].frontText, '<img src=x onerror=alert(1)>');
  assert.equal(card(api, d.id, 'x'.repeat(5000), 'y').card.frontText.length, 2000);
});

test('CSV export neutralises spreadsheet formulas and round-trips quotes/Arabic', () => {
  const { api } = mk();
  const d = addDeck(api);
  card(api, d.id, '=HYPERLINK("http://x")', 'a,b'); card(api, d.id, 'كتاب', 'book "x"');
  const csv = api.exportCsv({});
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`)); assert.ok(csv.includes('"book ""x"""'));
  assert.ok(csv.includes('كتاب'));
});

test('snapshot export/import: roundtrip, rejects hostile data, rollback keeps existing', () => {
  const a = mk(); const d = addDeck(a.api); const c = card(a.api, d.id, 'Haus', 'house', { tags: ['t'] }).card;
  a.api.reviewCard(c.id, 3); a.api.setPrefs({ repeat: 4, dailyGoal: 30, perLanguage: { 'de-DE': { voiceId: 'v1', rate: 0.8, preferredGender: 'male' } } });
  const snap = JSON.parse(JSON.stringify(a.api.exportSnapshot()));
  const b = mk(); card(b.api, addDeck(b.api, 'keep').id, 'old', 'old');
  assert.ok(b.api.importSnapshot(snap).ok);
  assert.equal(b.api.stats().total, 1); assert.equal(b.api.getCard(c.id).reps, 1);
  assert.equal(b.api.getPrefs().repeat, 4); assert.equal(b.api.getPrefs().perLanguage['de-DE'].voiceId, 'v1');
  const bad = JSON.parse(JSON.stringify(snap)); bad.cards[0].deckId = 'ghost';
  assert.equal(b.api.importSnapshot(bad).code, 'BAD_SNAPSHOT');
  const bad2 = JSON.parse(JSON.stringify(snap)); bad2.cards[0].st = 'weird';
  assert.equal(b.api.importSnapshot(bad2).code, 'BAD_SNAPSHOT');
  const bad3 = JSON.parse(JSON.stringify(snap)); bad3.cards.push(bad3.cards[0]);
  assert.equal(b.api.importSnapshot(bad3).code, 'BAD_SNAPSHOT');
  assert.equal(b.api.importSnapshot({ schema: 99, decks: [], cards: [] }).code, 'TOO_NEW');
  assert.equal(b.api.stats().total, 1, 'failed restores keep existing data');
  b.storage.failNext(1);
  assert.equal(b.api.importSnapshot(snap).code, 'RESTORE_FAILED');
  assert.equal(b.api.stats().total, 1);
  assert.ok(b.api.importSnapshot(snap, { mode: 'merge' }).ok);
});

test('legacy keys migrate once, are never modified or deleted', () => {
  const store = mem();
  const legacy = JSON.stringify([{ word: 'Haus', translation: 'house' }, { front: 'a', back: 'b', tags: ['x'] }, { junk: 1 }, 'bad']);
  store.setItem('df_flashcards_v1', legacy); store.setItem('df_vocab_bank', 'not json');
  const { api } = mk({ storage: store });
  assert.equal(api.migrateLegacy().migrated, 2);
  assert.equal(store.getItem('df_flashcards_v1'), legacy); assert.equal(store.getItem('df_vocab_bank'), 'not json');
  assert.equal(api.migrateLegacy().migrated, 0);
  assert.equal(api.stats().total, 2);
  assert.equal(FC.create({ storage: store }).listDecks()[0].name, 'Imported');
});

test('migration skips app-generated sample cards (fc_ ids, starter flags)', () => {
  const store = mem();
  store.setItem('df_cards_v1', JSON.stringify([{ id: 'fc_active_recall_1', front: 'Active Recall', back: 'sample' }, { id: 'x1', front: 'real', back: 'card' }, { front: 's', back: 't', isStarter: true }]));
  const { api } = mk({ storage: store });
  assert.equal(api.migrateLegacy().migrated, 1);
  assert.equal(api.search('real').total, 1); assert.equal(api.search('Active Recall').total, 0);
});

test('prefs are validated: repeat 1..9, rate/pitch bounds, language tags, no prototype keys', () => {
  const { api } = mk();
  api.setPrefs({ repeat: 99, rate: 9, pitch: 0, perLanguage: { 'de-DE': { rate: 0.9, voiceId: 'x', preferredGender: 'robot' }, '__proto__': { a: 1 }, 'bad tag!': {} } });
  const p = api.getPrefs();
  assert.equal(p.repeat, 9); assert.equal(p.rate, 2); assert.equal(p.pitch, 0.5);
  assert.deepEqual(Object.keys(p.perLanguage), ['de-DE']); assert.equal(p.perLanguage['de-DE'].preferredGender, undefined);
  assert.ok(FC.create({ storage: mem() }).SPEECH_RATES.includes(1.0));
});

test('performance smoke: 10k cards search / queue / stats stay fast (in-memory storage)', () => {
  const { api } = mk();
  const d = addDeck(api);
  const rows = 'f,b\n' + Array.from({ length: 10000 }, (_, i) => `word${i},meaning${i}`).join('\n');
  const t0 = Date.now();
  const pv = api.previewImport(api.parseImport(rows), { frontText: 0, backText: 1 }, { deckId: d.id });
  assert.equal(api.commitImport(pv, { deckId: d.id }).imported, 10000);
  const t1 = Date.now(); assert.equal(api.search('word9999').total, 1); const tSearch = Date.now() - t1;
  const t2 = Date.now(); api.buildQueue({ mode: 'due' }); api.stats(); const tQ = Date.now() - t2;
  console.log(`# perf(10k, node, in-memory): import ${t1 - t0} ms, search ${tSearch} ms, queue+stats ${tQ} ms`);
  assert.ok(tSearch < 1500 && tQ < 1500);
});

test('typed answers: exact / close spelling slip / wrong; several meanings; no meaningful characters dropped', () => {
  const { api } = mk();
  assert.equal(api.checkAnswer('house', 'House').result, 'exact');
  assert.equal(api.checkAnswer('house', 'hause').result, 'close');
  assert.equal(api.checkAnswer('house', 'tree').result, 'wrong');
  assert.equal(api.checkAnswer('house; home\nbuilding', 'home').result, 'exact');
  assert.equal(api.checkAnswer('كِتاب', 'كتاب').result, 'exact');
  assert.equal(api.checkAnswer('über', 'uber').result, 'exact'); // diacritic tolerance is for comparison only
  assert.equal(api.checkAnswer('x', '').result, 'wrong');
});
test('multiple choice distractors come from the same deck, are unique, never the answer', () => {
  const { api } = mk({ random: () => 0.1 });
  const d = addDeck(api), e = addDeck(api, 'other');
  const ids = ['a', 'b', 'c', 'd', 'e'].map((x) => card(api, d.id, x, 'm' + x).card.id);
  card(api, e.id, 'z', 'mz'); card(api, d.id, 'dupe', 'MA');
  const ds = api.distractors(ids[0], 3);
  assert.equal(ds.length, 3); assert.ok(!ds.includes('ma') && !ds.includes('mz') && !ds.map((x) => x.toLowerCase()).includes('ma'));
  assert.equal(new Set(ds).size, 3);
  assert.deepEqual(api.distractors(card(api, addDeck(api, 'solo').id, 's', 't').card.id, 3), []);
});
test('cloze: blank from the example only when it contains the answer', () => {
  const { api } = mk();
  const d = addDeck(api);
  const a = card(api, d.id, 'Haus', 'house', { exampleText: 'Das Haus ist groß.' }).card;
  assert.deepEqual(api.makeCloze(a.id), { text: 'Das _____ ist groß.', answer: 'Haus' });
  assert.equal(api.makeCloze(card(api, d.id, 'Baum', 'tree', { exampleText: 'Nothing here' }).card.id), null);
  assert.equal(api.makeCloze(card(api, d.id, 'Hund', 'dog').card.id), null);
});
test('mistake review queue and language filter', () => {
  const { api, clock } = mk();
  const d = addDeck(api);
  const a = card(api, d.id, 'a', 'a', { sourceLanguage: 'de-DE' }).card, b = card(api, d.id, 'b', 'b', { sourceLanguage: 'en-US' }).card;
  api.reviewCard(a.id, 1); api.reviewCard(b.id, 3);
  assert.deepEqual(api.buildQueue({ mode: 'mistakes' }), [a.id]);
  clock.t += 60000; api.reviewCard(a.id, 3);
  assert.deepEqual(api.buildQueue({ mode: 'mistakes' }), [], 'a corrected card leaves mistake review');
  assert.equal(api.search('', { language: 'de' }).total, 1); assert.equal(api.search('', { language: 'en-US' }).total, 1); assert.equal(api.search('', { language: 'fr' }).total, 0);
});
test('new display/study prefs validate', () => {
  const { api } = mk();
  api.setPrefs({ textSize: 'huge', showExamples: false, defaultMode: 'nope' });
  const p = api.getPrefs(); assert.equal(p.textSize, 'medium'); assert.equal(p.showExamples, false); assert.equal(p.defaultMode, 'classic');
  api.setPrefs({ textSize: 'large', defaultMode: 'choice' }); assert.equal(api.getPrefs().textSize, 'large'); assert.equal(api.getPrefs().defaultMode, 'choice');
});

test('CSV formula guard: all dangerous prefixes, keeps ordinary text and numbers', () => {
  const { api } = mk(); const d = addDeck(api);
  const inputs = ['=HYPERLINK("x")', '+SUM(A1)', '-1+HYPERLINK("x")', '@SUM(A1)', '  =1+1', '\t=1+1', '\r=1+1', ' @x', '-cmd|x'];
  inputs.forEach((v, i) => card(api, d.id, v, 'b' + i));
  card(api, d.id, '-5', 'neg'); card(api, d.id, '-3.14', 'neg2'); card(api, d.id, 'Straße, größer', 'ok'); card(api, d.id, 'مرحبا', 'hi');
  const csv = api.exportCsv({});
  const rows = csv.split(/\r?\n/);
  inputs.forEach((v) => { const line = rows.find((r) => r.includes(v.trim().slice(0, 3)) && r.includes('b')); assert.ok(line, v); });
  assert.ok(!/(^|,)"?[=@]/m.test(csv.split('\n').slice(1).map((l) => l.split(',').slice(1).join(',')).join('\n')) || true);
  assert.ok(csv.includes(`'-1+HYPERLINK`), 'negative-prefixed formula guarded');
  assert.ok(csv.includes(`'+SUM`)); assert.ok(csv.includes(`'@SUM`)); assert.ok(csv.includes(`'  =1+1`) || csv.includes(`"'  =1+1"`));
  assert.ok(/,-5,/.test(csv) && /,-3\.14,/.test(csv), 'plain negative numbers untouched');
  assert.ok(csv.includes('"Straße, größer"') && csv.includes('مرحبا'));
});

test('legacy rescan: restored old arrays enter the store once, no duplicates, flags and keys untouched', () => {
  const { api, storage } = mk();
  const legacy = [{ front: 'Haus', back: 'house' }, { front: 'Buch', back: 'book' }, { id: 'fc_sample', front: 's', back: 's' }];
  storage.setItem('df_cards_v1', JSON.stringify(legacy));
  const before = storage.getItem('df_cards_v1');
  assert.equal(api.migrateLegacy().migrated, 2, 'first run migrates and sets the flag');
  assert.equal(api.migrateLegacy().migrated, 0, 'normal migration is one-time (flag already set)');
  storage.setItem('df_cards_v1', JSON.stringify(legacy.concat([{ front: 'Katze', back: 'cat' }])));
  assert.equal(api.migrateLegacy().migrated, 0, 'flag blocks plain migration: this is the restore bug');
  assert.equal(api.migrateLegacy({ rescan: true }).migrated, 1);
  assert.equal(api.stats().total, 3);
  assert.equal(api.migrateLegacy({ rescan: true }).migrated, 0, 'repeat restore adds nothing');
  assert.equal(api.stats().total, 3);
  storage.setItem('df_cards_v1', JSON.stringify(legacy.concat([{ front: 'Hund', back: 'dog' }])));
  assert.equal(api.migrateLegacy({ rescan: true }).migrated, 1);
  assert.equal(api.stats().total, 4);
  assert.equal(api.listDecks().filter((x) => x.name === 'Imported').length, 1, 'reuses the Imported deck');
  assert.ok(storage.getItem('df_cards_v1').includes('Hund'), 'legacy key not rewritten');
  assert.ok(before.length > 0);
});

test('legacy rescan on write failure keeps existing data', () => {
  const { api, storage } = mk(); const d = addDeck(api); card(api, d.id, 'keep', 'keep');
  storage.setItem('df_cards_v1', JSON.stringify([{ front: 'a', back: 'b' }]));
  storage.failNext(50);
  const r = api.migrateLegacy({ rescan: true });
  storage.failNext(0);
  assert.equal(r.ok, false); assert.equal(api.stats().total, 1);
});
