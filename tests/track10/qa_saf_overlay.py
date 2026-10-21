#!/usr/bin/env python3
"""Overlay *test-only* fixtures on a pinned historical QA harness at CI runtime.

Runs only in a disposable com.zenstudy.focus.qa emulator; the real app bundle,
stored owner data, Android source, v21 keys, signatures, and package ID are untouched.
"""
from pathlib import Path

qa = Path("tests/track08/qa_real_analytics_saf.cjs")
source = qa.read_text(encoding="utf-8")
anchor = "  applyLanguage('en');"
assert source.count(anchor) == 1, "Pinned native probe changed: do not guess injection"
qa_seed = """  // Native Track10 acceptance fixture, in disposable QA WebView memory ONLY.
  // Persisted user records are never read, overwritten, or used for this test.
  if (!window.__qaTrack10Seeded) {
    if (typeof cfg !== 'object' || !window.DeepFocusAnalyticsV21 ||
        typeof window.DeepFocusAnalyticsV21.localToday !== 'function')
      return {error:'Missing trusted app state for QA data'};
    cfg.sessionHistory = Array.isArray(cfg.sessionHistory) ? cfg.sessionHistory : [];
    cfg.sessionHistory.push({
      id:'qa-track10-30', date:window.DeepFocusAnalyticsV21.localToday(),
      domain:'study', minutes:30, completed:true
    });
    window.__qaTrack10Seeded = true;
  }
  applyLanguage('de');"""
source = source.replace(anchor, qa_seed)
needle = "  assert.match(bytes,/\\r?\\n/,'CSV must include a header row and newline');"
assert source.count(needle) == 1, "Expected post-save independent file readback check"
source = source.replace(
    needle,
    needle + """
  // QA fixture must appear in the ACTUAL file readback, not a mocked callback.
  assert.match(bytes,/"qa-track10-30","[0-9]{4}-[0-9]{2}-[0-9]{2}","study","30"/,
    'Saved Android CSV file must contain exact 30-minute QA session');
  report.results.push({stage:'dataset',status:'PASS',expectedMinutes:30,
    expectedId:'qa-track10-30',qaOnly:true});
""",
)
qa.write_text(source, encoding="utf-8")
print("Isolated API30 QA-only source patched: German Studio + actual 30-minute saved CSV readback")
