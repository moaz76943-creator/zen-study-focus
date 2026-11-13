const fs = require("fs");
const path = require("path");

function runScriptIntegrityAudit(repoRoot) {
  const webRoot = path.join(repoRoot, "android/app/src/main/assets/web");
  const indexPath = path.join(webRoot, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");

  const srcPat = /<(?:script[^>]+src|link[^>]+href)=["']([^"']+)["']/gi;
  const seen = new Set();
  const missing = [];
  const duplicates = [];

  let m;
  while ((m = srcPat.exec(html)) !== null) {
    const ref = m[1].split("?")[0].split("#")[0].trim();
    if (!ref || ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:")) {
      continue;
    }
    if (seen.has(ref)) duplicates.push(ref);
    seen.add(ref);
    const target = path.join(webRoot, ref);
    if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
      missing.push(ref);
    }
  }

  if (missing.length > 0) {
    throw new Error("Missing/empty assets referenced in index.html: " + missing.join(", "));
  }
  if (duplicates.length > 0) {
    throw new Error("Duplicate asset tags in index.html: " + duplicates.join(", "));
  }

  console.log(`✅ PASS: All ${seen.size} local <script>/<link> assets in index.html exist & are non-empty (#829)`);
}

if (require.main === module) {
  runScriptIntegrityAudit(process.cwd());
}
module.exports = { runScriptIntegrityAudit };
