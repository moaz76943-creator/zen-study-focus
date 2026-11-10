const DogfoodSimulator = require('../android/app/src/main/assets/web/modules/simulation/dogfood_simulator.js');

async function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Dogfood Simulator Automated QA Runner");
  console.log("==================================================");

  const simulator = new DogfoodSimulator({
    logCallback: (msg, type) => {
      if (type === 'error') console.error(msg);
      else console.log(msg);
    }
  });

  const report = await simulator.runFullBenchmark();

  if (!report.passed || report.score !== 100) {
    console.error(`\n❌ QA TEST FAILED: Score was ${report.score}/100. Expected 100.`);
    process.exit(1);
  }

  console.log("\n✅ QA TEST PASSED: 10/10 Core Sovereign Studios Achieved 100/100 Benchmark.");
}

runTest().catch(err => {
  console.error("Test execution exception:", err);
  process.exit(1);
});
