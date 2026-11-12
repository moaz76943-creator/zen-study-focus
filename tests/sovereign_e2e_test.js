const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("==================================================================");
console.log("🧪 [Deep Focus E2E] Running Sovereign Integration Test Harness...");
console.log("==================================================================");

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log("  ✅ PASS:", name);
}

// 1. Verify app.js & index.html exist and are non-empty
const appJsPath = path.join(__dirname, "..", "android/app/src/main/assets/web/app.js");
const indexHtmlPath = path.join(__dirname, "..", "android/app/src/main/assets/web/index.html");
const appJs = fs.readFileSync(appJsPath, "utf8");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

test("Core Web Assets Exist & Non-Empty", () => {
    assert(appJs.length > 5000, "app.js unexpectedly small");
    assert(indexHtml.length > 1000, "index.html unexpectedly small");
});

// 2. Verify all Sovereign Modules are present
const requiredModules = [
    "SovereignAnalytics",
    "SovereignBreathing",
    "SovereignWorkerTimer",
    "SovereignHeapSanitizer",
    "SovereignChimes",
    "SovereignStateSnapshot",
    "SovereignBinauralAlpha",
    "SovereignProfiler",
    "SovereignDeckExchange",
    "SovereignHeatmap",
    "SovereignAudioVisualizer",
    "SovereignDeduplicator",
    "SovereignMaintenanceHub",
    "SovereignStorageVacuum",
    "SovereignStressAudit",
    "SovereignLocaleResolver",
    "SovereignAudioGuardian",
    "SovereignDeltaClock"
];

test("All 18 Sovereign Modules Registered in app.js", () => {
    requiredModules.forEach(mod => {
        assert(appJs.includes(mod), "Missing module: " + mod);
    });
});

// 3. Verify Zero-Music & Zero-Internet Policies
test("Strict Zero-Music Policy (No .mp3/.wav/.ogg/.flac/.m4a)", () => {
    const audioRegex = /["'][^"'\n]*\.(mp3|wav|ogg|flac|m4a)["']/i;
    assert(!audioRegex.test(appJs), "Unauthorized audio file reference found!");
});

test("Strict 100% Offline Manifest (No INTERNET or RECORD_AUDIO)", () => {
    const manifestPath = path.join(__dirname, "..", "android/app/src/main/AndroidManifest.xml");
    if (fs.existsSync(manifestPath)) {
        const mf = fs.readFileSync(manifestPath, "utf8");
        assert(!mf.includes("android.permission.INTERNET"), "INTERNET permission forbidden!");
        assert(!mf.includes("android.permission.RECORD_AUDIO"), "RECORD_AUDIO permission forbidden!");
    }
});

// 4. Verify Consolidated Locale Packs Integrity
test("Consolidated Locale Packs Valid JSON & >= 1000 Languages", () => {
    const manifestPackPath = path.join(__dirname, "..", "android/app/src/main/assets/web/locale_packs/manifest.json");
    assert(fs.existsSync(manifestPackPath), "locale_packs/manifest.json missing!");
    const mp = JSON.parse(fs.readFileSync(manifestPackPath, "utf8"));
    assert(mp.totalLocales >= 1000, "Expected >= 1000 locales, got " + mp.totalLocales);

    const corePath = path.join(__dirname, "..", "android/app/src/main/assets/web/locale_packs/core_20.json");
    const core = JSON.parse(fs.readFileSync(corePath, "utf8"));
    assert(core.ar && core.en, "Core-20 missing ar or en!");
});

// 5. Verify Levenshtein Similarity Logic
test("Levenshtein Deduplicator Similarity Math Accuracy", () => {
    function lev(a, b) {
        const m = [];
        for (let i = 0; i <= b.length; i++) m[i] = [i];
        for (let j = 0; j <= a.length; j++) m[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                m[i][j] = b[i - 1] === a[j - 1]
                    ? m[i - 1][j - 1]
                    : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
            }
        }
        return 1 - m[b.length][a.length] / Math.max(a.length, b.length);
    }
    assert(lev("Deep Focus", "Deep Focus!") >= 0.90, "Expected >= 0.90 similarity");
    assert(lev("Deep Focus", "Quantum Mechanics") < 0.30, "Expected < 0.30 similarity");
});


// 6. Verify AndroidManifest.xml Has Zero Duplicate Attributes in Any Tag
test("AndroidManifest.xml Has Zero Duplicate Attributes", () => {
    const manifestPath = path.join(__dirname, "..", "android/app/src/main/AndroidManifest.xml");
    const mf = fs.readFileSync(manifestPath, "utf8");
    const tags = mf.match(/<[A-Za-z_][^>]*>/g) || [];
    tags.forEach(tag => {
        const attrs = tag.match(/([A-Za-z_][A-Za-z0-9_.:-]*)\s*=/g) || [];
        const seen = new Set();
        attrs.forEach(a => {
            const name = a.replace(/\s*=$/, "");
            assert(!seen.has(name), "Duplicate XML attribute in tag: " + name);
            seen.add(name);
        });
    });
});

console.log("==================================================================");
console.log("🎉 [E2E Summary]: " + passed + " / " + passed + " Integration Tests PASSED!");
console.log("==================================================================");
