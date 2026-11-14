/**
 * DEEP FOCUS — Flashcards UI (section #sec-flashcards).
 * All user text is inserted with textContent / value (never parsed as HTML). No inline handlers.
 * Strings: English + Arabic are provided here; every other app language shows English until reviewed
 * translations are supplied (no machine-guessed translations). Numbers are always Western digits.
 */
(function (root) {
  'use strict';

  var S = {
    en: {
      title: 'Flashcards', search: 'Search cards', add: 'Add card', settings: 'Settings', back: 'Back', save: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit', undo: 'Undo',
      total: 'Total', due: 'Due today', learned: 'Learned', review: 'Needs review', studyNow: 'Study now', continueSession: 'Continue last session', myDecks: 'My decks', progress: 'Progress',
      addFirst: 'Add your first card', emptyTitle: 'No cards yet', emptyText: 'Create a card to start. Everything stays on your phone and works offline.',
      allCards: 'All cards', recent: 'Recently added', dueDeck: 'Due for review', favorites: 'Favorites', newDeck: 'New deck', deckName: 'Deck name', deckDesc: 'Description',
      rename: 'Rename', archive: 'Archive', restore: 'Restore', duplicate: 'Duplicate', archived: 'Archived', exportCsv: 'Export CSV', cards: 'cards', noCards: 'No cards here yet.',
      front: 'Front (original)', back: 'Back (translation / answer)', srcLang: 'Source language', tgtLang: 'Target language', example: 'Example', exampleTr: 'Example translation', pron: 'Pronunciation notes', notes: 'Personal notes', tags: 'Tags (comma separated)', deck: 'Deck', type: 'Card type', more: 'More fields',
      tWord: 'Word → Translation', tQa: 'Question → Answer', tTerm: 'Term → Definition', tConcept: 'Concept → Explanation', tCustom: 'Custom front → back',
      dupWarn: 'A card with the same front already exists in this deck.', saveAnyway: 'Save anyway', saved: 'Saved', deleted: 'Card deleted', confirmDelete: 'Delete this card? You can undo right after.',
      changedFlag: 'This card changed a lot, so it is due again for review.', reveal: 'Reveal answer', again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy', next: 'Next',
      playFront: 'Play original', playBack: 'Play translation', stop: 'Stop', replay: 'Replay', listening: 'Listening', repeat: 'Repetitions', speed: 'Speech speed', pitch: 'Pitch (optional)',
      modeClassic: 'Classic', modeReverse: 'Reverse', modeBoth: 'Both directions', modeListening: 'Listening', modePron: 'Pronunciation', modeWriting: 'Writing', modeQuick: 'Quick review', modeRandom: 'Random practice', modeCustom: 'Custom session',
      yourAnswer: 'Type your answer', correct: 'Matches', different: 'Different from the stored answer', done: 'Session complete', reviewed: 'Reviewed', accuracy: 'Accuracy', nothingDue: 'Nothing is due right now.',
      dailyGoal: 'Daily goal', streak: 'Study streak', days: 'days', week: 'This week', consistency: 'Consistency', details: 'Detailed progress', uniqueToday: 'Unique cards today', overdue: 'Overdue', difficult: 'Difficult cards', studyTime: 'Study time (min)', newCards: 'New cards',
      ttsTitle: 'Pronunciation', ttsUnavailable: 'Text-to-speech is not available in this build.', ttsTest: 'Test speech', ttsLanguage: 'Language', ttsVoice: 'Voice', ttsEngine: 'Speech engine (device)', offlineOnly: 'Offline voices only', preferMale: 'Prefer a confirmed male voice',
      genderUnknown: 'gender unknown', male: 'male (confirmed)', female: 'female (confirmed)', needsNet: 'needs network', notInstalled: 'not installed', noMale: 'This device does not confirm a male voice for this language.', autoVoice: 'Automatic', actualSpeed: 'Configured speed',
      speakSide: 'Spoken side', sideFront: 'Original', sideBack: 'Translation', direction: 'Study direction', import: 'Import', importHelp: 'Paste CSV, TSV or JSON text, or choose a file.', choose: 'Choose file', preview: 'Preview', importNow: 'Import', importOk: 'Imported', invalid: 'Invalid', duplicates: 'Duplicates', skipDup: 'Skip duplicates',
      storage: 'Storage used', suspend: 'Suspend', resume: 'Resume', fav: 'Favorite', filter: 'Filter', sort: 'Sort', cantDeleteDeck: 'This deck has cards. Archive it instead.', error: 'Something went wrong', storageFull: 'Storage is full. Nothing was changed.', language: 'Language', loadMore: 'Load more', copied: 'Copied to clipboard', exportShared: 'Export started', installVoice: 'Install the voice data in Android Settings > System > Languages > Text-to-speech output.',
      defaultDeck_: '', defaultDeckName: 'My cards', noDecks: 'Create a deck first.', end: 'End session',
      modeChoice: 'Multiple choice', modeCloze: 'Fill in the blank', modeMixed: 'Mixed practice', modeMistakes: 'Mistake review', almost: 'Almost — check the spelling', needFour: 'Needs at least 4 cards with different answers in the deck.', noBlank: 'This card has no usable example sentence.',
      timerUse: 'Use the Deep Focus timer', timerMin: 'minutes', timerOn: 'Timer', timerNote: 'Study time is recorded by the Deep Focus timer when its session completes. Flashcards never adds time itself.', timerBusy: 'A timer session is already active; it will keep running.', repeatMistakes: 'Repeat mistakes', textSize: 'Card text size', small: 'Small', medium: 'Medium', large: 'Large', showExamples: 'Show examples', defaultMode: 'Default study mode', defaultDeck: 'Default deck', langFilter: 'Language (e.g. de)', allStates: 'All', mapColumn: 'Column for', skipCol: 'None', playExample: 'Play example', importing: 'Importing…', correctAnswers: 'Correct', incorrectAnswers: 'Incorrect'
    },
    ar: {
      title: 'البطاقات التعليمية', search: 'ابحث في البطاقات', add: 'إضافة بطاقة', settings: 'الإعدادات', back: 'رجوع', save: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل', undo: 'تراجع',
      total: 'المجموع', due: 'مستحقة اليوم', learned: 'تم تعلمها', review: 'تحتاج مراجعة', studyNow: 'ابدأ الدراسة', continueSession: 'متابعة آخر جلسة', myDecks: 'مجموعاتي', progress: 'التقدم',
      addFirst: 'أضف أول بطاقة', emptyTitle: 'لا توجد بطاقات بعد', emptyText: 'أنشئ بطاقة للبدء. كل شيء يبقى على هاتفك ويعمل بدون إنترنت.',
      allCards: 'كل البطاقات', recent: 'أضيفت مؤخراً', dueDeck: 'مستحقة للمراجعة', favorites: 'المفضلة', newDeck: 'مجموعة جديدة', deckName: 'اسم المجموعة', deckDesc: 'الوصف',
      rename: 'إعادة تسمية', archive: 'أرشفة', restore: 'استعادة', duplicate: 'نسخ', archived: 'المؤرشفة', exportCsv: 'تصدير CSV', cards: 'بطاقة', noCards: 'لا توجد بطاقات هنا بعد.',
      front: 'الوجه الأمامي (الأصل)', back: 'الوجه الخلفي (الترجمة / الإجابة)', srcLang: 'لغة المصدر', tgtLang: 'لغة الهدف', example: 'مثال', exampleTr: 'ترجمة المثال', pron: 'ملاحظات النطق', notes: 'ملاحظات شخصية', tags: 'الوسوم (مفصولة بفواصل)', deck: 'المجموعة', type: 'نوع البطاقة', more: 'حقول إضافية',
      tWord: 'كلمة ← ترجمة', tQa: 'سؤال ← إجابة', tTerm: 'مصطلح ← تعريف', tConcept: 'مفهوم ← شرح', tCustom: 'وجه مخصص ← خلفية',
      dupWarn: 'توجد بطاقة بنفس الوجه الأمامي في هذه المجموعة.', saveAnyway: 'احفظ رغم ذلك', saved: 'تم الحفظ', deleted: 'تم حذف البطاقة', confirmDelete: 'حذف هذه البطاقة؟ يمكنك التراجع مباشرة بعد ذلك.',
      changedFlag: 'تغيّرت هذه البطاقة كثيراً، لذلك أصبحت مستحقة للمراجعة مجدداً.', reveal: 'إظهار الإجابة', again: 'مرة أخرى', hard: 'صعب', good: 'جيد', easy: 'سهل', next: 'التالي',
      playFront: 'نطق الأصل', playBack: 'نطق الترجمة', stop: 'إيقاف', replay: 'إعادة', listening: 'الاستماع', repeat: 'عدد التكرارات', speed: 'سرعة النطق', pitch: 'درجة الصوت (اختياري)',
      modeClassic: 'كلاسيكي', modeReverse: 'عكسي', modeBoth: 'الاتجاهان', modeListening: 'استماع', modePron: 'نطق', modeWriting: 'كتابة', modeQuick: 'مراجعة سريعة', modeRandom: 'تدريب عشوائي', modeCustom: 'جلسة مخصصة',
      yourAnswer: 'اكتب إجابتك', correct: 'مطابقة', different: 'تختلف عن الإجابة المحفوظة', done: 'اكتملت الجلسة', reviewed: 'تمت مراجعتها', accuracy: 'الدقة', nothingDue: 'لا شيء مستحق الآن.',
      dailyGoal: 'الهدف اليومي', streak: 'أيام الدراسة المتتالية', days: 'يوم', week: 'هذا الأسبوع', consistency: 'الانتظام', details: 'تفاصيل التقدم', uniqueToday: 'بطاقات مختلفة اليوم', overdue: 'متأخرة', difficult: 'بطاقات صعبة', studyTime: 'وقت الدراسة (دقيقة)', newCards: 'بطاقات جديدة',
      ttsTitle: 'النطق', ttsUnavailable: 'خاصية النطق غير متوفرة في هذا الإصدار.', ttsTest: 'تجربة النطق', ttsLanguage: 'اللغة', ttsVoice: 'الصوت', ttsEngine: 'محرك النطق (الجهاز)', offlineOnly: 'أصوات بدون إنترنت فقط', preferMale: 'فضّل صوتاً ذكورياً مؤكداً',
      genderUnknown: 'الجنس غير معروف', male: 'ذكر (مؤكد)', female: 'أنثى (مؤكد)', needsNet: 'يحتاج إنترنت', notInstalled: 'غير مثبت', noMale: 'لا يؤكد هذا الجهاز وجود صوت ذكوري لهذه اللغة.', autoVoice: 'تلقائي', actualSpeed: 'السرعة المضبوطة',
      speakSide: 'الوجه المنطوق', sideFront: 'الأصل', sideBack: 'الترجمة', direction: 'اتجاه الدراسة', import: 'استيراد', importHelp: 'الصق نص CSV أو TSV أو JSON، أو اختر ملفاً.', choose: 'اختر ملفاً', preview: 'معاينة', importNow: 'استيراد', importOk: 'تم استيراد', invalid: 'غير صالحة', duplicates: 'مكررة', skipDup: 'تخطَّ المكررات',
      storage: 'المساحة المستخدمة', suspend: 'تعليق', resume: 'استئناف', fav: 'مفضلة', filter: 'تصفية', sort: 'ترتيب', cantDeleteDeck: 'تحتوي هذه المجموعة على بطاقات. أرشفها بدلاً من حذفها.', error: 'حدث خطأ ما', storageFull: 'المساحة ممتلئة. لم يتغير شيء.', language: 'اللغة', loadMore: 'عرض المزيد', copied: 'تم النسخ إلى الحافظة', exportShared: 'بدأ التصدير', installVoice: 'ثبّت بيانات الصوت من إعدادات أندرويد > النظام > اللغات > إخراج تحويل النص إلى كلام.',
      defaultDeck_: '', defaultDeckName: 'بطاقاتي', noDecks: 'أنشئ مجموعة أولاً.', end: 'إنهاء الجلسة',
      modeChoice: 'اختيار من متعدد', modeCloze: 'أكمل الفراغ', modeMixed: 'تدريب مختلط', modeMistakes: 'مراجعة الأخطاء', almost: 'تقريباً — راجع الإملاء', needFour: 'تحتاج المجموعة إلى 4 بطاقات على الأقل بإجابات مختلفة.', noBlank: 'لا تحتوي هذه البطاقة على جملة مثال صالحة.',
      timerUse: 'استخدم مؤقت Deep Focus', timerMin: 'دقيقة', timerOn: 'المؤقت', timerNote: 'يسجَّل وقت الدراسة بواسطة مؤقت Deep Focus عند اكتمال جلسته. لا تضيف البطاقات أي وقت بنفسها.', timerBusy: 'توجد جلسة مؤقت نشطة بالفعل وستستمر.', repeatMistakes: 'أعد الأخطاء', textSize: 'حجم نص البطاقة', small: 'صغير', medium: 'متوسط', large: 'كبير', showExamples: 'إظهار الأمثلة', defaultMode: 'نمط الدراسة الافتراضي', defaultDeck: 'المجموعة الافتراضية', langFilter: 'اللغة (مثل de)', allStates: 'الكل', mapColumn: 'عمود', skipCol: 'بدون', playExample: 'نطق المثال', importing: 'جارٍ الاستيراد…', correctAnswers: 'صحيحة', incorrectAnswers: 'خاطئة'
    }
  };
  var COMMON_LANGS = ['ar', 'ar-JO', 'de-DE', 'en-GB', 'en-US', 'es-ES', 'fr-FR', 'it-IT', 'pt-BR', 'tr-TR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'hi-IN', 'nl-NL', 'pl-PL', 'sv-SE', 'id-ID', 'bn-BD'];

  var app = null, tts = null, mount = null, state = { view: 'home', deckId: '', filter: null, page: 0, editId: '', study: null, importParsed: null, lastDeleted: '', toast: '' };
  var el = null;

  function lang() { try { var l = (typeof cfg !== 'undefined' && cfg && cfg.lang) ? String(cfg.lang) : 'en'; return S[l] ? l : 'en'; } catch (_) { return 'en'; } }
  function T(k) { var d = S[lang()]; return (d && d[k]) || S.en[k] || k; }
  function N(n) { return String(Math.round(Number(n) || 0)); } // Western digits only

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); });
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else e.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach(function (c) { if (c === null || c === undefined || c === false) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function btn(text, onClick, cls, aria) { return h('button', { type: 'button', class: 'fc-btn ' + (cls || ''), text: text, 'aria-label': aria || text, on: { click: onClick } }); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function toast(msg) { state.toast = msg; var t = mount && mount.querySelector('.fc-toast'); if (t) { t.textContent = msg; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 2600); } }
  function errText(r) { return r && r.code === 'STORAGE_FULL' ? T('storageFull') : (r && r.error) || T('error'); }
  function go(view, extra) { Object.assign(state, { view: view }, extra || {}); stopSpeech(); render(); try { window.scrollTo(0, 0); } catch (_) {} }
  function stopSpeech() { if (tts) tts.stop(); }

  function stat(label, value) { return h('div', { class: 'fc-stat' }, [h('strong', { text: N(value) }), h('span', { text: label })]); }
  function field(label, input, hint) { return h('label', { class: 'fc-field' }, [h('span', { text: label }), input, hint ? h('small', { text: hint }) : null]); }
  function text(label, id, value, o) { o = o || {}; return field(label, h(o.multi ? 'textarea' : 'input', { id: id, type: o.multi ? null : 'text', dir: 'auto', rows: o.multi ? 2 : null, maxlength: 2000, value: value || '', list: o.list || null, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' })); }
  function select(label, id, options, value) {
    var s = h('select', { id: id }, options.map(function (o) { return h('option', { value: o[0], text: o[1] }); })); s.value = value; return field(label, s);
  }
  function val(id) { var n = mount.querySelector('#' + id); return n ? n.value : ''; }

  // ---------- views ----------
  function header(title, backTo, actions) {
    return h('div', { class: 'fc-head' }, [
      backTo ? btn('‹', function () { go(backTo); }, 'fc-icon', T('back')) : null,
      h('h2', { text: title }), h('div', { class: 'fc-actions' }, actions || [])
    ]);
  }
  function ensureDeck() {
    var decks = app.listDecks(); if (decks.length) return decks[0];
    var r = app.createDeck({ name: T('defaultDeckName') }); return r.ok ? r.deck : null;
  }
  function homeView() {
    var st = app.stats(), decks = app.listDecks(), root = h('div', { class: 'fc-view' });
    root.appendChild(header(T('title'), null, [btn('⚙', function () { go('settings'); }, 'fc-icon', T('settings')), btn('+', function () { go('edit', { editId: '' }); }, 'fc-icon primary', T('add'))]));
    var s = h('input', { type: 'search', class: 'fc-search', dir: 'auto', placeholder: T('search'), 'aria-label': T('search'), maxlength: 100 });
    s.addEventListener('keydown', function (e) { if (e.key === 'Enter' && s.value.trim()) go('list', { filter: { q: s.value.trim() }, page: 0 }); });
    root.appendChild(s);
    if (st.total === 0) {
      root.appendChild(h('div', { class: 'fc-empty' }, [h('h3', { text: T('emptyTitle') }), h('p', { text: T('emptyText') }), btn(T('addFirst'), function () { go('edit', { editId: '' }); }, 'primary big')]));
      root.appendChild(btn(T('import'), function () { go('import'); }, 'ghost'));
      return root;
    }
    root.appendChild(h('div', { class: 'fc-stats' }, [stat(T('total'), st.total), stat(T('due'), st.due), stat(T('learned'), st.learned), stat(T('review'), st.overdue)]));
    var quick = h('div', { class: 'fc-quick' }, [btn(T('studyNow'), function () { go('studyStart'); }, 'primary big'), btn(T('add'), function () { go('edit', { editId: '' }); }, '')]);
    if (app.resumeSession()) quick.appendChild(btn(T('continueSession'), function () { resumeStudy(); }, ''));
    root.appendChild(quick);
    var list = h('div', { class: 'fc-decks' });
    [['all', T('allCards'), st.total, {}], ['recent', T('recent'), '', { sort: 'recent' }], ['due', T('dueDeck'), st.due, { due: true }], ['fav', T('favorites'), st.favorites, { favorites: true }]].forEach(function (d) {
      list.appendChild(h('button', { type: 'button', class: 'fc-deck virtual', on: { click: function () { go('list', { deckId: '', filter: d[3], page: 0 }); } } }, [h('span', { text: d[1] }), h('small', { text: d[2] === '' ? '' : N(d[2]) })]));
    });
    decks.forEach(function (d) {
      var ds = app.deckStats(d.id);
      list.appendChild(h('button', { type: 'button', class: 'fc-deck', style: 'border-inline-start-color:' + d.color, on: { click: function () { go('deck', { deckId: d.id }); } } }, [h('span', { text: d.name, dir: 'auto' }), h('small', { text: N(ds.total) + ' ' + T('cards') + ' · ' + N(ds.due) + ' ' + T('due') })]));
    });
    root.appendChild(h('h3', { text: T('myDecks') })); root.appendChild(list);
    root.appendChild(btn('+ ' + T('newDeck'), function () { deckForm(null); }, 'ghost'));
    var bars = h('div', { class: 'fc-bars', role: 'img', 'aria-label': T('week') });
    var maxv = Math.max.apply(null, st.weekly.map(function (w) { return w.reviewed; }).concat([1]));
    st.weekly.forEach(function (w) { bars.appendChild(h('i', { style: 'height:' + Math.max(4, Math.round(w.reviewed * 48 / maxv)) + 'px', title: N(w.reviewed) })); });
    root.appendChild(h('div', { class: 'fc-progress' }, [h('h3', { text: T('progress') }),
      h('div', { class: 'fc-goal' }, [h('div', { class: 'fc-goalbar' }, [h('i', { style: 'width:' + st.goalProgress + '%' })]), h('small', { text: T('dailyGoal') + ': ' + N(st.reviewedToday) + ' / ' + N(st.dailyGoal) })]),
      bars, h('small', { text: T('streak') + ': ' + N(st.streak) + ' ' + T('days') + ' · ' + T('consistency') + ': ' + N(st.consistency) + '%' }),
      btn(T('details'), function () { go('stats'); }, 'ghost')]));
    return root;
  }
  function deckForm(deck) {
    var box = h('div', { class: 'fc-modal' }, [h('div', { class: 'fc-sheet' }, [
      h('h3', { text: deck ? T('rename') : T('newDeck') }), text(T('deckName'), 'fcDeckName', deck ? deck.name : ''), text(T('deckDesc'), 'fcDeckDesc', deck ? deck.description : '', { multi: true }),
      h('div', { class: 'fc-row' }, [btn(T('cancel'), function () { box.remove(); }), btn(T('save'), function () {
        var f = { name: val('fcDeckName'), description: val('fcDeckDesc') };
        var r = deck ? app.updateDeck(deck.id, f) : app.createDeck(f);
        if (!r.ok) return toast(errText(r)); box.remove(); render();
      }, 'primary')])])]);
    mount.appendChild(box); var i = box.querySelector('input'); if (i) i.focus();
  }
  function cardRow(c, onChange) {
    var row = h('div', { class: 'fc-card-row' }, [
      h('div', { class: 'fc-card-text' }, [h('strong', { text: c.frontText, dir: 'auto' }), h('span', { text: c.backText, dir: 'auto' })]),
      h('div', { class: 'fc-actions' }, [
        btn(c.favorite ? '★' : '☆', function () { app.toggleFavorite(c.id); onChange(); }, 'fc-icon', T('fav')),
        btn('🔊', function () { speakCard(c, state.side || app.getPrefs().speakSide); }, 'fc-icon', T('playFront')),
        btn('✎', function () { go('edit', { editId: c.id }); }, 'fc-icon', T('edit'))])]);
    return row;
  }
  function listView(deckId) {
    var f = Object.assign({}, state.filter || {}); var q = f.q || ''; if (deckId) f.deckId = deckId;
    var res = app.search(q, Object.assign({}, f, { limit: 50, offset: state.page * 50 })), root = h('div', { class: 'fc-view' });
    root.appendChild(header(deckId ? (deckName(deckId)) : (q ? q : T('allCards')), deckId ? 'deck' : 'home', [btn('+', function () { go('edit', { editId: '', deckId: deckId }); }, 'fc-icon primary', T('add'))]));
    var fb = h('div', { class: 'fc-row' });
    var fs = h('select', { 'aria-label': T('filter') }, [['', T('allStates')], ['due', T('dueDeck')], ['favorites', T('favorites')], ['difficult', T('difficult')]].map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
    fs.value = state.filter && state.filter.due ? 'due' : (state.filter && state.filter.favorites ? 'favorites' : (state.filter && state.filter.difficult ? 'difficult' : ''));
    fs.addEventListener('change', function () { var n = Object.assign({}, state.filter || {}); delete n.due; delete n.favorites; delete n.difficult; if (fs.value) n[fs.value] = true; state.filter = n; state.page = 0; render(); });
    var fl = h('input', { type: 'text', placeholder: T('langFilter'), 'aria-label': T('langFilter'), dir: 'ltr', maxlength: 35, value: (state.filter && state.filter.language) || '' });
    fl.addEventListener('change', function () { var n = Object.assign({}, state.filter || {}); if (fl.value.trim()) n.language = fl.value.trim(); else delete n.language; state.filter = n; state.page = 0; render(); });
    fb.appendChild(fs); fb.appendChild(fl); root.appendChild(fb);
    root.appendChild(h('small', { text: N(res.total) + ' ' + T('cards') }));
    if (!res.items.length) root.appendChild(h('p', { class: 'fc-muted', text: T('noCards') }));
    res.items.forEach(function (c) { root.appendChild(cardRow(c, render)); });
    var nav = h('div', { class: 'fc-row' });
    if (state.page > 0) nav.appendChild(btn('‹', function () { state.page--; render(); }, '', T('back')));
    if ((state.page + 1) * 50 < res.total) nav.appendChild(btn(T('loadMore'), function () { state.page++; render(); }));
    root.appendChild(nav);
    return root;
  }
  function deckName(id) { var d = app.listDecks({ includeArchived: true }).filter(function (x) { return x.id === id; })[0]; return d ? d.name : ''; }
  function deckView() {
    var d = app.listDecks({ includeArchived: true }).filter(function (x) { return x.id === state.deckId; })[0];
    if (!d) return homeView();
    var st = app.deckStats(d.id), root = h('div', { class: 'fc-view' });
    root.appendChild(header(d.name, 'home', [btn('+', function () { go('edit', { editId: '', deckId: d.id }); }, 'fc-icon primary', T('add'))]));
    if (d.description) root.appendChild(h('p', { class: 'fc-muted', text: d.description, dir: 'auto' }));
    root.appendChild(h('div', { class: 'fc-stats' }, [stat(T('total'), st.total), stat(T('due'), st.due), stat(T('newCards'), st.new), stat(T('learned'), st.learned)]));
    root.appendChild(h('div', { class: 'fc-quick' }, [btn(T('studyNow'), function () { go('studyStart', { deckId: d.id }); }, 'primary big'), btn(T('allCards'), function () { go('list', { filter: {}, page: 0, deckId: d.id }); })]));
    var acts = h('div', { class: 'fc-row wrap' }, [
      btn(T('rename'), function () { deckForm(d); }),
      btn(T('duplicate'), function () { var r = app.duplicateDeck(d.id); toast(r.ok ? T('saved') : errText(r)); render(); }),
      btn(d.archivedAt ? T('restore') : T('archive'), function () { var r = d.archivedAt ? app.restoreDeck(d.id) : app.archiveDeck(d.id); if (r.ok) go('home'); else toast(errText(r)); }),
      btn(T('exportCsv'), function () { exportCsv(d.id); })]);
    root.appendChild(acts);
    return root;
  }
  function editView() {
    var existing = state.editId ? app.getCard(state.editId) : null, deck = ensureDeck();
    if (!deck) return homeView();
    var decks = app.listDecks(), c = existing || { deckId: state.deckId || deck.id, cardType: 'word', frontText: '', backText: '', sourceLanguage: '', targetLanguage: '', exampleText: '', exampleTranslation: '', pronunciationNotes: '', personalNotes: '', tags: [] };
    var root = h('div', { class: 'fc-view' });
    root.appendChild(header(existing ? T('edit') : T('add'), state.deckId && !existing ? 'deck' : 'home'));
    var dl = h('datalist', { id: 'fcLangs' }, COMMON_LANGS.map(function (l) { return h('option', { value: l }); }));
    root.appendChild(dl);
    root.appendChild(select(T('deck'), 'fcDeck', decks.map(function (d) { return [d.id, d.name]; }), c.deckId));
    root.appendChild(select(T('type'), 'fcType', [['word', T('tWord')], ['qa', T('tQa')], ['term', T('tTerm')], ['concept', T('tConcept')], ['custom', T('tCustom')]], c.cardType));
    root.appendChild(text(T('front'), 'fcFront', c.frontText, { multi: true })); root.appendChild(text(T('back'), 'fcBack', c.backText, { multi: true }));
    var more = h('details', { class: 'fc-more' }, [h('summary', { text: T('more') }),
      text(T('srcLang'), 'fcSrc', c.sourceLanguage, { list: 'fcLangs' }), text(T('tgtLang'), 'fcTgt', c.targetLanguage, { list: 'fcLangs' }),
      text(T('example'), 'fcEx', c.exampleText, { multi: true }), text(T('exampleTr'), 'fcExTr', c.exampleTranslation, { multi: true }),
      text(T('pron'), 'fcPron', c.pronunciationNotes), text(T('notes'), 'fcNotes', c.personalNotes, { multi: true }), text(T('tags'), 'fcTags', (c.tags || []).join(', '))]);
    if (existing || c.exampleText || c.sourceLanguage) more.open = true;
    root.appendChild(more);
    var msg = h('p', { class: 'fc-warn', role: 'alert' });
    root.appendChild(msg);
    var saving = false;
    function save(allowDup) {
      if (saving) return; saving = true; // prevents accidental double saves
      var f = { deckId: val('fcDeck'), cardType: val('fcType'), frontText: val('fcFront'), backText: val('fcBack'), sourceLanguage: val('fcSrc').trim(), targetLanguage: val('fcTgt').trim(), exampleText: val('fcEx'), exampleTranslation: val('fcExTr'), pronunciationNotes: val('fcPron'), personalNotes: val('fcNotes'), tags: val('fcTags') };
      var r = existing ? app.updateCard(existing.id, f) : app.addCard(f, { allowDuplicate: !!allowDup });
      saving = false;
      if (!r.ok) {
        msg.textContent = r.code === 'DUPLICATE' ? T('dupWarn') : errText(r);
        if (r.code === 'DUPLICATE') { var again = btn(T('saveAnyway'), function () { save(true); }); msg.appendChild(document.createTextNode(' ')); msg.appendChild(again); }
        return;
      }
      toast(r.needsReview ? T('changedFlag') : T('saved'));
      if (existing) { state.study ? (state.view = 'study', render()) : go(state.deckId ? 'deck' : 'home'); }
      else { state.editId = ''; state.deckId = f.deckId; render(); toast(T('saved')); }
    }
    var row = h('div', { class: 'fc-row' }, [btn(T('cancel'), function () { if (state.study) { state.view = 'study'; render(); } else go(state.deckId ? 'deck' : 'home'); }), btn(T('save'), function () { save(false); }, 'primary')]);
    if (existing) row.appendChild(btn(T('del'), function () { if (root.ownerDocument.defaultView.confirm(T('confirmDelete'))) { var r = app.deleteCard(existing.id); if (r.ok) { toast(T('deleted')); state.lastDeleted = existing.id; go(state.study ? 'study' : 'home'); } } }, 'danger'));
    root.appendChild(row);
    if (state.lastDeleted) root.appendChild(btn(T('undo'), function () { var r = app.undo(); state.lastDeleted = ''; toast(r.ok ? T('saved') : errText(r)); render(); }, 'ghost'));
    return root;
  }

  // ---------- speech ----------
  function langPref(tag) { var p = app.getPrefs(), per = (p.perLanguage && p.perLanguage[tag]) || {}; return { voiceId: per.voiceId || '', rate: per.rate || p.rate, pitch: per.pitch || p.pitch, offlineOnly: per.offlineOnly !== undefined ? per.offlineOnly : p.offlineOnly, repeat: p.repeat }; }
  function speakCard(c, side, repeatOverride) {
    if (!tts || !tts.available()) { toast(T('ttsUnavailable')); return Promise.resolve(); }
    var which = side === 'back' ? 'back' : 'front', textToSay = which === 'back' ? c.backText : c.frontText, tag = (which === 'back' ? c.targetLanguage : c.sourceLanguage) || '';
    if (!tag) { toast(T('srcLang') + '?'); return Promise.resolve(); } // never guess a language
    var p = langPref(tag);
    return tts.speak(textToSay, { language: tag, voiceId: p.voiceId, rate: p.rate, pitch: p.pitch, offlineOnly: p.offlineOnly, repeat: repeatOverride || p.repeat }).then(function (r) {
      if (!r.ok && !r.cancelled) toast(r.code === 'LANGUAGE_UNAVAILABLE' || r.code === 'LANGUAGE_DATA_MISSING' ? T('installVoice') : (r.error || r.code || T('error')));
      return r;
    });
  }

  // ---------- study ----------
  var MODES = [['classic', 'modeClassic'], ['reverse', 'modeReverse'], ['both', 'modeBoth'], ['listening', 'modeListening'], ['pronunciation', 'modePron'], ['writing', 'modeWriting'], ['choice', 'modeChoice'], ['cloze', 'modeCloze'], ['mixed', 'modeMixed'], ['quick', 'modeQuick'], ['random', 'modeRandom'], ['mistakes', 'modeMistakes']];
  function timerGlobals() { try { return { running: typeof timerRunning !== 'undefined' && timerRunning, left: typeof timerLeft !== 'undefined' ? timerLeft : 0, active: typeof timerSessionId !== 'undefined' && !!timerSessionId }; } catch (_) { return null; } }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return N(Math.floor(sec / 60)) + ':' + (sec % 60 < 10 ? '0' : '') + N(sec % 60); }
  // Starts/continues the EXISTING Deep Focus timer. Flashcards keeps no timer and writes no minutes of its own.
  function startDeepFocusTimer(mins) {
    var g = timerGlobals(); if (!g || typeof selectTimerMode !== 'function' || typeof toggleTimerPlay !== 'function') return false;
    if (g.running) { toast(T('timerBusy')); return true; }
    if (g.active) { toggleTimerPlay(); return true; }
    if (selectTimerMode(mins, 'focus') === false) return false;
    toggleTimerPlay(); return true;
  }
  function studyStartView() {
    var root = h('div', { class: 'fc-view' }); root.appendChild(header(T('studyNow'), state.deckId ? 'deck' : 'home'));
    var st = app.deckStats(state.deckId || ''), grid = h('div', { class: 'fc-modes' }), dm = app.getPrefs().defaultMode;
    MODES.forEach(function (m) { grid.appendChild(btn(T(m[1]), function () { beginStudy(m[0], {}); }, m[0] === dm ? 'primary' : '')); });
    root.appendChild(h('small', { text: N(st.due) + ' ' + T('due') + ' · ' + N(st.new) + ' ' + T('newCards') }));
    var tm = null, g0 = timerGlobals();
    if (g0 && typeof selectTimerMode === 'function') {
      var dur = select(T('timerUse'), 'fcTimerMin', [['0', '—'], ['15', '15 ' + T('timerMin')], ['25', '25 ' + T('timerMin')], ['45', '45 ' + T('timerMin')]], '0');
      tm = h('div', { class: 'fc-more' }, [dur, h('small', { class: 'fc-muted', text: T('timerNote') })]);
    }
    root.appendChild(grid); if (tm) root.appendChild(tm);
    var cu = h('details', { class: 'fc-more' }, [h('summary', { text: T('modeCustom') }),
      select(T('direction'), 'fcDir', [['forward', T('modeClassic')], ['reverse', T('modeReverse')], ['both', T('modeBoth')]], app.getPrefs().direction),
      text(T('total'), 'fcCount', '20'), text(T('tags'), 'fcQTags', ''),
      select(T('type'), 'fcQSet', [['due', T('dueDeck')], ['new', T('newCards')], ['favorites', T('favorites')], ['difficult', T('difficult')], ['mistakes', T('modeMistakes')], ['all', T('allCards')]], 'due'),
      btn(T('studyNow'), function () { beginStudy('custom', { mode: val('fcQSet'), limit: parseInt(val('fcCount'), 10) || 20, tags: val('fcQTags').split(',').map(function (x) { return x.trim(); }).filter(Boolean), direction: val('fcDir') }); }, 'primary')]);
    root.appendChild(cu);
    return root;
  }
  function beginStudy(modeName, o) {
    var qmode = modeName === 'random' ? 'random' : (modeName === 'quick' ? 'quick' : (modeName === 'mistakes' ? 'mistakes' : (o.mode || 'due')));
    var q = o.queue || app.buildQueue({ mode: qmode, deckId: state.deckId || '', limit: o.limit || 50, tags: o.tags });
    if (!q.length) return toast(T('nothingDue'));
    var dir = o.direction || (modeName === 'reverse' ? 'reverse' : (modeName === 'both' ? 'both' : app.getPrefs().direction));
    var mins = parseInt(val('fcTimerMin') || '0', 10);
    if (mins > 0) startDeepFocusTimer(mins);
    var r = app.startSession({ queue: q, deckId: state.deckId || '', studyMode: modeName, direction: dir });
    if (!r.ok) return toast(errText(r));
    state.study = { mode: modeName, revealed: false, started: Date.now(), written: '', match: null, missed: [], choice: null };
    go('study');
  }
  function resumeStudy() { var s = app.resumeSession(); if (!s) return; state.study = { mode: s.studyMode, revealed: false, started: Date.now(), written: '', match: null, missed: [], choice: null }; go('study'); }
  // Every mode reuses the same card data; modes that need data a card lacks fall back to Classic for that card.
  function cardMode(c, s) {
    var m = state.study.mode, order = ['classic', 'choice', 'writing', 'cloze'];
    if (m === 'mixed') m = order[s.index % order.length];
    if (m === 'choice' && app.distractors(c.id, 3).length < 3) return 'classic';
    if (m === 'cloze' && !app.makeCloze(c.id)) return 'classic';
    return m;
  }
  function studyView() {
    var s = app.resumeSession(), root = h('div', { class: 'fc-view' });
    if (!s || s.index >= s.queue.length) return summaryView(s);
    var c = app.getCard(s.queue[s.index]);
    if (!c || c.suspended) { app.advanceSession(s.id); return studyView(); }
    var mode = cardMode(c, s), prefs = app.getPrefs();
    var dir = s.direction === 'both' ? (s.index % 2 ? 'reverse' : 'forward') : s.direction;
    if (mode === 'listening' || mode === 'pronunciation' || mode === 'cloze') dir = 'forward';
    if (state.study.mode === 'reverse') dir = 'reverse';
    var rev = dir === 'reverse', question = rev ? c.backText : c.frontText, answer = rev ? c.frontText : c.backText, qSide = rev ? 'back' : 'front', aSide = rev ? 'front' : 'back';
    var cloze = mode === 'cloze' ? app.makeCloze(c.id) : null, st = state.study;
    var header2 = [];
    var tg = timerGlobals();
    if (tg && (tg.running || tg.active)) { var clock = h('small', { class: 'fc-muted', text: T('timerOn') + ' ' + fmtClock(timerLeft) }); header2.push(clock); if (!st.tick) st.tick = setInterval(function () { if (state.view !== 'study') { clearInterval(st.tick); st.tick = null; return; } var g = timerGlobals(); if (g) clock.textContent = T('timerOn') + ' ' + fmtClock(g.left); }, 1000); }
    header2.push(btn(T('end'), function () { endStudy(); }, '', T('end')));
    root.appendChild(header(N(s.index + 1) + ' / ' + N(s.queue.length), null, header2));
    var hideQ = mode === 'listening';
    var face = h('div', { class: 'fc-face', lang: (rev ? c.targetLanguage : c.sourceLanguage) || null }, [h('div', { class: 'fc-q', dir: 'auto', text: cloze ? cloze.text : (hideQ && !st.revealed ? '🔊' : question) })]);
    if (c.flag) face.appendChild(h('small', { class: 'fc-warn', text: T('changedFlag') }));
    root.appendChild(face);
    root.appendChild(h('div', { class: 'fc-row' }, [btn('🔊 ' + T(qSide === 'front' ? 'playFront' : 'playBack'), function () { speakCard(c, cloze ? 'front' : qSide); }), btn('⏹ ' + T('stop'), function () { stopSpeech(); }, '', T('stop'))]));
    function reveal(match) { st.match = match; st.revealed = true; st.revealedAt = Date.now(); render(); }
    if (!st.revealed) {
      if (mode === 'choice') {
        var key = rev ? 'frontText' : 'backText', opts = app.distractors(c.id, 3).concat([c[key]]);
        if (!st.choice || st.choice.id !== c.id) { var o2 = opts.slice().sort(function (a, b) { return a.localeCompare(b); }); st.choice = { id: c.id, opts: o2 }; }
        var box = h('div', { class: 'fc-choices' });
        st.choice.opts.forEach(function (o) { box.appendChild(btn(o, function () { reveal(app.util.norm(o) === app.util.norm(c[key]) ? 'exact' : 'wrong'); }, 'choice')); });
        root.appendChild(box);
      } else {
        if (mode === 'writing' || mode === 'cloze') root.appendChild(h('input', { type: 'text', id: 'fcWrite', class: 'fc-write', dir: 'auto', placeholder: T('yourAnswer'), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }));
        root.appendChild(btn(T('reveal'), function () {
          var m = null;
          if (mode === 'writing') m = app.checkAnswer(answer, val('fcWrite')).result;
          else if (mode === 'cloze') m = app.checkAnswer(cloze.answer, val('fcWrite')).result;
          reveal(m);
        }, 'primary big'));
        if ((mode === 'listening' || mode === 'pronunciation') && tts && tts.available()) setTimeout(function () { if (state.view === 'study') speakCard(c, 'front'); }, 150);
      }
    } else {
      root.appendChild(h('div', { class: 'fc-a', dir: 'auto', text: cloze ? cloze.answer : answer }));
      if (st.match) root.appendChild(h('small', { class: st.match === 'exact' ? 'fc-ok' : 'fc-warn', text: st.match === 'exact' ? T('correct') : (st.match === 'close' ? T('almost') : T('different')) }));
      if (prefs.showExamples && c.exampleText) {
        root.appendChild(h('div', { class: 'fc-example', dir: 'auto' }, [h('span', { text: c.exampleText }), c.exampleTranslation ? h('small', { class: 'fc-muted', text: c.exampleTranslation }) : null]));
        root.appendChild(btn('🔊 ' + T('playExample'), function () { speakCard({ frontText: c.exampleText, sourceLanguage: c.sourceLanguage, backText: c.exampleTranslation, targetLanguage: c.targetLanguage }, 'front'); }, 'ghost'));
      }
      root.appendChild(btn('🔊 ' + T(aSide === 'front' ? 'playFront' : 'playBack'), function () { speakCard(c, aSide); }));
      var pv = app.previewIntervals(c.id), rate = h('div', { class: 'fc-rate' });
      [[1, 'again'], [2, 'hard'], [3, 'good'], [4, 'easy']].forEach(function (r) {
        var p = pv[r[0]], label = p.days >= 1 ? N(p.days) + (lang() === 'ar' ? ' ي' : ' d') : (p.ms >= 60000 ? N(p.ms / 60000) + (lang() === 'ar' ? ' د' : ' min') : '<1 min');
        rate.appendChild(h('button', { type: 'button', class: 'fc-btn rate r' + r[0], on: { click: function () { rateCard(s, c, r[0]); } } }, [h('span', { text: T(r[1]) }), h('small', { text: label })]));
      });
      root.appendChild(rate);
    }
    root.appendChild(h('div', { class: 'fc-row' }, [btn(T('edit'), function () { stopSpeech(); go('edit', { editId: c.id }); }, 'ghost'), btn(T('suspend'), function () { app.setSuspended(c.id, true); app.advanceSession(s.id); st.revealed = false; render(); }, 'ghost')]));
    return root;
  }
  var rating = false;
  function rateCard(s, c, g) {
    if (rating) return; rating = true; // rapid double taps cannot submit twice
    stopSpeech();
    var ms = state.study.revealedAt ? Date.now() - state.study.started : 0;
    var r = app.reviewCard(c.id, g, { sessionId: s.id, submissionId: s.id + ':' + s.index + ':' + c.id, responseMs: ms });
    rating = false;
    if (!r.ok) return toast(errText(r));
    if (g === 1 && state.study.missed.indexOf(c.id) < 0) state.study.missed.push(c.id);
    state.study.revealed = false; state.study.match = null; state.study.choice = null; state.study.started = Date.now(); render();
  }
  function endStudy() { stopSpeech(); if (state.study && state.study.tick) clearInterval(state.study.tick); app.completeSession(); state.study = null; go('home'); }
  function summaryView(s) {
    var root = h('div', { class: 'fc-view' }), done = s ? app.completeSession() : null, d = done && done.ok ? done.session : null;
    var missed = state.study && state.study.missed ? state.study.missed.slice() : [];
    if (state.study && state.study.tick) clearInterval(state.study.tick);
    root.appendChild(header(T('done'), 'home'));
    if (d) root.appendChild(h('div', { class: 'fc-stats' }, [stat(T('reviewed'), d.reviewedCount), stat(T('correctAnswers'), d.correctCount), stat(T('incorrectAnswers'), d.incorrectCount), stat(T('studyTime'), d.durationSeconds / 60)]));
    state.study = null;
    if (missed.length) root.appendChild(btn(T('repeatMistakes') + ' (' + N(missed.length) + ')', function () { beginStudy('mistakes', { queue: missed }); }, 'primary big'));
    root.appendChild(btn(T('title'), function () { go('home'); }, missed.length ? '' : 'primary big'));
    var tg = timerGlobals(); if (tg && (tg.running || tg.active)) root.appendChild(h('small', { class: 'fc-muted', text: T('timerNote') }));
    return root;
  }
  function statsView() {
    var st = app.stats(), root = h('div', { class: 'fc-view' }); root.appendChild(header(T('details'), 'home'));
    root.appendChild(h('div', { class: 'fc-stats' }, [stat(T('total'), st.total), stat(T('newCards'), st.new), stat(T('learned'), st.learned), stat(T('due'), st.due), stat(T('overdue'), st.overdue), stat(T('difficult'), st.difficult)]));
    root.appendChild(h('div', { class: 'fc-stats' }, [stat(T('reviewed'), st.reviewedToday), stat(T('uniqueToday'), st.uniqueToday), stat(T('week'), st.reviewedWeek), stat(T('accuracy') + ' %', st.accuracy), stat(T('studyTime'), st.studySecondsWeek / 60), stat(T('streak'), st.streak)]));
    var u = app.usage(); root.appendChild(h('small', { class: 'fc-muted', text: T('storage') + ': ' + N(u.bytes / 1024) + ' KB' }));
    return root;
  }

  // ---------- import / export ----------
  function exportCsv(deckId) {
    var csv = app.exportCsv({ deckId: deckId || '' });
    try {
      if (root.ZenNative && typeof root.ZenNative.exportAnalyticsCsvToFile === 'function') { root.ZenNative.exportAnalyticsCsvToFile(csv, 'fc-export-' + Date.now()); return toast(T('exportShared')); }
    } catch (_) {}
    try { navigator.clipboard.writeText(csv).then(function () { toast(T('copied')); }); } catch (_) { toast(T('error')); }
  }
  function importView() {
    var root2 = h('div', { class: 'fc-view' }); root2.appendChild(header(T('import'), 'home'));
    root2.appendChild(h('p', { class: 'fc-muted', text: T('importHelp') }));
    var ta = h('textarea', { id: 'fcImportText', rows: 6, dir: 'auto', maxlength: 4000000, 'aria-label': T('import') });
    var file = h('input', { type: 'file', accept: '.csv,.tsv,.json,.txt,text/*,application/json', 'aria-label': T('choose') });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; if (f.size > 4000000) return toast(T('error')); var fr = new FileReader(); fr.onload = function () { ta.value = String(fr.result || ''); }; fr.readAsText(f); });
    var out = h('div', { class: 'fc-import-out' }), deck = ensureDeck();
    root2.appendChild(select(T('deck'), 'fcImpDeck', app.listDecks().map(function (d) { return [d.id, d.name]; }), deck ? deck.id : '')); root2.appendChild(file); root2.appendChild(ta);
    root2.appendChild(btn(T('preview'), function () {
      clear(out);
      var parsed = app.parseImport(ta.value); if (!parsed.ok) return out.appendChild(h('p', { class: 'fc-warn', text: parsed.error || T('error') }));
      var map = app.guessMapping(parsed.headers);
      var mapBox = h('div', { class: 'fc-map' });
      ['frontText', 'backText', 'sourceLanguage', 'targetLanguage', 'exampleText', 'exampleTranslation', 'personalNotes', 'tags'].forEach(function (f) {
        var sel = select(T('mapColumn') + ' ' + f, 'fcMap_' + f, [['-1', T('skipCol')]].concat(parsed.headers.map(function (hd, i) { return [String(i), String(hd || (N(i + 1)))]; })), String(map[f] === undefined ? -1 : map[f]));
        sel.querySelector('select').addEventListener('change', function (e) { var v = parseInt(e.target.value, 10); if (v < 0) delete map[f]; else map[f] = v; showPreview(); });
        mapBox.appendChild(sel);
      });
      out.appendChild(mapBox); var pvBox = h('div'); out.appendChild(pvBox);
      function showPreview() {
      clear(pvBox);
      var pv = app.previewImport(parsed, map, { deckId: val('fcImpDeck') });
      if (!pv.ok) return pvBox.appendChild(h('p', { class: 'fc-warn', text: pv.error || T('error') }));
      pvBox.appendChild(h('div', { class: 'fc-stats' }, [stat(T('total'), pv.total), stat(T('invalid'), pv.invalid.length), stat(T('duplicates'), pv.duplicates)]));
      pv.records.slice(0, 5).forEach(function (r) { pvBox.appendChild(h('div', { class: 'fc-card-row' }, [h('div', { class: 'fc-card-text' }, [h('strong', { text: r.content.frontText, dir: 'auto' }), h('span', { text: r.content.backText, dir: 'auto' })])])); });
      pvBox.appendChild(h('div', { class: 'fc-row' }, [btn(T('cancel'), function () { clear(out); }), btn(T('importNow'), function (ev) { var b0 = ev && ev.currentTarget; if (b0) { b0.disabled = true; b0.textContent = T('importing'); } setTimeout(function () { var r = app.commitImport(pv, { deckId: val('fcImpDeck'), skipDuplicates: true }); if (!r.ok) { if (b0) { b0.disabled = false; b0.textContent = T('importNow'); } return toast(errText(r)); } toast(T('importOk') + ' ' + N(r.imported)); go('home'); }, 30); }, 'primary')]));
      }
      showPreview();
    }, 'primary'));
    root2.appendChild(out); return root2;
  }

  // ---------- settings ----------
  function settingsView() {
    var p = app.getPrefs(), root2 = h('div', { class: 'fc-view' }); root2.appendChild(header(T('settings'), 'home'));
    function saveP(patch) { var r = app.setPrefs(patch); if (!r.ok) toast(errText(r)); }
    root2.appendChild(text(T('dailyGoal'), 'fcGoal', N(p.dailyGoal)));
    root2.querySelector('#fcGoal').addEventListener('change', function (e) { saveP({ dailyGoal: parseInt(e.target.value, 10) }); });
    var dirSel = select(T('direction'), 'fcPDir', [['forward', T('modeClassic')], ['reverse', T('modeReverse')], ['both', T('modeBoth')]], p.direction); root2.appendChild(dirSel);
    dirSel.querySelector('select').addEventListener('change', function (e) { saveP({ direction: e.target.value }); });
    var tsz = select(T('textSize'), 'fcTsz', [['small', T('small')], ['medium', T('medium')], ['large', T('large')]], p.textSize); root2.appendChild(tsz);
    tsz.querySelector('select').addEventListener('change', function (e) { saveP({ textSize: e.target.value }); render(); });
    var exb = h('input', { type: 'checkbox', checked: p.showExamples }); exb.addEventListener('change', function () { saveP({ showExamples: exb.checked }); });
    root2.appendChild(h('label', { class: 'fc-check' }, [exb, h('span', { text: T('showExamples') })]));
    var dms = select(T('defaultMode'), 'fcDMode', MODES.map(function (m) { return [m[0], T(m[1])]; }), p.defaultMode || 'classic'); root2.appendChild(dms);
    dms.querySelector('select').addEventListener('change', function (e) { saveP({ defaultMode: e.target.value }); });
    var dks = select(T('defaultDeck'), 'fcDDeck', [['', T('allStates')]].concat(app.listDecks().map(function (d) { return [d.id, d.name]; })), p.defaultDeckId || ''); root2.appendChild(dks);
    dks.querySelector('select').addEventListener('change', function (e) { saveP({ defaultDeckId: e.target.value }); });
    root2.appendChild(h('h3', { text: T('ttsTitle') }));
    if (!tts || !tts.available()) { root2.appendChild(h('p', { class: 'fc-warn', text: T('ttsUnavailable') })); }
    var rep = select(T('repeat'), 'fcRep', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return [N(n), N(n) + 'x']; }), N(p.repeat)); root2.appendChild(rep);
    rep.querySelector('select').addEventListener('change', function (e) { saveP({ repeat: parseInt(e.target.value, 10) }); });
    var rt = select(T('speed'), 'fcRate', app.SPEECH_RATES.map(function (r) { return [String(r), r.toFixed(2) + 'x']; }), String(p.rate)); root2.appendChild(rt);
    var actual = h('small', { class: 'fc-muted', text: T('actualSpeed') + ': ' + p.rate.toFixed(2) + 'x' }); root2.appendChild(actual);
    rt.querySelector('select').addEventListener('change', function (e) { saveP({ rate: parseFloat(e.target.value) }); actual.textContent = T('actualSpeed') + ': ' + parseFloat(e.target.value).toFixed(2) + 'x'; });
    var pt = text(T('pitch'), 'fcPitch', p.pitch.toFixed(1)); root2.appendChild(pt); pt.querySelector('input').addEventListener('change', function (e) { saveP({ pitch: parseFloat(e.target.value) }); });
    var sd = select(T('speakSide'), 'fcSide', [['front', T('sideFront')], ['back', T('sideBack')]], p.speakSide); root2.appendChild(sd); sd.querySelector('select').addEventListener('change', function (e) { saveP({ speakSide: e.target.value }); });
    [['offlineOnly', 'offlineOnly'], ['preferMale', 'preferMale']].forEach(function (k) {
      var cb = h('input', { type: 'checkbox', checked: p[k[0]] }); cb.addEventListener('change', function () { var o = {}; o[k[0]] = cb.checked; saveP(o); });
      root2.appendChild(h('label', { class: 'fc-check' }, [cb, h('span', { text: T(k[1]) })]));
    });
    var engBox = h('div'); root2.appendChild(engBox);
    var voiceBox = h('div', { class: 'fc-voices' }); root2.appendChild(h('h4', { text: T('ttsVoice') }));
    var tag = h('input', { type: 'text', id: 'fcVLang', list: 'fcLangs2', placeholder: T('ttsLanguage') + ' (de-DE, ar, en-US…)', dir: 'ltr', autocomplete: 'off', maxlength: 35 });
    root2.appendChild(h('datalist', { id: 'fcLangs2' }, COMMON_LANGS.map(function (l) { return h('option', { value: l }); }))); root2.appendChild(tag); root2.appendChild(voiceBox);
    if (tts && tts.available()) {
      tts.init('').then(function (r) { if (!r.ok) return; var eng = tts.engines(); if (eng.ok && eng.engines.length > 1) {
        var es = select(T('ttsEngine'), 'fcEngine', [['', T('autoVoice')]].concat(eng.engines.map(function (x) { return [x.name, x.label]; })), p.engine || ''); engBox.appendChild(es);
        es.querySelector('select').addEventListener('change', function (e) { saveP({ engine: e.target.value }); tts.init(e.target.value); }); } });
      tag.addEventListener('change', function () { loadVoices(tag.value.trim(), voiceBox, saveP); });
    }
    root2.appendChild(h('h3', { text: T('import') }));
    root2.appendChild(h('div', { class: 'fc-row wrap' }, [btn(T('import'), function () { go('import'); }), btn(T('exportCsv'), function () { exportCsv(''); })]));
    return root2;
  }
  function loadVoices(tag, box, saveP) {
    clear(box); if (!tag) return;
    if (!app.util.validLang(tag)) return box.appendChild(h('p', { class: 'fc-warn', text: T('error') }));
    var pf = app.getPrefs();
    tts.discover(tag, { preferMale: pf.preferMale, offlineOnly: pf.offlineOnly }).then(function (d) {
      if (!d.ok) return box.appendChild(h('p', { class: 'fc-warn', text: d.error || d.code || T('error') }));
      if (d.needsVoiceData) box.appendChild(h('p', { class: 'fc-warn', text: T('installVoice') }));
      if (!d.maleConfirmed && d.voices.length) box.appendChild(h('p', { class: 'fc-muted', text: T('noMale') }));
      var cur = (pf.perLanguage[tag] || {}).voiceId || '';
      var opts = [['', T('autoVoice')]].concat(d.voices.map(function (v) { return [v.id, v.id + ' · ' + (v.gender === 'male' ? T('male') : v.gender === 'female' ? T('female') : T('genderUnknown')) + (v.networkRequired ? ' · ' + T('needsNet') : '')]; }));
      var sel = select(T('ttsVoice'), 'fcVoice', opts, cur); box.appendChild(sel);
      sel.querySelector('select').addEventListener('change', function (e) { var per = Object.assign({}, pf.perLanguage); per[tag] = Object.assign({}, per[tag], { voiceId: e.target.value }); saveP({ perLanguage: per }); });
      box.appendChild(btn('🔊 ' + T('ttsTest'), function () {
        var p2 = app.getPrefs(), per = p2.perLanguage[tag] || {};
        tts.speak(tag.split('-')[0] === 'ar' ? 'مرحبا' : (tag.split('-')[0] === 'de' ? 'Guten Tag' : 'Hello'), { language: tag, voiceId: per.voiceId || '', rate: per.rate || p2.rate, pitch: per.pitch || p2.pitch, offlineOnly: p2.offlineOnly, repeat: 1 }).then(function (r) { if (!r.ok && !r.cancelled) toast(r.error || r.code); });
      }));
    });
  }

  // ---------- shell ----------
  function render() {
    if (!mount) return;
    var views = { home: homeView, list: function () { return listView(state.deckId); }, deck: deckView, edit: editView, studyStart: studyStartView, study: studyView, stats: statsView, settings: settingsView, import: importView };
    clear(mount);
    var node; try { node = (views[state.view] || homeView)(); } catch (e) { node = h('p', { class: 'fc-warn', text: T('error') }); if (root.__dfRecordError) root.__dfRecordError('flashcards-ui', e); }
    mount.appendChild(node); mount.appendChild(h('div', { class: 'fc-toast', role: 'status', 'aria-live': 'polite', text: state.toast || '' }));
    var sz = app.getPrefs().textSize; mount.style.setProperty('--fc-scale', sz === 'large' ? '1.3' : (sz === 'small' ? '0.88' : '1'));
    mount.setAttribute('dir', lang() === 'ar' ? 'rtl' : (document.documentElement.getAttribute('dir') || 'ltr'));
  }
  function init() {
    if (app) return true;
    mount = document.getElementById('sec-flashcards'); if (!mount || !root.DFFlashcards) return false;
    try {
      app = root.DFFlashcards.create({ storage: root.localStorage });
      app.migrateLegacy();
    } catch (e) { mount.textContent = T('error'); return false; }
    app.util = app.util || {};
    tts = root.DFFlashcardsTts ? root.DFFlashcardsTts.create({}) : null;
    root.dfTtsEvent = function (ev) { if (tts) tts.onEvent(ev); };
    root.DFFlashcardsApp = app;
    return true;
  }
  var api = {
    show: function () { if (!init()) return; state.view = 'home'; render(); },
    leave: function () { if (tts) tts.stop(); },
    app: function () { return app; },
    _strings: S
  };
  root.DFFlashcardsUI = api;
  // The backup code needs the data layer even if the user never opened the section.
  document.addEventListener('DOMContentLoaded', function () {
    try { init(); } catch (_) {}
    var lbl = document.getElementById('flashcardsEntryLabel'), b = document.getElementById('flashcardsEntry');
    if (lbl) lbl.textContent = T('title'); if (b) b.setAttribute('aria-label', T('title'));
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && tts) tts.stop(); });
})(typeof window !== 'undefined' ? window : this);
