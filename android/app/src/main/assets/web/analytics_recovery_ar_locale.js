/* DF-054 / DF-121: Complete Arabic labels for the new recorded analytics studio.
 * Opt-in. Pure translations; no storage reads, network calls or user-content rewriting.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeepFocusAnalyticsArabic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PREFIX = 'analyticsRecovery.';
  const labels = Object.freeze({
    title: 'تحليلات النشاط المسجّل',
    today: 'اليوم',
    last7: 'آخر 7 أيام',
    last30: 'آخر 30 يومًا',
    selected: 'الفترة المحددة',
    sessions: 'الجلسات',
    minutes: 'الدقائق المسجّلة',
    average: 'متوسط الدقائق',
    comparison: 'الأيام السبعة السابقة',
    split: 'توزيع الأنشطة',
    goals: 'الأهداف اليومية المسجّلة',
    noGoals: 'لا تتوفر سجلات تاريخية للأهداف اليومية',
    noData: 'لا توجد جلسات تركيز مسجّلة في هذه الفترة',
    domain: 'النشاط',
    all: 'الكل',
    study: 'الدراسة',
    read: 'القراءة',
    work: 'العمل',
    sport: 'الرياضة',
    from: 'من',
    to: 'إلى',
    group: 'التجميع حسب',
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    reset: 'إعادة ضبط الفلاتر',
    export: 'تصدير CSV',
    exportKind: 'محتوى ملف CSV',
    sessionRows: 'سجل الجلسات',
    saved: 'تم حفظ ملف CSV',
    cancelled: 'أُلغي حفظ الملف',
    failed: 'تعذّر حفظ الملف؛ حاول مرة أخرى',
    unavailable: 'حفظ الملف غير متاح حتى تفعيل خدمة الملفات الموثوقة',
    invalid: 'اختر فترة صحيحة يبدأ تاريخها قبل تاريخ نهايتها',
    detail: 'اختر عمودًا أو إجماليًا لعرض الجلسات المسجّلة',
    empty: 'لا توجد جلسات مطابقة',
    date: 'تاريخ احتساب الجلسة',
    id: 'معرّف الجلسة',
    activity: 'النشاط',
    task: 'المهمة المرتبطة',
    more: 'صفوف إضافية غير معروضة',
    quality: 'سجلات المصدر المستبعدة',
    conflicts: 'معرّفات مكررة ومتعارضة',
    snapshotCoverage: 'أيام لها هدف مسجّل',
    allSessions: 'كل الجلسات المسجّلة',
    weekComparison: 'آخر 7 أيام مقارنة بالأيام السبعة السابقة'
  });
  function translate(qualifiedKey, locale) {
    if (String(locale).toLowerCase().split('-')[0] !== 'ar') return null;
    if (typeof qualifiedKey !== 'string' || !qualifiedKey.startsWith(PREFIX)) return null;
    const key = qualifiedKey.slice(PREFIX.length);
    return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : null;
  }
  return Object.freeze({labels, translate});
});
