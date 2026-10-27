'use strict';

/**
 * Focus Lab route + focus-state handling (room6 / U04).
 *
 * Pure, offline, dependency-free. The main seven navigation sections are
 * never touched: this module only knows about Focus Lab tab views.
 */

(function (factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.FocusLabNavigation = api;
  }
})(function () {
  'use strict';

  var DEFAULT_VIEW = 'plans';

  // Stable whitelist of Focus Lab tab views. Nothing outside this list can
  // ever become the active view, regardless of untrusted route input.
  var VIEWS = ['plans', 'reading', 'intentions', 'sports', 'projects'];

  // Aliases for legacy/deep-link hash fragments.
  var ALIASES = {
    plan: 'plans',
    plans: 'plans',
    study: 'plans',
    read: 'reading',
    reading: 'reading',
    intention: 'intentions',
    intentions: 'intentions',
    weekly: 'intentions',
    sport: 'sports',
    sports: 'sports',
    training: 'sports',
    project: 'projects',
    projects: 'projects'
  };

  function isView(value) {
    return typeof value === 'string' && VIEWS.indexOf(value) !== -1;
  }

  /**
   * Parse an untrusted route fragment (hash or path suffix) into a whitelisted
   * view id. Returns DEFAULT_VIEW for anything unknown/null.
   */
  function parseRoute(rawRoute) {
    if (rawRoute === null || rawRoute === undefined) return DEFAULT_VIEW;
    var route = String(rawRoute).trim();
    if (!route) return DEFAULT_VIEW;
    // Strip leading '#', '!', '#/', slashes and query-ish tails.
    route = route.replace(/^#*/, '').replace(/^!*/, '').replace(/^\/+/, '').split('?')[0];
    route = route.replace(/[^\w-]/g, '');
    if (!route) return DEFAULT_VIEW;
    var lowered = route.toLowerCase();
    if (ALIASES.hasOwnProperty(lowered)) return ALIASES[lowered];
    // Also allow "view/plans" style segments.
    var segments = lowered.split('-');
    for (var i = segments.length - 1; i >= 0; i--) {
      if (ALIASES.hasOwnProperty(segments[i])) return ALIASES[segments[i]];
    }
    return DEFAULT_VIEW;
  }

  /**
   * Serialize a route back into a stable hash fragment.
   */
  function formatRoute(view) {
    if (!isView(view)) view = DEFAULT_VIEW;
    return '#/' + view;
  }

  /**
   * Save active view into any store with get/set (memory, sessionStorage…).
   * Never throws when storage is unavailable.
   */
  function saveState(store, view) {
    try {
      if (store && typeof store.setItem === 'function') {
        store.setItem('fl.activeView', formatRoute(view));
      }
    } catch (e) { /* storage unavailable: ignore */ }
    return formatRoute(view);
  }

  function loadSavedRoute(store) {
    try {
      if (store && typeof store.getItem === 'function') {
        return parseRoute(store.getItem('fl.activeView'));
      }
    } catch (e) { /* storage unavailable: ignore */ }
    return DEFAULT_VIEW;
  }

  var memoryState = null;

  function saveStateMemory(view) {
    memoryState = formatRoute(view);
    return memoryState;
  }

  function loadStateMemory() {
    return parseRoute(memoryState);
  }

  /**
   * Resolve which view should be active: explicit route first, then saved
   * state, then default.
   */
  function resolveActiveView(input, store) {
    var parsed = parseRoute(input);
    var saved = loadSavedRoute(store);
    if (input && isView(parsed)) {
      if (parsed !== saved) saveState(store, parsed);
      return parsed;
    }
    if (saved && isView(saved)) return saved;
    return DEFAULT_VIEW;
  }

  function activateButton(button, active) {
    if (!button) return;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    if (active) {
      button.setAttribute('tabindex', '0');
      button.setAttribute('data-active', 'true');
      button.classList.add('is-active');
    } else {
      button.setAttribute('tabindex', '-1');
      button.removeAttribute('data-active');
      button.classList.remove('is-active');
    }
  }

  /**
   * Apply the active view to a DOM-ish document.
   * Expected markup contract:
   *   [data-fl-view="plans"]   — view sections
   *   [data-fl-tab="plans"]    — tab buttons
   * Every view outside the whitelist is ignored entirely.
   */
  function applyView(root, view, doc) {
    if (!isView(view)) view = DEFAULT_VIEW;
    var activeView = null;

    var allViews = root.querySelectorAll('[data-fl-view]');
    for (var i = 0; i < allViews.length; i++) {
      var section = allViews[i];
      if (!isView(section.getAttribute('data-fl-view'))) {
        // Defensive: anything outside the stable whitelist can never display.
        section.hidden = true;
        section.setAttribute('aria-hidden', 'true');
        continue;
      }
      var active = section.getAttribute('data-fl-view') === view;
      section.hidden = !active;
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) {
        activeView = section;
        section.setAttribute('data-active', 'true');
        var heading = section.querySelector('[data-fl-heading]');
        if (heading && doc && doc.createElement) {
          if (!heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
          }
        }
      } else {
        section.removeAttribute('data-active');
      }
    }

    var allTabs = root.querySelectorAll('[data-fl-tab]');
    for (var j = 0; j < allTabs.length; j++) {
      var tab = allTabs[j];
      if (!isView(tab.getAttribute('data-fl-tab'))) continue;
      activateButton(tab, tab.getAttribute('data-fl-tab') === view);
    }

    return { view: view, section: activeView };
  }

  /**
   * Move keyboard focus to the heading of the active view (friendly for
   * switch users and screen readers). Returns the element focused or null.
   */
  function focusActiveView(root, view, doc, win) {
    var result = applyView(root, view, doc);
    var heading = result.section && result.section.querySelector('[data-fl-heading]');
    if (!heading && result.section) heading = result.section;
    if (heading) {
      // Read-only use of text content; never assigned via innerHTML.
      var label = typeof heading.textContent === 'string' ? heading.textContent : '';
      if (!label) label = result.view;
    }
    if (heading && typeof heading.focus === 'function') {
      try { heading.focus(); } catch (e) { /* jsdom/fake DOM guard */ }
      return heading;
    }
    return null;
  }

  /**
   * Bind tab buttons + hashchange to a root element. Handlers always go
   * through the whitelist via resolveActiveView/applyView.
   */
  function bind(root, doc, win, store) {
    var current = resolveActiveView(win && win.location ? win.location.hash : '', store);
    applyView(root, current, doc);

    function onClick(event) {
      var target = event.target;
      while (target && target !== root && !(target.getAttribute && target.getAttribute('data-fl-tab'))) {
        target = target.parentNode;
      }
      if (!target || target === root) return;
      var requested = target.getAttribute('data-fl-tab');
      current = resolveActiveView(requested, store);
      applyView(root, current, doc);
      if (win && win.location) win.location.hash = formatRoute(current);
      event.preventDefault();
      return false;
    }

    function onKeydown(event) {
      var key = event.key;
      var isArrow = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
      var isHomeEnd = key === 'Home' || key === 'End';
      if (!isArrow && !isHomeEnd) return;
      var target = event.target;
      if (!target || !target.getAttribute || !target.getAttribute('data-fl-tab')) return;
      var tabs = [];
      var all = root.querySelectorAll('[data-fl-tab]');
      for (var i = 0; i < all.length; i++) {
        if (isView(all[i].getAttribute('data-fl-tab'))) tabs.push(all[i]);
      }
      var index = tabs.indexOf(target);
      if (index === -1) return;
      var next;
      if (key === 'Home') next = tabs[0];
      else if (key === 'End') next = tabs[tabs.length - 1];
      else next = tabs[(index + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
      if (!next) return;
      current = resolveActiveView(next.getAttribute('data-fl-tab'), store);
      applyView(root, current, doc);
      if (win && win.location) win.location.hash = formatRoute(current);
      try { next.focus(); } catch (e) { /* guard */ }
      event.preventDefault();
      return false;
    }

    function onHashChange() {
      current = resolveActiveView(win.location.hash, store);
      applyView(root, current, doc);
      focusActiveView(root, current, doc, win);
    }

    if (root.addEventListener) root.addEventListener('click', onClick, false);
    if (root.addEventListener) root.addEventListener('keydown', onKeydown, false);
    if (win && win.addEventListener) win.addEventListener('hashchange', onHashChange, false);

    return {
      unbind: function () {
        if (root.removeEventListener) {
          root.removeEventListener('click', onClick, false);
          root.removeEventListener('keydown', onKeydown, false);
        }
        if (win && win.removeEventListener) win.removeEventListener('hashchange', onHashChange, false);
      },
      apply: function (view) {
        current = resolveActiveView(view, store);
        applyView(root, current, doc);
        return current;
      }
    };
  }

  return {
    VIEWS: VIEWS.slice(),
    DEFAULT_VIEW: DEFAULT_VIEW,
    isView: isView,
    parseRoute: parseRoute,
    formatRoute: formatRoute,
    resolveActiveView: resolveActiveView,
    saveState: saveState,
    loadSavedRoute: loadSavedRoute,
    saveStateMemory: saveStateMemory,
    loadStateMemory: loadStateMemory,
    applyView: applyView,
    focusActiveView: focusActiveView,
    bind: bind
  };
});
