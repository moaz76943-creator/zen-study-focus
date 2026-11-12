/**
 * DEEP FOCUS — SovereignStore Unified Reactive State Layer (v567.0.0)
 * Deterministic local state with atomic mutation, undo/redo history,
 * and zero-leak event dispatching for Xiaomi 17T Pro.
 */
(function (global) {
  'use strict';

  var MAX_HISTORY = 20;
  var STORAGE_KEY = 'deepfocus_sovereign_state_v1';

  var state = {
    timer: { durationSec: 1500, remainingSec: 1500, mode: 'focus', running: false },
    preferences: { twilight: false, sound: 'chime', volume: 0.7, fontScale: 1.0 },
    sessionCount: 0
  };

  var undoStack = [];
  var redoStack = [];
  var subscribers = [];

  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return {};
    }
  }

  function persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      if (global.SovereignStorageVacuum && typeof global.SovereignStorageVacuum.safeSetItem === 'function') {
        global.SovereignStorageVacuum.safeSetItem(STORAGE_KEY, state);
      }
    }
  }

  function notify(mutationKey, oldVal, newVal) {
    for (var i = 0; i < subscribers.length; i++) {
      try {
        subscribers[i](state, mutationKey, oldVal, newVal);
      } catch (err) {}
    }
    if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
      global.SovereignEventBus.emit('store:changed', { key: mutationKey, state: state });
    }
  }

  var SovereignStore = {
    version: '567.0.0',

    getState: function () {
      return clone(state);
    },

    get: function (pathStr) {
      var parts = String(pathStr || '').split('.');
      var cur = state;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[parts[i]];
      }
      return clone(cur);
    },

    dispatch: function (mutationKey, payload, options) {
      var trackHistory = !options || options.history !== false;
      if (trackHistory) {
        undoStack.push(clone(state));
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
      }

      var oldState = clone(state);
      var parts = String(mutationKey || '').split('.');
      var cur = state;
      for (var i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      var targetKey = parts[parts.length - 1];
      cur[targetKey] = payload;

      persist();
      notify(mutationKey, oldState, state);
      return true;
    },

    undo: function () {
      if (undoStack.length === 0) return false;
      redoStack.push(clone(state));
      state = undoStack.pop();
      persist();
      notify('store:undo', null, state);
      return true;
    },

    redo: function () {
      if (redoStack.length === 0) return false;
      undoStack.push(clone(state));
      state = redoStack.pop();
      persist();
      notify('store:redo', null, state);
      return true;
    },

    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      subscribers.push(fn);
      return function unsubscribe() {
        subscribers = subscribers.filter(function (s) { return s !== fn; });
      };
    },

    initFromStorage: function () {
      if (typeof localStorage === 'undefined') return;
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            for (var k in parsed) {
              if (Object.prototype.hasOwnProperty.call(parsed, k)) {
                state[k] = parsed[k];
              }
            }
          }
        }
      } catch (e) {}
    }
  };

  SovereignStore.initFromStorage();

  global.SovereignStore = SovereignStore;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_store', SovereignStore);
  }
})(typeof window !== 'undefined' ? window : globalThis);
