const assert = require('assert');
const InteractiveSanctuaryCanvas = require('../android/app/src/main/assets/web/modules/garden/interactive_sanctuary_canvas.js');

console.log('🧪 Starting InteractiveSanctuaryCanvas (Axis 9: M8518-M8527) Unit Tests...');

const sanctuary = new InteractiveSanctuaryCanvas();

// Test 1: Place Earned Trees on Grid
const tree1 = sanctuary.dfPlaceEarnedTreesOnSanctuaryGrid({
  species: 'cedar',
  subject: 'Vector Calculus',
  durationMinutes: 50,
  flashcardsReviewed: 25
});
assert.strictEqual(tree1.success, true);
assert.strictEqual(sanctuary.plantedTrees.length, 1);
assert.strictEqual(sanctuary.plantedTrees[0].species, 'cedar');
console.log('  ✓ dfPlaceEarnedTreesOnSanctuaryGrid verified.');

// Test 2: Isometric Sanctuary Render
const render = sanctuary.dfRenderIsoGridBotanicalSanctuary(400, 300);
assert.ok(render.sanctuarySvg.includes('<svg'));
assert.ok(render.sanctuarySvg.includes('id="isoGrid"'));
assert.strictEqual(render.totalTreesPlanted, 1);
console.log('  ✓ dfRenderIsoGridBotanicalSanctuary verified.');

// Test 3: Starlight Constellation Sky Render
const sky = sanctuary.dfRenderStarlightConstellationSky(400, 70);
assert.ok(sky.starsSvg.includes('id="constellationSky"'));
assert.ok(sky.totalStars >= 3);
console.log('  ✓ dfRenderStarlightConstellationSky verified.');

// Test 4: Flowing Water Stream
sanctuary.hasFlowingRiver = true;
const river = sanctuary.dfRenderFlowingWaterStreamCanvas(400, 300);
assert.strictEqual(river.active, true);
assert.ok(river.riverSvg.includes('id="flowingRiver"'));
console.log('  ✓ dfRenderFlowingWaterStreamCanvas verified.');

// Test 5: Tree Tap Inspection
const inspection = sanctuary.dfInspectTreeSessionDetailsOnTap(tree1.gridCoordinates.x, tree1.gridCoordinates.y);
assert.strictEqual(inspection.found, true);
assert.strictEqual(inspection.subject, 'Vector Calculus');
assert.strictEqual(inspection.sessionDurationMinutes, 50);
console.log('  ✓ dfInspectTreeSessionDetailsOnTap verified.');

// Test 6: Filter Sanctuary by Subject
const filterMatch = sanctuary.dfFilterSanctuaryViewBySubject('Vector Calculus');
assert.strictEqual(filterMatch.matchingTreesCount, 1);
const filterEmpty = sanctuary.dfFilterSanctuaryViewBySubject('Organic Chemistry');
assert.strictEqual(filterEmpty.matchingTreesCount, 0);
sanctuary.dfFilterSanctuaryViewBySubject(null); // Reset
console.log('  ✓ dfFilterSanctuaryViewBySubject verified.');

// Test 7: Timelapse Garden Growth
const timelapse = sanctuary.dfRenderTimelapseGardenGrowth();
assert.strictEqual(timelapse.totalGrowthFrames, 1);
assert.strictEqual(timelapse.frames[0].latestSubject, 'Vector Calculus');
console.log('  ✓ dfRenderTimelapseGardenGrowth verified.');

// Test 8: 60 FPS Optimization Policy
const opt = sanctuary.dfOptimizeSanctuaryCanvas60Fps();
assert.strictEqual(opt.frameRateTarget, 60);
assert.strictEqual(opt.drawCallsPerFrame, 1);
console.log('  ✓ dfOptimizeSanctuaryCanvas60Fps verified.');

// Test 9: Export High-Res Poster
const poster = sanctuary.dfExportSanctuaryHighResPoster();
assert.ok(poster.exportSignature.startsWith('DFSANCTUARY:'));
assert.ok(poster.svgPoster.includes('<svg'));
console.log('  ✓ dfExportSanctuaryHighResPoster verified.');

// Test 10: Milestone Seal M8527
const seal = sanctuary.dfGetMilestoneM8527SanctuarySeal();
assert.strictEqual(seal.milestone, 'M8527');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8527SanctuarySeal verified.');

console.log('🎉 All 10 InteractiveSanctuaryCanvas tests passed with 100% assertions!');
