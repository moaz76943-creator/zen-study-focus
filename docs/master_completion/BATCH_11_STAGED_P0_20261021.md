# Deep Focus — P0 staged combined QA candidate (2026-10-21)

Source-only staging branch. This is not the canonical integration branch, a production release or a declaration of full compatibility.

- Canonical integration base before staging: `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5` ([draft PR #138](https://github.com/moaz76943-creator/zen-study-focus/pull/138)).
- Exact first parent `7df1591788eeb0a45f6cf2a28589d212419bbc12` includes CI trigger and SHA-provenance repair from [PR #143](https://github.com/moaz76943-creator/zen-study-focus/pull/143).
- Exact file blobs of [PR #140](https://github.com/moaz76943-creator/zen-study-focus/pull/140) at `3b785cd341ed4edd5adc4d97c3a5e2c4f24cb3d3`: safe 100-language review queue. 80 planned languages remain inactive, no human linguistic approval.
- Exact file blobs of [PR #141](https://github.com/moaz76943-creator/zen-study-focus/pull/141) at `ade1a551ac174a31af754df4c6ad7a693a4d5efb`: signed malformed v21 family preflight checks and tests. Changes to actual persistent/native startup must undergo Android emulator and backup tests on the same final head.
- Exact file blobs of [PR #144](https://github.com/moaz76943-creator/zen-study-focus/pull/144) at `0d6246e020ff586e987b2a4a7554dcbb48e26afa`: static 25-track execution board linked to canonical 197-task ledger.
- The seven overlaid paths are disjoint, all copied by exact Git blob SHA. Do not double-apply #140, #141, #143 or #144 after incorporating this candidate.

## Deliberate exclusions

- PR #142 undated legacy task Save follow-up remains incomplete and branch ancestry is 57 commits behind this master; no code from it copied here.
- PR #139 v22 signing branch is 61 commits behind; no release signing/version changes copied here.
- No change to main, package ID, Android signing/permissions, v21 key names or format, saved user data, audio approval or user-written text.
- Existing media release gate remains failing until verified individual provenance; no automatic production release.

## Test requirements and current classifications

- The first-parent PR #143 had [CI #39583767980](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39583767980) **source/Gradle success on its own separate head**. This does NOT transfer to this combined candidate.
- **Combined source Node/Python/Gradle: NOT_TESTED until this exact HEAD Actions pass.**
- **Android emulator startup, native ACK/faults, true SAF, physical device and data durability: NOT_TESTED.**
- **Media provenance: FAIL known, unapproved nature recordings remain quarantined.**
- Security scanner/Gitleaks and 20-locale human context review: BLOCKED/NOT_TESTED.
- `RELEASE_APPROVED=NO`.

After all source checks, independent QA must check the build against this exact commit, its Android assets and SHA256, then compare this branch to the newest canonical integration head before any human-reviewed integration decision. Never merge to main automatically.
