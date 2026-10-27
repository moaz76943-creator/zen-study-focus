/** Deep Focus Room6 F06 — safe focus checklist adapter over the real B07 focus plan checklist engine; no storage, no network. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusChecklistAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/focus_plan_checklist_engine.js';
  const GLOBAL_ENGINE_KEY = 'FocusPlanChecklistEngine';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
  const itemSignature = (items) => items
    .map((item) => `${item.id}\u0000${item.done ? '1' : '0'}`)
    .sort()
    .join('\u0001');

  const INTENT_TYPES = Object.freeze({
    TOGGLE_ITEM: 'focus-checklist/toggle-item',
    CLEAR_COMPLETED: 'focus-checklist/clear-completed'
  });

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('FocusPlanChecklistEngine engine is required: load room5/focus_plan_checklist_engine.js first');
  }

  function createChecklistAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('FocusPlanChecklistEngine engine is required: load room5/focus_plan_checklist_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.createChecklist !== 'function' || typeof engine.summarizeChecklist !== 'function') {
      throw new Error('FocusPlanChecklistEngine engine is required: load room5/focus_plan_checklist_engine.js first');
    }

    function canonicalChecklistOrErrors(raw) {
      if (!record(raw)) {
        const created = engine.createChecklist(raw);
        return created.ok ? { checklist: created.checklist } : { errors: created.errors };
      }
      if (raw.schemaVersion === undefined) {
        const created = engine.createChecklist(raw);
        return created.ok ? { checklist: created.checklist } : { errors: created.errors };
      }
      const migrated = engine.migrate(raw);
      return migrated.ok ? { checklist: migrated.checklist } : { errors: migrated.errors };
    }

    function createChecklistViewModel(raw) {
      const resolved = canonicalChecklistOrErrors(raw);
      if (resolved.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(resolved.errors) });
      }
      const checklist = resolved.checklist;
      const summary = engine.summarizeChecklist(checklist);
      const viewmodel = Object.freeze({
        checklistId: checklist.id,
        title: checklist.title,
        description: checklist.description,
        summary: Object.freeze({ ...summary }),
        progress: Object.freeze({
          percentDone: summary.percent,
          isStarted: summary.doneCount > 0,
          isComplete: summary.completed,
          nextItemId: summary.nextItemId,
          nextItemLabel: summary.nextItemLabel
        }),
        items: Object.freeze(checklist.items.map((item) => Object.freeze({
          id: item.id,
          text: item.text,
          done: item.done,
          minutes: item.minutes,
          note: item.note
        })))
      });
      return Object.freeze({ ok: true, viewmodel });
    }

    const createToggleItemIntent = (itemId) => Object.freeze({ type: INTENT_TYPES.TOGGLE_ITEM, itemId });
    const createClearCompletedIntent = () => Object.freeze({ type: INTENT_TYPES.CLEAR_COMPLETED });

    function normalizedBefore(raw) {
      return engine.normalizeChecklist(raw);
    }

    function applyIntent(raw, intent) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      if (intent.type !== INTENT_TYPES.TOGGLE_ITEM && intent.type !== INTENT_TYPES.CLEAR_COMPLETED) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      if (
        intent.type === INTENT_TYPES.TOGGLE_ITEM &&
        (typeof intent.itemId !== 'string' || !intent.itemId.trim())
      ) {
        return Object.freeze({
          ok: false,
          intentType: intent.type,
          errors: frozenErrors([{ code: 'ITEM_ID_INVALID', field: 'itemId', message: 'Item id must be a non-empty string.' }])
        });
      }
      const source = canonicalChecklistOrErrors(raw);
      if (source.errors) {
        return Object.freeze({ ok: false, intentType: intent.type, errors: frozenErrors(source.errors) });
      }
      const outcome = intent.type === INTENT_TYPES.TOGGLE_ITEM
        ? engine.toggleItem(source.checklist, intent.itemId)
        : engine.clearCompleted(source.checklist);
      if (!outcome.ok) {
        return Object.freeze({ ok: false, intentType: intent.type, errors: frozenErrors(outcome.errors) });
      }
      const beforeChecklist = normalizedBefore(source.checklist);
      const changed = beforeChecklist
        ? itemSignature(outcome.checklist.items) !== itemSignature(beforeChecklist.items)
        : true;
      return Object.freeze({ ok: true, intentType: intent.type, changed, checklist: outcome.checklist });
    }

    function safeRenderPlan(viewmodel, options) {
      const opts = options || {};
      const attrs = { class: 'focus-checklist', 'aria-label': viewmodel.title };
      if (opts.dir === 'rtl' || opts.dir === 'ltr' || opts.dir === 'auto') attrs.dir = opts.dir;
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      const summaryLines = (item) => [
        leaf('span', 'focus-checklist-item-text', item.text),
        item.done ? null : leaf('span', 'focus-checklist-item-minutes', `${item.minutes} min`)
      ].filter(Boolean);
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze(attrs),
        children: Object.freeze([
          leaf('p', 'focus-checklist-title', viewmodel.title),
          leaf(
            'p',
            'focus-checklist-progress',
            `${viewmodel.summary.doneCount} of ${viewmodel.summary.totalItems} done - ${viewmodel.progress.percentDone}%`
          ),
          Object.freeze({
            tag: 'progress',
            attrs: Object.freeze({
              class: 'focus-checklist-progress-bar',
              value: String(viewmodel.summary.doneCount),
              max: String(viewmodel.summary.totalItems)
            }),
            children: Object.freeze([])
          }),
          Object.freeze({
            tag: 'ul',
            attrs: Object.freeze({ class: 'focus-checklist-items', 'aria-label': 'Focus checklist items' }),
            children: Object.freeze(viewmodel.items.map((item) => Object.freeze({
              tag: 'li',
              attrs: Object.freeze({
                class: item.done ? 'focus-checklist-item is-done' : 'focus-checklist-item is-pending',
                'data-item-id': item.id
              }),
              children: Object.freeze([
                Object.freeze({
                  tag: 'input',
                  attrs: Object.freeze({
                    class: 'focus-checklist-item-toggle',
                    type: 'checkbox',
                    'aria-label': item.text,
                    ...(item.done ? { checked: 'checked' } : {})
                  }),
                  children: Object.freeze([])
                }),
                Object.freeze({
                  tag: 'span',
                  attrs: Object.freeze({ class: 'focus-checklist-item-body' }),
                  children: Object.freeze(summaryLines(item).map((node) => Object.freeze({ ...node })))
                })
              ])
            })))
          })
        ])
      });
    }

    function mountChecklistView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountChecklistView requires a DOM document factory');
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
      INTENT_TYPES,
      createChecklistViewModel,
      createToggleItemIntent,
      createClearCompletedIntent,
      applyIntent,
      safeRenderPlan,
      mountChecklistView
    });
  }

  const defaultAdapter = createChecklistAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createChecklistAdapter }));
});
