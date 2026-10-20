# Batch 2 — translated, responsive completion picker

Date: 2026-10-19. Base cf37b5e; preceding scoped PR #28 transfer 049ed68.
Branch fix/df4-master-recovery-20261019. No changes to PR #25 or main.

Implemented DF4-005 (source/desktop tested), DF4-008/009/025/030 (partial): reviewed PR #28 supplies offline typography, 20-language completion picker and complete Arabic recorded analytics labels. Picker now has scoped CSS loaded after shared themes, independent grid rows/radio labels/preview buttons, wrapping long labels, 44px targets and focus outlines. Volume output uses ASCII digits and LTR isolation, updates on input and resets to verified settings on persistence failure. Arabic preview says معاينة. Host accessibility label follows locale. IDs and v21 config fields unchanged.

Commands:
- node --test --test-reporter=tap tests/completion_alerts/*.test.cjs
- node tests/df4_browser/picker.cjs (existing Playwright + /usr/bin/chromium; local server: python -m http.server 8765 --bind 127.0.0.1 --directory android/app/src/main/assets/web)

Results: 14/14 alert Node tests PASS; 62 desktop Chromium checks PASS. 20 locales rendered; picker labels/legend/radios checked. Layout checked for ar/en/de/fr/ru at 320/360/393/430px and 100%/200% root font size. No picker overflow, overlapping labels/buttons or undersized preview targets. Actual native browser Audio playback/decoding observed for two cues, exclusive preview and silent cancellation verified. Selection/42% volume survived reload. Fresh context blocks external network dependencies; app bootstrap and local assets work. No page errors or missing application resources; browser favicon 404 excluded explicitly.

Evidence: /workspace/scratch/df4-browser/results.json and picker-ar-360.png. Browser plugin not available; regular Playwright used. file:// navigation is denied by managed desktop Chromium policy, so desktop route is http://127.0.0.1:8765/index.html. This does not test Android file-origin/interception behavior. Android background, DND, Bluetooth, phone font scaling, TalkBack and actual offline airplane mode: NOT_TESTED.

Remaining: whole-app 20-language parity, open editor language handling, native notification translations, actual Android playback and completion deduplication under process death. No release approval or DF task closure.
