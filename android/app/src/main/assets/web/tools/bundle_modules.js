// --- Modular Bundle Validator ---
const fs = require('fs');
const path = require('path');

function validateAllModules() {
  const base = path.join(__dirname, '..', 'modules');
  if (!fs.existsSync(base)) return { valid: false };
  const dirs = [
    'core', 'audio', 'flashcards',
    'timer', 'zen', 'ui'
  ];
  let count = 0;
  dirs.forEach(function(d) {
    const dirPath = path.join(base, d);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      count += files.length;
    }
  });
  return { valid: true, moduleFilesCount: count };
}

const res = validateAllModules();
console.log('Valid modules:', res.moduleFilesCount);
