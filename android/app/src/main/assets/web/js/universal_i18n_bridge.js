/**
 * DEEP FOCUS — Universal 100-Locale Translation Resolver & Bridge
 * File: android/app/src/main/assets/web/js/universal_i18n_bridge.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UniversalI18nBridge = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isExcludedLocale(locale) {
    if (!locale || typeof locale !== 'string') return false;
    var norm = locale.trim().toLowerCase().replace('_', '-');
    return norm === 'he' || norm === 'iw' || norm.indexOf('he-') === 0 || norm.indexOf('iw-') === 0;
  }

  var CANONICAL_FALLBACK = 'en';

  var DICTIONARIES = {
    'en': {
      'common.cycle': 'Cycle',
      'common.of': 'of',
      'common.seconds_suffix': 's',
      'common.channels': 'CHANNELS',
      'common.nature_blends': 'NATURE SOUND BLENDS',

      'preset.quiet_library.name': 'Quiet Library',
      'preset.quiet_library.desc': 'Serene academic quietude with gentle page turns, soft pendulum clock ticks, and distant rain.',
      'preset.study_cafe.name': 'Cozy Study Cafe',
      'preset.study_cafe.desc': 'Warm background chatter blend with rain on glass and soft typing clicks for creative momentum.',
      'preset.forest_cabin.name': 'Forest Cabin & Hearth',
      'preset.forest_cabin.desc': 'Crackling fireside warmth wrapped in pine breezes and forest streams for soothing evening study.',
      'preset.deep_noise_isolation.name': 'Deep Noise Isolation',
      'preset.deep_noise_isolation.desc': 'Dense multi-frequency acoustic barrier cutting through household chatter and loud street distractions.',
      'preset.zen_sanctuary.name': 'Zen Temple Sanctuary',
      'preset.zen_sanctuary.desc': 'Bamboo rustle, Japanese bamboo water fountain drops, and meditative drone for resetting mental fatigue.',
      'preset.midnight_study_train.name': 'Midnight Study Train',
      'preset.midnight_study_train.desc': 'Steady rhythmic railway hum through heavy night rain, creating an uninterrupted trance of focus.',
      'preset.autumn_wilderness.name': 'Autumn Breeze Wilderness',
      'preset.autumn_wilderness.desc': 'Crisp autumn foliage winds, morning forest birds, and clear mountain stream for fresh dawn sessions.',
      'preset.coastal_deep_flow.name': 'Coastal Deep Flow',
      'preset.coastal_deep_flow.desc': 'Rhythmic ocean surf pulses combined with water mist and soft drone for big-picture thesis writing.',

      'category.academic': 'ACADEMIC',
      'category.productivity': 'PRODUCTIVITY',
      'category.calm': 'CALM',
      'category.shield': 'SHIELD',
      'category.mindfulness': 'MINDFULNESS',
      'category.rhythm': 'RHYTHM',
      'category.fresh': 'FRESH',
      'category.expansive': 'EXPANSIVE',

      'breath.box_breathing.name': 'Box Breathing (4-4-4-4)',
      'breath.box_breathing.desc': 'Equal 4s phases for instant mental clarity and sharp focus before demanding study sprints.',
      'breath.calming_4_7_8.name': 'Relaxing 4-7-8 Breath',
      'breath.calming_4_7_8.desc': 'Extended 8s exhale activates parasympathetic calmness for unwinding after intense study.',
      'breath.resonant_coherence.name': 'Resonant Coherence (5-5)',
      'breath.resonant_coherence.desc': 'Smooth 5s inhale and exhale rhythm syncing mental pace for sustained deep flow.',
      'breath.refresh_energizer.name': 'Quick Energizer (4-2-4)',
      'breath.refresh_energizer.desc': 'Crisp rhythm to awaken alertness and break through afternoon study lethargy.',

      'breath.phase.inhale': 'Deep Inhale',
      'breath.phase.hold_in': 'Hold Breath',
      'breath.phase.exhale': 'Slow Exhale',
      'breath.phase.hold_out': 'Rest & Hold',
      'breath.phase.inhale_quiet': 'Inhale Quietly',
      'breath.phase.hold_gentle': 'Hold Gently',
      'breath.phase.exhale_slow': 'Exhale Completely',
      'breath.phase.flow_inhale': 'Smooth Inhale',
      'breath.phase.flow_exhale': 'Smooth Exhale',
      'breath.phase.brisk_inhale': 'Brisk Inhale',
      'breath.phase.brief_hold': 'Brief Hold',
      'breath.phase.firm_exhale': 'Firm Exhale',

      'csv.col.id': 'id',
      'csv.col.date': 'date',
      'csv.col.timestamp': 'timestamp',
      'csv.col.duration_minutes': 'duration_minutes',
      'csv.col.tag': 'tag',
      'csv.col.task_name': 'task_name',
      'csv.col.mode': 'mode',
      'csv.col.interrupted': 'interrupted',
      'csv.col.sound_environment': 'sound_environment',
      'csv.col.reflection_notes': 'reflection_notes',

      'notification.action.pause': 'Pause',
      'notification.action.resume': 'Resume',
      'notification.action.finish': 'Finish',
      'notification.action.add_5m': '+5 Min',
      'notification.status.focusing': 'Focus in Progress',
      'notification.status.paused': 'Session Paused',
      'notification.status.break': 'Rest & Recharge',

      'power_saver.status.active': 'Power Saver Active',
      'power_saver.status.charging': 'Device Charging',
      'power_saver.status.normal': 'Standard Performance',
      'power_saver.mode.auto': 'Auto (<= 20%)',
      'power_saver.mode.always_on': 'Always On',
      'power_saver.mode.always_off': 'Always Off',

      'digest.header.title': 'DAILY FOCUS DIGEST',
      'digest.metric.minutes': 'MINUTES OF FOCUS',
      'digest.metric.sessions': 'SESSIONS',
      'digest.metric.rate': 'FOCUS RATE',
      'digest.metric.top_subject': 'TOP SUBJECT',

      'goals.header.weekly': 'WEEKLY STUDY GOAL',
      'goals.label.completed': 'HOURS COMPLETED',
      'goals.label.run_rate': 'DAILY RUN RATE NEEDED',
      'goals.pace.ahead': 'Ahead of Schedule',
      'goals.pace.on_track': 'On Track',
      'goals.pace.behind': 'Catch Up Needed',

      'stretch.neck_shoulder.name': 'Neck & Shoulder Release',
      'stretch.neck_shoulder.desc': 'Gentle lateral neck flexions and backward shoulder rolls to relieve study hunching.',
      'stretch.wrist_forearm.name': 'Wrist & Forearm Refresh',
      'stretch.wrist_forearm.desc': 'Gentle wrist extensor flexions and finger spreads to ease writing and keyboard fatigue.',
      'stretch.upper_back.name': 'Upper Back & Chest Opener',
      'stretch.upper_back.desc': 'Interlacing fingers behind back with gentle chest expansion to restore upright posture.',
      'stretch.spinal_twist.name': 'Seated Gentle Spinal Twist',
      'stretch.spinal_twist.desc': 'Slow chair rotation to enhance thoracic spine mobility and relieve sitting pressure.',
      'stretch.hip_flexor.name': 'Standing Hip Flexor Stretch',
      'stretch.hip_flexor.desc': 'Standing step-back stretch to open hip flexors after prolonged sitting.',
      'stretch.eye_palming.name': '20-20-20 Eye Palming Rest',
      'stretch.eye_palming.desc': 'Warm palm covering over eyes while gazing into distance to relieve screen strain.',
      'stretch.routine.quick_2min.title': 'Quick 2-Minute Desk Reset',
      'stretch.routine.quick_2min.desc': 'Essential neck, wrist, and eye refresh between short pomodoro sprints.',
      'stretch.routine.full_5min.title': 'Full 5-Minute Posture Reboot',
      'stretch.routine.full_5min.desc': 'Comprehensive seated and standing mobility sequence for long study blocks.',
      'stretch.routine.screen_relief.title': 'Screen Fatigue Relief',
      'stretch.routine.screen_relief.desc': 'Focused eye rest, neck alignment, and chest opening for intense reading.',
      'stretch.badge.mobility': 'DESK MOBILITY',
      'stretch.label.duration': 'DURATION',

      'flip.action.flip_to_pause': 'Flip to Pause / Mute',
      'flip.action.flip_to_focus': 'Flip to Focus',
      'flip.action.disabled': 'Disabled',
      'flip.status.face_down': 'Phone Face Down',
      'flip.status.face_up': 'Phone Face Up',

      'diag.status.healthy': 'System Fully Healthy',
      'diag.status.degraded': 'Performance Degraded',
      'diag.status.critical': 'Critical Issues Detected',
      'diag.action.snapshot': 'Create Snapshot',
      'diag.action.restore': 'Restore Snapshot',

      'search.placeholder': 'Search tasks, tags, or notes...',
      'search.filter.all_tags': 'All Subjects',
      'search.filter.all_modes': 'All Modes',
      'search.sort.newest': 'Newest First',
      'search.sort.oldest': 'Oldest First',
      'search.sort.longest': 'Longest Duration',
      'search.empty': 'No matching sessions found',

      'wow.header.title': 'WEEK-OVER-WEEK PROGRESS',
      'wow.label.current_week': 'THIS WEEK',
      'wow.label.previous_week': 'LAST WEEK',
      'wow.trend.growth': 'Positive Momentum',
      'wow.trend.consistent': 'Steady Consistency',
      'wow.trend.dip': 'Focus Dip',

      'theme.oled_pitch_black.name': 'OLED Pitch Black',
      'theme.oled_pitch_black.desc': 'Maximum battery savings with pure black background and emerald accents.',
      'theme.warm_sepia_eink.name': 'Warm Sepia E-Ink',
      'theme.warm_sepia_eink.desc': 'Warm paper texture reducing glare and blue light for daylight reading.',
      'theme.forest_pine_zen.name': 'Forest Pine Zen',
      'theme.forest_pine_zen.desc': 'Calming deep coniferous green tones for grounded focus.',
      'theme.midnight_navy.name': 'Midnight Navy',
      'theme.midnight_navy.desc': 'Deep celestial navy and sky blue for evening study immersion.',
      'theme.nordic_frost.name': 'Nordic Frost',
      'theme.nordic_frost.desc': 'Clean slate and arctic cyan contrast for distraction-free clarity.',
      'theme.solarized_dark.name': 'Solarized Dark',
      'theme.solarized_dark.desc': 'Scientifically tuned low-glare palette for reduced visual fatigue.'
    },
    'ar': {
      'common.cycle': 'دورة',
      'common.of': 'من',
      'common.seconds_suffix': 'ث',
      'common.channels': 'قنوات',
      'common.nature_blends': 'توليفات أصوات الطبيعة',

      'preset.quiet_library.name': 'المكتبة الهادئة',
      'preset.quiet_library.desc': 'أجواء صامتة مع تقليب أوراق الكتب وبندول ساعة كلاسيكية ومطر ناعم على النوافذ لغمرك في القراءة الأكاديمية.',
      'preset.study_cafe.name': 'المقهى الدراسي الدافئ',
      'preset.study_cafe.desc': 'همهمة حيوية لمقهى دراسي بعيد مع مطر رقيق ونقرات كتابة خفيفة لتحفيز الإنجاز السريع والكتابة.',
      'preset.forest_cabin.name': 'كوخ الغابة والموقد',
      'preset.forest_cabin.desc': 'طقطقة موقد الحطب الدافئ مع نسيم أشجار الصنوبر ومطر يلامس النوافذ لتهدئة القلق أثناء المذاكرة المسائية.',
      'preset.deep_noise_isolation.name': 'عزل الضوضاء التام',
      'preset.deep_noise_isolation.desc': 'مزيج هندسي محكم من الضوضاء البنية والبيضاء وأزيز مروحة هوائية لإخفاء الأصوات المشتتة المحيطة تماماً.',
      'preset.zen_sanctuary.name': 'واحة التأمل والسكينة',
      'preset.zen_sanctuary.desc': 'حفيف غابة الخيزران مع قطرات حوض الماء الياباني ورنين الأجراس الخشبية لتصفية الذهن وخفض التوتر.',
      'midnight_study_train': 'قطار المذاكرة الليلي',
      'preset.midnight_study_train.name': 'قطار المذاكرة الليلي',
      'preset.midnight_study_train.desc': 'حركة إيقاعية رتيبة لقطار سفر عبر الليل مع أمطار غزيرة تضرب النوافذ للحفاظ على وتيرة تركيز ثابتة ومستمرة.',
      'preset.autumn_wilderness.name': 'برية الخريف الهادئة',
      'preset.autumn_wilderness.desc': 'نسيم رياح الخريف بين الأوراق مع زقزقة طيور الصباح في الغابة وجريان جدول الماء لبداية يوم دراسي نشطة.',
      'preset.coastal_deep_flow.name': 'شاطئ الأفكار والتفكير العميق',
      'preset.coastal_deep_flow.desc': 'أمواج محيط متلاطمة بانتظام مع رذاذ الماء ورنين الوعاء التبتي لدعم التفكير التجريدي وكتابة الأبحاث.',

      'category.academic': 'أكاديمي',
      'category.productivity': 'إنتاجية',
      'category.calm': 'هدوء',
      'category.shield': 'عزل صوتي',
      'category.mindfulness': 'تأمل وسكينة',
      'category.rhythm': 'إيقاع دراسي',
      'category.fresh': 'يقظة وانتعاش',
      'category.expansive': 'تفكير عميق',

      'breath.box_breathing.name': 'تنفس المربع المتوازن (4-4-4-4)',
      'breath.box_breathing.desc': 'أربع ثوانٍ شهيق، أربع حبس، أربع زفير، وأربع ثبات. مثالي لاستعادة الهدوء والتركيز الحاد قبل بدء جلسة مذاكرة صعبة.',
      'breath.calming_4_7_8.name': 'تنفس الاسترخاء والتهدئة (4-7-8)',
      'breath.calming_4_7_8.desc': 'أربع ثوانٍ شهيق، سبع حبس، وثماني زفير بطيء. يساعد على التخلص من التوتر بعد جلسة مذاكرة مكثفة والتهيئة للراحة.',
      'breath.resonant_coherence.name': 'تنفس التناغم والانسياب (5-5)',
      'breath.resonant_coherence.desc': 'خمس ثوانٍ شهيق وخمس ثوانٍ زفير متواصل. نمط انسيابي يضبط الإيقاع الذهني للدخول في حالة التدفق الدراسي.',
      'breath.refresh_energizer.name': 'تنفس التنشيط السريع (4-2-4)',
      'breath.refresh_energizer.desc': 'شهيق لأربع ثوانٍ، حبس خفيف لثانيتين، ثم زفير لأربع ثوانٍ. ينشط اليقظة والانتباه عند الشعور بالنعاس أثناء الاستذكار.',

      'breath.phase.inhale': 'شهيق عميق',
      'breath.phase.hold_in': 'حبس النفس',
      'breath.phase.exhale': 'زفير هادئ',
      'breath.phase.hold_out': 'ثبات واسترخاء',
      'breath.phase.inhale_quiet': 'شهيق هادئ',
      'breath.phase.hold_gentle': 'حبس النفس بلطف',
      'breath.phase.exhale_slow': 'زفير طويل وبطيء',
      'breath.phase.flow_inhale': 'شهيق انسيابي',
      'breath.phase.flow_exhale': 'زفير انسيابي',
      'breath.phase.brisk_inhale': 'شهيق منعش',
      'breath.phase.brief_hold': 'حبس خاطف',
      'breath.phase.firm_exhale': 'زفير محكم',

      'csv.col.id': 'المعرف',
      'csv.col.date': 'التاريخ',
      'csv.col.timestamp': 'التوقيت',
      'csv.col.duration_minutes': 'المدة (بالدقائق)',
      'csv.col.tag': 'المادة/الوسم',
      'csv.col.task_name': 'اسم المهمة',
      'csv.col.mode': 'نمط الجلسة',
      'csv.col.interrupted': 'هل تمت مقاطعتها',
      'csv.col.sound_environment': 'بيئة الصوت',
      'csv.col.reflection_notes': 'ملاحظات التأمل',

      'notification.action.pause': 'إيقاف مؤقت',
      'notification.action.resume': 'استئناف',
      'notification.action.finish': 'إنهاء',
      'notification.action.add_5m': '+5 دقائق',
      'notification.status.focusing': 'جلسة تركيز جارية',
      'notification.status.paused': 'الجلسة متوقفة مؤقتاً',
      'notification.status.break': 'وقت الاستراحة والراحة',

      'power_saver.status.active': 'نمط توفير الطاقة نشط',
      'power_saver.status.charging': 'الجهاز قيد الشحن',
      'power_saver.status.normal': 'أداء قياسي كامل',
      'power_saver.mode.auto': 'تلقائي (<= 20%)',
      'power_saver.mode.always_on': 'مفعّل دائماً',
      'power_saver.mode.always_off': 'معطّل دائماً',

      'digest.header.title': 'ملخص التركيز اليومي',
      'digest.metric.minutes': 'دقائق التركيز',
      'digest.metric.sessions': 'جلسات المذاكرة',
      'digest.metric.rate': 'معدل الاستمرارية',
      'digest.metric.top_subject': 'المادة الأكثر تركيزاً',

      'goals.header.weekly': 'هدف المذاكرة الأسبوعي',
      'goals.label.completed': 'ساعات منجزة',
      'goals.label.run_rate': 'المعدل اليومي المطلوب',
      'goals.pace.ahead': 'متقدم عن الخطة',
      'goals.pace.on_track': 'وفق الخطة المحددة',
      'goals.pace.behind': 'يحتاج إلى تعويض',

      'stretch.neck_shoulder.name': 'إرخاء الرقبة والأكتاف',
      'stretch.neck_shoulder.desc': 'حركات جانبية خفيفة للرقبة وتدوير الأكتاف لتخفيف إجهاد انحناء المذاكرة.',
      'stretch.wrist_forearm.name': 'تنشيط المعصم والساعد',
      'stretch.wrist_forearm.desc': 'تمارين بسط وثني المعصم لتخفيف إجهاد الكتابة واستخدام لوحة المفاتيح.',
      'stretch.upper_back.name': 'تمديد أعلى الظهر وفتح الصدر',
      'stretch.upper_back.desc': 'تشبيك الأصابع خلف الظهر وفتح الصدر بلطف لاستعادة استقامة الجذع.',
      'stretch.spinal_twist.name': 'التواء العمود الفقري الخفيف بالكرسي',
      'stretch.spinal_twist.desc': 'دوران هادئ بالكرسي لتنشيط حركة العمود الفقري وتخفيف ضغط الجلوس.',
      'stretch.hip_flexor.name': 'تمديد الورك والقدمين وقوفاً',
      'stretch.hip_flexor.desc': 'خطوة إلى الخلف وقوفاً لتمديد مفصل الورك بعد ساعات الجلوس الطويلة.',
      'stretch.eye_palming.name': 'إراحة العين بنظام 20-20 والتغطية',
      'stretch.eye_palming.desc': 'تغطية خفيفة باليدين الدافئتين للعينين مع النظر لمدى بعيد لراحة الإبصار.',
      'stretch.routine.quick_2min.title': 'استعادة النشاط السريعة (دقيقتان)',
      'stretch.routine.quick_2min.desc': 'تنشيط سريع للرقبة والمعصم والعين بين جلسات المذاكرة القصيرة.',
      'stretch.routine.full_5min.title': 'إعادة ضبط وضعية الجسم الكاملة (5 دقائق)',
      'stretch.routine.full_5min.desc': 'سلسلة متكاملة جالساً وواقفاً لتجديد الحيوية بعد جلسات المذاكرة الطويلة.',
      'stretch.routine.screen_relief.title': 'تخفيف إجهاد الشاشة والقراءة',
      'stretch.routine.screen_relief.desc': 'راحة مركزة للعين ومحاذاة الرقبة للمذاكرة الرقمية المكثفة.',
      'stretch.badge.mobility': 'حركات استراحة مكتبية',
      'stretch.label.duration': 'المدة',

      'flip.action.flip_to_pause': 'قلب الهاتف للإيقاف المؤقت أو كتم الصوت',
      'flip.action.flip_to_focus': 'قلب الهاتف لبدء جلسة التركيز',
      'flip.action.disabled': 'معطّل',
      'flip.status.face_down': 'الهاتف مقلوب للأسفل',
      'flip.status.face_up': 'الهاتف موجه للأعلى',

      'diag.status.healthy': 'النظام يعمل بكفاءة وأمان تام',
      'diag.status.degraded': 'انخفاض في أداء النظام',
      'diag.status.critical': 'تنبيه: تم رصد مشكلات حرجة',
      'diag.action.snapshot': 'إنشاء نقطة استعادة احتياطية',
      'diag.action.restore': 'استعادة من النسخة الاحتياطية',

      'search.placeholder': 'ابحث في المهام والمواد والملاحظات...',
      'search.filter.all_tags': 'جميع المواد',
      'search.filter.all_modes': 'جميع الأنماط',
      'search.sort.newest': 'الأحدث أولاً',
      'search.sort.oldest': 'الأقدم أولاً',
      'search.sort.longest': 'الأطول مدة',
      'search.empty': 'لا توجد جلسات مطابقة للبحث',

      'wow.header.title': 'مقارنة الأداء الأسبوعي',
      'wow.label.current_week': 'هذا الأسبوع',
      'wow.label.previous_week': 'الأسبوع السابق',
      'wow.trend.growth': 'نمو إيجابي وتصاعد',
      'wow.trend.consistent': 'ثبات واستقرار',
      'wow.trend.dip': 'انخفاض في التركيز',

      'theme.oled_pitch_black.name': 'أسود فاحم (OLED)',
      'theme.oled_pitch_black.desc': 'أقصى توفير للبطارية بخلفية سوداء تماماً مع لمسات زمردية.',
      'theme.warm_sepia_eink.name': 'ورق دافئ وحبر إلكتروني (Sepia)',
      'theme.warm_sepia_eink.desc': 'ملمس الورق الطبيعي الدافئ لتقليل إجهاد الإبصار أثناء المذاكرة النهارية.',
      'theme.forest_pine_zen.name': 'واحة الصنوبر والغابة (Zen)',
      'theme.forest_pine_zen.desc': 'درجات أخضر الصنوبر الهادئة لتعزيز السكينة والتركيز العميق.',
      'theme.midnight_navy.name': 'كحلي منتصف الليل (Navy)',
      'theme.midnight_navy.desc': 'أزرق كحلي عميق مع لمسات سماوية لجلسات المذاكرة المسائية.',
      'theme.nordic_frost.name': 'الصقيع الشمالي (Slate Frost)',
      'theme.nordic_frost.desc': 'رمادي صخري مع أزرق قطبي لبيئة دراسية باردة وخالية من التشتيت.',
      'theme.solarized_dark.name': 'سولارايزد المظلم (Solarized)',
      'theme.solarized_dark.desc': 'لوحة ألوان محسوبة بدقة لتقليل التباين القاسي وإراحة العين.'
    },
    'es': {
      'common.cycle': 'Ciclo',
      'common.of': 'de',
      'common.seconds_suffix': 's',
      'common.channels': 'CANALES',
      'common.nature_blends': 'MEZCLAS DE LA NATURALEZA',
      'preset.quiet_library.name': 'Biblioteca Silenciosa',
      'preset.study_cafe.name': 'Café de Estudio Acogedor',
      'breath.box_breathing.name': 'Respiración Cuadrada (4-4-4-4)',
      'breath.phase.inhale': 'Inhalación Profunda',
      'breath.phase.hold_in': 'Retener Aire',
      'breath.phase.exhale': 'Exhalación Lenta',
      'breath.phase.hold_out': 'Pausa y Calma',
      'csv.col.id': 'identificador',
      'csv.col.date': 'fecha',
      'csv.col.duration_minutes': 'duracion_minutos',
      'notification.action.pause': 'Pausa',
      'notification.action.resume': 'Continuar',
      'notification.action.finish': 'Terminar',
      'notification.action.add_5m': '+5 min',
      'power_saver.status.active': 'Ahorro de Batería Activo',
      'power_saver.status.charging': 'Dispositivo Cargando',
      'power_saver.status.normal': 'Rendimiento Estándar',
      'digest.header.title': 'RESUMEN DIARIO DE ENFOQUE',
      'digest.metric.minutes': 'MINUTOS DE ENFOQUE',
      'digest.metric.sessions': 'SESIONES',
      'goals.header.weekly': 'META DE ESTUDIO SEMANAL',
      'goals.label.completed': 'HORAS COMPLETADAS',
      'goals.pace.on_track': 'Al Día',
      'stretch.neck_shoulder.name': 'Liberación de Cuello y Hombros',
      'stretch.routine.quick_2min.title': 'Reinicio de Escritorio de 2 Minutos',
      'flip.action.flip_to_pause': 'Voltear para Pausar',
      'diag.status.healthy': 'Sistema Completamente Saludable',
      'search.placeholder': 'Buscar tareas, materias o notas...',
      'search.filter.all_tags': 'Todas las Materias',
      'wow.header.title': 'PROGRESO SEMANA TRAS SEMANA',
      'wow.label.current_week': 'ESTA SEMANA',
      'wow.label.previous_week': 'SEMANA ANTERIOR',
      'theme.oled_pitch_black.name': 'Negro Puro OLED',
      'theme.warm_sepia_eink.name': 'Sepia Cálido E-Ink'
    },
    'fr': {
      'common.cycle': 'Cycle',
      'common.of': 'sur',
      'common.seconds_suffix': 's',
      'common.channels': 'CANAUX',
      'preset.quiet_library.name': 'Bibliothèque Calme',
      'breath.box_breathing.name': 'Respiration Carrée (4-4-4-4)',
      'breath.phase.inhale': 'Inspiration Profonde',
      'breath.phase.hold_in': 'Bloquer Souffle',
      'breath.phase.exhale': 'Expiration Lente',
      'breath.phase.hold_out': 'Repos et Maintien'
    },
    'de': {
      'common.cycle': 'Zyklus',
      'common.of': 'von',
      'preset.quiet_library.name': 'Ruhige Bibliothek',
      'breath.box_breathing.name': 'Box-Atmung (4-4-4-4)',
      'breath.phase.inhale': 'Tief Einatmen',
      'breath.phase.hold_in': 'Atem Anhalten',
      'breath.phase.exhale': 'Langsam Ausatmen',
      'breath.phase.hold_out': 'Ruhepause'
    },
    'tr': {
      'common.cycle': 'Döngü',
      'common.of': '/',
      'preset.quiet_library.name': 'Sessiz Kütüphane',
      'breath.box_breathing.name': 'Kare Nefes (4-4-4-4)',
      'breath.phase.inhale': 'Derin Nefes Al',
      'breath.phase.hold_in': 'Nefesi Tut',
      'breath.phase.exhale': 'Yavaşça Ver',
      'breath.phase.hold_out': 'Dinlen ve Bekle'
    },
    'ja': {
      'common.cycle': 'サイクル',
      'common.of': '/',
      'preset.quiet_library.name': '静かな図書館',
      'breath.box_breathing.name': 'ボックスブリージング (4-4-4-4)',
      'breath.phase.inhale': '深く吸う',
      'breath.phase.hold_in': '止める',
      'breath.phase.exhale': 'ゆっくり吐く',
      'breath.phase.hold_out': '静止'
    }
  };

  function normalizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return CANONICAL_FALLBACK;
    if (isExcludedLocale(locale)) return CANONICAL_FALLBACK;
    return locale.trim().toLowerCase().replace('_', '-');
  }

  function t(key, locale) {
    if (!key || typeof key !== 'string') return '';
    if (isExcludedLocale(locale)) {
      return resolveFromDict(key, CANONICAL_FALLBACK);
    }
    var target = normalizeLocale(locale);
    var primary = target.split('-')[0];

    if (DICTIONARIES[target] && typeof DICTIONARIES[target][key] === 'string') {
      return DICTIONARIES[target][key];
    }
    if (primary !== target && DICTIONARIES[primary] && typeof DICTIONARIES[primary][key] === 'string') {
      return DICTIONARIES[primary][key];
    }
    return resolveFromDict(key, CANONICAL_FALLBACK);
  }

  function resolveFromDict(key, dictCode) {
    if (DICTIONARIES[dictCode] && typeof DICTIONARIES[dictCode][key] === 'string') {
      return DICTIONARIES[dictCode][key];
    }
    return key;
  }

  function getLoadedLocales() {
    return Object.keys(DICTIONARIES);
  }

  return {
    CANONICAL_FALLBACK: CANONICAL_FALLBACK,
    isExcludedLocale: isExcludedLocale,
    normalizeLocale: normalizeLocale,
    t: t,
    getLoadedLocales: getLoadedLocales
  };
}));
