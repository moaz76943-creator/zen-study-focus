/** Deep Focus Room6 F02 — safe weekly intention adapter over the real B08 weekly intentions engine; no storage, no network, no timer credits. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusWeeklyViewAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/focus_weekly_intentions_engine.js';
  const GLOBAL_ENGINE_KEY = 'DeepFocusWeeklyIntentions';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
  const planSignature = (plan) => plan.intentions
    .map((item) => `${item.id}\u0000${item.title}\u0000${item.day}\u0000${item.completed ? 1 : 0}\u0000${item.estimatedMinutes}`)
    .sort()
    .join('\u0001');

  const DAY_LABELS = Object.freeze({
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday'
  });

  const INTENT_TYPES = Object.freeze({
    TOGGLE: 'weekly-view/toggle-completed',
    MOVE: 'weekly-view/move-day',
    ADD: 'weekly-view/add-intention',
    REMOVE: 'weekly-view/remove-intention'
  });

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('DeepFocusWeeklyIntentions engine is required: load room5/focus_weekly_intentions_engine.js first');
  }

  function createWeeklyViewAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('DeepFocusWeeklyIntentions engine is required: load room5/focus_weekly_intentions_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.createWeeklyPlan !== 'function' || typeof engine.summarizeWeeklyPlan !== 'function') {
      throw new Error('DeepFocusWeeklyIntentions engine is required: load room5/focus_weekly_intentions_engine.js first');
    }

    function canonicalPlanOrErrors(raw) {
      if (!record(raw)) {
        const created = engine.createWeeklyPlan(raw);
        return created.ok ? { plan: created.plan } : { errors: created.errors };
      }
      if (raw.schemaVersion === 1) {
        const validated = engine.validateWeeklyPlan(raw);
        return validated.ok ? { plan: raw } : { errors: validated.errors };
      }
      if (raw.schemaVersion === undefined) {
        const created = engine.createWeeklyPlan(raw);
        return created.ok ? { plan: created.plan } : { errors: created.errors };
      }
      const migrated = engine.migrate(raw);
      return migrated.ok ? { plan: migrated.plan } : { errors: migrated.errors };
    }

    function createWeeklyViewModel(raw) {
      const resolved = canonicalPlanOrErrors(raw);
      if (resolved.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(resolved.errors) });
      }
      const plan = resolved.plan;
      const summary = engine.summarizeWeeklyPlan(plan);
      const days = Object.freeze(engine.DAYS.map((day) => {
        const items = plan.intentions.filter((item) => item.day === day);
        return Object.freeze({
          day,
          items: Object.freeze(items.map((item) => Object.freeze({
            id: item.id,
            title: item.title,
            priority: item.priority,
            completed: item.completed,
            estimatedMinutes: item.estimatedMinutes
          }))),
          plannedMinutes: items.reduce((total, item) => total + item.estimatedMinutes, 0),
          completedMinutes: items.filter((item) => item.completed).reduce((total, item) => total + item.estimatedMinutes, 0)
        });
      }));
      const viewmodel = Object.freeze({
        planId: plan.id,
        weekStart: plan.weekStart,
        summary: Object.freeze({ ...summary }),
        days,
        intentions: Object.freeze(plan.intentions.map((item) => Object.freeze({ ...item })))
      });
      return Object.freeze({ ok: true, viewmodel });
    }

    const createToggleIntent = (id, completed) => Object.freeze({ type: INTENT_TYPES.TOGGLE, id, completed });
    const createMoveIntent = (id, day) => Object.freeze({ type: INTENT_TYPES.MOVE, id, day });
    const createAddIntentionIntent = (input) => Object.freeze({ type: INTENT_TYPES.ADD, input });
    const createRemoveIntentionIntent = (id) => Object.freeze({ type: INTENT_TYPES.REMOVE, id });

    function applyIntent(raw, intent) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      let outcome;
      switch (intent.type) {
        case INTENT_TYPES.TOGGLE:
          outcome = engine.setCompleted(raw, intent.id, intent.completed);
          break;
        case INTENT_TYPES.MOVE:
          outcome = engine.moveIntention(raw, intent.id, intent.day);
          break;
        case INTENT_TYPES.ADD:
          outcome = engine.addIntention(raw, intent.input);
          break;
        case INTENT_TYPES.REMOVE:
          outcome = engine.removeIntention(raw, intent.id);
          break;
        default:
          return Object.freeze({
            ok: false,
            intentType: intent.type,
            errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
          });
      }
      if (!outcome.ok) {
        return Object.freeze({ ok: false, intentType: intent.type, errors: frozenErrors(outcome.errors) });
      }
      const before = canonicalPlanOrErrors(raw).plan || null;
      const changed = before ? planSignature(before) !== planSignature(outcome.plan) : true;
      return Object.freeze({ ok: true, intentType: intent.type, changed, plan: outcome.plan });
    }

    function safeRenderPlan(viewmodel, options) {
      const opts = options || {};
      const attrs = { class: 'weekly-intention-view', 'aria-label': `Weekly intentions for week of ${viewmodel.weekStart}` };
      if (opts.dir === 'rtl' || opts.dir === 'ltr' || opts.dir === 'auto') attrs.dir = opts.dir;
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze(attrs),
        children: Object.freeze([
          leaf('h2', 'weekly-intention-week', `Week of ${viewmodel.weekStart}`),
          leaf(
            'p',
            'weekly-intention-summary',
            `${viewmodel.summary.completed} of ${viewmodel.summary.total} intentions done - ${viewmodel.summary.plannedMinutes} min planned (${viewmodel.summary.doneMinutes} min done)`
          ),
          Object.freeze({
            tag: 'progress',
            attrs: Object.freeze({
              class: 'weekly-intention-progress-bar',
              value: String(viewmodel.summary.completed),
              max: String(viewmodel.summary.total)
            }),
            children: Object.freeze([])
          }),
          ...viewmodel.days.map((day) => Object.freeze({
            tag: 'div',
            attrs: Object.freeze({ class: 'weekly-intention-day', 'data-day': day.day }),
            children: Object.freeze([
              leaf('h3', 'weekly-intention-day-name', DAY_LABELS[day.day]),
              leaf('p', 'weekly-intention-day-total', `${day.plannedMinutes} min planned`),
              Object.freeze({
                tag: 'ul',
                attrs: Object.freeze({ class: 'weekly-intention-items' }),
                children: Object.freeze(day.items.map((item) => Object.freeze({
                  tag: 'li',
                  attrs: Object.freeze({ class: 'weekly-intention-item', 'data-intention-id': item.id }),
                  children: Object.freeze([
                    Object.freeze({
                      tag: 'span',
                      attrs: Object.freeze({ class: 'weekly-intention-item-title', dir: 'auto' }),
                      text: item.title,
                      children: Object.freeze([])
                    }),
                    leaf('span', 'weekly-intention-item-minutes', `${item.estimatedMinutes} min`),
                    Object.freeze({
                      tag: 'button',
                      attrs: Object.freeze({
                        class: 'weekly-intention-toggle',
                        type: 'button',
                        'data-intention-id': item.id,
                        'data-intent-type': INTENT_TYPES.TOGGLE,
                        'aria-pressed': String(item.completed)
                      }),
                      text: item.completed ? 'Completed' : 'Mark complete',
                      children: Object.freeze([])
                    })
                  ])
                })))
              })
            ])
          }))
        ])
      });
    }

    function mountWeeklyPlan(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountWeeklyPlan requires a DOM document factory');
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
      DAYS: engine.DAYS,
      DAY_LABELS,
      INTENT_TYPES,
      createWeeklyViewModel,
      createToggleIntent,
      createMoveIntent,
      createAddIntentionIntent,
      createRemoveIntentionIntent,
      applyIntent,
      safeRenderPlan,
      mountWeeklyPlan
    });
  }

  const defaultAdapter = createWeeklyViewAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createWeeklyViewAdapter }));
});
