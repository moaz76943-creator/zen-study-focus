const FeynmanErrorBankStudio = require('../android/app/src/main/assets/web/modules/recall/feynman_error_bank_studio.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Feynman Error Bank Studio QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const studio = new FeynmanErrorBankStudio({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Blank Sheet Challenge
  const sheet = studio.startBlankSheet("Second Law of Thermodynamics", ["entropy", "irreversible", "isolated"]);
  console.log(`✓ Started Blank Sheet Challenge: "${sheet.title}"`);

  const evalResult = studio.evaluateBlankSheet(
    "In an isolated thermodynamic system, total entropy always increases over time. Natural spontaneous processes are inherently irreversible and dissipate available energy."
  );

  console.log(`✓ Evaluated Recall: Matched ${evalResult.matchedTerms}/${evalResult.totalTerms} terms. Coverage=${evalResult.coverageScore}%, Simplicity=${evalResult.simplicityScore}%`);
  if (!evalResult.isMastered || evalResult.coverageScore !== 100) {
    console.error("❌ Blank Sheet evaluation failed.");
    process.exit(1);
  }

  // 2. Log Mistakes with Taxonomy
  const err1 = studio.logMistake("Integration by parts sign inversion", "Forgot negative sign in v du integral", "calculation", "Calculus Exam");
  const err2 = studio.logMistake("Confusing mitosis with meiosis II", "Assumed diploid daughter cells in meiosis", "conceptual", "Biology Quiz");
  console.log(`✓ Logged 2 Mistakes in Error Bank: [${err1.typeLabel}] and [${err2.typeLabel}]`);

  // 3. Retest and Resolve
  const retestRes = studio.submitRetest(err1.id, true);
  console.log(`✓ Retested Error ${err1.id}: Resolved=${retestRes.resolved}, Remaining Unresolved=${retestRes.remainingUnresolved}`);
  if (!retestRes.resolved || retestRes.remainingUnresolved !== 1) {
    console.error("❌ Error Bank retest resolution failed.");
    process.exit(1);
  }

  // 4. Statistics Verification
  const stats = studio.getErrorStatistics();
  console.log(`✓ Error Bank Statistics: Total=${stats.totalMistakesLogged}, Resolved=${stats.resolvedMistakes}, MasteryRate=${stats.masteryRatePct}%`);
  if (stats.masteryRatePct !== 50 || stats.unresolvedMistakes !== 1) {
    console.error("❌ Error Bank statistics math incorrect.");
    process.exit(1);
  }

  console.log("✅ Feynman Error Bank Studio QA verification passed 100%.");
}

runTest();
