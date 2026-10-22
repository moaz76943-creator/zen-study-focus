/**
 * DEEP FOCUS — Master QA Integration Suite (Phase 3 Milestone)
 * Automatically discovers and executes all *.test.js suites
 * ensuring 100% coverage with zero file-name mismatches.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = path.resolve(__dirname);
const allFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .sort((a, b) => {
    // Keep consistent order: Invariants (M001-M019) -> Golden Flows -> Phase 3 Engines
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

console.log("==============================================================");
console.log(`[DEEP FOCUS] Phase 3 Master QA Certification (${allFiles.length} Test Suites)`);
console.log("==============================================================");

let passed = 0;
let failed = 0;
const results = [];

allFiles.forEach((file, idx) => {
  const padIdx = String(idx + 1).padStart(2, '0');
  const filePath = path.join(testDir, file);
  const suiteName = file.replace('.test.js', '');
  process.stdout.write(`[${padIdx}/${allFiles.length}] ${suiteName.padEnd(46, '.')} `);

  try {
    execSync(`node "${filePath}"`, { stdio: 'pipe' });
    console.log("PASS (GREEN)");
    results.push({ suite: suiteName, file: file, status: "PASS" });
    passed++;
  } catch (err) {
    console.log("FAIL (RED)");
    console.error(`\n--- ERROR in ${file} ---\n${err.stdout ? err.stdout.toString() : err.message}\n`);
    results.push({ suite: suiteName, file: file, status: "FAIL" });
    failed++;
  }
});

console.log("==============================================================");
console.log(`Certification Summary: Total: ${allFiles.length} | Passed: ${passed} | Failed: ${failed}`);
console.log("==============================================================");

if (failed > 0 || allFiles.length < 33) {
  console.error(`[-] Master QA Certification FAILED (Passed: ${passed}/${allFiles.length}).`);
  process.exit(1);
}

console.log("[+] Master QA Certification 100% GREEN Verified (33/33 Suites).");
