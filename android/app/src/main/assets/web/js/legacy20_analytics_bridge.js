/* DF09 legacy 20-locale analytics recovery.
 * Preserve all live reviewed labels and add only genuinely translated missing keys.
 * No data writes, changing language menus or incomplete 99-locale claims.
 */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DF09LegacyAnalyticsBridge=api;
  if(root.DF99Locale&&root.DeepFocusLocale20Recovery)api.apply();
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const canonical=Object.freeze([
    'title','activity','period','start','end','minutes','sessions','average','streak',
    'noData','goal','noGoals','tasks','chart','year','export','details','all',
    'daily','weekly','monthly','minuteUnit','heatMinutes','excluded',
    'invalidRange','barAria','heatAria','exportSaved','exportCancelled','exportFailed'
  ]);
  const fromOld=Object.freeze({
    title:'analyticsTitle',activity:'activity',period:'period',start:'from',end:'to',
    minutes:'minutes',sessions:'sessions',average:'average',streak:'streak',
    noData:'noSessions',goal:'goal',noGoals:'noGoals',tasks:'completedTasks',
    chart:'chart',year:'year',export:'export',details:'details',all:'all',
    daily:'daily',weekly:'weekly',monthly:'monthly',minuteUnit:'minute',
    heatMinutes:'minutes',excluded:'excluded'
  });
  // The reviewed UI also uses post-legacy keys. register() replaces a section,
  // so retain these exact existing labels when extending the older dictionary.
  const retainedUiKeys=Object.freeze([
    'today','last7','last30','currentWeek','priorWeek','activitySplit',
    'historicalGoals','noHistoricalGoals','exportUnavailable'
  ]);
  const MISS='__DF09_UNSET_VALUE_DO_NOT_TRANSLATE__';
  function apply(){
    const live=root.DF99Locale,old=root.DeepFocusLocale20Recovery;
    if(!live||!old||typeof live.register!=='function')return Object.freeze({status:'NOT_READY'});
    const reports={};
    for(const locale of old.LANGUAGES){
      if(locale==='en'||locale==='ar'||locale==='he'||locale==='iw')continue;
      const pack=Object.create(null);
      let retained=0,added=0;
      for(const key of canonical){
        // Existing human-reviewed active values always win.
        const existing=live.t(locale,'analytics',key,MISS);
        if(typeof existing==='string'&&existing!==MISS&&existing.trim()){
          pack[key]=existing;retained++;continue;
        }
        const keyOld=fromOld[key];
        if(!keyOld)continue;
        const value=old.t(locale,keyOld),english=old.t('en',keyOld);
        if(typeof value==='string'&&value.trim()&&value!==english) {
          pack[key]=value;added++;
        }
      }
      for(const key of retainedUiKeys){
        const existing=live.t(locale,'analytics',key,MISS);
        if(typeof existing==='string'&&existing!==MISS&&existing.trim()){
          pack[key]=existing;retained++;
        }
      }
      const registered=Object.keys(pack).length>0&&live.register(locale,'analytics',pack);
      if(!registered)throw Error('DF09 analytics registration rejected: '+locale);
      reports[locale]=Object.freeze({retained,added});
    }
    return Object.freeze({status:'INSTALLED',reports:Object.freeze(reports)});
  }
  return Object.freeze({canonical,fromOld,apply});
});
