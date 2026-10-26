'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const l=require('../../../android/app/src/main/assets/web/js/locale_audio_settings_bridge.js');

const partial={
 zh:'音量',hi:'आवाज़ की तीव्रता',ru:'Громкость',pt:'Volume',ja:'音量',
 id:'Volume',tr:'Ses düzeyi',ko:'음량',vi:'Âm lượng',it:'Volume',
 bn:'শব্দের মাত্রা',ur:'آواز کی سطح',fa:'میزان صدا',pl:'Głośność',nl:'Volume'
};
test('legacy 20-locale nature volume UI restored without claiming full translations',()=>{
 for(const [locale,label] of Object.entries(partial)) {
  const info=l.metadata(locale),audio=l.audioLabels(locale,'forest');
  assert.equal(info.complete,false,locale+' must remain a partial locale');
  assert.equal(info.fallback,true);
  assert.equal(audio.volume,label,locale+' visible label');
  assert.equal(audio.volumeAria,label+': '+audio.name,locale+' accessible label');
 }
});
test('five fully authored packs and excluded locale semantics remain unchanged',()=>{
 for(const locale of ['en','ar','de','es','fr']) {
  assert.equal(l.metadata(locale).complete,true);
  assert.equal(l.audioLabels(locale,'forest').volume,l.translate(locale,'control.volume'));
 }
 for(const locale of ['he','iw','he-IL']) {
  assert.equal(l.audioLabels(locale,'forest').volume,'Volume');
  assert.equal(l.metadata(locale).complete,false);
 }
});
