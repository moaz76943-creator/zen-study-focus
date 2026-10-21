/* Quick interval training and home dashboard — independent from user study data. */
const QUICK_KEYS = [
  'focusToday','ready','running','paused','trainingTitle','trainingSubtitle',
  'rounds','work','rest','skipLastRest','exercises','exercisePlaceholder',
  'addExercise','presetTabata','presetWorkout','presetReading','presetWork',
  'skipStep','stopTraining','startTraining','todayProgress','todayPlan','viewAll',
  'chooseActivity','domainsHint','emptyPlan','workPhase','restPhase','round',
  'done','cancelPrompt','replacePrompt','invalidDuration','started','finished','quickSessions','removeExercise'
];
const QUICK_TRANSLATIONS = {
  en: ['✦ Focus space','Ready to focus','In progress','Paused','Quick training','Custom work-and-rest intervals',
    'Sets','Work (MM:SS)','Rest (MM:SS)','Skip final rest','Exercise sequence','e.g. stretches or deep reading',
    '+ Add','Intervals 20/10 seconds','Workout 4/1 minutes','Reading 20/5 minutes','Deep work 50/10 minutes','Skip phase','End training',
    '▶ Start training','✧ Your progress','Today’s plan','View all ↗','Choose your activity','A tailored session for every goal',
    'No tasks for today yet','Work','Rest','Round','Completed','End the current training session?',
    'Changing activities or modes ends your current session. Continue?','Enter valid MM:SS durations','Training started','Training completed!','Quick sessions','Remove exercise'],
  ar: ['✦ مساحة التركيز','جاهز للتركيز','الوقت يعمل','متوقف مؤقتًا','تدريب سريع','جولات عمل وراحة قابلة للتخصيص',
    'المجموعات','العمل (دقائق:ثوانٍ)','الراحة (دقائق:ثوانٍ)','تخطي الراحة الأخيرة','التمارين المتتابعة','مثل: تمارين الإطالة أو القراءة المركزة',
    '+ إضافة','جولات 20/10 ثانية','رياضة 4/1 دقائق','قراءة 20/5 دقائق','عمل 50/10 دقائق','تخطي المرحلة','إنهاء التدريب',
    '▶ ابدأ التدريب','✧ تقدمك اليوم','خطة اليوم','عرض الكل ↗','اختر نوع نشاطك','لكل نشاط جلسته المناسبة',
    'لا توجد مهام لهذا اليوم بعد','عمل','راحة','الجولة','مكتمل','هل تريد إنهاء التدريب الحالي؟',
    'تغيير النشاط أو الوضع سينهي الجلسة الحالية. هل تريد المتابعة؟','أدخل مدة صحيحة بصيغة د:ث','بدأ التدريب','اكتمل التدريب!','جلسات سريعة','حذف التمرين'],
  es: ["✦ Espacio de concentración", "Listo para concentrarte", "En curso", "En pausa", "Entrenamiento rápido", "Intervalos de trabajo y descanso personalizables", "Rondas", "Trabajo (minutos:segundos)", "Descanso (minutos:segundos)", "Omitir el último descanso", "Secuencia de ejercicios", "p. ej., estiramientos o lectura concentrada", "+ Añadir", "Intervalos 20/10 segundos", "Ejercicio 4/1 minutos", "Lectura 20/5 minutos", "Trabajo profundo 50/10 minutos", "Omitir fase", "Finalizar entrenamiento", "▶ Iniciar entrenamiento", "✧ Tu progreso", "Plan de hoy", "Ver todo ↗", "Elige tu actividad", "Una sesión adaptada a cada objetivo", "Aún no hay tareas para hoy", "Trabajo", "Descanso", "Ronda", "Completado", "¿Finalizar el entrenamiento actual?", "Cambiar de actividad o modo finaliza la sesión actual. ¿Continuar?", "Introduce duraciones válidas en minutos:segundos", "Entrenamiento iniciado", "¡Entrenamiento completado!", "Sesiones rápidas", "Eliminar ejercicio"],
  zh: ["✦ 专注空间", "准备专注", "进行中", "已暂停", "快速训练", "自定义工作与休息间隔", "组数", "工作（分钟:秒）", "休息（分钟:秒）", "跳过最后一次休息", "练习顺序", "例如伸展或专注阅读", "+ 添加", "间歇 20/10 秒", "锻炼 4/1 分钟", "阅读 20/5 分钟", "深度工作 50/10 分钟", "跳过阶段", "结束训练", "▶ 开始训练", "✧ 今日进度", "今日计划", "查看全部 ↗", "选择活动", "为每个目标设置合适的时段", "今天暂无任务", "工作", "休息", "组", "已完成", "结束当前训练？", "更改活动或模式将结束当前时段。继续吗？", "请输入有效的分钟:秒时长", "训练已开始", "训练已完成！", "快速时段", "删除练习"],
  hi: ["✦ एकाग्रता का स्थान", "एकाग्र होने के लिए तैयार", "जारी है", "रुका हुआ", "त्वरित प्रशिक्षण", "काम और विश्राम के अनुकूलित अंतराल", "चक्र", "काम (मिनट:सेकंड)", "विश्राम (मिनट:सेकंड)", "अंतिम विश्राम छोड़ें", "अभ्यास क्रम", "जैसे स्ट्रेचिंग या ध्यान से पढ़ना", "+ जोड़ें", "अंतराल 20/10 सेकंड", "व्यायाम 4/1 मिनट", "पढ़ना 20/5 मिनट", "गहन कार्य 50/10 मिनट", "चरण छोड़ें", "प्रशिक्षण समाप्त करें", "▶ प्रशिक्षण शुरू करें", "✧ आपकी प्रगति", "आज की योजना", "सभी देखें ↗", "अपनी गतिविधि चुनें", "हर लक्ष्य के लिए उपयुक्त सत्र", "आज के लिए अभी कोई कार्य नहीं", "काम", "विश्राम", "चक्र", "पूर्ण", "वर्तमान प्रशिक्षण समाप्त करें?", "गतिविधि या मोड बदलने से वर्तमान सत्र समाप्त होगा। जारी रखें?", "मिनट:सेकंड में मान्य अवधि दर्ज करें", "प्रशिक्षण शुरू हुआ", "प्रशिक्षण पूरा हुआ!", "त्वरित सत्र", "अभ्यास हटाएँ"],
  fr: ["✦ Espace de concentration", "Prêt à se concentrer", "En cours", "En pause", "Entraînement rapide", "Intervalles de travail et de repos personnalisables", "Séries", "Travail (minutes:secondes)", "Repos (minutes:secondes)", "Ignorer le dernier repos", "Suite d’exercices", "p. ex. étirements ou lecture attentive", "+ Ajouter", "Intervalles 20/10 secondes", "Exercice 4/1 minutes", "Lecture 20/5 minutes", "Travail profond 50/10 minutes", "Passer la phase", "Terminer l’entraînement", "▶ Démarrer l’entraînement", "✧ Votre progression", "Programme du jour", "Tout voir ↗", "Choisissez votre activité", "Une séance adaptée à chaque objectif", "Aucune tâche prévue aujourd’hui", "Travail", "Repos", "Série", "Terminé", "Terminer l’entraînement en cours ?", "Changer d’activité ou de mode termine la séance en cours. Continuer ?", "Saisissez des durées valides en minutes:secondes", "Entraînement démarré", "Entraînement terminé !", "Séances rapides", "Supprimer l’exercice"],
  de: ["✦ Fokusbereich", "Bereit zum Fokussieren", "Läuft", "Pausiert", "Schnelltraining", "Anpassbare Arbeits- und Pausenintervalle", "Runden", "Arbeit (Minuten:Sekunden)", "Pause (Minuten:Sekunden)", "Letzte Pause überspringen", "Übungsfolge", "z. B. Dehnen oder konzentriertes Lesen", "+ Hinzufügen", "Intervalle 20/10 Sekunden", "Training 4/1 Minuten", "Lesen 20/5 Minuten", "Konzentriertes Arbeiten 50/10 Minuten", "Phase überspringen", "Training beenden", "▶ Training starten", "✧ Dein Fortschritt", "Tagesplan", "Alle anzeigen ↗", "Aktivität auswählen", "Eine passende Sitzung für jedes Ziel", "Noch keine Aufgaben für heute", "Arbeit", "Pause", "Runde", "Abgeschlossen", "Aktuelles Training beenden?", "Ein Aktivitäts- oder Moduswechsel beendet die aktuelle Sitzung. Fortfahren?", "Gültige Dauer in Minuten:Sekunden eingeben", "Training gestartet", "Training abgeschlossen!", "Schnellsitzungen", "Übung entfernen"],
  ru: ["✦ Пространство концентрации", "Готовы сосредоточиться", "В процессе", "Приостановлено", "Быстрая тренировка", "Настраиваемые интервалы работы и отдыха", "Подходы", "Работа (минуты:секунды)", "Отдых (минуты:секунды)", "Пропустить последний отдых", "Последовательность упражнений", "например, растяжка или вдумчивое чтение", "+ Добавить", "Интервалы 20/10 секунд", "Тренировка 4/1 минут", "Чтение 20/5 минут", "Глубокая работа 50/10 минут", "Пропустить этап", "Завершить тренировку", "▶ Начать тренировку", "✧ Ваш прогресс", "План на сегодня", "Показать всё ↗", "Выберите занятие", "Подходящий сеанс для каждой цели", "На сегодня задач пока нет", "Работа", "Отдых", "Подход", "Завершено", "Завершить текущую тренировку?", "Смена занятия или режима завершит текущий сеанс. Продолжить?", "Введите допустимую длительность в минутах:секундах", "Тренировка началась", "Тренировка завершена!", "Быстрые сеансы", "Удалить упражнение"],
  pt: ["✦ Espaço de foco", "Pronto para se concentrar", "Em andamento", "Pausado", "Treino rápido", "Intervalos personalizáveis de trabalho e descanso", "Séries", "Trabalho (minutos:segundos)", "Descanso (minutos:segundos)", "Pular o último descanso", "Sequência de exercícios", "ex.: alongamento ou leitura concentrada", "+ Adicionar", "Intervalos 20/10 segundos", "Exercício 4/1 minutos", "Leitura 20/5 minutos", "Trabalho profundo 50/10 minutos", "Pular etapa", "Encerrar treino", "▶ Iniciar treino", "✧ Seu progresso", "Plano de hoje", "Ver tudo ↗", "Escolha sua atividade", "Uma sessão adequada a cada objetivo", "Ainda não há tarefas para hoje", "Trabalho", "Descanso", "Série", "Concluído", "Encerrar o treino atual?", "Mudar de atividade ou modo encerra a sessão atual. Continuar?", "Insira durações válidas em minutos:segundos", "Treino iniciado", "Treino concluído!", "Sessões rápidas", "Remover exercício"],
  ja: ["✦ 集中スペース", "集中の準備ができました", "進行中", "一時停止中", "クイックトレーニング", "作業と休憩の間隔をカスタマイズ", "セット数", "作業（分:秒）", "休憩（分:秒）", "最後の休憩をスキップ", "エクササイズの順序", "例：ストレッチや集中して読む", "+ 追加", "インターバル 20/10 秒", "運動 4/1 分", "読書 20/5 分", "集中作業 50/10 分", "段階をスキップ", "トレーニングを終了", "▶ トレーニング開始", "✧ 今日の進捗", "今日の予定", "すべて表示 ↗", "活動を選択", "目標に合ったセッション", "今日のタスクはまだありません", "作業", "休憩", "セット", "完了", "現在のトレーニングを終了しますか？", "活動やモードを変更すると現在のセッションが終了します。続行しますか？", "有効な分:秒の時間を入力してください", "トレーニングを開始しました", "トレーニングが完了しました！", "クイックセッション", "エクササイズを削除"],
  id: ["✦ Ruang fokus", "Siap fokus", "Berlangsung", "Dijeda", "Latihan cepat", "Interval kerja dan istirahat yang dapat disesuaikan", "Putaran", "Kerja (menit:detik)", "Istirahat (menit:detik)", "Lewati istirahat terakhir", "Urutan latihan", "mis. peregangan atau membaca mendalam", "+ Tambah", "Interval 20/10 detik", "Olahraga 4/1 menit", "Membaca 20/5 menit", "Kerja mendalam 50/10 menit", "Lewati tahap", "Akhiri latihan", "▶ Mulai latihan", "✧ Progres Anda", "Rencana hari ini", "Lihat semua ↗", "Pilih aktivitas", "Sesi yang sesuai untuk setiap tujuan", "Belum ada tugas untuk hari ini", "Kerja", "Istirahat", "Putaran", "Selesai", "Akhiri latihan saat ini?", "Mengubah aktivitas atau mode mengakhiri sesi saat ini. Lanjutkan?", "Masukkan durasi menit:detik yang valid", "Latihan dimulai", "Latihan selesai!", "Sesi cepat", "Hapus latihan"],
  tr: ["✦ Odak alanı", "Odaklanmaya hazır", "Devam ediyor", "Duraklatıldı", "Hızlı antrenman", "Özelleştirilebilir çalışma ve dinlenme aralıkları", "Setler", "Çalışma (dakika:saniye)", "Dinlenme (dakika:saniye)", "Son dinlenmeyi atla", "Egzersiz sırası", "ör. esneme veya odaklı okuma", "+ Ekle", "Aralıklar 20/10 saniye", "Egzersiz 4/1 dakika", "Okuma 20/5 dakika", "Derin çalışma 50/10 dakika", "Aşamayı atla", "Antrenmanı bitir", "▶ Antrenmanı başlat", "✧ İlerlemeniz", "Bugünün planı", "Tümünü gör ↗", "Etkinliğinizi seçin", "Her hedefe uygun bir oturum", "Bugün için henüz görev yok", "Çalışma", "Dinlenme", "Set", "Tamamlandı", "Mevcut antrenman bitirilsin mi?", "Etkinlik veya mod değişikliği mevcut oturumu bitirir. Devam edilsin mi?", "Geçerli dakika:saniye süreleri girin", "Antrenman başladı", "Antrenman tamamlandı!", "Hızlı oturumlar", "Egzersizi kaldır"],
  ko: ["✦ 집중 공간", "집중할 준비 완료", "진행 중", "일시 정지", "빠른 훈련", "작업 및 휴식 간격 맞춤 설정", "세트", "작업 (분:초)", "휴식 (분:초)", "마지막 휴식 건너뛰기", "운동 순서", "예: 스트레칭 또는 집중 독서", "+ 추가", "인터벌 20/10초", "운동 4/1분", "독서 20/5분", "몰입 작업 50/10분", "단계 건너뛰기", "훈련 종료", "▶ 훈련 시작", "✧ 오늘의 진행 상황", "오늘의 계획", "모두 보기 ↗", "활동 선택", "목표에 맞는 세션", "오늘의 작업이 아직 없습니다", "작업", "휴식", "세트", "완료", "현재 훈련을 종료할까요?", "활동이나 모드를 변경하면 현재 세션이 종료됩니다. 계속할까요?", "올바른 분:초 시간을 입력하세요", "훈련이 시작되었습니다", "훈련 완료!", "빠른 세션", "운동 삭제"],
  vi: ["✦ Không gian tập trung", "Sẵn sàng tập trung", "Đang thực hiện", "Đã tạm dừng", "Luyện tập nhanh", "Tùy chỉnh khoảng làm việc và nghỉ", "Hiệp", "Làm việc (phút:giây)", "Nghỉ (phút:giây)", "Bỏ qua lần nghỉ cuối", "Chuỗi bài tập", "ví dụ: giãn cơ hoặc đọc tập trung", "+ Thêm", "Ngắt quãng 20/10 giây", "Tập luyện 4/1 phút", "Đọc 20/5 phút", "Làm việc sâu 50/10 phút", "Bỏ qua giai đoạn", "Kết thúc luyện tập", "▶ Bắt đầu luyện tập", "✧ Tiến độ của bạn", "Kế hoạch hôm nay", "Xem tất cả ↗", "Chọn hoạt động", "Phiên phù hợp với từng mục tiêu", "Chưa có nhiệm vụ cho hôm nay", "Làm việc", "Nghỉ", "Hiệp", "Hoàn thành", "Kết thúc buổi luyện tập hiện tại?", "Đổi hoạt động hoặc chế độ sẽ kết thúc phiên hiện tại. Tiếp tục?", "Nhập thời lượng hợp lệ theo phút:giây", "Đã bắt đầu luyện tập", "Đã hoàn thành luyện tập!", "Phiên nhanh", "Xóa bài tập"],
  it: ["✦ Spazio di concentrazione", "Pronto a concentrarti", "In corso", "In pausa", "Allenamento rapido", "Intervalli di lavoro e riposo personalizzabili", "Serie", "Lavoro (minuti:secondi)", "Riposo (minuti:secondi)", "Salta l’ultimo riposo", "Sequenza di esercizi", "es. stretching o lettura concentrata", "+ Aggiungi", "Intervalli 20/10 secondi", "Esercizio 4/1 minuti", "Lettura 20/5 minuti", "Lavoro profondo 50/10 minuti", "Salta fase", "Termina allenamento", "▶ Avvia allenamento", "✧ I tuoi progressi", "Piano di oggi", "Mostra tutto ↗", "Scegli l’attività", "Una sessione adatta a ogni obiettivo", "Nessuna attività prevista per oggi", "Lavoro", "Riposo", "Serie", "Completato", "Terminare l’allenamento attuale?", "Cambiare attività o modalità termina la sessione attuale. Continuare?", "Inserisci durate valide in minuti:secondi", "Allenamento avviato", "Allenamento completato!", "Sessioni rapide", "Rimuovi esercizio"],
  bn: ["✦ মনোযোগের স্থান", "মনোযোগের জন্য প্রস্তুত", "চলছে", "বিরতিতে", "দ্রুত প্রশিক্ষণ", "কাজ ও বিশ্রামের সময় নিজের মতো ঠিক করুন", "পর্ব", "কাজ (মিনিট:সেকেন্ড)", "বিশ্রাম (মিনিট:সেকেন্ড)", "শেষ বিশ্রাম বাদ দিন", "অনুশীলনের ক্রম", "যেমন স্ট্রেচিং বা মনোযোগ দিয়ে পড়া", "+ যোগ করুন", "বিরতি 20/10 সেকেন্ড", "ব্যায়াম 4/1 মিনিট", "পড়া 20/5 মিনিট", "গভীর কাজ 50/10 মিনিট", "ধাপ বাদ দিন", "প্রশিক্ষণ শেষ করুন", "▶ প্রশিক্ষণ শুরু করুন", "✧ আপনার অগ্রগতি", "আজকের পরিকল্পনা", "সব দেখুন ↗", "কার্যকলাপ বেছে নিন", "প্রতিটি লক্ষ্যের জন্য উপযুক্ত সেশন", "আজকের জন্য এখনও কোনো কাজ নেই", "কাজ", "বিশ্রাম", "পর্ব", "সম্পন্ন", "বর্তমান প্রশিক্ষণ শেষ করবেন?", "কার্যকলাপ বা মোড বদলালে বর্তমান সেশন শেষ হবে। চালিয়ে যাবেন?", "মিনিট:সেকেন্ডে সঠিক সময় লিখুন", "প্রশিক্ষণ শুরু হয়েছে", "প্রশিক্ষণ সম্পন্ন!", "দ্রুত সেশন", "অনুশীলন সরান"],
  ur: ["✦ توجہ کی جگہ", "توجہ کے لیے تیار", "جاری ہے", "موقوف", "فوری تربیت", "کام اور آرام کے قابل ترتیب وقفے", "دور", "کام (منٹ:سیکنڈ)", "آرام (منٹ:سیکنڈ)", "آخری آرام چھوڑ دیں", "مشقوں کی ترتیب", "مثلاً کھنچاؤ یا توجہ سے مطالعہ", "+ شامل کریں", "وقفے 20/10 سیکنڈ", "ورزش 4/1 منٹ", "مطالعہ 20/5 منٹ", "گہرا کام 50/10 منٹ", "مرحلہ چھوڑیں", "تربیت ختم کریں", "▶ تربیت شروع کریں", "✧ آپ کی پیش رفت", "آج کا منصوبہ", "سب دیکھیں ↗", "سرگرمی منتخب کریں", "ہر ہدف کے لیے موزوں سیشن", "آج کے لیے ابھی کوئی کام نہیں", "کام", "آرام", "دور", "مکمل", "موجودہ تربیت ختم کریں؟", "سرگرمی یا موڈ بدلنے سے موجودہ سیشن ختم ہو جائے گا۔ جاری رکھیں؟", "منٹ:سیکنڈ میں درست دورانیہ درج کریں", "تربیت شروع ہو گئی", "تربیت مکمل ہو گئی!", "فوری سیشن", "مشق ہٹائیں"],
  fa: ["✦ فضای تمرکز", "آماده تمرکز", "در حال اجرا", "متوقف‌شده", "تمرین سریع", "بازه‌های قابل تنظیم کار و استراحت", "دورها", "کار (دقیقه:ثانیه)", "استراحت (دقیقه:ثانیه)", "رد کردن استراحت پایانی", "ترتیب تمرین‌ها", "مثلاً حرکات کششی یا مطالعه متمرکز", "+ افزودن", "بازه‌های 20/10 ثانیه", "ورزش 4/1 دقیقه", "مطالعه 20/5 دقیقه", "کار عمیق 50/10 دقیقه", "رد کردن مرحله", "پایان تمرین", "▶ شروع تمرین", "✧ پیشرفت شما", "برنامه امروز", "نمایش همه ↗", "فعالیت را انتخاب کنید", "جلسه‌ای مناسب برای هر هدف", "هنوز کاری برای امروز نیست", "کار", "استراحت", "دور", "تکمیل‌شده", "تمرین فعلی پایان یابد؟", "تغییر فعالیت یا حالت، جلسه فعلی را پایان می‌دهد. ادامه می‌دهید؟", "مدت معتبر به صورت دقیقه:ثانیه وارد کنید", "تمرین شروع شد", "تمرین تکمیل شد!", "جلسه‌های سریع", "حذف تمرین"],
  pl: ["✦ Przestrzeń skupienia", "Gotowość do skupienia", "W toku", "Wstrzymano", "Szybki trening", "Własne interwały pracy i odpoczynku", "Serie", "Praca (minuty:sekundy)", "Odpoczynek (minuty:sekundy)", "Pomiń ostatni odpoczynek", "Kolejność ćwiczeń", "np. rozciąganie lub uważne czytanie", "+ Dodaj", "Interwały 20/10 sekund", "Ćwiczenia 4/1 minut", "Czytanie 20/5 minut", "Głęboka praca 50/10 minut", "Pomiń etap", "Zakończ trening", "▶ Rozpocznij trening", "✧ Twoje postępy", "Plan na dziś", "Pokaż wszystko ↗", "Wybierz aktywność", "Sesja dopasowana do każdego celu", "Brak zadań na dziś", "Praca", "Odpoczynek", "Seria", "Ukończono", "Zakończyć bieżący trening?", "Zmiana aktywności lub trybu zakończy bieżącą sesję. Kontynuować?", "Wpisz poprawny czas w minutach:sekundach", "Trening rozpoczęty", "Trening ukończony!", "Szybkie sesje", "Usuń ćwiczenie"],
  nl: ["✦ Focusruimte", "Klaar om te focussen", "Bezig", "Gepauzeerd", "Snelle training", "Aanpasbare werk- en rustintervallen", "Rondes", "Werk (minuten:seconden)", "Rust (minuten:seconden)", "Laatste rust overslaan", "Oefeningenreeks", "bijv. rekken of aandachtig lezen", "+ Toevoegen", "Intervallen 20/10 seconden", "Training 4/1 minuten", "Lezen 20/5 minuten", "Diep werk 50/10 minuten", "Fase overslaan", "Training beëindigen", "▶ Training starten", "✧ Je voortgang", "Plan voor vandaag", "Alles bekijken ↗", "Kies je activiteit", "Een passende sessie voor elk doel", "Nog geen taken voor vandaag", "Werk", "Rust", "Ronde", "Voltooid", "De huidige training beëindigen?", "Een andere activiteit of modus beëindigt de huidige sessie. Doorgaan?", "Voer geldige tijden in als minuten:seconden", "Training gestart", "Training voltooid!", "Snelle sessies", "Oefening verwijderen"]
};
let quickTraining = null;
let quickInternalChange = false;
let quickExercises = [];
let quickPresetDomain = 'sport';
const QUICK_CFG_KEY = 'zen_quick_training_cfg_v21';
/* Task identity is always the original numeric v21 task ID (never a display label).
   app.js focusOnTask will call this method through a lane-00 integration patch. */
