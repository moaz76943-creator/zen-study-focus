'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Read = require('../../android/app/src/main/assets/web/js/room5/reading_bookmarks_engine.js');

const book = () => Read.createBook({ title: ' Deutsch A1 ', totalPages: 200, currentPage: 15 }).book;

test('B03 exposes a deterministic offline book schema', () => {
  assert.equal(Read.SCHEMA_VERSION, 1);
  assert.equal(typeof Read.createBook, 'function');
  const a = book();
  assert.equal(a.title, 'Deutsch A1');
  assert.equal(a.currentPage, 15);
  assert.equal(a.totalPages, 200);
  assert.deepEqual(a.bookmarks, []);
  assert.deepEqual(book(), a);
  assert.equal(Read.validateBook(a).ok, true);
});

test('B03 tracks reading progress without backwards regression by default', () => {
  const origin = book();
  const up = Read.updateProgress(origin, 48);
  assert.equal(up.ok, true);
  assert.equal(up.book.currentPage, 48);
  const down = Read.updateProgress(up.book, 10);
  assert.equal(down.ok, true);
  assert.equal(down.book.currentPage, 48);
  assert.equal(origin.currentPage, 15);
  assert.equal(Read.updateProgress(up.book, 10, { allowRegression: true }).book.currentPage, 10);
  assert.equal(Read.updateProgress(up.book, 500).book.currentPage, 200);
  assert.equal(Read.updateProgress(up.book, NaN).ok, false);
});

test('B03 bookmarks can be added and removed without mutating callers', () => {
  const origin = book();
  const added = Read.addBookmark(origin, { page: 39, label: ' New words ' });
  assert.equal(added.ok, true);
  assert.equal(added.book.bookmarks.length, 1);
  assert.equal(added.book.bookmarks[0].label, 'New words');
  assert.equal(added.book.bookmarks[0].page, 39);
  assert.deepEqual(origin.bookmarks, []);
  const repeat = Read.addBookmark(added.book, { page: 39, label: 'Revision' });
  assert.equal(repeat.book.bookmarks.length, 1);
  assert.equal(repeat.book.bookmarks[0].label, 'Revision');
  assert.equal(repeat.book.bookmarks[0].id, added.book.bookmarks[0].id);
  assert.equal(Read.removeBookmark(repeat.book, repeat.book.bookmarks[0].id).book.bookmarks.length, 0);
  assert.equal(Read.addBookmark(book(), { page: 201, label: 'bad' }).ok, false);
});

test('B03 normalizes, round-trips and rejects malformed snapshots safely', () => {
  const old = { schemaVersion: 0, title: 'History', totalPages: 10, currentPage: 6, bookmarks: [{ page: 3, label: 'Marker' }] };
  const updated = Read.migrate(old);
  assert.equal(updated.ok, true);
  assert.equal(updated.book.schemaVersion, 1);
  assert.equal(updated.book.bookmarks.length, 1);
  assert.deepEqual(Read.parse(Read.serialize(updated.book)).book, updated.book);
  assert.equal(Read.parse('{ invalid').ok, false);
  assert.equal(Read.parse(JSON.stringify({schemaVersion: 99, title:'X'})).ok, false);
  assert.equal(Read.createBook({title:'',totalPages:20}).ok, false);
});

test('B03 summary is derived solely from actual book state', () => {
  const before=book();
  const after=Read.addBookmark(before,{page:100,label:'half'}).book;
  const summary=Read.summarizeBook(after);
  assert.equal(summary.currentPage,15);
  assert.equal(summary.totalPages,200);
  assert.equal(summary.percentComplete,7.5);
  assert.equal(summary.bookmarkCount,1);
  assert.equal(Read.validateBook(after).ok,true);
});
