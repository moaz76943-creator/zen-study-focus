/**
 * DEEP FOCUS — SovereignStudyProfiles (v579.0.0)
 * Manages customizable study presets and profiles (Deep Work, Pomodoro, Sprint, Reading).
 * Automatically propagates profile parameters to timer, ambient sound, and visual theme.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'df_study_profiles_v1';
  var ACTIVE_KEY = 'df_active_profile_id';

  var DEFAULT_PRESETS = [
    {
      id: 'deep_work',
      name: 'Deep Work',
      focusSec: 3000, // 50m
      breakSec: 600,  // 10m
      soundMode: 'brown_noise',
      theme: 'amoled',
      strictMode: true,
      description: 'Ultra-deep focus session for intensive problem solving and technical tasks.'
    },
    {
      id: 'pomodoro_classic',
      name: 'Classic Pomodoro',
      focusSec: 1500, // 25m
      breakSec: 300,  // 5m
      soundMode: 'none',
      theme: 'calm',
      strictMode: false,
      description: 'Standard 25/5 rhythm for balanced cognitive pacing.'
    },
    {
      id: 'quick_sprint',
      name: 'Quick Sprint',
      focusSec: 900,  // 15m
      breakSec: 180,  // 3m
      soundMode: 'none',
      theme: 'amoled',
      strictMode: true,
      description: 'Short high-urgency bursts for reviewing or writing flash summaries.'
    },
    {
      id: 'reading_zen',
      name: 'Reading Zen',
      focusSec: 2700, // 45m
      breakSec: 900,  // 15m
      soundMode: 'pink_noise',
      theme: 'twilight',
      strictMode: false,
      description: 'Gentle ambient atmosphere for immersive long-form reading and reflection.'
    }
  ];

  var profiles = [];
  var activeProfileId = 'deep_work';

  function loadState() {
    profiles = DEFAULT_PRESETS.slice();
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            profiles = parsed;
          }
        }
        var active = localStorage.getItem(ACTIVE_KEY);
        if (active) {
          activeProfileId = active;
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
        localStorage.setItem(ACTIVE_KEY, activeProfileId);
      }
    } catch (e) {}
  }

  loadState();

  var SovereignStudyProfiles = {
    version: '579.0.0',

    listProfiles: function () {
      return profiles.slice();
    },

    getActiveProfile: function () {
      for (var i = 0; i < profiles.length; i++) {
        if (profiles[i].id === activeProfileId) {
          return Object.assign({}, profiles[i]);
        }
      }
      return Object.assign({}, profiles[0]);
    },

    setActiveProfile: function (profileId) {
      var found = null;
      for (var i = 0; i < profiles.length; i++) {
        if (profiles[i].id === profileId) {
          found = profiles[i];
          break;
        }
      }
      if (!found) return false;

      activeProfileId = profileId;
      saveState();

      // Propagate parameters across decoupled modules
      if (global.SovereignTimerEngine && typeof global.SovereignTimerEngine.setDuration === 'function') {
        global.SovereignTimerEngine.setDuration(found.focusSec);
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('profile:changed', found);
      }
      return true;
    },

    createCustomProfile: function (profileData) {
      if (!profileData || !profileData.id || !profileData.name) return false;

      var newProfile = {
        id: String(profileData.id).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name: String(profileData.name),
        focusSec: Math.max(300, parseInt(profileData.focusSec || 1500, 10)),
        breakSec: Math.max(60, parseInt(profileData.breakSec || 300, 10)),
        soundMode: String(profileData.soundMode || 'none'),
        theme: String(profileData.theme || 'amoled'),
        strictMode: Boolean(profileData.strictMode),
        description: String(profileData.description || 'Custom user study profile.')
      };

      // Replace if exists, else append
      var exists = false;
      for (var i = 0; i < profiles.length; i++) {
        if (profiles[i].id === newProfile.id) {
          profiles[i] = newProfile;
          exists = true;
          break;
        }
      }
      if (!exists) {
        profiles.push(newProfile);
      }

      saveState();
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('profile:created', newProfile);
      }
      return newProfile;
    },

    resetToDefaults: function () {
      profiles = DEFAULT_PRESETS.slice();
      activeProfileId = 'deep_work';
      saveState();
      return true;
    }
  };

  global.SovereignStudyProfiles = SovereignStudyProfiles;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_study_profiles', SovereignStudyProfiles);
  }
})(typeof window !== 'undefined' ? window : globalThis);
