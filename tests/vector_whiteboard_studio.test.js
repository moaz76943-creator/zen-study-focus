const WhiteboardStudio = require('../android/app/src/main/assets/web/modules/whiteboard/vector_whiteboard_studio.js');

function runTest() {
  console.log("==================================================");
  console.log("DEEP FOCUS — Vector Whiteboard Studio QA Test");
  console.log("==================================================");

  const mockStorage = {};
  const studio = new WhiteboardStudio(null, {
    storage: {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null
    }
  });

  // 1. Tool Switching
  studio.setTool('highlighter');
  console.log(`✓ Switched tool to highlighter (Width: ${studio.lineWidth})`);
  studio.setTool('pen');
  console.log(`✓ Switched tool to pen (Width: ${studio.lineWidth})`);
  studio.setColor('#059669');
  console.log(`✓ Configured stroke color: ${studio.currentColor}`);

  // 2. Stroke Simulation & Geometric Snapping
  const rawBoxStroke = {
    tool: 'shapesnap',
    color: '#2563EB',
    width: 3,
    points: [
      { x: 50, y: 50 }, { x: 150, y: 50 }, { x: 150, y: 150 }, { x: 50, y: 150 },
      { x: 50, y: 52 }, { x: 50, y: 51 }, { x: 50, y: 50 }, { x: 50, y: 50 }
    ]
  };

  const snapped = studio.detectAndSnapGeometricShape(rawBoxStroke);
  console.log(`✓ Shape Snapping Result: Tool=${snapped.tool}`);
  if (snapped.tool !== 'snapped_rect' && snapped.tool !== 'snapped_circle') {
    console.error("❌ Shape snapping recognition failed.");
    process.exit(1);
  }

  // 3. Occlusion Boxes
  const box = studio.addOcclusionBox(100, 100, 80, 40, "Mitochondria Matrix");
  console.log(`✓ Added Diagram Occlusion Box: "${box.label}" (Revealed: ${box.revealed})`);
  const rev = studio.toggleOcclusion(box.id);
  console.log(`✓ Toggled Occlusion: Revealed=${rev}`);
  if (!rev) {
    console.error("❌ Occlusion box toggle failed.");
    process.exit(1);
  }

  // 4. Undo and Clear
  studio.strokes.push({ tool: 'pen', color: '#0F172A', width: 3, points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] });
  console.log(`✓ Stroke count before undo: ${studio.strokes.length}`);
  studio.undo();
  console.log(`✓ Stroke count after undo: ${studio.strokes.length}`);
  if (studio.strokes.length !== 0) {
    console.error("❌ Undo stack operation failed.");
    process.exit(1);
  }

  // 5. SVG Export
  studio.strokes.push(snapped);
  const svg = studio.exportSvg();
  if (!svg.includes('<svg') || !svg.includes('rect') || svg.includes('<script>')) {
    console.error("❌ SVG Whiteboard export validation failed.");
    process.exit(1);
  }
  console.log(`✓ Verified Clean Vector SVG Export (${svg.length} characters).`);

  console.log("✅ Vector Whiteboard Studio QA verification passed 100%.");
}

runTest();
