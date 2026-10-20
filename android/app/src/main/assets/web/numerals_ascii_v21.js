/* DEEP-FOCUS-RECOVERY-05 / DF-060..069
 * Opt-in presentation and export formatters. NEVER bind to all input/textarea events,
 * traverse unmarked user content, or mutate v21 persistence/identifiers.
 * Lane 00 owns loading this file and replacing the legacy global input listener.
 */
(function (root, makeApi) {
  'use strict';
  const api = makeApi();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusAsciiNumeralsV21 = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const EASTERN = /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/g;
  const PROTECTED = 'input,textarea,[contenteditable],[data-df-user-content],[data-df20-user-content],.note-content,.note-body,.task-title,.task-text,.note-card,.task-card';
  // Only generated UI counters/labels are eligible; never traverse free-form
  // task titles, note bodies, project labels or persisted user-authored text.
  const GENERATED_UI = '[data-df-generated-number],[data-df-latin-numerals],'+
    '#timerDigitsTxt,#sportSetCounterTxt,#readPagesCounterTxt,#qtExerciseCount,'+
    '#hdrStreakBadge,#hdrFocusMins,#nsCounter,#nsVisibleCount,#nsTotal,'+
    '#todayPlanRatio,#todayPlanPercent,#kpiTotalMins,#kpiWeeklyTrend,'+
    '#kpiTotalSessions,#kpiSessionTrend,#waveRecordedMinutes,'+
    '#mixerStatusTxt,#peakPerfBadge,'+
    '.dfa-studio strong,.dfar-panel strong,.dfar-kpi,.dfar-comparison,'+
    '.dfa-studio [data-day],.dfar-panel [data-bucket],'+
    '.today-plan-stats strong,.goals-rows .goal-value,.training-progress [data-progress]';
  function toAsciiDigits(value) {
    return String(value).replace(EASTERN, function (digit) {
      const cp = digit.charCodeAt(0);
      const zero=cp>=0x09e6?0x09e6:cp>=0x0966?0x0966:cp>=0x06f0?0x06f0:0x0660;
      return String(cp-zero);
    });
  }
  function finite(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError('Finite number required');
    return value;
  }
  function formatNumber(value, options) {
    const opts = options || {};
    finite(value);
    try {
      // Force Latin numerals even for Arabic, Persian and Urdu UIs. No grouping
      // by default; never use locale-dependent formatting for persisted numbers.
      const formatted = new Intl.NumberFormat(opts.locale || 'en', {
        numberingSystem: 'latn',
        useGrouping: opts.useGrouping === true,
        minimumFractionDigits: opts.minimumFractionDigits === undefined ? 0 : opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits === undefined ? 10 : opts.maximumFractionDigits
      }).format(value);
      return toAsciiDigits(formatted).replace(/[\u200e\u200f\u061c]/g, '');
    } catch (_) {
      return String(value); // Unsupported Intl/locale: culture-neutral fallback.
    }
  }
  function formatPercent(percentage, options) {
    return formatNumber(percentage, options) + '%'; // Already percent, not ratio.
  }
  function formatTimer(seconds, options) {
    finite(seconds);
    if (seconds < 0) throw new RangeError('Timer seconds cannot be negative');
    const whole = Math.floor(seconds), h = Math.floor(whole / 3600);
    const mm = Math.floor((options && options.hours ? whole % 3600 : whole) / 60);
    const ss = whole % 60;
    const two = x => String(x).padStart(2, '0');
    return options && options.hours ? [two(h), two(mm), two(ss)].join(':') : two(mm) + ':' + two(ss);
  }
  function isoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new RangeError('Expected YYYY-MM-DD ASCII date');
    const date = new Date(value + 'T12:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      throw new RangeError('Invalid calendar date');
    return value;
  }
  function formatDateLabel(value, options) {
    const key = isoDate(value), opts = options || {};
    try {
      return toAsciiDigits(new Intl.DateTimeFormat(opts.locale || 'en', {
        year:'numeric', month:'long', day:'numeric', numberingSystem:'latn',
        timeZone:'UTC', calendar:'gregory'
      }).format(new Date(key + 'T12:00:00Z')));
    } catch (_) { return key; }
  }
  function isProtected(element) {
    if (!element || typeof element.tagName !== 'string') return true;
    if (/^(INPUT|TEXTAREA)$/i.test(element.tagName)) return true;
    if (element.childElementCount > 0) return true; // Avoid replacing nested user nodes.
    if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-df-user-content')) return true;
    return typeof element.closest === 'function' && !!element.closest(PROTECTED);
  }
  function bidi(element) {
    if (typeof element.setAttribute === 'function') element.setAttribute('dir', 'ltr');
    if (element.style) {
      element.style.direction = 'ltr';
      element.style.unicodeBidi = 'isolate';
    }
  }
  function renderNumber(element, value, options) {
    if (isProtected(element)) return false;
    const formatted = formatNumber(value, options);
    element.textContent = formatted;
    element.setAttribute('data-df-generated-number', '');
    element.setAttribute('data-df-raw-number', String(value));
    bidi(element);
    return true;
  }
  function numericValue(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const ascii = toAsciiDigits(raw);
    if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(ascii)) return null;
    const parsed = Number(ascii);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function refresh(scope, options) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    let touched = 0;
    for (const element of scope.querySelectorAll('[data-df-generated-number]')) {
      if (isProtected(element)) continue;
      const raw = element.getAttribute('data-df-raw-number');
      if (raw !== null) {
        const value = numericValue(raw);
        // Malformed metadata may be safely cleaned only as visible generated text.
        element.textContent = value === null ? toAsciiDigits(element.textContent) : formatNumber(value, options);
      } else element.textContent = toAsciiDigits(element.textContent);
      // Only caller-tagged SVG text/title/axis/tooltips/legends/aria labels.
      for (const attribute of ['aria-label','title']) {
        const before = element.getAttribute(attribute);
        if (before !== null) element.setAttribute(attribute, toAsciiDigits(before));
      }
      bidi(element);
      touched++;
    }
    return touched;
  }
  // Normalize only UI-owned leaf text nodes, never arbitrary DOM content.
  // MutationObserver re-applies the policy after timer/analytics re-renders.
  const observers=new WeakMap();
  function normalizeGeneratedUi(scope) {
    if(!scope || typeof scope.querySelectorAll!=='function')return 0;
    const elements=[];
    if(typeof scope.matches==='function' && scope.matches(GENERATED_UI))elements.push(scope);
    for(const element of scope.querySelectorAll(GENERATED_UI))elements.push(element);
    let changed=0;
    for(const el of elements){
      if(isProtected(el))continue;
      const before=el.textContent;
      if(typeof before==='string'){
        const after=toAsciiDigits(before);
        if(after!==before){
          // A markup-rich element could embed user content: do not rewrite it.
          if(el.childElementCount>0)continue;
          el.textContent=after;changed++;
        }
      }
      for(const attr of ['aria-label','title']){
        if(typeof el.getAttribute!=='function'||typeof el.setAttribute!=='function')continue;
        const raw=el.getAttribute(attr);
        if(raw!==null&&raw!==undefined){
          const ascii=toAsciiDigits(raw);
          if(raw!==ascii){el.setAttribute(attr,ascii);changed++;}
        }
      }
    }
    return changed;
  }
  function wireGeneratedUi(scope){
    if(!scope || typeof scope.querySelectorAll!=='function')return 0;
    const count=normalizeGeneratedUi(scope);
    if(observers.has(scope))return count;
    const win=scope.defaultView||scope.ownerDocument?.defaultView;
    const Observer=win?.MutationObserver;
    if(typeof Observer!=='function')return count;
    const observer=new Observer(()=>normalizeGeneratedUi(scope));
    observer.observe(scope.documentElement||scope,{childList:true,characterData:true,subtree:true});
    observers.set(scope,observer);
    return count;
  }
  function normalizeNumericInput(element) {
    if (!element || !/^INPUT$/i.test(element.tagName || '') ||
        typeof element.hasAttribute !== 'function' || !element.hasAttribute('data-df-numeric-input')) return false;
    const before = String(element.value);
    // Numeric inputs only: decimal punctuation normalized, original free text unaltered.
    const after = toAsciiDigits(before).replace(/\u066b/g,'.').replace(/\u066c/g,'');
    if (after !== before) element.value = after;
    bidi(element);
    return true;
  }
  function wireNumericInputs(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    let added = 0;
    for (const element of scope.querySelectorAll('input[data-df-numeric-input]')) {
      if (element.__dfAsciiBound) continue;
      normalizeNumericInput(element);
      element.addEventListener('input', function () { normalizeNumericInput(element); });
      element.__dfAsciiBound = true;
      added++;
    }
    return added;
  }
  function serializeCsv(rows, columns) {
    if (!Array.isArray(rows) || !Array.isArray(columns) || !columns.length)
      throw new TypeError('Records and explicit columns are required');
    const column = c => {
      if (!c || typeof c.key !== 'string' || !['number','date','text'].includes(c.kind))
        throw new TypeError('A column needs key and kind: number/date/text');
      return c;
    };
    const defs = columns.map(column);
    const escapeCell = value => {
      const cell=String(value);
      return /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g,'""') + '"' : cell;
    };
    const lines = [defs.map(c=>escapeCell(c.key)).join(',')];
    for (const row of rows) {
      if (!row || typeof row !== 'object') throw new TypeError('Invalid CSV row');
      lines.push(defs.map(c=>{
        const value = row[c.key];
        if (value === null || value === undefined) return '';
        if (c.kind === 'number') {
          if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid numeric field: ' + c.key);
          return escapeCell(String(value)); // Always ASCII digits and dot decimal.
        }
        if (c.kind === 'date') return escapeCell(isoDate(value));
        return escapeCell(value); // Never rewrite user-authored note or task text.
      }).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }
  return Object.freeze({toAsciiDigits,formatNumber,formatPercent,formatTimer,isoDate,formatDateLabel,
    renderNumber,refresh,normalizeNumericInput,wireNumericInputs,
    normalizeGeneratedUi,wireGeneratedUi,serializeCsv});
});
