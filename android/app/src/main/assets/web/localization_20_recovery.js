/* DEEP-FOCUS-RECOVERY-04: additive 20-language UI translations.
 * No automatic installation, persistence, global overrides or legacy-data writes.
 * Lane 00 must load this after existing locales and bind adapters in the owned UI modules.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusLocale20Recovery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LANGUAGES = Object.freeze(["en","ar","es","zh","hi","fr","de","ru","pt","ja","id","tr","ko","vi","it","bn","ur","fa","pl","nl"]);
  const KEYS = Object.freeze(["analyticsTitle","activity","period","from","to","minutes","sessions","average","streak","noSessions","goal","noGoals","completedTasks","chart","year","export","details","grouping","daily","weekly","monthly","all","study","reading","work","fitness","excluded","minute","heatmapYear"]);
  const RTL = new Set(['ar', 'fa', 'ur']);
  const rows = {
    en: ["Recorded analytics","Activity","Period","From","To","Recorded minutes","Sessions","Average session","Current streak","No recorded sessions in this period","Goal comparison","No daily goals configured","Completed tasks","Daily distribution","Year","Export CSV","Select a day for details","Grouping","Daily","Weekly","Monthly","All","Study","Reading","Work","Fitness","Excluded sessions","minutes","Yearly activity"],
    ar: ["تحليلات النشاط المسجّل","النشاط","الفترة","من","إلى","الدقائق المسجّلة","الجلسات","متوسط الجلسة","سلسلة الاستمرارية","لا توجد جلسات مسجّلة في هذه الفترة","مقارنة الأهداف","لم تُحدّد أهداف يومية","المهام المكتملة","التوزيع اليومي","السنة","تصدير CSV","اختر يومًا لعرض التفاصيل","التجميع","يومي","أسبوعي","شهري","الكل","الدراسة","القراءة","العمل","الرياضة","الجلسات المستبعدة","دقيقة","النشاط السنوي"],
    es: ["Análisis registrados","Actividad","Período","Desde","Hasta","Minutos registrados","Sesiones","Promedio por sesión","Racha actual","No hay sesiones registradas en este período","Comparación de objetivos","No hay objetivos diarios configurados","Tareas completadas","Distribución diaria","Año","Exportar CSV","Selecciona un día para ver detalles","Agrupación","Diario","Semanal","Mensual","Todo","Estudio","Lectura","Trabajo","Ejercicio","Sesiones excluidas","minutos","Actividad anual"],
    zh: ["已记录的分析","活动","时段","从","至","记录分钟数","会话","平均每次时长","当前连续天数","此时段没有已记录的会话","目标对比","未设置每日目标","已完成任务","每日分布","年份","导出 CSV","选择日期查看详情","分组","每日","每周","每月","全部","学习","阅读","工作","锻炼","已排除的会话","分钟","年度活动"],
    hi: ["दर्ज किए गए आँकड़े","गतिविधि","अवधि","से","तक","दर्ज मिनट","सत्र","औसत सत्र","वर्तमान क्रम","इस अवधि में कोई सत्र दर्ज नहीं है","लक्ष्यों की तुलना","दैनिक लक्ष्य निर्धारित नहीं हैं","पूर्ण किए गए कार्य","दैनिक वितरण","वर्ष","CSV निर्यात करें","विवरण के लिए दिन चुनें","समूहीकरण","दैनिक","साप्ताहिक","मासिक","सभी","अध्ययन","पढ़ना","काम","व्यायाम","हटाए गए सत्र","मिनट","वार्षिक गतिविधि"],
    fr: ["Analyses enregistrées","Activité","Période","Du","Au","Minutes enregistrées","Séances","Moyenne par séance","Série actuelle","Aucune séance enregistrée sur cette période","Comparaison des objectifs","Aucun objectif quotidien défini","Tâches terminées","Répartition quotidienne","Année","Exporter en CSV","Sélectionnez un jour pour les détails","Regroupement","Quotidien","Hebdomadaire","Mensuel","Tout","Étude","Lecture","Travail","Sport","Séances exclues","minutes","Activité annuelle"],
    de: ["Erfasste Analysen","Aktivität","Zeitraum","Von","Bis","Erfasste Minuten","Sitzungen","Durchschnitt pro Sitzung","Aktuelle Serie","Keine Sitzungen in diesem Zeitraum erfasst","Zielvergleich","Keine Tagesziele festgelegt","Erledigte Aufgaben","Tagesverteilung","Jahr","CSV exportieren","Tag für Details auswählen","Gruppierung","Täglich","Wöchentlich","Monatlich","Alle","Lernen","Lesen","Arbeit","Sport","Ausgeschlossene Sitzungen","Minuten","Jahresaktivität"],
    ru: ["Записанная аналитика","Активность","Период","С","По","Записанные минуты","Сеансы","Среднее за сеанс","Текущая серия","За этот период сеансы не записаны","Сравнение целей","Дневные цели не заданы","Выполненные задачи","Распределение по дням","Год","Экспорт CSV","Выберите день для подробностей","Группировка","По дням","По неделям","По месяцам","Все","Учёба","Чтение","Работа","Спорт","Исключённые сеансы","минуты","Активность за год"],
    pt: ["Análises registradas","Atividade","Período","De","Até","Minutos registrados","Sessões","Média por sessão","Sequência atual","Nenhuma sessão registrada neste período","Comparação de metas","Nenhuma meta diária configurada","Tarefas concluídas","Distribuição diária","Ano","Exportar CSV","Selecione um dia para ver detalhes","Agrupamento","Diário","Semanal","Mensal","Tudo","Estudo","Leitura","Trabalho","Exercício","Sessões excluídas","minutos","Atividade anual"],
    ja: ["記録された分析","活動","期間","開始","終了","記録した分数","セッション","平均セッション時間","現在の連続記録","この期間の記録はありません","目標の比較","毎日の目標は未設定です","完了したタスク","日別の分布","年","CSV を出力","詳細を見る日を選択","集計","日別","週別","月別","すべて","学習","読書","仕事","運動","除外されたセッション","分","年間の活動"],
    id: ["Analitik tercatat","Aktivitas","Periode","Dari","Sampai","Menit tercatat","Sesi","Rata-rata sesi","Rentetan saat ini","Tidak ada sesi tercatat pada periode ini","Perbandingan target","Target harian belum diatur","Tugas selesai","Distribusi harian","Tahun","Ekspor CSV","Pilih hari untuk melihat detail","Pengelompokan","Harian","Mingguan","Bulanan","Semua","Belajar","Membaca","Bekerja","Olahraga","Sesi dikecualikan","menit","Aktivitas tahunan"],
    tr: ["Kaydedilen analizler","Etkinlik","Dönem","Başlangıç","Bitiş","Kaydedilen dakika","Oturumlar","Ortalama oturum","Güncel seri","Bu dönemde kayıtlı oturum yok","Hedef karşılaştırması","Günlük hedef ayarlanmadı","Tamamlanan görevler","Günlük dağılım","Yıl","CSV dışa aktar","Ayrıntılar için bir gün seçin","Gruplama","Günlük","Haftalık","Aylık","Tümü","Ders","Okuma","İş","Spor","Hariç tutulan oturumlar","dakika","Yıllık etkinlik"],
    ko: ["기록된 분석","활동","기간","시작","종료","기록된 분","세션","평균 세션","현재 연속 기록","이 기간에 기록된 세션이 없습니다","목표 비교","일일 목표가 설정되지 않았습니다","완료된 할 일","일별 분포","연도","CSV 내보내기","자세히 볼 날짜 선택","그룹화","일별","주별","월별","전체","공부","독서","업무","운동","제외된 세션","분","연간 활동"],
    vi: ["Phân tích đã ghi nhận","Hoạt động","Khoảng thời gian","Từ","Đến","Số phút đã ghi","Phiên","Trung bình mỗi phiên","Chuỗi hiện tại","Không có phiên nào được ghi trong khoảng này","So sánh mục tiêu","Chưa đặt mục tiêu hằng ngày","Nhiệm vụ hoàn thành","Phân bố theo ngày","Năm","Xuất CSV","Chọn ngày để xem chi tiết","Nhóm theo","Hằng ngày","Hằng tuần","Hằng tháng","Tất cả","Học tập","Đọc sách","Làm việc","Thể thao","Phiên bị loại","phút","Hoạt động trong năm"],
    it: ["Analisi registrate","Attività","Periodo","Da","A","Minuti registrati","Sessioni","Media per sessione","Serie attuale","Nessuna sessione registrata in questo periodo","Confronto obiettivi","Nessun obiettivo giornaliero impostato","Attività completate","Distribuzione giornaliera","Anno","Esporta CSV","Seleziona un giorno per i dettagli","Raggruppamento","Giornaliero","Settimanale","Mensile","Tutte","Studio","Lettura","Lavoro","Sport","Sessioni escluse","minuti","Attività annuale"],
    bn: ["রেকর্ড করা বিশ্লেষণ","কার্যকলাপ","সময়কাল","থেকে","পর্যন্ত","রেকর্ড করা মিনিট","সেশন","গড় সেশন","বর্তমান ধারাবাহিকতা","এই সময়ে কোনো সেশন রেকর্ড হয়নি","লক্ষ্যের তুলনা","দৈনিক লক্ষ্য নির্ধারণ করা হয়নি","সম্পন্ন কাজ","দৈনিক বণ্টন","বছর","CSV রপ্তানি","বিস্তারিত দেখতে একটি দিন বাছুন","গোষ্ঠীবদ্ধকরণ","দৈনিক","সাপ্তাহিক","মাসিক","সব","পড়াশোনা","পড়া","কাজ","ব্যায়াম","বাদ দেওয়া সেশন","মিনিট","বার্ষিক কার্যকলাপ"],
    ur: ["ریکارڈ شدہ تجزیات","سرگرمی","مدت","سے","تک","ریکارڈ شدہ منٹ","سیشنز","اوسط سیشن","موجودہ تسلسل","اس مدت میں کوئی سیشن ریکارڈ نہیں ہوا","اہداف کا موازنہ","روزانہ کے اہداف مقرر نہیں","مکمل شدہ کام","روزانہ کی تقسیم","سال","CSV برآمد کریں","تفصیل کے لیے دن منتخب کریں","گروہ بندی","روزانہ","ہفتہ وار","ماہانہ","تمام","مطالعہ","مطالعۂ کتب","کام","ورزش","خارج کردہ سیشنز","منٹ","سالانہ سرگرمی"],
    fa: ["تحلیل‌های ثبت‌شده","فعالیت","دوره","از","تا","دقیقه‌های ثبت‌شده","جلسه‌ها","میانگین هر جلسه","تداوم کنونی","در این دوره جلسه‌ای ثبت نشده است","مقایسه هدف‌ها","هدف روزانه‌ای تنظیم نشده است","کارهای انجام‌شده","توزیع روزانه","سال","خروجی CSV","برای جزئیات یک روز انتخاب کنید","گروه‌بندی","روزانه","هفتگی","ماهانه","همه","مطالعه","کتاب‌خوانی","کار","ورزش","جلسه‌های کنارگذاشته‌شده","دقیقه","فعالیت سالانه"],
    pl: ["Zapisane statystyki","Aktywność","Okres","Od","Do","Zapisane minuty","Sesje","Średnia sesja","Obecna seria","Brak zapisanych sesji w tym okresie","Porównanie celów","Nie ustawiono celów dziennych","Ukończone zadania","Rozkład dzienny","Rok","Eksportuj CSV","Wybierz dzień, aby zobaczyć szczegóły","Grupowanie","Dziennie","Tygodniowo","Miesięcznie","Wszystkie","Nauka","Czytanie","Praca","Sport","Wykluczone sesje","minuty","Aktywność roczna"],
    nl: ["Geregistreerde analyses","Activiteit","Periode","Van","Tot","Geregistreerde minuten","Sessies","Gemiddelde sessie","Huidige reeks","Geen sessies geregistreerd in deze periode","Doelen vergelijken","Geen dagelijkse doelen ingesteld","Voltooide taken","Dagelijkse verdeling","Jaar","CSV exporteren","Selecteer een dag voor details","Groepering","Dagelijks","Wekelijks","Maandelijks","Alles","Studeren","Lezen","Werk","Sport","Uitgesloten sessies","minuten","Jaarlijkse activiteit"]
  };
  const translations = Object.create(null);
  for (const code of LANGUAGES) {
    const values = rows[code];
    if (!Array.isArray(values) || values.length !== KEYS.length ||
        values.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error('DF-04 incomplete translation row: ' + code);
    }
    translations[code] = Object.freeze(Object.fromEntries(KEYS.map((key, index) => [key, values[index]])));
  }
  Object.freeze(translations);
  const westernDigits = text => String(text).replace(/[\u0660-\u0669\u06f0-\u06f9]/g,
    digit => String(digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)));
  const resolve = code => {
    const base = String(code || 'en').split(/[-_]/)[0].toLowerCase();
    return Object.prototype.hasOwnProperty.call(translations, base) ? base : 'en';
  };
  const direction = code => RTL.has(resolve(code)) ? 'rtl' : 'ltr';
  // Unknown keys return null rather than leaking internal identifiers into the screen.
  const t = (code, key) => Object.prototype.hasOwnProperty.call(translations.en, key)
    ? westernDigits(translations[resolve(code)][key]) : null;
  function formatNumber(value, code, options) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    try {
      return westernDigits(new Intl.NumberFormat(resolve(code), {
        ...(options || {}), numberingSystem:'latn'
      }).format(value));
    } catch (_) { return westernDigits(String(value)); }
  }
  function formatDate(value, code, options) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return westernDigits(new Intl.DateTimeFormat(resolve(code), {
        calendar:'gregory', ...(options || {}), numberingSystem:'latn'
      }).format(date));
    } catch (_) { return westernDigits(date.toISOString().slice(0,10)); }
  }
  function isUserContent(node) {
    return !!(node && typeof node.closest === 'function' &&
      node.closest('[data-df20-user-content], [contenteditable]'));
  }
  // Apply only explicitly tagged UI labels, never arbitrary text nodes or stored content.
  function apply(scope, code) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
    const language = resolve(code);
    if (typeof scope.hasAttribute === 'function' && scope.hasAttribute('data-df20-scope')) {
      scope.setAttribute('dir', direction(language));
      scope.setAttribute('lang', language);
    }
    let count = 0;
    for (const [attribute, field] of [
      ['data-df20-i18n', 'textContent'],
      ['data-df20-placeholder', 'placeholder'],
      ['data-df20-aria-label', 'aria-label'],
      ['data-df20-title', 'title']
    ]) {
      for (const element of scope.querySelectorAll('[' + attribute + ']')) {
        if (isUserContent(element)) continue;
        const value = t(language, element.getAttribute(attribute));
        if (value === null) continue;
        if (field === 'textContent') {
          if (typeof element.value === 'string' && element.value !== '') continue;
          if (element.tagName && /^(INPUT|TEXTAREA)$/i.test(element.tagName)) continue;
          element.textContent = value;
        } else if (field === 'aria-label') element.setAttribute(field, value);
        else element[field] = value;
        count++;
      }
    }
    return count;
  }
  // Delegates persistence to lane 00; never modifies localStorage/cfg/notesList/tasksList.
  function createController({root:scope=null, locale='en', persist=null, onChange=null}={}) {
    let active = resolve(locale), disposed = false;
    return Object.freeze({
      language: () => active,
      setLanguage(code) {
        if (disposed) return false;
        const next = resolve(code);
        if (next === active) return false;
        if (typeof persist === 'function') persist(next);
        active = next;
        apply(scope, next);
        if (typeof onChange === 'function') onChange(next);
        return true;
      },
      refresh: () => !disposed && apply(scope,active),
      dispose() { if (disposed) return false; disposed = true; return true; }
    });
  }
  function audit() {
    const perLanguage = Object.create(null);
    let valid = Object.keys(translations).length === LANGUAGES.length;
    for (const code of LANGUAGES) {
      const table = translations[code] || {};
      const missing = KEYS.filter(key => typeof table[key] !== 'string' || !table[key].trim());
      const extra = Object.keys(table).filter(key => !KEYS.includes(key));
      perLanguage[code] = {translated:KEYS.length - missing.length, missing, extra};
      if (missing.length || extra.length || Object.keys(table).length !== KEYS.length) valid = false;
    }
    return {valid, keys:KEYS.length, languages:LANGUAGES.length, perLanguage};
  }
  return Object.freeze({LANGUAGES,KEYS,translations,resolve,direction,t,westernDigits,
    formatNumber,formatDate,apply,createController,audit});
});
