# Release checklist

1. Bump only `android/version.properties` (VERSION_CODE must increase; VERSION_NAME semver). `release_manifest_v21.json` must match (a test enforces it).
2. `node tools/run_tests.mjs` is green and `tests/KNOWN_FAILING.txt` did not grow.
3. Browser suite: `NODE_PATH=$(npm root -g) node tools/browser_checks/run.cjs` (layout, corruption, timezones, sounds).
4. Secrets set (see `docs/SIGNING.md`); push tag `vX.Y.Z`; CI verifies AAB/APK signatures and the pinned certificate.
5. Upload the `...-upload-key` AAB to Play Console; never upload `...-ci-throwaway` artifacts.
6. Smoke test on a real device: fresh install, upgrade over previous build, airplane mode, rotation, 200% font, RTL language, timer in background, notification after reboot.
7. Storage compatibility: the six v21 keys keep their shape; see `docs/STORAGE_KEYS.md`.
8. Update the privacy policy / Data Safety form only if permissions or data handling changed (they must not: zero network, zero PII).
