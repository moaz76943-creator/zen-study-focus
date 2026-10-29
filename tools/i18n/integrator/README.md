# DF99 canonical locale integrator

## Run

Import and validate in one command:

```sh
node tools/i18n/integrator/cli.cjs
```

Validate without mutation, or run focused tests:

```sh
node tools/i18n/integrator/cli.cjs --check
node --test tests/i18n/integrator/*.test.cjs
```

The legacy `node tools/df99_bulk_import.cjs [source [target]]` is retained unchanged for backwards compatibility. For concurrent translation lanes use only the canonical integrator. It reads all contributions deterministically, rejects conflicts before writing, and regenerates the existing DF99Locale.register runtime bundle from central JSON.

## Contribution format

Files are independently owned by language lanes:

`assets/i18n/contributions/<lane>/<language>.json`

```json
{
  "language": "fr",
  "status": "TRANSLATED",
  "sections": {"timer":{"1":"Réglages de concentration et de pause"}}
}
```

Each key can also be an object with `text`, `status` and optional `review`. Status policy:

* `MACHINE_DRAFT`: retained as contribution, never promoted to runtime.
* `REVIEW_REQUIRED`: retained as contribution, never promoted to runtime.
* `TRANSLATED`: eligible to integrate, explicitly not human-verified.
* `VERIFIED`: eligible only after independent human approval.

`VERIFIED` requires a review object recording `reviewer`, ISO date `reviewedAt`, `evidence` and SHA-256 of the exact UTF-8 `text`. An identical, independently approved record must be in `tools/i18n/integrator/review_approvals.json`, as an array object with `id` equal to `language/family/key`. The ledger starts empty. A real reviewer must verify review evidence and approve ledger updates; metadata alone is not proof that a person reviewed a translation.

All keys/namespaces must exist in the canonical dictionary. Unknown keys or namespaces are blocked until the inventory lane extends the approved schema. `he` and `iw` are always prohibited; `ar` and `en` are reserved by the existing importer. Locale must match the 99-language catalog.

The integrator checks Unicode, UTF-8, variable placeholders, unsafe HTML, prototype-pollution keys, ASCII UI digits, and language identifiers. It never modifies user-written content or any session, task, note or storage key. Identical contributions are idempotent; divergent values require source-lane adjudication and are never overwritten. A process lock prevents concurrent writers; checksummed backups and an interruption journal restore the last known-good JSON/JS pair before replay. JSON/JS parity is checked as data without evaluating JavaScript. No network or Google Play upload occurs.

Always use the current integration HEAD. Import sequential batches only after their files are merged into the working tree.
