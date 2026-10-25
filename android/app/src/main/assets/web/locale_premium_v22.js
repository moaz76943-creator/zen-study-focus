/* Deep Focus v22: additional UI strings, independent of v21 DICT / locale packs.
 * Load before the caller that uses these labels. Does not apply itself.
 * Integration: DF22Locale.apply(document, activeLanguageCode).
 * Data attributes: data-df22-i18n, data-df22-placeholder, data-df22-aria-label.
 */
(function(global) {
  'use strict';
  const keys = Object.freeze([
    'start','pause','resume','reset','focus','shortBreak','longBreak','quickTraining',
    'tasks','notes','analytics','search','save','cancel','close','emptyTasks',
    'emptyNotes','emptyAnalytics','newTask','newNote','timerLabel','noData'
  ]);
  const rows = {
    en: ['Start','Pause','Resume','Reset','Focus','Short break','Long break','Quick training','Tasks','Notes','Analytics','Search','Save','Cancel','Close','No tasks yet','No notes yet','No activity recorded yet','New task','New note','Focus timer','No data available'],
    ar: ['ابدأ','إيقاف مؤقت','استئناف','إعادة ضبط','تركيز','راحة قصيرة','راحة طويلة','تدريب سريع','المهام','الملاحظات','التحليلات','بحث','حفظ','إلغاء','إغلاق','لا توجد مهام بعد','لا توجد ملاحظات بعد','لا يوجد نشاط مسجّل بعد','مهمة جديدة','ملاحظة جديدة','مؤقت التركيز','لا تتوفر بيانات'],
    es: ['Iniciar','Pausar','Reanudar','Reiniciar','Concentración','Descanso corto','Descanso largo','Entrenamiento rápido','Tareas','Notas','Análisis','Buscar','Guardar','Cancelar','Cerrar','Aún no hay tareas','Aún no hay notas','Aún no hay actividad registrada','Nueva tarea','Nueva nota','Temporizador de concentración','No hay datos disponibles'],
    zh: ['开始','暂停','继续','重置','专注','短休息','长休息','快速训练','任务','笔记','分析','搜索','保存','取消','关闭','暂无任务','暂无笔记','尚无活动记录','新建任务','新建笔记','专注计时器','暂无数据'],
    hi: ['शुरू करें','रोकें','जारी रखें','रीसेट करें','एकाग्रता','छोटा विराम','लंबा विराम','त्वरित प्रशिक्षण','कार्य','नोट्स','विश्लेषण','खोजें','सहेजें','रद्द करें','बंद करें','अभी कोई कार्य नहीं','अभी कोई नोट नहीं','अभी कोई गतिविधि दर्ज नहीं है','नया कार्य','नया नोट','एकाग्रता टाइमर','कोई डेटा उपलब्ध नहीं'],
    fr: ['Démarrer','Pause','Reprendre','Réinitialiser','Concentration','Pause courte','Pause longue','Entraînement rapide','Tâches','Notes','Analyses','Rechercher','Enregistrer','Annuler','Fermer','Aucune tâche pour le moment','Aucune note pour le moment','Aucune activité enregistrée','Nouvelle tâche','Nouvelle note','Minuteur de concentration','Aucune donnée disponible'],
    de: ['Starten','Pause','Fortsetzen','Zurücksetzen','Fokus','Kurze Pause','Lange Pause','Schnelltraining','Aufgaben','Notizen','Auswertung','Suchen','Speichern','Abbrechen','Schließen','Noch keine Aufgaben','Noch keine Notizen','Noch keine Aktivitäten erfasst','Neue Aufgabe','Neue Notiz','Fokus-Timer','Keine Daten verfügbar'],
    ru: ['Начать','Пауза','Продолжить','Сбросить','Концентрация','Короткий перерыв','Длинный перерыв','Быстрая тренировка','Задачи','Заметки','Аналитика','Поиск','Сохранить','Отмена','Закрыть','Задач пока нет','Заметок пока нет','Активность пока не записана','Новая задача','Новая заметка','Таймер концентрации','Нет доступных данных'],
    pt: ['Iniciar','Pausar','Retomar','Redefinir','Foco','Pausa curta','Pausa longa','Treino rápido','Tarefas','Notas','Análises','Pesquisar','Salvar','Cancelar','Fechar','Ainda não há tarefas','Ainda não há notas','Nenhuma atividade registrada','Nova tarefa','Nova nota','Temporizador de foco','Nenhum dado disponível'],
    ja: ['開始','一時停止','再開','リセット','集中','短い休憩','長い休憩','クイックトレーニング','タスク','ノート','分析','検索','保存','キャンセル','閉じる','タスクはまだありません','ノートはまだありません','活動記録はまだありません','新しいタスク','新しいノート','集中タイマー','データがありません'],
    id: ['Mulai','Jeda','Lanjutkan','Atur ulang','Fokus','Istirahat singkat','Istirahat panjang','Latihan cepat','Tugas','Catatan','Analitik','Cari','Simpan','Batal','Tutup','Belum ada tugas','Belum ada catatan','Belum ada aktivitas tercatat','Tugas baru','Catatan baru','Pengatur waktu fokus','Tidak ada data tersedia'],
    tr: ['Başlat','Duraklat','Devam et','Sıfırla','Odaklanma','Kısa mola','Uzun mola','Hızlı antrenman','Görevler','Notlar','Analizler','Ara','Kaydet','İptal','Kapat','Henüz görev yok','Henüz not yok','Henüz etkinlik kaydedilmedi','Yeni görev','Yeni not','Odak zamanlayıcısı','Veri bulunmuyor'],
    ko: ['시작','일시 정지','계속','초기화','집중','짧은 휴식','긴 휴식','빠른 운동','할 일','노트','분석','검색','저장','취소','닫기','아직 할 일이 없습니다','아직 노트가 없습니다','기록된 활동이 없습니다','새 할 일','새 노트','집중 타이머','데이터가 없습니다'],
    vi: ['Bắt đầu','Tạm dừng','Tiếp tục','Đặt lại','Tập trung','Nghỉ ngắn','Nghỉ dài','Luyện tập nhanh','Nhiệm vụ','Ghi chú','Phân tích','Tìm kiếm','Lưu','Hủy','Đóng','Chưa có nhiệm vụ','Chưa có ghi chú','Chưa ghi nhận hoạt động','Nhiệm vụ mới','Ghi chú mới','Bộ đếm giờ tập trung','Không có dữ liệu'],
    it: ['Avvia','Pausa','Riprendi','Reimposta','Concentrazione','Pausa breve','Pausa lunga','Allenamento rapido','Attività','Note','Analisi','Cerca','Salva','Annulla','Chiudi','Nessuna attività ancora','Nessuna nota ancora','Nessuna attività registrata','Nuova attività','Nuova nota','Timer di concentrazione','Nessun dato disponibile'],
    bn: ['শুরু করুন','বিরতি দিন','আবার শুরু করুন','রিসেট করুন','মনোযোগ','ছোট বিরতি','বড় বিরতি','দ্রুত অনুশীলন','কাজ','নোট','বিশ্লেষণ','খুঁজুন','সংরক্ষণ করুন','বাতিল করুন','বন্ধ করুন','এখনও কোনো কাজ নেই','এখনও কোনো নোট নেই','এখনও কোনো কার্যকলাপ রেকর্ড হয়নি','নতুন কাজ','নতুন নোট','মনোযোগের টাইমার','কোনো তথ্য নেই'],
    ur: ['شروع کریں','وقفہ دیں','دوبارہ شروع کریں','ری سیٹ کریں','توجہ','مختصر وقفہ','طویل وقفہ','فوری تربیت','کام','نوٹس','تجزیات','تلاش کریں','محفوظ کریں','منسوخ کریں','بند کریں','ابھی کوئی کام نہیں','ابھی کوئی نوٹ نہیں','ابھی کوئی سرگرمی درج نہیں ہوئی','نیا کام','نیا نوٹ','توجہ کا ٹائمر','کوئی ڈیٹا دستیاب نہیں'],
    fa: ['شروع','مکث','ادامه','بازنشانی','تمرکز','استراحت کوتاه','استراحت بلند','تمرین سریع','وظایف','یادداشت‌ها','تحلیل‌ها','جست‌وجو','ذخیره','لغو','بستن','هنوز وظیفه‌ای نیست','هنوز یادداشتی نیست','هنوز فعالیتی ثبت نشده است','وظیفه جدید','یادداشت جدید','زمان‌سنج تمرکز','داده‌ای موجود نیست'],
    pl: ['Rozpocznij','Wstrzymaj','Wznów','Resetuj','Skupienie','Krótka przerwa','Długa przerwa','Szybki trening','Zadania','Notatki','Analizy','Szukaj','Zapisz','Anuluj','Zamknij','Brak zadań','Brak notatek','Nie zarejestrowano aktywności','Nowe zadanie','Nowa notatka','Minutnik skupienia','Brak dostępnych danych'],
    nl: ['Starten','Pauzeren','Hervatten','Resetten','Focus','Korte pauze','Lange pauze','Snelle training','Taken','Notities','Analyse','Zoeken','Opslaan','Annuleren','Sluiten','Nog geen taken','Nog geen notities','Nog geen activiteit vastgelegd','Nieuwe taak','Nieuwe notitie','Focustimer','Geen gegevens beschikbaar']
  };
  const translations = {};
  for (const [code, values] of Object.entries(rows)) {
    if (values.length !== keys.length || values.some(x => typeof x !== 'string' || !x.trim())) {
      throw new Error('Incomplete Deep Focus v22 translations: ' + code);
    }
    translations[code] = Object.freeze(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
  }
  Object.freeze(translations);
  const rtl = Object.freeze(['ar','fa','ur']);
  const dir = code => rtl.includes(code) ? 'rtl' : 'ltr';
  const t = (code, key) => {
    if (!keys.includes(key)) return null;
    return (translations[code] || translations.en)[key];
  };
  // Optional DOM integration, intentionally never invoked automatically.
  function apply(root, code) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;
    let updated = 0;
    for (const [attr, prop] of [
      ['data-df22-i18n','textContent'],
      ['data-df22-placeholder','placeholder'],
      ['data-df22-aria-label','aria-label']
    ]) {
      for (const element of root.querySelectorAll('[' + attr + ']')) {
        const label = t(code, element.getAttribute(attr));
        if (label === null) continue;
        if (prop === 'aria-label') element.setAttribute(prop, label);
        else element[prop] = label;
        updated++;
      }
    }
    return updated;
  }
  global.DF22Locale = Object.freeze({ keys, translations, dir, t, apply });
})(typeof window === 'undefined' ? {} : window);
