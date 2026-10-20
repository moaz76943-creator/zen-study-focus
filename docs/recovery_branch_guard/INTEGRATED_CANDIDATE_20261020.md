# Consolidation candidate — source-only, not a release

Integration of the exact Android recovery candidate `534912ce2d90d8988981c7d32e8bcb69671003f0` (including PR #61 into PR #52) with the original recovery integration `be890c7487ba042af12b764a1a211fe7beed2a4e` (PR #25).

Two-parent commit preserves both Git ancestries; no force-push, reset, deletion of app records, signing, pack activation or main write. The conflict in `index.html` is resolved by retaining Android's `webview_compat.js` and `analytics_recovery_core.js` initialization and inserting all three original Nature V2 additions: CSS, inventory section and JS. Android's `app.js` retains current timer/data fixes and adds the four-line conditional Nature V2 inventory hook without altering playback eligibility. The seven original Nature V2 files come by exact Git blob. All existing Android tests, scripts, and v21 storage remain present.

Checks must be run again on the NEW exact merged SHA. Debug APK/build, JavaScript and desktop browser results are limited scope. Real Android CDP before this merge proved 13 PASS / 0 FAIL / 7 NOT_TESTED. Separate UIAutomator 20 NOT_TESTED, licensing, human listening, signed release, real phone and private backup remain BLOCKED / NOT_TESTED. The presence of the Nature V2 inventory is NOT permission to activate any unlicensed tracks.

**No production merge until release gate approvals.**
