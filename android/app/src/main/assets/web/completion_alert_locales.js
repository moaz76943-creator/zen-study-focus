/* DF-043 / DF-031: localized completion-alert picker, offline and read-only. */
(function (root, factory) {
  'use strict';
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.DeepFocusCompletionAlertLocales=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEYS=Object.freeze(["title","choose","silent","soft-bell","wood-tap","water-drop","muted-metal","two-taps","preview","enabled","volume"]);
  const languages=Object.freeze(["en","ar","es","zh","hi","fr","de","ru","pt","ja","id","tr","ko","vi","it","bn","ur","fa","pl","nl"]);
  const ROWS={
  "en": [
    "Completion sound",
    "Choose a sound",
    "Complete silence",
    "Soft single bell",
    "Gentle wooden tap",
    "Water drop",
    "Muted metallic strike",
    "Two soft wooden taps",
    "Preview",
    "Enable completion sound",
    "Alert volume"
  ],
  "ar": [
    "صوت انتهاء الوقت",
    "اختر صوتًا",
    "صمت تام",
    "جرس ناعم قصير",
    "نقرة خشبية لطيفة",
    "قطرة ماء",
    "رنين معدني خفيف",
    "نقرتان خشبيتان ناعمتان",
    "استماع",
    "تفعيل صوت الانتهاء",
    "مستوى صوت التنبيه"
  ],
  "es": [
    "Sonido al finalizar",
    "Elige un sonido",
    "Silencio total",
    "Campana suave",
    "Golpe de madera suave",
    "Gota de agua",
    "Toque metálico tenue",
    "Dos golpecitos de madera",
    "Escuchar",
    "Activar sonido final",
    "Volumen de alerta"
  ],
  "zh": [
    "完成提示音",
    "选择提示音",
    "完全静音",
    "柔和铃声",
    "轻柔木击声",
    "水滴声",
    "轻柔金属敲击",
    "两声轻柔木击",
    "试听",
    "启用完成提示音",
    "提示音音量"
  ],
  "hi": [
    "समाप्ति की ध्वनि",
    "ध्वनि चुनें",
    "पूरी तरह मौन",
    "हल्की घंटी",
    "लकड़ी की हल्की थपकी",
    "पानी की बूँद",
    "हल्की धातु की टंकार",
    "लकड़ी की दो हल्की थपकियाँ",
    "सुनकर देखें",
    "समाप्ति ध्वनि चालू करें",
    "अलर्ट की आवाज़"
  ],
  "fr": [
    "Son de fin de séance",
    "Choisir un son",
    "Silence total",
    "Clochette douce",
    "Petit coup de bois",
    "Goutte d’eau",
    "Tintement métallique discret",
    "Deux petits coups de bois",
    "Écouter",
    "Activer le son de fin",
    "Volume de l’alerte"
  ],
  "de": [
    "Abschlusston",
    "Ton auswählen",
    "Vollständige Stille",
    "Sanfte Glocke",
    "Leises Holzklopfen",
    "Wassertropfen",
    "Gedämpfter Metallklang",
    "Zwei sanfte Holzklopfer",
    "Anhören",
    "Abschlusston aktivieren",
    "Lautstärke des Signals"
  ],
  "ru": [
    "Звук завершения",
    "Выберите звук",
    "Полная тишина",
    "Мягкий звонок",
    "Тихий стук дерева",
    "Капля воды",
    "Приглушённый металлический звон",
    "Два мягких стука дерева",
    "Прослушать",
    "Включить звук завершения",
    "Громкость сигнала"
  ],
  "pt": [
    "Som de conclusão",
    "Escolher som",
    "Silêncio total",
    "Sino suave",
    "Toque leve na madeira",
    "Gota de água",
    "Toque metálico discreto",
    "Dois toques suaves na madeira",
    "Ouvir",
    "Ativar som de conclusão",
    "Volume do alerta"
  ],
  "ja": [
    "終了通知音",
    "通知音を選択",
    "完全に無音",
    "やさしいベル",
    "やさしい木の音",
    "水滴の音",
    "控えめな金属音",
    "木を軽くたたく音を2回",
    "試聴",
    "終了通知音を有効にする",
    "通知音の音量"
  ],
  "id": [
    "Suara selesai",
    "Pilih suara",
    "Senyap sepenuhnya",
    "Bel lembut",
    "Ketukan kayu lembut",
    "Tetesan air",
    "Dentang logam pelan",
    "Dua ketukan kayu lembut",
    "Dengarkan",
    "Aktifkan suara selesai",
    "Volume notifikasi"
  ],
  "tr": [
    "Bitiş sesi",
    "Bir ses seçin",
    "Tam sessizlik",
    "Yumuşak zil",
    "Hafif tahta tıkırtısı",
    "Su damlası",
    "Hafif metal tınısı",
    "İki hafif tahta tıkırtısı",
    "Dinle",
    "Bitiş sesini etkinleştir",
    "Uyarı ses düzeyi"
  ],
  "ko": [
    "완료 알림음",
    "소리 선택",
    "완전 무음",
    "부드러운 종소리",
    "가벼운 나무 두드림",
    "물방울 소리",
    "은은한 금속 소리",
    "가벼운 나무 두드림 두 번",
    "미리 듣기",
    "완료 알림음 켜기",
    "알림 음량"
  ],
  "vi": [
    "Âm báo hoàn thành",
    "Chọn âm thanh",
    "Hoàn toàn im lặng",
    "Tiếng chuông nhẹ",
    "Tiếng gõ gỗ nhẹ",
    "Giọt nước",
    "Tiếng kim loại êm",
    "Hai tiếng gõ gỗ nhẹ",
    "Nghe thử",
    "Bật âm báo hoàn thành",
    "Âm lượng thông báo"
  ],
  "it": [
    "Suono di fine sessione",
    "Scegli un suono",
    "Silenzio completo",
    "Campanella delicata",
    "Tocco leggero di legno",
    "Goccia d’acqua",
    "Tocco metallico tenue",
    "Due tocchi leggeri di legno",
    "Ascolta",
    "Attiva il suono finale",
    "Volume avviso"
  ],
  "bn": [
    "সমাপ্তির শব্দ",
    "একটি শব্দ বেছে নিন",
    "সম্পূর্ণ নীরব",
    "কোমল ঘণ্টাধ্বনি",
    "কাঠে মৃদু টোকা",
    "জলের ফোঁটা",
    "মৃদু ধাতব শব্দ",
    "কাঠে দুটি মৃদু টোকা",
    "শুনে দেখুন",
    "সমাপ্তির শব্দ চালু করুন",
    "সতর্কতার শব্দের মাত্রা"
  ],
  "ur": [
    "اختتام کی آواز",
    "آواز منتخب کریں",
    "مکمل خاموشی",
    "نرم گھنٹی",
    "لکڑی کی ہلکی دستک",
    "پانی کا قطرہ",
    "مدھم دھاتی آواز",
    "لکڑی کی دو ہلکی دستکیں",
    "آواز سنیں",
    "اختتام کی آواز فعال کریں",
    "تنبیہ کی آواز کی سطح"
  ],
  "fa": [
    "صدای پایان",
    "یک صدا انتخاب کنید",
    "سکوت کامل",
    "زنگ ملایم",
    "ضربه آرام چوبی",
    "قطره آب",
    "طنین فلزی ملایم",
    "دو ضربه آرام چوبی",
    "پیش‌شنیدن",
    "فعال‌کردن صدای پایان",
    "بلندی صدای هشدار"
  ],
  "pl": [
    "Dźwięk zakończenia",
    "Wybierz dźwięk",
    "Całkowita cisza",
    "Delikatny dzwonek",
    "Lekkie stuknięcie w drewno",
    "Kropla wody",
    "Stłumiony metaliczny dźwięk",
    "Dwa lekkie stuknięcia w drewno",
    "Odsłuchaj",
    "Włącz dźwięk zakończenia",
    "Głośność powiadomienia"
  ],
  "nl": [
    "Eindsignaal",
    "Kies een geluid",
    "Volledige stilte",
    "Zacht belletje",
    "Zachte houten tik",
    "Waterdruppel",
    "Gedempte metalen klank",
    "Twee zachte houten tikken",
    "Beluisteren",
    "Eindsignaal inschakelen",
    "Meldingsvolume"
  ]
};
  const tables=Object.create(null);
  for(const locale of languages){
    const values=ROWS[locale];
    if(!Array.isArray(values)||values.length!==KEYS.length||values.some(v=>typeof v!=='string'||!v.trim()))
      throw new Error('Missing completion alert translation: '+locale);
    tables[locale]=Object.freeze(Object.fromEntries(KEYS.map((key,i)=>[key,values[i]])));
  }
  Object.freeze(tables);
  function translate(locale,fullKey){
    const code=String(locale||'en').split(/[-_]/)[0].toLowerCase();
    if(typeof fullKey!=='string'||!fullKey.startsWith('completionAlerts.'))return null;
    const key=fullKey.slice('completionAlerts.'.length);
    if(!Object.prototype.hasOwnProperty.call(tables,code)||
       !Object.prototype.hasOwnProperty.call(tables[code],key))return null;
    return tables[code][key];
  }
  return Object.freeze({KEYS,languages,translate,tables});
});
