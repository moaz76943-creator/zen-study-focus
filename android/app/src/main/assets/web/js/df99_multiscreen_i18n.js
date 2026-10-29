/* Deep Focus v21 compatible i18n: shared, offline and no access to saved user data.
 * A locale in the menu is NOT a complete translation. This code resolves only
 * existing verified strings and supports additional reviewed per-section packs.
 */
(function (root) {
  'use strict';
  const allowed = Object.create(null);
  const sections = ['timer','goals','tasks','notes','analytics','analyticsDomain','shell'];
  const blocked = new Set(['he','iw','__proto__','prototype','constructor']);
  const aliases = Object.freeze({
    timer: Object.freeze({
      '3':['premium','focus'], '4':['premium','shortBreak'],
      '5':['premium','longBreak'], '8':['premium','save']
    }),
    goals: Object.freeze({done:['quick','done']}),
    tasks: Object.freeze({add:['premium','newTask'],save:['premium','save'],cancel:['premium','cancel']}),
    notes: Object.freeze({'15':['premium','newNote']}),
    analytics: Object.freeze({}),
    analyticsDomain: Object.freeze({
      work:['quick','work'],study:['core','domStudy'],read:['core','domRead'],
      sport:['core','domSport']
    })
  });
  const normalize = code => {
    const v = typeof code === 'string' ? code.toLowerCase().trim().split(/[-_]/)[0] : 'en';
    return /^[a-z]{2,3}$/.test(v) && !blocked.has(v) ? v : 'en';
  };
  function quick(code,key) {
    if (typeof QUICK_TRANSLATIONS === 'undefined' || typeof QUICK_KEYS === 'undefined') return null;
    if (!Object.prototype.hasOwnProperty.call(QUICK_TRANSLATIONS,code)) return null;
    const i=QUICK_KEYS.indexOf(key);
    return i<0 ? null : QUICK_TRANSLATIONS[code][i] || null;
  }
  function premium(code,key) {
    const api=root.DF22Locale;
    if (!api || !api.translations || !Object.prototype.hasOwnProperty.call(api.translations,code)) return null;
    return api.t(code,key);
  }
  function core(code,key) {
    if (typeof DICT === 'undefined' || !Object.prototype.hasOwnProperty.call(DICT,code)) return null;
    return DICT[code][key] || null;
  }
  function register(code, family, dictionary) {
    code=normalize(code);
    if (code==='en' || blocked.has(code) || !sections.includes(family)) return false;
    if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) return false;
    const keys=Object.keys(dictionary);
    if (!keys.length || keys.length>250 || keys.some(k=>blocked.has(k) || !/^[\w-]{1,60}$/.test(k))) return false;
    if (keys.some(k=>typeof dictionary[k]!=='string' || !dictionary[k].trim() || dictionary[k].length>1000)) return false;
    const pack=Object.freeze(Object.fromEntries(keys.map(k=>[k,dictionary[k]])));
    if (!allowed[code]) allowed[code]=Object.create(null);
    allowed[code][family]=pack;
    return true;
  }
  // Plain-text substitution is for textContent/labels. HTML insertion callers
  // must use formatHtml() so user-supplied values cannot become markup.
  function interpolate(template, parameters, html) {
    if (typeof template !== 'string') return '';
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return template;
    return template.replace(/\{([A-Za-z][A-Za-z0-9_]{0,40})\}/g, (match, key) => {
      if (!Object.prototype.hasOwnProperty.call(parameters,key)) return match;
      const value=parameters[key];
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return match;
      const raw=String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
      return html ? raw.replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : raw;
    });
  }
  function format(template, parameters) { return interpolate(template,parameters,false); }
  function formatHtml(template, parameters) { return interpolate(template,parameters,true); }
  function t(rawCode, family, rawKey, fallback, parameters) {
    const code=normalize(rawCode),key=String(rawKey);
    const backup=fallback == null ? '' : fallback;
    if (!sections.includes(family) || !/^[\w-]{1,60}$/.test(key) || blocked.has(key)) return backup;
    if (code==='ar' || code==='en') return parameters ? format(backup,parameters) : backup;
    const supplied=allowed[code] && allowed[code][family] && allowed[code][family][key];
    if (supplied) return parameters ? format(supplied,parameters) : supplied;
    const alias=aliases[family] && aliases[family][key];
    if (!alias) return parameters ? format(backup,parameters) : backup;
    const [where,lookup]=alias;
    const result=where==='quick'?quick(code,lookup):where==='premium'?premium(code,lookup):core(code,lookup);
    if (!result) return parameters ? format(backup,parameters) : backup;
    // Timer controls display their units even when sourced from a shared label.
    const label=family==='timer' && (key==='3'||key==='4'||key==='5') ? result+' · min' : result;
    return parameters ? format(label,parameters) : label;
  }
  function section(family, code, fallback) {
    const result=Object.assign({},fallback);
    for (const key of Object.keys(result)) result[key]=t(code,family,key,result[key]);
    return result;
  }
  function coverage(codes, fam, keys) {
    return codes.map(raw=>{
      const code=normalize(raw), custom=allowed[code]&&allowed[code][fam]||{};
      const translated=keys.filter(k=>{
        if (code==='en' || code==='ar') return true;
        if (Object.prototype.hasOwnProperty.call(custom,k)) return true;
        const entry=aliases[fam]&&aliases[fam][k];
        if (!entry) return false;
        return Boolean(entry[0]==='quick'?quick(code,entry[1]):entry[0]==='premium'?premium(code,entry[1]):core(code,entry[1]));
      });
      return {code,translated:translated.length,total:keys.length};
    });
  }
  root.DF99Locale=Object.freeze({normalize,t,section,register,coverage,format,formatHtml,sections:Object.freeze(sections.slice())});
})(typeof window!=='undefined'?window:globalThis);
