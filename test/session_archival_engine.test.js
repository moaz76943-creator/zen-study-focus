const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/session_archival_engine.js');

console.log("--- Running 🎯 Mission #039: Session Archival & Storage Defense Tests ---");

// Test 1: Storage quota calculation & status thresholds
{
  const healthy = Engine.evaluateStorageHealth(1 * 1024 * 1024); // 1MB
  assert.strictEqual(healthy.status, "HEALTHY");
  assert.strictEqual(healthy.percentage, 25);

  const advisory = Engine.evaluateStorageHealth(3.2 * 1024 * 1024); // 3.2MB / 4MB = 80%
  assert.strictEqual(advisory.status, "ADVISORY");

  const critical = Engine.evaluateStorageHealth(3.8 * 1024 * 1024); // 3.8MB / 4MB = 95%
  assert.strictEqual(critical.status, "CRITICAL");
  console.log("✓ Test 1: Storage quota calculation and 3-tier health status verified.");
}

// Test 2: Monthly partitioning without zero data loss
{
  const now = Date.now();
  const dayMs = 86400000;
  const mockSessions = [
    { id: "s_recent", timestamp: now - (5 * dayMs), durationMinutes: 25 }, // 5 days ago (Active)
    { id: "s_old1", timestamp: now - (100 * dayMs), durationMinutes: 50 }, // 100 days ago (Archive)
    { id: "s_old2", timestamp: now - (120 * dayMs), durationMinutes: 45 }  // 120 days ago (Archive)
  ];

  const partitioned = Engine.partitionSessions(mockSessions, 90);
  assert.strictEqual(partitioned.activeSessions.length, 1);
  assert.strictEqual(partitioned.activeSessions[0].id, "s_recent");
  assert.strictEqual(partitioned.archivedCount, 2);

  const totalArchived = Object.keys(partitioned.monthlyArchives).reduce((sum, k) => {
    return sum + partitioned.monthlyArchives[k].length;
  }, 0);
  assert.strictEqual(totalArchived, 2, "Zero session records must be dropped during partitioning");
  console.log("✓ Test 2: Monthly partitioning & zero data loss verified.");
}

// Test 3: Safe chunk merge & duplicate deduplication by ID
{
  const base = [
    { id: "s1", duration: 25 },
    { id: "s2", duration: 30 }
  ];
  const incoming = [
    { id: "s2", duration: 30 }, // duplicate
    { id: "s3", duration: 45 }  // new
  ];

  const merged = Engine.mergeSessions(base, incoming);
  assert.strictEqual(merged.length, 3, "Merged dataset must deduplicate identical session IDs");
  assert.deepStrictEqual(merged.map(s => s.id), ["s1", "s2", "s3"]);
  console.log("✓ Test 3: Safe session merge & ID deduplication verified.");
}

// Test 4: Archive package contract with ZEN21:: marker
{
  const pkg = Engine.packageArchiveChunk("2026-06", [{ id: "arc_1", durationMinutes: 60 }]);
  assert.strictEqual(pkg.marker, "ZEN21::ARCHIVE");
  assert.strictEqual(pkg.partition, "2026-06");
  assert.strictEqual(pkg.count, 1);
  assert.ok(pkg.createdAt);
  console.log("✓ Test 4: Archive packaging contract with ZEN21:: marker verified.");
}

console.log("--- All Mission #039 Session Archival Tests PASSED (GREEN) ---");
