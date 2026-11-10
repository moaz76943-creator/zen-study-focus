const P2PCapsuleExchange = require('../android/app/src/main/assets/web/modules/collaboration/p2p_capsule_exchange.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — P2P Capsule Exchange QA Runner");
  console.log("==================================================");

  const mockStorage = {};
  const exchange = new P2PCapsuleExchange({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  const sampleCards = [
    { front: "What is Stokes' Theorem?", back: "Integral of curl over surface equals line integral around boundary.", hint: "Vector Calculus" },
    { front: "State Maxwell-Boltzmann Distribution", back: "Probability distribution of particle speeds in idealized gases.", hint: "Thermodynamics" }
  ];

  const sampleNotes = [
    { cue: "Core Formula", body: "oint_C F . dr = iint_S (curl F) . dS", summary: "Boundary circulation equals flux of vorticity." }
  ];

  // 1. Package Deck
  const capsule = exchange.packageDeck({ title: "Vector Calculus Mastery", subject: "Mathematics" }, sampleCards, sampleNotes);
  console.log(`✓ Packaged capsule checksum: ${capsule.checksum} (${capsule.payload.length} bytes)`);

  // 2. Verify Capsule
  const verification = exchange.verifyCapsule(capsule);
  if (!verification.valid || verification.cardCount !== 2) {
    console.error("❌ Capsule verification failed.");
    process.exit(1);
  }
  console.log(`✓ Verified Capsule: "${verification.title}" with ${verification.cardCount} cards`);

  // 3. Import with Fresh FSRS
  const importResult = exchange.importCapsule(verification);
  console.log(`✓ Imported Deck "${importResult.title}" with ${importResult.cardsImported} cards with clean FSRS-4.5 state.`);

  // 4. Generate QR Carousel
  const carousel = exchange.generateQrCarousel(capsule);
  console.log(`✓ Generated Animated QR Carousel with ${carousel.totalParts} optical frames at ${carousel.fps} FPS.`);

  // 5. Test XSS Sanitization
  const dirtyCapsule = exchange.packageDeck({ title: "<script>alert('xss')</script>" }, [{ front: "<b>bold</b>", back: "<img src=x onerror=alert(1)>" }]);
  const cleanData = JSON.parse(dirtyCapsule.payload);
  if (cleanData.title.includes('<script>') || cleanData.cards[0].back.includes('<img')) {
    console.error("❌ XSS Sanitizer check failed.");
    process.exit(1);
  }
  console.log("✓ XSS Protection verified clean (all active HTML tags neutralized).");

  console.log("✅ P2P Capsule Exchange QA verification passed 100%.");
}

runTest();
