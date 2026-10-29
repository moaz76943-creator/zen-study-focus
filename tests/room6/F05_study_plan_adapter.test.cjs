'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADAPTER_PATH = path.join(
  __dirname, '..', '..',
  'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'room6', 'study_plan_adapter.js'
);
const ENGINE_PATH = path.join(
  __dirname, '..', '..',
  'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'room5', 'study_plan_templates_engine.js'
);

const Adapter = require(ADAPTER_PATH);
const Engine = require(ENGINE_PATH);

const makeCustomSpec = () => ({
  name: 'Physics Cram',
  subject: 'Physics',
  days: ['mon', 'wed', 'sat'],
  sessionMinutes: 60,
  breakMinutes: 10,
  sessionsPerDay: 2,
  startDate: '2026-01-05',
  weeks: 4,
  notes: '',
  tags: ['physics', 'cram']
});

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the study plan adapter');
  };
  const createElement = (tag) => {
    const node = {
      tagName: String(tag).toLowerCase(),
      children: [],
      attributes: {},
      textContent: '',
      setAttribute(name, value) { this.attributes[String(name)] = String(value); },
      appendChild(child) { this.children.push(child); return child; }
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

test('F05 adapter binds the real merged B01 study plan templates engine', () => {
  assert.equal(Adapter.schemaVersion, Engine.SCHEMA_VERSION);
  assert.equal(Adapter.schemaVersion, 1);
  assert.equal(Adapter.engine, Engine, 'adapter must operate on the actual engine module, not a mock');
  assert.deepEqual(Adapter.WEEKDAYS, Engine.WEEKDAYS);
  for (const fn of ['validateCustomPlan', 'validateTemplatePlan', 'listTemplates', 'createSevenDaySchedule', 'createPlanViewModel', 'safeRenderPlan', 'mountStudyPlanView']) {
    assert.equal(typeof Adapter[fn], 'function');
  }
  assert.throws(() => Adapter.createStudyPlanAdapter(null), /engine/i);
});

test('templates passthrough from the engine without fabrication', () => {
  const templates = Adapter.listTemplates();
  assert.equal(templates.length, Engine.listTemplates().length);
  assert.ok(templates.some((template) => template.id === 'plan_exam_cram'));
  const direct = Adapter.validateTemplatePlan('plan_deep_work', { name: 'My Deep Blocks' });
  assert.equal(direct.ok, true);
  assert.equal(direct.plan.templateId, 'plan_deep_work');
  assert.equal(direct.plan.sessionMinutes, 90);
  assert.equal(Engine.validatePlan(direct.plan).ok, true);
  const unknown = Adapter.validateTemplatePlan('plan_nope', {});
  assert.equal(unknown.ok, false);
  assert.equal(unknown.errors[0].code, 'TEMPLATE_NOT_FOUND');
  assert.deepEqual(
    Adapter.validateTemplatePlan('plan_nope', {}).errors,
    Engine.createPlanFromTemplate('plan_nope', {}).errors
  );
});

test('custom plan inputs validate through the engine with real error codes', () => {
  const good = Adapter.validateCustomPlan(makeCustomSpec());
  assert.equal(good.ok, true);
  assert.equal(Engine.validatePlan(good.plan).ok, true, 'adapter output must satisfy the engine itself');
  assert.equal(good.plan.name, 'Physics Cram');

  const bad = Adapter.validateCustomPlan({
    name: 'Valid Name', days: ['funday', 'mon', 'mon'],
    sessionMinutes: 3, breakMinutes: -5, sessionsPerDay: 99, weeks: 1, tags: ['x', 5]
  });
  assert.equal(bad.ok, false);
  const codes = new Set(bad.errors.map((error) => error.code));
  assert.ok(codes.has('DAYS_INVALID'), 'unknown weekday rejected');
  assert.ok(codes.has('SESSION_MINUTES_RANGE'), 'out-of-range session length rejected');
  assert.ok(codes.has('BREAK_MINUTES_RANGE'), 'out-of-range break rejected');
  assert.ok(codes.has('SESSIONS_PER_DAY_RANGE'), 'out-of-range sessions per day rejected');
  const overLimit = Adapter.validateCustomPlan({ name: 'x'.repeat(61), days: ['mon'] });
  assert.equal(overLimit.ok, false);
  assert.equal(overLimit.errors[0].code, 'NAME_TOO_LONG');
  assert.equal(Adapter.validateCustomPlan('not-an-object').errors[0].code, 'SPEC_NOT_OBJECT');
});

test('seven-day schedule is concrete, localized-weekday-aware and deterministic', () => {
  const plan = Adapter.validateCustomPlan(makeCustomSpec()).plan;
  const before = JSON.stringify(plan);
  const schedule = Adapter.createSevenDaySchedule(plan);
  assert.equal(schedule.ok, true);
  assert.equal(schedule.anchorDate, '2026-01-05');
  assert.equal(schedule.days.length, 7);
  assert.deepEqual(schedule.days.map((day) => day.weekday), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(schedule.days[0].scheduled, true, '2026-01-05 is a Monday study day');
  assert.equal(schedule.days[0].date, '2026-01-05');
  assert.equal(schedule.days[1].scheduled, false);
  assert.equal(schedule.days[4].scheduled, false);
  assert.equal(schedule.days[5].scheduled, true, '2026-01-10 is Saturday');
  assert.deepEqual(schedule.days.map((day) => day.date), [
    '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10', '2026-01-11'
  ]);
  const studyDay = schedule.days[0];
  assert.equal(studyDay.sessions.length, 2);
  assert.deepEqual(studyDay.sessions[0], { sessionIndex: 0, focusMinutes: 60, breakMinutes: 10, totalMinutes: 70 });
  assert.deepEqual(studyDay.sessions[1], { sessionIndex: 1, focusMinutes: 60, breakMinutes: 0, totalMinutes: 60 });
  assert.equal(studyDay.focusMinutes, 120);
  assert.equal(studyDay.breakMinutes, 10);
  assert.equal(studyDay.totalMinutes, 130);
  assert.equal(schedule.days[1].sessions.length, 0);
  assert.equal(JSON.stringify(plan), before, 'schedule building must never mutate the plan');

  const anchored = Adapter.createSevenDaySchedule({ ...plan, startDate: null }, '2026-02-16');
  assert.equal(anchored.ok, true);
  assert.equal(anchored.anchorDate, '2026-02-16');
  assert.equal(new Date(Date.parse(anchored.days[0].date + 'T00:00:00Z')).getUTCDay(), 1, 'anchor day drifts with the anchor, weekday stays mon');
  assert.equal(anchored.days[0].weekday, 'mon');

  const noAnchor = Adapter.createSevenDaySchedule({ ...plan, startDate: null });
  assert.equal(noAnchor.ok, false);
  assert.equal(noAnchor.errors[0].code, 'ANCHOR_REQUIRED');
  const fakeDate = Adapter.createSevenDaySchedule({ ...plan, startDate: null }, '2026-02-30');
  assert.equal(fakeDate.ok, false);
  assert.equal(fakeDate.errors[0].code, 'ANCHOR_INVALID');
  assert.equal(Adapter.createSevenDaySchedule({ ...plan, days: [] }).errors[0].code, 'DAYS_EMPTY');
});

test('viewmodel pairs engine summary with the schedule and surfaces schedule errors', () => {
  const plan = Adapter.validateCustomPlan(makeCustomSpec()).plan;
  const vm = Adapter.createPlanViewModel(plan);
  assert.equal(vm.ok, true);
  assert.equal(Object.isFrozen(vm.viewmodel), true);
  assert.deepEqual(vm.viewmodel.summary, Engine.summarizePlan(plan));
  assert.equal(vm.viewmodel.summary.hoursPerWeek, 7, '3 days x 2 x (60+10) min per week');
  assert.equal(vm.viewmodel.summary.planHours, 28);
  assert.equal(vm.viewmodel.schedule.days.length, 7);
  assert.equal(vm.viewmodel.scheduleErrors, null);

  const noStart = Adapter.createPlanViewModel({ ...plan, startDate: null });
  assert.equal(noStart.ok, true, 'schedule problems do not invalidate the viewmodel');
  assert.equal(noStart.viewmodel.schedule, null);
  assert.equal(noStart.viewmodel.scheduleErrors[0].code, 'ANCHOR_REQUIRED');
  const anchored = Adapter.createPlanViewModel({ ...plan, startDate: null }, { anchorDate: '2026-02-16' });
  assert.equal(anchored.viewmodel.schedule.days.length, 7);

  const junk = Adapter.createPlanViewModel({ name: '', days: ['mon'] });
  assert.equal(junk.ok, false);
  assert.ok(junk.errors.length >= 1);
});

test('render plan is a declarative innerHTML-free DOM contract showing the 7 days', () => {
  const plan = Adapter.validateCustomPlan(makeCustomSpec()).plan;
  const vm = Adapter.createPlanViewModel(plan);
  const rendered = Adapter.safeRenderPlan(vm.viewmodel);
  const nodes = flattenPlan(rendered);
  assert.equal(rendered.tag, 'section');
  assert.equal(rendered.attrs['aria-label'], 'Physics Cram');
  const textNode = (cls) => nodes.find((entry) => entry.node.attrs && entry.node.attrs.class === cls).node.text;
  assert.equal(textNode('study-plan-name'), 'Physics Cram');
  assert.equal(textNode('study-plan-subject'), 'Physics');
  assert.equal(textNode('study-plan-summary'), '7 h/week across 6 sessions (3 study days); plan total 4 weeks / 28 h');
  const dayList = nodes.find((entry) => entry.node.tag === 'ol').node;
  assert.equal(dayList.children.length, 7);
  assert.equal(dayList.children[0].attrs['data-date'], '2026-01-05');
  assert.equal(dayList.children[0].attrs['data-weekday'], 'mon');
  assert.ok(dayList.children[0].attrs.class.includes('study-plan-day'));
  assert.ok(!dayList.children[0].attrs.class.includes('study-plan-rest'));
  const sessions = dayList.children[0].children.filter((kid) => kid.attrs.class === 'study-plan-session');
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].text, 'S2: 60 min focus + 0 min break');
  const rest = dayList.children[1];
  assert.ok(rest.attrs.class.includes('study-plan-rest'));
  assert.ok(rest.children.some((kid) => kid.text === 'Rest day'));

  const missing = Adapter.safeRenderPlan(Adapter.createPlanViewModel({ ...plan, startDate: null }).viewmodel);
  const missingNodes = flattenPlan(missing);
  assert.ok(missingNodes.some((entry) => entry.node.attrs.class === 'study-plan-schedule-missing' && /start date or anchor/i.test(entry.node.text)));
  assert.equal(JSON.stringify(rendered).includes('http'), false);
});

test('mounting uses only safe DOM primitives and textContent', () => {
  const plan = Adapter.validateCustomPlan(makeCustomSpec()).plan;
  const vm = Adapter.createPlanViewModel(plan);
  const doc = makeFakeDocument();
  const root = Adapter.mountStudyPlanView(doc.createElement('div'), Adapter.safeRenderPlan(vm.viewmodel), doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes['aria-label'], 'Physics Cram');
  assert.equal(root.children.length, 4);
  assert.equal(root.children[0].textContent, 'Physics Cram');
  const dayList = root.children[3];
  assert.equal(dayList.children.length, 7);
  const firstDay = dayList.children[0];
  assert.equal(firstDay.attributes['data-date'], '2026-01-05');
  assert.equal(firstDay.children[0].textContent, '2026-01-05');
  assert.equal(firstDay.children[2].textContent, '2 x 60 min focus');
  const injected = doc.createElement('div');
  const hijacked = Adapter.safeRenderPlan({
    ...vm.viewmodel,
    plan: { ...vm.viewmodel.plan, name: '<script>alert(1)</script>' }
  });
  const mounted = Adapter.mountStudyPlanView(injected, hijacked, doc);
  assert.equal(mounted.attributes['aria-label'], '<script>alert(1)</script>');
  assert.equal(mounted.children[0].textContent, '<script>alert(1)</script>');
  assert.doesNotThrow(() => JSON.stringify(mounted.children), 'name stays inert text, never markup');
  assert.throws(() => Adapter.mountStudyPlanView(doc.createElement('div'), Adapter.safeRenderPlan(vm.viewmodel), null), /document/i);
});

test('adapter source stays offline, write-free and innerHTML-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/setTimeout|setInterval|Date\.now|new Date\(\)/.test(source), false, 'no timers or wall-clock reads');
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
  const requireArgs = [...source.matchAll(/require\(\s*([^)]+?)\s*\)/g)].map((match) => match[1]);
  assert.ok(requireArgs.length >= 1, 'adapter must load the engine module via require');
  const targets = new Set();
  for (const arg of requireArgs) {
    const literal = arg.match(/^['"]([^'"]+)['"]$/);
    if (literal) { targets.add(literal[1]); continue; }
    const declared = source.match(new RegExp(`(?:const|let|var)\\s+${arg.trim()}\\s*=\\s*['"]([^'"]+)['"]`));
    assert.ok(declared, `require target ${arg} must resolve to a local module path`);
    targets.add(declared[1]);
  }
  assert.deepEqual([...targets], ['../room5/study_plan_templates_engine.js']);
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
});
