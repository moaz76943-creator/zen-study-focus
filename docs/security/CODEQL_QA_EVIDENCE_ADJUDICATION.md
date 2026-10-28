# DF-CODEQL-QA-EVIDENCE-001

Status: independently reviewed by Codex /root after inspecting the helper, its
QA consumers, the upstream query meaning and regression tests. The exact approved
source snapshot is recorded in the registry. This is an engineering review, not
a claim of human security certification. The original repository-wide approval
is retained in registry history. The v2 scope review below replaces its overly
broad validity boundary; it does not change the scanner or upstream rule.

The sole candidate is `js/http-to-file-access` at line 68 of
`tests/android_e2e_recovery/private_evidence.cjs`, source SHA256
`f5cecf2bfbfc7306270a6a91df474d6f54c10ec1219d49d9c1d3760ea979199e`.

## Rule meaning and observed behavior

The upstream [query](https://github.com/github/codeql/blob/fd2bfc8a3da9c73a0c8be05d110efaf14a856445/javascript/ql/src/Security/CWE-912/HttpToFileAccess.ql)
tracks **network content** into filesystem data, rather than filename traversal.
Its precision is medium. The [recommendation](https://github.com/github/codeql/blob/fd2bfc8a3da9c73a0c8be05d110efaf14a856445/javascript/ql/src/Security/CWE-912/HttpToFileAccess.qhelp)
is to examine whether the write is intended. Its malicious example downloads an
executable and later trusts it as local code. The upstream regression suite also
flags descriptor writes; changing APIs does not adjudicate the content flow.

Existing callers intentionally capture JSON reports, XML hierarchy and screenshots
from disposable browser/Android QA. HTTP inputs include loopback CDP responses.
The helper saves them as inert evidence; it neither executes nor imports saved
content as code. No caller may use this adjudication to authorize executable
downloads, production data modification, credentials or a new evidence consumer.

## Existing controls and verification

The helper validates directory ownership/permissions and symlink ancestors, pins
the directory using `O_DIRECTORY|O_NOFOLLOW`, validates basenames, opens random
temporary files with `O_EXCL|O_NOFOLLOW` and mode0600, writes through the descriptor,
fsyncs and atomically renames. Destination symlinks are refused. Tests cover path
traversal, symlink/hardlink targets, directory substitution and a swap at rename,
partial writes, stalled writes and interrupted publication. These are evidence
for constrained, intentional artifact capture; path controls alone do not remove
the upstream network-content advisory.

## Scoped review and revocation — 2026-10-28

Codex `/root/security_review` independently inspected the helper and the current
10 direct consumers on official `79c7916b16b93cff6a4507c5d1e0957c21722fc1`
(M270), plus PR #518's `df_final03_chromium.cjs` geometry-only delta. The
network/file assessment above still holds. Inputs are Playwright observations,
loopback CDP responses, Android XML hierarchies and screenshots. The saved bytes
are fixed JSON/XML/PNG/TXT evidence; no reviewed consumer imports them as code.
The sole saved-report reader found in `run_native_dialog_device.sh` imports the
fixed `.json` filename using Node's JSON parser, then checks the five results.
The workflow consumers upload evidence artifacts. Private-evidence regressions:
10/10 PASS. This is an engineering review, not human security certification.

Schema v2 binds approval to `relevantSourceSha256`, calculated from the sorted
paths and complete bytes of the discovered evidence trust boundary. The old
schema-v1 approval metadata and whole-tree hash remain in `previousApproval`.
The registry is never automatically updated by CI. The compatibility function
name `executable_source_digest` now computes the v2 relevant-source digest.

Discovery scans all tracked executable source, and:

- Seeds the helper and every file referring to its module basename or exported
  factory names. Added and renamed callers therefore alter the inventory.
- Follows static relative module imports and conservative bidirectional QA
  source-path/basename references. This covers runtime dependencies, shell
  launchers, workflow commands and workflow settings. Missing relative runtime
  imports or computed imports in the connected runtime fail closed.
- Follows fixed evidence filenames and evidence/report environment identifiers
  to include downstream readers and artifact routing. Ambiguous basenames are
  deliberately over-included. Governance tests and the gate implementation are
  fingerprinted as leaves; synthetic fixture strings cannot expand the graph.
- Fingerprints every JS/JSX/TS/TSX source file with a computed module loader
  or escaped import specifier as an
  additional conservative leaf, even outside the graph: otherwise an aliased
  computed import could conceal a new consumer. Added, removed or changed
  computed loaders need review. All tracked package installation manifests/lockfiles, including nested
  packages, are also bound.

Ordinary production pages are untrusted input data to the evidence capture, not
executable evidence consumers. Editing unrelated `app.js` features or adding an
independent QA test leaves approval valid. A production module importing the
helper or introducing a computed loader enters the boundary and revokes review.
All new raw CodeQL findings continue to fail regardless of scope membership.

Any helper/caller/dependency/launcher/workflow/routing/reader change in this
boundary revokes approval. A reviewer must inspect the new data flow and
consumers, run the focused regressions and record a new reviewed digest. Updating
the hash without that review is prohibited. The mechanism's implementing agent
left the new approval pending for independent review by the parent before use.

To inspect scope and calculate a snapshot without changing approval:

```python
import runpy
from pathlib import Path
module = runpy.run_path('tools/security/track13_codeql_sarif_report.py')
print(module['evidence_source_scope'](Path.cwd()))
print(module['executable_source_digest'](Path.cwd()))
```

The scoped regression suite verifies unrelated application changes stay valid;
changed helper/caller/local dependency/launcher, new consumer/artifact reader or
computed loader, and removed/renamed callers revoke approval. Existing tests
retain failure for new/duplicate findings and invalid approval/location metadata.

The scanner still runs its full query suite. The report retains raw `findings`,
rule counts and safe evidence. A matched adjudication reports
`FALSE_POSITIVE_WITH_EVIDENCE`, one false positive and zero unresolved findings.
Another rule/path/line, altered source snapshot, duplicated sink finding or any
additional unresolved finding remains FAIL. Missing, pending or invalid approval
cannot classify a finding. No query or SARIF result is suppressed.

Final 2026-10-28 engineering review: `/root/security_review` inspected the helper,
10 inert consumers, saved JSON reader, launchers, workflow artifacts and local
action closure; `/root` independently inspected the mechanism and integrated CI.
The registry records the approved branch-specific scope after this review.
Actual CodeQL scanning remains required; no new finding is auto-approved.
