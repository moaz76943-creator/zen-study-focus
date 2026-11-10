const assert = require('assert');
const DesignCritiqueButtonAuditor = require('../android/app/src/main/assets/web/modules/ui/design_critique_button_auditor.js');

console.log('🧪 Starting DesignCritiqueButtonAuditor (Task #647) Unit Tests...');

const auditor = new DesignCritiqueButtonAuditor();

// Test 1: Button Audit Scanning
const mockHtml = `
  <div>
    <button id="btnStartTimer">Start Focus</button>
    <button id="btnPauseTimer">Pause</button>
    <button id="btnUnwiredMystery">Mystery Action</button>
  </div>
`;
const mockJs = `
  document.getElementById("btnStartTimer").addEventListener('click', () => {});
  $('#btnPauseTimer').click(() => {});
`;
const auditReport = auditor.auditHtmlButtons(mockHtml, mockJs);
assert.strictEqual(auditReport.totalButtons, 3);
assert.strictEqual(auditReport.wiredButtons, 2);
assert.strictEqual(auditReport.deadButtons.length, 1);
assert.strictEqual(auditReport.deadButtons[0].id, 'btnUnwiredMystery');
console.log('  ✓ auditHtmlButtons verified.');

// Test 2: WCAG Contrast Ratio Evaluation
const highContrast = auditor.evaluateContrastRatio('#000000', '#ffffff');
assert.ok(highContrast.ratio >= 20.0, 'Black on white must exceed 20:1');
assert.strictEqual(highContrast.passesAAA, true);
assert.strictEqual(highContrast.quality, 'EXCELLENT_AAA');

const lowContrast = auditor.evaluateContrastRatio('#94a3b8', '#ffffff');
assert.strictEqual(lowContrast.passesAAA, false);
console.log('  ✓ evaluateContrastRatio verified.');

// Test 3: Palette Critique
const whitePremium = auditor.critiqueColorPalette({
  name: 'White Premium',
  background: '#ffffff',
  text: '#0f172a'
});
assert.strictEqual(whitePremium.contrastScore, 100);
assert.ok(whitePremium.observations.length >= 2);
console.log('  ✓ critiqueColorPalette verified.');

// Test 4: Touch Target Audit
const mockCss = `
  .small-btn { width: 30px; height: 30px; }
  .valid-btn { width: 48px; height: 48px; }
`;
const violations = auditor.auditTouchTargetDimensions(mockCss);
assert.strictEqual(violations.length, 1);
assert.strictEqual(violations[0].selector, '.small-btn');
console.log('  ✓ auditTouchTargetDimensions verified.');

// Test 5: Tactile Patch Script Generation
const patchScript = auditor.generateTactileButtonPatchScript(['btnStartTimer']);
assert.ok(patchScript.includes('navigator.vibrate(18)'));
assert.ok(patchScript.includes('transform: scale(0.96)'));
console.log('  ✓ generateTactileButtonPatchScript verified.');

// Test 6: Milestone Seal
const seal = auditor.dfGetMilestoneM8537DesignCritiqueSeal();
assert.strictEqual(seal.milestone, 'M8537');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8537DesignCritiqueSeal verified.');

console.log('🎉 All DesignCritiqueButtonAuditor tests passed with 100% assertions!');
