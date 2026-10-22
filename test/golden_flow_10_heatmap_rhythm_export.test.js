const assert = require('assert');
const HeatmapEngine = require('../android/app/src/main/assets/web/js/monthly_focus_heatmap_engine.js');
const RhythmEngine = require('../android/app/src/main/assets/web/js/daily_focus_rhythm_engine.js');
const Exporter = require('../android/app/src/main/assets/web/js/weekly_report_exporter.js');
const HealthMonitor = require('../android/app/src/main/assets/web/js/v21_data_health_monitor.js');

console.log("--- Running 🎯 Golden Flow 10: Heatmap -> Rhythm -> Health -> Export ---");

// Step 1: Multi-day session dataset
const mockSessions = [
  { id: "s1", date: "2026-10-20", timestamp: new Date("2026-10-20T08:00:00").getTime(), durationMinutes: 60, category: "علوم" },
  { id: "s2", date: "2026-10-21", timestamp: new Date("2026-10-21T08:30:00").getTime(), durationMinutes: 90, category: "رياضيات" },
  { id: "s3", date: "2026-10-22", timestamp: new Date("2026-10-22T14:00:00").getTime(), durationMinutes: 45, category: "علوم" }
];
const mockTasks = [{ id: "t1", title: "إتمام الفصل الثالث", completed: true }];

// Step 2: Generate monthly heatmap metrics
const heatmap = HeatmapEngine.generateMonthlyHeatmap(2026, 10, mockSessions);
assert.strictEqual(heatmap.activeDaysCount, 3);
assert.strictEqual(heatmap.totalMinutes, 195);
assert.strictEqual(heatmap.longestConsecutiveDays, 3);

// Step 3: Analyze peak rhythm
const rhythm = RhythmEngine.analyzeFocusRhythm(mockSessions);
assert.strictEqual(rhythm.peakHour, 8, "8:00 AM had 150 minutes, peak hour must be 8");
assert.strictEqual(rhythm.peakPeriod.id, "morning");

// Step 4: Verify storage health monitor
const health = HealthMonitor.evaluateFortressHealth({ sessions: mockSessions, tasks: mockTasks });
assert.strictEqual(health.status, "HEALTHY");

// Step 5: Export Markdown & JSON Reports
const md = Exporter.exportToMarkdown(mockSessions, mockTasks, { locale: 'ar', weekLabel: 'أسبوع الإنجاز' });
assert.ok(md.includes("تقرير التركيز الأسبوعي"));
assert.ok(md.includes("إتمام الفصل الثالث"));

const json = Exporter.exportToJson(mockSessions, mockTasks, { weekLabel: 'Mastery Week' });
assert.strictEqual(json.marker, "ZEN21::REPORT");
assert.strictEqual(json.metrics.totalMinutes, 195);
assert.strictEqual(json.metrics.completedTasksCount, 1);

console.log("✓ Golden Flow 10: Deep Analytics & Export Pipeline PASSED (GREEN)");
