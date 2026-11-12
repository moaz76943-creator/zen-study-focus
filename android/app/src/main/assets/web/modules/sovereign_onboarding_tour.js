/**
 * DEEP FOCUS — SovereignOnboardingTour (v588.0.0)
 * Dignified 4-step Zen onboarding tour for first-time learners.
 * Propagates initial setup parameters to Profiles, Momentum, and Ambient DSP.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'df_onboarding_completed_v1';

  var TOUR_STEPS = [
    {
      step: 1,
      id: 'profile',
      title: 'Choose Study Rhythm',
      desc: 'Select your foundational focus profile: Deep Work (50m), Pomodoro (25m), or Reading Zen (45m).'
    },
    {
      step: 2,
      id: 'momentum',
      title: 'Set Weekly Habit Target',
      desc: 'Choose a sustainable weekly study goal with built-in rest day immunity. No punitive streak resets.'
    },
    {
      step: 3,
      id: 'dsp_noise',
      title: 'Sound Environment',
      desc: 'Pick pure real-time mathematical noise (Brown Noise, Pink Noise) synthesized directly on-device.'
    },
    {
      step: 4,
      id: 'sensory_shield',
      title: 'Sensory Shield & AMOLED',
      desc: 'Enable true pure-black pixel sleep and Zen Lock-In mode for distraction-free focus.'
    }
  ];

  var SovereignOnboardingTour = {
    version: '588.0.0',

    isFirstLaunch: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          return !localStorage.getItem(STORAGE_KEY);
        }
      } catch (e) {}
      return false;
    },

    getTourSteps: function () {
      return TOUR_STEPS.slice();
    },

    completeTour: function (userPreferences) {
      var prefs = userPreferences || {};

      // 1. Mark completed locally
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            completedAt: Date.now(),
            preferences: prefs
          }));
        }
      } catch (e) {}

      // 2. Propagate profile preference
      if (prefs.profileId && global.SovereignStudyProfiles && typeof global.SovereignStudyProfiles.setActiveProfile === 'function') {
        global.SovereignStudyProfiles.setActiveProfile(prefs.profileId);
      }

      // 3. Propagate weekly goal preference
      if (prefs.weeklyMinutes && global.SovereignHabitMomentum && typeof global.SovereignHabitMomentum.setWeeklyGoal === 'function') {
        global.SovereignHabitMomentum.setWeeklyGoal(prefs.weeklyMinutes, prefs.restDays || 2);
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('onboarding:completed', prefs);
      }
      return true;
    },

    resetTour: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
      return true;
    }
  };

  global.SovereignOnboardingTour = SovereignOnboardingTour;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_onboarding_tour', SovereignOnboardingTour);
  }
})(typeof window !== 'undefined' ? window : globalThis);
