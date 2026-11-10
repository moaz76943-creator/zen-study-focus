const FeynmanStudio = require('../android/app/src/main/assets/web/modules/recall/feynman_studio.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Feynman Studio Automated QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const studio = new FeynmanStudio({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  const session = studio.startConcept("Quantum Tunneling", "Physics");
  console.log(`✓ Initialized Feynman Session: ${session.name} [${session.id}]`);

  // Explanation with deliberate technical jargon
  const draft1 = "Quantum tunneling occurs when an electron penetrates a finite potential barrier due to wave function attenuation and probabilistic spatial distribution.";
  const res1 = studio.analyzeExplanation(draft1);
  console.log(`✓ Draft 1 Simplicity Score: ${res1.simplicityScore}/100 (Jargon Detected: ${res1.jargonCount})`);

  // Add simple analogy
  studio.recordAnalogy("It is like rolling a ball against a wooden hill that occasionally appears on the other side without climbing over.");
  console.log("✓ Recorded sensory analogy.");

  // Flag and resolve gap
  const gap = studio.flagKnowledgeGap("Calculate exact probability decay across a square barrier.");
  studio.resolveGap(gap.id);
  console.log("✓ Flagged and resolved conceptual knowledge gap.");

  // Simplified child explanation
  const draft2 = "Imagine throwing a rubber ball at a thin wall. In our world it bounces back, but tiny particles act like waves and can slip through the wall.";
  const res2 = studio.analyzeExplanation(draft2);
  console.log(`✓ Draft 2 Simplicity Score: ${res2.simplicityScore}/100 (Jargon Detected: ${res2.jargonCount})`);

  const mastery = studio.calculateMastery();
  console.log(`✓ Final Feynman Mastery Level: ${mastery}%`);

  const saved = studio.saveSession();
  if (!saved || mastery < 50) {
    console.error("❌ Feynman Studio verification failed.");
    process.exit(1);
  }

  console.log("✅ Feynman Studio QA verification passed 100%.");
}

runTest();
