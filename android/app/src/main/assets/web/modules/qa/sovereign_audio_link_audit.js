const fs = require("fs");
const path = require("path");

function runAudioLinkAudit(repoRoot) {
  const webRoot = path.join(repoRoot, "android/app/src/main/assets/web");
  const audioDir = path.join(webRoot, "audio");
  const validOggs = new Set(fs.readdirSync(audioDir).filter((f) => f.endsWith(".ogg")));
  const refPat = /audio\/([a-zA-Z0-9_-]+\.ogg)/g;
  const broken = [];

  const stack = [webRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name.endsWith(".js") || entry.name.endsWith(".html")) {
        const txt = fs.readFileSync(full, "utf8");
        let m;
        while ((m = refPat.exec(txt)) !== null) {
          if (!validOggs.has(m[1])) {
            broken.push(`${path.relative(repoRoot, full)} -> audio/${m[1]}`);
          }
        }
      }
    }
  }

  if (broken.length > 0) {
    throw new Error("Broken audio/.ogg references found:\n  " + broken.join("\n  "));
  }
  console.log("✅ PASS: Zero broken audio/*.ogg references across entire web codebase");
}

if (require.main === module) {
  runAudioLinkAudit(process.cwd());
}
module.exports = { runAudioLinkAudit };
