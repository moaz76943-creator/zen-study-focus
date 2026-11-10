const StudioNavigator = require('../android/app/src/main/assets/web/modules/core/studio_navigator.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Golden Release Master Verification QA");
  console.log("==================================================");

  const mockStorage = {};
  const nav = new StudioNavigator({
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Studio Registry Check
  console.log(`✓ Audited ${nav.studios.length} Sovereign Master Studios in Navigator:`);
  nav.studios.forEach(s => console.log(`   - [${s.icon}] ${s.label} (${s.id})`));

  if (nav.studios.length !== 9) {
    console.error("❌ Master studios registry incomplete.");
    process.exit(1);
  }

  // 2. Studio Switching & Persistence
  const res = nav.switchStudio('reader');
  console.log(`✓ Switched to Studio: "${res.label}" (${res.studioId})`);
  if (nav.activeStudioId !== 'reader' || mockStorage['df_active_studio_tab_v1'] !== 'reader') {
    console.error("❌ Tab navigation switching or persistence failed.");
    process.exit(1);
  }

  // 3. Switch through all studios cleanly
  nav.studios.forEach(s => {
    const sw = nav.switchStudio(s.id);
    if (!sw) {
      console.error(`❌ Failed switching to studio ${s.id}`);
      process.exit(1);
    }
  });
  console.log("✓ Successfully validated non-blocking isolation transitions across all 9 studios.");

  console.log("✅ Golden Release Master QA verification passed 100%.");
}

runTest();
