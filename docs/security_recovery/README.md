# DEEP-FOCUS-RECOVERY-16 — scoped security audit

Base: PR #25, exact inspected SHA `0dd9239bc28978e11f41c1c0f618c9662b291fe2`
Topic branch: `audit/deep-focus-security-recovery-16-20261019`
Source repository: `moaz76943-creator/zen-study-focus`

## Boundary

Only `tests/security_recovery/` and `docs/security_recovery/` are changed.
No production Java, JavaScript, HTML, manifest, permissions, user files, device data,
secrets, Gradle, release signing, or branches used by Gemini are modified.
All fixtures are synthetic; no physical phone or private data was used.

## Run

```sh
node --test tests/security_recovery/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

The second command is **already** part of `.github/workflows/build_apk.yml`.
Adding `__init__.py` makes `test_security_gate.py` discoverable, so the
existing workflow executes the Node security suites **without editing the workflow**.
No external NPM libraries, internet, or device data are needed.

**Important:** The security gates deliberately assert safe future behavior.
They are expected to FAIL against known gaps in the inspected PR #25 revision.
Never skip the red tests or misreport their failures as test-runner errors.
The Draft PR is not mergeable for release until the blocking tests pass
and Android device verification completes. The local source inspection is not
an Android runtime penetration test.

## Coverage

| Audit request | Test / review evidence |
|---|---|
| 1 bridge | `webview_boundary.test.cjs`, `R-16-01` |
| 2 untrusted HTML | `xss_markdown.test.cjs` / `renderText` |
| 3 XSS | inert text/DOM fake payload tests; device test remains open |
| 4 Markdown | markdown export and safe preview checks |
| 5 javascript: URLs | inert rendering tests, WebView scheme gate |
| 6 external links | `webview_boundary.test.cjs` |
| 7 permissions | Manifest assertions / `R-16-03` |
| 8 v21 storage | `data_resilience.test.cjs` |
| 9 corrupt JSON | malformed primary, dual corruption |
| 10 quota | injected quota exception |
| 11 mirror damage | read-only mirror recovery |
| 12 rollback | six-slot rollback exact-byte assertion |
| 13 export/import | `data_resilience` and `legacy_import_contract` |
| 14 IDs | numeric, string, duplicate contract |
| 15 duplicate achievements | focus history duplicate/conflict test |
| 16 crash mid-write | journal recovery injection |
| 17 backup policies | Manifest assertion, plaintext review |
| 18 drafts | `R-16-06` static review; device verification open |
| 19 secrets | high-confidence credential pattern scan |
| 20 automatic gates | Python unittest adapter in existing CI |

## Verification protocol

1. Run the Node suite using exact PR head source; capture stdout and failing
   test names. Distinguish **PASS**, **KNOWN_RED**, and **NOT_TESTED**.
2. Run existing regression suites after production fixes, not only this suite.
3. On a *disposable* Android test profile, validate SAF denial/cancel/write
   failure, WebView navigations, rotation, process death, and backup restore.
4. Verify both `zen_fortress_*_v21` and corresponding `_mirror` bytes are
   unchanged after simulated failures; never inspect a person's real data.
5. Request review for any Android or core-code patch separately; do not
   cherry-pick fixes while Gemini edits the shared application.
6. No merge, automated release, signing, backup-policy or permission change
   without explicit human approval.

See `RISK_REGISTER.md` and `SEPARATE_FIX_HANDOFF.md`.
