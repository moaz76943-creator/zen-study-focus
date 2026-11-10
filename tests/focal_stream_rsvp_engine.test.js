const FocalStreamEngine = require('../android/app/src/main/assets/web/modules/reader/focal_stream_rsvp_engine.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Focal Stream RSVP Engine QA Runner");
  console.log("==================================================");

  const mockStorage = {};
  const engine = new FocalStreamEngine({
    defaultWpm: 450,
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. WPM and Timing
  engine.setWpm(500);
  console.log(`✓ Configured WPM Target: ${engine.currentWpm}`);
  const durNormal = engine.calculateWordDurationMs("study");
  const durPunct = engine.calculateWordDurationMs("study.");
  console.log(`✓ Normal Word Duration: ${durNormal}ms | Punctuation Paused: ${durPunct}ms`);
  if (durPunct <= durNormal) {
    console.error("❌ Punctuation micro-pause calculation failed.");
    process.exit(1);
  }

  // 2. ORP Fixation
  const orp1 = engine.calculateOrpIndex("a");
  const orp2 = engine.calculateOrpIndex("rapid");
  const orp3 = engine.calculateOrpIndex("presentation");
  console.log(`✓ Calculated ORPs: "a"->${orp1}, "rapid"->${orp2}, "presentation"->${orp3}`);
  if (orp1 !== 0 || orp2 !== 1 || orp3 !== 3) {
    console.error("❌ Optical Recognition Point math incorrect.");
    process.exit(1);
  }

  // 3. Step forward and backward
  engine.stepForward(5);
  console.log(`✓ Stepped forward to index ${engine.currentIndex}`);
  engine.stepBackward(2);
  console.log(`✓ Stepped backward to index ${engine.currentIndex} (Regressions: ${engine.sessionStats.regressions})`);
  if (engine.currentIndex !== 3 || engine.sessionStats.regressions !== 1) {
    console.error("❌ Navigation index step calculation failed.");
    process.exit(1);
  }

  // 4. Bookmark System
  engine.setBookmark();
  engine.stepForward(10);
  engine.jumpToBookmark();
  console.log(`✓ Jumped back to Bookmark Index: ${engine.currentIndex}`);
  if (engine.currentIndex !== 3) {
    console.error("❌ Bookmark jump failed.");
    process.exit(1);
  }

  // 5. 3-Word Chunks
  const chunks = engine.generate3WordSpanChunks();
  console.log(`✓ Generated ${chunks.length} 3-word semantic chunks (e.g. "${chunks[0]}")`);
  if (chunks.length === 0) {
    console.error("❌ Semantic span chunk generation failed.");
    process.exit(1);
  }

  // 6. Cloze Comprehension Submission
  const cloze = engine.generateClozeRecallQuestion();
  const res = engine.submitClozeAnswer(cloze.correctAnswer, cloze.correctAnswer);
  console.log(`✓ Submitted Cloze answer: Correct=${res.isCorrect}, Comprehension Score=${res.newScore}%`);
  if (!res.isCorrect) {
    console.error("❌ Cloze answer evaluation failed.");
    process.exit(1);
  }

  console.log("✅ Focal Stream RSVP Engine QA verification passed 100%.");
}

runTest();
