/**
 * DEEP FOCUS — SovereignAudioCues (v612.0.0)
 * On-device Web Audio API synthesizer & offline acoustic cue manager.
 * Synthesizes harmonic Tibetan Zen bells, binaural focus tones, and offline voice prompts.
 * 100% Sovereign Offline, Zero PII, Western Arabic numerals (0123456789).
 */
(function (global) {
  'use strict';

  var SovereignAudioCues = {
    version: '612.0.0',
    audioCtx: null,
    muted: false,
    volume: 0.75,

    /**
     * Standard acoustic cues catalog with mathematical harmonic ratios
     */
    cues: {
      focus_start: { frequencies: [432, 648, 864], duration: 1.8, type: 'zen_bell' },
      focus_end: { frequencies: [528, 660, 792], duration: 2.2, type: 'chime_chord' },
      break_start: { frequencies: [396, 495, 594], duration: 1.5, type: 'gentle_wave' },
      break_end: { frequencies: [440, 554, 659], duration: 1.8, type: 'alert_pulse' },
      streak_achieved: { frequencies: [528, 660, 792, 1056], duration: 2.5, type: 'triumph_fanfare' },
      card_correct: { frequencies: [587.33, 880], duration: 0.6, type: 'subtle_ping' },
      card_review_needed: { frequencies: [349.23, 293.66], duration: 0.8, type: 'low_tap' }
    },

    /**
     * Lazy initialization of Web Audio Context with auto-resume guard
     */
    getAudioContext: function () {
      if (typeof window === 'undefined') return null;
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(function () {});
      }
      return this.audioCtx;
    },

    /**
     * Pure mathematical Tibetan Zen Singing Bowl synthesis
     * Employs root frequency + non-integer acoustic overtones with exponential decay.
     * @param {number} baseFreq Base fundamental frequency in Hz (e.g. 432)
     * @param {number} duration Duration in seconds
     */
    playZenBell: function (baseFreq, duration) {
      if (this.muted) return;
      var ctx = this.getAudioContext();
      if (!ctx) return;

      baseFreq = baseFreq || 432;
      duration = duration || 2.0;

      var now = ctx.currentTime;
      var masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.8, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(ctx.destination);

      // Acoustic overtone ratios: 1.0 (fundamental), 2.76, 5.40 (typical singing bowl harmonics)
      var harmonics = [
        { freqRatio: 1.0, gain: 0.6 },
        { freqRatio: 2.76, gain: 0.25 },
        { freqRatio: 5.40, gain: 0.15 }
      ];

      harmonics.forEach(function (h) {
        var osc = ctx.createOscillator();
        var hGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h.freqRatio, now);

        hGain.gain.setValueAtTime(h.gain, now);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(hGain);
        hGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.1);
      });
    },

    /**
     * Synthesizes Binaural Beats for focus and cognitive state alignment
     * @param {number} baseFreq Carrier frequency (e.g. 216Hz)
     * @param {number} beatFreq Difference frequency (e.g. 10Hz for Alpha or 14Hz for Beta)
     * @param {number} duration Duration in seconds
     */
    playBinauralTone: function (baseFreq, beatFreq, duration) {
      if (this.muted) return;
      var ctx = this.getAudioContext();
      if (!ctx || !ctx.createStereoPanner) {
        // Fallback for environments lacking stereo panning
        this.playZenBell(baseFreq, duration);
        return;
      }

      baseFreq = baseFreq || 216;
      beatFreq = beatFreq || 10;
      duration = duration || 3.0;

      var now = ctx.currentTime;
      var masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.3);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(ctx.destination);

      // Left Channel
      var oscLeft = ctx.createOscillator();
      var panLeft = ctx.createStereoPanner();
      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(baseFreq, now);
      panLeft.pan.setValueAtTime(-1, now);
      oscLeft.connect(panLeft);
      panLeft.connect(masterGain);

      // Right Channel (Carrier + Beat offset)
      var oscRight = ctx.createOscillator();
      var panRight = ctx.createStereoPanner();
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(baseFreq + beatFreq, now);
      panRight.pan.setValueAtTime(1, now);
      oscRight.connect(panRight);
      panRight.connect(masterGain);

      oscLeft.start(now);
      oscRight.start(now);
      oscLeft.stop(now + duration + 0.1);
      oscRight.stop(now + duration + 0.1);
    },

    /**
     * Plays registered system cue by name
     * @param {string} cueName 'focus_start', 'focus_end', 'break_start', etc.
     */
    playCue: function (cueName) {
      var cue = this.cues[cueName];
      if (!cue) return;
      this.playZenBell(cue.frequencies[0], cue.duration);
    },

    /**
     * Offline speech prompt adapter with automatic acoustic chime fallback
     * @param {string} text Prompt text (e.g. "جلسة التركيز بدأت" or "Focus session begun")
     * @param {string} fallbackCue Registered cue to trigger if speech is unsupported
     */
    speakPrompt: function (text, fallbackCue) {
      if (this.muted) return;
      fallbackCue = fallbackCue || 'focus_start';

      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        try {
          var utterance = new window.SpeechSynthesisUtterance(text);
          utterance.volume = this.volume;
          utterance.rate = 0.95; // Calm, deliberate pace
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
          return;
        } catch (e) {
          // Fallback to synthesized harmonic chime
        }
      }
      this.playCue(fallbackCue);
    },

    /**
     * Mute state toggle
     */
    toggleMute: function () {
      this.muted = !this.muted;
      return this.muted;
    },

    /**
     * Set master volume (0.00 to 1.00)
     */
    setVolume: function (val) {
      if (typeof val === 'number') {
        this.volume = Math.max(0.0, Math.min(1.0, val));
      }
      return this.volume;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignAudioCues;
  }
  global.SovereignAudioCues = SovereignAudioCues;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
