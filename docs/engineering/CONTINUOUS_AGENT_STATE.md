# DEEP FOCUS — Continuous agent state

Durable checkpoint for scheduled development runs. Update it with every merged step. No secrets or personal data here.

## Fixed rules
- Repo: `moaz76943-creator/zen-study-focus`. Official branch: `integration/master-qa-verified-v21` (not `main`).
- Package `com.deepfocus.study`. Keep White Premium design, Arabic/RTL, Western digits 0-9, protected storage keys, old-backup compatibility.
- Forbidden: Hebrew, Meditation section, unrequested AI features, Cloud TTS, mandatory accounts, a second timer, destructive data ops, force push, branch resets.

## Active track: 100-language UI catalog (priority 4 of the user's list)
Workflow (see `docs/i18n/README.md`): write `index|translation` TSV against `i18n/source_en.json` key order →
`node tools/i18n/tsv_to_pack.cjs <code> file.tsv` → `node tools/i18n/build_packs.cjs && node tools/i18n/coverage.cjs` →
`node --test tests/i18n_catalog.test.cjs`. All packs are labelled `ai-pending-review` (not checked by a person).

Done (631/631 strings): ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl th sv el cs ro hu da fi no sk uk bg hr sr bs sl lt lv et sw fil.
- `bs` is labelled `machine-unverified` (left as is).

Remaining, in registry order: ta te mr gu kn ml pa am az uz kk ka hy ne si my km lo mn af sq eu ca gl is ga mk mt cy be ky tg tk ps ku so ha yo ig zu xh sn st tn rw mg ny eo la gd co fy haw hmn sm su jv ms om.

## Known pre-existing test failures (fail on the base branch too, not caused by pack work)
- `tests/global_i18n_engine.test.js`
- `tests/i18n/*`: "new note preserves exactly entered title and body numerals in v21 record"

## Checkpoint log
| Date (UTC) | Base HEAD | Work | PR | Result |
|---|---|---|---|---|
| 2026-11-14 | a06e5af | packs sw, fil + this state file | (this PR) | see PR |

## Next step
Next batch of packs: ta te mr gu (then kn ml pa am …). Branch name pattern `i18n-packs-<n>`.
