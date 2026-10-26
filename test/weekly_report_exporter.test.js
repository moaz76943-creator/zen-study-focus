const assert = require('assert');
const Exporter = require('../android/app/src/main/assets/web/js/weekly_report_exporter.js');

console.log("--- Running 🎯 Mission #043: Weekly Report Exporter Tests ---");

// Test 1: Markdown export structure, Arabic headers & Western digits
{
  const mockSessions = [
    { id: "s1", durationMinutes: 60, date: "2026-10-18", category: "دراسة", reflection: { rating: 5 } },
    { id: "s2", durationMinutes: 90, date: "2026-10-19", category: "برمجة", reflection: { rating: 4 } }
  ];
  const mockTasks = [
    { id: "t1", title: "حل مسائل فيزياء", completed: true },
    { id: "t2", title: "مهمة مؤجلة", completed: false }
  ];

  const md = Exporter.exportToMarkdown(mockSessions, mockTasks, { locale: 'ar', weekLabel: 'الأسبوع 42' });
  assert.ok(md.includes("# 📊 تقرير التركيز الأسبوعي"));
  assert.ok(md.includes("الأسبوع 42"));
  assert.ok(md.includes("\u200E2.5 ساعة"));
  assert.ok(md.includes("\u200E150 دقيقة"));
  assert.ok(md.includes("حل مسائل فيزياء"));
  assert.ok(!md.includes("مهمة مؤجلة"), "Incomplete tasks should not be in completed list");
  console.log("✓ Test 1: Arabic Markdown report generation & Western digits verified.");
}

// Test 2: Pipe character escaping in table cells
{
  const escaped = Exporter.escapeMarkdownCell("مهمة | ذات | فواصل");
  assert.strictEqual(escaped, "مهمة \\| ذات \\| فواصل", "Pipes must be escaped with backslash");
  console.log("✓ Test 2: Markdown table pipe escaping verified.");
}

// Security regression: preserve user backslashes before escaping Markdown table pipes.
{
  const input = String.raw`part\\|second`;
  const wanted = String.raw`part\\\\\\|second`;
  assert.strictEqual(Exporter.escapeMarkdownCell(input),wanted,
    'Existing slash plus table pipe must not bypass Markdown delimiter escaping');
  assert.strictEqual(Exporter.escapeMarkdownCell('one\\rtwo\\nthree\\u2028four'),
    'one two three four','All newline forms must stay within one Markdown cell');
}

// Test 3: Structured JSON export with ZEN21::REPORT envelope
{
  const jsonReport = Exporter.exportToJson([{ durationMinutes: 45 }], [{ completed: true }]);
  assert.strictEqual(jsonReport.marker, "ZEN21::REPORT");
  assert.strictEqual(jsonReport.version, 21);
  assert.strictEqual(jsonReport.metrics.totalMinutes, 45);
  assert.strictEqual(jsonReport.metrics.completedTasksCount, 1);
  assert.ok(jsonReport.exportedAt);
  console.log("✓ Test 3: Structured JSON report envelope & metrics verified.");
}

// Test 4: Defensive handling of empty & corrupted datasets
{
  const emptyMd = Exporter.exportToMarkdown(null, null);
  assert.ok(emptyMd.includes("0 دقيقة"));

  const emptyJson = Exporter.exportToJson(undefined, undefined);
  assert.strictEqual(emptyJson.metrics.totalMinutes, 0);
  assert.strictEqual(emptyJson.metrics.completedTasksCount, 0);
  console.log("✓ Test 4: Empty and corrupted dataset resilience verified.");
}

console.log("--- All Mission #043 Report Exporter Tests PASSED (GREEN) ---");
