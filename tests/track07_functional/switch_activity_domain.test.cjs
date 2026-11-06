'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');
const start = source.indexOf('function switchActivityDomain(dom, el) {');
const end = source.indexOf('/* Home timer shortcuts', start);
assert.ok(start >= 0 && end > start, 'Cannot locate production domain switch');
const functionSource = source.slice(start, end);

function fixture({
  ack = 'true',
  accepted = true,
  quick = false,
  timerRun = false,
  timerSession = null,
  lang = 'en',
  domain = 'study',
  timerLeft = 0,
  timerTotal = 1500
} = {}) {
  const events = [], notices = [];
  const cfg = { lang, domain };

  // Create a minimal mock element with classList
  const createMockElement = (id) => ({
    id,
    classList: {
      add: (cls) => events.push(`add_class_${id}_${cls}`),
      remove: (cls) => events.push(`remove_class_${id}_${cls}`),
      toggle: (cls, force) => events.push(`toggle_class_${id}_${cls}_${force}`)
    },
    textContent: ''
  });

  const mockCards = [
    createMockElement('card1'),
    createMockElement('card2')
  ];

  const mockElements = {
    'sportContextBar': createMockElement('sportContextBar'),
    'readContextBar': createMockElement('readContextBar'),
    'modeFocusBtn': createMockElement('modeFocusBtn')
  };

  const context = {
    cfg,
    quickTraining: quick ? { active: true } : null,
    timerRunning: timerRun,
    timerSessionId: timerSession,
    timerLeft: timerLeft,
    timerTotal: timerTotal,
    window: { confirm() { events.push('confirm'); return accepted; } },
    quickText: () => 'Replace?',
    toWest: x => String(x),
    saveFortressData(key, next) {
      events.push('ack');
      if (ack === 'throw') throw Error('FAIL');
      return ack === 'true';
    },
    toggleTimerPlay() { events.push('toggle'); context.timerRunning = false; },
    renderQuickTraining() { events.push('renderTraining'); },
    renderDomainState() { events.push('renderDomain'); },
    L() { return { domStudy: 'Study', domSport: 'Sport', domRead: 'Reading', domWork: 'Work' }; },
    getDomainFocusMinutes: () => 30,
    selectTimerMode() { events.push('mode'); },
    showToast: t => notices.push(String(t)),
    document: {
      getElementById: (id) => mockElements[id] || createMockElement(id),
      querySelectorAll: (selector) => {
        if (selector === '.domain-card') return mockCards;
        return [];
      }
    }
  };
  const ctx = vm.createContext(context);
  vm.runInContext(functionSource, ctx, { filename: 'app.js:switchActivityDomain' });
  return {
    cfg, context, events, notices,
    run: (dom) => {
      const mockEl = createMockElement('clicked_el');
      return vm.runInContext(`switchActivityDomain('${dom}', ${JSON.stringify(mockEl)})`, ctx);
    }
  };
}

test('switchActivityDomain rejects invalid domains', () => {
  const f = fixture();
  assert.equal(f.run('invalid_domain'), false);
  assert.deepEqual(f.events, []);
});

test('switchActivityDomain returns false if domain is already active', () => {
  const f = fixture({ domain: 'study' });
  assert.equal(f.run('study'), false);
  assert.deepEqual(f.events, []);
});

test('switchActivityDomain changes domain without confirmation if no active session', () => {
  const f = fixture({ domain: 'study' });
  assert.equal(f.run('work'), true);
  assert.equal(f.cfg.domain, 'work');
  assert.ok(!f.events.includes('confirm'), 'Should not prompt for confirmation');
  assert.ok(f.events.includes('ack'));
  assert.ok(f.events.includes('renderDomain'));
  assert.ok(f.events.includes('mode'));
  assert.equal(f.notices[0], '💻 Work (30m)');
});

test('switchActivityDomain prompts confirmation if timer is running', () => {
  const f = fixture({ domain: 'study', timerRun: true });
  assert.equal(f.run('work'), true);
  assert.ok(f.events.includes('confirm'), 'Should prompt for confirmation');
});

test('switchActivityDomain prompts confirmation if session exists but timer is paused', () => {
  const f = fixture({ domain: 'study', timerRun: false, timerSession: '123', timerLeft: 100, timerTotal: 200 });
  assert.equal(f.run('work'), true);
  assert.ok(f.events.includes('confirm'), 'Should prompt for confirmation');
});

test('switchActivityDomain Arabic translation for save failure', () => {
  const f = fixture({ domain: 'study', lang: 'ar', ack: 'false' });
  assert.equal(f.run('work'), false);
  assert.equal(f.notices[0], 'تعذر حفظ النشاط. حاول مرة أخرى.');
});

test('switchActivityDomain English translation for save failure', () => {
  const f = fixture({ domain: 'study', lang: 'en', ack: 'false' });
  assert.equal(f.run('work'), false);
  assert.equal(f.notices[0], 'Could not save activity. Try again.');
});

test('switchActivityDomain applies correct labels for each domain', () => {
  const f = fixture({ domain: 'study' });

  assert.equal(f.run('sport'), true);
  assert.ok(f.notices[f.notices.length - 1].includes('🏋️ Sport'));

  const f2 = fixture({ domain: 'study' });
  assert.equal(f2.run('read'), true);
  assert.ok(f2.notices[f2.notices.length - 1].includes('📖 Reading'));

  const f3 = fixture({ domain: 'study' });
  assert.equal(f3.run('work'), true);
  assert.ok(f3.notices[f3.notices.length - 1].includes('💻 Work'));
});