let focusWorkflowLinkedTaskId = null;
function focusWorkflowGetLinkedTask(id=focusWorkflowLinkedTaskId) {
 if(!Number.isSafeInteger(id)||id<0||typeof tasksList==='undefined'||!Array.isArray(tasksList))return null;
 return tasksList.find(t=>t&&t.id===id&&t.isStarter!==true)||null;
}
function focusWorkflowLinkTask(id) {
 if(quickTraining?.active)return false;
 if(id===null) { focusWorkflowLinkedTaskId=null;return true; }
 if(!focusWorkflowGetLinkedTask(id))return false;
 focusWorkflowLinkedTaskId=id;
 return true;
}
/* Events are a notification contract, NOT a second accounting ledger.
   Only the v21 completed session record carries earned minutes. */
function quickWorkflowEvent(kind, details={}) {
 if(typeof CustomEvent!=='function'||typeof window.dispatchEvent!=='function')return;
 const body={schemaVersion:1,kind,source:'quick-training',
   ...details};
 window.dispatchEvent(new CustomEvent('deep-focus:workflow',{detail:body}));
}

function quickText(key) {
  const values = QUICK_TRANSLATIONS[cfg.lang] || QUICK_TRANSLATIONS.en;
  const idx = QUICK_KEYS.indexOf(key);
  return idx < 0 ? key : values[idx] || QUICK_TRANSLATIONS.en[idx];
}
function quickL10n() {
  document.querySelectorAll('[data-qt]').forEach(el => {
    el.textContent = quickText(el.getAttribute('data-qt'));
  });
  document.querySelectorAll('[data-qt-placeholder]').forEach(el => {
    el.placeholder = quickText(el.getAttribute('data-qt-placeholder'));
  });
  renderQuickTraining();
  renderTodayPlan();
  updateFocusStatus();
}
function timeString(seconds) {
  const n = Math.max(0, Math.floor(seconds));
  return String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
}
function parseQuickTime(raw, allowZero = false, max = 14400) {
  const value = toWest(String(raw||'').trim());
  const match = value.match(/^(\d{1,3}):(\d{2})$/);
  let seconds = NaN;
  if (match && Number(match[2]) < 60) seconds = Number(match[1])*60 + Number(match[2]);
  else if (/^\d{1,3}$/.test(value)) seconds = Number(value)*60;
  if (!Number.isFinite(seconds) || seconds > max || seconds < (allowZero?0:1)) return null;
  return seconds;
}
function validQuickSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || raw.active !== true) return null;
  if (!Number.isInteger(raw.sets) || raw.sets<1 || raw.sets>99 ||
      !Number.isInteger(raw.workSeconds) || raw.workSeconds<1 || raw.workSeconds>14400 ||
      !Number.isInteger(raw.restSeconds) || raw.restSeconds<0 || raw.restSeconds>3600 ||
      !Number.isInteger(raw.currentSet) || raw.currentSet<0 || raw.currentSet>=raw.sets ||
      !['work','rest'].includes(raw.phase) || typeof raw.skipLastRest !== 'boolean' ||
      !['study','sport','read','work'].includes(raw.domain)) return null;
  return {
    active:true, sets:raw.sets, workSeconds:raw.workSeconds,restSeconds:raw.restSeconds,
    currentSet:raw.currentSet,phase:raw.phase,skipLastRest:raw.skipLastRest,
    domain:raw.domain,
    taskId:Number.isSafeInteger(raw.taskId)&&raw.taskId>=0?raw.taskId:null,
    exercises:Array.isArray(raw.exercises)?raw.exercises.filter(x=>typeof x==='string').slice(0,24).map(x=>x.slice(0,70)):[]
  };
}
function saveQuickConfig() {
  saveFortressData(QUICK_CFG_KEY,{
    exercises:quickExercises.slice(0,24),
    domain:quickPresetDomain,
    sets:document.getElementById('qtSets').value,
    work:document.getElementById('qtWork').value,
    rest:document.getElementById('qtRest').value,
    skip:document.getElementById('qtSkipLast').checked
  });
}
function initQuickTraining() {
  const saved=loadFortressData(QUICK_CFG_KEY,null);
  if(saved && typeof saved === 'object') {
    if(Array.isArray(saved.exercises))
      quickExercises = saved.exercises.filter(x=>typeof x==='string').slice(0,24).map(x=>x.slice(0,70));
    if(['sport','study','read','work'].includes(saved.domain))quickPresetDomain=saved.domain;
    for(const [k,id] of [['sets','qtSets'],['work','qtWork'],['rest','qtRest']]) {
      if(typeof saved[k]==='string' && saved[k].length<=6)
        document.getElementById(id).value=saved[k];
    }
    if(typeof saved.skip==='boolean')document.getElementById('qtSkipLast').checked=saved.skip;
  }
  for(const id of ['qtSets','qtWork','qtRest','qtSkipLast'])
    document.getElementById(id).addEventListener('change',saveQuickConfig);
  quickL10n();
}
function renderQuickTraining() {
  const list=document.getElementById('qtExerciseList');
  if(!list)return;
  list.textContent='';
  quickExercises.forEach((name,idx)=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=name+' ×';
    button.title=quickText('removeExercise');
    button.setAttribute('aria-label',quickText('removeExercise')+': '+name);
    button.onclick=()=>removeQuickExercise(idx);
    list.appendChild(button);
  });
  document.getElementById('qtExerciseCount').textContent=String(quickExercises.length);
  const panel=document.getElementById('qtProgressPanel');
  const started=!!(quickTraining && quickTraining.active);
  panel.hidden=!started;
  document.getElementById('qtStartButton').disabled=started;
  document.getElementById('qtStartButton').style.opacity=started?'.45':'1';
  if(!started)return;
  const q=quickTraining;
  const name=q.exercises.length ? q.exercises[q.currentSet%q.exercises.length] : '';
  document.getElementById('qtProgressTitle').textContent=
    quickText(q.phase==='work'?'workPhase':'restPhase')+' · '+
    quickText('round')+' '+(q.currentSet+1)+'/'+q.sets+(name?' · '+name:'');
  const progress=(q.currentSet+(q.phase==='rest'?.5:0))/q.sets*100;
  document.getElementById('qtProgressFill').style.width=Math.min(100,progress).toFixed(1)+'%';
  document.getElementById('quickTrainingDetails').open=true;
}
function addQuickExercise() {
  const el=document.getElementById('qtNewExercise');
  const name=String(el.value||'').trim().slice(0,70);
  if(!name || quickExercises.length>=24)return;
  quickExercises.push(name);
  el.value='';
  saveQuickConfig();
  renderQuickTraining();
}
function removeQuickExercise(index) {
  quickExercises.splice(index,1);saveQuickConfig();renderQuickTraining();
}
function applyQuickTrainingPreset(id) {
  if(quickTraining?.active) {
    showToast(quickText('replacePrompt'));return;
  }
  const presets={
    tabata:[8,20,10,'sport'],
    workout:[4,240,60,'sport'],
    reading:[3,1200,300,'read'],
    work:[2,3000,600,'work']
  };
  const p=presets[id];if(!p)return;
  document.getElementById('qtSets').value=String(p[0]);
  document.getElementById('qtWork').value=timeString(p[1]);
  document.getElementById('qtRest').value=timeString(p[2]);
  quickPresetDomain=p[3];saveQuickConfig();
}
function startQuickTraining() {
  if(quickTraining?.active)return;
  const sets=Number(toWest(document.getElementById('qtSets').value.trim()));
  const workSeconds=parseQuickTime(document.getElementById('qtWork').value,false,14400);
  const restSeconds=parseQuickTime(document.getElementById('qtRest').value,true,3600);
  if(!Number.isInteger(sets) || sets<1 || sets>99 || workSeconds===null || restSeconds===null){
    showToast(quickText('invalidDuration'));return;
  }
  if(timerRunning || timerSessionId!==null) {
    if(!window.confirm(quickText('replacePrompt')))return;
  }
  // A native/dual-copy write can fail. Do not interrupt an existing timer or
  // claim a training session until the new activity is durably acknowledged.
  const nextCfg={...cfg,domain:quickPresetDomain};
  try {
    if(saveFortressData('zen_fortress_cfg_v21',nextCfg)!==true)
      throw new Error('QUICK_ACTIVITY_SAVE_NOT_ACKNOWLEDGED');
  } catch (_) {
    showToast(L().saveFailed || (cfg.lang==='ar'
      ? 'تعذّر حفظ النشاط. حاول مرة أخرى.'
      : 'Could not save activity. Try again.'));
    return false;
  }
  if(timerRunning)toggleTimerPlay();
  cfg.domain=quickPresetDomain;
  quickTraining={
    active:true,sets,workSeconds,restSeconds,currentSet:0,phase:'work',
    skipLastRest:document.getElementById('qtSkipLast').checked,
    exercises:quickExercises.slice(),domain:quickPresetDomain,
    taskId:focusWorkflowGetLinkedTask()?.id ?? null
  };
  renderDomainState();
  quickInternalChange=true;
  selectTimerMode(workSeconds/60,'focus',document.getElementById('modeFocusBtn'));
  quickInternalChange=false;
  saveQuickConfig();
  toggleTimerPlay();
  renderQuickTraining();
  showToast(quickText('started'));
  quickWorkflowEvent('started',{domain:quickTraining.domain,taskId:quickTraining.taskId,
    sets:quickTraining.sets,workSeconds:quickTraining.workSeconds,restSeconds:quickTraining.restSeconds});
}
function stopQuickTrainingInternal() {
  quickTraining=null;
  if(timerRunning)toggleTimerPlay();
  selectTimerMode(getDomainFocusMinutes(),'focus',document.getElementById('modeFocusBtn'));
  renderQuickTraining();
}
function cancelQuickTraining(skipPrompt=false) {
  if(!quickTraining?.active)return;
  if(!skipPrompt&&!window.confirm(quickText('cancelPrompt')))return;
  const ended=quickTraining;
  quickTraining=null;
  stopQuickTrainingInternal();
  quickWorkflowEvent('cancelled',{domain:ended.domain,taskId:ended.taskId??null,
    completedSets:ended.currentSet});
}
function skipQuickTrainingStep() {
  if(!quickTraining?.active)return;
  if(timerRunning)toggleTimerPlay();
  // A skipped work step never earns focus credit.
  advanceQuickTrainingStep();
}
function completeQuickTraining() {
  const finished=quickTraining;
  const domain = quickTraining?.domain || cfg.domain || 'study';
  quickTraining = null;
  quickInternalChange = true;
  selectTimerMode(getDomainFocusMinutes(domain),'focus',document.getElementById('modeFocusBtn'));
  quickInternalChange = false;
  renderQuickTraining();
  showToast(quickText('finished'));
  if(finished)quickWorkflowEvent('completed',{domain,taskId:finished.taskId??null,sets:finished.sets});
}
function advanceQuickTrainingStep() {
  const q=quickTraining;
  if(!q?.active)return false;
  if(q.phase==='work') {
    if(q.restSeconds>0 && (q.currentSet<q.sets-1 || !q.skipLastRest)) {
      q.phase='rest';
    } else if(q.currentSet<q.sets-1) {
      q.currentSet++;q.phase='work';
    } else {
      completeQuickTraining();
      return false;
    }
  } else {
    if(q.currentSet===q.sets-1){
      completeQuickTraining();
      return false;
    }
    q.currentSet++;q.phase='work';
  }
  quickInternalChange=true;
  const phase=q.phase==='work'?'focus':'short';
  selectTimerMode((q.phase==='work'?q.workSeconds:q.restSeconds)/60,phase,
    document.getElementById(q.phase==='work'?'modeFocusBtn':'modeShortBtn'));
  quickInternalChange=false;
  toggleTimerPlay();
  renderQuickTraining();
  quickWorkflowEvent('phase',{domain:q.domain,taskId:q.taskId??null,
    phase:q.phase,set:q.currentSet+1,sets:q.sets});
  return true;
}
function updateFocusStatus() {
  const el=document.getElementById('focusStatusLabel');
  if(el)el.textContent=quickText(timerRunning?'running':timerSessionId?'paused':'ready');
}
/* Real seven-day navigation: dates come from the local calendar, never demo data. */
function renderHomeWeekStrip() {
  const strip = document.getElementById('homeWeekStrip');
  if (!strip) return;
  strip.textContent = '';
  const now = new Date();
  const start = (now.getDay() + 6) % 7; // Monday-first week
  const today = localDateISO(now);
  const weekdays = L().weekdays;
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - start + offset);
    const iso = localDateISO(date);
    const weekday = weekdays[date.getDay()] || '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-week-day';
    button.setAttribute('aria-current', iso === today ? 'date' : 'false');
    button.setAttribute('aria-label', toWest(weekday + ' ' + iso));
    const dayName = document.createElement('span');
    dayName.textContent = weekday.slice(0, 3);
    const dayNumber = document.createElement('span');
    dayNumber.className = 'home-week-number';
    dayNumber.textContent = toWest(String(date.getDate()));
    button.appendChild(dayName);
    button.appendChild(dayNumber);
    button.onclick = () => goToHomeAgenda(iso);
    strip.appendChild(button);
  }
}
function goToHomeAgenda(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  if (target.getFullYear() !== year || target.getMonth() !== month - 1 ||
      target.getDate() !== day) return false;
  selectedCalDate = iso;
  calYear = year;
  calMonth = month - 1;
  switchTab('sec-calendar', document.getElementById('navCalendar'));
  renderCalendar();
  return true;
}

