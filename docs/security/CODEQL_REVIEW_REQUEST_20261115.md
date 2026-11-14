# CodeQL independent review request — 2026-11-15

Status: **OPEN. NOT APPROVED.** `tools/security/codeql_adjudications.json` is intentionally unchanged and the CodeQL result stays visible (no rule disabled, nothing hidden).

## Remaining finding
- Rule `js/http-to-file-access`, `tests/android_e2e_recovery/private_evidence.cjs` line 68 (QA-only Node evidence writer, never shipped in the APK).
- The helper writes only to a pinned directory: `O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW` temp file, symlink/target rejection before and after write, fsync, atomic rename.
- The sink file is byte-identical to the one the old review saw (`sourceSha256` below still matches the registry).

## Why the old approval no longer applies
The registry binds the approval to `executableSourceSha256`, a digest over every tracked `.js/.cjs/.mjs/.py/.sh/.yml/.yaml` file outside `android/app/src/main/assets/web/`. The closeout work legitimately changed many such files (CodeQL source fixes, test servers, coverage probes, perf probes, workflows, tests), so the old digest (`e86045849f…`) no longer matches and the sink is correctly reported as unreviewed. The old approval must not be reused.

## Reviewer instructions
1. Read `tests/android_e2e_recovery/private_evidence.cjs` and every caller; confirm no network-derived data reaches the writer's `data` argument or the file name.
2. Confirm no tracked file added since the old review introduces a new network-to-file path (`git diff` of server/QA sources since the old digest).
3. If satisfied, set in the registry: `reviewStatus: APPROVED`, `reviewedBy` = reviewer identity + date + scope, and the two hashes below recomputed at the reviewed commit with `executable_source_digest()` and `sha256sum` of the sink file.
4. If not satisfied, leave the finding open; the fail-closed workflow keeps reporting it.

## Proposed values (computed at this branch; recompute at the final reviewed commit — any .js/.py/.yml change alters the tree digest)
- `sourceSha256`: `f5cecf2bfbfc7306270a6a91df474d6f54c10ec1219d49d9c1d3760ea979199e`
- `executableSourceSha256`: `afa8a85d65c8529a579dbeacda776cab1fbcf4f5563b411742b144816ad81800`

These are proposals only, not an approval.
