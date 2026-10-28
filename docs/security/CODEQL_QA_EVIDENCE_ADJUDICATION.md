# DF-CODEQL-QA-EVIDENCE-001

Status: pending independent review of the final combined source tree. This document
and the registry do not approve the agent's intermediate source snapshot.

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

## Independent review and revocation

The reviewer must inspect the final source and callers and run those tests before
setting `reviewStatus` to `APPROVED`, recording `reviewedBy`, and recording the
current executable-source digest in `tools/security/codeql_adjudications.json`.
The registry is not automatically refreshed. The source digest uses `git ls-files`
and hashes sorted tracked paths and complete content for `.js`, `.cjs`, `.mjs`,
`.java`, `.py`, `.sh`, `.html`, `.yml` and `.yaml` across the entire checkout.
The JSON registry is excluded. Any changed/new/removed/renamed tracked executable
source revokes approval, including a new caller of the unchanged helper.

The reviewer can calculate the snapshot with Python, without changing approval:

```python
import runpy
from pathlib import Path
module = runpy.run_path('tools/security/track13_codeql_sarif_report.py')
print(module['executable_source_digest'](Path.cwd()))
```

The scanner still runs its full query suite. The report retains raw `findings`,
rule counts and safe evidence. A matched adjudication reports
`FALSE_POSITIVE_WITH_EVIDENCE`, one false positive and zero unresolved findings.
Another rule/path/line, altered source snapshot, duplicated sink finding or any
additional unresolved finding remains FAIL. Missing, pending or invalid approval
cannot classify a finding. No query or SARIF result is suppressed.
