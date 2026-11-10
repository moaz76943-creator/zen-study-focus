const StemStudio = require('../android/app/src/main/assets/web/modules/stem/stem_typesetter_studio.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — STEM Typesetter Studio QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const studio = new StemStudio({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Presets
  const presets = studio.getPresets();
  const presetKeys = Object.keys(presets);
  console.log(`✓ Loaded ${presetKeys.length} Canonical STEM Presets: ${presetKeys.join(', ')}`);
  if (presetKeys.length < 5) {
    console.error("❌ Canonical presets incomplete.");
    process.exit(1);
  }

  // 2. Load Preset & Render SVG
  const loaded = studio.loadPreset('schrodinger');
  console.log(`✓ Loaded Preset: ${loaded.title} -> "${loaded.formula}"`);
  const svg = studio.renderFormulaSvg(loaded.formula);
  if (!svg.includes('<svg') || !svg.includes('ψ') || svg.includes('<script>')) {
    console.error("❌ SVG Formula Typesetting validation failed.");
    process.exit(1);
  }
  console.log(`✓ Verified Pure Vector SVG Rendering (${svg.length} characters).`);

  // 3. Create Cloze Card
  const cloze = studio.createClozeCard();
  console.log(`✓ Created Cloze Card: Front="${cloze.front}" | Back="${cloze.back}"`);
  if (!cloze.front.includes('______')) {
    console.error("❌ Cloze card generation failed.");
    process.exit(1);
  }

  // 4. Timed Exam Simulator
  const exam = studio.initTimedExam(10);
  console.log(`✓ Initialized Timed Exam with ${exam.totalQuestions} questions.`);
  const ans1 = studio.submitExamAnswer(0); // Correct
  const ans2 = studio.submitExamAnswer(0); // Correct
  const ans3 = studio.submitExamAnswer(0); // Correct
  const ans4 = studio.submitExamAnswer(0); // Correct
  const ans5 = studio.submitExamAnswer(0); // Correct
  const result = studio.finishExam();
  console.log(`✓ Completed Exam with Final Score: ${result.score}% (${result.correctCount}/${result.totalQuestions} correct)`);
  if (result.score !== 100) {
    console.error("❌ Exam scoring evaluation failed.");
    process.exit(1);
  }

  console.log("✅ STEM Typesetter Studio QA verification passed 100%.");
}

runTest();