function renderTodayPlan() {
  const box = document.getElementById('todayPlanPreview');
  if (!box || typeof tasksList === 'undefined') return;
  renderHomeWeekStrip();
  const today = localDateISO();
  // Starter examples belong to the tasks showcase, not the user's actual daily plan.
  const dated = tasksList.filter(t => t && t.date === today && t.isStarter !== true);
  const complete = dated.filter(t => t.done).length;
  const progress = dated.length ? Math.round(complete / dated.length * 100) : 0;
  document.getElementById('todayPlanRatio').textContent = complete + '/' + dated.length;
  document.getElementById('todayPlanPercent').textContent = progress + '%';
  document.getElementById('todayPlanFill').style.width = progress + '%';
  box.textContent = '';
  if (!dated.length) {
    const empty = document.createElement('div');
    empty.className = 'today-plan-entry';
    empty.textContent = quickText('emptyPlan');
    box.appendChild(empty);
    return;
  }
  dated.slice(0, 3).forEach(t => {
    const row = document.createElement('div');
    row.className = 'today-plan-entry';
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'today-plan-check';
    check.textContent = t.done ? '✓' : '○';
    check.setAttribute('aria-pressed', String(Boolean(t.done)));
    check.setAttribute('aria-label',
      (cfg.lang === 'ar' ? 'تغيير إنجاز المهمة: ' : 'Toggle completion: ') + (t.title || ''));
    check.onclick = () => toggleTaskDone(t.id);

    const focus = document.createElement('button');
    focus.type = 'button';
    focus.className = 'today-plan-link';
    focus.setAttribute('aria-label',
      (cfg.lang === 'ar' ? 'التركيز على: ' : 'Focus on: ') + (t.title || ''));
    const name = document.createElement('span');
    name.className = 'today-plan-task-name';
    name.textContent = t.title || '';
    const details = document.createElement('small');
    details.className = 'today-plan-task-detail';
    details.textContent = getCatLabel(t.catKey) + (t.time ? ' · ' + t.time : '');
    focus.appendChild(name);
    focus.appendChild(details);
    focus.onclick = () => focusOnTask(t.id);
    row.appendChild(check);
    row.appendChild(focus);
    box.appendChild(row);
  });
}
