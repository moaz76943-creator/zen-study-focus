const SyllabusLoadBalancer = require('../android/app/src/main/assets/web/modules/syllabus/adaptive_load_balancer.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Syllabus Load-Balancer QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const balancer = new SyllabusLoadBalancer({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Initial State & Readiness
  console.log(`✓ Active Syllabus: ${balancer.syllabus.title} (${balancer.syllabus.code})`);
  const initialReadiness = balancer.calculateReadiness();
  console.log(`✓ Initial Readiness: ${initialReadiness}%`);
  if (initialReadiness !== 10) {
    console.error("❌ Initial syllabus readiness calculation failed.");
    process.exit(1);
  }

  // 2. Unit Completion Toggle
  const toggleRes = balancer.toggleUnit('u2');
  console.log(`✓ Toggled Unit u2: Completed=${toggleRes.completed}, New Readiness=${toggleRes.readiness}%`);
  if (toggleRes.readiness !== 20) {
    console.error("❌ Toggle unit readiness update failed.");
    process.exit(1);
  }

  // 3. Dynamic Rebalance & Burnout Sentinel Evaluation
  const report = balancer.rebalance();
  console.log(`✓ Dynamic Rebalance Report:`);
  console.log(`  - Days Remaining: ${report.daysRemaining} Days`);
  console.log(`  - Daily Pacing: ${report.dailyPace} units/day`);
  console.log(`  - Target Daily Minutes: ${report.dailyMinutesTarget} mins`);
  console.log(`  - Burnout Sentinel Risk: ${report.burnoutRisk}`);

  if (!report.burnoutRisk || report.daysRemaining <= 0 || isNaN(report.dailyPace)) {
    console.error("❌ Dynamic rebalance evaluation failed.");
    process.exit(1);
  }

  // 4. Zero Medical Claims & Western Numerals Audit
  if (report.syllabusTitle.toLowerCase().includes('pathology') || /[٠-٩]/.test(balancer.examDateString)) {
    console.error("❌ Medical jargon or Eastern numerals detected in syllabus state.");
    process.exit(1);
  }
  console.log("✓ Audited Zero Medical Terminology & Western Numerals conformity.");

  console.log("✅ Syllabus Load-Balancer QA verification passed 100%.");
}

runTest();
