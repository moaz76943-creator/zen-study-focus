/* Deep Focus Nature Audio v1 — isolated, opt-in, offline-only adapter.
 * No synthetic fallback, media download, stored-data access or global timer hooks.
 * The integrator must set verified=true only after provenance, SHA256, codec and
 * real-device checks; this class intentionally refuses unverified assets.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DeepFocusNatureAudioV1 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const HEX_SHA256 = /^[a-f0-9]{64}$/i;
  const LOCAL = /^(?:sounds|nature_audio)\/[a-z0-9][a-z0-9_./-]*\.ogg$/i;
  const clamp = n => Number.isFinite(Number(n)) ? Math.min(1, Math.max(0, Number(n))) : 0;
  function eligible(clip) {
    return !!(clip && clip.verified === true && clip.packaged === true &&
      HEX_SHA256.test(String(clip.sha256 || '')) && LOCAL.test(String(clip.src || '')) &&
      !String(clip.src).split('/').includes('..') && clip.recording === true);
  }
  function createMixer(clips, opts = {}) {
    const AudioCtor = opts.AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);
    const onError = typeof opts.onError === 'function' ? opts.onError : () => {};
    const byId = new Map((clips || []).filter(x => x && typeof x.id === 'string').map(x => [x.id, x]));
    const playing = new Map();
    const versions = new Map();
    let disposed = false;
    const valid = id => byId.get(id);
    function bump(id) { const next = (versions.get(id) || 0) + 1; versions.set(id, next); return next; }
    function applyVolumes() {
      // Sum of simultaneously applied channel gains <= 1 even under coherent peaks.
      const entries = [...playing.values()].filter(p => !p.paused);
      const sum = entries.reduce((n,p) => n + p.level, 0);
      const gain = sum > 1 ? 1/sum : 1;
      for (const p of playing.values()) p.audio.volume = p.paused ? 0 : clamp(p.level*gain);
    }
    function stop(id) {
      bump(id);
      const p = playing.get(id);
      if (!p) return false;
      playing.delete(id);
      p.audio.onerror = null; p.audio.onended = null;
      try { p.audio.pause(); } catch (_) {}
      try { p.audio.removeAttribute('src'); p.audio.load(); } catch (_) {}
      applyVolumes();
      return true;
    }
    function fail(id, token, message) {
      if (versions.get(id) !== token || !playing.has(id)) return false;
      stop(id);
      onError(id, message);
      return false;
    }
    async function play(id, volume) {
      if (disposed) return false;
      const clip = valid(id);
      if (!eligible(clip) || !AudioCtor) { onError(id, 'NOT_VERIFIED_OR_UNAVAILABLE'); return false; }
      if (playing.has(id)) return true; // never duplicate instances
      const token = bump(id);
      let audio;
      try { audio = new AudioCtor(); } catch (_) { onError(id, 'AUDIO_INIT_FAILED'); return false; }
      const p = {audio, paused:false, level:clamp(volume === undefined ? clip.volume : volume)};
      playing.set(id, p);
      audio.preload = 'auto';
      audio.loop = clip.loop !== false;
      audio.src = clip.src;
      audio.onerror = () => { fail(id, token, 'DECODE_OR_FILE_ERROR'); };
      audio.onended = () => {
        if (versions.get(id) === token && playing.get(id) === p) stop(id);
      };
      applyVolumes();
      try {
        await Promise.resolve(audio.play());
        return versions.get(id) === token && playing.get(id) === p;
      } catch (_) { return fail(id, token, 'PLAY_FAILED'); }
    }
    function setVolume(id, volume) {
      const p = playing.get(id);
      if (!p || !Number.isFinite(Number(volume))) return false;
      p.level = clamp(volume); applyVolumes(); return true;
    }
    function pauseAll() {
      for (const p of playing.values()) {
        if (!p.paused) { p.paused = true; try { p.audio.pause(); } catch (_) {} }
      }
      applyVolumes();
    }
    async function resumeAll() {
      if (disposed) return false;
      const jobs = [...playing.entries()].filter(([,p]) => p.paused).map(async ([id,p]) => {
        const token = versions.get(id);
        p.paused = false;
        try { await Promise.resolve(p.audio.play()); return versions.get(id) === token && playing.get(id) === p; }
        catch (_) { return fail(id,token,'RESUME_FAILED'); }
      });
      applyVolumes();
      return (await Promise.all(jobs)).every(Boolean);
    }
    function stopAll() { for (const id of [...playing.keys()]) stop(id); }
    function dispose() { if (disposed) return; disposed = true; stopAll(); }
    return Object.freeze({play,stop,setVolume,pauseAll,resumeAll,stopAll,dispose,
      isPlaying:id=>playing.has(id), activeCount:()=>playing.size});
  }
  return Object.freeze({createMixer,eligible});
});
