/** Deep Focus Room6 F03 — human-readable project budget adapter over the real B04 project time budget engine; no storage, no network, no invented goals. */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.DeepFocusProjectBudgetAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const ENGINE_PATH = '../room5/project_time_budget_engine.js';
  const GLOBAL_ENGINE_KEY = 'ProjectTimeBudgetEngine';
  const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const frozenErrors = (errors) => Object.freeze((errors || []).map((error) => Object.freeze({ ...error })));
  const round2 = (value) => Math.round(value * 100) / 100;
  const sessionSignature = (sessions) => sessions
    .map((session) => `${session.id}\u0000${session.label}\u0000${session.minutes}\u0000${session.category}`)
    .sort()
    .join('\u0001');

  const INTENT_TYPES = Object.freeze({
    ADD_SESSION: 'project-budget/add-session',
    REMOVE_SESSION: 'project-budget/remove-session'
  });

  function formatMinutes(minutes) {
    if (typeof minutes !== 'number' || !isFinite(minutes)) return '';
    const sign = minutes < 0 ? '-' : '';
    const total = Math.round(Math.abs(minutes));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (hours && rest) return `${sign}${hours} h ${rest} m`;
    if (hours) return `${sign}${hours} h`;
    return `${sign}${rest} m`;
  }

  function resolveEngine() {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      return require(ENGINE_PATH);
    }
    if (root && root[GLOBAL_ENGINE_KEY]) return root[GLOBAL_ENGINE_KEY];
    throw new Error('ProjectTimeBudgetEngine engine is required: load room5/project_time_budget_engine.js first');
  }

  function createProjectBudgetAdapter(engineModule) {
    if (engineModule === null) {
      throw new Error('ProjectTimeBudgetEngine engine is required: load room5/project_time_budget_engine.js first');
    }
    const engine = engineModule === undefined ? resolveEngine() : engineModule;
    if (!engine || typeof engine.createBudget !== 'function' || typeof engine.summarizeBudget !== 'function') {
      throw new Error('ProjectTimeBudgetEngine engine is required: load room5/project_time_budget_engine.js first');
    }

    function canonicalBudget(raw) {
      if (!record(raw)) {
        const created = engine.createBudget(raw);
        return created.ok ? { budget: created.budget } : { errors: created.errors };
      }
      const validated = engine.validateBudget(raw);
      if (validated.ok) {
        const normalized = engine.normalizeBudget(raw);
        if (normalized) return { budget: normalized };
      }
      const refreshed = engine.createBudget(raw);
      if (refreshed.ok) return { budget: refreshed.budget };
      return { errors: validated.ok ? refreshed.errors : validated.errors };
    }

    function auditSuppliedSessions(rawSessions, normalizedSessions) {
      if (!Array.isArray(rawSessions)) return [];
      const errors = [];
      let eligible = 0;
      for (let i = 0; i < rawSessions.length; i++) {
        const entry = rawSessions[i];
        const usable = record(entry) && typeof entry.label === 'string' && entry.label.trim() !== '';
        if (!usable) {
          errors.push({
            code: 'SESSION_INVALID_ENTRY',
            field: 'sessions',
            message: `Session at position ${i} is not a usable session object and must not vanish from totals silently.`
          });
          continue;
        }
        const held = normalizedSessions[eligible];
        if (held) {
          const suppliedMinutes = entry.minutes === undefined ? held.minutes : Number(entry.minutes);
          if (suppliedMinutes !== held.minutes) {
            errors.push({
              code: 'SESSION_MINUTES_ADJUSTED',
              field: 'sessions',
              message: `Session "${entry.label.trim()}" minutes were adjusted from ${String(entry.minutes)} to ${held.minutes}; totals must not be hidden by silent clamping.`
            });
          }
        }
        eligible++;
      }
      if (eligible !== normalizedSessions.length) {
        errors.push({
          code: 'SESSION_COUNT_MISMATCH',
          field: 'sessions',
          message: `Supplied ${eligible} usable sessions but normalized budget keeps ${normalizedSessions.length}.`
        });
      }
      return errors;
    }

    function rawSessionsOf(raw) {
      return record(raw) && Array.isArray(raw.sessions) ? raw.sessions : [];
    }

    function verifyTotals(budget) {
      const summary = engine.summarizeBudget(budget);
      if (!summary) {
        return { errors: [{ code: 'SUMMARY_UNAVAILABLE', field: 'budget', message: 'Engine could not summarize the budget.' }] };
      }
      let spent = 0;
      const categoryMinutes = { focus: 0, admin: 0, review: 0, meeting: 0 };
      let longest = null;
      let shortest = null;
      for (const session of budget.sessions) {
        spent += session.minutes;
        if (typeof categoryMinutes[session.category] === 'number') categoryMinutes[session.category] += session.minutes;
        if (longest === null || session.minutes > longest) longest = session.minutes;
        if (shortest === null || session.minutes < shortest) shortest = session.minutes;
      }
      if (
        spent !== summary.spentMinutes ||
        longest !== summary.longestSessionMinutes ||
        shortest !== summary.shortestSessionMinutes
      ) {
        return {
          errors: [{
            code: 'TOTALS_MISMATCH',
            field: 'sessions',
            message: 'Engine totals do not match an honest recount of the actual supplied sessions.'
          }]
        };
      }
      return { summary, recount: { spentMinutes: spent, categoryMinutes, longestSessionMinutes: longest, shortestSessionMinutes: shortest } };
    }

    function resolveBudgetSource(raw, budget) {
      if (!record(raw) || raw.budgetMinutes === undefined || raw.budgetMinutes === null || raw.budgetMinutes === '') {
        return 'engine-default';
      }
      return Number.isInteger(Number(raw.budgetMinutes)) && Number(raw.budgetMinutes) === budget.budgetMinutes
        ? 'supplied'
        : 'engine-default';
    }

    function createProjectBudgetViewModel(raw) {
      const resolved = canonicalBudget(raw);
      if (resolved.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(resolved.errors) });
      }
      const budget = resolved.budget;
      const audit = auditSuppliedSessions(rawSessionsOf(raw), budget.sessions);
      if (audit.length) {
        return Object.freeze({ ok: false, errors: frozenErrors(audit) });
      }
      const checked = verifyTotals(budget);
      if (checked.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(checked.errors) });
      }
      const summary = checked.summary;
      const categoryLabels = {};
      for (const key of Object.keys(summary.categoryMinutes)) categoryLabels[key] = formatMinutes(summary.categoryMinutes[key]);
      const viewmodel = Object.freeze({
        budgetId: budget.id,
        name: budget.name,
        budgetMinutes: budget.budgetMinutes,
        budgetSource: resolveBudgetSource(raw, budget),
        summary: Object.freeze({ ...summary, categoryMinutes: Object.freeze({ ...summary.categoryMinutes }) }),
        headline: `${budget.name} · ${round2(summary.usedPercent)}% of budget used`,
        budgetLabel: formatMinutes(budget.budgetMinutes),
        spentLabel: `${formatMinutes(summary.spentMinutes)} spent${summary.overBudget ? ` (over by ${formatMinutes(summary.overByMinutes)})` : ''}`,
        spentDurationLabel: formatMinutes(summary.spentMinutes),
        remainingLabel: formatMinutes(summary.remainingMinutes),
        remainingDurationLabel: formatMinutes(summary.remainingMinutes),
        averageSessionLabel: typeof summary.averageSessionMinutes === 'number' ? formatMinutes(summary.averageSessionMinutes) : '',
        longestSessionLabel: formatMinutes(summary.longestSessionMinutes || 0),
        shortestSessionLabel: formatMinutes(summary.shortestSessionMinutes || 0),
        categoryLabels: Object.freeze(categoryLabels),
        sessions: Object.freeze(budget.sessions.map((session) => Object.freeze({
          id: session.id,
          label: session.label,
          category: session.category,
          minutes: session.minutes,
          durationLabel: formatMinutes(session.minutes)
        })))
      });
      return Object.freeze({ ok: true, viewmodel });
    }

    function computeSessionTotals(raw) {
      const resolved = canonicalBudget(raw);
      if (resolved.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(resolved.errors) });
      }
      const budget = resolved.budget;
      const audit = auditSuppliedSessions(rawSessionsOf(raw), budget.sessions);
      if (audit.length) {
        return Object.freeze({ ok: false, errors: frozenErrors(audit) });
      }
      const checked = verifyTotals(budget);
      if (checked.errors) {
        return Object.freeze({ ok: false, errors: frozenErrors(checked.errors) });
      }
      return Object.freeze({
        ok: true,
        totals: Object.freeze({
          name: budget.name,
          sessionCount: budget.sessions.length,
          spentMinutes: checked.recount.spentMinutes,
          spentLabel: formatMinutes(checked.recount.spentMinutes),
          categoryMinutes: Object.freeze({ ...checked.recount.categoryMinutes }),
          longestSessionMinutes: checked.recount.longestSessionMinutes,
          shortestSessionMinutes: checked.recount.shortestSessionMinutes
        })
      });
    }

    const createAddSessionIntent = (label, minutes, category) => Object.freeze({ type: INTENT_TYPES.ADD_SESSION, label, minutes, category });
    const createRemoveSessionIntent = (id) => Object.freeze({ type: INTENT_TYPES.REMOVE_SESSION, id });

    function applySessionIntent(raw, intent) {
      if (!record(intent) || typeof intent.type !== 'string') {
        return Object.freeze({
          ok: false,
          intentType: null,
          errors: frozenErrors([{ code: 'UNKNOWN_INTENT', field: 'type' }])
        });
      }
      let outcome;
      switch (intent.type) {
        case INTENT_TYPES.ADD_SESSION:
          outcome = engine.addSession(raw, { label: intent.label, minutes: intent.minutes, category: intent.category });
          break;
        case INTENT_TYPES.REMOVE_SESSION:
          outcome = engine.removeSession(raw, intent.id);
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
      const before = engine.normalizeBudget(raw);
      const changed = before ? sessionSignature(before.sessions) !== sessionSignature(outcome.budget.sessions) : true;
      return Object.freeze({ ok: true, intentType: intent.type, changed, budget: outcome.budget });
    }

    function safeRenderPlan(viewmodel) {
      const leaf = (tag, className, text) => Object.freeze({
        tag,
        attrs: Object.freeze({ class: className }),
        text,
        children: Object.freeze([])
      });
      return Object.freeze({
        tag: 'section',
        attrs: Object.freeze({ class: 'project-budget', 'aria-label': viewmodel.name }),
        children: Object.freeze([
          leaf('p', 'project-budget-title', viewmodel.name),
          leaf('p', 'project-budget-progress', `${viewmodel.spentLabel} of ${viewmodel.budgetLabel}`),
          Object.freeze({
            tag: 'progress',
            attrs: Object.freeze({
              class: 'project-budget-progress-bar',
              value: String(viewmodel.summary.spentMinutes),
              max: String(viewmodel.budgetMinutes)
            }),
            children: Object.freeze([])
          }),
          leaf('p', 'project-budget-remaining', `Remaining: ${viewmodel.remainingLabel}`),
          Object.freeze({
            tag: 'ol',
            attrs: Object.freeze({ class: 'project-budget-sessions', 'aria-label': 'Project sessions' }),
            children: Object.freeze(viewmodel.sessions.map((session) => Object.freeze({
              tag: 'li',
              attrs: Object.freeze({
                class: 'project-budget-session',
                'data-session-id': session.id,
                'data-category': session.category
              }),
              children: Object.freeze([
                Object.freeze({
                  tag: 'span',
                  attrs: Object.freeze({ class: 'project-budget-session-label', dir: 'auto' }),
                  text: session.label,
                  children: Object.freeze([])
                }),
                leaf('span', 'project-budget-session-minutes', `${session.durationLabel} · ${session.category}`)
              ])
            })))
          })
        ])
      });
    }

    function mountBudgetView(target, plan, documentFactory) {
      const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
      if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('mountBudgetView requires a DOM document factory');
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
      formatMinutes,
      createProjectBudgetViewModel,
      computeSessionTotals,
      createAddSessionIntent,
      createRemoveSessionIntent,
      applySessionIntent,
      safeRenderPlan,
      mountBudgetView
    });
  }

  const defaultAdapter = createProjectBudgetAdapter();
  return Object.freeze(Object.assign({}, defaultAdapter, { createProjectBudgetAdapter }));
});
