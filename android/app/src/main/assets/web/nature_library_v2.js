/* Nature library inventory: no network, samples, fake audio or new playback approval. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeepFocusNatureLibraryV2=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const entries=Object.freeze([
  {
    "id": "ocean",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "rain",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rain.ogg"
  },
  {
    "id": "fire",
    "category": "warm",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "forest",
    "category": "forest",
    "ready": true,
    "synthetic": false,
    "src": "sounds/forest.ogg",
    "sourceUrl": "https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md"
  },
  {
    "id": "stream",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "leaves",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "waterfall",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://freesound.org/people/Tom_Kaszuba/sounds/660255/"
  },
  {
    "id": "night",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://freesound.org/people/Vrymaa/sounds/805466/"
  },
  {
    "id": "thunder",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "wind",
    "category": "forest",
    "ready": true,
    "synthetic": false,
    "src": "sounds/wind.ogg",
    "sourceUrl": "https://github.com/Lelio88/dewdrop/blob/main/CREDITS.md"
  },
  {
    "id": "winrain",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "rain_soft",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://freesound.org/people/joedeshon/sounds/430765/"
  },
  {
    "id": "rain_downpour",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "waves_calm",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "birds_dawn",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://freesound.org/people/Resaural/sounds/634511/"
  },
  {
    "id": "fire_hearth",
    "category": "warm",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://freesound.org/people/uniuniversal/sounds/620007/"
  },
  {
    "id": "stream_brook",
    "category": "water",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "night_crickets",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  },
  {
    "id": "meadow",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cambodia_birds.ogg"
  },
  {
    "id": "coastal_wind",
    "category": "forest",
    "ready": false,
    "synthetic": false,
    "src": null,
    "sourceUrl": null
  }
].map(item=>Object.freeze(item)));
const messages=Object.freeze({
  "en": {
    "heading": "Nature sound library",
    "pending": "Awaiting verified recording",
    "ready": "Playable now",
    "of": "of"
  },
  "ar": {
    "heading": "مكتبة أصوات الطبيعة",
    "pending": "بانتظار تسجيل أصلي موثّق",
    "ready": "متاح للتشغيل",
    "of": "من"
  },
  "es": {
    "heading": "Biblioteca de sonidos naturales",
    "pending": "Pendiente de grabación verificada",
    "ready": "Disponible",
    "of": "de"
  },
  "zh": {
    "heading": "自然声音库",
    "pending": "等待验证真实录音",
    "ready": "可播放",
    "of": "共"
  },
  "hi": {
    "heading": "प्रकृति ध्वनि संग्रह",
    "pending": "सत्यापित रिकॉर्डिंग की प्रतीक्षा",
    "ready": "चलाने के लिए उपलब्ध",
    "of": "में से"
  },
  "fr": {
    "heading": "Bibliothèque des sons naturels",
    "pending": "En attente d’un enregistrement vérifié",
    "ready": "Disponible",
    "of": "sur"
  },
  "de": {
    "heading": "Naturklang-Bibliothek",
    "pending": "Wartet auf geprüfte Originalaufnahme",
    "ready": "Abspielbar",
    "of": "von"
  },
  "ru": {
    "heading": "Библиотека звуков природы",
    "pending": "Ожидается проверенная запись",
    "ready": "Доступно",
    "of": "из"
  },
  "pt": {
    "heading": "Biblioteca de sons da natureza",
    "pending": "Aguardando gravação verificada",
    "ready": "Disponível",
    "of": "de"
  },
  "ja": {
    "heading": "自然音ライブラリ",
    "pending": "確認済みの実録音を準備中",
    "ready": "再生可能",
    "of": "全"
  },
  "id": {
    "heading": "Perpustakaan suara alam",
    "pending": "Menunggu rekaman terverifikasi",
    "ready": "Siap diputar",
    "of": "dari"
  },
  "tr": {
    "heading": "Doğa sesleri kitaplığı",
    "pending": "Doğrulanmış kayıt bekleniyor",
    "ready": "Çalınabilir",
    "of": "/"
  },
  "ko": {
    "heading": "자연 소리 라이브러리",
    "pending": "검증된 실제 녹음 대기 중",
    "ready": "재생 가능",
    "of": "총"
  },
  "vi": {
    "heading": "Thư viện âm thanh thiên nhiên",
    "pending": "Đang chờ bản ghi được xác minh",
    "ready": "Có thể phát",
    "of": "trên"
  },
  "it": {
    "heading": "Libreria di suoni naturali",
    "pending": "In attesa di registrazione verificata",
    "ready": "Disponibile",
    "of": "su"
  },
  "bn": {
    "heading": "প্রকৃতির শব্দসম্ভার",
    "pending": "যাচাইকৃত রেকর্ডিংয়ের অপেক্ষায়",
    "ready": "চালানো যাবে",
    "of": "এর মধ্যে"
  },
  "ur": {
    "heading": "قدرتی آوازوں کی لائبریری",
    "pending": "تصدیق شدہ ریکارڈنگ کا انتظار",
    "ready": "چلانے کے لیے دستیاب",
    "of": "میں سے"
  },
  "fa": {
    "heading": "کتابخانه صداهای طبیعت",
    "pending": "در انتظار ضبط تأییدشده",
    "ready": "قابل پخش",
    "of": "از"
  },
  "pl": {
    "heading": "Biblioteka dźwięków natury",
    "pending": "Oczekiwanie na zweryfikowane nagranie",
    "ready": "Dostępne",
    "of": "z"
  },
  "nl": {
    "heading": "Bibliotheek met natuurgeluiden",
    "pending": "Wacht op geverifieerde opname",
    "ready": "Afspeelbaar",
    "of": "van"
  }
});
const newLabels=Object.freeze({
  "en": {
    "rain_soft": "Light rain",
    "rain_downpour": "Downpour",
    "waves_calm": "Calm waves",
    "birds_dawn": "Dawn birds",
    "fire_hearth": "Hearth fire",
    "stream_brook": "Babbling brook",
    "night_crickets": "Night crickets",
    "meadow": "Meadow sounds",
    "coastal_wind": "Coastal breeze"
  },
  "ar": {
    "rain_soft": "مطر خفيف",
    "rain_downpour": "مطر غزير",
    "waves_calm": "أمواج هادئة",
    "birds_dawn": "عصافير الفجر",
    "fire_hearth": "نار المدفأة",
    "stream_brook": "خرير الجدول",
    "night_crickets": "صراصير الليل",
    "meadow": "أصوات المروج",
    "coastal_wind": "نسيم الساحل"
  },
  "es": {
    "rain_soft": "Lluvia suave",
    "rain_downpour": "Aguacero",
    "waves_calm": "Olas suaves",
    "birds_dawn": "Aves al amanecer",
    "fire_hearth": "Fuego de chimenea",
    "stream_brook": "Arroyo",
    "night_crickets": "Grillos nocturnos",
    "meadow": "Sonidos del prado",
    "coastal_wind": "Brisa costera"
  },
  "zh": {
    "rain_soft": "小雨",
    "rain_downpour": "暴雨",
    "waves_calm": "平静的海浪",
    "birds_dawn": "黎明鸟鸣",
    "fire_hearth": "壁炉火声",
    "stream_brook": "潺潺溪流",
    "night_crickets": "夜晚蟋蟀",
    "meadow": "草地声音",
    "coastal_wind": "海岸微风"
  },
  "hi": {
    "rain_soft": "हल्की बारिश",
    "rain_downpour": "मूसलाधार बारिश",
    "waves_calm": "शांत लहरें",
    "birds_dawn": "भोर के पक्षी",
    "fire_hearth": "अंगीठी की आग",
    "stream_brook": "कलकल झरना",
    "night_crickets": "रात के झींगुर",
    "meadow": "घास के मैदान की आवाज़ें",
    "coastal_wind": "तटीय हवा"
  },
  "fr": {
    "rain_soft": "Pluie légère",
    "rain_downpour": "Averse",
    "waves_calm": "Vagues calmes",
    "birds_dawn": "Oiseaux à l’aube",
    "fire_hearth": "Feu de cheminée",
    "stream_brook": "Ruisseau",
    "night_crickets": "Grillons nocturnes",
    "meadow": "Sons de prairie",
    "coastal_wind": "Brise côtière"
  },
  "de": {
    "rain_soft": "Leichter Regen",
    "rain_downpour": "Starkregen",
    "waves_calm": "Ruhige Wellen",
    "birds_dawn": "Vögel am Morgen",
    "fire_hearth": "Kaminfeuer",
    "stream_brook": "Plätschernder Bach",
    "night_crickets": "Nächtliche Grillen",
    "meadow": "Wiesengeräusche",
    "coastal_wind": "Küstenbrise"
  },
  "ru": {
    "rain_soft": "Лёгкий дождь",
    "rain_downpour": "Ливень",
    "waves_calm": "Спокойные волны",
    "birds_dawn": "Утренние птицы",
    "fire_hearth": "Огонь камина",
    "stream_brook": "Журчащий ручей",
    "night_crickets": "Ночные сверчки",
    "meadow": "Звуки луга",
    "coastal_wind": "Прибрежный бриз"
  },
  "pt": {
    "rain_soft": "Chuva leve",
    "rain_downpour": "Chuva forte",
    "waves_calm": "Ondas calmas",
    "birds_dawn": "Pássaros ao amanhecer",
    "fire_hearth": "Lareira",
    "stream_brook": "Riacho",
    "night_crickets": "Grilos noturnos",
    "meadow": "Sons do prado",
    "coastal_wind": "Brisa costeira"
  },
  "ja": {
    "rain_soft": "小雨",
    "rain_downpour": "豪雨",
    "waves_calm": "穏やかな波",
    "birds_dawn": "夜明けの鳥",
    "fire_hearth": "暖炉の火",
    "stream_brook": "小川のせせらぎ",
    "night_crickets": "夜のコオロギ",
    "meadow": "草原の音",
    "coastal_wind": "海岸のそよ風"
  },
  "id": {
    "rain_soft": "Hujan ringan",
    "rain_downpour": "Hujan lebat",
    "waves_calm": "Ombak tenang",
    "birds_dawn": "Burung pagi",
    "fire_hearth": "Api perapian",
    "stream_brook": "Aliran sungai kecil",
    "night_crickets": "Jangkrik malam",
    "meadow": "Suara padang rumput",
    "coastal_wind": "Angin pantai"
  },
  "tr": {
    "rain_soft": "Hafif yağmur",
    "rain_downpour": "Sağanak yağmur",
    "waves_calm": "Sakin dalgalar",
    "birds_dawn": "Şafak kuşları",
    "fire_hearth": "Şömine ateşi",
    "stream_brook": "Şırıldayan dere",
    "night_crickets": "Gece cırcır böcekleri",
    "meadow": "Çayır sesleri",
    "coastal_wind": "Kıyı meltemi"
  },
  "ko": {
    "rain_soft": "가벼운 비",
    "rain_downpour": "폭우",
    "waves_calm": "잔잔한 파도",
    "birds_dawn": "새벽 새소리",
    "fire_hearth": "벽난로 불",
    "stream_brook": "시냇물",
    "night_crickets": "밤의 귀뚜라미",
    "meadow": "초원 소리",
    "coastal_wind": "해안 산들바람"
  },
  "vi": {
    "rain_soft": "Mưa nhẹ",
    "rain_downpour": "Mưa lớn",
    "waves_calm": "Sóng êm",
    "birds_dawn": "Chim lúc bình minh",
    "fire_hearth": "Lửa lò sưởi",
    "stream_brook": "Suối róc rách",
    "night_crickets": "Dế đêm",
    "meadow": "Âm thanh đồng cỏ",
    "coastal_wind": "Gió biển nhẹ"
  },
  "it": {
    "rain_soft": "Pioggia leggera",
    "rain_downpour": "Acquazzone",
    "waves_calm": "Onde calme",
    "birds_dawn": "Uccelli all’alba",
    "fire_hearth": "Fuoco del camino",
    "stream_brook": "Ruscello",
    "night_crickets": "Grilli notturni",
    "meadow": "Suoni del prato",
    "coastal_wind": "Brezza marina"
  },
  "bn": {
    "rain_soft": "হালকা বৃষ্টি",
    "rain_downpour": "মুষলধারে বৃষ্টি",
    "waves_calm": "শান্ত ঢেউ",
    "birds_dawn": "ভোরের পাখি",
    "fire_hearth": "অগ্নিকুণ্ডের আগুন",
    "stream_brook": "ঝরনার কলকল",
    "night_crickets": "রাতের ঝিঁঝিঁ",
    "meadow": "তৃণভূমির শব্দ",
    "coastal_wind": "উপকূলীয় বাতাস"
  },
  "ur": {
    "rain_soft": "ہلکی بارش",
    "rain_downpour": "موسلا دھار بارش",
    "waves_calm": "پرسکون لہریں",
    "birds_dawn": "صبح کے پرندے",
    "fire_hearth": "آتش دان کی آگ",
    "stream_brook": "بہتی ندی",
    "night_crickets": "رات کے جھینگر",
    "meadow": "گھاس زار کی آوازیں",
    "coastal_wind": "ساحلی ہوا"
  },
  "fa": {
    "rain_soft": "باران ملایم",
    "rain_downpour": "رگبار",
    "waves_calm": "موج‌های آرام",
    "birds_dawn": "پرندگان سحر",
    "fire_hearth": "آتش شومینه",
    "stream_brook": "جویبار",
    "night_crickets": "جیرجیرک‌های شب",
    "meadow": "صدای چمنزار",
    "coastal_wind": "نسیم ساحلی"
  },
  "pl": {
    "rain_soft": "Lekki deszcz",
    "rain_downpour": "Ulewa",
    "waves_calm": "Spokojne fale",
    "birds_dawn": "Ptaki o świcie",
    "fire_hearth": "Ogień w kominku",
    "stream_brook": "Strumyk",
    "night_crickets": "Nocne świerszcze",
    "meadow": "Dźwięki łąki",
    "coastal_wind": "Nadmorska bryza"
  },
  "nl": {
    "rain_soft": "Lichte regen",
    "rain_downpour": "Stortregen",
    "waves_calm": "Rustige golven",
    "birds_dawn": "Vogels bij dageraad",
    "fire_hearth": "Open haard",
    "stream_brook": "Kabbelende beek",
    "night_crickets": "Nachtkrekels",
    "meadow": "Weidegeluiden",
    "coastal_wind": "Zeebries"
  }
});
function availableIds(approved){return new Set(entries.filter(e=>e.ready&&approved&&approved.has(e.id)).map(e=>e.id));}
function listFor(category,approved){const allow=availableIds(approved);return entries.filter(e=>category==='all'||e.category===category).map(e=>Object.freeze({...e,available:allow.has(e.id)}));}
function render(category,lang,legacyLabels,approved){
 if(typeof document==='undefined')return;
 const host=document.getElementById('natureLibraryV2');if(!host)return;
 const language=messages[lang]?lang:'en', m=messages[language];
 const rows=listFor(category,approved||new Set());const live=rows.filter(e=>e.available).length;
 host.replaceChildren();
 const heading=document.createElement('h3');heading.className='nature-library-heading';heading.textContent=m.heading;
 const count=document.createElement('bdi');count.dir='ltr';count.className='nature-library-count';count.textContent=String(live)+' / '+String(rows.length);
 host.append(heading,count);
 const list=document.createElement('div');list.className='nature-library-list';list.setAttribute('role','list');
 for(const entry of rows){
   const item=document.createElement('div');item.className='nature-library-row'+(entry.available?' is-available':' is-pending');item.setAttribute('role','listitem');
   const name=document.createElement('span');name.className='nature-library-name';
   name.textContent=(legacyLabels&&legacyLabels[entry.id])||(newLabels[language]&&newLabels[language][entry.id])||(newLabels.en[entry.id])||entry.id;
   const state=document.createElement('span');state.className='nature-library-state';state.textContent=entry.available?m.ready:m.pending;
   item.append(name,state);list.append(item);
 }
 host.append(list);
}
return Object.freeze({entries,messages,newLabels,availableIds,listFor,render});
});
