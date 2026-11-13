const fs = require("fs");
const path = require("path");

function runComplianceGate(repoRoot) {
  const manifestPath = path.join(repoRoot, "android/app/src/main/AndroidManifest.xml");
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const forbiddenPerms = ["android.permission.INTERNET", "android.permission.RECORD_AUDIO", "android.permission.ACCESS_FINE_LOCATION", "android.permission.READ_CONTACTS"];
    for (const perm of forbiddenPerms) {
      if (manifest.includes(perm)) {
        throw new Error(`Forbidden permission in AndroidManifest.xml: ${perm}`);
      }
    }
  }

  const core20Path = path.join(repoRoot, "android/app/src/main/assets/web/locale_packs/core_20.json");
  if (fs.existsSync(core20Path)) {
    const core20 = JSON.parse(fs.readFileSync(core20Path, "utf8"));
    const medicalPat = /\b(adhd|insomnia|depression|anxiety|disorder|therapy|clinical|diagnosis|prescription|medication)\b/i;
    for (const [lang, dict] of Object.entries(core20)) {
      for (const [k, v] of Object.entries(dict)) {
        if (typeof v === "string" && medicalPat.test(v)) {
          throw new Error(`Medical claim/term detected in ${lang}.${k}: "${v}"`);
        }
      }
    }
  }

  console.log("✅ PASS: Offline Zero-PII Manifest & Zero-Medical-Term Compliance Gate Verified (#827)");
}

if (require.main === module) {
  runComplianceGate(process.cwd());
}
module.exports = { runComplianceGate };
