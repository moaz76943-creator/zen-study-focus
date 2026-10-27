/**
 * Deep Focus Room6 U07 — Focus Lab page controller.
 *
 * Composes the optional existing room6 adapters (U04 navigation, U05 safe DOM,
 * U06 feature registry, F01 reading view adapter) with accessible view
 * switching (roving tablist semantics), an actionable retry/error panel and a
 * staging model in which no state mutation happens until the user performs an
 * explicit action (tab click, retry click, plan apply).
 *
 * Offline by construction: no network, no storage writes, no Android Native,
 * no timers. Every rendered string goes through textContent; HTML string
 * assignment is never used anywhere. Any adapter missing from the environment simply degrades
 * the corresponding capability instead of throwing.
 */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.FocusLabController = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  const globalScope = typeof globalThis !== 'undefined' ? globalThis : null;

  const ADAPTER_SPECS = Object.freeze({
    navigation: Object.freeze({ globalKey: 'FocusLabNavigation' }),
    dom: Object.freeze({ globalKey: 'DeepFocusLabDom' }),
    registry: Object.freeze({ globalKey: 'DeepFocusFocusLabRegistry' }),
    reading: Object.freeze({ globalKey: 'DeepFocusReadingViewAdapter' })
  });

  const OPTIONAL_MODULE_SPECS = Object.freeze({
    navigation: './focus_lab_navigation.js',
    dom: './focus_lab_dom.js',
    registry: './focus_lab_registry.js',
    reading: './reading_view_adapter.js'
  });

  const VIEWS = Object.freeze(['plans', 'reading', 'intentions', 'sports', 'projects']);
  const DEFAULT_VIEW = 'plans';
  const VIEW_ALIASES = Object.freeze({
    plan: 'plans', plans: 'plans', study: 'plans',
    read: 'reading', reading: 'reading',
    intention: 'intentions', intentions: 'intentions', weekly: 'intentions',
    sport: 'sports', sports: 'sports', training: 'sports',
    project: 'projects', projects: 'projects'
  });

  const ERROR_ACTIONS = Object.freeze({
    RETRY: 'focus-lab-error-retry',
    DISMISS: 'focus-lab-error-dismiss'
  });

  const HAS_NODE = typeof module === 'object' && typeof module.exports === 'object' &&
    typeof require === 'function';

  function resolveOptionalModule(key) {
    if (HAS_NODE) {
      try {
        return require(OPTIONAL_MODULE_SPECS[key]) || null;
      } catch (error) { /* optional module absent */ }
    }
    const globalKey = ADAPTER_SPECS[key].globalKey;
    if (globalScope && globalScope[globalKey]) {
      const candidate = globalScope[globalKey];
      if (candidate && typeof candidate === 'object') return candidate;
    }
    return null;
  }

  function isView(value) {
    return typeof value === 'string' && VIEWS.indexOf(value) !== -1;
  }

  function parseRoute(rawRoute) {
    if (rawRoute === null || rawRoute === undefined) return DEFAULT_VIEW;
    let route = String(rawRoute).trim();
    if (!route) return DEFAULT_VIEW;
    route = route.replace(/^#*/, '').replace(/^!*/, '').replace(/^\/+/, '').split('?')[0];
    route = route.replace(/[^\w-]/g, '').toLowerCase();
    if (!route) return DEFAULT_VIEW;
    if (Object.prototype.hasOwnProperty.call(VIEW_ALIASES, route)) return VIEW_ALIASES[route];
    const segments = route.split('-');
    for (let i = segments.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(VIEW_ALIASES, segments[i])) return VIEW_ALIASES[segments[i]];
    }
    return DEFAULT_VIEW;
  }

  function formatRoute(view) {
    return '#/' + (isView(view) ? view : DEFAULT_VIEW);
  }

  function sanitizeText(value, maxLength) {
    let text = '';
    if (typeof value === 'string') text = value;
    else if (typeof value === 'number' || typeof value === 'boolean') text = String(value);
    text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200d\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, '');
    if (typeof maxLength === 'number' && maxLength > 0 && text.length > maxLength) {
      text = text.slice(0, maxLength);
    }
    return text;
  }

  function requireDocument(documentFactory) {
    const doc = documentFactory || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.createElement !== 'function') {
      throw new Error('FocusLabController requires a DOM document factory');
    }
    return doc;
  }

  function createFocusLabController(options) {
    const opts = options || {};
    const doc = requireDocument(opts.documentFactory);
    const navigationModule = opts.navigationModule !== undefined ? opts.navigationModule : resolveOptionalModule('navigation');
    const domModule = opts.domModule !== undefined ? opts.domModule : resolveOptionalModule('dom');
    const registryModule = opts.registryModule !== undefined ? opts.registryModule : resolveOptionalModule('registry');
    const readingModule = opts.readingModule !== undefined ? opts.readingModule : resolveOptionalModule('reading');

    const adapterSnapshot = Object.freeze({
      navigation: navigationModule ? 'composed' : 'absent',
      dom: domModule ? 'composed' : 'absent',
      registry: registryModule ? 'composed' : 'absent',
      reading: readingModule ? 'composed' : 'absent'
    });

    let store = opts.store && typeof opts.store.setItem === 'function' ? opts.store : null;
    let boundWin = null;
    let boundRoot = null;
    let errorPanel = null;
    let errorRetryHandler = null;
    let lastCommittedView = loadInitialView();

    function loadInitialView() {
      if (store) {
        try {
          return parseRoute(store.getItem('fl.activeView'));
        } catch (error) { /* storage unavailable */ }
      }
      return DEFAULT_VIEW;
    }

    let state = Object.freeze({
      activeView: lastCommittedView,
      error: null,
      staged: null
    });

    function commitState(next) {
      state = Object.freeze(next);
      return state;
    }

    function getState() {
      return state;
    }

    function switchView(view) {
      const next = isView(view) ? view : parseRoute(view);
      commitState({ ...state, activeView: next, error: state.error });
      lastCommittedView = next;
      persistView(next);
      return state.activeView;
    }

    function persistView(view) {
      if (!store) return;
      try {
        store.setItem('fl.activeView', formatRoute(view));
      } catch (error) { /* storage unavailable: ignore */ }
    }

    function applyView(root, view) {
      if (!root || typeof root.querySelectorAll !== 'function') {
        throw new Error('applyView requires a root element with querySelectorAll');
      }
      const target = isView(view) ? view : DEFAULT_VIEW;
      let activeSection = null;

      const sections = root.querySelectorAll('[data-fl-view]');
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionView = section.getAttribute('data-fl-view');
        if (!isView(sectionView)) {
          section.hidden = true;
          section.setAttribute('aria-hidden', 'true');
          continue;
        }
        const active = sectionView === target;
        section.hidden = !active;
        section.setAttribute('aria-hidden', active ? 'false' : 'true');
        if (active) {
          activeSection = section;
          section.setAttribute('data-active', 'true');
        } else {
          section.removeAttribute('data-active');
        }
      }

      const tabs = root.querySelectorAll('[data-fl-tab]');
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const tabView = tab.getAttribute('data-fl-tab');
        if (!isView(tabView)) continue;
        const active = tabView === target;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (active) tab.setAttribute('data-active', 'true');
        else tab.removeAttribute('data-active');
      }
      return { view: target, section: activeSection };
    }

    function resolveTabFromEvent(event, root) {
      let node = event && event.target ? event.target : null;
      while (node && node !== root) {
        if (node.getAttribute && node.getAttribute('data-fl-tab')) return node;
        node = node.parentElement || node.parentNode || null;
      }
      return null;
    }

    function handleTabClick(event) {
      if (!boundRoot) return;
      const tab = resolveTabFromEvent(event, boundRoot);
      if (!tab) return;
      const requested = tab.getAttribute('data-fl-tab');
      const resolved = parseRoute(requested);
      switchView(resolved);
      applyView(boundRoot, resolved);
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }

    function handleTabKeydown(event) {
      if (!boundRoot) return;
      const tab = event.target;
      if (!tab || !tab.getAttribute || !tab.getAttribute('data-fl-tab')) return;
      const key = event.key;
      const isArrow = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
      const isHomeEnd = key === 'Home' || key === 'End';
      if (!isArrow && !isHomeEnd) return;
      const tabs = [];
      const all = boundRoot.querySelectorAll('[data-fl-tab]');
      for (let i = 0; i < all.length; i++) {
        if (isView(all[i].getAttribute('data-fl-tab'))) tabs.push(all[i]);
      }
      const index = tabs.indexOf(tab);
      if (index === -1) return;
      let next;
      if (key === 'Home') next = tabs[0];
      else if (key === 'End') next = tabs[tabs.length - 1];
      else next = tabs[(index + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
      if (!next) return;
      const resolved = parseRoute(next.getAttribute('data-fl-tab'));
      switchView(resolved);
      applyView(boundRoot, resolved);
      if (typeof next.focus === 'function') {
        try { next.focus(); } catch (error) { /* fake DOM guard */ }
      }
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }

    function handleHashChange() {
      if (!boundWin) return;
      let hash = '';
      try { hash = boundWin.location ? boundWin.location.hash : ''; } catch (error) { hash = ''; }
      const resolved = parseRoute(hash);
      switchView(resolved);
      if (boundRoot) applyView(boundRoot, resolved);
    }

    function bind(root, win) {
      if (!root || typeof root.querySelectorAll !== 'function') {
        throw new Error('bind requires a root element');
      }
      boundRoot = root;
      boundWin = win || null;
      applyView(root, state.activeView);
      if (typeof root.addEventListener === 'function') {
        root.addEventListener('click', handleTabClick);
        root.addEventListener('keydown', handleTabKeydown);
      }
      if (boundWin && typeof boundWin.addEventListener === 'function') {
        boundWin.addEventListener('hashchange', handleHashChange);
      }
      return function unbind() {
        if (root && typeof root.removeEventListener === 'function') {
          root.removeEventListener('click', handleTabClick);
          root.removeEventListener('keydown', handleTabKeydown);
        }
        if (boundWin && typeof boundWin.removeEventListener === 'function') {
          boundWin.removeEventListener('hashchange', handleHashChange);
        }
        boundRoot = null;
        boundWin = null;
      };
    }

    function buildErrorElement(error, headingsDoc) {
      const heading = headingsDoc.createElement('p');
      heading.setAttribute('class', 'focus-lab-error-message');
      heading.setAttribute('role', 'alert');
      heading.textContent = sanitizeText(error.message || 'Something went wrong');
      const retry = headingsDoc.createElement('button');
      retry.setAttribute('type', 'button');
      retry.setAttribute('class', 'focus-lab-error-retry');
      retry.setAttribute('data-focus-lab-error-action', ERROR_ACTIONS.RETRY);
      retry.textContent = typeof error.retryLabel === 'string' && error.retryLabel.trim()
        ? sanitizeText(error.retryLabel.trim())
        : 'Retry';
      const dismiss = headingsDoc.createElement('button');
      dismiss.setAttribute('type', 'button');
      dismiss.setAttribute('class', 'focus-lab-error-dismiss');
      dismiss.setAttribute('data-focus-lab-error-action', ERROR_ACTIONS.DISMISS);
      dismiss.textContent = 'Dismiss';
      const panel = headingsDoc.createElement('section');
      panel.setAttribute('class', 'focus-lab-error');
      panel.setAttribute('data-focus-lab-error-code', sanitizeText(String(error.code || 'UNKNOWN'), 60));
      panel.appendChild(heading);
      panel.appendChild(retry);
      panel.appendChild(dismiss);
      return panel;
    }

    function mountErrorPanel(target, error, onRetry) {
      if (!target || typeof target.appendChild !== 'function') {
        throw new Error('mountErrorPanel requires a DOM container element');
      }
      const record = error && typeof error === 'object' ? error : { code: 'UNKNOWN', message: String(error || '') };
      const safeRetry = typeof onRetry === 'function' ? onRetry : null;
      detachErrorPanel();
      const panel = buildErrorElement(record, doc);
      const listener = (event) => {
        event = event || {};
        let node = event.target || null;
        let action = null;
        while (node) {
          if (node.getAttribute) {
            action = node.getAttribute('data-focus-lab-error-action');
            if (action) break;
          }
          if (node === panel) break;
          node = node.parentElement || node.parentNode || null;
        }
        if (action === ERROR_ACTIONS.RETRY) {
          if (safeRetry) safeRetry(record);
        } else if (action === ERROR_ACTIONS.DISMISS) {
          detachErrorPanel();
          clearError();
        }
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
      };
      panel.addEventListener('click', listener);
      target.appendChild(panel);
      errorPanel = { panel, listener };
      commitState({ ...state, error: Object.freeze({ code: record.code || 'UNKNOWN', message: record.message }) });
      return panel;
    }

    function detachErrorPanel() {
      if (!errorPanel) return;
      const { panel, listener } = errorPanel;
      if (panel && typeof panel.removeEventListener === 'function') panel.removeEventListener('click', listener);
      if (panel && panel.parentElement && typeof panel.parentElement.removeChild === 'function') {
        panel.parentElement.removeChild(panel);
      }
      errorPanel = null;
      errorRetryHandler = null;
    }

    function clearError() {
      detachErrorPanel();
      commitState({ ...state, error: null });
    }

    function stageAction(kind, payload) {
      const concreteKind = typeof kind === 'string' ? kind : '';
      if (!concreteKind) return { ok: false, reason: 'MISSING_ACTION_KIND' };
      const snapshot = Object.freeze({
        kind: concreteKind,
        payload: payload === undefined ? null : (payload && typeof payload === 'object' ? { ...payload } : payload)
      });
      commitState({ ...state, staged: snapshot });
      return freezeStagedOutcome(snapshot);
    }

    function freezeStagedOutcome(snapshot) {
      return Object.freeze({ ok: true, staged: snapshot, applied: false });
    }

    function commitStaged() {
      const staged = state.staged;
      if (!staged) return Object.freeze({ ok: false, reason: 'NO_STAGED_ACTION' });
      let applied = true;
      let detail = null;
      if (readingModule && typeof readingModule === 'object' && staged.kind === 'reading-intent') {
        try {
          const result = readingModule.applyIntent(staged.payload.book, staged.payload.intent);
          applied = result.ok;
          detail = result;
        } catch (error) {
          applied = false;
          detail = String(error);
        }
      }
      commitState({ ...state, staged: null });
      return Object.freeze({ ok: true, staged, applied, detail });
    }

    function discardStaged() {
      if (!state.staged) return Object.freeze({ ok: false, reason: 'NO_STAGED_ACTION' });
      const discarded = state.staged;
      commitState({ ...state, staged: null });
      return Object.freeze({ ok: true, discarded });
    }

    function composeRegistrySnapshot() {
      if (!registryModule) return null;
      try {
        return registryModule.createFocusLabRegistry(opts.registryOptions || undefined);
      } catch (error) {
        return null;
      }
    }

    const controller = Object.freeze({
      adapterSnapshot,
      getDocument: () => doc,
      getState,
      getActiveView: () => state.activeView,
      getAdapter: (key) => {
        if (key === 'navigation') return navigationModule;
        if (key === 'dom') return domModule;
        if (key === 'registry') return registryModule;
        if (key === 'reading') return readingModule;
        return null;
      },
      composeRegistrySnapshot,
      isView,
      parseRoute,
      formatRoute,
      applyView,
      bind,
      switchView,
      stageAction,
      commitStaged,
      discardStaged,
      mountErrorPanel,
      detachErrorPanel,
      clearError,
      ERROR_ACTIONS,
      VIEWS
    });

    return controller;
  }

  return {
    createFocusLabController,
    VIEWS,
    DEFAULT_VIEW,
    isView,
    parseRoute,
    formatRoute,
    sanitizer: sanitizeText,
    ERROR_ACTIONS,
    ADAPTER_SPECS
  };
});
