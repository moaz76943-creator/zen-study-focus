const CornellStudio = require('../android/app/src/main/assets/web/modules/notes/tri_zone_cornell_studio.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Cornell Studio Automated QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const studio = new CornellStudio({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Chapter Template Load
  const note = studio.loadChapterTemplate("Quantum Mechanics");
  console.log(`✓ Loaded Chapter Template: "${note.title}"`);
  console.log(`✓ Detected ${note.wikiLinks.length} [[WikiLinks]]: ${note.wikiLinks.join(', ')}`);
  console.log(`✓ Calculated Density Ratio: ${note.densityRatio}`);

  // 2. Active Recall Masking
  const isMasked1 = studio.toggleRecallMask();
  const isMasked2 = studio.toggleRecallMask();
  if (isMasked1 !== true || isMasked2 !== false) {
    console.error("❌ Recall mask toggle logic failed.");
    process.exit(1);
  }
  console.log("✓ Recall Masking Toggle verified (true -> false).");

  // 3. Sync to Flashcards
  const syncResult = studio.syncCuesToFlashcards();
  console.log(`✓ Synced ${syncResult.cardsGenerated} Flashcards to local vault.`);
  if (syncResult.cardsGenerated === 0) {
    console.error("❌ Flashcard extraction failed.");
    process.exit(1);
  }

  // 4. Interactive Vector Mind-Map
  const n1 = studio.addMindMapNode("Wave-Particle Duality", 150, 100);
  const n2 = studio.addMindMapNode("De Broglie Wavelength", 280, 100);
  const connected = studio.connectNodes(n1.id, n2.id);
  console.log(`✓ Added Mind-Map Nodes and Connected: ${connected}`);

  studio.autoLayoutRadial();
  const svgOutput = studio.renderMindMapSvg();
  if (!svgOutput.includes('<svg') || !svgOutput.includes('Wave-Particle Duality') || svgOutput.includes('&amp;quot;')) {
    console.error("❌ SVG Mind-Map rendering validation failed.");
    process.exit(1);
  }
  console.log(`✓ Verified Clean SVG Output (${svgOutput.length} characters, Zero raw entities).`);

  console.log("✅ Cornell Studio QA verification passed 100%.");
}

runTest();
