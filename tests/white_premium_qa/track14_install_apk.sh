#!/usr/bin/env bash
# Bounded APK install for disposable CI Android emulator, never a user device.
set -euo pipefail
apk="${1:?debug APK required}"
[[ -s "$apk" ]] || { echo 'ANDROID_INSTALL_ERROR: APK missing or empty' >&2; exit 2; }
out="${DF_TRACK14_ANDROID_EVIDENCE:-${RUNNER_TEMP:-/tmp}/track14-android}"
mkdir -p "$out"
max="${DF_TRACK14_INSTALL_ATTEMPTS:-3}"
backoff="${DF_TRACK14_INSTALL_BACKOFF:-4}"
[[ "$max" =~ ^[1-3]$ && "$backoff" =~ ^[0-9]{1,2}$ ]] || { echo 'ANDROID_INSTALL_ERROR: invalid retry bounds' >&2; exit 2; }
sha256sum "$apk" > "$out/apk.sha256"
for ((attempt=1; attempt<=max; attempt++)); do
  printf 'ANDROID_INSTALL attempt=%s/%s mode=non-streaming\n' "$attempt" "$max"
  if timeout 100s adb install --no-streaming -r "$apk" > "$out/install-${attempt}.log" 2>&1; then
    if timeout 30s adb shell pm path com.zenstudy.focus > "$out/package-path.txt" 2>&1 &&
       grep -q 'package:' "$out/package-path.txt"; then
      printf 'ANDROID_INSTALL VERIFIED attempt=%s\n' "$attempt"
      exit 0
    fi
    echo 'ANDROID_INSTALL_ERROR: adb reported success but package not found' >&2
  else
    printf 'ANDROID_INSTALL_ERROR attempt=%s\n' "$attempt" >&2
    tail -n 12 "$out/install-${attempt}.log" >&2 || true
  fi
  if ((attempt<max)); then sleep "$backoff"; fi
done
echo 'ANDROID_INSTALL_FAIL: emulator package service unavailable after bounded attempts' >&2
exit 1
