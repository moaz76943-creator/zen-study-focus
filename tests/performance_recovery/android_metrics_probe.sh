#!/usr/bin/env bash
# TRACK 17: explicitly invoked physical-device/emulator read-only metrics,
# except force-stop, HOME and reopen. NEVER clear app data or change connectivity.
set -euo pipefail
pkg='com.zenstudy.focus'
component="$pkg/.MainActivity"
out="${1:-track17-android-evidence}"
mkdir -p "$out"
if ! command -v adb >/dev/null 2>&1; then echo 'NOT_TESTED: adb unavailable' >&2; exit 2; fi
if [ "$(adb devices | awk 'NR>1 && $2=="device" {count++} END {print count+0}')" -ne 1 ]; then
  echo 'NOT_TESTED: exactly one authorized Android device/emulator required' >&2; exit 2
fi
if ! adb shell pm path "$pkg" | grep -q '^package:'; then
  echo 'NOT_TESTED: application package is not installed' >&2; exit 2
fi
adb shell getprop ro.build.version.release | tr -d '\r' > "$out/android_version.txt"
adb shell getprop ro.build.version.sdk | tr -d '\r' > "$out/android_sdk.txt"
adb shell dumpsys webviewupdate > "$out/webview_provider.txt" || true
adb shell df -h /data > "$out/data_capacity.txt" || true
for i in 1 2 3; do
  adb shell am force-stop "$pkg"
  adb shell am start -W -n "$component" > "$out/cold_${i}_am_start.txt"
  sleep 2
  adb shell dumpsys meminfo "$pkg" > "$out/cold_${i}_meminfo.txt"
  adb shell input keyevent KEYCODE_HOME
  sleep 1
  adb shell am start -W -n "$component" > "$out/warm_${i}_am_start.txt"
  adb shell dumpsys meminfo "$pkg" > "$out/warm_${i}_meminfo.txt"
done
adb shell dumpsys cpuinfo | grep -F "$pkg" > "$out/cpuinfo_process.txt" || true
printf 'METRICS_CAPTURED, not PASS. Validate app content, no data loss and timer lifecycle manually.\n'
printf 'Android startup fields: ThisTime/TotalTime/WaitTime (ms); memory: dumpsys meminfo PSS (KB).\n'
