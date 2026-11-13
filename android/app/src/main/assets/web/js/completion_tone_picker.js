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
    "Water Drop",
    "Stream Ripple",
    "Rain Tap",
    "Wind Rustle",
    "Distant Thunder",
    "Vibration only"
  ],
  "ar": [
    "قطرة ماء",
    "خرير الماء",
    "نقر المطر",
    "حفيف الرياح",
    "رعد بعيد",
    "اهتزاز فقط"
  ],
  "es": [
    "Gota de agua",
    "Ondas del arroyo",
    "Golpecitos de lluvia",
    "Susurro del viento",
    "Trueno lejano",
    "Solo vibración"
  ],
  "zh": [
    "水滴",
    "溪流涟漪",
    "雨滴轻敲",
    "风吹沙沙",
    "远处雷声",
    "仅振动"
  ],
  "hi": [
    "पानी की बूंद",
    "धारा की लहर",
    "बारिश की थाप",
    "हवा की सरसराहट",
    "दूर की गड़गड़ाहट",
    "केवल कंपन"
  ],
  "fr": [
    "Goutte d'eau",
    "Ondulation du ruisseau",
    "Tapotement de pluie",
    "Bruissement du vent",
    "Tonnerre lointain",
    "Vibration uniquement"
  ],
  "de": [
    "Wassertropfen",
    "Bachplätschern",
    "Regentropfen",
    "Windrauschen",
    "Ferner Donner",
    "Nur Vibration"
  ],
  "ru": [
    "Капля воды",
    "Рябь ручья",
    "Стук дождя",
    "Шелест ветра",
    "Далёкий гром",
    "Только вибрация"
  ],
  "pt": [
    "Gota d'água",
    "Ondulação do riacho",
    "Toque da chuva",
    "Sussurro do vento",
    "Trovão distante",
    "Apenas vibração"
  ],
  "ja": [
    "水滴",
    "小川のさざ波",
    "雨だれ",
    "風のざわめき",
    "遠雷",
    "振動のみ"
  ],
  "id": [
    "Tetesan air",
    "Riak aliran",
    "Ketukan hujan",
    "Desir angin",
    "Guntur jauh",
    "Getar saja"
  ],
  "tr": [
    "Su damlası",
    "Dere dalgacığı",
    "Yağmur tıkırtısı",
    "Rüzgâr hışırtısı",
    "Uzak gök gürültüsü",
    "Yalnızca titreşim"
  ],
  "ko": [
    "물방울",
    "시냇물 잔물결",
    "빗방울 소리",
    "바람 소리",
    "먼 천둥",
    "진동만"
  ],
  "vi": [
    "Giọt nước",
    "Gợn suối",
    "Tiếng mưa gõ",
    "Gió xào xạc",
    "Sấm xa",
    "Chỉ rung"
  ],
  "it": [
    "Goccia d'acqua",
    "Increspatura del ruscello",
    "Picchiettio di pioggia",
    "Fruscio del vento",
    "Tuono lontano",
    "Solo vibrazione"
  ],
  "bn": [
    "জলের ফোঁটা",
    "ঝরনার ঢেউ",
    "বৃষ্টির টোকা",
    "বাতাসের মর্মর",
    "দূরের বজ্রধ্বনি",
    "শুধু কম্পন"
  ],
  "ur": [
    "پانی کا قطرہ",
    "ندی کی لہر",
    "بارش کی ٹپ",
    "ہوا کی سرسراہٹ",
    "دور کی گرج",
    "صرف ارتعاش"
  ],
  "fa": [
    "قطره آب",
    "موج جویبار",
    "ضربه باران",
    "خش‌خش باد",
    "رعد دور",
    "فقط لرزش"
  ],
  "pl": [
    "Kropla wody",
    "Falowanie strumienia",
    "Stukot deszczu",
    "Szelest wiatru",
    "Odległy grzmot",
    "Tylko wibracje"
  ],
  "nl": [
    "Waterdruppel",
    "Beekrimpeling",
    "Regentik",
    "Windgeruis",
    "Verre donder",
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
