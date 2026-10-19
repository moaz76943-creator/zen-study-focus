# Batch 1b — WebView boundary (source verified, Android pending)

2026-10-19. Base 049ed68. Same isolated branch; no production merge.

Implemented: arbitrary file access disabled while Android bundled asset URLs stay unchanged; network subresources blocked; interception restricts assets to the bundled web directory and rejects traversal/authority variants; external ACTION_VIEW only for main-frame HTTPS URLs; CSP blocks frames, objects, connections, forms and remote resources. Inline script/style remain allowed for current bundled event handlers; migrating those handlers is separate work. No application ID, permissions, signing, schema, storage keys or local origin changes. Keeping file:///android_asset/web/index.html avoids orphaning existing file-origin localStorage.

Source commands: node --test --test-reporter=tap tests/security_recovery/*.test.cjs tests/integration_recovery/*.test.cjs tests/integration_quality/*.test.cjs; git diff --check.
Results: 61/61 PASS. Corrected the imported CSP test attribute parser: original [^"'] could not capture directives containing single-quoted CSP keywords. Directive assertions remain unchanged.

Desktop Chromium localhost bootstrap with CSP: meaningful Arabic app and translated picker rendered, no page exceptions. One favicon 404, not a missing app asset. Browser policy denies file:// navigation (ERR_BLOCKED_BY_ADMINISTRATOR), so localhost verifies rendered CSP behavior only. Android asset interception/file-origin storage and media behavior: NOT_TESTED. This source gate cannot approve WebView runtime behavior. Final CI must compile Java and produce test APK for device checks.
