'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Studio = require('../../android/app/src/main/assets/web/analytics_studio.js');

function mountWithPendingExport(onExport) {
  const doc = {createElement(tag) {return {
    tagName: tag.toUpperCase(), children: [], style: {}, attributes: {}, events: {},
    value: '', textContent: '',
    setAttribute(key, value) {this.attributes[key] = value;},
    getAttribute(key) {return this.attributes[key];},
    addEventListener(key, handler) {this.events[key] = handler;},
    appendChild(child) {this.children.push(child);
      if (this.tagName === 'SELECT' && !this.value) this.value = child.value;
      return child;},
    append(...children) {this.children.push(...children);},
    replaceChildren(...children) {this.children = children;},
    remove() {this.removed = true;}
  };}};
  const target = {ownerDocument: doc, appendChild(child) {this.child = child;}};
  const studio = Studio.mount(target, () => ({
    sessionHistory: [{id: 'real-1', date: '2026-10-19', domain: 'study', minutes: 25}],
    tasksList: []
  }), {locale: 'de', today: '2026-10-20', startDate: '2026-10-01',
    endDate: '2026-10-20', onExport});
  const filters = target.child.children.find(x => x.className === 'dfa-filters');
  const fields = filters.children.filter(x => x.tagName === 'LABEL')
    .map(label => label.children[0]);
  const button = filters.children.find(x => x.tagName === 'BUTTON');
  return {studio, start: fields[2], end: fields[3], button};
}

test('invalid date disables CSV button even before any export', () => {
  let submitted = 0;
  const ui = mountWithPendingExport(() => {submitted++; return {status: 'saved'};});
  ui.start.value = '2030-10-20';
  ui.start.events.change();
  assert.equal(ui.button.disabled, true, 'Invalid dates must not expose an enabled export action');
  ui.button.events.click();
  assert.equal(submitted, 0);
  ui.start.value = '2026-10-18';
  ui.start.events.change();
  assert.equal(ui.button.disabled, false, 'Repairing dates must re-enable the export action');
  ui.studio.destroy();
});

test('late native SAF receipt cannot re-enable export for a newly invalid date range', async () => {
  let finish;
  let submitted = 0;
  const ui = mountWithPendingExport(() => {
    submitted++;
    return new Promise(resolve => {finish = resolve;});
  });
  const pending = ui.button.events.click();
  assert.equal(ui.button.disabled, true, 'Native save is still pending');
  ui.start.value = '2030-10-20';
  ui.start.events.change();
  finish({status: 'saved'});
  await pending;
  assert.equal(submitted, 1);
  assert.equal(ui.button.disabled, true, 'Late saved receipt must not override invalid range');
  ui.start.value = '2026-10-18';
  ui.start.events.change();
  assert.equal(ui.button.disabled, false);
  ui.studio.destroy();
});
