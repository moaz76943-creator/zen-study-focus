const fs = require("fs");
const path = require("path");

function runPermanentI18nAndAssetGate(repoRoot) {
  const webRoot = path.join(repoRoot, "android/app/src/main/assets/web");
  const core20Path = path.join(webRoot, "locale_packs/core_20.json");
  if (!fs.existsSync(core20Path)) {
    throw new Error("Missing core_20.json");
  }

  const core20 = JSON.parse(fs.readFileSync(core20Path, "utf8"));
  const expectedLangs = [
    "ar", "en", "ro", "fr", "es", "de", "zh", "hi", "tr", "ru",
    "ja", "fa", "id", "ur", "pt", "ko", "it", "nl", "pl", "vi"
  ];

  const actualLangs = Object.keys(core20);
  if (actualLangs.length !== 20) {
    throw new Error(`Expected exactly 20 languages in core_20.json, found ${actualLangs.length}`);
  }
  for (const lang of expectedLangs) {
    if (!core20[lang]) throw new Error(`Missing required language '${lang}' in core_20.json`);
  }

  const enKeys = Object.keys(core20.en || {});
  const easternDigits = /[\u0660-\u0669\u06F0-\u06F9]/;
  const forbiddenScripts = /[\u0590-\u05FF\u0700-\u074F\u2D30-\u2D7F]/; // Hebrew, Syriac, Amazigh

  for (const lang of expectedLangs) {
    const dict = core20[lang];
    for (const k of enKeys) {
      const val = dict[k];
      if (typeof val !== "string" || val.trim() === "") {
        throw new Error(`Empty/missing key '${k}' in language '${lang}'`);
      }
      if (easternDigits.test(val)) {
        throw new Error(`Eastern Arabic digits found in '${lang}.${k}': ${val}`);
      }
      if (forbiddenScripts.test(val)) {
        throw new Error(`Forbidden script found in '${lang}.${k}': ${val}`);
      }
    }
  }

  // Verify no hardcoded toLocaleDateString('ar'...) remains in web JS
  const badLocaleRegex = /\.toLocale(?:Date)?String\(\s*['"]ar(?:-[A-Z]{2})?['"]/;
  const stack = [webRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name.endsWith(".js") && !entry.name.includes("sovereign_i18n_permanent_gate")) {
        const content = fs.readFileSync(full, "utf8");
        if (badLocaleRegex.test(content)) {
          throw new Error(`Hardcoded Arabic date locale leak found in ${path.relative(repoRoot, full)}`);
        }
      }
    }
  }

  // Verify all CC0 nature audio assets exist & are > 10KB (zero zen_bell.ogg)
  const audioDir = path.join(webRoot, "audio");
  if (fs.existsSync(path.join(audioDir, "zen_bell.ogg"))) {
    throw new Error("Forbidden zen_bell.ogg must not exist");
  }
  const oggs = fs.readdirSync(audioDir).filter((f) => f.endsWith(".ogg"));
  if (oggs.length < 4) {
    throw new Error(`Expected >= 4 CC0 .ogg files, found ${oggs.length}`);
  }
  for (const ogg of oggs) {
    const sz = fs.statSync(path.join(audioDir, ogg)).size;
    if (sz < 10240) throw new Error(`Corrupt/tiny audio file ${ogg} (${sz} bytes)`);
  }

  console.log(`✅ PASS: Permanent 20-Language Parity (${enKeys.length} keys x 20 langs), Western Digits & CC0 Audio Gate Verified`);
}

if (require.main === module) {
  runPermanentI18nAndAssetGate(process.cwd());
}
module.exports = { runPermanentI18nAndAssetGate };
