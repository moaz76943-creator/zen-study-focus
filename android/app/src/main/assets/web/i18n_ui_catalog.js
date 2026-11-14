/**
 * DEEP FOCUS — UI catalog translator (gettext-style).
 * The English UI text itself is the stable key (numbers normalized to {0},{1}…). For the active language this
 * layer translates any English UI string that the older per-screen dictionaries left untranslated.
 * - Packs: locales/ui/<code>.js, loaded only for the active language (one small file, lazy).
 * - Never touches user content: inputs, textareas, contenteditable, [data-no-translate] and listed content hosts.
 * - Output digits are always Western (0-9). Hebrew is never loaded (excluded at registry level).
 * - Reversible: the original English of every changed node is remembered, so switching language never compounds.
 * - Missing strings stay English and are counted (window.DFUiCatalog.report()) — a gap is never hidden.
 */
(function (root) {
  'use strict';
  var doc = root.document;
  if (!doc) return;
  var VARIANT = { prs: 'fa', jw: 'jv' };
  var FORBIDDEN = /^(he|iw|yi|heb)$/;
  var CONTENT_HOSTS = '#notesStackBox,#calendarDayAgendaBox,#dfSpanChunksHost,#dfVisualGuideLinesHost,#dfCompCheckHost,#dfRsvpWordStage,#dfSvgFormulaStage,#dfBidirConceptPills,#langListScrollBox,#currentLangIso,#currentLangLabel,#hdrMainTitle,#tasksListBox,.fc-card-text,.fc-q,.fc-a,.fc-example,[data-no-translate],[contenteditable="true"]';
  var ATTRS = ['placeholder', 'aria-label', 'title'];
  // Official 100-language list (mirrors i18n/languages.json; a test keeps them identical).
  root.DF_OFFICIAL_LANGS = ["ar", "en", "es", "zh", "hi", "fr", "de", "ru", "pt", "ja", "id", "tr", "ko", "vi", "it", "bn", "ur", "fa", "pl", "nl", "th", "sv", "el", "cs", "ro", "hu", "da", "fi", "no", "sk", "uk", "bg", "hr", "sr", "sl", "lt", "lv", "et", "sw", "fil", "ta", "te", "mr", "gu", "kn", "ml", "pa", "am", "az", "uz", "kk", "ka", "hy", "ne", "si", "my", "km", "lo", "mn", "af", "sq", "eu", "ca", "gl", "is", "ga", "mk", "mt", "cy", "be", "bs", "ky", "tg", "tk", "ps", "ku", "so", "ha", "yo", "ig", "zu", "xh", "sn", "st", "tn", "rw", "mg", "ny", "eo", "la", "gd", "co", "fy", "haw", "hmn", "sm", "su", "jw", "ms", "om"];
  var packs = root.DF_UI_PACKS = root.DF_UI_PACKS || {};
  var textOrig = new WeakMap(), attrOrig = new WeakMap();
  var active = 'en', loading = {}, missing = Object.create(null), applied = 0, observer = null, scheduled = false, pendingRoots = [];

  function west(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[०-९]/g, function (d) { return String(d.charCodeAt(0) - 0x0966); })
      .replace(/[০-৯]/g, function (d) { return String(d.charCodeAt(0) - 0x09E6); });
  }
  function base(code) {
    var c = String(code || 'en').toLowerCase().trim();
    if (VARIANT[c]) return VARIANT[c];
    var b = c.split(/[-_]/)[0];
    return VARIANT[b] || b || 'en';
  }
  // "Word 3 / 107" -> key "Word {0} / {1}", nums ["3","107"]
  function normalize(t) {
    var nums = [], i = 0;
    var key = t.replace(/\s+/g, ' ').trim().replace(/\d+(?:[.,:]\d+)*/g, function (m) { nums.push(m); return '{' + (i++) + '}'; });
    return { key: key, nums: nums };
  }
  function lookup(src) {
    var p = packs[active]; if (!p || !p.t) return null;
    var n = normalize(src); if (!n.key) return null;
    var tr = p.t[n.key];
    if (typeof tr !== 'string' || !tr) {
      if (/\p{L}/u.test(n.key) && n.key.length > 1) missing[n.key] = (missing[n.key] || 0) + 1;
      return null;
    }
    var out = tr.replace(/\{(\d+)\}/g, function (m, d) { return n.nums[+d] !== undefined ? n.nums[+d] : m; });
    var lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0];
    return lead + west(out) + trail;
  }
  function blocked(el) {
    if (!el || el.nodeType !== 1) return true;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE)$/.test(el.tagName)) return el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' ? true : 'attrs-only';
    if (el.isContentEditable) return true;
    return el.closest && el.closest(CONTENT_HOSTS) ? true : false;
  }
  function doText(node) {
    var el = node.parentElement, b = blocked(el); if (b) return;
    var rec = textOrig.get(node), cur = node.nodeValue;
    var src = rec && rec.out === cur ? rec.src : cur;
    if (active === 'en') { if (rec && rec.out === cur) { node.nodeValue = rec.src; textOrig.delete(node); } return; }
    var out = lookup(src);
    if (out && out !== cur) { node.nodeValue = out; textOrig.set(node, { src: src, out: out }); applied++; }
    else if (!out && rec && rec.out === cur) { node.nodeValue = rec.src; textOrig.delete(node); }
  }
  function doAttrs(el) {
    if (!el.hasAttribute) return;
    var b = blocked(el); if (b === true) return;
    var map = attrOrig.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i]; if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a), r = map && map[a], src = r && r.out === cur ? r.src : cur;
      if (active === 'en') { if (r && r.out === cur) { el.setAttribute(a, r.src); delete map[a]; } continue; }
      var out = lookup(src);
      if (out && out !== cur) { if (!map) { map = {}; attrOrig.set(el, map); } map[a] = { src: src, out: out }; el.setAttribute(a, out); applied++; }
    }
  }
  function walk(rootEl) {
    if (!rootEl) return;
    if (rootEl.nodeType === 3) { doText(rootEl); return; }
    if (rootEl.nodeType !== 1) return;
    doAttrs(rootEl);
    var w = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function flush() {
    scheduled = false;
    var list = pendingRoots; pendingRoots = [];
    if (observer) observer.disconnect();
    try { for (var i = 0; i < list.length; i++) walk(list[i]); } finally { observe(); }
  }
  function schedule(n) { pendingRoots.push(n); if (!scheduled) { scheduled = true; (root.requestAnimationFrame || setTimeout)(flush); } }
  function observe() {
    if (!root.MutationObserver || !doc.body) return;
    if (!observer) observer = new MutationObserver(function (muts) {
      if (active === 'en' && !textOrigUsed) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) schedule(m.addedNodes[j]);
        else schedule(m.target);
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  var textOrigUsed = false;
  function script(src, cb) {
    var s = doc.createElement('script'); s.src = src;
    s.onload = s.onerror = function () { cb(); };
    (doc.head || doc.documentElement).appendChild(s);
  }
  // Runtime packs store values aligned to the shared key list (locales/ui/_keys.js); expand once into a map.
  function expand(code) {
    var p = packs[code], K = root.DF_UI_KEYS;
    if (!p || p.t || !p.v) return;
    if (!K || K.hash !== p.keysHash) { delete packs[code]; return; } // stale pack: stay English rather than mis-assign
    var t = Object.create(null);
    for (var i = 0; i < K.k.length; i++) if (typeof p.v[i] === 'string' && p.v[i]) t[K.k[i]] = p.v[i];
    p.t = t;
  }
  function load(code, done) {
    if (code === 'en' || (packs[code] && packs[code].t)) return done();
    if (FORBIDDEN.test(code)) return done();
    if (loading[code]) { loading[code].push(done); return; }
    loading[code] = [done];
    var finish = function () { try { expand(code); } catch (_) {} var cbs = loading[code] || []; delete loading[code]; cbs.forEach(function (f) { try { f(); } catch (_) {} }); };
    var getPack = function () { if (packs[code]) finish(); else script('locales/ui/' + code + '.js', finish); };
    if (root.DF_UI_KEYS) getPack(); else script('locales/ui/_keys.js', getPack);
  }
  function apply(code) {
    var b = base(code || root.DF_CURRENT_LOCALE || (root.cfg && root.cfg.lang) || 'en');
    if (FORBIDDEN.test(b)) b = 'en';
    load(b, function () {
      active = packs[b] ? b : (b === 'en' ? 'en' : 'en-fallback');
      if (active === 'en-fallback') active = 'en';
      if (active !== 'en') textOrigUsed = true;
      missing = Object.create(null);
      if (observer) observer.disconnect();
      try { walk(doc.body); } finally { observe(); }
      try { root.dispatchEvent(new CustomEvent('df-ui-catalog-applied', { detail: { lang: active } })); } catch (_) {}
    });
    return b;
  }
  // Re-apply after every language switch made through the app's own applyLanguage().
  function hook() {
    if (typeof root.applyLanguage !== 'function' || root.applyLanguage.__dfCatalog) return;
    var orig = root.applyLanguage;
    var wrapped = function (code) { var r = orig.apply(this, arguments); try { apply(root.DF_CURRENT_LOCALE || code); } catch (_) {} return r; };
    wrapped.__dfCatalog = true;
    root.applyLanguage = wrapped;
    try { applyLanguage = wrapped; } catch (_) {} // global function binding used by inline handlers
  }
  root.DFUiCatalog = {
    apply: apply,
    translate: function (text) { var r = lookup(String(text || '')); return r || String(text || ''); },
    lookupKey: function (key) { var p = packs[active]; return p && p.t && typeof p.t[key] === 'string' ? p.t[key] : null; },
    active: function () { return active; },
    status: function (code) { var p = packs[base(code || active)]; return p ? p.status : (base(code || active) === 'en' ? 'source' : 'missing'); },
    report: function () { return { lang: active, applied: applied, missing: Object.keys(missing).sort() }; },
    _normalize: normalize
  };
  function boot() { hook(); apply(root.DF_CURRENT_LOCALE || (root.cfg && root.cfg.lang) || 'en'); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
  root.addEventListener && root.addEventListener('load', function () { hook(); apply(root.DF_CURRENT_LOCALE || (root.cfg && root.cfg.lang)); });
})(typeof window !== 'undefined' ? window : this);
