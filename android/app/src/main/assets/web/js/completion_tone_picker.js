/* Deep Focus DF09: visually scoped completion tone picker.
 * Uses existing tone identifiers, localStorage preference and playCompletionTone() only.
 * No timers, v21 records, new audio assets or synthetic translations for the other 79 locales. */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DF09CompletionTonePicker=api;
  if(typeof document!=='undefined'&&typeof document.createElement==='function')api.install(document);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const CHOICES=Object.freeze(['zen_bell','tibetan_bowl','woodblock','crystal','gong','vibrate']);
  const ROWS={
  "en": [
    "Zen Bell",
    "Tibetan Bowl",
    "Woodblock",
    "Crystal Bell",
    "Temple Gong",
    "Vibration only"
  ],
  "ar": [
    "جرس زن",
    "الوعاء التبتي",
    "نقرة خشبية",
    "جرس بلوري",
    "غونغ المعبد",
    "اهتزاز فقط"
  ],
  "es": [
    "Campana zen",
    "Cuenco tibetano",
    "Bloque de madera",
    "Campana de cristal",
    "Gong del templo",
    "Solo vibración"
  ],
  "zh": [
    "禅铃",
    "西藏颂钵",
    "木块敲击",
    "水晶铃",
    "寺庙铜锣",
    "仅振动"
  ],
  "hi": [
    "ज़ेन घंटी",
    "तिब्बती कटोरा",
    "लकड़ी की थाप",
    "क्रिस्टल घंटी",
    "मंदिर का घंटा",
    "केवल कंपन"
  ],
  "fr": [
    "Cloche zen",
    "Bol tibétain",
    "Percussion en bois",
    "Cloche de cristal",
    "Gong du temple",
    "Vibration uniquement"
  ],
  "de": [
    "Zen-Glocke",
    "Tibetische Klangschale",
    "Holzklopfer",
    "Kristallglocke",
    "Tempelgong",
    "Nur Vibration"
  ],
  "ru": [
    "Дзэн-колокольчик",
    "Тибетская чаша",
    "Деревянный блок",
    "Хрустальный колокольчик",
    "Храмовый гонг",
    "Только вибрация"
  ],
  "pt": [
    "Sino zen",
    "Taça tibetana",
    "Bloco de madeira",
    "Sino de cristal",
    "Gongo do templo",
    "Apenas vibração"
  ],
  "ja": [
    "禅の鈴",
    "チベットのシンギングボウル",
    "ウッドブロック",
    "クリスタルベル",
    "寺院のゴング",
    "振動のみ"
  ],
  "id": [
    "Lonceng Zen",
    "Mangkuk Tibet",
    "Ketukan kayu",
    "Lonceng kristal",
    "Gong kuil",
    "Getar saja"
  ],
  "tr": [
    "Zen zili",
    "Tibet çanağı",
    "Tahta tokmak",
    "Kristal zil",
    "Tapınak gongu",
    "Yalnızca titreşim"
  ],
  "ko": [
    "선 벨",
    "티베트 싱잉볼",
    "우드블록",
    "크리스털 벨",
    "사원 징",
    "진동만"
  ],
  "vi": [
    "Chuông thiền",
    "Bát Tây Tạng",
    "Gõ khối gỗ",
    "Chuông pha lê",
    "Cồng đền",
    "Chỉ rung"
  ],
  "it": [
    "Campana zen",
    "Campana tibetana",
    "Percussione di legno",
    "Campana di cristallo",
    "Gong del tempio",
    "Solo vibrazione"
  ],
  "bn": [
    "জেন ঘণ্টা",
    "তিব্বতি বাটি",
    "কাঠের টোকা",
    "স্ফটিক ঘণ্টা",
    "মন্দিরের গং",
    "শুধু কম্পন"
  ],
  "ur": [
    "زین گھنٹی",
    "تبتی پیالہ",
    "لکڑی کی ٹک",
    "کرسٹل گھنٹی",
    "مندر کا گونگ",
    "صرف ارتعاش"
  ],
  "fa": [
    "زنگ ذن",
    "کاسه تبتی",
    "ضربه چوبی",
    "زنگ کریستالی",
    "گونگ معبد",
    "فقط لرزش"
  ],
  "pl": [
    "Dzwonek zen",
    "Misa tybetańska",
    "Drewniany klocek",
    "Kryształowy dzwonek",
    "Gong świątynny",
    "Tylko wibracje"
  ],
  "nl": [
    "Zenbel",
    "Tibetaanse klankschaal",
    "Houtblok",
    "Kristallen bel",
    "Tempelgong",
    "Alleen trillen"
  ]
};
  const supported=Object.freeze(Object.keys(ROWS));
  for(const code of supported) {
    if(ROWS[code].length!==CHOICES.length||ROWS[code].some(x=>!x||!x.trim()))throw Error('Missing tone label: '+code);
    Object.freeze(ROWS[code]);
  }
  Object.freeze(ROWS);
  const normalize=code=>String(code||'en').split(/[-_]/)[0].toLowerCase();
  const selectedRows=code=>ROWS[normalize(code)]||ROWS.en;
  const label=(code,id)=>{
    const pos=CHOICES.indexOf(id);
    return pos===-1?null:selectedRows(code)[pos];
  };
  const localize=(code,key)=>{
    const locale=root.DeepFocusCompletionAlertLocales;
    return (locale&&locale.translate(code,'completionAlerts.'+key)) ||
      (locale&&locale.translate('en','completionAlerts.'+key)) ||
      ({title:'Completion sound',choose:'Choose a sound',preview:'Preview'}[key]||null);
  };
  function render(doc) {
    const host=doc.getElementById('completionAlertPickerHost');
    if(!host)return false;
    const code=normalize(doc.documentElement.lang||'en');
    const raw=(()=>{try{return root.localStorage?.getItem('df_end_tone');}catch(_){return null;}})();
    let current=CHOICES.includes(raw)?raw:'zen_bell';
    const el=(type,cls)=>{const n=doc.createElement(type);if(cls)n.className=cls;return n;};
    const card=el('div','completion-alert-picker');
    const h=el('h3');h.textContent=localize(code,'title');card.appendChild(h);
    const field=el('fieldset'),legend=el('legend');legend.textContent=localize(code,'choose');field.appendChild(legend);
    CHOICES.forEach(id=>{
      const row=el('div','completion-alert-option'),group=el('label'),radio=el('input');
      radio.type='radio';radio.name='df-completion-tone-choice';radio.value=id;
      radio.checked=id===current;
      const text=el('span');text.textContent=label(code,id);
      group.appendChild(radio);group.appendChild(text);
      radio.addEventListener('change',()=>{
        if(!radio.checked)return;
        try {
          root.localStorage.setItem('df_end_tone',id);
          current=id;
          for(const input of host.querySelectorAll('input[name="df-completion-tone-choice"]')) input.checked=(input.value===id);
        } catch(_) {
          radio.checked=false;
          for(const input of host.querySelectorAll('input[name="df-completion-tone-choice"]'))input.checked=(input.value===current);
        }
      });
      const preview=el('button');
      preview.type='button';
      preview.textContent=localize(code,'preview');
      preview.setAttribute('aria-label',localize(code,'preview')+': '+label(code,id));
      preview.addEventListener('click',()=>{if(typeof root.playCompletionTone==='function')root.playCompletionTone(id);});
      row.appendChild(group);row.appendChild(preview);field.appendChild(row);
    });
    card.appendChild(field);
    host.replaceChildren(card);
    host.setAttribute('aria-label',localize(code,'title'));
    host.setAttribute('dir',/^(ar|fa|ur)$/.test(code)?'rtl':'ltr');
    host.dataset.df09Locale=code;
    return true;
  }
  function install(doc) {
    const mount=()=>{render(doc);const Obs=root.MutationObserver;
      if(typeof Obs==='function'){
        const observer=new Obs(mutations=>{if(mutations.some(m=>m.attributeName==='lang'))render(doc);});
        observer.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
      }
    };
    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});
    else mount();
  }
  return Object.freeze({CHOICES,supported,ROWS,normalize,label,localize,render,install});
});
