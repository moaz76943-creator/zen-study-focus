/**
 * DEEP FOCUS — Master QA Integration Suite (Phase 4 Grand Milestone)
 * Automatically discovers and executes all *.test.js suites (44 Suites)
 * ensuring 100% GREEN coverage with zero regressions.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = path.resolve(__dirname);
const allFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

console.log("==============================================================");
console.log(`[DEEP FOCUS] Phase 4 Grand QA Certification (${allFiles.length} Test Suites)`);
console.log("==============================================================");

let passed = 0;
let failed = 0;

allFiles.forEach((file, idx) => {
  const padIdx = String(idx + 1).padStart(2, '0');
  const filePath = path.join(testDir, file);
  const suiteName = file.replace('.test.js', '');
  process.stdout.write(`[${padIdx}/${allFiles.length}] ${suiteName.padEnd(46, '.')} `);

  try {
    execSync(`node "${filePath}"`, { stdio: 'pipe' });
    console.log("PASS (GREEN)");
    passed++;
  } catch (err) {
    console.log("FAIL (RED)");
    console.error(`\n--- ERROR in ${file} ---\n${err.stdout ? err.stdout.toString() : err.message}\n`);
    failed++;
  }
});

console.log("==============================================================");
console.log(`Grand Summary: Total: ${allFiles.length} | Passed: ${passed} | Failed: ${failed}`);
console.log("==============================================================");

if (failed > 0 || allFiles.length < 44) {
  console.error(`[-] Phase 4 Grand Certification FAILED (Passed: ${passed}/${allFiles.length}).`);
  process.exit(1);
}

console.log(`[+] Phase 4 Grand QA Certification 100% GREEN Verified (${passed}/${allFiles.length} Suites).`);
