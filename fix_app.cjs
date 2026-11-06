const fs = require('fs');
const appPath = 'android/app/src/main/assets/web/app.js';
let appJs = fs.readFileSync(appPath, 'utf8');

const regex = /function downloadEncryptedBackupFile\(\) \{([\s\S]*?)\n\}/;

appJs = appJs.replace(regex, `function downloadEncryptedBackupFile() {
  const code = generateEncryptedBackupCode();
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`zen-focus-backup-\${todayISO}.zenbackup\`;
  a.click();
  showToast("💾 Encrypted File Saved!");
}`);

fs.writeFileSync(appPath, appJs);
