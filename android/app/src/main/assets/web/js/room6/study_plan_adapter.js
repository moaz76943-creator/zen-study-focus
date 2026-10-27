/** Deep Focus Room6 F05 — offline study scheduling adapter over the real merged B01 study plan templates engine; no storage, no network, no writes. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusStudyPlanAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/study_plan_templates_engine.js';
  const GLOBAL_ENGINE_KEY = 'StudyPlanTemplatesEngine';

  const WEEKDAYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const DAY_LABELS = Object.freeze({
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
  });

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('StudyPlanTemplatesEngine engine is required: load room5/study_plan_templates_engine.js first');
  }

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function frozenErrors(errors) {
    return Object.freeze((errors || []).map((error) => Object.freeze({ code: String(error.code), field: String(error.field), message: String(error.message) })));
  }

  function parseIsoDate(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const year = Number(text.slice(0, 4));
    const month = Number(text.slice(5, 7));
    const day = Number(text.slice(8, 10));
    const ms = Date.UTC(year, month - 1, day);
    const check = new Date(ms);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return ms;
  }

  function formatIsoDate(ms) {
    const date = new Date(ms);
    return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
  }

  function weekdayKeyForDate(ms) {
    const date = new Date(ms);
    return WEEKDAYS[(date.getUTCDay() + 6) % 7];
  }

  function createStudyPlanAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('StudyPlanTemplatesEngine engine is required: load room5/study_plan_templates_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.createCustomPlan !== 'function' || typeof engine.createPlanFromTemplate !== 'function' || typeof engine.summarizePlan !== 'function') {
      throw new Error('StudyPlanTemplatesEngine engine is required: load room5/study_plan_templates_engine.js first');
    }

    const STRICT_VALIDATION_ID = 'plan_adapter_strict';

    function rawPlanForValidation(spec, base) {
      const defaults = engine.PLAN_DEFAULTS;
      const raw = {
        id: STRICT_VALIDATION_ID,
        name: '',
        subject: defaults.subject,
        templateId: base,
        days: defaults.days.slice(),
        sessionMinutes: defaults.sessionMinutes,
        breakMinutes: defaults.breakMinutes,
        sessionsPerDay: defaults.sessionsPerDay,
        startDate: defaults.startDate,
        weeks: defaults.weeks,
        notes: defaults.notes,
        tags: defaults.tags.slice()
      };
      for (const key of Object.keys(spec || {})) {
        if (key === 'templateId') continue;
        raw[key] = Array.isArray(spec[key]) ? spec[key].slice() : spec[key];
      }
      return raw;
    }

    function validatedOutcome(outcome, strictErrors) {
      if (!outcome.ok || strictErrors) {
        return Object.freeze({ ok: false, errors: frozenErrors(strictErrors || outcome.errors) });
      }
      const strict = engine.validatePlan(outcome.plan);
      return strict.ok
        ? Object.freeze({ ok: true, plan: Object.freeze(outcome.plan) })
        : Object.freeze({ ok: false, errors: frozenErrors(strict.errors) });
    }

    function validateCustomPlan(spec) {
      if (!isRecord(spec)) {
        return Object.freeze({ ok: false, errors: frozenErrors(engine.createCustomPlan(spec).errors) });
      }
      const raw = rawPlanForValidation(spec, null);
      const strict = engine.validatePlan(raw);
      return validatedOutcome(engine.createCustomPlan(spec), strict.ok ? null : strict.errors);
    }

    function validateTemplatePlan(templateId, overrides) {
      const template = engine.getTemplate(templateId);
      if (!template) {
        return Object.freeze({ ok: false, errors: frozenErrors(engine.createPlanFromTemplate(templateId, overrides).errors) });
      }
      const strict = engine.validatePlan(rawPlanForValidation(isRecord(overrides) ? overrides : {}, template.id));
      return validatedOutcome(engine.createPlanFromTemplate(templateId, overrides), strict.ok ? null : strict.errors);
    }

    function listTemplates() {
      return Object.freeze(engine.listTemplates().map((template) => Object.freeze(template)));
    }

    function createSevenDaySchedule(plan, anchorDate) {
      if (!isRecord(plan)) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'PLAN_NOT_OBJECT', field: 'plan', message: 'Plan must be a plain object.' }]) });
      }
      const anchorText = typeof anchorDate === 'string' ? anchorDate : null;
      const anchorMs = parseIsoDate(anchorText || plan.startDate);
      if (anchorMs === null) {
        const code = anchorText ? 'ANCHOR_INVALID' : 'ANCHOR_REQUIRED';
        const message = anchorText
          ? 'anchorDate must be a real YYYY-MM-DD date.'
          : 'Plan needs startDate or an explicit anchorDate option for a concrete schedule.';
        return Object.freeze({ ok: false, errors: frozenErrors([{ code, field: 'anchorDate', message }]) });
      }
      const days = WEEKDAYS.filter((day) => Array.isArray(plan.days) && plan.days.indexOf(day) !== -1);
      if (!days.length) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'DAYS_EMPTY', field: 'days', message: 'Plan has no study days.' }]) });
      }
      const sessionMinutes = Number.isInteger(plan.sessionMinutes) ? plan.sessionMinutes : null;
      const breakMinutes = Number.isInteger(plan.breakMinutes) ? plan.breakMinutes : null;
      const sessionsPerDay = Number.isInteger(plan.sessionsPerDay) ? plan.sessionsPerDay : null;
      if (sessionMinutes === null || breakMinutes === null || sessionsPerDay === null) {
        return Object.freeze({ ok: false, errors: frozenErrors([{ code: 'PLAN_NOT_CANONICAL', field: 'plan', message: 'Schedule requires a normalized plan with integer timings.' }]) });
      }
      const entries = [];
      for (let offset = 0; offset < 7; offset++) {
        const ms = anchorMs + offset * 86400000;
        const key = weekdayKeyForDate(ms);
        const scheduled = days.indexOf(key) !== -1;
        const sessions = [];
        let totalFocus = 0;
        let totalBreak = 0;
        if (scheduled) {
          for (let index = 0; index < sessionsPerDay; index++) {
            const isLast = index === sessionsPerDay - 1;
            sessions.push(Object.freeze({
              sessionIndex: index,
              focusMinutes: sessionMinutes,
              breakMinutes: isLast ? 0 : breakMinutes,
              totalMinutes: sessionMinutes + (isLast ? 0 : breakMinutes)
            }));
            totalFocus += sessionMinutes;
            totalBreak += isLast ? 0 : breakMinutes;
          }
        }
        entries.push(Object.freeze({
          date: formatIsoDate(ms),
          weekday: key,
          weekdayLabel: DAY_LABELS[key],
          scheduled,
          sessions: Object.freeze(sessions),
          focusMinutes: totalFocus,
          breakMinutes: totalBreak,
          totalMinutes: totalFocus + totalBreak
        }));
      }
      return Object.freeze({ ok: true, anchorDate: formatIsoDate(anchorMs), days: Object.freeze(entries) });
    }

    function createPlanViewModel(plan, options) {
      const opts = isRecord(options) ? options : {};
      const summary = engine.summarizePlan(plan);
      if (!summary) {
        const validated = isRecord(plan) ? engine.validatePlan(plan) : { errors: [{ code: 'PLAN_NOT_OBJECT', field: 'plan', message: 'Plan must be a plain object.' }] };
        return Object.freeze({ ok: false, errors: frozenErrors(validated.errors) });
      }
      const schedule = createSevenDaySchedule(plan, opts.anchorDate);
      const viewmodel = Object.freeze({
        plan: Object.freeze({
          id: plan.id, name: plan.name, subject: plan.subject, templateId: plan.templateId,
          days: Object.freeze(WEEKDAYS.filter((day) => plan.days.indexOf(day) !== -1)),
          sessionMinutes: plan.sessionMinutes, breakMinutes: plan.breakMinutes,
          sessionsPerDay: plan.sessionsPerDay, startDate: plan.startDate,
          weeks: plan.weeks, notes: plan.notes, tags: Object.freeze((plan.tags || []).slice())
        }),
        summary: Object.freeze(summary),
        schedule: schedule.ok ? schedule : null,
        scheduleErrors: schedule.ok ? null : schedule.errors
      });
      return Object.freeze({ ok: true, viewmodel });
    }

    function safeRenderPlan(viewmodel) {
      const leaf = (tag, className, text) => Object.freeze({
        tag, attrs: Object.freeze({ class: className }), text, children: Object.freeze([])
      });
      const vm = viewmodel;
      const summaryLine = `${vm.summary.hoursPerWeek} h/week across ${vm.summary.sessionsPerWeek} sessions (${vm.summary.daysPerWeek} study days); plan total ${vm.plan.weeks} weeks / ${vm.summary.planHours} h`;
      const dayNodes = vm.schedule ? vm.schedule.days.map((day) => {
        const key = day.scheduled ? 'study-plan-day' : 'study-plan-day study-plan-rest';
        const kids = [leaf('span', 'study-plan-day-date', day.date), leaf('span', 'study-plan-day-name', day.weekdayLabel)];
        if (day.scheduled) {
          kids.push(leaf('span', 'study-plan-day-load', `${day.sessions.length} x ${vm.plan.sessionMinutes} min focus`));
          for (let i = 0; i < day.sessions.length; i++) {
            const session = day.sessions[i];
            kids.push(Object.freeze({
              tag: 'span',
              attrs: Object.freeze({ class: 'study-plan-session', 'data-session-index': String(session.sessionIndex) }),
              text: `S${session.sessionIndex + 1}: ${session.focusMinutes} min focus + ${session.breakMinutes} min break`,
              children: Object.freeze([])
            }));
          }
        } else {
          kids.push(leaf('span', 'study-plan-day-load', 'Rest day'));
        }
        return Object.freeze({
          tag: 'li',
          attrs: Object.freeze({ class: key, 'data-date': day.date, 'data-weekday': day.weekday }),
          children: Object.freeze(kids)
        });
      }) : [leaf('li', 'study-plan-schedule-missing', 'Schedule requires a start date or anchor date.')];
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze({ class: 'study-plan', 'aria-label': vm.plan.name }),
        children: Object.freeze([
          leaf('h3', 'study-plan-name', vm.plan.name),
          leaf('p', 'study-plan-subject', vm.plan.subject || 'Subject not set'),
          leaf('p', 'study-plan-summary', summaryLine),
          Object.freeze({
            tag: 'ol',
            attrs: Object.freeze({ class: 'study-plan-days', 'aria-label': 'Next 7 days' }),
            children: Object.freeze(dayNodes)
          })
        ])
      });
    }

    function mountStudyPlanView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountStudyPlanView requires a DOM document factory');
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
      engine,
      schemaVersion: engine.SCHEMA_VERSION,
      WEEKDAYS,
      validateCustomPlan,
      validateTemplatePlan,
      listTemplates,
      createSevenDaySchedule,
      createPlanViewModel,
      safeRenderPlan,
      mountStudyPlanView
    });
  }

  const defaultAdapter = createStudyPlanAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createStudyPlanAdapter }));
});
