# Separate production fixes for integration owner / Gemini

**Do not apply automatically.** These are scoped changes requested for PR #25
integration ownership, NOT modifications in RECOVERY-16. Patch authors must
rebase on the current integration SHA before editing shared files and run
`node --test tests/security_recovery/*.test.cjs` plus the existing suites.

## Fix A — P0 WebView trust boundary
Owners: `MainActivity.java`, `index.html`, app asset packaging.

1. Load only packaged, explicitly trusted application assets in the privileged
   WebView; consider `WebViewAssetLoader` with a reserved HTTPS local origin,
   and harden `setAllowFileAccess(false)`, `setAllowContentAccess(false)`,
   `setAllowFileAccessFromFileURLs(false)`, and
   `setAllowUniversalAccessFromFileURLs(false)`.
2. Prevent untrusted network subresources and frames. `shouldOverrideUrlLoading`
   is **not** a subresource firewall; add network policy/interception and an
   asset-compatible CSP that blocks frames/objects, remote scripts and unsafe
   schemes. Confirm file/asset loader behavior on the target Android versions.
   Current inline onclick handlers need a deliberate CSP migration plan.
3. Keep `ZenNative` unavailable to any untrusted document/frame.
   Validate bridge arguments and upper bounds at each `@JavascriptInterface`.
   Never route external links inside the bridged WebView.
4. External navigation: URL parse and HTTPS-only allowlist for ACTION_VIEW;
   explicitly reject `javascript:`, `data:`, `file:`, `content:`, `intent:`,
   `http:`, and unexpected schemes. Test redirects and iframe navigation.
5. Preserve `com.zenstudy.focus` and current data keys. Do not modify
   permissions without owner review.

## Fix B — P1 transactional legacy user edits
Owners: `app.js`, existing `integration_v22.js` adapter.
Create immutable candidate snapshots before saving task/notes. Commit through
the verified journal/atomic adapter, publish in-memory state and UI only on
success, and leave editor/draft untouched on failure. Check old listeners
and quick-dump paths, delete/toggle/pin flows too. Failures must show an
actionable error, not `✓`. No v21 key rename or destructive migration.

## Fix C — P1 backup import ID policy
Owners: `app.js`, `data_compat_v21.js`.
Separate permissive read-only **inspection** of legacy duplicates from strict
**new-import acceptance**. Reject duplicate numeric IDs within notes/tasks
and numeric strings before replacing any data. Do not renumber/remove existing
records or use invented `note_*`/`task_*` IDs. Require verified six-slot
write with recoverable journal and explicit user confirmation.

## Fix D — P1/P2 backup and draft UX
Owners: `app.js`, `notes_drafts.js`, `MainActivity.java` only by agreement.
Clarify plaintext ZEN21 export in all labels/dialogs, validate intent payload
size and nullness, and provide reliable SAF saved/cancelled/failed acknowledgments.
Exercise draft timer flushing on background and process death. Keep existing
backup export/recovery backward compatible.

## Blocking review cases

- Local HTML injection including `<svg onload>`, `<img onerror>`,
  `[label](javascript:...)`, nested iframes and scheme variants.
- Android external links, redirects, main-frame vs subframe, and bridge access.
- Full storage on primary and mirror, rollback failure, forced termination
  between each write, pending journal resume, corrupt JSON, conflicting copies.
- Old and freshly imported legacy notes/tasks with duplicate or malformed IDs.
- Synthetic session history duplicate/conflicting IDs (no phantom achievements).
- Android SAF cancel/denial/destination-full and real backup round-trip.
- User consent before any backup policy, permission, data schema or signing change.

Success requires the security suite **green**, existing CI suites green,
the real Android device protocol green, and a human-reviewed integration patch.
