# Exposed signing keystore — assessment and owner runbook (2026-11-15)

No secret, password or key material appears in this document. Nothing here has been executed against Play Console, GitHub secrets, tags or history; every rotation step needs owner approval.

## 1. What was exposed
| Item | Finding |
|---|---|
| Where | `.github/workflows/build_release_aab.yml` in commit `3a51d4a6` (2026-11-10), inline `KEYSTORE_BASE64` plus plaintext store/key password and alias `deepfocus` in the same step |
| Removed from tree | Commit `c81aee2e` (same day). Tree scan: 0 findings |
| Still reachable | 86 tags contain the commit: `v441.0.0` … `v525.0.0-srs-engine`. Repo is **public** (0 forks / 0 stars / 0 watchers when checked) |
| Keystore | PKCS12, one entry, alias `deepfocus`, subject `CN=Deep Focus, OU=Production, O=ZenStudy, L=Amman, C=JO`, valid 2026-11-10 → 2054-03-28 |
| Certificate SHA-256 (public data) | `01:AE:DC:97:60:C6:8F:2D:35:42:94:52:28:84:08:B3:73:7A:A4:28:1D:B9:35:BF:B4:7E:0F:38:DF:6F:73:FB` |
| Credentials valid? | **Yes.** The store and key passwords committed next to the blob open the keystore (verified locally on a temporary copy; the copy was shredded). Treat the key as fully compromised. |
| Same password elsewhere | The fixed password is also described in `docs/SIGNING.md` and appears in 4 other tracked files (reports/tests) — it is a known, reused value |
| Older key | `docs/SIGNING.md` already records an earlier keystore (`zenfocus2026.jks`, different certificate) as compromised. Two keys are therefore public |

## 2. Key type
* By the repository's own naming and `android/app/build.gradle` (`DEEPFOCUS_UPLOAD_KEYSTORE`, `ZEN_UPLOAD_*`) this is designed as an **upload key**, not the Play app-signing key.
* The repository cannot prove which role it has in Play. **Owner check (2 minutes):** Play Console → your app → Test and release → App integrity → App signing. Compare the SHA-256 above with
  * *Upload key certificate* → **Case A** (upload key).
  * *App signing key certificate* → **Case B** (app-signing key; critical).
  * neither → **Case C** (never registered; retire it).
* No GitHub Release asset was published after 2026-11-10, so no published asset is expected to be signed with it; if that workflow ran, its AAB artifacts (30-day retention) may still exist until about 2026-12-10; the owner can delete them in the Actions UI.

## 3. Impact if the key is abused
* Case A: an attacker with only this key cannot publish to Play (needs your Play account). Risk: signed AABs that Play would accept *if* they also obtained console access, and builds that pass any certificate pin. Users are not affected; updates keep working.
* Case B: the attacker can sign APKs that update installs of this app outside Play (sideload) and impersonate the app. On Play-managed distribution the Play-held key is what users receive, so only self-managed keys are exposed.
* Case C: no operational impact; hygiene only.

## 4. Rotation plan (owner executes)
Official reference: Google Play Help, "Use Play App Signing" — https://support.google.com/googleplay/android-developer/answer/9842756
**Case A (upload key) — no effect on installed apps**
1. Create a new upload key outside the repository (RSA ≥ 2048; the existing `docs/SIGNING.md` shows the command). Keep an offline copy.
2. Export its certificate as PEM (`keytool -export -rfc …`).
3. Play Console → App signing → *Request upload key reset*, give the reason "private key and password were published", upload the PEM.
4. After Google approves, replace the four GitHub secrets (`DEEPFOCUS_KEYSTORE_B64`, `DEEPFOCUS_KEY_ALIAS`, `DEEPFOCUS_STORE_PASSWORD`, `DEEPFOCUS_KEY_PASSWORD`) **and** the legacy `ZEN_UPLOAD_*` secrets that `build_closed_test_aab.yml` / `df06_exact_source_packages.yml` read, then set `DEEPFOCUS_EXPECTED_CERT_SHA256` to the new certificate.
5. Re-run the release workflow; confirm the printed certificate equals the pin.
**Case B (app-signing key managed by you or provided to Play)**
1. Play Console → App signing → *Upgrade key* (Google-generated recommended). Register the new fingerprints with any API provider that pins them.
2. Updates: Android 13+ enforce the upgraded key; Android 7–12 accept both; sideloaded installs signed with the old key cannot update in place. **Before any sideload migration tell users to export a ZEN21 backup** — uninstalling removes local data.
3. If the app was never enrolled in Play App Signing, the key cannot be rotated for the same package ID; a new package ID would be required (owner decision; do not change the package ID without approval).
**Case C** — delete the secrets that hold it and stop using it.
**All cases:** rotate every GitHub Actions secret that could hold this keystore or its password (list in section 1), and stop reusing the documented password anywhere.

## 5. History and tags
* Do **not** rewrite history or delete tags as the primary fix: the key is already public (forks, clones, caches may exist) so only rotation removes the risk. A rewrite does not un-publish it and would invalidate 86 tags and every commit SHA recorded in QA evidence.
* Optional later hygiene (owner decision): GitHub Support can purge cached views of a commit; a `git filter-repo` rewrite on a *new* mirror is possible but changes all SHAs. Not performed.
* Detection stays on: the Gitleaks check will keep reporting this one history finding by design (no allowlist entry exists, and none will be added). When the owner decides the exposure is handled, record the decision here and keep the check red or accept it explicitly.

## 6. Owner decisions needed
1. Which Case (A/B/C) — from the Play Console comparison above.
2. Approve rotation and the Play upload-key reset request.
3. Approve/decline any history rewrite.
