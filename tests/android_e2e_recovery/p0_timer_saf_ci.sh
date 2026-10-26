#!/usr/bin/env bash
set -euo pipefail
report="$RUNNER_TEMP/df-pr01-android"
mkdir -p "$report"
capture(){
  timeout 20 adb exec-out screencap -p > "$report/final.png" || true
  if test -n "${DF13_UI_PORT:-}"; then
    timeout 20 python3 tests/android_e2e_recovery/native_ui_dump.py "$DF13_UI_PORT" > "$report/final-native-hierarchy.json" || true
  else
    timeout 20 adb shell uiautomator dump /sdcard/p0-final.xml >/dev/null 2>&1 || true
    timeout 10 adb exec-out cat /sdcard/p0-final.xml > "$report/final.xml" || true
  fi
  timeout 20 adb logcat -d -s AndroidRuntime chromium > "$report/logcat.txt" || true
  if test -n "${PROBE_PID:-}"; then
    adb shell am force-stop com.zenstudy.focus.e2e >/dev/null 2>&1 || true
    kill "$PROBE_PID" 2>/dev/null || true
  fi
  adb forward --remove tcp:38383 >/dev/null 2>&1 || true
  adb forward --remove tcp:9222 >/dev/null 2>&1 || true
}
trap capture EXIT
cp android/app/build/outputs/apk/debug/app-debug.apk "$report/tested-debug.apk"
git rev-parse HEAD HEAD:android > "$report/source-sha-and-android-tree.txt"
# ADB can temporarily disconnect after a successful APK install.
# Reconnect/retry only observations; never replay install, intent, consent or write.
readonly_adb_installed_path(){
  local response path attempt
  for attempt in 1 2 3; do
    if response="$(timeout 15s adb shell pm path com.zenstudy.focus 2>/dev/null)"; then
      path="$(printf '%s\n' "$response" | tr -d '\r' | sed -n 's/^package://p' | head -n 1)"
      if [[ "$path" == /data/* ]]; then
        printf '%s\n' "$path"
        return 0
      fi
    fi
    if (( attempt < 3 )); then
      timeout 10s adb reconnect offline >/dev/null 2>&1 || true
      timeout 30s adb wait-for-device >/dev/null 2>&1 || true
    fi
  done
  return 1
}
readonly_adb_pull_installed_apk(){
  local attempt
  for attempt in 1 2 3; do
    if timeout 60s adb pull "$installed_path" "$report/installed-base.apk" >&2 && test -s "$report/installed-base.apk"; then
      return 0
    fi
    rm -f "$report/installed-base.apk"
    if (( attempt < 3 )); then
      timeout 10s adb reconnect offline >/dev/null 2>&1 || true
      timeout 30s adb wait-for-device >/dev/null 2>&1 || true
    fi
  done
  return 1
}
timeout 30s adb wait-for-device
adb install "$report/tested-debug.apk"
installed_path="$(readonly_adb_installed_path)" || {
  printf '%s\n' 'NOT_TESTED: installed Android APK path unavailable after bounded read-only reconnect' >&2
  exit 1
}
readonly_adb_pull_installed_apk || {
  printf '%s\n' 'NOT_TESTED: installed Android APK bytes unavailable after bounded read-only reconnect' >&2
  exit 1
}
sha256sum "$report/installed-base.apk" > "$report/installed-apk.sha256"
test "$(sha256sum "$report/installed-base.apk" | cut -d ' ' -f1)" = "$(sha256sum "$report/tested-debug.apk" | cut -d ' ' -f1)"
rm "$report/installed-base.apk"
api="$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
if (( api >= 33 )); then
  adb shell pm grant com.zenstudy.focus android.permission.POST_NOTIFICATIONS
fi
# Keep native accessibility connected while selecting genuine SAF documents.
adb install -r -t qa-probe/tools/i18n/e2e/probe/build/outputs/apk/debug/*-debug.apk
adb forward tcp:38383 localabstract:df13-accessibility
adb shell am instrument -w com.zenstudy.focus.e2e/.AccessibilityProbe > "$report/probe-instrumentation.txt" 2>&1 &
PROBE_PID=$!
export DF13_UI_PORT=38383
python3 - <<'READY'
import socket, time
for attempt in range(45):
    try:
        with socket.create_connection(('127.0.0.1', 38383), timeout=2) as connection:
            connection.sendall(b'PING\n')
            if connection.recv(1024):
                break
    except OSError:
        pass
    time.sleep(1)
else:
    raise SystemExit('Persistent native probe did not start')
READY
adb shell am start -n com.zenstudy.focus/.MainActivity
sleep 5
DF_ANDROID_DISPOSABLE=1 timeout 600 node tests/android_e2e_recovery/p0_timer_saf_android.cjs "$report/results.json"
