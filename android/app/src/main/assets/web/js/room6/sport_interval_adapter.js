/** Deep Focus Room6 F04 — safe sport interval timeline preview and quick training plan adapter over the real B02 sport interval builder engine; no timers, no storage, no network. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusSportIntervalAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/sport_interval_builder_engine.js';
  const GLOBAL_ENGINE_KEY = 'SportIntervalBuilderEngine';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
  const summarySignature = (summary) => (summary ? JSON.stringify(summary) : null);

  const PLAN_INTENT_TYPES = Object.freeze({
    FROM_TEMPLATE: 'sport-plan/from-template',
    UPDATE: 'sport-plan/update',
    TOGGLE_FINAL_REST: 'sport-plan/toggle-final-rest'
  });

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('SportIntervalBuilderEngine is required: load room5/sport_interval_builder_engine.js first');
  }

  function createSportIntervalAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('SportIntervalBuilderEngine is required: load room5/sport_interval_builder_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.buildTimeline !== 'function' || typeof engine.summarizeSession !== 'function') {
      throw new Error('SportIntervalBuilderEngine is required: load room5/sport_interval_builder_engine.js first');
    }

    function timelinePreview(raw) {
      if (!record(raw)) {
        return {
          ok: false,
          errors: [{ code: 'SESSION_NOT_OBJECT', field: 'session' }]
        };
      }
      const session = engine.normalizeSession(raw);
      if (!session) {
        return { ok: false, errors: engine.validateSession(raw).errors };
      }
      const summary = engine.summarizeSession(session);
      const timeline = engine.buildTimeline(session);
      if (!summary || !timeline) {
        return { ok: false, errors: engine.validateSession(session).errors };
      }
      const step = (entry) => Object.freeze({
        index: entry.index,
        phase: entry.phase,
        round: entry.round,
        label: entry.label,
        minutes: entry.minutes,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute,
        intensity: entry.intensity
      });
      const viewmodel = Object.freeze({
        sessionId: session.id,
        name: session.name,
        activity: session.activity,
        templateId: session.templateId === undefined ? null : session.templateId,
        summary: Object.freeze({ ...summary }),
        timeline: Object.freeze({
          totalSteps: timeline.totalSteps,
          totalMinutes: timeline.totalMinutes,
          warmupMinutes: timeline.warmupMinutes,
          workMinutes: timeline.workMinutes,
          restMinutes: timeline.restMinutes,
          cooldownMinutes: timeline.cooldownMinutes,
          workRounds: timeline.workRounds,
          restIntervals: timeline.restIntervals,
          steps: Object.freeze(timeline.steps.map(step))
        })
      });
      return { ok: true, viewmodel };
    }

    function canonicalBefore(raw) {
      if (!record(raw)) return null;
      const normalized = engine.normalizeSession(raw);
      if (!normalized) return null;
      return engine.updateSession(normalized, {}).plan || null;
    }

    function applyIntent(raw, intent) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      let outcome;
      if (intent.type === PLAN_INTENT_TYPES.FROM_TEMPLATE) {
        const overrides = record(intent.overrides) ? intent.overrides : {};
        outcome = engine.createSessionFromTemplate(intent.templateId, overrides);
      } else if (intent.type === PLAN_INTENT_TYPES.UPDATE) {
        const before = canonicalBefore(raw);
        if (!before) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors(engine.validateSession(raw).errors)
          });
        }
        outcome = engine.updateSession(before, record(intent.changes) ? intent.changes : {});
      } else if (intent.type === PLAN_INTENT_TYPES.TOGGLE_FINAL_REST) {
        const before = canonicalBefore(raw);
        if (!before) {
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors(engine.validateSession(raw).errors)
          });
        }
        outcome = engine.updateSession(before, { includeFinalRest: !before.includeFinalRest });
      } else {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      if (!outcome.ok) {
        return Object.freeze({ ok: false, intentType: intent.type, errors: frozenErrors(outcome.errors) });
      }
      const plan = outcome.plan;
      const beforePlan = intent.type === PLAN_INTENT_TYPES.FROM_TEMPLATE ? null : canonicalBefore(raw);
      const beforeSummary = beforePlan ? engine.summarizeSession(beforePlan) : null;
      const changed = summarySignature(engine.summarizeSession(plan)) !== summarySignature(beforeSummary);
      return Object.freeze({ ok: true, intentType: intent.type, changed, plan });
    }

    function listQuickTemplates() {
      return engine.listTemplates().map((template) => Object.freeze({
        id: template.id,
        name: template.name,
        activity: template.activity,
        workRounds: template.workRounds,
        workMinutes: template.workMinutes,
        restMinutes: template.restMinutes,
        totalMinutes: engine.summarizeSession(engine.createSessionFromTemplate(template.id, {}).plan).totalMinutes
      }));
    }

    function safeRenderPlan(viewmodel, options) {
      const attrs = { class: 'sport-interval-preview', 'aria-label': viewmodel.name };
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      const summary = viewmodel.summary;
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze(attrs),
        children: Object.freeze([
          leaf('p', 'sport-plan-name', viewmodel.name),
          leaf(
            'p',
            'sport-plan-summary',
            `${summary.totalMinutes} min total - ${summary.workRounds} work rounds - cooldown ${summary.cooldownMinutes} min`
          ),
          Object.freeze({
            tag: 'ol',
            attrs: Object.freeze({ class: 'sport-interval-timeline', 'aria-label': 'Interval timeline' }),
            children: Object.freeze(viewmodel.timeline.steps.map((entry) => Object.freeze({
              tag: 'li',
              attrs: Object.freeze({
                class: `sport-interval-step sport-interval-step-${entry.phase}`,
                'data-step-index': String(entry.index),
                'data-phase': entry.phase
              }),
              children: Object.freeze([
                leaf('span', 'sport-interval-step-label', entry.label),
                leaf(
                  'span',
                  'sport-interval-step-time',
                  `${entry.startMinute}-${entry.endMinute} min`
                )
              ])
            })))
          })
        ])
      });
    }

    function mountTimelinePreview(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountTimelinePreview requires a DOM document factory');
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
      PLAN_INTENT_TYPES,
      timelinePreview,
      applyIntent,
      listQuickTemplates,
      safeRenderPlan,
      mountTimelinePreview
    });
  }

  const defaultAdapter = createSportIntervalAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createSportIntervalAdapter }));
});
